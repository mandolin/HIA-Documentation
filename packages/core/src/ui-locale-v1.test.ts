/**
 * @file
 * @lang zh-CN 已确认界面语言1.0.0的精确身份、真实输入重建、总预算和缺元数据回归。
 * @lang en Regressions for the confirmed UI-locale 1.0.0 exact identity, input-based rebuilding, total budget and missing metadata.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as locale from "./documentation-ui-locale-completeness.js";

// <lang><zh-CN>精确旧报告和原字节固定；新输入由合成消息正文提供，不能把旧报告本身当正文证据。</zh-CN><en>Pin the exact legacy report bytes; synthetic message bodies supply new input rather than treating the old report as body evidence.</en></lang>
const legacyBytes = readFileSync(new URL("../../../fixtures/contract-history/documentation-ui-locale-completeness.json", import.meta.url));
const legacy = JSON.parse(legacyBytes.toString("utf8"));

/**
 * @lang zh-CN 从固定旧声明建立独立合成消息输入；正文只用于本测试，不声称恢复历史译文。
 * @lang en Builds independent synthetic message input from fixed legacy declarations; bodies are test-only and do not claim to recover historical translations.
 * @returns 可修改的完整输入。 / Mutable complete input.
 */
function input(): locale.DocumentationUiLocaleCompletenessInput {
  return structuredClone({ profileId: legacy.profileId, contentLocales: legacy.localeScope.contentLocales,
    uiLocales: legacy.localeScope.uiLocales, defaultUiLocale: legacy.localeScope.defaultUiLocale,
    messages: legacy.messages, surfaces: legacy.surfaces, requirements: legacy.requirements,
    fallbackChains: legacy.fallbackPolicy.chains,
    bundles: legacy.bundles.map((bundle: locale.DocumentationUiLocaleBundleInventory) => ({ bundleId: bundle.bundleId, locale: bundle.locale,
      entries: bundle.messageIds.map((messageId) => ({ messageId, text: `public-marker ${legacy.messages.find((message: locale.DocumentationUiLocaleMessageDefinition) => message.messageId === messageId).placeholderNames.map((name: string) => `{${name}}`).join(" ")}` })) })),
  });
}

