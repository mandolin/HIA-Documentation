/**
 * @file
 * @lang zh-CN 从本包已验证且未篡改的绑定索引，按既有白名单产生独立冻结的宿主关系摘要；不解析输入、不脱敏允许的身份字符串。
 * @lang en Produces detached frozen host relation summaries from this package's validated, untampered binding indexes under the existing allowlist; it neither parses inputs nor redacts permitted identity strings.
 */
import {
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION,
  type GeneratedDocumentationBindingContractVersion
} from "./constants.js";
import type {
  GeneratedDocumentationBindingIndex,
  GeneratedDocumentationBindingIndexedBinding,
  GeneratedDocumentationBindingIndexedExpansion,
  GeneratedDocumentationBindingIndexedTarget
} from "./generated-documentation-binding-index.js";

/**
 * @lang zh-CN 渲染器及IDE/DevTools共用的只读投影身份，与绑定sidecar身份独立。
 * @lang en Read-only projection identity shared by renderers and IDE/DevTools, independent of the binding sidecar identity.
 */
export const GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT =
  "generated-documentation-binding-host-projection";

/**
 * @lang zh-CN 宿主投影自身的首版草案；不跟随所消费sidecar版本自动升级。
 * @lang en The host projection's first draft version; it does not automatically track the consumed sidecar version.
 */
export const GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION =
  "0.1.0-draft";

/**
 * @lang zh-CN 给只读宿主的生成式文档绑定元数据白名单，运行时逐层冻结。
 * @lang en Generated-binding metadata allowlist for read-only hosts, frozen at every level at runtime.
 *
 * @remarks
 * <lang><zh-CN>只从本包工厂建立且未篡改的内存索引生成。遗漏正文/范围、sidecar路径、locals值/digest及诊断自由文本；允许身份字符串仍来自生产器，不代表内容已脱敏、可直接插入HTML或获得公开许可。类型属性未统一声明readonly，不影响工厂结果运行时冻结。</zh-CN><en>Generated only from untampered in-memory indexes created by this package's factory. Bodies/ranges, sidecar paths, locals values/digests and diagnostic free text are omitted. Permitted identity strings still originate with producers, implying neither redaction, safe HTML insertion nor publication permission. Type properties are not uniformly readonly; factory results remain frozen at runtime.</en></lang>
 */
export interface GeneratedDocumentationBindingHostProjection {
  /** @lang zh-CN 固定绑定契约名，不是对输入来源的认证。 @lang en Fixed binding contract name, not authentication of input origin. */
  bindingContract: typeof GENERATED_DOCUMENTATION_BINDING_CONTRACT;
  /** @lang zh-CN 实际受支持绑定版本；失败未知输入沿用旧安全元数据回退，不认证未知版本。 @lang en Actual supported binding version; failed unknown inputs retain the legacy safe-metadata fallback without authenticating unknown versions. */
  bindingContractVersion: GeneratedDocumentationBindingContractVersion;
  /** @lang zh-CN 按索引绑定顺序保留的独立冻结列表，工厂失败索引对应空列表。 @lang en Detached frozen list in index binding order, empty for factory-produced failed indexes. */
  bindings: readonly GeneratedDocumentationBindingHostBinding[];
  /** @lang zh-CN 固定宿主投影契约名。 @lang en Fixed host-projection contract name. */
  contract: typeof GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT;
  /** @lang zh-CN 投影自身的草案版本，独立于bindingContractVersion。 @lang en Projection draft version, independent of bindingContractVersion. */
  contractVersion: typeof GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION;
  /** @lang zh-CN 保留原诊断顺序和重复项，只复制code/severity。 @lang en Retains diagnostic order and duplicates, copying code/severity only. */
  diagnostics: readonly GeneratedDocumentationBindingHostDiagnostic[];
  /** @lang zh-CN 固定的字段遗漏声明，不是任意内容或宿主输出安全证明。 @lang en Fixed field-omission declarations, not proof of arbitrary content or host-output safety. */
  privacy: GeneratedDocumentationBindingHostProjectionPrivacy;
  /** @lang zh-CN 原索引非空sidecar身份；失败索引也可保留，不能当路径或版本认证。 @lang en Nonempty sidecar identity from the index; failed indexes may retain it, so it certifies neither a path nor version. */
  sidecarId?: string;
  /** @lang zh-CN 原工厂索引状态原样传播，不把不可用状态变成成功空结果。 @lang en Propagates the factory index status unchanged, never recasting unavailability as successful emptiness. */
  status: GeneratedDocumentationBindingIndex["status"];
  /** @lang zh-CN 绑定/诊断由本投影计数，其它总量来自同一索引，stable按全部展开统计。 @lang en Binding/diagnostic counts come from this projection; other totals come from the same index, with stable keys counted across all expansions. */
  summary: GeneratedDocumentationBindingHostProjectionSummary;
}

