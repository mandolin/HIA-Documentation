/**
 * @file
 * @lang zh-CN 核心文档及独立国际化/源码来源类型；writer常量为候选身份，历史reader版本显式保留。
 * @lang en Core document and independent internationalization/source-provenance types; writer constants identify candidates, with historical reader versions retained explicitly.
 */
/**
 * @lang zh-CN 核心包运行时身份；与包清单名称一致，不代表包版本。
 * @lang en Runtime identity of the core package; matches its manifest name, not a package version.
 */
export const HIA_CORE_PACKAGE_NAME = "@hia-doc/core";
/**
 * @lang zh-CN 当前核心文档writer与schema版本候选；reader仍精确接受0.2.0。
 * @lang en Current core-document writer/schema version candidate; readers still accept exact 0.2.0.
 */
export const HIA_CORE_CONTRACT_VERSION = "1.0.0";
/**
 * @lang zh-CN 既有字段国际化模型标识，版本由独立modelVersion表达。
 * @lang en Existing field-internationalization model identifier, versioned independently through modelVersion.
 */
export const HIA_TEXT_I18N_MODEL = "hia-text-i18n";
/**
 * @lang zh-CN 当前字段国际化writer版本候选；精确旧版0.2.0可读。
 * @lang en Current field-internationalization writer version candidate; exact legacy 0.2.0 remains readable.
 */
export const HIA_TEXT_I18N_MODEL_VERSION = "1.0.0";
/**
 * @lang zh-CN 既有源码来源模型标识，不是文件内容或地址。
 * @lang en Existing source-provenance model identifier, not file content or a location.
 */
export const HIA_SOURCE_MODEL = "hia-source";
/**
 * @lang zh-CN 当前源码来源writer版本候选；不替换已有产物的0.2.0身份。
 * @lang en Current source-provenance writer version candidate; does not replace 0.2.0 identities in existing artifacts.
 */
export const HIA_SOURCE_MODEL_VERSION = "1.0.0";
/**
 * @lang zh-CN 源码消费模式闭集：none/link/include/all控制展示意图，不授予读取或发布权限。
 * @lang en Closed source-consumption modes: none/link/include/all express presentation intent, not read or publication permission.
 */
export const HIA_SOURCE_MODES = ["none", "link", "include", "all"] as const;
/**
 * @lang zh-CN 已知位置来源闭集；unresolved必须搭配none可信度。
 * @lang en Closed known range-origin set; unresolved requires none confidence.
 */
export const HIA_SOURCE_RANGE_SOURCES = ["heuristic", "parser", "parser-js", "jsdoc-meta", "manual", "unresolved"] as const;
/**
 * @lang zh-CN 位置可信度闭集high/medium/low/none；不代表内容审核或隐私等级。
 * @lang en Closed range-confidence set high/medium/low/none; not content-review or privacy levels.
 */
export const HIA_SOURCE_CONFIDENCE_LEVELS = ["high", "medium", "low", "none"] as const;

/**
 * @lang zh-CN 核心document reader接受的两个精确版本，不是1.x范围协商。
 * @lang en The two exact core-document reader versions, not a negotiated 1.x range.
 */
export type HiaCoreContractVersion = typeof HIA_CORE_CONTRACT_VERSION | "0.2.0";
/**
 * @lang zh-CN 字段国际化reader的精确旧版与当前版本。
 * @lang en Exact legacy and current field-internationalization reader versions.
 */
export type HiaTextI18nModelVersion = typeof HIA_TEXT_I18N_MODEL_VERSION | "0.2.0";
/**
 * @lang zh-CN 源码来源reader的精确旧版与当前版本。
 * @lang en Exact legacy and current source-provenance reader versions.
 */
export type HiaSourceModelVersion = typeof HIA_SOURCE_MODEL_VERSION | "0.2.0";

/**
 * @lang zh-CN 诊断严重性闭集；只有error使核心详细校验结果无效。
 * @lang en Closed diagnostic severity set; only error invalidates detailed core validation.
 */
export type HiaDiagnosticSeverity = "info" | "warning" | "error";
/**
 * @lang zh-CN 诊断附加数据；wire要求普通JSON对象，生产者负责领域隐私。
 * @lang en Diagnostic extra data; wires require ordinary JSON objects, with domain privacy owned by producers.
 */
export type HiaDiagnosticData = Record<string, unknown>;
/**
 * @lang zh-CN 显式回退语言单值或有序数组，不进行语言标准化或网络发现。
 * @lang en Explicit fallback locale or ordered array, without locale canonicalization or network discovery.
 */
export type HiaFallbackLocale = string | string[];
/**
 * @lang zh-CN 语言键到正文的自有属性字典；空串不作为命中文本，继承值不参与选择。
 * @lang en Own-property dictionary from locale keys to text; empty strings are not matches, and inherited values are not selected.
 */
