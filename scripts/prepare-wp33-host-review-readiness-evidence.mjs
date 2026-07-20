import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp33-host-review-readiness-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPaths = {
  aiAuthoring: path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json"),
  vscodeManifest: path.join(rootDir, "apps", "vscode-extension", "package.json"),
  vscodeSourceLinkage: path.join(rootDir, "dist", "vscode-source-linkage-runtime-evidence", "evidence.json"),
  vscodeProjectRelations: path.join(rootDir, "dist", "vscode-project-relations-runtime-evidence", "evidence.json"),
  devtools: path.join(rootDir, "dist", "devtools-extension-check.json"),
  visualStudio: path.join(rootDir, "dist", "visual-studio-extension-check.json")
};

await main();

/**
 * 准备 W-P33.1 宿主 review payload 消费就绪矩阵。
 * Prepare the W-P33.1 host review-payload consumption readiness matrix.
 *
 * @returns {Promise<void>} Writes the evidence artifact under `dist/`.
 */
async function main() {
  const aiAuthoring = await readJson(inputPaths.aiAuthoring);
  const vscodeManifest = await readJson(inputPaths.vscodeManifest);
  const vscodeSourceLinkage = await readJson(inputPaths.vscodeSourceLinkage);
  const vscodeProjectRelations = await readJson(inputPaths.vscodeProjectRelations);
  const devtools = await readJson(inputPaths.devtools);
  const visualStudio = await readJson(inputPaths.visualStudio);
  const result = aiAuthoring.result;
  const reviewPayload = result?.reviewPayload;

  const hostRows = [
    createVsCodeHostRow({
      reviewPayload,
      vscodeManifest,
      sourceLinkage: vscodeSourceLinkage,
      projectRelations: vscodeProjectRelations
    }),
    createDevToolsHostRow({
      reviewPayload,
      devtools
    }),
    createVisualStudioHostRow({
      reviewPayload,
      visualStudio
    })
  ];
  const allChecks = hostRows.flatMap((host) => host.checks.map((check) => ({
    hostId: host.id,
    ...check
  })));
  const hardFailures = allChecks.filter((check) => check.status === "fail");
  const implementationGaps = allChecks.filter((check) => check.status === "gap");
  const reviewPayloadSummary = summarizeReviewPayload(reviewPayload);
  const evidence = {
    contract: "hia-wp33-host-review-readiness-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-visible-review-ui-first-slice" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(inputPaths.aiAuthoring),
      vscodeManifest: normalizePath(inputPaths.vscodeManifest),
      vscodeSourceLinkage: normalizePath(inputPaths.vscodeSourceLinkage),
      vscodeProjectRelations: normalizePath(inputPaths.vscodeProjectRelations),
      devtools: normalizePath(inputPaths.devtools),
      visualStudio: normalizePath(inputPaths.visualStudio)
    },
    reviewPayload: reviewPayloadSummary,
    summary: {
      hostCount: hostRows.length,
      readyHostCount: hostRows.filter((host) => host.readiness === "ready-for-first-visible-review-slice").length,
      gapHostCount: hostRows.filter((host) => host.readiness !== "ready-for-first-visible-review-slice").length,
      checkCount: allChecks.length,
      hardFailureCount: hardFailures.length,
      implementationGapCount: implementationGaps.length,
      draftCount: reviewPayloadSummary.draftCount,
      reviewItemCount: reviewPayloadSummary.itemCount,
      localeWarningCount: reviewPayloadSummary.localeQuality.warningCount,
      localeBlockedCount: reviewPayloadSummary.localeQuality.blockedCount
    },
    hosts: hostRows,
    nextImplementationOrder: [
      {
        phase: "W-P33.7",
        hostId: "cycle-closeout",
        reason: "VS Code, DevTools and Visual Studio now have first visible review input surfaces; closeout should record apply-contract and runtime confirmation inputs."
      }
    ],
    manualChecks: [
      "Confirm the first visible host presents review items before any source edit is copied or applied.",
      "Confirm every draft text action is copy/review only until a future apply contract exists.",
      "Confirm locale-quality warnings remain visible next to @lang / <lang> / <l> authoring suggestions.",
      "Confirm all host-open targets are workspace-relative and do not include sourcesContent.",
      "Confirm target repositories continue to read central notify logs instead of receiving direct source mutations."
    ]
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P33 host review readiness evidence");
  assert.equal(hardFailures.length, 0, `W-P33 host review readiness evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P33 host review readiness evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createVsCodeHostRow({ reviewPayload, vscodeManifest, sourceLinkage, projectRelations }) {
  const checks = [
    check("WP33_VSCODE_REVIEW_PAYLOAD_AVAILABLE", reviewPayload?.contract === "hia-documentation-review-payload", {
      expected: "hia-documentation-review-payload",
      actual: reviewPayload?.contract
    }),
    check("WP33_VSCODE_SOURCE_LINKAGE_PREPARED", sourceLinkage?.contract === "hia-vscode-source-linkage-runtime-evidence", {
      expected: "hia-vscode-source-linkage-runtime-evidence",
      actual: sourceLinkage?.contract
    }),
    check("WP33_VSCODE_PROJECT_RELATIONS_PREPARED", projectRelations?.contract === "hia-vscode-project-relations-runtime-evidence", {
      expected: "hia-vscode-project-relations-runtime-evidence",
      actual: projectRelations?.contract
    }),
    check("WP33_VSCODE_COPY_DRAFT_AVAILABLE", countCopyDraftItems(reviewPayload) > 0, {
      expected: "> 0",
      actual: countCopyDraftItems(reviewPayload)
    }),
    check("WP33_VSCODE_APPLY_DISABLED", allReviewItemsDisableApply(reviewPayload), {
      expected: true,
      actual: summarizeApplyAvailability(reviewPayload)
    }),
    check("WP33_VSCODE_VISIBLE_REVIEW_COMMAND", hasVsCodeCommand(vscodeManifest, "hia.reviewDocumentationProposals"), {
      expected: "hia.reviewDocumentationProposals",
      actual: listVsCodeCommands(vscodeManifest)
    })
  ];

  return {
    id: "vscode-extension",
    hostKind: "ide-extension",
    readiness: "ready-for-first-visible-review-slice",
    suggestedPhase: "W-P33.2",
    consumedContracts: [
      "hia-documentation-review-payload@0.1.0-draft",
      "hia-ai-context-package@0.1.0-draft",
      "hia-lsp-host-result@0.1.0-draft",
      "hia-vscode-source-linkage-runtime-evidence@0.1.0-draft",
      "hia-vscode-project-relations-runtime-evidence@0.1.0-draft"
    ],
    capabilities: {
      reviewListCandidate: true,
      copyDraftCandidate: countCopyDraftItems(reviewPayload) > 0,
      openContextCandidate: countOpenContextItems(reviewPayload) > 0,
      sourceLinkageCandidate: sourceLinkage?.sourceLinkage?.linkedEntryCount > 0,
      projectRelationsCandidate: projectRelations?.projectRelations?.relationCount > 0,
      applyCandidate: false,
      requiresHumanReview: true,
      visibleReviewList: true,
      requiresManualRuntimeConfirmation: true
    },
    checks
  };
}

function createDevToolsHostRow({ reviewPayload, devtools }) {
  const checks = [
    check("WP33_DEVTOOLS_REVIEW_PAYLOAD_AVAILABLE", reviewPayload?.contract === "hia-documentation-review-payload", {
      expected: "hia-documentation-review-payload",
      actual: reviewPayload?.contract
    }),
    check("WP33_DEVTOOLS_BRIDGE_ZERO_PERMISSION", devtools?.panel?.bridge?.capabilities?.hostPermissionsRequired === false, {
      expected: false,
      actual: devtools?.panel?.bridge?.capabilities?.hostPermissionsRequired
    }),
    check("WP33_DEVTOOLS_INSPECTED_WINDOW_BRIDGE", devtools?.panel?.bridge?.capabilities?.inspectedWindowEval === true, {
      expected: true,
      actual: devtools?.panel?.bridge?.capabilities?.inspectedWindowEval
    }),
    check("WP33_DEVTOOLS_APPLY_DISABLED", allReviewItemsDisableApply(reviewPayload), {
      expected: true,
      actual: summarizeApplyAvailability(reviewPayload)
    }),
    check("WP33_DEVTOOLS_REVIEW_SURFACE_AVAILABLE", devtools?.panel?.reviewSurface?.contract === "hia-devtools-review-surface", {
      expected: "hia-devtools-review-surface",
      actual: devtools?.panel?.reviewSurface?.contract
    }),
    check("WP33_DEVTOOLS_REVIEW_SURFACE_APPLY_DISABLED", devtools?.panel?.reviewSurface?.applyAvailableCount === 0, {
      expected: 0,
      actual: devtools?.panel?.reviewSurface?.applyAvailableCount
    })
  ];

  return {
    id: "devtools-extension",
    hostKind: "browser-devtools-extension",
    readiness: "ready-for-first-visible-review-slice",
    suggestedPhase: "W-P33.5",
    consumedContracts: [
      "hia-documentation-review-payload@0.1.0-draft",
      "hia-devtools-open-request-bridge@0.1.0-draft"
    ],
    capabilities: {
      reviewListCandidate: true,
      copyDraftCandidate: countCopyDraftItems(reviewPayload) > 0,
      openContextCandidate: true,
      sourceLinkageCandidate: true,
      projectRelationsCandidate: true,
      applyCandidate: false,
      requiresHumanReview: true,
      visibleReviewList: true,
      requiresManualRuntimeConfirmation: true
    },
    checks
  };
}

function createVisualStudioHostRow({ reviewPayload, visualStudio }) {
  const documentationRequest = (visualStudio?.requests ?? []).find((request) => request.method === "hia/documentationEditProposals");
  const reviewSurface = visualStudio?.reviewSurface;
  const checks = [
    check("WP33_VISUAL_STUDIO_REVIEW_PAYLOAD_AVAILABLE", reviewPayload?.contract === "hia-documentation-review-payload", {
      expected: "hia-documentation-review-payload",
      actual: reviewPayload?.contract
    }),
    check("WP33_VISUAL_STUDIO_DOCUMENTATION_REQUEST_MAPPED", documentationRequest?.capability === "hia.documentationEditProposal", {
      expected: "hia.documentationEditProposal",
      actual: documentationRequest?.capability
    }),
    check("WP33_VISUAL_STUDIO_HOST_METADATA_PINNED", visualStudio?.hostResultMetadata?.contract === "hia-lsp-host-result", {
      expected: "hia-lsp-host-result",
      actual: visualStudio?.hostResultMetadata?.contract
    }),
    check("WP33_VISUAL_STUDIO_PRIVACY_NO_MUTATION", visualStudio?.privacy?.allowTargetRepositoryMutation === false, {
      expected: false,
      actual: visualStudio?.privacy?.allowTargetRepositoryMutation
    }),
    check("WP33_VISUAL_STUDIO_APPLY_DISABLED", allReviewItemsDisableApply(reviewPayload), {
      expected: true,
      actual: summarizeApplyAvailability(reviewPayload)
    }),
    check("WP33_VISUAL_STUDIO_REVIEW_SURFACE_AVAILABLE", reviewSurface?.contract === "hia-visual-studio-review-surface", {
      expected: "hia-visual-studio-review-surface",
      actual: reviewSurface?.contract
    }),
    check("WP33_VISUAL_STUDIO_REVIEW_SURFACE_APPLY_DISABLED", reviewSurface?.disabledApply === true, {
      expected: true,
      actual: reviewSurface?.disabledApply
    })
  ];

  return {
    id: "visual-studio-extension",
    hostKind: "ide-extension",
    readiness: "ready-for-first-visible-review-slice",
    suggestedPhase: "W-P33.6",
    consumedContracts: [
      "hia-documentation-review-payload@0.1.0-draft",
      "hia-lsp-host-result@0.1.0-draft",
      "hia-visual-studio-host-skeleton@0.1.0-draft",
      "hia-visual-studio-review-surface@0.1.0-draft"
    ],
    capabilities: {
      reviewListCandidate: true,
      copyDraftCandidate: countCopyDraftItems(reviewPayload) > 0,
      openContextCandidate: true,
      sourceLinkageCandidate: true,
      projectRelationsCandidate: true,
      applyCandidate: false,
      requiresHumanReview: true,
      visibleReviewList: true,
      requiresManualRuntimeConfirmation: true
    },
    checks
  };
}

function summarizeReviewPayload(reviewPayload) {
  return {
    contract: reviewPayload?.contract ?? null,
    contractVersion: reviewPayload?.contractVersion ?? null,
    itemCount: Number(reviewPayload?.summary?.itemCount ?? 0),
    draftCount: Number(reviewPayload?.draftCount ?? 0),
    includesDraftText: Boolean(reviewPayload?.privacy?.includesDraftText),
    includesSourceContent: Boolean(reviewPayload?.privacy?.includesSourceContent),
    allowsAutomaticWrites: Boolean(reviewPayload?.privacy?.allowsAutomaticWrites),
    requiresHumanReview: Boolean(reviewPayload?.privacy?.requiresHumanReview),
    sourcesContentPolicy: reviewPayload?.privacy?.sourcesContentPolicy ?? null,
    actionHints: summarizeApplyAvailability(reviewPayload),
    localeQuality: {
      sourceDocumentTruth: reviewPayload?.localeQuality?.sourceDocumentTruth ?? null,
      canonicalJsOutput: reviewPayload?.localeQuality?.canonicalJsOutput ?? null,
      policyLocales: reviewPayload?.localeQuality?.policyLocales ?? [],
      warningCount: Number(reviewPayload?.localeQuality?.checkSummary?.warning ?? 0),
      blockedCount: Number(reviewPayload?.localeQuality?.checkSummary?.blocked ?? 0)
    }
  };
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function gap(code, message) {
  return {
    code,
    status: "gap",
    message
  };
}

function countCopyDraftItems(reviewPayload) {
  return reviewItems(reviewPayload).filter((item) => item.actionHints?.copyDraftAvailable === true).length;
}

function countOpenContextItems(reviewPayload) {
  return reviewItems(reviewPayload).filter((item) => item.actionHints?.openContextAvailable === true).length;
}

function allReviewItemsDisableApply(reviewPayload) {
  const items = reviewItems(reviewPayload);
  return items.length > 0 && items.every((item) => item.actionHints?.applyAvailable === false);
}

function summarizeApplyAvailability(reviewPayload) {
  const items = reviewItems(reviewPayload);
  return {
    itemCount: items.length,
    applyAvailableCount: items.filter((item) => item.actionHints?.applyAvailable === true).length,
    copyDraftAvailableCount: countCopyDraftItems(reviewPayload),
    openContextAvailableCount: countOpenContextItems(reviewPayload)
  };
}

function reviewItems(reviewPayload) {
  return Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
}

function hasVsCodeCommand(manifest, commandId) {
  return listVsCodeCommands(manifest).includes(commandId);
}

function listVsCodeCommands(manifest) {
  const commands = manifest?.contributes?.commands;

  if (!Array.isArray(commands)) {
    return [];
  }

  return commands
    .map((command) => command?.command)
    .filter((command) => typeof command === "string" && command.length > 0);
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
