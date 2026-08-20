import { createHiaDiagnostic } from "./diagnostics.js";
import type { HiaDiagnostic, HiaDiagnosticSeverity } from "./model.js";

/**
 * @lang zh-CN
 * 非可执行业务流程文档事实的中性 contract 名称；它不绑定 HIA owner、BPMN wire format 或 renderer。
 *
 * @lang en
 * Neutral contract name for non-executable business-flow documentation facts; it binds no HIA owner, BPMN wire format, or renderer.
 */
export const BUSINESS_FLOW_DOCUMENTATION_CONTRACT = "business-flow-documentation" as const;

/**
 * @lang zh-CN
 * P1 草案版本；draft consumer 必须精确匹配，不能推测前向或后向兼容。
 *
 * @lang en
 * P1 draft version; draft consumers must match it exactly and infer neither forward nor backward compatibility.
 */
export const BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION = "0.1.0-draft" as const;

/** @lang zh-CN 公开 schema identity。 @lang en Public schema identity. */
export const BUSINESS_FLOW_DOCUMENTATION_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/business-flow-documentation-0.1.0-draft.schema.json" as const;

/** @lang zh-CN P1 节点 kind 闭集。 @lang en Closed P1 node-kind set. */
export const BUSINESS_FLOW_NODE_KINDS = ["start", "step", "decision", "merge", "end", "actor", "artifact"] as const;
/** @lang zh-CN 参与控制流的节点 kind。 @lang en Node kinds participating in control flow. */
export const BUSINESS_FLOW_CONTROL_NODE_KINDS = ["start", "step", "decision", "merge", "end"] as const;
/** @lang zh-CN P1 关系 family 闭集。 @lang en Closed P1 relation-family set. */
export const BUSINESS_FLOW_RELATION_FAMILIES = ["control", "responsibility", "data"] as const;
/** @lang zh-CN P1 关系 kind 闭集。 @lang en Closed P1 relation-kind set. */
export const BUSINESS_FLOW_RELATION_KINDS = ["sequence", "branch", "exception", "performed-by", "reads", "writes", "emits"] as const;
/** @lang zh-CN P1 actor role kind 闭集。 @lang en Closed P1 actor-role kind set. */
export const BUSINESS_FLOW_ACTOR_KINDS = ["human-role", "system-role", "organization-role"] as const;
/** @lang zh-CN P1 artifact metadata kind 闭集。 @lang en Closed P1 artifact-metadata kind set. */
export const BUSINESS_FLOW_ARTIFACT_KINDS = ["data", "message", "record", "document"] as const;
/** @lang zh-CN P1 end outcome 闭集。 @lang en Closed P1 end-outcome set. */
export const BUSINESS_FLOW_END_OUTCOMES = ["success", "rejected", "failed", "cancelled"] as const;
/** @lang zh-CN 隐私分类；默认由 author 选择 internal。 @lang en Privacy classes; authors choose internal by default. */
export const BUSINESS_FLOW_PRIVACY_CLASSES = ["public", "internal", "restricted"] as const;
/** @lang zh-CN 引用解析状态。 @lang en Reference-resolution states. */
export const BUSINESS_FLOW_RESOLUTION_VALUES = ["resolved", "unresolved", "ambiguous", "not-applicable"] as const;
/** @lang zh-CN 置信度状态；它不由 resolution 推导。 @lang en Confidence states; they are not derived from resolution. */
export const BUSINESS_FLOW_CONFIDENCE_VALUES = ["high", "medium", "low", "unknown"] as const;
/** @lang zh-CN canonical 事实来源。 @lang en Canonical fact origins. */
export const BUSINESS_FLOW_AUTHORSHIP_VALUES = ["author-provided", "producer-resolved"] as const;

/**
 * @lang zh-CN
 * W-P114 冻结的 stable diagnostic code；后续草案不得静默复用为不同语义。
 *
 * @lang en
 * Stable diagnostic codes frozen by W-P114; later drafts must not silently reuse them for different semantics.
 */
export const BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES = [
  "BFD_INVALID_CONTRACT",
  "BFD_DUPLICATE_ID",
  "BFD_UNKNOWN_REFERENCE",
  "BFD_INVALID_ENTRY_OR_END",
  "BFD_UNREACHABLE_CONTROL_NODE",
  "BFD_CONTROL_CYCLE_UNSUPPORTED",
  "BFD_BRANCH_INVARIANT",
  "BFD_MERGE_INVARIANT",
  "BFD_EXCEPTION_INVARIANT",
  "BFD_AUTHORSHIP_BOUNDARY",
  "BFD_QUALITY_DIMENSION_INVALID",
  "BFD_PRIVACY_BOUNDARY",
  "BFD_CODE_BINDING_UNRESOLVED",
  "BFD_COMPATIBILITY_UNSUPPORTED"
] as const;

/** @lang zh-CN 节点 kind 类型。 @lang en Node-kind type. */
export type BusinessFlowNodeKind = typeof BUSINESS_FLOW_NODE_KINDS[number];
/** @lang zh-CN 关系 family 类型。 @lang en Relation-family type. */
export type BusinessFlowRelationFamily = typeof BUSINESS_FLOW_RELATION_FAMILIES[number];
/** @lang zh-CN 关系 kind 类型。 @lang en Relation-kind type. */
export type BusinessFlowRelationKind = typeof BUSINESS_FLOW_RELATION_KINDS[number];
/** @lang zh-CN 隐私分类类型。 @lang en Privacy-class type. */
export type BusinessFlowPrivacyClass = typeof BUSINESS_FLOW_PRIVACY_CLASSES[number];
/** @lang zh-CN stable diagnostic code 类型。 @lang en Stable diagnostic-code type. */
export type BusinessFlowDocumentationDiagnosticCode = typeof BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES[number];

/** @lang zh-CN locale tag 到非空 label 的映射。 @lang en Map from locale tags to non-empty labels. */
export type BusinessFlowLocalizedLabels = Record<string, string>;

/** @lang zh-CN 独立的 provenance 元数据。 @lang en Independent provenance metadata. */
export interface BusinessFlowProvenance {
  evidenceRefs: string[];
  origin: typeof BUSINESS_FLOW_AUTHORSHIP_VALUES[number];
}

/**
 * @lang zh-CN
 * 引用质量三维；resolution、confidence 与 provenance 互不推导。
 *
 * @lang en
 * Three reference-quality dimensions; resolution, confidence, and provenance do not imply one another.
 */
export interface BusinessFlowQuality {
  confidence: typeof BUSINESS_FLOW_CONFIDENCE_VALUES[number];
  provenance: BusinessFlowProvenance;
  resolution: typeof BUSINESS_FLOW_RESOLUTION_VALUES[number];
}

/** @lang zh-CN 单个业务流程身份与入口/终点声明。 @lang en One business-flow identity and its entry/end declarations. */
export interface BusinessFlowDefinition {
  defaultLocale: string;
  endNodeIds: string[];
  entryNodeId: string;
  id: string;
  labels: BusinessFlowLocalizedLabels;
  privacyClass: BusinessFlowPrivacyClass;
}

/**
 * @lang zh-CN
 * 中性业务节点；actorKind、artifactKind 与 outcome 只在对应 discriminator 下出现。
 *
 * @lang en
 * Neutral business node; actorKind, artifactKind, and outcome appear only with their matching discriminators.
 */
export interface BusinessFlowNode {
  actorKind?: typeof BUSINESS_FLOW_ACTOR_KINDS[number];
  artifactKind?: typeof BUSINESS_FLOW_ARTIFACT_KINDS[number];
  authorship: typeof BUSINESS_FLOW_AUTHORSHIP_VALUES[number];
  flowId: string;
  id: string;
  kind: BusinessFlowNodeKind;
  labels: BusinessFlowLocalizedLabels;
  outcome?: typeof BUSINESS_FLOW_END_OUTCOMES[number];
  privacyClass: BusinessFlowPrivacyClass;
}

