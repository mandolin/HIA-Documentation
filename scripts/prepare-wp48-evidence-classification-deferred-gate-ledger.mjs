import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp48-evidence-classification-deferred-gate-ledger");
const evidencePath = path.join(outputRoot, "evidence.json");
const classificationLedgerPath = path.join(outputRoot, "c-hia-p2-evidence-classification-ledger.md");
const deferredGateLedgerPath = path.join(outputRoot, "c-hia-p2-deferred-gate-ledger.md");
const closeoutReadinessPath = path.join(outputRoot, "wp48-closeout-readiness-matrix.md");
const nextInputsPath = path.join(outputRoot, "wp48-next-stage-inputs.md");

const inputPath = path.join(rootDir, "dist", "wp48-cycle-closeout-intake", "evidence.json");

await main();

/**
 * 生成 W-P48.2 evidence classification 与 deferred gate 总账。
 * Generate the W-P48.2 evidence-classification and deferred-gate ledgers.
 *
 * 中文：本脚本只消费 W-P48.1 的 closeout intake，不执行目标项目、宿主编辑、
 * provider/network 或 checked apply。它的价值是把 C-HIA-P2 的“已完成第一轮”
 * 与“仍显式后延”分清，避免 closeout 时误把准备态写成真实执行。
 *
 * English: This script consumes only the W-P48.1 closeout intake. It does not
 * execute target projects, host editing, provider/network calls, or checked
 * apply. Its value is to keep completed-first-round records separate from
 * explicitly deferred gates during C-HIA-P2 closeout.
 *
 * @returns {Promise<void>} Writes public-safe W-P48.2 evidence.
 */
async function main() {
  const intake = await readJson(inputPath);
  const classificationLedger = createClassificationLedger(intake);
  const deferredGateLedger = createDeferredGateLedger(intake);
  const closeoutReadiness = createCloseoutReadiness(classificationLedger, deferredGateLedger, intake);
  const nextStageInputs = createNextStageInputs(closeoutReadiness, intake);
  const summary = summarize({
    classificationLedger,
    closeoutReadiness,
    deferredGateLedger,
    intake,
    nextStageInputs
  });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P48.2 ledger has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp48-evidence-classification-deferred-gate-ledger",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp48-productization-readiness-boundary-review",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P48.2",
    sourceEvidence: {
      wp48CycleCloseoutIntake: normalizePath(inputPath)
    },
    executionPolicy: {
      policy: "classification-and-ledger-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      sourcesContentPolicy: "none"
    },
    classificationLedger,
    deferredGateLedger,
    closeoutReadiness,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      classificationLedger: normalizePath(classificationLedgerPath),
      closeoutReadiness: normalizePath(closeoutReadinessPath),
      deferredGateLedger: normalizePath(deferredGateLedgerPath),
      nextStageInputs: normalizePath(nextInputsPath)
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P48.2 classification ledger evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(classificationLedgerPath, renderClassificationLedger(evidence), "utf8");
  await writeFile(deferredGateLedgerPath, renderDeferredGateLedger(evidence), "utf8");
  await writeFile(closeoutReadinessPath, renderCloseoutReadiness(evidence), "utf8");
  await writeFile(nextInputsPath, renderNextStageInputs(evidence), "utf8");

  console.log(`W-P48 evidence classification ledger prepared at ${normalizePath(evidencePath)}`);
  console.log(`C-HIA-P2 classification ledger prepared at ${normalizePath(classificationLedgerPath)}`);
  console.log(`C-HIA-P2 deferred gate ledger prepared at ${normalizePath(deferredGateLedgerPath)}`);
}

/**
 * 创建按 phase 分账的 evidence classification ledger。
 * Create a phase-scoped evidence classification ledger.
 *
 * @param {any} intake W-P48.1 intake evidence.
 * @returns {Record<string, unknown>} Classification ledger.
 */
function createClassificationLedger(intake) {
  const items = intake.phaseLedger.map((phase) => {
    const classification = classifyPhase(phase);
    return {
      phase: phase.phase,
      topic: phase.topic,
      sourceStatus: phase.sourceStatus,
      closeoutClass: phase.closeoutClass,
      closeoutStatus: phase.closeoutStatus,
      classification,
      closeoutMayClaimCompletedFirstRound: true,
      closeoutMayClaimReleaseGradeRuntimeCapture: false,
      closeoutMayClaimProviderSuccess: false,
      closeoutMayClaimTargetOwnerExecution: false,
      closeoutMayClaimCheckedApplyWrite: false,
      productizationInputStatus: classification.productizationInputStatus,
      deferredGateRequired: classification.deferredGateRequired,
      evidenceStatement: classification.evidenceStatement,
      forbiddenReclassification: classification.forbiddenReclassification
    };
  });
  return {
    contract: "hia-c-hia-p2-evidence-classification-ledger",
    contractVersion: "0.1.0-draft",
    ledgerStatus: "ready-for-wp48-productization-readiness-review",
    cycleGroupId: "C-HIA-P2",
    items
  };
}

