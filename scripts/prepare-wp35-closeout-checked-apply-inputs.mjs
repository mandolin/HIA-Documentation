import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp35-closeout-checked-apply-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputDefinitions = [
  {
    id: "provider-boundary-audit",
    path: path.join(rootDir, "dist", "wp35-provider-boundary-audit", "evidence.json"),
    expectedStatus: "ready-for-provider-adapter-interface"
  },
  {
    id: "provider-adapter-interface",
    path: path.join(rootDir, "dist", "wp35-provider-adapter-evidence", "evidence.json"),
    expectedStatus: "ready-for-deterministic-mock-provider"
  },
  {
    id: "deterministic-mock-provider",
    path: path.join(rootDir, "dist", "wp35-provider-mock-evidence", "evidence.json"),
    expectedStatus: "ready-for-local-provider-runner"
  },
  {
    id: "local-provider-runner",
    path: path.join(rootDir, "dist", "wp35-provider-runner-evidence", "evidence.json"),
    expectedStatus: "ready-for-host-review-integration-refresh"
  },
  {
    id: "host-review-provider",
    path: path.join(rootDir, "dist", "wp35-host-review-provider-evidence", "evidence.json"),
    expectedStatus: "ready-for-target-self-doc-provider-dry-run"
  },
  {
    id: "target-self-doc-provider-dry-run",
    path: path.join(rootDir, "dist", "wp35-target-self-doc-provider-dry-run-evidence", "evidence.json"),
    expectedStatus: "ready-for-wp35-closeout-and-checked-apply-inputs"
  }
];

await main();

