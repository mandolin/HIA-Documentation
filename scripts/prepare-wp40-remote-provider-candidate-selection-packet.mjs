import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp40-remote-provider-candidate-selection");
const evidencePath = path.join(outputRoot, "evidence.json");
const selectionPacketPath = path.join(outputRoot, "remote-provider-candidate-selection-packet.md");
const reviewChecklistPath = path.join(outputRoot, "provider-candidate-review-checklist.md");
const intakeEvidencePath = path.join(rootDir, "dist", "wp40-controlled-remote-provider-smoke-intake", "evidence.json");
const providerRegistryEvidencePath = path.join(rootDir, "dist", "wp36-provider-registry-installation-policy", "evidence.json");
const remoteGateEvidencePath = path.join(rootDir, "dist", "wp38-remote-provider-smoke-gate-preparation", "evidence.json");

await main();

/**
 * 准备 W-P40.2 remote provider candidate selection packet evidence。
 * Prepare W-P40.2 remote provider candidate selection packet evidence.
 *
 * This stage turns the previously prepared remote-provider template into a
 * reviewable candidate packet. It records provider identity, package,
 * provenance, license, capability and disabled-by-default selection state while
 * still forbidding provider execution, credential resolution and network calls.
 *
 * 中文：本阶段将上一阶段的 remote-provider template 固化为可审查的候选包，
 * 记录 provider 身份、包、来源、许可、能力以及默认禁用的选择状态；仍然禁止
 * 执行 provider、解析凭证或发起网络调用。
 *
 * @returns {Promise<void>} Writes public-safe candidate selection evidence.
 */
