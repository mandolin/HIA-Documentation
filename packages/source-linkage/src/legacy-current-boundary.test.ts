/**
 * @file
 * @lang zh-CN 将旧版带范围映射、绑定整组默认复制及新旧 schema 身份放入同一消费流程，防止把新版迁移拒绝误作旧版不可读。
 * @lang en Connects reading a ranged older map, default binding-bundle cloning and exact schema identities in one consumer flow, so a current-migration refusal is not mistaken for legacy unreadability.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getHiaSchema } from "../../schemas/src/index.js";
import * as api from "./index.js";

/** @lang zh-CN 只把合成夹具或公开结果中的非数组对象当作记录，不凭强转掩盖缺失结构。 @lang en Admit only nonarray objects from synthetic fixtures or public results as records, without hiding missing structure behind a cast. */
function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected a synthetic record.");
  return value as Record<string, unknown>;
}

/** @lang zh-CN 把夹具数组逐项核为记录，避免测试用 any 绕过新版/旧版形状差异。 @lang en Check every fixture array item as a record so any cannot obscure differences between current and previous shapes. */
function requireRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.every((item: unknown) => typeof item === "object" && item !== null && !Array.isArray(item))) throw new Error("Expected synthetic records.");
  return value as Record<string, unknown>[];
}

