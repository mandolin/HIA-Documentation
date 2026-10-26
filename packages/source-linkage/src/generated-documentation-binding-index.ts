/**
 * @file
 * @lang zh-CN 绑定与文档映射的只读双向组合索引；选项及已消费头部独立投影，嵌套前置数据须来自未篡改工厂索引。
 * @lang en Read-only bidirectional binding/map composition index; independently projects options/consumed headers while nested prerequisite data must come from an untampered factory index.
 */
import { prepareSourceLinkagePathOptions } from "./path-options.js";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaSourceRange
} from "@hia-doc/core";
import {
  DOC_SOURCE_MAP_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION
} from "./constants.js";
import {
  validateGeneratedDocumentationBinding
} from "./generated-documentation-binding.js";
import type {
  DocSourceMapIndex,
  DocSourceMapIndexedEntry
} from "./index.js";

/**
 * @lang zh-CN 建立生成式绑定只读双向索引的自有数据选项；前置索引需保持未篡改。
 * @lang en Own-data options for read-only generated-binding bidirectional indexing; prerequisite indexes must remain untampered.
 *
 * @remarks
 * 中文：调用方必须显式先建立 doc-source-map index；本模块不读取 sidecar path、
 * 不访问文件系统，也不执行 adapter expression 或 locals。
 * English: Callers must explicitly create the doc-source-map index first. This
 * module neither reads sidecar paths nor accesses the filesystem, and it never
 * executes adapter expressions or locals.
 */
export interface GeneratedDocumentationBindingIndexOptions {
  /** @lang zh-CN 必需自有数据引用，来自本包工厂且嵌套数组/条目未篡改；头部检查不是来源认证。 @lang en Required own-data reference from this package's factory with untampered nested arrays/entries; header checks do not authenticate origin. */
  docSourceMapIndex: DocSourceMapIndex;
  /** @lang zh-CN 可选自有string诊断上下文，原空/空白行为保持且未脱敏。 @lang en Optional own string diagnostic context retaining prior empty/whitespace behavior and remaining unsanitized. */
  path?: string;
}

/** @lang zh-CN 仅包含实际消费头部的内部视图；数组借用而非深复制/认证。 @lang en Internal view containing consumed headers only; arrays are borrowed rather than deeply copied/authenticated. */
type BindingDocSourceMapView = Pick<DocSourceMapIndex, "contract" | "contractVersion" | "id" | "status" | "diagnostics" | "entries" | "bindingSidecars" | "entryCount">;

/**
 * @lang zh-CN 本包生成的中性绑定双向元数据索引；节点与列表冻结，失败结果无关系。
 * @lang en Neutral bidirectional binding metadata index created by this package, with frozen nodes/lists and no relations on failure.
 * @remarks <lang><zh-CN>需保持工厂结果未篡改。诊断列表冻结，但继承的诊断记录未统一深冻结；本索引含来源身份/范围，不是宿主公开安全投影或原工件的保真副本。</zh-CN><en>Factory results must remain untampered. The diagnostic list is frozen, but inherited diagnostic records are not uniformly deep-frozen. This index carries source identities/ranges and is neither a public-safe host projection nor a lossless artifact copy.</en></lang>
 */
export interface GeneratedDocumentationBindingIndex {
  /** @lang zh-CN 规范化绑定数量；失败索引为零。 @lang en Number of normalized bindings, zero for failed indexes. */
  bindingCount: number;
  /** @lang zh-CN 按sidecar声明顺序的冻结绑定列表，查询可借用其节点。 @lang en Frozen bindings in sidecar declaration order; queries may borrow these nodes. */
  bindings: readonly GeneratedDocumentationBindingIndexedBinding[];
  /** @lang zh-CN 固定绑定契约名，不认证输入来源。 @lang en Fixed binding contract name, not input-origin authentication. */
  contract: typeof GENERATED_DOCUMENTATION_BINDING_CONTRACT;
  /** @lang zh-CN 原输入自有非空版本标签，失败时也可能未知或省略，不是兼容证明。 @lang en Original own nonempty version label, potentially unknown/omitted on failure, not proof of compatibility. */
  contractVersion?: string;
  /** @lang zh-CN 映射、owner校验、验证通过的提取及联接诊断，按阶段/原顺序保留重复项；提取仅复制code/severity与固定正文，不复制id/subjectId/扩展。任意error使关系为空。 @lang en Map, owner-validation, validated extraction and linkage diagnostics in stage/input order with duplicates; extraction copies only code/severity and fixed text, excluding id/subjectId/extensions. Any error empties relations. */
  diagnostics: readonly HiaDiagnostic[];
  /** @lang zh-CN 可用索引所配映射的全部条目数，不限于有关联的条目；失败为零。 @lang en All entries in the paired map for an available index, not just linked entries; zero on failure. */
  docSourceMapEntryCount: number;
  /** @lang zh-CN 规范化全局展开数量，非目标数量。 @lang en Global normalized expansion count, not a target count. */
  expansionCount: number;
  /** @lang zh-CN 按原声明顺序的冻结展开列表，不按order排序。 @lang en Frozen expansions in original declaration order, never sorted by order. */
  expansions: readonly GeneratedDocumentationBindingIndexedExpansion[];
  /** @lang zh-CN 关联任一绑定的唯一文档条目数，同条目跨绑定仅计一次。 @lang en Unique documentation entries linked to any binding, counted once across bindings. */
  linkedDocSourceMapEntryCount: number;
  /** @lang zh-CN 原sidecar非空身份，失败时也可保留；不是路径或信任信号。 @lang en Original nonempty sidecar identity, possibly retained on failure; neither a path nor trust signal. */
  sidecarId?: string;
  /** @lang zh-CN 既有可用/非法/不支持版本状态；只有available携带可消费关系。 @lang en Existing available/invalid/unsupported-version state; only available carries consumable relations. */
  status: "available" | "invalid" | "unsupported-version";
  /** @lang zh-CN 全局规范化目标数，共享目标按身份只计一次。 @lang en Global normalized target count, counting shared identities once. */
  targetCount: number;
  /** @lang zh-CN 按sidecar目标声明顺序的冻结列表，可含无展开引用的声明目标。 @lang en Frozen targets in sidecar declaration order, potentially including declared targets with no expansion references. */
  targets: readonly GeneratedDocumentationBindingIndexedTarget[];
  /** @lang zh-CN 无文档条目关联的绑定数量，不等于无目标绑定数。 @lang en Bindings without linked documentation entries, not bindings without targets. */
  unlinkedBindingCount: number;
}

/**
 * @lang zh-CN 绑定的索引摘要，保留来源/scope及有序关系边，不执行引用。
 * @lang en Indexed binding summary retaining source/scope and ordered relation edges without executing references.
 */