/**
 * @lang zh-CN
 * Typed directed relation；control order 仅用于确定性叙事，不表达运行优先级。
 *
 * @lang en
 * Typed directed relation; control order is deterministic narrative order, never runtime priority.
 */
export interface BusinessFlowRelation {
  authorship: typeof BUSINESS_FLOW_AUTHORSHIP_VALUES[number];
  caseKey?: string;
  family: BusinessFlowRelationFamily;
  flowId: string;
  from: string;
  id: string;
  kind: BusinessFlowRelationKind;
  order?: number;
  quality?: BusinessFlowQuality;
  to: string;
}

/** @lang zh-CN metadata-only evidence；不含正文或物理路径。 @lang en Metadata-only evidence with no body or physical path. */
export interface BusinessFlowEvidence {
  bodyIncluded: false;
  id: string;
  kind: string;
  locator: string;
  locatorKind: "logical-id";
  privacyClass: BusinessFlowPrivacyClass;
}

/** @lang zh-CN 业务节点到既有文档 entry metadata 的非执行绑定。 @lang en Non-executing binding from a business node to existing documentation-entry metadata. */
export interface BusinessFlowCodeBinding {
  authorship: "producer-resolved";
  businessNodeId: string;
  flowId: string;
  id: string;
  quality: BusinessFlowQuality;
  targetId: string;
  targetKind: "doc-entry";
}

/** @lang zh-CN Contract 内嵌的 public-safe diagnostic。 @lang en Public-safe diagnostic embedded in the contract. */
export interface BusinessFlowContractDiagnostic {
  code: BusinessFlowDocumentationDiagnosticCode;
  message: string;
  path?: string;
  severity: HiaDiagnosticSeverity;
  targetPath?: string;
}

/** @lang zh-CN 关闭所有敏感正文、位置与身份 carrier 的隐私事实。 @lang en Privacy facts that close every sensitive body, location, and identity carrier. */
export interface BusinessFlowPrivacy {
  absolutePathIncluded: false;
  credentialIncluded: false;
  personalIdentityIncluded: false;
  runtimePayloadIncluded: false;
  sourceBodyIncluded: false;
  sourceRangeIncluded: false;
  targetIdentityIncluded: false;
}

/** @lang zh-CN Exact draft 与显式迁移策略。 @lang en Exact-draft and explicit-migration policy. */
export interface BusinessFlowCompatibility {
  migrationPolicy: "explicit-pure-identity-preserving";
  unknownKindPolicy: "reject";
  unknownProperties: "reject";
  versionMatch: "exact";
}

/**
 * @lang zh-CN
 * `business-flow-documentation@0.1.0-draft` canonical wire payload。
 *
 * @lang en
 * Canonical wire payload for `business-flow-documentation@0.1.0-draft`.
 */
export interface BusinessFlowDocumentation {
  codeBindings: BusinessFlowCodeBinding[];
  compatibility: BusinessFlowCompatibility;
  contract: typeof BUSINESS_FLOW_DOCUMENTATION_CONTRACT;
  contractVersion: typeof BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION;
  diagnostics: BusinessFlowContractDiagnostic[];
  evidence: BusinessFlowEvidence[];
  flows: BusinessFlowDefinition[];
  nodes: BusinessFlowNode[];
  privacy: BusinessFlowPrivacy;
  relations: BusinessFlowRelation[];
}

/** @lang zh-CN Producer 只接受调用方显式提供的 metadata target registry。 @lang en The producer accepts only a caller-supplied metadata target registry. */
export interface BusinessFlowProductionOptions {
  availableCodeTargetIds: readonly string[];
}

/** @lang zh-CN 不含正文的确定性计数摘要。 @lang en Deterministic body-free count summary. */
export interface BusinessFlowProductionSummary {
  actorNodes: number;
  artifactNodes: number;
  codeBindings: number;
  controlNodes: number;
  controlRelations: number;
  dataRelations: number;
  evidence: number;
  flows: number;
  responsibilityRelations: number;
}

/**
 * @lang zh-CN
 * Pure producer 结果；refused 结果没有 canonical payload，避免无效事实被下游误用。
 *
 * @lang en
 * Pure producer result; a refused result has no canonical payload, preventing downstream use of invalid facts.
 */
export interface BusinessFlowProductionResult {
  canonical?: BusinessFlowDocumentation;
  canonicalJson?: string;
  diagnostics: HiaDiagnostic[];
  status: "ready" | "refused";
  summary?: BusinessFlowProductionSummary;
}

// <lang><zh-CN>共享 schema fragment 保持 owner schema 与分发 snapshot 的单一事实源。</zh-CN><en>Shared schema fragments keep the owner schema and distributed snapshot on one source of truth.</en></lang>
const identitySchema = { type: "string", pattern: "^[a-z][a-z0-9._-]{0,127}$" } as const;
const localeSchema = { type: "string", pattern: "^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$" } as const;
const labelsSchema = {
  type: "object",
  minProperties: 1,
  maxProperties: 64,
  propertyNames: localeSchema,
  additionalProperties: { type: "string", minLength: 1, maxLength: 4096 }
} as const;

/**
 * @lang zh-CN
 * Draft 2020-12 结构 schema；图不变量、引用、排序和隐私联动仍由 owner runtime validator 负责。
 *
 * @lang en
 * Draft 2020-12 structural schema; graph invariants, references, ordering, and privacy coupling remain owner-runtime responsibilities.
 */
