import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp38-target-branch-pr-flow-contract");
const evidencePath = path.join(outputRoot, "evidence.json");
const manualChecklistPath = path.join(outputRoot, "manual-target-branch-pr-flow-checklist.md");
const remoteSmokeGatePath = path.join(rootDir, "dist", "wp38-remote-provider-smoke-gate-preparation", "evidence.json");

await main();

/**
 * 准备 W-P38.5 target branch/PR collaboration flow evidence。
 * Prepare W-P38.5 target branch/PR collaboration flow evidence.
 *
 * This contract defines how target projects may adopt HIA suggestions through
 * target-owned branches, pull requests or isolated sandboxes. The HIA system
 * still does not create branches, open pull requests or mutate target
 * repositories in this phase.
 *
 * 中文：本 contract 定义目标项目如何通过目标方拥有的 branch、PR 或隔离
 * sandbox 接收 HIA 候选建议。本阶段 HIA 系统仍不创建分支、不打开 PR，也不
 * 修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe evidence and a manual checklist under `dist/`.
 */
async function main() {
  const remoteSmokeGate = await readJson(remoteSmokeGatePath);
  const collaborationModes = createCollaborationModes();
  const flowStates = createFlowStates();
  const targetScenarioLabels = createTargetScenarioLabels();
  const manualOnlyModes = collaborationModes.filter((mode) => mode.targetOwnerActionRequired === true);
  const summary = {
    remoteSmokeGateReady: remoteSmokeGate.status === "ready-for-target-branch-pr-flow-contract",
    remoteSmokeGateHardFailureCount: Number(remoteSmokeGate.summary?.hardFailureCount ?? -1),
    remoteSmokeGateManualApprovalRequired: remoteSmokeGate.smokeGateStatus === "prepared-manual-approval-required",
    remoteSmokeInvocationExecuted: remoteSmokeGate.summary?.realRemoteProviderInvocationExecuted,
    remoteExternalNetworkCallExecuted: remoteSmokeGate.summary?.externalNetworkCallExecuted,
    remoteTargetRepositoryMutationCount: Number(remoteSmokeGate.summary?.targetRepositoryMutationCount ?? -1),
    remoteWorkspaceWriteAllowedCount: Number(remoteSmokeGate.summary?.workspaceWriteAllowedCount ?? -1),
    remoteDirectEditObjectCount: Number(remoteSmokeGate.summary?.directEditObjectCount ?? -1),
    remoteCredentialMaterialIncludedInEvidence: remoteSmokeGate.summary?.credentialMaterialIncludedInEvidence,
    remoteCredentialMaterialIncludedInRequest: remoteSmokeGate.summary?.credentialMaterialIncludedInRequest,
    remoteSourcePolicy: remoteSmokeGate.summary?.firstSmokeSourcePolicy,
    collaborationModeCount: collaborationModes.length,
    manualOnlyCollaborationModeCount: manualOnlyModes.length,
    defaultCollaborationMode: "central-notify-read-by-targets",
    flowStateCount: flowStates.length,
    targetScenarioLabelCount: targetScenarioLabels.length,
    targetOwnedBranchAllowed: true,
    targetOwnedSandboxAllowed: true,
    targetOwnedPullRequestAllowed: true,
    hiaOwnedTargetBranchCreationAllowed: false,
    hiaOwnedPullRequestCreationAllowed: false,
    hiaOwnedTargetRepositoryPushAllowed: false,
    hiaOwnedTargetRepositoryMutationAllowed: false,
    targetOwnerActionRequiredForWrite: true,
    explicitHumanApprovalRequiredForTargetMutation: true,
    centralNotifyRequired: true,
    candidateArtifactOnlyByDefault: true,
    candidateArtifactMayContainSourceBody: false,
    candidateArtifactMayContainCredentialMaterial: false,
    branchFlowPrepared: true,
    pullRequestFlowPrepared: true,
    sandboxFlowPrepared: true,
    actualTargetBranchCreated: false,
    actualPullRequestCreated: false,
    actualTargetSandboxCreated: false,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ collaborationModes, flowStates }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ collaborationModes, flowStates }),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ collaborationModes, flowStates }),
    pathExposureCount: countPathExposure(JSON.stringify({ collaborationModes, flowStates, targetScenarioLabels })),
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false,
    realGuiManualEvidenceStillRequired: true,
    actualRemoteProviderSmokeStillPending: true,
    devtoolsVisualStudioParityStillRequired: true
  };
  const checks = [
    check("HIA_WP38_TARGET_FLOW_INPUT_READY", summary.remoteSmokeGateReady === true
      && summary.remoteSmokeGateHardFailureCount === 0
      && summary.remoteSmokeGateManualApprovalRequired === true
      && summary.remoteSmokeInvocationExecuted === false
      && summary.remoteExternalNetworkCallExecuted === false
      && summary.remoteTargetRepositoryMutationCount === 0
      && summary.remoteWorkspaceWriteAllowedCount === 0
      && summary.remoteDirectEditObjectCount === 0
      && summary.remoteCredentialMaterialIncludedInEvidence === false
      && summary.remoteCredentialMaterialIncludedInRequest === false
      && summary.remoteSourcePolicy === "none", {
      actual: {
        remoteCredentialMaterialIncludedInEvidence: summary.remoteCredentialMaterialIncludedInEvidence,
        remoteCredentialMaterialIncludedInRequest: summary.remoteCredentialMaterialIncludedInRequest,
        remoteDirectEditObjectCount: summary.remoteDirectEditObjectCount,
        remoteExternalNetworkCallExecuted: summary.remoteExternalNetworkCallExecuted,
        remoteSmokeGateHardFailureCount: summary.remoteSmokeGateHardFailureCount,
        remoteSmokeGateStatus: remoteSmokeGate.status,
        remoteSmokeInvocationExecuted: summary.remoteSmokeInvocationExecuted,
        remoteSourcePolicy: summary.remoteSourcePolicy,
        remoteTargetRepositoryMutationCount: summary.remoteTargetRepositoryMutationCount,
        remoteWorkspaceWriteAllowedCount: summary.remoteWorkspaceWriteAllowedCount
      }
    }),
    check("HIA_WP38_TARGET_FLOW_CONTRACT_SHAPE_PREPARED", summary.collaborationModeCount >= 4
      && summary.manualOnlyCollaborationModeCount >= 3
      && summary.flowStateCount >= 8
      && summary.targetScenarioLabelCount >= 2
      && summary.branchFlowPrepared === true
      && summary.pullRequestFlowPrepared === true
      && summary.sandboxFlowPrepared === true, {
      actual: {
        branchFlowPrepared: summary.branchFlowPrepared,
        collaborationModeCount: summary.collaborationModeCount,
        flowStateCount: summary.flowStateCount,
        manualOnlyCollaborationModeCount: summary.manualOnlyCollaborationModeCount,
        pullRequestFlowPrepared: summary.pullRequestFlowPrepared,
        sandboxFlowPrepared: summary.sandboxFlowPrepared,
        targetScenarioLabelCount: summary.targetScenarioLabelCount
      }
    }),
    check("HIA_WP38_TARGET_FLOW_TARGET_OWNER_OWNS_WRITES", summary.targetOwnedBranchAllowed === true
      && summary.targetOwnedSandboxAllowed === true
      && summary.targetOwnedPullRequestAllowed === true
      && summary.hiaOwnedTargetBranchCreationAllowed === false
      && summary.hiaOwnedPullRequestCreationAllowed === false
      && summary.hiaOwnedTargetRepositoryPushAllowed === false
      && summary.hiaOwnedTargetRepositoryMutationAllowed === false
      && summary.targetOwnerActionRequiredForWrite === true
      && summary.explicitHumanApprovalRequiredForTargetMutation === true, {
      actual: {
        explicitHumanApprovalRequiredForTargetMutation: summary.explicitHumanApprovalRequiredForTargetMutation,
        hiaOwnedPullRequestCreationAllowed: summary.hiaOwnedPullRequestCreationAllowed,
        hiaOwnedTargetBranchCreationAllowed: summary.hiaOwnedTargetBranchCreationAllowed,
        hiaOwnedTargetRepositoryMutationAllowed: summary.hiaOwnedTargetRepositoryMutationAllowed,
        hiaOwnedTargetRepositoryPushAllowed: summary.hiaOwnedTargetRepositoryPushAllowed,
        targetOwnedBranchAllowed: summary.targetOwnedBranchAllowed,
        targetOwnedPullRequestAllowed: summary.targetOwnedPullRequestAllowed,
        targetOwnedSandboxAllowed: summary.targetOwnedSandboxAllowed,
        targetOwnerActionRequiredForWrite: summary.targetOwnerActionRequiredForWrite
      }
    }),
    check("HIA_WP38_TARGET_FLOW_NO_MUTATION_EXECUTED", summary.actualTargetBranchCreated === false
      && summary.actualPullRequestCreated === false
      && summary.actualTargetSandboxCreated === false
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        actualPullRequestCreated: summary.actualPullRequestCreated,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP38_TARGET_FLOW_PRIVACY_CLEAN", summary.centralNotifyRequired === true
      && summary.candidateArtifactOnlyByDefault === true
      && summary.candidateArtifactMayContainSourceBody === false
      && summary.candidateArtifactMayContainCredentialMaterial === false
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.pathExposureCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false, {
      actual: {
        candidateArtifactMayContainCredentialMaterial: summary.candidateArtifactMayContainCredentialMaterial,
        candidateArtifactMayContainSourceBody: summary.candidateArtifactMayContainSourceBody,
        candidateArtifactOnlyByDefault: summary.candidateArtifactOnlyByDefault,
        centralNotifyRequired: summary.centralNotifyRequired,
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP38_TARGET_FLOW_FORWARD_GATES_RETAINED", summary.realGuiManualEvidenceStillRequired === true
      && summary.actualRemoteProviderSmokeStillPending === true
      && summary.devtoolsVisualStudioParityStillRequired === true, {
      actual: {
        actualRemoteProviderSmokeStillPending: summary.actualRemoteProviderSmokeStillPending,
        devtoolsVisualStudioParityStillRequired: summary.devtoolsVisualStudioParityStillRequired,
        realGuiManualEvidenceStillRequired: summary.realGuiManualEvidenceStillRequired
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp38-target-branch-pr-flow-contract-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-devtools-visual-studio-confirmation-parity" : "blocked",
    sourceEvidence: {
      remoteProviderSmokeGatePreparation: normalizePath(remoteSmokeGatePath)
    },
    collaborationPolicy: {
      defaultMode: "central-notify-read-by-targets",
      hiaAutomationRole: "prepare-candidate-artifacts-and-contract-evidence",
      targetOwnerRole: "create-branch-sandbox-or-pull-request-after-explicit-review",
      targetRepositoryMutationAllowedForHiaAutomation: false,
      providerOutputPolicy: "review-payload-augmentation-only",
      checkedApplyOwnership: "host-owned-separate-contract",
      sourcesContentPolicy: "none"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    collaborationModes,
    flowStates,
    targetScenarioLabels,
    checks,
    manualChecklist: normalizePath(manualChecklistPath),
    nextContractInputs: [
      {
        phase: "W-P38.6",
        topic: "devtools-visual-studio-confirmation-parity",
        reason: "Target collaboration flow is defined without granting HIA automation repository write authority; additional hosts should consume the same checked apply confirmation boundary."
      },
      {
        phase: "W-P38/manual",
        topic: "target-owned-branch-or-pr-smoke",
        reason: "Actual target branch, sandbox or pull request creation requires explicit target owner action and remains outside automated evidence."
      },
      {
        phase: "W-P38.7",
        topic: "writable-apply-sandbox-closeout",
        reason: "W-P38 can close after host parity inputs and deferred manual gates are recorded."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P38 target branch/PR flow contract evidence");
  assert.equal(hardFailures.length, 0, `W-P38 target branch/PR flow contract evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(manualChecklistPath, createManualChecklist(collaborationModes, flowStates), "utf8");
  console.log(`W-P38 target branch/PR flow contract evidence prepared at ${normalizePath(evidencePath)}`);
}

function createCollaborationModes() {
  return [
    {
      id: "central-notify-read-by-targets",
      status: "default",
      targetOwnerActionRequired: true,
      hiaAutomationWriteAuthority: false,
      targetMutationExecuted: false,
      description: "HIA writes central notifications and public-safe candidate metadata; target projects read and decide adoption."
    },
    {
      id: "target-owned-local-sandbox",
      status: "allowed-after-review",
      targetOwnerActionRequired: true,
      hiaAutomationWriteAuthority: false,
      targetMutationExecuted: false,
      description: "Target owner copies candidate artifacts into a local sandbox outside the canonical repository history."
    },
    {
      id: "target-owned-branch",
      status: "allowed-after-review",
      targetOwnerActionRequired: true,
      hiaAutomationWriteAuthority: false,
      targetMutationExecuted: false,
      description: "Target owner creates and pushes a branch after reviewing HIA candidate evidence."
    },
    {
      id: "target-owned-pull-request",
      status: "allowed-after-review",
      targetOwnerActionRequired: true,
      hiaAutomationWriteAuthority: false,
      targetMutationExecuted: false,
      description: "Target owner opens a pull request after local checks pass."
    }
  ];
}

function createFlowStates() {
  return [
    {
      id: "read-only-target-assessment",
      actor: "hia-automation",
      repositoryWriteAllowed: false,
      exitCondition: "candidate scope and target label are known"
    },
    {
      id: "candidate-artifact-preparation",
      actor: "hia-automation",
      repositoryWriteAllowed: false,
      exitCondition: "public-safe candidate artifact metadata is ready"
    },
    {
      id: "central-notify-publication",
      actor: "hia-automation",
      repositoryWriteAllowed: false,
      exitCondition: "target-impacting notice is available for target projects to read"
    },
    {
      id: "target-owner-review",
      actor: "target-owner",
      repositoryWriteAllowed: false,
      exitCondition: "target owner decides whether to test the candidate"
    },
    {
      id: "target-owned-sandbox-or-branch",
      actor: "target-owner",
      repositoryWriteAllowed: true,
      exitCondition: "target owner creates a sandbox or branch outside HIA automation"
    },
    {
      id: "target-owned-gate-run",
      actor: "target-owner",
      repositoryWriteAllowed: true,
      exitCondition: "target project checks pass or fail under target control"
    },
    {
      id: "target-owned-pull-request",
      actor: "target-owner",
      repositoryWriteAllowed: true,
      exitCondition: "target owner opens or skips a pull request"
    },
    {
      id: "human-review-and-merge",
      actor: "target-owner",
      repositoryWriteAllowed: true,
      exitCondition: "target owner merges, closes or abandons the candidate"
    }
  ];
}

function createTargetScenarioLabels() {
  return [
    {
      id: "unicodeartjs-documentation-adoption",
      targetKind: "typescript-library",
      defaultCollaborationMode: "central-notify-read-by-targets",
      hiaAutomationMutationAllowed: false
    },
    {
      id: "hia-aspnetportal-documentation-adoption",
      targetKind: "dotnet-web-application",
      defaultCollaborationMode: "central-notify-read-by-targets",
      hiaAutomationMutationAllowed: false
    }
  ];
}

function createManualChecklist(collaborationModes, flowStates) {
  const modeLines = collaborationModes.map((mode) => `- [ ] ${mode.id}: ${mode.description}`).join("\n");
  const stateLines = flowStates.map((state) => `- [ ] ${state.id}: actor ${state.actor}; exit when ${state.exitCondition}.`).join("\n");

  return `# W-P38.5 Manual Target Branch/PR Flow Checklist

This checklist is generated by \`wp38:target-branch-pr-flow:evidence\`.

## Do Not Proceed Unless

- [ ] The target repository owner explicitly chooses a collaboration mode.
- [ ] The target repository owner reviews candidate artifacts before creating a branch, sandbox or pull request.
- [ ] HIA automation does not push to the target repository.
- [ ] HIA automation does not open a pull request for the target repository in this phase.
- [ ] Provider output remains review-only and does not become a direct editor operation.
- [ ] Any target repository mutation is performed by the target owner under that project's own gate.

## Collaboration Modes

${modeLines}

## Flow States

${stateLines}
`;
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
