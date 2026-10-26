/**
 * @file
 * @lang zh-CN 绑定索引的自有选项、消费头部与合法前置索引传播回归，仅用公开合成fixture。
 * @lang en Own-option/consumed-header regressions and valid prerequisite-index propagation for binding indexes, using public synthetic fixtures only.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";

/** @lang zh-CN 返回独立有效旧配对，避免跨测试共享突变。 @lang en Returns an independent valid legacy pair to avoid shared mutation between tests. */
function pair(): any { return JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8")); }
/** @lang zh-CN 前置索引必须来自真实公共工厂；派生容器只改变头部形状。 @lang en Prerequisite indexes come from the real public factory; derived containers change header shape only. */
function options(): api.GeneratedDocumentationBindingIndexOptions { return { docSourceMapIndex: api.createDocSourceMapIndex(pair().documentMap), path: "context/binding.json" }; }
/** @lang zh-CN 运行时错误输入不扩大产品静态类型。 @lang en Runtime malformed inputs do not widen product static types. */
function invoke(value: unknown, sidecar: unknown = pair().bindingSidecar) { return api.createGeneratedDocumentationBindingIndex(sidecar, value as api.GeneratedDocumentationBindingIndexOptions); }
/** @lang zh-CN 非法选项/头部必须为固定、冻结的空拒绝，不回显部分诊断或输入。 @lang en Invalid options/headers yield fixed frozen empty refusal without partial diagnostics or input echoes. */
function refused(value: unknown, sidecar: unknown = pair().bindingSidecar) {
  const result = invoke(value, sidecar);
  expect(result).toMatchObject({ status: "invalid", bindingCount: 0, expansionCount: 0, targetCount: 0, docSourceMapEntryCount: 0, bindings: [], expansions: [], targets: [] });
  expect(result.diagnostics).toHaveLength(1);
  expect(result.diagnostics[0]?.code).toBe("GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE");
  expect(JSON.stringify(result)).not.toContain("synthetic-private");
  expect(JSON.stringify(result.diagnostics)).not.toContain("targetPath");
  expect(Object.hasOwn(result, "sidecarId")).toBe(false);
  expect(Object.isFrozen(result) && Object.isFrozen(result.bindings) && Object.isFrozen(result.diagnostics)).toBe(true);
}

describe("binding index options and prerequisite headers", () => {
  it.each([
    { name: "undefined", make: () => undefined }, { name: "null", make: () => null }, { name: "boolean", make: () => false },
    { name: "number", make: () => 0 }, { name: "string", make: () => "path" }, { name: "array", make: () => [] },
    { name: "function", make: () => () => undefined }, { name: "date", make: () => new Date(0) }, { name: "inherited", make: () => Object.create(options()) }
  ])("rejects $name option roots", ({ make }) => { refused(make()); });

  it.each([
    { name: "null", make: () => null }, { name: "boolean", make: () => false }, { name: "number", make: () => 0 },
    { name: "array", make: () => [] }, { name: "object", make: () => ({}) }, { name: "boxed", make: () => new String("path") },
    { name: "symbol", make: () => Symbol("synthetic-private") }, { name: "bigint", make: () => 1n }, { name: "function", make: () => () => undefined }
  ])("rejects $name paths", ({ make }) => { refused({ ...options(), path: make() }); });

  it.each([
    { name: "missing", make: () => undefined }, { name: "null", make: () => null }, { name: "boolean", make: () => false },
    { name: "number", make: () => 0 }, { name: "string", make: () => "index" }, { name: "array", make: () => [] },
    { name: "function", make: () => () => undefined }, { name: "date", make: () => new Date(0) }, { name: "empty", make: () => ({}) }
  ])("rejects $name prerequisite indexes", ({ make }) => { refused({ docSourceMapIndex: make() }); });

  for (const field of ["path", "docSourceMapIndex"]) {
    it.each(["valid", "invalid"])(`does not execute ${field} getter for %s sidecar`, state => {
      let reads = 0;
      const input = Object.defineProperty(options(), field, { get() { reads += 1; throw new Error("synthetic-private"); } });
      refused(input, state === "valid" ? pair().bindingSidecar : {});
      expect(reads).toBe(0);
    });
    it(`rejects setter-only ${field}`, () => { refused(Object.defineProperty(options(), field, { set() { throw new Error("synthetic-private"); } })); });
  }

  it.each(["contract", "contractVersion", "id", "status", "diagnostics", "entries", "bindingSidecars", "entryCount"])("rejects known %s header accessors", field => {
    let reads = 0;
    const input = options();
    Object.defineProperty(input.docSourceMapIndex, field, { get() { reads += 1; throw new Error("synthetic-private"); } });
    refused(input);
    expect(reads).toBe(0);
  });

  it.each([
    { contract: "other" }, { status: "success" }, { diagnostics: null }, { entries: null }, { bindingSidecars: null },
    { entryCount: -1 }, { entryCount: NaN }, { entryCount: 0.5 }, { entryCount: 1000 }, { id: false }, { contractVersion: 42 }
  ])("rejects malformed consumed headers %j", patch => { const input = options(); Object.assign(input.docSourceMapIndex, patch); refused(input); });

  for (const target of ["options", "index"]) {
    it.each(["prototype", "descriptor", "revoked"])(`contains ${target} %s reflection failure`, trap => {
      const revoked = Proxy.revocable({}, {}); revoked.revoke();
      const proxy = trap === "revoked" ? revoked.proxy : new Proxy({}, trap === "prototype" ? { getPrototypeOf() { throw new Error("synthetic-private"); } } : { getOwnPropertyDescriptor() { throw new Error("synthetic-private"); } });
      refused(target === "options" ? proxy : { docSourceMapIndex: proxy });
    });
  }

  it.each(["plain", "null"])("accepts frozen %s options/headers and ignores extensions", prototype => {
    // <lang><zh-CN>头部可来自工厂结果的同形数据包装；这不是品牌/来源认证。</zh-CN><en>A header may be an equivalent data wrapper of factory output; this is not brand/origin authentication.</en></lang>
    let reads = 0;
    const header = Object.assign(Object.create(prototype === "null" ? null : Object.prototype), options().docSourceMapIndex);
    Object.defineProperty(header, "x_private", { get() { reads += 1; throw new Error("synthetic-private"); } });
    const input = Object.assign(Object.create(prototype === "null" ? null : Object.prototype), { docSourceMapIndex: Object.freeze(header) });
    Object.defineProperty(input, "x_private", { get() { reads += 1; throw new Error("synthetic-private"); } });
    input.self = input;
    expect(invoke(Object.freeze(input)).status).toBe("available");
    expect(reads).toBe(0);
  });

  it.each(["omitted", "undefined", "empty", "whitespace", "normal"])("retains %s path behavior", state => {
    const path = state === "empty" ? "" : state === "whitespace" ? " " : "context/binding.json";
    const input = { docSourceMapIndex: options().docSourceMapIndex, ...(state === "omitted" ? {} : { path: state === "undefined" ? undefined : path }) };
    expect(invoke(input).status).toBe("available");
  });

  it("reads consumed descriptors once without get or ownKeys", () => {
    const seen: string[] = [];
    const input = options();
    const header = new Proxy(input.docSourceMapIndex, { get() { throw new Error("synthetic-private"); }, ownKeys() { throw new Error("synthetic-private"); }, getOwnPropertyDescriptor(target, key) { seen.push(String(key)); return Reflect.getOwnPropertyDescriptor(target, key); } });
    const rootSeen: string[] = [];
    const root = new Proxy({ docSourceMapIndex: header }, { get() { throw new Error("synthetic-private"); }, ownKeys() { throw new Error("synthetic-private"); }, getOwnPropertyDescriptor(target, key) { rootSeen.push(String(key)); return Reflect.getOwnPropertyDescriptor(target, key); } });
    expect(invoke(root).status).toBe("available");
    expect(rootSeen.sort()).toEqual(["docSourceMapIndex", "path"]);
    expect(seen.sort()).toEqual(["bindingSidecars", "contract", "contractVersion", "diagnostics", "entries", "entryCount", "id", "status"]);
  });

  it.each([false, true])("snapshots headers before sidecar reflection (failure=%s)", fail => {
    let reads = 0;
    const input = options();
    const header = input.docSourceMapIndex;
    const sidecar = new Proxy(pair().bindingSidecar, { getPrototypeOf(target) {
      for (const key of ["path", "docSourceMapIndex"]) Object.defineProperty(input, key, { configurable: true, get() { reads += 1; throw new Error("synthetic-private"); } });
      for (const key of ["status", "entries", "bindingSidecars", "entryCount", "id"]) Object.defineProperty(header, key, { configurable: true, get() { reads += 1; throw new Error("synthetic-private"); } });
      if (fail) throw new Error("synthetic-private");
      return Reflect.getPrototypeOf(target);
    } });
    expect(invoke(input, sidecar).status).toBe(fail ? "invalid" : "available");
    expect(reads).toBe(0);
  });

  it.each(["available", "invalid", "unsupported-version"])("preserves real prerequisite state %s", state => {
    const source = pair().documentMap;
    if (state === "unsupported-version") source.contractVersion = "99.0.0";
    const header = api.createDocSourceMapIndex(state === "invalid" ? {} : source);
    const before = JSON.stringify(header.diagnostics);
    const result = invoke({ docSourceMapIndex: header });
    expect(result.status).toBe(state);
    expect(JSON.stringify(header.diagnostics)).toBe(before);
    expect(result.diagnostics.slice(0, header.diagnostics.length)).toEqual(header.diagnostics);
  });

  it("supports the actual current pair and preserves frozen bidirectional queries", () => {
    const value = pair();
    const migrated = api.migrateGeneratedDocumentationBindingBundle({ docSourceMap: value.documentMap, bindingSidecars: [value.bindingSidecar] });
    expect(migrated.status).toBe("migrated");
    const result = invoke({ docSourceMapIndex: api.createDocSourceMapIndex(migrated.bundle!.docSourceMap) }, migrated.bundle!.bindingSidecars[0]);
    expect(result.status).toBe("available");
    const binding = result.bindings[0]!;
    const targets = api.findGeneratedTargetsForBinding(result, binding.id);
    expect(targets.length).toBeGreaterThan(0);
    expect(Object.isFrozen(result) && Object.isFrozen(targets)).toBe(true);
    expect(api.findGeneratedBindingsForTarget(result, targets[0]!.id).map(row => row.id)).toContain(binding.id);
    expect(api.findGeneratedBindingsForDocSourceMapEntry(result, binding.docSourceMapEntryIds[0]!).map(row => row.id)).toContain(binding.id);
  });

  it("rejects invalid options before inspecting sidecar headers", () => {
    let reads = 0;
    const sidecar = new Proxy({}, { getOwnPropertyDescriptor() { reads += 1; throw new Error("synthetic-private"); }, getPrototypeOf() { reads += 1; throw new Error("synthetic-private"); } });
    refused(null, sidecar);
    expect(reads).toBe(0);
  });

  it("rejects an incomplete header before sidecar validation", () => {
    let reads = 0;
    const sidecar = new Proxy({}, { getPrototypeOf() { reads += 1; throw new Error("synthetic-private"); } });
    refused({ docSourceMapIndex: {} }, sidecar);
    expect(reads).toBe(0);
  });

  it("keeps valid caller context unsanitized on linkage failure", () => {
    const value = pair().bindingSidecar;
    value.docSourceMapLinkage.docSourceMapId = "another-map";
    const result = invoke({ ...options(), path: "C:/caller-private/binding.json" }, value);
    expect(result.status).toBe("invalid");
    expect(JSON.stringify(result.diagnostics)).toContain("C:/caller-private/binding.json");
  });
});
