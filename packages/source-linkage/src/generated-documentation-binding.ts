/**
 * @file
 * @lang zh-CN 新旧生成式绑定schema与纯数据/跨集合/隐私validator，保留历史分发定义；schema导出共享且未深冻结，不读取路径或执行表达式。
 * @lang en Current/legacy generated-binding schemas and pure data/cross-collection/privacy validator, retaining historical distribution definitions; schema exports are shared and not deeply frozen, without path reads or expression execution.
 */
import path from "node:path";
import { isDocSourceMapJsonDataGraph } from "./manifest-json-data.js";
import { collectBindingInputIssues } from "./binding-input.js";
import { prepareSourceLinkagePathOptions } from "./path-options.js";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity
} from "@hia-doc/core";
import {
  DOC_SOURCE_MAP_CONTRACT,
  DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION,
  DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION,
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  DOC_SOURCE_MAP_RANGE_SOURCES,
  DOC_SOURCE_MAP_END_BOUNDARIES,
  DOC_SOURCE_MAP_COLUMN_UNITS,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION
} from "./constants.js";

/**
 * @lang zh-CN 当前绑定0.3.0-draft schema的canonical资源身份/引用基准，不是下载动作、包版本或稳定发行证明。
 * @lang en Canonical resource identity/reference base of the current binding0.3.0-draft schema, not a download action, package version or stable-release proof.
 */
export const GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.3.0-draft.schema.json";
/** @lang zh-CN 已公开前一代绑定0.2.0-draft的固定canonical身份，只配map1.0.0；分发原字节另存历史。 @lang en Fixed canonical identity of the published prior binding0.2.0-draft, paired only with map1.0.0; distributed original bytes remain archived separately. */
export const GENERATED_DOCUMENTATION_BINDING_0_2_0_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.2.0-draft.schema.json";
/** @lang zh-CN 精确旧绑定0.1.0-draft的独立canonical身份，历史原始字节另存分发，不重定向到新版。 @lang en Separate canonical identity for exact legacy binding0.1.0-draft, with original bytes retained in distribution and no redirection to the current definition. */
export const GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.1.0-draft.schema.json";

/**
 * @lang zh-CN 与 npm 包 SemVer 独立的 schema 版本；当前与绑定 contractVersion 对齐。
 * @lang en Schema version independent of npm package SemVer; it currently matches the binding contractVersion.
 */
export const GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION = GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;

/**
 * @lang zh-CN 为精确绑定版本/映射版本/身份创建独立Draft 2020-12结构图，不缓存调用结果；新旧图不共享可变子结构。
 * @lang en Creates an independent Draft 2020-12 graph for exact binding/map versions and identity, without caching calls or sharing mutable substructure between generations.
 * @param version <lang><zh-CN>绑定根及最低consumer的精确版本。</zh-CN><en>Exact binding root/minimum-consumer version.</en></lang>
 * @param mapVersion <lang><zh-CN>反向链接文档映射根的精确配对版本。</zh-CN><en>Exact paired documentation-map root version for backlinks.</en></lang>
 * @param identity <lang><zh-CN>独立canonical资源身份，不触发I/O。</zh-CN><en>Separate canonical resource identity, without I/O.</en></lang>
 * @returns <lang><zh-CN>as const推断的类型只读新对象，运行时未深冻结；只有中性声明/展开/目标/诊断及被动引用，无模板正文或运行时局部值。</zh-CN><en>Fresh type-readonly object inferred with as const, without runtime deep freezing; contains neutral declarations/expansions/targets/diagnostics and passive references, not template bodies or runtime local values.</en></lang>
 */
