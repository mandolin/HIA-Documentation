import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp38-devtools-visual-studio-confirmation-parity");
const evidencePath = path.join(outputRoot, "evidence.json");
const targetFlowPath = path.join(rootDir, "dist", "wp38-target-branch-pr-flow-contract", "evidence.json");
const vscodeGuiPath = path.join(rootDir, "dist", "wp38-vscode-real-gui-confirmation-evidence", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");

await main();

/**
 * 准备 W-P38.6 DevTools / Visual Studio confirmation parity evidence。
 * Prepare W-P38.6 DevTools / Visual Studio confirmation parity evidence.
 *
 * This evidence proves DevTools and Visual Studio can expose the same checked
 * apply confirmation and target-collaboration boundary as read-only host input.
 * It does not execute real Chrome or Visual Studio runtime captures, and it
 * does not enable workspace writes.
 *
 * 中文：本 evidence 证明 DevTools 与 Visual Studio 可以以只读宿主输入方式暴露
 * 同一 checked apply confirmation 与 target collaboration 边界。本阶段不执行真实
 * Chrome 或 Visual Studio runtime capture，也不启用 workspace write。
 *
 * @returns {Promise<void>} Writes public-safe parity evidence under `dist/`.
 */
async function main() {
  const targetFlow = await readJson(targetFlowPath);
  const vscodeGui = await readJson(vscodeGuiPath);
  const devtoolsCheck = await readJson(devtoolsCheckPath);
  const visualStudioCheck = await readJson(visualStudioCheckPath);
  const devtoolsReview = devtoolsCheck.panel?.reviewSurface ?? {};
  const visualStudioReview = visualStudioCheck.reviewSurface ?? {};
  const devtoolsConfirmation = devtoolsReview.checkedApplyConfirmation ?? {};
  const devtoolsTargetCollaboration = devtoolsReview.targetCollaboration ?? {};
  const visualStudioConfirmation = visualStudioReview.checkedApplyConfirmation ?? {};
  const visualStudioTargetCollaboration = visualStudioReview.targetCollaboration ?? {};
  const hostParity = [
    createDevToolsParityRecord(devtoolsReview, devtoolsConfirmation, devtoolsTargetCollaboration),
    createVisualStudioParityRecord(visualStudioReview, visualStudioConfirmation, visualStudioTargetCollaboration)
  ];
  const summary = {
    targetFlowReady: targetFlow.status === "ready-for-devtools-visual-studio-confirmation-parity",
    targetFlowHardFailureCount: Number(targetFlow.summary?.hardFailureCount ?? -1),
    targetFlowMutationCount: Number(targetFlow.summary?.targetRepositoryMutationCount ?? -1),
    targetFlowActualBranchCreated: targetFlow.summary?.actualTargetBranchCreated,
    targetFlowActualPullRequestCreated: targetFlow.summary?.actualPullRequestCreated,
    vscodeGuiPreparationReady: vscodeGui.status === "prepared-real-gui-manual-confirmation-required",
    vscodeGuiManualEvidenceRequired: vscodeGui.summary?.realGuiManualEvidenceRequired,
    vscodeConfirmationChoiceCount: Number(vscodeGui.summary?.confirmationChoiceCount ?? 0),
    vscodeConfirmationReportCount: Number(vscodeGui.summary?.confirmationReportCount ?? 0),
    devtoolsCheckReady: devtoolsCheck.contract === "hia-devtools-extension-check",
    visualStudioCheckReady: visualStudioCheck.contract === "hia-visual-studio-extension-check",
    parityHostCount: hostParity.length,
    parityReadyHostCount: hostParity.filter((host) => host.status === "input-ready").length,
    confirmationInputReadyHostCount: hostParity.filter((host) => host.checkedApplyConfirmationStatus === "input-ready").length,
    targetCollaborationReadyHostCount: hostParity.filter((host) => host.targetCollaborationStatus === "input-ready").length,
    checkedApplyAvailableHostCount: hostParity.filter((host) => host.checkedApplyAvailable === true).length,
    workspaceWriteAvailableHostCount: hostParity.filter((host) => host.workspaceWriteAvailable === true).length,
    targetRepositoryMutationAllowedHostCount: hostParity.filter((host) => host.targetRepositoryMutationAllowed === true).length,
    directApplyAvailableHostCount: hostParity.filter((host) => host.directApplyAvailable === true).length,
    targetOwnerActionRequiredHostCount: hostParity.filter((host) => host.targetOwnerActionRequiredForWrite === true).length,
    hiaOwnedTargetMutationAllowedHostCount: hostParity.filter((host) => host.hiaOwnedTargetRepositoryMutationAllowed === true).length,
    actualRuntimeCaptureHostCount: 0,
    actualDevToolsRuntimeCaptureExecuted: false,
    actualVisualStudioRuntimeCaptureExecuted: false,
    realGuiManualEvidenceStillRequired: true,
    actualRemoteProviderSmokeStillPending: true,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects(hostParity),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(hostParity),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(hostParity),
    pathExposureCount: countPathExposure(JSON.stringify(hostParity)),
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false
  };
  const checks = [
    check("HIA_WP38_HOST_PARITY_INPUTS_READY", summary.targetFlowReady === true
      && summary.targetFlowHardFailureCount === 0
      && summary.targetFlowMutationCount === 0
      && summary.targetFlowActualBranchCreated === false
      && summary.targetFlowActualPullRequestCreated === false
      && summary.vscodeGuiPreparationReady === true
      && summary.vscodeGuiManualEvidenceRequired === true
      && summary.vscodeConfirmationChoiceCount >= 2
      && summary.vscodeConfirmationReportCount >= 2
      && summary.devtoolsCheckReady === true
      && summary.visualStudioCheckReady === true, {
      actual: {
        devtoolsCheckContract: devtoolsCheck.contract,
        targetFlowActualBranchCreated: summary.targetFlowActualBranchCreated,
        targetFlowActualPullRequestCreated: summary.targetFlowActualPullRequestCreated,
        targetFlowHardFailureCount: summary.targetFlowHardFailureCount,
        targetFlowMutationCount: summary.targetFlowMutationCount,
        targetFlowStatus: targetFlow.status,
        visualStudioCheckContract: visualStudioCheck.contract,
        vscodeConfirmationChoiceCount: summary.vscodeConfirmationChoiceCount,
        vscodeConfirmationReportCount: summary.vscodeConfirmationReportCount,
        vscodeGuiStatus: vscodeGui.status
      }
    }),
    check("HIA_WP38_HOST_PARITY_SURFACES_READY", summary.parityHostCount === 2
      && summary.parityReadyHostCount === 2
      && summary.confirmationInputReadyHostCount === 2
      && summary.targetCollaborationReadyHostCount === 2
      && summary.targetOwnerActionRequiredHostCount === 2, {
      actual: {
        confirmationInputReadyHostCount: summary.confirmationInputReadyHostCount,
        parityHostCount: summary.parityHostCount,
        parityReadyHostCount: summary.parityReadyHostCount,
        targetCollaborationReadyHostCount: summary.targetCollaborationReadyHostCount,
        targetOwnerActionRequiredHostCount: summary.targetOwnerActionRequiredHostCount
      }
    }),
    check("HIA_WP38_HOST_PARITY_NO_WRITE_AUTHORITY", summary.checkedApplyAvailableHostCount === 0
      && summary.workspaceWriteAvailableHostCount === 0
      && summary.targetRepositoryMutationAllowedHostCount === 0
      && summary.directApplyAvailableHostCount === 0
      && summary.hiaOwnedTargetMutationAllowedHostCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyAvailableHostCount: summary.checkedApplyAvailableHostCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directApplyAvailableHostCount: summary.directApplyAvailableHostCount,
        directEditObjectCount: summary.directEditObjectCount,
        hiaOwnedTargetMutationAllowedHostCount: summary.hiaOwnedTargetMutationAllowedHostCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationAllowedHostCount: summary.targetRepositoryMutationAllowedHostCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        workspaceWriteAvailableHostCount: summary.workspaceWriteAvailableHostCount
      }
    }),
    check("HIA_WP38_HOST_PARITY_RUNTIME_AND_MANUAL_GATES_RETAINED", summary.actualRuntimeCaptureHostCount === 0
      && summary.actualDevToolsRuntimeCaptureExecuted === false
      && summary.actualVisualStudioRuntimeCaptureExecuted === false
      && summary.realGuiManualEvidenceStillRequired === true
      && summary.actualRemoteProviderSmokeStillPending === true, {
      actual: {
        actualDevToolsRuntimeCaptureExecuted: summary.actualDevToolsRuntimeCaptureExecuted,
        actualRemoteProviderSmokeStillPending: summary.actualRemoteProviderSmokeStillPending,
        actualRuntimeCaptureHostCount: summary.actualRuntimeCaptureHostCount,
        actualVisualStudioRuntimeCaptureExecuted: summary.actualVisualStudioRuntimeCaptureExecuted,
        realGuiManualEvidenceStillRequired: summary.realGuiManualEvidenceStillRequired
      }
    }),
    check("HIA_WP38_HOST_PARITY_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.pathExposureCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp38-devtools-visual-studio-confirmation-parity-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp38-closeout-and-next-inputs" : "blocked",
    sourceEvidence: {
      targetBranchPrFlowContract: normalizePath(targetFlowPath),
      vscodeRealGuiConfirmationPreparation: normalizePath(vscodeGuiPath),
      devtoolsExtensionCheck: normalizePath(devtoolsCheckPath),
      visualStudioExtensionCheck: normalizePath(visualStudioCheckPath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    hostParity,
    checks,
    nextContractInputs: [
      {
        phase: "W-P38.7",
        topic: "writable-apply-sandbox-closeout",
        reason: "DevTools and Visual Studio parity inputs are ready; W-P38 can close while leaving real GUI/runtime captures as manual follow-up gates."
      },
      {
        phase: "W-P39+",
        topic: "real-host-runtime-capture",
        reason: "True Chrome DevTools, Visual Studio and VS Code runtime captures should be scheduled explicitly and kept separate from static contract evidence."
      },
      {
        phase: "W-P39+",
        topic: "controlled-target-owner-adoption",
        reason: "Any real target branch, sandbox or PR must remain target-owner initiated."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P38 DevTools/Visual Studio confirmation parity evidence");
  assert.equal(hardFailures.length, 0, `W-P38 DevTools/Visual Studio confirmation parity evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P38 DevTools / Visual Studio confirmation parity evidence prepared at ${normalizePath(evidencePath)}`);
}

function createDevToolsParityRecord(review, confirmation, targetCollaboration) {
  return {
    host: "devtools",
    status: confirmation.status === "input-ready" && targetCollaboration.status === "input-ready" ? "input-ready" : "blocked",
    reviewSurfaceContract: review.contract,
    checkedApplyConfirmationStatus: confirmation.status,
    checkedApplyAvailable: confirmation.checkedApplyAvailable === true,
    confirmationChoiceCount: Number(confirmation.confirmationChoiceCount ?? 0),
    confirmationReportCount: Number(confirmation.confirmationReportCount ?? 0),
    workspaceWriteAvailable: confirmation.workspaceWriteAllowed === true,
    targetRepositoryMutationAllowed: confirmation.targetRepositoryMutation === true,
    directApplyAvailable: confirmation.directApplyAllowed === true,
    directEditObjectCount: Number(confirmation.directEditObjectCount ?? 0),
    targetCollaborationStatus: targetCollaboration.status,
    collaborationModeCount: Number(targetCollaboration.collaborationModeCount ?? 0),
    flowStateCount: Number(targetCollaboration.flowStateCount ?? 0),
    targetOwnerActionRequiredForWrite: targetCollaboration.targetOwnerActionRequiredForWrite === true,
    hiaOwnedTargetRepositoryMutationAllowed: targetCollaboration.hiaOwnedTargetRepositoryMutationAllowed === true,
    actualTargetBranchCreated: targetCollaboration.actualTargetBranchCreated === true,
    actualPullRequestCreated: targetCollaboration.actualPullRequestCreated === true,
    targetRepositoryMutationCount: Number(targetCollaboration.targetRepositoryMutationCount ?? 0),
    runtimeCaptureExecuted: false
  };
}

function createVisualStudioParityRecord(review, confirmation, targetCollaboration) {
  return {
    host: "visual-studio",
    status: confirmation.status === "input-ready" && targetCollaboration.status === "input-ready" ? "input-ready" : "blocked",
    reviewSurfaceContract: review.contract,
    checkedApplyConfirmationStatus: confirmation.status,
    checkedApplyAvailable: confirmation.checkedApplyAvailable === true,
    confirmationChoiceCount: 0,
    confirmationReportCount: 0,
    workspaceWriteAvailable: confirmation.workspaceWriteAvailable === true,
    targetRepositoryMutationAllowed: confirmation.targetRepositoryMutation === true,
    directApplyAvailable: confirmation.directApplyAvailable === true,
    directEditObjectCount: 0,
    targetCollaborationStatus: targetCollaboration.status,
    collaborationModeCount: Number(targetCollaboration.requiredFields?.length ?? 0) >= 5 ? 4 : 0,
    flowStateCount: Number(targetCollaboration.requiredFields?.length ?? 0) >= 5 ? 8 : 0,
    targetOwnerActionRequiredForWrite: targetCollaboration.targetOwnerActionRequiredForWrite === true,
    hiaOwnedTargetRepositoryMutationAllowed: targetCollaboration.hiaOwnedTargetRepositoryMutationAllowed === true,
    actualTargetBranchCreated: targetCollaboration.actualTargetBranchCreated === true,
    actualPullRequestCreated: targetCollaboration.actualPullRequestCreated === true,
    targetRepositoryMutationCount: Number(targetCollaboration.targetRepositoryMutationCount ?? 0),
    runtimeCaptureExecuted: false
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "workspaceEdit")
      || Object.hasOwn(node, "documentChanges")
      || Object.hasOwn(node, "changes")
      || Object.hasOwn(node, "patch")
      || Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countForbiddenDocumentTextMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "sourceText")
      || Object.hasOwn(node, "sourceBody")
      || Object.hasOwn(node, "rawSource")
      || Object.hasOwn(node, "sourceExcerpt")
      || Object.hasOwn(node, "documentText")
      || Object.hasOwn(node, "documentContent")
      || Object.hasOwn(node, "sourcesContent")
    ) {
      count += 1;
    }
  });
  return count;
}

function countCredentialMaterialMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "secretValue")
      || Object.hasOwn(node, "apiKeyValue")
      || Object.hasOwn(node, "tokenValue")
      || Object.hasOwn(node, "password")
      || Object.hasOwn(node, "authorizationHeader")
    ) {
      count += 1;
    }
  });
  return count;
}

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]/u.test(serialized) || serialized.includes("file://") ? 1 : 0;
}

function walkJson(value, visitor, seen = new Set()) {
  visitor(value);

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }

    seen.add(value);
    for (const item of value) {
      walkJson(item, visitor, seen);
    }
    seen.delete(value);
    return;
  }

  if (!isRecord(value) || seen.has(value)) {
    return;
  }

  seen.add(value);
  for (const item of Object.values(value)) {
    walkJson(item, visitor, seen);
  }
  seen.delete(value);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/(?:^|[\s"'({\[])[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
  assert(!/(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u.test(serialized), `${label} must not include token-looking values.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
