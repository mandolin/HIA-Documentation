import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp48-c-hia-p2-closeout-candidate");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutCandidatePath = path.join(outputRoot, "c-hia-p2-closeout-candidate.md");
const claimBoundaryPath = path.join(outputRoot, "completed-first-round-claim-boundary.md");
const deferredGatePath = path.join(outputRoot, "open-deferred-gates-for-next-cycle.md");
const nextInputsPath = path.join(outputRoot, "wp48-next-stage-inputs.md");

const inputEvidencePaths = {
  closeoutIntake: path.join(rootDir, "dist", "wp48-cycle-closeout-intake", "evidence.json"),
  classificationLedger: path.join(rootDir, "dist", "wp48-evidence-classification-deferred-gate-ledger", "evidence.json"),
  productizationBoundary: path.join(rootDir, "dist", "wp48-productization-readiness-boundary-review", "evidence.json"),
  targetAdoptionBoundary: path.join(rootDir, "dist", "wp48-target-project-adoption-boundary-refresh", "evidence.json")
};

await main();

/**
 * 生成 W-P48.5 C-HIA-P2 closeout candidate。
 * Generate the W-P48.5 C-HIA-P2 closeout candidate.
 *
 * 中文：本脚本汇总 W-P48.1-W-P48.4 的账本，形成“可审查的周期组
 * closeout candidate”。它只允许声明 W-P44-W-P47 已完成第一轮，不允许把
 * observation-only、blocked-before-network、metadata-only 或 pilot-preparation-only
 * 升级为真实执行成功。
 *
 * English: This script summarizes W-P48.1-W-P48.4 ledgers into a reviewable
 * cycle-group closeout candidate. It may claim first-round completion for
 * W-P44-W-P47, but must not upgrade observation-only, blocked-before-network,
 * metadata-only or pilot-preparation-only records into real execution success.
 *
 * @returns {Promise<void>} Writes public-safe W-P48.5 evidence and reports.
 */
async function main() {
  const inputs = {
    closeoutIntake: await readJson(inputEvidencePaths.closeoutIntake),
    classificationLedger: await readJson(inputEvidencePaths.classificationLedger),
    productizationBoundary: await readJson(inputEvidencePaths.productizationBoundary),
    targetAdoptionBoundary: await readJson(inputEvidencePaths.targetAdoptionBoundary)
  };
  const candidate = createCloseoutCandidate(inputs);
  const claimBoundary = createClaimBoundary(inputs);
  const deferredGates = createDeferredGates(inputs);
  const nextStageInputs = createNextStageInputs(candidate, deferredGates);
  const summary = summarize({ candidate, claimBoundary, deferredGates, inputs, nextStageInputs });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P48.5 closeout candidate has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp48-c-hia-p2-closeout-candidate",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp48-c-hia-p3-input-prioritization",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P48.5",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputEvidencePaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    executionPolicy: {
      policy: "closeout-candidate-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      mayClaimFinalCycleGroupCloseout: false,
      sourcesContentPolicy: "none"
    },
    closeoutCandidate: candidate,
    claimBoundary,
    deferredGates,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      claimBoundary: normalizePath(claimBoundaryPath),
      closeoutCandidate: normalizePath(closeoutCandidatePath),
      deferredGates: normalizePath(deferredGatePath),
      nextStageInputs: normalizePath(nextInputsPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P48.5 C-HIA-P2 closeout candidate evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutCandidatePath, renderCloseoutCandidate(evidence), "utf8");
  await writeFile(claimBoundaryPath, renderClaimBoundary(evidence), "utf8");
  await writeFile(deferredGatePath, renderDeferredGates(evidence), "utf8");
  await writeFile(nextInputsPath, renderNextStageInputs(evidence), "utf8");

  console.log(`W-P48 C-HIA-P2 closeout candidate evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P48 C-HIA-P2 closeout candidate prepared at ${normalizePath(closeoutCandidatePath)}`);
  console.log(`W-P48 open deferred gates prepared at ${normalizePath(deferredGatePath)}`);
}

/**
 * 创建周期组 closeout candidate。
 * Create the cycle-group closeout candidate.
 *
 * @param {Record<string, any>} inputs W-P48.1-W-P48.4 evidence set.
 * @returns {Record<string, unknown>} Closeout candidate model.
 */
