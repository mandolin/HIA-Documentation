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
  });

  it("distinguishes missing messages and placeholder drift", () => {
    const missing = createInput();
    for (const bundle of missing.bundles) {
      bundle.entries = bundle.entries.filter(({ messageId }) => messageId !== "navigation.search");
    }
    expect(evaluateDocumentationUiLocaleCompleteness(missing).diagnostics.map(({ code }) => code)).toContain("ULC_MESSAGE_MISSING");

    const placeholder = createInput();
    placeholder.bundles.find(({ locale }) => locale === "en")!.entries.find(({ messageId }) => messageId === "status.results")!.text = "Found {total} results";
    const placeholderResult = evaluateDocumentationUiLocaleCompleteness(placeholder);
    expect(placeholderResult.status).toBe("incomplete");
    expect(placeholderResult.diagnostics.map(({ code }) => code)).toContain("ULC_PLACEHOLDER_MISMATCH");
  });

  it("gates no-script coverage, accessibility channels, and language metadata", () => {
    const noScript = createInput();
    noScript.surfaces[0]!.modes = noScript.surfaces[0]!.modes.filter(({ mode }) => mode !== "no-script");
    expect(evaluateDocumentationUiLocaleCompleteness(noScript).diagnostics.map(({ code }) => code)).toContain("ULC_NO_SCRIPT_INCOMPLETE");

    const accessibleName = createInput();
    accessibleName.surfaces[0]!.modes[0]!.channels = accessibleName.surfaces[0]!.modes[0]!.channels.filter((channel) => channel !== "accessible-name");
    expect(evaluateDocumentationUiLocaleCompleteness(accessibleName).diagnostics.map(({ code }) => code)).toContain("ULC_ACCESSIBILITY_INCOMPLETE");

    const language = createInput();
    language.surfaces[0]!.languageMetadata.find(({ uiLocale }) => uiLocale === "en")!.partLanguages = [];
    expect(evaluateDocumentationUiLocaleCompleteness(language).diagnostics.map(({ code }) => code)).toContain("ULC_ACCESSIBILITY_INCOMPLETE");
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

  it("never serializes localized message text into the public report", () => {
    const input = createInput();
    input.bundles[0]!.entries[0]!.text = "private-looking-but-public-fixture-marker";
    const result = evaluateDocumentationUiLocaleCompleteness(input);

    expect(result.status).toBe("complete");
    expect(result.reportJson).not.toContain("private-looking-but-public-fixture-marker");
    expect(result.report?.privacy.messageTextIncluded).toBe(false);
  });
});
