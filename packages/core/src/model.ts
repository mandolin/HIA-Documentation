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
  /**
   * @lang zh-CN 核心运行时所属的包名称。
   * @lang en Package name identifying the core runtime.
   */
  packageName: string;
  /**
   * @lang zh-CN 该运行时声明的核心文档契约版本。
   * @lang en Core-document contract version declared by this runtime.
   */
  contractVersion: string;
}

/**
 * @lang zh-CN 公开诊断基础形状；path与targetPath定位输入，data和message仍由生产者负责脱敏。
 * @lang en Public diagnostic shape; path/targetPath locate input, while producers own redaction of data/message.
 */
export interface HiaDiagnostic {
  /**
   * @lang zh-CN 供程序分类和定位问题的诊断代码。
   * @lang en Diagnostic code used by programs to classify and identify an issue.
   */
  code: string;
  /**
   * @lang zh-CN 面向读者的诊断说明，生产者负责公开内容的脱敏。
   * @lang en Reader-facing diagnostic message whose producer owns redaction for disclosure.
   */
  message: string;
  /**
   * @lang zh-CN 诊断严重级别，采用info、warning或error。
   * @lang en Diagnostic severity using info, warning or error.
   */
  severity: HiaDiagnosticSeverity;
  /**
   * @lang zh-CN 可选诊断附加数据，序列化文档要求其为普通JSON对象。
   * @lang en Optional diagnostic data, required to be an ordinary JSON object in serialized documents.
   */
  data?: HiaDiagnosticData;
  /**
   * @lang zh-CN 可选输入字段或数据结构位置说明。
   * @lang en Optional location identifying an input field or data structure.
   */
  path?: string;
  /**
   * @lang zh-CN 可选诊断目标位置，由生产者提供并负责可公开范围。
   * @lang en Optional diagnostic target location supplied by the producer, who owns its disclosure scope.
   */
  targetPath?: string;
}

/**
 * @lang zh-CN 核心JSON文档；精确版本、语言集合、有序nodes/symbols为必需，metadata和扩展字段保持不透明。
 * @lang en Core JSON document with required exact version, locale set and ordered nodes/symbols; metadata and extensions remain opaque.
 */
export interface HiaDocument {
  /**
   * @lang zh-CN 文档自身的精确契约身份，读取器支持当前版本及保留的0.2.0。
   * @lang en Exact contract identity of the document itself, read as the current version or retained 0.2.0.
   */
  schemaVersion: HiaCoreContractVersion;
  /**
   * @lang zh-CN 该文档的非空身份标识。
   * @lang en Nonempty identity of this document.
   */
  id: string;
  /**
   * @lang zh-CN 该文档的非空显示标题。
   * @lang en Nonempty display title of this document.
   */
  title: string;
  /**
   * @lang zh-CN 文档默认语言，必须包含在locales列表中。
   * @lang en Default document locale, required to appear in locales.
   */
  defaultLocale: string;
  /**
   * @lang zh-CN 文档声明的语言列表，包含默认语言。
   * @lang en Locales declared by the document, including its default locale.
   */
  locales: string[];
  /**
   * @lang zh-CN 有序的导航节点列表，可通过子节点形成文档树。
   * @lang en Ordered navigation nodes whose children can form a documentation tree.
   */
  nodes: HiaNode[];
  /**
   * @lang zh-CN 文档内可引用的符号列表，保留各符号的独立身份。
   * @lang en Document symbols available for reference, retaining their individual identities.
   */
  symbols: HiaSymbol[];
  /**
   * @lang zh-CN 文档声明的可选回退语言或有序语言链。
   * @lang en Optional fallback locale or ordered locale chain declared by the document.
   */
  fallbackLocale?: HiaFallbackLocale;
  /**
   * @lang zh-CN 附属于该文档的可选诊断列表。
   * @lang en Optional diagnostics attached to this document.
   */
  diagnostics?: HiaDiagnostic[];
  /**
   * @lang zh-CN 可选领域扩展对象，序列化时须满足普通JSON数据约束。
   * @lang en Optional domain-extension object, subject to ordinary JSON-data constraints when serialized.
   */
  metadata?: Record<string, unknown>;
}

/**
 * @lang zh-CN 构造器输入；缺省id=hia.document、title=HIA Document、语言en、空nodes/symbols；传入集合保留引用。
 * @lang en Constructor input; defaults are id=hia.document, title=HIA Document, locale en and empty nodes/symbols; supplied collections retain references.
 */
