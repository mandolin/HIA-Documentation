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
  const portalPages = await readJson(path.join(outputDir, "public-portal-pages.json"));
  const portalSearchIndex = await readJson(path.join(outputDir, "assets", "public-portal-search-index.json"));
  const catalog = await readJson(path.join(outputDir, "schemas", "catalog.json"));
  assert(siteManifest.contract === "hia-reference-pages", "Unexpected Reference Pages artifact contract.");
  assert(siteManifest.defaultLocale === "en", "Reference Pages default locale must remain en.");
  assert(Array.isArray(siteManifest.locales) && siteManifest.locales.includes("en") && siteManifest.locales.includes("zh-CN"), "Reference Pages locale inventory drifted.");
  assert(siteManifest.versioning?.strategy === "current-and-releases", "Reference Pages versioning strategy drifted.");
  assert(siteManifest.versioning?.current?.path === "current/", "Reference Pages current route drifted.");
  assert(siteManifest.versioning?.releases?.length === 1, "Reference Pages release snapshot inventory drifted.");
  assert(referenceBuild.contract === "hia-public-reference-build", "Reference Pages provenance is missing the public reference build.");
  assert(referenceBuild.privacy?.status === "pass", "Reference Pages input failed public privacy validation.");
  assert(Array.isArray(referenceBuild.sources) && referenceBuild.sources.length === 8, "Reference Pages provenance source count drifted.");
  assert(portalPages.contract === "hia-public-portal-pages", "Reference Pages public portal manifest is missing or invalid.");
  assert(portalPages.privacy?.status === "pass" && portalPages.privacy?.sourcesContentPolicy === "none", "Reference Pages public portal privacy contract drifted.");
  assert(siteManifest.routes?.publicPortalPages === "public-portal-pages.json", "Reference Pages public portal manifest route is missing.");
  assert(siteManifest.routes?.publicPortalSearchIndex === "assets/public-portal-search-index.json", "Reference Pages public portal search route is missing.");
  assert(siteManifest.compatibleMerge?.strategy === "preserve-reference-pages-and-merge-public-portal-routes", "Reference Pages compatible merge strategy drifted.");
  assert(catalog.publicBaseUrl === "https://mandolin.github.io/HIA-Documentation/schemas/", "Schema catalog public base URL drifted.");
  const releaseId = siteManifest.versioning.releases[0].id;
  const releaseRoot = `releases/${releaseId}`;

  await assertPageContains(outputDir, "index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "source-linkage/"]);
  await assertPageContains(outputDir, "en/index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "../source-linkage/"]);
  await assertPageContains(outputDir, "zh-CN/index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "../schemas/"]);
  await assertPageContains(outputDir, "source-linkage/index.html", ["HIA Public Reference Source Linkage", "hia-reference-site-nav", "browser-panel-payload"]);
  await assertPageContains(outputDir, "current/index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "../schemas/"]);
  await assertPageContains(outputDir, "current/en/index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "../../schemas/"]);
  await assertPageContains(outputDir, "current/zh-CN/index.html", ["HIA Documentation System Reference", "hia-reference-site-nav", "../../schemas/"]);
  await assertPageContains(outputDir, "current/source-linkage/index.html", ["HIA Public Reference Source Linkage", "hia-reference-site-nav", "browser-panel-payload"]);
  await assertPageContains(outputDir, `${releaseRoot}/index.html`, ["HIA Documentation System Reference", "hia-reference-site-nav", "../../schemas/"]);
  await assertPageContains(outputDir, `${releaseRoot}/en/index.html`, ["HIA Documentation System Reference", "hia-reference-site-nav", "../../../schemas/"]);
  await assertPageContains(outputDir, `${releaseRoot}/zh-CN/index.html`, ["HIA Documentation System Reference", "hia-reference-site-nav", "../../../schemas/"]);
  await assertPageContains(outputDir, `${releaseRoot}/source-linkage/index.html`, ["HIA Public Reference Source Linkage", "hia-reference-site-nav", "browser-panel-payload"]);
  await assertPageContains(outputDir, "versions/index.html", ["HIA Reference Versions", "Current", releaseId]);
  await assertFile(path.join(outputDir, "assets", "hia-public-portal.css"), "Public portal stylesheet is missing.");
  assert(portalSearchIndex.contract === "hia-public-portal-search-index", "Public portal search index contract drifted.");
  for (const locale of siteManifest.locales) {
    await assertPageContains(outputDir, `${locale}/packages/index.html`, ["data-hia-public-portal-packages", "@hia-doc/core"]);
    await assertPageContains(outputDir, `${locale}/doc-lines/index.html`, ["data-hia-public-portal-doc-lines", "TSDoc"]);
    await assertPageContains(outputDir, `${locale}/adoption/index.html`, ["data-hia-public-portal-adoption", "read-only"]);
    await assertPageContains(outputDir, `${locale}/operations/index.html`, ["data-hia-public-portal-operations", "legacy-reference-pages"]);
    await assertPageContains(outputDir, `${locale}/hosts/index.html`, ["data-hia-public-portal-hosts", "Project Relation Graph"]);
    await assertPageContains(outputDir, `${locale}/hosts/source-linkage.html`, ["data-hia-public-portal-host-source-linkage", "Structured Open Request"]);
    await assertPageContains(outputDir, `${locale}/hosts/ide-devtools.html`, ["data-hia-public-portal-host-ide-devtools", "VS Code"]);
    await assertPageContains(outputDir, `${locale}/hosts/evidence.html`, ["data-hia-public-portal-host-evidence", "project-relation-graph"]);
    await assertPageContains(outputDir, `${locale}/hosts/ai-assisted-authoring.html`, ["data-hia-public-portal-ai-authoring", "AI-Assisted Documentation Authoring"]);
    await assertPageContains(outputDir, `${locale}/docs/index.html`, ["data-hia-public-portal-docs", "Configuration"]);
    await assertPageContains(outputDir, `${locale}/docs/reference/reference-pages--077ce10c88.html`, ["data-hia-public-docs-rendered", "Public Routes"]);
    await assertPageContains(outputDir, `${locale}/docs/reference/tsdoc-quickstart--40de72c37e.html`, ["data-hia-public-docs-rendered", "@hia-doc/tsdoc-runner"]);
    await assertPageContains(outputDir, `${locale}/docs/reference/dotnetdoc-quickstart--cefba20162.html`, ["data-hia-public-docs-rendered", "@hia-doc/dotnetdoc-runner"]);
    await assertPageContains(outputDir, `${locale}/search/index.html`, ["data-hia-public-portal-search"]);
    await assertPageContains(outputDir, `${locale}/search/hosts.html`, ["data-hia-public-portal-search-hosts", "Language Server Protocol"]);
    const searchLocale = portalSearchIndex.locales.find((entry) => entry.locale === locale);
    assert(searchLocale?.entryCount > 0 && searchLocale.entries?.length === searchLocale.entryCount, `${locale}: public portal search index drifted.`);
  }
  await assertFile(path.join(outputDir, "assets", "hia-reference-site.css"), "Reference Pages navigation stylesheet is missing.");
  await assertFile(path.join(outputDir, ".nojekyll"), "Reference Pages .nojekyll marker is missing.");
  const versionIndex = await readJson(path.join(outputDir, "versions.json"));
  assert(versionIndex.contract === "hia-reference-version-index", "Reference version index contract drifted.");
  assert(versionIndex.versioning?.searchPartitions?.length === 4, "Reference version search partition inventory drifted.");

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
