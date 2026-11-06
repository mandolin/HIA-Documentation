/**
 * @file
 * @lang zh-CN 初始化轨迹规则的图身份、顺序、所有权、来源和拒绝回归。
 * @lang en Graph identity, ordering, ownership, provenance and rejection regressions for initialization traces.
 */
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { PLAIN_DATA_INITIALIZATION_JSON_SCHEMA, readPlainDataInitialization } from "./plain-data-initialization.js";

/** @lang zh-CN 构造固定源选择器，只声明范围，不假设文件已核。 @lang en Creates a fixed source selector, declaring a range without assuming file verification. */
function source(resourceId = "current", line = 1) {
  return { resourceId, range: { start: { line, column: 1 }, end: { line, column: 2 } }, rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" } };
}
/** @lang zh-CN 将手工步骤包装为通用证据，保持生产标签的原始声明。 @lang en Wraps hand-authored steps in generic evidence, retaining the original producer-origin claim. */
function fixture(steps: Record<string, unknown>[]) {
  return {
    contract: "artifact-derivation-evidence", contractVersion: "0.1.0-draft", id: "example",
    producer: { id: "example-recorder", version: "1.0.0" }, evidenceOrigin: "producer-recorded", coverage: "resource",
    resources: [
      { id: "current", kind: "source", path: "src/current.mjs", sha256: "a".repeat(64) },
      { id: "legacy", kind: "source", path: "src/legacy.mjs", sha256: "b".repeat(64) },
      { id: "out", kind: "artifact", path: "schema.json", sha256: "c".repeat(64) }
    ],
    activities: [{ id: "derive", type: "schema-generation", profile: { contract: "plain-data-initialization", contractVersion: "0.1.0-draft" }, inputs: ["current", "legacy"], outputs: ["out"] }],
    derivations: [{ id: "relation", activityId: "derive", inputs: ["current", "legacy"], outputs: ["out"], mapRefIds: [] }], mapRefs: [],
    details: { derive: {
      contract: "plain-data-initialization", contractVersion: "0.1.0-draft", entryResourceId: "current",
      steps: steps.map((step, sequence) => ({ sequence, source: source(), ...step })), result: { resourceId: "out", bindingName: "DATA" }
    } }
  };
}
/** @lang zh-CN 提供最小常量对象及导出绑定轨迹。 @lang en Provides a minimal constant-object and export-binding trace. */
function simple() {
  return fixture([
    { kind: "literal", nodeId: "one", value: 1 },
    { kind: "object", nodeId: "root", properties: [{ key: "v", nodeId: "one", source: source() }] },
    { kind: "bind", name: "DATA", nodeId: "root" }
  ]);
}

describe("plain data initialization draft", () => {
  it("replays declared semantics while keeping file and source conformity unverified", () => {
    const result = readPlainDataInitialization(simple(), "derive");
    expect(result.status).toBe("replayed");
    if (result.status !== "replayed") throw new Error("Fixture rejected");
    expect(JSON.parse(JSON.stringify(result.value))).toEqual({ v: 1 });
    expect(result.verification).toEqual({ structure: true, traceSemantics: true, artifactBytes: false, sourceLinks: false, sourceConformance: false, producerAuthenticity: false });
    expect(result.evidence.evidenceOrigin).toBe("producer-recorded");
    expect(result.valueLinks.find(row => row.pointer === "/v")!.valueSource.resourceId).toBe("current");
  });

  it("preserves sharing inside clone, resets freeze and isolates old graph", () => {
    const value = fixture([
      { kind: "literal", nodeId: "one", value: 1, source: source("legacy") },
      { kind: "literal", nodeId: "two", value: 2 },
      { kind: "object", nodeId: "child", properties: [{ key: "v", nodeId: "one", source: source("legacy") }], source: source("legacy") },
      { kind: "object", nodeId: "old", properties: [{ key: "a", nodeId: "child", source: source("legacy") }, { key: "b", nodeId: "child", source: source("legacy") }], source: source("legacy") },
      { kind: "freeze", nodeId: "child", source: source("legacy") },
      { kind: "freeze", nodeId: "old", source: source("legacy") },
      { kind: "clone", nodeId: "next", sourceNodeId: "old", copies: [{ fromNodeId: "old", toNodeId: "next" }, { fromNodeId: "child", toNodeId: "next-child" }] },
      { kind: "write", targetNodeId: "next-child", key: "v", valueNodeId: "two", source: source("current", 7) },
      { kind: "object", nodeId: "result", properties: [{ key: "old", nodeId: "old", source: source() }, { key: "next", nodeId: "next", source: source() }] },
      { kind: "bind", name: "DATA", nodeId: "result" }
    ]);
    const result = readPlainDataInitialization(value, "derive");
    expect(result.status).toBe("replayed");
    if (result.status !== "replayed") throw new Error("Fixture rejected");
    expect(JSON.parse(JSON.stringify(result.value))).toEqual({ old: { a: { v: 1 }, b: { v: 1 } }, next: { a: { v: 2 }, b: { v: 2 } } });
    expect(result.valueLinks.find(row => row.pointer === "/next/a")!.nodeId).toBe(result.valueLinks.find(row => row.pointer === "/next/b")!.nodeId);
    expect(result.valueLinks.find(row => row.pointer === "/next/a/v")!.source.range.start.line).toBe(7);
    expect(result.valueLinks.find(row => row.pointer === "/next/a")!.transformationSources).toHaveLength(1);
    expect(result.valueLinks.find(row => row.pointer === "/next/a/v")!.transformationSources).toHaveLength(0);
  });

  it("spreads shallow shells, retains shared children and observes live aliases", () => {
    const result = readPlainDataInitialization(fixture([
      { kind: "literal", nodeId: "one", value: 1 }, { kind: "literal", nodeId: "two", value: 2 },
      { kind: "object", nodeId: "child", properties: [{ key: "v", nodeId: "one", source: source() }] },
      { kind: "object", nodeId: "old", properties: [{ key: "nested", nodeId: "child", source: source() }] },
      { kind: "spread", nodeId: "next", sourceNodeId: "old" },
      { kind: "freeze", nodeId: "next" }, { kind: "bind", name: "DATA", nodeId: "next" },
      { kind: "write", targetNodeId: "child", key: "v", valueNodeId: "two" }
    ]), "derive");
    expect(result.status === "replayed" && JSON.parse(JSON.stringify(result.value))).toEqual({ nested: { v: 2 } });
    if (result.status !== "replayed") throw new Error("Fixture rejected");
    expect(result.valueLinks.find(row => row.pointer === "/nested")!.transformationSequences).toEqual([4]);
    expect(result.valueLinks.find(row => row.pointer === "/nested/v")!.transformationSequences).toEqual([]);
  });

  it("supports array clones and spreads, scalar clones and RFC6901 keys", () => {
    const value = fixture([
      { kind: "literal", nodeId: "one", value: 1 },
      { kind: "clone", nodeId: "copy", sourceNodeId: "one", copies: [] },
      { kind: "array", nodeId: "list", items: ["one", "copy"] },
      { kind: "clone", nodeId: "list-copy", sourceNodeId: "list", copies: [{ fromNodeId: "list", toNodeId: "list-copy" }] },
      { kind: "spread", nodeId: "list-spread", sourceNodeId: "list-copy" },
      { kind: "object", nodeId: "root", properties: [{ key: "a/~", nodeId: "list-spread", source: source() }, { key: "", nodeId: "one", source: source() }] },
      { kind: "bind", name: "DATA", nodeId: "root" }
    ]);
    const result = readPlainDataInitialization(value, "derive");
    expect(result.status).toBe("replayed");
    if (result.status !== "replayed") throw new Error("Fixture rejected");
    expect(result.valueLinks.some(row => row.pointer === "/a~1~0/0")).toBe(true);
    expect(result.valueLinks.some(row => row.pointer === "/")).toBe(true);
    expect(result.valueLinks.find(row => row.pointer === "/a~1~0/0")!.transformationSequences).toEqual([3, 4]);
    expect(result.valueLinks.find(row => row.pointer === "/a~1~0/1")!.transformationSequences).toEqual([1, 3, 4]);
    expect(result.valueLinks.find(row => row.pointer === "/a~1~0/1")!.transformationSources).toHaveLength(3);
  });

  // <lang><zh-CN>每个反例都从独立合法轨迹变更，失败结果不能包含局部值。</zh-CN><en>Each counterexample mutates an independent valid trace; failures must contain no partial value.</en></lang>
  for (const [name, change] of [
    ["sequence", (x: ReturnType<typeof simple>) => { x.details.derive.steps[0]!.sequence = 2; }],
    ["unknown field", (x: ReturnType<typeof simple>) => { Object.assign(x.details.derive.steps[0]!, { privateField: true }); }],
    ["wrong rule version", (x: ReturnType<typeof simple>) => { x.details.derive.contractVersion = "0.1.1-draft"; }],
    ["wrong activity version", (x: ReturnType<typeof simple>) => { x.activities[0]!.profile.contractVersion = "1.0.0"; }],
    ["duplicate node", (x: ReturnType<typeof simple>) => { x.details.derive.steps[1]!.nodeId = "one"; }],
    ["forward reference", (x: ReturnType<typeof simple>) => { x.details.derive.steps[1]!.properties = [{ key: "v", nodeId: "absent", source: source() }]; }],
    ["missing binding", (x: ReturnType<typeof simple>) => { x.details.derive.result.bindingName = "private-secret"; }],
    ["wrong result resource", (x: ReturnType<typeof simple>) => { x.details.derive.result.resourceId = "current"; }],
    ["wrong source resource", (x: ReturnType<typeof simple>) => { x.details.derive.steps[0]!.source = source("out"); }],
    ["range order", (x: ReturnType<typeof simple>) => { x.details.derive.steps[0]!.source.range.end.column = 0; }],
    ["range unit", (x: ReturnType<typeof simple>) => { x.details.derive.steps[0]!.source.rangeConvention.columnUnit = "byte"; }],
    ["unsafe integer", (x: ReturnType<typeof simple>) => { x.details.derive.steps[0]!.value = 9007199254740992; }],
    ["prototype key", (x: ReturnType<typeof simple>) => { x.details.derive.steps[1]!.properties = [{ key: "__proto__", nodeId: "one", source: source() }]; }]
  ] as const) it(`rejects ${name}`, () => {
    const value = simple(); change(value);
    const result = readPlainDataInitialization(value, "derive");
    expect(result.status).toBe("invalid");
    expect(result).not.toHaveProperty("value");
    expect(JSON.stringify(result.diagnostics)).not.toContain("private-secret");
  });

  it("rejects writes through foreign subgraphs and shallow-frozen roots", () => {
    for (const middle of [
      { kind: "freeze", nodeId: "root" },
      { kind: "bind", name: "oldAlias", nodeId: "root", source: source("legacy") }
    ]) {
      const value = fixture([
        { kind: "literal", nodeId: "one", value: 1 },
        { kind: "object", nodeId: "root", properties: [] }, middle,
        { kind: "write", targetNodeId: "root", key: "v", valueNodeId: "one", source: source(middle.kind === "freeze" ? "current" : "legacy") },
        { kind: "bind", name: "DATA", nodeId: "root" }
      ]);
      expect(readPlainDataInitialization(value, "derive").status).toBe("invalid");
    }
  });

  it("rejects missing, extraneous and reused clone identities", () => {
    for (const copies of [[], [{ fromNodeId: "root", toNodeId: "next" }, { fromNodeId: "one", toNodeId: "extra" }], [{ fromNodeId: "root", toNodeId: "root" }]]) {
      expect(readPlainDataInitialization(fixture([
        { kind: "literal", nodeId: "one", value: 1 }, { kind: "object", nodeId: "root", properties: [] },
        { kind: "clone", sourceNodeId: "root", nodeId: "next", copies }, { kind: "bind", name: "DATA", nodeId: "next" }
      ]), "derive").status).toBe("invalid");
    }
  });

  it("rejects array writes, cyclic materialization and const rebinding", () => {
    const cases = [
      [{ kind: "array", nodeId: "root", items: [] }, { kind: "write", targetNodeId: "root", key: "length", valueNodeId: "one" }],
      [{ kind: "object", nodeId: "root", properties: [] }, { kind: "write", targetNodeId: "root", key: "self", valueNodeId: "root" }],
      [{ kind: "object", nodeId: "root", properties: [] }, { kind: "bind", name: "DATA", nodeId: "root" }]
    ];
    for (const steps of cases) expect(readPlainDataInitialization(fixture([{ kind: "literal", nodeId: "one", value: 1 }, ...steps, { kind: "bind", name: "DATA", nodeId: "root" }]), "derive").status).toBe("invalid");
  });

  it("compiles its structural schema independently", () => {
    const validate = new Ajv2020({ strict: true }).compile(PLAIN_DATA_INITIALIZATION_JSON_SCHEMA);
    expect(validate(simple().details.derive)).toBe(true);
    const wrong = simple().details.derive;
    wrong.contractVersion = "1.0.0";
    expect(validate(wrong)).toBe(false);
  });

  it("rejects output and source claims outside the selected derivation scope", () => {
    const missing = simple();
    missing.derivations[0]!.outputs = ["other"];
    missing.resources.push({ id: "other", kind: "artifact", path: "other.json", sha256: "d".repeat(64) });
    missing.activities[0]!.outputs.push("other");
    expect(readPlainDataInitialization(missing, "derive").status).toBe("invalid");
    const scope = simple();
    scope.derivations[0]!.inputs = ["legacy"];
    expect(readPlainDataInitialization(scope, "derive").status).toBe("invalid");
  });

  it("rejects ambiguous duplicate initial properties", () => {
    const value = simple();
    value.details.derive.steps[1]!.properties = [
      { key: "v", nodeId: "one", source: source() }, { key: "v", nodeId: "one", source: source("current", 2) }
    ];
    expect(readPlainDataInitialization(value, "derive").status).toBe("invalid");
  });

  it("clones intermediate cycles when the selected final JSON is acyclic", () => {
    const result = readPlainDataInitialization(fixture([
      { kind: "literal", nodeId: "one", value: 1 }, { kind: "object", nodeId: "old", properties: [] },
      { kind: "write", targetNodeId: "old", key: "self", valueNodeId: "old" },
      { kind: "clone", nodeId: "next", sourceNodeId: "old", copies: [{ fromNodeId: "old", toNodeId: "next" }] },
      { kind: "write", targetNodeId: "next", key: "self", valueNodeId: "one" }, { kind: "bind", name: "DATA", nodeId: "next" }
    ]), "derive");
    expect(result.status === "replayed" && JSON.parse(JSON.stringify(result.value))).toEqual({ self: 1 });
  });

  it("bounds shared expansion and deep output graphs", () => {
    const shared: Record<string, unknown>[] = [{ kind: "object", nodeId: "p0", properties: [] }];
    for (let i = 1; i <= 18; i++) shared.push({ kind: "object", nodeId: "p" + i, properties: [
      { key: "a", nodeId: "p" + (i - 1), source: source() }, { key: "b", nodeId: "p" + (i - 1), source: source() }
    ] });
    shared.push({ kind: "bind", name: "DATA", nodeId: "p18" });
    expect(readPlainDataInitialization(fixture(shared), "derive").status).toBe("invalid");
    const deep: Record<string, unknown>[] = [{ kind: "literal", nodeId: "p0", value: 1 }];
    for (let i = 1; i <= 130; i++) deep.push({ kind: "object", nodeId: "p" + i, properties: [{ key: "a", nodeId: "p" + (i - 1), source: source() }] });
    deep.push({ kind: "bind", name: "DATA", nodeId: "p130" });
    expect(readPlainDataInitialization(fixture(deep), "derive").status).toBe("invalid");
  });

  it("matches a controlled native clone and shallow-spread result", () => {
    // <lang><zh-CN>只执行本地手工原生夹具，不加载记录声明的任何源码。</zh-CN><en>Execute this local hand-authored native fixture only, without loading any source named by the record.</en></lang>
    const child = { v: 1 };
    const old = Object.freeze({ a: child, b: child });
    const actual = structuredClone(old);
    actual.a = { ...actual.a };
    actual.a.v = 2;
    const record = fixture([
      { kind: "literal", nodeId: "one", value: 1 }, { kind: "literal", nodeId: "two", value: 2 },
      { kind: "object", nodeId: "child", properties: [{ key: "v", nodeId: "one", source: source() }] },
      { kind: "object", nodeId: "old", properties: [{ key: "a", nodeId: "child", source: source() }, { key: "b", nodeId: "child", source: source() }] },
      { kind: "freeze", nodeId: "old" },
      { kind: "clone", nodeId: "next", sourceNodeId: "old", copies: [{ fromNodeId: "old", toNodeId: "next" }, { fromNodeId: "child", toNodeId: "cloned-child" }] },
      { kind: "spread", nodeId: "shell", sourceNodeId: "cloned-child" },
      { kind: "write", targetNodeId: "shell", key: "v", valueNodeId: "two" },
      { kind: "write", targetNodeId: "next", key: "a", valueNodeId: "shell" },
      { kind: "bind", nodeId: "next", name: "DATA" }
    ]);
    const result = readPlainDataInitialization(record, "derive");
    expect(result.status).toBe("replayed");
    if (result.status !== "replayed") throw new Error("Fixture rejected");
    expect(JSON.parse(JSON.stringify(result.value))).toEqual(actual);
    expect(result.valueLinks.find(row => row.pointer === "/a")!.nodeId === result.valueLinks.find(row => row.pointer === "/b")!.nodeId).toBe(actual.a === actual.b);
  });

  it("keeps node names trace-local and bindings module-scoped", () => {
    const one = simple();
    const other = simple();
    other.details.derive.steps[0]!.nodeId = "new-value";
    other.details.derive.steps[1]!.nodeId = "new-root";
    other.details.derive.steps[1]!.properties = [{ key: "v", nodeId: "new-value", source: source() }];
    other.details.derive.steps[2]!.nodeId = "new-root";
    const first = readPlainDataInitialization(one, "derive");
    const second = readPlainDataInitialization(other, "derive");
    expect(first.status === "replayed" && second.status === "replayed" && JSON.stringify(first.value) === JSON.stringify(second.value)).toBe(true);
    const scoped = readPlainDataInitialization(fixture([
      { kind: "literal", nodeId: "one", value: 1, source: source("legacy") },
      { kind: "literal", nodeId: "two", value: 2 },
      { kind: "bind", name: "DATA", nodeId: "one", source: source("legacy") },
      { kind: "bind", name: "DATA", nodeId: "two" }
    ]), "derive");
    expect(scoped.status === "replayed" && scoped.value).toBe(2);
  });

  it("independently validates the structural schema for all eight operations", () => {
    const value = fixture([
      { kind: "literal", nodeId: "one", value: 1 }, { kind: "object", nodeId: "root", properties: [] },
      { kind: "array", nodeId: "list", items: ["one"] },
      { kind: "clone", nodeId: "next", sourceNodeId: "root", copies: [{ fromNodeId: "root", toNodeId: "next" }] },
      { kind: "spread", nodeId: "shell", sourceNodeId: "next" },
      { kind: "write", targetNodeId: "shell", key: "v", valueNodeId: "one" },
      { kind: "freeze", nodeId: "shell" }, { kind: "bind", name: "DATA", nodeId: "shell" }
    ]);
    const validate = new Ajv2020({ strict: true }).compile(PLAIN_DATA_INITIALIZATION_JSON_SCHEMA);
    expect(validate(value.details.derive)).toBe(true);
    expect(readPlainDataInitialization(value, "derive").status).toBe("replayed");
  });

  it("exports an explicit typed bilingual rule API", () => {
    const entry = fileURLToPath(new URL("./plain-data-initialization.ts", import.meta.url));
    const consumer = fileURLToPath(new URL("../test-fixtures/plain-data-initialization-consumer.mts", import.meta.url));
    const program = ts.createProgram([entry, consumer], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, resolveJsonModule: true, strict: true, noEmit: true, types: ["node"] });
    const checker = program.getTypeChecker();
    const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(entry)!)!);
    expect(exports.map(symbol => symbol.name).sort()).toEqual([
      "PLAIN_DATA_INITIALIZATION_CONTRACT", "PLAIN_DATA_INITIALIZATION_CONTRACT_VERSION", "PLAIN_DATA_INITIALIZATION_SCHEMA_ID", "PLAIN_DATA_INITIALIZATION_JSON_SCHEMA",
      "PlainDataInitializationSource", "PlainDataInitializationProperty", "PlainDataInitializationStep", "PlainDataInitialization", "PlainDataInitializationValueLink", "PlainDataInitializationReadResult", "readPlainDataInitialization"
    ].sort());
    for (const symbol of exports) {
      const tags = symbol.getJsDocTags(checker).filter(tag => tag.name === "lang").map(tag => ts.displayPartsToString(tag.text));
      expect(tags.some(text => /^zh-CN\s+\S/.test(text)), symbol.name).toBe(true);
      expect(tags.some(text => /^en\s+\S/.test(text)), symbol.name).toBe(true);
    }
    expect(ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual([]);
  });

  it("does not attribute earlier parent clones to later inserted values", () => {
    const result = readPlainDataInitialization(fixture([
      { kind: "literal", nodeId: "one", value: 1, source: source("legacy") },
      { kind: "object", nodeId: "child", properties: [{ key: "v", nodeId: "one", source: source("legacy") }], source: source("legacy") },
      { kind: "object", nodeId: "old", properties: [] },
      { kind: "clone", nodeId: "next", sourceNodeId: "old", copies: [{ fromNodeId: "old", toNodeId: "next" }] },
      { kind: "write", targetNodeId: "next", key: "child", valueNodeId: "child" },
      { kind: "bind", name: "DATA", nodeId: "next" }
    ]), "derive");
    expect(result.status).toBe("replayed");
    if (result.status !== "replayed") throw new Error("Fixture rejected");
    expect(result.valueLinks.find(row => row.pointer === "")!.transformationSources).toHaveLength(1);
    expect(result.valueLinks.find(row => row.pointer === "/child")!.transformationSources).toHaveLength(0);
    expect(result.valueLinks.find(row => row.pointer === "/child/v")!.transformationSources).toHaveLength(0);
  });
});
