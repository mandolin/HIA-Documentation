/**
 * @file
 * @lang zh-CN 生成式绑定整组纯内存迁移：精确核三代配对，默认保留已公开配对，显式升级才改为新版，失败不返回局部产物。
 * @lang en Pure in-memory generated-binding bundle migration: validates three exact pairs, preserves published pairs by default and upgrades only on request, with no partial outputs on failure.
 */
import { createHiaDiagnostic, type HiaDiagnostic } from "@hia-doc/core";
import { DOC_SOURCE_MAP_CONTRACT_VERSION, DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION, DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION, DOC_SOURCE_MAP_END_BOUNDARIES, DOC_SOURCE_MAP_COLUMN_UNITS, GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION, type DocSourceMapRangeConvention } from "./constants.js";
import { createDocSourceMapIndex, type DocSourceMapIndexOptions } from "./index.js";
import { createGeneratedDocumentationBindingIndex } from "./generated-documentation-binding-index.js";
import { isDocSourceMapJsonDataGraph } from "./manifest-json-data.js";
import { cloneSourceLinkageJsonData, prepareDocSourceMapMigration, snapshotDocSourceMapRangeEvidence, type DocSourceMapMigrationPreparationOptions, type DocSourceMapRangeEvidence } from "./manifest-migration.js";
import { prepareSourceLinkagePathOptions } from "./path-options.js";

/**
 * @lang zh-CN 绑定整组迁移的自有数据选项；默认旧草案升到已公开0.2/1.0配对，已公开配对独立复制。只有显式指定0.3目标才进入1.1范围约定，旧带范围引用须逐项提供证据。
 * @lang en Own-data options for bundle migration. By default, legacy drafts advance to the published 0.2/1.0 pair while published pairs are copied independently. Only an explicit 0.3 target enters the 1.1 range convention, requiring per-reference evidence for older ranged references.
 */
export interface GeneratedDocumentationBindingBundleMigrationOptions extends DocSourceMapIndexOptions {
  /** @lang zh-CN 唯一可显式请求的升级目标；省略时按输入代际保持已公开配对。 @lang en The only explicit upgrade target; omission preserves the published pair appropriate to the input generation. */
  targetVersion?: typeof GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;
  /** @lang zh-CN 显式升级到0.3时旧映射每个带范围sourceRef的原数组序号与范围约定；多余、冲突或缺失均拒绝。 @lang en Original array ordinals and conventions for each older ranged map sourceRef when upgrading to 0.3; surplus, conflicting or missing evidence refuses the whole bundle. */
  rangeEvidence?: readonly DocSourceMapRangeEvidence[];
  /** @lang zh-CN 旧绑定每个带范围sourceIntent或contribution引用的独立约定证据；索引基于原sidecar/binding/contribution数组。 @lang en Independent convention evidence for each ranged old binding sourceIntent or contribution reference, indexed by the original sidecar/binding/contribution arrays. */
  bindingRangeEvidence?: readonly GeneratedBindingRangeEvidence[];
}

/** @lang zh-CN 两类旧绑定引用共享的原数组序号与范围约定，不能以sourceId代替。 @lang en Original array ordinals and convention shared by both old binding reference kinds, never replaced by sourceId. */
interface GeneratedBindingRangeEvidenceCoordinates {
  /** @lang zh-CN 输入bindingSidecars数组的零基序号。 @lang en Zero-based ordinal in the input bindingSidecars array. */
  sidecarIndex: number;
  /** @lang zh-CN 该sidecar的bindings数组零基序号。 @lang en Zero-based ordinal in that sidecar's bindings array. */
  bindingIndex: number;
  /** @lang zh-CN 可核实的终点与列单位；unknown需显式声明。 @lang en Verified endpoint and column unit; unknown must be explicit. */
  rangeConvention: DocSourceMapRangeConvention;
}
/** @lang zh-CN 精确定位旧绑定源码引用的外部证据：主意图禁止贡献序号，贡献引用必须带序号；不从映射工件相似坐标推断。 @lang en External evidence for an exact old binding source reference: sourceIntent forbids contribution ordinals and contributions require one, without inference from similar map coordinates. */
export type GeneratedBindingRangeEvidence = GeneratedBindingRangeEvidenceCoordinates & (
  { /** @lang zh-CN 主源码意图引用。 @lang en Main source-intent reference. */ kind: "sourceIntent"; contributionIndex?: never }
  | { /** @lang zh-CN 组合贡献源码引用。 @lang en Composition contribution source reference. */ kind: "contribution"; /** @lang zh-CN 原贡献数组零基序号。 @lang en Original zero-based contribution ordinal. */ contributionIndex: number }
);

