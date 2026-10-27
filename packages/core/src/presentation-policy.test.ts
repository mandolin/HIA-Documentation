/**
 * @file
 * @lang zh-CN 呈现主题/隐私/兼容/诊断及schema所有权特征；只使用公开合成工件，不重复81状态对专项。
 * @lang en Characterizes theme/privacy/compatibility/diagnostics and schema ownership using public synthetic fixtures, without repeating the 81-pair state suite.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareDocumentationPresentationIdentity as compare,
  DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT as contract,
  DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION as version,
  DOCUMENTATION_PRESENTATION_PROFILE_SCHEMA_ID as schemaId,
  DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA as schema,
  DOCUMENTATION_PRESENTATION_SCHEMES as schemes,
  DOCUMENTATION_PRESENTATION_DIAGNOSTIC_CODES as diagnosticCodes,
  transitionDocumentationSourceReader as transition,
  validateDocumentationPresentationProfile as validate,
  type DocumentationPresentationProfile
} from "./documentation-presentation-profile.js";

/** @lang zh-CN 每次解析独立公开fixture，避免全局词汇或输入共享污染。 @lang en Parses an independent public fixture per call, avoiding shared vocabulary or input mutation. */
function fixture(): DocumentationPresentationProfile {
  return JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/documentation-presentation-profile.json", import.meta.url), "utf8"));
}
/** @lang zh-CN 仅投影返回code，不复制输入诊断。 @lang en Projects returned codes only, without copying input diagnostics. */
const codes = (value: unknown) => validate(value).map(({ code }) => code);

describe("presentation theme declarations", () => {
  it.each([0, 2, 3, 64, 65])("checks skin catalog count %s", (count) => {
    const value = fixture();
    const seed = value.theme.skins[0]!;
    value.theme.skins = Array.from({ length: count }, (_, index) => ({ ...seed, skinId: `skin.${String(index).padStart(2, "0")}` }));
    value.theme.skinId = "skin.00";
    expect(codes(value)).toEqual(count >= 3 && count <= 64 ? [] : ["PRESENTATION_THEME_CAPABILITY_INVALID"]);
  });

  it.each(["duplicate", "unsorted", "missing-selection", "missing-capability", "unsupported-scheme"])("rejects theme mismatch %s", (kind) => {
    const value = fixture();
    if (kind === "duplicate") value.theme.skins[1]!.skinId = value.theme.skins[0]!.skinId;
    if (kind === "unsorted") value.theme.skins.reverse();
    if (kind === "missing-selection") value.theme.skinId = "skin.absent";
    const selected = value.theme.skins.find(({ skinId }) => skinId === value.theme.skinId);
    if (kind === "missing-capability") selected!.capabilities = [];
    if (kind === "unsupported-scheme") selected!.supportedSchemes = ["dark"];
    expect(codes(value)).toEqual(["PRESENTATION_THEME_CAPABILITY_INVALID"]);
  });

  it.each([0, 64, 65])("checks capability count %s and selected coverage", (count) => {
    const value = fixture();
    const capabilities = Array.from({ length: count }, (_, index) => `cap.${String(index).padStart(2, "0")}`);
    value.theme.requiredCapabilities = capabilities;
    for (const skin of value.theme.skins) skin.capabilities = [...capabilities];
    expect(codes(value)).toEqual(count <= 64 ? [] : ["PRESENTATION_THEME_CAPABILITY_INVALID"]);
  });

  it.each([{ supported: [] }, { supported: ["light", "dark"] }, { supported: ["system", "system"] }, { supported: ["sepia"] }])("refuses invalid supported schemes $supported", ({ supported }) => {
    const value = fixture();
    Object.assign(value.theme.skins[0]!, { supportedSchemes: supported });
    expect(codes(value)).toEqual(["PRESENTATION_THEME_CAPABILITY_INVALID"]);
  });

  it("accepts explicit system support without querying a device", () => {
    const value = fixture();
    for (const skin of value.theme.skins) skin.supportedSchemes = ["system"];
    expect(validate(value)).toEqual([]);
    expect(schemes).toEqual(["dark", "light", "system"]);
  });

  it.each(["", " ", "x".repeat(256), "x".repeat(257), "C:/synthetic-only/path"])("characterizes token contract label %s", (label) => {
    const value = fixture();
    value.theme.skins[0]!.tokenContract = label;
    expect(codes(value)).toEqual(label === " " || label.length === 256 ? [] : ["PRESENTATION_THEME_CAPABILITY_INVALID"]);
  });
});

describe("presentation privacy and compatibility declarations", () => {
  it.each(["absolutePathsIncluded", "cookiesRequired", "credentialsIncluded", "privateSidecarsIncluded", "sourceBodyInContract", "sourceBodyInSearchIndex", "telemetryEnabled"] as const)("requires false privacy field %s", (field) => {
    const value = fixture();
    Object.assign(value.privacy, { [field]: true });
    expect(codes(value)).toEqual(["PRESENTATION_PRIVACY_BOUNDARY"]);
  });

  it("requires exact source exposure and closed privacy fields", () => {
    const value = fixture();
    Object.assign(value.privacy, { sourceExposure: "public" });
    expect(codes(value)).toEqual(["PRESENTATION_PRIVACY_BOUNDARY"]);
    value.privacy.sourceExposure = "public-explicit";
    Object.assign(value.privacy, { unexpected: false });
    expect(codes(value)).toEqual(["PRESENTATION_PRIVACY_BOUNDARY"]);
  });

  it.each(["identityChange", "semanticChange", "unknownProperties", "versionMatch"] as const)("requires exact compatibility field %s", (field) => {
    const value = fixture();
    Object.assign(value.compatibility, { [field]: "unsupported" });
    expect(codes(value)).toEqual(["PRESENTATION_COMPATIBILITY_UNSUPPORTED"]);
  });
});

