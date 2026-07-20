import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createDeterministicMockProvider
} from "../packages/provider-mock/dist/index.js";
import {
  runHiaLocalProvider
} from "../packages/provider-runner/dist/index.js";
import {
  createHiaDocumentationReviewItemChoices,
  createHiaDocumentationReviewItemReport,
  createHiaDocumentationReviewProviderReport,
  createHiaDocumentationReviewReport
} from "../apps/vscode-extension/dist/config.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp35-host-review-provider-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const runnerEvidencePath = path.join(rootDir, "dist", "wp35-provider-runner-evidence", "evidence.json");
const aiAuthoringEvidencePath = path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json");
const visualStudioReviewSurfacePath = path.join(rootDir, "apps", "visual-studio-extension", "review-surface.json");
const {
  createHiaDevToolsPanelViewModel
} = await import(pathToFileURL(path.join(rootDir, "apps", "devtools-extension", "panel-core.js")).href);

await main();

/**
 * 准备 W-P35.5 host review provider evidence。
 * Prepare W-P35.5 host review provider evidence.
 *
 * The evidence proves that VS Code, DevTools and Visual Studio review surfaces
 * can consume provider review-payload augmentation while direct apply, writes,
 * external API keys and target mutations remain disabled.
 *
 * 本 evidence 证明 VS Code、DevTools 与 Visual Studio review surface 能消费
 * provider review-payload augmentation，同时继续禁用直接 apply、写入、外部 API
 * key 和目标仓库修改。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const runnerEvidence = await readJson(runnerEvidencePath);
  const aiAuthoringEvidence = await readJson(aiAuthoringEvidencePath);
  const visualStudioReviewSurface = await readJson(visualStudioReviewSurfacePath);
  const providerRun = await runHiaLocalProvider({
    provider: createDeterministicMockProvider(),
    reviewPayload: aiAuthoringEvidence.result.reviewPayload,
    requestId: "wp35-host-review-provider",
    profileIds: ["jsdoc", "tsdoc"]
  });
  const providerAugmentation = providerRun.reviewPayloadAugmentation;
  const reviewPayload = {
    ...aiAuthoringEvidence.result.reviewPayload,
    providerAugmentation
  };
  const vscodeInput = {
    ...aiAuthoringEvidence.result,
    providerAugmentation,
    reviewPayload
  };
  const vscodeReport = createHiaDocumentationReviewReport(vscodeInput);
  const vscodeChoices = createHiaDocumentationReviewItemChoices(reviewPayload, providerAugmentation);
  const vscodeFirstItemReport = createHiaDocumentationReviewItemReport(reviewPayload.items[0], providerAugmentation);
  const vscodeProviderReport = createHiaDocumentationReviewProviderReport(providerAugmentation);
  const devtoolsModel = createHiaDevToolsPanelViewModel({
    entries: [],
    providerAugmentation,
    relationGraph: {
      nodes: [],
      relations: []
    },
    reviewPayload,
    summary: {
      entryCount: 0,
      linkedEntryCount: 0,
      relationCount: 0,
      relationNodeCount: 0
    }
  });
  const summary = {
    runnerReady: runnerEvidence.status === "ready-for-host-review-integration-refresh",
    runnerHardFailureCount: runnerEvidence.summary?.hardFailureCount ?? 0,
    providerStatus: providerAugmentation.status,
    providerId: providerAugmentation.provider.id,
    providerRuntimeKind: providerAugmentation.provider.runtimeKind,
    providerDraftOutputCount: providerAugmentation.draftOutputs.length,
    providerReviewMetadataCount: providerAugmentation.reviewMetadata.length,
    providerRefusalOutputCount: providerAugmentation.refusalOutputs.length,
    vscodeProviderLineCount: vscodeReport.filter((line) => line.startsWith("Provider")).length,
    vscodeProviderAwareChoiceCount: vscodeChoices.filter((choice) => choice.detail?.includes("provider:drafts=")).length,
    vscodeFirstItemProviderLineCount: vscodeFirstItemReport.filter((line) => line.startsWith("Provider")).length,
    vscodeProviderReportLineCount: vscodeProviderReport.length,
    devtoolsProviderContract: devtoolsModel.review.provider.contract,
    devtoolsProviderDraftOutputCount: devtoolsModel.review.provider.draftOutputCount,
    devtoolsProviderReviewMetadataCount: devtoolsModel.review.provider.reviewMetadataCount,
    devtoolsProviderRefusalOutputCount: devtoolsModel.review.provider.refusalOutputCount,
    devtoolsProviderAwareItemCount: devtoolsModel.review.items.filter((item) => item.provider.draftOutputCount > 0).length,
    visualStudioProviderReviewStatus: visualStudioReviewSurface.providerReview?.status,
    visualStudioProviderReviewInputMode: visualStudioReviewSurface.providerReview?.inputMode,
    visualStudioProviderRequiredFieldCount: Array.isArray(visualStudioReviewSurface.providerReview?.requiredFields)
      ? visualStudioReviewSurface.providerReview.requiredFields.length
      : 0,
    visualStudioProviderAugmentationContract: visualStudioReviewSurface.surface?.providerAugmentationContract,
    directEditObjectCount: countDirectEditObjects({
      devtoolsProvider: devtoolsModel.review.provider,
      providerAugmentation,
      visualStudioProviderReview: visualStudioReviewSurface.providerReview
    }),
    sourceBodyMarkerCount: countForbiddenSourceBodyMarkers({
      devtoolsProvider: devtoolsModel.review.provider,
      providerAugmentation,
      visualStudioProviderReview: visualStudioReviewSurface.providerReview
    }),
    directApplyAllowed: providerAugmentation.actionPolicy.directApplyAllowed,
    workspaceWriteAllowed: providerAugmentation.actionPolicy.workspaceWriteAllowed,
    targetRepositoryMutationAllowed: providerAugmentation.actionPolicy.targetRepositoryMutationAllowed,
    toolExecutionAllowed: providerAugmentation.actionPolicy.toolExecutionAllowed,
    externalProviderApiKeyRequired: visualStudioReviewSurface.providerReview?.externalProviderApiKeyRequired,
    externalProviderNetworkAllowed: visualStudioReviewSurface.providerReview?.externalProviderNetworkAllowed,
    sourcesContentPolicy: providerAugmentation.privacy.sourcesContentPolicy,
    includesSourceBody: providerAugmentation.privacy.includesSourceBody,
    includesSourcesContent: providerAugmentation.privacy.includesSourcesContent
  };
  const checks = [
    check("HIA_WP35_HOST_REVIEW_RUNNER_READY", summary.runnerReady === true
      && summary.runnerHardFailureCount === 0
      && summary.providerStatus === "success", {
      actual: {
        providerStatus: summary.providerStatus,
        runnerHardFailureCount: summary.runnerHardFailureCount,
        runnerReady: summary.runnerReady
      }
    }),
    check("HIA_WP35_HOST_REVIEW_VSCODE_PROVIDER_VISIBLE", summary.vscodeProviderLineCount >= 6
      && summary.vscodeProviderAwareChoiceCount === reviewPayload.items.length
      && summary.vscodeFirstItemProviderLineCount >= 5
      && vscodeProviderReport.includes("Provider workspace write: disabled"), {
      actual: {
        firstItemProviderLineCount: summary.vscodeFirstItemProviderLineCount,
        providerAwareChoiceCount: summary.vscodeProviderAwareChoiceCount,
        providerLineCount: summary.vscodeProviderLineCount,
        providerReportLineCount: summary.vscodeProviderReportLineCount
      }
    }),
    check("HIA_WP35_HOST_REVIEW_DEVTOOLS_PROVIDER_VISIBLE", summary.devtoolsProviderContract === "hia-provider-review-payload-augmentation"
      && summary.devtoolsProviderDraftOutputCount === summary.providerDraftOutputCount
      && summary.devtoolsProviderReviewMetadataCount === summary.providerReviewMetadataCount
      && summary.devtoolsProviderAwareItemCount === reviewPayload.items.length, {
      actual: {
        devtoolsProviderAwareItemCount: summary.devtoolsProviderAwareItemCount,
        devtoolsProviderContract: summary.devtoolsProviderContract,
        devtoolsProviderDraftOutputCount: summary.devtoolsProviderDraftOutputCount,
        devtoolsProviderReviewMetadataCount: summary.devtoolsProviderReviewMetadataCount
      }
    }),
    check("HIA_WP35_HOST_REVIEW_VISUAL_STUDIO_PROVIDER_READY", summary.visualStudioProviderReviewStatus === "input-ready"
      && summary.visualStudioProviderReviewInputMode === "review-payload-augmentation-only"
      && summary.visualStudioProviderRequiredFieldCount >= 8
      && summary.visualStudioProviderAugmentationContract === "hia-provider-review-payload-augmentation@0.1.0-draft", {
      actual: {
        providerAugmentationContract: summary.visualStudioProviderAugmentationContract,
        providerReviewInputMode: summary.visualStudioProviderReviewInputMode,
        providerReviewStatus: summary.visualStudioProviderReviewStatus,
        providerRequiredFieldCount: summary.visualStudioProviderRequiredFieldCount
      }
    }),
    check("HIA_WP35_HOST_REVIEW_REVIEW_ONLY_BOUNDARY", summary.directEditObjectCount === 0
      && summary.sourceBodyMarkerCount === 0
      && summary.directApplyAllowed === false
      && summary.workspaceWriteAllowed === false
      && summary.targetRepositoryMutationAllowed === false
      && summary.toolExecutionAllowed === false
      && summary.externalProviderApiKeyRequired === false
      && summary.externalProviderNetworkAllowed === false
      && summary.sourcesContentPolicy === "none"
      && summary.includesSourceBody === false
      && summary.includesSourcesContent === false, {
      actual: {
        directApplyAllowed: summary.directApplyAllowed,
        directEditObjectCount: summary.directEditObjectCount,
        externalProviderApiKeyRequired: summary.externalProviderApiKeyRequired,
        externalProviderNetworkAllowed: summary.externalProviderNetworkAllowed,
        includesSourceBody: summary.includesSourceBody,
        includesSourcesContent: summary.includesSourcesContent,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy,
        targetRepositoryMutationAllowed: summary.targetRepositoryMutationAllowed,
        toolExecutionAllowed: summary.toolExecutionAllowed,
        workspaceWriteAllowed: summary.workspaceWriteAllowed
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp35-host-review-provider-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-self-doc-provider-dry-run" : "blocked",
    sourceEvidence: {
      aiAuthoringProposals: normalizePath(aiAuthoringEvidencePath),
      providerRunner: normalizePath(runnerEvidencePath),
      visualStudioReviewSurface: "apps/visual-studio-extension/review-surface.json"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P35.6",
        topic: "target-self-doc-provider-dry-run",
        reason: "Host review surfaces now consume provider augmentation without enabling apply or write authority."
      }
    ],
    manualChecks: [
      "Confirm visible host review UX can label provider origin and refusal state without implying automatic apply.",
      "Confirm real provider API keys remain out of scope until explicit secret and network mediation exists.",
      "Confirm target project dry-runs remain read-only and use central notify only."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P35 host review provider evidence");
  assert.equal(hardFailures.length, 0, `W-P35 host review provider evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P35 host review provider evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "workspaceEdit") ||
      Object.hasOwn(node, "documentChanges") ||
      Object.hasOwn(node, "changes") ||
      Object.hasOwn(node, "patch") ||
      Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countForbiddenSourceBodyMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "sourceText") ||
      Object.hasOwn(node, "sourceBody") ||
      Object.hasOwn(node, "rawSource") ||
      Object.hasOwn(node, "sourceExcerpt")
    ) {
      count += 1;
    }
  });
  return count;
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

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
