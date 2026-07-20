import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp36-real-provider-governance-audit");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutEvidencePath = path.join(rootDir, "dist", "wp35-closeout-checked-apply-inputs", "evidence.json");

await main();

/**
 * 准备 W-P36.1 真实 provider 治理基线 evidence。
 * Prepare W-P36.1 real-provider governance baseline evidence.
 *
 * The baseline converts W-P35 closeout inputs into enforceable gates for real
 * provider registry, secret storage, network consent, audit logging, source
 * excerpt opt-in and checked-apply separation.
 *
 * 本 baseline 将 W-P35 closeout 输入转成真实 provider registry、secret storage、
 * network consent、audit logging、source excerpt opt-in 与 checked apply 分离的
 * 可验证 gate。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const closeout = await readJson(closeoutEvidencePath);
  const governanceBaseline = {
    providerRegistryRequired: true,
    explicitProviderInstallRequired: true,
    capabilityDeclarationRequired: true,
    secretStorageBoundaryRequired: true,
    secretPlaintextRepoAllowed: false,
    secretInEvidenceAllowed: false,
    networkDefault: "disabled",
    networkConsentRequired: true,
    sourceExcerptDefault: "none",
    sourceExcerptOptInRequired: true,
    auditLogRequired: true,
    auditLogSecretsAllowed: false,
    auditLogSourceBodyAllowed: false,
    providerOutputPolicy: "review-payload-augmentation-only",
    checkedApplyOwnedByProvider: false,
    checkedApplyRequiresSeparateContract: true,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    toolExecutionAllowed: false
  };
  const riskRegister = [
    createRisk("secret-leakage", "Provider credentials leak into repo, logs or evidence.", [
      "secret-storage-boundary",
      "secret-redaction-gate"
    ]),
    createRisk("unmediated-network", "Provider sends data without explicit host mediation and user consent.", [
      "network-consent-gate",
      "provider-network-policy"
    ]),
    createRisk("source-body-exfiltration", "Source bodies or sourcesContent are embedded into provider request/result.", [
      "source-excerpt-opt-in-gate",
      "privacy-release-gate"
    ]),
    createRisk("direct-edit-output", "Provider result is treated as WorkspaceEdit or executable patch.", [
      "provider-output-policy",
      "checked-apply-separation-gate"
    ]),
    createRisk("workspace-mutation", "Provider or runner writes to workspace or target repositories.", [
      "workspace-write-deny-gate",
      "target-mutation-deny-gate"
    ]),
    createRisk("tool-execution-bypass", "Provider gains tool execution before an explicit policy exists.", [
      "tool-execution-deny-gate",
      "capability-declaration-gate"
    ]),
    createRisk("audit-tampering", "Provider invocation lacks provenance or protected audit metadata.", [
      "audit-log-gate",
      "provenance-required-gate"
    ]),
    createRisk("refusal-and-rate-limit-ambiguity", "Provider refusal, errors or rate limits are not represented for review.", [
      "refusal-error-policy",
      "rate-limit-policy"
    ])
  ];
  const gates = [
    createGate("provider-registry-gate", "W-P36.2", "Provider registry and installation policy must exist before real provider invocation."),
    createGate("secret-storage-gate", "W-P36.3", "Secrets must stay behind host secret storage and out of repo/evidence/logs."),
    createGate("network-consent-gate", "W-P36.4", "Network access must be mediated and explicitly consented."),
    createGate("audit-provenance-gate", "W-P36.4", "Every real invocation needs redacted audit metadata and provider provenance."),
    createGate("source-excerpt-opt-in-gate", "W-P36.5", "Source excerpt remains none unless explicit privacy opt-in exists."),
    createGate("privacy-release-gate", "W-P36.5", "Release gates must reject source body, sourcesContent, secrets and absolute local paths."),
    createGate("safe-invocation-dry-run-gate", "W-P36.6", "First invocation evidence uses stub or explicitly mediated real provider path without writes."),
    createGate("checked-apply-separation-gate", "W-P36.7", "Provider output remains non-executable until checked apply continuation is separately designed.")
  ];
  const summary = {
    closeoutReady: closeout.status === "ready-for-wp36-real-provider-governance-or-checked-apply-planning",
    closeoutHardFailureCount: closeout.summary?.hardFailureCount ?? -1,
    checkedApplyInputCount: closeout.summary?.checkedApplyInputCount ?? 0,
    realProviderInputCount: closeout.summary?.realProviderInputCount ?? 0,
    governanceGateCount: gates.length,
    riskCount: riskRegister.length,
    secretStorageBoundaryRequired: governanceBaseline.secretStorageBoundaryRequired,
    secretInEvidenceAllowed: governanceBaseline.secretInEvidenceAllowed,
    networkConsentRequired: governanceBaseline.networkConsentRequired,
    networkDefault: governanceBaseline.networkDefault,
    sourceExcerptDefault: governanceBaseline.sourceExcerptDefault,
    sourceExcerptOptInRequired: governanceBaseline.sourceExcerptOptInRequired,
    auditLogRequired: governanceBaseline.auditLogRequired,
    auditLogSecretsAllowed: governanceBaseline.auditLogSecretsAllowed,
    providerOutputPolicy: governanceBaseline.providerOutputPolicy,
    checkedApplyOwnedByProvider: governanceBaseline.checkedApplyOwnedByProvider,
    checkedApplyRequiresSeparateContract: governanceBaseline.checkedApplyRequiresSeparateContract,
    workspaceWriteAllowed: governanceBaseline.workspaceWriteAllowed,
    targetRepositoryMutationAllowed: governanceBaseline.targetRepositoryMutationAllowed,
    toolExecutionAllowed: governanceBaseline.toolExecutionAllowed
  };
  const checks = [
    check("HIA_WP36_PROVIDER_GOVERNANCE_CLOSEOUT_READY", summary.closeoutReady === true
      && summary.closeoutHardFailureCount === 0
      && summary.realProviderInputCount >= 8
      && summary.checkedApplyInputCount >= 9, {
      actual: {
        checkedApplyInputCount: summary.checkedApplyInputCount,
        closeoutHardFailureCount: summary.closeoutHardFailureCount,
        closeoutReady: summary.closeoutReady,
        realProviderInputCount: summary.realProviderInputCount
      }
    }),
    check("HIA_WP36_PROVIDER_GOVERNANCE_GATES_DECLARED", summary.governanceGateCount === 8
      && gates.some((gate) => gate.id === "secret-storage-gate")
      && gates.some((gate) => gate.id === "network-consent-gate")
      && gates.some((gate) => gate.id === "source-excerpt-opt-in-gate")
      && gates.some((gate) => gate.id === "checked-apply-separation-gate"), {
      actual: {
        gateIds: gates.map((gate) => gate.id),
        governanceGateCount: summary.governanceGateCount
      }
    }),
    check("HIA_WP36_PROVIDER_GOVERNANCE_RISK_REGISTER_READY", summary.riskCount === 8
      && riskRegister.every((risk) => risk.mitigations.length >= 2), {
      actual: {
        riskCount: summary.riskCount,
        riskIds: riskRegister.map((risk) => risk.id)
      }
    }),
    check("HIA_WP36_PROVIDER_GOVERNANCE_SECRET_AND_NETWORK_DENY_BY_DEFAULT", summary.secretStorageBoundaryRequired === true
      && summary.secretInEvidenceAllowed === false
      && summary.networkDefault === "disabled"
      && summary.networkConsentRequired === true, {
      actual: {
        networkConsentRequired: summary.networkConsentRequired,
        networkDefault: summary.networkDefault,
        secretInEvidenceAllowed: summary.secretInEvidenceAllowed,
        secretStorageBoundaryRequired: summary.secretStorageBoundaryRequired
      }
    }),
    check("HIA_WP36_PROVIDER_GOVERNANCE_PRIVACY_AND_APPLY_BOUNDARY", summary.sourceExcerptDefault === "none"
      && summary.sourceExcerptOptInRequired === true
      && summary.providerOutputPolicy === "review-payload-augmentation-only"
      && summary.checkedApplyOwnedByProvider === false
      && summary.checkedApplyRequiresSeparateContract === true
      && summary.workspaceWriteAllowed === false
      && summary.targetRepositoryMutationAllowed === false
      && summary.toolExecutionAllowed === false, {
      actual: {
        checkedApplyOwnedByProvider: summary.checkedApplyOwnedByProvider,
        checkedApplyRequiresSeparateContract: summary.checkedApplyRequiresSeparateContract,
        providerOutputPolicy: summary.providerOutputPolicy,
        sourceExcerptDefault: summary.sourceExcerptDefault,
        sourceExcerptOptInRequired: summary.sourceExcerptOptInRequired,
        targetRepositoryMutationAllowed: summary.targetRepositoryMutationAllowed,
        toolExecutionAllowed: summary.toolExecutionAllowed,
        workspaceWriteAllowed: summary.workspaceWriteAllowed
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp36-real-provider-governance-baseline-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-provider-registry-installation-policy" : "blocked",
    sourceEvidence: {
      wp35Closeout: normalizePath(closeoutEvidencePath)
    },
    references: [
      {
        id: "vscode-secret-storage",
        source: "https://code.visualstudio.com/api/references/vscode-api",
        relevance: "Host secret storage API reference."
      },
      {
        id: "vscode-common-capabilities",
        source: "https://code.visualstudio.com/api/extension-capabilities/common-capabilities",
        relevance: "Host extension context storage and secret capability reference."
      },
      {
        id: "owasp-secrets-management",
        source: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
        relevance: "Secret lifecycle and management baseline."
      },
      {
        id: "owasp-samm-secret-management",
        source: "https://owaspsamm.org/model/implementation/secure-deployment/stream-b/",
        relevance: "Secret lifecycle and traceability guidance."
      },
      {
        id: "owasp-logging",
        source: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
        relevance: "Sensitive logging and audit protection baseline."
      }
    ],
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    governanceBaseline,
    riskRegister,
    gates,
    checks,
    nextContractInputs: [
      {
        phase: "W-P36.2",
        topic: "provider-registry-installation-policy",
        reason: "Real providers need explicit registration, installation, version, license and capability policy before invocation."
      },
      {
        phase: "W-P36.3",
        topic: "secret-storage-boundary",
        reason: "Real provider credentials must stay behind host-managed secret storage and out of evidence/logs."
      },
      {
        phase: "W-P36.4",
        topic: "network-mediation-and-consent",
        reason: "External provider network requires explicit host mediation, consent and audit metadata."
      }
    ],
    manualChecks: [
      "Confirm the first real provider path does not read source bodies unless source excerpt opt-in exists.",
      "Confirm no provider package can declare workspace write, target mutation or tool execution without a separate explicit plan.",
      "Confirm checked apply remains owned by host-side apply contracts, not provider adapters."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P36 real provider governance baseline evidence");
  assert.equal(hardFailures.length, 0, `W-P36 real provider governance baseline has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P36 real provider governance baseline evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createRisk(id, description, mitigations) {
  return {
    id,
    description,
    severity: "high",
    mitigations
  };
}

function createGate(id, phase, requirement) {
  return {
    id,
    phase,
    requirement,
    status: "required-before-real-provider"
  };
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
  assert(!serialized.match(/sk-[A-Za-z0-9_-]{8,}/u), `${label} must not include provider API key-looking tokens.`);
}
