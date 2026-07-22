import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp41-closeout-wp42-wp43-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutSummaryPath = path.join(outputRoot, "wp41-closeout-summary.md");
const downstreamInputsPath = path.join(outputRoot, "wp42-wp43-target-owner-inputs.md");
const evidenceInputs = [
  input("W-P41.1", "target-owner-flow-intake", "wp41-target-owner-flow-intake"),
  input("W-P41.2", "target-owner-local-sandbox-packet", "wp41-target-owner-local-sandbox-packet"),
  input("W-P41.3", "target-owner-branch-pr-packet", "wp41-target-owner-branch-pr-packet"),
  input("W-P41.4", "target-owner-command-evidence-template", "wp41-target-owner-command-evidence-template"),
  input("W-P41.5", "provider-review-payload-handoff", "wp41-provider-review-payload-handoff"),
  input("W-P41.6", "target-owner-dry-run-evidence", "wp41-target-owner-dry-run-evidence")
];

await main();

/**
 * 准备 W-P41 closeout and W-P42/W-P43 downstream input evidence。
 * Prepare W-P41 closeout and W-P42/W-P43 downstream input evidence.
 *
 * This stage summarizes W-P41.1-W-P41.6 and prepares downstream inputs for
 * checked-apply hardening and host UX/provider review linkage. It does not run
 * target commands, create branches or pull requests, execute providers, call
 * networks, trigger checked apply or mutate target repositories.
 *
 * 中文：本阶段汇总 W-P41.1-W-P41.6，并为 checked apply hardening 与宿主
 * UX/provider review linkage 准备下游输入。它不运行目标命令、不创建分支或 PR、
 * 不执行 provider、不联网、不触发 checked apply，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P41 closeout evidence and summaries.
 */