describe("UI locale 1.0.0 coordinated migration", () => {
  it("writes the new exact identity and reads the unchanged legacy fixture", () => {
    expect(locale.DOCUMENTATION_UI_LOCALE_COMPLETENESS_CONTRACT_VERSION).toBe("1.0.0");
    expect(locale.evaluateDocumentationUiLocaleCompleteness(input()).report?.contractVersion).toBe("1.0.0");
    expect(locale.validateDocumentationUiLocaleCompletenessReport(legacy)).toEqual([]);
    expect(createHash("sha256").update(legacyBytes).digest("hex")).toBe("a386c044c7dff041d6f6592d48af5ce01177b2141ff50df374eb35cdf1aed157");
    for (const version of ["1.0.1", "1.1.0", "1.0.0-beta", "0.2.0-draft"]) {
      expect(locale.validateDocumentationUiLocaleCompletenessReport({ ...legacy, contractVersion: version })[0]?.code).toBe("ULC_COMPATIBILITY_UNSUPPORTED");
    }
  });

  it.each([0, 1])("round-trips incomplete metadata subset length %s", (count) => {
    const source = input();
    source.surfaces[0]!.languageMetadata = source.surfaces[0]!.languageMetadata.slice(0, count);
    const result = locale.evaluateDocumentationUiLocaleCompleteness(source);
    expect(result.status).toBe("incomplete");
    expect(locale.validateDocumentationUiLocaleCompletenessReport(result.report)).toEqual([]);
    expect(result.diagnostics.some(({ code }) => code === "ULC_ACCESSIBILITY_INCOMPLETE")).toBe(true);
    const forged = structuredClone(result.report!);
    forged.evaluations.forEach((evaluation) => { evaluation.status = "complete"; });
    expect(locale.validateDocumentationUiLocaleCompletenessReport(forged).length).toBeGreaterThan(0);
  });

  it("rebuilds from source input, refuses missing input and mismatched declarations, and exposes body drift", () => {
    const migrate = (locale as unknown as { migrateDocumentationUiLocaleCompletenessReport: (value: unknown) => locale.DocumentationUiLocaleCompletenessResult }).migrateDocumentationUiLocaleCompletenessReport;
    const source = input();
    const before = JSON.stringify({ legacy, source });
    expect(migrate({ legacyReport: legacy }).status).toBe("refused");
    expect(migrate({ legacyReport: legacy, sourceInput: source })).toMatchObject({ status: "complete", report: { contractVersion: "1.0.0" } });
    const changed = structuredClone(source);
    changed.profileId = "other.profile";
    expect(migrate({ legacyReport: legacy, sourceInput: changed }).status).toBe("refused");
    changed.profileId = source.profileId;
    changed.bundles[0]!.entries.find(({ messageId }) => messageId === "status.results")!.text = "public-marker missing placeholder";
    const drift = migrate({ legacyReport: legacy, sourceInput: changed });
    expect(drift.status).toBe("incomplete");
    expect(locale.validateDocumentationUiLocaleCompletenessReport(drift.report)).toEqual([]);
    expect(drift.reportJson).not.toContain("public-marker");
    expect(Object.isFrozen(drift.report)).toBe(true);
    expect(JSON.stringify({ legacy, source })).toBe(before);
    expect(migrate({ legacyReport: { ...legacy, contractVersion: "1.0.0" }, sourceInput: source }).status).toBe("refused");
  });

  it("refuses a total result overflow before traversing result values", () => {
    const report = structuredClone(legacy);
    report.contractVersion = "1.0.0";
    let reads = 0;
    report.evaluations = Array.from({ length: 3 }, () => ({ results: Array(40000).fill({}) }));
    Object.defineProperty(report.evaluations[0].results[0], "requirementId", { enumerable: true, get() { reads += 1; throw new Error("must-not-run"); } });
    expect(() => locale.validateDocumentationUiLocaleCompletenessReport(report)).not.toThrow();
    expect(locale.validateDocumentationUiLocaleCompletenessReport(report)[0]?.code).toBe("ULC_INVALID_CONTRACT");
    expect(reads).toBe(0);
  });

  it("refuses duplicate or unknown metadata and ordinary accessor hooks without execution", () => {
    for (const extra of [{ ...input().surfaces[0]!.languageMetadata[0]! }, { uiLocale: "fr", documentLanguage: "fr", partLanguages: [] }]) {
      const source = input();
      source.surfaces[0]!.languageMetadata.push(extra);
      expect(locale.evaluateDocumentationUiLocaleCompleteness(source).status).toBe("refused");
    }
    let reads = 0;
    const source = input();
    Object.defineProperty(source, "profileId", { enumerable: true, get() { reads += 1; throw new Error("must-not-run"); } });
    expect(locale.evaluateDocumentationUiLocaleCompleteness(source).status).toBe("refused");
    const migrate = locale.migrateDocumentationUiLocaleCompletenessReport;
    expect(migrate({ legacyReport: legacy, sourceInput: source }).status).toBe("refused");
    expect(reads).toBe(0);
    const forged = structuredClone(locale.evaluateDocumentationUiLocaleCompleteness(input()).report!);
    forged.surfaces[0]!.languageMetadata.pop();
    expect(locale.validateDocumentationUiLocaleCompletenessReport(forged).length).toBeGreaterThan(0);
  });

  it("rejects hidden known-field subgraphs without invoking nested accessors", () => {
    let reads = 0;
    const metadata = { uiLocale: "en", partLanguages: [], get documentLanguage() { reads += 1; throw new Error("hidden-must-not-run"); } };
    const source = input();
    Object.defineProperty(source.surfaces[0]!, "languageMetadata", { enumerable: false, value: [metadata] });
    expect(() => locale.evaluateDocumentationUiLocaleCompleteness(source)).not.toThrow();
    expect(locale.evaluateDocumentationUiLocaleCompleteness(source).status).toBe("refused");
    const report = structuredClone(locale.evaluateDocumentationUiLocaleCompleteness(input()).report!);
    Object.defineProperty(report.evaluations[0]!.results[0]!, "requirementId", { enumerable: true, get() { reads += 1; throw new Error("hidden-must-not-run"); } });
    Object.defineProperty(report, "evaluations", { enumerable: false, value: report.evaluations });
    expect(() => locale.validateDocumentationUiLocaleCompletenessReport(report)).not.toThrow();
    expect(locale.validateDocumentationUiLocaleCompletenessReport(report).length).toBeGreaterThan(0);
    expect(reads).toBe(0);
  });

  it("accepts exactly 100,000 total results and refuses one extra requirement before expansion", () => {
    const source = input();
    // <lang><zh-CN>两语言各两模式只展开五万要求，共十万结果；不运行理论五千万对象输入。</zh-CN><en>Two locales and two modes expand fifty thousand requirements to one hundred thousand results; never run the theoretical fifty-million-object input.</en></lang>
    source.requirements = Array.from({ length: 50000 }, (_, index) => ({ ...source.requirements[index % 2]!, requirementId: `req.item-${index}`, mode: index % 2 ? "no-script" as const : "interactive" as const }));
    const boundary = locale.evaluateDocumentationUiLocaleCompleteness(source);
    expect(boundary.status).not.toBe("refused");
    expect(boundary.report!.evaluations.reduce((total, item) => total + item.results.length, 0)).toBe(100000);
    expect(locale.validateDocumentationUiLocaleCompletenessReport(boundary.report)).toEqual([]);
    source.uiLocales.push("fr");
    source.fallbackChains.push({ uiLocale: "fr", fallbackLocales: ["en"] });
    const overflow = locale.evaluateDocumentationUiLocaleCompleteness(source);
    expect(overflow).toMatchObject({ status: "refused" });
    expect(overflow.report).toBeUndefined();
    expect(overflow.reportJson).toBeUndefined();
  }, 30000);
});