function createBindingSchema<const Version extends string, const MapVersion extends string, const Identity extends string>(version: Version, mapVersion: MapVersion, identity: Identity) {
// <lang><zh-CN>每次调用重建完整literal图；仅从参数投影已确认身份/版本，不从当前常量猜测历史配对。</zh-CN><en>Rebuild the full literal graph on each call, projecting confirmed identities/versions from parameters rather than inferring legacy pairings from current constants.</en></lang>
// <lang><zh-CN>只在新0.3图加范围约定，旧0.2/0.1生成图和历史分发定义均不改变。</zh-CN><en>Add range conventions only to the new 0.3 graph, leaving prior 0.2/0.1 graphs and historical distribution definitions unchanged.</en></lang>
const preciseSourceRanges = version === GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;
return {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: identity,
  type: "object",
  required: [
    "contract",
    "contractVersion",
    "id",
    "producer",
    "docSourceMapLinkage",
    "privacy",
    "deterministicLocalsPolicy",
    "compatibility",
    "bindings",
    "expansions",
    "targets",
    "diagnostics"
  ],
  additionalProperties: true,
  properties: {
    contract: { const: GENERATED_DOCUMENTATION_BINDING_CONTRACT },
    contractVersion: { const: version },
    id: { $ref: "#/$defs/nonEmptyString" },
    producer: { $ref: "#/$defs/producer" },
    docSourceMapLinkage: { $ref: "#/$defs/docSourceMapLinkage" },
    privacy: { $ref: "#/$defs/privacy" },
    deterministicLocalsPolicy: { $ref: "#/$defs/deterministicLocalsPolicy" },
    compatibility: { $ref: "#/$defs/compatibility" },
    bindings: { type: "array", items: { $ref: "#/$defs/binding" } },
    expansions: { type: "array", items: { $ref: "#/$defs/expansion" } },
    targets: { type: "array", items: { $ref: "#/$defs/target" } },
    diagnostics: { type: "array", items: { $ref: "#/$defs/diagnostic" } },
    adapterExtensions: { type: "object", additionalProperties: true }
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
    producer: {
      type: "object",
      required: ["name", "version", "adapterId"],
      additionalProperties: false,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { $ref: "#/$defs/nonEmptyString" },
        adapterId: { $ref: "#/$defs/nonEmptyString" }
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
    ...(preciseSourceRanges ? { rangeConvention: {
      type: "object",
      required: ["endBoundary", "columnUnit"],
      additionalProperties: false,
      properties: {
        endBoundary: { enum: DOC_SOURCE_MAP_END_BOUNDARIES },
        columnUnit: { enum: DOC_SOURCE_MAP_COLUMN_UNITS }
      }
    } } : {}),
    sourceRef: {
      type: "object",
      required: preciseSourceRanges ? ["sourceId", "range", "rangeSource", "rangeConvention"] : ["sourceId", "range", "rangeSource"],
      additionalProperties: false,
      properties: {
        sourceId: { $ref: "#/$defs/nonEmptyString" },
        range: { $ref: "#/$defs/range" },
        rangeSource: {
          enum: ["parser", "compiler", "adapter", "source-map", "manual", "heuristic", "unresolved"]
        },
        ...(preciseSourceRanges ? { rangeConvention: { $ref: "#/$defs/rangeConvention" } } : {})
      },
      ...(preciseSourceRanges ? { allOf: [{
        if: { properties: { rangeConvention: { properties: { columnUnit: { not: { const: "unknown" } } }, required: ["columnUnit"] } }, required: ["rangeConvention"] },
        then: { properties: { range: { properties: { start: { required: ["column"] }, end: { required: ["column"] } } } } }
      }] } : {})
    },
    scope: {
      type: "object",
      required: ["id", "adapterId", "sourceId", "semanticAncestry", "declarationSlot"],
      additionalProperties: false,
      properties: {
        id: {
          type: "string",
          pattern: "^gdb-scope/v1/[^/]+/[^#]+#[^/]+/[^/]+$"
        },
        adapterId: { $ref: "#/$defs/nonEmptyString" },
        sourceId: { $ref: "#/$defs/nonEmptyString" },
        semanticAncestry: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/nonEmptyString" }
        },
        declarationSlot: { $ref: "#/$defs/nonEmptyString" },
        aliasMetadata: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } },
        stableUpstreamId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    bindingReference: {
      type: "object",
      required: ["kind", "rootDeclarationId", "memberPath"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["identifier", "member-path", "adapter-defined"] },
        rootDeclarationId: { $ref: "#/$defs/nonEmptyString" },
        memberPath: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } },
        adapterReferenceId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    resolution: {
      type: "object",
      required: ["resolutionKind", "confidence", "provenanceCoverage"],
      additionalProperties: false,
      properties: {
        resolutionKind: { enum: ["exact", "inferred", "ambiguous", "unresolved"] },
        confidence: { enum: ["high", "medium", "low", "none"] },
        provenanceCoverage: { enum: ["source-only", "source-and-generated", "generated-only"] }
      },
      oneOf: [
        { properties: { resolutionKind: { const: "exact" }, confidence: { const: "high" } } },
        { properties: { resolutionKind: { const: "inferred" }, confidence: { const: "medium" } } },
        { properties: { resolutionKind: { const: "inferred" }, confidence: { const: "low" } } },
        { properties: { resolutionKind: { const: "ambiguous" }, confidence: { const: "low" } } },
        { properties: { resolutionKind: { const: "unresolved" }, confidence: { const: "none" } } }
      ]
    },
    sourceIntent: {
      type: "object",
      required: ["kind", "sourceRef"],
      additionalProperties: false,
      properties: {
        kind: { $ref: "#/$defs/nonEmptyString" },
        field: { $ref: "#/$defs/nonEmptyString" },
        sourceRef: { $ref: "#/$defs/sourceRef" },
        locale: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    overrideContext: {
      type: "object",
      required: ["kind"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["none", "base", "child", "include", "adapter-defined"] },
        contextId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    contribution: {
      type: "object",
      required: ["id", "mode", "order", "sourceRef", "overrideContext"],
      additionalProperties: false,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        mode: { enum: ["base", "replace", "append", "prepend", "include"] },
        order: { type: "integer", minimum: 0 },
        sourceRef: { $ref: "#/$defs/sourceRef" },
        overrideContext: { $ref: "#/$defs/overrideContext" }
      }
    },
    composition: {
      type: "object",
      required: ["relation", "mergePolicy", "contributions"],
      additionalProperties: false,
      properties: {
        relation: { enum: ["none", "inheritance", "composition"] },
        mergePolicy: {
          enum: [
            "not-applicable",
            "nearest-explicit-child-wins",
            "ordered-contribution",
            "compose-in-linked-order",
            "same-precedence-singleton-conflict"
          ]
        },
        contributions: { type: "array", items: { $ref: "#/$defs/contribution" } }
      }
    },
    binding: {
      type: "object",
      required: ["id", "adapterId", "sourceIntent", "bindingRef", "scope", "resolution", "composition"],
      additionalProperties: false,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        adapterId: { $ref: "#/$defs/nonEmptyString" },
        sourceIntent: { $ref: "#/$defs/sourceIntent" },
        bindingRef: { $ref: "#/$defs/bindingReference" },
        scope: { $ref: "#/$defs/scope" },
        resolution: { $ref: "#/$defs/resolution" },
        composition: { $ref: "#/$defs/composition" },
        adapterExtensions: { type: "object", additionalProperties: true }
      }
    },
    stableInstanceKey: {
      type: "object",
      required: ["status", "key", "origin", "privacySafe"],
      additionalProperties: false,
      properties: {
        status: { const: "stable" },
        key: {
          type: "string",
          pattern: "^gdb-key/v1/(?:string|number|boolean|stable-id):[A-Za-z0-9._~-]+$"
        },
        origin: { enum: ["explicit-instance-key", "each-object-key", "meta-schema-stable-id", "generated-target-stable-id"] },
        privacySafe: { const: true }
      }
    },
    unstableInstanceKey: {
      type: "object",
      required: ["status", "key", "origin", "privacySafe", "diagnosticCode"],
      additionalProperties: false,
      properties: {
        status: { const: "unstable" },
        key: { type: "string", pattern: "^gdb-key/v1/(?:number|ordinal):[A-Za-z0-9._~-]+$" },
        origin: { const: "array-index" },
        privacySafe: { const: true },
        diagnosticCode: { const: "GDB_INSTANCE_KEY_UNSTABLE" }
      }
    },
    missingInstanceKey: {
      type: "object",
      required: ["status", "origin", "diagnosticCode"],
      additionalProperties: false,
      properties: {
        status: { const: "missing" },
        origin: { const: "unavailable" },
        diagnosticCode: { const: "GDB_INSTANCE_KEY_MISSING" }
      }
    },
    instanceKey: {
      oneOf: [
        { $ref: "#/$defs/stableInstanceKey" },
        { $ref: "#/$defs/unstableInstanceKey" },
        { $ref: "#/$defs/missingInstanceKey" }
      ]
    },
    targetIdentity: {
      type: "object",
      required: ["kind"],
      additionalProperties: false,
      properties: {
        kind: { $ref: "#/$defs/nonEmptyString" },
        artifactId: { $ref: "#/$defs/nonEmptyString" },
        symbolId: { $ref: "#/$defs/nonEmptyString" },
        selector: { $ref: "#/$defs/nonEmptyString" },
        range: { $ref: "#/$defs/range" }
      },
      anyOf: [
        { required: ["artifactId"] },
        { required: ["symbolId"] }
      ]
    },
    target: {
      type: "object",
      required: ["id", "identity", "resolution"],
      additionalProperties: false,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        identity: { $ref: "#/$defs/targetIdentity" },
        resolution: { $ref: "#/$defs/resolution" },
        adapterExtensions: { type: "object", additionalProperties: true }
      }
    },
    expansion: {
      type: "object",
      required: ["id", "bindingId", "scopeId", "order", "instanceKey", "resolution", "targetIds"],
      additionalProperties: false,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        bindingId: { $ref: "#/$defs/nonEmptyString" },
        scopeId: { $ref: "#/$defs/nonEmptyString" },
        order: { type: "integer", minimum: 0 },
        instanceKey: { $ref: "#/$defs/instanceKey" },
        resolution: { $ref: "#/$defs/resolution" },
        targetIds: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } }
      }
    },
    diagnostic: {
      type: "object",
      required: ["id", "code", "severity"],
      additionalProperties: false,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        code: {
          enum: [
            "GDB_REF_SYNTAX_INVALID",
            "GDB_REF_UNRESOLVED",
            "GDB_SCOPE_AMBIGUOUS",
            "GDB_EXPANSION_RUNTIME_ONLY",
            "GDB_INSTANCE_KEY_MISSING",
            "GDB_INSTANCE_KEY_UNSTABLE",
            "GDB_INSTANCE_KEY_DUPLICATE",
            "GDB_TARGET_MISMATCH",
            "GDB_INHERITANCE_CONFLICT",
            "GDB_LOCALS_POLICY_VIOLATION"
          ]
        },
        severity: { enum: ["error", "warning", "info"] },
        subjectId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    privacy: {
      type: "object",
      required: [
        "sourcesContentPolicy",
        "allowAbsolutePaths",
        "allowUncPaths",
        "allowSourceBodySerialization",
        "allowRuntimeValueSerialization",
        "allowRuntimeExpressionExecution",
        "allowDigestSerialization",
        "allowSecretSerialization"
      ],
      additionalProperties: false,
      properties: {
        sourcesContentPolicy: { const: "none" },
        allowAbsolutePaths: { const: false },
        allowUncPaths: { const: false },
        allowSourceBodySerialization: { const: false },
        allowRuntimeValueSerialization: { const: false },
        allowRuntimeExpressionExecution: { const: false },
        allowDigestSerialization: { const: false },
        allowSecretSerialization: { const: false }
      }
    },
    deterministicLocalsPolicy: {
      type: "object",
      required: [
        "contract",
        "contractVersion",
        "mode",
        "adapterId",
        "bindingAllowlist",
        "privacyClassification",
        "limits",
        "prohibitedSources"
      ],
      additionalProperties: false,
      properties: {
        contract: { const: "generated-doc-locals" },
        contractVersion: { const: "0.1.0-draft-input" },
        mode: { enum: ["none", "deterministic-json-compatible"] },
        inputId: { $ref: "#/$defs/nonEmptyString" },
        adapterId: { $ref: "#/$defs/nonEmptyString" },
        bindingAllowlist: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } },
        privacyClassification: { enum: ["metadata-only", "sensitive-not-serialized"] },
        limits: {
          type: "object",
          required: ["maxDepth", "maxEntries", "maxStringBytes"],
          additionalProperties: false,
          properties: {
            maxDepth: { const: 12 },
            maxEntries: { const: 10000 },
            maxStringBytes: { const: 65536 }
          }
        },
        prohibitedSources: {
          type: "array",
          items: { enum: ["process-environment", "network", "provider", "host-editor", "implicit-runtime-capture"] }
        }
      },
      allOf: [
        {
          if: { properties: { mode: { const: "deterministic-json-compatible" } } },
          then: { required: ["inputId"] }
        }
      ]
    },
    docSourceMapLinkage: {
      type: "object",
      required: ["contract", "contractVersion", "sidecarId", "sidecarPath", "entryReferenceField"],
      additionalProperties: false,
      properties: {
        contract: { const: DOC_SOURCE_MAP_CONTRACT },
        contractVersion: { const: mapVersion },
        docSourceMapId: { $ref: "#/$defs/nonEmptyString" },
        sidecarId: { $ref: "#/$defs/nonEmptyString" },
        sidecarPath: { $ref: "#/$defs/safeRelativePath" },
        entryReferenceField: { const: "generatedBindingRefs" }
      }
    },
    compatibility: {
      type: "object",
      required: ["minimumConsumerContractVersion", "unknownFieldPolicy", "breakingChangePolicy"],
      additionalProperties: false,
      properties: {
        minimumConsumerContractVersion: { const: version },
        unknownFieldPolicy: { const: "ignore-unknown-optional-fields" },
        breakingChangePolicy: { const: "new-contract-version-and-schema-id" }
      }
    }
  }
} as const;
}

