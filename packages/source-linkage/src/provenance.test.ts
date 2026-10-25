/**
 * @file
 * @lang zh-CN 已确认来源模型B的精确版本、闭集与保真迁移回归；只使用公开合成工件。
 * @lang en Regressions for exact versions, closed categories and lossless migration in approved provenance model B, using public synthetic artifacts only.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";
import { getHiaSchema, HIA_SCHEMA_CATALOG } from "../../schemas/src/index.js";

/** @lang zh-CN 返回独立历史工件，不重写原fixture。 @lang en Returns an independent historical artifact without rewriting the fixture. */
function legacy(): Record<string, any> {
  return JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/doc-source-map.json", import.meta.url), "utf8"));
}
/** @lang zh-CN 构造完整新版工件，保留旧版其它结构。 @lang en Constructs a complete current artifact while retaining other legacy structure. */
function current(): Record<string, any> { const value = legacy(); value.contractVersion = "1.0.0"; return value; }

describe("doc-source-map model B", () => {
  it("exports an independent current schema and retains the exact historical definition", () => {
    expect(api.DOC_SOURCE_MAP_CONTRACT_VERSION).toBe("1.0.0");
    expect(api.DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION).toBe("0.1.0-draft");
    expect(api.DOC_SOURCE_MAP_SCHEMA_ID).toContain("doc-source-map-1.0.0.schema.json");
    expect(api.DOC_SOURCE_MAP_JSON_SCHEMA.$defs.sourceRef.properties.rangeSourceDetail).toBeDefined();
    expect(getHiaSchema("doc-source-map")?.$id).toBe(api.DOC_SOURCE_MAP_SCHEMA_ID);
    expect(getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-0.1.0-draft.schema.json")?.properties).toMatchObject({ contractVersion: { const: "0.1.0-draft" } });
    expect(HIA_SCHEMA_CATALOG.schemas).toHaveLength(17);
  });
  it.each(["source-map", "parser", "compiler", "adapter", "manual", "heuristic", "unresolved"])("accepts category %s without inferring confidence", category => {
    const value = current();
    Object.assign(value.entries[0].sourceRefs[0], { rangeSource: category, rangeSourceDetail: "public-tool", confidence: category === "unresolved" ? "none" : "low" });
    const index = api.createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(index.entries[0].sourceLinks[0]).toMatchObject({ rangeSource: category, rangeSourceDetail: "public-tool", confidence: category === "unresolved" ? "none" : "low" });
    expect(index.linkedEntryCount).toBe(category === "unresolved" ? 0 : 1);
  });
  it.each(["typescript-compiler", "compler", "unresovled", "unknown", "", " ", false])("rejects a noncanonical current category %s", category => {
    const value = current(); value.entries[0].sourceRefs[0].rangeSource = category;
    const index = api.createDocSourceMapIndex(value);
    expect(index.status).toBe("invalid");
    expect(api.queryDocSourceMapIndex(index).entries).toEqual([]);
  });
  it.each(["", " \t", false, {}])("rejects malformed current detail %s", detail => {
    const value = current(); value.entries[0].artifactRefs[0].rangeSourceDetail = detail;
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
  });
  it("does not infer category or confidence from a descriptive tool label", () => {
    const value = current(); value.entries[0].sourceRefs[0].rangeSourceDetail = "typescript-compiler";
    const index = api.createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(index.entries[0].sourceLinks[0]).toMatchObject({ rangeSource: "parser", rangeSourceDetail: "typescript-compiler", confidence: "high" });
  });
  it("requires unresolved confidence none in the new version only", () => {
    const value = current(); value.entries[0].artifactRefs[0].rangeSource = "unresolved";
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
    value.contractVersion = "0.1.0-draft";
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
  });
  it.each(["id", "producer", "artifacts", "sources", "sourceMaps", "chains", "privacy", "diagnostics"])("requires current root field %s", key => {
    const value = current(); delete value[key];
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
  });
  it("requires new reference quality while preserving legacy omissions", () => {
    const value = current(); delete value.entries[0].sourceRefs[0].rangeSource;
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
    value.contractVersion = "0.1.0-draft";
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
  });
  it.each(["1.0.1", "1.1.0", "1.0.0-beta", "1.0.0+build"])("isolates unknown exact version %s", version => {
    const value = current(); value.contractVersion = version;
    const index = api.createDocSourceMapIndex(value);
    expect(index.status).toBe("unsupported-version");
    expect(api.queryDocSourceMapIndex(index).entries).toEqual([]);
  });
  it.each([["typescript-compiler", "compiler"], ["ordinary-source-map", "source-map"], ["pug-location", "parser"], ["htmdoc-bridge", "adapter"]])("migrates known legacy %s losslessly", (name, category) => {
    const value = legacy(); value.entries[0].sourceRefs[0].rangeSource = name;
    value.extension = { preserved: ["public", null] };
    const before = JSON.stringify(value);
    const result = api.migrateDocSourceMap(value);
    expect(result.status).toBe("migrated");
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest?.contractVersion).toBe("1.0.0");
    expect((result.manifest?.entries as any[])[0].sourceRefs[0]).toMatchObject({ rangeSource: category, rangeSourceDetail: name, confidence: "high" });
    expect(result.manifest?.extension).toEqual(value.extension);
    expect(result.manifest?.extension).not.toBe(value.extension);
    expect(JSON.stringify(value)).toBe(before);
  });
  it.each(["unknown-tool", "unresovled"])("preserves readable legacy %s but refuses a guessed migration", name => {
    const value = legacy(); value.entries[0].sourceRefs[0].rangeSource = name;
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
    const result = api.migrateDocSourceMap(value);
    expect(result.status).toBe("invalid");
    expect(result.manifest).toBeUndefined();
    expect(result.diagnostics.some(d => d.code === "DOC_SOURCE_MAP_MIGRATION_INVALID")).toBe(true);
    expect(JSON.stringify(result)).not.toContain(name);
    expect(value.entries[0].sourceRefs[0].rangeSource).toBe(name);
  });
  it("refuses conflicting detail instead of losing either legacy value", () => {
    const value = legacy(); Object.assign(value.entries[0].artifactRefs[0], { rangeSource: "htmdoc-bridge", rangeSourceDetail: "other-detail" });
    expect(api.migrateDocSourceMap(value).status).toBe("invalid");
    expect(value.entries[0].artifactRefs[0].rangeSourceDetail).toBe("other-detail");
  });
  it("returns an independent validated current clone for an idempotent migration", () => {
    const value = current(); const result = api.migrateDocSourceMap(value);
    expect(result.status).toBe("already-current");
    expect(result.manifest).toEqual(value);
    expect(result.manifest).not.toBe(value);
  });
  it("does not execute accessors or expose rejected private bodies during migration", () => {
    let reads = 0; const value = legacy();
    Object.defineProperty(value, "private", { enumerable: true, get() { reads++; return "private-canary"; } });
    expect(api.migrateDocSourceMap(value).manifest).toBeUndefined();
    expect(reads).toBe(0);
    const body = legacy(); body.sources[0].sourcesContent = "private-canary";
    expect(JSON.stringify(api.migrateDocSourceMap(body))).not.toContain("private-canary");
  });
  it("rejects incomplete legacy input when asked to produce a current wire artifact", () => {
    const value = { contract: "doc-source-map", contractVersion: "0.1.0-draft", entries: [] };
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
    expect(api.migrateDocSourceMap(value).status).toBe("invalid");
  });
  it("preserves declared generic detail and explicit opt-in bodies without exposing them in indexes", () => {
    const value = legacy(); value.entries[0].artifactRefs[0].rangeSourceDetail = "public-bridge";
    value.sources[0].sourcesContentPolicy = "redacted"; value.sources[0].sourcesContent = "allowed-public-body";
    const result = api.migrateDocSourceMap(value);
    expect(result.status).toBe("migrated");
    expect((result.manifest?.sources as any[])[0].sourcesContent).toBe("allowed-public-body");
    expect(api.createDocSourceMapIndex(result.manifest).entries[0].artifactLinks[0].rangeSourceDetail).toBe("public-bridge");
    expect(JSON.stringify(api.createDocSourceMapIndex(result.manifest))).not.toContain("allowed-public-body");
  });
  it("copies deep shared/null-prototype data without prototype pollution or stack recursion", () => {
    const value = legacy(); const shared = Object.assign(Object.create(null), JSON.parse('{"__proto__":{"public":true}}'));
    value.extension = { first: shared, second: shared }; let cursor = value.extension;
    for (let i = 0; i < 6000; i++) { cursor.child = {}; cursor = cursor.child; }
    const result = api.migrateDocSourceMap(value);
    expect(result.status).toBe("migrated");
    const extension = result.manifest?.extension as any;
    expect(extension.first).toBe(extension.second);
    expect(extension.first).not.toBe(shared);
    expect(Object.getPrototypeOf(extension.first)).toBe(Object.prototype);
    expect(Object.hasOwn(extension.first, "__proto__")).toBe(true);
    expect(({} as any).public).toBeUndefined();
  });
  it("refuses standalone migration of a frozen binding-sidecar association", () => {
    const value = legacy();
    value.generatedBindingSidecars = [{ id: "sidecar:x", contract: "generated-documentation-binding", contractVersion: "0.1.0-draft", path: "x.gdb.json" }];
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
    expect(api.migrateDocSourceMap(value).status).toBe("invalid");
    expect(api.migrateDocSourceMap(value).manifest).toBeUndefined();
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("0.1.0-draft");
  });
  it("preflights hidden declared containers before nested accessors can execute", () => {
    const value = current(); let reads = 0;
    Object.defineProperty(value.sources[0], "path", { enumerable: true, get() { reads++; throw new Error("hidden-private-canary"); } });
    Object.defineProperty(value, "sources", { enumerable: false, value: value.sources });
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
    expect(reads).toBe(0);
  });
});