export interface HiaDocumentInput {
  /**
   * @lang zh-CN 构造文档时使用的身份，省略时为hia.document。
   * @lang en Document identity used during construction, defaulting to hia.document when omitted.
   */
  id?: string;
  /**
   * @lang zh-CN 构造文档时使用的标题，省略时为HIA Document。
   * @lang en Document title used during construction, defaulting to HIA Document when omitted.
   */
  title?: string;
  /**
   * @lang zh-CN 构造文档时使用的默认语言，省略时为en。
   * @lang en Default locale used during construction, defaulting to en when omitted.
   */
  defaultLocale?: string;
  /**
   * @lang zh-CN 可选回退语言或有序链，构造器按既有真值规则加入文档。
   * @lang en Optional fallback locale or ordered chain, included by the constructor according to its truthiness rule.
   */
  fallbackLocale?: HiaFallbackLocale;
  /**
   * @lang zh-CN 可选语言数组，省略时仅含默认语言，传入数组保留引用。
   * @lang en Optional locale array, defaulting to the default locale alone and retaining a supplied array reference.
   */
  locales?: string[];
  /**
   * @lang zh-CN 可选导航节点数组，省略时新建空数组，传入数组保留引用。
   * @lang en Optional navigation-node array, defaulting to a new empty array and retaining a supplied array reference.
   */
  nodes?: HiaNode[];
  /**
   * @lang zh-CN 可选符号数组，省略时新建空数组，传入数组保留引用。
   * @lang en Optional symbol array, defaulting to a new empty array and retaining a supplied array reference.
   */
  symbols?: HiaSymbol[];
  /**
   * @lang zh-CN 可选诊断数组，构造文档时保留传入引用。
   * @lang en Optional diagnostic array whose supplied reference is retained during document construction.
   */
  diagnostics?: HiaDiagnostic[];
  /**
   * @lang zh-CN 可选领域元数据，构造文档时保留传入对象引用。
   * @lang en Optional domain metadata whose supplied object reference is retained during document construction.
   */
  metadata?: Record<string, unknown>;
}

/**
 * @lang zh-CN 文档导航节点，id/kind/title非空；children有序、symbolIds引用符号身份，不携带源码正文。
 * @lang en Documentation navigation node with nonempty id/kind/title, ordered children and symbol-identity references, without source text.
 */
export interface HiaNode {
  /**
   * @lang zh-CN 导航节点的非空身份标识。
   * @lang en Nonempty identity of the navigation node.
   */
  id: string;
  /**
   * @lang zh-CN 导航节点的非空类别名称，允许消费者认识的扩展类别。
   * @lang en Nonempty navigation-node kind, allowing extension kinds understood by consumers.
   */
  kind: HiaNodeKind;
  /**
   * @lang zh-CN 导航节点显示的非空标题。
   * @lang en Nonempty title displayed for the navigation node.
   */
  title: string;
  /**
   * @lang zh-CN 该节点关联的可选符号身份列表。
   * @lang en Optional symbol identities associated with this node.
   */
  symbolIds?: string[];
  /**
   * @lang zh-CN 该节点的可选有序子节点列表。
   * @lang en Optional ordered child nodes of this node.
   */
  children?: HiaNode[];
}

/**
 * @lang zh-CN 可文档化符号；summary可为空缓存，i18n/source可选但出现时必须有效，metadata不承载核心规则。
 * @lang en Documentable symbol; summary may be an empty cache, optional i18n/source must be valid when present, and metadata defines no core rules.
 */
