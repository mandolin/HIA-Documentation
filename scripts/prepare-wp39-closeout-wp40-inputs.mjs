import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp39-closeout-wp40-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutSummaryPath = path.join(outputRoot, "wp39-closeout-summary.md");
const wp40StartupInputsPath = path.join(outputRoot, "wp40-startup-inputs.md");
const inputDefinitions = [
  {
    id: "host-runtime-capture-intake",
    phase: "W-P39.1",
    path: path.join(rootDir, "dist", "wp39-host-runtime-capture-intake", "evidence.json"),
    expectedStatus: "ready-for-wp39-host-runtime-capture-baseline"
  },
  {
    id: "vscode-runtime-capture-packet",
    phase: "W-P39.2",
    path: path.join(rootDir, "dist", "wp39-vscode-runtime-capture-packet", "evidence.json"),
    expectedStatus: "ready-for-vscode-manual-runtime-capture"
  },
  {
    id: "devtools-runtime-capture-packet",
    phase: "W-P39.3",
    path: path.join(rootDir, "dist", "wp39-devtools-runtime-capture-packet", "evidence.json"),
    expectedStatus: "ready-for-devtools-manual-runtime-capture"
  },
  {
    id: "visual-studio-runtime-preparation",
    phase: "W-P39.4",
    path: path.join(rootDir, "dist", "wp39-visual-studio-runtime-preparation", "evidence.json"),
    expectedStatus: "ready-for-visual-studio-runtime-route-followup"
  },
  {
    id: "runtime-evidence-normalization",
    phase: "W-P39.5",
    path: path.join(rootDir, "dist", "wp39-runtime-evidence-normalization", "evidence.json"),
    expectedStatus: "ready-for-wp39-next-gate-bridge"
  },
  {
    id: "next-gate-bridge",
    phase: "W-P39.6",
    path: path.join(rootDir, "dist", "wp39-next-gate-bridge", "evidence.json"),
    expectedStatus: "ready-for-wp39-closeout-and-wp40-inputs"
  }
];

await main();

/**
 * 准备 W-P39.7 closeout and W-P40 startup input evidence。
 * Prepare W-P39.7 closeout and W-P40 startup input evidence.
 *
 * This closeout folds the W-P39.1-W-P39.6 runtime-capture baseline into a
 * single handoff for W-P40. It keeps host runtime captures, remote provider
 * calls and target repository writes as explicit downstream/manual gates.
 *
 * 中文：本脚本把 W-P39.1-W-P39.6 的 runtime-capture baseline 收束为 W-P40
 * 可消费的单一交接产物。它继续把真实宿主采集、remote provider 调用和目标仓库
 * 写入保留为显式下游/人工 gate。
 *
 * @returns {Promise<void>} Writes public-safe closeout evidence and handoff docs.
 */