function classifyPhase(phase) {
  const byClass = {
    "blocked-before-network-provider-execution": {
      classificationKind: "blocked-before-network",
      deferredGateRequired: true,
      evidenceStatement: "Provider identity, request preview and blocked result are ready; real provider/network success is not available.",
      forbiddenReclassification: "Do not reclassify as provider success, destination contact, credential access or network execution.",
      productizationInputStatus: "review-governance-productization-input"
    },
    "checked-apply-pilot-preparation-only": {
      classificationKind: "pilot-preparation-only",
      deferredGateRequired: true,
      evidenceStatement: "Checked apply pilot preparation is complete; real write authority remains disabled.",
      forbiddenReclassification: "Do not reclassify as final confirmation, checked apply write, host editor API call or target mutation.",
      productizationInputStatus: "checked-apply-boundary-productization-input"
    },
    "metadata-only-target-owner-evidence": {
      classificationKind: "metadata-only",
      deferredGateRequired: true,
      evidenceStatement: "Target-owner evidence schema, validator and handoff are ready; actual target-owner submission count remains zero.",
      forbiddenReclassification: "Do not reclassify as target-owner command execution, adoption trial completion, branch, PR or sandbox.",
      productizationInputStatus: "target-owner-evidence-productization-input"
    },
    "observation-only-host-runtime": {
      classificationKind: "observation-only",
      deferredGateRequired: true,
      evidenceStatement: "Host runtime observations are accepted as public-safe observations; release-grade archive remains pending.",
      forbiddenReclassification: "Do not reclassify as release-grade runtime capture archive or Visual Studio implementation completion.",
      productizationInputStatus: "host-runtime-observation-productization-input"
    }
  };
  return byClass[phase.closeoutClass] ?? {
    classificationKind: "unknown",
    deferredGateRequired: true,
    evidenceStatement: "Unknown closeout class requires manual review.",
    forbiddenReclassification: "Do not use unknown evidence class as completed execution.",
    productizationInputStatus: "manual-review-required"
  };
}

/**
 * 创建周期组级 deferred gate ledger。
 * Create the cycle-level deferred gate ledger.
 *
 * @param {any} intake W-P48.1 intake evidence.
 * @returns {Record<string, unknown>} Deferred gate ledger.
 */
function createDeferredGateLedger(intake) {
  const groupItems = intake.deferredGateIntake.phaseGateGroups.map((group) => ({
    id: group.id,
    sourcePhase: group.sourcePhase,
    gateClass: group.gateClass,
    declaredCount: number(group.declaredCount),
    owner: group.owner,
    status: "open-deferred",
    mayBeClosedInWp48: false,
    requiresLaterExplicitAuthorization: true,
    reason: group.reason
  }));
  const explicitItems = intake.deferredGateIntake.explicitWp47Items.map((item) => ({
    id: item.id,
    sourcePhase: item.sourcePhase,
    owner: item.owner,
    status: "open-deferred",
    mayBeClosedInWp48: false,
    requiresLaterExplicitAuthorization: true,
    mayBeCompletedByHiaAutomation: item.mayBeCompletedByHiaAutomation === true,
    grantsCheckedApplyWriteAuthorityNow: item.grantsCheckedApplyWriteAuthorityNow === true,
    grantsTargetMutationAuthorityNow: item.grantsTargetMutationAuthorityNow === true,
    reason: item.reason
  }));
  return {
    contract: "hia-c-hia-p2-deferred-gate-ledger",
    contractVersion: "0.1.0-draft",
    ledgerStatus: "open-deferred-gates-recorded",
    cycleGroupId: "C-HIA-P2",
    groupItems,
    explicitItems,
    declaredGateCount: sum(groupItems.map((item) => item.declaredCount)),
    explicitGateItemCount: explicitItems.length
  };
}

/**
 * 建立 W-P48 closeout readiness matrix。
 * Build the W-P48 closeout readiness matrix.
 *
 * @param {Record<string, unknown>} classificationLedger Classification ledger.
 * @param {Record<string, unknown>} deferredGateLedger Deferred gate ledger.
 * @param {any} intake W-P48.1 intake evidence.
 * @returns {Record<string, unknown>} Readiness matrix.
 */