export interface HiaSymbol {
  /**
   * @lang zh-CN 可文档化符号的身份标识。
   * @lang en Identity of the documentable symbol.
   */
  id: string;
  /**
   * @lang zh-CN 符号的显示名称。
   * @lang en Display name of the symbol.
   */
  name: string;
  /**
   * @lang zh-CN 符号类别名称，采用核心已知名称或领域扩展名称。
   * @lang en Symbol-kind name using a known core name or a domain extension.
   */
  kind: HiaSymbolKind;
  /**
   * @lang zh-CN 生产者提供的可选完整符号名称。
   * @lang en Optional full symbol name supplied by the producer.
   */
  longname?: string;
  /**
   * @lang zh-CN 可选父符号身份，用于表达符号归属关系。
   * @lang en Optional parent-symbol identity expressing symbol ownership.
   */
  parentId?: string;
  /**
   * @lang zh-CN 可选语义路径分段数组，由生产者组织。
   * @lang en Optional semantic-path segments organized by the producer.
   */
  path?: string[];
  /**
   * @lang zh-CN 生产者保留的可选符号声明签名。
   * @lang en Optional declaration signature retained by the producer.
   */
  signature?: string;
  /**
   * @lang zh-CN 可选摘要缓存，可为空字符串，完整语言事实由i18n承载。
   * @lang en Optional summary cache, which may be empty, with complete locale facts carried by i18n.
   */
  summary?: string;
  /**
   * @lang zh-CN 符号各字段的可选独立版本国际化模型。
   * @lang en Optional independently versioned internationalization model for the symbol's fields.
   */
  i18n?: HiaI18nModel;
  /**
   * @lang zh-CN 符号的可选源码定义、预览块和片段引用事实。
   * @lang en Optional source-definition, preview-block and fragment-reference facts for the symbol.
   */
  source?: HiaSourceMetadata;
  /**
   * @lang zh-CN 附属于该符号的可选诊断。
   * @lang en Optional diagnostics attached to this symbol.
   */
  diagnostics?: HiaDiagnostic[];
  /**
   * @lang zh-CN 由领域生产者维护的可选JSON扩展对象。
   * @lang en Optional JSON-extension object maintained by the domain producer.
   */
  metadata?: Record<string, unknown>;
}

/**
 * @lang zh-CN 独立版本的字段国际化模型；fields按精确键索引，enabled不豁免结构校验。
 * @lang en Independently versioned field-internationalization model; fields use exact keys, and enabled does not waive shape validation.
 */
export interface HiaI18nModel {
  /**
   * @lang zh-CN 字段国际化的启用意图，出现该模型时仍需通过结构校验。
   * @lang en Intent to enable field internationalization, with structural validation still required when the model is present.
   */
  enabled: boolean;
  /**
   * @lang zh-CN 字段国际化模型名称，核心校验要求hia-text-i18n。
   * @lang en Field-internationalization model name, required to be hia-text-i18n by core validation.
   */
  model: string;
  /**
   * @lang zh-CN 字段国际化模型的独立版本身份，支持当前版本及0.2.0。
   * @lang en Independent version identity of the field-internationalization model, supporting the current version and 0.2.0.
   */
  modelVersion: HiaTextI18nModelVersion;
  /**
   * @lang zh-CN 该模型的默认语言，必须在其locales列表中。
   * @lang en Default locale of this model, required to appear in its locales array.
   */
  defaultLocale: string;
  /**
   * @lang zh-CN 该模型声明的语言列表。
   * @lang en Locales declared by this model.
   */
  locales: string[];
  /**
   * @lang zh-CN 按精确字段路径索引的语言字段字典。
   * @lang en Locale-field dictionary indexed by exact field paths.
   */
  fields: Record<string, HiaI18nField>;
  /**
   * @lang zh-CN 该模型声明的可选回退语言或有序链。
   * @lang en Optional fallback locale or ordered chain declared by this model.
   */
  fallbackLocale?: HiaFallbackLocale;
  /**
   * @lang zh-CN 可选国际化消费模式名称，具体处理由消费者决定。
   * @lang en Optional internationalization consumption-mode name, interpreted by consumers.
   */
  mode?: "runtimeSwitch" | "perLocale" | "hiaIntegration" | string;
  /**
   * @lang zh-CN 该模型声明的可选外部语言资源定位器。
   * @lang en Optional external locale-resource locators declared by this model.
   */
  resources?: HiaI18nResource[];
  /**
   * @lang zh-CN 附属于该国际化模型的可选诊断。
   * @lang en Optional diagnostics attached to this internationalization model.
   */
  diagnostics?: HiaDiagnostic[];
}

/**
 * @lang zh-CN 外部语言资源的相对定位器与范围声明；核心不会据此读取文件或猜测格式。
 * @lang en Relative locator and scope declaration for an external locale resource; core does not load files or infer formats.
 */
