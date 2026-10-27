/**
 * @file
 * @lang zh-CN 严格同点锚点的字节、槽位、范围及旧接口隔离回归。
 * @lang en Byte, slot, range and legacy-isolation regressions for strict same-point anchors.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createOrdinaryCoordinateProfileIndex, queryVerifiedSourceAnchor, createOrdinarySourceMapIndex } from "./index.js";

/** @lang zh-CN 构造小型真实字节输入；摘要仅由本测试所消费的确切字节计算。 @lang en Builds small actual byte inputs; hashes come only from the exact bytes consumed by this test. */
function fixture(source = "😀x\r\n") {
  const ordinaryMapBytes = Buffer.from(JSON.stringify({ version: 3, sources: ["src/a.scss"], names: [], mappings: "AAAE" }), "utf8");
  const documentationMapBytes = Buffer.from(JSON.stringify({
    contract: "doc-source-map", contractVersion: "1.1.0", id: "docmap:test",
    producer: { name: "test", version: "1" },
    artifacts: [{ id: "artifact:css", kind: "generated-css", path: "dist/a.css" }],
    sources: [{ id: "source:scss", kind: "stylesheet-source", path: "src/a.scss", sourcesContentPolicy: "none" }],
    sourceMaps: [{ id: "map:css", kind: "ordinary-source-map", path: "dist/a.css.map", mapsFrom: "artifact:css", mapsTo: ["source:scss"], sourcesContentPolicy: "none" }],
    chains: [], entries: [{ id: "entry:x", kind: "symbol", sourceRefs: [{ sourceId: "source:scss", range: { start: { line: 1, column: 3 }, end: { line: 1, column: 4 } }, rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }, rangeSource: "parser", confidence: "high" }], artifactRefs: [{ artifactId: "artifact:css", rangeSource: "adapter", confidence: "high" }], diagnostics: [] }],
    privacy: { sourcesContentPolicy: "none" }, diagnostics: []
  }), "utf8");
  const sourceBytes = Buffer.from(source, "utf8");
  const digest = (bytes: Uint8Array) => ({ algorithm: "sha256", value: createHash("sha256").update(bytes).digest("base64") });
  const profile = {
    contract: "ordinary-source-map-coordinate-profile", contractVersion: "0.1.0-draft", id: "profile:test",
    ordinaryMap: { sourceMapId: "map:css", artifactId: "artifact:css", digest: digest(ordinaryMapBytes) },
    documentationMap: { id: "docmap:test", contractVersion: "1.1.0", digest: digest(documentationMapBytes) },
    sourceSlots: [{ sectionIndex: null, sourceIndex: 0, sourceId: "source:scss", columnUnit: "utf16-code-unit", sourceRevision: "revision:test", sourceByteDigest: digest(sourceBytes), sourceTextEncoding: "utf-8", sourceTextTransform: "none", sourceTextDigest: { representation: "decoded-utf16-code-units", ...digest(Buffer.from(source, "utf16le")) } }],
    privacy: { sourcesContentPolicy: "none" }
  };
  const input = { profile, ordinaryMapBytes, documentationMapBytes, sourceInputs: [{ sectionIndex: null, sourceIndex: 0, bytes: sourceBytes }] };
  const query = { entryId: "entry:x", sourceId: "source:scss", sectionIndex: null, sourceIndex: 0, position: { line: 1, column: 3 }, columnUnit: "utf16-code-unit" } as const;
  return { input, query };
}

/** @lang zh-CN 测试更换普通 map 时同步只更新其声明摘要，保持其余真实字节不变。 @lang en Replaces the ordinary map and only its declared digest while retaining all other actual bytes. */
function withOrdinaryMap(base: ReturnType<typeof fixture>, map: unknown, sectionIndex: number | null, sourceIndex: number) {
  const ordinaryMapBytes = Buffer.from(JSON.stringify(map), "utf8");
  const profile = structuredClone(base.input.profile);
  profile.ordinaryMap.digest.value = createHash("sha256").update(ordinaryMapBytes).digest("base64");
  profile.sourceSlots[0]!.sectionIndex = sectionIndex;
  profile.sourceSlots[0]!.sourceIndex = sourceIndex;
  return { profile, ordinaryMapBytes, documentationMapBytes: base.input.documentationMapBytes,
    sourceInputs: [{ sectionIndex, sourceIndex, bytes: base.input.sourceInputs[0]!.bytes }] };
}

