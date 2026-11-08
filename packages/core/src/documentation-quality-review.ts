import { createHiaDiagnostic } from "./diagnostics.js";
import type { HiaDiagnostic, HiaDiagnosticSeverity } from "./model.js";

/**
 * @lang zh-CN 文档质量审查 artifact 的中性 contract 名称。
 *
 * @lang en Neutral contract name for a documentation-quality-review artifact.
 */
export const DOCUMENTATION_QUALITY_REVIEW_CONTRACT = "documentation-quality-review" as const;

/**
 * @lang zh-CN P1 quality-review artifact 的草案版本。
 *
 * @lang en Draft version for the P1 quality-review artifact.
 */
export const DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN 公开 JSON Schema 标识；contract version 与包的 SemVer 分离。
 *
 * @lang en Public JSON Schema identifier; contract version is independent of package SemVer.
 */
export const DOCUMENTATION_QUALITY_REVIEW_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-quality-review-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN P1 可消费的审查类别；profile grammar 与具体 source parser 不在此枚举中。
 *
 * @lang en P1 review categories; profile grammar and concrete source parsers are intentionally excluded.
 */
export const DOCUMENTATION_QUALITY_REVIEW_CATEGORIES = ["rop", "terminology", "locale-resource"] as const;

/**
 * @lang zh-CN 结构 observation 的受限状态；observed 不是语义质量通过。
 *
 * @lang en Restricted structural-observation states; observed never means semantic quality passed.
 */
export const DOCUMENTATION_QUALITY_REVIEW_OBSERVATION_STATES = ["observed", "missing", "unavailable"] as const;

/**
 * @lang zh-CN 所有 P1 finding 都要求人工审查；unavailable 保留边界，而不是猜测结论。
 *
 * @lang en Every P1 finding requires human review; unavailable preserves a boundary instead of guessing.
 */
export const DOCUMENTATION_QUALITY_REVIEW_STATUSES = ["needs-human-review", "unavailable"] as const;

/**
 * @lang zh-CN 中性 quality-review diagnostic 目录；它们描述审查条件，绝不授予自动修改权限。
 *
 * @lang en Neutral quality-review diagnostic catalogue; codes describe review conditions and never grant automatic mutation authority.
 */
export const DOCUMENTATION_QUALITY_REVIEW_DIAGNOSTIC_CODE_REGISTRY = [
  { code: "DQR_CONTRACT_INVALID", defaultSeverity: "error", description: "Documentation quality-review input is invalid." },
  { code: "DQR_PRIVACY_VIOLATION", defaultSeverity: "error", description: "Quality-review metadata contains prohibited private data." },
  { code: "DQR_ROP_REVIEW_REQUIRED", defaultSeverity: "warning", description: "ROP structural observation requires human review." },
  { code: "DQR_TERMINOLOGY_REVIEW_REQUIRED", defaultSeverity: "warning", description: "Terminology candidate or grammar state requires human review." },
  { code: "DQR_LOCALE_RESOURCE_REVIEW_REQUIRED", defaultSeverity: "warning", description: "Locale-resource metadata or diagnostic requires human review." },
  { code: "DQR_REVIEW_INPUT_UNAVAILABLE", defaultSeverity: "info", description: "Quality-review input is unavailable and cannot be inferred." }
] as const satisfies readonly { code: string; defaultSeverity: HiaDiagnosticSeverity; description: string }[];

/**
 * @lang zh-CN 可移植 finding 的逻辑范围。
 *
 * @lang en Logical scope for a portable finding.
 */
export interface DocumentationQualityReviewScope {
  /**
   * @lang zh-CN 可选被审查字段的逻辑路径。
   * @lang en Optional logical path of the reviewed field.
   */
  fieldPath?: string;
  /**
   * @lang zh-CN 可选同范围出现序号，生成finding身份时省略按0处理。
   * @lang en Optional occurrence index within the scope, treated as 0 when omitted for finding identity.
   */
  occurrence?: number;
  /**
   * @lang zh-CN 产生该观察的可选文档规范名称。
   * @lang en Optional documentation-profile name producing the observation.
   */
  profile?: string;
  /**
   * @lang zh-CN 被审查源文档的逻辑身份。
   * @lang en Logical identity of the reviewed source document.
   */
  sourceDocumentId: string;
  /**
   * @lang zh-CN 被审查符号的可选逻辑身份。
   * @lang en Optional logical identity of the reviewed symbol.
   */
  symbolId?: string;
}

