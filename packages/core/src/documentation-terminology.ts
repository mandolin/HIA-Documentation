import { createHiaDiagnostic } from "./diagnostics.js";
import { canonicalizeDocumentationLocale } from "./locale-resource.js";
import type { DocumentationQualityReviewInput, DocumentationQualityReviewObservation } from "./documentation-quality-review.js";
import type { HiaDiagnostic, HiaDiagnosticSeverity } from "./model.js";

/**
 * @lang zh-CN 固有术语 candidate-set 与受控 registry 的中性 contract 名称。
 * @lang en Neutral contract name for inherent-terminology candidate sets and controlled registries.
 */
export const DOCUMENTATION_TERMINOLOGY_CONTRACT = "documentation-terminology" as const;

/**
 * @lang zh-CN 固有术语 reference 的草案 contract 版本；它独立于 package SemVer。
 * @lang en Draft contract version for the terminology reference; it is independent from package SemVer.
 */
export const DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN 分发给 consumer 的 JSON Schema identity。
 * @lang en JSON Schema identity distributed to consumers.
 */
export const DOCUMENTATION_TERMINOLOGY_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/documentation-terminology-0.1.0-draft.schema.json" as const;

/**
 * @lang zh-CN profile 已完成语法识别后可提交的 candidate extraction 状态；core 不解析 source/comment text。
 * @lang en Candidate-extraction states that a profile may submit after grammar recognition; core does not parse source or comment text.
 */
export const DOCUMENTATION_TERMINOLOGY_EXTRACTION_KINDS = [
  "first-unwrapped-natural-language-phrase",
  "profile-grammar-unknown"
] as const;

/**
 * @lang zh-CN candidate 只表示人工治理进度，绝不表示自动批准或 source replacement。
 * @lang en Candidate states represent human-governance progress only; they never mean automatic approval or source replacement.
 */
export const DOCUMENTATION_TERMINOLOGY_CANDIDATE_STATUSES = ["detected", "reviewed", "linked", "ignored"] as const;

/**
 * @lang zh-CN 受控 registry entry 的生命周期；只有 approved term 可以承接新的 candidate linkage。
 * @lang en Controlled registry-entry lifecycle; only approved terms may receive new candidate linkages.
 */
export const DOCUMENTATION_TERMINOLOGY_LIFECYCLES = ["proposed", "approved", "deprecated", "rejected"] as const;

/**
 * @lang zh-CN registry 文本的可见性；quality-review projection 不得回显任何 form。
 * @lang en Visibility of registry text; quality-review projections must never echo any form.
 */
export const DOCUMENTATION_TERMINOLOGY_VISIBILITIES = ["private", "workspace", "public"] as const;

/**
 * @lang zh-CN 固有术语 reference 的中性诊断目录；code 说明治理条件，不授予修改能力。
 * @lang en Neutral diagnostic catalogue for the terminology reference; codes describe governance conditions and grant no mutation authority.
 */
export const DOCUMENTATION_TERMINOLOGY_DIAGNOSTIC_CODE_REGISTRY = [
  { code: "TERM_CANDIDATE_GRAMMAR_UNKNOWN", defaultSeverity: "warning", description: "A profile could not safely determine terminology grammar." },
  { code: "TERM_REGISTRY_KEY_INVALID", defaultSeverity: "error", description: "A terminology registry identity or shape is invalid." },
  { code: "TERM_FORM_CONFLICT", defaultSeverity: "error", description: "Canonical terminology forms or synonyms conflict within a locale." },
  { code: "TERM_LOCALE_INVALID", defaultSeverity: "error", description: "A terminology locale is not canonical BCP 47." },
  { code: "TERM_LOCALE_MISSING", defaultSeverity: "warning", description: "A required terminology locale form is missing." },
  { code: "TERM_LIFECYCLE_VIOLATION", defaultSeverity: "error", description: "A candidate linkage or registry lifecycle transition is invalid." },
  { code: "TERM_VISIBILITY_DENIED", defaultSeverity: "warning", description: "A terminology form cannot cross the requested visibility boundary." },
  { code: "TERM_PRIVACY_VIOLATION", defaultSeverity: "error", description: "A terminology artifact contains prohibited source or locator data." }
] as const satisfies readonly { code: string; defaultSeverity: HiaDiagnosticSeverity; description: string }[];

/** @lang zh-CN portable candidate 的稳定逻辑范围。 @lang en Stable logical scope of a portable candidate. */
export interface DocumentationTerminologyScope {
  annotationKind: string;
  fieldPath: string;
  occurrence: number;
  sourceDocumentId: string;
  symbolId?: string;
}

/** @lang zh-CN candidate 的 profile 或生成链来源。 @lang en Profile or generation-chain provenance for a candidate. */
export interface DocumentationTerminologyCandidateProvenance {
  kind: "profile-candidate" | "generated-source-linkage";
  profile: string;
  relationId?: string;
}

