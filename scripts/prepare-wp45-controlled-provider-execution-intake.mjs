import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp45-controlled-provider-execution-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const readinessMatrixPath = path.join(outputRoot, "controlled-provider-execution-readiness-matrix.md");
const contractGapPath = path.join(outputRoot, "provider-network-contract-gap.md");
const stagePlanPath = path.join(outputRoot, "wp45-stage-plan.md");
const providerSdkPath = path.join(rootDir, "packages", "provider-sdk", "src", "index.ts");
const inputDefinitions = [
  input("wp44-closeout", "dist/wp44-closeout-downstream-inputs/evidence.json", "ready-for-wp45-controlled-remote-provider-execution-slice"),
  input("wp40-closeout", "dist/wp40-closeout-wp41-wp42-inputs/evidence.json", "ready-for-wp41-target-owner-branch-pr-smoke"),
  input("provider-candidate-selection", "dist/wp40-remote-provider-candidate-selection/evidence.json", "ready-for-wp40-secret-reference-and-network-consent-packet"),
  input("secret-network-consent", "dist/wp40-secret-network-consent-packet/evidence.json", "ready-for-wp40-request-preview-and-privacy-dry-run"),
  input("request-preview-privacy", "dist/wp40-request-preview-privacy-dry-run/evidence.json", "ready-for-wp40-real-remote-provider-smoke-manual-decision"),
  input("real-smoke-execution-gate", "dist/wp40-real-remote-provider-smoke-execution-gate/evidence.json", "ready-for-wp40-provider-result-review-linkage-with-blocked-smoke"),
  input("provider-review-linkage", "dist/wp40-provider-result-review-linkage/evidence.json", "ready-for-wp40-closeout-and-wp41-wp42-inputs"),
  input("provider-registry-policy", "dist/wp36-provider-registry-installation-policy/evidence.json", "ready-for-secret-storage-boundary"),
  input("source-privacy-gate", "dist/wp36-source-excerpt-privacy-gate/evidence.json", "ready-for-safe-invocation-dry-run"),
  input("safe-invocation-dry-run", "dist/wp36-safe-invocation-dry-run/evidence.json", "ready-for-wp36-closeout-and-checked-apply-inputs")
];

await main();

/**
 * 生成 W-P45.1 controlled provider execution intake evidence。
 * Generate W-P45.1 controlled provider execution intake evidence.
 *
 * W-P45.1 consumes W-P44 host visibility and the earlier W-P40 provider smoke
 * gate. It does not run a remote provider. Instead, it reconciles every hard
 * precondition that must become concrete before a later stage can execute a
 * host-mediated remote provider smoke.
 *
 * 中文：W-P45.1 消费 W-P44 宿主可见性与 W-P40 provider smoke gate 证据。
 * 它不执行远程 provider，而是把后续真正 host-mediated remote provider smoke
 * 前必须补齐的 concrete provider、secret、destination、consent、privacy 与
 * provider contract 缺口全部入账。
 *
 * @returns {Promise<void>} Writes public-safe W-P45.1 evidence and human docs.
 */
