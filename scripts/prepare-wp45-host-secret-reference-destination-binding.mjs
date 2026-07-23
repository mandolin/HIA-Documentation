import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp45-host-secret-reference-destination-binding");
const evidencePath = path.join(outputRoot, "evidence.json");
const bindingPath = path.join(outputRoot, "host-secret-reference-destination-binding.md");
const auditPath = path.join(outputRoot, "redacted-audit-scope.md");
const readinessPath = path.join(outputRoot, "execution-readiness-after-secret-destination-binding.md");
const providerPinPath = path.join(rootDir, "dist", "wp45-concrete-provider-identity-package-pin", "evidence.json");
const boundaryPath = path.join(rootDir, "dist", "wp45-provider-execution-boundary-contract", "evidence.json");

await main();

/**
 * 生成 W-P45.4 host secret reference and destination binding evidence。
 * Generate W-P45.4 host secret reference and destination binding evidence.
 *
 * W-P45.4 binds the concrete provider selected in W-P45.3 to host-managed
 * secret-reference metadata and a real HTTPS destination allowlist. It never
 * reads credential values, never sends a provider API request, and never
 * includes request bodies, response bodies, source bodies or write authority.
 *
 * 中文：W-P45.4 将 W-P45.3 选择的真实 provider 绑定到宿主管理的 secret 引用
 * 元数据和真实 HTTPS destination allowlist。它不读取凭证值、不发送 provider API
 * 请求，也不包含 request body、response body、源码正文或写入权限。
 *
 * @returns {Promise<void>} Writes public-safe secret/destination binding evidence.
 */