function createCloseoutCandidate(inputs) {
  const phases = inputs.classificationLedger.classificationLedger.items.map((item) => ({
    phase: item.phase,
    topic: item.topic,
    closeoutClass: item.closeoutClass,
    classificationKind: item.classification.classificationKind,
    mayClaimCompletedFirstRound: item.closeoutMayClaimCompletedFirstRound === true,
    mayClaimReleaseGradeRuntimeCapture: false,
    mayClaimProviderSuccess: false,
    mayClaimTargetOwnerExecution: false,
    mayClaimCheckedApplyWrite: false,
    evidenceStatement: item.evidenceStatement,
    forbiddenReclassification: item.forbiddenReclassification
  }));

  return {
    contract: "hia-c-hia-p2-closeout-candidate",
    contractVersion: "0.1.0-draft",
    candidateStatus: "ready-for-review-before-final-closeout",
    cycleGroupId: "C-HIA-P2",
    candidateScope: "W-P44-W-P48 first-round closeout candidate",
    completedFirstRoundPhases: phases,
    limitedProductizationSurfaces: inputs.productizationBoundary.readinessMatrix.surfaces.map((item) => ({
      surfaceId: item.id,
      sourcePhase: item.sourcePhase,
      productizationMode: item.productizationMode,
      canProductizeNow: item.canProductizeNow === true,
      grantsExecutionAuthority: false,
      grantsWriteAuthority: false,
      grantsTargetMutationAuthority: false,
      grantsProviderNetworkAuthority: false
    })),
    targetAdoptionModel: {
      model: inputs.targetAdoptionBoundary.adoptionBoundary.notificationModel.model,
      centralNotificationPullReady: inputs.targetAdoptionBoundary.summary.centralNotificationPullReady === true,
      targetOwnerActionRequiredSurfaceCount: number(inputs.targetAdoptionBoundary.summary.targetOwnerActionRequiredSurfaceCount),
      hiaMayPushToTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayOpenTargetBranchOrPr: false
    },
    finalCloseoutMayBeClaimed: false,
    finalCloseoutReason: "W-P48.5 is a reviewable candidate. W-P48.7 must still close W-P48 and carry prioritized C-HIA-P3 inputs."
  };
}

function createClaimBoundary(inputs) {
  return {
    contract: "hia-c-hia-p2-completed-first-round-claim-boundary",
    contractVersion: "0.1.0-draft",
    boundaryStatus: "ready-for-closeout-candidate-review",
    allowedClaims: [
      "W-P44 host runtime observation completed first round",
      "W-P45 controlled provider execution slice blocked-before-network completed first round",
      "W-P46 target-owner evidence ingestion metadata-only completed first round",
      "W-P47 checked apply write pilot preparation completed first round",
      "W-P48 closeout candidate reached after W-P48.1-W-P48.4 ledgers"
    ],
    disallowedClaims: [
      "release-grade runtime capture archive completed",
      "real provider/network success completed",
      "target-owner command or adoption trial executed by HIA",
      "target project branch/PR/sandbox created by HIA",
      "checked apply write enabled or triggered",
      "host editor API applied edits",
      "source bodies, request/response bodies, secrets, digests or sourcesContent retained"
    ],
    sourcePhaseCount: inputs.closeoutIntake.phaseLedger.length,
    claimablePhaseCount: inputs.classificationLedger.classificationLedger.items.filter((item) => item.closeoutMayClaimCompletedFirstRound === true).length,
    nonClaimableExecutionSuccessKinds: [
      "release-grade-runtime-capture",
      "provider-network-success",
      "target-owner-execution",
      "checked-apply-write"
    ]
  };
}

function createDeferredGates(inputs) {
  const groupItems = inputs.classificationLedger.deferredGateLedger.groupItems.map((item) => ({
    id: item.id,
    sourcePhase: item.sourcePhase,
    gateClass: item.gateClass,
    declaredCount: number(item.declaredCount),
    owner: item.owner,
    status: item.status,
    mayBeClosedInWp48: false,
    requiresLaterExplicitAuthorization: true,
    reason: item.reason
  }));
  const explicitItems = inputs.classificationLedger.deferredGateLedger.explicitItems.map((item) => ({
    id: item.id,
    sourcePhase: item.sourcePhase,
    owner: item.owner,
    status: item.status,
    mayBeClosedInWp48: false,
    requiresLaterExplicitAuthorization: true,
    mayBeCompletedByHiaAutomation: false,
    grantsCheckedApplyWriteAuthorityNow: false,
    grantsTargetMutationAuthorityNow: false,
    reason: item.reason
  }));

  return {
    contract: "hia-c-hia-p2-open-deferred-gates-for-next-cycle",
    contractVersion: "0.1.0-draft",
    ledgerStatus: "open-deferred-gates-carried-forward",
    groupItems,
    explicitItems,
    closedInWp48Count: 0,
    nextCycleRequiresExplicitAuthorization: true
  };
}