async function main() {
  const inputReports = await Promise.all(inputDefinitions.map(readInputReport));
  const inputs = Object.fromEntries(inputReports.map((report) => [report.id, report.evidence]));
  const providerSdkFacts = await readProviderSdkFacts();
  const executionReadinessMatrix = createExecutionReadinessMatrix(inputs, providerSdkFacts);
  const contractGap = createProviderNetworkContractGap(providerSdkFacts);
  const stagePlan = createStagePlan(executionReadinessMatrix, contractGap);
  const summary = summarize({ contractGap, executionReadinessMatrix, inputReports, inputs, providerSdkFacts, stagePlan });
  const checks = [
    check("HIA_WP45_INTAKE_INPUTS_READY", summary.readyInputCount === summary.inputCount
      && summary.inputHardFailureCount === 0
      && summary.wp44CloseoutReady === true
      && summary.wp40CloseoutReady === true, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        inputStatuses: inputReports.map(({ expectedStatus, id, status }) => ({ expectedStatus, id, status })),
        readyInputCount: summary.readyInputCount
      }
    }),
    check("HIA_WP45_INTAKE_HOST_VISIBILITY_READY", summary.hostLedgerEntryCount === 3
      && summary.manualObservationCount >= 2
      && summary.hostEvidenceAcceptedForPlanning === true, {
      actual: {
        hostEvidenceAcceptedForPlanning: summary.hostEvidenceAcceptedForPlanning,
        hostLedgerEntryCount: summary.hostLedgerEntryCount,
        manualObservationCount: summary.manualObservationCount
      }
    }),
    check("HIA_WP45_INTAKE_BLOCKERS_RECORDED_NOT_BYPASSED", summary.blockingGateCount >= 5
      && summary.concreteProviderReady === false
      && summary.executionBoundSecretReady === false
      && summary.realDestinationReady === false
      && summary.finalConsentReady === false
      && summary.remoteProviderExecutionReady === false, {
      actual: {
        blockingGateCount: summary.blockingGateCount,
        concreteProviderReady: summary.concreteProviderReady,
        executionBoundSecretReady: summary.executionBoundSecretReady,
        finalConsentReady: summary.finalConsentReady,
        realDestinationReady: summary.realDestinationReady,
        remoteProviderExecutionReady: summary.remoteProviderExecutionReady
      }
    }),
    check("HIA_WP45_INTAKE_PROVIDER_CONTRACT_GAP_VISIBLE", summary.providerSdkNetworkAccessDisabledOnly === true
      && summary.providerSdkRejectsNetworkAccess === true
      && summary.remoteProviderContractGapCount === 1
      && summary.recommendedNextContract === "host-mediated-remote-provider-execution-envelope", {
      actual: {
        providerSdkNetworkAccessDisabledOnly: summary.providerSdkNetworkAccessDisabledOnly,
        providerSdkRejectsNetworkAccess: summary.providerSdkRejectsNetworkAccess,
        recommendedNextContract: summary.recommendedNextContract,
        remoteProviderContractGapCount: summary.remoteProviderContractGapCount
      }
    }),
    check("HIA_WP45_INTAKE_SOURCE_SECRET_NETWORK_CLEAN", summary.sourcePolicy === "none"
      && summary.sourcesContentPolicy === "none"
      && summary.credentialValueIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false
      && summary.destinationContactedCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        destinationContactedCount: summary.destinationContactedCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        sourcePolicy: summary.sourcePolicy,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP45_INTAKE_REVIEW_ONLY_NO_WRITE", summary.reviewOnlyOutputRequired === true
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
    check("HIA_WP45_INTAKE_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp45-controlled-provider-execution-intake-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp45-provider-execution-boundary-contract" : "blocked",
    sourceEvidence: Object.fromEntries(inputReports.map((report) => [report.id, normalizePath(report.path)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    inputReports: inputReports.map(({ contract, contractVersion, expectedStatus, hardFailureCount, id, status }) => ({
      contract,
      contractVersion,
      expectedStatus,
      hardFailureCount,
      id,
      status
    })),
    providerSdkFacts,
    executionReadinessMatrix,
    contractGap,
    stagePlan,
    checks,
    generatedDocs: {
      readinessMatrix: normalizePath(readinessMatrixPath),
      providerNetworkContractGap: normalizePath(contractGapPath),
      stagePlan: normalizePath(stagePlanPath)
    },
    nextContractInputs: [
      {
        phase: "W-P45.2",
        topic: "provider-execution-boundary-contract",
        status: "ready-input",
        reasonZh: "W-P45.1 已把 concrete provider 与 host-mediated remote execution 的 contract gap 明确为下一步输入。"
      },
      {
        phase: "W-P45.3",
        topic: "concrete-provider-identity-and-package-pin",
        status: "blocked-until-provider-selected",
        reasonZh: "当前 candidate 仍是 template/draft，不能执行真实网络。"
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P45 controlled provider execution intake evidence");
  assert.equal(hardFailures.length, 0, `W-P45 controlled provider execution intake has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(readinessMatrixPath, renderReadinessMatrix(evidence), "utf8");
  await writeFile(contractGapPath, renderContractGap(evidence), "utf8");
  await writeFile(stagePlanPath, renderStagePlan(evidence), "utf8");
  console.log(`W-P45 controlled provider execution intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P45 readiness matrix prepared at ${normalizePath(readinessMatrixPath)}`);
  console.log(`W-P45 provider network contract gap prepared at ${normalizePath(contractGapPath)}`);
}

function input(id, relativePath, expectedStatus) {
  return {
    expectedStatus,
    id,
    path: path.join(rootDir, relativePath)
  };
}

async function readInputReport(inputDefinition) {
  const evidence = JSON.parse(await readFile(inputDefinition.path, "utf8"));
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  return {
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    evidence,
    expectedStatus: inputDefinition.expectedStatus,
    hardFailureCount: Number(evidence.summary?.hardFailureCount ?? checks.filter((item) => item.status === "fail").length),
    id: inputDefinition.id,
    path: inputDefinition.path,
    status: evidence.status
  };
}

async function readProviderSdkFacts() {
  const source = await readFile(providerSdkPath, "utf8");
  return {
    contract: "hia-provider-sdk-local-contract-facts",
    contractVersion: "0.1.0-draft",
    sourceRef: "packages/provider-sdk/src/index.ts",
    networkAccessDisabledOnly: /HiaProviderNetworkAccess\s*=\s*"disabled"/u.test(source),
    rejectsNetworkAccess: /HIA_PROVIDER_NETWORK_FORBIDDEN/u.test(source),
    validatesProviderResult: /validateHiaProviderResult/u.test(source),
    forbidsDirectEditOutput: /HIA_PROVIDER_DIRECT_EDIT_FORBIDDEN/u.test(source),
    forbidsSourceBody: /HIA_PROVIDER_SOURCE_BODY_FORBIDDEN/u.test(source),
    sourceBodyIncluded: false,
    interpretationZh: "当前 P1 provider SDK 只允许 review-only/offline provider。真实 remote execution 需要 host-mediated execution envelope 或后续 provider contract 扩展，不能直接复用现有 adapter 作为联网执行入口。"
  };
}

function createExecutionReadinessMatrix(inputs, providerSdkFacts) {
  const wp44 = inputs["wp44-closeout"];
  const wp40 = inputs["wp40-closeout"];
  const candidate = first(inputs["provider-candidate-selection"].candidatePackets);
  const secretRefs = safeArray(inputs["secret-network-consent"].secretReferencePacket?.secretReferences);
  const consentRecords = safeArray(inputs["secret-network-consent"].networkConsentPacket?.consentRecords);
  const destinations = safeArray(inputs["secret-network-consent"].networkConsentPacket?.destinationPolicy?.destinations);
  const requestPreview = inputs["request-preview-privacy"].requestPreview;
  const smokeGate = inputs["real-smoke-execution-gate"];
  const reviewLinkage = inputs["provider-review-linkage"];
  const gates = [
    satisfiedGate("host-runtime-observation-baseline", "W-P44", "VS Code 与 DevTools 手工 observation 已由用户确认，Visual Studio 已有 route decision。", {
      evidenceValue: `${Number(wp44.summary?.manualVerificationConfirmedCount ?? 0)} manual observations / ${Number(wp44.summary?.acceptedRouteDecisionOnlyCount ?? 0)} route decision`
    }),
    satisfiedGate("provider-review-linkage-baseline", "W-P40", "blocked/refused provider review linkage 已可被宿主消费，仍是 review-only。", {
      evidenceValue: reviewLinkage.status
    }),
    blockingGate("concrete-provider-identity", "W-P45.3", "当前 provider candidate 仍是 remote-api-provider-template，不是可执行 concrete provider。", {
      evidenceValue: candidate?.providerId ?? candidate?.id ?? "missing"
    }),
    blockingGate("immutable-provider-package-version", "W-P45.3", "当前 provider package 仍是 draft/template，未固定真实 registry version、integrity 与 provenance。", {
      evidenceValue: candidate?.packageIdentity?.version ?? "missing"
    }),
    blockingGate("provider-sdk-remote-execution-contract", "W-P45.2", "P1 provider SDK 只允许 networkAccess disabled；真实 remote execution 需要独立 host-mediated execution envelope 或 contract extension。", {
      evidenceValue: providerSdkFacts.networkAccessDisabledOnly ? "disabled-only" : "unknown"
    }),
    blockingGate("execution-bound-secret-reference", "W-P45.4", "secret reference 仍是 reference-only，未 bound for execution，且 credential access 未授予。", {
      evidenceValue: `${secretRefs.filter((item) => item.boundForExecution === true).length} / ${secretRefs.length} bound`
    }),
    blockingGate("real-https-destination", "W-P45.4", "destination 仍为 placeholder 或未通过真实 allowlist/contact readiness。", {
      evidenceValue: destinations.map((destination) => destination.origin).join(", ") || "missing"
    }),
    blockingGate("workspace-request-final-consent", "W-P45.5", "provider/workspace/request/final consent 未全部通过，final network approval 不存在。", {
      evidenceValue: `${consentRecords.filter((record) => record.status === "approved").length} approved / ${consentRecords.length} consent records`
    }),
    satisfiedGate("source-privacy-default-none", "W-P45", "当前 request preview 保持 metadata-only，source excerpt 与 sourcesContent 均为 none。", {
      evidenceValue: requestPreview?.payloadPreview?.sourcePolicy?.sourcesContentPolicy ?? "none"
    }),
    satisfiedGate("review-only-no-write-authority", "W-P45", "provider output 只能进入 review linkage，不授予 direct apply、checked apply trigger、workspace write 或 target mutation。", {
      evidenceValue: wp40.summary?.reviewOnlyOutputRequired === true ? "review-only" : "unknown"
    }),
    satisfiedGate("public-safe-evidence", "W-P45", "evidence 不含源码正文、secret value、digest、本地路径或 sourcesContent。", {
      evidenceValue: "privacy-clean"
    }),
    blockingGate("real-remote-provider-execution", "W-P45.6", "W-P45.1 只做 intake；真实 provider/network 仍未执行，也不得在前置 gate 缺失时执行。", {
      evidenceValue: smokeGate.summary?.executionDecisionStatus ?? "blocked-before-network"
    })
  ];

  return {
    contract: "hia-controlled-provider-execution-readiness-matrix",
    contractVersion: "0.1.0-draft",
    phase: "W-P45.1",
    status: "intake-complete-execution-blocked-by-design",
    gates
  };
}

function createProviderNetworkContractGap(providerSdkFacts) {
  return {
    contract: "hia-provider-network-contract-gap",
    contractVersion: "0.1.0-draft",
    status: "gap-recorded",
    gapCount: 1,
    gaps: [
      {
        id: "provider-sdk-p1-network-disabled-only",
        severity: "blocking-before-real-remote-execution",
        currentFact: providerSdkFacts.networkAccessDisabledOnly
          ? "provider-sdk-p1-network-access-disabled-only"
          : "provider-sdk-network-access-model-unknown",
        implicationZh: "不能把真实外部网络调用塞进现有 provider adapter provide()。否则会绕开已建立的 host mediator、secret store、consent 与 audit 边界。",
        recommendedNextContract: "host-mediated-remote-provider-execution-envelope",
        alternatives: [
          {
            id: "host-mediated-envelope",
            recommendation: "preferred",
            noteZh: "新增一个 host-owned execution envelope：provider adapter 仍保持 review-only，远程 HTTP 由宿主 mediator 代发并归档 consent/audit。"
          },
          {
            id: "provider-sdk-network-extension",
            recommendation: "later-after-audit",
            noteZh: "扩展 provider SDK 的 network capability，但必须重新审计 secret、network、source、audit、host UX 与 supply-chain 风险。"
          }
        ]
      }
    ]
  };
}

function createStagePlan(executionReadinessMatrix, contractGap) {
  return {
    contract: "hia-wp45-stage-plan",
    contractVersion: "0.1.0-draft",
    phase: "W-P45",
    status: "started",
    stages: [
      stage("W-P45.1", "Controlled Provider Execution Intake And Gate Reconciliation", "已完成第一轮", "汇总 W-P44/W-P40/W-P36 输入，生成 execution readiness matrix 与 provider network contract gap。"),
      stage("W-P45.2", "Provider Execution Boundary Contract", "下一步", "定义 host-mediated remote provider execution envelope，使真实网络调用不破坏 provider SDK review-only 边界。"),
      stage("W-P45.3", "Concrete Provider Identity And Package Pin Packet", "待执行", "选择真实 provider/package/version/provenance/license/integrity，不允许 template/draft 执行。"),
      stage("W-P45.4", "Host Secret Reference And Destination Binding", "待执行", "把 host-bound secret reference、真实 HTTPS destination 与 redacted audit 绑定到 request。"),
      stage("W-P45.5", "Request Preview And Final Consent Packet", "待执行", "生成 provider-safe request preview，完成 provider/workspace/request/final consent。"),
      stage("W-P45.6", "Minimal Remote Execution Or Explicit Blocked Result", "待执行", "在 gate 全部满足后执行最小 smoke；否则产出可审查 blocked/refused result shape。"),
      stage("W-P45.7", "Closeout And W-P46/W-P47 Inputs", "待执行", "收口真实执行或 blocked evidence，交给 target-owner evidence ingestion 与 checked apply pilot。")
    ],
    requiredBeforeExecution: executionReadinessMatrix.gates
      .filter((gate) => gate.status === "blocking")
      .map((gate) => gate.id),
    contractGapIds: contractGap.gaps.map((gap) => gap.id)
  };
}

function summarize({ contractGap, executionReadinessMatrix, inputReports, inputs, providerSdkFacts, stagePlan }) {
  const serializedPackets = JSON.stringify({ contractGap, executionReadinessMatrix, stagePlan });
  const wp44 = inputs["wp44-closeout"];
  const wp40 = inputs["wp40-closeout"];
  const requestPreview = inputs["request-preview-privacy"].requestPreview;
  const smokeGateSummary = inputs["real-smoke-execution-gate"].summary ?? {};
  const reviewLinkageSummary = inputs["provider-review-linkage"].summary ?? {};
  const gates = executionReadinessMatrix.gates;
  const blockingGates = gates.filter((gate) => gate.status === "blocking");

  return {
    phase: "W-P45.1",
    inputCount: inputReports.length,
    readyInputCount: inputReports.filter((report) => report.status === report.expectedStatus).length,
    inputHardFailureCount: inputReports.reduce((total, report) => total + report.hardFailureCount, 0),
    wp44CloseoutReady: wp44.status === "ready-for-wp45-controlled-remote-provider-execution-slice",
    wp40CloseoutReady: wp40.status === "ready-for-wp41-target-owner-branch-pr-smoke",
    hostLedgerEntryCount: Number(wp44.summary?.hostLedgerEntryCount ?? 0),
    manualObservationCount: Number(wp44.summary?.manualVerificationConfirmedCount ?? 0),
    hostEvidenceAcceptedForPlanning: Number(wp44.summary?.acceptedObservationOnlyCount ?? 0) >= 2,
    gateCount: gates.length,
    satisfiedGateCount: gates.filter((gate) => gate.status === "satisfied").length,
    blockingGateCount: blockingGates.length,
    blockingGateIds: blockingGates.map((gate) => gate.id),
    concreteProviderReady: gateSatisfied(gates, "concrete-provider-identity"),
    executionBoundSecretReady: gateSatisfied(gates, "execution-bound-secret-reference"),
    realDestinationReady: gateSatisfied(gates, "real-https-destination"),
    finalConsentReady: gateSatisfied(gates, "workspace-request-final-consent"),
    remoteProviderExecutionReady: blockingGates.length === 0,
    providerSdkNetworkAccessDisabledOnly: providerSdkFacts.networkAccessDisabledOnly,
    providerSdkRejectsNetworkAccess: providerSdkFacts.rejectsNetworkAccess,
    remoteProviderContractGapCount: contractGap.gapCount,
    recommendedNextContract: contractGap.gaps[0]?.recommendedNextContract,
    sourcePolicy: requestPreview?.payloadPreview?.sourcePolicy?.sourceExcerptPolicy ?? "none",
    sourcesContentPolicy: requestPreview?.payloadPreview?.sourcePolicy?.sourcesContentPolicy ?? "none",
    credentialValueIncludedCount: Number(smokeGateSummary.credentialValueIncludedCount ?? 0),
    sourceTextIncludedCount: Number(smokeGateSummary.sourceTextIncludedCount ?? 0),
    externalNetworkCallExecuted: smokeGateSummary.externalNetworkCallExecuted === true || wp40.summary?.externalNetworkCallExecuted === true,
    realRemoteProviderInvocationExecuted: smokeGateSummary.realRemoteProviderInvocationExecuted === true || wp40.summary?.realRemoteProviderInvocationExecuted === true,
    destinationContactedCount: Number(smokeGateSummary.destinationContactedCount ?? wp40.summary?.destinationContactedCount ?? 0),
    reviewOnlyOutputRequired: reviewLinkageSummary.reviewOnlyOutputRequired === true || wp40.summary?.reviewOnlyOutputRequired === true,
    directApplyAllowedCount: Number(reviewLinkageSummary.directApplyAllowedCount ?? 0) + Number(wp40.summary?.directApplyAllowedCount ?? 0),
    checkedApplyTriggeredCount: Number(reviewLinkageSummary.checkedApplyTriggeredCount ?? 0) + Number(wp40.summary?.checkedApplyTriggeredCount ?? 0),
    workspaceWriteAllowedCount: Number(reviewLinkageSummary.workspaceWriteAllowedCount ?? 0) + Number(wp40.summary?.workspaceWriteAllowedCount ?? 0),
    targetRepositoryMutationCount: Number(reviewLinkageSummary.targetRepositoryMutationCount ?? 0) + Number(wp40.summary?.targetRepositoryMutationCount ?? 0),
    directEditObjectCount: Number(reviewLinkageSummary.directEditObjectCount ?? 0) + Number(wp40.summary?.directEditObjectCount ?? 0),
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ contractGap, executionReadinessMatrix, stagePlan }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ contractGap, executionReadinessMatrix, stagePlan }),
    pathExposureCount: countPathExposure(serializedPackets),
    nextStage: "W-P45.2 Provider Execution Boundary Contract"
  };
}

function gateSatisfied(gates, id) {
  return gates.some((gate) => gate.id === id && gate.status === "satisfied");
}

function satisfiedGate(id, phase, noteZh, extra = {}) {
  return gate(id, "satisfied", phase, noteZh, extra);
}

function blockingGate(id, phase, noteZh, extra = {}) {
  return gate(id, "blocking", phase, noteZh, extra);
}

function gate(id, status, ownerPhase, noteZh, extra) {
  return {
    id,
    noteZh,
    ownerPhase,
    status,
    ...extra
  };
}

function stage(id, name, status, goalZh) {
  return {
    goalZh,
    id,
    name,
    status
  };
}

function first(value) {
  return safeArray(value)[0];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
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

function renderReadinessMatrix(evidence) {
  const { executionReadinessMatrix, summary } = evidence;
  const lines = [
    "# W-P45.1 Controlled Provider Execution Readiness Matrix",
    "",
    "## 摘要 / Summary",
    "",
    `- 状态 / Status：\`${evidence.status}\``,
    `- Gate / 门禁：${summary.satisfiedGateCount} satisfied，${summary.blockingGateCount} blocking`,
    `- 真实 provider 执行就绪 / Remote execution ready：${summary.remoteProviderExecutionReady}`,
    `- 外部网络已执行 / External network executed：${summary.externalNetworkCallExecuted}`,
    "",
    "## Matrix / 矩阵",
    "",
    "| Gate | Status | Owner Phase | Evidence |",
    "| --- | --- | --- | --- |"
  ];

  for (const gateItem of executionReadinessMatrix.gates) {
    lines.push(`| \`${gateItem.id}\` | \`${gateItem.status}\` | \`${gateItem.ownerPhase}\` | ${gateItem.evidenceValue ?? gateItem.noteZh} |`);
  }

  lines.push("");
  lines.push("W-P45.1 只证明入口矩阵已经齐备；它没有执行 provider、没有访问外部网络、没有读取 secret value、没有传源码正文，也没有授予写入权限。");
  return `${lines.join("\n")}\n`;
}

function renderContractGap(evidence) {
  const { contractGap, providerSdkFacts } = evidence;
  const lines = [
    "# W-P45.1 Provider Network Contract Gap",
    "",
    "## 当前结论",
    "",
    `- Provider SDK network access disabled-only：${providerSdkFacts.networkAccessDisabledOnly}`,
    `- Provider SDK rejects network access：${providerSdkFacts.rejectsNetworkAccess}`,
    `- Gap count：${contractGap.gapCount}`,
    "",
    "现有 P1 provider adapter 合约应继续保持 review-only。W-P45 后续若要做真实 remote smoke，应优先新增 host-mediated remote provider execution envelope，由宿主负责 secret store、network mediator、destination allowlist、consent、redacted audit 与 final confirmation。",
    "",
    "## Options / 选项",
    "",
    "| Option | Recommendation | Note |",
    "| --- | --- | --- |"
  ];

  for (const option of contractGap.gaps[0].alternatives) {
    lines.push(`| \`${option.id}\` | \`${option.recommendation}\` | ${option.noteZh} |`);
  }

  return `${lines.join("\n")}\n`;
}

function renderStagePlan(evidence) {
  const lines = [
    "# W-P45 Stage Plan",
    "",
    "| Stage | Status | Goal |",
    "| --- | --- | --- |"
  ];

  for (const stageItem of evidence.stagePlan.stages) {
    lines.push(`| \`${stageItem.id}\` | \`${stageItem.status}\` | ${stageItem.goalZh} |`);
  }

  lines.push("");
  lines.push("下一步优先执行 W-P45.2：定义 provider execution boundary contract，而不是直接选择商业 provider 或执行网络调用。");
  return `${lines.join("\n")}\n`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