/**
 * @lang zh-CN 安全的输入来源说明。
 *
 * @lang en Privacy-safe provenance for an input observation.
 */
export interface DocumentationQualityReviewProvenance {
  /**
   * @lang zh-CN 观察来源类别，表达结构观察、规范诊断、语言解析关联或生成源码关联。
   * @lang en Observation-origin kind identifying structural observations, profile diagnostics, locale-resolution linkage or generated-source linkage.
   */
  kind: "rop-observation" | "profile-diagnostic" | "locale-resolution-sidecar" | "generated-source-linkage";
  /**
   * @lang zh-CN 提供该观察的可选关联工件身份。
   * @lang en Optional identity of the sidecar artifact supplying this observation.
   */
  sidecarId?: string;
}

/**
 * @lang zh-CN 一个由 profile 或既有 metadata producer 提供的审查 observation；禁止携带正文和 locator。
 *
 * @lang en A review observation supplied by a profile or existing metadata producer; bodies and locators are prohibited.
 */
export interface DocumentationQualityReviewObservation {
  /**
   * @lang zh-CN 观察所属评审类别，采用rop、terminology或locale-resource。
   * @lang en Review category of the observation using rop, terminology or locale-resource.
   */
  category: typeof DOCUMENTATION_QUALITY_REVIEW_CATEGORIES[number];
  /**
   * @lang zh-CN 生产者声明的观察可信度。
   * @lang en Observation confidence declared by the producer.
   */
  confidence: "high" | "medium" | "low" | "none";
  /**
   * @lang zh-CN 与该观察相关的可选上游诊断代码。
   * @lang en Optional upstream diagnostic codes associated with the observation.
   */
  diagnosticCodes?: string[];
  /**
   * @lang zh-CN 观察的逻辑来源元数据。
   * @lang en Logical provenance metadata of the observation.
   */
  provenance: DocumentationQualityReviewProvenance;
  /**
   * @lang zh-CN 该观察所针对的稳定评审规则名称。
   * @lang en Stable review-rule name addressed by the observation.
   */
  rule: string;
  /**
   * @lang zh-CN 该观察适用的文档、符号及字段逻辑范围。
   * @lang en Logical document, symbol and field scope of the observation.
   */
  scope: DocumentationQualityReviewScope;
  /**
   * @lang zh-CN 结构观察状态，采用observed、missing或unavailable。
   * @lang en Structural observation state using observed, missing or unavailable.
   */
  state: typeof DOCUMENTATION_QUALITY_REVIEW_OBSERVATION_STATES[number];
}

/**
 * @lang zh-CN 质量审查的 metadata-only 输入。它没有 source/resource text、raw locator 或修复内容。
 *
 * @lang en Metadata-only quality-review input. It contains no source/resource text, raw locator, or fix payload.
 */