async function main() {
  const intakeEvidence = await readJson(intakeEvidencePath);
  const providerRegistryEvidence = await readJson(providerRegistryEvidencePath);
  const remoteGateEvidence = await readJson(remoteGateEvidencePath);
  const candidatePackets = createCandidatePackets(providerRegistryEvidence, intakeEvidence);
  const manualSelectionPacket = createManualSelectionPacket(candidatePackets);
  const summary = summarize({
    candidatePackets,
    intakeEvidence,
    manualSelectionPacket,
    providerRegistryEvidence,
    remoteGateEvidence
  });
  const checks = [
    check("HIA_WP40_PROVIDER_SELECTION_INPUTS_READY", summary.intakeReady === true
      && summary.registryReady === true
      && summary.remoteGateReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        intakeStatus: intakeEvidence.status,
        registryStatus: providerRegistryEvidence.status,
        remoteGateStatus: remoteGateEvidence.status
      }
    }),
    check("HIA_WP40_PROVIDER_SELECTION_PACKET_COMPLETE", summary.candidateCount >= 1
      && summary.readyCandidateCount === summary.candidateCount
      && summary.identityCompleteCandidateCount === summary.candidateCount
      && summary.packageCompleteCandidateCount === summary.candidateCount
      && summary.capabilityDeclarationCandidateCount === summary.candidateCount, {
      actual: {
        candidateCount: summary.candidateCount,
        capabilityDeclarationCandidateCount: summary.capabilityDeclarationCandidateCount,
        identityCompleteCandidateCount: summary.identityCompleteCandidateCount,
        packageCompleteCandidateCount: summary.packageCompleteCandidateCount,
        readyCandidateCount: summary.readyCandidateCount
      }
    }),
    check("HIA_WP40_PROVIDER_SELECTION_LICENSE_AND_PROVENANCE_READY", summary.permissiveLicenseCandidateCount === summary.candidateCount
      && summary.deniedLicenseCandidateCount === 0
      && summary.provenanceRequiredCandidateCount === summary.candidateCount
      && summary.repositoryRequiredCandidateCount === summary.candidateCount
      && summary.registryIntegrityRequiredCandidateCount === summary.candidateCount
      && summary.trustedPublisherRequiredCandidateCount === summary.candidateCount, {
      actual: {
        deniedLicenseCandidateCount: summary.deniedLicenseCandidateCount,
        permissiveLicenseCandidateCount: summary.permissiveLicenseCandidateCount,
        provenanceRequiredCandidateCount: summary.provenanceRequiredCandidateCount,
        registryIntegrityRequiredCandidateCount: summary.registryIntegrityRequiredCandidateCount,
        repositoryRequiredCandidateCount: summary.repositoryRequiredCandidateCount,
        trustedPublisherRequiredCandidateCount: summary.trustedPublisherRequiredCandidateCount
      }
    }),
    check("HIA_WP40_PROVIDER_SELECTION_DISABLED_MANUAL_ONLY", summary.selectedForExecutionCount === 0
      && summary.defaultEnabledCandidateCount === 0
      && summary.userSelectedCandidateCount === 0
      && summary.invocableCandidateCount === 0
      && summary.manualSelectionRequiredCandidateCount === summary.candidateCount
      && summary.selectionGrantsNetworkCount === 0
      && summary.selectionGrantsExecutionCount === 0, {
      actual: {
        defaultEnabledCandidateCount: summary.defaultEnabledCandidateCount,
        invocableCandidateCount: summary.invocableCandidateCount,
        manualSelectionRequiredCandidateCount: summary.manualSelectionRequiredCandidateCount,
        selectedForExecutionCount: summary.selectedForExecutionCount,
        selectionGrantsExecutionCount: summary.selectionGrantsExecutionCount,
        selectionGrantsNetworkCount: summary.selectionGrantsNetworkCount,
        userSelectedCandidateCount: summary.userSelectedCandidateCount
      }
    }),
    check("HIA_WP40_PROVIDER_SELECTION_CAPABILITY_BOUNDARY_SAFE", summary.unsafeCapabilityCandidateCount === 0
      && summary.sourceBodyInputAllowedCandidateCount === 0
      && summary.workspaceWriteAllowedCandidateCount === 0
      && summary.targetRepositoryMutationAllowedCandidateCount === 0
      && summary.toolExecutionAllowedCandidateCount === 0
      && summary.networkAccessEnabledCandidateCount === 0
      && summary.reviewOnlyOutputCandidateCount === summary.candidateCount, {
      actual: {
        networkAccessEnabledCandidateCount: summary.networkAccessEnabledCandidateCount,
        reviewOnlyOutputCandidateCount: summary.reviewOnlyOutputCandidateCount,
        sourceBodyInputAllowedCandidateCount: summary.sourceBodyInputAllowedCandidateCount,
        targetRepositoryMutationAllowedCandidateCount: summary.targetRepositoryMutationAllowedCandidateCount,
        toolExecutionAllowedCandidateCount: summary.toolExecutionAllowedCandidateCount,
        unsafeCapabilityCandidateCount: summary.unsafeCapabilityCandidateCount,
        workspaceWriteAllowedCandidateCount: summary.workspaceWriteAllowedCandidateCount
      }
    }),
    check("HIA_WP40_PROVIDER_SELECTION_NO_SECRET_NETWORK_SOURCE_WRITE", summary.secretReferenceResolvedCount === 0
      && summary.credentialMaterialIncludedCount === 0
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.providerRequestMayContainSourceBody === false
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        credentialMaterialIncludedCount: summary.credentialMaterialIncludedCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        providerRequestMayContainSourceBody: summary.providerRequestMayContainSourceBody,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        secretReferenceResolvedCount: summary.secretReferenceResolvedCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount
      }
    }),
    check("HIA_WP40_PROVIDER_SELECTION_PRIVACY_CLEAN", summary.pathExposureCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.sourcesContentPolicy === "none", {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp40-remote-provider-candidate-selection-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp40-secret-reference-and-network-consent-packet" : "blocked",
    sourceEvidence: {
      controlledSmokeIntake: normalizePath(intakeEvidencePath),
      providerRegistryInstallationPolicy: normalizePath(providerRegistryEvidencePath),
      remoteProviderSmokeGatePreparation: normalizePath(remoteGateEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    candidatePackets,
    manualSelectionPacket,
    checks,
    generatedDocs: {
      selectionPacket: normalizePath(selectionPacketPath),
      reviewChecklist: normalizePath(reviewChecklistPath)
    },
    nextContractInputs: [
      {
        phase: "W-P40.3",
        topic: "secret-reference-and-network-consent-packet",
        status: "ready-input",
        reason: "Candidate identity, package, provenance, license and capability boundaries are fixed without selecting the provider for execution."
      },
      {
        phase: "W-P40.4",
        topic: "request-preview-and-privacy-dry-run",
        status: "ready-after-wp40.3",
        reason: "A request preview can be built after host-managed secret references and network consent fields are bound by reference only."
      },
      {
        phase: "W-P40.5",
        topic: "real-remote-provider-smoke-execution-gate",
        status: "manual-approval-required",
        reason: "A real provider smoke still requires explicit user approval for provider, secret reference, destination, source privacy and external network execution."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P40 remote provider candidate selection evidence");
  assert.equal(hardFailures.length, 0, `W-P40 remote provider candidate selection has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(selectionPacketPath, renderSelectionPacketMarkdown(evidence), "utf8");
  await writeFile(reviewChecklistPath, renderReviewChecklistMarkdown(evidence), "utf8");
  console.log(`W-P40 remote provider candidate selection evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P40 remote provider candidate selection packet prepared at ${normalizePath(selectionPacketPath)}`);
  console.log(`W-P40 provider candidate review checklist prepared at ${normalizePath(reviewChecklistPath)}`);
}

function createCandidatePackets(providerRegistryEvidence, intakeEvidence) {
  const intakeCandidates = Array.isArray(intakeEvidence.remoteProviderCandidates) ? intakeEvidence.remoteProviderCandidates : [];
  return registryRemoteEntries(providerRegistryEvidence)
    .map((entry) => createCandidatePacket(entry, intakeCandidates.find((candidate) => candidate.providerId === entry.id)));
}

function createCandidatePacket(entry, intakeCandidate) {
  const capabilities = normalizeCapabilities(entry.capabilities);
  const policies = normalizePolicies(entry.policies);
  return {
    contract: "hia-remote-provider-candidate-selection-packet",
    contractVersion: "0.1.0-draft",
    candidateId: `candidate.${entry.id}`,
    providerId: entry.id,
    displayName: entry.displayName,
    runtimeKind: entry.runtimeKind,
    selection: {
      status: "candidate-prepared-not-selected",
      selectedForExecution: false,
      defaultEnabled: entry.install?.defaultEnabled === true,
      userSelected: false,
      manualSelectionRequired: true,
      requiredBefore: "provider-load",
      approvalStepIds: [
        "select-remote-provider-candidate",
        "confirm-provider-package-provenance"
      ],
      grantsProviderLoad: false,
      grantsCredentialAccess: false,
      grantsNetwork: false,
      grantsExecution: false,
      reason: "Candidate metadata is reviewable, but execution remains blocked until later manual consent gates."
    },
    packageIdentity: {
      name: entry.packageRef?.name,
      version: entry.packageRef?.version,
      source: entry.packageRef?.source,
      packageManager: "npm",
      packageIdentityRequired: true,
      immutableVersionRequired: entry.provenance?.immutableVersionRequired === true,
      registryIntegrityRequiredBeforePublish: entry.provenance?.registryIntegrityRequiredBeforePublish === true,
      repositoryRequired: entry.provenance?.repositoryRequired === true
    },
    license: {
      expression: entry.license?.expression,
      category: entry.license?.category,
      permissive: isAllowedLicense(entry.license?.expression)
    },
    provenance: {
      mode: entry.provenance?.mode,
      status: provenanceStatus(entry),
      trustedPublisherState: entry.provenance?.trustedPublisherState,
      trustedPublisherRequiredBeforeApproval: entry.provenance?.trustedPublisherState === "required-before-registry-approval",
      registryIntegrityRequiredBeforePublish: entry.provenance?.registryIntegrityRequiredBeforePublish === true,
      repositoryRequired: entry.provenance?.repositoryRequired === true
    },
    install: {
      registryStatus: entry.install?.status,
      activation: entry.install?.activation,
      defaultEnabled: entry.install?.defaultEnabled === true,
      userSelected: false
    },
    invocation: {
      registryStatus: entry.invocation?.status,
      selectedForExecution: false,
      invocableInThisPhase: false,
      allowedBeforeSecretGate: entry.invocation?.allowedBeforeSecretGate === true,
      allowedBeforeNetworkGate: entry.invocation?.allowedBeforeNetworkGate === true,
      reason: entry.invocation?.reason ?? "Remote provider execution is blocked until explicit W-P40.5 approval."
    },
    capabilities,
    policies,
    boundaries: {
      requiresHostManagedCredential: intakeCandidate?.requiresHostManagedCredential === true,
      requiresNetworkConsent: intakeCandidate?.requiresNetworkConsent === true,
      sourceExcerptPolicy: policies.sourceExcerptPolicy,
      sourcesContentPolicy: policies.sourcesContentPolicy,
      providerOutputPolicy: intakeCandidate?.providerOutputPolicy ?? "review-payload-augmentation-only",
      reviewOnlyOutputRequired: policies.requiresHumanReview === true,
      checkedApplySeparationRequired: true,
      secretValueAllowedInEvidence: false,
      secretValueAllowedInRequest: false,
      sourceBodyAllowedInEvidence: false,
      sourceBodyAllowedInProviderRequest: false,
      realRemoteProviderInvocationExecuted: false,
      externalNetworkCallExecuted: false,
      targetRepositoryMutationAllowed: false,
      writeAuthority: noWriteAuthority()
    }
  };
}

function createManualSelectionPacket(candidatePackets) {
  return {
    contract: "hia-remote-provider-manual-selection-packet",
    contractVersion: "0.1.0-draft",
    packetStatus: "prepared-manual-selection-required",
    providerCandidateCount: candidatePackets.length,
    selectedProviderId: null,
    candidateIds: candidatePackets.map((candidate) => candidate.candidateId),
    requiredConfirmations: [
      "provider-identity",
      "package-name-version-and-source",
      "package-provenance-and-registry-integrity",
      "license-expression",
      "declared-capability-boundary",
      "disabled-default-and-manual-selection",
      "source-privacy-default-none",
      "review-only-output",
      "no-write-authority",
      "no-network-until-final-approval"
    ],
    grants: {
      providerLoad: false,
      credentialAccess: false,
      network: false,
      execution: false,
      write: false
    },
    handoff: {
      nextPhase: "W-P40.3",
      nextTopic: "secret-reference-and-network-consent-packet",
      note: "Provider candidate metadata can be reviewed before host-managed secret references are bound."
    }
  };
}

function summarize({
  candidatePackets,
  intakeEvidence,
  manualSelectionPacket,
  providerRegistryEvidence,
  remoteGateEvidence
}) {
  const serializedPackets = JSON.stringify({ candidatePackets, manualSelectionPacket });
  return {
    intakeReady: intakeEvidence.status === "ready-for-wp40-provider-selection-and-manual-approval-route",
    registryReady: providerRegistryEvidence.status === "ready-for-secret-storage-boundary",
    remoteGateReady: remoteGateEvidence.smokeGateStatus === "prepared-manual-approval-required",
    inputHardFailureCount: sum([
      intakeEvidence.summary?.hardFailureCount,
      providerRegistryEvidence.summary?.hardFailureCount,
      remoteGateEvidence.summary?.hardFailureCount
    ]),
    candidateCount: candidatePackets.length,
    remoteRegistryEntryCount: registryRemoteEntries(providerRegistryEvidence).length,
    intakeRemoteCandidateCount: Array.isArray(intakeEvidence.remoteProviderCandidates)
      ? intakeEvidence.remoteProviderCandidates.length
      : 0,
    readyCandidateCount: candidatePackets.filter(isCandidateReady).length,
    identityCompleteCandidateCount: candidatePackets.filter(hasCompleteIdentity).length,
    packageCompleteCandidateCount: candidatePackets.filter(hasCompletePackageIdentity).length,
    capabilityDeclarationCandidateCount: candidatePackets.filter((candidate) => isRecord(candidate.capabilities)).length,
    permissiveLicenseCandidateCount: candidatePackets.filter((candidate) => candidate.license.permissive === true).length,
    deniedLicenseCandidateCount: candidatePackets.filter((candidate) => candidate.license.permissive !== true).length,
    provenanceRequiredCandidateCount: candidatePackets.filter((candidate) => candidate.packageIdentity.packageIdentityRequired === true).length,
    repositoryRequiredCandidateCount: candidatePackets.filter((candidate) => candidate.provenance.repositoryRequired === true).length,
    registryIntegrityRequiredCandidateCount: candidatePackets.filter((candidate) => candidate.provenance.registryIntegrityRequiredBeforePublish === true).length,
    trustedPublisherRequiredCandidateCount: candidatePackets.filter((candidate) => candidate.provenance.trustedPublisherRequiredBeforeApproval === true).length,
    selectedForExecutionCount: candidatePackets.filter((candidate) => candidate.selection.selectedForExecution === true).length,
    defaultEnabledCandidateCount: candidatePackets.filter((candidate) => candidate.selection.defaultEnabled === true).length,
    userSelectedCandidateCount: candidatePackets.filter((candidate) => candidate.selection.userSelected === true).length,
    invocableCandidateCount: candidatePackets.filter((candidate) => candidate.invocation.invocableInThisPhase === true).length,
    manualSelectionRequiredCandidateCount: candidatePackets.filter((candidate) => candidate.selection.manualSelectionRequired === true).length,
    selectionGrantsNetworkCount: candidatePackets.filter((candidate) => candidate.selection.grantsNetwork === true).length,
    selectionGrantsExecutionCount: candidatePackets.filter((candidate) => candidate.selection.grantsExecution === true).length,
    unsafeCapabilityCandidateCount: candidatePackets.filter(hasUnsafeCapability).length,
    sourceBodyInputAllowedCandidateCount: candidatePackets.filter((candidate) => candidate.capabilities.sourceBodyInput === true).length,
    workspaceWriteAllowedCandidateCount: candidatePackets.filter((candidate) => candidate.capabilities.workspaceWrite === true).length,
    targetRepositoryMutationAllowedCandidateCount: candidatePackets.filter((candidate) => candidate.capabilities.targetRepositoryMutation === true).length,
    toolExecutionAllowedCandidateCount: candidatePackets.filter((candidate) => candidate.capabilities.toolExecution === true).length,
    networkAccessEnabledCandidateCount: candidatePackets.filter((candidate) => candidate.capabilities.networkAccess !== "disabled").length,
    reviewOnlyOutputCandidateCount: candidatePackets.filter((candidate) => candidate.boundaries.providerOutputPolicy === "review-payload-augmentation-only"
      && candidate.boundaries.reviewOnlyOutputRequired === true).length,
    manualConfirmationCount: manualSelectionPacket.requiredConfirmations.length,
    secretReferenceResolvedCount: 0,
    credentialMaterialIncludedCount: countTrue(candidatePackets.map((candidate) => candidate.boundaries.secretValueAllowedInEvidence))
      + countTrue(candidatePackets.map((candidate) => candidate.boundaries.secretValueAllowedInRequest)),
    realRemoteProviderInvocationExecuted: false,
    externalNetworkCallExecuted: false,
    sourceBodyIncludedInEvidenceCount: countTrue(candidatePackets.map((candidate) => candidate.boundaries.sourceBodyAllowedInEvidence)),
    providerRequestMayContainSourceBody: candidatePackets.some((candidate) => candidate.boundaries.sourceBodyAllowedInProviderRequest === true),
    sourcesContentPolicy: candidatePackets.every((candidate) => candidate.boundaries.sourcesContentPolicy === "none") ? "none" : "mixed",
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects({ candidatePackets, manualSelectionPacket }),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ candidatePackets, manualSelectionPacket }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ candidatePackets, manualSelectionPacket }),
    pathExposureCount: countPathExposure(serializedPackets)
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function registryRemoteEntries(providerRegistryEvidence) {
  const entries = Array.isArray(providerRegistryEvidence.registryEntries) ? providerRegistryEvidence.registryEntries : [];
  return entries.filter((entry) => entry.runtimeKind === "remote-api");
}

function hasCompleteIdentity(candidate) {
  return Boolean(candidate.providerId && candidate.displayName && candidate.runtimeKind === "remote-api");
}

function hasCompletePackageIdentity(candidate) {
  return Boolean(candidate.packageIdentity.name
    && candidate.packageIdentity.version
    && candidate.packageIdentity.source
    && candidate.packageIdentity.packageManager
    && candidate.packageIdentity.packageIdentityRequired === true);
}

function isCandidateReady(candidate) {
  return hasCompleteIdentity(candidate)
    && hasCompletePackageIdentity(candidate)
    && candidate.license.permissive === true
    && candidate.provenance.repositoryRequired === true
    && candidate.provenance.registryIntegrityRequiredBeforePublish === true
    && candidate.selection.manualSelectionRequired === true
    && candidate.selection.selectedForExecution === false
    && candidate.selection.defaultEnabled === false
    && candidate.invocation.invocableInThisPhase === false
    && !hasUnsafeCapability(candidate)
    && candidate.boundaries.sourceExcerptPolicy === "none"
    && candidate.boundaries.sourcesContentPolicy === "none";
}

function normalizeCapabilities(capabilities) {
  return {
    draftText: capabilities?.draftText === true,
    reviewMetadata: capabilities?.reviewMetadata === true,
    sourceBodyInput: capabilities?.sourceBodyInput === true,
    targetRepositoryMutation: capabilities?.targetRepositoryMutation === true,
    toolExecution: capabilities?.toolExecution === true,
    workspaceWrite: capabilities?.workspaceWrite === true,
    networkAccess: capabilities?.networkAccess ?? "disabled"
  };
}

function normalizePolicies(policies) {
  return {
    allowSourceBody: policies?.allowSourceBody === true,
    allowTargetRepositoryMutation: policies?.allowTargetRepositoryMutation === true,
    allowToolExecution: policies?.allowToolExecution === true,
    allowWorkspaceWrite: policies?.allowWorkspaceWrite === true,
    requiresHumanReview: policies?.requiresHumanReview === true,
    sourceExcerptPolicy: policies?.sourceExcerptPolicy ?? "none",
    sourcesContentPolicy: policies?.sourcesContentPolicy ?? "none"
  };
}

function hasUnsafeCapability(candidate) {
  return candidate.capabilities.sourceBodyInput !== false
    || candidate.capabilities.targetRepositoryMutation !== false
    || candidate.capabilities.toolExecution !== false
    || candidate.capabilities.workspaceWrite !== false
    || candidate.capabilities.networkAccess !== "disabled"
    || candidate.policies.allowSourceBody !== false
    || candidate.policies.allowTargetRepositoryMutation !== false
    || candidate.policies.allowToolExecution !== false
    || candidate.policies.allowWorkspaceWrite !== false;
}

function provenanceStatus(entry) {
  if (entry.provenance?.trustedPublisherState === "required-before-registry-approval") {
    return "required-before-approval";
  }

  return typeof entry.provenance?.trustedPublisherState === "string" ? "recorded" : "missing";
}

function isAllowedLicense(expression) {
  if (typeof expression !== "string") {
    return false;
  }
  if (/(?:^|\W)(?:AGPL|GPL|LGPL|SSPL|BUSL|BSL)(?:\W|$)/iu.test(expression)) {
    return false;
  }
  return /^(?:MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC)(?:\s+(?:OR|AND)\s+(?:MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC))*$/u.test(expression);
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

function renderSelectionPacketMarkdown(evidence) {
  const { summary } = evidence;
  const lines = [
    "# W-P40 Remote Provider Candidate Selection Packet",
    "",
    `Status: \`${evidence.status}\``,
    `Candidates: ${summary.candidateCount}`,
    `Selected for execution: ${summary.selectedForExecutionCount}`,
    `Default enabled candidates: ${summary.defaultEnabledCandidateCount}`,
    `Invocable in this phase: ${summary.invocableCandidateCount}`,
    "",
    "| Candidate | Package | License | Provenance | Selection | Network |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const candidate of evidence.candidatePackets) {
    lines.push([
      candidate.providerId,
      `${candidate.packageIdentity.name}@${candidate.packageIdentity.version}`,
      candidate.license.expression,
      candidate.provenance.status,
      candidate.selection.status,
      candidate.capabilities.networkAccess
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  lines.push("");
  lines.push("This packet records provider candidate metadata only. It does not select a provider for execution, resolve secrets, call a network endpoint or grant write authority.");
  return `${lines.join("\n")}\n`;
}

function renderReviewChecklistMarkdown(evidence) {
  const confirmations = evidence.manualSelectionPacket.requiredConfirmations
    .map((item) => `- [ ] ${item}`)
    .join("\n");
  const candidateLines = evidence.candidatePackets
    .map((candidate) => `- [ ] ${candidate.providerId}: confirm ${candidate.packageIdentity.name}@${candidate.packageIdentity.version}, ${candidate.license.expression}, ${candidate.provenance.status}.`)
    .join("\n");

  return `# W-P40 Provider Candidate Review Checklist

This checklist is generated by \`wp40:provider-candidate-selection:evidence\`.

## Candidate Review

${candidateLines}

## Required Confirmations

${confirmations}

## Boundary

- [ ] The candidate remains unselected for execution.
- [ ] No credential value is resolved.
- [ ] No external network call is made.
- [ ] No source body or sourcesContent is included.
- [ ] Provider output remains review-only.
- [ ] Target repositories remain read-only.
`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
