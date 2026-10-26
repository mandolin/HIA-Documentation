/**
 * @file
 * @lang zh-CN 绑定索引公开字段与四查询回归，覆盖undefined可选符号宽匹配、原值身份、各自顺序、去重及冻结借用语义。
 * @lang en Public binding-index/four-query regressions covering undefined optional-symbol broad matches, verbatim identities, distinct ordering, deduplication and frozen borrowing semantics.
 */
import { describe, expect, it } from "vitest";
import input from "../../../fixtures/source-linkage/generated-binding-input.json";
import { createDocSourceMapIndex, createGeneratedDocumentationBindingIndex, createGeneratedDocumentationBindingHostProjection, findGeneratedTargetsForBinding, findGeneratedBindingsForTarget, findGeneratedBindingsForTargetSymbol, findGeneratedBindingsForDocSourceMapEntry, type GeneratedDocumentationBindingIndex } from "./index.js";

/** @lang zh-CN 四查询保留原签名，测试通过运行时调用模拟类型边界外的调用者。 @lang en The four queries retain their signatures; runtime calls simulate callers crossing the type boundary. */
const queries = [findGeneratedTargetsForBinding, findGeneratedBindingsForTarget, findGeneratedBindingsForTargetSymbol, findGeneratedBindingsForDocSourceMapEntry];
/** @lang zh-CN 每例独立复制公开合成配对，只切换已确认的新/旧版本。 @lang en Each case independently copies the public synthetic pair, changing only approved current/legacy versions. */
function pair(current: boolean) {
  const value = structuredClone(input);
  if (current) {
    value.documentMap.contractVersion = "1.0.0";
    value.documentMap.generatedBindingSidecars[0]!.contractVersion = "0.2.0-draft";
    value.bindingSidecar.contractVersion = "0.2.0-draft";
    value.bindingSidecar.docSourceMapLinkage.contractVersion = "1.0.0";
    value.bindingSidecar.compatibility.minimumConsumerContractVersion = "0.2.0-draft";
  }
  return value;
}
/** @lang zh-CN 只经公开工厂构造索引，不用伪造metadata测试成功路径。 @lang en Constructs indexes through public factories only, never fabricated successful metadata. */
function indexFor(value: ReturnType<typeof pair>): GeneratedDocumentationBindingIndex {
  return createGeneratedDocumentationBindingIndex(value.bindingSidecar, { docSourceMapIndex: createDocSourceMapIndex(value.documentMap) });
}
/** @lang zh-CN 丰富图故意令声明顺序与展开边顺序不同，验证各查询既有顺序而非统一排序。 @lang en A richer graph deliberately separates declaration order from expansion-edge order, checking existing query ordering rather than imposing one sort. */
function richPair(current: boolean) {
  const value = pair(current);
  // <lang><zh-CN>第二绑定有独立scope，两个文档条目分别关联不同绑定。</zh-CN><en>The second binding has an independent scope; two documentation entries link distinct bindings.</en></lang>
  const second = structuredClone(value.bindingSidecar.bindings[0]!);
  second.id = "binding:second";
  second.scope.id = "gdb-scope/v1/pug/source-synthetic#root/second";
  second.scope.declarationSlot = "second";
  second.bindingRef.rootDeclarationId = "declaration:second";
  value.bindingSidecar.bindings.push(second);
  const secondEntry = structuredClone(value.documentMap.entries[0]!);
  secondEntry.id = "entry:second";
  secondEntry.generatedBindingRefs = [{ bindingId: second.id, sidecarId: "sidecar:synthetic" }];
  value.documentMap.entries.push(secondEntry);
  // <lang><zh-CN>目标声明顺序synthetic/other，第一绑定的展开引用顺序则other/synthetic。</zh-CN><en>Targets are declared synthetic/other, while the first binding references other/synthetic.</en></lang>
  const other = structuredClone(value.bindingSidecar.targets[0]!);
  other.id = "target:other";
  value.bindingSidecar.targets.push(other);
  value.bindingSidecar.expansions[0]!.targetIds = [other.id, "target:synthetic"];
  value.bindingSidecar.expansions[0]!.order = 9;
  const expansion = structuredClone(value.bindingSidecar.expansions[0]!);
  expansion.id = "expansion:second";
  expansion.bindingId = second.id;
  expansion.scopeId = second.scope.id;
  expansion.order = 0;
  expansion.instanceKey.key = "gdb-key/v1/string:second";
  expansion.targetIds = ["target:synthetic", other.id];
  value.bindingSidecar.expansions.unshift(expansion);
  return value;
}