/**
 * @lang zh-CN 显式整组内存容器的可写结构类型；Record/数组本身不认证版本、完整性或隐私。迁移入口另行接收unknown并验证三代精确配对，成功才返回独立目标组；不是磁盘事务或发布授权。未知wrapper字段不输出，但整个输入仍须通过普通JSON预检。
 * @lang en Writable structural type for an explicit in-memory artifact bundle; records/arrays alone certify neither versions, completeness nor privacy. The migration entry separately accepts unknown, validates one of three exact pairs and returns an independent target bundle on success. It is not a disk transaction or publication authority. Unknown wrapper fields are omitted from output, but the entire input still requires ordinary-JSON preflight.
 */
export interface GeneratedDocumentationBindingMigrationBundle {
  /**
   * @lang zh-CN 必填普通映射记录，字段值仍为unknown，类型不能证明contractVersion。成功输出为独立可写1.0.0或1.1.0图，绑定仅保留引用；获准源码正文、原诊断和JSON扩展仍可能保留，不代表公开安全。可枚举字符串键复制，不保留原型/描述符、隐藏/Symbol属性；同一映射内部共享保留，与输入/其它调用/sidecar副本无可变别名。
   * @lang en Required map record with unknown field values; its type does not prove contractVersion. Success supplies an independent writable 1.0.0 or 1.1.0 graph containing binding references only; permitted source bodies, raw diagnostics and JSON extensions may remain without public-safety guarantees. Enumerable string keys are copied, excluding original prototypes/descriptors and hidden/symbol properties; sharing within the map is retained, without mutable aliases to inputs, other calls or sidecar copies.
   */
  docSourceMap: Record<string, unknown>;
  /**
   * @lang zh-CN 必填可写记录数组，类型不证明成员完整/唯一或版本；运行时须完整对应映射声明。成功输出为0.2.0-draft或0.3.0-draft，保持输入数组顺序而非声明顺序；每个sidecar分别独立复制，内部共享保留，跨工件共享身份不保留。获准诊断/扩展保留，仍禁止源码/运行值等隐私字段；数组及嵌套记录可写，编辑后须重新验证。
   * @lang en Required writable record array whose type does not prove member completeness, uniqueness or versions; runtime members must exactly cover map declarations. Success returns 0.2.0-draft or 0.3.0-draft sidecars in input-array rather than declaration order; each sidecar is cloned independently, retaining internal sharing but not cross-artifact shared identity. Admitted diagnostics/extensions remain, while source/runtime-value privacy fields stay prohibited. Arrays and nested records remain writable and require revalidation after edits.
   */
  bindingSidecars: Record<string, unknown>[];
}
/** @lang zh-CN 普通可写结果interface，不是状态与bundle关联的判别联合；原子成功/拒绝形态由factory保证，人工构造或后续修改不具备同等证明。 @lang en Ordinary writable result interface, not a discriminated union tying status to bundle; the factory guarantees atomic success/refusal shapes, unlike manual construction or later edits. */
export interface GeneratedDocumentationBindingBundleMigrationResult {
  /** @lang zh-CN 四值可写状态：实际升级为migrated、原配对独立复制为already-current、非法组为invalid、未知工件/目标版本为unsupported-version。它是调用时观察；修改bundle/diagnostics不重算状态，也不能仅缩小status就推断bundle存在。 @lang en Writable four-literal status: migrated for an actual upgrade, already-current for independent same-pair copying, invalid for malformed bundles and unsupported-version for unknown artifact/target versions. It is a call-time observation; later edits do not recompute status, and narrowing status alone does not prove bundle presence. */
  status: "migrated" | "already-current" | "invalid" | "unsupported-version";
  /** @lang zh-CN factory仅在两种成功状态提供自有完整目标组；失败连自有bundle属性也省略，无局部产物。接口仍为可选字段，消费者须另查存在性及unknown内容；人工构造可不与status配套。复制/可写性遵循容器字段，调用者自行决定是否写出/公开，成功不是脱敏证明。 @lang en The factory supplies an own complete target bundle only for its two successful statuses; refusals omit even the own bundle property and return no partial artifacts. The interface field remains optional: consumers must separately check presence and unknown content, and manual construction need not match status. Cloning/mutability follow the container fields; callers decide whether to write/publish, without treating success as proof of sanitization. */
  bundle?: GeneratedDocumentationBindingMigrationBundle;
  /** @lang zh-CN 每次新建的可写诊断数组：成功为空，即使bundle工件内仍有获准warning/info或原文本；不汇总工件诊断。拒绝仅含一条固定GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID error，不回显被拒工件自由文本，但可保留合法且未脱敏的选项path。无输入/其它调用别名，编辑列表/诊断不更新status。 @lang en Fresh writable diagnostics per call: empty on success even when bundle artifacts retain admitted warnings/info or raw text; artifact diagnostics are not aggregated. Refusal contains one fixed GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID error without rejected artifact free text, but may retain a valid unsanitized options.path. No aliases to inputs or other calls; editing the list/diagnostics does not update status. */
  diagnostics: HiaDiagnostic[];
}

