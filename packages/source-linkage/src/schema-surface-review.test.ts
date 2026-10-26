/**
 * @file
 * @lang zh-CN 常量/schema公开面特征回归：精确身份、配对、模块共享与分发副本；只用公开合成数据，不改变生产语义。
 * @lang en Characterizes constant/schema identities, pairings, module sharing and distribution copies using public synthetic data without changing production semantics.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";
import * as constants from "./constants.js";
import { getHiaSchema, listHiaSchemas } from "../../schemas/src/index.js";

/** @lang zh-CN 十一个运行字符串的精确公开值，不将版本常量当成范围协商或包发行证明。 @lang en Exact values for eleven runtime strings, without interpreting version constants as negotiation ranges or package-publication proof. */
const stringValues = [
  ["DOC_SOURCE_MAP_CONTRACT", "doc-source-map"],
  ["DOC_SOURCE_MAP_CONTRACT_VERSION", "1.0.0"],
  ["DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION", "0.1.0-draft"],
  ["GENERATED_DOCUMENTATION_BINDING_CONTRACT", "generated-documentation-binding"],
  ["GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION", "0.2.0-draft"],
  ["GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION", "0.1.0-draft"],
  ["DOC_SOURCE_MAP_SCHEMA_ID", "https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-1.0.0.schema.json"],
  ["DOC_SOURCE_MAP_SCHEMA_VERSION", "1.0.0"],
  ["GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID", "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.2.0-draft.schema.json"],
  ["GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID", "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.1.0-draft.schema.json"],
  ["GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION", "0.2.0-draft"]
] as const;

/** @lang zh-CN 三个共享schema分别记录根版本、canonical身份与分发原文件；只检查既有精确配对。 @lang en Records each shared schema's root version, canonical identity and original distribution file, checking existing exact pairings only. */
const schemas = [
  { name: "current-map", value: api.DOC_SOURCE_MAP_JSON_SCHEMA, version: "1.0.0", id: api.DOC_SOURCE_MAP_SCHEMA_ID, file: "schemas/doc-source-map.schema.json" },
  { name: "current-binding", value: api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA, version: "0.2.0-draft", id: api.GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID, file: "schemas/generated-documentation-binding.schema.json" },
  { name: "legacy-binding", value: api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA, version: "0.1.0-draft", id: api.GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID, file: "history/generated-documentation-binding-0.1.0-draft.schema.json" }
] as const;

/** @lang zh-CN 收集已知schema对象图的节点身份，用于检查可变子图共享，不执行schema或解析外部引用。 @lang en Collects node identities from known schema graphs to check mutable sharing, without executing schemas or resolving external references. */
function graph(value: unknown, nodes = new Set<object>()): Set<object> {
  if (value && typeof value === "object" && !nodes.has(value)) {
    // <lang><zh-CN>先登记节点再递归，去重共享引用并防止测试自身遇环。</zh-CN><en>Register nodes before descent to deduplicate shared references and avoid test recursion cycles.</en></lang>
    nodes.add(value);
    for (const child of Object.values(value)) graph(child, nodes);
  }
  return nodes;
}

