/**
 * @file
 * @lang zh-CN 版本与隐私拒绝路径必须隔离映射结果，不能只附加 warning 后继续暴露查询结果。
 * @lang en Version and privacy refusal paths must isolate mappings rather than merely attach warnings to consumable query results.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDocSourceMapIndex,
  createOrdinarySourceMapIndex,
  findDocSourceMapEntriesByArtifact,
  findDocSourceMapEntriesBySource,
  findDocSourceMapEntriesBySymbol,
  queryDocSourceMapIndex,
  querySourceLinkedPosition
} from "./index.js";

/**
 * @lang zh-CN 读取公开的历史 synthetic linkage fixture，每次返回独立对象。
 * @lang en Reads the public historical synthetic linkage fixture, returning an independent object each time.
 * @returns <lang><zh-CN>保留 0.1.0-draft wire 身份的测试数据。</zh-CN><en>Test data retaining its 0.1.0-draft wire identity.</en></lang>
 */
function fixture(): Record<string, any> {
  return JSON.parse(readFileSync(new URL("../../../fixtures/project-mixed-alert.docmap.json", import.meta.url), "utf8"));
}

describe("doc-source-map version and privacy isolation", () => {
  it("keeps the supported historical fixture queryable", () => {
    // <lang><zh-CN>正例防止通过一律返回空映射来伪造拒绝路径修复。</zh-CN><en>The positive control prevents a blanket empty result from masquerading as a refusal-path fix.</en></lang>
    const index = createDocSourceMapIndex(fixture());
    expect(index.status).toBe("available");
    expect(queryDocSourceMapIndex(index).entries.length).toBeGreaterThan(0);
  });

  it.each(["9.0.0", "0.1.1-draft", "", null, 1])("isolates unsupported or malformed version %s", (version) => {
    // <lang><zh-CN>只替换 wire 版本，保留有效路径和 entries，确保反例确实经过版本边界。</zh-CN><en>Change only the wire version, retaining valid paths and entries so the counterexample exercises the version boundary.</en></lang>
    const manifest = fixture();
    manifest.contractVersion = version;
    const index = createDocSourceMapIndex(manifest);
    expect(index.status).not.toBe("available");
    expect(index.diagnostics.map(({ code }) => code)).toContain("DOC_SOURCE_MAP_UNSUPPORTED_VERSION");
    expect(queryDocSourceMapIndex(index).entries).toEqual([]);
    expect(queryDocSourceMapIndex(index).matchedEntryCount).toBe(0);
    expect(findDocSourceMapEntriesBySymbol(index, String(manifest.entries[0].symbolId))).toEqual([]);
    expect(findDocSourceMapEntriesByArtifact(index, "dist/alert.html")).toEqual([]);
    expect(findDocSourceMapEntriesBySource(index, "src/components/alert.html")).toEqual([]);
    expect(querySourceLinkedPosition(index, createOrdinarySourceMapIndex({ version: 3, sources: [], names: [], mappings: "" }), {}).entries).toEqual([]);
  });

  it.each(["synthetic-private-body", "", ["synthetic-private-body"]])("isolates forbidden sourcesContent %j even with usable entries", (body) => {
    // <lang><zh-CN>来源正文被显式禁止时，结构有效的路径也不能继续成为可消费结果。</zh-CN><en>When source bodies are forbidden, otherwise valid paths must not remain consumable results.</en></lang>
    const manifest = fixture();
    manifest.sources[0].sourcesContent = body;
    const index = createDocSourceMapIndex(manifest);
    expect(index.status).toBe("invalid");
    expect(queryDocSourceMapIndex(index).entries).toEqual([]);
    expect(queryDocSourceMapIndex(index).diagnostics).toEqual(index.diagnostics);
    expect(index.diagnostics.map(({ code }) => code)).toContain("DOC_SOURCE_MAP_SOURCES_CONTENT_BLOCKED");
    expect(JSON.stringify(index)).not.toContain("synthetic-private-body");
  });

  it.each(["embed", "redacted"])("retains explicit %s opt-in without exposing bodies in the index", (policy) => {
    // <lang><zh-CN>既有契约允许显式正文策略；修复不能删除该能力，也不能把正文复制进索引。</zh-CN><en>The existing contract permits explicit body policies; the fix must retain them without copying bodies into the index.</en></lang>
    const manifest = fixture();
    manifest.sources[0].sourcesContentPolicy = policy;
    manifest.sources[0].sourcesContent = "synthetic-allowed-body";
    const index = createDocSourceMapIndex(manifest);
    expect(index.status).toBe("available");
    expect(queryDocSourceMapIndex(index).entries.length).toBeGreaterThan(0);
    expect(JSON.stringify(index)).not.toContain("synthetic-allowed-body");
  });
});
