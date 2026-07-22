import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp40-real-remote-provider-smoke-execution-gate");
const evidencePath = path.join(outputRoot, "evidence.json");
const decisionPath = path.join(outputRoot, "real-smoke-execution-gate-decision.md");
const refusalShapePath = path.join(outputRoot, "blocked-smoke-review-result-shape.md");
const requestPreviewEvidencePath = path.join(rootDir, "dist", "wp40-request-preview-privacy-dry-run", "evidence.json");
const secretNetworkEvidencePath = path.join(rootDir, "dist", "wp40-secret-network-consent-packet", "evidence.json");
const candidateSelectionEvidencePath = path.join(rootDir, "dist", "wp40-remote-provider-candidate-selection", "evidence.json");
const networkConsentEvidencePath = path.join(rootDir, "dist", "wp36-network-mediation-consent", "evidence.json");

await main();

/**
 * 准备 W-P40.5 real remote provider smoke execution gate evidence。
 * Prepare W-P40.5 real remote provider smoke execution gate evidence.
 *
 * This stage is the hard boundary between a reviewed remote-provider request
 * preview and a real external call. User approval may allow the workflow to
 * enter the gate, but the gate must still refuse execution when the provider is
 * only a template, the destination is a placeholder, credential references are
 * not bound for execution, or request/workspace consent remains blocked.
 *
 * 中文：本阶段是已审查 request preview 与真实外部调用之间的硬边界。
 * 用户批准可以允许流程进入 gate，但如果 provider 仍是模板、destination
 * 仍是占位、credential reference 未绑定执行，或 request/workspace consent
 * 仍处于 blocked，gate 必须拒绝执行。
 *
 * @returns {Promise<void>} Writes public-safe execution-gate evidence.
 */