/** @lang zh-CN 一个上游意图及其一对多展开/目标关系，不携带源码定位信息。 @lang en One upstream intent and its one-to-many expansion/target relations, without source locations. */
export interface GeneratedDocumentationBindingHostBinding {
  /** @lang zh-CN 受限声明引用摘要，不是可执行表达式。 @lang en Restricted declaration-reference summary, not an executable expression. */
  bindingRef: {
    /** @lang zh-CN 已验证引用类别，原字符串保持。 @lang en Validated reference kind retained verbatim. */
    kind: string;
    /** @lang zh-CN 声明后的成员路径段，独立冻结；不执行属性访问。 @lang en Detached frozen member-path segments after the declaration; no property access is executed. */
    memberPath: readonly string[];
    /** @lang zh-CN 根声明的不透明身份，保留原内容。 @lang en Opaque root-declaration identity retained verbatim. */
    rootDeclarationId: string;
  };
  /** @lang zh-CN 组合策略摘要，只暴露贡献数而非贡献来源/覆盖上下文。 @lang en Composition summary exposing contribution counts rather than source/override contexts. */
  composition: {
    /** @lang zh-CN 原索引贡献身份列表长度，不是下游目标数量。 @lang en Length of indexed contribution identities, not the downstream target count. */
    contributionCount: number;
    /** @lang zh-CN 原合并策略标签，宿主不在此重新执行合并。 @lang en Original merge-policy label; hosts do not rerun composition here. */
    mergePolicy: string;
    /** @lang zh-CN 无关系/继承/组合标签，保持既有区别。 @lang en None/inheritance/composition label preserving existing distinctions. */
    relation: string;
  };
  /** @lang zh-CN 原绑定关联的文档条目身份，复制并冻结，无条目正文。 @lang en Copied frozen documentation-entry identities linked to the binding, without entry bodies. */
  docSourceMapEntryIds: readonly string[];
  /** @lang zh-CN 按全局展开列表中该绑定的出现顺序保留，不按order重新排序。 @lang en Expansions in their appearance order within the global index, not resorted by order. */
  expansions: readonly GeneratedDocumentationBindingHostExpansion[];
  /** @lang zh-CN 原绑定不透明身份。 @lang en Original opaque binding identity. */
  id: string;
  /** @lang zh-CN 绑定自己的三维质量，不用目标质量覆盖。 @lang en The binding's own three-dimensional quality, never replaced by target quality. */
  quality: GeneratedDocumentationBindingHostQuality;
  /** @lang zh-CN 仅保留scope身份，不包含sourceId、祖先或别名。 @lang en Scope identity alone, excluding sourceId, ancestry and aliases. */
  scopeId: string;
  /** @lang zh-CN 文档意图摘要，排除sourceRef、locale等未列出字段。 @lang en Documentation-intent summary excluding sourceRef, locale and all unlisted fields. */
  sourceIntent: {
    /** @lang zh-CN 非空字段标签才存在；缺省/空字符串不生成占位。 @lang en Present only for a nonempty field label; omissions/empty strings create no placeholder. */
    field?: string;
    /** @lang zh-CN 原上游文档意图类别。 @lang en Original upstream documentation-intent kind. */
    kind: string;
  };
  /** @lang zh-CN 按全局目标顺序关联的目标；共享目标在每个绑定下各有独立投影。 @lang en Related targets in global target order; shared targets have independent projections under each binding. */
  targets: readonly GeneratedDocumentationBindingHostTarget[];
}

