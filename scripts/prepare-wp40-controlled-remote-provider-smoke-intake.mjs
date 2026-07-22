import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp40-controlled-remote-provider-smoke-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const safetyEnvelopePath = path.join(outputRoot, "controlled-smoke-safety-envelope.md");
const manualApprovalRoutePath = path.join(outputRoot, "manual-approval-route.md");
const inputDefinitions = [
  {
    id: "wp39-closeout-wp40-inputs",
    path: path.join(rootDir, "dist", "wp39-closeout-wp40-inputs", "evidence.json"),
    expectedStatus: "ready-for-wp40-controlled-remote-provider-smoke-inputs"
  },
  {
    id: "remote-provider-smoke-gate-preparation",
    path: path.join(rootDir, "dist", "wp38-remote-provider-smoke-gate-preparation", "evidence.json"),
    expectedStatus: "ready-for-target-branch-pr-flow-contract"
  },
  {
    id: "provider-governance-closeout",
    path: path.join(rootDir, "dist", "wp36-closeout-checked-apply-inputs", "evidence.json"),
    expectedStatus: "ready-for-wp37-checked-apply-continuation"
  },
  {
    id: "provider-registry-installation-policy",
    path: path.join(rootDir, "dist", "wp36-provider-registry-installation-policy", "evidence.json"),
    expectedStatus: "ready-for-secret-storage-boundary"
  },
  {
    id: "secret-storage-boundary",
    path: path.join(rootDir, "dist", "wp36-secret-storage-boundary", "evidence.json"),
    expectedStatus: "ready-for-network-mediation-and-consent"
  },
  {
    id: "network-mediation-consent",
    path: path.join(rootDir, "dist", "wp36-network-mediation-consent", "evidence.json"),
    expectedStatus: "ready-for-source-excerpt-opt-in-and-privacy-gate"
  },
  {
    id: "source-excerpt-privacy-gate",
    path: path.join(rootDir, "dist", "wp36-source-excerpt-privacy-gate", "evidence.json"),
    expectedStatus: "ready-for-safe-invocation-dry-run"
  },
  {
    id: "safe-invocation-dry-run",
    path: path.join(rootDir, "dist", "wp36-safe-invocation-dry-run", "evidence.json"),
    expectedStatus: "ready-for-wp36-closeout-and-checked-apply-inputs"
  }
];

await main();

/**
 * 准备 W-P40.1 controlled remote provider smoke intake evidence。
 * Prepare W-P40.1 controlled remote provider smoke intake evidence.
 *
 * This script creates the first W-P40 safety envelope from existing W-P36,
 * W-P38 and W-P39 evidence. It intentionally stops before real provider
 * selection, credential resolution, network execution, target mutation or
 * checked apply.
 *
 * 中文：本脚本从既有 W-P36、W-P38 和 W-P39 证据生成 W-P40 第一份安全信封。
 * 它故意停在真实 provider 选择、credential resolution、网络执行、目标仓库变更
 * 和 checked apply 之前。
 *
 * @returns {Promise<void>} Writes public-safe intake evidence and manual-route docs.
 */
