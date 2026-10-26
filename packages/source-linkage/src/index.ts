/**
 * @file
 * @lang zh-CN 文档语义映射与普通位置map的独立查询边界；只消费调用方数据，默认不暴露源码正文。
 * @lang en Independent query boundaries for documentation-semantic and ordinary position maps; consumes caller data only and does not expose source bodies by default.
 */
import path from "node:path";
import { isDocSourceMapJsonDataGraph } from "./manifest-json-data.js";
import { collectDocSourceMapInputIssues } from "./manifest-input.js";
import { collectCurrentDocSourceMapIssues } from "./manifest-current.js";
import { prepareDocSourceMapMigration } from "./manifest-migration.js";
import { createBodyFreeOrdinaryTraceMap } from "./ordinary-input.js";
import {
  allGeneratedPositionsFor,
  eachMapping,
  generatedPositionFor,
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  TraceMap,
  type Bias,
  type SourceMapInput
} from "@jridgewell/trace-mapping";
import {
  createHiaDiagnostic,
  DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT,
  DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION,
  DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT,
  DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaSourcePosition,
  type HiaSourceRange
} from "@hia-doc/core";
import {
  DOC_SOURCE_MAP_CONTRACT,
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION
} from "./constants.js";

export {
  DOC_SOURCE_MAP_CONTRACT,
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION,
  DOC_SOURCE_MAP_RANGE_SOURCES,
  type DocSourceMapContractVersion,
  type DocSourceMapRangeSource,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION,
  type GeneratedDocumentationBindingContractVersion
} from "./constants.js";
export {
  DOC_SOURCE_MAP_JSON_SCHEMA,
  DOC_SOURCE_MAP_SCHEMA_ID,
  DOC_SOURCE_MAP_SCHEMA_VERSION
} from "./schema.js";
export {
  GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID,
  GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID,
  validateGeneratedDocumentationBinding,
  type GeneratedDocumentationBindingValidationOptions
} from "./generated-documentation-binding.js";
export { migrateGeneratedDocumentationBindingBundle, type GeneratedDocumentationBindingMigrationBundle, type GeneratedDocumentationBindingBundleMigrationResult } from "./binding-migration.js";
export {
  createGeneratedDocumentationBindingIndex,
  findGeneratedBindingsForDocSourceMapEntry,
  findGeneratedBindingsForTarget,
  findGeneratedBindingsForTargetSymbol,
  findGeneratedTargetsForBinding,
  type GeneratedDocumentationBindingComposition,
  type GeneratedDocumentationBindingIndex,
  type GeneratedDocumentationBindingIndexedBinding,
  type GeneratedDocumentationBindingIndexedExpansion,
  type GeneratedDocumentationBindingIndexedTarget,
  type GeneratedDocumentationBindingIndexOptions,
  type GeneratedDocumentationBindingInstanceKey,
  type GeneratedDocumentationBindingReference,
  type GeneratedDocumentationBindingResolution,
  type GeneratedDocumentationBindingScope,
  type GeneratedDocumentationBindingSourceIntent,
  type GeneratedDocumentationBindingTargetIdentity
} from "./generated-documentation-binding-index.js";
export {
  GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_HOST_PROJECTION_CONTRACT_VERSION,
  createGeneratedDocumentationBindingHostProjection,
  type GeneratedDocumentationBindingHostBinding,
  type GeneratedDocumentationBindingHostDiagnostic,
  type GeneratedDocumentationBindingHostExpansion,
  type GeneratedDocumentationBindingHostProjection,
  type GeneratedDocumentationBindingHostProjectionPrivacy,
  type GeneratedDocumentationBindingHostProjectionSummary,
  type GeneratedDocumentationBindingHostQuality,
  type GeneratedDocumentationBindingHostTarget
} from "./generated-documentation-binding-host-projection.js";

export interface DocSourceMapIndexOptions {
  path?: string;
}

export interface DocSourceMapIndex {
  artifactCount: number;
  bindingSidecarCount: number;
  /**
   * 中文：doc-source-map 声明的 generated binding sidecar 元数据；不加载
   * sidecar 正文。
   * English: Generated-binding sidecar metadata declared by the doc-source-map;
   * sidecar bodies are not loaded here.
   */
  bindingSidecars: DocSourceMapGeneratedBindingSidecar[];
  /**
   * 中文：普通 doc-source-map 声明的 metadata-only locale-resolution sidecar；不加载
   * resource body、locator 或 resolved text。
   * English: Metadata-only locale-resolution sidecars declared by the ordinary
   * doc-source-map; resource bodies, locators, and resolved text are not loaded.
   */
  localeResolutionSidecars: DocSourceMapLocaleResolutionSidecar[];
  localeResolutionSidecarCount: number;
  /**
   * 中文：普通 doc-source-map 声明的 metadata-only locale-discovery sidecar；不加载
   * controlled declaration、catalog locator、resource/source body 或 range。
   * English: Metadata-only locale-discovery sidecars declared by the ordinary
   * doc-source-map; controlled declarations, catalog locators, resource/source bodies, and ranges are not loaded.
   */
  localeDiscoverySidecars: DocSourceMapLocaleDiscoverySidecar[];
  localeDiscoverySidecarCount: number;
  contract: typeof DOC_SOURCE_MAP_CONTRACT;
  contractVersion?: string;
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  entryCount: number;
  id?: string;
  linkedEntryCount: number;
  path?: string;
  sourceCount: number;
  sourceMaps: DocSourceMapSourceMapLink[];
  sourceMapCount: number;
  sourcesContentPolicy: string;
  status: "available" | "invalid" | "unsupported-version";
  unresolvedEntryCount: number;
}

export interface DocSourceMapIndexedEntry {
  artifactLinks: DocSourceMapArtifactLink[];
  classification?: string;
  diagnostics: string[];
  /**
   * 中文：普通 doc-source-map 中仅保存的 sidecar/binding 引用；不含 binding
   * model 正文。
   * English: Sidecar/binding references stored by an ordinary doc-source-map;
   * never the binding-model body.
   */
  generatedBindingRefs: DocSourceMapGeneratedBindingRef[];
  id: string;
  kind: string;
  relationKind?: string;
  sourceLinks: DocSourceMapSourceLink[];
  symbolId?: string;
  symbolKind?: string;
}

/**
 * 中文：由 doc-source-map entry 指向独立 generated-documentation-binding
 * sidecar 的最小引用。
 * English: Minimal reference from a doc-source-map entry to an independent
 * generated-documentation-binding sidecar.
 */
export interface DocSourceMapGeneratedBindingRef {
  bindingId: string;
  sidecarId: string;
}

/**
 * 中文：普通 doc-source-map 中 generated binding sidecar 的声明元数据。
 * English: Generated-binding sidecar declaration metadata in an ordinary
 * doc-source-map.
 */
export interface DocSourceMapGeneratedBindingSidecar {
  contract?: string;
  contractVersion?: string;
  id: string;
  path?: string;
}

/**
 * 中文：普通 doc-source-map 对独立 locale-resolution sidecar 的最小声明。它只含
 * identity、contract 与相对 artifact path，不承载 DLR data。
 * English: Minimal ordinary doc-source-map declaration of an independent
 * locale-resolution sidecar. It contains only identity, contract, and a relative
 * artifact path; it never carries DLR data.
 */
export interface DocSourceMapLocaleResolutionSidecar {
  contract?: string;
  contractVersion?: string;
  id: string;
  path?: string;
}

/**
 * 中文：普通 doc-source-map 对独立 locale-discovery sidecar 的最小声明。它只含
 * identity、contract 与相对 artifact path，不承载 controlled declaration/catalog data。
 * English: Minimal ordinary doc-source-map declaration of an independent
 * locale-discovery sidecar. It contains only identity, contract, and a relative
 * artifact path; it never carries controlled declaration/catalog data.
 */
export interface DocSourceMapLocaleDiscoverySidecar {
  contract?: string;
  contractVersion?: string;
  id: string;
  path?: string;
}

export interface DocSourceMapSourceLink {
  confidence?: string;
  language?: string;
  path?: string;
  range?: HiaSourceRange;
  rangeSource?: string;
  /** @lang zh-CN 引用层具体来源说明，不推导类别、置信度或权限；旧输入可以省略。 @lang en Reference-level origin description, without inferring category, confidence or permissions; legacy inputs may omit it. */
  rangeSourceDetail?: string;
  sourceId: string;
}

export interface DocSourceMapArtifactLink {
  artifactId: string;
  confidence?: string;
  language?: string;
  path?: string;
  rangeSource?: string;
  /** @lang zh-CN 产物引用层的被动来源说明，不加载工具或改变查询。 @lang en Passive origin description on an artifact reference, without loading tools or changing queries. */
  rangeSourceDetail?: string;
  selector?: string;
}

export interface DocSourceMapSourceMapLink {
  id: string;
  kind?: string;
  language?: string;
  path?: string;
}

/** @lang zh-CN 文档语义筛选；已知字段须为普通自有数据，可选 undefined 按省略处理，未知字段不消费。 @lang en Documentation filters; known fields must be ordinary own data, optional undefined is treated as omitted, and unknown fields are not consumed. */
export interface DocSourceMapQuery {
  /** @lang zh-CN 非空白工件路径；仅规范化分隔符与首个 ./。 @lang en Nonblank artifact path; only separators and the initial ./ are normalized. */
  artifactPath?: string;
  /** @lang zh-CN 非空白精确选择器，仅在提供工件路径时筛选。 @lang en Nonblank exact selector, filtering only when an artifact path is supplied. */
  selector?: string;
  /** @lang zh-CN 非空白源码路径，不读取文件。 @lang en Nonblank source path; no file is read. */
  sourcePath?: string;
  /** @lang zh-CN 一基安全整数位置，省略列为1；仅在提供源码路径时筛选。 @lang en One-based safe integer position, defaulting omitted columns to one; filters only with a source path. */
  position?: HiaSourcePosition;
  /** @lang zh-CN 非空白符号身份，精确匹配不裁剪。 @lang en Nonblank symbol identity, matched exactly without trimming. */
  symbolId?: string;
  /** @lang zh-CN 非空白符号种类，精确匹配。 @lang en Nonblank symbol kind, matched exactly. */
  symbolKind?: string;
}

/** @lang zh-CN 查询状态与借用的条目/query引用，不构成不可变或可公开数据保证。 @lang en Query status and borrowed entry/query references, without an immutability or public-safety guarantee. */
export interface DocSourceMapQueryResult {
  /** @lang zh-CN 原索引诊断及适用的固定查询错误；不修改索引。 @lang en Original index diagnostics plus any fixed query error, without mutating the index. */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN 按原顺序返回的条目引用；invalid/unsupported-version为空。 @lang en Entry references in original order; empty for invalid/unsupported-version. */
  entries: DocSourceMapIndexedEntry[];
  /** @lang zh-CN 返回条目数量，无额外总量估计。 @lang en Returned entry count, without an additional total estimate. */
  matchedEntryCount: number;
  /** @lang zh-CN 原始调用者查询引用，未脱敏，不应用作可信日志数据。 @lang en Original caller query reference, unsanitized and unsuitable as trusted log data. */
  query: DocSourceMapQuery;
  /** @lang zh-CN 非法查询为invalid，其余沿用索引状态。 @lang en Invalid queries yield invalid; otherwise the index status is retained. */
  status: DocSourceMapIndex["status"];
}

/** @lang zh-CN 两种位置偏置；默认向下最近。 @lang en The two position biases; defaults to greatest lower bound. */
export type OrdinarySourceMapBias = "greatest-lower-bound" | "least-upper-bound";

/** @lang zh-CN 可选映射基准与工件路径；无I/O，不构成发布授权。 @lang en Optional map base and artifact path; no I/O or publication authority. */
export interface OrdinarySourceMapIndexOptions {
  artifactPath?: string;
  path?: string;
}

/** @lang zh-CN 独立无正文索引；公开类型可变，调用者不得篡改后继续依赖校验。 @lang en Independent body-free index; the public type is mutable, so validation must not be assumed after tampering. */
export interface OrdinarySourceMapIndex {
  artifactPath?: string;
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN 包含无原始位置的段数量；invalid时为零。 @lang en Segment count including unmapped segments; zero when invalid. */
  mappingCount: number;
  path?: string;
  sources: string[];
  sourceCount: number;
  status: "available" | "invalid";
  /** @lang zh-CN 可用时提供的独立库实例，不含正文；查找会更新内部缓存。 @lang en Independent library instance when available, without bodies; lookups update internal caches. */
  traceMap?: TraceMap;
}

