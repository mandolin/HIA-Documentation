import {
  BUSINESS_FLOW_CONTROL_NODE_KINDS,
  BUSINESS_FLOW_DOCUMENTATION_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA,
  validateBusinessFlowDocumentation,
  type BusinessFlowCodeBinding,
  type BusinessFlowDefinition,
  type BusinessFlowDocumentation,
  type BusinessFlowEvidence,
  type BusinessFlowNode,
  type BusinessFlowNodeKind,
  type BusinessFlowQuality,
  type BusinessFlowRelation
} from "./business-flow-documentation.js";
import { createHiaDiagnostic } from "./diagnostics.js";
import type { HiaDiagnostic } from "./model.js";

/**
 * @lang zh-CN 业务流程双视图投影的中性 contract 名称；它不绑定 Portal、CLI、图数据库或 renderer。
 *
 * @lang en Neutral contract name for the dual-view business-flow projection; it binds no Portal, CLI, graph database, or renderer.
 */
export const BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT = "business-flow-documentation-projection" as const;

/**
 * @lang zh-CN P1 exact-match 草案版本。
 * @lang en Exact-match P1 draft version.
 */
export const BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN 公开 schema identity。
 * @lang en Public schema identity.
 */
export const BUSINESS_FLOW_DOCUMENTATION_PROJECTION_SCHEMA_ID =
  "https://mandolin.github.io/HIA-Documentation/schemas/business-flow-documentation-projection-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN 投影层的 stable diagnostic code；source 细节不会被复制进拒绝消息。
 *
 * @lang en Stable projection-layer diagnostic codes; refusal messages never copy source details.
 */
export const BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES = [
  "BFP_INVALID_CONTRACT",
  "BFP_INVALID_SOURCE",
  "BFP_INVALID_OPTIONS",
  "BFP_FLOW_NOT_FOUND",
  "BFP_PRIVACY_BOUNDARY",
  "BFP_PROJECTION_INVARIANT",
  "BFP_COMPATIBILITY_UNSUPPORTED"
] as const;

/**
 * @lang zh-CN 投影 diagnostic code 类型。
 * @lang en Projection diagnostic-code type.
 */
export type BusinessFlowDocumentationProjectionDiagnosticCode =
  typeof BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES[number];

/**
 * @lang zh-CN 调用方必须显式提供的 public 投影选项。
 * @lang en Explicit public projection options required from callers.
 */
export interface BusinessFlowDocumentationProjectionOptions {
  /**
   * @lang zh-CN 调用方必须显式指定的public受众。
   * @lang en Public audience that the caller must explicitly specify.
   */
  audience: "public";
  /**
   * @lang zh-CN 调用方显式选择的非空唯一流程标识集合。
   * @lang en Non-empty set of unique flow identifiers explicitly selected by the caller.
   */
  flowIds: readonly string[];
  /**
   * @lang zh-CN 调用方显式请求的展示语言标记。
   * @lang en Display-locale tag explicitly requested by the caller.
   */
  locale: string;
}

/**
 * @lang zh-CN 投影来源只记录稳定 contract 与 flow 引用。
 * @lang en Projection source records only stable contract and flow references.
 */
export interface BusinessFlowDocumentationProjectionSource {
  /**
   * @lang zh-CN 来源事实固定的business-flow-documentation契约名称。
   * @lang en Fixed business-flow-documentation contract name of the source facts.
   */
  contract: typeof BUSINESS_FLOW_DOCUMENTATION_CONTRACT;
  /**
   * @lang zh-CN 来源事实固定的0.1.0-draft精确版本。
   * @lang en Fixed exact 0.1.0-draft version of the source facts.
   */
  contractVersion: typeof BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION;
  /**
   * @lang zh-CN 按稳定标识排序的已选流程引用，与共享事实及两类视图逐一对应。
   * @lang en Selected flow references sorted by stable identifier, corresponding exactly to shared facts and both views.
   */
  flowRefs: string[];
}

/**
 * @lang zh-CN 两类视图共享的唯一事实集合；不复制 W-P119 diagnostic、privacy 或 compatibility 外壳。
 *
 * @lang en Single fact collection shared by both views; it does not duplicate the W-P119 diagnostic, privacy, or compatibility envelope.
 */
export interface BusinessFlowDocumentationProjectionSharedFacts {
  /**
   * @lang zh-CN 所有已选流程共享的代码绑定事实，按稳定标识排序。
   * @lang en Shared code-binding facts for all selected flows, sorted by stable identifier.
   */
  codeBindings: BusinessFlowCodeBinding[];
  /**
   * @lang zh-CN 已选关系及绑定的质量来源引用到的公开证据元数据。
   * @lang en Public evidence metadata referenced by quality provenance of selected relations and bindings.
   */
  evidence: BusinessFlowEvidence[];
  /**
   * @lang zh-CN 两类视图共同引用的已选公开流程定义。
   * @lang en Selected public flow definitions referenced by both views.
   */
  flows: BusinessFlowDefinition[];
  /**
   * @lang zh-CN 已选流程的全部公开节点，包含控制、角色与工件节点。
   * @lang en All public nodes of selected flows, including control, role and artifact nodes.
   */
  nodes: BusinessFlowNode[];
  /**
   * @lang zh-CN 已选流程全部有类型的关系，供两类视图按稳定标识解析。
   * @lang en All typed relations of selected flows, resolved by stable identifier in both views.
   */
  relations: BusinessFlowRelation[];
}

/**
 * @lang zh-CN 可审计的 locale 选择结果。
 * @lang en Auditable locale-selection result.
 */
export interface BusinessFlowProjectionLocaleResolution {
  /**
   * @lang zh-CN 调用方显式请求的语言标记，回退时仍保留原请求。
   * @lang en Locale tag explicitly requested by the caller, retained unchanged during fallback.
   */
  requestedLocale: string;
  /**
   * @lang zh-CN 实际标签采用的语言，精确请求存在时用请求语言，否则用流程默认语言。
   * @lang en Locale used by the actual label, using an exact requested label when available and otherwise the flow default.
   */
  resolvedLocale: string;
  /**
   * @lang zh-CN requested-exact记录精确命中，flow-default记录仅向流程默认语言回退。
   * @lang en requested-exact records an exact match, while flow-default records fallback solely to the flow default.
   */
  strategy: "requested-exact" | "flow-default";
}

/**
 * @lang zh-CN 人读线性项只增加顺序和引用，不成为新的业务节点 identity。
 *
 * @lang en A human-linear item adds ordering and references only; it never becomes a new business-node identity.
 */
