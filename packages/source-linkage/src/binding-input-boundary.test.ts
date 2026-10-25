/**
 * @file
 * @lang zh-CN 旧绑定辅助工件的纯数据、隐私、字段与索引失败隔离回归，使用公开合成配对。
 * @lang en Regression coverage for legacy binding data/privacy/field/index failure isolation using a public synthetic pair.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, createGeneratedDocumentationBindingIndex, validateGeneratedDocumentationBinding } from "./index.js";

/** @lang zh-CN 每次解析返回独立合成工件，测试不修改历史fixture。 @lang en Parses independent synthetic artifacts for each test without changing historical fixtures. */
function fixture(): { documentMap: Record<string, any>; bindingSidecar: Record<string, any> } {
  return JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8"));
}
/** @lang zh-CN 同时检查validator拒绝及组合器零条目，不把仅有诊断当作隔离成功。 @lang en Checks both validator rejection and zero-entry composition rather than treating diagnostics alone as isolation. */
function expectRejected(value: unknown): void {
  const diagnostics = validateGeneratedDocumentationBinding(value);
  expect(diagnostics.some((diagnostic) => diagnostic.severity === "error")).toBe(true);
  const index = createGeneratedDocumentationBindingIndex(value, { docSourceMapIndex: createDocSourceMapIndex(fixture().documentMap) });
  expect(index.status).not.toBe("available");
  expect(index.bindings).toEqual([]);
  expect(index.expansions).toEqual([]);
  expect(index.targets).toEqual([]);
}
/** @lang zh-CN 在测试拥有的工件中替换已声明字段，不解释字符串路径。 @lang en Replaces declared fields inside test-owned artifacts without interpreting string paths. */
function setField(value: Record<string, any>, keys: readonly (string | number)[], replacement: unknown): void {
  let parent: any = value;
  for (const key of keys.slice(0, -1)) parent = parent[key];
  parent[keys.at(-1)!] = replacement;
}

