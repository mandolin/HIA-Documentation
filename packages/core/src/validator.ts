import {
  HIA_CORE_CONTRACT_VERSION,
  HIA_SOURCE_CONFIDENCE_LEVELS,
  HIA_SOURCE_MODEL,
  HIA_SOURCE_MODEL_VERSION,
  HIA_SOURCE_MODES,
  HIA_SOURCE_RANGE_SOURCES,
  HIA_TEXT_I18N_MODEL,
  HIA_TEXT_I18N_MODEL_VERSION
} from "./model.js";
import type {
  HiaDiagnostic,
  HiaDiagnosticSeverity,
  HiaDocument,
  HiaI18nField,
  HiaI18nModel,
  HiaLangBlock,
  HiaLangInlineSegment,
  HiaNode,
  HiaSourceFragment,
  HiaSourceMetadata,
  HiaSourcePosition,
  HiaSourcePrimaryBlock,
  HiaSourceReference,
  HiaSymbol
} from "./model.js";

export interface HiaValidationResult {
  valid: boolean;
  diagnostics: HiaDiagnostic[];
}

export function validateHiaDocument(document: unknown): HiaDiagnostic[] {
  return validateHiaDocumentDetailed(document).diagnostics;
}

export function validateHiaDocumentDetailed(document: unknown): HiaValidationResult {
  const diagnostics: HiaDiagnostic[] = [];

  if (!isRecord(document)) {
    return {
      valid: false,
      diagnostics: [
        createDiagnostic("HIA_DOCUMENT_INVALID", "HIA document must be an object.", "error")
      ]
    };
  }

  requireString(document, "schemaVersion", diagnostics);
  requireString(document, "id", diagnostics);
  requireString(document, "title", diagnostics);
  requireString(document, "defaultLocale", diagnostics);
  requireArray(document, "locales", diagnostics);
  requireArray(document, "nodes", diagnostics);
  requireArray(document, "symbols", diagnostics);

  if (document.schemaVersion && document.schemaVersion !== HIA_CORE_CONTRACT_VERSION) {
    diagnostics.push(createDiagnostic(
      "HIA_SCHEMA_VERSION_UNSUPPORTED",
      `Unsupported HIA schemaVersion: ${String(document.schemaVersion)}.`,
      "error",
      "schemaVersion"
    ));
  }

  if (Array.isArray(document.locales) && typeof document.defaultLocale === "string" && !document.locales.includes(document.defaultLocale)) {
    diagnostics.push(createDiagnostic(
      "HIA_DEFAULT_LOCALE_MISSING",
      "defaultLocale must be included in locales.",
      "error",
      "defaultLocale"
    ));
  }

  if (Array.isArray(document.locales)) {
    validateStringArray(document.locales, diagnostics, "locales", true);
  }

  validateFallbackLocale(document.fallbackLocale, diagnostics, "fallbackLocale");
  validateDiagnostics(document.diagnostics, diagnostics, "diagnostics");

  if (Array.isArray(document.nodes)) {
    validateNodes(document.nodes, diagnostics, "nodes");
  }

  if (Array.isArray(document.symbols)) {
    validateSymbols(document.symbols, diagnostics);
  }

  return {
    valid: diagnostics.every((item) => item.severity !== "error"),
    diagnostics
  };
}

