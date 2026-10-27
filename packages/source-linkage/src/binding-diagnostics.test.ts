/**
 * @file
 * @lang zh-CN 绑定提取诊断传播反例：先验证后复制，冻结严重级别/顺序不变，error沿既有规则空拒绝并贯通查询/宿主/迁移。
 * @lang en Binding extraction-diagnostic regressions: validate before copying, preserve frozen severities/order, and propagate existing error refusal through queries, hosts and migration.
 */
import { describe, expect, it } from "vitest";
import input from "../../../fixtures/source-linkage/generated-binding-input.json";
import {
  createDocSourceMapIndex, createGeneratedDocumentationBindingIndex,
  createGeneratedDocumentationBindingHostProjection, validateGeneratedDocumentationBinding,
  migrateGeneratedDocumentationBindingBundle, findGeneratedTargetsForBinding,
  findGeneratedBindingsForTarget, findGeneratedBindingsForTargetSymbol,
  findGeneratedBindingsForDocSourceMapEntry
} from "./index.js";

/** @lang zh-CN 独立列出冻结的十个代码/严重级别，不能从实现目录反推期望。 @lang en Independently lists the ten frozen code/severity pairs rather than deriving expectations from implementation. */
const codes = [
  ["GDB_REF_SYNTAX_INVALID", "error"], ["GDB_REF_UNRESOLVED", "warning"],
  ["GDB_SCOPE_AMBIGUOUS", "warning"], ["GDB_EXPANSION_RUNTIME_ONLY", "info"],
  ["GDB_INSTANCE_KEY_MISSING", "warning"], ["GDB_INSTANCE_KEY_UNSTABLE", "info"],
  ["GDB_INSTANCE_KEY_DUPLICATE", "error"], ["GDB_TARGET_MISMATCH", "warning"],
  ["GDB_INHERITANCE_CONFLICT", "warning"], ["GDB_LOCALS_POLICY_VIOLATION", "error"]
] as const;