/** @lang zh-CN 普通/null原型自有数据选项；可选偏置省略时统一向下最近，未知值拒绝。 @lang en Plain/null-prototype own-data options; omitted bias consistently defaults to greatest lower bound, while unknown values are rejected. */
export interface OrdinarySourceMapLookupOptions {
  bias?: OrdinarySourceMapBias;
}

/** @lang zh-CN 原始路径及HIA一基行/列，可带映射符号名。 @lang en Original path and HIA one-based line/column, optionally with a mapped symbol name. */
export interface SourceMapOriginalPosition {
  name?: string;
  position: HiaSourcePosition;
  sourcePath: string;
}

/** @lang zh-CN 生成工件的HIA一基行/列，路径可省略。 @lang en HIA one-based line/column in a generated artifact, with optional path. */
export interface SourceMapGeneratedPosition {
  artifactPath?: string;
  position: HiaSourcePosition;
}

/** @lang zh-CN 仅available带原始映射；输入回显不是校验证明。 @lang en Only available results carry original mappings; input echoes are not validation evidence. */
export interface SourceMapOriginalLookupResult {
  diagnostics: HiaDiagnostic[];
  generated: SourceMapGeneratedPosition;
  original?: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

/** @lang zh-CN 仅available带单个生成映射；unmapped不是错误。 @lang en Only available results carry one generated mapping; unmapped is not an error. */
export interface SourceMapGeneratedLookupResult {
  diagnostics: HiaDiagnostic[];
  generated?: SourceMapGeneratedPosition;
  original: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

/** @lang zh-CN 全部生成映射；invalid/unmapped时数组为空。 @lang en All generated mappings; the array is empty for invalid/unmapped results. */
export interface SourceMapAllGeneratedLookupResult {
  diagnostics: HiaDiagnostic[];
  generated: SourceMapGeneratedPosition[];
  original: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

/** @lang zh-CN 显式位置或元数据筛选，只消费已知自有数据；双向输入的旧顺序不证明一致性。 @lang en Explicit position or metadata filters, consuming known own data only; legacy dual-input ordering does not establish consistency. */
export interface SourceLinkedLookupQuery {
  /** @lang zh-CN 可选非空白生成路径；匹配前仅规范化分隔符和首个 ./。 @lang en Optional nonblank generated path, normalizing only separators and the initial ./ for matching. */
  generatedPath?: string;
  /** @lang zh-CN 可选一基安全整数生成位置，省略列为1。 @lang en Optional one-based safe integer generated position, defaulting an omitted column to one. */
  generatedPosition?: HiaSourcePosition;
  /** @lang zh-CN 可选一基安全整数原始位置，配合原始路径时启用反向查找。 @lang en Optional one-based safe integer original position, enabling reverse lookup when paired with the original path. */
  originalPosition?: HiaSourcePosition;
  /** @lang zh-CN 可选非空白原始路径，缺原始位置时保留既有未启用行为。 @lang en Optional nonblank original path, retaining existing inactive behavior without an original position. */
  originalSourcePath?: string;
  /** @lang zh-CN 可选非空白精确选择器，不执行选择器。 @lang en Optional nonblank exact selector; selectors are not executed. */
  selector?: string;
  /** @lang zh-CN 可选非空白精确符号身份，不裁剪正文。 @lang en Optional nonblank exact symbol identity, without trimming. */
  symbolId?: string;
  /** @lang zh-CN 可选非空白精确符号种类。 @lang en Optional nonblank exact symbol kind. */
  symbolKind?: string;
}

/** @lang zh-CN 联合结果；位置失败时条目为空，query回显仍是调用方输入。 @lang en Combined result; failed positions yield no entries, and query echoes remain caller input. */
export interface SourceLinkedLookupResult {
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  generated?: SourceMapGeneratedPosition;
  matchedEntryCount: number;
  original?: SourceMapOriginalPosition;
  query: SourceLinkedLookupQuery;
  status: DocSourceMapIndex["status"] | OrdinarySourceMapIndex["status"] | "unmapped";
}

interface IndexedNode {
  id: string;
  kind?: string;
  language?: string;
  path?: string;
}

/**
 * 中文：从不受信任的 doc-source-map manifest 建立只读查询索引，并把结构、引用、路径、
 * privacy 与版本问题统一投影为 diagnostics。该函数只消费调用方显式提供的 JSON 值：不会
 * 读取 sourceMappingURL、generated binding sidecar 正文或 sourcesContent。
 *
 * English: Builds a read-only query index from an untrusted doc-source-map
 * manifest and projects structure, reference, path, privacy, and version issues
 * into diagnostics. It consumes only caller-provided JSON and never reads a
 * sourceMappingURL, generated-binding sidecar body, or sourcesContent.
 *
 * @lang zh-CN 输入是 manifest 的未知运行时值；`options.path` 只用于 diagnostic 定位。
 * 索引保留 ordinary doc-source-map 的最小 sidecar reference，完整 binding model 始终
 * 留在独立 artifact，防止普通 map 意外承载 binding 正文或私有源码。
 * @lang en Input is an unknown runtime manifest value; `options.path` is used
 * only to locate diagnostics. The index retains ordinary doc-source-map minimal
 * sidecar references, while the complete binding model stays in its independent
 * artifact to prevent a normal map from carrying binding bodies or private source.
 * @lang zh-CN 拒绝访问器、环、非有限/非普通JSON和显式错型字段；保留历史宽输入的省略项。
 * available只证明本索引边界通过，不替代完整wire-schema验证。不会调用toJSON；Proxy反射副作用不受沙箱保证。
 * @lang en Rejects accessors, cycles, non-finite/non-ordinary JSON and declared wrong field types while retaining legacy omissions.
 * available proves this index boundary only, not complete wire-schema validation. Never calls toJSON; proxy reflection side effects are not sandboxed.
 *
 * @param value <lang><zh-CN>待验证的 manifest 运行时值。</zh-CN><en>Runtime manifest value to validate.</en></lang>
 * @param options <lang><zh-CN>可选 diagnostic 路径上下文；默认空对象。</zh-CN><en>Optional diagnostic path context; defaults to an empty object.</en></lang>
 * @returns <lang><zh-CN>可查询的索引；即使无效输入也返回带 diagnostics 的安全空索引。</zh-CN><en>Queryable index; invalid input still returns a safe empty index with diagnostics.</en></lang>
 */
export function createDocSourceMapIndex(value: unknown, options: DocSourceMapIndexOptions = {}): DocSourceMapIndex {
  // <lang><zh-CN>诊断序列是本函数唯一的可观察验证副产物；后续 status 只能由它推导。</zh-CN><en>The diagnostic sequence is this function's sole observable validation byproduct; later status must be derived from it.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];

  // <lang><zh-CN>先拒绝非对象或非普通JSON图，避免后续字段读取执行访问器或泄漏异常正文。</zh-CN><en>Reject non-objects and non-ordinary JSON graphs before field reads can execute accessors or disclose exception text.</en></lang>
  if (!isRecord(value) || !isDocSourceMapJsonDataGraph(value)) {
    // <lang><zh-CN>使用 source-linkage diagnostic 保留调用方 path，但不回显输入正文。</zh-CN><en>Use a source-linkage diagnostic that preserves caller path without echoing input bodies.</en></lang>
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest must contain ordinary finite acyclic JSON data.",
      "error",
      options.path
    ));

    // <lang><zh-CN>无效根节点必须返回同一 index 形状，保证调用方不需要特殊空值分支。</zh-CN><en>An invalid root must return the same index shape so callers need no special null branch.</en></lang>
    return createEmptyIndex({
      diagnostics,
      ...(options.path ? { path: options.path } : {}),
      status: "invalid"
    });
  }

  // <lang><zh-CN>已声明字段先按既有结构约束诊断；历史宽输入的省略项保留，不把索引接纳冒充完整schema证明。</zh-CN><en>Diagnose declared fields against existing structural constraints first, retaining legacy omissions without treating index admission as complete schema proof.</en></lang>
  for (const issue of [...collectDocSourceMapInputIssues(value), ...collectCurrentDocSourceMapIssues(value)]) {
    diagnostics.push(createSourceLinkageDiagnostic("DOC_SOURCE_MAP_MANIFEST_INVALID", issue.message, "error", appendTarget(options.path, issue.target)));
  }

