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
import { prepareSourceLinkagePathOptions } from "./path-options.js";
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

/**
 * @lang zh-CN 文档映射创建、验证与单工件迁移共用的可写诊断上下文选项；运行时要求同realm普通/null原型对象，只投影自有path数据，未知字段不读。每次调用先复制，之后修改选项不回写旧结果；不授予文件读取、路径隐私豁免或公开权限。
 * @lang en Mutable diagnostic-context options shared by map creation, validation and standalone migration. Runtime admission requires a same-realm plain/null-prototype record and projects own path data only, ignoring unknown fields. Each call snapshots options before processing, so later edits cannot change earlier results; no file-read, privacy exemption or publication permission is granted.
 */
export interface DocSourceMapIndexOptions {
  /**
   * @lang zh-CN 可省略的原始string诊断前缀，不裁剪、规范化分隔符或脱敏；空字符串不附上下文，空白/绝对样式文字仍保留。入口可能追加字段定位，错误诊断也可回显合法path。严格exactOptionalPropertyTypes不接纳显式undefined属性，但运行预检将其视作省略，整个undefined参数走入口默认值；这不改变string字段类型。
   * @lang en Optional raw string diagnostic prefix, without trimming, separator normalization or sanitization; empty strings add no context, while whitespace/absolute-looking text is retained. Entries may append field locations, and failures may echo a valid path. exactOptionalPropertyTypes rejects an explicit undefined property, although runtime preflight treats it as omitted and an undefined argument uses entry defaults; the string field type remains unchanged.
   */
  path?: string;
}

/**
 * @lang zh-CN 文档源码映射的可变、无正文元数据快照；计数只在创建时计算，invalid/unsupported-version也可能保留部分元数据，消费前必须检查status。
 * @lang en Mutable body-free metadata snapshot of a documentation source map; counts are computed at creation, and invalid/unsupported-version indexes may retain partial metadata, so check status before consumption.
 */
export interface DocSourceMapIndex {
  /** @lang zh-CN 顶层产物声明数，含未使用节点和重复路径；无效重复身份不在此去重。 @lang en Number of top-level artifact declarations, including unused nodes/repeated paths; invalid duplicate identities are not deduplicated here. */
  artifactCount: number;
  /** @lang zh-CN 已投影的生成文档绑定sidecar声明数，不是绑定或展开数量。 @lang en Number of projected generated-documentation-binding sidecar declarations, not bindings or expansions. */
  bindingSidecarCount: number;
  /** @lang zh-CN 按声明顺序新建的最小绑定sidecar元数据；不读取或验证其正文。 @lang en New minimal binding-sidecar metadata in declaration order, without reading or validating its body. */
  bindingSidecars: DocSourceMapGeneratedBindingSidecar[];
  /** @lang zh-CN 按声明顺序新建的语言解析sidecar元数据，不含资源正文、locator或已解析文本。 @lang en New locale-resolution sidecar metadata in declaration order, without resource bodies, locators or resolved text. */
  localeResolutionSidecars: DocSourceMapLocaleResolutionSidecar[];
  /** @lang zh-CN 已投影语言解析sidecar声明数，不是locale或资源数量。 @lang en Number of projected locale-resolution sidecar declarations, not locales or resources. */
  localeResolutionSidecarCount: number;
  /** @lang zh-CN 按声明顺序新建的语言资源发现sidecar元数据，不含受控声明/catalog或资源正文。 @lang en New locale-discovery sidecar metadata in declaration order, without controlled declarations/catalogs or resource bodies. */
  localeDiscoverySidecars: DocSourceMapLocaleDiscoverySidecar[];
  /** @lang zh-CN 已投影语言资源发现sidecar声明数，不证明任何资源已读取。 @lang en Number of projected locale-discovery sidecar declarations, proving no resource was read. */
  localeDiscoverySidecarCount: number;
  /** @lang zh-CN 固定索引类别doc-source-map；即使输入类别错误也使用此值，不作为接纳证明。 @lang en Fixed index kind doc-source-map, even for a wrong input contract; this is not proof of admission. */
  contract: typeof DOC_SOURCE_MAP_CONTRACT;
  /** @lang zh-CN 可取得时保留输入的非空版本文本，未知标签也可保留；检查status而非只看标签。 @lang en Input nonempty version text when available, including unsupported labels; check status rather than the label alone. */
  contractVersion?: string;
  /** @lang zh-CN 本次新建的可变owner诊断序列，含结构/版本/引用/路径/隐私及输入诊断；合法上下文与输入消息未脱敏。 @lang en New mutable owner diagnostic sequence, including structure/version/reference/path/privacy and input diagnostics; valid context and input messages are unsanitized. */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN 按输入顺序新建的可变条目列表；无效状态仍可含部分投影，不应绕过状态消费。 @lang en New mutable entry list in input order; unusable states may retain partial projections that must not bypass the status gate. */
  entries: DocSourceMapIndexedEntry[];
  /** @lang zh-CN 本次投影条目数，创建后修改entries不会自动重算。 @lang en Number of projected entries at creation; later entries mutation does not recompute it. */
  entryCount: number;
  /** @lang zh-CN 可取得时复制输入的非空身份文本，不裁剪或授予信任/公开权限。 @lang en Input nonempty identity text when available, without trimming or granting trust/publication authority. */
  id?: string;
  /** @lang zh-CN 同时具有已解析路径且confidence非none、来源非unresolved的source/artifact引用的条目数；不要求range或selector。 @lang en Entries with both source/artifact references having resolved paths, confidence other than none and provenance other than unresolved; ranges/selectors are not required. */
  linkedEntryCount: number;
  /** @lang zh-CN 非空时保留调用方诊断路径原文；空string省略，未规范化或脱敏，不授予文件访问权限。 @lang en Caller diagnostic path retained verbatim when nonempty; empty strings are omitted, with no normalization/sanitization or file-access authority. */
  path?: string;
  /** @lang zh-CN 顶层来源声明数，含未使用声明与相同路径，不等于可定位文件数量。 @lang en Number of top-level source declarations, including unused declarations/shared paths, not the number of navigable files. */
  sourceCount: number;
  /** @lang zh-CN 按声明顺序新建的普通位置映射链接元数据，不含mappings/sourcesContent且不加载文件或URL。 @lang en New ordinary position-map link metadata in declaration order, excluding mappings/sourcesContent and loading no file or URL. */
  sourceMaps: DocSourceMapSourceMapLink[];
  /** @lang zh-CN 已投影普通位置映射声明数，不是映射段数或可执行链数量。 @lang en Number of projected ordinary map declarations, not mapping segments or executable chains. */
  sourceMapCount: number;
  /** @lang zh-CN 复制根privacy策略，缺省为none；embed/redacted也不会令本索引携带源码正文。 @lang en Root privacy policy, defaulting to none; embed/redacted still do not put source bodies into this index. */
  sourcesContentPolicy: string;
  /** @lang zh-CN owner边界结果；error优先invalid，其次未知版本unsupported-version，否则available；不替代完整schema/跨链或公开安全验证。 @lang en Owner boundary result: errors yield invalid before unsupported-version, otherwise available; not complete schema/cross-chain or public-safety validation. */
  status: "available" | "invalid" | "unsupported-version";
  /** @lang zh-CN 未满足双侧可用引用谓词的条目数，与linkedEntryCount之和等于创建时entryCount。 @lang en Entries not satisfying the bilateral usable-reference predicate; together with linkedEntryCount equals entryCount at creation. */
  unresolvedEntryCount: number;
}

