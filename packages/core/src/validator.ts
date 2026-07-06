import { HIA_CORE_CONTRACT_VERSION } from "./model.js";
import type {
  HiaDiagnostic,
  HiaDiagnosticSeverity,
  HiaDocument,
  HiaI18nField,
  HiaSourceMetadata,
  HiaSourcePosition,
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

  if (Array.isArray(document.nodes)) {
    validateNodes(document.nodes, diagnostics);
  }

  if (Array.isArray(document.symbols)) {
    validateSymbols(document.symbols, diagnostics);
  }

  return {
    valid: diagnostics.every((item) => item.severity !== "error"),
    diagnostics
  };
}

function validateNodes(nodes: unknown[], diagnostics: HiaDiagnostic[]): void {
  for (const [index, node] of nodes.entries()) {
    const targetPath = `nodes.${index}`;

    if (!isRecord(node)) {
      diagnostics.push(createDiagnostic("HIA_NODE_INVALID", "HIA node must be an object.", "error", targetPath));
      continue;
    }

    requireString(node, "id", diagnostics, targetPath);
    requireString(node, "kind", diagnostics, targetPath);
    requireString(node, "title", diagnostics, targetPath);
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

    if (typedSymbol.i18n) {
      validateI18nFields(typedSymbol.i18n.fields, diagnostics, `${targetPath}.i18n.fields`);
    }

    if (typedSymbol.source) {
      validateSourceMetadata(typedSymbol.source, diagnostics, `${targetPath}.source`);
    }
  }
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
    }
  }
}

function validateSourceMetadata(source: HiaSourceMetadata, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (source.definedIn) {
    validateRelativePath(source.definedIn.relativePath, diagnostics, `${targetPath}.definedIn.relativePath`);
    validatePosition(source.definedIn.position, diagnostics, `${targetPath}.definedIn.position`);
  }

  if (source.primaryBlock?.relativePath) {
    validateRelativePath(source.primaryBlock.relativePath, diagnostics, `${targetPath}.primaryBlock.relativePath`);
  }

  for (const [index, fragment] of (source.fragments || []).entries()) {
    validateRelativePath(fragment.relativePath, diagnostics, `${targetPath}.fragments.${index}.relativePath`);
    validatePosition(fragment.range.start, diagnostics, `${targetPath}.fragments.${index}.range.start`);
    validatePosition(fragment.range.end, diagnostics, `${targetPath}.fragments.${index}.range.end`);
  }

  for (const [index, reference] of (source.references || []).entries()) {
    if (reference.fragment) {
      validateRelativePath(reference.fragment.relativePath, diagnostics, `${targetPath}.references.${index}.fragment.relativePath`);
      validatePosition(reference.fragment.range.start, diagnostics, `${targetPath}.references.${index}.fragment.range.start`);
      validatePosition(reference.fragment.range.end, diagnostics, `${targetPath}.references.${index}.fragment.range.end`);
    }
  }
}

function validateRelativePath(value: string, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!value) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_PATH_MISSING", "Source relativePath is required.", "error", targetPath));
    return;
  }

  if (/^[A-Za-z]:[\\/]/.test(value) || value.startsWith("/") || value.startsWith("\\\\")) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_ABSOLUTE_PATH", "Source paths must be relative.", "error", targetPath));
  }
}

function validatePosition(position: HiaSourcePosition | undefined, diagnostics: HiaDiagnostic[], targetPath: string): void {
  if (!position || !Number.isInteger(position.line) || position.line < 1) {
    diagnostics.push(createDiagnostic("HIA_SOURCE_POSITION_INVALID", "Source position line must be a positive integer.", "error", targetPath));
  }
}

function requireString(record: Record<string, unknown>, field: string, diagnostics: HiaDiagnostic[], prefix = ""): void {
  if (typeof record[field] !== "string" || String(record[field]).length === 0) {
    const targetPath = prefix ? `${prefix}.${field}` : field;
    diagnostics.push(createDiagnostic("HIA_FIELD_MISSING", `HIA document requires a non-empty ${targetPath}.`, "error", targetPath));
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