async function main() {
  const requestPreviewEvidence = await readJson(requestPreviewEvidencePath);
  const secretNetworkEvidence = await readJson(secretNetworkEvidencePath);
  const candidateSelectionEvidence = await readJson(candidateSelectionEvidencePath);
  const networkConsentEvidence = await readJson(networkConsentEvidencePath);
  const approvalPacket = createApprovalPacket(requestPreviewEvidence);
  const gateDecision = createGateDecision({
    approvalPacket,
    candidateSelectionEvidence,
    networkConsentEvidence,
    requestPreviewEvidence,
    secretNetworkEvidence
  });
  const blockedReviewResultShape = createBlockedReviewResultShape(gateDecision);
  const summary = summarize({
    approvalPacket,
    blockedReviewResultShape,
    candidateSelectionEvidence,
    gateDecision,
    networkConsentEvidence,
    requestPreviewEvidence,
    secretNetworkEvidence
  });
  const checks = [
    check("HIA_WP40_REAL_SMOKE_GATE_INPUTS_READY", summary.requestPreviewReady === true
      && summary.secretNetworkReady === true
      && summary.candidateSelectionReady === true
      && summary.networkConsentReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        candidateSelectionStatus: candidateSelectionEvidence.status,
        inputHardFailureCount: summary.inputHardFailureCount,
        networkConsentStatus: networkConsentEvidence.status,
        requestPreviewStatus: requestPreviewEvidence.status,
        secretNetworkStatus: secretNetworkEvidence.status
      }
    }),
    check("HIA_WP40_REAL_SMOKE_GATE_APPROVAL_INTERPRETED_SAFELY", summary.userApprovalObserved === true
      && summary.approvalScope === "enter-wp40.5-execution-gate"
      && summary.approvalGrantsExecution === false
      && summary.approvalGrantsNetwork === false
      && summary.approvalGrantsCredentialAccess === false, {
      actual: {
        approvalGrantsCredentialAccess: summary.approvalGrantsCredentialAccess,
        approvalGrantsExecution: summary.approvalGrantsExecution,
        approvalGrantsNetwork: summary.approvalGrantsNetwork,
        approvalScope: summary.approvalScope,
        userApprovalObserved: summary.userApprovalObserved
      }
    }),
    check("HIA_WP40_REAL_SMOKE_GATE_BLOCKS_PLACEHOLDER_BINDINGS", summary.executionDecisionStatus === "blocked-before-network"
      && summary.blockerCount >= 4
      && summary.templateProviderBlockerCount >= 1
      && summary.placeholderDestinationBlockerCount >= 1
      && summary.unboundSecretReferenceBlockerCount >= 1
      && summary.blockedConsentBlockerCount >= 1, {
      actual: {
        blockedConsentBlockerCount: summary.blockedConsentBlockerCount,
        blockerCount: summary.blockerCount,
        executionDecisionStatus: summary.executionDecisionStatus,
        placeholderDestinationBlockerCount: summary.placeholderDestinationBlockerCount,
        templateProviderBlockerCount: summary.templateProviderBlockerCount,
        unboundSecretReferenceBlockerCount: summary.unboundSecretReferenceBlockerCount
      }
    }),
    check("HIA_WP40_REAL_SMOKE_GATE_NO_REAL_CALL", summary.providerSelectedForExecution === false
      && summary.credentialAccessGranted === false
      && summary.destinationContactedCount === 0
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.providerResultProduced === false, {
      actual: {
        credentialAccessGranted: summary.credentialAccessGranted,
        destinationContactedCount: summary.destinationContactedCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        providerResultProduced: summary.providerResultProduced,
        providerSelectedForExecution: summary.providerSelectedForExecution,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted
      }
    }),
    check("HIA_WP40_REAL_SMOKE_GATE_REFUSAL_SHAPE_READY", summary.blockedReviewResultShapeReady === true
      && summary.refusalResultProduced === true
      && summary.refusalResultKind === "execution-gate-blocked"
      && summary.reviewOnlyOutputRequired === true
      && summary.reviewPayloadLinkageReady === true, {
      actual: {
        blockedReviewResultShapeReady: summary.blockedReviewResultShapeReady,
        refusalResultKind: summary.refusalResultKind,
        refusalResultProduced: summary.refusalResultProduced,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        reviewPayloadLinkageReady: summary.reviewPayloadLinkageReady
      }
    }),
    check("HIA_WP40_REAL_SMOKE_GATE_NO_SOURCE_SECRET_WRITE", summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncluded === false
      && summary.sourceTextIncludedCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        directEditObjectCount: summary.directEditObjectCount,
        sourceReferenceIncluded: summary.sourceReferenceIncluded,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP40_REAL_SMOKE_GATE_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp40-real-remote-provider-smoke-execution-gate-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp40-provider-result-review-linkage-with-blocked-smoke" : "blocked",
    sourceEvidence: {
      requestPreviewAndPrivacyDryRun: normalizePath(requestPreviewEvidencePath),
      secretReferenceAndNetworkConsent: normalizePath(secretNetworkEvidencePath),
      providerCandidateSelection: normalizePath(candidateSelectionEvidencePath),
      networkMediationConsent: normalizePath(networkConsentEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    approvalPacket,
    gateDecision,
    blockedReviewResultShape,
    checks,
    generatedDocs: {
      executionGateDecision: normalizePath(decisionPath),
      blockedSmokeReviewResultShape: normalizePath(refusalShapePath)
    },
    nextContractInputs: [
      {
        phase: "W-P40.6",
        topic: "provider-result-refusal-review-linkage",
        status: "ready-input",
        reason: "The execution gate produced a review-only blocked/refusal shape that can be linked into host review surfaces without a real provider result."
      },
      {
        phase: "W-P41",
        topic: "target-owner-flow",
        status: "unchanged-blocked",
        reason: "No target branch, pull request, sandbox or repository mutation was created by W-P40.5."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P40 real remote provider smoke execution gate evidence");
  assert.equal(hardFailures.length, 0, `W-P40 real remote provider smoke execution gate has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(decisionPath, renderDecisionMarkdown(evidence), "utf8");
  await writeFile(refusalShapePath, renderBlockedReviewResultShapeMarkdown(evidence), "utf8");
  console.log(`W-P40 real remote provider smoke execution gate evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P40 real smoke execution gate decision prepared at ${normalizePath(decisionPath)}`);
  console.log(`W-P40 blocked smoke review result shape prepared at ${normalizePath(refusalShapePath)}`);
}

function createApprovalPacket(requestPreviewEvidence) {
  return {
    contract: "hia-remote-provider-smoke-gate-approval-packet",
    contractVersion: "0.1.0-draft",
    approvalStatus: "approved-to-enter-execution-gate",
    approvalSource: "conversation-confirmation",
    approvalScope: "enter-wp40.5-execution-gate",
    providerId: requestPreviewEvidence.summary?.providerId,
    requestId: requestPreviewEvidence.summary?.requestId,
    grants: {
      providerSelection: false,
      credentialAccess: false,
      network: false,
      execution: false,
      write: false
    },
    interpretation: "Approval authorizes evaluating the execution gate. It does not override provider identity, credential, destination, consent or privacy blockers."
  };
}

function createGateDecision({
  approvalPacket,
  candidateSelectionEvidence,
  networkConsentEvidence,
  requestPreviewEvidence,
  secretNetworkEvidence
}) {
  const requestPreview = requestPreviewEvidence.requestPreview;
  const candidate = safeArray(candidateSelectionEvidence.candidatePackets)[0];
  const secretReferences = safeArray(secretNetworkEvidence.secretReferencePacket?.secretReferences);
  const consentRecords = safeArray(secretNetworkEvidence.networkConsentPacket?.consentRecords);
  const destinations = safeArray(secretNetworkEvidence.networkConsentPacket?.destinationPolicy?.destinations);
  const blockers = [
    ...blockWhen(candidate?.packageIdentity?.source === "not-installed-template", {
      id: "provider-package-is-template",
      category: "provider",
      severity: "blocking",
      message: "The selected candidate is still a template package identity and is not a concrete installed provider."
    }),
    ...blockWhen(candidate?.packageIdentity?.version === "0.1.0-draft", {
      id: "provider-version-is-draft",
      category: "provider",
      severity: "blocking",
      message: "The provider package version is a draft placeholder and is not an immutable execution version."
    }),
    ...blockWhen(destinations.some((destination) => destination.origin === "provider-api.example.invalid"), {
      id: "destination-is-placeholder",
      category: "network",
      severity: "blocking",
      message: "The declared destination is a placeholder origin and must not be contacted."
    }),
    ...blockWhen(secretReferences.some((secretRef) => secretRef.boundForExecution !== true), {
      id: "secret-references-not-bound-for-execution",
      category: "credential",
      severity: "blocking",
      message: "Host-managed secret references exist, but none are bound for this execution gate."
    }),
    ...blockWhen(consentRecords.some((record) => record.status === "blocked"), {
      id: "workspace-or-request-consent-blocked",
      category: "consent",
      severity: "blocking",
      message: "Workspace/request network consent remains blocked, so a final network send is not allowed."
    }),
    ...blockWhen(requestPreview?.provider?.selectedForExecution !== true, {
      id: "provider-not-selected-for-execution",
      category: "execution",
      severity: "blocking",
      message: "The request preview has not selected the provider for execution."
    }),
    ...blockWhen(requestPreview?.payloadPreview?.sourcePolicy?.sourcesContentPolicy !== "none", {
      id: "unexpected-sources-content-policy",
      category: "privacy",
      severity: "blocking",
      message: "The execution gate only accepts sourcesContentPolicy none in this phase."
    })
  ];

  return {
    contract: "hia-remote-provider-real-smoke-execution-gate-decision",
    contractVersion: "0.1.0-draft",
    decisionStatus: blockers.length === 0 ? "ready-for-real-network-send" : "blocked-before-network",
    decisionKind: blockers.length === 0 ? "would-require-final-network-send" : "approved-entry-blocked-execution",
    providerId: approvalPacket.providerId,
    requestId: approvalPacket.requestId,
    gateEntryApproved: approvalPacket.approvalStatus === "approved-to-enter-execution-gate",
    finalNetworkApprovalRequired: true,
    blockers,
    execution: {
      selectedForExecution: false,
      credentialAccessGranted: false,
      destinationContactedCount: 0,
      externalNetworkCallExecuted: false,
      realRemoteProviderInvocationExecuted: false,
      providerResultProduced: false,
      reason: blockers.length === 0
        ? "The gate would still require a final host-mediated network send step."
        : "Execution is blocked before any network operation because concrete provider, destination, credential and consent bindings are not all present."
    },
    privacy: {
      sourceExcerptPolicy: requestPreview?.payloadPreview?.sourcePolicy?.sourceExcerptPolicy ?? "none",
      sourcesContentPolicy: requestPreview?.payloadPreview?.sourcePolicy?.sourcesContentPolicy ?? "none",
      sourceReferenceIncluded: requestPreview?.payloadPreview?.sourcePolicy?.sourceReferenceIncluded === true,
      sourceTextIncluded: requestPreview?.payloadPreview?.sourcePolicy?.sourceTextIncluded === true,
      credentialValueIncluded: false
    },
    outputBoundary: {
      reviewOnlyOutputRequired: true,
      checkedApplySeparationRequired: true,
      writeAuthority: noWriteAuthority()
    }
  };
}

function createBlockedReviewResultShape(gateDecision) {
  return {
    contract: "hia-remote-provider-blocked-smoke-review-result",
    contractVersion: "0.1.0-draft",
    resultKind: "execution-gate-blocked",
    resultStatus: "review-only-blocked-result-ready",
    providerId: gateDecision.providerId,
    requestId: gateDecision.requestId,
    providerResultProduced: false,
    refusalResultProduced: true,
    displaySeverity: "warning",
    reviewMessage: "Remote provider smoke was not executed because the execution gate blocked it before network access.",
    reasonCodes: gateDecision.blockers.map((blocker) => blocker.id),
    reviewPayloadLinkage: {
      targetSurface: "provider-result-review-linkage",
      mayAttachToReviewPayload: true,
      mayProduceDirectEdit: false,
      mayTriggerCheckedApply: false,
      requiresHumanReview: true
    },
    redaction: {
      credentialValueIncluded: false,
      sourceReferenceIncluded: false,
      sourceTextIncluded: false,
      sourcesContentPolicy: "none",
      localPathIncluded: false
    }
  };
}

function summarize({
  approvalPacket,
  blockedReviewResultShape,
  candidateSelectionEvidence,
  gateDecision,
  networkConsentEvidence,
  requestPreviewEvidence,
  secretNetworkEvidence
}) {
  const serializedPackets = JSON.stringify({ approvalPacket, blockedReviewResultShape, gateDecision });
  return {
    requestPreviewReady: requestPreviewEvidence.status === "ready-for-wp40-real-remote-provider-smoke-manual-decision",
    secretNetworkReady: secretNetworkEvidence.status === "ready-for-wp40-request-preview-and-privacy-dry-run",
    candidateSelectionReady: candidateSelectionEvidence.status === "ready-for-wp40-secret-reference-and-network-consent-packet",
    networkConsentReady: networkConsentEvidence.status === "ready-for-source-excerpt-opt-in-and-privacy-gate",
    inputHardFailureCount: sum([
      requestPreviewEvidence.summary?.hardFailureCount,
      secretNetworkEvidence.summary?.hardFailureCount,
      candidateSelectionEvidence.summary?.hardFailureCount,
      networkConsentEvidence.summary?.hardFailureCount
    ]),
    providerId: gateDecision.providerId,
    requestId: gateDecision.requestId,
    userApprovalObserved: approvalPacket.approvalStatus === "approved-to-enter-execution-gate",
    approvalScope: approvalPacket.approvalScope,
    approvalGrantsExecution: approvalPacket.grants.execution,
    approvalGrantsNetwork: approvalPacket.grants.network,
    approvalGrantsCredentialAccess: approvalPacket.grants.credentialAccess,
    executionDecisionStatus: gateDecision.decisionStatus,
    executionDecisionKind: gateDecision.decisionKind,
    blockerCount: gateDecision.blockers.length,
    templateProviderBlockerCount: gateDecision.blockers.filter((blocker) => blocker.id === "provider-package-is-template").length,
    placeholderDestinationBlockerCount: gateDecision.blockers.filter((blocker) => blocker.id === "destination-is-placeholder").length,
    unboundSecretReferenceBlockerCount: gateDecision.blockers.filter((blocker) => blocker.id === "secret-references-not-bound-for-execution").length,
    blockedConsentBlockerCount: gateDecision.blockers.filter((blocker) => blocker.id === "workspace-or-request-consent-blocked").length,
    providerSelectedForExecution: gateDecision.execution.selectedForExecution,
    credentialAccessGranted: gateDecision.execution.credentialAccessGranted,
    destinationContactedCount: gateDecision.execution.destinationContactedCount,
    externalNetworkCallExecuted: gateDecision.execution.externalNetworkCallExecuted,
    realRemoteProviderInvocationExecuted: gateDecision.execution.realRemoteProviderInvocationExecuted,
    providerResultProduced: gateDecision.execution.providerResultProduced,
    blockedReviewResultShapeReady: blockedReviewResultShape.resultStatus === "review-only-blocked-result-ready",
    refusalResultProduced: blockedReviewResultShape.refusalResultProduced,
    refusalResultKind: blockedReviewResultShape.resultKind,
    reviewPayloadLinkageReady: blockedReviewResultShape.reviewPayloadLinkage.mayAttachToReviewPayload === true,
    reviewOnlyOutputRequired: gateDecision.outputBoundary.reviewOnlyOutputRequired,
    credentialValueIncludedCount: countTrue([
      gateDecision.privacy.credentialValueIncluded,
      blockedReviewResultShape.redaction.credentialValueIncluded
    ]),
    sourceReferenceIncluded: gateDecision.privacy.sourceReferenceIncluded || blockedReviewResultShape.redaction.sourceReferenceIncluded,
    sourceTextIncludedCount: countTrue([
      gateDecision.privacy.sourceTextIncluded,
      blockedReviewResultShape.redaction.sourceTextIncluded
    ]),
    sourcesContentPolicy: gateDecision.privacy.sourcesContentPolicy,
    workspaceWriteAllowedCount: countTrue([gateDecision.outputBoundary.writeAuthority.workspaceWriteAllowed]),
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects({ approvalPacket, blockedReviewResultShape, gateDecision }),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ approvalPacket, blockedReviewResultShape, gateDecision }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ approvalPacket, blockedReviewResultShape, gateDecision }),
    pathExposureCount: countPathExposure(serializedPackets)
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function blockWhen(condition, blocker) {
  return condition ? [blocker] : [];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function noWriteAuthority() {
  return {
    checkedApplyAvailable: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false
  };
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
      visitor(key);
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

function renderDecisionMarkdown(evidence) {
  const { gateDecision, summary } = evidence;
  const lines = [
    "# W-P40 Real Remote Provider Smoke Execution Gate Decision",
    "",
    `Status: \`${evidence.status}\``,
    `Decision: \`${gateDecision.decisionStatus}\``,
    `Provider: \`${gateDecision.providerId}\``,
    `Request: \`${gateDecision.requestId}\``,
    `Gate entry approved: ${gateDecision.gateEntryApproved}`,
    `External network call executed: ${summary.externalNetworkCallExecuted}`,
    `Real provider invocation executed: ${summary.realRemoteProviderInvocationExecuted}`,
    "",
    "## Blockers",
    "",
    "| Blocker | Category | Severity |",
    "| --- | --- | --- |"
  ];

  for (const blocker of gateDecision.blockers) {
    lines.push(`| ${blocker.id} | ${blocker.category} | \`${blocker.severity}\` |`);
  }

  lines.push("");
  lines.push("The gate was entered, but real execution is blocked before network access. No destination was contacted, no credential value was read and no provider result was produced.");
  return `${lines.join("\n")}\n`;
}

function renderBlockedReviewResultShapeMarkdown(evidence) {
  const { blockedReviewResultShape, summary } = evidence;
  const lines = [
    "# W-P40 Blocked Smoke Review Result Shape",
    "",
    `Result status: \`${blockedReviewResultShape.resultStatus}\``,
    `Result kind: \`${blockedReviewResultShape.resultKind}\``,
    `Provider result produced: ${summary.providerResultProduced}`,
    `Refusal result produced: ${summary.refusalResultProduced}`,
    `Review linkage ready: ${summary.reviewPayloadLinkageReady}`,
    "",
    "## Reason Codes",
    ""
  ];

  for (const reasonCode of blockedReviewResultShape.reasonCodes) {
    lines.push(`- ${reasonCode}`);
  }

  lines.push("");
  lines.push("This shape can be attached to provider result review surfaces. It cannot produce direct edits or trigger checked apply.");
  return `${lines.join("\n")}\n`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
