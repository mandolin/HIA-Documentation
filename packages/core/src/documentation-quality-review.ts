import { createHiaDiagnostic } from "./diagnostics.js";
import type { HiaDiagnostic, HiaDiagnosticSeverity } from "./model.js";

/**
 * 中文：文档质量审查 artifact 的中性 contract 名称。
 * English: Neutral contract name for a documentation-quality-review artifact.
 */
export const DOCUMENTATION_QUALITY_REVIEW_CONTRACT = "documentation-quality-review" as const;

/**
 * 中文：P1 quality-review artifact 的草案版本。
 * English: Draft version for the P1 quality-review artifact.
 */
export const DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * 中文：公开 JSON Schema 标识；contract version 与包的 SemVer 分离。
 * English: Public JSON Schema identifier; contract version is independent of package SemVer.
 */
export const DOCUMENTATION_QUALITY_REVIEW_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-quality-review-0.1.0-draft.schema.json" as const;

/**
 * 中文：P1 可消费的审查类别；profile grammar 与具体 source parser 不在此枚举中。
 * English: P1 review categories; profile grammar and concrete source parsers are intentionally excluded.
 */
export const DOCUMENTATION_QUALITY_REVIEW_CATEGORIES = ["rop", "terminology", "locale-resource"] as const;

/**
 * 中文：结构 observation 的受限状态；observed 不是语义质量通过。
 * English: Restricted structural-observation states; observed never means semantic quality passed.
 */
export const DOCUMENTATION_QUALITY_REVIEW_OBSERVATION_STATES = ["observed", "missing", "unavailable"] as const;

/**
 * 中文：所有 P1 finding 都要求人工审查；unavailable 保留边界，而不是猜测结论。
 * English: Every P1 finding requires human review; unavailable preserves a boundary instead of guessing.
 */
export const DOCUMENTATION_QUALITY_REVIEW_STATUSES = ["needs-human-review", "unavailable"] as const;

/**
 * 中文：中性 quality-review diagnostic 目录；它们描述审查条件，绝不授予自动修改权限。
 * English: Neutral quality-review diagnostic catalogue; codes describe review conditions and never grant automatic mutation authority.
 */
export const DOCUMENTATION_QUALITY_REVIEW_DIAGNOSTIC_CODE_REGISTRY = [
  { code: "DQR_CONTRACT_INVALID", defaultSeverity: "error", description: "Documentation quality-review input is invalid." },
  { code: "DQR_PRIVACY_VIOLATION", defaultSeverity: "error", description: "Quality-review metadata contains prohibited private data." },
  { code: "DQR_ROP_REVIEW_REQUIRED", defaultSeverity: "warning", description: "ROP structural observation requires human review." },
  { code: "DQR_TERMINOLOGY_REVIEW_REQUIRED", defaultSeverity: "warning", description: "Terminology candidate or grammar state requires human review." },
  { code: "DQR_LOCALE_RESOURCE_REVIEW_REQUIRED", defaultSeverity: "warning", description: "Locale-resource metadata or diagnostic requires human review." },
  { code: "DQR_REVIEW_INPUT_UNAVAILABLE", defaultSeverity: "info", description: "Quality-review input is unavailable and cannot be inferred." }
] as const satisfies readonly { code: string; defaultSeverity: HiaDiagnosticSeverity; description: string }[];

/** 中文：可移植 finding 的逻辑范围。 English: Logical scope for a portable finding. */
export interface DocumentationQualityReviewScope {
  fieldPath?: string;
  occurrence?: number;
  profile?: string;
  sourceDocumentId: string;
  symbolId?: string;
}

/** 中文：安全的输入来源说明。 English: Privacy-safe provenance for an input observation. */
export interface DocumentationQualityReviewProvenance {
  kind: "rop-observation" | "profile-diagnostic" | "locale-resolution-sidecar" | "generated-source-linkage";
  sidecarId?: string;
}

/**
 * 中文：一个由 profile 或既有 metadata producer 提供的审查 observation；禁止携带正文和 locator。
 * English: A review observation supplied by a profile or existing metadata producer; bodies and locators are prohibited.
 */
export interface DocumentationQualityReviewObservation {
  category: typeof DOCUMENTATION_QUALITY_REVIEW_CATEGORIES[number];
  confidence: "high" | "medium" | "low" | "none";
  diagnosticCodes?: string[];
  provenance: DocumentationQualityReviewProvenance;
  rule: string;
  scope: DocumentationQualityReviewScope;
  state: typeof DOCUMENTATION_QUALITY_REVIEW_OBSERVATION_STATES[number];
}