/**
 * @lang zh-CN 可变条目投影；保留顺序和重复引用，不持有完整工件、开放扩展或sidecar正文。
 * @lang en Mutable entry projection retaining order/repeated references without the complete artifact, open extensions or sidecar bodies.
 */
export interface DocSourceMapIndexedEntry {
  /** @lang zh-CN 按引用顺序新建的产物链接列表，不合并重复产物或选择器。 @lang en New artifact-link list in reference order, without merging repeated artifacts/selectors. */
  artifactLinks: DocSourceMapArtifactLink[];
  /** @lang zh-CN 输入非空分类文本原值；为被动元数据，不推导权限或稳定性。 @lang en Original nonempty classification text; passive metadata inferring no permissions or stability. */
  classification?: string;
  /** @lang zh-CN 输入entry诊断的非空code/字符串列表，保持顺序；不是根HIA诊断，severity/message不在此投影。 @lang en Ordered nonempty codes/strings from entry diagnostics, not root HIA diagnostics; severity/message are not projected here. */
  diagnostics: string[];
  /** @lang zh-CN 最小sidecar/binding身份对列表，保持重复与顺序；不加载binding正文或证明bindingId存在。 @lang en Minimal sidecar/binding identity pairs retaining repeats/order; no binding body is loaded and bindingId existence is not proven. */
  generatedBindingRefs: DocSourceMapGeneratedBindingRef[];
  /** @lang zh-CN 条目身份原值；旧宽输入省略时使用entry:<一基序号>回退，不是全局稳定身份。 @lang en Original entry identity; permissive legacy omissions fall back to entry:<one-based ordinal>, not a globally stable identity. */
  id: string;
  /** @lang zh-CN 条目kind原值；旧宽输入省略时回退entry，不解释领域行为。 @lang en Original entry kind, defaulting to entry for permissive legacy omissions without interpreting domain behavior. */
  kind: string;
  /** @lang zh-CN 输入关系类别的非空文本，不执行关系或跨链计算。 @lang en Nonempty input relation-kind text, without executing relations or cross-chain computation. */
  relationKind?: string;
  /** @lang zh-CN 按引用顺序新建的来源链接列表；同一来源的多个范围和重复引用保留。 @lang en New source-link list in reference order, retaining multiple ranges/repeated references to one source. */
  sourceLinks: DocSourceMapSourceLink[];
  /** @lang zh-CN 可选非空符号身份原值，不裁剪、大小写折叠或验证目标符号是否存在。 @lang en Optional original nonempty symbol identity, without trimming, case folding or verifying target-symbol existence. */
  symbolId?: string;
  /** @lang zh-CN 可选非空符号类别文本，仅供查询筛选与元数据使用。 @lang en Optional nonempty symbol-kind text for query filtering and metadata only. */
  symbolKind?: string;
}

/**
 * @lang zh-CN 独立生成文档绑定sidecar的可变最小身份对；不包含binding模型。
 * @lang en Mutable minimal identity pair for an independent generated-documentation-binding sidecar, without its binding model.
 */
export interface DocSourceMapGeneratedBindingRef {
  /** @lang zh-CN sidecar内部binding身份原值；普通索引不打开sidecar验证此身份。 @lang en Original binding identity within the sidecar; the ordinary index does not open the sidecar to verify it. */
  bindingId: string;
  /** @lang zh-CN 声明的sidecar身份原值；未知声明可伴warning保留，不自动解析路径。 @lang en Original declared sidecar identity; unknown declarations may be retained with a warning, without automatic path resolution. */
  sidecarId: string;
}

/**
 * @lang zh-CN 生成文档绑定sidecar的可变声明元数据；可选类型保留旧/失败投影兼容，不承诺正文可用。
 * @lang en Mutable generated-documentation-binding sidecar declaration metadata; optional types retain legacy/failed-projection compatibility without promising body availability.
 */
export interface DocSourceMapGeneratedBindingSidecar {
  /** @lang zh-CN 非空声明契约原文；owner成功还要求匹配绑定契约，字段存在不等于正文验证。 @lang en Nonempty declared contract text; owner success also requires the binding contract, and presence is not body validation. */
  contract?: string;
  /** @lang zh-CN 非空声明版本原文，普通索引支持精确旧/当前绑定标签；不执行整组迁移。 @lang en Nonempty declared version text; the ordinary index supports exact legacy/current binding labels without executing bundle migration. */
  contractVersion?: string;
  /** @lang zh-CN 声明身份原值；旧投影缺省回退generated-binding-sidecar:<一基序号>，不表示owner接纳缺失身份。 @lang en Original declaration identity; omission projection falls back to generated-binding-sidecar:<one-based ordinal>, not owner admission of missing identity. */
  id: string;
  /** @lang zh-CN 非空声明路径原值；owner另检查安全相对路径，不读取文件或授予发布权限。 @lang en Original nonempty declared path; the owner separately checks safe relative paths without file reads or publication authority. */
  path?: string;
}

/**
 * @lang zh-CN 语言解析sidecar的可变最小声明；不承载语言资源解析结果正文。
 * @lang en Mutable minimal locale-resolution sidecar declaration without resolved locale-resource bodies.
 */
export interface DocSourceMapLocaleResolutionSidecar {
  /** @lang zh-CN 复制非空契约文本，owner成功要求语言解析契约；不检查外部正文。 @lang en Copies nonempty contract text; owner success requires the locale-resolution contract, without inspecting external bodies. */
  contract?: string;
  /** @lang zh-CN 复制非空版本文本，owner成功要求已支持的精确语言解析版本。 @lang en Copies nonempty version text; owner success requires the exact supported locale-resolution version. */
  contractVersion?: string;
  /** @lang zh-CN 声明身份原值；缺省投影回退locale-resolution-sidecar:<一基序号>，不豁免身份验证。 @lang en Original declaration identity; omission projection falls back to locale-resolution-sidecar:<one-based ordinal> without bypassing identity validation. */
  id: string;
  /** @lang zh-CN 声明路径原值，owner要求安全相对路径；不加载resource body、locator或resolved text。 @lang en Original declared path, required by the owner to be safe and relative; no resource body, locator or resolved text is loaded. */
  path?: string;
}