export interface HiaI18nResource {
  /**
   * @lang zh-CN 可选语言资源类别名称，可用external-resource表达外部资源。
   * @lang en Optional locale-resource kind, with external-resource identifying an external resource.
   */
  kind?: "external-resource" | string;
  /**
   * @lang zh-CN 相对资源路径，须满足边界约束，实际加载由上层负责。
   * @lang en Relative resource path subject to boundary constraints, with actual loading owned by higher layers.
   */
  path: string;
  /**
   * @lang zh-CN 该资源声明的可选语言。
   * @lang en Optional locale declared for this resource.
   */
  locale?: string;
  /**
   * @lang zh-CN 该资源声明覆盖的可选字段路径列表。
   * @lang en Optional field paths declared to be covered by this resource.
   */
  fields?: string[];
  /**
   * @lang zh-CN 可选资源格式名称，格式解释由资源消费者负责。
   * @lang en Optional resource-format name, interpreted by the resource consumer.
   */
  format?: HiaI18nResourceFormat;
}

/**
 * @lang zh-CN 单字段语言事实；fieldPath与字典键相同，localizedText为选文输入，块/片段/解析事实可选。
 * @lang en Language facts for one field; fieldPath matches its map key, localizedText supplies selection input, and blocks/segments/resolutions are optional.
 */
export interface HiaI18nField {
  /**
   * @lang zh-CN 该语言字段的精确路径，须与fields字典中的键一致。
   * @lang en Exact path of this locale field, required to match its key in the fields dictionary.
   */
  fieldPath: string;
  /**
   * @lang zh-CN 生产者声明的字段内容类别。
   * @lang en Field-content kind declared by the producer.
   */
  kind: string;
  /**
   * @lang zh-CN 该字段的默认语言，在正文解析时优先于调用选项。
   * @lang en Default locale of this field, taking precedence over call options during text resolution.
   */
  defaultLocale: string;
  /**
   * @lang zh-CN 从语言键到原正文的字典，解析时仅采用非空的自有字符串值。
   * @lang en Dictionary from locale keys to original text, resolved using only nonempty own string values.
   */
  localizedText: HiaLocalizedText;
  /**
   * @lang zh-CN 可选语言资源匹配键。
   * @lang en Optional locale-resource matching key.
   */
  key?: string;
  /**
   * @lang zh-CN 生产者保留的可选语言资源匹配或定位路径字符串。
   * @lang en Optional locale-resource matching or location path retained by the producer.
   */
  path?: string;
  /**
   * @lang zh-CN 可选默认正文，在语言链均未命中时使用，可为空字符串。
   * @lang en Optional default text used when the locale chain has no match, and allowed to be empty.
   */
  defaultText?: string;
  /**
   * @lang zh-CN 可选正文来源说明，解析结果可沿用该说明。
   * @lang en Optional text-provenance description that resolution results may retain.
   */
  source?: string;
  /**
   * @lang zh-CN 生产者解析出的可选语言正文块。
   * @lang en Optional locale-text blocks parsed by the producer.
   */
  blocks?: HiaLangBlock[];
  /**
   * @lang zh-CN 生产者解析出的可选行内语言片段。
   * @lang en Optional inline locale segments parsed by the producer.
   */
  segments?: HiaLangInlineSegment[];
  /**
   * @lang zh-CN 按请求语言保留的可选正文解析事实。
   * @lang en Optional text-resolution facts retained by requested locale.
   */
  resolutions?: Record<string, HiaTextResolution>;
  /**
   * @lang zh-CN 生产者记录的可选缺失语言列表。
   * @lang en Optional missing locales recorded by the producer.
   */
  missingLocales?: string[];
}

/**
 * @lang zh-CN 指定语言的字段正文块；text允许空串，rangeInComment可为空表示无定位。
 * @lang en A field-text block for one locale; text may be empty, and null rangeInComment means no position.
 */
export interface HiaLangBlock {
  /**
   * @lang zh-CN 语言正文块的固定判别值lang-block。
   * @lang en Fixed lang-block discriminator for a locale-text block.
   */
  kind: "lang-block";
  /**
   * @lang zh-CN 该正文块所属的语言。
   * @lang en Locale to which this text block belongs.
   */
  locale: string;
  /**
   * @lang zh-CN 该正文块所属的字段路径。
   * @lang en Field path to which this text block belongs.
   */
  fieldPath: string;
  /**
   * @lang zh-CN 该语言的原正文字符串，允许为空。
   * @lang en Original text for this locale, allowed to be empty.
   */
  text: string;
  /**
   * @lang zh-CN 可选正文块来源说明。
   * @lang en Optional provenance description for the text block.
   */
  source?: string;
  /**
   * @lang zh-CN 原注释内的可选偏移范围，null表示未提供范围。
   * @lang en Optional offset range within the original comment, with null indicating no supplied range.
   */
  rangeInComment?: HiaTextRange | null;
}