export interface DocumentationQualityReviewInput {
  /**
   * @lang zh-CN 文档质量评审输入的固定契约名称。
   * @lang en Fixed contract name of the documentation-quality-review input.
   */
  contract: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT;
  /**
   * @lang zh-CN 质量评审输入的精确契约版本。
   * @lang en Exact contract version of the quality-review input.
   */
  contractVersion: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION;
  /**
   * @lang zh-CN 该质量评审工件的稳定身份。
   * @lang en Stable identity of this quality-review artifact.
   */
  id: string;
  /**
   * @lang zh-CN 供聚合为人工审查finding的结构观察列表。
   * @lang en Structural observations to aggregate into human-review findings.
   */
  observations: DocumentationQualityReviewObservation[];
  /**
   * @lang zh-CN 该输入的固定元数据公开约束。
   * @lang en Fixed metadata-disclosure constraints for this input.
   */
  privacy: {
    /**
     * @lang zh-CN 原始定位器公开开关，固定为false。
     * @lang en Raw-locator disclosure switch, fixed to false.
     */
    allowRawLocator: false;
    /**
     * @lang zh-CN 资源正文公开开关，固定为false。
     * @lang en Resource-body disclosure switch, fixed to false.
     */
    allowResourceBody: false;
    /**
     * @lang zh-CN 源码正文公开开关，固定为false。
     * @lang en Source-body disclosure switch, fixed to false.
     */
    allowSourceBody: false;
    /**
     * @lang zh-CN 术语短语正文公开开关，固定为false。
     * @lang en Terminology-phrase disclosure switch, fixed to false.
     */
    allowTermPhrase: false;
  };
}

/**
 * @lang zh-CN 聚合后、可投影给任一宿主的单条 finding。
 *
 * @lang en One aggregated finding projectable to any host.
 */
export interface DocumentationQualityReviewFinding {
  /**
   * @lang zh-CN 该审查项所属的观察类别。
   * @lang en Observation category to which this finding belongs.
   */
  category: DocumentationQualityReviewObservation["category"];
  /**
   * @lang zh-CN 从观察保留的可信度维度。
   * @lang en Confidence dimension retained from the observation.
   */
  confidence: DocumentationQualityReviewObservation["confidence"];
  /**
   * @lang zh-CN 去重并排序的相关诊断代码。
   * @lang en Deduplicated and sorted associated diagnostic codes.
   */
  diagnosticCodes: string[];
  /**
   * @lang zh-CN 由规则和逻辑范围生成的稳定审查项身份。
   * @lang en Stable finding identity derived from its rule and logical scope.
   */
  id: string;
  /**
   * @lang zh-CN 从观察复制的逻辑来源。
   * @lang en Logical provenance copied from the observation.
   */
  provenance: DocumentationQualityReviewProvenance;
  /**
   * @lang zh-CN 人工审查要求标记，固定为true。
   * @lang en Human-review requirement flag, fixed to true.
   */
  requiresHumanReview: true;
  /**
   * @lang zh-CN 需要人工审查或输入不可用的状态。
   * @lang en State indicating required human review or unavailable input.
   */
  reviewStatus: typeof DOCUMENTATION_QUALITY_REVIEW_STATUSES[number];
  /**
   * @lang zh-CN 从观察保留的评审规则名称。
   * @lang en Review-rule name retained from the observation.
   */
  rule: string;
  /**
   * @lang zh-CN 从观察复制的逻辑审查范围。
   * @lang en Logical review scope copied from the observation.
   */
  scope: DocumentationQualityReviewScope;
  /**
   * @lang zh-CN 供宿主显示的诊断级别，不可用项为info，其余评审项为warning。
   * @lang en Diagnostic severity for host display, using info for unavailable findings and warning for other review findings.
   */
  severity: HiaDiagnosticSeverity;
}

/**
 * @lang zh-CN 稳定的 P1 review summary。
 *
 * @lang en Stable P1 review summary.
 */
export interface DocumentationQualityReviewSummary {
  /**
   * @lang zh-CN 聚合报告中的审查项总数。
   * @lang en Total finding count in the aggregated report.
   */
  findingCount: number;
  /**
   * @lang zh-CN 语言资源类别审查项数量。
   * @lang en Count of locale-resource findings.
   */
  localeResourceFindingCount: number;
  /**
   * @lang zh-CN 汇总的人工审查要求，固定为true。
   * @lang en Summary human-review requirement, fixed to true.
   */
  requiresHumanReview: true;
  /**
   * @lang zh-CN 面向阅读编程结构类别审查项数量。
   * @lang en Count of reading-oriented-programming structural findings.
   */
  ropFindingCount: number;
  /**
   * @lang zh-CN 术语类别审查项数量。
   * @lang en Count of terminology findings.
   */
  terminologyFindingCount: number;
  /**
   * @lang zh-CN 输入不可用状态的审查项数量。
   * @lang en Count of findings whose input is unavailable.
   */
  unavailableFindingCount: number;
}

