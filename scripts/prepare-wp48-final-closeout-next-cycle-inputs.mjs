import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp48-final-closeout-next-cycle-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const finalCloseoutPath = path.join(outputRoot, "c-hia-p2-final-closeout.md");
const carriedDeferredGatesPath = path.join(outputRoot, "open-deferred-gates-carried-forward.md");
const nextCycleInputsPath = path.join(outputRoot, "next-cycle-inputs-for-user-confirmation.md");
const closeoutSummaryPath = path.join(outputRoot, "wp48-closeout-summary.md");

const closeoutCandidatePath = path.join(rootDir, "dist", "wp48-c-hia-p2-closeout-candidate", "evidence.json");
const inputPrioritizationPath = path.join(rootDir, "dist", "wp48-c-hia-p3-input-prioritization", "evidence.json");

await main();

/**
 * 生成 W-P48.7 final closeout 与下一周期输入 evidence。
 * Generate W-P48.7 final closeout and next-cycle input evidence.
 *
 * 中文：本脚本收口 W-P48 和 C-HIA-P2 的第一轮成果。它可以声明
 * “C-HIA-P2 first-round closeout complete”，但不能声明真实 provider/network、
 * target-owner execution、checked apply write 或 release-grade runtime archive 已完成。
 * 下一周期输入只作为用户确认前的候选，不自动启动新的 W-P 组。
 *
 * English: This script closes W-P48 and the first-round C-HIA-P2 cycle-group
 * work. It may claim that the C-HIA-P2 first-round closeout is complete, but
 * must not claim real provider/network execution, target-owner execution,
 * checked apply writes, or release-grade runtime archives. Next-cycle inputs
 * are candidates for user confirmation, not an automatic new W-P cycle start.
 *
 * @returns {Promise<void>} Writes public-safe W-P48.7 evidence and reports.
 */
