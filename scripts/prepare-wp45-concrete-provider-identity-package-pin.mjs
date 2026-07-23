import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp45-concrete-provider-identity-package-pin");
const evidencePath = path.join(outputRoot, "evidence.json");
const packetPath = path.join(outputRoot, "concrete-provider-identity-package-pin.md");
const checklistPath = path.join(outputRoot, "provider-package-pin-review-checklist.md");
const readinessPath = path.join(outputRoot, "execution-readiness-after-provider-pin.md");
const boundaryPath = path.join(rootDir, "dist", "wp45-provider-execution-boundary-contract", "evidence.json");
const candidateSelectionPath = path.join(rootDir, "dist", "wp40-remote-provider-candidate-selection", "evidence.json");

await main();

/**
 * 生成 W-P45.3 concrete provider identity and package pin evidence。
 * Generate W-P45.3 concrete provider identity and package pin evidence.
 *
 * W-P45.3 replaces the previous remote-provider template with one concrete,
 * auditable provider identity and one immutable npm package pin. It records
 * registry integrity, license, repository and provenance references, while
 * still denying secret access, provider API calls, checked apply, workspace
 * writes and target repository mutation.
 *
 * 中文：W-P45.3 用一个真实、可审计的 provider 身份和一个不可变 npm 包 pin
 * 替换早期 remote-provider template。它记录 registry integrity、许可证、
 * 仓库和 provenance 引用，但仍然禁止 secret 访问、provider API 调用、
 * checked apply、工作区写入和目标仓库变更。
 *
 * @returns {Promise<void>} Writes public-safe provider package pin evidence.
 */
