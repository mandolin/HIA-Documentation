import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp46-closeout-wp47-wp48-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutSummaryPath = path.join(outputRoot, "wp46-closeout-summary.md");
const wp47InputsPath = path.join(outputRoot, "wp47-checked-apply-pilot-preparation-inputs.md");
const wp48InputsPath = path.join(outputRoot, "wp48-c-hia-p2-closeout-inputs.md");
const deferredOwnerTrialsPath = path.join(outputRoot, "target-owner-adoption-trials-deferred.md");

const inputPaths = {
  wp45Closeout: path.join(rootDir, "dist", "wp45-closeout-wp46-wp47-inputs", "evidence.json"),
  targetOwnerEvidenceIngestionIntake: path.join(rootDir, "dist", "wp46-target-owner-evidence-ingestion-intake", "evidence.json"),
  ownerProvidedEvidencePacketSchema: path.join(rootDir, "dist", "wp46-owner-provided-evidence-packet-schema", "evidence.json"),
  evidenceRedactionPrivacyValidator: path.join(rootDir, "dist", "wp46-evidence-redaction-privacy-validator", "evidence.json"),
  hostReviewProjectionForOwnerEvidence: path.join(rootDir, "dist", "wp46-host-review-projection-owner-evidence", "evidence.json"),
  adoptionTrialScenarioMatrix: path.join(rootDir, "dist", "wp46-adoption-trial-scenario-matrix", "evidence.json"),
  targetOwnerHandoffReportPacket: path.join(rootDir, "dist", "wp46-target-owner-handoff-report-packet", "evidence.json")
};

await main();