/** @lang zh-CN candidate 的人工 review 记录，不含人员实名、路径或正文。 @lang en Human-review record for a candidate, without personal names, paths, or bodies. */
export interface DocumentationTerminologyHumanReview {
  decision: "reviewed" | "linked" | "ignored";
  reviewId: string;
}

/** @lang zh-CN 一个无正文 candidate 的 portable shape。 @lang en Portable shape of one body-free candidate. */
export interface DocumentationTerminologyCandidate {
  candidateId: string;
  extractionKind: typeof DOCUMENTATION_TERMINOLOGY_EXTRACTION_KINDS[number];
  locale: string;
  provenance: DocumentationTerminologyCandidateProvenance;
  review?: DocumentationTerminologyHumanReview;
  scope: DocumentationTerminologyScope;
  status: typeof DOCUMENTATION_TERMINOLOGY_CANDIDATE_STATUSES[number];
  termId?: string;
}

/** @lang zh-CN profile 已完成语法处理后交给 core 的观察输入。 @lang en Observation input delivered to core after a profile has completed grammar handling. */
export interface DocumentationTerminologyProfileObservation {
  candidateId: string;
  extractionKind: DocumentationTerminologyCandidate["extractionKind"];
  locale: string;
  provenance: DocumentationTerminologyCandidateProvenance;
  scope: DocumentationTerminologyScope;
}

/** @lang zh-CN profile observation 转换结果；diagnostic 不回显 raw locale 或 candidate phrase。 @lang en Profile-observation conversion result; diagnostics never echo raw locales or candidate phrases. */
export interface DocumentationTerminologyProfileObservationResult {
  candidate?: DocumentationTerminologyCandidate;
  diagnostics: HiaDiagnostic[];
}

/** @lang zh-CN candidate-set artifact。 @lang en Candidate-set artifact. */
export interface DocumentationTerminologyCandidateSet {
  candidates: DocumentationTerminologyCandidate[];
  contract: typeof DOCUMENTATION_TERMINOLOGY_CONTRACT;
  contractVersion: typeof DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION;
  id: string;
  kind: "documentation-terminology-candidate-set";
  privacy: {
    allowObservedText: false;
    allowRawLocator: false;
    allowSourceBody: false;
  };
}

/** @lang zh-CN 单 locale 的受控术语 form；它不是 source phrase。 @lang en Controlled terminology form for one locale; it is not a source phrase. */
export interface DocumentationTerminologyForm {
  canonical: string;
  synonyms?: string[];
}

/** @lang zh-CN 人工维护的 registry entry。 @lang en Human-maintained registry entry. */
export interface DocumentationTerminologyRegistryEntry {
  definition?: Record<string, string>;
  forms: Record<string, DocumentationTerminologyForm>;
  lifecycle: typeof DOCUMENTATION_TERMINOLOGY_LIFECYCLES[number];
  provenance: {
    kind: "human-confirmed";
    recordId: string;
  };
  replaces?: string[];
  termId: string;
  visibility: typeof DOCUMENTATION_TERMINOLOGY_VISIBILITIES[number];
}

/** @lang zh-CN 受控 registry artifact；form 文本只允许留在该受控输入中。 @lang en Controlled registry artifact; form text is allowed only in this controlled input. */
export interface DocumentationTerminologyRegistry {
  contract: typeof DOCUMENTATION_TERMINOLOGY_CONTRACT;
  contractVersion: typeof DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION;
  id: string;
  kind: "documentation-terminology-registry";
  privacy: {
    allowObservedText: false;
    allowRawLocator: false;
    allowSourceBody: false;
  };
  terms: DocumentationTerminologyRegistryEntry[];
}

/** @lang zh-CN quality input 的可见性 audience。 @lang en Visibility audience for a quality input. */
export type DocumentationTerminologyQualityAudience = "workspace" | "public";

/**
 * @lang zh-CN 将已解析的 profile observation 映射为 portable candidate；它不读取、保存或解析原始 comment text。
 * @lang en Maps an already-parsed profile observation to a portable candidate; it never reads, stores, or parses raw comment text.
 *
 * @param observation profile 提供的结构 observation。 / Structured observation supplied by a profile.
 * @returns candidate 或隐私安全 diagnostic。 / Candidate or privacy-safe diagnostic.
 */
