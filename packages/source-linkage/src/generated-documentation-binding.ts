import path from "node:path";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity
} from "@hia-doc/core";
import {
  DOC_SOURCE_MAP_CONTRACT,
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT,
  GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION
} from "./constants.js";

/**
 * 中文：可版本化 generated-documentation-binding JSON Schema 的 canonical `$id`。
 * English: Canonical versioned `$id` for the generated-documentation-binding JSON Schema.
 */
export const GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.1.0-draft.schema.json";

/**
 * 中文：与 contract 版本分离的 schema 版本；当前与 contractVersion 对齐。
 * English: Schema version independent of package SemVer; it currently matches contractVersion.
 */
export const GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION = GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION;

/**
 * 中文：`generated-documentation-binding@0.1.0-draft` 的 Draft 2020-12 schema。
 * English: Draft 2020-12 schema for `generated-documentation-binding@0.1.0-draft`.
 *
 * @remarks
 * 中文：schema 只表达中性 declaration、expansion、target、diagnostic 及 sidecar
 * 引用；不出现 Pug AST node、template source body 或 runtime locals value。
 * English: The schema describes only neutral declarations, expansions, targets,
 * diagnostics, and sidecar references; it contains no Pug AST nodes, template
 * source bodies, or runtime local values.
 */
export const GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID,
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
    contractVersion: { const: GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION },
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
    sourceRef: {
      type: "object",
      required: ["sourceId", "range", "rangeSource"],
      additionalProperties: false,
      properties: {
        sourceId: { $ref: "#/$defs/nonEmptyString" },
        range: { $ref: "#/$defs/range" },
        rangeSource: {
          enum: ["parser", "compiler", "adapter", "source-map", "manual", "heuristic", "unresolved"]
        }
      }
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
        contractVersion: { const: DOC_SOURCE_MAP_CONTRACT_VERSION },
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
        minimumConsumerContractVersion: { const: GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION },
        unknownFieldPolicy: { const: "ignore-unknown-optional-fields" },
        breakingChangePolicy: { const: "new-contract-version-and-schema-id" }
      }
    }
  }
} as const;

/**
 * 中文：generated-documentation-binding owner validator 的可选上下文。
 * English: Optional context for the generated-documentation-binding owner validator.
 */
export interface GeneratedDocumentationBindingValidationOptions {
  /** 中文：仅用于 diagnostic targetPath 的 artifact-relative 位置。English: Artifact-relative location used only for diagnostic targetPath. */
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
 * 中文：校验中性 generated-documentation-binding sidecar 的跨集合、隐私和
 * 版本语义。它不执行 adapter expression、不读取 source body，也不建立 W-P52.5
 * 的双向查询索引。
 * English: Validates cross-collection, privacy, and version semantics for a
 * neutral generated-documentation-binding sidecar. It neither executes adapter
 * expressions nor reads source bodies, and it does not build the W-P52.5
 * bidirectional query index.
 *
 * @param value 中文：待校验的反序列化 JSON 值。English: Deserialized JSON value to validate.
 * @param options 中文：只含 diagnostic 定位上下文。English: Diagnostic-location context only.
 * @returns 中文：稳定诊断数组，空数组表示 owner semantic checks 通过。English: Stable diagnostics; an empty array passes owner semantic checks.
 */
export function validateGeneratedDocumentationBinding(
  value: unknown,
  options: GeneratedDocumentationBindingValidationOptions = {}
): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];

  if (!isRecord(value)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "generated-documentation-binding manifest must be a JSON object.", "error", options.path));
    return diagnostics;
  }

  validateContractHeader(value, diagnostics, options.path);
  validatePrivacy(value.privacy, diagnostics, options.path);
  validateDeterministicLocalsPolicy(value.deterministicLocalsPolicy, diagnostics, options.path);
  validateDocSourceMapLinkage(value.docSourceMapLinkage, diagnostics, options.path);
  collectForbiddenValueProperties(value, diagnostics, options.path);

  const bindings = collectObjects(value.bindings, "bindings", diagnostics, options.path);
  const expansions = collectObjects(value.expansions, "expansions", diagnostics, options.path);
  const targets = collectObjects(value.targets, "targets", diagnostics, options.path);
  const contractDiagnostics = collectObjects(value.diagnostics, "diagnostics", diagnostics, options.path);
  const bindingIds = collectUniqueIds(bindings, "bindings", diagnostics, options.path);
  const expansionIds = collectUniqueIds(expansions, "expansions", diagnostics, options.path);
  const targetIds = collectUniqueIds(targets, "targets", diagnostics, options.path);

  bindings.forEach((binding, index) => validateBinding(binding, bindingIds, diagnostics, appendPath(options.path, `bindings.${index}`)));
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
  if (value.contractVersion !== GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_UNSUPPORTED_VERSION", `generated-documentation-binding contractVersion must be ${GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION}.`, "error", targetPath));
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

function validateDocSourceMapLinkage(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value)
    || value.contract !== DOC_SOURCE_MAP_CONTRACT
    || value.contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION
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

function validateBinding(value: Record<string, unknown>, bindingIds: Set<string>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!bindingIds.has(stringValue(value.id) ?? "") || !nonEmptyString(value.adapterId)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding id and adapterId are required.", "error", targetPath));
  }
  if (!isRecord(value.sourceIntent) || !nonEmptyString(value.sourceIntent.kind) || !isSourceRef(value.sourceIntent.sourceRef)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding sourceIntent must contain a kind and source reference.", "error", appendPath(targetPath, "sourceIntent")));
  }
  if (!isRecord(value.bindingRef) || !nonEmptyString(value.bindingRef.rootDeclarationId) || !Array.isArray(value.bindingRef.memberPath)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding bindingRef must contain normalized declaration identity and member path.", "error", appendPath(targetPath, "bindingRef")));
  }
  if (!isRecord(value.scope) || !isValidScope(value.scope)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Binding scope must use gdb-scope/v1 identity with neutral semantic ancestry and declaration slot.", "error", appendPath(targetPath, "scope")));
  }
  validateResolution(value.resolution, diagnostics, appendPath(targetPath, "resolution"));
  validateComposition(value.composition, diagnostics, appendPath(targetPath, "composition"));
}

