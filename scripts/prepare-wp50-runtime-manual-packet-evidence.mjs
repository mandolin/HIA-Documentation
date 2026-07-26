import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remediationLedgerPath = path.join(rootDir, "dist", "wp50-self-doc-remediation-ledger", "evidence.json");
const vscodeSurfacePath = path.join(rootDir, "dist", "wp50-vscode-authoring-surface", "evidence.json");
const hostProjectionPath = path.join(rootDir, "dist", "wp50-devtools-visual-studio-authoring-projection", "evidence.json");
const generatedBindingPath = path.join(rootDir, "dist", "wp50-generated-binding-authoring-input", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp50-runtime-manual-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const summaryPath = path.join(outputRoot, "runtime-manual-packet-summary.md");
const vscodePacketPath = path.join(outputRoot, "vscode-authoring-manual-packet.md");
const devtoolsPacketPath = path.join(outputRoot, "devtools-authoring-manual-packet.md");
const visualStudioPacketPath = path.join(outputRoot, "visual-studio-authoring-manual-packet.md");

await main();

/**
 * 准备 W-P50.6 runtime manual packet evidence。
 * Prepare W-P50.6 runtime manual packet evidence.
 *
 * @lang zh-CN 本脚本为 VS Code、Chrome DevTools 与 Visual Studio 生成
 * W-P50 authoring tooling 手工验证包。它只写入 checklist、截图要求、
 * transcript slot 和 redaction 规则，不启动宿主 runtime，不调用宿主 editor API，
 * 不修改源码，也不启用 checked apply 写入。
 * @lang en This script generates W-P50 authoring-tooling manual validation
 * packets for VS Code, Chrome DevTools, and Visual Studio. It only writes
 * checklists, screenshot requirements, transcript slots, and redaction rules;
 * it does not launch host runtimes, call host editor APIs, mutate source files,
 * or enable checked-apply writes.
 *
 * @returns {Promise<void>} Writes public-safe W-P50.6 manual packet evidence.
 */
async function main() {
  const inputs = await readInputs();
  assert.equal(inputs.remediationLedger.status, "ready-for-wp50-runtime-manual-packet");
  assert.equal(inputs.vscodeSurface.status, "ready-for-wp50-devtools-visual-studio-projection");
  assert.equal(inputs.hostProjection.status, "ready-for-wp50-generated-binding-authoring-input");
  assert.equal(inputs.generatedBinding.status, "ready-for-wp50-self-doc-remediation-ledger");

  const manualPackets = createManualPackets(inputs);
  const redactionPolicy = createRedactionPolicy();
  const summary = createSummary({ inputs, manualPackets, redactionPolicy });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp50-runtime-manual-packet",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P50.6",
    status: hardFailures.length === 0 ? "ready-for-wp50-closeout-and-wp51-inputs" : "blocked-by-wp50-runtime-manual-packet",
    sourceEvidence: {
      generatedBindingAuthoringInput: normalizePath(generatedBindingPath),
      hostAuthoringProjection: normalizePath(hostProjectionPath),
      selfDocRemediationLedger: normalizePath(remediationLedgerPath),
      vscodeAuthoringSurface: normalizePath(vscodeSurfacePath)
    },
    executionPolicy: {
      policy: "runtime-manual-packet-only",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayLaunchHostRuntime: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayStartAnotherWPhase: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    manualCaptureBoundary: {
      actualRuntimeCaptureExecutedByThisScript: false,
      captureCompletionClaimed: false,
      humanCaptureRequired: true,
      targetRepositoryAuthority: "none",
      writeAuthority: "disabled"
    },
    manualPackets,
    redactionPolicy,
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
        phase: "W-P50.7",
        status: "ready-input",
        topic: "closeout-and-wp51-inputs",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P50.6 runtime manual packet evidence");
  assert.equal(hardFailures.length, 0, `W-P50.6 runtime manual packet has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");
  await writeFile(vscodePacketPath, renderHostPacket(evidence, "vscode-extension"), "utf8");
  await writeFile(devtoolsPacketPath, renderHostPacket(evidence, "devtools-extension"), "utf8");
  await writeFile(visualStudioPacketPath, renderHostPacket(evidence, "visual-studio-extension"), "utf8");

  console.log(`W-P50.6 runtime manual packet prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P50.6 status: ${evidence.status}`);
}

async function readInputs() {
  const [remediationLedger, vscodeSurface, hostProjection, generatedBinding] = await Promise.all([
    readJson(remediationLedgerPath),
    readJson(vscodeSurfacePath),
    readJson(hostProjectionPath),
    readJson(generatedBindingPath)
  ]);

  return {
    generatedBinding,
    hostProjection,
    remediationLedger,
    vscodeSurface
  };
}

function createManualPackets(inputs) {
  return [
    manualPacket("vscode-extension", "VS Code Extension", "Extension Development Host", [
      "运行 `HIA: Show Authoring Surface`。",
      "确认 QuickPick 展示 canonical locale markers、changed-scope preview、coverage remediation、fixture guidance 和 write-disabled boundary。",
      "选择 generated binding 相关 guidance 时，确认只显示 host-readable guidance，不冻结 Pug 具体语法。",
      "确认输出中不包含源码正文、绝对路径、secret、digest 或 `sourcesContent`。",
      "确认 checked apply 仍保持禁用，未调用 editor apply/edit API。",
      "记录手工 observation，不把截图当作本脚本生成的 runtime capture。"
    ], 4, 1, inputs.vscodeSurface.summary.authoringModeCount),
    manualPacket("devtools-extension", "Chrome DevTools Extension", "Chrome DevTools HIA panel", [
      "加载本地 inspected page 与 unpacked extension 后打开 HIA panel。",
      "确认 Review / Relations 中可见 authoring projection 摘要。",
      "确认 generated binding guidance 可作为 read-only review context 展示。",
      "确认 open request / relation bridge 不执行目标命令、不写目标仓库。",
      "确认 panel 与 console 中不包含源码正文、绝对路径、secret、digest 或 `sourcesContent`。",
      "记录手工 observation，不声明 provider/network 或 checked apply 写入。"
    ], 4, 1, inputs.hostProjection.summary.readyProjectionHostCount),
    manualPacket("visual-studio-extension", "Visual Studio Extension", "Visual Studio review surface", [
      "检查 Visual Studio review surface contract 中 `authoringProjection` 与 `authoring-projection` view。",
      "确认 .NET / XML doc 场景可看到 `<lang>` / `<l>` marker guidance。",
      "确认 generated binding guidance 作为只读 review-surface 输入展示。",
      "确认没有 VSIX runtime、Experimental Instance 或 host editor API 被本脚本启动。",
      "确认不包含源码正文、绝对路径、secret、digest 或 `sourcesContent`。",
      "记录 route/observation，等待后续真正 VSIX 专项。"
    ], 3, 1, inputs.hostProjection.summary.readyProjectionHostCount)
  ];
}

function manualPacket(hostId, host, captureRoute, checklist, requiredScreenshotCount, requiredTranscriptCount, visibleGuidanceSignalCount) {
  return {
    captureCompletionClaimed: false,
    captureRoute,
    checklist,
    checklistStepCount: checklist.length,
    host,
    hostId,
    packetStatus: "ready-for-human-runtime-validation",
    requiredScreenshotCount,
    requiredTranscriptCount,
    reportTemplateSections: [
      "host-and-version",
      "command-or-surface-opened",
      "authoring-guidance-visible",
      "generated-binding-guidance-visible",
      "checked-apply-disabled",
      "source-privacy-clean",
      "unexpected-errors",
      "human-observation-summary"
    ],
    reportTemplateSectionCount: 8,
    sourceBodiesVisible: false,
    sourcesContentPolicy: "none",
    visibleGuidanceSignalCount,
    writeAuthority: "disabled"
  };
}

function createRedactionPolicy() {
  return {
    status: "ready-redaction-policy",
    checks: [
      "截图不包含本地绝对路径。",
      "截图不包含源码正文或私有业务代码。",
      "transcript 不包含 secret、token、digest 或 credential marker。",
      "evidence 不包含 `sourcesContent`。",
      "只记录 observation，不声称自动执行了宿主 runtime capture。"
    ],
    sourceBodiesAllowed: false,
    sourcesContentPolicy: "none"
  };
}

function createSummary({ inputs, manualPackets, redactionPolicy }) {
  return {
    phase: "W-P50.6",
    remediationLedgerReady: inputs.remediationLedger.status === "ready-for-wp50-runtime-manual-packet",
    vscodeSurfaceReady: inputs.vscodeSurface.status === "ready-for-wp50-devtools-visual-studio-projection",
    hostProjectionReady: inputs.hostProjection.status === "ready-for-wp50-generated-binding-authoring-input",
    generatedBindingReady: inputs.generatedBinding.status === "ready-for-wp50-self-doc-remediation-ledger",
    manualPacketCount: manualPackets.length,
    readyManualPacketCount: manualPackets.filter((packet) => packet.packetStatus === "ready-for-human-runtime-validation").length,
    requiredScreenshotCount: sum(manualPackets, "requiredScreenshotCount"),
    requiredTranscriptCount: sum(manualPackets, "requiredTranscriptCount"),
    checklistStepCount: sum(manualPackets, "checklistStepCount"),
    reportTemplateSectionCount: sum(manualPackets, "reportTemplateSectionCount"),
    redactionCheckCount: redactionPolicy.checks.length,
    humanRuntimeValidationRequired: true,
    actualRuntimeCaptureExecutedCount: 0,
    captureCompletionClaimedCount: manualPackets.filter((packet) => packet.captureCompletionClaimed).length,
    historicalCoverageClaimedComplete: false,
    releaseGradeSelfDocumentationClaimed: false,
    nextStageReady: true,
    nextWPhaseStarted: false,
    anotherWPhaseStarted: false,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    hostRuntimeLaunchCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    requestBodySerializedCount: 0,
    responseBodySerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0,
    sourcesContentPolicy: "none"
  };
}

function createChecks(summary) {
  return [
    check("inputs-ready", summary.remediationLedgerReady && summary.vscodeSurfaceReady && summary.hostProjectionReady && summary.generatedBindingReady, "W-P50 inputs are ready."),
    check("manual-packets-ready", summary.manualPacketCount === 3 && summary.readyManualPacketCount === 3, "Three host manual packets are ready."),
    check("capture-material-ready", summary.requiredScreenshotCount >= 11 && summary.requiredTranscriptCount === 3 && summary.checklistStepCount >= 18 && summary.reportTemplateSectionCount >= 24, "Manual capture material is ready."),
    check("redaction-ready", summary.redactionCheckCount >= 5, "Redaction checks are ready."),
    check("runtime-not-executed", summary.actualRuntimeCaptureExecutedCount === 0 && summary.captureCompletionClaimedCount === 0 && summary.hostRuntimeLaunchCount === 0, "Runtime capture is not executed by this script."),
    check("next-stage-ready", summary.nextStageReady && summary.nextWPhaseStarted === false && summary.anotherWPhaseStarted === false, "W-P50.7 input is ready without starting another W phase."),
    check("no-host-editor-call", summary.hostEditorApiCallCount === 0, "No host editor API is used."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies or sourcesContent are emitted."),
    check("no-write-network-target", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderSummary(evidence) {
  const rows = evidence.manualPackets.map((packet) => `| ${packet.host} | ${packet.packetStatus} | ${packet.requiredScreenshotCount} | ${packet.requiredTranscriptCount} | ${packet.checklistStepCount} | ${packet.writeAuthority} |`).join("\n");
  const summary = evidence.summary;

  return `# W-P50.6 Runtime Manual Packet Summary

## 中文摘要

W-P50.6 已准备 VS Code、Chrome DevTools 与 Visual Studio 三宿主的 authoring tooling 手工验证包。本阶段只生成 packet，不自动启动宿主 runtime，不声称 capture 已完成。

| host | status | screenshots | transcripts | checklist | write |
| --- | --- | ---: | ---: | ---: | --- |
${rows}

## Safety Boundary

- human runtime validation required: ${summary.humanRuntimeValidationRequired}
- actual runtime capture executed by this script: ${summary.actualRuntimeCaptureExecutedCount}
- host runtime launch: ${summary.hostRuntimeLaunchCount}
- checked apply write: ${summary.checkedApplyWriteEnabledCount}
- host editor API: ${summary.hostEditorApiCallCount}
- workspace write: ${summary.workspaceWriteAllowedCount}
- target mutation: ${summary.targetRepositoryMutationCount}
- provider/network: ${summary.providerNetworkExecutedCount + summary.externalNetworkCallExecutedCount}
- sourcesContent policy: ${summary.sourcesContentPolicy}
`;
}

function renderHostPacket(evidence, hostId) {
  const packet = evidence.manualPackets.find((item) => item.hostId === hostId);
  assert.notEqual(packet, undefined, `Missing manual packet for ${hostId}.`);
  const checklist = packet.checklist.map((item, index) => `${index + 1}. ${item}`).join("\n");
  const sections = packet.reportTemplateSections.map((item) => `- ${item}`).join("\n");

  return `# ${packet.host} W-P50 Authoring Manual Packet

## 中文摘要

本 packet 供人工验证 W-P50 authoring tooling 可见性。它不是自动 capture 结果，不表示宿主 runtime 已由脚本启动。

## Checklist

${checklist}

## Required Evidence

- required screenshots: ${packet.requiredScreenshotCount}
- required transcripts: ${packet.requiredTranscriptCount}
- source bodies visible: ${packet.sourceBodiesVisible}
- sourcesContent policy: ${packet.sourcesContentPolicy}
- write authority: ${packet.writeAuthority}

## Report Template Sections

${sections}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sum(items, field) {
  return items.reduce((total, item) => total + Number(item[field] ?? 0), 0);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(text, label) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/,
    /"sourcesContent"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} includes forbidden private marker: ${pattern}`);
  }
}