function validateNodes(nodes: unknown[], diagnostics: HiaDiagnostic[], targetPath: string): void {
  for (const [index, node] of nodes.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(node)) {
      diagnostics.push(createDiagnostic("HIA_NODE_INVALID", "HIA node must be an object.", "error", itemPath));
      continue;
    }

    const typedNode = node as unknown as HiaNode;

    requireString(node, "id", diagnostics, itemPath);
    requireString(node, "kind", diagnostics, itemPath);
    requireString(node, "title", diagnostics, itemPath);
    validateOptionalStringArray(typedNode.symbolIds, diagnostics, `${itemPath}.symbolIds`);

    if (typedNode.children !== undefined) {
      if (!Array.isArray(typedNode.children)) {
        diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${itemPath}.children must be an array.`, "error", `${itemPath}.children`));
      } else {
        validateNodes(typedNode.children, diagnostics, `${itemPath}.children`);
      }
    }
  }
}

function validateSymbols(symbols: unknown[], diagnostics: HiaDiagnostic[]): void {
  for (const [index, symbol] of symbols.entries()) {
    const targetPath = `symbols.${index}`;

    if (!isRecord(symbol)) {
      diagnostics.push(createDiagnostic("HIA_SYMBOL_INVALID", "HIA symbol must be an object.", "error", targetPath));
      continue;
    }

    const typedSymbol = symbol as unknown as HiaSymbol;

    for (const field of ["id", "name", "kind"] as const) {
      requireString(symbol, field, diagnostics, targetPath);
    }

    validateOptionalString(symbol, "longname", diagnostics, targetPath);
    validateOptionalString(symbol, "parentId", diagnostics, targetPath);
    validateOptionalString(symbol, "signature", diagnostics, targetPath);
    validateOptionalString(symbol, "summary", diagnostics, targetPath);
    validateOptionalStringArray(typedSymbol.path, diagnostics, `${targetPath}.path`);
    validateDiagnostics(typedSymbol.diagnostics, diagnostics, `${targetPath}.diagnostics`);

    if (typedSymbol.i18n) {
      validateI18nModel(typedSymbol.i18n, diagnostics, `${targetPath}.i18n`);
    }

    if (typedSymbol.source) {
      validateSourceMetadata(typedSymbol.source, diagnostics, `${targetPath}.source`);
    }
  }
}

function validateI18nModel(model: HiaI18nModel, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(model)) {
    diagnostics.push(createDiagnostic("HIA_I18N_INVALID", "i18n must be an object.", "error", targetPath));
    return;
  }

  if (typeof model.enabled !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.enabled must be a boolean.`, "error", `${targetPath}.enabled`));
  }

  requireString(model, "model", diagnostics, targetPath);
  requireString(model, "modelVersion", diagnostics, targetPath);
  requireString(model, "defaultLocale", diagnostics, targetPath);
  requireArray(model, "locales", diagnostics, targetPath);

  if (model.model && model.model !== HIA_TEXT_I18N_MODEL) {
    diagnostics.push(createDiagnostic(
      "HIA_I18N_MODEL_UNSUPPORTED",
      `Unsupported i18n model: ${model.model}.`,
      "error",
      `${targetPath}.model`
    ));
  }

  if (model.modelVersion && model.modelVersion !== HIA_TEXT_I18N_MODEL_VERSION) {
    diagnostics.push(createDiagnostic(
      "HIA_I18N_MODEL_VERSION_UNSUPPORTED",
      `Unsupported i18n modelVersion: ${model.modelVersion}.`,
      "error",
      `${targetPath}.modelVersion`
    ));
  }

  if (Array.isArray(model.locales)) {
    validateStringArray(model.locales, diagnostics, `${targetPath}.locales`, true);

    if (typeof model.defaultLocale === "string" && !model.locales.includes(model.defaultLocale)) {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_DEFAULT_LOCALE_MISSING",
        "i18n.defaultLocale must be included in i18n.locales.",
        "error",
        `${targetPath}.defaultLocale`
      ));
    }
  }

  validateFallbackLocale(model.fallbackLocale, diagnostics, `${targetPath}.fallbackLocale`);
  validateI18nFields(model.fields, diagnostics, `${targetPath}.fields`);
  validateI18nResources(model.resources, diagnostics, `${targetPath}.resources`);
  validateDiagnostics(model.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateI18nFields(fields: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(fields)) {
    diagnostics.push(createDiagnostic("HIA_I18N_FIELDS_INVALID", "i18n.fields must be an object.", "error", targetPath));
    return;
  }

  for (const [fieldPath, field] of Object.entries(fields)) {
    const itemPath = `${targetPath}.${fieldPath}`;

    if (!isRecord(field)) {
      diagnostics.push(createDiagnostic("HIA_I18N_FIELD_INVALID", "i18n field must be an object.", "error", itemPath));
      continue;
    }

    const typedField = field as unknown as HiaI18nField;
    requireString(field, "fieldPath", diagnostics, itemPath);
    requireString(field, "kind", diagnostics, itemPath);
    requireString(field, "defaultLocale", diagnostics, itemPath);
    validateOptionalString(field, "key", diagnostics, itemPath);
    validateOptionalString(field, "path", diagnostics, itemPath);

    if (typedField.fieldPath && typedField.fieldPath !== fieldPath) {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_FIELD_PATH_MISMATCH",
        "i18n field key must match fieldPath.",
        "error",
        `${itemPath}.fieldPath`
      ));
    }

    if (!isRecord(typedField.localizedText)) {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_LOCALIZED_TEXT_INVALID",
        "i18n field localizedText must be an object.",
        "error",
        `${itemPath}.localizedText`
      ));
    } else {
      validateLocalizedText(typedField.localizedText, diagnostics, `${itemPath}.localizedText`);
    }

    validateLangBlocks(typedField.blocks, diagnostics, `${itemPath}.blocks`);
    validateLangInlineSegments(typedField.segments, diagnostics, `${itemPath}.segments`);
    validateTextResolutions(typedField.resolutions, diagnostics, `${itemPath}.resolutions`);
    validateOptionalStringArray(typedField.missingLocales, diagnostics, `${itemPath}.missingLocales`);
  }
}

