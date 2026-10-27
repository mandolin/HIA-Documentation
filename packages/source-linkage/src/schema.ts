/**
 * @file
 * @lang zh-CN 当前文档源码映射Draft 2020-12结构定义；导出为模块共享的类型只读对象，运行时未深冻结，分发资产另存。
 * @lang en Current documentation-map Draft 2020-12 structure, exported as a module-shared type-readonly object without runtime deep freezing; distribution assets are stored separately.
 */
import {
  DOC_SOURCE_MAP_CONTRACT,
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  DOC_SOURCE_MAP_END_BOUNDARIES,
  DOC_SOURCE_MAP_COLUMN_UNITS,
  DOC_SOURCE_MAP_RANGE_SOURCES,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
} from "./constants.js";
import {
  DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT,
  DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION
} from "@hia-doc/core";

/** @lang zh-CN 当前doc-source-map1.1.0的canonical资源身份/引用基准；不是下载动作或发布证明，历史schema保持独立原字节。 @lang en Canonical resource identity/reference base for current doc-source-map1.1.0, not a download action or publication proof; historical schema bytes remain independently retained. */
export const DOC_SOURCE_MAP_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/doc-source-map-1.1.0.schema.json";
/** @lang zh-CN 与当前文档映射contract根版本相同的schema字面量版本；独立于npm包SemVer，不说明schema引擎或系统版本。 @lang en Literal schema version matching the current documentation-map root contract, independent of npm package SemVer and not a schema-engine or system version. */
export const DOC_SOURCE_MAP_SCHEMA_VERSION = DOC_SOURCE_MAP_CONTRACT_VERSION;

/**
 * @lang zh-CN 当前Draft 2020-12 wire结构定义；as const只约束TypeScript，模块缓存对象及嵌套节点运行时可变，消费者不得直接改共享图，应先structuredClone。来源enum借用已冻结元组；分发读取接口另返回深拷贝。
 * @lang en Current Draft 2020-12 wire structure; as const constrains TypeScript only, while the cached module object and nested nodes remain mutable at runtime. Consumers must clone before editing. Its provenance enum borrows the frozen tuple; distribution readers return separate deep copies.
 * @remarks
 * <lang><zh-CN>跨身份引用、重复身份、范围顺序与隐私还需owner检查；导出/克隆schema不执行验证、读取源码/网络或授予发布权限。</zh-CN><en>Cross-identity references, duplicates, range order and privacy still require owner checks; exporting/cloning a schema neither validates data nor reads source/network resources or grants publication permission.</en></lang>
 */