async function main() {
  const boundary = JSON.parse(await readFile(boundaryPath, "utf8"));
  const candidateSelection = JSON.parse(await readFile(candidateSelectionPath, "utf8"));
  const providerPacket = createConcreteProviderPacket();
  const previousTemplatePacket = first(candidateSelection.candidatePackets);
  const readinessDelta = createReadinessDelta(boundary, providerPacket);
  const summary = summarize({
    boundary,
    candidateSelection,
    previousTemplatePacket,
    providerPacket,
    readinessDelta
  });
  const checks = [
    check("HIA_WP45_PROVIDER_PIN_INPUT_BOUNDARY_READY", summary.boundaryReady === true
      && summary.boundaryHardFailureCount === 0
      && summary.boundaryExecutionOwner === "host-mediated", {
      actual: {
        boundaryExecutionOwner: summary.boundaryExecutionOwner,
        boundaryHardFailureCount: summary.boundaryHardFailureCount,
        boundaryStatus: boundary.status
      }
    }),
    check("HIA_WP45_PROVIDER_PIN_CONCRETE_IDENTITY", summary.concreteProviderSelected === true
      && summary.templateProviderSelected === false
      && summary.providerId.includes("template") === false
      && summary.providerRuntimeKind === "remote-api-through-host-mediator", {
      actual: {
        concreteProviderSelected: summary.concreteProviderSelected,
        providerId: summary.providerId,
        providerRuntimeKind: summary.providerRuntimeKind,
        templateProviderSelected: summary.templateProviderSelected
      }
    }),
    check("HIA_WP45_PROVIDER_PIN_IMMUTABLE_NPM_PACKAGE", summary.packageName === "openai"
      && summary.exactVersionPinned === true
      && summary.versionRangeAllowed === false
      && summary.versionTagAllowed === false
      && summary.draftVersion === false
      && summary.tarballHttps === true
      && summary.integritySha512Present === true
      && summary.registrySignatureRefCount >= 1, {
      actual: {
        draftVersion: summary.draftVersion,
        exactVersionPinned: summary.exactVersionPinned,
        integritySha512Present: summary.integritySha512Present,
        packageName: summary.packageName,
        packageVersion: summary.packageVersion,
        registrySignatureRefCount: summary.registrySignatureRefCount,
        tarballHttps: summary.tarballHttps
      }
    }),
    check("HIA_WP45_PROVIDER_PIN_LICENSE_AND_PROVENANCE_REFERENCES", summary.licenseAllowed === true
      && summary.repositoryHttps === true
      && summary.registryAttestationReferencePresent === true
      && summary.slsaProvenancePredicatePresent === true
      && summary.trustedPublisherEvidenceState !== "missing", {
      actual: {
        licenseExpression: summary.licenseExpression,
        registryAttestationReferencePresent: summary.registryAttestationReferencePresent,
        repositoryHttps: summary.repositoryHttps,
        slsaProvenancePredicatePresent: summary.slsaProvenancePredicatePresent,
        trustedPublisherEvidenceState: summary.trustedPublisherEvidenceState
      }
    }),
    check("HIA_WP45_PROVIDER_PIN_SELECTION_DOES_NOT_GRANT_EXECUTION", summary.selectedForBinding === true
      && summary.selectedForExecution === false
      && summary.defaultEnabled === false
      && summary.selectionGrantsCredentialAccess === false
      && summary.selectionGrantsNetwork === false
      && summary.selectionGrantsExecution === false
      && summary.selectionGrantsWrite === false, {
      actual: {
        defaultEnabled: summary.defaultEnabled,
        selectedForBinding: summary.selectedForBinding,
        selectedForExecution: summary.selectedForExecution,
        selectionGrantsCredentialAccess: summary.selectionGrantsCredentialAccess,
        selectionGrantsExecution: summary.selectionGrantsExecution,
        selectionGrantsNetwork: summary.selectionGrantsNetwork,
        selectionGrantsWrite: summary.selectionGrantsWrite
      }
    }),
    check("HIA_WP45_PROVIDER_PIN_HOST_MEDIATED_BOUNDARY_PRESERVED", summary.providerAdapterNetworkAllowed === false
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
    check("HIA_WP45_PROVIDER_PIN_REMAINING_EXECUTION_GATES_RECORDED", summary.secretBindingReady === false
      && summary.destinationBindingReady === false
      && summary.finalConsentReady === false
      && summary.currentExecutionReady === false
      && summary.nextStage === "W-P45.4 Host Secret Reference And Destination Binding", {
      actual: {
        currentExecutionReady: summary.currentExecutionReady,
        destinationBindingReady: summary.destinationBindingReady,
        finalConsentReady: summary.finalConsentReady,
        nextStage: summary.nextStage,
        secretBindingReady: summary.secretBindingReady
      }
    }),
    check("HIA_WP45_PROVIDER_PIN_NO_SECRET_SOURCE_NETWORK_WRITE", summary.secretValueIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.externalProviderApiCallExecuted === false
      && summary.providerDestinationContactedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalProviderApiCallExecuted: summary.externalProviderApiCallExecuted,
        providerDestinationContactedCount: summary.providerDestinationContactedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP45_PROVIDER_PIN_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp45-concrete-provider-identity-package-pin-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp45-secret-destination-binding" : "blocked",
    sourceEvidence: {
      providerExecutionBoundary: normalizePath(boundaryPath),
      priorRemoteProviderCandidateSelection: normalizePath(candidateSelectionPath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    providerPacket,
    previousTemplatePacketRef: {
      candidateId: previousTemplatePacket?.candidateId ?? "missing",
      providerId: previousTemplatePacket?.providerId ?? "missing",
      packageName: previousTemplatePacket?.packageIdentity?.name ?? "missing",
      packageVersion: previousTemplatePacket?.packageIdentity?.version ?? "missing",
      replacementStatus: "replaced-for-wp45-planning"
    },
    readinessDelta,
    checks,
    generatedDocs: {
      providerIdentityPackagePin: normalizePath(packetPath),
      providerPackagePinReviewChecklist: normalizePath(checklistPath),
      executionReadinessAfterProviderPin: normalizePath(readinessPath)
    },
    nextContractInputs: [
      {
        phase: "W-P45.4",
        topic: "host-secret-reference-and-destination-binding",
        status: "ready-input",
        reasonZh: "真实 provider identity 与 immutable package pin 已固定；下一步绑定 host-managed secret reference 与真实 HTTPS destination allowlist。"
      },
      {
        phase: "W-P45.5",
        topic: "request-preview-and-final-consent-packet",
        status: "blocked-until-wp45.4",
        reasonZh: "request preview 与 final consent 必须等待 secret reference、destination 和 audit scope 绑定完成。"
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P45 concrete provider package pin evidence");
  assert.equal(hardFailures.length, 0, `W-P45 concrete provider package pin has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(packetPath, renderProviderPacket(evidence), "utf8");
  await writeFile(checklistPath, renderReviewChecklist(evidence), "utf8");
  await writeFile(readinessPath, renderReadinessDelta(evidence), "utf8");
  console.log(`W-P45 concrete provider identity package pin evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P45 provider identity package pin packet prepared at ${normalizePath(packetPath)}`);
}

function createConcreteProviderPacket() {
  const packagePin = {
    contract: "hia-provider-npm-package-pin",
    contractVersion: "0.1.0-draft",
    packageManager: "npm",
    registry: "https://registry.npmjs.org/",
    name: "openai",
    version: "6.48.0",
    versionSelection: {
      exactVersionPinned: true,
      versionRangeAllowed: false,
      versionTagAllowed: false,
      draftVersionAllowed: false
    },
    observedAt: "2026-07-24",
    observedBy: "npm view openai@6.48.0",
    tarball: "https://registry.npmjs.org/openai/-/openai-6.48.0.tgz",
    integrity: "sha512-KhVp+FyV50QrXNextvL9hIU5l6ox5HYuKQjGVk7lIqprgJol90+dQXWONV6S1lRWsKA1bXjrow8RsUT14M1hNA==",
    shasum: "4cabd2a68a123c1b2c2d6fac59fd19c327aab7ad",
    signatureKeyIds: [
      "SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U"
    ],
    attestations: {
      url: "https://registry.npmjs.org/-/npm/v1/attestations/openai@6.48.0",
      provenancePredicateType: "https://slsa.dev/provenance/v1"
    },
    repository: {
      type: "git",
      url: "https://github.com/openai/openai-node"
    },
    license: {
      expression: "Apache-2.0",
      category: "permissive",
      allowedByPolicy: true
    }
  };

  return {
    contract: "hia-concrete-remote-provider-identity-package-pin",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.3",
    status: "selected-for-binding-not-execution",
    provider: {
      id: "openai.responses-api",
      displayName: "OpenAI Responses API Provider",
      owner: "OpenAI",
      runtimeKind: "remote-api-through-host-mediator",
      apiSurface: "responses-api",
      clientPackage: packagePin
    },
    expectedDestinationFamily: {
      id: "openai-api",
      baseUrl: "https://api.openai.com",
      endpointPathHint: "/v1/responses",
      bindingStatus: "deferred-to-wp45.4",
      httpsOnly: true,
      placeholder: false,
      privateNetwork: false,
      contactedInThisPhase: false
    },
    selection: {
      selectedForBinding: true,
      selectedForExecution: false,
      defaultEnabled: false,
      userSelectedForExecution: false,
      manualSelectionRequired: true,
      grantsProviderLoad: false,
      grantsCredentialAccess: false,
      grantsNetwork: false,
      grantsExecution: false,
      grantsWrite: false,
      requiredBeforeExecution: [
        "host-secret-reference-bound",
        "real-https-destination-bound",
        "request-preview-reviewed",
        "final-human-network-send-approved"
      ],
      noteZh: "W-P45.3 只选择 provider 身份与包 pin；不加载 secret、不访问 OpenAI API、不执行 provider。"
    },
    capabilityBoundary: {
      providerAdapterNetworkAllowed: false,
      providerAdapterWriteAllowed: false,
      hostMediatorRequired: true,
      reviewOnlyOutputRequired: true,
      sourceExcerptPolicy: "none",
      sourcesContentPolicy: "none",
      sourceBodyAllowedInRequest: false,
      secretValueAllowedInEvidence: false,
      secretValueAllowedInRequest: false,
      checkedApplyTriggered: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      directEditObjectAllowed: false,
      externalProviderApiCallExecuted: false
    },
    supplyChainReview: {
      status: "package-pin-ready-for-host-binding",
      packageIdentityConcrete: true,
      immutablePackageVersion: true,
      registryIntegrityRecorded: true,
      registrySignatureReferenceRecorded: true,
      registryAttestationReferenceRecorded: true,
      trustedPublisherEvidenceState: "registry-attestation-reference-present",
      independentAttestationVerificationStatus: "deferred-to-install-or-release-audit",
      installStatus: "not-installed-in-main-repo-by-design"
    }
  };
}

function createReadinessDelta(boundary, providerPacket) {
  return {
    contract: "hia-wp45-execution-readiness-after-provider-pin",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.3",
    status: "provider-pinned-execution-still-blocked",
    changedGates: [
      gate("concrete-provider-identity", "satisfied-by-wp45.3", providerPacket.provider.id),
      gate("immutable-provider-package-version", "satisfied-by-wp45.3", `${providerPacket.provider.clientPackage.name}@${providerPacket.provider.clientPackage.version}`)
    ],
    remainingBlockingGates: [
      gate("execution-bound-secret-reference", "blocking-until-wp45.4", "host-managed secret reference 未绑定。"),
      gate("real-https-destination", "blocking-until-wp45.4", "真实 HTTPS destination 尚未进入 allowlist/audit scope。"),
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

function summarize({
  boundary,
  candidateSelection,
  previousTemplatePacket,
  providerPacket,
  readinessDelta
}) {
  const packagePin = providerPacket.provider.clientPackage;
  const actionPolicy = boundary.executionEnvelope?.resultBoundary?.actionPolicy ?? {};
  const serialized = JSON.stringify({
    providerPacket,
    readinessDelta
  });
  return {
    phase: "W-P45.3",
    boundaryReady: boundary.status === "ready-for-wp45-concrete-provider-identity-packet",
    boundaryHardFailureCount: Number(boundary.summary?.hardFailureCount ?? 0),
    boundaryExecutionOwner: boundary.summary?.executionOwner,
    priorCandidateCount: Array.isArray(candidateSelection.candidatePackets) ? candidateSelection.candidatePackets.length : 0,
    previousProviderId: previousTemplatePacket?.providerId ?? "missing",
    concreteProviderSelected: providerPacket.provider.id !== previousTemplatePacket?.providerId
      && providerPacket.provider.id !== "remote-api-provider-template",
    templateProviderSelected: providerPacket.provider.id.includes("template"),
    providerId: providerPacket.provider.id,
    providerRuntimeKind: providerPacket.provider.runtimeKind,
    apiSurface: providerPacket.provider.apiSurface,
    packageName: packagePin.name,
    packageVersion: packagePin.version,
    exactVersionPinned: /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(packagePin.version),
    versionRangeAllowed: packagePin.versionSelection.versionRangeAllowed,
    versionTagAllowed: packagePin.versionSelection.versionTagAllowed,
    draftVersion: /draft|latest|workspace|\*|\^|~/iu.test(packagePin.version),
    tarballHttps: packagePin.tarball.startsWith("https://registry.npmjs.org/"),
    integritySha512Present: /^sha512-[A-Za-z0-9+/=]+$/u.test(packagePin.integrity),
    shasumPresent: /^[a-f0-9]{40}$/u.test(packagePin.shasum),
    registrySignatureRefCount: packagePin.signatureKeyIds.length,
    registryAttestationReferencePresent: packagePin.attestations.url.startsWith("https://registry.npmjs.org/-/npm/v1/attestations/"),
    slsaProvenancePredicatePresent: packagePin.attestations.provenancePredicateType === "https://slsa.dev/provenance/v1",
    repositoryHttps: packagePin.repository.url.startsWith("https://github.com/"),
    licenseExpression: packagePin.license.expression,
    licenseAllowed: packagePin.license.allowedByPolicy === true && isAllowedLicense(packagePin.license.expression),
    trustedPublisherEvidenceState: providerPacket.supplyChainReview.trustedPublisherEvidenceState,
    independentAttestationVerificationStatus: providerPacket.supplyChainReview.independentAttestationVerificationStatus,
    selectedForBinding: providerPacket.selection.selectedForBinding,
    selectedForExecution: providerPacket.selection.selectedForExecution,
    defaultEnabled: providerPacket.selection.defaultEnabled,
    selectionGrantsCredentialAccess: providerPacket.selection.grantsCredentialAccess,
    selectionGrantsNetwork: providerPacket.selection.grantsNetwork,
    selectionGrantsExecution: providerPacket.selection.grantsExecution,
    selectionGrantsWrite: providerPacket.selection.grantsWrite,
    providerAdapterNetworkAllowed: providerPacket.capabilityBoundary.providerAdapterNetworkAllowed,
    providerAdapterWriteAllowed: providerPacket.capabilityBoundary.providerAdapterWriteAllowed,
    hostMediatorRequired: providerPacket.capabilityBoundary.hostMediatorRequired,
    finalHumanConfirmationRequired: boundary.summary?.finalHumanConfirmationRequired === true,
    reviewOnlyOutputRequired: providerPacket.capabilityBoundary.reviewOnlyOutputRequired,
    secretBindingReady: false,
    destinationBindingReady: false,
    finalConsentReady: false,
    currentExecutionReady: false,
    secretValueIncludedCount: countTrue([
      providerPacket.capabilityBoundary.secretValueAllowedInEvidence,
      providerPacket.capabilityBoundary.secretValueAllowedInRequest
    ]),
    sourceTextIncludedCount: countTrue([
      providerPacket.capabilityBoundary.sourceBodyAllowedInRequest,
      providerPacket.capabilityBoundary.sourceExcerptPolicy !== "none",
      providerPacket.capabilityBoundary.sourcesContentPolicy !== "none"
    ]),
    externalProviderApiCallExecuted: providerPacket.capabilityBoundary.externalProviderApiCallExecuted,
    providerDestinationContactedCount: countTrue([providerPacket.expectedDestinationFamily.contactedInThisPhase]),
    directApplyAllowedCount: countTrue([actionPolicy.directApplyAllowed]),
    checkedApplyTriggeredCount: countTrue([
      actionPolicy.checkedApplyTriggered,
      providerPacket.capabilityBoundary.checkedApplyTriggered
    ]),
    workspaceWriteAllowedCount: countTrue([
      actionPolicy.workspaceWriteAllowed,
      providerPacket.capabilityBoundary.workspaceWriteAllowed
    ]),
    targetRepositoryMutationCount: countTrue([
      actionPolicy.targetRepositoryMutationAllowed,
      providerPacket.capabilityBoundary.targetRepositoryMutationAllowed
    ]),
    directEditObjectCount: countDirectEditObjects({ providerPacket, readinessDelta }),
    pathExposureCount: countPathExposure(serialized),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ providerPacket, readinessDelta }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ providerPacket, readinessDelta }),
    nextStage: "W-P45.4 Host Secret Reference And Destination Binding"
  };
}

function renderProviderPacket(evidence) {
  const { providerPacket, summary } = evidence;
  const packagePin = providerPacket.provider.clientPackage;
  const lines = [
    "# W-P45.3 Concrete Provider Identity And Package Pin",
    "",
    "## 摘要 / Summary",
    "",
    `- Status / 状态：\`${evidence.status}\``,
    `- Provider / provider：\`${summary.providerId}\``,
    `- Runtime / 运行时：\`${summary.providerRuntimeKind}\``,
    `- API surface / API 界面：\`${summary.apiSurface}\``,
    `- Package pin / 包 pin：\`${packagePin.name}@${packagePin.version}\``,
    `- License / 许可证：\`${summary.licenseExpression}\``,
    `- Integrity / 完整性：\`${packagePin.integrity}\``,
    `- Attestation / 证明引用：\`${packagePin.attestations.provenancePredicateType}\``,
    "",
    "## 执行边界 / Execution Boundary",
    "",
    `- Selected for binding / 已选择用于后续绑定：${summary.selectedForBinding}`,
    `- Selected for execution / 已选择用于执行：${summary.selectedForExecution}`,
    `- Secret binding ready / secret 绑定就绪：${summary.secretBindingReady}`,
    `- Destination binding ready / destination 绑定就绪：${summary.destinationBindingReady}`,
    `- Final consent ready / 最终同意就绪：${summary.finalConsentReady}`,
    `- External provider API call executed / 已执行 provider API 调用：${summary.externalProviderApiCallExecuted}`,
    "",
    "W-P45.3 固定 provider 身份和 npm 包版本，不安装依赖、不读取 secret、不访问 OpenAI API、不生成写入动作。"
  ];
  return `${lines.join("\n")}\n`;
}

function renderReviewChecklist(evidence) {
  const { providerPacket } = evidence;
  const packagePin = providerPacket.provider.clientPackage;
  const lines = [
    "# W-P45.3 Provider Package Pin Review Checklist",
    "",
    "该清单用于后续 W-P45.4/W-P45.5 绑定前的人工或自动复核；W-P45.3 本身不执行 provider。",
    "",
    "## Package / 包",
    "",
    `- [x] Provider identity is concrete: \`${providerPacket.provider.id}\``,
    `- [x] npm package is pinned exactly: \`${packagePin.name}@${packagePin.version}\``,
    `- [x] License is permissive: \`${packagePin.license.expression}\``,
    `- [x] Registry integrity is recorded: \`${packagePin.integrity}\``,
    `- [x] Registry signature key id is recorded: \`${packagePin.signatureKeyIds.join(", ")}\``,
    `- [x] Provenance attestation reference is recorded: \`${packagePin.attestations.url}\``,
    "",
    "## Remaining Gates / 剩余 gate",
    "",
    "- [ ] Bind host-managed secret reference.",
    "- [ ] Bind real HTTPS destination allowlist and audit scope.",
    "- [ ] Generate metadata-only request preview.",
    "- [ ] Obtain provider/workspace/request/final consent.",
    "- [ ] Keep provider output review-only."
  ];
  return `${lines.join("\n")}\n`;
}

function renderReadinessDelta(evidence) {
  const lines = [
    "# W-P45.3 Execution Readiness After Provider Pin",
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

function first(values) {
  return Array.isArray(values) && values.length > 0 ? values[0] : undefined;
}

function countTrue(values) {
  return values.filter((value) => value === true).length;
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
