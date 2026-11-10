/** @file @lang zh-CN 核验公开参考来源、领域内容与隐私，.NET样本要求真实C#来源和独立语言字段。 @lang en Checks public reference provenance, domain content and privacy, requiring real C# origins and independent localized fields for the .NET sample. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { validateDocumentationUiLocaleCompletenessReport } from "../packages/core/dist/index.js";
import { assertPublicText } from "./check-official-web.mjs";

const mainRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(mainRepoRoot, "reference", "public-reference-build.definition.json");

// <lang><zh-CN>只有正常命令入口运行磁盘检查，单元测试导入纯检查函数时没有构建或读目录副作用。</zh-CN><en>Run disk verification only at the normal command entry, leaving imports of pure assertions free of build/directory-read side effects.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

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
    checkDotnetSample(outputRoot, locale);
    checkPortalUi(outputRoot, locale);
  }
  checkSourceLinkage(definition, outputRoot, report.sourceLinkage);
  assertNoPrivateOutput(definition, outputRoot);
  assert(!existsSync(path.join(outputRoot, ".runtime")), "Public reference artifact must not retain runtime producer wrappers.");

  console.log(`Public reference build check passed: ${expectedLocales.length} locales, ${expectedSources.length} resolved sources, ${definition.producers.length} producers.`);
}

/**
 * @lang zh-CN 核对本站显式信息架构、实际UI报告与静态语言路由；正文与来源另由领域门禁核验。
 * @lang en Checks this site's explicit IA, actual UI report and static language routes, leaving prose and source checks to domain gates.
 * @param {string} outputRoot <lang><zh-CN>公开构建根。</zh-CN><en>Public build root.</en></lang>
 * @param {string} locale <lang><zh-CN>当前目录语言。</zh-CN><en>Current directory locale.</en></lang>
 * @returns {void} <lang><zh-CN>缺失采用、报告或路由时抛错。</zh-CN><en>Throws when adoption, reports or routes are missing.</en></lang>
 */
