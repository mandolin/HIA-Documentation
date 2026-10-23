import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readHistoricalSchemas } from "./lib/schema-history.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDistDir = path.join(rootDir, "packages", "schemas", "dist");
const packageSchemaDir = path.join(packageDistDir, "schemas");
const siteDir = path.join(rootDir, "dist", "schema-pages");
const siteSchemaDir = path.join(siteDir, "schemas");
const catalog = JSON.parse(await readFile(path.join(packageDistDir, "catalog.json"), "utf8"));

assert(catalog.publicBaseUrl === "https://mandolin.github.io/HIA-Documentation/schemas/", "Unexpected schema Pages base URL.");

// <lang><zh-CN>清理前完整读取历史快照与当前定义；摘要、身份或冲突失败时保留既有本地产物。</zh-CN><en>Read all historical snapshots and current definitions before cleanup, retaining existing local artifacts on digest, identity, or conflict failure.</en></lang>
const history = await readHistoricalSchemas(path.join(packageDistDir, "history"), catalog.publicBaseUrl);
// <lang><zh-CN>当前定义及其 canonical/alias 文件名构成本次分发写入计划。</zh-CN><en>Current definitions and their canonical/alias filenames form this distribution's write plan.</en></lang>
const currentSchemas = [];
const destinations = new Map();
for (const entry of catalog.schemas) {
  const packageFileName = path.basename(entry.path);
  const canonicalFileName = path.posix.basename(new URL(entry.publicUrl).pathname);
  const sourcePath = path.join(packageSchemaDir, packageFileName);
  const schema = JSON.parse(await readFile(sourcePath, "utf8"));

  assert(schema.$id === entry.schemaId, `${entry.key}: owner schema id drifted from the catalog.`);
  assert(entry.publicUrl === entry.schemaId, `${entry.key}: publicUrl must match the canonical schema id.`);
  assert(entry.publicUrl.startsWith(catalog.publicBaseUrl), `${entry.key}: publicUrl is outside the Pages namespace.`);

  // <lang><zh-CN>相同输出名不能被两个当前项重复占用，避免后写覆盖。</zh-CN><en>Two current entries cannot claim the same output filename, preventing last-write replacement.</en></lang>
  for (const name of new Set([canonicalFileName, packageFileName])) {
    assert(!destinations.has(name), `${entry.key}: duplicate schema output filename.`);
    destinations.set(name, schema);
  }
  currentSchemas.push({ entry, packageFileName, canonicalFileName, sourcePath });
}

for (const { entry, bytes } of history) {
  // <lang><zh-CN>当前 owner 仍使用历史 ID 时只能分发相同定义；新版本不能覆盖旧 canonical 地址或碰撞别名。</zh-CN><en>When an owner still uses a historical ID it must distribute the same definition; a new version cannot overwrite an old canonical URL or collide with an alias.</en></lang>
  const current = destinations.get(entry.fileName);
  assert(!current || JSON.stringify(current) === JSON.stringify(JSON.parse(bytes.toString("utf8"))), `${entry.key}: current schema conflicts with immutable history.`);
}

// <lang><zh-CN>递归清理仅允许仓库 dist 下的固定站点目录，先核对最终绝对路径。</zh-CN><en>Recursive cleanup is permitted only for the fixed site directory under the repository's dist; verify the final absolute path first.</en></lang>
assert(siteDir.startsWith(path.join(rootDir, "dist") + path.sep), "Schema Pages output escaped repository dist.");
await rm(siteDir, { recursive: true, force: true });
await mkdir(siteSchemaDir, { recursive: true });

const links = [];
for (const { entry, packageFileName, canonicalFileName, sourcePath } of currentSchemas) {
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

for (const { entry, bytes } of history) {
  // <lang><zh-CN>旧 canonical 地址写入保存的原始字节，不能经 JSON 重新格式化后冒充原文件。</zh-CN><en>Write saved original bytes to old canonical URLs, without reformatting JSON and presenting it as the original file.</en></lang>
  await writeFile(path.join(siteSchemaDir, entry.fileName), bytes);
}
await copyFile(path.join(packageDistDir, "history", "index.json"), path.join(siteSchemaDir, "history.json"));
await copyFile(path.join(packageDistDir, "catalog.json"), path.join(siteSchemaDir, "catalog.json"));
await writeFile(path.join(siteDir, ".nojekyll"), "", "utf8");
await writeFile(path.join(siteDir, "index.html"), renderIndex(links), "utf8");
await writeFile(path.join(siteSchemaDir, "index.html"), renderIndex(links, "../"), "utf8");

console.log(`Schema Pages artifact generated: ${links.length} current schemas, ${history.length} retained historical identities at ${path.relative(rootDir, siteSchemaDir)}.`);

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
  <link rel="icon" href="data:,">
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