export function createDocumentationTerminologyCandidateFromProfileObservation(
  observation: DocumentationTerminologyProfileObservation
): DocumentationTerminologyProfileObservationResult {
  // <lang><zh-CN>locale 是唯一允许从 profile bridge 进入 core 的语言值；立即 canonicalize，避免 legacy spelling 进入 artifact。</zh-CN><en>Locale is the only language value allowed from a profile bridge into core; canonicalize it immediately so legacy spelling cannot enter the artifact.</en></lang>
  const normalizedLocale = canonicalizeDocumentationLocale(observation.locale);
  if (!normalizedLocale) {
    return {
      diagnostics: [createTerminologyDiagnostic("TERM_LOCALE_INVALID", "Terminology observation locale must be a valid BCP 47 tag.", "error", { candidateId: observation.candidateId })]
    };
  }

  // <lang><zh-CN>underscore 是兼容输入；结果只保留 canonical BCP 47，同时由 warning 提醒 bridge owner。</zh-CN><en>Underscore is a compatibility input; the result retains canonical BCP 47 only while a warning informs the bridge owner.</en></lang>
  const diagnostics = normalizedLocale.usedLegacyUnderscore
    ? [createTerminologyDiagnostic("TERM_LOCALE_INVALID", "Legacy underscore locale input was canonicalized; candidate storage uses hyphens.", "warning", { candidateId: observation.candidateId })]
    : [];
  // <lang><zh-CN>grammar unknown 仍形成一个可审查的逻辑位置，不猜测短语或伪造 detected text。</zh-CN><en>Grammar-unknown still forms a reviewable logical location without guessing a phrase or fabricating detected text.</en></lang>
  if (observation.extractionKind === "profile-grammar-unknown") {
    diagnostics.push(createTerminologyDiagnostic("TERM_CANDIDATE_GRAMMAR_UNKNOWN", "Profile grammar did not safely identify a terminology candidate.", "warning", { candidateId: observation.candidateId }));
  }
  return {
    candidate: {
      candidateId: observation.candidateId,
      extractionKind: observation.extractionKind,
      locale: normalizedLocale.canonical,
      provenance: { ...observation.provenance },
      scope: { ...observation.scope },
      status: "detected"
    },
    diagnostics
  };
}

/**
 * @lang zh-CN 校验 candidate-set 的 wire shape、生命周期与可选 registry linkage；不执行 I/O 或自动确认。
 * @lang en Validates candidate-set wire shape, lifecycle, and optional registry linkage; it performs no I/O or automatic approval.
 *
 * @param value candidate-set 的未知输入。 / Unknown candidate-set input.
 * @param registry 可选受控 registry，用于检查 linked candidate。 / Optional controlled registry for linked-candidate checks.
 * @returns privacy-safe TERM diagnostics。 / Privacy-safe TERM diagnostics.
 */
export function validateDocumentationTerminologyCandidateSet(value: unknown, registry?: DocumentationTerminologyRegistry): HiaDiagnostic[] {
  // <lang><zh-CN>深度隐私扫描先于结构校验，防止 unknown extension 偷渡 source phrase 或 locator。</zh-CN><en>Deep privacy scanning precedes structural validation so unknown extensions cannot smuggle source phrases or locators.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  if (containsPrivateCandidateData(value)) {
    diagnostics.push(createTerminologyDiagnostic("TERM_PRIVACY_VIOLATION", "Terminology candidate-set must not contain observed text, source body, or raw locator."));
  }
  if (!isRecord(value) || value.contract !== DOCUMENTATION_TERMINOLOGY_CONTRACT || value.contractVersion !== DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION || value.kind !== "documentation-terminology-candidate-set") {
    diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology candidate-set contract, version, or kind is unsupported."));
    return diagnostics;
  }
  if (!isNonEmptyString(value.id) || !Array.isArray(value.candidates) || !isCandidatePrivacyPolicy(value.privacy)) {
    diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology candidate-set misses a required metadata-only field."));
    return diagnostics;
  }

  // <lang><zh-CN>candidateId 只允许在同一 set 内唯一，避免用短语/范围作为不稳定去重依据。</zh-CN><en>candidateId is unique only within its set, avoiding phrase/range-derived unstable de-duplication.</en></lang>
  const candidateIds = new Set<string>();
  const registryByTermId = registry ? new Map(registry.terms.map((entry) => [entry.termId, entry])) : undefined;
  for (const candidate of value.candidates) {
    if (!isCandidate(candidate)) {
      diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology candidate shape is invalid."));
      continue;
    }
    if (candidateIds.has(candidate.candidateId)) {
      diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology candidateId must be unique.", "error", { candidateId: candidate.candidateId }));
    }
    candidateIds.add(candidate.candidateId);
    validateCandidateLocale(candidate, diagnostics);
    validateCandidateLifecycle(candidate, registryByTermId, diagnostics);
  }
  return diagnostics;
}

/**
 * @lang zh-CN 校验受控 registry 的 key、locale、form conflict、lifecycle 与 privacy；registry text 不会出现在 diagnostic data。
 * @lang en Validates controlled-registry keys, locales, form conflicts, lifecycle, and privacy; registry text never appears in diagnostic data.
 *
 * @param value registry 的未知输入。 / Unknown registry input.
 * @returns privacy-safe TERM diagnostics。 / Privacy-safe TERM diagnostics.
 */
