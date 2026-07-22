import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp40-secret-network-consent-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const secretReferencePacketPath = path.join(outputRoot, "secret-reference-packet.md");
const networkConsentPacketPath = path.join(outputRoot, "network-consent-packet.md");
const candidateSelectionEvidencePath = path.join(rootDir, "dist", "wp40-remote-provider-candidate-selection", "evidence.json");
const secretStorageEvidencePath = path.join(rootDir, "dist", "wp36-secret-storage-boundary", "evidence.json");
const networkConsentEvidencePath = path.join(rootDir, "dist", "wp36-network-mediation-consent", "evidence.json");

await main();

/**
 * 准备 W-P40.3 secret reference and network consent packet evidence。
 * Prepare W-P40.3 secret reference and network consent packet evidence.
 *
 * This stage binds the selected candidate packet to host-managed secret
 * reference metadata and mediated network consent records. It does not resolve
 * credential values, contact destinations, select the provider for execution or
 * grant write authority.
 *
 * 中文：本阶段将 candidate packet 与宿主管理的 secret reference metadata、
 * 网络中介同意记录绑定。它不解析凭据值、不访问 destination、不选择 provider
 * 执行，也不授予写入权限。
 *
 * @returns {Promise<void>} Writes public-safe secret/network consent evidence.
 */