describe("published map and binding pair across the current range boundary", () => {
  it("reads the old range, refuses unsupported standalone guesses, and keeps exact schema generations", () => {
    // <lang><zh-CN>固定公开合成旧绑定夹具；只在本测试的内存副本加入一条文档源码范围。</zh-CN><en>Load the public synthetic legacy-binding fixture and add one documentation source range only to this test-local copy.</en></lang>
    const fixture = requireRecord(JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8")));
    const fixtureMap = requireRecord(fixture.documentMap);
    const fixtureEntry = requireRecords(fixtureMap.entries)[0];
    if (!fixtureEntry || !Array.isArray(fixtureEntry.sourceRefs)) throw new Error("Expected one synthetic entry with source references.");
    fixtureEntry.sourceRefs.push({
      sourceId: "source:synthetic",
      range: { start: { line: 1, column: 1 }, end: { line: 3, column: 4 } },
      rangeSource: "parser",
      confidence: "high"
    });
    // <lang><zh-CN>旧草案通过已确认的默认整组迁移形成精确 0.2/1.0 配对，不能自行伪造新版身份。</zh-CN><en>Advance the legacy draft through the approved default bundle migration to the exact 0.2/1.0 pair without inventing a current-version identity.</en></lang>
    const previousResult = api.migrateGeneratedDocumentationBindingBundle({ docSourceMap: fixtureMap, bindingSidecars: [requireRecord(fixture.bindingSidecar)] });
    expect(previousResult.status).toBe("migrated");
    expect(previousResult.bundle).toBeDefined();
    const previous = previousResult.bundle;
    if (!previous) throw new Error("Expected a complete previous binding pair.");
    expect(previous.docSourceMap.contractVersion).toBe(api.DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION);
    expect(previous.bindingSidecars[0]?.contractVersion).toBe(api.GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION);

    // <lang><zh-CN>旧索引和旧三参查询继续按包含式终点及省略列默认值读取同一范围。</zh-CN><en>The old index and three-argument source lookup keep the inclusive endpoint and omitted-column default for the same range.</en></lang>
    const oldIndex = api.createDocSourceMapIndex(previous.docSourceMap);
    expect(oldIndex.status).toBe("available");
    expect(api.findDocSourceMapEntriesBySource(oldIndex, "src/synthetic.pug", { line: 3, column: 4 })).toHaveLength(1);
    expect(api.findDocSourceMapEntriesBySource(oldIndex, "src/synthetic.pug", { line: 3 })).toHaveLength(1);
    // <lang><zh-CN>保留关联的旧整组无目标参数仍复制原配对，不借单图迁移绕过绑定闭包。</zh-CN><en>Default bundle migration clones the associated previous pair rather than bypassing its binding closure through standalone migration.</en></lang>
    const copied = api.migrateGeneratedDocumentationBindingBundle(previous);
    expect(copied.status).toBe("already-current");
    expect(copied.bundle).toEqual(previous);
    expect(copied.bundle?.docSourceMap).not.toBe(previous.docSourceMap);

    // <lang><zh-CN>另取同一旧地图的合法单图副本，先移除绑定引用，隔离本次要测的范围证据条件。</zh-CN><en>Make a standalone copy of the same old map and remove binding associations to isolate the range-evidence requirement.</en></lang>
    const standalone = structuredClone(previous.docSourceMap);
    standalone.generatedBindingSidecars = [];
    const standaloneEntry = requireRecords(standalone.entries)[0];
    if (!standaloneEntry) throw new Error("Expected one standalone documentation entry.");
    standaloneEntry.generatedBindingRefs = [];
    expect(api.createDocSourceMapIndex(standalone).status).toBe("available");
    const withoutEvidence = api.migrateDocSourceMap(standalone);
    expect(withoutEvidence.status).toBe("invalid");
    expect(Object.hasOwn(withoutEvidence, "manifest")).toBe(false);
    // <lang><zh-CN>逐引用证据由调用方显式给出；新版独立结果不改旧工件的范围或版本。</zh-CN><en>The caller explicitly supplies per-reference evidence; the independent current result does not rewrite the old range or version.</en></lang>
    const withEvidence = api.migrateDocSourceMap(standalone, {
      rangeEvidence: [{ entryIndex: 0, sourceRefIndex: 0, rangeConvention: { endBoundary: "inclusive", columnUnit: "utf16-code-unit" } }]
    });
    expect(withEvidence.status).toBe("migrated");
    expect(withEvidence.manifest?.contractVersion).toBe(api.DOC_SOURCE_MAP_CONTRACT_VERSION);
    const migratedEntry = requireRecords(withEvidence.manifest?.entries)[0];
    if (!migratedEntry) throw new Error("Expected one migrated documentation entry.");
    const migratedRef = requireRecords(migratedEntry.sourceRefs)[0];
    expect(migratedRef?.rangeConvention).toEqual({ endBoundary: "inclusive", columnUnit: "utf16-code-unit" });
    expect(standalone.contractVersion).toBe(api.DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION);
    expect(requireRecords(standaloneEntry.sourceRefs)[0]?.rangeConvention).toBeUndefined();

    // <lang><zh-CN>同名 current schema 只指新版；精确旧 ID 仍由分发读取器原样提供映射与绑定配对。</zh-CN><en>The same-name current schemas point only to the new generation; exact historical IDs still resolve the prior map and binding pair.</en></lang>
    const oldMapSchema = getHiaSchema("https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-1.0.0.schema.json");
    const oldBindingSchema = getHiaSchema(api.GENERATED_DOCUMENTATION_BINDING_0_2_0_SCHEMA_ID);
    expect(oldMapSchema).toMatchObject({ $id: "https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-1.0.0.schema.json", properties: { contractVersion: { const: "1.0.0" } } });
    expect(api.DOC_SOURCE_MAP_SCHEMA_ID).toBe("https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-1.1.0.schema.json");
    expect(oldBindingSchema).toMatchObject({ $id: api.GENERATED_DOCUMENTATION_BINDING_0_2_0_SCHEMA_ID, properties: { contractVersion: { const: "0.2.0-draft" } }, $defs: { docSourceMapLinkage: { properties: { contractVersion: { const: "1.0.0" } } } } });
    expect(api.GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID).toBe("https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.3.0-draft.schema.json");
    expect(api.DOC_SOURCE_MAP_JSON_SCHEMA.properties.contractVersion.const).toBe("1.1.0");
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("1.1.0");
    expect(getHiaSchema("doc-source-map")).toEqual(api.DOC_SOURCE_MAP_JSON_SCHEMA);
  });
});
