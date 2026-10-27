import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES,
  DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA,
  evaluateDocumentationUiLocaleCompleteness,
  validateDocumentationUiLocaleCompletenessReport,
  type DocumentationUiLocaleCompletenessInput,
  type DocumentationUiLocaleCompletenessReport
} from "./documentation-ui-locale-completeness.js";

/**
 * @lang zh-CN
 * 创建完全覆盖中英文 UI chrome 的内存 fixture；正文语言固定为中文，用于证明两类 locale 不发生隐式继承。
 *
 * @lang en
 * Creates an in-memory fixture with complete Chinese and English UI chrome; content remains Chinese to prove the locale scopes do not inherit implicitly.
 *
 * @returns 可独立修改的完整性输入。 / Independently mutable completeness input.
 */
function createInput(): DocumentationUiLocaleCompletenessInput {
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
      {
        bundleId: "bundle.zh-cn",
        locale: "zh-CN",
        entries: [
          { messageId: "navigation.home", text: "首页" },
          { messageId: "navigation.search", text: "搜索文档" },
          { messageId: "status.results", text: "找到 {count} 项结果" }
        ]
      },
      {
        bundleId: "bundle.en",
        locale: "en",
        entries: [
          { messageId: "navigation.home", text: "Home" },
          { messageId: "navigation.search", text: "Search documentation" },
          { messageId: "status.results", text: "Found {count} results" }
        ]
      }
    ],
    fallbackChains: [
      { uiLocale: "zh-CN", fallbackLocales: [] },
      { uiLocale: "en", fallbackLocales: ["zh-CN"] }
    ],
    surfaces: [
      {
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
      }
    ],
    requirements: [
      { requirementId: "req.interactive.home", surfaceId: "surface.default-portal", mode: "interactive", stateId: "default", channel: "visible-text", messageId: "navigation.home" },
      { requirementId: "req.interactive.search", surfaceId: "surface.default-portal", mode: "interactive", stateId: "default", channel: "accessible-name", messageId: "navigation.search" },
      { requirementId: "req.interactive.results", surfaceId: "surface.default-portal", mode: "interactive", stateId: "results", channel: "status-message", messageId: "status.results" },
      { requirementId: "req.noscript.home", surfaceId: "surface.default-portal", mode: "no-script", stateId: "default", channel: "visible-text", messageId: "navigation.home" },
      { requirementId: "req.noscript.search", surfaceId: "surface.default-portal", mode: "no-script", stateId: "default", channel: "accessible-name", messageId: "navigation.search" }
    ]
  };
}

