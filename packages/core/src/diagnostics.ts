/**
 * @file
 * @lang zh-CN 公开诊断代码目录和内存构造器；不会自动净化调用者提供的正文或data。
 * @lang en Public diagnostic-code catalog and in-memory builders; do not automatically redact caller text or data.
 */
import type {
  HiaDiagnostic,
  HiaDiagnosticData,
  HiaDiagnosticSeverity
} from "./model.js";

/** @lang zh-CN 已知诊断职责层，帮助消费者分类，不定义权限边界。
 * @lang en Known diagnostic responsibility layers for consumer grouping, not permission boundaries.
 */
export type HiaDiagnosticLayer = "core" | "i18n" | "source" | "config" | "cli" | "lsp" | "adapter";

/** @lang zh-CN 已注册代码的默认严重性、职责层和公开说明；构造器不会自动套用默认严重性。
 * @lang en Registered code defaults, responsibility layer and public description; builders do not automatically apply default severity.
 */
export interface HiaDiagnosticCodeDefinition {
  code: string;
  defaultSeverity: HiaDiagnosticSeverity;
  layer: HiaDiagnosticLayer;
  description: string;
}

/** @lang zh-CN 已知代码只读约定目录；数组和条目未在运行时冻结，消费者不可擅改共享事实。
 * @lang en Catalog of known codes under a read-only convention; arrays/entries are not runtime-frozen and consumers must not mutate shared facts.
 */