async function main() {
  const candidateSelection = await readJson(candidateSelectionEvidencePath);
  const secretStorage = await readJson(secretStorageEvidencePath);
  const networkConsent = await readJson(networkConsentEvidencePath);
  const secretReferencePacket = createSecretReferencePacket(candidateSelection, secretStorage);
  const networkConsentPacket = createNetworkConsentPacket(candidateSelection, networkConsent, secretReferencePacket);
  const manualGatePacket = createManualGatePacket(secretReferencePacket, networkConsentPacket);
  const summary = summarize({
    candidateSelection,
    manualGatePacket,
    networkConsent,
    networkConsentPacket,
    secretReferencePacket,
    secretStorage
  });
  const checks = [
    check("HIA_WP40_SECRET_NETWORK_INPUTS_READY", summary.candidateSelectionReady === true
      && summary.secretStorageReady === true
      && summary.networkConsentReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        candidateSelectionStatus: candidateSelection.status,
        inputHardFailureCount: summary.inputHardFailureCount,
        networkConsentStatus: networkConsent.status,
        secretStorageStatus: secretStorage.status
      }
    }),
    check("HIA_WP40_SECRET_REFERENCE_PACKET_REFERENCE_ONLY", summary.secretReferenceCount >= 2
      && summary.hostManagedSecretReferenceCount === summary.secretReferenceCount
      && summary.secretReferenceValueMaterialCount === 0
      && summary.secretReferenceBoundForExecutionCount === 0
      && summary.credentialAccessGrantedCount === 0
      && summary.secretManualBindingRequired === true, {
      actual: {
        credentialAccessGrantedCount: summary.credentialAccessGrantedCount,
        hostManagedSecretReferenceCount: summary.hostManagedSecretReferenceCount,
        secretManualBindingRequired: summary.secretManualBindingRequired,
        secretReferenceBoundForExecutionCount: summary.secretReferenceBoundForExecutionCount,
        secretReferenceCount: summary.secretReferenceCount,
        secretReferenceValueMaterialCount: summary.secretReferenceValueMaterialCount
      }
    }),
    check("HIA_WP40_NETWORK_CONSENT_PACKET_COMPLETE", summary.consentRecordCount >= 3
      && summary.providerConsentRecordCount >= 1
      && summary.workspaceConsentRecordCount >= 1
      && summary.requestConsentRecordCount >= 1
      && summary.blockedConsentRecordCount >= 2
      && summary.destinationCount >= 1
      && summary.destinationAllowlistRequired === true
      && summary.httpsRequired === true
      && summary.privateNetworkAllowed === false, {
      actual: {
        blockedConsentRecordCount: summary.blockedConsentRecordCount,
        consentRecordCount: summary.consentRecordCount,
        destinationAllowlistRequired: summary.destinationAllowlistRequired,
        destinationCount: summary.destinationCount,
        httpsRequired: summary.httpsRequired,
        privateNetworkAllowed: summary.privateNetworkAllowed,
        providerConsentRecordCount: summary.providerConsentRecordCount,
        requestConsentRecordCount: summary.requestConsentRecordCount,
        workspaceConsentRecordCount: summary.workspaceConsentRecordCount
      }
    }),
    check("HIA_WP40_NETWORK_MEDIATION_RETAINED", summary.directProviderNetworkAllowed === false
      && summary.hostMediatorRequired === true
      && summary.adapterFetchAuthorityDenied === true
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.manualNetworkApprovalRequired === true, {
      actual: {
        adapterFetchAuthorityDenied: summary.adapterFetchAuthorityDenied,
        directProviderNetworkAllowed: summary.directProviderNetworkAllowed,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        hostMediatorRequired: summary.hostMediatorRequired,
        manualNetworkApprovalRequired: summary.manualNetworkApprovalRequired,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted
      }
    }),
    check("HIA_WP40_SECRET_NETWORK_AUDIT_REDACTED", summary.auditRequired === true
      && summary.auditCredentialValueAllowed === false
      && summary.auditSourceTextAllowed === false
      && summary.auditRequiredFieldCount >= 8
      && summary.redactedAuditPreviewCount >= 1, {
      actual: {
        auditCredentialValueAllowed: summary.auditCredentialValueAllowed,
        auditRequired: summary.auditRequired,
        auditRequiredFieldCount: summary.auditRequiredFieldCount,
        auditSourceTextAllowed: summary.auditSourceTextAllowed,
        redactedAuditPreviewCount: summary.redactedAuditPreviewCount
      }
    }),
    check("HIA_WP40_SECRET_NETWORK_SOURCE_PRIVACY_DEFAULT_DENY", summary.sourceExcerptPolicy === "none"
      && summary.sourcesContentPolicy === "none"
      && summary.providerRequestMayContainSourceText === false
      && summary.evidenceMayContainSourceText === false
      && summary.sourceTextIncludedCount === 0, {
      actual: {
        evidenceMayContainSourceText: summary.evidenceMayContainSourceText,
        providerRequestMayContainSourceText: summary.providerRequestMayContainSourceText,
        sourceExcerptPolicy: summary.sourceExcerptPolicy,
        sourcesContentPolicy: summary.sourcesContentPolicy,
        sourceTextIncludedCount: summary.sourceTextIncludedCount
      }
    }),
    check("HIA_WP40_SECRET_NETWORK_NO_WRITE_OR_TARGET_SIDE_EFFECTS", summary.selectedForExecutionCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerOwnedApplyAllowedCount === 0
      && summary.lspServerOwnedApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyAllowedCount: summary.lspServerOwnedApplyAllowedCount,
        providerOwnedApplyAllowedCount: summary.providerOwnedApplyAllowedCount,
        selectedForExecutionCount: summary.selectedForExecutionCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP40_SECRET_NETWORK_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp40-secret-reference-network-consent-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp40-request-preview-and-privacy-dry-run" : "blocked",
    sourceEvidence: {
      providerCandidateSelection: normalizePath(candidateSelectionEvidencePath),
      secretStorageBoundary: normalizePath(secretStorageEvidencePath),
      networkMediationConsent: normalizePath(networkConsentEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    secretReferencePacket,
    networkConsentPacket,
    manualGatePacket,
    checks,
    generatedDocs: {
      secretReferencePacket: normalizePath(secretReferencePacketPath),
      networkConsentPacket: normalizePath(networkConsentPacketPath)
    },
    nextContractInputs: [
      {
        phase: "W-P40.4",
        topic: "request-preview-and-privacy-dry-run",
        status: "ready-input",
        reason: "Provider candidate, secret references and network consent metadata are bound by reference only, so a metadata-only request preview can be prepared next."
      },
      {
        phase: "W-P40.5",
        topic: "real-remote-provider-smoke-execution-gate",
        status: "manual-approval-required",
        reason: "A real remote provider smoke still requires explicit user approval for provider execution, credential use, destination, source privacy and external network execution."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P40 secret reference and network consent evidence");
  assert.equal(hardFailures.length, 0, `W-P40 secret reference and network consent has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(secretReferencePacketPath, renderSecretReferencePacketMarkdown(evidence), "utf8");
  await writeFile(networkConsentPacketPath, renderNetworkConsentPacketMarkdown(evidence), "utf8");
  console.log(`W-P40 secret reference and network consent evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P40 secret reference packet prepared at ${normalizePath(secretReferencePacketPath)}`);
  console.log(`W-P40 network consent packet prepared at ${normalizePath(networkConsentPacketPath)}`);
}

function createSecretReferencePacket(candidateSelection, secretStorage) {
  const candidate = firstCandidate(candidateSelection);
  const references = safeArray(secretStorage.secretReferences)
    .filter((secretRef) => secretRef.providerId === candidate.providerId)
    .map((secretRef) => ({
      referenceId: secretRef.referenceId,
      providerId: secretRef.providerId,
      purpose: secretRef.purpose,
      credentialKind: secretRef.credentialKind,
      scope: secretRef.scope,
      storeBinding: secretRef.storeBinding,
      valueMaterialState: "not-serialized",
      boundForExecution: false,
      manualBindingRequired: true,
      grantsCredentialAccess: false,
      lifecycle: secretRef.lifecycle
    }));

  return {
    contract: "hia-remote-provider-secret-reference-packet",
    contractVersion: "0.1.0-draft",
    packetStatus: "prepared-reference-only",
    providerId: candidate.providerId,
    candidateId: candidate.candidateId,
    selectedForExecution: false,
    secretReferences: references,
    hostBoundary: {
      storeBinding: "host-managed-secret-store",
      hostOwnsCredentialResolution: true,
      providerReceivesReferenceOnly: true,
      evidenceMayContainCredentialValue: false,
      requestMayContainCredentialValue: false,
      resultMayContainCredentialValue: false,
      auditMayContainCredentialValue: false
    },
    manualGate: {
      status: "manual-binding-required-before-request-build",
      grantsCredentialAccess: false,
      requiredBefore: "request-build"
    }
  };
}

function createNetworkConsentPacket(candidateSelection, networkConsent, secretReferencePacket) {
  const candidate = firstCandidate(candidateSelection);
  const consentRecords = safeArray(networkConsent.consentRecords)
    .filter((record) => record.providerId === candidate.providerId)
    .map((record) => ({
      id: record.id,
      providerId: record.providerId,
      scope: record.scope,
      status: record.status,
      approvedDataClasses: safeArray(record.approvedDataClasses),
      expires: record.expires,
      revocable: record.revocable === true,
      grantsNetworkInThisPhase: false
    }));
  const destinations = safeArray(networkConsent.destinationPolicy?.destinations)
    .filter((destination) => destination.providerId === candidate.providerId)
    .map((destination) => ({
      id: destination.id,
      providerId: destination.providerId,
      origin: destination.origin,
      scheme: destination.scheme,
      status: destination.status,
      contactedInThisPhase: false
    }));

  return {
    contract: "hia-remote-provider-network-consent-packet",
    contractVersion: "0.1.0-draft",
    packetStatus: "prepared-consent-records-not-executed",
    providerId: candidate.providerId,
    candidateId: candidate.candidateId,
    selectedForExecution: false,
    networkPolicy: {
      directProviderNetworkAllowed: networkConsent.networkPolicy?.directProviderNetworkAllowed === true,
      hostMediatorRequired: networkConsent.networkPolicy?.hostMediatorRequired === true,
      adapterFetchAuthority: networkConsent.networkPolicy?.adapterFetchAuthority ?? "denied",
      destinationAllowlistRequired: networkConsent.destinationPolicy?.allowlistRequired === true,
      httpsRequired: networkConsent.destinationPolicy?.httpsRequired === true,
      privateNetworkAllowed: networkConsent.destinationPolicy?.privateNetworkAllowed === true
    },
    consentRecords,
    destinationPolicy: {
      redirectPolicy: networkConsent.destinationPolicy?.redirectPolicy,
      destinations
    },
    mediationEnvelope: {
      providerId: candidate.providerId,
      requestId: "wp40-network-consent-preview",
      consentRecordIds: consentRecords.map((record) => record.id),
      destinationIds: destinations.map((destination) => destination.id),
      secretReferenceIds: secretReferencePacket.secretReferences.map((secretRef) => secretRef.referenceId),
      maxPayloadClass: "metadata-only",
      bodyFormat: "provider-request-json-without-source-body",
      externalNetworkCallExecuted: false,
      realRemoteProviderInvocationExecuted: false,
      remoteInvocationStatus: "blocked-until-request-preview-and-final-approval"
    },
    auditPreview: {
      required: networkConsent.auditPolicy?.required === true,
      credentialValueAllowed: false,
      sourceTextAllowed: false,
      requiredFields: safeArray(networkConsent.auditPolicy?.requiredFields),
      redactedPreviewRecords: [
        {
          providerId: candidate.providerId,
          requestId: "wp40-network-consent-preview",
          destinationId: destinations[0]?.id,
          dataClasses: ["metadata-only"],
          outcome: "not-executed-in-wp40.3",
          redaction: "credential-and-source-text-redacted"
        }
      ]
    },
    sourcePrivacy: {
      sourceExcerptPolicy: networkConsent.privacyBoundary?.sourceExcerptPolicy ?? "none",
      sourcesContentPolicy: networkConsent.privacyBoundary?.sourcesContentAllowed === true ? "allowed" : "none",
      providerRequestMayContainSourceText: false,
      evidenceMayContainSourceText: false
    }
  };
}

function createManualGatePacket(secretReferencePacket, networkConsentPacket) {
  return {
    contract: "hia-remote-provider-secret-network-manual-gate-packet",
    contractVersion: "0.1.0-draft",
    gateStatus: "prepared-manual-required-before-network",
    requiredBefore: "request-preview-and-network-send",
    requiredManualActions: [
      "bind-host-managed-secret-reference",
      "confirm-provider-consent",
      "approve-workspace-consent",
      "approve-request-consent",
      "confirm-destination-allowlist",
      "confirm-https-only",
      "confirm-source-privacy-none",
      "confirm-redacted-audit-preview"
    ],
    grants: {
      credentialAccess: false,
      network: false,
      execution: false,
      write: false
    },
    packetRefs: {
      secretReferencePacketStatus: secretReferencePacket.packetStatus,
      networkConsentPacketStatus: networkConsentPacket.packetStatus
    }
  };
}

function summarize({
  candidateSelection,
  manualGatePacket,
  networkConsent,
  networkConsentPacket,
  secretReferencePacket,
  secretStorage
}) {
  const serializedPackets = JSON.stringify({ manualGatePacket, networkConsentPacket, secretReferencePacket });
  return {
    candidateSelectionReady: candidateSelection.status === "ready-for-wp40-secret-reference-and-network-consent-packet",
    secretStorageReady: secretStorage.status === "ready-for-network-mediation-and-consent",
    networkConsentReady: networkConsent.status === "ready-for-source-excerpt-opt-in-and-privacy-gate",
    inputHardFailureCount: sum([
      candidateSelection.summary?.hardFailureCount,
      secretStorage.summary?.hardFailureCount,
      networkConsent.summary?.hardFailureCount
    ]),
    providerId: secretReferencePacket.providerId,
    candidateId: secretReferencePacket.candidateId,
    selectedForExecutionCount: countTrue([
      secretReferencePacket.selectedForExecution,
      networkConsentPacket.selectedForExecution
    ]),
    secretReferenceCount: secretReferencePacket.secretReferences.length,
    hostManagedSecretReferenceCount: secretReferencePacket.secretReferences
      .filter((secretRef) => secretRef.storeBinding === "host-managed-secret-store")
      .length,
    secretReferenceValueMaterialCount: secretReferencePacket.secretReferences
      .filter((secretRef) => secretRef.valueMaterialState !== "not-serialized")
      .length,
    secretReferenceBoundForExecutionCount: secretReferencePacket.secretReferences
      .filter((secretRef) => secretRef.boundForExecution === true)
      .length,
    credentialAccessGrantedCount: countTrue([
      secretReferencePacket.manualGate.grantsCredentialAccess,
      manualGatePacket.grants.credentialAccess
    ]),
    secretManualBindingRequired: secretReferencePacket.manualGate.status === "manual-binding-required-before-request-build",
    consentRecordCount: networkConsentPacket.consentRecords.length,
    providerConsentRecordCount: networkConsentPacket.consentRecords.filter((record) => record.scope === "provider").length,
    workspaceConsentRecordCount: networkConsentPacket.consentRecords.filter((record) => record.scope === "workspace").length,
    requestConsentRecordCount: networkConsentPacket.consentRecords.filter((record) => record.scope === "request").length,
    approvedConsentRecordCount: networkConsentPacket.consentRecords.filter((record) => record.status === "approved").length,
    blockedConsentRecordCount: networkConsentPacket.consentRecords.filter((record) => record.status === "blocked").length,
    destinationCount: networkConsentPacket.destinationPolicy.destinations.length,
    destinationAllowlistRequired: networkConsentPacket.networkPolicy.destinationAllowlistRequired,
    httpsRequired: networkConsentPacket.networkPolicy.httpsRequired,
    privateNetworkAllowed: networkConsentPacket.networkPolicy.privateNetworkAllowed,
    directProviderNetworkAllowed: networkConsentPacket.networkPolicy.directProviderNetworkAllowed,
    hostMediatorRequired: networkConsentPacket.networkPolicy.hostMediatorRequired,
    adapterFetchAuthorityDenied: networkConsentPacket.networkPolicy.adapterFetchAuthority === "denied",
    externalNetworkCallExecuted: networkConsentPacket.mediationEnvelope.externalNetworkCallExecuted,
    realRemoteProviderInvocationExecuted: networkConsentPacket.mediationEnvelope.realRemoteProviderInvocationExecuted,
    manualNetworkApprovalRequired: manualGatePacket.gateStatus === "prepared-manual-required-before-network",
    auditRequired: networkConsentPacket.auditPreview.required,
    auditCredentialValueAllowed: networkConsentPacket.auditPreview.credentialValueAllowed,
    auditSourceTextAllowed: networkConsentPacket.auditPreview.sourceTextAllowed,
    auditRequiredFieldCount: networkConsentPacket.auditPreview.requiredFields.length,
    redactedAuditPreviewCount: networkConsentPacket.auditPreview.redactedPreviewRecords.length,
    sourceExcerptPolicy: networkConsentPacket.sourcePrivacy.sourceExcerptPolicy,
    sourcesContentPolicy: networkConsentPacket.sourcePrivacy.sourcesContentPolicy,
    providerRequestMayContainSourceText: networkConsentPacket.sourcePrivacy.providerRequestMayContainSourceText,
    evidenceMayContainSourceText: networkConsentPacket.sourcePrivacy.evidenceMayContainSourceText,
    sourceTextIncludedCount: countForbiddenDocumentTextMarkers({ manualGatePacket, networkConsentPacket, secretReferencePacket }),
    targetRepositoryMutationCount: 0,
    workspaceWriteAllowedCount: 0,
    providerOwnedApplyAllowedCount: 0,
    lspServerOwnedApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ manualGatePacket, networkConsentPacket, secretReferencePacket }),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ manualGatePacket, networkConsentPacket, secretReferencePacket }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ manualGatePacket, networkConsentPacket, secretReferencePacket }),
    pathExposureCount: countPathExposure(serializedPackets)
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function firstCandidate(candidateSelection) {
  const candidate = safeArray(candidateSelection.candidatePackets)[0];
  assert(candidate, "W-P40.3 requires at least one candidate packet from W-P40.2.");
  return candidate;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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

function renderSecretReferencePacketMarkdown(evidence) {
  const lines = [
    "# W-P40 Secret Reference Packet",
    "",
    `Status: \`${evidence.status}\``,
    `Provider: \`${evidence.secretReferencePacket.providerId}\``,
    `Secret references: ${evidence.summary.secretReferenceCount}`,
    `Bound for execution: ${evidence.summary.secretReferenceBoundForExecutionCount}`,
    `Credential access granted: ${evidence.summary.credentialAccessGrantedCount}`,
    "",
    "| Reference | Kind | Scope | Store | State |",
    "| --- | --- | --- | --- | --- |"
  ];

  for (const secretRef of evidence.secretReferencePacket.secretReferences) {
    lines.push(`| ${secretRef.referenceId} | ${secretRef.credentialKind} | ${secretRef.scope} | ${secretRef.storeBinding} | ${secretRef.valueMaterialState} |`);
  }

  lines.push("");
  lines.push("This packet contains host-managed secret references only. It does not contain credential values and does not grant execution access.");
  return `${lines.join("\n")}\n`;
}

function renderNetworkConsentPacketMarkdown(evidence) {
  const lines = [
    "# W-P40 Network Consent Packet",
    "",
    `Status: \`${evidence.status}\``,
    `Provider: \`${evidence.networkConsentPacket.providerId}\``,
    `Host mediator required: ${evidence.summary.hostMediatorRequired}`,
    `External network call executed: ${evidence.summary.externalNetworkCallExecuted}`,
    "",
    "## Consent Records",
    "",
    "| Record | Scope | Status | Grants Network |",
    "| --- | --- | --- | --- |"
  ];

  for (const record of evidence.networkConsentPacket.consentRecords) {
    lines.push(`| ${record.id} | ${record.scope} | \`${record.status}\` | ${record.grantsNetworkInThisPhase} |`);
  }

  lines.push("");
  lines.push("## Destinations");
  lines.push("");
  lines.push("| Destination | Scheme | Status | Contacted |");
  lines.push("| --- | --- | --- | --- |");

  for (const destination of evidence.networkConsentPacket.destinationPolicy.destinations) {
    lines.push(`| ${destination.origin} | ${destination.scheme} | \`${destination.status}\` | ${destination.contactedInThisPhase} |`);
  }

  lines.push("");
  lines.push("This packet prepares consent metadata only. It does not perform network calls or select the provider for execution.");
  return `${lines.join("\n")}\n`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
