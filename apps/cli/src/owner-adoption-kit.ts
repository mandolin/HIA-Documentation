import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @lang zh-CN 可复用 target-owner adoption kit 的中性 contract 名称；它只编排既有 contract，不授予目标执行权。
 * @lang en Neutral contract name for the reusable target-owner adoption kit; it composes existing contracts without granting target execution authority.
 */
export const TARGET_OWNER_ADOPTION_KIT_CONTRACT = "target-owner-adoption-kit" as const;

/**
 * @lang zh-CN adoption kit 的首个 exact-match 草案版本；未知 future draft 必须 fail closed。
 * @lang en First exact-match draft version of the adoption kit; unknown future drafts must fail closed.
 */
export const TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION = "0.1.0-draft" as const;

/**
 * @lang zh-CN CLI owner-local JSON Schema identity；该 URI 只表示 identity，不承诺在线分发。
 * @lang en CLI owner-local JSON Schema identity; the URI is identity only and does not promise online distribution.
 */
export const TARGET_OWNER_ADOPTION_KIT_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/target-owner-adoption-kit-0.1.0-draft.schema.json" as const;

/** @lang zh-CN W-P89 首轮允许的两个 owner-mediated family。 @lang en Two owner-mediated families allowed by the first W-P89 slice. */
export const TARGET_OWNER_ADOPTION_KIT_FAMILIES = ["enterprise-business", "workspace-container"] as const;

/** @lang zh-CN adoption kit family。 @lang en Adoption-kit family. */
export type TargetOwnerAdoptionKitFamily = typeof TARGET_OWNER_ADOPTION_KIT_FAMILIES[number];

/** @lang zh-CN owner 可记录的反馈决策；任何值都不等价于 adoption。 @lang en Owner feedback decisions; no value is equivalent to adoption. */
export const TARGET_OWNER_ADOPTION_KIT_DECISIONS = [
  "not-recorded",
  "owner-submitted-valid",
  "owner-submitted-rejected",
  "owner-deferred",
  "owner-blocked",
  "follow-up-required"
] as const;

/** @lang zh-CN owner feedback decision。 @lang en Owner feedback decision. */
export type TargetOwnerAdoptionKitDecision = typeof TARGET_OWNER_ADOPTION_KIT_DECISIONS[number];

/** @lang zh-CN fixed diagnostic catalog；message 不反射 caller value。 @lang en Fixed diagnostic catalog whose messages never reflect caller values. */
export const TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES = [
  "HIA_OWNER_ADOPTION_KIT_REQUEST_INVALID",
  "HIA_OWNER_ADOPTION_KIT_CONTRACT_REFERENCE_INVALID",
  "HIA_OWNER_ADOPTION_KIT_OWNER_INPUT_MISSING",
  "HIA_OWNER_ADOPTION_KIT_OWNER_ATTESTATION_INVALID",
  "HIA_OWNER_ADOPTION_KIT_WORKSPACE_HANDOFF_INVALID",
  "HIA_OWNER_ADOPTION_KIT_PRIVACY_REFUSED",
  "HIA_OWNER_ADOPTION_KIT_PERMISSION_OR_ADOPTION_REFUSED"
] as const;

/** @lang zh-CN adoption kit diagnostic code。 @lang en Adoption-kit diagnostic code. */
export type TargetOwnerAdoptionKitDiagnosticCode = typeof TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES[number];

/**
 * @lang zh-CN owner-operated kit 的 closed request；所有内容均为 public-safe metadata 或既有 contract ref。
 * @lang en Closed request for an owner-operated kit; every field is public-safe metadata or an existing contract reference.
 */
export interface TargetOwnerAdoptionKitRequest {
  contract: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT;
  contractVersion: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION;
  trialId: string;
  targetId: string;
  targetFamily: TargetOwnerAdoptionKitFamily;
  ownerInput: {
    submitted: boolean;
    consent: "not-recorded" | "recorded-for-review";
    attestation: "not-provided" | "target-owner-attested";
    decision: TargetOwnerAdoptionKitDecision;
    redactionAttested: boolean;
  };
  providedContractRefs: string[];
  workspaceHandoff?: {
    state: "owner-review-required";
    repositoryOwnerCount: number;
    handoffEdgeCount: number;
    runtimeDependencyTransfer: false;
    targetWriteRequired: false;
  };
  privacy: {
    sourceBodyIncluded: false;
    artifactBodyIncluded: false;
    evidenceBodyIncluded: false;
    commandOutputBodyIncluded: false;
    absoluteOrPrivatePathIncluded: false;
    credentialIncluded: false;
    workingStateIncluded: false;
    sourcesContentPolicy: "none";
  };
  permissions: {
    targetRepositoryRead: false;
    targetRepositoryWrite: false;
    targetCommandExecuted: false;
    targetRuntimeOpened: false;
    targetBranchOrPrCreated: false;
    networkAccessed: false;
    packagePublished: false;
    targetAdoptionClaimed: false;
  };
}

/** @lang zh-CN 固定且不反射 caller data 的 report diagnostic。 @lang en Fixed report diagnostic that does not reflect caller data. */
export interface TargetOwnerAdoptionKitDiagnostic {
  code: TargetOwnerAdoptionKitDiagnosticCode;
  message: string;
  severity: "error" | "warning";
}