function validateSourceMetadata(source: HiaSourceMetadata, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(source)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_INVALID", "source must be an object.", "error", targetPath));
    return;
  }

  requireString(source, "model", diagnostics, targetPath);
  requireString(source, "modelVersion", diagnostics, targetPath);
  requireString(source, "mode", diagnostics, targetPath);

  if (source.model && source.model !== HIA_SOURCE_MODEL) {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_MODEL_UNSUPPORTED",
      `Unsupported source model: ${source.model}.`,
      "error",
      `${targetPath}.model`
    ));
  }

  if (source.modelVersion && source.modelVersion !== HIA_SOURCE_MODEL_VERSION) {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_MODEL_VERSION_UNSUPPORTED",
      `Unsupported source modelVersion: ${source.modelVersion}.`,
      "error",
      `${targetPath}.modelVersion`
    ));
  }

  validateStringEnum(source.mode, HIA_SOURCE_MODES, "HIA_SOURCE_MODE_UNSUPPORTED", diagnostics, `${targetPath}.mode`);

  if (source.definedIn) {
    const definedIn = source.definedIn as unknown as Record<string, unknown>;

    requireString(definedIn, "kind", diagnostics, `${targetPath}.definedIn`);
    validateLiteral(definedIn.kind, "defined-in", "HIA_SOURCE_KIND_INVALID", diagnostics, `${targetPath}.definedIn.kind`);
    validateRelativePath(String(source.definedIn.relativePath || ""), diagnostics, `${targetPath}.definedIn.relativePath`);
    validateOptionalString(definedIn, "language", diagnostics, `${targetPath}.definedIn`);
    validatePosition(source.definedIn.position, diagnostics, `${targetPath}.definedIn.position`);
    validateRange(source.definedIn.range, diagnostics, `${targetPath}.definedIn.range`);
    validateSourceLink(source.definedIn.link, diagnostics, `${targetPath}.definedIn.link`);
  }

  if (source.primaryBlock) {
    validateSourceBlock(source.primaryBlock, "primary-block", diagnostics, `${targetPath}.primaryBlock`, false);
  }

  if (source.fragments !== undefined && !Array.isArray(source.fragments)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.fragments must be an array.`, "error", `${targetPath}.fragments`));
  } else {
    for (const [index, fragment] of (source.fragments || []).entries()) {
      validateSourceFragment(fragment, diagnostics, `${targetPath}.fragments.${index}`);
    }
  }

  if (source.references !== undefined && !Array.isArray(source.references)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.references must be an array.`, "error", `${targetPath}.references`));
  } else {
    for (const [index, reference] of (source.references || []).entries()) {
      validateSourceReference(reference, diagnostics, `${targetPath}.references.${index}`);
    }
  }

  validateDiagnostics(source.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateSourceReference(reference: HiaSourceReference, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(reference)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_REFERENCE_INVALID", "source reference must be an object.", "error", targetPath));
    return;
  }

  requireString(reference, "kind", diagnostics, targetPath);
  requireString(reference, "referenceKind", diagnostics, targetPath);
  requireString(reference, "targetId", diagnostics, targetPath);
  validateLiteral(reference.kind, "source-reference", "HIA_SOURCE_KIND_INVALID", diagnostics, `${targetPath}.kind`);

  validateOptionalString(reference as unknown as Record<string, unknown>, "sourceNodeId", diagnostics, targetPath);
  validateOptionalString(reference as unknown as Record<string, unknown>, "fieldPath", diagnostics, targetPath);

  if (typeof reference.resolved !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.resolved must be a boolean.`, "error", `${targetPath}.resolved`));
  }

  if (reference.resolved === true && !reference.fragment) {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_REFERENCE_FRAGMENT_MISSING",
      "Resolved source references must include a fragment snapshot.",
      "error",
      `${targetPath}.fragment`
    ));
  }

  if (reference.fragment) {
    validateSourceFragment(reference.fragment, diagnostics, `${targetPath}.fragment`);
  }

  validateDiagnostics(reference.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateSourceFragment(fragment: HiaSourceFragment, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!isRecord(fragment)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_FRAGMENT_INVALID", "source fragment must be an object.", "error", targetPath));
    return;
  }

  requireString(fragment, "kind", diagnostics, targetPath);
  requireString(fragment, "id", diagnostics, targetPath);
  requireString(fragment, "relativePath", diagnostics, targetPath);
  requireString(fragment, "content", diagnostics, targetPath);
  validateSourceBlock(fragment, "source-fragment", diagnostics, targetPath, true);
}

function validateSourceBlock(
  block: HiaSourcePrimaryBlock | HiaSourceFragment,
  expectedKind: "primary-block" | "source-fragment",
  diagnostics: HiaDiagnostic[],
  targetPath: string,
  requirePathAndRange: boolean
): void {
  if (!isRecord(block)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_BLOCK_INVALID", "source block must be an object.", "error", targetPath));
    return;
  }

  requireString(block, "kind", diagnostics, targetPath);
  requireString(block, "content", diagnostics, targetPath);
  requireString(block, "rangeSource", diagnostics, targetPath);
  requireString(block, "confidence", diagnostics, targetPath);
  validateLiteral(block.kind, expectedKind, "HIA_SOURCE_KIND_INVALID", diagnostics, `${targetPath}.kind`);
  validateStringEnum(block.rangeSource, HIA_SOURCE_RANGE_SOURCES, "HIA_SOURCE_RANGE_SOURCE_UNSUPPORTED", diagnostics, `${targetPath}.rangeSource`);
  validateStringEnum(block.confidence, HIA_SOURCE_CONFIDENCE_LEVELS, "HIA_SOURCE_CONFIDENCE_UNSUPPORTED", diagnostics, `${targetPath}.confidence`);
  validateOptionalString(block, "language", diagnostics, targetPath);

  if (block.id !== undefined) {
    validateOptionalString(block, "id", diagnostics, targetPath);
  }

  if (requirePathAndRange || block.relativePath !== undefined) {
    validateRelativePath(String(block.relativePath || ""), diagnostics, `${targetPath}.relativePath`);
  }

  if (requirePathAndRange || block.range !== undefined) {
    validateRange(block.range, diagnostics, `${targetPath}.range`);
  }

  if (block.rangeSource === "unresolved" && block.confidence !== "none") {
    diagnostics.push(createDiagnostic(
      "HIA_SOURCE_RANGE_CONFIDENCE_MISMATCH",
      "source blocks with rangeSource unresolved must use confidence none.",
      "error",
      `${targetPath}.confidence`
    ));
  }

  validateSourceLink(block.link, diagnostics, `${targetPath}.link`);
  validateSourcePreview(block.preview, diagnostics, `${targetPath}.preview`);
  validateDiagnostics(block.diagnostics, diagnostics, `${targetPath}.diagnostics`);
}

function validateI18nResources(resources: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (resources === undefined) {
    return;
  }

  if (!Array.isArray(resources)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, resource] of resources.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(resource)) {
      diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_INVALID", "i18n resource must be an object.", "error", itemPath));
      continue;
    }

    requireString(resource, "path", diagnostics, itemPath);
    validateI18nResourcePath(String(resource.path || ""), diagnostics, `${itemPath}.path`);
    validateOptionalString(resource, "kind", diagnostics, itemPath);
    validateOptionalString(resource, "locale", diagnostics, itemPath);
    validateOptionalString(resource, "format", diagnostics, itemPath);
    validateOptionalStringArray(resource.fields, diagnostics, `${itemPath}.fields`);
  }
}

function validateLangBlocks(blocks: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (blocks === undefined) {
    return;
  }

  if (!Array.isArray(blocks)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, block] of blocks.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(block)) {
      diagnostics.push(createDiagnostic("HIA_I18N_BLOCK_INVALID", "i18n block must be an object.", "error", itemPath));
      continue;
    }

    const typedBlock = block as unknown as HiaLangBlock;
    requireString(block, "kind", diagnostics, itemPath);
    requireString(block, "locale", diagnostics, itemPath);
    requireString(block, "fieldPath", diagnostics, itemPath);
    requireString(block, "text", diagnostics, itemPath);
    validateTextRange(typedBlock.rangeInComment ?? undefined, diagnostics, `${itemPath}.rangeInComment`);
  }
}

function validateLangInlineSegments(segments: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (segments === undefined) {
    return;
  }

  if (!Array.isArray(segments)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, segment] of segments.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(segment)) {
      diagnostics.push(createDiagnostic("HIA_I18N_SEGMENT_INVALID", "i18n segment must be an object.", "error", itemPath));
      continue;
    }

    const typedSegment = segment as unknown as HiaLangInlineSegment;
    requireString(segment, "kind", diagnostics, itemPath);
    requireString(segment, "id", diagnostics, itemPath);
    requireString(segment, "fieldPath", diagnostics, itemPath);
    requireString(segment, "raw", diagnostics, itemPath);
    validateOptionalString(segment, "key", diagnostics, itemPath);
    validateOptionalString(segment, "path", diagnostics, itemPath);

    if (!isRecord(typedSegment.localized)) {
      diagnostics.push(createDiagnostic("HIA_I18N_LOCALIZED_TEXT_INVALID", "segment.localized must be an object.", "error", `${itemPath}.localized`));
    } else {
      validateLocalizedText(typedSegment.localized, diagnostics, `${itemPath}.localized`);
    }

    validateTextRange(typedSegment.rangeInField, diagnostics, `${itemPath}.rangeInField`);
  }
}

function validateTextResolutions(resolutions: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (resolutions === undefined) {
    return;
  }

  if (!isRecord(resolutions)) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOLUTIONS_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  for (const [locale, resolution] of Object.entries(resolutions)) {
    const itemPath = `${targetPath}.${locale}`;

    if (!isRecord(resolution)) {
      diagnostics.push(createDiagnostic("HIA_I18N_RESOLUTION_INVALID", "i18n resolution must be an object.", "error", itemPath));
      continue;
    }

    requireString(resolution, "requestedLocale", diagnostics, itemPath);
    requireString(resolution, "resolvedLocale", diagnostics, itemPath);
    requireArray(resolution, "fallbackChain", diagnostics, itemPath);

    if (Array.isArray(resolution.fallbackChain)) {
      validateStringArray(resolution.fallbackChain, diagnostics, `${itemPath}.fallbackChain`);
    }

    if (typeof resolution.usedFallback !== "boolean") {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${itemPath}.usedFallback must be a boolean.`, "error", `${itemPath}.usedFallback`));
    }

    if (typeof resolution.missing !== "boolean") {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${itemPath}.missing must be a boolean.`, "error", `${itemPath}.missing`));
    }

    validateOptionalString(resolution, "sourceKind", diagnostics, itemPath);
    validateOptionalString(resolution, "sourceLocale", diagnostics, itemPath);
    validateOptionalString(resolution, "source", diagnostics, itemPath);
  }
}

function validateLocalizedText(value: Record<string, unknown>, diagnostics: HiaDiagnostic[], targetPath: string): void {
  for (const [locale, text] of Object.entries(value)) {
    if (!locale || typeof text !== "string") {
      diagnostics.push(createDiagnostic(
        "HIA_I18N_LOCALIZED_TEXT_INVALID",
        "localizedText entries must map non-empty locale keys to string values.",
        "error",
        `${targetPath}.${locale || "<empty>"}`
      ));
    }
  }
}

function validateFallbackLocale(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (typeof value === "string") {
    if (value.length === 0) {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
    }
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be a string or string array.`, "error", targetPath));
    return;
  }

  validateStringArray(value, diagnostics, targetPath, true);
}