/**
 * @lang zh-CN 聚合产物；actionPolicy 永远是 review-only，不能被 consumer 当作 edit proposal。
 *
 * @lang en Aggregated artifact; actionPolicy is always review-only and cannot be treated as an edit proposal.
 */
export interface DocumentationQualityReviewReport {
  /**
   * @lang zh-CN 报告的消费策略，固定为review-only。
   * @lang en Report-consumption policy, fixed to review-only.
   */
  actionPolicy: "review-only";
  /**
   * @lang zh-CN 质量评审报告的固定契约名称。
   * @lang en Fixed contract name of the quality-review report.
   */
  contract: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT;
  /**
   * @lang zh-CN 质量评审报告的精确契约版本。
   * @lang en Exact contract version of the quality-review report.
   */
  contractVersion: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION;
  /**
   * @lang zh-CN 由有效观察生成并按身份排序的审查项，输入校验失败时生成不可用项。
   * @lang en Findings generated from valid observations and sorted by identity, with an unavailable finding produced when input validation fails.
   */
  findings: DocumentationQualityReviewFinding[];
  /**
   * @lang zh-CN 从评审输入保留的工件身份。
   * @lang en Artifact identity retained from the review input.
   */
  id: string;
  /**
   * @lang zh-CN 从输入保留的固定公开策略。
   * @lang en Fixed disclosure policy retained from the input.
   */
  privacy: DocumentationQualityReviewInput["privacy"];
  /**
   * @lang zh-CN 该报告的分类计数及人工审查要求。
   * @lang en Category counts and human-review requirement for this report.
   */
  summary: DocumentationQualityReviewSummary;
}

/**
 * @lang zh-CN Draft 2020-12 schema 只验证 wire shape；cross-finding privacy 和稳定性由 owner validator 负责。
 *
 * @lang en Draft 2020-12 schema validates only wire shape; cross-finding privacy and stability belong to the owner validator.
 */
export const DOCUMENTATION_QUALITY_REVIEW_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_QUALITY_REVIEW_SCHEMA_ID,
  type: "object",
  required: ["contract", "contractVersion", "id", "observations", "privacy"],
  additionalProperties: false,
  properties: {
    contract: { const: DOCUMENTATION_QUALITY_REVIEW_CONTRACT },
    contractVersion: { const: DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION },
    id: { $ref: "#/$defs/nonEmptyString" },
    observations: { type: "array", items: { $ref: "#/$defs/observation" } },
    privacy: { $ref: "#/$defs/privacy" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    privacy: {
      type: "object",
      required: ["allowRawLocator", "allowResourceBody", "allowSourceBody", "allowTermPhrase"],
      additionalProperties: false,
      properties: {
        allowRawLocator: { const: false },
        allowResourceBody: { const: false },
        allowSourceBody: { const: false },
        allowTermPhrase: { const: false }
      }
    },
    scope: {
      type: "object",
      required: ["sourceDocumentId"],
      additionalProperties: false,
      properties: {
        sourceDocumentId: { $ref: "#/$defs/nonEmptyString" },
        symbolId: { $ref: "#/$defs/nonEmptyString" },
        fieldPath: { $ref: "#/$defs/nonEmptyString" },
        profile: { $ref: "#/$defs/nonEmptyString" },
        occurrence: { type: "integer", minimum: 0 }
      }
    },
    provenance: {
      type: "object",
      required: ["kind"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["rop-observation", "profile-diagnostic", "locale-resolution-sidecar", "generated-source-linkage"] },
        sidecarId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    observation: {
      type: "object",
      required: ["category", "confidence", "provenance", "rule", "scope", "state"],
      additionalProperties: false,
      properties: {
        category: { enum: DOCUMENTATION_QUALITY_REVIEW_CATEGORIES },
        confidence: { enum: ["high", "medium", "low", "none"] },
        diagnosticCodes: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } },
        provenance: { $ref: "#/$defs/provenance" },
        rule: { $ref: "#/$defs/nonEmptyString" },
        scope: { $ref: "#/$defs/scope" },
        state: { enum: DOCUMENTATION_QUALITY_REVIEW_OBSERVATION_STATES }
      }
    }
  }
} as const;