/**
 * @lang zh-CN Portal 可消费的最小投影；不含 target/trial identity、path、body、owner identity 或工作区状态。
 * @lang en Minimal Portal projection without target/trial identity, paths, bodies, owner identity, or working state.
 */
export interface TargetOwnerAdoptionPortalSummary {
  contract: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT;
  contractVersion: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION;
  projection: "portal-metadata-only";
  status: TargetOwnerAdoptionKitReport["status"];
  targetFamily: TargetOwnerAdoptionKitFamily;
  ownerInput: {
    submitted: boolean;
    consent: "not-recorded" | "recorded-for-review";
  };
  contracts: {
    requiredCount: number;
    providedCount: number;
    missingCount: number;
  };
  workspaceHandoff?: {
    repositoryOwnerCount: number;
    handoffEdgeCount: number;
    state: "owner-review-required";
  };
  semantics: {
    resolution: "owner-input-validated" | "owner-input-not-received" | "unresolved";
    confidence: "caller-provided-unverified";
    provenance: "metadata-only-owner-kit";
  };
}

/**
 * @lang zh-CN 可复用 adoption kit report；`ready` 只表示可供 owner review，不表示目标已采用。
 * @lang en Reusable adoption-kit report; `ready` means ready for owner review, never that a target adopted it.
 */
export interface TargetOwnerAdoptionKitReport {
  contract: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT;
  contractVersion: typeof TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION;
  status: "ready-for-owner-review" | "deferred-owner-input-missing" | "refused";
  trial: {
    id: string;
    targetId: string;
    targetFamily: TargetOwnerAdoptionKitFamily;
    workflow: "enterprise-continuity" | "workspace-handoff-review";
  };
  ownerInput: {
    submitted: boolean;
    consent: "not-recorded" | "recorded-for-review";
    attestation: "not-provided" | "target-owner-attested";
    decision: TargetOwnerAdoptionKitDecision;
    redactionAttested: boolean;
  };
  contracts: {
    required: string[];
    providedCount: number;
    missingCount: number;
  };
  workspaceHandoff?: {
    repositoryOwnerCount: number;
    handoffEdgeCount: number;
    state: "owner-review-required";
    runtimeDependencyTransfer: false;
    targetWriteRequired: false;
  };
  portalSummary: TargetOwnerAdoptionPortalSummary;
  semantics: TargetOwnerAdoptionPortalSummary["semantics"] & {
    consent: "not-recorded" | "recorded-for-review";
    adoption: "not-asserted";
  };
  privacy: {
    sourceBodySerialized: false;
    artifactBodySerialized: false;
    evidenceBodySerialized: false;
    commandOutputBodySerialized: false;
    pathSerialized: false;
    credentialSerialized: false;
    workingStateSerialized: false;
    sourcesContentPolicy: "none";
  };
  permissions: {
    targetRepositoryRead: false;
    targetRepositoryWrite: false;
    targetCommandExecuted: false;
    targetRuntimeOpened: false;
    targetBranchOrPrCreated: false;
    networkAccessed: false;
    packagePublished: false;
    targetAdoptionClaimed: false;
  };
  diagnostics: TargetOwnerAdoptionKitDiagnostic[];
}

const ENTERPRISE_REQUIRED_CONTRACT_REFS = [
  "hia-generated-docs-evidence-summary@0.1.0-draft",
  "target-documentation-acceptance@0.1.0-draft",
  "target-documentation-continuity@0.1.0-draft",
  "hia-owner-provided-evidence-packet@0.1.0-draft",
  "hia-wp46-target-owner-handoff-report-packet@0.1.0-draft"
] as const;

const WORKSPACE_REQUIRED_CONTRACT_REFS = [
  "workspace-documentation-handoff@0.1.0-draft",
  "hia-generated-docs-evidence-summary@0.1.0-draft",
  "target-documentation-acceptance@0.1.0-draft",
  "documentation-portal-information-architecture@0.1.0-draft",
  "hia-owner-provided-evidence-packet@0.1.0-draft"
] as const;

const PRIVACY_FIELDS = [
  "sourceBodyIncluded",
  "artifactBodyIncluded",
  "evidenceBodyIncluded",
  "commandOutputBodyIncluded",
  "absoluteOrPrivatePathIncluded",
  "credentialIncluded",
  "workingStateIncluded",
  "sourcesContentPolicy"
] as const;

const PERMISSION_FIELDS = [
  "targetRepositoryRead",
  "targetRepositoryWrite",
  "targetCommandExecuted",
  "targetRuntimeOpened",
  "targetBranchOrPrCreated",
  "networkAccessed",
  "packagePublished",
  "targetAdoptionClaimed"
] as const;

/**
 * @lang zh-CN `target-owner-adoption-kit@0.1.0-draft` 的 CLI owner-local Draft 2020-12 JSON Schema。
 * @lang en CLI owner-local Draft 2020-12 JSON Schema for `target-owner-adoption-kit@0.1.0-draft`.
 */