export const BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: BUSINESS_FLOW_DOCUMENTATION_SCHEMA_ID,
  title: "Business Flow Documentation",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "flows", "nodes", "relations", "evidence", "codeBindings", "diagnostics", "privacy", "compatibility"],
  properties: {
    contract: { const: BUSINESS_FLOW_DOCUMENTATION_CONTRACT },
    contractVersion: { const: BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION },
    flows: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/flow" } },
    nodes: { type: "array", minItems: 1, maxItems: 10000, items: { $ref: "#/$defs/node" } },
    relations: { type: "array", maxItems: 50000, items: { $ref: "#/$defs/relation" } },
    evidence: { type: "array", maxItems: 10000, items: { $ref: "#/$defs/evidence" } },
    codeBindings: { type: "array", maxItems: 10000, items: { $ref: "#/$defs/codeBinding" } },
    diagnostics: { type: "array", maxItems: 128, items: { $ref: "#/$defs/diagnostic" } },
    privacy: { $ref: "#/$defs/privacy" },
    compatibility: { $ref: "#/$defs/compatibility" }
  },
  $defs: {
    labels: labelsSchema,
    provenance: {
      type: "object",
      additionalProperties: false,
      required: ["origin", "evidenceRefs"],
      properties: {
        origin: { enum: BUSINESS_FLOW_AUTHORSHIP_VALUES },
        evidenceRefs: { type: "array", maxItems: 256, uniqueItems: true, items: identitySchema }
      }
    },
    quality: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance"],
      properties: {
        resolution: { enum: BUSINESS_FLOW_RESOLUTION_VALUES },
        confidence: { enum: BUSINESS_FLOW_CONFIDENCE_VALUES },
        provenance: { $ref: "#/$defs/provenance" }
      }
    },
    flow: {
      type: "object",
      additionalProperties: false,
      required: ["id", "defaultLocale", "privacyClass", "labels", "entryNodeId", "endNodeIds"],
      properties: {
        id: identitySchema,
        defaultLocale: localeSchema,
        privacyClass: { enum: BUSINESS_FLOW_PRIVACY_CLASSES, default: "internal" },
        labels: { $ref: "#/$defs/labels" },
        entryNodeId: identitySchema,
        endNodeIds: { type: "array", minItems: 1, maxItems: 256, uniqueItems: true, items: identitySchema }
      }
    },
    node: {
      type: "object",
      additionalProperties: false,
      required: ["id", "flowId", "kind", "privacyClass", "labels", "authorship"],
      properties: {
        id: identitySchema,
        flowId: identitySchema,
        kind: { enum: BUSINESS_FLOW_NODE_KINDS },
        privacyClass: { enum: BUSINESS_FLOW_PRIVACY_CLASSES },
        labels: { $ref: "#/$defs/labels" },
        authorship: { enum: BUSINESS_FLOW_AUTHORSHIP_VALUES },
        actorKind: { enum: BUSINESS_FLOW_ACTOR_KINDS },
        artifactKind: { enum: BUSINESS_FLOW_ARTIFACT_KINDS },
        outcome: { enum: BUSINESS_FLOW_END_OUTCOMES }
      },
      allOf: [
        { if: { properties: { kind: { const: "actor" } } }, then: { required: ["actorKind"] } },
        { if: { properties: { kind: { const: "artifact" } } }, then: { required: ["artifactKind"] } },
        { if: { properties: { kind: { const: "end" } } }, then: { required: ["outcome"] } }
      ]
    },
    relation: {
      type: "object",
      additionalProperties: false,
      required: ["id", "flowId", "family", "kind", "from", "to", "authorship"],
      properties: {
        id: identitySchema,
        flowId: identitySchema,
        family: { enum: BUSINESS_FLOW_RELATION_FAMILIES },
        kind: { enum: BUSINESS_FLOW_RELATION_KINDS },
        from: identitySchema,
        to: identitySchema,
        order: { type: "integer", minimum: 0, maximum: 10000 },
        caseKey: identitySchema,
        authorship: { enum: BUSINESS_FLOW_AUTHORSHIP_VALUES },
        quality: { $ref: "#/$defs/quality" }
      },
      allOf: [
        { if: { properties: { family: { const: "control" } } }, then: { required: ["order", "quality"] } },
        { if: { properties: { kind: { enum: ["branch", "exception"] } } }, then: { required: ["caseKey"] } }
      ]
    },
    evidence: {
      type: "object",
      additionalProperties: false,
      required: ["id", "kind", "privacyClass", "locatorKind", "locator", "bodyIncluded"],
      properties: {
        id: identitySchema,
        kind: identitySchema,
        privacyClass: { enum: BUSINESS_FLOW_PRIVACY_CLASSES },
        locatorKind: { const: "logical-id" },
        locator: identitySchema,
        bodyIncluded: { const: false }
      }
    },
    codeBinding: {
      type: "object",
      additionalProperties: false,
      required: ["id", "flowId", "businessNodeId", "targetKind", "targetId", "authorship", "quality"],
      properties: {
        id: identitySchema,
        flowId: identitySchema,
        businessNodeId: identitySchema,
        targetKind: { const: "doc-entry" },
        targetId: identitySchema,
        authorship: { const: "producer-resolved" },
        quality: { $ref: "#/$defs/quality" }
      }
    },
    diagnostic: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message", "severity"],
      properties: {
        code: { enum: BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES },
        message: { type: "string", minLength: 1, maxLength: 4096 },
        severity: { enum: ["info", "warning", "error"] },
        path: { type: "string", minLength: 1, maxLength: 512 },
        targetPath: { type: "string", minLength: 1, maxLength: 512 }
      }
    },
    privacy: {
      type: "object",
      additionalProperties: false,
      required: ["sourceBodyIncluded", "sourceRangeIncluded", "absolutePathIncluded", "runtimePayloadIncluded", "personalIdentityIncluded", "credentialIncluded", "targetIdentityIncluded"],
      properties: {
        sourceBodyIncluded: { const: false },
        sourceRangeIncluded: { const: false },
        absolutePathIncluded: { const: false },
        runtimePayloadIncluded: { const: false },
        personalIdentityIncluded: { const: false },
        credentialIncluded: { const: false },
        targetIdentityIncluded: { const: false }
      }
    },
    compatibility: {
      type: "object",
      additionalProperties: false,
      required: ["versionMatch", "unknownProperties", "unknownKindPolicy", "migrationPolicy"],
      properties: {
        versionMatch: { const: "exact" },
        unknownProperties: { const: "reject" },
        unknownKindPolicy: { const: "reject" },
        migrationPolicy: { const: "explicit-pure-identity-preserving" }
      }
    }
  }
} as const;

const topLevelKeys = ["codeBindings", "compatibility", "contract", "contractVersion", "diagnostics", "evidence", "flows", "nodes", "privacy", "relations"] as const;
const flowKeys = ["defaultLocale", "endNodeIds", "entryNodeId", "id", "labels", "privacyClass"] as const;
const nodeKeys = ["actorKind", "artifactKind", "authorship", "flowId", "id", "kind", "labels", "outcome", "privacyClass"] as const;
const relationKeys = ["authorship", "caseKey", "family", "flowId", "from", "id", "kind", "order", "quality", "to"] as const;
const evidenceKeys = ["bodyIncluded", "id", "kind", "locator", "locatorKind", "privacyClass"] as const;
const bindingKeys = ["authorship", "businessNodeId", "flowId", "id", "quality", "targetId", "targetKind"] as const;
const qualityKeys = ["confidence", "provenance", "resolution"] as const;
const provenanceKeys = ["evidenceRefs", "origin"] as const;
const privacyKeys = ["absolutePathIncluded", "credentialIncluded", "personalIdentityIncluded", "runtimePayloadIncluded", "sourceBodyIncluded", "sourceRangeIncluded", "targetIdentityIncluded"] as const;
const compatibilityKeys = ["migrationPolicy", "unknownKindPolicy", "unknownProperties", "versionMatch"] as const;
const diagnosticKeys = ["code", "message", "path", "severity", "targetPath"] as const;
const stableIdentityPattern = /^[a-z][a-z0-9._-]{0,127}$/u;
const localePattern = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u;
const forbiddenFieldNames = new Set(["absolutePath", "credential", "password", "personalIdentity", "runtimePayload", "secret", "sourceBody", "sourceRange", "token"]);

/**
 * @lang zh-CN
 * 校验 closed-world shape、业务图不变量、质量三维、作者边界与隐私事实；不读取外部 code target registry。
 *
 * @lang en
 * Validates closed-world shape, business-graph invariants, quality dimensions, authorship, and privacy facts; it reads no external code-target registry.
 *
 * @param value <lang><zh-CN>未知 wire payload。</zh-CN><en>Unknown wire payload.</en></lang>
 * @returns 确定性 diagnostics；空数组表示 contract 与语义有效。 / Deterministic diagnostics; an empty array means contract and semantics are valid.
 */