export type HiaLocalizedText = Record<string, string>;
/**
 * @lang zh-CN 已知正文来源及开放扩展名；新名称不自动获得解释能力。
 * @lang en Known text origins plus open extension names; a new name does not automatically gain interpretation support.
 */
export type HiaI18nTextSourceKind = "localized-text" | "inline-segment" | "lang-block" | "external-resource" | "default-text" | string;
/**
 * @lang zh-CN 已知外部资源格式及开放扩展名；资源加载由上层负责。
 * @lang en Known external-resource formats plus open extension names; higher layers own resource loading.
 */
export type HiaI18nResourceFormat = "hia-i18n-json" | "json" | string;
/**
 * @lang zh-CN 开放的符号种类名称；未知种类由消费者按能力处理，不改变身份。
 * @lang en Open symbol-kind names; consumers handle unknown kinds according to capabilities without changing identity.
 */
export type HiaSymbolKind = "module" | "class" | "function" | "member" | "constant" | "typedef" | string;
/**
 * @lang zh-CN 开放导航节点种类名称，节点children形成有序树。
 * @lang en Open navigation-node kind names; children form an ordered tree.
 */
export type HiaNodeKind = "root" | "module" | "namespace" | "group" | string;
/**
 * @lang zh-CN 四种源码展示意图之一；不是安全或隐私授权。
 * @lang en One of four source-presentation intents, not security or privacy authorization.
 */
export type HiaSourceMode = typeof HIA_SOURCE_MODES[number];
/**
 * @lang zh-CN 位置来源之一；不确定位置可显式unresolved。
 * @lang en A range origin; uncertain positions can explicitly use unresolved.
 */
export type HiaSourceRangeSource = typeof HIA_SOURCE_RANGE_SOURCES[number];
/**
 * @lang zh-CN 来源位置可信度；unresolved位置只能使用none。
 * @lang en Confidence in source positions; unresolved positions require none.
 */
export type HiaSourceConfidence = typeof HIA_SOURCE_CONFIDENCE_LEVELS[number];
/**
 * @lang zh-CN 源码预览块角色：当前符号primary-block或命名source-fragment。
 * @lang en Source-preview block roles: the current symbol's primary-block or a named source-fragment.
 */
export type HiaSourceBlockKind = "primary-block" | "source-fragment";

/**
 * @lang zh-CN 包运行时身份与契约版本的描述，不验证包是否已在注册表发行。
 * @lang en Describes package runtime identity and contract version without proving registry publication.
 */
export interface HiaRuntimeInfo {
  packageName: string;
  contractVersion: string;
}

/**
 * @lang zh-CN 公开诊断基础形状；path与targetPath定位输入，data和message仍由生产者负责脱敏。
 * @lang en Public diagnostic shape; path/targetPath locate input, while producers own redaction of data/message.
 */
export interface HiaDiagnostic {
  code: string;
  message: string;
  severity: HiaDiagnosticSeverity;
  data?: HiaDiagnosticData;
  path?: string;
  targetPath?: string;
}

/**
 * @lang zh-CN 核心JSON文档；精确版本、语言集合、有序nodes/symbols为必需，metadata和扩展字段保持不透明。
 * @lang en Core JSON document with required exact version, locale set and ordered nodes/symbols; metadata and extensions remain opaque.
 */
export interface HiaDocument {
  schemaVersion: HiaCoreContractVersion;
  id: string;
  title: string;
  defaultLocale: string;
  locales: string[];
  nodes: HiaNode[];
  symbols: HiaSymbol[];
  fallbackLocale?: HiaFallbackLocale;
  diagnostics?: HiaDiagnostic[];
  metadata?: Record<string, unknown>;
}

/**
 * @lang zh-CN 构造器输入；缺省id=hia.document、title=HIA Document、语言en、空nodes/symbols；传入集合保留引用。
 * @lang en Constructor input; defaults are id=hia.document, title=HIA Document, locale en and empty nodes/symbols; supplied collections retain references.
 */
export interface HiaDocumentInput {
  id?: string;
  title?: string;
  defaultLocale?: string;
  fallbackLocale?: HiaFallbackLocale;
  locales?: string[];
  nodes?: HiaNode[];
  symbols?: HiaSymbol[];
  diagnostics?: HiaDiagnostic[];
  metadata?: Record<string, unknown>;
}

/**
 * @lang zh-CN 文档导航节点，id/kind/title非空；children有序、symbolIds引用符号身份，不携带源码正文。
 * @lang en Documentation navigation node with nonempty id/kind/title, ordered children and symbol-identity references, without source text.
 */
export interface HiaNode {
  id: string;
  kind: HiaNodeKind;
  title: string;
  symbolIds?: string[];
  children?: HiaNode[];
}