/** @lang zh-CN 一个展开实例的元数据，不包含运行时locals。 @lang en Metadata for one expansion instance, excluding runtime locals. */
export interface GeneratedDocumentationBindingHostExpansion {
  /** @lang zh-CN 原展开不透明身份。 @lang en Original opaque expansion identity. */
  id: string;
  /** @lang zh-CN 实例键状态与可展示键，未验证来源的值不能直接构造本类型作为安全证明。 @lang en Instance-key state and display key; constructing this type from unverified values proves no safety. */
  instanceKey: {
    /** @lang zh-CN 仅privacySafe为真且原key非空时复制；unstable也可显示，不等同stable。 @lang en Copied only when privacySafe is true and the original key is nonempty; unstable keys may display too, without becoming stable. */
    displayKey?: string;
    /** @lang zh-CN 非空来源标签原样保留，不用于推断可信级别。 @lang en Nonempty origin label retained verbatim, without inferring trust. */
    origin?: string;
    /** @lang zh-CN 原索引的键隐私声明，不扩展为整投影公开许可。 @lang en The index's key-privacy declaration, not publication permission for the entire projection. */
    privacySafe: boolean;
    /** @lang zh-CN stable/unstable/missing状态原样保留。 @lang en Original stable/unstable/missing state retained. */
    status: string;
  };
  /** @lang zh-CN 原非负展开次序元数据；本投影不据此重排。 @lang en Original nonnegative expansion-order metadata; projection does not sort by it. */
  order: number;
  /** @lang zh-CN 展开自己的质量三维。 @lang en This expansion's own quality dimensions. */
  quality: GeneratedDocumentationBindingHostQuality;
  /** @lang zh-CN 原展开目标身份顺序的独立冻结副本。 @lang en Detached frozen copy of target identities in expansion order. */
  targetIds: readonly string[];
}

/** @lang zh-CN 下游目标的身份/质量摘要，不携带生成范围。 @lang en Downstream target identity/quality summary, excluding generated ranges. */
export interface GeneratedDocumentationBindingHostTarget {
  /** @lang zh-CN 目标经所有绑定关联的文档条目身份，可能超出当前外层绑定的条目。 @lang en Documentation-entry identities linked to the target through all bindings, potentially exceeding those of the enclosing binding. */
  docSourceMapEntryIds: readonly string[];
  /** @lang zh-CN 原目标不透明身份，不当作URL。 @lang en Original opaque target identity, not a URL. */
  id: string;
  /** @lang zh-CN 允许的目标身份标签，值未HTML转义或脱敏。 @lang en Permitted target identity labels, neither HTML-escaped nor redacted. */
  identity: {
    /** @lang zh-CN 非空工件身份才保留，不包含工件路径。 @lang en Retained only for a nonempty artifact identity, excluding its path. */
    artifactId?: string;
    /** @lang zh-CN 原目标类别。 @lang en Original target kind. */
    kind: string;
    /** @lang zh-CN 非空选择器标签，只作数据，不自动查询DOM。 @lang en Nonempty selector label as data, without automatically querying the DOM. */
    selector?: string;
    /** @lang zh-CN 非空文档符号身份；投影不解析外部文档验证其存在。 @lang en Nonempty documentation-symbol identity; projection does not resolve external documents to verify it. */
    symbolId?: string;
  };
  /** @lang zh-CN 目标自己的质量三维。 @lang en This target's own quality dimensions. */
  quality: GeneratedDocumentationBindingHostQuality;
}

/** @lang zh-CN 三个独立质量维度原样投影，不重新推断或混同generated-only与resolution。 @lang en Three independent quality dimensions copied without reinference or conflating generated-only provenance with resolution. */
export interface GeneratedDocumentationBindingHostQuality {
  /** @lang zh-CN 原confidence标签，与resolution配对由上游owner验证。 @lang en Original confidence label, paired with resolution by the upstream owner validator. */
  confidence: string;
  /** @lang zh-CN source-only/source-and-generated/generated-only来源覆盖标签。 @lang en Source-only/source-and-generated/generated-only provenance-coverage label. */
  provenanceCoverage: string;
  /** @lang zh-CN exact/inferred/ambiguous/unresolved解析类别。 @lang en Exact/inferred/ambiguous/unresolved resolution kind. */
  resolutionKind: string;
}

/** @lang zh-CN 诊断的code/severity白名单，排除message、targetPath、data及未知扩展。 @lang en Diagnostic code/severity allowlist excluding message, targetPath, data and unknown extensions. */
export interface GeneratedDocumentationBindingHostDiagnostic {
  /** @lang zh-CN 原诊断代码，保持顺序与重复项，不按代码重新生成文本。 @lang en Original diagnostic code preserving order and duplicates, without regenerating free text. */
  code: string;
  /** @lang zh-CN 原严重级别，不把warning升级或降级来改变索引状态。 @lang en Original severity, never promoted/demoted to change index status. */
  severity: "error" | "warning" | "info";
}