function checkPortalUi(outputRoot, locale) {
  const root = path.join(outputRoot, locale);
  const index = readJson(path.join(root, 'project-index.json'));
  const ia = index.site?.informationArchitecture;
  assert(ia?.contentGrouping === 'entry' && ia.loadingStrategy === 'lazy' && ia.memberPlacement === 'separate' && ia.localeModel.uiLocale === locale, `${locale}: reference Portal UI adoption drifted.`);
  // <lang><zh-CN>固定owner路径与当前契约读取器共同拒绝旧报告或伪完整状态。</zh-CN><en>The fixed owner path and current contract reader reject legacy reports or a false complete status.</en></lang>
  const report = readJson(path.join(root, 'documentation-ui-locale-completeness.json'));
  assert(report.contractVersion === '1.0.0' && report.status === 'complete' && validateDocumentationUiLocaleCompletenessReport(report).length === 0, `${locale}: reference UI report is invalid or incomplete.`);
  assert(index.site.uiLocaleCompleteness?.path === 'documentation-ui-locale-completeness.json' && index.site.uiLocaleCompleteness.status === report.status, `${locale}: reference UI report linkage drifted.`);
  const shell = readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(shell.includes(`<html lang="${locale}"`) && shell.includes('data-hia-ui-message="portal.locale.uilabel"'), `${locale}: reference UI language markers are missing.`);
  assert(/--hia-color-accent:\s*#0047AB;/i.test(readFileSync(path.join(root, 'assets/hia-default.css'), 'utf8')), `${locale}: reference cobalt brand is missing.`);
  // <lang><zh-CN>每个真实条目的两语言无脚本入口均须落盘，不能仅有索引声明。</zh-CN><en>Both no-script UI-language routes must exist for every real entry, beyond index declarations.</en></lang>
  for (const entry of index.entries) for (const uiLocale of ['zh-CN', 'en']) {
    const page = entry.noScriptLocalePages?.find(item => item.uiLocale === uiLocale);
    assert(page?.path.startsWith(`pages/${uiLocale}/`) && existsSync(path.join(root, page.path)), `${locale}: localized no-script entry is missing.`);
  }
  for (const entry of index.entries.filter(item => item.view === 'dotnet')) {
    const topic = readFileSync(path.join(root, entry.contentPath), 'utf8');
    const fieldHeading = shell.includes('data-hia-site-navigation') ? 'data-hia-reading-section=' : 'data-hia-ui-message="portal.section.localizedfields"';
    assert(topic.includes(fieldHeading) && topic.includes('data-hia-ui-message="portal.metadata.assembly"'), `${locale}: reference topic UI messages are missing.`);
  }
}

/**
 * @lang zh-CN 校验唯一自有.NET样本的七语言字段及C#来源，避免数量门禁掩盖内容或映射降级。
 * @lang en Checks seven localized fields and C# origins for the unique first-party .NET sample so counts cannot hide content or mapping regressions.
 * @param {string} outputRoot <lang><zh-CN>已构建的公开输出根。</zh-CN><en>Built public output root.</en></lang>
 * @param {string} locale <lang><zh-CN>当前待核正文语言。</zh-CN><en>Content locale being checked.</en></lang>
 * @returns {void} <lang><zh-CN>通过时无返回值，缺字段或非C#来源时抛错。</zh-CN><en>No return value on success; throws for missing fields or non-C# origins.</en></lang>
 */
function checkDotnetSample(outputRoot, locale) {
  // <lang><zh-CN>只检查显式类型和方法槽位，工具包API覆盖由独立清单管理。</zh-CN><en>Check explicit type and method slots; tool-package API coverage is managed separately.</en></lang>
  const index = readJson(path.join(outputRoot, locale, "project-index.json"));
  const entries = index.entries;
  const expected = [
    ["hia-document:dotnet-t-hiadocumentationsample.envelope-1", ["summary", "typeParams.T.summary"]],
    ["hia-document:dotnet-m-hiadocumentationsample.envelope-1.formatlabel-system.string", ["summary", "remarks", "params.label.summary", "returns.summary", "exceptions.T:System.ArgumentNullException.summary"]]
  ];
  for (const [id, fields] of expected) {
    // <lang><zh-CN>只接受本样本C#声明的非空签名和范围，XML文档自身行号不算源码定位。</zh-CN><en>Require nonempty signatures and ranges in this sample's C# declaration; XML document lines do not count as code locations.</en></lang>
    const entry = entries.find(item => item.id === id);
    assert(entry?.signature?.length > 0, `${locale}: .NET sample signature missing: ${id}`);
    assert(entry.source?.path === "reference/samples/dotnet/Envelope.cs" && entry.source.language === "csharp" && entry.source.range?.start?.line > 0, `${locale}: .NET sample C# origin missing: ${id}`);
    // <lang><zh-CN>预览和独立页必须是同源生成资产，正文须逐字节对应当前声明窗口。</zh-CN><en>Previews and independent pages must be generated same-origin assets, with bytes matching the current declaration window.</en></lang>
    const asset = entry.source.publicAsset;
    assert(asset && /^sources\/[a-f0-9]+\.txt$/.test(asset.relativeUrl) && entry.source.fetchUrl === asset.relativeUrl, `${locale}: .NET sample authorized source asset missing: ${id}`);
    const content = readFileSync(path.join(outputRoot, locale, asset.relativeUrl), "utf8");
    const sourceLines = readFileSync(path.join(mainRepoRoot, entry.source.path), "utf8").replaceAll("\r\n", "\n").split("\n");
    const expectedLines = sourceLines.slice(entry.source.range.start.line - 1, entry.source.range.end.line);
    const expectedContent = expectedLines.join("\n");
    assert(content === expectedContent, `${locale}: .NET sample source bytes mismatch: ${id}`);
    assert(asset.digest === `sha384-${createHash("sha384").update(content).digest("base64")}`, `${locale}: .NET sample source digest mismatch: ${id}`);
    assert(asset.byteLength === Buffer.byteLength(content, "utf8") && asset.lineCount === expectedLines.length, `${locale}: .NET sample source size metadata mismatch: ${id}`);
    const [sourcePage, fragment] = (entry.source.linkUrl ?? "").split("#");
    assert(entry.source.linkUrl === asset.linkUrl && /^sources\/[a-f0-9]+\.L[1-9][0-9]*\.html$/.test(sourcePage) && fragment === `L${entry.source.range.start.line}`, `${locale}: .NET sample source line URL invalid: ${id}`);
    assert(readFileSync(path.join(outputRoot, locale, sourcePage), "utf8").includes(`id="${fragment}"`), `${locale}: .NET sample source line anchor missing: ${id}`);
    for (const field of fields) {
      // <lang><zh-CN>两种正文均须显式存在，当前语言不能依靠缺译回退。</zh-CN><en>Both content locales must exist explicitly, without fallback for the current locale.</en></lang>
      const localized = entry.i18n?.fields?.[field];
      assert(localized?.localizedText?.["zh-CN"]?.trim() && localized?.localizedText?.en?.trim(), `${locale}: .NET sample localized field missing: ${field}`);
      assert(localized.resolutions?.[locale]?.usedFallback === false && localized.resolutions[locale].missing === false, `${locale}: .NET sample locale fell back: ${field}`);
    }
  }
  // <lang><zh-CN>真实样本的类型入口及方法必须共享一个类型节点，避免导航显示名分裂再次出现。</zh-CN><en>The real sample's type entry and method must share one type node to prevent display-name splitting.</en></lang>
  const nodes = [...(index.navigationTree ?? []).filter(node => node.id === "view:dotnet")];
  for (const node of nodes) nodes.push(...node.children ?? []);
  const type = nodes.find(node => node.kind === "type" && node.entryId === expected[0][0]);
  assert(type?.label === "Envelope<T>" && type.entryCount === 2 && type.children?.some(node => node.entryId === expected[1][0]), `${locale}: .NET sample type/member navigation is split.`);
}

function checkLocale(definition, outputRoot, locale) {
  const localeRoot = path.join(outputRoot, locale);
  const manifest = readJson(path.join(localeRoot, "hia-manifest.json"));
  assertProducerContributions(definition, readJson(path.join(localeRoot, "project-index.json")).entries ?? [], locale);
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
 * @lang zh-CN 固定公开参考的每个领域生产器必须贡献实际条目，成功状态与其它领域的总数不能掩盖空产物。
 * @lang en Every producer in the fixed public reference must contribute actual entries; success status or other domains' totals cannot conceal empty output.
 * @param {object} definition - 已验证的公开构建来源清单。 Validated public build source inventory.
 * @param {object[]} entries - 实际规范化项目索引条目。 Actual canonical project-index entries.
 * @param {string} locale - 当前检查语言，仅用于诊断。 Current checked locale, used only in diagnostics.
 * @returns {void} 每个显式生产器至少对应一个原路径条目时通过。 Passes when each explicit producer has an entry under its original path.
 * @throws {Error} 生产器没有实际条目。 A producer contributes no actual entries.
 */
export function assertProducerContributions(definition, entries, locale) {
  // <lang><zh-CN>完整前缀包含末尾斜线，避免把相似生产器名或其它目录误算为当前来源。</zh-CN><en>The full prefix includes a trailing slash so similar producer names and unrelated directories cannot count as this source.</en></lang>
  for (const producer of definition.producers) {
    const prefix = `.hia-producers/${producer.id}/`;
    assert(entries.some(entry => typeof entry.input?.path === "string" && entry.input.path.startsWith(prefix)), `${locale}: producer ${producer.id} contains no canonical reference entries.`);
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
    assertPublicText(content);
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