/**
 * @lang zh-CN 字段内的语言片段；raw与localized保留原事实，rangeInField为可选偏移，不在核心重解析。
 * @lang en An inline locale segment preserving raw/localized facts with optional field offsets, without reparsing in core.
 */
export interface HiaLangInlineSegment {
  /**
   * @lang zh-CN 行内语言片段的固定判别值lang-inline。
   * @lang en Fixed lang-inline discriminator for an inline locale segment.
   */
  kind: "lang-inline";
  /**
   * @lang zh-CN 该行内语言片段的身份标识。
   * @lang en Identity of this inline locale segment.
   */
  id: string;
  /**
   * @lang zh-CN 该片段所属的语言字段路径。
   * @lang en Locale-field path to which this segment belongs.
   */
  fieldPath: string;
  /**
   * @lang zh-CN 生产者保留的原始行内片段字符串。
   * @lang en Original inline-segment string retained by the producer.
   */
  raw: string;
  /**
   * @lang zh-CN 该片段的各语言正文字符串。
   * @lang en Localized text strings for this segment.
   */
  localized: HiaLocalizedText;
  /**
   * @lang zh-CN 该片段可选的语言资源匹配键。
   * @lang en Optional locale-resource matching key for this segment.
   */
  key?: string;
  /**
   * @lang zh-CN 该片段可选的资源匹配或定位路径。
   * @lang en Optional resource matching or location path for this segment.
   */
  path?: string;
  /**
   * @lang zh-CN 原字段正文中的可选片段偏移范围。
   * @lang en Optional segment offset range within the original field text.
   */
  rangeInField?: HiaTextRange;
}

/**
 * @lang zh-CN 来源字符串的非负安全整数偏移；end不得小于start，核心不转换Unicode或字节计量。
 * @lang en Nonnegative safe-integer offsets in the source string; end cannot precede start, with no Unicode/byte-unit conversion by core.
 */
export interface HiaTextRange {
  /**
   * @lang zh-CN 来源字符串中的起始偏移，须为非负安全整数。
   * @lang en Start offset in the source string, required to be a nonnegative safe integer.
   */
  start: number;
  /**
   * @lang zh-CN 来源字符串中的终点偏移，须为不小于start的非负安全整数。
   * @lang en End offset in the source string, required to be a nonnegative safe integer no smaller than start.
   */
  end: number;
}

/**
 * @lang zh-CN 语言选择的派生事实；missing时resolvedLocale/sourceLocale可为空，fallbackChain保留实际顺序。
 * @lang en Derived locale-selection facts; resolvedLocale/sourceLocale may be empty when missing, and fallbackChain retains actual order.
 */
export interface HiaTextResolution {
  /**
   * @lang zh-CN 本次正文选择请求的语言。
   * @lang en Locale requested for this text selection.
   */
  requestedLocale: string;
  /**
   * @lang zh-CN 实际选中正文的语言，缺失时为空字符串。
   * @lang en Locale of the selected text, empty when text is missing.
   */
  resolvedLocale: string;
  /**
   * @lang zh-CN 本次选择按优先级排列的实际候选语言链。
   * @lang en Actual candidate-locale chain ordered by selection priority.
   */
  fallbackChain: string[];
  /**
   * @lang zh-CN 本次是否使用了与请求语言不同的正文语言。
   * @lang en Whether selection used a text locale different from the requested locale.
   */
  usedFallback: boolean;
  /**
   * @lang zh-CN 本次选择是否仍缺少可用正文。
   * @lang en Whether this selection still lacks usable text.
   */
  missing: boolean;
  /**
   * @lang zh-CN 可选正文来源类别，例如localized-text或default-text。
   * @lang en Optional text-origin kind, such as localized-text or default-text.
   */
  sourceKind?: HiaI18nTextSourceKind;
  /**
   * @lang zh-CN 可选原正文语言，缺失结果可记录为空字符串。
   * @lang en Optional original-text locale, which a missing result may record as empty.
   */
  sourceLocale?: string;
  /**
   * @lang zh-CN 从字段沿用或由生产者记录的可选来源说明。
   * @lang en Optional provenance description retained from the field or recorded by the producer.
   */
  source?: string;
}

/**
 * @lang zh-CN 包含选择事实和最终正文的新结果；缺失正文为空串，不回写源字段。
 * @lang en A new result with selection facts and final text; missing text is empty, without writing back to the source field.
 */
