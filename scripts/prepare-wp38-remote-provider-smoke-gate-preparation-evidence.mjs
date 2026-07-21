import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp38-remote-provider-smoke-gate-preparation");
const evidencePath = path.join(outputRoot, "evidence.json");
const manualChecklistPath = path.join(outputRoot, "manual-remote-provider-smoke-checklist.md");
const providerGovernanceCloseoutPath = path.join(rootDir, "dist", "wp36-closeout-checked-apply-inputs", "evidence.json");
const checkedApplyCloseoutPath = path.join(rootDir, "dist", "wp37-closeout-provider-remote-inputs", "evidence.json");
const sandboxRollbackPath = path.join(rootDir, "dist", "wp38-sandbox-rollback-restore-failure-path", "evidence.json");

await main();

/**
 * 准备 W-P38.4 remote/API provider smoke gate evidence。
 * Prepare W-P38.4 remote/API provider smoke gate evidence.
 *
 * This script intentionally does not call a real remote provider. It converts
 * W-P36 provider governance, W-P37 checked-apply closeout and W-P38 sandbox
 * rollback evidence into a smoke-gate contract so a later manual smoke can be
 * approved without changing the provider/write boundary.
 *
 * 中文：本脚本故意不调用真实 remote provider。它将 W-P36 provider governance、
 * W-P37 checked-apply closeout 与 W-P38 sandbox rollback 证据转化为 smoke gate
 * contract，方便后续人工批准真实 smoke 时不改变 provider/write 边界。
 *
 * @returns {Promise<void>} Writes public-safe evidence and a manual checklist under `dist/`.
 */
