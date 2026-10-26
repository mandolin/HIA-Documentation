/**
 * @file
 * @lang zh-CN 文档源码映射普通索引的字段、计数、投影和所有权回归；仅使用本文件公开合成数据。
 * @lang en Field, count, projection and ownership regressions for the ordinary documentation index, using only this file's public synthetic data.
 */
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex } from "./index.js";

/**
 * @lang zh-CN 创建两条版本线共用的独立完整工件；重复引用与未使用声明用于区分计数语义，不读取文件。
 * @lang en Creates an independent complete artifact shared by both version lines; repeated references and unused declarations distinguish count semantics without file reads.
 * @param version <lang><zh-CN>显式契约标签，不按版本范围推测。</zh-CN><en>Explicit contract label, never inferred from a version range.</en></lang>
 * @returns <lang><zh-CN>本次新建的可变合成工件，允许测试逐项扰动。</zh-CN><en>New mutable synthetic artifact for per-test perturbation.</en></lang>
 */
function fixture(version: string): Record<string, any> {
  // <lang><zh-CN>相同来源的不同范围保留重复边，未声明列用于检查精度保持。</zh-CN><en>Different ranges on the same source retain repeated edges; omitted columns check precision preservation.</en></lang>
  const source = { sourceId: "source:主", rangeSource: "parser", rangeSourceDetail: "public-parser", confidence: "high" };
  // <lang><zh-CN>同一产物可具有多个选择器，计数仍按条目而非边计算。</zh-CN><en>One artifact may have multiple selectors; counts still concern entries rather than edges.</en></lang>
  const artifact = { artifactId: "artifact:main", rangeSource: "adapter", rangeSourceDetail: "public-adapter", confidence: "medium" };
  return {
    contract: "doc-source-map", contractVersion: version, id: "map:公开", producer: { name: "public-fixture", version: "1" },
    artifacts: [{ id: "artifact:main", kind: "generated", path: "dist/Card.html", language: "html" }, { id: "artifact:unused", kind: "generated", path: "dist/Card.html" }],
    sources: [{ id: "source:主", kind: "source", path: "src/Card.pug", language: "pug" }, { id: "source:unused", kind: "source", path: "src/Card.pug" }],
    sourceMaps: [{ id: "map:z", kind: "ordinary-source-map", language: "json", path: "dist/z.map" }, { id: "map:a", kind: "ordinary-source-map", path: "dist/a.map" }],
    generatedBindingSidecars: [{ id: "binding:sidecar", contract: "generated-documentation-binding", contractVersion: version === "1.0.0" ? "0.2.0-draft" : "0.1.0-draft", path: "dist/bindings.json" }],
    localeResolutionSidecars: [{ id: "locale:resolution", contract: "documentation-locale-resolution", contractVersion: "0.1.0-draft", path: "dist/resolution.json" }],
    localeDiscoverySidecars: [{ id: "locale:discovery", contract: "documentation-locale-resource-declaration", contractVersion: "0.1.0-draft", path: "dist/discovery.json" }],
    chains: [], privacy: { sourcesContentPolicy: "none" }, diagnostics: [],
    entries: [
      { id: "entry:z", kind: "symbol", symbolId: "symbol:公开", symbolKind: "component", classification: "public", relationKind: "generated-from", diagnostics: ["NOTE", { code: "DETAIL", message: "not an entry field", severity: "error" }],
        sourceRefs: [{ ...source, range: { start: { line: 2 }, end: { line: 4, column: 9 } } }, { ...source, range: { start: { line: 8, column: 3 }, end: { line: 9 } } }],
        artifactRefs: [{ ...artifact, selector: "#z" }, { ...artifact, selector: "#a" }],
        generatedBindingRefs: [{ sidecarId: "binding:sidecar", bindingId: "binding:one" }, { sidecarId: "binding:sidecar", bindingId: "binding:one" }] },
      { id: "entry:source-only", kind: "symbol", diagnostics: [], sourceRefs: [{ ...source }], artifactRefs: [] },
      { id: "entry:artifact-only", kind: "symbol", diagnostics: [], sourceRefs: [], artifactRefs: [{ ...artifact }] },
      { id: "entry:unresolved", kind: "symbol", diagnostics: [], sourceRefs: [{ ...source, rangeSource: "unresolved", confidence: "none" }], artifactRefs: [{ ...artifact }] },
      { id: "entry:a", kind: "symbol", diagnostics: [], sourceRefs: [{ ...source }], artifactRefs: [{ ...artifact }] }
    ]
  };
}