/**
 * @lang zh-CN 显式迁移普通映射与其全部绑定辅助工件，或为已公开配对创建独立复制；不读路径、不执行表达式、不写磁盘。
 * @lang en Explicitly migrates a map and all declared binding sidecars, or independently clones a published pair, without path reads, expression execution or disk writes.
 * @remarks
 * @lang zh-CN 校验顺序为选项证据快照/完整JSON图、三代精确配对、组内闭包、独立复制/已定义版本更新、完整结果复核。映射无绑定声明/引用时显式空sidecar集合合法。闭包覆盖组内声明/绑定/展开/目标和已提供source/artifact身份，但不读取外部symbol、不按scopeId推导词法真实性，也不执行扩展文本；schema中adapterExtensions对象约束由owner落实。旧来源只能按已确认精确表转换，未知来源拒绝。显式升新版时旧映射和旧绑定带范围引用分别需要逐项约定证据。未知wrapper字段不输出，获准工件扩展/诊断保持；不是完整schema引擎或提取/发布成功证明。
 * @lang en Checks option evidence snapshots/whole JSON graph, three exact pairings, group-local closure, independent cloning/defined version updates and the complete result in that order. An explicit empty sidecar set is valid when the map has no binding declarations/references. Closure covers group-local declarations/bindings/expansions/targets and supplied source/artifact identities, without loading external symbols, inferring lexical truth from scopeId or executing extension text; the owner enforces schema-declared adapterExtensions object constraints. Legacy provenance converts only through the approved exact table, refusing unknown origins. Explicit upgrade to the new pair requires separate per-reference convention evidence for older ranged map and binding references. Unknown wrapper fields are omitted, admitted artifact extensions/diagnostics remain, and this is neither a complete schema engine nor proof of extraction/publication success.
 * @param value <lang><zh-CN>普通JSON对象，包含docSourceMap与bindingSidecars数组；辅助工件须与声明完整一一对应，未知wrapper字段不输出。</zh-CN><en>Ordinary JSON object containing docSourceMap and bindingSidecars; sidecars must correspond completely and uniquely to declarations, while unknown wrapper fields are not output.</en></lang>
 * @param options <lang><zh-CN>普通/null原型的自有数据选项：string诊断路径、可选0.3目标与两类逐引用证据；访问器/错型/反射失败用固定INVALID拒绝且不回显路径，合法快照未脱敏。</zh-CN><en>Own-data options on a plain/null-prototype record: string diagnostic path, optional 0.3 target and both per-reference evidence sets; accessors/wrong types/reflection failures produce fixed INVALID without reflecting the path, while valid snapshots remain unsanitized.</en></lang>
 * @returns <lang><zh-CN>完整目标组或固定诊断。保留JSON可序列化字段/扩展；不把迁移视为公开授权，不保证Proxy/资源/并发突变沙箱。</zh-CN><en>Complete target bundle or fixed diagnostics, retaining JSON-serializable fields/extensions without publication authority or proxy/resource/concurrent-mutation sandbox guarantees.</en></lang>
 */