export const HIA_DIAGNOSTIC_CODE_REGISTRY = [
  { code: "HIA_DOCUMENT_INVALID", defaultSeverity: "error", layer: "core", description: "Core document payload is not an object." },
  // <lang><zh-CN>普通wire数据先验失败，不包含异常原文或不可信动态键。</zh-CN><en>Ordinary-wire data preflight failure, without exception text or untrusted dynamic keys.</en></lang>
  { code: "HIA_DOCUMENT_JSON_INVALID", defaultSeverity: "error", layer: "core", description: "Core document must be ordinary finite acyclic JSON data without accessors or custom serialization hooks." },
  { code: "HIA_SCHEMA_VERSION_UNSUPPORTED", defaultSeverity: "error", layer: "core", description: "Core document schemaVersion is unsupported." },
  { code: "HIA_FIELD_MISSING", defaultSeverity: "error", layer: "core", description: "Required field is missing or empty." },
  { code: "HIA_FIELD_INVALID", defaultSeverity: "error", layer: "core", description: "Field shape or value is invalid." },
  { code: "HIA_DEFAULT_LOCALE_MISSING", defaultSeverity: "error", layer: "core", description: "defaultLocale is not included in locales." },
  { code: "HIA_NODE_INVALID", defaultSeverity: "error", layer: "core", description: "Document node shape is invalid." },
  { code: "HIA_SYMBOL_INVALID", defaultSeverity: "error", layer: "core", description: "Symbol shape is invalid." },
  { code: "HIA_DIAGNOSTICS_INVALID", defaultSeverity: "error", layer: "core", description: "Diagnostics field must be an array." },
  { code: "HIA_DIAGNOSTIC_INVALID", defaultSeverity: "error", layer: "core", description: "Diagnostic entry must be an object." },
  { code: "HIA_DIAGNOSTIC_DATA_INVALID", defaultSeverity: "error", layer: "core", description: "Diagnostic data must be an object when present." },
  { code: "HIA_DIAGNOSTIC_SEVERITY_INVALID", defaultSeverity: "error", layer: "core", description: "Diagnostic severity is unsupported." },
  { code: "HIA_I18N_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n model shape is invalid." },
  { code: "HIA_I18N_MODEL_UNSUPPORTED", defaultSeverity: "error", layer: "i18n", description: "i18n model name is unsupported." },
  { code: "HIA_I18N_MODEL_VERSION_UNSUPPORTED", defaultSeverity: "error", layer: "i18n", description: "i18n model version is unsupported." },
  { code: "HIA_I18N_DEFAULT_LOCALE_MISSING", defaultSeverity: "error", layer: "i18n", description: "i18n.defaultLocale is not included in i18n.locales." },
  { code: "HIA_I18N_FIELDS_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n.fields must be an object." },
  { code: "HIA_I18N_FIELD_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n field shape is invalid." },
  { code: "HIA_I18N_FIELD_PATH_MISMATCH", defaultSeverity: "error", layer: "i18n", description: "i18n field map key and fieldPath differ." },
  { code: "HIA_I18N_LOCALIZED_TEXT_INVALID", defaultSeverity: "error", layer: "i18n", description: "localizedText shape is invalid." },
  { code: "HIA_I18N_RESOURCE_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n resource shape is invalid." },
  { code: "HIA_I18N_RESOURCE_PATH_MISSING", defaultSeverity: "error", layer: "i18n", description: "i18n resource path is missing." },
  { code: "HIA_I18N_RESOURCE_ABSOLUTE_PATH", defaultSeverity: "error", layer: "i18n", description: "i18n resource path is absolute." },
  { code: "HIA_I18N_RESOURCE_PATH_TRAVERSAL", defaultSeverity: "error", layer: "i18n", description: "i18n resource path escapes its boundary." },
  { code: "HIA_I18N_BLOCK_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n language block shape is invalid." },
  { code: "HIA_I18N_SEGMENT_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n inline segment shape is invalid." },
  { code: "HIA_I18N_RESOLUTIONS_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n resolutions map is invalid." },
  { code: "HIA_I18N_RESOLUTION_INVALID", defaultSeverity: "error", layer: "i18n", description: "i18n resolution shape is invalid." },
  { code: "HIA_TEXT_RANGE_INVALID", defaultSeverity: "error", layer: "i18n", description: "Text range shape is invalid." },
  { code: "HIA_SOURCE_INVALID", defaultSeverity: "error", layer: "source", description: "Source metadata shape is invalid." },
  { code: "HIA_SOURCE_MODEL_UNSUPPORTED", defaultSeverity: "error", layer: "source", description: "Source model name is unsupported." },
  { code: "HIA_SOURCE_MODEL_VERSION_UNSUPPORTED", defaultSeverity: "error", layer: "source", description: "Source model version is unsupported." },
  { code: "HIA_SOURCE_MODE_UNSUPPORTED", defaultSeverity: "error", layer: "source", description: "Source mode is unsupported." },
  { code: "HIA_SOURCE_KIND_INVALID", defaultSeverity: "error", layer: "source", description: "Source kind discriminator is invalid." },
  { code: "HIA_SOURCE_REFERENCE_INVALID", defaultSeverity: "error", layer: "source", description: "Source reference shape is invalid." },
  { code: "HIA_SOURCE_REFERENCE_FRAGMENT_MISSING", defaultSeverity: "error", layer: "source", description: "Resolved source reference is missing its fragment snapshot." },
  { code: "HIA_SOURCE_FRAGMENT_INVALID", defaultSeverity: "error", layer: "source", description: "Source fragment shape is invalid." },
  { code: "HIA_SOURCE_BLOCK_INVALID", defaultSeverity: "error", layer: "source", description: "Source block shape is invalid." },
  { code: "HIA_SOURCE_RANGE_SOURCE_UNSUPPORTED", defaultSeverity: "error", layer: "source", description: "Source rangeSource is unsupported." },
  { code: "HIA_SOURCE_CONFIDENCE_UNSUPPORTED", defaultSeverity: "error", layer: "source", description: "Source confidence is unsupported." },
  { code: "HIA_SOURCE_RANGE_CONFIDENCE_MISMATCH", defaultSeverity: "error", layer: "source", description: "Source rangeSource and confidence are inconsistent." },
  { code: "HIA_SOURCE_LINK_INVALID", defaultSeverity: "error", layer: "source", description: "Source link shape is invalid." },
  { code: "HIA_SOURCE_PREVIEW_INVALID", defaultSeverity: "error", layer: "source", description: "Source preview shape is invalid." },
  { code: "HIA_SOURCE_PATH_MISSING", defaultSeverity: "error", layer: "source", description: "Source relative path is missing." },
  { code: "HIA_SOURCE_ABSOLUTE_PATH", defaultSeverity: "error", layer: "source", description: "Source path is absolute." },
  { code: "HIA_SOURCE_PATH_TRAVERSAL", defaultSeverity: "error", layer: "source", description: "Source path escapes its boundary." },
  { code: "HIA_SOURCE_RANGE_INVALID", defaultSeverity: "error", layer: "source", description: "Source range shape is invalid." },
  { code: "HIA_SOURCE_POSITION_INVALID", defaultSeverity: "error", layer: "source", description: "Source position is invalid." },
  { code: "HIA_SOURCE_RANGE_ORDER_INVALID", defaultSeverity: "error", layer: "source", description: "Source range end is before start." },
  { code: "HIA_SOURCE_REFERENCE_UNRESOLVED", defaultSeverity: "warning", layer: "source", description: "Source reference target cannot be resolved." },
  { code: "HIA_CONFIG_INVALID", defaultSeverity: "error", layer: "config", description: "Project config is not an object." },
  { code: "HIA_CONFIG_PARSE_FAILED", defaultSeverity: "error", layer: "config", description: "Project config cannot be parsed." },
  { code: "HIA_CONFIG_READ_FAILED", defaultSeverity: "error", layer: "config", description: "Project config cannot be read." },
  { code: "HIA_CONFIG_SCHEMA_UNSUPPORTED", defaultSeverity: "error", layer: "config", description: "Project config schemaVersion is unsupported." },
  { code: "HIA_CONFIG_DOCS_INVALID", defaultSeverity: "error", layer: "config", description: "docs config shape is invalid." },
  { code: "HIA_CONFIG_RENDERER_INVALID", defaultSeverity: "error", layer: "config", description: "docs.renderer shape is invalid." },
  { code: "HIA_CONFIG_THEME_INVALID", defaultSeverity: "error", layer: "config", description: "docs.theme shape is invalid." },
  { code: "HIA_CONFIG_THEME_UNSUPPORTED", defaultSeverity: "warning", layer: "config", description: "Configured theme is not implemented." },
  { code: "HIA_CONFIG_SOURCE_INVALID", defaultSeverity: "error", layer: "config", description: "docs.source shape is invalid." },
  { code: "HIA_CONFIG_FIELD_INVALID", defaultSeverity: "error", layer: "config", description: "Config field value is invalid." },
  { code: "HIA_CLI_INPUT_READ_FAILED", defaultSeverity: "error", layer: "cli", description: "CLI input document cannot be read." },
  { code: "HIA_CLI_LOCALE_NOT_DECLARED", defaultSeverity: "warning", layer: "cli", description: "Configured locale is not declared by the document." },
  { code: "HIA_CLI_MANIFEST_PATH_INVALID", defaultSeverity: "error", layer: "cli", description: "Output manifest path escapes the output directory." },
  { code: "HIA_CLI_OPTION_VALUE_MISSING", defaultSeverity: "error", layer: "cli", description: "CLI option value is missing." },
  { code: "HIA_LSP_CORE_VALIDATION", defaultSeverity: "error", layer: "lsp", description: "LSP mapped a core validation diagnostic." },
  { code: "HIA_LSP_I18N_LOCALE_MISSING", defaultSeverity: "warning", layer: "lsp", description: "LSP detected a missing localized field." },
  { code: "HIA_LSP_I18N_KEY_DUPLICATE", defaultSeverity: "warning", layer: "lsp", description: "LSP detected duplicate i18n keys." },
  { code: "HIA_LSP_SOURCE_REFERENCE_INVALID", defaultSeverity: "error", layer: "lsp", description: "LSP detected an unresolved or incomplete source reference." },
  { code: "HIA_LSP_JSON_PARSE_ERROR", defaultSeverity: "error", layer: "lsp", description: "LSP document text is not valid JSON." },
  { code: "HIA_JSDOC_INTEGRATION_INVALID", defaultSeverity: "error", layer: "adapter", description: "JSDoc Integration payload is invalid." },
  { code: "HIA_JSDOC_CONTRACT_UNSUPPORTED", defaultSeverity: "warning", layer: "adapter", description: "JSDoc Integration contract is unsupported." },
  { code: "HIA_JSDOC_CONTRACT_VERSION_UNSUPPORTED", defaultSeverity: "warning", layer: "adapter", description: "JSDoc Integration contractVersion is unsupported." },
  { code: "HIA_JSDOC_NODE_INVALID", defaultSeverity: "warning", layer: "adapter", description: "JSDoc Integration node is invalid." },
  { code: "HIA_JSDOC_ADAPTER_DIAGNOSTIC", defaultSeverity: "warning", layer: "adapter", description: "Generic diagnostic from the JSDoc adapter." }
] as const satisfies readonly HiaDiagnosticCodeDefinition[];

