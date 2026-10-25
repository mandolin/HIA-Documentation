/**
 * @file
 * @lang zh-CN 生成式绑定整组纯内存迁移：先核完整旧/新配对，再复制、更新并复核，失败不返回局部产物。
 * @lang en Pure in-memory generated-binding bundle migration: validates complete legacy/current pairs before copying/updating/revalidating, with no partial outputs on failure.
 */
import { createHiaDiagnostic, type HiaDiagnostic } from "@hia-doc/core";
import { DOC_SOURCE_MAP_CONTRACT_VERSION, DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION } from "./constants.js";
import { createDocSourceMapIndex, type DocSourceMapIndexOptions } from "./index.js";
import { createGeneratedDocumentationBindingIndex } from "./generated-documentation-binding-index.js";
import { isDocSourceMapJsonDataGraph } from "./manifest-json-data.js";
import { cloneSourceLinkageJsonData, prepareDocSourceMapMigration } from "./manifest-migration.js";

/** @lang zh-CN 明确的整组内存产物，不是磁盘事务或发布授权；完整JSON字段可能仍包含调用者允许的内容。 @lang en Explicit in-memory artifact bundle, not a disk transaction or publication authority; complete JSON fields may retain caller-allowed content. */
export interface GeneratedDocumentationBindingMigrationBundle {
  /** @lang zh-CN 独立的当前1.0.0普通文档映射，只存绑定引用。 @lang en Independent current1.0.0 documentation map containing binding references only. */
  docSourceMap: Record<string, unknown>;
  /** @lang zh-CN 完整且独立的0.2.0-draft辅助工件，保持输入顺序。 @lang en Complete independent0.2.0-draft sidecars in input order. */
  bindingSidecars: Record<string, unknown>[];
}
/** @lang zh-CN 迁移状态与固定诊断；任何失败都没有bundle，不包含原始输入回显。 @lang en Migration status and fixed diagnostics; failures have no bundle or original-input echo. */
export interface GeneratedDocumentationBindingBundleMigrationResult {
  /** @lang zh-CN 旧配对转换为migrated，当前配对复制为already-current。 @lang en Legacy conversion yields migrated; current-pair cloning yields already-current. */
  status: "migrated" | "already-current" | "invalid" | "unsupported-version";
  /** @lang zh-CN 仅成功时提供完整新组；调用者自己决定写出/公开。 @lang en Complete new bundle on success only; callers decide whether to write/publish it. */
  bundle?: GeneratedDocumentationBindingMigrationBundle;
  /** @lang zh-CN 固定迁移错误，不复制原工件自由文本；工件内diagnostics原样保留在成功bundle。 @lang en Fixed migration errors without artifact free text; artifact diagnostics remain unchanged inside successful bundles. */
  diagnostics: HiaDiagnostic[];
}

/**
 * @lang zh-CN 显式迁移普通映射与其全部绑定辅助工件，或为当前配对创建独立复制；不读路径、不执行表达式、不写磁盘。
 * @lang en Explicitly migrates a map and all declared binding sidecars, or independently clones a current pair, without path reads, expression execution or disk writes.
 * @param value <lang><zh-CN>普通JSON对象，包含docSourceMap与bindingSidecars数组；辅助工件须与声明完整一一对应，未知wrapper字段不输出。</zh-CN><en>Ordinary JSON object containing docSourceMap and bindingSidecars; sidecars must correspond completely and uniquely to declarations, while unknown wrapper fields are not output.</en></lang>
 * @param options <lang><zh-CN>可选诊断路径上下文，不保证可公开。</zh-CN><en>Optional diagnostic-path context without a public-safety guarantee.</en></lang>
 * @returns <lang><zh-CN>完整新组或固定诊断。保留JSON可序列化字段/扩展；不把迁移视为公开授权，不保证Proxy/资源/并发突变沙箱。</zh-CN><en>Complete new bundle or fixed diagnostics, retaining JSON-serializable fields/extensions without publication authority or proxy/resource/concurrent-mutation sandbox guarantees.</en></lang>
 */
