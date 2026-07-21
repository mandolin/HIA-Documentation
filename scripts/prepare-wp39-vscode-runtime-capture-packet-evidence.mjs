import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp39-vscode-runtime-capture-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const manualChecklistPath = path.join(outputRoot, "manual-vscode-runtime-capture-checklist.md");
const captureReportTemplatePath = path.join(outputRoot, "manual-capture-report-template.md");
const intakePath = path.join(rootDir, "dist", "wp39-host-runtime-capture-intake", "evidence.json");
const vscodeGuiPath = path.join(rootDir, "dist", "wp38-vscode-real-gui-confirmation-evidence", "evidence.json");
const extensionPackagePath = path.join(rootDir, "apps", "vscode-extension", "package.json");
const extensionSourcePath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");

await main();

/**
 * 准备 W-P39.2 VS Code runtime capture packet evidence。
 * Prepare W-P39.2 VS Code runtime capture packet evidence.
 *
 * This script packages the VS Code Extension Development Host manual capture
 * workflow as evidence-ready material. It does not launch VS Code, drive the
 * UI, or claim that a human runtime capture has been completed.
 *
 * 中文：本脚本把 VS Code Extension Development Host 的手工采集流程整理成
 * evidence-ready 材料。它不启动 VS Code、不操控 UI，也不宣称已经完成真人
 * runtime capture。
 *
 * @returns {Promise<void>} Writes public-safe packet evidence and manual templates.
 */
