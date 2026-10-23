/**
 * @file
 * @lang zh-CN 项目文档清单稳定候选的兼容、已声明字段、普通JSON与公开诊断回归；全部路径为合成fixture。
 * @lang en Compatibility, declared-field, ordinary-JSON and public-diagnostic regressions for the project-manifest candidate; all paths are synthetic fixtures.
 */
import { describe, expect, it } from "vitest";
import { HIA_PROJECT_MANIFEST_SCHEMA_ID, HIA_PROJECT_MANIFEST_SCHEMA_VERSION, HIA_PROJECT_MANIFEST_JSON_SCHEMA, validateHiaProjectManifest } from "./index.js";

/** @lang zh-CN 表达故意畸形外部值，不将测试反例当成已验证清单。
 * @lang en Represents deliberately malformed external values without treating counterexamples as validated manifests.
 */
type Wire = Record<string, unknown>;
/** @lang zh-CN 为每项测试创建独立的静态清单，无文件读取或共享可变对象。
 * @lang en Creates an independent static manifest per test without file access or shared mutable objects.
 * @returns <lang><zh-CN>未验证、可变的合成JSON对象。</zh-CN><en>Unvalidated mutable synthetic JSON object.</en></lang>
 */
function wire(): Wire {
  return { schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION, project: { name: "Public fixture" }, inputs: [{ kind: "hia-document", path: "artifacts/public.json" }] };
}
/** @lang zh-CN 为每项测试创建独立生产器清单，声明不触发模块执行。
 * @lang en Creates an independent producer manifest per test; declaration never executes a module.
 * @returns <lang><zh-CN>未验证的生产器清单。</zh-CN><en>Unvalidated producer manifest.</en></lang>
 */
function producerWire(): Wire {
  return { schemaVersion: HIA_PROJECT_MANIFEST_SCHEMA_VERSION, project: { name: "Producer fixture" }, producers: [{ id: "fixture", module: "producer/index.mjs", inputs: [{ kind: "custom-domain", path: "src/input.json" }] }] };
}
/** @lang zh-CN 只对固定测试fixture作显式未知对象转换，便于单字段畸形修改。
 * @lang en Explicitly casts unknown fixed-fixture objects for isolated malformed-field edits.
 * @param value <lang><zh-CN>固定fixture中的对象。</zh-CN><en>Object from the fixed fixture.</en></lang>
 * @returns <lang><zh-CN>原引用，不克隆或验证。</zh-CN><en>Original reference without cloning or validation.</en></lang>
 */
function object(value: unknown): Wire { return value as Wire; }
/** @lang zh-CN 定位固定fixture首个数组对象，保留原引用。
 * @lang en Locates the first array object in the fixed fixture, preserving its reference.
 * @param value <lang><zh-CN>已由fixture创建的数组。</zh-CN><en>Array created by the fixture.</en></lang>
 * @returns <lang><zh-CN>首对象。</zh-CN><en>First object.</en></lang>
 */
function first(value: unknown): Wire { return (value as Wire[])[0]!; }

describe("project manifest exact versions and caller ownership", () => {
  it("exposes a new source candidate and independent canonical root", () => {
    expect(HIA_PROJECT_MANIFEST_SCHEMA_VERSION).toBe("1.0.0");
    expect(HIA_PROJECT_MANIFEST_SCHEMA_ID).toBe("https://mandolin.github.io/HIA-Documentation/schemas/hia-project-manifest-1.0.0.schema.json");
    expect(HIA_PROJECT_MANIFEST_JSON_SCHEMA.properties.schemaVersion.const).toBe("1.0.0");
  });
  it.each(["0.1.0-draft", "1.0.0"])("reads exact %s without mutation", (version) => {
    const document = wire();
    document.schemaVersion = version;
    const before = JSON.stringify(document);
    const inputs = document.inputs;
    expect(validateHiaProjectManifest(document)).toEqual([]);
    expect(JSON.stringify(document)).toBe(before);
    expect(document.inputs).toBe(inputs);
  });
  it.each(["1.0.1", "1.1.0", "2.0.0", "1.0.0-rc.1", "1.0.0+build", "^1.0.0"])("rejects unnegotiated %s without reflecting it", (version) => {
    const document = wire();
    document.schemaVersion = version;
    const diagnostics = validateHiaProjectManifest(document);
    expect(diagnostics.some(({ code }) => code === "HIA_PROJECT_MANIFEST_SCHEMA_UNSUPPORTED")).toBe(true);
    expect(diagnostics[0]?.message).not.toContain(version);
  });
  it("retains supplied diagnostic prefixes without changing input", () => {
    const document = wire();
    first(document.inputs).path = "../private-owner/file.json";
    const diagnostics = validateHiaProjectManifest(document, { targetPath: "public.hia-project.json" });
    expect(diagnostics.some(({ targetPath }) => targetPath === "public.hia-project.json.inputs.0.path")).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toContain("private-owner");
  });
});

