import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp53-target-owner-adoption-handoff-refresh");

await main();

/**
 * 生成 W-P53.5 target-owner adoption handoff refresh evidence。
 *
 * 中文：本脚本只读取既有 public-safe evidence，刷新 owner 回传、验证和三宿主 review 的交接矩阵。
 * 它不读取、构建、运行或修改 target repository；不启动 VS Code、DevTools 或 Visual Studio；不调用
 * host editor API，也不执行 provider/network 或收集 report/source body。
 * @lang en Generates W-P53.5 target-owner adoption-handoff-refresh evidence from existing public-safe
 * inputs only. It neither accesses target repositories nor launches hosts, calls editor APIs, executes
 * providers or network operations, or collects report/source bodies.
 * @returns {Promise<void>} <lang><zh-CN>写入 public-safe handoff evidence。</zh-CN><en>Writes public-safe handoff evidence.</en></lang>
 */
async function main() {
  const inputs = readInputs();
  const hostReviewMatrix = createHostReviewMatrix(inputs);
  const summary = summarize(inputs, hostReviewMatrix);
  const checks = createChecks(summary, hostReviewMatrix);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp53-target-owner-adoption-handoff-refresh-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P53.5",
    status: hardFailures.length === 0
      ? "ready-for-wp53-real-pilot-authorization-decision-and-manual-evidence"
      : "blocked-by-wp53-target-owner-adoption-handoff-refresh",
    sourceInputs: createSourceInputs(inputs),
    handoffPolicy: {
      policy: "owner-submitted-metadata-only-return-validation-with-three-host-review",
      scenarioHandoffCount: summary.scenarioHandoffCount,
      ownerActionRequiredScenarioCount: summary.ownerActionRequiredScenarioCount,
      targetOwnerReportDeferredCount: summary.targetOwnerReportDeferredCount,
      satelliteOwnerCharterDeferredCount: summary.satelliteOwnerCharterDeferredCount,
      selfSandboxManualEvidenceRouteCount: summary.selfSandboxManualEvidenceRouteCount,
      realOwnerReportSubmittedCount: summary.realOwnerReportSubmittedCount,
      targetRepositoryMayBeReadByHia: false,
      targetRepositoryMayBeMutatedByHia: false,
      targetCommandMayBeExecutedByHia: false,
      hostEditorApiMayBeCalledByThisStage: false,
      providerNetworkMayBeExecutedByHia: false,
      ownerReportBodyMayBeStored: false,
      sourceBodyMayBeStored: false,
      sourcesContentPolicy: "none"
    },
    routeHandoffs: createRouteHandoffs(inputs),
    returnValidation: {
      reportSubmissionSlotReady: summary.ownerReportSubmissionSlotReady,
      metadataOnlyRequired: true,
      ownerAttestationRequired: true,
      redactionAttestationRequired: true,
      validatorAcceptanceRequired: true,
      hostReviewObservationRequired: true,
      finalHumanConfirmationRequiredForAnyLiveHostPilot: true,
      explicitAuthorityRequiredForAnyLivePilot: true,
      acceptedOwnerReturnCount: 0,
      packetBodyStoredCount: 0,
      sourceBodyStoredCount: 0,
      reportExpiryInvented: false
    },
    threeHostReview: hostReviewMatrix,
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
      overview: "dist/wp53-target-owner-adoption-handoff-refresh/target-owner-adoption-handoff-refresh.md",
      threeHostReviewMatrix: "dist/wp53-target-owner-adoption-handoff-refresh/three-host-review-matrix.md"
    }
  };
  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized, "W-P53.5 evidence");
  assert.equal(hardFailures.length, 0, `W-P53.5 has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  await writeFile(path.join(outputRoot, "target-owner-adoption-handoff-refresh.md"), renderOverview(evidence), "utf8");
  await writeFile(path.join(outputRoot, "three-host-review-matrix.md"), renderThreeHostReviewMatrix(evidence), "utf8");
  console.log(`W-P53.5 target-owner adoption handoff refresh evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/**
 * 读取已提交的 handoff、host packet 与两条宿主 route evidence，不重放历史阶段。
 *
 * @lang en Reads committed handoff, host-packet, and host-route evidence without replaying earlier stages.
 */
function readInputs() {
  const inputs = {
    wp53Selection: readJson(path.join(root, "dist", "wp53-target-owner-evidence-currentness-and-trial-selection", "evidence.json")),
    wp53Vscode: readJson(path.join(root, "dist", "wp53-vscode-host-owned-self-sandbox-pilot-gate", "evidence.json")),
    wp53VisualStudio: readJson(path.join(root, "dist", "wp53-visual-studio-snapshot-mutation-readiness", "evidence.json")),
    wp46Handoff: readJson(path.join(root, "dist", "wp46-target-owner-handoff-report-packet", "evidence.json")),
    wp47HostConfirmation: readJson(path.join(root, "dist", "wp47-host-confirmation-surface-pilot-packet", "evidence.json"))
  };
  assert.equal(inputs.wp53Selection.status, "ready-for-wp53-vscode-host-owned-self-sandbox-pilot-gate");
  assert.equal(inputs.wp53Vscode.status, "ready-for-wp53-visual-studio-snapshot-mutation-readiness");
  assert.equal(inputs.wp53VisualStudio.status, "ready-for-wp53-target-owner-adoption-handoff-refresh");
  assert.equal(inputs.wp46Handoff.status, "ready-for-wp46-closeout-and-wp47-wp48-inputs");
  assert.equal(inputs.wp47HostConfirmation.status, "ready-for-wp47-target-owner-pilot-dry-run-report-intake");
  return inputs;
}

/**
 * 建立三宿主只读 review 矩阵，并明确两条宿主 route 都没有实际执行。
 *
 * @lang en Builds a three-host read-only review matrix and records that neither host route executed.
 */
function createHostReviewMatrix(inputs) {
  const hostDefinitions = [
    {
      hostId: "vscode",
      confirmationHostId: "vscode",
      futureRoute: "fixed-self-sandbox-command-prepared-no-live-execution",
      liveHostExecutionCount: number(inputs.wp53Vscode.executionBoundary?.actualVscodeExtensionDevelopmentHostExecutionCount),
      hostMutationExecutionCount: number(inputs.wp53Vscode.executionBoundary?.actualWorkspaceApplyEditExecutionCount),
      finalHumanConfirmationCapturedCount: inputs.wp53Vscode.executionBoundary?.finalHumanConfirmationCaptured === true ? 1 : 0
    },
    {
      hostId: "devtools",
      confirmationHostId: "chrome-devtools",
      futureRoute: "review-only-no-host-mutation-route",
      liveHostExecutionCount: 0,
      hostMutationExecutionCount: 0,
      finalHumanConfirmationCapturedCount: 0
    },
    {
      hostId: "visual-studio",
      confirmationHostId: "visual-studio",
      futureRoute: "immutable-versioned-snapshot-readiness-only-no-live-execution",
      liveHostExecutionCount: number(inputs.wp53VisualStudio.executionBoundary?.visualStudioLaunchCount),
      hostMutationExecutionCount: number(inputs.wp53VisualStudio.executionBoundary?.actualVisualStudioMutationExecutionCount),
      finalHumanConfirmationCapturedCount: number(inputs.wp53VisualStudio.executionBoundary?.finalHumanConfirmationCapturedCount)
    }
  ];
  return hostDefinitions.map((definition) => {
    const reviewProjectionBindingCount = inputs.wp46Handoff.handoffBindings.filter((binding) =>
      binding.hostProjectionRefs.some((ref) => ref.hostId === definition.hostId && ref.readOnly === true && ref.checkedApplyWriteEnabled === false)
    ).length;
    const confirmationPacket = inputs.wp47HostConfirmation.confirmationPackets.find((packet) => packet.host === definition.confirmationHostId);
    const hostSurface = inputs.wp47HostConfirmation.hostSurfaces.find((surface) => surface.host === definition.confirmationHostId);
    return {
      hostId: definition.hostId,
      reviewProjectionBindingCount,
      reviewProjectionReady: reviewProjectionBindingCount === 4,
      confirmationPacketReady: confirmationPacket?.status === "packet-ready",
      finalHumanConfirmationVisible: hostSurface?.visibleSignals?.finalHumanConfirmationRequired === true
        && hostSurface?.actionSummary?.finalConfirmActionState === "not-collected-by-this-stage",
      checkedApplyWriteDisabled: hostSurface?.visibleSignals?.checkedApplyWriteDisabled === true
        && hostSurface?.actionSummary?.checkedApplyActionState === "disabled",
      futureRoute: definition.futureRoute,
      liveHostExecutionCount: definition.liveHostExecutionCount,
      hostMutationExecutionCount: definition.hostMutationExecutionCount,
      finalHumanConfirmationCapturedCount: definition.finalHumanConfirmationCapturedCount,
      grantsWriteAuthority: false,
      sourcesContentPolicy: "none"
    };
  });
}

/**
 * 汇总四条 owner handoff、三宿主 review 和全部零执行边界。
 *
 * @lang en Summarizes four owner handoffs, three-host review, and the all-zero execution boundary.
 */
function summarize(inputs, hostReviewMatrix) {
  const selection = inputs.wp53Selection.summary ?? {};
  const handoff = inputs.wp46Handoff.summary ?? {};
  const vscode = inputs.wp53Vscode.summary ?? {};
  const visualStudio = inputs.wp53VisualStudio.summary ?? {};
  return {
    phase: "W-P53.5",
    inputEvidenceCount: 5,
    readyInputEvidenceCount: 5,
    inputHardFailureCount: sum([
      selection.hardFailureCount,
      handoff.hardFailureCount,
      inputs.wp47HostConfirmation.summary?.hardFailureCount,
      vscode.hardFailureCount,
      visualStudio.hardFailureCount
    ]),
    scenarioHandoffCount: number(handoff.scenarioHandoffBindingCount),
    ownerActionRequiredScenarioCount: number(handoff.handoffOwnerActionRequiredCount),
    selfSandboxManualEvidenceRouteCount: number(selection.selfSandboxCandidateCount),
    targetOwnerReportDeferredCount: number(selection.targetOwnerReportDeferredCount),
    satelliteOwnerCharterDeferredCount: number(selection.satelliteOwnerCharterDeferredCount),
    realOwnerReportSubmittedCount: number(selection.realOwnerReportSubmittedCount),
    ownerReportSubmissionSlotReady: selection.ownerReportSubmissionSlotReady === true,
    threeHostReviewCount: hostReviewMatrix.length,
    readyThreeHostReviewCount: hostReviewMatrix.filter((item) => item.reviewProjectionReady && item.confirmationPacketReady).length,
    finalHumanConfirmationVisibleHostCount: hostReviewMatrix.filter((item) => item.finalHumanConfirmationVisible).length,
    checkedApplyWriteDisabledHostCount: hostReviewMatrix.filter((item) => item.checkedApplyWriteDisabled).length,
    actualVscodeExtensionDevelopmentHostExecutionCount: number(inputs.wp53Vscode.executionBoundary?.actualVscodeExtensionDevelopmentHostExecutionCount),
    actualWorkspaceApplyEditExecutionCount: number(inputs.wp53Vscode.executionBoundary?.actualWorkspaceApplyEditExecutionCount),
    actualVisualStudioMutationExecutionCount: number(inputs.wp53VisualStudio.executionBoundary?.actualVisualStudioMutationExecutionCount),
    visualStudioLaunchCount: number(inputs.wp53VisualStudio.executionBoundary?.visualStudioLaunchCount),
    finalHumanConfirmationCapturedCount: sum(hostReviewMatrix.map((item) => item.finalHumanConfirmationCapturedCount)),
    targetRepositoryMutationCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    providerNetworkExecutedCount: 0,
    reportBodyStoredCount: 0,
    sourceBodyIncludedCount: 0,
    snapshotBodyIncludedCount: 0,
    rollbackBodyIncludedCount: 0,
    digestValueIncludedCount: 0,
    absolutePathIncludedCount: 0,
    sourcesContentPolicy: "none",
    explicitAuthorityRequiredForAnyLivePilot: true,
    nextStage: "W-P53.6 Real Pilot Authorization Decision And Manual Evidence"
  };
}

/**
 * 将已有 scenario selection 投影为只含状态和 gate 的 owner handoff。
 *
 * @lang en Projects existing scenario selections into owner handoffs containing status and gates only.
 */
function createRouteHandoffs(inputs) {
  return inputs.wp53Selection.trialSelections.map((selection) => ({
    scenarioId: selection.scenarioId,
    kind: selection.kind,
    handoffStatus: selection.handoffStatus,
    selection: selection.selection,
    ownerActionRequired: selection.ownerActionRequired === true,
    ownerReportRequiredBeforeTargetTrial: selection.requiresOwnerReportBeforeTargetTrial === true,
    explicitAuthorityRequiredBeforeAnyWrite: selection.requiresExplicitUserConfirmationBeforeWrite === true,
    returnPolicy: selection.kind === "hia-self"
      ? "manual-host-evidence-after-explicit-user-confirmation"
      : selection.kind === "target-project"
        ? "owner-submitted-metadata-only-report-after-owner-action"
        : "separate-satellite-owner-charter-before-adoption-selection",
    targetRepositoryAccessedByThisStage: false,
    targetRepositoryMutatedByThisStage: false,
    reportBodyStoredByThisStage: false,
    sourcesContentPolicy: "none"
  }));
}

function createChecks(summary, hostReviewMatrix) {
  return [
    check("all-inputs-ready", summary.inputEvidenceCount === 5 && summary.readyInputEvidenceCount === 5 && summary.inputHardFailureCount === 0,
      "The W-P46/W-P47 and W-P53.2/W-P53.3/W-P53.4 public-safe inputs are ready without hard failures."),
    check("four-owner-handoffs-preserved", summary.scenarioHandoffCount === 4
      && summary.ownerActionRequiredScenarioCount === 4
      && summary.selfSandboxManualEvidenceRouteCount === 1
      && summary.targetOwnerReportDeferredCount === 2
      && summary.satelliteOwnerCharterDeferredCount === 1,
    "All four owner handoffs remain explicit: one HIA self manual route, two target-owner report gates, and one satellite charter gate."),
    check("owner-return-not-invented", summary.realOwnerReportSubmittedCount === 0 && summary.ownerReportSubmissionSlotReady,
      "No target-owner return is invented; a metadata-only submission slot remains ready."),
    check("three-host-review-ready-and-read-only", summary.threeHostReviewCount === 3
      && summary.readyThreeHostReviewCount === 3
      && summary.finalHumanConfirmationVisibleHostCount === 3
      && summary.checkedApplyWriteDisabledHostCount === 3
      && hostReviewMatrix.every((item) => item.grantsWriteAuthority === false),
    "VS Code, DevTools, and Visual Studio each retain a read-only review/confirmation packet without a granted write action."),
    check("host-routes-not-upgraded-to-live-pilot", summary.actualVscodeExtensionDevelopmentHostExecutionCount === 0
      && summary.actualWorkspaceApplyEditExecutionCount === 0
      && summary.actualVisualStudioMutationExecutionCount === 0
      && summary.visualStudioLaunchCount === 0
      && summary.finalHumanConfirmationCapturedCount === 0,
    "The VS Code self-sandbox and Visual Studio snapshot routes remain readiness-only; no live host mutation or final confirmation is claimed."),
    check("no-target-provider-or-write-boundary-break", summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.explicitAuthorityRequiredForAnyLivePilot,
    "This handoff refresh grants no target mutation, checked apply, workspace write, or provider network execution."),
    check("privacy-boundary-intact", summary.reportBodyStoredCount === 0
      && summary.sourceBodyIncludedCount === 0
      && summary.snapshotBodyIncludedCount === 0
      && summary.rollbackBodyIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.absolutePathIncludedCount === 0
      && summary.sourcesContentPolicy === "none",
    "Public handoff evidence remains metadata-only and excludes private report/source/snapshot/rollback material.")
  ];
}

function createSourceInputs(inputs) {
  return [
    sourceInput("W-P53.2", inputs.wp53Selection),
    sourceInput("W-P53.3", inputs.wp53Vscode),
    sourceInput("W-P53.4", inputs.wp53VisualStudio),
    sourceInput("W-P46.6", inputs.wp46Handoff),
    sourceInput("W-P47.5", inputs.wp47HostConfirmation)
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

function renderOverview(evidence) {
  const summary = evidence.summary;
  return `# W-P53.5 Target-Owner Adoption Handoff Refresh

## 中文摘要

W-P53.5 将 W-P46/W-P47 的 owner handoff 和三宿主 review packet，与 W-P53.2-W-P53.4
的 current selection、VS Code self-sandbox route、Visual Studio snapshot route 对齐。四条
handoff 全部保留：一个 HIA self manual host evidence route、两个等待 target owner metadata-only
report 的 target route，以及一个等待独立 satellite owner charter 的 route。

本阶段没有访问 target repository，也没有启动 VS Code、DevTools 或 Visual Studio。三宿主仅保留
read-only review 与 confirmation packet；checked apply action 仍 disabled。W-P53.3 与 W-P53.4
不因此变成 live pilot：VS Code host/apply、Visual Studio launch/mutation、final human confirmation
和 target owner return 仍都是 0。

## Summary

- status: ${evidence.status}
- handoffs / self route / target deferred / satellite deferred: ${summary.scenarioHandoffCount} / ${summary.selfSandboxManualEvidenceRouteCount} / ${summary.targetOwnerReportDeferredCount} / ${summary.satelliteOwnerCharterDeferredCount}
- three-host review ready / final confirmation visible / write disabled: ${summary.readyThreeHostReviewCount} / ${summary.finalHumanConfirmationVisibleHostCount} / ${summary.checkedApplyWriteDisabledHostCount}
- owner returns / VS Code host execution / VS Code apply / VS mutation: ${summary.realOwnerReportSubmittedCount} / ${summary.actualVscodeExtensionDevelopmentHostExecutionCount} / ${summary.actualWorkspaceApplyEditExecutionCount} / ${summary.actualVisualStudioMutationExecutionCount}
- next stage: ${summary.nextStage}
`;
}

function renderThreeHostReviewMatrix(evidence) {
  const rows = evidence.threeHostReview.map((item) => `| ${item.hostId} | ${item.reviewProjectionBindingCount} | ${item.confirmationPacketReady} | ${item.finalHumanConfirmationVisible} | ${item.checkedApplyWriteDisabled} | ${item.liveHostExecutionCount} | ${item.hostMutationExecutionCount} | ${item.futureRoute} |`).join("\n");
  return `# W-P53.5 Three-Host Review Matrix

## 中文摘要

这张表只说明 owner handoff 的 read-only review / confirmation packet 是否仍可见，以及每条未来
route 是否保持零执行。它不授予任何宿主、provider、LSP 或 HIA automation 写入权。

| Host | Read-only projection bindings | Confirmation packet ready | Final confirmation visible | Checked apply disabled | Live host execution | Host mutation execution | Future route |
| --- | ---: | --- | --- | --- | ---: | ---: | --- |
${rows}

所有真正的 live pilot 都仍需要具体范围、owner、host、最终确认、rollback、validation 与 privacy
条件；缺失任一条件时，W-P53.6 只能记录 blocked result。
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