async function main() {
  const inputReports = await Promise.all(inputDefinitions.map(readInputReport));
  const byId = Object.fromEntries(inputReports.map((report) => [report.id, report.evidence]));
  const intake = byId["host-runtime-capture-intake"];
  const vscodePacket = byId["vscode-runtime-capture-packet"];
  const devtoolsPacket = byId["devtools-runtime-capture-packet"];
  const visualStudioPreparation = byId["visual-studio-runtime-preparation"];
  const runtimeNormalization = byId["runtime-evidence-normalization"];
  const nextGateBridge = byId["next-gate-bridge"];
  const completedCapabilities = createCompletedCapabilities();
  const deferredGates = createDeferredGates();
  const wp40StartupInputs = createWp40StartupInputs({ nextGateBridge, runtimeNormalization });
  const closeoutBoundary = createCloseoutBoundary();
  const summary = summarize({
    completedCapabilities,
    deferredGates,
    devtoolsPacket,
    inputReports,
    intake,
    nextGateBridge,
    runtimeNormalization,
    visualStudioPreparation,
    vscodePacket,
    wp40StartupInputs
  });
  const checks = [
    check("HIA_WP39_CLOSEOUT_ALL_INPUTS_READY", summary.readyEvidenceInputCount === summary.evidenceInputCount
      && summary.inputHardFailureCount === 0, {
      actual: inputReports.map(({ expectedStatus, hardFailureCount, id, phase, status }) => ({
        expectedStatus,
        hardFailureCount,
        id,
        phase,
        status
      }))
    }),
    check("HIA_WP39_CLOSEOUT_RUNTIME_BASELINE_COMPLETE", summary.cycleGroupId === "C-HIA-P1"
      && summary.hostCount === 3
      && summary.manualCaptureReadyCount === 2
      && summary.routePreparationReadyCount === 1
      && summary.capturePacketReadyCount === 2
      && summary.visualStudioRoutePreparationReady === true, {
      actual: {
        capturePacketReadyCount: summary.capturePacketReadyCount,
        cycleGroupId: summary.cycleGroupId,
        hostCount: summary.hostCount,
        manualCaptureReadyCount: summary.manualCaptureReadyCount,
        routePreparationReadyCount: summary.routePreparationReadyCount,
        visualStudioRoutePreparationReady: summary.visualStudioRoutePreparationReady
      }
    }),
    check("HIA_WP39_CLOSEOUT_RUNTIME_CAPTURE_NOT_CLAIMED", summary.actualRuntimeCaptureExecutedCount === 0
      && summary.captureCompletionClaimedCount === 0
      && summary.capturedHostCount === 0
      && summary.visualStudioPackageBuiltCount === 0
      && summary.visualStudioExperimentalInstanceExecutedCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        capturedHostCount: summary.capturedHostCount,
        captureCompletionClaimedCount: summary.captureCompletionClaimedCount,
        visualStudioExperimentalInstanceExecutedCount: summary.visualStudioExperimentalInstanceExecutedCount,
        visualStudioPackageBuiltCount: summary.visualStudioPackageBuiltCount
      }
    }),
    check("HIA_WP39_CLOSEOUT_WP40_INPUTS_READY", summary.w40Ready === true
      && summary.w40StartupInputCount >= 6
      && summary.remoteGatePlanCount >= 14
      && summary.remoteManualApprovalGateCount >= 5
      && summary.providerSourcePolicyNone === true
      && summary.w40RequiresExplicitUserApproval === true, {
      actual: {
        providerSourcePolicyNone: summary.providerSourcePolicyNone,
        remoteGatePlanCount: summary.remoteGatePlanCount,
        remoteManualApprovalGateCount: summary.remoteManualApprovalGateCount,
        w40Ready: summary.w40Ready,
        w40RequiresExplicitUserApproval: summary.w40RequiresExplicitUserApproval,
        w40StartupInputCount: summary.w40StartupInputCount
      }
    }),
    check("HIA_WP39_CLOSEOUT_NO_PROVIDER_OR_TARGET_SIDE_EFFECTS", summary.realRemoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestCreated === false
      && summary.actualTargetSandboxCreated === false
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0, {
      actual: {
        actualPullRequestCreated: summary.actualPullRequestCreated,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount
      }
    }),
    check("HIA_WP39_CLOSEOUT_NO_WRITE_AUTHORITY", summary.checkedApplyAvailableCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.providerOwnedApplyAllowedCount === 0
      && summary.lspServerOwnedApplyAllowedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyAvailableCount: summary.checkedApplyAvailableCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyAllowedCount: summary.lspServerOwnedApplyAllowedCount,
        providerOwnedApplyAllowedCount: summary.providerOwnedApplyAllowedCount,
        targetRepositoryMutationAllowedCount: summary.targetRepositoryMutationAllowedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP39_CLOSEOUT_PRIVACY_CLEAN", summary.privacyCleanInputCount === summary.evidenceInputCount
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.pathExposureCount === 0
      && summary.sourcesContentPolicyNoneCount >= 6, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        privacyCleanInputCount: summary.privacyCleanInputCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourcesContentPolicyNoneCount: summary.sourcesContentPolicyNoneCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp39-closeout-wp40-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp40-controlled-remote-provider-smoke-inputs" : "blocked",
    sourceEvidence: Object.fromEntries(inputReports.map((report) => [report.id, normalizePath(report.path)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    evidenceInputs: inputReports.map(({ contract, contractVersion, expectedStatus, hardFailureCount, id, phase, status }) => ({
      contract,
      contractVersion,
      expectedStatus,
      hardFailureCount,
      id,
      phase,
      status
    })),
    completedCapabilities,
    deferredGates,
    closeoutBoundary,
    wp40StartupInputs,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutSummaryPath),
      wp40StartupInputs: normalizePath(wp40StartupInputsPath)
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P40",
        topic: "controlled-remote-provider-smoke",
        status: "ready-input",
        requiresExplicitUserApprovalBeforeRealNetwork: true,
        reason: "W-P40 can consume W-P39 normalized host states and W-P36-W-P38 provider gates, but real provider/network execution remains gated."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P39 closeout and W-P40 input evidence");
  assert.equal(hardFailures.length, 0, `W-P39 closeout evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummaryMarkdown(evidence), "utf8");
  await writeFile(wp40StartupInputsPath, renderWp40StartupInputsMarkdown(evidence), "utf8");
  console.log(`W-P39 closeout and W-P40 input evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P39 closeout summary prepared at ${normalizePath(closeoutSummaryPath)}`);
  console.log(`W-P40 startup inputs prepared at ${normalizePath(wp40StartupInputsPath)}`);
}

async function readInputReport(inputDefinition) {
  const evidence = JSON.parse(await readFile(inputDefinition.path, "utf8"));
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  return {
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    evidence,
    expectedStatus: inputDefinition.expectedStatus,
    hardFailureCount: Number(evidence.summary?.hardFailureCount ?? checks.filter((item) => item.status === "fail").length),
    id: inputDefinition.id,
    path: inputDefinition.path,
    phase: inputDefinition.phase,
    status: evidence.status
  };
}

function createCompletedCapabilities() {
  return [
    "cycle-group-host-runtime-intake-mapped",
    "vscode-manual-runtime-capture-packet-ready",
    "chrome-devtools-manual-runtime-capture-packet-ready",
    "visual-studio-runtime-route-preparation-ready",
    "normalized-host-runtime-state-matrix-ready",
    "w40-w41-w42-w43-next-gate-bridge-ready"
  ];
}

function createDeferredGates() {
  return [
    "vscode-extension-development-host-actual-runtime-capture",
    "chrome-devtools-unpacked-extension-actual-runtime-capture",
    "visual-studio-vsix-or-extensibility-dependency-license-audit",
    "visual-studio-extension-build-and-experimental-instance-capture",
    "controlled-remote-provider-real-network-invocation",
    "target-owner-branch-pr-or-local-sandbox-smoke",
    "checked-apply-writable-hardening",
    "host-owned-apply-ux-and-provider-review-linkage"
  ];
}

function createCloseoutBoundary() {
  return {
    cycleGroupId: "C-HIA-P1",
    closedPhase: "W-P39",
    nextPhase: "W-P40",
    closeoutMode: "evidence-only-handoff",
    mayStartW40FromPreparedRuntimeState: true,
    mayClaimActualRuntimeCapture: false,
    mayRunRemoteProviderWithoutUserApproval: false,
    mayMutateTargetRepository: false,
    mayGrantProviderOrLspWriteAuthority: false,
    sourcesContentPolicy: "none"
  };
}

function createWp40StartupInputs({ nextGateBridge, runtimeNormalization }) {
  const w40Target = Array.isArray(nextGateBridge.bridgeTargets)
    ? nextGateBridge.bridgeTargets.find((target) => target.targetPhase === "W-P40")
    : undefined;

  return [
    {
      id: "normalized-host-runtime-state-matrix",
      sourcePhase: "W-P39.5",
      sourceEvidence: normalizePath(inputDefinitions.find((item) => item.id === "runtime-evidence-normalization").path),
      status: runtimeNormalization.status === "ready-for-wp39-next-gate-bridge" ? "ready-input" : "blocked",
      hostCount: Number(runtimeNormalization.summary?.hostCount ?? 0),
      actualRuntimeCaptureExecutedCount: Number(runtimeNormalization.summary?.actualRuntimeCaptureExecutedCount ?? -1),
      acceptsPreparedRuntimeStatesOnly: true
    },
    {
      id: "w40-next-gate-bridge-target",
      sourcePhase: "W-P39.6",
      sourceEvidence: normalizePath(inputDefinitions.find((item) => item.id === "next-gate-bridge").path),
      status: w40Target?.status ?? "missing",
      consumesNormalizedRuntimeState: w40Target?.consumesNormalizedRuntimeState === true,
      requiresActualRuntimeCaptureBeforeStart: w40Target?.requiresActualRuntimeCaptureBeforeStart === true
    },
    {
      id: "remote-provider-smoke-manual-approval",
      sourcePhase: "W-P39.6",
      sourceEvidence: normalizePath(inputDefinitions.find((item) => item.id === "next-gate-bridge").path),
      status: "required-before-real-network",
      manualApprovalGateCount: Number(nextGateBridge.summary?.remoteManualApprovalGateCount ?? 0),
      gatePlanCount: Number(nextGateBridge.summary?.remoteGatePlanCount ?? 0),
      realRemoteProviderInvocationExecuted: nextGateBridge.summary?.realRemoteProviderInvocationExecuted === true
    },
    {
      id: "host-mediated-secret-and-network-boundary",
      sourcePhase: "W-P36/W-P38/W-P39",
      sourceEvidence: normalizePath(inputDefinitions.find((item) => item.id === "next-gate-bridge").path),
      status: "required-before-real-network",
      hostMediatedNetworkRequired: w40Target?.executionPolicy?.hostMediatedNetworkRequired === true,
      credentialReferenceRequired: w40Target?.executionPolicy?.credentialReferenceRequired === true,
      credentialMaterialIncludedCount: Number(nextGateBridge.summary?.providerCredentialMaterialIncludedCount ?? -1)
    },
    {
      id: "source-privacy-default-deny",
      sourcePhase: "W-P36/W-P39",
      sourceEvidence: normalizePath(inputDefinitions.find((item) => item.id === "next-gate-bridge").path),
      status: "ready-input",
      sourcesContentPolicy: "none",
      sourceBodyIncludedInEvidenceCount: Number(nextGateBridge.summary?.sourceBodyIncludedInEvidenceCount ?? -1)
    },
    {
      id: "review-only-provider-output",
      sourcePhase: "W-P35-W-P39",
      sourceEvidence: normalizePath(inputDefinitions.find((item) => item.id === "next-gate-bridge").path),
      status: "ready-input",
      directApplyAllowedCount: Number(nextGateBridge.summary?.directApplyAllowedCount ?? -1),
      providerOwnedApplyAllowedCount: Number(nextGateBridge.summary?.providerOwnedApplyAllowedCount ?? -1),
      lspServerOwnedApplyAllowedCount: Number(nextGateBridge.summary?.lspServerOwnedApplyAllowedCount ?? -1)
    },
    {
      id: "target-repository-readonly-boundary",
      sourcePhase: "W-P38/W-P39",
      sourceEvidence: normalizePath(inputDefinitions.find((item) => item.id === "next-gate-bridge").path),
      status: "ready-input",
      targetOwnerActionRequiredForWrite: nextGateBridge.summary?.targetOwnerActionRequiredForWrite === true,
      hiaOwnedTargetRepositoryMutationAllowed: nextGateBridge.summary?.hiaOwnedTargetRepositoryMutationAllowed === true,
      targetRepositoryMutationCount: Number(nextGateBridge.summary?.targetRepositoryMutationCount ?? -1)
    }
  ];
}

function summarize({
  completedCapabilities,
  deferredGates,
  devtoolsPacket,
  inputReports,
  intake,
  nextGateBridge,
  runtimeNormalization,
  visualStudioPreparation,
  vscodePacket,
  wp40StartupInputs
}) {
  return {
    evidenceInputCount: inputReports.length,
    readyEvidenceInputCount: inputReports.filter((report) => report.status === report.expectedStatus).length,
    inputHardFailureCount: inputReports.reduce((total, report) => total + report.hardFailureCount, 0),
    cycleGroupId: intake.summary?.cycleGroupId,
    completedCapabilityCount: completedCapabilities.length,
    deferredGateCount: deferredGates.length,
    hostCount: Number(runtimeNormalization.summary?.hostCount ?? 0),
    normalizedStateCount: Number(runtimeNormalization.summary?.normalizedStateCount ?? 0),
    manualCaptureReadyCount: Number(runtimeNormalization.summary?.manualCaptureReadyCount ?? 0),
    routePreparationReadyCount: Number(runtimeNormalization.summary?.routePreparationReadyCount ?? 0),
    capturedHostCount: Number(runtimeNormalization.summary?.capturedHostCount ?? -1),
    actualRuntimeCaptureExecutedCount: Number(runtimeNormalization.summary?.actualRuntimeCaptureExecutedCount ?? -1),
    captureCompletionClaimedCount: Number(runtimeNormalization.summary?.captureCompletionClaimedCount ?? -1),
    capturePacketReadyCount: countTrue([
      vscodePacket.summary?.packetStatus === "ready-for-human-runtime-capture",
      devtoolsPacket.summary?.packetStatus === "ready-for-human-runtime-capture"
    ]),
    visualStudioRoutePreparationReady: visualStudioPreparation.summary?.runtimePreparationStatus === "contract-level-runtime-prep"
      && visualStudioPreparation.summary?.preparationPacketStatus === "ready-for-visual-studio-runtime-route-followup",
    visualStudioPackageBuiltCount: Number(runtimeNormalization.summary?.visualStudioPackageBuiltCount ?? -1),
    visualStudioExperimentalInstanceExecutedCount: Number(runtimeNormalization.summary?.visualStudioExperimentalInstanceExecutedCount ?? -1),
    requiredArtifactCount: Number(runtimeNormalization.summary?.requiredArtifactCount ?? 0),
    requiredScreenshotCount: Number(runtimeNormalization.summary?.requiredScreenshotCount ?? 0),
    requiredTranscriptCount: Number(runtimeNormalization.summary?.requiredTranscriptCount ?? 0),
    manualChecklistCount: Number(runtimeNormalization.summary?.manualChecklistCount ?? 0),
    bridgeTargetCount: Number(nextGateBridge.summary?.bridgeTargetCount ?? 0),
    directBridgeTargetCount: Number(nextGateBridge.summary?.directBridgeTargetCount ?? 0),
    secondaryBridgeTargetCount: Number(nextGateBridge.summary?.secondaryBridgeTargetCount ?? 0),
    readyBridgeTargetCount: Number(nextGateBridge.summary?.readyBridgeTargetCount ?? 0),
    w40Ready: nextGateBridge.summary?.w40Ready === true
      && wp40StartupInputs.every((input) => input.status === "ready-input" || input.status === "required-before-real-network"),
    w41Ready: nextGateBridge.summary?.w41Ready === true,
    w42Ready: nextGateBridge.summary?.w42Ready === true,
    w43Ready: nextGateBridge.summary?.w43Ready === true,
    w40StartupInputCount: wp40StartupInputs.length,
    w40RequiresExplicitUserApproval: wp40StartupInputs.some((input) => input.id === "remote-provider-smoke-manual-approval"
      && input.status === "required-before-real-network"),
    remoteGatePlanCount: Number(nextGateBridge.summary?.remoteGatePlanCount ?? 0),
    remoteManualApprovalGateCount: Number(nextGateBridge.summary?.remoteManualApprovalGateCount ?? 0),
    providerSourcePolicyNone: nextGateBridge.summary?.providerSourcePolicyNone === true,
    realRemoteProviderInvocationExecuted: nextGateBridge.summary?.realRemoteProviderInvocationExecuted === true,
    externalNetworkCallExecuted: nextGateBridge.summary?.externalNetworkCallExecuted === true,
    actualTargetBranchCreated: nextGateBridge.summary?.actualTargetBranchCreated === true,
    actualPullRequestCreated: nextGateBridge.summary?.actualPullRequestCreated === true,
    actualTargetSandboxCreated: nextGateBridge.summary?.actualTargetSandboxCreated === true,
    targetOwnerActionRequiredForWrite: nextGateBridge.summary?.targetOwnerActionRequiredForWrite === true,
    checkedApplyAvailableCount: sum([
      runtimeNormalization.summary?.checkedApplyAvailableCount,
      nextGateBridge.summary?.checkedApplyAvailableCount
    ]),
    workspaceWriteAllowedCount: sum([
      intake.summary?.workspaceWriteAllowedCount,
      vscodePacket.summary?.workspaceWriteAllowedCount,
      devtoolsPacket.summary?.workspaceWriteAllowedCount,
      visualStudioPreparation.summary?.workspaceWriteAllowedCount,
      runtimeNormalization.summary?.workspaceWriteAllowedCount,
      nextGateBridge.summary?.workspaceWriteAllowedCount
    ]),
    targetRepositoryMutationAllowedCount: sum([
      runtimeNormalization.summary?.targetRepositoryMutationAllowedCount,
      nextGateBridge.summary?.targetRepositoryMutationAllowedCount
    ]),
    targetRepositoryMutationCount: sum([
      intake.summary?.targetRepositoryMutationCount,
      vscodePacket.summary?.targetRepositoryMutationCount,
      devtoolsPacket.summary?.targetRepositoryMutationCount,
      visualStudioPreparation.summary?.targetRepositoryMutationCount,
      nextGateBridge.summary?.targetRepositoryMutationCount
    ]),
    targetRepositoryWriteAttemptedCount: sum([
      intake.summary?.targetRepositoryWriteAttemptedCount,
      vscodePacket.summary?.targetRepositoryWriteAttemptedCount,
      devtoolsPacket.summary?.targetRepositoryWriteAttemptedCount,
      visualStudioPreparation.summary?.targetRepositoryWriteAttemptedCount,
      nextGateBridge.summary?.targetRepositoryWriteAttemptedCount
    ]),
    providerOwnedApplyAllowedCount: sum([
      runtimeNormalization.summary?.providerOwnedApplyAllowedCount,
      nextGateBridge.summary?.providerOwnedApplyAllowedCount
    ]),
    lspServerOwnedApplyAllowedCount: sum([
      runtimeNormalization.summary?.lspServerOwnedApplyAllowedCount,
      nextGateBridge.summary?.lspServerOwnedApplyAllowedCount
    ]),
    directApplyAllowedCount: Number(nextGateBridge.summary?.directApplyAllowedCount ?? 0),
    directEditObjectCount: sum(inputReports.map((report) => report.evidence.summary?.directEditObjectCount))
      + countDirectEditObjects({ completedCapabilities, deferredGates, wp40StartupInputs }),
    privacyCleanInputCount: inputReports.filter((report) => inputPrivacyClean(report.evidence.summary)).length,
    sourceBodyIncludedInEvidenceCount: inputReports.reduce((total, report) => total + sourceBodyCount(report.evidence.summary), 0),
    credentialMaterialMarkerCount: Number(nextGateBridge.summary?.credentialMaterialMarkerCount ?? 0),
    pathExposureCount: inputReports.reduce((total, report) => total + Number(report.evidence.summary?.pathExposureCount ?? 0), 0)
      + countPathExposureValues({ completedCapabilities, deferredGates, wp40StartupInputs }),
    sourcesContentPolicyNoneCount: inputReports.filter((report) => policyIsNone(report.evidence.summary)).length
  };
}

function inputPrivacyClean(summary) {
  return sourceBodyCount(summary) === 0
    && Number(summary?.pathExposureCount ?? 0) === 0
    && policyIsNone(summary);
}

function sourceBodyCount(summary) {
  if (typeof summary?.sourceBodyIncludedInEvidenceCount === "number") {
    return summary.sourceBodyIncludedInEvidenceCount;
  }

  return summary?.sourceBodyIncludedInEvidence === true ? 1 : 0;
}

function policyIsNone(summary) {
  return summary?.sourcesContentPolicy === "none"
    || Number(summary?.sourcesContentPolicyNoneCount ?? 0) > 0;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function countTrue(values) {
  return values.filter((value) => value === true).length;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function countDirectEditObjects(value) {
  return countMatchingValues(value, /workspaceEdit|documentChanges|TextEdit\[/iu);
}

function countPathExposureValues(value) {
  return countMatchingValues(value, /[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u);
}

function countMatchingValues(value, pattern) {
  let count = 0;

  visitValues(value, (candidate) => {
    if (pattern.test(candidate)) {
      count += 1;
    }
  });

  return count;
}

function visitValues(value, visitor) {
  if (typeof value === "string") {
    visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitValues(item, visitor);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//u, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /work-zone/u, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent":/u, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u, `${label} must not include token-looking values.`);
}

function renderCloseoutSummaryMarkdown(evidence) {
  const { summary } = evidence;
  const lines = [
    "# W-P39 Closeout Summary",
    "",
    `Status: \`${evidence.status}\``,
    `Cycle group: \`${summary.cycleGroupId}\``,
    `Evidence inputs: ${summary.readyEvidenceInputCount}/${summary.evidenceInputCount}`,
    `Host states: ${summary.hostCount} total, ${summary.manualCaptureReadyCount} manual-capture-ready, ${summary.routePreparationReadyCount} route-preparation-ready`,
    `Actual runtime captures claimed: ${summary.actualRuntimeCaptureExecutedCount}`,
    "",
    "## Completed Capabilities",
    ""
  ];

  for (const item of evidence.completedCapabilities) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Deferred Gates");
  lines.push("");

  for (const item of evidence.deferredGates) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Evidence Inputs");
  lines.push("");
  lines.push("| Phase | Input | Status | Expected |");
  lines.push("| --- | --- | --- | --- |");

  for (const item of evidence.evidenceInputs) {
    lines.push(`| \`${item.phase}\` | ${item.id} | \`${item.status}\` | \`${item.expectedStatus}\` |`);
  }

  lines.push("");
  lines.push("W-P39 closes the host runtime capture baseline as a prepared/normalized evidence layer. It does not claim actual GUI/browser/IDE captures, remote provider calls, target repository writes or provider/LSP-owned apply authority.");
  return `${lines.join("\n")}\n`;
}

function renderWp40StartupInputsMarkdown(evidence) {
  const lines = [
    "# W-P40 Startup Inputs",
    "",
    `Source closeout: \`${evidence.contract}@${evidence.contractVersion}\``,
    "",
    "| Input | Status | Source Phase | Notes |",
    "| --- | --- | --- | --- |"
  ];

  for (const input of evidence.wp40StartupInputs) {
    lines.push(`| ${input.id} | \`${input.status}\` | ${input.sourcePhase} | ${describeWp40Input(input)} |`);
  }

  lines.push("");
  lines.push("W-P40 may start from prepared runtime states, but any real remote provider/network execution still requires explicit user approval, host-mediated credential references and redacted audit evidence.");
  return `${lines.join("\n")}\n`;
}

function describeWp40Input(input) {
  if (input.id === "normalized-host-runtime-state-matrix") {
    return `${input.hostCount} hosts, actual runtime capture executed ${input.actualRuntimeCaptureExecutedCount}`;
  }

  if (input.id === "remote-provider-smoke-manual-approval") {
    return `${input.gatePlanCount} gates, ${input.manualApprovalGateCount} manual approvals before real network`;
  }

  if (input.id === "host-mediated-secret-and-network-boundary") {
    return `host-mediated network ${input.hostMediatedNetworkRequired}, credential reference ${input.credentialReferenceRequired}`;
  }

  if (input.id === "source-privacy-default-deny") {
    return `sourcesContentPolicy ${input.sourcesContentPolicy}, source bodies ${input.sourceBodyIncludedInEvidenceCount}`;
  }

  if (input.id === "target-repository-readonly-boundary") {
    return `target owner writes only, target mutations ${input.targetRepositoryMutationCount}`;
  }

  if (input.id === "review-only-provider-output") {
    return `direct apply ${input.directApplyAllowedCount}, provider-owned apply ${input.providerOwnedApplyAllowedCount}`;
  }

  return `requires actual runtime capture before start: ${input.requiresActualRuntimeCaptureBeforeStart}`;
}
