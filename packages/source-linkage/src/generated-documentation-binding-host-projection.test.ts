/**
 * @file
 * @lang zh-CN 宿主投影的合法工厂输入回归：逐层白名单、失败传播、引用隔离与冻结，不把任意对象当已验证索引。
 * @lang en Host-projection regressions over legitimate factory inputs: nested allowlists, failure propagation, detached references and freezing, without treating arbitrary objects as validated indexes.
 */
import { describe, expect, it } from "vitest";
import input from "../../../fixtures/source-linkage/generated-binding-input.json";
import {
  createDocSourceMapIndex,
  createGeneratedDocumentationBindingHostProjection,
  createGeneratedDocumentationBindingIndex,
  type GeneratedDocumentationBindingHostProjection
} from "./index.js";

/** @lang zh-CN 每例独立复制公开合成配对，当前版只切换已确认的三个配对版本及最低读取版本。 @lang en Independently copies the public synthetic pair; current fixtures change only the three approved pairing versions and minimum reader version. */
function pair(current = false): typeof input {
  // <lang><zh-CN>测试输入不共享可变数组，避免前例污染后例。</zh-CN><en>Test inputs share no mutable arrays, preventing cross-case contamination.</en></lang>
  const value = structuredClone(input);
  if (current) {
    value.documentMap.contractVersion = "1.0.0";
    value.documentMap.generatedBindingSidecars[0]!.contractVersion = "0.2.0-draft";
    value.bindingSidecar.contractVersion = "0.2.0-draft";
    value.bindingSidecar.docSourceMapLinkage.contractVersion = "1.0.0";
    value.bindingSidecar.compatibility.minimumConsumerContractVersion = "0.2.0-draft";
  }
  return value;
}

/** @lang zh-CN 只经公开两级工厂建立索引，诊断上下文用合成标记检验其不泄漏到宿主。 @lang en Builds indexes through the two public factories only, using synthetic diagnostic context to check that it never reaches hosts. */
function indexFor(value = pair()) {
  return createGeneratedDocumentationBindingIndex(value.bindingSidecar, {
    docSourceMapIndex: createDocSourceMapIndex(value.documentMap, { path: "context/PRIVATE-MAP.json" }),
    path: "context/PRIVATE-BINDING.json"
  });
}

/** @lang zh-CN 精确白名单期望独立列出所有层级，新增字段必须显式审查而非由实际输出反推。 @lang en Independently lists exact allowlists at every level; additions require explicit review rather than deriving expectations from actual output. */
function expectShape(value: GeneratedDocumentationBindingHostProjection): void {
  expect(Object.keys(value).sort()).toEqual(["bindingContract", "bindingContractVersion", "bindings", "contract", "contractVersion", "diagnostics", "privacy", "sidecarId", "status", "summary"]);
  expect(Object.keys(value.privacy).sort()).toEqual(["diagnosticFreeTextIncluded", "localsValueIncluded", "sidecarPathIncluded", "sourceBodyIncluded", "sourceRangeIncluded", "sourcesContentPolicy"]);
  expect(Object.keys(value.summary).sort()).toEqual(["bindingCount", "diagnosticCount", "expansionCount", "linkedDocSourceMapEntryCount", "stableInstanceKeyCount", "targetCount", "unlinkedBindingCount"]);
  // <lang><zh-CN>正常fixture有一个绑定；所有嵌套层的字段集合均独立断言。</zh-CN><en>The normal fixture has one binding; assert field sets independently at every nested level.</en></lang>
  const binding = value.bindings[0]!;
  expect(Object.keys(binding).sort()).toEqual(["bindingRef", "composition", "docSourceMapEntryIds", "expansions", "id", "quality", "scopeId", "sourceIntent", "targets"]);
  expect(Object.keys(binding.bindingRef).sort()).toEqual(["kind", "memberPath", "rootDeclarationId"]);
  expect(Object.keys(binding.composition).sort()).toEqual(["contributionCount", "mergePolicy", "relation"]);
  expect(Object.keys(binding.sourceIntent).sort()).toEqual(["field", "kind"]);
  expect(Object.keys(binding.quality).sort()).toEqual(["confidence", "provenanceCoverage", "resolutionKind"]);
  expect(Object.keys(binding.expansions[0]!).sort()).toEqual(["id", "instanceKey", "order", "quality", "targetIds"]);
  expect(Object.keys(binding.expansions[0]!.instanceKey).sort()).toEqual(["displayKey", "origin", "privacySafe", "status"]);
  expect(Object.keys(binding.targets[0]!).sort()).toEqual(["docSourceMapEntryIds", "id", "identity", "quality"]);
  expect(Object.keys(binding.targets[0]!.identity).sort()).toEqual(["artifactId", "kind", "selector", "symbolId"]);
}

