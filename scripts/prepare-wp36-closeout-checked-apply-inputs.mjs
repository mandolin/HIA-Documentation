import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp36-closeout-checked-apply-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputDefinitions = [
  {
    id: "wp35-closeout",
    path: path.join(rootDir, "dist", "wp35-closeout-checked-apply-inputs", "evidence.json"),
    expectedStatus: "ready-for-wp36-real-provider-governance-or-checked-apply-planning"
  },
  {
    id: "provider-governance-baseline",
    path: path.join(rootDir, "dist", "wp36-real-provider-governance-audit", "evidence.json"),
    expectedStatus: "ready-for-provider-registry-installation-policy"
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
 * 准备 W-P36.7 real-provider governance closeout evidence。
 * Prepare W-P36.7 real-provider governance closeout evidence.
 *
 * This closeout summarizes the provider registry, secret, network, source
 * privacy and safe-invocation gates, then converts them into W-P37 checked
 * apply inputs. It does not enable real remote provider calls or source writes.
 *
 * 本 closeout 汇总 provider registry、secret、network、source privacy 与 safe
 * invocation gates，并将其转化为 W-P37 checked apply 输入。本阶段不启用真实
 * remote provider 调用，也不写源码。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const inputReports = await Promise.all(inputDefinitions.map(readInputReport));
  const byId = Object.fromEntries(inputReports.map((report) => [report.id, report]));
  const governance = byId["provider-governance-baseline"]?.evidence;
  const registry = byId["provider-registry-installation-policy"]?.evidence;
  const secret = byId["secret-storage-boundary"]?.evidence;
  const network = byId["network-mediation-consent"]?.evidence;
  const sourcePrivacy = byId["source-excerpt-privacy-gate"]?.evidence;
  const safeInvocation = byId["safe-invocation-dry-run"]?.evidence;
  const closeoutBoundary = createCloseoutBoundary();
  const checkedApplyContinuationInputs = createCheckedApplyContinuationInputs();
  const realProviderContinuationInputs = createRealProviderContinuationInputs();
  const summary = {
    evidenceInputCount: inputReports.length,
    readyEvidenceInputCount: inputReports.filter((report) => report.status === report.expectedStatus).length,
    inputHardFailureCount: inputReports.reduce((total, report) => total + report.hardFailureCount, 0),
    governanceGateCount: Number(governance?.summary?.governanceGateCount ?? 0),
    riskCount: Number(governance?.summary?.riskCount ?? 0),
    registryEntryCount: Number(registry?.summary?.registryEntryCount ?? 0),
    invocableProviderCount: Number(registry?.summary?.invocableProviderCount ?? 0),
    remoteProviderCount: Number(registry?.summary?.remoteProviderCount ?? 0),
    remoteInvocableBeforeGateCount: Number(registry?.summary?.remoteInvocableBeforeGateCount ?? -1),
    hostBoundaryCount: Number(secret?.summary?.hostBoundaryCount ?? 0),
    secretReferenceCount: Number(secret?.summary?.secretReferenceCount ?? 0),
    forbiddenSecretValueFieldCount: Number(secret?.summary?.forbiddenSecretValueFieldCount ?? -1),
    directProviderNetworkAllowed: network?.summary?.directProviderNetworkAllowed,
    hostMediatorRequired: network?.summary?.hostMediatorRequired,
    consentRecordCount: Number(network?.summary?.consentRecordCount ?? 0),
    externalNetworkCallExecuted: network?.summary?.externalNetworkCallExecuted,
    defaultSourceExcerptPolicy: sourcePrivacy?.summary?.defaultSourceExcerptPolicy,
    optInRequired: sourcePrivacy?.summary?.optInRequired,
    evidenceMayContainExcerpt: sourcePrivacy?.summary?.evidenceMayContainExcerpt,
    providerResultMayContainExcerpt: sourcePrivacy?.summary?.providerResultMayContainExcerpt,
    privacyScanHardFailureCount: Number(sourcePrivacy?.summary?.privacyScanHardFailureCount ?? -1),
    safeInvocationRunnerStatus: safeInvocation?.summary?.runnerStatus,
    safeInvocationProviderId: safeInvocation?.summary?.providerId,
    safeInvocationProviderRuntimeKind: safeInvocation?.summary?.providerRuntimeKind,
    safeInvocationDraftOutputCount: Number(safeInvocation?.summary?.draftOutputCount ?? 0),
    safeInvocationReviewMetadataCount: Number(safeInvocation?.summary?.reviewMetadataCount ?? 0),
    safeInvocationDirectEditObjectCount: Number(safeInvocation?.summary?.directEditObjectCount ?? -1),
    safeInvocationSourceBodyMarkerCount: Number(safeInvocation?.summary?.sourceBodyMarkerCount ?? -1),
    safeInvocationSecretValueMarkerCount: Number(safeInvocation?.summary?.secretValueMarkerCount ?? -1),
    safeInvocationDeterministicOutputStable: safeInvocation?.summary?.deterministicOutputStable,
    safeInvocationRemoteProviderInvocationStatus: safeInvocation?.summary?.remoteProviderInvocationStatus,
    safeInvocationDirectApplyAllowed: safeInvocation?.summary?.directApplyAllowed,
    safeInvocationWorkspaceWriteAllowed: safeInvocation?.summary?.workspaceWriteAllowed,
    safeInvocationTargetRepositoryMutationAllowed: safeInvocation?.summary?.targetRepositoryMutationAllowed,
    safeInvocationToolExecutionAllowed: safeInvocation?.summary?.toolExecutionAllowed,
    completedGovernanceGateCount: closeoutBoundary.completedGovernanceGates.length,
    deniedCapabilityCount: closeoutBoundary.deniedCapabilities.length,
    checkedApplyContinuationInputCount: checkedApplyContinuationInputs.length,
    realProviderContinuationInputCount: realProviderContinuationInputs.length,
    checkedApplyEnabledInWp36: false,
    remoteProviderInvocationEnabledInWp36: false,
    targetRepositoryMutationCount: 0
  };
  const checks = [
    check("HIA_WP36_CLOSEOUT_ALL_EVIDENCE_READY", summary.readyEvidenceInputCount === summary.evidenceInputCount, {
      actual: inputReports.map(({ id, status }) => ({ id, status })),
      expected: inputReports.map(({ expectedStatus, id }) => ({ id, status: expectedStatus }))
    }),
    check("HIA_WP36_CLOSEOUT_NO_INPUT_FAILURES", summary.inputHardFailureCount === 0, {
      actual: summary.inputHardFailureCount,
      expected: 0
    }),
    check("HIA_WP36_CLOSEOUT_GOVERNANCE_GATES_COMPLETE", summary.governanceGateCount === 8
      && summary.riskCount === 8
      && summary.completedGovernanceGateCount === 8
      && closeoutBoundary.completedGovernanceGates.includes("safe-invocation-dry-run"), {
      actual: {
        completedGovernanceGates: closeoutBoundary.completedGovernanceGates,
        governanceGateCount: summary.governanceGateCount,
        riskCount: summary.riskCount
      }
    }),
    check("HIA_WP36_CLOSEOUT_PROVIDER_REGISTRY_AND_SECRET_BOUNDARY", summary.registryEntryCount >= 2
      && summary.invocableProviderCount === 1
      && summary.remoteProviderCount >= 1
      && summary.remoteInvocableBeforeGateCount === 0
      && summary.hostBoundaryCount >= 4
      && summary.secretReferenceCount >= 2
      && summary.forbiddenSecretValueFieldCount === 0, {
      actual: {
        forbiddenSecretValueFieldCount: summary.forbiddenSecretValueFieldCount,
        hostBoundaryCount: summary.hostBoundaryCount,
        invocableProviderCount: summary.invocableProviderCount,
        registryEntryCount: summary.registryEntryCount,
        remoteInvocableBeforeGateCount: summary.remoteInvocableBeforeGateCount,
        remoteProviderCount: summary.remoteProviderCount,
        secretReferenceCount: summary.secretReferenceCount
      }
    }),
    check("HIA_WP36_CLOSEOUT_NETWORK_AND_SOURCE_PRIVACY_BOUNDARY", summary.directProviderNetworkAllowed === false
      && summary.hostMediatorRequired === true
      && summary.consentRecordCount >= 3
      && summary.externalNetworkCallExecuted === false
      && summary.defaultSourceExcerptPolicy === "none"
      && summary.optInRequired === true
      && summary.evidenceMayContainExcerpt === false
      && summary.providerResultMayContainExcerpt === false
      && summary.privacyScanHardFailureCount === 0, {
      actual: {
        consentRecordCount: summary.consentRecordCount,
        defaultSourceExcerptPolicy: summary.defaultSourceExcerptPolicy,
        directProviderNetworkAllowed: summary.directProviderNetworkAllowed,
        evidenceMayContainExcerpt: summary.evidenceMayContainExcerpt,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        hostMediatorRequired: summary.hostMediatorRequired,
        optInRequired: summary.optInRequired,
        privacyScanHardFailureCount: summary.privacyScanHardFailureCount,
        providerResultMayContainExcerpt: summary.providerResultMayContainExcerpt
      }
    }),
    check("HIA_WP36_CLOSEOUT_SAFE_INVOCATION_REVIEW_ONLY", summary.safeInvocationRunnerStatus === "success"
      && summary.safeInvocationProviderRuntimeKind === "deterministic-mock"
      && summary.safeInvocationDraftOutputCount >= 4
      && summary.safeInvocationReviewMetadataCount >= 4
      && summary.safeInvocationDirectEditObjectCount === 0
      && summary.safeInvocationSourceBodyMarkerCount === 0
      && summary.safeInvocationSecretValueMarkerCount === 0
      && summary.safeInvocationDeterministicOutputStable === true, {
      actual: {
        providerId: summary.safeInvocationProviderId,
        providerRuntimeKind: summary.safeInvocationProviderRuntimeKind,
        runnerStatus: summary.safeInvocationRunnerStatus,
        safeInvocationDirectEditObjectCount: summary.safeInvocationDirectEditObjectCount,
        safeInvocationDraftOutputCount: summary.safeInvocationDraftOutputCount,
        safeInvocationReviewMetadataCount: summary.safeInvocationReviewMetadataCount,
        safeInvocationSecretValueMarkerCount: summary.safeInvocationSecretValueMarkerCount,
        safeInvocationSourceBodyMarkerCount: summary.safeInvocationSourceBodyMarkerCount
      }
    }),
    check("HIA_WP36_CLOSEOUT_REMOTE_AND_APPLY_STILL_BLOCKED", summary.safeInvocationRemoteProviderInvocationStatus === "blocked-before-real-remote-call"
      && summary.safeInvocationDirectApplyAllowed === false
      && summary.safeInvocationWorkspaceWriteAllowed === false
      && summary.safeInvocationTargetRepositoryMutationAllowed === false
      && summary.safeInvocationToolExecutionAllowed === false
      && summary.checkedApplyEnabledInWp36 === false
      && summary.remoteProviderInvocationEnabledInWp36 === false
      && summary.targetRepositoryMutationCount === 0, {
      actual: {
        checkedApplyEnabledInWp36: summary.checkedApplyEnabledInWp36,
        remoteProviderInvocationEnabledInWp36: summary.remoteProviderInvocationEnabledInWp36,
        safeInvocationDirectApplyAllowed: summary.safeInvocationDirectApplyAllowed,
        safeInvocationRemoteProviderInvocationStatus: summary.safeInvocationRemoteProviderInvocationStatus,
        safeInvocationTargetRepositoryMutationAllowed: summary.safeInvocationTargetRepositoryMutationAllowed,
        safeInvocationToolExecutionAllowed: summary.safeInvocationToolExecutionAllowed,
        safeInvocationWorkspaceWriteAllowed: summary.safeInvocationWorkspaceWriteAllowed,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount
      }
    }),
    check("HIA_WP36_CLOSEOUT_WP37_INPUTS_READY", summary.checkedApplyContinuationInputCount >= 12
      && checkedApplyContinuationInputs.includes("human-approval-record")
      && checkedApplyContinuationInputs.includes("provider-output-remains-review-augmentation")
      && checkedApplyContinuationInputs.includes("apply-audit-record")
      && summary.realProviderContinuationInputCount >= 6, {
      actual: {
        checkedApplyContinuationInputs,
        realProviderContinuationInputs
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp36-closeout-checked-apply-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp37-checked-apply-continuation" : "blocked",
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
    closeoutBoundary,
    checkedApplyContinuationInputs,
    realProviderContinuationInputs,
    checks,
    nextContractInputs: [
      {
        phase: "W-P37",
        topic: "checked-apply-continuation",
        reason: "Provider governance and safe dry-run are ready, but provider outputs remain review-only and must flow through host-owned checked apply."
      },
      {
        phase: "W-P37/W-P38",
        topic: "real-provider-mediated-smoke",
        reason: "Remote/API provider smoke still requires separately approved secret storage, host network mediation and source privacy opt-in."
      },
      {
        phase: "W-P37",
        topic: "target-project-readiness-notify",
        reason: "Targets can read central notify for workflow changes; HIA automation still does not modify target repositories."
      }
    ],
    manualChecks: [
      "Confirm W-P37 keeps checked apply host-owned and separate from provider output.",
      "Confirm any future remote provider smoke uses host-managed secret references and network mediation.",
      "Confirm source excerpt bodies remain opt-in, previewed, redacted and excluded from evidence.",
      "Confirm target projects continue to read central notify instead of receiving direct repository edits."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P36 closeout checked-apply input evidence");
  assert.equal(hardFailures.length, 0, `W-P36 closeout evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P36 closeout checked-apply input evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readInputReport(inputDefinition) {
  const evidence = JSON.parse(await readFile(inputDefinition.path, "utf8"));
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  return {
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    evidence,
    expectedStatus: inputDefinition.expectedStatus,
    hardFailureCount: checks.filter((item) => item.status === "fail").length,
    id: inputDefinition.id,
    path: inputDefinition.path,
    status: evidence.status
  };
}

function createCloseoutBoundary() {
  return {
    completedGovernanceGates: [
      "provider-registry-installation-policy",
      "secret-storage-boundary",
      "network-mediation-and-consent",
      "audit-provenance-policy",
      "source-excerpt-opt-in-policy",
      "privacy-release-gate",
      "safe-invocation-dry-run",
      "checked-apply-separation"
    ],
    deniedCapabilities: [
      "provider-owned-workspace-write",
      "provider-owned-target-repository-mutation",
      "provider-owned-tool-execution",
      "provider-owned-workspace-edit",
      "unmediated-remote-network",
      "secret-value-in-request-result-or-evidence",
      "source-body-in-evidence",
      "sources-content-in-evidence",
      "automatic-apply-without-human-approval"
    ],
    providerOutputPolicy: "review-payload-augmentation-only",
    checkedApplyOwnership: "host-owned-separate-contract",
    targetCollaborationPolicy: "central-notify-read-by-targets",
    sourcesContentPolicy: "none"
  };
}

function createCheckedApplyContinuationInputs() {
  return [
    "human-approval-record",
    "host-owned-file-read",
    "file-version-result",
    "conflict-result",
    "semantic-diff-preview-to-host-edit-mapping",
    "rollback-record",
    "formatter-and-post-apply-validation",
    "workspace-trust-or-target-consent",
    "provider-provenance-attached-to-review-item",
    "provider-output-remains-review-augmentation",
    "source-excerpt-policy-recheck-before-apply",
    "apply-audit-record"
  ];
}

function createRealProviderContinuationInputs() {
  return [
    "real-provider-registry-entry-and-package-provenance",
    "concrete-host-secret-storage-implementation",
    "host-network-mediator-and-consent-ui",
    "remote-provider-refusal-error-rate-limit-result",
    "redacted-provider-invocation-audit",
    "separately-approved-mediated-smoke-without-source-body"
  ];
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
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
