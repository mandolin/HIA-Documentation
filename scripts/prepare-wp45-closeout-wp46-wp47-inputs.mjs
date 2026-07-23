import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp45-closeout-wp46-wp47-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const summaryPath = path.join(outputRoot, "wp45-closeout-summary.md");
const downstreamInputsPath = path.join(outputRoot, "wp46-wp47-inputs.md");
const deferredGatesPath = path.join(outputRoot, "remote-provider-execution-deferred-gates.md");

const inputPaths = {
  controlledProviderExecutionIntake: path.join(rootDir, "dist", "wp45-controlled-provider-execution-intake", "evidence.json"),
  providerExecutionBoundaryContract: path.join(rootDir, "dist", "wp45-provider-execution-boundary-contract", "evidence.json"),
  concreteProviderIdentityPackagePin: path.join(rootDir, "dist", "wp45-concrete-provider-identity-package-pin", "evidence.json"),
  hostSecretReferenceDestinationBinding: path.join(rootDir, "dist", "wp45-host-secret-reference-destination-binding", "evidence.json"),
  requestPreviewFinalConsentPacket: path.join(rootDir, "dist", "wp45-request-preview-final-consent-packet", "evidence.json"),
  minimalRemoteExecutionOrBlockedResult: path.join(rootDir, "dist", "wp45-minimal-remote-execution-or-blocked-result", "evidence.json")
};

await main();

