import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp47-closeout-wp48-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutSummaryPath = path.join(outputRoot, "wp47-closeout-summary.md");
const completedRegisterPath = path.join(outputRoot, "wp47-completed-pilot-preparation-register.md");
const deferredGatesPath = path.join(outputRoot, "wp47-real-write-deferred-gates.md");
const wp48InputsPath = path.join(outputRoot, "wp48-c-hia-p2-closeout-inputs.md");
const nextCycleInputsPath = path.join(outputRoot, "c-hia-p3-candidate-inputs.md");

const inputPaths = {
  wp44Closeout: path.join(rootDir, "dist", "wp44-closeout-downstream-inputs", "evidence.json"),
  wp45Closeout: path.join(rootDir, "dist", "wp45-closeout-wp46-wp47-inputs", "evidence.json"),
  wp46Closeout: path.join(rootDir, "dist", "wp46-closeout-wp47-wp48-inputs", "evidence.json"),
  wp47PilotIntake: path.join(rootDir, "dist", "wp47-checked-apply-pilot-intake", "evidence.json"),
  wp47TransactionEnvelope: path.join(rootDir, "dist", "wp47-host-owned-pilot-transaction-envelope", "evidence.json"),
  wp47PreflightGate: path.join(rootDir, "dist", "wp47-file-version-conflict-preflight-pilot-gate", "evidence.json"),
  wp47RollbackAuditGate: path.join(rootDir, "dist", "wp47-rollback-formatter-audit-pilot-gate", "evidence.json"),
  wp47HostConfirmationPacket: path.join(rootDir, "dist", "wp47-host-confirmation-surface-pilot-packet", "evidence.json"),
  wp47OwnerDryRunIntake: path.join(rootDir, "dist", "wp47-target-owner-pilot-dry-run-report-intake", "evidence.json")
};

await main();