export const DOC_SOURCE_MAP_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOC_SOURCE_MAP_SCHEMA_ID,
  type: "object",
  required: [
    "contract",
    "contractVersion",
    "id",
    "producer",
    "artifacts",
    "sources",
    "sourceMaps",
    "chains",
    "entries",
    "privacy",
    "diagnostics"
  ],
  additionalProperties: true,
  properties: {
    contract: { const: DOC_SOURCE_MAP_CONTRACT },
    contractVersion: { const: DOC_SOURCE_MAP_CONTRACT_VERSION },
    id: { $ref: "#/$defs/nonEmptyString" },
    producer: { $ref: "#/$defs/producer" },
    artifacts: { type: "array", items: { $ref: "#/$defs/artifact" } },
    sources: { type: "array", items: { $ref: "#/$defs/source" } },
    sourceMaps: { type: "array", items: { $ref: "#/$defs/sourceMap" } },
    generatedBindingSidecars: { type: "array", items: { $ref: "#/$defs/generatedBindingSidecar" } },
    localeResolutionSidecars: { type: "array", items: { $ref: "#/$defs/localeResolutionSidecar" } },
    localeDiscoverySidecars: { type: "array", items: { $ref: "#/$defs/localeDiscoverySidecar" } },
    chains: { type: "array", items: { $ref: "#/$defs/chain" } },
    entries: { type: "array", items: { $ref: "#/$defs/entry" } },
    privacy: { $ref: "#/$defs/privacy" },
    diagnostics: { type: "array", items: {} }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    safeRelativePath: {
      type: "string",
      minLength: 1,
      not: {
        anyOf: [
          { const: "." },
          { const: ".." },
          { pattern: "^(?:[A-Za-z]:|/|\\\\\\\\|[A-Za-z][A-Za-z0-9+.-]*:)" },
          { pattern: "(?:^|[\\\\/])\\.\\.(?:[\\\\/]|$)" }
        ]
      }
    },
    stringList: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } },
    producer: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { $ref: "#/$defs/nonEmptyString" },
        runtime: { $ref: "#/$defs/nonEmptyString" },
        profile: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    contractRef: {
      type: "object",
      required: ["contract", "path"],
      additionalProperties: true,
      properties: {
        contract: { $ref: "#/$defs/nonEmptyString" },
        contractVersion: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" }
      }
    },
    artifact: {
      type: "object",
      required: ["id", "kind"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" },
        language: { $ref: "#/$defs/nonEmptyString" },
        format: { $ref: "#/$defs/nonEmptyString" },
        role: { $ref: "#/$defs/nonEmptyString" },
        contractRefs: { type: "array", items: { $ref: "#/$defs/contractRef" } }
      }
    },
    source: {
      type: "object",
      required: ["id", "kind"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" },
        language: { $ref: "#/$defs/nonEmptyString" },
        role: { enum: ["original", "generated", "intermediate", "virtual", "external"] },
        sourcesContentPolicy: { $ref: "#/$defs/sourcesContentPolicy" },
        sourcesContent: { type: "string" }
      }
    },
    sourceMap: {
      type: "object",
      required: ["id", "kind", "path"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { const: "ordinary-source-map" },
        format: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/safeRelativePath" },
        mapsFrom: { $ref: "#/$defs/nonEmptyString" },
        mapsTo: { $ref: "#/$defs/stringList" },
        sourcesContentPolicy: { $ref: "#/$defs/sourcesContentPolicy" },
        pointer: { type: "object" }
      }
    },
    chain: {
      type: "object",
      required: ["id", "stages"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        stages: { type: "array", items: { $ref: "#/$defs/stage" } }
      }
    },
    stage: {
      type: "object",
      required: ["from", "to", "transform"],
      additionalProperties: true,
      properties: {
        from: { $ref: "#/$defs/nonEmptyString" },
        to: { $ref: "#/$defs/nonEmptyString" },
        transform: { $ref: "#/$defs/nonEmptyString" },
        sourceMap: { anyOf: [{ type: "null" }, { $ref: "#/$defs/nonEmptyString" }] },
        linkage: { $ref: "#/$defs/stringList" }
      }
    },
    position: {
      type: "object",
      required: ["line"],
      additionalProperties: false,
      properties: {
        line: { type: "integer", minimum: 1 },
        column: { type: "integer", minimum: 1 }
      }
    },
    range: {
      type: "object",
      required: ["start", "end"],
      additionalProperties: false,
      properties: {
        start: { $ref: "#/$defs/position" },
        end: { $ref: "#/$defs/position" }
      }
    },
    rangeConvention: {
      type: "object",
      required: ["endBoundary", "columnUnit"],
      additionalProperties: false,
      properties: {
        endBoundary: { enum: DOC_SOURCE_MAP_END_BOUNDARIES },
        columnUnit: { enum: DOC_SOURCE_MAP_COLUMN_UNITS }
      }
    },
    sourceRef: {
      type: "object",
      required: ["sourceId", "rangeSource", "confidence"],
      additionalProperties: true,
      properties: {
        sourceId: { $ref: "#/$defs/nonEmptyString" },
        range: { $ref: "#/$defs/range" },
        rangeConvention: { $ref: "#/$defs/rangeConvention" },
        rangeSource: { $ref: "#/$defs/rangeSource" },
        rangeSourceDetail: { $ref: "#/$defs/rangeSourceDetail" },
        confidence: { $ref: "#/$defs/confidence" }
      },
      allOf: [
        { if: { properties: { rangeSource: { const: "unresolved" } }, required: ["rangeSource"] }, then: { properties: { confidence: { const: "none" } } } },
        { if: { required: ["range"] }, then: { required: ["rangeConvention"] }, else: { not: { required: ["rangeConvention"] } } },
        { if: { properties: { rangeConvention: { properties: { columnUnit: { not: { const: "unknown" } } }, required: ["columnUnit"] } }, required: ["rangeConvention"] }, then: { properties: { range: { properties: { start: { required: ["column"] }, end: { required: ["column"] } } } } } }
      ]
    },
    artifactRef: {
      type: "object",
      required: ["artifactId", "rangeSource", "confidence"],
      additionalProperties: true,
      properties: {
        artifactId: { $ref: "#/$defs/nonEmptyString" },
        selector: { $ref: "#/$defs/nonEmptyString" },
        rangeSource: { $ref: "#/$defs/rangeSource" },
        rangeSourceDetail: { $ref: "#/$defs/rangeSourceDetail" },
        confidence: { $ref: "#/$defs/confidence" }
      },
      allOf: [{ if: { properties: { rangeSource: { const: "unresolved" } }, required: ["rangeSource"] }, then: { properties: { confidence: { const: "none" } } } }]
    },
    entry: {
      type: "object",
      required: ["id", "kind", "sourceRefs", "artifactRefs", "diagnostics"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { $ref: "#/$defs/nonEmptyString" },
        classification: { $ref: "#/$defs/nonEmptyString" },
        relationKind: { $ref: "#/$defs/nonEmptyString" },
        symbolId: { $ref: "#/$defs/nonEmptyString" },
        symbolKind: { $ref: "#/$defs/nonEmptyString" },
        annotation: { type: "object" },
        generatedBindingRefs: { type: "array", items: { $ref: "#/$defs/generatedBindingRef" } },
        sourceRefs: { type: "array", items: { $ref: "#/$defs/sourceRef" } },
        artifactRefs: { type: "array", items: { $ref: "#/$defs/artifactRef" } },
        diagnostics: { type: "array", items: {} }
      }
    },
    generatedBindingSidecar: {
      type: "object",
      required: ["id", "contract", "contractVersion", "path"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        contract: { const: GENERATED_DOCUMENTATION_BINDING_CONTRACT },
        contractVersion: { const: GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION },
        path: { $ref: "#/$defs/safeRelativePath" }
      }
    },
    localeResolutionSidecar: {
      type: "object",
      required: ["id", "contract", "contractVersion", "path"],
      additionalProperties: false,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        contract: { const: DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT },
        contractVersion: { const: DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION },
        path: { $ref: "#/$defs/safeRelativePath" }
      }
    },
    localeDiscoverySidecar: {
      type: "object",
      required: ["id", "contract", "contractVersion", "path"],
      additionalProperties: false,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        contract: { const: "documentation-locale-resource-declaration" },
        contractVersion: { const: "0.1.0-draft" },
        path: { $ref: "#/$defs/safeRelativePath" }
      }
    },
    generatedBindingRef: {
      type: "object",
      required: ["bindingId", "sidecarId"],
      additionalProperties: false,
      properties: {
        bindingId: { $ref: "#/$defs/nonEmptyString" },
        sidecarId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    rangeSource: {
      enum: DOC_SOURCE_MAP_RANGE_SOURCES
    },
    rangeSourceDetail: { type: "string", minLength: 1, pattern: "\\S" },
    confidence: { enum: ["high", "medium", "low", "none"] },
    sourcesContentPolicy: { enum: ["none", "reference", "embed", "redacted"] },
    privacy: {
      type: "object",
      required: ["sourcesContentPolicy"],
      additionalProperties: true,
      properties: {
        sourcesContentPolicy: { $ref: "#/$defs/sourcesContentPolicy" },
        allowAbsolutePaths: { type: "boolean" },
        allowUncPaths: { type: "boolean" },
        allowPathTraversal: { type: "boolean" },
        releaseGate: { type: "object" }
      }
    }
  }
} as const;