function validateDiagnostics(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createDiagnostic("HIA_DIAGNOSTICS_INVALID", `${targetPath} must be an array.`, "error", targetPath));
    return;
  }

  for (const [index, diagnostic] of value.entries()) {
    const itemPath = `${targetPath}.${index}`;

    if (!isRecord(diagnostic)) {
      diagnostics.push(createDiagnostic("HIA_DIAGNOSTIC_INVALID", "diagnostic must be an object.", "error", itemPath));
      continue;
    }

    requireString(diagnostic, "code", diagnostics, itemPath);
    requireString(diagnostic, "message", diagnostics, itemPath);
    requireString(diagnostic, "severity", diagnostics, itemPath);
    validateOptionalString(diagnostic, "path", diagnostics, itemPath);
    validateOptionalString(diagnostic, "targetPath", diagnostics, itemPath);

    if (diagnostic.data !== undefined && !isRecord(diagnostic.data)) {
      diagnostics.push(createDiagnostic("HIA_DIAGNOSTIC_DATA_INVALID", `${itemPath}.data must be an object when present.`, "error", `${itemPath}.data`));
    }

    if (typeof diagnostic.severity === "string" && !["info", "warning", "error"].includes(diagnostic.severity)) {
      diagnostics.push(createDiagnostic("HIA_DIAGNOSTIC_SEVERITY_INVALID", `${itemPath}.severity is not supported.`, "error", `${itemPath}.severity`));
    }
  }
}