/**
 * 收口 W-P47 checked apply write pilot preparation，并生成 W-P48 输入。
 * Close W-P47 checked apply write pilot preparation and generate W-P48 inputs.
 *
 * 中文：本脚本只汇总 W-P47.1-W-P47.6 已完成的 metadata-only pilot
 * preparation evidence，并显式登记真实 target-owner report、final confirmation
 * 与 checked apply write 的后延门禁。它不执行目标命令、不创建 branch/PR/sandbox、
 * 不调用宿主编辑 API、不触发 checked apply、不保存源码正文或 secret。
 *
 * English: This script only summarizes completed metadata-only W-P47.1-W-P47.6
 * pilot-preparation evidence and explicitly registers deferred real
 * target-owner reports, final confirmation, and checked-apply write gates. It
 * does not run target commands, create branches/PRs/sandboxes, call host
 * editor APIs, trigger checked apply, or persist source bodies or secrets.
 *
 * @returns {Promise<void>} Writes public-safe W-P47.7 closeout evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const completedPilotPreparation = createCompletedPilotPreparation(inputs);
  const deferredRealWriteGates = createDeferredRealWriteGates();
  const wp48Inputs = createWp48Inputs(inputs, completedPilotPreparation, deferredRealWriteGates);
  const nextCycleCandidateInputs = createNextCycleCandidateInputs();
  const closeoutMatrix = createCloseoutMatrix(inputs, completedPilotPreparation);
  const summary = summarize({
    closeoutMatrix,
    completedPilotPreparation,
    deferredRealWriteGates,
    inputs,
    nextCycleCandidateInputs,
    wp48Inputs
  });
  const checks = [
    check("HIA_WP47_CLOSEOUT_INPUTS_READY", summary.inputEvidenceCount === 9
      && summary.readyInputEvidenceCount === 9
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP47_CLOSEOUT_CHAIN_COMPLETE", summary.wp47StageCount === 6
      && summary.completedStageReadyCount === 6
      && summary.pilotIntakeReady === true
      && summary.transactionEnvelopeReady === true
      && summary.preflightGateReady === true
      && summary.rollbackAuditGateReady === true
      && summary.hostConfirmationPacketReady === true
      && summary.ownerDryRunIntakeReady === true, {
      actual: {
        completedStageReadyCount: summary.completedStageReadyCount,
        hostConfirmationPacketReady: summary.hostConfirmationPacketReady,
        ownerDryRunIntakeReady: summary.ownerDryRunIntakeReady,
        pilotIntakeReady: summary.pilotIntakeReady,
        preflightGateReady: summary.preflightGateReady,
        rollbackAuditGateReady: summary.rollbackAuditGateReady,
        transactionEnvelopeReady: summary.transactionEnvelopeReady,
        wp47StageCount: summary.wp47StageCount
      }
    }),
    check("HIA_WP47_CLOSEOUT_PILOT_PREPARATION_READY", summary.completedCapabilityCount === 6
      && summary.transactionEnvelopeFieldCount >= 25
      && summary.requiredPilotGateCount >= 15
      && summary.preflightFixtureCount >= 11
      && summary.rollbackAuditFixtureCount >= 14
      && summary.hostConfirmationSurfaceReadyCount === 3
      && summary.ownerReportFixtureCount >= 8, {
      actual: {
        completedCapabilityCount: summary.completedCapabilityCount,
        hostConfirmationSurfaceReadyCount: summary.hostConfirmationSurfaceReadyCount,
        ownerReportFixtureCount: summary.ownerReportFixtureCount,
        preflightFixtureCount: summary.preflightFixtureCount,
        requiredPilotGateCount: summary.requiredPilotGateCount,
        rollbackAuditFixtureCount: summary.rollbackAuditFixtureCount,
        transactionEnvelopeFieldCount: summary.transactionEnvelopeFieldCount
      }
    }),
    check("HIA_WP47_CLOSEOUT_OWNER_INTAKE_BOUNDARY_READY", summary.ownerAcceptedMetadataReportCount === 2
      && summary.ownerRejectedReportCount === 6
      && summary.ownerExpectationMatchedCount === 8
      && summary.realTargetOwnerReportSubmittedCount === 0
      && summary.targetOwnerReportSubmissionSlotReady === true, {
      actual: {
        ownerAcceptedMetadataReportCount: summary.ownerAcceptedMetadataReportCount,
        ownerExpectationMatchedCount: summary.ownerExpectationMatchedCount,
        ownerRejectedReportCount: summary.ownerRejectedReportCount,
        realTargetOwnerReportSubmittedCount: summary.realTargetOwnerReportSubmittedCount,
        targetOwnerReportSubmissionSlotReady: summary.targetOwnerReportSubmissionSlotReady
      }
    }),
    check("HIA_WP47_CLOSEOUT_DEFERRED_GATES_EXPLICIT", summary.deferredRealWriteGateCount >= 12
      && summary.finalConfirmationDeferred === true
      && summary.realCheckedApplyWriteDeferred === true
      && summary.realTargetOwnerReportDeferred === true
      && summary.targetMutationDeferred === true, {
      actual: {
        deferredRealWriteGateCount: summary.deferredRealWriteGateCount,
        finalConfirmationDeferred: summary.finalConfirmationDeferred,
        realCheckedApplyWriteDeferred: summary.realCheckedApplyWriteDeferred,
        realTargetOwnerReportDeferred: summary.realTargetOwnerReportDeferred,
        targetMutationDeferred: summary.targetMutationDeferred
      }
    }),
    check("HIA_WP47_CLOSEOUT_WP48_INPUTS_READY", summary.cHiaP2PhaseInputCount === 4
      && summary.wp48InputCount >= 10
      && summary.nextCycleCandidateInputCount >= 5
      && summary.readyForWp48CycleCloseout === true
      && summary.readyForCHiaP3CandidatePlanning === true, {
      actual: {
        cHiaP2PhaseInputCount: summary.cHiaP2PhaseInputCount,
        nextCycleCandidateInputCount: summary.nextCycleCandidateInputCount,
        readyForCHiaP3CandidatePlanning: summary.readyForCHiaP3CandidatePlanning,
        readyForWp48CycleCloseout: summary.readyForWp48CycleCloseout,
        wp48InputCount: summary.wp48InputCount
      }
    }),
    check("HIA_WP47_CLOSEOUT_NO_EXECUTION_OR_WRITE", summary.checkedApplyWriteEnabledCount === 0
      && summary.pilotWriteAuthorizedCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectProducedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.formatterExecutedInThisStageCount === 0
      && summary.rollbackRestoreExecutedInThisStageCount === 0
      && summary.postApplyValidationExecutedInThisStageCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectProducedCount: summary.directEditObjectProducedCount,
        externalNetworkCallExecutedCount: summary.externalNetworkCallExecutedCount,
        formatterExecutedInThisStageCount: summary.formatterExecutedInThisStageCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        pilotWriteAuthorizedCount: summary.pilotWriteAuthorizedCount,
        postApplyValidationExecutedInThisStageCount: summary.postApplyValidationExecutedInThisStageCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        rollbackRestoreExecutedInThisStageCount: summary.rollbackRestoreExecutedInThisStageCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP47_CLOSEOUT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.reportBodyStoredCount === 0
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.rollbackContentIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        digestValueIncludedCount: summary.digestValueIncludedCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        reportBodyStoredCount: summary.reportBodyStoredCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        rollbackContentIncludedCount: summary.rollbackContentIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP47_CLOSEOUT_NEXT_STAGE_READY", summary.nextStage === "W-P48 Runtime And Controlled Execution Closeout"
      && summary.readyForWp48CycleCloseout === true, {
      actual: {
        nextStage: summary.nextStage,
        readyForWp48CycleCloseout: summary.readyForWp48CycleCloseout
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P47.7 closeout has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp47-closeout-wp48-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp48-runtime-controlled-execution-closeout",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    closeoutPolicy: {
      policy: "checked-apply-pilot-preparation-closeout-only",
      checkedApplyWriteEnabledByThisStage: false,
      pilotWriteAuthorizedByThisStage: false,
      realTargetOwnerReportSubmittedByThisStage: false,
      finalHumanConfirmationCollectedByThisStage: false,
      hostEditorApiCalledByThisStage: false,
      hiaAutomationMayRunTargetCommand: false,
      hiaAutomationMayCreateBranchOrPullRequest: false,
      hiaAutomationMayCreateSandbox: false,
      hiaAutomationMayMutateTargetRepository: false,
      sourcesContentPolicy: "none"
    },
    closeoutMatrix,
    completedPilotPreparation,
    deferredRealWriteGates,
    wp48CycleCloseoutInputs: wp48Inputs,
    nextCycleCandidateInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutSummaryPath),
      completedPilotPreparationRegister: normalizePath(completedRegisterPath),
      deferredRealWriteGates: normalizePath(deferredGatesPath),
      nextCycleCandidateInputs: normalizePath(nextCycleInputsPath),
      wp48CycleCloseoutInputs: normalizePath(wp48InputsPath)
    },
    nextContractInputs: [
      ...wp48Inputs.items,
      ...deferredRealWriteGates.items,
      ...nextCycleCandidateInputs.items
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P47.7 closeout evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummary(evidence), "utf8");
  await writeFile(completedRegisterPath, renderCompletedRegister(evidence), "utf8");
  await writeFile(deferredGatesPath, renderDeferredGates(evidence), "utf8");
  await writeFile(wp48InputsPath, renderWp48Inputs(evidence), "utf8");
  await writeFile(nextCycleInputsPath, renderNextCycleInputs(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    closeoutSummary: closeoutSummaryPath,
    completedRegister: completedRegisterPath,
    deferredGates: deferredGatesPath,
    evidence: evidencePath,
    nextCycleInputs: nextCycleInputsPath,
    wp48Inputs: wp48InputsPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P47 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P47 closeout summary prepared at ${normalizePath(closeoutSummaryPath)}`);
  console.log(`W-P47 completed pilot preparation register prepared at ${normalizePath(completedRegisterPath)}`);
  console.log(`W-P47 deferred real write gates prepared at ${normalizePath(deferredGatesPath)}`);
  console.log(`W-P47 W-P48 inputs prepared at ${normalizePath(wp48InputsPath)}`);
  console.log(`W-P47 next cycle candidate inputs prepared at ${normalizePath(nextCycleInputsPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)]));
  return Object.fromEntries(entries);
}

function createCloseoutMatrix(inputs, completedPilotPreparation) {
  return {
    contract: "hia-wp47-closeout-matrix",
    contractVersion: "0.1.0-draft",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P47.7",
    completedStages: completedPilotPreparation.items,
    upstreamCloseoutRefs: [
      upstream("W-P44", "real-host-runtime-capture-execution", inputs.wp44Closeout.status),
      upstream("W-P45", "controlled-remote-provider-execution-slice", inputs.wp45Closeout.status),
      upstream("W-P46", "target-owner-evidence-ingestion-and-adoption-trial", inputs.wp46Closeout.status)
    ],
    finalState: {
      closeoutStatus: "completed-first-round",
      checkedApplyPilotPreparationReady: true,
      readyForWp48Closeout: true,
      realTargetOwnerReportSubmitted: false,
      finalHumanConfirmationCollected: false,
      checkedApplyWriteEnabled: false,
      targetRepositoryMutationAllowed: false,
      providerNetworkExecuted: false,
      sourcesContentPolicy: "none"
    }
  };
}

function createCompletedPilotPreparation(inputs) {
  return {
    contract: "hia-wp47-completed-pilot-preparation-register",
    contractVersion: "0.1.0-draft",
    registerStatus: "completed-first-round",
    items: [
      completed("W-P47.1", "write-authority-baseline", inputs.wp47PilotIntake.status, "ready-for-wp47-host-owned-pilot-transaction-envelope", "Fixed pilot readiness and denial-before-write baseline."),
      completed("W-P47.2", "host-owned-transaction-envelope", inputs.wp47TransactionEnvelope.status, "ready-for-wp47-file-version-conflict-preflight-pilot-gate", "Defined host-owned transaction envelope, fields, states and invariants."),
      completed("W-P47.3", "file-version-conflict-preflight-gate", inputs.wp47PreflightGate.status, "ready-for-wp47-rollback-formatter-audit-pilot-gate", "Converted file snapshot, stale snapshot, conflict and repeat-check cases into deterministic fixtures."),
      completed("W-P47.4", "rollback-formatter-audit-gate", inputs.wp47RollbackAuditGate.status, "ready-for-wp47-host-confirmation-surface-pilot-packet", "Bound rollback, formatter, post-validation and redacted audit checks before any future write."),
      completed("W-P47.5", "host-confirmation-surface-packet", inputs.wp47HostConfirmationPacket.status, "ready-for-wp47-target-owner-pilot-dry-run-report-intake", "Projected disabled apply and final-confirmation requirements to VS Code, DevTools and Visual Studio."),
      completed("W-P47.6", "target-owner-dry-run-report-intake", inputs.wp47OwnerDryRunIntake.status, "ready-for-wp47-closeout-and-wp48-inputs", "Defined metadata-only target-owner pilot dry-run report intake and rejection paths.")
    ]
  };
}

function createDeferredRealWriteGates() {
  return {
    contract: "hia-wp47-real-write-deferred-gates",
    contractVersion: "0.1.0-draft",
    gateStatus: "deferred-until-explicit-later-cycle",
    items: [
      deferred("real-target-owner-report-submission", "A real target owner must submit an actual dry-run report; current submitted count is zero.", "target-owner"),
      deferred("final-human-confirmation-collection", "The host confirmation surface is ready, but final human confirmation has not been collected.", "host"),
      deferred("checked-apply-write-enable", "Checked apply write stays disabled until a later host-owned write pilot explicitly opens this gate.", "host"),
      deferred("host-editor-api-apply-call", "No host editor API call is allowed during W-P47 closeout.", "host"),
      deferred("repeat-conflict-check-at-write-time", "The conflict check must run again immediately before any later write.", "host"),
      deferred("target-command-execution", "Target commands are target-owner actions, not HIA automation actions.", "target-owner"),
      deferred("target-branch-pr-sandbox-creation", "Branch, pull request and sandbox creation remain target-owner owned.", "target-owner"),
      deferred("target-repository-mutation", "No target repository mutation is granted by W-P47.", "target-owner"),
      deferred("formatter-execution-in-target", "Formatter plans are prepared, but target formatting is not executed in this phase.", "host"),
      deferred("rollback-restore-execution", "Rollback records are prepared, but no rollback restore is executed in this phase.", "host"),
      deferred("post-apply-validation-execution", "Post-apply validation plans are prepared, but not executed in this phase.", "host"),
      deferred("redacted-audit-finalization", "A final audit record can only be finalized after a real host-owned action.", "host"),
      deferred("remote-provider-success-result", "W-P45 remains blocked before network; no real provider result is available.", "host"),
      deferred("source-content-sharing", "Source bodies remain denied unless a later explicit privacy policy grants bounded opt-in.", "host")
    ]
  };
}

function createWp48Inputs(inputs, completedPilotPreparation, deferredRealWriteGates) {
  return {
    contract: "hia-wp47-wp48-cycle-closeout-inputs",
    contractVersion: "0.1.0-draft",
    inputStatus: "ready-for-wp48-cycle-closeout",
    cycleGroupId: "C-HIA-P2",
    phaseInputs: [
      phaseInput("W-P44", "host-runtime-observation-closeout", inputs.wp44Closeout.status),
      phaseInput("W-P45", "controlled-provider-execution-closeout", inputs.wp45Closeout.status),
      phaseInput("W-P46", "target-owner-evidence-ingestion-closeout", inputs.wp46Closeout.status),
      phaseInput("W-P47", "checked-apply-pilot-preparation-closeout", "ready-for-wp48-runtime-controlled-execution-closeout")
    ],
    items: [
      wp48Input("wp44-host-runtime-observation", "Record VS Code and DevTools user-confirmed observations plus Visual Studio route decision without upgrading them to release-grade captured archives.", inputs.wp44Closeout.status),
      wp48Input("wp45-provider-execution-blocked-result", "Record the OpenAI Responses API provider binding and explicit blocked-before-network result as governance evidence, not provider success.", inputs.wp45Closeout.status),
      wp48Input("wp46-target-owner-evidence-ingestion", "Record owner evidence schema, redaction validator, host projections, adoption matrix and report handoff as metadata-only readiness.", inputs.wp46Closeout.status),
      wp48Input("wp47-checked-apply-pilot-preparation", "Record W-P47 pilot preparation as completed-first-round while keeping real write authority deferred.", "ready-for-wp48-runtime-controlled-execution-closeout"),
      wp48Input("wp47-host-owned-transaction-contract", "Carry host-owned transaction envelope, file-version/conflict preflight and rollback/formatter/audit gates into W-P48 closeout.", completedPilotPreparation.registerStatus),
      wp48Input("wp47-three-host-confirmation-surface", "Carry VS Code, Chrome DevTools and Visual Studio confirmation surface readiness into W-P48 closeout.", inputs.wp47HostConfirmationPacket.status),
      wp48Input("wp47-owner-dry-run-report-intake", "Carry target-owner metadata-only report intake and rejection paths into W-P48 closeout.", inputs.wp47OwnerDryRunIntake.status),
      wp48Input("real-write-deferred-gate-register", "Carry every real write, final confirmation, target command and target mutation gate as deferred explicit inputs.", deferredRealWriteGates.gateStatus),
      wp48Input("privacy-and-source-content-boundary", "Preserve sourcesContentPolicy none and metadata-only public evidence across the C-HIA-P2 closeout.", "ready-for-wp48-cycle-closeout"),
      wp48Input("next-cycle-candidate-input-register", "Prepare C-HIA-P3 or later candidate inputs without treating them as completed W-P47 work.", "candidate-ready-for-discussion")
    ]
  };
}

function createNextCycleCandidateInputs() {
  return {
    contract: "hia-wp47-next-cycle-candidate-inputs",
    contractVersion: "0.1.0-draft",
    inputStatus: "candidate-for-c-hia-p3-or-later",
    items: [
      candidate("self-documentation-quality-pass", "Arrange one or two cycles for code cleanup, bilingual API comments and HIA self-documentation with the current toolchain."),
      candidate("generated-doc-binding-pug-to-htmdoc", "Research and design generated-template documentation binding such as upstream Pug annotation to downstream HTMDoc targets."),
      candidate("visual-studio-extension-implementation", "Move Visual Studio from route decision/skeleton toward a real plugin/runtime capture surface after dependency and license audit."),
      candidate("source-linked-locale-projection", "Plan source-linked renderer and IDE projection for inline multilingual comments without embedding private source bodies."),
      candidate("controlled-provider-execution-revisit", "Revisit real provider smoke only after concrete final network consent and host-managed secret access are explicit."),
      candidate("real-checked-apply-write-pilot", "Start a separate later pilot for actual host-owned write execution after W-P48 closeout clarifies gates.")
    ]
  };
}

function summarize({
  closeoutMatrix,
  completedPilotPreparation,
  deferredRealWriteGates,
  inputs,
  nextCycleCandidateInputs,
  wp48Inputs
}) {
  const publicSurface = JSON.stringify({
    closeoutMatrix,
    completedPilotPreparation,
    deferredRealWriteGates,
    nextCycleCandidateInputs,
    wp48Inputs
  });
  const allInputSummaries = Object.values(inputs).map((item) => item.summary ?? {});
  const completedItems = completedPilotPreparation.items;
  const wp48PhaseInputs = wp48Inputs.phaseInputs;
  const deferredItems = deferredRealWriteGates.items;

  return {
    phase: "W-P47.7",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount: Object.values(inputs).filter(isReadyEvidence).length,
    inputHardFailureCount: sum(allInputSummaries.map((item) => item.hardFailureCount)),
    wp47StageCount: completedItems.length,
    completedStageReadyCount: completedItems.filter((item) => item.completed).length,
    completedCapabilityCount: completedItems.length,
    pilotIntakeReady: inputs.wp47PilotIntake.status === "ready-for-wp47-host-owned-pilot-transaction-envelope",
    transactionEnvelopeReady: inputs.wp47TransactionEnvelope.status === "ready-for-wp47-file-version-conflict-preflight-pilot-gate",
    preflightGateReady: inputs.wp47PreflightGate.status === "ready-for-wp47-rollback-formatter-audit-pilot-gate",
    rollbackAuditGateReady: inputs.wp47RollbackAuditGate.status === "ready-for-wp47-host-confirmation-surface-pilot-packet",
    hostConfirmationPacketReady: inputs.wp47HostConfirmationPacket.status === "ready-for-wp47-target-owner-pilot-dry-run-report-intake",
    ownerDryRunIntakeReady: inputs.wp47OwnerDryRunIntake.status === "ready-for-wp47-closeout-and-wp48-inputs",
    requiredPilotGateCount: number(inputs.wp47PilotIntake.summary?.pilotGateCount),
    transactionEnvelopeFieldCount: number(inputs.wp47TransactionEnvelope.summary?.envelopeFieldCount),
    transactionRequiredInvariantCount: number(inputs.wp47TransactionEnvelope.summary?.requiredInvariantCount),
    preflightFixtureCount: number(inputs.wp47PreflightGate.summary?.fixtureCount),
    preflightDenialFixtureCount: number(inputs.wp47PreflightGate.summary?.denialFixtureCount),
    rollbackAuditFixtureCount: number(inputs.wp47RollbackAuditGate.summary?.fixtureCount),
    rollbackAuditDenialFixtureCount: number(inputs.wp47RollbackAuditGate.summary?.denialFixtureCount),
    hostConfirmationSurfaceReadyCount: number(inputs.wp47HostConfirmationPacket.summary?.readyHostSurfaceCount),
    hostConfirmationPacketReadyCount: number(inputs.wp47HostConfirmationPacket.summary?.readyPacketCount),
    hostVisibleRequirementCount: number(inputs.wp47HostConfirmationPacket.summary?.totalVisibleRequirementCount),
    ownerReportFixtureCount: number(inputs.wp47OwnerDryRunIntake.summary?.fixtureCount),
    ownerAcceptedMetadataReportCount: number(inputs.wp47OwnerDryRunIntake.summary?.acceptedFixtureReportCount),
    ownerRejectedReportCount: number(inputs.wp47OwnerDryRunIntake.summary?.rejectedFixtureReportCount),
    ownerExpectationMatchedCount: number(inputs.wp47OwnerDryRunIntake.summary?.expectationMatchedCount),
    ownerRejectionReasonKindCount: number(inputs.wp47OwnerDryRunIntake.summary?.rejectionReasonKindCount),
    realTargetOwnerReportSubmittedCount: number(inputs.wp47OwnerDryRunIntake.summary?.realTargetOwnerReportSubmittedCount),
    targetOwnerReportSubmissionSlotReady: inputs.wp47OwnerDryRunIntake.summary?.targetOwnerReportSubmissionSlotReady === true,
    deferredRealWriteGateCount: deferredItems.length,
    finalConfirmationDeferred: deferredItems.some((item) => item.id === "final-human-confirmation-collection"),
    realCheckedApplyWriteDeferred: deferredItems.some((item) => item.id === "checked-apply-write-enable"),
    realTargetOwnerReportDeferred: deferredItems.some((item) => item.id === "real-target-owner-report-submission"),
    targetMutationDeferred: deferredItems.some((item) => item.id === "target-repository-mutation"),
    cHiaP2PhaseInputCount: wp48PhaseInputs.length,
    cHiaP2ReadyPhaseInputCount: wp48PhaseInputs.filter((item) => item.inputStatus === "ready-for-wp48-closeout").length,
    wp48InputCount: wp48Inputs.items.length,
    nextCycleCandidateInputCount: nextCycleCandidateInputs.items.length,
    readyForWp48CycleCloseout: true,
    readyForCHiaP3CandidatePlanning: true,
    checkedApplyWriteEnabledCount: sum([
      boolCount(inputs.wp47PilotIntake.summary?.checkedApplyWriteEnabled),
      boolCount(inputs.wp47TransactionEnvelope.summary?.checkedApplyWriteEnabled),
      boolCount(inputs.wp47PreflightGate.summary?.checkedApplyWriteEnabled),
      boolCount(inputs.wp47RollbackAuditGate.summary?.checkedApplyWriteEnabled),
      number(inputs.wp47HostConfirmationPacket.summary?.checkedApplyWriteEnabledHostCount),
      number(inputs.wp47OwnerDryRunIntake.summary?.checkedApplyWriteEnabledCount)
    ]),
    pilotWriteAuthorizedCount: sum([
      boolCount(inputs.wp47PilotIntake.summary?.pilotWriteAuthorized),
      boolCount(inputs.wp47TransactionEnvelope.summary?.pilotWriteAuthorized),
      boolCount(inputs.wp47PreflightGate.summary?.pilotWriteAuthorized),
      boolCount(inputs.wp47RollbackAuditGate.summary?.pilotWriteAuthorized),
      number(inputs.wp47HostConfirmationPacket.summary?.pilotWriteAuthorizedHostCount),
      number(inputs.wp47OwnerDryRunIntake.summary?.pilotWriteAuthorizedCount)
    ]),
    hostEditorApiCallCount: sum(allInputSummaries.map((item) => item.hostEditorApiCallCount)),
    checkedApplyTriggeredCount: sum(allInputSummaries.map((item) => item.checkedApplyTriggeredCount)),
    workspaceWriteAllowedCount: sum(allInputSummaries.map((item) => item.workspaceWriteAllowedCount)),
    targetRepositoryMutationCount: sum(allInputSummaries.map((item) => item.targetRepositoryMutationCount)),
    directEditObjectProducedCount: sum(allInputSummaries.map((item) => item.directEditObjectProducedCount ?? item.directEditObjectCount)),
    targetCommandExecutedByHiaCount: sum(allInputSummaries.map((item) => item.targetCommandExecutedByHiaCount ?? item.targetCommandsExecutedByHiaCount)),
    formatterExecutedInThisStageCount: sum(allInputSummaries.map((item) => item.formatterExecutedInThisStageCount)),
    rollbackRestoreExecutedInThisStageCount: sum(allInputSummaries.map((item) => item.rollbackRestoreExecutedInThisStageCount)),
    postApplyValidationExecutedInThisStageCount: sum(allInputSummaries.map((item) => item.postApplyValidationExecutedInThisStageCount)),
    providerNetworkExecutedCount: sum(allInputSummaries.map((item) => item.providerNetworkExecutedCount)),
    externalNetworkCallExecutedCount: sum(allInputSummaries.map((item) => item.externalNetworkCallExecutedCount)),
    reportBodyStoredCount: sum(allInputSummaries.map((item) => item.reportBodyStoredCount ?? item.packetBodyStoredCount)),
    sourceBodyIncludedCount: sum(allInputSummaries.map((item) => item.sourceBodyIncludedCount ?? item.sourceBodyIncludedInEvidenceCount)),
    sourceTextIncludedCount: sum(allInputSummaries.map((item) => item.sourceTextIncludedCount)),
    rollbackContentIncludedCount: sum(allInputSummaries.map((item) => item.rollbackContentIncludedCount)),
    requestBodyIncludedCount: sum(allInputSummaries.map((item) => item.requestBodyIncludedCount)),
    responseBodyIncludedCount: sum(allInputSummaries.map((item) => item.responseBodyIncludedCount)),
    secretValueIncludedCount: sum(allInputSummaries.map((item) => item.secretValueIncludedCount)),
    digestValueIncludedCount: sum(allInputSummaries.map((item) => item.digestValueIncludedCount ?? item.digestValueIncludedInEvidenceCount)),
    localAbsolutePathDetectedCount: sum(allInputSummaries.map((item) => item.localAbsolutePathDetectedCount ?? item.pathExposureCount)) + countPathExposure(publicSurface),
    credentialMaterialMarkerCount: sum(allInputSummaries.map((item) => item.credentialMaterialMarkerCount)) + countCredentialMarkers(publicSurface),
    sourcesContentMarkerCount: sum(allInputSummaries.map((item) => item.sourcesContentMarkerCount)) + (/"sourcesContent"\s*:/iu.test(publicSurface) ? 1 : 0),
    sourcesContentPolicy: "none",
    nextStage: "W-P48 Runtime And Controlled Execution Closeout",
    hardFailureCount: 0
  };
}

function completed(phase, topic, actualStatus, readyStatus, description) {
  return {
    phase,
    topic,
    description,
    status: actualStatus === readyStatus ? "completed-first-round" : "blocked",
    actualStatus,
    readyStatus,
    completed: actualStatus === readyStatus,
    grantsCheckedApplyWriteAuthority: false,
    grantsTargetMutationAuthority: false,
    storesSourceBody: false
  };
}

function deferred(id, reason, owner) {
  return {
    id,
    owner,
    reason,
    status: "deferred-explicitly",
    mayBeCompletedByHiaAutomation: false,
    grantsCheckedApplyWriteAuthorityNow: false,
    grantsTargetMutationAuthorityNow: false
  };
}

function upstream(phase, topic, sourceStatus) {
  return {
    phase,
    topic,
    sourceStatus,
    inputStatus: sourceStatus && sourceStatus !== "blocked" ? "ready-for-wp48-closeout" : "blocked",
    grantsRuntimeAuthority: false,
    grantsProviderNetworkAuthority: false,
    grantsCheckedApplyWriteAuthority: false,
    grantsTargetMutationAuthority: false
  };
}

function phaseInput(phase, topic, sourceStatus) {
  return upstream(phase, topic, sourceStatus);
}

function wp48Input(id, description, sourceStatus) {
  return {
    id,
    description,
    sourceStatus,
    inputStatus: "ready-for-wp48-closeout",
    grantsRuntimeAuthority: false,
    grantsProviderNetworkAuthority: false,
    grantsCheckedApplyWriteAuthority: false,
    grantsTargetMutationAuthority: false,
    sourceBodyRequired: false,
    sourcesContentPolicy: "none"
  };
}

function candidate(id, description) {
  return {
    id,
    description,
    status: "candidate-not-started",
    requiresSeparatePlanning: true,
    completedByWp47: false
  };
}

function renderCloseoutSummary(evidence) {
  const rows = evidence.completedPilotPreparation.items
    .map((item) => `| \`${item.phase}\` | ${item.topic} | \`${item.status}\` | ${item.description} |`)
    .join("\n");

  return `# W-P47.7 Closeout Summary

## 中文摘要

W-P47 checked apply write pilot preparation 已完成第一轮。当前完成的是 host-owned write pilot 的准备链路：baseline、transaction envelope、file version/conflict preflight、rollback/formatter/audit gate、三宿主 confirmation surface，以及 target-owner metadata-only dry-run report intake。

它仍不是 checked apply 真实写入。真实 target-owner report、final human confirmation、host editor API 调用、目标项目命令、目标仓库 mutation 与 checked apply write 都明确后延到后续 gate。

## Summary

- status：\`${evidence.status}\`
- completed W-P47 stages：${evidence.summary.completedStageReadyCount} / ${evidence.summary.wp47StageCount}
- W-P48 inputs：${evidence.summary.wp48InputCount}
- deferred real-write gates：${evidence.summary.deferredRealWriteGateCount}
- next-cycle candidate inputs：${evidence.summary.nextCycleCandidateInputCount}
- real target-owner report submitted：${evidence.summary.realTargetOwnerReportSubmittedCount}
- checked apply write enabled / pilot write authorized：${evidence.summary.checkedApplyWriteEnabledCount} / ${evidence.summary.pilotWriteAuthorizedCount}
- next stage：\`${evidence.summary.nextStage}\`

| Phase | Topic | Status | Description |
| --- | --- | --- | --- |
${rows}
`;
}

function renderCompletedRegister(evidence) {
  const rows = evidence.completedPilotPreparation.items
    .map((item) => `| \`${item.phase}\` | ${item.topic} | \`${item.actualStatus}\` | ${item.completed ? "yes" : "no"} | ${item.grantsCheckedApplyWriteAuthority ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P47 Completed Pilot Preparation Register

## 中文摘要

本 register 只记录 W-P47 已完成的试点准备能力，不记录真实写入执行。

| Phase | Topic | Evidence Status | Completed | Grants Write |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderDeferredGates(evidence) {
  const rows = evidence.deferredRealWriteGates.items
    .map((item) => `| \`${item.id}\` | ${item.owner} | \`${item.status}\` | ${item.reason} |`)
    .join("\n");

  return `# W-P47 Real Write Deferred Gates

## 中文摘要

这些 gate 是 W-P47 closeout 主动保留的真实执行边界。它们不能被 W-P47.1-W-P47.6 的 ready 状态自动满足。

| Gate | Owner | Status | Reason |
| --- | --- | --- | --- |
${rows}
`;
}

function renderWp48Inputs(evidence) {
  const phaseRows = evidence.wp48CycleCloseoutInputs.phaseInputs
    .map((item) => `| \`${item.phase}\` | ${item.topic} | \`${item.sourceStatus}\` |`)
    .join("\n");
  const inputRows = evidence.wp48CycleCloseoutInputs.items
    .map((item) => `| \`${item.id}\` | \`${item.inputStatus}\` | ${item.description} |`)
    .join("\n");

  return `# W-P47 W-P48 C-HIA-P2 Closeout Inputs

## 中文摘要

W-P48 应以 C-HIA-P2 收口为目标，统一整理 W-P44-W-P47 的 completed evidence、observation-only evidence 与 deferred gates。W-P47.7 提供的是 closeout 输入，不授予任何真实 runtime/provider/target/write 权限。

## C-HIA-P2 Phase Inputs

| Phase | Topic | Source Status |
| --- | --- | --- |
${phaseRows}

## W-P48 Inputs

| Input | Status | Description |
| --- | --- | --- |
${inputRows}
`;
}

function renderNextCycleInputs(evidence) {
  const rows = evidence.nextCycleCandidateInputs.items
    .map((item) => `| \`${item.id}\` | \`${item.status}\` | ${item.description} |`)
    .join("\n");

  return `# C-HIA-P3 Candidate Inputs

## 中文摘要

以下事项是 W-P47 closeout 后可进入 C-HIA-P3 或更后续周期的候选输入。它们不是 W-P47 已完成工作，也不替代 W-P48 的 C-HIA-P2 closeout。

| Candidate | Status | Description |
| --- | --- | --- |
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

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function boolCount(value) {
  return value === true ? 1 : 0;
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
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
