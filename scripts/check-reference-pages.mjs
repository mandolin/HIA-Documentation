import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDir = path.join(rootDir, "dist", "reference-pages");
const defaultSchemaSiteDir = path.join(rootDir, "dist", "schema-pages");
const forbiddenMarkers = [
  "work-zone/",
  "work-zone\\",
  "ai/codex/",
  "ai\\codex\\",
  "Github_mandolin",
  "HIA-Documentation-Sys"
];

await main();

/**
 * 验证 Pages artifact 的路由、schema 保真度和公开隐私边界。
 * Verifies Pages artifact routes, schema fidelity, and public privacy boundaries.
 */
async function main() {
  const options = parseArguments(process.argv.slice(2));
  const outputDir = path.resolve(options.out ?? defaultOutputDir);
  const schemaSiteDir = path.resolve(options.schemas ?? defaultSchemaSiteDir);
  await assertDirectory(outputDir, "Reference Pages artifact is missing.");
  await assertDirectory(path.join(schemaSiteDir, "schemas"), "Schema Pages source namespace is missing.");

  const siteManifest = await readJson(path.join(outputDir, "reference-pages.json"));
  const referenceBuild = await readJson(path.join(outputDir, "reference-build.json"));
  const catalog = await readJson(path.join(outputDir, "schemas", "catalog.json"));
  assert(siteManifest.contract === "hia-reference-pages", "Unexpected Reference Pages artifact contract.");
  assert(siteManifest.defaultLocale === "en", "Reference Pages default locale must remain en.");
  assert(Array.isArray(siteManifest.locales) && siteManifest.locales.includes("en") && siteManifest.locales.includes("zh-CN"), "Reference Pages locale inventory drifted.");
  assert(referenceBuild.contract === "hia-public-reference-build", "Reference Pages provenance is missing the public reference build.");
  assert(referenceBuild.privacy?.status === "pass", "Reference Pages input failed public privacy validation.");
  assert(Array.isArray(referenceBuild.sources) && referenceBuild.sources.length === 8, "Reference Pages provenance source count drifted.");
  assert(catalog.publicBaseUrl === "https://mandolin.github.io/HIA-Documentation/schemas/", "Schema catalog public base URL drifted.");

  await assertPageContains(outputDir, "index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "source-linkage/"]);
  await assertPageContains(outputDir, "en/index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "../source-linkage/"]);
  await assertPageContains(outputDir, "zh-CN/index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "../schemas/"]);
  await assertPageContains(outputDir, "source-linkage/index.html", ["HIA Public Reference Source Linkage", "hia-reference-site-nav", "browser-panel-payload"]);
  await assertFile(path.join(outputDir, "assets", "hia-reference-site.css"), "Reference Pages navigation stylesheet is missing.");
  await assertFile(path.join(outputDir, ".nojekyll"), "Reference Pages .nojekyll marker is missing.");

  for (const entry of catalog.schemas) {
    const canonicalFile = path.posix.basename(new URL(entry.publicUrl).pathname);
    const canonicalSchema = await readJson(path.join(outputDir, "schemas", canonicalFile));
    const aliasSchema = await readJson(path.join(outputDir, "schemas", entry.path.replace(/^\.\//, "")));
    assert(canonicalSchema.$id === entry.schemaId, `${entry.key}: canonical schema id drifted.`);
    assert(aliasSchema.$id === entry.schemaId, `${entry.key}: schema alias drifted.`);
  }

  await assertIdenticalTrees(path.join(schemaSiteDir, "schemas"), path.join(outputDir, "schemas"));
  const outputFiles = await listFiles(outputDir);
  for (const relativePath of outputFiles) {
    const pathSegments = relativePath.split("/");
    assert(pathSegments.every((segment) => !segment.startsWith(".") || segment === ".nojekyll"), `Hidden runtime output is not allowed in Pages artifact: ${relativePath}`);
    const contents = await readFile(path.join(outputDir, relativePath), "utf8");
    for (const marker of forbiddenMarkers) {
      assert(!contents.includes(marker), `Pages artifact leaks forbidden marker ${marker} in ${relativePath}.`);
    }
    assert(!/(?<![A-Za-z])[A-Za-z]:[\\/]/.test(contents), `Pages artifact leaks an absolute Windows path in ${relativePath}.`);
    assert(!/\/home\/runner\//.test(contents), `Pages artifact leaks a runner path in ${relativePath}.`);
  }

  console.log(`Reference Pages artifact check passed: ${siteManifest.locales.length} locales, ${catalog.schemas.length} schemas, ${referenceBuild.sources.length} resolved sources.`);
}

async function assertPageContains(root, relativePath, fragments) {
  const filePath = path.join(root, ...relativePath.split("/"));
  const contents = await readFile(filePath, "utf8");
  for (const fragment of fragments) {
    assert(contents.includes(fragment), `${relativePath}: missing required public route fragment ${fragment}.`);
  }
}

async function assertIdenticalTrees(sourceDir, outputDir) {
  const [sourceFiles, outputFiles] = await Promise.all([listFiles(sourceDir), listFiles(outputDir)]);
  assert(JSON.stringify(sourceFiles) === JSON.stringify(outputFiles), "Schema namespace file inventory drifted.");
  for (const relativePath of sourceFiles) {
    const [sourceContents, outputContents] = await Promise.all([
      readFile(path.join(sourceDir, relativePath)),
      readFile(path.join(outputDir, relativePath))
    ]);
    assert(Buffer.compare(sourceContents, outputContents) === 0, `Schema namespace byte content drifted: ${relativePath}`);
  }
}

async function listFiles(root, prefix = "") {
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, relativePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(relativePath);
      continue;
    }
    throw new Error(`Reference Pages artifact contains an unsupported filesystem entry: ${relativePath}`);
  }
  return files.sort();
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--out" || argument === "--schemas") {
      const value = args[index + 1];
      assert(value && !value.startsWith("--"), `${argument} requires a directory value.`);
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function assertDirectory(directoryPath, message) {
  const entry = await stat(directoryPath).catch(() => null);
  assert(entry?.isDirectory(), message);
}

async function assertFile(filePath, message) {
  const entry = await stat(filePath).catch(() => null);
  assert(entry?.isFile(), message);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
