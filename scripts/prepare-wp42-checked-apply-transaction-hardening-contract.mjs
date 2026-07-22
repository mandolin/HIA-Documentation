import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp42-checked-apply-transaction-hardening-contract");
const evidencePath = path.join(outputRoot, "evidence.json");
const contractSummaryPath = path.join(outputRoot, "checked-apply-transaction-contract-summary.md");
const wp42IntakePath = path.join(rootDir, "dist", "wp42-checked-apply-hardening-intake", "evidence.json");
const wp37TransactionPath = path.join(rootDir, "dist", "wp37-host-edit-transaction", "evidence.json");
const wp37FileVersionPath = path.join(rootDir, "dist", "wp37-file-read-version-conflict", "evidence.json");
const wp37RollbackAuditPath = path.join(rootDir, "dist", "wp37-rollback-formatter-audit", "evidence.json");

await main();

/**
 * 准备 W-P42.2 checked apply transaction hardening contract evidence。
 * Prepare W-P42.2 checked apply transaction hardening contract evidence.
 *
 * This stage turns the W-P42.1 hardening scope into a hardened transaction
 * envelope, state model, invariant set and denial binding matrix. It defines
 * the contract that later checker fixtures can validate, but it does not grant
 * write authority or call any host editor API.
 *
 * 中文：本阶段将 W-P42.1 的硬化范围转成 hardened transaction envelope、状态模型、
 * invariant 与 denial binding 矩阵。它只定义后续 checker 可验证的合同，不授予写入权，
 * 也不调用任何宿主编辑 API。
 *
 * @returns {Promise<void>} Writes public-safe W-P42.2 contract evidence and summary.
 */
