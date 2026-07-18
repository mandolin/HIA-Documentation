import crypto from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(mainRepoRoot, "reference", "public-portal-data.json");
const docsRoot = path.join(mainRepoRoot, "docs");
const defaultOutputDir = path.join(mainRepoRoot, "dist", "public-portal-pages");
const forbiddenOutputMarkers = [
  "work-zone/",
  "work-zone\\",
  "ai/codex/",
  "ai\\codex\\",
  "Github_mandolin",
  "HIA-Documentation-Sys"
];

main();

/**
 * 验证公开门户页面构建产物的路由、计数、链接和隐私边界。
 * Verifies route, count, link, and privacy boundaries for generated public portal pages.
 */
function main() {
  const options = parseArguments(process.argv.slice(2));
  const outputDir = path.resolve(options.out ?? defaultOutputDir);
  const data = readJson(dataPath);
  const publicDocs = collectPublicDocuments(data);
  const manifest = readJson(path.join(outputDir, "public-portal-pages.json"));
  const searchIndex = readJson(path.join(outputDir, "assets", "public-portal-search-index.json"));

  validateManifest(data, manifest, publicDocs);
  validateRequiredFiles(data, outputDir, searchIndex, publicDocs);
  validateLinks(outputDir);
  validateRenderedPublicDocs(data, outputDir, publicDocs);
  validatePrivacy(outputDir);

  console.log(`Public portal pages check passed: ${manifest.locales.length} locale(s), ${manifest.counts.packageRows} package row(s), ${searchIndex.locales.reduce((total, locale) => total + locale.entryCount, 0)} search entry instance(s).`);
}

function validateManifest(data, manifest, publicDocs) {
  assert(manifest.contract === "hia-public-portal-pages", "Unexpected public portal pages manifest contract.");
  assert(manifest.contractVersion === "0.1.0-draft", "Unexpected public portal pages manifest contract version.");
  assert(manifest.sourceContract?.contract === data.contract, "Public portal pages source contract drifted.");
  assert(manifest.sourceContract?.contractVersion === data.contractVersion, "Public portal pages source contract version drifted.");
  assert(manifest.privacy?.workZonePublicInput === false, "Public portal pages must not use private workspace input.");
  assert(manifest.privacy?.sourcesContentPolicy === "none", "Public portal pages must not embed source content.");
  assertEqualSets(data.project.locales, manifest.locales.map((locale) => locale.locale), "Public portal page locales");
  assert(manifest.counts.corePackages === data.ecosystem.corePackages.names.length, "Core package count drifted.");
  assert(manifest.counts.packageRows === expectedPackageRows(data), "Package row count drifted.");
  assert(manifest.counts.docLines === data.ecosystem.docLines.length, "Doc-line count drifted.");
  assert(manifest.counts.adoptionCases === data.adoption.cases.length, "Adoption case count drifted.");
  assert(manifest.counts.adoptionRecipes === data.adoption.recipes.length, "Adoption recipe count drifted.");
  assert(manifest.counts.operationsRouteGroups === data.operations.routeGroups.length, "Operations route group count drifted.");
  assert(manifest.counts.hostSurfaces === data.hostAnchors.surfaces.length, "Host surface count drifted.");
  assert(manifest.counts.hostConcepts === data.hostAnchors.concepts.length, "Host concept count drifted.");
  assert(manifest.counts.hostContracts === data.hostAnchors.artifactContracts.length, "Host artifact contract count drifted.");
  assert(manifest.counts.hostEvidenceRows === data.hostAnchors.evidenceMatrix.length, "Host evidence row count drifted.");
  assert(manifest.counts.feedbackIssueTemplates === data.feedback.issueTemplates.length, "Feedback issue template count drifted.");
  assert(manifest.counts.feedbackCompatibilityNotes === data.feedback.compatibilityNotes.length, "Feedback compatibility note count drifted.");
  assert(manifest.counts.feedbackD4Candidates === data.feedback.d4CandidateBacklog.length, "Feedback D4 candidate count drifted.");
  assert(manifest.counts.publicDocCategories === data.publicDocs.categories.length, "Public docs category count drifted.");
  assert(manifest.counts.publicDocs === publicDocs.length, "Public docs entry count drifted.");
}