/**
 * @lang zh-CN 语言资源发现sidecar的可变最小声明；与解析sidecar分别计数，不承载catalog内容。
 * @lang en Mutable minimal locale-discovery sidecar declaration, counted separately from resolution sidecars and carrying no catalog contents.
 */
export interface DocSourceMapLocaleDiscoverySidecar {
  /** @lang zh-CN 复制非空声明契约，owner成功要求documentation-locale-resource-declaration；不执行发现。 @lang en Copies the nonempty declaration contract; owner success requires documentation-locale-resource-declaration without executing discovery. */
  contract?: string;
  /** @lang zh-CN 复制非空版本文本，owner成功要求已支持的精确声明版本。 @lang en Copies nonempty version text; owner success requires the exact supported declaration version. */
  contractVersion?: string;
  /** @lang zh-CN 声明身份原值；缺省投影回退locale-discovery-sidecar:<一基序号>，不承诺全局唯一。 @lang en Original declaration identity; omission projection falls back to locale-discovery-sidecar:<one-based ordinal> without promising global uniqueness. */
  id: string;
  /** @lang zh-CN 非空声明路径原值；不读取controlled declaration/catalog、正文或范围，不授予访问权限。 @lang en Original nonempty declared path; reads no controlled declaration/catalog, body or range and grants no access authority. */
  path?: string;
}

/**
 * @lang zh-CN 来源引用的可变元数据，路径/语言从顶层声明解析；未知身份仍可保留无path的链接。
 * @lang en Mutable source-reference metadata with path/language resolved from top-level declarations; unknown identities may retain links without paths.
 */
export interface DocSourceMapSourceLink {
  /** @lang zh-CN 引用层置信度原值；缺省不推导，none排除该链接的linked资格，不表示概率。 @lang en Original reference confidence; omissions are not inferred and none excludes this link from linked eligibility, not a probability. */
  confidence?: string;
  /** @lang zh-CN 已声明来源节点的非空语言文本，未知来源不从引用扩展推导。 @lang en Nonempty language text from the declared source node, never inferred from reference extensions for unknown sources. */
  language?: string;
  /** @lang zh-CN 已声明来源节点的非空路径原值，不做查询规范化；未知来源可省略，不授予文件访问。 @lang en Original nonempty declared-source path without query normalization; optional for unknown sources and granting no file access. */
  path?: string;
  /** @lang zh-CN 独立复制的一基起止坐标，省略列保留省略；不重新定义端点语义，缺失范围仍可能linked。 @lang en Independently copied one-based endpoints, preserving omitted columns; no endpoint semantics are redefined and a missing range may still be linked. */
  range?: HiaSourceRange;
  /** @lang zh-CN 引用层来源标签；当前版通用类别、精确旧reader可含具体工具来源，unresolved排除该链接的linked资格。 @lang en Reference provenance label: current common category or concrete origin from the exact legacy reader; unresolved excludes linked eligibility. */
  rangeSource?: string;
  /** @lang zh-CN 引用自身声明的非空白具体来源文本，不从中推导类别、置信度或权限。 @lang en Nonblank concrete origin declared on this reference, inferring no category, confidence or permissions. */
  rangeSourceDetail?: string;
  /** @lang zh-CN 来源引用身份原值，不合并重复引用或声称外部文件存在。 @lang en Original source-reference identity, without merging repeated references or claiming external file existence. */
  sourceId: string;
}

/**
 * @lang zh-CN 产物引用的可变元数据；路径/语言来自顶层产物声明，不持有产物正文或完整范围。
 * @lang en Mutable artifact-reference metadata; path/language come from top-level artifact declarations, without artifact bodies or complete ranges.
 */
export interface DocSourceMapArtifactLink {
  /** @lang zh-CN 产物引用身份原值；未知身份可保留无path链接并伴warning。 @lang en Original artifact-reference identity; unknown identities may retain pathless links with a warning. */
  artifactId: string;
  /** @lang zh-CN 引用置信度原值，none排除该链接的linked资格；不计算或推导置信度。 @lang en Original reference confidence; none excludes linked eligibility, without computing or inferring confidence. */
  confidence?: string;
  /** @lang zh-CN 已声明产物节点的非空语言文本，不采用引用扩展覆盖值。 @lang en Nonempty language text from the declared artifact node, not overridden by reference extensions. */
  language?: string;
  /** @lang zh-CN 已声明产物节点的非空路径原值，不规范化或读取产物；未知身份可省略。 @lang en Original nonempty declared-artifact path, without normalization or artifact reads; optional for unknown identities. */
  path?: string;
  /** @lang zh-CN 引用层来源标签；当前通用类别与精确旧reader标签保持，unresolved排除linked资格。 @lang en Reference provenance label retaining current categories/exact legacy labels; unresolved excludes linked eligibility. */
  rangeSource?: string;
  /** @lang zh-CN 引用自身非空白具体来源文本，仅作描述，不加载工具或推导通用类别。 @lang en Nonblank reference-local concrete origin text, descriptive only without loading tools or inferring common categories. */
  rangeSourceDetail?: string;
  /** @lang zh-CN 可选非空选择器原值；不解析或执行，不要求其存在才能linked。 @lang en Optional original nonempty selector, neither parsed nor executed and not required for linked eligibility. */
  selector?: string;
}

/**
 * @lang zh-CN 普通位置映射的可变链接声明，不是TraceMap实例或已加载映射数据。
 * @lang en Mutable ordinary position-map link declaration, not a TraceMap instance or loaded mapping data.
 */
