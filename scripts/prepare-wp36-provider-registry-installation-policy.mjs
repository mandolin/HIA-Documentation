import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp36-provider-registry-installation-policy");
const evidencePath = path.join(outputRoot, "evidence.json");
const governanceEvidencePath = path.join(rootDir, "dist", "wp36-real-provider-governance-audit", "evidence.json");

await main();

/**
 * 准备 W-P36.2 provider registry / installation policy evidence。
 * Prepare W-P36.2 provider registry / installation policy evidence.
 *
 * The evidence makes provider installation explicit: registry entries must carry
 * identity, package provenance, license, capability, secret/network/source and
 * output policies before a host may select an adapter. Remote/API providers stay
 * declared but non-invocable until the later secret and network gates pass.
 *
 * 本 evidence 将 provider 安装行为显式化：registry entry 必须声明身份、包来源、
 * 许可、能力、secret/network/source 与输出策略，宿主才可以选择 adapter。
 * remote/API provider 在后续 secret 与 network gate 通过前只能登记，不能调用。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const governance = await readJson(governanceEvidencePath);
  const packageManifests = await readPackageManifests([
    "packages/provider-sdk/package.json",
    "packages/provider-mock/package.json",
    "packages/provider-runner/package.json"
  ]);
  const policy = createInstallationPolicy();
  const registryEntries = createRegistryEntries(packageManifests);
  const installedEntries = registryEntries.filter((entry) => entry.install.status === "installed-workspace");
  const invocableEntries = registryEntries.filter((entry) => entry.invocation.status === "invocable");
  const remoteEntries = registryEntries.filter((entry) => entry.runtimeKind === "remote-api");
  const deniedLicenseEntries = registryEntries.filter((entry) => !isAllowedLicense(entry.license.expression));
  const blockedCapabilityEntries = registryEntries.filter((entry) => hasBlockedCapability(entry));
  const remoteInvocableBeforeGateEntries = remoteEntries.filter((entry) => entry.invocation.status === "invocable");
  const missingProvenanceEntries = registryEntries.filter((entry) => !hasRequiredProvenance(entry));
  const packageManifestLicenseIssues = packageManifests.filter((manifest) => !isAllowedLicense(manifest.license));
  const summary = {
    governanceReady: governance.status === "ready-for-provider-registry-installation-policy",
    providerRegistryGatePresent: Boolean(governance.gates?.some((gate) => gate.id === "provider-registry-gate")),
    registryEntryCount: registryEntries.length,
    installedProviderCount: installedEntries.length,
    invocableProviderCount: invocableEntries.length,
    remoteProviderCount: remoteEntries.length,
    remoteInvocableBeforeGateCount: remoteInvocableBeforeGateEntries.length,
    deniedLicenseEntryCount: deniedLicenseEntries.length,
    packageManifestLicenseIssueCount: packageManifestLicenseIssues.length,
    blockedCapabilityEntryCount: blockedCapabilityEntries.length,
    missingProvenanceEntryCount: missingProvenanceEntries.length,
    defaultProviderEnabled: policy.defaults.enabled,
    explicitInstallRequired: policy.install.explicitInstallRequired,
    userConsentRequired: policy.install.userConsentRequired,
    autoEnableTransitiveProvidersAllowed: policy.install.autoEnableTransitiveProvidersAllowed,
    postinstallAuthorityAllowed: policy.install.postinstallAuthorityAllowed,
    networkDefault: policy.network.defaultAccess,
    secretStorageRequiredBeforeRemote: policy.secrets.storageBoundaryRequiredBeforeRemote,
    sourceExcerptDefault: policy.source.defaultExcerptPolicy,
    providerOutputPolicy: policy.output.providerOutputPolicy,
    checkedApplyOwnedByProvider: policy.output.checkedApplyOwnedByProvider,
    targetRepositoryMutationAllowed: policy.capabilities.targetRepositoryMutationAllowed,
    workspaceWriteAllowed: policy.capabilities.workspaceWriteAllowed,
    toolExecutionAllowed: policy.capabilities.toolExecutionAllowed
  };
  const checks = [
    check("HIA_WP36_PROVIDER_REGISTRY_GOVERNANCE_READY", summary.governanceReady === true
      && summary.providerRegistryGatePresent === true, {
      actual: {
        governanceStatus: governance.status,
        providerRegistryGatePresent: summary.providerRegistryGatePresent
      },
      expected: {
        governanceStatus: "ready-for-provider-registry-installation-policy",
        providerRegistryGatePresent: true
      }
    }),
    check("HIA_WP36_PROVIDER_REGISTRY_FIELDS_COMPLETE", registryEntries.length >= 2
      && registryEntries.every(hasRequiredRegistryFields), {
      actual: {
        entryIds: registryEntries.map((entry) => entry.id),
        registryEntryCount: summary.registryEntryCount
      }
    }),
    check("HIA_WP36_PROVIDER_REGISTRY_EXPLICIT_INSTALL", summary.defaultProviderEnabled === false
      && summary.explicitInstallRequired === true
      && summary.userConsentRequired === true
      && summary.autoEnableTransitiveProvidersAllowed === false
      && summary.postinstallAuthorityAllowed === false, {
      actual: {
        autoEnableTransitiveProvidersAllowed: summary.autoEnableTransitiveProvidersAllowed,
        defaultProviderEnabled: summary.defaultProviderEnabled,
        explicitInstallRequired: summary.explicitInstallRequired,
        postinstallAuthorityAllowed: summary.postinstallAuthorityAllowed,
        userConsentRequired: summary.userConsentRequired
      }
    }),
    check("HIA_WP36_PROVIDER_REGISTRY_LICENSE_POLICY", summary.deniedLicenseEntryCount === 0
      && summary.packageManifestLicenseIssueCount === 0, {
      actual: {
        deniedLicenseEntries: deniedLicenseEntries.map((entry) => entry.id),
        packageManifestLicenseIssues: packageManifestLicenseIssues.map((manifest) => manifest.name)
      }
    }),
    check("HIA_WP36_PROVIDER_REGISTRY_PROVENANCE_POLICY", summary.missingProvenanceEntryCount === 0
      && installedEntries.every((entry) => entry.provenance.mode === "workspace-package"), {
      actual: {
        installedEntryIds: installedEntries.map((entry) => entry.id),
        missingProvenanceEntries: missingProvenanceEntries.map((entry) => entry.id)
      }
    }),
    check("HIA_WP36_PROVIDER_REGISTRY_CAPABILITY_BOUNDARY", summary.blockedCapabilityEntryCount === 0
      && invocableEntries.every((entry) => entry.capabilities.networkAccess === "disabled")
      && invocableEntries.every((entry) => entry.policies.sourceExcerptPolicy === "none")
      && invocableEntries.every((entry) => entry.policies.sourcesContentPolicy === "none"), {
      actual: {
        blockedCapabilityEntries: blockedCapabilityEntries.map((entry) => entry.id),
        invocableEntryIds: invocableEntries.map((entry) => entry.id)
      }
    }),
    check("HIA_WP36_PROVIDER_REGISTRY_REMOTE_BLOCKED_UNTIL_GATED", summary.remoteProviderCount >= 1
      && summary.remoteInvocableBeforeGateCount === 0
      && remoteEntries.every((entry) => entry.install.status === "blocked-until-secret-network-consent-gates"), {
      actual: {
        remoteEntries: remoteEntries.map((entry) => ({
          id: entry.id,
          installStatus: entry.install.status,
          invocationStatus: entry.invocation.status
        }))
      }
    }),
    check("HIA_WP36_PROVIDER_REGISTRY_REVIEW_ONLY_OUTPUT", summary.providerOutputPolicy === "review-payload-augmentation-only"
      && summary.checkedApplyOwnedByProvider === false
      && summary.workspaceWriteAllowed === false
      && summary.targetRepositoryMutationAllowed === false
      && summary.toolExecutionAllowed === false, {
      actual: {
        checkedApplyOwnedByProvider: summary.checkedApplyOwnedByProvider,
        providerOutputPolicy: summary.providerOutputPolicy,
        targetRepositoryMutationAllowed: summary.targetRepositoryMutationAllowed,
        toolExecutionAllowed: summary.toolExecutionAllowed,
        workspaceWriteAllowed: summary.workspaceWriteAllowed
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp36-provider-registry-installation-policy-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-secret-storage-boundary" : "blocked",
    sourceEvidence: {
      governanceBaseline: normalizePath(governanceEvidencePath),
      packageManifests: packageManifests.map((manifest) => manifest.path)
    },
    references: [
      {
        id: "vscode-extension-manifest",
        source: "https://code.visualstudio.com/api/references/extension-manifest",
        relevance: "Extension manifests model explicit capabilities and host support declarations."
      },
      {
        id: "vscode-workspace-trust",
        source: "https://code.visualstudio.com/api/extension-capabilities/common-capabilities",
        relevance: "Workspace trust and secret storage inform host-side provider enablement boundaries."
      },
      {
        id: "npm-provenance",
        source: "https://docs.npmjs.com/generating-provenance-statements",
        relevance: "Published provider packages should have verifiable build/publish provenance."
      },
      {
        id: "spdx-license-expressions",
        source: "https://spdx.github.io/spdx-spec/v2.3/SPDX-license-expressions/",
        relevance: "Provider package license policy uses SPDX-style expressions."
      },
      {
        id: "openssf-scorecard",
        source: "https://github.com/ossf/scorecard",
        relevance: "Future registry hardening can incorporate repository security posture signals."
      }
    ],
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    policy,
    registryEntries,
    packageManifests,
    checks,
    nextContractInputs: [
      {
        phase: "W-P36.3",
        topic: "secret-storage-boundary",
        reason: "Remote/API providers remain blocked until credentials are stored behind host-managed secret boundaries."
      },
      {
        phase: "W-P36.4",
        topic: "network-mediation-and-consent",
        reason: "Remote/API providers need mediated network consent and auditable request metadata before invocation."
      },
      {
        phase: "W-P36.6",
        topic: "safe-invocation-dry-run",
        reason: "The deterministic mock provider is the only invocable registry entry for first safe dry-run evidence."
      }
    ],
    manualChecks: [
      "Before adding a real provider package, confirm its license is permissive and recorded in the registry entry.",
      "Before enabling a remote provider, confirm W-P36.3 and W-P36.4 evidence passed and no secret or source body is logged.",
      "Before publish, confirm registry packages use immutable versions and provenance/trusted publishing where available."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P36 provider registry installation policy evidence");
  assert.equal(hardFailures.length, 0, `W-P36 provider registry installation policy has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P36 provider registry installation policy evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readPackageManifests(relativePaths) {
  const manifests = [];
  for (const relativePath of relativePaths) {
    const manifest = JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8"));
    manifests.push({
      name: manifest.name,
      version: manifest.version,
      license: manifest.license,
      private: manifest.private === true,
      path: relativePath.replaceAll("\\", "/"),
      publishAccess: manifest.publishConfig?.access ?? "unspecified"
    });
  }
  return manifests;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createInstallationPolicy() {
  return {
    contract: "hia-provider-registry-installation-policy",
    contractVersion: "0.1.0-draft",
    defaults: {
      enabled: false,
      invocationStatus: "blocked-until-selected",
      sourceExcerptPolicy: "none",
      networkAccess: "disabled"
    },
    install: {
      explicitInstallRequired: true,
      userConsentRequired: true,
      autoEnableTransitiveProvidersAllowed: false,
      postinstallAuthorityAllowed: false,
      packageManagerScriptAuthority: "not-provider-authority",
      immutableVersionRequired: true,
      lockfileOrIntegrityRequired: true
    },
    license: {
      allowedExpressions: ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"],
      deniedFamilies: ["AGPL", "GPL", "LGPL", "SSPL", "BUSL", "BSL"],
      spdxExpressionRequired: true
    },
    provenance: {
      packageIdentityRequired: true,
      repositoryRequired: true,
      trustedPublisherRecommended: true,
      registryIntegrityRequiredBeforePublish: true,
      localWorkspaceAllowedForDryRun: true
    },
    capabilities: {
      declarationRequired: true,
      sourceBodyInputAllowed: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      toolExecutionAllowed: false
    },
    secrets: {
      storageBoundaryRequiredBeforeRemote: true,
      plaintextRepositorySecretAllowed: false,
      secretInEvidenceAllowed: false
    },
    network: {
      defaultAccess: "disabled",
      remoteProviderRequiresConsentGate: true,
      perProviderConsentRequired: true,
      perWorkspaceConsentRequired: true
    },
    source: {
      defaultExcerptPolicy: "none",
      optInRequired: true,
      sourcesContentAllowed: false
    },
    output: {
      providerOutputPolicy: "review-payload-augmentation-only",
      checkedApplyOwnedByProvider: false,
      workspaceEditAllowed: false
    }
  };
}

function createRegistryEntries(packageManifests) {
  const mockManifest = findManifest(packageManifests, "@hia-doc/provider-mock");
  return [
    {
      contract: "hia-provider-registry-entry",
      contractVersion: "0.1.0-draft",
      id: "hia-deterministic-mock",
      displayName: "HIA Deterministic Mock Provider",
      runtimeKind: "deterministic-mock",
      packageRef: {
        name: mockManifest.name,
        version: mockManifest.version,
        source: "workspace-package",
        path: mockManifest.path
      },
      license: {
        expression: mockManifest.license,
        category: "permissive"
      },
      provenance: {
        mode: "workspace-package",
        repositoryRequired: true,
        immutableVersionRequired: true,
        registryIntegrityRequiredBeforePublish: true,
        trustedPublisherState: "not-required-for-local-workspace-dry-run"
      },
      install: {
        status: "installed-workspace",
        defaultEnabled: false,
        userSelected: false,
        activation: "explicit-selection-only"
      },
      invocation: {
        status: "invocable",
        allowedBeforeSecretGate: true,
        allowedBeforeNetworkGate: true,
        reason: "Offline deterministic provider for evidence and host dry-run only."
      },
      capabilities: createSafeCapabilities("disabled"),
      policies: createSafePolicies()
    },
    {
      contract: "hia-provider-registry-entry",
      contractVersion: "0.1.0-draft",
      id: "remote-api-provider-template",
      displayName: "Remote API Provider Template",
      runtimeKind: "remote-api",
      packageRef: {
        name: "@hia-doc/provider-remote-template",
        version: "0.1.0-draft",
        source: "not-installed-template"
      },
      license: {
        expression: "MIT",
        category: "permissive-placeholder"
      },
      provenance: {
        mode: "declared-template",
        repositoryRequired: true,
        immutableVersionRequired: true,
        registryIntegrityRequiredBeforePublish: true,
        trustedPublisherState: "required-before-registry-approval"
      },
      install: {
        status: "blocked-until-secret-network-consent-gates",
        defaultEnabled: false,
        userSelected: false,
        activation: "unavailable-before-gates"
      },
      invocation: {
        status: "blocked",
        allowedBeforeSecretGate: false,
        allowedBeforeNetworkGate: false,
        reason: "Remote/API providers require W-P36.3 secret storage and W-P36.4 network consent evidence first."
      },
      capabilities: createSafeCapabilities("disabled"),
      policies: createSafePolicies()
    }
  ];
}

function findManifest(packageManifests, packageName) {
  const manifest = packageManifests.find((item) => item.name === packageName);
  assert(manifest, `Missing package manifest for ${packageName}.`);
  return manifest;
}

function createSafeCapabilities(networkAccess) {
  return {
    draftText: true,
    reviewMetadata: true,
    sourceBodyInput: false,
    targetRepositoryMutation: false,
    toolExecution: false,
    workspaceWrite: false,
    networkAccess
  };
}

function createSafePolicies() {
  return {
    allowSourceBody: false,
    allowTargetRepositoryMutation: false,
    allowToolExecution: false,
    allowWorkspaceWrite: false,
    requiresHumanReview: true,
    sourceExcerptPolicy: "none",
    sourcesContentPolicy: "none"
  };
}

function hasRequiredRegistryFields(entry) {
  return Boolean(
    entry.contract
      && entry.contractVersion
      && entry.id
      && entry.displayName
      && entry.runtimeKind
      && entry.packageRef?.name
      && entry.packageRef?.version
      && entry.license?.expression
      && entry.provenance?.mode
      && entry.install?.status
      && entry.invocation?.status
      && entry.capabilities
      && entry.policies
  );
}

function isAllowedLicense(expression) {
  if (typeof expression !== "string") {
    return false;
  }
  if (/(?:^|\W)(?:AGPL|GPL|LGPL|SSPL|BUSL|BSL)(?:\W|$)/iu.test(expression)) {
    return false;
  }
  return /^(?:MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC)(?:\s+(?:OR|AND)\s+(?:MIT|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|ISC))*$/u.test(expression);
}

function hasRequiredProvenance(entry) {
  return entry.provenance?.repositoryRequired === true
    && entry.provenance?.immutableVersionRequired === true
    && entry.provenance?.registryIntegrityRequiredBeforePublish === true
    && typeof entry.provenance?.trustedPublisherState === "string";
}

function hasBlockedCapability(entry) {
  return entry.capabilities.sourceBodyInput !== false
    || entry.capabilities.targetRepositoryMutation !== false
    || entry.capabilities.toolExecution !== false
    || entry.capabilities.workspaceWrite !== false
    || entry.policies.allowSourceBody !== false
    || entry.policies.allowTargetRepositoryMutation !== false
    || entry.policies.allowToolExecution !== false
    || entry.policies.allowWorkspaceWrite !== false
    || entry.policies.requiresHumanReview !== true
    || entry.policies.sourceExcerptPolicy !== "none"
    || entry.policies.sourcesContentPolicy !== "none";
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