export function validateDocumentationTerminologyRegistry(value: unknown): HiaDiagnostic[] {
  // <lang><zh-CN>registry 可以含受控 form 文本，但不能携带 source observation/body/locator。</zh-CN><en>A registry may contain controlled form text but cannot carry source observations, bodies, or locators.</en></lang>
  const diagnostics: HiaDiagnostic[] = [];
  if (containsPrivateRegistryData(value)) {
    diagnostics.push(createTerminologyDiagnostic("TERM_PRIVACY_VIOLATION", "Terminology registry must not contain source body, observed text, or raw locator."));
  }
  if (!isRecord(value) || value.contract !== DOCUMENTATION_TERMINOLOGY_CONTRACT || value.contractVersion !== DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION || value.kind !== "documentation-terminology-registry") {
    diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology registry contract, version, or kind is unsupported."));
    return diagnostics;
  }
  if (!isNonEmptyString(value.id) || !Array.isArray(value.terms) || !isCandidatePrivacyPolicy(value.privacy)) {
    diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology registry misses a required controlled field."));
    return diagnostics;
  }

  // <lang><zh-CN>formOwners 追踪 locale-normalized canonical/synonym 的唯一 owner；只记录 termId，绝不记录文本。</zh-CN><en>formOwners tracks the sole owner of locale-normalized canonical/synonym values; it records termId only, never text.</en></lang>
  const termIds = new Set<string>();
  const formOwners = new Map<string, string>();
  for (const entry of value.terms) {
    if (!isRegistryEntry(entry)) {
      diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology registry entry shape is invalid."));
      continue;
    }
    if (!isTerminologyId(entry.termId) || termIds.has(entry.termId)) {
      diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology termId must be unique and use the term.* grammar.", "error", { termId: entry.termId }));
    }
    termIds.add(entry.termId);
    validateRegistryEntry(entry, formOwners, diagnostics);
  }
  return diagnostics;
}

/**
 * @lang zh-CN 创建可直接交给 W-P57 quality-review aggregation 的无正文 terminology input。
 * @lang en Creates a body-free terminology input that can be handed directly to W-P57 quality-review aggregation.
 *
 * @param candidateSet 已验证或待验证的 candidate set。 / Validated or pending candidate set.
 * @param registry 受控 registry；仅用于 lifecycle/visibility 验证。 / Controlled registry used only for lifecycle/visibility validation.
 * @param id 稳定 quality input identity。 / Stable quality-input identity.
 * @param audience 可见性边界，默认 public。 / Visibility boundary, public by default.
 * @returns 遵守 W-P57 privacy 的 quality input。 / Quality input conforming to W-P57 privacy.
 */
export function createDocumentationTerminologyQualityReviewInput(
  candidateSet: DocumentationTerminologyCandidateSet,
  registry: DocumentationTerminologyRegistry | undefined,
  id: string,
  audience: DocumentationTerminologyQualityAudience = "public"
): DocumentationQualityReviewInput {
  // <lang><zh-CN>先验证受控输入，再把任何失败转换成 unavailable review signal；不会抛出可导致宿主写入的异常。</zh-CN><en>Validate controlled inputs first, then turn any failure into unavailable review signals; no exception can lead to host mutation.</en></lang>
  const inputDiagnostics = [
    ...validateDocumentationTerminologyCandidateSet(candidateSet, registry),
    ...(registry ? validateDocumentationTerminologyRegistry(registry) : [])
  ];
  // <lang><zh-CN>registry map 仅在内存中用于安全的 logical lookup，form 文本不会进入 observation。</zh-CN><en>The registry map is used in memory only for safe logical lookup; form text never enters an observation.</en></lang>
  const registryByTermId = new Map(registry?.terms.map((entry) => [entry.termId, entry]) ?? []);
  const observations = candidateSet.candidates.map((candidate) => createQualityObservation(candidate, registryByTermId.get(candidate.termId ?? ""), audience));
  // <lang><zh-CN>输入级 diagnostic 没有可靠 field scope 时附到稳定 artifact scope，而非虚构 source location。</zh-CN><en>Input-level diagnostics without a reliable field scope attach to a stable artifact scope instead of inventing a source location.</en></lang>
  for (const diagnostic of inputDiagnostics) {
    observations.push({
      category: "terminology",
      confidence: "none",
      diagnosticCodes: [diagnostic.code],
      provenance: { kind: "profile-diagnostic" },
      rule: "terminology-reference-validation",
      scope: { sourceDocumentId: candidateSet.id },
      state: "unavailable"
    });
  }
  return {
    contract: "documentation-quality-review",
    contractVersion: "0.1.0-draft",
    id,
    observations: sortObservations(observations),
    privacy: {
      allowRawLocator: false,
      allowResourceBody: false,
      allowSourceBody: false,
      allowTermPhrase: false
    }
  };
}