export interface DocSourceMapSourceMapLink {
  /** @lang zh-CN 映射声明身份原值；旧宽投影缺省时回退node:<一基序号>。 @lang en Original map declaration identity; permissive legacy omission projection falls back to node:<one-based ordinal>. */
  id: string;
  /** @lang zh-CN 可选非空映射类别文本；不根据此字段加载解析器或执行转换。 @lang en Optional nonempty map-kind text, without loading parsers or executing transforms from this field. */
  kind?: string;
  /** @lang zh-CN 可选非空语言文本，仅为声明元数据。 @lang en Optional nonempty language text, serving only as declaration metadata. */
  language?: string;
  /** @lang zh-CN 声明的非空相对路径原值；当前owner要求提供安全路径，不读文件/URL或sourceMappingURL。 @lang en Original nonempty relative declared path; the current owner requires a safe path without reading files/URLs or sourceMappingURL. */
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

/** @lang zh-CN 普通/null原型的自有数据路径选项；无I/O或发布授权，未知扩展不读。 @lang en Own-data path options in a plain/null-prototype record; no I/O or publication authority, and unknown extensions are unread. */
export interface OrdinarySourceMapIndexOptions {
  /** @lang zh-CN 可选工件上下文，规范分隔符与开头./；空字符串省略，不裁剪空白。 @lang en Optional artifact context with normalized separators/leading ./; empty strings are omitted and whitespace is untrimmed. */
  artifactPath?: string;
  /** @lang zh-CN 可选库解析基准及诊断上下文，原string保持；不是公开安全路径。 @lang en Optional library resolution base and diagnostic context, retaining the original string; not a public-safe path. */
  path?: string;
}

/**
 * @lang zh-CN 独立无正文的可变普通位置索引；计数是创建快照，lookup更新库cache，不得篡改后继续依赖校验。
 * @lang en Independent body-free mutable ordinary position index; counts are creation-time snapshots, lookups update library caches, and tampering invalidates reliance on validation.
 */
export interface OrdinarySourceMapIndex {
  /** @lang zh-CN 显式options的非空产物上下文，规范分隔符/开头./；不从map.file推导，不授予文件访问或发布权限。 @lang en Nonempty explicit artifact context from options, normalizing separators/initial ./; not inferred from map.file and granting no file-access/publication authority. */
  artifactPath?: string;
  /** @lang zh-CN 本次索引的可变诊断列表；成功为空，拒绝使用固定错误并保留合法未脱敏上下文，结果可能借用此列表/记录。 @lang en Mutable diagnostics for this creation; empty on success, fixed on rejection with valid unsanitized context, and possibly borrowed by result lists/records. */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN 所有映射段数，含无原始位置的段；invalid为零，后续修改实例不自动重算。 @lang en Count of all mapping segments, including unmapped segments; zero when invalid and not automatically recomputed after instance mutation. */
  mappingCount: number;
  /** @lang zh-CN 非空options.path原文，作为库解析基准与诊断上下文；空string省略，未脱敏或授予访问权限。 @lang en Original nonempty options.path used as library resolution base and diagnostic context; empty strings omitted, without sanitization or access authority. */
  path?: string;
  /** @lang zh-CN 原始sources槽位中非空string的分隔符/开头./规范化新列表，保留重复、滤空/null；不是库resolvedSources。 @lang en New separator/initial-./ normalized list of nonempty string slots from raw sources, retaining duplicates and filtering empty/null slots; not library resolvedSources. */
  sources: string[];
  /** @lang zh-CN 创建时公开sources列表长度，不是原始槽位数、唯一路径数或有映射文件数。 @lang en Public sources-list length at creation, not raw slot count, unique paths or mapped-file count. */
  sourceCount: number;
  /** @lang zh-CN 构造边界available或invalid，不含unmapped；空的合法map仍available，不证明完整ECMA-426符合或公开安全。 @lang en Construction status available or invalid, never unmapped; a valid empty map remains available without proving full ECMA-426 conformance or public safety. */
  status: "available" | "invalid";
  /** @lang zh-CN 仅正常构造提供的独立无正文TraceMap，保留既有解析路径；可变cache随查找更新，不共享调用方实例/cache。 @lang en Independent body-free TraceMap on successful construction, retaining existing resolved paths; mutable lookup caches do not share the caller instance/caches. */
  traceMap?: TraceMap;
}

/** @lang zh-CN 普通/null原型自有数据选项；可选偏置省略时统一向下最近，未知值拒绝。 @lang en Plain/null-prototype own-data options; omitted bias consistently defaults to greatest lower bound, while unknown values are rejected. */
export interface OrdinarySourceMapLookupOptions {
  /** @lang zh-CN greatest-lower-bound或least-upper-bound查找偏置；省略时采用greatest-lower-bound，不进行坐标插值。 @lang en Lookup bias, greatest-lower-bound or least-upper-bound; omission uses greatest-lower-bound without coordinate interpolation. */
  bias?: OrdinarySourceMapBias;
}

/**
 * @lang zh-CN 原始位置上下文或成功映射结果；直接helper的输入位置回显借用原对象，输出/联合快照另有所有权。
 * @lang en Original-position context or successful mapping; direct-helper input echoes borrow the original position, while mapped outputs/combined snapshots have separate ownership.
 */
export interface SourceMapOriginalPosition {
  /** @lang zh-CN 库映射提供的可选非空符号名；输入上下文不推导name，无名映射省略此字段。 @lang en Optional nonempty symbol name supplied by a mapping; input context does not infer names and nameless mappings omit it. */
  name?: string;
  /** @lang zh-CN HIA一基行/列；映射输出新建坐标，直接反向helper回显原position对象并保留省略列，非法runtime回显不是类型证明。 @lang en HIA one-based line/column; mapped outputs have fresh coordinates, direct reverse helpers echo the original position/omitted columns, and invalid runtime echoes do not prove types. */
  position: HiaSourcePosition;
  /** @lang zh-CN 映射输出为库解析路径的分隔符/开头./规范化文本；输入回显仅规范化primitive string，非法runtime值可能原样保留，未脱敏。 @lang en Mapped output is a separator/initial-./ normalized library-resolved path; input echoes normalize primitive strings only and may retain invalid runtime values, without sanitization. */
  sourcePath: string;
}

/**
 * @lang zh-CN 生成位置上下文或映射结果；字段存在并不证明成功，须检查所在结果status。
 * @lang en Generated-position context or mapping; presence alone does not prove success, so inspect the enclosing result status.
 */
export interface SourceMapGeneratedPosition {
  /** @lang zh-CN 可选非空产物上下文，规范分隔符/开头./；来自索引options或联合请求，不执行文件读取。 @lang en Optional nonempty artifact context with normalized separators/initial ./, from index options or a combined request, without file reads. */
  artifactPath?: string;
  /** @lang zh-CN HIA一基坐标；直接正向helper回显原输入引用，反向映射输出新建，联合结果使用已投影快照；无公开安全/序列化保证。 @lang en HIA one-based coordinates; direct forward helpers echo the input reference, reverse mappings create fresh coordinates, and combined results use projected snapshots, without public-safety/serialization guarantees. */
  position: HiaSourcePosition;
}

/**
 * @lang zh-CN 生成到原始查找结果；generated是请求上下文，只有available才有成功映射的original。
 * @lang en Generated-to-original lookup result; generated is request context and only available carries a successful original mapping.
 */
export interface SourceMapOriginalLookupResult {
  /** @lang zh-CN 正常/未映射/索引失败分支借用原索引列表；新增参数拒绝使用新列表并借用已有记录，均未统一深冻结。 @lang en Normal/unmapped/index-failure branches borrow the index list; new argument rejection creates a list borrowing existing records, without uniform deep freezing. */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN 始终保留的生成请求上下文，position借用原输入，invalid/unmapped时也存在且可能含非法runtime值。 @lang en Always-retained generated request context whose position borrows input; present even for invalid/unmapped and possibly containing invalid runtime values. */
  generated: SourceMapGeneratedPosition;
  /** @lang zh-CN available时的新建原始映射含一基坐标/解析路径及可选name；invalid/unmapped时省略。 @lang en Fresh original mapping when available, with one-based coordinates/resolved path and optional name; omitted when invalid/unmapped. */
  original?: SourceMapOriginalPosition;
  /** @lang zh-CN available表示得到映射，unmapped表示有效但无映射，invalid表示索引或参数拒绝；不从回显字段推导。 @lang en available means mapped, unmapped means a valid miss, and invalid means rejected index/arguments; never infer it from echo fields. */
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

/**
 * @lang zh-CN 原始到单个生成位置查找结果；original是输入上下文，不代表正向映射验证。
 * @lang en Original-to-one-generated lookup result; original is input context, not proof of a forward mapping check.
 */
export interface SourceMapGeneratedLookupResult {
  /** @lang zh-CN 正常/未映射/索引失败借用索引列表；参数拒绝新建列表并复用旧记录，不修改原索引诊断。 @lang en Normal/unmapped/index-failure branches borrow the index list; argument rejection creates a list reusing old records without modifying index diagnostics. */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN available时的新生成位置/坐标容器，invalid/unmapped省略；不与输入position共享坐标对象。 @lang en Fresh generated position/coordinate containers when available, omitted for invalid/unmapped and not sharing the input position. */
  generated?: SourceMapGeneratedPosition;
  /** @lang zh-CN 始终保留的原始请求上下文，规范primitive来源路径且position借用原输入；不是可信/脱敏回显。 @lang en Always-retained original request context with normalized primitive source path and borrowed input position; not a trusted/sanitized echo. */
  original: SourceMapOriginalPosition;
  /** @lang zh-CN available为单个映射，unmapped为有效未命中，invalid为拒绝；不同于文档map版本状态。 @lang en available for one mapping, unmapped for a valid miss and invalid for rejection, distinct from documentation-map version states. */
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

/**
 * @lang zh-CN 原始到全部生成位置结果；列表与输出坐标新建，保留库顺序而不追加项目排序。
 * @lang en Original-to-all-generated result with fresh list/output coordinates, retaining library order without additional project sorting.
 */
export interface SourceMapAllGeneratedLookupResult {
  /** @lang zh-CN 正常/未映射/索引失败借用索引列表；参数拒绝新建含原记录与固定错误的列表。 @lang en Normal/unmapped/index-failure branches borrow the index list; argument rejection creates a list with existing records and a fixed error. */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN 本次新建的可变生成位置列表，逐项恢复HIA一基列；invalid/unmapped为空，不承诺跨版本库排序。 @lang en New mutable generated-position list with HIA one-based columns restored per item; empty when invalid/unmapped, without promising cross-version library ordering. */
  generated: SourceMapGeneratedPosition[];
  /** @lang zh-CN 始终保留的原始请求上下文，position仍借用调用者原对象，省略列不补入回显。 @lang en Always-retained original request context borrowing the caller position, without inserting omitted columns into the echo. */
  original: SourceMapOriginalPosition;
  /** @lang zh-CN 有结果available，无结果unmapped，拒绝invalid；空数组不能单独区分后两者。 @lang en available with results, unmapped on a valid miss and invalid on rejection; an empty list alone cannot distinguish the last two. */
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

/**
 * @lang zh-CN 联合文档/位置结果；状态按实际请求分支组合，不按所有聚合诊断的最高severity重算，原query回显未脱敏。
 * @lang en Combined documentation/position result; status composes requested branches rather than recomputing the highest severity of all diagnostics, and the original query echo is unsanitized.
 */
export interface SourceLinkedLookupResult {
  /** @lang zh-CN 新建聚合列表，记录可借用原索引；仅普通位置收集序列按对象身份去重，不是全列表按内容去重。 @lang en New aggregate list possibly borrowing index records; only the ordinary-position collection is deduplicated by object identity, not the entire list by content. */
  diagnostics: HiaDiagnostic[];
  /** @lang zh-CN available时按语义筛选顺序新建列表并借用文档索引条目；其它状态为空，不复制/冻结条目。 @lang en Fresh list borrowing documentation-index entries in semantic-filter order when available, empty otherwise, without cloning/freezing entries. */
  entries: DocSourceMapIndexedEntry[];
  /** @lang zh-CN 适用时保留的生成位置/请求上下文，来自库映射或已投影输入快照；invalid/unmapped/版本失败也可能存在。 @lang en Generated mapping/request context when applicable, from a library mapping or projected input snapshot; may remain for invalid/unmapped/version failures. */
  generated?: SourceMapGeneratedPosition;
  /** @lang zh-CN 本次返回条目数量，非available为零；不是底层索引总数或映射段数。 @lang en Number of entries returned for this call, zero unless available; not index totals or mapping-segment count. */
  matchedEntryCount: number;
  /** @lang zh-CN 适用时保留的库映射或原始请求快照，坐标不借用调用者query位置；文档版本失败仍可保留。 @lang en Library mapping/original request snapshot when applicable, with coordinates not borrowing caller-query positions; may remain after documentation-version failure. */
  original?: SourceMapOriginalPosition;
  /** @lang zh-CN 调用者原query引用；未知环/非法runtime数据可能仍在回显中，不作可信类型/可序列化或公开安全保证。 @lang en Original caller-query reference; unknown cycles/invalid runtime data may remain in echoes, without trusted-type/serialization/public-safety guarantees. */
  query: SourceLinkedLookupQuery;
  /** @lang zh-CN 文档可用性及被请求位置结果的组合；metadata-only不要求普通索引可用，因此可available且带其error诊断。 @lang en Composition of documentation availability and requested lookups; metadata-only requests need no available ordinary index and may be available with its error diagnostics. */
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
 * @param options <lang><zh-CN>普通/null原型自有string诊断路径，默认空对象；已知访问器/错型拒绝，未知字段不读，合法上下文未脱敏。</zh-CN><en>Plain/null-prototype own string diagnostic path, defaulting to an empty object; known accessors/wrong types reject, unknown fields remain unread and valid context unsanitized.</en></lang>
 * @returns <lang><zh-CN>可查询索引；选项失败使用既有MANIFEST_INVALID且无部分路径，输入失败保留已验证上下文。选项在读取输入图前复制。</zh-CN><en>Queryable index; rejected options use existing MANIFEST_INVALID without partial paths, while rejected inputs retain validated context. Options are copied before reading the input graph.</en></lang>
 */
export function createDocSourceMapIndex(value: unknown, options: DocSourceMapIndexOptions = {}): DocSourceMapIndex {
  // <lang><zh-CN>先取得独立诊断路径，输入图反射或后续失败均不得重读原options。</zh-CN><en>Snapshot the diagnostic path first; input-graph reflection and later failures must never reread original options.</en></lang>
  const preparedOptions = prepareSourceLinkagePathOptions(options);
  if (!preparedOptions) return createEmptyIndex({ status: "invalid", diagnostics: [createSourceLinkageDiagnostic("DOC_SOURCE_MAP_MANIFEST_INVALID", "doc-source-map options must contain an own string diagnostic path.", "error")] });
  // <lang><zh-CN>诊断序列是本函数唯一的可观察验证副产物；后续 status 只能由它推导。</zh-CN><en>The diagnostic sequence is this function's sole observable validation byproduct; later status must be derived from it.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];

  // <lang><zh-CN>先拒绝非对象或非普通JSON图，避免后续字段读取执行访问器或泄漏异常正文。</zh-CN><en>Reject non-objects and non-ordinary JSON graphs before field reads can execute accessors or disclose exception text.</en></lang>
  if (!isRecord(value) || !isDocSourceMapJsonDataGraph(value)) {
    // <lang><zh-CN>使用 source-linkage diagnostic 保留调用方 path，但不回显输入正文。</zh-CN><en>Use a source-linkage diagnostic that preserves caller path without echoing input bodies.</en></lang>
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest must contain ordinary finite acyclic JSON data.",
      "error",
      preparedOptions.path
    ));

