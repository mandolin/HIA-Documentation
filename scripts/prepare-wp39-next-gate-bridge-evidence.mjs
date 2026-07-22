import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp39-next-gate-bridge");
const evidencePath = path.join(outputRoot, "evidence.json");
const bridgeMatrixPath = path.join(outputRoot, "next-gate-bridge-matrix.md");
const downstreamContractPath = path.join(outputRoot, "downstream-gate-consumption-contract.md");
const runtimeNormalizationPath = path.join(rootDir, "dist", "wp39-runtime-evidence-normalization", "evidence.json");
const remoteSmokeGatePath = path.join(rootDir, "dist", "wp38-remote-provider-smoke-gate-preparation", "evidence.json");
const targetFlowPath = path.join(rootDir, "dist", "wp38-target-branch-pr-flow-contract", "evidence.json");
const checkedApplyCloseoutPath = path.join(rootDir, "dist", "wp37-closeout-provider-remote-inputs", "evidence.json");
const providerGovernanceCloseoutPath = path.join(rootDir, "dist", "wp36-closeout-checked-apply-inputs", "evidence.json");
const writableApplyCloseoutPath = path.join(rootDir, "dist", "wp38-closeout-next-inputs", "evidence.json");

await main();

/**
 * 生成 W-P39.6 next gate bridge evidence。
 * Generate W-P39.6 next gate bridge evidence.
 *
 * This bridge converts W-P39 normalized host runtime states and W-P36-W-P38
 * gate evidence into explicit inputs for W-P40, W-P41, W-P42 and W-P43. It is
 * a planning/contract bridge only: no provider call, host launch, workspace
 * write, target repository mutation, or checked apply execution is performed.
 *
 * 中文：本桥接脚本把 W-P39 normalized host runtime state 与 W-P36-W-P38
 * gate evidence 转换为 W-P40、W-P41、W-P42、W-P43 的显式输入。它仅是规划
 * 与契约桥接，不执行 provider 调用、宿主启动、workspace 写入、目标仓库变更或
 * checked apply。
 *
 * @returns {Promise<void>} Writes public-safe bridge evidence and handoff docs.
 */