export interface BusinessFlowHumanLinearItem {
  /**
   * @lang zh-CN 本控制节点经责任关系指向的角色节点引用，按标识排序。
   * @lang en Actor-node references reached through responsibility relations from this control node, sorted by identifier.
   */
  actorNodeRefs: string[];
  /**
   * @lang zh-CN 本控制节点经数据关系指向的工件类型节点引用，按标识排序。
   * @lang en Artifact-type node references reached through data relations from this control node, sorted by identifier.
   */
  artifactNodeRefs: string[];
  /**
   * @lang zh-CN 绑定本控制节点的代码绑定引用，按标识排序。
   * @lang en References to code bindings attached to this control node, sorted by identifier.
   */
  codeBindingRefs: string[];
  /**
   * @lang zh-CN 从本控制节点发出的数据关系引用，按标识排序。
   * @lang en References to data relations originating at this control node, sorted by identifier.
   */
  dataRelationRefs: string[];
  /**
   * @lang zh-CN 本节点出站控制关系及代码绑定质量来源中的去重证据引用，按标识排序。
   * @lang en Unique evidence references from quality provenance of this node's outgoing control relations and code bindings, sorted by identifier.
   */
  evidenceRefs: string[];
  /**
   * @lang zh-CN 按localeResolution选出的节点标签。
   * @lang en Node label selected according to localeResolution.
   */
  label: string;
  /**
   * @lang zh-CN 此节点标签的精确命中或流程默认语言回退记录。
   * @lang en Exact-match or flow-default fallback record for this node's label.
   */
  localeResolution: BusinessFlowProjectionLocaleResolution;
  /**
   * @lang zh-CN 被引用控制节点的类别，仅产生start、step、decision、merge或end。
   * @lang en Kind of the referenced control node, emitted only as start, step, decision, merge or end.
   */
  nodeKind: BusinessFlowNodeKind;
  /**
   * @lang zh-CN 共享事实中本项所指控制节点的稳定标识。
   * @lang en Stable identifier of the control node referenced by this item in shared facts.
   */
  nodeRef: string;
  /**
   * @lang zh-CN 按order及关系标识排列的出站控制关系引用。
   * @lang en Outgoing control-relation references ordered by order and relation identifier.
   */
  outgoingRelationRefs: string[];
  /**
   * @lang zh-CN 本流程首次访问深度优先叙事中的零基位置。
   * @lang en Zero-based position in this flow's first-visit depth-first narrative.
   */
  position: number;
  /**
   * @lang zh-CN 从本控制节点发出的责任关系引用，按标识排序。
   * @lang en References to responsibility relations originating at this control node, sorted by identifier.
   */
  responsibilityRelationRefs: string[];
}

/**
 * @lang zh-CN 单个流程的确定性人读线性视图。
 * @lang en Deterministic human-linear view for one flow.
 */
export interface BusinessFlowHumanLinearFlow {
  /**
   * @lang zh-CN 共享流程声明的全部终点引用，按稳定标识排序。
   * @lang en All end-node references declared by the shared flow, sorted by stable identifier.
   */
  endNodeRefs: string[];
  /**
   * @lang zh-CN 共享流程声明的唯一入口节点引用。
   * @lang en Unique entry-node reference declared by the shared flow.
   */
  entryNodeRef: string;
  /**
   * @lang zh-CN 本线性视图在共享事实中对应的稳定流程标识。
   * @lang en Stable flow identifier corresponding to this linear view in shared facts.
   */
  flowRef: string;
  /**
   * @lang zh-CN 从入口按控制关系叙事顺序深度优先遍历的控制节点项，汇合节点仅首次出现。
   * @lang en Control-node items visited depth-first from the entry in control-relation narrative order, with each merge appearing only on first visit.
   */
  items: BusinessFlowHumanLinearItem[];
  /**
   * @lang zh-CN 按localeResolution选出的流程标签。
   * @lang en Flow label selected according to localeResolution.
   */
  label: string;
  /**
   * @lang zh-CN 此流程标签的精确命中或默认语言回退记录。
   * @lang en Exact-match or default-locale fallback record for this flow's label.
   */
  localeResolution: BusinessFlowProjectionLocaleResolution;
}

/**
 * @lang zh-CN 所有已选择流程的人读视图。
 * @lang en Human view for every selected flow.
 */
export interface BusinessFlowHumanLinearProjection {
  /**
   * @lang zh-CN 所有已选流程的人读线性视图，顺序与规范共享流程一致。
   * @lang en Human-linear views of all selected flows, ordered consistently with canonical shared flows.
   */
  flows: BusinessFlowHumanLinearFlow[];
}

/**
 * @lang zh-CN AI graph-ready 入口只携带 stable ref；节点与边的 typed 事实始终从 sharedFacts 解析。
 *
 * @lang en An AI graph-ready entry carries stable refs only; typed node and edge facts always resolve through sharedFacts.
 */
export interface BusinessFlowAiGraphEntry {
  /**
   * @lang zh-CN 本流程代码绑定的稳定引用，按标识排序。
   * @lang en Stable references to this flow's code bindings, sorted by identifier.
   */
  codeBindingRefs: string[];
  /**
   * @lang zh-CN 本流程全部控制、责任与数据关系的稳定引用，按标识排序。
   * @lang en Stable references to all control, responsibility and data relations in this flow, sorted by identifier.
   */
  edgeRefs: string[];
  /**
   * @lang zh-CN 本流程关系及绑定质量来源中的去重证据引用，按标识排序。
   * @lang en Unique evidence references from quality provenance of this flow's relations and bindings, sorted by identifier.
   */
  evidenceRefs: string[];
  /**
   * @lang zh-CN 本图索引在共享事实中对应的稳定流程标识。
   * @lang en Stable flow identifier corresponding to this graph index in shared facts.
   */
  flowRef: string;
  /**
   * @lang zh-CN 本流程全部控制、角色和工件节点的稳定引用，按标识排序。
   * @lang en Stable references to all control, role and artifact nodes in this flow, sorted by identifier.
   */
  nodeRefs: string[];
}

/**
 * @lang zh-CN 所有已选择流程的 AI graph-ready 索引。
 * @lang en AI graph-ready index for every selected flow.
 */
export interface BusinessFlowAiGraphProjection {
  /**
   * @lang zh-CN 所有已选流程的图索引，类型化事实均通过共享集合解析。
   * @lang en Graph indexes for all selected flows, with typed facts resolved through shared collections.
   */
  graphs: BusinessFlowAiGraphEntry[];
}

/**
 * @lang zh-CN 投影层额外关闭拓扑与 AI 隐藏内容泄漏。
 * @lang en Projection privacy additionally closes topology and hidden-AI leakage.
 */
export interface BusinessFlowDocumentationProjectionPrivacy {
  /**
   * @lang zh-CN 固定为false，关闭绝对文件路径载体。
   * @lang en Fixed to false, excluding absolute filesystem path carriers.
   */
  absolutePathIncluded: false;
  /**
   * @lang zh-CN 固定为false，关闭凭据载体。
   * @lang en Fixed to false, excluding credential carriers.
   */
  credentialIncluded: false;
  /**
   * @lang zh-CN 固定为false，AI视图仅可引用人读受众获准的共享内容。
   * @lang en Fixed to false, limiting the AI view to shared content authorized for the human audience.
   */
  hiddenAiContentIncluded: false;
  /**
   * @lang zh-CN 固定为false，任一选中事实非公开时整次拒绝投影。
   * @lang en Fixed to false, refusing the entire projection when any selected fact is non-public.
   */
  nonPublicTopologyIncluded: false;
  /**
   * @lang zh-CN 固定为false，关闭个人身份载体。
   * @lang en Fixed to false, excluding personal-identity carriers.
   */
  personalIdentityIncluded: false;
  /**
   * @lang zh-CN 固定为false，关闭运行时载荷载体。
   * @lang en Fixed to false, excluding runtime-payload carriers.
   */
  runtimePayloadIncluded: false;
  /**
   * @lang zh-CN 固定为false，关闭源码正文载体。
   * @lang en Fixed to false, excluding source-body carriers.
   */
  sourceBodyIncluded: false;
  /**
   * @lang zh-CN 固定为false，关闭源码范围载体。
   * @lang en Fixed to false, excluding source-range carriers.
   */
  sourceRangeIncluded: false;
  /**
   * @lang zh-CN 固定为false，关闭真实业务目标身份载体。
   * @lang en Fixed to false, excluding real business-target identity carriers.
   */
  targetIdentityIncluded: false;
}

/**
 * @lang zh-CN 投影 exact draft 与 closed-world compatibility。
 * @lang en Exact-draft and closed-world projection compatibility.
 */