export interface GeneratedDocumentationBindingIndexedBinding {
  /** @lang zh-CN 原语言适配器身份。 @lang en Original language-adapter identity. */
  adapterId: string;
  /** @lang zh-CN 声明/成员路径摘要，不是可执行表达式。 @lang en Declaration/member-path summary, not an executable expression. */
  bindingRef: GeneratedDocumentationBindingReference;
  /** @lang zh-CN 组合策略与贡献身份摘要，无贡献正文或覆盖上下文。 @lang en Composition policy/contribution-identity summary without contribution bodies or override contexts. */
  composition: GeneratedDocumentationBindingComposition;
  /** @lang zh-CN 按映射条目遍历顺序收集并去重的条目身份。 @lang en Entry identities collected and deduplicated in map-entry traversal order. */
  docSourceMapEntryIds: readonly string[];
  /** @lang zh-CN 按全局展开遍历顺序收集的展开身份。 @lang en Expansion identities collected in global expansion traversal order. */
  expansionIds: readonly string[];
  /** @lang zh-CN 原绑定不透明身份，字符串原样保留。 @lang en Original opaque binding identity retained verbatim. */
  id: string;
  /** @lang zh-CN 绑定自身的三个独立质量维度。 @lang en The binding's own three independent quality dimensions. */
  resolution: GeneratedDocumentationBindingResolution;
  /** @lang zh-CN 结构化作用域摘要，不包含别名列表。 @lang en Structured scope summary excluding aliases. */
  scope: GeneratedDocumentationBindingScope;
  /** @lang zh-CN 意图类别/字段及来源身份/范围摘要，不保留locale或未知扩展。 @lang en Intent kind/field and source identity/range summary without locale or unknown extensions. */
  sourceIntent: GeneratedDocumentationBindingSourceIntent;
  /** @lang zh-CN 展开边首次出现顺序去重的目标身份，不是目标声明顺序。 @lang en Target identities deduplicated in first-seen expansion-edge order, not target declaration order. */
  targetIds: readonly string[];
}

/**
 * @lang zh-CN 声明与生成目标之间的一个展开实例，保留原次序和独立质量维度。
 * @lang en One expansion between a declaration and generated targets, retaining original order and independent quality dimensions.
 */
export interface GeneratedDocumentationBindingIndexedExpansion {
  /** @lang zh-CN 原所属绑定身份。 @lang en Original owning binding identity. */
  bindingId: string;
  /** @lang zh-CN 原展开身份。 @lang en Original expansion identity. */
  id: string;
  /** @lang zh-CN 原实例键状态/值/来源及隐私声明，不运行实例表达式。 @lang en Original key state/value/origin and privacy declaration, without evaluating instance expressions. */
  instanceKey: GeneratedDocumentationBindingInstanceKey;
  /** @lang zh-CN 原非负安全整数次序元数据，列表不据此重排。 @lang en Original nonnegative safe-integer order metadata, never used to reorder the list. */
  order: number;
  /** @lang zh-CN 展开自身的质量三维。 @lang en This expansion's own quality dimensions. */
  resolution: GeneratedDocumentationBindingResolution;
  /** @lang zh-CN 原展开scope身份，不推导文件系统位置。 @lang en Original expansion scope identity, without inferring filesystem locations. */
  scopeId: string;
  /** @lang zh-CN 原展开目标引用列表的规范化冻结副本。 @lang en Normalized frozen copy of the expansion's target references. */
  targetIds: readonly string[];
}

/**
 * @lang zh-CN 可由目标反查绑定的冻结摘要，包含全局关联边和可选生成范围。
 * @lang en Frozen target-to-binding summary with globally linked edges and an optional generated range.
 */
export interface GeneratedDocumentationBindingIndexedTarget {
  /** @lang zh-CN 按展开边首次出现顺序去重的绑定身份。 @lang en Binding identities deduplicated in first-seen expansion-edge order. */
  bindingIds: readonly string[];
  /** @lang zh-CN 按目标绑定边汇总其全部条目并首次出现去重，可跨多个绑定。 @lang en All entries aggregated through target binding edges and first-seen deduplicated across bindings. */
  docSourceMapEntryIds: readonly string[];
  /** @lang zh-CN 引用此目标的展开身份，按展开遍历顺序保留。 @lang en Referencing expansion identities in expansion traversal order. */
  expansionIds: readonly string[];
  /** @lang zh-CN 原目标不透明身份，不是URL。 @lang en Original opaque target identity, not a URL. */
  id: string;
  /** @lang zh-CN 目标类别/工件/符号/选择器/范围摘要，不执行DOM查找。 @lang en Target kind/artifact/symbol/selector/range summary without DOM lookup. */
  identity: GeneratedDocumentationBindingTargetIdentity;
  /** @lang zh-CN 目标自身的质量三维。 @lang en This target's own quality dimensions. */
  resolution: GeneratedDocumentationBindingResolution;
}

/** @lang zh-CN 受限声明引用摘要，不是完整adapter AST或执行入口。 @lang en Restricted declaration-reference summary, neither a complete adapter AST nor execution entry. */
export interface GeneratedDocumentationBindingReference {
  /** @lang zh-CN 原引用类别。 @lang en Original reference kind. */
  kind: string;
  /** @lang zh-CN 规范化非空成员路径段列表，可为空列表，独立冻结。 @lang en Independently frozen list of normalized nonempty member-path segments, possibly empty. */
  memberPath: readonly string[];
  /** @lang zh-CN 原根声明身份，不解析成程序表达式。 @lang en Original root-declaration identity, never parsed as a program expression. */
  rootDeclarationId: string;
}

/** @lang zh-CN 上游文档意图的索引摘要，来源数据不代表公开许可。 @lang en Indexed upstream documentation-intent summary; source metadata grants no publication permission. */
export interface GeneratedDocumentationBindingSourceIntent {
  /** @lang zh-CN 非空意图字段标签才保留。 @lang en Retained only for a nonempty intent-field label. */
  field?: string;
  /** @lang zh-CN 原意图类别。 @lang en Original intent kind. */
  kind: string;
  /** @lang zh-CN 原sourceRef中的非空来源身份，不自动解析路径。 @lang en Nonempty source identity from sourceRef without automatic path resolution. */
  sourceId?: string;
  /** @lang zh-CN 一基行列的规范化冻结来源范围，原省略列保持省略，不重新解释端点约定。 @lang en Normalized frozen source range with one-based coordinates, preserving omitted columns without reinterpreting endpoint conventions. */
  sourceRange?: HiaSourceRange;
}

/** @lang zh-CN 保留冻结scope身份的结构摘要，不把别名作为身份。 @lang en Structural summary of frozen scope identity without using aliases as identity. */
export interface GeneratedDocumentationBindingScope {
  /** @lang zh-CN 原scope适配器身份。 @lang en Original scope adapter identity. */
  adapterId: string;
  /** @lang zh-CN 原声明槽标签，不运行槽内代码。 @lang en Original declaration-slot label, without executing slot code. */
  declarationSlot: string;
  /** @lang zh-CN 原结构化不透明scope身份。 @lang en Original structured opaque scope identity. */
  id: string;
  /** @lang zh-CN 原语义祖先标签顺序的冻结副本。 @lang en Frozen copy of semantic-ancestry labels in original order. */
  semanticAncestry: readonly string[];
  /** @lang zh-CN 原scope来源身份，不是文件读取授权。 @lang en Original scope source identity, not file-read authority. */
  sourceId: string;
}

