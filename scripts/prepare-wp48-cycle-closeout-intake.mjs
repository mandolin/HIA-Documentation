import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp48-cycle-closeout-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const summaryPath = path.join(outputRoot, "wp48-cycle-closeout-intake-summary.md");
const registryPath = path.join(outputRoot, "c-hia-p2-closeout-evidence-registry.md");
const phaseLedgerPath = path.join(outputRoot, "c-hia-p2-phase-closeout-ledger.md");
const deferredGatePath = path.join(outputRoot, "wp48-deferred-gate-intake.md");

const inputPaths = {
  wp44Closeout: path.join(rootDir, "dist", "wp44-closeout-downstream-inputs", "evidence.json"),
  wp45Closeout: path.join(rootDir, "dist", "wp45-closeout-wp46-wp47-inputs", "evidence.json"),
  wp46Closeout: path.join(rootDir, "dist", "wp46-closeout-wp47-wp48-inputs", "evidence.json"),
  wp47Closeout: path.join(rootDir, "dist", "wp47-closeout-wp48-inputs", "evidence.json")
};

await main();

/**
 * 建立 W-P48 / C-HIA-P2 收口摄入账本。
 * Build the W-P48 / C-HIA-P2 closeout intake ledger.
 *
 * 中文：本脚本只读取 W-P44-W-P47 closeout evidence，并把 completed、
 * observation-only、blocked-before-network、metadata-only 与 deferred gates
 * 分账。它不会执行 provider、联网、宿主编辑 API、目标项目命令或 checked apply。
 *
 * English: This script only reads W-P44-W-P47 closeout evidence and separates
 * completed, observation-only, blocked-before-network, metadata-only, and
 * deferred-gate records. It never executes providers, networks, host editor
 * APIs, target commands, or checked apply.
 *
 * @returns {Promise<void>} Writes public-safe W-P48.1 intake evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const phaseLedger = createPhaseLedger(inputs);
  const closeoutRegistry = createCloseoutRegistry(phaseLedger);
  const deferredGateIntake = createDeferredGateIntake(inputs);
  const nextActions = createNextActions(inputs);
  const summary = summarize({ closeoutRegistry, deferredGateIntake, inputs, nextActions, phaseLedger });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P48.1 closeout intake has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp48-cycle-closeout-intake",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp48-evidence-classification-and-deferred-gate-ledger",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P48.1",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    closeoutPolicy: {
      policy: "cycle-closeout-intake-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      sourcesContentPolicy: "none"
    },
    phaseLedger,
    closeoutRegistry,
    deferredGateIntake,
    nextActions,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      deferredGateIntake: normalizePath(deferredGatePath),
      evidenceRegistry: normalizePath(registryPath),
      phaseCloseoutLedger: normalizePath(phaseLedgerPath),
      summary: normalizePath(summaryPath)
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P48.1 cycle closeout intake evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");
  await writeFile(registryPath, renderRegistry(evidence), "utf8");
  await writeFile(phaseLedgerPath, renderPhaseLedger(evidence), "utf8");
  await writeFile(deferredGatePath, renderDeferredGateIntake(evidence), "utf8");

  console.log(`W-P48 cycle closeout intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P48 cycle closeout intake summary prepared at ${normalizePath(summaryPath)}`);
  console.log(`C-HIA-P2 closeout evidence registry prepared at ${normalizePath(registryPath)}`);
}

/**
 * 读取前序 closeout evidence。
 * Read prior closeout evidence.
 *
 * @param {Record<string, string>} paths Evidence file paths.
 * @returns {Promise<Record<string, unknown>>} Parsed evidence map.
 */
async function readInputs(paths) {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)]));
  return Object.fromEntries(entries);
}

/**
 * 创建 C-HIA-P2 阶段收口账本。
 * Create the C-HIA-P2 phase closeout ledger.
 *
 * @param {Record<string, any>} inputs Parsed prior evidence.
 * @returns {Array<Record<string, unknown>>} Phase closeout rows.
 */
