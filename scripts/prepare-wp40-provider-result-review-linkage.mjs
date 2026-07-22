import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp40-provider-result-review-linkage");
const evidencePath = path.join(outputRoot, "evidence.json");
const linkagePacketPath = path.join(outputRoot, "provider-result-review-linkage-packet.md");
const hostProjectionPath = path.join(outputRoot, "host-review-surface-projection.md");
const smokeGateEvidencePath = path.join(rootDir, "dist", "wp40-real-remote-provider-smoke-execution-gate", "evidence.json");
const requestPreviewEvidencePath = path.join(rootDir, "dist", "wp40-request-preview-privacy-dry-run", "evidence.json");

await main();

/**
 * 准备 W-P40.6 provider result/refusal review linkage evidence。
 * Prepare W-P40.6 provider result/refusal review linkage evidence.
 *
 * This stage consumes the W-P40.5 blocked/refused smoke result shape and links
 * it into a host-neutral review payload. It also records the future success,
 * refusal, rate-limit and error shape taxonomy as non-produced review shapes so
 * hosts can render them consistently later.
 *
 * 中文：本阶段消费 W-P40.5 的 blocked/refused smoke result shape，并把它接入
 * 宿主中立 review payload。同时将未来 success、refusal、rate-limit、error 的
 * shape taxonomy 记录为未产出的 review shape，方便后续宿主统一显示。
 *
 * @returns {Promise<void>} Writes public-safe provider result review linkage evidence.
 */
