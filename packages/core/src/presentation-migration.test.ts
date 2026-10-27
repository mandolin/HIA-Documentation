/**
 * @file
 * @lang zh-CN 呈现契约精确两版本、显式无损迁移及方案A回归；只使用公开合成历史输入，不执行网络或UI。
 * @lang en Regressions for exact presentation versions, explicit lossless migration and policy A, using public synthetic history without network or UI execution.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as presentation from "./documentation-presentation-profile.js";

/** @lang zh-CN 每个用例独立解析历史工件，仅显式替换根版本。 @lang en Parses an independent historical artifact per case and explicitly replaces only its root version. */
function fixture(version = "0.1.0-draft") {
  // <lang><zh-CN>历史文件不被重写，内存副本可用于新旧分支反例。</zh-CN><en>The historical file stays unchanged; its in-memory copy supports old/new branch counterexamples.</en></lang>
  const value = JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/documentation-presentation-profile.json", import.meta.url), "utf8"));
  value.contractVersion = version;
  return value;
}
/** @lang zh-CN 只投影本次验证诊断码，避免与输入记录混同。 @lang en Projects this validation's diagnostic codes without confusing them with input records. */
const codes = (value: unknown) => presentation.validateDocumentationPresentationProfile(value).map(({ code }) => code);

describe("presentation exact version pairing", () => {
  it("publishes a distinct current identity and schema version", () => {
    expect(presentation.DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION).toBe("1.0.0");
    expect(presentation.DOCUMENTATION_PRESENTATION_PROFILE_SCHEMA_ID).toBe("https://mandolin.github.io/HIA-Documentation/schemas/documentation-presentation-profile-1.0.0.schema.json");
    expect(presentation.DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA.properties.contractVersion.const).toBe("1.0.0");
  });
  it.each(["0.1.0-draft", "1.0.0"])("reads exact %s without changing the input", (version) => {
    const value = fixture(version);
    const before = JSON.stringify(value);
    expect(codes(value)).toEqual([]);
    expect(JSON.stringify(value)).toBe(before);
  });
  it.each(["0.1.1-draft", "1.0.1", "1.1.0", "1.0.0-rc.1", "1.0.0+build", "^1", ""])("refuses unknown identity %s", (version) => {
    expect(codes(fixture(version))).toContain("PRESENTATION_CONTRACT_UNSUPPORTED");
  });
  it("compares identities across supported versions without upgrading either input", () => {
    const old = fixture();
    const current = fixture("1.0.0");
    expect(presentation.compareDocumentationPresentationIdentity(old, current)).toEqual([]);
    expect(old.contractVersion).toBe("0.1.0-draft");
  });
});

describe("versioned token labels", () => {
  it.each([" ", "\t", "\r\n", "\u00a0", "\ufeff", "\u2003"])("retains legacy whitespace but refuses it in v1: %j", (label) => {
    const old = fixture();
    old.theme.skins[0].tokenContract = label;
    const current = structuredClone(old);
    current.contractVersion = "1.0.0";
    expect(codes(old)).toEqual([]);
    expect(codes(current)).toEqual(["PRESENTATION_THEME_CAPABILITY_INVALID"]);
    expect(old.theme.skins[0].tokenContract).toBe(label);
  });
  it.each(["tokens@0.1.0-draft", " a ", "two words", "主题契约", "x".repeat(256)])("retains nonblank label exactly: %s", (label) => {
    const value = fixture("1.0.0");
    value.theme.skins[0].tokenContract = label;
    expect(codes(value)).toEqual([]);
  });
});

