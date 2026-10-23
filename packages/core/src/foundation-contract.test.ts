/**
 * @file
 * @lang zh-CN 核心文档候选的精确兼容、数据边界和公开诊断回归；所有私有路径均为合成哨兵。
 * @lang en Regressions for exact compatibility, data boundaries and public diagnostics of the core-document candidate; private paths are synthetic sentinels.
 */
import { describe, expect, it } from "vitest";
import {
  HIA_CORE_CONTRACT_VERSION,
  HIA_DOCUMENT_SCHEMA,
  HIA_DOCUMENT_SCHEMA_ID,
  HIA_PROTOCOL_ENVELOPE_VERSION,
  HIA_SOURCE_MODEL_VERSION,
  HIA_TEXT_I18N_MODEL_VERSION,
  createBasicFixtureDocument,
  createHiaDocument,
  createHiaProtocolEnvelope,
  getI18nField,
  resolveI18nFieldText,
  validateHiaDocumentDetailed
} from "./index.js";
import type { HiaI18nField, HiaI18nModel } from "./index.js";

/** @lang zh-CN 用未知值字典表达故意畸形的外部JSON，避免把反例伪装为已验证模型。
 * @lang en Represents deliberately malformed external JSON as unknown-value dictionaries rather than validated models.
 */
type WireObject = Record<string, unknown>;
/** @lang zh-CN 克隆既有公开fixture，测试之间不共享可变输入。
 * @lang en Clones the existing public fixture so tests do not share mutable input.
 * @returns <lang><zh-CN>可变的未知输入对象，不保留生产者引用。</zh-CN><en>Mutable unknown input, without producer references.</en></lang>
 */
function wire(): WireObject {
  return structuredClone(createBasicFixtureDocument()) as unknown as WireObject;
}
/** @lang zh-CN 定位固定fixture的首个符号供单点畸形输入。
 * @lang en Locates the first symbol of the fixed fixture for isolated malformed inputs.
 * @param document <lang><zh-CN>由wire创建的固定fixture。</zh-CN><en>Fixed fixture created by wire.</en></lang>
 * @returns <lang><zh-CN>原符号引用。</zh-CN><en>Original symbol reference.</en></lang>
 */
function symbol(document: WireObject): WireObject {
  return (document.symbols as WireObject[])[0]!;
}
/** @lang zh-CN 定位固定fixture的国际化字段字典。
 * @lang en Locates the internationalization field dictionary of the fixed fixture.
 * @param document <lang><zh-CN>由wire创建的fixture。</zh-CN><en>Fixture created by wire.</en></lang>
 * @returns <lang><zh-CN>原字段字典。</zh-CN><en>Original field dictionary.</en></lang>
 */
function fields(document: WireObject): Record<string, HiaI18nField> {
  return (symbol(document).i18n as WireObject).fields as Record<string, HiaI18nField>;
}

/** @lang zh-CN 版本只接受已知精确值，根和两个子模型独立验证。
 * @lang en Versions accept known exact values only, with the root and two submodels validated independently.
 */