  // <lang><zh-CN>contract 标识确认该 JSON 属于 doc-source-map；错误不阻止收集其余可诊断结构。</zh-CN><en>The contract identifier confirms the JSON is a doc-source-map; an error does not stop collection of other diagnosable structure.</en></lang>
  if (value.contract !== DOC_SOURCE_MAP_CONTRACT) {
    // <lang><zh-CN>仅在 diagnostic data 中归一化 contract 文本，缺失值保持空字符串而不是原始对象。</zh-CN><en>Normalize contract text only in diagnostic data; a missing value remains an empty string rather than the raw object.</en></lang>
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest contract must be doc-source-map.",
      "error",
      options.path,
      {
        contract: stringValue(value.contract) ?? ""
      }
    ));
  }

  // <lang><zh-CN>contractVersion 是版本兼容性判定的可选文本，不把非字符串值转换为可用版本。</zh-CN><en>contractVersion is optional text for compatibility decisions; non-string values are not coerced into usable versions.</en></lang>
  const contractVersion = stringValue(value.contractVersion);
  // <lang><zh-CN>版本不匹配时继续建立索引，以便调用方同时获得结构问题与 unsupported-version 状态。</zh-CN><en>Continue building when versions differ so callers receive both structural issues and unsupported-version status.</en></lang>
  if (contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && contractVersion !== DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_UNSUPPORTED_VERSION",
      `doc-source-map contractVersion must be ${DOC_SOURCE_MAP_CONTRACT_VERSION} or ${DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION}.`,
      contractVersion ? "warning" : "error",
      options.path,
      {
        contractVersion: contractVersion ?? ""
      }
    ));
  }

  // <lang><zh-CN>privacy 是可选对象；非对象时回退空策略，后续默认禁止嵌入内容。</zh-CN><en>privacy is optional object data; non-objects fall back to an empty policy whose later default blocks embedded content.</en></lang>
  const privacy = isRecord(value.privacy) ? value.privacy : {};
  // <lang><zh-CN>sourcesContentPolicy 决定 source 条目能否声明嵌入正文；默认 none 是隐私保守值。</zh-CN><en>sourcesContentPolicy decides whether source entries may declare embedded bodies; default none is the privacy-conservative value.</en></lang>
  const sourcesContentPolicy = stringValue(privacy.sourcesContentPolicy) ?? "none";
  // <lang><zh-CN>artifacts 是供 entry artifact reference 解析的最小节点集合。</zh-CN><en>artifacts is the minimal node collection used to resolve entry artifact references.</en></lang>
  const artifacts = collectIndexedNodes(value.artifacts);
  // <lang><zh-CN>sources 是供 entry source reference 解析的最小节点集合，不包含 source 正文。</zh-CN><en>sources is the minimal node collection used to resolve entry source references and contains no source body.</en></lang>
  const sources = collectIndexedNodes(value.sources);
  // <lang><zh-CN>sourceMaps 只投影 ordinary source map 链接元数据，不能替代完整 binding model。</zh-CN><en>sourceMaps projects ordinary source-map link metadata only and cannot substitute for a complete binding model.</en></lang>
  const sourceMaps = collectIndexedNodes(value.sourceMaps).map(indexedNodeToSourceMapLink);
  // <lang><zh-CN>bindingSidecars 只声明独立 artifact；本函数不加载其 body，维持 sidecar privacy 边界。</zh-CN><en>bindingSidecars declares independent artifacts only; this function does not load their bodies, preserving the sidecar privacy boundary.</en></lang>
  const bindingSidecars = collectGeneratedBindingSidecars(value.generatedBindingSidecars);
  // <lang><zh-CN>localeResolutionSidecars 只保留 metadata-only artifact declaration；它与 generated binding sidecar 不共享 body 或 contract。</zh-CN><en>localeResolutionSidecars retains metadata-only artifact declarations only; it shares neither body nor contract with generated-binding sidecars.</en></lang>
  const localeResolutionSidecars = collectLocaleResolutionSidecars(value.localeResolutionSidecars);
  // <lang><zh-CN>localeDiscoverySidecars 与 resolution sidecar 分离声明；discovery 只说明 catalog allowlist match，不代表 resource 已读取。</zh-CN><en>localeDiscoverySidecars are declared separately from resolution sidecars; discovery proves only a catalog allowlist match, not that a resource was read.</en></lang>
  const localeDiscoverySidecars = collectLocaleDiscoverySidecars(value.localeDiscoverySidecars);
  // <lang><zh-CN>artifactById 为 entry 校验提供稳定 O(1) 身份查找。</zh-CN><en>artifactById provides stable O(1) identity lookup for entry validation.</en></lang>
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  // <lang><zh-CN>sourceById 为 source range 与来源链接建立独立查找表，不能与 artifact identity 混用。</zh-CN><en>sourceById establishes an independent lookup for source ranges and links and must not be conflated with artifact identity.</en></lang>
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  // <lang><zh-CN>bindingSidecarById 只验证最小 sidecar reference 是否已声明，不解析 binding 内容。</zh-CN><en>bindingSidecarById validates only whether a minimal sidecar reference was declared and never parses binding content.</en></lang>
  const bindingSidecarById = new Map(bindingSidecars.map((sidecar) => [sidecar.id, sidecar]));

  // <lang><zh-CN>先检查所有可公开路径，防止 artifact、source、map 或 sidecar 任一边界引入绝对/越界路径。</zh-CN><en>Check every public path first so no artifact, source, map, or sidecar boundary introduces an absolute or escaping path.</en></lang>
  collectPathDiagnostics(diagnostics, artifacts, options.path, "artifact");
  collectPathDiagnostics(diagnostics, sources, options.path, "source");
  collectPathDiagnostics(diagnostics, sourceMaps, options.path, "sourceMap");
  collectPathDiagnostics(diagnostics, bindingSidecars, options.path, "generated binding sidecar");
  collectPathDiagnostics(diagnostics, localeResolutionSidecars, options.path, "locale-resolution sidecar");
  collectPathDiagnostics(diagnostics, localeDiscoverySidecars, options.path, "locale-discovery sidecar");
  // <lang><zh-CN>随后核验 contract reference、sidecar 声明与 sourcesContent policy，保持普通 map 只含 reference 的不变量。</zh-CN><en>Then validate contract references, sidecar declarations, and sourcesContent policy, preserving the invariant that ordinary maps hold references only.</en></lang>
  collectContractRefDiagnostics(diagnostics, value.artifacts, options.path);
  collectGeneratedBindingSidecarDiagnostics(diagnostics, value.generatedBindingSidecars, options.path);
  collectLocaleResolutionSidecarDiagnostics(diagnostics, value.localeResolutionSidecars, options.path);
  collectLocaleDiscoverySidecarDiagnostics(diagnostics, value.localeDiscoverySidecars, options.path);
  collectSourcesContentDiagnostics(diagnostics, value.sources, sourcesContentPolicy, options.path);
  // <lang><zh-CN>manifest 自带 diagnostic 仅被归一化为安全 HIA diagnostic，不信任其原始形状。</zh-CN><en>Manifest-supplied diagnostics are normalized into safe HIA diagnostics only; their raw shape is not trusted.</en></lang>
  diagnostics.push(...normalizeManifestDiagnostics(value.diagnostics, options.path));

  // <lang><zh-CN>entries 只能从对象数组创建；每一项通过三张身份表解析 source、artifact 与 sidecar reference。</zh-CN><en>entries can be created only from an object array; each item resolves source, artifact, and sidecar references through the three identity maps.</en></lang>
  const entries = Array.isArray(value.entries)
    ? value.entries.filter(isRecord).map((entry, index) => createIndexedEntry(entry, index, sourceById, artifactById, bindingSidecarById, diagnostics, options.path))
    : [];

  // <lang><zh-CN>非数组 entries 必须显式诊断，而不是把缺失误报为零条有效 entry。</zh-CN><en>Non-array entries must be diagnosed explicitly rather than misreporting absence as zero valid entries.</en></lang>
  if (!Array.isArray(value.entries)) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest entries must be an array.",
      "error",
      appendTarget(options.path, "entries")
    ));
  }

  // <lang><zh-CN>hasErrors 汇总所有 error severity，是最终 invalid 状态的唯一硬条件。</zh-CN><en>hasErrors aggregates every error severity and is the sole hard condition for final invalid status.</en></lang>
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  // <lang><zh-CN>unsupportedVersion 只在结构无错误时生效，避免覆盖更严重的 invalid 结论。</zh-CN><en>unsupportedVersion applies only when structure has no errors, avoiding replacement of the more severe invalid conclusion.</en></lang>
  const unsupportedVersion = contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && contractVersion !== DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION && !hasErrors;

  // <lang><zh-CN>id 是可选 manifest 身份；空或非字符串值不进入返回索引。</zh-CN><en>id is optional manifest identity; empty or non-string values do not enter the returned index.</en></lang>
  const id = stringValue(value.id);

  // <lang><zh-CN>最终对象只暴露已归一化 metadata、引用和 diagnostics；它不持有 manifest 原文、sidecar body 或 sourcesContent。</zh-CN><en>The final object exposes normalized metadata, references, and diagnostics only; it holds no manifest body, sidecar body, or sourcesContent.</en></lang>
  return {
    artifactCount: artifacts.length,
    bindingSidecarCount: bindingSidecars.length,
    bindingSidecars,
    contract: DOC_SOURCE_MAP_CONTRACT,
    ...(contractVersion ? { contractVersion } : {}),
    diagnostics,
    entries,
    entryCount: entries.length,
    ...(id ? { id } : {}),
    linkedEntryCount: entries.filter(isLinkedEntry).length,
    localeResolutionSidecars,
    localeResolutionSidecarCount: localeResolutionSidecars.length,
    localeDiscoverySidecars,
    localeDiscoverySidecarCount: localeDiscoverySidecars.length,
    ...(options.path ? { path: options.path } : {}),
    sourceCount: sources.length,
    sourceMaps,
    sourceMapCount: sourceMaps.length,
    sourcesContentPolicy,
    status: hasErrors ? "invalid" : unsupportedVersion ? "unsupported-version" : "available",
    unresolvedEntryCount: entries.filter((entry) => !isLinkedEntry(entry)).length
  };
}

/**
 * @lang zh-CN 纯验证入口，返回与索引构建相同的版本、显式字段、引用、路径和隐私diagnostics，不修改输入。
 * 历史宽输入的省略字段保持兼容；本函数不代替独立完整wire-schema验证，不读取文件或sidecar。
 * @lang en Pure validation entry returning the same version, declared-field, reference, path and privacy diagnostics as index construction without mutation.
 * Omitted fields in permissive legacy inputs remain compatible; this does not replace complete wire-schema validation or read files/sidecars.
 * @param value <lang><zh-CN>未知输入，普通JSON预检在任何字段读取之前完成。</zh-CN><en>Unknown input, with ordinary-JSON preflight before field reads.</en></lang>
 * @param options <lang><zh-CN>可选诊断路径，不授予文件访问权限。</zh-CN><en>Optional diagnostic location granting no file access.</en></lang>
 * @returns <lang><zh-CN>本次新建的诊断数组。</zh-CN><en>Diagnostic array created for this call.</en></lang>
 */
export function validateDocSourceMap(value: unknown, options: DocSourceMapIndexOptions = {}): HiaDiagnostic[] {
  return createDocSourceMapIndex(value, options).diagnostics;
}

/** @lang zh-CN 显式迁移结果，不对输入对象或磁盘工件作原位升级。 @lang en Explicit migration result, without upgrading input objects or on-disk artifacts in place. */
export interface DocSourceMapMigrationResult {
  /** @lang zh-CN migrated为旧版转换，already-current为新版独立复制；失败不提供局部产物。 @lang en migrated converts a legacy input; already-current independently clones a current input; failures provide no partial artifact. */
  status: "migrated" | "already-current" | "invalid" | "unsupported-version";
  /** @lang zh-CN owner验证通过的新容器；保留开放JSON扩展及显式获准的源码正文，返回值不代表授权公开。 @lang en New containers passing owner validation, retaining open JSON extensions and explicitly permitted source bodies; returning data grants no publication authority. */
  manifest?: Record<string, unknown>;
  /** @lang zh-CN 拒绝时使用静态诊断，不回显原始来源或源码正文。 @lang en Static refusal diagnostics, without echoing raw origins or source bodies. */
  diagnostics: HiaDiagnostic[];
}

/**
 * @lang zh-CN 显式将精确旧版映射转换为当前版，保留具体来源及开放JSON扩展；当前版返回独立复制品。
 * 未知来源、信息冲突、不完整结构或隐私错误均拒绝，失败不返回局部产物。只消费调用方数据，不读取文件或sidecar、不写磁盘、不调用JSON hooks。
 * @lang en Explicitly converts an exact legacy map to the current version, retaining concrete origins and open JSON extensions; current inputs return independent clones.
 * Unknown origins, information conflicts, incomplete structure or privacy errors are refused without partial artifacts. Consumes caller data only, without file/sidecar reads, disk writes or JSON hooks.
 * @param value <lang><zh-CN>未知运行时输入，必须通过普通JSON和owner边界。</zh-CN><en>Unknown runtime input that must pass ordinary-JSON and owner boundaries.</en></lang>
 * @param options <lang><zh-CN>可选诊断路径，默认空；不授予文件访问。</zh-CN><en>Optional diagnostic path, empty by default, granting no file access.</en></lang>
 * @returns <lang><zh-CN>当前版独立容器或安全诊断；Proxy副作用、资源消耗和并发输入突变不受沙箱保证。</zh-CN><en>Independent current containers or safe diagnostics; proxy effects, resource exhaustion and concurrent input mutation are not sandboxed.</en></lang>
 */
export function migrateDocSourceMap(value: unknown, options: DocSourceMapIndexOptions = {}): DocSourceMapMigrationResult {
  /** @lang zh-CN 所有失败均通过静态文本隔离，不转发含原数据的局部索引。 @lang en Isolates every failure with static text rather than forwarding partial indexes containing source data. */
  const refused = (message: string, status: "invalid" | "unsupported-version" = "invalid"): DocSourceMapMigrationResult => ({
    status, diagnostics: [createSourceLinkageDiagnostic("DOC_SOURCE_MAP_MIGRATION_INVALID", message, "error", options.path)]
  });
  // <lang><zh-CN>先运行既有普通JSON/版本/隐私门禁；未知版本从不按兼容范围猜测。</zh-CN><en>Run existing ordinary-JSON/version/privacy gates first; unknown versions are never guessed compatible.</en></lang>
  const before = createDocSourceMapIndex(value, options);
  if (before.status === "unsupported-version") return refused("Migration requires an explicitly supported mapping version.", "unsupported-version");
  if (before.status !== "available" || !isRecord(value)) return refused("Mapping input must pass owner validation before migration.");
  try {
    // <lang><zh-CN>内部准备只复制和按明确映射转换，结果仍必须重新通过新版必要结构与语义检查。</zh-CN><en>Preparation only clones and converts explicit mappings; the result must still pass current required-structure and semantic checks.</en></lang>
    const prepared = prepareDocSourceMapMigration(value);
    if (!prepared.manifest) return refused(prepared.issue ?? "Mapping could not be migrated losslessly.");
    const after = createDocSourceMapIndex(prepared.manifest, options);
    if (after.status !== "available") return refused("Migrated mapping must satisfy current structure, provenance and privacy requirements.");
    return { status: before.contractVersion === DOC_SOURCE_MAP_CONTRACT_VERSION ? "already-current" : "migrated", manifest: prepared.manifest, diagnostics: after.diagnostics };
  } catch {
    // <lang><zh-CN>反射/复制异常的原始正文可能含私有信息，只返回固定错误。</zh-CN><en>Raw reflection/copy errors may contain private information; return a fixed error only.</en></lang>
    return refused("Mapping could not be copied safely for migration.");
  }
}