export const TARGET_OWNER_ADOPTION_KIT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: TARGET_OWNER_ADOPTION_KIT_SCHEMA_ID,
  title: "Target Owner Adoption Kit",
  type: "object",
  additionalProperties: false,
  required: ["contract", "contractVersion", "status", "trial", "ownerInput", "contracts", "portalSummary", "semantics", "privacy", "permissions", "diagnostics"],
  properties: {
    contract: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT },
    contractVersion: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION },
    status: { enum: ["ready-for-owner-review", "deferred-owner-input-missing", "refused"] },
    trial: {
      type: "object",
      additionalProperties: false,
      required: ["id", "targetId", "targetFamily", "workflow"],
      properties: {
        id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" },
        targetId: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" },
        targetFamily: { enum: TARGET_OWNER_ADOPTION_KIT_FAMILIES },
        workflow: { enum: ["enterprise-continuity", "workspace-handoff-review"] }
      }
    },
    ownerInput: { $ref: "#/$defs/ownerInput" },
    contracts: {
      type: "object",
      additionalProperties: false,
      required: ["required", "providedCount", "missingCount"],
      properties: {
        required: { type: "array", minItems: 5, maxItems: 5, uniqueItems: true, items: { type: "string" } },
        providedCount: { type: "integer", minimum: 0 },
        missingCount: { type: "integer", minimum: 0 }
      }
    },
    workspaceHandoff: { $ref: "#/$defs/workspaceHandoff" },
    portalSummary: { $ref: "#/$defs/portalSummary" },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance", "consent", "adoption"],
      properties: {
        resolution: { enum: ["owner-input-validated", "owner-input-not-received", "unresolved"] },
        confidence: { const: "caller-provided-unverified" },
        provenance: { const: "metadata-only-owner-kit" },
        consent: { enum: ["not-recorded", "recorded-for-review"] },
        adoption: { const: "not-asserted" }
      }
    },
    privacy: { $ref: "#/$defs/reportPrivacy" },
    permissions: { $ref: "#/$defs/permissions" },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "message", "severity"],
        properties: {
          code: { enum: TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES },
          message: { type: "string" },
          severity: { enum: ["error", "warning"] }
        }
      }
    }
  },
  $defs: {
    ownerInput: {
      type: "object",
      additionalProperties: false,
      required: ["submitted", "consent", "attestation", "decision", "redactionAttested"],
      properties: {
        submitted: { type: "boolean" },
        consent: { enum: ["not-recorded", "recorded-for-review"] },
        attestation: { enum: ["not-provided", "target-owner-attested"] },
        decision: { enum: TARGET_OWNER_ADOPTION_KIT_DECISIONS },
        redactionAttested: { type: "boolean" }
      }
    },
    workspaceHandoff: {
      type: "object",
      additionalProperties: false,
      required: ["repositoryOwnerCount", "handoffEdgeCount", "state", "runtimeDependencyTransfer", "targetWriteRequired"],
      properties: {
        repositoryOwnerCount: { type: "integer", minimum: 2 },
        handoffEdgeCount: { type: "integer", minimum: 1 },
        state: { const: "owner-review-required" },
        runtimeDependencyTransfer: { const: false },
        targetWriteRequired: { const: false }
      }
    },
    semantics: {
      type: "object",
      additionalProperties: false,
      required: ["resolution", "confidence", "provenance"],
      properties: {
        resolution: { enum: ["owner-input-validated", "owner-input-not-received", "unresolved"] },
        confidence: { const: "caller-provided-unverified" },
        provenance: { const: "metadata-only-owner-kit" }
      }
    },
    portalSummary: {
      type: "object",
      additionalProperties: false,
      required: ["contract", "contractVersion", "projection", "status", "targetFamily", "ownerInput", "contracts", "semantics"],
      properties: {
        contract: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT },
        contractVersion: { const: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION },
        projection: { const: "portal-metadata-only" },
        status: { enum: ["ready-for-owner-review", "deferred-owner-input-missing", "refused"] },
        targetFamily: { enum: TARGET_OWNER_ADOPTION_KIT_FAMILIES },
        ownerInput: {
          type: "object",
          additionalProperties: false,
          required: ["submitted", "consent"],
          properties: { submitted: { type: "boolean" }, consent: { enum: ["not-recorded", "recorded-for-review"] } }
        },
        contracts: {
          type: "object",
          additionalProperties: false,
          required: ["requiredCount", "providedCount", "missingCount"],
          properties: {
            requiredCount: { type: "integer", minimum: 0 },
            providedCount: { type: "integer", minimum: 0 },
            missingCount: { type: "integer", minimum: 0 }
          }
        },
        workspaceHandoff: {
          type: "object",
          additionalProperties: false,
          required: ["repositoryOwnerCount", "handoffEdgeCount", "state"],
          properties: {
            repositoryOwnerCount: { type: "integer", minimum: 2 },
            handoffEdgeCount: { type: "integer", minimum: 1 },
            state: { const: "owner-review-required" }
          }
        },
        semantics: { $ref: "#/$defs/semantics" }
      }
    },
    reportPrivacy: {
      type: "object",
      additionalProperties: false,
      required: ["sourceBodySerialized", "artifactBodySerialized", "evidenceBodySerialized", "commandOutputBodySerialized", "pathSerialized", "credentialSerialized", "workingStateSerialized", "sourcesContentPolicy"],
      properties: {
        sourceBodySerialized: { const: false }, artifactBodySerialized: { const: false }, evidenceBodySerialized: { const: false },
        commandOutputBodySerialized: { const: false }, pathSerialized: { const: false }, credentialSerialized: { const: false },
        workingStateSerialized: { const: false }, sourcesContentPolicy: { const: "none" }
      }
    },
    permissions: {
      type: "object",
      additionalProperties: false,
      required: PERMISSION_FIELDS,
      properties: {
        targetRepositoryRead: { const: false }, targetRepositoryWrite: { const: false }, targetCommandExecuted: { const: false },
        targetRuntimeOpened: { const: false }, targetBranchOrPrCreated: { const: false }, networkAccessed: { const: false },
        packagePublished: { const: false }, targetAdoptionClaimed: { const: false }
      }
    }
  }
} as const;

