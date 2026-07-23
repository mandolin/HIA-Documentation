import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp44-vscode-manual-runtime-capture");
const evidencePath = path.join(outputRoot, "evidence.json");
const instructionsPath = path.join(outputRoot, "vscode-extension-host-capture-instructions.md");
const intakeTemplatePath = path.join(outputRoot, "vscode-capture-evidence-intake.md");
const redactionReportPath = path.join(outputRoot, "vscode-capture-redaction-report-template.md");
const readinessPath = path.join(rootDir, "dist", "wp44-runtime-capture-readiness-audit", "evidence.json");
const wp39VscodePacketPath = path.join(rootDir, "dist", "wp39-vscode-runtime-capture-packet", "evidence.json");
const wp43VscodeSurfacePath = path.join(rootDir, "dist", "wp43-vscode-host-ux-surface", "evidence.json");
const wp43ProviderPanelPath = path.join(rootDir, "dist", "wp43-provider-review-linkage-panel", "evidence.json");
const wp43TargetOwnerViewPath = path.join(rootDir, "dist", "wp43-target-owner-evidence-view", "evidence.json");
const extensionPackagePath = path.join(rootDir, "apps", "vscode-extension", "package.json");
const extensionSourcePath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");

await main();

/**
 * 准备 W-P44.2 VS Code Extension Development Host 手工 capture packet。
 * Prepare W-P44.2 VS Code Extension Development Host manual capture packet.
 *
 * This stage turns the frozen W-P44.1 VS Code runtime packet into a concrete
 * manual capture instruction and evidence-intake packet. It verifies that the
 * VS Code command surface exists in the extension manifest/source, but it does
 * not launch VS Code, drive the GUI, capture screenshots, execute providers,
 * run target commands, apply edits or mutate target repositories.
 *
 * 中文：本阶段把 W-P44.1 已冻结的 VS Code runtime packet 转成可人工执行的
 * capture 指令和证据回填包。它验证 VS Code extension 的 command surface 仍存在，
 * 但不启动 VS Code、不操控 GUI、不截图、不执行 provider、不运行目标命令、不应用
 * 编辑，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P44.2 manual capture packet evidence.
 */