async function main() {
  const providerPinEvidence = JSON.parse(await readFile(providerPinPath, "utf8"));
  const boundary = JSON.parse(await readFile(boundaryPath, "utf8"));
  const binding = createBinding(providerPinEvidence);
  const readinessDelta = createReadinessDelta(binding, boundary);
  const summary = summarize({ binding, boundary, providerPinEvidence, readinessDelta });
  const checks = [
    check("HIA_WP45_SECRET_DEST_INPUT_READY", summary.providerPinReady === true
      && summary.boundaryReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        boundaryStatus: boundary.status,
        inputHardFailureCount: summary.inputHardFailureCount,
        providerPinStatus: providerPinEvidence.status
      }
    }),
    check("HIA_WP45_SECRET_DEST_SECRET_REF_BOUND_BY_REFERENCE", summary.secretReferenceBound === true
      && summary.secretRefOnly === true
      && summary.hostSecretStoreCount >= 3
      && summary.secretValueReadCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.credentialAccessGranted === false, {
      actual: {
        credentialAccessGranted: summary.credentialAccessGranted,
        hostSecretStoreCount: summary.hostSecretStoreCount,
        secretRefOnly: summary.secretRefOnly,
        secretReferenceBound: summary.secretReferenceBound,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        secretValueReadCount: summary.secretValueReadCount
      }
    }),
    check("HIA_WP45_SECRET_DEST_DESTINATION_ALLOWLIST_READY", summary.destinationBindingReady === true
      && summary.destinationCount === 1
      && summary.destinationHttpsOnly === true
      && summary.destinationPlaceholderCount === 0
      && summary.privateNetworkDestinationCount === 0
      && summary.providerDestinationContactedCount === 0, {
      actual: {
        destinationBindingReady: summary.destinationBindingReady,
        destinationCount: summary.destinationCount,
        destinationHttpsOnly: summary.destinationHttpsOnly,
        destinationPlaceholderCount: summary.destinationPlaceholderCount,
        privateNetworkDestinationCount: summary.privateNetworkDestinationCount,
        providerDestinationContactedCount: summary.providerDestinationContactedCount
      }
    }),
    check("HIA_WP45_SECRET_DEST_REDACTED_AUDIT_SCOPE", summary.auditMetadataOnly === true
      && summary.authorizationValueAllowedInAudit === false
      && summary.requestBodyAllowedInAudit === false
      && summary.responseBodyAllowedInAudit === false
      && summary.sourceTextAllowedInAudit === false
      && summary.localAbsolutePathAllowedInAudit === false, {
      actual: {
        auditMetadataOnly: summary.auditMetadataOnly,
        authorizationValueAllowedInAudit: summary.authorizationValueAllowedInAudit,
        localAbsolutePathAllowedInAudit: summary.localAbsolutePathAllowedInAudit,
        requestBodyAllowedInAudit: summary.requestBodyAllowedInAudit,
        responseBodyAllowedInAudit: summary.responseBodyAllowedInAudit,
        sourceTextAllowedInAudit: summary.sourceTextAllowedInAudit
      }
    }),
    check("HIA_WP45_SECRET_DEST_HOST_MEDIATED_BOUNDARY_PRESERVED", summary.providerAdapterNetworkAllowed === false
      && summary.providerAdapterWriteAllowed === false
      && summary.hostMediatorRequired === true
      && summary.finalHumanConfirmationRequired === true
      && summary.reviewOnlyOutputRequired === true, {
      actual: {
        finalHumanConfirmationRequired: summary.finalHumanConfirmationRequired,
        hostMediatorRequired: summary.hostMediatorRequired,
        providerAdapterNetworkAllowed: summary.providerAdapterNetworkAllowed,
        providerAdapterWriteAllowed: summary.providerAdapterWriteAllowed,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired
      }
    }),
    check("HIA_WP45_SECRET_DEST_EXECUTION_STILL_BLOCKED", summary.selectedForExecution === false
      && summary.finalConsentReady === false
      && summary.currentExecutionReady === false
      && summary.externalProviderApiCallExecuted === false
      && summary.nextStage === "W-P45.5 Request Preview And Final Consent Packet", {
      actual: {
        currentExecutionReady: summary.currentExecutionReady,
        externalProviderApiCallExecuted: summary.externalProviderApiCallExecuted,
        finalConsentReady: summary.finalConsentReady,
        nextStage: summary.nextStage,
        selectedForExecution: summary.selectedForExecution
      }
    }),
    check("HIA_WP45_SECRET_DEST_NO_SOURCE_WRITE_OR_PROVIDER_CALL", summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP45_SECRET_DEST_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp45-host-secret-reference-destination-binding-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp45-request-preview-final-consent" : "blocked",
    sourceEvidence: {
      providerIdentityPackagePin: normalizePath(providerPinPath),
      providerExecutionBoundary: normalizePath(boundaryPath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    binding,
    readinessDelta,
    checks,
    generatedDocs: {
      binding: normalizePath(bindingPath),
      redactedAuditScope: normalizePath(auditPath),
      executionReadinessAfterSecretDestinationBinding: normalizePath(readinessPath)
    },
    nextContractInputs: [
      {
        phase: "W-P45.5",
        topic: "request-preview-and-final-consent-packet",
        status: "ready-input",
        reasonZh: "host-managed secret reference 与真实 HTTPS destination allowlist 已按引用绑定；下一步生成 metadata-only request preview 与 final consent packet。"
      },
      {
        phase: "W-P45.6",
        topic: "minimal-remote-execution-or-blocked-result",
        status: "blocked-until-wp45.5",
        reasonZh: "真实 provider/network execution 必须等待 request preview 审查与最终人工确认。"
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P45 host secret destination binding evidence");
  assert.equal(hardFailures.length, 0, `W-P45 host secret destination binding has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(bindingPath, renderBinding(evidence), "utf8");
  await writeFile(auditPath, renderAuditScope(evidence), "utf8");
  await writeFile(readinessPath, renderReadinessDelta(evidence), "utf8");
  console.log(`W-P45 host secret reference destination binding evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P45 host secret reference destination binding packet prepared at ${normalizePath(bindingPath)}`);
}

function createBinding(providerPinEvidence) {
  const providerPacket = providerPinEvidence.providerPacket;
  const providerId = providerPacket.provider.id;
  const packagePin = providerPacket.provider.clientPackage;
  const canonicalSecretRefId = "provider.openai.responses-api.api-key";
  const destination = {
    id: "openai-responses-api",
    providerId,
    scheme: "https",
    host: "api.openai.com",
    path: "/v1/responses",
    method: "POST",
    url: "https://api.openai.com/v1/responses",
    allowlisted: true,
    placeholder: false,
    privateNetwork: false,
    contactedInThisPhase: false,
    credentialsModeDefault: "omit",
    ambientCredentialsAllowed: false,
    authorizationHeaderValueStoredByHostOnly: true,
    authorizationHeaderValueIncluded: false,
    requestBodyIncluded: false,
    responseBodyIncluded: false
  };

  return {
    contract: "hia-host-secret-reference-destination-binding",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.4",
    status: "bound-by-reference-execution-not-authorized",
    provider: {
      id: providerId,
      package: `${packagePin.name}@${packagePin.version}`,
      runtimeKind: providerPacket.provider.runtimeKind
    },
    secretBinding: {
      mode: "host-managed-secret-reference",
      secretReferenceBound: true,
      canonicalSecretRefId,
      secretRefOnly: true,
      providerId,
      valueStatus: "not-read",
      valueReadInThisPhase: false,
      valueIncludedInEvidence: false,
      valueIncludedInAudit: false,
      valueIncludedInRequestPreview: false,
      credentialAccessGranted: false,
      hostReferences: [
        hostSecretReference("vscode", "vscode-secret-storage", canonicalSecretRefId),
        hostSecretReference("devtools", "chrome-extension-host-secret-store", canonicalSecretRefId),
        hostSecretReference("visual-studio", "visual-studio-host-secret-store-or-dpapi", canonicalSecretRefId)
      ]
    },
    destinationBinding: {
      mode: "https-destination-allowlist",
      destinationBindingReady: true,
      destinations: [
        destination
      ],
      destinationContactedCount: 0
    },
    redactedAuditScope: {
      contract: "hia-provider-execution-redacted-audit-scope",
      contractVersion: "0.1.0-draft",
      auditKind: "metadata-only",
      metadataOnly: true,
      allowedFields: [
        "providerId",
        "providerPackage",
        "destinationId",
        "destinationHost",
        "destinationPath",
        "httpMethod",
        "secretRefId",
        "consentIds",
        "requestId",
        "resultShape"
      ],
      forbiddenFields: [
        "credential value",
        "authorization header value",
        "request body",
        "response body",
        "source text",
        "source excerpt",
        "sourcesContent",
        "local absolute path"
      ],
      authorizationValueAllowed: false,
      requestBodyAllowed: false,
      responseBodyAllowed: false,
      sourceTextAllowed: false,
      localAbsolutePathAllowed: false
    },
    executionBoundary: {
      selectedForBinding: true,
      selectedForExecution: false,
      currentExecutionReady: false,
      finalConsentReady: false,
      externalProviderApiCallExecuted: false,
      providerAdapterNetworkAllowed: false,
      providerAdapterWriteAllowed: false,
      hostMediatorRequired: true,
      reviewOnlyOutputRequired: true,
      checkedApplyTriggered: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      directEditObjectAllowed: false
    }
  };
}

function hostSecretReference(hostId, storeKind, canonicalSecretRefId) {
  return {
    hostId,
    storeKind,
    canonicalSecretRefId,
    bindingStatus: "bound-reference-only",
    valueStatus: "not-read",
    valueIncluded: false,
    credentialAccessGranted: false
  };
}

function createReadinessDelta(binding, boundary) {
  return {
    contract: "hia-wp45-execution-readiness-after-secret-destination-binding",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.4",
    status: "secret-destination-bound-execution-still-blocked",
    changedGates: [
      gate("execution-bound-secret-reference", "satisfied-by-wp45.4", binding.secretBinding.canonicalSecretRefId),
      gate("real-https-destination", "satisfied-by-wp45.4", binding.destinationBinding.destinations[0].url)
    ],
    remainingBlockingGates: [
      gate("workspace-request-final-consent", "blocking-until-wp45.5", "provider/workspace/request/final consent 未完成。"),
      gate("real-remote-provider-execution", "blocking-until-wp45.6", "真实 provider/network 仍未执行。")
    ],
    preservedBoundary: {
      executionOwner: boundary.summary?.executionOwner ?? "host-mediated",
      providerAdapterNetworkAllowed: false,
      providerAdapterWriteAllowed: false,
      reviewOnlyOutputRequired: true
    }
  };
}

function summarize({ binding, boundary, providerPinEvidence, readinessDelta }) {
  const destination = binding.destinationBinding.destinations[0];
  const actionPolicy = boundary.executionEnvelope?.resultBoundary?.actionPolicy ?? {};
  const serialized = JSON.stringify({ binding, readinessDelta });
  return {
    phase: "W-P45.4",
    providerPinReady: providerPinEvidence.status === "ready-for-wp45-secret-destination-binding",
    boundaryReady: boundary.status === "ready-for-wp45-concrete-provider-identity-packet",
    inputHardFailureCount: Number(providerPinEvidence.summary?.hardFailureCount ?? 0)
      + Number(boundary.summary?.hardFailureCount ?? 0),
    providerId: binding.provider.id,
    packagePin: binding.provider.package,
    secretReferenceBound: binding.secretBinding.secretReferenceBound,
    secretRefOnly: binding.secretBinding.secretRefOnly,
    hostSecretStoreCount: binding.secretBinding.hostReferences.length,
    secretValueReadCount: countTrue([
      binding.secretBinding.valueReadInThisPhase,
      ...binding.secretBinding.hostReferences.map((item) => item.valueIncluded)
    ]),
    secretValueIncludedCount: countTrue([
      binding.secretBinding.valueIncludedInEvidence,
      binding.secretBinding.valueIncludedInAudit,
      binding.secretBinding.valueIncludedInRequestPreview,
      destination.authorizationHeaderValueIncluded
    ]),
    credentialAccessGranted: binding.secretBinding.credentialAccessGranted
      || binding.secretBinding.hostReferences.some((item) => item.credentialAccessGranted === true),
    destinationBindingReady: binding.destinationBinding.destinationBindingReady,
    destinationCount: binding.destinationBinding.destinations.length,
    destinationHttpsOnly: binding.destinationBinding.destinations.every((item) => item.scheme === "https"),
    destinationPlaceholderCount: binding.destinationBinding.destinations.filter((item) => item.placeholder === true).length,
    privateNetworkDestinationCount: binding.destinationBinding.destinations.filter((item) => item.privateNetwork === true).length,
    providerDestinationContactedCount: binding.destinationBinding.destinationContactedCount,
    auditMetadataOnly: binding.redactedAuditScope.metadataOnly,
    authorizationValueAllowedInAudit: binding.redactedAuditScope.authorizationValueAllowed,
    requestBodyAllowedInAudit: binding.redactedAuditScope.requestBodyAllowed,
    responseBodyAllowedInAudit: binding.redactedAuditScope.responseBodyAllowed,
    sourceTextAllowedInAudit: binding.redactedAuditScope.sourceTextAllowed,
    localAbsolutePathAllowedInAudit: binding.redactedAuditScope.localAbsolutePathAllowed,
    providerAdapterNetworkAllowed: binding.executionBoundary.providerAdapterNetworkAllowed,
    providerAdapterWriteAllowed: binding.executionBoundary.providerAdapterWriteAllowed,
    hostMediatorRequired: binding.executionBoundary.hostMediatorRequired,
    finalHumanConfirmationRequired: boundary.summary?.finalHumanConfirmationRequired === true,
    reviewOnlyOutputRequired: binding.executionBoundary.reviewOnlyOutputRequired,
    selectedForExecution: binding.executionBoundary.selectedForExecution,
    finalConsentReady: binding.executionBoundary.finalConsentReady,
    currentExecutionReady: binding.executionBoundary.currentExecutionReady,
    externalProviderApiCallExecuted: binding.executionBoundary.externalProviderApiCallExecuted,
    sourceTextIncludedCount: countTrue([
      binding.redactedAuditScope.sourceTextAllowed,
      binding.redactedAuditScope.forbiddenFields.includes("source text") === false,
      binding.redactedAuditScope.forbiddenFields.includes("sourcesContent") === false
    ]),
    requestBodyIncludedCount: countTrue([
      destination.requestBodyIncluded,
      binding.redactedAuditScope.requestBodyAllowed
    ]),
    responseBodyIncludedCount: countTrue([
      destination.responseBodyIncluded,
      binding.redactedAuditScope.responseBodyAllowed
    ]),
    directApplyAllowedCount: countTrue([actionPolicy.directApplyAllowed]),
    checkedApplyTriggeredCount: countTrue([
      actionPolicy.checkedApplyTriggered,
      binding.executionBoundary.checkedApplyTriggered
    ]),
    workspaceWriteAllowedCount: countTrue([
      actionPolicy.workspaceWriteAllowed,
      binding.executionBoundary.workspaceWriteAllowed
    ]),
    targetRepositoryMutationCount: countTrue([
      actionPolicy.targetRepositoryMutationAllowed,
      binding.executionBoundary.targetRepositoryMutationAllowed
    ]),
    directEditObjectCount: countDirectEditObjects({ binding, readinessDelta }),
    pathExposureCount: countPathExposure(serialized),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ binding, readinessDelta }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ binding, readinessDelta }),
    nextStage: "W-P45.5 Request Preview And Final Consent Packet"
  };
}

function renderBinding(evidence) {
  const { binding, summary } = evidence;
  const destination = binding.destinationBinding.destinations[0];
  const lines = [
    "# W-P45.4 Host Secret Reference And Destination Binding",
    "",
    "## 摘要 / Summary",
    "",
    `- Status / 状态：\`${evidence.status}\``,
    `- Provider / provider：\`${summary.providerId}\``,
    `- Package pin / 包 pin：\`${summary.packagePin}\``,
    `- Secret ref / secret 引用：\`${binding.secretBinding.canonicalSecretRefId}\``,
    `- Destination / destination：\`${destination.url}\``,
    `- Destination contacted / 已联系 destination：${summary.providerDestinationContactedCount}`,
    "",
    "## Host Secret Stores / 宿主 secret store",
    "",
    "| Host | Store | Status | Value |",
    "| --- | --- | --- | --- |"
  ];

  for (const item of binding.secretBinding.hostReferences) {
    lines.push(`| \`${item.hostId}\` | \`${item.storeKind}\` | \`${item.bindingStatus}\` | \`${item.valueStatus}\` |`);
  }

  lines.push("");
  lines.push("W-P45.4 只绑定 secret reference 与 destination allowlist，不读取 secret value，不访问 provider API。");
  return `${lines.join("\n")}\n`;
}

function renderAuditScope(evidence) {
  const { binding } = evidence;
  const lines = [
    "# W-P45.4 Redacted Audit Scope",
    "",
    `Audit kind / 审计类型：\`${binding.redactedAuditScope.auditKind}\``,
    "",
    "## Allowed Fields / 允许字段",
    ""
  ];

  for (const item of binding.redactedAuditScope.allowedFields) {
    lines.push(`- \`${item}\``);
  }

  lines.push("");
  lines.push("## Forbidden Fields / 禁止字段");
  lines.push("");
  for (const item of binding.redactedAuditScope.forbiddenFields) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderReadinessDelta(evidence) {
  const lines = [
    "# W-P45.4 Execution Readiness After Secret/Destination Binding",
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