function createPhaseLedger(inputs) {
  return [
    {
      phase: "W-P44",
      topic: "real-host-runtime-capture-observation",
      sourceStatus: inputs.wp44Closeout.status,
      closeoutClass: "observation-only-host-runtime",
      closeoutStatus: "ready-for-cycle-closeout-intake",
      completedFirstRound: true,
      observationOnly: true,
      blockedBeforeNetwork: false,
      metadataOnly: true,
      grantsRuntimeAuthority: false,
      grantsProviderNetworkAuthority: false,
      grantsCheckedApplyWriteAuthority: false,
      grantsTargetMutationAuthority: false,
      summarySignals: {
        capturedArchivedCount: number(inputs.wp44Closeout.summary?.capturedArchivedCount),
        hostLedgerEntryCount: number(inputs.wp44Closeout.summary?.hostLedgerEntryCount),
        manualVerificationConfirmedCount: number(inputs.wp44Closeout.summary?.manualVerificationConfirmedCount),
        releaseGradeArchivePendingCount: number(inputs.wp44Closeout.summary?.releaseGradeArchivePendingCount),
        runtimeCaptureArchivedCount: number(inputs.wp44Closeout.summary?.runtimeCaptureArchivedCount),
        visualStudioImplementationPendingCount: number(inputs.wp44Closeout.summary?.visualStudioImplementationPendingCount)
      }
    },
    {
      phase: "W-P45",
      topic: "controlled-provider-execution-slice",
      sourceStatus: inputs.wp45Closeout.status,
      closeoutClass: "blocked-before-network-provider-execution",
      closeoutStatus: "ready-for-cycle-closeout-intake",
      completedFirstRound: true,
      observationOnly: false,
      blockedBeforeNetwork: true,
      metadataOnly: true,
      grantsRuntimeAuthority: false,
      grantsProviderNetworkAuthority: false,
      grantsCheckedApplyWriteAuthority: false,
      grantsTargetMutationAuthority: false,
      summarySignals: {
        credentialAccessGranted: inputs.wp45Closeout.summary?.credentialAccessGranted === true,
        executionDecisionStatus: inputs.wp45Closeout.summary?.executionDecisionStatus,
        finalNetworkSendApproved: inputs.wp45Closeout.summary?.finalNetworkSendApproved === true,
        packagePin: inputs.wp45Closeout.summary?.packagePin,
        providerDestinationContactedCount: number(inputs.wp45Closeout.summary?.providerDestinationContactedCount),
        providerId: inputs.wp45Closeout.summary?.providerId,
        providerResultProduced: inputs.wp45Closeout.summary?.providerResultProduced === true,
        refusalResultProduced: inputs.wp45Closeout.summary?.refusalResultProduced === true
      }
    },
    {
      phase: "W-P46",
      topic: "target-owner-evidence-ingestion-and-adoption-trial",
      sourceStatus: inputs.wp46Closeout.status,
      closeoutClass: "metadata-only-target-owner-evidence",
      closeoutStatus: "ready-for-cycle-closeout-intake",
      completedFirstRound: true,
      observationOnly: false,
      blockedBeforeNetwork: false,
      metadataOnly: true,
      grantsRuntimeAuthority: false,
      grantsProviderNetworkAuthority: false,
      grantsCheckedApplyWriteAuthority: false,
      grantsTargetMutationAuthority: false,
      summarySignals: {
        deferredOwnerTrialCount: number(inputs.wp46Closeout.summary?.deferredOwnerTrialCount),
        ownerSubmittedReportCount: number(inputs.wp46Closeout.summary?.ownerSubmittedReportCount),
        targetOwnerActualSubmissionClaimedCount: number(inputs.wp46Closeout.summary?.targetOwnerActualSubmissionClaimedCount),
        targetOwnerMaySubmitFutureEvidence: inputs.wp46Closeout.summary?.targetOwnerMaySubmitFutureEvidence === true,
        wp47InputCount: number(inputs.wp46Closeout.summary?.wp47InputCount),
        wp48InputCount: number(inputs.wp46Closeout.summary?.wp48InputCount)
      }
    },
    {
      phase: "W-P47",
      topic: "checked-apply-write-pilot-preparation",
      sourceStatus: inputs.wp47Closeout.status,
      closeoutClass: "checked-apply-pilot-preparation-only",
      closeoutStatus: "ready-for-cycle-closeout-intake",
      completedFirstRound: true,
      observationOnly: false,
      blockedBeforeNetwork: false,
      metadataOnly: true,
      grantsRuntimeAuthority: false,
      grantsProviderNetworkAuthority: false,
      grantsCheckedApplyWriteAuthority: false,
      grantsTargetMutationAuthority: false,
      summarySignals: {
        completedCapabilityCount: number(inputs.wp47Closeout.summary?.completedCapabilityCount),
        deferredRealWriteGateCount: number(inputs.wp47Closeout.summary?.deferredRealWriteGateCount),
        nextCycleCandidateInputCount: number(inputs.wp47Closeout.summary?.nextCycleCandidateInputCount),
        ownerReportFixtureCount: number(inputs.wp47Closeout.summary?.ownerReportFixtureCount),
        realTargetOwnerReportSubmittedCount: number(inputs.wp47Closeout.summary?.realTargetOwnerReportSubmittedCount),
        requiredPilotGateCount: number(inputs.wp47Closeout.summary?.requiredPilotGateCount),
        wp48InputCount: number(inputs.wp47Closeout.summary?.wp48InputCount)
      }
    }
  ];
}

