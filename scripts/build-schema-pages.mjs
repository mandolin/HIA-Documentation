import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDistDir = path.join(rootDir, "packages", "schemas", "dist");
const packageSchemaDir = path.join(packageDistDir, "schemas");
const siteDir = path.join(rootDir, "dist", "schema-pages");
const siteSchemaDir = path.join(siteDir, "schemas");
const catalog = JSON.parse(await readFile(path.join(packageDistDir, "catalog.json"), "utf8"));

assert(catalog.publicBaseUrl === "https://mandolin.github.io/HIA-Documentation/schemas/", "Unexpected schema Pages base URL.");

await rm(siteDir, { recursive: true, force: true });
await mkdir(siteSchemaDir, { recursive: true });

const links = [];
for (const entry of catalog.schemas) {
  const packageFileName = path.basename(entry.path);
  const canonicalFileName = path.posix.basename(new URL(entry.publicUrl).pathname);
  const sourcePath = path.join(packageSchemaDir, packageFileName);
  const schema = JSON.parse(await readFile(sourcePath, "utf8"));

  assert(schema.$id === entry.schemaId, `${entry.key}: owner schema id drifted from the catalog.`);
  assert(entry.publicUrl === entry.schemaId, `${entry.key}: publicUrl must match the canonical schema id.`);
  assert(entry.publicUrl.startsWith(catalog.publicBaseUrl), `${entry.key}: publicUrl is outside the Pages namespace.`);

  await copyFile(sourcePath, path.join(siteSchemaDir, canonicalFileName));
  if (canonicalFileName !== packageFileName) {
    await copyFile(sourcePath, path.join(siteSchemaDir, packageFileName));
  }

  links.push({
    contractVersion: entry.contractVersion,
    href: `schemas/${canonicalFileName}`,
    key: entry.key,
    schemaId: entry.schemaId
  });
}

await copyFile(path.join(packageDistDir, "catalog.json"), path.join(siteSchemaDir, "catalog.json"));
await writeFile(path.join(siteDir, ".nojekyll"), "", "utf8");
await writeFile(path.join(siteDir, "index.html"), renderIndex(links), "utf8");
await writeFile(path.join(siteSchemaDir, "index.html"), renderIndex(links, "../"), "utf8");

console.log(`Schema Pages artifact generated: ${links.length} schemas at ${path.relative(rootDir, siteSchemaDir)}.`);

function renderIndex(entries, rootPrefix = "") {
  const items = entries.map((entry) => (
    `<li><a href="${escapeHtml(rootPrefix + entry.href)}">${escapeHtml(entry.key)}</a> <code>${escapeHtml(entry.contractVersion)}</code></li>`
  )).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HIA Schema Distribution</title>
</head>
<body>
  <main>
    <h1>HIA Schema Distribution</h1>
    <p><a href="${escapeHtml(rootPrefix + "schemas/catalog.json")}">Schema catalog</a></p>
    <ul>
${items}
    </ul>
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