/**
 * 准备 W-P35.7 provider integration closeout evidence。
 * Prepare W-P35.7 provider integration closeout evidence.
 *
 * This closeout proves the first provider integration slice is complete as a
 * review-only workflow and turns checked apply plus real provider execution
 * into explicit downstream inputs rather than hidden provider capabilities.
 *
 * 本 closeout 证明第一轮 provider integration 已作为 review-only workflow 收口，
 * 并把 checked apply 与真实 provider 执行转化为显式后续输入，而不是隐藏在
 * provider 能力中抢跑。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const inputReports = await Promise.all(inputDefinitions.map(readInputReport));
  const byId = Object.fromEntries(inputReports.map((report) => [report.id, report]));
  const closeoutBoundary = {
    completedReviewOnlyCapabilities: [
      "provider-neutral-boundary",
      "provider-adapter-sdk",
      "deterministic-mock-provider",
      "local-provider-runner",
      "host-review-provider-augmentation",
      "target-self-doc-provider-dry-run"
    ],
    deniedProviderCapabilities: [
      "real-external-provider-invocation",
      "api-key-or-secret-access",
      "unmediated-network-access",
      "tool-execution",
      "workspace-write",
      "target-repository-mutation",
      "direct-workspace-edit-object",
      "source-body-input",
      "sources-content-embedding",
      "checked-apply-bypass"
    ],
    providerOutputPolicy: "review-payload-augmentation-only",
    targetCollaborationPolicy: "central-notify-read-by-targets",
    sourcesContentPolicy: "none"
  };
  const checkedApplyInputs = [
    "human-approval-record",
    "host-file-read",
    "file-version-result",
    "conflict-result",
    "rollback-record",
    "host-supported-formatter",
    "workspace-trust-or-target-consent",
    "provider-provenance-attached-to-review-item",
    "provider-output-still-not-a-workspace-edit"
  ];
  const realProviderInputs = [
    "provider-registry-and-installation-policy",
    "secret-storage-boundary",
    "network-mediation-and-user-consent",
    "audit-log-and-provenance-policy",
    "source-excerpt-opt-in-policy",
    "refusal-error-rate-limit-policy",
    "model-capability-declaration",
    "privacy-release-gate"
  ];
  const summary = {
    readyEvidenceInputCount: inputReports.filter((report) => report.status === report.expectedStatus).length,
    evidenceInputCount: inputReports.length,
    hardFailureCount: inputReports.reduce((total, report) => total + report.hardFailureCount, 0),
    providerBoundaryReady: byId["provider-boundary-audit"]?.status === "ready-for-provider-adapter-interface",
    providerAdapterReady: byId["provider-adapter-interface"]?.status === "ready-for-deterministic-mock-provider",
    deterministicMockReady: byId["deterministic-mock-provider"]?.status === "ready-for-local-provider-runner",
    localRunnerReady: byId["local-provider-runner"]?.status === "ready-for-host-review-integration-refresh",
    hostReviewReady: byId["host-review-provider"]?.status === "ready-for-target-self-doc-provider-dry-run",
    targetSelfDocDryRunReady: byId["target-self-doc-provider-dry-run"]?.status === "ready-for-wp35-closeout-and-checked-apply-inputs",
    completedReviewOnlyCapabilityCount: closeoutBoundary.completedReviewOnlyCapabilities.length,
    deniedProviderCapabilityCount: closeoutBoundary.deniedProviderCapabilities.length,
    checkedApplyInputCount: checkedApplyInputs.length,
    realProviderInputCount: realProviderInputs.length,
    providerScenarioCount: Number(byId["target-self-doc-provider-dry-run"]?.evidence.summary?.providerScenarioCount ?? 0),
    providerSuccessCount: Number(byId["target-self-doc-provider-dry-run"]?.evidence.summary?.providerSuccessCount ?? 0),
    providerDraftOutputCount: Number(byId["target-self-doc-provider-dry-run"]?.evidence.summary?.providerDraftOutputCount ?? 0),
    providerReviewMetadataCount: Number(byId["target-self-doc-provider-dry-run"]?.evidence.summary?.providerReviewMetadataCount ?? 0),
    directEditObjectCount: countDirectEditObjects(inputReports.map((report) => report.evidence)),
    sourceBodyMarkerCount: countForbiddenSourceBodyMarkers(inputReports.map((report) => report.evidence)),
    pathExposureCount: countPathExposure(JSON.stringify(inputReports.map((report) => report.evidence))),
    externalProviderInvocationCount: sumSummaryValue(inputReports, "externalProviderInvocationCount"),
    externalProviderApiKeyRequiredCount: countTruthySummaryValue(inputReports, "externalProviderApiKeyRequired"),
    externalProviderNetworkAllowedCount: countTruthySummaryValue(inputReports, "externalProviderNetworkAllowed"),
    workspaceWriteAllowedCount: countTruthySummaryValue(inputReports, "workspaceWriteAllowed"),
    targetRepositoryMutationCount: sumSummaryValue(inputReports, "targetRepositoryMutationCount"),
    checkedApplyStillDeferred: true,
    realProviderStillDeferred: true
  };
  const checks = [
    check("HIA_WP35_CLOSEOUT_ALL_EVIDENCE_READY", summary.readyEvidenceInputCount === summary.evidenceInputCount, {
      actual: inputReports.map(({ id, status }) => ({ id, status })),
      expected: inputReports.map(({ id, expectedStatus }) => ({ id, status: expectedStatus }))
    }),
    check("HIA_WP35_CLOSEOUT_NO_HARD_FAILURES", summary.hardFailureCount === 0, {
      actual: summary.hardFailureCount,
      expected: 0
    }),
    check("HIA_WP35_CLOSEOUT_REVIEW_ONLY_CAPABILITIES_COMPLETE", summary.providerBoundaryReady === true
      && summary.providerAdapterReady === true
      && summary.deterministicMockReady === true
      && summary.localRunnerReady === true
      && summary.hostReviewReady === true
      && summary.targetSelfDocDryRunReady === true
      && summary.providerSuccessCount === summary.providerScenarioCount
      && summary.providerDraftOutputCount > 0
      && summary.providerReviewMetadataCount > 0, {
      actual: {
        providerDraftOutputCount: summary.providerDraftOutputCount,
        providerReviewMetadataCount: summary.providerReviewMetadataCount,
        providerScenarioCount: summary.providerScenarioCount,
        providerSuccessCount: summary.providerSuccessCount
      }
    }),
    check("HIA_WP35_CLOSEOUT_REVIEW_ONLY_BOUNDARY", summary.directEditObjectCount === 0
      && summary.sourceBodyMarkerCount === 0
      && summary.pathExposureCount === 0
      && summary.externalProviderInvocationCount === 0
      && summary.externalProviderApiKeyRequiredCount === 0
      && summary.externalProviderNetworkAllowedCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0, {
      actual: {
        directEditObjectCount: summary.directEditObjectCount,
        externalProviderApiKeyRequiredCount: summary.externalProviderApiKeyRequiredCount,
        externalProviderInvocationCount: summary.externalProviderInvocationCount,
        externalProviderNetworkAllowedCount: summary.externalProviderNetworkAllowedCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP35_CLOSEOUT_CHECKED_APPLY_STILL_DEFERRED", summary.checkedApplyStillDeferred === true
      && checkedApplyInputs.includes("host-file-read")
      && checkedApplyInputs.includes("conflict-result")
      && checkedApplyInputs.includes("provider-output-still-not-a-workspace-edit"), {
      actual: {
        checkedApplyInputCount: summary.checkedApplyInputCount,
        checkedApplyStillDeferred: summary.checkedApplyStillDeferred
      }
    }),
    check("HIA_WP35_CLOSEOUT_REAL_PROVIDER_STILL_DEFERRED", summary.realProviderStillDeferred === true
      && realProviderInputs.includes("secret-storage-boundary")
      && realProviderInputs.includes("network-mediation-and-user-consent")
      && realProviderInputs.includes("source-excerpt-opt-in-policy"), {
      actual: {
        realProviderInputCount: summary.realProviderInputCount,
        realProviderStillDeferred: summary.realProviderStillDeferred
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp35-closeout-checked-apply-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp36-real-provider-governance-or-checked-apply-planning" : "blocked",
    sourceEvidence: Object.fromEntries(inputReports.map((report) => [report.id, normalizePath(report.path)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    evidenceInputs: inputReports.map(({ contract, contractVersion, hardFailureCount, id, status }) => ({
      contract,
      contractVersion,
      hardFailureCount,
      id,
      status
    })),
    closeoutBoundary,
    checkedApplyInputs,
    realProviderInputs,
    checks,
    nextContractInputs: [
      {
        phase: "W-P36",
        topic: "real-provider-governance-and-secret-network-policy",
        reason: "Provider integration is complete only as review-only infrastructure; real providers need explicit secret storage, network mediation and audit gates."
      },
      {
        phase: "W-P36/W-P37",
        topic: "checked-apply-contract-continuation",
        reason: "Provider output remains non-executable and can only feed checked apply after host file-read, conflict, rollback and human-approval contracts are expanded."
      },
      {
        phase: "W-P36/W-P37",
        topic: "target-adoption-readiness",
        reason: "Target/self-doc provider dry-run is ready as central-notify input, but target repositories must opt in and absorb changes themselves."
      }
    ],
    manualChecks: [
      "Confirm no downstream plan treats provider output as a WorkspaceEdit.",
      "Confirm real provider API keys stay blocked until secret and network mediation are designed.",
      "Confirm checked apply remains separate from provider adapter, mock provider and runner packages.",
      "Confirm target projects continue to read central notify and are not modified directly by HIA main-repo automation."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P35 closeout checked-apply input evidence");
  assert.equal(hardFailures.length, 0, `W-P35 closeout evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P35 closeout checked-apply input evidence prepared at ${normalizePath(evidencePath)}`);
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

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function countTruthySummaryValue(inputReports, key) {
  return inputReports.filter((report) => report.evidence.summary?.[key] === true).length;
}

function sumSummaryValue(inputReports, key) {
  return inputReports.reduce((total, report) => {
    const value = report.evidence.summary?.[key];
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
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
      Object.hasOwn(node, "rawSource") ||
      Object.hasOwn(node, "sourceBody") ||
      Object.hasOwn(node, "sourceExcerpt") ||
      Object.hasOwn(node, "sourceText")
    ) {
      count += 1;
    }
  });
  return count;
}

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]/u.test(serialized) || serialized.includes("file://") ? 1 : 0;
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