/** @lang zh-CN owner validator 使用的 JSON Schema wire shape。 @lang en JSON Schema wire shape used by the owner validator. */
export const DOCUMENTATION_TERMINOLOGY_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOCUMENTATION_TERMINOLOGY_SCHEMA_ID,
  oneOf: [
    { $ref: "#/$defs/candidateSet" },
    { $ref: "#/$defs/registry" }
  ],
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    privacy: {
      type: "object",
      required: ["allowObservedText", "allowRawLocator", "allowSourceBody"],
      additionalProperties: false,
      properties: {
        allowObservedText: { const: false },
        allowRawLocator: { const: false },
        allowSourceBody: { const: false }
      }
    },
    scope: {
      type: "object",
      required: ["annotationKind", "fieldPath", "occurrence", "sourceDocumentId"],
      additionalProperties: false,
      properties: {
        annotationKind: { $ref: "#/$defs/nonEmptyString" },
        fieldPath: { $ref: "#/$defs/nonEmptyString" },
        occurrence: { type: "integer", minimum: 0 },
        sourceDocumentId: { $ref: "#/$defs/nonEmptyString" },
        symbolId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    provenance: {
      type: "object",
      required: ["kind", "profile"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["profile-candidate", "generated-source-linkage"] },
        profile: { $ref: "#/$defs/nonEmptyString" },
        relationId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    review: {
      type: "object",
      required: ["decision", "reviewId"],
      additionalProperties: false,
      properties: {
        decision: { enum: ["reviewed", "linked", "ignored"] },
        reviewId: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    candidate: {
      type: "object",
      required: ["candidateId", "extractionKind", "locale", "provenance", "scope", "status"],
      additionalProperties: false,
      properties: {
        candidateId: { $ref: "#/$defs/nonEmptyString" },
        extractionKind: { enum: [...DOCUMENTATION_TERMINOLOGY_EXTRACTION_KINDS] },
        locale: { $ref: "#/$defs/nonEmptyString" },
        provenance: { $ref: "#/$defs/provenance" },
        review: { $ref: "#/$defs/review" },
        scope: { $ref: "#/$defs/scope" },
        status: { enum: [...DOCUMENTATION_TERMINOLOGY_CANDIDATE_STATUSES] },
        termId: { pattern: "^term\\.[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$", type: "string" }
      }
    },
    candidateSet: {
      type: "object",
      required: ["candidates", "contract", "contractVersion", "id", "kind", "privacy"],
      additionalProperties: false,
      properties: {
        candidates: { type: "array", items: { $ref: "#/$defs/candidate" } },
        contract: { const: DOCUMENTATION_TERMINOLOGY_CONTRACT },
        contractVersion: { const: DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION },
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { const: "documentation-terminology-candidate-set" },
        privacy: { $ref: "#/$defs/privacy" }
      }
    },
    form: {
      type: "object",
      required: ["canonical"],
      additionalProperties: false,
      properties: {
        canonical: { $ref: "#/$defs/nonEmptyString" },
        synonyms: { type: "array", items: { $ref: "#/$defs/nonEmptyString" } }
      }
    },
    registryEntry: {
      type: "object",
      required: ["forms", "lifecycle", "provenance", "termId", "visibility"],
      additionalProperties: false,
      properties: {
        definition: { type: "object", additionalProperties: { type: "string" } },
        forms: { type: "object", minProperties: 1, additionalProperties: { $ref: "#/$defs/form" } },
        lifecycle: { enum: [...DOCUMENTATION_TERMINOLOGY_LIFECYCLES] },
        provenance: {
          type: "object",
          required: ["kind", "recordId"],
          additionalProperties: false,
          properties: {
            kind: { const: "human-confirmed" },
            recordId: { $ref: "#/$defs/nonEmptyString" }
          }
        },
        replaces: { type: "array", items: { pattern: "^term\\.[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$", type: "string" } },
        termId: { pattern: "^term\\.[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$", type: "string" },
        visibility: { enum: [...DOCUMENTATION_TERMINOLOGY_VISIBILITIES] }
      }
    },
    registry: {
      type: "object",
      required: ["contract", "contractVersion", "id", "kind", "privacy", "terms"],
      additionalProperties: false,
      properties: {
        contract: { const: DOCUMENTATION_TERMINOLOGY_CONTRACT },
        contractVersion: { const: DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION },
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { const: "documentation-terminology-registry" },
        privacy: { $ref: "#/$defs/privacy" },
        terms: { type: "array", items: { $ref: "#/$defs/registryEntry" } }
      }
    }
  }
} as const;

/** @lang zh-CN 判断 stable term identity grammar。 @lang en Checks stable term-identity grammar. */
export function isDocumentationTerminologyId(value: string): boolean {
  return isTerminologyId(value);
}

/** @lang zh-CN 创建单条 terminology diagnostic。 @lang en Creates one terminology diagnostic. */
function createTerminologyDiagnostic(
  code: typeof DOCUMENTATION_TERMINOLOGY_DIAGNOSTIC_CODE_REGISTRY[number]["code"],
  message: string,
  severity: HiaDiagnosticSeverity = diagnosticSeverityFor(code),
  data: Record<string, unknown> = {}
): HiaDiagnostic {
  // <lang><zh-CN>diagnostic data 只允许 logical identity；调用者绝不能用 message/data 回显 form 或 source text。</zh-CN><en>Diagnostic data permits logical identity only; callers must never echo forms or source text through message/data.</en></lang>
  return createHiaDiagnostic(code, message, severity, Object.keys(data).length > 0 ? { data } : {});
}

/** @lang zh-CN 校验 candidate locale 必须已经是 canonical BCP 47。 @lang en Checks that a candidate locale is already canonical BCP 47. */
function validateCandidateLocale(candidate: DocumentationTerminologyCandidate, diagnostics: HiaDiagnostic[]): void {
  const normalized = canonicalizeDocumentationLocale(candidate.locale);
  if (!normalized || normalized.canonical !== candidate.locale || normalized.usedLegacyUnderscore) {
    diagnostics.push(createTerminologyDiagnostic("TERM_LOCALE_INVALID", "Terminology candidate locale must be canonical BCP 47.", "error", { candidateId: candidate.candidateId }));
  }
}

/** @lang zh-CN 校验 human-review 与 approved term 的 linkage 不变量。 @lang en Checks human-review and approved-term linkage invariants. */
function validateCandidateLifecycle(
  candidate: DocumentationTerminologyCandidate,
  registryByTermId: Map<string, DocumentationTerminologyRegistryEntry> | undefined,
  diagnostics: HiaDiagnostic[]
): void {
  // <lang><zh-CN>grammar unknown 不允许被伪装成已链接术语；必须先由 profile/人审解决语法边界。</zh-CN><en>Grammar-unknown cannot masquerade as a linked term; profile/human review must resolve the grammar boundary first.</en></lang>
  if (candidate.extractionKind === "profile-grammar-unknown" && candidate.status === "linked") {
    diagnostics.push(createTerminologyDiagnostic("TERM_CANDIDATE_GRAMMAR_UNKNOWN", "A grammar-unknown candidate cannot be linked to a term.", "error", { candidateId: candidate.candidateId }));
  }
  if (candidate.status === "detected") {
    if (candidate.review || candidate.termId) {
      diagnostics.push(createTerminologyDiagnostic("TERM_LIFECYCLE_VIOLATION", "A detected candidate cannot carry review or term linkage.", "error", { candidateId: candidate.candidateId }));
    }
    return;
  }
  if (!candidate.review || candidate.review.decision !== candidate.status || !isNonEmptyString(candidate.review.reviewId)) {
    diagnostics.push(createTerminologyDiagnostic("TERM_LIFECYCLE_VIOLATION", "Candidate lifecycle state requires a matching human-review record.", "error", { candidateId: candidate.candidateId }));
  }
  if (candidate.status === "linked") {
    if (!candidate.termId || !isTerminologyId(candidate.termId) || !registryByTermId) {
      diagnostics.push(createTerminologyDiagnostic("TERM_LIFECYCLE_VIOLATION", "A linked candidate requires a controlled registry and stable approved termId.", "error", { candidateId: candidate.candidateId }));
      return;
    }
    const linkedTerm = registryByTermId.get(candidate.termId);
    if (!linkedTerm || linkedTerm.lifecycle !== "approved") {
      diagnostics.push(createTerminologyDiagnostic("TERM_LIFECYCLE_VIOLATION", "A linked candidate must reference an approved registry term.", "error", { candidateId: candidate.candidateId, termId: candidate.termId }));
    }
  } else if (candidate.termId) {
    diagnostics.push(createTerminologyDiagnostic("TERM_LIFECYCLE_VIOLATION", "Only a linked candidate may carry termId.", "error", { candidateId: candidate.candidateId }));
  }
}

/** @lang zh-CN 校验 registry entry 并登记无文本的 form owner。 @lang en Validates a registry entry and registers a text-free form owner. */
function validateRegistryEntry(entry: DocumentationTerminologyRegistryEntry, formOwners: Map<string, string>, diagnostics: HiaDiagnostic[]): void {
  if (entry.lifecycle === "approved" && Object.keys(entry.forms).length === 0) {
    diagnostics.push(createTerminologyDiagnostic("TERM_LOCALE_MISSING", "An approved terminology entry requires at least one locale form.", "error", { termId: entry.termId }));
  }
  for (const [locale, form] of Object.entries(entry.forms)) {
    // <lang><zh-CN>locale map key 在 wire shape 中直接承载 canonical locale，因此不接受 legacy spelling。</zh-CN><en>The locale map key directly carries canonical locale in the wire shape, so legacy spelling is not accepted.</en></lang>
    const normalizedLocale = canonicalizeDocumentationLocale(locale);
    if (!normalizedLocale || normalizedLocale.canonical !== locale || normalizedLocale.usedLegacyUnderscore) {
      diagnostics.push(createTerminologyDiagnostic("TERM_LOCALE_INVALID", "Terminology registry locale key must be canonical BCP 47.", "error", { termId: entry.termId }));
      continue;
    }
    if (!isForm(form)) {
      diagnostics.push(createTerminologyDiagnostic("TERM_REGISTRY_KEY_INVALID", "Terminology registry form shape is invalid.", "error", { termId: entry.termId }));
      continue;
    }
    // <lang><zh-CN>canonical 与 synonym 都以 case-folded in-memory key 比较，diagnostic 只公开 termId 与 locale。</zh-CN><en>Canonical and synonym values compare via case-folded in-memory keys; diagnostics expose only termId and locale.</en></lang>
    const normalizedForms = [form.canonical, ...(form.synonyms ?? [])].map((value) => value.trim()).filter(Boolean);
    if (new Set(normalizedForms.map((value) => value.toLocaleLowerCase(locale))).size !== normalizedForms.length) {
      diagnostics.push(createTerminologyDiagnostic("TERM_FORM_CONFLICT", "Terminology canonical form and synonyms must be unique within a locale.", "error", { locale, termId: entry.termId }));
    }
    for (const value of normalizedForms) {
      const formKey = `${locale}\u0000${value.toLocaleLowerCase(locale)}`;
      const existingOwner = formOwners.get(formKey);
      if (existingOwner && existingOwner !== entry.termId) {
        diagnostics.push(createTerminologyDiagnostic("TERM_FORM_CONFLICT", "Terminology form conflicts with another term in the same locale.", "error", { locale, termId: entry.termId }));
      } else {
        formOwners.set(formKey, entry.termId);
      }
    }
  }
}

/** @lang zh-CN 将一个 candidate 映射为 quality observation；永远不带 form/phrase。 @lang en Maps one candidate to a quality observation; it never carries a form or phrase. */
function createQualityObservation(
  candidate: DocumentationTerminologyCandidate,
  linkedTerm: DocumentationTerminologyRegistryEntry | undefined,
  audience: DocumentationTerminologyQualityAudience
): DocumentationQualityReviewObservation {
  const diagnosticCodes: string[] = [];
  let confidence: DocumentationQualityReviewObservation["confidence"] = "medium";
  let state: DocumentationQualityReviewObservation["state"] = "observed";
  let rule = "candidate-human-review";
  if (candidate.extractionKind === "profile-grammar-unknown") {
    diagnosticCodes.push("TERM_CANDIDATE_GRAMMAR_UNKNOWN");
    confidence = "none";
    state = "unavailable";
    rule = "candidate-grammar";
  } else if (candidate.status === "linked") {
    confidence = "high";
    rule = "candidate-linked-human-review";
    if (!linkedTerm || linkedTerm.lifecycle !== "approved") {
      diagnosticCodes.push("TERM_LIFECYCLE_VIOLATION");
      confidence = "none";
      state = "unavailable";
    } else if (audience === "public" && linkedTerm.visibility !== "public") {
      diagnosticCodes.push("TERM_VISIBILITY_DENIED");
      confidence = "low";
      rule = "candidate-visibility-review";
    }
  }
  return {
    category: "terminology",
    confidence,
    diagnosticCodes,
    provenance: { kind: candidate.provenance.kind === "generated-source-linkage" ? "generated-source-linkage" : "profile-diagnostic" },
    rule,
    scope: {
      fieldPath: candidate.scope.fieldPath,
      occurrence: candidate.scope.occurrence,
      profile: candidate.provenance.profile,
      sourceDocumentId: candidate.scope.sourceDocumentId,
      // <lang><zh-CN>exactOptionalPropertyTypes 下缺失 symbolId 必须省略，不能序列化为 undefined。</zh-CN><en>With exactOptionalPropertyTypes, an absent symbolId must be omitted rather than serialized as undefined.</en></lang>
      ...(candidate.scope.symbolId ? { symbolId: candidate.scope.symbolId } : {})
    },
    state
  };
}

/** @lang zh-CN 以 stable scope/rule 排序 quality observations。 @lang en Sorts quality observations by stable scope and rule. */
function sortObservations(observations: DocumentationQualityReviewObservation[]): DocumentationQualityReviewObservation[] {
  return [...observations].sort((left, right) => JSON.stringify([left.scope.sourceDocumentId, left.scope.fieldPath, left.scope.occurrence, left.rule]).localeCompare(JSON.stringify([right.scope.sourceDocumentId, right.scope.fieldPath, right.scope.occurrence, right.rule])));
}

/** @lang zh-CN 检测 candidate artifact 的禁止私有字段。 @lang en Detects prohibited private fields in a candidate artifact. */
function containsPrivateCandidateData(value: unknown, propertyName = ""): boolean {
  const forbiddenPropertyNames = new Set(["absolutepath", "ast", "body", "content", "locator", "observedtext", "range", "rawlocator", "snippet", "sourcebody"]);
  if (forbiddenPropertyNames.has(propertyName.toLowerCase())) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsPrivateCandidateData(item));
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nested]) => containsPrivateCandidateData(nested, key));
}

