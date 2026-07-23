import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp44-closeout-downstream-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutSummaryPath = path.join(outputRoot, "wp44-closeout-summary.md");
const downstreamInputsPath = path.join(outputRoot, "wp45-wp47-downstream-inputs.md");
const deferredGatesPath = path.join(outputRoot, "wp44-deferred-gates.md");
const readinessPath = path.join(rootDir, "dist", "wp44-runtime-capture-readiness-audit", "evidence.json");
const vscodeManualPath = path.join(rootDir, "dist", "wp44-vscode-manual-runtime-capture", "evidence.json");
const devtoolsManualPath = path.join(rootDir, "dist", "wp44-devtools-manual-runtime-capture", "evidence.json");
const visualStudioRoutePath = path.join(rootDir, "dist", "wp44-visual-studio-runtime-route-decision", "evidence.json");
const normalizationPath = path.join(rootDir, "dist", "wp44-runtime-evidence-normalization", "evidence.json");
const ingestionPath = path.join(rootDir, "dist", "wp44-host-evidence-ingestion-redaction-check", "evidence.json");

await main();

/**
 * 生成 W-P44 closeout 与 W-P45/W-P46/W-P47 下游输入。
 * Generate W-P44 closeout and W-P45/W-P46/W-P47 downstream inputs.
 *
 * This stage closes the W-P44 real host runtime capture execution cycle. It
 * summarizes prepared/manual/route/ingestion evidence, keeps unarchived manual
 * confirmations out of captured state, and forwards explicit gates for the next
 * controlled-provider, target-owner and checked-apply cycles.
 *
 * 中文：本阶段收口 W-P44 真实宿主 runtime capture execution 周期。它汇总
 * prepared/manual/route/ingestion evidence，继续避免把未归档的手工确认误标为
 * captured，并为后续 provider、target-owner 与 checked apply 周期输出明确 gate。
 *
 * @returns {Promise<void>} Writes public-safe W-P44 closeout evidence and docs.
 */