/** @lang zh-CN 当前绑定0.3.0-draft独立结构图，只配doc-source-map1.1.0；as const是类型约束，运行时模块共享图可变，修改前先克隆，不替代owner验证或发行验收。 @lang en Independent current binding0.3.0-draft graph paired only with doc-source-map1.1.0; as const is type-level, while the module-shared runtime graph remains mutable. Clone before editing; this replaces neither owner validation nor release acceptance. */
export const GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA = createBindingSchema(GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION, DOC_SOURCE_MAP_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID);
/** @lang zh-CN 前一代0.2.0-draft结构图固定配map1.0.0；历史分发以线上原字节为准，此对象仅用于精确读取语义。 @lang en Previous 0.2.0-draft graph is pinned to map1.0.0; archived distribution uses original published bytes, while this object describes exact reader semantics. */
export const GENERATED_DOCUMENTATION_BINDING_0_2_0_JSON_SCHEMA = createBindingSchema(GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION, DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_0_2_0_SCHEMA_ID);
/** @lang zh-CN 精确旧绑定0.1.0-draft独立图，只配旧map0.1.0-draft，保留历史结构；类型只读但运行时共享可变，修改前克隆，与新版无可变别名，历史原字节由分发资产保留。 @lang en Independent exact legacy binding0.1.0-draft graph paired only with map0.1.0-draft, retaining historical structure; type-readonly but shared/mutable at runtime. Clone before editing; it shares no mutable aliases with the current graph, and distribution assets retain historical bytes. */
export const GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA = createBindingSchema(GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION, DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION, GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID);

