import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp36-network-mediation-consent");
const evidencePath = path.join(outputRoot, "evidence.json");
const secretEvidencePath = path.join(rootDir, "dist", "wp36-secret-storage-boundary", "evidence.json");

await main();

/**
 * 准备 W-P36.4 network mediation and consent evidence。
 * Prepare W-P36.4 network mediation and consent evidence.
 *
 * The evidence defines the host-mediated network envelope for remote providers:
 * provider adapters cannot open direct network connections, every external call
 * needs provider/workspace/request consent, allowlisted destinations, redacted
 * audit metadata and explicit refusal/rate-limit handling.
 *
 * 本 evidence 定义 remote provider 的宿主网络中介 envelope：provider adapter
 * 不能直接发起外部连接，每次外部调用都需要 provider/workspace/request consent、
 * allowlisted destination、redacted audit metadata 与显式 refusal/rate-limit 处理。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const secretEvidence = await readJson(secretEvidencePath);
  const networkPolicy = createNetworkPolicy();
  const consentRecords = createConsentRecords();
  const destinationPolicy = createDestinationPolicy();
  const mediationEnvelope = createMediationEnvelope(secretEvidence, consentRecords, destinationPolicy);
  const auditPolicy = createAuditPolicy(mediationEnvelope);
  const refusalPolicy = createRefusalPolicy();
  const rateLimitPolicy = createRateLimitPolicy();
  const privacyBoundary = createPrivacyBoundary();
  const simulatedDecisions = createSimulatedDecisions(consentRecords, destinationPolicy);
  const unsafeNetworkMarkerCount = countUnsafeNetworkMarkers({
    networkPolicy,
    consentRecords,
    destinationPolicy,
    mediationEnvelope,
    auditPolicy,
    privacyBoundary,
    simulatedDecisions
  });
  const summary = {
    secretStorageReady: secretEvidence.status === "ready-for-network-mediation-and-consent",
    remoteProviderCount: secretEvidence.summary?.remoteProviderCount ?? 0,
    invocableRemoteProviderCount: secretEvidence.summary?.invocableRemoteProviderCount ?? -1,
    directProviderNetworkAllowed: networkPolicy.directProviderNetworkAllowed,
    hostMediatorRequired: networkPolicy.hostMediatorRequired,
    destinationAllowlistRequired: destinationPolicy.allowlistRequired,
    httpsRequired: destinationPolicy.httpsRequired,
    privateNetworkAllowed: destinationPolicy.privateNetworkAllowed,
    providerConsentRequired: networkPolicy.consent.providerConsentRequired,
    workspaceConsentRequired: networkPolicy.consent.workspaceConsentRequired,
    requestConsentRequired: networkPolicy.consent.requestConsentRequired,
    consentRecordCount: consentRecords.length,
    approvedConsentRecordCount: consentRecords.filter((record) => record.status === "approved").length,
    blockedConsentRecordCount: consentRecords.filter((record) => record.status === "blocked").length,
    auditRecordRequired: auditPolicy.required,
    auditSecretValueAllowed: auditPolicy.secretValueAllowed,
    auditSourceBodyAllowed: auditPolicy.sourceBodyAllowed,
    sourceExcerptPolicy: privacyBoundary.sourceExcerptPolicy,
    sourcesContentAllowed: privacyBoundary.sourcesContentAllowed,
    sourceBodyAllowed: privacyBoundary.sourceBodyAllowed,
    externalNetworkCallExecuted: mediationEnvelope.execution.externalNetworkCallExecuted,
    remoteInvocationStatus: mediationEnvelope.execution.remoteInvocationStatus,
    refusalPolicyDeclared: refusalPolicy.declared,
    rateLimitPolicyDeclared: rateLimitPolicy.declared,
    unsafeNetworkMarkerCount
  };
  const checks = [
    check("HIA_WP36_NETWORK_SECRET_BOUNDARY_READY", summary.secretStorageReady === true
      && summary.remoteProviderCount >= 1
      && summary.invocableRemoteProviderCount === 0, {
      actual: {
        invocableRemoteProviderCount: summary.invocableRemoteProviderCount,
        remoteProviderCount: summary.remoteProviderCount,
        secretStorageStatus: secretEvidence.status
      }
    }),
    check("HIA_WP36_NETWORK_MEDIATION_REQUIRED", summary.directProviderNetworkAllowed === false
      && summary.hostMediatorRequired === true
      && summary.destinationAllowlistRequired === true
      && summary.httpsRequired === true
      && summary.privateNetworkAllowed === false, {
      actual: {
        destinationAllowlistRequired: summary.destinationAllowlistRequired,
        directProviderNetworkAllowed: summary.directProviderNetworkAllowed,
        hostMediatorRequired: summary.hostMediatorRequired,
        httpsRequired: summary.httpsRequired,
        privateNetworkAllowed: summary.privateNetworkAllowed
      }
    }),
    check("HIA_WP36_NETWORK_CONSENT_SCOPES", summary.providerConsentRequired === true
      && summary.workspaceConsentRequired === true
      && summary.requestConsentRequired === true
      && summary.consentRecordCount >= 3
      && summary.approvedConsentRecordCount >= 1
      && summary.blockedConsentRecordCount >= 1, {
      actual: {
        approvedConsentRecordCount: summary.approvedConsentRecordCount,
        blockedConsentRecordCount: summary.blockedConsentRecordCount,
        consentRecordCount: summary.consentRecordCount,
        providerConsentRequired: summary.providerConsentRequired,
        requestConsentRequired: summary.requestConsentRequired,
        workspaceConsentRequired: summary.workspaceConsentRequired
      }
    }),
    check("HIA_WP36_NETWORK_AUDIT_REDACTED", summary.auditRecordRequired === true
      && summary.auditSecretValueAllowed === false
      && summary.auditSourceBodyAllowed === false
      && auditPolicy.requiredFields.includes("consentRecordId")
      && auditPolicy.requiredFields.includes("destinationId"), {
      actual: {
        auditSecretValueAllowed: summary.auditSecretValueAllowed,
        auditSourceBodyAllowed: summary.auditSourceBodyAllowed,
        requiredFields: auditPolicy.requiredFields
      }
    }),
    check("HIA_WP36_NETWORK_PRIVACY_BOUNDARY", summary.sourceExcerptPolicy === "none"
      && summary.sourcesContentAllowed === false
      && summary.sourceBodyAllowed === false
      && privacyBoundary.releaseGateRequiredBeforeSourceExcerpt === true, {
      actual: {
        releaseGateRequiredBeforeSourceExcerpt: privacyBoundary.releaseGateRequiredBeforeSourceExcerpt,
        sourceBodyAllowed: summary.sourceBodyAllowed,
        sourceExcerptPolicy: summary.sourceExcerptPolicy,
        sourcesContentAllowed: summary.sourcesContentAllowed
      }
    }),
    check("HIA_WP36_NETWORK_RATE_LIMIT_REFUSAL_DECLARED", summary.refusalPolicyDeclared === true
      && summary.rateLimitPolicyDeclared === true
      && refusalPolicy.outputKind === "refusal"
      && rateLimitPolicy.auditOutcome === "rate-limited", {
      actual: {
        refusalOutputKind: refusalPolicy.outputKind,
        rateLimitAuditOutcome: rateLimitPolicy.auditOutcome
      }
    }),
    check("HIA_WP36_NETWORK_NO_EXTERNAL_CALL_IN_PHASE", summary.externalNetworkCallExecuted === false
      && summary.remoteInvocationStatus === "blocked-until-source-privacy-and-safe-invocation-gates", {
      actual: {
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        remoteInvocationStatus: summary.remoteInvocationStatus
      }
    }),
    check("HIA_WP36_NETWORK_NO_UNSAFE_MARKERS", summary.unsafeNetworkMarkerCount === 0, {
      actual: {
        unsafeNetworkMarkerCount: summary.unsafeNetworkMarkerCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp36-network-mediation-consent-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-source-excerpt-opt-in-and-privacy-gate" : "blocked",
    sourceEvidence: {
      secretStorageBoundary: normalizePath(secretEvidencePath)
    },
    references: [
      {
        id: "vscode-workspace-trust",
        source: "https://code.visualstudio.com/api/extension-capabilities/common-capabilities",
        relevance: "Workspace trust informs per-workspace network consent."
      },
      {
        id: "owasp-logging",
        source: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
        relevance: "Network audit logs need redaction and integrity boundaries."
      },
      {
        id: "owasp-api-security",
        source: "https://owasp.org/API-Security/",
        relevance: "API security risks inform mediated remote provider calls."
      },
      {
        id: "fetch-standard",
        source: "https://fetch.spec.whatwg.org/",
        relevance: "Host-mediated network envelope can map to Fetch-style request/response semantics without exposing direct provider fetch authority."
      },
      {
        id: "rfc9110-http-semantics",
        source: "https://www.rfc-editor.org/rfc/rfc9110",
        relevance: "HTTP semantics inform method, status and redirection policy."
      }
    ],
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    networkPolicy,
    consentRecords,
    destinationPolicy,
    mediationEnvelope,
    auditPolicy,
    refusalPolicy,
    rateLimitPolicy,
    privacyBoundary,
    simulatedDecisions,
    checks,
    nextContractInputs: [
      {
        phase: "W-P36.5",
        topic: "source-excerpt-opt-in-and-privacy-gate",
        reason: "Network consent is modeled, but source excerpts remain disabled until a separate privacy gate exists."
      },
      {
        phase: "W-P36.6",
        topic: "safe-invocation-dry-run",
        reason: "A later dry-run can use this mediation envelope without granting direct provider network authority."
      }
    ],
    manualChecks: [
      "Confirm concrete provider hosts route remote calls through host mediation rather than adapter-owned fetch or HTTP clients.",
      "Confirm consent UI shows provider, workspace, request purpose, destination and data classes before the call.",
      "Confirm rate-limit, refusal and network errors return reviewable provider metadata rather than direct edits."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P36 network mediation and consent evidence");
  assert.equal(hardFailures.length, 0, `W-P36 network mediation and consent has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P36 network mediation and consent evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createNetworkPolicy() {
  return {
    contract: "hia-provider-network-mediation-policy",
    contractVersion: "0.1.0-draft",
    directProviderNetworkAllowed: false,
    hostMediatorRequired: true,
    adapterFetchAuthority: "denied",
    consent: {
      providerConsentRequired: true,
      workspaceConsentRequired: true,
      requestConsentRequired: true,
      consentExpiryRequired: true,
      consentRevocationRequired: true
    },
    dataClasses: {
      defaultAllowed: ["provider-id", "request-id", "locale", "profile-id", "review-item-id", "secret-ref-id"],
      sourceExcerptAllowedByDefault: false,
      sourceBodyAllowed: false,
      sourcesContentAllowed: false
    }
  };
}

function createConsentRecords() {
  return [
    {
      contract: "hia-provider-network-consent-record",
      contractVersion: "0.1.0-draft",
      id: "consent.provider.remote-api-provider-template",
      providerId: "remote-api-provider-template",
      scope: "provider",
      status: "approved",
      approvedDataClasses: ["provider-id", "request-id", "locale", "profile-id", "secret-ref-id"],
      expires: "per-user-policy",
      revocable: true
    },
    {
      contract: "hia-provider-network-consent-record",
      contractVersion: "0.1.0-draft",
      id: "consent.workspace.default",
      providerId: "remote-api-provider-template",
      scope: "workspace",
      status: "blocked",
      approvedDataClasses: [],
      expires: "not-approved",
      revocable: true
    },
    {
      contract: "hia-provider-network-consent-record",
      contractVersion: "0.1.0-draft",
      id: "consent.request.preview",
      providerId: "remote-api-provider-template",
      scope: "request",
      status: "blocked",
      approvedDataClasses: [],
      expires: "single-request",
      revocable: true
    }
  ];
}

function createDestinationPolicy() {
  return {
    contract: "hia-provider-network-destination-policy",
    contractVersion: "0.1.0-draft",
    allowlistRequired: true,
    httpsRequired: true,
    privateNetworkAllowed: false,
    redirectPolicy: "same-origin-or-revalidate-consent",
    destinations: [
      {
        id: "remote-api-provider-template.primary",
        providerId: "remote-api-provider-template",
        origin: "provider-api.example.invalid",
        scheme: "https",
        status: "declared-not-contacted"
      }
    ]
  };
}

function createMediationEnvelope(secretEvidence, consentRecords, destinationPolicy) {
  return {
    contract: "hia-provider-network-mediation-envelope",
    contractVersion: "0.1.0-draft",
    providerId: "remote-api-provider-template",
    requestId: "network-dry-run-preview",
    consentRecordIds: consentRecords.map((record) => record.id),
    destinationId: destinationPolicy.destinations[0].id,
    secretReferenceIds: secretEvidence.secretReferences.map((secretRef) => secretRef.referenceId),
    methodPolicy: {
      allowedMethods: ["POST"],
      bodyFormat: "provider-request-json-without-source-body",
      maxPayloadClass: "metadata-only"
    },
    execution: {
      externalNetworkCallExecuted: false,
      remoteInvocationStatus: "blocked-until-source-privacy-and-safe-invocation-gates",
      reason: "W-P36.4 defines mediation and consent only; it does not call the remote provider."
    }
  };
}

function createAuditPolicy(mediationEnvelope) {
  return {
    contract: "hia-provider-network-audit-policy",
    contractVersion: "0.1.0-draft",
    required: true,
    secretValueAllowed: false,
    sourceBodyAllowed: false,
    requiredFields: [
      "providerId",
      "requestId",
      "consentRecordId",
      "destinationId",
      "dataClasses",
      "networkMediatorId",
      "outcome",
      "redaction"
    ],
    previewRecord: {
      providerId: mediationEnvelope.providerId,
      requestId: mediationEnvelope.requestId,
      consentRecordId: mediationEnvelope.consentRecordIds[0],
      destinationId: mediationEnvelope.destinationId,
      dataClasses: ["metadata-only"],
      networkMediatorId: "hia-host-network-mediator",
      outcome: "not-executed-in-wp36.4",
      redaction: "secret-and-source-body-redacted"
    }
  };
}

function createRefusalPolicy() {
  return {
    contract: "hia-provider-network-refusal-policy",
    contractVersion: "0.1.0-draft",
    declared: true,
    outputKind: "refusal",
    refusalReasons: [
      "network-consent-missing",
      "destination-not-allowlisted",
      "source-privacy-gate-missing",
      "provider-rate-limited",
      "provider-policy-refused"
    ]
  };
}

function createRateLimitPolicy() {
  return {
    contract: "hia-provider-network-rate-limit-policy",
    contractVersion: "0.1.0-draft",
    declared: true,
    providerBudgetRequired: true,
    retryAfterRespected: true,
    exponentialBackoffAllowed: true,
    auditOutcome: "rate-limited"
  };
}

function createPrivacyBoundary() {
  return {
    contract: "hia-provider-network-privacy-boundary",
    contractVersion: "0.1.0-draft",
    sourceExcerptPolicy: "none",
    sourceBodyAllowed: false,
    sourcesContentAllowed: false,
    absoluteLocalPathAllowed: false,
    releaseGateRequiredBeforeSourceExcerpt: true
  };
}

function createSimulatedDecisions(consentRecords, destinationPolicy) {
  const workspaceApproved = consentRecords.some((record) => record.scope === "workspace" && record.status === "approved");
  const requestApproved = consentRecords.some((record) => record.scope === "request" && record.status === "approved");
  const destinationAllowed = destinationPolicy.destinations.every((destination) => destination.scheme === "https" && destination.status === "declared-not-contacted");
  return [
    {
      id: "remote-provider-without-workspace-consent",
      decision: workspaceApproved ? "allow" : "block",
      reason: workspaceApproved ? "workspace consent exists" : "workspace consent missing"
    },
    {
      id: "remote-provider-without-request-consent",
      decision: requestApproved ? "allow" : "block",
      reason: requestApproved ? "request consent exists" : "request consent missing"
    },
    {
      id: "remote-provider-destination-policy",
      decision: destinationAllowed ? "candidate" : "block",
      reason: destinationAllowed ? "destination is declared but not contacted in W-P36.4" : "destination policy failed"
    }
  ];
}

function countUnsafeNetworkMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (node.sourceBody || node.sourcesContent || node.secretValue || node.apiKeyValue || node.tokenValue || node.authorizationHeader) {
      count += 1;
    }
    if (node.directProviderNetworkAllowed === true || node.externalNetworkCallExecuted === true) {
      count += 1;
    }
  });
  return count;
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

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
