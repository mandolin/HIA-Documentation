/**
 * @file
 * @lang zh-CN 文档源码映射宽输入的普通JSON、显式字段和无歧义身份拒绝回归；不变更历史wire身份。
 * @lang en Rejection regressions for ordinary JSON, declared fields and unambiguous identities in permissive documentation-map inputs, without changing historical wire identities.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, queryDocSourceMapIndex, validateDocSourceMap } from "./index.js";

/** @lang zh-CN 每次读取独立公开合成样本，允许反例改变字段形状。 @lang en Reads an independent public synthetic fixture for shape mutations in counterexamples. */
function fixture(): Record<string, any> {
  return JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/doc-source-map.json", import.meta.url), "utf8"));
}

/** @lang zh-CN 无效输入必须带静态诊断且不能通过已有查询门禁。 @lang en Invalid input must have static diagnostics and remain blocked by existing query gates. */
function rejected(input: unknown): void {
  const index = createDocSourceMapIndex(input, { path: "public/map.json" });
  expect(index.status).toBe("invalid");
  expect(index.diagnostics.some(({ code }) => code === "DOC_SOURCE_MAP_MANIFEST_INVALID")).toBe(true);
  expect(queryDocSourceMapIndex(index).entries).toEqual([]);
}

// <lang><zh-CN>显式错型不得被转换成默认值；此表不要求旧宽输入增加原本省略的字段。</zh-CN><en>Declared wrong types must not become defaults; this table does not require legacy permissive inputs to add omitted fields.</en></lang>
const malformed: Array<[string, (value: Record<string, any>) => void]> = [
  ["manifest id", value => { value.id = 1; }],
  ["producer object", value => { value.producer = []; }],
  ["producer name", value => { value.producer.name = false; }],
  ["producer version", value => { value.producer.version = ""; }],
  ["artifacts collection", value => { value.artifacts = {}; }],
  ["sources collection", value => { value.sources = "bad"; }],
  ["maps collection", value => { value.sourceMaps = null; }],
  ["chains collection", value => { value.chains = 2; }],
  ["diagnostics collection", value => { value.diagnostics = {}; }],
  ["privacy object", value => { value.privacy = false; }],
  ["privacy policy", value => { value.privacy.sourcesContentPolicy = "unknown"; }],
  ["privacy flag", value => { value.privacy.allowAbsolutePaths = "yes"; }],
  ["artifact item", value => { value.artifacts.push(null); }],
  ["artifact identity", value => { value.artifacts[0].id = ""; }],
  ["artifact path", value => { value.artifacts[0].path = 12; }],
  ["artifact language", value => { value.artifacts[0].language = false; }],
  ["source role", value => { value.sources[0].role = "guessed"; }],
  ["source policy", value => { value.sources[0].sourcesContentPolicy = "guessed"; }],
  ["source body type", value => { value.sources[0].sourcesContentPolicy = "redacted"; value.sources[0].sourcesContent = 2; }],
  ["entry item", value => { value.entries.push(false); }],
  ["entry kind", value => { value.entries[0].kind = false; }],
  ["source references", value => { value.entries[0].sourceRefs = {}; }],
  ["artifact references", value => { value.entries[0].artifactRefs = 3; }],
  ["source reference item", value => { value.entries[0].sourceRefs.push(null); }],
  ["source reference identity", value => { value.entries[0].sourceRefs[0].sourceId = 5; }],
  ["range source", value => { value.entries[0].sourceRefs[0].rangeSource = false; }],
  ["confidence", value => { value.entries[0].sourceRefs[0].confidence = "certain"; }],
  ["range missing end", value => { delete value.entries[0].sourceRefs[0].range.end; }],
  ["range zero column", value => { value.entries[0].sourceRefs[0].range.start.column = 0; }],
  ["range fractional line", value => { value.entries[0].sourceRefs[0].range.start.line = 1.5; }],
  ["range reversed", value => { value.entries[0].sourceRefs[0].range.start.line = 100; }],
  ["selector", value => { value.entries[0].artifactRefs[0].selector = 3; }],
  ["entry diagnostics", value => { value.entries[0].diagnostics = {}; }],
  ["chain stages", value => { value.chains = [{ id: "chain:bad", stages: false }]; }],
  ["stage transform", value => { value.chains = [{ id: "chain:bad", stages: [{ from: "source:x", to: "artifact:y", transform: false }] }]; }]
];