/**
 * 生成 W-P45 closeout and W-P46/W-P47 inputs evidence。
 * Generate W-P45 closeout and W-P46/W-P47 inputs evidence.
 *
 * W-P45.7 closes the controlled remote provider execution slice by preserving
 * the blocked-before-network result as a review-only artifact. It prepares
 * downstream target-owner and checked-apply inputs without granting target
 * mutation, workspace write, provider network execution or credential access.
 *
 * 中文：W-P45.7 收口受控 remote provider execution slice，把
 * blocked-before-network 结果作为 review-only 产物保留下来。它为后续
 * target-owner 与 checked apply 输入做准备，但不授予目标仓库变更、workspace
 * write、provider network execution 或 credential access。
 *
 * @returns {Promise<void>} Writes public-safe closeout evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const closeoutMatrix = createCloseoutMatrix(inputs);
  const downstreamInputs = createDownstreamInputs(inputs, closeoutMatrix);
  const deferredGates = createDeferredGates(inputs, closeoutMatrix);
  const summary = summarize({ closeoutMatrix, deferredGates, downstreamInputs, inputs });
  const checks = [
    check("HIA_WP45_CLOSEOUT_INPUTS_READY", summary.inputEvidenceCount === 6
      && summary.readyInputCount === 6
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputCount: summary.readyInputCount
      }
    }),
    check("HIA_WP45_CLOSEOUT_BLOCKED_RESULT_PRESERVED", summary.executionDecisionStatus === "blocked-before-network"
      && summary.blockedProviderResultReady === true
      && summary.resultKind === "execution-gate-blocked"
      && summary.refusalResultProduced === true
      && summary.providerResultProduced === false, {
      actual: {
        blockedProviderResultReady: summary.blockedProviderResultReady,
        executionDecisionStatus: summary.executionDecisionStatus,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced,
        resultKind: summary.resultKind
      }
    }),
    check("HIA_WP45_CLOSEOUT_NO_REAL_REMOTE_EXECUTION", summary.externalProviderApiCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.providerDestinationContactedCount === 0
      && summary.finalNetworkSendApproved === false
      && summary.credentialAccessGranted === false, {
      actual: {
        credentialAccessGranted: summary.credentialAccessGranted,
        externalProviderApiCallExecuted: summary.externalProviderApiCallExecuted,
        finalNetworkSendApproved: summary.finalNetworkSendApproved,
        providerDestinationContactedCount: summary.providerDestinationContactedCount,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted
      }
    }),
    check("HIA_WP45_CLOSEOUT_REVIEW_ONLY_LINKAGE", summary.reviewOnlyOutputRequired === true
      && summary.requiresHumanReview === true
      && summary.hostReviewLinkageReady === true
      && summary.hostProjectionReadyCount === 3
      && summary.targetOwnerInputReady === true
      && summary.checkedApplyInputReady === true, {
      actual: {
        checkedApplyInputReady: summary.checkedApplyInputReady,
        hostProjectionReadyCount: summary.hostProjectionReadyCount,
        hostReviewLinkageReady: summary.hostReviewLinkageReady,
        requiresHumanReview: summary.requiresHumanReview,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        targetOwnerInputReady: summary.targetOwnerInputReady
      }
    }),
    check("HIA_WP45_CLOSEOUT_NO_WRITE_OR_TARGET_MUTATION", summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP45_CLOSEOUT_NO_SOURCE_SECRET_REQUEST_RESPONSE", summary.secretValueIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount
      }
    }),
    check("HIA_WP45_CLOSEOUT_PRIVACY_CLEAN", summary.pathExposureCount === 0, {
      actual: {
        pathExposureCount: summary.pathExposureCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp45-closeout-wp46-wp47-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp46-target-owner-evidence-ingestion-and-wp47-checked-apply-pilot-inputs" : "blocked",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    closeoutMatrix,
    downstreamInputs,
    deferredGates,
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(summaryPath),
      downstreamInputs: normalizePath(downstreamInputsPath),
      remoteProviderExecutionDeferredGates: normalizePath(deferredGatesPath)
    },
    nextContractInputs: downstreamInputs.items
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P45 closeout evidence");
  assert.equal(hardFailures.length, 0, `W-P45 closeout has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(summaryPath, renderSummaryMarkdown(evidence), "utf8");
  await writeFile(downstreamInputsPath, renderDownstreamInputsMarkdown(evidence), "utf8");
  await writeFile(deferredGatesPath, renderDeferredGatesMarkdown(evidence), "utf8");
  console.log(`W-P45 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P45 closeout summary prepared at ${normalizePath(summaryPath)}`);
  console.log(`W-P45 W-P46/W-P47 inputs prepared at ${normalizePath(downstreamInputsPath)}`);
  console.log(`W-P45 deferred remote provider gates prepared at ${normalizePath(deferredGatesPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)]));
  return Object.fromEntries(entries);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createCloseoutMatrix(inputs) {
  return {
    contract: "hia-wp45-closeout-matrix",
    contractVersion: "0.1.0-draft",
    completedStages: [
      stage("W-P45.1", inputs.controlledProviderExecutionIntake.status, "execution-intake-and-gate-reconciliation"),
      stage("W-P45.2", inputs.providerExecutionBoundaryContract.status, "host-mediated-execution-boundary-contract"),
      stage("W-P45.3", inputs.concreteProviderIdentityPackagePin.status, "concrete-provider-identity-package-pin"),
      stage("W-P45.4", inputs.hostSecretReferenceDestinationBinding.status, "host-secret-reference-and-destination-binding"),
      stage("W-P45.5", inputs.requestPreviewFinalConsentPacket.status, "metadata-only-request-preview-and-final-consent-packet"),
      stage("W-P45.6", inputs.minimalRemoteExecutionOrBlockedResult.status, "blocked-before-network-review-result")
    ],
    finalExecutionState: {
      providerId: inputs.minimalRemoteExecutionOrBlockedResult.summary?.providerId,
      packagePin: inputs.minimalRemoteExecutionOrBlockedResult.summary?.packagePin,
      decisionStatus: inputs.minimalRemoteExecutionOrBlockedResult.summary?.executionDecisionStatus,
      resultKind: inputs.minimalRemoteExecutionOrBlockedResult.summary?.resultKind,
      realProviderExecutionCompleted: false,
      blockedBeforeNetwork: true,
      destinationContactedCount: inputs.minimalRemoteExecutionOrBlockedResult.summary?.providerDestinationContactedCount ?? 0,
      finalNetworkSendApproved: inputs.minimalRemoteExecutionOrBlockedResult.summary?.finalNetworkSendApproved === true,
      credentialAccessGranted: inputs.minimalRemoteExecutionOrBlockedResult.summary?.credentialAccessGranted === true
    }
  };
}

function stage(phase, status, topic) {
  return {
    phase,
    status,
    topic,
    completed: status !== "blocked"
  };
}

function createDownstreamInputs(inputs, closeoutMatrix) {
  const executionSummary = inputs.minimalRemoteExecutionOrBlockedResult.summary ?? {};
  return {
    contract: "hia-wp45-wp46-wp47-downstream-inputs",
    contractVersion: "0.1.0-draft",
    items: [
      {
        phase: "W-P46",
        topic: "target-owner-evidence-ingestion-and-adoption-trial",
        status: "ready-review-only-input",
        inputKind: "blocked-provider-result-host-review-linkage",
        sourceResultKind: executionSummary.resultKind,
        targetOwnerActionRequired: true,
        hiaMayRunTargetCommand: false,
        hiaMayCreateBranchOrPr: false,
        hiaMayMutateTargetRepository: false,
        reason: "W-P45 produced a review-only blocked provider result and host linkage input. Target-owner ingestion may display and archive owner-provided evidence, but HIA automation must not execute target actions."
      },
      {
        phase: "W-P47",
        topic: "checked-apply-write-pilot-preparation",
        status: "ready-review-only-input",
        inputKind: "provider-result-review-only-gate",
        checkedApplyTriggerAllowed: false,
        workspaceWriteAllowed: false,
        directEditObjectAllowed: false,
        reason: "The blocked provider result can harden checked-apply denial and confirmation logic, but it cannot trigger writes or become a host edit object."
      },
      {
        phase: "W-P48",
        topic: "runtime-and-controlled-execution-closeout",
        status: "ready-cycle-closeout-input",
        inputKind: "c-hia-p2-remote-provider-blocked-before-network-summary",
        reason: "C-HIA-P2 can record that W-P45 reached a concrete provider binding and safe blocked result without real network execution."
      },
      {
        phase: "future-remote-provider-smoke",
        topic: "explicit-final-network-send-followup",
        status: "deferred-requires-new-approval",
        inputKind: "manual-final-consent-and-host-secret-access",
        reason: "A future real provider smoke requires explicit final network-send approval, host-managed credential access and request body binding."
      }
    ],
    closeoutRef: {
      completedStageCount: closeoutMatrix.completedStages.length,
      finalDecisionStatus: closeoutMatrix.finalExecutionState.decisionStatus
    }
  };
}

function createDeferredGates(inputs) {
  const resultSummary = inputs.minimalRemoteExecutionOrBlockedResult.summary ?? {};
  return {
    contract: "hia-wp45-remote-provider-deferred-gates",
    contractVersion: "0.1.0-draft",
    gateCount: 7,
    gates: [
      deferredGate("final-network-send-approval", resultSummary.finalNetworkSendApproved, "用户未显式批准 final network send。"),
      deferredGate("host-secret-access", resultSummary.credentialAccessGranted, "宿主 secret access 未授予。"),
      deferredGate("provider-selected-for-execution", resultSummary.selectedForExecution, "provider 只完成 binding selection，未进入 execution selection。"),
      deferredGate("current-execution-ready", resultSummary.currentExecutionReady, "current execution readiness 仍为 false。"),
      deferredGate("request-body-binding", resultSummary.requestBodyIncludedCount > 0, "request body/model/input 未绑定，且不应进入 public evidence。"),
      deferredGate("provider-destination-contact", resultSummary.providerDestinationContactedCount > 0, "provider destination 未接触。"),
      deferredGate("real-provider-result", resultSummary.providerResultProduced, "没有真实 provider result，只有 gate 生成的 blocked result。")
    ]
  };
}

function deferredGate(id, satisfied, reason) {
  return {
    id,
    status: satisfied === true ? "satisfied" : "deferred",
    reason
  };
}

function summarize({ closeoutMatrix, deferredGates, downstreamInputs, inputs }) {
  const executionSummary = inputs.minimalRemoteExecutionOrBlockedResult.summary ?? {};
  const previewSummary = inputs.requestPreviewFinalConsentPacket.summary ?? {};
  const combinedForPrivacy = {
    closeoutMatrix,
    downstreamInputs,
    deferredGates
  };
  const serialized = JSON.stringify(combinedForPrivacy);
  return {
    phase: "W-P45.7",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputCount: Object.values(inputs).filter((item) => item.status && item.status !== "blocked").length,
    inputHardFailureCount: Object.values(inputs).reduce((total, item) => total + (item.summary?.hardFailureCount ?? 0), 0),
    completedStageCount: closeoutMatrix.completedStages.length,
    completedStageReadyCount: closeoutMatrix.completedStages.filter((item) => item.completed).length,
    providerId: executionSummary.providerId,
    packagePin: executionSummary.packagePin,
    providerBindingReady: previewSummary.secretReferenceBound === true && previewSummary.destinationBindingReady === true,
    requestPreviewReady: previewSummary.requestPreviewReady === true,
    metadataOnlyPreview: previewSummary.metadataOnlyPreview === true,
    finalNetworkSendApproved: executionSummary.finalNetworkSendApproved === true,
    credentialAccessGranted: executionSummary.credentialAccessGranted === true,
    executionDecisionStatus: executionSummary.executionDecisionStatus,
    blockedProviderResultReady: executionSummary.blockedProviderResultReady === true,
    resultKind: executionSummary.resultKind,
    reviewOnlyOutputRequired: executionSummary.reviewOnlyOutputRequired === true,
    requiresHumanReview: executionSummary.requiresHumanReview === true,
    hostReviewLinkageReady: executionSummary.hostReviewLinkageReady === true,
    hostProjectionCount: executionSummary.hostProjectionCount ?? 0,
    hostProjectionReadyCount: executionSummary.hostProjectionReadyCount ?? 0,
    externalProviderApiCallExecuted: false,
    realRemoteProviderInvocationExecuted: false,
    providerDestinationContactedCount: executionSummary.providerDestinationContactedCount ?? 0,
    providerResultProduced: executionSummary.providerResultProduced === true,
    refusalResultProduced: executionSummary.refusalResultProduced === true,
    targetOwnerInputReady: downstreamInputs.items.some((item) => item.phase === "W-P46" && item.status === "ready-review-only-input"),
    checkedApplyInputReady: downstreamInputs.items.some((item) => item.phase === "W-P47" && item.status === "ready-review-only-input"),
    cycleCloseoutInputReady: downstreamInputs.items.some((item) => item.phase === "W-P48" && item.status === "ready-cycle-closeout-input"),
    futureRemoteSmokeDeferred: downstreamInputs.items.some((item) => item.phase === "future-remote-provider-smoke" && item.status === "deferred-requires-new-approval"),
    deferredGateCount: deferredGates.gates.filter((item) => item.status === "deferred").length,
    secretValueIncludedCount: executionSummary.secretValueIncludedCount ?? 0,
    sourceTextIncludedCount: executionSummary.sourceTextIncludedCount ?? 0,
    requestBodyIncludedCount: executionSummary.requestBodyIncludedCount ?? 0,
    responseBodyIncludedCount: executionSummary.responseBodyIncludedCount ?? 0,
    directApplyAllowedCount: executionSummary.directApplyAllowedCount ?? 0,
    checkedApplyTriggeredCount: executionSummary.checkedApplyTriggeredCount ?? 0,
    workspaceWriteAllowedCount: executionSummary.workspaceWriteAllowedCount ?? 0,
    targetRepositoryMutationCount: executionSummary.targetRepositoryMutationCount ?? 0,
    directEditObjectCount: countDirectEditObjects(combinedForPrivacy),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(combinedForPrivacy),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(combinedForPrivacy),
    pathExposureCount: countPathExposure(serialized),
    nextStage: "W-P46 Target-Owner Evidence Ingestion And Adoption Trial"
  };
}

function renderSummaryMarkdown(evidence) {
  const lines = [
    "# W-P45 Closeout Summary",
    "",
    `Status / 状态：\`${evidence.status}\``,
    "",
    "中文：W-P45 已完成 concrete provider binding、metadata-only request preview 与 blocked-before-network result。真实 provider API call 没有执行。",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Provider | \`${evidence.summary.providerId}\` |`,
    `| Package pin | \`${evidence.summary.packagePin}\` |`,
    `| Final decision | \`${evidence.summary.executionDecisionStatus}\` |`,
    `| Result kind | \`${evidence.summary.resultKind}\` |`,
    `| Destination contacted | ${evidence.summary.providerDestinationContactedCount} |`,
    `| External provider API call | ${evidence.summary.externalProviderApiCallExecuted} |`,
    `| Review only | ${evidence.summary.reviewOnlyOutputRequired} |`
  ];
  return `${lines.join("\n")}\n`;
}

function renderDownstreamInputsMarkdown(evidence) {
  const lines = [
    "# W-P46 / W-P47 Inputs",
    "",
    "| Phase | Topic | Status | Reason |",
    "| --- | --- | --- | --- |"
  ];
  for (const item of evidence.downstreamInputs.items) {
    lines.push(`| \`${item.phase}\` | \`${item.topic}\` | \`${item.status}\` | ${item.reason} |`);
  }
  return `${lines.join("\n")}\n`;
}

function renderDeferredGatesMarkdown(evidence) {
  const lines = [
    "# Remote Provider Execution Deferred Gates",
    "",
    "| Gate | Status | Reason |",
    "| --- | --- | --- |"
  ];
  for (const item of evidence.deferredGates.gates) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${item.reason} |`);
  }
  return `${lines.join("\n")}\n`;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
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
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
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
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])Users[\\/]/iu, `${label} must not expose user profile paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
