import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(rootDir, "packages", "schemas", "src", "catalog.json"), "utf8"));
const configuredBaseUrl = process.env.HIA_REFERENCE_PAGES_URL ?? "https://mandolin.github.io/HIA-Documentation/";
const publicBaseUrl = new URL(configuredBaseUrl.endsWith("/") ? configuredBaseUrl : `${configuredBaseUrl}/`);
const maxAttempts = 12;
const retryDelayMs = 5_000;

let lastError;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await checkPublication();
    console.log(`Reference Pages online check passed: 4 public routes and ${catalog.schemas.length} canonical schemas with aliases.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt === maxAttempts) {
      break;
    }
    console.warn(`Reference Pages check attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : String(error)}`);
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}

throw lastError;

/**
 * 验证已发布的 portal 路由、provenance 与既有 schema canonical identity。
 * Verifies published portal routes, provenance, and existing schema canonical identity.
 */
async function checkPublication() {
  const siteManifest = await fetchJson("reference-pages.json");
  assert(siteManifest.contract === "hia-reference-pages", "Published Reference Pages contract drifted.");
  assert(siteManifest.defaultLocale === "en", "Published Reference Pages default locale drifted.");
  assert(siteManifest.provenance?.sourceCount === 8, "Published Reference Pages provenance source count drifted.");

  const referenceBuild = await fetchJson("reference-build.json");
  assert(referenceBuild.contract === "hia-public-reference-build", "Published public reference build contract drifted.");
  assert(referenceBuild.privacy?.status === "pass", "Published public reference privacy status drifted.");
  assert(Array.isArray(referenceBuild.sources) && referenceBuild.sources.length === 8, "Published public reference source provenance drifted.");

  const routeExpectations = [
    ["", "HIA Documentation System Reference"],
    ["en/", "HIA Documentation System Reference"],
    ["zh-CN/", "HIA Documentation System Reference"],
    ["source-linkage/", "HIA Public Reference Source Linkage"]
  ];
  if (siteManifest.versioning?.strategy === "current-and-releases") {
    const release = siteManifest.versioning.releases?.[0];
    assert(siteManifest.versioning.current?.path === "current/", "Published current reference path drifted.");
    assert(release?.path, "Published release snapshot path is missing.");
    routeExpectations.push(
      ["current/", "HIA Documentation System Reference"],
      ["current/en/", "HIA Documentation System Reference"],
      ["current/zh-CN/", "HIA Documentation System Reference"],
      ["current/source-linkage/", "HIA Public Reference Source Linkage"],
      [release.path, "HIA Documentation System Reference"],
      [`${release.path}en/`, "HIA Documentation System Reference"],
      [`${release.path}zh-CN/`, "HIA Documentation System Reference"],
      [`${release.path}source-linkage/`, "HIA Public Reference Source Linkage"],
      ["versions/", "HIA Reference Versions"]
    );

    const versionIndex = await fetchJson("versions.json");
    assert(versionIndex.contract === "hia-reference-version-index", "Published version index contract drifted.");
    assert(versionIndex.versioning?.current?.path === "current/", "Published version index current path drifted.");
  }
  for (const [route, marker] of routeExpectations) {
    const page = await fetchText(route);
    assert(page.includes(marker), `Published route ${route || "/"} is missing its expected content.`);
    assert(page.includes("hia-reference-site-nav"), `Published route ${route || "/"} is missing reference navigation.`);
  }

  const publishedCatalog = await fetchJson("schemas/catalog.json");
  assert(publishedCatalog.catalogVersion === catalog.catalogVersion, "Published catalog version drifted.");
  assert(publishedCatalog.publicBaseUrl === catalog.publicBaseUrl, "Published catalog base URL drifted.");

  for (const entry of catalog.schemas) {
    const canonicalFile = path.posix.basename(new URL(entry.publicUrl).pathname);
    const canonicalSchema = await fetchJson(`schemas/${canonicalFile}`);
    assert(canonicalSchema.$id === entry.schemaId, `${entry.key}: canonical schema id drifted.`);

    const aliasSchema = await fetchJson(`schemas/${entry.path.replace(/^\.\//, "")}`);
    assert(aliasSchema.$id === entry.schemaId, `${entry.key}: package-style alias does not resolve to the canonical schema.`);
  }
}

async function fetchJson(value) {
  const response = await fetchWithCacheBust(value, "application/schema+json, application/json");
  return response.json();
}

async function fetchText(value) {
  const response = await fetchWithCacheBust(value, "text/html, text/plain");
  return response.text();
}

async function fetchWithCacheBust(value, accept) {
  const url = new URL(value, publicBaseUrl);
  url.searchParams.set("hia_reference_pages_check", Date.now().toString());
  const response = await fetch(url, { headers: { accept } });
  if (!response.ok) {
    throw new Error(`${url.origin}${url.pathname} returned HTTP ${response.status}.`);
  }
  return response;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