async function main() {
  const inputs = await readInputs();
  const frozenVscodePacket = findFrozenPacket(inputs.readiness, "vscode");
  const command = resolveCommandSurface(inputs.extensionPackage, inputs.extensionSource);
  const requiredArtifacts = createRequiredArtifacts();
  const checklist = createManualChecklist({
    command,
    frozenVscodePacket,
    launchCommandTemplate: createLaunchCommandTemplate(),
    requiredArtifacts
  });
  const intakeTemplate = createEvidenceIntakeTemplate({
    command,
    requiredArtifacts
  });
  const redactionReport = createRedactionReportTemplate(inputs.readiness.redactionControls || []);
  const manualCapturePacket = {
    host: "vscode",
    hostRuntime: "extension-development-host",
    phase: "W-P44.2",
    packetStatus: "ready-for-human-vscode-runtime-capture",
    captureSlotStatus: "awaiting-human-capture",
    captureRoute: frozenVscodePacket.captureRoute,
    frozenPacketId: frozenVscodePacket.freezeId,
    commandId: command.id,
    commandTitle: command.title,
    launchCommandTemplate: checklist.launchCommandTemplate,
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
    command,
    frozenVscodePacket,
    inputs,
    intakeTemplate,
    manualCapturePacket,
    redactionReport,
    requiredArtifacts
  });
  const checks = [
    check("HIA_WP44_VSCODE_CAPTURE_INPUTS_READY", summary.readinessReady === true
      && summary.wp39VscodePacketReady === true
      && summary.wp43VscodeSurfaceReady === true
      && summary.wp43ProviderPanelReady === true
      && summary.wp43TargetOwnerViewReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        readinessStatus: inputs.readiness.status,
        wp39VscodePacketStatus: inputs.wp39VscodePacket.status,
        wp43ProviderPanelStatus: inputs.wp43ProviderPanel.status,
        wp43TargetOwnerViewStatus: inputs.wp43TargetOwnerView.status,
        wp43VscodeSurfaceStatus: inputs.wp43VscodeSurface.status
      }
    }),
    check("HIA_WP44_VSCODE_CAPTURE_COMMAND_SURFACE_READY", summary.commandContributed === true
      && summary.commandTitleMatches === true
      && summary.activationDeclared === true
      && summary.handlerDeclared === true
      && summary.outputMarkerDeclared === true, {
      actual: {
        activationDeclared: summary.activationDeclared,
        commandContributed: summary.commandContributed,
        commandTitleMatches: summary.commandTitleMatches,
        handlerDeclared: summary.handlerDeclared,
        outputMarkerDeclared: summary.outputMarkerDeclared
      }
    }),
    check("HIA_WP44_VSCODE_CAPTURE_PACKET_READY", summary.packetStatus === "ready-for-human-vscode-runtime-capture"
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
    check("HIA_WP44_VSCODE_CAPTURE_NOT_COMPLETED_OR_FAKED", summary.actualRuntimeCaptureExecutedCount === 0
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
    check("HIA_WP44_VSCODE_CAPTURE_NO_EXECUTION_OR_WRITE", summary.providerNetworkExecutedCount === 0
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
    check("HIA_WP44_VSCODE_CAPTURE_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
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
    contract: "hia-wp44-vscode-manual-runtime-capture-packet-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-human-vscode-runtime-capture" : "blocked",
    sourceEvidence: {
      wp44Readiness: normalizePath(readinessPath),
      wp39VscodePacket: normalizePath(wp39VscodePacketPath),
      wp43VscodeSurface: normalizePath(wp43VscodeSurfacePath),
      wp43ProviderPanel: normalizePath(wp43ProviderPanelPath),
      wp43TargetOwnerView: normalizePath(wp43TargetOwnerViewPath),
      vscodeExtensionManifest: "apps/vscode-extension/package.json",
      vscodeExtensionSource: "apps/vscode-extension/src/extension.ts"
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
        phase: "W-P44.2/manual",
        topic: "human-vscode-extension-development-host-capture",
        status: "manual-action-required",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P44.3",
        topic: "chrome-devtools-unpacked-extension-manual-capture",
        status: "blocked-until-vscode-capture-ingested-or-explicitly-parallelized",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P44 VS Code manual runtime capture packet evidence");
  assert.equal(hardFailures.length, 0, `W-P44 VS Code manual capture packet has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(instructionsPath, renderInstructions(evidence), "utf8");
  await writeFile(intakeTemplatePath, renderIntakeTemplate(intakeTemplate), "utf8");
  await writeFile(redactionReportPath, renderRedactionReport(redactionReport), "utf8");
  console.log(`W-P44 VS Code manual runtime capture packet prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P44 VS Code capture instructions prepared at ${normalizePath(instructionsPath)}`);
  console.log(`W-P44 VS Code evidence intake template prepared at ${normalizePath(intakeTemplatePath)}`);
}

async function readInputs() {
  const [
    readiness,
    wp39VscodePacket,
    wp43VscodeSurface,
    wp43ProviderPanel,
    wp43TargetOwnerView,
    extensionPackage,
    extensionSource
  ] = await Promise.all([
    readJson(readinessPath),
    readJson(wp39VscodePacketPath),
    readJson(wp43VscodeSurfacePath),
    readJson(wp43ProviderPanelPath),
    readJson(wp43TargetOwnerViewPath),
    readJson(extensionPackagePath),
    readFile(extensionSourcePath, "utf8")
  ]);

  return {
    extensionPackage,
    extensionSource,
    readiness,
    wp39VscodePacket,
    wp43ProviderPanel,
    wp43TargetOwnerView,
    wp43VscodeSurface
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

function resolveCommandSurface(extensionPackage, extensionSource) {
  const id = "hia.showHostApplyUxIntake";
  const title = "HIA: Show Host Apply UX Intake";
  const commandContribution = extensionPackage.contributes?.commands?.find((command) => command.command === id);
  return {
    id,
    title,
    activationDeclared: extensionPackage.activationEvents?.includes(`onCommand:${id}`) === true,
    commandContributed: Boolean(commandContribution),
    commandTitleMatches: commandContribution?.title === title,
    handlerDeclared: extensionSource.includes("showHiaHostApplyUxIntake"),
    outputMarkerDeclared: includesAny(extensionSource, [
      "HIA host apply UX intake evidence:",
      "HIA host apply UX intake evidence / 宿主应用 UX 证据:"
    ])
  };
}

function createLaunchCommandTemplate() {
  return [
    "code",
    "--new-window",
    "--user-data-dir",
    "<main-repo>/dist/wp44-vscode-manual-runtime-capture/user-data",
    "--extensions-dir",
    "<main-repo>/dist/wp44-vscode-manual-runtime-capture/extensions",
    "--extensionDevelopmentPath",
    "<main-repo>/apps/vscode-extension",
    "<main-repo>"
  ].join(" ");
}

function createRequiredArtifacts() {
  return [
    artifact("extension-development-host-window", "screenshot", "Extension Development Host 窗口可见。"),
    artifact("command-palette-host-apply-ux", "screenshot", "命令面板中可见 HIA: Show Host Apply UX Intake。"),
    artifact("quickpick-host-surface-list", "screenshot", "QuickPick 中可见 VS Code、DevTools 和 Visual Studio 宿主 surface。"),
    artifact("output-channel-host-summary", "screenshot", "HIA Output Channel 显示 host apply UX evidence 摘要。"),
    artifact("output-channel-deferred-gates", "screenshot", "Output 中可见 provider/network、target-owner 和 checked-apply gate 仍处于 deferred。"),
    artifact("redacted-output-transcript", "transcript", "Transcript 仅记录 public-safe marker 行，并排除私有源码正文。")
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

function createManualChecklist({ command, frozenVscodePacket, launchCommandTemplate, requiredArtifacts }) {
  return {
    title: "W-P44.2 VS Code Extension Development Host 手工采集清单",
    host: "vscode",
    runtime: "extension-development-host",
    commandId: command.id,
    commandTitle: command.title,
    frozenPacketId: frozenVscodePacket.freezeId,
    launchCommandTemplate,
    steps: [
      "在 <main-repo> 打开一个干净 shell。",
      "运行 pnpm run wp44:vscode-manual-capture:evidence 刷新本 packet。",
      "运行 pnpm run build，确保 extension 与 language server 为当前构建。",
      "使用本 packet 的 launch command template 启动 VS Code。",
      "在 Extension Development Host 中打开命令面板。",
      `运行 ${command.title}。`,
      "在命令可见时采集 command-palette 截图。",
      "在宿主 surface 列表可见时采集 QuickPick 截图。",
      "选择 VS Code surface，并等待 HIA Output Channel report 输出。",
      "采集包含 deferred gates 的 output summary 截图。",
      "仅记录 marker 行，形成 redacted transcript。",
      "确认未包含 source body、credential、digest value、本地绝对路径或 sourcesContent。",
      "填写 evidence intake template，并将结果保持为 captured、blocked 或 needs-rerun 之一。",
      "不要运行 provider/network、目标项目命令、checked apply write 或目标仓库 mutation。"
    ],
    requiredArtifacts
  };
}

function createEvidenceIntakeTemplate({ command, requiredArtifacts }) {
  return {
    title: "W-P44.2 VS Code 采集证据回填模板",
    commandId: command.id,
    commandTitle: command.title,
    resultOptions: [
      "captured",
      "blocked",
      "needs-rerun"
    ],
    sections: [
      "操作者",
      "宿主与版本",
      "启动方式",
      "被测 Extension",
      "采集证据清单",
      "观察到的宿主标记",
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
      "目标命令输出正文",
      "sourcesContent",
      "direct edit payload"
    ]
  };
}

function createRedactionReportTemplate(redactionControls) {
  return {
    title: "W-P44.2 VS Code 采集脱敏报告模板",
    controls: redactionControls.map((control) => ({
      id: control.id,
      requirement: control.requirement,
      evidenceState: "must-be-confirmed-before-ingestion"
    })),
    requiredConclusion: "public-safe-before-ingestion"
  };
}

function summarize({
  command,
  frozenVscodePacket,
  inputs,
  intakeTemplate,
  manualCapturePacket,
  redactionReport,
  requiredArtifacts
}) {
  const inputSummaries = [
    inputs.readiness.summary || {},
    inputs.wp39VscodePacket.summary || {},
    inputs.wp43VscodeSurface.summary || {},
    inputs.wp43ProviderPanel.summary || {},
    inputs.wp43TargetOwnerView.summary || {}
  ];
  return {
    cycleGroupId: "C-HIA-P2",
    phase: "W-P44.2",
    readinessReady: inputs.readiness.status === "ready-for-wp44-vscode-manual-runtime-capture"
      && frozenVscodePacket.readiness === "manual-capture-ready",
    wp39VscodePacketReady: inputs.wp39VscodePacket.status === "ready-for-vscode-manual-runtime-capture",
    wp43VscodeSurfaceReady: inputs.wp43VscodeSurface.status === "ready-for-wp43-devtools-visual-studio-ux-projection",
    wp43ProviderPanelReady: inputs.wp43ProviderPanel.status === "ready-for-wp43-target-owner-evidence-view-and-deferred-gates",
    wp43TargetOwnerViewReady: inputs.wp43TargetOwnerView.status === "ready-for-wp43-host-confirmation-manual-packet-refresh",
    inputHardFailureCount: sumField(inputSummaries, "hardFailureCount"),
    commandContributed: command.commandContributed,
    commandTitleMatches: command.commandTitleMatches,
    activationDeclared: command.activationDeclared,
    handlerDeclared: command.handlerDeclared,
    outputMarkerDeclared: command.outputMarkerDeclared,
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

function countPathExposureValues(value) {
  return countMatchingValues(value, /[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u);
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
  return `# W-P44.2 VS Code Extension Development Host 手工采集指令

## 摘要

- status: \`${evidence.status}\`
- capture slot: \`${packet.captureSlotStatus}\`
- command: \`${packet.commandTitle}\` / \`${packet.commandId}\`
- launch template: \`${packet.launchCommandTemplate}\`
- required screenshots / transcripts: ${packet.requiredScreenshotCount} / ${packet.requiredTranscriptCount}
- actual runtime capture executed by this script: ${packet.actualRuntimeCaptureExecuted}
- checked apply write enabled: ${packet.checkedApplyWriteEnabled}
- sourcesContent policy: ${packet.sourcesContentPolicy}

## 操作步骤

${evidence.checklist.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## 必需证据

${evidence.requiredArtifacts.map((artifact) => `- \`${artifact.id}\` (${artifact.kind}): ${artifact.marker}`).join("\n")}

## 证据吸收边界

本 packet 只表示可以开始人工 VS Code capture。只有 intake template 填写完成且 redaction check 通过后，才允许把 W-P44.2 标记为 captured。
`;
}

function renderIntakeTemplate(template) {
  const lines = [
    `# ${template.title}`,
    "",
    `Command: \`${template.commandTitle}\` / \`${template.commandId}\``,
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