/**
 * @lang zh-CN 验证 quality-review input，拒绝不安全字段和不完整 logical scope。
 *
 * @lang en Validates quality-review input and rejects unsafe fields and incomplete logical scope.
 */
export function validateDocumentationQualityReview(value: unknown): HiaDiagnostic[] {
  /**
   * @lang zh-CN 每次验证都独立收集，避免跨调用共享诊断状态。
   *
   * @lang en Each validation keeps isolated diagnostics to avoid cross-call state.
   */
  const diagnostics: HiaDiagnostic[] = [];
  /**
   * @lang zh-CN 先执行深度隐私扫描，防止未知 optional field 旁路 P1 privacy policy。
   *
   * @lang en Scan privacy first so unknown optional fields cannot bypass P1 privacy policy.
   */
  collectPrivacyDiagnostics(value, diagnostics);

  if (!isRecord(value) || value.contract !== DOCUMENTATION_QUALITY_REVIEW_CONTRACT || value.contractVersion !== DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION) {
    diagnostics.push(createQualityDiagnostic("DQR_CONTRACT_INVALID", "Quality-review contract or version is unsupported.", "error"));
    return diagnostics;
  }

  /**
   * @lang zh-CN artifact identity 是稳定引用锚点，不能以 runtime data 或路径替代。
   *
   * @lang en Artifact identity is a stable reference anchor and cannot be replaced by runtime data or paths.
   */
  if (!isNonEmptyString(value.id) || !Array.isArray(value.observations) || !isPrivacyPolicy(value.privacy)) {
    diagnostics.push(createQualityDiagnostic("DQR_CONTRACT_INVALID", "Quality-review input misses a required metadata-only field.", "error"));
    return diagnostics;
  }

  for (const [index, observation] of value.observations.entries()) {
    /**
     * @lang zh-CN 逐项验证只使用结构字段，绝不读取或记录任何 candidate 正文。
     *
     * @lang en Per-item validation uses structural fields only and never reads or records candidate text.
     */
    if (!isObservation(observation)) {
      diagnostics.push(createQualityDiagnostic("DQR_CONTRACT_INVALID", "Quality-review observation is invalid.", "error", `observations.${index}`));
    }
  }

  return diagnostics;
}

/**
 * @lang zh-CN 从已验证 input 聚合稳定 finding；不执行 parser、I/O、网络或任何编辑。
 *
 * @lang en Aggregates stable findings from validated input; performs no parsing, I/O, network, or editing.
 */
export function createDocumentationQualityReviewReport(input: DocumentationQualityReviewInput): DocumentationQualityReviewReport {
  /**
   * @lang zh-CN validator failure 被保留为一个不可用 finding，调用方仍可安全呈现边界。
   *
   * @lang en Validator failure becomes one unavailable finding so callers can safely render the boundary.
   */
  const validationDiagnostics = validateDocumentationQualityReview(input);
  const findings = validationDiagnostics.length > 0
    ? [createUnavailableFinding(input.id, validationDiagnostics.map((diagnostic) => diagnostic.code))]
    : input.observations.map(createFinding).sort((left, right) => left.id.localeCompare(right.id));

  return {
    actionPolicy: "review-only",
    contract: DOCUMENTATION_QUALITY_REVIEW_CONTRACT,
    contractVersion: DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION,
    findings,
    id: input.id,
    privacy: input.privacy,
    summary: createSummary(findings)
  };
}

/**
 * @lang zh-CN 将 finding 映射回核心 diagnostic，供 LSP 或其它只读 consumer 投影。
 *
 * @lang en Maps a finding back to a core diagnostic for LSP or other read-only consumers.
 */