async function main() {
  const smokeGateEvidence = await readJson(smokeGateEvidencePath);
  const requestPreviewEvidence = await readJson(requestPreviewEvidencePath);
  const resultTaxonomy = createProviderResultTaxonomy(smokeGateEvidence);
  const reviewPayload = createReviewPayload(smokeGateEvidence, resultTaxonomy);
  const hostReviewProjection = createHostReviewProjection(reviewPayload);
  const summary = summarize({
    hostReviewProjection,
    requestPreviewEvidence,
    resultTaxonomy,
    reviewPayload,
    smokeGateEvidence
  });
  const checks = [
    check("HIA_WP40_PROVIDER_RESULT_LINKAGE_INPUTS_READY", summary.smokeGateReady === true
      && summary.requestPreviewReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        requestPreviewStatus: requestPreviewEvidence.status,
        smokeGateStatus: smokeGateEvidence.status
      }
    }),
    check("HIA_WP40_PROVIDER_RESULT_LINKAGE_BLOCKED_RESULT_CONSUMED", summary.actualResultShapeCount === 1
      && summary.blockedResultShapeCount === 1
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.reviewPayloadItemCount === 1, {
      actual: {
        actualResultShapeCount: summary.actualResultShapeCount,
        blockedResultShapeCount: summary.blockedResultShapeCount,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced,
        reviewPayloadItemCount: summary.reviewPayloadItemCount
      }
    }),
    check("HIA_WP40_PROVIDER_RESULT_LINKAGE_TAXONOMY_READY", summary.resultTaxonomyKindCount >= 5
      && summary.nonProducedShapeCount >= 4
      && summary.futureSuccessShapeCount === 1
      && summary.futureRefusalShapeCount === 1
      && summary.futureRateLimitShapeCount === 1
      && summary.futureErrorShapeCount === 1, {
      actual: {
        futureErrorShapeCount: summary.futureErrorShapeCount,
        futureRateLimitShapeCount: summary.futureRateLimitShapeCount,
        futureRefusalShapeCount: summary.futureRefusalShapeCount,
        futureSuccessShapeCount: summary.futureSuccessShapeCount,
        nonProducedShapeCount: summary.nonProducedShapeCount,
        resultTaxonomyKindCount: summary.resultTaxonomyKindCount
      }
    }),
    check("HIA_WP40_PROVIDER_RESULT_LINKAGE_HOSTS_READY", summary.hostProjectionCount === 3
      && summary.hostProjectionReadyCount === 3
      && summary.vscodeProjectionReady === true
      && summary.devtoolsProjectionReady === true
      && summary.visualStudioProjectionReady === true, {
      actual: {
        devtoolsProjectionReady: summary.devtoolsProjectionReady,
        hostProjectionCount: summary.hostProjectionCount,
        hostProjectionReadyCount: summary.hostProjectionReadyCount,
        visualStudioProjectionReady: summary.visualStudioProjectionReady,
        vscodeProjectionReady: summary.vscodeProjectionReady
      }
    }),
    check("HIA_WP40_PROVIDER_RESULT_LINKAGE_REVIEW_ONLY", summary.reviewOnlyOutputRequired === true
      && summary.requiresHumanReview === true
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        requiresHumanReview: summary.requiresHumanReview,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP40_PROVIDER_RESULT_LINKAGE_NO_SOURCE_SECRET_NETWORK", summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP40_PROVIDER_RESULT_LINKAGE_PRIVACY_CLEAN", summary.pathExposureCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp40-provider-result-review-linkage-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp40-closeout-and-wp41-wp42-inputs" : "blocked",
    sourceEvidence: {
      realRemoteProviderSmokeExecutionGate: normalizePath(smokeGateEvidencePath),
      requestPreviewAndPrivacyDryRun: normalizePath(requestPreviewEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    resultTaxonomy,
    reviewPayload,
    hostReviewProjection,
    checks,
    generatedDocs: {
      linkagePacket: normalizePath(linkagePacketPath),
      hostReviewSurfaceProjection: normalizePath(hostProjectionPath)
    },
    nextContractInputs: [
      {
        phase: "W-P40.7",
        topic: "closeout-and-wp41-wp42-inputs",
        status: "ready-input",
        reason: "Provider result/refusal review linkage is now review-only and can be summarized into target-owner and checked-apply downstream inputs."
      },
      {
        phase: "W-P41",
        topic: "target-owner-branch-pr-smoke",
        status: "blocked-provider-output-review-only",
        reason: "No target branch, pull request or sandbox may be created from provider output by HIA automation."
      },
      {
        phase: "W-P42",
        topic: "checked-apply-contract-hardening",
        status: "ready-review-only-input",
        reason: "Blocked provider review items can be used to harden checked-apply separation without enabling write authority."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P40 provider result review linkage evidence");
  assert.equal(hardFailures.length, 0, `W-P40 provider result review linkage has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(linkagePacketPath, renderLinkageMarkdown(evidence), "utf8");
  await writeFile(hostProjectionPath, renderHostProjectionMarkdown(evidence), "utf8");
  console.log(`W-P40 provider result review linkage evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P40 provider result review linkage packet prepared at ${normalizePath(linkagePacketPath)}`);
  console.log(`W-P40 host review surface projection prepared at ${normalizePath(hostProjectionPath)}`);
}

function createProviderResultTaxonomy(smokeGateEvidence) {
  const blockedShape = smokeGateEvidence.blockedReviewResultShape;
  return {
    contract: "hia-provider-result-review-shape-taxonomy",
    contractVersion: "0.1.0-draft",
    producedShapeCount: 1,
    shapes: [
      {
        id: "wp40.actual.execution-gate-blocked",
        kind: blockedShape.resultKind,
        productionStatus: "produced-by-wp40.5-gate",
        providerId: blockedShape.providerId,
        requestId: blockedShape.requestId,
        severity: blockedShape.displaySeverity,
        reasonCodes: blockedShape.reasonCodes,
        mayAttachToReviewPayload: true,
        mayProduceDirectEdit: false,
        mayTriggerCheckedApply: false
      },
      createFutureShape("wp40.future.success", "provider-success", "info"),
      createFutureShape("wp40.future.refusal", "provider-refusal", "warning"),
      createFutureShape("wp40.future.rate-limit", "provider-rate-limit", "warning"),
      createFutureShape("wp40.future.error", "provider-error", "error")
    ]
  };
}

function createFutureShape(id, kind, severity) {
  return {
    id,
    kind,
    productionStatus: "shape-only-not-produced",
    severity,
    reasonCodes: [],
    mayAttachToReviewPayload: true,
    mayProduceDirectEdit: false,
    mayTriggerCheckedApply: false
  };
}

function createReviewPayload(smokeGateEvidence, resultTaxonomy) {
  const blockedShape = smokeGateEvidence.blockedReviewResultShape;
  return {
    contract: "hia-provider-result-review-linkage-payload",
    contractVersion: "0.1.0-draft",
    payloadStatus: "review-only-linked",
    providerId: blockedShape.providerId,
    requestId: blockedShape.requestId,
    sourcePolicy: {
      sourceExcerptPolicy: smokeGateEvidence.gateDecision.privacy.sourceExcerptPolicy,
      sourcesContentPolicy: smokeGateEvidence.gateDecision.privacy.sourcesContentPolicy,
      sourceReferenceIncluded: false,
      sourceTextIncluded: false
    },
    items: [
      {
        id: "provider-review.wp40.execution-gate-blocked",
        providerId: blockedShape.providerId,
        requestId: blockedShape.requestId,
        resultKind: blockedShape.resultKind,
        resultStatus: blockedShape.resultStatus,
        severity: blockedShape.displaySeverity,
        title: "Remote provider smoke blocked before network",
        message: blockedShape.reviewMessage,
        reasonCodes: blockedShape.reasonCodes,
        taxonomyShapeId: resultTaxonomy.shapes[0].id,
        actionPolicy: noActionAuthority()
      }
    ],
    actionPolicy: noActionAuthority(),
    privacy: {
      credentialValueIncluded: false,
      sourceReferenceIncluded: false,
      sourceTextIncluded: false,
      sourcesContentPolicy: "none",
      localPathIncluded: false
    }
  };
}

function createHostReviewProjection(reviewPayload) {
  const hosts = [
    createHostProjection("vscode", "VS Code review output and quick-pick detail"),
    createHostProjection("devtools", "DevTools HIA panel provider result list"),
    createHostProjection("visual-studio", "Visual Studio tool-window provider result input")
  ];

  return {
    contract: "hia-provider-result-host-review-projection",
    contractVersion: "0.1.0-draft",
    projectionStatus: "input-ready",
    providerId: reviewPayload.providerId,
    requestId: reviewPayload.requestId,
    itemCount: reviewPayload.items.length,
    hosts
  };
}

function createHostProjection(hostId, surface) {
  return {
    hostId,
    surface,
    status: "input-ready",
    displaysBlockedResult: true,
    displaysReasonCodes: true,
    displaysReviewOnlyBoundary: true,
    actionPolicy: noActionAuthority(),
    sourcePolicy: {
      sourceReferenceDisplayed: false,
      sourceTextDisplayed: false,
      sourcesContentPolicy: "none"
    }
  };
}

function noActionAuthority() {
  return {
    requiresHumanReview: true,
    reviewOnlyOutputRequired: true,
    directApplyAllowed: false,
    checkedApplyTriggered: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false
  };
}

function summarize({
  hostReviewProjection,
  requestPreviewEvidence,
  resultTaxonomy,
  reviewPayload,
  smokeGateEvidence
}) {
  const serializedPackets = JSON.stringify({ hostReviewProjection, resultTaxonomy, reviewPayload });
  const producedShapes = resultTaxonomy.shapes.filter((shape) => shape.productionStatus !== "shape-only-not-produced");
  const futureShapes = resultTaxonomy.shapes.filter((shape) => shape.productionStatus === "shape-only-not-produced");
  return {
    smokeGateReady: smokeGateEvidence.status === "ready-for-wp40-provider-result-review-linkage-with-blocked-smoke",
    requestPreviewReady: requestPreviewEvidence.status === "ready-for-wp40-real-remote-provider-smoke-manual-decision",
    inputHardFailureCount: sum([
      smokeGateEvidence.summary?.hardFailureCount,
      requestPreviewEvidence.summary?.hardFailureCount
    ]),
    providerId: reviewPayload.providerId,
    requestId: reviewPayload.requestId,
    actualResultShapeCount: producedShapes.length,
    blockedResultShapeCount: producedShapes.filter((shape) => shape.kind === "execution-gate-blocked").length,
    providerResultProduced: smokeGateEvidence.summary?.providerResultProduced === true,
    refusalResultProduced: smokeGateEvidence.summary?.refusalResultProduced === true,
    reviewPayloadItemCount: reviewPayload.items.length,
    resultTaxonomyKindCount: new Set(resultTaxonomy.shapes.map((shape) => shape.kind)).size,
    nonProducedShapeCount: futureShapes.length,
    futureSuccessShapeCount: futureShapes.filter((shape) => shape.kind === "provider-success").length,
    futureRefusalShapeCount: futureShapes.filter((shape) => shape.kind === "provider-refusal").length,
    futureRateLimitShapeCount: futureShapes.filter((shape) => shape.kind === "provider-rate-limit").length,
    futureErrorShapeCount: futureShapes.filter((shape) => shape.kind === "provider-error").length,
    hostProjectionCount: hostReviewProjection.hosts.length,
    hostProjectionReadyCount: hostReviewProjection.hosts.filter((host) => host.status === "input-ready").length,
    vscodeProjectionReady: hostReviewProjection.hosts.some((host) => host.hostId === "vscode" && host.status === "input-ready"),
    devtoolsProjectionReady: hostReviewProjection.hosts.some((host) => host.hostId === "devtools" && host.status === "input-ready"),
    visualStudioProjectionReady: hostReviewProjection.hosts.some((host) => host.hostId === "visual-studio" && host.status === "input-ready"),
    reviewOnlyOutputRequired: reviewPayload.actionPolicy.reviewOnlyOutputRequired,
    requiresHumanReview: reviewPayload.actionPolicy.requiresHumanReview,
    directApplyAllowedCount: countAuthority(hostReviewProjection, "directApplyAllowed") + countAuthority(reviewPayload, "directApplyAllowed"),
    checkedApplyTriggeredCount: countAuthority(hostReviewProjection, "checkedApplyTriggered") + countAuthority(reviewPayload, "checkedApplyTriggered"),
    workspaceWriteAllowedCount: countAuthority(hostReviewProjection, "workspaceWriteAllowed") + countAuthority(reviewPayload, "workspaceWriteAllowed"),
    targetRepositoryMutationCount: countAuthority(hostReviewProjection, "targetRepositoryMutationAllowed") + countAuthority(reviewPayload, "targetRepositoryMutationAllowed"),
    directEditObjectCount: countDirectEditObjects({ hostReviewProjection, resultTaxonomy, reviewPayload }),
    credentialValueIncludedCount: countTrue([reviewPayload.privacy.credentialValueIncluded]),
    sourceReferenceIncludedCount: countTrue([reviewPayload.privacy.sourceReferenceIncluded]),
    sourceTextIncludedCount: countTrue([reviewPayload.privacy.sourceTextIncluded]),
    sourcesContentPolicy: reviewPayload.privacy.sourcesContentPolicy,
    externalNetworkCallExecuted: smokeGateEvidence.summary?.externalNetworkCallExecuted === true,
    realRemoteProviderInvocationExecuted: smokeGateEvidence.summary?.realRemoteProviderInvocationExecuted === true,
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ hostReviewProjection, resultTaxonomy, reviewPayload }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ hostReviewProjection, resultTaxonomy, reviewPayload }),
    pathExposureCount: countPathExposure(serializedPackets)
  };
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

function countTrue(values) {
  return values.filter((value) => value === true).length;
}

function countAuthority(value, key) {
  let count = 0;
  visitEntries(value, (candidateKey, candidateValue) => {
    if (candidateKey === key && candidateValue === true) {
      count += 1;
    }
  });
  return count;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function countDirectEditObjects(value) {
  return countMatchingKeys(value, /^(workspaceEdit|documentChanges|changes|patch|edits)$/u)
    + countMatchingValues(value, /TextEdit\[/iu);
}

function countCredentialMaterialMarkers(value) {
  return countMatchingKeys(value, /^(secretValue|apiKeyValue|tokenValue|password|authorizationHeader)$/u)
    + countMatchingValues(value, /(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u);
}

function countForbiddenDocumentTextMarkers(value) {
  return countMatchingKeys(value, /^(sourceText|sourceBody|rawSource|sourceExcerpt|documentText|documentContent|sourcesContent)$/u);
}

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countMatchingKeys(value, pattern) {
  let count = 0;
  visitEntries(value, (key) => {
    if (pattern.test(key)) {
      count += 1;
    }
  });
  return count;
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

function visitEntries(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitEntries(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      visitor(key, item);
      visitEntries(item, visitor);
    }
  }
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

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//u, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /work-zone/u, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent":/u, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u, `${label} must not include token-looking values.`);
}

function renderLinkageMarkdown(evidence) {
  const { reviewPayload, summary } = evidence;
  const lines = [
    "# W-P40 Provider Result Review Linkage Packet",
    "",
    `Status: \`${evidence.status}\``,
    `Provider: \`${summary.providerId}\``,
    `Request: \`${summary.requestId}\``,
    `Review items: ${summary.reviewPayloadItemCount}`,
    `Provider result produced: ${summary.providerResultProduced}`,
    `Refusal result produced: ${summary.refusalResultProduced}`,
    "",
    "| Item | Kind | Severity |",
    "| --- | --- | --- |"
  ];

  for (const item of reviewPayload.items) {
    lines.push(`| ${item.id} | ${item.resultKind} | \`${item.severity}\` |`);
  }

  lines.push("");
  lines.push("The payload is review-only. It contains no source text, credential value, direct edit object or checked-apply trigger.");
  return `${lines.join("\n")}\n`;
}

function renderHostProjectionMarkdown(evidence) {
  const { hostReviewProjection } = evidence;
  const lines = [
    "# W-P40 Host Review Surface Projection",
    "",
    `Projection status: \`${hostReviewProjection.projectionStatus}\``,
    `Review item count: ${hostReviewProjection.itemCount}`,
    "",
    "| Host | Status | Surface |",
    "| --- | --- | --- |"
  ];

  for (const host of hostReviewProjection.hosts) {
    lines.push(`| ${host.hostId} | \`${host.status}\` | ${host.surface} |`);
  }

  lines.push("");
  lines.push("All host projections are input-ready and keep direct apply, checked apply, workspace write and target mutation disabled.");
  return `${lines.join("\n")}\n`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