/**
 * @lang zh-CN 建立无正文的普通位置映射索引；复制元数据，不抓取sourceMappingURL，不读取sourcesContent或未知扩展。
 * @lang en Builds a body-free ordinary position-map index; copies metadata without fetching sourceMappingURL or reading sourcesContent/unknown extensions.
 * @param value <lang><zh-CN>调用方显式提供的JSON字符串、编码/解码对象或TraceMap实例。</zh-CN><en>Caller-provided JSON string, encoded/decoded object or TraceMap instance.</en></lang>
 * @param options <lang><zh-CN>可选映射基准和工件路径；默认空对象，路径不是发布授权。</zh-CN><en>Optional map base and artifact path; defaults to an empty object and does not authorize publication.</en></lang>
 * @returns <lang><zh-CN>独立索引；无效输入返回空索引与固定诊断，不回显原始异常。不是完整ECMA-426验证器。</zh-CN><en>Independent index; invalid input returns an empty index with a fixed diagnostic, without raw errors. Not a complete ECMA-426 validator.</en></lang>
 */
export function createOrdinarySourceMapIndex(value: SourceMapInput | unknown, options: OrdinarySourceMapIndexOptions = {}): OrdinarySourceMapIndex {
  // <lang><zh-CN>诊断属于本次索引，不携带调用方正文或底层异常信息。</zh-CN><en>Diagnostics belong to this index and carry neither caller bodies nor underlying error text.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];

  try {
    // <lang><zh-CN>先投影已知元数据，杜绝库实例短路及sourcesContent随索引外泄。</zh-CN><en>Project known metadata first, preventing library instance shortcuts and sourcesContent leakage through the index.</en></lang>
    const traceMap = createBodyFreeOrdinaryTraceMap(value, options.path);
    // <lang><zh-CN>统计映射段数量作为调用方诊断摘要，计数包含无原始位置的段。</zh-CN><en>Count mapping segments for the caller summary, including segments without original positions.</en></lang>
    let mappingCount = 0;
    eachMapping(traceMap, () => {
      mappingCount += 1;
    });

    // <lang><zh-CN>公开源列表仅保留规范化路径，正文从未进入此独立TraceMap。</zh-CN><en>The public source list contains normalized paths only; bodies never enter this independent TraceMap.</en></lang>
    const sources = traceMap.sources
      .map((source) => typeof source === "string" ? normalizeLookupPath(source) : "")
      .filter((source) => source.length > 0);

    return {
      ...(options.artifactPath ? { artifactPath: normalizeLookupPath(options.artifactPath) } : {}),
      diagnostics,
      mappingCount,
      ...(options.path ? { path: options.path } : {}),
      sources,
      sourceCount: sources.length,
      status: "available",
      traceMap
    };
  } catch {
    diagnostics.push(createSourceLinkageDiagnostic(
      "ORDINARY_SOURCE_MAP_INVALID",
      "Ordinary source map metadata could not be read safely.",
      "error",
      options.path
    ));

    return {
      ...(options.artifactPath ? { artifactPath: normalizeLookupPath(options.artifactPath) } : {}),
      diagnostics,
      mappingCount: 0,
      ...(options.path ? { path: options.path } : {}),
      sources: [],
      sourceCount: 0,
      status: "invalid"
    };
  }
}

/**
 * @lang zh-CN 查询已通过版本与隐私检查的文档化语义链路；无效或不支持版本的索引只返回诊断和状态。
 * @lang en Queries documentation linkage after version and privacy validation; invalid or unsupported indexes return diagnostics and status only.
 * @param index <lang><zh-CN>由 createDocSourceMapIndex 建立的只读索引。</zh-CN><en>Read-only index created by createDocSourceMapIndex.</en></lang>
 * @param query <lang><zh-CN>普通对象或null原型筛选；默认匹配全部可用条目。已知字段的访问器/错误值拒绝，未知字段不读。</zh-CN><en>Plain or null-prototype filters, defaulting to all available entries. Known-field accessors/invalid values are rejected; unknown fields are not read.</en></lang>
 * @returns <lang><zh-CN>筛选结果与诊断；非法查询返回invalid及空条目，不透传异常正文。原query与条目仍为借用引用，无I/O；Proxy反射不是沙箱。</zh-CN><en>Results and diagnostics; invalid queries return invalid with no entries and no exception text. Original query/entries remain borrowed references, without I/O; proxy reflection is not sandboxed.</en></lang>
 */
export function queryDocSourceMapIndex(index: DocSourceMapIndex, query: DocSourceMapQuery = {}): DocSourceMapQueryResult {
  // <lang><zh-CN>只为匹配建立已知字段快照，避免筛选中反复读取调用者访问器或把错误值当作省略。</zh-CN><en>Snapshot known fields for matching to avoid repeated caller accessors and treating invalid values as omissions.</en></lang>
  const prepared = prepareDocSourceMapQuery(query);
  if (!prepared) {
    return {
      diagnostics: [...index.diagnostics, createSourceLinkageDiagnostic("DOC_SOURCE_MAP_QUERY_INVALID", "Documentation query fields require ordinary data, nonblank strings and positive safe integer coordinates.", "error", index.path)],
      entries: [], matchedEntryCount: 0, query, status: "invalid"
    };
  }
  // <lang><zh-CN>状态门禁先于筛选，避免版本 warning 或隐私 error 的索引仍返回可消费映射。</zh-CN><en>Gate by status before filtering so indexes with version warnings or privacy errors cannot return consumable mappings.</en></lang>
  const entries = index.status === "available"
    ? index.entries.filter((entry) => matchesDocSourceMapQuery(entry, prepared))
    : [];

  return {
    diagnostics: index.diagnostics,
    entries,
    matchedEntryCount: entries.length,
    query,
    status: index.status
  };
}

/**
 * @lang zh-CN 按非空白符号身份精确查询，无I/O；无效值/索引返回空数组，诊断需使用完整查询API。
 * @lang en Queries an exact nonblank symbol identity without I/O; invalid values/indexes return an empty array, with diagnostics available through the full query API.
 * @param index <lang><zh-CN>本包建立且未篡改的索引。</zh-CN><en>Untampered index created by this package.</en></lang>
 * @param symbolId <lang><zh-CN>非空白符号身份，不裁剪。</zh-CN><en>Nonblank symbol identity, without trimming.</en></lang>
 * @returns <lang><zh-CN>借用的条目引用，保持原顺序。</zh-CN><en>Borrowed entry references in original order.</en></lang>
 */
export function findDocSourceMapEntriesBySymbol(index: DocSourceMapIndex, symbolId: string): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, { symbolId }).entries;
}

/**
 * @lang zh-CN 按源码路径及可选位置查询，无I/O；范围沿用两端包含，省略列为1。
 * @lang en Queries by source path and optional position without I/O; ranges retain inclusive endpoints and omitted columns default to one.
 * @param index <lang><zh-CN>本包建立且未篡改的索引。</zh-CN><en>Untampered index created by this package.</en></lang>
 * @param sourcePath <lang><zh-CN>非空白源码路径，规范化分隔符与首个 ./。</zh-CN><en>Nonblank source path, normalizing separators and the initial ./.</en></lang>
 * @param position <lang><zh-CN>可选一基安全整数位置，undefined按省略处理。</zh-CN><en>Optional one-based safe integer position; undefined is treated as omitted.</en></lang>
 * @returns <lang><zh-CN>有序借用条目；无效查询为空，诊断使用完整查询API。</zh-CN><en>Ordered borrowed entries; invalid queries are empty, with diagnostics available through the full API.</en></lang>
 */
export function findDocSourceMapEntriesBySource(
  index: DocSourceMapIndex,
  sourcePath: string,
  position?: HiaSourcePosition
): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, {
    sourcePath,
    ...(position !== undefined ? { position } : {})
  }).entries;
}

/**
 * @lang zh-CN 按工件路径及可选精确选择器查询，不读取工件或执行选择器。
 * @lang en Queries by artifact path and optional exact selector without reading artifacts or executing selectors.
 * @param index <lang><zh-CN>本包建立且未篡改的索引。</zh-CN><en>Untampered index created by this package.</en></lang>
 * @param artifactPath <lang><zh-CN>非空白工件路径，规范化分隔符与首个 ./。</zh-CN><en>Nonblank artifact path, normalizing separators and the initial ./.</en></lang>
 * @param selector <lang><zh-CN>可选非空白选择器，undefined按省略处理。</zh-CN><en>Optional nonblank selector; undefined is treated as omitted.</en></lang>
 * @returns <lang><zh-CN>有序借用条目；无效查询为空，诊断使用完整查询API。</zh-CN><en>Ordered borrowed entries; invalid queries are empty, with diagnostics available through the full API.</en></lang>
 */
export function findDocSourceMapEntriesByArtifact(
  index: DocSourceMapIndex,
  artifactPath: string,
  selector?: string
): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, {
    artifactPath,
    ...(selector !== undefined ? { selector } : {})
  }).entries;
}

/**
 * @lang zh-CN 从生成位置追溯原始位置；无I/O，更新库内部缓存。
 * @lang en Traces generated positions to originals without I/O, updating internal library caches.
 * @param index <lang><zh-CN>本包创建且未篡改的位置索引。</zh-CN><en>Untampered position index created by this package.</en></lang>
 * @param generatedPosition <lang><zh-CN>普通/null原型的HIA一基安全整数行/列自有数据；省略列为1，已知getter不执行。</zh-CN><en>Plain/null-prototype own HIA positive safe integer line/column data; omitted column defaults to 1 and known getters never execute.</en></lang>
 * @param options <lang><zh-CN>普通/null原型自有数据偏置，仅接受两种公开值或省略；未知扩展不读。</zh-CN><en>Plain/null-prototype own-data bias accepting only the two public values or omission; extensions are not read.</en></lang>
 * @returns <lang><zh-CN>available映射、unmapped或带固定诊断的invalid；原始位置仍回显，非脱敏/序列化保证，Proxy反射不受沙箱保护。</zh-CN><en>Available mapping, unmapped, or invalid with a fixed diagnostic; raw positions remain echoed without redaction/serialization guarantees or a proxy-reflection sandbox.</en></lang>
 */
export function findOriginalPositionForGenerated(
  index: OrdinarySourceMapIndex,
  generatedPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapOriginalLookupResult {
  // <lang><zh-CN>输入上下文与成功时才出现的原始映射分开保留。</zh-CN><en>Retain input context separately from original mappings that appear only on success.</en></lang>
  const generated = createGeneratedPosition(index.artifactPath, generatedPosition);

  // <lang><zh-CN>HIA坐标是一基正整数，拒绝静默夹值或让底层库抛出异常。</zh-CN><en>HIA coordinates are positive one-based integers; reject silent clamping and underlying library exceptions.</en></lang>
  const position = prepareOrdinaryLookupPosition(generatedPosition);
  if (!position) {
    return { diagnostics: invalidOrdinaryPositionDiagnostics(index), generated, status: "invalid" };
  }
  // <lang><zh-CN>偏置只从已投影自有数据消费，不能将错误值静默当默认偏置。</zh-CN><en>Consume bias from projected own data only, never silently treating an invalid value as the default.</en></lang>
  const preparedOptions = prepareOrdinaryLookupOptions(options);
  if (!preparedOptions) return { diagnostics: invalidOrdinaryQueryDiagnostics(index), generated, status: "invalid" };

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      generated,
      status: index.status
    };
  }

  // <lang><zh-CN>仅在库边界将HIA列转换为零基列。</zh-CN><en>Convert HIA columns to zero-based columns only at the library boundary.</en></lang>
  const original = originalPositionFor(index.traceMap, {
    line: position.line,
    column: hiaColumnToSourceMapColumn(position.column),
    bias: toTraceMapBias(preparedOptions.bias)
  });

  if (!original.source || !original.line || original.column === null) {
    return {
      diagnostics: index.diagnostics,
      generated,
      status: "unmapped"
    };
  }

  return {
    diagnostics: index.diagnostics,
    generated,
    original: {
      ...(original.name ? { name: original.name } : {}),
      position: {
        line: original.line,
        column: sourceMapColumnToHiaColumn(original.column)
      },
      sourcePath: normalizeLookupPath(original.source)
    },
    status: index.status
  };
}

