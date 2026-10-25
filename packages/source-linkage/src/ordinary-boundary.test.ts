/**
 * @file
 * @lang zh-CN 普通位置映射的正文隔离、坐标与联合失败回归；仅使用合成数据。
 * @lang en Regression coverage for ordinary-map body isolation, coordinates and combined failures, using synthetic data only.
 */
import { describe, expect, it } from "vitest";
import { TraceMap, sourceContentFor } from "@jridgewell/trace-mapping";
import { createDocSourceMapIndex, createOrdinarySourceMapIndex, findOriginalPositionForGenerated, findGeneratedPositionForOriginal, findAllGeneratedPositionsForOriginal, querySourceLinkedPosition } from "./index.js";

/** @lang zh-CN 创建含合成私有正文的最小合法映射。 @lang en Creates a minimal valid map with a synthetic private body. */
function fixture() {
  return { version: 3 as const, sources: ["src/a.ts"], sourcesContent: ["synthetic-private-body"], names: ["render"], mappings: "AAAAA" };
}

/** @lang zh-CN 提供能暴露失败查找错误退化的文件级文档条目。 @lang en Supplies a file-level documentation entry that exposes unsafe lookup fallback. */
function documentIndex() {
  return createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: "0.1.0-draft", sources: [{ id: "source", path: "src/a.ts" }], artifacts: [{ id: "artifact", path: "dist/a.js" }], entries: [{ id: "entry", sourceRefs: [{ sourceId: "source", range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } } }], artifactRefs: [{ artifactId: "artifact" }] }] });
}

describe("ordinary source-map input boundary", () => {
  it.each(["object", "string", "decoded", "trace"])("isolates bodies and caller state for %s input", (kind) => {
    // <lang><zh-CN>四种公开输入共享相同映射，实例另带既有基准路径。</zh-CN><en>The four public inputs share one mapping; the instance also has a pre-resolved base.</en></lang>
    const map = fixture();
    const input = kind === "string" ? JSON.stringify(map) : kind === "decoded" ? { ...map, mappings: [[[0, 0, 0, 0, 0]]] } : kind === "trace" ? new TraceMap(map, "cache/a.js.map") : map;
    const before = JSON.stringify(input);
    const index = createOrdinarySourceMapIndex(input, { artifactPath: "dist/a.js" });
    expect(index.status).toBe("available");
    expect(index.traceMap).not.toBe(input);
    expect(JSON.stringify(index)).not.toContain("synthetic-private-body");
    expect(sourceContentFor(index.traceMap!, "src/a.ts")).toBeNull();
    expect(findOriginalPositionForGenerated(index, { line: 1, column: 1 })).toMatchObject({ status: "available", original: { sourcePath: kind === "trace" ? "cache/src/a.ts" : "src/a.ts", position: { line: 1, column: 1 } } });
    expect(JSON.stringify(input)).toBe(before);
  });

  it("does not read ignored source bodies or unknown extension accessors", () => {
    // <lang><zh-CN>被忽略字段可能是访问器；只读取映射元数据，不能执行它们。</zh-CN><en>Ignored fields may be accessors; read mapping metadata without executing them.</en></lang>
    const map = fixture();
    let reads = 0;
    Object.defineProperty(map, "sourcesContent", { get() { reads += 1; throw new Error("synthetic-private-body"); } });
    Object.defineProperty(map, "x_private", { get() { reads += 1; throw new Error("synthetic-private-body"); } });
    const index = createOrdinarySourceMapIndex(map);
    expect(index.status).toBe("available");
    expect(reads).toBe(0);
  });

  it("rejects known-field accessors without executing them", () => {
    const map = fixture();
    let reads = 0;
    Object.defineProperty(map, "mappings", { get() { reads += 1; return "AAAAA"; } });
    expect(createOrdinarySourceMapIndex(map).status).toBe("invalid");
    expect(reads).toBe(0);
  });

  it.each(["json", "missing-mappings", "proxy"])("does not reflect private error text for %s", (kind) => {
    const input = kind === "json" ? '{"private":"synthetic-private-body"' : kind === "proxy" ? new Proxy({}, { get() { throw new Error("synthetic-private-body"); }, ownKeys() { throw new Error("synthetic-private-body"); } }) : { version: 3, sources: [], private: "synthetic-private-body" };
    const result = createOrdinarySourceMapIndex(input);
    expect(result.status).toBe("invalid");
    expect(result.diagnostics[0]?.code).toBe("ORDINARY_SOURCE_MAP_INVALID");
    expect(JSON.stringify(result)).not.toContain("synthetic-private-body");
  });

  it.each([{ version: 2 }, { sources: [42] }, { names: [42] }, { mappings: [[[0, 9, 0, 0]]] }, { mappings: [[[0, 0, -1, 0]]] }, { mappings: [[[0, 0, 0, 0, 5]]] }, { mappings: [[[0, 0]]] }])("rejects malformed known mapping metadata %j", (override) => {
    expect(createOrdinarySourceMapIndex({ ...fixture(), ...override }).status).toBe("invalid");
  });

  it.each(["!", "g", "AA", "AAA", "AAAAAA", "A,", ",A", "AAAA;?"])("rejects malformed encoded mapping syntax %s", (mappings) => {
    expect(createOrdinarySourceMapIndex({ ...fixture(), mappings }).status).toBe("invalid");
  });

  it("preserves empty maps, null sources, legacy ignore metadata and sectioned-map refusal", () => {
    expect(createOrdinarySourceMapIndex({ version: 3, sources: [], mappings: ";;", x_unknown: { body: "synthetic-private-body" } })).toMatchObject({ status: "available", mappingCount: 0 });
    expect(createOrdinarySourceMapIndex({ ...fixture(), sources: [null], x_google_ignoreList: [0] })).toMatchObject({ status: "available", sourceCount: 0, traceMap: { ignoreList: [0] } });
    expect(createOrdinarySourceMapIndex({ version: 3, sections: [] }).status).toBe("invalid");
  });

  it("keeps index mappings and names independent of later caller mutations", () => {
    const map = { ...fixture(), mappings: [[[0, 0, 0, 0, 0]]] };
    const index = createOrdinarySourceMapIndex(map);
    map.names[0] = "mutated";
    map.mappings[0]![0]![2] = 99;
    expect(findOriginalPositionForGenerated(index, { line: 1, column: 1 })).toMatchObject({ original: { name: "render", position: { line: 1, column: 1 } } });
  });
});