    // <lang><zh-CN>无效根节点必须返回同一 index 形状，保证调用方不需要特殊空值分支。</zh-CN><en>An invalid root must return the same index shape so callers need no special null branch.</en></lang>
    return createEmptyIndex({
      diagnostics,
      ...(preparedOptions.path ? { path: preparedOptions.path } : {}),
      status: "invalid"
    });
  }

  // <lang><zh-CN>已声明字段先按既有结构约束诊断；历史宽输入的省略项保留，不把索引接纳冒充完整schema证明。</zh-CN><en>Diagnose declared fields against existing structural constraints first, retaining legacy omissions without treating index admission as complete schema proof.</en></lang>
  for (const issue of [...collectDocSourceMapInputIssues(value), ...collectCurrentDocSourceMapIssues(value)]) {
    diagnostics.push(createSourceLinkageDiagnostic("DOC_SOURCE_MAP_MANIFEST_INVALID", issue.message, "error", appendTarget(preparedOptions.path, issue.target)));
  }

  // <lang><zh-CN>contract 标识确认该 JSON 属于 doc-source-map；错误不阻止收集其余可诊断结构。</zh-CN><en>The contract identifier confirms the JSON is a doc-source-map; an error does not stop collection of other diagnosable structure.</en></lang>
  if (value.contract !== DOC_SOURCE_MAP_CONTRACT) {
    // <lang><zh-CN>仅在 diagnostic data 中归一化 contract 文本，缺失值保持空字符串而不是原始对象。</zh-CN><en>Normalize contract text only in diagnostic data; a missing value remains an empty string rather than the raw object.</en></lang>
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest contract must be doc-source-map.",
      "error",
      preparedOptions.path,
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
      preparedOptions.path,
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
  collectPathDiagnostics(diagnostics, artifacts, preparedOptions.path, "artifact");
  collectPathDiagnostics(diagnostics, sources, preparedOptions.path, "source");
  collectPathDiagnostics(diagnostics, sourceMaps, preparedOptions.path, "sourceMap");
  collectPathDiagnostics(diagnostics, bindingSidecars, preparedOptions.path, "generated binding sidecar");
  collectPathDiagnostics(diagnostics, localeResolutionSidecars, preparedOptions.path, "locale-resolution sidecar");
  collectPathDiagnostics(diagnostics, localeDiscoverySidecars, preparedOptions.path, "locale-discovery sidecar");
  // <lang><zh-CN>随后核验 contract reference、sidecar 声明与 sourcesContent policy，保持普通 map 只含 reference 的不变量。</zh-CN><en>Then validate contract references, sidecar declarations, and sourcesContent policy, preserving the invariant that ordinary maps hold references only.</en></lang>
  collectContractRefDiagnostics(diagnostics, value.artifacts, preparedOptions.path);
  collectGeneratedBindingSidecarDiagnostics(diagnostics, value.generatedBindingSidecars, preparedOptions.path);
  collectLocaleResolutionSidecarDiagnostics(diagnostics, value.localeResolutionSidecars, preparedOptions.path);
  collectLocaleDiscoverySidecarDiagnostics(diagnostics, value.localeDiscoverySidecars, preparedOptions.path);
  collectSourcesContentDiagnostics(diagnostics, value.sources, sourcesContentPolicy, preparedOptions.path);
  // <lang><zh-CN>manifest 自带 diagnostic 仅被归一化为安全 HIA diagnostic，不信任其原始形状。</zh-CN><en>Manifest-supplied diagnostics are normalized into safe HIA diagnostics only; their raw shape is not trusted.</en></lang>
  diagnostics.push(...normalizeManifestDiagnostics(value.diagnostics, preparedOptions.path));

  // <lang><zh-CN>entries 只能从对象数组创建；每一项通过三张身份表解析 source、artifact 与 sidecar reference。</zh-CN><en>entries can be created only from an object array; each item resolves source, artifact, and sidecar references through the three identity maps.</en></lang>
  const entries = Array.isArray(value.entries)
    ? value.entries.filter(isRecord).map((entry, index) => createIndexedEntry(entry, index, sourceById, artifactById, bindingSidecarById, diagnostics, preparedOptions.path))
    : [];

  // <lang><zh-CN>非数组 entries 必须显式诊断，而不是把缺失误报为零条有效 entry。</zh-CN><en>Non-array entries must be diagnosed explicitly rather than misreporting absence as zero valid entries.</en></lang>
  if (!Array.isArray(value.entries)) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest entries must be an array.",
      "error",
      appendTarget(preparedOptions.path, "entries")
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
    ...(preparedOptions.path ? { path: preparedOptions.path } : {}),
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
 * @param options <lang><zh-CN>同索引入口的普通/null原型自有string路径，不授予文件访问权限；已知访问器拒绝，合法上下文未脱敏。</zh-CN><en>Same plain/null-prototype own string path as indexing, granting no file access; known accessors reject and valid context remains unsanitized.</en></lang>
 * @returns <lang><zh-CN>本次新建的诊断数组；非法选项沿用MANIFEST_INVALID且无路径。</zh-CN><en>Diagnostic array created for this call; invalid options retain MANIFEST_INVALID without a path.</en></lang>
 */
export function validateDocSourceMap(value: unknown, options: DocSourceMapIndexOptions = {}): HiaDiagnostic[] {
  return createDocSourceMapIndex(value, options).diagnostics;
}

/**
 * @lang zh-CN 单工件显式迁移的可写结果，factory成功返回新manifest，失败省略该自有属性，不改输入/磁盘。本接口是状态联合字段加可选记录，不是判别联合；人工构造仍可不配套，消费者须分别检查status、manifest存在和unknown字段，不能从类型推断公开安全。
 * @lang en Mutable standalone migration result: the factory returns a fresh manifest on success and omits that own property on refusal, without changing input/disk. This interface has a status-union field and an optional record rather than a discriminated union. Manually constructed values may be inconsistent; check status, manifest presence and unknown fields separately, without inferring publication safety from the type.
 */
export interface DocSourceMapMigrationResult {
  /** @lang zh-CN migrated表示精确旧版转当前版，already-current表示当前版独立复制；invalid/unsupported-version均无局部manifest。它是本次factory检查的快照，调用者修改可写结果/诊断后不会自动重算，也不是schema完整验证或公开授权。 @lang en migrated converts the exact legacy version, while already-current independently clones the current version; invalid/unsupported-version expose no partial manifest. This is a snapshot of factory checks, not automatically recomputed after caller edits to mutable results/diagnostics and not proof of complete schema validation or publication authority. */
  status: "migrated" | "already-current" | "invalid" | "unsupported-version";
  /**
   * @lang zh-CN factory成功时提供后置owner检查通过的新可写JSON图，跨输入/调用不共享可变节点，同一图内部共享关系保留。只复制可枚举string键，不保留原型/描述符、隐藏或Symbol扩展；保留开放JSON扩展、原诊断及显式获准正文，不自动脱敏。Record字段仍unknown，不能代替完整类型化工件或公开门禁；失败省略此属性。
   * @lang en On factory success, a fresh writable JSON graph passing post-copy owner checks, with no mutable nodes shared across input/calls while retaining sharing inside that graph. Copies enumerable string keys, not original prototypes/descriptors or hidden/symbol extensions; retains open JSON extensions, raw diagnostics and explicitly permitted bodies without automatic sanitization. Record fields remain unknown, not a fully typed artifact or publication gate; refusals omit this property.
   */
  manifest?: Record<string, unknown>;
  /**
   * @lang zh-CN 每次新建的可写列表/诊断外壳，不借用manifest内原诊断对象。成功取后置索引投影，可含warning/info及调用方文本/code/诊断path，空列表不是唯一成功形态；失败为单条固定迁移错误，不透传被拒正文，但合法options.path仍保留。修改列表不回写输入/其它结果或重算status，整体不保证可安全公开。
   * @lang en Fresh mutable list/diagnostic shells per call, without borrowing raw manifest diagnostic objects. Success uses post-copy index projection and may contain warning/info with caller text/codes/diagnostic paths; an empty list is not the only success shape. Refusals contain one fixed migration error without rejected bodies, but retain a valid options.path. Edits neither write through to input/other results nor recompute status, and the list is not guaranteed publication-safe.
   */
  diagnostics: HiaDiagnostic[];
}

/**
 * @lang zh-CN 显式将精确旧版映射转换为当前版，保留具体来源及开放JSON扩展；当前版返回独立复制品。
 * 未知来源、信息冲突、不完整结构或隐私错误均拒绝，失败不返回局部产物。只消费调用方数据，不读取文件或sidecar、不写磁盘、不调用JSON hooks。
 * @lang en Explicitly converts an exact legacy map to the current version, retaining concrete origins and open JSON extensions; current inputs return independent clones.
 * Unknown origins, information conflicts, incomplete structure or privacy errors are refused without partial artifacts. Consumes caller data only, without file/sidecar reads, disk writes or JSON hooks.
 * @param value <lang><zh-CN>未知运行时输入，必须通过普通JSON和owner边界。</zh-CN><en>Unknown runtime input that must pass ordinary-JSON and owner boundaries.</en></lang>
 * @param options <lang><zh-CN>普通/null原型自有string诊断路径，默认空；迁移只投影一次，已知访问器/错型拒绝，不授予文件访问。</zh-CN><en>Plain/null-prototype own string diagnostic path, empty by default; migration projects once, rejects known accessors/wrong types and grants no file access.</en></lang>
 * @returns <lang><zh-CN>当前版独立容器或安全诊断；Proxy副作用、资源消耗和并发输入突变不受沙箱保证。</zh-CN><en>Independent current containers or safe diagnostics; proxy effects, resource exhaustion and concurrent input mutation are not sandboxed.</en></lang>
 */
export function migrateDocSourceMap(value: unknown, options: DocSourceMapIndexOptions = {}): DocSourceMapMigrationResult {
  // <lang><zh-CN>整个迁移仅投影一次原选项，前后索引校验只获得该独立快照。</zh-CN><en>Project original options once for the entire migration; before/after index validation receives this independent snapshot only.</en></lang>
  const preparedOptions = prepareSourceLinkagePathOptions(options);
  if (!preparedOptions) return { status: "invalid", diagnostics: [createSourceLinkageDiagnostic("DOC_SOURCE_MAP_MIGRATION_INVALID", "Mapping options must contain an own string diagnostic path.", "error")] };
  /** @lang zh-CN 所有失败均通过静态文本隔离，不转发含原数据的局部索引。 @lang en Isolates every failure with static text rather than forwarding partial indexes containing source data. */
  const refused = (message: string, status: "invalid" | "unsupported-version" = "invalid"): DocSourceMapMigrationResult => ({
    status, diagnostics: [createSourceLinkageDiagnostic("DOC_SOURCE_MAP_MIGRATION_INVALID", message, "error", preparedOptions.path)]
  });
  // <lang><zh-CN>先运行既有普通JSON/版本/隐私门禁；未知版本从不按兼容范围猜测。</zh-CN><en>Run existing ordinary-JSON/version/privacy gates first; unknown versions are never guessed compatible.</en></lang>
  const before = createDocSourceMapIndex(value, preparedOptions);
  if (before.status === "unsupported-version") return refused("Migration requires an explicitly supported mapping version.", "unsupported-version");
  if (before.status !== "available" || !isRecord(value)) return refused("Mapping input must pass owner validation before migration.");
  try {
    // <lang><zh-CN>内部准备只复制和按明确映射转换，结果仍必须重新通过新版必要结构与语义检查。</zh-CN><en>Preparation only clones and converts explicit mappings; the result must still pass current required-structure and semantic checks.</en></lang>
    const prepared = prepareDocSourceMapMigration(value);
    if (!prepared.manifest) return refused(prepared.issue ?? "Mapping could not be migrated losslessly.");
    const after = createDocSourceMapIndex(prepared.manifest, preparedOptions);
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
 * @param options <lang><zh-CN>普通/null原型自有数据选项，默认空对象；path/artifactPath只允许string或undefined，访问器拒绝且不调用，未知字段不读。</zh-CN><en>Plain/null-prototype own-data options, defaulting to an empty object; path/artifactPath accept strings or undefined only, rejecting accessors without invocation and ignoring unknown fields.</en></lang>
 * @returns <lang><zh-CN>独立索引；非法map/选项为固定ORDINARY_SOURCE_MAP_INVALID空索引，不回显异常。选项失败无路径上下文；合法快照在map失败时保留，未脱敏。无I/O，Proxy反射不是沙箱；非完整ECMA-426验证器。</zh-CN><en>Independent index; invalid maps/options yield an empty index with fixed ORDINARY_SOURCE_MAP_INVALID and no raw error. Rejected options have no path context; valid snapshots survive map failure and remain unsanitized. No I/O or proxy sandbox; not a complete ECMA-426 validator.</en></lang>
 */
export function createOrdinarySourceMapIndex(value: SourceMapInput | unknown, options: OrdinarySourceMapIndexOptions = {}): OrdinarySourceMapIndex {
  // <lang><zh-CN>先复制两个路径，后续map反射即使修改调用者options，也不使成功/catch重读不可信属性。</zh-CN><en>Copy both paths first so subsequent map reflection cannot make success/catch reread untrusted caller properties after mutation.</en></lang>
  const preparedOptions = prepareOrdinaryIndexOptions(options);
  if (!preparedOptions) return invalidOrdinaryIndex();

  try {
    // <lang><zh-CN>先投影已知元数据，杜绝库实例短路及sourcesContent随索引外泄。</zh-CN><en>Project known metadata first, preventing library instance shortcuts and sourcesContent leakage through the index.</en></lang>
    const traceMap = createBodyFreeOrdinaryTraceMap(value, preparedOptions.path);
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
      ...(preparedOptions.artifactPath ? { artifactPath: normalizeLookupPath(preparedOptions.artifactPath) } : {}),
      diagnostics: [],
      mappingCount,
      ...(preparedOptions.path ? { path: preparedOptions.path } : {}),
      sources,
      sourceCount: sources.length,
      status: "available",
      traceMap
    };
  } catch {
    // <lang><zh-CN>错误分支只用已验证快照，原始异常和原options均不进入结果。</zh-CN><en>The failure path uses validated snapshots only; neither raw errors nor original options enter the result.</en></lang>
    return invalidOrdinaryIndex(preparedOptions);
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

/** @lang zh-CN 输入投影只接受本realm普通或null原型对象，不接受数组/类实例；反射异常由外层收敛。 @lang en Input projections accept same-realm plain/null-prototype records, excluding arrays/class instances; the caller catches reflection failures. */
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

/**
 * @lang zh-CN 投影创建选项的两自有路径，不枚举/读取未知字段或执行getter；反射失败原子拒绝。
 * @lang en Projects the two own creation paths without enumerating/reading unknown fields or invoking getters; reflection failure rejects atomically.
 * @param value <lang><zh-CN>未经信任的运行时选项；string/undefined字段以外拒绝。</zh-CN><en>Untrusted runtime options; fields other than strings/undefined are rejected.</en></lang>
 * @returns <lang><zh-CN>独立路径快照或失败undefined，不裁剪/解析路径。</zh-CN><en>Independent path snapshot or undefined failure, without trimming/resolving paths.</en></lang>
 */
function prepareOrdinaryIndexOptions(value: unknown): OrdinarySourceMapIndexOptions | undefined {
  try {
    if (!isPlainQueryRecord(value)) return undefined;
    // <lang><zh-CN>快照只保存原始string；在map解析及其代理陷阱之前复制完成。</zh-CN><en>The snapshot stores primitive strings only and is completed before map parsing or its proxy traps.</en></lang>
    const options: OrdinarySourceMapIndexOptions = {};
    for (const field of ["path", "artifactPath"] as const) {
      // <lang><zh-CN>每个已知描述符只读取一次；缺省/undefined不制造额外属性。</zh-CN><en>Read each known descriptor once; absence/undefined creates no extra property.</en></lang>
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (!descriptor) continue;
      if (!Object.hasOwn(descriptor, "value")) return undefined;
      if (descriptor.value === undefined) continue;
      if (typeof descriptor.value !== "string") return undefined;
      options[field] = descriptor.value;
    }
    return options;
  } catch {
    return undefined;
  }
}

/**
 * @lang zh-CN 建立固定失败索引，仅使用已验证路径快照，不能传原始options。
 * @lang en Builds a fixed failure index from validated path snapshots only, never raw options.
 * @param options <lang><zh-CN>内部投影结果；选项本身拒绝时省略，不能泄漏部分路径。</zh-CN><en>Internal projected result; omitted on option rejection to avoid leaking partial paths.</en></lang>
 * @returns <lang><zh-CN>无映射/正文的invalid索引；合法上下文仍未脱敏。</zh-CN><en>Invalid index without mappings/bodies; valid context remains unsanitized.</en></lang>
 */
function invalidOrdinaryIndex(options: OrdinarySourceMapIndexOptions = {}): OrdinarySourceMapIndex {
  return {
    ...(options.artifactPath ? { artifactPath: normalizeLookupPath(options.artifactPath) } : {}),
    diagnostics: [createSourceLinkageDiagnostic("ORDINARY_SOURCE_MAP_INVALID", "Ordinary source map metadata could not be read safely.", "error", options.path)],
    mappingCount: 0,
    ...(options.path ? { path: options.path } : {}),
    sources: [],
    sourceCount: 0,
    status: "invalid"
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
