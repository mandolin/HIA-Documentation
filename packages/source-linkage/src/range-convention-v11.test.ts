/**
 * @file
 * @lang zh-CN 文档源码范围 1.1.0 的精度声明、旧版隔离和显式证据迁移回归；只使用公开合成数据。
 * @lang en Regressions for documentation range precision in 1.1.0, legacy isolation and evidence-based migration, using only public synthetic data.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";

/** @lang zh-CN 每次构造独立旧版公开工件，避免测试间共享可变引用。 @lang en Creates an independent public legacy artifact for every test, avoiding shared mutable references. */
function manifest(version: string): Record<string, any> {
  const value = JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/doc-source-map.json", import.meta.url), "utf8"));
  value.contractVersion = version;
  return value;
}

/** @lang zh-CN 证据按条目和引用序号定位，避免同一 sourceId 的多个范围被合并。 @lang en Evidence addresses entry and reference ordinals so repeated ranges for one sourceId remain distinct. */
function evidence(endBoundary: "inclusive" | "exclusive" | "unknown" = "exclusive") {
  return [{ entryIndex: 0, sourceRefIndex: 0, rangeConvention: { endBoundary, columnUnit: "utf16-code-unit" as const } }];
}

describe("doc-source-map range convention 1.1.0", () => {
  it("keeps three exact reader identities and isolates an unknown patch", () => {
    expect(api.DOC_SOURCE_MAP_CONTRACT_VERSION).toBe("1.1.0");
    expect(api.DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION).toBe("1.0.0");
    expect(api.DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION).toBe("0.1.0-draft");
    expect(api.DOC_SOURCE_MAP_SCHEMA_ID).toContain("doc-source-map-1.1.0.schema.json");
    for (const version of ["0.1.0-draft", "1.0.0"]) expect(api.createDocSourceMapIndex(manifest(version)).status).toBe("available");
    const unknown = api.createDocSourceMapIndex(manifest("1.1.1"));
    expect(unknown.status).toBe("unsupported-version");
    expect(api.queryDocSourceMapIndex(unknown).entries).toEqual([]);
  });

  it("requires a convention exactly when a 1.1.0 source reference has a range", () => {
    const value = manifest("1.1.0");
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
    value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "exclusive", columnUnit: "utf16-code-unit" };
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
    delete value.entries[0].sourceRefs[0].range;
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
    delete value.entries[0].sourceRefs[0].rangeConvention;
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
  });

  it.each([
    { endBoundary: "other", columnUnit: "utf16-code-unit" },
    { endBoundary: "inclusive", columnUnit: "characters" },
    { endBoundary: "inclusive" },
    { columnUnit: "utf16-code-unit" },
    { endBoundary: "inclusive", columnUnit: "utf16-code-unit", extra: "hidden" },
    false
  ])("rejects a malformed current convention %j", (rangeConvention) => {
    const value = manifest("1.1.0");
    value.entries[0].sourceRefs[0].rangeConvention = rangeConvention;
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
  });

  it("queries declared inclusive and exclusive endpoints only with an explicit matching column unit", () => {
    const value = manifest("1.1.0");
    const reference = value.entries[0].sourceRefs[0];
    reference.range = { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } };
    reference.rangeConvention = { endBoundary: "exclusive", columnUnit: "utf16-code-unit" };
    const index = api.createDocSourceMapIndex(value);
    const query = { sourcePath: "src/components/alert.html", position: { line: 1, column: 4 }, columnUnit: "utf16-code-unit" as const };
    expect(index.entries[0].sourceLinks[0].rangeConvention).toEqual(reference.rangeConvention);
    expect(index.entries[0].sourceLinks[0].rangeConvention).not.toBe(reference.rangeConvention);
    expect(api.queryDocSourceMapIndex(index, query).entries).toEqual([]);
    expect(api.queryDocSourceMapIndex(index, { ...query, position: { line: 1, column: 3 } }).entries).toHaveLength(1);
    expect(api.queryDocSourceMapIndex(index, { ...query, columnUnit: "byte" }).entries).toEqual([]);
    expect(api.queryDocSourceMapIndex(index, { sourcePath: query.sourcePath, position: query.position }).entries).toEqual([]);
    expect(api.queryDocSourceMapIndex(index, { ...query, position: { line: 1 } }).entries).toEqual([]);
    reference.rangeConvention.endBoundary = "inclusive";
    const inclusive = api.createDocSourceMapIndex(value);
    expect(api.queryDocSourceMapIndex(inclusive, query).entries).toHaveLength(1);
    reference.rangeConvention.endBoundary = "unknown";
    expect(api.queryDocSourceMapIndex(api.createDocSourceMapIndex(value), query).entries).toEqual([]);
  });

  it("retains old inclusive endpoint and omitted-column lookup behavior", () => {
    for (const version of ["0.1.0-draft", "1.0.0"]) {
      const value = manifest(version);
      value.entries[0].sourceRefs[0].range = { start: { line: 1, column: 1 }, end: { line: 1, column: 4 } };
      const index = api.createDocSourceMapIndex(value);
      expect(api.queryDocSourceMapIndex(index, { sourcePath: "src/components/alert.html", position: { line: 1, column: 4 } }).entries).toHaveLength(1);
      expect(api.queryDocSourceMapIndex(index, { sourcePath: "src/components/alert.html", position: { line: 1 } }).entries).toHaveLength(1);
      value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "exclusive", columnUnit: "byte" };
      expect(api.createDocSourceMapIndex(value).entries[0].sourceLinks[0].rangeConvention).toBeUndefined();
    }
  });

  it("requires explicit evidence for each older ranged reference and preserves the caller", () => {
    for (const version of ["0.1.0-draft", "1.0.0"]) {
      const value = manifest(version);
      const before = JSON.stringify(value);
      expect(api.migrateDocSourceMap(value).status).toBe("invalid");
      expect(api.migrateDocSourceMap(value).manifest).toBeUndefined();
      const result = api.migrateDocSourceMap(value, { rangeEvidence: evidence() });
      expect(result.status).toBe("migrated");
      expect(result.manifest?.contractVersion).toBe("1.1.0");
      expect((result.manifest?.entries as any[])[0].sourceRefs[0].rangeConvention).toEqual(evidence()[0].rangeConvention);
      expect(JSON.stringify(value)).toBe(before);
    }
  });

  it("returns an independent already-current 1.1.0 copy without evidence", () => {
    const value = manifest("1.1.0");
    value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "inclusive", columnUnit: "utf16-code-unit" };
    const result = api.migrateDocSourceMap(value);
    expect(result.status).toBe("already-current");
    expect(result.manifest).toEqual(value);
    expect(result.manifest).not.toBe(value);
    expect((result.manifest?.entries as any[])[0].sourceRefs[0].rangeConvention).not.toBe(value.entries[0].sourceRefs[0].rangeConvention);
  });

  it("rejects incomplete, duplicate or surplus migration evidence atomically", () => {
    const value = manifest("1.0.0");
    for (const rangeEvidence of [[], [...evidence(), ...evidence()], [{ ...evidence()[0], sourceRefIndex: 1 }]]) {
      const result = api.migrateDocSourceMap(value, { rangeEvidence });
      expect(result.status).toBe("invalid");
      expect(result.manifest).toBeUndefined();
    }
  });

  it("keeps unknown declared precision readable but never treats it as an exact hit", () => {
    const value = manifest("1.1.0");
    value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "unknown", columnUnit: "unknown" };
    const index = api.createDocSourceMapIndex(value);
    expect(index.status).toBe("available");
    expect(api.queryDocSourceMapIndex(index, { sourcePath: "src/components/alert.html" }).entries).toHaveLength(1);
    expect(api.queryDocSourceMapIndex(index, { sourcePath: "src/components/alert.html", position: { line: 1, column: 1 }, columnUnit: "utf16-code-unit" }).entries).toEqual([]);
    expect(api.queryDocSourceMapIndex(index, { position: { line: 1, column: 1 }, columnUnit: "utf16-code-unit" }).entries).toEqual([]);
  });

  it("requires both endpoint columns when the 1.1.0 column unit is known", () => {
    const value = manifest("1.1.0");
    const reference = value.entries[0].sourceRefs[0];
    reference.rangeConvention = { endBoundary: "inclusive", columnUnit: "byte" };
    delete reference.range.end.column;
    expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
    reference.rangeConvention.columnUnit = "unknown";
    expect(api.createDocSourceMapIndex(value).status).toBe("available");
  });

  it("distinguishes empty exclusive ranges from inclusive point ranges", () => {
    const value = manifest("1.1.0");
    const reference = value.entries[0].sourceRefs[0];
    reference.range = { start: { line: 3, column: 7 }, end: { line: 3, column: 7 } };
    reference.rangeConvention = { endBoundary: "exclusive", columnUnit: "byte" };
    const query = { sourcePath: "src/components/alert.html", position: { line: 3, column: 7 }, columnUnit: "byte" as const };
    expect(api.queryDocSourceMapIndex(api.createDocSourceMapIndex(value), query).entries).toEqual([]);
    reference.rangeConvention.endBoundary = "inclusive";
    expect(api.queryDocSourceMapIndex(api.createDocSourceMapIndex(value), query).entries).toHaveLength(1);
  });

  it("upgrades an unranged old map without fabricated precision", () => {
    const value = manifest("1.0.0");
    delete value.entries[0].sourceRefs[0].range;
    const result = api.migrateDocSourceMap(value);
    expect(result.status).toBe("migrated");
    expect((result.manifest?.entries as any[])[0].sourceRefs[0].rangeConvention).toBeUndefined();
    expect(api.migrateDocSourceMap(value, { rangeEvidence: evidence() }).status).toBe("invalid");
  });

  it("rejects malformed evidence and missing precision without leaking partial output", () => {
    const value = manifest("1.0.0");
    for (const rangeEvidence of [
      [{ ...evidence()[0], entryIndex: -1 }],
      [{ ...evidence()[0], rangeConvention: { endBoundary: "other", columnUnit: "byte" } }],
      [{ ...evidence()[0], rangeConvention: { endBoundary: "inclusive", columnUnit: "byte", hidden: true } }],
      [{ ...evidence()[0], hidden: true }]
    ]) {
      // <lang><zh-CN>证据字段必须闭合；失败绝不泄漏局部已迁移工件。</zh-CN><en>Evidence fields must be closed; refusal never leaks a partially migrated artifact.</en></lang>
      const result = api.migrateDocSourceMap(value, { rangeEvidence: rangeEvidence as never });
      expect(result.status).toBe("invalid");
      expect(Object.hasOwn(result, "manifest")).toBe(false);
    }
  });

  it("rejects symbol extensions on the evidence item and nested convention", () => {
    // <lang><zh-CN>迁移证据是闭合字段记录，Symbol 即使不会进入 JSON 也不得悄悄附在任一层。</zh-CN><en>Range evidence is a closed-field record; neither level may silently carry a Symbol even though JSON would omit it.</en></lang>
    const value = manifest("1.0.0");
    const itemSymbol = evidence();
    Object.defineProperty(itemSymbol[0], Symbol("hidden-item"), { value: "synthetic" });
    const conventionSymbol = evidence();
    Object.defineProperty(conventionSymbol[0].rangeConvention, Symbol("hidden-convention"), { value: "synthetic" });
    for (const rangeEvidence of [itemSymbol, conventionSymbol]) {
      const result = api.migrateDocSourceMap(value, { rangeEvidence });
      expect(result.status).toBe("invalid");
      expect(Object.hasOwn(result, "manifest")).toBe(false);
    }
  });

  it("refuses an older open extension that cannot be copied into the closed current convention", () => {
    // <lang><zh-CN>旧来源引用允许开放扩展；若同名对象多出字段，覆盖它会静默丢数据，必须整体拒绝。</zh-CN><en>Older source references admit open extensions; overwriting a same-named object with extra fields would silently lose data, so refuse the whole migration.</en></lang>
    const value = manifest("1.0.0");
    const reference = value.entries[0].sourceRefs[0];
    reference.rangeConvention = { endBoundary: "exclusive", columnUnit: "utf16-code-unit", producerNote: "keep-me" };
    const before = JSON.stringify(value);
    const result = api.migrateDocSourceMap(value, { rangeEvidence: evidence() });
    expect(result.status).toBe("invalid");
    expect(Object.hasOwn(result, "manifest")).toBe(false);
    expect(JSON.stringify(value)).toBe(before);
  });

  it("snapshots evidence before input reflection and never executes an evidence getter", () => {
    const value = manifest("1.0.0");
    const options = { rangeEvidence: evidence() };
    const input = new Proxy(value, { getPrototypeOf(target) {
      options.rangeEvidence[0].rangeConvention.endBoundary = "inclusive";
      return Reflect.getPrototypeOf(target);
    } });
    const result = api.migrateDocSourceMap(input, options);
    expect(result.status).toBe("migrated");
    expect((result.manifest?.entries as any[])[0].sourceRefs[0].rangeConvention.endBoundary).toBe("exclusive");
    let reads = 0;
    const getter = Object.defineProperty({}, "rangeEvidence", { get() { reads += 1; throw new Error("synthetic-private"); } });
    const refused = api.migrateDocSourceMap(value, getter as never);
    expect(refused.status).toBe("invalid");
    expect(reads).toBe(0);
    expect(JSON.stringify(refused)).not.toContain("synthetic-private");
  });

  it("keeps binding sidecar declarations paired to each exact map generation", () => {
    const pairs = [
      ["0.1.0-draft", "0.1.0-draft"],
      ["1.0.0", "0.2.0-draft"],
      ["1.1.0", "0.3.0-draft"]
    ] as const;
    for (const [mapVersion, bindingVersion] of pairs) {
      const value = manifest(mapVersion);
      if (mapVersion === "1.1.0") value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "inclusive", columnUnit: "byte" };
      value.generatedBindingSidecars = [{ id: "sidecar:safe", contract: "generated-documentation-binding", contractVersion: bindingVersion, path: "dist/bindings.json" }];
      expect(api.createDocSourceMapIndex(value).status).toBe("available");
      for (const wrong of pairs.map(pair => pair[1]).filter(version => version !== bindingVersion)) {
        value.generatedBindingSidecars[0].contractVersion = wrong;
        expect(api.createDocSourceMapIndex(value).status).toBe("invalid");
      }
    }
  });

  it("combined position lookup needs an explicit original column unit for current maps", () => {
    const value = manifest("1.1.0");
    value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "inclusive", columnUnit: "utf16-code-unit" };
    const doc = api.createDocSourceMapIndex(value);
    const ordinary = api.createOrdinarySourceMapIndex({ version: 3, sources: ["src/components/alert.html"], names: [], mappings: "AAAA" }, { artifactPath: "dist/alert.html" });
    const query = { originalSourcePath: "src/components/alert.html", originalPosition: { line: 1, column: 1 } };
    expect(api.querySourceLinkedPosition(doc, ordinary, query).entries).toEqual([]);
    expect(api.querySourceLinkedPosition(doc, ordinary, { ...query, originalColumnUnit: "utf16-code-unit" }).entries).toHaveLength(1);
    expect(api.querySourceLinkedPosition(doc, ordinary, { ...query, originalColumnUnit: "byte" }).entries).toEqual([]);
  });

  it("does not broaden current combined queries when a source path or position is unpaired or conflicts", () => {
    // <lang><zh-CN>明确原路径可单独筛元数据；明确原位置没有路径及与生成位置冲突的原路径均不能命中无关条目。</zh-CN><en>An explicit original path may filter metadata alone; a pathless original position and a path conflicting with generated lookup cannot match unrelated entries.</en></lang>
    const value = manifest("1.1.0");
    value.entries[0].sourceRefs[0].rangeConvention = { endBoundary: "inclusive", columnUnit: "utf16-code-unit" };
    const doc = api.createDocSourceMapIndex(value);
    const ordinary = api.createOrdinarySourceMapIndex({ version: 3, sources: ["src/components/alert.html"], names: [], mappings: "AAAA" }, { artifactPath: "dist/alert.html" });
    const unit = "utf16-code-unit" as const;
    const unmatchedPosition = api.querySourceLinkedPosition(doc, ordinary, { originalPosition: { line: 999, column: 999 }, originalColumnUnit: unit });
    expect(unmatchedPosition).toMatchObject({ status: "available", entries: [], matchedEntryCount: 0 });
    expect(api.querySourceLinkedPosition(doc, ordinary, { originalSourcePath: "does-not-exist.ts" })).toMatchObject({ status: "available", entries: [], matchedEntryCount: 0 });
    expect(api.querySourceLinkedPosition(doc, ordinary, { originalSourcePath: "src/components/alert.html" }).entries).toHaveLength(1);
    const conflict = api.querySourceLinkedPosition(doc, ordinary, { generatedPosition: { line: 1, column: 1 }, originalSourcePath: "does-not-exist.ts", originalColumnUnit: unit });
    expect(conflict).toMatchObject({ status: "available", entries: [], matchedEntryCount: 0 });
    expect(api.querySourceLinkedPosition(doc, ordinary, { generatedPosition: { line: 1, column: 1 }, originalSourcePath: "src/components/alert.html", originalColumnUnit: unit }).entries).toHaveLength(1);
  });
});
