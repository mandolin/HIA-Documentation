/**
 * @file
 * @lang zh-CN 三个生成式绑定公开接口六字段的所有权、诊断与类型容器特征；只读公开合成样本。
 * @lang en Characterizes ownership, diagnostics and containers for six fields in three generated-binding interfaces using a public synthetic fixture.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateGeneratedDocumentationBindingBundle, validateGeneratedDocumentationBinding } from "./index.js";

/** @lang zh-CN 每次构造独立旧/新配对；当前版本仅按已确认配对字段转换，不调用被测迁移器制造预期输入。 @lang en Creates fresh legacy/current pairs, updating only approved version fields without using the migration under test to manufacture inputs. */
function fixture(current: boolean): any {
  // <lang><zh-CN>公共样本每次独立解析，测试不写回工件。</zh-CN><en>Parse the public fixture independently for each test without rewriting artifacts.</en></lang>
  const pair = JSON.parse(readFileSync(new URL("../../../fixtures/source-linkage/generated-binding-input.json", import.meta.url), "utf8"));
  if (current) {
    pair.documentMap.contractVersion = "1.0.0";
    pair.documentMap.generatedBindingSidecars[0].contractVersion = "0.2.0-draft";
    pair.bindingSidecar.contractVersion = "0.2.0-draft";
    pair.bindingSidecar.docSourceMapLinkage.contractVersion = "1.0.0";
    pair.bindingSidecar.compatibility.minimumConsumerContractVersion = "0.2.0-draft";
  }
  return { docSourceMap: pair.documentMap, bindingSidecars: [pair.bindingSidecar] };
}
/** @lang zh-CN 收集已知测试JSON图的对象身份，允许内部共享，核对跨调用独立性。 @lang en Collects identities in known test JSON graphs, allowing internal sharing while checking independence across calls. */
function nodes(value: unknown, seen = new Set<object>()): Set<object> {
  if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) nodes(child, seen);
  }
  return seen;
}