/**
 * 将阶段账本聚合成 W-P48 evidence registry。
 * Aggregate phase rows into the W-P48 evidence registry.
 *
 * @param {Array<Record<string, unknown>>} phaseLedger Phase rows.
 * @returns {Record<string, unknown>} Registry.
 */
function createCloseoutRegistry(phaseLedger) {
  return {
    contract: "hia-c-hia-p2-closeout-evidence-registry",
    contractVersion: "0.1.0-draft",
    cycleGroupId: "C-HIA-P2",
    registryStatus: "ready-for-wp48-classification",
    items: phaseLedger.map((row) => ({
      blockedBeforeNetwork: row.blockedBeforeNetwork,
      closeoutClass: row.closeoutClass,
      closeoutStatus: row.closeoutStatus,
      completedFirstRound: row.completedFirstRound,
      grantsCheckedApplyWriteAuthority: row.grantsCheckedApplyWriteAuthority,
      grantsProviderNetworkAuthority: row.grantsProviderNetworkAuthority,
      grantsRuntimeAuthority: row.grantsRuntimeAuthority,
      grantsTargetMutationAuthority: row.grantsTargetMutationAuthority,
      metadataOnly: row.metadataOnly,
      observationOnly: row.observationOnly,
      phase: row.phase,
      sourceStatus: row.sourceStatus,
      topic: row.topic
    }))
  };
}

/**
 * 建立 W-P48 后延门禁摄入清单。
 * Build the W-P48 deferred-gate intake list.
 *
 * @param {Record<string, any>} inputs Parsed prior evidence.
 * @returns {Record<string, unknown>} Deferred gate intake.
 */