async function main() {
  const closeoutCandidate = await readJson(closeoutCandidatePath);
  const inputPrioritization = await readJson(inputPrioritizationPath);
  const finalCloseout = createFinalCloseout(closeoutCandidate, inputPrioritization);
  const carriedDeferredGates = createCarriedDeferredGates(closeoutCandidate);
  const nextCycleInputs = createNextCycleInputs(inputPrioritization);
  const summary = summarize({ carriedDeferredGates, closeoutCandidate, finalCloseout, inputPrioritization, nextCycleInputs });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P48.7 final closeout has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp48-final-closeout-next-cycle-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-user-confirmation-before-next-cycle-group",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P48.7",
    sourceEvidence: {
      wp48CloseoutCandidate: normalizePath(closeoutCandidatePath),
      wp48InputPrioritization: normalizePath(inputPrioritizationPath)
    },
    executionPolicy: {
      policy: "final-closeout-and-next-inputs-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayStartNextWPCycle: false,
      hiaMayTriggerCheckedApply: false,
      mayClaimCGroupFirstRoundCloseout: true,
      mayClaimRealExecutionSuccess: false,
      sourcesContentPolicy: "none"
    },
    finalCloseout,
    carriedDeferredGates,
    nextCycleInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      carriedDeferredGates: normalizePath(carriedDeferredGatesPath),
      closeoutSummary: normalizePath(closeoutSummaryPath),
      finalCloseout: normalizePath(finalCloseoutPath),
      nextCycleInputs: normalizePath(nextCycleInputsPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P48.7 final closeout evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(finalCloseoutPath, renderFinalCloseout(evidence), "utf8");
  await writeFile(carriedDeferredGatesPath, renderCarriedDeferredGates(evidence), "utf8");
  await writeFile(nextCycleInputsPath, renderNextCycleInputs(evidence), "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummary(evidence), "utf8");

  console.log(`W-P48 final closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`C-HIA-P2 final closeout prepared at ${normalizePath(finalCloseoutPath)}`);
  console.log(`Next cycle input candidates prepared at ${normalizePath(nextCycleInputsPath)}`);
}

/**
 * 创建 C-HIA-P2 第一轮最终收口对象。
 * Create the C-HIA-P2 first-round final closeout object.
 *
 * @param {any} closeoutCandidate W-P48.5 evidence.
 * @param {any} inputPrioritization W-P48.6 evidence.
 * @returns {Record<string, unknown>} Final closeout model.
 */
function createFinalCloseout(closeoutCandidate, inputPrioritization) {
  return {
    contract: "hia-c-hia-p2-final-closeout",
    contractVersion: "0.1.0-draft",
    closeoutStatus: "first-round-closeout-complete",
    cycleGroupId: "C-HIA-P2",
    coveredCycles: ["W-P44", "W-P45", "W-P46", "W-P47", "W-P48"],
    completedWp48Stages: ["W-P48.1", "W-P48.2", "W-P48.3", "W-P48.4", "W-P48.5", "W-P48.6", "W-P48.7"],
    completedFirstRoundClaims: closeoutCandidate.closeoutCandidate.completedFirstRoundPhases.map((item) => ({
      phase: item.phase,
      classificationKind: item.classificationKind,
      mayClaimCompletedFirstRound: item.mayClaimCompletedFirstRound === true
    })),
    productizationLimitedSurfaceCount: closeoutCandidate.summary.limitedSurfaceCount,
    prioritizedNextInputCount: inputPrioritization.summary.priorityItemCount,
    closeoutScope: "completed-first-round-with-deferred-real-execution-gates",
    cGroupFirstRoundCloseoutClaimable: true,
    realExecutionSuccessClaimed: false,
    nextCycleRequiresUserConfirmation: true,
    mayStartNextCycleNow: false
  };
}

function createCarriedDeferredGates(closeoutCandidate) {
  return {
    contract: "hia-c-hia-p2-carried-deferred-gates",
    contractVersion: "0.1.0-draft",
    carryStatus: "carried-forward-to-next-cycle-candidates",
    groupItems: closeoutCandidate.deferredGates.groupItems.map((item) => ({
      id: item.id,
      sourcePhase: item.sourcePhase,
      gateClass: item.gateClass,
      owner: item.owner,
      status: item.status,
      carriedForward: true,
      requiresLaterExplicitAuthorization: true,
      mayBeClosedByWp48: false,
      reason: item.reason
    })),
    explicitItems: closeoutCandidate.deferredGates.explicitItems.map((item) => ({
      id: item.id,
      sourcePhase: item.sourcePhase,
      owner: item.owner,
      status: item.status,
      carriedForward: true,
      requiresLaterExplicitAuthorization: true,
      mayBeCompletedByHiaAutomation: false,
      grantsCheckedApplyWriteAuthorityNow: false,
      grantsTargetMutationAuthorityNow: false
    })),
    closedInWp48Count: 0
  };
}

function createNextCycleInputs(inputPrioritization) {
  const p0 = inputPrioritization.priorityMatrix.items.filter((item) => item.priority === "P0").map(toNextInput);
  const p1 = inputPrioritization.priorityMatrix.items.filter((item) => item.priority === "P1").map(toNextInput);
  const p2 = inputPrioritization.priorityMatrix.items.filter((item) => item.priority === "P2").map(toNextInput);
  return {
    contract: "hia-wp48-next-cycle-inputs-for-user-confirmation",
    contractVersion: "0.1.0-draft",
    inputStatus: "ready-for-user-confirmation",
    recommendedFirstGroup: {
      id: "c-hia-p3-self-doc-and-authoring",
      status: "candidate-only",
      requiresUserConfirmationBeforeStart: true,
      inputs: p0
    },
    secondaryInputs: p1,
    laterInputs: p2,
    seedGroups: inputPrioritization.nextCycleSeeds.groups.map((item) => ({
      id: item.id,
      recommendedPriority: item.recommendedPriority,
      status: item.status,
      requiresUserConfirmationBeforeStart: true
    }))
  };
}

function toNextInput(item) {
  return {
    id: item.id,
    priority: item.priority,
    title: item.title,
    titleEn: item.titleEn,
    ownerBoundary: item.ownerBoundary,
    nextWorkShape: item.nextWorkShape,
    blockedByOpenDeferredGate: item.blockedByOpenDeferredGate,
    grantsExecutionNow: false,
    grantsWriteNow: false,
    grantsTargetMutationNow: false,
    grantsProviderNetworkNow: false
  };
}

function summarize({ carriedDeferredGates, closeoutCandidate, finalCloseout, inputPrioritization, nextCycleInputs }) {
  const serialized = JSON.stringify({ carriedDeferredGates, finalCloseout, nextCycleInputs });
  return {
    phase: "W-P48.7",
    inputEvidenceCount: 2,
    readyInputEvidenceCount: [closeoutCandidate, inputPrioritization].filter(isReadyEvidence).length,
    inputHardFailureCount: sum([
      closeoutCandidate.summary?.hardFailureCount,
      inputPrioritization.summary?.hardFailureCount
    ]),
    coveredCycleCount: finalCloseout.coveredCycles.length,
    completedWp48StageCount: finalCloseout.completedWp48Stages.length,
    completedFirstRoundClaimCount: finalCloseout.completedFirstRoundClaims.length,
    productizationLimitedSurfaceCount: finalCloseout.productizationLimitedSurfaceCount,
    priorityItemCount: finalCloseout.prioritizedNextInputCount,
    p0NextInputCount: nextCycleInputs.recommendedFirstGroup.inputs.length,
    p1NextInputCount: nextCycleInputs.secondaryInputs.length,
    p2NextInputCount: nextCycleInputs.laterInputs.length,
    seedGroupCount: nextCycleInputs.seedGroups.length,
    openDeferredGateGroupCount: carriedDeferredGates.groupItems.filter((item) => item.status === "open-deferred").length,
    openExplicitDeferredGateCount: carriedDeferredGates.explicitItems.filter((item) => item.status === "open-deferred").length,
    closedDeferredGateCount: carriedDeferredGates.closedInWp48Count,
    cGroupFirstRoundCloseoutClaimable: finalCloseout.cGroupFirstRoundCloseoutClaimable,
    realExecutionSuccessClaimed: finalCloseout.realExecutionSuccessClaimed,
    mayStartNextCycleNow: finalCloseout.mayStartNextCycleNow,
    nextCycleRequiresUserConfirmation: finalCloseout.nextCycleRequiresUserConfirmation,
    checkedApplyWriteEnabledCount: sum([
      closeoutCandidate.summary?.checkedApplyWriteEnabledCount,
      inputPrioritization.summary?.checkedApplyWriteEnabledCount
    ]),
    hostEditorApiCallCount: sum([
      closeoutCandidate.summary?.hostEditorApiCallCount,
      inputPrioritization.summary?.hostEditorApiCallCount
    ]),
    checkedApplyTriggeredCount: sum([
      closeoutCandidate.summary?.checkedApplyTriggeredCount,
      inputPrioritization.summary?.checkedApplyTriggeredCount
    ]),
    workspaceWriteAllowedCount: sum([
      closeoutCandidate.summary?.workspaceWriteAllowedCount,
      inputPrioritization.summary?.workspaceWriteAllowedCount
    ]),
    targetRepositoryMutationCount: sum([
      closeoutCandidate.summary?.targetRepositoryMutationCount,
      inputPrioritization.summary?.targetRepositoryMutationCount
    ]),
    targetCommandExecutedByHiaCount: sum([
      closeoutCandidate.summary?.targetCommandExecutedByHiaCount,
      inputPrioritization.summary?.targetCommandExecutedByHiaCount
    ]),
    providerNetworkExecutedCount: sum([
      closeoutCandidate.summary?.providerNetworkExecutedCount,
      inputPrioritization.summary?.providerNetworkExecutedCount
    ]),
    externalNetworkCallExecutedCount: sum([
      closeoutCandidate.summary?.externalNetworkCallExecutedCount,
      inputPrioritization.summary?.externalNetworkCallExecutedCount
    ]),
    sourceBodyIncludedCount: sum([
      closeoutCandidate.summary?.sourceBodyIncludedCount,
      inputPrioritization.summary?.sourceBodyIncludedCount
    ]),
    sourceTextIncludedCount: sum([
      closeoutCandidate.summary?.sourceTextIncludedCount,
      inputPrioritization.summary?.sourceTextIncludedCount
    ]),
    requestBodyIncludedCount: sum([
      closeoutCandidate.summary?.requestBodyIncludedCount,
      inputPrioritization.summary?.requestBodyIncludedCount
    ]),
    responseBodyIncludedCount: sum([
      closeoutCandidate.summary?.responseBodyIncludedCount,
      inputPrioritization.summary?.responseBodyIncludedCount
    ]),
    secretValueIncludedCount: sum([
      closeoutCandidate.summary?.secretValueIncludedCount,
      inputPrioritization.summary?.secretValueIncludedCount
    ]),
    digestValueIncludedCount: sum([
      closeoutCandidate.summary?.digestValueIncludedCount,
      inputPrioritization.summary?.digestValueIncludedCount
    ]),
    localAbsolutePathDetectedCount: sum([
      closeoutCandidate.summary?.localAbsolutePathDetectedCount,
      inputPrioritization.summary?.localAbsolutePathDetectedCount,
      countPathExposure(serialized)
    ]),
    credentialMaterialMarkerCount: sum([
      closeoutCandidate.summary?.credentialMaterialMarkerCount,
      inputPrioritization.summary?.credentialMaterialMarkerCount,
      countCredentialMarkers(serialized)
    ]),
    sourcesContentMarkerCount: sum([
      closeoutCandidate.summary?.sourcesContentMarkerCount,
      inputPrioritization.summary?.sourcesContentMarkerCount,
      /"sourcesContent"\s*:/iu.test(serialized) ? 1 : 0
    ]),
    sourcesContentPolicy: "none",
    nextStage: "await-user-confirmation-for-next-cycle-group"
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP48_7_INPUTS_READY", summary.inputEvidenceCount === 2
      && summary.readyInputEvidenceCount === 2
      && summary.inputHardFailureCount === 0),
    check("HIA_WP48_7_FIRST_ROUND_CLOSEOUT_READY", summary.coveredCycleCount === 5
      && summary.completedWp48StageCount === 7
      && summary.completedFirstRoundClaimCount === 4
      && summary.cGroupFirstRoundCloseoutClaimable === true
      && summary.realExecutionSuccessClaimed === false),
    check("HIA_WP48_7_NEXT_INPUTS_READY", summary.priorityItemCount === 8
      && summary.p0NextInputCount === 3
      && summary.p1NextInputCount === 3
      && summary.p2NextInputCount === 2
      && summary.seedGroupCount === 3),
    check("HIA_WP48_7_DEFERRED_GATES_CARRIED", summary.openDeferredGateGroupCount === 4
      && summary.openExplicitDeferredGateCount >= 14
      && summary.closedDeferredGateCount === 0),
    check("HIA_WP48_7_NO_CYCLE_CROSSING", summary.mayStartNextCycleNow === false
      && summary.nextCycleRequiresUserConfirmation === true
      && summary.nextStage === "await-user-confirmation-for-next-cycle-group"),
    check("HIA_WP48_7_NO_EXECUTION_OR_WRITE", summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0),
    check("HIA_WP48_7_PRIVACY_CLEAN", summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0
      && summary.sourcesContentPolicy === "none")
  ];
}

function renderFinalCloseout(evidence) {
  const claimRows = evidence.finalCloseout.completedFirstRoundClaims
    .map((item) => `| ${item.phase} | ${item.classificationKind} | ${yesNo(item.mayClaimCompletedFirstRound)} |`)
    .join("\n");
  return `# C-HIA-P2 Final Closeout

## 中文摘要

C-HIA-P2 已完成第一轮最终收口。这个结论的范围是 completed-first-round with deferred real execution gates：W-P44-W-P47 均完成第一轮，W-P48 完成 closeout，但真实 provider/network、target-owner execution、checked apply write 与 release-grade runtime archive 仍未关闭。

## Closeout Scope

- closeout status：${evidence.finalCloseout.closeoutStatus}
- covered cycles：${evidence.finalCloseout.coveredCycles.join(", ")}
- W-P48 stages：${evidence.finalCloseout.completedWp48Stages.join(", ")}
- next cycle requires user confirmation：${yesNo(evidence.finalCloseout.nextCycleRequiresUserConfirmation)}

## First-Round Claims

| Phase | Classification | Claimable |
| --- | --- | --- |
${claimRows}
`;
}

function renderCarriedDeferredGates(evidence) {
  const groupRows = evidence.carriedDeferredGates.groupItems
    .map((item) => `| ${item.id} | ${item.sourcePhase} | ${item.gateClass} | ${item.status} | ${item.owner} |`)
    .join("\n");
  return `# Open Deferred Gates Carried Forward

## 中文摘要

以下 gate 在 W-P48.7 中继续保持 open-deferred。后续任何关闭动作都需要更窄阶段、明确授权和新的 evidence。

| Gate | Source phase | Class | Status | Owner |
| --- | --- | --- | --- | --- |
${groupRows}

Explicit deferred items：${evidence.summary.openExplicitDeferredGateCount}
`;
}

function renderNextCycleInputs(evidence) {
  const p0Rows = evidence.nextCycleInputs.recommendedFirstGroup.inputs
    .map((item) => `| ${item.priority} | ${item.id} | ${item.title} | ${item.nextWorkShape} |`)
    .join("\n");
  const secondaryRows = evidence.nextCycleInputs.secondaryInputs
    .map((item) => `| ${item.priority} | ${item.id} | ${item.title} | ${item.nextWorkShape} |`)
    .join("\n");
  const laterRows = evidence.nextCycleInputs.laterInputs
    .map((item) => `| ${item.priority} | ${item.id} | ${item.title} | ${item.nextWorkShape} |`)
    .join("\n");
  return `# Next Cycle Inputs For User Confirmation

## 中文摘要

推荐的下一周期候选是 \`${evidence.nextCycleInputs.recommendedFirstGroup.id}\`，但当前只是 candidate-only；跨入新的 W-P 组前需要用户确认。

## Recommended First Group

| Priority | Input | 中文标题 | Next work shape |
| --- | --- | --- | --- |
${p0Rows}

## Secondary Inputs

| Priority | Input | 中文标题 | Next work shape |
| --- | --- | --- | --- |
${secondaryRows}

## Later Inputs

| Priority | Input | 中文标题 | Next work shape |
| --- | --- | --- | --- |
${laterRows}
`;
}

function renderCloseoutSummary(evidence) {
  return `# W-P48 Closeout Summary

## 中文摘要

W-P48 已完成 C-HIA-P2 收口链路：intake、classification、productization boundary、target adoption boundary、closeout candidate、C-HIA-P3 input prioritization 与 final closeout。下一步不是自动开新周期，而是等待用户确认下一周期组。

## Summary

- status：${evidence.status}
- completed W-P48 stages：${evidence.summary.completedWp48StageCount}
- priority items：${evidence.summary.priorityItemCount}
- open deferred gate groups：${evidence.summary.openDeferredGateGroupCount}
- open explicit deferred gates：${evidence.summary.openExplicitDeferredGateCount}
- next cycle requires user confirmation：${yesNo(evidence.summary.nextCycleRequiresUserConfirmation)}
- may start next cycle now：${yesNo(evidence.summary.mayStartNextCycleNow)}
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