/**
 * 中文：质量审查的 metadata-only 输入。它没有 source/resource text、raw locator 或修复内容。
 * English: Metadata-only quality-review input. It contains no source/resource text, raw locator, or fix payload.
 */
export interface DocumentationQualityReviewInput {
  contract: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT;
  contractVersion: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION;
  id: string;
  observations: DocumentationQualityReviewObservation[];
  privacy: {
    allowRawLocator: false;
    allowResourceBody: false;
    allowSourceBody: false;
    allowTermPhrase: false;
  };
}

/** 中文：聚合后、可投影给任一宿主的单条 finding。 English: One aggregated finding projectable to any host. */
export interface DocumentationQualityReviewFinding {
  category: DocumentationQualityReviewObservation["category"];
  confidence: DocumentationQualityReviewObservation["confidence"];
  diagnosticCodes: string[];
  id: string;
  provenance: DocumentationQualityReviewProvenance;
  requiresHumanReview: true;
  reviewStatus: typeof DOCUMENTATION_QUALITY_REVIEW_STATUSES[number];
  rule: string;
  scope: DocumentationQualityReviewScope;
  severity: HiaDiagnosticSeverity;
}

/** 中文：稳定的 P1 review summary。 English: Stable P1 review summary. */
export interface DocumentationQualityReviewSummary {
  findingCount: number;
  localeResourceFindingCount: number;
  requiresHumanReview: true;
  ropFindingCount: number;
  terminologyFindingCount: number;
  unavailableFindingCount: number;
}

/**
 * 中文：聚合产物；actionPolicy 永远是 review-only，不能被 consumer 当作 edit proposal。
 * English: Aggregated artifact; actionPolicy is always review-only and cannot be treated as an edit proposal.
 */
export interface DocumentationQualityReviewReport {
  actionPolicy: "review-only";
  contract: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT;
  contractVersion: typeof DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION;
  findings: DocumentationQualityReviewFinding[];
  id: string;
  privacy: DocumentationQualityReviewInput["privacy"];
  summary: DocumentationQualityReviewSummary;
}

/**
 * 中文：Draft 2020-12 schema 只验证 wire shape；cross-finding privacy 和稳定性由 owner validator 负责。
 * English: Draft 2020-12 schema validates only wire shape; cross-finding privacy and stability belong to the owner validator.
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
 * 中文：验证 quality-review input，拒绝不安全字段和不完整 logical scope。
 * English: Validates quality-review input and rejects unsafe fields and incomplete logical scope.
 */
export function validateDocumentationQualityReview(value: unknown): HiaDiagnostic[] {
  /** 中文：每次验证都独立收集，避免跨调用共享诊断状态。 English: Each validation keeps isolated diagnostics to avoid cross-call state. */
  const diagnostics: HiaDiagnostic[] = [];
  /** 中文：先执行深度隐私扫描，防止未知 optional field 旁路 P1 privacy policy。 English: Scan privacy first so unknown optional fields cannot bypass P1 privacy policy. */
  collectPrivacyDiagnostics(value, diagnostics);

  if (!isRecord(value) || value.contract !== DOCUMENTATION_QUALITY_REVIEW_CONTRACT || value.contractVersion !== DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION) {
    diagnostics.push(createQualityDiagnostic("DQR_CONTRACT_INVALID", "Quality-review contract or version is unsupported.", "error"));
    return diagnostics;
  }

  /** 中文：artifact identity 是稳定引用锚点，不能以 runtime data 或路径替代。 English: Artifact identity is a stable reference anchor and cannot be replaced by runtime data or paths. */
  if (!isNonEmptyString(value.id) || !Array.isArray(value.observations) || !isPrivacyPolicy(value.privacy)) {
    diagnostics.push(createQualityDiagnostic("DQR_CONTRACT_INVALID", "Quality-review input misses a required metadata-only field.", "error"));
    return diagnostics;
  }

  for (const [index, observation] of value.observations.entries()) {
    /** 中文：逐项验证只使用结构字段，绝不读取或记录任何 candidate 正文。 English: Per-item validation uses structural fields only and never reads or records candidate text. */
    if (!isObservation(observation)) {
      diagnostics.push(createQualityDiagnostic("DQR_CONTRACT_INVALID", "Quality-review observation is invalid.", "error", `observations.${index}`));
    }
  }

  return diagnostics;
}

/**
 * 中文：从已验证 input 聚合稳定 finding；不执行 parser、I/O、网络或任何编辑。
 * English: Aggregates stable findings from validated input; performs no parsing, I/O, network, or editing.
 */
