/**
 * @file
 * @lang zh-CN 三代绑定整组迁移的精确配对、逐引用范围证据、保真与原子失败回归。
 * @lang en Exact pairings, per-reference range evidence, losslessness and atomic-failure regressions for three binding-bundle generations.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";

/** @lang zh-CN 将公开合成fixture转换为明确的内存API输入，不读取业务工程。 @lang en Adapts the public synthetic fixture to the explicit memory API input without reading business projects. */
function fixture(): any {
  const pair = JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8"));
  return { docSourceMap: pair.documentMap, bindingSidecars: [pair.bindingSidecar] };
}
/** @lang zh-CN 只通过公共根调用迁移，初始缺失API应成为真实红例。 @lang en Calls migration through the public root only, making the initially missing API a genuine red case. */
function migrate(value: unknown, options: any = {}): any { return api.migrateGeneratedDocumentationBindingBundle(value, options); }
/** @lang zh-CN 公共旧草案只升到历史0.2/1.0配对。 @lang en The public legacy draft advances only to the historical 0.2/1.0 pair by default. */
function previousPair(): any { return migrate(fixture()).bundle; }
/** @lang zh-CN 合成绑定引用的独立外部范围证据，不从映射索引推断。 @lang en Separate external range evidence for the synthetic binding reference, never inferred from the map index. */
function bindingEvidence(): any[] { return [{ sidecarIndex: 0, bindingIndex: 0, kind: "sourceIntent", rangeConvention: { endBoundary: "inclusive", columnUnit: "utf16-code-unit" } }]; }
/** @lang zh-CN 失败必须没有局部bundle或输入正文回显。 @lang en Failures must contain neither partial bundles nor reflected input bodies. */
function expectRefused(value: unknown): void {
  const result = migrate(value);
  expect(["invalid", "unsupported-version"]).toContain(result.status);
  expect(result.bundle).toBeUndefined();
  expect(result.diagnostics.length).toBeGreaterThan(0);
  expect(JSON.stringify(result)).not.toContain("synthetic-private");
}