/**
 * 生成 W-P46.7 closeout and W-P47/W-P48 inputs evidence。
 * Generate W-P46.7 closeout and W-P47/W-P48 inputs evidence.
 *
 * 中文：本阶段收口 W-P46 target-owner evidence ingestion and adoption trial，
 * 汇总 W-P46.1 到 W-P46.6 的 evidence，并把后续输入拆成 W-P47 checked apply
 * pilot preparation、W-P48/C-HIA-P2 closeout 与后续 target-owner actual
 * adoption trial submissions。它不启用 checked apply 写入，不运行目标命令，
 * 不创建 sandbox/branch/PR，也不修改目标仓库。
 *
 * English: This stage closes the W-P46 target-owner evidence ingestion and
 * adoption trial slice by summarizing W-P46.1 through W-P46.6 evidence and
 * splitting follow-up inputs for W-P47 checked apply pilot preparation,
 * W-P48/C-HIA-P2 closeout and later target-owner adoption trial submissions.
 * It does not enable checked apply writes, run target commands, create
 * sandboxes/branches/pull requests or mutate target repositories.
 *
 * @returns {Promise<void>} Writes public-safe W-P46.7 closeout evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const closeoutMatrix = createCloseoutMatrix(inputs);
  const wp47Inputs = createWp47Inputs(inputs);
  const wp48Inputs = createWp48Inputs(inputs, closeoutMatrix);
  const deferredOwnerTrials = createDeferredOwnerTrials(inputs);
  const summary = summarize({
    closeoutMatrix,
    deferredOwnerTrials,
    inputs,
    wp47Inputs,
    wp48Inputs
  });
  const checks = [
    check("HIA_WP46_CLOSEOUT_INPUTS_READY", summary.inputEvidenceCount === 7
      && summary.readyInputCount === 7
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputCount: summary.readyInputCount
      }
    }),
    check("HIA_WP46_CLOSEOUT_CHAIN_COMPLETE", summary.completedStageCount === 6
      && summary.completedStageReadyCount === 6
      && summary.ingestionBoundaryReady === true
      && summary.packetSchemaReady === true
      && summary.validatorReady === true
      && summary.hostProjectionReady === true
      && summary.adoptionTrialMatrixReady === true
      && summary.handoffReportReady === true, {
      actual: {
        adoptionTrialMatrixReady: summary.adoptionTrialMatrixReady,
        completedStageCount: summary.completedStageCount,
        completedStageReadyCount: summary.completedStageReadyCount,
        handoffReportReady: summary.handoffReportReady,
        hostProjectionReady: summary.hostProjectionReady,
        ingestionBoundaryReady: summary.ingestionBoundaryReady,
        packetSchemaReady: summary.packetSchemaReady,
        validatorReady: summary.validatorReady
      }
    }),
    check("HIA_WP46_CLOSEOUT_TARGET_OWNER_EVIDENCE_SURFACE_READY", summary.scenarioCount === 4
      && summary.targetProjectScenarioCount === 2
      && summary.handoffBindingCount === 4
      && summary.reportSectionCount >= 12
      && summary.hostProjectionReadyCount === 3
      && summary.validatorLedgerEntryCount >= 7, {
      actual: {
        handoffBindingCount: summary.handoffBindingCount,
        hostProjectionReadyCount: summary.hostProjectionReadyCount,
        reportSectionCount: summary.reportSectionCount,
        scenarioCount: summary.scenarioCount,
        targetProjectScenarioCount: summary.targetProjectScenarioCount,
        validatorLedgerEntryCount: summary.validatorLedgerEntryCount
      }
    }),
    check("HIA_WP46_CLOSEOUT_DOWNSTREAM_INPUTS_READY", summary.wp47InputCount >= 9
      && summary.wp48InputCount >= 5
      && summary.deferredOwnerTrialCount === summary.scenarioCount
      && summary.futureOwnerSubmissionScenarioCount === summary.scenarioCount
      && summary.ownerSubmittedReportCount === 0, {
      actual: {
        deferredOwnerTrialCount: summary.deferredOwnerTrialCount,
        futureOwnerSubmissionScenarioCount: summary.futureOwnerSubmissionScenarioCount,
        ownerSubmittedReportCount: summary.ownerSubmittedReportCount,
        wp47InputCount: summary.wp47InputCount,
        wp48InputCount: summary.wp48InputCount
      }
    }),
    check("HIA_WP46_CLOSEOUT_WP47_METADATA_ONLY", summary.wp47MetadataOnlyInputCount === summary.wp47InputCount
      && summary.wp47CheckedApplyWriteEnabledCount === 0
      && summary.wp47TargetMutationAllowedCount === 0
      && summary.wp47SourceBodyRequiredCount === 0
      && summary.checkedApplyWritePilotDeferred === true, {
      actual: {
        checkedApplyWritePilotDeferred: summary.checkedApplyWritePilotDeferred,
        wp47CheckedApplyWriteEnabledCount: summary.wp47CheckedApplyWriteEnabledCount,
        wp47InputCount: summary.wp47InputCount,
        wp47MetadataOnlyInputCount: summary.wp47MetadataOnlyInputCount,
        wp47SourceBodyRequiredCount: summary.wp47SourceBodyRequiredCount,
        wp47TargetMutationAllowedCount: summary.wp47TargetMutationAllowedCount
      }
    }),
    check("HIA_WP46_CLOSEOUT_TARGET_OWNER_ONLY", summary.targetOwnerMaySubmitFutureEvidence === true
      && summary.targetOwnerActualSubmissionClaimedCount === 0
      && summary.hiaMayRunTargetCommand === false
      && summary.hiaMayCreateBranchOrPr === false
      && summary.hiaMayCreateSandbox === false
      && summary.hiaMayMutateTargetRepository === false
      && summary.hiaMayTriggerCheckedApply === false, {
      actual: {
        hiaMayCreateBranchOrPr: summary.hiaMayCreateBranchOrPr,
        hiaMayCreateSandbox: summary.hiaMayCreateSandbox,
        hiaMayMutateTargetRepository: summary.hiaMayMutateTargetRepository,
        hiaMayRunTargetCommand: summary.hiaMayRunTargetCommand,
        hiaMayTriggerCheckedApply: summary.hiaMayTriggerCheckedApply,
        targetOwnerActualSubmissionClaimedCount: summary.targetOwnerActualSubmissionClaimedCount,
        targetOwnerMaySubmitFutureEvidence: summary.targetOwnerMaySubmitFutureEvidence
      }
    }),
    check("HIA_WP46_CLOSEOUT_NO_EXECUTION_OR_WRITE", summary.actualTargetCommandExecutedCount === 0
      && summary.actualSandboxCreatedCount === 0
      && summary.actualBranchCreatedCount === 0
      && summary.actualPullRequestOpenedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        actualBranchCreatedCount: summary.actualBranchCreatedCount,
        actualPullRequestOpenedCount: summary.actualPullRequestOpenedCount,
        actualSandboxCreatedCount: summary.actualSandboxCreatedCount,
        actualTargetCommandExecutedCount: summary.actualTargetCommandExecutedCount,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directEditObjectCount: summary.directEditObjectCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP46_CLOSEOUT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
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
    check("HIA_WP46_CLOSEOUT_NEXT_STAGE_READY", summary.readyForWp47CheckedApplyPreparation === true
      && summary.readyForWp48CycleCloseoutInput === true
      && summary.nextStage === "W-P47 Checked Apply Write Pilot Preparation", {
      actual: {
        nextStage: summary.nextStage,
        readyForWp47CheckedApplyPreparation: summary.readyForWp47CheckedApplyPreparation,
        readyForWp48CycleCloseoutInput: summary.readyForWp48CycleCloseoutInput
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P46.7 closeout has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp46-closeout-wp47-wp48-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp47-checked-apply-pilot-preparation-and-wp48-cycle-closeout",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    closeoutPolicy: {
      policy: "closeout-only-downstream-input-split",
      checkedApplyWriteEnabledByThisStage: false,
      targetOwnerFutureSubmissionsRequired: true,
      hiaAutomationMayRunTargetCommand: false,
      hiaAutomationMayCreateBranchOrPullRequest: false,
      hiaAutomationMayCreateSandbox: false,
      hiaAutomationMayMutateTargetRepository: false,
      hiaAutomationMayTriggerCheckedApply: false,
      packetBodyStoredByThisStage: false,
      sourcesContentPolicy: "none"
    },
    closeoutMatrix,
    wp47CheckedApplyPilotPreparationInputs: wp47Inputs,
    wp48CycleCloseoutInputs: wp48Inputs,
    deferredOwnerAdoptionTrials: deferredOwnerTrials,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutSummaryPath),
      deferredOwnerAdoptionTrials: normalizePath(deferredOwnerTrialsPath),
      wp47CheckedApplyPilotPreparationInputs: normalizePath(wp47InputsPath),
      wp48CycleCloseoutInputs: normalizePath(wp48InputsPath)
    },
    nextContractInputs: [
      ...wp47Inputs.items,
      ...wp48Inputs.items,
      ...deferredOwnerTrials.items
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P46.7 closeout evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummary(evidence), "utf8");
  await writeFile(wp47InputsPath, renderWp47Inputs(evidence), "utf8");
  await writeFile(wp48InputsPath, renderWp48Inputs(evidence), "utf8");
  await writeFile(deferredOwnerTrialsPath, renderDeferredOwnerTrials(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    closeoutSummary: closeoutSummaryPath,
    deferredOwnerTrials: deferredOwnerTrialsPath,
    evidence: evidencePath,
    wp47Inputs: wp47InputsPath,
    wp48Inputs: wp48InputsPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P46 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P46 closeout summary prepared at ${normalizePath(closeoutSummaryPath)}`);
  console.log(`W-P46 W-P47 inputs prepared at ${normalizePath(wp47InputsPath)}`);
  console.log(`W-P46 W-P48 inputs prepared at ${normalizePath(wp48InputsPath)}`);
  console.log(`W-P46 deferred owner adoption trials prepared at ${normalizePath(deferredOwnerTrialsPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)]));
  return Object.fromEntries(entries);
}

function createCloseoutMatrix(inputs) {
  return {
    contract: "hia-wp46-closeout-matrix",
    contractVersion: "0.1.0-draft",
    completedStages: [
      stage("W-P46.1", inputs.targetOwnerEvidenceIngestionIntake.status, "target-owner-evidence-ingestion-intake"),
      stage("W-P46.2", inputs.ownerProvidedEvidencePacketSchema.status, "owner-provided-evidence-packet-schema"),
      stage("W-P46.3", inputs.evidenceRedactionPrivacyValidator.status, "evidence-redaction-privacy-validator"),
      stage("W-P46.4", inputs.hostReviewProjectionForOwnerEvidence.status, "host-review-projection-for-owner-evidence"),
      stage("W-P46.5", inputs.adoptionTrialScenarioMatrix.status, "adoption-trial-scenario-matrix"),
      stage("W-P46.6", inputs.targetOwnerHandoffReportPacket.status, "target-owner-handoff-report-packet")
    ],
    finalState: {
      sourceProviderResultKind: inputs.targetOwnerEvidenceIngestionIntake.summary?.sourceProviderResultKind,
      ownerEvidencePacketSchemaReady: true,
      validatorReady: true,
      hostProjectionReady: true,
      adoptionTrialMatrixReady: true,
      handoffReportReady: true,
      targetOwnerActualReportSubmitted: false,
      checkedApplyWriteEnabled: false,
      readyForWp47Preparation: true,
      readyForWp48CloseoutInput: true
    }
  };
}

function createWp47Inputs(inputs) {
  const handoffInputs = inputs.targetOwnerHandoffReportPacket.wp47CheckedApplyPilotMetadataInputs ?? [];
  return {
    contract: "hia-wp46-wp47-checked-apply-pilot-preparation-inputs",
    contractVersion: "0.1.0-draft",
    inputStatus: "ready-metadata-only-preparation-inputs",
    items: handoffInputs.map((input) => ({
      id: `wp46-closeout:${input.id}`,
      description: input.description,
      sourceRef: input.id,
      inputKind: "target-owner-submitted-metadata-only",
      status: "ready-for-wp47-planning",
      targetOwnerSubmittedOnly: true,
      checkedApplyWriteEnabled: false,
      targetRepositoryMutationAllowed: false,
      sourceBodyRequired: false,
      secretValueRequired: false,
      localAbsolutePathAllowed: false
    })),
    additionalGuards: [
      guard("host-owned-confirmation-required", "W-P47 必须继续由 host 负责 final confirmation。"),
      guard("file-version-conflict-preflight-required", "W-P47 进入真实 write pilot 前必须做 file version/conflict preflight。"),
      guard("rollback-audit-required", "W-P47 需要保留 rollback/formatter/audit gate。")
    ]
  };
}

function createWp48Inputs(inputs, closeoutMatrix) {
  return {
    contract: "hia-wp46-wp48-cycle-closeout-inputs",
    contractVersion: "0.1.0-draft",
    inputStatus: "ready-cycle-closeout-inputs",
    items: [
      wp48Input("target-owner-ingestion-boundary", "记录 W-P46 已建立 owner-provided-evidence-only intake boundary。", inputs.targetOwnerEvidenceIngestionIntake.status),
      wp48Input("owner-evidence-packet-contract", "记录 W-P46 owner evidence packet schema、state model、safe example 与 fixtures。", inputs.ownerProvidedEvidencePacketSchema.status),
      wp48Input("redaction-privacy-validator-result", "记录 validator ledger、rejection report 与 public-safe gate。", inputs.evidenceRedactionPrivacyValidator.status),
      wp48Input("host-review-projection-result", "记录 VS Code、DevTools、Visual Studio 三宿主只读 projection。", inputs.hostReviewProjectionForOwnerEvidence.status),
      wp48Input("adoption-trial-matrix-result", "记录 HIA self、UnicodeArtJs、HIA-ASPNETPortal 与 satellite scenario matrix。", inputs.adoptionTrialScenarioMatrix.status),
      wp48Input("target-owner-handoff-report-result", "记录 handoff/report packet 与 W-P47 metadata-only inputs。", inputs.targetOwnerHandoffReportPacket.status)
    ],
    closeoutRef: {
      completedStageCount: closeoutMatrix.completedStages.length,
      finalState: closeoutMatrix.finalState
    }
  };
}

function createDeferredOwnerTrials(inputs) {
  const scenarios = inputs.adoptionTrialScenarioMatrix.scenarios ?? [];
  return {
    contract: "hia-wp46-deferred-target-owner-adoption-trials",
    contractVersion: "0.1.0-draft",
    trialStatus: "waiting-for-target-owner-submitted-evidence",
    items: scenarios.map((scenario) => ({
      id: `owner-trial:${scenario.id}`,
      scenarioId: scenario.id,
      targetLabel: scenario.targetLabel,
      kind: scenario.kind,
      status: "not-submitted-yet",
      targetOwnerActionRequired: true,
      actualOwnerReportSubmitted: false,
      hiaMayRunTargetCommand: false,
      hiaMayCreateBranchOrPr: false,
      hiaMayCreateSandbox: false,
      hiaMayMutateTargetRepository: false,
      checkedApplyWriteEnabled: false,
      requiredEvidenceKinds: scenario.requiredEvidenceKinds
    }))
  };
}

function stage(phase, status, topic) {
  return {
    phase,
    status,
    topic,
    completed: status && status !== "blocked"
  };
}

function guard(id, description) {
  return {
    id,
    description,
    status: "required-before-write-pilot"
  };
}

function wp48Input(id, description, sourceStatus) {
  return {
    id,
    description,
    sourceStatus,
    inputStatus: "ready-for-wp48-closeout",
    grantsRuntimeAuthority: false,
    grantsProviderNetworkAuthority: false,
    grantsCheckedApplyWriteAuthority: false,
    grantsTargetMutationAuthority: false
  };
}

function summarize({
  closeoutMatrix,
  deferredOwnerTrials,
  inputs,
  wp47Inputs,
  wp48Inputs
}) {
  const publicSurface = JSON.stringify({
    closeoutMatrix,
    deferredOwnerTrials,
    wp47Inputs,
    wp48Inputs
  });
  const wp47Items = wp47Inputs.items;
  const wp48Items = wp48Inputs.items;

  return {
    phase: "W-P46.7",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputCount: Object.values(inputs).filter((item) => item.status && item.status !== "blocked").length,
    inputHardFailureCount: sum(Object.values(inputs).map((item) => item.summary?.hardFailureCount)),
    completedStageCount: closeoutMatrix.completedStages.length,
    completedStageReadyCount: closeoutMatrix.completedStages.filter((item) => item.completed).length,
    ingestionBoundaryReady: inputs.targetOwnerEvidenceIngestionIntake.status === "ready-for-wp46-owner-provided-evidence-packet-schema",
    packetSchemaReady: inputs.ownerProvidedEvidencePacketSchema.status === "ready-for-wp46-redaction-privacy-validator",
    validatorReady: inputs.evidenceRedactionPrivacyValidator.status === "ready-for-wp46-host-review-projection-for-owner-evidence",
    hostProjectionReady: inputs.hostReviewProjectionForOwnerEvidence.status === "ready-for-wp46-adoption-trial-scenario-matrix",
    adoptionTrialMatrixReady: inputs.adoptionTrialScenarioMatrix.status === "ready-for-wp46-target-owner-handoff-and-report-packet",
    handoffReportReady: inputs.targetOwnerHandoffReportPacket.status === "ready-for-wp46-closeout-and-wp47-wp48-inputs",
    scenarioCount: number(inputs.adoptionTrialScenarioMatrix.summary?.scenarioCount),
    targetProjectScenarioCount: number(inputs.adoptionTrialScenarioMatrix.summary?.targetProjectScenarioCount),
    handoffBindingCount: number(inputs.targetOwnerHandoffReportPacket.summary?.scenarioHandoffBindingCount),
    reportSectionCount: number(inputs.targetOwnerHandoffReportPacket.summary?.reportSectionCount),
    hostProjectionReadyCount: number(inputs.hostReviewProjectionForOwnerEvidence.summary?.readyHostProjectionCount),
    validatorLedgerEntryCount: number(inputs.evidenceRedactionPrivacyValidator.summary?.ledgerEntryCount),
    validatorRejectionEntryCount: number(inputs.evidenceRedactionPrivacyValidator.summary?.rejectionEntryCount),
    readinessChecklistCount: number(inputs.adoptionTrialScenarioMatrix.summary?.readinessChecklistCount),
    evidenceKindCatalogCount: number(inputs.adoptionTrialScenarioMatrix.summary?.requiredEvidenceKindCatalogCount),
    adoptionGateCount: number(inputs.adoptionTrialScenarioMatrix.summary?.adoptionGateCount),
    wp47InputCount: wp47Items.length,
    wp47MetadataOnlyInputCount: wp47Items.filter((item) => item.inputKind === "target-owner-submitted-metadata-only").length,
    wp47CheckedApplyWriteEnabledCount: wp47Items.filter((item) => item.checkedApplyWriteEnabled === true).length,
    wp47TargetMutationAllowedCount: wp47Items.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    wp47SourceBodyRequiredCount: wp47Items.filter((item) => item.sourceBodyRequired === true).length,
    wp47GuardCount: wp47Inputs.additionalGuards.length,
    wp48InputCount: wp48Items.length,
    deferredOwnerTrialCount: deferredOwnerTrials.items.length,
    ownerSubmittedReportCount: deferredOwnerTrials.items.filter((item) => item.actualOwnerReportSubmitted === true).length,
    futureOwnerSubmissionScenarioCount: deferredOwnerTrials.items.filter((item) => item.targetOwnerActionRequired === true).length,
    targetOwnerMaySubmitFutureEvidence: true,
    targetOwnerActualSubmissionClaimedCount: deferredOwnerTrials.items.filter((item) => item.actualOwnerReportSubmitted === true).length,
    checkedApplyWritePilotDeferred: true,
    hiaMayRunTargetCommand: false,
    hiaMayCreateBranchOrPr: false,
    hiaMayCreateSandbox: false,
    hiaMayMutateTargetRepository: false,
    hiaMayTriggerCheckedApply: false,
    actualTargetCommandExecutedCount: 0,
    actualSandboxCreatedCount: 0,
    actualBranchCreatedCount: 0,
    actualPullRequestOpenedCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    providerNetworkExecutedCount: 0,
    directEditObjectCount: countDirectEditObjects(publicSurface),
    packetBodyStoredCount: 0,
    sourceTextIncludedCount: 0,
    secretValueIncludedCount: 0,
    requestBodyIncludedCount: 0,
    responseBodyIncludedCount: 0,
    localAbsolutePathDetectedCount: countPathExposure(publicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(publicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(publicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    readyForWp47CheckedApplyPreparation: true,
    readyForWp48CycleCloseoutInput: true,
    nextStage: "W-P47 Checked Apply Write Pilot Preparation",
    hardFailureCount: 0
  };
}

function renderCloseoutSummary(evidence) {
  const rows = evidence.closeoutMatrix.completedStages
    .map((stageItem) => `| \`${stageItem.phase}\` | ${stageItem.topic} | \`${stageItem.status}\` | ${stageItem.completed ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P46.7 Closeout Summary

## 中文摘要

W-P46 target-owner evidence ingestion and adoption trial 已完成第一轮。当前已具备 owner-provided intake、packet schema、redaction/privacy validator、三宿主只读 projection、adoption trial matrix 与 handoff/report packet。W-P47 输入只限 target-owner-submitted metadata；W-P46.7 不启用 checked apply write。

## Summary

- status：\`${evidence.status}\`
- completed stages：${evidence.summary.completedStageReadyCount} / ${evidence.summary.completedStageCount}
- scenarios：${evidence.summary.scenarioCount}
- target project scenarios：${evidence.summary.targetProjectScenarioCount}
- W-P47 metadata-only inputs：${evidence.summary.wp47InputCount}
- W-P48 closeout inputs：${evidence.summary.wp48InputCount}
- next stage：\`${evidence.summary.nextStage}\`

| Phase | Topic | Status | Completed |
| --- | --- | --- | --- |
${rows}
`;
}

function renderWp47Inputs(evidence) {
  const rows = evidence.wp47CheckedApplyPilotPreparationInputs.items
    .map((input) => `| \`${input.id}\` | \`${input.status}\` | ${input.description} | ${input.checkedApplyWriteEnabled ? "yes" : "no"} | ${input.targetRepositoryMutationAllowed ? "yes" : "no"} |`)
    .join("\n");
  const guards = evidence.wp47CheckedApplyPilotPreparationInputs.additionalGuards
    .map((guardItem) => `- \`${guardItem.id}\`: ${guardItem.description}`)
    .join("\n");

  return `# W-P46.7 W-P47 Checked Apply Pilot Preparation Inputs

## 中文摘要

这些输入只用于 W-P47 checked apply write pilot preparation。它们来自 target-owner handoff/report packet 的 metadata-only 输入，不启用写入、不要求源码正文、不允许 target mutation。

| Input | Status | Description | Checked Apply Write | Target Mutation |
| --- | --- | --- | --- | --- |
${rows}

## Required Guards

${guards}
`;
}

function renderWp48Inputs(evidence) {
  const rows = evidence.wp48CycleCloseoutInputs.items
    .map((input) => `| \`${input.id}\` | \`${input.inputStatus}\` | \`${input.sourceStatus}\` | ${input.description} |`)
    .join("\n");

  return `# W-P46.7 W-P48 / C-HIA-P2 Closeout Inputs

## 中文摘要

这些输入供 W-P48 / C-HIA-P2 收口时引用。它们描述 W-P46 已完成的 target-owner evidence 能力，不授予 runtime、provider network、checked apply write 或 target mutation 权限。

| Input | Status | Source Status | Description |
| --- | --- | --- | --- |
${rows}
`;
}

function renderDeferredOwnerTrials(evidence) {
  const rows = evidence.deferredOwnerAdoptionTrials.items
    .map((item) => `| \`${item.scenarioId}\` | ${item.kind} | ${item.targetLabel} | \`${item.status}\` | ${item.requiredEvidenceKinds.join(", ")} |`)
    .join("\n");

  return `# W-P46.7 Deferred Target-Owner Adoption Trials

## 中文摘要

W-P46 已准备 adoption trial 结构，但尚未宣称任何目标项目 actual owner report 已提交。后续真实采用试跑仍必须由 target owner 主动提交 public-safe evidence/report metadata。

| Scenario | Kind | Target | Status | Required Evidence |
| --- | --- | --- | --- | --- |
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

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function countDirectEditObjects(serialized) {
  return /"workspaceEdit"|"documentChanges"|"TextEdit\["/iu.test(serialized) ? 1 : 0;
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