/**
 * @lang zh-CN 可文档化符号；summary可为空缓存，i18n/source可选但出现时必须有效，metadata不承载核心规则。
 * @lang en Documentable symbol; summary may be an empty cache, optional i18n/source must be valid when present, and metadata defines no core rules.
 */
export interface HiaSymbol {
  id: string;
  name: string;
  kind: HiaSymbolKind;
  longname?: string;
  parentId?: string;
  path?: string[];
  signature?: string;
  summary?: string;
  i18n?: HiaI18nModel;
  source?: HiaSourceMetadata;
  diagnostics?: HiaDiagnostic[];
  metadata?: Record<string, unknown>;
}

/**
 * @lang zh-CN 独立版本的字段国际化模型；fields按精确键索引，enabled不豁免结构校验。
 * @lang en Independently versioned field-internationalization model; fields use exact keys, and enabled does not waive shape validation.
 */
export interface HiaI18nModel {
  enabled: boolean;
  model: string;
  modelVersion: HiaTextI18nModelVersion;
  defaultLocale: string;
  locales: string[];
  fields: Record<string, HiaI18nField>;
  fallbackLocale?: HiaFallbackLocale;
  mode?: "runtimeSwitch" | "perLocale" | "hiaIntegration" | string;
  resources?: HiaI18nResource[];
  diagnostics?: HiaDiagnostic[];
}

/**
 * @lang zh-CN 外部语言资源的相对定位器与范围声明；核心不会据此读取文件或猜测格式。
 * @lang en Relative locator and scope declaration for an external locale resource; core does not load files or infer formats.
 */
export interface HiaI18nResource {
  kind?: "external-resource" | string;
  path: string;
  locale?: string;
  fields?: string[];
  format?: HiaI18nResourceFormat;
}

/**
 * @lang zh-CN 单字段语言事实；fieldPath与字典键相同，localizedText为选文输入，块/片段/解析事实可选。
 * @lang en Language facts for one field; fieldPath matches its map key, localizedText supplies selection input, and blocks/segments/resolutions are optional.
 */
export interface HiaI18nField {
  fieldPath: string;
  kind: string;
  defaultLocale: string;
  localizedText: HiaLocalizedText;
  key?: string;
  path?: string;
  defaultText?: string;
  source?: string;
  blocks?: HiaLangBlock[];
  segments?: HiaLangInlineSegment[];
  resolutions?: Record<string, HiaTextResolution>;
  missingLocales?: string[];
}

/**
 * @lang zh-CN 指定语言的字段正文块；text允许空串，rangeInComment可为空表示无定位。
 * @lang en A field-text block for one locale; text may be empty, and null rangeInComment means no position.
 */
export interface HiaLangBlock {
  kind: "lang-block";
  locale: string;
  fieldPath: string;
  text: string;
  source?: string;
  rangeInComment?: HiaTextRange | null;
}

/**
 * @lang zh-CN 字段内的语言片段；raw与localized保留原事实，rangeInField为可选偏移，不在核心重解析。
 * @lang en An inline locale segment preserving raw/localized facts with optional field offsets, without reparsing in core.
 */
export interface HiaLangInlineSegment {
  kind: "lang-inline";
  id: string;
  fieldPath: string;
  raw: string;
  localized: HiaLocalizedText;
  key?: string;
  path?: string;
  rangeInField?: HiaTextRange;
}

/**
 * @lang zh-CN 来源字符串的非负安全整数偏移；end不得小于start，核心不转换Unicode或字节计量。
 * @lang en Nonnegative safe-integer offsets in the source string; end cannot precede start, with no Unicode/byte-unit conversion by core.
 */
export interface HiaTextRange {
  start: number;
  end: number;
}

/**
 * @lang zh-CN 语言选择的派生事实；missing时resolvedLocale/sourceLocale可为空，fallbackChain保留实际顺序。
 * @lang en Derived locale-selection facts; resolvedLocale/sourceLocale may be empty when missing, and fallbackChain retains actual order.
 */
export interface HiaTextResolution {
  requestedLocale: string;
  resolvedLocale: string;
  fallbackChain: string[];
  usedFallback: boolean;
  missing: boolean;
  sourceKind?: HiaI18nTextSourceKind;
  sourceLocale?: string;
  source?: string;
}

/**
 * @lang zh-CN 包含选择事实和最终正文的新结果；缺失正文为空串，不回写源字段。
 * @lang en A new result with selection facts and final text; missing text is empty, without writing back to the source field.
 */
export interface HiaResolvedText extends HiaTextResolution {
  text: string;
}

/**
 * @lang zh-CN 源码行列均从1开始且为安全整数，column可缺省；不在核心改变适配器已有列计量单位。
 * @lang en Source lines/columns are one-based safe integers, with optional column; core does not change the adapter's established column unit.
 */