describe.each([false, true])("binding-index review, current=%s", (current) => {
  describe.each(queries.map(query => [query.name, query] as const))("%s runtime identifiers", (_name, query) => {
    it.each([{ name: "undefined", value: undefined }, { name: "null", value: null }, { name: "number", value: 0 }, { name: "boolean", value: false }, { name: "bigint", value: 1n }, { name: "symbol", value: Symbol("synthetic") }, { name: "boxed", value: new String("symbol:synthetic") }, { name: "record", value: {} }])("returns frozen emptiness for $name", ({ value: identifier }) => {
      // <lang><zh-CN>artifact-only目标合法，缺省symbolId不能等同缺省查询参数。</zh-CN><en>An artifact-only target is valid; an omitted symbolId must not equal an omitted query argument.</en></lang>
      const value = pair(current);
      Reflect.deleteProperty(value.bindingSidecar.targets[0]!.identity, "symbolId");
      const index = indexFor(value);
      expect(index.status).toBe("available");
      const result = query(index, identifier as never);
      expect(result).toEqual([]);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  it("does not convert objects or execute identifier conversion hooks", () => {
    let calls = 0;
    const identifier = Object.defineProperty({}, Symbol.toPrimitive, { get() { calls++; throw new Error("PRIVATE-CONVERSION"); } });
    const index = indexFor(pair(current));
    for (const query of queries) expect(query(index, identifier as never)).toEqual([]);
    expect(calls).toBe(0);
  });

  it("retains whitespace, case and Unicode as exact opaque identities", () => {
    const value = pair(current);
    value.bindingSidecar.bindings[0]!.id = " Binding:Case 名称 ";
    value.bindingSidecar.expansions[0]!.bindingId = value.bindingSidecar.bindings[0]!.id;
    value.documentMap.entries[0]!.generatedBindingRefs[0]!.bindingId = value.bindingSidecar.bindings[0]!.id;
    value.bindingSidecar.targets[0]!.id = " Target:Case 目标 ";
    value.bindingSidecar.expansions[0]!.targetIds = [value.bindingSidecar.targets[0]!.id];
    value.bindingSidecar.targets[0]!.identity.symbolId = " Symbol:Case 符号 ";
    value.documentMap.entries[0]!.id = " Entry:Case 条目 ";
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const identifiers = [value.bindingSidecar.bindings[0]!.id, value.bindingSidecar.targets[0]!.id, value.bindingSidecar.targets[0]!.identity.symbolId, value.documentMap.entries[0]!.id];
    queries.forEach((query, offset) => {
      expect(query(index, identifiers[offset]!)).toHaveLength(1);
      expect(query(index, identifiers[offset]!.trim())).toEqual([]);
      expect(query(index, identifiers[offset]!.toLowerCase())).toEqual([]);
      expect(query(index, "")).toEqual([]);
    });
  });

  it("retains forward target order from first-seen expansion edges", () => {
    const index = indexFor(richPair(current));
    expect(index.status).toBe("available");
    expect(index.targets.map(target => target.id)).toEqual(["target:synthetic", "target:other"]);
    expect(findGeneratedTargetsForBinding(index, "binding:synthetic").map(target => target.id)).toEqual(["target:other", "target:synthetic"]);
    expect(findGeneratedTargetsForBinding(index, "binding:second").map(target => target.id)).toEqual(["target:synthetic", "target:other"]);
    // <lang><zh-CN>宿主投影按全局目标声明顺序筛选，与便捷查询的边顺序不同但保持原设计。</zh-CN><en>Host projection filters global target declaration order, distinct from query-edge order under the existing design.</en></lang>
    expect(createGeneratedDocumentationBindingHostProjection(index).bindings[0]!.targets.map(target => target.id)).toEqual(["target:synthetic", "target:other"]);
  });

  it("retains reverse binding order from first-seen expansion edges", () => {
    const index = indexFor(richPair(current));
    expect(index.status).toBe("available");
    expect(index.bindings.map(binding => binding.id)).toEqual(["binding:synthetic", "binding:second"]);
    expect(findGeneratedBindingsForTarget(index, "target:synthetic").map(binding => binding.id)).toEqual(["binding:second", "binding:synthetic"]);
  });

  it("deduplicates symbol results across multiple targets without reordering", () => {
    const index = indexFor(richPair(current));
    expect(index.status).toBe("available");
    expect(findGeneratedBindingsForTargetSymbol(index, "symbol:synthetic").map(binding => binding.id)).toEqual(["binding:second", "binding:synthetic"]);
  });

  it("filters entry relations in binding declaration order", () => {
    const value = richPair(current);
    value.documentMap.entries[0]!.generatedBindingRefs.push({ bindingId: "binding:second", sidecarId: "sidecar:synthetic" });
    const index = indexFor(value);
    expect(index.status).toBe("available");
    expect(findGeneratedBindingsForDocSourceMapEntry(index, "entry:synthetic").map(binding => binding.id)).toEqual(["binding:synthetic", "binding:second"]);
    expect(index.linkedDocSourceMapEntryCount).toBe(2);
    expect(index.targets[0]!.docSourceMapEntryIds).toEqual(["entry:synthetic", "entry:second"]);
  });

  it("returns independent frozen lists borrowing the original frozen nodes", () => {
    const index = indexFor(pair(current));
    const before = JSON.stringify(index);
    const identifiers = ["binding:synthetic", "target:synthetic", "symbol:synthetic", "entry:synthetic"];
    queries.forEach((query, offset) => {
      const result = query(index, identifiers[offset]!);
      expect(result).toHaveLength(1);
      expect(Object.isFrozen(result)).toBe(true);
      expect(result[0]).toBe(offset === 0 ? index.targets[0] : index.bindings[0]);
      expect(Object.isFrozen(result[0])).toBe(true);
      expect(query(index, identifiers[offset]!)).not.toBe(result);
    });
    expect(JSON.stringify(index)).toBe(before);
  });

  it.each(["invalid", "unsupported-version"])("keeps %s factory indexes unqueryable", (status) => {
    const value = pair(current);
    if (status === "invalid") value.bindingSidecar.bindings[0]!.resolution.confidence = "invalid";
    else value.documentMap.contractVersion = "99.0.0";
    const index = indexFor(value);
    expect(index.status).toBe(status);
    queries.forEach((query, offset) => expect(query(index, ["binding:synthetic", "target:synthetic", "symbol:synthetic", "entry:synthetic"][offset]!)).toEqual([]));
  });

  it("keeps indexed metadata, optional range precision and count meanings", () => {
    const value = pair(current);
    Object.assign(value.bindingSidecar.targets[0]!.identity, { range: { start: { line: 7 }, end: { line: 8 } } });
    Object.assign(value.bindingSidecar.bindings[0]!.scope, { aliasMetadata: ["PRIVATE-ALIAS"] });
    Object.assign(value.bindingSidecar.bindings[0]!.sourceIntent, { locale: "zh-CN" });
    const index = indexFor(value);
    expect(index.status).toBe("available");
    expect(index).toMatchObject({ bindingCount: 1, docSourceMapEntryCount: 1, expansionCount: 1, linkedDocSourceMapEntryCount: 1, targetCount: 1, unlinkedBindingCount: 0, sidecarId: "sidecar:synthetic", contractVersion: current ? "0.2.0-draft" : "0.1.0-draft" });
    expect(index.bindings[0]!.scope).toEqual({ adapterId: "pug", declarationSlot: "declaration", id: "gdb-scope/v1/pug/source-synthetic#root/declaration", semanticAncestry: ["root"], sourceId: "source:synthetic" });
    expect(index.bindings[0]!.sourceIntent).toEqual({ field: "description", kind: "documentation-field", sourceId: "source:synthetic", sourceRange: { start: { line: 1, column: 1 }, end: { line: 3, column: 4 } } });
    expect(index.targets[0]!.identity.range).toEqual({ start: { line: 7 }, end: { line: 8 } });
    expect(Object.isFrozen(index.targets[0]!.identity.range!.start)).toBe(true);
    expect(JSON.stringify(index)).not.toContain("PRIVATE-ALIAS");
    expect(Object.hasOwn(index.bindings[0]!.sourceIntent, "locale")).toBe(false);
  });
});