export interface BusinessFlowDocumentationProjectionCompatibility {
  /**
   * @lang zh-CN 固定为explicit-pure-identity-preserving，迁移须显式、纯函数且保留稳定身份。
   * @lang en Fixed to explicit-pure-identity-preserving, requiring explicit pure migration that preserves stable identities.
   */
  migrationPolicy: "explicit-pure-identity-preserving";
  /**
   * @lang zh-CN 固定为reject，拒绝未知类别。
   * @lang en Fixed to reject, rejecting unknown kinds.
   */
  unknownKindPolicy: "reject";
  /**
   * @lang zh-CN 固定为reject，拒绝未声明的属性。
   * @lang en Fixed to reject, rejecting undeclared properties.
   */
  unknownProperties: "reject";
  /**
   * @lang zh-CN 固定为exact，消费者须精确匹配契约版本。
   * @lang en Fixed to exact, requiring consumers to match the contract version exactly.
   */
  versionMatch: "exact";
}

/**
 * @lang zh-CN `business-flow-documentation-projection@0.1.0-draft` canonical wire payload。
 *
 * @lang en Canonical wire payload for `business-flow-documentation-projection@0.1.0-draft`.
 */
export interface BusinessFlowDocumentationProjection {
  /**
   * @lang zh-CN 通过稳定引用访问共享类型化事实的图索引。
   * @lang en Graph index accessing shared typed facts through stable references.
   */
  aiGraph: BusinessFlowAiGraphProjection;
  /**
   * @lang zh-CN 固定为public的投影受众。
   * @lang en Projection audience fixed to public.
   */
  audience: "public";
  /**
   * @lang zh-CN 投影精确版本匹配、未知输入拒绝及显式迁移策略。
   * @lang en Projection policies for exact version matching, rejection of unknown input and explicit migration.
   */
  compatibility: BusinessFlowDocumentationProjectionCompatibility;
  /**
   * @lang zh-CN 固定的business-flow-documentation-projection契约名称。
   * @lang en Fixed business-flow-documentation-projection contract name.
   */
  contract: typeof BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT;
  /**
   * @lang zh-CN 固定的0.1.0-draft投影契约版本。
   * @lang en Fixed 0.1.0-draft projection-contract version.
   */
  contractVersion: typeof BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION;
  /**
   * @lang zh-CN 从各流程入口按首次访问深度优先顺序构建的人读视图。
   * @lang en Human-readable view constructed from each flow's entry in first-visit depth-first order.
   */
  humanLinear: BusinessFlowHumanLinearProjection;
  /**
   * @lang zh-CN 关闭敏感载体、非公开拓扑及AI隐藏内容的固定隐私标记。
   * @lang en Fixed privacy flags excluding sensitive carriers, non-public topology and hidden AI content.
   */
  privacy: BusinessFlowDocumentationProjectionPrivacy;
  /**
   * @lang zh-CN 此次投影显式请求的展示语言，具体标签解析另行记录。
   * @lang en Display locale explicitly requested for this projection, with individual label resolution recorded separately.
   */
  requestedLocale: string;
  /**
   * @lang zh-CN 两类视图共同引用的唯一规范事实集合。
   * @lang en Single canonical fact collection referenced by both views.
   */
  sharedFacts: BusinessFlowDocumentationProjectionSharedFacts;
  /**
   * @lang zh-CN 来源事实契约身份、精确版本及已选流程引用。
   * @lang en Source fact-contract identity, exact version and selected flow references.
   */
  source: BusinessFlowDocumentationProjectionSource;
}

/**
 * @lang zh-CN 不含正文和被拒绝拓扑的确定性计数摘要。
 * @lang en Deterministic count summary with no body or refused topology.
 */
export interface BusinessFlowDocumentationProjectionSummary {
  /**
   * @lang zh-CN 已选共享事实中全部类型化关系的数量。
   * @lang en Number of all typed relations in the selected shared facts.
   */
  aiEdges: number;
  /**
   * @lang zh-CN 已选共享事实中全部控制、角色及工件节点的数量。
   * @lang en Number of all control, role and artifact nodes in the selected shared facts.
   */
  aiNodes: number;
  /**
   * @lang zh-CN 已选共享事实中代码绑定的数量。
   * @lang en Number of code bindings in the selected shared facts.
   */
  codeBindings: number;
  /**
   * @lang zh-CN 已选关系及绑定实际引用的共享证据记录数。
   * @lang en Number of shared evidence records actually referenced by selected relations and bindings.
   */
  evidence: number;
  /**
   * @lang zh-CN 此次投影选择的公开流程数量。
   * @lang en Number of public flows selected for this projection.
   */
  flows: number;
  /**
   * @lang zh-CN 所有已选流程线性视图的控制节点项总数。
   * @lang en Total number of control-node items across all selected human-linear flow views.
   */
  humanItems: number;
}

/**
 * @lang zh-CN Pure producer 结果；任何失败都只返回 public-safe diagnostic，不返回 partial projection 或计数。
 *
 * @lang en Pure producer result; every failure returns public-safe diagnostics only, with no partial projection or counts.
 */
export interface BusinessFlowDocumentationProjectionResult {
  /**
   * @lang zh-CN 可公开的投影诊断，ready时为空，拒绝消息不复制来源细节。
   * @lang en Public-safe projection diagnostics, empty when ready, with refusal messages excluding copied source details.
   */
  diagnostics: HiaDiagnostic[];
  /**
   * @lang zh-CN 仅ready结果提供的深度冻结双视图及共享事实。
   * @lang en Deeply frozen dual views and shared facts provided only for a ready result.
   */
  projection?: BusinessFlowDocumentationProjection;
  /**
   * @lang zh-CN 仅ready结果提供的确定性投影JSON，无生成时间戳。
   * @lang en Deterministic projection JSON provided only for a ready result, without a generation timestamp.
   */
  projectionJson?: string;
  /**
   * @lang zh-CN ready表示整次公开投影可用，refused表示来源、选项、隐私或一致性检查未通过。
   * @lang en ready indicates an available whole public projection, while refused indicates failed source, option, privacy or consistency checks.
   */
  status: "ready" | "refused";
  /**
   * @lang zh-CN 仅ready结果提供的无正文计数摘要，拒绝时省略。
   * @lang en Body-free count summary provided only for a ready result and omitted on refusal.
   */
  summary?: BusinessFlowDocumentationProjectionSummary;
}

// <lang><zh-CN>复用 owner 结构 fragment，避免投影 schema 重新发明 W-P119 事实 shape。</zh-CN><en>Reuse owner structural fragments so the projection schema does not reinvent W-P119 fact shapes.</en></lang>
const sourceDefinitions = BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA.$defs;
const identitySchema = { type: "string", pattern: "^[a-z][a-z0-9._-]{0,127}$" } as const;
const localeSchema = { type: "string", pattern: "^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$" } as const;
const identityArraySchema = { type: "array", maxItems: 50000, uniqueItems: true, items: identitySchema } as const;

/**
 * @lang zh-CN Draft 2020-12 结构 schema；exact parity、DFS 顺序和整条 flow privacy 由 owner validator 执行。
 *
 * @lang en Draft 2020-12 structural schema; exact parity, DFS order, and whole-flow privacy are enforced by the owner validator.
 */