/**
 * @lang zh-CN 从 public-safe request 创建 deterministic adoption kit；pure evaluator 不读取文件、目标或网络。
 * @lang en Creates a deterministic adoption kit from a public-safe request; the pure evaluator reads no files, targets, or network.
 *
 * @param request caller-provided metadata request。 / Caller-provided metadata request.
 * @returns ready、deferred 或 refused report；永不声明 adoption。 / Ready, deferred, or refused report that never claims adoption.
 */
export function createTargetOwnerAdoptionKit(request: TargetOwnerAdoptionKitRequest): TargetOwnerAdoptionKitReport {
  // <lang><zh-CN>恢复 unknown trust boundary，所有 nested object 均重新做 closed-world runtime validation。</zh-CN><en>Return to an unknown trust boundary and revalidate every nested object as closed-world runtime data.</en></lang>
  const untrusted: unknown = request;
  const candidate = isRecord(untrusted) ? untrusted : {};
  const family = isTargetFamily(candidate.targetFamily) ? candidate.targetFamily : "enterprise-business";
  const required = [...requiredContractRefs(family)];
  const providedRefs = normalizeContractRefs(candidate.providedContractRefs);
  const missingCount = required.filter((ref) => !providedRefs.includes(ref)).length;
  const diagnostics: TargetOwnerAdoptionKitDiagnostic[] = [];
  const ownerInput = normalizeOwnerInput(candidate.ownerInput);
  const requestValid = hasOnlyExactKeys(candidate, [
    "contract", "contractVersion", "trialId", "targetId", "targetFamily", "ownerInput", "providedContractRefs", "privacy", "permissions"
  ], ["workspaceHandoff"])
    && candidate.contract === TARGET_OWNER_ADOPTION_KIT_CONTRACT
    && candidate.contractVersion === TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION
    && isStableIdentifier(candidate.trialId)
    && isStableIdentifier(candidate.targetId)
    && isTargetFamily(candidate.targetFamily)
    && isOwnerInput(candidate.ownerInput);

  if (!requestValid) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_REQUEST_INVALID", "Target-owner adoption kit requires an exact request, supported draft, stable identities, and a supported family.", "error");
  }

  // <lang><zh-CN>provided refs 只能是本 family 已冻结的 exact refs；缺失只在 owner 声称已提交时成为拒绝。</zh-CN><en>Provided refs must be exact frozen refs for this family; missing refs become a refusal only after the owner claims submission.</en></lang>
  const refsValid = isStringArray(candidate.providedContractRefs)
    && new Set(candidate.providedContractRefs).size === candidate.providedContractRefs.length
    && candidate.providedContractRefs.every((ref) => required.includes(ref as never));
  if (!refsValid || (ownerInput.submitted && missingCount > 0)) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_CONTRACT_REFERENCE_INVALID", "Target-owner adoption kit requires unique exact contract references for the selected family.", "error");
  }

  if (!ownerInput.submitted) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_OWNER_INPUT_MISSING", "Target-owner input is not recorded; the kit remains deferred without an adoption claim.", "warning");
  } else if (ownerInput.consent !== "recorded-for-review"
    || ownerInput.attestation !== "target-owner-attested"
    || ownerInput.decision === "not-recorded"
    || !ownerInput.redactionAttested) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_OWNER_ATTESTATION_INVALID", "Submitted owner input requires review consent, owner attestation, a recorded decision, and public-safe redaction attestation.", "error");
  }

  const workspaceHandoff = normalizeWorkspaceHandoff(candidate.workspaceHandoff);
  const workspaceValid = family === "workspace-container"
    ? (!ownerInput.submitted || isWorkspaceHandoff(candidate.workspaceHandoff))
    : candidate.workspaceHandoff === undefined;
  if (!workspaceValid) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_WORKSPACE_HANDOFF_INVALID", "Workspace handoff review requires count-only owner and edge metadata with no runtime transfer or target write.", "error");
  }

  if (!isRequestPrivacy(candidate.privacy)) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_PRIVACY_REFUSED", "Target-owner adoption kit refuses source, artifact, evidence, command output, path, credential, or working-state payloads.", "error");
  }
  if (!isPermissions(candidate.permissions)) {
    addDiagnostic(diagnostics, "HIA_OWNER_ADOPTION_KIT_PERMISSION_OR_ADOPTION_REFUSED", "Target-owner adoption kit grants no target, network, publish, or adoption authority.", "error");
  }

  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const status: TargetOwnerAdoptionKitReport["status"] = hasError
    ? "refused"
    : ownerInput.submitted
      ? "ready-for-owner-review"
      : "deferred-owner-input-missing";
  const resolution: TargetOwnerAdoptionPortalSummary["semantics"]["resolution"] = status === "ready-for-owner-review"
    ? "owner-input-validated"
    : status === "deferred-owner-input-missing"
      ? "owner-input-not-received"
      : "unresolved";
  const semantics = {
    resolution,
    confidence: "caller-provided-unverified" as const,
    provenance: "metadata-only-owner-kit" as const
  };
  const portalSummary: TargetOwnerAdoptionPortalSummary = {
    contract: TARGET_OWNER_ADOPTION_KIT_CONTRACT,
    contractVersion: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION,
    projection: "portal-metadata-only",
    status,
    targetFamily: family,
    ownerInput: { submitted: ownerInput.submitted, consent: ownerInput.consent },
    contracts: { requiredCount: required.length, providedCount: providedRefs.length, missingCount },
    ...(family === "workspace-container" && workspaceHandoff ? {
      workspaceHandoff: {
        repositoryOwnerCount: workspaceHandoff.repositoryOwnerCount,
        handoffEdgeCount: workspaceHandoff.handoffEdgeCount,
        state: workspaceHandoff.state
      }
    } : {}),
    semantics
  };

  return {
    contract: TARGET_OWNER_ADOPTION_KIT_CONTRACT,
    contractVersion: TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION,
    status,
    trial: {
      id: isStableIdentifier(candidate.trialId) ? candidate.trialId : "invalid-trial",
      targetId: isStableIdentifier(candidate.targetId) ? candidate.targetId : "invalid-target",
      targetFamily: family,
      workflow: family === "enterprise-business" ? "enterprise-continuity" : "workspace-handoff-review"
    },
    ownerInput,
    contracts: { required, providedCount: providedRefs.length, missingCount },
    ...(family === "workspace-container" && workspaceHandoff ? { workspaceHandoff } : {}),
    portalSummary,
    semantics: { ...semantics, consent: ownerInput.consent, adoption: "not-asserted" },
    privacy: {
      sourceBodySerialized: false,
      artifactBodySerialized: false,
      evidenceBodySerialized: false,
      commandOutputBodySerialized: false,
      pathSerialized: false,
      credentialSerialized: false,
      workingStateSerialized: false,
      sourcesContentPolicy: "none"
    },
    permissions: {
      targetRepositoryRead: false,
      targetRepositoryWrite: false,
      targetCommandExecuted: false,
      targetRuntimeOpened: false,
      targetBranchOrPrCreated: false,
      networkAccessed: false,
      packagePublished: false,
      targetAdoptionClaimed: false
    },
    diagnostics
  };
}