export interface HiaResolvedText extends HiaTextResolution {
  /**
   * @lang zh-CN 本次解析选出的正文，缺失时为空字符串。
   * @lang en Text selected by this resolution, empty when missing.
   */
  text: string;
}

/**
 * @lang zh-CN 源码行列均从1开始且为安全整数，column可缺省；不在核心改变适配器已有列计量单位。
 * @lang en Source lines/columns are one-based safe integers, with optional column; core does not change the adapter's established column unit.
 */
export interface HiaSourcePosition {
  /**
   * @lang zh-CN 从1开始的源码行号，须为安全整数。
   * @lang en One-based source line number, required to be a safe integer.
   */
  line: number;
  /**
   * @lang zh-CN 可选的一基准源码列号，须为安全整数，列单位沿用生产者约定。
   * @lang en Optional one-based source column, required to be a safe integer and using the producer's column-unit convention.
   */
  column?: number;
}

/**
 * @lang zh-CN 源码起止位置；end不早于start，比较时缺省column视为1，不推断文件长度。
 * @lang en Source start/end positions; end cannot precede start, omitted columns compare as 1, and file length is not inferred.
 */
export interface HiaSourceRange {
  /**
   * @lang zh-CN 源码范围起点，以一基准行列定位。
   * @lang en Source-range start located by one-based line and column.
   */
  start: HiaSourcePosition;
  /**
   * @lang zh-CN 源码范围终点，校验时不得早于起点，缺省列按1比较。
   * @lang en Source-range end, required not to precede the start during validation, with omitted columns compared as 1.
   */
  end: HiaSourcePosition;
}

/**
 * @lang zh-CN 来源跳转结果与消费意图；URL不是源码身份，也不授予网络访问能力。
 * @lang en Source-link results and consumption intent; URLs are not source identity or network-access permission.
 */
export interface HiaSourceLink {
  /**
   * @lang zh-CN 是否启用源码跳转的消费意图。
   * @lang en Consumption intent to enable source navigation.
   */
  enabled: boolean;
  /**
   * @lang zh-CN 可选文件级跳转地址，由消费者解释。
   * @lang en Optional file-level navigation address interpreted by consumers.
   */
  fileUrl?: string;
  /**
   * @lang zh-CN 可选源码行级跳转地址，由消费者解释。
   * @lang en Optional source-line navigation address interpreted by consumers.
   */
  lineUrl?: string;
  /**
   * @lang zh-CN 可选打开方式名称，例如same-tab或new-tab。
   * @lang en Optional opening-mode name, such as same-tab or new-tab.
   */
  openMode?: "same-tab" | "new-tab" | string;
}

/**
 * @lang zh-CN 源码预览消费策略；正文与范围可选，enabled不意味着已允许公开内容。
 * @lang en Source-preview consumption policy with optional text/range; enabled does not imply publication approval.
 */
export interface HiaSourcePreview {
  /**
   * @lang zh-CN 是否启用源码预览的消费意图，正文公开由调用方授权。
   * @lang en Consumption intent to enable source preview, with disclosure authorized by the caller.
   */
  enabled: boolean;
  /**
   * @lang zh-CN 可选预览初始展开意图，由展示消费者采用。
   * @lang en Optional intent for initial preview expansion, applied by presentation consumers.
   */
  defaultExpanded?: boolean;
  /**
   * @lang zh-CN 可选源码预览正文，允许空字符串，生产者负责脱敏。
   * @lang en Optional source-preview text, allowed to be empty, with redaction owned by the producer.
   */
  content?: string;
  /**
   * @lang zh-CN 可选预览正文语言标识。
   * @lang en Optional language identifier for the preview text.
   */
  language?: string;
  /**
   * @lang zh-CN 该预览正文关联的可选源码范围。
   * @lang en Optional source range associated with this preview text.
   */
  range?: HiaSourceRange;
}

/**
 * @lang zh-CN 定义定位而非源码块；包含相对路径和必需position，可带语言/range/link但不承载正文。
 * @lang en Definition location, not a source block; has a relative path and required position, optional language/range/link, and no source text.
 */
