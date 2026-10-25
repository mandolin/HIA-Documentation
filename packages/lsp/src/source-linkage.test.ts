/**
 * @file
 * @lang zh-CN LSP源码映射查询的状态/诊断/空状态隔离回归，全部使用合成数据。
 * @lang en Regression coverage for LSP source-map query status/diagnostic/empty-state isolation using synthetic data only.
 */
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, type DocSourceMapQuery } from "@hia-doc/source-linkage";
import { createHiaDocumentSourceMapIndexResult } from "./source-linkage.js";
import { createHiaLspService } from "./service.js";

/** @lang zh-CN 有可观察条目的最小合法历史工件，可切换拒绝状态。 @lang en Minimal valid legacy artifact with observable entries and selectable rejection status. */
function manifest(version = "0.1.0-draft") {
  return { contract: "doc-source-map", contractVersion: version, sources: [{ id: "s", path: "src/a.ts" }], artifacts: [{ id: "a", path: "dist/a.js" }], entries: [{ id: "entry", symbolId: "symbol:a", sourceRefs: [{ sourceId: "s" }], artifactRefs: [{ artifactId: "a" }] }] };
}

describe("LSP source-linkage query propagation", () => {
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