function createDeferredGateIntake(inputs) {
  const phaseGateGroups = [
    {
      id: "wp44-release-grade-runtime-capture",
      sourcePhase: "W-P44",
      gateClass: "host-runtime-capture-release-grade",
      declaredCount: number(inputs.wp44Closeout.summary?.deferredGateCount),
      owner: "host-and-target-owner",
      status: "deferred-explicitly",
      reason: "W-P44 accepts observation-only runtime evidence but does not archive release-grade screenshots/transcripts."
    },
    {
      id: "wp45-real-provider-network-execution",
      sourcePhase: "W-P45",
      gateClass: "provider-network-execution",
      declaredCount: number(inputs.wp45Closeout.summary?.deferredGateCount),
      owner: "host",
      status: "deferred-explicitly",
      reason: "W-P45 selected provider identity and request preview but ended blocked before network."
    },
    {
      id: "wp46-real-target-owner-adoption",
      sourcePhase: "W-P46",
      gateClass: "target-owner-adoption-trial",
      declaredCount: number(inputs.wp46Closeout.summary?.deferredOwnerTrialCount),
      owner: "target-owner",
      status: "deferred-explicitly",
      reason: "W-P46 prepared evidence intake and reports, but actual target-owner submissions are still zero."
    },
    {
      id: "wp47-real-checked-apply-write",
      sourcePhase: "W-P47",
      gateClass: "checked-apply-real-write",
      declaredCount: number(inputs.wp47Closeout.summary?.deferredRealWriteGateCount),
      owner: "host-and-target-owner",
      status: "deferred-explicitly",
      reason: "W-P47 completed pilot preparation while keeping real write authority disabled."
    }
  ];
  const explicitWp47Items = inputs.wp47Closeout.deferredRealWriteGates.items.map((item) => ({
    id: item.id,
    sourcePhase: "W-P47",
    owner: item.owner,
    status: item.status,
    reason: item.reason,
    mayBeCompletedByHiaAutomation: item.mayBeCompletedByHiaAutomation === true,
    grantsCheckedApplyWriteAuthorityNow: item.grantsCheckedApplyWriteAuthorityNow === true,
    grantsTargetMutationAuthorityNow: item.grantsTargetMutationAuthorityNow === true
  }));
  return {
    contract: "hia-wp48-deferred-gate-intake",
    contractVersion: "0.1.0-draft",
    gateStatus: "ready-for-wp48-deferred-gate-ledger",
    phaseGateGroups,
    explicitWp47Items,
    declaredGateCount: sum(phaseGateGroups.map((item) => item.declaredCount)),
    explicitGateItemCount: explicitWp47Items.length
  };
}

function createNextActions(inputs) {
  return {
    nextStage: "W-P48.2 Evidence Classification And Deferred Gate Ledger",
    items: [
      {
        id: "classification-ledger",
        status: "ready-for-wp48-2",
        description: "Classify C-HIA-P2 evidence into completed, observation-only, blocked-before-network, metadata-only and deferred."
      },
      {
        id: "deferred-gate-ledger",
        status: "ready-for-wp48-2",
        description: "Turn W-P44-W-P47 deferred signals into one cycle-level gate ledger."
      },
      {
        id: "c-hia-p3-input-draft",
        status: "candidate-after-wp48-2",
        description: `Carry ${number(inputs.wp47Closeout.summary?.nextCycleCandidateInputCount)} candidate inputs into later C-HIA-P3 planning without starting them now.`
      }
    ]
  };
}

