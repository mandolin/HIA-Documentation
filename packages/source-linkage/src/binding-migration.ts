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
import { prepareSourceLinkagePathOptions } from "./path-options.js";

/**
 * @lang zh-CN 显式整组内存容器的可写结构类型；Record/数组本身不认证版本、完整性或隐私。迁移入口另行接收unknown并验证完整旧/新配对，成功才返回独立当前组；不是磁盘事务或发布授权。未知wrapper字段不输出，但整个输入仍须通过普通JSON预检。
 * @lang en Writable structural type for an explicit in-memory artifact bundle; records/arrays alone certify neither versions, completeness nor privacy. The migration entry separately accepts unknown, validates a complete legacy/current pair and returns an independent current bundle on success. It is not a disk transaction or publication authority. Unknown wrapper fields are omitted from output, but the entire input still requires ordinary-JSON preflight.
 */
export interface GeneratedDocumentationBindingMigrationBundle {
  /**
   * @lang zh-CN 必填普通映射记录，字段值仍为unknown，类型不能证明contractVersion。factory成功输出为独立可写1.0.0图，绑定仅保留引用；获准源码正文、原诊断和JSON扩展仍可能保留，不代表公开安全。可枚举字符串键复制，不保留原型/描述符、隐藏/Symbol属性；同一映射内部共享保留，与输入/其它调用/sidecar副本无可变别名。
   * @lang en Required map record with unknown field values; its type does not prove contractVersion. Factory success supplies an independent writable 1.0.0 graph containing binding references only; permitted source bodies, raw diagnostics and JSON extensions may remain without public-safety guarantees. Enumerable string keys are copied, excluding original prototypes/descriptors and hidden/symbol properties; sharing within the map is retained, without mutable aliases to inputs, other calls or sidecar copies.
   */
  docSourceMap: Record<string, unknown>;
  /**
   * @lang zh-CN 必填可写记录数组，类型不证明成员完整/唯一或版本；运行时须完整对应映射声明。factory成功输出均为0.2.0-draft，保持输入数组顺序而非声明顺序；每个sidecar分别独立复制，内部共享保留，跨工件共享身份不保留。获准诊断/扩展保留，仍禁止源码/运行值等隐私字段；数组及嵌套记录可写，编辑后须重新验证。
   * @lang en Required writable record array whose type does not prove member completeness, uniqueness or versions; runtime members must exactly cover map declarations. Factory success returns 0.2.0-draft sidecars in input-array rather than declaration order; each sidecar is cloned independently, retaining internal sharing but not cross-artifact shared identity. Admitted diagnostics/extensions remain, while source/runtime-value privacy fields stay prohibited. Arrays and nested records remain writable and require revalidation after edits.
   */
  bindingSidecars: Record<string, unknown>[];
}
/** @lang zh-CN 普通可写结果interface，不是状态与bundle关联的判别联合；原子成功/拒绝形态由factory保证，人工构造或后续修改不具备同等证明。 @lang en Ordinary writable result interface, not a discriminated union tying status to bundle; the factory guarantees atomic success/refusal shapes, unlike manual construction or later edits. */
export interface GeneratedDocumentationBindingBundleMigrationResult {
  /** @lang zh-CN 四值可写状态：旧配对转换为migrated，当前配对复制为already-current，非法组为invalid，未识别的工件版本为unsupported-version。它是调用时观察；修改bundle/diagnostics不重算状态，也不能仅缩小status就推断bundle存在。 @lang en Writable four-literal status: migrated for legacy conversion, already-current for current-pair cloning, invalid for malformed bundles and unsupported-version for unrecognized artifact versions. It is a call-time observation; later bundle/diagnostic edits do not recompute it, and narrowing status alone does not prove bundle presence. */
  status: "migrated" | "already-current" | "invalid" | "unsupported-version";
  /** @lang zh-CN factory仅在两种成功状态提供自有完整新组；失败连自有bundle属性也省略，无局部产物。接口仍为可选字段，消费者须另查存在性及unknown内容；人工构造可不与status配套。复制/可写性遵循容器字段，调用者自行决定是否写出/公开，成功不是脱敏证明。 @lang en The factory supplies an own complete current bundle only for its two successful statuses; refusals omit even the own bundle property and return no partial artifacts. The interface field remains optional: consumers must separately check presence and unknown content, and manual construction need not match status. Cloning/mutability follow the container fields; callers decide whether to write/publish, without treating success as proof of sanitization. */
  bundle?: GeneratedDocumentationBindingMigrationBundle;
  /** @lang zh-CN 每次新建的可写诊断数组：成功为空，即使bundle工件内仍有获准warning/info或原文本；不汇总工件诊断。拒绝仅含一条固定GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID error，不回显被拒工件自由文本，但可保留合法且未脱敏的选项path。无输入/其它调用别名，编辑列表/诊断不更新status。 @lang en Fresh writable diagnostics per call: empty on success even when bundle artifacts retain admitted warnings/info or raw text; artifact diagnostics are not aggregated. Refusal contains one fixed GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID error without rejected artifact free text, but may retain a valid unsanitized options.path. No aliases to inputs or other calls; editing the list/diagnostics does not update status. */
  diagnostics: HiaDiagnostic[];
}

