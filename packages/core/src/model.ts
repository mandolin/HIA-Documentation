export const HIA_CORE_PACKAGE_NAME = "@hia-doc/core";
export const HIA_CORE_CONTRACT_VERSION = "0.2.0";
export const HIA_TEXT_I18N_MODEL = "hia-text-i18n";
export const HIA_TEXT_I18N_MODEL_VERSION = "0.2.0";
export const HIA_SOURCE_MODEL = "hia-source";
export const HIA_SOURCE_MODEL_VERSION = "0.2.0";
export const HIA_SOURCE_MODES = ["none", "link", "include", "all"] as const;
export const HIA_SOURCE_RANGE_SOURCES = ["heuristic", "parser", "parser-js", "jsdoc-meta", "manual", "unresolved"] as const;
export const HIA_SOURCE_CONFIDENCE_LEVELS = ["high", "medium", "low", "none"] as const;

export type HiaDiagnosticSeverity = "info" | "warning" | "error";
export type HiaFallbackLocale = string | string[];
export type HiaLocalizedText = Record<string, string>;
export type HiaI18nTextSourceKind = "localized-text" | "inline-segment" | "lang-block" | "external-resource" | "default-text" | string;
export type HiaI18nResourceFormat = "hia-i18n-json" | "json" | string;
export type HiaSymbolKind = "module" | "class" | "function" | "member" | "constant" | "typedef" | string;
export type HiaNodeKind = "root" | "module" | "namespace" | "group" | string;
export type HiaSourceMode = typeof HIA_SOURCE_MODES[number];
export type HiaSourceRangeSource = typeof HIA_SOURCE_RANGE_SOURCES[number];
export type HiaSourceConfidence = typeof HIA_SOURCE_CONFIDENCE_LEVELS[number];
export type HiaSourceBlockKind = "primary-block" | "source-fragment";

export interface HiaRuntimeInfo {
  packageName: string;
  contractVersion: string;
}

export interface HiaDiagnostic {
  code: string;
  message: string;
  severity: HiaDiagnosticSeverity;
  path?: string;
  targetPath?: string;
}

export interface HiaDocument {
  schemaVersion: string;
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

export interface HiaNode {
  id: string;
  kind: HiaNodeKind;
  title: string;
  symbolIds?: string[];
  children?: HiaNode[];
}

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

export interface HiaI18nModel {
  enabled: boolean;
  model: string;
  modelVersion: string;
  defaultLocale: string;
  locales: string[];
  fields: Record<string, HiaI18nField>;
  fallbackLocale?: HiaFallbackLocale;
  mode?: "runtimeSwitch" | "perLocale" | "hiaIntegration" | string;
  resources?: HiaI18nResource[];
  diagnostics?: HiaDiagnostic[];
}

export interface HiaI18nResource {
  kind?: "external-resource" | string;
  path: string;
  locale?: string;
  fields?: string[];
  format?: HiaI18nResourceFormat;
}

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

export interface HiaLangBlock {
  kind: "lang-block";
  locale: string;
  fieldPath: string;
  text: string;
  source?: string;
  rangeInComment?: HiaTextRange | null;
}

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

export interface HiaTextRange {
  start: number;
  end: number;
}

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

export interface HiaResolvedText extends HiaTextResolution {
  text: string;
}

export interface HiaSourcePosition {
  line: number;
  column?: number;
}

export interface HiaSourceRange {
  start: HiaSourcePosition;
  end: HiaSourcePosition;
}

export interface HiaSourceLink {
  enabled: boolean;
  fileUrl?: string;
  lineUrl?: string;
  openMode?: "same-tab" | "new-tab" | string;
}

export interface HiaSourcePreview {
  enabled: boolean;
  defaultExpanded?: boolean;
  content?: string;
  language?: string;
  range?: HiaSourceRange;
}

export interface HiaSourceDefinedIn {
  kind: "defined-in";
  relativePath: string;
  language?: string;
  position: HiaSourcePosition;
  range?: HiaSourceRange;
  link?: HiaSourceLink;
}

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

export interface HiaSourcePrimaryBlock extends HiaSourceBlockBase {
  kind: "primary-block";
}

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

export interface HiaSourceFragment extends HiaSourceBlockBase {
  kind: "source-fragment";
  id: string;
  relativePath: string;
  range: HiaSourceRange;
  rangeSource: HiaSourceRangeSource;
  confidence: HiaSourceConfidence;
  origin?: Record<string, unknown>;
}

export type HiaSourceBlock = HiaSourcePrimaryBlock | HiaSourceFragment;

export interface HiaSourceMetadata {
  model: string;
  modelVersion: string;
  mode: HiaSourceMode;
  definedIn?: HiaSourceDefinedIn;
  primaryBlock?: HiaSourcePrimaryBlock | null;
  references?: HiaSourceReference[];
  fragments?: HiaSourceFragment[];
  diagnostics?: HiaDiagnostic[];
}
