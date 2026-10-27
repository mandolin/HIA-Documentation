/**
 * @file
 * @lang zh-CN LSP源码映射查询的状态/诊断/空状态隔离回归，全部使用合成数据。
 * @lang en Regression coverage for LSP source-map query status/diagnostic/empty-state isolation using synthetic data only.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, type DocSourceMapQuery } from "@hia-doc/source-linkage";
import { createHiaDocumentSourceMapIndexResult } from "./source-linkage.js";
import { createHiaLspService } from "./service.js";

/** @lang zh-CN 有可观察条目的最小合法历史工件，可切换拒绝状态。 @lang en Minimal valid legacy artifact with observable entries and selectable rejection status. */
function manifest(version = "0.1.0-draft") {
  return { contract: "doc-source-map", contractVersion: version, sources: [{ id: "s", path: "src/a.ts" }], artifacts: [{ id: "a", path: "dist/a.js" }], entries: [{ id: "entry", symbolId: "symbol:a", sourceRefs: [{ sourceId: "s" }], artifactRefs: [{ artifactId: "a" }] }] };
}

describe("LSP source-linkage query propagation", () => {
  it("projects a declared 1.1.0 range convention and requires the caller's column unit for exact location", () => {
    // <lang><zh-CN>复用公开合成旧工件的完整结构，仅按新版规则增加逐引用约定；不猜测普通 source map 的列单位。</zh-CN><en>Reuse the complete public synthetic artifact and add the new per-reference declaration, without inferring a column unit from an ordinary source map.</en></lang>
    const value = JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/doc-source-map.json", import.meta.url), "utf8"));
    value.contractVersion = "1.1.0";
    value.entries[0].sourceRefs[0].range = { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } };
    value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "exclusive", columnUnit: "utf16-code-unit" };
    const index = createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    const uri = "file:///synthetic/a.docmap.json";
    const sourcePath = "src/components/alert.html";
    const withoutUnit = createHiaDocumentSourceMapIndexResult({ index, query: { sourcePath, position: { line: 1, column: 3 } }, uri });
    expect(withoutUnit).toMatchObject({ status: "available", entries: [], matchedEntryCount: 0 });
    const withUnit = createHiaDocumentSourceMapIndexResult({ index, query: { sourcePath, position: { line: 1, column: 3 }, columnUnit: "utf16-code-unit" }, uri });
    expect(withUnit).toMatchObject({ status: "available", matchedEntryCount: 1, entries: [{ sourceLinks: [{ rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" } }] }] });
    expect(withUnit.entries[0]?.sourceLinks[0]?.rangeConvention).not.toBe(value.entries[0].sourceRefs[0].rangeConvention);
    // <lang><zh-CN>宿主可写摘要不能反向改变索引的精确边界或坐标。</zh-CN><en>A writable host summary must not change the index's exact boundary or coordinates.</en></lang>
    const projected = withUnit.entries[0]!.sourceLinks[0]!;
    expect(projected.rangeConvention).not.toBe(index.entries[0]!.sourceLinks[0]!.rangeConvention);
    expect(projected.range).not.toBe(index.entries[0]!.sourceLinks[0]!.range);
    projected.rangeConvention!.endBoundary = "inclusive";
    projected.range!.end.column = 9;
    expect(index.entries[0]!.sourceLinks[0]!.rangeConvention).toEqual({ endBoundary: "exclusive", columnUnit: "utf16-code-unit" });
    expect(index.entries[0]!.sourceLinks[0]!.range?.end.column).toBe(4);
    expect(createHiaDocumentSourceMapIndexResult({ index, query: { sourcePath, position: { line: 1, column: 4 }, columnUnit: "utf16-code-unit" }, uri }).entries).toEqual([]);
  });

  it.each([null, false, 42, { symbolId: "" }, { sourcePath: 42 }, { sourcePath: "src/a.ts", position: { line: 0 } }].map((query, id) => ({ query, id })))("propagates query rejection $id", ({ query }) => {
    const index = createDocSourceMapIndex(manifest());
    const result = createHiaDocumentSourceMapIndexResult({ index, query: query as DocSourceMapQuery, uri: "file:///synthetic/a.docmap.json" });
    expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0, entryCount: 1 });
    expect(result.diagnostics.at(-1)?.code).toBe("DOC_SOURCE_MAP_QUERY_INVALID");
    expect(result.host.emptyState).toBeUndefined();
    expect(index.diagnostics).toEqual([]);
  });

  it.each([false, null].map((query, id) => ({ query, id })))("does not discard false/null in the managed service $id", ({ query }) => {
    const service = createHiaLspService();
    const uri = "file:///synthetic/a.docmap.json";
    service.openDocument(uri, JSON.stringify(manifest()));
    expect(service.getManagedDocSourceMapIndex(uri, query as never)).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
    expect(service.getManagedDocSourceMapIndex(uri).matchedEntryCount).toBe(1);
    service.closeDocument(uri);
  });

  it.each([undefined, { symbolId: "symbol:a" }].map((query, id) => ({ query, id })))("isolates unsupported indexes with or without query $id", ({ query }) => {
    const index = createDocSourceMapIndex(manifest("9.0.0"));
    const result = createHiaDocumentSourceMapIndexResult({ index, ...(query ? { query } : {}), uri: "file:///synthetic/a.docmap.json" });
    expect(result).toMatchObject({ status: "unsupported-version", entries: [], matchedEntryCount: 0, entryCount: 1 });
    expect(result.host.emptyState).toBeUndefined();
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "DOC_SOURCE_MAP_UNSUPPORTED_VERSION")).toBe(true);
  });

  it("isolates privacy-invalid entries even when no query was supplied", () => {
    const index = createDocSourceMapIndex({ ...manifest(), sources: [{ id: "s", path: "src/a.ts", sourcesContent: "synthetic-private" }], privacy: { sourcesContentPolicy: "none" } });
    expect(index.status).toBe("invalid");
    const result = createHiaDocumentSourceMapIndexResult({ index, uri: "file:///synthetic/a.docmap.json" });
    expect(result).toMatchObject({ status: "invalid", entries: [], matchedEntryCount: 0 });
    expect(result.host.emptyState).toBeUndefined();
    expect(JSON.stringify(result.entries)).not.toContain("entry");
  });

  it("retains valid misses, empty indexes and unavailable host states", () => {
    const index = createDocSourceMapIndex(manifest());
    expect(createHiaDocumentSourceMapIndexResult({ index, query: { symbolId: "missing" }, uri: "file:///synthetic/a.docmap.json" })).toMatchObject({ status: "available", matchedEntryCount: 0, host: { emptyState: "query-no-match" } });
    expect(createHiaDocumentSourceMapIndexResult({ index: createDocSourceMapIndex({ ...manifest(), entries: [] }), uri: "file:///synthetic/a.docmap.json" })).toMatchObject({ status: "available", host: { emptyState: "source-data-empty" } });
    expect(createHiaDocumentSourceMapIndexResult({ uri: "file:///synthetic/missing" })).toMatchObject({ status: "unavailable", host: { emptyState: "not-loaded" } });
  });

  it("retains getter rejection and unsupported isolation through the actual service", () => {
    const service = createHiaLspService();
    const uri = "file:///synthetic/a.docmap.json";
    service.openDocument(uri, JSON.stringify(manifest()));
    let reads = 0;
    const query = Object.defineProperty({}, "symbolId", { get() { reads += 1; throw new Error("synthetic-private"); } });
    const result = service.getManagedDocSourceMapIndex(uri, query);
    expect(result.status).toBe("invalid");
    expect(reads).toBe(0);
    expect(JSON.stringify(result.diagnostics)).not.toContain("synthetic-private");
    service.updateDocument(uri, JSON.stringify(manifest("9.0.0")), 2);
    expect(service.getManagedDocSourceMapIndex(uri)).toMatchObject({ status: "unsupported-version", matchedEntryCount: 0, entries: [] });
    service.closeDocument(uri);
  });
});
