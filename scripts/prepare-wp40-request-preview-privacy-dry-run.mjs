import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp40-request-preview-privacy-dry-run");
const evidencePath = path.join(outputRoot, "evidence.json");
const requestPreviewPath = path.join(outputRoot, "metadata-only-request-preview.md");
const privacyDryRunPath = path.join(outputRoot, "source-privacy-dry-run.md");
const secretNetworkEvidencePath = path.join(rootDir, "dist", "wp40-secret-network-consent-packet", "evidence.json");
const candidateSelectionEvidencePath = path.join(rootDir, "dist", "wp40-remote-provider-candidate-selection", "evidence.json");
const intakeEvidencePath = path.join(rootDir, "dist", "wp40-controlled-remote-provider-smoke-intake", "evidence.json");
const sourcePrivacyEvidencePath = path.join(rootDir, "dist", "wp36-source-excerpt-privacy-gate", "evidence.json");

await main();

/**
 * 准备 W-P40.4 metadata-only request preview and privacy dry-run evidence。
 * Prepare W-P40.4 metadata-only request preview and privacy dry-run evidence.
 *
 * This stage creates the exact request summary a human must review before any
 * later remote smoke. It keeps the preview metadata-only: secret references are
 * identifiers, source policy is `none`, no credential values or source text are
 * serialized, and no network call is made.
 *
 * 中文：本阶段生成后续真实 remote smoke 前需要人工审查的请求摘要。preview
 * 保持 metadata-only：secret 只用引用 id，source policy 为 `none`，不序列化
 * 凭据值或源码文本，也不执行网络调用。
 *
 * @returns {Promise<void>} Writes public-safe request preview evidence.
 */
