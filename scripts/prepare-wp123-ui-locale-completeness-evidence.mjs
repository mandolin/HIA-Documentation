import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA,
  evaluateDocumentationUiLocaleCompleteness,
  validateDocumentationUiLocaleCompletenessReport
} from "../packages/core/dist/index.js";
import { getHiaSchema, HIA_SCHEMA_KEYS } from "../packages/schemas/dist/index.js";

/**
 * @lang zh-CN
 * 生成 W-P123 metadata-only、public-safe evidence；脚本只使用 HIA-owned 内存 message/surface fixture 与已构建 schema metadata。
 *
 * @lang en
 * Generates metadata-only, public-safe W-P123 evidence; the script uses only an HIA-owned in-memory message/surface fixture and built schema metadata.
 */

// <lang><zh-CN>输出路径由脚本 URL 确定，避免 cwd 或外部项目路径影响 evidence。</zh-CN><en>The output path derives from the script URL so cwd or external-project paths cannot affect evidence.</en></lang>
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "dist/wp123-ui-locale-completeness");
const outputPath = path.join(outputDir, "evidence.json");

// <lang><zh-CN>基准必须以中文内容 + 英文 UI 组合通过，且每个 surface 自动展开 2 mode × 2 UI locale。</zh-CN><en>The baseline must pass with Chinese content plus English UI and automatically expand each surface to 2 modes × 2 UI locales.</en></lang>
const baselineInput = createInput();
const baseline = evaluateDocumentationUiLocaleCompleteness(baselineInput);
assert(baseline.status === "complete" && baseline.report && baseline.reportJson && baseline.summary, "Synthetic UI-locale completeness gate did not pass.");
assert(validateDocumentationUiLocaleCompletenessReport(baseline.report).length === 0, "Synthetic UI-locale report did not pass owner validation.");
assert(baseline.summary.evaluations === 4 && baseline.summary.exact === 10, "Synthetic UI-locale matrix or exact coverage drifted.");
assert(baseline.report.evaluations.some(({ contentLocale, uiLocale, status }) => contentLocale === "zh-CN" && uiLocale === "en" && status === "complete"), "Content/UI locale separation was not observed.");
assert(Object.isFrozen(baseline) && Object.isFrozen(baseline.report.evaluations), "UI-locale result is not deeply frozen.");

// <lang><zh-CN>反转所有非语义 collection，证明 report bytes 不依赖输入数组位置。</zh-CN><en>Reverse every non-semantic collection to prove report bytes do not depend on input array positions.</en></lang>
const shuffled = createInput();
for (const collection of ["messages", "bundles", "fallbackChains", "surfaces", "requirements"]) shuffled[collection].reverse();
for (const bundle of shuffled.bundles) bundle.entries.reverse();
const shuffledResult = evaluateDocumentationUiLocaleCompleteness(shuffled);
assert(shuffledResult.status === "complete" && shuffledResult.reportJson === baseline.reportJson, "UI-locale report JSON drifted with input order.");

// <lang><zh-CN>Report 必须完全排除实际译文，包括刻意放入的 marker。</zh-CN><en>The report must exclude all actual translation text, including an intentional marker.</en></lang>
const markerInput = createInput();
markerInput.bundles[0].entries[0].text = "translation-body-marker";
const markerResult = evaluateDocumentationUiLocaleCompleteness(markerInput);
assert(markerResult.status === "complete" && !markerResult.reportJson.includes("translation-body-marker"), "Translation text leaked into the public report.");

// <lang><zh-CN>十二个 stable ULC code 由互相独立的内存负例覆盖。</zh-CN><en>Independent in-memory negative cases cover all twelve stable ULC codes.</en></lang>
const coveredCodes = collectDiagnosticCoverage(baseline.report);
assert(equalStrings(coveredCodes, [...DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES]), `Diagnostic coverage drifted: ${JSON.stringify(coveredCodes)}`);

// <lang><zh-CN>第 17 个 schema snapshot 必须与 core owner schema 语义一致。</zh-CN><en>The seventeenth schema snapshot must remain semantically identical to the core owner schema.</en></lang>
const distributedSchema = getHiaSchema("documentation-ui-locale-completeness");
assert(JSON.stringify(distributedSchema) === JSON.stringify(DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA), "Distributed UI-locale schema drifted from its owner.");
assert(HIA_SCHEMA_KEYS.length === 17, "Schema distribution count drifted from the W-P123 baseline.");