describe.each(["0.1.0-draft", "1.0.0"])("ordinary document index metadata %s", version => {
  it("counts declarations, entries and linked entries in distinct domains", () => {
    // <lang><zh-CN>重复路径不合并，只有同时具有可用两侧引用的条目计入linked。</zh-CN><en>Repeated paths are not merged; only entries with usable references on both sides count as linked.</en></lang>
    const index = createDocSourceMapIndex(fixture(version));
    expect(index).toMatchObject({ status: "available", artifactCount: 2, sourceCount: 2, sourceMapCount: 2, entryCount: 5, linkedEntryCount: 2, unresolvedEntryCount: 3, bindingSidecarCount: 1, localeResolutionSidecarCount: 1, localeDiscoverySidecarCount: 1 });
  });
  it("retains the declared identity, version and diagnostic context", () => {
    // <lang><zh-CN>诊断路径是原始上下文，不应被误当成产物路径规范化。</zh-CN><en>The diagnostic path is original context and must not be mistaken for artifact-path normalization.</en></lang>
    const index = createDocSourceMapIndex(fixture(version), { path: " context\\公开.map " });
    expect(index).toMatchObject({ contract: "doc-source-map", contractVersion: version, id: "map:公开", path: " context\\公开.map ", sourcesContentPolicy: "none" });
  });
  it("preserves entry, repeated reference and source-map declaration order", () => {
    // <lang><zh-CN>刻意逆字典序的身份可检测意外排序或去重。</zh-CN><en>Deliberately reverse-lexical identities detect accidental sorting or deduplication.</en></lang>
    const index = createDocSourceMapIndex(fixture(version));
    expect(index.entries.map(entry => entry.id)).toEqual(["entry:z", "entry:source-only", "entry:artifact-only", "entry:unresolved", "entry:a"]);
    expect(index.entries[0]!.artifactLinks.map(link => link.selector)).toEqual(["#z", "#a"]);
    expect(index.entries[0]!.sourceLinks).toHaveLength(2);
    expect(index.entries[0]!.generatedBindingRefs).toHaveLength(2);
    expect(index.sourceMaps.map(map => map.id)).toEqual(["map:z", "map:a"]);
  });
  it("copies source and artifact path/language from declarations, not reference extensions", () => {
    // <lang><zh-CN>引用层扩展不覆盖顶层身份解析出的路径/语言。</zh-CN><en>Reference extensions do not override paths/languages resolved from top-level identities.</en></lang>
    const value = fixture(version);
    Object.assign(value.entries[0].sourceRefs[0], { path: "wrong.pug", language: "wrong" });
    Object.assign(value.entries[0].artifactRefs[0], { path: "wrong.html", language: "wrong" });
    // <lang><zh-CN>正常索引投影只保留各自七个公开字段。</zh-CN><en>The normal projection retains each link's seven public fields only.</en></lang>
    const index = createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(index.entries[0]!.sourceLinks[0]).toMatchObject({ sourceId: "source:主", path: "src/Card.pug", language: "pug", rangeSource: "parser", rangeSourceDetail: "public-parser", confidence: "high" });
    expect(index.entries[0]!.artifactLinks[0]).toEqual({ artifactId: "artifact:main", path: "dist/Card.html", language: "html", selector: "#z", rangeSource: "adapter", rangeSourceDetail: "public-adapter", confidence: "medium" });
  });
  it("retains entry metadata and diagnostic codes without escalating entry severity", () => {
    // <lang><zh-CN>entry diagnostics只投影code，不作为根severity诊断重新解释。</zh-CN><en>Entry diagnostics project codes only and are not reinterpreted as root severity diagnostics.</en></lang>
    const index = createDocSourceMapIndex(fixture(version));
    expect(index.status).toBe("available");
    expect(index.diagnostics).toEqual([]);
    expect(index.entries[0]).toMatchObject({ classification: "public", relationKind: "generated-from", symbolId: "symbol:公开", symbolKind: "component", diagnostics: ["NOTE", "DETAIL"] });
  });
  it("keeps binding/locale declarations and ordinary maps as minimal metadata", () => {
    // <lang><zh-CN>开放普通扩展可存在于输入，但不进入sidecar或source-map索引节点。</zh-CN><en>Open ordinary extensions may exist in input without entering sidecar or source-map index nodes.</en></lang>
    const value = fixture(version);
    for (const key of ["sourceMaps", "generatedBindingSidecars", "localeResolutionSidecars", "localeDiscoverySidecars"]) value[key][0].publicNote = { value: "discard" };
    // <lang><zh-CN>返回节点不持有完整sidecar正文或开放扩展。</zh-CN><en>Returned nodes contain neither complete sidecar bodies nor open extensions.</en></lang>
    const index = createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    for (const nodes of [index.bindingSidecars, index.localeResolutionSidecars, index.localeDiscoverySidecars]) expect(Object.keys(nodes[0]!).sort()).toEqual(["contract", "contractVersion", "id", "path"]);
    expect(index.sourceMaps[0]).toEqual({ id: "map:z", kind: "ordinary-source-map", language: "json", path: "dist/z.map" });
  });
  it("copies range containers and retains omitted columns without inventing coordinates", () => {
    // <lang><zh-CN>范围坐标来自独立测试工件，输入与索引不能共享可变容器。</zh-CN><en>Range coordinates come from an independent fixture; input and index must not share mutable containers.</en></lang>
    const value = fixture(version);
    const index = createDocSourceMapIndex(value);
    expect(index.entries[0]!.sourceLinks[0]!.range).toEqual({ start: { line: 2 }, end: { line: 4, column: 9 } });
    expect(index.entries[0]!.sourceLinks[0]!.range).not.toBe(value.entries[0].sourceRefs[0].range);
    expect(index.entries[0]!.sourceLinks[0]!.range!.start).not.toBe(value.entries[0].sourceRefs[0].range.start);
  });
  it("counts links without requiring ranges, selectors or a resolved binding body", () => {
    // <lang><zh-CN>只保留无坐标的双侧引用条目以直接观察linked谓词。</zh-CN><en>Retain only the entry with coordinate-free bilateral references to observe the linked predicate directly.</en></lang>
    const value = fixture(version);
    value.entries = [value.entries[4]];
    expect(createDocSourceMapIndex(value)).toMatchObject({ status: "available", entryCount: 1, linkedEntryCount: 1, unresolvedEntryCount: 0 });
  });
  it("keeps unsupported-version metadata while marking it unusable", () => {
    // <lang><zh-CN>未知标签不清空已可投影字段，但不能被available替代。</zh-CN><en>An unknown label does not erase projectable fields, but must never become available.</en></lang>
    const value = fixture(version);
    value.contractVersion = "99.0.0";
    expect(createDocSourceMapIndex(value)).toMatchObject({ status: "unsupported-version", contractVersion: "99.0.0", entryCount: 5, linkedEntryCount: 2 });
  });
  it("retains partial metadata for errors and prioritizes invalid over unknown versions", () => {
    // <lang><zh-CN>根error与未知版本同时出现，错误优先且元数据并非强制清空。</zh-CN><en>A root error takes precedence over an unknown version, without requiring metadata erasure.</en></lang>
    const value = fixture(version);
    value.contractVersion = "99.0.0";
    value.diagnostics = [{ code: "PUBLIC_ERROR", severity: "error", message: "caller message" }];
    expect(createDocSourceMapIndex(value)).toMatchObject({ status: "invalid", entryCount: 5, diagnostics: [expect.objectContaining({ code: "DOC_SOURCE_MAP_UNSUPPORTED_VERSION", severity: "warning" }), expect.objectContaining({ code: "PUBLIC_ERROR", message: "caller message", severity: "error" })] });
  });
  it("retains unknown-source references and warnings without inventing paths", () => {
    // <lang><zh-CN>未知身份仍保留引用元数据，不应推导出一个不存在的文件路径。</zh-CN><en>An unknown identity retains reference metadata without inventing a nonexistent file path.</en></lang>
    const value = fixture(version);
    value.entries[0].sourceRefs[0].sourceId = "source:missing";
    // <lang><zh-CN>另一条已知来源引用仍可令该条目联通。</zh-CN><en>The other known source reference may still make this entry linked.</en></lang>
    const index = createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(index.entries[0]!.sourceLinks[0]).toMatchObject({ sourceId: "source:missing", confidence: "high" });
    expect(index.entries[0]!.sourceLinks[0]).not.toHaveProperty("path");
    expect(index.diagnostics.some(diagnostic => diagnostic.code === "DOC_SOURCE_MAP_ENTRY_UNRESOLVED")).toBe(true);
  });
  it("retains unresolved binding pairs without loading or resolving sidecar contents", () => {
    // <lang><zh-CN>最小配对仅检查sidecar声明，未知sidecar产生warning并保留原身份。</zh-CN><en>Minimal pairs check sidecar declarations only; an unknown sidecar warns while retaining original identities.</en></lang>
    const value = fixture(version);
    value.entries[0].generatedBindingRefs[0].sidecarId = "sidecar:missing";
    const index = createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(index.entries[0]!.generatedBindingRefs[0]).toEqual({ sidecarId: "sidecar:missing", bindingId: "binding:one" });
    expect(index.diagnostics.some(diagnostic => diagnostic.code === "DOC_SOURCE_MAP_BINDING_SIDECAR_UNRESOLVED")).toBe(true);
  });
  it("does not expose source bodies even when the input explicitly allows embedding", () => {
    // <lang><zh-CN>正文标记只用于证明索引过滤，不代表真实私有资料。</zh-CN><en>The body marker only proves index filtering and represents no real private material.</en></lang>
    const value = fixture(version);
    value.privacy.sourcesContentPolicy = "embed";
    value.sources[0].content = "SYNTHETIC_BODY_NOT_PROJECTED";
    value.publicExtension = { note: "SYNTHETIC_EXTENSION_NOT_PROJECTED" };
    const index = createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(index.sourcesContentPolicy).toBe("embed");
    expect(JSON.stringify(index)).not.toContain("SYNTHETIC_BODY_NOT_PROJECTED");
    expect(JSON.stringify(index)).not.toContain("SYNTHETIC_EXTENSION_NOT_PROJECTED");
  });
  it("creates mutable fresh metadata containers with snapshot counts", () => {
    // <lang><zh-CN>普通索引历史上可变；此测试不把修改后的索引当成仍经验证。</zh-CN><en>The ordinary index is historically mutable; this test does not treat a modified index as still validated.</en></lang>
    const value = fixture(version);
    const index = createDocSourceMapIndex(value);
    expect(Object.isFrozen(index)).toBe(false);
    expect(Object.isFrozen(index.entries)).toBe(false);
    index.entries[0]!.sourceLinks[0]!.range!.start.line = 50;
    index.entries.pop();
    expect(value.entries).toHaveLength(5);
    expect(value.entries[0].sourceRefs[0].range.start.line).toBe(2);
    expect(index.entryCount).toBe(5);
  });
  it("does not observe later changes to input ranges, declarations or lists", () => {
    // <lang><zh-CN>输入变化只影响后续创建，不会回写已投影的容器。</zh-CN><en>Input changes affect later creations without writing through existing projected containers.</en></lang>
    const value = fixture(version);
    const index = createDocSourceMapIndex(value);
    value.sources[0].path = "src/Changed.pug";
    value.entries[0].sourceRefs[0].range.start.line = 99;
    value.generatedBindingSidecars[0].path = "dist/changed.json";
    value.entries.pop();
    expect(index.entryCount).toBe(5);
    expect(index.entries).toHaveLength(5);
    expect(index.entries[0]!.sourceLinks[0]).toMatchObject({ path: "src/Card.pug", range: { start: { line: 2 } } });
    expect(index.bindingSidecars[0]!.path).toBe("dist/bindings.json");
  });
  it("keeps raw declared paths rather than applying query path normalization", () => {
    // <lang><zh-CN>安全相对路径在投影阶段保留分隔符，定位层另有规范化规则。</zh-CN><en>Safe relative paths retain separators during projection; lookup normalization belongs to a separate layer.</en></lang>
    const value = fixture(version);
    value.sources[0].path = ".\\src\\Card.pug";
    const index = createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(index.entries[0]!.sourceLinks[0]!.path).toBe(".\\src\\Card.pug");
  });
});

