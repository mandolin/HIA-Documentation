import type {
  HiaDiagnostic,
  HiaDiagnosticData,
  HiaDiagnosticSeverity
} from "./model.js";

export type HiaDiagnosticLayer = "core" | "i18n" | "source" | "config" | "cli" | "lsp" | "adapter";

export interface HiaDiagnosticCodeDefinition {
  code: string;
  defaultSeverity: HiaDiagnosticSeverity;
  layer: HiaDiagnosticLayer;
  description: string;
}

export const HIA_DIAGNOSTIC_CODE_REGISTRY = [
  { code: "HIA_DOCUMENT_INVALID", defaultSeverity: "error", layer: "core", description: "Core document payload is not an object." },
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
  { code: "HIA_JSDOC_NODE_INVALID", defaultSeverity: "warning", layer: "adapter", description: "JSDoc Integration node is invalid." },
  { code: "HIA_JSDOC_ADAPTER_DIAGNOSTIC", defaultSeverity: "warning", layer: "adapter", description: "Generic diagnostic from the JSDoc adapter." }
] as const satisfies readonly HiaDiagnosticCodeDefinition[];

export type HiaDiagnosticCode = typeof HIA_DIAGNOSTIC_CODE_REGISTRY[number]["code"] | string;

export function getHiaDiagnosticCodeDefinition(code: string): HiaDiagnosticCodeDefinition | undefined {
  return HIA_DIAGNOSTIC_CODE_REGISTRY.find((item) => item.code === code);
}

export function isKnownHiaDiagnosticCode(code: string): boolean {
  return Boolean(getHiaDiagnosticCodeDefinition(code));
}

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

