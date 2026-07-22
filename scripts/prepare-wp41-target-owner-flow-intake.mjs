import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp41-target-owner-flow-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const intakePath = path.join(outputRoot, "target-owner-flow-intake.md");
const policyPath = path.join(outputRoot, "target-owner-action-policy.md");
const inputEvidencePaths = {
  wp38TargetBranchPrFlow: path.join(rootDir, "dist", "wp38-target-branch-pr-flow-contract", "evidence.json"),
  wp40ProviderReviewLinkage: path.join(rootDir, "dist", "wp40-provider-result-review-linkage", "evidence.json"),
  wp40Closeout: path.join(rootDir, "dist", "wp40-closeout-wp41-wp42-inputs", "evidence.json")
};

await main();

/**
 * 准备 W-P41.1 target-owner flow intake evidence。
 * Prepare W-P41.1 target-owner flow intake evidence.
 *
 * This intake turns the earlier target-owner collaboration contract and W-P40
 * review-only provider result linkage into a W-P41 execution baseline. It
 * intentionally creates no target branch, pull request, local sandbox or
 * repository write; those actions belong to the target owner.
 *
 * 中文：本入口阶段把前序 target-owner 协作合约和 W-P40 review-only provider
 * result linkage 收束为 W-P41 执行基线。它刻意不创建目标分支、PR、本地
 * sandbox 或仓库写入；这些动作只能由目标 owner 执行。
 *
 * @returns {Promise<void>} Writes public-safe W-P41.1 evidence and policy docs.
 */