/** @lang zh-CN 工厂固定输出的六项遗漏声明，不扫描允许字符串的内容。 @lang en Six fixed omission declarations emitted by the factory, without scanning permitted string contents. */
export interface GeneratedDocumentationBindingHostProjectionPrivacy {
  /** @lang zh-CN 诊断自由文本字段不会复制。 @lang en Diagnostic free-text fields are never copied. */
  diagnosticFreeTextIncluded: false;
  /** @lang zh-CN 不包含locals值或digest。 @lang en Locals values/digests are excluded. */
  localsValueIncluded: false;
  /** @lang zh-CN 不包含sidecar路径；sidecarId仍是允许的身份。 @lang en Sidecar paths are excluded; sidecarId remains a permitted identity. */
  sidecarPathIncluded: false;
  /** @lang zh-CN 不包含上游或下游源码正文。 @lang en Neither upstream nor downstream source bodies are included. */
  sourceBodyIncluded: false;
  /** @lang zh-CN 不包含来源/目标范围。 @lang en Source/target ranges are excluded. */
  sourceRangeIncluded: false;
  /** @lang zh-CN 宿主投影固定不嵌入源码，不修改原映射策略。 @lang en Host projection never embeds source content and does not change the original map policy. */
  sourcesContentPolicy: "none";
}

/** @lang zh-CN 宿主计数摘要，共享目标/条目按全局索引计数而非嵌套副本相加。 @lang en Host counters count shared targets/entries globally rather than summing nested copies. */
export interface GeneratedDocumentationBindingHostProjectionSummary {
  /** @lang zh-CN 当前投影绑定列表长度。 @lang en Length of this projection's binding list. */
  bindingCount: number;
  /** @lang zh-CN 当前投影诊断列表长度，包含重复项。 @lang en Length of this projection's diagnostic list, including duplicates. */
  diagnosticCount: number;
  /** @lang zh-CN 原索引全局展开总量。 @lang en Global expansion total from the index. */
  expansionCount: number;
  /** @lang zh-CN 原索引关联到任意绑定的唯一文档条目总量。 @lang en Indexed total of unique documentation entries linked to any binding. */
  linkedDocSourceMapEntryCount: number;
  /** @lang zh-CN 原全局展开中status严格为stable的数量，不依赖displayKey呈现。 @lang en Count of global expansions whose status is exactly stable, independent of displayKey rendering. */
  stableInstanceKeyCount: number;
  /** @lang zh-CN 原索引唯一目标总量，共享目标只计一次。 @lang en Indexed unique target total, counting shared targets once. */
  targetCount: number;
  /** @lang zh-CN 原索引没有关联文档条目的绑定数量。 @lang en Indexed number of bindings without linked documentation entries. */
  unlinkedBindingCount: number;
}

/**
 * @lang zh-CN 将本包的只读绑定索引转成渲染器及IDE共用的独立冻结关系投影。
 * @lang en Converts this package's read-only binding index into a detached frozen relation projection shared by renderers and IDEs.
 *
 * @remarks
 * <lang><zh-CN>不读取文件/路径、不执行表达式/locals、不写workspace。工厂失败索引返回空关系与原状态/诊断摘要；未知绑定版本只保留旧元数据回退，不认证其兼容性。按每绑定筛选全局展开/目标，时间复杂度O(B×(E+T))；本API不验证任意输入或保护Proxy/资源/并发篡改。</zh-CN><en>Reads no files/paths, executes no expressions/locals and writes no workspace data. Factory-produced failed indexes yield empty relations and original status/diagnostic summaries; unknown binding versions retain legacy metadata fallback without certifying compatibility. Filtering global expansions/targets per binding costs O(B×(E+T)); this API does not validate arbitrary input or sandbox proxies, resources or concurrent mutation.</en></lang>
 * @param index <lang><zh-CN>createGeneratedDocumentationBindingIndex返回且未篡改的索引，不接受原始JSON替代。</zh-CN><en>An untampered result of createGeneratedDocumentationBindingIndex, not a raw JSON substitute.</en></lang>
 * @returns <lang><zh-CN>所有容器独立且冻结的字段白名单；输入不改写，允许字符串未脱敏，宿主需上下文编码及公开复核。</zh-CN><en>A field allowlist with every container detached and frozen; inputs are unchanged, permitted strings remain unredacted, and hosts must apply contextual encoding and publication review.</en></lang>
 * @throws <lang><zh-CN>调用方违反索引前提时可出现访问/迭代异常；本函数不将其转换为诊断。</zh-CN><en>Access/iteration exceptions may escape when callers violate index preconditions; this function does not convert them into diagnostics.</en></lang>
 */