/** @lang zh-CN 检测 registry 中除允许 form/definition 外的禁止私有字段。 @lang en Detects prohibited private fields in a registry except permitted forms/definitions. */
function containsPrivateRegistryData(value: unknown, propertyName = ""): boolean {
  const forbiddenPropertyNames = new Set(["absolutepath", "ast", "body", "content", "locator", "observedtext", "range", "rawlocator", "snippet", "sourcebody"]);
  if (forbiddenPropertyNames.has(propertyName.toLowerCase())) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsPrivateRegistryData(item));
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nested]) => containsPrivateRegistryData(nested, key));
}

/** @lang zh-CN 判断 candidate artifact privacy policy。 @lang en Checks the candidate-artifact privacy policy. */
function isCandidatePrivacyPolicy(value: unknown): value is DocumentationTerminologyCandidateSet["privacy"] {
  return isRecord(value) && value.allowObservedText === false && value.allowRawLocator === false && value.allowSourceBody === false;
}

/** @lang zh-CN 判断完整 candidate shape。 @lang en Checks a complete candidate shape. */
function isCandidate(value: unknown): value is DocumentationTerminologyCandidate {
  if (!isRecord(value) || !isNonEmptyString(value.candidateId) || !isNonEmptyString(value.locale) || !isScope(value.scope) || !isCandidateProvenance(value.provenance)) {
    return false;
  }
  if (!DOCUMENTATION_TERMINOLOGY_EXTRACTION_KINDS.includes(value.extractionKind as DocumentationTerminologyCandidate["extractionKind"]) || !DOCUMENTATION_TERMINOLOGY_CANDIDATE_STATUSES.includes(value.status as DocumentationTerminologyCandidate["status"])) {
    return false;
  }
  return (value.review === undefined || isHumanReview(value.review)) && (value.termId === undefined || isNonEmptyString(value.termId));
}

