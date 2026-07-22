import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp43-host-confirmation-manual-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const summaryPath = path.join(outputRoot, "host-confirmation-manual-packet-refresh.md");
const vscodePacketPath = path.join(outputRoot, "vscode-manual-confirmation-packet.md");
const devtoolsPacketPath = path.join(outputRoot, "devtools-manual-confirmation-packet.md");
const visualStudioPacketPath = path.join(outputRoot, "visual-studio-manual-confirmation-packet.md");
const wp39VscodePath = path.join(rootDir, "dist", "wp39-vscode-runtime-capture-packet", "evidence.json");
const wp39DevtoolsPath = path.join(rootDir, "dist", "wp39-devtools-runtime-capture-packet", "evidence.json");
const wp39VisualStudioPath = path.join(rootDir, "dist", "wp39-visual-studio-runtime-preparation", "evidence.json");
const wp43HostUxPath = path.join(rootDir, "dist", "wp43-host-ux-intake", "evidence.json");
const wp43VscodeSurfacePath = path.join(rootDir, "dist", "wp43-vscode-host-ux-surface", "evidence.json");
const wp43ProjectionPath = path.join(rootDir, "dist", "wp43-devtools-visual-studio-ux-projection", "evidence.json");
const wp43ProviderPanelPath = path.join(rootDir, "dist", "wp43-provider-review-linkage-panel", "evidence.json");
const wp43TargetOwnerViewPath = path.join(rootDir, "dist", "wp43-target-owner-evidence-view", "evidence.json");

await main();

/**
 * 准备 W-P43.6 host confirmation manual packet refresh evidence。
 * Prepare W-P43.6 host confirmation manual packet refresh evidence.
 *
 * This stage refreshes manual capture and confirmation packets for VS Code,
 * DevTools and Visual Studio using W-P43.1-W-P43.5 read-only host views. It
 * defines what a human should capture and verify, but it does not launch hosts,
 * run provider/network calls, execute target commands, apply edits or mutate
 * target repositories.
 *
 * 中文：本阶段基于 W-P43.1-W-P43.5 的只读宿主视图刷新 VS Code、DevTools 与
 * Visual Studio 的人工 capture / confirmation packet。它只定义人工应截图、转录
 * 和核对的内容，不启动宿主、不执行 provider/network、不运行目标命令、不应用编辑，
 * 也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P43.6 manual packet evidence.
 */