export function validateBusinessFlowDocumentation(value: unknown): HiaDiagnostic[] {
  if (containsForbiddenField(value)) {
    return [businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "Business-flow documentation contains a prohibited private field.")];
  }
  if (!isExactRecord(value, topLevelKeys) || !hasRequiredKeys(value, topLevelKeys)) {
    return [businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Business-flow documentation must be a complete closed-world object.")];
  }

  // <lang><zh-CN>结构错误先阻止后续图遍历，避免对 malformed payload 推断业务事实。</zh-CN><en>Structural errors stop later graph traversal so malformed payload never drives business-fact inference.</en></lang>
  const structuralDiagnostics = validateStructuralShape(value);
  if (structuralDiagnostics.length > 0) return sortAndDeduplicateDiagnostics(structuralDiagnostics);

  const document = value as unknown as BusinessFlowDocumentation;
  const diagnostics: HiaDiagnostic[] = [];

  if (document.contract !== BUSINESS_FLOW_DOCUMENTATION_CONTRACT) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Business-flow contract identity must match exactly.", "contract"));
  }
  if (document.contractVersion !== BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION || !isCompatibility(document.compatibility)) {
    diagnostics.push(businessFlowDiagnostic("BFD_COMPATIBILITY_UNSUPPORTED", "Business-flow draft version and compatibility policy must match exactly.", "compatibility"));
  }
  if (!isPrivacy(document.privacy)) {
    diagnostics.push(businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "Business-flow privacy facts must fail closed.", "privacy"));
  }

  // <lang><zh-CN>稳定 map 只按 owner id join；label、数组位置、路径、范围或摘要绝不参与 identity。</zh-CN><en>Stable maps join only on owner ids; labels, array positions, paths, ranges, and digests never participate in identity.</en></lang>
  const flowById = new Map(document.flows.map((flow) => [flow.id, flow]));
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
  const evidenceById = new Map(document.evidence.map((item) => [item.id, item]));
  const itemIds = [
    ...document.flows.map(({ id }) => id),
    ...document.nodes.map(({ id }) => id),
    ...document.relations.map(({ id }) => id),
    ...document.evidence.map(({ id }) => id),
    ...document.codeBindings.map(({ id }) => id)
  ];
  if (new Set(itemIds).size !== itemIds.length) {
    diagnostics.push(businessFlowDiagnostic("BFD_DUPLICATE_ID", "Flow, node, relation, evidence, and binding identities must be globally unique."));
  }

  for (const flow of document.flows) validateFlow(flow, document, nodeById, diagnostics);
  for (const node of document.nodes) validateNode(node, flowById, diagnostics);
  for (const relation of document.relations) validateRelation(relation, flowById, nodeById, evidenceById, diagnostics);
  for (const evidence of document.evidence) validateEvidence(evidence, diagnostics);
  for (const binding of document.codeBindings) validateCodeBinding(binding, flowById, nodeById, evidenceById, diagnostics);
  for (const diagnostic of document.diagnostics) {
    if (!BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES.includes(diagnostic.code)) {
      diagnostics.push(businessFlowDiagnostic("BFD_COMPATIBILITY_UNSUPPORTED", "Embedded diagnostic code is outside the frozen set.", `diagnostics.${diagnostic.code}`));
    } else if (diagnostic.severity === "error") {
      // <lang><zh-CN>Canonical producer 不得把已知 error 事实包装成 ready；保留 owner code/message/path 供调用方审计。</zh-CN><en>The canonical producer must not wrap known error facts as ready; preserve the owner code/message/path for caller audit.</en></lang>
      diagnostics.push(createHiaDiagnostic(diagnostic.code, diagnostic.message, diagnostic.severity, diagnostic.path ? { path: diagnostic.path } : {}));
    }
  }

  // <lang><zh-CN>图级规则最后执行；它们只消费已经通过 shape 检查的引用字段。</zh-CN><en>Graph-level rules run last and consume only reference fields that passed shape checks.</en></lang>
  for (const flow of document.flows) validateControlGraph(flow, document, nodeById, diagnostics);
  validateResponsibilityCoverage(document, diagnostics);
  return sortAndDeduplicateDiagnostics(diagnostics);
}

/**
 * @lang zh-CN
 * 规范化并冻结已验证业务流程事实；只解析调用方 metadata registry 中的 code target，不执行、读取或推断代码。
 *
 * @lang en
 * Normalizes and freezes validated business-flow facts; it resolves only caller-supplied code-target metadata and never executes, reads, or infers code.
 *
 * @param value <lang><zh-CN>待生产的 wire payload。</zh-CN><en>Wire payload to produce.</en></lang>
 * @param options <lang><zh-CN>显式 code target identity registry。</zh-CN><en>Explicit code-target identity registry.</en></lang>
 * @returns ready canonical contract 或 fail-closed refused result。 / Ready canonical contract or fail-closed refused result.
 */
export function produceBusinessFlowDocumentation(value: unknown, options: BusinessFlowProductionOptions): BusinessFlowProductionResult {
  const diagnostics = validateBusinessFlowDocumentation(value);
  const registryProvided = Array.isArray(options?.availableCodeTargetIds);
  const availableTargets = registryProvided
    ? [...options.availableCodeTargetIds]
    : [];
  if (!registryProvided || !isIdentityArray(availableTargets, 10000, true)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Code-target registry must contain unique stable identities.", "options.availableCodeTargetIds"));
  }

  if (diagnostics.length === 0) {
    const document = value as BusinessFlowDocumentation;
    const targetIds = new Set(availableTargets);
    for (const binding of document.codeBindings) {
      const registryResolved = targetIds.has(binding.targetId);
      if ((binding.quality.resolution === "resolved") !== registryResolved) {
        diagnostics.push(businessFlowDiagnostic("BFD_CODE_BINDING_UNRESOLVED", "Code binding resolution disagrees with the caller-supplied metadata registry.", `codeBindings.${binding.id}`));
      }
    }
  }

  const stableDiagnostics = sortAndDeduplicateDiagnostics(diagnostics);
  if (stableDiagnostics.length > 0) {
    return deepFreeze({ diagnostics: stableDiagnostics, status: "refused" });
  }

  // <lang><zh-CN>canonical normalization 只排序非语义集合与 locale map；显式 control order 字段原样保留。</zh-CN><en>Canonical normalization sorts only non-semantic collections and locale maps; explicit control-order fields are preserved.</en></lang>
  const canonical = normalizeBusinessFlowDocumentation(value as BusinessFlowDocumentation);
  const canonicalJson = JSON.stringify(toStableJsonValue(canonical));
  const summary = createBusinessFlowSummary(canonical);
  return deepFreeze({ canonical, canonicalJson, diagnostics: [], status: "ready", summary });
}

/** @lang zh-CN 验证顶层及子对象基础 shape，不执行跨引用推断。 @lang en Validates top-level and child shapes without cross-reference inference. */
function validateStructuralShape(value: Record<string, unknown>): HiaDiagnostic[] {
  const diagnostics: HiaDiagnostic[] = [];
  if (!Array.isArray(value.flows) || value.flows.length === 0 || value.flows.length > 1000 || !value.flows.every(isFlowShape)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Flows must be a bounded array of closed-world flow definitions.", "flows"));
  }
  if (!Array.isArray(value.nodes) || value.nodes.length === 0 || value.nodes.length > 10000 || !value.nodes.every(isNodeShape)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Nodes must be a bounded array of closed-world node definitions.", "nodes"));
  }
  if (!Array.isArray(value.relations) || value.relations.length > 50000 || !value.relations.every(isRelationShape)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Relations must be a bounded array of closed-world relation definitions.", "relations"));
  }
  if (!Array.isArray(value.evidence) || value.evidence.length > 10000 || !value.evidence.every(isEvidenceShape)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Evidence must be bounded, logical-id-only metadata.", "evidence"));
  }
  if (!Array.isArray(value.codeBindings) || value.codeBindings.length > 10000 || !value.codeBindings.every(isCodeBindingShape)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Code bindings must be a bounded closed-world metadata array.", "codeBindings"));
  }
  if (!Array.isArray(value.diagnostics) || value.diagnostics.length > 128 || !value.diagnostics.every(isContractDiagnosticShape)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Embedded diagnostics must be public-safe closed-world entries.", "diagnostics"));
  }
  if (!isExactRecord(value.privacy, privacyKeys) || !hasRequiredKeys(value.privacy, privacyKeys)) {
    diagnostics.push(businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "Privacy facts must be a complete closed-world object.", "privacy"));
  }
  if (!isExactRecord(value.compatibility, compatibilityKeys) || !hasRequiredKeys(value.compatibility, compatibilityKeys)) {
    diagnostics.push(businessFlowDiagnostic("BFD_COMPATIBILITY_UNSUPPORTED", "Compatibility policy must be a complete closed-world object.", "compatibility"));
  }
  return diagnostics;
}

/** @lang zh-CN 验证一个 flow 的入口、终点、locale 与隐私关系。 @lang en Validates one flow's entry, ends, locale, and privacy relation. */
function validateFlow(flow: BusinessFlowDefinition, document: BusinessFlowDocumentation, nodeById: Map<string, BusinessFlowNode>, diagnostics: HiaDiagnostic[]): void {
  const flowNodes = document.nodes.filter((node) => node.flowId === flow.id);
  const starts = flowNodes.filter(({ kind }) => kind === "start");
  const ends = flowNodes.filter(({ kind }) => kind === "end");
  const entry = nodeById.get(flow.entryNodeId);
  const declaredEnds = flow.endNodeIds.map((id) => nodeById.get(id));
  if (starts.length !== 1 || entry?.kind !== "start" || entry.flowId !== flow.id
    || ends.length === 0 || declaredEnds.some((node) => node?.kind !== "end" || node.flowId !== flow.id)
    || new Set(flow.endNodeIds).size !== flow.endNodeIds.length
    || new Set(flow.endNodeIds).size !== ends.length || ends.some(({ id }) => !flow.endNodeIds.includes(id))) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_ENTRY_OR_END", "Each flow requires exactly one declared start and every in-flow end node.", `flows.${flow.id}`));
  }
  if (!(flow.defaultLocale in flow.labels)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Flow labels must include the declared default locale.", `flows.${flow.id}.labels`));
  }
  if (!BUSINESS_FLOW_PRIVACY_CLASSES.includes(flow.privacyClass)) {
    diagnostics.push(businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "Flow privacyClass is outside the closed set.", `flows.${flow.id}.privacyClass`));
  }
}