/** @lang zh-CN 判断 registry entry shape。 @lang en Checks registry-entry shape. */
function isRegistryEntry(value: unknown): value is DocumentationTerminologyRegistryEntry {
  return isRecord(value)
    && isNonEmptyString(value.termId)
    && isRecord(value.forms)
    && DOCUMENTATION_TERMINOLOGY_LIFECYCLES.includes(value.lifecycle as DocumentationTerminologyRegistryEntry["lifecycle"])
    && DOCUMENTATION_TERMINOLOGY_VISIBILITIES.includes(value.visibility as DocumentationTerminologyRegistryEntry["visibility"])
    && isRecord(value.provenance)
    && value.provenance.kind === "human-confirmed"
    && isNonEmptyString(value.provenance.recordId);
}

/** @lang zh-CN 判断 locale form shape。 @lang en Checks locale-form shape. */
function isForm(value: unknown): value is DocumentationTerminologyForm {
  return isRecord(value) && isNonEmptyString(value.canonical) && (value.synonyms === undefined || (Array.isArray(value.synonyms) && value.synonyms.every(isNonEmptyString)));
}

/** @lang zh-CN 判断 candidate scope。 @lang en Checks candidate scope. */
function isScope(value: unknown): value is DocumentationTerminologyScope {
  return isRecord(value)
    && isNonEmptyString(value.annotationKind)
    && isNonEmptyString(value.fieldPath)
    && Number.isInteger(value.occurrence)
    && typeof value.occurrence === "number"
    && value.occurrence >= 0
    && isNonEmptyString(value.sourceDocumentId)
    && (value.symbolId === undefined || isNonEmptyString(value.symbolId));
}