export const BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_SCHEMA_ID,
  title: "Business Flow Documentation Projection",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "audience", "requestedLocale", "source", "sharedFacts", "humanLinear", "aiGraph", "privacy", "compatibility"],
  properties: {
    contract: { const: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT },
    contractVersion: { const: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION },
    audience: { const: "public" },
    requestedLocale: localeSchema,
    source: { $ref: "#/$defs/source" },
    sharedFacts: { $ref: "#/$defs/sharedFacts" },
    humanLinear: { $ref: "#/$defs/humanLinear" },
    aiGraph: { $ref: "#/$defs/aiGraph" },
    privacy: { $ref: "#/$defs/projectionPrivacy" },
    compatibility: { $ref: "#/$defs/projectionCompatibility" }
  },
  $defs: {
    ...sourceDefinitions,
    source: {
      type: "object",
      additionalProperties: false,
      required: ["contract", "contractVersion", "flowRefs"],
      properties: {
        contract: { const: BUSINESS_FLOW_DOCUMENTATION_CONTRACT },
        contractVersion: { const: BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION },
        flowRefs: { type: "array", minItems: 1, maxItems: 1000, uniqueItems: true, items: identitySchema }
      }
    },
    sharedFacts: {
      type: "object",
      additionalProperties: false,
      required: ["flows", "nodes", "relations", "evidence", "codeBindings"],
      properties: {
        flows: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/flow" } },
        nodes: { type: "array", minItems: 1, maxItems: 10000, items: { $ref: "#/$defs/node" } },
        relations: { type: "array", maxItems: 50000, items: { $ref: "#/$defs/relation" } },
        evidence: { type: "array", maxItems: 10000, items: { $ref: "#/$defs/evidence" } },
        codeBindings: { type: "array", maxItems: 10000, items: { $ref: "#/$defs/codeBinding" } }
      }
    },
    localeResolution: {
      type: "object",
      additionalProperties: false,
      required: ["requestedLocale", "resolvedLocale", "strategy"],
      properties: {
        requestedLocale: localeSchema,
        resolvedLocale: localeSchema,
        strategy: { enum: ["requested-exact", "flow-default"] }
      }
    },
    humanItem: {
      type: "object",
      additionalProperties: false,
      required: ["position", "nodeRef", "nodeKind", "label", "localeResolution", "outgoingRelationRefs", "responsibilityRelationRefs", "dataRelationRefs", "actorNodeRefs", "artifactNodeRefs", "codeBindingRefs", "evidenceRefs"],
      properties: {
        position: { type: "integer", minimum: 0, maximum: 9999 },
        nodeRef: identitySchema,
        nodeKind: { enum: ["start", "step", "decision", "merge", "end"] },
        label: { type: "string", minLength: 1, maxLength: 4096 },
        localeResolution: { $ref: "#/$defs/localeResolution" },
        outgoingRelationRefs: identityArraySchema,
        responsibilityRelationRefs: identityArraySchema,
        dataRelationRefs: identityArraySchema,
        actorNodeRefs: identityArraySchema,
        artifactNodeRefs: identityArraySchema,
        codeBindingRefs: identityArraySchema,
        evidenceRefs: identityArraySchema
      }
    },
    humanFlow: {
      type: "object",
      additionalProperties: false,
      required: ["flowRef", "entryNodeRef", "endNodeRefs", "label", "localeResolution", "items"],
      properties: {
        flowRef: identitySchema,
        entryNodeRef: identitySchema,
        endNodeRefs: identityArraySchema,
        label: { type: "string", minLength: 1, maxLength: 4096 },
        localeResolution: { $ref: "#/$defs/localeResolution" },
        items: { type: "array", minItems: 1, maxItems: 10000, items: { $ref: "#/$defs/humanItem" } }
      }
    },
    humanLinear: {
      type: "object",
      additionalProperties: false,
      required: ["flows"],
      properties: { flows: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/humanFlow" } } }
    },
    aiGraphEntry: {
      type: "object",
      additionalProperties: false,
      required: ["flowRef", "nodeRefs", "edgeRefs", "evidenceRefs", "codeBindingRefs"],
      properties: {
        flowRef: identitySchema,
        nodeRefs: identityArraySchema,
        edgeRefs: identityArraySchema,
        evidenceRefs: identityArraySchema,
        codeBindingRefs: identityArraySchema
      }
    },
    aiGraph: {
      type: "object",
      additionalProperties: false,
      required: ["graphs"],
      properties: { graphs: { type: "array", minItems: 1, maxItems: 1000, items: { $ref: "#/$defs/aiGraphEntry" } } }
    },
    projectionPrivacy: {
      type: "object",
      additionalProperties: false,
      required: ["sourceBodyIncluded", "sourceRangeIncluded", "absolutePathIncluded", "runtimePayloadIncluded", "personalIdentityIncluded", "credentialIncluded", "targetIdentityIncluded", "nonPublicTopologyIncluded", "hiddenAiContentIncluded"],
      properties: {
        sourceBodyIncluded: { const: false },
        sourceRangeIncluded: { const: false },
        absolutePathIncluded: { const: false },
        runtimePayloadIncluded: { const: false },
        personalIdentityIncluded: { const: false },
        credentialIncluded: { const: false },
        targetIdentityIncluded: { const: false },
        nonPublicTopologyIncluded: { const: false },
        hiddenAiContentIncluded: { const: false }
      }
    },
    projectionCompatibility: {
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

const topLevelKeys = ["aiGraph", "audience", "compatibility", "contract", "contractVersion", "humanLinear", "privacy", "requestedLocale", "sharedFacts", "source"] as const;
const sourceKeys = ["contract", "contractVersion", "flowRefs"] as const;
const sharedFactsKeys = ["codeBindings", "evidence", "flows", "nodes", "relations"] as const;
const humanLinearKeys = ["flows"] as const;
const humanFlowKeys = ["endNodeRefs", "entryNodeRef", "flowRef", "items", "label", "localeResolution"] as const;
const humanItemKeys = ["actorNodeRefs", "artifactNodeRefs", "codeBindingRefs", "dataRelationRefs", "evidenceRefs", "label", "localeResolution", "nodeKind", "nodeRef", "outgoingRelationRefs", "position", "responsibilityRelationRefs"] as const;
const localeResolutionKeys = ["requestedLocale", "resolvedLocale", "strategy"] as const;
const aiGraphKeys = ["graphs"] as const;
const aiGraphEntryKeys = ["codeBindingRefs", "edgeRefs", "evidenceRefs", "flowRef", "nodeRefs"] as const;
const privacyKeys = ["absolutePathIncluded", "credentialIncluded", "hiddenAiContentIncluded", "nonPublicTopologyIncluded", "personalIdentityIncluded", "runtimePayloadIncluded", "sourceBodyIncluded", "sourceRangeIncluded", "targetIdentityIncluded"] as const;
const compatibilityKeys = ["migrationPolicy", "unknownKindPolicy", "unknownProperties", "versionMatch"] as const;
const stableIdentityPattern = /^[a-z][a-z0-9._-]{0,127}$/u;
const localePattern = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u;
const forbiddenFieldNames = new Set(["absolutePath", "credential", "password", "personalIdentity", "runtimePayload", "secret", "sourceBody", "sourceRange", "token"]);

/**
 * @lang zh-CN 从已验证 W-P119 facts 生成 public-only 双视图；函数不读取文件、网络、系统 locale 或目标项目。
 *
 * @lang en Produces a public-only dual view from validated W-P119 facts; the function reads no files, network, system locale, or target project.
 *
 * @param value <lang><zh-CN>候选业务流程事实。</zh-CN><en>Candidate business-flow facts.</en></lang>
 * @param options <lang><zh-CN>显式 public flow 与 locale 选择。</zh-CN><en>Explicit public-flow and locale selection.</en></lang>
 * @returns ready frozen projection，或不含 partial payload 的 refused 结果。 / Ready frozen projection or a refused result with no partial payload.
 */
export function produceBusinessFlowDocumentationProjection(
  value: unknown,
  options: BusinessFlowDocumentationProjectionOptions
): BusinessFlowDocumentationProjectionResult {
  // <lang><zh-CN>先验证来源，确保 malformed graph 不参与 selection 或 privacy 判断。</zh-CN><en>Validate the source first so a malformed graph never participates in selection or privacy decisions.</en></lang>
  if (validateBusinessFlowDocumentation(value).length > 0) {
    return refuse("BFP_INVALID_SOURCE", "Business-flow projection source must be a valid exact W-P119 contract.");
  }
  if (!isProjectionOptions(options)) {
    return refuse("BFP_INVALID_OPTIONS", "Business-flow projection options must explicitly select unique flows, a locale, and the public audience.");
  }

  const document = value as BusinessFlowDocumentation;
  const flowById = new Map(document.flows.map((flow) => [flow.id, flow]));
  const selectedFlowIds = [...options.flowIds].sort(compareStrings);
  if (selectedFlowIds.some((flowId) => !flowById.has(flowId))) {
    return refuse("BFP_FLOW_NOT_FOUND", "One or more requested public business flows do not exist.");
  }

  // <lang><zh-CN>选择后的关联集合只按 stable flow id join；数组位置和 label 均不参与 identity。</zh-CN><en>Selected related sets join only on stable flow ids; array positions and labels never participate in identity.</en></lang>
  const selectedFlowIdSet = new Set(selectedFlowIds);
  const flows = document.flows.filter(({ id }) => selectedFlowIdSet.has(id));
  const nodes = document.nodes.filter(({ flowId }) => selectedFlowIdSet.has(flowId));
  const relations = document.relations.filter(({ flowId }) => selectedFlowIdSet.has(flowId));
  const codeBindings = document.codeBindings.filter(({ flowId }) => selectedFlowIdSet.has(flowId));
  const referencedEvidenceIds = collectEvidenceRefs(relations, codeBindings);
  const evidence = document.evidence.filter(({ id }) => referencedEvidenceIds.has(id));

  // <lang><zh-CN>整次 fail-closed，避免过滤后仍由数量、占位或残边泄漏非公开拓扑。</zh-CN><en>Fail the whole request closed so filtering cannot leak non-public topology through counts, placeholders, or dangling edges.</en></lang>
  if (flows.some(({ privacyClass }) => privacyClass !== "public")
    || nodes.some(({ privacyClass }) => privacyClass !== "public")
    || evidence.some(({ privacyClass }) => privacyClass !== "public")) {
    return refuse("BFP_PRIVACY_BOUNDARY", "The requested business-flow projection is not wholly public.");
  }

  const sharedFacts = normalizeSharedFacts(flows, nodes, relations, evidence, codeBindings);
  const humanFlows = sharedFacts.flows.map((flow) => createHumanFlow(flow, sharedFacts, options.locale));
  const graphs = sharedFacts.flows.map((flow) => createAiGraph(flow, sharedFacts));
  const projection: BusinessFlowDocumentationProjection = {
    aiGraph: { graphs },
    audience: "public",
    compatibility: {
      migrationPolicy: "explicit-pure-identity-preserving",
      unknownKindPolicy: "reject",
      unknownProperties: "reject",
      versionMatch: "exact"
    },
    contract: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT,
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
    humanLinear: { flows: humanFlows },
    privacy: {
      absolutePathIncluded: false,
      credentialIncluded: false,
      hiddenAiContentIncluded: false,
      nonPublicTopologyIncluded: false,
      personalIdentityIncluded: false,
      runtimePayloadIncluded: false,
      sourceBodyIncluded: false,
      sourceRangeIncluded: false,
      targetIdentityIncluded: false
    },
    requestedLocale: options.locale,
    sharedFacts,
    source: {
      contract: BUSINESS_FLOW_DOCUMENTATION_CONTRACT,
      contractVersion: BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
      flowRefs: selectedFlowIds
    }
  };

  // <lang><zh-CN>producer 也消费公开 validator，防止实现漂移产出看似 ready 的不一致视图。</zh-CN><en>The producer consumes the public validator too, preventing implementation drift from emitting an inconsistent ready view.</en></lang>
  const diagnostics = validateBusinessFlowDocumentationProjection(projection);
  if (diagnostics.length > 0) return deepFreeze({ diagnostics, status: "refused" });

  const projectionJson = JSON.stringify(toStableJsonValue(projection));
  const summary: BusinessFlowDocumentationProjectionSummary = {
    aiEdges: sharedFacts.relations.length,
    aiNodes: sharedFacts.nodes.length,
    codeBindings: sharedFacts.codeBindings.length,
    evidence: sharedFacts.evidence.length,
    flows: sharedFacts.flows.length,
    humanItems: humanFlows.reduce((total, flow) => total + flow.items.length, 0)
  };
  return deepFreeze({ diagnostics: [], projection, projectionJson, status: "ready", summary });
}

/**
 * @lang zh-CN 校验 closed-world shape、来源子图、视图 exact parity、locale、privacy 与 compatibility；不执行 renderer 或引用目标。
 *
 * @lang en Validates closed-world shape, source subgraph, exact view parity, locale, privacy, and compatibility; it executes no renderer or target reference.
 *
 * @param value <lang><zh-CN>未知 projection payload。</zh-CN><en>Unknown projection payload.</en></lang>
 * @returns 确定性 diagnostics；空数组表示投影有效。 / Deterministic diagnostics; an empty array means the projection is valid.
 */
export function validateBusinessFlowDocumentationProjection(value: unknown): HiaDiagnostic[] {
  if (containsForbiddenField(value)) {
    return [projectionDiagnostic("BFP_PRIVACY_BOUNDARY", "Business-flow projection contains a prohibited private field.")];
  }
  if (!isProjectionShape(value)) {
    return [projectionDiagnostic("BFP_INVALID_CONTRACT", "Business-flow projection must be a complete closed-world object.")];
  }

  const projection = value as BusinessFlowDocumentationProjection;
  const diagnostics: HiaDiagnostic[] = [];
  if (projection.contract !== BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT) {
    diagnostics.push(projectionDiagnostic("BFP_INVALID_CONTRACT", "Business-flow projection contract identity must match exactly.", "contract"));
  }
  if (projection.contractVersion !== BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION
    || projection.compatibility.versionMatch !== "exact"
    || projection.compatibility.unknownProperties !== "reject"
    || projection.compatibility.unknownKindPolicy !== "reject"
    || projection.compatibility.migrationPolicy !== "explicit-pure-identity-preserving") {
    diagnostics.push(projectionDiagnostic("BFP_COMPATIBILITY_UNSUPPORTED", "Business-flow projection draft and compatibility policy must match exactly.", "compatibility"));
  }
  if (privacyKeys.some((key) => projection.privacy[key] !== false)) {
    diagnostics.push(projectionDiagnostic("BFP_PRIVACY_BOUNDARY", "Business-flow projection privacy facts must fail closed.", "privacy"));
  }

  // <lang><zh-CN>把 shared facts 重新包成 W-P119 contract，复用其图不变量而不是维护第二套规则。</zh-CN><en>Wrap shared facts back into the W-P119 contract and reuse its graph invariants rather than maintaining a second rule set.</en></lang>
  const sourceDocument = createSourceDocument(projection.sharedFacts);
  if (validateBusinessFlowDocumentation(sourceDocument).length > 0) {
    diagnostics.push(projectionDiagnostic("BFP_PROJECTION_INVARIANT", "Shared business-flow facts do not form a valid source subgraph.", "sharedFacts"));
  }
  if (projection.audience !== "public" || !isLocale(projection.requestedLocale)
    || projection.sharedFacts.flows.some(({ privacyClass }) => privacyClass !== "public")
    || projection.sharedFacts.nodes.some(({ privacyClass }) => privacyClass !== "public")
    || projection.sharedFacts.evidence.some(({ privacyClass }) => privacyClass !== "public")) {
    diagnostics.push(projectionDiagnostic("BFP_PRIVACY_BOUNDARY", "Projection audience, locale, and selected facts must remain public and explicit."));
  }

  if (!sameStrings(projection.source.flowRefs, projection.sharedFacts.flows.map(({ id }) => id))) {
    diagnostics.push(projectionDiagnostic("BFP_PROJECTION_INVARIANT", "Source flow references and shared flows must have exact identity parity.", "source.flowRefs"));
  }
  if (projection.source.contract !== BUSINESS_FLOW_DOCUMENTATION_CONTRACT
    || projection.source.contractVersion !== BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION) {
    diagnostics.push(projectionDiagnostic("BFP_PROJECTION_INVARIANT", "Projection source identity must reference the exact W-P119 contract.", "source"));
  }

  // <lang><zh-CN>逐 flow 重建规范视图并做 deep equality，覆盖顺序、引用、locale 和 merge 首次访问规则。</zh-CN><en>Rebuild each canonical view and compare deeply, covering order, refs, locale, and first-visit merge behavior.</en></lang>
  const expectedHuman = projection.sharedFacts.flows.map((flow) => createHumanFlow(flow, projection.sharedFacts, projection.requestedLocale));
  const expectedGraphs = projection.sharedFacts.flows.map((flow) => createAiGraph(flow, projection.sharedFacts));
  if (stableJson(projection.humanLinear.flows) !== stableJson(expectedHuman)
    || stableJson(projection.aiGraph.graphs) !== stableJson(expectedGraphs)) {
    diagnostics.push(projectionDiagnostic("BFP_PROJECTION_INVARIANT", "Human-linear and AI graph views must exactly reference the same shared facts.", "humanLinear"));
  }
  return sortDiagnostics(diagnostics);
}

/**
 * @lang zh-CN 规范化投影共享事实及三维 quality evidence 引用。
 * @lang en Normalizes projection shared facts and three-dimensional quality evidence refs.
 */
function normalizeSharedFacts(
  flows: BusinessFlowDefinition[],
  nodes: BusinessFlowNode[],
  relations: BusinessFlowRelation[],
  evidence: BusinessFlowEvidence[],
  codeBindings: BusinessFlowCodeBinding[]
): BusinessFlowDocumentationProjectionSharedFacts {
  return {
    codeBindings: [...codeBindings].sort(compareById).map((binding) => ({ ...structuredClone(binding), quality: normalizeQuality(binding.quality) })),
    evidence: [...evidence].sort(compareById).map((item) => structuredClone(item)),
    flows: [...flows].sort(compareById).map((flow) => ({
      ...structuredClone(flow),
      endNodeIds: [...flow.endNodeIds].sort(compareStrings),
      labels: sortStringMap(flow.labels)
    })),
    nodes: [...nodes].sort(compareById).map((node) => ({ ...structuredClone(node), labels: sortStringMap(node.labels) })),
    relations: [...relations].sort(compareById).map((relation) => {
      const normalized = structuredClone(relation);
      if (normalized.quality) normalized.quality = normalizeQuality(normalized.quality);
      return normalized;
    })
  };
}

/**
 * @lang zh-CN 生成一个 flow 的确定性 DFS 人读视图。
 * @lang en Creates the deterministic DFS human view for one flow.
 */
function createHumanFlow(
  flow: BusinessFlowDefinition,
  sharedFacts: BusinessFlowDocumentationProjectionSharedFacts,
  requestedLocale: string
): BusinessFlowHumanLinearFlow {
  const controlNodes = sharedFacts.nodes.filter(({ flowId, kind }) => flowId === flow.id && isControlNodeKind(kind));
  const nodeById = new Map(controlNodes.map((node) => [node.id, node]));
  const controlRelations = sharedFacts.relations.filter(({ flowId, family }) => flowId === flow.id && family === "control");
  const outgoing = groupRelationsByFrom(controlRelations, true);
  const orderedNodeIds = collectDepthFirstNodeIds(flow.entryNodeId, outgoing);
  const localeResolution = resolveLocale(flow.labels, flow.defaultLocale, requestedLocale);
  const items = orderedNodeIds.map((nodeId, position) => {
    const node = nodeById.get(nodeId)!;
    return createHumanItem(node, position, flow, sharedFacts, requestedLocale, outgoing);
  });
  return {
    endNodeRefs: [...flow.endNodeIds].sort(compareStrings),
    entryNodeRef: flow.entryNodeId,
    flowRef: flow.id,
    items,
    label: flow.labels[localeResolution.resolvedLocale]!,
    localeResolution
  };
}

/**
 * @lang zh-CN 生成单个线性节点的关系与 evidence 引用。
 * @lang en Creates relation and evidence refs for one linear node.
 */
function createHumanItem(
  node: BusinessFlowNode,
  position: number,
  flow: BusinessFlowDefinition,
  sharedFacts: BusinessFlowDocumentationProjectionSharedFacts,
  requestedLocale: string,
  outgoing: Map<string, BusinessFlowRelation[]>
): BusinessFlowHumanLinearItem {
  const responsibilityRelations = sharedFacts.relations
    .filter((relation) => relation.flowId === flow.id && relation.family === "responsibility" && relation.from === node.id)
    .sort(compareById);
  const dataRelations = sharedFacts.relations
    .filter((relation) => relation.flowId === flow.id && relation.family === "data" && relation.from === node.id)
    .sort(compareById);
  const codeBindings = sharedFacts.codeBindings
    .filter((binding) => binding.flowId === flow.id && binding.businessNodeId === node.id)
    .sort(compareById);
  const outgoingRelations = outgoing.get(node.id) ?? [];
  const evidenceRefs = [...new Set([
    ...outgoingRelations.flatMap((relation) => relation.quality?.provenance.evidenceRefs ?? []),
    ...codeBindings.flatMap((binding) => binding.quality.provenance.evidenceRefs)
  ])].sort(compareStrings);
  const localeResolution = resolveLocale(node.labels, flow.defaultLocale, requestedLocale);
  return {
    actorNodeRefs: responsibilityRelations.map(({ to }) => to).sort(compareStrings),
    artifactNodeRefs: dataRelations.map(({ to }) => to).sort(compareStrings),
    codeBindingRefs: codeBindings.map(({ id }) => id),
    dataRelationRefs: dataRelations.map(({ id }) => id),
    evidenceRefs,
    label: node.labels[localeResolution.resolvedLocale]!,
    localeResolution,
    nodeKind: node.kind,
    nodeRef: node.id,
    outgoingRelationRefs: outgoingRelations.map(({ id }) => id),
    position,
    responsibilityRelationRefs: responsibilityRelations.map(({ id }) => id)
  };
}

/**
 * @lang zh-CN 生成 AI graph-ready refs，不复制 typed facts。
 * @lang en Creates AI graph-ready refs without duplicating typed facts.
 */
function createAiGraph(
  flow: BusinessFlowDefinition,
  sharedFacts: BusinessFlowDocumentationProjectionSharedFacts
): BusinessFlowAiGraphEntry {
  return {
    codeBindingRefs: sharedFacts.codeBindings.filter(({ flowId }) => flowId === flow.id).map(({ id }) => id),
    edgeRefs: sharedFacts.relations.filter(({ flowId }) => flowId === flow.id).map(({ id }) => id),
    evidenceRefs: [...collectEvidenceRefs(
      sharedFacts.relations.filter(({ flowId }) => flowId === flow.id),
      sharedFacts.codeBindings.filter(({ flowId }) => flowId === flow.id)
    )].sort(compareStrings),
    flowRef: flow.id,
    nodeRefs: sharedFacts.nodes.filter(({ flowId }) => flowId === flow.id).map(({ id }) => id)
  };
}

/**
 * @lang zh-CN 从 quality provenance 聚合 evidence stable ref。
 * @lang en Aggregates stable evidence refs from quality provenance.
 */
function collectEvidenceRefs(relations: BusinessFlowRelation[], bindings: BusinessFlowCodeBinding[]): Set<string> {
  return new Set([
    ...relations.flatMap((relation) => relation.quality?.provenance.evidenceRefs ?? []),
    ...bindings.flatMap((binding) => binding.quality.provenance.evidenceRefs)
  ]);
}

/**
 * @lang zh-CN 按 `order`、relation id 建立 outgoing control map。
 * @lang en Builds an outgoing control map ordered by `order` then relation id.
 */
function groupRelationsByFrom(relations: BusinessFlowRelation[], narrative: boolean): Map<string, BusinessFlowRelation[]> {
  const grouped = new Map<string, BusinessFlowRelation[]>();
  for (const relation of relations) grouped.set(relation.from, [...(grouped.get(relation.from) ?? []), relation]);
  for (const bucket of grouped.values()) bucket.sort(narrative ? compareRelationsByNarrativeOrder : compareById);
  return grouped;
}

/**
 * @lang zh-CN 从唯一 start 做首次访问 DFS，使 merge 只进入线性叙事一次。
 * @lang en Performs first-visit DFS from the unique start so a merge enters the linear narrative once.
 */
function collectDepthFirstNodeIds(entryNodeId: string, outgoing: Map<string, BusinessFlowRelation[]>): string[] {
  const visited = new Set<string>();
  const ordered: string[] = [];
  const visit = (nodeId: string): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    ordered.push(nodeId);
    for (const relation of outgoing.get(nodeId) ?? []) visit(relation.to);
  };
  visit(entryNodeId);
  return ordered;
}

/**
 * @lang zh-CN 精确 locale 优先，否则只回退到 flow default。
 * @lang en Prefers an exact locale and otherwise falls back only to the flow default.
 */
function resolveLocale(
  labels: Record<string, string>,
  flowDefaultLocale: string,
  requestedLocale: string
): BusinessFlowProjectionLocaleResolution {
  return requestedLocale in labels
    ? { requestedLocale, resolvedLocale: requestedLocale, strategy: "requested-exact" }
    : { requestedLocale, resolvedLocale: flowDefaultLocale, strategy: "flow-default" };
}

/**
 * @lang zh-CN 复原 shared facts 的 W-P119 validation envelope。
 * @lang en Restores the W-P119 validation envelope around shared facts.
 */
function createSourceDocument(sharedFacts: BusinessFlowDocumentationProjectionSharedFacts): BusinessFlowDocumentation {
  return {
    ...structuredClone(sharedFacts),
    compatibility: {
      migrationPolicy: "explicit-pure-identity-preserving",
      unknownKindPolicy: "reject",
      unknownProperties: "reject",
      versionMatch: "exact"
    },
    contract: BUSINESS_FLOW_DOCUMENTATION_CONTRACT,
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
    diagnostics: [],
    privacy: {
      absolutePathIncluded: false,
      credentialIncluded: false,
      personalIdentityIncluded: false,
      runtimePayloadIncluded: false,
      sourceBodyIncluded: false,
      sourceRangeIncluded: false,
      targetIdentityIncluded: false
    }
  };
}

/**
 * @lang zh-CN 验证投影 outer/nested closed-world shape。
 * @lang en Validates the outer and nested closed-world projection shape.
 */
function isProjectionShape(value: unknown): value is BusinessFlowDocumentationProjection {
  if (!isExactRecord(value, topLevelKeys) || !hasRequiredKeys(value, topLevelKeys)) return false;
  if (typeof value.contract !== "string" || typeof value.contractVersion !== "string" || typeof value.audience !== "string" || typeof value.requestedLocale !== "string") return false;
  if (!isExactRecord(value.source, sourceKeys) || !hasRequiredKeys(value.source, sourceKeys)
    || typeof value.source.contract !== "string" || typeof value.source.contractVersion !== "string" || !isIdentityArray(value.source.flowRefs, 1000, true, true)) return false;
  if (!isExactRecord(value.sharedFacts, sharedFactsKeys) || !hasRequiredKeys(value.sharedFacts, sharedFactsKeys)
    || !Array.isArray(value.sharedFacts.flows) || !Array.isArray(value.sharedFacts.nodes) || !Array.isArray(value.sharedFacts.relations)
    || !Array.isArray(value.sharedFacts.evidence) || !Array.isArray(value.sharedFacts.codeBindings)) return false;
  if (!isExactRecord(value.humanLinear, humanLinearKeys) || !hasRequiredKeys(value.humanLinear, humanLinearKeys)
    || !Array.isArray(value.humanLinear.flows) || !value.humanLinear.flows.every(isHumanFlowShape)) return false;
  if (!isExactRecord(value.aiGraph, aiGraphKeys) || !hasRequiredKeys(value.aiGraph, aiGraphKeys)
    || !Array.isArray(value.aiGraph.graphs) || !value.aiGraph.graphs.every(isAiGraphEntryShape)) return false;
  const privacy = value.privacy;
  const compatibility = value.compatibility;
  return isExactRecord(privacy, privacyKeys) && hasRequiredKeys(privacy, privacyKeys)
    && privacyKeys.every((key) => typeof privacy[key] === "boolean")
    && isExactRecord(compatibility, compatibilityKeys) && hasRequiredKeys(compatibility, compatibilityKeys)
    && compatibilityKeys.every((key) => typeof compatibility[key] === "string");
}

/**
 * @lang zh-CN 验证 human flow 的 closed-world 基础 shape。
 * @lang en Validates the closed-world basic shape of a human flow.
 */
function isHumanFlowShape(value: unknown): boolean {
  return isExactRecord(value, humanFlowKeys) && hasRequiredKeys(value, humanFlowKeys)
    && isIdentity(value.flowRef) && isIdentity(value.entryNodeRef) && isIdentityArray(value.endNodeRefs, 256, true, true)
    && typeof value.label === "string" && value.label.length > 0 && isLocaleResolutionShape(value.localeResolution)
    && Array.isArray(value.items) && value.items.length > 0 && value.items.length <= 10000 && value.items.every(isHumanItemShape);
}

/**
 * @lang zh-CN 验证 human item 的 closed-world 基础 shape。
 * @lang en Validates the closed-world basic shape of a human item.
 */
function isHumanItemShape(value: unknown): boolean {
  return isExactRecord(value, humanItemKeys) && hasRequiredKeys(value, humanItemKeys)
    && Number.isSafeInteger(value.position) && Number(value.position) >= 0 && isIdentity(value.nodeRef)
    && typeof value.nodeKind === "string" && typeof value.label === "string" && value.label.length > 0
    && isLocaleResolutionShape(value.localeResolution)
    && [value.outgoingRelationRefs, value.responsibilityRelationRefs, value.dataRelationRefs, value.actorNodeRefs,
      value.artifactNodeRefs, value.codeBindingRefs, value.evidenceRefs]
      .every((refs) => isIdentityArray(refs, 50000, true, false));
}

/**
 * @lang zh-CN 验证 AI graph entry 的 closed-world 基础 shape。
 * @lang en Validates the closed-world basic shape of an AI graph entry.
 */
function isAiGraphEntryShape(value: unknown): boolean {
  return isExactRecord(value, aiGraphEntryKeys) && hasRequiredKeys(value, aiGraphEntryKeys) && isIdentity(value.flowRef)
    && [value.nodeRefs, value.edgeRefs, value.evidenceRefs, value.codeBindingRefs]
      .every((refs) => isIdentityArray(refs, 50000, true, false));
}

/**
 * @lang zh-CN 验证 locale resolution 的 closed-world 基础 shape。
 * @lang en Validates the closed-world basic shape of locale resolution.
 */
function isLocaleResolutionShape(value: unknown): boolean {
  return isExactRecord(value, localeResolutionKeys) && hasRequiredKeys(value, localeResolutionKeys)
    && isLocale(value.requestedLocale) && isLocale(value.resolvedLocale)
    && (value.strategy === "requested-exact" || value.strategy === "flow-default");
}

/**
 * @lang zh-CN 验证 producer options，无默认 audience/flow/locale。
 * @lang en Validates producer options with no default audience, flow, or locale.
 */
function isProjectionOptions(value: unknown): value is BusinessFlowDocumentationProjectionOptions {
  return isExactRecord(value, ["audience", "flowIds", "locale"] as const)
    && hasRequiredKeys(value, ["audience", "flowIds", "locale"] as const)
    && value.audience === "public" && isLocale(value.locale) && isIdentityArray(value.flowIds, 1000, true, true);
}

/**
 * @lang zh-CN 创建只含安全摘要的 refused 结果。
 * @lang en Creates a refused result containing only a safe summary.
 */
function refuse(code: BusinessFlowDocumentationProjectionDiagnosticCode, message: string): BusinessFlowDocumentationProjectionResult {
  return deepFreeze({ diagnostics: [projectionDiagnostic(code, message)], status: "refused" });
}

/**
 * @lang zh-CN 创建不含物理位置的 stable diagnostic。
 * @lang en Creates a stable diagnostic with no physical location.
 */
function projectionDiagnostic(code: BusinessFlowDocumentationProjectionDiagnosticCode, message: string, path?: string): HiaDiagnostic {
  return createHiaDiagnostic(code, message, "error", path ? { path } : {});
}

/**
 * @lang zh-CN 复制 quality 并排序 provenance evidence ref。
 * @lang en Copies quality and sorts provenance evidence refs.
 */
function normalizeQuality(quality: BusinessFlowQuality): BusinessFlowQuality {
  return {
    confidence: quality.confidence,
    provenance: { evidenceRefs: [...quality.provenance.evidenceRefs].sort(compareStrings), origin: quality.provenance.origin },
    resolution: quality.resolution
  };
}

/**
 * @lang zh-CN 投影仅允许 W-P119 control kind 进入 human linear。
 * @lang en Only W-P119 control kinds enter the human-linear view.
 */
function isControlNodeKind(kind: BusinessFlowNodeKind): boolean {
  return BUSINESS_FLOW_CONTROL_NODE_KINDS.includes(kind as typeof BUSINESS_FLOW_CONTROL_NODE_KINDS[number]);
}

/**
 * @lang zh-CN 检测任何嵌套 private carrier field。
 * @lang en Detects any nested private-carrier field.
 */
function containsForbiddenField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => forbiddenFieldNames.has(key) || containsForbiddenField(child));
}

