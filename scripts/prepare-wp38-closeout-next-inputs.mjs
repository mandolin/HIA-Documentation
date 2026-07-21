import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp38-closeout-next-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputDefinitions = [
  {
    id: "host-owned-writable-sandbox",
    path: path.join(rootDir, "dist", "wp38-host-owned-writable-apply-sandbox", "evidence.json"),
    expectedStatus: "ready-for-vscode-real-gui-confirmation-evidence"
  },
  {
    id: "vscode-real-gui-confirmation-preparation",
    path: path.join(rootDir, "dist", "wp38-vscode-real-gui-confirmation-evidence", "evidence.json"),
    expectedStatus: "prepared-real-gui-manual-confirmation-required"
  },
  {
    id: "sandbox-rollback-restore-failure-path",
    path: path.join(rootDir, "dist", "wp38-sandbox-rollback-restore-failure-path", "evidence.json"),
    expectedStatus: "ready-for-remote-provider-smoke-gate-preparation"
  },
  {
    id: "remote-provider-smoke-gate-preparation",
    path: path.join(rootDir, "dist", "wp38-remote-provider-smoke-gate-preparation", "evidence.json"),
    expectedStatus: "ready-for-target-branch-pr-flow-contract"
  },
  {
    id: "target-branch-pr-flow-contract",
    path: path.join(rootDir, "dist", "wp38-target-branch-pr-flow-contract", "evidence.json"),
    expectedStatus: "ready-for-devtools-visual-studio-confirmation-parity"
  },
  {
    id: "devtools-visual-studio-confirmation-parity",
    path: path.join(rootDir, "dist", "wp38-devtools-visual-studio-confirmation-parity", "evidence.json"),
    expectedStatus: "ready-for-wp38-closeout-and-next-inputs"
  }
];

await main();

/**
 * 准备 W-P38 closeout and next-input evidence。
 * Prepare W-P38 closeout and next-input evidence.
 *
 * This script summarizes the W-P38 writable apply sandbox and host confirmation
 * cycle. It records which automatic evidence is complete and which real
 * runtime/manual gates remain explicit future work.
 *
 * 中文：本脚本汇总 W-P38 writable apply sandbox 与 host confirmation 周期，记录
 * 自动 evidence 已完成的边界，以及仍需显式后续处理的真实 runtime/manual gates。
 *
 * @returns {Promise<void>} Writes public-safe closeout evidence under `dist/`.
 */