export function migrateGeneratedDocumentationBindingBundle(value: unknown, options: DocSourceMapIndexOptions = {}): GeneratedDocumentationBindingBundleMigrationResult {
  /** @lang zh-CN 失败只包含固定说明，不透传验证器中的调用者身份/正文。 @lang en Failures contain fixed explanations only, without forwarding caller identities/bodies from validators. */
  const refused = (message: string, status: "invalid" | "unsupported-version" = "invalid"): GeneratedDocumentationBindingBundleMigrationResult => ({ status, diagnostics: [createHiaDiagnostic("GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID", message, "error", options.path ? { targetPath: options.path } : {})] });
  try {
    if (!isDocSourceMapJsonDataGraph(value) || !record(value) || !record(value.docSourceMap) || !Array.isArray(value.bindingSidecars) || !value.bindingSidecars.every(record)) return refused("Migration requires an ordinary JSON mapping and an explicit sidecar array.");
    // <lang><zh-CN>精确版本检查先于消费，任何未知版本都不按范围或前缀猜测。</zh-CN><en>Check exact versions before consumption, never inferring compatibility from ranges or prefixes.</en></lang>
    const map = value.docSourceMap;
    const sidecars = value.bindingSidecars as Record<string, unknown>[];
    if (map.contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && map.contractVersion !== DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION) return refused("Mapping version is not explicitly supported for bundle migration.", "unsupported-version");
    if (sidecars.some((sidecar) => sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION && sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION)) return refused("Binding version is not explicitly supported for bundle migration.", "unsupported-version");
    if (!validBundle(map, sidecars)) return refused("Every declared sidecar and group-local reference must match a valid complete input pair.");

    // <lang><zh-CN>只有完整输入闭包通过后才启用内部协调准备；单映射公共API仍拒绝绑定关联。</zh-CN><en>Enable internal coordination preparation only after complete input closure; the standalone public API still rejects binding associations.</en></lang>
    const prepared = prepareDocSourceMapMigration(map, { coordinatedBindings: true });
    if (!prepared.manifest) return refused("Mapping provenance could not be migrated losslessly.");
    const migratedMap = prepared.manifest;
    const migratedSidecars = sidecars.map((sidecar) => cloneSourceLinkageJsonData(sidecar));
    // <lang><zh-CN>只更新已定义版本字段，不改身份、路径、locals契约或未知扩展文字。</zh-CN><en>Update defined version fields only, retaining identities, paths, the locals contract and unknown extension text.</en></lang>
    for (const declaration of Array.isArray(migratedMap.generatedBindingSidecars) ? migratedMap.generatedBindingSidecars as Record<string, unknown>[] : []) declaration.contractVersion = GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;
    for (const sidecar of migratedSidecars) {
      sidecar.contractVersion = GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;
      (sidecar.docSourceMapLinkage as Record<string, unknown>).contractVersion = DOC_SOURCE_MAP_CONTRACT_VERSION;
      (sidecar.compatibility as Record<string, unknown>).minimumConsumerContractVersion = GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;
    }
    if (!validBundle(migratedMap, migratedSidecars)) return refused("The complete migrated pair must satisfy current structure, privacy and local reference closure.");
    return { status: map.contractVersion === DOC_SOURCE_MAP_CONTRACT_VERSION ? "already-current" : "migrated", bundle: { docSourceMap: migratedMap, bindingSidecars: migratedSidecars }, diagnostics: [] };
  } catch {
    return refused("Binding bundle could not be copied and validated safely.");
  }
}

/** @lang zh-CN 核显式组内配对与引用闭包，不读取外部symbol工件、不推导表达式语义。 @lang en Checks explicit group-local pairing/reference closure without reading external symbol artifacts or inferring expression semantics. */
function validBundle(map: Record<string, unknown>, sidecars: Record<string, unknown>[]): boolean {
  // <lang><zh-CN>文档索引先检查路径/版本/隐私，sidecar个数与身份必须精确覆盖声明。</zh-CN><en>The document index first checks paths/versions/privacy; sidecar count and identities must exactly cover declarations.</en></lang>
  const index = createDocSourceMapIndex(map);
  if (index.status !== "available" || index.bindingSidecars.length !== sidecars.length) return false;
  const seen = new Set<unknown>();
  const sourceIds = new Set(records(map.sources).map((source) => source.id));
  const artifactIds = new Set(records(map.artifacts).map((artifact) => artifact.id));
  for (const sidecar of sidecars) {
    if (seen.has(sidecar.id)) return false;
    seen.add(sidecar.id);
    // <lang><zh-CN>组合器核实际版本/身份/路径；旧warning级未解析binding在迁移事务中也拒绝。</zh-CN><en>The composer checks actual versions/identities/paths; warning-level unresolved bindings also refuse the migration transaction.</en></lang>
    const bindingIndex = createGeneratedDocumentationBindingIndex(sidecar, { docSourceMapIndex: index });
    if (bindingIndex.status !== "available" || bindingIndex.diagnostics.some((diagnostic) => diagnostic.code === "GENERATED_DOCUMENTATION_BINDING_INDEX_ENTRY_BINDING_UNRESOLVED")) return false;
    for (const binding of records(sidecar.bindings)) {
      const intent = binding.sourceIntent as Record<string, unknown>;
      const scope = binding.scope as Record<string, unknown>;
      if (!sourceIds.has((intent.sourceRef as Record<string, unknown>).sourceId) || !sourceIds.has(scope.sourceId)) return false;
      for (const contribution of records((binding.composition as Record<string, unknown>).contributions)) if (!sourceIds.has((contribution.sourceRef as Record<string, unknown>).sourceId)) return false;
    }
    for (const target of records(sidecar.targets)) {
      const identity = target.identity as Record<string, unknown>;
      if (Object.hasOwn(identity, "artifactId") && !artifactIds.has(identity.artifactId)) return false;
    }
  }
  return true;
}
/** @lang zh-CN 已预检对象数组视图；外层已验证的形状不在此静默修复。 @lang en Object-array view after preflight, without silently repairing shapes validated by the outer boundary. */
function records(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter(record) : []; }
/** @lang zh-CN 普通JSON预检后的对象判断，不提供独立沙箱。 @lang en Object check after ordinary-JSON preflight, without an independent sandbox. */
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
