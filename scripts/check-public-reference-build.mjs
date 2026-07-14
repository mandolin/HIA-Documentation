import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(mainRepoRoot, "reference", "public-reference-build.definition.json");

main();

/**
 * 在上传 artifact 前复核公开 reference build 的 provenance、coverage 与隐私边界。
 * Verifies public reference provenance, coverage, and privacy boundaries before artifact upload.
 */
function main() {
  const outputRoot = path.resolve(readOption(process.argv.slice(2), "--out") ?? path.join(mainRepoRoot, "dist", "public-reference-build"));
  const definition = readJson(definitionPath);
  const report = readJson(path.join(outputRoot, "reference-build.json"));

  assert(report.contract === "hia-public-reference-build" && report.contractVersion === "0.1.0-draft", "Public reference build report contract/version is invalid.");
  assert(report.privacy?.sourcesContentPolicy === "none" && report.privacy?.workZonePublicInput === false, "Public reference build privacy policy drifted.");
  assert(report.buildDefinition?.contract === definition.contract && report.buildDefinition?.contractVersion === definition.contractVersion, "Public reference build definition drifted.");

  const expectedSources = definition.sources.map((source) => source.id).sort(compareStableText);
  const actualSources = (report.sources ?? []).map((source) => source.id).sort(compareStableText);
  assertEqualSets(expectedSources, actualSources, "Resolved source inventory");
  for (const expected of definition.sources) {
    const actual = report.sources.find((source) => source.id === expected.id);
    assert(actual?.repository === expected.repository && actual.ref === expected.ref, `Source provenance drifted for ${expected.id}.`);
    assert(/^[0-9a-f]{40}$/i.test(actual.commit ?? ""), `Source ${expected.id} has no full resolved SHA.`);
  }

  const expectedLocales = definition.acceptance.requiredLocales;
  assertEqualSets(expectedLocales, (report.locales ?? []).map((locale) => locale.locale), "Built locale inventory");
  for (const locale of expectedLocales) {
    checkLocale(definition, outputRoot, locale);
  }
  checkSourceLinkage(definition, outputRoot, report.sourceLinkage);
  assertNoPrivateOutput(definition, outputRoot);
  assert(!existsSync(path.join(outputRoot, ".runtime")), "Public reference artifact must not retain runtime producer wrappers.");

  console.log(`Public reference build check passed: ${expectedLocales.length} locales, ${expectedSources.length} resolved sources, ${definition.producers.length} producers.`);
}

function checkLocale(definition, outputRoot, locale) {
  const localeRoot = path.join(outputRoot, locale);
  const manifest = readJson(path.join(localeRoot, "hia-manifest.json"));
  assert(manifest.initialLocale === locale, `${locale}: initial locale drifted.`);
  assert(manifest.project?.entryCounts?.all >= definition.acceptance.minimumEntryCounts.all, `${locale}: all entry count regressed.`);
  for (const [view, minimum] of Object.entries(definition.acceptance.minimumEntryCounts)) {
    assert(manifest.project?.entryCounts?.[view] >= minimum, `${locale}: ${view} entry count regressed.`);
  }
  assert((manifest.docSourceMaps?.length ?? 0) >= definition.acceptance.minimumDocSourceMapCount, `${locale}: doc-source-map count regressed.`);
  assertRequiredEntryIds(definition, localeRoot, locale);
  assert((manifest.build?.producers?.length ?? 0) === definition.acceptance.requiredProducerCount, `${locale}: producer count drifted.`);
  for (const producer of definition.producers) {
    assert(manifest.build.producers.some((summary) => summary.id === producer.id && summary.status === "success"), `${locale}: producer ${producer.id} is not successful.`);
  }
}

/**
 * 复核 canonical project index 中的关键符号，保证 public build floor 跟随去重后的渲染口径仍保有语义锚点。
 * Checks key symbols in the canonical project index so public build floors keep semantic anchors after render-input deduplication.
 */
function assertRequiredEntryIds(definition, localeRoot, locale) {
  const requiredEntryIds = definition.acceptance.requiredEntryIds ?? [];
  assert(Array.isArray(requiredEntryIds) && requiredEntryIds.every((id) => typeof id === "string" && id.length > 0), "Public reference requiredEntryIds must be non-empty strings.");
  if (requiredEntryIds.length === 0) return;

  const projectIndex = readJson(path.join(localeRoot, "project-index.json"));
  const actualIds = new Set((projectIndex.entries ?? []).map((entry) => entry.id).filter((id) => typeof id === "string"));
  for (const entryId of requiredEntryIds) {
    assert(actualIds.has(entryId), `${locale}: required reference entry regressed: ${entryId}.`);
  }
}

function checkSourceLinkage(definition, outputRoot, report) {
  const payload = readJson(path.join(outputRoot, "source-linkage", "browser-panel-payload.json"));
  assert(payload.summary?.entryCount > 0, "Source-linkage panel contains no entries.");
  assert(payload.summary?.sourceMapCount >= definition.acceptance.minimumPanelSourceMapCount, "Source-linkage panel source-map count regressed.");
  assert(report?.sourceMapCount === payload.summary.sourceMapCount, "Source-linkage report does not match panel payload.");
}

function assertNoPrivateOutput(definition, root) {
  for (const filePath of listFiles(root, (file) => [".css", ".html", ".js", ".json", ".map"].includes(path.extname(file)))) {
    const content = readFileSync(filePath, "utf8");
    const normalized = content.replaceAll("\\", "/").toLowerCase();
    assert(!/(^|[^a-z0-9+.-])[a-z]:\//i.test(normalized) && !normalized.includes("//?/"), `Output leaks a local absolute path: ${relative(filePath)}`);
    for (const marker of definition.privacy.forbiddenOutputMarkers) {
      assert(!normalized.includes(marker.toLowerCase()), `Output leaks private marker ${marker}: ${relative(filePath)}`);
    }
    if (path.extname(filePath) === ".json") assertNoEmbeddedSources(JSON.parse(content), relative(filePath));
  }
}

function assertNoEmbeddedSources(value, filePath) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoEmbeddedSources(item, filePath);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "sourcesContent" && Array.isArray(item) && item.some((entry) => typeof entry === "string" && entry.length > 0)) {
      throw new Error(`Output embeds sourcesContent: ${filePath}`);
    }
    assertNoEmbeddedSources(item, filePath);
  }
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
  return files;
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  assert(typeof value === "string" && value.length > 0, `${name} requires a value.`);
  return value;
}

function assertEqualSets(expected, actual, label) {
  assert(expected.length === actual.length && expected.every((value, index) => value === actual[index]), `${label} drifted. Expected ${expected.join(", ")}; received ${actual.join(", ")}.`);
}

function relative(filePath) {
  return path.relative(mainRepoRoot, filePath).replaceAll("\\", "/");
}

function compareStableText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function readJson(filePath) {
  assert(existsSync(filePath), `Required file is missing: ${filePath}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