describe("ordinary source-map lookup boundary", () => {
  it.each([{ line: 0, column: 1 }, { line: -1, column: 1 }, { line: 1.5, column: 1 }, { line: NaN, column: 1 }, { line: Infinity, column: 1 }, { line: 1, column: 0 }, { line: 1, column: -1 }, { line: 1, column: 1.5 }, { line: 1, column: NaN }, { line: 1, column: Infinity }])("refuses invalid HIA coordinates %j in all three directions", (position) => {
    const index = createOrdinarySourceMapIndex(fixture());
    for (const result of [findOriginalPositionForGenerated(index, position), findGeneratedPositionForOriginal(index, "src/a.ts", position), findAllGeneratedPositionsForOriginal(index, "src/a.ts", position)]) {
      expect(result.status).toBe("invalid");
      expect(result.diagnostics.at(-1)?.code).toBe("ORDINARY_SOURCE_MAP_POSITION_INVALID");
    }
  });

  it("retains optional-column lookup and valid unmapped results", () => {
    const index = createOrdinarySourceMapIndex(fixture());
    expect(findOriginalPositionForGenerated(index, { line: 1 }).status).toBe("available");
    expect(findOriginalPositionForGenerated(index, { line: 99, column: 1 }).status).toBe("unmapped");
  });

  it("preserves greatest-lower-bound and least-upper-bound in both directions", () => {
    const index = createOrdinarySourceMapIndex({ ...fixture(), mappings: [[[0, 0, 0, 0], [10, 0, 0, 10]]] });
    for (const bias of ["greatest-lower-bound", "least-upper-bound"] as const) {
      // <lang><zh-CN>中间位置按显式偏置落向两端；HIA列与库列保持一位差。</zh-CN><en>An intermediate position selects opposite endpoints by explicit bias; HIA/library columns retain their one-column offset.</en></lang>
      const column = bias === "greatest-lower-bound" ? 1 : 11;
      expect(findOriginalPositionForGenerated(index, { line: 1, column: 6 }, { bias }).original?.position.column).toBe(column);
      expect(findGeneratedPositionForOriginal(index, "src/a.ts", { line: 1, column: 6 }, { bias }).generated?.position.column).toBe(column);
      expect(findAllGeneratedPositionsForOriginal(index, "src/a.ts", { line: 1, column: 6 }, { bias }).generated[0]?.position.column).toBe(column);
    }
  });

  it("keeps ordinary parsing separate from documentation publication path policy", () => {
    expect(createOrdinarySourceMapIndex({ ...fixture(), sources: ["https://example.test/a.ts"] }).status).toBe("available");
    expect(createOrdinarySourceMapIndex({ ...fixture(), sources: ["C:/synthetic-private/a.ts"] }).status).toBe("available");
  });

  it.each(["unmapped", "invalid-map", "invalid-position"])("returns no broad document entries when a combined position lookup is %s", (kind) => {
    const ordinary = createOrdinarySourceMapIndex(kind === "invalid-map" ? {} : fixture(), { artifactPath: "dist/a.js" });
    const result = querySourceLinkedPosition(documentIndex(), ordinary, { generatedPath: "dist/a.js", generatedPosition: { line: kind === "invalid-position" ? 0 : 99, column: 1 } });
    expect(result.status).toBe(kind === "unmapped" ? "unmapped" : "invalid");
    expect(result.entries).toEqual([]);
    expect(result.matchedEntryCount).toBe(0);
    if (kind === "invalid-position") expect(result.diagnostics.at(-1)?.code).toBe("ORDINARY_SOURCE_MAP_POSITION_INVALID");
  });

  it("preserves metadata-only queries when no ordinary position lookup is requested", () => {
    expect(querySourceLinkedPosition(documentIndex(), createOrdinarySourceMapIndex({}), { generatedPath: "dist/a.js" })).toMatchObject({ status: "available", matchedEntryCount: 1 });
  });

  it("does not return source-only entries when reverse lookup is unmapped", () => {
    const result = querySourceLinkedPosition(documentIndex(), createOrdinarySourceMapIndex({ version: 3, sources: [], names: [], mappings: "" }), { originalSourcePath: "src/a.ts", originalPosition: { line: 1, column: 1 } });
    expect(result).toMatchObject({ status: "unmapped", entries: [], matchedEntryCount: 0 });
  });
});