describe("ordinary document index stable failure shapes", () => {
  it.each([null, 5, []])("returns an empty metadata shape for invalid root %j", value => {
    // <lang><zh-CN>根预检失败不保留版本/id，也不返回部分引用。</zh-CN><en>Root preflight failure retains no version/id or partial references.</en></lang>
    const index = createDocSourceMapIndex(value);
    expect(index).toMatchObject({ status: "invalid", artifactCount: 0, sourceCount: 0, entryCount: 0, bindingSidecars: [], localeResolutionSidecars: [], localeDiscoverySidecars: [], sourceMaps: [], entries: [], sourcesContentPolicy: "none" });
    expect(index).not.toHaveProperty("contractVersion");
    expect(index).not.toHaveProperty("id");
  });
  it("preserves permissive legacy omissions without claiming wire-schema completeness", () => {
    // <lang><zh-CN>旧reader可接纳最小空条目集合；索引标签不是完整wire验证证据。</zh-CN><en>The legacy reader admits a minimal empty entry collection; index status is not complete wire-validation evidence.</en></lang>
    const index = createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: "0.1.0-draft", entries: [] });
    expect(index).toMatchObject({ status: "available", sourceCount: 0, artifactCount: 0, sourcesContentPolicy: "none", entries: [] });
  });
});
