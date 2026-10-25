/**
 * @file
 * @lang zh-CN 联合位置/语义查询的运行时数据边界回归，全部使用合成元数据。
 * @lang en Runtime data-boundary regressions for combined position/semantic queries, using synthetic metadata only.
 */
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, createOrdinarySourceMapIndex, querySourceLinkedPosition, type SourceLinkedLookupQuery } from "./index.js";

/** @lang zh-CN 创建含两个符号的可查询合成索引。 @lang en Creates a queryable synthetic index with two symbols. */
function fixture() {
  return createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: "0.1.0-draft", sources: [{ id: "source", path: "src/a.ts" }], artifacts: [{ id: "artifact", path: "dist/a.js" }], entries: ["a", "b"].map((name) => ({ id: name, symbolId: `symbol:${name}`, symbolKind: "function", sourceRefs: [{ sourceId: "source", range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } } }], artifactRefs: [{ artifactId: "artifact", selector: `#${name}` }] })) });
}
/** @lang zh-CN 一条生成位置对应原始第一行第一列，不读源码。 @lang en Maps one generated position to original line one/column one without reading source. */
function ordinary() { return createOrdinarySourceMapIndex({ version: 3, sources: ["src/a.ts"], names: [], mappings: "AAAA" }, { artifactPath: "dist/a.js" }); }