function createNextStageInputs(candidate, deferredGates) {
  return {
    contract: "hia-wp48-next-stage-inputs",
    contractVersion: "0.1.0-draft",
    nextStage: "W-P48.6 C-HIA-P3 Input Prioritization",
    items: [
      {
        id: "c-hia-p3-input-prioritization",
        status: "ready-for-wp48-6",
        description: "Rank self-documentation quality, generated doc binding, IDE/DevTools/VS host work, real provider gate, target-owner adoption and checked apply write pilot inputs."
      },
      {
        id: "closeout-candidate-review",
        status: "ready-for-wp48-6",
        description: `Carry ${candidate.completedFirstRoundPhases.length} completed-first-round claims and ${deferredGates.groupItems.length} open deferred gate groups into W-P48.6.`
      },
      {
        id: "final-closeout-not-yet-claimed",
        status: "ready-for-wp48-6",
        description: "Keep final C-HIA-P2 closeout unavailable until W-P48.7 emits final closeout and next-cycle inputs."
      }
    ],
    readyForNextStage: true
  };
}

function summarize({ candidate, claimBoundary, deferredGates, inputs, nextStageInputs }) {
  const serialized = JSON.stringify({ candidate, claimBoundary, deferredGates, nextStageInputs });
  return {
    phase: "W-P48.5",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount: Object.values(inputs).filter(isReadyEvidence).length,
    inputHardFailureCount: sum(Object.values(inputs).map((item) => item.summary?.hardFailureCount)),
    completedFirstRoundClaimCount: claimBoundary.claimablePhaseCount,
    sourcePhaseCount: claimBoundary.sourcePhaseCount,
    limitedSurfaceCount: candidate.limitedProductizationSurfaces.length,
    productizableLimitedSurfaceCount: candidate.limitedProductizationSurfaces.filter((item) => item.canProductizeNow === true).length,
    targetOwnerActionRequiredSurfaceCount: candidate.targetAdoptionModel.targetOwnerActionRequiredSurfaceCount,
    openDeferredGateGroupCount: deferredGates.groupItems.filter((item) => item.status === "open-deferred").length,
    openExplicitDeferredGateCount: deferredGates.explicitItems.filter((item) => item.status === "open-deferred").length,
    closedDeferredGateCount: deferredGates.closedInWp48Count,
    disallowedClaimCount: claimBoundary.disallowedClaims.length,
    finalCloseoutMayBeClaimed: candidate.finalCloseoutMayBeClaimed,
    closeoutCandidateReady: nextStageInputs.readyForNextStage === true,
    checkedApplyWriteEnabledCount: sum(Object.values(inputs).map((item) => item.summary?.checkedApplyWriteEnabledCount)),
    hostEditorApiCallCount: sum(Object.values(inputs).map((item) => item.summary?.hostEditorApiCallCount)),
    checkedApplyTriggeredCount: sum(Object.values(inputs).map((item) => item.summary?.checkedApplyTriggeredCount)),
    workspaceWriteAllowedCount: sum(Object.values(inputs).map((item) => item.summary?.workspaceWriteAllowedCount)),
    targetRepositoryMutationCount: sum(Object.values(inputs).map((item) => item.summary?.targetRepositoryMutationCount)),
    targetCommandExecutedByHiaCount: sum(Object.values(inputs).map((item) => item.summary?.targetCommandExecutedByHiaCount)),
    providerNetworkExecutedCount: sum(Object.values(inputs).map((item) => item.summary?.providerNetworkExecutedCount)),
    externalNetworkCallExecutedCount: sum(Object.values(inputs).map((item) => item.summary?.externalNetworkCallExecutedCount)),
    hiaTargetRepositoryMutationGrantCount: sum(Object.values(inputs).map((item) => item.summary?.hiaTargetRepositoryMutationGrantCount)),
    hiaTargetCommandGrantCount: sum(Object.values(inputs).map((item) => item.summary?.hiaTargetCommandGrantCount)),
    hiaTargetBranchOrPrGrantCount: sum(Object.values(inputs).map((item) => item.summary?.hiaTargetBranchOrPrGrantCount)),
    hiaCheckedApplyWriteGrantCount: sum(Object.values(inputs).map((item) => item.summary?.hiaCheckedApplyWriteGrantCount)),
    hiaProviderNetworkGrantCount: sum(Object.values(inputs).map((item) => item.summary?.hiaProviderNetworkGrantCount)),
    hiaSourceBodyCollectionGrantCount: sum(Object.values(inputs).map((item) => item.summary?.hiaSourceBodyCollectionGrantCount)),
    hiaOwnerEvidenceFabricationGrantCount: sum(Object.values(inputs).map((item) => item.summary?.hiaOwnerEvidenceFabricationGrantCount)),
    sourceBodyIncludedCount: sum(Object.values(inputs).map((item) => item.summary?.sourceBodyIncludedCount)),
    sourceTextIncludedCount: sum(Object.values(inputs).map((item) => item.summary?.sourceTextIncludedCount)),
    requestBodyIncludedCount: sum(Object.values(inputs).map((item) => item.summary?.requestBodyIncludedCount)),
    responseBodyIncludedCount: sum(Object.values(inputs).map((item) => item.summary?.responseBodyIncludedCount)),
    secretValueIncludedCount: sum(Object.values(inputs).map((item) => item.summary?.secretValueIncludedCount)),
    digestValueIncludedCount: sum(Object.values(inputs).map((item) => item.summary?.digestValueIncludedCount)),
    localAbsolutePathDetectedCount: sum([
      ...Object.values(inputs).map((item) => item.summary?.localAbsolutePathDetectedCount),
      countPathExposure(serialized)
    ]),
    credentialMaterialMarkerCount: sum([
      ...Object.values(inputs).map((item) => item.summary?.credentialMaterialMarkerCount),
      countCredentialMarkers(serialized)
    ]),
    sourcesContentMarkerCount: sum([
      ...Object.values(inputs).map((item) => item.summary?.sourcesContentMarkerCount),
      /"sourcesContent"\s*:/iu.test(serialized) ? 1 : 0
    ]),
    sourcesContentPolicy: "none",
    nextStage: nextStageInputs.nextStage
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP48_5_INPUTS_READY", summary.inputEvidenceCount === 4
      && summary.readyInputEvidenceCount === 4
      && summary.inputHardFailureCount === 0),
    check("HIA_WP48_5_CLOSEOUT_CANDIDATE_READY", summary.closeoutCandidateReady === true
      && summary.completedFirstRoundClaimCount === 4
      && summary.sourcePhaseCount === 4
      && summary.limitedSurfaceCount === 4
      && summary.productizableLimitedSurfaceCount === 4),
    check("HIA_WP48_5_DEFERRED_GATES_STAY_OPEN", summary.openDeferredGateGroupCount === 4
      && summary.openExplicitDeferredGateCount >= 14
      && summary.closedDeferredGateCount === 0
      && summary.finalCloseoutMayBeClaimed === false
      && summary.disallowedClaimCount >= 7),
    check("HIA_WP48_5_NO_EXECUTION_OR_WRITE", summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0),
    check("HIA_WP48_5_NO_AUTHORITY_GRANTED", summary.hiaTargetRepositoryMutationGrantCount === 0
      && summary.hiaTargetCommandGrantCount === 0
      && summary.hiaTargetBranchOrPrGrantCount === 0
      && summary.hiaCheckedApplyWriteGrantCount === 0
      && summary.hiaProviderNetworkGrantCount === 0
      && summary.hiaSourceBodyCollectionGrantCount === 0
      && summary.hiaOwnerEvidenceFabricationGrantCount === 0),
    check("HIA_WP48_5_PRIVACY_CLEAN", summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0
      && summary.sourcesContentPolicy === "none"),
    check("HIA_WP48_5_NEXT_STAGE_READY", summary.nextStage === "W-P48.6 C-HIA-P3 Input Prioritization")
  ];
}