describe("policy A and explicit detached migration", () => {
  // <lang><zh-CN>笛卡尔积只调整已定义的呈现维度，证明迁移不改变分区/模式/主题或身份。</zh-CN><en>The Cartesian product changes defined presentation dimensions only, proving migration preserves partition/mode/theme and identities.</en></lang>
  const variants = ["fetch", "embed", "link", "none"].flatMap((sourceMode) =>
    ["multi-page", "single-page"].flatMap((pageMode) =>
      [0, 1, 2].flatMap((skinIndex) => ["dark", "light", "system"].map((scheme) => ({ sourceMode, pageMode, skinIndex, scheme })))));
  it.each(variants)("preserves $sourceMode/$pageMode/skin$skinIndex/$scheme", ({ sourceMode, pageMode, skinIndex, scheme }) => {
    const value = fixture();
    value.source.mode = sourceMode;
    value.theme.skinId = value.theme.skins[skinIndex].skinId;
    value.theme.scheme = scheme;
    if (sourceMode === "none") {
      value.source.assets = [];
      value.privacy.sourceExposure = "none";
    }
    if (pageMode === "single-page") {
      value.pagePartition.mode = pageMode;
      value.pagePartition.singlePageId = "page.all";
      for (const topic of value.pagePartition.topics) {
        topic.pageId = "page.all";
        topic.canonicalReference = `${topic.pageId}#${topic.fragmentId}`;
      }
    }
    const expected = { ...structuredClone(value), contractVersion: "1.0.0" };
    const result = presentation.migrateDocumentationPresentationProfile(value);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.profile).toEqual(expected);
      expect(codes(result.profile)).toEqual([]);
      expect(presentation.compareDocumentationPresentationIdentity(value, result.profile)).toEqual([]);
    }
  });
  it.each(["0.1.0-draft", "1.0.0"])("retains refused/error and valid asset plans in %s", (version) => {
    const value = fixture(version);
    value.status = "refused";
    value.diagnostics = [{ code: "OWNER_SYNTHETIC", severity: "error", message: "Public synthetic issue" }];
    expect(codes(value)).toEqual([]);
    const plan = presentation.createDocumentationSourceFetchPlan(value, value.source.assets[0].assetId);
    expect(plan.status).toBe("ready");
    expect(plan.diagnostics).toEqual([]);
    const result = presentation.migrateDocumentationPresentationProfile(value);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a successful in-memory migration.");
    expect(result.profile.status).toBe("refused");
    expect(result.profile.diagnostics).toEqual(value.diagnostics);
    expect(result.profile.source.assets).toEqual(value.source.assets);
  });
  it.each(["0.1.0-draft", "1.0.0"])("does not infer status from error diagnostics in %s", (version) => {
    const value = fixture(version);
    value.diagnostics = [{ code: "CUSTOM", severity: "error", message: "Public synthetic message" }];
    const result = presentation.migrateDocumentationPresentationProfile(value);
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.profile.status).toBe("ready");
  });
  it.each(["0.1.0-draft", "1.0.0"])("returns a detached current copy for %s", (version) => {
    const value = fixture(version);
    const before = structuredClone(value);
    const result = presentation.migrateDocumentationPresentationProfile(value);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a current profile copy.");
    expect(result.profile).toEqual({ ...before, contractVersion: "1.0.0" });
    expect(result.profile).not.toBe(value);
    expect(result.profile.source.assets[0]).not.toBe(value.source.assets[0]);
    result.profile.theme.skins[0]!.tokenContract = "changed";
    expect(value).toEqual(before);
    const again = presentation.migrateDocumentationPresentationProfile(result.profile);
    expect(again.status).toBe("ready");
    if (again.status === "ready") expect(again.profile.theme).not.toBe(result.profile.theme);
  });
  it.each(["0.1.0-draft", "1.0.0"])("refuses blank-label migration without trimming or a partial result from %s", (version) => {
    const value = fixture(version);
    value.theme.skins[0].tokenContract = " \t ";
    const before = JSON.stringify(value);
    const result = presentation.migrateDocumentationPresentationProfile(value);
    expect(result.status).toBe("refused");
    expect(result).not.toHaveProperty("profile");
    expect(result.diagnostics.map(({ code }) => code)).toEqual(["PRESENTATION_THEME_CAPABILITY_INVALID"]);
    expect(JSON.stringify(value)).toBe(before);
  });
  it.each(["unknown-version", "unknown-field", "private-field", "unsafe-url"])("refuses invalid migration: %s", (kind) => {
    const value = fixture();
    if (kind === "unknown-version") value.contractVersion = "2.0.0";
    if (kind === "unknown-field") value.extension = true;
    if (kind === "private-field") value.sourceBody = "SYNTHETIC_PRIVATE_MARKER";
    if (kind === "unsafe-url") value.source.assets[0].relativeUrl = " https://example.invalid/private";
    const result = presentation.migrateDocumentationPresentationProfile(value);
    expect(result.status).toBe("refused");
    expect(result).not.toHaveProperty("profile");
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PRIVATE_MARKER");
  });
  it("rejects getters without executing or echoing their payload", () => {
    const value = fixture();
    let hits = 0;
    Object.defineProperty(value, "profileId", { enumerable: true, get() { hits += 1; throw new Error("SYNTHETIC_PRIVATE_MARKER"); } });
    const result = presentation.migrateDocumentationPresentationProfile(value);
    expect(result.status).toBe("refused");
    expect(hits).toBe(0);
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PRIVATE_MARKER");
  });
  it("rejects cycles without returning a partial profile", () => {
    const value = fixture();
    value.self = value;
    expect(presentation.migrateDocumentationPresentationProfile(value)).toMatchObject({ status: "refused" });
    expect(presentation.migrateDocumentationPresentationProfile(value)).not.toHaveProperty("profile");
  });
});