// <lang><zh-CN>Evidence 只公开计数、hash、布尔 gate 和 all-false privacy，不复制翻译正文或 renderer 结构。</zh-CN><en>Evidence exposes only counts, hashes, boolean gates, and all-false privacy, never translation text or renderer structure.</en></lang>
const report = {
  contract: "wp123-ui-locale-completeness-evidence",
  contractVersion: "0.1.0-draft",
  status: "ready-for-wp123-closeout",
  snapshotDate: "2026-09-04",
  implementation: {
    contract: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT,
    contractVersion: DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
    schemaId: DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$id,
    distributedSchemaCount: HIA_SCHEMA_KEYS.length,
    diagnosticCodeCount: DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES.length,
    diagnosticCoverageCount: coveredCodes.length
  },
  syntheticFixture: {
    synthetic: true,
    targetDerived: false,
    reportSha256: createHash("sha256").update(baseline.reportJson).digest("hex"),
    deterministicAcrossArrayOrder: true,
    deeplyFrozen: true,
    contentAndUiLocaleIndependent: true,
    fullSurfaceModeUiLocaleMatrix: true,
    requiredExactOnly: true,
    declaredFallbackObservableButIncomplete: true,
    placeholderParityGated: true,
    noScriptGated: true,
    accessibilityMetadataGated: true,
    messageTextExcluded: true,
    summary: baseline.summary
  },
  privacy: baseline.report.privacy,
  permissions: {
    targetRepositoryRead: false,
    targetRepositoryRun: false,
    targetRepositoryWrite: false,
    bpRepositoryModified: false,
    rendererOwnerModified: false,
    portalModified: false,
    actualDomVerified: false,
    translationQualityEvaluated: false,
    sourceBodyRead: false,
    messageTextSerialized: false,
    systemLocaleRead: false,
    browserLocaleRead: false,
    networkAccess: false,
    packageVersionChanged: false,
    dependencyChanged: false,
    packagePublish: false,
    wP124Started: false,
    wP125Started: false
  }
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`W-P123 UI-locale completeness evidence ready: ${baseline.summary.evaluations} evaluations, ${baseline.summary.exact} exact requirements, ${coveredCodes.length} diagnostics, ${HIA_SCHEMA_KEYS.length} schemas.`);

/**
 * @lang zh-CN
 * 创建覆盖 content/UI 分离、interactive/no-script 和三类 message channel 的完整合成输入。
 *
 * @lang en
 * Creates complete synthetic input covering content/UI separation, interactive/no-script, and all three message channels.
 *
 * @returns {Record<string, unknown>} 可独立修改的合成输入。 / Independently mutable synthetic input.
 */
function createInput() {
  return {
    profileId: "docs.default-portal",
    contentLocales: ["zh-CN"],
    uiLocales: ["zh-CN", "en"],
    defaultUiLocale: "zh-CN",
    messages: [
      { messageId: "navigation.home", placeholderNames: [], visibility: "public" },
      { messageId: "navigation.search", placeholderNames: [], visibility: "public" },
      { messageId: "status.results", placeholderNames: ["count"], visibility: "public" }
    ],
    bundles: [
      { bundleId: "bundle.zh-cn", locale: "zh-CN", entries: [
        { messageId: "navigation.home", text: "首页" },
        { messageId: "navigation.search", text: "搜索文档" },
        { messageId: "status.results", text: "找到 {count} 项结果" }
      ] },
      { bundleId: "bundle.en", locale: "en", entries: [
        { messageId: "navigation.home", text: "Home" },
        { messageId: "navigation.search", text: "Search documentation" },
        { messageId: "status.results", text: "Found {count} results" }
      ] }
    ],
    fallbackChains: [
      { uiLocale: "zh-CN", fallbackLocales: [] },
      { uiLocale: "en", fallbackLocales: ["zh-CN"] }
    ],
    surfaces: [{
      surfaceId: "surface.default-portal",
      contentLocale: "zh-CN",
      modes: [
        { mode: "interactive", channels: ["visible-text", "accessible-name", "status-message"] },
        { mode: "no-script", channels: ["visible-text", "accessible-name"] }
      ],
      languageMetadata: [
        { uiLocale: "zh-CN", documentLanguage: "zh-CN", partLanguages: [] },
        { uiLocale: "en", documentLanguage: "zh-CN", partLanguages: ["en"] }
      ]
    }],
    requirements: [
      { requirementId: "req.interactive.home", surfaceId: "surface.default-portal", mode: "interactive", stateId: "default", channel: "visible-text", messageId: "navigation.home" },
      { requirementId: "req.interactive.search", surfaceId: "surface.default-portal", mode: "interactive", stateId: "default", channel: "accessible-name", messageId: "navigation.search" },
      { requirementId: "req.interactive.results", surfaceId: "surface.default-portal", mode: "interactive", stateId: "results", channel: "status-message", messageId: "status.results" },
      { requirementId: "req.noscript.home", surfaceId: "surface.default-portal", mode: "no-script", stateId: "default", channel: "visible-text", messageId: "navigation.home" },
      { requirementId: "req.noscript.search", surfaceId: "surface.default-portal", mode: "no-script", stateId: "default", channel: "accessible-name", messageId: "navigation.search" }
    ]
  };
}

