import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp45-provider-execution-boundary-contract");
const evidencePath = path.join(outputRoot, "evidence.json");
const envelopePath = path.join(outputRoot, "host-mediated-remote-provider-execution-envelope.md");
const stateModelPath = path.join(outputRoot, "execution-boundary-state-model.md");
const hostNotesPath = path.join(outputRoot, "host-implementation-notes.md");
const intakePath = path.join(rootDir, "dist", "wp45-controlled-provider-execution-intake", "evidence.json");

await main();

/**
 * 生成 W-P45.2 provider execution boundary contract evidence。
 * Generate W-P45.2 provider execution boundary contract evidence.
 *
 * W-P45.2 defines the host-mediated remote provider execution envelope. It
 * preserves the P1 provider adapter as review-only and network-disabled, while
 * assigning secret storage, destination allowlists, network mediation, consent,
 * redacted audit and final execution authority to the host boundary.
 *
 * 中文：W-P45.2 定义 host-mediated remote provider execution envelope。它保持
 * P1 provider adapter 为 review-only / network-disabled，并把 secret storage、
 * destination allowlist、network mediation、consent、redacted audit 和最终执行权
 * 放在宿主边界。
 *
 * @returns {Promise<void>} Writes public-safe boundary contract evidence.
 */
async function main() {
  const intake = JSON.parse(await readFile(intakePath, "utf8"));
  const executionEnvelope = createExecutionEnvelope(intake);
  const stateModel = createStateModel();
  const hostImplementationNotes = createHostImplementationNotes();
  const summary = summarize({ executionEnvelope, hostImplementationNotes, intake, stateModel });
  const checks = [
    check("HIA_WP45_BOUNDARY_INPUT_READY", summary.intakeReady === true
      && summary.intakeHardFailureCount === 0
      && summary.intakeBlockingGateCount >= 7, {
      actual: {
        intakeBlockingGateCount: summary.intakeBlockingGateCount,
        intakeHardFailureCount: summary.intakeHardFailureCount,
        intakeStatus: intake.status
      }
    }),
    check("HIA_WP45_BOUNDARY_HOST_MEDIATED", summary.executionOwner === "host-mediated"
      && summary.providerAdapterNetworkAllowed === false
      && summary.providerAdapterWriteAllowed === false
      && summary.hostMediatorRequired === true
      && summary.finalHumanConfirmationRequired === true, {
      actual: {
        executionOwner: summary.executionOwner,
        finalHumanConfirmationRequired: summary.finalHumanConfirmationRequired,
        hostMediatorRequired: summary.hostMediatorRequired,
        providerAdapterNetworkAllowed: summary.providerAdapterNetworkAllowed,
        providerAdapterWriteAllowed: summary.providerAdapterWriteAllowed
      }
    }),
    check("HIA_WP45_BOUNDARY_SECRET_DESTINATION_CONSENT_GATES", summary.secretValueInEnvelope === false
      && summary.secretRefOnly === true
      && summary.destinationHttpsOnly === true
      && summary.placeholderDestinationAllowed === false
      && summary.privateNetworkAllowed === false
      && summary.requiredConsentCount >= 4, {
      actual: {
        destinationHttpsOnly: summary.destinationHttpsOnly,
        placeholderDestinationAllowed: summary.placeholderDestinationAllowed,
        privateNetworkAllowed: summary.privateNetworkAllowed,
        requiredConsentCount: summary.requiredConsentCount,
        secretRefOnly: summary.secretRefOnly,
        secretValueInEnvelope: summary.secretValueInEnvelope
      }
    }),
    check("HIA_WP45_BOUNDARY_SOURCE_PRIVACY_DEFAULT_DENY", summary.sourcePolicy === "none"
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyAllowedInRequest === false
      && summary.responseBodyAllowedInEvidence === false
      && summary.auditSourceTextAllowed === false, {
      actual: {
        auditSourceTextAllowed: summary.auditSourceTextAllowed,
        responseBodyAllowedInEvidence: summary.responseBodyAllowedInEvidence,
        sourceBodyAllowedInRequest: summary.sourceBodyAllowedInRequest,
        sourcePolicy: summary.sourcePolicy,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP45_BOUNDARY_REVIEW_ONLY_NO_WRITE", summary.resultShapeCount >= 4
      && summary.reviewOnlyOutputRequired === true
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        resultShapeCount: summary.resultShapeCount,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP45_BOUNDARY_STATE_MODEL_BLOCKS_EARLY_EXECUTION", summary.stateCount >= 9
      && summary.hasFinalApprovalBeforeExecuting === true
      && summary.hasBlockedStates === true
      && summary.currentExecutionReady === false
      && summary.externalNetworkCallExecuted === false
      && summary.destinationContactedCount === 0, {
      actual: {
        currentExecutionReady: summary.currentExecutionReady,
        destinationContactedCount: summary.destinationContactedCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        hasBlockedStates: summary.hasBlockedStates,
        hasFinalApprovalBeforeExecuting: summary.hasFinalApprovalBeforeExecuting,
        stateCount: summary.stateCount
      }
    }),
    check("HIA_WP45_BOUNDARY_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp45-provider-execution-boundary-contract-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp45-concrete-provider-identity-packet" : "blocked",
    sourceEvidence: {
      controlledProviderExecutionIntake: normalizePath(intakePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    executionEnvelope,
    stateModel,
    hostImplementationNotes,
    checks,
    generatedDocs: {
      executionEnvelope: normalizePath(envelopePath),
      stateModel: normalizePath(stateModelPath),
      hostImplementationNotes: normalizePath(hostNotesPath)
    },
    nextContractInputs: [
      {
        phase: "W-P45.3",
        topic: "concrete-provider-identity-and-package-pin-packet",
        status: "ready-input",
        reasonZh: "W-P45.2 已定义 host-mediated execution envelope；下一步可以选择真实 provider/package/version/provenance。"
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P45 provider execution boundary contract evidence");
  assert.equal(hardFailures.length, 0, `W-P45 provider execution boundary contract has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(envelopePath, renderEnvelope(evidence), "utf8");
  await writeFile(stateModelPath, renderStateModel(evidence), "utf8");
  await writeFile(hostNotesPath, renderHostNotes(evidence), "utf8");
  console.log(`W-P45 provider execution boundary evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P45 host-mediated envelope prepared at ${normalizePath(envelopePath)}`);
}

function createExecutionEnvelope(intake) {
  return {
    contract: "hia-host-mediated-remote-provider-execution-envelope",
    contractVersion: "0.1.0-draft",
    status: "contract-defined-execution-not-yet-authorized",
    phase: "W-P45.2",
    executionOwner: "host-mediated",
    providerAdapterBoundary: {
      runtimeKind: "remote-api-through-host-mediator",
      providerAdapterNetworkAllowed: false,
      providerAdapterWriteAllowed: false,
      providerAdapterReceivesSecretValue: false,
      providerAdapterReceivesSourceBody: false,
      providerAdapterProducesDirectEdit: false,
      noteZh: "provider adapter 仍是 review-only；真实 HTTP/network 只能由宿主 mediator 在 final consent 后执行。"
    },
    secretBoundary: {
      mode: "host-managed-secret-reference",
      secretRefOnly: true,
      secretValueInEnvelope: false,
      secretValueInEvidence: false,
      secretValueInAudit: false,
      hostStores: [
        "vscode-secret-storage",
        "chrome-extension-runtime-permission-plus-host-store",
        "visual-studio-host-secret-store-or-dpapi"
      ]
    },
    networkBoundary: {
      hostMediatorRequired: true,
      destinationAllowlistRequired: true,
      destinationHttpsOnly: true,
      placeholderDestinationAllowed: false,
      privateNetworkAllowed: false,
      ambientCredentialsAllowed: false,
      credentialsModeDefault: "omit",
      requestBodySourceTextAllowed: false,
      responseBodyInPublicEvidenceAllowed: false,
      externalNetworkCallExecuted: false,
      destinationContactedCount: 0
    },
    consentBoundary: {
      requiredConsents: [
        "provider-selection",
        "workspace-network",
        "request-preview",
        "final-network-send"
      ],
      finalHumanConfirmationRequired: true,
      consentMayGrantWriteAuthority: false,
      consentMayOverrideSourcePrivacy: false
    },
    sourcePrivacy: {
      sourceExcerptPolicy: "none",
      sourcesContentPolicy: "none",
      sourceBodyAllowedInRequest: false,
      sourceTextAllowedInEvidence: false,
      sourceTextAllowedInAudit: false
    },
    auditBoundary: {
      auditRequired: true,
      auditKind: "redacted-metadata-only",
      credentialValueAllowed: false,
      authorizationHeaderValueAllowed: false,
      requestBodyAllowed: false,
      responseBodyAllowed: false,
      sourceTextAllowed: false,
      localAbsolutePathAllowed: false
    },
    resultBoundary: {
      reviewOnlyOutputRequired: true,
      resultShapes: [
        resultShape("provider-success", "info"),
        resultShape("provider-refusal", "warning"),
        resultShape("provider-rate-limit", "warning"),
        resultShape("provider-error", "error"),
        resultShape("execution-gate-blocked", "warning")
      ],
      actionPolicy: noActionAuthority()
    },
    currentReadiness: {
      fromIntakeStatus: intake.status,
      executionReady: false,
      reasonZh: "W-P45.2 只定义 contract；concrete provider、secret、destination、consent 尚未绑定。"
    }
  };
}

function createStateModel() {
  const states = [
    state("draft", "initial", "Envelope 草案已创建。"),
    state("provider-selected", "pending", "真实 provider identity 与 package pin 已选择。"),
    state("provider-provenance-verified", "pending", "license、repository、registry integrity 与 provenance 已验证。"),
    state("secret-reference-bound", "pending", "host-managed secret reference 已绑定 execution scope。"),
    state("destination-bound", "pending", "真实 HTTPS destination 已进入 allowlist。"),
    state("request-preview-ready", "pending", "metadata-only request preview 已可审查。"),
    state("consent-ready", "pending", "provider/workspace/request consent 均通过。"),
    state("final-human-approved", "pending", "最终 network send 得到人类确认。"),
    state("executing", "blocked-until-final-human-approved", "只有 final-human-approved 后才能进入。"),
    state("result-ingested", "pending", "结果以 review-only shape 接入 host review。"),
    state("blocked", "available", "任一 gate 不满足时进入 blocked/refused shape。"),
    state("aborted", "available", "用户撤销、超时或宿主取消时进入 aborted。")
  ];

  return {
    contract: "hia-host-mediated-remote-provider-execution-state-model",
    contractVersion: "0.1.0-draft",
    status: "defined",
    states,
    invariants: [
      "executing requires final-human-approved",
      "secret value never enters envelope/evidence/audit",
      "source body never enters provider request by default",
      "provider result never grants write authority",
      "blocked state is valid evidence, not a failure"
    ]
  };
}

function createHostImplementationNotes() {
  return {
    contract: "hia-host-mediated-provider-execution-host-notes",
    contractVersion: "0.1.0-draft",
    status: "reference-aligned",
    references: [
      "VS Code SecretStorage API",
      "Chrome extension permissions and host permissions",
      "WHATWG Fetch credentials and CORS model",
      "RFC 9110 HTTP Semantics",
      "Microsoft DPAPI / Visual Studio extensibility"
    ],
    hosts: [
      host("vscode", "Use VS Code SecretStorage for secret refs; host extension owns final confirmation and network mediator."),
      host("devtools", "Use Chrome permissions/host permissions and runtime grants; panel remains review-only and must not trust inspected page data as authority."),
      host("visual-studio", "Use Visual Studio extension host boundary; for Windows secret storage prefer DPAPI or equivalent host-managed store after VSIX audit.")
    ]
  };
}

function summarize({ executionEnvelope, hostImplementationNotes, intake, stateModel }) {
  const serialized = JSON.stringify({ executionEnvelope, hostImplementationNotes, stateModel });
  const actionPolicy = executionEnvelope.resultBoundary.actionPolicy;
  return {
    phase: "W-P45.2",
    intakeReady: intake.status === "ready-for-wp45-provider-execution-boundary-contract",
    intakeHardFailureCount: Number(intake.summary?.hardFailureCount ?? 0),
    intakeBlockingGateCount: Number(intake.summary?.blockingGateCount ?? 0),
    executionOwner: executionEnvelope.executionOwner,
    providerAdapterNetworkAllowed: executionEnvelope.providerAdapterBoundary.providerAdapterNetworkAllowed,
    providerAdapterWriteAllowed: executionEnvelope.providerAdapterBoundary.providerAdapterWriteAllowed,
    hostMediatorRequired: executionEnvelope.networkBoundary.hostMediatorRequired,
    finalHumanConfirmationRequired: executionEnvelope.consentBoundary.finalHumanConfirmationRequired,
    secretValueInEnvelope: executionEnvelope.secretBoundary.secretValueInEnvelope,
    secretRefOnly: executionEnvelope.secretBoundary.secretRefOnly,
    destinationHttpsOnly: executionEnvelope.networkBoundary.destinationHttpsOnly,
    placeholderDestinationAllowed: executionEnvelope.networkBoundary.placeholderDestinationAllowed,
    privateNetworkAllowed: executionEnvelope.networkBoundary.privateNetworkAllowed,
    requiredConsentCount: executionEnvelope.consentBoundary.requiredConsents.length,
    sourcePolicy: executionEnvelope.sourcePrivacy.sourceExcerptPolicy,
    sourcesContentPolicy: executionEnvelope.sourcePrivacy.sourcesContentPolicy,
    sourceBodyAllowedInRequest: executionEnvelope.sourcePrivacy.sourceBodyAllowedInRequest,
    responseBodyAllowedInEvidence: executionEnvelope.networkBoundary.responseBodyInPublicEvidenceAllowed,
    auditSourceTextAllowed: executionEnvelope.auditBoundary.sourceTextAllowed,
    resultShapeCount: executionEnvelope.resultBoundary.resultShapes.length,
    reviewOnlyOutputRequired: executionEnvelope.resultBoundary.reviewOnlyOutputRequired,
    directApplyAllowedCount: countTrue([actionPolicy.directApplyAllowed]),
    checkedApplyTriggeredCount: countTrue([actionPolicy.checkedApplyTriggered]),
    workspaceWriteAllowedCount: countTrue([actionPolicy.workspaceWriteAllowed]),
    targetRepositoryMutationCount: countTrue([actionPolicy.targetRepositoryMutationAllowed]),
    directEditObjectCount: countDirectEditObjects({ executionEnvelope, hostImplementationNotes, stateModel }),
    stateCount: stateModel.states.length,
    hasFinalApprovalBeforeExecuting: stateModel.invariants.includes("executing requires final-human-approved"),
    hasBlockedStates: stateModel.states.some((item) => item.id === "blocked"),
    currentExecutionReady: executionEnvelope.currentReadiness.executionReady,
    externalNetworkCallExecuted: executionEnvelope.networkBoundary.externalNetworkCallExecuted,
    destinationContactedCount: executionEnvelope.networkBoundary.destinationContactedCount,
    credentialValueIncludedCount: countTrue([
      executionEnvelope.secretBoundary.secretValueInEnvelope,
      executionEnvelope.secretBoundary.secretValueInEvidence,
      executionEnvelope.secretBoundary.secretValueInAudit,
      executionEnvelope.auditBoundary.credentialValueAllowed,
      executionEnvelope.auditBoundary.authorizationHeaderValueAllowed
    ]),
    sourceTextIncludedCount: countTrue([
      executionEnvelope.sourcePrivacy.sourceTextAllowedInEvidence,
      executionEnvelope.sourcePrivacy.sourceTextAllowedInAudit,
      executionEnvelope.auditBoundary.sourceTextAllowed,
      executionEnvelope.auditBoundary.requestBodyAllowed
    ]),
    pathExposureCount: countPathExposure(serialized),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ executionEnvelope, hostImplementationNotes, stateModel }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ executionEnvelope, hostImplementationNotes, stateModel }),
    nextStage: "W-P45.3 Concrete Provider Identity And Package Pin Packet"
  };
}

function resultShape(kind, severity) {
  return {
    kind,
    mayAttachToReviewPayload: true,
    mayProduceDirectEdit: false,
    mayTriggerCheckedApply: false,
    severity
  };
}

function state(id, status, noteZh) {
  return {
    id,
    noteZh,
    status
  };
}

function host(id, noteEn) {
  return {
    id,
    noteEn,
    status: "contract-input-ready"
  };
}

function noActionAuthority() {
  return {
    requiresHumanReview: true,
    reviewOnlyOutputRequired: true,
    directApplyAllowed: false,
    checkedApplyTriggered: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false
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

function renderEnvelope(evidence) {
  const { executionEnvelope, summary } = evidence;
  const lines = [
    "# W-P45.2 Host-Mediated Remote Provider Execution Envelope",
    "",
    "## 摘要 / Summary",
    "",
    `- Status / 状态：\`${evidence.status}\``,
    `- Execution owner / 执行归属：\`${summary.executionOwner}\``,
    `- Provider adapter network allowed / provider adapter 网络权限：${summary.providerAdapterNetworkAllowed}`,
    `- Host mediator required / 需要宿主 mediator：${summary.hostMediatorRequired}`,
    `- Final human confirmation required / 需要最终人工确认：${summary.finalHumanConfirmationRequired}`,
    "",
    "## Boundaries / 边界",
    "",
    `- Secret mode / secret 模式：\`${executionEnvelope.secretBoundary.mode}\``,
    `- Destination HTTPS-only / destination 仅 HTTPS：${summary.destinationHttpsOnly}`,
    `- Credentials mode default / credentials 默认：\`${executionEnvelope.networkBoundary.credentialsModeDefault}\``,
    `- Source policy / 源码策略：\`${summary.sourcePolicy}\``,
    `- SourcesContent policy：\`${summary.sourcesContentPolicy}\``,
    `- Result review-only / 结果仅审查：${summary.reviewOnlyOutputRequired}`,
    "",
    "W-P45.2 只定义 contract，不选择真实 provider，不绑定 secret value，不执行 external network call。"
  ];
  return `${lines.join("\n")}\n`;
}

function renderStateModel(evidence) {
  const lines = [
    "# W-P45.2 Execution Boundary State Model",
    "",
    "| State | Status | Note |",
    "| --- | --- | --- |"
  ];

  for (const item of evidence.stateModel.states) {
    lines.push(`| \`${item.id}\` | \`${item.status}\` | ${item.noteZh} |`);
  }

  lines.push("");
  lines.push("## Invariants / 不变量");
  lines.push("");
  for (const item of evidence.stateModel.invariants) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderHostNotes(evidence) {
  const lines = [
    "# W-P45.2 Host Implementation Notes",
    "",
    "## 参考对齐 / Reference Alignment",
    ""
  ];

  for (const item of evidence.hostImplementationNotes.references) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Hosts / 宿主");
  lines.push("");
  for (const host of evidence.hostImplementationNotes.hosts) {
    lines.push(`- \`${host.id}\`：${host.noteEn}`);
  }

  return `${lines.join("\n")}\n`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
