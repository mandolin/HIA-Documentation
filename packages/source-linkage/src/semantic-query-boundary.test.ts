/**
 * @file
 * @lang zh-CN 文档语义查询的已声明字段与坐标回归，全部为合成元数据。
 * @lang en Regression coverage for declared documentation-query fields and coordinates using synthetic metadata only.
 */
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, createOrdinarySourceMapIndex, findDocSourceMapEntriesByArtifact, findDocSourceMapEntriesBySource, findDocSourceMapEntriesBySymbol, queryDocSourceMapIndex, querySourceLinkedPosition, type DocSourceMapQuery } from "./index.js";

/** @lang zh-CN 创建两个可区分的合成条目，端点可选择省略列。 @lang en Creates two distinct synthetic entries with optionally omitted endpoint columns. */
function fixture(omitColumns = false) {
  return createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: "0.1.0-draft", sources: [{ id: "source", path: "src/a.ts" }], artifacts: [{ id: "artifact", path: "dist/a.js" }], entries: ["a", "b"].map((name, offset) => ({ id: name, symbolId: `symbol:${name}`, symbolKind: "function", sourceRefs: [{ sourceId: "source", range: { start: { line: 2 + offset * 4, ...(omitColumns ? {} : { column: 1 }) }, end: { line: 3 + offset * 4, ...(omitColumns ? {} : { column: 4 }) } } }], artifactRefs: [{ artifactId: "artifact", selector: `#${name}` }] })) });
}