describe("source-linkage constant and schema surface", () => {
  it.each(stringValues)("retains exact string %s", (name, value) => {
    expect(api[name]).toBe(value);
  });
  it("preserves category order and a frozen primitive-only shared tuple", () => {
    // <lang><zh-CN>共享的是已运行时冻结的原语元组；不用schema中的历史不同顺序推断新顺序。</zh-CN><en>The shared value is a runtime-frozen primitive tuple; historical schema ordering does not redefine its public order.</en></lang>
    const values = api.DOC_SOURCE_MAP_RANGE_SOURCES;
    expect(values).toEqual(["source-map", "parser", "compiler", "adapter", "manual", "heuristic", "unresolved"]);
    expect(values).toBe(constants.DOC_SOURCE_MAP_RANGE_SOURCES);
    expect(api.DOC_SOURCE_MAP_JSON_SCHEMA.$defs.rangeSource.enum).toBe(values);
    expect(Object.isFrozen(values)).toBe(true);
    expect(Reflect.set(values, "0", "adapter")).toBe(false);
    expect(Reflect.set(values, "7", "unknown")).toBe(false);
    expect(Reflect.deleteProperty(values, "0")).toBe(false);
  });
  it.each(schemas)("retains dialect, identity, root version and snapshot: $name", entry => {
    // <lang><zh-CN>分发JSON从已跟踪原文件读取，不从被测对象重建期望值。</zh-CN><en>Read distribution JSON from tracked original files rather than regenerating expectations from the subject.</en></lang>
    const distributed = JSON.parse(readFileSync(new URL("../../schemas/src/" + entry.file, import.meta.url), "utf8"));
    expect(entry.value.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(entry.value.$id).toBe(entry.id);
    expect(entry.value.properties.contractVersion.const).toBe(entry.version);
    expect(entry.value).toEqual(distributed);
  });
  it("pins both binding map-linkage and minimum-consumer versions independently", () => {
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("1.0.0");
    expect(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("0.1.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.compatibility.properties.minimumConsumerContractVersion.const).toBe("0.2.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.$defs.compatibility.properties.minimumConsumerContractVersion.const).toBe("0.1.0-draft");
  });
  it.each(schemas)("documents shared runtime mutability and restores it: $name", entry => {
    // <lang><zh-CN>仅在测试中绕过readonly；finally恢复模块共享节点，避免污染其它用例。</zh-CN><en>Bypass readonly only in this test and restore the shared module node in finally to avoid contaminating other cases.</en></lang>
    const leaf = entry.value.$defs.nonEmptyString as { minLength: number };
    const original = leaf.minLength;
    try {
      expect(Object.isFrozen(entry.value)).toBe(false);
      expect(Object.isFrozen(leaf)).toBe(false);
      expect(Object.getOwnPropertyDescriptor(entry.value, "$id")?.writable).toBe(true);
      expect(Reflect.set(leaf, "minLength", 42)).toBe(true);
      expect(entry.value.$defs.nonEmptyString.minLength).toBe(42);
    } finally { leaf.minLength = original; }
    expect(entry.value.$defs.nonEmptyString.minLength).toBe(1);
  });
  it.each(schemas)("gives callers an independent mutable clone: $name", entry => {
    // <lang><zh-CN>clone的深层修改与类别数组修改都不得回写共享导出。</zh-CN><en>Deep edits and category-array edits on a clone must not write back to the shared export.</en></lang>
    const copy = structuredClone(entry.value) as unknown as Record<string, any>;
    copy.$id = "urn:synthetic:local-copy";
    copy.$defs.nonEmptyString.minLength = 42;
    expect(entry.value.$id).toBe(entry.id);
    expect(entry.value.$defs.nonEmptyString.minLength).toBe(1);
    if (entry.name === "current-map") {
      copy.$defs.rangeSource.enum.push("synthetic-extension");
      expect(api.DOC_SOURCE_MAP_RANGE_SOURCES).toHaveLength(7);
    }
  });
  it("shares no mutable graph nodes between any two exported schemas", () => {
    // <lang><zh-CN>比较整张对象图身份，不只抽样一个$defs节点。</zh-CN><en>Compare identities across complete object graphs rather than sampling one definition node.</en></lang>
    const graphs = schemas.map(entry => graph(entry.value));
    for (let left = 0; left < graphs.length; left++) for (let right = left + 1; right < graphs.length; right++) {
      expect([...graphs[left]!].filter(node => graphs[right]!.has(node) && !Object.isFrozen(node))).toEqual([]);
    }
  });
  it.each(schemas)("returns fresh distribution copies by exact identity: $name", entry => {
    // <lang><zh-CN>API副本与owner导出分开验证；改一次副本不影响后续读取和列表。</zh-CN><en>Verify distribution copies separately from owner exports; editing one copy cannot affect later reads or lists.</en></lang>
    const first = getHiaSchema(entry.id)! as Record<string, any>;
    const second = getHiaSchema(entry.id)! as Record<string, any>;
    expect(first).toEqual(entry.value);
    expect(first).not.toBe(second);
    expect(first.$defs.nonEmptyString).not.toBe(second.$defs.nonEmptyString);
    first.$defs.nonEmptyString.minLength = 42;
    expect((getHiaSchema(entry.id)! as Record<string, any>).$defs.nonEmptyString.minLength).toBe(1);
    expect(entry.value.$defs.nonEmptyString.minLength).toBe(1);
    expect(listHiaSchemas().find(schema => schema.$id === entry.id)?.$id).toBe(entry.name === "legacy-binding" ? undefined : entry.id);
  });
  it("keeps current unversioned keys separate from exact historical ids", () => {
    expect(getHiaSchema("doc-source-map")).toEqual(api.DOC_SOURCE_MAP_JSON_SCHEMA);
    expect(getHiaSchema("generated-documentation-binding")).toEqual(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA);
    expect(getHiaSchema(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID)).toEqual(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA);
    expect(getHiaSchema(api.GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID + "?version=latest")).toBeUndefined();
    expect(getHiaSchema(api.DOC_SOURCE_MAP_SCHEMA_ID.replace("1.0.0", "1.0.1"))).toBeUndefined();
  });
});
