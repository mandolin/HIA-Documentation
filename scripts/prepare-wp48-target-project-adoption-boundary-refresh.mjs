import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp48-target-project-adoption-boundary-refresh");
const evidencePath = path.join(outputRoot, "evidence.json");
const adoptionBoundaryPath = path.join(outputRoot, "target-project-adoption-boundary.md");
const consumptionGuidePath = path.join(outputRoot, "limited-surface-consumption-guide.md");
const ownerEvidenceBoundaryPath = path.join(outputRoot, "owner-evidence-boundary-refresh.md");
const nextInputsPath = path.join(outputRoot, "wp48-next-stage-inputs.md");

const productizationEvidencePath = path.join(
  rootDir,
  "dist",
  "wp48-productization-readiness-boundary-review",
  "evidence.json"
);

await main();

/**
 * 生成 W-P48.4 目标项目采用边界刷新 evidence。
 * Generate W-P48.4 target-project adoption-boundary refresh evidence.
 *
 * 中文：本脚本只把 W-P48.3 的 limited surfaces 转换为目标项目可主动消费的
 * adoption boundary、通知拉取模型和 owner evidence 边界。HIA 不写目标仓库、
 * 不运行目标命令、不创建目标项目 branch/PR/sandbox，也不触发 checked apply。
 *
 * English: This script converts W-P48.3 limited surfaces into target-project
 * pull-based adoption boundaries, notification consumption and owner-evidence
 * rules. HIA does not write target repositories, run target commands, create
 * target branches/PRs/sandboxes, or trigger checked apply.
 *
 * @returns {Promise<void>} Writes public-safe W-P48.4 evidence and reports.
 */