/**
 * @lang zh-CN 从原始位置查找一个生成位置；无I/O，更新库内部缓存。
 * @lang en Finds one generated position for an original without I/O, updating internal library caches.
 * @param index <lang><zh-CN>本包创建且未篡改的位置索引。</zh-CN><en>Untampered position index created by this package.</en></lang>
 * @param sourcePath <lang><zh-CN>原始或库已解析的非空白primitive路径；仅沿用分隔符和首个./规范化，不裁剪。</zh-CN><en>Nonblank primitive original/library-resolved path, retaining separator/initial-./ normalization without trimming.</en></lang>
 * @param originalPosition <lang><zh-CN>普通/null原型一基安全整数自有坐标；省略列为1，已知getter不执行。</zh-CN><en>Plain/null-prototype own one-based safe integer coordinates; omitted column defaults to 1 and known getters never execute.</en></lang>
 * @param options <lang><zh-CN>普通/null原型自有数据偏置，仅两种公开值或省略。</zh-CN><en>Plain/null-prototype own-data bias with the two public values or omission only.</en></lang>
 * @returns <lang><zh-CN>映射、unmapped或固定诊断invalid；原输入回显未脱敏，非法runtime输入不承诺回显类型/可序列化；不是Proxy沙箱。</zh-CN><en>Mapping, unmapped or invalid with fixed diagnostics; raw input echoes are unsanitized and invalid runtime inputs have no echo-type/serialization guarantee or proxy sandbox.</en></lang>
 */
export function findGeneratedPositionForOriginal(
  index: OrdinarySourceMapIndex,
  sourcePath: string,
  originalPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapGeneratedLookupResult {
  // <lang><zh-CN>回显保持原位置身份，非string路径不调用转换钩子；只有快照进入库查询。</zh-CN><en>Echoes retain raw position identity without invoking non-string path conversion hooks; only snapshots reach library lookups.</en></lang>
  const original = createOriginalPosition(sourcePath, originalPosition);

  // <lang><zh-CN>反向查找采用同一坐标约束，空结果不能掩盖非法输入。</zh-CN><en>Reverse lookups share the coordinate constraint; empty results must not conceal invalid input.</en></lang>
  const position = prepareOrdinaryLookupPosition(originalPosition);
  if (!position) {
    return { diagnostics: invalidOrdinaryPositionDiagnostics(index), original, status: "invalid" };
  }
  // <lang><zh-CN>路径与偏置须符合已声明字段，拒绝不能伪装成合法未命中。</zh-CN><en>Paths and biases must match declared fields; rejection cannot masquerade as a valid miss.</en></lang>
  const preparedOptions = prepareOrdinaryLookupOptions(options);
  if (typeof sourcePath !== "string" || !sourcePath.trim() || !preparedOptions) return { diagnostics: invalidOrdinaryQueryDiagnostics(index), original, status: "invalid" };

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      original,
      status: index.status
    };
  }

  // <lang><zh-CN>调用成熟映射库前转换坐标，返回时再恢复HIA坐标。</zh-CN><en>Convert coordinates before calling the mature mapping library, then restore HIA coordinates on return.</en></lang>
  const generated = generatedPositionFor(index.traceMap, {
    source: normalizeLookupPath(sourcePath),
    line: position.line,
    column: hiaColumnToSourceMapColumn(position.column),
    bias: toTraceMapBias(preparedOptions.bias)
  });

  if (!generated.line || generated.column === null) {
    return {
      diagnostics: index.diagnostics,
      original,
      status: "unmapped"
    };
  }

  return {
    diagnostics: index.diagnostics,
    generated: createGeneratedPosition(index.artifactPath, {
      line: generated.line,
      column: sourceMapColumnToHiaColumn(generated.column)
    }),
    original,
    status: index.status
  };
}

/**
 * @lang zh-CN 查找原始位置对应的全部生成位置；无I/O，更新库内部缓存。
 * @lang en Finds all generated positions for an original without I/O, updating internal library caches.
 * @param index <lang><zh-CN>本包创建且未篡改的位置索引。</zh-CN><en>Untampered position index created by this package.</en></lang>
 * @param sourcePath <lang><zh-CN>原始或库已解析的非空白primitive路径，不调用对象转换钩子。</zh-CN><en>Nonblank primitive original/library-resolved path without object conversion hooks.</en></lang>
 * @param originalPosition <lang><zh-CN>普通/null原型一基安全整数自有坐标；省略列为1，已知getter不执行。</zh-CN><en>Plain/null-prototype own one-based safe integer coordinates; omitted column defaults to 1 and known getters never execute.</en></lang>
 * @param options <lang><zh-CN>普通/null原型自有偏置数据，默认向下最近，覆盖库的全部查找默认偏置；错误值拒绝。</zh-CN><en>Plain/null-prototype own bias data, defaulting to greatest lower bound over the library all-lookup default; invalid values are rejected.</en></lang>
 * @returns <lang><zh-CN>映射数组及状态，invalid/unmapped时数组为空；原输入回显未脱敏，不承诺非法runtime回显类型/序列化或Proxy沙箱。</zh-CN><en>Mapping array and status, empty on invalid/unmapped; raw echoes are unsanitized with no invalid-runtime echo-type/serialization or proxy-sandbox guarantee.</en></lang>
 */
export function findAllGeneratedPositionsForOriginal(
  index: OrdinarySourceMapIndex,
  sourcePath: string,
  originalPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapAllGeneratedLookupResult {
  // <lang><zh-CN>原输入回显不参与坐标求值，独立快照才可用于一对多查找。</zh-CN><en>Raw echoes never participate in coordinate evaluation; only independent snapshots drive one-to-many lookups.</en></lang>
  const original = createOriginalPosition(sourcePath, originalPosition);

  // <lang><zh-CN>反向查找采用同一坐标约束，空结果不能掩盖非法输入。</zh-CN><en>Reverse lookups share the coordinate constraint; empty results must not conceal invalid input.</en></lang>
  const position = prepareOrdinaryLookupPosition(originalPosition);
  if (!position) {
    return { diagnostics: invalidOrdinaryPositionDiagnostics(index), generated: [], original, status: "invalid" };
  }
  // <lang><zh-CN>错误路径/偏置只返回固定查询拒绝，保留空的生成映射数组。</zh-CN><en>Invalid paths/biases return fixed query rejection with an empty generated-mapping array.</en></lang>
  const preparedOptions = prepareOrdinaryLookupOptions(options);
  if (typeof sourcePath !== "string" || !sourcePath.trim() || !preparedOptions) return { diagnostics: invalidOrdinaryQueryDiagnostics(index), generated: [], original, status: "invalid" };

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      generated: [],
      original,
      status: index.status
    };
  }

  // <lang><zh-CN>一对多投影保留库顺序，并逐项转换回HIA列。</zh-CN><en>Preserve library order for one-to-many projections and convert each result back to HIA columns.</en></lang>
  const generated = allGeneratedPositionsFor(index.traceMap, {
    source: normalizeLookupPath(sourcePath),
    line: position.line,
    column: hiaColumnToSourceMapColumn(position.column),
    bias: toTraceMapBias(preparedOptions.bias)
  }).map((position) => createGeneratedPosition(index.artifactPath, {
    line: position.line,
    column: sourceMapColumnToHiaColumn(position.column)
  }));

  return {
    diagnostics: index.diagnostics,
    generated,
    original,
    status: generated.length > 0 ? index.status : "unmapped"
  };
}

/**
 * @lang zh-CN 联合位置map与文档语义map；无I/O，位置失败不能退化为宽泛文档结果。
 * @lang en Combines position and documentation-semantic maps without I/O; failed positions cannot fall back to broad document results.
 * @param docSourceMapIndex <lang><zh-CN>已验证文档索引，非available时无条目。</zh-CN><en>Validated documentation index; no entries when non-available.</en></lang>
 * @param ordinarySourceMapIndex <lang><zh-CN>本包创建且未篡改的位置索引；位置查询更新内部缓存。</zh-CN><en>Untampered position index created by this package; position lookups update internal caches.</en></lang>
 * @param query <lang><zh-CN>普通/null原型位置或元数据筛选；已知字段须为自有数据，undefined按省略。仅元数据时不要求普通map可用；双向输入保留旧顺序。</zh-CN><en>Plain/null-prototype position or metadata filters; known fields must be own data and undefined means omission. Metadata-only queries need no available ordinary map; dual inputs retain legacy ordering.</en></lang>
 * @returns <lang><zh-CN>联合结果与固定诊断；非法查询不执行已知getter，不返回位置或条目。原query回显未脱敏；Proxy反射不受沙箱保护。</zh-CN><en>Combined results with fixed diagnostics; invalid queries execute no known getters and return no positions or entries. The original query echo is unsanitized; proxy reflection is not sandboxed.</en></lang>
 */
export function querySourceLinkedPosition(
  docSourceMapIndex: DocSourceMapIndex,
  ordinarySourceMapIndex: OrdinarySourceMapIndex,
  query: SourceLinkedLookupQuery
): SourceLinkedLookupResult {
  // <lang><zh-CN>先投影全部已知字段再查位置，错误值不能被truthiness省略，也不提前触发库缓存。</zh-CN><en>Project every known field before position lookup so invalid values cannot disappear by truthiness or trigger library caches prematurely.</en></lang>
  const prepared = prepareSourceLinkedQuery(query);
  if ("error" in prepared) {
    return {
      diagnostics: [...new Set([...docSourceMapIndex.diagnostics, ...ordinarySourceMapIndex.diagnostics]), ...(prepared.error === "position"
        ? [createSourceLinkageDiagnostic("ORDINARY_SOURCE_MAP_POSITION_INVALID", "HIA lookup positions require positive integer lines and optional positive integer columns.", "error", ordinarySourceMapIndex.path)]
        : prepared.error === "semantic"
          ? [createSourceLinkageDiagnostic("DOC_SOURCE_MAP_QUERY_INVALID", "Documentation query fields require ordinary data, nonblank strings and positive safe integer coordinates.", "error", docSourceMapIndex.path)]
          : [createSourceLinkageDiagnostic("SOURCE_LINKED_LOOKUP_QUERY_INVALID", "Combined lookup fields require ordinary own data and nonblank strings.", "error", docSourceMapIndex.path)])],
      entries: [], matchedEntryCount: 0, query, status: "invalid"
    };
  }
  // <lang><zh-CN>匹配与坐标转换只读取独立快照；结果仍回显原query以保持既有身份关系。</zh-CN><en>Matching and coordinate conversion read the independent snapshot only; results still echo the original query to retain identity.</en></lang>
  const input = prepared.query;
  // <lang><zh-CN>两个方向的结果与累计状态沿用原处理顺序，前一次失败不会被后一次成功覆盖。</zh-CN><en>Directional results and accumulated status retain the original processing order; a later success never overrides an earlier failure.</en></lang>
  let original: SourceMapOriginalPosition | undefined;
  let generated: SourceMapGeneratedPosition | undefined;
  let status: SourceLinkedLookupResult["status"] = docSourceMapIndex.status;
  // <lang><zh-CN>保留查找本身的新增诊断，避免只收集索引诊断而丢失坐标拒绝原因。</zh-CN><en>Retain lookup-specific diagnostics rather than collecting index diagnostics only and losing coordinate rejection reasons.</en></lang>
  const lookupDiagnostics: HiaDiagnostic[] = [...ordinarySourceMapIndex.diagnostics];

  if (input.generatedPosition) {
    // <lang><zh-CN>生成位置先追溯原始位置，保留查找特有诊断。</zh-CN><en>Trace the generated position to its original first, retaining lookup-specific diagnostics.</en></lang>
    const generatedLookup = findOriginalPositionForGenerated(ordinarySourceMapIndex, input.generatedPosition);
    lookupDiagnostics.push(...generatedLookup.diagnostics);
    original = generatedLookup.original;
    generated = createGeneratedPosition(input.generatedPath ?? generatedLookup.generated.artifactPath, input.generatedPosition);
    status = generatedLookup.status === "available" ? status : generatedLookup.status;
  }

  if (input.originalSourcePath && input.originalPosition) {
    original = createOriginalPosition(input.originalSourcePath, input.originalPosition);
    // <lang><zh-CN>原始路径/位置成对提供时沿用后处理顺序，不据此证明双向一致。</zh-CN><en>Process paired original path/position afterward as before, without inferring bidirectional consistency.</en></lang>
    const generatedLookup = findGeneratedPositionForOriginal(ordinarySourceMapIndex, input.originalSourcePath, input.originalPosition);
    lookupDiagnostics.push(...generatedLookup.diagnostics);
    generated = generatedLookup.generated;
    status = generatedLookup.status === "available" ? status : generatedLookup.status;
  }

  // <lang><zh-CN>只把投影后的字符串和成功解析位置交给语义查询，保持原筛选交集。</zh-CN><en>Pass projected strings and resolved positions to semantic querying, retaining existing filter intersections.</en></lang>
  const docQuery: DocSourceMapQuery = {
    ...(input.symbolId ? { symbolId: input.symbolId } : {}),
    ...(input.symbolKind ? { symbolKind: input.symbolKind } : {}),
    ...(original ? { sourcePath: original.sourcePath, position: original.position } : {}),
    ...(generated?.artifactPath ?? input.generatedPath ? { artifactPath: generated?.artifactPath ?? input.generatedPath } : {}),
    ...(input.selector ? { selector: input.selector } : {})
  };
  // <lang><zh-CN>语义结果独立保留诊断与版本状态，不能从位置成功推导其可用。</zh-CN><en>Retain semantic diagnostics and version status independently; position success does not imply semantic availability.</en></lang>
  const docQueryResult = queryDocSourceMapIndex(docSourceMapIndex, docQuery);
  // <lang><zh-CN>语义筛选拒绝也必须向联合状态传播，不能保留伪available。</zh-CN><en>Propagate rejected semantic filters into the combined status rather than preserving a false available result.</en></lang>
  if (docQueryResult.status !== "available") status = docQueryResult.status;

  return {
    diagnostics: [
      ...docQueryResult.diagnostics,
      ...new Set(lookupDiagnostics)
    ],
    // <lang><zh-CN>位置查找失败时不能退化为文件级/全量条目，失败状态只返回诊断。</zh-CN><en>Failed position lookup must not fall back to file-wide/all entries; failed states return diagnostics only.</en></lang>
    entries: status === "available" ? docQueryResult.entries : [],
    ...(generated ? { generated } : {}),
    matchedEntryCount: status === "available" ? docQueryResult.matchedEntryCount : 0,
    ...(original ? { original } : {}),
    query,
    status
  };
}