/**
 * @lang zh-CN 显式迁移普通映射与其全部绑定辅助工件，或为当前配对创建独立复制；不读路径、不执行表达式、不写磁盘。
 * @lang en Explicitly migrates a map and all declared binding sidecars, or independently clones a current pair, without path reads, expression execution or disk writes.
 * @param value <lang><zh-CN>普通JSON对象，包含docSourceMap与bindingSidecars数组；辅助工件须与声明完整一一对应，未知wrapper字段不输出。</zh-CN><en>Ordinary JSON object containing docSourceMap and bindingSidecars; sidecars must correspond completely and uniquely to declarations, while unknown wrapper fields are not output.</en></lang>
 * @param options <lang><zh-CN>普通/null原型自有string诊断路径，默认空；访问器/错型/反射失败用既有迁移INVALID拒绝且不回显路径，合法快照未脱敏。</zh-CN><en>Plain/null-prototype own string diagnostic path, empty by default; accessors/wrong types/reflection failures reject with existing migration INVALID and no path echo, while valid snapshots remain unsanitized.</en></lang>
 * @returns <lang><zh-CN>完整新组或固定诊断。保留JSON可序列化字段/扩展；不把迁移视为公开授权，不保证Proxy/资源/并发突变沙箱。</zh-CN><en>Complete new bundle or fixed diagnostics, retaining JSON-serializable fields/extensions without publication authority or proxy/resource/concurrent-mutation sandbox guarantees.</en></lang>
 */
export function migrateGeneratedDocumentationBindingBundle(value: unknown, options: DocSourceMapIndexOptions = {}): GeneratedDocumentationBindingBundleMigrationResult {
  // <lang><zh-CN>路径是非公开保证的诊断上下文；先复制，后续输入图/失败处理不再读原options。</zh-CN><en>The path is diagnostic context without public-safety guarantees; snapshot it before input-graph checks/failure handling.</en></lang>
  const preparedOptions = prepareSourceLinkagePathOptions(options);
  /** @lang zh-CN 失败只包含固定说明，不透传验证器中的调用者身份/正文。 @lang en Failures contain fixed explanations only, without forwarding caller identities/bodies from validators. */
  const refused = (message: string, status: "invalid" | "unsupported-version" = "invalid"): GeneratedDocumentationBindingBundleMigrationResult => ({ status, diagnostics: [createHiaDiagnostic("GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID", message, "error", preparedOptions?.path ? { targetPath: preparedOptions.path } : {})] });
  if (!preparedOptions) return refused("Migration options must contain an own string diagnostic path.");
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