describe("core foundation exact version compatibility", () => {
  it("writes current document, submodel and protocol candidates with distinct schema identity", () => {
    expect([HIA_CORE_CONTRACT_VERSION, HIA_TEXT_I18N_MODEL_VERSION, HIA_SOURCE_MODEL_VERSION, HIA_PROTOCOL_ENVELOPE_VERSION]).toEqual(["1.0.0", "1.0.0", "1.0.0", "1.0.0"]);
    expect(createHiaDocument().schemaVersion).toBe("1.0.0");
    expect(createHiaProtocolEnvelope("core-document", {}).schemaVersion).toBe("1.0.0");
    expect(HIA_DOCUMENT_SCHEMA_ID).toContain("hia-document-1.0.0.schema.json");
  });
  // <lang><zh-CN>三条独立版本线形成八种组合；有效输入的版本和对象不能被reader重写。</zh-CN><en>Three independent version lines form eight combinations; readers must not rewrite versions or objects of valid input.</en></lang>
  const combinations = ["0.2.0", "1.0.0"].flatMap((core) => ["0.2.0", "1.0.0"].flatMap((i18n) => ["0.2.0", "1.0.0"].map((source) => ({ core, i18n, source }))));
  it.each(combinations)("reads exact core=$core i18n=$i18n source=$source without mutation", ({ core, i18n, source }) => {
    const document = wire();
    document.schemaVersion = core;
    for (const item of document.symbols as WireObject[]) {
      (item.i18n as WireObject).modelVersion = i18n;
      (item.source as WireObject).modelVersion = source;
    }
    const before = structuredClone(document);
    expect(validateHiaDocumentDetailed(document).valid).toBe(true);
    expect(document).toEqual(before);
  });
  it.each(["1.0.1", "1.1.0", "2.0.0", "1.0.0-rc.1", "1.0.0+build", "^1.0.0"])("rejects unnegotiated version %s in all three wire locations", (version) => {
    const document = wire();
    document.schemaVersion = version;
    (symbol(document).i18n as WireObject).modelVersion = version;
    (symbol(document).source as WireObject).modelVersion = version;
    const codes = validateHiaDocumentDetailed(document).diagnostics.map((item) => item.code);
    expect(codes).toContain("HIA_SCHEMA_VERSION_UNSUPPORTED");
    expect(codes).toContain("HIA_I18N_MODEL_VERSION_UNSUPPORTED");
    expect(codes).toContain("HIA_SOURCE_MODEL_VERSION_UNSUPPORTED");
  });
  it("declares exact legacy/current submodels in the new root schema", () => {
    expect(HIA_DOCUMENT_SCHEMA.$defs.i18nModel.properties.modelVersion).toEqual({ enum: ["1.0.0", "0.2.0"] });
    expect(HIA_DOCUMENT_SCHEMA.$defs.sourceMetadata.properties.modelVersion).toEqual({ enum: ["1.0.0", "0.2.0"] });
    expect(HIA_DOCUMENT_SCHEMA.additionalProperties).toBe(true);
  });
});

/** @lang zh-CN 元数据保持不透明语义，但wire图必须可表达为普通JSON；共享引用不等同环。
 * @lang en Metadata remains semantically opaque, but the wire graph must be ordinary JSON; shared references are not cycles.
 */