/**
 * @lang zh-CN 绑定owner校验的诊断上下文输入；入口先复制已知自有数据，再检查工件，不读取未知选项字段。
 * @lang en Diagnostic-context input for binding owner validation; the entry snapshots known own data before inspecting artifacts and leaves unknown option fields unread.
 */
export interface GeneratedDocumentationBindingValidationOptions {
  /**
   * @lang zh-CN 可省略的自有string诊断前缀，不是工件路径解析器；每次调用先复制，字段诊断可追加位置，path/targetPath保持原上下文。空字符串不加前缀，空白和分隔符不规范化或脱敏，失败也可回显合法上下文。仅接收同realm普通/null原型选项；未知字段不读。运行时自有undefined按省略处理，严格可选属性类型仍拒绝显式undefined。输出诊断可写且各调用独立，不授予文件访问/发布权限。
   * @lang en Optional own string diagnostic prefix, not an artifact-path resolver; copied at call entry, with field locations optionally appended and original context retained in path/targetPath. Empty strings add no prefix; whitespace/separators remain unnormalized and unsanitized, even on refusal. Only same-realm plain/null-prototype options are admitted; unknown fields remain unread. Runtime own undefined is treated as omitted, while strict optional-property types reject explicit undefined. Returned diagnostics are writable and independent across calls, granting no file-access/publication authority.
   */
  path?: string;
}

const resolutionConfidencePairs = new Set([
  "exact|high",
  "inferred|medium",
  "inferred|low",
  "ambiguous|low",
  "unresolved|none"
]);

const diagnosticSeverityByCode = new Map<string, HiaDiagnosticSeverity>([
  ["GDB_REF_SYNTAX_INVALID", "error"],
  ["GDB_REF_UNRESOLVED", "warning"],
  ["GDB_SCOPE_AMBIGUOUS", "warning"],
  ["GDB_EXPANSION_RUNTIME_ONLY", "info"],
  ["GDB_INSTANCE_KEY_MISSING", "warning"],
  ["GDB_INSTANCE_KEY_UNSTABLE", "info"],
  ["GDB_INSTANCE_KEY_DUPLICATE", "error"],
  ["GDB_TARGET_MISMATCH", "warning"],
  ["GDB_INHERITANCE_CONFLICT", "warning"],
  ["GDB_LOCALS_POLICY_VIOLATION", "error"]
]);