async function main() {
  const secretNetwork = await readJson(secretNetworkEvidencePath);
  const candidateSelection = await readJson(candidateSelectionEvidencePath);
  const intake = await readJson(intakeEvidencePath);
  const sourcePrivacy = await readJson(sourcePrivacyEvidencePath);
  const requestPreview = createRequestPreview({ candidateSelection, intake, secretNetwork });
  const privacyDryRun = createPrivacyDryRun({ requestPreview, secretNetwork, sourcePrivacy });
  const manualDecisionPacket = createManualDecisionPacket({ privacyDryRun, requestPreview });
  const summary = summarize({
    candidateSelection,
    intake,
    manualDecisionPacket,
    privacyDryRun,
    requestPreview,
    secretNetwork,
    sourcePrivacy
  });
  const checks = [
    check("HIA_WP40_REQUEST_PREVIEW_INPUTS_READY", summary.secretNetworkReady === true
      && summary.candidateSelectionReady === true
      && summary.intakeReady === true
      && summary.sourcePrivacyReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        candidateSelectionStatus: candidateSelection.status,
        inputHardFailureCount: summary.inputHardFailureCount,
        intakeStatus: intake.status,
        secretNetworkStatus: secretNetwork.status,
        sourcePrivacyStatus: sourcePrivacy.status
      }
    }),
    check("HIA_WP40_REQUEST_PREVIEW_METADATA_ONLY", summary.requestPreviewMode === "metadata-only"
      && summary.previewDataClassCount >= 5
      && summary.secretReferenceIdCount >= 2
      && summary.credentialValueIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.sourceReferenceIncluded === false, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        previewDataClassCount: summary.previewDataClassCount,
        requestPreviewMode: summary.requestPreviewMode,
        secretReferenceIdCount: summary.secretReferenceIdCount,
        sourceReferenceIncluded: summary.sourceReferenceIncluded,
        sourceTextIncludedCount: summary.sourceTextIncludedCount
      }
    }),
    check("HIA_WP40_REQUEST_PRIVACY_DEFAULT_DENY", summary.sourceExcerptPolicy === "none"
      && summary.sourcesContentPolicy === "none"
      && summary.sourceOptInRequired === true
      && summary.fullFileAllowed === false
      && summary.generatedSourceAllowedByDefault === false
      && summary.providerRequestMayContainSourceText === false
      && summary.evidenceMayContainSourceText === false, {
      actual: {
        evidenceMayContainSourceText: summary.evidenceMayContainSourceText,
        fullFileAllowed: summary.fullFileAllowed,
        generatedSourceAllowedByDefault: summary.generatedSourceAllowedByDefault,
        providerRequestMayContainSourceText: summary.providerRequestMayContainSourceText,
        sourceExcerptPolicy: summary.sourceExcerptPolicy,
        sourceOptInRequired: summary.sourceOptInRequired,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP40_REQUEST_NETWORK_STILL_BLOCKED", summary.destinationCount >= 1
      && summary.httpsDestinationCount === summary.destinationCount
      && summary.contactDestinationCount === 0
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.finalNetworkApprovalRequired === true, {
      actual: {
        contactDestinationCount: summary.contactDestinationCount,
        destinationCount: summary.destinationCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        finalNetworkApprovalRequired: summary.finalNetworkApprovalRequired,
        httpsDestinationCount: summary.httpsDestinationCount,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted
      }
    }),
    check("HIA_WP40_REQUEST_MANUAL_DECISION_REQUIRED", summary.selectedForExecutionCount === 0
      && summary.manualDecisionStatus === "manual-approval-required-before-real-smoke"
      && summary.manualDecisionActionCount >= 7
      && summary.manualDecisionGrantsNetwork === false
      && summary.manualDecisionGrantsExecution === false, {
      actual: {
        manualDecisionActionCount: summary.manualDecisionActionCount,
        manualDecisionGrantsExecution: summary.manualDecisionGrantsExecution,
        manualDecisionGrantsNetwork: summary.manualDecisionGrantsNetwork,
        manualDecisionStatus: summary.manualDecisionStatus,
        selectedForExecutionCount: summary.selectedForExecutionCount
      }
    }),
    check("HIA_WP40_REQUEST_REVIEW_ONLY_NO_WRITE", summary.reviewOnlyOutputRequired === true
      && summary.targetRepositoryMutationCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerOwnedApplyAllowedCount === 0
      && summary.lspServerOwnedApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyAllowedCount: summary.lspServerOwnedApplyAllowedCount,
        providerOwnedApplyAllowedCount: summary.providerOwnedApplyAllowedCount,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP40_REQUEST_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp40-request-preview-privacy-dry-run-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp40-real-remote-provider-smoke-manual-decision" : "blocked",
    sourceEvidence: {
      secretReferenceAndNetworkConsent: normalizePath(secretNetworkEvidencePath),
      providerCandidateSelection: normalizePath(candidateSelectionEvidencePath),
      controlledSmokeIntake: normalizePath(intakeEvidencePath),
      sourceExcerptPrivacyGate: normalizePath(sourcePrivacyEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    requestPreview,
    privacyDryRun,
    manualDecisionPacket,
    checks,
    generatedDocs: {
      requestPreview: normalizePath(requestPreviewPath),
      privacyDryRun: normalizePath(privacyDryRunPath)
    },
    nextContractInputs: [
      {
        phase: "W-P40.5",
        topic: "real-remote-provider-smoke-execution-gate",
        status: "manual-approval-required",
        reason: "The preview is ready, but real provider execution still requires explicit user approval before external network execution."
      },
      {
        phase: "W-P40.6",
        topic: "provider-result-review-linkage",
        status: "ready-after-real-smoke-or-refusal",
        reason: "Provider result linkage needs either an executed remote smoke result or a documented blocked/refused decision."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P40 request preview and privacy dry-run evidence");
  assert.equal(hardFailures.length, 0, `W-P40 request preview and privacy dry-run has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(requestPreviewPath, renderRequestPreviewMarkdown(evidence), "utf8");
  await writeFile(privacyDryRunPath, renderPrivacyDryRunMarkdown(evidence), "utf8");
  console.log(`W-P40 request preview and privacy dry-run evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P40 metadata-only request preview prepared at ${normalizePath(requestPreviewPath)}`);
  console.log(`W-P40 source privacy dry-run prepared at ${normalizePath(privacyDryRunPath)}`);
}

function createRequestPreview({ candidateSelection, intake, secretNetwork }) {
  const candidate = firstCandidate(candidateSelection);
  const secretPacket = secretNetwork.secretReferencePacket;
  const networkPacket = secretNetwork.networkConsentPacket;
  return {
    contract: "hia-remote-provider-request-preview",
    contractVersion: "0.1.0-draft",
    requestId: "wp40-remote-provider-smoke-preview-001",
    requestStatus: "preview-not-executed",
    mode: "metadata-only",
    provider: {
      providerId: candidate.providerId,
      candidateId: candidate.candidateId,
      packageName: candidate.packageIdentity.name,
      packageVersion: candidate.packageIdentity.version,
      selectedForExecution: false,
      invocableInThisPhase: false
    },
    consent: {
      consentRecordIds: safeArray(networkPacket.consentRecords).map((record) => record.id),
      approvedConsentRecordIds: safeArray(networkPacket.consentRecords)
        .filter((record) => record.status === "approved")
        .map((record) => record.id),
      blockedConsentRecordIds: safeArray(networkPacket.consentRecords)
        .filter((record) => record.status === "blocked")
        .map((record) => record.id),
      finalNetworkApprovalRequired: true
    },
    destination: {
      destinationIds: safeArray(networkPacket.destinationPolicy?.destinations).map((destination) => destination.id),
      origins: safeArray(networkPacket.destinationPolicy?.destinations).map((destination) => destination.origin),
      httpsOnly: networkPacket.networkPolicy?.httpsRequired === true,
      contactedInThisPhase: false
    },
    secretReferences: safeArray(secretPacket.secretReferences).map((secretRef) => ({
      referenceId: secretRef.referenceId,
      credentialKind: secretRef.credentialKind,
      scope: secretRef.scope,
      valueMaterialState: "not-serialized",
      boundForExecution: false
    })),
    payloadPreview: {
      dataClasses: [
        "provider-id",
        "request-id",
        "locale",
        "profile-id",
        "review-item-id",
        "secret-ref-id",
        "destination-id"
      ],
      maxPayloadClass: "metadata-only",
      sourcePolicy: {
        sourceExcerptPolicy: "none",
        sourcesContentPolicy: "none",
        sourceReferenceIncluded: false,
        sourceTextIncluded: false,
        fullFileIncluded: false,
        generatedSourceIncluded: false
      },
      scenarioIds: safeArray(intake.smokeScenarioIntake).map((scenario) => scenario.id),
      expectedResultScopes: safeArray(intake.smokeScenarioIntake).map((scenario) => scenario.expectedResultScope)
    },
    execution: {
      realRemoteProviderInvocationExecuted: false,
      externalNetworkCallExecuted: false,
      providerResultExpectedInThisPhase: false,
      reason: "W-P40.4 prepares the request preview only; it does not execute the remote provider."
    },
    outputBoundary: {
      reviewOnlyOutputRequired: true,
      checkedApplySeparationRequired: true,
      writeAuthority: noWriteAuthority()
    }
  };
}

function createPrivacyDryRun({ requestPreview, secretNetwork, sourcePrivacy }) {
  return {
    contract: "hia-remote-provider-request-privacy-dry-run",
    contractVersion: "0.1.0-draft",
    dryRunStatus: "pass",
    providerId: requestPreview.provider.providerId,
    requestId: requestPreview.requestId,
    source: {
      sourceExcerptPolicy: sourcePrivacy.summary?.defaultSourceExcerptPolicy ?? "none",
      sourcesContentPolicy: "none",
      optInRequired: sourcePrivacy.summary?.optInRequired === true,
      fullFileAllowed: sourcePrivacy.summary?.fullFileAllowed === true,
      generatedSourceAllowedByDefault: sourcePrivacy.summary?.generatedSourceAllowedByDefault === true,
      providerRequestMayContainSourceText: false,
      evidenceMayContainSourceText: false,
      sourceReferenceIncluded: requestPreview.payloadPreview.sourcePolicy.sourceReferenceIncluded === true,
      sourceTextIncluded: requestPreview.payloadPreview.sourcePolicy.sourceTextIncluded === true
    },
    credentials: {
      secretReferenceIdCount: requestPreview.secretReferences.length,
      credentialValueIncluded: false,
      credentialAccessGranted: false
    },
    network: {
      directProviderNetworkAllowed: secretNetwork.networkConsentPacket.networkPolicy.directProviderNetworkAllowed === true,
      hostMediatorRequired: secretNetwork.networkConsentPacket.networkPolicy.hostMediatorRequired === true,
      destinationCount: requestPreview.destination.destinationIds.length,
      contactedDestinationCount: requestPreview.destination.contactedInThisPhase === true ? requestPreview.destination.destinationIds.length : 0,
      externalNetworkCallExecuted: false
    },
    findings: [
      createFinding("provider-candidate-ready", "pass", "Provider candidate metadata is ready for manual review."),
      createFinding("secret-reference-only", "pass", "Only secret reference ids are present."),
      createFinding("source-policy-none", "pass", "The request preview contains no source text."),
      createFinding("network-not-executed", "pass", "The destination is declared but not contacted."),
      createFinding("review-only-output", "pass", "The later provider result remains review-only.")
    ]
  };
}

function createManualDecisionPacket({ privacyDryRun, requestPreview }) {
  return {
    contract: "hia-remote-provider-smoke-manual-decision-packet",
    contractVersion: "0.1.0-draft",
    decisionStatus: "manual-approval-required-before-real-smoke",
    requestId: requestPreview.requestId,
    providerId: requestPreview.provider.providerId,
    privacyDryRunStatus: privacyDryRun.dryRunStatus,
    requiredActions: [
      "confirm-provider-package-and-provenance",
      "select-provider-for-execution",
      "bind-host-managed-secret-reference",
      "approve-workspace-consent",
      "approve-request-consent",
      "confirm-destination-and-https-only",
      "confirm-source-policy-none",
      "confirm-review-only-output",
      "final-explicit-network-approval"
    ],
    grants: {
      providerSelection: false,
      credentialAccess: false,
      network: false,
      execution: false,
      write: false
    }
  };
}

function summarize({
  candidateSelection,
  intake,
  manualDecisionPacket,
  privacyDryRun,
  requestPreview,
  secretNetwork,
  sourcePrivacy
}) {
  const serializedPackets = JSON.stringify({ manualDecisionPacket, privacyDryRun, requestPreview });
  return {
    secretNetworkReady: secretNetwork.status === "ready-for-wp40-request-preview-and-privacy-dry-run",
    candidateSelectionReady: candidateSelection.status === "ready-for-wp40-secret-reference-and-network-consent-packet",
    intakeReady: intake.status === "ready-for-wp40-provider-selection-and-manual-approval-route",
    sourcePrivacyReady: sourcePrivacy.status === "ready-for-safe-invocation-dry-run",
    inputHardFailureCount: sum([
      secretNetwork.summary?.hardFailureCount,
      candidateSelection.summary?.hardFailureCount,
      intake.summary?.hardFailureCount,
      sourcePrivacy.summary?.hardFailureCount
    ]),
    providerId: requestPreview.provider.providerId,
    requestId: requestPreview.requestId,
    requestPreviewMode: requestPreview.mode,
    previewDataClassCount: requestPreview.payloadPreview.dataClasses.length,
    scenarioCount: requestPreview.payloadPreview.scenarioIds.length,
    secretReferenceIdCount: requestPreview.secretReferences.length,
    credentialValueIncludedCount: privacyDryRun.credentials.credentialValueIncluded === true ? 1 : 0,
    sourceReferenceIncluded: requestPreview.payloadPreview.sourcePolicy.sourceReferenceIncluded === true,
    sourceTextIncludedCount: privacyDryRun.source.sourceTextIncluded === true ? 1 : 0,
    sourceExcerptPolicy: privacyDryRun.source.sourceExcerptPolicy,
    sourcesContentPolicy: privacyDryRun.source.sourcesContentPolicy,
    sourceOptInRequired: privacyDryRun.source.optInRequired,
    fullFileAllowed: privacyDryRun.source.fullFileAllowed,
    generatedSourceAllowedByDefault: privacyDryRun.source.generatedSourceAllowedByDefault,
    providerRequestMayContainSourceText: privacyDryRun.source.providerRequestMayContainSourceText,
    evidenceMayContainSourceText: privacyDryRun.source.evidenceMayContainSourceText,
    destinationCount: privacyDryRun.network.destinationCount,
    httpsDestinationCount: requestPreview.destination.httpsOnly === true ? requestPreview.destination.destinationIds.length : 0,
    contactDestinationCount: privacyDryRun.network.contactedDestinationCount,
    externalNetworkCallExecuted: privacyDryRun.network.externalNetworkCallExecuted,
    realRemoteProviderInvocationExecuted: requestPreview.execution.realRemoteProviderInvocationExecuted,
    finalNetworkApprovalRequired: requestPreview.consent.finalNetworkApprovalRequired,
    selectedForExecutionCount: requestPreview.provider.selectedForExecution === true ? 1 : 0,
    manualDecisionStatus: manualDecisionPacket.decisionStatus,
    manualDecisionActionCount: manualDecisionPacket.requiredActions.length,
    manualDecisionGrantsNetwork: manualDecisionPacket.grants.network,
    manualDecisionGrantsExecution: manualDecisionPacket.grants.execution,
    reviewOnlyOutputRequired: requestPreview.outputBoundary.reviewOnlyOutputRequired,
    targetRepositoryMutationCount: 0,
    workspaceWriteAllowedCount: countTrue([requestPreview.outputBoundary.writeAuthority.workspaceWriteAllowed]),
    providerOwnedApplyAllowedCount: countTrue([requestPreview.outputBoundary.writeAuthority.providerOwnedApplyAllowed]),
    lspServerOwnedApplyAllowedCount: countTrue([requestPreview.outputBoundary.writeAuthority.lspServerOwnedApplyAllowed]),
    directEditObjectCount: countDirectEditObjects({ manualDecisionPacket, privacyDryRun, requestPreview }),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ manualDecisionPacket, privacyDryRun, requestPreview }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ manualDecisionPacket, privacyDryRun, requestPreview }),
    pathExposureCount: countPathExposure(serializedPackets)
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function firstCandidate(candidateSelection) {
  const candidate = safeArray(candidateSelection.candidatePackets)[0];
  assert(candidate, "W-P40.4 requires one candidate packet from W-P40.2.");
  return candidate;
}

function createFinding(id, status, message) {
  return {
    id,
    status,
    message
  };
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

function renderRequestPreviewMarkdown(evidence) {
  const { requestPreview, summary } = evidence;
  const lines = [
    "# W-P40 Metadata-Only Request Preview",
    "",
    `Status: \`${evidence.status}\``,
    `Request: \`${requestPreview.requestId}\``,
    `Provider: \`${requestPreview.provider.providerId}\``,
    `Mode: \`${requestPreview.mode}\``,
    `Selected for execution: ${summary.selectedForExecutionCount}`,
    `External network call executed: ${summary.externalNetworkCallExecuted}`,
    "",
    "## Data Classes",
    ""
  ];

  for (const dataClass of requestPreview.payloadPreview.dataClasses) {
    lines.push(`- ${dataClass}`);
  }

  lines.push("");
  lines.push("## Scenarios");
  lines.push("");

  for (const scenarioId of requestPreview.payloadPreview.scenarioIds) {
    lines.push(`- ${scenarioId}`);
  }

  lines.push("");
  lines.push("This preview contains metadata only. It does not contain credential values, source text, source references, external network calls or write operations.");
  return `${lines.join("\n")}\n`;
}

function renderPrivacyDryRunMarkdown(evidence) {
  const { privacyDryRun, summary } = evidence;
  const lines = [
    "# W-P40 Source Privacy Dry-Run",
    "",
    `Dry-run status: \`${privacyDryRun.dryRunStatus}\``,
    `Source excerpt policy: \`${summary.sourceExcerptPolicy}\``,
    `Sources content policy: \`${summary.sourcesContentPolicy}\``,
    `Credential value included: ${summary.credentialValueIncludedCount}`,
    `Source text included: ${summary.sourceTextIncludedCount}`,
    `Path exposure: ${summary.pathExposureCount}`,
    "",
    "| Finding | Status |",
    "| --- | --- |"
  ];

  for (const finding of privacyDryRun.findings) {
    lines.push(`| ${finding.id} | \`${finding.status}\` |`);
  }

  lines.push("");
  lines.push("The next real remote smoke gate remains manual-approval-required.");
  return `${lines.join("\n")}\n`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
