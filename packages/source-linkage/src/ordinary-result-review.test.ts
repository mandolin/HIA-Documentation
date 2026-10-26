/**
 * @file
 * @lang zh-CN 普通位置映射七接口的字段/计数/路径及结果所有权特征回归，使用公开合成输入。
 * @lang en Field/count/path and result-ownership characterization for seven ordinary-map interfaces, using public synthetic inputs.
 */
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, createOrdinarySourceMapIndex, findOriginalPositionForGenerated, findGeneratedPositionForOriginal, findAllGeneratedPositionsForOriginal, querySourceLinkedPosition } from "./index.js";

/** @lang zh-CN 创建含重复/空来源、无原始位置段和一对多映射的独立工件；HIA之外的列为零基。 @lang en Creates an independent artifact with repeated/empty sources, an unmapped segment and one-to-many mappings; columns outside HIA are zero-based. */
function mapValue(): Record<string, any> {
  return { version: 3, file: "ignored-file.js", sources: ["./src/A.ts", "./src/A.ts", "", null, "src/B.ts"], names: ["render"],
    mappings: [[[0, 0, 1, 2, 0], [5], [10, 0, 1, 2]], [[0, 4, 4, 1]], [[0, 0, 1, 2]]], sourcesContent: ["SYNTHETIC_BODY_NOT_RETAINED"] };
}

/** @lang zh-CN 两种输入载体共享相同位置语义，创建时提供独立诊断与产物上下文。 @lang en Both input carriers share position semantics with independent diagnostic/artifact context at creation. */
function ordinary(carrier: string) {
  // <lang><zh-CN>每次新建输入，避免库cache或测试修改跨案例共享。</zh-CN><en>Create fresh input each time to avoid sharing library caches or test edits across cases.</en></lang>
  const value = mapValue();
  return createOrdinarySourceMapIndex(carrier === "json" ? JSON.stringify(value) : value, { artifactPath: ".\\dist\\App.js", path: "maps/demo.map" });
}

/** @lang zh-CN 创建与位置映射配套的最小旧版文档索引；完整查询规则沿用既有专项。 @lang en Creates the matching minimal legacy documentation index; complete query rules remain covered by their existing review. */
function documentIndex(version = "0.1.0-draft") {
  return createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: version,
    sources: [{ id: "source:a", path: "maps/src/A.ts" }], artifacts: [{ id: "artifact:a", path: "dist/App.js" }],
    entries: [{ id: "entry:a", kind: "symbol", symbolId: "symbol:a", sourceRefs: [{ sourceId: "source:a", range: { start: { line: 2, column: 3 }, end: { line: 2, column: 3 } } }], artifactRefs: [{ artifactId: "artifact:a" }] }] });
}

