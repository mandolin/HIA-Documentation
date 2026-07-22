import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp43-provider-review-linkage-panel");
const evidencePath = path.join(outputRoot, "evidence.json");
const panelSummaryPath = path.join(outputRoot, "provider-review-linkage-panel.md");
const wp40ProviderReviewPath = path.join(rootDir, "dist", "wp40-provider-result-review-linkage", "evidence.json");
const wp41HandoffPath = path.join(rootDir, "dist", "wp41-provider-review-payload-handoff", "evidence.json");
const wp43ProjectionPath = path.join(rootDir, "dist", "wp43-devtools-visual-studio-ux-projection", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");
const vscodeConfigPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.ts");
const vscodeExtensionPath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");
const vscodeConfigTestPath = path.join(rootDir, "apps", "vscode-extension", "src", "config.test.ts");

await main();

/**
 * 准备 W-P43.4 provider review linkage panel evidence。
 * Prepare W-P43.4 provider review linkage panel evidence.
 *
 * This stage turns provider result/refusal/review metadata into host-visible
 * review-only panel contracts for VS Code, DevTools and Visual Studio. It
 * consumes previous blocked/refused provider and target-owner handoff evidence
 * but does not run providers, networks, target commands or apply writes.
 *
 * 中文：本阶段将 provider result/refusal/review metadata 转成 VS Code、DevTools
 * 与 Visual Studio 可见的 review-only panel contract。它消费此前 blocked/refused
 * provider 与 target-owner handoff evidence，但不执行 provider、网络、目标命令或
 * checked apply 写入。
 *
 * @returns {Promise<void>} Writes public-safe W-P43.4 provider panel evidence.
 */
async function main() {
  const inputs = await readInputs();
  const providerPanels = [
    createVscodePanel(inputs),
    createDevToolsPanel(inputs.devtoolsCheck),
    createVisualStudioPanel(inputs.visualStudioCheck)
  ];
  const summary = summarize(inputs, providerPanels);
  const checks = [
    check("HIA_WP43_PROVIDER_PANEL_INPUTS_READY", summary.wp40ProviderReviewReady === true
      && summary.wp41HandoffReady === true
      && summary.wp43MultiHostUxReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        wp40ProviderReviewReady: summary.wp40ProviderReviewReady,
        wp41HandoffReady: summary.wp41HandoffReady,
        wp43MultiHostUxReady: summary.wp43MultiHostUxReady
      }
    }),
    check("HIA_WP43_PROVIDER_PANEL_HOSTS_READY", summary.hostPanelCount === 3
      && summary.readyHostPanelCount === 3
      && summary.resultTaxonomyKindCount >= 5
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.refusalResultProduced === true
      && summary.targetOwnerHandoffVisibleHostCount === 3, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        hostPanelCount: summary.hostPanelCount,
        readyHostPanelCount: summary.readyHostPanelCount,
        refusalResultProduced: summary.refusalResultProduced,
        resultTaxonomyKindCount: summary.resultTaxonomyKindCount,
        targetOwnerHandoffVisibleHostCount: summary.targetOwnerHandoffVisibleHostCount
      }
    }),
    check("HIA_WP43_PROVIDER_PANEL_NO_WRITE_OR_EXECUTION", summary.reviewOnlyOutputRequiredHostCount === 3
      && summary.requiresHumanReviewHostCount === 3
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        requiresHumanReviewHostCount: summary.requiresHumanReviewHostCount,
        reviewOnlyOutputRequiredHostCount: summary.reviewOnlyOutputRequiredHostCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP43_PROVIDER_PANEL_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp43-provider-review-linkage-panel-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp43-target-owner-evidence-view-and-deferred-gates" : "blocked",
    sourceEvidence: {
      wp40ProviderReviewLinkage: normalizePath(wp40ProviderReviewPath),
      wp41ProviderReviewHandoff: normalizePath(wp41HandoffPath),
      wp43DevtoolsVisualStudioUxProjection: normalizePath(wp43ProjectionPath),
      devtoolsExtensionCheck: normalizePath(devtoolsCheckPath),
      visualStudioExtensionCheck: normalizePath(visualStudioCheckPath),
      vscodeConfig: normalizePath(vscodeConfigPath),
      vscodeExtension: normalizePath(vscodeExtensionPath),
      vscodeConfigTest: normalizePath(vscodeConfigTestPath)
    },
    providerPanels,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      panelSummary: normalizePath(panelSummaryPath)
    },
    nextStageInputs: [
      {
        phase: "W-P43.5",
        topic: "target-owner-evidence-view-and-deferred-gates",
        status: "ready-input",
        writeAuthorityGranted: false
      }
    ],
    manualChecks: [
      "Confirm provider panel displays blocked/refused result as review metadata only.",
      "Confirm target-owner handoff is visible but not marked as target-owner execution.",
      "Confirm provider output still cannot become a direct edit object or checked apply trigger."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P43 provider review linkage panel evidence");
  assert.equal(hardFailures.length, 0, `W-P43 provider review linkage panel has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(panelSummaryPath, renderPanelSummary(evidence), "utf8");
  console.log(`W-P43 provider review linkage panel evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P43 provider review linkage panel summary prepared at ${normalizePath(panelSummaryPath)}`);
}

async function readInputs() {
  const [
    wp40ProviderReview,
    wp41Handoff,
    wp43Projection,
    devtoolsCheck,
    visualStudioCheck,
    vscodeConfig,
    vscodeExtension,
    vscodeConfigTest
  ] = await Promise.all([
    readJson(wp40ProviderReviewPath),
    readJson(wp41HandoffPath),
    readJson(wp43ProjectionPath),
    readJson(devtoolsCheckPath),
    readJson(visualStudioCheckPath),
    readFile(vscodeConfigPath, "utf8"),
    readFile(vscodeExtensionPath, "utf8"),
    readFile(vscodeConfigTestPath, "utf8")
  ]);

  return {
    devtoolsCheck,
    visualStudioCheck,
    vscodeConfig,
    vscodeConfigTest,
    vscodeExtension,
    wp40ProviderReview,
    wp41Handoff,
    wp43Projection
  };
}

function createVscodePanel(inputs) {
  return {
    host: "vscode",
    status: inputs.vscodeConfig.includes("createHiaDocumentationReviewProviderReport")
      && inputs.vscodeExtension.includes("showHiaDocumentationProviderReview")
      && inputs.vscodeExtension.includes("Show provider review metadata")
      && inputs.vscodeConfigTest.includes("Provider workspace write: disabled")
      ? "panel-ready"
      : "blocked",
    contract: "hia-vscode-provider-review-linkage-panel",
    providerId: inputs.wp40ProviderReview.summary?.providerId || "unknown",
    resultTaxonomyKindCount: number(inputs.wp40ProviderReview.summary?.resultTaxonomyKindCount),
    blockedProviderReviewShapeAccepted: inputs.wp41Handoff.summary?.blockedProviderReviewShapeAccepted === true,
    refusalResultVisible: inputs.wp40ProviderReview.summary?.refusalResultProduced === true,
    reviewOnlyOutputRequired: inputs.wp40ProviderReview.summary?.reviewOnlyOutputRequired === true,
    requiresHumanReview: inputs.wp40ProviderReview.summary?.requiresHumanReview === true,
    targetOwnerHandoffVisible: inputs.wp41Handoff.summary?.targetOwnerEvidenceSectionBound === true,
    directApplyAllowed: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerNetworkExecuted: false,
    sourcesContentPolicy: "none"
  };
}

function createDevToolsPanel(devtoolsCheck) {
  const panel = devtoolsCheck.panel?.reviewSurface?.providerReviewPanel ?? {};

  return {
    host: "devtools",
    status: panel.status === "input-ready" ? "panel-ready" : "blocked",
    contract: panel.contract,
    providerId: panel.providerId || "unknown",
    resultTaxonomyKindCount: number(panel.resultTaxonomyKindCount),
    blockedProviderReviewShapeAccepted: panel.blockedProviderReviewShapeAccepted === true,
    refusalResultVisible: panel.refusalResultVisible === true,
    reviewOnlyOutputRequired: panel.reviewOnlyOutputRequired === true,
    requiresHumanReview: panel.requiresHumanReview === true,
    targetOwnerHandoffVisible: panel.targetOwnerHandoffVisible === true,
    directApplyAllowed: panel.directApplyAllowed === true,
    workspaceWriteAllowed: panel.workspaceWriteAllowed === true,
    targetRepositoryMutationAllowed: panel.targetRepositoryMutationAllowed === true,
    providerNetworkExecuted: panel.providerNetworkExecuted === true,
    sourcesContentPolicy: panel.sourcesContentPolicy || "none"
  };
}

function createVisualStudioPanel(visualStudioCheck) {
  const panel = visualStudioCheck.reviewSurface?.providerReviewPanel ?? {};

  return {
    host: "visual-studio",
    status: panel.status === "input-ready" ? "panel-ready" : "blocked",
    contract: panel.contract,
    providerId: panel.providerIdSource || "providerAugmentation.provider.id",
    resultTaxonomyKindCount: number(panel.resultTaxonomyKindCount),
    blockedProviderReviewShapeAccepted: panel.blockedProviderReviewShapeAccepted === true,
    refusalResultVisible: panel.refusalResultVisible === true,
    reviewOnlyOutputRequired: panel.reviewOnlyOutputRequired === true,
    requiresHumanReview: panel.requiresHumanReview === true,
    targetOwnerHandoffVisible: panel.targetOwnerHandoffVisible === true,
    directApplyAllowed: panel.directApplyAllowed === true,
    workspaceWriteAllowed: panel.workspaceWriteAvailable === true,
    targetRepositoryMutationAllowed: panel.targetRepositoryMutation === true,
    providerNetworkExecuted: panel.providerNetworkExecuted === true,
    sourcesContentPolicy: panel.sourcesContentPolicy || "none"
  };
}

function summarize(inputs, providerPanels) {
  const wp40Summary = inputs.wp40ProviderReview.summary || {};
  const wp41Summary = inputs.wp41Handoff.summary || {};
  const wp43Summary = inputs.wp43Projection.summary || {};

  return {
    wp40ProviderReviewReady: inputs.wp40ProviderReview.status === "ready-for-wp40-closeout-and-wp41-wp42-inputs",
    wp41HandoffReady: inputs.wp41Handoff.status === "ready-for-target-owner-dry-run-evidence",
    wp43MultiHostUxReady: inputs.wp43Projection.status === "ready-for-wp43-provider-review-linkage-panel",
    inputHardFailureCount: number(wp40Summary.hardFailureCount) + number(wp41Summary.hardFailureCount) + number(wp43Summary.hardFailureCount),
    hostPanelCount: providerPanels.length,
    readyHostPanelCount: providerPanels.filter((panel) => panel.status === "panel-ready").length,
    resultTaxonomyKindCount: number(wp40Summary.resultTaxonomyKindCount),
    blockedProviderReviewShapeAccepted: wp41Summary.blockedProviderReviewShapeAccepted === true,
    refusalResultProduced: wp40Summary.refusalResultProduced === true,
    targetOwnerHandoffVisibleHostCount: providerPanels.filter((panel) => panel.targetOwnerHandoffVisible === true).length,
    reviewOnlyOutputRequiredHostCount: providerPanels.filter((panel) => panel.reviewOnlyOutputRequired === true).length,
    requiresHumanReviewHostCount: providerPanels.filter((panel) => panel.requiresHumanReview === true).length,
    directApplyAllowedCount: providerPanels.filter((panel) => panel.directApplyAllowed === true).length + number(wp40Summary.directApplyAllowedCount) + number(wp41Summary.directApplyAllowedCount),
    checkedApplyTriggeredCount: number(wp40Summary.checkedApplyTriggeredCount) + number(wp41Summary.checkedApplyTriggeredCount),
    workspaceWriteAllowedCount: providerPanels.filter((panel) => panel.workspaceWriteAllowed === true).length + number(wp40Summary.workspaceWriteAllowedCount) + number(wp41Summary.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: providerPanels.filter((panel) => panel.targetRepositoryMutationAllowed === true).length + number(wp40Summary.targetRepositoryMutationCount) + number(wp41Summary.targetRepositoryMutationCount),
    directEditObjectCount: number(wp40Summary.directEditObjectCount) + number(wp41Summary.directEditObjectCount),
    providerNetworkExecutedCount: providerPanels.filter((panel) => panel.providerNetworkExecuted === true).length
      + (wp40Summary.externalNetworkCallExecuted === true ? 1 : 0)
      + (wp40Summary.realRemoteProviderInvocationExecuted === true ? 1 : 0)
      + (wp41Summary.externalNetworkCallExecuted === true ? 1 : 0)
      + (wp41Summary.realRemoteProviderInvocationExecuted === true ? 1 : 0),
    targetCommandExecutedByHiaCount: wp41Summary.targetCommandsExecutedByHia === true ? 1 : 0,
    credentialValueIncludedCount: number(wp40Summary.credentialValueIncludedCount) + number(wp41Summary.credentialValueIncludedCount),
    sourceReferenceIncludedCount: number(wp40Summary.sourceReferenceIncludedCount) + number(wp41Summary.sourceReferenceIncludedCount),
    sourceTextIncludedCount: number(wp40Summary.sourceTextIncludedCount) + number(wp41Summary.sourceTextIncludedCount),
    credentialMaterialMarkerCount: number(wp40Summary.credentialMaterialMarkerCount) + number(wp41Summary.credentialMaterialMarkerCount),
    forbiddenDocumentTextMarkerCount: number(wp40Summary.forbiddenDocumentTextMarkerCount) + number(wp41Summary.forbiddenDocumentTextMarkerCount),
    pathExposureCount: number(wp40Summary.pathExposureCount) + number(wp41Summary.pathExposureCount),
    sourcesContentPolicy: providerPanels.every((panel) => panel.sourcesContentPolicy === "none")
      && (wp40Summary.sourcesContentPolicy ?? "none") === "none"
      && (wp41Summary.sourcesContentPolicy ?? "none") === "none"
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

function renderPanelSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P43.4 Provider Review Linkage Panel

## Summary

- status: \`${evidence.status}\`
- host panels: ${summary.readyHostPanelCount} / ${summary.hostPanelCount} ready
- provider taxonomy kinds: ${summary.resultTaxonomyKindCount}
- blocked provider review shape accepted: ${summary.blockedProviderReviewShapeAccepted}
- refusal result produced: ${summary.refusalResultProduced}
- target-owner handoff visible hosts: ${summary.targetOwnerHandoffVisibleHostCount}
- review-only hosts: ${summary.reviewOnlyOutputRequiredHostCount}
- direct apply / checked apply trigger / workspace write / target mutation / direct edit: ${summary.directApplyAllowedCount} / ${summary.checkedApplyTriggeredCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.directEditObjectCount}
- provider network / target commands by HIA: ${summary.providerNetworkExecutedCount} / ${summary.targetCommandExecutedByHiaCount}
- sourcesContent policy: ${summary.sourcesContentPolicy}

## Next Stage

W-P43.5 can deepen target-owner evidence completeness and deferred gate banners.
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