/** @lang zh-CN 三个独立质量标签，由owner检查配对；索引不重算综合分数。 @lang en Three independent quality labels whose pairings are owner-validated; indexing computes no combined score. */
export interface GeneratedDocumentationBindingResolution {
  /** @lang zh-CN 原confidence标签。 @lang en Original confidence label. */
  confidence: string;
  /** @lang zh-CN 来源覆盖标签，generated-only不是解析类别。 @lang en Provenance-coverage label; generated-only is not a resolution kind. */
  provenanceCoverage: string;
  /** @lang zh-CN 原解析类别，不由provenance推导。 @lang en Original resolution kind, never inferred from provenance. */
  resolutionKind: string;
}

/** @lang zh-CN 实例键的规范化只读元数据，状态与隐私声明相互独立。 @lang en Normalized read-only instance-key metadata with distinct state and privacy declarations. */
export interface GeneratedDocumentationBindingInstanceKey {
  /** @lang zh-CN 原非空规范化键才保留；missing可无键。 @lang en Retained only for a nonempty normalized key; missing states may omit it. */
  key?: string;
  /** @lang zh-CN 原非空来源标签，不自动推断可信级别。 @lang en Original nonempty origin label without inferred trust. */
  origin?: string;
  /** @lang zh-CN 仅原声明严格为true时为真，不代表整个索引可公开。 @lang en True only when the original declaration is exactly true, without authorizing publication of the whole index. */
  privacySafe: boolean;
  /** @lang zh-CN 原stable/unstable/missing状态，不随显示键或数组排序改变。 @lang en Original stable/unstable/missing state, unaffected by display keys or array sorting. */
  status: string;
}

/** @lang zh-CN 下游目标的最小身份与可选范围，允许字符串仍未脱敏。 @lang en Minimal downstream target identity/optional range; permitted strings remain unredacted. */
export interface GeneratedDocumentationBindingTargetIdentity {
  /** @lang zh-CN 原非空工件身份才保留。 @lang en Retained only for a nonempty artifact identity. */
  artifactId?: string;
  /** @lang zh-CN 原目标类别。 @lang en Original target kind. */
  kind: string;
  /** @lang zh-CN 规范化冻结生成范围，省略列不补值；不改变端点语义。 @lang en Normalized frozen generated range preserving omitted columns without changing endpoint semantics. */
  range?: HiaSourceRange;
  /** @lang zh-CN 原非空选择器标签，按数据处理，不执行DOM查询。 @lang en Original nonempty selector label treated as data, without DOM execution. */
  selector?: string;
  /** @lang zh-CN 原非空文档符号身份才保留，合法artifact-only目标可省略。 @lang en Retained only for a nonempty documentation-symbol identity; valid artifact-only targets may omit it. */
  symbolId?: string;
}

/** @lang zh-CN 继承/组合策略与贡献身份摘要，不包含来源或覆盖上下文。 @lang en Inheritance/composition policy and contribution-identity summary, excluding source/override contexts. */
export interface GeneratedDocumentationBindingComposition {
  /** @lang zh-CN 原贡献声明中非空身份按顺序收集，不重排贡献。 @lang en Nonempty contribution identities collected in declaration order without reordering contributions. */
  contributionIds: readonly string[];
  /** @lang zh-CN 原合并策略标签，索引不重新执行合并。 @lang en Original merge-policy label; indexing does not rerun composition. */
  mergePolicy: string;
  /** @lang zh-CN 原none/inheritance/composition关系标签。 @lang en Original none/inheritance/composition relation label. */
  relation: string;
}

/**
 * 中文：从独立 sidecar 与已建立的 doc-source-map index 构造只读双向索引。
 * English: Builds a read-only bidirectional index from an independent sidecar
 * and a pre-built doc-source-map index.
 *
 * @remarks
 * 中文：这个函数只消费已提供的内存对象；不会按 `sidecarPath` 加载 JSON，不会向
 * ordinary source map 写入完整 binding model，也不会调用 renderer 或 host。
 * English: This function consumes only supplied in-memory objects. It does not
 * load JSON from `sidecarPath`, write the full binding model into an ordinary
 * source map, or invoke a renderer or host.
 * @param value <lang><zh-CN>独立绑定sidecar运行时值，仍需owner验证。</zh-CN><en>Independent binding-sidecar runtime value requiring owner validation.</en></lang>
 * @param options <lang><zh-CN>普通/null原型的自有前置索引和可选string路径；已知访问器/错型/反射失败拒绝，未知字段不读。</zh-CN><en>Plain/null-prototype own prerequisite index and optional string path; known accessors/wrong types/reflection failures reject, while unknown fields remain unread.</en></lang>
 * @returns <lang><zh-CN>冻结组合结果。通过owner验证的GDB提取诊断按原code/severity/顺序传播，error沿既有规则返回invalid空关系；非法sidecar不透传提取记录。选项/头部错误仍用DOC_SOURCE_MAP_UNAVAILABLE，无部分上下文。合法path未脱敏，数组仍借用，不是深图验证或Proxy/资源/并发沙箱。</zh-CN><en>Frozen composition result. Owner-validated GDB extraction diagnostics retain codes/severities/order; errors use the existing empty-invalid refusal, while invalid sidecars never forward extraction records. Invalid options/headers retain DOC_SOURCE_MAP_UNAVAILABLE without partial context. Valid paths remain unsanitized and arrays borrowed, without deep-graph validation or proxy/resource/concurrency sandbox guarantees.</en></lang>
 */