async function main() {
  const intake = await readJson(intakePath);
  const vscodeGui = await readJson(vscodeGuiPath);
  const extensionPackage = await readJson(extensionPackagePath);
  const extensionSource = await readFile(extensionSourcePath, "utf8");
  const vscodeHostPlan = findHostPlan(intake, "vscode-extension-development-host");
  const commandId = vscodeHostPlan.commandId ?? vscodeGui.vscodeHostRunbook?.commandId;
  const commandTitle = vscodeHostPlan.commandTitle ?? vscodeGui.vscodeHostRunbook?.commandTitle;
  const commandContribution = findCommandContribution(extensionPackage, commandId);
  const captureArtifacts = createCaptureArtifacts();
  const manualChecklist = createManualChecklist({
    captureArtifacts,
    commandId,
    commandTitle,
    launchCommandTemplate: createLaunchCommandTemplate()
  });
  const captureReportTemplate = createCaptureReportTemplate({
    captureArtifacts,
    commandId,
    commandTitle
  });
  const packet = {
    host: "vscode-extension-development-host",
    packetStatus: "ready-for-human-runtime-capture",
    sourceInput: "W-P39.1",
    commandId,
    commandTitle,
    launchCommandTemplate: createLaunchCommandTemplate(),
    captureArtifacts,
    manualChecklist: normalizePath(manualChecklistPath),
    captureReportTemplate: normalizePath(captureReportTemplatePath),
    actualRuntimeCaptureExecuted: false,
    checkedApplyAvailable: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    sourceBodyAllowedInCaptureReport: false,
    sourcesContentPolicy: "none"
  };
  const summary = {
    intakeReady: intake.status === "ready-for-wp39-host-runtime-capture-baseline",
    intakeHardFailureCount: Number(intake.summary?.hardFailureCount ?? -1),
    cycleGroupId: intake.summary?.cycleGroupId,
    vscodeHostPlanStatus: vscodeHostPlan.status,
    vscodeGuiPreparationReady: vscodeGui.status === "prepared-real-gui-manual-confirmation-required",
    vscodeGuiHardFailureCount: Number(vscodeGui.summary?.hardFailureCount ?? -1),
    vscodeGuiManualEvidenceRequired: vscodeGui.summary?.realGuiManualEvidenceRequired === true,
    commandContributed: Boolean(commandContribution),
    commandTitleMatches: commandContribution?.title === commandTitle,
    activationDeclared: Array.isArray(extensionPackage.activationEvents)
      && extensionPackage.activationEvents.includes(`onCommand:${commandId}`),
    handlerDeclared: extensionSource.includes("showHiaCheckedApplySandboxConfirmation"),
    outputChannelMarkerDeclared: extensionSource.includes("HIA checked apply sandbox confirmation evidence:"),
    packetStatus: packet.packetStatus,
    captureArtifactCount: captureArtifacts.length,
    requiredScreenshotCount: captureArtifacts.filter((artifact) => artifact.kind === "screenshot").length,
    requiredTranscriptCount: captureArtifacts.filter((artifact) => artifact.kind === "transcript").length,
    manualChecklistStepCount: manualChecklist.steps.length,
    captureReportTemplateSectionCount: captureReportTemplate.sections.length,
    actualRuntimeCaptureExecuted: packet.actualRuntimeCaptureExecuted,
    checkedApplyAvailable: packet.checkedApplyAvailable,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ packet, manualChecklist, captureReportTemplate }),
    pathExposureCount: countPathExposureValues({ packet, manualChecklist, captureReportTemplate }),
    sourceBodyIncludedInEvidence: false,
    sourcesContentPolicy: "none"
  };
  const checks = [
    check("HIA_WP39_VSCODE_PACKET_INPUTS_READY", summary.intakeReady === true
      && summary.intakeHardFailureCount === 0
      && summary.cycleGroupId === "C-HIA-P1"
      && summary.vscodeHostPlanStatus === "manual-capture-ready"
      && summary.vscodeGuiPreparationReady === true
      && summary.vscodeGuiHardFailureCount === 0
      && summary.vscodeGuiManualEvidenceRequired === true, {
      actual: {
        cycleGroupId: summary.cycleGroupId,
        intakeHardFailureCount: summary.intakeHardFailureCount,
        intakeStatus: intake.status,
        vscodeGuiHardFailureCount: summary.vscodeGuiHardFailureCount,
        vscodeGuiStatus: vscodeGui.status,
        vscodeHostPlanStatus: summary.vscodeHostPlanStatus
      }
    }),
    check("HIA_WP39_VSCODE_PACKET_COMMAND_SURFACE_READY", summary.commandContributed === true
      && summary.commandTitleMatches === true
      && summary.activationDeclared === true
      && summary.handlerDeclared === true
      && summary.outputChannelMarkerDeclared === true, {
      actual: {
        activationDeclared: summary.activationDeclared,
        commandContributed: summary.commandContributed,
        commandTitleMatches: summary.commandTitleMatches,
        handlerDeclared: summary.handlerDeclared,
        outputChannelMarkerDeclared: summary.outputChannelMarkerDeclared
      }
    }),
    check("HIA_WP39_VSCODE_PACKET_CAPTURE_MATERIAL_READY", summary.packetStatus === "ready-for-human-runtime-capture"
      && summary.captureArtifactCount >= 4
      && summary.requiredScreenshotCount >= 3
      && summary.requiredTranscriptCount >= 1
      && summary.manualChecklistStepCount >= 9
      && summary.captureReportTemplateSectionCount >= 6, {
      actual: {
        captureArtifactCount: summary.captureArtifactCount,
        captureReportTemplateSectionCount: summary.captureReportTemplateSectionCount,
        manualChecklistStepCount: summary.manualChecklistStepCount,
        packetStatus: summary.packetStatus,
        requiredScreenshotCount: summary.requiredScreenshotCount,
        requiredTranscriptCount: summary.requiredTranscriptCount
      }
    }),
    check("HIA_WP39_VSCODE_PACKET_MANUAL_CAPTURE_NOT_CLAIMED", summary.actualRuntimeCaptureExecuted === false
      && summary.checkedApplyAvailable === false, {
      actual: {
        actualRuntimeCaptureExecuted: summary.actualRuntimeCaptureExecuted,
        checkedApplyAvailable: summary.checkedApplyAvailable
      }
    }),
    check("HIA_WP39_VSCODE_PACKET_NO_WRITE_AUTHORITY", summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP39_VSCODE_PACKET_PRIVACY_CLEAN", summary.pathExposureCount === 0
      && summary.sourceBodyIncludedInEvidence === false
      && summary.sourcesContentPolicy === "none", {
      actual: {
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp39-vscode-runtime-capture-packet-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-vscode-manual-runtime-capture" : "blocked",
    sourceEvidence: {
      hostRuntimeCaptureIntake: normalizePath(intakePath),
      vscodeGuiPreparation: normalizePath(vscodeGuiPath),
      vscodeExtensionManifest: "apps/vscode-extension/package.json",
      vscodeExtensionSource: "apps/vscode-extension/src/extension.ts"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    packet,
    manualChecklist,
    captureReportTemplate,
    checks,
    nextContractInputs: [
      {
        phase: "W-P39.2/manual",
        topic: "vscode-human-runtime-capture",
        reason: "A human can now run the packet and attach visible evidence without changing host write authority."
      },
      {
        phase: "W-P39.3",
        topic: "chrome-devtools-runtime-capture-packet",
        reason: "After the VS Code packet is stable, the same evidence schema should be projected to the DevTools host."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P39 VS Code runtime capture packet evidence");
  assert.equal(hardFailures.length, 0, `W-P39 VS Code packet evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(manualChecklistPath, renderChecklistMarkdown(manualChecklist), "utf8");
  await writeFile(captureReportTemplatePath, renderCaptureReportTemplateMarkdown(captureReportTemplate), "utf8");
  console.log(`W-P39 VS Code runtime capture packet evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Manual checklist prepared at ${normalizePath(manualChecklistPath)}`);
  console.log(`Capture report template prepared at ${normalizePath(captureReportTemplatePath)}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Missing or invalid W-P39.2 input evidence at ${normalizePath(filePath)}. Run pnpm run wp39:host-runtime-intake:evidence first. ${error.message}`);
  }
}

function findHostPlan(intake, hostName) {
  const host = Array.isArray(intake.hostCapturePlan)
    ? intake.hostCapturePlan.find((candidate) => candidate.host === hostName)
    : undefined;

  if (!host) {
    throw new Error(`W-P39 intake evidence does not contain host plan ${hostName}.`);
  }

  return host;
}

function findCommandContribution(extensionPackage, commandId) {
  const commands = extensionPackage?.contributes?.commands;

  if (!Array.isArray(commands)) {
    return undefined;
  }

  return commands.find((command) => command.command === commandId);
}

function createLaunchCommandTemplate() {
  return [
    "code",
    "--new-window",
    "--user-data-dir",
    "<main-repo>/dist/wp39-vscode-runtime-capture-packet/user-data",
    "--extensions-dir",
    "<main-repo>/dist/wp39-vscode-runtime-capture-packet/extensions",
    "--extensionDevelopmentPath",
    "<main-repo>/apps/vscode-extension",
    "<main-repo>"
  ].join(" ");
}

function createCaptureArtifacts() {
  return [
    {
      id: "command-palette",
      kind: "screenshot",
      required: true,
      marker: "HIA: Show Checked Apply Sandbox Confirmation command is visible"
    },
    {
      id: "quickpick-transactions",
      kind: "screenshot",
      required: true,
      marker: "Two sandbox transaction choices are visible"
    },
    {
      id: "hia-output-channel",
      kind: "screenshot",
      required: true,
      marker: "HIA output channel shows final confirmation and disabled write authority"
    },
    {
      id: "output-transcript",
      kind: "transcript",
      required: true,
      marker: "Transcript records final confirmation, conflict recheck, rollback, formatter and post-apply validation markers"
    }
  ];
}

function createManualChecklist({ captureArtifacts, commandId, commandTitle, launchCommandTemplate }) {
  return {
    title: "W-P39 VS Code Runtime Capture Checklist",
    host: "vscode-extension-development-host",
    commandId,
    commandTitle,
    launchCommandTemplate,
    steps: [
      "Open a clean shell at <main-repo>.",
      "Run pnpm run wp39:vscode-runtime-packet:evidence to refresh this packet.",
      "Launch VS Code with the command template from this packet.",
      "Open the command palette in the Extension Development Host.",
      `Run ${commandTitle}.`,
      "Confirm the QuickPick lists both W-P38 sandbox transactions.",
      "Select the locale resource transaction and inspect the HIA output channel.",
      "Repeat the check for the source docline transaction.",
      "Confirm the output marks workspace writes, target repository mutation, provider-owned apply, LSP-owned apply and direct edit objects as disabled.",
      "Record only screenshots/transcripts that avoid source bodies, absolute local paths and private credentials.",
      "Fill the capture report template and keep the actual capture status separate from this prepared packet."
    ],
    captureArtifacts
  };
}

function createCaptureReportTemplate({ captureArtifacts, commandId, commandTitle }) {
  return {
    title: "W-P39 VS Code Runtime Capture Report Template",
    commandId,
    commandTitle,
    sections: [
      "Environment",
      "Launch Command",
      "Captured Artifacts",
      "Observed Markers",
      "Write Authority Confirmation",
      "Privacy Confirmation",
      "Result",
      "Follow-Up"
    ],
    requiredArtifactIds: captureArtifacts.map((artifact) => artifact.id),
    resultOptions: [
      "captured",
      "blocked",
      "needs-rerun"
    ],
    forbiddenInReport: [
      "source body",
      "absolute local path",
      "credential material",
      "target repository write"
    ]
  };
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function countDirectEditObjects(value) {
  return countMatchingValues(value, /workspaceEdit|documentChanges|TextEdit\[/iu);
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

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//u, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /work-zone/u, `${label} must not expose private WorkZone paths.`);
}

function renderChecklistMarkdown(checklist) {
  const lines = [
    `# ${checklist.title}`,
    "",
    `Host: \`${checklist.host}\``,
    `Command: \`${checklist.commandTitle}\` / \`${checklist.commandId}\``,
    "",
    "## Launch",
    "",
    `\`${checklist.launchCommandTemplate}\``,
    "",
    "## Steps",
    ""
  ];

  checklist.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  lines.push("");
  lines.push("## Required Artifacts");
  lines.push("");

  for (const artifact of checklist.captureArtifacts) {
    lines.push(`- \`${artifact.id}\` (${artifact.kind}): ${artifact.marker}`);
  }

  lines.push("");
  lines.push("This checklist prepares manual runtime evidence only. It does not mark the capture as complete.");
  return `${lines.join("\n")}\n`;
}

function renderCaptureReportTemplateMarkdown(template) {
  const lines = [
    `# ${template.title}`,
    "",
    `Command: \`${template.commandTitle}\` / \`${template.commandId}\``,
    "",
    "Result: captured | blocked | needs-rerun",
    ""
  ];

  for (const section of template.sections) {
    lines.push(`## ${section}`);
    lines.push("");
    lines.push("- ");
    lines.push("");
  }

  lines.push("## Required Artifact IDs");
  lines.push("");

  for (const artifactId of template.requiredArtifactIds) {
    lines.push(`- \`${artifactId}\``);
  }

  lines.push("");
  lines.push("## Forbidden In Report");
  lines.push("");

  for (const forbidden of template.forbiddenInReport) {
    lines.push(`- ${forbidden}`);
  }

  return `${lines.join("\n")}\n`;
}