function validateStringArray(value: unknown[], diagnostics: HiaDiagnostic[], targetPath: string, requireNonEmpty = false): void {
  if (requireNonEmpty && value.length === 0) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must not be empty.`, "error", targetPath));
  }

  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.length === 0) {
      diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.${index} must be a non-empty string.`, "error", `${targetPath}.${index}`));
    }
  }
}

function validateOptionalStringArray(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array of strings.`, "error", targetPath));
    return;
  }

  validateStringArray(value, diagnostics, targetPath);
}

function validateSourceLink(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_LINK_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  if (typeof value.enabled !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.enabled must be a boolean.`, "error", `${targetPath}.enabled`));
  }

  validateOptionalString(value, "fileUrl", diagnostics, targetPath);
  validateOptionalString(value, "lineUrl", diagnostics, targetPath);
  validateOptionalString(value, "openMode", diagnostics, targetPath);
}

function validateSourcePreview(value: unknown, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_PREVIEW_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  if (typeof value.enabled !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.enabled must be a boolean.`, "error", `${targetPath}.enabled`));
  }

  if (value.defaultExpanded !== undefined && typeof value.defaultExpanded !== "boolean") {
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath}.defaultExpanded must be a boolean.`, "error", `${targetPath}.defaultExpanded`));
  }

  validateOptionalString(value, "content", diagnostics, targetPath);
  validateOptionalString(value, "language", diagnostics, targetPath);
  validateRange(value.range as { start: HiaSourcePosition; end: HiaSourcePosition } | undefined, diagnostics, `${targetPath}.range`);
}