describe("documentation-ui-locale-completeness", () => {
  it("publishes an exact closed-world neutral contract", () => {
    expect(DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT).toBe("documentation-ui-locale-completeness");
    expect(DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION).toBe("0.1.0-draft");
    expect(DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(DOCUMENTATION_UI_LOCALE_COMPLETENESS_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(DOCUMENTATION_UI_LOCALE_COMPLETENESS_DIAGNOSTIC_CODES).toEqual([
      "ULC_INVALID_INPUT",
      "ULC_INVALID_CONTRACT",
      "ULC_LOCALE_SCOPE_INVALID",
      "ULC_MESSAGE_IDENTITY_INVALID",
      "ULC_PLACEHOLDER_MISMATCH",
      "ULC_FALLBACK_UNDECLARED",
      "ULC_REQUIRED_MESSAGE_FALLBACK",
      "ULC_MESSAGE_MISSING",
      "ULC_ACCESSIBILITY_INCOMPLETE",
      "ULC_NO_SCRIPT_INCOMPLETE",
      "ULC_PRIVACY_BOUNDARY",
      "ULC_COMPATIBILITY_UNSUPPORTED"
    ]);
  });

  it("passes every surface, mode, and UI locale without inheriting the content locale", () => {
    const result = evaluateDocumentationUiLocaleCompleteness(createInput());

    expect(result.status).toBe("complete");
    expect(result.diagnostics).toEqual([]);
    expect(result.summary).toEqual({
      surfaces: 1,
      uiLocales: 2,
      evaluations: 4,
      requirements: 5,
      exact: 10,
      fallback: 0,
      missing: 0,
      placeholderMismatch: 0
    });
    expect(result.report?.evaluations.find(({ uiLocale, mode }) => uiLocale === "en" && mode === "interactive")).toMatchObject({
      contentLocale: "zh-CN",
      uiLocale: "en",
      documentLanguage: "zh-CN",
      partLanguages: ["en"],
      status: "complete"
    });
    expect(result.report?.localeScope).toMatchObject({
      uiSelection: "caller-explicit",
      contentAndUiIndependent: true,
      inferFromContentLocale: false,
      inferFromSystemLocale: false
    });
    expect(validateDocumentationUiLocaleCompletenessReport(result.report)).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.report?.evaluations)).toBe(true);
  });

  it("is byte-stable across non-semantic input ordering", () => {
    const reference = evaluateDocumentationUiLocaleCompleteness(createInput());
    const shuffled = createInput();
    shuffled.messages.reverse();
    shuffled.bundles.reverse();
    shuffled.fallbackChains.reverse();
    shuffled.surfaces.reverse();
    shuffled.requirements.reverse();
    for (const bundle of shuffled.bundles) bundle.entries.reverse();

    const candidate = evaluateDocumentationUiLocaleCompleteness(shuffled);
    expect(candidate.reportJson).toBe(reference.reportJson);
  });

  it("observes declared fallback but refuses to count it as required-message completeness", () => {
    const input = createInput();
    input.bundles.find(({ locale }) => locale === "en")!.entries = input.bundles
      .find(({ locale }) => locale === "en")!.entries.filter(({ messageId }) => messageId !== "navigation.home");

    const result = evaluateDocumentationUiLocaleCompleteness(input);
    expect(result.status).toBe("incomplete");
    expect(result.diagnostics.map(({ code }) => code)).toContain("ULC_REQUIRED_MESSAGE_FALLBACK");
    expect(result.report?.evaluations.flatMap(({ results }) => results).find(({ messageId, resolution }) =>
      messageId === "navigation.home" && resolution === "declared-fallback"
    )?.resolvedLocale).toBe("zh-CN");
    expect(validateDocumentationUiLocaleCompletenessReport(result.report)).toEqual([]);
  });

  it("distinguishes missing messages and placeholder drift", () => {
    const missing = createInput();
    for (const bundle of missing.bundles) {
      bundle.entries = bundle.entries.filter(({ messageId }) => messageId !== "navigation.search");
    }
    const missingResult = evaluateDocumentationUiLocaleCompleteness(missing);
    expect(missingResult.diagnostics.map(({ code }) => code)).toContain("ULC_MESSAGE_MISSING");
    expect(validateDocumentationUiLocaleCompletenessReport(missingResult.report)).toEqual([]);

    const placeholder = createInput();
    placeholder.bundles.find(({ locale }) => locale === "en")!.entries.find(({ messageId }) => messageId === "status.results")!.text = "Found {total} results";
    const placeholderResult = evaluateDocumentationUiLocaleCompleteness(placeholder);
    expect(placeholderResult.status).toBe("incomplete");
    expect(placeholderResult.diagnostics.map(({ code }) => code)).toContain("ULC_PLACEHOLDER_MISMATCH");
    expect(validateDocumentationUiLocaleCompletenessReport(placeholderResult.report)).toEqual([]);
  });

  it("gates no-script coverage, accessibility channels, and language metadata", () => {
    const noScript = createInput();
    noScript.surfaces[0]!.modes = noScript.surfaces[0]!.modes.filter(({ mode }) => mode !== "no-script");
    const noScriptResult = evaluateDocumentationUiLocaleCompleteness(noScript);
    expect(noScriptResult.diagnostics.map(({ code }) => code)).toContain("ULC_NO_SCRIPT_INCOMPLETE");
    expect(validateDocumentationUiLocaleCompletenessReport(noScriptResult.report)).toEqual([]);

    const accessibleName = createInput();
    accessibleName.surfaces[0]!.modes[0]!.channels = accessibleName.surfaces[0]!.modes[0]!.channels.filter((channel) => channel !== "accessible-name");
    const accessibleNameResult = evaluateDocumentationUiLocaleCompleteness(accessibleName);
    expect(accessibleNameResult.diagnostics.map(({ code }) => code)).toContain("ULC_ACCESSIBILITY_INCOMPLETE");
    expect(validateDocumentationUiLocaleCompletenessReport(accessibleNameResult.report)).toEqual([]);

    const language = createInput();
    language.surfaces[0]!.languageMetadata.find(({ uiLocale }) => uiLocale === "en")!.partLanguages = [];
    const languageResult = evaluateDocumentationUiLocaleCompleteness(language);
    expect(languageResult.diagnostics.map(({ code }) => code)).toContain("ULC_ACCESSIBILITY_INCOMPLETE");
    expect(validateDocumentationUiLocaleCompletenessReport(languageResult.report)).toEqual([]);
  });

  it("marks a requirement on an undeclared mode channel incomplete", () => {
    const input = createInput();
    input.requirements.push({
      requirementId: "req.noscript.unlistedstatus",
      surfaceId: "surface.default-portal",
      mode: "no-script",
      stateId: "results",
      channel: "status-message",
      messageId: "status.results"
    });

    const result = evaluateDocumentationUiLocaleCompleteness(input);
    expect(result.status).toBe("incomplete");
    expect(result.diagnostics.map(({ code }) => code)).toContain("ULC_MESSAGE_MISSING");
    expect(result.report?.evaluations.filter(({ mode }) => mode === "no-script").every(({ status }) => status === "incomplete")).toBe(true);
    expect(validateDocumentationUiLocaleCompletenessReport(result.report)).toEqual([]);
  });

  it("rejects an acyclic-looking first fallback edge when another edge closes a cycle", () => {
    const input = createInput();
    input.uiLocales.push("fr");
    input.bundles.push({
      bundleId: "bundle.fr",
      locale: "fr",
      entries: input.bundles.find(({ locale }) => locale === "en")!.entries.map((entry) => ({ ...entry }))
    });
    input.fallbackChains.find(({ uiLocale }) => uiLocale === "en")!.fallbackLocales = ["zh-CN", "fr"];
    input.fallbackChains.push({ uiLocale: "fr", fallbackLocales: ["en"] });
    input.surfaces[0]!.languageMetadata.push({ uiLocale: "fr", documentLanguage: "zh-CN", partLanguages: ["fr"] });

    const result = evaluateDocumentationUiLocaleCompleteness(input);
    expect(result.status).toBe("refused");
    expect(result.diagnostics.map(({ code }) => code)).toEqual(["ULC_FALLBACK_UNDECLARED"]);

    input.fallbackChains.find(({ uiLocale }) => uiLocale === "fr")!.fallbackLocales = [];
    const acyclic = evaluateDocumentationUiLocaleCompleteness(input);
    expect(acyclic.status).toBe("complete");
    expect(validateDocumentationUiLocaleCompletenessReport(acyclic.report)).toEqual([]);
  });

  it("rejects invalid locale scope, message identity, fallback policy, and non-plain public messages", () => {
    const locale = createInput();
    locale.defaultUiLocale = "fr";
    expect(evaluateDocumentationUiLocaleCompleteness(locale).diagnostics.map(({ code }) => code)).toEqual(["ULC_LOCALE_SCOPE_INVALID"]);

    const identity = createInput();
    identity.messages[0]!.messageId = "首页";
    expect(evaluateDocumentationUiLocaleCompleteness(identity).diagnostics.map(({ code }) => code)).toEqual(["ULC_MESSAGE_IDENTITY_INVALID"]);

    const fallback = createInput();
    fallback.fallbackChains.find(({ uiLocale }) => uiLocale === "en")!.fallbackLocales = ["en"];
    expect(evaluateDocumentationUiLocaleCompleteness(fallback).diagnostics.map(({ code }) => code)).toEqual(["ULC_FALLBACK_UNDECLARED"]);

    const privacy = createInput();
    privacy.bundles[0]!.entries[0]!.text = "<script>secret-marker</script>";
    const privacyResult = evaluateDocumentationUiLocaleCompleteness(privacy);
    expect(privacyResult.status).toBe("refused");
    expect(privacyResult.diagnostics.map(({ code }) => code)).toEqual(["ULC_PRIVACY_BOUNDARY"]);
    expect(JSON.stringify(privacyResult)).not.toContain("secret-marker");
  });

  it("validates unknown fields, invariants, privacy, and compatibility", () => {
    const ready = evaluateDocumentationUiLocaleCompleteness(createInput()).report!;
    const unknown = structuredClone(ready) as DocumentationUiLocaleCompletenessReport & { renderer?: string };
    unknown.renderer = "portal";
    expect(validateDocumentationUiLocaleCompletenessReport(unknown).map(({ code }) => code)).toContain("ULC_INVALID_CONTRACT");

    const invariant = structuredClone(ready);
    invariant.evaluations[0]!.summary.exact += 1;
    expect(validateDocumentationUiLocaleCompletenessReport(invariant).map(({ code }) => code)).toContain("ULC_INVALID_CONTRACT");

    const privacy = structuredClone(ready);
    privacy.privacy.messageTextIncluded = true as false;
    expect(validateDocumentationUiLocaleCompletenessReport(privacy).map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");

    const compatibility = structuredClone(ready);
    compatibility.contractVersion = "0.2.0-draft" as "0.1.0-draft";
    expect(validateDocumentationUiLocaleCompletenessReport(compatibility).map(({ code }) => code)).toContain("ULC_COMPATIBILITY_UNSUPPORTED");
  });

  it("rejects diagnostic body and path text that cannot come from fixed public-safe findings", () => {
    // <lang><zh-CN>先由真实缺译生成有效 incomplete 报告，使篡改只作用于诊断边界。</zh-CN><en>Start with a valid incomplete report from a real missing translation so only the diagnostic boundary changes.</en></lang>
    const input = createInput();
    input.bundles.find(({ locale }) => locale === "en")!.entries = input.bundles
      .find(({ locale }) => locale === "en")!.entries.filter(({ messageId }) => messageId !== "navigation.home");
    const reference = evaluateDocumentationUiLocaleCompleteness(input).report!;
    expect(reference.status).toBe("incomplete");
    expect(validateDocumentationUiLocaleCompletenessReport(reference)).toEqual([]);

    // <lang><zh-CN>报告虽只含元数据，任意诊断正文或路径仍会把调用方私密文本带入 wire。</zh-CN><en>A metadata-only report can still carry caller secrets through arbitrary diagnostic prose or paths.</en></lang>
    const privateMessage = structuredClone(reference);
    privateMessage.diagnostics[0]!.message = "credential=secret-marker";
    const messageFindings = validateDocumentationUiLocaleCompletenessReport(privateMessage);
    expect(messageFindings.map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");
    expect(JSON.stringify(messageFindings)).not.toContain("secret-marker");

    // <lang><zh-CN>词表中的正文也必须和原诊断码配对，不能拿另一种固定消息伪装。</zh-CN><en>Even known prose must match its diagnostic code; a different fixed finding cannot be substituted.</en></lang>
    const mismatchedMessage = structuredClone(reference);
    mismatchedMessage.diagnostics[0]!.message = "A localized UI message does not preserve the declared placeholder set.";
    expect(validateDocumentationUiLocaleCompletenessReport(mismatchedMessage).map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");

    const privatePath = structuredClone(reference);
    privatePath.diagnostics[0]!.path = "C:/private/secret-marker";
    const pathFindings = validateDocumentationUiLocaleCompletenessReport(privatePath);
    expect(pathFindings.map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");
    expect(JSON.stringify(pathFindings)).not.toContain("secret-marker");

    const absentPath = structuredClone(reference);
    delete absentPath.diagnostics[0]!.path;
    expect(validateDocumentationUiLocaleCompletenessReport(absentPath).map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");
  });

  it("anchors fixed diagnostic paths to actual surface, requirement, and evaluation identities", () => {
    // <lang><zh-CN>合法的结构路径形状仍可能藏入报告中不存在的身份；逐类从真实 incomplete 输出改写一项验证。</zh-CN><en>A structurally valid path can still carry an identity absent from the report; mutate one real incomplete finding per path family.</en></lang>
    const missingAccessibleName = createInput();
    missingAccessibleName.surfaces[0]!.modes[0]!.channels = ["visible-text", "status-message"];
    const surfaceReport = structuredClone(evaluateDocumentationUiLocaleCompleteness(missingAccessibleName).report!);
    expect(validateDocumentationUiLocaleCompletenessReport(surfaceReport)).toEqual([]);
    surfaceReport.diagnostics.find(({ code }) => code === "ULC_ACCESSIBILITY_INCOMPLETE")!.path = "surfaces.secret-marker.modes.interactive";
    const surfaceFindings = validateDocumentationUiLocaleCompletenessReport(surfaceReport);
    expect(surfaceFindings.map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");
    expect(JSON.stringify(surfaceFindings)).not.toContain("secret-marker");

    const undeclaredChannel = createInput();
    undeclaredChannel.requirements.push({
      requirementId: "req.noscript.unlistedstatus", surfaceId: "surface.default-portal", mode: "no-script",
      stateId: "results", channel: "status-message", messageId: "status.results"
    });
    const requirementReport = structuredClone(evaluateDocumentationUiLocaleCompleteness(undeclaredChannel).report!);
    expect(validateDocumentationUiLocaleCompletenessReport(requirementReport)).toEqual([]);
    requirementReport.diagnostics.find(({ message }) => message === "A required UI message uses a channel absent from its surface mode.")!.path = "requirements.secret-marker.channel";
    const requirementFindings = validateDocumentationUiLocaleCompletenessReport(requirementReport);
    expect(requirementFindings.map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");
    expect(JSON.stringify(requirementFindings)).not.toContain("secret-marker");

    const missingExact = createInput();
    missingExact.bundles.find(({ locale }) => locale === "en")!.entries = missingExact.bundles
      .find(({ locale }) => locale === "en")!.entries.filter(({ messageId }) => messageId !== "navigation.home");
    const evaluationReport = structuredClone(evaluateDocumentationUiLocaleCompleteness(missingExact).report!);
    expect(validateDocumentationUiLocaleCompletenessReport(evaluationReport)).toEqual([]);
    evaluationReport.diagnostics[0]!.path = "evaluations.surface.default-portal.interactive.en.req.secret-marker";
    const evaluationFindings = validateDocumentationUiLocaleCompletenessReport(evaluationReport);
    expect(evaluationFindings.map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");
    expect(JSON.stringify(evaluationFindings)).not.toContain("secret-marker");

    // <lang><zh-CN>另一个真实 surface 路径也不能替代缺译的 evaluation 路径；诊断家族必须与来源事实配对。</zh-CN><en>Even a real surface path cannot replace a missing-message evaluation path; each diagnostic family must match its source fact.</en></lang>
    const wrongFamily = structuredClone(evaluateDocumentationUiLocaleCompleteness(missingExact).report!);
    wrongFamily.diagnostics[0]!.path = "surfaces.surface.default-portal.modes.interactive";
    expect(validateDocumentationUiLocaleCompletenessReport(wrongFamily).map(({ code }) => code)).toContain("ULC_PRIVACY_BOUNDARY");
  });

  it("refuses before producing a report whose distinct diagnostics exceed the schema budget", () => {
    // <lang><zh-CN>4,001 个缺失消息 requirement 跨 26 个 UI locale 会产生 104,026 条不同结构路径，超过 100,000 条诊断上限。</zh-CN><en>4,001 missing-message requirements across 26 UI locales create 104,026 distinct structural paths, above the 100,000-diagnostic cap.</en></lang>
    const input = createInput();
    const uiLocales = Array.from({ length: 26 }, (_, index) => `en-x${index}`);
    input.uiLocales = uiLocales;
    input.defaultUiLocale = uiLocales[0]!;
    input.bundles = uiLocales.map((locale, index) => ({
      bundleId: `bundle.l${index}`, locale,
      entries: [
        { messageId: "navigation.home", text: "Home" },
        { messageId: "navigation.search", text: "Search" }
      ]
    }));
    input.fallbackChains = uiLocales.map((uiLocale) => ({ uiLocale, fallbackLocales: [] }));
    input.surfaces[0]!.languageMetadata = uiLocales.map((uiLocale) => ({
      uiLocale, documentLanguage: uiLocale, partLanguages: ["zh-CN"]
    }));
    for (let index = 0; index < 4000; index += 1) {
      input.requirements.push({
        requirementId: `req.interactive.bulk.n${index}`, surfaceId: "surface.default-portal",
        mode: "interactive", stateId: "results", channel: "status-message", messageId: "status.results"
      });
    }

    const result = evaluateDocumentationUiLocaleCompleteness(input);
    expect(result.status).toBe("refused");
    expect(result.report).toBeUndefined();
    expect(result.reportJson).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toEqual(["ULC_INVALID_INPUT"]);
  }, 120000);

  it("refuses an otherwise valid input before expanding more evaluations than the schema permits", () => {
    // <lang><zh-CN>51 个 surface × 两种 mode × 1,000 个 UI locale 会产出 102,000 条 evaluation，超出既有 100,000 上限。</zh-CN><en>51 surfaces × two modes × 1,000 UI locales would emit 102,000 evaluations, exceeding the existing 100,000 limit.</en></lang>
    const input = createInput();
    const uiLocales = Array.from({ length: 1000 }, (_, index) => `en-x${index}`);
    input.uiLocales = uiLocales;
    input.defaultUiLocale = uiLocales[0]!;
    input.bundles = uiLocales.map((locale, index) => ({
      bundleId: `bundle.l${index}`, locale,
      entries: [
        { messageId: "navigation.home", text: "Home" },
        { messageId: "navigation.search", text: "Search" },
        { messageId: "status.results", text: "Found {count} results" }
      ]
    }));
    input.fallbackChains = uiLocales.map((uiLocale) => ({ uiLocale, fallbackLocales: [] }));
    input.surfaces = Array.from({ length: 51 }, (_, index) => ({
      surfaceId: `surface.s${index}`, contentLocale: "zh-CN",
      modes: [
        { mode: "interactive", channels: ["visible-text", "accessible-name", "status-message"] },
        { mode: "no-script", channels: ["visible-text", "accessible-name"] }
      ],
      languageMetadata: []
    }));
    input.requirements = input.requirements.map((requirement) => ({ ...requirement, surfaceId: "surface.s0" }));

    const result = evaluateDocumentationUiLocaleCompleteness(input);
    expect(result.status).toBe("refused");
    expect(result.report).toBeUndefined();
    expect(result.reportJson).toBeUndefined();
    expect(result.diagnostics.map(({ code }) => code)).toEqual(["ULC_INVALID_INPUT"]);
  }, 120000);

  it("applies the distributed schema's nested result and diagnostic limits before report parity", () => {
    // <lang><zh-CN>在已有合法 incomplete 报告上扩大集合，避免版本、来源或完整性差异遮盖长度边界。</zh-CN><en>Expand collections on an otherwise valid incomplete report so version, provenance and completeness do not mask the length boundary.</en></lang>
    const input = createInput();
    input.bundles.find(({ locale }) => locale === "en")!.entries = input.bundles
      .find(({ locale }) => locale === "en")!.entries.filter(({ messageId }) => messageId !== "navigation.home");
    const reference = evaluateDocumentationUiLocaleCompleteness(input).report!;
    expect(validateDocumentationUiLocaleCompletenessReport(reference)).toEqual([]);

    // <lang><zh-CN>Schema 最多允许每次 evaluation 50,000 个结果；超限应在引用核对前按 shape 拒绝。</zh-CN><en>The schema allows at most 50,000 results per evaluation; an excess must fail shape validation before reference parity.</en></lang>
    const oversizedResults = structuredClone(reference);
    oversizedResults.evaluations[0]!.results = Array(50001).fill(oversizedResults.evaluations[0]!.results[0]!);
    expect(validateDocumentationUiLocaleCompletenessReport(oversizedResults).map(({ message }) => message)).toEqual([
      "UI-locale completeness report must match the closed-world contract shape."
    ]);

    // <lang><zh-CN>Schema 最多允许 100,000 条诊断；重复合法诊断不能绕过总量上限。</zh-CN><en>The schema caps diagnostics at 100,000; repeating a valid diagnostic must not bypass that ceiling.</en></lang>
    const oversizedDiagnostics = structuredClone(reference);
    oversizedDiagnostics.diagnostics = Array(100001).fill(oversizedDiagnostics.diagnostics[0]!);
    expect(validateDocumentationUiLocaleCompletenessReport(oversizedDiagnostics).map(({ message }) => message)).toEqual([
      "UI-locale completeness report must match the closed-world contract shape."
    ]);
  });

  it("rejects exact results without the target locale and bundle inventory facts", () => {
    const ready = evaluateDocumentationUiLocaleCompleteness(createInput()).report!;
    const wrongLocale = structuredClone(ready);
    const englishEvaluation = wrongLocale.evaluations.find(({ uiLocale, mode }) => uiLocale === "en" && mode === "interactive")!;
    englishEvaluation.results.find(({ messageId }) => messageId === "navigation.home")!.resolvedLocale = "fr";
    expect(validateDocumentationUiLocaleCompletenessReport(wrongLocale).map(({ code }) => code)).toContain("ULC_INVALID_CONTRACT");

    const absentInventory = structuredClone(ready);
    absentInventory.bundles.find(({ locale }) => locale === "en")!.messageIds = absentInventory.bundles
      .find(({ locale }) => locale === "en")!.messageIds.filter((messageId) => messageId !== "navigation.home");
    expect(validateDocumentationUiLocaleCompletenessReport(absentInventory).map(({ code }) => code)).toContain("ULC_INVALID_CONTRACT");
  });

  it("validates a bounded inventory with many repeated exact requirements", () => {
    const input = createInput();
    for (let index = 0; index < 4096; index += 1) {
      const messageId = `padding.m${index}`;
      input.messages.push({ messageId, placeholderNames: [], visibility: "public" });
      for (const bundle of input.bundles) bundle.entries.push({ messageId, text: "Public fixture text" });
    }
    for (let index = 0; index < 2048; index += 1) {
      input.requirements.push({
        requirementId: `req.interactive.bulk.n${index}`,
        surfaceId: "surface.default-portal",
        mode: "interactive",
        stateId: "results",
        channel: "status-message",
        messageId: "status.results"
      });
    }

    const result = evaluateDocumentationUiLocaleCompleteness(input);
    expect(result.status).toBe("complete");
    expect(result.report?.bundles.every(({ messageIds }) => messageIds.length === 4099)).toBe(true);
    expect(result.summary?.exact).toBe(4106);
    expect(validateDocumentationUiLocaleCompletenessReport(result.report)).toEqual([]);
  });

  it("never serializes localized message text into the public report", () => {
    const input = createInput();
    input.bundles[0]!.entries[0]!.text = "private-looking-but-public-fixture-marker";
    const result = evaluateDocumentationUiLocaleCompleteness(input);

    expect(result.status).toBe("complete");
    expect(result.reportJson).not.toContain("private-looking-but-public-fixture-marker");
    expect(result.report?.privacy.messageTextIncluded).toBe(false);
  });
});