describe("documentation semantic query boundary", () => {
  it.each([null, [], "synthetic-private", 7, false, new Date(0), () => undefined, Object.create({ symbolId: "symbol:a" })])("rejects non-record queries without broad results: %j", (query) => {
    // <lang><zh-CN>类型断言仅模拟 JS 调用者，不能让非法输入变成无筛选查询。</zh-CN><en>The cast simulates a JavaScript caller; invalid input must not become an unfiltered query.</en></lang>
    const result = queryDocSourceMapIndex(fixture(), query as DocSourceMapQuery);
    expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
    expect(result.diagnostics.at(-1)?.code).toBe("DOC_SOURCE_MAP_QUERY_INVALID");
  });

  it("rejects arrays with a null prototype", () => {
    // <lang><zh-CN>在测试体内构造，避免参数表框架将无slice的数组误当一行参数。</zh-CN><en>Construct inside the test so the parameter-table framework cannot treat an array without slice as an argument row.</en></lang>
    const query = Object.setPrototypeOf([], null);
    expect(queryDocSourceMapIndex(fixture(), query).status).toBe("invalid");
  });

  it.each(["symbolId", "symbolKind", "sourcePath", "artifactPath", "selector"]) ("rejects invalid %s values rather than ignoring filters", (field) => {
    // <lang><zh-CN>空白与错误类型曾因 truthiness 被忽略或在路径操作中抛错。</zh-CN><en>Blank and wrong-type values were previously ignored by truthiness or threw during path operations.</en></lang>
    for (const value of ["", " \t", 42, false, null, {}, []]) {
      const result = queryDocSourceMapIndex(fixture(), { [field]: value } as DocSourceMapQuery);
      expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
      expect(result.diagnostics.at(-1)?.code).toBe("DOC_SOURCE_MAP_QUERY_INVALID");
    }
  });

  it.each([null, [], "private", { line: 0 }, { line: -1 }, { line: 1.5 }, { line: NaN }, { line: Infinity }, { line: Number.MAX_SAFE_INTEGER + 1 }, { line: 2, column: 0 }, { line: 2, column: -1 }, { line: 2, column: 1.5 }, { line: 2, column: NaN }, { line: 2, column: Infinity }, {}])("rejects malformed coordinates %j", (position) => {
    const result = queryDocSourceMapIndex(fixture(), { sourcePath: "src/a.ts", position } as DocSourceMapQuery);
    expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
  });

  it.each(["symbolId", "symbolKind", "sourcePath", "artifactPath", "selector", "position"]) ("does not execute a known %s getter", (field) => {
    // <lang><zh-CN>计数和异常正文都是合成 canary，不应被查询读取。</zh-CN><en>The counter and exception body are synthetic canaries that queries must not read.</en></lang>
    let reads = 0;
    const query = Object.defineProperty({}, field, { get() { reads += 1; throw new Error("synthetic-private"); } });
    const result = queryDocSourceMapIndex(fixture(), query);
    expect(result.status).toBe("invalid");
    expect(reads).toBe(0);
    expect(JSON.stringify(result.diagnostics)).not.toContain("synthetic-private");
  });

  it.each(["line", "column"]) ("does not execute a position %s getter", (field) => {
    let reads = 0;
    const position = Object.defineProperty({ line: 2 }, field, { get() { reads += 1; throw new Error("synthetic-private"); } });
    expect(queryDocSourceMapIndex(fixture(), { sourcePath: "src/a.ts", position }).status).toBe("invalid");
    expect(reads).toBe(0);
  });

  it("converts reflection failure to a fixed diagnostic", () => {
    // <lang><zh-CN>Proxy 反射可能抛出；不声称阻止 trap 执行，但禁止回显正文。</zh-CN><en>Proxy reflection may throw; trap execution is not prevented, but its message must not be echoed.</en></lang>
    const query = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("synthetic-private"); }, get() { throw new Error("synthetic-private"); } });
    const result = queryDocSourceMapIndex(fixture(), query);
    expect(result.status).toBe("invalid");
    expect(JSON.stringify(result.diagnostics)).not.toContain("synthetic-private");
  });

  it("ignores unknown extension getters and retains optional undefined compatibility", () => {
    const query = Object.defineProperty({ sourcePath: "./src\\a.ts", position: { line: 2, column: undefined }, symbolId: undefined }, "x_extension", { get() { throw new Error("synthetic-private"); } });
    expect(queryDocSourceMapIndex(fixture(), query as DocSourceMapQuery).entries.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("uses column one for an omitted query column at the start", () => {
    expect(findDocSourceMapEntriesBySource(fixture(), "src/a.ts", { line: 2 }).map((entry) => entry.id)).toEqual(["a"]);
  });

  it("uses column one for omitted range columns", () => {
    expect(findDocSourceMapEntriesBySource(fixture(true), "src/a.ts", { line: 3 }).map((entry) => entry.id)).toEqual(["a"]);
    expect(findDocSourceMapEntriesBySource(fixture(true), "src/a.ts", { line: 3, column: 2 })).toEqual([]);
  });

  it("preserves inclusive endpoints, intersections, order, aliases and valid misses", () => {
    const index = fixture();
    expect(findDocSourceMapEntriesBySource(index, "src/a.ts", { line: 3, column: 4 }).map((entry) => entry.id)).toEqual(["a"]);
    expect(findDocSourceMapEntriesBySource(index, "src/a.ts", { line: 3, column: 5 })).toEqual([]);
    expect(queryDocSourceMapIndex(index).entries.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(queryDocSourceMapIndex(index, { sourcePath: "./src\\a.ts", artifactPath: "dist/a.js", symbolKind: "function", selector: "#b" }).entries.map((entry) => entry.id)).toEqual(["b"]);
    expect(queryDocSourceMapIndex(index, { symbolId: "missing" })).toMatchObject({ status: "available", entries: [], matchedEntryCount: 0 });
    expect(findDocSourceMapEntriesBySymbol(index, "symbol:b").map((entry) => entry.id)).toEqual(["b"]);
    expect(findDocSourceMapEntriesByArtifact(index, "dist/a.js", "#a").map((entry) => entry.id)).toEqual(["a"]);
  });

  it("does not discard invalid optional helper arguments", () => {
    expect(findDocSourceMapEntriesBySymbol(fixture(), "")).toEqual([]);
    expect(findDocSourceMapEntriesBySource(fixture(), "src/a.ts", null as never)).toEqual([]);
    expect(findDocSourceMapEntriesByArtifact(fixture(), "dist/a.js", "")).toEqual([]);
  });

  it("accepts frozen/null-prototype queries and keeps legacy unattached filters", () => {
    expect(queryDocSourceMapIndex(fixture(), Object.freeze(Object.assign(Object.create(null), { symbolId: "symbol:a" }))).entries.map((entry) => entry.id)).toEqual(["a"]);
    expect(queryDocSourceMapIndex(fixture(), { selector: "#a", position: { line: 99 } }).matchedEntryCount).toBe(2);
  });

  it("keeps unsupported-index diagnostics and caller state intact", () => {
    const index = createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: "9.0.0", entries: [] });
    const query = Object.freeze({ symbolId: "symbol:a" });
    const before = index.diagnostics.slice();
    expect(queryDocSourceMapIndex(index, query)).toMatchObject({ status: "unsupported-version", entries: [], query });
    expect(index.diagnostics).toEqual(before);
    expect(queryDocSourceMapIndex(index, { symbolId: "" }).diagnostics.slice(0, before.length)).toEqual(before);
    expect(index.diagnostics).toEqual(before);
  });

  it("propagates rejected semantic filters through combined lookup status", () => {
    // <lang><zh-CN>元数据查询无需普通map，但文档查询invalid不能伪装成available。</zh-CN><en>Metadata queries need no ordinary map, but an invalid documentation query must not appear available.</en></lang>
    const result = querySourceLinkedPosition(fixture(), createOrdinarySourceMapIndex({}), { generatedPath: " " });
    expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DOC_SOURCE_MAP_QUERY_INVALID")).toBe(true);
  });

  it("does not read unknown coordinate accessors or trim valid identities", () => {
    const position = Object.defineProperty({ line: 2 }, "x_private", { get() { throw new Error("synthetic-private"); } });
    expect(queryDocSourceMapIndex(fixture(), { sourcePath: "src/a.ts", position }).matchedEntryCount).toBe(1);
    expect(queryDocSourceMapIndex(fixture(), { symbolId: " symbol:a " }).matchedEntryCount).toBe(0);
  });

  it("validates filters even for an empty index and preserves raw query identity", () => {
    const index = createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: "0.1.0-draft", entries: [] });
    const query = { sourcePath: 123 } as unknown as DocSourceMapQuery;
    const result = queryDocSourceMapIndex(index, query);
    expect(result.status).toBe("invalid");
    expect(result.query).toBe(query);
    expect(index.diagnostics).toEqual([]);
  });
});