function createIndexedEntry(
  entry: Record<string, unknown>,
  index: number,
  sourceById: Map<string, IndexedNode>,
  artifactById: Map<string, IndexedNode>,
  bindingSidecarById: Map<string, IndexedNode>,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): DocSourceMapIndexedEntry {
  const id = stringValue(entry.id) ?? `entry:${index + 1}`;
  const sourceLinks = Array.isArray(entry.sourceRefs)
    ? entry.sourceRefs.filter(isRecord).map((sourceRef) => createSourceLink(sourceRef, sourceById))
    : [];
  const artifactLinks = Array.isArray(entry.artifactRefs)
    ? entry.artifactRefs.filter(isRecord).map((artifactRef) => createArtifactLink(artifactRef, artifactById))
    : [];
  const generatedBindingRefs = Array.isArray(entry.generatedBindingRefs)
    ? entry.generatedBindingRefs.filter(isRecord).flatMap((bindingRef) => {
      const bindingId = stringValue(bindingRef.bindingId);
      const sidecarId = stringValue(bindingRef.sidecarId);
      return bindingId && sidecarId ? [{ bindingId, sidecarId }] : [];
    })
    : [];

  for (const sourceRef of Array.isArray(entry.sourceRefs) ? entry.sourceRefs.filter(isRecord) : []) {
    const sourceId = stringValue(sourceRef.sourceId);
    if (sourceId && !sourceById.has(sourceId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_UNRESOLVED",
        `doc-source-map entry references unknown source "${sourceId}".`,
        "warning",
        appendTarget(targetPath, `entries.${index}.sourceRefs`),
        {
          entryId: id,
          sourceId
        }
      ));
    }
  }

  for (const artifactRef of Array.isArray(entry.artifactRefs) ? entry.artifactRefs.filter(isRecord) : []) {
    const artifactId = stringValue(artifactRef.artifactId);
    if (artifactId && !artifactById.has(artifactId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_UNRESOLVED",
        `doc-source-map entry references unknown artifact "${artifactId}".`,
        "warning",
        appendTarget(targetPath, `entries.${index}.artifactRefs`),
        {
          artifactId,
          entryId: id
        }
      ));
    }
  }

  for (const bindingRef of Array.isArray(entry.generatedBindingRefs) ? entry.generatedBindingRefs.filter(isRecord) : []) {
    const bindingId = stringValue(bindingRef.bindingId);
    const sidecarId = stringValue(bindingRef.sidecarId);
    if (!bindingId || !sidecarId || !bindingSidecarById.has(sidecarId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_BINDING_SIDECAR_UNRESOLVED",
        "doc-source-map generated binding reference must name a bindingId and declared sidecarId.",
        "warning",
        appendTarget(targetPath, `entries.${index}.generatedBindingRefs`),
        {
          bindingId: bindingId ?? "",
          entryId: id,
          sidecarId: sidecarId ?? ""
        }
      ));
    }
  }

  const item: DocSourceMapIndexedEntry = {
    artifactLinks,
    diagnostics: collectEntryDiagnosticCodes(entry.diagnostics),
    generatedBindingRefs,
    id,
    kind: stringValue(entry.kind) ?? "entry",
    sourceLinks
  };
  const classification = stringValue(entry.classification);
  const relationKind = stringValue(entry.relationKind);
  const symbolId = stringValue(entry.symbolId);
  const symbolKind = stringValue(entry.symbolKind);

  if (classification) {
    item.classification = classification;
  }

  if (relationKind) {
    item.relationKind = relationKind;
  }

  if (symbolId) {
    item.symbolId = symbolId;
  }

  if (symbolKind) {
    item.symbolKind = symbolKind;
  }

  return item;
}

function createSourceLink(sourceRef: Record<string, unknown>, sourceById: Map<string, IndexedNode>): DocSourceMapSourceLink {
  const sourceId = stringValue(sourceRef.sourceId) ?? "";
  const source = sourceById.get(sourceId);
  const link: DocSourceMapSourceLink = {
    sourceId
  };
  const confidence = stringValue(sourceRef.confidence);
  const range = normalizeRange(sourceRef.range);
  const rangeSource = stringValue(sourceRef.rangeSource);

  if (confidence) {
    link.confidence = confidence;
  }

  if (source?.language) {
    link.language = source.language;
  }

  if (source?.path) {
    link.path = source.path;
  }

  if (range) {
    link.range = range;
  }

  if (rangeSource) {
    link.rangeSource = rangeSource;
  }

  // <lang><zh-CN>来源细节仅在引用本身声明时复制，不从工具名推导通用类别。</zh-CN><en>Copy origin detail only when declared on the reference, without inferring a category from a tool name.</en></lang>
  if (typeof sourceRef.rangeSourceDetail === "string" && /\S/u.test(sourceRef.rangeSourceDetail)) link.rangeSourceDetail = sourceRef.rangeSourceDetail;

  return link;
}

function createArtifactLink(artifactRef: Record<string, unknown>, artifactById: Map<string, IndexedNode>): DocSourceMapArtifactLink {
  const artifactId = stringValue(artifactRef.artifactId) ?? "";
  const artifact = artifactById.get(artifactId);
  const link: DocSourceMapArtifactLink = {
    artifactId
  };
  const confidence = stringValue(artifactRef.confidence);
  const rangeSource = stringValue(artifactRef.rangeSource);
  const selector = stringValue(artifactRef.selector);

  if (artifact?.language) {
    link.language = artifact.language;
  }

  if (artifact?.path) {
    link.path = artifact.path;
  }

  if (selector) {
    link.selector = selector;
  }

  if (rangeSource) {
    link.rangeSource = rangeSource;
  }

  // <lang><zh-CN>具体来源只作为被动说明；联通性继续由引用/路径/类别与confidence判断。</zh-CN><en>Concrete origin is descriptive only; connectivity remains determined by references, paths, category and confidence.</en></lang>
  if (typeof artifactRef.rangeSourceDetail === "string" && /\S/u.test(artifactRef.rangeSourceDetail)) link.rangeSourceDetail = artifactRef.rangeSourceDetail;

  if (confidence) {
    link.confidence = confidence;
  }

  return link;
}

function isLinkedEntry(entry: DocSourceMapIndexedEntry): boolean {
  const hasUsableSource = entry.sourceLinks.some((link) => link.sourceId && link.path && link.confidence !== "none" && link.rangeSource !== "unresolved");
  const hasUsableArtifact = entry.artifactLinks.some((link) => link.artifactId && link.path && link.confidence !== "none" && link.rangeSource !== "unresolved");

  return hasUsableSource && hasUsableArtifact;
}

/** @lang zh-CN 投影已声明的查询数据；拒绝访问器/错误类型，不读取未知扩展，不修改调用者。 @lang en Projects declared query data, rejecting accessors/wrong types without reading unknown extensions or mutating callers. */
function prepareDocSourceMapQuery(value: unknown): DocSourceMapQuery | undefined {
  try {
    if (!isPlainQueryRecord(value)) return undefined;
    // <lang><zh-CN>固定字段白名单与独立容器阻止原型值和查询中的未知扩展参与筛选。</zh-CN><en>A fixed field allowlist and independent container prevent inherited values and unknown extensions from participating in matching.</en></lang>
    const result: DocSourceMapQuery = {};
    const fields = ["artifactPath", "selector", "sourcePath", "symbolId", "symbolKind"] as const;
    for (const field of fields) {
      // <lang><zh-CN>仅描述符值可消费；即使不可枚举访问器也不执行。</zh-CN><en>Only descriptor data values are consumed; even non-enumerable accessors are not executed.</en></lang>
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (!descriptor) continue;
      if (!Object.hasOwn(descriptor, "value")) return undefined;
      if (descriptor.value === undefined) continue;
      if (typeof descriptor.value !== "string" || !descriptor.value.trim()) return undefined;
      result[field] = descriptor.value;
    }
    // <lang><zh-CN>位置单独投影两个已知字段，未知坐标扩展不读，省略column保留到比较处默认1。</zh-CN><en>Project the two known position fields separately, ignoring extensions and retaining omitted columns until comparison defaults them to one.</en></lang>
    const position = Object.getOwnPropertyDescriptor(value, "position");
    if (position) {
      if (!Object.hasOwn(position, "value")) return undefined;
      if (position.value !== undefined) {
        if (!isPlainQueryRecord(position.value)) return undefined;
        // <lang><zh-CN>坐标描述符是本次调用的独立快照，只消费数值，不调用原对象属性。</zh-CN><en>Coordinate descriptors form this call's snapshot; consume numeric data without accessing original object properties.</en></lang>
        const line = Object.getOwnPropertyDescriptor(position.value, "line");
        const column = Object.getOwnPropertyDescriptor(position.value, "column");
        if (!line || !Object.hasOwn(line, "value") || !Number.isSafeInteger(line.value) || line.value < 1) return undefined;
        if (column && (!Object.hasOwn(column, "value") || (column.value !== undefined && (!Number.isSafeInteger(column.value) || column.value < 1)))) return undefined;
        result.position = { line: line.value, ...(column?.value !== undefined ? { column: column.value } : {}) };
      }
    }
    return result;
  } catch {
    // <lang><zh-CN>Proxy反射异常只转换为固定失败，不传播可能包含私有正文的异常。</zh-CN><en>Convert proxy reflection errors to fixed failure without propagating potentially private exception text.</en></lang>
    return undefined;
  }
}

/** @lang zh-CN 联合查询投影的内部结果，错误类型只决定固定诊断，不携带输入正文。 @lang en Internal combined-query projection result; the error kind selects a fixed diagnostic without carrying input text. */
type PreparedSourceLinkedQuery = { query: SourceLinkedLookupQuery } | { error: "query" | "position" | "semantic" };