export interface HiaSourcePosition {
  line: number;
  column?: number;
}

/**
 * @lang zh-CN 源码起止位置；end不早于start，比较时缺省column视为1，不推断文件长度。
 * @lang en Source start/end positions; end cannot precede start, omitted columns compare as 1, and file length is not inferred.
 */
export interface HiaSourceRange {
  start: HiaSourcePosition;
  end: HiaSourcePosition;
}

/**
 * @lang zh-CN 来源跳转结果与消费意图；URL不是源码身份，也不授予网络访问能力。
 * @lang en Source-link results and consumption intent; URLs are not source identity or network-access permission.
 */
export interface HiaSourceLink {
  enabled: boolean;
  fileUrl?: string;
  lineUrl?: string;
  openMode?: "same-tab" | "new-tab" | string;
}

/**
 * @lang zh-CN 源码预览消费策略；正文与范围可选，enabled不意味着已允许公开内容。
 * @lang en Source-preview consumption policy with optional text/range; enabled does not imply publication approval.
 */
export interface HiaSourcePreview {
  enabled: boolean;
  defaultExpanded?: boolean;
  content?: string;
  language?: string;
  range?: HiaSourceRange;
}

/**
 * @lang zh-CN 定义定位而非源码块；包含相对路径和必需position，可带语言/range/link但不承载正文。
 * @lang en Definition location, not a source block; has a relative path and required position, optional language/range/link, and no source text.
 */
export interface HiaSourceDefinedIn {
  kind: "defined-in";
  relativePath: string;
  language?: string;
  position: HiaSourcePosition;
  range?: HiaSourceRange;
  link?: HiaSourceLink;
}

/**
 * @lang zh-CN 源码预览块共用事实；content允许空串，位置来源/可信度必需，link/preview不决定块身份。
 * @lang en Shared source-preview block facts; content may be empty, range origin/confidence are required, and link/preview do not define identity.
 */
export interface HiaSourceBlockBase {
  kind: HiaSourceBlockKind;
  id?: string;
  relativePath?: string;
  language?: string;
  range?: HiaSourceRange;
  content: string;
  rangeSource: HiaSourceRangeSource;
  confidence: HiaSourceConfidence;
  link?: HiaSourceLink;
  preview?: HiaSourcePreview;
  diagnostics?: HiaDiagnostic[];
}

/**
 * @lang zh-CN 当前符号自身的源码预览块；路径/范围可缺省，由来源可信度解释定位限制。
 * @lang en The current symbol's own source-preview block; optional path/range limitations are explained by origin/confidence.
 */
export interface HiaSourcePrimaryBlock extends HiaSourceBlockBase {
  kind: "primary-block";
}

/**
 * @lang zh-CN 字段对命名片段的引用；resolved=true必须有fragment快照，未解析引用可保留诊断。
 * @lang en A field reference to a named fragment; resolved=true requires a fragment snapshot, while unresolved references may retain diagnostics.
 */
export interface HiaSourceReference {
  kind: "source-reference";
  referenceKind: "coderef" | string;
  targetId: string;
  resolved: boolean;
  sourceNodeId?: string;
  fieldPath?: string;
  fragment?: HiaSourceFragment;
  diagnostics?: HiaDiagnostic[];
}

/**
 * @lang zh-CN 命名源码片段；id、相对路径、范围、正文与可信度必需，origin仅为JSON对象扩展。
 * @lang en Named source fragment requiring id, relative path, range, text and confidence; origin is a JSON-object extension only.
 */
export interface HiaSourceFragment extends HiaSourceBlockBase {
  kind: "source-fragment";
  id: string;
  relativePath: string;
  range: HiaSourceRange;
  rangeSource: HiaSourceRangeSource;
  confidence: HiaSourceConfidence;
  origin?: Record<string, unknown>;
}

/**
 * @lang zh-CN primary-block与source-fragment的可辨识联合，共享预览语义但保留角色。
 * @lang en Discriminated union of primary-block and source-fragment, sharing preview semantics while preserving roles.
 */
export type HiaSourceBlock = HiaSourcePrimaryBlock | HiaSourceFragment;

/**
 * @lang zh-CN 独立版本源码来源模型；mode描述消费策略，definedIn可选，primaryBlock允许null，不自动清洗正文。
 * @lang en Independently versioned source-provenance model; mode describes consumption, definedIn is optional, primaryBlock may be null, and text is not automatically sanitized.
 */
export interface HiaSourceMetadata {
  model: string;
  modelVersion: HiaSourceModelVersion;
  mode: HiaSourceMode;
  definedIn?: HiaSourceDefinedIn;
  primaryBlock?: HiaSourcePrimaryBlock | null;
  references?: HiaSourceReference[];
  fragments?: HiaSourceFragment[];
  diagnostics?: HiaDiagnostic[];
}