/**
 * @lang zh-CN 按 code/path/message 稳定排序并去重。
 * @lang en Stably sorts and de-duplicates by code/path/message.
 */
function sortDiagnostics(diagnostics: HiaDiagnostic[]): HiaDiagnostic[] {
  const byKey = new Map<string, HiaDiagnostic>();
  for (const diagnostic of diagnostics) byKey.set(`${diagnostic.code}\u0000${diagnostic.path ?? ""}\u0000${diagnostic.message}`, diagnostic);
  return [...byKey.values()].sort((left, right) => compareStrings(
    `${left.code}\u0000${left.path ?? ""}\u0000${left.message}`,
    `${right.code}\u0000${right.path ?? ""}\u0000${right.message}`
  ));
}

/**
 * @lang zh-CN 语义 relation 顺序：order 优先，id 决胜。
 * @lang en Semantic relation order: `order` first, id as the tie-breaker.
 */
function compareRelationsByNarrativeOrder(left: BusinessFlowRelation, right: BusinessFlowRelation): number {
  return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) || compareStrings(left.id, right.id);
}

/**
 * @lang zh-CN stable id comparator。
 * @lang en Stable-id comparator.
 */
function compareById(left: { id: string }, right: { id: string }): number {
  return compareStrings(left.id, right.id);
}

