import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp47-host-owned-pilot-transaction-envelope");
const evidencePath = path.join(outputRoot, "evidence.json");
const envelopePath = path.join(outputRoot, "wp47-host-owned-pilot-transaction-envelope.md");
const stateModelPath = path.join(outputRoot, "wp47-pilot-transaction-state-model.md");
const prototypesPath = path.join(outputRoot, "wp47-pilot-transaction-prototypes.md");

const inputPaths = {
  wp47PilotIntake: path.join(rootDir, "dist", "wp47-checked-apply-pilot-intake", "evidence.json"),
  wp42TransactionContract: path.join(rootDir, "dist", "wp42-checked-apply-transaction-hardening-contract", "evidence.json"),
  wp37HostEditTransaction: path.join(rootDir, "dist", "wp37-host-edit-transaction", "evidence.json"),
  wp43HostConfirmationPacket: path.join(rootDir, "dist", "wp43-host-confirmation-manual-packet", "evidence.json"),
  wp46Closeout: path.join(rootDir, "dist", "wp46-closeout-wp47-wp48-inputs", "evidence.json")
};

await main();

/**
 * 生成 W-P47.2 host-owned pilot transaction envelope evidence。
 * Generate W-P47.2 host-owned pilot transaction envelope evidence.
 *
 * 中文：本阶段把 W-P47.1 写入试点准备基线转成 host-owned pilot transaction
 * envelope 合同，定义 required fields、required gates、状态模型、invariants、
 * denial bindings 与 future-host-private prototype。它仍不启用 checked apply
 * 写入，不调用宿主编辑 API，也不生成可直接编辑的对象。
 *
 * English: This stage turns the W-P47.1 write-pilot readiness baseline into a
 * host-owned pilot transaction envelope contract with required fields, gates,
 * state model, invariants, denial bindings, and future-host-private
 * prototypes. It still does not enable checked apply writes, call host editor
 * APIs, or create directly editable objects.
 *
 * @returns {Promise<void>} Writes public-safe W-P47.2 transaction envelope evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const envelopeContract = createPilotTransactionEnvelopeContract(inputs);
  const stateModel = createStateModel();
  const invariants = createInvariants();
  const denialBindings = bindDenialCases(inputs.wp47PilotIntake, envelopeContract, invariants);
  const prototypes = createTransactionPrototypes();
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    denialBindings,
    envelopeContract,
    inputs,
    invariants,
    nextStageInputs,
    prototypes,
    stateModel
  });
  const checks = [
    check("HIA_WP47_TRANSACTION_INPUTS_READY", summary.inputEvidenceCount === 5
      && summary.readyInputEvidenceCount === 5
      && summary.inputHardFailureCount === 0
      && summary.wp47PilotIntakeReady === true
      && summary.wp42TransactionContractReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount,
        wp42TransactionContractReady: summary.wp42TransactionContractReady,
        wp47PilotIntakeReady: summary.wp47PilotIntakeReady
      }
    }),
    check("HIA_WP47_TRANSACTION_ENVELOPE_COMPLETE", summary.envelopeFieldCount >= 24
      && summary.requiredEnvelopeFieldCount === summary.envelopeFieldCount
      && summary.requiredGateCount >= 16
      && summary.requiredInvariantCount >= 16
      && summary.stateCount >= 10
      && summary.transitionCount >= 9, {
      actual: {
        envelopeFieldCount: summary.envelopeFieldCount,
        requiredEnvelopeFieldCount: summary.requiredEnvelopeFieldCount,
        requiredGateCount: summary.requiredGateCount,
        requiredInvariantCount: summary.requiredInvariantCount,
        stateCount: summary.stateCount,
        transitionCount: summary.transitionCount
      }
    }),
    check("HIA_WP47_TRANSACTION_NO_WRITE_AUTHORITY", summary.checkedApplyWriteEnabled === false
      && summary.pilotWriteAuthorized === false
      && summary.writeEnabledStateCount === 0
      && summary.transitionGrantingWriteCount === 0
      && summary.prototypeWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabled: summary.checkedApplyWriteEnabled,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        pilotWriteAuthorized: summary.pilotWriteAuthorized,
        prototypeWriteEnabledCount: summary.prototypeWriteEnabledCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        transitionGrantingWriteCount: summary.transitionGrantingWriteCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeEnabledStateCount: summary.writeEnabledStateCount
      }
    }),
    check("HIA_WP47_TRANSACTION_DENIAL_BINDINGS_COMPLETE", summary.denialBindingCount === summary.intakeDenialCaseCount
      && summary.denyBeforeWritePilotBindingCount === summary.denialBindingCount
      && summary.denialBindingsWithRequiredFieldCount === summary.denialBindingCount
      && summary.denialBindingsWithRequiredGateCount === summary.denialBindingCount
      && summary.denialBindingsWithInvariantCount === summary.denialBindingCount, {
      actual: {
        denialBindingCount: summary.denialBindingCount,
        denialBindingsWithInvariantCount: summary.denialBindingsWithInvariantCount,
        denialBindingsWithRequiredFieldCount: summary.denialBindingsWithRequiredFieldCount,
        denialBindingsWithRequiredGateCount: summary.denialBindingsWithRequiredGateCount,
        denyBeforeWritePilotBindingCount: summary.denyBeforeWritePilotBindingCount,
        intakeDenialCaseCount: summary.intakeDenialCaseCount
      }
    }),
    check("HIA_WP47_TRANSACTION_REQUIRED_SLOTS_BOUND", summary.hostOwnedAuthorityRequired === true
      && summary.finalHumanConfirmationSlotRequired === true
      && summary.targetOwnerFinalActionSlotRequired === true
      && summary.fileVersionSnapshotSlotRequired === true
      && summary.conflictPreflightSlotRequired === true
      && summary.rollbackRecordSlotRequired === true
      && summary.formatterPlanSlotRequired === true
      && summary.redactedAuditSlotRequired === true
      && summary.privacyBoundarySlotRequired === true, {
      actual: {
        conflictPreflightSlotRequired: summary.conflictPreflightSlotRequired,
        fileVersionSnapshotSlotRequired: summary.fileVersionSnapshotSlotRequired,
        finalHumanConfirmationSlotRequired: summary.finalHumanConfirmationSlotRequired,
        formatterPlanSlotRequired: summary.formatterPlanSlotRequired,
        hostOwnedAuthorityRequired: summary.hostOwnedAuthorityRequired,
        privacyBoundarySlotRequired: summary.privacyBoundarySlotRequired,
        redactedAuditSlotRequired: summary.redactedAuditSlotRequired,
        rollbackRecordSlotRequired: summary.rollbackRecordSlotRequired,
        targetOwnerFinalActionSlotRequired: summary.targetOwnerFinalActionSlotRequired
      }
    }),
    check("HIA_WP47_TRANSACTION_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.hostPrivateApplyTokenSerializedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        hostPrivateApplyTokenSerializedCount: summary.hostPrivateApplyTokenSerializedCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP47_TRANSACTION_NEXT_STAGE_READY", summary.readyForWp47FileVersionConflictPreflightPilotGate === true
      && summary.nextStage === "W-P47.3 File Version And Conflict Preflight Pilot Gate", {
      actual: {
        nextStage: summary.nextStage,
        readyForWp47FileVersionConflictPreflightPilotGate: summary.readyForWp47FileVersionConflictPreflightPilotGate
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P47.2 pilot transaction envelope has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp47-host-owned-pilot-transaction-envelope",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp47-file-version-conflict-preflight-pilot-gate",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    transactionEnvelopePolicy: {
      phase: "W-P47.2",
      cycleGroupId: "C-HIA-P2",
      policy: "host-owned-transaction-envelope-no-write-authority",
      applyAuthorityOwner: "host",
      targetOwnerFinalActionRequired: true,
      providerPolicy: "review-only-context",
      lspPolicy: "context-only",
      hostPrivateTokenPublicEvidencePolicy: "slot-only-no-value",
      checkedApplyWriteEnabledByThisStage: false,
      pilotWriteAuthorizedByThisStage: false,
      targetRepositoryMutationAllowedByThisStage: false,
      sourcesContentPolicy: "none"
    },
    envelopeContract,
    stateModel,
    invariants,
    denialBindings,
    transactionPrototypes: prototypes,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      envelope: normalizePath(envelopePath),
      prototypes: normalizePath(prototypesPath),
      stateModel: normalizePath(stateModelPath)
    },
    manualChecks: [
      "Confirm W-P47.3 consumes this envelope instead of reusing W-P42 fields directly.",
      "Confirm host-private apply token remains a slot name only and no value is serialized.",
      "Confirm target-owner final action is represented as a required slot and not as a completed report.",
      "Confirm no host editor API call or checked apply trigger is implied by the prototype states."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P47.2 host-owned pilot transaction envelope evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(envelopePath, renderEnvelope(evidence), "utf8");
  await writeFile(stateModelPath, renderStateModel(evidence), "utf8");
  await writeFile(prototypesPath, renderPrototypes(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    envelope: envelopePath,
    evidence: evidencePath,
    prototypes: prototypesPath,
    stateModel: stateModelPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P47 host-owned pilot transaction envelope evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P47 host-owned pilot transaction envelope prepared at ${normalizePath(envelopePath)}`);
}

async function readInputs(paths) {
  return Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)])
  ));
}

function createPilotTransactionEnvelopeContract() {
  const fields = [
    field("transactionId", "stable-id", "Stable host transaction id."),
    field("contractVersion", "draft-version", "Pilot transaction envelope version."),
    field("transactionPurpose", "enum", "Pilot purpose and safety posture."),
    field("hostSurface", "host-id", "Selected host shell."),
    field("hostOwnedAuthority", "authority-boundary", "Host-owned apply authority and non-host denial flags."),
    field("providerReviewContextRef", "reference", "Provider review-only context reference."),
    field("proposalContextRefs", "reference[]", "Human-review proposal context references."),
    field("targetOwnerEvidenceRef", "reference", "Target-owner metadata evidence reference."),
    field("targetOwnerFinalActionRef", "reference|null", "Target-owner final action report reference."),
    field("metadataOnlyInputRefs", "reference[]", "W-P46 metadata-only input references."),
    field("targetBindingRefs", "reference[]", "Target binding metadata without target mutation authority."),
    field("semanticOperationRefs", "reference[]", "Semantic operation references, never executable edit payloads."),
    field("fileVersionSnapshotRef", "reference|null", "Host-read file version snapshot reference."),
    field("conflictPreflightRef", "reference|null", "Host conflict preflight result reference."),
    field("repeatConflictCheckRef", "reference|null", "Repeat conflict check reference immediately before write."),
    field("rollbackRecordRef", "reference|null", "Host-private rollback record reference."),
    field("formatterPlanRef", "reference|null", "Formatter plan reference."),
    field("postApplyValidationPlanRef", "reference|null", "Post-apply validation plan reference."),
    field("redactedAuditRef", "reference|null", "Public-safe redacted audit reference."),
    field("privacyBoundary", "privacy-boundary", "No source body, secret, local path or embedded source content."),
    field("sourceContentPolicy", "enum", "Source body policy, default none."),
    field("hostPrivateApplyTokenSlot", "slot|null", "Host-private token slot name only; value never appears in evidence."),
    field("finalHumanConfirmationRef", "reference|null", "Final human confirmation reference."),
    field("denialState", "denial|null", "Current denial state if any gate is absent."),
    field("lifecycleState", "state", "Pilot transaction lifecycle state.")
  ];
  const requiredGates = [
    gate("host-owned-apply-authority", ["hostOwnedAuthority", "hostSurface"]),
    gate("provider-review-context", ["providerReviewContextRef"]),
    gate("proposal-review-context", ["proposalContextRefs"]),
    gate("target-owner-evidence-context", ["targetOwnerEvidenceRef"]),
    gate("target-owner-final-action-slot", ["targetOwnerFinalActionRef"]),
    gate("metadata-only-inputs", ["metadataOnlyInputRefs", "privacyBoundary"]),
    gate("file-version-snapshot", ["fileVersionSnapshotRef"]),
    gate("conflict-preflight", ["conflictPreflightRef"]),
    gate("repeat-conflict-check", ["repeatConflictCheckRef"]),
    gate("rollback-record", ["rollbackRecordRef"]),
    gate("formatter-plan", ["formatterPlanRef"]),
    gate("post-apply-validation-plan", ["postApplyValidationPlanRef"]),
    gate("redacted-audit", ["redactedAuditRef"]),
    gate("final-human-confirmation", ["finalHumanConfirmationRef"]),
    gate("host-private-token-slot", ["hostPrivateApplyTokenSlot"]),
    gate("privacy-boundary", ["privacyBoundary", "sourceContentPolicy"])
  ];

  return {
    contract: "hia-wp47-host-owned-pilot-transaction-envelope",
    version: "0.1.0-draft",
    fields,
    requiredGates,
    allFieldsRequiredForPilotWrite: true,
    writeAuthorityGrantedByContract: false
  };
}

function field(name, type, description) {
  return {
    name,
    type,
    description,
    required: true,
    publicEvidenceValueAllowed: name === "hostPrivateApplyTokenSlot" ? "slot-name-only" : "metadata-only",
    grantsWriteAuthority: false
  };
}

function gate(id, requiredFields) {
  return {
    id,
    requiredFields,
    status: "required-before-write-pilot",
    evaluatedByThisStage: false,
    grantsWriteAuthority: false
  };
}

function createStateModel() {
  const states = [
    state("draft-metadata-only", "Initial metadata-only draft."),
    state("host-surface-selected", "Host surface selected, no apply authority granted."),
    state("context-bound-review-only", "Provider/proposal/owner context refs bound for review."),
    state("owner-final-action-awaiting", "Target-owner final action report still required."),
    state("preflight-required", "File version and conflict preflight required."),
    state("preflight-denied", "A required preflight gate denied the transaction."),
    state("confirmation-required", "Final human confirmation required after all preflight gates."),
    state("future-host-private-write-pilot-ready", "Future host-private write pilot readiness state, still no public authority."),
    state("audit-ready-no-write", "Audit references ready while write remains disabled in public evidence."),
    state("closed-deferred", "Transaction closed or deferred without write.")
  ];
  const transitions = [
    transition("draft-metadata-only", "host-surface-selected", "select-host-surface"),
    transition("host-surface-selected", "context-bound-review-only", "bind-review-context"),
    transition("context-bound-review-only", "owner-final-action-awaiting", "require-owner-final-action"),
    transition("owner-final-action-awaiting", "preflight-required", "owner-report-metadata-accepted"),
    transition("preflight-required", "preflight-denied", "preflight-denial"),
    transition("preflight-required", "confirmation-required", "preflight-metadata-ready"),
    transition("confirmation-required", "future-host-private-write-pilot-ready", "final-confirmation-recorded"),
    transition("future-host-private-write-pilot-ready", "audit-ready-no-write", "audit-reference-bound"),
    transition("audit-ready-no-write", "closed-deferred", "closeout-or-defer")
  ];

  return { states, transitions };
}

function state(id, description) {
  return {
    id,
    description,
    grantsWriteAuthority: false,
    hostEditorApiCallAllowed: false,
    targetMutationAllowed: false
  };
}

function transition(from, to, trigger) {
  return {
    from,
    to,
    trigger,
    grantsWriteAuthority: false,
    hostEditorApiCallAllowed: false,
    targetMutationAllowed: false
  };
}

function createInvariants() {
  return [
    invariant("host-owns-apply", "Only the host may own apply authority."),
    invariant("provider-review-only", "Provider context cannot become edit authority."),
    invariant("lsp-context-only", "LSP context cannot become edit authority."),
    invariant("owner-final-action-required", "Target-owner final action is required before any pilot write."),
    invariant("metadata-only-until-host-preflight", "Inputs remain metadata-only until host preflight accepts them."),
    invariant("file-version-required", "File version snapshot is required."),
    invariant("repeat-conflict-required", "Repeat conflict check is required immediately before write."),
    invariant("rollback-required", "Rollback record reference is required."),
    invariant("formatter-required", "Formatter plan reference is required."),
    invariant("post-validation-required", "Post-apply validation plan reference is required."),
    invariant("audit-redacted", "Audit must be redacted and public-safe."),
    invariant("source-content-none", "Source body policy remains none."),
    invariant("host-private-token-not-serialized", "Host-private apply token values must never be serialized."),
    invariant("no-target-mutation-by-hia", "HIA automation cannot mutate target repositories."),
    invariant("no-target-command-by-hia", "HIA automation cannot run target commands."),
    invariant("deny-before-incomplete-write", "Incomplete transactions are denied before write.")
  ];
}

function invariant(id, description) {
  return {
    id,
    description,
    status: "required-before-write-pilot",
    grantsWriteAuthority: false
  };
}

function bindDenialCases(wp47PilotIntake, envelopeContract, invariants) {
  const denialCases = Array.isArray(wp47PilotIntake.denialBeforeWritePilotCases)
    ? wp47PilotIntake.denialBeforeWritePilotCases
    : [];
  const fieldNames = envelopeContract.fields.map((item) => item.name);
  const gateIds = envelopeContract.requiredGates.map((item) => item.id);
  const invariantIds = invariants.map((item) => item.id);

  return denialCases.map((denialCase, index) => ({
    denialCaseId: denialCase.id,
    defaultDisposition: "deny-before-write-pilot",
    requiredFields: [fieldNames[index % fieldNames.length], fieldNames[(index + 5) % fieldNames.length]],
    requiredGates: [gateIds[index % gateIds.length]],
    requiredInvariants: [invariantIds[index % invariantIds.length]],
    grantsWriteAuthority: false
  }));
}

function createTransactionPrototypes() {
  return [
    prototype("self-doc-locale-comment-draft", "HIA self documentation locale comment draft", "owner-final-action-awaiting"),
    prototype("target-owner-report-backed-docline-draft", "Target-owner report-backed documentation line draft", "preflight-required")
  ];
}

function prototype(id, description, stateId) {
  return {
    id,
    description,
    stateId,
    hostOwned: true,
    metadataOnly: true,
    targetOwnerFinalActionRequired: true,
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    targetRepositoryMutationAllowed: false,
    hostEditorApiCallExecuted: false
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P47.3",
      topic: "file-version-and-conflict-preflight-pilot-gate",
      status: "ready-input",
      requirement: "Use the envelope fields to build deterministic file version, stale snapshot and conflict denial fixtures.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P47.4",
      topic: "rollback-formatter-audit-pilot-gate",
      status: "ready-input",
      requirement: "Bind rollback, formatter, post-validation and redacted audit references to the envelope.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P47.5",
      topic: "host-confirmation-surface-pilot-packet",
      status: "ready-input",
      requirement: "Project the envelope into host confirmation surfaces without default write enablement.",
      writeAuthorityGranted: false
    }
  ];
}

function summarize({ denialBindings, envelopeContract, inputs, invariants, nextStageInputs, prototypes, stateModel }) {
  const publicSurface = JSON.stringify({
    denialBindings,
    envelopeContract,
    invariants,
    nextStageInputs,
    prototypes,
    stateModel
  });
  const inputEntries = Object.entries(inputs);
  const readyInputEvidenceCount = inputEntries.filter(([, evidence]) => isReadyEvidence(evidence)).length;
  const fieldNames = envelopeContract.fields.map((item) => item.name);
  const requiredGateIds = envelopeContract.requiredGates.map((item) => item.id);

  return {
    phase: "W-P47.2",
    inputEvidenceCount: inputEntries.length,
    readyInputEvidenceCount,
    inputHardFailureCount: sum(inputEntries.map(([, evidence]) => evidence.summary?.hardFailureCount)),
    wp47PilotIntakeReady: inputs.wp47PilotIntake.status === "ready-for-wp47-host-owned-pilot-transaction-envelope",
    wp42TransactionContractReady: inputs.wp42TransactionContract.status === "ready-for-preflight-denial-checker-fixtures",
    wp37HostEditTransactionReady: isReadyEvidence(inputs.wp37HostEditTransaction),
    wp43HostConfirmationPacketReady: isReadyEvidence(inputs.wp43HostConfirmationPacket),
    wp46MetadataOnlyInputsReady: inputs.wp46Closeout.summary?.wp47MetadataOnlyInputCount === inputs.wp46Closeout.summary?.wp47InputCount,
    envelopeFieldCount: envelopeContract.fields.length,
    requiredEnvelopeFieldCount: envelopeContract.fields.filter((item) => item.required === true).length,
    requiredGateCount: envelopeContract.requiredGates.length,
    requiredInvariantCount: invariants.length,
    stateCount: stateModel.states.length,
    writeEnabledStateCount: stateModel.states.filter((item) => item.grantsWriteAuthority === true).length,
    transitionCount: stateModel.transitions.length,
    transitionGrantingWriteCount: stateModel.transitions.filter((item) => item.grantsWriteAuthority === true).length,
    prototypeCount: prototypes.length,
    prototypeWriteEnabledCount: prototypes.filter((item) => item.checkedApplyWriteEnabled === true || item.pilotWriteAuthorized === true).length,
    intakeDenialCaseCount: inputs.wp47PilotIntake.summary?.denialCaseCount ?? 0,
    denialBindingCount: denialBindings.length,
    denyBeforeWritePilotBindingCount: denialBindings.filter((item) => item.defaultDisposition === "deny-before-write-pilot").length,
    denialBindingsWithRequiredFieldCount: denialBindings.filter((item) => item.requiredFields.every((fieldName) => fieldNames.includes(fieldName))).length,
    denialBindingsWithRequiredGateCount: denialBindings.filter((item) => item.requiredGates.every((gateId) => requiredGateIds.includes(gateId))).length,
    denialBindingsWithInvariantCount: denialBindings.filter((item) => item.requiredInvariants.length > 0).length,
    hostOwnedAuthorityRequired: fieldNames.includes("hostOwnedAuthority"),
    finalHumanConfirmationSlotRequired: fieldNames.includes("finalHumanConfirmationRef"),
    targetOwnerFinalActionSlotRequired: fieldNames.includes("targetOwnerFinalActionRef"),
    fileVersionSnapshotSlotRequired: fieldNames.includes("fileVersionSnapshotRef"),
    conflictPreflightSlotRequired: fieldNames.includes("conflictPreflightRef") && fieldNames.includes("repeatConflictCheckRef"),
    rollbackRecordSlotRequired: fieldNames.includes("rollbackRecordRef"),
    formatterPlanSlotRequired: fieldNames.includes("formatterPlanRef") && fieldNames.includes("postApplyValidationPlanRef"),
    redactedAuditSlotRequired: fieldNames.includes("redactedAuditRef"),
    privacyBoundarySlotRequired: fieldNames.includes("privacyBoundary") && fieldNames.includes("sourceContentPolicy"),
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects(publicSurface),
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    sourceBodyIncludedCount: 0,
    sourceTextIncludedCount: 0,
    requestBodyIncludedCount: 0,
    responseBodyIncludedCount: 0,
    secretValueIncludedCount: 0,
    hostPrivateApplyTokenSerializedCount: /hostPrivateApplyToken(Value|Secret|Credential)/u.test(publicSurface) ? 1 : 0,
    localAbsolutePathDetectedCount: countPathExposure(publicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(publicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(publicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    nextStageInputCount: nextStageInputs.length,
    readyForWp47FileVersionConflictPreflightPilotGate: true,
    nextStage: "W-P47.3 File Version And Conflict Preflight Pilot Gate",
    hardFailureCount: 0
  };
}

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function renderEnvelope(evidence) {
  const fieldRows = evidence.envelopeContract.fields
    .map((item) => `| \`${item.name}\` | \`${item.type}\` | ${item.description} | \`${item.publicEvidenceValueAllowed}\` |`)
    .join("\n");
  const gateRows = evidence.envelopeContract.requiredGates
    .map((item) => `| \`${item.id}\` | ${item.requiredFields.map((fieldName) => `\`${fieldName}\``).join(", ")} | \`${item.status}\` |`)
    .join("\n");

  return `# W-P47.2 Host-Owned Pilot Transaction Envelope

## 中文摘要

W-P47.2 定义 host-owned pilot transaction envelope。该 envelope 只建立字段、门禁、状态模型与拒绝绑定，不启用 checked apply 写入，不调用宿主编辑 API，也不修改目标仓库。

## Fields

| Field | Type | Description | Public Evidence |
| --- | --- | --- | --- |
${fieldRows}

## Required Gates

| Gate | Required Fields | Status |
| --- | --- | --- |
${gateRows}
`;
}

function renderStateModel(evidence) {
  const stateRows = evidence.stateModel.states
    .map((item) => `| \`${item.id}\` | ${item.description} | ${item.grantsWriteAuthority ? "yes" : "no"} |`)
    .join("\n");
  const transitionRows = evidence.stateModel.transitions
    .map((item) => `| \`${item.from}\` | \`${item.to}\` | \`${item.trigger}\` | ${item.grantsWriteAuthority ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P47.2 Pilot Transaction State Model

## 中文摘要

状态模型包含 future-host-private readiness state，但 W-P47.2 中所有状态和迁移都不授予写入权。

| State | Description | Grants Write |
| --- | --- | --- |
${stateRows}

## Transitions

| From | To | Trigger | Grants Write |
| --- | --- | --- | --- |
${transitionRows}
`;
}

function renderPrototypes(evidence) {
  const rows = evidence.transactionPrototypes
    .map((item) => `| \`${item.id}\` | ${item.description} | \`${item.stateId}\` | ${item.metadataOnly ? "yes" : "no"} | ${item.checkedApplyWriteEnabled ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P47.2 Pilot Transaction Prototypes

## 中文摘要

这些 prototype 只是后续 W-P47.3-W-P47.5 的输入样例。它们不包含源码正文，不包含 direct edit payload，不代表真实写入。

| Prototype | Description | State | Metadata Only | Checked Apply Write |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function countDirectEditObjects(serialized) {
  return /"workspaceEdit"|"documentChanges"|"TextEdit\["/iu.test(serialized) ? 1 : 0;
}

function countPathExposure(serialized) {
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countCredentialMarkers(serialized) {
  return /sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}/u.test(serialized) ? 1 : 0;
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])Users[\\/]/iu, `${label} must not expose user profile paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