export function createDocumentationQualityReviewReport(input: DocumentationQualityReviewInput): DocumentationQualityReviewReport {
  /** 中文：validator failure 被保留为一个不可用 finding，调用方仍可安全呈现边界。 English: Validator failure becomes one unavailable finding so callers can safely render the boundary. */
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

/** 中文：将 finding 映射回核心 diagnostic，供 LSP 或其它只读 consumer 投影。 English: Maps a finding back to a core diagnostic for LSP or other read-only consumers. */
export function createDocumentationQualityReviewDiagnostic(finding: DocumentationQualityReviewFinding): HiaDiagnostic {
  const code = finding.reviewStatus === "unavailable"
    ? "DQR_REVIEW_INPUT_UNAVAILABLE"
    : finding.category === "rop"
      ? "DQR_ROP_REVIEW_REQUIRED"
      : finding.category === "terminology"
        ? "DQR_TERMINOLOGY_REVIEW_REQUIRED"
        : "DQR_LOCALE_RESOURCE_REVIEW_REQUIRED";
  /** 中文：diagnostic data 只写 logical metadata，保持 source/resource body 完全不可见。 English: Diagnostic data contains logical metadata only, keeping source/resource bodies completely invisible. */
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

/** 中文：创建一条 deterministic finding。 English: Creates one deterministic finding. */
function createFinding(observation: DocumentationQualityReviewObservation): DocumentationQualityReviewFinding {
  /** 中文：finding id 仅依赖逻辑 scope 和规则，不能由 phrase、path 或源码位置决定。 English: Finding identity uses only logical scope and rule, never phrase, path, or source position. */
  const id = createFindingId(observation);
  /** 中文：unavailable 表示保留审查边界；其余状态都仍需人工审查。 English: Unavailable preserves the review boundary; every other state still needs human review. */
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

/** 中文：为无效 input 构造最小、无正文的 unavailable finding。 English: Creates a minimal body-free unavailable finding for invalid input. */
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

/** 中文：从 finding 集合生成只计数的 summary。 English: Produces a count-only summary from findings. */
function createSummary(findings: readonly DocumentationQualityReviewFinding[]): DocumentationQualityReviewSummary {
  /** 中文：category 计数保持独立，避免把术语/DLR 问题混进 ROP 覆盖率。 English: Category counts remain separate so terminology/DLR issues never become ROP coverage. */
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

/** 中文：串联安全 logical components 形成可比较 key。 English: Joins safe logical components into a comparable key. */
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

/** 中文：禁止字段按 key 扫描，而不是依赖 producer 自觉不填。 English: Prohibited fields are scanned by key instead of trusting producers to omit them. */
function collectPrivacyDiagnostics(value: unknown, diagnostics: HiaDiagnostic[], path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPrivacyDiagnostics(item, diagnostics, `${path}.${index}`));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    /** 中文：这些名称覆盖 body/text/phrase/locator 的常见序列化旁路。 English: These names cover common serialization bypasses for bodies, text, phrases, and locators. */
    const normalizedKey = key.replace(/[-_]/g, "").toLowerCase();
    if (["body", "content", "sourcetext", "resourcetext", "resolvedtext", "observedtext", "termphrase", "rawlocator", "locator", "absolutepath"].includes(normalizedKey) && child !== false) {
      diagnostics.push(createQualityDiagnostic("DQR_PRIVACY_VIOLATION", "Quality-review metadata contains a prohibited private field.", "error", `${path}.${key}`));
    }
    collectPrivacyDiagnostics(child, diagnostics, `${path}.${key}`);
  }
}

/** 中文：创建带可选 logical targetPath 的核心 diagnostic。 English: Creates a core diagnostic with an optional logical targetPath. */
function createQualityDiagnostic(code: string, message: string, severity: HiaDiagnosticSeverity, targetPath?: string, data?: Record<string, unknown>): HiaDiagnostic {
  return createHiaDiagnostic(code, message, severity, {
    ...(targetPath ? { targetPath } : {}),
    ...(data ? { data } : {})
  });
}

/** 中文：确认 JSON-like record。 English: Confirms a JSON-like record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 中文：确认非空字符串。 English: Confirms a non-empty string. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** 中文：确认 P1 强制的 deny-all privacy policy。 English: Confirms the mandatory P1 deny-all privacy policy. */
function isPrivacyPolicy(value: unknown): value is DocumentationQualityReviewInput["privacy"] {
  return isRecord(value)
    && value.allowRawLocator === false
    && value.allowResourceBody === false
    && value.allowSourceBody === false
    && value.allowTermPhrase === false;
}

/** 中文：确认一个 observation 的全部 logical metadata。 English: Confirms all logical metadata for one observation. */
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