export function createGeneratedDocumentationBindingIndex(
  value: unknown,
  options: GeneratedDocumentationBindingIndexOptions
): GeneratedDocumentationBindingIndex {
  // <lang><zh-CN>先固定两选项及八头字段；拒绝时不读取sidecar头或复制未验证的诊断。</zh-CN><en>Snapshot both options and eight header fields first; refusal reads no sidecar headers and copies no unvalidated diagnostics.</en></lang>
  const preparedOptions = prepareBindingIndexOptions(options);
  if (!preparedOptions) return createEmptyGeneratedDocumentationBindingIndex({ status: "invalid", diagnostics: [createIndexDiagnostic("GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE", "generated-documentation-binding indexing requires own data options with a string path and a pre-built doc-source-map index.", "error")] });
  // <lang><zh-CN>头部是内部独立快照；嵌套数组/条目仍按公共前置条件借用。</zh-CN><en>The header is an independent internal snapshot; nested arrays/entries remain borrowed under the public precondition.</en></lang>
  const docSourceMapIndex = preparedOptions.docSourceMapIndex;
  // <lang><zh-CN>owner只报告结构/语义合法性，不能把其空结果误认作提取没有诊断。</zh-CN><en>The owner reports structural/semantic validity only; an empty validation result does not mean extraction produced no diagnostics.</en></lang>
  const validationDiagnostics = validateGeneratedDocumentationBinding(value, preparedOptions.path ? { path: preparedOptions.path } : {});
  // <lang><zh-CN>先保持映射及owner诊断顺序，不改前置数组；提取记录只有完整owner验证通过才可读。</zh-CN><en>Retain map/owner diagnostic order without mutating prerequisite arrays; read extraction records only after complete owner validation succeeds.</en></lang>
  const diagnostics: HiaDiagnostic[] = [
    ...docSourceMapIndex.diagnostics,
    ...validationDiagnostics
  ];
  // <lang><zh-CN>整个sidecar失败时连先出现的合法提取项也不透传；通过后补入，使已有error分支统一隔离关系。</zh-CN><en>When the sidecar fails, even preceding valid extraction items are withheld; successful validation adds them before the existing error branch isolates relations.</en></lang>
  if (!validationDiagnostics.some((diagnostic) => diagnostic.severity === "error") && isRecord(value)) {
    diagnostics.push(...projectValidatedExtractionDiagnostics(value, preparedOptions.path));
  }
  // <lang><zh-CN>validator拒绝访问器后不能再次直接读取头字段；只投影自有数据描述符供失败状态说明。</zh-CN><en>Never read headers directly after validator rejection of accessors; project own data descriptors only for failure metadata.</en></lang>
  const { contractVersion, sidecarId } = readBindingHeader(value);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error") || !isRecord(value)) {
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: resolveIndexStatus(contractVersion, diagnostics)
    });
  }

  if (docSourceMapIndex.status !== "available") {
    const docSourceMapStatus = docSourceMapIndex.status === "unsupported-version"
      ? "unsupported-version"
      : "invalid";
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE",
      "generated-documentation-binding indexing requires an available paired doc-source-map index.",
      docSourceMapStatus === "invalid" ? "error" : "warning",
      preparedOptions.path,
      { docSourceMapStatus: docSourceMapIndex.status }
    ));
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: docSourceMapStatus
    });
  }

  const linkage = isRecord(value.docSourceMapLinkage) ? value.docSourceMapLinkage : undefined;
  // <lang><zh-CN>声明来自快照中的借用sidecar数组，实际版本/路径/身份仍由原配对规则核验。</zh-CN><en>The declaration comes from the snapshot's borrowed sidecar array; existing pairing rules still check exact versions/paths/identities.</en></lang>
  const declaredSidecar = sidecarId
    ? docSourceMapIndex.bindingSidecars.find((sidecar) => sidecar.id === sidecarId)
    : undefined;
  validateSidecarLinkage(value, linkage, declaredSidecar, docSourceMapIndex, diagnostics, preparedOptions.path);

  // <lang><zh-CN>owner验证后的三集合分别保留输入顺序，原sidecar不会被排序或改写。</zh-CN><en>Three owner-validated collections retain input order; the original sidecar is neither sorted nor rewritten.</en></lang>
  const bindings = collectRecords(value.bindings);
  const expansions = collectRecords(value.expansions);
  const targets = collectRecords(value.targets);
  // <lang><zh-CN>两张身份表只做当前内存组的关联，不能推导跨工件或跨版本兼容。</zh-CN><en>Two identity maps join this in-memory group only and infer no cross-artifact/version compatibility.</en></lang>
  const bindingById = new Map(bindings.map((binding) => [requiredString(binding.id), binding]));
  const targetById = new Map(targets.map((target) => [requiredString(target.id), target]));
  // <lang><zh-CN>文档条目边来自头部快照数组，未知binding保持既有warning与空边处理。</zh-CN><en>Documentation-entry edges come from the header snapshot array; unknown bindings retain existing warning/empty-edge handling.</en></lang>
  const entryIdsByBindingId = collectEntryIdsByBindingId(docSourceMapIndex.entries, sidecarId, bindingById, diagnostics, preparedOptions.path);

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return createEmptyGeneratedDocumentationBindingIndex({
      diagnostics,
      ...(contractVersion ? { contractVersion } : {}),
      ...(sidecarId ? { sidecarId } : {}),
      status: resolveIndexStatus(contractVersion, diagnostics)
    });
  }

  // <lang><zh-CN>正反向边表按输入首次出现顺序去重，不将一对多展开折叠成单目标。</zh-CN><en>Forward/reverse edge maps deduplicate in first-seen input order without collapsing one-to-many expansion to one target.</en></lang>
  const expansionIdsByBindingId = new Map<string, string[]>();
  const targetIdsByBindingId = new Map<string, string[]>();
  const expansionIdsByTargetId = new Map<string, string[]>();
  const bindingIdsByTargetId = new Map<string, string[]>();

  for (const expansion of expansions) {
    const expansionId = requiredString(expansion.id);
    const bindingId = requiredString(expansion.bindingId);
    const targetIds = stringList(expansion.targetIds);
    appendUnique(expansionIdsByBindingId, bindingId, expansionId);

    for (const targetId of targetIds) {
      if (!targetById.has(targetId)) {
        continue;
      }
      appendUnique(targetIdsByBindingId, bindingId, targetId);
      appendUnique(expansionIdsByTargetId, targetId, expansionId);
      appendUnique(bindingIdsByTargetId, targetId, bindingId);
    }
  }

  // <lang><zh-CN>最终投影独立冻结；数组来源借用不意味着把原输入冻结或公开其正文。</zh-CN><en>Final projections are independently frozen; borrowed source arrays imply neither freezing original inputs nor exposing their bodies.</en></lang>
  const indexedExpansions = expansions.map((expansion) => freezeExpansion(expansion));
  const indexedBindings = bindings.map((binding) => freezeBinding(
    binding,
    expansionIdsByBindingId.get(requiredString(binding.id)) ?? [],
    targetIdsByBindingId.get(requiredString(binding.id)) ?? [],
    entryIdsByBindingId.get(requiredString(binding.id)) ?? []
  ));
  const indexedTargets = targets.map((target) => {
    const targetId = requiredString(target.id);
    // <lang><zh-CN>先回溯目标的绑定，再沿绑定汇总文档条目，保持原反查顺序。</zh-CN><en>Trace target bindings first, then aggregate their documentation entries while retaining existing reverse-lookup order.</en></lang>
    const bindingIds = bindingIdsByTargetId.get(targetId) ?? [];
    const entryIds = bindingIds.flatMap((bindingId) => entryIdsByBindingId.get(bindingId) ?? []);
    return freezeTarget(
      target,
      bindingIds,
      expansionIdsByTargetId.get(targetId) ?? [],
      uniqueStrings(entryIds)
    );
  });

  // <lang><zh-CN>同一文档条目可关联多个binding，汇总计数只按唯一条目计算。</zh-CN><en>One documentation entry may link multiple bindings; the summary counts unique entries only.</en></lang>
  const linkedDocSourceMapEntryCount = uniqueStrings([...entryIdsByBindingId.values()].flat()).length;

  return Object.freeze({
    bindingCount: indexedBindings.length,
    bindings: freezeList(indexedBindings),
    contract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    ...(contractVersion ? { contractVersion } : {}),
    diagnostics: freezeList(diagnostics),
    docSourceMapEntryCount: docSourceMapIndex.entryCount,
    expansionCount: indexedExpansions.length,
    expansions: freezeList(indexedExpansions),
    linkedDocSourceMapEntryCount,
    ...(sidecarId ? { sidecarId } : {}),
    status: "available" as const,
    targetCount: indexedTargets.length,
    targets: freezeList(indexedTargets),
    unlinkedBindingCount: indexedBindings.filter((binding) => binding.docSourceMapEntryIds.length === 0).length
  });
}