describe("doc-source-map declared input boundaries", () => {
  it.each(malformed)("rejects malformed %s", (_name, mutate) => {
    const input = fixture();
    mutate(input);
    const before = JSON.stringify(input);
    rejected(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each(["artifacts", "sources", "entries"])("rejects ambiguous duplicate %s identities", collection => {
    const input = fixture();
    input[collection].push(structuredClone(input[collection][0]));
    rejected(input);
  });

  it("preserves a valid historical fixture and open JSON extensions", () => {
    const input = fixture();
    input.extension = { enabled: true, values: [null, 1, "public"] };
    const before = JSON.stringify(input);
    expect(validateDocSourceMap(input)).toEqual([]);
    expect(queryDocSourceMapIndex(createDocSourceMapIndex(input)).entries.length).toBeGreaterThan(0);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("retains existing permissive omissions without fabricating full-schema validation", () => {
    const index = createDocSourceMapIndex({ contract: "doc-source-map", contractVersion: "0.1.0-draft", entries: [] });
    expect(index.status).toBe("available");
    expect(index.sourcesContentPolicy).toBe("none");
  });

  it.each(["pug-location", "htmdoc-bridge", "typescript-compiler", "ordinary-source-map"])("retains existing producer provenance %s pending vocabulary decision", rangeSource => {
    const input = fixture();
    input.entries[0].sourceRefs[0].rangeSource = rangeSource;
    expect(createDocSourceMapIndex(input).status).toBe("available");
  });
});

describe("doc-source-map ordinary JSON preflight", () => {
  it.each([["Date", new Date(0)], ["Map", new Map()], ["NaN", { extension: Number.NaN }], ["bigint", { extension: 1n }], ["undefined", { extension: undefined }]] as const)("rejects non-JSON memory input %s", (_name, extra) => {
    rejected(extra instanceof Date || extra instanceof Map ? extra : { ...fixture(), ...extra });
  });

  it("does not invoke visible or hidden accessors or toJSON", () => {
    for (const enumerable of [false, true]) {
      const input = fixture();
      let reads = 0;
      Object.defineProperty(input, "id", { enumerable, get() { reads += 1; throw new Error("synthetic-private-body"); } });
      rejected(input);
      expect(reads).toBe(0);
    }
    const input = fixture();
    Object.defineProperty(input, "toJSON", { value() { throw new Error("synthetic-private-body"); } });
    rejected(input);
  });

  it("rejects cycles and hostile reflection without echoing exceptions", () => {
    const input = fixture();
    input.extension = input;
    rejected(input);
    const hostile = new Proxy({}, { getPrototypeOf() { throw new Error("synthetic-private-body"); } });
    rejected(hostile);
    expect(JSON.stringify(createDocSourceMapIndex(hostile))).not.toContain("synthetic-private-body");
  });

  it("rejects sparse and custom-behavior arrays", () => {
    const input = fixture();
    input.extension = new Array(2);
    rejected(input);
    input.extension = [1];
    input.extension.map = () => [];
    rejected(input);
  });

  it("does not invoke custom array iterators", () => {
    const input = fixture();
    let reads = 0;
    Object.defineProperty(input.sources, Symbol.iterator, { get() { reads += 1; throw new Error("synthetic-private-iterator"); } });
    rejected(input);
    expect(reads).toBe(0);
  });

  it("handles deep ordinary extension graphs without recursive validation", () => {
    const input = fixture();
    let branch: Record<string, unknown> = {};
    input.extension = branch;
    for (let depth = 0; depth < 6000; depth += 1) {
      const next: Record<string, unknown> = {};
      branch.next = next;
      branch = next;
    }
    expect(validateDocSourceMap(input)).toEqual([]);
  });

  it("accepts shared acyclic JSON and null-prototype roots", () => {
    const shared = { public: true };
    const input = Object.assign(Object.create(null), fixture(), { extension: { first: shared, second: shared } });
    expect(validateDocSourceMap(input)).toEqual([]);
  });
});
