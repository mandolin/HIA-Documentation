import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp44-devtools-manual-runtime-capture");
const evidencePath = path.join(outputRoot, "evidence.json");
const instructionsPath = path.join(outputRoot, "devtools-unpacked-extension-capture-instructions.md");
const intakeTemplatePath = path.join(outputRoot, "devtools-capture-evidence-intake.md");
const redactionReportPath = path.join(outputRoot, "devtools-capture-redaction-report-template.md");
const readinessPath = path.join(rootDir, "dist", "wp44-runtime-capture-readiness-audit", "evidence.json");
const wp39DevtoolsPacketPath = path.join(rootDir, "dist", "wp39-devtools-runtime-capture-packet", "evidence.json");
const wp43HostProjectionPath = path.join(rootDir, "dist", "wp43-devtools-visual-studio-ux-projection", "evidence.json");
const wp43ProviderPanelPath = path.join(rootDir, "dist", "wp43-provider-review-linkage-panel", "evidence.json");
const wp43TargetOwnerViewPath = path.join(rootDir, "dist", "wp43-target-owner-evidence-view", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const manifestPath = path.join(rootDir, "apps", "devtools-extension", "manifest.json");
const devtoolsHtmlPath = path.join(rootDir, "apps", "devtools-extension", "devtools.html");
const panelHtmlPath = path.join(rootDir, "apps", "devtools-extension", "panel.html");
const panelJsPath = path.join(rootDir, "apps", "devtools-extension", "panel.js");
const panelCorePath = path.join(rootDir, "apps", "devtools-extension", "panel-core.js");
const defaultPayloadPath = path.join(rootDir, "apps", "devtools-extension", "browser-panel-payload.json");
const inspectedPageServerPath = path.join(rootDir, "scripts", "serve-wp44-devtools-capture-page.mjs");

await main();

/**
 * 准备 W-P44.3 Chrome DevTools unpacked extension 手工 runtime capture packet。
 * Prepare the W-P44.3 Chrome DevTools unpacked-extension manual runtime capture packet.
 *
 * This stage turns the frozen DevTools runtime packet into concrete manual
 * capture instructions, an intake template and a redaction template. It checks
 * the zero-permission extension shell, default public-safe payload and inspected
 * page event bridge, but it does not launch Chrome, capture screenshots, execute
 * providers, read inspected-page data, apply edits or mutate target repositories.
 *
 * 中文：本阶段把已冻结的 DevTools runtime packet 转成可人工执行的采集指令、
 * 证据回填模板和脱敏模板。它校验零权限 extension shell、默认 public-safe
 * payload 与 inspected page event bridge，但不启动 Chrome、不截图、不执行
 * provider、不读取被检查页面数据、不应用编辑，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P44.3 manual capture packet evidence.
 */
async function main() {
  const inputs = await readInputs();
  const frozenDevtoolsPacket = findFrozenPacket(inputs.readiness, "devtools");
  const requiredArtifacts = createRequiredArtifacts();
  const checklist = createManualChecklist({
    frozenDevtoolsPacket,
    requiredArtifacts
  });
  const intakeTemplate = createEvidenceIntakeTemplate(requiredArtifacts);
  const redactionReport = createRedactionReportTemplate(inputs.readiness.redactionControls || []);
  const manualCapturePacket = {
    host: "devtools",
    hostRuntime: "chrome-devtools-unpacked-extension",
    phase: "W-P44.3",
    packetStatus: "ready-for-human-devtools-runtime-capture",
    captureSlotStatus: "awaiting-human-capture",
    captureRoute: frozenDevtoolsPacket.captureRoute,
    frozenPacketId: frozenDevtoolsPacket.freezeId,
    extensionDirectory: "apps/devtools-extension",
    extensionLoadMode: "chrome-load-unpacked-extension",
    inspectedPageServerCommand: "pnpm run wp44:devtools-capture-page",
    inspectedPageUrl: "http://127.0.0.1:44744/",
    panelName: "HIA",
    defaultPayload: "apps/devtools-extension/browser-panel-payload.json",
    requiredScreenshotCount: requiredArtifacts.filter((artifact) => artifact.kind === "screenshot").length,
    requiredTranscriptCount: requiredArtifacts.filter((artifact) => artifact.kind === "transcript").length,
    manualChecklistStepCount: checklist.steps.length,
    intakeTemplateSectionCount: intakeTemplate.sections.length,
    redactionControlCount: redactionReport.controls.length,
    actualRuntimeCaptureExecuted: false,
    captureCompletionClaimed: false,
    actualScreenshotsReceived: 0,
    actualTranscriptsReceived: 0,
    actualReportReceived: false,
    inspectedWindowEvalExpected: true,
    inspectedPageDataReturned: false,
    extensionPermissionCount: 0,
    hostPermissionCount: 0,
    providerNetworkExecuted: false,
    externalNetworkCallExecuted: false,
    targetCommandsExecutedByHia: false,
    targetOwnerExecutionClaimed: false,
    checkedApplyWriteEnabled: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directEditObjectIncluded: false,
    sourceBodyIncluded: false,
    sourceTextIncluded: false,
    documentContentIncluded: false,
    digestValueIncluded: false,
    credentialValueIncluded: false,
    localAbsolutePathIncluded: false,
    sourcesContentPolicy: "none"
  };
  const summary = summarize({
    frozenDevtoolsPacket,
    inputs,
    intakeTemplate,
    manualCapturePacket,
    redactionReport,
    requiredArtifacts
  });
  const checks = [
    check("HIA_WP44_DEVTOOLS_CAPTURE_INPUTS_READY", summary.readinessDevtoolsReady === true
      && summary.wp39DevtoolsPacketReady === true
      && summary.wp43HostProjectionReady === true
      && summary.wp43ProviderPanelReady === true
      && summary.wp43TargetOwnerViewReady === true
      && summary.devtoolsCheckReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        devtoolsCheckContract: inputs.devtoolsCheck.contract,
        inputHardFailureCount: summary.inputHardFailureCount,
        readinessStatus: inputs.readiness.status,
        wp39DevtoolsPacketStatus: inputs.wp39DevtoolsPacket.status,
        wp43HostProjectionStatus: inputs.wp43HostProjection.status,
        wp43ProviderPanelStatus: inputs.wp43ProviderPanel.status,
        wp43TargetOwnerViewStatus: inputs.wp43TargetOwnerView.status
      }
    }),
    check("HIA_WP44_DEVTOOLS_ZERO_PERMISSION_EXTENSION_READY", summary.manifestVersion === 3
      && summary.devtoolsPageDeclared === true
      && summary.extensionPermissionCount === 0
      && summary.hostPermissionCount === 0
      && summary.devtoolsScriptDeclared === true
      && summary.panelModuleDeclared === true, {
      actual: {
        devtoolsPageDeclared: summary.devtoolsPageDeclared,
        devtoolsScriptDeclared: summary.devtoolsScriptDeclared,
        extensionPermissionCount: summary.extensionPermissionCount,
        hostPermissionCount: summary.hostPermissionCount,
        manifestVersion: summary.manifestVersion,
        panelModuleDeclared: summary.panelModuleDeclared
      }
    }),
    check("HIA_WP44_DEVTOOLS_PANEL_PAYLOAD_READY", summary.defaultPayloadReady === true
      && summary.defaultPayloadEntryCount >= 1
      && summary.defaultPayloadRelationCount >= 1
      && summary.defaultPayloadReviewItemCount >= 1
      && summary.defaultPayloadCheckedApplyStatus === "input-ready"
      && summary.defaultPayloadTargetOwnerEvidenceStatus === "input-ready"
      && summary.defaultPayloadIncludesSourceContent === false
      && summary.defaultPayloadSourcesContentPolicy === "none", {
      actual: {
        defaultPayloadCheckedApplyStatus: summary.defaultPayloadCheckedApplyStatus,
        defaultPayloadEntryCount: summary.defaultPayloadEntryCount,
        defaultPayloadIncludesSourceContent: summary.defaultPayloadIncludesSourceContent,
        defaultPayloadRelationCount: summary.defaultPayloadRelationCount,
        defaultPayloadReviewItemCount: summary.defaultPayloadReviewItemCount,
        defaultPayloadSourcesContentPolicy: summary.defaultPayloadSourcesContentPolicy,
        defaultPayloadTargetOwnerEvidenceStatus: summary.defaultPayloadTargetOwnerEvidenceStatus
      }
    }),
    check("HIA_WP44_DEVTOOLS_BRIDGE_READY", summary.bridgeContractReady === true
      && summary.bridgeEventDeclared === true
      && summary.bridgeDispatchDeclared === true
      && summary.inspectedPageServerReady === true
      && summary.inspectedWindowEvalExpected === true
      && summary.inspectedPageDataReturned === false, {
      actual: {
        bridgeContractReady: summary.bridgeContractReady,
        bridgeDispatchDeclared: summary.bridgeDispatchDeclared,
        bridgeEventDeclared: summary.bridgeEventDeclared,
        inspectedPageServerReady: summary.inspectedPageServerReady,
        inspectedPageDataReturned: summary.inspectedPageDataReturned,
        inspectedWindowEvalExpected: summary.inspectedWindowEvalExpected
      }
    }),
    check("HIA_WP44_DEVTOOLS_CAPTURE_PACKET_READY", summary.packetStatus === "ready-for-human-devtools-runtime-capture"
      && summary.captureSlotStatus === "awaiting-human-capture"
      && summary.requiredArtifactCount >= 6
      && summary.requiredScreenshotCount >= 5
      && summary.requiredTranscriptCount >= 1
      && summary.manualChecklistStepCount >= 12
      && summary.intakeTemplateSectionCount >= 10
      && summary.redactionControlCount >= 8, {
      actual: {
        captureSlotStatus: summary.captureSlotStatus,
        intakeTemplateSectionCount: summary.intakeTemplateSectionCount,
        manualChecklistStepCount: summary.manualChecklistStepCount,
        packetStatus: summary.packetStatus,
        redactionControlCount: summary.redactionControlCount,
        requiredArtifactCount: summary.requiredArtifactCount,
        requiredScreenshotCount: summary.requiredScreenshotCount,
        requiredTranscriptCount: summary.requiredTranscriptCount
      }
    }),
    check("HIA_WP44_DEVTOOLS_CAPTURE_NOT_COMPLETED_OR_FAKED", summary.actualRuntimeCaptureExecutedCount === 0
      && summary.captureCompletionClaimedCount === 0
      && summary.actualScreenshotsReceived === 0
      && summary.actualTranscriptsReceived === 0
      && summary.actualReportReceivedCount === 0, {
      actual: {
        actualReportReceivedCount: summary.actualReportReceivedCount,
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        actualScreenshotsReceived: summary.actualScreenshotsReceived,
        actualTranscriptsReceived: summary.actualTranscriptsReceived,
        captureCompletionClaimedCount: summary.captureCompletionClaimedCount
      }
    }),
    check("HIA_WP44_DEVTOOLS_CAPTURE_NO_EXECUTION_OR_WRITE", summary.providerNetworkExecutedCount === 0
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
    check("HIA_WP44_DEVTOOLS_CAPTURE_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.documentContentIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedCount: summary.digestValueIncludedCount,
        documentContentIncludedCount: summary.documentContentIncludedCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp44-devtools-manual-runtime-capture-packet-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-human-devtools-runtime-capture" : "blocked",
    sourceEvidence: {
      wp44Readiness: normalizePath(readinessPath),
      wp39DevtoolsPacket: normalizePath(wp39DevtoolsPacketPath),
      wp43HostProjection: normalizePath(wp43HostProjectionPath),
      wp43ProviderPanel: normalizePath(wp43ProviderPanelPath),
      wp43TargetOwnerView: normalizePath(wp43TargetOwnerViewPath),
      devtoolsExtensionCheck: normalizePath(devtoolsCheckPath),
      manifest: "apps/devtools-extension/manifest.json",
      devtoolsPage: "apps/devtools-extension/devtools.html",
      panelHtml: "apps/devtools-extension/panel.html",
      panelJs: "apps/devtools-extension/panel.js",
      panelCore: "apps/devtools-extension/panel-core.js",
      defaultPayload: "apps/devtools-extension/browser-panel-payload.json",
      inspectedPageServer: "scripts/serve-wp44-devtools-capture-page.mjs"
    },
    manualCapturePacket,
    requiredArtifacts,
    checklist,
    intakeTemplate,
    redactionReport,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      instructions: normalizePath(instructionsPath),
      intakeTemplate: normalizePath(intakeTemplatePath),
      redactionReportTemplate: normalizePath(redactionReportPath)
    },
    nextStageInputs: [
      {
        phase: "W-P44.3/manual",
        topic: "human-chrome-devtools-unpacked-extension-capture",
        status: "manual-action-required",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P44.4",
        topic: "visual-studio-runtime-route-execution-decision",
        status: "ready-after-devtools-manual-capture-decision",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P44 DevTools manual runtime capture packet evidence");
  assert.equal(hardFailures.length, 0, `W-P44 DevTools manual capture packet has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(instructionsPath, renderInstructions(evidence), "utf8");
  await writeFile(intakeTemplatePath, renderIntakeTemplate(intakeTemplate), "utf8");
  await writeFile(redactionReportPath, renderRedactionReport(redactionReport), "utf8");
  console.log(`W-P44 DevTools manual runtime capture packet prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P44 DevTools capture instructions prepared at ${normalizePath(instructionsPath)}`);
  console.log(`W-P44 DevTools evidence intake template prepared at ${normalizePath(intakeTemplatePath)}`);
}

async function readInputs() {
  const [
    readiness,
    wp39DevtoolsPacket,
    wp43HostProjection,
    wp43ProviderPanel,
    wp43TargetOwnerView,
    devtoolsCheck,
    manifest,
    devtoolsHtml,
    panelHtml,
    panelJs,
    panelCore,
    defaultPayload,
    inspectedPageServer
  ] = await Promise.all([
    readJson(readinessPath),
    readJson(wp39DevtoolsPacketPath),
    readJson(wp43HostProjectionPath),
    readJson(wp43ProviderPanelPath),
    readJson(wp43TargetOwnerViewPath),
    readJson(devtoolsCheckPath),
    readJson(manifestPath),
    readFile(devtoolsHtmlPath, "utf8"),
    readFile(panelHtmlPath, "utf8"),
    readFile(panelJsPath, "utf8"),
    readFile(panelCorePath, "utf8"),
    readJson(defaultPayloadPath),
    readFile(inspectedPageServerPath, "utf8")
  ]);

  return {
    defaultPayload,
    devtoolsCheck,
    devtoolsHtml,
    manifest,
    panelCore,
    panelHtml,
    inspectedPageServer,
    panelJs,
    readiness,
    wp39DevtoolsPacket,
    wp43HostProjection,
    wp43ProviderPanel,
    wp43TargetOwnerView
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function findFrozenPacket(readiness, host) {
  const packet = readiness.frozenPackets?.find((candidate) => candidate.host === host);

  if (!packet) {
    throw new Error(`W-P44 readiness evidence does not contain a frozen packet for ${host}.`);
  }

  return packet;
}

function createRequiredArtifacts() {
  return [
    artifact("extensions-page-loaded", "screenshot", "chrome://extensions 中 HIA unpacked extension 已加载，permissions 与 host permissions 为空。"),
    artifact("devtools-hia-panel-open", "screenshot", "Chrome DevTools 中可见 HIA panel。"),
    artifact("default-payload-summary-visible", "screenshot", "HIA panel 自动加载默认 public-safe payload，并显示 Entries / Relations / Review / Drafts 指标。"),
    artifact("review-surface-visible", "screenshot", "Review tab 中可见 provider review、checked apply confirmation、target-owner evidence 与 apply disabled。"),
    artifact("bridge-event-visible", "screenshot", "Relations open request 触发后，Open log 显示 inspectedWindow bridge dispatched。"),
    artifact("inspected-page-event-transcript", "transcript", "Local HTTP inspected page 只接收 hia:devtools-open-request 事件，不向 panel 返回 page data。")
  ];
}

function artifact(id, kind, marker) {
  return {
    id,
    kind,
    marker,
    required: true,
    privacy: "metadata-only-no-source-body"
  };
}

function createManualChecklist({ frozenDevtoolsPacket, requiredArtifacts }) {
  return {
    title: "W-P44.3 Chrome DevTools unpacked extension 手工采集清单",
    host: "devtools",
    runtime: "chrome-devtools-unpacked-extension",
    frozenPacketId: frozenDevtoolsPacket.freezeId,
    extensionDirectory: "<main-repo>/apps/devtools-extension",
    steps: [
      "在 <main-repo> 打开一个干净 shell。",
      "运行 pnpm run devtools:check，确认静态 DevTools extension shell 与默认 payload 通过检查。",
      "运行 pnpm run wp44:devtools-manual-capture:evidence 刷新本 packet。",
      "另开一个 shell，运行 pnpm run wp44:devtools-capture-page，并保持该进程运行。",
      "打开 Chrome 的 chrome://extensions，启用 Developer mode。",
      "选择 Load unpacked，并加载 <main-repo>/apps/devtools-extension。",
      "确认 extension 未请求 permissions 或 host permissions，并采集 extensions-page-loaded 截图。",
      "打开 http://127.0.0.1:44744/ 作为 disposable inspected page，页面内容不得包含私有源码、credential 或本地路径。",
      "在该页面打开 Chrome DevTools，并切换到 HIA panel。",
      "确认 panel 自动加载默认 public-safe payload，采集 summary 截图。",
      "切换到 Review tab，确认 provider review、target-owner evidence、checked apply confirmation 可见且 apply disabled。",
      "切回 Relations，点击 open request 按钮。",
      "记录 HIA panel Open log 中 inspectedWindow bridge dispatched marker。",
      "在 local HTTP inspected page 的 Console 或页面日志中记录 HIA_DEVTOOLS_OPEN_REQUEST / hia:devtools-open-request 事件 transcript，确认没有 page data 返回 panel。",
      "确认未包含 source body、credential、digest value、本地绝对路径或 sourcesContent。",
      "填写 evidence intake template，并将结果保持为 captured、blocked 或 needs-rerun 之一。",
      "不要运行 provider/network、目标项目命令、checked apply write 或目标仓库 mutation。"
    ],
    requiredArtifacts
  };
}

function createEvidenceIntakeTemplate(requiredArtifacts) {
  return {
    title: "W-P44.3 DevTools 采集证据回填模板",
    host: "chrome-devtools-unpacked-extension",
    resultOptions: [
      "captured",
      "blocked",
      "needs-rerun"
    ],
    sections: [
      "操作者",
      "宿主与版本",
      "Chrome 与 DevTools 版本",
      "Loaded Extension",
    "Inspected Page",
    "Inspected Page Server",
      "采集证据清单",
      "观察到的 Panel 标记",
      "Inspected Page Event Transcript",
      "Provider 与 Network Gate 确认",
      "Target-Owner Gate 确认",
      "Checked Apply Write Gate 确认",
      "隐私与脱敏确认",
      "结果",
      "后续事项"
    ],
    requiredArtifactIds: requiredArtifacts.map((artifact) => artifact.id),
    forbiddenInIntake: [
      "源码正文",
      "credential value",
      "digest value",
      "本地绝对路径",
      "私有 inspected page 内容",
      "目标命令输出正文",
      "sourcesContent",
      "direct edit payload",
      "page data returned to the panel"
    ]
  };
}

function createRedactionReportTemplate(redactionControls) {
  return {
    title: "W-P44.3 DevTools 采集脱敏报告模板",
    controls: redactionControls.map((control) => ({
      id: control.id,
      requirement: control.requirement,
      evidenceState: "must-be-confirmed-before-ingestion"
    })),
    requiredConclusion: "public-safe-before-ingestion"
  };
}

function summarize({
  frozenDevtoolsPacket,
  inputs,
  intakeTemplate,
  manualCapturePacket,
  redactionReport,
  requiredArtifacts
}) {
  const inputSummaries = [
    inputs.readiness.summary || {},
    inputs.wp39DevtoolsPacket.summary || {},
    inputs.wp43HostProjection.summary || {},
    inputs.wp43ProviderPanel.summary || {},
    inputs.wp43TargetOwnerView.summary || {},
    inputs.devtoolsCheck.summary || {}
  ];
  const defaultPayloadPanel = inputs.devtoolsCheck.panel?.defaultPayload || {};
  const bridgeCapabilities = inputs.devtoolsCheck.panel?.bridge?.capabilities || {};

  return {
    cycleGroupId: "C-HIA-P2",
    phase: "W-P44.3",
    readinessDevtoolsReady: frozenDevtoolsPacket.readiness === "manual-capture-ready"
      && inputs.readiness.summary?.readyForDevtoolsManualCapture === true,
    wp39DevtoolsPacketReady: inputs.wp39DevtoolsPacket.status === "ready-for-devtools-manual-runtime-capture",
    wp43HostProjectionReady: inputs.wp43HostProjection.status === "ready-for-wp43-provider-review-linkage-panel",
    wp43ProviderPanelReady: inputs.wp43ProviderPanel.status === "ready-for-wp43-target-owner-evidence-view-and-deferred-gates",
    wp43TargetOwnerViewReady: inputs.wp43TargetOwnerView.status === "ready-for-wp43-host-confirmation-manual-packet-refresh",
    devtoolsCheckReady: inputs.devtoolsCheck.contract === "hia-devtools-extension-check",
    inputHardFailureCount: sumField(inputSummaries, "hardFailureCount"),
    manifestVersion: inputs.manifest.manifest_version,
    devtoolsPageDeclared: inputs.manifest.devtools_page === "devtools.html",
    extensionPermissionCount: Array.isArray(inputs.manifest.permissions) ? inputs.manifest.permissions.length : -1,
    hostPermissionCount: Array.isArray(inputs.manifest.host_permissions) ? inputs.manifest.host_permissions.length : -1,
    devtoolsScriptDeclared: inputs.devtoolsHtml.includes("./devtools.js"),
    panelModuleDeclared: inputs.panelHtml.includes("./panel.js"),
    defaultPayloadReady: typeof inputs.defaultPayload === "object" && inputs.defaultPayload !== null,
    defaultPayloadEntryCount: numberValue(defaultPayloadPanel.entryCount),
    defaultPayloadRelationCount: numberValue(defaultPayloadPanel.relationCount),
    defaultPayloadReviewItemCount: numberValue(defaultPayloadPanel.reviewItemCount),
    defaultPayloadCheckedApplyStatus: stringValue(defaultPayloadPanel.checkedApplyStatus),
    defaultPayloadTargetOwnerEvidenceStatus: stringValue(defaultPayloadPanel.targetOwnerEvidenceStatus),
    defaultPayloadIncludesSourceContent: booleanValue(defaultPayloadPanel.includesSourceContent),
    defaultPayloadSourcesContentPolicy: stringValue(defaultPayloadPanel.sourcesContentPolicy),
    bridgeContractReady: inputs.devtoolsCheck.panel?.bridge?.contract === "hia-devtools-open-request-bridge",
    bridgeEventDeclared: inputs.panelCore.includes("hia:devtools-open-request"),
    bridgeDispatchDeclared: inputs.panelJs.includes("dispatchOpenRequestToInspectedWindow")
      && inputs.panelJs.includes("createHiaDevToolsInspectedWindowBridgeExpression"),
    inspectedPageServerReady: inputs.inspectedPageServer.includes("HIA_DEVTOOLS_OPEN_REQUEST")
      && inputs.inspectedPageServer.includes("hia:devtools-open-request"),
    inspectedWindowEvalExpected: bridgeCapabilities.inspectedWindowEval === true && manualCapturePacket.inspectedWindowEvalExpected === true,
    inspectedPageDataReturned: bridgeCapabilities.returnsPageData === true || manualCapturePacket.inspectedPageDataReturned === true,
    packetStatus: manualCapturePacket.packetStatus,
    captureSlotStatus: manualCapturePacket.captureSlotStatus,
    requiredArtifactCount: requiredArtifacts.length,
    requiredScreenshotCount: manualCapturePacket.requiredScreenshotCount,
    requiredTranscriptCount: manualCapturePacket.requiredTranscriptCount,
    manualChecklistStepCount: manualCapturePacket.manualChecklistStepCount,
    intakeTemplateSectionCount: manualCapturePacket.intakeTemplateSectionCount,
    redactionControlCount: redactionReport.controls.length,
    readyForHumanManualCapture: true,
    manualActionRequired: true,
    actualRuntimeCaptureExecutedCount: boolCount(manualCapturePacket.actualRuntimeCaptureExecuted),
    captureCompletionClaimedCount: boolCount(manualCapturePacket.captureCompletionClaimed),
    actualScreenshotsReceived: manualCapturePacket.actualScreenshotsReceived,
    actualTranscriptsReceived: manualCapturePacket.actualTranscriptsReceived,
    actualReportReceivedCount: boolCount(manualCapturePacket.actualReportReceived),
    providerNetworkExecutedCount: boolCount(manualCapturePacket.providerNetworkExecuted),
    externalNetworkCallExecutedCount: boolCount(manualCapturePacket.externalNetworkCallExecuted),
    targetCommandsExecutedByHiaCount: boolCount(manualCapturePacket.targetCommandsExecutedByHia),
    targetOwnerExecutionClaimedCount: boolCount(manualCapturePacket.targetOwnerExecutionClaimed),
    checkedApplyWriteEnabledCount: boolCount(manualCapturePacket.checkedApplyWriteEnabled),
    workspaceWriteAllowedCount: boolCount(manualCapturePacket.workspaceWriteAllowed),
    targetRepositoryMutationCount: boolCount(manualCapturePacket.targetRepositoryMutationAllowed),
    directEditObjectCount: boolCount(manualCapturePacket.directEditObjectIncluded),
    sourceBodyIncludedCount: boolCount(manualCapturePacket.sourceBodyIncluded),
    sourceTextIncludedCount: boolCount(manualCapturePacket.sourceTextIncluded),
    documentContentIncludedCount: boolCount(manualCapturePacket.documentContentIncluded),
    digestValueIncludedCount: boolCount(manualCapturePacket.digestValueIncluded),
    credentialValueIncludedCount: boolCount(manualCapturePacket.credentialValueIncluded),
    pathExposureCount: boolCount(manualCapturePacket.localAbsolutePathIncluded)
      + countPathExposureValues({ intakeTemplate, manualCapturePacket, redactionReport, requiredArtifacts }),
    sourcesContentPolicy: manualCapturePacket.sourcesContentPolicy
  };
}

function sumField(items, field) {
  return items.reduce((sum, item) => sum + Number(item?.[field] ?? 0), 0);
}

function boolCount(value) {
  return value === true ? 1 : 0;
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function numberValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function booleanValue(value) {
  return value === true ? true : value === false ? false : null;
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function countPathExposureValues(value) {
  return countMatchingValues(value, /(?:^|["'`\s(])(?:[A-Za-z]:[\\/])|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u);
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

function renderInstructions(evidence) {
  const packet = evidence.manualCapturePacket;
  return `# W-P44.3 Chrome DevTools unpacked extension 手工采集指令

## 摘要

- status: \`${evidence.status}\`
- capture slot: \`${packet.captureSlotStatus}\`
- panel: \`${packet.panelName}\`
- extension directory: \`${packet.extensionDirectory}\`
- default payload: \`${packet.defaultPayload}\`
- inspected page server: \`${packet.inspectedPageServerCommand}\`
- inspected page URL: \`${packet.inspectedPageUrl}\`
- required screenshots / transcripts: ${packet.requiredScreenshotCount} / ${packet.requiredTranscriptCount}
- actual runtime capture executed by this script: ${packet.actualRuntimeCaptureExecuted}
- checked apply write enabled: ${packet.checkedApplyWriteEnabled}
- extension permissions / host permissions: ${packet.extensionPermissionCount} / ${packet.hostPermissionCount}
- sourcesContent policy: ${packet.sourcesContentPolicy}

## 操作步骤

${evidence.checklist.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## 必需证据

${evidence.requiredArtifacts.map((artifact) => `- \`${artifact.id}\` (${artifact.kind}): ${artifact.marker}`).join("\n")}

## 证据吸收边界

本 packet 只表示可以开始人工 DevTools capture。只有 intake template 填写完成且 redaction check 通过后，才允许把 W-P44.3 标记为 captured。
`;
}

function renderIntakeTemplate(template) {
  const lines = [
    `# ${template.title}`,
    "",
    `Host: \`${template.host}\``,
    "",
    "结果：captured | blocked | needs-rerun",
    ""
  ];

  for (const section of template.sections) {
    lines.push(`## ${section}`);
    lines.push("");
    lines.push("- ");
    lines.push("");
  }

  lines.push("## 必需证据 ID");
  lines.push("");

  for (const artifactId of template.requiredArtifactIds) {
    lines.push(`- \`${artifactId}\``);
  }

  lines.push("");
  lines.push("## 禁止写入 Intake 的内容");
  lines.push("");

  for (const forbidden of template.forbiddenInIntake) {
    lines.push(`- ${forbidden}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderRedactionReport(report) {
  return `# ${report.title}

必需结论：\`${report.requiredConclusion}\`

${report.controls.map((control) => `- ${control.id}: ${control.requirement} (${control.evidenceState})`).join("\n")}
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(serialized, label) {
  const forbidden = [
    /(?:^|["'`\s(])(?:[A-Za-z]:[\\/])/,
    /file:\/\//i,
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