/**
 * @lang zh-CN 对 JavaScript/JSON caller 执行 exact runtime guard。
 * @lang en Performs an exact runtime guard for JavaScript and JSON callers.
 *
 * @param value unknown report candidate。 / Unknown report candidate.
 * @returns 是否完整匹配当前 draft。 / Whether the value exactly matches this draft.
 */
export function isTargetOwnerAdoptionKitReport(value: unknown): value is TargetOwnerAdoptionKitReport {
  if (!isRecord(value)
    || !hasExactKeys(value, ["contract", "contractVersion", "status", "trial", "ownerInput", "contracts", "portalSummary", "semantics", "privacy", "permissions", "diagnostics"], ["workspaceHandoff"])
    || value.contract !== TARGET_OWNER_ADOPTION_KIT_CONTRACT
    || value.contractVersion !== TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION
    || !["ready-for-owner-review", "deferred-owner-input-missing", "refused"].includes(String(value.status))
    || !isReportTrial(value.trial)
    || !isOwnerInput(value.ownerInput)
    || !isReportContracts(value.contracts)
    || !isPortalSummary(value.portalSummary)
    || !isReportSemantics(value.semantics)
    || !isReportPrivacy(value.privacy)
    || !isPermissions(value.permissions)
    || !isDiagnostics(value.diagnostics)) {
    return false;
  }
  const family = value.trial.targetFamily;
  const required = requiredContractRefs(family);
  const contracts = value.contracts;
  const portal = value.portalSummary;
  const hasWorkspace = Object.hasOwn(value, "workspaceHandoff");
  const hasError = value.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const statusSemanticsValid = value.status === "ready-for-owner-review"
    ? value.ownerInput.submitted
      && value.ownerInput.consent === "recorded-for-review"
      && value.ownerInput.attestation === "target-owner-attested"
      && value.ownerInput.decision !== "not-recorded"
      && value.ownerInput.redactionAttested
      && contracts.missingCount === 0
      && value.semantics.resolution === "owner-input-validated"
      && !hasError
    : value.status === "deferred-owner-input-missing"
      ? !value.ownerInput.submitted
        && value.semantics.resolution === "owner-input-not-received"
        && !hasError
      : value.semantics.resolution === "unresolved" && hasError;
  return arraysEqual(contracts.required, required)
    && contracts.providedCount + contracts.missingCount === contracts.required.length
    && portal.targetFamily === family
    && portal.status === value.status
    && portal.contracts.requiredCount === contracts.required.length
    && portal.contracts.providedCount === contracts.providedCount
    && portal.contracts.missingCount === contracts.missingCount
    && portal.ownerInput.submitted === value.ownerInput.submitted
    && portal.ownerInput.consent === value.ownerInput.consent
    && portal.semantics.resolution === value.semantics.resolution
    && statusSemanticsValid
    && (family === "workspace-container"
      ? (value.status !== "ready-for-owner-review" || hasWorkspace)
      : !hasWorkspace)
    && (!hasWorkspace
      || (isWorkspaceHandoff(value.workspaceHandoff)
        && isPortalWorkspaceHandoff(portal.workspaceHandoff)
        && portal.workspaceHandoff.repositoryOwnerCount === value.workspaceHandoff.repositoryOwnerCount
        && portal.workspaceHandoff.handoffEdgeCount === value.workspaceHandoff.handoffEdgeCount));
}