function createCloseoutReadiness(classificationLedger, deferredGateLedger, intake) {
  return {
    contract: "hia-wp48-closeout-readiness-matrix",
    contractVersion: "0.1.0-draft",
    readinessStatus: "ready-for-productization-boundary-review",
    completedFirstRoundMayBeClaimed: classificationLedger.items.every((item) => item.closeoutMayClaimCompletedFirstRound === true),
    finalCGroupCloseoutMayBeClaimed: false,
    reasonFinalCloseoutDeferred: "W-P48 still needs productization boundary review, target-project adoption boundary refresh, closeout candidate and next-cycle prioritization.",
    canProceedToProductizationBoundaryReview: true,
    canProceedToFinalCloseoutCandidate: false,
    productizationInputCount: classificationLedger.items.filter((item) => item.productizationInputStatus.endsWith("productization-input")).length,
    openDeferredGateGroupCount: deferredGateLedger.groupItems.length,
    openExplicitDeferredGateCount: deferredGateLedger.explicitItems.length,
    cHiaP3CandidateInputCount: number(intake.summary?.nextCycleCandidateInputCount),
    wp48InputCount: number(intake.summary?.wp48InputCount),
    noExecutionNoWriteConfirmed: allZero([
      intake.summary?.checkedApplyWriteEnabledCount,
      intake.summary?.hostEditorApiCallCount,
      intake.summary?.checkedApplyTriggeredCount,
      intake.summary?.workspaceWriteAllowedCount,
      intake.summary?.targetRepositoryMutationCount,
      intake.summary?.targetCommandExecutedByHiaCount,
      intake.summary?.providerNetworkExecutedCount,
      intake.summary?.externalNetworkCallExecutedCount
    ]),
    privacyCleanConfirmed: allZero([
      intake.summary?.sourceBodyIncludedCount,
      intake.summary?.sourceTextIncludedCount,
      intake.summary?.requestBodyIncludedCount,
      intake.summary?.responseBodyIncludedCount,
      intake.summary?.secretValueIncludedCount,
      intake.summary?.digestValueIncludedCount,
      intake.summary?.localAbsolutePathDetectedCount,
      intake.summary?.credentialMaterialMarkerCount,
      intake.summary?.sourcesContentMarkerCount
    ])
  };
}

function createNextStageInputs(closeoutReadiness, intake) {
  return {
    contract: "hia-wp48-next-stage-inputs",
    contractVersion: "0.1.0-draft",
    nextStage: "W-P48.3 Productization Readiness And Boundary Review",
    items: [
      {
        id: "productization-boundary-review",
        status: "ready-for-wp48-3",
        description: "Review which C-HIA-P2 surfaces can be productized as review/intake/ledger capabilities without enabling real execution."
      },
      {
        id: "closeout-claim-boundary",
        status: "ready-for-wp48-3",
        description: "Define exactly what C-HIA-P2 may claim as completed-first-round and what must remain deferred."
      },
      {
        id: "c-hia-p3-candidate-preservation",
        status: "ready-for-wp48-3",
        description: `Preserve ${number(intake.summary?.nextCycleCandidateInputCount)} C-HIA-P3 candidate inputs for later prioritization.`
      }
    ],
    readyForNextStage: closeoutReadiness.canProceedToProductizationBoundaryReview === true
  };
}