function validateTarget(value: Record<string, unknown>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!nonEmptyString(value.id) || !isRecord(value.identity) || !nonEmptyString(value.identity.kind) || (!nonEmptyString(value.identity.artifactId) && !nonEmptyString(value.identity.symbolId))) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Target requires an id and an artifact or documentation-symbol identity without adapter AST details.", "error", targetPath));
  }
  validateResolution(value.resolution, diagnostics, appendPath(targetPath, "resolution"));
}

function validateExpansions(expansions: Record<string, unknown>[], bindingIds: Set<string>, targetIds: Set<string>, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  const keysByScope = new Map<string, Set<string>>();
  expansions.forEach((expansion, index) => {
    const expansionPath = appendPath(targetPath, `expansions.${index}`);
    const bindingId = stringValue(expansion.bindingId);
    const scopeId = stringValue(expansion.scopeId);
    if (!nonEmptyString(expansion.id) || !bindingId || !bindingIds.has(bindingId) || !scopeId || !Number.isInteger(expansion.order)) {
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

function validateComposition(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string): void {
  if (!isRecord(value) || !["none", "inheritance", "composition"].includes(stringValue(value.relation) ?? "") || !Array.isArray(value.contributions)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", "Composition must distinguish none, inheritance, and composition with ordered contributions.", "error", targetPath));
    return;
  }
  value.contributions.forEach((contribution, index) => {
    if (!isRecord(contribution) || !nonEmptyString(contribution.id) || !Number.isInteger(contribution.order) || !isSourceRef(contribution.sourceRef) || !isRecord(contribution.overrideContext) || !nonEmptyString(contribution.overrideContext.kind)) {
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

function collectObjects(value: unknown, collectionName: string, diagnostics: HiaDiagnostic[], targetPath?: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_INVALID", `${collectionName} must be an array.`, "error", appendPath(targetPath, collectionName)));
    return [];
  }
  return value.filter(isRecord);
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

function collectForbiddenValueProperties(value: unknown, diagnostics: HiaDiagnostic[], targetPath?: string, currentPath = ""): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenValueProperties(item, diagnostics, targetPath, `${currentPath}.${index}`));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  const forbidden = new Set(["sourceBody", "sourceText", "sourcesContent", "runtimeValues", "localsValues", "digestValue", "secretValue"]);
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) {
      diagnostics.push(createBindingDiagnostic("GENERATED_DOCUMENTATION_BINDING_PRIVACY_VIOLATION", `Property ${key} is forbidden in a generated-documentation-binding sidecar.`, "error", appendPath(targetPath, `${currentPath}.${key}`.replace(/^\./, ""))));
    }
    collectForbiddenValueProperties(child, diagnostics, targetPath, `${currentPath}.${key}`);
  }
}

function isSourceRef(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && nonEmptyString(value.sourceId) && isRange(value.range) && nonEmptyString(value.rangeSource);
}

function isRange(value: unknown): boolean {
  return isRecord(value) && isPosition(value.start) && isPosition(value.end);
}

function isPosition(value: unknown): boolean {
  return isRecord(value) && Number.isInteger(value.line) && (value.column === undefined || Number.isInteger(value.column));
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