/**
 * @lang zh-CN 校验新旧绑定辅助工件的普通JSON、已消费字段、跨集合、隐私与精确版本；不执行getter/表达式，不读取路径或建立索引。
 * @lang en Validates ordinary JSON, consumed fields, cross-collection/privacy semantics and exact current/legacy binding versions without executing getters/expressions, reading paths or building indexes.
 *
 * @remarks
 * @lang zh-CN 按现有顺序返回输入字段、头部/政策、集合及引用诊断，已声明的root/binding adapterExtensions存在时须为object；未知可选JSON字段继续保留兼容。此函数只看到sidecar：不核实际映射声明/source/artifact闭包，不认证外部symbol、表达式或scopeId的词法真实性。合法提取error记录不会成为工件结构错误；消费索引和整组迁移另行据error拒绝。
 * @lang en Returns input-field, header/policy, collection and reference diagnostics in existing order; declared root/binding adapterExtensions must be objects when present, while unknown optional JSON fields remain compatible. This function sees only the sidecar: it checks no actual map declarations/source/artifact closure and authenticates no external symbols, expressions or lexical meaning of scopeId. Valid extraction-error records are not artifact-structure errors; consuming indexes and bundle migration separately refuse extraction errors.
 *
 * @param value <lang><zh-CN>未知内存值；只接受有限无环普通JSON，允许共享子图。</zh-CN><en>Unknown memory value; only finite acyclic ordinary JSON is accepted, with shared subgraphs allowed.</en></lang>
 * @param options <lang><zh-CN>普通/null原型自有string路径快照输入，默认空对象；访问器/错型拒绝且未知字段不读，合法上下文未脱敏。</zh-CN><en>Plain/null-prototype own string-path snapshot input, defaulting to an empty object; accessors/wrong types are rejected, unknown fields unread and valid context unsanitized.</en></lang>
 * @returns <lang><zh-CN>同步新建可写固定诊断数组，不修改输入；空数组仅代表本owner已实现检查通过，不替代完整schema验证、组认证或公开授权。Proxy反射/资源和并发突变不是沙箱保证。</zh-CN><en>Fresh synchronous writable fixed diagnostics without input mutation; an empty array passes implemented owner checks only, not complete schema validation, bundle certification or publication authority. Proxy reflection/resources/concurrent mutation are not sandbox guarantees.</en></lang>
 */
export function validateGeneratedDocumentationBinding(
  value: unknown,
  options: GeneratedDocumentationBindingValidationOptions = {}
): HiaDiagnostic[] {
  // <lang><zh-CN>仅投影一次原路径选项，try/catch及内部语义校验都只使用快照。</zh-CN><en>Project original path options once; try/catch and internal semantic checks use the snapshot only.</en></lang>
  const preparedOptions = prepareSourceLinkagePathOptions(options);
  if (!preparedOptions) return [createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding options must contain an own string diagnostic path.", "error")];
  try {
    // <lang><zh-CN>先检查完整普通JSON图；短路顺序也保护被撤销Proxy，不在拒绝后读取头字段。</zh-CN><en>Preflight the complete ordinary-JSON graph first; short-circuit order also protects revoked proxies without reading headers after rejection.</en></lang>
    if (!isDocSourceMapJsonDataGraph(value) || !isRecord(value)) {
      return [createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding manifest must contain ordinary finite acyclic JSON data.", "error", preparedOptions.path)];
    }
    return validateBindingJsonObject(value, preparedOptions);
  } catch {
    // <lang><zh-CN>反射或输入突变异常只返回固定诊断，不反射私有异常正文。</zh-CN><en>Reflection or input-mutation errors return fixed diagnostics without reflecting private exception text.</en></lang>
    return [createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding input could not be validated as ordinary JSON data.", "error", preparedOptions.path)];
  }
}

/** @lang zh-CN 在普通JSON预检后执行既有语义与已声明字段检查；不修改输入。 @lang en Executes existing semantics and declared-field checks after ordinary-JSON preflight without mutating input. */
function validateBindingJsonObject(value: Record<string, unknown>, options: GeneratedDocumentationBindingValidationOptions): HiaDiagnostic[] {
  // <lang><zh-CN>诊断只由固定说明与显式上下文构成，字段检查不回显被拒绝的值。</zh-CN><en>Diagnostics contain fixed explanations and explicit context only; field checks never echo rejected values.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  for (const issue of collectBindingInputIssues(value)) diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", issue.message, "error", appendPath(options.path, issue.target)));
  validateContractHeader(value, diagnostics, options.path);
  validatePrivacy(value.privacy, diagnostics, options.path);
  validateDeterministicLocalsPolicy(value.deterministicLocalsPolicy, diagnostics, options.path);
  validateDocSourceMapLinkage(value.docSourceMapLinkage, value.contractVersion, diagnostics, options.path);
  collectForbiddenValueProperties(value, diagnostics, options.path);

  const bindings = collectObjects(value.bindings, "bindings", diagnostics, options.path);
  const expansions = collectObjects(value.expansions, "expansions", diagnostics, options.path);
  const targets = collectObjects(value.targets, "targets", diagnostics, options.path);
  const contractDiagnostics = collectObjects(value.diagnostics, "diagnostics", diagnostics, options.path);
  const bindingIds = collectUniqueIds(bindings, "bindings", diagnostics, options.path);
  const expansionIds = collectUniqueIds(expansions, "expansions", diagnostics, options.path);
  const targetIds = collectUniqueIds(targets, "targets", diagnostics, options.path);

  bindings.forEach((binding, index) => validateBinding(binding, value.contractVersion, bindingIds, diagnostics, appendPath(options.path, `bindings.${index}`)));
  targets.forEach((target, index) => validateTarget(target, diagnostics, appendPath(options.path, `targets.${index}`)));
  validateExpansions(expansions, bindingIds, targetIds, diagnostics, options.path);
  contractDiagnostics.forEach((diagnostic, index) => validateContractDiagnostic(diagnostic, diagnostics, appendPath(options.path, `diagnostics.${index}`)));

  // expansionIds is intentionally collected now so malformed ids cannot hide behind unreferenced records.
  if (expansionIds.size !== expansions.length) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Expansion identifiers must be unique and non-empty.", "error", appendPath(options.path, "expansions")));
  }

  return diagnostics;
}

function validateContractHeader(value: Record<string, unknown>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (value.contract !== GENERATED_DOCUMENTATION_BINDING_CONTRACT) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "generated-documentation-binding manifest contract is invalid.", "error", targetPath));
  }
  if (value.contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
    && value.contractVersion !== GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION
    && value.contractVersion !== GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_UNSUPPORTED_VERSION", "Binding contractVersion must be an explicitly supported version.", "error", targetPath));
  }
  if (!nonEmptyString(value.id) || !isRecord(value.producer) || !nonEmptyString(value.producer.name) || !nonEmptyString(value.producer.version) || !nonEmptyString(value.producer.adapterId)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Manifest id and producer name/version/adapterId are required.", "error", targetPath));
  }
}