export interface HiaSourceDefinedIn {
  /**
   * @lang zh-CN 定义位置的固定判别值defined-in。
   * @lang en Fixed defined-in discriminator for a definition location.
   */
  kind: "defined-in";
  /**
   * @lang zh-CN 定义所在文件的相对路径，须通过源码路径边界校验。
   * @lang en Relative path of the defining file, subject to source-path boundary validation.
   */
  relativePath: string;
  /**
   * @lang zh-CN 定义所在源码的可选语言标识。
   * @lang en Optional language identifier of the defining source.
   */
  language?: string;
  /**
   * @lang zh-CN 定义在文件中的一基准行列位置。
   * @lang en One-based line-and-column position of the definition in its file.
   */
  position: HiaSourcePosition;
  /**
   * @lang zh-CN 该定义关联的可选完整源码范围。
   * @lang en Optional complete source range associated with the definition.
   */
  range?: HiaSourceRange;
  /**
   * @lang zh-CN 该定义位置的可选跳转地址与消费意图。
   * @lang en Optional navigation addresses and consumption intent for this definition location.
   */
  link?: HiaSourceLink;
}

/**
 * @lang zh-CN 源码预览块共用事实；content允许空串，位置来源/可信度必需，link/preview不决定块身份。
 * @lang en Shared source-preview block facts; content may be empty, range origin/confidence are required, and link/preview do not define identity.
 */
export interface HiaSourceBlockBase {
  /**
   * @lang zh-CN 源码预览块角色，采用primary-block或source-fragment。
   * @lang en Source-preview block role using primary-block or source-fragment.
   */
  kind: HiaSourceBlockKind;
  /**
   * @lang zh-CN 可选源码块身份，命名片段会将该字段收紧为必需。
   * @lang en Optional source-block identity, made required by named fragments.
   */
  id?: string;
  /**
   * @lang zh-CN 可选来源相对路径，命名片段要求提供该路径。
   * @lang en Optional source-relative path, required for named fragments.
   */
  relativePath?: string;
  /**
   * @lang zh-CN 该源码块的可选语言标识。
   * @lang en Optional language identifier for this source block.
   */
  language?: string;
  /**
   * @lang zh-CN 可选源码定位范围，命名片段要求提供该范围。
   * @lang en Optional source-location range, required for named fragments.
   */
  range?: HiaSourceRange;
  /**
   * @lang zh-CN 该源码块的正文字符串，允许为空，生产者负责公开内容。
   * @lang en Text of this source block, allowed to be empty, with disclosure owned by the producer.
   */
  content: string;
  /**
   * @lang zh-CN 源码范围的既有来源类别，采用核心支持的来源集合。
   * @lang en Established source-range origin using the set supported by core.
   */
  rangeSource: HiaSourceRangeSource;
  /**
   * @lang zh-CN 位置可信度，来源为unresolved时必须为none。
   * @lang en Position confidence, required to be none when the origin is unresolved.
   */
  confidence: HiaSourceConfidence;
  /**
   * @lang zh-CN 该源码块的可选跳转地址与消费意图。
   * @lang en Optional navigation addresses and consumption intent for this source block.
   */
  link?: HiaSourceLink;
  /**
   * @lang zh-CN 该源码块的可选预览策略及预览正文。
   * @lang en Optional preview policy and preview text for this source block.
   */
  preview?: HiaSourcePreview;
  /**
   * @lang zh-CN 附属于该源码块的可选诊断。
   * @lang en Optional diagnostics attached to this source block.
   */
  diagnostics?: HiaDiagnostic[];
}

/**
 * @lang zh-CN 当前符号自身的源码预览块；路径/范围可缺省，由来源可信度解释定位限制。
 * @lang en The current symbol's own source-preview block; optional path/range limitations are explained by origin/confidence.
 */
export interface HiaSourcePrimaryBlock extends HiaSourceBlockBase {
  /**
   * @lang zh-CN 当前符号源码块的固定判别值primary-block。
   * @lang en Fixed primary-block discriminator for the current symbol's source block.
   */
  kind: "primary-block";
}

/**
 * @lang zh-CN 字段对命名片段的引用；resolved=true必须有fragment快照，未解析引用可保留诊断。
 * @lang en A field reference to a named fragment; resolved=true requires a fragment snapshot, while unresolved references may retain diagnostics.
 */