/** @lang zh-CN 复制公开合成配对，可选切换已确认的新版本配对，不共享可变输入。 @lang en Copies the public synthetic pair, optionally using the approved current versions, without sharing mutable inputs. */
function pair(current: boolean) {
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

/** @lang zh-CN 工厂上下文是调用者显式未脱敏路径，不来自诊断id/subjectId。 @lang en Factory context is an explicit unredacted caller path, not a diagnostic id/subjectId. */
function indexFor(value: ReturnType<typeof pair>) {
  return createGeneratedDocumentationBindingIndex(value.bindingSidecar, { docSourceMapIndex: createDocSourceMapIndex(value.documentMap), path: "context/binding.json" });
}

/** @lang zh-CN 合法提取记录含合成私有标签及允许未知扩展，传播必须仅取code/severity。 @lang en A valid extraction record includes synthetic private labels and permitted unknown extensions; propagation must take code/severity only. */
function extraction(code = "GDB_INSTANCE_KEY_UNSTABLE", severity = "info") {
  return { id: "diagnostic:PRIVATE-ID", code, severity, subjectId: "binding:PRIVATE-SUBJECT", message: "PRIVATE-MESSAGE", extensionPayload: "PRIVATE-EXTENSION" };
}

describe.each([false, true])("binding extraction diagnostics, current=%s", (current) => {
  it.each(codes)("propagates %s with frozen severity %s through all consumers", (code, severity) => {
    const value = pair(current);
    Object.assign(value.bindingSidecar, { diagnostics: [extraction(code, severity)] });
    const before = JSON.stringify(value);
    // <lang><zh-CN>结构合法与提取成功分开：validator不把合法error记录当结构错误。</zh-CN><en>Structural validity differs from extraction success: a legitimate error record is not a validator error.</en></lang>
    expect(validateGeneratedDocumentationBinding(value.bindingSidecar)).toEqual([]);
    const index = indexFor(value);
    const expectedStatus = severity === "error" ? "invalid" : "available";
    expect(index.status).toBe(expectedStatus);
    expect(index.diagnostics.map(({ code, severity }) => ({ code, severity }))).toEqual([{ code, severity }]);
    expect(index.diagnostics[0]!.targetPath).toBe("context/binding.json");
    expect(Object.isFrozen(index.diagnostics)).toBe(true);
    expect(Object.isFrozen(index.diagnostics[0])).toBe(true);
    expect(index.diagnostics[0]).not.toBe(value.bindingSidecar.diagnostics[0]);
    expect(index.bindingCount).toBe(severity === "error" ? 0 : 1);
    expect(index.expansionCount).toBe(severity === "error" ? 0 : 1);
    expect(index.targetCount).toBe(severity === "error" ? 0 : 1);
    for (const result of [findGeneratedTargetsForBinding(index, "binding:synthetic"), findGeneratedBindingsForTarget(index, "target:synthetic"), findGeneratedBindingsForTargetSymbol(index, "symbol:synthetic"), findGeneratedBindingsForDocSourceMapEntry(index, "entry:synthetic")]) expect(result).toHaveLength(severity === "error" ? 0 : 1);
    const projection = createGeneratedDocumentationBindingHostProjection(index);
    expect(projection.status).toBe(expectedStatus);
    expect(projection.diagnostics).toEqual([{ code, severity }]);
    expect(projection.summary.diagnosticCount).toBe(1);
    expect(projection.summary.bindingCount).toBe(severity === "error" ? 0 : 1);
    const migrated = migrateGeneratedDocumentationBindingBundle({ docSourceMap: value.documentMap, bindingSidecars: [value.bindingSidecar] });
    expect(migrated.status).toBe(severity === "error" ? "invalid" : current ? "already-current" : "migrated");
    expect(Object.hasOwn(migrated, "bundle")).toBe(severity !== "error");
    if (severity !== "error") expect(migrated.bundle!.bindingSidecars[0]!.diagnostics).toEqual(value.bindingSidecar.diagnostics);
    for (const marker of ["PRIVATE-ID", "PRIVATE-SUBJECT", "PRIVATE-MESSAGE", "PRIVATE-EXTENSION"]) {
      expect(JSON.stringify(index.diagnostics)).not.toContain(marker);
      expect(JSON.stringify(projection)).not.toContain(marker);
    }
    expect(JSON.stringify(value)).toBe(before);
    expect(Object.isFrozen(value.bindingSidecar)).toBe(false);
  });

  it("keeps upstream, extraction and linkage diagnostic order including duplicates", () => {
    const value = pair(current);
    Object.assign(value.documentMap, { diagnostics: [{ code: "SYNTHETIC_UPSTREAM", severity: "info", message: "PRIVATE-UPSTREAM" }] });
    Object.assign(value.bindingSidecar, { diagnostics: [extraction(), extraction("GDB_REF_UNRESOLVED", "warning"), extraction()] });
    value.documentMap.entries[0]!.generatedBindingRefs.push({ bindingId: "binding:unknown", sidecarId: "sidecar:synthetic" });
    const index = indexFor(value);
    expect(index.status).toBe("available");
    expect(index.diagnostics.map(({ code }) => code)).toEqual(["SYNTHETIC_UPSTREAM", "GDB_INSTANCE_KEY_UNSTABLE", "GDB_REF_UNRESOLVED", "GDB_INSTANCE_KEY_UNSTABLE", "GENERATED_DOCUMENTATION_BINDING_INDEX_ENTRY_BINDING_UNRESOLVED"]);
    expect(createGeneratedDocumentationBindingHostProjection(index).diagnostics).toEqual(index.diagnostics.map(({ code, severity }) => ({ code, severity })));
    expect(index.diagnostics[1]).not.toBe(index.diagnostics[3]);
  });

  it.each(["wrong-severity", "unknown-code", "wrong-id", "missing-code", "getter", "non-array", "null-item", "unknown-version"])("never propagates any extraction record after %s owner failure", (failure) => {
    const value = pair(current);
    const bad: Record<string, unknown> = extraction();
    let getterCalls = 0;
    if (failure === "wrong-severity") bad.severity = "error";
    if (failure === "unknown-code") bad.code = "GDB_PRIVATE_UNKNOWN";
    if (failure === "wrong-id") bad.id = 1;
    if (failure === "missing-code") delete bad.code;
    if (failure === "getter") Object.defineProperty(bad, "code", { enumerable: true, get() { getterCalls++; throw new Error("PRIVATE-EXCEPTION"); } });
    Object.assign(value.bindingSidecar, { diagnostics: [extraction(), failure === "null-item" ? null : bad] });
    if (failure === "non-array") Object.assign(value.bindingSidecar, { diagnostics: {} });
    if (failure === "unknown-version") {
      value.bindingSidecar.contractVersion = "99.0.0";
      value.bindingSidecar.compatibility.minimumConsumerContractVersion = "99.0.0";
      value.bindingSidecar.docSourceMapLinkage.contractVersion = "0.1.0-draft";
    }
    const index = indexFor(value);
    // <lang><zh-CN>未知绑定根同时无法满足三代精确反向配对，因此仍拒绝提取记录，状态按实际多项 owner 错误为 invalid。</zh-CN><en>An unknown binding root also cannot satisfy any of the three exact backlinks, so extraction records remain gated and the combined owner errors yield invalid.</en></lang>
    expect(index.status).toBe("invalid");
    expect(index.bindings).toEqual([]);
    expect(index.diagnostics.some(({ code }) => code.startsWith("GDB_"))).toBe(false);
    expect(index.diagnostics.length).toBeGreaterThan(0);
    expect(getterCalls).toBe(0);
    expect(JSON.stringify(index)).not.toContain("PRIVATE-EXCEPTION");
  });

  it.each(["invalid", "unsupported-version"])("retains validated extraction info with an %s prerequisite map", (state) => {
    const value = pair(current);
    Object.assign(value.bindingSidecar, { diagnostics: [extraction()] });
    if (state === "invalid") value.documentMap.sources[0]!.path = "../PRIVATE-SOURCE";
    else value.documentMap.contractVersion = "99.0.0";
    const index = indexFor(value);
    expect(index.status).toBe(state);
    expect(index.diagnostics.some(({ code }) => code === "GDB_INSTANCE_KEY_UNSTABLE")).toBe(true);
    expect(index.bindings).toEqual([]);
  });

  it("uses the existing error precedence over an unsupported prerequisite map", () => {
    const value = pair(current);
    Object.assign(value.bindingSidecar, { diagnostics: [extraction("GDB_REF_SYNTAX_INVALID", "error")] });
    value.documentMap.contractVersion = "99.0.0";
    const index = indexFor(value);
    expect(index.status).toBe("invalid");
    expect(index.diagnostics.some(({ code, severity }) => code === "GDB_REF_SYNTAX_INVALID" && severity === "error")).toBe(true);
    expect(index.bindingCount).toBe(0);
  });

  it("does not let an otherwise legal record bypass privacy rejection", () => {
    const value = pair(current);
    Object.assign(value.bindingSidecar, { diagnostics: [extraction()], extensionPayload: { secretValue: "PRIVATE-SECRET" } });
    const index = indexFor(value);
    expect(index.status).toBe("invalid");
    expect(index.diagnostics.some(({ code }) => code.startsWith("GDB_"))).toBe(false);
    expect(JSON.stringify(index)).not.toContain("PRIVATE-SECRET");
  });

  it("retains existing empty-diagnostic successful pairing and identities", () => {
    const index = indexFor(pair(current));
    expect(index.status).toBe("available");
    expect(index.diagnostics).toEqual([]);
    expect(index.bindings[0]!.id).toBe("binding:synthetic");
    expect(index.expansions[0]!.instanceKey.key).toBe("gdb-key/v1/string:synthetic");
    expect(findGeneratedTargetsForBinding(index, "binding:synthetic")[0]!.id).toBe("target:synthetic");
  });
});