/** @lang zh-CN adoption-kit command 所需的最小 IO surface。 @lang en Minimal IO surface required by the adoption-kit command. */
export interface TargetOwnerAdoptionKitCliIo {
  cwd: string;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

/**
 * @lang zh-CN 从 caller cwd 下的显式 safe-relative JSON 生成 owner-operated kit。
 * @lang en Generates an owner-operated kit from an explicit safe-relative JSON file under the caller cwd.
 *
 * @param argv adoption-kit command arguments。 / Adoption-kit command arguments.
 * @param io controlled CLI IO。 / Controlled CLI IO.
 * @returns process-style exit code；deferred 是诚实产物，因此返回 0。 / Process-style exit code; an honest deferred artifact returns 0.
 */
export async function runTargetOwnerAdoptionKitCommand(argv: string[], io: TargetOwnerAdoptionKitCliIo): Promise<number> {
  const options = parseOptions(argv, ["--request", "--out"]);
  const requestRelativePath = options.values.get("--request");
  const outputRelativePath = options.values.get("--out");
  if (!options.valid || !isSafeRelativePath(requestRelativePath) || (outputRelativePath !== undefined && !isSafeRelativePath(outputRelativePath))) {
    io.stderr("[error:HIA_OWNER_ADOPTION_KIT_PATH_INVALID] docs adoption-kit requires a safe relative request path and optional output path.");
    return 1;
  }

  let request: unknown;
  try {
    // <lang><zh-CN>command 只读取 caller 明确给出的 JSON；不发现 target、不读取 source/artifact body。</zh-CN><en>The command reads only caller-explicit JSON; it discovers no target and reads no source or artifact body.</en></lang>
    request = JSON.parse(await readFile(path.resolve(io.cwd, requestRelativePath), "utf8"));
  } catch {
    io.stderr("[error:HIA_OWNER_ADOPTION_KIT_REQUEST_READ_FAILED] docs adoption-kit could not read a valid request JSON object.");
    return 1;
  }
  const report = createTargetOwnerAdoptionKit(request as TargetOwnerAdoptionKitRequest);
  const serialized = JSON.stringify(report, null, 2);
  if (outputRelativePath) {
    try {
      const outputPath = path.resolve(io.cwd, outputRelativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
      io.stdout(`Generated target-owner adoption kit at ${outputRelativePath.replaceAll("\\", "/")}`);
    } catch {
      io.stderr("[error:HIA_OWNER_ADOPTION_KIT_OUTPUT_WRITE_FAILED] docs adoption-kit could not write the explicit output report.");
      return 1;
    }
  } else {
    io.stdout(serialized);
  }
  for (const diagnostic of report.diagnostics) {
    io.stderr(`[${diagnostic.severity}:${diagnostic.code}] ${diagnostic.message}`);
  }
  return report.status === "refused" ? 1 : 0;
}

/** @lang zh-CN 根据 family 返回冻结且有序的既有 contract refs。 @lang en Returns frozen ordered existing contract references for a family. */
function requiredContractRefs(family: TargetOwnerAdoptionKitFamily): readonly string[] {
  return family === "enterprise-business" ? ENTERPRISE_REQUIRED_CONTRACT_REFS : WORKSPACE_REQUIRED_CONTRACT_REFS;
}

/** @lang zh-CN 将 invalid owner input 替换为不授予任何事实的固定默认值。 @lang en Replaces invalid owner input with fixed defaults that grant no facts. */
function normalizeOwnerInput(value: unknown): TargetOwnerAdoptionKitReport["ownerInput"] {
  if (!isOwnerInput(value)) {
    return { submitted: false, consent: "not-recorded", attestation: "not-provided", decision: "not-recorded", redactionAttested: false };
  }
  return { ...value };
}

/** @lang zh-CN 只保留 stable string contract refs 供 count 比较；invalid shape 归一为空数组。 @lang en Retains only stable string contract refs for count comparison; invalid shapes normalize to an empty array. */
function normalizeContractRefs(value: unknown): string[] {
  return isStringArray(value) ? [...value] : [];
}

/** @lang zh-CN 只复制 count-only workspace handoff summary。 @lang en Copies only a count-only workspace-handoff summary. */
function normalizeWorkspaceHandoff(value: unknown): TargetOwnerAdoptionKitReport["workspaceHandoff"] | undefined {
  return isWorkspaceHandoff(value) ? { ...value } : undefined;
}

/** @lang zh-CN 按固定顺序去重追加 diagnostic。 @lang en Appends a diagnostic in fixed order without duplicates. */
function addDiagnostic(diagnostics: TargetOwnerAdoptionKitDiagnostic[], code: TargetOwnerAdoptionKitDiagnosticCode, message: string, severity: "error" | "warning"): void {
  if (!diagnostics.some((diagnostic) => diagnostic.code === code)) {
    diagnostics.push({ code, message, severity });
  }
}

/** @lang zh-CN 检查首轮冻结的 target family。 @lang en Checks a target family frozen for the first slice. */
function isTargetFamily(value: unknown): value is TargetOwnerAdoptionKitFamily {
  return TARGET_OWNER_ADOPTION_KIT_FAMILIES.includes(value as TargetOwnerAdoptionKitFamily);
}

/** @lang zh-CN 验证 closed owner input attestation shape。 @lang en Validates the closed owner-input attestation shape. */
function isOwnerInput(value: unknown): value is TargetOwnerAdoptionKitRequest["ownerInput"] {
  return isRecord(value)
    && hasExactKeys(value, ["submitted", "consent", "attestation", "decision", "redactionAttested"])
    && typeof value.submitted === "boolean"
    && ["not-recorded", "recorded-for-review"].includes(String(value.consent))
    && ["not-provided", "target-owner-attested"].includes(String(value.attestation))
    && TARGET_OWNER_ADOPTION_KIT_DECISIONS.includes(value.decision as TargetOwnerAdoptionKitDecision)
    && typeof value.redactionAttested === "boolean";
}

/** @lang zh-CN 验证无 identity 的 workspace handoff count summary。 @lang en Validates an identity-free workspace-handoff count summary. */
function isWorkspaceHandoff(value: unknown): value is NonNullable<TargetOwnerAdoptionKitRequest["workspaceHandoff"]> {
  return isRecord(value)
    && hasExactKeys(value, ["state", "repositoryOwnerCount", "handoffEdgeCount", "runtimeDependencyTransfer", "targetWriteRequired"])
    && value.state === "owner-review-required"
    && isNonNegativeInteger(value.repositoryOwnerCount) && value.repositoryOwnerCount >= 2
    && isNonNegativeInteger(value.handoffEdgeCount) && value.handoffEdgeCount >= 1
    && value.runtimeDependencyTransfer === false
    && value.targetWriteRequired === false;
}

/** @lang zh-CN 验证进一步收窄的 Portal workspace handoff 投影。 @lang en Validates the further-reduced Portal workspace-handoff projection. */
function isPortalWorkspaceHandoff(value: unknown): value is NonNullable<TargetOwnerAdoptionPortalSummary["workspaceHandoff"]> {
  return isRecord(value)
    && hasExactKeys(value, ["repositoryOwnerCount", "handoffEdgeCount", "state"])
    && value.state === "owner-review-required"
    && isNonNegativeInteger(value.repositoryOwnerCount) && value.repositoryOwnerCount >= 2
    && isNonNegativeInteger(value.handoffEdgeCount) && value.handoffEdgeCount >= 1;
}

/** @lang zh-CN 验证 request 的 deny-payload privacy facts。 @lang en Validates deny-payload privacy facts on a request. */
function isRequestPrivacy(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, PRIVACY_FIELDS)
    && PRIVACY_FIELDS.filter((field) => field !== "sourcesContentPolicy").every((field) => value[field] === false)
    && value.sourcesContentPolicy === "none";
}

/** @lang zh-CN 验证所有 target/network/publish/adoption permission 均为 false。 @lang en Validates that every target, network, publish, and adoption permission is false. */
function isPermissions(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, PERMISSION_FIELDS)
    && PERMISSION_FIELDS.every((field) => value[field] === false);
}