async function main() {
  const inputReports = await Promise.all(inputDefinitions.map(readInputReport));
  const inputs = Object.fromEntries(inputReports.map((report) => [report.id, report.evidence]));
  const wp39Closeout = inputs["wp39-closeout-wp40-inputs"];
  const remoteGate = inputs["remote-provider-smoke-gate-preparation"];
  const providerGovernance = inputs["provider-governance-closeout"];
  const providerRegistry = inputs["provider-registry-installation-policy"];
  const secretStorage = inputs["secret-storage-boundary"];
  const networkConsent = inputs["network-mediation-consent"];
  const sourcePrivacy = inputs["source-excerpt-privacy-gate"];
  const safeInvocation = inputs["safe-invocation-dry-run"];
  const remoteProviderCandidates = createRemoteProviderCandidates(providerRegistry);
  const safetyEnvelope = createSafetyEnvelope({
    networkConsent,
    providerRegistry,
    remoteGate,
    secretStorage,
    sourcePrivacy,
    wp39Closeout
  });
  const manualApprovalRoute = createManualApprovalRoute({ networkConsent, remoteGate, secretStorage, sourcePrivacy });
  const smokeScenarioIntake = createSmokeScenarioIntake(remoteGate);
  const summary = summarize({
    inputReports,
    manualApprovalRoute,
    providerGovernance,
    remoteGate,
    remoteProviderCandidates,
    safeInvocation,
    safetyEnvelope,
    smokeScenarioIntake,
    wp39Closeout
  });
  const checks = [
    check("HIA_WP40_INTAKE_INPUTS_READY", summary.evidenceInputCount === summary.readyEvidenceInputCount
      && summary.inputHardFailureCount === 0
      && summary.wp39CloseoutReady === true
      && summary.remoteSmokeGatePrepared === true, {
      actual: inputReports.map(({ expectedStatus, hardFailureCount, id, status }) => ({
        expectedStatus,
        hardFailureCount,
        id,
        status
      }))
    }),
    check("HIA_WP40_INTAKE_PROVIDER_CANDIDATE_CONTROLLED", summary.remoteProviderCandidateCount >= 1
      && summary.remoteProviderSelectedForExecutionCount === 0
      && summary.remoteInvocableBeforeGateCount === 0
      && summary.explicitProviderSelectionRequired === true
      && summary.registryDefaultProviderEnabled === false, {
      actual: {
        explicitProviderSelectionRequired: summary.explicitProviderSelectionRequired,
        registryDefaultProviderEnabled: summary.registryDefaultProviderEnabled,
        remoteInvocableBeforeGateCount: summary.remoteInvocableBeforeGateCount,
        remoteProviderCandidateCount: summary.remoteProviderCandidateCount,
        remoteProviderSelectedForExecutionCount: summary.remoteProviderSelectedForExecutionCount
      }
    }),
    check("HIA_WP40_INTAKE_MANUAL_APPROVAL_ROUTE_READY", summary.manualApprovalStepCount >= 7
      && summary.manualApprovalRequiredBeforeNetwork === true
      && summary.remoteGatePlanCount >= 14
      && summary.remoteManualApprovalGateCount >= 5
      && summary.smokeScenarioCount >= 3
      && summary.preparedSmokeScenarioCount === summary.smokeScenarioCount, {
      actual: {
        manualApprovalRequiredBeforeNetwork: summary.manualApprovalRequiredBeforeNetwork,
        manualApprovalStepCount: summary.manualApprovalStepCount,
        preparedSmokeScenarioCount: summary.preparedSmokeScenarioCount,
        remoteGatePlanCount: summary.remoteGatePlanCount,
        remoteManualApprovalGateCount: summary.remoteManualApprovalGateCount,
        smokeScenarioCount: summary.smokeScenarioCount
      }
    }),
    check("HIA_WP40_INTAKE_SECRET_AND_NETWORK_GATE_RETAINED", summary.hostManagedSecretReferenceCount >= 2
      && summary.credentialMaterialIncludedCount === 0
      && summary.directProviderNetworkAllowed === false
      && summary.hostMediatorRequired === true
      && summary.destinationAllowlistRequired === true
      && summary.httpsRequired === true
      && summary.privateNetworkAllowed === false
      && summary.consentRecordCount >= 3, {
      actual: {
        consentRecordCount: summary.consentRecordCount,
        credentialMaterialIncludedCount: summary.credentialMaterialIncludedCount,
        destinationAllowlistRequired: summary.destinationAllowlistRequired,
        directProviderNetworkAllowed: summary.directProviderNetworkAllowed,
        hostManagedSecretReferenceCount: summary.hostManagedSecretReferenceCount,
        hostMediatorRequired: summary.hostMediatorRequired,
        httpsRequired: summary.httpsRequired,
        privateNetworkAllowed: summary.privateNetworkAllowed
      }
    }),
    check("HIA_WP40_INTAKE_SOURCE_PRIVACY_DEFAULT_DENY", summary.sourceExcerptPolicy === "none"
      && summary.sourceOptInRequired === true
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.providerRequestMayContainSourceBody === false
      && summary.providerResultMayContainSourceBody === false
      && summary.evidenceMayContainSourceBody === false, {
      actual: {
        evidenceMayContainSourceBody: summary.evidenceMayContainSourceBody,
        providerRequestMayContainSourceBody: summary.providerRequestMayContainSourceBody,
        providerResultMayContainSourceBody: summary.providerResultMayContainSourceBody,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourceExcerptPolicy: summary.sourceExcerptPolicy,
        sourceOptInRequired: summary.sourceOptInRequired,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP40_INTAKE_NO_REMOTE_OR_TARGET_SIDE_EFFECTS", summary.realRemoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestCreated === false
      && summary.actualTargetSandboxCreated === false, {
      actual: {
        actualPullRequestCreated: summary.actualPullRequestCreated,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount
      }
    }),
    check("HIA_WP40_INTAKE_REVIEW_ONLY_NO_WRITE_AUTHORITY", summary.reviewOnlyOutputRequired === true
      && summary.checkedApplySeparationRequired === true
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.providerOwnedApplyAllowedCount === 0
      && summary.lspServerOwnedApplyAllowedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplySeparationRequired: summary.checkedApplySeparationRequired,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyAllowedCount: summary.lspServerOwnedApplyAllowedCount,
        providerOwnedApplyAllowedCount: summary.providerOwnedApplyAllowedCount,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        targetRepositoryMutationAllowedCount: summary.targetRepositoryMutationAllowedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP40_INTAKE_PRIVACY_CLEAN", summary.privacyCleanInputCount === summary.evidenceInputCount
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.pathExposureCount === 0
      && summary.sourcesContentPolicyNoneCount >= 6, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        privacyCleanInputCount: summary.privacyCleanInputCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourcesContentPolicyNoneCount: summary.sourcesContentPolicyNoneCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp40-controlled-remote-provider-smoke-intake-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp40-provider-selection-and-manual-approval-route" : "blocked",
    sourceEvidence: Object.fromEntries(inputReports.map((report) => [report.id, normalizePath(report.path)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    evidenceInputs: inputReports.map(({ contract, contractVersion, expectedStatus, hardFailureCount, id, status }) => ({
      contract,
      contractVersion,
      expectedStatus,
      hardFailureCount,
      id,
      status
    })),
    remoteProviderCandidates,
    safetyEnvelope,
    manualApprovalRoute,
    smokeScenarioIntake,
    generatedDocs: {
      safetyEnvelope: normalizePath(safetyEnvelopePath),
      manualApprovalRoute: normalizePath(manualApprovalRoutePath)
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P40.2",
        topic: "remote-provider-candidate-selection-packet",
        status: "ready-input",
        reason: "W-P40.2 can prepare provider selection and package/provenance checks without resolving credentials or making network calls."
      },
      {
        phase: "W-P40.3",
        topic: "secret-reference-and-network-consent-packet",
        status: "ready-input",
        reason: "W-P40.3 can prepare host-managed secret reference and consent artifacts, still without serializing credential values."
      },
      {
        phase: "W-P40.5",
        topic: "real-remote-provider-smoke-execution-gate",
        status: "manual-approval-required",
        reason: "A real remote provider smoke requires explicit user approval before any external network execution."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P40 controlled remote provider smoke intake evidence");
  assert.equal(hardFailures.length, 0, `W-P40 controlled remote provider smoke intake has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(safetyEnvelopePath, renderSafetyEnvelopeMarkdown(evidence), "utf8");
  await writeFile(manualApprovalRoutePath, renderManualApprovalRouteMarkdown(evidence), "utf8");
  console.log(`W-P40 controlled remote provider smoke intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P40 safety envelope prepared at ${normalizePath(safetyEnvelopePath)}`);
  console.log(`W-P40 manual approval route prepared at ${normalizePath(manualApprovalRoutePath)}`);
}

async function readInputReport(inputDefinition) {
  const evidence = JSON.parse(await readFile(inputDefinition.path, "utf8"));
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  return {
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    evidence,
    expectedStatus: inputDefinition.expectedStatus,
    hardFailureCount: Number(evidence.summary?.hardFailureCount ?? checks.filter((item) => item.status === "fail").length),
    id: inputDefinition.id,
    path: inputDefinition.path,
    status: evidence.status
  };
}

function createRemoteProviderCandidates(providerRegistry) {
  const registryEntries = Array.isArray(providerRegistry.registryEntries) ? providerRegistry.registryEntries : [];
  return registryEntries
    .filter((entry) => entry.runtimeKind === "remote-api")
    .map((entry) => ({
      providerId: entry.id,
      displayName: entry.displayName,
      runtimeKind: entry.runtimeKind,
      registryStatus: entry.install?.status,
      invocationStatus: entry.invocation?.status,
      selectedForExecution: false,
      requiresExplicitUserSelection: true,
      requiresHostManagedCredential: true,
      requiresNetworkConsent: true,
      sourceExcerptPolicy: entry.policies?.sourceExcerptPolicy ?? "none",
      providerOutputPolicy: "review-payload-augmentation-only",
      writeAuthority: noWriteAuthority()
    }));
}

function createSafetyEnvelope({
  networkConsent,
  providerRegistry,
  remoteGate,
  secretStorage,
  sourcePrivacy,
  wp39Closeout
}) {
  return {
    contract: "hia-wp40-controlled-remote-provider-smoke-safety-envelope",
    contractVersion: "0.1.0-draft",
    phase: "W-P40.1",
    cycleGroupId: wp39Closeout.summary?.cycleGroupId,
    routeStatus: "prepared-manual-approval-route",
    providerSelection: {
      required: true,
      selectedProviderId: null,
      defaultProviderEnabled: providerRegistry.summary?.defaultProviderEnabled === true,
      remoteProviderCount: Number(providerRegistry.summary?.remoteProviderCount ?? 0)
    },
    credentialBoundary: {
      secretReferenceCount: Number(secretStorage.summary?.secretReferenceCount ?? 0),
      valueMaterialAllowedInEvidence: false,
      valueMaterialAllowedInRequest: false,
      storeBinding: "host-managed-secret-store"
    },
    networkBoundary: {
      directProviderNetworkAllowed: networkConsent.summary?.directProviderNetworkAllowed === true,
      hostMediatorRequired: networkConsent.summary?.hostMediatorRequired === true,
      destinationAllowlistRequired: networkConsent.summary?.destinationAllowlistRequired === true,
      httpsRequired: networkConsent.summary?.httpsRequired === true,
      privateNetworkAllowed: networkConsent.summary?.privateNetworkAllowed === true,
      realNetworkExecutionAllowedInThisPhase: false
    },
    sourcePrivacy: {
      sourceExcerptPolicy: sourcePrivacy.summary?.defaultSourceExcerptPolicy ?? "none",
      optInRequired: sourcePrivacy.summary?.optInRequired === true,
      sourcesContentPolicy: "none",
      sourceBodyAllowedInEvidence: false,
      sourceBodyAllowedInProviderRequest: false,
      sourceBodyAllowedInProviderResult: false
    },
    outputBoundary: {
      providerOutputPolicy: "review-payload-augmentation-only",
      reviewOnlyOutputRequired: remoteGate.summary?.reviewOnlyOutputRequired === true,
      checkedApplySeparationRequired: remoteGate.summary?.checkedApplySeparationRequired === true,
      writeAuthority: noWriteAuthority()
    },
    targetBoundary: {
      hiaOwnedTargetRepositoryMutationAllowed: false,
      targetOwnerActionRequiredForWrite: true,
      actualBranchPrOrSandboxCreationAllowedInThisPhase: false
    }
  };
}

function createManualApprovalRoute({ networkConsent, remoteGate, secretStorage, sourcePrivacy }) {
  return [
    {
      id: "select-remote-provider-candidate",
      status: "manual-required",
      requiredBefore: "provider-load",
      evidenceSource: "W-P36.2",
      grantsNetwork: false
    },
    {
      id: "confirm-provider-package-provenance",
      status: "manual-required",
      requiredBefore: "provider-load",
      evidenceSource: "W-P36.2",
      grantsNetwork: false
    },
    {
      id: "bind-host-managed-secret-reference",
      status: "manual-required",
      requiredBefore: "request-build",
      evidenceSource: "W-P36.3",
      secretReferenceCount: Number(secretStorage.summary?.secretReferenceCount ?? 0),
      grantsNetwork: false
    },
    {
      id: "approve-provider-consent",
      status: networkConsent.summary?.providerConsentRequired === true ? "manual-required" : "missing",
      requiredBefore: "network-send",
      evidenceSource: "W-P36.4",
      grantsNetwork: false
    },
    {
      id: "approve-workspace-consent",
      status: networkConsent.summary?.workspaceConsentRequired === true ? "manual-required" : "missing",
      requiredBefore: "network-send",
      evidenceSource: "W-P36.4",
      grantsNetwork: false
    },
    {
      id: "approve-request-consent-and-destination",
      status: networkConsent.summary?.requestConsentRequired === true ? "manual-required" : "missing",
      requiredBefore: "network-send",
      evidenceSource: "W-P36.4",
      destinationAllowlistRequired: networkConsent.summary?.destinationAllowlistRequired === true,
      grantsNetwork: false
    },
    {
      id: "confirm-source-privacy-policy",
      status: sourcePrivacy.summary?.defaultSourceExcerptPolicy === "none" ? "ready-default-none" : "manual-required",
      requiredBefore: "request-build",
      evidenceSource: "W-P36.5",
      sourceExcerptPolicy: sourcePrivacy.summary?.defaultSourceExcerptPolicy ?? "none",
      grantsNetwork: false
    },
    {
      id: "confirm-review-only-output",
      status: remoteGate.summary?.reviewOnlyOutputRequired === true ? "policy-ready" : "missing",
      requiredBefore: "provider-result-consume",
      evidenceSource: "W-P38.4",
      grantsNetwork: false
    },
    {
      id: "final-explicit-network-approval",
      status: "manual-required-before-real-network",
      requiredBefore: "network-send",
      evidenceSource: "W-P40",
      grantsNetwork: true
    }
  ];
}

function createSmokeScenarioIntake(remoteGate) {
  const scenarios = Array.isArray(remoteGate.smokeScenarios) ? remoteGate.smokeScenarios : [];
  return scenarios.map((scenario) => ({
    id: scenario.id,
    sourceStatus: scenario.status,
    intakeStatus: "queued-for-manual-approval-route",
    runtimeKind: scenario.runtimeKind,
    sourcePolicy: scenario.sourcePolicy,
    expectedResultScope: scenario.expectedResultScope,
    reviewOnly: scenario.reviewOnly === true,
    realRemoteProviderInvocationExecuted: false,
    externalNetworkCallExecuted: false,
    targetRepositoryMutationAllowed: false,
    writeAuthority: noWriteAuthority()
  }));
}

function summarize({
  inputReports,
  manualApprovalRoute,
  providerGovernance,
  remoteGate,
  remoteProviderCandidates,
  safeInvocation,
  safetyEnvelope,
  smokeScenarioIntake,
  wp39Closeout
}) {
  return {
    evidenceInputCount: inputReports.length,
    readyEvidenceInputCount: inputReports.filter((report) => report.status === report.expectedStatus).length,
    inputHardFailureCount: inputReports.reduce((total, report) => total + report.hardFailureCount, 0),
    wp39CloseoutReady: wp39Closeout.status === "ready-for-wp40-controlled-remote-provider-smoke-inputs",
    cycleGroupId: wp39Closeout.summary?.cycleGroupId,
    w40StartupInputCount: Number(wp39Closeout.summary?.w40StartupInputCount ?? 0),
    remoteSmokeGatePrepared: remoteGate.smokeGateStatus === "prepared-manual-approval-required",
    remoteGatePlanCount: Number(remoteGate.summary?.gatePlanCount ?? 0),
    remoteManualApprovalGateCount: Number(remoteGate.summary?.manualApprovalGateCount ?? 0),
    remoteProviderCandidateCount: remoteProviderCandidates.length,
    remoteProviderSelectedForExecutionCount: remoteProviderCandidates.filter((candidate) => candidate.selectedForExecution === true).length,
    remoteInvocableBeforeGateCount: Number(providerGovernance.summary?.remoteInvocableBeforeGateCount ?? 0),
    explicitProviderSelectionRequired: safetyEnvelope.providerSelection.required === true,
    registryDefaultProviderEnabled: safetyEnvelope.providerSelection.defaultProviderEnabled === true,
    hostManagedSecretReferenceCount: safetyEnvelope.credentialBoundary.secretReferenceCount,
    credentialMaterialIncludedCount: countTrue([
      safetyEnvelope.credentialBoundary.valueMaterialAllowedInEvidence,
      safetyEnvelope.credentialBoundary.valueMaterialAllowedInRequest,
      remoteGate.summary?.credentialMaterialIncludedInEvidence,
      remoteGate.summary?.credentialMaterialIncludedInRequest
    ]),
    directProviderNetworkAllowed: safetyEnvelope.networkBoundary.directProviderNetworkAllowed,
    hostMediatorRequired: safetyEnvelope.networkBoundary.hostMediatorRequired,
    destinationAllowlistRequired: safetyEnvelope.networkBoundary.destinationAllowlistRequired,
    httpsRequired: safetyEnvelope.networkBoundary.httpsRequired,
    privateNetworkAllowed: safetyEnvelope.networkBoundary.privateNetworkAllowed,
    consentRecordCount: Number(providerGovernance.summary?.consentRecordCount ?? 0),
    manualApprovalStepCount: manualApprovalRoute.length,
    manualApprovalRequiredBeforeNetwork: manualApprovalRoute.some((step) => step.status === "manual-required-before-real-network"),
    smokeScenarioCount: smokeScenarioIntake.length,
    preparedSmokeScenarioCount: smokeScenarioIntake.filter((scenario) => scenario.sourceStatus === "prepared-not-executed").length,
    sourceExcerptPolicy: safetyEnvelope.sourcePrivacy.sourceExcerptPolicy,
    sourceOptInRequired: safetyEnvelope.sourcePrivacy.optInRequired,
    sourcesContentPolicy: safetyEnvelope.sourcePrivacy.sourcesContentPolicy,
    providerRequestMayContainSourceBody: safetyEnvelope.sourcePrivacy.sourceBodyAllowedInProviderRequest,
    providerResultMayContainSourceBody: safetyEnvelope.sourcePrivacy.sourceBodyAllowedInProviderResult,
    evidenceMayContainSourceBody: safetyEnvelope.sourcePrivacy.sourceBodyAllowedInEvidence,
    realRemoteProviderInvocationExecuted: remoteGate.summary?.realRemoteProviderInvocationExecuted === true
      || safeInvocation.summary?.remoteProviderInvocationStatus !== "blocked-before-real-remote-call",
    externalNetworkCallExecuted: remoteGate.summary?.externalNetworkCallExecuted === true
      || safeInvocation.summary?.externalNetworkCallExecuted === true,
    actualTargetBranchCreated: wp39Closeout.summary?.actualTargetBranchCreated === true,
    actualPullRequestCreated: wp39Closeout.summary?.actualPullRequestCreated === true,
    actualTargetSandboxCreated: wp39Closeout.summary?.actualTargetSandboxCreated === true,
    targetRepositoryMutationCount: sum([
      wp39Closeout.summary?.targetRepositoryMutationCount,
      remoteGate.summary?.targetRepositoryMutationCount,
      providerGovernance.summary?.targetRepositoryMutationCount
    ]),
    targetRepositoryWriteAttemptedCount: Number(remoteGate.summary?.targetRepositoryWriteAttemptedCount ?? 0),
    reviewOnlyOutputRequired: safetyEnvelope.outputBoundary.reviewOnlyOutputRequired,
    checkedApplySeparationRequired: safetyEnvelope.outputBoundary.checkedApplySeparationRequired,
    workspaceWriteAllowedCount: countWriteAuthority(safetyEnvelope, smokeScenarioIntake, "workspaceWriteAllowed")
      + sum(inputReports.map((report) => report.evidence.summary?.workspaceWriteAllowedCount)),
    targetRepositoryMutationAllowedCount: countWriteAuthority(safetyEnvelope, smokeScenarioIntake, "targetRepositoryMutationAllowed")
      + sum([
        wp39Closeout.summary?.targetRepositoryMutationAllowedCount,
        remoteGate.summary?.targetRepositoryMutationAllowedCount
      ]),
    providerOwnedApplyAllowedCount: countWriteAuthority(safetyEnvelope, smokeScenarioIntake, "providerOwnedApplyAllowed")
      + Number(wp39Closeout.summary?.providerOwnedApplyAllowedCount ?? 0),
    lspServerOwnedApplyAllowedCount: countWriteAuthority(safetyEnvelope, smokeScenarioIntake, "lspServerOwnedApplyAllowed")
      + Number(wp39Closeout.summary?.lspServerOwnedApplyAllowedCount ?? 0),
    directApplyAllowedCount: Number(wp39Closeout.summary?.directApplyAllowedCount ?? 0)
      + Number(remoteGate.summary?.directApplyAllowedCount ?? 0),
    directEditObjectCount: sum(inputReports.map((report) => report.evidence.summary?.directEditObjectCount))
      + countDirectEditObjects({ manualApprovalRoute, remoteProviderCandidates, safetyEnvelope, smokeScenarioIntake }),
    privacyCleanInputCount: inputReports.filter((report) => inputPrivacyClean(report.evidence.summary)).length,
    sourceBodyIncludedInEvidenceCount: inputReports.reduce((total, report) => total + sourceBodyCount(report.evidence.summary), 0)
      + countTrue([safetyEnvelope.sourcePrivacy.sourceBodyAllowedInEvidence]),
    credentialMaterialMarkerCount: Number(remoteGate.summary?.credentialMaterialMarkerCount ?? 0)
      + countCredentialMaterialMarkers({ manualApprovalRoute, remoteProviderCandidates, safetyEnvelope, smokeScenarioIntake }),
    pathExposureCount: inputReports.reduce((total, report) => total + Number(report.evidence.summary?.pathExposureCount ?? 0), 0)
      + countPathExposureValues({ manualApprovalRoute, remoteProviderCandidates, safetyEnvelope, smokeScenarioIntake }),
    sourcesContentPolicyNoneCount: inputReports.filter((report) => policyIsNone(report.evidence.summary)).length
  };
}

function inputPrivacyClean(summary) {
  return sourceBodyCount(summary) === 0
    && Number(summary?.pathExposureCount ?? 0) === 0
    && sourcePolicyIsAbsentOrNone(summary);
}

function sourceBodyCount(summary) {
  if (typeof summary?.sourceBodyIncludedInEvidenceCount === "number") {
    return summary.sourceBodyIncludedInEvidenceCount;
  }

  return summary?.sourceBodyIncludedInEvidence === true || summary?.includesSourceBody === true ? 1 : 0;
}

function policyIsNone(summary) {
  return summary?.sourcesContentPolicy === "none"
    || summary?.sourceExcerptPolicy === "none"
    || summary?.sourceExcerptDefault === "none"
    || summary?.defaultSourceExcerptPolicy === "none"
    || summary?.defaultSourcePolicy === "none"
    || summary?.firstSmokeSourcePolicy === "none"
    || Number(summary?.sourcesContentPolicyNoneCount ?? 0) > 0;
}

function sourcePolicyIsAbsentOrNone(summary) {
  const policyFields = [
    summary?.sourcesContentPolicy,
    summary?.sourceExcerptPolicy,
    summary?.sourceExcerptDefault,
    summary?.defaultSourceExcerptPolicy,
    summary?.defaultSourcePolicy,
    summary?.firstSmokeSourcePolicy
  ].filter((value) => value !== undefined && value !== null);

  return policyFields.length === 0 || policyIsNone(summary);
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

function countWriteAuthority(safetyEnvelope, scenarios, field) {
  const values = [
    safetyEnvelope.outputBoundary.writeAuthority?.[field],
    ...scenarios.map((scenario) => scenario.writeAuthority?.[field])
  ];
  return countTrue(values);
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function countTrue(values) {
  return values.filter((value) => value === true).length;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function countDirectEditObjects(value) {
  return countMatchingKeys(value, /^(workspaceEdit|documentChanges|changes|patch|edits)$/u)
    + countMatchingValues(value, /TextEdit\[/iu);
}

function countCredentialMaterialMarkers(value) {
  return countMatchingKeys(value, /^(secretValue|apiKeyValue|tokenValue|password|authorizationHeader)$/u);
}

function countPathExposureValues(value) {
  return countMatchingValues(value, /[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u);
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

  if (value && typeof value === "object") {
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

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//u, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /work-zone/u, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent":/u, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u, `${label} must not include token-looking values.`);
}

function renderSafetyEnvelopeMarkdown(evidence) {
  const { safetyEnvelope, summary } = evidence;
  const lines = [
    "# W-P40 Controlled Remote Provider Smoke Safety Envelope",
    "",
    `Status: \`${evidence.status}\``,
    `Route status: \`${safetyEnvelope.routeStatus}\``,
    `Remote provider candidates: ${summary.remoteProviderCandidateCount}`,
    `Selected for execution: ${summary.remoteProviderSelectedForExecutionCount}`,
    `Real remote invocation executed: ${summary.realRemoteProviderInvocationExecuted}`,
    `External network call executed: ${summary.externalNetworkCallExecuted}`,
    "",
    "## Boundaries",
    "",
    `- Provider selection required: ${safetyEnvelope.providerSelection.required}`,
    `- Host-managed secret references: ${safetyEnvelope.credentialBoundary.secretReferenceCount}`,
    `- Host mediator required: ${safetyEnvelope.networkBoundary.hostMediatorRequired}`,
    `- Source excerpt policy: \`${safetyEnvelope.sourcePrivacy.sourceExcerptPolicy}\``,
    `- Provider output policy: \`${safetyEnvelope.outputBoundary.providerOutputPolicy}\``,
    `- Target mutation allowed: ${safetyEnvelope.targetBoundary.hiaOwnedTargetRepositoryMutationAllowed}`,
    "",
    "This envelope prepares W-P40 only. It does not select a real provider, resolve credential values, execute network calls, create target branches or apply edits."
  ];
  return `${lines.join("\n")}\n`;
}

function renderManualApprovalRouteMarkdown(evidence) {
  const lines = [
    "# W-P40 Manual Approval Route",
    "",
    "W-P40 may continue through prepared/manual approval steps without network execution. The final network approval remains a separate user-confirmed action.",
    "",
    "| Step | Status | Required Before | Grants Network |",
    "| --- | --- | --- | --- |"
  ];

  for (const step of evidence.manualApprovalRoute) {
    lines.push(`| ${step.id} | \`${step.status}\` | ${step.requiredBefore} | ${step.grantsNetwork} |`);
  }

  lines.push("");
  lines.push("A later real smoke may proceed only after provider selection, host-managed secret reference binding, provider/workspace/request consent, destination allowlist confirmation, source privacy confirmation and final explicit network approval.");
  return `${lines.join("\n")}\n`;
}