/**
 * @lang zh-CN
 * 运行 input refusal、coverage incomplete 与 report validation 负例，并按冻结词表返回 code。
 *
 * @lang en
 * Runs input refusals, coverage-incomplete cases, and report-validation negatives, returning codes in frozen-vocabulary order.
 *
 * @param {Record<string, unknown>} readyReport <lang><zh-CN>有效 baseline report。</zh-CN><en>Valid baseline report.</en></lang>
 * @returns {string[]} 已观察的稳定 diagnostic code。 / Observed stable diagnostic codes.
 */
function collectDiagnosticCoverage(readyReport) {
  const invalidInput = createInput();
  invalidInput.unknown = true;
  const localeScope = createInput();
  localeScope.defaultUiLocale = "fr";
  const messageIdentity = createInput();
  messageIdentity.messages[0].messageId = "非法";
  const placeholder = createInput();
  placeholder.bundles[1].entries[2].text = "Found {total} results";
  const fallbackPolicy = createInput();
  fallbackPolicy.fallbackChains[1].fallbackLocales = ["en"];
  const requiredFallback = createInput();
  requiredFallback.bundles[1].entries = requiredFallback.bundles[1].entries.filter(({ messageId }) => messageId !== "navigation.home");
  const missing = createInput();
  for (const bundle of missing.bundles) bundle.entries = bundle.entries.filter(({ messageId }) => messageId !== "navigation.search");
  const accessibility = createInput();
  accessibility.surfaces[0].languageMetadata[1].partLanguages = [];
  const noScript = createInput();
  noScript.surfaces[0].modes = noScript.surfaces[0].modes.filter(({ mode }) => mode !== "no-script");
  const privacy = createInput();
  privacy.bundles[0].entries[0].text = "<strong>private</strong>";
  const invalidContract = structuredClone(readyReport);
  invalidContract.renderer = "portal";
  const compatibility = structuredClone(readyReport);
  compatibility.contractVersion = "0.2.0-draft";

  const observed = new Set([
    ...evaluateDocumentationUiLocaleCompleteness(invalidInput).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(localeScope).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(messageIdentity).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(placeholder).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(fallbackPolicy).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(requiredFallback).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(missing).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(accessibility).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(noScript).diagnostics.map(({ code }) => code),
    ...evaluateDocumentationUiLocaleCompleteness(privacy).diagnostics.map(({ code }) => code),
    ...validateDocumentationUiLocaleCompletenessReport(invalidContract).map(({ code }) => code),
    ...validateDocumentationUiLocaleCompletenessReport(compatibility).map(({ code }) => code)
  ]);
  return DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES.filter((code) => observed.has(code));
}

/**
 * @lang zh-CN
 * 比较两个已规范排序的 code array。
 *
 * @lang en
 * Compares two canonically ordered code arrays.
 *
 * @param {string[]} left <lang><zh-CN>左侧 code。</zh-CN><en>Left codes.</en></lang>
 * @param {string[]} right <lang><zh-CN>右侧 code。</zh-CN><en>Right codes.</en></lang>
 * @returns {boolean} 是否精确一致。 / Whether they match exactly.
 */
function equalStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * @lang zh-CN
 * 断言 evidence gate；失败时不写 ready report。
 *
 * @lang en
 * Asserts an evidence gate and writes no ready report on failure.
 *
 * @param {unknown} condition <lang><zh-CN>待判定条件。</zh-CN><en>Condition to evaluate.</en></lang>
 * @param {string} message <lang><zh-CN>稳定错误消息。</zh-CN><en>Stable error message.</en></lang>
 * @returns {asserts condition} 无返回值。 / No return value.
 */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

