import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp45-request-preview-final-consent-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const previewPath = path.join(outputRoot, "metadata-only-request-preview.md");
const consentPath = path.join(outputRoot, "final-consent-packet.md");
const readinessPath = path.join(outputRoot, "execution-readiness-after-request-preview.md");
const bindingPath = path.join(rootDir, "dist", "wp45-host-secret-reference-destination-binding", "evidence.json");

await main();

/**
 * 生成 W-P45.5 metadata-only request preview and final consent packet。
 * Generate W-P45.5 metadata-only request preview and final consent packet.
 *
 * W-P45.5 creates a reviewable request preview and consent packet without
 * granting final network-send approval. It records which human confirmations
 * are still required before W-P45.6 may execute, and it keeps source text,
 * request bodies, response bodies and credential values out of public evidence.
 *
 * 中文：W-P45.5 生成可审查的 request preview 与 consent packet，但不授予最终
 * network-send 批准。它记录 W-P45.6 执行前仍需哪些人工确认，并继续禁止源码正文、
 * request body、response body 与凭证值进入 public evidence。
 *
 * @returns {Promise<void>} Writes public-safe request preview and consent evidence.
 */
async function main() {
  const bindingEvidence = JSON.parse(await readFile(bindingPath, "utf8"));
  const requestPreview = createRequestPreview(bindingEvidence);
  const consentPacket = createConsentPacket(bindingEvidence, requestPreview);
  const readinessDelta = createReadinessDelta(consentPacket);
  const summary = summarize({ bindingEvidence, consentPacket, readinessDelta, requestPreview });
  const checks = [
    check("HIA_WP45_REQUEST_PREVIEW_INPUT_READY", summary.bindingReady === true
      && summary.inputHardFailureCount === 0
      && summary.secretReferenceBound === true
      && summary.destinationBindingReady === true, {
      actual: {
        bindingStatus: bindingEvidence.status,
        destinationBindingReady: summary.destinationBindingReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        secretReferenceBound: summary.secretReferenceBound
      }
    }),
    check("HIA_WP45_REQUEST_PREVIEW_METADATA_ONLY", summary.requestPreviewReady === true
      && summary.metadataOnlyPreview === true
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.secretValueIncludedCount === 0, {
      actual: {
        metadataOnlyPreview: summary.metadataOnlyPreview,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        requestPreviewReady: summary.requestPreviewReady,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount
      }
    }),
    check("HIA_WP45_REQUEST_PREVIEW_CONSENT_PACKET_COMPLETE", summary.requiredConsentCount === 4
      && summary.providerSelectionConsentRecorded === true
      && summary.workspaceNetworkConsentPrepared === true
      && summary.requestPreviewConsentPrepared === true
      && summary.finalNetworkSendConsentPrepared === true, {
      actual: {
        finalNetworkSendConsentPrepared: summary.finalNetworkSendConsentPrepared,
        providerSelectionConsentRecorded: summary.providerSelectionConsentRecorded,
        requestPreviewConsentPrepared: summary.requestPreviewConsentPrepared,
        requiredConsentCount: summary.requiredConsentCount,
        workspaceNetworkConsentPrepared: summary.workspaceNetworkConsentPrepared
      }
    }),
    check("HIA_WP45_REQUEST_PREVIEW_FINAL_APPROVAL_NOT_GRANTED", summary.finalConsentReady === false
      && summary.finalNetworkSendApproved === false
      && summary.credentialAccessGranted === false
      && summary.selectedForExecution === false
      && summary.currentExecutionReady === false, {
      actual: {
        credentialAccessGranted: summary.credentialAccessGranted,
        currentExecutionReady: summary.currentExecutionReady,
        finalConsentReady: summary.finalConsentReady,
        finalNetworkSendApproved: summary.finalNetworkSendApproved,
        selectedForExecution: summary.selectedForExecution
      }
    }),
    check("HIA_WP45_REQUEST_PREVIEW_HOST_MEDIATED_NO_PROVIDER_CALL", summary.hostMediatorRequired === true
      && summary.providerAdapterNetworkAllowed === false
      && summary.providerAdapterWriteAllowed === false
      && summary.externalProviderApiCallExecuted === false
      && summary.providerDestinationContactedCount === 0, {
      actual: {
        externalProviderApiCallExecuted: summary.externalProviderApiCallExecuted,
        hostMediatorRequired: summary.hostMediatorRequired,
        providerAdapterNetworkAllowed: summary.providerAdapterNetworkAllowed,
        providerAdapterWriteAllowed: summary.providerAdapterWriteAllowed,
        providerDestinationContactedCount: summary.providerDestinationContactedCount
      }
    }),
    check("HIA_WP45_REQUEST_PREVIEW_NO_WRITE_AUTHORITY", summary.reviewOnlyOutputRequired === true
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP45_REQUEST_PREVIEW_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp45-request-preview-final-consent-packet-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp45-execution-or-blocked-result" : "blocked",
    sourceEvidence: {
      hostSecretReferenceDestinationBinding: normalizePath(bindingPath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    requestPreview,
    consentPacket,
    readinessDelta,
    checks,
    generatedDocs: {
      metadataOnlyRequestPreview: normalizePath(previewPath),
      finalConsentPacket: normalizePath(consentPath),
      executionReadinessAfterRequestPreview: normalizePath(readinessPath)
    },
    nextContractInputs: [
      {
        phase: "W-P45.6",
        topic: "minimal-remote-execution-or-explicit-blocked-result",
        status: "ready-input-blocked-until-final-human-approval",
        reasonZh: "metadata-only request preview 与 consent packet 已准备；若没有最终人工确认，W-P45.6 应产出 blocked result，而不是执行 provider/network。"
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P45 request preview final consent evidence");
  assert.equal(hardFailures.length, 0, `W-P45 request preview final consent has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(previewPath, renderRequestPreview(evidence), "utf8");
  await writeFile(consentPath, renderConsentPacket(evidence), "utf8");
  await writeFile(readinessPath, renderReadinessDelta(evidence), "utf8");
  console.log(`W-P45 request preview final consent evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P45 metadata-only request preview prepared at ${normalizePath(previewPath)}`);
}

function createRequestPreview(bindingEvidence) {
  const binding = bindingEvidence.binding;
  const destination = binding.destinationBinding.destinations[0];
  return {
    contract: "hia-metadata-only-provider-request-preview",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.5",
    status: "metadata-only-preview-ready",
    provider: binding.provider,
    destination: {
      id: destination.id,
      scheme: destination.scheme,
      host: destination.host,
      path: destination.path,
      method: destination.method,
      url: destination.url,
      contactedInThisPhase: false
    },
    secretReference: {
      id: binding.secretBinding.canonicalSecretRefId,
      mode: "host-managed-secret-reference",
      valueIncluded: false,
      valueRead: false,
      credentialAccessGranted: false
    },
    requestShape: {
      bodyClass: "openai-responses-minimal-smoke",
      bodyIncluded: false,
      bodyPreviewPolicy: "metadata-only",
      requiredFields: [
        "model",
        "input"
      ],
      modelBindingStatus: "deferred-to-final-consent",
      inputBindingStatus: "deferred-to-final-consent",
      sourceExcerptPolicy: "none",
      sourcesContentPolicy: "none",
      sourceBodyIncluded: false
    },
    responseShape: {
      responseBodyIncluded: false,
      allowedResultShapes: [
        "provider-success",
        "provider-refusal",
        "provider-rate-limit",
        "provider-error",
        "execution-gate-blocked"
      ],
      publicEvidencePolicy: "redacted-metadata-only"
    },
    execution: {
      selectedForExecution: false,
      currentExecutionReady: false,
      externalProviderApiCallExecuted: false,
      providerDestinationContactedCount: 0
    }
  };
}

function createConsentPacket(bindingEvidence, requestPreview) {
  return {
    contract: "hia-provider-final-consent-packet",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.5",
    status: "final-human-approval-required",
    providerId: requestPreview.provider.id,
    destinationId: requestPreview.destination.id,
    secretRefId: requestPreview.secretReference.id,
    consents: [
      consent("provider-selection", "recorded-satisfied-by-wp45.3", true, "已选择真实 provider identity 与 package pin，但不授予执行。"),
      consent("workspace-network", "prepared-requires-human-confirmation", false, "需要用户确认当前工作区允许该 destination 的网络请求。"),
      consent("request-preview", "prepared-requires-human-review", false, "metadata-only request preview 已生成，但 request body/model/input 仍未绑定。"),
      consent("final-network-send", "pending-manual-approval", false, "最终 network send 未批准。")
    ],
    grants: {
      credentialAccess: false,
      networkSend: false,
      execution: false,
      write: false,
      sourceBodyAccess: false
    },
    finalGate: {
      finalHumanApprovalRequired: true,
      finalNetworkSendApproved: false,
      executionAllowedWithoutFinalApproval: false,
      blockedResultRequiredWhenNotApproved: true
    }
  };
}

function consent(id, status, satisfiedByPriorEvidence, noteZh) {
  return {
    id,
    status,
    satisfiedByPriorEvidence,
    approvedForExecution: false,
    noteZh
  };
}

function createReadinessDelta(consentPacket) {
  return {
    contract: "hia-wp45-execution-readiness-after-request-preview",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.5",
    status: "request-preview-ready-final-approval-pending",
    changedGates: [
      gate("workspace-request-final-consent", "prepared-by-wp45.5-final-approval-pending", "consent packet complete; final-network-send not approved")
    ],
    remainingBlockingGates: [
      gate("final-human-network-send", "blocking-until-user-approval", "最终人工确认未授予。"),
      gate("real-remote-provider-execution", "blocking-until-wp45.6-and-final-approval", "真实 provider/network 仍未执行。")
    ],
    finalGate: consentPacket.finalGate
  };
}

function summarize({ bindingEvidence, consentPacket, readinessDelta, requestPreview }) {
  const serialized = JSON.stringify({ consentPacket, readinessDelta, requestPreview });
  const consentById = new Map(consentPacket.consents.map((item) => [item.id, item]));
  return {
    phase: "W-P45.5",
    bindingReady: bindingEvidence.status === "ready-for-wp45-request-preview-final-consent",
    inputHardFailureCount: Number(bindingEvidence.summary?.hardFailureCount ?? 0),
    providerId: requestPreview.provider.id,
    packagePin: requestPreview.provider.package,
    secretReferenceBound: bindingEvidence.summary?.secretReferenceBound === true,
    destinationBindingReady: bindingEvidence.summary?.destinationBindingReady === true,
    requestPreviewReady: requestPreview.status === "metadata-only-preview-ready",
    metadataOnlyPreview: requestPreview.requestShape.bodyPreviewPolicy === "metadata-only",
    requiredConsentCount: consentPacket.consents.length,
    providerSelectionConsentRecorded: consentById.get("provider-selection")?.status === "recorded-satisfied-by-wp45.3",
    workspaceNetworkConsentPrepared: consentById.get("workspace-network")?.status === "prepared-requires-human-confirmation",
    requestPreviewConsentPrepared: consentById.get("request-preview")?.status === "prepared-requires-human-review",
    finalNetworkSendConsentPrepared: consentById.get("final-network-send")?.status === "pending-manual-approval",
    finalConsentReady: false,
    finalNetworkSendApproved: consentPacket.finalGate.finalNetworkSendApproved,
    selectedForExecution: requestPreview.execution.selectedForExecution,
    currentExecutionReady: requestPreview.execution.currentExecutionReady,
    credentialAccessGranted: consentPacket.grants.credentialAccess,
    hostMediatorRequired: true,
    providerAdapterNetworkAllowed: false,
    providerAdapterWriteAllowed: false,
    reviewOnlyOutputRequired: true,
    externalProviderApiCallExecuted: requestPreview.execution.externalProviderApiCallExecuted,
    providerDestinationContactedCount: requestPreview.execution.providerDestinationContactedCount,
    secretValueIncludedCount: countTrue([
      requestPreview.secretReference.valueIncluded,
      requestPreview.secretReference.valueRead
    ]),
    sourceTextIncludedCount: countTrue([
      requestPreview.requestShape.sourceBodyIncluded,
      requestPreview.requestShape.sourceExcerptPolicy !== "none",
      requestPreview.requestShape.sourcesContentPolicy !== "none"
    ]),
    requestBodyIncludedCount: countTrue([
      requestPreview.requestShape.bodyIncluded
    ]),
    responseBodyIncludedCount: countTrue([
      requestPreview.responseShape.responseBodyIncluded
    ]),
    directApplyAllowedCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects({ consentPacket, readinessDelta, requestPreview }),
    pathExposureCount: countPathExposure(serialized),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ consentPacket, readinessDelta, requestPreview }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ consentPacket, readinessDelta, requestPreview }),
    nextStage: "W-P45.6 Minimal Remote Execution Or Explicit Blocked Result"
  };
}

function renderRequestPreview(evidence) {
  const { requestPreview, summary } = evidence;
  const lines = [
    "# W-P45.5 Metadata-Only Request Preview",
    "",
    "## 摘要 / Summary",
    "",
    `- Status / 状态：\`${requestPreview.status}\``,
    `- Provider / provider：\`${summary.providerId}\``,
    `- Package pin / 包 pin：\`${summary.packagePin}\``,
    `- Destination / destination：\`${requestPreview.destination.url}\``,
    `- Secret ref / secret 引用：\`${requestPreview.secretReference.id}\``,
    `- Body included / body 已包含：${requestPreview.requestShape.bodyIncluded}`,
    `- Source excerpt policy / 源码摘录策略：\`${requestPreview.requestShape.sourceExcerptPolicy}\``,
    `- External provider API call executed / 已执行 provider API 调用：${summary.externalProviderApiCallExecuted}`,
    "",
    "本 preview 只展示 destination、secretRef 和 request shape 元数据；model/input/request body 留到最终确认后由宿主 mediator 构造，且不得进入 public evidence。"
  ];
  return `${lines.join("\n")}\n`;
}

function renderConsentPacket(evidence) {
  const lines = [
    "# W-P45.5 Final Consent Packet",
    "",
    `Status / 状态：\`${evidence.consentPacket.status}\``,
    "",
    "| Consent | Status | Approved for execution | Note |",
    "| --- | --- | --- | --- |"
  ];

  for (const item of evidence.consentPacket.consents) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${item.approvedForExecution} | ${item.noteZh} |`);
  }

  lines.push("");
  lines.push("Final network send remains pending manual approval. Without explicit approval, W-P45.6 must produce a blocked result.");
  return `${lines.join("\n")}\n`;
}

function renderReadinessDelta(evidence) {
  const lines = [
    "# W-P45.5 Execution Readiness After Request Preview",
    "",
    `Status / 状态：\`${evidence.readinessDelta.status}\``,
    "",
    "## Changed Gates / 已变化 gate",
    "",
    "| Gate | Status | Evidence |",
    "| --- | --- | --- |"
  ];

  for (const item of evidence.readinessDelta.changedGates) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${item.evidenceValue} |`);
  }

  lines.push("");
  lines.push("## Remaining Blocking Gates / 剩余阻塞 gate");
  lines.push("");
  lines.push("| Gate | Status | Evidence |");
  lines.push("| --- | --- | --- |");
  for (const item of evidence.readinessDelta.remainingBlockingGates) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${item.evidenceValue} |`);
  }

  return `${lines.join("\n")}\n`;
}

function gate(id, status, evidenceValue) {
  return {
    id,
    status,
    evidenceValue
  };
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
