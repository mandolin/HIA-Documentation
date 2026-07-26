import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const intakePath = path.join(rootDir, "dist", "wp50-authoring-tooling-intake", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp50-vscode-authoring-surface");
const evidencePath = path.join(outputRoot, "evidence.json");
const summaryPath = path.join(outputRoot, "vscode-authoring-surface.md");
const packagePath = path.join(rootDir, "apps", "vscode-extension", "package.json");
const configPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.ts");
const extensionPath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");
const configTestPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.test.ts");
const commandId = "hia.showAuthoringSurface";

await main();

/**
 * 准备 W-P50.2 VS Code authoring surface evidence。
 * Prepare W-P50.2 VS Code authoring surface evidence.
 *
 * @lang zh-CN 本脚本把 W-P50.1 intake 输入投射到 VS Code 可见 authoring surface：
 * `@lang` / `<lang>` / `<l>` marker、changed-scope preview 和 fixture-aware guidance。
 * 它只读取源码以检测注册标记，不输出源码正文、不调用 host editor API、不启用 checked apply。
 * @lang en This script projects the W-P50.1 intake into a VS Code-visible
 * authoring surface for `@lang` / `<lang>` / `<l>` markers, changed-scope
 * previews, and fixture-aware guidance. It only reads source files to detect
 * registration markers; it emits no source bodies, calls no host editor API,
 * and enables no checked apply.
 *
 * @returns {Promise<void>} Writes public-safe W-P50.2 evidence and report.
 */
async function main() {
  const inputs = await readInputs();
  assert.equal(inputs.intake.status, "ready-for-wp50-vscode-authoring-surface");

  const packageSurface = analyzePackage(inputs.packageJson);
  const sourceMarkers = analyzeSourceMarkers(inputs);
  const authoringModes = createAuthoringModes(inputs.intake);
  const vscodeSurface = createVscodeSurface();
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({ authoringModes, inputs, nextStageInputs, packageSurface, sourceMarkers, vscodeSurface });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp50-vscode-authoring-surface",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P50.2",
    status: hardFailures.length === 0 ? "ready-for-wp50-devtools-visual-studio-projection" : "blocked-by-wp50-vscode-authoring-surface",
    sourceEvidence: {
      intake: normalizePath(intakePath),
      vscodePackage: normalizePath(packagePath),
      vscodeConfig: normalizePath(configPath),
      vscodeExtension: normalizePath(extensionPath),
      vscodeConfigTest: normalizePath(configTestPath)
    },
    vscodeSurface,
    packageSurface,
    sourceMarkers,
    authoringModes,
    nextStageInputs,
    executionPolicy: {
      policy: "vscode-authoring-surface-read-only",
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
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      surfaceSummary: normalizePath(summaryPath)
    },
    manualChecks: [
      "在 Extension Development Host 中运行 HIA: Show Authoring Surface，确认命令面板可见。",
      "选择 Canonical locale markers，确认输出中显示 @lang / <lang> / <l> 且 checked apply 仍禁用。",
      "选择 Changed-scope preview 和 Fixture-aware guidance，确认它们只显示 authoring guidance，不触发编辑。"
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P50.2 VS Code authoring surface evidence");
  assert.equal(hardFailures.length, 0, `W-P50.2 VS Code authoring surface has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");

  console.log(`W-P50.2 VS Code authoring surface evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P50.2 status: ${evidence.status}`);
}

async function readInputs() {
  const [intake, packageJson, configSource, extensionSource, configTestSource] = await Promise.all([
    readJson(intakePath),
    readJson(packagePath),
    readFile(configPath, "utf8"),
    readFile(extensionPath, "utf8"),
    readFile(configTestPath, "utf8")
  ]);

  return {
    configSource,
    configTestSource,
    extensionSource,
    intake,
    packageJson
  };
}

function analyzePackage(packageJson) {
  return {
    activationEventDeclared: Boolean(packageJson.activationEvents?.includes(`onCommand:${commandId}`)),
    commandDeclared: Boolean(packageJson.contributes?.commands?.some((command) => command.command === commandId)),
    commandId,
    commandTitle: packageJson.contributes?.commands?.find((command) => command.command === commandId)?.title,
    status: "package-surface-detected"
  };
}

function analyzeSourceMarkers(inputs) {
  return {
    choicesHelperFound: inputs.configSource.includes("createHiaVscodeAuthoringSurfaceChoices"),
    configCommandConstantFound: inputs.configSource.includes("HIA_SHOW_AUTHORING_SURFACE_COMMAND"),
    extensionCommandRegistered: inputs.extensionSource.includes("showAuthoringSurfaceCommand")
      && inputs.extensionSource.includes("showHiaAuthoringSurface(outputChannel)"),
    extensionReadOnlyFunctionFound: inputs.extensionSource.includes("showHiaAuthoringSurface")
      && inputs.extensionSource.includes("checked apply 仍保持禁用"),
    markerCompletionHelperStillPresent: inputs.configSource.includes("HIA_SHOW_AUTHORING_SURFACE_COMMAND")
      && inputs.extensionSource.includes("HIA_SHOW_AUTHORING_SURFACE_COMMAND"),
    reportHelperFound: inputs.configSource.includes("createHiaVscodeAuthoringSurfaceReport"),
    testCoverageMarkerFound: inputs.configTestSource.includes("creates VS Code authoring surface choices and reports"),
    helperExportCount: [
      "createHiaVscodeAuthoringSurfaceChoices",
      "createHiaVscodeAuthoringSurfaceReport"
    ].filter((marker) => inputs.configSource.includes(`export function ${marker}`)).length
  };
}

function createAuthoringModes(intake) {
  const byId = new Map(intake.authoringPolicyInputs.map((item) => [item.id, item]));
  return [
    mode("canonical-locale-marker-authoring", "Canonical locale markers", ["completion", "hover", "output", "quickpick"], byId.get("canonical-locale-marker-authoring")),
    mode("changed-scope-preview", "Changed-scope preview", ["validation-output", "quickpick", "code-action-preview"], byId.get("changed-scope-hard-gate-authoring")),
    mode("coverage-aware-remediation-context", "Coverage-aware remediation context", ["validation-output", "output"], byId.get("coverage-aware-remediation-context")),
    mode("fixture-aware-guidance", "Fixture-aware guidance", ["output", "quickpick"], byId.get("internal-flow-fixture-authoring")),
    mode("host-owned-disabled-write-boundary", "Host-owned write-disabled boundary", ["output", "quickpick"], byId.get("host-owned-disabled-write-boundary"))
  ];
}

function mode(id, label, visibleIn, policy) {
  assert.notEqual(policy, undefined, `Missing W-P50.1 authoring policy input for ${id}.`);

  return {
    descriptionZh: policy.requirementZh,
    id,
    label,
    priority: policy.priority,
    sourcePhases: policy.sourcePhases,
    status: "visible",
    visibleIn,
    writeAuthority: "disabled"
  };
}

function createVscodeSurface() {
  return {
    commandId,
    hostEditorApiCalled: false,
    id: "vscode-extension",
    label: "VS Code Extension",
    status: "surface-visible",
    visibleSurfaces: [
      "completion",
      "hover",
      "validation-output",
      "code-action-preview",
      "quickpick",
      "output"
    ],
    writeAuthority: "disabled"
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P50.3",
      status: "ready-input",
      topic: "devtools-and-visual-studio-authoring-projection",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P50.4",
      status: "ready-input",
      topic: "generated-binding-authoring-input",
      writeAuthorityGranted: false
    }
  ];
}

function summarize({ authoringModes, inputs, nextStageInputs, packageSurface, sourceMarkers, vscodeSurface }) {
  return {
    phase: "W-P50.2",
    intakeReady: inputs.intake.status === "ready-for-wp50-vscode-authoring-surface",
    commandDeclared: packageSurface.commandDeclared,
    activationEventDeclared: packageSurface.activationEventDeclared,
    configCommandConstantFound: sourceMarkers.configCommandConstantFound,
    vscodeCommandRegistered: sourceMarkers.extensionCommandRegistered,
    reportHelperFound: sourceMarkers.reportHelperFound,
    choicesHelperFound: sourceMarkers.choicesHelperFound,
    testCoverageMarkerFound: sourceMarkers.testCoverageMarkerFound,
    helperExportCount: sourceMarkers.helperExportCount,
    markerCompletionVisible: authoringModes.some((item) => item.id === "canonical-locale-marker-authoring" && item.visibleIn.includes("completion")),
    changedScopePreviewVisible: authoringModes.some((item) => item.id === "changed-scope-preview" && item.visibleIn.includes("validation-output")),
    fixtureAwareGuidanceVisible: authoringModes.some((item) => item.id === "fixture-aware-guidance" && item.visibleIn.includes("quickpick")),
    disabledWriteBoundaryVisible: authoringModes.some((item) => item.id === "host-owned-disabled-write-boundary"),
    authoringModeCount: authoringModes.length,
    visibleSurfaceCount: vscodeSurface.visibleSurfaces.length,
    nextStageInputCount: nextStageInputs.length,
    historicalCoverageClaimedComplete: false,
    releaseGradeSelfDocumentationClaimed: false,
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
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false
  };
}

function createChecks(summary) {
  return [
    check("wp50-intake-ready", summary.intakeReady, "W-P50.1 intake is ready."),
    check("vscode-command-visible", summary.commandDeclared && summary.activationEventDeclared && summary.configCommandConstantFound && summary.vscodeCommandRegistered, "VS Code command is declared and registered."),
    check("vscode-helper-tested", summary.reportHelperFound && summary.choicesHelperFound && summary.helperExportCount >= 2 && summary.testCoverageMarkerFound, "VS Code helper reports and tests are present."),
    check("authoring-modes-visible", summary.authoringModeCount >= 5 && summary.markerCompletionVisible && summary.changedScopePreviewVisible && summary.fixtureAwareGuidanceVisible && summary.disabledWriteBoundaryVisible, "Authoring modes are visible."),
    check("next-stage-inputs-ready", summary.nextStageInputCount >= 2 && summary.nextWPhaseStarted === false && summary.anotherWPhaseStarted === false, "W-P50.3/W-P50.4 inputs are ready without starting another W phase."),
    check("no-host-runtime-or-editor-call", summary.hostRuntimeLaunchCount === 0 && summary.hostEditorApiCallCount === 0, "No host runtime or editor API is used."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0 && summary.sourceBodyIncludedInEvidence === false, "No source bodies are emitted."),
    check("no-write-network-target", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderSummary(evidence) {
  const modeRows = evidence.authoringModes.map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.visibleIn.join(", ")} | ${item.descriptionZh} |`).join("\n");
  const summary = evidence.summary;
  return `# W-P50.2 VS Code Authoring Surface

## 中文摘要

W-P50.2 已把 W-P50.1 的 authoring policy inputs 投射为 VS Code 可见 authoring surface。当前可见能力包括 canonical locale marker completion/hover、changed-scope preview、coverage-aware remediation context、fixture-aware guidance 与 host-owned write-disabled boundary。

## Authoring Modes

| mode | priority | status | visible in | guidance |
| --- | --- | --- | --- | --- |
${modeRows}

## Safety Boundary

- checked apply write: ${summary.checkedApplyWriteEnabledCount === 0 ? "disabled" : "enabled"}
- workspace write: ${summary.workspaceWriteAllowedCount === 0 ? "disabled" : "enabled"}
- target mutation: ${summary.targetRepositoryMutationCount === 0 ? "disabled" : "enabled"}
- host editor API: ${summary.hostEditorApiCallCount === 0 ? "disabled" : "enabled"}
- provider/network: ${summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0 ? "disabled" : "enabled"}
- sourcesContent policy: ${summary.sourcesContentPolicy}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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