describe.each([false, true])("binding container/result fields, current=%s", current => {
  it("returns writable own fields with the complete current pair", () => {
    // <lang><zh-CN>实际factory保证成功形态；普通interface本身不认证版本或bundle存在。</zh-CN><en>The factory supplies the successful shape; the plain interface itself certifies neither versions nor bundle presence.</en></lang>
    const result = migrateGeneratedDocumentationBindingBundle(fixture(current));
    expect(result.status).toBe(current ? "already-current" : "migrated");
    expect(Object.keys(result).sort()).toEqual(["bundle", "diagnostics", "status"]);
    expect(Object.keys(result.bundle!).sort()).toEqual(["bindingSidecars", "docSourceMap"]);
    expect(result.bundle!.docSourceMap.contractVersion).toBe("1.0.0");
    expect(result.bundle!.bindingSidecars[0]!.contractVersion).toBe("0.2.0-draft");
    expect(result.diagnostics).toEqual([]);
    expect([result, result.bundle!, result.bundle!.docSourceMap, result.bundle!.bindingSidecars, result.bundle!.bindingSidecars[0]!, result.diagnostics].every(value => !Object.isFrozen(value))).toBe(true);
  });
  it("shares no mutable nodes with input or another call", () => {
    // <lang><zh-CN>核对完整返回图，而不只比较顶层容器。</zh-CN><en>Check the complete return graph rather than only the outer container.</en></lang>
    const input = fixture(current), first = migrateGeneratedDocumentationBindingBundle(input), second = migrateGeneratedDocumentationBindingBundle(input);
    const originalNodes = nodes(input), firstNodes = nodes(first), secondNodes = nodes(second);
    expect([...firstNodes].filter(node => originalNodes.has(node) || secondNodes.has(node))).toEqual([]);
  });
  it("keeps edits local and does not recompute status", () => {
    // <lang><zh-CN>输出可写，但后续编辑不再代表factory验证时的观察。</zh-CN><en>Outputs are writable, but later edits no longer represent the factory's validated observation.</en></lang>
    const input = fixture(current), first = migrateGeneratedDocumentationBindingBundle(input), second = migrateGeneratedDocumentationBindingBundle(input);
    const status = first.status;
    first.bundle!.bindingSidecars[0]!.id = "changed";
    first.bundle!.bindingSidecars.length = 0;
    first.bundle!.docSourceMap.entries = [];
    first.diagnostics.push({ code: "SYNTHETIC", severity: "error", message: "caller edit" });
    expect(first.status).toBe(status);
    expect(input.bindingSidecars[0].id).toBe("sidecar:synthetic");
    expect(second.bundle!.bindingSidecars[0]!.id).toBe("sidecar:synthetic");
    expect(second.bundle!.docSourceMap.entries).toHaveLength(1);
  });
  it("preserves sharing within each artifact but separates cross-artifact aliases", () => {
    // <lang><zh-CN>每个工件分别复制；同一个输入扩展可在工件内共享，跨工件输出身份不保留。</zh-CN><en>Artifacts are cloned separately; one input extension may be shared inside an artifact, while cross-artifact output identity is not retained.</en></lang>
    const input = fixture(current), shared = { note: "synthetic shared extension" };
    input.docSourceMap.extension = { a: shared, b: shared };
    input.bindingSidecars[0].adapterExtensions = { a: shared, b: shared };
    const result = migrateGeneratedDocumentationBindingBundle(input), map = result.bundle!.docSourceMap as any, sidecar = result.bundle!.bindingSidecars[0] as any;
    expect(map.extension.a).toBe(map.extension.b);
    expect(sidecar.adapterExtensions.a).toBe(sidecar.adapterExtensions.b);
    expect(map.extension.a).not.toBe(sidecar.adapterExtensions.a);
    expect(map.extension.a).not.toBe(shared);
  });
  it("keeps artifact diagnostics and permitted text inside the bundle only", () => {
    // <lang><zh-CN>成功的外层diagnostics为空，不意味着工件没有warning或已获准公开。</zh-CN><en>Empty outer diagnostics on success do not mean artifacts lack warnings or have publication authority.</en></lang>
    const input = fixture(current);
    input.docSourceMap.diagnostics = [{ code: "SYNTHETIC_WARNING", severity: "warning", message: "SYNTHETIC_MAP_TEXT" }];
    input.docSourceMap.sources[0].sourcesContentPolicy = "redacted";
    input.docSourceMap.sources[0].sourcesContent = "SYNTHETIC_ALLOWED_BODY";
    input.bindingSidecars[0].diagnostics = [{ id: "synthetic:warning", code: "GDB_REF_UNRESOLVED", severity: "warning", message: "SYNTHETIC_SIDECAR_TEXT" }];
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.status).toBe(current ? "already-current" : "migrated");
    expect(result.diagnostics).toEqual([]);
    expect(result.bundle!.docSourceMap.diagnostics).toEqual(input.docSourceMap.diagnostics);
    expect(result.bundle!.bindingSidecars[0]!.diagnostics).toEqual(input.bindingSidecars[0].diagnostics);
    expect(JSON.stringify(result.bundle)).toContain("SYNTHETIC_ALLOWED_BODY");
    expect(result.bundle!.bindingSidecars[0]!.diagnostics).not.toBe(input.bindingSidecars[0].diagnostics);
  });
  it("copies wire values without hidden properties or original descriptors", () => {
    // <lang><zh-CN>复制的是可枚举JSON字段，不保留null原型/冻结状态或隐藏/Symbol扩展。</zh-CN><en>Clone enumerable JSON fields without retaining null prototypes, frozen state or hidden/symbol extensions.</en></lang>
    const input = fixture(current), extension = Object.create(null);
    Object.defineProperty(extension, "visible", { value: { count: 1 }, enumerable: true });
    Object.defineProperty(extension, "hidden", { value: "not-on-wire" });
    extension[Symbol("synthetic")] = "not-on-wire";
    input.bindingSidecars[0].adapterExtensions = Object.freeze(extension);
    const result = migrateGeneratedDocumentationBindingBundle(input), copy = result.bundle!.bindingSidecars[0]!.adapterExtensions as any;
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.keys(copy)).toEqual(["visible"]);
    expect(Object.getOwnPropertySymbols(copy)).toEqual([]);
    expect(Object.getOwnPropertyDescriptor(copy, "visible")).toMatchObject({ writable: true, configurable: true, enumerable: true });
    copy.visible.count = 2;
    expect(extension.visible.count).toBe(1);
  });
  it("uses sidecar input order rather than declaration order", () => {
    // <lang><zh-CN>声明完整覆盖身份，但不决定返回数组次序；第二工件显式给出独立路径和反向关联。</zh-CN><en>Declarations cover identities but do not determine output order; the second artifact has an explicit independent path and reverse association.</en></lang>
    const input = fixture(current), second = structuredClone(input.bindingSidecars[0]);
    second.id = "sidecar:second";
    second.docSourceMapLinkage.sidecarId = second.id;
    second.docSourceMapLinkage.sidecarPath = "dist/second.gdb.json";
    input.docSourceMap.generatedBindingSidecars.push({ id: second.id, contract: second.contract, contractVersion: second.contractVersion, path: second.docSourceMapLinkage.sidecarPath });
    input.docSourceMap.entries[0].generatedBindingRefs.push({ sidecarId: second.id, bindingId: "binding:synthetic" });
    input.bindingSidecars.unshift(second);
    const result = migrateGeneratedDocumentationBindingBundle(input);
    expect(result.bundle!.bindingSidecars.map(sidecar => sidecar.id)).toEqual(["sidecar:second", "sidecar:synthetic"]);
    expect((result.bundle!.docSourceMap.generatedBindingSidecars as any[]).map(sidecar => sidecar.id)).toEqual(["sidecar:synthetic", "sidecar:second"]);
  });
  it("drops wrapper extensions but still preflights the whole wrapper graph", () => {
    // <lang><zh-CN>未知wrapper字段不是输出扩展口；即使不输出也不能绕过普通JSON输入前提。</zh-CN><en>Unknown wrapper fields are not output extensions and cannot bypass ordinary-JSON preflight merely because they are omitted.</en></lang>
    const input = fixture(current);
    input.wrapperNote = { note: "synthetic ignored wrapper" };
    expect(Object.hasOwn(migrateGeneratedDocumentationBindingBundle(input).bundle!, "wrapperNote")).toBe(false);
    input.wrapperNote = { invalid: undefined };
    const refused = migrateGeneratedDocumentationBindingBundle(input);
    expect(refused.status).toBe("invalid");
    expect(Object.hasOwn(refused, "bundle")).toBe(false);
  });
  it("omits bundle atomically on invalid or unsupported input without body echo", () => {
    // <lang><zh-CN>保留合法path上下文但不返回局部工件；错误正文不能反射工件自由文本。</zh-CN><en>Retain valid path context without partial artifacts; fixed errors must not reflect artifact free text.</en></lang>
    const input = fixture(current);
    input.bindingSidecars[0].adapterExtensions = { note: "SYNTHETIC_PRIVATE_BODY" };
    input.bindingSidecars[0].docSourceMapLinkage.docSourceMapId = "missing";
    const before = JSON.stringify(input), result = migrateGeneratedDocumentationBindingBundle(input, { path: "C:\\synthetic\\context.json" });
    expect(result.status).toBe("invalid");
    expect(Object.keys(result).sort()).toEqual(["diagnostics", "status"]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ code: "GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID", severity: "error", targetPath: "C:\\synthetic\\context.json" });
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PRIVATE_BODY");
    expect(JSON.stringify(input)).toBe(before);
    input.docSourceMap.contractVersion = "1.0.1";
    const unsupported = migrateGeneratedDocumentationBindingBundle(input);
    expect(unsupported.status).toBe("unsupported-version");
    expect(Object.hasOwn(unsupported, "bundle")).toBe(false);
    expect(unsupported.diagnostics).toHaveLength(1);
  });
});