function renderCloseoutCandidate(evidence) {
  const phaseRows = evidence.closeoutCandidate.completedFirstRoundPhases
    .map((item) => `| ${item.phase} | ${item.classificationKind} | ${yesNo(item.mayClaimCompletedFirstRound)} | ${yesNo(item.mayClaimReleaseGradeRuntimeCapture)} | ${yesNo(item.mayClaimProviderSuccess)} | ${yesNo(item.mayClaimTargetOwnerExecution)} | ${yesNo(item.mayClaimCheckedApplyWrite)} |`)
    .join("\n");
  const surfaceRows = evidence.closeoutCandidate.limitedProductizationSurfaces
    .map((item) => `| ${item.surfaceId} | ${item.sourcePhase} | ${item.productizationMode} | ${yesNo(item.canProductizeNow)} |`)
    .join("\n");
  return `# C-HIA-P2 Closeout Candidate

## 中文摘要

W-P48.5 已形成 C-HIA-P2 closeout candidate。当前可以声明 W-P44-W-P47 均完成第一轮，并且 W-P48.1-W-P48.4 已把 evidence registry、classification ledger、productization boundary 与 target adoption boundary 串好。

这不是最终 closeout：release-grade runtime capture、真实 provider/network success、真实 target-owner execution 与真实 checked apply write 仍保持 open-deferred。

## Phase Claims

| Phase | Classification | Completed first round | Release-grade runtime | Provider success | Target-owner execution | Checked apply write |
| --- | --- | --- | --- | --- | --- | --- |
${phaseRows}

## Limited Surfaces

| Surface | Source phase | Mode | Can productize now |
| --- | --- | --- | --- |
${surfaceRows}
`;
}