function summarize({ closeoutRegistry, deferredGateIntake, inputs, nextActions, phaseLedger }) {
  const registryItems = closeoutRegistry.items;
  const serializedInputs = JSON.stringify(inputs);
  const w47Summary = inputs.wp47Closeout.summary ?? {};
  return {
    phase: "W-P48.1",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount: Object.values(inputs).filter(isReadyEvidence).length,
    inputHardFailureCount: sum(Object.values(inputs).map((item) => item.summary?.hardFailureCount)),
    phaseCloseoutCount: phaseLedger.length,
    phaseReadyCount: phaseLedger.filter((item) => item.closeoutStatus === "ready-for-cycle-closeout-intake").length,
    completedFirstRoundPhaseCount: registryItems.filter((item) => item.completedFirstRound === true).length,
    observationOnlyPhaseCount: registryItems.filter((item) => item.observationOnly === true).length,
    blockedBeforeNetworkPhaseCount: registryItems.filter((item) => item.blockedBeforeNetwork === true).length,
    metadataOnlyPhaseCount: registryItems.filter((item) => item.metadataOnly === true).length,
    declaredDeferredGateCount: number(deferredGateIntake.declaredGateCount),
    explicitDeferredGateItemCount: number(deferredGateIntake.explicitGateItemCount),
    wp48InputCount: number(w47Summary.wp48InputCount),
    nextCycleCandidateInputCount: number(w47Summary.nextCycleCandidateInputCount),
    runtimeObservationOnlyAcceptedCount: number(inputs.wp44Closeout.summary?.acceptedObservationOnlyCount),
    runtimeCaptureArchivedCount: number(inputs.wp44Closeout.summary?.runtimeCaptureArchivedCount),
    releaseGradeArchivePendingCount: number(inputs.wp44Closeout.summary?.releaseGradeArchivePendingCount),
    visualStudioImplementationPendingCount: number(inputs.wp44Closeout.summary?.visualStudioImplementationPendingCount),
    providerBindingReady: inputs.wp45Closeout.summary?.providerBindingReady === true,
    finalNetworkSendApproved: inputs.wp45Closeout.summary?.finalNetworkSendApproved === true,
    credentialAccessGranted: inputs.wp45Closeout.summary?.credentialAccessGranted === true,
    providerDestinationContactedCount: number(inputs.wp45Closeout.summary?.providerDestinationContactedCount),
    providerResultProduced: inputs.wp45Closeout.summary?.providerResultProduced === true,
    blockedProviderResultReady: inputs.wp45Closeout.summary?.blockedProviderResultReady === true,
    ownerSubmittedReportCount: number(inputs.wp46Closeout.summary?.ownerSubmittedReportCount),
    targetOwnerActualSubmissionClaimedCount: number(inputs.wp46Closeout.summary?.targetOwnerActualSubmissionClaimedCount),
    realTargetOwnerReportSubmittedCount: number(w47Summary.realTargetOwnerReportSubmittedCount),
    targetOwnerReportSubmissionSlotReady: w47Summary.targetOwnerReportSubmissionSlotReady === true,
    checkedApplyWriteEnabledCount: sum([
      inputs.wp44Closeout.summary?.checkedApplyWriteEnabledCount,
      inputs.wp46Closeout.summary?.checkedApplyTriggeredCount,
      w47Summary.checkedApplyWriteEnabledCount
    ]),
    pilotWriteAuthorizedCount: number(w47Summary.pilotWriteAuthorizedCount),
    hostEditorApiCallCount: number(w47Summary.hostEditorApiCallCount),
    checkedApplyTriggeredCount: sum([
      inputs.wp45Closeout.summary?.checkedApplyTriggeredCount,
      inputs.wp46Closeout.summary?.checkedApplyTriggeredCount,
      w47Summary.checkedApplyTriggeredCount
    ]),
    workspaceWriteAllowedCount: sum([
      inputs.wp44Closeout.summary?.workspaceWriteAllowedCount,
      inputs.wp45Closeout.summary?.workspaceWriteAllowedCount,
      inputs.wp46Closeout.summary?.workspaceWriteAllowedCount,
      w47Summary.workspaceWriteAllowedCount
    ]),
    targetRepositoryMutationCount: sum([
      inputs.wp44Closeout.summary?.targetRepositoryMutationCount,
      inputs.wp45Closeout.summary?.targetRepositoryMutationCount,
      inputs.wp46Closeout.summary?.targetRepositoryMutationCount,
      w47Summary.targetRepositoryMutationCount
    ]),
    targetCommandExecutedByHiaCount: sum([
      inputs.wp44Closeout.summary?.targetCommandsExecutedByHiaCount,
      inputs.wp46Closeout.summary?.actualTargetCommandExecutedCount,
      w47Summary.targetCommandExecutedByHiaCount
    ]),
    directEditObjectCount: sum([
      inputs.wp44Closeout.summary?.directEditObjectCount,
      inputs.wp45Closeout.summary?.directEditObjectCount,
      inputs.wp46Closeout.summary?.directEditObjectCount,
      w47Summary.directEditObjectProducedCount
    ]),
    providerNetworkExecutedCount: sum([
      inputs.wp44Closeout.summary?.providerNetworkExecutedCount,
      boolCount(inputs.wp45Closeout.summary?.realRemoteProviderInvocationExecuted),
      inputs.wp46Closeout.summary?.providerNetworkExecutedCount,
      w47Summary.providerNetworkExecutedCount
    ]),
    externalNetworkCallExecutedCount: sum([
      inputs.wp44Closeout.summary?.externalNetworkCallExecutedCount,
      boolCount(inputs.wp45Closeout.summary?.externalProviderApiCallExecuted),
      w47Summary.externalNetworkCallExecutedCount
    ]),
    sourceBodyIncludedCount: sum([
      inputs.wp44Closeout.summary?.sourceBodyIncludedCount,
      inputs.wp46Closeout.summary?.wp47SourceBodyRequiredCount,
      w47Summary.sourceBodyIncludedCount
    ]),
    sourceTextIncludedCount: sum([
      inputs.wp44Closeout.summary?.sourceTextIncludedCount,
      inputs.wp45Closeout.summary?.sourceTextIncludedCount,
      inputs.wp46Closeout.summary?.sourceTextIncludedCount,
      w47Summary.sourceTextIncludedCount
    ]),
    requestBodyIncludedCount: sum([
      inputs.wp45Closeout.summary?.requestBodyIncludedCount,
      inputs.wp46Closeout.summary?.requestBodyIncludedCount,
      w47Summary.requestBodyIncludedCount
    ]),
    responseBodyIncludedCount: sum([
      inputs.wp45Closeout.summary?.responseBodyIncludedCount,
      inputs.wp46Closeout.summary?.responseBodyIncludedCount,
      w47Summary.responseBodyIncludedCount
    ]),
    secretValueIncludedCount: sum([
      inputs.wp44Closeout.summary?.credentialValueIncludedCount,
      inputs.wp45Closeout.summary?.secretValueIncludedCount,
      inputs.wp46Closeout.summary?.secretValueIncludedCount,
      w47Summary.secretValueIncludedCount
    ]),
    digestValueIncludedCount: sum([
      inputs.wp44Closeout.summary?.digestValueIncludedCount,
      w47Summary.digestValueIncludedCount
    ]),
    localAbsolutePathDetectedCount: sum([
      inputs.wp46Closeout.summary?.localAbsolutePathDetectedCount,
      w47Summary.localAbsolutePathDetectedCount,
      countPathExposure(serializedInputs)
    ]),
    credentialMaterialMarkerCount: sum([
      inputs.wp45Closeout.summary?.credentialMaterialMarkerCount,
      inputs.wp46Closeout.summary?.credentialMaterialMarkerCount,
      w47Summary.credentialMaterialMarkerCount,
      countCredentialMarkers(serializedInputs)
    ]),
    sourcesContentMarkerCount: sum([
      inputs.wp46Closeout.summary?.sourcesContentMarkerCount,
      w47Summary.sourcesContentMarkerCount,
      /"sourcesContent"\s*:/iu.test(serializedInputs) ? 1 : 0
    ]),
    sourcesContentPolicy: "none",
    nextStage: nextActions.nextStage
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP48_INTAKE_INPUTS_READY", summary.inputEvidenceCount === 4
      && summary.readyInputEvidenceCount === 4
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP48_INTAKE_PHASE_LEDGER_READY", summary.phaseCloseoutCount === 4
      && summary.phaseReadyCount === 4
      && summary.completedFirstRoundPhaseCount === 4, {
      actual: {
        completedFirstRoundPhaseCount: summary.completedFirstRoundPhaseCount,
        phaseCloseoutCount: summary.phaseCloseoutCount,
        phaseReadyCount: summary.phaseReadyCount
      }
    }),
    check("HIA_WP48_INTAKE_CLASSIFICATION_PRESERVES_BOUNDARIES", summary.observationOnlyPhaseCount === 1
      && summary.blockedBeforeNetworkPhaseCount === 1
      && summary.metadataOnlyPhaseCount === 4
      && summary.runtimeCaptureArchivedCount === 0
      && summary.finalNetworkSendApproved === false
      && summary.credentialAccessGranted === false
      && summary.providerResultProduced === false
      && summary.ownerSubmittedReportCount === 0
      && summary.realTargetOwnerReportSubmittedCount === 0, {
      actual: {
        blockedBeforeNetworkPhaseCount: summary.blockedBeforeNetworkPhaseCount,
        credentialAccessGranted: summary.credentialAccessGranted,
        finalNetworkSendApproved: summary.finalNetworkSendApproved,
        metadataOnlyPhaseCount: summary.metadataOnlyPhaseCount,
        observationOnlyPhaseCount: summary.observationOnlyPhaseCount,
        ownerSubmittedReportCount: summary.ownerSubmittedReportCount,
        providerResultProduced: summary.providerResultProduced,
        realTargetOwnerReportSubmittedCount: summary.realTargetOwnerReportSubmittedCount,
        runtimeCaptureArchivedCount: summary.runtimeCaptureArchivedCount
      }
    }),
    check("HIA_WP48_INTAKE_DEFERRED_GATES_REGISTERED", summary.declaredDeferredGateCount >= 30
      && summary.explicitDeferredGateItemCount >= 14
      && summary.wp48InputCount >= 10
      && summary.nextCycleCandidateInputCount >= 6, {
      actual: {
        declaredDeferredGateCount: summary.declaredDeferredGateCount,
        explicitDeferredGateItemCount: summary.explicitDeferredGateItemCount,
        nextCycleCandidateInputCount: summary.nextCycleCandidateInputCount,
        wp48InputCount: summary.wp48InputCount
      }
    }),
    check("HIA_WP48_INTAKE_NO_EXECUTION_OR_WRITE", summary.checkedApplyWriteEnabledCount === 0
      && summary.pilotWriteAuthorizedCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0
      && summary.providerDestinationContactedCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecutedCount: summary.externalNetworkCallExecutedCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        pilotWriteAuthorizedCount: summary.pilotWriteAuthorizedCount,
        providerDestinationContactedCount: summary.providerDestinationContactedCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP48_INTAKE_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
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
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP48_INTAKE_NEXT_STAGE_READY", summary.nextStage === "W-P48.2 Evidence Classification And Deferred Gate Ledger", {
      actual: {
        nextStage: summary.nextStage
      }
    })
  ];
}