function validateRequiredFiles(data, outputDir, searchIndex, publicDocs) {
  assertFileContains(outputDir, "index.html", "data-hia-public-portal-root");
  assertFileContains(outputDir, "assets/hia-public-portal.css", ":root");
  const searchLocales = new Map(searchIndex.locales.map((locale) => [locale.locale, locale]));
  const publicDocRoutes = new Map(publicDocs.map((document) => [document.fileName, document.route]));
  for (const locale of data.project.locales) {
    const files = collectLocalePageList(data, locale, publicDocs);
    for (const file of files) {
      assertFile(path.join(outputDir, ...file.split("/")), `Missing generated public portal page: ${file}`);
    }
    assertFileContains(outputDir, `${locale}/packages/index.html`, "data-hia-public-portal-packages");
    assertFileContains(outputDir, `${locale}/doc-lines/index.html`, "data-hia-public-portal-doc-lines");
    for (const line of data.ecosystem.docLines) {
      assertFileContains(outputDir, `${locale}/doc-lines/${line.id}.html`, "data-hia-public-portal-doc-line-detail");
    }
    assertFileContains(outputDir, `${locale}/adoption/index.html`, "data-hia-public-portal-adoption");
    assertFileContains(outputDir, `${locale}/operations/index.html`, "data-hia-public-portal-operations");
    assertFileContains(outputDir, `${locale}/hosts/index.html`, "data-hia-public-portal-hosts");
    assertFileContains(outputDir, `${locale}/hosts/source-linkage.html`, "data-hia-public-portal-host-source-linkage");
    assertFileContains(outputDir, `${locale}/hosts/ide-devtools.html`, "data-hia-public-portal-host-ide-devtools");
    assertFileContains(outputDir, `${locale}/hosts/evidence.html`, "data-hia-public-portal-host-evidence");
    assertFileContains(outputDir, `${locale}/hosts/evidence.html`, "Project Relation Graph");
    assertFileContains(outputDir, `${locale}/hosts/evidence.html`, "project-relation-graph");
    assertFileContains(outputDir, `${locale}/hosts/ai-assisted-authoring.html`, "data-hia-public-portal-ai-authoring");
    assertFileContains(outputDir, `${locale}/feedback/index.html`, "data-hia-public-portal-feedback");
    assertFileContains(outputDir, `${locale}/feedback/compatibility.html`, "data-hia-public-portal-feedback-compatibility");
    assertFileContains(outputDir, `${locale}/feedback/compatibility.html`, "maturity-labels");
    assertFileContains(outputDir, `${locale}/feedback/templates.html`, "data-hia-public-portal-feedback-templates");
    assertFileContains(outputDir, `${locale}/feedback/templates.html`, "hia-portal-feedback.yml");
    assertFileContains(outputDir, `${locale}/feedback/d4-candidates.html`, "data-hia-public-portal-feedback-d4-candidates");
    assertFileContains(outputDir, `${locale}/feedback/d4-candidates.html`, "public-third-party-consumer");
    assertFileContains(outputDir, `${locale}/docs/index.html`, "data-hia-public-portal-docs");
    for (const document of publicDocs) {
      assertFileContains(outputDir, `${locale}/${document.route}`, "data-hia-public-portal-docs-entry");
      assertFileContains(outputDir, `${locale}/${document.route}`, "data-hia-public-docs-rendered");
    }
    for (const recipe of data.adoption.recipes) {
      const quickstartRoute = publicDocRoutes.get(recipe.quickstartDocument);
      assert(quickstartRoute, `${recipe.id}: quickstart document is not present in public docs.`);
      assertFileContains(outputDir, `${locale}/adoption/recipes/${recipe.id}.html`, relativeHref(`${locale}/adoption/recipes/${recipe.id}.html`, `${locale}/${quickstartRoute}`));
      assertFileContains(outputDir, `${locale}/${quickstartRoute}`, recipe.minimumRunnerPackage);
    }
    assertFileContains(outputDir, `${locale}/search/index.html`, "data-hia-public-portal-search");
    assertFileContains(outputDir, `${locale}/search/hosts.html`, "data-hia-public-portal-search-hosts");
    assertFileContains(outputDir, `${locale}/search/feedback.html`, "data-hia-public-portal-search-feedback");
    assertFileContains(outputDir, `${locale}/search/docs.html`, "data-hia-public-portal-search-docs");
    const localeSearch = searchLocales.get(locale);
    assert(localeSearch?.entryCount === expectedSearchEntryCount(data, publicDocs), `${locale}: search entry count drifted.`);
    assert(localeSearch.entries.length === localeSearch.entryCount, `${locale}: search entry length drifted.`);
  }
}