/** @lang zh-CN 验证节点 discriminator、作者、locale 与 privacy 不变量。 @lang en Validates node discriminators, authorship, locale, and privacy invariants. */
function validateNode(node: BusinessFlowNode, flowById: Map<string, BusinessFlowDefinition>, diagnostics: HiaDiagnostic[]): void {
  const flow = flowById.get(node.flowId);
  if (!flow) {
    diagnostics.push(businessFlowDiagnostic("BFD_UNKNOWN_REFERENCE", "Node flowId does not resolve.", `nodes.${node.id}.flowId`));
    return;
  }
  if (!BUSINESS_FLOW_NODE_KINDS.includes(node.kind)) {
    diagnostics.push(businessFlowDiagnostic("BFD_COMPATIBILITY_UNSUPPORTED", "Node kind is outside the P1 closed set.", `nodes.${node.id}.kind`));
    return;
  }
  const actorValid = node.kind === "actor" ? BUSINESS_FLOW_ACTOR_KINDS.includes(node.actorKind!) : node.actorKind === undefined;
  const artifactValid = node.kind === "artifact" ? BUSINESS_FLOW_ARTIFACT_KINDS.includes(node.artifactKind!) : node.artifactKind === undefined;
  const outcomeValid = node.kind === "end" ? BUSINESS_FLOW_END_OUTCOMES.includes(node.outcome!) : node.outcome === undefined;
  if (!actorValid || !artifactValid || !outcomeValid) {
    diagnostics.push(businessFlowDiagnostic("BFD_COMPATIBILITY_UNSUPPORTED", "Node discriminator-specific fields are invalid.", `nodes.${node.id}`));
  }
  if (node.authorship !== "author-provided") {
    diagnostics.push(businessFlowDiagnostic("BFD_AUTHORSHIP_BOUNDARY", "Business nodes must remain author-provided facts.", `nodes.${node.id}.authorship`));
  }
  if (!(flow.defaultLocale in node.labels)) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Node labels must include the flow default locale.", `nodes.${node.id}.labels`));
  }
  if (!BUSINESS_FLOW_PRIVACY_CLASSES.includes(node.privacyClass)) {
    diagnostics.push(businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "Node privacyClass is outside the closed set.", `nodes.${node.id}.privacyClass`));
  } else if (BUSINESS_FLOW_PRIVACY_CLASSES.includes(flow.privacyClass) && privacyRank(node.privacyClass) < privacyRank(flow.privacyClass)) {
    diagnostics.push(businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "A node cannot be less restrictive than its containing flow.", `nodes.${node.id}.privacyClass`));
  }
}

/** @lang zh-CN 验证 evidence 的 logical-only locator、隐私分类与 body-free 不变量。 @lang en Validates evidence logical-only locators, privacy class, and body-free invariant. */
function validateEvidence(evidence: BusinessFlowEvidence, diagnostics: HiaDiagnostic[]): void {
  if (evidence.locatorKind !== "logical-id" || evidence.bodyIncluded !== false) {
    diagnostics.push(businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "Evidence must remain logical-id-only metadata with no body.", `evidence.${evidence.id}`));
  }
  if (!BUSINESS_FLOW_PRIVACY_CLASSES.includes(evidence.privacyClass)) {
    diagnostics.push(businessFlowDiagnostic("BFD_PRIVACY_BOUNDARY", "Evidence privacyClass is outside the closed set.", `evidence.${evidence.id}.privacyClass`));
  }
}

/** @lang zh-CN 验证 relation family/kind、endpoint、质量与作者边界。 @lang en Validates relation family/kind, endpoints, quality, and authorship boundaries. */
function validateRelation(relation: BusinessFlowRelation, flowById: Map<string, BusinessFlowDefinition>, nodeById: Map<string, BusinessFlowNode>, evidenceById: Map<string, BusinessFlowEvidence>, diagnostics: HiaDiagnostic[]): void {
  const flow = flowById.get(relation.flowId);
  const from = nodeById.get(relation.from);
  const to = nodeById.get(relation.to);
  if (!flow || !from || !to || from.flowId !== relation.flowId || to.flowId !== relation.flowId) {
    diagnostics.push(businessFlowDiagnostic("BFD_UNKNOWN_REFERENCE", "Relation flow or endpoint reference does not resolve in one flow.", `relations.${relation.id}`));
    return;
  }
  if (!BUSINESS_FLOW_RELATION_FAMILIES.includes(relation.family) || !BUSINESS_FLOW_RELATION_KINDS.includes(relation.kind)
    || !relationKindMatchesFamily(relation.family, relation.kind)) {
    diagnostics.push(businessFlowDiagnostic("BFD_COMPATIBILITY_UNSUPPORTED", "Relation family and kind must match the P1 closed sets.", `relations.${relation.id}`));
    return;
  }
  if (relation.authorship !== "author-provided") {
    diagnostics.push(businessFlowDiagnostic("BFD_AUTHORSHIP_BOUNDARY", "Business relations must remain author-provided facts.", `relations.${relation.id}.authorship`));
  }
  if (relation.quality !== undefined) validateQuality(relation.quality, relation.authorship, evidenceById, `relations.${relation.id}.quality`, diagnostics);

  if (relation.family === "control") {
    if (!BUSINESS_FLOW_CONTROL_NODE_KINDS.includes(from.kind as typeof BUSINESS_FLOW_CONTROL_NODE_KINDS[number])
      || !BUSINESS_FLOW_CONTROL_NODE_KINDS.includes(to.kind as typeof BUSINESS_FLOW_CONTROL_NODE_KINDS[number])
      || !Number.isSafeInteger(relation.order) || relation.order! < 0 || !relation.quality) {
      diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Control relations require control endpoints, non-negative order, and quality facts.", `relations.${relation.id}`));
    }
  } else if (relation.order !== undefined || relation.caseKey !== undefined) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Only control relations may carry order or caseKey.", `relations.${relation.id}`));
  }

  if (relation.family === "responsibility" && (relation.kind !== "performed-by"
    || (from.kind !== "step" && from.kind !== "decision") || to.kind !== "actor")) {
    diagnostics.push(businessFlowDiagnostic("BFD_AUTHORSHIP_BOUNDARY", "performed-by must connect a step or decision to an actor role.", `relations.${relation.id}`));
  }
  if (relation.family === "data" && (from.kind !== "step" && from.kind !== "decision" || to.kind !== "artifact")) {
    diagnostics.push(businessFlowDiagnostic("BFD_INVALID_CONTRACT", "Data relations must connect a step or decision to an artifact type.", `relations.${relation.id}`));
  }
}

