import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp53-closeout-next-stage-boundary");

await main();

/**
 * 生成 W-P53 第一轮 closeout 与下一阶段边界 evidence。
 *
 * 中文：本脚本仅汇总 W-P53.1-W-P53.6 已提交的 public-safe evidence，区分 ready preparation 与
 * W-P53.6 的 expected blocked decision。它不重放 host route、不启动宿主、不执行 target/provider/
 * network 操作，也不自动启动新的 W-P 周期或宣称真实 adoption/write 成功。
 * @lang en Generates W-P53 first-round closeout and next-stage-boundary evidence from committed public-safe
 * inputs only. It distinguishes ready preparation from W-P53.6's expected blocked decision and neither
 * replays host routes nor launches hosts, executes target/provider/network work, starts a new W phase, or claims adoption/write success.
 * @returns {Promise<void>} <lang><zh-CN>写入 public-safe closeout evidence。</zh-CN><en>Writes public-safe closeout evidence.</en></lang>
 */
async function main() {
  const inputs = readInputs();
  const summary = summarize(inputs);
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp53-closeout-next-stage-boundary-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P53.7",
    status: hardFailures.length === 0
      ? "ready-for-c-hia-p3-first-round-closeout-review"
      : "blocked-by-wp53-closeout-boundary-validation",
    sourceInputs: createSourceInputs(inputs),
    closeout: {
      firstRoundCloseoutClaimable: hardFailures.length === 0,
      realAdoptionSuccessClaimed: false,
      liveHostMutationSuccessClaimed: false,
      targetRepositoryMutationSuccessClaimed: false,
      completedStageCount: 7,
      completedPreparationStageCount: summary.readyPreparationStageCount,
      completedBlockedDecisionStageCount: summary.blockedDecisionStageCount,
      explicitDeferredLivePilotGateCount: summary.explicitDeferredLivePilotGateCount,
      targetOwnerReportDeferredCount: summary.targetOwnerReportDeferredCount,
      satelliteOwnerCharterDeferredCount: summary.satelliteOwnerCharterDeferredCount,
      nextWPhaseStarted: false,
      cycleGroupCloseoutClaimed: false,
      nextStageRequiresSeparateUserOrOwnerAction: true
    },
    capabilities: [
      "workspace-trust-and-static-write-authority-baseline",
      "target-owner-currentness-and-trial-selection",
      "fixed-vscode-self-sandbox-host-owned-gate",
      "visual-studio-versioned-snapshot-readiness",
      "four-owner-handoffs-and-three-host-read-only-review",
      "blocked-live-pilot-decision-with-explicit-gates"
    ],
    deferredLivePilotConditions: [
      "specific-live-host-execution",
      "final-human-confirmation",
      "public-safe-manual-evidence",
      "target-owner-metadata-return-for-target-routes",
      "satellite-owner-charter-for-satellite-route",
      "concrete-visual-studio-synthetic-sandbox-scope"
    ],
    executionBoundary: {
      actualVscodeExtensionDevelopmentHostExecutionCount: summary.actualVscodeExtensionDevelopmentHostExecutionCount,
      actualWorkspaceApplyEditExecutionCount: summary.actualWorkspaceApplyEditExecutionCount,
      actualVisualStudioMutationExecutionCount: summary.actualVisualStudioMutationExecutionCount,
      visualStudioLaunchCount: summary.visualStudioLaunchCount,
      finalHumanConfirmationCapturedCount: summary.finalHumanConfirmationCapturedCount,
      realOwnerReportSubmittedCount: summary.realOwnerReportSubmittedCount,
      targetCommandExecutedByHiaCount: 0,
      targetRepositoryMutationCount: 0,
      checkedApplyTriggeredCount: 0,
      workspaceWriteAllowedCount: 0,
      providerNetworkExecutedCount: 0,
      sourceBodyIncludedInEvidence: false,
      reportBodyIncludedInEvidence: false,
      snapshotBodyIncludedInEvidence: false,
      rollbackBodyIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      absolutePathIncludedInEvidence: false,
      sourcesContentPolicy: "none"
    },
    summary: { ...summary, hardFailureCount: hardFailures.length },
    checks,
    generatedDocs: {
      closeout: "dist/wp53-closeout-next-stage-boundary/wp53-closeout.md",
      deferredGateBoundary: "dist/wp53-closeout-next-stage-boundary/wp53-deferred-live-pilot-boundary.md"
    }
  };
  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized, "W-P53.7 evidence");
  assert.equal(hardFailures.length, 0, `W-P53.7 has ${hardFailures.length} validation failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  await writeFile(path.join(outputRoot, "wp53-closeout.md"), renderCloseout(evidence), "utf8");
  await writeFile(path.join(outputRoot, "wp53-deferred-live-pilot-boundary.md"), renderDeferredBoundary(evidence), "utf8");
  console.log(`W-P53 closeout evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/**
 * 读取 W-P53 全部前置阶段 evidence，不重新运行历史阶段。
 *
 * @lang en Reads all prior W-P53 evidence without rerunning earlier stages.
 */
function readInputs() {
  const inputs = {
    capability: readJson(path.join(root, "dist", "wp53-capability-consent-write-authority-refresh", "evidence.json")),
    selection: readJson(path.join(root, "dist", "wp53-target-owner-evidence-currentness-and-trial-selection", "evidence.json")),
    vscode: readJson(path.join(root, "dist", "wp53-vscode-host-owned-self-sandbox-pilot-gate", "evidence.json")),
    visualStudio: readJson(path.join(root, "dist", "wp53-visual-studio-snapshot-mutation-readiness", "evidence.json")),
    handoff: readJson(path.join(root, "dist", "wp53-target-owner-adoption-handoff-refresh", "evidence.json")),
    decision: readJson(path.join(root, "dist", "wp53-real-pilot-authorization-decision-and-manual-evidence", "evidence.json"))
  };
  assert.equal(inputs.capability.status, "ready-for-wp53-target-owner-evidence-currentness-and-trial-selection");
  assert.equal(inputs.selection.status, "ready-for-wp53-vscode-host-owned-self-sandbox-pilot-gate");
  assert.equal(inputs.vscode.status, "ready-for-wp53-visual-studio-snapshot-mutation-readiness");
  assert.equal(inputs.visualStudio.status, "ready-for-wp53-target-owner-adoption-handoff-refresh");
  assert.equal(inputs.handoff.status, "ready-for-wp53-real-pilot-authorization-decision-and-manual-evidence");
  assert.equal(inputs.decision.status, "blocked-awaiting-specific-live-pilot-conditions");
  return inputs;
}

/**
 * 汇总 first-round completed preparation 和 expected blocked decision，保持两者语义分离。
 *
 * @lang en Summarizes first-round completed preparation and the expected blocked decision while keeping their meanings separate.
 */
function summarize(inputs) {
  const decision = inputs.decision.summary ?? {};
  const selection = inputs.selection.summary ?? {};
  const vscodeBoundary = inputs.vscode.executionBoundary ?? {};
  const visualStudioBoundary = inputs.visualStudio.executionBoundary ?? {};
  return {
    phase: "W-P53.7",
    inputEvidenceCount: 6,
    readyInputEvidenceCount: 6,
    inputHardFailureCount: sum([
      inputs.capability.summary?.hardFailureCount,
      selection.hardFailureCount,
      inputs.vscode.summary?.hardFailureCount,
      inputs.visualStudio.summary?.hardFailureCount,
      inputs.handoff.summary?.hardFailureCount,
      decision.hardFailureCount
    ]),
    wp53InputStageCount: 6,
    readyPreparationStageCount: 5,
    blockedDecisionStageCount: 1,
    capabilityCount: 6,
    blockedCandidateCount: number(decision.blockedCandidateCount),
    explicitDeferredLivePilotGateCount: number(decision.blockerCount),
    targetOwnerReportDeferredCount: number(selection.targetOwnerReportDeferredCount),
    satelliteOwnerCharterDeferredCount: number(selection.satelliteOwnerCharterDeferredCount),
    actualVscodeExtensionDevelopmentHostExecutionCount: number(vscodeBoundary.actualVscodeExtensionDevelopmentHostExecutionCount),
    actualWorkspaceApplyEditExecutionCount: number(vscodeBoundary.actualWorkspaceApplyEditExecutionCount),
    actualVisualStudioMutationExecutionCount: number(visualStudioBoundary.actualVisualStudioMutationExecutionCount),
    visualStudioLaunchCount: number(visualStudioBoundary.visualStudioLaunchCount),
    finalHumanConfirmationCapturedCount: number(vscodeBoundary.finalHumanConfirmationCaptured === true)
      + number(visualStudioBoundary.finalHumanConfirmationCapturedCount),
    realOwnerReportSubmittedCount: number(selection.realOwnerReportSubmittedCount),
    targetRepositoryMutationCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    providerNetworkExecutedCount: 0,
    sourceBodyIncludedCount: 0,
    reportBodyIncludedCount: 0,
    snapshotBodyIncludedCount: 0,
    rollbackBodyIncludedCount: 0,
    digestValueIncludedCount: 0,
    absolutePathIncludedCount: 0,
    sourcesContentPolicy: "none",
    nextStage: "C-HIA-P3 first-round closeout review or separately authorized live-pilot intake"
  };
}

function createChecks(summary) {
  return [
    check("all-wp53-inputs-ready", summary.inputEvidenceCount === 6
      && summary.readyInputEvidenceCount === 6
      && summary.inputHardFailureCount === 0,
    "All W-P53.1-W-P53.6 public-safe evidence inputs are present without validation failures."),
    check("preparation-and-blocked-decision-separated", summary.wp53InputStageCount === 6
      && summary.readyPreparationStageCount === 5
      && summary.blockedDecisionStageCount === 1
      && summary.blockedCandidateCount === 5
      && summary.explicitDeferredLivePilotGateCount === 16,
    "Five ready preparation stages and one expected blocked decision stage are summarized without calling blocked work a success."),
    check("adoption-and-live-execution-not-claimed", summary.actualVscodeExtensionDevelopmentHostExecutionCount === 0
      && summary.actualWorkspaceApplyEditExecutionCount === 0
      && summary.actualVisualStudioMutationExecutionCount === 0
      && summary.visualStudioLaunchCount === 0
      && summary.finalHumanConfirmationCapturedCount === 0
      && summary.realOwnerReportSubmittedCount === 0,
    "No live host execution, final confirmation, or owner return is claimed by the closeout."),
    check("target-provider-and-write-boundary-intact", summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerNetworkExecutedCount === 0,
    "Closeout grants no target mutation, checked apply, workspace write, or provider-network execution."),
    check("privacy-boundary-intact", summary.sourceBodyIncludedCount === 0
      && summary.reportBodyIncludedCount === 0
      && summary.snapshotBodyIncludedCount === 0
      && summary.rollbackBodyIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.absolutePathIncludedCount === 0
      && summary.sourcesContentPolicy === "none",
    "Closeout evidence remains metadata-only and excludes private bodies, values, paths, and sourcesContent."),
    check("no-new-w-cycle-started", summary.nextStage.includes("C-HIA-P3 first-round closeout review"),
      "W-P53 closes its first round without automatically starting a new W-P cycle.")
  ];
}

function createSourceInputs(inputs) {
  return [
    sourceInput("W-P53.1", inputs.capability),
    sourceInput("W-P53.2", inputs.selection),
    sourceInput("W-P53.3", inputs.vscode),
    sourceInput("W-P53.4", inputs.visualStudio),
    sourceInput("W-P53.5", inputs.handoff),
    sourceInput("W-P53.6", inputs.decision)
  ];
}

function sourceInput(phase, evidence) {
  return {
    phase,
    contract: evidence.contract,
    status: evidence.status,
    hardFailureCount: number(evidence.summary?.hardFailureCount),
    grantsWriteAuthority: false,
    sourcesContentPolicy: "none"
  };
}

function check(id, passed, description) {
  return { id, status: passed ? "pass" : "fail", description };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/") || ".";
}

function renderCloseout(evidence) {
  const summary = evidence.summary;
  return `# W-P53 First-Round Closeout

## 中文摘要

W-P53 已完成第一轮 closeout：W-P53.1-W-P53.5 是 capability、selection、host route readiness、
owner handoff 和 three-host review 的可验证 preparation；W-P53.6 是已验证的 blocked decision。
这两类结果必须分开理解。W-P53 因此完成了真实采用/checked apply pilot refresh 的第一轮准备和
边界整理，但没有完成任何真实 target adoption、live host mutation 或 checked-apply write。

## Summary

- completed preparation / blocked decision stage: ${summary.readyPreparationStageCount} / ${summary.blockedDecisionStageCount}
- capabilities / blocked candidates / explicit deferred gates: ${summary.capabilityCount} / ${summary.blockedCandidateCount} / ${summary.explicitDeferredLivePilotGateCount}
- target owner report deferred / satellite charter deferred: ${summary.targetOwnerReportDeferredCount} / ${summary.satelliteOwnerCharterDeferredCount}
- VS Code host/apply / Visual Studio launch/mutation / final confirmation / owner return: ${summary.actualVscodeExtensionDevelopmentHostExecutionCount} / ${summary.actualWorkspaceApplyEditExecutionCount} / ${summary.visualStudioLaunchCount} / ${summary.actualVisualStudioMutationExecutionCount} / ${summary.finalHumanConfirmationCapturedCount} / ${summary.realOwnerReportSubmittedCount}
- next stage: ${summary.nextStage}
`;
}

function renderDeferredBoundary(evidence) {
  const gates = evidence.deferredLivePilotConditions.map((gate) => `- ${gate}`).join("\n");
  return `# W-P53 Deferred Live-Pilot Boundary

## 中文摘要

下列条件是 W-P53 closeout 后仍必须由具体用户/owner 单独满足的 live-pilot 条件。它们不被本轮
automation、handoff 或 blocked decision 自动解除：

${gates}

任何后续工作都必须保留 metadata-only privacy、sourcesContentPolicy none、host-owned mutation、
current conflict check、final human confirmation、rollback 和 post-validation。目标项目始终由 target
owner 自行操作；本 closeout 不启动新的 W-P 周期。
`;
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