function validatePrivacy(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  const expected: Record<string, unknown> = {
    sourcesContentPolicy: "none",
    allowAbsolutePaths: false,
    allowUncPaths: false,
    allowSourceBodySerialization: false,
    allowRuntimeValueSerialization: false,
    allowRuntimeExpressionExecution: false,
    allowDigestSerialization: false,
    allowSecretSerialization: false
  };
  if (!isRecord(value) || Object.entries(expected).some(([key, expectedValue]) => value[key] !== expectedValue)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_PRIVACY_VIOLATION", "Privacy must keep source content, absolute paths, runtime values, expression execution, digests, and secrets disabled.", "error", appendPath(targetPath, "privacy")));
  }
}

function validateDeterministicLocalsPolicy(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value)
    || value.contract !== "generated-doc-locals"
    || value.contractVersion !== "0.1.0-draft-input"
    || !nonEmptyString(value.adapterId)
    || !Array.isArray(value.bindingAllowlist)
    || !["metadata-only", "sensitive-not-serialized"].includes(stringValue(value.privacyClassification) ?? "")
    || !isRecord(value.limits)
    || value.limits.maxDepth !== 12
    || value.limits.maxEntries !== 10000
    || value.limits.maxStringBytes !== 65536
    || !Array.isArray(value.prohibitedSources)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Deterministic locals policy must preserve the frozen contract, limits, allowlist, and privacy summary.", "error", appendPath(targetPath, "deterministicLocalsPolicy")));
    return;
  }
  if (value.mode === "deterministic-json-compatible" && !nonEmptyString(value.inputId)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Deterministic locals inputId is required when deterministic locals are enabled.", "error", appendPath(targetPath, "deterministicLocalsPolicy.inputId")));
  }
}

/** @lang zh-CN 三代绑定只接受各自冻结的映射版本，不猜测未知版本。 @lang en Each of the three binding generations admits only its pinned map version, without guessing unknown versions. */
function pairedDocSourceMapVersion(bindingVersion: unknown): string | undefined {
  if (bindingVersion === GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) return DOC_SOURCE_MAP_CONTRACT_VERSION;
  if (bindingVersion === GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION) return DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION;
  if (bindingVersion === GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION) return DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION;
  return undefined;
}

/** @lang zh-CN 每代绑定只接受其冻结的映射版本，不能交叉配对。 @lang en Each binding generation admits only its pinned mapping version, never cross-pairing. */
function validateDocSourceMapLinkage(value: unknown, bindingVersion: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  const expectedMapVersion = pairedDocSourceMapVersion(bindingVersion);
  if (!isRecord(value)
    || value.contract !== DOC_SOURCE_MAP_CONTRACT
    || !expectedMapVersion
    || value.contractVersion !== expectedMapVersion
    || !nonEmptyString(value.sidecarId)
    || !nonEmptyString(value.sidecarPath)
    || value.entryReferenceField !== "generatedBindingRefs") {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "doc-source-map linkage must identify the versioned sidecar and generatedBindingRefs field.", "error", appendPath(targetPath, "docSourceMapLinkage")));
    return;
  }
  if (isUnsafeRelativePath(value.sidecarPath)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_UNSAFE_PATH", "generated-documentation-binding sidecarPath must be a safe relative path.", "error", appendPath(targetPath, "docSourceMapLinkage.sidecarPath")));
  }
}

/** @lang zh-CN 逐代验证绑定根及其独立源码引用；0.3不从映射工件继承范围约定。 @lang en Validates each binding generation and its independent source references; 0.3 never inherits range conventions from the map. */
function validateBinding(value: Record<string, unknown>, bindingVersion: unknown, bindingIds: Set<string>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!bindingIds.has(stringValue(value.id) ?? "") || !nonEmptyString(value.adapterId)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding id and adapterId are required.", "error", targetPath));
  }
  if (!isRecord(value.sourceIntent) || !nonEmptyString(value.sourceIntent.kind) || !isSourceRef(value.sourceIntent.sourceRef, bindingVersion)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding sourceIntent must contain a kind and source reference.", "error", appendPath(targetPath, "sourceIntent")));
  }
  if (!isRecord(value.bindingRef) || !nonEmptyString(value.bindingRef.rootDeclarationId) || !Array.isArray(value.bindingRef.memberPath)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding bindingRef must contain normalized declaration identity and member path.", "error", appendPath(targetPath, "bindingRef")));
  }
  if (!isRecord(value.scope) || !isValidScope(value.scope)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding scope must use gdb-scope/v1 identity with neutral semantic ancestry and declaration slot.", "error", appendPath(targetPath, "scope")));
  }
  validateResolution(value.resolution, diagnostics, appendPath(targetPath, "resolution"));
  validateComposition(value.composition, bindingVersion, diagnostics, appendPath(targetPath, "composition"));
}

/** @lang zh-CN 生成目标须保留可识别身份，可选范围沿core一基/顺序约束。 @lang en Generated targets retain identifiable identity, with optional ranges following core one-based/order constraints. */
function validateTarget(value: Record<string, unknown>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!nonEmptyString(value.id) || !isRecord(value.identity) || !nonEmptyString(value.identity.kind) || (!nonEmptyString(value.identity.artifactId) && !nonEmptyString(value.identity.symbolId))) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Target requires an id and an artifact or documentation-symbol identity without adapter AST details.", "error", targetPath));
  }
  if (isRecord(value.identity) && Object.hasOwn(value.identity, "range") && !isRange(value.identity.range)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Target range must contain ordered positive safe integer coordinates.", "error", appendPath(targetPath, "identity.range")));
  }
  validateResolution(value.resolution, diagnostics, appendPath(targetPath, "resolution"));
}