async function main() {
  const inputs = await readInputs(inputEvidencePaths);
  const policy = createTargetOwnerActionPolicy(inputs);
  const candidatePackets = createCandidatePackets();
  const providerReviewHandoff = createProviderReviewHandoff(inputs.wp40ProviderReviewLinkage);
  const summary = summarize(inputs, policy, candidatePackets, providerReviewHandoff);
  const checks = [
    check("HIA_WP41_INTAKE_INPUTS_READY", summary.inputEvidenceCount === 3
      && summary.readyInputEvidenceCount === 3
      && summary.inputHardFailureCount === 0
      && summary.wp38TargetFlowReady === true
      && summary.wp40CloseoutReady === true
      && summary.wp40ProviderReviewReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount,
        wp38TargetFlowReady: summary.wp38TargetFlowReady,
        wp40CloseoutReady: summary.wp40CloseoutReady,
        wp40ProviderReviewReady: summary.wp40ProviderReviewReady
      }
    }),
    check("HIA_WP41_INTAKE_TARGET_OWNER_POLICY_READY", summary.targetOwnerActionRequired === true
      && summary.collaborationModeCount >= 4
      && summary.targetOwnerReadyInputCount >= 2
      && summary.centralNotifyPullModel === true
      && summary.targetOwnerMayRunCommands === true, {
      actual: {
        centralNotifyPullModel: summary.centralNotifyPullModel,
        collaborationModeCount: summary.collaborationModeCount,
        targetOwnerActionRequired: summary.targetOwnerActionRequired,
        targetOwnerMayRunCommands: summary.targetOwnerMayRunCommands,
        targetOwnerReadyInputCount: summary.targetOwnerReadyInputCount
      }
    }),
    check("HIA_WP41_INTAKE_HIA_NO_TARGET_AUTHORITY", summary.hiaMayModifyTargetRepository === false
      && summary.hiaMayCreateTargetBranch === false
      && summary.hiaMayOpenPullRequest === false
      && summary.hiaMayCreateTargetSandbox === false
      && summary.hiaMayPushToTargetRemote === false
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestCreated === false
      && summary.actualTargetSandboxCreated === false, {
      actual: {
        actualPullRequestCreated: summary.actualPullRequestCreated,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        hiaMayCreateTargetBranch: summary.hiaMayCreateTargetBranch,
        hiaMayCreateTargetSandbox: summary.hiaMayCreateTargetSandbox,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        hiaMayOpenPullRequest: summary.hiaMayOpenPullRequest,
        hiaMayPushToTargetRemote: summary.hiaMayPushToTargetRemote
      }
    }),
    check("HIA_WP41_INTAKE_REVIEW_ONLY_PROVIDER_INPUT", summary.providerOutputReviewOnly === true
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        providerOutputReviewOnly: summary.providerOutputReviewOnly,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced
      }
    }),
    check("HIA_WP41_INTAKE_NO_SIDE_EFFECTS", summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false, {
      actual: {
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP41_INTAKE_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp41-target-owner-flow-intake-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-owner-local-sandbox-packet" : "blocked",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputEvidencePaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    intakeStatus: "ready-for-target-owner-local-sandbox-packet",
    policy,
    candidatePackets,
    providerReviewHandoff,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      targetOwnerFlowIntake: normalizePath(intakePath),
      targetOwnerActionPolicy: normalizePath(policyPath)
    },
    nextContractInputs: [
      {
        phase: "W-P41.2",
        topic: "target-owner-local-sandbox-packet",
        status: "ready-input",
        targetOwnerActionRequired: true,
        reason: "W-P41.1 fixes the no-write policy, so W-P41.2 may prepare a local sandbox packet for target-owner execution."
      },
      {
        phase: "W-P41.3",
        topic: "target-owner-branch-pr-packet",
        status: "ready-after-wp41.2",
        targetOwnerActionRequired: true,
        reason: "Branch and pull-request instructions must remain target-owned and can build on the W-P41.2 command/evidence packet."
      },
      {
        phase: "W-P42",
        topic: "checked-apply-hardening",
        status: "forward-input",
        targetOwnerActionRequired: false,
        reason: "Blocked provider review output remains a concrete denial case for later checked apply hardening."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P41 target-owner flow intake evidence");
  assert.equal(hardFailures.length, 0, `W-P41 target-owner flow intake has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(intakePath, renderIntakeMarkdown(evidence), "utf8");
  await writeFile(policyPath, renderPolicyMarkdown(evidence), "utf8");
  console.log(`W-P41 target-owner flow intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P41 target-owner flow intake doc prepared at ${normalizePath(intakePath)}`);
  console.log(`W-P41 target-owner action policy doc prepared at ${normalizePath(policyPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, value]) => [key, await readJson(value)])
  );
  return Object.fromEntries(entries);
}

function createTargetOwnerActionPolicy(inputs) {
  const collaborationModes = inputs.wp38TargetBranchPrFlow.collaborationModes ?? [];
  const downstreamInputs = inputs.wp40Closeout.downstreamInputs?.inputs ?? [];
  return {
    contract: "hia-wp41-target-owner-action-policy",
    contractVersion: "0.1.0-draft",
    targetOwnerActionRequired: true,
    hiaRole: "prepare-review-only-candidate-packets-and-evidence",
    targetOwnerRole: "review-copy-run-branch-pr-or-report-evidence",
    centralNotifyPullModel: true,
    targetOwnerMayRunCommands: true,
    targetOwnerMayCreateLocalSandbox: true,
    targetOwnerMayCreateBranch: true,
    targetOwnerMayOpenPullRequest: true,
    hiaMayModifyTargetRepository: false,
    hiaMayCreateTargetBranch: false,
    hiaMayOpenPullRequest: false,
    hiaMayCreateTargetSandbox: false,
    hiaMayPushToTargetRemote: false,
    providerOutputPolicy: "review-only",
    checkedApplyPolicy: "not-triggered-by-provider-output",
    sourcesContentPolicy: "none",
    collaborationModeIds: collaborationModes.map((mode) => mode.id),
    wP41ReadyInputs: downstreamInputs
      .filter((item) => item.phaseId === "W-P41" && item.status === "ready-input")
      .map((item) => ({
        topic: item.topic,
        targetOwnerActionRequired: item.targetOwnerActionRequired === true,
        reviewOnlyBoundaryRequired: item.reviewOnlyBoundaryRequired === true
      }))
  };
}

function createCandidatePackets() {
  return [
    candidatePacket(
      "W-P41.2",
      "target-owner-local-sandbox-packet",
      "Prepare copy-only local sandbox instructions, command skeletons and evidence template for a target owner."
    ),
    candidatePacket(
      "W-P41.3",
      "target-owner-branch-pr-packet",
      "Prepare branch and pull-request checklist language that the target owner may execute after local review."
    ),
    candidatePacket(
      "W-P41.4",
      "target-owner-command-and-evidence-template",
      "Prepare target-owner command transcript and result evidence templates without running them in target repositories."
    ),
    candidatePacket(
      "W-P41.5",
      "provider-review-payload-handoff",
      "Hand off blocked/refused provider review payload shape as review-only material for target-owner trials."
    )
  ];
}

function candidatePacket(phase, topic, purpose) {
  return {
    phase,
    topic,
    purpose,
    status: "planned",
    targetOwnerActionRequired: true,
    hiaMayExecuteAgainstTarget: false,
    producesCandidateArtifactOnly: true
  };
}

function createProviderReviewHandoff(providerReviewEvidence) {
  return {
    contract: "hia-wp41-provider-review-handoff",
    contractVersion: "0.1.0-draft",
    sourceStatus: providerReviewEvidence.status,
    resultShape: {
      actualResultShapeCount: Number(providerReviewEvidence.summary?.actualResultShapeCount ?? 0),
      blockedResultShapeCount: Number(providerReviewEvidence.summary?.blockedResultShapeCount ?? 0),
      providerResultProduced: providerReviewEvidence.summary?.providerResultProduced === true,
      refusalResultProduced: providerReviewEvidence.summary?.refusalResultProduced === true,
      reviewOnlyOutputRequired: providerReviewEvidence.summary?.reviewOnlyOutputRequired === true,
      requiresHumanReview: true
    },
    hostProjectionReadyCount: Number(providerReviewEvidence.summary?.hostProjectionReadyCount ?? 0),
    directApplyAllowedCount: Number(providerReviewEvidence.summary?.directApplyAllowedCount ?? 0),
    checkedApplyTriggeredCount: Number(providerReviewEvidence.summary?.checkedApplyTriggeredCount ?? 0),
    workspaceWriteAllowedCount: Number(providerReviewEvidence.summary?.workspaceWriteAllowedCount ?? 0),
    targetRepositoryMutationCount: Number(providerReviewEvidence.summary?.targetRepositoryMutationCount ?? 0),
    directEditObjectCount: Number(providerReviewEvidence.summary?.directEditObjectCount ?? 0),
    externalNetworkCallExecuted: providerReviewEvidence.summary?.externalNetworkCallExecuted === true,
    realRemoteProviderInvocationExecuted: providerReviewEvidence.summary?.realRemoteProviderInvocationExecuted === true,
    sourcesContentPolicy: providerReviewEvidence.summary?.sourcesContentPolicy ?? "none"
  };
}

function summarize(inputs, policy, candidatePackets, providerReviewHandoff) {
  const evidenceRecords = Object.values(inputs);
  const readyInputEvidenceCount = evidenceRecords.filter((item) => isReadyInput(item.status)).length;
  const inputHardFailureCount = evidenceRecords.reduce(
    (count, item) => count + Number(item.summary?.hardFailureCount ?? 0),
    0
  );
  const wP41Inputs = policy.wP41ReadyInputs;
  const evidenceSurface = {
    policy,
    candidatePackets,
    providerReviewHandoff
  };
  return {
    inputEvidenceCount: evidenceRecords.length,
    readyInputEvidenceCount,
    inputHardFailureCount,
    wp38TargetFlowReady: inputs.wp38TargetBranchPrFlow.status === "ready-for-devtools-visual-studio-confirmation-parity",
    wp40ProviderReviewReady: inputs.wp40ProviderReviewLinkage.status === "ready-for-wp40-closeout-and-wp41-wp42-inputs",
    wp40CloseoutReady: inputs.wp40Closeout.status === "ready-for-wp41-target-owner-branch-pr-smoke",
    targetOwnerActionRequired: policy.targetOwnerActionRequired,
    centralNotifyPullModel: policy.centralNotifyPullModel,
    targetOwnerMayRunCommands: policy.targetOwnerMayRunCommands,
    targetOwnerReadyInputCount: wP41Inputs.filter((item) => item.targetOwnerActionRequired === true).length,
    collaborationModeCount: policy.collaborationModeIds.length,
    candidatePacketCount: candidatePackets.length,
    hiaMayModifyTargetRepository: policy.hiaMayModifyTargetRepository,
    hiaMayCreateTargetBranch: policy.hiaMayCreateTargetBranch,
    hiaMayOpenPullRequest: policy.hiaMayOpenPullRequest,
    hiaMayCreateTargetSandbox: policy.hiaMayCreateTargetSandbox,
    hiaMayPushToTargetRemote: policy.hiaMayPushToTargetRemote,
    actualTargetBranchCreated: false,
    actualPullRequestCreated: false,
    actualTargetSandboxCreated: false,
    providerOutputReviewOnly: providerReviewHandoff.resultShape.reviewOnlyOutputRequired,
    blockedProviderReviewShapeAccepted: providerReviewHandoff.resultShape.blockedResultShapeCount >= 1,
    providerResultProduced: providerReviewHandoff.resultShape.providerResultProduced,
    refusalResultProduced: providerReviewHandoff.resultShape.refusalResultProduced,
    directApplyAllowedCount: providerReviewHandoff.directApplyAllowedCount,
    checkedApplyTriggeredCount: providerReviewHandoff.checkedApplyTriggeredCount,
    workspaceWriteAllowedCount: providerReviewHandoff.workspaceWriteAllowedCount,
    targetRepositoryMutationCount: providerReviewHandoff.targetRepositoryMutationCount,
    directEditObjectCount: providerReviewHandoff.directEditObjectCount + countDirectEditObjects(evidenceSurface),
    externalNetworkCallExecuted: providerReviewHandoff.externalNetworkCallExecuted,
    realRemoteProviderInvocationExecuted: providerReviewHandoff.realRemoteProviderInvocationExecuted,
    credentialValueIncludedCount: Number(inputs.wp40Closeout.summary?.credentialValueIncludedCount ?? 0),
    sourceReferenceIncludedCount: Number(inputs.wp40Closeout.summary?.sourceReferenceIncludedCount ?? 0),
    sourceTextIncludedCount: Number(inputs.wp40Closeout.summary?.sourceTextIncludedCount ?? 0),
    sourcesContentPolicy: policy.sourcesContentPolicy,
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(evidenceSurface),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(evidenceSurface),
    pathExposureCount: countPathExposure(JSON.stringify(evidenceSurface))
  };
}

function isReadyInput(status) {
  return typeof status === "string" && (status.startsWith("ready-") || status === "prepared-real-gui-manual-confirmation-required");
}

function renderIntakeMarkdown(evidence) {
  return `# W-P41.1 Target-Owner Flow Intake

## Status

- Evidence status: \`${evidence.status}\`
- Intake status: \`${evidence.intakeStatus}\`
- Next phase: \`W-P41.2 target-owner-local-sandbox-packet\`

## Summary

| Field | Value |
| --- | --- |
| Input evidence | ${evidence.summary.readyInputEvidenceCount} / ${evidence.summary.inputEvidenceCount} ready |
| W-P41 ready inputs | ${evidence.summary.targetOwnerReadyInputCount} |
| Collaboration modes | ${evidence.summary.collaborationModeCount} |
| Candidate packets planned | ${evidence.summary.candidatePacketCount} |
| Provider review output | ${evidence.summary.providerOutputReviewOnly ? "review-only" : "blocked"} |
| HIA target mutation authority | ${evidence.summary.hiaMayModifyTargetRepository ? "allowed" : "denied"} |
| Actual target branch / PR / sandbox | ${String(evidence.summary.actualTargetBranchCreated)} / ${String(evidence.summary.actualPullRequestCreated)} / ${String(evidence.summary.actualTargetSandboxCreated)} |

## Candidate Packets

${evidence.candidatePackets.map((packet) => `- \`${packet.phase}\` ${packet.topic}: ${packet.purpose}`).join("\n")}

## Next

W-P41.2 may prepare a copy-only local sandbox packet. HIA still does not run commands inside target repositories.
`;
}

function renderPolicyMarkdown(evidence) {
  const policy = evidence.policy;
  return `# W-P41 Target-Owner Action Policy

## Roles

- HIA role: ${policy.hiaRole}
- Target owner role: ${policy.targetOwnerRole}
- Provider output policy: \`${policy.providerOutputPolicy}\`
- Checked apply policy: \`${policy.checkedApplyPolicy}\`

## Allowed For Target Owner

- Create a local sandbox: ${String(policy.targetOwnerMayCreateLocalSandbox)}
- Create a branch: ${String(policy.targetOwnerMayCreateBranch)}
- Open a pull request: ${String(policy.targetOwnerMayOpenPullRequest)}
- Run documented commands: ${String(policy.targetOwnerMayRunCommands)}

## Denied For HIA Automation

- Modify target repository: ${String(policy.hiaMayModifyTargetRepository)}
- Create target branch: ${String(policy.hiaMayCreateTargetBranch)}
- Open pull request: ${String(policy.hiaMayOpenPullRequest)}
- Create target sandbox: ${String(policy.hiaMayCreateTargetSandbox)}
- Push target remote: ${String(policy.hiaMayPushToTargetRemote)}

## Ready Inputs

${policy.wP41ReadyInputs.map((input) => `- \`${input.topic}\`: target-owner action ${input.targetOwnerActionRequired ? "required" : "not required"}, review-only boundary ${input.reviewOnlyBoundaryRequired ? "required" : "not required"}`).join("\n")}
`;
}

function check(code, passed, details) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function countDirectEditObjects(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(workspaceEdit|documentChanges|TextEdit|WorkspaceEdit|applyEdit)\b/g);
}

function countCredentialMaterialMarkers(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(apiKey|accessToken|authorizationHeader|credentialValue|secretValue|privateKey)\b/g);
}

function countForbiddenDocumentTextMarkers(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(sourcesContent|documentText|sourceExcerptText|fullSourceText)\b/g);
}

function countPathExposure(text) {
  const withoutUrls = text.replace(/https?:\/\//gi, "");
  return countMatches(withoutUrls, /(?:^|[^A-Za-z])(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|var|tmp|mnt)\/)/g);
}

function countMatches(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function assertNoPrivateMarkers(serializedEvidence, label) {
  assert.equal(countPathExposure(serializedEvidence), 0, `${label} must not expose absolute local paths.`);
  assert.equal(countMatches(serializedEvidence, /\b(work-zone|ai\/codex|\.pem|npm_\w+|ghp_)\b/gi), 0, `${label} must not expose private workspace or secret markers.`);
}