describe("binding validation path field", () => {
  it.each([undefined, "", "   ", "C:\\synthetic\\sidecar.json", "context/sidecar.json"])("preserves admitted context %j without normalization", path => {
    // <lang><zh-CN>显式undefined是运行预检行为；严格TypeScript的可选字段另有拒绝用例。</zh-CN><en>Explicit undefined characterizes runtime preflight; strict TypeScript optional fields have separate rejection cases.</en></lang>
    const options = { path } as any, diagnostics = validateGeneratedDocumentationBinding(null, options);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]!.targetPath).toBe(path || undefined);
    expect(diagnostics[0]!.path).toBe(path || undefined);
    expect(validateGeneratedDocumentationBinding(fixture(false).bindingSidecars[0], options)).toEqual([]);
  });
  it("keeps per-call context snapshots and independent writable diagnostics", () => {
    // <lang><zh-CN>后续改选项或首个诊断不会修改先前上下文或另一次调用。</zh-CN><en>Later option or diagnostic edits do not alter previous context or another call's result.</en></lang>
    const options = { path: "context/early.json" }, first = validateGeneratedDocumentationBinding(null, options);
    options.path = "context/late.json";
    const second = validateGeneratedDocumentationBinding(null, options);
    expect(first[0]!.targetPath).toBe("context/early.json");
    expect(second[0]!.targetPath).toBe("context/late.json");
    first[0]!.message = "caller edit";
    first.length = 0;
    expect(second).toHaveLength(1);
    expect(second[0]!.message).not.toBe("caller edit");
    expect(Object.isFrozen(second)).toBe(false);
  });
});
