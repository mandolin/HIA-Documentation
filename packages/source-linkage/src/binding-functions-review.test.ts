/**
 * @file
 * @lang zh-CN 两个公开绑定函数的已声明扩展容器回归和剩余组合责任特征，不复制旧输入/版本专项。
 * @lang en Regressions for declared extension containers and remaining composition responsibilities in two public binding functions, without duplicating prior input/version suites.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, createGeneratedDocumentationBindingIndex, migrateGeneratedDocumentationBindingBundle, validateGeneratedDocumentationBinding } from "./index.js";

/** @lang zh-CN 独立解析公开样本，按已确认字段构造当前配对，不调用被测函数制造输入。 @lang en Parses a public fixture independently and constructs the current pair using approved fields without manufacturing input through functions under test. */
function fixture(current: boolean): any {
  // <lang><zh-CN>每次独立读取，避免红例污染其它测试或原样本。</zh-CN><en>Read independently per case, preventing failing cases from contaminating other tests or the original fixture.</en></lang>
  const pair = JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8"));
  if (current) {
    pair.documentMap.contractVersion = "1.0.0";
    pair.documentMap.generatedBindingSidecars[0].contractVersion = "0.2.0-draft";
    pair.bindingSidecar.contractVersion = "0.2.0-draft";
    pair.bindingSidecar.docSourceMapLinkage.contractVersion = "1.0.0";
    pair.bindingSidecar.compatibility.minimumConsumerContractVersion = "0.2.0-draft";
  }
  return { docSourceMap: pair.documentMap, bindingSidecars: [pair.bindingSidecar] };
}

