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

export const HIA_DOCUMENT_SCHEMA_ID = "https://hia-doc.local/schema/hia-document-0.2.0.json";
export const HIA_DOCUMENT_SCHEMA_VERSION = HIA_CORE_CONTRACT_VERSION;

export const HIA_DOCUMENT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: HIA_DOCUMENT_SCHEMA_ID,
  type: "object",
  required: ["schemaVersion", "id", "title", "defaultLocale", "locales", "nodes", "symbols"],
  additionalProperties: true,
  properties: {
    schemaVersion: { const: HIA_CORE_CONTRACT_VERSION },
    id: { $ref: "#/$defs/nonEmptyString" },
    title: { $ref: "#/$defs/nonEmptyString" },
    defaultLocale: { $ref: "#/$defs/nonEmptyString" },
    fallbackLocale: { $ref: "#/$defs/fallbackLocale" },
    locales: { $ref: "#/$defs/localeList" },
    nodes: {
      type: "array",
      items: { $ref: "#/$defs/node" }
    },
    symbols: {
      type: "array",
      items: { $ref: "#/$defs/symbol" }
    },
    diagnostics: {
      type: "array",
      items: { $ref: "#/$defs/diagnostic" }
    },
    metadata: { type: "object" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    fallbackLocale: {
      anyOf: [
        { $ref: "#/$defs/nonEmptyString" },
        {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/nonEmptyString" }
        }
      ]
    },
    localeList: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/nonEmptyString" }
    },
    diagnostic: {
      type: "object",
      required: ["code", "message", "severity"],
      additionalProperties: true,
      properties: {
        code: { $ref: "#/$defs/nonEmptyString" },
        message: { $ref: "#/$defs/nonEmptyString" },
        severity: { enum: ["info", "warning", "error"] },
        path: { $ref: "#/$defs/nonEmptyString" },
        targetPath: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    node: {
      type: "object",
      required: ["id", "kind", "title"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { $ref: "#/$defs/nonEmptyString" },
        title: { $ref: "#/$defs/nonEmptyString" },
        symbolIds: {
          type: "array",
          items: { $ref: "#/$defs/nonEmptyString" }
        },
        children: {
          type: "array",
          items: { $ref: "#/$defs/node" }
        }
      }
    },
    symbol: {
      type: "object",
      required: ["id", "name", "kind"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        name: { $ref: "#/$defs/nonEmptyString" },
        kind: { $ref: "#/$defs/nonEmptyString" },
        longname: { $ref: "#/$defs/nonEmptyString" },
        parentId: { $ref: "#/$defs/nonEmptyString" },
        path: {
          type: "array",
          items: { $ref: "#/$defs/nonEmptyString" }
        },
        signature: { $ref: "#/$defs/nonEmptyString" },
        summary: { type: "string" },
        i18n: { $ref: "#/$defs/i18nModel" },
        source: { $ref: "#/$defs/sourceMetadata" },
        diagnostics: {
          type: "array",
          items: { $ref: "#/$defs/diagnostic" }
        },
        metadata: { type: "object" }
      }
    },
    i18nModel: {
      type: "object",
      required: ["enabled", "model", "modelVersion", "defaultLocale", "locales", "fields"],
      additionalProperties: true,
      properties: {
        enabled: { type: "boolean" },
        model: { const: HIA_TEXT_I18N_MODEL },
        modelVersion: { const: HIA_TEXT_I18N_MODEL_VERSION },
        defaultLocale: { $ref: "#/$defs/nonEmptyString" },
        fallbackLocale: { $ref: "#/$defs/fallbackLocale" },
        locales: { $ref: "#/$defs/localeList" },
        mode: { $ref: "#/$defs/nonEmptyString" },
        fields: {
          type: "object",
          additionalProperties: { $ref: "#/$defs/i18nField" }
        },
        resources: {
          type: "array",
          items: { $ref: "#/$defs/i18nResource" }
        },
        diagnostics: {
          type: "array",
          items: { $ref: "#/$defs/diagnostic" }
        }
      }
    },
    i18nResource: {
      type: "object",
      required: ["path"],
      additionalProperties: true,
      properties: {
        kind: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/nonEmptyString" },
        locale: { $ref: "#/$defs/nonEmptyString" },
        format: { $ref: "#/$defs/nonEmptyString" },
        fields: {
          type: "array",
          items: { $ref: "#/$defs/nonEmptyString" }
        }
      }
    },
    i18nField: {
      type: "object",
      required: ["fieldPath", "kind", "defaultLocale", "localizedText"],
      additionalProperties: true,
      properties: {
        fieldPath: { $ref: "#/$defs/nonEmptyString" },
        kind: { $ref: "#/$defs/nonEmptyString" },
        defaultLocale: { $ref: "#/$defs/nonEmptyString" },
        key: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/nonEmptyString" },
        defaultText: { type: "string" },
        source: { $ref: "#/$defs/nonEmptyString" },
        localizedText: { $ref: "#/$defs/localizedText" },
        blocks: {
          type: "array",
          items: { $ref: "#/$defs/langBlock" }
        },
        segments: {
          type: "array",
          items: { $ref: "#/$defs/langInlineSegment" }
        },
        resolutions: {
          type: "object",
          additionalProperties: { $ref: "#/$defs/textResolution" }
        },
        missingLocales: {
          type: "array",
          items: { $ref: "#/$defs/nonEmptyString" }
        }
      }
    },
    localizedText: {
      type: "object",
      additionalProperties: { type: "string" }
    },
    langBlock: {
      type: "object",
      required: ["kind", "locale", "fieldPath", "text"],
      additionalProperties: true,
      properties: {
        kind: { const: "lang-block" },
        locale: { $ref: "#/$defs/nonEmptyString" },
        fieldPath: { $ref: "#/$defs/nonEmptyString" },
        text: { type: "string" },
        source: { $ref: "#/$defs/nonEmptyString" },
        rangeInComment: {
          anyOf: [
            { type: "null" },
            { $ref: "#/$defs/textRange" }
          ]
        }
      }
    },
    langInlineSegment: {
      type: "object",
      required: ["kind", "id", "fieldPath", "raw", "localized"],
      additionalProperties: true,
      properties: {
        kind: { const: "lang-inline" },
        id: { $ref: "#/$defs/nonEmptyString" },
        fieldPath: { $ref: "#/$defs/nonEmptyString" },
        raw: { type: "string" },
        localized: { $ref: "#/$defs/localizedText" },
        key: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/nonEmptyString" },
        rangeInField: { $ref: "#/$defs/textRange" }
      }
    },
    textRange: {
      type: "object",
      required: ["start", "end"],
      additionalProperties: false,
      properties: {
        start: { type: "integer", minimum: 0 },
        end: { type: "integer", minimum: 0 }
      }
    },
    textResolution: {
      type: "object",
      required: ["requestedLocale", "resolvedLocale", "fallbackChain", "usedFallback", "missing"],
      additionalProperties: true,
      properties: {
        requestedLocale: { $ref: "#/$defs/nonEmptyString" },
        resolvedLocale: { type: "string" },
        fallbackChain: {
          type: "array",
          items: { $ref: "#/$defs/nonEmptyString" }
        },
        usedFallback: { type: "boolean" },
        missing: { type: "boolean" },
        sourceKind: { $ref: "#/$defs/nonEmptyString" },
        sourceLocale: { type: "string" },
        source: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    sourcePosition: {
      type: "object",
      required: ["line"],
      additionalProperties: true,
      properties: {
        line: { type: "integer", minimum: 1 },
        column: { type: "integer", minimum: 1 }
      }
    },
    sourceRange: {
      type: "object",
      required: ["start", "end"],
      additionalProperties: false,
      properties: {
        start: { $ref: "#/$defs/sourcePosition" },
        end: { $ref: "#/$defs/sourcePosition" }
      }
    },
    sourceLink: {
      type: "object",
      required: ["enabled"],
      additionalProperties: true,
      properties: {
        enabled: { type: "boolean" },
        fileUrl: { $ref: "#/$defs/nonEmptyString" },
        lineUrl: { $ref: "#/$defs/nonEmptyString" },
        openMode: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    sourcePreview: {
      type: "object",
      required: ["enabled"],
      additionalProperties: true,
      properties: {
        enabled: { type: "boolean" },
        defaultExpanded: { type: "boolean" },
        content: { type: "string" },
        language: { $ref: "#/$defs/nonEmptyString" },
        range: { $ref: "#/$defs/sourceRange" }
      }
    },
    sourceDefinedIn: {
      type: "object",
      required: ["kind", "relativePath", "position"],
      additionalProperties: true,
      properties: {
        kind: { const: "defined-in" },
        relativePath: { $ref: "#/$defs/nonEmptyString" },
        language: { $ref: "#/$defs/nonEmptyString" },
        position: { $ref: "#/$defs/sourcePosition" },
        range: { $ref: "#/$defs/sourceRange" },
        link: { $ref: "#/$defs/sourceLink" }
      }
    },
    sourcePrimaryBlock: {
      type: "object",
      required: ["kind", "content", "rangeSource", "confidence"],
      additionalProperties: true,
      properties: {
        kind: { const: "primary-block" },
        id: { $ref: "#/$defs/nonEmptyString" },
        relativePath: { $ref: "#/$defs/nonEmptyString" },
        language: { $ref: "#/$defs/nonEmptyString" },
        range: { $ref: "#/$defs/sourceRange" },
        content: { type: "string" },
        rangeSource: { enum: [...HIA_SOURCE_RANGE_SOURCES] },
        confidence: { enum: [...HIA_SOURCE_CONFIDENCE_LEVELS] },
        link: { $ref: "#/$defs/sourceLink" },
        preview: { $ref: "#/$defs/sourcePreview" },
        diagnostics: {
          type: "array",
          items: { $ref: "#/$defs/diagnostic" }
        }
      }
    },
    sourceReference: {
      type: "object",
      required: ["kind", "referenceKind", "targetId", "resolved"],
      additionalProperties: true,
      properties: {
        kind: { const: "source-reference" },
        referenceKind: { $ref: "#/$defs/nonEmptyString" },
        targetId: { $ref: "#/$defs/nonEmptyString" },
        resolved: { type: "boolean" },
        sourceNodeId: { $ref: "#/$defs/nonEmptyString" },
        fieldPath: { $ref: "#/$defs/nonEmptyString" },
        fragment: { $ref: "#/$defs/sourceFragment" },
        diagnostics: {
          type: "array",
          items: { $ref: "#/$defs/diagnostic" }
        }
      }
    },
    sourceFragment: {
      type: "object",
      required: ["kind", "id", "relativePath", "range", "content", "rangeSource", "confidence"],
      additionalProperties: true,
      properties: {
        kind: { const: "source-fragment" },
        id: { $ref: "#/$defs/nonEmptyString" },
        relativePath: { $ref: "#/$defs/nonEmptyString" },
        language: { $ref: "#/$defs/nonEmptyString" },
        range: { $ref: "#/$defs/sourceRange" },
        content: { type: "string" },
        rangeSource: { enum: [...HIA_SOURCE_RANGE_SOURCES] },
        confidence: { enum: [...HIA_SOURCE_CONFIDENCE_LEVELS] },
        origin: { type: "object" },
        link: { $ref: "#/$defs/sourceLink" },
        preview: { $ref: "#/$defs/sourcePreview" },
        diagnostics: {
          type: "array",
          items: { $ref: "#/$defs/diagnostic" }
        }
      }
    },
    sourceMetadata: {
      type: "object",
      required: ["model", "modelVersion", "mode"],
      additionalProperties: true,
      properties: {
        model: { const: HIA_SOURCE_MODEL },
        modelVersion: { const: HIA_SOURCE_MODEL_VERSION },
        mode: { enum: [...HIA_SOURCE_MODES] },
        definedIn: { $ref: "#/$defs/sourceDefinedIn" },
        primaryBlock: {
          anyOf: [
            { type: "null" },
            { $ref: "#/$defs/sourcePrimaryBlock" }
          ]
        },
        references: {
          type: "array",
          items: { $ref: "#/$defs/sourceReference" }
        },
        fragments: {
          type: "array",
          items: { $ref: "#/$defs/sourceFragment" }
        },
        diagnostics: {
          type: "array",
          items: { $ref: "#/$defs/diagnostic" }
        }
      }
    }
  }
} as const;