/**
 * @lang zh-CN 按绑定身份查目标，保留展开边首次出现顺序，不按目标声明排序。
 * @lang en Finds targets by binding identity in first-seen expansion-edge order, not target declaration order.
 * @param index <lang><zh-CN>本包建立且未篡改的索引，不验证任意对象。</zh-CN><en>An untampered index from this package; arbitrary objects are not validated.</en></lang>
 * @param bindingId <lang><zh-CN>primitive string原值精确匹配，区分大小写且不trim/转换；非string返回空。</zh-CN><en>Primitive string matched exactly, case-sensitively, without trimming/conversion; nonstrings return emptiness.</en></lang>
 * @returns <lang><zh-CN>独立冻结列表，元素借用原冻结目标；无匹配/失败工厂索引为空，不返回诊断或公开安全副本。</zh-CN><en>A detached frozen list borrowing original frozen targets; no matches/failed factory indexes yield emptiness, not diagnostics or a public-safe copy.</en></lang>
 * @throws <lang><zh-CN>违反索引前提的访问/迭代异常不在本函数内转换。</zh-CN><en>Access/iteration failures from violated index preconditions are not converted here.</en></lang>
 */
export function findGeneratedTargetsForBinding(
  index: GeneratedDocumentationBindingIndex,
  bindingId: string
): readonly GeneratedDocumentationBindingIndexedTarget[] {
  // <lang><zh-CN>先挡非字符串，不执行用户转换，也不触碰索引集合。</zh-CN><en>Reject nonstrings before index collection access, without user conversions.</en></lang>
  if (typeof bindingId !== "string") return Object.freeze([]);
  // <lang><zh-CN>绑定身份按原值查找，合法空白/Unicode不规范化。</zh-CN><en>Find binding identity verbatim, preserving legitimate whitespace/Unicode.</en></lang>
  const binding = index.bindings.find((item) => item.id === bindingId);
  if (!binding) {
    return Object.freeze([]);
  }
  // <lang><zh-CN>临时身份表只用于解析边；输出顺序仍取binding.targetIds。</zh-CN><en>The temporary identity map resolves edges only; binding.targetIds still determines output order.</en></lang>
  const targetById = new Map(index.targets.map((target) => [target.id, target]));
  // <lang><zh-CN>复制列表而借用冻结节点，未解析边不生成占位或宽匹配。</zh-CN><en>Copy the list while borrowing frozen nodes; unresolved edges create neither placeholders nor broad matches.</en></lang>
  return freezeList(binding.targetIds.flatMap((targetId) => {
    const target = targetById.get(targetId);
    return target ? [target] : [];
  }));
}

/**
 * @lang zh-CN 按目标身份查绑定，保留展开边首次出现顺序。
 * @lang en Finds bindings by target identity in first-seen expansion-edge order.
 * @param index <lang><zh-CN>本包未篡改的工厂索引。</zh-CN><en>An untampered factory index from this package.</en></lang>
 * @param targetId <lang><zh-CN>原值精确string身份，不转换/trim/忽略大小写；非string为空。</zh-CN><en>Exact original string identity without conversion/trimming/case folding; nonstrings yield emptiness.</en></lang>
 * @returns <lang><zh-CN>新冻结列表，借用原绑定节点；失败工厂索引/未命中为空，非完整工件或公开安全投影。</zh-CN><en>A new frozen list borrowing original binding nodes; failed factory indexes/misses yield emptiness, not a full artifact or public-safe projection.</en></lang>
 * @throws <lang><zh-CN>不保证非法或篡改索引的访问/迭代异常收敛。</zh-CN><en>Access/iteration errors from invalid or tampered indexes are not contained.</en></lang>
 */
export function findGeneratedBindingsForTarget(
  index: GeneratedDocumentationBindingIndex,
  targetId: string
): readonly GeneratedDocumentationBindingIndexedBinding[] {
  // <lang><zh-CN>非string不尝试转换或查询，保持string身份边界。</zh-CN><en>Nonstrings trigger neither conversion nor lookup, preserving string identity boundaries.</en></lang>
  if (typeof targetId !== "string") return Object.freeze([]);
  // <lang><zh-CN>按目标身份精确定位，绑定顺序由该目标的关系边决定。</zh-CN><en>Locate the target exactly; its relation edges determine binding order.</en></lang>
  const target = index.targets.find((item) => item.id === targetId);
  if (!target) {
    return Object.freeze([]);
  }
  // <lang><zh-CN>声明表只提供节点解析，不按其声明顺序重排反查结果。</zh-CN><en>The declaration map resolves nodes without reordering reverse results by declaration order.</en></lang>
  const bindingById = new Map(index.bindings.map((binding) => [binding.id, binding]));
  // <lang><zh-CN>保持target.bindingIds的边顺序，复制输出外壳并借用原节点。</zh-CN><en>Preserve target.bindingIds edge order, copying the output shell while borrowing original nodes.</en></lang>
  return freezeList(target.bindingIds.flatMap((bindingId) => {
    const binding = bindingById.get(bindingId);
    return binding ? [binding] : [];
  }));
}

/**
 * @lang zh-CN 按文档符号身份查绑定，按目标声明遍历边并首次出现去重。
 * @lang en Finds bindings by documentation-symbol identity, traversing targets in declaration order and deduplicating first-seen edges.
 * @param index <lang><zh-CN>本包未篡改的工厂索引；目标可合法省略symbolId。</zh-CN><en>An untampered factory index from this package; targets may legitimately omit symbolId.</en></lang>
 * @param symbolId <lang><zh-CN>primitive string原值匹配；非string包括undefined为空，不能匹配缺省symbolId。</zh-CN><en>Primitive string matched verbatim; nonstrings including undefined yield emptiness and cannot match omitted symbolId.</en></lang>
 * @returns <lang><zh-CN>独立冻结、按边首次出现去重的列表，元素借用原绑定，未命中/失败工厂索引为空。</zh-CN><en>A detached frozen list deduplicated by first-seen edge, borrowing original bindings; misses/failed factory indexes yield emptiness.</en></lang>
 * @throws <lang><zh-CN>篡改/任意索引的访问和迭代异常不在保证内。</zh-CN><en>Access/iteration exceptions from arbitrary/tampered indexes are outside guarantees.</en></lang>
 */
export function findGeneratedBindingsForTargetSymbol(
  index: GeneratedDocumentationBindingIndex,
  symbolId: string
): readonly GeneratedDocumentationBindingIndexedBinding[] {
  // <lang><zh-CN>可选symbolId缺省为undefined；必须先拒绝同样undefined的非法查询，防止宽匹配。</zh-CN><en>Optional symbolId is undefined when absent; reject an equally undefined invalid query first to prevent broad matches.</en></lang>
  if (typeof symbolId !== "string") return Object.freeze([]);
  // <lang><zh-CN>按目标声明顺序收集绑定边，再首次出现去重，不按绑定声明重新排序。</zh-CN><en>Collect binding edges in target declaration order, then first-seen deduplicate without sorting by binding declarations.</en></lang>
  const bindingIds = uniqueStrings(index.targets
    .filter((target) => target.identity.symbolId === symbolId)
    .flatMap((target) => target.bindingIds));
  // <lang><zh-CN>只为已收集身份解析原冻结节点，既有顺序保持。</zh-CN><en>Resolve original frozen nodes for collected identities only, preserving existing order.</en></lang>
  const bindingById = new Map(index.bindings.map((binding) => [binding.id, binding]));
  // <lang><zh-CN>返回新冻结列表而非原数组，节点仍是只读索引的同一对象。</zh-CN><en>Return a new frozen list rather than an original array, retaining the same read-only index nodes.</en></lang>
  return freezeList(bindingIds.flatMap((bindingId) => {
    const binding = bindingById.get(bindingId);
    return binding ? [binding] : [];
  }));
}

