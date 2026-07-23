import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp43-target-owner-evidence-view");
const evidencePath = path.join(outputRoot, "evidence.json");
const viewSummaryPath = path.join(outputRoot, "target-owner-evidence-view.md");
const wp41DryRunPath = path.join(rootDir, "dist", "wp41-target-owner-dry-run-evidence", "evidence.json");
const wp41CloseoutPath = path.join(rootDir, "dist", "wp41-closeout-wp42-wp43-inputs", "evidence.json");
const wp42CloseoutPath = path.join(rootDir, "dist", "wp42-closeout-wp43-inputs", "evidence.json");
const wp43HostUxPath = path.join(rootDir, "dist", "wp43-host-ux-intake", "evidence.json");
const wp43ProviderPanelPath = path.join(rootDir, "dist", "wp43-provider-review-linkage-panel", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");
const vscodeConfigPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.ts");
const vscodeConfigTestPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.test.ts");

await main();

/**
 * 准备 W-P43.5 target-owner evidence view evidence。
 * Prepare W-P43.5 target-owner evidence view evidence.
 *
 * This stage turns target-owner readiness, evidence completeness, transcript
 * slots and deferred gates into host-visible read-only views for VS Code,
 * DevTools and Visual Studio. It consumes existing target-owner, checked-apply
 * and W-P43 provider-panel evidence, but it does not execute target commands,
 * create sandboxes, branches or pull requests, run providers, call networks, or
 * enable checked apply writes.
 *
 * 中文：本阶段将 target-owner readiness、evidence completeness、transcript
 * slots 与 deferred gates 转成 VS Code、DevTools 与 Visual Studio 可见的只读
 * view。它消费既有 target-owner、checked-apply 与 W-P43 provider panel
 * evidence，但不执行目标命令、不创建 sandbox/branch/PR、不执行 provider/network，
 * 也不启用 checked apply 写入。
 *
 * @returns {Promise<void>} Writes public-safe W-P43.5 target-owner evidence.
 */
async function main() {
  const inputs = await readInputs();
  const targetOwnerViews = [
    createVscodeView(inputs),
    createDevToolsView(inputs.devtoolsCheck),
    createVisualStudioView(inputs.visualStudioCheck)
  ];
  const summary = summarize(inputs, targetOwnerViews);
  const checks = [
    check("HIA_WP43_TARGET_OWNER_VIEW_INPUTS_READY", summary.wp41DryRunReady === true
      && summary.wp41CloseoutReady === true
      && summary.wp42CloseoutReady === true
      && summary.wp43HostUxReady === true
      && summary.wp43ProviderPanelReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        wp41CloseoutReady: summary.wp41CloseoutReady,
        wp41DryRunReady: summary.wp41DryRunReady,
        wp42CloseoutReady: summary.wp42CloseoutReady,
        wp43HostUxReady: summary.wp43HostUxReady,
        wp43ProviderPanelReady: summary.wp43ProviderPanelReady
      }
    }),
    check("HIA_WP43_TARGET_OWNER_VIEW_HOSTS_READY", summary.hostViewCount === 3
      && summary.readyHostViewCount === 3
      && summary.readinessMatrixItemCount >= 12
      && summary.evidenceCompletenessCheckCount >= 12
      && summary.transcriptStepReviewCount >= 16
      && summary.handoffBindingReviewCount >= 6
      && summary.deferredGateCount >= 7
      && summary.targetOwnerActionRequiredHostCount === 3
      && summary.targetOwnerMaterialReadyHostCount === 3
      && summary.targetOwnerMaySubmitEvidenceHostCount === 3, {
      actual: {
        deferredGateCount: summary.deferredGateCount,
        evidenceCompletenessCheckCount: summary.evidenceCompletenessCheckCount,
        handoffBindingReviewCount: summary.handoffBindingReviewCount,
        readinessMatrixItemCount: summary.readinessMatrixItemCount,
        readyHostViewCount: summary.readyHostViewCount,
        targetOwnerActionRequiredHostCount: summary.targetOwnerActionRequiredHostCount,
        targetOwnerMaterialReadyHostCount: summary.targetOwnerMaterialReadyHostCount,
        targetOwnerMaySubmitEvidenceHostCount: summary.targetOwnerMaySubmitEvidenceHostCount,
        transcriptStepReviewCount: summary.transcriptStepReviewCount
      }
    }),
    check("HIA_WP43_TARGET_OWNER_VIEW_NO_EXECUTION_OR_WRITE", summary.actualDryRunExecutedCount === 0
      && summary.actualCommandTranscriptSubmittedCount === 0
      && summary.actualTargetSandboxCreatedCount === 0
      && summary.actualTargetBranchCreatedCount === 0
      && summary.actualPullRequestCreatedCount === 0
      && summary.targetOwnerExecutionClaimedCount === 0
      && summary.hiaMayRunTargetCommandsCount === 0
      && summary.hiaMayModifyTargetRepositoryCount === 0
      && summary.targetCommandsExecutedByHiaCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerNetworkExecutedCount === 0, {
      actual: {
        actualCommandTranscriptSubmittedCount: summary.actualCommandTranscriptSubmittedCount,
        actualDryRunExecutedCount: summary.actualDryRunExecutedCount,
        actualPullRequestCreatedCount: summary.actualPullRequestCreatedCount,
        actualTargetBranchCreatedCount: summary.actualTargetBranchCreatedCount,
        actualTargetSandboxCreatedCount: summary.actualTargetSandboxCreatedCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectCount: summary.directEditObjectCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandsExecutedByHiaCount: summary.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP43_TARGET_OWNER_VIEW_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
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
    contract: "hia-wp43-target-owner-evidence-view-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp43-host-confirmation-manual-packet-refresh" : "blocked",
    sourceEvidence: {
      wp41TargetOwnerDryRun: normalizePath(wp41DryRunPath),
      wp41Closeout: normalizePath(wp41CloseoutPath),
      wp42Closeout: normalizePath(wp42CloseoutPath),
      wp43HostUxIntake: normalizePath(wp43HostUxPath),
      wp43ProviderReviewPanel: normalizePath(wp43ProviderPanelPath),
      devtoolsExtensionCheck: normalizePath(devtoolsCheckPath),
      visualStudioExtensionCheck: normalizePath(visualStudioCheckPath),
      vscodeConfig: normalizePath(vscodeConfigPath),
      vscodeConfigTest: normalizePath(vscodeConfigTestPath)
    },
    targetOwnerViews,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      viewSummary: normalizePath(viewSummaryPath)
    },
    nextStageInputs: [
      {
        phase: "W-P43.6",
        topic: "host-confirmation-manual-packet-refresh",
        status: "ready-input",
        writeAuthorityGranted: false
      }
    ],
    manualChecks: [
      "确认 target-owner evidence view 只展示就绪状态与 transcript slot，仍属于 prepared input。",
      "确认 branch、PR、sandbox 与 target command 状态保持 false，除非 target owner 另行提交外部证据。",
      "确认 deferred gate 保持可见，且不会被误解释为 checked apply write enablement。"
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P43 target-owner evidence view evidence");
  assert.equal(hardFailures.length, 0, `W-P43 target-owner evidence view has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(viewSummaryPath, renderViewSummary(evidence), "utf8");
  console.log(`W-P43 target-owner evidence view evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P43 target-owner evidence view summary prepared at ${normalizePath(viewSummaryPath)}`);
}

async function readInputs() {
  const [
    wp41DryRun,
    wp41Closeout,
    wp42Closeout,
    wp43HostUx,
    wp43ProviderPanel,
    devtoolsCheck,
    visualStudioCheck,
    vscodeConfig,
    vscodeConfigTest
  ] = await Promise.all([
    readJson(wp41DryRunPath),
    readJson(wp41CloseoutPath),
    readJson(wp42CloseoutPath),
    readJson(wp43HostUxPath),
    readJson(wp43ProviderPanelPath),
    readJson(devtoolsCheckPath),
    readJson(visualStudioCheckPath),
    readFile(vscodeConfigPath, "utf8"),
    readFile(vscodeConfigTestPath, "utf8")
  ]);

  return {
    devtoolsCheck,
    visualStudioCheck,
    vscodeConfig,
    vscodeConfigTest,
    wp41Closeout,
    wp41DryRun,
    wp42Closeout,
    wp43HostUx,
    wp43ProviderPanel
  };
}

function createVscodeView(inputs) {
  const dryRunSummary = inputs.wp41DryRun.summary || {};
  const closeoutSummary = inputs.wp41Closeout.summary || {};
  const configReady = includesAny(inputs.vscodeConfig, [
    "Target-owner action required",
    "需要 target-owner 操作"
  ])
    && includesAny(inputs.vscodeConfig, [
      "Target-owner execution claimed",
      "target-owner 已声明执行"
    ])
    && inputs.vscodeConfig.includes("deferredGateVisible")
    && includesAny(inputs.vscodeConfigTest, [
      "Target-owner action required: yes",
      "需要 target-owner 操作: yes"
    ]);

  return normalizeView({
    host: "vscode",
    status: configReady ? "view-ready" : "blocked",
    contract: "hia-vscode-target-owner-evidence-view",
    readinessMatrixItemCount: dryRunSummary.readinessMatrixItemCount,
    evidenceCompletenessCheckCount: dryRunSummary.evidenceCompletenessCheckCount,
    transcriptStepReviewCount: dryRunSummary.transcriptStepReviewCount,
    handoffBindingReviewCount: dryRunSummary.handoffBindingReviewCount,
    deferredGateCount: closeoutSummary.deferredGateCount,
    targetOwnerActionRequired: dryRunSummary.targetOwnerActionRequired,
    targetOwnerMaterialReady: closeoutSummary.targetOwnerMaterialReady,
    targetOwnerMaySubmitEvidence: dryRunSummary.targetOwnerMaySubmitDryRunEvidence,
    actualDryRunExecuted: dryRunSummary.actualDryRunExecuted,
    actualCommandTranscriptSubmitted: dryRunSummary.actualCommandTranscriptSubmitted,
    actualTargetSandboxCreated: dryRunSummary.actualTargetSandboxCreated,
    actualTargetBranchCreated: dryRunSummary.actualTargetBranchCreated,
    actualPullRequestCreated: dryRunSummary.actualPullRequestOpened,
    targetOwnerExecutionClaimed: dryRunSummary.targetOwnerExecutionClaimed,
    hiaMayRunTargetCommands: dryRunSummary.hiaMayRunTargetCommands,
    hiaMayModifyTargetRepository: dryRunSummary.hiaMayModifyTargetRepository,
    targetCommandsExecutedByHia: dryRunSummary.targetCommandsExecutedByHia,
    checkedApplyWriteEnabled: false,
    workspaceWriteAllowed: number(dryRunSummary.workspaceWriteAllowedCount) > 0,
    targetRepositoryMutationAllowed: number(dryRunSummary.targetRepositoryMutationCount) > 0,
    directEditObjectCount: dryRunSummary.directEditObjectCount,
    providerNetworkExecuted: dryRunSummary.externalNetworkCallExecuted || dryRunSummary.realRemoteProviderInvocationExecuted,
    sourcesContentPolicy: dryRunSummary.sourcesContentPolicy
  });
}

function createDevToolsView(devtoolsCheck) {
  return normalizeView({
    host: "devtools",
    ...(devtoolsCheck.panel?.reviewSurface?.targetOwnerEvidenceView ?? {})
  });
}

function createVisualStudioView(visualStudioCheck) {
  const view = visualStudioCheck.reviewSurface?.targetOwnerEvidenceView ?? {};

  return normalizeView({
    host: "visual-studio",
    ...view,
    workspaceWriteAllowed: view.workspaceWriteAvailable,
    targetRepositoryMutationAllowed: view.targetRepositoryMutation
  });
}

function normalizeView(value) {
  return {
    actualCommandTranscriptSubmitted: value.actualCommandTranscriptSubmitted === true,
    actualDryRunExecuted: value.actualDryRunExecuted === true,
    actualPullRequestCreated: value.actualPullRequestCreated === true,
    actualTargetBranchCreated: value.actualTargetBranchCreated === true,
    actualTargetSandboxCreated: value.actualTargetSandboxCreated === true,
    checkedApplyWriteEnabled: value.checkedApplyWriteEnabled === true,
    contract: value.contract || "unknown",
    deferredGateCount: number(value.deferredGateCount),
    directEditObjectCount: number(value.directEditObjectCount),
    evidenceCompletenessCheckCount: number(value.evidenceCompletenessCheckCount),
    handoffBindingReviewCount: number(value.handoffBindingReviewCount),
    hiaMayModifyTargetRepository: value.hiaMayModifyTargetRepository === true,
    hiaMayRunTargetCommands: value.hiaMayRunTargetCommands === true,
    host: value.host || "unknown",
    inputMode: value.inputMode || "target-owner-evidence-read-only",
    providerNetworkExecuted: value.providerNetworkExecuted === true,
    readinessMatrixItemCount: number(value.readinessMatrixItemCount),
    sourcesContentPolicy: value.sourcesContentPolicy || "none",
    status: value.status === "input-ready" ? "view-ready" : value.status || "blocked",
    targetCommandsExecutedByHia: value.targetCommandsExecutedByHia === true,
    targetOwnerActionRequired: value.targetOwnerActionRequired === true,
    targetOwnerExecutionClaimed: value.targetOwnerExecutionClaimed === true,
    targetOwnerMaterialReady: value.targetOwnerMaterialReady === true,
    targetOwnerMaySubmitEvidence: value.targetOwnerMaySubmitEvidence === true,
    targetRepositoryMutationAllowed: value.targetRepositoryMutationAllowed === true,
    transcriptStepReviewCount: number(value.transcriptStepReviewCount),
    workspaceWriteAllowed: value.workspaceWriteAllowed === true
  };
}

function summarize(inputs, targetOwnerViews) {
  const dryRunSummary = inputs.wp41DryRun.summary || {};
  const closeoutSummary = inputs.wp41Closeout.summary || {};
  const wp42Summary = inputs.wp42Closeout.summary || {};
  const hostUxSummary = inputs.wp43HostUx.summary || {};
  const providerPanelSummary = inputs.wp43ProviderPanel.summary || {};

  return {
    wp41DryRunReady: inputs.wp41DryRun.status === "ready-for-wp41-closeout-and-wp42-wp43-inputs",
    wp41CloseoutReady: inputs.wp41Closeout.status === "ready-for-wp42-checked-apply-hardening-and-wp43-host-ux-inputs",
    wp42CloseoutReady: inputs.wp42Closeout.status === "ready-for-wp43-host-owned-apply-ux-inputs",
    wp43HostUxReady: inputs.wp43HostUx.status === "ready-for-wp43-host-surface-contract",
    wp43ProviderPanelReady: inputs.wp43ProviderPanel.status === "ready-for-wp43-target-owner-evidence-view-and-deferred-gates",
    inputHardFailureCount: number(dryRunSummary.hardFailureCount)
      + number(closeoutSummary.hardFailureCount)
      + number(wp42Summary.hardFailureCount)
      + number(hostUxSummary.hardFailureCount)
      + number(providerPanelSummary.hardFailureCount),
    hostViewCount: targetOwnerViews.length,
    readyHostViewCount: targetOwnerViews.filter((view) => view.status === "view-ready").length,
    readinessMatrixItemCount: number(dryRunSummary.readinessMatrixItemCount),
    evidenceCompletenessCheckCount: number(dryRunSummary.evidenceCompletenessCheckCount),
    transcriptStepReviewCount: number(dryRunSummary.transcriptStepReviewCount),
    handoffBindingReviewCount: number(dryRunSummary.handoffBindingReviewCount),
    deferredGateCount: Math.max(number(closeoutSummary.deferredGateCount), number(wp42Summary.deferredGateCount)),
    targetOwnerActionRequiredHostCount: targetOwnerViews.filter((view) => view.targetOwnerActionRequired === true).length,
    targetOwnerMaterialReadyHostCount: targetOwnerViews.filter((view) => view.targetOwnerMaterialReady === true).length,
    targetOwnerMaySubmitEvidenceHostCount: targetOwnerViews.filter((view) => view.targetOwnerMaySubmitEvidence === true).length,
    actualDryRunExecutedCount: targetOwnerViews.filter((view) => view.actualDryRunExecuted === true).length + boolCount(dryRunSummary.actualDryRunExecuted) + boolCount(closeoutSummary.actualDryRunExecuted),
    actualCommandTranscriptSubmittedCount: targetOwnerViews.filter((view) => view.actualCommandTranscriptSubmitted === true).length + boolCount(dryRunSummary.actualCommandTranscriptSubmitted) + boolCount(closeoutSummary.actualCommandTranscriptSubmitted),
    actualTargetSandboxCreatedCount: targetOwnerViews.filter((view) => view.actualTargetSandboxCreated === true).length + boolCount(dryRunSummary.actualTargetSandboxCreated) + boolCount(closeoutSummary.actualTargetSandboxCreated),
    actualTargetBranchCreatedCount: targetOwnerViews.filter((view) => view.actualTargetBranchCreated === true).length + boolCount(dryRunSummary.actualTargetBranchCreated) + boolCount(closeoutSummary.actualTargetBranchCreated),
    actualPullRequestCreatedCount: targetOwnerViews.filter((view) => view.actualPullRequestCreated === true).length + boolCount(dryRunSummary.actualPullRequestOpened) + boolCount(closeoutSummary.actualPullRequestOpened),
    targetOwnerExecutionClaimedCount: targetOwnerViews.filter((view) => view.targetOwnerExecutionClaimed === true).length + boolCount(dryRunSummary.targetOwnerExecutionClaimed) + boolCount(closeoutSummary.targetOwnerExecutionClaimed),
    hiaMayRunTargetCommandsCount: targetOwnerViews.filter((view) => view.hiaMayRunTargetCommands === true).length + boolCount(dryRunSummary.hiaMayRunTargetCommands) + boolCount(closeoutSummary.hiaMayRunTargetCommands),
    hiaMayModifyTargetRepositoryCount: targetOwnerViews.filter((view) => view.hiaMayModifyTargetRepository === true).length + boolCount(dryRunSummary.hiaMayModifyTargetRepository) + boolCount(closeoutSummary.hiaMayModifyTargetRepository),
    targetCommandsExecutedByHiaCount: targetOwnerViews.filter((view) => view.targetCommandsExecutedByHia === true).length + boolCount(dryRunSummary.targetCommandsExecutedByHia) + boolCount(closeoutSummary.targetCommandsExecutedByHia) + number(wp42Summary.targetCommandExecutedByHiaCount),
    checkedApplyWriteEnabledCount: targetOwnerViews.filter((view) => view.checkedApplyWriteEnabled === true).length + boolCount(wp42Summary.checkedApplyWriteEnabled),
    workspaceWriteAllowedCount: targetOwnerViews.filter((view) => view.workspaceWriteAllowed === true).length + number(dryRunSummary.workspaceWriteAllowedCount) + number(closeoutSummary.workspaceWriteAllowedCount) + number(wp42Summary.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: targetOwnerViews.filter((view) => view.targetRepositoryMutationAllowed === true).length + number(dryRunSummary.targetRepositoryMutationCount) + number(closeoutSummary.targetRepositoryMutationCount) + number(wp42Summary.targetRepositoryMutationCount),
    directEditObjectCount: targetOwnerViews.reduce((sum, view) => sum + number(view.directEditObjectCount), 0) + number(dryRunSummary.directEditObjectCount) + number(closeoutSummary.directEditObjectCount) + number(wp42Summary.directEditObjectCount),
    providerNetworkExecutedCount: targetOwnerViews.filter((view) => view.providerNetworkExecuted === true).length + boolCount(dryRunSummary.externalNetworkCallExecuted) + boolCount(dryRunSummary.realRemoteProviderInvocationExecuted) + boolCount(closeoutSummary.externalNetworkCallExecuted) + boolCount(closeoutSummary.realRemoteProviderInvocationExecuted) + number(wp42Summary.providerNetworkExecutedCount),
    credentialValueIncludedCount: number(dryRunSummary.credentialValueIncludedCount) + number(closeoutSummary.credentialValueIncludedCount) + number(wp42Summary.credentialValueIncludedCount),
    sourceReferenceIncludedCount: number(dryRunSummary.sourceReferenceIncludedCount) + number(closeoutSummary.sourceReferenceIncludedCount) + number(wp42Summary.sourceReferenceIncludedCount),
    sourceTextIncludedCount: number(dryRunSummary.sourceTextIncludedCount) + number(closeoutSummary.sourceTextIncludedCount),
    credentialMaterialMarkerCount: number(dryRunSummary.credentialMaterialMarkerCount) + number(closeoutSummary.credentialMaterialMarkerCount),
    forbiddenDocumentTextMarkerCount: number(dryRunSummary.forbiddenDocumentTextMarkerCount) + number(closeoutSummary.forbiddenDocumentTextMarkerCount) + number(wp42Summary.forbiddenDocumentTextMarkerCount),
    pathExposureCount: number(dryRunSummary.pathExposureCount) + number(closeoutSummary.pathExposureCount) + number(wp42Summary.pathExposureCount),
    sourcesContentPolicy: targetOwnerViews.every((view) => view.sourcesContentPolicy === "none")
      && (dryRunSummary.sourcesContentPolicy ?? "none") === "none"
      && (closeoutSummary.sourcesContentPolicy ?? "none") === "none"
      && (wp42Summary.sourcesContentPolicy ?? "none") === "none"
      ? "none"
      : "mixed"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function number(value) {
  return Number(value ?? 0);
}

function boolCount(value) {
  return value === true ? 1 : 0;
}

function includesAny(text, candidates) {
  return candidates.some((candidate) => text.includes(candidate));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderViewSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P43.5 Target-Owner Evidence View / Target Owner 证据视图

## 摘要

- status / 状态: \`${evidence.status}\`
- host views / 宿主视图: ${summary.readyHostViewCount} / ${summary.hostViewCount} ready
- readiness matrix items / 就绪矩阵项: ${summary.readinessMatrixItemCount}
- evidence completeness checks / 证据完整性检查: ${summary.evidenceCompletenessCheckCount}
- transcript steps / 命令记录步骤: ${summary.transcriptStepReviewCount}
- handoff bindings / 交接绑定: ${summary.handoffBindingReviewCount}
- deferred gates / 延迟 gate: ${summary.deferredGateCount}
- target-owner action/material/evidence hosts / 目标方操作、材料、证据宿主: ${summary.targetOwnerActionRequiredHostCount} / ${summary.targetOwnerMaterialReadyHostCount} / ${summary.targetOwnerMaySubmitEvidenceHostCount}
- dry-run / transcript / sandbox / branch / PR / execution claimed / 执行状态: ${summary.actualDryRunExecutedCount} / ${summary.actualCommandTranscriptSubmittedCount} / ${summary.actualTargetSandboxCreatedCount} / ${summary.actualTargetBranchCreatedCount} / ${summary.actualPullRequestCreatedCount} / ${summary.targetOwnerExecutionClaimedCount}
- target commands by HIA / target mutation / checked apply write / HIA 命令、目标变更、写入: ${summary.targetCommandsExecutedByHiaCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyWriteEnabledCount}
- sourcesContent policy / 源码正文策略: ${summary.sourcesContentPolicy}

## 下一阶段

W-P43.6 可以基于这些只读 target-owner views 刷新 host confirmation manual packets。
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(serialized, label) {
  const forbidden = [
    /[A-Za-z]:[\\/]/,
    /(?:^|[\\/])work-zone(?:[\\/]|$)/i,
    /(?:^|[\\/])Users[\\/]/i,
    /"sourcesContent"\s*:/i,
    /sk-[A-Za-z0-9_-]{8,}/,
    /ghp_[A-Za-z0-9_]{8,}/,
    /npm_[A-Za-z0-9_]{8,}/
  ];
  const hit = forbidden.find((pattern) => pattern.test(serialized));
  assert.equal(hit, undefined, `${label} contains a forbidden private marker: ${hit}`);
}