function collectLocalePageList(data, locale, publicDocs) {
  return [
    `${locale}/index.html`,
    `${locale}/packages/index.html`,
    `${locale}/doc-lines/index.html`,
    ...data.ecosystem.docLines.map((line) => `${locale}/doc-lines/${line.id}.html`),
    `${locale}/adoption/index.html`,
    `${locale}/adoption/policy.html`,
    ...data.adoption.cases.map((item) => `${locale}/adoption/cases/${item.id}.html`),
    ...data.adoption.recipes.map((item) => `${locale}/adoption/recipes/${item.id}.html`),
    `${locale}/operations/index.html`,
    `${locale}/operations/status.html`,
    `${locale}/operations/monitor.html`,
    `${locale}/operations/releases.html`,
    `${locale}/operations/versions.html`,
    `${locale}/hosts/index.html`,
    `${locale}/hosts/source-linkage.html`,
    `${locale}/hosts/ide-devtools.html`,
    `${locale}/hosts/evidence.html`,
    `${locale}/hosts/ai-assisted-authoring.html`,
    `${locale}/feedback/index.html`,
    `${locale}/feedback/compatibility.html`,
    `${locale}/feedback/templates.html`,
    `${locale}/feedback/d4-candidates.html`,
    `${locale}/docs/index.html`,
    ...data.publicDocs.categories.map((category) => `${locale}/docs/categories/${category.id}.html`),
    ...publicDocs.map((document) => `${locale}/${document.route}`),
    `${locale}/search/index.html`,
    `${locale}/search/ecosystem.html`,
    `${locale}/search/adoption.html`,
    `${locale}/search/operations.html`,
    `${locale}/search/hosts.html`,
    `${locale}/search/feedback.html`,
    `${locale}/search/docs.html`
  ];
}

function validateLinks(outputDir) {
  for (const filePath of listFiles(outputDir, (file) => file.endsWith(".html"))) {
    const html = readFileSync(filePath, "utf8");
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = match[1];
      if (!href || href.startsWith("#") || /^(?:https?:|mailto:|data:)/i.test(href)) continue;
      const targetOnly = href.split("#", 1)[0];
      if (!targetOnly) continue;
      const target = path.resolve(path.dirname(filePath), targetOnly);
      assertPathInside(outputDir, target, `Generated public portal link leaves output root: ${relative(outputDir, filePath)} -> ${href}`);
      assert(existsSync(target), `Generated public portal link is broken: ${relative(outputDir, filePath)} -> ${href}`);
    }
  }
}