async function main() {
  const runtimeNormalization = await readJson(runtimeNormalizationPath);
  const remoteSmokeGate = await readJson(remoteSmokeGatePath);
  const targetFlow = await readJson(targetFlowPath);
  const checkedApplyCloseout = await readJson(checkedApplyCloseoutPath);
  const providerGovernanceCloseout = await readJson(providerGovernanceCloseoutPath);
  const writableApplyCloseout = await readJson(writableApplyCloseoutPath);
  const bridgeTargets = createBridgeTargets({
    checkedApplyCloseout,
    providerGovernanceCloseout,
    remoteSmokeGate,
    runtimeNormalization,
    targetFlow,
    writableApplyCloseout
  });
  const downstreamContract = createDownstreamContract(bridgeTargets);
  const summary = summarize({
    bridgeTargets,
    checkedApplyCloseout,
    providerGovernanceCloseout,
    remoteSmokeGate,
    runtimeNormalization,
    targetFlow,
    writableApplyCloseout
  });
  const checks = [
    check("HIA_WP39_NEXT_GATE_BRIDGE_INPUTS_READY", summary.runtimeNormalizationReady === true
      && summary.runtimeNormalizationHardFailureCount === 0
      && summary.remoteSmokeGateReady === true
      && summary.remoteSmokeGateHardFailureCount === 0
      && summary.targetFlowReady === true
      && summary.targetFlowHardFailureCount === 0
      && summary.checkedApplyCloseoutReady === true
      && summary.checkedApplyCloseoutHardFailureCount === 0
      && summary.providerGovernanceCloseoutReady === true
      && summary.providerGovernanceHardFailureCount === 0
      && summary.writableApplyCloseoutReady === true
      && summary.writableApplyCloseoutHardFailureCount === 0, {
      actual: {
        checkedApplyCloseoutStatus: checkedApplyCloseout.status,
        providerGovernanceCloseoutStatus: providerGovernanceCloseout.status,
        remoteSmokeGateStatus: remoteSmokeGate.status,
        runtimeNormalizationStatus: runtimeNormalization.status,
        targetFlowStatus: targetFlow.status,
        writableApplyCloseoutStatus: writableApplyCloseout.status
      }
    }),
    check("HIA_WP39_NEXT_GATE_BRIDGE_TARGETS_READY", summary.bridgeTargetCount === 4
      && summary.directBridgeTargetCount === 3
      && summary.secondaryBridgeTargetCount === 1
      && summary.readyBridgeTargetCount === 4
      && summary.w40Ready === true
      && summary.w41Ready === true
      && summary.w42Ready === true
      && summary.w43Ready === true, {
      actual: {
        bridgeTargetCount: summary.bridgeTargetCount,
        directBridgeTargetCount: summary.directBridgeTargetCount,
        readyBridgeTargetCount: summary.readyBridgeTargetCount,
        secondaryBridgeTargetCount: summary.secondaryBridgeTargetCount,
        targets: bridgeTargets.map(({ targetPhase, status }) => ({ targetPhase, status }))
      }
    }),
    check("HIA_WP39_NEXT_GATE_BRIDGE_RUNTIME_POLICY_SAFE", summary.normalizedHostCount === 3
      && summary.manualCaptureReadyCount === 2
      && summary.routePreparationReadyCount === 1
      && summary.actualRuntimeCaptureExecutedCount === 0
      && summary.captureCompletionClaimedCount === 0
      && summary.bridgeTargetsRequiringRuntimeCaptureCount === 0
      && summary.bridgeTargetsRequiringNormalizedStateCount === 4, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        bridgeTargetsRequiringNormalizedStateCount: summary.bridgeTargetsRequiringNormalizedStateCount,
        bridgeTargetsRequiringRuntimeCaptureCount: summary.bridgeTargetsRequiringRuntimeCaptureCount,
        captureCompletionClaimedCount: summary.captureCompletionClaimedCount,
        manualCaptureReadyCount: summary.manualCaptureReadyCount,
        normalizedHostCount: summary.normalizedHostCount,
        routePreparationReadyCount: summary.routePreparationReadyCount
      }
    }),
    check("HIA_WP39_NEXT_GATE_BRIDGE_PROVIDER_GATE_SAFE", summary.remoteGatePlanCount >= 14
      && summary.remoteManualApprovalGateCount >= 5
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.providerCredentialMaterialIncludedCount === 0
      && summary.providerSourcePolicyNone === true, {
      actual: {
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        providerCredentialMaterialIncludedCount: summary.providerCredentialMaterialIncludedCount,
        providerSourcePolicyNone: summary.providerSourcePolicyNone,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        remoteGatePlanCount: summary.remoteGatePlanCount,
        remoteManualApprovalGateCount: summary.remoteManualApprovalGateCount
      }
    }),
    check("HIA_WP39_NEXT_GATE_BRIDGE_TARGET_OWNER_SAFE", summary.targetFlowStateCount >= 8
      && summary.targetOwnerActionRequiredForWrite === true
      && summary.hiaOwnedTargetRepositoryMutationAllowed === false
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestCreated === false
      && summary.actualTargetSandboxCreated === false, {
      actual: {
        actualPullRequestCreated: summary.actualPullRequestCreated,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        hiaOwnedTargetRepositoryMutationAllowed: summary.hiaOwnedTargetRepositoryMutationAllowed,
        targetFlowStateCount: summary.targetFlowStateCount,
        targetOwnerActionRequiredForWrite: summary.targetOwnerActionRequiredForWrite
      }
    }),
    check("HIA_WP39_NEXT_GATE_BRIDGE_NO_WRITE_AUTHORITY", summary.checkedApplyAvailableCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
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
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP39_NEXT_GATE_BRIDGE_PRIVACY_CLEAN", summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.sourcesContentPolicyNoneCount >= 4
      && summary.pathExposureCount === 0
      && summary.credentialMaterialMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourcesContentPolicyNoneCount: summary.sourcesContentPolicyNoneCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp39-next-gate-bridge-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp39-closeout-and-wp40-inputs" : "blocked",
    sourceEvidence: {
      runtimeEvidenceNormalization: normalizePath(runtimeNormalizationPath),
      remoteProviderSmokeGate: normalizePath(remoteSmokeGatePath),
      targetBranchPrFlow: normalizePath(targetFlowPath),
      checkedApplyCloseout: normalizePath(checkedApplyCloseoutPath),
      providerGovernanceCloseout: normalizePath(providerGovernanceCloseoutPath),
      writableApplyCloseout: normalizePath(writableApplyCloseoutPath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    bridgeTargets,
    downstreamContract,
    generatedDocs: {
      bridgeMatrix: normalizePath(bridgeMatrixPath),
      downstreamGateConsumptionContract: normalizePath(downstreamContractPath)
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P39.7",
        topic: "wp39-closeout-and-wp40-inputs",
        reason: "W-P39 can now close out with a normalized runtime matrix and explicit downstream gate inputs."
      },
      {
        phase: "W-P40",
        topic: "controlled-remote-provider-smoke",
        reason: "Remote provider smoke can consume normalized host state and provider governance gates without depending on completed runtime capture."
      },
      {
        phase: "W-P41",
        topic: "target-owner-branch-pr-smoke",
        reason: "Target-owner adoption can consume normalized host state while retaining owner-only write authority."
      },
      {
        phase: "W-P42",
        topic: "checked-apply-contract-hardening",
        reason: "Checked apply hardening can consume normalized host state and existing sandbox/closeout gates without enabling writes."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P39 next gate bridge evidence");
  assert.equal(hardFailures.length, 0, `W-P39 next gate bridge has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(bridgeMatrixPath, renderBridgeMatrixMarkdown(bridgeTargets, summary), "utf8");
  await writeFile(downstreamContractPath, renderDownstreamContractMarkdown(downstreamContract), "utf8");
  console.log(`W-P39 next gate bridge evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Next gate bridge matrix prepared at ${normalizePath(bridgeMatrixPath)}`);
  console.log(`Downstream gate consumption contract prepared at ${normalizePath(downstreamContractPath)}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read required JSON evidence at ${normalizePath(filePath)}: ${error.message}`);
  }
}

function createBridgeTargets({
  checkedApplyCloseout,
  providerGovernanceCloseout,
  remoteSmokeGate,
  runtimeNormalization,
  targetFlow,
  writableApplyCloseout
}) {
  return [
    {
      targetPhase: "W-P40",
      targetName: "Controlled Remote Provider Smoke",
      targetKind: "direct-next-gate",
      status: "ready-input",
      sourceEvidence: [
        normalizePath(runtimeNormalizationPath),
        normalizePath(remoteSmokeGatePath),
        normalizePath(providerGovernanceCloseoutPath)
      ],
      consumesNormalizedRuntimeState: true,
      requiresActualRuntimeCaptureBeforeStart: false,
      requiredHostStates: runtimeNormalization.normalizedHosts.map(pickHostState),
      requiredGateInputs: [
        {
          id: "provider-governance",
          status: providerGovernanceCloseout.status,
          hardFailureCount: Number(providerGovernanceCloseout.summary?.hardFailureCount ?? 0)
        },
        {
          id: "remote-smoke-gate",
          status: remoteSmokeGate.smokeGateStatus,
          gatePlanCount: Number(remoteSmokeGate.summary?.gatePlanCount ?? 0),
          manualApprovalGateCount: Number(remoteSmokeGate.summary?.manualApprovalGateCount ?? 0),
          sourcePolicy: remoteSmokeGate.summary?.firstSmokeSourcePolicy
        }
      ],
      executionPolicy: {
        manualApprovalRequired: true,
        hostMediatedNetworkRequired: remoteSmokeGate.summary?.hostNetworkMediatorRequired === true,
        destinationAllowlistRequired: remoteSmokeGate.summary?.destinationAllowlistRequired === true,
        credentialReferenceRequired: remoteSmokeGate.summary?.credentialReferenceRequired === true,
        realRemoteProviderInvocationExecuted: remoteSmokeGate.summary?.realRemoteProviderInvocationExecuted === true,
        externalNetworkCallExecuted: remoteSmokeGate.summary?.externalNetworkCallExecuted === true
      },
      writeAuthority: noWriteAuthority()
    },
    {
      targetPhase: "W-P41",
      targetName: "Target-Owner Branch And PR Smoke",
      targetKind: "direct-next-gate",
      status: "ready-input",
      sourceEvidence: [
        normalizePath(runtimeNormalizationPath),
        normalizePath(targetFlowPath),
        normalizePath(writableApplyCloseoutPath)
      ],
      consumesNormalizedRuntimeState: true,
      requiresActualRuntimeCaptureBeforeStart: false,
      requiredHostStates: runtimeNormalization.normalizedHosts.map(pickHostState),
      requiredGateInputs: [
        {
          id: "target-owner-flow",
          status: targetFlow.status,
          collaborationModeCount: Number(targetFlow.summary?.collaborationModeCount ?? 0),
          flowStateCount: Number(targetFlow.summary?.flowStateCount ?? 0),
          targetOwnerActionRequiredForWrite: targetFlow.summary?.targetOwnerActionRequiredForWrite === true
        },
        {
          id: "writable-apply-closeout",
          status: writableApplyCloseout.status,
          nextCycleInputCount: Number(writableApplyCloseout.summary?.nextCycleInputCount ?? 0)
        }
      ],
      executionPolicy: {
        targetOwnerActionRequiredForWrite: targetFlow.summary?.targetOwnerActionRequiredForWrite === true,
        hiaOwnedTargetRepositoryMutationAllowed: targetFlow.summary?.hiaOwnedTargetRepositoryMutationAllowed === true,
        actualTargetBranchCreated: targetFlow.summary?.actualTargetBranchCreated === true,
        actualPullRequestCreated: targetFlow.summary?.actualPullRequestCreated === true,
        actualTargetSandboxCreated: targetFlow.summary?.actualTargetSandboxCreated === true
      },
      writeAuthority: noWriteAuthority()
    },
    {
      targetPhase: "W-P42",
      targetName: "Checked Apply Contract Hardening",
      targetKind: "direct-next-gate",
      status: "ready-input",
      sourceEvidence: [
        normalizePath(runtimeNormalizationPath),
        normalizePath(checkedApplyCloseoutPath),
        normalizePath(writableApplyCloseoutPath)
      ],
      consumesNormalizedRuntimeState: true,
      requiresActualRuntimeCaptureBeforeStart: false,
      requiredHostStates: runtimeNormalization.normalizedHosts.map(pickHostState),
      requiredGateInputs: [
        {
          id: "checked-apply-closeout",
          status: checkedApplyCloseout.status,
          readyInputCount: Number(checkedApplyCloseout.summary?.readyInputCount ?? 0),
          forwardInputCount: Number(checkedApplyCloseout.summary?.forwardInputCount ?? 0)
        },
        {
          id: "writable-apply-closeout",
          status: writableApplyCloseout.status,
          sandboxApplySuccessCount: Number(writableApplyCloseout.summary?.sandboxApplySuccessCount ?? 0),
          failureScenarioCount: Number(writableApplyCloseout.summary?.failureScenarioCount ?? 0)
        }
      ],
      executionPolicy: {
        checkedApplyAvailableBeforeHardening: false,
        hostOwnedApplyRequired: true,
        finalHumanApprovalRequired: true,
        conflictRollbackAuditRequired: true
      },
      writeAuthority: noWriteAuthority()
    },
    {
      targetPhase: "W-P43",
      targetName: "Host-Owned Apply UX And Provider Review Linkage",
      targetKind: "secondary-forward-gate",
      status: "ready-input",
      sourceEvidence: [
        normalizePath(runtimeNormalizationPath),
        normalizePath(remoteSmokeGatePath),
        normalizePath(checkedApplyCloseoutPath),
        normalizePath(writableApplyCloseoutPath)
      ],
      consumesNormalizedRuntimeState: true,
      requiresActualRuntimeCaptureBeforeStart: false,
      requiredHostStates: runtimeNormalization.normalizedHosts.map(pickHostState),
      requiredGateInputs: [
        {
          id: "provider-review-gate",
          status: remoteSmokeGate.status,
          reviewOnlyOutputRequired: remoteSmokeGate.summary?.reviewOnlyOutputRequired === true
        },
        {
          id: "checked-apply-inputs",
          status: checkedApplyCloseout.status,
          forwardInputCount: Number(checkedApplyCloseout.summary?.forwardInputCount ?? 0)
        }
      ],
      executionPolicy: {
        providerResultMayEnterReviewLinkageOnly: true,
        directApplyFromProviderAllowed: false,
        hostUxMayShowPreparedStateOnly: true
      },
      writeAuthority: noWriteAuthority()
    }
  ];
}

function createDownstreamContract(bridgeTargets) {
  return {
    contract: "hia-wp39-downstream-gate-consumption-contract",
    contractVersion: "0.1.0-draft",
    requiredFields: [
      "targetPhase",
      "status",
      "consumesNormalizedRuntimeState",
      "requiresActualRuntimeCaptureBeforeStart",
      "requiredHostStates",
      "requiredGateInputs",
      "executionPolicy",
      "writeAuthority"
    ],
    requiredTargetPhases: bridgeTargets.map((target) => target.targetPhase),
    rules: [
      "Downstream gates consume normalized runtime states instead of host-specific packet shapes.",
      "A downstream gate may start from manual-capture-ready or route-preparation-ready states only if it keeps actual runtime capture unclaimed.",
      "Remote provider smoke requires host-mediated consent and credential references before any real network call.",
      "Target branch and pull request smoke must be executed by the target owner, not by HIA automation.",
      "Checked apply hardening must keep provider and LSP outputs review-only until host-owned confirmation, conflict, rollback and audit gates are complete."
    ]
  };
}

function summarize({
  bridgeTargets,
  checkedApplyCloseout,
  providerGovernanceCloseout,
  remoteSmokeGate,
  runtimeNormalization,
  targetFlow,
  writableApplyCloseout
}) {
  const directTargets = bridgeTargets.filter((target) => target.targetKind === "direct-next-gate");
  const secondaryTargets = bridgeTargets.filter((target) => target.targetKind === "secondary-forward-gate");

  return {
    runtimeNormalizationReady: runtimeNormalization.status === "ready-for-wp39-next-gate-bridge",
    runtimeNormalizationHardFailureCount: Number(runtimeNormalization.summary?.hardFailureCount ?? -1),
    normalizedHostCount: Number(runtimeNormalization.summary?.hostCount ?? 0),
    manualCaptureReadyCount: Number(runtimeNormalization.summary?.manualCaptureReadyCount ?? 0),
    routePreparationReadyCount: Number(runtimeNormalization.summary?.routePreparationReadyCount ?? 0),
    actualRuntimeCaptureExecutedCount: Number(runtimeNormalization.summary?.actualRuntimeCaptureExecutedCount ?? 0),
    captureCompletionClaimedCount: Number(runtimeNormalization.summary?.captureCompletionClaimedCount ?? 0),
    remoteSmokeGateReady: remoteSmokeGate.status === "ready-for-target-branch-pr-flow-contract",
    remoteSmokeGateHardFailureCount: Number(remoteSmokeGate.summary?.hardFailureCount ?? -1),
    remoteGatePlanCount: Number(remoteSmokeGate.summary?.gatePlanCount ?? 0),
    remoteManualApprovalGateCount: Number(remoteSmokeGate.summary?.manualApprovalGateCount ?? 0),
    realRemoteProviderInvocationExecuted: remoteSmokeGate.summary?.realRemoteProviderInvocationExecuted === true,
    externalNetworkCallExecuted: remoteSmokeGate.summary?.externalNetworkCallExecuted === true,
    providerSourcePolicyNone: remoteSmokeGate.summary?.firstSmokeSourcePolicy === "none",
    providerCredentialMaterialIncludedCount: countTrue([
      remoteSmokeGate.summary?.credentialMaterialIncludedInEvidence,
      remoteSmokeGate.summary?.credentialMaterialIncludedInRequest
    ]),
    targetFlowReady: targetFlow.status === "ready-for-devtools-visual-studio-confirmation-parity",
    targetFlowHardFailureCount: Number(targetFlow.summary?.hardFailureCount ?? -1),
    targetFlowStateCount: Number(targetFlow.summary?.flowStateCount ?? 0),
    targetOwnerActionRequiredForWrite: targetFlow.summary?.targetOwnerActionRequiredForWrite === true,
    hiaOwnedTargetRepositoryMutationAllowed: targetFlow.summary?.hiaOwnedTargetRepositoryMutationAllowed === true,
    actualTargetBranchCreated: targetFlow.summary?.actualTargetBranchCreated === true,
    actualPullRequestCreated: targetFlow.summary?.actualPullRequestCreated === true,
    actualTargetSandboxCreated: targetFlow.summary?.actualTargetSandboxCreated === true,
    checkedApplyCloseoutReady: checkedApplyCloseout.status === "ready-for-next-cycle-host-apply-and-provider-remote-planning",
    checkedApplyCloseoutHardFailureCount: Number(checkedApplyCloseout.summary?.hardFailureCount ?? -1),
    providerGovernanceCloseoutReady: providerGovernanceCloseout.status === "ready-for-wp37-checked-apply-continuation",
    providerGovernanceHardFailureCount: Number(providerGovernanceCloseout.summary?.hardFailureCount ?? -1),
    writableApplyCloseoutReady: writableApplyCloseout.status === "ready-for-next-cycle-planning",
    writableApplyCloseoutHardFailureCount: Number(writableApplyCloseout.summary?.hardFailureCount ?? -1),
    bridgeTargetCount: bridgeTargets.length,
    directBridgeTargetCount: directTargets.length,
    secondaryBridgeTargetCount: secondaryTargets.length,
    readyBridgeTargetCount: bridgeTargets.filter((target) => target.status === "ready-input").length,
    bridgeTargetsRequiringRuntimeCaptureCount: bridgeTargets.filter((target) => target.requiresActualRuntimeCaptureBeforeStart === true).length,
    bridgeTargetsRequiringNormalizedStateCount: bridgeTargets.filter((target) => target.consumesNormalizedRuntimeState === true).length,
    w40Ready: bridgeTargets.some((target) => target.targetPhase === "W-P40" && target.status === "ready-input"),
    w41Ready: bridgeTargets.some((target) => target.targetPhase === "W-P41" && target.status === "ready-input"),
    w42Ready: bridgeTargets.some((target) => target.targetPhase === "W-P42" && target.status === "ready-input"),
    w43Ready: bridgeTargets.some((target) => target.targetPhase === "W-P43" && target.status === "ready-input"),
    checkedApplyAvailableCount: countBridgeWriteAuthority(bridgeTargets, "checkedApplyAvailable"),
    workspaceWriteAllowedCount: countBridgeWriteAuthority(bridgeTargets, "workspaceWriteAllowed"),
    targetRepositoryMutationAllowedCount: countBridgeWriteAuthority(bridgeTargets, "targetRepositoryMutationAllowed"),
    providerOwnedApplyAllowedCount: countBridgeWriteAuthority(bridgeTargets, "providerOwnedApplyAllowed"),
    lspServerOwnedApplyAllowedCount: countBridgeWriteAuthority(bridgeTargets, "lspServerOwnedApplyAllowed"),
    targetRepositoryMutationCount: sum([
      remoteSmokeGate.summary?.targetRepositoryMutationCount,
      targetFlow.summary?.targetRepositoryMutationCount,
      writableApplyCloseout.summary?.targetRepositoryMutationCount
    ]),
    targetRepositoryWriteAttemptedCount: sum([
      remoteSmokeGate.summary?.targetRepositoryWriteAttemptedCount,
      targetFlow.summary?.targetRepositoryWriteAttemptedCount,
      writableApplyCloseout.summary?.targetRepositoryWriteAttemptedCount
    ]),
    directApplyAllowedCount: sum([
      remoteSmokeGate.summary?.directApplyAllowedCount,
      targetFlow.summary?.directApplyAllowedCount,
      writableApplyCloseout.summary?.directApplyAllowedCount
    ]),
    directEditObjectCount: countDirectEditObjects(bridgeTargets)
      + Number(remoteSmokeGate.summary?.directEditObjectCount ?? 0)
      + Number(targetFlow.summary?.directEditObjectCount ?? 0)
      + Number(writableApplyCloseout.summary?.directEditObjectCount ?? 0),
    sourcesContentPolicyNoneCount: countPolicyNone([
      runtimeNormalization.summary?.sourcesContentPolicyNoneCount === 3 ? "none" : "mixed",
      remoteSmokeGate.summary?.sourcesContentPolicy,
      targetFlow.summary?.sourcesContentPolicy,
      writableApplyCloseout.summary?.sourcesContentPolicy
    ]),
    sourceBodyIncludedInEvidenceCount: countTrue([
      runtimeNormalization.summary?.sourceBodyIncludedInEvidenceCount > 0,
      remoteSmokeGate.summary?.sourceBodyIncludedInEvidence,
      targetFlow.summary?.sourceBodyIncludedInEvidence,
      writableApplyCloseout.summary?.sourceBodyIncludedInEvidence
    ]),
    credentialMaterialMarkerCount: sum([
      remoteSmokeGate.summary?.credentialMaterialMarkerCount,
      targetFlow.summary?.credentialMaterialMarkerCount,
      writableApplyCloseout.summary?.credentialMaterialMarkerCount
    ]),
    pathExposureCount: countPathExposureValues(bridgeTargets)
      + Number(runtimeNormalization.summary?.pathExposureCount ?? 0)
      + Number(remoteSmokeGate.summary?.pathExposureCount ?? 0)
      + Number(targetFlow.summary?.pathExposureCount ?? 0)
      + Number(writableApplyCloseout.summary?.pathExposureCount ?? 0)
  };
}

function pickHostState(host) {
  return {
    host: host.host,
    hostKind: host.hostKind,
    normalizedRuntimeState: host.normalizedRuntimeState,
    actualRuntimeCaptureExecuted: host.actualRuntimeCaptureExecuted,
    captureCompletionClaimed: host.captureCompletionClaimed
  };
}

function noWriteAuthority() {
  return {
    checkedApplyAvailable: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false
  };
}

function countBridgeWriteAuthority(bridgeTargets, field) {
  return bridgeTargets.filter((target) => target.writeAuthority?.[field] === true).length;
}

function countPolicyNone(values) {
  return values.filter((value) => value === "none").length;
}

function countTrue(values) {
  return values.filter((value) => value === true).length;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
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
}

function renderBridgeMatrixMarkdown(bridgeTargets, summary) {
  const lines = [
    "# W-P39 Next Gate Bridge Matrix",
    "",
    `Bridge targets: ${summary.bridgeTargetCount}`,
    `Direct targets: ${summary.directBridgeTargetCount}`,
    `Secondary targets: ${summary.secondaryBridgeTargetCount}`,
    `Actual runtime capture executed: ${summary.actualRuntimeCaptureExecutedCount}`,
    "",
    "| Phase | Target | Kind | Status | Requires Runtime Capture | Write Authority |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const target of bridgeTargets) {
    const writeDisabled = Object.values(target.writeAuthority).every((value) => value === false);
    lines.push(`| \`${target.targetPhase}\` | ${target.targetName} | ${target.targetKind} | \`${target.status}\` | ${target.requiresActualRuntimeCaptureBeforeStart} | ${writeDisabled ? "disabled" : "enabled"} |`);
  }

  lines.push("");
  lines.push("This bridge prepares downstream inputs only. It does not run providers, launch hosts, create target branches, open pull requests or apply edits.");
  return `${lines.join("\n")}\n`;
}

function renderDownstreamContractMarkdown(contract) {
  const lines = [
    "# W-P39 Downstream Gate Consumption Contract",
    "",
    `Contract: \`${contract.contract}@${contract.contractVersion}\``,
    "",
    "## Required Fields",
    ""
  ];

  for (const field of contract.requiredFields) {
    lines.push(`- \`${field}\``);
  }

  lines.push("");
  lines.push("## Target Phases");
  lines.push("");

  for (const phase of contract.requiredTargetPhases) {
    lines.push(`- \`${phase}\``);
  }

  lines.push("");
  lines.push("## Rules");
  lines.push("");

  for (const rule of contract.rules) {
    lines.push(`- ${rule}`);
  }

  return `${lines.join("\n")}\n`;
}