/** @lang zh-CN 验证 report 的 stable trial identity 与 family/workflow 对应关系。 @lang en Validates stable trial identity and family/workflow correspondence in a report. */
function isReportTrial(value: unknown): value is TargetOwnerAdoptionKitReport["trial"] {
  return isRecord(value)
    && hasExactKeys(value, ["id", "targetId", "targetFamily", "workflow"])
    && isStableIdentifier(value.id)
    && isStableIdentifier(value.targetId)
    && isTargetFamily(value.targetFamily)
    && value.workflow === (value.targetFamily === "enterprise-business" ? "enterprise-continuity" : "workspace-handoff-review");
}

/** @lang zh-CN 验证 report contract-ref counts 与有序 required refs shape。 @lang en Validates report contract-reference counts and ordered required-reference shape. */
function isReportContracts(value: unknown): value is TargetOwnerAdoptionKitReport["contracts"] {
  return isRecord(value)
    && hasExactKeys(value, ["required", "providedCount", "missingCount"])
    && isStringArray(value.required)
    && new Set(value.required).size === value.required.length
    && isNonNegativeInteger(value.providedCount)
    && isNonNegativeInteger(value.missingCount);
}

/** @lang zh-CN 验证 Portal metadata-only projection 的 closed shape 与 count invariant。 @lang en Validates the closed shape and count invariant of a metadata-only Portal projection. */
function isPortalSummary(value: unknown): value is TargetOwnerAdoptionPortalSummary {
  if (!isRecord(value)
    || !hasExactKeys(value, ["contract", "contractVersion", "projection", "status", "targetFamily", "ownerInput", "contracts", "semantics"], ["workspaceHandoff"])
    || value.contract !== TARGET_OWNER_ADOPTION_KIT_CONTRACT
    || value.contractVersion !== TARGET_OWNER_ADOPTION_KIT_CONTRACT_VERSION
    || value.projection !== "portal-metadata-only"
    || !["ready-for-owner-review", "deferred-owner-input-missing", "refused"].includes(String(value.status))
    || !isTargetFamily(value.targetFamily)
    || !isRecord(value.ownerInput)
    || !hasExactKeys(value.ownerInput, ["submitted", "consent"])
    || typeof value.ownerInput.submitted !== "boolean"
    || !["not-recorded", "recorded-for-review"].includes(String(value.ownerInput.consent))
    || !isRecord(value.contracts)
    || !hasExactKeys(value.contracts, ["requiredCount", "providedCount", "missingCount"])
    || ![value.contracts.requiredCount, value.contracts.providedCount, value.contracts.missingCount].every(isNonNegativeInteger)
    || Number(value.contracts.providedCount) + Number(value.contracts.missingCount) !== Number(value.contracts.requiredCount)
    || !isPortalSemantics(value.semantics)) {
    return false;
  }
  const hasWorkspace = Object.hasOwn(value, "workspaceHandoff");
  return value.targetFamily === "workspace-container"
    ? (value.status === "ready-for-owner-review" ? isPortalWorkspaceHandoff(value.workspaceHandoff) : (!hasWorkspace || isPortalWorkspaceHandoff(value.workspaceHandoff)))
    : !hasWorkspace;
}

