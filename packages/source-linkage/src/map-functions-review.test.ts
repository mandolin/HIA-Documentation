/**
 * @file
 * @lang zh-CN 文档源码映射三个入口的组合责任特征，保留当前状态/被动声明/迁移边界，不重放旧输入专项。
 * @lang en Characterizes combined responsibilities of three documentation-map entries, retaining status/passive-declaration/migration boundaries without replaying prior input suites.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDocSourceMapIndex, validateDocSourceMap, migrateDocSourceMap, findDocSourceMapEntriesBySymbol } from "./index.js";

/** @lang zh-CN 独立解析公开历史样本，仅切换精确根版本，不调用被测迁移器构造输入。 @lang en Independently parses a public historical fixture, changing only the exact root version without using migration under test to create inputs. */
function fixture(version: string): any {
  const value = JSON.parse(readFileSync(new URL("../../../fixtures/contract-history/doc-source-map.json", import.meta.url), "utf8"));
  value.contractVersion = version;
  return value;
}
/** @lang zh-CN 老版本带范围升级需逐引用精度证据；测试用合成范围明示旧双端包含和UTF-16单位。 @lang en Upgrading an older ranged map requires per-reference evidence; the synthetic range explicitly declares inclusive endpoints and UTF-16 units. */
function migrateWithEvidence(input: any) {
  return migrateDocSourceMap(input, { rangeEvidence: [{ entryIndex: 0, sourceRefIndex: 0, rangeConvention: { endBoundary: "inclusive", columnUnit: "utf16-code-unit" } }] });
}