/**
 * @lang zh-CN locale-independent string comparator。
 * @lang en Locale-independent string comparator.
 */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * @lang zh-CN 比较两个 ref array 的精确顺序与成员。
 * @lang en Compares exact order and membership of two ref arrays.
 */
function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * @lang zh-CN 按 locale key 排序 labels。
 * @lang en Sorts labels by locale key.
 */
function sortStringMap(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => compareStrings(left, right)));
}

/**
 * @lang zh-CN 判断 stable identity。
 * @lang en Checks a stable identity.
 */
function isIdentity(value: unknown): value is string {
  return typeof value === "string" && stableIdentityPattern.test(value);
}

/**
 * @lang zh-CN 判断 P1 locale tag。
 * @lang en Checks a P1 locale tag.
 */
function isLocale(value: unknown): value is string {
  return typeof value === "string" && localePattern.test(value);
}

/**
 * @lang zh-CN 判断有界 identity array。
 * @lang en Checks a bounded identity array.
 */
function isIdentityArray(value: unknown, maximum: number, unique: boolean, nonEmpty: boolean): value is string[] {
  return Array.isArray(value) && (!nonEmpty || value.length > 0) && value.length <= maximum && value.every(isIdentity)
    && (!unique || new Set(value).size === value.length);
}

/**
 * @lang zh-CN 判断非数组 record。
 * @lang en Checks a non-array record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @lang zh-CN 判断 record 只包含 allowlist key。
 * @lang en Checks that a record contains only allowlisted keys.
 */
