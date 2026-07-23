import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp45-minimal-remote-execution-or-blocked-result");
const evidencePath = path.join(outputRoot, "evidence.json");
const decisionPath = path.join(outputRoot, "minimal-remote-execution-decision.md");
const blockedResultPath = path.join(outputRoot, "blocked-provider-review-result.md");
const hostLinkagePath = path.join(outputRoot, "host-review-linkage-input.md");
const consentPacketEvidencePath = path.join(rootDir, "dist", "wp45-request-preview-final-consent-packet", "evidence.json");

await main();

/**
 * 生成 W-P45.6 minimal remote execution or explicit blocked result evidence。
 * Generate W-P45.6 minimal remote execution or explicit blocked result evidence.
 *
 * W-P45.6 is the hard boundary after request preview. It may execute a minimal
 * remote smoke only when final network-send approval, credential access,
 * provider execution selection and current execution readiness are all true.
 * In the current repository state those grants are false, so this script
 * intentionally emits a review-only blocked result before any provider network
 * destination can be contacted.
 *
 * 中文：W-P45.6 是 request preview 之后的硬边界。只有 final network-send
 * approval、credential access、provider execution selection 与 current execution
 * readiness 全部为 true，才允许执行最小 remote smoke。当前仓库状态下这些授权均为
 * false，因此脚本会在任何 provider network destination 被接触之前生成 review-only
 * blocked result。
 *
 * @returns {Promise<void>} Writes public-safe blocked execution evidence.
 */