/** @lang zh-CN 验证 code binding 的作者、引用和三维质量。 @lang en Validates code-binding authorship, references, and quality dimensions. */
function validateCodeBinding(binding: BusinessFlowCodeBinding, flowById: Map<string, BusinessFlowDefinition>, nodeById: Map<string, BusinessFlowNode>, evidenceById: Map<string, BusinessFlowEvidence>, diagnostics: HiaDiagnostic[]): void {
  const node = nodeById.get(binding.businessNodeId);
  if (!flowById.has(binding.flowId) || !node || node.flowId !== binding.flowId || !BUSINESS_FLOW_CONTROL_NODE_KINDS.includes(node.kind as typeof BUSINESS_FLOW_CONTROL_NODE_KINDS[number])) {
    diagnostics.push(businessFlowDiagnostic("BFD_UNKNOWN_REFERENCE", "Code binding must reference an existing control node in the same flow.", `codeBindings.${binding.id}`));
  }
  if (binding.authorship !== "producer-resolved" || binding.targetKind !== "doc-entry") {
    diagnostics.push(businessFlowDiagnostic("BFD_AUTHORSHIP_BOUNDARY", "Code bindings are producer-resolved metadata and may target doc-entry only.", `codeBindings.${binding.id}`));
  }
  validateQuality(binding.quality, binding.authorship, evidenceById, `codeBindings.${binding.id}.quality`, diagnostics);
}

/** @lang zh-CN 验证 resolution/confidence/provenance 独立闭集及 evidence 引用。 @lang en Validates independent resolution/confidence/provenance closed sets and evidence references. */
function validateQuality(quality: BusinessFlowQuality, authorship: string, evidenceById: Map<string, BusinessFlowEvidence>, path: string, diagnostics: HiaDiagnostic[]): void {
  if (!BUSINESS_FLOW_RESOLUTION_VALUES.includes(quality.resolution)
    || !BUSINESS_FLOW_CONFIDENCE_VALUES.includes(quality.confidence)
    || !BUSINESS_FLOW_AUTHORSHIP_VALUES.includes(quality.provenance.origin)
    || !isUniqueIdentityArray(quality.provenance.evidenceRefs)) {
    diagnostics.push(businessFlowDiagnostic("BFD_QUALITY_DIMENSION_INVALID", "Resolution, confidence, and provenance must use independent closed values.", path));
    return;
  }
  if (quality.provenance.origin !== authorship) {
    diagnostics.push(businessFlowDiagnostic("BFD_AUTHORSHIP_BOUNDARY", "Fact authorship and provenance origin must agree.", path));
  }
  if (quality.provenance.evidenceRefs.some((id) => !evidenceById.has(id))) {
    diagnostics.push(businessFlowDiagnostic("BFD_UNKNOWN_REFERENCE", "Quality provenance references unknown evidence.", path));
  }
}

/** @lang zh-CN 验证单个 flow 的 reachability、acyclic、order、branch、merge 与 exception 规则。 @lang en Validates one flow's reachability, acyclicity, order, branch, merge, and exception rules. */
function validateControlGraph(flow: BusinessFlowDefinition, document: BusinessFlowDocumentation, nodeById: Map<string, BusinessFlowNode>, diagnostics: HiaDiagnostic[]): void {
  const controlNodes = document.nodes.filter((node) => node.flowId === flow.id && BUSINESS_FLOW_CONTROL_NODE_KINDS.includes(node.kind as typeof BUSINESS_FLOW_CONTROL_NODE_KINDS[number]));
  const controlRelations = document.relations.filter((relation) => relation.flowId === flow.id && relation.family === "control"
    && nodeById.has(relation.from) && nodeById.has(relation.to));
  const outgoing = groupRelations(controlRelations, "from");
  const incoming = groupRelations(controlRelations, "to");

  for (const node of controlNodes) {
    const nodeOutgoing = outgoing.get(node.id) ?? [];
    const nodeIncoming = incoming.get(node.id) ?? [];
    if (node.kind === "start" && nodeIncoming.length > 0 || node.kind === "end" && nodeOutgoing.length > 0) {
      diagnostics.push(businessFlowDiagnostic("BFD_INVALID_ENTRY_OR_END", "Start nodes have no incoming control relation and end nodes have no outgoing control relation.", `nodes.${node.id}`));
    }
    if (node.kind === "decision") validateDecision(node, nodeOutgoing, diagnostics);
    if (node.kind === "merge" && nodeIncoming.length < 2) {
      diagnostics.push(businessFlowDiagnostic("BFD_MERGE_INVARIANT", "Merge nodes require at least two incoming control relations.", `nodes.${node.id}`));
    }
    if (node.kind !== "merge" && nodeIncoming.length > 1) {
      diagnostics.push(businessFlowDiagnostic("BFD_MERGE_INVARIANT", "Multiple incoming control paths require an explicit merge node.", `nodes.${node.id}`));
    }
    validateOutgoingOrder(node, nodeOutgoing, diagnostics);
  }

  for (const relation of controlRelations) {
    const source = nodeById.get(relation.from)!;
    if (relation.kind === "branch" && source.kind !== "decision") {
      diagnostics.push(businessFlowDiagnostic("BFD_BRANCH_INVARIANT", "Branch relations must originate at a decision.", `relations.${relation.id}`));
    }
    if (relation.kind === "exception") {
      const normalOutgoing = (outgoing.get(relation.from) ?? []).filter(({ kind }) => kind !== "exception");
      if (source.kind !== "step" || !isIdentity(relation.caseKey) || normalOutgoing.length === 0) {
        diagnostics.push(businessFlowDiagnostic("BFD_EXCEPTION_INVARIANT", "Exception relations require a step source, stable caseKey, and normal outgoing path.", `relations.${relation.id}`));
      }
    }
  }

  const reachable = collectReachableNodeIds(flow.entryNodeId, outgoing);
  for (const node of controlNodes) {
    if (!reachable.has(node.id)) {
      diagnostics.push(businessFlowDiagnostic("BFD_UNREACHABLE_CONTROL_NODE", "Control node is unreachable from the declared entry.", `nodes.${node.id}`));
    }
  }
  if (hasControlCycle(controlNodes.map(({ id }) => id), outgoing)) {
    diagnostics.push(businessFlowDiagnostic("BFD_CONTROL_CYCLE_UNSUPPORTED", "P1 control graphs must be acyclic.", `flows.${flow.id}`));
  }
}

/** @lang zh-CN 验证 decision 的至少两个唯一 branch 与无混合 control kind。 @lang en Validates a decision's two-or-more unique branches and absence of mixed control kinds. */
function validateDecision(node: BusinessFlowNode, outgoing: BusinessFlowRelation[], diagnostics: HiaDiagnostic[]): void {
  const branches = outgoing.filter(({ kind }) => kind === "branch");
  const caseKeys = branches.map(({ caseKey }) => caseKey ?? "");
  if (branches.length < 2 || branches.length !== outgoing.length || !isUniqueIdentityArray(caseKeys)) {
    diagnostics.push(businessFlowDiagnostic("BFD_BRANCH_INVARIANT", "Decision nodes require at least two uniquely keyed branch relations and no mixed control kind.", `nodes.${node.id}`));
  }
}

/** @lang zh-CN 验证每个 source 的 control order 从 0 连续递增。 @lang en Validates contiguous zero-based control order per source. */
function validateOutgoingOrder(node: BusinessFlowNode, outgoing: BusinessFlowRelation[], diagnostics: HiaDiagnostic[]): void {
  const orders = outgoing.map(({ order }) => order).sort((left, right) => (left ?? -1) - (right ?? -1));
  if (orders.some((order, index) => order !== index)) {
    const code = node.kind === "decision" ? "BFD_BRANCH_INVARIANT"
      : outgoing.some(({ kind }) => kind === "exception") ? "BFD_EXCEPTION_INVARIANT"
        : "BFD_INVALID_CONTRACT";
    diagnostics.push(businessFlowDiagnostic(code, "Outgoing control order must be contiguous and start at zero.", `nodes.${node.id}`));
  }
}

/** @lang zh-CN 要求每个 step/decision 都显式关联 actor role。 @lang en Requires every step and decision to have an explicit actor-role relation. */
function validateResponsibilityCoverage(document: BusinessFlowDocumentation, diagnostics: HiaDiagnostic[]): void {
  const performedNodeIds = new Set(document.relations.filter(({ family, kind }) => family === "responsibility" && kind === "performed-by").map(({ from }) => from));
  for (const node of document.nodes) {
    if ((node.kind === "step" || node.kind === "decision") && !performedNodeIds.has(node.id)) {
      diagnostics.push(businessFlowDiagnostic("BFD_AUTHORSHIP_BOUNDARY", "Every step and decision requires an explicit performed-by role relation.", `nodes.${node.id}`));
    }
  }
}

