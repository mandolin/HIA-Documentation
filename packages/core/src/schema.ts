/**
 * @file
 * @lang zh-CN 核心文档当前canonical schema；历史schema由固定字节归档保留，运行时补充语义边界。
 * @lang en Current canonical core-document schema; fixed-byte archives retain historical schemas, with runtime guards adding semantic boundaries.
 */
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

/** @lang zh-CN 当前1.0.0候选schema的固定身份，不能替换历史0.2.0地址。
 * @lang en Fixed identity of the current 1.0.0 candidate schema, without replacing the historical 0.2.0 address.
 */
export const HIA_DOCUMENT_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-document-1.0.0.schema.json";
/** @lang zh-CN 当前根schema版本，与核心document writer对齐；不是包版本。
 * @lang en Current root-schema version aligned with the core-document writer, not a package version.
 */
export const HIA_DOCUMENT_SCHEMA_VERSION = HIA_CORE_CONTRACT_VERSION;

/**
 * @lang zh-CN 可序列化JSON Schema 2020-12；根只验证当前版本，子模型明确兼容旧0.2.0，扩展字段开放。
 * @lang en Serializable JSON Schema 2020-12; the root validates only the current version, explicitly accepting legacy 0.2.0 submodels while allowing extensions.
 * @remarks <lang><zh-CN>这是共享只读约定对象，未运行时冻结；路径逃逸、范围顺序和已解析源码引用快照仍需validateHiaDocumentDetailed。</zh-CN><en>This is a shared object with a read-only usage convention, not runtime-frozen; traversal paths, range order and resolved source-reference snapshots still need validateHiaDocumentDetailed.</en></lang>
 */
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
        data: { type: "object" },
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
    // <lang><zh-CN>根与子模型独立版本；新根可以消费适配器仍持有的旧语言模型，不原地改号。</zh-CN><en>The root and submodel version independently; a new root can consume legacy adapter locale models without rewriting their versions.</en></lang>
    i18nModel: {
      type: "object",
      required: ["enabled", "model", "modelVersion", "defaultLocale", "locales", "fields"],
      additionalProperties: true,
      properties: {
        enabled: { type: "boolean" },
        model: { const: HIA_TEXT_I18N_MODEL },
        modelVersion: { enum: [HIA_TEXT_I18N_MODEL_VERSION, "0.2.0"] },
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
    // <lang><zh-CN>字符串偏移必须可在JS中精确表示；范围顺序由runtime guard补充。</zh-CN><en>String offsets must be exactly representable in JavaScript; the runtime guard additionally checks range order.</en></lang>
    textRange: {
      type: "object",
      required: ["start", "end"],
      additionalProperties: false,
      properties: {
        start: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
        end: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER }
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
    // <lang><zh-CN>沿用1-based行列并限制为安全整数，不改变原有列计量单位。</zh-CN><en>Retain one-based lines/columns and constrain them to safe integers without changing the established column unit.</en></lang>
    sourcePosition: {
      type: "object",
      required: ["line"],
      additionalProperties: true,
      properties: {
        line: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        column: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER }
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
    // <lang><zh-CN>新根允许精确旧版源码子模型，来源正文与privacy仍由owner治理。</zh-CN><en>The new root accepts the exact legacy source submodel; owners still govern source text and privacy.</en></lang>
    sourceMetadata: {
      type: "object",
      required: ["model", "modelVersion", "mode"],
      additionalProperties: true,
      properties: {
        model: { const: HIA_SOURCE_MODEL },
        modelVersion: { enum: [HIA_SOURCE_MODEL_VERSION, "0.2.0"] },
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