function validateExpansions(expansions: Record<string, unknown>[], bindingIds: Set<string>, targetIds: Set<string>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  const keysByScope = new Map<string, Set<string>>();
  expansions.forEach((expansion, index) => {
    const expansionPath = appendPath(targetPath, `expansions.${index}`);
    const bindingId = stringValue(expansion.bindingId);
    const scopeId = stringValue(expansion.scopeId);
    if (!nonEmptyString(expansion.id) || !bindingId || !bindingIds.has(bindingId) || !scopeId || !Number.isSafeInteger(expansion.order) || (expansion.order as number) < 0) {
      diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Expansion requires an id, known bindingId, scopeId, and non-negative order.", "error", expansionPath));
    }
    validateResolution(expansion.resolution, diagnostics, appendPath(expansionPath, "resolution"));
    const instanceKey = validateInstanceKey(expansion.instanceKey, diagnostics, appendPath(expansionPath, "instanceKey"));
    if (instanceKey && bindingId && scopeId) {
      const scopeKey = `${bindingId}\u0000${scopeId}`;
      const existing = keysByScope.get(scopeKey) ?? new Set<string>();
      if (existing.has(instanceKey)) {
        diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Expansion instance keys must not duplicate within one binding expansion scope.", "error", appendPath(expansionPath, "instanceKey.key")));
      }
      existing.add(instanceKey);
      keysByScope.set(scopeKey, existing);
    }
    if (!Array.isArray(expansion.targetIds) || expansion.targetIds.some((targetId) => !nonEmptyString(targetId) || !targetIds.has(targetId))) {
      diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Expansion targetIds must reference known generated targets.", "error", appendPath(expansionPath, "targetIds")));
    }
  });
}

function validateResolution(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Resolution, confidence, and provenance coverage must be declared separately.", "error", targetPath));
    return;
  }
  const resolutionKind = stringValue(value.resolutionKind);
  const confidence = stringValue(value.confidence);
  const provenanceCoverage = stringValue(value.provenanceCoverage);
  if (!resolutionKind || !confidence || !provenanceCoverage || !resolutionConfidencePairs.has(`${resolutionKind}|${confidence}`) || !["source-only", "source-and-generated", "generated-only"].includes(provenanceCoverage)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Resolution/confidence combination or provenance coverage is invalid; generated-only is provenance only.", "error", targetPath));
  }
}

/** @lang zh-CN 组合贡献的每条源码引用沿绑定版本独立检查，避免以主sourceIntent代替证据。 @lang en Checks each composition source reference under its binding version, never substituting the main sourceIntent's evidence. */
function validateComposition(value: unknown, bindingVersion: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value) || !["none", "inheritance", "composition"].includes(stringValue(value.relation) ?? "") || !Array.isArray(value.contributions)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Composition must distinguish none, inheritance, and composition with ordered contributions.", "error", targetPath));
    return;
  }
  value.contributions.forEach((contribution, index) => {
    if (!isRecord(contribution) || !nonEmptyString(contribution.id) || !Number.isSafeInteger(contribution.order) || (contribution.order as number) < 0 || !isSourceRef(contribution.sourceRef, bindingVersion) || !isRecord(contribution.overrideContext) || !nonEmptyString(contribution.overrideContext.kind)) {
      diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Every inheritance or composition contribution retains source and override context.", "error", appendPath(targetPath, `contributions.${index}`)));
    }
  });
}

function validateInstanceKey(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): string | undefined {
  if (!isRecord(value)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Expansion instanceKey is required.", "error", targetPath));
    return undefined;
  }
  const status = stringValue(value.status);
  if (status === "missing") {
    if (value.origin !== "unavailable" || value.diagnosticCode !== "GDB_INSTANCE_KEY_MISSING") {
      diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Missing instance key must carry the frozen missing-key diagnostic.", "error", targetPath));
    }
    return undefined;
  }
  const key = stringValue(value.key);
  const validStableKey = status === "stable" && /^gdb-key\/v1\/(?:string|number|boolean|stable-id):[A-Za-z0-9._~-]+$/.test(key ?? "");
  const validUnstableKey = status === "unstable" && value.origin === "array-index" && value.diagnosticCode === "GDB_INSTANCE_KEY_UNSTABLE" && /^gdb-key\/v1\/(?:number|ordinal):[A-Za-z0-9._~-]+$/.test(key ?? "");
  if ((validStableKey || validUnstableKey) && value.privacySafe === true) {
    return key;
  }
  diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Instance key must be privacy-safe, normalized, and match its stable or unstable origin policy.", "error", targetPath));
  return undefined;
}

function validateContractDiagnostic(value: Record<string, unknown>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  const code = stringValue(value.code);
  const expectedSeverity = code ? diagnosticSeverityByCode.get(code) : undefined;
  if (!nonEmptyString(value.id) || !expectedSeverity || value.severity !== expectedSeverity) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Contract diagnostics must use a frozen GDB code and its fixed severity.", "error", targetPath));
  }
}

/** @lang zh-CN 集合必须由对象项组成，非法项明确报错，不静默丢失后宣称成功。 @lang en Collections must contain objects; invalid members are diagnosed rather than silently discarded before success. */
function collectObjects(value: unknown, collectionName: string, diagnostics: HiaDiagnostic[], targetPath?: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", `${collectionName} must be an array.`, "error", appendPath(targetPath, collectionName)));
    return [];
  }
  // <lang><zh-CN>保留合法项用于继续诊断，但任何非法项都会使公共组合器返回空索引。</zh-CN><en>Retain valid members for further diagnostics, but any invalid member makes the public composer return an empty index.</en></lang>
  const items: Record<string, unknown>[] = [];
  value.forEach((item, index) => {
    if (isRecord(item)) items.push(item);
    else diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding collection members must be JSON objects.", "error", appendPath(targetPath, `${collectionName}.${index}`)));
  });
  return items;
}