function validateRelativePath(value: string, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!value) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_PATH_MISSING", "Source relativePath is required.", "error", targetPath));
    return;
  }

  const normalized = value.replaceAll("\\", "/");

  if (/^[A-Za-z]:[\\/]/.test(value) || normalized.startsWith("/") || normalized.startsWith("//")) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_ABSOLUTE_PATH", "Source paths must be relative.", "error", targetPath));
    return;
  }

  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../") || normalized.endsWith("/..")) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_PATH_TRAVERSAL", "Source paths must stay inside the project source boundary.", "error", targetPath));
  }
}

function validateI18nResourcePath(value: string, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!value) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_PATH_MISSING", "i18n resource path is required.", "error", targetPath));
    return;
  }

  const normalized = value.replaceAll("\\", "/");

  if (/^[A-Za-z]:[\\/]/.test(value) || normalized.startsWith("/") || normalized.startsWith("//")) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_ABSOLUTE_PATH", "i18n resource paths must be relative.", "error", targetPath));
    return;
  }

  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../") || normalized.endsWith("/..")) {
    diagnostics.push(createDiagnostic("HIA_I18N_RESOURCE_PATH_TRAVERSAL", "i18n resource paths must stay inside the project resource boundary.", "error", targetPath));
  }
}

function validateRange(range: { start: HiaSourcePosition; end: HiaSourcePosition } | undefined, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (range === undefined) {
    return;
  }

  if (!isRecord(range)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_RANGE_INVALID", `${targetPath} must be an object.`, "error", targetPath));
    return;
  }

  const startValid = validatePosition(range.start, diagnostics, `${targetPath}.start`);
  const endValid = validatePosition(range.end, diagnostics, `${targetPath}.end`);

  if (startValid && endValid) {
    const startColumn = range.start.column || 1;
    const endColumn = range.end.column || 1;
    const endsBeforeStart = range.end.line < range.start.line
      || (range.end.line === range.start.line && endColumn < startColumn);

    if (endsBeforeStart) {
      diagnostics.push(createDiagnostic("HIA_SOURCE_RANGE_ORDER_INVALID", "Source range end must not be before start.", "error", targetPath));
    }
  }
}