/**
 * @lang zh-CN 按文档映射条目身份筛选绑定，保留绑定声明顺序。
 * @lang en Filters bindings by documentation-map entry identity in binding declaration order.
 * @param index <lang><zh-CN>本包未篡改的工厂索引，不读取条目正文或外部工件。</zh-CN><en>An untampered factory index from this package, without reading entry bodies or external artifacts.</en></lang>
 * @param entryId <lang><zh-CN>精确primitive string身份，非string为空；不转换/trim/归一化。</zh-CN><en>Exact primitive string identity; nonstrings yield emptiness, without conversion/trimming/normalization.</en></lang>
 * @returns <lang><zh-CN>新冻结列表借用原冻结绑定；无匹配或失败工厂索引为空，无隐含版本/公开许可。</zh-CN><en>A new frozen list borrowing original frozen bindings; misses/failed factory indexes yield emptiness without implicit version/publication approval.</en></lang>
 * @throws <lang><zh-CN>对任意或篡改索引不提供异常沙箱。</zh-CN><en>No exception sandbox is provided for arbitrary/tampered indexes.</en></lang>
 */
export function findGeneratedBindingsForDocSourceMapEntry(
  index: GeneratedDocumentationBindingIndex,
  entryId: string
): readonly GeneratedDocumentationBindingIndexedBinding[] {
  // <lang><zh-CN>在读取索引集合之前按既有string签名收敛非法参数。</zh-CN><en>Constrain invalid arguments to the existing string signature before reading index collections.</en></lang>
  if (typeof entryId !== "string") return Object.freeze([]);
  // <lang><zh-CN>直接按绑定声明顺序筛选，保持其关联身份的精确匹配。</zh-CN><en>Filter directly in binding declaration order while matching linked identities exactly.</en></lang>
  return freezeList(index.bindings.filter((binding) => binding.docSourceMapEntryIds.includes(entryId)));
}

/**
 * @lang zh-CN 仅从完整owner验证通过的sidecar复制提取诊断，不读取自由文本或扩展。
 * @lang en Copies extraction diagnostics only from a completely owner-validated sidecar without reading free text or extensions.
 * @param value <lang><zh-CN>刚经本模块owner验证的普通记录；嵌套数据须保持未篡改。</zh-CN><en>A plain record just accepted by the owner validator; nested data must remain untampered.</en></lang>
 * @param path <lang><zh-CN>调用者既有诊断上下文，未脱敏且不授予文件访问权限。</zh-CN><en>Existing unredacted caller diagnostic context, granting no file-access authority.</en></lang>
 * @returns <lang><zh-CN>独立冻结的内存诊断，保留原code/severity/顺序及重复项，仅新增固定通用正文；不复制id或subjectId。</zh-CN><en>Independent frozen in-memory diagnostics preserving code/severity/order and duplicates with fixed generic text only; ids and subjectIds are excluded.</en></lang>
 */
function projectValidatedExtractionDiagnostics(value: Record<string, unknown>, path?: string): HiaDiagnostic[] {
  // <lang><zh-CN>类型断言依赖前置完整owner检查，不是为任意对象提供新解析入口。</zh-CN><en>This type assertion relies on complete preceding owner validation and creates no new parser for arbitrary objects.</en></lang>
  const records = value.diagnostics as readonly { code: string; severity: HiaDiagnosticSeverity }[];
  // <lang><zh-CN>逐条新建而不去重，固定正文/调用者path避免回显提取器自由文本或私有身份。</zh-CN><en>Create every record anew without deduplication; fixed text and caller path avoid echoing extractor free text or private identities.</en></lang>
  return records.map((record) => Object.freeze(createIndexDiagnostic(record.code, "Generated documentation binding extraction reported a diagnostic.", record.severity, path)));
}

/**
 * @lang zh-CN 投影选项和已消费的前置头部；只保证浅层形状，不认证工厂来源或校验借用图。
 * @lang en Projects options and consumed prerequisite headers; guarantees shallow shape only, neither factory-origin authentication nor borrowed-graph validation.
 * @param value <lang><zh-CN>未知选项，必需docSourceMapIndex与可选path均为自有数据。</zh-CN><en>Unknown options with required docSourceMapIndex and optional path, both own data.</en></lang>
 * @returns <lang><zh-CN>独立头部及原数组引用，或原子失败undefined。Proxy反射异常收敛，不是沙箱。</zh-CN><en>Independent headers with original array references, or atomic undefined failure; catches proxy reflection errors without sandboxing.</en></lang>
 */