/** @lang zh-CN 投影联合查询的五字符串与两坐标，只读已知自有描述符；反射异常收敛为固定查询错误。 @lang en Projects the combined query's five strings and two positions through known own descriptors only, converting reflection errors into fixed query failure. */
function prepareSourceLinkedQuery(value: unknown): PreparedSourceLinkedQuery {
  try {
    if (!isPlainQueryRecord(value)) return { error: "query" };
    // <lang><zh-CN>独立快照不共享坐标对象；未知字段保持忽略，不读取扩展getter。</zh-CN><en>The independent snapshot shares no position objects; unknown fields remain ignored without reading extension getters.</en></lang>
    const query: SourceLinkedLookupQuery = {};
    for (const field of ["generatedPath", "originalSourcePath", "selector", "symbolId", "symbolKind"] as const) {
      // <lang><zh-CN>可选undefined沿用省略，非空白文本不裁剪；访问器直接拒绝。</zh-CN><en>Optional undefined retains omission and nonblank text is not trimmed; reject accessors directly.</en></lang>
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (!descriptor) continue;
      if (!Object.hasOwn(descriptor, "value")) return { error: "query" };
      if (descriptor.value === undefined) continue;
      if (typeof descriptor.value !== "string" || !descriptor.value.trim()) return { error: "semantic" };
      query[field] = descriptor.value;
    }
    for (const field of ["generatedPosition", "originalPosition"] as const) {
      // <lang><zh-CN>即使位置未配路径，也先验证已提供的值，避免错误输入退化为全量结果。</zh-CN><en>Validate every supplied position even without a paired path, preventing invalid input from becoming an unfiltered result.</en></lang>
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (!descriptor) continue;
      if (!Object.hasOwn(descriptor, "value")) return { error: "query" };
      if (descriptor.value === undefined) continue;
      if (!isPlainQueryRecord(descriptor.value)) return { error: "position" };
      // <lang><zh-CN>两个坐标描述符必须是数据属性，数值域与既有普通位置查询一致。</zh-CN><en>Both coordinate descriptors must be data properties, with the same numeric domains as ordinary lookups.</en></lang>
      const line = Object.getOwnPropertyDescriptor(descriptor.value, "line");
      const column = Object.getOwnPropertyDescriptor(descriptor.value, "column");
      if (!line || !Object.hasOwn(line, "value") || !Number.isSafeInteger(line.value) || line.value < 1) return { error: "position" };
      if (column && (!Object.hasOwn(column, "value") || (column.value !== undefined && (!Number.isSafeInteger(column.value) || column.value < 1)))) return { error: "position" };
      query[field] = { line: line.value, ...(column?.value !== undefined ? { column: column.value } : {}) };
    }
    return { query };
  } catch {
    // <lang><zh-CN>Proxy反射不是沙箱，但不能把私有异常正文传播到诊断。</zh-CN><en>Proxy reflection is not sandboxed, but private exception text must not enter diagnostics.</en></lang>
    return { error: "query" };
  }
}

/** @lang zh-CN 查询只接受本realm普通或null原型对象，不接受数组/类实例；反射异常由外层收敛。 @lang en Queries accept same-realm plain/null-prototype records, excluding arrays/class instances; the caller catches reflection failures. */
function isPlainQueryRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  // <lang><zh-CN>原型仅用于数据形状判定，不沿原型读取筛选条件。</zh-CN><en>The prototype determines data shape only; filters are never read through it.</en></lang>
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** @lang zh-CN 对已投影数据应用既有筛选交集；同路径和位置/选择器必须在同一引用命中。 @lang en Applies existing filter intersections to projected data; a path and position/selector must match the same reference. */
function matchesDocSourceMapQuery(entry: DocSourceMapIndexedEntry, query: DocSourceMapQuery): boolean {
  if (query.symbolId && entry.symbolId !== query.symbolId) {
    return false;
  }

  if (query.symbolKind && entry.symbolKind !== query.symbolKind) {
    return false;
  }

  if (query.sourcePath) {
    const sourcePath = query.sourcePath;
    if (!entry.sourceLinks.some((link) => pathsEqual(link.path, sourcePath) && (!query.position || containsPosition(link.range, query.position)))) {
      return false;
    }
  }

  if (query.artifactPath) {
    const artifactPath = query.artifactPath;
    if (!entry.artifactLinks.some((link) => pathsEqual(link.path, artifactPath) && (!query.selector || link.selector === query.selector))) {
      return false;
    }
  }

  return true;
}

/** @lang zh-CN 沿用现有双端包含的文档范围；没有范围不能命中位置。 @lang en Retains existing inclusive documentation endpoints; an absent range cannot match a position. */
function containsPosition(range: HiaSourceRange | undefined, position: HiaSourcePosition): boolean {
  if (!range) {
    return false;
  }

  return comparePositions(position, range.start) >= 0 && comparePositions(position, range.end) <= 0;
}

/** @lang zh-CN 按core既有规则比较行列，缺省列为1，不推断行长或字符单位。 @lang en Compares positions under existing core rules, defaulting omitted columns to one without inferring line length or character units. */
function comparePositions(left: HiaSourcePosition, right: HiaSourcePosition): number {
  if (left.line !== right.line) {
    return left.line - right.line;
  }

  return (left.column ?? 1) - (right.column ?? 1);
}

/** @lang zh-CN 保留原输入回显；仅primitive string规范化，非法runtime对象不执行replaceAll/toString，回显不作可信类型证明。 @lang en Retains raw input echoes, normalizing primitive strings only without invoking replaceAll/toString on invalid runtime objects; echoes never prove trusted types. */
function createOriginalPosition(sourcePath: string, position: HiaSourcePosition): SourceMapOriginalPosition {
  return {
    position,
    sourcePath: typeof sourcePath === "string" ? normalizeLookupPath(sourcePath) : sourcePath
  };
}

function createGeneratedPosition(artifactPath: string | undefined, position: HiaSourcePosition): SourceMapGeneratedPosition {
  return {
    ...(artifactPath ? { artifactPath: normalizeLookupPath(artifactPath) } : {}),
    position
  };
}

/** @lang zh-CN 只投影已知自有坐标，省略列保留；不执行getter，不读取扩展，反射异常只作失败。 @lang en Projects known own coordinates only while retaining omitted columns, without executing getters/reading extensions; reflection errors become failure only. */
function prepareOrdinaryLookupPosition(value: unknown): HiaSourcePosition | undefined {
  try {
    if (!isPlainQueryRecord(value)) return undefined;
    // <lang><zh-CN>已知数据描述符组成一次调用的独立快照，校验后不再读原坐标属性。</zh-CN><en>Known data descriptors form this call's independent snapshot; original coordinate properties are never read again after validation.</en></lang>
    const line = Object.getOwnPropertyDescriptor(value, "line");
    const column = Object.getOwnPropertyDescriptor(value, "column");
    if (!line || !Object.hasOwn(line, "value") || !Number.isSafeInteger(line.value) || line.value < 1) return undefined;
    if (column && (!Object.hasOwn(column, "value") || (column.value !== undefined && (!Number.isSafeInteger(column.value) || column.value < 1)))) return undefined;
    return { line: line.value, ...(column?.value !== undefined ? { column: column.value } : {}) };
  } catch {
    return undefined;
  }
}

/** @lang zh-CN 偏置只接受两种已声明值及undefined省略，拒绝形状/访问器/异常，不读取未知选项。 @lang en Bias accepts the two declared values or undefined omission only, rejecting invalid shapes/accessors/errors without reading unknown options. */
function prepareOrdinaryLookupOptions(value: unknown): OrdinarySourceMapLookupOptions | undefined {
  try {
    if (!isPlainQueryRecord(value)) return undefined;
    // <lang><zh-CN>缺省和显式undefined均保持既有GLB默认，不能容忍错误拼写。</zh-CN><en>Absent and explicit undefined retain the existing GLB default without tolerating misspellings.</en></lang>
    const bias = Object.getOwnPropertyDescriptor(value, "bias");
    if (!bias) return {};
    if (!Object.hasOwn(bias, "value")) return undefined;
    if (bias.value === undefined) return {};
    return bias.value === "greatest-lower-bound" || bias.value === "least-upper-bound" ? { bias: bias.value } : undefined;
  } catch {
    return undefined;
  }
}

/** @lang zh-CN 返回固定坐标错误，不回显坐标对象或底层异常；不修改原索引诊断。 @lang en Returns a fixed position error without reflecting the position object or underlying exception; does not mutate index diagnostics. */
function invalidOrdinaryPositionDiagnostics(index: OrdinarySourceMapIndex): HiaDiagnostic[] {
  return [...index.diagnostics, createSourceLinkageDiagnostic("ORDINARY_SOURCE_MAP_POSITION_INVALID", "HIA lookup positions require positive integer lines and optional positive integer columns.", "error", index.path)];
}
/** @lang zh-CN 固定路径/偏置输入拒绝，不反射原值/异常，不修改索引诊断；显式path上下文仍未脱敏。 @lang en Fixed path/bias rejection without reflecting values/errors or mutating index diagnostics; explicit path context remains unsanitized. */
function invalidOrdinaryQueryDiagnostics(index: OrdinarySourceMapIndex): HiaDiagnostic[] {
  return [...index.diagnostics, createSourceLinkageDiagnostic("ORDINARY_SOURCE_MAP_QUERY_INVALID", "Ordinary lookup paths and options require declared primitive paths and own data bias values.", "error", index.path)];
}
function hiaColumnToSourceMapColumn(column: number | undefined): number {
  return Math.max(0, (column ?? 1) - 1);
}

function sourceMapColumnToHiaColumn(column: number): number {
  return column + 1;
}

function toTraceMapBias(value: OrdinarySourceMapBias | undefined): Bias {
  return value === "least-upper-bound" ? LEAST_UPPER_BOUND : GREATEST_LOWER_BOUND;
}

function pathsEqual(left: string | undefined, right: string): boolean {
  return typeof left === "string" && normalizeLookupPath(left) === normalizeLookupPath(right);
}

function normalizeLookupPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function collectIndexedNodes(value: unknown): IndexedNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item, index) => {
      const node: IndexedNode = {
        id: stringValue(item.id) ?? `node:${index + 1}`
      };
      const kind = stringValue(item.kind);
      const language = stringValue(item.language);
      const itemPath = stringValue(item.path);

      if (kind) {
        node.kind = kind;
      }

      if (language) {
        node.language = language;
      }

      if (itemPath) {
        node.path = itemPath;
      }

      return node;
    });
}

function collectGeneratedBindingSidecars(value: unknown): DocSourceMapGeneratedBindingSidecar[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item, index) => {
      const sidecar: DocSourceMapGeneratedBindingSidecar = {
        id: stringValue(item.id) ?? `generated-binding-sidecar:${index + 1}`
      };
      const contract = stringValue(item.contract);
      const contractVersion = stringValue(item.contractVersion);
      const sidecarPath = stringValue(item.path);

      if (contract) {
        sidecar.contract = contract;
      }
      if (contractVersion) {
        sidecar.contractVersion = contractVersion;
      }
      if (sidecarPath) {
        sidecar.path = sidecarPath;
      }

      return sidecar;
    });
}

function collectLocaleResolutionSidecars(value: unknown): DocSourceMapLocaleResolutionSidecar[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .map((item, index) => {
      const sidecar: DocSourceMapLocaleResolutionSidecar = {
        id: stringValue(item.id) ?? `locale-resolution-sidecar:${index + 1}`
      };
      const contract = stringValue(item.contract);
      const contractVersion = stringValue(item.contractVersion);
      const sidecarPath = stringValue(item.path);
      if (contract) {
        sidecar.contract = contract;
      }
      if (contractVersion) {
        sidecar.contractVersion = contractVersion;
      }
      if (sidecarPath) {
        sidecar.path = sidecarPath;
      }
      return sidecar;
    });
}

/**
 * Keep locale-discovery sidecar declarations as pure ordinary-map metadata; their bodies are never loaded here.
 *
 * 中文：将 locale-discovery sidecar declaration 保持为纯 ordinary-map metadata；本处绝不加载其 body。
 */
function collectLocaleDiscoverySidecars(value: unknown): DocSourceMapLocaleDiscoverySidecar[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .map((item, index) => {
      const sidecar: DocSourceMapLocaleDiscoverySidecar = {
        id: stringValue(item.id) ?? `locale-discovery-sidecar:${index + 1}`
      };
      const contract = stringValue(item.contract);
      const contractVersion = stringValue(item.contractVersion);
      const artifactPath = stringValue(item.path);
      if (contract) sidecar.contract = contract;
      if (contractVersion) sidecar.contractVersion = contractVersion;
      if (artifactPath) sidecar.path = artifactPath;
      return sidecar;
    });
}

function indexedNodeToSourceMapLink(node: IndexedNode): DocSourceMapSourceMapLink {
  return {
    id: node.id,
    ...(node.kind ? { kind: node.kind } : {}),
    ...(node.language ? { language: node.language } : {}),
    ...(node.path ? { path: node.path } : {})
  };
}