function renderSummary(evidence) {
  const { summary } = evidence;
  return `# W-P48.1 Cycle Closeout Intake Summary

## 中文摘要

W-P48.1 建立 C-HIA-P2 收口摄入账本。它把 W-P44-W-P47 的证据分为已完成第一轮、observation-only、blocked-before-network、metadata-only 与 deferred gates；不把这些输入升级为真实 runtime/provider/target-owner/checked apply 执行成功。

## Summary

| Field | Value |
| --- | --- |
| Status | ${evidence.status} |
| Input evidence | ${summary.readyInputEvidenceCount} / ${summary.inputEvidenceCount} ready |
| Phase closeouts | ${summary.phaseReadyCount} / ${summary.phaseCloseoutCount} ready |
| Observation-only phases | ${summary.observationOnlyPhaseCount} |
| Blocked-before-network phases | ${summary.blockedBeforeNetworkPhaseCount} |
| Metadata-only phases | ${summary.metadataOnlyPhaseCount} |
| Declared deferred gates | ${summary.declaredDeferredGateCount} |
| W-P48 inputs | ${summary.wp48InputCount} |
| C-HIA-P3 candidates | ${summary.nextCycleCandidateInputCount} |
| Runtime archived captures | ${summary.runtimeCaptureArchivedCount} |
| Provider destination contacts | ${summary.providerDestinationContactedCount} |
| Owner submitted reports | ${summary.ownerSubmittedReportCount} |
| Real target-owner reports | ${summary.realTargetOwnerReportSubmittedCount} |
| Checked apply write enabled | ${summary.checkedApplyWriteEnabledCount} |
| Target mutation | ${summary.targetRepositoryMutationCount} |
| Source content policy | ${summary.sourcesContentPolicy} |
| Next stage | ${summary.nextStage} |

## 边界结论

- W-P44 的真实宿主观察只作为 observation-only closeout 输入，不是 release-grade capture archive。
- W-P45 的 provider 结果仍是 blocked-before-network，不是真实 provider success。
- W-P46 的 owner evidence 仍是 metadata-only intake/readiness，不是真实目标项目执行。
- W-P47 的 checked apply 仍是 write pilot preparation，不是真实写入授权。
`;
}