export function migrateGeneratedDocumentationBindingBundle(value: unknown, options: GeneratedDocumentationBindingBundleMigrationOptions = {}): GeneratedDocumentationBindingBundleMigrationResult {
  // <lang><zh-CN>路径是非公开保证的诊断上下文；先复制，后续输入图/失败处理不再读原options。</zh-CN><en>The path is diagnostic context without public-safety guarantees; snapshot it before input-graph checks/failure handling.</en></lang>
  const preparedOptions = prepareSourceLinkagePathOptions(options);
  /** @lang zh-CN 失败只包含固定说明，不透传验证器中的调用者身份/正文。 @lang en Failures contain fixed explanations only, without forwarding caller identities/bodies from validators. */
  const refused = (message: string, status: "invalid" | "unsupported-version" = "invalid"): GeneratedDocumentationBindingBundleMigrationResult => ({ status, diagnostics: [createHiaDiagnostic("GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID", message, "error", preparedOptions?.path ? { targetPath: preparedOptions.path } : {})] });
  if (!preparedOptions) return refused("Migration options must contain an own string diagnostic path.");
  try {
    // <lang><zh-CN>仅一次读取自有数据描述符；不调用升级目标或两类外部证据的getter。</zh-CN><en>Read own data descriptors once, never invoking getters for the target or either external evidence set.</en></lang>
    const targetDescriptor = Object.getOwnPropertyDescriptor(options, "targetVersion");
    const mapEvidenceDescriptor = Object.getOwnPropertyDescriptor(options, "rangeEvidence");
    const bindingEvidenceDescriptor = Object.getOwnPropertyDescriptor(options, "bindingRangeEvidence");
    if ([targetDescriptor, mapEvidenceDescriptor, bindingEvidenceDescriptor].some((descriptor) => descriptor && !Object.hasOwn(descriptor, "value"))) return refused("Migration options must contain own data values, not accessors.");
    const requestedTarget = targetDescriptor?.value;
    const mapRangeEvidence = mapEvidenceDescriptor?.value;
    const bindingRangeEvidence = bindingEvidenceDescriptor?.value;
    if (requestedTarget !== undefined && requestedTarget !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) return refused("Binding migration target version is not explicitly supported.", "unsupported-version");
    if ((mapRangeEvidence !== undefined || bindingRangeEvidence !== undefined) && requestedTarget !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) return refused("Range evidence requires an explicit current binding target.");
    // <lang><zh-CN>在反射输入工件前把两类证据完整复制，输入Proxy不能随后更换选项或嵌套约定。</zh-CN><en>Clone both evidence sets before reflecting the artifact graph, so input proxies cannot later swap options or nested conventions.</en></lang>
    const preparedMapEvidence = snapshotDocSourceMapRangeEvidence(mapRangeEvidence);
    const preparedBindingEvidence = snapshotBindingRangeEvidence(bindingRangeEvidence);
    if (!preparedMapEvidence || !preparedBindingEvidence) return refused("Range evidence must contain ordinary, unique, closed-field data.");
    if (!isDocSourceMapJsonDataGraph(value) || !record(value) || !record(value.docSourceMap) || !Array.isArray(value.bindingSidecars) || !value.bindingSidecars.every(record)) return refused("Migration requires an ordinary JSON mapping and an explicit sidecar array.");
    // <lang><zh-CN>精确版本检查先于消费，任何未知版本都不按范围或前缀猜测。</zh-CN><en>Check exact versions before consumption, never inferring compatibility from ranges or prefixes.</en></lang>
    const map = value.docSourceMap;
    const sidecars = value.bindingSidecars as Record<string, unknown>[];
    if (map.contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && map.contractVersion !== DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION && map.contractVersion !== DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION) return refused("Mapping version is not explicitly supported for bundle migration.", "unsupported-version");
    if (sidecars.some((sidecar) => sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION && sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION && sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION)) return refused("Binding version is not explicitly supported for bundle migration.", "unsupported-version");
    // <lang><zh-CN>先拒绝混配，再让索引验证声明、引用与身份闭包；空sidecar组由映射版本决定代际。</zh-CN><en>Reject mixed generations before index validation of declarations, references and identities; map version selects an empty sidecar set's generation.</en></lang>
    const inputBindingVersion = map.contractVersion === DOC_SOURCE_MAP_CONTRACT_VERSION ? GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
      : map.contractVersion === DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION ? GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION : GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION;
    if (sidecars.some((sidecar) => sidecar.contractVersion !== inputBindingVersion)) return refused("Mapping and binding versions must form an exact published pair.");
    if (!validBundle(map, sidecars)) return refused("Every declared sidecar and group-local reference must match a valid complete input pair.");

    // <lang><zh-CN>旧草案默认迁至前一公开组；前一公开组默认原配对复制。显式新版目标才消耗逐引用精度证据。</zh-CN><en>Legacy drafts default to the prior published pair; that pair copies by default. Only an explicit new target consumes per-reference precision evidence.</en></lang>
    const targetBindingVersion = requestedTarget === GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION || map.contractVersion === DOC_SOURCE_MAP_CONTRACT_VERSION
      ? GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION : GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION;
    const targetMapVersion = targetBindingVersion === GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION ? DOC_SOURCE_MAP_CONTRACT_VERSION : DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION;
    const mapOptions: DocSourceMapMigrationPreparationOptions = { coordinatedBindings: true, targetVersion: targetMapVersion };
    mapOptions.rangeEvidence = preparedMapEvidence;
    const prepared = prepareDocSourceMapMigration(map, mapOptions);
    if (!prepared.manifest) return refused("Mapping provenance could not be migrated losslessly.");
    const migratedMap = prepared.manifest;
    const migratedSidecars = sidecars.map((sidecar) => cloneSourceLinkageJsonData(sidecar));
    // <lang><zh-CN>只更新已定义版本字段，不改身份、路径、locals契约或未知扩展文字。</zh-CN><en>Update defined version fields only, retaining identities, paths, the locals contract and unknown extension text.</en></lang>
    for (const declaration of Array.isArray(migratedMap.generatedBindingSidecars) ? migratedMap.generatedBindingSidecars as Record<string, unknown>[] : []) declaration.contractVersion = targetBindingVersion;
    for (const sidecar of migratedSidecars) {
      sidecar.contractVersion = targetBindingVersion;
      (sidecar.docSourceMapLinkage as Record<string, unknown>).contractVersion = targetMapVersion;
      (sidecar.compatibility as Record<string, unknown>).minimumConsumerContractVersion = targetBindingVersion;
    }
    if (targetBindingVersion === GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
      && !applyBindingRangeEvidence(migratedSidecars, inputBindingVersion, preparedBindingEvidence)) return refused("Every older ranged binding reference requires its own explicit convention evidence.");
    if (!validBundle(migratedMap, migratedSidecars)) return refused("The complete migrated pair must satisfy target structure, privacy and local reference closure.");
    return { status: map.contractVersion === targetMapVersion ? "already-current" : "migrated", bundle: { docSourceMap: migratedMap, bindingSidecars: migratedSidecars }, diagnostics: [] };
  } catch {
    return refused("Binding bundle could not be copied and validated safely.");
  }
}