export interface HiaSourceReference {
  /**
   * @lang zh-CN 源码引用的固定判别值source-reference。
   * @lang en Fixed source-reference discriminator for a source reference.
   */
  kind: "source-reference";
  /**
   * @lang zh-CN 引用语法类别，例如coderef或生产者支持的扩展名称。
   * @lang en Reference-syntax kind, such as coderef or an extension supported by the producer.
   */
  referenceKind: "coderef" | string;
  /**
   * @lang zh-CN 该引用声明指向的目标片段身份。
   * @lang en Target-fragment identity declared by this reference.
   */
  targetId: string;
  /**
   * @lang zh-CN 该引用是否已解析，true时必须提供fragment快照。
   * @lang en Whether the reference is resolved, requiring a fragment snapshot when true.
   */
  resolved: boolean;
  /**
   * @lang zh-CN 生产者记录的可选来源节点身份。
   * @lang en Optional source-node identity recorded by the producer.
   */
  sourceNodeId?: string;
  /**
   * @lang zh-CN 发起该引用的可选文档字段路径。
   * @lang en Optional documentation-field path that originated the reference.
   */
  fieldPath?: string;
  /**
   * @lang zh-CN 可选目标片段快照，resolved为true时为必需。
   * @lang en Optional target-fragment snapshot, required when resolved is true.
   */
  fragment?: HiaSourceFragment;
  /**
   * @lang zh-CN 该引用解析或目标定位的可选诊断。
   * @lang en Optional diagnostics for reference resolution or target location.
   */
  diagnostics?: HiaDiagnostic[];
}

/**
 * @lang zh-CN 命名源码片段；id、相对路径、范围、正文与可信度必需，origin仅为JSON对象扩展。
 * @lang en Named source fragment requiring id, relative path, range, text and confidence; origin is a JSON-object extension only.
 */
export interface HiaSourceFragment extends HiaSourceBlockBase {
  /**
   * @lang zh-CN 命名源码片段的固定判别值source-fragment。
   * @lang en Fixed source-fragment discriminator for a named source fragment.
   */
  kind: "source-fragment";
  /**
   * @lang zh-CN 该命名片段的必需身份标识。
   * @lang en Required identity of this named fragment.
   */
  id: string;
  /**
   * @lang zh-CN 该命名片段所属源码文件的必需相对路径。
   * @lang en Required relative path of the source file containing this named fragment.
   */
  relativePath: string;
  /**
   * @lang zh-CN 该命名片段的必需源码范围。
   * @lang en Required source range of this named fragment.
   */
  range: HiaSourceRange;
  /**
   * @lang zh-CN 该片段范围的既有位置来源类别。
   * @lang en Established position-origin kind for this fragment's range.
   */
  rangeSource: HiaSourceRangeSource;
  /**
   * @lang zh-CN 该片段的位置可信度，unresolved来源须搭配none。
   * @lang en Position confidence of this fragment, with unresolved origin requiring none.
   */
  confidence: HiaSourceConfidence;
  /**
   * @lang zh-CN 可选领域来源扩展对象，按普通JSON对象校验。
   * @lang en Optional domain-provenance extension object validated as an ordinary JSON object.
   */
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
  /**
   * @lang zh-CN 源码来源模型名称，核心校验要求hia-source。
   * @lang en Source-provenance model name, required to be hia-source by core validation.
   */
  model: string;
  /**
   * @lang zh-CN 源码来源模型的独立版本身份，支持当前版本及0.2.0。
   * @lang en Independent version identity of the source-provenance model, supporting the current version and 0.2.0.
   */
  modelVersion: HiaSourceModelVersion;
  /**
   * @lang zh-CN 源码链接和正文的消费意图，采用none、link、include或all。
   * @lang en Consumption intent for source links and text, using none, link, include or all.
   */
  mode: HiaSourceMode;
  /**
   * @lang zh-CN 可选符号定义定位，携带相对路径与一基准位置。
   * @lang en Optional symbol-definition location with a relative path and one-based position.
   */
  definedIn?: HiaSourceDefinedIn;
  /**
   * @lang zh-CN 可选当前符号源码块，允许用null表示未提供源码块。
   * @lang en Optional source block for the current symbol, with null allowed to indicate no supplied block.
   */
  primaryBlock?: HiaSourcePrimaryBlock | null;
  /**
   * @lang zh-CN 文档字段中的可选命名源码片段引用。
   * @lang en Optional references from documentation fields to named source fragments.
   */
  references?: HiaSourceReference[];
  /**
   * @lang zh-CN 该符号保留的可选命名源码片段列表。
   * @lang en Optional named source fragments retained by this symbol.
   */
  fragments?: HiaSourceFragment[];
  /**
   * @lang zh-CN 附属于源码来源模型的可选诊断。
   * @lang en Optional diagnostics attached to the source-provenance model.
   */
  diagnostics?: HiaDiagnostic[];
}