/** @lang zh-CN 判断 candidate provenance。 @lang en Checks candidate provenance. */
function isCandidateProvenance(value: unknown): value is DocumentationTerminologyCandidateProvenance {
  return isRecord(value)
    && (value.kind === "profile-candidate" || value.kind === "generated-source-linkage")
    && isNonEmptyString(value.profile)
    && (value.relationId === undefined || isNonEmptyString(value.relationId));
}

/** @lang zh-CN 判断 human review record。 @lang en Checks a human-review record. */
function isHumanReview(value: unknown): value is DocumentationTerminologyHumanReview {
  return isRecord(value)
    && (value.decision === "reviewed" || value.decision === "linked" || value.decision === "ignored")
    && isNonEmptyString(value.reviewId);
}

/** @lang zh-CN 判断 stable termId grammar。 @lang en Checks stable termId grammar. */
function isTerminologyId(value: string): boolean {
  return /^term\.[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/.test(value);
}

/** @lang zh-CN 判断 non-empty string。 @lang en Checks a non-empty string. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** @lang zh-CN 判断 plain record。 @lang en Checks a plain record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @lang zh-CN 查找 diagnostic 的默认 severity。 @lang en Finds the default severity for a diagnostic. */
function diagnosticSeverityFor(code: typeof DOCUMENTATION_TERMINOLOGY_DIAGNOSTIC_CODE_REGISTRY[number]["code"]): HiaDiagnosticSeverity {
  return DOCUMENTATION_TERMINOLOGY_DIAGNOSTIC_CODE_REGISTRY.find((definition) => definition.code === code)?.defaultSeverity ?? "error";
}