describe("generated binding coordinated migration", () => {
  it("migrates both artifacts together and preserves content/identities/extensions", () => {
    const value = fixture();
    value.docSourceMap.entries[0].artifactRefs[0].rangeSource = "pug-location";
    value.bindingSidecars[0].adapterExtensions = { note: "0.1.0-draft is passive text" };
    const before = JSON.stringify(value);
    const result = migrate(value);
    expect(result.status).toBe("migrated");
    expect(result.bundle.docSourceMap.contractVersion).toBe("1.0.0");
    expect(result.bundle.docSourceMap.generatedBindingSidecars[0].contractVersion).toBe("0.2.0-draft");
    expect(result.bundle.bindingSidecars[0].contractVersion).toBe("0.2.0-draft");
    expect(result.bundle.bindingSidecars[0].docSourceMapLinkage.contractVersion).toBe("1.0.0");
    expect(result.bundle.bindingSidecars[0].compatibility.minimumConsumerContractVersion).toBe("0.2.0-draft");
    expect(result.bundle.bindingSidecars[0].deterministicLocalsPolicy.contractVersion).toBe("0.1.0-draft-input");
    expect(result.bundle.bindingSidecars[0].bindings).toEqual(value.bindingSidecars[0].bindings);
    expect(result.bundle.bindingSidecars[0].adapterExtensions).toEqual(value.bindingSidecars[0].adapterExtensions);
    expect(result.bundle.docSourceMap.entries[0].artifactRefs[0]).toMatchObject({ rangeSource: "parser", rangeSourceDetail: "pug-location" });
    expect(JSON.stringify(value)).toBe(before);
    const index = api.createDocSourceMapIndex(result.bundle.docSourceMap);
    expect(index.status).toBe("available");
    expect(api.createGeneratedDocumentationBindingIndex(result.bundle.bindingSidecars[0], { docSourceMapIndex: index })).toMatchObject({ status: "available", bindingCount: 1, expansionCount: 1, targetCount: 1 });
    expect(result.bundle.bindingSidecars[0].bindings).not.toBe(value.bindingSidecars[0].bindings);
  });

  it("returns independent already-current containers on repeated migration", () => {
    const first = migrate(fixture()).bundle;
    const next = migrate(first);
    expect(next.status).toBe("already-current");
    expect(next.bundle).toEqual(first);
    expect(next.bundle.docSourceMap).not.toBe(first.docSourceMap);
    expect(next.bundle.bindingSidecars[0]).not.toBe(first.bindingSidecars[0]);
  });

  it("preserves the published 0.2/1.0 pair by default and upgrades only with explicit binding evidence", () => {
    const prior = previousPair();
    const copied = migrate(prior);
    expect(copied.status).toBe("already-current");
    expect(copied.bundle).toEqual(prior);
    expect(copied.bundle.docSourceMap).not.toBe(prior.docSourceMap);
    expect(copied.bundle.bindingSidecars[0]).not.toBe(prior.bindingSidecars[0]);
    const before = JSON.stringify(prior);
    const missing = migrate(prior, { targetVersion: "0.3.0-draft" });
    expect(missing.status).toBe("invalid");
    expect(Object.hasOwn(missing, "bundle")).toBe(false);
    const upgraded = migrate(prior, { targetVersion: "0.3.0-draft", bindingRangeEvidence: bindingEvidence() });
    expect(upgraded.status).toBe("migrated");
    expect(upgraded.bundle.docSourceMap.contractVersion).toBe("1.1.0");
    expect(upgraded.bundle.docSourceMap.generatedBindingSidecars[0].contractVersion).toBe("0.3.0-draft");
    expect(upgraded.bundle.bindingSidecars[0].contractVersion).toBe("0.3.0-draft");
    expect(upgraded.bundle.bindingSidecars[0].docSourceMapLinkage.contractVersion).toBe("1.1.0");
    expect(upgraded.bundle.bindingSidecars[0].compatibility.minimumConsumerContractVersion).toBe("0.3.0-draft");
    expect(upgraded.bundle.bindingSidecars[0].bindings[0].sourceIntent.sourceRef.rangeConvention).toEqual({ endBoundary: "inclusive", columnUnit: "utf16-code-unit" });
    expect(api.validateGeneratedDocumentationBinding(upgraded.bundle.bindingSidecars[0])).toEqual([]);
    expect(migrate(upgraded.bundle).status).toBe("already-current");
    expect(JSON.stringify(prior)).toBe(before);
  });

  it("can explicitly upgrade the exact legacy pair directly while keeping historical input unchanged", () => {
    const value = fixture();
    const before = JSON.stringify(value);
    const upgraded = migrate(value, { targetVersion: "0.3.0-draft", bindingRangeEvidence: bindingEvidence() });
    expect(upgraded.status).toBe("migrated");
    expect(upgraded.bundle.docSourceMap.contractVersion).toBe("1.1.0");
    expect(upgraded.bundle.bindingSidecars[0].contractVersion).toBe("0.3.0-draft");
    expect(upgraded.bundle.docSourceMap.entries[0].artifactRefs[0].rangeSource).toBe("adapter");
    expect(JSON.stringify(value)).toBe(before);
  });

  it("allows an explicit empty sidecar set when the map declares no binding references", () => {
    const value = fixture();
    value.docSourceMap.generatedBindingSidecars = [];
    value.docSourceMap.entries[0].generatedBindingRefs = [];
    value.bindingSidecars = [];
    expect(migrate(value)).toMatchObject({ status: "migrated", bundle: { docSourceMap: { contractVersion: "1.0.0" }, bindingSidecars: [] } });
    expect(migrate(value, { targetVersion: "0.3.0-draft" })).toMatchObject({ status: "migrated", bundle: { docSourceMap: { contractVersion: "1.1.0" }, bindingSidecars: [] } });
  });

  it("requires independent evidence for every composition source reference", () => {
    const value = fixture();
    value.bindingSidecars[0].bindings[0].composition = {
      relation: "composition", mergePolicy: "ordered-contribution",
      contributions: [{ id: "contribution:synthetic", mode: "append", order: 0,
        sourceRef: structuredClone(value.bindingSidecars[0].bindings[0].sourceIntent.sourceRef), overrideContext: { kind: "include" } }]
    };
    const prior = migrate(value).bundle;
    const partial = migrate(prior, { targetVersion: "0.3.0-draft", bindingRangeEvidence: bindingEvidence() });
    expect(partial.status).toBe("invalid");
    expect(Object.hasOwn(partial, "bundle")).toBe(false);
    const evidence = [...bindingEvidence(), { sidecarIndex: 0, bindingIndex: 0, kind: "contribution", contributionIndex: 0, rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" } }];
    const upgraded = migrate(prior, { targetVersion: "0.3.0-draft", bindingRangeEvidence: evidence });
    expect(upgraded.status).toBe("migrated");
    expect(upgraded.bundle.bindingSidecars[0].bindings[0].composition.contributions[0].sourceRef.rangeConvention).toEqual({ endBoundary: "unknown", columnUnit: "unknown" });
    expect(api.validateGeneratedDocumentationBinding(upgraded.bundle.bindingSidecars[0])).toEqual([]);
  });

  it("requires separate map and binding range evidence when both older artifacts carry ranged source references", () => {
    const value = fixture();
    value.docSourceMap.entries[0].sourceRefs.push({ sourceId: "source:synthetic", range: { start: { line: 1, column: 1 }, end: { line: 3, column: 4 } }, rangeSource: "parser", confidence: "high" });
    const prior = migrate(value).bundle;
    expect(prior.docSourceMap.contractVersion).toBe("1.0.0");
    const bindingOnly = migrate(prior, { targetVersion: "0.3.0-draft", bindingRangeEvidence: bindingEvidence() });
    expect(bindingOnly.status).toBe("invalid");
    expect(Object.hasOwn(bindingOnly, "bundle")).toBe(false);
    const mapOnly = migrate(prior, { targetVersion: "0.3.0-draft", rangeEvidence: [{ entryIndex: 0, sourceRefIndex: 0, rangeConvention: { endBoundary: "exclusive", columnUnit: "unicode-code-point" } }] });
    expect(mapOnly.status).toBe("invalid");
    const complete = migrate(prior, { targetVersion: "0.3.0-draft", bindingRangeEvidence: bindingEvidence(), rangeEvidence: [{ entryIndex: 0, sourceRefIndex: 0, rangeConvention: { endBoundary: "exclusive", columnUnit: "unicode-code-point" } }] });
    expect(complete.status).toBe("migrated");
    expect(complete.bundle.docSourceMap.entries[0].sourceRefs[0].rangeConvention).toEqual({ endBoundary: "exclusive", columnUnit: "unicode-code-point" });
    expect(complete.bundle.bindingSidecars[0].bindings[0].sourceIntent.sourceRef.rangeConvention).toEqual({ endBoundary: "inclusive", columnUnit: "utf16-code-unit" });
  });

  it("rejects 0.3 binding source references without a valid convention or known-unit columns", () => {
    const current = migrate(previousPair(), { targetVersion: "0.3.0-draft", bindingRangeEvidence: bindingEvidence() }).bundle;
    const sidecar = current.bindingSidecars[0];
    expect(api.validateGeneratedDocumentationBinding(sidecar)).toEqual([]);
    delete sidecar.bindings[0].sourceIntent.sourceRef.rangeConvention;
    expect(api.validateGeneratedDocumentationBinding(sidecar).some((diagnostic: any) => diagnostic.severity === "error")).toBe(true);
    sidecar.bindings[0].sourceIntent.sourceRef.rangeConvention = { endBoundary: "unknown", columnUnit: "utf16-code-unit" };
    delete sidecar.bindings[0].sourceIntent.sourceRef.range.start.column;
    expect(api.validateGeneratedDocumentationBinding(sidecar).some((diagnostic: any) => diagnostic.severity === "error")).toBe(true);
    sidecar.bindings[0].sourceIntent.sourceRef.range.start.column = 1;
    Object.defineProperty(sidecar.bindings[0].sourceIntent.sourceRef.rangeConvention, "hidden", { value: "synthetic-private" });
    expect(api.validateGeneratedDocumentationBinding(sidecar).some((diagnostic: any) => diagnostic.severity === "error")).toBe(true);
  });

  it.each(["missing", "duplicate", "extra", "accessor", "hidden-extra", "hidden-convention", "wrong-target"])("atomically refuses malformed binding evidence: %s", (kind) => {
    const prior = previousPair();
    const evidence = bindingEvidence();
    if (kind === "missing") evidence.length = 0;
    if (kind === "duplicate") evidence.push(structuredClone(evidence[0]));
    if (kind === "extra") evidence.push({ sidecarIndex: 0, bindingIndex: 0, kind: "contribution", contributionIndex: 0, rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" } });
    if (kind === "accessor") Object.defineProperty(evidence[0], "rangeConvention", { get() { throw new Error("synthetic-private"); } });
    if (kind === "hidden-extra") Object.defineProperty(evidence[0], "hidden", { value: "synthetic-private" });
    if (kind === "hidden-convention") Object.defineProperty(evidence[0].rangeConvention, "hidden", { value: "synthetic-private" });
    const options = kind === "wrong-target" ? { bindingRangeEvidence: evidence } : { targetVersion: "0.3.0-draft", bindingRangeEvidence: evidence };
    const result = migrate(prior, options);
    expect(result.status).toBe("invalid");
    expect(Object.hasOwn(result, "bundle")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("synthetic-private");
  });

  it("retains exact legacy reader and standalone-map refusal", () => {
    const value = fixture();
    const index = api.createDocSourceMapIndex(value.docSourceMap);
    expect(api.validateGeneratedDocumentationBinding(value.bindingSidecars[0])).toEqual([]);
    expect(api.createGeneratedDocumentationBindingIndex(value.bindingSidecars[0], { docSourceMapIndex: index }).status).toBe("available");
    expect(api.migrateDocSourceMap(value.docSourceMap).status).toBe("invalid");
  });

  it.each(["missing", "duplicate", "extra", "wrong-id", "wrong-path", "unknown-binding", "unknown-source", "unknown-artifact"])("refuses incomplete/contradictory bundle: %s", (kind) => {
    const value = fixture();
    if (kind === "missing") value.bindingSidecars = [];
    if (kind === "duplicate") value.bindingSidecars.push(structuredClone(value.bindingSidecars[0]));
    if (kind === "extra") { const extra = structuredClone(value.bindingSidecars[0]); extra.id = "extra"; value.bindingSidecars.push(extra); }
    if (kind === "wrong-id") value.bindingSidecars[0].docSourceMapLinkage.docSourceMapId = "other";
    if (kind === "wrong-path") value.bindingSidecars[0].docSourceMapLinkage.sidecarPath = "other.gdb.json";
    if (kind === "unknown-binding") value.docSourceMap.entries[0].generatedBindingRefs[0].bindingId = "missing";
    if (kind === "unknown-source") value.bindingSidecars[0].bindings[0].sourceIntent.sourceRef.sourceId = "missing";
    if (kind === "unknown-artifact") value.bindingSidecars[0].targets[0].identity.artifactId = "missing";
    expectRefused(value);
  });

  it.each(["0.2.1-draft", "1.0.0", "0.2.0-draft+build"])("refuses unrecognized binding versions %s", (version) => {
    const value = fixture();
    value.bindingSidecars[0].contractVersion = version;
    expect(migrate(value).status).toBe("unsupported-version");
    expectRefused(value);
  });

  it.each(["map-current", "binding-current"])("refuses mixed supported pair versions %s", (kind) => {
    const value = fixture();
    if (kind === "map-current") value.docSourceMap.contractVersion = "1.0.0";
    else { value.bindingSidecars[0].contractVersion = "0.2.0-draft"; value.bindingSidecars[0].docSourceMapLinkage.contractVersion = "1.0.0"; value.bindingSidecars[0].compatibility.minimumConsumerContractVersion = "0.2.0-draft"; }
    expectRefused(value);
  });

  it("rejects the newer map with a 0.2 binding even if declaration and backlink are edited together", () => {
    const value = previousPair();
    value.docSourceMap.contractVersion = "1.1.0";
    value.bindingSidecars[0].docSourceMapLinkage.contractVersion = "1.1.0";
    expect(migrate(value).status).toBe("invalid");
  });

  it("refuses unknown provenance without mutating either original", () => {
    const value = fixture();
    value.docSourceMap.entries[0].artifactRefs[0].rangeSource = "synthetic-private-origin";
    const before = JSON.stringify(value);
    expectRefused(value);
    expect(JSON.stringify(value)).toBe(before);
  });

  it("refuses cyclic/forbidden data and getters without execution or reflected text", () => {
    const value = fixture();
    value.bindingSidecars[0].sourceBody = "synthetic-private-body";
    expectRefused(value);
    delete value.bindingSidecars[0].sourceBody;
    value.self = value;
    expectRefused(value);
    let reads = 0;
    const getters = Object.defineProperty({}, "docSourceMap", { get() { reads += 1; throw new Error("synthetic-private"); } });
    expectRefused(getters);
    expect(reads).toBe(0);
  });

  it("keeps historical/current schemas independent with exact paired const values", () => {
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.properties.contractVersion.const).toBe("0.3.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("1.1.0");
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.sourceRef.required).toContain("rangeConvention");
    expect(api.GENERATED_DOCUMENTATION_BINDING_0_2_0_JSON_SCHEMA.properties.contractVersion.const).toBe("0.2.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_0_2_0_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("1.0.0");
    expect(api.GENERATED_DOCUMENTATION_BINDING_0_2_0_JSON_SCHEMA.$defs.sourceRef.required).not.toContain("rangeConvention");
    expect(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.properties.contractVersion.const).toBe("0.1.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("0.1.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.binding).not.toBe(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.$defs.binding);
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.binding).not.toBe(api.GENERATED_DOCUMENTATION_BINDING_0_2_0_JSON_SCHEMA.$defs.binding);
  });

  it("preserves exact historical schema bytes", () => {
    const bytes = readFileSync(new URL("../../schemas/src/history/generated-documentation-binding-0.1.0-draft.schema.json", import.meta.url), "utf8");
    // <lang><zh-CN>旧公开文件使用编译器四空格格式，不能用源对象重新序列化冒充线上原字节。</zh-CN><en>The old public file uses compiler four-space formatting; reserializing the source object cannot substitute for original online bytes.</en></lang>
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("6ea1aca4fcc69f6fab6bf034be6efc4433d8d5d69e3694d101ea7a59a03998d7");
    expect(JSON.parse(bytes)).toEqual(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA);
    const published = readFileSync(new URL("../../schemas/src/history/generated-documentation-binding-0.2.0-draft.schema.json", import.meta.url), "utf8");
    expect(createHash("sha256").update(published).digest("hex")).toBe("474c20333ceb5b7e5aaa43ce5dc53e3016d9a0cce4a30eb3e8c0c41d945ba21b");
    expect(JSON.parse(published)).toEqual(api.GENERATED_DOCUMENTATION_BINDING_0_2_0_JSON_SCHEMA);
  });

  it("migrates all explicitly supplied sidecars in input order", () => {
    const value = fixture();
    // <lang><zh-CN>第二辅助工件使用独立身份和路径，组内binding身份只在各自sidecar内唯一。</zh-CN><en>The second sidecar has independent identity/path; binding identities remain local to each sidecar.</en></lang>
    const second = structuredClone(value.bindingSidecars[0]);
    second.id = "sidecar:second";
    second.docSourceMapLinkage.sidecarId = second.id;
    second.docSourceMapLinkage.sidecarPath = "dist/second.gdb.json";
    value.docSourceMap.generatedBindingSidecars.push({ id: second.id, contract: second.contract, contractVersion: second.contractVersion, path: second.docSourceMapLinkage.sidecarPath });
    value.docSourceMap.entries[0].generatedBindingRefs.push({ sidecarId: second.id, bindingId: "binding:synthetic" });
    value.bindingSidecars.unshift(second);
    const result = migrate(value);
    expect(result.status).toBe("migrated");
    expect(result.bundle.bindingSidecars.map((sidecar: any) => sidecar.id)).toEqual(["sidecar:second", "sidecar:synthetic"]);
    expect(result.bundle.docSourceMap.generatedBindingSidecars.every((sidecar: any) => sidecar.contractVersion === "0.2.0-draft")).toBe(true);
  });

  it("propagates actual legacy/current versions through the safe host projection", () => {
    const prior = previousPair();
    const current = migrate(prior, { targetVersion: "0.3.0-draft", bindingRangeEvidence: bindingEvidence() }).bundle;
    for (const value of [fixture(), prior, current]) {
      const index = api.createGeneratedDocumentationBindingIndex(value.bindingSidecars[0], { docSourceMapIndex: api.createDocSourceMapIndex(value.docSourceMap) });
      expect(api.createGeneratedDocumentationBindingHostProjection(index)).toMatchObject({ status: "available", bindingContractVersion: value.bindingSidecars[0].contractVersion, contractVersion: "0.1.0-draft" });
    }
  });

  it.each(["1.0.1", "1.0.0+build", "0.2.0-draft"])("rejects unknown mapping version %s", (version) => {
    const value = fixture();
    value.docSourceMap.contractVersion = version;
    expect(migrate(value).status).toBe("unsupported-version");
    expectRefused(value);
  });

  it("clones deep shared extensions and ordinary __proto__ keys independently", () => {
    const value = fixture();
    const extension: any = JSON.parse('{"__proto__":{"note":"passive"}}');
    let cursor = extension;
    // <lang><zh-CN>深度只验证迭代遍历，不代表资源上限或并发突变沙箱。</zh-CN><en>Depth verifies iterative traversal, not resource limits or a concurrent-mutation sandbox.</en></lang>
    for (let depth = 0; depth < 8000; depth += 1) { cursor.child = {}; cursor = cursor.child; }
    value.bindingSidecars[0].extensions = { left: extension, right: extension };
    const result = migrate(value);
    expect(result.status).toBe("migrated");
    const copied = result.bundle.bindingSidecars[0].extensions;
    expect(copied.left).toBe(copied.right);
    expect(Object.is(copied.left, extension)).toBe(false);
    expect(Object.hasOwn(copied.left, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(copied.left)).toBe(Object.prototype);
    expect(copied.left.__proto__).toEqual({ note: "passive" });
  });

  it("rejects contribution references outside the declared source closure", () => {
    const value = fixture();
    value.bindingSidecars[0].bindings[0].composition = { relation: "composition", mergePolicy: "ordered-contribution", contributions: [{ id: "contribution:synthetic", mode: "append", order: 0, sourceRef: structuredClone(value.bindingSidecars[0].bindings[0].sourceIntent.sourceRef), overrideContext: { kind: "include" } }] };
    expect(migrate(value).status).toBe("migrated");
    value.bindingSidecars[0].bindings[0].composition.contributions[0].sourceRef.sourceId = "missing";
    expectRefused(value);
  });

  it("rejects revoked proxies and non-enumerable required fields without partial output", () => {
    const proxy = Proxy.revocable({}, {});
    proxy.revoke();
    expectRefused(proxy.proxy);
    const value = fixture();
    Object.defineProperty(value.bindingSidecars[0], "bindings", { enumerable: false });
    expectRefused(value);
  });
});