/**
 * @lang zh-CN 构造零长度边界反例，始终从实际源码与地图字节重算摘要；人工普通段仅用于隔离读取器，不表示生产器会输出它。
 * @lang en Builds zero-length boundary cases with digests recomputed from actual source and map bytes; the synthetic ordinary segment isolates the reader and does not imply producer output.
 * @param source <lang><zh-CN>本次授权的源码文本，可为空。</zh-CN><en>Authorized source text for this query, possibly empty.</en></lang>
 * @param endBoundary <lang><zh-CN>文档引用终点约定。</zh-CN><en>Documentation reference endpoint convention.</en></lang>
 * @param mappings <lang><zh-CN>普通地图段，默认人工 1:1 段；空串表示没有段。</zh-CN><en>Ordinary map mappings, defaulting to a synthetic 1:1 segment; empty means no segment.</en></lang>
 * @returns <lang><zh-CN>匹配实际字节的严格输入及 1:1 查询。</zh-CN><en>Strict input matching actual bytes and a 1:1 query.</en></lang>
 */
function zeroBoundaryFixture(source: string, endBoundary: "exclusive" | "inclusive", mappings = "AAAA") {
  const base = fixture(source);
  const input = withOrdinaryMap(base, { version: 3, sources: ["src/a.scss"], names: [], mappings }, null, 0);
  // <lang><zh-CN>让文档引用与请求位置同为 1:1，单独改变终点约定；摘要对应改后的文档字节。</zh-CN><en>Place the documentation reference and query at 1:1, changing only the endpoint convention; hash the amended documentation bytes.</en></lang>
  const documentation = JSON.parse(input.documentationMapBytes.toString("utf8"));
  documentation.entries[0].sourceRefs[0].range.start.column = 1;
  documentation.entries[0].sourceRefs[0].range.end.column = 1;
  documentation.entries[0].sourceRefs[0].rangeConvention.endBoundary = endBoundary;
  input.documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
  input.profile.documentationMap.digest.value = createHash("sha256").update(input.documentationMapBytes).digest("base64");
  return { input, query: { ...base.query, position: { line: 1, column: 1 } } };
}