describe("generated binding input boundary", () => {
  it.each([null, [], false, 42, new Date(0), new Map()].map((value, id) => ({ value, id })))("rejects non-JSON roots $id", ({ value }) => expectRejected(value));

  it.each(["contractVersion", "id", "bindings", "adapterExtensions"])("does not execute root %s getters, including index header reads", (field) => {
    let reads = 0;
    const value = Object.defineProperty(fixture().bindingSidecar, field, { get() { reads += 1; throw new Error("synthetic-private"); } });
    expectRejected(value);
    expect(reads).toBe(0);
  });

  it("does not execute hidden known getters", () => {
    let reads = 0;
    const value = fixture().bindingSidecar;
    Object.defineProperty(value.bindings[0].sourceIntent, "sourceRef", { enumerable: false, get() { reads += 1; throw new Error("synthetic-private"); } });
    expectRejected(value);
    expect(reads).toBe(0);
  });

  it.each(["bindings", "expansions", "targets", "diagnostics"])("rejects invalid %s items instead of filtering them", (field) => {
    const value = fixture().bindingSidecar;
    value[field].push(null, "synthetic-private", 42);
    expectRejected(value);
  });

  it.each([
    { keys: ["bindings", 0, "bindingRef", "kind"], value: "unknown" },
    { keys: ["bindings", 0, "bindingRef", "memberPath"], value: ["name", 42] },
    { keys: ["bindings", 0, "sourceIntent", "field"], value: 42 },
    { keys: ["bindings", 0, "sourceIntent", "locale"], value: false },
    { keys: ["bindings", 0, "scope", "aliasMetadata"], value: [42] },
    { keys: ["bindings", 0, "scope", "stableUpstreamId"], value: false },
    { keys: ["bindings", 0, "composition", "mergePolicy"], value: "unknown" },
    { keys: ["deterministicLocalsPolicy", "mode"], value: "unknown" },
    { keys: ["deterministicLocalsPolicy", "bindingAllowlist"], value: [42] },
    { keys: ["deterministicLocalsPolicy", "prohibitedSources"], value: ["unknown"] },
    { keys: ["deterministicLocalsPolicy", "inputId"], value: 42 },
    { keys: ["compatibility", "minimumConsumerContractVersion"], value: "1.0.0" },
    { keys: ["compatibility", "unknownFieldPolicy"], value: "execute" },
    { keys: ["compatibility", "breakingChangePolicy"], value: "overwrite" },
    { keys: ["docSourceMapLinkage", "docSourceMapId"], value: 42 },
    { keys: ["targets", 0, "identity", "selector"], value: 42 },
    { keys: ["targets", 0, "identity", "artifactId"], value: 42 },
    { keys: ["targets", 0, "identity", "range"], value: { start: { line: 0 }, end: { line: 1 } } },
    { keys: ["expansions", 0, "order"], value: -1 },
    { keys: ["expansions", 0, "order"], value: Number.MAX_SAFE_INTEGER + 1 }
  ])("rejects malformed declared field $keys", ({ keys, value }) => {
    const input = fixture().bindingSidecar;
    setField(input, keys, value);
    expectRejected(input);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid one-based source coordinates %s", (line) => {
    const value = fixture().bindingSidecar;
    value.bindings[0].sourceIntent.sourceRef.range.start.line = line;
    expectRejected(value);
  });

  it("rejects reversed ranges and unknown provenance categories", () => {
    const value = fixture().bindingSidecar;
    value.bindings[0].sourceIntent.sourceRef.range.end = { line: 1 };
    value.bindings[0].sourceIntent.sourceRef.range.start = { line: 2 };
    expectRejected(value);
    value.bindings[0].sourceIntent.sourceRef.range.start = { line: 1 };
    value.bindings[0].sourceIntent.sourceRef.rangeSource = "unknown";
    expectRejected(value);
  });

  it("rejects cyclic extensions without recursion overflow", () => {
    const value = fixture().bindingSidecar;
    value.adapterExtensions = { cycle: value };
    expectRejected(value);
  });

  it("turns proxy reflection failures into fixed diagnostics", () => {
    const value = new Proxy({}, { ownKeys() { throw new Error("synthetic-private"); }, get() { throw new Error("synthetic-private"); }, getOwnPropertyDescriptor() { throw new Error("synthetic-private"); } });
    expectRejected(value);
    expect(JSON.stringify(validateGeneratedDocumentationBinding(value))).not.toContain("synthetic-private");
  });

  it("accepts deep ordinary extensions without recursion or shared-data mutation", () => {
    const pair = fixture();
    const root: Record<string, unknown> = {};
    let current = root;
    for (let depth = 0; depth < 8000; depth += 1) { const next = {}; current.next = next; current = next; }
    pair.bindingSidecar.adapterExtensions = { first: root, shared: root };
    expect(validateGeneratedDocumentationBinding(pair.bindingSidecar)).toEqual([]);
    const index = createGeneratedDocumentationBindingIndex(pair.bindingSidecar, { docSourceMapIndex: createDocSourceMapIndex(pair.documentMap) });
    expect(index.status).toBe("available");
    expect(index.bindings[0]?.id).toBe("binding:synthetic");
    expect(Object.isFrozen(root)).toBe(false);
  });

  it("does not copy private extension key names into privacy diagnostics", () => {
    const value = fixture().bindingSidecar;
    value.adapterExtensions = { "synthetic-private-name": { sourceBody: "synthetic-private-value" } };
    const diagnostics = validateGeneratedDocumentationBinding(value, { path: "sidecar.json" });
    expect(diagnostics.some((diagnostic) => diagnostic.code === "GENERATED_DOCUMENTATION_BINDING_PRIVACY_VIOLATION")).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toContain("synthetic-private");
  });

  it("retains supported legacy pairs, unknown optional fields, input identity and frozen output", () => {
    const pair = fixture();
    pair.bindingSidecar.x_optional = { value: "synthetic" };
    const before = JSON.stringify(pair);
    expect(validateGeneratedDocumentationBinding(pair.bindingSidecar)).toEqual([]);
    const index = createGeneratedDocumentationBindingIndex(pair.bindingSidecar, { docSourceMapIndex: createDocSourceMapIndex(pair.documentMap) });
    expect(index).toMatchObject({ status: "available", bindingCount: 1, expansionCount: 1, targetCount: 1, linkedDocSourceMapEntryCount: 1 });
    expect(Object.isFrozen(index.bindings[0])).toBe(true);
    expect(JSON.stringify(pair)).toBe(before);
  });
});