async function main() {
  const inputs = await readInputs();
  const manualPackets = createManualPackets(inputs);
  const summary = summarize(inputs, manualPackets);
  const checks = [
    check("HIA_WP43_MANUAL_PACKET_INPUTS_READY", summary.wp39VscodePacketReady === true
      && summary.wp39DevtoolsPacketReady === true
      && summary.wp39VisualStudioRouteReady === true
      && summary.wp43HostUxReady === true
      && summary.wp43VscodeSurfaceReady === true
      && summary.wp43MultiHostProjectionReady === true
      && summary.wp43ProviderPanelReady === true
      && summary.wp43TargetOwnerViewReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        wp39DevtoolsPacketReady: summary.wp39DevtoolsPacketReady,
        wp39VisualStudioRouteReady: summary.wp39VisualStudioRouteReady,
        wp39VscodePacketReady: summary.wp39VscodePacketReady,
        wp43TargetOwnerViewReady: summary.wp43TargetOwnerViewReady
      }
    }),
    check("HIA_WP43_MANUAL_PACKET_HOSTS_READY", summary.packetCount === 3
      && summary.readyPacketCount === 3
      && summary.requiredScreenshotCount >= 10
      && summary.requiredTranscriptCount >= 3
      && summary.manualChecklistStepCount >= 30
      && summary.captureReportTemplateSectionCount >= 25
      && summary.reviewMarkerCount >= 15
      && summary.deferredGateMarkerCount === 3, {
      actual: {
        captureReportTemplateSectionCount: summary.captureReportTemplateSectionCount,
        deferredGateMarkerCount: summary.deferredGateMarkerCount,
        manualChecklistStepCount: summary.manualChecklistStepCount,
        readyPacketCount: summary.readyPacketCount,
        requiredScreenshotCount: summary.requiredScreenshotCount,
        requiredTranscriptCount: summary.requiredTranscriptCount,
        reviewMarkerCount: summary.reviewMarkerCount
      }
    }),
    check("HIA_WP43_MANUAL_PACKET_NO_EXECUTION_OR_WRITE", summary.actualRuntimeCaptureExecutedCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandsExecutedByHiaCount === 0
      && summary.targetOwnerExecutionClaimedCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0
      && summary.hostEditorApiCallCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectCount: summary.directEditObjectCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandsExecutedByHiaCount: summary.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP43_MANUAL_PACKET_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
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
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp43-host-confirmation-manual-packet-refresh-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp43-closeout-and-c-hia-p1-inputs" : "blocked",
    sourceEvidence: {
      wp39VscodeRuntimePacket: normalizePath(wp39VscodePath),
      wp39DevtoolsRuntimePacket: normalizePath(wp39DevtoolsPath),
      wp39VisualStudioRuntimePreparation: normalizePath(wp39VisualStudioPath),
      wp43HostUxIntake: normalizePath(wp43HostUxPath),
      wp43VscodeSurface: normalizePath(wp43VscodeSurfacePath),
      wp43DevtoolsVisualStudioProjection: normalizePath(wp43ProjectionPath),
      wp43ProviderPanel: normalizePath(wp43ProviderPanelPath),
      wp43TargetOwnerView: normalizePath(wp43TargetOwnerViewPath)
    },
    manualPackets,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      devtoolsPacket: normalizePath(devtoolsPacketPath),
      summary: normalizePath(summaryPath),
      visualStudioPacket: normalizePath(visualStudioPacketPath),
      vscodePacket: normalizePath(vscodePacketPath)
    },
    nextStageInputs: [
      {
        phase: "W-P43.7",
        topic: "closeout-and-c-hia-p1-inputs",
        status: "ready-input",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P43 host confirmation manual packet evidence");
  assert.equal(hardFailures.length, 0, `W-P43 host confirmation manual packet has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");
  await writeFile(vscodePacketPath, renderPacket(manualPackets[0]), "utf8");
  await writeFile(devtoolsPacketPath, renderPacket(manualPackets[1]), "utf8");
  await writeFile(visualStudioPacketPath, renderPacket(manualPackets[2]), "utf8");
  console.log(`W-P43 host confirmation manual packet evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P43 host confirmation manual packet summary prepared at ${normalizePath(summaryPath)}`);
}

async function readInputs() {
  const [
    wp39Vscode,
    wp39Devtools,
    wp39VisualStudio,
    wp43HostUx,
    wp43VscodeSurface,
    wp43Projection,
    wp43ProviderPanel,
    wp43TargetOwnerView
  ] = await Promise.all([
    readJson(wp39VscodePath),
    readJson(wp39DevtoolsPath),
    readJson(wp39VisualStudioPath),
    readJson(wp43HostUxPath),
    readJson(wp43VscodeSurfacePath),
    readJson(wp43ProjectionPath),
    readJson(wp43ProviderPanelPath),
    readJson(wp43TargetOwnerViewPath)
  ]);

  return {
    wp39Devtools,
    wp39VisualStudio,
    wp39Vscode,
    wp43HostUx,
    wp43Projection,
    wp43ProviderPanel,
    wp43TargetOwnerView,
    wp43VscodeSurface
  };
}

function createManualPackets(inputs) {
  const commonMarkers = [
    "host-apply-ux-visible",
    "provider-review-panel-visible",
    "target-owner-evidence-view-visible",
    "deferred-gates-visible",
    "checked-apply-write-disabled"
  ];

  return [
    createPacket({
      host: "vscode",
      sourceStatus: inputs.wp39Vscode.status,
      packetStatus: inputs.wp39Vscode.summary?.packetStatus,
      captureRoute: "extension-development-host-output-channel",
      requiredScreenshotCount: number(inputs.wp39Vscode.summary?.requiredScreenshotCount) + 2,
      requiredTranscriptCount: number(inputs.wp39Vscode.summary?.requiredTranscriptCount),
      manualChecklistStepCount: number(inputs.wp39Vscode.summary?.manualChecklistStepCount),
      captureReportTemplateSectionCount: number(inputs.wp39Vscode.summary?.captureReportTemplateSectionCount),
      reviewMarkers: commonMarkers,
      runtimeSummary: inputs.wp39Vscode.summary
    }),
    createPacket({
      host: "devtools",
      sourceStatus: inputs.wp39Devtools.status,
      packetStatus: inputs.wp39Devtools.summary?.packetStatus,
      captureRoute: "chrome-devtools-unpacked-extension-panel",
      requiredScreenshotCount: number(inputs.wp39Devtools.summary?.requiredScreenshotCount) + 1,
      requiredTranscriptCount: number(inputs.wp39Devtools.summary?.requiredTranscriptCount),
      manualChecklistStepCount: number(inputs.wp39Devtools.summary?.manualChecklistStepCount),
      captureReportTemplateSectionCount: number(inputs.wp39Devtools.summary?.captureReportTemplateSectionCount),
      reviewMarkers: commonMarkers,
      runtimeSummary: inputs.wp39Devtools.summary
    }),
    createPacket({
      host: "visual-studio",
      sourceStatus: inputs.wp39VisualStudio.status,
      packetStatus: inputs.wp39VisualStudio.summary?.preparationPacketStatus,
      captureRoute: "visual-studio-route-followup-tool-window",
      requiredScreenshotCount: 3,
      requiredTranscriptCount: 1,
      manualChecklistStepCount: number(inputs.wp39VisualStudio.summary?.manualChecklistStepCount),
      captureReportTemplateSectionCount: 8,
      reviewMarkers: commonMarkers,
      runtimeSummary: inputs.wp39VisualStudio.summary
    })
  ];
}

function createPacket(input) {
  return {
    captureReportTemplateSectionCount: input.captureReportTemplateSectionCount,
    captureRoute: input.captureRoute,
    checkedApplyWriteEnabled: false,
    deferredGateMarkerVisible: true,
    directEditObjectCount: number(input.runtimeSummary?.directEditObjectCount),
    host: input.host,
    hostEditorApiCalled: false,
    manualChecklistStepCount: input.manualChecklistStepCount,
    packetStatus: input.packetStatus || "ready-for-human-confirmation-refresh",
    providerNetworkExecuted: false,
    requiredScreenshotCount: input.requiredScreenshotCount,
    requiredTranscriptCount: input.requiredTranscriptCount,
    reviewMarkers: input.reviewMarkers,
    sourceBodyIncluded: input.runtimeSummary?.sourceBodyIncludedInEvidence === true,
    sourceStatus: input.sourceStatus,
    sourcesContentPolicy: input.runtimeSummary?.sourcesContentPolicy || "none",
    status: "packet-ready",
    targetCommandsExecutedByHia: false,
    targetOwnerExecutionClaimed: false,
    targetRepositoryMutationAllowed: false,
    workspaceWriteAllowed: false,
    actualRuntimeCaptureExecuted: input.runtimeSummary?.actualRuntimeCaptureExecuted === true
  };
}

function summarize(inputs, manualPackets) {
  const runtimeSummaries = [
    inputs.wp39Vscode.summary || {},
    inputs.wp39Devtools.summary || {},
    inputs.wp39VisualStudio.summary || {}
  ];
  const wp43Summaries = [
    inputs.wp43HostUx.summary || {},
    inputs.wp43VscodeSurface.summary || {},
    inputs.wp43Projection.summary || {},
    inputs.wp43ProviderPanel.summary || {},
    inputs.wp43TargetOwnerView.summary || {}
  ];

  return {
    wp39VscodePacketReady: inputs.wp39Vscode.status === "ready-for-vscode-manual-runtime-capture",
    wp39DevtoolsPacketReady: inputs.wp39Devtools.status === "ready-for-devtools-manual-runtime-capture",
    wp39VisualStudioRouteReady: inputs.wp39VisualStudio.status === "ready-for-visual-studio-runtime-route-followup",
    wp43HostUxReady: inputs.wp43HostUx.status === "ready-for-wp43-host-surface-contract",
    wp43VscodeSurfaceReady: inputs.wp43VscodeSurface.status === "ready-for-wp43-devtools-visual-studio-ux-projection",
    wp43MultiHostProjectionReady: inputs.wp43Projection.status === "ready-for-wp43-provider-review-linkage-panel",
    wp43ProviderPanelReady: inputs.wp43ProviderPanel.status === "ready-for-wp43-target-owner-evidence-view-and-deferred-gates",
    wp43TargetOwnerViewReady: inputs.wp43TargetOwnerView.status === "ready-for-wp43-host-confirmation-manual-packet-refresh",
    inputHardFailureCount: sumField([...runtimeSummaries, ...wp43Summaries], "hardFailureCount"),
    packetCount: manualPackets.length,
    readyPacketCount: manualPackets.filter((packet) => packet.status === "packet-ready").length,
    requiredScreenshotCount: sumPacketField(manualPackets, "requiredScreenshotCount"),
    requiredTranscriptCount: sumPacketField(manualPackets, "requiredTranscriptCount"),
    manualChecklistStepCount: sumPacketField(manualPackets, "manualChecklistStepCount"),
    captureReportTemplateSectionCount: sumPacketField(manualPackets, "captureReportTemplateSectionCount"),
    reviewMarkerCount: manualPackets.reduce((sum, packet) => sum + packet.reviewMarkers.length, 0),
    deferredGateMarkerCount: manualPackets.filter((packet) => packet.deferredGateMarkerVisible === true).length,
    actualRuntimeCaptureExecutedCount: manualPackets.filter((packet) => packet.actualRuntimeCaptureExecuted === true).length + sumBool(runtimeSummaries, "actualRuntimeCaptureExecuted"),
    providerNetworkExecutedCount: manualPackets.filter((packet) => packet.providerNetworkExecuted === true).length + sumField(wp43Summaries, "providerNetworkExecutedCount"),
    targetCommandsExecutedByHiaCount: manualPackets.filter((packet) => packet.targetCommandsExecutedByHia === true).length + sumField(wp43Summaries, "targetCommandExecutedByHiaCount") + sumField(wp43Summaries, "targetCommandsExecutedByHiaCount"),
    targetOwnerExecutionClaimedCount: manualPackets.filter((packet) => packet.targetOwnerExecutionClaimed === true).length + sumField(wp43Summaries, "targetOwnerExecutionClaimedCount"),
    checkedApplyWriteEnabledCount: manualPackets.filter((packet) => packet.checkedApplyWriteEnabled === true).length + sumBool(wp43Summaries, "checkedApplyWriteEnabled") + sumField(wp43Summaries, "checkedApplyWriteEnabledCount"),
    workspaceWriteAllowedCount: manualPackets.filter((packet) => packet.workspaceWriteAllowed === true).length + sumField([...runtimeSummaries, ...wp43Summaries], "workspaceWriteAllowedCount"),
    targetRepositoryMutationCount: manualPackets.filter((packet) => packet.targetRepositoryMutationAllowed === true).length + sumField([...runtimeSummaries, ...wp43Summaries], "targetRepositoryMutationCount"),
    directEditObjectCount: sumPacketField(manualPackets, "directEditObjectCount") + sumField([...runtimeSummaries, ...wp43Summaries], "directEditObjectCount"),
    hostEditorApiCallCount: manualPackets.filter((packet) => packet.hostEditorApiCalled === true).length + sumField(wp43Summaries, "hostEditorApiCallCount"),
    sourceBodyIncludedCount: manualPackets.filter((packet) => packet.sourceBodyIncluded === true).length + sumBool([...runtimeSummaries, ...wp43Summaries], "sourceBodyIncludedInEvidence"),
    sourceReferenceIncludedCount: sumField(wp43Summaries, "sourceReferenceIncludedCount"),
    documentContentIncludedCount: sumField(wp43Summaries, "documentContentIncludedInEvidenceCount"),
    digestValueIncludedCount: sumField(wp43Summaries, "digestValueIncludedInEvidenceCount"),
    credentialValueIncludedCount: sumField(wp43Summaries, "credentialValueIncludedCount"),
    pathExposureCount: sumField([...runtimeSummaries, ...wp43Summaries], "pathExposureCount"),
    sourcesContentPolicy: [...manualPackets, ...runtimeSummaries, ...wp43Summaries].every((item) => (item.sourcesContentPolicy ?? "none") === "none") ? "none" : "mixed"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sumField(items, field) {
  return items.reduce((sum, item) => sum + number(item?.[field]), 0);
}

function sumBool(items, field) {
  return items.reduce((sum, item) => sum + (item?.[field] === true ? 1 : 0), 0);
}

function sumPacketField(items, field) {
  return items.reduce((sum, item) => sum + number(item[field]), 0);
}

function number(value) {
  return Number(value ?? 0);
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P43.6 Host Confirmation Manual Packet Refresh

## Summary

- status: \`${evidence.status}\`
- packets: ${summary.readyPacketCount} / ${summary.packetCount} ready
- screenshots / transcripts: ${summary.requiredScreenshotCount} / ${summary.requiredTranscriptCount}
- manual checklist steps: ${summary.manualChecklistStepCount}
- capture report sections: ${summary.captureReportTemplateSectionCount}
- review markers: ${summary.reviewMarkerCount}
- deferred gate markers: ${summary.deferredGateMarkerCount}
- runtime capture / provider network / target commands / target-owner execution: ${summary.actualRuntimeCaptureExecutedCount} / ${summary.providerNetworkExecutedCount} / ${summary.targetCommandsExecutedByHiaCount} / ${summary.targetOwnerExecutionClaimedCount}
- checked apply write / workspace write / target mutation / direct edit: ${summary.checkedApplyWriteEnabledCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.directEditObjectCount}
- sourcesContent policy: ${summary.sourcesContentPolicy}

## Next Stage

W-P43.7 can close W-P43 and prepare C-HIA-P1 closeout inputs.
`;
}

function renderPacket(packet) {
  return `# ${packet.host} Manual Confirmation Packet

## Capture Route

- route: \`${packet.captureRoute}\`
- status: \`${packet.status}\`
- source status: \`${packet.sourceStatus}\`
- packet status: \`${packet.packetStatus}\`

## Required Evidence

- screenshots: ${packet.requiredScreenshotCount}
- transcripts: ${packet.requiredTranscriptCount}
- checklist steps: ${packet.manualChecklistStepCount}
- report sections: ${packet.captureReportTemplateSectionCount}

## Review Markers

${packet.reviewMarkers.map((marker) => `- ${marker}`).join("\n")}

## Guardrails

- actual runtime capture executed: ${packet.actualRuntimeCaptureExecuted}
- checked apply write enabled: ${packet.checkedApplyWriteEnabled}
- provider network executed: ${packet.providerNetworkExecuted}
- target commands executed by HIA: ${packet.targetCommandsExecutedByHia}
- target-owner execution claimed: ${packet.targetOwnerExecutionClaimed}
- target repository mutation allowed: ${packet.targetRepositoryMutationAllowed}
- workspace write allowed: ${packet.workspaceWriteAllowed}
- sourcesContent policy: ${packet.sourcesContentPolicy}
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