export function createDocumentationQualityReviewDiagnostic(finding: DocumentationQualityReviewFinding): HiaDiagnostic {
  const code = finding.reviewStatus === "unavailable"
    ? "DQR_REVIEW_INPUT_UNAVAILABLE"
    : finding.category === "rop"
      ? "DQR_ROP_REVIEW_REQUIRED"
      : finding.category === "terminology"
        ? "DQR_TERMINOLOGY_REVIEW_REQUIRED"
        : "DQR_LOCALE_RESOURCE_REVIEW_REQUIRED";
  /**
   * @lang zh-CN diagnostic data 只写 logical metadata，保持 source/resource body 完全不可见。
   *
   * @lang en Diagnostic data contains logical metadata only, keeping source/resource bodies completely invisible.
   */
  return createQualityDiagnostic(code, `Documentation quality review requires human attention for ${finding.category}:${finding.rule}.`, finding.severity, undefined, {
    category: finding.category,
    confidence: finding.confidence,
    diagnosticCodes: finding.diagnosticCodes,
    findingId: finding.id,
    provenance: finding.provenance.kind,
    reviewStatus: finding.reviewStatus,
    rule: finding.rule,
    scope: finding.scope
  });
}

/**
 * @lang zh-CN 创建一条 deterministic finding。
 *
 * @lang en Creates one deterministic finding.
 */
function createFinding(observation: DocumentationQualityReviewObservation): DocumentationQualityReviewFinding {
  /**
   * @lang zh-CN finding id 仅依赖逻辑 scope 和规则，不能由 phrase、path 或源码位置决定。
   *
   * @lang en Finding identity uses only logical scope and rule, never phrase, path, or source position.
   */
  const id = createFindingId(observation);
  /**
   * @lang zh-CN unavailable 表示保留审查边界；其余状态都仍需人工审查。
   *
   * @lang en Unavailable preserves the review boundary; every other state still needs human review.
   */
  const reviewStatus = observation.state === "unavailable" ? "unavailable" : "needs-human-review";
  return {
    category: observation.category,
    confidence: observation.confidence,
    diagnosticCodes: [...new Set(observation.diagnosticCodes ?? [])].sort(),
    id,
    provenance: { ...observation.provenance },
    requiresHumanReview: true,
    reviewStatus,
    rule: observation.rule,
    scope: { ...observation.scope },
    severity: reviewStatus === "unavailable" ? "info" : "warning"
  };
}

/**
 * @lang zh-CN 为无效 input 构造最小、无正文的 unavailable finding。
 *
 * @lang en Creates a minimal body-free unavailable finding for invalid input.
 */
function createUnavailableFinding(inputId: string, diagnosticCodes: string[]): DocumentationQualityReviewFinding {
  return {
    category: "rop",
    confidence: "none",
    diagnosticCodes: [...new Set(diagnosticCodes)].sort(),
    id: `quality-review:${inputId}:unavailable`,
    provenance: { kind: "profile-diagnostic" },
    requiresHumanReview: true,
    reviewStatus: "unavailable",
    rule: "quality-review-input",
    scope: { sourceDocumentId: inputId },
    severity: "info"
  };
}

/**
 * @lang zh-CN 从 finding 集合生成只计数的 summary。
 *
 * @lang en Produces a count-only summary from findings.
 */
function createSummary(findings: readonly DocumentationQualityReviewFinding[]): DocumentationQualityReviewSummary {
  /**
   * @lang zh-CN category 计数保持独立，避免把术语/DLR 问题混进 ROP 覆盖率。
   *
   * @lang en Category counts remain separate so terminology/DLR issues never become ROP coverage.
   */
  const ropFindingCount = findings.filter((item) => item.category === "rop").length;
  const terminologyFindingCount = findings.filter((item) => item.category === "terminology").length;
  const localeResourceFindingCount = findings.filter((item) => item.category === "locale-resource").length;
  return {
    findingCount: findings.length,
    localeResourceFindingCount,
    requiresHumanReview: true,
    ropFindingCount,
    terminologyFindingCount,
    unavailableFindingCount: findings.filter((item) => item.reviewStatus === "unavailable").length
  };
}