function collectPathDiagnostics(diagnostics: HiaDiagnostic[], nodes: IndexedNode[], targetPath: string | undefined, kind: string): void {
  for (const node of nodes) {
    if (!node.path || !isUnsafeRelativePath(node.path)) {
      continue;
    }

    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_UNSAFE_PATH",
      `doc-source-map ${kind} path must be a safe relative path.`,
      "error",
      targetPath,
      {
        id: node.id,
        path: node.path
      }
    ));
  }
}

function collectContractRefDiagnostics(diagnostics: HiaDiagnostic[], artifacts: unknown, targetPath: string | undefined): void {
  if (!Array.isArray(artifacts)) {
    return;
  }

  artifacts.filter(isRecord).forEach((artifact, artifactIndex) => {
    const refs = Array.isArray(artifact.contractRefs) ? artifact.contractRefs : [];

    refs.filter(isRecord).forEach((ref, refIndex) => {
      const refPath = stringValue(ref.path);
      if (!refPath || !isUnsafeRelativePath(refPath)) {
        return;
      }

      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_UNSAFE_PATH",
        "doc-source-map contractRef path must be a safe relative path.",
        "error",
        appendTarget(targetPath, `artifacts.${artifactIndex}.contractRefs.${refIndex}.path`),
        {
          path: refPath
        }
      ));
    });
  });
}

/**
 * 中文：只校验 doc-source-map 对 generated binding sidecar 的声明，不读取
 * sidecar 本体；完整 binding model 始终保持在独立 artifact。
 * English: Validates only doc-source-map declarations of generated-binding
 * sidecars without reading their bodies; the complete binding model remains in
 * the independent artifact.
 */
function collectGeneratedBindingSidecarDiagnostics(diagnostics: HiaDiagnostic[], sidecars: unknown, targetPath: string | undefined): void {
  if (!Array.isArray(sidecars)) {
    return;
  }
  const ids = new Set<string>();
  sidecars.filter(isRecord).forEach((sidecar, index) => {
    const id = stringValue(sidecar.id);
    const sidecarPath = stringValue(sidecar.path);
    if (!id || ids.has(id) || sidecar.contract !== GENERATED_DOCUMENTATION_BINDING_CONTRACT || (sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION && sidecar.contractVersion !== GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_BINDING_SIDECAR_INVALID",
        "generated binding sidecar must have a unique id and the supported contract/version.",
        "error",
        appendTarget(targetPath, `generatedBindingSidecars.${index}`)
      ));
    }
    if (id) {
      ids.add(id);
    }
    if (!sidecarPath || isUnsafeRelativePath(sidecarPath)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_UNSAFE_PATH",
        "generated binding sidecar path must be a safe relative path.",
        "error",
        appendTarget(targetPath, `generatedBindingSidecars.${index}.path`)
      ));
    }
  });
}

/**
 * 中文：验证 locale-resolution sidecar 的纯 metadata declaration；它从不读取 sidecar
 * 正文，也拒绝把 locator、resource body 或 text 内嵌在普通 doc-source-map。
 * English: Validates a pure metadata locale-resolution sidecar declaration; it
 * never reads the sidecar body and rejects locator, resource-body, or text
 * embedding in an ordinary doc-source-map.
 */
function collectLocaleResolutionSidecarDiagnostics(diagnostics: HiaDiagnostic[], sidecars: unknown, targetPath: string | undefined): void {
  if (!Array.isArray(sidecars)) {
    return;
  }
  const ids = new Set<string>();
  sidecars.filter(isRecord).forEach((sidecar, index) => {
    const id = stringValue(sidecar.id);
    const sidecarPath = stringValue(sidecar.path);
    if (!id || ids.has(id) || sidecar.contract !== DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT || sidecar.contractVersion !== DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION || containsLocaleResolutionPrivateField(sidecar)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_LOCALE_RESOLUTION_SIDECAR_INVALID",
        "locale-resolution sidecar must be a unique metadata-only declaration with the supported contract/version.",
        "error",
        appendTarget(targetPath, `localeResolutionSidecars.${index}`),
        id ? { id } : undefined
      ));
    }
    if (id) {
      ids.add(id);
    }
    if (!sidecarPath || isUnsafeRelativePath(sidecarPath)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_UNSAFE_PATH",
        "locale-resolution sidecar path must be a safe relative path.",
        "error",
        appendTarget(targetPath, `localeResolutionSidecars.${index}.path`),
        id ? { id } : undefined
      ));
    }
  });
}

/**
 * Validate a pure metadata locale-discovery sidecar declaration without inspecting its body.
 *
 * 中文：在不检查 body 的前提下校验 pure metadata locale-discovery sidecar declaration。
 */
function collectLocaleDiscoverySidecarDiagnostics(diagnostics: HiaDiagnostic[], sidecars: unknown, targetPath: string | undefined): void {
  if (!Array.isArray(sidecars)) {
    return;
  }
  const ids = new Set<string>();
  sidecars.filter(isRecord).forEach((sidecar, index) => {
    const id = stringValue(sidecar.id);
    const sidecarPath = stringValue(sidecar.path);
    if (!id || ids.has(id) || sidecar.contract !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT || sidecar.contractVersion !== DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION || containsLocaleDiscoveryPrivateField(sidecar)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_LOCALE_DISCOVERY_SIDECAR_INVALID",
        "locale-discovery sidecar must be a unique metadata-only declaration with the supported contract/version.",
        "error",
        appendTarget(targetPath, `localeDiscoverySidecars.${index}`),
        id ? { id } : undefined
      ));
    }
    if (id) {
      ids.add(id);
    }
    if (sidecarPath && isUnsafeRelativePath(sidecarPath)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_UNSAFE_PATH",
        "locale-discovery sidecar path must be a safe relative path.",
        "error",
        appendTarget(targetPath, `localeDiscoverySidecars.${index}.path`),
        id ? { id } : undefined
      ));
    }
  });
}

function containsLocaleResolutionPrivateField(value: Record<string, unknown>): boolean {
  const forbidden = new Set(["body", "content", "locator", "rawlocator", "resolvedtext", "src", "text"]);
  return Object.keys(value).some((key) => forbidden.has(key.toLowerCase()));
}

function containsLocaleDiscoveryPrivateField(value: Record<string, unknown>): boolean {
  const forbidden = new Set(["body", "content", "locator", "rawlocator", "range", "resolvedtext", "resourcebody", "sourcetext", "src", "text"]);
  return Object.keys(value).some((key) => forbidden.has(key.toLowerCase()));
}

/**
 * @lang zh-CN 按每个 source 的显式策略校验正文；缺省继承 manifest 策略，不把空正文视为缺失。
 * @lang en Validates bodies against each source's explicit policy, inheriting the manifest policy by default and treating empty bodies as present.
 * @param diagnostics <lang><zh-CN>追加错误的本次调用诊断列表。</zh-CN><en>Invocation-local diagnostics receiving errors.</en></lang>
 * @param sources <lang><zh-CN>未知输入中的来源数组；非数组不在此处处理。</zh-CN><en>Source array from untrusted input; non-arrays are handled elsewhere.</en></lang>
 * @param manifestPolicy <lang><zh-CN>manifest 默认策略。</zh-CN><en>Manifest default policy.</en></lang>
 * @param targetPath <lang><zh-CN>可选诊断路径前缀。</zh-CN><en>Optional diagnostic path prefix.</en></lang>
 * @returns <lang><zh-CN>无返回值；只追加不含正文的诊断。</zh-CN><en>No return value; only appends body-free diagnostics.</en></lang>
 */
function collectSourcesContentDiagnostics(
  diagnostics: HiaDiagnostic[],
  sources: unknown,
  manifestPolicy: string,
  targetPath: string | undefined
): void {
  if (!Array.isArray(sources)) {
    return;
  }

  sources.filter(isRecord).forEach((source, index) => {
    // <lang><zh-CN>source 策略优先；缺失时继承 manifest 的隐私保守默认。</zh-CN><en>The source policy takes precedence, otherwise inheriting the manifest's privacy-conservative default.</en></lang>
    const sourcePolicy = stringValue(source.sourcesContentPolicy) ?? manifestPolicy;
    // <lang><zh-CN>schema 的 sourcesContent 是字符串；同时保留旧数组/content 输入的拒绝检查，空字符串也携带正文字段。</zh-CN><en>The schema's sourcesContent is a string; retain refusal checks for legacy array/content input as well, including empty strings.</en></lang>
    const embedsContent = typeof source.content === "string" || typeof source.sourcesContent === "string" || Array.isArray(source.sourcesContent);

    // <lang><zh-CN>只有显式 embed/redacted 才允许正文存在；这里只校验策略，不读取或复制正文。</zh-CN><en>Only explicit embed/redacted permits a body; this checks policy without reading or copying the body.</en></lang>
    if (!embedsContent || sourcePolicy === "embed" || sourcePolicy === "redacted") {
      return;
    }

    // <lang><zh-CN>错误只包含策略和路径，避免在诊断中泄露被拒绝的源码。</zh-CN><en>The error includes only policy and path so diagnostics cannot leak refused source text.</en></lang>
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_SOURCES_CONTENT_BLOCKED",
      "doc-source-map source content is blocked unless sourcesContentPolicy explicitly opts in.",
      "error",
      appendTarget(targetPath, `sources.${index}`),
      {
        sourcesContentPolicy: sourcePolicy
      }
    ));
  });
}

function normalizeManifestDiagnostics(value: unknown, targetPath: string | undefined): HiaDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (typeof item === "string") {
      return [createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_DIAGNOSTIC",
        item,
        "info",
        appendTarget(targetPath, `diagnostics.${index}`),
        {
          sourceDiagnostic: item
        }
      )];
    }

    if (!isRecord(item)) {
      return [];
    }

    const code = stringValue(item.code) ?? "DOC_SOURCE_MAP_ENTRY_DIAGNOSTIC";
    const severity = normalizeSeverity(item.severity);
    const message = stringValue(item.message) ?? code;

    return [createSourceLinkageDiagnostic(code, message, severity, appendTarget(targetPath, `diagnostics.${index}`))];
  });
}

function collectEntryDiagnosticCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isRecord(item)) {
        return stringValue(item.code);
      }

      return undefined;
    })
    .filter((item): item is string => Boolean(item));
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
    start: {
      line: startLine
    },
    end: {
      line: endLine
    }
  };
  const startColumn = numberValue(value.start.column);
  const endColumn = numberValue(value.end.column);

  if (startColumn) {
    range.start.column = startColumn;
  }

  if (endColumn) {
    range.end.column = endColumn;
  }

  return range;
}

function createEmptyIndex(options: {
  diagnostics: HiaDiagnostic[];
  path?: string;
  status: DocSourceMapIndex["status"];
}): DocSourceMapIndex {
  return {
    artifactCount: 0,
    bindingSidecarCount: 0,
    bindingSidecars: [],
    contract: DOC_SOURCE_MAP_CONTRACT,
    diagnostics: options.diagnostics,
    entries: [],
    entryCount: 0,
    linkedEntryCount: 0,
    localeResolutionSidecars: [],
    localeResolutionSidecarCount: 0,
    localeDiscoverySidecars: [],
    localeDiscoverySidecarCount: 0,
    ...(options.path ? { path: options.path } : {}),
    sourceCount: 0,
    sourceMaps: [],
    sourceMapCount: 0,
    sourcesContentPolicy: "none",
    status: options.status,
    unresolvedEntryCount: 0
  };
}

function normalizeSeverity(value: unknown): HiaDiagnosticSeverity {
  return value === "error" || value === "warning" || value === "info" ? value : "info";
}

function isUnsafeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");

  return !normalized
    || normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..")
    || path.isAbsolute(value)
    || path.posix.isAbsolute(normalized)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized);
}


function appendTarget(prefix: string | undefined, suffix: string): string {
  return prefix ? `${prefix}.${suffix}` : suffix;
}

function createSourceLinkageDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: {
    data?: HiaDiagnosticData;
    targetPath?: string;
  } = {};

  if (data) {
    options.data = data;
  }

  if (targetPath) {
    options.targetPath = targetPath;
  }

  return createHiaDiagnostic(code, message, severity, options);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