/** @lang zh-CN 创建按 endpoint 分组且按 order/id 稳定排序的 control relation map。 @lang en Creates a control-relation map grouped by endpoint and stably sorted by order/id. */
function groupRelations(relations: BusinessFlowRelation[], endpoint: "from" | "to"): Map<string, BusinessFlowRelation[]> {
  const grouped = new Map<string, BusinessFlowRelation[]>();
  for (const relation of relations) {
    const key = relation[endpoint];
    const bucket = grouped.get(key) ?? [];
    bucket.push(relation);
    grouped.set(key, bucket);
  }
  for (const bucket of grouped.values()) bucket.sort(compareRelationsByNarrativeOrder);
  return grouped;
}

/** @lang zh-CN 从 entry 遍历显式 control edge，不使用数组位置。 @lang en Traverses explicit control edges from entry without using array position. */
function collectReachableNodeIds(entryNodeId: string, outgoing: Map<string, BusinessFlowRelation[]>): Set<string> {
  const reachable = new Set<string>();
  const pending = [entryNodeId];
  while (pending.length > 0) {
    const nodeId = pending.pop()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    for (const relation of outgoing.get(nodeId) ?? []) pending.push(relation.to);
  }
  return reachable;
}

/** @lang zh-CN 以三色 DFS 检测 P1 禁止的 control cycle。 @lang en Detects P1-forbidden control cycles with a three-color DFS. */
function hasControlCycle(nodeIds: string[], outgoing: Map<string, BusinessFlowRelation[]>): boolean {
  const state = new Map<string, "visiting" | "visited">();
  const visit = (nodeId: string): boolean => {
    if (state.get(nodeId) === "visiting") return true;
    if (state.get(nodeId) === "visited") return false;
    state.set(nodeId, "visiting");
    for (const relation of outgoing.get(nodeId) ?? []) {
      if (visit(relation.to)) return true;
    }
    state.set(nodeId, "visited");
    return false;
  };
  return nodeIds.some((nodeId) => visit(nodeId));
}

/** @lang zh-CN 规范化所有非语义集合与 locale/evidenceRef map。 @lang en Normalizes every non-semantic collection and locale/evidenceRef map. */
function normalizeBusinessFlowDocumentation(document: BusinessFlowDocumentation): BusinessFlowDocumentation {
  return {
    contract: BUSINESS_FLOW_DOCUMENTATION_CONTRACT,
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
    flows: [...document.flows].sort(compareById).map((flow) => ({
      ...structuredClone(flow),
      endNodeIds: [...flow.endNodeIds].sort(compareStrings),
      labels: sortStringMap(flow.labels)
    })),
    nodes: [...document.nodes].sort(compareById).map((node) => ({ ...structuredClone(node), labels: sortStringMap(node.labels) })),
    relations: [...document.relations].sort(compareById).map((relation) => normalizeRelation(relation)),
    evidence: [...document.evidence].sort(compareById).map((item) => structuredClone(item)),
    codeBindings: [...document.codeBindings].sort(compareById).map((binding) => ({
      ...structuredClone(binding),
      quality: normalizeQuality(binding.quality)
    })),
    diagnostics: [...document.diagnostics].sort(compareDiagnostics).map((diagnostic) => structuredClone(diagnostic)),
    privacy: structuredClone(document.privacy),
    compatibility: structuredClone(document.compatibility)
  };
}

/** @lang zh-CN 复制 relation 并稳定 evidenceRef。 @lang en Copies a relation and stabilizes evidence references. */
function normalizeRelation(relation: BusinessFlowRelation): BusinessFlowRelation {
  const normalized = structuredClone(relation);
  if (normalized.quality) normalized.quality = normalizeQuality(normalized.quality);
  return normalized;
}

/** @lang zh-CN 复制三维质量并排序 evidenceRef。 @lang en Copies quality dimensions and sorts evidence references. */
function normalizeQuality(quality: BusinessFlowQuality): BusinessFlowQuality {
  return {
    confidence: quality.confidence,
    provenance: { evidenceRefs: [...quality.provenance.evidenceRefs].sort(compareStrings), origin: quality.provenance.origin },
    resolution: quality.resolution
  };
}

/** @lang zh-CN 生成 public-safe count-only summary。 @lang en Builds a public-safe count-only summary. */
function createBusinessFlowSummary(document: BusinessFlowDocumentation): BusinessFlowProductionSummary {
  return {
    actorNodes: document.nodes.filter(({ kind }) => kind === "actor").length,
    artifactNodes: document.nodes.filter(({ kind }) => kind === "artifact").length,
    codeBindings: document.codeBindings.length,
    controlNodes: document.nodes.filter(({ kind }) => BUSINESS_FLOW_CONTROL_NODE_KINDS.includes(kind as typeof BUSINESS_FLOW_CONTROL_NODE_KINDS[number])).length,
    controlRelations: document.relations.filter(({ family }) => family === "control").length,
    dataRelations: document.relations.filter(({ family }) => family === "data").length,
    evidence: document.evidence.length,
    flows: document.flows.length,
    responsibilityRelations: document.relations.filter(({ family }) => family === "responsibility").length
  };
}

/** @lang zh-CN 将对象递归转换为 key-sorted JSON value。 @lang en Recursively converts an object into a key-sorted JSON value. */
function toStableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toStableJsonValue);
  if (!isRecord(value)) return value;
  const stable: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort(compareStrings)) stable[key] = toStableJsonValue(value[key]);
  return stable;
}

/** @lang zh-CN 深度冻结 producer-owned 输出，防止校验后漂移。 @lang en Deep-freezes producer-owned output to prevent post-validation drift. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

/** @lang zh-CN 基础 flow shape。 @lang en Basic flow shape. */
function isFlowShape(value: unknown): boolean {
  return isExactRecord(value, flowKeys) && hasRequiredKeys(value, flowKeys)
    && isIdentity(value.id) && isLocale(value.defaultLocale) && typeof value.privacyClass === "string"
    && isLabels(value.labels) && isIdentity(value.entryNodeId) && isIdentityArray(value.endNodeIds, 256, false);
}

/** @lang zh-CN 基础 node shape；闭集 value 由分类 diagnostic 单独报告。 @lang en Basic node shape; category diagnostics report closed-set values separately. */
function isNodeShape(value: unknown): boolean {
  return isExactRecord(value, nodeKeys) && hasRequiredKeys(value, ["authorship", "flowId", "id", "kind", "labels", "privacyClass"] as const)
    && isIdentity(value.id) && isIdentity(value.flowId) && typeof value.kind === "string" && typeof value.authorship === "string"
    && typeof value.privacyClass === "string" && isLabels(value.labels)
    && (value.actorKind === undefined || typeof value.actorKind === "string")
    && (value.artifactKind === undefined || typeof value.artifactKind === "string")
    && (value.outcome === undefined || typeof value.outcome === "string");
}

/** @lang zh-CN 基础 relation shape。 @lang en Basic relation shape. */
function isRelationShape(value: unknown): boolean {
  return isExactRecord(value, relationKeys) && hasRequiredKeys(value, ["authorship", "family", "flowId", "from", "id", "kind", "to"] as const)
    && isIdentity(value.id) && isIdentity(value.flowId) && isIdentity(value.from) && isIdentity(value.to)
    && typeof value.family === "string" && typeof value.kind === "string" && typeof value.authorship === "string"
    && (value.order === undefined || Number.isSafeInteger(value.order))
    && (value.caseKey === undefined || typeof value.caseKey === "string")
    && (value.quality === undefined || isQualityShape(value.quality));
}

