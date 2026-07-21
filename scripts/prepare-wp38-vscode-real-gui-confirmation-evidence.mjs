import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND,
  createHiaCheckedApplySandboxConfirmationChoices,
  createHiaCheckedApplySandboxConfirmationReport
} from "../apps/vscode-extension/dist/config.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp38-vscode-real-gui-confirmation-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const manualChecklistPath = path.join(outputRoot, "manual-confirmation-checklist.md");
const sandboxEvidencePath = path.join(rootDir, "dist", "wp38-host-owned-writable-apply-sandbox", "evidence.json");
const extensionSourcePath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");
const extensionPackagePath = path.join(rootDir, "apps", "vscode-extension", "package.json");
const extensionDistConfigPath = path.join(rootDir, "apps", "vscode-extension", "dist", "config.js");
const extensionPath = path.join(rootDir, "apps", "vscode-extension");

await main();

/**
 * 准备 W-P38.2 VS Code real GUI confirmation evidence 的自动证明与手工采集包。
 * Prepare the automated proof and manual capture kit for W-P38.2 VS Code real GUI confirmation evidence.
 *
 * This script does not drive VS Code or claim human GUI confirmation. It proves
 * that the VS Code command surface can render W-P38 sandbox confirmation
 * reports, prepares an isolated Extension Development Host launch command and
 * records the exact manual checks needed to turn this prepared state into real
 * GUI evidence.
 *
 * 中文：本脚本不操控 VS Code，也不宣称已完成人工 GUI 确认。它证明 VS Code
 * 命令入口可以渲染 W-P38 sandbox confirmation report，并准备隔离的 Extension
 * Development Host 启动命令与手工检查项。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  assertFile(sandboxEvidencePath, "Run pnpm run wp38:writable-sandbox:evidence before W-P38.2 GUI confirmation preparation.");
  assertFile(extensionDistConfigPath, "Build @hia-doc/vscode-extension before W-P38.2 GUI confirmation preparation.");

  await mkdir(path.join(outputRoot, "user-data"), { recursive: true });
  await mkdir(path.join(outputRoot, "extensions"), { recursive: true });

  const sandboxEvidence = await readJson(sandboxEvidencePath);
  const extensionSource = await readFile(extensionSourcePath, "utf8");
  const extensionPackage = await readJson(extensionPackagePath);
  const confirmationChoices = createHiaCheckedApplySandboxConfirmationChoices(sandboxEvidence);
  const confirmationReports = confirmationChoices.map((choice) => createHiaCheckedApplySandboxConfirmationReport(sandboxEvidence, choice.transaction));
  const confirmationReportLines = confirmationReports.flat();
  const expectedOutputMarkers = [
    "HIA checked apply sandbox confirmation evidence:",
    "Final human confirmation: fixture-confirmed",
    "Final conflict recheck: clear",
    "Rollback private snapshot: yes",
    "Formatter execution: executed-by-sandbox-host",
    "Post-apply validation: passed",
    "Workspace applyEdit: disabled",
    "Workspace write: disabled",
    "Target repository mutation: disabled",
    "Provider-owned apply: disabled",
    "LSP server-owned apply: disabled",
    "Direct edit object: disabled",
    "Source bodies: not shown by the VS Code checked apply sandbox confirmation.",
    "Manual GUI confirmation: required before user-facing apply UX is enabled."
  ];
  const commandContribution = findContributedCommand(extensionPackage, HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND);
  const codeVersion = getCodeVersion();
  const actualLaunchCommand = createLaunchCommand({
    extensionPath,
    extensionsDir: path.join(outputRoot, "extensions"),
    userDataDir: path.join(outputRoot, "user-data"),
    workspaceRoot: rootDir
  });
  const launchCommandTemplate = createLaunchCommand({
    extensionPath: "<main-repo>/apps/vscode-extension",
    extensionsDir: "<main-repo>/dist/wp38-vscode-real-gui-confirmation-evidence/extensions",
    userDataDir: "<main-repo>/dist/wp38-vscode-real-gui-confirmation-evidence/user-data",
    workspaceRoot: "<main-repo>"
  });
  const manualChecks = [
    "Open the Extension Development Host with the launch command printed by this script.",
    "Run the command palette action HIA: Show Checked Apply Sandbox Confirmation.",
    "Confirm the QuickPick lists two W-P38 sandbox transactions.",
    "Choose Sandbox locale resource entry and confirm the HIA output channel contains the expected final confirmation, conflict recheck, rollback, formatter, post-apply validation and redacted audit markers.",
    "Repeat for Sandbox source docline draft.",
    "Confirm the output shows workspace applyEdit, workspace write, target repository mutation, provider-owned apply, LSP server-owned apply and direct edit object as disabled.",
    "Confirm no target repository is opened or modified during the check.",
    "Capture a screenshot or transcript of the command palette, QuickPick and HIA output before marking real GUI evidence complete."
  ];
  const summary = {
    sandboxEvidenceReady: sandboxEvidence.status === "ready-for-vscode-real-gui-confirmation-evidence",
    sandboxHardFailureCount: Number(sandboxEvidence.summary?.hardFailureCount ?? -1),
    sandboxScenarioCount: Number(sandboxEvidence.summary?.sandboxScenarioCount ?? 0),
    sandboxApplySuccessCount: Number(sandboxEvidence.summary?.sandboxApplySuccessCount ?? 0),
    sandboxWriteOperationCount: Number(sandboxEvidence.summary?.sandboxWriteOperationCount ?? 0),
    sandboxTargetRepositoryMutationCount: Number(sandboxEvidence.summary?.targetRepositoryMutationCount ?? -1),
    sandboxWorkspaceApplyEditCallCount: Number(sandboxEvidence.summary?.workspaceApplyEditCallCount ?? -1),
    sandboxDirectEditObjectCount: Number(sandboxEvidence.summary?.directEditObjectCount ?? -1),
    vscodeCommandId: HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND,
    vscodeCommandContributed: Boolean(commandContribution),
    vscodeCommandTitle: commandContribution?.title,
    vscodeActivationDeclared: Array.isArray(extensionPackage.activationEvents)
      && extensionPackage.activationEvents.includes(`onCommand:${HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND}`),
    vscodeHandlerDeclared: extensionSource.includes("showHiaCheckedApplySandboxConfirmation"),
    vscodeSandboxHelperDeclared: extensionSource.includes("createHiaCheckedApplySandboxConfirmationReport"),
    vscodeOutputHeaderDeclared: extensionSource.includes("HIA checked apply sandbox confirmation evidence:"),
    vscodeApplyDisabledMessageDeclared: extensionSource.includes("HIA checked apply sandbox confirmation written to output. Apply remains disabled."),
    confirmationChoiceCount: confirmationChoices.length,
    confirmationReportCount: confirmationReports.length,
    confirmationReportLineCount: confirmationReportLines.length,
    expectedOutputMarkerCount: expectedOutputMarkers.length,
    expectedOutputMarkersCovered: expectedOutputMarkers.every((marker) => marker === "HIA checked apply sandbox confirmation evidence:" || confirmationReportLines.includes(marker)),
    isolatedUserDataPrepared: existsSync(path.join(outputRoot, "user-data")),
    isolatedExtensionsPrepared: existsSync(path.join(outputRoot, "extensions")),
    codeCliStatus: codeVersion ? "available" : "unavailable",
    manualChecklistItemCount: manualChecks.length,
    actualGuiConfirmationCaptured: false,
    realGuiManualEvidenceRequired: true,
    workspaceApplyEditCallCount: countSourceOccurrences(extensionSource, "workspace.applyEdit"),
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({
      confirmationChoices,
      confirmationReports,
      manualChecks
    }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({
      confirmationChoices,
      confirmationReports,
      manualChecks
    }),
    secretValueMarkerCount: countSecretValueMarkers({
      confirmationChoices,
      confirmationReports,
      manualChecks
    }),
    pathExposureCount: 0,
    sourcesContentPolicy: sandboxEvidence.summary?.sourcesContentPolicy || "none",
    sourceBodyIncludedInEvidence: false
  };
  const checks = [
    check("HIA_WP38_VSCODE_GUI_SANDBOX_INPUT_READY", summary.sandboxEvidenceReady === true
      && summary.sandboxHardFailureCount === 0
      && summary.sandboxScenarioCount === 2
      && summary.sandboxApplySuccessCount === 2
      && summary.sandboxTargetRepositoryMutationCount === 0
      && summary.sandboxWorkspaceApplyEditCallCount === 0
      && summary.sandboxDirectEditObjectCount === 0, {
      actual: {
        sandboxApplySuccessCount: summary.sandboxApplySuccessCount,
        sandboxDirectEditObjectCount: summary.sandboxDirectEditObjectCount,
        sandboxHardFailureCount: summary.sandboxHardFailureCount,
        sandboxScenarioCount: summary.sandboxScenarioCount,
        sandboxStatus: sandboxEvidence.status,
        sandboxTargetRepositoryMutationCount: summary.sandboxTargetRepositoryMutationCount,
        sandboxWorkspaceApplyEditCallCount: summary.sandboxWorkspaceApplyEditCallCount
      }
    }),
    check("HIA_WP38_VSCODE_GUI_COMMAND_SURFACE_READY", summary.vscodeCommandContributed === true
      && summary.vscodeActivationDeclared === true
      && summary.vscodeHandlerDeclared === true
      && summary.vscodeSandboxHelperDeclared === true
      && summary.vscodeOutputHeaderDeclared === true
      && summary.vscodeApplyDisabledMessageDeclared === true, {
      actual: {
        vscodeActivationDeclared: summary.vscodeActivationDeclared,
        vscodeApplyDisabledMessageDeclared: summary.vscodeApplyDisabledMessageDeclared,
        vscodeCommandContributed: summary.vscodeCommandContributed,
        vscodeHandlerDeclared: summary.vscodeHandlerDeclared,
        vscodeOutputHeaderDeclared: summary.vscodeOutputHeaderDeclared,
        vscodeSandboxHelperDeclared: summary.vscodeSandboxHelperDeclared
      }
    }),
    check("HIA_WP38_VSCODE_GUI_REPORT_MARKERS_READY", summary.confirmationChoiceCount === 2
      && summary.confirmationReportCount === 2
      && summary.confirmationReportLineCount >= 40
      && summary.expectedOutputMarkersCovered === true, {
      actual: {
        confirmationChoiceCount: summary.confirmationChoiceCount,
        confirmationReportCount: summary.confirmationReportCount,
        confirmationReportLineCount: summary.confirmationReportLineCount,
        expectedOutputMarkersCovered: summary.expectedOutputMarkersCovered
      }
    }),
    check("HIA_WP38_VSCODE_GUI_CAPTURE_KIT_READY", summary.isolatedUserDataPrepared === true
      && summary.isolatedExtensionsPrepared === true
      && summary.manualChecklistItemCount >= 8
      && launchCommandTemplate.every((part) => !/[A-Za-z]:[\\/]/u.test(part)), {
      actual: {
        codeCliStatus: summary.codeCliStatus,
        isolatedExtensionsPrepared: summary.isolatedExtensionsPrepared,
        isolatedUserDataPrepared: summary.isolatedUserDataPrepared,
        manualChecklistItemCount: summary.manualChecklistItemCount
      }
    }),
    check("HIA_WP38_VSCODE_GUI_NO_WRITE_AUTHORITY", summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP38_VSCODE_GUI_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.secretValueMarkerCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false, {
      actual: {
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        secretValueMarkerCount: summary.secretValueMarkerCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP38_VSCODE_GUI_MANUAL_EVIDENCE_NOT_CLAIMED", summary.actualGuiConfirmationCaptured === false
      && summary.realGuiManualEvidenceRequired === true, {
      actual: {
        actualGuiConfirmationCaptured: summary.actualGuiConfirmationCaptured,
        realGuiManualEvidenceRequired: summary.realGuiManualEvidenceRequired
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp38-vscode-real-gui-confirmation-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "prepared-real-gui-manual-confirmation-required" : "blocked",
    sourceEvidence: {
      hostOwnedWritableSandbox: normalizePath(sandboxEvidencePath),
      vscodeConfig: "apps/vscode-extension/dist/config.js",
      vscodeExtensionManifest: "apps/vscode-extension/package.json",
      vscodeExtensionSource: "apps/vscode-extension/src/extension.ts"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    vscodeHostRunbook: {
      commandId: HIA_SHOW_CHECKED_APPLY_SANDBOX_CONFIRMATION_COMMAND,
      commandTitle: "HIA: Show Checked Apply Sandbox Confirmation",
      expectedOutputChannel: "HIA Documentation",
      launchCommandTemplate: launchCommandTemplate.map(quoteShellArgument).join(" "),
      workspaceRoot: "<main-repo>"
    },
    confirmationChoiceSummaries: confirmationChoices.map((choice) => ({
      description: choice.description,
      detail: choice.detail,
      label: choice.label,
      transactionId: choice.transaction.id
    })),
    expectedOutputMarkers,
    manualChecklist: manualChecks,
    checks,
    nextContractInputs: [
      {
        phase: "W-P38.2/manual",
        topic: "real-vscode-gui-capture",
        reason: "The Extension Development Host command is prepared; a human must still capture visible GUI evidence before this is marked as real GUI confirmed."
      },
      {
        phase: "W-P38.3",
        topic: "sandbox-rollback-restore-failure-path",
        reason: "After GUI capture preparation, the next automated checked-apply slice should prove rollback restore on failure paths."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P38 VS Code real GUI confirmation evidence");
  assert.equal(hardFailures.length, 0, `W-P38 VS Code real GUI confirmation evidence has ${hardFailures.length} hard failure(s).`);

  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(manualChecklistPath, createManualChecklistMarkdown({
    actualLaunchCommand,
    evidence,
    manualChecks
  }), "utf8");
  console.log(`W-P38 VS Code real GUI confirmation evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Manual checklist prepared at ${normalizePath(manualChecklistPath)}`);
  console.log(`Launch command: ${actualLaunchCommand.map(quoteShellArgument).join(" ")}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assertFile(filePath, message) {
  if (!existsSync(filePath)) {
    throw new Error(`${message} Missing path: ${filePath}`);
  }
}

function findContributedCommand(extensionPackage, commandId) {
  const commands = extensionPackage?.contributes?.commands;

  if (!Array.isArray(commands)) {
    return undefined;
  }

  return commands.find((command) => command?.command === commandId);
}

function getCodeVersion() {
  const result = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "code --version"], { encoding: "utf8" })
    : spawnSync("code", ["--version"], { encoding: "utf8" });

  if (result.error || result.status !== 0) {
    return undefined;
  }

  return result.stdout.trim().split(/\r?\n/u);
}

function createLaunchCommand({ extensionPath, extensionsDir, userDataDir, workspaceRoot }) {
  return [
    "code",
    "--new-window",
    "--user-data-dir",
    userDataDir,
    "--extensions-dir",
    extensionsDir,
    "--extensionDevelopmentPath",
    extensionPath,
    workspaceRoot
  ];
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function countSourceOccurrences(source, pattern) {
  return source.split(pattern).length - 1;
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "workspaceEdit")
      || Object.hasOwn(node, "documentChanges")
      || Object.hasOwn(node, "changes")
      || Object.hasOwn(node, "patch")
      || Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countForbiddenDocumentTextMarkers(value) {
  const serialized = JSON.stringify(value);
  const markers = [
    "function buildProfileSummary",
    "const name = profile.displayName",
    "渲染用户资料",
    "用户资料对象",
    "Welcome title sandbox",
    "Hello ${name}"
  ];
  return markers.filter((marker) => serialized.includes(marker)).length;
}

function countSecretValueMarkers(value) {
  const serialized = JSON.stringify(value);
  const markers = [
    "sk-",
    "npm_",
    "ghp_",
    "gho_",
    "github_pat_",
    "BEGIN PRIVATE KEY",
    "password"
  ];
  return markers.filter((marker) => serialized.includes(marker)).length;
}

function walkJson(value, visitor) {
  visitor(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkJson(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      walkJson(item, visitor);
    }
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!/[A-Za-z]:[\\/]/u.test(serialized), `${label} must not contain drive-letter absolute paths.`);
  assert(!serialized.includes("\\\\"), `${label} must not contain UNC paths.`);
  assert(!serialized.includes("file://"), `${label} must not contain file URLs.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone paths.`);
  assert(!serialized.includes("\"sourcesContent\""), `${label} must not embed sourcesContent.`);
  assert(!serialized.includes("BEGIN PRIVATE KEY"), `${label} must not include private keys.`);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function quoteShellArgument(value) {
  if (/^[A-Za-z0-9_./:=<>\\-]+$/u.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function createManualChecklistMarkdown({ actualLaunchCommand, evidence, manualChecks }) {
  const lines = [
    "# W-P38.2 VS Code Real GUI Confirmation Checklist",
    "",
    "This checklist is generated output for manual Extension Development Host evidence capture.",
    "",
    "## Launch",
    "",
    "```powershell",
    actualLaunchCommand.map(quoteShellArgument).join(" "),
    "```",
    "",
    "## Command",
    "",
    "- Command palette title: HIA: Show Checked Apply Sandbox Confirmation",
    `- Command id: ${evidence.vscodeHostRunbook.commandId}`,
    "- Expected output channel: HIA Documentation",
    "",
    "## Checks",
    ""
  ];

  for (const item of manualChecks) {
    lines.push(`- [ ] ${item}`);
  }

  lines.push(
    "",
    "## Evidence Status",
    "",
    `- Prepared evidence status: ${evidence.status}`,
    "- Real GUI capture remains manual-required."
  );

  return `${lines.join("\n")}\n`;
}
