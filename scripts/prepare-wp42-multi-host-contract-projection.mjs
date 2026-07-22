import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp42-multi-host-contract-projection");
const evidencePath = path.join(outputRoot, "evidence.json");
const projectionSummaryPath = path.join(outputRoot, "multi-host-contract-projection-summary.md");
const providerTargetBoundaryPath = path.join(rootDir, "dist", "wp42-provider-review-target-owner-boundary", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");

await main();

/**
 * 准备 W-P42.6 multi-host checked apply contract projection evidence。
 * Prepare W-P42.6 multi-host checked apply contract projection evidence.
 *
 * This stage projects the W-P42 hardened checked-apply boundary to VS Code,
 * DevTools and Visual Studio as read-only host inputs. It prepares host-facing
 * projection packets only; it does not launch host runtimes, call editor APIs,
 * run providers, execute target commands or grant write authority.
 *
 * 中文：本阶段把 W-P42 hardened checked-apply boundary 投射到 VS Code、DevTools
 * 与 Visual Studio 的只读宿主输入。它只准备 host-facing projection packet，不启动真实
 * 宿主 runtime、不调用编辑器 API、不执行 provider、不运行目标项目命令，也不授予写入权。
 *
 * @returns {Promise<void>} Writes public-safe W-P42.6 multi-host projection evidence and summary.
 */
async function main() {
  const inputs = await readInputs();
  const projectionSections = createProjectionSections();
  const hostProjections = createHostProjections(projectionSections, inputs);
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    hostProjections,
    inputs,
    nextStageInputs,
    projectionSections
  });
  const checks = [
    check("HIA_WP42_MULTI_HOST_INPUTS_READY", summary.providerTargetBoundaryReady === true
      && summary.devtoolsCheckAvailable === true
      && summary.visualStudioCheckAvailable === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        devtoolsCheckAvailable: summary.devtoolsCheckAvailable,
        inputHardFailureCount: summary.inputHardFailureCount,
        providerTargetBoundaryReady: summary.providerTargetBoundaryReady,
        visualStudioCheckAvailable: summary.visualStudioCheckAvailable
      }
    }),
    check("HIA_WP42_MULTI_HOST_PROJECTIONS_READY", summary.hostProjectionCount === 3
      && summary.readyHostProjectionCount === 3
      && summary.projectionSectionCount >= 5
      && summary.totalProjectedSectionCount === summary.hostProjectionCount * summary.projectionSectionCount, {
      actual: {
        hostProjectionCount: summary.hostProjectionCount,
        projectionSectionCount: summary.projectionSectionCount,
        readyHostProjectionCount: summary.readyHostProjectionCount,
        totalProjectedSectionCount: summary.totalProjectedSectionCount
      }
    }),
    check("HIA_WP42_MULTI_HOST_SURFACE_COVERAGE", summary.vscodeProjectionReady === true
      && summary.devtoolsProjectionReady === true
      && summary.visualStudioProjectionReady === true
      && summary.hostProjectionWithProviderTargetBoundaryCount === 3, {
      actual: {
        devtoolsProjectionReady: summary.devtoolsProjectionReady,
        hostProjectionWithProviderTargetBoundaryCount: summary.hostProjectionWithProviderTargetBoundaryCount,
        visualStudioProjectionReady: summary.visualStudioProjectionReady,
        vscodeProjectionReady: summary.vscodeProjectionReady
      }
    }),
    check("HIA_WP42_MULTI_HOST_NO_RUNTIME_OR_WRITE", summary.actualRuntimeCaptureExecutedCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP42_MULTI_HOST_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false
      && summary.sourceReferenceIncludedCount === 0
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP42_MULTI_HOST_NEXT_STAGE_READY", nextStageInputs.some((item) => item.phase === "W-P42.7")
      && summary.readyForWp42CloseoutAndWp43Inputs === true, {
      actual: {
        nextStages: nextStageInputs.map((item) => item.phase),
        readyForWp42CloseoutAndWp43Inputs: summary.readyForWp42CloseoutAndWp43Inputs
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp42-multi-host-contract-projection-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp42-closeout-and-wp43-inputs" : "blocked",
    sourceEvidence: {
      providerTargetBoundary: normalizePath(providerTargetBoundaryPath),
      devtoolsCheck: normalizePath(devtoolsCheckPath),
      visualStudioCheck: normalizePath(visualStudioCheckPath)
    },
    projectionContract: {
      contract: "hia-checked-apply-multi-host-projection",
      contractVersion: "0.1.0-draft",
      hostProjectionPolicy: "read-only-inputs-no-runtime-capture-claim",
      readyDisposition: "ready-for-wp42-closeout-and-wp43-inputs",
      writeAuthorityGrantedByThisContract: false,
      hostEditorApiAllowedByThisContract: false,
      providerNetworkAllowedByThisContract: false,
      targetCommandAllowedByThisContract: false,
      sourcesContentPolicy: "none"
    },
    projectionSections,
    hostProjections,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      projectionSummary: normalizePath(projectionSummaryPath)
    },
    manualChecks: [
      "Confirm W-P42.7 closeout does not convert these host projection packets into runtime capture completion.",
      "Confirm W-P43 host UX consumes these packets as read-only inputs before any later write-enabled flow is designed.",
      "Confirm VS Code, DevTools and Visual Studio keep provider/target-owner data context-only and never edit-owner.",
      "Confirm actual GUI/runtime capture remains a separately evidenced manual gate."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P42 multi-host projection evidence");
  assert.equal(hardFailures.length, 0, `W-P42 multi-host projection has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(projectionSummaryPath, renderProjectionSummary(evidence), "utf8");
  console.log(`W-P42 multi-host projection evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P42 multi-host projection summary prepared at ${normalizePath(projectionSummaryPath)}`);
}

async function readInputs() {
  return {
    providerTargetBoundary: await readJson(providerTargetBoundaryPath),
    devtoolsCheck: await readJson(devtoolsCheckPath),
    visualStudioCheck: await readJson(visualStudioCheckPath)
  };
}

function createProjectionSections() {
  return [
    section("hardened-transaction-contract", "checked apply transaction envelope, state and gate summary"),
    section("denial-checker-results", "deny-before-write taxonomy and fixture result summary"),
    section("rollback-formatter-audit-controls", "rollback, formatter, post-validation and audit control summary"),
    section("provider-review-boundary", "provider review context-only boundary summary"),
    section("target-owner-evidence-boundary", "target-owner evidence reference-only boundary summary"),
    section("next-user-action", "human review and target-owner action prompt summary")
  ];
}

function section(id, description) {
  return {
    id,
    description,
    status: "required-read-only-projection"
  };
}

function createHostProjections(projectionSections, inputs) {
  return [
    hostProjection("vscode", "VS Code Extension", "extension-review-surface", projectionSections, {
      checkEvidence: "build-and-unit-e2e-checks",
      route: "existing-vscode-extension-review-action-input"
    }),
    hostProjection("devtools", "Chrome DevTools Extension", "browser-devtools-panel", projectionSections, {
      checkEvidence: inputs.devtoolsCheck.contract,
      route: "devtools-panel-read-only-view-model"
    }),
    hostProjection("visual-studio", "Visual Studio Extension", "visual-studio-review-surface", projectionSections, {
      checkEvidence: inputs.visualStudioCheck.contract,
      route: "visual-studio-review-surface-contract"
    })
  ];
}

function hostProjection(id, label, surface, projectionSections, metadata) {
  return {
    id,
    label,
    surface,
    status: "input-ready",
    projectionSectionRefs: projectionSections.map((item) => item.id),
    providerTargetBoundaryIncluded: true,
    denialReasonsIncluded: true,
    rollbackFormatterAuditControlsIncluded: true,
    nextUserActionIncluded: true,
    actualRuntimeCaptureExecuted: false,
    hostEditorApiCalled: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    checkedApplyTriggered: false,
    directApplyAllowed: false,
    directEditObjectProduced: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    providerNetworkExecuted: false,
    targetCommandsExecutedByHia: false,
    sourceBodyIncluded: false,
    sourceReferenceIncluded: false,
    documentContentIncluded: false,
    digestValueIncluded: false,
    credentialValueIncluded: false,
    localAbsolutePathIncluded: false,
    sourcesContentPolicy: "none",
    metadata
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P42.7",
      topic: "closeout-and-wp43-inputs",
      status: "ready-input",
      reason: "All W-P42 hardened contract sections now have read-only multi-host projection packets."
    },
    {
      phase: "W-P43",
      topic: "host-owned-apply-ux-provider-review-linkage",
      status: "planned-input",
      reason: "W-P43 can consume W-P42 closeout and projection packets as host UX inputs."
    }
  ];
}

function summarize({ hostProjections, inputs, nextStageInputs, projectionSections }) {
  const inputSummary = inputs.providerTargetBoundary.summary;
  return {
    providerTargetBoundaryReady: inputs.providerTargetBoundary.status === "ready-for-multi-host-contract-projection",
    devtoolsCheckAvailable: inputs.devtoolsCheck.contract === "hia-devtools-extension-check",
    visualStudioCheckAvailable: inputs.visualStudioCheck.contract === "hia-visual-studio-extension-check",
    inputHardFailureCount: number(inputSummary?.hardFailureCount),
    inheritedBoundaryControlCount: number(inputSummary?.boundaryControlCount),
    inheritedBoundaryFixtureCount: number(inputSummary?.fixtureCount),
    inheritedBoundaryMismatches: number(inputSummary?.mismatchedFixtureCount),
    projectionSectionCount: projectionSections.length,
    hostProjectionCount: hostProjections.length,
    readyHostProjectionCount: hostProjections.filter((item) => item.status === "input-ready").length,
    totalProjectedSectionCount: hostProjections.reduce((total, item) => total + item.projectionSectionRefs.length, 0),
    hostProjectionWithProviderTargetBoundaryCount: hostProjections.filter((item) => item.providerTargetBoundaryIncluded === true).length,
    vscodeProjectionReady: hostProjections.some((item) => item.id === "vscode" && item.status === "input-ready"),
    devtoolsProjectionReady: hostProjections.some((item) => item.id === "devtools" && item.status === "input-ready"),
    visualStudioProjectionReady: hostProjections.some((item) => item.id === "visual-studio" && item.status === "input-ready"),
    readyForWp42CloseoutAndWp43Inputs: nextStageInputs.some((item) => item.phase === "W-P42.7" && item.status === "ready-input"),
    nextStageInputCount: nextStageInputs.length,
    actualRuntimeCaptureExecutedCount: hostProjections.filter((item) => item.actualRuntimeCaptureExecuted === true).length,
    hostEditorApiCallCount: hostProjections.filter((item) => item.hostEditorApiCalled === true).length,
    workspaceWriteAllowedCount: hostProjections.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: hostProjections.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    checkedApplyTriggeredCount: hostProjections.filter((item) => item.checkedApplyTriggered === true).length,
    directApplyAllowedCount: hostProjections.filter((item) => item.directApplyAllowed === true).length,
    directEditObjectCount: hostProjections.filter((item) => item.directEditObjectProduced === true).length,
    providerOwnedApplyCount: hostProjections.filter((item) => item.providerOwnedApplyAllowed === true).length,
    lspServerOwnedApplyCount: hostProjections.filter((item) => item.lspServerOwnedApplyAllowed === true).length,
    providerNetworkExecutedCount: hostProjections.filter((item) => item.providerNetworkExecuted === true).length,
    targetCommandExecutedByHiaCount: hostProjections.filter((item) => item.targetCommandsExecutedByHia === true).length,
    sourceBodyIncludedInEvidence: hostProjections.some((item) => item.sourceBodyIncluded === true),
    sourceReferenceIncludedCount: hostProjections.filter((item) => item.sourceReferenceIncluded === true).length,
    documentContentIncludedInEvidenceCount: hostProjections.filter((item) => item.documentContentIncluded === true).length,
    digestValueIncludedInEvidenceCount: hostProjections.filter((item) => item.digestValueIncluded === true).length,
    credentialValueIncludedCount: hostProjections.filter((item) => item.credentialValueIncluded === true).length,
    forbiddenDocumentTextMarkerCount: number(inputSummary?.forbiddenDocumentTextMarkerCount),
    pathExposureCount: hostProjections.filter((item) => item.localAbsolutePathIncluded === true).length,
    sourcesContentPolicy: hostProjections.every((item) => item.sourcesContentPolicy === "none") ? "none" : "mixed"
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
  return `# W-P42 Multi-Host Contract Projection

## Summary

- status: \`${evidence.status}\`
- projection sections: ${summary.projectionSectionCount}
- host projections: ${summary.hostProjectionCount}
- ready host projections: ${summary.readyHostProjectionCount}
- total projected sections: ${summary.totalProjectedSectionCount}
- VS Code / DevTools / Visual Studio ready: ${summary.vscodeProjectionReady} / ${summary.devtoolsProjectionReady} / ${summary.visualStudioProjectionReady}
- runtime capture / host editor API / checked apply trigger: ${summary.actualRuntimeCaptureExecutedCount} / ${summary.hostEditorApiCallCount} / ${summary.checkedApplyTriggeredCount}
- workspace write / target mutation / direct edit: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.directEditObjectCount}

## Next Stage

W-P42.7 should close W-P42 and prepare W-P43 host UX inputs from this projection.
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