async function main() {
  const providerGovernanceCloseout = await readJson(providerGovernanceCloseoutPath);
  const checkedApplyCloseout = await readJson(checkedApplyCloseoutPath);
  const sandboxRollback = await readJson(sandboxRollbackPath);
  const gatePlan = createRemoteProviderSmokeGatePlan();
  const smokeScenarios = createSmokeScenarios();
  const manualApprovalGates = gatePlan.filter((gate) => gate.status === "manual-approval-required");
  const policyReadyGates = gatePlan.filter((gate) => gate.status === "policy-ready");
  const summary = {
    providerGovernanceCloseoutReady: providerGovernanceCloseout.status === "ready-for-wp37-checked-apply-continuation",
    providerGovernanceHardFailureCount: Number(providerGovernanceCloseout.summary?.hardFailureCount ?? -1),
    checkedApplyCloseoutReady: checkedApplyCloseout.status === "ready-for-next-cycle-host-apply-and-provider-remote-planning",
    checkedApplyHardFailureCount: Number(checkedApplyCloseout.summary?.hardFailureCount ?? -1),
    sandboxRollbackReady: sandboxRollback.status === "ready-for-remote-provider-smoke-gate-preparation",
    sandboxRollbackHardFailureCount: Number(sandboxRollback.summary?.hardFailureCount ?? -1),
    governanceGateCount: Number(providerGovernanceCloseout.summary?.governanceGateCount ?? 0),
    completedGovernanceGateCount: Number(providerGovernanceCloseout.summary?.completedGovernanceGateCount ?? 0),
    registryEntryCount: Number(providerGovernanceCloseout.summary?.registryEntryCount ?? 0),
    remoteProviderCount: Number(providerGovernanceCloseout.summary?.remoteProviderCount ?? 0),
    remoteInvocableBeforeGateCount: Number(providerGovernanceCloseout.summary?.remoteInvocableBeforeGateCount ?? -1),
    hostBoundaryCount: Number(providerGovernanceCloseout.summary?.hostBoundaryCount ?? 0),
    credentialReferenceCount: Number(providerGovernanceCloseout.summary?.secretReferenceCount ?? 0),
    directProviderNetworkAllowed: providerGovernanceCloseout.summary?.directProviderNetworkAllowed,
    hostMediatorRequired: providerGovernanceCloseout.summary?.hostMediatorRequired,
    consentRecordCount: Number(providerGovernanceCloseout.summary?.consentRecordCount ?? 0),
    externalNetworkCallExecutedInInputs: providerGovernanceCloseout.summary?.externalNetworkCallExecuted,
    defaultSourcePolicy: providerGovernanceCloseout.summary?.defaultSourceExcerptPolicy,
    sourceOptInRequired: providerGovernanceCloseout.summary?.optInRequired,
    evidenceMayContainExcerpt: providerGovernanceCloseout.summary?.evidenceMayContainExcerpt,
    providerResultMayContainExcerpt: providerGovernanceCloseout.summary?.providerResultMayContainExcerpt,
    safeInvocationRemoteProviderInvocationStatus: providerGovernanceCloseout.summary?.safeInvocationRemoteProviderInvocationStatus,
    checkedApplyForwardInputCount: Number(checkedApplyCloseout.summary?.forwardInputCount ?? 0),
    sandboxFailureScenarioCount: Number(sandboxRollback.summary?.failureScenarioCount ?? 0),
    sandboxRollbackRestoreExecutedCount: Number(sandboxRollback.summary?.rollbackRestoreExecutedCount ?? 0),
    sandboxWorkspaceApplyEditCallCount: Number(sandboxRollback.summary?.workspaceApplyEditCallCount ?? -1),
    sandboxWorkspaceWriteAllowedCount: Number(sandboxRollback.summary?.workspaceWriteAllowedCount ?? -1),
    sandboxTargetRepositoryMutationCount: Number(sandboxRollback.summary?.targetRepositoryMutationCount ?? -1),
    gatePlanCount: gatePlan.length,
    policyReadyGateCount: policyReadyGates.length,
    manualApprovalGateCount: manualApprovalGates.length,
    smokeScenarioCount: smokeScenarios.length,
    preparedSmokeScenarioCount: smokeScenarios.filter((scenario) => scenario.status === "prepared-not-executed").length,
    firstSmokeSourcePolicy: "none",
    credentialReferenceRequired: true,
    credentialMaterialIncludedInEvidence: false,
    credentialMaterialIncludedInRequest: false,
    destinationAllowlistRequired: true,
    httpsRequired: true,
    privateNetworkAllowed: false,
    hostNetworkMediatorRequired: true,
    providerConsentRequired: true,
    workspaceConsentRequired: true,
    requestConsentRequired: true,
    redactedAuditRequired: true,
    reviewOnlyOutputRequired: true,
    checkedApplySeparationRequired: true,
    providerRequestMayContainSourceBody: false,
    providerResultMayContainSourceBody: false,
    evidenceMayContainSourceBody: false,
    realRemoteProviderInvocationExecuted: false,
    externalNetworkCallExecuted: false,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ gatePlan, smokeScenarios }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ gatePlan, smokeScenarios }),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ gatePlan, smokeScenarios }),
    pathExposureCount: countPathExposure(JSON.stringify({ gatePlan, smokeScenarios })),
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false,
    actualRemoteProviderSmokeStillPending: true,
    realGuiManualEvidenceStillRequired: sandboxRollback.summary?.realGuiManualEvidenceStillRequired === true,
    targetBranchPrFlowStillRequired: true
  };
  const checks = [
    check("HIA_WP38_REMOTE_SMOKE_INPUTS_READY", summary.providerGovernanceCloseoutReady === true
      && summary.providerGovernanceHardFailureCount === 0
      && summary.checkedApplyCloseoutReady === true
      && summary.checkedApplyHardFailureCount === 0
      && summary.sandboxRollbackReady === true
      && summary.sandboxRollbackHardFailureCount === 0, {
      actual: {
        checkedApplyCloseoutStatus: checkedApplyCloseout.status,
        checkedApplyHardFailureCount: summary.checkedApplyHardFailureCount,
        providerGovernanceCloseoutStatus: providerGovernanceCloseout.status,
        providerGovernanceHardFailureCount: summary.providerGovernanceHardFailureCount,
        sandboxRollbackHardFailureCount: summary.sandboxRollbackHardFailureCount,
        sandboxRollbackStatus: sandboxRollback.status
      }
    }),
    check("HIA_WP38_REMOTE_SMOKE_PROVIDER_GOVERNANCE_RETAINED", summary.governanceGateCount >= 8
      && summary.completedGovernanceGateCount >= 8
      && summary.registryEntryCount >= 2
      && summary.remoteProviderCount >= 1
      && summary.remoteInvocableBeforeGateCount === 0
      && summary.hostBoundaryCount >= 4
      && summary.credentialReferenceCount >= 2, {
      actual: {
        completedGovernanceGateCount: summary.completedGovernanceGateCount,
        credentialReferenceCount: summary.credentialReferenceCount,
        governanceGateCount: summary.governanceGateCount,
        hostBoundaryCount: summary.hostBoundaryCount,
        registryEntryCount: summary.registryEntryCount,
        remoteInvocableBeforeGateCount: summary.remoteInvocableBeforeGateCount,
        remoteProviderCount: summary.remoteProviderCount
      }
    }),
    check("HIA_WP38_REMOTE_SMOKE_NETWORK_AND_CONSENT_READY", summary.directProviderNetworkAllowed === false
      && summary.hostMediatorRequired === true
      && summary.consentRecordCount >= 3
      && summary.externalNetworkCallExecutedInInputs === false
      && summary.destinationAllowlistRequired === true
      && summary.httpsRequired === true
      && summary.privateNetworkAllowed === false
      && summary.hostNetworkMediatorRequired === true
      && summary.providerConsentRequired === true
      && summary.workspaceConsentRequired === true
      && summary.requestConsentRequired === true, {
      actual: {
        consentRecordCount: summary.consentRecordCount,
        destinationAllowlistRequired: summary.destinationAllowlistRequired,
        directProviderNetworkAllowed: summary.directProviderNetworkAllowed,
        externalNetworkCallExecutedInInputs: summary.externalNetworkCallExecutedInInputs,
        hostMediatorRequired: summary.hostMediatorRequired,
        hostNetworkMediatorRequired: summary.hostNetworkMediatorRequired,
        httpsRequired: summary.httpsRequired,
        privateNetworkAllowed: summary.privateNetworkAllowed,
        providerConsentRequired: summary.providerConsentRequired,
        requestConsentRequired: summary.requestConsentRequired,
        workspaceConsentRequired: summary.workspaceConsentRequired
      }
    }),
    check("HIA_WP38_REMOTE_SMOKE_SOURCE_PRIVACY_DEFAULT_DENY", summary.defaultSourcePolicy === "none"
      && summary.sourceOptInRequired === true
      && summary.evidenceMayContainExcerpt === false
      && summary.providerResultMayContainExcerpt === false
      && summary.firstSmokeSourcePolicy === "none"
      && summary.providerRequestMayContainSourceBody === false
      && summary.providerResultMayContainSourceBody === false
      && summary.evidenceMayContainSourceBody === false
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false, {
      actual: {
        defaultSourcePolicy: summary.defaultSourcePolicy,
        evidenceMayContainExcerpt: summary.evidenceMayContainExcerpt,
        evidenceMayContainSourceBody: summary.evidenceMayContainSourceBody,
        firstSmokeSourcePolicy: summary.firstSmokeSourcePolicy,
        providerRequestMayContainSourceBody: summary.providerRequestMayContainSourceBody,
        providerResultMayContainExcerpt: summary.providerResultMayContainExcerpt,
        providerResultMayContainSourceBody: summary.providerResultMayContainSourceBody,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourceOptInRequired: summary.sourceOptInRequired,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP38_REMOTE_SMOKE_SANDBOX_AND_APPLY_SEPARATION_RETAINED", summary.sandboxFailureScenarioCount >= 3
      && summary.sandboxRollbackRestoreExecutedCount >= 1
      && summary.sandboxWorkspaceApplyEditCallCount === 0
      && summary.sandboxWorkspaceWriteAllowedCount === 0
      && summary.sandboxTargetRepositoryMutationCount === 0
      && summary.checkedApplySeparationRequired === true
      && summary.reviewOnlyOutputRequired === true, {
      actual: {
        checkedApplySeparationRequired: summary.checkedApplySeparationRequired,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        sandboxFailureScenarioCount: summary.sandboxFailureScenarioCount,
        sandboxRollbackRestoreExecutedCount: summary.sandboxRollbackRestoreExecutedCount,
        sandboxTargetRepositoryMutationCount: summary.sandboxTargetRepositoryMutationCount,
        sandboxWorkspaceApplyEditCallCount: summary.sandboxWorkspaceApplyEditCallCount,
        sandboxWorkspaceWriteAllowedCount: summary.sandboxWorkspaceWriteAllowedCount
      }
    }),
    check("HIA_WP38_REMOTE_SMOKE_GATE_PLAN_PREPARED", summary.gatePlanCount >= 12
      && summary.policyReadyGateCount >= 8
      && summary.manualApprovalGateCount >= 4
      && summary.smokeScenarioCount >= 3
      && summary.preparedSmokeScenarioCount === summary.smokeScenarioCount
      && summary.actualRemoteProviderSmokeStillPending === true, {
      actual: {
        actualRemoteProviderSmokeStillPending: summary.actualRemoteProviderSmokeStillPending,
        gatePlanCount: summary.gatePlanCount,
        manualApprovalGateCount: summary.manualApprovalGateCount,
        policyReadyGateCount: summary.policyReadyGateCount,
        preparedSmokeScenarioCount: summary.preparedSmokeScenarioCount,
        smokeScenarioCount: summary.smokeScenarioCount
      }
    }),
    check("HIA_WP38_REMOTE_SMOKE_NO_UNSAFE_EXECUTION", summary.safeInvocationRemoteProviderInvocationStatus === "blocked-before-real-remote-call"
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.credentialMaterialIncludedInEvidence === false
      && summary.credentialMaterialIncludedInRequest === false, {
      actual: {
        credentialMaterialIncludedInEvidence: summary.credentialMaterialIncludedInEvidence,
        credentialMaterialIncludedInRequest: summary.credentialMaterialIncludedInRequest,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        safeInvocationRemoteProviderInvocationStatus: summary.safeInvocationRemoteProviderInvocationStatus,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP38_REMOTE_SMOKE_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.pathExposureCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp38-remote-provider-smoke-gate-preparation-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-branch-pr-flow-contract" : "blocked",
    smokeGateStatus: "prepared-manual-approval-required",
    sourceEvidence: {
      providerGovernanceCloseout: normalizePath(providerGovernanceCloseoutPath),
      checkedApplyCloseout: normalizePath(checkedApplyCloseoutPath),
      sandboxRollbackRestoreFailurePath: normalizePath(sandboxRollbackPath)
    },
    providerPolicy: {
      providerRuntimeKind: "remote-api",
      invocationMode: "manual-smoke-gate-only",
      realInvocationExecuted: false,
      networkCallExecuted: false,
      requestSourcePolicy: "none",
      providerOutputPolicy: "review-payload-augmentation-only",
      checkedApplyOwnership: "host-owned-separate-contract",
      credentialStorage: "host-managed-reference-only",
      credentialMaterialInEvidenceAllowed: false,
      sourceBodyInEvidenceAllowed: false,
      sourcesContentPolicy: "none"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    gatePlan,
    smokeScenarios,
    checks,
    manualChecklist: normalizePath(manualChecklistPath),
    nextContractInputs: [
      {
        phase: "W-P38.5",
        topic: "target-branch-pr-flow-contract",
        reason: "Remote provider smoke gates are prepared, but actual target collaboration still needs branch/PR or sandbox flow before repository mutation is allowed."
      },
      {
        phase: "W-P38/manual",
        topic: "controlled-remote-provider-smoke",
        reason: "A real remote/API smoke can only run after explicit provider, workspace, request, destination and credential approval."
      },
      {
        phase: "W-P38.6",
        topic: "devtools-visual-studio-confirmation-parity",
        reason: "Checked apply confirmation and provider augmentation must remain host-owned across additional IDE shells."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P38 remote provider smoke gate preparation evidence");
  assert.equal(hardFailures.length, 0, `W-P38 remote provider smoke gate preparation evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(manualChecklistPath, createManualChecklist(gatePlan, smokeScenarios), "utf8");
  console.log(`W-P38 remote provider smoke gate preparation evidence prepared at ${normalizePath(evidencePath)}`);
}

function createRemoteProviderSmokeGatePlan() {
  return [
    {
      id: "remote-provider-registry-entry",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "provider-load",
      evidenceFrom: "W-P36.2",
      rule: "Remote provider must be explicitly selected from a registry entry with provenance and license metadata."
    },
    {
      id: "remote-provider-disabled-default",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "provider-load",
      evidenceFrom: "W-P36.2",
      rule: "Remote provider remains non-invocable until all smoke gates pass."
    },
    {
      id: "host-managed-credential-reference",
      owner: "hia-host",
      status: "manual-approval-required",
      requiredBefore: "request-build",
      evidenceFrom: "W-P36.3",
      rule: "Smoke request may reference a host credential slot, but credential material must never be serialized."
    },
    {
      id: "host-secret-lifecycle-audit",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "request-build",
      evidenceFrom: "W-P36.3",
      rule: "Credential create, rotate, use and revoke actions require redacted host audit metadata."
    },
    {
      id: "host-network-mediator",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "network-send",
      evidenceFrom: "W-P36.4",
      rule: "Provider adapters may not open direct network sockets; the host mediator owns outbound calls."
    },
    {
      id: "destination-allowlist",
      owner: "hia-host",
      status: "manual-approval-required",
      requiredBefore: "network-send",
      evidenceFrom: "W-P36.4",
      rule: "User must approve the remote provider endpoint and HTTPS-only destination policy."
    },
    {
      id: "provider-consent",
      owner: "human-user",
      status: "manual-approval-required",
      requiredBefore: "provider-invocation",
      evidenceFrom: "W-P36.4",
      rule: "User must approve the provider identity and runtime kind before the smoke."
    },
    {
      id: "workspace-consent",
      owner: "human-user",
      status: "manual-approval-required",
      requiredBefore: "provider-invocation",
      evidenceFrom: "W-P36.4",
      rule: "User must approve the current workspace scope before any remote provider request."
    },
    {
      id: "request-consent",
      owner: "human-user",
      status: "manual-approval-required",
      requiredBefore: "provider-invocation",
      evidenceFrom: "W-P36.4",
      rule: "User must approve the exact request summary and source policy for the smoke."
    },
    {
      id: "source-policy-default-none",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "request-build",
      evidenceFrom: "W-P36.5",
      rule: "First smoke uses source policy none; source excerpts remain opt-in only."
    },
    {
      id: "redacted-provider-audit",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "result-record",
      evidenceFrom: "W-P36.4/W-P36.6",
      rule: "Invocation audit records may keep provider, timing and status metadata only after redaction."
    },
    {
      id: "review-only-result",
      owner: "hia-provider-runner",
      status: "policy-ready",
      requiredBefore: "result-consumption",
      evidenceFrom: "W-P35.4/W-P36.6",
      rule: "Remote provider output can only become review payload augmentation."
    },
    {
      id: "checked-apply-separation",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "result-consumption",
      evidenceFrom: "W-P37/W-P38",
      rule: "Provider output cannot bypass host-owned checked apply confirmation, conflict checks or rollback gates."
    },
    {
      id: "target-mutation-block",
      owner: "hia-host",
      status: "policy-ready",
      requiredBefore: "result-consumption",
      evidenceFrom: "W-P38.1/W-P38.3",
      rule: "Remote provider smoke must not mutate target repositories."
    }
  ];
}

function createSmokeScenarios() {
  return [
    {
      id: "remote-provider-handshake",
      status: "prepared-not-executed",
      runtimeKind: "remote-api",
      sourcePolicy: "none",
      expectedResultScope: "provider-capability-and-health-metadata",
      reviewOnly: true,
      externalNetworkCallExecuted: false,
      targetRepositoryMutationAllowed: false
    },
    {
      id: "remote-provider-review-augmentation-empty-context",
      status: "prepared-not-executed",
      runtimeKind: "remote-api",
      sourcePolicy: "none",
      expectedResultScope: "review-payload-augmentation-without-source-body",
      reviewOnly: true,
      externalNetworkCallExecuted: false,
      targetRepositoryMutationAllowed: false
    },
    {
      id: "remote-provider-refusal-and-rate-limit-shape",
      status: "prepared-not-executed",
      runtimeKind: "remote-api",
      sourcePolicy: "none",
      expectedResultScope: "redacted-error-or-refusal-metadata",
      reviewOnly: true,
      externalNetworkCallExecuted: false,
      targetRepositoryMutationAllowed: false
    }
  ];
}

function createManualChecklist(gatePlan, smokeScenarios) {
  const gateLines = gatePlan.map((gate) => `- [ ] ${gate.id}: ${gate.rule}`).join("\n");
  const scenarioLines = smokeScenarios
    .map((scenario) => `- [ ] ${scenario.id}: ${scenario.expectedResultScope}; source policy ${scenario.sourcePolicy}.`)
    .join("\n");

  return `# W-P38.4 Manual Remote Provider Smoke Checklist

This checklist is generated by \`wp38:remote-provider-smoke-gate:evidence\`.

## Do Not Proceed Unless

- [ ] The user explicitly approves a real remote/API provider smoke.
- [ ] The provider is selected from an approved registry entry.
- [ ] Credential material is stored only in the host secret store and never pasted into evidence, logs, source files or request/result fixtures.
- [ ] The destination endpoint is HTTPS and explicitly allowed for this smoke.
- [ ] Source policy remains \`none\` for the first smoke unless a later stage explicitly approves bounded source excerpts.
- [ ] Provider output remains review-only and cannot become a direct editor operation.
- [ ] Target repositories remain read-only.

## Gates

${gateLines}

## Prepared Smoke Scenarios

${scenarioLines}
`;
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
      Object.hasOwn(node, "workspaceEdit")
      || Object.hasOwn(node, "documentChanges")
      || Object.hasOwn(node, "changes")
      || Object.hasOwn(node, "patch")
      || Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countForbiddenDocumentTextMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "sourceText")
      || Object.hasOwn(node, "sourceBody")
      || Object.hasOwn(node, "rawSource")
      || Object.hasOwn(node, "sourceExcerpt")
      || Object.hasOwn(node, "documentText")
      || Object.hasOwn(node, "documentContent")
      || Object.hasOwn(node, "sourcesContent")
    ) {
      count += 1;
    }
  });
  return count;
}

function countCredentialMaterialMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (
      Object.hasOwn(node, "secretValue")
      || Object.hasOwn(node, "apiKeyValue")
      || Object.hasOwn(node, "tokenValue")
      || Object.hasOwn(node, "password")
      || Object.hasOwn(node, "authorizationHeader")
    ) {
      count += 1;
    }
  });
  return count;
}

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]/u.test(serialized) || serialized.includes("file://") ? 1 : 0;
}

function walkJson(value, visitor, seen = new Set()) {
  visitor(value);

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }

    seen.add(value);
    for (const item of value) {
      walkJson(item, visitor, seen);
    }
    seen.delete(value);
    return;
  }

  if (!isRecord(value) || seen.has(value)) {
    return;
  }

  seen.add(value);
  for (const item of Object.values(value)) {
    walkJson(item, visitor, seen);
  }
  seen.delete(value);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/(?:^|[\s"'({\[])[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
  assert(!/(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u.test(serialized), `${label} must not include token-looking values.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