function summarize({ classificationLedger, closeoutReadiness, deferredGateLedger, intake, nextStageInputs }) {
  const serialized = JSON.stringify({ classificationLedger, closeoutReadiness, deferredGateLedger, nextStageInputs });
  return {
    phase: "W-P48.2",
    inputEvidenceCount: 1,
    readyInputEvidenceCount: isReadyEvidence(intake) ? 1 : 0,
    inputHardFailureCount: number(intake.summary?.hardFailureCount),
    classificationItemCount: classificationLedger.items.length,
    completedFirstRoundClaimableCount: classificationLedger.items.filter((item) => item.closeoutMayClaimCompletedFirstRound === true).length,
    observationOnlyCount: classificationLedger.items.filter((item) => item.classification.classificationKind === "observation-only").length,
    blockedBeforeNetworkCount: classificationLedger.items.filter((item) => item.classification.classificationKind === "blocked-before-network").length,
    metadataOnlyCount: classificationLedger.items.filter((item) => item.classification.classificationKind === "metadata-only").length,
    pilotPreparationOnlyCount: classificationLedger.items.filter((item) => item.classification.classificationKind === "pilot-preparation-only").length,
    forbiddenExecutionClaimCount: classificationLedger.items.filter((item) => item.closeoutMayClaimReleaseGradeRuntimeCapture === false
      && item.closeoutMayClaimProviderSuccess === false
      && item.closeoutMayClaimTargetOwnerExecution === false
      && item.closeoutMayClaimCheckedApplyWrite === false).length,
    productizationInputCount: closeoutReadiness.productizationInputCount,
    deferredGateGroupCount: deferredGateLedger.groupItems.length,
    explicitDeferredGateItemCount: deferredGateLedger.explicitItems.length,
    declaredDeferredGateCount: number(deferredGateLedger.declaredGateCount),
    openDeferredGateGroupCount: closeoutReadiness.openDeferredGateGroupCount,
    openExplicitDeferredGateCount: closeoutReadiness.openExplicitDeferredGateCount,
    finalCGroupCloseoutMayBeClaimed: closeoutReadiness.finalCGroupCloseoutMayBeClaimed,
    canProceedToProductizationBoundaryReview: closeoutReadiness.canProceedToProductizationBoundaryReview,
    canProceedToFinalCloseoutCandidate: closeoutReadiness.canProceedToFinalCloseoutCandidate,
    cHiaP3CandidateInputCount: closeoutReadiness.cHiaP3CandidateInputCount,
    wp48InputCount: closeoutReadiness.wp48InputCount,
    noExecutionNoWriteConfirmed: closeoutReadiness.noExecutionNoWriteConfirmed,
    privacyCleanConfirmed: closeoutReadiness.privacyCleanConfirmed,
    checkedApplyWriteEnabledCount: number(intake.summary?.checkedApplyWriteEnabledCount),
    hostEditorApiCallCount: number(intake.summary?.hostEditorApiCallCount),
    checkedApplyTriggeredCount: number(intake.summary?.checkedApplyTriggeredCount),
    workspaceWriteAllowedCount: number(intake.summary?.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: number(intake.summary?.targetRepositoryMutationCount),
    targetCommandExecutedByHiaCount: number(intake.summary?.targetCommandExecutedByHiaCount),
    providerNetworkExecutedCount: number(intake.summary?.providerNetworkExecutedCount),
    externalNetworkCallExecutedCount: number(intake.summary?.externalNetworkCallExecutedCount),
    sourceBodyIncludedCount: number(intake.summary?.sourceBodyIncludedCount),
    sourceTextIncludedCount: number(intake.summary?.sourceTextIncludedCount),
    requestBodyIncludedCount: number(intake.summary?.requestBodyIncludedCount),
    responseBodyIncludedCount: number(intake.summary?.responseBodyIncludedCount),
    secretValueIncludedCount: number(intake.summary?.secretValueIncludedCount),
    digestValueIncludedCount: number(intake.summary?.digestValueIncludedCount),
    localAbsolutePathDetectedCount: sum([intake.summary?.localAbsolutePathDetectedCount, countPathExposure(serialized)]),
    credentialMaterialMarkerCount: sum([intake.summary?.credentialMaterialMarkerCount, countCredentialMarkers(serialized)]),
    sourcesContentMarkerCount: sum([intake.summary?.sourcesContentMarkerCount, /"sourcesContent"\s*:/iu.test(serialized) ? 1 : 0]),
    sourcesContentPolicy: "none",
    nextStage: nextStageInputs.nextStage
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP48_2_INPUT_READY", summary.inputEvidenceCount === 1
      && summary.readyInputEvidenceCount === 1
      && summary.inputHardFailureCount === 0),
    check("HIA_WP48_2_CLASSIFICATION_LEDGER_READY", summary.classificationItemCount === 4
      && summary.completedFirstRoundClaimableCount === 4
      && summary.observationOnlyCount === 1
      && summary.blockedBeforeNetworkCount === 1
      && summary.metadataOnlyCount === 1
      && summary.pilotPreparationOnlyCount === 1
      && summary.forbiddenExecutionClaimCount === 4),
    check("HIA_WP48_2_DEFERRED_GATE_LEDGER_READY", summary.deferredGateGroupCount === 4
      && summary.explicitDeferredGateItemCount === 14
      && summary.declaredDeferredGateCount >= 31
      && summary.openDeferredGateGroupCount === 4
      && summary.openExplicitDeferredGateCount === 14),
    check("HIA_WP48_2_CLOSEOUT_BOUNDARY_READY", summary.productizationInputCount === 4
      && summary.finalCGroupCloseoutMayBeClaimed === false
      && summary.canProceedToProductizationBoundaryReview === true
      && summary.canProceedToFinalCloseoutCandidate === false
      && summary.cHiaP3CandidateInputCount >= 6
      && summary.wp48InputCount >= 10),
    check("HIA_WP48_2_NO_EXECUTION_OR_WRITE", summary.noExecutionNoWriteConfirmed === true
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0),
    check("HIA_WP48_2_PRIVACY_CLEAN", summary.privacyCleanConfirmed === true
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0
      && summary.sourcesContentPolicy === "none"),
    check("HIA_WP48_2_NEXT_STAGE_READY", summary.nextStage === "W-P48.3 Productization Readiness And Boundary Review")
  ];
}

