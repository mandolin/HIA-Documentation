import {
  validateHiaDocumentDetailed
} from "@hia-doc/core";
import type {
  HiaDiagnostic,
  HiaDocument,
  HiaI18nField,
  HiaLangInlineSegment,
  HiaSourceReference,
  HiaSymbol
} from "@hia-doc/core";
import {
  DiagnosticSeverity
} from "vscode-languageserver/node.js";
import type {
  Diagnostic,
  Position,
  Range
} from "vscode-languageserver/node.js";

export const HIA_LSP_SOURCE = "hia";

export const HiaLspDiagnosticCode = {
  CoreValidation: "HIA_LSP_CORE_VALIDATION",
  I18nLocaleMissing: "HIA_LSP_I18N_LOCALE_MISSING",
  I18nKeyDuplicate: "HIA_LSP_I18N_KEY_DUPLICATE",
  SourceReferenceInvalid: "HIA_LSP_SOURCE_REFERENCE_INVALID",
  JsonParseError: "HIA_LSP_JSON_PARSE_ERROR"
} as const;

export type HiaLspDiagnosticCode = typeof HiaLspDiagnosticCode[keyof typeof HiaLspDiagnosticCode] | string;

export interface HiaLspDiagnosticOptions {
  uri?: string;
}

export function analyzeHiaDocument(document: unknown, options: HiaLspDiagnosticOptions = {}): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const validation = validateHiaDocumentDetailed(document);

  for (const diagnostic of validation.diagnostics) {
    diagnostics.push(mapCoreDiagnostic(diagnostic, options.uri));
  }

  if (!isHiaDocumentLike(document)) {
    return diagnostics;
  }

  collectI18nDiagnostics(document, diagnostics);
  collectSourceReferenceDiagnostics(document, diagnostics);

  return diagnostics;
}

export function analyzeHiaDocumentText(text: string, options: HiaLspDiagnosticOptions = {}): Diagnostic[] {
  try {
    return analyzeHiaDocument(JSON.parse(text) as unknown, options);
  } catch (error) {
    return [
      {
        code: HiaLspDiagnosticCode.JsonParseError,
        message: error instanceof Error ? error.message : "Cannot parse HIA document JSON.",
        range: createZeroRange(),
        severity: DiagnosticSeverity.Error,
        source: HIA_LSP_SOURCE
      }
    ];
  }
}

function collectI18nDiagnostics(document: HiaDocument, diagnostics: Diagnostic[]): void {
  const seenKeys = new Map<string, { symbol: HiaSymbol; fieldPath: string; segment: HiaLangInlineSegment }>();

  for (const symbol of document.symbols) {
    if (!symbol.i18n?.fields) {
      continue;
    }

    for (const [fieldPath, field] of Object.entries(symbol.i18n.fields)) {
      for (const locale of field.missingLocales || []) {
        diagnostics.push({
          code: HiaLspDiagnosticCode.I18nLocaleMissing,
          message: `Missing ${locale} localized text for ${symbol.name}.${fieldPath}.`,
          range: createRangeForField(field),
          severity: DiagnosticSeverity.Warning,
          source: HIA_LSP_SOURCE
        });
      }

      for (const segment of field.segments || []) {
        if (!segment.key) {
          continue;
        }

        const previous = seenKeys.get(segment.key);

        if (previous) {
          diagnostics.push({
            code: HiaLspDiagnosticCode.I18nKeyDuplicate,
            message: `Duplicate i18n key "${segment.key}" in ${symbol.name}.${fieldPath}; first seen in ${previous.symbol.name}.${previous.fieldPath}.`,
            range: createRangeForSegment(segment),
            severity: DiagnosticSeverity.Warning,
            source: HIA_LSP_SOURCE
          });
          continue;
        }

        seenKeys.set(segment.key, {
          symbol,
          fieldPath,
          segment
        });
      }
    }
  }
}

function collectSourceReferenceDiagnostics(document: HiaDocument, diagnostics: Diagnostic[]): void {
  for (const symbol of document.symbols) {
    for (const [index, reference] of (symbol.source?.references || []).entries()) {
      if (!isSourceReferenceInvalid(reference)) {
        continue;
      }

      diagnostics.push({
        code: HiaLspDiagnosticCode.SourceReferenceInvalid,
        message: `Invalid source reference "${reference.targetId}" on ${symbol.name}.`,
        range: createRangeForSourceReference(reference),
        severity: reference.resolved ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
        source: HIA_LSP_SOURCE,
        data: {
          symbolId: symbol.id,
          referenceIndex: index
        }
      });
    }
  }
}

function isSourceReferenceInvalid(reference: HiaSourceReference): boolean {
  return !reference.resolved || !reference.fragment;
}

function mapCoreDiagnostic(diagnostic: HiaDiagnostic, uri?: string): Diagnostic {
  const lspDiagnostic: Diagnostic = {
    code: diagnostic.code || HiaLspDiagnosticCode.CoreValidation,
    message: diagnostic.message,
    range: createZeroRange(),
    severity: mapSeverity(diagnostic.severity),
    source: HIA_LSP_SOURCE
  };

  if (uri || diagnostic.targetPath || diagnostic.path) {
    lspDiagnostic.data = {
      uri,
      targetPath: diagnostic.targetPath,
      path: diagnostic.path
    };
  }

  return lspDiagnostic;
}

function createRangeForField(field: HiaI18nField): Range {
  const blockRange = field.blocks?.[0]?.rangeInComment;

  if (blockRange) {
    return createCharacterRange(blockRange.start, blockRange.end);
  }

  const segmentRange = field.segments?.[0]?.rangeInField;

  if (segmentRange) {
    return createCharacterRange(segmentRange.start, segmentRange.end);
  }

  return createZeroRange();
}

function createRangeForSegment(segment: HiaLangInlineSegment): Range {
  if (segment.rangeInField) {
    return createCharacterRange(segment.rangeInField.start, segment.rangeInField.end);
  }

  return createZeroRange();
}

function createRangeForSourceReference(reference: HiaSourceReference): Range {
  const range = reference.fragment?.range;

  if (!range) {
    return createZeroRange();
  }

  return {
    start: toLspPosition(range.start.line, range.start.column),
    end: toLspPosition(range.end.line, range.end.column)
  };
}

function createCharacterRange(start: number, end: number): Range {
  return {
    start: {
      line: 0,
      character: Math.max(0, start)
    },
    end: {
      line: 0,
      character: Math.max(0, end)
    }
  };
}

function createZeroRange(): Range {
  return {
    start: {
      line: 0,
      character: 0
    },
    end: {
      line: 0,
      character: 0
    }
  };
}

function toLspPosition(line: number, column: number | undefined): Position {
  return {
    line: Math.max(0, line - 1),
    character: Math.max(0, (column || 1) - 1)
  };
}

function mapSeverity(severity: HiaDiagnostic["severity"]): DiagnosticSeverity {
  if (severity === "error") {
    return DiagnosticSeverity.Error;
  }

  if (severity === "info") {
    return DiagnosticSeverity.Information;
  }

  return DiagnosticSeverity.Warning;
}

function isHiaDocumentLike(value: unknown): value is HiaDocument {
  return typeof value === "object"
    && value !== null
    && Array.isArray((value as HiaDocument).symbols)
    && Array.isArray((value as HiaDocument).nodes);
}