export function createGeneratedDocumentationBindingHostProjection(
  index: GeneratedDocumentationBindingIndex
): GeneratedDocumentationBindingHostProjection {
  // <lang><zh-CN>两张临时关联表只保存当前调用的已验证引用，不修改或持久化索引。</zh-CN><en>Two temporary relation maps hold validated references for this call without changing or persisting the index.</en></lang>
  const expansionsByBindingId = new Map<string, GeneratedDocumentationBindingIndexedExpansion[]>();
  // <lang><zh-CN>共享目标在多个绑定下可重复出现，后续分别构造独立投影。</zh-CN><en>Shared targets may appear under multiple bindings; independent projections are built later.</en></lang>
  const targetsByBindingId = new Map<string, GeneratedDocumentationBindingIndexedTarget[]>();

  // <lang><zh-CN>按全局输入顺序筛选关联，不用order排序或重新运行解析/组合。</zh-CN><en>Filter relations in global input order without sorting by order or rerunning parsing/composition.</en></lang>
  for (const binding of index.bindings) {
    expansionsByBindingId.set(
      binding.id,
      index.expansions.filter((expansion) => expansion.bindingId === binding.id)
    );
    targetsByBindingId.set(
      binding.id,
      index.targets.filter((target) => target.bindingIds.includes(binding.id))
    );
  }

  // <lang><zh-CN>每个绑定显式选取公开字段，禁止把scope/sourceRef/贡献上下文整体展开。</zh-CN><en>Each binding explicitly selects public fields, never spreading full scopes, sourceRefs or contribution contexts.</en></lang>
  const bindings = index.bindings.map((binding) => freezeBindingProjection(
    binding,
    expansionsByBindingId.get(binding.id) ?? [],
    targetsByBindingId.get(binding.id) ?? []
  ));
  // <lang><zh-CN>诊断仅复制code/severity并保持顺序/重复项，message/data/路径不进入宿主。</zh-CN><en>Copy diagnostic code/severity only, retaining order/duplicates while excluding message/data/paths.</en></lang>
  const diagnostics = index.diagnostics.map((diagnostic) => Object.freeze({
    code: diagnostic.code,
    severity: diagnostic.severity
  }));
  // <lang><zh-CN>混合使用投影长度与原全局计数，不能把共享目标的嵌套副本累加。</zh-CN><en>Combine projection lengths with indexed global totals; never sum nested copies of shared targets.</en></lang>
  const summary = Object.freeze({
    bindingCount: bindings.length,
    diagnosticCount: diagnostics.length,
    expansionCount: index.expansionCount,
    linkedDocSourceMapEntryCount: index.linkedDocSourceMapEntryCount,
    stableInstanceKeyCount: index.expansions.filter((expansion) => expansion.instanceKey.status === "stable").length,
    targetCount: index.targetCount,
    unlinkedBindingCount: index.unlinkedBindingCount
  });

  // <lang><zh-CN>最终所有容器逐层冻结；版本回退仅供不可用结果元数据，不改变原status。</zh-CN><en>Freeze every final container individually; version fallback describes unavailable-result metadata without changing status.</en></lang>
  return Object.freeze({
    bindingContract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    bindingContractVersion: index.contractVersion === GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION ? GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION : GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION,
    bindings: freezeList(bindings),
    contract: GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT,
    contractVersion: GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION,
    diagnostics: freezeList(diagnostics),
    privacy: Object.freeze({
      diagnosticFreeTextIncluded: false as const,
      localsValueIncluded: false as const,
      sidecarPathIncluded: false as const,
      sourceBodyIncluded: false as const,
      sourceRangeIncluded: false as const,
      sourcesContentPolicy: "none" as const
    }),
    ...(index.sidecarId ? { sidecarId: index.sidecarId } : {}),
    status: index.status,
    summary
  });
}