function renderClassificationLedger(evidence) {
  const rows = evidence.classificationLedger.items
    .map((item) => `| ${item.phase} | ${item.classification.classificationKind} | ${item.closeoutClass} | ${item.productizationInputStatus} | ${item.evidenceStatement} |`)
    .join("\n");
  return `# C-HIA-P2 Evidence Classification Ledger

## 中文摘要

W-P48.2 将 W-P44-W-P47 的 closeout 输入固定为四类：observation-only、blocked-before-network、metadata-only 与 pilot-preparation-only。它允许声明这些 phase 已完成第一轮，但禁止把它们改写为真实 runtime archive、provider success、target-owner execution 或 checked apply write。

| Phase | Classification | Closeout class | Productization input | Evidence statement |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderDeferredGateLedger(evidence) {
  const groups = evidence.deferredGateLedger.groupItems
    .map((item) => `| ${item.sourcePhase} | ${item.gateClass} | ${item.declaredCount} | ${item.owner} | ${item.status} | ${yesNo(item.requiresLaterExplicitAuthorization)} |`)
    .join("\n");
  const explicit = evidence.deferredGateLedger.explicitItems
    .map((item) => `| ${item.id} | ${item.sourcePhase} | ${item.owner} | ${item.status} | ${yesNo(item.mayBeCompletedByHiaAutomation)} |`)
    .join("\n");
  return `# C-HIA-P2 Deferred Gate Ledger

## 中文摘要

该总账记录 C-HIA-P2 结束前仍不得关闭的后延门禁。W-P48.2 只登记这些门禁，不授予执行权。

## Phase Gate Groups

| Source phase | Gate class | Declared count | Owner | Status | Later authorization required |
| --- | --- | --- | --- | --- | --- |
${groups}

## Explicit W-P47 Gates

| Gate | Source phase | Owner | Status | HIA automation may complete |
| --- | --- | --- | --- | --- |
${explicit}
`;
}

function renderCloseoutReadiness(evidence) {
  const { closeoutReadiness, summary } = evidence;
  return `# W-P48 Closeout Readiness Matrix

## 中文摘要

W-P48.2 之后可以进入 productization readiness / boundary review，但还不能直接宣称 C-HIA-P2 final closeout 完成。

| Field | Value |
| --- | --- |
| Readiness status | ${closeoutReadiness.readinessStatus} |
| Completed-first-round may be claimed | ${yesNo(closeoutReadiness.completedFirstRoundMayBeClaimed)} |
| Final C-HIA-P2 closeout may be claimed | ${yesNo(closeoutReadiness.finalCGroupCloseoutMayBeClaimed)} |
| Proceed to productization boundary review | ${yesNo(closeoutReadiness.canProceedToProductizationBoundaryReview)} |
| Proceed to final closeout candidate | ${yesNo(closeoutReadiness.canProceedToFinalCloseoutCandidate)} |
| Productization inputs | ${summary.productizationInputCount} |
| Open deferred gate groups | ${summary.openDeferredGateGroupCount} |
| Open explicit deferred gates | ${summary.openExplicitDeferredGateCount} |
| C-HIA-P3 candidates | ${summary.cHiaP3CandidateInputCount} |
| No execution/write confirmed | ${yesNo(summary.noExecutionNoWriteConfirmed)} |
| Privacy clean confirmed | ${yesNo(summary.privacyCleanConfirmed)} |

## Deferred Reason

${closeoutReadiness.reasonFinalCloseoutDeferred}
`;
}

function renderNextStageInputs(evidence) {
  const rows = evidence.nextStageInputs.items
    .map((item) => `| ${item.id} | ${item.status} | ${item.description} |`)
    .join("\n");
  return `# W-P48 Next Stage Inputs

## 中文摘要

W-P48.3 应进入 productization readiness and boundary review，继续保持 review/intake/ledger 能力与真实执行权限分离。

| Input | Status | Description |
| --- | --- | --- |
${rows}
`;
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

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function allZero(values) {
  return values.every((value) => number(value) === 0);
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function yesNo(value) {
  return value === true ? "yes" : "no";
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