describe("ordinary coordinate profile strict reader", () => {
  it("verifies an actual segment after a non-BMP character while old API stays numeric", async () => {
    const { input, query } = fixture();
    const index = await createOrdinaryCoordinateProfileIndex(input);
    expect(index.status).toBe("available");
    expect(queryVerifiedSourceAnchor(index, query).verification).toMatchObject({ kind: "exact-anchor", generatedPosition: { line: 1, column: 1 } });
    expect(createOrdinarySourceMapIndex(JSON.parse(input.ordinaryMapBytes.toString("utf8"))).status).toBe("available");
  });

  it("accepts a current documentation-map entry ID with a valid collision suffix", async () => {
    const base = fixture();
    // <lang><zh-CN>只改文档地图条目及其实际字节摘要；侧载身份和普通地图保持原值。</zh-CN><en>Change only the documentation entry and its actual-byte digest; keep sidecar identities and the ordinary map unchanged.</en></lang>
    const documentation = JSON.parse(base.input.documentationMapBytes.toString("utf8"));
    documentation.entries[0].id = "entry:relation:block:content~2";
    const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    const profile = structuredClone(base.input.profile);
    profile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    const index = await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes });
    expect(index.status).toBe("available");
    expect(queryVerifiedSourceAnchor(index, { ...base.query, entryId: documentation.entries[0].id }).verification.kind).toBe("exact-anchor");
  });

  it("does not reject an exact anchor because unrelated document IDs contain a valid suffix", async () => {
    const base = fixture();
    // <lang><zh-CN>未查询的文档来源、工件、映射目标和条目可使用当前文档地图的非空身份，不改变被签发的原始槽位。</zh-CN><en>Unqueried documentation sources, artifacts, map targets and entries may use the current map's nonempty IDs without changing the signed raw slot.</en></lang>
    const documentation = JSON.parse(base.input.documentationMapBytes.toString("utf8"));
    documentation.sources.push({ id: "source:other~2", kind: "stylesheet-source", path: "src/other.scss", sourcesContentPolicy: "none" });
    documentation.artifacts.push({ id: "artifact:other~2", kind: "generated-css", path: "dist/other.css" });
    documentation.sourceMaps[0].mapsTo.push("source:other~2");
    documentation.entries.push({ id: "entry:other~2", kind: "symbol", sourceRefs: [{ sourceId: "source:other~2", rangeSource: "parser", confidence: "high" }], artifactRefs: [{ artifactId: "artifact:other~2", rangeSource: "adapter", confidence: "high" }], diagnostics: [] });
    const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    const profile = structuredClone(base.input.profile);
    profile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    const index = await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes });
    expect(index.status).toBe("available");
    expect(queryVerifiedSourceAnchor(index, base.query).verification.kind).toBe("exact-anchor");
  });

  it("still rejects empty documentation IDs and non-token sidecar source identities", async () => {
    const base = fixture();
    // <lang><zh-CN>文档地图禁空身份，侧载仍禁碰撞符；两层规则不能互相替代。</zh-CN><en>The documentation map forbids empty IDs while the sidecar still forbids collision punctuation; neither rule replaces the other.</en></lang>
    const documentation = JSON.parse(base.input.documentationMapBytes.toString("utf8"));
    documentation.entries[0].id = "";
    const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    const profile = structuredClone(base.input.profile);
    profile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes })).status).toBe("invalid");
    const nonTokenProfile = structuredClone(base.input.profile);
    nonTokenProfile.sourceSlots[0]!.sourceId = "source:scss~2";
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile: nonTokenProfile })).status).toBe("invalid");
    const validIndex = await createOrdinaryCoordinateProfileIndex(base.input);
    expect(queryVerifiedSourceAnchor(validIndex, { ...base.query, entryId: "" }).verification.kind).toBe("invalid");
  });

  it("rejects stale actual bytes and refuses numeric unit coincidence", async () => {
    const { input, query } = fixture();
    const stale = await createOrdinaryCoordinateProfileIndex({ ...input, ordinaryMapBytes: Buffer.from("{}") });
    expect(queryVerifiedSourceAnchor(stale, query).verification.kind).not.toBe("exact-anchor");
    const wrongUnit = queryVerifiedSourceAnchor(await createOrdinaryCoordinateProfileIndex(input), { ...query, columnUnit: "unicode-code-point" });
    expect(wrongUnit.verification.kind).toBe("unverified");
  });

  it("does not turn a GLB predecessor or a missing authorized source into an exact anchor", async () => {
    const { input, query } = fixture();
    const nearest = queryVerifiedSourceAnchor(await createOrdinaryCoordinateProfileIndex(input), { ...query, position: { line: 1, column: 4 } });
    expect(nearest.verification.kind).not.toBe("exact-anchor");
    const missing = await createOrdinaryCoordinateProfileIndex({ ...input, sourceInputs: [] });
    expect(queryVerifiedSourceAnchor(missing, query).verification.kind).toBe("unverified");
  });

  it("keeps duplicate source paths distinct by raw slot", async () => {
    const base = fixture();
    const input = withOrdinaryMap(base, { version: 3, sources: ["src/a.scss", "src/a.scss"], names: [], mappings: "ACAE" }, null, 1);
    const index = await createOrdinaryCoordinateProfileIndex(input);
    expect(index.status).toBe("available");
    expect(queryVerifiedSourceAnchor(index, { ...base.query, sourceIndex: 1 }).verification.kind).toBe("exact-anchor");
    expect(queryVerifiedSourceAnchor(index, { ...base.query, sourceIndex: 0 }).verification.kind).toBe("unverified");
    const empty = withOrdinaryMap(base, { version: 3, sources: [""], names: [], mappings: "AAAE" }, null, 0);
    expect((await createOrdinaryCoordinateProfileIndex(empty)).status).toBe("invalid");
  });

  it("retains a local section offset and rejects external or nested sections", async () => {
    const base = fixture();
    const sectioned = { version: 3, sections: [{ offset: { line: 1, column: 5 }, map: { version: 3, sources: ["src/a.scss"], names: [], mappings: "AAAE" } }] };
    const input = withOrdinaryMap(base, sectioned, 0, 0);
    const index = await createOrdinaryCoordinateProfileIndex(input);
    expect(queryVerifiedSourceAnchor(index, { ...base.query, sectionIndex: 0 }).verification).toMatchObject({ kind: "exact-anchor", generatedPosition: { line: 2, column: 6 } });
    const external = withOrdinaryMap(base, { version: 3, sections: [{ offset: { line: 0, column: 0 }, url: "https://example.invalid/map" }] }, 0, 0);
    expect((await createOrdinaryCoordinateProfileIndex(external)).status).toBe("invalid");
    const nested = withOrdinaryMap(base, { version: 3, sections: [{ offset: { line: 0, column: 0 }, map: sectioned }] }, 0, 0);
    expect((await createOrdinaryCoordinateProfileIndex(nested)).status).toBe("invalid");
    // <lang><zh-CN>历史普通索引仍拒绝 sectioned map，新版接纳不改变旧版默认。</zh-CN><en>The legacy ordinary index still rejects sections; new support does not change its default.</en></lang>
    expect(createOrdinarySourceMapIndex(sectioned).status).toBe("invalid");
  });

  it("rejects overlapping sections and embedded source text", async () => {
    const base = fixture();
    const overlap = withOrdinaryMap(base, { version: 3, sections: [
      { offset: { line: 0, column: 0 }, map: { version: 3, sources: ["src/a.scss"], names: [], mappings: ";AAAE" } },
      { offset: { line: 0, column: 5 }, map: { version: 3, sources: ["src/a.scss"], names: [], mappings: "AAAE" } }
    ] }, 0, 0);
    expect((await createOrdinaryCoordinateProfileIndex(overlap)).status).toBe("invalid");
    const embedded = withOrdinaryMap(base, { version: 3, sources: ["src/a.scss"], sourcesContent: ["private"], names: [], mappings: "AAAE" }, null, 0);
    expect((await createOrdinaryCoordinateProfileIndex(embedded)).status).toBe("invalid");
  });

  it("rejects repeated raw JSON members including escaped-key aliases", async () => {
    const base = fixture();
    const raw = JSON.stringify(base.input.profile).replace('"id":"profile:test"', '"id":"first","\\u0069d":"second"');
    const index = await createOrdinaryCoordinateProfileIndex({ ...base.input, profile: raw });
    expect(index.status).toBe("invalid");
    expect(queryVerifiedSourceAnchor(index, base.query).verification.kind).not.toBe("exact-anchor");
    const ordinaryMapBytes = Buffer.from(base.input.ordinaryMapBytes.toString("utf8").replace('"version":3', '"version":3,"version":3'), "utf8");
    const ordinaryProfile = structuredClone(base.input.profile);
    ordinaryProfile.ordinaryMap.digest.value = createHash("sha256").update(ordinaryMapBytes).digest("base64");
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile: ordinaryProfile, ordinaryMapBytes })).status).toBe("invalid");
    const documentationMapBytes = Buffer.from(base.input.documentationMapBytes.toString("utf8").replace('"id":"docmap:test"', '"id":"docmap:test","id":"docmap:test"'), "utf8");
    const documentationProfile = structuredClone(base.input.profile);
    documentationProfile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile: documentationProfile, documentationMapBytes })).status).toBe("invalid");
  });

  it("keeps a stale source, unknown unit and stale doc map unverified", async () => {
    const base = fixture();
    const staleSource = await createOrdinaryCoordinateProfileIndex({ ...base.input, sourceInputs: [{ sectionIndex: null, sourceIndex: 0, bytes: Buffer.from("other") }] });
    expect(queryVerifiedSourceAnchor(staleSource, base.query).verification.kind).toBe("unverified");
    const unknownInput = { ...base.input, profile: structuredClone(base.input.profile) };
    unknownInput.profile.sourceSlots[0]!.columnUnit = "unknown";
    const unknown = await createOrdinaryCoordinateProfileIndex(unknownInput);
    expect(queryVerifiedSourceAnchor(unknown, base.query).verification.kind).toBe("unverified");
    const staleDoc = await createOrdinaryCoordinateProfileIndex({ ...base.input, documentationMapBytes: Buffer.from("{}") });
    expect(queryVerifiedSourceAnchor(staleDoc, base.query).verification.kind).not.toBe("exact-anchor");
    const staleLogical = { ...base.input, profile: structuredClone(base.input.profile) };
    staleLogical.profile.sourceSlots[0]!.sourceTextDigest.value = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    expect(queryVerifiedSourceAnchor(await createOrdinaryCoordinateProfileIndex(staleLogical), base.query).verification.kind).toBe("unverified");
  });

  it.each([
    { name: "authorized empty source with exclusive zero-length range", source: "", endBoundary: "exclusive", mappings: "AAAA", kind: "unverified", code: "COORDINATE_SOURCE_UNVERIFIED" },
    { name: "authorized empty source with inclusive point", source: "", endBoundary: "inclusive", mappings: "AAAA", kind: "unverified", code: "COORDINATE_SOURCE_UNVERIFIED" },
    { name: "nonempty source with exclusive zero-length range", source: "x", endBoundary: "exclusive", mappings: "AAAA", kind: "unverified", code: "COORDINATE_DOCUMENTATION_UNVERIFIED" },
    { name: "nonempty source with inclusive point and actual segment", source: "x", endBoundary: "inclusive", mappings: "AAAA", kind: "exact-anchor", code: "COORDINATE_EXACT_ANCHOR" },
    { name: "nonempty source with inclusive point but no ordinary segment", source: "x", endBoundary: "inclusive", mappings: "", kind: "unmapped", code: "COORDINATE_UNMAPPED" }
  ] as const)("keeps $name separate from other zero-length cases", async ({ source, endBoundary, mappings, kind, code }) => {
    const { input, query } = zeroBoundaryFixture(source, endBoundary, mappings);
    const index = await createOrdinaryCoordinateProfileIndex(input);
    const result = queryVerifiedSourceAnchor(index, query);
    expect(index.status).toBe("available");
    expect(result.verification.kind).toBe(kind);
    expect(result.diagnostics[0]?.code).toBe(code);
    expect(result.verification.generatedPosition).toEqual(kind === "exact-anchor" ? { line: 1, column: 1 } : undefined);
  });

  it("returns nearest-anchor only for a preceding segment within the same documented range", async () => {
    const base = fixture("😀xy\r\n");
    const documentation = JSON.parse(base.input.documentationMapBytes.toString("utf8"));
    documentation.entries[0].sourceRefs[0].range.end.column = 5;
    const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    const profile = structuredClone(base.input.profile);
    profile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    const index = await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes });
    expect(queryVerifiedSourceAnchor(index, { ...base.query, position: { line: 1, column: 4 } }).verification).toMatchObject({ kind: "nearest-anchor", generatedPosition: { line: 1, column: 1 } });
    expect(queryVerifiedSourceAnchor(index, { ...base.query, position: { line: 1, column: 5 } }).verification.kind).not.toBe("exact-anchor");
  });

  it("does not borrow a nearest anchor from before the selected documentation range", async () => {
    const base = fixture("😀xy\r\n");
    const input = withOrdinaryMap(base, { version: 3, sources: ["src/a.scss"], names: [], mappings: "AAAA" }, null, 0);
    const documentation = JSON.parse(input.documentationMapBytes.toString("utf8"));
    documentation.entries[0].sourceRefs[0].range.end.column = 5;
    input.documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    input.profile.documentationMap.digest.value = createHash("sha256").update(input.documentationMapBytes).digest("base64");
    const index = await createOrdinaryCoordinateProfileIndex(input);
    expect(index.status).toBe("available");
    expect(queryVerifiedSourceAnchor(index, { ...base.query, position: { line: 1, column: 4 } }).verification.kind).toBe("unmapped");
  });

  it("rejects private-looking revision labels before indexing", async () => {
    const base = fixture();
    const profile = structuredClone(base.input.profile);
    profile.sourceSlots[0]!.sourceRevision = "https://private.example.invalid/src";
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile })).status).toBe("invalid");
  });

  it("rejects path, URL, whitespace and trailing newline identity labels", async () => {
    const base = fixture();
    for (const id of ["C:\\private\\map", "\\\\server\\share", "https://name:secret@example.invalid/a", "id with space", "id\n", "id\t"]) {
      const profile = structuredClone(base.input.profile);
      profile.id = id;
      expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile })).status).toBe("invalid");
    }
    const inherited = Object.create({ id: "profile:inherited" }) as typeof base.input.profile;
    Object.assign(inherited, base.input.profile);
    delete inherited.id;
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile: inherited })).status).toBe("invalid");
  });

  it("refuses two distinct generated anchors for the same original point", async () => {
    const base = fixture();
    const input = withOrdinaryMap(base, { version: 3, sources: ["src/a.scss"], names: [], mappings: "AAAE,KAAA" }, null, 0);
    const index = await createOrdinaryCoordinateProfileIndex(input);
    expect(index.status).toBe("available");
    expect(queryVerifiedSourceAnchor(index, base.query).verification.kind).toBe("ambiguous-source");
  });

  it("rejects mapped and unmapped segments at the same generated coordinate in either order", async () => {
    const base = fixture();
    for (const mappings of ["AAAE,A", "A,AAAE"]) {
      const input = withOrdinaryMap(base, { version: 3, sources: ["src/a.scss"], names: [], mappings }, null, 0);
      const index = await createOrdinaryCoordinateProfileIndex(input);
      expect(index.status).toBe("invalid");
      expect(queryVerifiedSourceAnchor(index, base.query).verification.kind).not.toBe("exact-anchor");
    }
  });

  it("rejects an unmapped segment crossing a section boundary but keeps separated sections", async () => {
    const base = fixture();
    const atBoundary = withOrdinaryMap(base, { version: 3, sections: [
      { offset: { line: 0, column: 0 }, map: { version: 3, sources: [], names: [], mappings: "K" } },
      { offset: { line: 0, column: 5 }, map: { version: 3, sources: ["src/a.scss"], names: [], mappings: "AAAE" } }
    ] }, 1, 0);
    expect((await createOrdinaryCoordinateProfileIndex(atBoundary)).status).toBe("invalid");
    const separated = withOrdinaryMap(base, { version: 3, sections: [
      { offset: { line: 0, column: 0 }, map: { version: 3, sources: [], names: [], mappings: "A" } },
      { offset: { line: 0, column: 5 }, map: { version: 3, sources: ["src/a.scss"], names: [], mappings: "AAAE" } }
    ] }, 1, 0);
    const index = await createOrdinaryCoordinateProfileIndex(separated);
    expect(queryVerifiedSourceAnchor(index, { ...base.query, sectionIndex: 1 }).verification).toMatchObject({ kind: "exact-anchor", generatedPosition: { line: 1, column: 6 } });
  });

  it("does not execute getter fields on the input envelope or source-input records", async () => {
    const base = fixture();
    let calls = 0;
    const badEnvelope = { ...base.input, get profile() { calls += 1; return base.input.profile; } };
    expect((await createOrdinaryCoordinateProfileIndex(badEnvelope)).status).toBe("invalid");
    const badSource = { sectionIndex: null, sourceIndex: 0, get bytes() { calls += 1; return base.input.sourceInputs[0]!.bytes; } };
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, sourceInputs: [badSource] })).status).toBe("invalid");
    expect(calls).toBe(0);
  });

  it("never verifies a malformed documentation endpoint convention", async () => {
    const base = fixture();
    const documentation = JSON.parse(base.input.documentationMapBytes.toString("utf8"));
    documentation.entries[0].sourceRefs[0].rangeConvention.endBoundary = "bogus";
    const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    const profile = structuredClone(base.input.profile);
    profile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    const index = await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes });
    expect(index.status).toBe("invalid");
    expect(queryVerifiedSourceAnchor(index, base.query).verification.kind).not.toBe("exact-anchor");
    documentation.entries[0].sourceRefs[0].rangeConvention.endBoundary = "exclusive";
    documentation.entries[0].sourceRefs[0].confidence = "bogus";
    const confidenceBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    profile.documentationMap.digest.value = createHash("sha256").update(confidenceBytes).digest("base64");
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes: confidenceBytes })).status).toBe("invalid");
    documentation.entries[0].sourceRefs[0].confidence = "high";
    documentation.entries[0].sourceRefs[0].range.end.column = 1;
    const reversedBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    profile.documentationMap.digest.value = createHash("sha256").update(reversedBytes).digest("base64");
    expect((await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes: reversedBytes })).status).toBe("invalid");
  });

  it("requires an entry's generated artifact link rather than only its source range", async () => {
    const base = fixture();
    const documentation = JSON.parse(base.input.documentationMapBytes.toString("utf8"));
    documentation.entries[0].artifactRefs = [];
    const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    const profile = structuredClone(base.input.profile);
    profile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    const index = await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes });
    expect(queryVerifiedSourceAnchor(index, base.query).verification.kind).not.toBe("exact-anchor");
  });

  it("inherits root none privacy when the map/source declarations omit optional policies", async () => {
    const base = fixture();
    const documentation = JSON.parse(base.input.documentationMapBytes.toString("utf8"));
    delete documentation.sourceMaps[0].sourcesContentPolicy;
    delete documentation.sources[0].sourcesContentPolicy;
    const documentationMapBytes = Buffer.from(JSON.stringify(documentation), "utf8");
    const profile = structuredClone(base.input.profile);
    profile.documentationMap.digest.value = createHash("sha256").update(documentationMapBytes).digest("base64");
    const index = await createOrdinaryCoordinateProfileIndex({ ...base.input, profile, documentationMapBytes });
    expect(queryVerifiedSourceAnchor(index, base.query).verification.kind).toBe("exact-anchor");
  });
});
