import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp48-productization-readiness-boundary-review");
const evidencePath = path.join(outputRoot, "evidence.json");
const readinessMatrixPath = path.join(outputRoot, "wp48-productization-readiness-matrix.md");
const boundaryDecisionLedgerPath = path.join(outputRoot, "wp48-productization-boundary-decision-ledger.md");
const deferredExecutionGatesPath = path.join(outputRoot, "wp48-non-productization-deferred-gates.md");
const nextInputsPath = path.join(outputRoot, "wp48-next-stage-inputs.md");

const classificationEvidencePath = path.join(
  rootDir,
  "dist",
  "wp48-evidence-classification-deferred-gate-ledger",
  "evidence.json"
);

await main();

/**
 * 生成 W-P48.3 productization readiness 与边界评审 evidence。
 * Generate W-P48.3 productization-readiness and boundary-review evidence.
 *
 * 中文：本脚本只把 W-P48.2 的四类 productization input 评估为“可产品化的
 * 只读/审查/摄入/边界 surface”或“必须继续后延的真实执行门禁”。它不运行
 * provider/network、不触发 checked apply、不调用宿主编辑 API、不修改目标项目。
 *
 * English: This script classifies W-P48.2 productization inputs into limited
 * read-only/review/intake/boundary surfaces and still-deferred execution gates.
 * It does not run provider/network calls, trigger checked apply, call host
 * editor APIs, or mutate target repositories.
 *
 * @returns {Promise<void>} Writes public-safe W-P48.3 evidence and reports.
 */
