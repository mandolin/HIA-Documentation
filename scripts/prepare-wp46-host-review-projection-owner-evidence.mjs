import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp46-host-review-projection-owner-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const projectionSummaryPath = path.join(outputRoot, "owner-evidence-host-review-projection.md");
const projectionPacketsPath = path.join(outputRoot, "owner-evidence-host-projection-packets.md");
const manualChecklistPath = path.join(outputRoot, "owner-evidence-host-review-manual-checklist.md");
const validatorEvidencePath = path.join(rootDir, "dist", "wp46-evidence-redaction-privacy-validator", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");
const vscodePackagePath = path.join(rootDir, "apps", "vscode-extension", "package.json");

await main();

/**
 * 生成 W-P46.4 owner evidence host review projection evidence。
 * Generate W-P46.4 owner evidence host review projection evidence.
 *
 * 中文：本阶段把 W-P46.3 validator outcome 投影成 VS Code、Chrome DevTools
 * 与 Visual Studio 可消费的只读 review surface packet。它只展示 packet status、
 * validation decision、rejection reason、owner action 与 artifact metadata，不触发
 * checked apply、不执行目标命令、不读取目标源码正文、不修改目标仓库。
 *
 * English: This stage projects the W-P46.3 validator outcome into read-only
 * host review surface packets for VS Code, Chrome DevTools and Visual Studio.
 * It displays packet status, validation decisions, rejection reasons, owner
 * actions and artifact metadata only; it does not trigger checked apply, run
 * target commands, read target source bodies or mutate target repositories.
 *
 * @returns {Promise<void>} Writes public-safe W-P46.4 projection evidence.
 */
async function main() {
  const inputs = await readInputs();
  const projectionSections = createProjectionSections();
  const hostProjections = createHostProjections({ inputs, projectionSections });
  const manualChecks = createManualChecks();
  const summary = summarize({
    hostProjections,
    inputs,
    manualChecks,
    projectionSections
  });
  const checks = [
    check("HIA_WP46_HOST_PROJECTION_INPUTS_READY", summary.validatorReady === true
      && summary.validationExpectationPassed === true
      && summary.devtoolsTargetOwnerViewReady === true
      && summary.visualStudioTargetOwnerViewReady === true
      && summary.vscodeReviewCommandReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        devtoolsTargetOwnerViewReady: summary.devtoolsTargetOwnerViewReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        validationExpectationPassed: summary.validationExpectationPassed,
        validatorReady: summary.validatorReady,
        visualStudioTargetOwnerViewReady: summary.visualStudioTargetOwnerViewReady,
        vscodeReviewCommandReady: summary.vscodeReviewCommandReady
      }
    }),
    check("HIA_WP46_HOST_PROJECTION_PACKETS_READY", summary.hostProjectionCount === 3
      && summary.readyHostProjectionCount === 3
      && summary.projectionSectionCount >= 8
      && summary.totalProjectedSectionCount === summary.hostProjectionCount * summary.projectionSectionCount, {
      actual: {
        hostProjectionCount: summary.hostProjectionCount,
        projectionSectionCount: summary.projectionSectionCount,
        readyHostProjectionCount: summary.readyHostProjectionCount,
        totalProjectedSectionCount: summary.totalProjectedSectionCount
      }
    }),
    check("HIA_WP46_HOST_PROJECTION_VALIDATOR_OUTCOME_VISIBLE", summary.visibleAcceptedPacketHostCount === 3
      && summary.visibleRejectedPacketHostCount === 3
      && summary.errorCodeVisibleHostCount === 3
      && summary.ownerActionVisibleHostCount === 3
      && summary.redactionSummaryVisibleHostCount === 3
      && summary.artifactMetadataVisibleHostCount === 3, {
      actual: {
        artifactMetadataVisibleHostCount: summary.artifactMetadataVisibleHostCount,
        errorCodeVisibleHostCount: summary.errorCodeVisibleHostCount,
        ownerActionVisibleHostCount: summary.ownerActionVisibleHostCount,
        redactionSummaryVisibleHostCount: summary.redactionSummaryVisibleHostCount,
        visibleAcceptedPacketHostCount: summary.visibleAcceptedPacketHostCount,
        visibleRejectedPacketHostCount: summary.visibleRejectedPacketHostCount
      }
    }),
    check("HIA_WP46_HOST_PROJECTION_NO_EXECUTION_OR_WRITE", summary.actualRuntimeCaptureExecutedCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.hiaMayCreateBranchOrPrCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directEditObjectCount: summary.directEditObjectCount,
        hiaMayCreateBranchOrPrCount: summary.hiaMayCreateBranchOrPrCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP46_HOST_PROJECTION_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.packetBodyStoredCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        packetBodyStoredCount: summary.packetBodyStoredCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP46_HOST_PROJECTION_NEXT_STAGE_READY", summary.nextStage === "W-P46.5 Adoption Trial Scenario Matrix"
      && summary.manualCheckCount >= 6
      && summary.readyForAdoptionTrialMatrix === true, {
      actual: {
        manualCheckCount: summary.manualCheckCount,
        nextStage: summary.nextStage,
        readyForAdoptionTrialMatrix: summary.readyForAdoptionTrialMatrix
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P46.4 host review projection has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp46-host-review-projection-owner-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp46-adoption-trial-scenario-matrix",
    sourceEvidence: {
      evidenceRedactionPrivacyValidator: normalizePath(validatorEvidencePath),
      devtoolsExtensionCheck: normalizePath(devtoolsCheckPath),
      visualStudioExtensionCheck: normalizePath(visualStudioCheckPath),
      vscodePackageManifest: normalizePath(vscodePackagePath)
    },
    projectionContract: {
      contract: "hia-owner-evidence-host-review-projection",
      contractVersion: "0.1.0-draft",
      hostProjectionPolicy: "read-only-validator-outcome-no-target-action",
      packetBodyStoredByProjection: false,
      writeAuthorityGrantedByThisContract: false,
      checkedApplyAllowedByThisContract: false,
      targetCommandAllowedByThisContract: false,
      targetRepositoryMutationAllowedByThisContract: false,
      providerNetworkAllowedByThisContract: false,
      sourcesContentPolicy: "none"
    },
    projectionSections,
    hostProjections,
    manualChecks,
    summary,
    checks,
    generatedDocs: {
      hostReviewProjectionSummary: normalizePath(projectionSummaryPath),
      hostProjectionPackets: normalizePath(projectionPacketsPath),
      hostReviewManualChecklist: normalizePath(manualChecklistPath)
    },
    nextContractInputs: [
      {
        phase: "W-P46.5",
        topic: "adoption-trial-scenario-matrix",
        status: "ready-input",
        reason: "Owner evidence validator outcomes now have read-only host projections for all three host families."
      },
      {
        phase: "W-P46.6",
        topic: "target-owner-handoff-and-report-packet",
        status: "projection-prepared",
        reason: "The handoff packet can later consume host projection status, owner actions and rejection reports."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P46.4 host review projection evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(projectionSummaryPath, renderProjectionSummary(evidence), "utf8");
  await writeFile(projectionPacketsPath, renderProjectionPackets(hostProjections), "utf8");
  await writeFile(manualChecklistPath, renderManualChecklist(manualChecks), "utf8");

  for (const [label, filePath] of Object.entries({
    evidence: evidencePath,
    manualChecklist: manualChecklistPath,
    projectionPackets: projectionPacketsPath,
    projectionSummary: projectionSummaryPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P46 host review projection evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P46 host review projection summary prepared at ${normalizePath(projectionSummaryPath)}`);
  console.log(`W-P46 host projection packets prepared at ${normalizePath(projectionPacketsPath)}`);
  console.log(`W-P46 host review manual checklist prepared at ${normalizePath(manualChecklistPath)}`);
}

async function readInputs() {
  const [validatorEvidence, devtoolsCheck, visualStudioCheck, vscodePackage] = await Promise.all([
    readJson(validatorEvidencePath),
    readJson(devtoolsCheckPath),
    readJson(visualStudioCheckPath),
    readJson(vscodePackagePath)
  ]);

  return {
    devtoolsCheck,
    validatorEvidence,
    visualStudioCheck,
    vscodePackage
  };
}

function createProjectionSections() {
  return [
    section("packet-status", "validated/rejected packet status and fixture id"),
    section("validation-decision", "accept-for-host-review-projection or reject-before-ingestion"),
    section("redaction-summary", "redaction policy and public-safe status summary"),
    section("error-code-list", "public-safe validation error code list"),
    section("owner-action", "target-owner resubmission or no-action guidance"),
    section("artifact-metadata", "artifact kind/count/reference metadata without artifact body"),
    section("source-result-reference", "source provider/result reference as review-only context"),
    section("deferred-gates", "target command, branch/PR, checked apply and mutation gates remain closed")
  ];
}

function section(id, description) {
  return {
    id,
    description,
    status: "required-read-only-projection"
  };
}

function createHostProjections({ inputs, projectionSections }) {
  const validatorSummary = inputs.validatorEvidence.summary;
  const validationLedger = inputs.validatorEvidence.validationLedger;
  const rejectionReport = inputs.validatorEvidence.rejectionReport;
  const hostBase = {
    acceptedPacketCount: number(validatorSummary.privacyAcceptedCount),
    errorCodeKindCount: countDistinctErrorCodes(validationLedger.entries),
    ledgerEntryCount: number(validatorSummary.ledgerEntryCount),
    rejectedPacketCount: number(validatorSummary.privacyRejectedCount),
    rejectionEntryCount: number(validatorSummary.rejectionEntryCount),
    rejectionReasonKindCount: number(validatorSummary.rejectionReasonKindCount),
    validatorStatus: inputs.validatorEvidence.status
  };

  return [
    createHostProjection({
      hostId: "vscode",
      label: "VS Code Extension",
      surface: "extension-review-command-palette-output",
      status: vscodeReviewCommandReady(inputs.vscodePackage) ? "projection-ready" : "blocked",
      surfaceContract: "hia-vscode-owner-evidence-host-review-projection",
      hostEvidence: {
        commandRefs: commandRefs(inputs.vscodePackage),
        reviewCommandReady: vscodeReviewCommandReady(inputs.vscodePackage)
      },
      hostBase,
      projectionSections
    }),
    createHostProjection({
      hostId: "devtools",
      label: "Chrome DevTools Extension",
      surface: "browser-devtools-panel",
      status: inputs.devtoolsCheck.panel?.reviewSurface?.targetOwnerEvidenceView?.status === "input-ready"
        ? "projection-ready"
        : "blocked",
      surfaceContract: "hia-devtools-owner-evidence-host-review-projection",
      hostEvidence: {
        targetOwnerEvidenceViewStatus: inputs.devtoolsCheck.panel?.reviewSurface?.targetOwnerEvidenceView?.status,
        permissions: inputs.devtoolsCheck.extension?.permissions?.length ?? 0,
        hostPermissions: inputs.devtoolsCheck.extension?.hostPermissions?.length ?? 0
      },
      hostBase,
      projectionSections
    }),
    createHostProjection({
      hostId: "visual-studio",
      label: "Visual Studio Extension",
      surface: "visual-studio-review-tool-window",
      status: inputs.visualStudioCheck.reviewSurface?.targetOwnerEvidenceView?.status === "input-ready"
        ? "projection-ready"
        : "blocked",
      surfaceContract: "hia-visual-studio-owner-evidence-host-review-projection",
      hostEvidence: {
        runtimePreparationStatus: inputs.visualStudioCheck.runtimePreparation?.preparationStatus,
        targetOwnerEvidenceViewStatus: inputs.visualStudioCheck.reviewSurface?.targetOwnerEvidenceView?.status
      },
      hostBase,
      projectionSections
    })
  ];
}

function createHostProjection({
  hostBase,
  hostEvidence,
  hostId,
  label,
  projectionSections,
  status,
  surface,
  surfaceContract
}) {
  return {
    acceptedPacketCountVisible: hostBase.acceptedPacketCount,
    actualRuntimeCaptureExecuted: false,
    artifactMetadataVisible: true,
    checkedApplyTriggered: false,
    checkedApplyWriteEnabled: false,
    contract: surfaceContract,
    contractVersion: "0.1.0-draft",
    deferredGatesVisible: true,
    directEditObjectCount: 0,
    errorCodeKindCountVisible: hostBase.errorCodeKindCount,
    errorCodesVisible: true,
    hostEditorApiCalled: false,
    hostEvidence,
    hostId,
    label,
    ledgerEntryCountVisible: hostBase.ledgerEntryCount,
    ownerActionVisible: true,
    packetBodyStored: false,
    providerNetworkExecuted: false,
    projectionSectionRefs: projectionSections.map((item) => item.id),
    readOnly: true,
    redactionSummaryVisible: true,
    rejectedPacketCountVisible: hostBase.rejectedPacketCount,
    rejectionEntryCountVisible: hostBase.rejectionEntryCount,
    rejectionReasonKindCountVisible: hostBase.rejectionReasonKindCount,
    sourceResultRefVisible: true,
    sourceTextIncluded: false,
    sourcesContentPolicy: "none",
    status,
    surface,
    targetCommandExecutedByHia: false,
    targetOwnerActionRequired: true,
    targetOwnerMayResubmitMetadataOnly: true,
    targetRepositoryMutationAllowed: false,
    validatorStatus: hostBase.validatorStatus,
    workspaceWriteAllowed: false
  };
}

function createManualChecks() {
  return [
    "确认 host projection 只显示 validator outcome，不显示 owner packet 正文。",
    "确认 rejected packet 只显示 public-safe error code、reason 与 owner action。",
    "确认 artifact 仅显示 metadata/reference，不显示 artifact body。",
    "确认 VS Code、DevTools、Visual Studio 均不触发 checked apply。",
    "确认 HIA automation 不运行目标命令、不创建 branch/PR/sandbox、不修改目标仓库。",
    "确认 provider/network、host editor API、workspace write 均未启用。",
    "确认 sourcesContent policy 保持 none。",
    "确认 W-P46.5 adoption trial 只消费 projection/validator metadata。"
  ];
}

function summarize({ hostProjections, inputs, manualChecks, projectionSections }) {
  const validatorSummary = inputs.validatorEvidence.summary;
  const allSerialized = JSON.stringify({
    hostProjections,
    manualChecks,
    projectionSections
  });

  return {
    phase: "W-P46.4",
    validatorReady: inputs.validatorEvidence.status === "ready-for-wp46-host-review-projection-for-owner-evidence",
    validationExpectationPassed: validatorSummary.passedValidationExpectationCount === validatorSummary.validationResultCount,
    inputHardFailureCount: number(validatorSummary.hardFailureCount),
    validatorAcceptedPacketCount: number(validatorSummary.privacyAcceptedCount),
    validatorRejectedPacketCount: number(validatorSummary.privacyRejectedCount),
    validatorLedgerEntryCount: number(validatorSummary.ledgerEntryCount),
    validatorRejectionEntryCount: number(validatorSummary.rejectionEntryCount),
    devtoolsTargetOwnerViewReady: inputs.devtoolsCheck.panel?.reviewSurface?.targetOwnerEvidenceView?.status === "input-ready",
    visualStudioTargetOwnerViewReady: inputs.visualStudioCheck.reviewSurface?.targetOwnerEvidenceView?.status === "input-ready",
    vscodeReviewCommandReady: vscodeReviewCommandReady(inputs.vscodePackage),
    hostProjectionCount: hostProjections.length,
    readyHostProjectionCount: hostProjections.filter((item) => item.status === "projection-ready").length,
    projectionSectionCount: projectionSections.length,
    totalProjectedSectionCount: hostProjections.reduce((sum, item) => sum + item.projectionSectionRefs.length, 0),
    visibleAcceptedPacketHostCount: hostProjections.filter((item) => item.acceptedPacketCountVisible > 0).length,
    visibleRejectedPacketHostCount: hostProjections.filter((item) => item.rejectedPacketCountVisible > 0).length,
    errorCodeVisibleHostCount: hostProjections.filter((item) => item.errorCodesVisible === true).length,
    ownerActionVisibleHostCount: hostProjections.filter((item) => item.ownerActionVisible === true).length,
    redactionSummaryVisibleHostCount: hostProjections.filter((item) => item.redactionSummaryVisible === true).length,
    artifactMetadataVisibleHostCount: hostProjections.filter((item) => item.artifactMetadataVisible === true).length,
    sourceResultRefVisibleHostCount: hostProjections.filter((item) => item.sourceResultRefVisible === true).length,
    deferredGatesVisibleHostCount: hostProjections.filter((item) => item.deferredGatesVisible === true).length,
    targetOwnerActionRequiredHostCount: hostProjections.filter((item) => item.targetOwnerActionRequired === true).length,
    targetOwnerMayResubmitMetadataOnlyHostCount: hostProjections.filter((item) => item.targetOwnerMayResubmitMetadataOnly === true).length,
    actualRuntimeCaptureExecutedCount: hostProjections.filter((item) => item.actualRuntimeCaptureExecuted === true).length,
    hostEditorApiCallCount: hostProjections.filter((item) => item.hostEditorApiCalled === true).length,
    checkedApplyTriggeredCount: hostProjections.filter((item) => item.checkedApplyTriggered === true).length,
    workspaceWriteAllowedCount: hostProjections.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: hostProjections.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    directEditObjectCount: hostProjections.reduce((sum, item) => sum + number(item.directEditObjectCount), 0),
    providerNetworkExecutedCount: hostProjections.filter((item) => item.providerNetworkExecuted === true).length,
    targetCommandExecutedByHiaCount: hostProjections.filter((item) => item.targetCommandExecutedByHia === true).length,
    hiaMayCreateBranchOrPrCount: 0,
    packetBodyStoredCount: hostProjections.filter((item) => item.packetBodyStored === true).length,
    sourceTextIncludedCount: hostProjections.filter((item) => item.sourceTextIncluded === true).length,
    secretValueIncludedCount: number(validatorSummary.secretValueIncludedCount),
    requestBodyIncludedCount: number(validatorSummary.requestBodyIncludedCount),
    responseBodyIncludedCount: number(validatorSummary.responseBodyIncludedCount),
    localAbsolutePathDetectedCount: countPathExposure(allSerialized),
    credentialMaterialMarkerCount: countCredentialMarkers(allSerialized),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(allSerialized) ? 1 : 0,
    sourcesContentPolicy: hostProjections.every((item) => item.sourcesContentPolicy === "none") ? "none" : "mixed",
    manualCheckCount: manualChecks.length,
    readyForAdoptionTrialMatrix: true,
    nextStage: "W-P46.5 Adoption Trial Scenario Matrix",
    hardFailureCount: 0
  };
}

function renderProjectionSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P46.4 Owner Evidence Host Review Projection

## 中文摘要

W-P46.4 将 W-P46.3 validator outcome 投影到 VS Code、Chrome DevTools 与 Visual Studio 的只读 review surface。该 projection 只显示状态、decision、error code、owner action、redaction summary 与 artifact metadata，不显示 owner packet 正文。

## Summary

- status：\`${evidence.status}\`
- host projections：${summary.readyHostProjectionCount} / ${summary.hostProjectionCount}
- projection sections：${summary.projectionSectionCount}
- validator accepted / rejected：${summary.validatorAcceptedPacketCount} / ${summary.validatorRejectedPacketCount}
- ledger / rejection entries：${summary.validatorLedgerEntryCount} / ${summary.validatorRejectionEntryCount}
- visible accepted/rejected hosts：${summary.visibleAcceptedPacketHostCount} / ${summary.visibleRejectedPacketHostCount}
- checked apply / workspace write / target mutation：${summary.checkedApplyTriggeredCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount}
- packet body stored：${summary.packetBodyStoredCount}
- sourcesContent policy：${summary.sourcesContentPolicy}
- next stage：\`${summary.nextStage}\`
`;
}

function renderProjectionPackets(hostProjections) {
  const rows = hostProjections
    .map((item) => `| \`${item.hostId}\` | \`${item.status}\` | ${item.acceptedPacketCountVisible} | ${item.rejectedPacketCountVisible} | ${item.errorCodeKindCountVisible} | ${item.ownerActionVisible ? "yes" : "no"} | ${item.checkedApplyTriggered ? "yes" : "no"} |`)
    .join("\n");
  return `# W-P46.4 Owner Evidence Host Projection Packets

## 中文摘要

每个宿主 packet 都是只读 review projection。它们不携带 packet body，也不授予写入或目标项目操作权限。

| Host | Status | Accepted | Rejected | Error Kinds | Owner Action | Checked Apply |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderManualChecklist(manualChecks) {
  const rows = manualChecks.map((item, index) => `- [ ] ${index + 1}. ${item}`).join("\n");
  return `# W-P46.4 Host Review Manual Checklist

## 中文摘要

该清单用于后续人工或宿主 runtime capture 时确认 W-P46.4 projection 没有被误解为目标项目执行、checked apply 或 provider/network 执行授权。

${rows}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function vscodeReviewCommandReady(vscodePackage) {
  const commands = commandRefs(vscodePackage);
  return commands.includes("hia.reviewDocumentationProposals") && commands.includes("hia.showHostApplyUxIntake");
}

function commandRefs(vscodePackage) {
  return (vscodePackage.contributes?.commands ?? []).map((item) => item.command);
}

function countDistinctErrorCodes(entries) {
  return new Set((entries ?? []).flatMap((item) => item.errorCodes ?? [])).size;
}

function number(value) {
  return Number(value ?? 0);
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function countPathExposure(serialized) {
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countCredentialMarkers(serialized) {
  return /sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}/u.test(serialized) ? 1 : 0;
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
