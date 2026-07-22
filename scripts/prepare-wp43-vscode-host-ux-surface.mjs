import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp43-vscode-host-ux-surface");
const evidencePath = path.join(outputRoot, "evidence.json");
const surfaceSummaryPath = path.join(outputRoot, "vscode-host-apply-ux-surface.md");
const wp43IntakePath = path.join(rootDir, "dist", "wp43-host-ux-intake", "evidence.json");
const vscodePackagePath = path.join(rootDir, "apps", "vscode-extension", "package.json");
const vscodeConfigPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.ts");
const vscodeExtensionPath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");
const vscodeConfigTestPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.test.ts");
const commandId = "hia.showHostApplyUxIntake";

await main();

/**
 * 准备 W-P43.2 VS Code host-owned apply UX surface evidence。
 * Prepare W-P43.2 VS Code host-owned apply UX surface evidence.
 *
 * This stage verifies that the VS Code extension exposes a read-only W-P43 host
 * apply UX intake command and helper surface. It reads source files only to
 * detect registration markers and never serializes source bodies, editor edit
 * objects, credentials or target repository mutation instructions.
 *
 * 中文：本阶段验证 VS Code 插件暴露只读的 W-P43 host apply UX intake 命令与
 * helper surface。它只读取源码以检测注册标记，不序列化源码正文、编辑器编辑对象、
 * credential 或目标仓库修改指令。
 *
 * @returns {Promise<void>} Writes public-safe W-P43.2 VS Code host UX surface evidence.
 */
