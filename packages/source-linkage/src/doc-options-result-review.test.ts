/**
 * @file
 * @lang zh-CN 两个文档映射公开类型的字段、复制/诊断所有权及失败结果特征；复用公开历史样本，不重建来源规则。
 * @lang en Characterizes fields, clone/diagnostic ownership and refusal shapes for two map types using a public historical fixture without redefining provenance rules.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, validateDocSourceMap, migrateDocSourceMap as migrateMap, type DocSourceMapIndexOptions } from "./index.js";

/** @lang zh-CN 每次读取独立公开工件，当前分支只换精确版本，原样本不写回。 @lang en Reads a fresh public artifact, changing only the exact version for the current branch and never rewriting the fixture. */
function fixture(version: string): Record<string, any> {
  const value = JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/doc-source-map.json", import.meta.url), "utf8"));
  value.contractVersion = version;
  return value;
}
/** @lang zh-CN 本文件的旧版合成样本含一个范围，升级时逐项提供显式旧约定。 @lang en This file's older synthetic samples contain one range, supplied with explicit per-reference evidence during upgrade. */
function migrateDocSourceMap(value: unknown, options: DocSourceMapIndexOptions = {}) {
  return migrateMap(value, { ...options, rangeEvidence: [{ entryIndex: 0, sourceRefIndex: 0, rangeConvention: { endBoundary: "inclusive", columnUnit: "utf16-code-unit" } }] });
}
/** @lang zh-CN 收集已知普通数据图节点，用身份交集核对跨输入/跨调用的独立性，不执行工件。 @lang en Collects known plain-data nodes to check cross-input/cross-call independence by identity, without executing artifacts. */
function nodes(value: unknown, seen = new Set<object>()): Set<object> {
  if (value && typeof value === "object" && !seen.has(value)) {
    // <lang><zh-CN>先登记再遍历，允许测试数据内部合法共享而不重复展开。</zh-CN><en>Register before traversal to permit legal sharing within test data without revisiting nodes.</en></lang>
    seen.add(value);
    for (const child of Object.values(value)) nodes(child, seen);
  }
  return seen;
}