describe("core document JSON and structure boundaries", () => {
  it.each([
    ["undefined", undefined], ["function", () => 1], ["bigint", 1n], ["NaN", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY], ["date", new Date(0)], ["map", new Map()], ["set", new Set()]
  ])("rejects non-JSON metadata value %s", (_name, value) => {
    const document = wire();
    document.metadata = { value };
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("rejects a cycle without throwing or reflecting its private keys", () => {
    const document = wire();
    const cyclic: WireObject = {};
    cyclic["C:/private-owner/token-value"] = cyclic;
    document.metadata = cyclic;
    expect(() => validateHiaDocumentDetailed(document)).not.toThrow();
    const result = validateHiaDocumentDetailed(document);
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-owner");
  });
  it("rejects cyclic node children before recursive shape traversal", () => {
    const document = wire();
    const node: WireObject = { id: "cycle", kind: "group", title: "Cycle" };
    node.children = [node];
    document.nodes = [node];
    expect(() => validateHiaDocumentDetailed(document)).not.toThrow();
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("does not execute an enumerable metadata getter", () => {
    const document = wire();
    let reads = 0;
    document.metadata = Object.defineProperty({}, "value", { enumerable: true, get: () => { reads += 1; return "unsafe"; } });
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
    expect(reads).toBe(0);
  });
  it("rejects a custom non-enumerable serialization hook without invoking it", () => {
    const document = wire();
    let calls = 0;
    document.metadata = Object.defineProperty({}, "toJSON", { value: () => { calls += 1; return "changed shape"; } });
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
    expect(calls).toBe(0);
  });
  it("preserves shared acyclic JSON values and open extension fields", () => {
    const document = wire();
    const shared = { nested: [null, false, 12.5, "extension"] };
    document.metadata = { left: shared, right: shared };
    document.extension = shared;
    expect(validateHiaDocumentDetailed(document).valid).toBe(true);
    expect((document.metadata as WireObject).left).toBe(shared);
    expect(document.extension).toBe(shared);
  });
  it.each([null, false, 0, ""])("rejects present malformed i18n/source shells: %j", (value) => {
    const document = wire();
    symbol(document).i18n = value;
    symbol(document).source = value;
    const codes = validateHiaDocumentDetailed(document).diagnostics.map((item) => item.code);
    expect(codes).toContain("HIA_I18N_INVALID");
    expect(codes).toContain("HIA_SOURCE_INVALID");
  });
  it.each([null, false, 0, "", []])("requires object-shaped metadata when present: %j", (value) => {
    const document = wire();
    document.metadata = value;
    symbol(document).metadata = value;
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it.each(["line", "column"])("rejects unsafe source position %s", (field) => {
    const document = wire();
    const position = ((symbol(document).source as WireObject).definedIn as WireObject).position as WireObject;
    position[field] = Number.MAX_SAFE_INTEGER + 1;
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("rejects unsafe text offsets", () => {
    const document = wire();
    fields(document).description!.segments = [{ kind: "lang-inline", id: "s", fieldPath: "description", raw: "x", localized: { en: "x" }, rangeInField: { start: Number.MAX_SAFE_INTEGER + 1, end: Number.MAX_SAFE_INTEGER + 1 } }];
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("preserves empty free text and missing-resolution output rather than applying token rules", () => {
    const document = wire();
    symbol(document).summary = "";
    (symbol(document).source as WireObject).primaryBlock = { kind: "primary-block", content: "", rangeSource: "unresolved", confidence: "none" };
    fields(document).description!.defaultText = "";
    fields(document).description!.blocks = [{ kind: "lang-block", locale: "en", fieldPath: "description", text: "" }];
    fields(document).description!.resolutions = { en: { requestedLocale: "en", resolvedLocale: "", fallbackChain: ["en"], usedFallback: false, missing: true, sourceLocale: "" } };
    expect(validateHiaDocumentDetailed(document).valid).toBe(true);
  });
  it("rejects non-string free-text values", () => {
    const document = wire();
    (fields(document).description as unknown as WireObject).defaultText = 42;
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it.each(["C:private.js", "file:///private/source.js", "https://private.invalid/source.js"])("rejects non-relative public source locators: %s", (locator) => {
    const document = wire();
    ((symbol(document).source as WireObject).definedIn as WireObject).relativePath = locator;
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
});

/** @lang zh-CN 查找只消费自有键，诊断不得回显未知版本或畸形动态键。
 * @lang en Lookups consume own keys only, and diagnostics must not reflect unknown versions or malformed dynamic keys.
 */
describe("core own-property and diagnostic privacy", () => {
  it.each(["constructor", "__proto__", "toString", "valueOf"])("ignores inherited field %s", (key) => {
    const model = { fields: {} } as HiaI18nModel;
    expect(getI18nField(model, key)).toBeUndefined();
  });
  it("ignores inherited localized text and keeps the normal fallback", () => {
    const localizedText = Object.assign(Object.create({ en: "private-owner" }) as Record<string, string>, { "zh-CN": "公开内容" });
    const field: HiaI18nField = { fieldPath: "description", kind: "text", defaultLocale: "zh-CN", localizedText };
    const resolved = resolveI18nFieldText(field, "en");
    expect(resolved.text).toBe("公开内容");
    expect(resolved.usedFallback).toBe(true);
  });
  it("accepts explicitly owned special field names without changing their reference", () => {
    const field: HiaI18nField = { fieldPath: "__proto__", kind: "text", defaultLocale: "en", localizedText: { en: "Owned" } };
    const owned = JSON.parse('{"__proto__":null}') as Record<string, HiaI18nField>;
    owned.__proto__ = field;
    const model = { fields: owned } as HiaI18nModel;
    expect(getI18nField(model, "__proto__")).toBe(field);
  });
  it("does not echo unsupported version or model values", () => {
    const document = wire();
    const secret = "C:/private-owner/token-value";
    document.schemaVersion = secret;
    (symbol(document).i18n as WireObject).model = secret;
    (symbol(document).i18n as WireObject).modelVersion = secret;
    (symbol(document).source as WireObject).model = secret;
    (symbol(document).source as WireObject).modelVersion = secret;
    const result = validateHiaDocumentDetailed(document);
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-owner");
  });
  it("uses a safe diagnostic location for malformed dynamic field keys", () => {
    const document = wire();
    (symbol(document).i18n as WireObject).fields = { "C:/private-owner/token-value": null };
    const result = validateHiaDocumentDetailed(document);
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-owner");
  });
  it("preserves precise locations for ordinary field names", () => {
    const document = wire();
    (fields(document).description as unknown as WireObject).fieldPath = "different";
    expect(validateHiaDocumentDetailed(document).diagnostics.some((item) => item.targetPath === "symbols.0.i18n.fields.description.fieldPath")).toBe(true);
  });
});

/** @lang zh-CN 迭代图遍历、畸形可选值和构造器引用所有权的补充复核。
 * @lang en Additional review of iterative graphs, malformed optional values and builder reference ownership.
 */
describe("core foundation traversal and ownership", () => {
  it("validates a finite deep tree and metadata graph without recursive-stack dependence", () => {
    const document = wire();
    // <lang><zh-CN>两条5000层合成链分别覆盖节点和不透明metadata；无真实项目或正文。</zh-CN><en>Two synthetic 5000-level chains cover nodes and opaque metadata, without real projects or text.</en></lang>
    let node: WireObject = { id: "end", kind: "group", title: "End" };
    let metadata: WireObject = { value: true };
    for (let depth = 0; depth < 5000; depth += 1) {
      node = { id: "node-" + depth, kind: "group", title: "Level", children: [node] };
      metadata = { next: metadata };
    }
    document.nodes = [node];
    document.metadata = metadata;
    expect(validateHiaDocumentDetailed(document).valid).toBe(true);
  });
  it("rejects sparse arrays rather than silently turning holes into null", () => {
    const document = wire();
    document.metadata = { values: Array(2) };
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("rejects array method shadowing before the shape walker calls entries", () => {
    const document = wire();
    Reflect.set(document.symbols as object, "entries", "not a function");
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("rejects malformed locators without executing or coercing toString", () => {
    const document = wire();
    ((symbol(document).source as WireObject).definedIn as WireObject).relativePath = { toString: 42 };
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("checks malformed nested source shells even when falsy", () => {
    const document = wire();
    const source = symbol(document).source as WireObject;
    source.definedIn = false;
    source.primaryBlock = false;
    source.references = [{ kind: "source-reference", referenceKind: "coderef", targetId: "missing", resolved: false, fragment: null }];
    const codes = validateHiaDocumentDetailed(document).diagnostics.map((item) => item.code);
    expect(codes).toContain("HIA_SOURCE_INVALID");
    expect(codes).toContain("HIA_SOURCE_BLOCK_INVALID");
    expect(codes).toContain("HIA_SOURCE_FRAGMENT_INVALID");
    // <lang><zh-CN>同一可选语言字段只校验一次，避免重复公开诊断。</zh-CN><en>Validate the same optional language field once to avoid duplicate public diagnostics.</en></lang>
    const languageDocument = wire();
    ((symbol(languageDocument).source as WireObject).definedIn as WireObject).language = 42;
    expect(validateHiaDocumentDetailed(languageDocument).diagnostics.filter((item) => item.targetPath === "symbols.0.source.definedIn.language")).toHaveLength(1);
  });
  it("redacts malformed localized/resolution map keys as well as field keys", () => {
    const document = wire();
    const field = fields(document).description as unknown as WireObject;
    field.localizedText = { "C:/private-owner/token-value": 42 };
    field.resolutions = { "C:/private-owner/token-value": null };
    const result = validateHiaDocumentDetailed(document);
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-owner");
  });
  it("keeps generic envelope payloads and diagnostics by reference without claiming JSON validation", () => {
    const payload = { schemaVersion: "0.2.0", callback: () => 42 };
    const diagnostics = [{ code: "CUSTOM", message: "Public", severity: "warning" as const }];
    const envelope = createHiaProtocolEnvelope("extension.custom", payload, { diagnostics });
    expect(envelope.payload).toBe(payload);
    expect(envelope.diagnostics).toBe(diagnostics);
    expect(envelope.payload.schemaVersion).toBe("0.2.0");
    expect(envelope.payload.callback()).toBe(42);
  });
  it("keeps supplied document collections and metadata by reference", () => {
    const nodes = [{ id: "n", kind: "group", title: "Node" }];
    const symbols = [{ id: "s", kind: "function", name: "Symbol" }];
    const metadata = { stable: "data" };
    const document = createHiaDocument({ nodes, symbols, metadata });
    expect(document.nodes).toBe(nodes);
    expect(document.symbols).toBe(symbols);
    expect(document.metadata).toBe(metadata);
  });
});

/** @lang zh-CN 对照schema补齐此前未覆盖的可选字段与字面量鉴别符。
 * @lang en Adds schema-comparison cases for previously uncovered optional fields and literal discriminators.
 */
describe("core foundation remaining schema boundaries", () => {
  it("rejects a wrong language-block discriminator", () => {
    const document = wire();
    (fields(document).description as unknown as WireObject).blocks = [{ kind: "wrong", locale: "en", fieldPath: "description", text: "Text" }];
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("rejects a wrong inline-segment discriminator", () => {
    const document = wire();
    (fields(document).description as unknown as WireObject).segments = [{ kind: "wrong", id: "s", fieldPath: "description", raw: "x", localized: { en: "x" } }];
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("checks the optional language-block source type", () => {
    const document = wire();
    (fields(document).description as unknown as WireObject).blocks = [{ kind: "lang-block", locale: "en", fieldPath: "description", text: "Text", source: 42 }];
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("distinguishes a nullable comment range from a non-null inline range", () => {
    const document = wire();
    (fields(document).description as unknown as WireObject).segments = [{ kind: "lang-inline", id: "s", fieldPath: "description", raw: "x", localized: { en: "x" }, rangeInField: null }];
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("checks preview content as optional free text", () => {
    const document = wire();
    (symbol(document).source as WireObject).primaryBlock = { kind: "primary-block", content: "", rangeSource: "manual", confidence: "high", preview: { enabled: true, content: 42 } };
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
  it("preserves an explicitly empty preview body", () => {
    const document = wire();
    (symbol(document).source as WireObject).primaryBlock = { kind: "primary-block", content: "", rangeSource: "manual", confidence: "high", preview: { enabled: true, content: "" } };
    expect(validateHiaDocumentDetailed(document).valid).toBe(true);
  });
  it("requires the declared range of a named source fragment", () => {
    const document = wire();
    (symbol(document).source as WireObject).fragments = [{ kind: "source-fragment", id: "empty", relativePath: "src/empty.js", content: "", rangeSource: "manual", confidence: "high" }];
    expect(validateHiaDocumentDetailed(document).valid).toBe(false);
  });
});