/**
 * @lang zh-CN 串联安全 logical components 形成可比较 key。
 *
 * @lang en Joins safe logical components into a comparable key.
 */
function createFindingId(observation: DocumentationQualityReviewObservation): string {
  const scope = observation.scope;
  return [
    "quality-review",
    scope.sourceDocumentId,
    scope.symbolId ?? "document",
    scope.fieldPath ?? "field",
    observation.category,
    observation.rule,
    String(scope.occurrence ?? 0)
  ].join(":");
}

/**
 * @lang zh-CN 禁止字段按 key 扫描，而不是依赖 producer 自觉不填。
 *
 * @lang en Prohibited fields are scanned by key instead of trusting producers to omit them.
 */
function collectPrivacyDiagnostics(value: unknown, diagnostics: HiaDiagnostic[], path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPrivacyDiagnostics(item, diagnostics, `${path}.${index}`));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    /**
     * @lang zh-CN 这些名称覆盖 body/text/phrase/locator 的常见序列化旁路。
     *
     * @lang en These names cover common serialization bypasses for bodies, text, phrases, and locators.
     */
    const normalizedKey = key.replace(/[-_]/g, "").toLowerCase();
    if (["body", "content", "sourcetext", "resourcetext", "resolvedtext", "observedtext", "termphrase", "rawlocator", "locator", "absolutepath"].includes(normalizedKey) && child !== false) {
      diagnostics.push(createQualityDiagnostic("DQR_PRIVACY_VIOLATION", "Quality-review metadata contains a prohibited private field.", "error", `${path}.${key}`));
    }
    collectPrivacyDiagnostics(child, diagnostics, `${path}.${key}`);
  }
}

/**
 * @lang zh-CN 创建带可选 logical targetPath 的核心 diagnostic。
 *
 * @lang en Creates a core diagnostic with an optional logical targetPath.
 */
function createQualityDiagnostic(code: string, message: string, severity: HiaDiagnosticSeverity, targetPath?: string, data?: Record<string, unknown>): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity, {
    ...(targetPath ? { targetPath } : {}),
    ...(data ? { data } : {})
  });
}

/**
 * @lang zh-CN 确认 JSON-like record。
 *
 * @lang en Confirms a JSON-like record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @lang zh-CN 确认非空字符串。
 *
 * @lang en Confirms a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * @lang zh-CN 确认 P1 强制的 deny-all privacy policy。
 *
 * @lang en Confirms the mandatory P1 deny-all privacy policy.
 */
function isPrivacyPolicy(value: unknown): value is DocumentationQualityReviewInput["privacy"] {
  return isRecord(value)
    && value.allowRawLocator === false
    && value.allowResourceBody === false
    && value.allowSourceBody === false
    && value.allowTermPhrase === false;
}

/**
 * @lang zh-CN 确认一个 observation 的全部 logical metadata。
 *
 * @lang en Confirms all logical metadata for one observation.
 */
function isObservation(value: unknown): value is DocumentationQualityReviewObservation {
  if (!isRecord(value) || !DOCUMENTATION_QUALITY_REVIEW_CATEGORIES.includes(value.category as DocumentationQualityReviewObservation["category"])) {
    return false;
  }
  if (!DOCUMENTATION_QUALITY_REVIEW_OBSERVATION_STATES.includes(value.state as DocumentationQualityReviewObservation["state"]) || !["high", "medium", "low", "none"].includes(String(value.confidence))) {
    return false;
  }
  if (!isNonEmptyString(value.rule) || !isRecord(value.scope) || !isNonEmptyString(value.scope.sourceDocumentId) || !isRecord(value.provenance)) {
    return false;
  }
  return ["rop-observation", "profile-diagnostic", "locale-resolution-sidecar", "generated-source-linkage"].includes(String(value.provenance.kind));
}