async function main() {
  const productizationEvidence = await readJson(productizationEvidencePath);
  const adoptionBoundary = createAdoptionBoundary(productizationEvidence);
  const consumptionGuide = createConsumptionGuide(adoptionBoundary, productizationEvidence);
  const ownerEvidenceBoundary = createOwnerEvidenceBoundary(adoptionBoundary);
  const nextStageInputs = createNextStageInputs(adoptionBoundary, ownerEvidenceBoundary);
  const summary = summarize({
    adoptionBoundary,
    consumptionGuide,
    nextStageInputs,
    ownerEvidenceBoundary,
    productizationEvidence
  });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P48.4 adoption boundary refresh has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp48-target-project-adoption-boundary-refresh",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp48-c-hia-p2-closeout-candidate",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P48.4",
    sourceEvidence: {
      wp48ProductizationBoundary: normalizePath(productizationEvidencePath)
    },
    executionPolicy: {
      policy: "target-project-adoption-boundary-refresh-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      sourcesContentPolicy: "none"
    },
    adoptionBoundary,
    consumptionGuide,
    ownerEvidenceBoundary,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      adoptionBoundary: normalizePath(adoptionBoundaryPath),
      consumptionGuide: normalizePath(consumptionGuidePath),
      nextStageInputs: normalizePath(nextInputsPath),
      ownerEvidenceBoundary: normalizePath(ownerEvidenceBoundaryPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P48.4 target-project adoption boundary evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(adoptionBoundaryPath, renderAdoptionBoundary(evidence), "utf8");
  await writeFile(consumptionGuidePath, renderConsumptionGuide(evidence), "utf8");
  await writeFile(ownerEvidenceBoundaryPath, renderOwnerEvidenceBoundary(evidence), "utf8");
  await writeFile(nextInputsPath, renderNextStageInputs(evidence), "utf8");

  console.log(`W-P48 target project adoption boundary evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P48 target project adoption boundary prepared at ${normalizePath(adoptionBoundaryPath)}`);
  console.log(`W-P48 limited surface consumption guide prepared at ${normalizePath(consumptionGuidePath)}`);
}

/**
 * 创建目标项目采用边界。
 * Create the target-project adoption boundary.
 *
 * @param {any} productizationEvidence W-P48.3 evidence.
 * @returns {Record<string, unknown>} Adoption boundary model.
 */
function createAdoptionBoundary(productizationEvidence) {
  const targetClasses = [
    {
      id: "hia-self",
      targetKind: "first-party-self-documentation",
      ownerActionModel: "hia-maintainer-explicit-action",
      allowedConsumption: "consume-limited-surfaces-and-run-self-owned-evidence-gates"
    },
    {
      id: "target-typescript-project",
      targetKind: "external-or-adjacent-typescript-project",
      ownerActionModel: "target-owner-pull-and-execute",
      allowedConsumption: "consume-tsdoc/jsdoc-oriented limited surfaces and submit owner evidence"
    },
    {
      id: "target-dotnet-project",
      targetKind: "external-or-adjacent-dotnet-project",
      ownerActionModel: "target-owner-pull-and-execute",
      allowedConsumption: "consume dotnetdoc-oriented limited surfaces and submit owner evidence"
    },
    {
      id: "satellite-doc-line-project",
      targetKind: "hia-satellite-docline",
      ownerActionModel: "repository-maintainer-pull-and-release",
      allowedConsumption: "consume shared contract, package, release and reference surfaces"
    }
  ];
  const surfaces = productizationEvidence.readinessMatrix.surfaces.map((surface) => ({
    surfaceId: surface.id,
    productizationMode: surface.productizationMode,
    consumptionStatus: "available-for-target-owner-pull",
    targetOwnerActionRequired: true,
    hiaMayPushToTarget: false,
    hiaMayOpenTargetBranchOrPr: false,
    hiaMayRunTargetCommand: false,
    hiaMayApplyTargetEdit: false,
    hiaMayReadTargetSourceBody: false,
    publicSafeOnly: true,
    adoptionBoundaryStatement: statementForSurface(surface)
  }));
  const notificationModel = {
    model: "central-notification-pull",
    targetProjectReadsNotification: true,
    hiaPushesNotificationIntoTargetRepository: false,
    notificationBodyMustBeChineseFirst: true,
    notificationMayReferencePublicSafeArtifactsOnly: true,
    targetOwnerMayMirrorRelevantNotes: true
  };
  return {
    contract: "hia-wp48-target-project-adoption-boundary",
    contractVersion: "0.1.0-draft",
    boundaryStatus: "ready-for-closeout-candidate",
    targetClasses,
    surfaces,
    notificationModel,
    adoptionRuleCount: targetClasses.length * surfaces.length,
    targetRepositoryMutationByHia: false,
    targetCommandExecutionByHia: false,
    targetBranchOrPrCreationByHia: false,
    checkedApplyWriteByHia: false,
    providerNetworkByHia: false,
    sourceBodyCollectionByHia: false
  };
}

function statementForSurface(surface) {
  const statements = {
    "checked-apply-boundary-surface": "Targets may view disabled checked-apply boundaries and copy review instructions, but target owners must perform any real write flow.",
    "host-runtime-observation-surface": "Targets may consume public-safe host observation state, but release-grade capture remains a later optional gate.",
    "provider-review-governance-surface": "Targets may review provider identity and blocked-before-network records, but real provider calls remain later host-mediated actions.",
    "target-owner-evidence-intake-surface": "Targets may submit public-safe owner evidence metadata, but HIA does not execute adoption commands on their behalf."
  };
  return statements[surface.id] ?? "Targets may consume this surface only after manual review.";
}

function createConsumptionGuide(adoptionBoundary, productizationEvidence) {
  const bindings = adoptionBoundary.targetClasses.flatMap((targetClass) => adoptionBoundary.surfaces.map((surface) => ({
    targetClassId: targetClass.id,
    surfaceId: surface.surfaceId,
    consumptionMode: surface.consumptionStatus,
    ownerActionRequired: surface.targetOwnerActionRequired,
    hiaAction: "prepare-public-safe-surface-only",
    forbiddenHiaAction: [
      "target-repository-write",
      "target-command-execution",
      "target-branch-or-pr-creation",
      "checked-apply-trigger",
      "provider-network-call"
    ]
  })));
  return {
    contract: "hia-wp48-limited-surface-consumption-guide",
    contractVersion: "0.1.0-draft",
    guideStatus: "target-owner-pull-consumption-ready",
    surfaceCount: adoptionBoundary.surfaces.length,
    targetClassCount: adoptionBoundary.targetClasses.length,
    bindingCount: bindings.length,
    bindings,
    deniedCapabilityCount: number(productizationEvidence.summary?.decisionDeniedCapabilityCount)
  };
}

function createOwnerEvidenceBoundary(adoptionBoundary) {
  const requiredFields = [
    "targetOwner",
    "targetRepository",
    "adoptionScenario",
    "executedByTargetOwner",
    "commandTranscriptReference",
    "publicSafeArtifacts",
    "redactionAttestation",
    "sourceContentPolicy",
    "decision"
  ];
  const rejectedClaims = [
    "hia-executed-target-command",
    "hia-created-target-branch-or-pr",
    "hia-mutated-target-repository",
    "checked-apply-write-already-authorized",
    "provider-network-success-without-host-gate",
    "source-body-included",
    "secret-or-digest-included",
    "local-absolute-path-included"
  ];
  return {
    contract: "hia-wp48-owner-evidence-boundary-refresh",
    contractVersion: "0.1.0-draft",
    boundaryStatus: "owner-evidence-ready-for-closeout-candidate",
    ownerEvidenceMode: "target-owner-submitted-public-safe-metadata",
    requiredFields,
    rejectedClaims,
    targetClassCount: adoptionBoundary.targetClasses.length,
    hiaMayFabricateOwnerEvidence: false,
    hiaMayStoreReportBody: false,
    hiaMayStoreSourceBody: false,
    hiaMayStoreCommandOutputBody: false,
    targetOwnerAttestationRequired: true,
    redactionAttestationRequired: true
  };
}

function createNextStageInputs(adoptionBoundary, ownerEvidenceBoundary) {
  return {
    contract: "hia-wp48-next-stage-inputs",
    contractVersion: "0.1.0-draft",
    nextStage: "W-P48.5 C-HIA-P2 Closeout Candidate",
    items: [
      {
        id: "c-hia-p2-closeout-candidate",
        status: "ready-for-wp48-5",
        description: "Build a C-HIA-P2 closeout candidate from W-P48.1-W-P48.4 ledgers without claiming final real execution."
      },
      {
        id: "target-project-pull-adoption-boundary",
        status: "ready-for-wp48-5",
        description: `Carry ${adoptionBoundary.targetClasses.length} target class boundaries and ${adoptionBoundary.surfaces.length} limited surfaces forward.`
      },
      {
        id: "owner-evidence-boundary",
        status: "ready-for-wp48-5",
        description: `Use ${ownerEvidenceBoundary.requiredFields.length} required owner-evidence fields and ${ownerEvidenceBoundary.rejectedClaims.length} rejected claim kinds in closeout.`
      }
    ],
    readyForNextStage: true
  };
}

function summarize({
  adoptionBoundary,
  consumptionGuide,
  nextStageInputs,
  ownerEvidenceBoundary,
  productizationEvidence
}) {
  const serialized = JSON.stringify({
    adoptionBoundary,
    consumptionGuide,
    nextStageInputs,
    ownerEvidenceBoundary
  });
  return {
    phase: "W-P48.4",
    inputEvidenceCount: 1,
    readyInputEvidenceCount: isReadyEvidence(productizationEvidence) ? 1 : 0,
    inputHardFailureCount: number(productizationEvidence.summary?.hardFailureCount),
    targetClassCount: adoptionBoundary.targetClasses.length,
    limitedSurfaceCount: adoptionBoundary.surfaces.length,
    adoptionRuleCount: adoptionBoundary.adoptionRuleCount,
    consumptionBindingCount: consumptionGuide.bindingCount,
    ownerEvidenceRequiredFieldCount: ownerEvidenceBoundary.requiredFields.length,
    ownerEvidenceRejectedClaimKindCount: ownerEvidenceBoundary.rejectedClaims.length,
    centralNotificationPullReady: adoptionBoundary.notificationModel.targetProjectReadsNotification === true
      && adoptionBoundary.notificationModel.hiaPushesNotificationIntoTargetRepository === false,
    targetOwnerActionRequiredSurfaceCount: adoptionBoundary.surfaces.filter((item) => item.targetOwnerActionRequired === true).length,
    hiaTargetRepositoryMutationGrantCount: countTrue([
      adoptionBoundary.targetRepositoryMutationByHia,
      ...adoptionBoundary.surfaces.map((item) => item.hiaMayPushToTarget),
      ...adoptionBoundary.surfaces.map((item) => item.hiaMayApplyTargetEdit)
    ]),
    hiaTargetCommandGrantCount: countTrue([
      adoptionBoundary.targetCommandExecutionByHia,
      ...adoptionBoundary.surfaces.map((item) => item.hiaMayRunTargetCommand)
    ]),
    hiaTargetBranchOrPrGrantCount: countTrue([
      adoptionBoundary.targetBranchOrPrCreationByHia,
      ...adoptionBoundary.surfaces.map((item) => item.hiaMayOpenTargetBranchOrPr)
    ]),
    hiaCheckedApplyWriteGrantCount: countTrue([adoptionBoundary.checkedApplyWriteByHia]),
    hiaProviderNetworkGrantCount: countTrue([adoptionBoundary.providerNetworkByHia]),
    hiaSourceBodyCollectionGrantCount: countTrue([
      adoptionBoundary.sourceBodyCollectionByHia,
      ...adoptionBoundary.surfaces.map((item) => item.hiaMayReadTargetSourceBody),
      ownerEvidenceBoundary.hiaMayStoreSourceBody,
      ownerEvidenceBoundary.hiaMayStoreReportBody,
      ownerEvidenceBoundary.hiaMayStoreCommandOutputBody
    ]),
    hiaOwnerEvidenceFabricationGrantCount: countTrue([ownerEvidenceBoundary.hiaMayFabricateOwnerEvidence]),
    checkedApplyWriteEnabledCount: number(productizationEvidence.summary?.checkedApplyWriteEnabledCount),
    hostEditorApiCallCount: number(productizationEvidence.summary?.hostEditorApiCallCount),
    checkedApplyTriggeredCount: number(productizationEvidence.summary?.checkedApplyTriggeredCount),
    workspaceWriteAllowedCount: number(productizationEvidence.summary?.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: number(productizationEvidence.summary?.targetRepositoryMutationCount),
    targetCommandExecutedByHiaCount: number(productizationEvidence.summary?.targetCommandExecutedByHiaCount),
    providerNetworkExecutedCount: number(productizationEvidence.summary?.providerNetworkExecutedCount),
    externalNetworkCallExecutedCount: number(productizationEvidence.summary?.externalNetworkCallExecutedCount),
    sourceBodyIncludedCount: number(productizationEvidence.summary?.sourceBodyIncludedCount),
    sourceTextIncludedCount: number(productizationEvidence.summary?.sourceTextIncludedCount),
    requestBodyIncludedCount: number(productizationEvidence.summary?.requestBodyIncludedCount),
    responseBodyIncludedCount: number(productizationEvidence.summary?.responseBodyIncludedCount),
    secretValueIncludedCount: number(productizationEvidence.summary?.secretValueIncludedCount),
    digestValueIncludedCount: number(productizationEvidence.summary?.digestValueIncludedCount),
    localAbsolutePathDetectedCount: sum([
      productizationEvidence.summary?.localAbsolutePathDetectedCount,
      countPathExposure(serialized)
    ]),
    credentialMaterialMarkerCount: sum([
      productizationEvidence.summary?.credentialMaterialMarkerCount,
      countCredentialMarkers(serialized)
    ]),
    sourcesContentMarkerCount: sum([
      productizationEvidence.summary?.sourcesContentMarkerCount,
      /"sourcesContent"\s*:/iu.test(serialized) ? 1 : 0
    ]),
    sourcesContentPolicy: "none",
    canProceedToCloseoutCandidate: nextStageInputs.readyForNextStage,
    nextStage: nextStageInputs.nextStage
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP48_4_INPUT_READY", summary.inputEvidenceCount === 1
      && summary.readyInputEvidenceCount === 1
      && summary.inputHardFailureCount === 0),
    check("HIA_WP48_4_ADOPTION_BOUNDARY_READY", summary.targetClassCount === 4
      && summary.limitedSurfaceCount === 4
      && summary.adoptionRuleCount === 16
      && summary.consumptionBindingCount === 16
      && summary.targetOwnerActionRequiredSurfaceCount === 4
      && summary.centralNotificationPullReady === true),
    check("HIA_WP48_4_OWNER_EVIDENCE_BOUNDARY_READY", summary.ownerEvidenceRequiredFieldCount >= 9
      && summary.ownerEvidenceRejectedClaimKindCount >= 8
      && summary.hiaOwnerEvidenceFabricationGrantCount === 0),
    check("HIA_WP48_4_NO_TARGET_AUTHORITY_GRANTED", summary.hiaTargetRepositoryMutationGrantCount === 0
      && summary.hiaTargetCommandGrantCount === 0
      && summary.hiaTargetBranchOrPrGrantCount === 0
      && summary.hiaCheckedApplyWriteGrantCount === 0
      && summary.hiaProviderNetworkGrantCount === 0
      && summary.hiaSourceBodyCollectionGrantCount === 0),
    check("HIA_WP48_4_NO_EXECUTION_OR_WRITE", summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0),
    check("HIA_WP48_4_PRIVACY_CLEAN", summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0
      && summary.sourcesContentPolicy === "none"),
    check("HIA_WP48_4_NEXT_STAGE_READY", summary.canProceedToCloseoutCandidate === true
      && summary.nextStage === "W-P48.5 C-HIA-P2 Closeout Candidate")
  ];
}

function renderAdoptionBoundary(evidence) {
  const classRows = evidence.adoptionBoundary.targetClasses
    .map((item) => `| ${item.id} | ${item.targetKind} | ${item.ownerActionModel} | ${item.allowedConsumption} |`)
    .join("\n");
  const surfaceRows = evidence.adoptionBoundary.surfaces
    .map((item) => `| ${item.surfaceId} | ${item.productizationMode} | ${item.consumptionStatus} | ${yesNo(item.targetOwnerActionRequired)} | ${item.adoptionBoundaryStatement} |`)
    .join("\n");
  return `# Target Project Adoption Boundary

## 中文摘要

W-P48.4 将 limited surfaces 转换成目标项目主动消费边界。目标项目可以读取中心通知、消费 public-safe surface 并提交 owner evidence，但 HIA automation 不替目标项目写代码、运行命令、创建 branch/PR/sandbox 或触发 checked apply。

## Target Classes

| Target class | Kind | Owner action model | Allowed consumption |
| --- | --- | --- | --- |
${classRows}

## Limited Surfaces

| Surface | Mode | Consumption status | Target owner action required | Boundary statement |
| --- | --- | --- | --- | --- |
${surfaceRows}
`;
}

function renderConsumptionGuide(evidence) {
  const rows = evidence.consumptionGuide.bindings
    .map((item) => `| ${item.targetClassId} | ${item.surfaceId} | ${item.consumptionMode} | ${yesNo(item.ownerActionRequired)} | ${item.hiaAction} |`)
    .join("\n");
  return `# Limited Surface Consumption Guide

## 中文摘要

本指南说明目标项目如何消费 W-P48.3 产品化出的 limited surfaces。所有消费都是 target-owner pull 模式；HIA 只准备 public-safe surface。

| Target class | Surface | Consumption mode | Owner action required | HIA action |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderOwnerEvidenceBoundary(evidence) {
  const fields = evidence.ownerEvidenceBoundary.requiredFields.map((item) => `- ${item}`).join("\n");
  const rejected = evidence.ownerEvidenceBoundary.rejectedClaims.map((item) => `- ${item}`).join("\n");
  return `# Owner Evidence Boundary Refresh

## 中文摘要

目标项目 owner evidence 必须由目标所有者提交，并且只包含 public-safe metadata 与 artifact references。HIA 不伪造 owner evidence，不保存 report body、source body 或 command output body。

## Required Fields

${fields}

## Rejected Claims

${rejected}
`;
}

function renderNextStageInputs(evidence) {
  const rows = evidence.nextStageInputs.items
    .map((item) => `| ${item.id} | ${item.status} | ${item.description} |`)
    .join("\n");
  return `# W-P48 Next Stage Inputs

## 中文摘要

W-P48.5 应基于 W-P48.1-W-P48.4 的账本形成 C-HIA-P2 closeout candidate，同时继续保持真实执行 gate 后延。

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

function countTrue(values) {
  return values.filter((value) => value === true).length;
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