function validatePosition(position: HiaSourcePosition | undefined, diagnostics: HiaDiagnostic[], targetPath: string): boolean {
  if (!position || !Number.isInteger(position.line) || position.line < 1) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_POSITION_INVALID", "Source position line must be a positive integer.", "error", targetPath));
    return false;
  }

  if (position.column !== undefined && (!Number.isInteger(position.column) || position.column < 1)) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_POSITION_INVALID", "Source position column must be a positive integer when present.", "error", `${targetPath}.column`));
    return false;
  }

  return true;
}

function validateTextRange(range: { start: number; end: number } | null | undefined, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (range === undefined || range === null) {
    return;
  }

  if (!isRecord(range) || !Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 0 || range.end < range.start) {
    diagnostics.push(createDiagnostic("HIA_TEXT_RANGE_INVALID", `${targetPath} must contain a valid start/end pair.`, "error", targetPath));
  }
}

function validateStringEnum(
  value: unknown,
  allowedValues: readonly string[],
  code: string,
  diagnostics: HiaDiagnostic[],
  targetPath: string
): void {
  if (typeof value === "string" && !allowedValues.includes(value)) {
    diagnostics.push(createDiagnostic(code, `${targetPath} is not supported.`, "error", targetPath));
  }
}

function validateLiteral(
  value: unknown,
  expectedValue: string,
  code: string,
  diagnostics: HiaDiagnostic[],
  targetPath: string
): void {
  if (typeof value === "string" && value !== expectedValue) {
    diagnostics.push(createDiagnostic(code, `${targetPath} must be ${expectedValue}.`, "error", targetPath));
  }
}

function requireString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  if (typeof record[field] !== "string" || String(record[field]).length === 0) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createDiagnostic("HIA_FIELD_MISSING", `HIA document requires a non-empty ${targetPath}.`, "error", targetPath));
  }
}

function validateOptionalString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  const value = record[field];

  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be a non-empty string.`, "error", targetPath));
  }
}

function requireArray(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  if (!Array.isArray(record[field])) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createDiagnostic("HIA_FIELD_INVALID", `${targetPath} must be an array.`, "error", targetPath));
  }
}

function createDiagnostic(code: string, message: string, severity: HiaDiagnosticSeverity, targetPath?: string): HiaDiagnostic {
  const diagnostic: HiaDiagnostic = { code, message, severity };

  if (targetPath) {
    diagnostic.targetPath = targetPath;
    diagnostic.path = targetPath;
  }

  return diagnostic;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