describe("project manifest declared field boundaries", () => {
  it.each(["id", "title", "productVersion"])("validates optional project.%s", (field) => {
    const document = wire();
    object(document.project)[field] = 42;
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("rejects unsupported static input kinds", () => {
    const document = wire();
    first(document.inputs).kind = "unknown-extraction";
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("rejects unsupported domains", () => {
    const document = wire();
    first(document.inputs).domain = "unknown-domain";
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it.each([null, false, 42, ""])("checks a present input.profile shell %s", (profile) => {
    const document = wire();
    first(document.inputs).profile = profile;
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("requires the nested input profile identity", () => {
    const document = wire();
    first(document.inputs).profile = { profileVersion: "fixture-version" };
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("checks declared profile-reference strings", () => {
    const document = wire();
    document.profiles = [{ profileId: 42, profileVersion: false, layer: null, path: "profiles/public.json" }];
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("accepts metadata-only profile references without fetching or requiring a file", () => {
    const document = wire();
    document.profiles = [{ profileId: "external.fixture", profileVersion: "owner-version", layer: "extension" }];
    expect(validateHiaProjectManifest(document)).toEqual([]);
  });
  it("keeps optional empty profile references inert as declared by the existing open schema", () => {
    const document = wire();
    document.profiles = [{}];
    expect(validateHiaProjectManifest(document)).toEqual([]);
  });
  it("rejects empty inputs even when producers exist", () => {
    const document = producerWire();
    document.inputs = [];
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it.each([null, [], false, 42].map((metadata) => ({ metadata })))("checks metadata object shape $metadata", ({ metadata }) => {
    const document = wire();
    document.metadata = metadata;
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("keeps opaque ordinary extension fields and shared acyclic data", () => {
    const document = wire();
    const shared = { note: "public fixture", enabled: true };
    document.metadata = { first: shared, second: shared };
    document.extension = { values: [null, 1, "", false] };
    expect(validateHiaProjectManifest(document)).toEqual([]);
  });
  it.each(["exportName", "options", "profileIds"])("checks declared producer.%s", (field) => {
    const document = producerWire();
    first(document.producers)[field] = field === "options" ? [] : 42;
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it.each([[], ["ok", ""], [42]].map((profileIds) => ({ profileIds })))("checks producer profileIds contents $profileIds", ({ profileIds }) => {
    const document = producerWire();
    first(document.producers).profileIds = profileIds;
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it.each(["language", "hiaDocumentId", "title"])("checks producer input optional %s", (field) => {
    const document = producerWire();
    first(first(document.producers).inputs)[field] = 42;
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("rejects duplicate producer identities before execution", () => {
    const document = producerWire();
    (document.producers as Wire[]).push(structuredClone(first(document.producers)));
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("preserves producer-root current-directory support and opaque options", () => {
    const document = producerWire();
    first(document.producers).workspaceRoot = ".";
    first(document.producers).options = { domainFlag: true, texts: ["", "public"] };
    first(first(document.producers).inputs).applicationRoot = ".";
    expect(validateHiaProjectManifest(document)).toEqual([]);
  });
  it.each(["\\private\\source.json", "src/\u0000file.json", "https://private-owner.invalid/file.json", "src/../private.json"])("checks a sourceRoot locator %s", (locator) => {
    const document = wire();
    first(document.inputs).sourceRoot = locator;
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("sanitizes path-like dynamic extension field names in diagnostics", () => {
    const document = producerWire();
    first(first(document.producers).inputs)["C:/private-owner/secretPath"] = "../blocked";
    const diagnostics = validateHiaProjectManifest(document);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(JSON.stringify(diagnostics)).not.toContain("private-owner");
  });
});

describe("project manifest ordinary JSON graph", () => {
  it.each([undefined, () => 1, BigInt(1), Number.NaN, Infinity, new Date(0), new Map()])("rejects non-JSON extension %s", (value) => {
    const document = wire();
    document.metadata = { value };
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("rejects cyclic metadata without throwing or exposing keys", () => {
    const document = wire();
    const cyclic: Wire = {};
    cyclic["C:/private-owner/token"] = cyclic;
    document.metadata = cyclic;
    expect(() => validateHiaProjectManifest(document)).not.toThrow();
    const diagnostics = validateHiaProjectManifest(document);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(JSON.stringify(diagnostics)).not.toContain("private-owner");
  });
  it("does not execute a root accessor", () => {
    const document = wire();
    let reads = 0;
    Object.defineProperty(document, "project", { enumerable: true, get: () => { reads += 1; return { name: "unsafe" }; } });
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
    expect(reads).toBe(0);
  });
  it("does not execute a hidden model accessor", () => {
    const document = wire();
    let reads = 0;
    Object.defineProperty(document, "project", { enumerable: false, get: () => { reads += 1; return { name: "unsafe" }; } });
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
    expect(reads).toBe(0);
  });
  it("rejects inherited required fields", () => {
    const document = wire();
    document.project = Object.create({ name: "inherited" });
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
  });
  it("rejects sparse or method-shadowed arrays before traversal", () => {
    const sparse = wire();
    sparse.inputs = Array(1);
    expect(validateHiaProjectManifest(sparse).length).toBeGreaterThan(0);
    const shadowed = wire();
    Reflect.set(shadowed.inputs as object, "forEach", 42);
    expect(() => validateHiaProjectManifest(shadowed)).not.toThrow();
    expect(validateHiaProjectManifest(shadowed).length).toBeGreaterThan(0);
  });
  it("does not invoke custom serialization hooks", () => {
    const document = wire();
    let calls = 0;
    document.metadata = Object.defineProperty({}, "toJSON", { value: () => { calls += 1; return {}; } });
    expect(validateHiaProjectManifest(document).length).toBeGreaterThan(0);
    expect(calls).toBe(0);
  });
});