function renderRegistry(evidence) {
  const rows = evidence.closeoutRegistry.items
    .map((item) => `| ${item.phase} | ${item.closeoutClass} | ${item.closeoutStatus} | ${yesNo(item.observationOnly)} | ${yesNo(item.blockedBeforeNetwork)} | ${yesNo(item.grantsCheckedApplyWriteAuthority)} | ${yesNo(item.grantsTargetMutationAuthority)} |`)
    .join("\n");
  return `# C-HIA-P2 Closeout Evidence Registry

## 中文摘要

本 registry 是 W-P48 的第一层输入账本，目的在于把每个 W-P 阶段的证据性质固定住，避免后续把观测、阻塞或准备态误读成真实执行。

| Phase | Class | Status | Observation-only | Blocked-before-network | Grants checked apply write | Grants target mutation |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderPhaseLedger(evidence) {
  const rows = evidence.phaseLedger
    .map((item) => `| ${item.phase} | ${item.topic} | ${item.sourceStatus} | ${item.closeoutClass} | ${item.closeoutStatus} |`)
    .join("\n");
  return `# C-HIA-P2 Phase Closeout Ledger

## 中文摘要

该账本记录 W-P44-W-P47 的 phase-level closeout 状态。W-P48 后续阶段应基于此账本继续分类、汇总和收口。

| Phase | Topic | Source status | Closeout class | Closeout status |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderDeferredGateIntake(evidence) {
  const groups = evidence.deferredGateIntake.phaseGateGroups
    .map((item) => `| ${item.sourcePhase} | ${item.gateClass} | ${item.declaredCount} | ${item.owner} | ${item.status} |`)
    .join("\n");
  const explicit = evidence.deferredGateIntake.explicitWp47Items
    .map((item) => `| ${item.id} | ${item.owner} | ${item.status} | ${yesNo(item.mayBeCompletedByHiaAutomation)} |`)
    .join("\n");
  return `# W-P48 Deferred Gate Intake

## 中文摘要

W-P48.1 只摄入后延门禁，不关闭这些门禁。真实执行、真实写入和目标项目变更必须在后续更窄阶段重新取得明确授权。

## Phase Gate Groups

| Source phase | Gate class | Declared count | Owner | Status |
| --- | --- | --- | --- | --- |
${groups}

## Explicit W-P47 Deferred Gates

| Gate | Owner | Status | HIA automation may complete |
| --- | --- | --- | --- |
${explicit}
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

function yesNo(value) {
  return value === true ? "yes" : "no";
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