describe.each(["0.1.0-draft", "1.0.0"])("map options/result fields %s", version => {
  it("returns three own result fields with a writable current manifest", () => {
    // <lang><zh-CN>成功状态和字段组合是factory的实际约定，不将普通interface当判别联合。</zh-CN><en>Success combinations are actual factory conventions, not guarantees supplied by a discriminated-union type.</en></lang>
    const result = migrateDocSourceMap(fixture(version));
    expect(Object.keys(result).sort()).toEqual(["diagnostics", "manifest", "status"]);
    expect(result.status).toBe("migrated");
    expect(result.manifest?.contractVersion).toBe("1.1.0");
    expect(result.diagnostics).toEqual([]);
    expect([result, result.manifest!, result.diagnostics].every(value => !Object.isFrozen(value))).toBe(true);
    expect(Object.getOwnPropertyDescriptor(result, "manifest")?.writable).toBe(true);
  });
  it("shares no mutable graph nodes with input or another call", () => {
    const input = fixture(version);
    const first = migrateDocSourceMap(input);
    const second = migrateDocSourceMap(input);
    // <lang><zh-CN>检查整个返回图，不只比较顶层manifest地址。</zh-CN><en>Check the complete returned graph rather than only the top-level manifest identity.</en></lang>
    const inputNodes = nodes(input);
    const firstNodes = nodes(first);
    const secondNodes = nodes(second);
    expect([...firstNodes].filter(node => inputNodes.has(node) || secondNodes.has(node))).toEqual([]);
  });
  it("keeps writable output edits local to that result", () => {
    const input = fixture(version);
    const first = migrateDocSourceMap(input);
    const second = migrateDocSourceMap(input);
    // <lang><zh-CN>修改复制品的深层内容和容器，不回写输入或兄弟结果。</zh-CN><en>Edit copied nested content and containers without writing through to input or sibling results.</en></lang>
    (first.manifest!.sources as any[])[0].path = "src/synthetic-changed.html";
    (first.manifest!.entries as any[]).length = 0;
    expect(input.sources[0].path).toBe("src/components/alert.html");
    expect((second.manifest!.sources as any[])[0].path).toBe("src/components/alert.html");
    expect((second.manifest!.entries as any[])).toHaveLength(1);
    expect(migrateDocSourceMap(input).status).toBe("migrated");
  });
  it("projects successful diagnostics without borrowing raw diagnostic objects", () => {
    const input = fixture(version);
    input.diagnostics = [{ code: "SYNTHETIC_WARNING", severity: "warning", message: "synthetic warning text" }, "synthetic info text"];
    const result = migrateDocSourceMap(input, { path: "context\\synthetic.json" });
    // <lang><zh-CN>成功也能有warning/info及原文本；后置诊断与manifest内原诊断分别持有新对象。</zh-CN><en>Success may contain warning/info and original text; post-validation diagnostics and raw manifest diagnostics hold separate objects.</en></lang>
    expect(result.status).toBe("migrated");
    expect(result.diagnostics.map(item => [item.code, item.severity, item.message, item.targetPath])).toEqual([
      ["SYNTHETIC_WARNING", "warning", "synthetic warning text", "context\\synthetic.json.diagnostics.0"],
      ["DOC_SOURCE_MAP_ENTRY_DIAGNOSTIC", "info", "synthetic info text", "context\\synthetic.json.diagnostics.1"]
    ]);
    expect(result.diagnostics[1]!.data).toEqual({ sourceDiagnostic: "synthetic info text" });
    const raw = (result.manifest!.diagnostics as any[])[0];
    expect(raw).not.toBe(input.diagnostics[0]);
    expect(raw).not.toBe(result.diagnostics[0]);
    raw.message = "changed raw copy";
    expect(result.diagnostics[0]!.message).toBe("synthetic warning text");
    result.diagnostics[0]!.message = "changed projected copy";
    expect(input.diagnostics[0].message).toBe("synthetic warning text");
  });
  it("retains explicitly permitted bodies and JSON extensions without publication authority", () => {
    const input = fixture(version);
    input.sources[0].sourcesContentPolicy = "redacted";
    input.sources[0].sourcesContent = "SYNTHETIC_ALLOWED_BODY";
    input.extension = { note: "SYNTHETIC_PASSIVE_EXTENSION" };
    const result = migrateDocSourceMap(input);
    expect((result.manifest!.sources as any[])[0].sourcesContent).toBe("SYNTHETIC_ALLOWED_BODY");
    expect(result.manifest!.extension).toEqual(input.extension);
    expect(result.manifest!.extension).not.toBe(input.extension);
    expect(JSON.stringify(result.manifest)).toContain("SYNTHETIC_ALLOWED_BODY");
  });
  it("copies enumerable wire values into ordinary writable containers", () => {
    const input = fixture(version);
    // <lang><zh-CN>普通JSON复制不保留描述符/原型、隐藏或Symbol扩展；没有可观察getter或JSON hooks。</zh-CN><en>Plain JSON copying preserves neither descriptors/prototypes nor hidden/symbol extensions; no observable getters or JSON hooks are supplied.</en></lang>
    const extension = Object.create(null);
    Object.defineProperty(extension, "visible", { value: { count: 1 }, enumerable: true });
    Object.defineProperty(extension, "hidden", { value: "not-on-wire", enumerable: false });
    extension[Symbol("synthetic")] = "symbol-not-on-wire";
    input.extension = Object.freeze(extension);
    const result = migrateDocSourceMap(input);
    const copy = result.manifest!.extension as Record<string, any>;
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.keys(copy)).toEqual(["visible"]);
    expect(Object.getOwnPropertySymbols(copy)).toEqual([]);
    expect(Object.getOwnPropertyDescriptor(copy, "visible")).toMatchObject({ enumerable: true, configurable: true, writable: true });
    copy.visible.count = 42;
    expect(extension.visible.count).toBe(1);
  });
  it("does not recompute a result status after caller edits its diagnostics", () => {
    const result = migrateDocSourceMap(fixture(version));
    const status = result.status;
    result.diagnostics.push({ code: "SYNTHETIC_CALLER_ERROR", message: "caller edit", severity: "error" });
    expect(result.status).toBe(status);
    expect(result.manifest).toBeDefined();
    expect(result.manifest!.diagnostics).toEqual([]);
  });
});

describe("map options and refusal field shapes", () => {
  it.each(["invalid-root", "unsupported", "post-copy-invalid"])("omits the manifest own property for %s", branch => {
    const input = branch === "invalid-root" ? null : branch === "unsupported" ? fixture("1.0.1") : { contract: "doc-source-map", contractVersion: "0.1.0-draft", entries: [] };
    const result = migrateDocSourceMap(input, { path: "C:\\synthetic\\context.json" });
    expect(result.status).toBe(branch === "unsupported" ? "unsupported-version" : "invalid");
    expect(Object.keys(result).sort()).toEqual(["diagnostics", "status"]);
    expect(Object.hasOwn(result, "manifest")).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ code: "DOC_SOURCE_MAP_MIGRATION_INVALID", severity: "error", path: "C:\\synthetic\\context.json", targetPath: "C:\\synthetic\\context.json" });
    expect(Object.isFrozen(result.diagnostics)).toBe(false);
  });
  it.each(["index", "validate", "migrate"])("retains diagnostic path snapshots after a %s call", entry => {
    const options: DocSourceMapIndexOptions = { path: "C:\\synthetic\\early.json" };
    /** @lang zh-CN 以同一公开类型消费三个入口，仅观察返回诊断字段。 @lang en Consumes three entries through the same public option type, observing returned diagnostic fields only. */
    const run = () => entry === "index" ? createDocSourceMapIndex(null, options).diagnostics : entry === "validate" ? validateDocSourceMap(null, options) : migrateDocSourceMap(null, options).diagnostics;
    const first = run();
    options.path = "context/late.json";
    const second = run();
    expect(first[0]!.path).toBe("C:\\synthetic\\early.json");
    expect(second[0]!.path).toBe("context/late.json");
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
    expect(first[0]!.path).toContain("\\");
  });
});