async function main() {
  const inputReports = await Promise.all(inputDefinitions.map(readInputReport));
  const byId = Object.fromEntries(inputReports.map((report) => [report.id, report]));
  const sandbox = byId["host-owned-writable-sandbox"]?.evidence;
  const vscodeGui = byId["vscode-real-gui-confirmation-preparation"]?.evidence;
  const rollback = byId["sandbox-rollback-restore-failure-path"]?.evidence;
  const remoteSmoke = byId["remote-provider-smoke-gate-preparation"]?.evidence;
  const targetFlow = byId["target-branch-pr-flow-contract"]?.evidence;
  const hostParity = byId["devtools-visual-studio-confirmation-parity"]?.evidence;
  const completedCapabilities = createCompletedCapabilities();
  const deferredManualGates = createDeferredManualGates();
  const nextCycleInputs = createNextCycleInputs();
  const summary = {
    evidenceInputCount: inputReports.length,
    readyEvidenceInputCount: inputReports.filter((report) => report.status === report.expectedStatus).length,
    inputHardFailureCount: inputReports.reduce((total, report) => total + report.hardFailureCount, 0),
    sandboxScenarioCount: Number(sandbox?.summary?.sandboxScenarioCount ?? 0),
    sandboxApplySuccessCount: Number(sandbox?.summary?.sandboxApplySuccessCount ?? 0),
    sandboxWriteOperationCount: Number(sandbox?.summary?.sandboxWriteOperationCount ?? 0),
    vscodeGuiPrepared: vscodeGui?.status === "prepared-real-gui-manual-confirmation-required",
    vscodeGuiManualEvidenceRequired: vscodeGui?.summary?.realGuiManualEvidenceRequired,
    confirmationChoiceCount: Number(vscodeGui?.summary?.confirmationChoiceCount ?? 0),
    confirmationReportCount: Number(vscodeGui?.summary?.confirmationReportCount ?? 0),
    failureScenarioCount: Number(rollback?.summary?.failureScenarioCount ?? 0),
    rollbackRestoreExecutedCount: Number(rollback?.summary?.rollbackRestoreExecutedCount ?? 0),
    remoteSmokeGatePrepared: remoteSmoke?.smokeGateStatus === "prepared-manual-approval-required",
    remoteSmokeGateCount: Number(remoteSmoke?.summary?.gatePlanCount ?? 0),
    remoteSmokeManualApprovalGateCount: Number(remoteSmoke?.summary?.manualApprovalGateCount ?? 0),
    remoteProviderInvocationExecuted: remoteSmoke?.summary?.realRemoteProviderInvocationExecuted,
    externalNetworkCallExecuted: remoteSmoke?.summary?.externalNetworkCallExecuted,
    targetFlowReady: targetFlow?.status === "ready-for-devtools-visual-studio-confirmation-parity",
    targetCollaborationModeCount: Number(targetFlow?.summary?.collaborationModeCount ?? 0),
    actualTargetBranchCreated: targetFlow?.summary?.actualTargetBranchCreated,
    actualPullRequestCreated: targetFlow?.summary?.actualPullRequestCreated,
    hostParityReady: hostParity?.status === "ready-for-wp38-closeout-and-next-inputs",
    parityReadyHostCount: Number(hostParity?.summary?.parityReadyHostCount ?? 0),
    confirmationInputReadyHostCount: Number(hostParity?.summary?.confirmationInputReadyHostCount ?? 0),
    targetCollaborationReadyHostCount: Number(hostParity?.summary?.targetCollaborationReadyHostCount ?? 0),
    checkedApplyAvailableHostCount: Number(hostParity?.summary?.checkedApplyAvailableHostCount ?? -1),
    workspaceWriteAvailableHostCount: Number(hostParity?.summary?.workspaceWriteAvailableHostCount ?? -1),
    targetRepositoryMutationAllowedHostCount: Number(hostParity?.summary?.targetRepositoryMutationAllowedHostCount ?? -1),
    actualRuntimeCaptureHostCount: Number(hostParity?.summary?.actualRuntimeCaptureHostCount ?? -1),
    completedCapabilityCount: completedCapabilities.length,
    deferredManualGateCount: deferredManualGates.length,
    nextCycleInputCount: nextCycleInputs.length,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ completedCapabilities, deferredManualGates, nextCycleInputs }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ completedCapabilities, deferredManualGates, nextCycleInputs }),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ completedCapabilities, deferredManualGates, nextCycleInputs }),
    pathExposureCount: countPathExposure(JSON.stringify({ completedCapabilities, deferredManualGates, nextCycleInputs })),
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false
  };
  const checks = [
    check("HIA_WP38_CLOSEOUT_ALL_INPUTS_READY", summary.readyEvidenceInputCount === summary.evidenceInputCount, {
      actual: inputReports.map(({ id, status }) => ({ id, status })),
      expected: inputReports.map(({ expectedStatus, id }) => ({ id, status: expectedStatus }))
    }),
    check("HIA_WP38_CLOSEOUT_NO_INPUT_FAILURES", summary.inputHardFailureCount === 0, {
      actual: summary.inputHardFailureCount,
      expected: 0
    }),
    check("HIA_WP38_CLOSEOUT_SANDBOX_AND_CONFIRMATION_COMPLETE", summary.sandboxScenarioCount >= 2
      && summary.sandboxApplySuccessCount >= 2
      && summary.sandboxWriteOperationCount >= 6
      && summary.vscodeGuiPrepared === true
      && summary.vscodeGuiManualEvidenceRequired === true
      && summary.confirmationChoiceCount >= 2
      && summary.confirmationReportCount >= 2
      && summary.failureScenarioCount >= 3
      && summary.rollbackRestoreExecutedCount >= 1, {
      actual: {
        confirmationChoiceCount: summary.confirmationChoiceCount,
        confirmationReportCount: summary.confirmationReportCount,
        failureScenarioCount: summary.failureScenarioCount,
        rollbackRestoreExecutedCount: summary.rollbackRestoreExecutedCount,
        sandboxApplySuccessCount: summary.sandboxApplySuccessCount,
        sandboxScenarioCount: summary.sandboxScenarioCount,
        sandboxWriteOperationCount: summary.sandboxWriteOperationCount,
        vscodeGuiManualEvidenceRequired: summary.vscodeGuiManualEvidenceRequired,
        vscodeGuiPrepared: summary.vscodeGuiPrepared
      }
    }),
    check("HIA_WP38_CLOSEOUT_PROVIDER_TARGET_AND_HOST_PARITY_READY", summary.remoteSmokeGatePrepared === true
      && summary.remoteSmokeGateCount >= 14
      && summary.remoteSmokeManualApprovalGateCount >= 5
      && summary.remoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.targetFlowReady === true
      && summary.targetCollaborationModeCount >= 4
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestCreated === false
      && summary.hostParityReady === true
      && summary.parityReadyHostCount === 2
      && summary.confirmationInputReadyHostCount === 2
      && summary.targetCollaborationReadyHostCount === 2, {
      actual: {
        actualPullRequestCreated: summary.actualPullRequestCreated,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        confirmationInputReadyHostCount: summary.confirmationInputReadyHostCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        hostParityReady: summary.hostParityReady,
        parityReadyHostCount: summary.parityReadyHostCount,
        remoteProviderInvocationExecuted: summary.remoteProviderInvocationExecuted,
        remoteSmokeGateCount: summary.remoteSmokeGateCount,
        remoteSmokeGatePrepared: summary.remoteSmokeGatePrepared,
        remoteSmokeManualApprovalGateCount: summary.remoteSmokeManualApprovalGateCount,
        targetCollaborationModeCount: summary.targetCollaborationModeCount,
        targetCollaborationReadyHostCount: summary.targetCollaborationReadyHostCount,
        targetFlowReady: summary.targetFlowReady
      }
    }),
    check("HIA_WP38_CLOSEOUT_NO_UNSAFE_WRITE_AUTHORITY", summary.checkedApplyAvailableHostCount === 0
      && summary.workspaceWriteAvailableHostCount === 0
      && summary.targetRepositoryMutationAllowedHostCount === 0
      && summary.actualRuntimeCaptureHostCount === 0
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        actualRuntimeCaptureHostCount: summary.actualRuntimeCaptureHostCount,
        checkedApplyAvailableHostCount: summary.checkedApplyAvailableHostCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
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
    check("HIA_WP38_CLOSEOUT_NEXT_INPUTS_RECORDED", summary.completedCapabilityCount >= 6
      && summary.deferredManualGateCount >= 6
      && summary.nextCycleInputCount >= 6
      && nextCycleInputs.includes("real-host-runtime-capture-planning")
      && nextCycleInputs.includes("controlled-remote-provider-smoke")
      && nextCycleInputs.includes("target-owner-branch-pr-smoke"), {
      actual: {
        completedCapabilities,
        deferredManualGates,
        nextCycleInputs
      }
    }),
    check("HIA_WP38_CLOSEOUT_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
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
    contract: "hia-wp38-closeout-next-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-next-cycle-planning" : "blocked",
    sourceEvidence: Object.fromEntries(inputReports.map((report) => [report.id, normalizePath(report.path)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    evidenceInputs: inputReports.map(({ contract, contractVersion, expectedStatus, hardFailureCount, id, status }) => ({
      contract,
      contractVersion,
      expectedStatus,
      hardFailureCount,
      id,
      status
    })),
    completedCapabilities,
    deferredManualGates,
    checks,
    nextCycleInputs: nextCycleInputs.map((topic) => ({
      topic,
      status: "forward-input",
      targetRepositoryMutationAllowed: false
    }))
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P38 closeout and next-input evidence");
  assert.equal(hardFailures.length, 0, `W-P38 closeout evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P38 closeout next-input evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readInputReport(inputDefinition) {
  const evidence = JSON.parse(await readFile(inputDefinition.path, "utf8"));
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  return {
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    evidence,
    expectedStatus: inputDefinition.expectedStatus,
    hardFailureCount: checks.filter((item) => item.status === "fail").length,
    id: inputDefinition.id,
    path: inputDefinition.path,
    status: evidence.status
  };
}

function createCompletedCapabilities() {
  return [
    "host-owned-writable-sandbox-success-path",
    "vscode-real-gui-confirmation-preparation",
    "sandbox-rollback-restore-failure-path",
    "remote-provider-smoke-gate-preparation",
    "target-branch-pr-flow-contract",
    "devtools-visual-studio-confirmation-parity"
  ];
}

function createDeferredManualGates() {
  return [
    "vscode-extension-development-host-real-gui-capture",
    "chrome-devtools-unpacked-runtime-capture",
    "visual-studio-extension-runtime-capture",
    "controlled-remote-provider-smoke",
    "target-owner-local-sandbox-smoke",
    "target-owner-branch-pr-smoke"
  ];
}

function createNextCycleInputs() {
  return [
    "real-host-runtime-capture-planning",
    "controlled-remote-provider-smoke",
    "target-owner-branch-pr-smoke",
    "checked-apply-contract-hardening",
    "host-owned-apply-ux-polish",
    "provider-result-to-checked-apply-review-linkage"
  ];
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