async function main() {
  const inputs = await readInputs();
  const contract = createHardenedTransactionContract(inputs.intake);
  const transactionPrototypes = createTransactionPrototypes(inputs);
  const denialBindings = bindDenialCases(inputs.intake.denialCases, contract);
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    contract,
    denialBindings,
    inputs,
    nextStageInputs,
    transactionPrototypes
  });
  const checks = [
    check("HIA_WP42_TRANSACTION_INPUTS_READY", summary.intakeReady === true
      && summary.transactionInputReady === true
      && summary.fileVersionInputReady === true
      && summary.rollbackAuditInputReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        fileVersionInputReady: summary.fileVersionInputReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        intakeReady: summary.intakeReady,
        rollbackAuditInputReady: summary.rollbackAuditInputReady,
        transactionInputReady: summary.transactionInputReady
      }
    }),
    check("HIA_WP42_TRANSACTION_ENVELOPE_COMPLETE", summary.envelopeFieldCount >= 18
      && summary.requiredEnvelopeFieldCount === summary.envelopeFieldCount
      && summary.requiredGateCount >= 11
      && summary.requiredInvariantCount >= 12
      && summary.stateCount >= 9, {
      actual: {
        envelopeFieldCount: summary.envelopeFieldCount,
        requiredEnvelopeFieldCount: summary.requiredEnvelopeFieldCount,
        requiredGateCount: summary.requiredGateCount,
        requiredInvariantCount: summary.requiredInvariantCount,
        stateCount: summary.stateCount
      }
    }),
    check("HIA_WP42_TRANSACTION_NO_WRITE_AUTHORITY", summary.writeEnabledStateCount === 0
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeEnabledStateCount: summary.writeEnabledStateCount
      }
    }),
    check("HIA_WP42_TRANSACTION_DENIAL_BINDINGS_COMPLETE", summary.denialBindingCount === summary.intakeDenialCaseCount
      && summary.denyBeforeWriteBindingCount === summary.denialBindingCount
      && summary.denialBindingsWithRequiredFieldCount === summary.denialBindingCount
      && summary.denialBindingsWithRequiredGateCount === summary.denialBindingCount, {
      actual: {
        denialBindingCount: summary.denialBindingCount,
        denialBindingsWithRequiredFieldCount: summary.denialBindingsWithRequiredFieldCount,
        denialBindingsWithRequiredGateCount: summary.denialBindingsWithRequiredGateCount,
        denyBeforeWriteBindingCount: summary.denyBeforeWriteBindingCount,
        intakeDenialCaseCount: summary.intakeDenialCaseCount
      }
    }),
    check("HIA_WP42_TRANSACTION_PREFLIGHT_REQUIREMENTS_BOUND", summary.finalHumanConfirmationRequired === true
      && summary.fileVersionRequired === true
      && summary.conflictResultRequired === true
      && summary.repeatConflictCheckRequired === true
      && summary.rollbackRecordRequired === true
      && summary.formatterPlanRequired === true
      && summary.postApplyValidationRequired === true
      && summary.redactedAuditRequired === true
      && summary.providerReviewContextRequired === true
      && summary.targetOwnerEvidenceContextRequired === true, {
      actual: {
        conflictResultRequired: summary.conflictResultRequired,
        fileVersionRequired: summary.fileVersionRequired,
        finalHumanConfirmationRequired: summary.finalHumanConfirmationRequired,
        formatterPlanRequired: summary.formatterPlanRequired,
        postApplyValidationRequired: summary.postApplyValidationRequired,
        providerReviewContextRequired: summary.providerReviewContextRequired,
        redactedAuditRequired: summary.redactedAuditRequired,
        repeatConflictCheckRequired: summary.repeatConflictCheckRequired,
        rollbackRecordRequired: summary.rollbackRecordRequired,
        targetOwnerEvidenceContextRequired: summary.targetOwnerEvidenceContextRequired
      }
    }),
    check("HIA_WP42_TRANSACTION_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP42_TRANSACTION_NEXT_STAGE_READY", nextStageInputs.some((item) => item.phase === "W-P42.3")
      && nextStageInputs.some((item) => item.topic === "preflight-denial-checker-fixtures")
      && summary.contractReadyForCheckerFixtures === true, {
      actual: {
        contractReadyForCheckerFixtures: summary.contractReadyForCheckerFixtures,
        nextStages: nextStageInputs.map((item) => item.phase)
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp42-checked-apply-transaction-hardening-contract-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-preflight-denial-checker-fixtures" : "blocked",
    sourceEvidence: {
      hardeningIntake: normalizePath(wp42IntakePath),
      hostEditTransaction: normalizePath(wp37TransactionPath),
      fileReadVersionConflict: normalizePath(wp37FileVersionPath),
      rollbackFormatterAudit: normalizePath(wp37RollbackAuditPath)
    },
    hardenedTransactionContract: contract,
    transactionPrototypes,
    denialBindings,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      contractSummary: normalizePath(contractSummaryPath)
    },
    manualChecks: [
      "Confirm W-P42.3 checker fixtures use this contract as input and do not invent a separate transaction shape.",
      "Confirm no state in this contract grants write authority in W-P42.2.",
      "Confirm provider review and target-owner evidence remain context references, not edit payloads.",
      "Confirm future host UX uses the denial binding matrix before showing any apply-ready affordance."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P42 transaction hardening evidence");
  assert.equal(hardFailures.length, 0, `W-P42 transaction hardening has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(contractSummaryPath, renderContractSummary(evidence), "utf8");
  console.log(`W-P42 transaction hardening evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P42 transaction hardening summary prepared at ${normalizePath(contractSummaryPath)}`);
}

async function readInputs() {
  return {
    intake: await readJson(wp42IntakePath),
    transaction: await readJson(wp37TransactionPath),
    fileVersion: await readJson(wp37FileVersionPath),
    rollbackAudit: await readJson(wp37RollbackAuditPath)
  };
}

function createHardenedTransactionContract(intake) {
  const envelopeFields = [
    field("transactionId", "string", "Stable transaction id.", "required"),
    field("contractVersion", "semver-draft", "Hardened transaction contract version.", "required"),
    field("sourceReviewPayloadRef", "reference", "Review payload or provider review context reference.", "required"),
    field("proposalRefs", "reference[]", "Review proposal references; never direct edit objects.", "required"),
    field("targetOwnerEvidenceRef", "reference|null", "Target-owner transcript/evidence context when target action is involved.", "required"),
    field("hostSurface", "host-id", "VS Code, DevTools, Visual Studio or another host shell.", "required"),
    field("authority", "authority-boundary", "Host-owned apply boundary and provider/LSP denial flags.", "required"),
    field("state", "transaction-state", "Current hardened state.", "required"),
    field("targetBindings", "target-binding[]", "Relative target bindings and semantic target kinds.", "required"),
    field("semanticOperations", "semantic-operation[]", "Semantic operations without executable editor payloads.", "required"),
    field("fileVersionResults", "file-version-result[]", "Host-read file version preflight results.", "required"),
    field("conflictResults", "conflict-result[]", "Host-owned conflict results and repeat-before-apply requirement.", "required"),
    field("rollbackRecords", "rollback-record[]", "Host-private rollback references.", "required"),
    field("formatterPlan", "formatter-plan", "Formatter and post-apply validation plan.", "required"),
    field("finalHumanConfirmation", "confirmation-record", "Final confirmation record after preflight.", "required"),
    field("applyAudit", "redacted-audit-record", "Redacted audit surface.", "required"),
    field("privacy", "privacy-boundary", "No source body, sourcesContent, credential or absolute-path exposure.", "required"),
    field("denialState", "denial-state|null", "Blocking denial reason when any required gate is absent.", "required"),
    field("hostApplyToken", "host-private-token|null", "Future host-private token, never serialized as authority in public evidence.", "required")
  ];
  const requiredGates = [
    gate("host-owned-apply-authority", ["authority", "hostSurface"], "host-shell"),
    gate("human-review-record", ["sourceReviewPayloadRef", "proposalRefs"], "host-shell"),
    gate("target-owner-evidence-context", ["targetOwnerEvidenceRef"], "target-owner"),
    gate("file-version-preflight", ["fileVersionResults"], "host-shell"),
    gate("conflict-check", ["conflictResults"], "host-shell"),
    gate("repeat-conflict-check", ["conflictResults"], "host-shell"),
    gate("rollback-record", ["rollbackRecords"], "host-shell"),
    gate("formatter-plan", ["formatterPlan"], "host-shell"),
    gate("post-apply-validation-plan", ["formatterPlan"], "host-shell"),
    gate("final-human-confirmation", ["finalHumanConfirmation"], "host-shell"),
    gate("redacted-apply-audit", ["applyAudit"], "host-shell"),
    gate("provider-review-denial", ["sourceReviewPayloadRef", "authority"], "provider-review"),
    gate("privacy-boundary", ["privacy"], "host-shell")
  ];
  const states = [
    state("draft", "blocked-in-wp42.2", ["sourceReviewPayloadRef", "proposalRefs"]),
    state("reviewed", "blocked-in-wp42.2", ["human-review-record"]),
    state("host-preflight-pending", "blocked-in-wp42.2", ["host-owned-apply-authority"]),
    state("file-version-bound", "blocked-in-wp42.2", ["file-version-preflight"]),
    state("conflict-checked", "blocked-in-wp42.2", ["conflict-check", "repeat-conflict-check"]),
    state("rollback-formatter-audit-ready", "blocked-in-wp42.2", ["rollback-record", "formatter-plan", "redacted-apply-audit"]),
    state("final-confirmation-required", "blocked-in-wp42.2", ["final-human-confirmation"]),
    state("future-host-apply-ready", "blocked-in-wp42.2", ["all-required-gates"], "Future host UX may interpret this only after a later write-enabled phase."),
    state("blocked-or-denied", "blocked-in-wp42.2", ["denialState"])
  ];
  const invariants = [
    invariant("provider-output-never-direct-edit", "Provider output cannot include direct edit objects, WorkspaceEdit or documentChanges."),
    invariant("lsp-output-never-apply-owner", "LSP results cannot own apply authority."),
    invariant("host-owns-file-read", "File reads and file version tokens are produced by the host."),
    invariant("repeat-conflict-before-apply", "Conflict status must be checked again immediately before any future apply."),
    invariant("rollback-before-write", "Rollback record must exist before any future write."),
    invariant("formatter-plan-before-write", "Formatter and post-apply validation plan must exist before any future write."),
    invariant("audit-redacted", "Apply audit must be redacted in public evidence."),
    invariant("final-confirmation-after-preflight", "Final human confirmation must occur after file version, conflict, rollback and formatter gates."),
    invariant("target-owner-evidence-not-execution-claim", "Target-owner evidence context cannot be treated as execution by HIA automation."),
    invariant("source-content-denied", "Source body and sourcesContent are denied from public evidence."),
    invariant("credential-denied", "Credential values are denied from evidence, request and result payloads."),
    invariant("absolute-path-denied", "Local absolute paths are denied from public evidence."),
    invariant("wp42-2-no-write-authority", "W-P42.2 defines the contract only and grants no workspace or target write authority.")
  ];
  return {
    contract: "hia-checked-apply-transaction-hardening-contract",
    contractVersion: "0.1.0-draft",
    authorityBoundary: {
      applyAuthority: "host-after-future-write-phase-only",
      writeAuthorityGrantedByThisContract: false,
      providerOwnedApplyAllowed: false,
      lspServerOwnedApplyAllowed: false,
      directEditorObjectAllowed: false,
      workspaceEditPayloadAllowed: false,
      documentChangesAllowed: false,
      targetRepositoryMutationAllowed: false,
      targetOwnerExecutionClaimMayAuthorizeApply: false
    },
    sourceHardeningScope: {
      hardeningDimensionCount: intake.summary?.hardeningDimensionCount,
      denialCaseCount: intake.summary?.denialCaseCount,
      checkedApplyWriteStillDeferred: intake.summary?.checkedApplyWriteStillDeferred
    },
    envelopeFields,
    requiredGates,
    stateMachine: {
      contract: "hia-checked-apply-hardened-state-machine",
      contractVersion: "0.1.0-draft",
      initialState: "draft",
      terminalDeniedState: "blocked-or-denied",
      states,
      transitions: createTransitions()
    },
    invariants,
    privacyBoundary: {
      sourcesContentPolicy: "none",
      publicEvidenceMayContainSourceBody: false,
      publicEvidenceMayContainCredentialValue: false,
      publicEvidenceMayContainDigestValue: false,
      publicEvidenceMayContainAbsolutePath: false,
      publicEvidenceMayContainDirectEditorObject: false
    }
  };
}

function field(id, type, description, requiredness) {
  return { id, type, description, requiredness };
}

function gate(id, requiredFields, owner) {
  return {
    id,
    owner,
    requiredFields,
    status: "required-before-write"
  };
}

function state(id, writeAuthority, requiredGateIds, note = undefined) {
  return {
    id,
    writeAuthority,
    requiredGateIds,
    ...(note ? { note } : {})
  };
}

function invariant(id, rule) {
  return {
    id,
    rule,
    status: "required"
  };
}

function createTransitions() {
  return [
    transition("draft", "reviewed", "human-review-record"),
    transition("reviewed", "host-preflight-pending", "host-owned-apply-authority"),
    transition("host-preflight-pending", "file-version-bound", "file-version-preflight"),
    transition("file-version-bound", "conflict-checked", "conflict-check"),
    transition("conflict-checked", "rollback-formatter-audit-ready", "rollback-formatter-audit-ready"),
    transition("rollback-formatter-audit-ready", "final-confirmation-required", "preflight-summary-ready"),
    transition("final-confirmation-required", "future-host-apply-ready", "final-human-confirmation"),
    transition("*", "blocked-or-denied", "any-denial-binding")
  ];
}

function transition(from, to, requirement) {
  return {
    from,
    to,
    requirement,
    authority: "host",
    grantsWriteAuthorityInWp42_2: false
  };
}

function createTransactionPrototypes(inputs) {
  const sourceTransactions = Array.isArray(inputs.transaction.transactions) ? inputs.transaction.transactions : [];
  return sourceTransactions.map((transaction, index) => ({
    contract: "hia-checked-apply-hardened-transaction-prototype",
    contractVersion: "0.1.0-draft",
    id: `hardened-transaction-prototype-${String(index + 1).padStart(2, "0")}`,
    sourceTransactionId: transaction.id,
    targetKind: transaction.targetKind,
    hostSurface: "host-neutral",
    state: "host-preflight-pending",
    writeAuthority: "blocked-in-wp42.2",
    sourceReviewPayloadRef: transaction.sourceReviewPayloadRef,
    proposalRefs: [transaction.proposalId].filter(Boolean),
    targetOwnerEvidenceRef: {
      requiredWhenTargetOwnerAction: true,
      status: "context-reference-only"
    },
    requiredGateRefs: [
      "host-owned-apply-authority",
      "human-review-record",
      "file-version-preflight",
      "conflict-check",
      "repeat-conflict-check",
      "rollback-record",
      "formatter-plan",
      "post-apply-validation-plan",
      "final-human-confirmation",
      "redacted-apply-audit",
      "privacy-boundary"
    ],
    semanticOperationCount: Array.isArray(transaction.transactionOperations) ? transaction.transactionOperations.length : 0,
    targetBindingCount: Array.isArray(transaction.targetBindings) ? transaction.targetBindings.length : 0,
    safety: {
      executable: false,
      directApplyAllowed: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      providerOwnedApplyAllowed: false,
      lspServerOwnedApplyAllowed: false,
      directEditObjectAllowed: false,
      sourcesContentPolicy: "none"
    }
  }));
}

function bindDenialCases(denialCases, contract) {
  const bindings = {
    "provider-direct-edit-object": binding("provider-direct-edit-object", ["sourceReviewPayloadRef", "authority"], ["provider-review-denial"], "provider-output-never-direct-edit"),
    "provider-workspace-edit": binding("provider-workspace-edit", ["sourceReviewPayloadRef", "authority"], ["provider-review-denial"], "provider-output-never-direct-edit"),
    "missing-final-human-confirmation": binding("missing-final-human-confirmation", ["finalHumanConfirmation"], ["final-human-confirmation"], "final-confirmation-after-preflight"),
    "missing-host-file-version": binding("missing-host-file-version", ["fileVersionResults"], ["file-version-preflight"], "host-owns-file-read"),
    "stale-file-version": binding("stale-file-version", ["fileVersionResults", "conflictResults"], ["file-version-preflight", "repeat-conflict-check"], "repeat-conflict-before-apply"),
    "conflict-detected": binding("conflict-detected", ["conflictResults"], ["conflict-check", "repeat-conflict-check"], "repeat-conflict-before-apply"),
    "missing-rollback-record": binding("missing-rollback-record", ["rollbackRecords"], ["rollback-record"], "rollback-before-write"),
    "formatter-or-validation-plan-missing": binding("formatter-or-validation-plan-missing", ["formatterPlan"], ["formatter-plan", "post-apply-validation-plan"], "formatter-plan-before-write"),
    "audit-record-missing-or-unredacted": binding("audit-record-missing-or-unredacted", ["applyAudit"], ["redacted-apply-audit"], "audit-redacted"),
    "target-owner-evidence-incomplete": binding("target-owner-evidence-incomplete", ["targetOwnerEvidenceRef"], ["target-owner-evidence-context"], "target-owner-evidence-not-execution-claim"),
    "source-secret-or-path-exposure": binding("source-secret-or-path-exposure", ["privacy"], ["privacy-boundary"], "source-content-denied")
  };
  const gateIds = new Set(contract.requiredGates.map((item) => item.id));
  return denialCases.map((denialCase) => {
    const mapped = bindings[denialCase.id];
    assert.ok(mapped, `Missing denial binding for ${denialCase.id}.`);
    assert.ok(mapped.requiredGateIds.every((id) => gateIds.has(id)), `Unknown gate in denial binding ${denialCase.id}.`);
    return {
      ...mapped,
      reason: denialCase.reason,
      defaultDisposition: "deny-before-write",
      deniedState: "blocked-or-denied"
    };
  });
}

function binding(id, requiredFields, requiredGateIds, invariantId) {
  return {
    id,
    requiredFields,
    requiredGateIds,
    invariantId
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P42.3",
      topic: "preflight-denial-checker-fixtures",
      status: "ready-input",
      reason: "The hardened transaction contract now defines fields, gates, states, invariants and denial bindings."
    },
    {
      phase: "W-P42.4",
      topic: "rollback-formatter-audit-hardening",
      status: "planned-input",
      reason: "Rollback, formatter and audit gates are required and can now be hardened with success/failure fixtures."
    },
    {
      phase: "W-P42.5",
      topic: "provider-review-target-owner-boundary",
      status: "planned-input",
      reason: "Provider review and target-owner evidence are explicit context refs, not apply triggers."
    },
    {
      phase: "W-P42.6",
      topic: "multi-host-contract-projection",
      status: "planned-input",
      reason: "Host shells can later project this contract without granting write authority."
    }
  ];
}

function summarize({ contract, denialBindings, inputs, nextStageInputs, transactionPrototypes }) {
  const summaries = [
    inputs.intake.summary,
    inputs.transaction.summary,
    inputs.fileVersion.summary,
    inputs.rollbackAudit.summary
  ];
  const requiredGates = contract.requiredGates;
  const requiredFieldIds = new Set(requiredGates.flatMap((gateItem) => gateItem.requiredFields));

  return {
    intakeReady: inputs.intake.status === "ready-for-checked-apply-transaction-hardening-contract",
    transactionInputReady: inputs.transaction.status === "ready-for-file-read-version-conflict-result",
    fileVersionInputReady: inputs.fileVersion.status === "ready-for-rollback-formatter-audit-boundary",
    rollbackAuditInputReady: inputs.rollbackAudit.status === "ready-for-vscode-checked-apply-confirmation-slice",
    inputHardFailureCount: summaries.reduce((total, summary) => total + number(summary?.hardFailureCount), 0),
    envelopeFieldCount: contract.envelopeFields.length,
    requiredEnvelopeFieldCount: contract.envelopeFields.filter((item) => item.requiredness === "required").length,
    requiredGateCount: requiredGates.length,
    requiredInvariantCount: contract.invariants.filter((item) => item.status === "required").length,
    stateCount: contract.stateMachine.states.length,
    writeEnabledStateCount: contract.stateMachine.states.filter((item) => item.writeAuthority !== "blocked-in-wp42.2").length,
    transitionCount: contract.stateMachine.transitions.length,
    transitionGrantingWriteCount: contract.stateMachine.transitions.filter((item) => item.grantsWriteAuthorityInWp42_2 === true).length,
    prototypeCount: transactionPrototypes.length,
    prototypeWriteEnabledCount: transactionPrototypes.filter((item) => item.writeAuthority !== "blocked-in-wp42.2").length,
    intakeDenialCaseCount: Array.isArray(inputs.intake.denialCases) ? inputs.intake.denialCases.length : 0,
    denialBindingCount: denialBindings.length,
    denyBeforeWriteBindingCount: denialBindings.filter((item) => item.defaultDisposition === "deny-before-write").length,
    denialBindingsWithRequiredFieldCount: denialBindings.filter((item) => item.requiredFields.every((fieldId) => requiredFieldIds.has(fieldId))).length,
    denialBindingsWithRequiredGateCount: denialBindings.filter((item) => item.requiredGateIds.length > 0).length,
    finalHumanConfirmationRequired: hasGate(requiredGates, "final-human-confirmation"),
    fileVersionRequired: hasGate(requiredGates, "file-version-preflight"),
    conflictResultRequired: hasGate(requiredGates, "conflict-check"),
    repeatConflictCheckRequired: hasGate(requiredGates, "repeat-conflict-check"),
    rollbackRecordRequired: hasGate(requiredGates, "rollback-record"),
    formatterPlanRequired: hasGate(requiredGates, "formatter-plan"),
    postApplyValidationRequired: hasGate(requiredGates, "post-apply-validation-plan"),
    redactedAuditRequired: hasGate(requiredGates, "redacted-apply-audit"),
    providerReviewContextRequired: hasGate(requiredGates, "provider-review-denial"),
    targetOwnerEvidenceContextRequired: hasGate(requiredGates, "target-owner-evidence-context"),
    contractReadyForCheckerFixtures: true,
    nextStageInputCount: nextStageInputs.length,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: maxSummary(summaries, "workspaceWriteAllowedCount"),
    targetRepositoryMutationCount: Math.max(
      maxSummary(summaries, "targetRepositoryMutationCount"),
      maxSummary(summaries, "targetRepositoryMutationAllowedCount")
    ),
    targetRepositoryWriteAttemptedCount: maxSummary(summaries, "targetRepositoryWriteAttemptedCount"),
    checkedApplyTriggeredCount: maxSummary(summaries, "checkedApplyTriggeredCount"),
    directApplyAllowedCount: maxSummary(summaries, "directApplyAllowedCount"),
    directEditObjectCount: maxSummary(summaries, "directEditObjectCount"),
    providerOwnedApplyCount: maxSummary(summaries, "providerOwnedApplyCount"),
    lspServerOwnedApplyCount: maxSummary(summaries, "lspServerOwnedApplyCount"),
    documentContentIncludedInEvidenceCount: Math.max(
      maxSummary(summaries, "documentContentIncludedInEvidenceCount"),
      maxSummary(summaries, "documentContentIncludedInEvidence"),
      maxSummary(summaries, "documentContentIncludedInEvidenceCount")
    ),
    digestValueIncludedInEvidenceCount: maxSummary(summaries, "digestValueIncludedInEvidenceCount"),
    sourceBodyIncludedInEvidence: summaries.some((summary) => summary?.sourceBodyIncludedInEvidence === true),
    sourcesContentPolicy: summaries.every((summary) => summary?.sourcesContentPolicy === undefined || summary?.sourcesContentPolicy === "none") ? "none" : "mixed",
    credentialValueIncludedCount: maxSummary(summaries, "credentialValueIncludedCount"),
    credentialMaterialMarkerCount: maxSummary(summaries, "credentialMaterialMarkerCount"),
    forbiddenDocumentTextMarkerCount: Math.max(
      maxSummary(summaries, "forbiddenDocumentTextMarkerCount"),
      maxSummary(summaries, "sourceBodyMarkerCount")
    ),
    pathExposureCount: maxSummary(summaries, "pathExposureCount")
  };
}

function hasGate(gates, id) {
  return gates.some((item) => item.id === id && item.status === "required-before-write");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function maxSummary(summaries, fieldName) {
  return Math.max(...summaries.map((summary) => number(summary?.[fieldName])));
}

function number(value) {
  return Number(value ?? 0);
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderContractSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P42 Checked Apply Transaction Hardening Contract

## Summary

- status: \`${evidence.status}\`
- envelope fields: ${summary.requiredEnvelopeFieldCount} / ${summary.envelopeFieldCount} required
- required gates: ${summary.requiredGateCount}
- required invariants: ${summary.requiredInvariantCount}
- states: ${summary.stateCount}
- denial bindings: ${summary.denialBindingCount} / ${summary.intakeDenialCaseCount}
- write-enabled states: ${summary.writeEnabledStateCount}
- workspace write / target mutation / checked apply trigger / direct edit: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stage

W-P42.3 should consume this contract to build deterministic preflight denial checker fixtures.
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(serialized, label) {
  const forbidden = [
    /[A-Za-z]:[\\/]/,
    /(?:^|[\\/])work-zone(?:[\\/]|$)/i,
    /(?:^|[\\/])Users[\\/]/i,
    /"sourcesContent"\s*:/i,
    /sk-[A-Za-z0-9_-]{8,}/,
    /ghp_[A-Za-z0-9_]{8,}/,
    /npm_[A-Za-z0-9_]{8,}/
  ];
  const hit = forbidden.find((pattern) => pattern.test(serialized));
  assert.equal(hit, undefined, `${label} contains a forbidden private marker: ${hit}`);
}