/**
 * @lang zh-CN 在工件反射前完整投影绑定范围证据，拒绝非普通JSON、重复序号和多余字段；返回的表不共享调用方对象。
 * @lang en Projects binding-range evidence before artifact reflection, rejecting nonordinary JSON, duplicate ordinals and extra fields; the returned map shares no caller objects.
 * @param rawEvidence <lang><zh-CN>未知可选证据数组。</zh-CN><en>Unknown optional evidence array.</en></lang>
 * @returns <lang><zh-CN>独立键值表；undefined表示原子拒绝，空表表示未提供证据。</zh-CN><en>Independent key-value map; undefined means atomic refusal, while an empty map means no evidence was supplied.</en></lang>
 */
function snapshotBindingRangeEvidence(rawEvidence: unknown): Map<string, DocSourceMapRangeConvention> | undefined {
  if (rawEvidence !== undefined && (!Array.isArray(rawEvidence) || !isDocSourceMapJsonDataGraph(rawEvidence))) return undefined;
  const evidence = new Map<string, DocSourceMapRangeConvention>();
  for (const raw of (rawEvidence ?? []) as unknown[]) {
    if (!record(raw)) return undefined;
    const kind = raw.kind;
    if (kind !== "sourceIntent" && kind !== "contribution") return undefined;
    const expectedFields = kind === "sourceIntent" ? "bindingIndex,kind,rangeConvention,sidecarIndex" : "bindingIndex,contributionIndex,kind,rangeConvention,sidecarIndex";
    if (!hasExactEnumerableFields(raw, expectedFields)) return undefined;
    if (!Number.isSafeInteger(raw.sidecarIndex) || (raw.sidecarIndex as number) < 0 || !Number.isSafeInteger(raw.bindingIndex) || (raw.bindingIndex as number) < 0) return undefined;
    if (kind === "contribution" && (!Number.isSafeInteger(raw.contributionIndex) || (raw.contributionIndex as number) < 0)) return undefined;
    const convention = raw.rangeConvention;
    if (!record(convention) || !hasExactEnumerableFields(convention, "columnUnit,endBoundary")) return undefined;
    if (!(DOC_SOURCE_MAP_END_BOUNDARIES as readonly unknown[]).includes(convention.endBoundary) || !(DOC_SOURCE_MAP_COLUMN_UNITS as readonly unknown[]).includes(convention.columnUnit)) return undefined;
    const key = `${raw.sidecarIndex}:${raw.bindingIndex}:${kind}:${kind === "contribution" ? raw.contributionIndex : ""}`;
    if (evidence.has(key)) return undefined;
    evidence.set(key, { endBoundary: convention.endBoundary as DocSourceMapRangeConvention["endBoundary"], columnUnit: convention.columnUnit as DocSourceMapRangeConvention["columnUnit"] });
  }
  return evidence;
}