describe("root profile and diagnostics", () => {
  it.each(["status", "theme", "compatibility", "diagnostics"] as const)("refuses missing root field %s", (field) => {
    const value = fixture();
    delete (value as unknown as Record<string, unknown>)[field];
    expect(codes(value)).toEqual(["PRESENTATION_PROFILE_INVALID"]);
  });

  it.each(["1.0.1", "0.1.1-draft", ""])("requires exact version %s", (candidate) => {
    const value = fixture();
    Object.assign(value, { contractVersion: candidate });
    expect(codes(value)).toEqual(["PRESENTATION_CONTRACT_UNSUPPORTED"]);
  });

  it("distinguishes an unknown property from prohibited private keys", () => {
    expect(codes({ ...fixture(), unexpected: true })).toEqual(["PRESENTATION_PROFILE_INVALID"]);
    expect(codes({ ...fixture(), sourceBody: "synthetic fixture" })).toEqual(["PRESENTATION_PRIVACY_BOUNDARY"]);
  });

  it.each([0, 128, 129])("checks input diagnostic count %s without forwarding records", (count) => {
    const value = fixture();
    value.diagnostics = Array.from({ length: count }, () => ({ code: "SYNTHETIC", severity: "error", message: "synthetic fixture" }));
    expect(codes(value)).toEqual(count <= 128 ? [] : ["PRESENTATION_PROFILE_INVALID"]);
    if (count <= 128) expect(compare(fixture(), value)).toEqual([]);
  });

  it("does not infer status from input severity or sanitize free code/message text", () => {
    const value = fixture();
    // <lang><zh-CN>固定合成路径只用于证明自由文本未扫描，不读取或暴露任何真实文件。</zh-CN><en>The fixed synthetic path demonstrates unscanned free text without reading or exposing a real file.</en></lang>
    value.diagnostics = [{ code: "CUSTOM", severity: "error", message: "C:/synthetic-only/marker" }];
    expect(validate(value)).toEqual([]);
    expect(value.status).toBe("ready");
    value.status = "refused";
    expect(compare(fixture(), value)).toEqual([]);
    expect(value.diagnostics[0]!.message).toBe("C:/synthetic-only/marker");
  });

  it.each(["path", "targetPath", "data"])("refuses absolute diagnostic locator in %s", (field) => {
    const value = fixture();
    value.diagnostics = [{ code: "CUSTOM", severity: "info", message: "synthetic", [field]: field === "data" ? { nested: "C:/synthetic-only/marker" } : "C:/synthetic-only/marker" }];
    expect(codes(value)).toEqual(["PRESENTATION_PROFILE_INVALID"]);
  });

  it("returns only newly created mutable diagnostics and deduplicates both invalid inputs", () => {
    const value = fixture();
    value.theme.skinId = "skin.absent";
    value.diagnostics = [{ code: "INPUT_ONLY", severity: "info", message: "synthetic" }];
    const first = validate(value);
    const second = validate(value);
    expect(first.map(({ code }) => code)).toEqual(["PRESENTATION_THEME_CAPABILITY_INVALID"]);
    expect(first[0]!.severity).toBe("error");
    expect(Object.isFrozen(first)).toBe(false);
    expect(Object.isFrozen(first[0])).toBe(false);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
    expect(compare(value, value)).toEqual(first);
    expect(value.diagnostics[0]!.code).toBe("INPUT_ONLY");
  });
});

describe("schema and transition result ownership", () => {
  it("retains exact identities and shared type-readonly runtime-mutable schema enums", () => {
    expect([contract, version, schemaId]).toEqual(["documentation-presentation-profile", "1.0.0", "https://mandolin.github.io/HIA-Documentation/schemas/documentation-presentation-profile-1.0.0.schema.json"]);
    expect(schema.$id).toBe(schemaId);
    expect(schema.$defs.theme.properties.scheme.enum).toBe(schemes);
    expect(Object.isFrozen(schema)).toBe(false);
    expect(Object.isFrozen(schemes)).toBe(false);
    expect(Object.isFrozen(diagnosticCodes)).toBe(false);
    const copy = structuredClone(schema);
    (copy.$defs.theme.properties.scheme.enum as unknown as string[]).push("synthetic-only");
    expect(schemes).not.toContain("synthetic-only");
  });

  it("returns independent mutable state-result wrappers without retaining reader state", () => {
    const first = transition("idle", "load-requested");
    const second = transition("idle", "load-requested");
    expect(first).toEqual({ state: "loading", diagnostics: [] });
    expect(first).not.toBe(second);
    expect(first.diagnostics).not.toBe(second.diagnostics);
    expect(Object.isFrozen(first)).toBe(false);
    expect(Object.isFrozen(first.diagnostics)).toBe(false);
    first.diagnostics.push({ code: "SYNTHETIC", severity: "info", message: "synthetic" });
    expect(second.diagnostics).toEqual([]);
  });

  it("keeps the reserved source-mode diagnostic distinct from current validation output", () => {
    const value = fixture();
    Object.assign(value.source, { mode: "unsupported" });
    expect(diagnosticCodes).toContain("PRESENTATION_SOURCE_MODE_INVALID");
    expect(codes(value)).toEqual(["PRESENTATION_SOURCE_ASSET_INVALID"]);
  });
});