function renderClaimBoundary(evidence) {
  const allowed = evidence.claimBoundary.allowedClaims.map((item) => `- ${item}`).join("\n");
  const disallowed = evidence.claimBoundary.disallowedClaims.map((item) => `- ${item}`).join("\n");
  return `# Completed First-Round Claim Boundary

## 中文摘要

本边界明确 W-P48.5 允许和禁止声明的内容。允许声明的是“第一轮完成”和“候选收口准备好”；禁止声明的是任何尚未发生的真实执行。

## Allowed Claims

${allowed}

## Disallowed Claims

${disallowed}
`;
}

function renderDeferredGates(evidence) {
  const groupRows = evidence.deferredGates.groupItems
    .map((item) => `| ${item.id} | ${item.sourcePhase} | ${item.gateClass} | ${item.status} | ${yesNo(item.requiresLaterExplicitAuthorization)} |`)
    .join("\n");
  const explicitRows = evidence.deferredGates.explicitItems
    .map((item) => `| ${item.id} | ${item.sourcePhase} | ${item.owner} | ${item.status} | ${yesNo(item.mayBeCompletedByHiaAutomation)} |`)
    .join("\n");
  return `# Open Deferred Gates For Next Cycle

## 中文摘要

W-P48.5 不关闭真实执行门禁。以下 gate 将进入 W-P48.6 做 C-HIA-P3 输入优先级排序，并由后续周期在更窄范围内重新授权。

## Gate Groups

| Gate | Source phase | Class | Status | Later authorization |
| --- | --- | --- | --- | --- |
${groupRows}

## Explicit Items

| Gate | Source phase | Owner | Status | HIA automation may complete |
| --- | --- | --- | --- | --- |
${explicitRows}
`;
}

function renderNextStageInputs(evidence) {
  const rows = evidence.nextStageInputs.items
    .map((item) => `| ${item.id} | ${item.status} | ${item.description} |`)
    .join("\n");
  return `# W-P48 Next Stage Inputs

## 中文摘要

下一步是 W-P48.6：把 C-HIA-P3 输入做优先级排序。重点包括本项目自文档化质量周期、生成式模板文档绑定、IDE/DevTools/VS 宿主推进、真实 provider gate、target-owner adoption 与 checked apply write pilot。

| Input | Status | Description |
| --- | --- | --- |
${rows}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isReadyEvidence(value) {
  return typeof value?.status === "string" && value.status.startsWith("ready-for-");
}

function check(id, condition) {
  return {
    id,
    status: condition ? "pass" : "fail"
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function number(value) {
  return Number.isFinite(value) ? value : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function countPathExposure(value) {
  return /[A-Z]:\\|[A-Z]:\/|\\\\|\/Users\//u.test(value) ? 1 : 0;
}

function countCredentialMarkers(value) {
  return /sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|npm_[A-Za-z0-9]|BEGIN [A-Z ]*PRIVATE KEY/u.test(value) ? 1 : 0;
}

function assertNoPrivateMarkers(value, label) {
  assert.equal(countPathExposure(value), 0, `${label} contains a local path marker.`);
  assert.equal(countCredentialMarkers(value), 0, `${label} contains a credential-like marker.`);
  assert.equal(/"sourcesContent"\s*:/iu.test(value), false, `${label} contains sourcesContent.`);
}