/** @lang zh-CN 已知代码与开放扩展名称；未注册名称不自动获得默认说明或严重性。
 * @lang en Known codes plus open extension names; unregistered names do not automatically receive defaults or descriptions.
 */
export type HiaDiagnosticCode = typeof HIA_DIAGNOSTIC_CODE_REGISTRY[number]["code"] | string;

/**
 * @lang zh-CN 精确查询已注册代码，区分大小写。
 * @lang en Looks up a registered code by exact case-sensitive name.
 * @param code <lang><zh-CN>原始代码名，不从原型属性查询。</zh-CN><en>Original code name, never looked up through prototype properties.</en></lang>
 * @returns <lang><zh-CN>共享原条目或undefined；修改条目会影响后续查询，不执行I/O。</zh-CN><en>Original shared entry or undefined; mutation affects later queries, without I/O.</en></lang>
 */
export function getHiaDiagnosticCodeDefinition(code: string): HiaDiagnosticCodeDefinition | undefined {
  return HIA_DIAGNOSTIC_CODE_REGISTRY.find((item) => item.code === code);
}

/**
 * @lang zh-CN 判断代码是否精确注册，不验证任意诊断对象。
 * @lang en Determines whether a code is exactly registered, without validating arbitrary diagnostics.
 * @param code <lang><zh-CN>待查询原始名称。</zh-CN><en>Original name to query.</en></lang>
 * @returns <lang><zh-CN>注册为true，未知为false；无输入修改。</zh-CN><en>True when registered, false otherwise, without mutation.</en></lang>
 */
