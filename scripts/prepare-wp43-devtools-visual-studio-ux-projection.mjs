import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp43-devtools-visual-studio-ux-projection");
const evidencePath = path.join(outputRoot, "evidence.json");
const summaryPath = path.join(outputRoot, "devtools-visual-studio-host-ux-projection.md");
const hostIntakePath = path.join(rootDir, "dist", "wp43-host-ux-intake", "evidence.json");
const vscodeSurfacePath = path.join(rootDir, "dist", "wp43-vscode-host-ux-surface", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");

await main();

/**
 * 准备 W-P43.3 DevTools / Visual Studio host-owned apply UX projection evidence。
 * Prepare W-P43.3 DevTools / Visual Studio host-owned apply UX projection evidence.
 *
 * This stage projects the W-P43 host-owned apply UX contract into DevTools and
 * Visual Studio read-only host surfaces. It validates parity with the VS Code
 * W-P43.2 baseline while keeping writes, providers, target commands, runtime
 * capture claims and private material disabled.
 *
 * 中文：本阶段将 W-P43 host-owned apply UX contract 投射到 DevTools 与 Visual
 * Studio 只读宿主表面，并与 W-P43.2 VS Code baseline 对齐。它不启用写入、不执行
 * provider、不运行目标命令、不声称 runtime capture 完成，也不暴露私有材料。
 *
 * @returns {Promise<void>} Writes public-safe W-P43.3 projection evidence.
 */
async function main() {
  const inputs = await readInputs();
  const devtoolsProjection = createDevToolsProjection(inputs.devtoolsCheck);
  const visualStudioProjection = createVisualStudioProjection(inputs.visualStudioCheck);
  const projections = [devtoolsProjection, visualStudioProjection];
  const summary = summarize(inputs, projections);
  const checks = [
    check("HIA_WP43_HOST_UX_PROJECTION_INPUTS_READY", summary.hostIntakeReady === true
      && summary.vscodeSurfaceReady === true
      && summary.devtoolsCheckReady === true
      && summary.visualStudioCheckReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        devtoolsCheckReady: summary.devtoolsCheckReady,
        hostIntakeReady: summary.hostIntakeReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        visualStudioCheckReady: summary.visualStudioCheckReady,
        vscodeSurfaceReady: summary.vscodeSurfaceReady
      }
    }),
    check("HIA_WP43_DEVTOOLS_VISUAL_STUDIO_PROJECTIONS_READY", summary.projectionCount === 2
      && summary.readyProjectionCount === 2
      && summary.readyUxRequirementRefProjectionCount === 2
      && summary.providerReviewVisibleProjectionCount === 2
      && summary.targetOwnerVisibleProjectionCount === 2
      && summary.deferredGateVisibleProjectionCount === 2
      && summary.vscodeBaselineRequirementRefCount >= 8, {
      actual: {
        deferredGateVisibleProjectionCount: summary.deferredGateVisibleProjectionCount,
        projectionCount: summary.projectionCount,
        providerReviewVisibleProjectionCount: summary.providerReviewVisibleProjectionCount,
        readyProjectionCount: summary.readyProjectionCount,
        readyUxRequirementRefProjectionCount: summary.readyUxRequirementRefProjectionCount,
        targetOwnerVisibleProjectionCount: summary.targetOwnerVisibleProjectionCount,
        vscodeBaselineRequirementRefCount: summary.vscodeBaselineRequirementRefCount
      }
    }),
    check("HIA_WP43_DEVTOOLS_VISUAL_STUDIO_NO_WRITE_OR_EXECUTION", summary.checkedApplyWriteEnabledCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.directEditObjectProducedCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.actualRuntimeCaptureExecutedCount === 0
      && summary.hostEditorApiCallCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectProducedCount: summary.directEditObjectProducedCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationAllowedCount: summary.targetRepositoryMutationAllowedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP43_DEVTOOLS_VISUAL_STUDIO_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
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
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp43-devtools-visual-studio-ux-projection-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp43-provider-review-linkage-panel" : "blocked",
    sourceEvidence: {
      hostApplyUxIntake: normalizePath(hostIntakePath),
      vscodeHostApplyUxSurface: normalizePath(vscodeSurfacePath),
      devtoolsExtensionCheck: normalizePath(devtoolsCheckPath),
      visualStudioExtensionCheck: normalizePath(visualStudioCheckPath)
    },
    projections,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      projectionSummary: normalizePath(summaryPath)
    },
    nextStageInputs: [
      {
        phase: "W-P43.4",
        topic: "provider-review-linkage-panel",
        status: "ready-input",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P43.5",
        topic: "target-owner-evidence-view-and-deferred-gates",
        status: "ready-input",
        writeAuthorityGranted: false
      }
    ],
    manualChecks: [
      "Confirm real Chrome DevTools and Visual Studio runtime captures are recorded separately before claiming GUI completion.",
      "Confirm checked apply write remains disabled in both projected host surfaces.",
      "Confirm provider review and target-owner evidence remain visible but review-only."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P43 DevTools / Visual Studio UX projection evidence");
  assert.equal(hardFailures.length, 0, `W-P43 DevTools / Visual Studio UX projection has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(summaryPath, renderProjectionSummary(evidence), "utf8");
  console.log(`W-P43 DevTools / Visual Studio UX projection evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P43 DevTools / Visual Studio UX projection summary prepared at ${normalizePath(summaryPath)}`);
}

async function readInputs() {
  return {
    devtoolsCheck: await readJson(devtoolsCheckPath),
    hostIntake: await readJson(hostIntakePath),
    visualStudioCheck: await readJson(visualStudioCheckPath),
    vscodeSurface: await readJson(vscodeSurfacePath)
  };
}

function createDevToolsProjection(devtoolsCheck) {
  const hostApplyUx = devtoolsCheck.panel?.reviewSurface?.hostApplyUx ?? {};

  return {
    host: "devtools",
    status: hostApplyUx.status === "input-ready" ? "projection-ready" : "blocked",
    contract: hostApplyUx.contract,
    surface: hostApplyUx.surface,
    uxRequirementRefCount: number(hostApplyUx.uxRequirementRefCount),
    providerReviewLinkageVisible: hostApplyUx.providerReviewLinkageVisible === true,
    targetOwnerEvidenceVisible: hostApplyUx.targetOwnerEvidenceVisible === true,
    deferredGateVisible: hostApplyUx.deferredGateVisible === true,
    checkedApplyWriteEnabled: hostApplyUx.checkedApplyWriteEnabled === true,
    workspaceWriteAllowed: hostApplyUx.workspaceWriteAllowed === true,
    targetRepositoryMutationAllowed: hostApplyUx.targetRepositoryMutationAllowed === true,
    directEditObjectProduced: hostApplyUx.directEditObjectProduced === true,
    providerNetworkExecuted: hostApplyUx.providerNetworkExecuted === true,
    targetCommandsExecutedByHia: hostApplyUx.targetCommandsExecutedByHia === true,
    actualRuntimeCaptureExecuted: hostApplyUx.actualRuntimeCaptureExecuted === true,
    hostEditorApiCalled: hostApplyUx.hostEditorApiCalled === true,
    sourceBodyIncluded: hostApplyUx.sourceBodyIncluded === true,
    sourcesContentPolicy: hostApplyUx.sourcesContentPolicy || "none"
  };
}

function createVisualStudioProjection(visualStudioCheck) {
  const hostApplyUx = visualStudioCheck.reviewSurface?.hostApplyUx ?? {};

  return {
    host: "visual-studio",
    status: hostApplyUx.status === "input-ready" ? "projection-ready" : "blocked",
    contract: hostApplyUx.contract,
    surface: hostApplyUx.surface,
    uxRequirementRefCount: number(hostApplyUx.uxRequirementRefCount),
    providerReviewLinkageVisible: hostApplyUx.providerReviewLinkageVisible === true,
    targetOwnerEvidenceVisible: hostApplyUx.targetOwnerEvidenceVisible === true,
    deferredGateVisible: hostApplyUx.deferredGateVisible === true,
    checkedApplyWriteEnabled: hostApplyUx.checkedApplyWriteEnabled === true,
    workspaceWriteAllowed: hostApplyUx.workspaceWriteAvailable === true,
    targetRepositoryMutationAllowed: hostApplyUx.targetRepositoryMutation === true,
    directEditObjectProduced: hostApplyUx.directEditObjectProduced === true,
    providerNetworkExecuted: hostApplyUx.providerNetworkExecuted === true,
    targetCommandsExecutedByHia: hostApplyUx.targetCommandsExecutedByHia === true,
    actualRuntimeCaptureExecuted: hostApplyUx.actualRuntimeCaptureExecuted === true,
    hostEditorApiCalled: hostApplyUx.hostEditorApiCalled === true,
    sourceBodyIncluded: false,
    sourcesContentPolicy: hostApplyUx.sourcesContentPolicy || "none"
  };
}

function summarize(inputs, projections) {
  const intakeSummary = inputs.hostIntake.summary || {};
  const vscodeSummary = inputs.vscodeSurface.summary || {};

  return {
    hostIntakeReady: inputs.hostIntake.status === "ready-for-wp43-host-surface-contract",
    vscodeSurfaceReady: inputs.vscodeSurface.status === "ready-for-wp43-devtools-visual-studio-ux-projection",
    devtoolsCheckReady: inputs.devtoolsCheck.contract === "hia-devtools-extension-check",
    visualStudioCheckReady: inputs.visualStudioCheck.contract === "hia-visual-studio-extension-check",
    inputHardFailureCount: number(intakeSummary.hardFailureCount) + number(vscodeSummary.hardFailureCount),
    projectionCount: projections.length,
    readyProjectionCount: projections.filter((projection) => projection.status === "projection-ready").length,
    readyUxRequirementRefProjectionCount: projections.filter((projection) => projection.uxRequirementRefCount >= 8).length,
    providerReviewVisibleProjectionCount: projections.filter((projection) => projection.providerReviewLinkageVisible === true).length,
    targetOwnerVisibleProjectionCount: projections.filter((projection) => projection.targetOwnerEvidenceVisible === true).length,
    deferredGateVisibleProjectionCount: projections.filter((projection) => projection.deferredGateVisible === true).length,
    vscodeBaselineRequirementRefCount: number(vscodeSummary.vscodeRequirementRefCount),
    checkedApplyWriteEnabledCount: projections.filter((projection) => projection.checkedApplyWriteEnabled === true).length,
    workspaceWriteAllowedCount: projections.filter((projection) => projection.workspaceWriteAllowed === true).length
      + number(intakeSummary.workspaceWriteAllowedCount)
      + number(vscodeSummary.workspaceWriteAllowedCount),
    targetRepositoryMutationAllowedCount: projections.filter((projection) => projection.targetRepositoryMutationAllowed === true).length
      + number(intakeSummary.targetRepositoryMutationCount)
      + number(vscodeSummary.targetRepositoryMutationCount),
    directEditObjectProducedCount: projections.filter((projection) => projection.directEditObjectProduced === true).length
      + number(intakeSummary.directEditObjectCount)
      + number(vscodeSummary.directEditObjectCount),
    providerNetworkExecutedCount: projections.filter((projection) => projection.providerNetworkExecuted === true).length
      + number(intakeSummary.providerNetworkExecutedCount)
      + number(vscodeSummary.providerNetworkExecutedCount),
    targetCommandExecutedByHiaCount: projections.filter((projection) => projection.targetCommandsExecutedByHia === true).length
      + number(intakeSummary.targetCommandExecutedByHiaCount)
      + number(vscodeSummary.targetCommandExecutedByHiaCount),
    actualRuntimeCaptureExecutedCount: projections.filter((projection) => projection.actualRuntimeCaptureExecuted === true).length
      + number(intakeSummary.actualRuntimeCaptureExecutedCount)
      + number(vscodeSummary.actualRuntimeCaptureExecutedCount),
    hostEditorApiCallCount: projections.filter((projection) => projection.hostEditorApiCalled === true).length
      + number(intakeSummary.hostEditorApiCallCount)
      + number(vscodeSummary.hostEditorApiCallCount),
    sourceBodyIncludedCount: projections.filter((projection) => projection.sourceBodyIncluded === true).length
      + (intakeSummary.sourceBodyIncludedInEvidence === true ? 1 : 0)
      + (vscodeSummary.sourceBodyIncludedInEvidence === true ? 1 : 0),
    sourceReferenceIncludedCount: number(intakeSummary.sourceReferenceIncludedCount) + number(vscodeSummary.sourceReferenceIncludedCount),
    documentContentIncludedInEvidenceCount: number(intakeSummary.documentContentIncludedInEvidenceCount) + number(vscodeSummary.documentContentIncludedInEvidenceCount),
    digestValueIncludedInEvidenceCount: number(intakeSummary.digestValueIncludedInEvidenceCount) + number(vscodeSummary.digestValueIncludedInEvidenceCount),
    credentialValueIncludedCount: number(intakeSummary.credentialValueIncludedCount) + number(vscodeSummary.credentialValueIncludedCount),
    pathExposureCount: number(intakeSummary.pathExposureCount) + number(vscodeSummary.pathExposureCount),
    sourcesContentPolicy: projections.every((projection) => projection.sourcesContentPolicy === "none")
      && (intakeSummary.sourcesContentPolicy ?? "none") === "none"
      && (vscodeSummary.sourcesContentPolicy ?? "none") === "none"
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

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderProjectionSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P43.3 DevTools / Visual Studio UX Projection

## Summary

- status: \`${evidence.status}\`
- projections: ${summary.readyProjectionCount} / ${summary.projectionCount} ready
- host UX requirement refs ready: ${summary.readyUxRequirementRefProjectionCount}
- provider review visible: ${summary.providerReviewVisibleProjectionCount}
- target-owner visible: ${summary.targetOwnerVisibleProjectionCount}
- deferred gates visible: ${summary.deferredGateVisibleProjectionCount}
- checked apply write enabled count: ${summary.checkedApplyWriteEnabledCount}
- workspace write / target mutation / direct edit: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationAllowedCount} / ${summary.directEditObjectProducedCount}
- provider network / target commands / runtime capture / host editor API: ${summary.providerNetworkExecutedCount} / ${summary.targetCommandExecutedByHiaCount} / ${summary.actualRuntimeCaptureExecutedCount} / ${summary.hostEditorApiCallCount}
- sourcesContent policy: ${summary.sourcesContentPolicy}

## Next Stage

W-P43.4 can deepen provider review linkage panels while keeping apply and target mutation disabled.
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
