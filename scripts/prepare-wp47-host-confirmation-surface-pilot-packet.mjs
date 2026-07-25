import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp47-host-confirmation-surface-pilot-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const packetPath = path.join(outputRoot, "wp47-host-confirmation-surface-pilot-packet.md");
const matrixPath = path.join(outputRoot, "wp47-host-confirmation-surface-matrix.md");
const summaryPath = path.join(outputRoot, "wp47-host-confirmation-surface-summary.md");

const inputPaths = {
  wp47RollbackAuditGate: path.join(rootDir, "dist", "wp47-rollback-formatter-audit-pilot-gate", "evidence.json"),
  wp43HostConfirmationManualPacket: path.join(rootDir, "dist", "wp43-host-confirmation-manual-packet", "evidence.json"),
  wp38HostConfirmationParity: path.join(rootDir, "dist", "wp38-devtools-visual-studio-confirmation-parity", "evidence.json"),
  wp37VscodeConfirmationSlice: path.join(rootDir, "dist", "wp37-vscode-checked-apply-confirmation", "evidence.json")
};

await main();

/**
 * 生成 W-P47.5 host confirmation surface pilot packet evidence。
 * Generate W-P47.5 host confirmation surface pilot packet evidence.
 *
 * 中文：本阶段将 W-P47.4 rollback / formatter / audit gate 的 ready 状态投影到
 * VS Code、Chrome DevTools 与 Visual Studio 三类宿主确认表面。它只生成可审查的
 * confirmation packet、surface matrix 与 public-safe summary；不收集真实最终确认，
 * 不启用 checked apply 写入，不调用宿主编辑 API，也不修改目标项目。
 *
 * English: This stage projects the W-P47.4 rollback/formatter/audit ready state
 * into VS Code, Chrome DevTools, and Visual Studio host confirmation surfaces.
 * It only creates reviewable confirmation packets, a surface matrix, and a
 * public-safe summary. It does not collect real final confirmation, enable
 * checked apply writes, call host editor APIs, or mutate target repositories.
 *
 * @returns {Promise<void>} Writes public-safe W-P47.5 host confirmation evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const surfaceContract = createHostConfirmationSurfaceContract(inputs);
  const hostSurfaces = createHostSurfaces(surfaceContract, inputs);
  const confirmationPackets = createConfirmationPackets(hostSurfaces, inputs.wp47RollbackAuditGate);
  const summary = summarize({
    confirmationPackets,
    hostSurfaces,
    inputs,
    surfaceContract
  });
  const checks = [
    check("HIA_WP47_HOST_CONFIRMATION_INPUTS_READY", summary.inputEvidenceCount === 4
      && summary.readyInputEvidenceCount === 4
      && summary.inputHardFailureCount === 0
      && summary.wp47RollbackAuditGateReady === true
      && summary.wp47ReadyFixtureCount === 1
      && summary.wp43ManualPacketReady === true
      && summary.wp38HostParityReady === true
      && summary.wp37VscodeConfirmationReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount,
        wp37VscodeConfirmationReady: summary.wp37VscodeConfirmationReady,
        wp38HostParityReady: summary.wp38HostParityReady,
        wp43ManualPacketReady: summary.wp43ManualPacketReady,
        wp47ReadyFixtureCount: summary.wp47ReadyFixtureCount,
        wp47RollbackAuditGateReady: summary.wp47RollbackAuditGateReady
      }
    }),
    check("HIA_WP47_HOST_CONFIRMATION_SURFACES_READY", summary.hostSurfaceCount === 3
      && summary.readyHostSurfaceCount === 3
      && summary.surfaceContractRequiredItemCount >= 10
      && summary.totalVisibleRequirementCount >= 30
      && summary.finalHumanConfirmationVisibleHostCount === 3
      && summary.repeatConflictCheckVisibleHostCount === 3
      && summary.rollbackFormatterAuditVisibleHostCount === 3, {
      actual: {
        finalHumanConfirmationVisibleHostCount: summary.finalHumanConfirmationVisibleHostCount,
        hostSurfaceCount: summary.hostSurfaceCount,
        readyHostSurfaceCount: summary.readyHostSurfaceCount,
        repeatConflictCheckVisibleHostCount: summary.repeatConflictCheckVisibleHostCount,
        rollbackFormatterAuditVisibleHostCount: summary.rollbackFormatterAuditVisibleHostCount,
        surfaceContractRequiredItemCount: summary.surfaceContractRequiredItemCount,
        totalVisibleRequirementCount: summary.totalVisibleRequirementCount
      }
    }),
    check("HIA_WP47_HOST_CONFIRMATION_PACKET_ACTIONS_SAFE", summary.confirmationPacketCount === 3
      && summary.readyPacketCount === 3
      && summary.reviewActionVisibleHostCount === 3
      && summary.copyExportActionVisibleHostCount === 3
      && summary.applyActionDisabledHostCount === 3
      && summary.targetOwnerFinalActionRequiredHostCount === 3
      && summary.targetOwnerExecutionClaimedCount === 0, {
      actual: {
        applyActionDisabledHostCount: summary.applyActionDisabledHostCount,
        confirmationPacketCount: summary.confirmationPacketCount,
        copyExportActionVisibleHostCount: summary.copyExportActionVisibleHostCount,
        readyPacketCount: summary.readyPacketCount,
        reviewActionVisibleHostCount: summary.reviewActionVisibleHostCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetOwnerFinalActionRequiredHostCount: summary.targetOwnerFinalActionRequiredHostCount
      }
    }),
    check("HIA_WP47_HOST_CONFIRMATION_NO_WRITE_OR_EXECUTION", summary.checkedApplyWriteEnabledHostCount === 0
      && summary.pilotWriteAuthorizedHostCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectProducedCount === 0
      && summary.formatterExecutedInThisStageCount === 0
      && summary.rollbackRestoreExecutedInThisStageCount === 0
      && summary.postApplyValidationExecutedInThisStageCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabledHostCount: summary.checkedApplyWriteEnabledHostCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectProducedCount: summary.directEditObjectProducedCount,
        formatterExecutedInThisStageCount: summary.formatterExecutedInThisStageCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        pilotWriteAuthorizedHostCount: summary.pilotWriteAuthorizedHostCount,
        postApplyValidationExecutedInThisStageCount: summary.postApplyValidationExecutedInThisStageCount,
        rollbackRestoreExecutedInThisStageCount: summary.rollbackRestoreExecutedInThisStageCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP47_HOST_CONFIRMATION_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.rollbackContentIncludedInEvidenceCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        rollbackContentIncludedInEvidenceCount: summary.rollbackContentIncludedInEvidenceCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP47_HOST_CONFIRMATION_NEXT_STAGE_READY", summary.readyForWp47TargetOwnerPilotDryRunReportIntake === true
      && summary.nextStage === "W-P47.6 Target-Owner Pilot Dry-Run Report Intake", {
      actual: {
        nextStage: summary.nextStage,
        readyForWp47TargetOwnerPilotDryRunReportIntake: summary.readyForWp47TargetOwnerPilotDryRunReportIntake
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P47.5 host confirmation surface pilot packet has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp47-host-confirmation-surface-pilot-packet",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp47-target-owner-pilot-dry-run-report-intake",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    hostConfirmationPolicy: {
      phase: "W-P47.5",
      cycleGroupId: "C-HIA-P2",
      policy: "host-confirmation-surface-packet-no-write-authority",
      appliesToHosts: hostSurfaces.map((surface) => surface.host),
      realFinalConfirmationCollectedByThisStage: false,
      targetOwnerExecutionClaimedByThisStage: false,
      checkedApplyWriteEnabledByThisStage: false,
      pilotWriteAuthorizedByThisStage: false,
      targetRepositoryMutationAllowedByThisStage: false,
      hostEditorApiAllowedByThisStage: false,
      sourcesContentPolicy: "none"
    },
    surfaceContract,
    hostSurfaces,
    confirmationPackets,
    nextStageInputs: createNextStageInputs(),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      matrix: normalizePath(matrixPath),
      packet: normalizePath(packetPath),
      summary: normalizePath(summaryPath)
    },
    manualChecks: [
      "Confirm each host surface shows rollback, formatter, post-validation and redacted audit readiness.",
      "Confirm final human confirmation is visible as required and not collected by this stage.",
      "Confirm checked apply action remains disabled and no host editor API call is implied.",
      "Confirm packet output contains no source body, rollback content, digest value, secret, request/response body or local path."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P47.5 host confirmation surface pilot evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(packetPath, renderPacket(evidence), "utf8");
  await writeFile(matrixPath, renderMatrix(evidence), "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    evidence: evidencePath,
    matrix: matrixPath,
    packet: packetPath,
    summary: summaryPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P47 host confirmation surface pilot evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P47 host confirmation surface pilot packet prepared at ${normalizePath(packetPath)}`);
}

async function readInputs(paths) {
  return Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)])
  ));
}

function createHostConfirmationSurfaceContract(inputs) {
  return {
    contract: "hia-wp47-host-confirmation-surface-pilot-packet",
    contractVersion: "0.1.0-draft",
    inputRollbackAuditContract: inputs.wp47RollbackAuditGate.contract,
    requiredVisibleItems: [
      visible("preflight-status", "W-P47.3 file version/conflict preflight readiness"),
      visible("rollback-record-status", "Host-owned rollback record readiness"),
      visible("formatter-plan-status", "Formatter plan readiness and execution deferral"),
      visible("post-apply-validation-plan-status", "Post-apply validation plan readiness and execution deferral"),
      visible("redacted-audit-status", "Public-safe audit status"),
      visible("privacy-boundary-status", "No source body, secret, digest or local path"),
      visible("final-human-confirmation-required", "Final human confirmation remains required"),
      visible("repeat-conflict-check-required", "Repeat conflict check remains required before any future write"),
      visible("target-owner-final-action-required", "Target owner action remains required"),
      visible("checked-apply-write-disabled", "Checked apply write is disabled by default")
    ],
    safeActions: [
      action("review-packet", "enabled", "Open or display the confirmation packet."),
      action("copy-packet-summary", "enabled", "Copy public-safe packet summary."),
      action("copy-proposal-id", "enabled", "Copy a stable proposal or transaction id reference."),
      action("record-defer-or-reject-decision", "host-owned-future", "Future host-owned decision capture; not executed by this stage."),
      action("checked-apply-write", "disabled", "Future host-owned write action remains disabled.")
    ],
    finalHumanConfirmationCollectedByContract: false,
    checkedApplyWriteEnabledByContract: false,
    hostEditorApiAllowedByContract: false,
    targetRepositoryMutationAllowedByContract: false,
    sourcesContentPolicy: "none"
  };
}

function visible(id, description) {
  return {
    id,
    description,
    status: "required-visible-before-write-pilot",
    grantsWriteAuthority: false
  };
}

function action(id, status, description) {
  return {
    id,
    status,
    description,
    grantsWriteAuthority: false
  };
}

function createHostSurfaces(surfaceContract, inputs) {
  const hosts = [
    {
      host: "vscode",
      source: "wp37-vscode-confirmation-slice",
      sourceReady: inputs.wp37VscodeConfirmationSlice.status === "ready-for-target-self-doc-checked-apply-dry-run",
      hostFamily: "editor-extension"
    },
    {
      host: "chrome-devtools",
      source: "wp38-devtools-confirmation-parity",
      sourceReady: inputs.wp38HostConfirmationParity.summary?.parityReadyHostCount >= 2,
      hostFamily: "browser-devtools-extension"
    },
    {
      host: "visual-studio",
      source: "wp38-visual-studio-confirmation-parity",
      sourceReady: inputs.wp38HostConfirmationParity.summary?.parityReadyHostCount >= 2,
      hostFamily: "ide-extension"
    }
  ];

  return hosts.map((host) => ({
    host: host.host,
    hostFamily: host.hostFamily,
    source: host.source,
    status: host.sourceReady ? "pilot-confirmation-surface-ready" : "blocked",
    requiredVisibleItems: surfaceContract.requiredVisibleItems.map((item) => item.id),
    visibleItemCount: surfaceContract.requiredVisibleItems.length,
    visibleSignals: {
      preflightStatus: "ready",
      rollbackRecordStatus: "ready",
      formatterPlanStatus: "planned-deferred",
      postApplyValidationPlanStatus: "planned-deferred",
      redactedAuditStatus: "redacted",
      privacyBoundaryStatus: "clean",
      finalHumanConfirmationRequired: true,
      repeatConflictCheckRequiredBeforeFutureWrite: true,
      targetOwnerFinalActionRequired: true,
      checkedApplyWriteDisabled: true
    },
    safeActions: surfaceContract.safeActions,
    actionSummary: {
      reviewActionVisible: true,
      copyExportActionVisible: true,
      checkedApplyActionState: "disabled",
      finalConfirmActionState: "not-collected-by-this-stage",
      targetOwnerActionRequired: true,
      targetOwnerExecutionClaimed: false
    },
    authority: createNoWriteAuthority(),
    runtime: createNoExecutionRuntime(),
    privacy: createPrivacyBoundary()
  }));
}

function createConfirmationPackets(hostSurfaces, wp47RollbackAuditGate) {
  return hostSurfaces.map((surface) => ({
    host: surface.host,
    contract: "hia-wp47-host-confirmation-surface-pilot-packet",
    status: "packet-ready",
    sourceGateStatus: wp47RollbackAuditGate.status,
    readyFixtureCount: number(wp47RollbackAuditGate.summary?.readyForHostConfirmationSurfacePilotPacketCount),
    headline: "Host confirmation required before any future write pilot.",
    sections: [
      "preflight-result",
      "rollback-record",
      "formatter-plan",
      "post-apply-validation-plan",
      "redacted-audit",
      "privacy-boundary",
      "final-human-confirmation",
      "repeat-conflict-check",
      "disabled-write-action"
    ],
    displayRequirements: surface.requiredVisibleItems,
    actions: surface.safeActions,
    authority: surface.authority,
    runtime: surface.runtime,
    privacy: surface.privacy
  }));
}

function createNoWriteAuthority() {
  return {
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    hostEditorApiAllowed: false,
    checkedApplyTriggered: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directApplyAllowed: false,
    directEditObjectProduced: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false
  };
}

function createNoExecutionRuntime() {
  return {
    formatterExecutedInThisStage: false,
    rollbackRestoreExecutedInThisStage: false,
    postApplyValidationExecutedInThisStage: false,
    targetCommandExecuted: false,
    providerNetworkExecuted: false,
    workspaceWritePerformed: false,
    targetRepositoryMutationPerformed: false
  };
}

function createPrivacyBoundary() {
  return {
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false,
    sourceTextIncluded: false,
    rollbackContentIncludedInEvidence: false,
    requestBodyIncluded: false,
    responseBodyIncluded: false,
    secretValueIncluded: false,
    digestValueIncludedInEvidence: false,
    localAbsolutePathIncluded: false,
    credentialMaterialIncluded: false
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P47.6",
      topic: "target-owner-pilot-dry-run-report-intake",
      status: "ready-input",
      requirement: "Accept target-owner submitted pilot dry-run report metadata after host confirmation packet is defined.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P47.7",
      topic: "closeout-and-wp48-inputs",
      status: "planned-input",
      requirement: "Close W-P47 by separating completed preparation from deferred real write and owner-submitted report gates.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P48",
      topic: "c-hia-p2-closeout",
      status: "planned-input",
      requirement: "Use W-P47 closeout inputs to summarize controlled execution readiness and deferred gates.",
      writeAuthorityGranted: false
    }
  ];
}

function summarize({ confirmationPackets, hostSurfaces, inputs, surfaceContract }) {
  const inputEntries = Object.entries(inputs);
  const serializedPublicSurface = JSON.stringify({
    confirmationPackets,
    hostSurfaces,
    surfaceContract
  });
  return {
    phase: "W-P47.5",
    inputEvidenceCount: inputEntries.length,
    readyInputEvidenceCount: inputEntries.filter(([, evidence]) => isReadyEvidence(evidence)).length,
    inputHardFailureCount: sum(inputEntries.map(([, evidence]) => evidence.summary?.hardFailureCount)),
    wp47RollbackAuditGateReady: inputs.wp47RollbackAuditGate.status === "ready-for-wp47-host-confirmation-surface-pilot-packet",
    wp47ReadyFixtureCount: number(inputs.wp47RollbackAuditGate.summary?.readyForHostConfirmationSurfacePilotPacketCount),
    wp43ManualPacketReady: inputs.wp43HostConfirmationManualPacket.status === "ready-for-wp43-closeout-and-c-hia-p1-inputs",
    wp38HostParityReady: inputs.wp38HostConfirmationParity.status === "ready-for-wp38-closeout-and-next-inputs",
    wp37VscodeConfirmationReady: inputs.wp37VscodeConfirmationSlice.status === "ready-for-target-self-doc-checked-apply-dry-run",
    hostSurfaceCount: hostSurfaces.length,
    readyHostSurfaceCount: hostSurfaces.filter((surface) => surface.status === "pilot-confirmation-surface-ready").length,
    surfaceContractRequiredItemCount: surfaceContract.requiredVisibleItems.length,
    totalVisibleRequirementCount: sum(hostSurfaces.map((surface) => surface.visibleItemCount)),
    finalHumanConfirmationVisibleHostCount: hostSurfaces.filter((surface) => surface.visibleSignals.finalHumanConfirmationRequired === true).length,
    repeatConflictCheckVisibleHostCount: hostSurfaces.filter((surface) => surface.visibleSignals.repeatConflictCheckRequiredBeforeFutureWrite === true).length,
    rollbackFormatterAuditVisibleHostCount: hostSurfaces.filter((surface) => surface.visibleSignals.rollbackRecordStatus === "ready"
      && surface.visibleSignals.formatterPlanStatus === "planned-deferred"
      && surface.visibleSignals.postApplyValidationPlanStatus === "planned-deferred"
      && surface.visibleSignals.redactedAuditStatus === "redacted").length,
    confirmationPacketCount: confirmationPackets.length,
    readyPacketCount: confirmationPackets.filter((packet) => packet.status === "packet-ready").length,
    reviewActionVisibleHostCount: hostSurfaces.filter((surface) => surface.actionSummary.reviewActionVisible === true).length,
    copyExportActionVisibleHostCount: hostSurfaces.filter((surface) => surface.actionSummary.copyExportActionVisible === true).length,
    applyActionDisabledHostCount: hostSurfaces.filter((surface) => surface.actionSummary.checkedApplyActionState === "disabled").length,
    targetOwnerFinalActionRequiredHostCount: hostSurfaces.filter((surface) => surface.actionSummary.targetOwnerActionRequired === true).length,
    targetOwnerExecutionClaimedCount: hostSurfaces.filter((surface) => surface.actionSummary.targetOwnerExecutionClaimed === true).length,
    checkedApplyWriteEnabledHostCount: hostSurfaces.filter((surface) => surface.authority.checkedApplyWriteEnabled === true).length,
    pilotWriteAuthorizedHostCount: hostSurfaces.filter((surface) => surface.authority.pilotWriteAuthorized === true).length,
    hostEditorApiCallCount: hostSurfaces.filter((surface) => surface.authority.hostEditorApiAllowed === true).length,
    checkedApplyTriggeredCount: hostSurfaces.filter((surface) => surface.authority.checkedApplyTriggered === true).length,
    workspaceWriteAllowedCount: hostSurfaces.filter((surface) => surface.authority.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: hostSurfaces.filter((surface) => surface.authority.targetRepositoryMutationAllowed === true).length,
    directApplyAllowedCount: hostSurfaces.filter((surface) => surface.authority.directApplyAllowed === true).length,
    directEditObjectProducedCount: hostSurfaces.filter((surface) => surface.authority.directEditObjectProduced === true).length,
    providerOwnedApplyCount: hostSurfaces.filter((surface) => surface.authority.providerOwnedApplyAllowed === true).length,
    lspServerOwnedApplyCount: hostSurfaces.filter((surface) => surface.authority.lspServerOwnedApplyAllowed === true).length,
    formatterExecutedInThisStageCount: hostSurfaces.filter((surface) => surface.runtime.formatterExecutedInThisStage === true).length,
    rollbackRestoreExecutedInThisStageCount: hostSurfaces.filter((surface) => surface.runtime.rollbackRestoreExecutedInThisStage === true).length,
    postApplyValidationExecutedInThisStageCount: hostSurfaces.filter((surface) => surface.runtime.postApplyValidationExecutedInThisStage === true).length,
    sourceBodyIncludedInEvidenceCount: hostSurfaces.filter((surface) => surface.privacy.sourceBodyIncludedInEvidence === true).length,
    sourceTextIncludedCount: hostSurfaces.filter((surface) => surface.privacy.sourceTextIncluded === true).length,
    rollbackContentIncludedInEvidenceCount: hostSurfaces.filter((surface) => surface.privacy.rollbackContentIncludedInEvidence === true).length,
    requestBodyIncludedCount: hostSurfaces.filter((surface) => surface.privacy.requestBodyIncluded === true).length,
    responseBodyIncludedCount: hostSurfaces.filter((surface) => surface.privacy.responseBodyIncluded === true).length,
    secretValueIncludedCount: hostSurfaces.filter((surface) => surface.privacy.secretValueIncluded === true).length,
    digestValueIncludedInEvidenceCount: hostSurfaces.filter((surface) => surface.privacy.digestValueIncludedInEvidence === true).length,
    localAbsolutePathDetectedCount: countPathExposure(serializedPublicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(serializedPublicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(serializedPublicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    readyForWp47TargetOwnerPilotDryRunReportIntake: true,
    nextStage: "W-P47.6 Target-Owner Pilot Dry-Run Report Intake",
    hardFailureCount: 0
  };
}

function renderPacket(evidence) {
  const packetRows = evidence.confirmationPackets
    .map((packet) => `| \`${packet.host}\` | \`${packet.status}\` | ${packet.sections.length} | \`${packet.authority.checkedApplyWriteEnabled ? "enabled" : "disabled"}\` | ${packet.privacy.sourcesContentPolicy} |`)
    .join("\n");

  return `# W-P47.5 Host Confirmation Surface Pilot Packet

## 中文摘要

W-P47.5 将 W-P47.4 ready 状态投影到 VS Code、Chrome DevTools 与 Visual Studio 三个宿主确认表面。每个 packet 都展示 preflight、rollback、formatter、post-apply validation、redacted audit、privacy、final human confirmation 与 repeat conflict check 状态；checked apply write 仍关闭。

| Host | Packet Status | Sections | Checked Apply Write | Source Policy |
| --- | --- | --- | --- | --- |
${packetRows}

## Boundary

- real final confirmation collected: false
- checked apply write: disabled
- host editor API: disabled
- workspace write: disabled
- target repository mutation: disabled
- formatter execution / rollback restore / post-validation execution: disabled
`;
}

function renderMatrix(evidence) {
  const rows = evidence.hostSurfaces
    .map((surface) => `| \`${surface.host}\` | \`${surface.status}\` | ${surface.visibleItemCount} | ${surface.actionSummary.reviewActionVisible ? "yes" : "no"} | ${surface.actionSummary.checkedApplyActionState} | ${surface.actionSummary.targetOwnerActionRequired ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P47.5 Host Confirmation Surface Matrix

## 中文摘要

本矩阵确认三个宿主表面都具备同一 pilot confirmation 输入。它们可以展示、复制或导出 public-safe 状态，但不能由本阶段触发写入。

| Host | Status | Visible Items | Review Visible | Apply Action | Target Owner Action Required |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P47.5 Host Confirmation Surface Summary

## 中文摘要

- status: \`${evidence.status}\`
- host surfaces: ${summary.hostSurfaceCount}
- ready host surfaces: ${summary.readyHostSurfaceCount}
- confirmation packets: ${summary.confirmationPacketCount}
- ready packets: ${summary.readyPacketCount}
- total visible requirements: ${summary.totalVisibleRequirementCount}
- final human confirmation visible hosts: ${summary.finalHumanConfirmationVisibleHostCount}
- apply action disabled hosts: ${summary.applyActionDisabledHostCount}
- checked apply write enabled hosts: ${summary.checkedApplyWriteEnabledHostCount}
- workspace write / target mutation / host editor API: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.hostEditorApiCallCount}
- formatter / rollback restore / post-validation executed in this stage: ${summary.formatterExecutedInThisStageCount} / ${summary.rollbackRestoreExecutedInThisStageCount} / ${summary.postApplyValidationExecutedInThisStageCount}
- source body / rollback content / digest value / secret value in evidence: ${summary.sourceBodyIncludedInEvidenceCount} / ${summary.rollbackContentIncludedInEvidenceCount} / ${summary.digestValueIncludedInEvidenceCount} / ${summary.secretValueIncludedCount}

## Next

W-P47.6 should accept target-owner pilot dry-run report metadata. It must still avoid running target commands, mutating target repositories or treating host packet readiness as final write authorization.
`;
}

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
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