function collectUniqueIds(items: Record<string, unknown>[], collectionName: string, diagnostics: HiaDiagnostic[], targetPath?: string): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    const id = stringValue(item.id);
    if (!id || ids.has(id)) {
      diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", `${collectionName} ids must be non-empty and unique.`, "error", appendPath(targetPath, collectionName)));
      continue;
    }
    ids.add(id);
  }
  return ids;
}

/** @lang zh-CN 迭代扫描每个容器一次；固定privacy定位避免泄漏扩展属性名，调用方path仍保留。 @lang en Iteratively scans each container once; a fixed privacy location avoids extension-key leakage while retaining caller paths. */
function collectForbiddenValueProperties(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  // <lang><zh-CN>固定禁用字段不含原始数据；显式栈和身份集合避免深图栈溢出及共享子图重复工作。</zh-CN><en>Fixed forbidden keys contain no raw data; an explicit stack and identity set prevent deep recursion and repeated shared-subgraph work.</en></lang>
  const forbidden = new Set(["sourceBody", "sourceText", "sourcesContent", "runtimeValues", "localsValues", "digestValue", "secretValue"]);
  const pending: unknown[] = [value];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    // <lang><zh-CN>只扫描预检后的容器；描述符保留隐藏数据检查而不调用getter。</zh-CN><en>Scan preflighted containers only; descriptors preserve hidden-data checks without invoking getters.</en></lang>
    const current = pending.pop();
    if (typeof current !== "object" || current === null || visited.has(current)) continue;
    visited.add(current);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(current))) {
      if (forbidden.has(key)) {
        diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_PRIVACY_VIOLATION", `Property ${key} is forbidden in a generated-documentation-binding sidecar.`, "error", appendPath(targetPath, "privacy")));
      }
      if (Object.hasOwn(descriptor, "value") && typeof descriptor.value === "object" && descriptor.value !== null) pending.push(descriptor.value);
    }
  }
}

/** @lang zh-CN 旧绑定保留原坐标规则；0.3每条带范围引用还须独立声明有效终点和列单位，确定列单位须有起止列。 @lang en Old bindings retain their coordinate rules; every ranged 0.3 reference additionally declares its own valid endpoint and column unit, with both columns for a known unit. */
function isSourceRef(value: unknown, bindingVersion: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !nonEmptyString(value.sourceId) || !isRange(value.range) || !(DOC_SOURCE_MAP_RANGE_SOURCES as readonly unknown[]).includes(value.rangeSource)) return false;
  if (bindingVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) return true;
  const convention = value.rangeConvention;
  if (!isRecord(convention) || Object.keys(convention).sort().join(",") !== "columnUnit,endBoundary"
    || Object.getOwnPropertyNames(convention).sort().join(",") !== "columnUnit,endBoundary"
    || Object.getOwnPropertySymbols(convention).length !== 0
    || !(DOC_SOURCE_MAP_END_BOUNDARIES as readonly unknown[]).includes(convention.endBoundary)
    || !(DOC_SOURCE_MAP_COLUMN_UNITS as readonly unknown[]).includes(convention.columnUnit)) return false;
  if (convention.columnUnit === "unknown") return true;
  const range = value.range as Record<string, unknown>;
  return isRecord(range.start) && isRecord(range.end) && Number.isSafeInteger(range.start.column) && Number.isSafeInteger(range.end.column);
}

/** @lang zh-CN 采用core一基安全整数与缺省列1，终点不早于起点，不改变端点包含语义。 @lang en Uses core positive safe integer positions and omitted column one, with ordered endpoints and unchanged inclusivity semantics. */
function isRange(value: unknown): boolean {
  if (!isRecord(value) || !isPosition(value.start) || !isPosition(value.end)) return false;
  return value.end.line > value.start.line || (value.end.line === value.start.line && (value.end.column ?? 1) >= (value.start.column ?? 1));
}

/** @lang zh-CN 缺省列可省略，已提供的行列必须为一基安全整数。 @lang en Columns may be omitted; supplied lines/columns must be positive safe integers. */
function isPosition(value: unknown): value is { line: number; column?: number } {
  return isRecord(value) && Number.isSafeInteger(value.line) && (value.line as number) > 0 && (value.column === undefined || (Number.isSafeInteger(value.column) && (value.column as number) > 0));
}

function isValidScope(value: Record<string, unknown>): boolean {
  return typeof value.id === "string"
    && /^gdb-scope\/v1\/[^/]+\/[^#]+#[^/]+\/[^/]+$/.test(value.id)
    && nonEmptyString(value.adapterId)
    && nonEmptyString(value.sourceId)
    && Array.isArray(value.semanticAncestry)
    && value.semanticAncestry.length > 0
    && value.semanticAncestry.every(nonEmptyString)
    && nonEmptyString(value.declarationSlot);
}

function isUnsafeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return !normalized
    || normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..")
    || path.isAbsolute(value)
    || path.posix.isAbsolute(normalized)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized);
}

function createBindingDiagnostic(code: string, message: string, severity: HiaDiagnosticSeverity, targetPath?: string, data?: HiaDiagnosticData): HiaDiagnostic {
  const options: { data?: HiaDiagnosticData; targetPath?: string } = {};
  if (data) {
    options.data = data;
  }
  if (targetPath) {
    options.targetPath = targetPath;
  }
  return createHiaDiagnostic(code, message, severity, options);
}

function appendPath(prefix: string | undefined, suffix: string): string {
  return prefix ? `${prefix}.${suffix}` : suffix;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function stringValue(value: unknown): string | undefined {
  return nonEmptyString(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