function isExactRecord<const T extends readonly string[]>(value: unknown, keys: T): value is Record<T[number], unknown> {
  return isRecord(value) && Object.keys(value).every((key) => keys.includes(key as T[number]));
}

/**
 * @lang zh-CN 判断 record 含有每个 required key。
 * @lang en Checks that a record contains every required key.
 */
function hasRequiredKeys<const T extends readonly string[]>(value: Record<string, unknown>, keys: T): boolean {
  return keys.every((key) => Object.hasOwn(value, key));
}

/**
 * @lang zh-CN 递归转换为 key-sorted JSON value。
 * @lang en Recursively converts to a key-sorted JSON value.
 */
function toStableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toStableJsonValue);
  if (!isRecord(value)) return value;
  const stable: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort(compareStrings)) stable[key] = toStableJsonValue(value[key]);
  return stable;
}

/**
 * @lang zh-CN 生成用于 exact semantic comparison 的 stable JSON。
 * @lang en Produces stable JSON for exact semantic comparison.
 */
function stableJson(value: unknown): string {
  return JSON.stringify(toStableJsonValue(value));
}

/**
 * @lang zh-CN 深度冻结 producer-owned 输出，防止校验后漂移。
 * @lang en Deep-freezes producer-owned output to prevent post-validation drift.
 */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