describe.each(["0.1.0-draft", "1.0.0"])("map function responsibilities %s", version => {
  it("keeps validator and index diagnostics equivalent but independently owned", () => {
    // <lang><zh-CN>validator复用索引算法；分别调用仍产生独立列表，输入不回写。</zh-CN><en>The validator uses the indexing algorithm; separate calls still own independent lists and never rewrite input.</en></lang>
    const input = fixture(version), before = JSON.stringify(input), options = { path: "context/map.json" };
    input.diagnostics = [{ code: "SYNTHETIC_WARNING", severity: "warning", message: "synthetic warning" }];
    const index = createDocSourceMapIndex(input, options), diagnostics = validateDocSourceMap(input, options);
    expect(diagnostics).toEqual(index.diagnostics);
    expect(diagnostics).not.toBe(index.diagnostics);
    diagnostics[0]!.message = "caller edit";
    expect(index.diagnostics[0]!.message).toBe("synthetic warning");
    input.diagnostics = [];
    expect(JSON.stringify(input)).toBe(before);
  });
  it("retains warning-level unresolved references without certifying complete closure", () => {
    // <lang><zh-CN>普通map未解析引用是warning，不冒充绑定整组的硬闭包认证。</zh-CN><en>Unresolved ordinary-map references are warnings, not proof of hard closure as required by binding bundles.</en></lang>
    const input = fixture(version);
    input.entries[0].sourceRefs[0].sourceId = "source:missing-synthetic";
    const index = createDocSourceMapIndex(input), result = migrateWithEvidence(input);
    expect(index.status).toBe("available");
    expect(index.diagnostics.some(item => item.code === "DOC_SOURCE_MAP_ENTRY_UNRESOLVED" && item.severity === "warning")).toBe(true);
    expect(result.status).toBe("migrated");
    expect(result.diagnostics.some(item => item.code === "DOC_SOURCE_MAP_ENTRY_UNRESOLVED")).toBe(true);
  });
  it("retains invalid metadata while status-gated queries and migration refuse", () => {
    // <lang><zh-CN>root error使状态invalid，但索引并非冻结空产物；查询与迁移须另行检查status。</zh-CN><en>A root error makes status invalid without guaranteeing an empty frozen index; queries/migration separately gate on status.</en></lang>
    const input = fixture(version);
    input.diagnostics = [{ code: "SYNTHETIC_ROOT_ERROR", severity: "error", message: "SYNTHETIC_PRIVATE_MESSAGE" }];
    const index = createDocSourceMapIndex(input), result = migrateWithEvidence(input);
    expect(index.status).toBe("invalid");
    expect(index.entryCount).toBe(1);
    expect(index.entries[0]!.symbolId).toBe("html:component:alert");
    expect(findDocSourceMapEntriesBySymbol(index, "html:component:alert")).toEqual([]);
    expect(result.status).toBe("invalid");
    expect(Object.hasOwn(result, "manifest")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC_PRIVATE_MESSAGE");
  });
  it("treats entry diagnostics as code metadata rather than root status errors", () => {
    // <lang><zh-CN>entry.diagnostics在既有模型中只投影code；不擅改为新的全局错误政策。</zh-CN><en>Existing entry.diagnostics project codes only; do not silently create a new global-error policy.</en></lang>
    const input = fixture(version);
    input.entries[0].diagnostics = [{ code: "SYNTHETIC_ENTRY", severity: "error", message: "synthetic entry text" }];
    const index = createDocSourceMapIndex(input), result = migrateWithEvidence(input);
    expect(index.status).toBe("available");
    expect(index.entries[0]!.diagnostics).toEqual(["SYNTHETIC_ENTRY"]);
    expect(index.diagnostics).toEqual([]);
    expect(result.status).toBe("migrated");
    expect((result.manifest!.entries as any[])[0].diagnostics).toEqual(input.entries[0].diagnostics);
  });
  it("preserves passive chain stages without executing or resolving their identities", () => {
    // <lang><zh-CN>chain字段只作已提供数据处理，不自动运行transform或加载stage.sourceMap。</zh-CN><en>Chain fields remain supplied data without executing transforms or loading stage.sourceMap.</en></lang>
    const input = fixture(version);
    input.chains = [{ id: "chain:passive", stages: [{ from: "source:external", to: "artifact:external", transform: "synthetic-not-executed", sourceMap: "missing-map", linkage: ["metadata-only"] }] }];
    expect(validateDocSourceMap(input)).toEqual([]);
    const result = migrateWithEvidence(input);
    expect(result.status).toBe("migrated");
    expect(result.manifest!.chains).toEqual(input.chains);
  });
  it("keeps external contract references passive and does not authenticate their versions", () => {
    // <lang><zh-CN>安全相对引用不触发文件读取，也不凭普通map认证外部契约版本。</zh-CN><en>Safe relative references trigger no file reads or external-contract version authentication through ordinary maps.</en></lang>
    const input = fixture(version);
    input.artifacts[0].contractRefs = [{ contract: "synthetic-external-contract", contractVersion: "99.0.0", path: "contracts/not-loaded.json" }];
    expect(createDocSourceMapIndex(input).status).toBe("available");
    const result = migrateWithEvidence(input);
    expect(result.status).toBe("migrated");
    expect((result.manifest!.artifacts as any[])[0].contractRefs).toEqual(input.artifacts[0].contractRefs);
  });
  it("does not load source-map pointers or infer their source closure", () => {
    // <lang><zh-CN>pointer仅要求对象，mapsFrom/mapsTo仅为声明文本；本入口不是普通map加载器。</zh-CN><en>Pointer requires an object and mapsFrom/mapsTo remain declaration text; this entry is not an ordinary-map loader.</en></lang>
    const input = fixture(version);
    input.sourceMaps = [{ id: "map:passive", kind: "ordinary-source-map", path: "maps/not-loaded.map", mapsFrom: "artifact:external", mapsTo: ["source:external"], pointer: { url: "https://synthetic.invalid/not-fetched" } }];
    const index = createDocSourceMapIndex(input), result = migrateWithEvidence(input);
    expect(index.status).toBe("available");
    expect(index.sourceMapCount).toBe(1);
    expect(Object.hasOwn(index.sourceMaps[0]!, "pointer")).toBe(false);
    expect(result.status).toBe("migrated");
    expect(result.manifest!.sourceMaps).toEqual(input.sourceMaps);
  });
  it("does not treat privacy flags as permission for absolute paths", () => {
    // <lang><zh-CN>声明true不会取消owner的安全相对路径边界。</zh-CN><en>Declaring true does not waive the owner's safe-relative-path boundary.</en></lang>
    const input = fixture(version);
    input.privacy.allowAbsolutePaths = true;
    input.privacy.allowUncPaths = true;
    input.privacy.allowPathTraversal = true;
    input.sources[0].path = "C:\\synthetic\\not-authorized.html";
    expect(createDocSourceMapIndex(input).status).toBe("invalid");
    expect(validateDocSourceMap(input).some(item => item.code === "DOC_SOURCE_MAP_UNSAFE_PATH")).toBe(true);
    expect(migrateDocSourceMap(input).status).toBe("invalid");
  });
});

describe("map entry compatibility distinctions", () => {
  it.each([false, true])("uses error precedence over unknown-version isolation, error=%s", error => {
    // <lang><zh-CN>未知版本可能只有warning仍不可查询；任何root error优先invalid。</zh-CN><en>An unknown version may produce only a warning yet remain unqueryable; any root error takes invalid precedence.</en></lang>
    const input = fixture("1.0.1");
    if (error) input.diagnostics = [{ code: "SYNTHETIC_ERROR", severity: "error", message: "synthetic error" }];
    const index = createDocSourceMapIndex(input), result = migrateDocSourceMap(input);
    expect(index.status).toBe(error ? "invalid" : "unsupported-version");
    expect(index.entryCount).toBe(1);
    expect(findDocSourceMapEntriesBySymbol(index, "html:component:alert")).toEqual([]);
    expect(index.diagnostics.filter(item => item.code === "DOC_SOURCE_MAP_UNSUPPORTED_VERSION").map(item => item.severity)).toEqual(["warning"]);
    expect(result.status).toBe(error ? "invalid" : "unsupported-version");
    expect(Object.hasOwn(result, "manifest")).toBe(false);
  });
  it("keeps legacy omission admission distinct from migration to current required structure", () => {
    // <lang><zh-CN>历史宽reader接纳不代表能补造新版必填项或成功迁移。</zh-CN><en>Permissive legacy admission does not authorize fabricating current required fields or promise migration success.</en></lang>
    const input = { contract: "doc-source-map", contractVersion: "0.1.0-draft", entries: [] };
    expect(createDocSourceMapIndex(input).status).toBe("available");
    expect(validateDocSourceMap(input)).toEqual([]);
    expect(migrateDocSourceMap(input).status).toBe("invalid");
  });
  it("requires coordination before upgrading either older binding pair", () => {
    // <lang><zh-CN>两代旧绑定关联均不能由单map独立换代。</zh-CN><en>Neither older binding association can be upgraded by a standalone map.</en></lang>
    for (const version of ["0.1.0-draft", "1.0.0"]) {
      const input = fixture(version), bindingVersion = version === "1.0.0" ? "0.2.0-draft" : "0.1.0-draft";
      input.generatedBindingSidecars = [{ id: "sidecar:passive", contract: "generated-documentation-binding", contractVersion: bindingVersion, path: "bindings/not-loaded.json" }];
      input.entries[0].generatedBindingRefs = [{ sidecarId: "sidecar:passive", bindingId: "binding:not-authenticated" }];
      expect(createDocSourceMapIndex(input).status).toBe("available");
      const result = migrateDocSourceMap(input);
      expect(result.status).toBe("invalid");
      expect(Object.hasOwn(result, "manifest")).toBe(false);
    }
  });
});