describe.each([false, true])("public binding function responsibilities, current=%s", current => {
  it.each([null, [], "SYNTHETIC_PRIVATE_EXTENSION", 7, false].map((value, id) => ({ value, id })))("rejects malformed root adapterExtensions $id through all consumers", ({ value }) => {
    // <lang><zh-CN>root已声明object容器，optional不允许存在时错型；错误不得回显实际值。</zh-CN><en>The root declares an object container: optional does not admit a wrong type when present, and errors must not echo the actual value.</en></lang>
    const input = fixture(current), sidecar = input.bindingSidecars[0];
    sidecar.adapterExtensions = value;
    const before = JSON.stringify(input), diagnostics = validateGeneratedDocumentationBinding(sidecar, { path: "context/sidecar.json" });
    expect(diagnostics.some(item => item.code === "GENERATED_DOCUMENTATION_BINDING_INVALID" && item.targetPath === "context/sidecar.json.adapterExtensions")).toBe(true);
    const index = createGeneratedDocumentationBindingIndex(sidecar, { docSourceMapIndex: createDocSourceMapIndex(input.docSourceMap) });
    expect(index.status).toBe("invalid");
    expect(index.bindings).toEqual([]);
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.status).toBe("invalid");
    expect(Object.hasOwn(result, "bundle")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PRIVATE_EXTENSION");
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each([null, [], "SYNTHETIC_PRIVATE_EXTENSION", 7, false].map((value, id) => ({ value, id })))("rejects malformed binding adapterExtensions $id through all consumers", ({ value }) => {
    // <lang><zh-CN>声明节点的扩展容器与根使用同一类型约束，诊断只含固定模型路径。</zh-CN><en>Binding-level extensions use the same type constraint as the root, with diagnostics restricted to fixed model paths.</en></lang>
    const input = fixture(current), sidecar = input.bindingSidecars[0];
    sidecar.bindings[0].adapterExtensions = value;
    const before = JSON.stringify(input), diagnostics = validateGeneratedDocumentationBinding(sidecar, { path: "context/sidecar.json" });
    expect(diagnostics.some(item => item.code === "GENERATED_DOCUMENTATION_BINDING_INVALID" && item.targetPath === "context/sidecar.json.bindings.0.adapterExtensions")).toBe(true);
    const index = createGeneratedDocumentationBindingIndex(sidecar, { docSourceMapIndex: createDocSourceMapIndex(input.docSourceMap) });
    expect(index.status).toBe("invalid");
    expect(index.targets).toEqual([]);
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.status).toBe("invalid");
    expect(Object.hasOwn(result, "bundle")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PRIVATE_EXTENSION");
    expect(JSON.stringify(input)).toBe(before);
  });
  it("admits absent, empty and null-prototype object extensions", () => {
    // <lang><zh-CN>补类型约束不取消可省略、空对象和普通JSON null原型对象的既有能力。</zh-CN><en>Enforcing types preserves omitted, empty-object and ordinary-JSON null-prototype extension support.</en></lang>
    const input = fixture(current), sidecar = input.bindingSidecars[0];
    sidecar.adapterExtensions = {};
    sidecar.bindings[0].adapterExtensions = Object.assign(Object.create(null), { note: "synthetic allowed metadata" });
    expect(validateGeneratedDocumentationBinding(sidecar)).toEqual([]);
    expect(migrateGeneratedDocumentationBindingBundle(input).status).toBe(current ? "already-current" : "migrated");
    delete sidecar.adapterExtensions;
    delete sidecar.bindings[0].adapterExtensions;
    expect(validateGeneratedDocumentationBinding(sidecar)).toEqual([]);
  });
  it("admits an explicitly empty sidecar set when the map has no binding associations", () => {
    // <lang><zh-CN>完整集合可以为空；没有声明/引用时不要求虚构辅助工件。</zh-CN><en>A complete set may be empty; absent declarations/references do not require invented sidecars.</en></lang>
    const input = fixture(current);
    input.docSourceMap.generatedBindingSidecars = [];
    input.docSourceMap.entries[0].generatedBindingRefs = [];
    input.bindingSidecars = [];
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.status).toBe(current ? "already-current" : "migrated");
    expect(result.bundle!.bindingSidecars).toEqual([]);
  });
  it("does not authenticate external symbols or require an optional mapping identity", () => {
    // <lang><zh-CN>symbol-only目标及缺省docSourceMapId均按既有wire消费；不读取外部符号工件猜测真实性。</zh-CN><en>Consume symbol-only targets and omitted docSourceMapId under existing wire rules, without loading external artifacts to infer symbol authenticity.</en></lang>
    const input = fixture(current), sidecar = input.bindingSidecars[0];
    delete sidecar.docSourceMapLinkage.docSourceMapId;
    sidecar.targets[0].identity = { kind: "documentation-symbol", symbolId: "symbol:external-synthetic" };
    expect(validateGeneratedDocumentationBinding(sidecar)).toEqual([]);
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.status).toBe(current ? "already-current" : "migrated");
    expect(result.bundle!.bindingSidecars[0]!.targets).toEqual(sidecar.targets);
  });
  it("separates standalone owner validity from the supplied source closure", () => {
    // <lang><zh-CN>owner只看sidecar，迁移才有实际map来核scope.sourceId闭包；不把单工件空诊断当组认证。</zh-CN><en>The owner sees only the sidecar; migration has the actual map to check scope.sourceId closure, so an empty standalone diagnostic list is not bundle certification.</en></lang>
    const input = fixture(current), sidecar = input.bindingSidecars[0];
    sidecar.bindings[0].scope.sourceId = "source:outside-map";
    expect(validateGeneratedDocumentationBinding(sidecar)).toEqual([]);
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.status).toBe("invalid");
    expect(Object.hasOwn(result, "bundle")).toBe(false);
  });
  it("preserves opaque expansion scopes and inert extension text", () => {
    // <lang><zh-CN>scopeId只按已有非空引用规则消费，不推导词法相等；表达式样式的扩展仅为JSON文本。</zh-CN><en>Consume scopeId under its existing nonempty-reference rule without inferring lexical equality; expression-like extension content remains JSON text.</en></lang>
    const input = fixture(current), sidecar = input.bindingSidecars[0];
    sidecar.expansions[0].scopeId = "opaque:synthetic-expansion-scope";
    sidecar.adapterExtensions = { expression: "(() => { throw new Error('SYNTHETIC_NOT_EXECUTED'); })()", versionNote: "0.1.0-draft is passive text" };
    expect(validateGeneratedDocumentationBinding(sidecar)).toEqual([]);
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.status).toBe(current ? "already-current" : "migrated");
    expect((result.bundle!.bindingSidecars[0]!.expansions as any[])[0].scopeId).toBe("opaque:synthetic-expansion-scope");
    expect(result.bundle!.bindingSidecars[0]!.adapterExtensions).toEqual(sidecar.adapterExtensions);
  });
});