/** @lang zh-CN 对输出图逐个容器验证冻结并排除索引对象别名，不执行属性访问器。 @lang en Checks freezing and excludes index object aliases for every output container without invoking accessors. */
function expectDetachedFrozen(value: unknown, sourceObjects: Set<object>): void {
  if (value === null || typeof value !== "object") return;
  expect(sourceObjects.has(value)).toBe(false);
  expect(Object.isFrozen(value)).toBe(true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) expectDetachedFrozen(descriptor.value, sourceObjects);
  }
}

/** @lang zh-CN 收集普通工厂结果中的容器身份，只用于检验输出不借用它们。 @lang en Collects container identities from ordinary factory results solely to test that output borrows none. */
function objectsIn(value: unknown, found = new Set<object>()): Set<object> {
  if (value === null || typeof value !== "object" || found.has(value)) return found;
  found.add(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) objectsIn(descriptor.value, found);
  }
  return found;
}

describe.each([false, true])("binding host projection, current=%s", (current) => {
  it("retains exact public shapes, values and independent quality dimensions", () => {
    // <lang><zh-CN>所有关系经实际两级工厂创建，覆盖两组版本而非手造index。</zh-CN><en>Create every relation through both actual factories, covering both version pairs without fabricated indexes.</en></lang>
    const index = indexFor(pair(current));
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(index.status).toBe("available");
    expectShape(projection);
    expect(projection.bindingContractVersion).toBe(current ? "0.2.0-draft" : "0.1.0-draft");
    expect(projection.contractVersion).toBe("0.1.0-draft");
    expect(projection.summary).toEqual({ bindingCount: 1, diagnosticCount: 0, expansionCount: 1, linkedDocSourceMapEntryCount: 1, stableInstanceKeyCount: 1, targetCount: 1, unlinkedBindingCount: 0 });
    expect(projection.bindings[0]).toEqual({
      bindingRef: { kind: "member-path", memberPath: ["name"], rootDeclarationId: "declaration:synthetic" },
      composition: { contributionCount: 0, mergePolicy: "not-applicable", relation: "none" },
      docSourceMapEntryIds: ["entry:synthetic"],
      expansions: [{ id: "expansion:synthetic", instanceKey: { displayKey: "gdb-key/v1/string:synthetic", origin: "explicit-instance-key", privacySafe: true, status: "stable" }, order: 0, quality: { confidence: "high", provenanceCoverage: "source-and-generated", resolutionKind: "exact" }, targetIds: ["target:synthetic"] }],
      id: "binding:synthetic", quality: { confidence: "high", provenanceCoverage: "source-and-generated", resolutionKind: "exact" }, scopeId: "gdb-scope/v1/pug/source-synthetic#root/declaration", sourceIntent: { field: "description", kind: "documentation-field" },
      targets: [{ docSourceMapEntryIds: ["entry:synthetic"], id: "target:synthetic", identity: { artifactId: "artifact:synthetic", kind: "generated-html-element", selector: "article.synthetic", symbolId: "symbol:synthetic" }, quality: { confidence: "high", provenanceCoverage: "source-and-generated", resolutionKind: "exact" } }]
    });
  });

  it.each(["root", "binding", "intent", "reference", "scope", "composition", "expansion", "instance", "target", "identity", "quality"])("omits allowed unknown %s extensions", (where) => {
    // <lang><zh-CN>合法未知JSON扩展含合成秘密标记，不能因整对象复制进入投影。</zh-CN><en>Legal unknown JSON extensions contain a synthetic secret marker that must not enter projection through whole-object copying.</en></lang>
    const value = pair(current);
    const locations: Record<string, object> = { root: value.bindingSidecar, binding: value.bindingSidecar.bindings[0]!, intent: value.bindingSidecar.bindings[0]!.sourceIntent, reference: value.bindingSidecar.bindings[0]!.bindingRef, scope: value.bindingSidecar.bindings[0]!.scope, composition: value.bindingSidecar.bindings[0]!.composition, expansion: value.bindingSidecar.expansions[0]!, instance: value.bindingSidecar.expansions[0]!.instanceKey, target: value.bindingSidecar.targets[0]!, identity: value.bindingSidecar.targets[0]!.identity, quality: value.bindingSidecar.targets[0]!.resolution };
    Object.assign(locations[where]!, { extensionPayload: "PRIVATE-EXTENSION-CANARY" });
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expectShape(projection);
    expect(JSON.stringify(projection)).not.toContain("PRIVATE-EXTENSION-CANARY");
  });

  it("omits actual source/target ranges, diagnostic text/context and source paths", () => {
    // <lang><zh-CN>合法sourceRef/target range在索引内保留，公开投影应独立遗漏。</zh-CN><en>Valid sourceRef/target ranges survive indexing and must independently be omitted by public projection.</en></lang>
    const value = pair(current);
    Object.assign(value.bindingSidecar.targets[0]!.identity, { range: { start: { line: 91 }, end: { line: 94 } } });
    // <lang><zh-CN>未知绑定引用产生真实warning和含路径的诊断，测试实际失败上下文而非伪造diagnostic。</zh-CN><en>An unknown binding reference produces a real warning with path context, testing actual diagnostics rather than fabrication.</en></lang>
    value.documentMap.entries[0]!.generatedBindingRefs.push({ bindingId: "binding:PRIVATE-UNKNOWN", sidecarId: "sidecar:synthetic" });
    const index = indexFor(value);
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(index.status).toBe("available");
    expect(index.bindings[0]!.sourceIntent.sourceRange).toBeDefined();
    expect(index.targets[0]!.identity.range).toBeDefined();
    expect(index.diagnostics.length).toBeGreaterThan(0);
    expect(projection.diagnostics).toEqual(index.diagnostics.map(({ code, severity }) => ({ code, severity })));
    expect(projection.summary.diagnosticCount).toBe(index.diagnostics.length);
    for (const diagnostic of projection.diagnostics) expect(Object.keys(diagnostic).sort()).toEqual(["code", "severity"]);
    const text = JSON.stringify(projection);
    for (const forbidden of ['"sourceRange"', '"sourceId"', '"range"', "PRIVATE-UNKNOWN", "PRIVATE-MAP", "PRIVATE-BINDING", "src/synthetic.pug", "dist/synthetic.gdb.json", '"message"', '"targetPath"', '"data"']) expect(text).not.toContain(forbidden);
  });

  it("returns independently frozen output without changing inputs", () => {
    // <lang><zh-CN>输入与索引均保留前态快照，所有输出容器必须独立且冻结。</zh-CN><en>Preserve snapshots of both input and index; every output container must be independent and frozen.</en></lang>
    const value = pair(current);
    const index = indexFor(value);
    const before = JSON.stringify([value, index]);
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expectDetachedFrozen(projection, objectsIn(index));
    expect(JSON.stringify([value, index])).toBe(before);
    expect(Object.isFrozen(value.bindingSidecar)).toBe(false);
    expect(() => (projection.bindings as unknown as object[]).push({})).toThrow(TypeError);
    expect(Reflect.set(projection.summary, "bindingCount", 99)).toBe(false);
    expect(createGeneratedDocumentationBindingHostProjection(index)).toEqual(projection);
    expect(createGeneratedDocumentationBindingHostProjection(index)).not.toBe(projection);
  });

  it("does not invent absent optional intent, target or instance fields", () => {
    const value = pair(current);
    Reflect.deleteProperty(value.bindingSidecar.bindings[0]!.sourceIntent, "field");
    // <lang><zh-CN>目标必须保留artifact或symbol之一；只删真正可选的selector/symbol。</zh-CN><en>A target requires an artifact or symbol identity; remove only genuinely optional selector/symbol fields.</en></lang>
    for (const key of ["selector", "symbolId"]) Reflect.deleteProperty(value.bindingSidecar.targets[0]!.identity, key);
    // <lang><zh-CN>missing键按冻结规则无key，允许privacySafe省略，工厂会投影false。</zh-CN><en>A missing key has no key under frozen rules and may omit privacySafe; the factory projects false.</en></lang>
    value.bindingSidecar.expansions[0]!.instanceKey = { status: "missing", origin: "unavailable", diagnosticCode: "GDB_INSTANCE_KEY_MISSING" } as unknown as typeof value.bindingSidecar.expansions[0]["instanceKey"];
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const binding = createGeneratedDocumentationBindingHostProjection(index).bindings[0]!;
    expect(binding.sourceIntent).toEqual({ kind: "documentation-field" });
    expect(binding.targets[0]!.identity).toEqual({ artifactId: "artifact:synthetic", kind: "generated-html-element" });
    expect(binding.expansions[0]!.instanceKey).toEqual({ origin: "unavailable", privacySafe: false, status: "missing" });
  });

  it.each(["stable", "unstable", "missing"])("preserves %s instance state and counts only stable keys", (status) => {
    const value = pair(current);
    if (status === "unstable") Object.assign(value.bindingSidecar.expansions[0]!.instanceKey, { status, origin: "array-index", key: "gdb-key/v1/ordinal:0", diagnosticCode: "GDB_INSTANCE_KEY_UNSTABLE" });
    if (status === "missing") value.bindingSidecar.expansions[0]!.instanceKey = { status, origin: "unavailable", diagnosticCode: "GDB_INSTANCE_KEY_MISSING" } as unknown as typeof value.bindingSidecar.expansions[0]["instanceKey"];
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.bindings[0]!.expansions[0]!.instanceKey.status).toBe(status);
    expect(projection.summary.stableInstanceKeyCount).toBe(status === "stable" ? 1 : 0);
    expect(Object.hasOwn(projection.bindings[0]!.expansions[0]!.instanceKey, "displayKey")).toBe(status !== "missing");
  });

  it("retains input order, shared targets, unlinked bindings and global counts", () => {
    const value = pair(current);
    // <lang><zh-CN>两绑定共享同一目标；展开顺序故意不按order排序以确认投影不重排。</zh-CN><en>Two bindings share one target; deliberately nonnumeric expansion ordering verifies that projection does not sort.</en></lang>
    const second = structuredClone(value.bindingSidecar.bindings[0]!);
    second.id = "binding:second";
    second.composition = { relation: "composition", mergePolicy: "ordered-contribution", contributions: [{ id: "contribution:one", mode: "append", order: 0, sourceRef: structuredClone(value.bindingSidecar.bindings[0]!.sourceIntent.sourceRef), overrideContext: { kind: "adapter-defined" } }] } as unknown as typeof second.composition;
    value.bindingSidecar.bindings.push(second);
    const expansion = structuredClone(value.bindingSidecar.expansions[0]!);
    expansion.id = "expansion:second";
    expansion.bindingId = second.id;
    expansion.order = 9;
    expansion.instanceKey.key = "gdb-key/v1/string:second";
    value.bindingSidecar.expansions.unshift(expansion);
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.bindings.map(({ id }) => id)).toEqual(["binding:synthetic", "binding:second"]);
    expect(projection.bindings.map((binding) => binding.expansions[0]!.order)).toEqual([0, 9]);
    expect(projection.bindings[1]!.composition.contributionCount).toBe(1);
    expect(projection.bindings[1]!.docSourceMapEntryIds).toEqual([]);
    expect(projection.bindings[0]!.targets).toEqual(projection.bindings[1]!.targets);
    expect(projection.bindings[0]!.targets).not.toBe(projection.bindings[1]!.targets);
    expect(projection.summary).toMatchObject({ bindingCount: 2, expansionCount: 2, targetCount: 1, linkedDocSourceMapEntryCount: 1, unlinkedBindingCount: 1, stableInstanceKeyCount: 2 });
  });

  it.each(["invalid-sidecar", "unsupported-sidecar", "invalid-map", "unsupported-map"])("propagates %s status without partial relations or free text", (failure) => {
    const value = pair(current);
    if (failure === "invalid-sidecar") value.bindingSidecar.bindings[0]!.resolution.confidence = "invalid";
    // <lang><zh-CN>未知sidecar版本先被映射声明的精确配对规则拒绝；未知映射根版本仍由映射索引报告unsupported。</zh-CN><en>An unknown sidecar version first fails the map declaration's exact-pair rule; an unknown map root version is still reported unsupported by the map index.</en></lang>
    if (failure === "unsupported-sidecar") {
      value.bindingSidecar.contractVersion = "99.0.0";
      value.bindingSidecar.compatibility.minimumConsumerContractVersion = "99.0.0";
      value.bindingSidecar.docSourceMapLinkage.contractVersion = "0.1.0-draft";
    }
    if (failure === "invalid-map") value.documentMap.sources[0]!.path = "../PRIVATE-SOURCE";
    if (failure === "unsupported-map") value.documentMap.contractVersion = "99.0.0";
    const index = indexFor(value);
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.status).toBe(failure === "unsupported-map" ? "unsupported-version" : "invalid");
    expect(projection.status).toBe(index.status);
    expect(projection.bindings).toEqual([]);
    expect(projection.diagnostics).toEqual(index.diagnostics.map(({ code, severity }) => ({ code, severity })));
    expect(projection.diagnostics.length).toBeGreaterThan(0);
    expect(projection.summary).toEqual({ bindingCount: 0, diagnosticCount: index.diagnostics.length, expansionCount: 0, linkedDocSourceMapEntryCount: 0, stableInstanceKeyCount: 0, targetCount: 0, unlinkedBindingCount: 0 });
    expect(projection.bindingContractVersion).toBe(failure === "unsupported-sidecar" ? "0.1.0-draft" : current ? "0.2.0-draft" : "0.1.0-draft");
    expectDetachedFrozen(projection, objectsIn(index));
    for (const forbidden of ["PRIVATE-SOURCE", "PRIVATE-BINDING", "PRIVATE-MAP", '"message"', '"targetPath"']) expect(JSON.stringify(projection)).not.toContain(forbidden);
  });

  it("omits unsupported unknown-version identity certification", () => {
    const index = createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: createDocSourceMapIndex({}) });
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.status).toBe("invalid");
    expect(projection.bindingContractVersion).toBe("0.1.0-draft");
    expect(Object.hasOwn(projection, "sidecarId")).toBe(false);
    expect(projection.bindings).toEqual([]);
  });

  it("keeps diagnostic order, duplicates and severities without free text", () => {
    const value = pair(current);
    // <lang><zh-CN>映射诊断走实际归一化与索引传播；code是数据，不能当全文脱敏证明。</zh-CN><en>Map diagnostics pass through real normalization/index propagation; codes are data, not proof of full-text redaction.</en></lang>
    Object.assign(value.documentMap, { diagnostics: [{ code: "SYNTHETIC_FIRST", severity: "info", message: "PRIVATE-MESSAGE" }, { code: "SYNTHETIC_SECOND", severity: "warning", message: "PRIVATE-MESSAGE" }, { code: "SYNTHETIC_FIRST", severity: "info", message: "PRIVATE-MESSAGE" }] });
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.diagnostics).toEqual([{ code: "SYNTHETIC_FIRST", severity: "info" }, { code: "SYNTHETIC_SECOND", severity: "warning" }, { code: "SYNTHETIC_FIRST", severity: "info" }]);
    expect(projection.summary.diagnosticCount).toBe(3);
    expect(JSON.stringify(projection)).not.toContain("PRIVATE-MESSAGE");
  });

  it("does not conflate binding, expansion or target quality", () => {
    const value = pair(current);
    value.bindingSidecar.bindings[0]!.resolution = { resolutionKind: "inferred", confidence: "medium", provenanceCoverage: "source-only" };
    value.bindingSidecar.expansions[0]!.resolution = { resolutionKind: "ambiguous", confidence: "low", provenanceCoverage: "generated-only" };
    value.bindingSidecar.targets[0]!.resolution = { resolutionKind: "unresolved", confidence: "none", provenanceCoverage: "generated-only" };
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const binding = createGeneratedDocumentationBindingHostProjection(index).bindings[0]!;
    expect(binding.quality).toEqual({ resolutionKind: "inferred", confidence: "medium", provenanceCoverage: "source-only" });
    expect(binding.expansions[0]!.quality).toEqual({ resolutionKind: "ambiguous", confidence: "low", provenanceCoverage: "generated-only" });
    expect(binding.targets[0]!.quality).toEqual({ resolutionKind: "unresolved", confidence: "none", provenanceCoverage: "generated-only" });
  });

  it("does not sort a binding's expansions by numeric order", () => {
    const value = pair(current);
    const second = structuredClone(value.bindingSidecar.expansions[0]!);
    second.id = "expansion:next";
    second.instanceKey.key = "gdb-key/v1/string:next";
    value.bindingSidecar.expansions[0]!.order = 9;
    value.bindingSidecar.expansions.push(second);
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.bindings[0]!.expansions.map(({ order }) => order)).toEqual([9, 0]);
    expect(projection.summary).toMatchObject({ expansionCount: 2, targetCount: 1, stableInstanceKeyCount: 2 });
  });

  it("supports a symbol-only target without inventing an artifact identity", () => {
    const value = pair(current);
    Reflect.deleteProperty(value.bindingSidecar.targets[0]!.identity, "artifactId");
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const target = createGeneratedDocumentationBindingHostProjection(index).bindings[0]!.targets[0]!;
    expect(Object.hasOwn(target.identity, "artifactId")).toBe(false);
    expect(target.identity.symbolId).toBe("symbol:synthetic");
  });

  it("retains permitted labels as unescaped data rather than publication authorization", () => {
    const value = pair(current);
    value.bindingSidecar.targets[0]!.identity.selector = '<span data-example="synthetic">';
    const index = indexFor(value);
    expect(index.status).toBe("available");
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.bindings[0]!.targets[0]!.identity.selector).toBe(value.bindingSidecar.targets[0]!.identity.selector);
    expect(projection.privacy.sourceBodyIncluded).toBe(false);
  });
});
