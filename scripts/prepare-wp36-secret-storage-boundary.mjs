import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp36-secret-storage-boundary");
const evidencePath = path.join(outputRoot, "evidence.json");
const registryEvidencePath = path.join(rootDir, "dist", "wp36-provider-registry-installation-policy", "evidence.json");

await main();

/**
 * 准备 W-P36.3 secret storage boundary evidence。
 * Prepare W-P36.3 secret storage boundary evidence.
 *
 * The boundary models provider credentials as opaque host-managed references.
 * Requests, results, logs and evidence may carry secret reference metadata, but
 * never the credential value itself. This prepares remote providers for later
 * network mediation without enabling network calls in this phase.
 *
 * 本边界把 provider credential 建模为宿主管理的不透明引用。request、result、
 * log 和 evidence 可以携带 secret reference metadata，但绝不携带凭据值本身。
 * 这为后续 remote provider network mediation 做准备，但本阶段不启用网络调用。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const registry = await readJson(registryEvidencePath);
  const policy = createSecretStoragePolicy();
  const hostBoundaries = createHostBoundaries();
  const secretReferences = createSecretReferences();
  const requestBoundary = createProviderRequestBoundary(secretReferences);
  const auditBoundary = createAuditBoundary(secretReferences);
  const releaseGate = createReleaseGate();
  const forbiddenSecretValueFieldCount = countForbiddenSecretValueFields({
    policy,
    hostBoundaries,
    secretReferences,
    requestBoundary,
    auditBoundary,
    releaseGate
  });
  const invocableRemoteProviderCount = registry.registryEntries
    .filter((entry) => entry.runtimeKind === "remote-api" && entry.invocation.status === "invocable")
    .length;
  const summary = {
    registryReady: registry.status === "ready-for-secret-storage-boundary",
    secretStorageBoundaryRequired: registry.summary?.secretStorageRequiredBeforeRemote === true,
    remoteProviderCount: registry.summary?.remoteProviderCount ?? 0,
    invocableRemoteProviderCount,
    hostBoundaryCount: hostBoundaries.length,
    secretReferenceCount: secretReferences.length,
    secretValueAllowedInRepository: policy.repository.plaintextSecretAllowed,
    secretValueAllowedInEvidence: policy.evidence.secretValueAllowed,
    secretValueAllowedInProviderRequest: requestBoundary.secretValueAllowed,
    secretValueAllowedInProviderResult: requestBoundary.secretValueAllowedInResult,
    secretValueAllowedInAuditLog: auditBoundary.secretValueAllowed,
    environmentVariableAllowedByDefault: policy.hostFallbacks.environmentVariableAllowedByDefault,
    environmentVariableEvidenceAllowed: policy.hostFallbacks.environmentVariableEvidenceAllowed,
    redactionRequired: policy.redaction.required,
    rotationPolicyRequired: policy.lifecycle.rotationPolicyRequired,
    revocationPolicyRequired: policy.lifecycle.revocationPolicyRequired,
    forbiddenSecretValueFieldCount,
    releaseGatePatternCount: releaseGate.forbiddenPatterns.length,
    networkStillDisabled: registry.summary?.networkDefault === "disabled"
  };
  const checks = [
    check("HIA_WP36_SECRET_STORAGE_REGISTRY_READY", summary.registryReady === true
      && summary.secretStorageBoundaryRequired === true
      && summary.remoteProviderCount >= 1
      && summary.invocableRemoteProviderCount === 0, {
      actual: {
        invocableRemoteProviderCount: summary.invocableRemoteProviderCount,
        registryStatus: registry.status,
        remoteProviderCount: summary.remoteProviderCount,
        secretStorageBoundaryRequired: summary.secretStorageBoundaryRequired
      }
    }),
    check("HIA_WP36_SECRET_STORAGE_HOST_BOUNDARIES_DECLARED", summary.hostBoundaryCount >= 4
      && hostBoundaries.some((boundary) => boundary.host === "vscode" && boundary.preferredStore === "SecretStorage")
      && hostBoundaries.some((boundary) => boundary.host === "ci" && boundary.preferredStore === "GitHub Actions encrypted secrets")
      && hostBoundaries.every((boundary) => boundary.plaintextFileAllowed === false), {
      actual: hostBoundaries.map((boundary) => ({
        host: boundary.host,
        plaintextFileAllowed: boundary.plaintextFileAllowed,
        preferredStore: boundary.preferredStore
      }))
    }),
    check("HIA_WP36_SECRET_STORAGE_REFERENCE_ONLY", summary.secretReferenceCount >= 2
      && summary.forbiddenSecretValueFieldCount === 0
      && secretReferences.every((secretRef) => secretRef.valueMaterial === "not-serialized")
      && secretReferences.every((secretRef) => typeof secretRef.referenceId === "string"), {
      actual: {
        forbiddenSecretValueFieldCount: summary.forbiddenSecretValueFieldCount,
        secretReferenceIds: secretReferences.map((secretRef) => secretRef.referenceId)
      }
    }),
    check("HIA_WP36_SECRET_STORAGE_DENIES_REPO_EVIDENCE_REQUEST_LOG", summary.secretValueAllowedInRepository === false
      && summary.secretValueAllowedInEvidence === false
      && summary.secretValueAllowedInProviderRequest === false
      && summary.secretValueAllowedInProviderResult === false
      && summary.secretValueAllowedInAuditLog === false, {
      actual: {
        secretValueAllowedInAuditLog: summary.secretValueAllowedInAuditLog,
        secretValueAllowedInEvidence: summary.secretValueAllowedInEvidence,
        secretValueAllowedInProviderRequest: summary.secretValueAllowedInProviderRequest,
        secretValueAllowedInProviderResult: summary.secretValueAllowedInProviderResult,
        secretValueAllowedInRepository: summary.secretValueAllowedInRepository
      }
    }),
    check("HIA_WP36_SECRET_STORAGE_ENV_FALLBACK_BOUNDARY", summary.environmentVariableAllowedByDefault === false
      && summary.environmentVariableEvidenceAllowed === false
      && policy.hostFallbacks.environmentVariableMode === "explicit-ephemeral-bridge-only", {
      actual: {
        environmentVariableAllowedByDefault: summary.environmentVariableAllowedByDefault,
        environmentVariableEvidenceAllowed: summary.environmentVariableEvidenceAllowed,
        environmentVariableMode: policy.hostFallbacks.environmentVariableMode
      }
    }),
    check("HIA_WP36_SECRET_STORAGE_LIFECYCLE_AND_REDACTION", summary.redactionRequired === true
      && summary.rotationPolicyRequired === true
      && summary.revocationPolicyRequired === true
      && auditBoundary.records.every((record) => record.redaction === "secret-value-redacted"), {
      actual: {
        auditRecordCount: auditBoundary.records.length,
        redactionRequired: summary.redactionRequired,
        revocationPolicyRequired: summary.revocationPolicyRequired,
        rotationPolicyRequired: summary.rotationPolicyRequired
      }
    }),
    check("HIA_WP36_SECRET_STORAGE_RELEASE_GATE_READY", summary.releaseGatePatternCount >= 5
      && releaseGate.rejects.includes("plain-env-file")
      && releaseGate.rejects.includes("provider-result-secret-value")
      && releaseGate.rejects.includes("audit-log-secret-value"), {
      actual: {
        forbiddenPatterns: releaseGate.forbiddenPatterns.map((item) => item.id),
        rejects: releaseGate.rejects
      }
    }),
    check("HIA_WP36_SECRET_STORAGE_NETWORK_STILL_DISABLED", summary.networkStillDisabled === true
      && requestBoundary.remoteInvocationAfterSecretBoundary === "still-blocked-until-network-consent", {
      actual: {
        networkDefault: registry.summary?.networkDefault,
        remoteInvocationAfterSecretBoundary: requestBoundary.remoteInvocationAfterSecretBoundary
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp36-secret-storage-boundary-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-network-mediation-and-consent" : "blocked",
    sourceEvidence: {
      providerRegistry: normalizePath(registryEvidencePath)
    },
    references: [
      {
        id: "vscode-secret-storage",
        source: "https://code.visualstudio.com/api/references/vscode-api",
        relevance: "VS Code SecretStorage is the preferred VS Code host store for sensitive provider credentials."
      },
      {
        id: "vscode-common-capabilities",
        source: "https://code.visualstudio.com/api/extension-capabilities/common-capabilities",
        relevance: "VS Code common capabilities distinguish secret storage from workspace/global state."
      },
      {
        id: "owasp-secrets-management",
        source: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
        relevance: "Secret creation, rotation, revocation and audit lifecycle baseline."
      },
      {
        id: "github-actions-secrets",
        source: "https://docs.github.com/en/actions/concepts/security/secrets",
        relevance: "CI providers expose encrypted secrets that are explicitly included by workflows."
      },
      {
        id: "windows-credential-manager",
        source: "https://learn.microsoft.com/en-us/windows/win32/secauthn/credentials-management",
        relevance: "Windows desktop hosts can use OS credential management rather than plaintext files."
      }
    ],
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    policy,
    hostBoundaries,
    secretReferences,
    requestBoundary,
    auditBoundary,
    releaseGate,
    checks,
    nextContractInputs: [
      {
        phase: "W-P36.4",
        topic: "network-mediation-and-consent",
        reason: "Secret references are now modeled, but remote providers remain blocked until network consent and audit mediation exist."
      },
      {
        phase: "W-P36.5",
        topic: "source-excerpt-opt-in",
        reason: "Secret storage does not grant source body access; source excerpt policy still needs an independent opt-in gate."
      }
    ],
    manualChecks: [
      "Confirm every concrete host implementation stores provider credentials through its host secret API or OS credential store.",
      "Confirm provider request/result serializers reject secret value fields, not just redact them later.",
      "Confirm CI workflows never print provider secret values and pass only host-provided secret references into HIA evidence."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P36 secret storage boundary evidence");
  assert.equal(hardFailures.length, 0, `W-P36 secret storage boundary has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P36 secret storage boundary evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createSecretStoragePolicy() {
  return {
    contract: "hia-provider-secret-storage-boundary",
    contractVersion: "0.1.0-draft",
    identity: {
      secretReferenceContract: "hia-provider-secret-ref",
      secretReferenceVersion: "0.1.0-draft",
      secretReferenceCarriesValue: false
    },
    repository: {
      plaintextSecretAllowed: false,
      configFileSecretAllowed: false,
      envFileSecretAllowed: false,
      npmrcTokenAllowed: false
    },
    evidence: {
      secretValueAllowed: false,
      secretReferenceAllowed: true,
      secretStoreNameAllowed: true,
      hostStoreCapabilityAllowed: true
    },
    redaction: {
      required: true,
      strategy: "deny-field-and-redact-string-patterns",
      replacement: "<redacted-secret-value>"
    },
    lifecycle: {
      ownerRequired: true,
      rotationPolicyRequired: true,
      revocationPolicyRequired: true,
      lastUsedTimestampAllowed: true,
      lastUsedTimestampMayRevealValue: false
    },
    hostFallbacks: {
      environmentVariableAllowedByDefault: false,
      environmentVariableEvidenceAllowed: false,
      environmentVariableMode: "explicit-ephemeral-bridge-only",
      plaintextPromptAllowed: false
    }
  };
}

function createHostBoundaries() {
  return [
    createHostBoundary("vscode", "SecretStorage", "extension-context", true),
    createHostBoundary("visual-studio", "OS credential manager or Visual Studio account store", "extension-host", true),
    createHostBoundary("cli-desktop", "OS credential manager", "user-session", false),
    createHostBoundary("ci", "GitHub Actions encrypted secrets", "workflow-environment", false)
  ];
}

function createHostBoundary(host, preferredStore, scope, supportsChangeEvent) {
  return {
    host,
    preferredStore,
    scope,
    supportsChangeEvent,
    plaintextFileAllowed: false,
    evidenceMayContainSecretValue: false,
    providerReceivesSecretValueDirectly: false,
    providerReceivesSecretRef: true
  };
}

function createSecretReferences() {
  return [
    {
      contract: "hia-provider-secret-ref",
      contractVersion: "0.1.0-draft",
      referenceId: "provider.remote-api.api-key",
      providerId: "remote-api-provider-template",
      purpose: "provider-authentication",
      credentialKind: "api-key",
      scope: "user",
      storeBinding: "host-managed-secret-store",
      valueMaterial: "not-serialized",
      lifecycle: {
        owner: "user",
        rotation: "manual-or-provider-recommended",
        revocation: "delete-reference-and-host-secret"
      }
    },
    {
      contract: "hia-provider-secret-ref",
      contractVersion: "0.1.0-draft",
      referenceId: "provider.remote-api.organization-token",
      providerId: "remote-api-provider-template",
      purpose: "provider-organization-routing",
      credentialKind: "organization-token",
      scope: "workspace",
      storeBinding: "host-managed-secret-store",
      valueMaterial: "not-serialized",
      lifecycle: {
        owner: "workspace-admin",
        rotation: "workspace-policy",
        revocation: "delete-reference-and-host-secret"
      }
    }
  ];
}

function createProviderRequestBoundary(secretReferences) {
  return {
    contract: "hia-provider-secret-request-boundary",
    contractVersion: "0.1.0-draft",
    providerRequestMayContain: ["secretRefId", "providerId", "credentialKind", "scope", "consentRecordId"],
    providerRequestMustNotContain: ["secretValue", "apiKeyValue", "tokenValue", "password", "authorizationHeader"],
    providerResultMustNotContain: ["secretValue", "apiKeyValue", "tokenValue", "password", "authorizationHeader"],
    secretValueAllowed: false,
    secretValueAllowedInResult: false,
    secretReferenceIds: secretReferences.map((secretRef) => secretRef.referenceId),
    remoteInvocationAfterSecretBoundary: "still-blocked-until-network-consent"
  };
}

function createAuditBoundary(secretReferences) {
  return {
    contract: "hia-provider-secret-audit-boundary",
    contractVersion: "0.1.0-draft",
    secretValueAllowed: false,
    records: secretReferences.map((secretRef) => ({
      event: "secret-reference-declared",
      providerId: secretRef.providerId,
      referenceId: secretRef.referenceId,
      credentialKind: secretRef.credentialKind,
      operation: "declare",
      result: "reference-only",
      redaction: "secret-value-redacted"
    }))
  };
}

function createReleaseGate() {
  return {
    contract: "hia-provider-secret-release-gate",
    contractVersion: "0.1.0-draft",
    rejects: [
      "plain-env-file",
      "npmrc-auth-token",
      "provider-request-secret-value",
      "provider-result-secret-value",
      "audit-log-secret-value",
      "evidence-secret-value"
    ],
    forbiddenPatterns: [
      { id: "provider-api-key", patternFamily: "provider-api-key-prefix" },
      { id: "github-token", patternFamily: "github-personal-access-token-prefix" },
      { id: "npm-token", patternFamily: "npm-token" },
      { id: "authorization-header", patternFamily: "bearer-authorization-header" },
      { id: "dotenv-secret", patternFamily: "secret-like-dotenv-assignment" }
    ]
  };
}

function countForbiddenSecretValueFields(value) {
  const forbidden = new Set([
    "apiKeyValue",
    "authorizationHeader",
    "credential",
    "password",
    "plaintext",
    "secretValue",
    "tokenValue",
    "value"
  ]);
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    for (const key of Object.keys(node)) {
      if (forbidden.has(key)) {
        count += 1;
      }
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