/** @lang zh-CN 基础 metadata-only evidence shape。 @lang en Basic metadata-only evidence shape. */
function isEvidenceShape(value: unknown): boolean {
  return isExactRecord(value, evidenceKeys) && hasRequiredKeys(value, evidenceKeys)
    && isIdentity(value.id) && isIdentity(value.kind) && typeof value.privacyClass === "string"
    && value.locatorKind === "logical-id" && isIdentity(value.locator) && typeof value.bodyIncluded === "boolean";
}

/** @lang zh-CN 基础 code-binding shape。 @lang en Basic code-binding shape. */
function isCodeBindingShape(value: unknown): boolean {
  return isExactRecord(value, bindingKeys) && hasRequiredKeys(value, bindingKeys)
    && isIdentity(value.id) && isIdentity(value.flowId) && isIdentity(value.businessNodeId)
    && typeof value.targetKind === "string" && isIdentity(value.targetId) && typeof value.authorship === "string"
    && isQualityShape(value.quality);
}

/** @lang zh-CN 基础 quality/provenance shape。 @lang en Basic quality/provenance shape. */
function isQualityShape(value: unknown): boolean {
  return isExactRecord(value, qualityKeys) && hasRequiredKeys(value, qualityKeys)
    && typeof value.resolution === "string" && typeof value.confidence === "string"
    && isExactRecord(value.provenance, provenanceKeys) && hasRequiredKeys(value.provenance, provenanceKeys)
    && typeof value.provenance.origin === "string" && isIdentityArray(value.provenance.evidenceRefs, 256, true);
}

/** @lang zh-CN 基础 embedded diagnostic shape。 @lang en Basic embedded-diagnostic shape. */
function isContractDiagnosticShape(value: unknown): boolean {
  return isExactRecord(value, diagnosticKeys) && hasRequiredKeys(value, ["code", "message", "severity"] as const)
    && typeof value.code === "string" && typeof value.message === "string" && value.message.length > 0
    && (value.severity === "info" || value.severity === "warning" || value.severity === "error")
    && (value.path === undefined || typeof value.path === "string") && (value.targetPath === undefined || typeof value.targetPath === "string");
}

/** @lang zh-CN 验证 labels 的 locale tag 与非空正文。 @lang en Validates label locale tags and non-empty text. */
function isLabels(value: unknown): value is BusinessFlowLocalizedLabels {
  return isRecord(value) && Object.keys(value).length > 0 && Object.keys(value).length <= 64
    && Object.entries(value).every(([locale, label]) => isLocale(locale) && typeof label === "string" && label.length > 0 && label.length <= 4096);
}

/** @lang zh-CN 验证固定 privacy false facts。 @lang en Validates fixed false privacy facts. */
function isPrivacy(value: unknown): value is BusinessFlowPrivacy {
  return isExactRecord(value, privacyKeys) && hasRequiredKeys(value, privacyKeys) && privacyKeys.every((key) => value[key] === false);
}

/** @lang zh-CN 验证 exact/closed-world compatibility。 @lang en Validates exact, closed-world compatibility. */
function isCompatibility(value: unknown): value is BusinessFlowCompatibility {
  return isExactRecord(value, compatibilityKeys) && hasRequiredKeys(value, compatibilityKeys)
    && value.versionMatch === "exact" && value.unknownProperties === "reject" && value.unknownKindPolicy === "reject"
    && value.migrationPolicy === "explicit-pure-identity-preserving";
}

/** @lang zh-CN 验证 relation family 与 kind pairing。 @lang en Validates relation-family and kind pairing. */
function relationKindMatchesFamily(family: string, kind: string): boolean {
  if (family === "control") return kind === "sequence" || kind === "branch" || kind === "exception";
  if (family === "responsibility") return kind === "performed-by";
  return family === "data" && (kind === "reads" || kind === "writes" || kind === "emits");
}

/** @lang zh-CN 隐私等级越大越严格。 @lang en Higher privacy ranks are more restrictive. */
function privacyRank(value: BusinessFlowPrivacyClass): number {
  return { public: 0, internal: 1, restricted: 2 }[value] ?? -1;
}

/** @lang zh-CN 检测任何嵌套 private carrier field。 @lang en Detects any nested private-carrier field. */
function containsForbiddenField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => forbiddenFieldNames.has(key) || containsForbiddenField(child));
}

/** @lang zh-CN 创建不含文件位置的 stable diagnostic。 @lang en Creates a stable diagnostic with no filesystem location. */
function businessFlowDiagnostic(code: BusinessFlowDocumentationDiagnosticCode, message: string, path?: string): HiaDiagnostic {
  return createHiaDiagnostic(code, message, "error", path ? { path } : {});
}

/** @lang zh-CN 去重并按 code/path/message 稳定排序。 @lang en De-duplicates and stably sorts by code/path/message. */
function sortAndDeduplicateDiagnostics(diagnostics: HiaDiagnostic[]): HiaDiagnostic[] {
  const byKey = new Map<string, HiaDiagnostic>();
  for (const diagnostic of diagnostics) byKey.set(`${diagnostic.code}\u0000${diagnostic.path ?? ""}\u0000${diagnostic.message}`, diagnostic);
  return [...byKey.values()].sort(compareDiagnostics);
}

/** @lang zh-CN Diagnostic stable comparator。 @lang en Stable diagnostic comparator. */
function compareDiagnostics(left: Pick<HiaDiagnostic, "code" | "message" | "path">, right: Pick<HiaDiagnostic, "code" | "message" | "path">): number {
  return compareStrings(`${left.code}\u0000${left.path ?? ""}\u0000${left.message}`, `${right.code}\u0000${right.path ?? ""}\u0000${right.message}`);
}

/** @lang zh-CN Narrative relation comparator：order 优先，id 决胜。 @lang en Narrative relation comparator: order first, id as tie-breaker. */
function compareRelationsByNarrativeOrder(left: BusinessFlowRelation, right: BusinessFlowRelation): number {
  return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) || compareStrings(left.id, right.id);
}

/** @lang zh-CN Stable id comparator。 @lang en Stable id comparator. */
function compareById(left: { id: string }, right: { id: string }): number {
  return compareStrings(left.id, right.id);
}

/** @lang zh-CN Locale-independent ASCII-compatible string comparator。 @lang en Locale-independent ASCII-compatible string comparator. */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** @lang zh-CN 按 locale key 排序 string map。 @lang en Sorts a string map by locale key. */
function sortStringMap(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => compareStrings(left, right)));
}

/** @lang zh-CN 判断 stable identity。 @lang en Checks a stable identity. */
function isIdentity(value: unknown): value is string {
  return typeof value === "string" && stableIdentityPattern.test(value);
}

/** @lang zh-CN 判断 P1 locale tag grammar。 @lang en Checks the P1 locale-tag grammar. */
function isLocale(value: unknown): value is string {
  return typeof value === "string" && localePattern.test(value);
}

/** @lang zh-CN 判断有界 identity array，可选 unique。 @lang en Checks a bounded identity array with optional uniqueness. */
function isIdentityArray(value: unknown, maximum: number, unique: boolean): value is string[] {
  return Array.isArray(value) && value.length <= maximum && value.every(isIdentity) && (!unique || new Set(value).size === value.length);
}

/** @lang zh-CN 判断非空、唯一 stable identity array。 @lang en Checks a non-empty unique stable-identity array. */
function isUniqueIdentityArray(value: readonly string[]): boolean {
  return value.length > 0 && value.every(isIdentity) && new Set(value).size === value.length;
}

/** @lang zh-CN 判断非数组 plain record。 @lang en Checks a non-array plain record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @lang zh-CN 判断 record 只包含 allowlist key。 @lang en Checks that a record contains only allowlisted keys. */
function isExactRecord<const T extends readonly string[]>(value: unknown, keys: T): value is Record<T[number], unknown> {
  return isRecord(value) && Object.keys(value).every((key) => keys.includes(key as T[number]));
}

/** @lang zh-CN 判断 record 含有每个 required key。 @lang en Checks that a record contains every required key. */
function hasRequiredKeys<const T extends readonly string[]>(value: Record<string, unknown>, keys: T): boolean {
  return keys.every((key) => Object.hasOwn(value, key));
}