async function main() {
  const consentEvidence = await readJson(consentPacketEvidencePath);
  const executionDecision = createExecutionDecision(consentEvidence);
  const blockedProviderResult = createBlockedProviderResult(consentEvidence, executionDecision);
  const hostReviewLinkageInput = createHostReviewLinkageInput(blockedProviderResult, executionDecision);
  const summary = summarize({
    blockedProviderResult,
    consentEvidence,
    executionDecision,
    hostReviewLinkageInput
  });
  const checks = [
    check("HIA_WP45_EXECUTION_INPUT_READY", summary.previewPacketReady === true
      && summary.inputHardFailureCount === 0
      && summary.providerId === "openai.responses-api"
      && summary.packagePin === "openai@6.48.0"
      && summary.secretReferenceBound === true
      && summary.destinationBindingReady === true, {
      actual: {
        destinationBindingReady: summary.destinationBindingReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        packagePin: summary.packagePin,
        previewStatus: consentEvidence.status,
        providerId: summary.providerId,
        secretReferenceBound: summary.secretReferenceBound
      }
    }),
    check("HIA_WP45_EXECUTION_BLOCKED_WITHOUT_FINAL_APPROVAL", summary.executionDecisionStatus === "blocked-before-network"
      && summary.blockerCount >= 4
      && summary.finalNetworkSendApproved === false
      && summary.credentialAccessGranted === false
      && summary.selectedForExecution === false
      && summary.currentExecutionReady === false, {
      actual: {
        blockerCount: summary.blockerCount,
        credentialAccessGranted: summary.credentialAccessGranted,
        currentExecutionReady: summary.currentExecutionReady,
        executionDecisionStatus: summary.executionDecisionStatus,
        finalNetworkSendApproved: summary.finalNetworkSendApproved,
        selectedForExecution: summary.selectedForExecution
      }
    }),
    check("HIA_WP45_EXECUTION_NO_REAL_PROVIDER_CALL", summary.externalProviderApiCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.providerDestinationContactedCount === 0
      && summary.providerResultProduced === false
      && summary.minimalSmokeExecuted === false, {
      actual: {
        externalProviderApiCallExecuted: summary.externalProviderApiCallExecuted,
        minimalSmokeExecuted: summary.minimalSmokeExecuted,
        providerDestinationContactedCount: summary.providerDestinationContactedCount,
        providerResultProduced: summary.providerResultProduced,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted
      }
    }),
    check("HIA_WP45_EXECUTION_BLOCKED_RESULT_REVIEW_ONLY", summary.blockedProviderResultReady === true
      && summary.refusalResultProduced === true
      && summary.resultKind === "execution-gate-blocked"
      && summary.reviewOnlyOutputRequired === true
      && summary.hostReviewLinkageReady === true
      && summary.requiresHumanReview === true, {
      actual: {
        blockedProviderResultReady: summary.blockedProviderResultReady,
        hostReviewLinkageReady: summary.hostReviewLinkageReady,
        refusalResultProduced: summary.refusalResultProduced,
        requiresHumanReview: summary.requiresHumanReview,
        resultKind: summary.resultKind,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired
      }
    }),
    check("HIA_WP45_EXECUTION_NO_SOURCE_SECRET_REQUEST_RESPONSE", summary.secretValueIncludedCount === 0
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
    check("HIA_WP45_EXECUTION_NO_WRITE_OR_TARGET_MUTATION", summary.directApplyAllowedCount === 0
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
    check("HIA_WP45_EXECUTION_PRIVACY_CLEAN", summary.pathExposureCount === 0, {
      actual: {
        pathExposureCount: summary.pathExposureCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp45-minimal-remote-execution-or-blocked-result-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp45-closeout-with-blocked-result" : "blocked",
    sourceEvidence: {
      requestPreviewFinalConsentPacket: normalizePath(consentPacketEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    executionDecision,
    blockedProviderResult,
    hostReviewLinkageInput,
    checks,
    generatedDocs: {
      executionDecision: normalizePath(decisionPath),
      blockedProviderResult: normalizePath(blockedResultPath),
      hostReviewLinkageInput: normalizePath(hostLinkagePath)
    },
    nextContractInputs: [
      {
        phase: "W-P45.7",
        topic: "closeout-and-wp46-wp47-inputs",
        status: "ready-input",
        reason: "W-P45.6 produced an explicit review-only blocked result before any provider network destination was contacted."
      },
      {
        phase: "W-P46",
        topic: "target-owner-evidence-ingestion",
        status: "blocked-provider-result-review-only",
        reason: "No target-owner branch, pull request, sandbox, command or mutation may be created from this blocked result by HIA automation."
      },
      {
        phase: "W-P47",
        topic: "checked-apply-write-pilot-preparation",
        status: "review-only-input",
        reason: "The blocked result can be displayed in host review surfaces, but it cannot trigger checked apply or workspace writes."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P45 minimal remote execution or blocked result evidence");
  assert.equal(hardFailures.length, 0, `W-P45 minimal remote execution gate has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(decisionPath, renderDecisionMarkdown(evidence), "utf8");
  await writeFile(blockedResultPath, renderBlockedResultMarkdown(evidence), "utf8");
  await writeFile(hostLinkagePath, renderHostLinkageMarkdown(evidence), "utf8");
  console.log(`W-P45 minimal remote execution or blocked result evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P45 execution decision prepared at ${normalizePath(decisionPath)}`);
  console.log(`W-P45 blocked provider review result prepared at ${normalizePath(blockedResultPath)}`);
  console.log(`W-P45 host review linkage input prepared at ${normalizePath(hostLinkagePath)}`);
}

function createExecutionDecision(consentEvidence) {
  const summary = consentEvidence.summary ?? {};
  const blockers = [
    blocker("final-network-send-not-approved", summary.finalNetworkSendApproved !== true, "final network send has not been approved by the user"),
    blocker("credential-access-not-granted", summary.credentialAccessGranted !== true, "host secret access has not been granted"),
    blocker("provider-not-selected-for-execution", summary.selectedForExecution !== true, "provider was selected for binding, not execution"),
    blocker("current-execution-not-ready", summary.currentExecutionReady !== true, "execution readiness remains false after request preview"),
    blocker("request-body-not-bound", summary.requestBodyIncludedCount === 0, "request body/model/input remain deferred to final consent"),
    blocker("response-body-not-available", summary.responseBodyIncludedCount === 0, "no provider response body exists because no API call was made")
  ].filter((item) => item.blocked);

  return {
    contract: "hia-wp45-host-mediated-execution-decision",
    contractVersion: "0.1.0-draft",
    providerId: summary.providerId,
    packagePin: summary.packagePin,
    destinationRef: "openai.responses-api.responses-endpoint",
    decisionStatus: blockers.length === 0 ? "would-execute-minimal-smoke" : "blocked-before-network",
    decisionKind: blockers.length === 0 ? "minimal-remote-smoke" : "explicit-blocked-result",
    finalNetworkSendApproved: summary.finalNetworkSendApproved === true,
    credentialAccessGranted: summary.credentialAccessGranted === true,
    selectedForExecution: summary.selectedForExecution === true,
    currentExecutionReady: summary.currentExecutionReady === true,
    hostMediatorRequired: summary.hostMediatorRequired === true,
    providerAdapterNetworkAllowed: false,
    providerAdapterWriteAllowed: false,
    destinationContacted: false,
    externalProviderApiCallExecuted: false,
    blockers
  };
}

function blocker(id, blocked, reason) {
  return {
    id,
    blocked,
    reason,
    evidenceValue: blocked ? "missing-or-false" : "satisfied"
  };
}

function createBlockedProviderResult(consentEvidence, executionDecision) {
  return {
    contract: "hia-wp45-provider-review-blocked-result",
    contractVersion: "0.1.0-draft",
    resultId: "wp45.6.blocked.openai.responses-api.final-consent",
    providerId: consentEvidence.summary?.providerId,
    packagePin: consentEvidence.summary?.packagePin,
    resultKind: "execution-gate-blocked",
    resultStatus: "blocked-before-network",
    producedByProvider: false,
    producedByGate: true,
    displaySeverity: "warning",
    reviewOnlyOutputRequired: true,
    requiresHumanReview: true,
    mayTriggerCheckedApply: false,
    mayProduceDirectEdit: false,
    mayWriteWorkspace: false,
    mayMutateTargetRepository: false,
    destinationContacted: false,
    externalProviderApiCallExecuted: false,
    reasonCodes: executionDecision.blockers.map((item) => item.id),
    localizedSummary: {
      "zh-CN": "真实 provider 调用已在联网前被阻止：缺少 final network-send approval 与宿主 secret access。",
      en: "The real provider call was blocked before network access because final network-send approval and host secret access are missing."
    },
    recommendedNextAction: {
      "zh-CN": "若确需真实 smoke，应由用户显式批准 final network send，并由宿主安全地提供 secret reference 执行权限。",
      en: "For a real smoke, the user must explicitly approve final network send and the host must safely grant execution access to the secret reference."
    }
  };
}

function createHostReviewLinkageInput(blockedProviderResult, executionDecision) {
  return {
    contract: "hia-wp45-provider-result-host-review-linkage-input",
    contractVersion: "0.1.0-draft",
    status: "ready-for-host-review-display",
    itemCount: 1,
    reviewItems: [
      {
        id: blockedProviderResult.resultId,
        kind: blockedProviderResult.resultKind,
        severity: blockedProviderResult.displaySeverity,
        providerId: blockedProviderResult.providerId,
        resultStatus: blockedProviderResult.resultStatus,
        reviewOnlyOutputRequired: true,
        requiresHumanReview: true,
        reasonCodes: blockedProviderResult.reasonCodes,
        sourceBodyIncluded: false,
        requestBodyIncluded: false,
        responseBodyIncluded: false,
        credentialValueIncluded: false,
        checkedApplyTriggerIncluded: false,
        directEditObjectIncluded: false
      }
    ],
    hostProjections: [
      projection("vscode", "review-panel"),
      projection("devtools", "browser-panel"),
      projection("visual-studio", "review-tool-window")
    ],
    decisionRef: {
      decisionStatus: executionDecision.decisionStatus,
      blockerCount: executionDecision.blockers.length
    }
  };
}

function projection(hostId, surface) {
  return {
    hostId,
    surface,
    status: "ready-for-review-only-display",
    mayExecuteProvider: false,
    mayTriggerCheckedApply: false,
    mayWriteWorkspace: false,
    mayMutateTargetRepository: false
  };
}

function summarize({ blockedProviderResult, consentEvidence, executionDecision, hostReviewLinkageInput }) {
  const summary = consentEvidence.summary ?? {};
  const combinedForPrivacy = {
    blockedProviderResult,
    executionDecision,
    hostReviewLinkageInput
  };
  const serialized = JSON.stringify(combinedForPrivacy);
  return {
    phase: "W-P45.6",
    previewPacketReady: consentEvidence.status === "ready-for-wp45-execution-or-blocked-result",
    inputHardFailureCount: summary.hardFailureCount ?? 0,
    providerId: summary.providerId,
    packagePin: summary.packagePin,
    secretReferenceBound: summary.secretReferenceBound === true,
    destinationBindingReady: summary.destinationBindingReady === true,
    finalConsentReady: summary.finalConsentReady === true,
    finalNetworkSendApproved: summary.finalNetworkSendApproved === true,
    credentialAccessGranted: summary.credentialAccessGranted === true,
    selectedForExecution: summary.selectedForExecution === true,
    currentExecutionReady: summary.currentExecutionReady === true,
    executionDecisionStatus: executionDecision.decisionStatus,
    blockerCount: executionDecision.blockers.length,
    finalApprovalBlockerCount: executionDecision.blockers.filter((item) => item.id === "final-network-send-not-approved").length,
    credentialAccessBlockerCount: executionDecision.blockers.filter((item) => item.id === "credential-access-not-granted").length,
    executionSelectionBlockerCount: executionDecision.blockers.filter((item) => item.id === "provider-not-selected-for-execution").length,
    readinessBlockerCount: executionDecision.blockers.filter((item) => item.id === "current-execution-not-ready").length,
    requestBodyBindingBlockerCount: executionDecision.blockers.filter((item) => item.id === "request-body-not-bound").length,
    responseBodyBlockerCount: executionDecision.blockers.filter((item) => item.id === "response-body-not-available").length,
    minimalSmokeExecuted: false,
    externalProviderApiCallExecuted: false,
    realRemoteProviderInvocationExecuted: false,
    providerDestinationContactedCount: 0,
    providerResultProduced: false,
    refusalResultProduced: true,
    blockedProviderResultReady: blockedProviderResult.resultStatus === "blocked-before-network",
    resultKind: blockedProviderResult.resultKind,
    reviewOnlyOutputRequired: blockedProviderResult.reviewOnlyOutputRequired === true,
    requiresHumanReview: blockedProviderResult.requiresHumanReview === true,
    hostReviewLinkageReady: hostReviewLinkageInput.status === "ready-for-host-review-display",
    hostProjectionCount: hostReviewLinkageInput.hostProjections.length,
    hostProjectionReadyCount: hostReviewLinkageInput.hostProjections.filter((item) => item.status === "ready-for-review-only-display").length,
    secretValueIncludedCount: summary.secretValueIncludedCount ?? 0,
    sourceTextIncludedCount: summary.sourceTextIncludedCount ?? 0,
    requestBodyIncludedCount: summary.requestBodyIncludedCount ?? 0,
    responseBodyIncludedCount: summary.responseBodyIncludedCount ?? 0,
    directApplyAllowedCount: summary.directApplyAllowedCount ?? 0,
    checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount ?? 0,
    workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount ?? 0,
    targetRepositoryMutationCount: summary.targetRepositoryMutationCount ?? 0,
    directEditObjectCount: countDirectEditObjects(combinedForPrivacy),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(combinedForPrivacy),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(combinedForPrivacy),
    pathExposureCount: countPathExposure(serialized),
    nextStage: "W-P45.7 Closeout And W-P46/W-P47 Inputs"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function renderDecisionMarkdown(evidence) {
  const lines = [
    "# W-P45.6 Minimal Remote Execution Decision",
    "",
    `Status / 状态：\`${evidence.executionDecision.decisionStatus}\``,
    "",
    "中文：当前没有 final network-send approval，也没有 credential access，因此 gate 在联网前阻止执行。",
    "",
    "| Blocker | Reason |",
    "| --- | --- |"
  ];
  for (const item of evidence.executionDecision.blockers) {
    lines.push(`| \`${item.id}\` | ${item.reason} |`);
  }
  lines.push("");
  lines.push("No provider destination was contacted. No request body, response body, source text or secret value was included.");
  return `${lines.join("\n")}\n`;
}

function renderBlockedResultMarkdown(evidence) {
  const result = evidence.blockedProviderResult;
  const lines = [
    "# W-P45.6 Blocked Provider Review Result",
    "",
    `Result / 结果：\`${result.resultKind}\``,
    "",
    result.localizedSummary["zh-CN"],
    "",
    result.localizedSummary.en,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Provider | \`${result.providerId}\` |`,
    `| Package pin | \`${result.packagePin}\` |`,
    `| Produced by provider | ${result.producedByProvider} |`,
    `| Produced by gate | ${result.producedByGate} |`,
    `| Review only | ${result.reviewOnlyOutputRequired} |`,
    `| Checked apply trigger | ${result.mayTriggerCheckedApply} |`,
    `| Destination contacted | ${result.destinationContacted} |`
  ];
  return `${lines.join("\n")}\n`;
}

function renderHostLinkageMarkdown(evidence) {
  const lines = [
    "# W-P45.6 Host Review Linkage Input",
    "",
    "该文件供 W-P45.7 closeout 与后续宿主 review surface 使用。它只描述 blocked result 的显示输入，不包含 direct edit、checked apply trigger、workspace write 或 target mutation。",
    "",
    "| Host | Surface | Status |",
    "| --- | --- | --- |"
  ];
  for (const item of evidence.hostReviewLinkageInput.hostProjections) {
    lines.push(`| \`${item.hostId}\` | \`${item.surface}\` | \`${item.status}\` |`);
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