/**
 * @lang zh-CN 把逐项外部约定证据应用到已复制的新版绑定引用；旧组每个sourceIntent与contribution都需独立证据，新组不得借多余证据重解释。
 * @lang en Applies per-reference external convention evidence to cloned current binding references; each old sourceIntent and contribution needs independent evidence, while current bundles refuse surplus reinterpretation evidence.
 * @param sidecars <lang><zh-CN>已独立复制的完整辅助工件，失败时由调用者整体丢弃。</zh-CN><en>Complete independently cloned sidecars, discarded wholesale by the caller on failure.</en></lang>
 * @param inputVersion <lang><zh-CN>已通过配对验证的原绑定版本。</zh-CN><en>Input binding version after exact-pair validation.</en></lang>
 * @param evidence <lang><zh-CN>已独立快照的序号到约定映射，函数会逐项消耗。</zh-CN><en>Independently snapshotted ordinal-to-convention map, consumed per reference by this function.</en></lang>
 * @returns <lang><zh-CN>证据完整且无冲突时为true；不读取磁盘或推断端点。</zh-CN><en>True only for complete nonconflicting evidence, without disk reads or endpoint inference.</en></lang>
 */
function applyBindingRangeEvidence(sidecars: Record<string, unknown>[], inputVersion: string, evidence: Map<string, DocSourceMapRangeConvention>): boolean {
  if (inputVersion === GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) return evidence.size === 0;
  // <lang><zh-CN>每条旧绑定引用都必须从对应原数组索引消费一条证据；不按sourceId、坐标或map内容猜测。</zh-CN><en>Each old binding reference consumes evidence at its original array ordinal, never guessing from sourceId, coordinates or map content.</en></lang>
  for (const [sidecarIndex, sidecar] of sidecars.entries()) {
    for (const [bindingIndex, binding] of records(sidecar.bindings).entries()) {
      const intent = binding.sourceIntent as Record<string, unknown>;
      if (!applyBindingReferenceConvention(intent.sourceRef as Record<string, unknown>, `${sidecarIndex}:${bindingIndex}:sourceIntent:`, evidence)) return false;
      const composition = binding.composition as Record<string, unknown>;
      for (const [contributionIndex, contribution] of records(composition.contributions).entries()) {
        if (!applyBindingReferenceConvention(contribution.sourceRef as Record<string, unknown>, `${sidecarIndex}:${bindingIndex}:contribution:${contributionIndex}`, evidence)) return false;
      }
    }
  }
  return evidence.size === 0;
}

/** @lang zh-CN 单个旧引用仅消费精确匹配的约定证据；冲突的旧扩展不静默覆盖。 @lang en A single old reference consumes only its exact evidence; conflicting legacy extensions are never silently overwritten. */
function applyBindingReferenceConvention(reference: Record<string, unknown>, key: string, evidence: Map<string, DocSourceMapRangeConvention>): boolean {
  const convention = evidence.get(key);
  if (!convention) return false;
  if (Object.hasOwn(reference, "rangeConvention")) {
    const previous = reference.rangeConvention;
    if (!record(previous) || !hasExactEnumerableFields(previous, "columnUnit,endBoundary")
      || previous.endBoundary !== convention.endBoundary || previous.columnUnit !== convention.columnUnit) return false;
  }
  reference.rangeConvention = convention;
  evidence.delete(key);
  return true;
}

/** @lang zh-CN 证据字段必须全部是可枚举字符串自有数据键，隐藏字段与Symbol也拒绝，避免验证与JSON投影分歧。 @lang en Evidence fields must be exactly enumerable own string keys; hidden fields and symbols also refuse, preventing validation/JSON projection drift. */
function hasExactEnumerableFields(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(",") === expected
    && Object.getOwnPropertyNames(value).sort().join(",") === expected
    && Object.getOwnPropertySymbols(value).length === 0;
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