describe.each(["decoded", "json"])("ordinary result metadata %s", carrier => {
  it("counts segments including unmapped and projects raw nonempty sources without deduplication", () => {
    // <lang><zh-CN>来源槽位五个，公开非空string列表三个，映射段五个；三者不是同一计数域。</zh-CN><en>There are five source slots, three public nonempty string sources and five mapping segments; these are distinct count domains.</en></lang>
    const index = ordinary(carrier);
    expect(index).toMatchObject({ artifactPath: "dist/App.js", path: "maps/demo.map", status: "available", mappingCount: 5, sourceCount: 3, sources: ["src/A.ts", "src/A.ts", "src/B.ts"], diagnostics: [] });
    expect(index.traceMap).toBeDefined();
  });
  it("distinguishes raw index source paths from base-resolved lookup paths", () => {
    // <lang><zh-CN>正向结果读取库解析后的路径，而不是公开sources列表的原始投影。</zh-CN><en>Forward results use the library-resolved path rather than the public sources list's raw projection.</en></lang>
    const result = findOriginalPositionForGenerated(ordinary(carrier), { line: 1, column: 1 });
    expect(result).toMatchObject({ status: "available", generated: { artifactPath: "dist/App.js", position: { line: 1, column: 1 } }, original: { sourcePath: "maps/src/A.ts", position: { line: 2, column: 3 }, name: "render" } });
  });
  it("borrows the forward input position while keeping mapped output independent", () => {
    // <lang><zh-CN>省略列原样回显，查找仍以列1执行；回显后改不回写映射出的坐标。</zh-CN><en>Omitted columns remain omitted in echoes while lookup uses column one; later echo edits do not write through mapped coordinates.</en></lang>
    const position = { line: 1 };
    const index = ordinary(carrier);
    const result = findOriginalPositionForGenerated(index, position);
    expect(result.generated.position).toBe(position);
    expect(result.generated.position).not.toHaveProperty("column");
    expect(result.original!.position).not.toBe(position);
    position.line = 90;
    expect(result.generated.position.line).toBe(90);
    expect(result.original!.position).toEqual({ line: 2, column: 3 });
    result.original!.position.line = 40;
    expect(findOriginalPositionForGenerated(index, { line: 1 }).original!.position.line).toBe(2);
  });
  it("borrows reverse input coordinates and normalizes the echoed source path", () => {
    // <lang><zh-CN>反向输入路径规范化不代表坐标被复制或公开安全。</zh-CN><en>Reverse input-path normalization does not mean coordinates are copied or public-safe.</en></lang>
    const position = { line: 2, column: 3 };
    const result = findGeneratedPositionForOriginal(ordinary(carrier), ".\\maps\\src\\A.ts", position);
    expect(result.original).toEqual({ sourcePath: "maps/src/A.ts", position });
    expect(result.original.position).toBe(position);
    expect(result.generated).toEqual({ artifactPath: "dist/App.js", position: { line: 1, column: 1 } });
    expect(result.generated!.position).not.toBe(position);
    expect(result.original).not.toHaveProperty("name");
  });
  it("returns fresh generated coordinates and retains library order for all matches", () => {
    // <lang><zh-CN>同一原始坐标对应三个生成位置；结果数组与各坐标均为新容器。</zh-CN><en>One original coordinate maps to three generated positions; result arrays and coordinates are fresh containers.</en></lang>
    const index = ordinary(carrier);
    const position = { line: 2, column: 3 };
    const first = findAllGeneratedPositionsForOriginal(index, "maps/src/A.ts", position);
    const second = findAllGeneratedPositionsForOriginal(index, "maps/src/A.ts", position);
    expect(first.generated.map(item => item.position)).toEqual([{ line: 1, column: 1 }, { line: 1, column: 11 }, { line: 3, column: 1 }]);
    expect(first.original.position).toBe(position);
    expect(first.generated).not.toBe(second.generated);
    expect(first.generated[0]!.position).not.toBe(second.generated[0]!.position);
    expect(first.generated.every(item => item.artifactPath === "dist/App.js")).toBe(true);
  });
  it("keeps success and unmapped diagnostics aliased to the original index list", () => {
    // <lang><zh-CN>三种正常结果不复制索引诊断；无映射是独立状态而非新增错误。</zh-CN><en>All three normal result forms borrow index diagnostics; unmapped is a distinct state rather than a new error.</en></lang>
    const index = ordinary(carrier);
    const forward = findOriginalPositionForGenerated(index, { line: 1 });
    const reverse = findGeneratedPositionForOriginal(index, "maps/src/A.ts", { line: 2, column: 3 });
    const all = findAllGeneratedPositionsForOriginal(index, "maps/src/A.ts", { line: 2, column: 3 });
    expect(forward.diagnostics).toBe(index.diagnostics);
    expect(reverse.diagnostics).toBe(index.diagnostics);
    expect(all.diagnostics).toBe(index.diagnostics);
    expect(findOriginalPositionForGenerated(index, { line: 1, column: 6 }).diagnostics).toBe(index.diagnostics);
  });
  it("uses omitted properties versus empty lists for the three unmapped shapes", () => {
    // <lang><zh-CN>不同API的未映射结果保留各自稳定形状，不统一添加undefined字段。</zh-CN><en>Unmapped results retain each API's stable shape rather than adding uniform undefined properties.</en></lang>
    const index = ordinary(carrier);
    const forward = findOriginalPositionForGenerated(index, { line: 1, column: 6 });
    const reverse = findGeneratedPositionForOriginal(index, "maps/missing.ts", { line: 2 });
    const all = findAllGeneratedPositionsForOriginal(index, "maps/missing.ts", { line: 2 });
    expect(forward.status).toBe("unmapped");
    expect(forward).not.toHaveProperty("original");
    expect(reverse.status).toBe("unmapped");
    expect(reverse).not.toHaveProperty("generated");
    expect(all.status).toBe("unmapped");
    expect(all.generated).toEqual([]);
  });
  it("keeps invalid-coordinate echoes but creates a new fixed-diagnostic list", () => {
    // <lang><zh-CN>结果上下文不因invalid而变可信；只有诊断是固定拒绝说明。</zh-CN><en>Invalid status does not make result context trusted; only the diagnostic supplies a fixed rejection explanation.</en></lang>
    const index = ordinary(carrier);
    const position = { line: 0 };
    const result = findOriginalPositionForGenerated(index, position);
    expect(result.status).toBe("invalid");
    expect(result.generated.position).toBe(position);
    expect(result.diagnostics).not.toBe(index.diagnostics);
    expect(result.diagnostics.at(-1)?.code).toBe("ORDINARY_SOURCE_MAP_POSITION_INVALID");
    expect(index.diagnostics).toEqual([]);
  });
  it("retains a body-free independent TraceMap and independent names/decoded arrays", () => {
    // <lang><zh-CN>输入正文和开放扩展仅用于验证过滤；后改映射与名字不影响已创建实例。</zh-CN><en>Input bodies/open extensions only verify filtering; later mapping/name edits do not affect the created instance.</en></lang>
    const value = mapValue();
    value.extension = { note: "SYNTHETIC_EXTENSION_NOT_RETAINED" };
    const index = createOrdinarySourceMapIndex(carrier === "json" ? JSON.stringify(value) : value);
    expect(index.status).toBe("available");
    expect(JSON.stringify(index)).not.toContain("SYNTHETIC_");
    expect(index.traceMap!.names).not.toBe(value.names);
    value.names[0] = "changed";
    value.mappings[0][0][2] = 90;
    expect(findOriginalPositionForGenerated(index, { line: 1 }).original).toMatchObject({ name: "render", position: { line: 2, column: 3 } });
  });
  it("retains mutable metadata without linking its sources list to the TraceMap", () => {
    // <lang><zh-CN>测试修改后不再消费索引；计数不自动跟随公开列表变化。</zh-CN><en>Do not consume the index after this test edit; counts do not automatically follow public-list mutation.</en></lang>
    const index = ordinary(carrier);
    expect(Object.isFrozen(index)).toBe(false);
    expect(Object.isFrozen(index.sources)).toBe(false);
    expect(index.sources).not.toBe(index.traceMap!.sources);
    index.sources.pop();
    expect(index.sourceCount).toBe(3);
    expect(index.traceMap!.sources).toHaveLength(5);
  });
  it("does not infer artifact context from the ordinary map file field", () => {
    // <lang><zh-CN>只有显式options提供HIA产物上下文，map.file保持库元数据职责。</zh-CN><en>Only explicit options provide HIA artifact context; map.file remains library metadata.</en></lang>
    const index = createOrdinarySourceMapIndex(carrier === "json" ? JSON.stringify(mapValue()) : mapValue());
    const result = findOriginalPositionForGenerated(index, { line: 1 });
    expect(index).not.toHaveProperty("artifactPath");
    expect(index).not.toHaveProperty("path");
    expect(result.generated).not.toHaveProperty("artifactPath");
  });
});