async function main() {
  const inputs = await readInputs();
  const closeout = createCloseout(inputs);
  const downstreamInputs = createDownstreamInputs(inputs);
  const deferredGates = createDeferredGates(inputs);
  const summary = summarize(inputs, closeout, downstreamInputs, deferredGates);
  const checks = [
    check("HIA_WP44_CLOSEOUT_INPUTS_READY", summary.readyInputCount === 6
      && summary.inputHardFailureCount === 0
      && inputs.readiness.status === "ready-for-wp44-vscode-manual-runtime-capture"
      && inputs.vscodeManual.status === "ready-for-human-vscode-runtime-capture"
      && inputs.devtoolsManual.status === "ready-for-human-devtools-runtime-capture"
      && inputs.visualStudioRoute.status === "ready-for-wp44-runtime-evidence-normalization"
      && inputs.normalization.status === "ready-for-wp44-host-evidence-ingestion"
      && inputs.ingestion.status === "ready-for-wp44-closeout-and-downstream-inputs", {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        inputStatuses: closeout.inputStatuses,
        readyInputCount: summary.readyInputCount
      }
    }),
    check("HIA_WP44_CLOSEOUT_HOST_LEDGER_READY", summary.hostLedgerEntryCount === 3
      && summary.acceptedObservationOnlyCount === 2
      && summary.acceptedRouteDecisionOnlyCount === 1
      && summary.redactionControlPassCount === summary.redactionControlCount
      && summary.redactionControlCount >= 10, {
      actual: {
        acceptedObservationOnlyCount: summary.acceptedObservationOnlyCount,
        acceptedRouteDecisionOnlyCount: summary.acceptedRouteDecisionOnlyCount,
        hostLedgerEntryCount: summary.hostLedgerEntryCount,
        redactionControlCount: summary.redactionControlCount,
        redactionControlPassCount: summary.redactionControlPassCount
      }
    }),
    check("HIA_WP44_CLOSEOUT_NO_CAPTURE_OVERCLAIM", summary.manualVerificationConfirmedCount === 2
      && summary.routeDecisionExecutedCount === 1
      && summary.capturedArchivedCount === 0
      && summary.runtimeCaptureArchivedCount === 0
      && summary.captureCompletionClaimedCount === 0
      && summary.releaseGradeArchivePendingCount === 2
      && summary.visualStudioImplementationPendingCount === 1, {
      actual: {
        capturedArchivedCount: summary.capturedArchivedCount,
        captureCompletionClaimedCount: summary.captureCompletionClaimedCount,
        manualVerificationConfirmedCount: summary.manualVerificationConfirmedCount,
        releaseGradeArchivePendingCount: summary.releaseGradeArchivePendingCount,
        routeDecisionExecutedCount: summary.routeDecisionExecutedCount,
        runtimeCaptureArchivedCount: summary.runtimeCaptureArchivedCount,
        visualStudioImplementationPendingCount: summary.visualStudioImplementationPendingCount
      }
    }),
    check("HIA_WP44_CLOSEOUT_NO_EXECUTION_OR_WRITE", summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0
      && summary.targetCommandsExecutedByHiaCount === 0
      && summary.targetOwnerExecutionClaimedCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecutedCount: summary.externalNetworkCallExecutedCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandsExecutedByHiaCount: summary.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP44_CLOSEOUT_PRIVACY_CLEAN", summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.documentContentIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.sourcesContentPolicyNoneCount >= 3, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedCount: summary.digestValueIncludedCount,
        documentContentIncludedCount: summary.documentContentIncludedCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicyNoneCount: summary.sourcesContentPolicyNoneCount
      }
    }),
    check("HIA_WP44_CLOSEOUT_DOWNSTREAM_READY", summary.downstreamInputCount === 6
      && summary.readyDownstreamInputCount === 6
      && downstreamInputs.some((input) => input.phase === "W-P45")
      && downstreamInputs.some((input) => input.phase === "W-P46")
      && downstreamInputs.some((input) => input.phase === "W-P47")
      && downstreamInputs.some((input) => input.phase === "G-VS-P5-or-later")
      && downstreamInputs.some((input) => input.phase === "C-HIA-P3"), {
      actual: {
        downstreamInputCount: summary.downstreamInputCount,
        phases: downstreamInputs.map((input) => input.phase),
        readyDownstreamInputCount: summary.readyDownstreamInputCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp44-closeout-downstream-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp45-controlled-remote-provider-execution-slice" : "blocked",
    sourceEvidence: {
      runtimeCaptureReadiness: normalizePath(readinessPath),
      vscodeManualCapturePacket: normalizePath(vscodeManualPath),
      devtoolsManualCapturePacket: normalizePath(devtoolsManualPath),
      visualStudioRouteDecision: normalizePath(visualStudioRoutePath),
      runtimeEvidenceNormalization: normalizePath(normalizationPath),
      hostEvidenceIngestionRedactionCheck: normalizePath(ingestionPath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    closeout,
    downstreamInputs,
    deferredGates,
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutSummaryPath),
      downstreamInputs: normalizePath(downstreamInputsPath),
      deferredGates: normalizePath(deferredGatesPath)
    },
    nextStageInputs: downstreamInputs.map((input) => ({
      phase: input.phase,
      topic: input.topic,
      status: input.status,
      writeAuthorityGranted: input.writeAuthorityGranted
    }))
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P44 closeout downstream inputs");
  assert.equal(hardFailures.length, 0, `W-P44 closeout has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummary(closeout, summary), "utf8");
  await writeFile(downstreamInputsPath, renderDownstreamInputs(downstreamInputs), "utf8");
  await writeFile(deferredGatesPath, renderDeferredGates(deferredGates), "utf8");
  console.log(`W-P44 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P44 closeout summary prepared at ${normalizePath(closeoutSummaryPath)}`);
  console.log(`W-P45/W-P47 downstream inputs prepared at ${normalizePath(downstreamInputsPath)}`);
}

async function readInputs() {
  const [
    readiness,
    vscodeManual,
    devtoolsManual,
    visualStudioRoute,
    normalization,
    ingestion
  ] = await Promise.all([
    readJson(readinessPath),
    readJson(vscodeManualPath),
    readJson(devtoolsManualPath),
    readJson(visualStudioRoutePath),
    readJson(normalizationPath),
    readJson(ingestionPath)
  ]);

  return {
    devtoolsManual,
    ingestion,
    normalization,
    readiness,
    visualStudioRoute,
    vscodeManual
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createCloseout(inputs) {
  return {
    cycleGroupId: "C-HIA-P2",
    phase: "W-P44",
    status: "completed-first-round",
    completedStages: [
      "W-P44.1 runtime capture readiness audit and packet freeze",
      "W-P44.2 VS Code manual capture packet and user-confirmed observation",
      "W-P44.3 DevTools manual capture packet and user-confirmed observation",
      "W-P44.4 Visual Studio route execution decision",
      "W-P44.5 runtime evidence normalization with real slots",
      "W-P44.6 host evidence ingestion and public-safe redaction check",
      "W-P44.7 closeout and downstream inputs"
    ],
    inputStatuses: {
      readiness: inputs.readiness.status,
      vscodeManual: inputs.vscodeManual.status,
      devtoolsManual: inputs.devtoolsManual.status,
      visualStudioRoute: inputs.visualStudioRoute.status,
      normalization: inputs.normalization.status,
      ingestion: inputs.ingestion.status
    },
    hostRuntimeOutcome: {
      vscode: "manual-verification-confirmed-observation-only",
      devtools: "manual-verification-confirmed-observation-only",
      visualStudio: "route-decision-executed-real-runtime-deferred"
    },
    captureArchiveOutcome: {
      capturedArchivedCount: 0,
      releaseGradeArchivePendingHosts: ["vscode", "devtools"],
      visualStudioImplementationPendingHosts: ["visual-studio"],
      mayClaimCapturedWithoutArchive: false
    },
    publicSafeOutcome: {
      redactionControlsPassed: true,
      sourceBodyIncluded: false,
      sourcesContentPolicy: "none",
      credentialValueIncluded: false,
      digestValueIncluded: false,
      localPathExposure: false
    },
    authorityOutcome: {
      providerNetworkExecuted: false,
      targetOwnerExecutionClaimed: false,
      checkedApplyWriteEnabled: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      directEditObjectIncluded: false
    }
  };
}

function createDownstreamInputs(inputs) {
  return [
    downstream("W-P45", "controlled-remote-provider-execution-slice", "ready-input", [
      "可使用 VS Code / DevTools observation-only host visibility baseline。",
      "仍必须先明确 concrete provider identity、immutable package version、host-bound secret reference、真实 HTTPS destination、workspace/request/final consent 与 source privacy policy。",
      "W-P44 closeout 不授予 provider/network execution 权限。"
    ]),
    downstream("W-P46", "target-owner-evidence-ingestion-and-adoption-trial", "ready-input", [
      "可消费 host evidence ledger 与 observation marker，设计 target-owner evidence ingestion。",
      "目标项目 branch/PR/sandbox/commands 必须由 target owner 主动执行；HIA automation 不直接修改目标项目。"
    ]),
    downstream("W-P47", "checked-apply-write-pilot-preparation", "ready-input", [
      "可消费 host evidence ledger 作为可见性输入。",
      "checked apply write 仍必须等待 host-owned final confirmation、repeat preflight、rollback、formatter、post-validation 与 redacted audit。",
      "W-P44 closeout 不授予 workspace write、target mutation 或 direct edit authority。"
    ]),
    downstream("G-VS-P5-or-later", "visual-studio-real-vsix-implementation-after-audit", "deferred-input", [
      "Visual Studio 当前只完成 route-decision-executed。",
      "真实 VSIX / Experimental Instance / Visual Studio runtime capture 需要单独完成依赖许可证审计、版本矩阵、包身份与人工验证。"
    ]),
    downstream("future-release-evidence", "public-safe-captured-archive-upgrade", "deferred-input", [
      "如需发布级 captured evidence，VS Code / DevTools 应按 W-P44.2/W-P44.3 packet 补采 public-safe screenshot、transcript 与 redaction report。",
      "补采应作为 capture archive upgrade，不改写当前 observation-only 历史结论。"
    ]),
    downstream("C-HIA-P3", "self-documentation-quality-pass-reservation", "forward-input", [
      "C-HIA-P3 应预留 1 到 2 个周期专门做代码梳理、双语注释补齐与 HIA 自身文档化。",
      "建议在 C-HIA-P2 受控执行闭环后，选择首个 API/contract 边界相对稳定的节点插入。"
    ], {
      writeAuthorityGranted: false,
      providerExecutionGranted: false
    })
  ];
}

function downstream(phase, topic, status, notesZh, overrides = {}) {
  return {
    phase,
    topic,
    status,
    notesZh,
    writeAuthorityGranted: false,
    providerExecutionGranted: false,
    targetMutationGranted: false,
    sourceBodySharingGranted: false,
    ...overrides
  };
}

function createDeferredGates(inputs) {
  return [
    gate("release-grade-captured-archive", "deferred", "VS Code / DevTools 仅 observation-only；发布级截图/transcript/report 可后续补采。"),
    gate("visual-studio-real-runtime-capture", "deferred", "Visual Studio 真实 VSIX/Experimental Instance/runtime capture 后延到 G-VS-P5 或后续专项。"),
    gate("controlled-remote-provider-execution", "deferred-to-W-P45", "W-P44 不执行 provider/network。"),
    gate("target-owner-branch-pr-sandbox-command", "deferred-to-W-P46", "目标项目动作必须由 target owner 主动执行。"),
    gate("checked-apply-write-pilot", "deferred-to-W-P47", "checked apply 写入需后续 host-owned final confirmation 与 rollback/audit gate。"),
    gate("source-content-sharing", "deferred", "source bodies 与 sourcesContent 默认不进入 public evidence 或 provider request。")
  ];
}

function gate(id, status, noteZh) {
  return {
    id,
    status,
    noteZh
  };
}

function summarize(inputs, closeout, downstreamInputs, deferredGates) {
  const summaries = [
    inputs.readiness.summary || {},
    inputs.vscodeManual.summary || {},
    inputs.devtoolsManual.summary || {},
    inputs.visualStudioRoute.summary || {},
    inputs.normalization.summary || {},
    inputs.ingestion.summary || {}
  ];
  const ingestionSummary = inputs.ingestion.summary || {};
  const normalizationSummary = inputs.normalization.summary || {};

  return {
    cycleGroupId: "C-HIA-P2",
    phase: "W-P44.7",
    readyInputCount: Object.values(closeout.inputStatuses).filter((status) => typeof status === "string" && status !== "blocked").length,
    inputHardFailureCount: sum(summaries, (summary) => summary.hardFailureCount),
    completedStageCount: closeout.completedStages.length,
    hostLedgerEntryCount: numberValue(ingestionSummary.ledgerEntryCount),
    acceptedObservationOnlyCount: numberValue(ingestionSummary.acceptedObservationOnlyCount),
    acceptedRouteDecisionOnlyCount: numberValue(ingestionSummary.acceptedRouteDecisionOnlyCount),
    manualVerificationConfirmedCount: numberValue(normalizationSummary.manualVerificationConfirmedCount),
    routeDecisionExecutedCount: numberValue(normalizationSummary.routeDecisionExecutedCount),
    capturedArchivedCount: numberValue(ingestionSummary.capturedArchivedCount),
    runtimeCaptureArchivedCount: numberValue(ingestionSummary.runtimeCaptureArchivedCount),
    captureCompletionClaimedCount: numberValue(ingestionSummary.captureCompletionClaimedCount),
    releaseGradeArchivePendingCount: numberValue(ingestionSummary.releaseGradeArchivePendingCount),
    visualStudioImplementationPendingCount: numberValue(ingestionSummary.visualStudioImplementationPendingCount),
    redactionControlCount: numberValue(ingestionSummary.redactionControlCount),
    redactionControlPassCount: numberValue(ingestionSummary.redactionControlPassCount),
    downstreamInputCount: downstreamInputs.length,
    readyDownstreamInputCount: downstreamInputs.filter((input) => ["ready-input", "deferred-input", "forward-input"].includes(input.status)).length,
    deferredGateCount: deferredGates.length,
    providerNetworkExecutedCount: numberValue(ingestionSummary.providerNetworkExecutedCount),
    externalNetworkCallExecutedCount: numberValue(ingestionSummary.externalNetworkCallExecutedCount),
    targetCommandsExecutedByHiaCount: numberValue(ingestionSummary.targetCommandsExecutedByHiaCount),
    targetOwnerExecutionClaimedCount: numberValue(ingestionSummary.targetOwnerExecutionClaimedCount),
    checkedApplyWriteEnabledCount: numberValue(ingestionSummary.checkedApplyWriteEnabledCount),
    workspaceWriteAllowedCount: numberValue(ingestionSummary.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: numberValue(ingestionSummary.targetRepositoryMutationCount),
    directEditObjectCount: numberValue(ingestionSummary.directEditObjectCount),
    sourcesContentPolicyNoneCount: numberValue(ingestionSummary.sourcesContentPolicyNoneCount),
    sourceBodyIncludedCount: numberValue(ingestionSummary.sourceBodyIncludedCount),
    sourceTextIncludedCount: numberValue(ingestionSummary.sourceTextIncludedCount),
    documentContentIncludedCount: numberValue(ingestionSummary.documentContentIncludedCount),
    digestValueIncludedCount: numberValue(ingestionSummary.digestValueIncludedCount),
    credentialValueIncludedCount: numberValue(ingestionSummary.credentialValueIncludedCount),
    pathExposureCount: numberValue(ingestionSummary.pathExposureCount)
  };
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function sum(items, selector) {
  return items.reduce((total, item) => total + numberValue(selector(item)), 0);
}

function numberValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function renderCloseoutSummary(closeout, summary) {
  const lines = [
    "# W-P44 Closeout Summary",
    "",
    "## 摘要",
    "",
    `- Status / 状态：\`${closeout.status}\``,
    `- Completed stages / 完成阶段：${summary.completedStageCount}`,
    `- Ready inputs / ready 输入：${summary.readyInputCount}`,
    `- Host ledger entries / 宿主账本条目：${summary.hostLedgerEntryCount}`,
    `- Observation-only hosts / 仅观察宿主：${summary.acceptedObservationOnlyCount}`,
    `- Route-decision-only hosts / 仅路线决策宿主：${summary.acceptedRouteDecisionOnlyCount}`,
    `- Captured archived / 已归档 captured：${summary.capturedArchivedCount}`,
    `- Redaction controls / 脱敏控制：${summary.redactionControlPassCount} / ${summary.redactionControlCount}`,
    "",
    "## Completed Stages / 已完成阶段",
    ""
  ];

  closeout.completedStages.forEach((stage) => {
    lines.push(`- ${stage}`);
  });

  lines.push("");
  lines.push("## Host Runtime Outcome / 宿主结果");
  lines.push("");
  for (const [host, outcome] of Object.entries(closeout.hostRuntimeOutcome)) {
    lines.push(`- \`${host}\`：\`${outcome}\``);
  }

  lines.push("");
  lines.push("W-P44 已完成第一轮真实宿主观察与证据账本收口，但没有声明发布级 captured archive，也没有授予 provider、target-owner 或 checked apply 写入权限。");

  return `${lines.join("\n")}\n`;
}

function renderDownstreamInputs(downstreamInputs) {
  const lines = [
    "# W-P44 Downstream Inputs",
    "",
    "| Phase | Topic | Status | Write | Provider | Target Mutation |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const input of downstreamInputs) {
    lines.push(`| \`${input.phase}\` | \`${input.topic}\` | \`${input.status}\` | ${input.writeAuthorityGranted} | ${input.providerExecutionGranted} | ${input.targetMutationGranted} |`);
  }

  lines.push("");

  for (const input of downstreamInputs) {
    lines.push(`## ${input.phase} / ${input.topic}`);
    lines.push("");
    for (const note of input.notesZh) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderDeferredGates(deferredGates) {
  const lines = [
    "# W-P44 Deferred Gates",
    "",
    "| Gate | Status | Note |",
    "| --- | --- | --- |"
  ];

  for (const item of deferredGates) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${item.noteZh} |`);
  }

  return `${lines.join("\n")}\n`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
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