function prepareBindingIndexOptions(value: unknown): { docSourceMapIndex: BindingDocSourceMapView; path?: string } | undefined {
  try {
    // <lang><zh-CN>路径投影同时核普通/null原型根，之后只读取必需的自有索引描述符。</zh-CN><en>Path projection also checks a plain/null-prototype root, followed only by the required own index descriptor.</en></lang>
    const location = prepareSourceLinkagePathOptions(value);
    if (!location) return undefined;
    const reference = Object.getOwnPropertyDescriptor(value as object, "docSourceMapIndex");
    if (!reference || !Object.hasOwn(reference, "value")) return undefined;
    const index: unknown = reference.value;
    if (typeof index !== "object" || index === null || Array.isArray(index)) return undefined;
    const prototype = Object.getPrototypeOf(index);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    // <lang><zh-CN>只保存八个已消费字段，缺少可选id/版本视为省略，不沿原型或枚举扩展取值。</zh-CN><en>Retain eight consumed fields only; missing optional id/version is omitted, without inherited reads or extension enumeration.</en></lang>
    const header: Record<string, unknown> = {};
    for (const field of ["contract", "contractVersion", "id", "status", "diagnostics", "entries", "bindingSidecars", "entryCount"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(index, field);
      if (!descriptor) {
        if (field === "id" || field === "contractVersion") continue;
        return undefined;
      }
      if (!Object.hasOwn(descriptor, "value")) return undefined;
      header[field] = descriptor.value;
    }
    if (header.contract !== DOC_SOURCE_MAP_CONTRACT || !["available", "invalid", "unsupported-version"].includes(header.status as string)) return undefined;
    if ((header.id !== undefined && typeof header.id !== "string") || (header.contractVersion !== undefined && typeof header.contractVersion !== "string")) return undefined;
    for (const field of ["diagnostics", "entries", "bindingSidecars"]) {
      // <lang><zh-CN>标准数组头部不等于条目认证；公共契约仍要求数组及其内容来自未篡改前置索引。</zh-CN><en>Standard array headers do not authenticate entries; the public contract still requires untampered prerequisite arrays and contents.</en></lang>
      if (!Array.isArray(header[field]) || Object.getPrototypeOf(header[field]) !== Array.prototype) return undefined;
    }
    // <lang><zh-CN>计数必须与条目数组长度一致，用自有长度描述符避免读取调用者的普通get陷阱。</zh-CN><en>The count must match entry-array length, using its own length descriptor to avoid ordinary caller get traps.</en></lang>
    const length = Object.getOwnPropertyDescriptor(header.entries, "length");
    if (!Number.isSafeInteger(header.entryCount) || (header.entryCount as number) < 0 || !length || header.entryCount !== length.value) return undefined;
    return { ...location, docSourceMapIndex: {
      contract: DOC_SOURCE_MAP_CONTRACT,
      ...(typeof header.contractVersion === "string" ? { contractVersion: header.contractVersion } : {}),
      ...(typeof header.id === "string" ? { id: header.id } : {}),
      status: header.status as DocSourceMapIndex["status"],
      diagnostics: header.diagnostics as DocSourceMapIndex["diagnostics"],
      entries: header.entries as DocSourceMapIndex["entries"],
      bindingSidecars: header.bindingSidecars as DocSourceMapIndex["bindingSidecars"],
      entryCount: header.entryCount as number
    } };
  } catch {
    return undefined;
  }
}

/** @lang zh-CN 核对明确配对的sidecar/map身份、精确版本与路径，不以相同id推定跨版本兼容。 @lang en Checks explicitly paired sidecar/map identities, exact versions and paths without inferring cross-version compatibility from matching ids. */
function validateSidecarLinkage(
  sidecar: Record<string, unknown>,
  linkage: Record<string, unknown> | undefined,
  declaredSidecar: DocSourceMapIndex["bindingSidecars"][number] | undefined,
  docSourceMapIndex: BindingDocSourceMapView,
  diagnostics: HiaDiagnostic[],
  targetPath: string | undefined
): void {
  const sidecarId = stringValue(sidecar.id);
  const linkageSidecarId = linkage ? stringValue(linkage.sidecarId) : undefined;

  if (!sidecarId || !declaredSidecar) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_SIDECAR_UNDECLARED",
      "generated-documentation-binding sidecar must be declared by the paired doc-source-map before indexing.",
      "error",
      targetPath,
      { sidecarId: sidecarId ?? "" }
    ));
    return;
  }

  if (linkageSidecarId !== sidecarId
    || declaredSidecar.contract !== GENERATED_DOCUMENTATION_BINDING_CONTRACT
    || declaredSidecar.contractVersion !== sidecar.contractVersion) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_LINKAGE_INVALID",
      "generated-documentation-binding sidecar declaration must match the frozen contract, version, and sidecar id.",
      "error",
      targetPath,
      { sidecarId }
    ));
  }

  const expectedDocSourceMapId = linkage ? stringValue(linkage.docSourceMapId) : undefined;
  // <lang><zh-CN>sidecar草案的反向引用版本必须匹配真实map；当前根升级不得使冻结旧引用静默变义。</zh-CN><en>The draft sidecar's back-reference version must match the actual map; advancing the current root must not silently reinterpret a frozen legacy reference.</en></lang>
  if (linkage?.contractVersion !== docSourceMapIndex.contractVersion) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_MISMATCH",
      "generated-documentation-binding linkage version must match the paired doc-source-map exactly.",
      "error",
      targetPath
    ));
  }
  if (expectedDocSourceMapId && docSourceMapIndex.id !== expectedDocSourceMapId) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_MISMATCH",
      "generated-documentation-binding sidecar docSourceMapId must match the paired doc-source-map index.",
      "error",
      targetPath,
      { actualDocSourceMapId: docSourceMapIndex.id ?? "", expectedDocSourceMapId }
    ));
  }

  const expectedSidecarPath = linkage ? stringValue(linkage.sidecarPath) : undefined;
  if (expectedSidecarPath && declaredSidecar.path && normalizePath(expectedSidecarPath) !== normalizePath(declaredSidecar.path)) {
    diagnostics.push(createIndexDiagnostic(
      "GENERATED_DOCUMENTATION_BINDING_INDEX_SIDECAR_PATH_MISMATCH",
      "generated-documentation-binding sidecar path must match the paired doc-source-map declaration.",
      "error",
      targetPath,
      { declaredSidecarPath: declaredSidecar.path, expectedSidecarPath }
    ));
  }
}

function collectEntryIdsByBindingId(
  entries: readonly DocSourceMapIndexedEntry[],
  sidecarId: string | undefined,
  bindingById: ReadonlyMap<string, Record<string, unknown>>,
  diagnostics: HiaDiagnostic[],
  targetPath: string | undefined
): Map<string, string[]> {
  const entryIdsByBindingId = new Map<string, string[]>();
  if (!sidecarId) {
    return entryIdsByBindingId;
  }

  for (const entry of entries) {
    for (const ref of entry.generatedBindingRefs) {
      if (ref.sidecarId !== sidecarId) {
        continue;
      }
      if (!bindingById.has(ref.bindingId)) {
        diagnostics.push(createIndexDiagnostic(
          "GENERATED_DOCUMENTATION_BINDING_INDEX_ENTRY_BINDING_UNRESOLVED",
          "doc-source-map generated binding reference does not resolve in the paired sidecar.",
          "warning",
          targetPath,
          { bindingId: ref.bindingId, entryId: entry.id, sidecarId }
        ));
        continue;
      }
      appendUnique(entryIdsByBindingId, ref.bindingId, entry.id);
    }
  }

  return entryIdsByBindingId;
}

function freezeBinding(
  value: Record<string, unknown>,
  expansionIds: string[],
  targetIds: string[],
  docSourceMapEntryIds: string[]
): GeneratedDocumentationBindingIndexedBinding {
  const sourceIntent = recordValue(value.sourceIntent);
  const bindingRef = recordValue(value.bindingRef);
  const scope = recordValue(value.scope);
  const composition = recordValue(value.composition);
  const projectedSourceIntent: GeneratedDocumentationBindingSourceIntent = {
    kind: requiredString(sourceIntent.kind)
  };
  const field = stringValue(sourceIntent.field);
  const sourceRange = sourceIntentRange(sourceIntent);
  const sourceId = sourceIntentSourceId(sourceIntent);
  if (field) {
    projectedSourceIntent.field = field;
  }
  if (sourceRange) {
    projectedSourceIntent.sourceRange = sourceRange;
  }
  if (sourceId) {
    projectedSourceIntent.sourceId = sourceId;
  }

  return Object.freeze({
    adapterId: requiredString(value.adapterId),
    bindingRef: Object.freeze({
      kind: requiredString(bindingRef.kind),
      memberPath: freezeList(stringList(bindingRef.memberPath)),
      rootDeclarationId: requiredString(bindingRef.rootDeclarationId)
    }),
    composition: Object.freeze({
      contributionIds: freezeList(collectContributionIds(composition.contributions)),
      mergePolicy: requiredString(composition.mergePolicy),
      relation: requiredString(composition.relation)
    }),
    docSourceMapEntryIds: freezeList(docSourceMapEntryIds),
    expansionIds: freezeList(expansionIds),
    id: requiredString(value.id),
    resolution: freezeResolution(recordValue(value.resolution)),
    scope: Object.freeze({
      adapterId: requiredString(scope.adapterId),
      declarationSlot: requiredString(scope.declarationSlot),
      id: requiredString(scope.id),
      semanticAncestry: freezeList(stringList(scope.semanticAncestry)),
      sourceId: requiredString(scope.sourceId)
    }),
    sourceIntent: Object.freeze(projectedSourceIntent),
    targetIds: freezeList(targetIds)
  });
}