describe("ordinary and combined result boundary shapes", () => {
  it("retains valid context but no partial map metadata for a rejected map", () => {
    // <lang><zh-CN>错误索引仍保留已验证options快照，lookup诊断继续借用该列表。</zh-CN><en>A rejected index retains validated option snapshots, and lookups still borrow that diagnostic list.</en></lang>
    const index = createOrdinarySourceMapIndex({}, { artifactPath: "./dist/App.js", path: "maps/invalid.map" });
    const result = findOriginalPositionForGenerated(index, { line: 1 });
    expect(index).toMatchObject({ status: "invalid", artifactPath: "dist/App.js", path: "maps/invalid.map", mappingCount: 0, sources: [], sourceCount: 0 });
    expect(index).not.toHaveProperty("traceMap");
    expect(result.status).toBe("invalid");
    expect(result.diagnostics).toBe(index.diagnostics);
  });
  it("keeps an empty valid map distinct from a rejected map", () => {
    // <lang><zh-CN>空映射具备可用实例但查找unmapped，不伪造错误。</zh-CN><en>An empty map has an available instance while lookups are unmapped, without inventing errors.</en></lang>
    const index = createOrdinarySourceMapIndex({ version: 3, sources: [], names: [], mappings: [] });
    expect(index).toMatchObject({ status: "available", sourceCount: 0, mappingCount: 0, diagnostics: [] });
    expect(index.traceMap).toBeDefined();
    expect(findOriginalPositionForGenerated(index, { line: 1 }).status).toBe("unmapped");
  });
  it("borrows combined query and entry nodes while returning snapshotted positions", () => {
    // <lang><zh-CN>联合位置输入先复制，query回显仍是原对象；条目节点借用文档索引。</zh-CN><en>Combined position input is snapshotted while query echoes remain original; entry nodes borrow the documentation index.</en></lang>
    const doc = documentIndex();
    const query = { generatedPosition: { line: 1 }, symbolId: "symbol:a" };
    const result = querySourceLinkedPosition(doc, ordinary("decoded"), query);
    expect(result.status).toBe("available");
    expect(result.matchedEntryCount).toBe(1);
    expect(result.entries[0]).toBe(doc.entries[0]);
    expect(result.entries).not.toBe(doc.entries);
    expect(result.query).toBe(query);
    expect(result.generated!.position).not.toBe(query.generatedPosition);
    expect(result.original).toEqual({ sourcePath: "maps/src/A.ts", position: { line: 2, column: 3 }, name: "render" });
    query.generatedPosition.line = 40;
    expect(result.query.generatedPosition!.line).toBe(40);
    expect(result.generated!.position.line).toBe(1);
  });
  it("snapshots the combined reverse position instead of borrowing caller coordinates", () => {
    // <lang><zh-CN>这与直接reverse helper的原position借用不同，字段说明必须区分。</zh-CN><en>Unlike the direct reverse helper's borrowed position, this result must distinguish the copied snapshot.</en></lang>
    const query = { originalSourcePath: "maps/src/A.ts", originalPosition: { line: 2, column: 3 } };
    const result = querySourceLinkedPosition(documentIndex(), ordinary("decoded"), query);
    expect(result.status).toBe("available");
    expect(result.original!.position).not.toBe(query.originalPosition);
    query.originalPosition.line = 40;
    expect(result.original!.position.line).toBe(2);
  });
  it("allows metadata-only document results with an invalid ordinary index and its diagnostic", () => {
    // <lang><zh-CN>联合status沿用实际请求分支，不按聚合diagnostics最高severity重算。</zh-CN><en>Combined status follows requested branches, not the highest severity of aggregated diagnostics.</en></lang>
    const invalid = createOrdinarySourceMapIndex({});
    const result = querySourceLinkedPosition(documentIndex(), invalid, { symbolId: "symbol:a" });
    expect(result.status).toBe("available");
    expect(result.matchedEntryCount).toBe(1);
    expect(result.diagnostics[0]).toBe(invalid.diagnostics[0]);
    expect(result.diagnostics[0]!.severity).toBe("error");
    expect(result).not.toHaveProperty("original");
    expect(result).not.toHaveProperty("generated");
  });
  it("creates a combined diagnostic list and deduplicates repeated ordinary records by identity", () => {
    // <lang><zh-CN>同一普通索引诊断被两处收集，仅按对象身份去重，原记录仍借用。</zh-CN><en>The same ordinary-index diagnostic is collected twice and deduplicated by identity only, retaining borrowed records.</en></lang>
    const invalid = createOrdinarySourceMapIndex({});
    const result = querySourceLinkedPosition(documentIndex(), invalid, { generatedPosition: { line: 1 } });
    expect(result.status).toBe("invalid");
    expect(result.entries).toEqual([]);
    expect(result.matchedEntryCount).toBe(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics).not.toBe(invalid.diagnostics);
    expect(result.diagnostics[0]).toBe(invalid.diagnostics[0]);
  });
  it("retains resolved position context when the documentation version is unsupported", () => {
    // <lang><zh-CN>位置成功不消除文档版本失败，但位置上下文仍可存在。</zh-CN><en>Position success does not clear a documentation-version failure, although position context may remain.</en></lang>
    const result = querySourceLinkedPosition(documentIndex("99.0.0"), ordinary("decoded"), { generatedPosition: { line: 1 } });
    expect(result.status).toBe("unsupported-version");
    expect(result.entries).toEqual([]);
    expect(result.matchedEntryCount).toBe(0);
    expect(result.original).toBeDefined();
    expect(result.generated).toBeDefined();
  });
  it("keeps requested generated context but no original context when unmapped", () => {
    // <lang><zh-CN>未映射仍可有请求位置回显，不能因generated字段存在就当作映射成功。</zh-CN><en>An unmapped result may still echo the requested position; presence of generated does not prove mapping success.</en></lang>
    const result = querySourceLinkedPosition(documentIndex(), ordinary("decoded"), { generatedPosition: { line: 1, column: 6 } });
    expect(result.status).toBe("unmapped");
    expect(result.generated).toMatchObject({ position: { line: 1, column: 6 } });
    expect(result).not.toHaveProperty("original");
    expect(result.entries).toEqual([]);
    expect(result.matchedEntryCount).toBe(0);
  });
  it("does not make a circular query echo serializable or publication-safe", () => {
    // <lang><zh-CN>未知环只保留于回显，已知筛选正常；宿主不得盲序列化整个结果。</zh-CN><en>The unknown cycle remains in the echo while known filtering works; hosts must not blindly serialize the entire result.</en></lang>
    const query: any = { symbolId: "symbol:a" };
    query.extension = query;
    const result = querySourceLinkedPosition(documentIndex(), ordinary("decoded"), query);
    expect(result.status).toBe("available");
    expect(result.query).toBe(query);
    expect(() => JSON.stringify(result)).toThrow(TypeError);
  });
});
