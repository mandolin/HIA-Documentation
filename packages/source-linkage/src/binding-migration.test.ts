/**
 * @file
 * @lang zh-CN 已确认0.2.0-draft绑定整组迁移的版本、闭包、保真与原子失败回归。
 * @lang en Version/closure/losslessness/atomic-failure regressions for the confirmed 0.2.0-draft binding bundle migration.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";

/** @lang zh-CN 将公开合成fixture转换为明确的内存API输入，不读取业务工程。 @lang en Adapts the public synthetic fixture to the explicit memory API input without reading business projects. */
function fixture(): any {
  const pair = JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8"));
  return { docSourceMap: pair.documentMap, bindingSidecars: [pair.bindingSidecar] };
}
/** @lang zh-CN 只通过公共根调用迁移，初始缺失API应成为真实红例。 @lang en Calls migration through the public root only, making the initially missing API a genuine red case. */
function migrate(value: unknown): any { return api.migrateGeneratedDocumentationBindingBundle(value); }
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
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.properties.contractVersion.const).toBe("0.2.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("1.0.0");
    expect(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.properties.contractVersion.const).toBe("0.1.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.$defs.docSourceMapLinkage.properties.contractVersion.const).toBe("0.1.0-draft");
    expect(api.GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA.$defs.binding).not.toBe(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA.$defs.binding);
  });

  it("preserves exact historical schema bytes", () => {
    const bytes = readFileSync(new URL("../../schemas/src/history/generated-documentation-binding-0.1.0-draft.schema.json", import.meta.url), "utf8");
    expect(JSON.stringify(api.GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA, null, 2) + "\n").toBe(bytes);
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
    for (const value of [fixture(), migrate(fixture()).bundle]) {
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