function validatePrivacy(outputDir) {
  for (const filePath of listFiles(outputDir, (file) => [".css", ".html", ".js", ".json", ".map"].includes(path.extname(file)))) {
    const content = readFileSync(filePath, "utf8");
    const normalized = content.replaceAll("\\", "/").toLowerCase();
    assert(!/(^|[^a-z0-9+.-])[a-z]:\//i.test(normalized) && !normalized.includes("//?/"), `Generated public portal output leaks an absolute path: ${relative(outputDir, filePath)}.`);
    for (const marker of forbiddenOutputMarkers) {
      assert(!normalized.includes(marker.toLowerCase()), `Generated public portal output leaks forbidden marker ${marker}: ${relative(outputDir, filePath)}.`);
    }
    if (path.extname(filePath) === ".json") {
      assertNoEmbeddedSources(JSON.parse(content), relative(outputDir, filePath));
    }
  }
}

function validateRenderedPublicDocs(data, outputDir, publicDocs) {
  const unsafePatterns = [
    /<script\b/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<style\b/i,
    /\son[a-z]+\s*=/i,
    /\b(?:href|src)\s*=\s*["']\s*javascript:/i
  ];
  for (const locale of data.project.locales) {
    for (const document of publicDocs) {
      const relativePath = `${locale}/${document.route}`;
      const html = readFileSync(path.join(outputDir, ...relativePath.split("/")), "utf8");
      assert(/data-hia-public-docs-rendered>[\s\S]*<(?:p|h2|h3|ul|ol|pre|div class="portal-table-wrap")\b/.test(html), `${relativePath}: rendered public docs content is empty.`);
      for (const pattern of unsafePatterns) {
        assert(!pattern.test(html), `${relativePath}: rendered public docs content contains an unsafe HTML pattern ${pattern}.`);
      }
    }
  }
}

function expectedPackageRows(data) {
  return data.ecosystem.corePackages.names.length + data.ecosystem.docLines.reduce((total, line) => total + line.packages.length, 0);
}

function expectedSearchEntryCount(data, publicDocs) {
  return expectedPackageRows(data)
    + data.ecosystem.docLines.length
    + data.adoption.cases.length
    + data.adoption.recipes.length
    + data.operations.routeGroups.length
    + data.hostAnchors.concepts.length
    + data.hostAnchors.surfaces.length
    + data.hostAnchors.artifactContracts.length
    + 1
    + 1
    + 1
    + data.feedback.issueTemplates.length
    + data.feedback.compatibilityNotes.length
    + data.feedback.d4CandidateBacklog.length
    + data.publicDocs.categories.length
    + publicDocs.length;
}

function collectPublicDocuments(data) {
  const categoryIds = new Set(data.publicDocs.categories.map((category) => category.id));
  const documents = readdirSync(docsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const contents = readFileSync(path.join(docsRoot, entry.name), "utf8");
      const baseName = entry.name.replace(/\.md$/i, "");
      return {
        fileName: entry.name,
        title: readMarkdownTitle(contents) ?? baseName,
        summary: readMarkdownSummary(contents),
        category: inferCategory(entry.name, contents, categoryIds),
        route: `docs/reference/${toRouteToken(baseName)}--${shortHash(entry.name)}.html`
      };
    })
    .sort((left, right) => compareStableText(left.fileName, right.fileName));
  assert(documents.length >= data.publicDocs.minimumDocumentCount, "Public docs document count is below the public portal floor.");
  return documents;
}

function inferCategory(fileName, contents, categoryIds) {
  const value = `${fileName}\n${contents}`;
  const selected = (() => {
    if (/^ci\.md$/i.test(fileName)) return "operations";
    if (/reference[- ]operations|reference[- ]pages|public[- ]reference|public[- ]portal|pages artifact|github pages|\bgate\b|\bacceptance\b/i.test(value)) return "operations";
    if (/schema|profile|contract|fixture|manifest/i.test(fileName)) return "contracts";
    if (/release|version|compat|migration|public-package/i.test(fileName)) return "release";
    if (/security|dependency|license|governance|review-template/i.test(fileName)) return "governance";
    if (/ide|vscode|adapter|plugin|devtools|browser/i.test(fileName)) return "tooling";
    if (/configuration|config/i.test(fileName)) return "configuration";
    return "guide";
  })();
  return categoryIds.has(selected) ? selected : "guide";
}

function readMarkdownTitle(contents) {
  const line = contents.split(/\r?\n/).find((entry) => entry.startsWith("# "));
  return line?.replace(/^#\s+/, "").trim();
}

function readMarkdownSummary(contents) {
  const lines = contents.split(/\r?\n/);
  let seenTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!seenTitle) {
      if (trimmed.startsWith("# ")) seenTitle = true;
      continue;
    }
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```")) continue;
    return normalizeMarkdownInline(trimmed);
  }
  return "";
}

function normalizeMarkdownInline(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function relativeHref(fromFile, targetFile) {
  const relativePath = path.posix.relative(path.posix.dirname(fromFile), targetFile);
  return relativePath || path.posix.basename(targetFile);
}

function toRouteToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "document";
}

function shortHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function assertNoEmbeddedSources(value, filePath) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoEmbeddedSources(item, filePath);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "sourcesContent" && Array.isArray(item) && item.some((entry) => typeof entry === "string" && entry.length > 0)) {
      throw new Error(`Generated public portal output embeds sourcesContent: ${filePath}`);
    }
    assertNoEmbeddedSources(item, filePath);
  }
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--out") {
      const value = args[index + 1];
      assert(value && !value.startsWith("--"), `${argument} requires a directory value.`);
      options.out = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function assertFile(filePath, message) {
  assert(existsSync(filePath), message);
}

function assertFileContains(outputDir, relativePath, fragment) {
  const filePath = path.join(outputDir, ...relativePath.split("/"));
  assertFile(filePath, `Missing generated public portal file: ${relativePath}`);
  assert(readFileSync(filePath, "utf8").includes(fragment), `${relativePath}: missing required marker ${fragment}.`);
}

function listFiles(directory, predicate) {
  const files = [];
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (predicate(entryPath)) files.push(entryPath);
    }
  }
  return files.sort(compareStableText);
}

function readJson(filePath) {
  assert(existsSync(filePath), `Required file is missing: ${filePath}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function assertEqualSets(expected, actual, label) {
  const expectedValues = [...expected].sort(compareStableText);
  const actualValues = [...actual].sort(compareStableText);
  assert(expectedValues.length === actualValues.length && expectedValues.every((value, index) => value === actualValues[index]), `${label} drifted. Expected ${expectedValues.join(", ")}; received ${actualValues.join(", ")}.`);
}

function assertPathInside(root, candidate, message) {
  const relativePath = path.relative(root, candidate);
  assert(Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath), message);
}

function relative(root, filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareStableText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