describe("combined lookup runtime boundary", () => {
  it.each([null, undefined, [], "synthetic-private", false, 42, new Date(0), Object.create({ symbolId: "symbol:a" })].map((value, id) => ({ value, id })))("rejects invalid query root $id", ({ value }) => {
    const result = querySourceLinkedPosition(fixture(), ordinary(), value as SourceLinkedLookupQuery);
    expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
    expect(result.diagnostics.at(-1)?.code).toBe("SOURCE_LINKED_LOOKUP_QUERY_INVALID");
  });

  it.each(["generatedPath", "originalSourcePath", "selector", "symbolId", "symbolKind"])("rejects wrong/blank %s without widening", (field) => {
    // <lang><zh-CN>这些字段即使未配位置也必须校验，不能依靠truthiness静默忽略。</zh-CN><en>Validate these fields even without paired positions rather than silently ignoring them by truthiness.</en></lang>
    for (const value of ["", " \t", null, false, 42, {}, []]) {
      const result = querySourceLinkedPosition(fixture(), ordinary(), { [field]: value } as SourceLinkedLookupQuery);
      expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
      expect(result.diagnostics.at(-1)?.code).toBe("DOC_SOURCE_MAP_QUERY_INVALID");
    }
  });

  it.each(["generatedPath", "originalSourcePath", "selector", "symbolId", "symbolKind", "generatedPosition", "originalPosition"])("rejects %s getters without execution", (field) => {
    let reads = 0;
    const query = Object.defineProperty({}, field, { get() { reads += 1; throw new Error("synthetic-private"); } });
    const result = querySourceLinkedPosition(fixture(), ordinary(), query);
    expect(result.status).toBe("invalid");
    expect(reads).toBe(0);
    expect(JSON.stringify(result.diagnostics)).not.toContain("synthetic-private");
  });

  it.each(["generatedPosition", "originalPosition"])("rejects malformed %s with existing coordinate diagnostics", (field) => {
    for (const value of [null, [], false, { line: 0 }, { line: -1 }, { line: 1.5 }, { line: NaN }, { line: Infinity }, { line: Number.MAX_SAFE_INTEGER + 1 }, { line: 1, column: null }, { line: 1, column: 0 }, { line: 1, column: NaN }]) {
      const result = querySourceLinkedPosition(fixture(), ordinary(), { originalSourcePath: "src/a.ts", [field]: value } as SourceLinkedLookupQuery);
      expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
      expect(result.diagnostics.at(-1)?.code).toBe("ORDINARY_SOURCE_MAP_POSITION_INVALID");
    }
  });

  it.each(["generatedPosition", "originalPosition"])("does not invoke nested %s coordinate getters", (field) => {
    for (const coordinate of ["line", "column"]) {
      let reads = 0;
      const position = Object.defineProperty({ line: 1 }, coordinate, { get() { reads += 1; throw new Error("synthetic-private"); } });
      const result = querySourceLinkedPosition(fixture(), ordinary(), { originalSourcePath: "src/a.ts", [field]: position });
      expect(result.status).toBe("invalid");
      expect(reads).toBe(0);
    }
  });

  it("converts proxy reflection errors to a fixed query diagnostic", () => {
    const query = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("synthetic-private"); }, get() { throw new Error("synthetic-private"); } });
    const result = querySourceLinkedPosition(fixture(), ordinary(), query);
    expect(result.status).toBe("invalid");
    expect(JSON.stringify(result.diagnostics)).not.toContain("synthetic-private");
  });

  it("accepts frozen/null-prototype data and ignores unknown getters", () => {
    const query = Object.freeze(Object.defineProperty(Object.assign(Object.create(null), { symbolId: "symbol:a", generatedPosition: undefined }), "x_private", { get() { throw new Error("synthetic-private"); } }));
    expect(querySourceLinkedPosition(fixture(), ordinary(), query)).toMatchObject({ status: "available", matchedEntryCount: 1 });
  });

  it("preserves forward/reverse results, optional columns and raw query identity", () => {
    const query = { originalSourcePath: "./src\\a.ts", originalPosition: { line: 1 }, selector: "#a" };
    const result = querySourceLinkedPosition(fixture(), ordinary(), query);
    expect(result).toMatchObject({ status: "available", matchedEntryCount: 1, generated: { artifactPath: "dist/a.js", position: { line: 1, column: 1 } }, original: { sourcePath: "src/a.ts", position: { line: 1 } } });
    expect(result.query).toBe(query);
    expect(querySourceLinkedPosition(fixture(), ordinary(), { generatedPosition: { line: 1 }, symbolKind: "function" }).matchedEntryCount).toBe(2);
  });

  it("keeps metadata-only queries and legacy unpaired filters", () => {
    expect(querySourceLinkedPosition(fixture(), createOrdinarySourceMapIndex({}), { generatedPath: "dist/a.js", symbolId: "symbol:b" })).toMatchObject({ status: "available", matchedEntryCount: 1 });
    expect(querySourceLinkedPosition(fixture(), ordinary(), { originalSourcePath: "missing", selector: "#a" }).matchedEntryCount).toBe(2);
  });

  it("preserves dual-input processing order and earlier lookup failures", () => {
    expect(querySourceLinkedPosition(fixture(), ordinary(), { generatedPosition: { line: 99 }, originalSourcePath: "src/a.ts", originalPosition: { line: 1 } })).toMatchObject({ status: "unmapped", entries: [], matchedEntryCount: 0 });
  });

  it("does not mutate index diagnostics or copy rejected strings into diagnostics", () => {
    const index = ordinary();
    const diagnostics = index.diagnostics.slice();
    const result = querySourceLinkedPosition(fixture(), index, { symbolId: { private: "synthetic-private" } } as never);
    expect(JSON.stringify(result.diagnostics)).not.toContain("synthetic-private");
    expect(index.diagnostics).toEqual(diagnostics);
  });

  it("rejects null-prototype arrays at the query and position boundary", () => {
    const value = Object.setPrototypeOf([], null);
    expect(querySourceLinkedPosition(fixture(), ordinary(), value).status).toBe("invalid");
    expect(querySourceLinkedPosition(fixture(), ordinary(), { generatedPosition: value }).status).toBe("invalid");
  });

  it("keeps copied positions independent while echoing the original query", () => {
    const query = { originalSourcePath: "src/a.ts", originalPosition: { line: 1, column: 1 } };
    const result = querySourceLinkedPosition(fixture(), ordinary(), query);
    result.original!.position.line = 9;
    expect(query.originalPosition.line).toBe(1);
    expect(result.query).toBe(query);
  });
});