function freezeExpansion(value: Record<string, unknown>): GeneratedDocumentationBindingIndexedExpansion {
  const instanceKey = recordValue(value.instanceKey);
  const projectedInstanceKey: GeneratedDocumentationBindingInstanceKey = {
    privacySafe: instanceKey.privacySafe === true,
    status: requiredString(instanceKey.status)
  };
  const instanceKeyValue = stringValue(instanceKey.key);
  const instanceKeyOrigin = stringValue(instanceKey.origin);
  if (instanceKeyValue) {
    projectedInstanceKey.key = instanceKeyValue;
  }
  if (instanceKeyOrigin) {
    projectedInstanceKey.origin = instanceKeyOrigin;
  }

  return Object.freeze({
    bindingId: requiredString(value.bindingId),
    id: requiredString(value.id),
    instanceKey: Object.freeze(projectedInstanceKey),
    order: typeof value.order === "number" ? value.order : 0,
    resolution: freezeResolution(recordValue(value.resolution)),
    scopeId: requiredString(value.scopeId),
    targetIds: freezeList(stringList(value.targetIds))
  });
}

function freezeTarget(
  value: Record<string, unknown>,
  bindingIds: string[],
  expansionIds: string[],
  docSourceMapEntryIds: string[]
): GeneratedDocumentationBindingIndexedTarget {
  const identity = recordValue(value.identity);
  const range = normalizeRange(identity.range);
  const projectedIdentity: GeneratedDocumentationBindingTargetIdentity = {
    kind: requiredString(identity.kind)
  };
  const artifactId = stringValue(identity.artifactId);
  const selector = stringValue(identity.selector);
  const symbolId = stringValue(identity.symbolId);
  if (artifactId) {
    projectedIdentity.artifactId = artifactId;
  }
  if (range) {
    projectedIdentity.range = range;
  }
  if (selector) {
    projectedIdentity.selector = selector;
  }
  if (symbolId) {
    projectedIdentity.symbolId = symbolId;
  }

  return Object.freeze({
    bindingIds: freezeList(bindingIds),
    docSourceMapEntryIds: freezeList(docSourceMapEntryIds),
    expansionIds: freezeList(expansionIds),
    id: requiredString(value.id),
    identity: Object.freeze(projectedIdentity),
    resolution: freezeResolution(recordValue(value.resolution))
  });
}

function freezeResolution(value: Record<string, unknown>): GeneratedDocumentationBindingResolution {
  return Object.freeze({
    confidence: requiredString(value.confidence),
    provenanceCoverage: requiredString(value.provenanceCoverage),
    resolutionKind: requiredString(value.resolutionKind)
  });
}

function collectContributionIds(value: unknown): string[] {
  return collectRecords(value).flatMap((contribution) => {
    const id = stringValue(contribution.id);
    return id ? [id] : [];
  });
}

function sourceIntentSourceId(value: Record<string, unknown>): string | undefined {
  const sourceRef = recordValue(value.sourceRef);
  return stringValue(sourceRef.sourceId);
}

function sourceIntentRange(value: Record<string, unknown>): HiaSourceRange | undefined {
  const sourceRef = recordValue(value.sourceRef);
  return normalizeRange(sourceRef.range);
}

function createEmptyGeneratedDocumentationBindingIndex(options: {
  contractVersion?: string;
  diagnostics: HiaDiagnostic[];
  sidecarId?: string;
  status: GeneratedDocumentationBindingIndex["status"];
}): GeneratedDocumentationBindingIndex {
  return Object.freeze({
    bindingCount: 0,
    bindings: Object.freeze([]),
    contract: GENERATED_DOCUMENTATION_BINDING_CONTRACT,
    ...(options.contractVersion ? { contractVersion: options.contractVersion } : {}),
    diagnostics: freezeList(options.diagnostics),
    docSourceMapEntryCount: 0,
    expansionCount: 0,
    expansions: Object.freeze([]),
    linkedDocSourceMapEntryCount: 0,
    ...(options.sidecarId ? { sidecarId: options.sidecarId } : {}),
    status: options.status,
    targetCount: 0,
    targets: Object.freeze([]),
    unlinkedBindingCount: 0
  });
}

/** @lang zh-CN 仅读取数据描述符中的版本/id，不执行getter；反射失败返回空元数据。 @lang en Reads version/id data descriptors without executing getters; reflection failure returns empty metadata. */
function readBindingHeader(value: unknown): { contractVersion?: string; sidecarId?: string } {
  try {
    if (typeof value !== "object" || value === null) return {};
    // <lang><zh-CN>描述符本身由引擎复制，访问器没有value，不会在这里执行。</zh-CN><en>The engine copies descriptors; accessors have no value and never execute here.</en></lang>
    const version = Object.getOwnPropertyDescriptor(value, "contractVersion");
    const identity = Object.getOwnPropertyDescriptor(value, "id");
    const contractVersion = version && Object.hasOwn(version, "value") ? stringValue(version.value) : undefined;
    const sidecarId = identity && Object.hasOwn(identity, "value") ? stringValue(identity.value) : undefined;
    return { ...(contractVersion ? { contractVersion } : {}), ...(sidecarId ? { sidecarId } : {}) };
  } catch {
    return {};
  }
}

function resolveIndexStatus(
  contractVersion: string | undefined,
  diagnostics: readonly HiaDiagnostic[]
): GeneratedDocumentationBindingIndex["status"] {
  const hasNonVersionError = diagnostics.some((diagnostic) => diagnostic.severity === "error"
    && diagnostic.code !== "GENERATED_DOCUMENTATION_BINDING_UNSUPPORTED_VERSION");
  return contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION && contractVersion !== GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION && !hasNonVersionError
    ? "unsupported-version"
    : "invalid";
}

function createIndexDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: { data?: HiaDiagnosticData; targetPath?: string } = {};
  if (data) {
    options.data = data;
  }
  if (targetPath) {
    options.targetPath = targetPath;
  }
  return createHiaDiagnostic(code, message, severity, options);
}

function collectRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requiredString(value: unknown): string {
  return stringValue(value) ?? "";
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function appendUnique(map: Map<string, string[]>, key: string, value: string): void {
  const current = map.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
  }
  map.set(key, current);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function freezeList<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeRange(value: unknown): HiaSourceRange | undefined {
  if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.end)) {
    return undefined;
  }
  const startLine = numberValue(value.start.line);
  const endLine = numberValue(value.end.line);
  if (!startLine || !endLine) {
    return undefined;
  }

  const range: HiaSourceRange = {
    start: { line: startLine },
    end: { line: endLine }
  };
  const startColumn = numberValue(value.start.column);
  const endColumn = numberValue(value.end.column);
  if (startColumn) {
    range.start.column = startColumn;
  }
  if (endColumn) {
    range.end.column = endColumn;
  }
  return Object.freeze({
    start: Object.freeze(range.start),
    end: Object.freeze(range.end)
  });
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