/** @lang zh-CN 复制一个绑定及已关联展开/目标；排除来源、祖先、贡献正文和未列字段。 @lang en Copies one binding with related expansions/targets, excluding source locations, ancestry, contribution bodies and unlisted fields. */
function freezeBindingProjection(
  binding: GeneratedDocumentationBindingIndexedBinding,
  expansions: readonly GeneratedDocumentationBindingIndexedExpansion[],
  targets: readonly GeneratedDocumentationBindingIndexedTarget[]
): GeneratedDocumentationBindingHostBinding {
  // <lang><zh-CN>每个嵌套对象/数组均新建，避免暴露原索引引用或未知扩展。</zh-CN><en>Create every nested object/array anew, exposing neither original index references nor unknown extensions.</en></lang>
  return Object.freeze({
    bindingRef: Object.freeze({
      kind: binding.bindingRef.kind,
      memberPath: freezeList(binding.bindingRef.memberPath),
      rootDeclarationId: binding.bindingRef.rootDeclarationId
    }),
    composition: Object.freeze({
      contributionCount: binding.composition.contributionIds.length,
      mergePolicy: binding.composition.mergePolicy,
      relation: binding.composition.relation
    }),
    docSourceMapEntryIds: freezeList(binding.docSourceMapEntryIds),
    expansions: freezeList(expansions.map(freezeExpansionProjection)),
    id: binding.id,
    quality: freezeQuality(binding.resolution),
    scopeId: binding.scope.id,
    sourceIntent: Object.freeze({
      ...(binding.sourceIntent.field ? { field: binding.sourceIntent.field } : {}),
      kind: binding.sourceIntent.kind
    }),
    targets: freezeList(targets.map(freezeTargetProjection))
  });
}

/** @lang zh-CN 复制展开状态/质量和目标身份；只显示声明privacySafe且非空的key，不将unstable算stable。 @lang en Copies expansion state/quality and target identities; displays nonempty declared privacy-safe keys without treating unstable as stable. */
function freezeExpansionProjection(
  expansion: GeneratedDocumentationBindingIndexedExpansion
): GeneratedDocumentationBindingHostExpansion {
  // <lang><zh-CN>已验证键仅作本次读取视图，后续输出独立对象，不保留此引用。</zh-CN><en>The validated key is a local read view only; output uses an independent object and retains no reference.</en></lang>
  const instanceKey = expansion.instanceKey;
  // <lang><zh-CN>可显示与稳定性是不同条件；origin非空时保留，missing仍可声明unavailable。</zh-CN><en>Displayability and stability differ; retain nonempty origin, including unavailable for missing keys.</en></lang>
  return Object.freeze({
    id: expansion.id,
    instanceKey: Object.freeze({
      ...(instanceKey.privacySafe && instanceKey.key ? { displayKey: instanceKey.key } : {}),
      ...(instanceKey.origin ? { origin: instanceKey.origin } : {}),
      privacySafe: instanceKey.privacySafe,
      status: instanceKey.status
    }),
    order: expansion.order,
    quality: freezeQuality(expansion.resolution),
    targetIds: freezeList(expansion.targetIds)
  });
}

/** @lang zh-CN 复制目标身份/质量及全局关联条目，明确遗漏identity.range。 @lang en Copies target identity/quality and globally linked entries, explicitly omitting identity.range. */
function freezeTargetProjection(
  target: GeneratedDocumentationBindingIndexedTarget
): GeneratedDocumentationBindingHostTarget {
  // <lang><zh-CN>非空可选标签保持原字符串；不将selector解释为DOM查询或对值做脱敏。</zh-CN><en>Retain nonempty optional labels verbatim, without interpreting selectors as DOM queries or redacting values.</en></lang>
  return Object.freeze({
    docSourceMapEntryIds: freezeList(target.docSourceMapEntryIds),
    id: target.id,
    identity: Object.freeze({
      ...(target.identity.artifactId ? { artifactId: target.identity.artifactId } : {}),
      kind: target.identity.kind,
      ...(target.identity.selector ? { selector: target.identity.selector } : {}),
      ...(target.identity.symbolId ? { symbolId: target.identity.symbolId } : {})
    }),
    quality: freezeQuality(target.resolution)
  });
}

/** @lang zh-CN 独立复制三个质量标签，不用任一维推断另一维。 @lang en Independently copies all three quality labels without inferring one dimension from another. */
function freezeQuality(
  value: GeneratedDocumentationBindingIndexedBinding["resolution"]
): GeneratedDocumentationBindingHostQuality {
  return Object.freeze({
    confidence: value.confidence,
    provenanceCoverage: value.provenanceCoverage,
    resolutionKind: value.resolutionKind
  });
}

/** @lang zh-CN 复制并浅冻结列表；对象项必须先由各投影函数独立构造和冻结。 @lang en Copies and shallow-freezes a list; object members must first be detached and frozen by their projection functions. */
function freezeList<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}