async function main() {
  const classificationEvidence = await readJson(classificationEvidencePath);
  const readinessMatrix = createReadinessMatrix(classificationEvidence);
  const boundaryDecisionLedger = createBoundaryDecisionLedger(readinessMatrix);
  const deferredExecutionGates = createDeferredExecutionGates(classificationEvidence, boundaryDecisionLedger);
  const nextStageInputs = createNextStageInputs(readinessMatrix, deferredExecutionGates);
  const summary = summarize({
    boundaryDecisionLedger,
    classificationEvidence,
    deferredExecutionGates,
    nextStageInputs,
    readinessMatrix
  });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P48.3 boundary review has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp48-productization-readiness-boundary-review",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp48-target-project-adoption-boundary-refresh",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P48.3",
    sourceEvidence: {
      wp48EvidenceClassification: normalizePath(classificationEvidencePath)
    },
    executionPolicy: {
      policy: "productization-boundary-review-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      sourcesContentPolicy: "none"
    },
    readinessMatrix,
    boundaryDecisionLedger,
    deferredExecutionGates,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      boundaryDecisionLedger: normalizePath(boundaryDecisionLedgerPath),
      deferredExecutionGates: normalizePath(deferredExecutionGatesPath),
      nextStageInputs: normalizePath(nextInputsPath),
      readinessMatrix: normalizePath(readinessMatrixPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P48.3 productization boundary evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(readinessMatrixPath, renderReadinessMatrix(evidence), "utf8");
  await writeFile(boundaryDecisionLedgerPath, renderBoundaryDecisionLedger(evidence), "utf8");
  await writeFile(deferredExecutionGatesPath, renderDeferredExecutionGates(evidence), "utf8");
  await writeFile(nextInputsPath, renderNextStageInputs(evidence), "utf8");

  console.log(`W-P48 productization readiness evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P48 productization readiness matrix prepared at ${normalizePath(readinessMatrixPath)}`);
  console.log(`W-P48 boundary decision ledger prepared at ${normalizePath(boundaryDecisionLedgerPath)}`);
}

/**
 * 将 W-P48.2 的 phase classification 转换为可产品化 surface 矩阵。
 * Convert W-P48.2 phase classifications into a productizable surface matrix.
 *
 * @param {any} classificationEvidence W-P48.2 evidence.
 * @returns {Record<string, unknown>} Productization readiness matrix.
 */
function createReadinessMatrix(classificationEvidence) {
  const surfaces = classificationEvidence.classificationLedger.items.map((item) => {
    const profile = surfaceProfileFor(item);
    return {
      id: profile.id,
      sourcePhase: item.phase,
      sourceClassification: item.classification.classificationKind,
      sourceCloseoutClass: item.closeoutClass,
      productizationMode: profile.productizationMode,
      surfaceKind: profile.surfaceKind,
      canProductizeNow: true,
      productizationScope: profile.productizationScope,
      requiredHostPolicy: profile.requiredHostPolicy,
      blockedClaims: profile.blockedClaims,
      remainingDeferredGateGroup: profile.remainingDeferredGateGroup,
      grantsExecutionAuthority: false,
      grantsWriteAuthority: false,
      grantsTargetMutationAuthority: false,
      grantsProviderNetworkAuthority: false,
      mayEmbedSourceBodies: false,
      mayExposePrivateMaterial: false
    };
  });

  return {
    contract: "hia-wp48-productization-readiness-matrix",
    contractVersion: "0.1.0-draft",
    reviewStatus: "ready-for-target-project-adoption-boundary-refresh",
    cycleGroupId: "C-HIA-P2",
    surfaces,
    finalCGroupCloseoutMayBeClaimed: false,
    productizationScopeStatement: "Only read-only, review-only, metadata-intake and disabled-boundary surfaces may be productized in this pass.",
    nextBoundaryRefresh: "W-P48.4 Target Project Adoption Boundary Refresh"
  };
}

function surfaceProfileFor(item) {
  const profiles = {
    "blocked-before-network": {
      id: "provider-review-governance-surface",
      productizationMode: "review-only-governance",
      surfaceKind: "provider-review-boundary",
      productizationScope: "Productize provider identity, package pin, destination reference, request-preview metadata and blocked-result display.",
      requiredHostPolicy: "Keep provider adapter review-only and require later host-mediated secret/network/final consent for real calls.",
      blockedClaims: [
        "provider-success",
        "destination-contact",
        "credential-access",
        "network-execution"
      ],
      remainingDeferredGateGroup: "wp45-real-provider-network-execution"
    },
    "metadata-only": {
      id: "target-owner-evidence-intake-surface",
      productizationMode: "metadata-only-intake",
      surfaceKind: "target-owner-evidence-boundary",
      productizationScope: "Productize owner evidence schema, validator, rejection ledger, host projections and report templates.",
      requiredHostPolicy: "Require target-owner supplied public-safe evidence; HIA automation must not run target commands.",
      blockedClaims: [
        "target-owner-command-executed",
        "branch-or-pr-created-by-hia",
        "adoption-trial-completed",
        "sandbox-created-by-hia"
      ],
      remainingDeferredGateGroup: "wp46-real-target-owner-adoption"
    },
    "observation-only": {
      id: "host-runtime-observation-surface",
      productizationMode: "read-only-observation",
      surfaceKind: "host-runtime-observation-boundary",
      productizationScope: "Productize public-safe host observation ledger, manual packet references and runtime route status.",
      requiredHostPolicy: "Keep release-grade archived capture optional and later-gated; do not expose local paths or private screenshots.",
      blockedClaims: [
        "release-grade-runtime-capture-archive",
        "visual-studio-implementation-complete",
        "runtime-capture-retained-as-public-artifact"
      ],
      remainingDeferredGateGroup: "wp44-release-grade-runtime-capture"
    },
    "pilot-preparation-only": {
      id: "checked-apply-boundary-surface",
      productizationMode: "disabled-write-boundary",
      surfaceKind: "checked-apply-pilot-boundary",
      productizationScope: "Productize transaction envelope, preflight, rollback/formatter/audit, confirmation surface and dry-run report intake as disabled write-boundary materials.",
      requiredHostPolicy: "Keep checked apply write disabled until a later host-owned pilot obtains final human confirmation and fresh conflict checks.",
      blockedClaims: [
        "checked-apply-write",
        "host-editor-api-call",
        "final-human-confirmation-collected",
        "target-mutation"
      ],
      remainingDeferredGateGroup: "wp47-real-checked-apply-write"
    }
  };
  return profiles[item.classification.classificationKind] ?? {
    id: `manual-review-${item.phase.toLowerCase()}`,
    productizationMode: "manual-review-required",
    surfaceKind: "unknown-boundary",
    productizationScope: "Unknown classification must not be productized automatically.",
    requiredHostPolicy: "Manual review required.",
    blockedClaims: ["unknown-execution-claim"],
    remainingDeferredGateGroup: "manual-review"
  };
}

/**
 * 创建产品化边界决策账本。
 * Create the productization boundary decision ledger.
 *
 * @param {Record<string, unknown>} readinessMatrix Readiness matrix.
 * @returns {Record<string, unknown>} Decision ledger.
 */
function createBoundaryDecisionLedger(readinessMatrix) {
  const decisions = readinessMatrix.surfaces.map((surface) => ({
    surfaceId: surface.id,
    sourcePhase: surface.sourcePhase,
    decision: "productize-limited-surface",
    productizationMode: surface.productizationMode,
    permittedCapabilities: permittedCapabilitiesFor(surface.productizationMode),
    deniedCapabilities: [
      ...surface.blockedClaims,
      "workspace-write",
      "target-repository-mutation",
      "provider-network-call",
      "target-command-by-hia",
      "source-body-embedding"
    ],
    requiresLaterGateToExecute: true
  }));
  return {
    contract: "hia-wp48-productization-boundary-decision-ledger",
    contractVersion: "0.1.0-draft",
    ledgerStatus: "limited-surface-productization-approved",
    decisions
  };
}

function permittedCapabilitiesFor(productizationMode) {
  const capabilities = {
    "disabled-write-boundary": [
      "show-disabled-apply-state",
      "show-preflight-requirements",
      "show-rollback-formatter-audit-readiness",
      "copy-review-or-owner-instruction"
    ],
    "metadata-only-intake": [
      "validate-owner-evidence-metadata",
      "show-accepted-rejected-ledger",
      "render-report-template",
      "link-artifact-references"
    ],
    "read-only-observation": [
      "show-host-observation-status",
      "show-capture-route",
      "show-redaction-policy",
      "link-public-safe-evidence"
    ],
    "review-only-governance": [
      "show-provider-identity",
      "show-package-pin",
      "show-request-preview-metadata",
      "show-blocked-before-network-result"
    ]
  };
  return capabilities[productizationMode] ?? ["manual-review-only"];
}

/**
 * 固定不能随 W-P48.3 产品化关闭的真实执行门禁。
 * Freeze real-execution gates that W-P48.3 productization must not close.
 *
 * @param {any} classificationEvidence W-P48.2 evidence.
 * @param {Record<string, unknown>} boundaryDecisionLedger Decision ledger.
 * @returns {Record<string, unknown>} Deferred execution gate ledger.
 */
function createDeferredExecutionGates(classificationEvidence, boundaryDecisionLedger) {
  return {
    contract: "hia-wp48-non-productization-deferred-gates",
    contractVersion: "0.1.0-draft",
    gateStatus: "execution-gates-remain-open",
    phaseGateGroups: classificationEvidence.deferredGateLedger.groupItems.map((item) => ({
      ...item,
      closedByProductization: false,
      productizationMayReferenceAsDeferred: true
    })),
    explicitGateItems: classificationEvidence.deferredGateLedger.explicitItems.map((item) => ({
      ...item,
      closedByProductization: false,
      productizationMayReferenceAsDeferred: true
    })),
    decisionCount: boundaryDecisionLedger.decisions.length
  };
}

function createNextStageInputs(readinessMatrix, deferredExecutionGates) {
  return {
    contract: "hia-wp48-next-stage-inputs",
    contractVersion: "0.1.0-draft",
    nextStage: "W-P48.4 Target Project Adoption Boundary Refresh",
    items: [
      {
        id: "target-project-adoption-boundary-refresh",
        status: "ready-for-wp48-4",
        description: "Refresh target-project adoption language so target repositories consume HIA productized surfaces without HIA mutating those repositories."
      },
      {
        id: "limited-surface-productization-ledger",
        status: "ready-for-wp48-4",
        description: `Carry ${readinessMatrix.surfaces.length} limited productization decisions forward as read-only/review/intake/boundary surfaces.`
      },
      {
        id: "deferred-execution-gate-preservation",
        status: "ready-for-wp48-4",
        description: `Keep ${deferredExecutionGates.phaseGateGroups.length} gate groups and ${deferredExecutionGates.explicitGateItems.length} explicit gates open.`
      }
    ],
    readyForNextStage: true
  };
}

function summarize({
  boundaryDecisionLedger,
  classificationEvidence,
  deferredExecutionGates,
  nextStageInputs,
  readinessMatrix
}) {
  const serialized = JSON.stringify({
    boundaryDecisionLedger,
    deferredExecutionGates,
    nextStageInputs,
    readinessMatrix
  });
  const allSurfaces = readinessMatrix.surfaces;
  return {
    phase: "W-P48.3",
    inputEvidenceCount: 1,
    readyInputEvidenceCount: isReadyEvidence(classificationEvidence) ? 1 : 0,
    inputHardFailureCount: number(classificationEvidence.summary?.hardFailureCount),
    productizationSurfaceCount: allSurfaces.length,
    limitedSurfaceApprovedCount: boundaryDecisionLedger.decisions.filter((item) => item.decision === "productize-limited-surface").length,
    readOnlyObservationSurfaceCount: allSurfaces.filter((item) => item.productizationMode === "read-only-observation").length,
    reviewOnlyGovernanceSurfaceCount: allSurfaces.filter((item) => item.productizationMode === "review-only-governance").length,
    metadataOnlyIntakeSurfaceCount: allSurfaces.filter((item) => item.productizationMode === "metadata-only-intake").length,
    disabledWriteBoundarySurfaceCount: allSurfaces.filter((item) => item.productizationMode === "disabled-write-boundary").length,
    executionAuthorityGrantCount: allSurfaces.filter((item) => item.grantsExecutionAuthority === true).length,
    writeAuthorityGrantCount: allSurfaces.filter((item) => item.grantsWriteAuthority === true).length,
    targetMutationAuthorityGrantCount: allSurfaces.filter((item) => item.grantsTargetMutationAuthority === true).length,
    providerNetworkAuthorityGrantCount: allSurfaces.filter((item) => item.grantsProviderNetworkAuthority === true).length,
    sourceBodyEmbeddingAllowedCount: allSurfaces.filter((item) => item.mayEmbedSourceBodies === true).length,
    privateMaterialExposureAllowedCount: allSurfaces.filter((item) => item.mayExposePrivateMaterial === true).length,
    deferredGateGroupCount: deferredExecutionGates.phaseGateGroups.length,
    explicitDeferredGateItemCount: deferredExecutionGates.explicitGateItems.length,
    closedDeferredGateCount: sum([
      deferredExecutionGates.phaseGateGroups.filter((item) => item.closedByProductization === true).length,
      deferredExecutionGates.explicitGateItems.filter((item) => item.closedByProductization === true).length
    ]),
    decisionDeniedCapabilityCount: sum(boundaryDecisionLedger.decisions.map((item) => item.deniedCapabilities.length)),
    finalCGroupCloseoutMayBeClaimed: readinessMatrix.finalCGroupCloseoutMayBeClaimed,
    canProceedToTargetProjectAdoptionBoundaryRefresh: nextStageInputs.readyForNextStage,
    canProceedToFinalCloseoutCandidate: false,
    checkedApplyWriteEnabledCount: number(classificationEvidence.summary?.checkedApplyWriteEnabledCount),
    hostEditorApiCallCount: number(classificationEvidence.summary?.hostEditorApiCallCount),
    checkedApplyTriggeredCount: number(classificationEvidence.summary?.checkedApplyTriggeredCount),
    workspaceWriteAllowedCount: number(classificationEvidence.summary?.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: number(classificationEvidence.summary?.targetRepositoryMutationCount),
    targetCommandExecutedByHiaCount: number(classificationEvidence.summary?.targetCommandExecutedByHiaCount),
    providerNetworkExecutedCount: number(classificationEvidence.summary?.providerNetworkExecutedCount),
    externalNetworkCallExecutedCount: number(classificationEvidence.summary?.externalNetworkCallExecutedCount),
    sourceBodyIncludedCount: number(classificationEvidence.summary?.sourceBodyIncludedCount),
    sourceTextIncludedCount: number(classificationEvidence.summary?.sourceTextIncludedCount),
    requestBodyIncludedCount: number(classificationEvidence.summary?.requestBodyIncludedCount),
    responseBodyIncludedCount: number(classificationEvidence.summary?.responseBodyIncludedCount),
    secretValueIncludedCount: number(classificationEvidence.summary?.secretValueIncludedCount),
    digestValueIncludedCount: number(classificationEvidence.summary?.digestValueIncludedCount),
    localAbsolutePathDetectedCount: sum([
      classificationEvidence.summary?.localAbsolutePathDetectedCount,
      countPathExposure(serialized)
    ]),
    credentialMaterialMarkerCount: sum([
      classificationEvidence.summary?.credentialMaterialMarkerCount,
      countCredentialMarkers(serialized)
    ]),
    sourcesContentMarkerCount: sum([
      classificationEvidence.summary?.sourcesContentMarkerCount,
      /"sourcesContent"\s*:/iu.test(serialized) ? 1 : 0
    ]),
    sourcesContentPolicy: "none",
    nextStage: nextStageInputs.nextStage
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP48_3_INPUT_READY", summary.inputEvidenceCount === 1
      && summary.readyInputEvidenceCount === 1
      && summary.inputHardFailureCount === 0),
    check("HIA_WP48_3_LIMITED_SURFACES_READY", summary.productizationSurfaceCount === 4
      && summary.limitedSurfaceApprovedCount === 4
      && summary.readOnlyObservationSurfaceCount === 1
      && summary.reviewOnlyGovernanceSurfaceCount === 1
      && summary.metadataOnlyIntakeSurfaceCount === 1
      && summary.disabledWriteBoundarySurfaceCount === 1),
    check("HIA_WP48_3_NO_EXECUTION_AUTHORITY_GRANTED", summary.executionAuthorityGrantCount === 0
      && summary.writeAuthorityGrantCount === 0
      && summary.targetMutationAuthorityGrantCount === 0
      && summary.providerNetworkAuthorityGrantCount === 0
      && summary.sourceBodyEmbeddingAllowedCount === 0
      && summary.privateMaterialExposureAllowedCount === 0),
    check("HIA_WP48_3_DEFERRED_GATES_PRESERVED", summary.deferredGateGroupCount === 4
      && summary.explicitDeferredGateItemCount === 14
      && summary.closedDeferredGateCount === 0
      && summary.decisionDeniedCapabilityCount >= 28),
    check("HIA_WP48_3_CLOSEOUT_BOUNDARY_READY", summary.finalCGroupCloseoutMayBeClaimed === false
      && summary.canProceedToTargetProjectAdoptionBoundaryRefresh === true
      && summary.canProceedToFinalCloseoutCandidate === false),
    check("HIA_WP48_3_NO_EXECUTION_OR_WRITE", summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0),
    check("HIA_WP48_3_PRIVACY_CLEAN", summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0
      && summary.sourcesContentPolicy === "none"),
    check("HIA_WP48_3_NEXT_STAGE_READY", summary.nextStage === "W-P48.4 Target Project Adoption Boundary Refresh")
  ];
}

function renderReadinessMatrix(evidence) {
  const rows = evidence.readinessMatrix.surfaces
    .map((item) => `| ${item.id} | ${item.sourcePhase} | ${item.productizationMode} | ${yesNo(item.canProductizeNow)} | ${item.productizationScope} |`)
    .join("\n");
  return `# W-P48 Productization Readiness Matrix

## 中文摘要

W-P48.3 允许四类 surface 以有限形态进入产品化：只读观察、只读审查、metadata-only 摄入和 disabled write boundary。它不授予真实执行、联网、写入或目标项目修改权限。

| Surface | Source phase | Productization mode | Can productize now | Scope |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderBoundaryDecisionLedger(evidence) {
  const rows = evidence.boundaryDecisionLedger.decisions
    .map((item) => `| ${item.surfaceId} | ${item.decision} | ${item.productizationMode} | ${item.permittedCapabilities.length} | ${item.deniedCapabilities.length} | ${yesNo(item.requiresLaterGateToExecute)} |`)
    .join("\n");
  return `# W-P48 Productization Boundary Decision Ledger

## 中文摘要

本账本记录 W-P48.3 的产品化边界决策。每项都只能产品化有限 surface，真实执行能力继续等待后续明确 gate。

| Surface | Decision | Mode | Permitted capabilities | Denied capabilities | Later gate required |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderDeferredExecutionGates(evidence) {
  const groups = evidence.deferredExecutionGates.phaseGateGroups
    .map((item) => `| ${item.id} | ${item.sourcePhase} | ${item.gateClass} | ${item.status} | ${yesNo(item.closedByProductization)} |`)
    .join("\n");
  const explicit = evidence.deferredExecutionGates.explicitGateItems
    .map((item) => `| ${item.id} | ${item.sourcePhase} | ${item.owner} | ${item.status} | ${yesNo(item.closedByProductization)} |`)
    .join("\n");
  return `# W-P48 Non-Productization Deferred Gates

## 中文摘要

W-P48.3 没有关闭任何真实执行门禁。下面这些 gate 只能作为后延事项被引用，不能因为 surface 产品化而自动完成。

## Gate Groups

| Gate | Source phase | Class | Status | Closed by productization |
| --- | --- | --- | --- | --- |
${groups}

## Explicit Gates

| Gate | Source phase | Owner | Status | Closed by productization |
| --- | --- | --- | --- | --- |
${explicit}
`;
}

function renderNextStageInputs(evidence) {
  const rows = evidence.nextStageInputs.items
    .map((item) => `| ${item.id} | ${item.status} | ${item.description} |`)
    .join("\n");
  return `# W-P48 Next Stage Inputs

## 中文摘要

W-P48.4 应刷新目标项目采用边界：目标项目可以消费 HIA 产品化 surface 和中心通知，但 HIA 仍不得主动修改目标项目或替目标项目执行命令。

| Input | Status | Description |
| --- | --- | --- |
${rows}
`;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function yesNo(value) {
  return value === true ? "yes" : "no";
}

function number(value) {
  return Number.isFinite(value) ? value : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function countPathExposure(value) {
  return countMatches(value, /(^|[^A-Za-z])[A-Z]:[\\/]/gu)
    + countMatches(value, /\\\\[A-Za-z0-9._-]+\\/gu)
    + countMatches(value, /file:\/\//giu);
}

function countCredentialMarkers(value) {
  return countMatches(value, /\b(?:sk|ghp|github_pat|npm)_[A-Za-z0-9_-]+/gu);
}

function countMatches(value, pattern) {
  return Array.from(String(value).matchAll(pattern)).length;
}

function assertNoPrivateMarkers(value, label) {
  assert.equal(countPathExposure(value), 0, `${label} includes a local path marker.`);
  assert.equal(countCredentialMarkers(value), 0, `${label} includes a credential-like marker.`);
  assert.equal(/"sourcesContent"\s*:/iu.test(value), false, `${label} includes sourcesContent.`);
  assert.equal(/work-zone/iu.test(value), false, `${label} includes private work-zone path text.`);
}