/** @lang zh-CN 分别验证 resolution、confidence 与 provenance 三维。 @lang en Independently validates resolution, confidence, and provenance. */
function isPortalSemantics(value: unknown): value is TargetOwnerAdoptionPortalSummary["semantics"] {
  return isRecord(value)
    && hasExactKeys(value, ["resolution", "confidence", "provenance"])
    && ["owner-input-validated", "owner-input-not-received", "unresolved"].includes(String(value.resolution))
    && value.confidence === "caller-provided-unverified"
    && value.provenance === "metadata-only-owner-kit";
}

/** @lang zh-CN 验证 report semantics，并保持 consent/adoption 独立。 @lang en Validates report semantics while keeping consent and adoption independent. */
function isReportSemantics(value: unknown): value is TargetOwnerAdoptionKitReport["semantics"] {
  return isRecord(value)
    && hasExactKeys(value, ["resolution", "confidence", "provenance", "consent", "adoption"])
    && isPortalSemantics({ resolution: value.resolution, confidence: value.confidence, provenance: value.provenance })
    && ["not-recorded", "recorded-for-review"].includes(String(value.consent))
    && value.adoption === "not-asserted";
}

/** @lang zh-CN 验证 report 未序列化受限 payload。 @lang en Validates that the report serializes no restricted payload. */
function isReportPrivacy(value: unknown): value is TargetOwnerAdoptionKitReport["privacy"] {
  const fields = ["sourceBodySerialized", "artifactBodySerialized", "evidenceBodySerialized", "commandOutputBodySerialized", "pathSerialized", "credentialSerialized", "workingStateSerialized", "sourcesContentPolicy"];
  return isRecord(value)
    && hasExactKeys(value, fields)
    && fields.filter((field) => field !== "sourcesContentPolicy").every((field) => value[field] === false)
    && value.sourcesContentPolicy === "none";
}

/** @lang zh-CN 验证 diagnostics 只来自 fixed catalog。 @lang en Validates that diagnostics come only from the fixed catalog. */
function isDiagnostics(value: unknown): value is TargetOwnerAdoptionKitDiagnostic[] {
  return Array.isArray(value) && value.every((diagnostic) => isRecord(diagnostic)
    && hasExactKeys(diagnostic, ["code", "message", "severity"])
    && TARGET_OWNER_ADOPTION_KIT_DIAGNOSTIC_CODES.includes(diagnostic.code as TargetOwnerAdoptionKitDiagnosticCode)
    && typeof diagnostic.message === "string"
    && ["error", "warning"].includes(String(diagnostic.severity)));
}

/** @lang zh-CN 检查纯 string array。 @lang en Checks a string-only array. */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** @lang zh-CN 检查 public stable identifier grammar。 @lang en Checks the public stable-identifier grammar. */
function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value);
}

/** @lang zh-CN 检查可安全序列化的非负整数。 @lang en Checks a safely serializable non-negative integer. */
function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

/** @lang zh-CN 比较 deterministic ordered ref arrays。 @lang en Compares deterministic ordered reference arrays. */
function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** @lang zh-CN 检查非 array object record。 @lang en Checks a non-array object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @lang zh-CN 检查 required/optional key 的 closed-world 集合。 @lang en Checks a closed-world set of required and optional keys. */
function hasExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = [...required, ...optional];
  return required.every((field) => Object.hasOwn(value, field))
    && Object.keys(value).every((field) => allowed.includes(field));
}

/** @lang zh-CN 为 request boundary 提供语义明确的 exact-key alias。 @lang en Provides a semantically explicit exact-key alias for the request boundary. */
function hasOnlyExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[]): boolean {
  return hasExactKeys(value, required, optional);
}

/** @lang zh-CN 解析不重复的 option/value pairs，拒绝 unknown 或缺值 option。 @lang en Parses unique option/value pairs and refuses unknown or missing-value options. */
function parseOptions(argv: string[], allowedOptions: string[]): { valid: boolean; values: Map<string, string> } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option || !allowedOptions.includes(option) || !value || value.startsWith("--") || values.has(option)) {
      return { valid: false, values };
    }
    values.set(option, value);
  }
  return { valid: argv.length % 2 === 0, values };
}

/** @lang zh-CN 将 CLI 文件 IO 限定在 caller cwd 的 safe-relative boundary。 @lang en Constrains CLI file IO to the caller cwd safe-relative boundary. */
function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value) || value.includes("\0")) {
    return false;
  }
  const normalized = path.normalize(value);
  return normalized !== ".." && !normalized.startsWith(`..${path.sep}`) && !normalized.startsWith("\\\\");
}