export function isKnownHiaDiagnosticCode(code: string): boolean {
  return Boolean(getHiaDiagnosticCodeDefinition(code));
}

/**
 * @lang zh-CN 构造诊断而不校验或脱敏正文/data；严重性必须由调用者显式提供。
 * @lang en Builds a diagnostic without validating or redacting text/data; severity is explicitly caller-supplied.
 * @param code <lang><zh-CN>已知或扩展代码。</zh-CN><en>Known or extension code.</en></lang>
 * @param message <lang><zh-CN>调用者已审阅的公开正文。</zh-CN><en>Caller-reviewed public message.</en></lang>
 * @param severity <lang><zh-CN>显式严重性，不自动使用registry默认。</zh-CN><en>Explicit severity, without automatic registry defaults.</en></lang>
 * @param options <lang><zh-CN>默认空；data保留引用，空路径省略，非空targetPath缺省同时填入path。</zh-CN><en>Empty by default; data retains its reference, empty paths are omitted, and a nonempty targetPath also supplies path when absent.</en></lang>
 * @returns <lang><zh-CN>新诊断对象，无I/O或输入修改；wire使用前仍需相应验证。</zh-CN><en>New diagnostic without I/O or input mutation; wire use still requires appropriate validation.</en></lang>
 */
export function createHiaDiagnostic(
  code: HiaDiagnosticCode,
  message: string,
  severity: HiaDiagnosticSeverity,
  options: {
    data?: HiaDiagnosticData;
    path?: string;
    targetPath?: string;
  } = {}
): HiaDiagnostic {
  // <lang><zh-CN>新建诊断外壳；可选data的所有权不转移。</zh-CN><en>Create a new diagnostic shell without transferring ownership of optional data.</en></lang>
  const diagnostic: HiaDiagnostic = {
    code,
    message,
    severity
  };

  if (options.data) {
    diagnostic.data = options.data;
  }

  if (options.path) {
    diagnostic.path = options.path;
  }

  if (options.targetPath) {
    diagnostic.targetPath = options.targetPath;
    diagnostic.path = options.path ?? options.targetPath;
  }

  return diagnostic;
}