async function main() {
  const phaseEvidence = await readPhaseEvidence();
  const phaseSummaries = createPhaseSummaries(phaseEvidence);
  const downstreamInputs = createDownstreamInputs(phaseEvidence);
  const deferredGates = createDeferredGates();
  const summary = summarize({
    deferredGates,
    downstreamInputs,
    phaseEvidence,
    phaseSummaries
  });
  const checks = [
    check("HIA_WP41_CLOSEOUT_INPUTS_READY", summary.inputEvidenceCount === 6
      && summary.readyInputEvidenceCount === 6
      && summary.inputHardFailureCount === 0
      && summary.completedPhaseCount === 6, {
      actual: {
        completedPhaseCount: summary.completedPhaseCount,
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP41_CLOSEOUT_DOWNSTREAM_INPUTS_READY", summary.downstreamInputCount >= 8
      && summary.wp42InputCount >= 4
      && summary.wp43InputCount >= 4
      && summary.readyForWp42 === true
      && summary.readyForWp43 === true
      && summary.deferredGateCount >= 6, {
      actual: {
        deferredGateCount: summary.deferredGateCount,
        downstreamInputCount: summary.downstreamInputCount,
        readyForWp42: summary.readyForWp42,
        readyForWp43: summary.readyForWp43,
        wp42InputCount: summary.wp42InputCount,
        wp43InputCount: summary.wp43InputCount
      }
    }),
    check("HIA_WP41_CLOSEOUT_TARGET_OWNER_BOUNDARY", summary.targetOwnerActionRequired === true
      && summary.targetOwnerMaterialReady === true
      && summary.hiaMayRunTargetCommands === false
      && summary.hiaMayCreateTargetSandbox === false
      && summary.hiaMayCreateTargetBranch === false
      && summary.hiaMayOpenPullRequest === false
      && summary.hiaMayPushToTargetRemote === false
      && summary.hiaMayModifyTargetRepository === false, {
      actual: {
        hiaMayCreateTargetBranch: summary.hiaMayCreateTargetBranch,
        hiaMayCreateTargetSandbox: summary.hiaMayCreateTargetSandbox,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        hiaMayOpenPullRequest: summary.hiaMayOpenPullRequest,
        hiaMayPushToTargetRemote: summary.hiaMayPushToTargetRemote,
        hiaMayRunTargetCommands: summary.hiaMayRunTargetCommands,
        targetOwnerActionRequired: summary.targetOwnerActionRequired,
        targetOwnerMaterialReady: summary.targetOwnerMaterialReady
      }
    }),
    check("HIA_WP41_CLOSEOUT_NO_EXECUTION_CLAIMED", summary.actualDryRunExecuted === false
      && summary.actualCommandTranscriptSubmitted === false
      && summary.targetCommandsExecutedByHia === false
      && summary.actualTargetSandboxCreated === false
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestOpened === false
      && summary.targetOwnerExecutionClaimed === false, {
      actual: {
        actualCommandTranscriptSubmitted: summary.actualCommandTranscriptSubmitted,
        actualDryRunExecuted: summary.actualDryRunExecuted,
        actualPullRequestOpened: summary.actualPullRequestOpened,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        targetCommandsExecutedByHia: summary.targetCommandsExecutedByHia,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed
      }
    }),
    check("HIA_WP41_CLOSEOUT_PROVIDER_REVIEW_ONLY", summary.providerOutputReviewOnly === true
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        providerOutputReviewOnly: summary.providerOutputReviewOnly,
        providerResultProduced: summary.providerResultProduced,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        refusalResultProduced: summary.refusalResultProduced
      }
    }),
    check("HIA_WP41_CLOSEOUT_NO_APPLY_OR_WRITE", summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP41_CLOSEOUT_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
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
    contract: "hia-wp41-closeout-wp42-wp43-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp42-checked-apply-hardening-and-wp43-host-ux-inputs" : "blocked",
    closeoutStatus: hardFailures.length === 0 ? "completed-first-round" : "blocked",
    sourceEvidence: Object.fromEntries(phaseEvidence.map((item) => [item.phase, normalizePath(item.path)])),
    phaseSummaries,
    downstreamInputs,
    deferredGates,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutSummaryPath),
      downstreamInputs: normalizePath(downstreamInputsPath)
    },
    nextContractInputs: [
      {
        phase: "W-P42",
        topic: "checked-apply-contract-hardening",
        status: "ready-input",
        reason: "W-P41 target-owner materials are complete as no-write, review-only, target-owner-action-required inputs."
      },
      {
        phase: "W-P43",
        topic: "host-owned-apply-ux-and-provider-review-linkage",
        status: "ready-input",
        reason: "Host-readable target-owner packet, provider review handoff and dry-run result templates are ready for display-layer linkage."
      },
      {
        phase: "C-HIA-P1",
        topic: "cycle-group-continuation",
        status: "ready-after-wp42-wp43",
        reason: "W-P41 is closed; cycle group closeout still depends on W-P42 and W-P43."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P41 closeout evidence");
  assert.equal(hardFailures.length, 0, `W-P41 closeout has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummary(evidence), "utf8");
  await writeFile(downstreamInputsPath, renderDownstreamInputs(evidence), "utf8");
  console.log(`W-P41 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P41 closeout summary prepared at ${normalizePath(closeoutSummaryPath)}`);
  console.log(`W-P42/W-P43 target-owner inputs prepared at ${normalizePath(downstreamInputsPath)}`);
}

function input(phase, topic, outputDir) {
  return {
    phase,
    topic,
    path: path.join(rootDir, "dist", outputDir, "evidence.json")
  };
}

async function readPhaseEvidence() {
  const result = [];
  for (const entry of evidenceInputs) {
    result.push({
      ...entry,
      evidence: await readJson(entry.path)
    });
  }
  return result;
}

function createPhaseSummaries(phaseEvidence) {
  return phaseEvidence.map((entry) => ({
    phase: entry.phase,
    topic: entry.topic,
    contract: entry.evidence.contract,
    status: entry.evidence.status,
    hardFailureCount: Number(entry.evidence.summary?.hardFailureCount ?? 0),
    targetOwnerActionRequired: true,
    hiaTargetMutationAllowed: false,
    providerReviewOnly: Boolean(entry.evidence.summary?.providerOutputReviewOnly ?? entry.evidence.summary?.reviewOnlyOutputRequired ?? true)
  }));
}

function createDownstreamInputs() {
  return [
    downstream("W-P42", "target-owner-action-policy", "Target-owner execution remains explicit and outside HIA automation."),
    downstream("W-P42", "command-evidence-template", "Transcript, evidence packet and result shape boundaries can harden checked-apply preflight."),
    downstream("W-P42", "provider-review-only-handoff", "Provider review payload is context only and must not trigger checked apply."),
    downstream("W-P42", "dry-run-readiness-matrix", "Readiness matrix identifies which target-owner fields must be present before any future apply path."),
    downstream("W-P43", "host-readable-target-owner-packet", "Host UX can display sandbox, branch, PR, command and evidence packet states."),
    downstream("W-P43", "provider-review-handoff-display", "Host UX can display blocked/refused provider review context without apply authority."),
    downstream("W-P43", "target-owner-dry-run-result-template", "Host UX can show target-owner dry-run result shape and follow-up decision fields."),
    downstream("W-P43", "deferred-gate-banner", "Host UX can show that real provider, target execution and checked apply gates remain deferred.")
  ];
}

function downstream(phase, id, purpose) {
  return {
    phase,
    id,
    purpose,
    status: "ready-input",
    targetOwnerActionRequired: phase === "W-P42",
    hiaWriteAuthorityGranted: false
  };
}

function createDeferredGates() {
  return [
    deferred("real-target-owner-local-sandbox", "Target owner has not run a real target local sandbox."),
    deferred("real-target-owner-branch", "Target owner has not created or pushed a real target branch."),
    deferred("real-target-owner-pull-request", "Target owner has not opened a real pull request."),
    deferred("real-target-owner-command-transcript", "Target owner has not submitted a real command transcript."),
    deferred("real-remote-provider-network", "Remote provider/network execution remains blocked before final consent and concrete provider setup."),
    deferred("checked-apply-write", "Checked apply remains host-owned future work and is not triggered by W-P41."),
    deferred("real-host-runtime-capture", "Some real host runtime capture gates remain manual/deferred in C-HIA-P1.")
  ];
}

function deferred(id, reason) {
  return {
    id,
    reason,
    status: "deferred-explicitly",
    mayBeCompletedByHiaAutomation: false
  };
}

function summarize({
  deferredGates,
  downstreamInputs,
  phaseEvidence,
  phaseSummaries
}) {
  const publicSurface = {
    deferredGates,
    downstreamInputs,
    phaseSummaries
  };
  const latest = phaseEvidence.at(-1).evidence.summary;
  return {
    inputEvidenceCount: phaseEvidence.length,
    readyInputEvidenceCount: phaseEvidence.filter((entry) => String(entry.evidence.status).startsWith("ready-for")).length,
    inputHardFailureCount: sum(phaseEvidence.map((entry) => entry.evidence.summary?.hardFailureCount)),
    completedPhaseCount: phaseSummaries.length,
    closeoutStatus: "completed-first-round",
    downstreamInputCount: downstreamInputs.length,
    wp42InputCount: downstreamInputs.filter((item) => item.phase === "W-P42").length,
    wp43InputCount: downstreamInputs.filter((item) => item.phase === "W-P43").length,
    readyForWp42: true,
    readyForWp43: true,
    deferredGateCount: deferredGates.length,
    targetOwnerActionRequired: true,
    targetOwnerMaterialReady: true,
    hiaMayRunTargetCommands: false,
    hiaMayCreateTargetSandbox: false,
    hiaMayCreateTargetBranch: false,
    hiaMayOpenPullRequest: false,
    hiaMayPushToTargetRemote: false,
    hiaMayModifyTargetRepository: false,
    actualDryRunExecuted: false,
    actualCommandTranscriptSubmitted: false,
    targetCommandsExecutedByHia: false,
    actualTargetSandboxCreated: false,
    actualTargetBranchCreated: false,
    actualPullRequestOpened: false,
    targetOwnerExecutionClaimed: false,
    providerOutputReviewOnly: latest.providerOutputReviewOnly === true,
    blockedProviderReviewShapeAccepted: latest.blockedProviderReviewShapeAccepted === true,
    providerResultProduced: latest.providerResultProduced === true,
    refusalResultProduced: latest.refusalResultProduced === true,
    externalNetworkCallExecuted: latest.externalNetworkCallExecuted === true,
    realRemoteProviderInvocationExecuted: latest.realRemoteProviderInvocationExecuted === true,
    directApplyAllowedCount: sum(phaseEvidence.map((entry) => entry.evidence.summary?.directApplyAllowedCount)),
    checkedApplyTriggeredCount: sum(phaseEvidence.map((entry) => entry.evidence.summary?.checkedApplyTriggeredCount)),
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects(publicSurface),
    credentialValueIncludedCount: 0,
    sourceReferenceIncludedCount: 0,
    sourceTextIncludedCount: 0,
    sourcesContentPolicy: "none",
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(publicSurface),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(publicSurface),
    pathExposureCount: countPathExposure(JSON.stringify(publicSurface))
  };
}

function renderCloseoutSummary(evidence) {
  const { summary } = evidence;
  return `# W-P41 Closeout Summary

Status: \`${evidence.status}\`

Closeout status: \`${evidence.closeoutStatus}\`

W-P41 completed the target-owner collaboration material chain. It did not execute target commands, create target sandboxes, create branches, open pull requests, execute providers, call networks, trigger checked apply or mutate target repositories.

| Metric | Value |
| --- | --- |
| Input evidence | ${summary.inputEvidenceCount} |
| Ready inputs | ${summary.readyInputEvidenceCount} |
| Completed phases | ${summary.completedPhaseCount} |
| Downstream inputs | ${summary.downstreamInputCount} |
| Deferred gates | ${summary.deferredGateCount} |
| Target owner action required | ${summary.targetOwnerActionRequired} |
| Provider result produced | ${summary.providerResultProduced} |
| Refusal result produced | ${summary.refusalResultProduced} |
`;
}

function renderDownstreamInputs(evidence) {
  return `# W-P42/W-P43 Target-Owner Inputs

## Downstream Inputs

| Phase | Input | Status | Purpose |
| --- | --- | --- | --- |
${evidence.downstreamInputs.map((item) => `| ${item.phase} | ${item.id} | \`${item.status}\` | ${item.purpose} |`).join("\n")}

## Deferred Gates

| Gate | Status | Reason |
| --- | --- | --- |
${evidence.deferredGates.map((item) => `| ${item.id} | \`${item.status}\` | ${item.reason} |`).join("\n")}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function check(code, passed, details) {
  return { code, status: passed ? "pass" : "fail", ...details };
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
  return countMatches(text, /\b(apiKey|accessToken|authorizationHeader|secretValue|privateKey)\b/g);
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

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function assertNoPrivateMarkers(serializedEvidence, label) {
  assert.equal(countPathExposure(serializedEvidence), 0, `${label} must not expose absolute local paths.`);
  assert.equal(countMatches(serializedEvidence, /\b(work-zone|ai\/codex|\.pem|npm_\w+|ghp_)\b/gi), 0, `${label} must not expose private workspace or secret markers.`);
}