async function main() {
  const inputs = await readInputs();
  const vscodeSurface = inputs.wp43Intake.hostSurfaces.find((surface) => surface.id === "vscode");
  const packageSurface = analyzePackage(inputs.packageJson);
  const sourceMarkers = analyzeSourceMarkers(inputs);
  const surfaceContract = createSurfaceContract(vscodeSurface);
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    inputs,
    nextStageInputs,
    packageSurface,
    sourceMarkers,
    surfaceContract,
    vscodeSurface
  });
  const checks = [
    check("HIA_WP43_VSCODE_INPUT_READY", summary.wp43IntakeReady === true
      && summary.inputHardFailureCount === 0
      && summary.vscodeSurfaceInputReady === true
      && summary.vscodeRequirementRefCount >= 8, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        vscodeRequirementRefCount: summary.vscodeRequirementRefCount,
        vscodeSurfaceInputReady: summary.vscodeSurfaceInputReady,
        wp43IntakeReady: summary.wp43IntakeReady
      }
    }),
    check("HIA_WP43_VSCODE_COMMAND_REGISTERED", summary.commandDeclared === true
      && summary.activationEventDeclared === true
      && summary.configCommandConstantFound === true
      && summary.extensionCommandRegistered === true, {
      actual: {
        activationEventDeclared: summary.activationEventDeclared,
        commandDeclared: summary.commandDeclared,
        configCommandConstantFound: summary.configCommandConstantFound,
        extensionCommandRegistered: summary.extensionCommandRegistered
      }
    }),
    check("HIA_WP43_VSCODE_HELPERS_TESTED", summary.helperExportCount >= 2
      && summary.reportHelperFound === true
      && summary.choiceHelperFound === true
      && summary.testCoverageMarkerFound === true, {
      actual: {
        choiceHelperFound: summary.choiceHelperFound,
        helperExportCount: summary.helperExportCount,
        reportHelperFound: summary.reportHelperFound,
        testCoverageMarkerFound: summary.testCoverageMarkerFound
      }
    }),
    check("HIA_WP43_VSCODE_NO_WRITE_OR_EXECUTION", summary.checkedApplyWriteEnabled === false
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.actualRuntimeCaptureExecutedCount === 0
      && summary.hostEditorApiCallCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabled: summary.checkedApplyWriteEnabled,
        directEditObjectCount: summary.directEditObjectCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP43_VSCODE_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false
      && summary.sourceReferenceIncludedCount === 0
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp43-vscode-host-ux-surface-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp43-devtools-visual-studio-ux-projection" : "blocked",
    sourceEvidence: {
      wp43Intake: normalizePath(wp43IntakePath),
      vscodePackage: normalizePath(vscodePackagePath),
      vscodeConfig: normalizePath(vscodeConfigPath),
      vscodeExtension: normalizePath(vscodeExtensionPath),
      vscodeConfigTest: normalizePath(vscodeConfigTestPath)
    },
    packageSurface,
    sourceMarkers,
    surfaceContract,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      surfaceSummary: normalizePath(surfaceSummaryPath)
    },
    manualChecks: [
      "Confirm this command is captured in a real VS Code Extension Development Host before marking runtime UX complete.",
      "Confirm apply remains disabled in the command report and no workspace edit API is called.",
      "Confirm W-P43.3 reuses the same surface contract for DevTools and Visual Studio."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P43 VS Code host UX surface evidence");
  assert.equal(hardFailures.length, 0, `W-P43 VS Code host UX surface has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(surfaceSummaryPath, renderSurfaceSummary(evidence), "utf8");
  console.log(`W-P43 VS Code host UX surface evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P43 VS Code host UX surface summary prepared at ${normalizePath(surfaceSummaryPath)}`);
}

async function readInputs() {
  const [wp43Intake, packageJson, configSource, extensionSource, configTestSource] = await Promise.all([
    readJson(wp43IntakePath),
    readJson(vscodePackagePath),
    readFile(vscodeConfigPath, "utf8"),
    readFile(vscodeExtensionPath, "utf8"),
    readFile(vscodeConfigTestPath, "utf8")
  ]);

  return {
    configSource,
    configTestSource,
    extensionSource,
    packageJson,
    wp43Intake
  };
}

function analyzePackage(packageJson) {
  return {
    commandId,
    commandDeclared: Boolean(packageJson.contributes?.commands?.some((command) => command.command === commandId)),
    activationEventDeclared: Boolean(packageJson.activationEvents?.includes(`onCommand:${commandId}`)),
    commandTitle: packageJson.contributes?.commands?.find((command) => command.command === commandId)?.title,
    status: "package-surface-detected"
  };
}

function analyzeSourceMarkers(inputs) {
  return {
    configCommandConstantFound: inputs.configSource.includes("HIA_SHOW_HOST_APPLY_UX_INTAKE_COMMAND"),
    choiceHelperFound: inputs.configSource.includes("createHiaHostApplyUxSurfaceChoices"),
    reportHelperFound: inputs.configSource.includes("createHiaHostApplyUxIntakeReport"),
    extensionCommandRegistered: inputs.extensionSource.includes("showHostApplyUxIntakeCommand")
      && inputs.extensionSource.includes("showHiaHostApplyUxIntake(outputChannel)"),
    extensionReadOnlyFunctionFound: inputs.extensionSource.includes("showHiaHostApplyUxIntake")
      && inputs.extensionSource.includes("Apply remains disabled"),
    testCoverageMarkerFound: inputs.configTestSource.includes("creates host apply UX intake surface choices and reports"),
    helperExportCount: [
      "createHiaHostApplyUxSurfaceChoices",
      "createHiaHostApplyUxIntakeReport"
    ].filter((marker) => inputs.configSource.includes(`export function ${marker}`)).length
  };
}

function createSurfaceContract(vscodeSurface) {
  return {
    host: "vscode",
    status: vscodeSurface?.status || "missing",
    surface: vscodeSurface?.surface || "review-action-panel",
    commandId,
    commandMode: "read-only-output-and-quickpick",
    requirementRefs: vscodeSurface?.uxRequirementRefs || [],
    providerReviewLinkageVisible: vscodeSurface?.providerReviewLinkageVisible === true,
    targetOwnerEvidenceVisible: vscodeSurface?.targetOwnerEvidenceVisible === true,
    deferredGateVisible: vscodeSurface?.deferredGateVisible === true,
    checkedApplyWriteEnabled: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directEditObjectProduced: false,
    providerNetworkExecuted: false,
    targetCommandsExecutedByHia: false,
    actualRuntimeCaptureExecuted: false,
    hostEditorApiCalled: false,
    sourcesContentPolicy: "none"
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P43.3",
      topic: "devtools-visual-studio-ux-projection",
      status: "ready-input",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P43.4",
      topic: "provider-review-linkage-panel",
      status: "ready-input",
      writeAuthorityGranted: false
    }
  ];
}

function summarize({ inputs, nextStageInputs, packageSurface, sourceMarkers, surfaceContract, vscodeSurface }) {
  const intakeSummary = inputs.wp43Intake.summary || {};
  return {
    wp43IntakeReady: inputs.wp43Intake.status === "ready-for-wp43-host-surface-contract",
    inputHardFailureCount: number(intakeSummary.hardFailureCount),
    vscodeSurfaceInputReady: vscodeSurface?.status === "surface-contract-ready",
    vscodeRequirementRefCount: vscodeSurface?.uxRequirementRefs?.length || 0,
    commandDeclared: packageSurface.commandDeclared,
    activationEventDeclared: packageSurface.activationEventDeclared,
    configCommandConstantFound: sourceMarkers.configCommandConstantFound,
    extensionCommandRegistered: sourceMarkers.extensionCommandRegistered,
    helperExportCount: sourceMarkers.helperExportCount,
    reportHelperFound: sourceMarkers.reportHelperFound,
    choiceHelperFound: sourceMarkers.choiceHelperFound,
    testCoverageMarkerFound: sourceMarkers.testCoverageMarkerFound,
    nextStageInputCount: nextStageInputs.length,
    readyNextStageInputCount: nextStageInputs.filter((item) => item.status === "ready-input").length,
    providerReviewLinkageVisible: surfaceContract.providerReviewLinkageVisible,
    targetOwnerEvidenceVisible: surfaceContract.targetOwnerEvidenceVisible,
    deferredGateVisible: surfaceContract.deferredGateVisible,
    checkedApplyWriteEnabled: false,
    workspaceWriteAllowedCount: number(intakeSummary.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: number(intakeSummary.targetRepositoryMutationCount),
    checkedApplyTriggeredCount: number(intakeSummary.checkedApplyTriggeredCount),
    directEditObjectCount: number(intakeSummary.directEditObjectCount),
    providerNetworkExecutedCount: number(intakeSummary.providerNetworkExecutedCount),
    targetCommandExecutedByHiaCount: number(intakeSummary.targetCommandExecutedByHiaCount),
    actualRuntimeCaptureExecutedCount: number(intakeSummary.actualRuntimeCaptureExecutedCount),
    hostEditorApiCallCount: number(intakeSummary.hostEditorApiCallCount),
    sourceBodyIncludedInEvidence: intakeSummary.sourceBodyIncludedInEvidence === true,
    sourceReferenceIncludedCount: number(intakeSummary.sourceReferenceIncludedCount),
    documentContentIncludedInEvidenceCount: number(intakeSummary.documentContentIncludedInEvidenceCount),
    digestValueIncludedInEvidenceCount: number(intakeSummary.digestValueIncludedInEvidenceCount),
    credentialValueIncludedCount: number(intakeSummary.credentialValueIncludedCount),
    pathExposureCount: number(intakeSummary.pathExposureCount),
    sourcesContentPolicy: intakeSummary.sourcesContentPolicy || "none"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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

function renderSurfaceSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P43.2 VS Code Host UX Surface

## Summary

- status: \`${evidence.status}\`
- command declared: ${summary.commandDeclared}
- activation event declared: ${summary.activationEventDeclared}
- helper exports: ${summary.helperExportCount}
- VS Code requirement refs: ${summary.vscodeRequirementRefCount}
- provider review visible: ${summary.providerReviewLinkageVisible}
- target-owner visible: ${summary.targetOwnerEvidenceVisible}
- deferred gates visible: ${summary.deferredGateVisible}
- checked apply write enabled: ${summary.checkedApplyWriteEnabled}
- workspace write / target mutation / checked apply trigger / direct edit: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stage

W-P43.3 can project the same host UX surface contract to DevTools and Visual Studio.
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
