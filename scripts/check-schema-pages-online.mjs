import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "catalog.json"), "utf8"));
const maxAttempts = 12;
const retryDelayMs = 5_000;

let lastError;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await checkPublication();
    console.log(`Schema Pages online check passed: ${catalog.schemas.length} canonical schemas and aliases.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt === maxAttempts) {
      break;
    }
    console.warn(`Schema Pages check attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : String(error)}`);
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}

throw lastError;

async function checkPublication() {
  const publishedCatalog = await fetchJson(new URL("catalog.json", catalog.publicBaseUrl));
  assert(publishedCatalog.catalogVersion === catalog.catalogVersion, "Published catalog version drifted.");
  assert(publishedCatalog.publicBaseUrl === catalog.publicBaseUrl, "Published catalog base URL drifted.");

  for (const entry of catalog.schemas) {
    const canonicalSchema = await fetchJson(entry.publicUrl);
    assert(canonicalSchema.$id === entry.schemaId, `${entry.key}: canonical schema id drifted.`);

    const aliasSchema = await fetchJson(new URL(entry.path.replace(/^\.\//, ""), catalog.publicBaseUrl));
    assert(aliasSchema.$id === entry.schemaId, `${entry.key}: package-style alias does not resolve to the canonical schema.`);
  }
}

async function fetchJson(value) {
  const url = new URL(value);
  url.searchParams.set("hia_schema_check", Date.now().toString());
  const response = await fetch(url, {
    headers: { accept: "application/schema+json, application/json" }
  });
  if (!response.ok) {
    throw new Error(`${url.origin}${url.pathname} returned HTTP ${response.status}.`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
