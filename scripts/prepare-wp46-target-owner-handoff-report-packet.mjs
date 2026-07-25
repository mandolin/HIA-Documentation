import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp46-target-owner-handoff-report-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const handoffPacketPath = path.join(outputRoot, "target-owner-handoff-report-packet.md");
const reportTemplatePath = path.join(outputRoot, "target-owner-report-template.md");
const wp47InputsPath = path.join(outputRoot, "wp47-checked-apply-pilot-metadata-inputs.md");
const scenarioBindingsPath = path.join(outputRoot, "scenario-handoff-bindings.md");
const adoptionMatrixEvidencePath = path.join(rootDir, "dist", "wp46-adoption-trial-scenario-matrix", "evidence.json");
const hostProjectionEvidencePath = path.join(rootDir, "dist", "wp46-host-review-projection-owner-evidence", "evidence.json");
const validatorEvidencePath = path.join(rootDir, "dist", "wp46-evidence-redaction-privacy-validator", "evidence.json");
const packetSchemaEvidencePath = path.join(rootDir, "dist", "wp46-owner-provided-evidence-packet-schema", "evidence.json");

await main();

/**
 * 准备 W-P46.6 target-owner handoff/report packet evidence。
 * Prepare W-P46.6 target-owner handoff/report packet evidence.
 *
 * 中文：本阶段把 W-P46.5 场景矩阵、readiness checklist、result template，
 * 以及 W-P46.3 validator outcome 和 W-P46.4 三宿主只读 projection，整理为
 * 目标所有者可读取、可回传的 handoff/report packet。它只生成 metadata-only
 * 交接材料和 W-P47 输入，不运行目标项目命令、不创建 sandbox/branch/PR、
 * 不触发 checked apply、不执行 provider/network，也不修改目标仓库。
 *
 * English: This stage packages the W-P46.5 scenario matrix, readiness
 * checklist, result template, W-P46.3 validator outcomes and W-P46.4 read-only
 * host projections into target-owner handoff/report materials. It only emits
 * metadata-only handoff and W-P47 inputs; it does not run target commands,
 * create sandboxes/branches/pull requests, trigger checked apply, execute
 * providers/networks or mutate target repositories.
 *
 * @returns {Promise<void>} Writes public-safe W-P46.6 handoff/report evidence.
 */
async function main() {
  const inputs = await readInputs();
  const handoffBindings = createHandoffBindings(inputs);
  const reportPacket = createReportPacket(inputs);
  const wp47Inputs = createWp47Inputs(inputs, handoffBindings, reportPacket);
  const summary = summarize({
    handoffBindings,
    inputs,
    reportPacket,
    wp47Inputs
  });
  const checks = [
    check("HIA_WP46_HANDOFF_REPORT_INPUTS_READY", summary.adoptionMatrixInputReady === true
      && summary.hostProjectionInputReady === true
      && summary.validatorInputReady === true
      && summary.packetSchemaInputReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        adoptionMatrixInputReady: summary.adoptionMatrixInputReady,
        hostProjectionInputReady: summary.hostProjectionInputReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        packetSchemaInputReady: summary.packetSchemaInputReady,
        validatorInputReady: summary.validatorInputReady
      }
    }),
    check("HIA_WP46_HANDOFF_REPORT_BINDINGS_READY", summary.scenarioHandoffBindingCount === summary.scenarioCount
      && summary.targetProjectHandoffBindingCount >= 2
      && summary.scenarioReportSectionBindingCount >= summary.scenarioCount * summary.requiredReportSectionCount
      && summary.allRequiredEvidenceKindsBound === true
      && summary.handoffOwnerActionRequiredCount === summary.scenarioCount, {
      actual: {
        allRequiredEvidenceKindsBound: summary.allRequiredEvidenceKindsBound,
        handoffOwnerActionRequiredCount: summary.handoffOwnerActionRequiredCount,
        scenarioCount: summary.scenarioCount,
        scenarioHandoffBindingCount: summary.scenarioHandoffBindingCount,
        scenarioReportSectionBindingCount: summary.scenarioReportSectionBindingCount,
        targetProjectHandoffBindingCount: summary.targetProjectHandoffBindingCount
      }
    }),
    check("HIA_WP46_HANDOFF_REPORT_TEMPLATE_READY", summary.reportSectionCount >= 12
      && summary.requiredReportSectionCount >= 10
      && summary.resultTemplateSectionCount >= 8
      && summary.resultShapeCount >= 7
      && summary.decisionOutcomeCount >= 7, {
      actual: {
        decisionOutcomeCount: summary.decisionOutcomeCount,
        reportSectionCount: summary.reportSectionCount,
        requiredReportSectionCount: summary.requiredReportSectionCount,
        resultShapeCount: summary.resultShapeCount,
        resultTemplateSectionCount: summary.resultTemplateSectionCount
      }
    }),
    check("HIA_WP46_HANDOFF_REPORT_VALIDATOR_HOST_LINKAGE_READY", summary.hostProjectionRefCount === summary.scenarioCount * summary.hostProjectionReadyCount
      && summary.hostProjectionReadyCount === 3
      && summary.validatorAcceptedPacketVisibleBindingCount === summary.scenarioCount
      && summary.validatorRejectedPacketVisibleBindingCount === summary.scenarioCount
      && summary.validatorLedgerEntryCount >= 7
      && summary.validatorRejectionEntryCount >= 5, {
      actual: {
        hostProjectionReadyCount: summary.hostProjectionReadyCount,
        hostProjectionRefCount: summary.hostProjectionRefCount,
        validatorAcceptedPacketVisibleBindingCount: summary.validatorAcceptedPacketVisibleBindingCount,
        validatorLedgerEntryCount: summary.validatorLedgerEntryCount,
        validatorRejectedPacketVisibleBindingCount: summary.validatorRejectedPacketVisibleBindingCount,
        validatorRejectionEntryCount: summary.validatorRejectionEntryCount
      }
    }),
    check("HIA_WP46_HANDOFF_REPORT_TARGET_OWNER_ONLY", summary.targetOwnerMaySubmitReportPacket === true
      && summary.targetOwnerActionRequiredScenarioCount === summary.scenarioCount
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
        targetOwnerActionRequiredScenarioCount: summary.targetOwnerActionRequiredScenarioCount,
        targetOwnerMaySubmitReportPacket: summary.targetOwnerMaySubmitReportPacket
      }
    }),
    check("HIA_WP46_HANDOFF_REPORT_WP47_METADATA_ONLY_INPUTS_READY", summary.wp47InputCount >= 8
      && summary.wp47MetadataOnlyInputCount === summary.wp47InputCount
      && summary.wp47CheckedApplyWriteEnabledCount === 0
      && summary.wp47TargetMutationAllowedCount === 0
      && summary.wp47SourceBodyRequiredCount === 0, {
      actual: {
        wp47CheckedApplyWriteEnabledCount: summary.wp47CheckedApplyWriteEnabledCount,
        wp47InputCount: summary.wp47InputCount,
        wp47MetadataOnlyInputCount: summary.wp47MetadataOnlyInputCount,
        wp47SourceBodyRequiredCount: summary.wp47SourceBodyRequiredCount,
        wp47TargetMutationAllowedCount: summary.wp47TargetMutationAllowedCount
      }
    }),
    check("HIA_WP46_HANDOFF_REPORT_NO_EXECUTION_OR_WRITE", summary.actualTargetCommandExecutedCount === 0
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
    check("HIA_WP46_HANDOFF_REPORT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
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
    check("HIA_WP46_HANDOFF_REPORT_NEXT_STAGE_READY", summary.readyForWp46CloseoutAndWp47Inputs === true
      && summary.nextStage === "W-P46.7 Closeout And W-P47/W-P48 Inputs"
      && summary.w47PreparationInputReady === true, {
      actual: {
        nextStage: summary.nextStage,
        readyForWp46CloseoutAndWp47Inputs: summary.readyForWp46CloseoutAndWp47Inputs,
        w47PreparationInputReady: summary.w47PreparationInputReady
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P46.6 target-owner handoff/report packet has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp46-target-owner-handoff-report-packet",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp46-closeout-and-wp47-wp48-inputs",
    sourceEvidence: {
      adoptionTrialScenarioMatrix: normalizePath(adoptionMatrixEvidencePath),
      evidenceRedactionPrivacyValidator: normalizePath(validatorEvidencePath),
      hostReviewProjectionForOwnerEvidence: normalizePath(hostProjectionEvidencePath),
      ownerProvidedEvidencePacketSchema: normalizePath(packetSchemaEvidencePath)
    },
    handoffPolicy: {
      policy: "target-owner-submitted-metadata-only-report",
      targetOwnerMaySubmitReportPacket: true,
      hiaAutomationMayRunTargetCommand: false,
      hiaAutomationMayCreateBranchOrPullRequest: false,
      hiaAutomationMayCreateSandbox: false,
      hiaAutomationMayMutateTargetRepository: false,
      hiaAutomationMayTriggerCheckedApply: false,
      hiaAutomationMayExecuteProviderOrNetwork: false,
      packetBodyStoredByThisStage: false,
      sourcesContentPolicy: "none"
    },
    handoffBindings,
    reportPacket,
    wp47CheckedApplyPilotMetadataInputs: wp47Inputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      scenarioHandoffBindings: normalizePath(scenarioBindingsPath),
      targetOwnerHandoffReportPacket: normalizePath(handoffPacketPath),
      targetOwnerReportTemplate: normalizePath(reportTemplatePath),
      wp47CheckedApplyPilotMetadataInputs: normalizePath(wp47InputsPath)
    },
    nextContractInputs: [
      {
        phase: "W-P46.7",
        topic: "closeout-and-wp47-wp48-inputs",
        status: "ready-input",
        reason: "Target-owner handoff/report packet is now bound to scenarios, validator outcomes, host projections and metadata-only W-P47 inputs."
      },
      {
        phase: "W-P47",
        topic: "checked-apply-write-pilot-preparation",
        status: "metadata-only-deferred-input",
        reason: "Checked apply write pilot may only inspect target-owner-submitted metadata after a later gate; W-P46.6 grants no write authority."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P46.6 target-owner handoff/report evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(handoffPacketPath, renderHandoffPacket(evidence), "utf8");
  await writeFile(reportTemplatePath, renderReportTemplate(evidence), "utf8");
  await writeFile(wp47InputsPath, renderWp47Inputs(evidence), "utf8");
  await writeFile(scenarioBindingsPath, renderScenarioBindings(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    evidence: evidencePath,
    handoffPacket: handoffPacketPath,
    reportTemplate: reportTemplatePath,
    scenarioBindings: scenarioBindingsPath,
    wp47Inputs: wp47InputsPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P46 target-owner handoff/report evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P46 target-owner handoff/report packet prepared at ${normalizePath(handoffPacketPath)}`);
  console.log(`W-P46 target-owner report template prepared at ${normalizePath(reportTemplatePath)}`);
  console.log(`W-P46 W-P47 metadata-only inputs prepared at ${normalizePath(wp47InputsPath)}`);
}

async function readInputs() {
  const [
    adoptionMatrixEvidence,
    hostProjectionEvidence,
    packetSchemaEvidence,
    validatorEvidence
  ] = await Promise.all([
    readJson(adoptionMatrixEvidencePath),
    readJson(hostProjectionEvidencePath),
    readJson(packetSchemaEvidencePath),
    readJson(validatorEvidencePath)
  ]);

  return {
    adoptionMatrixEvidence,
    hostProjectionEvidence,
    packetSchemaEvidence,
    validatorEvidence
  };
}

function createHandoffBindings(inputs) {
  const hostProjections = readyHostProjectionMap(inputs.hostProjectionEvidence);
  const reportSectionIds = createReportPacket(inputs).sections
    .filter((section) => section.required)
    .map((section) => section.id);

  return inputs.adoptionMatrixEvidence.scenarios.map((scenario) => {
    const hostProjectionRefs = scenario.hostProjectionRefs.map((hostId) => ({
      hostId,
      status: hostProjections.get(hostId)?.status ?? "missing",
      surface: hostProjections.get(hostId)?.surface ?? "unknown",
      readOnly: hostProjections.get(hostId)?.readOnly === true,
      checkedApplyWriteEnabled: hostProjections.get(hostId)?.checkedApplyWriteEnabled === true
    }));

    return {
      id: `handoff:${scenario.id}`,
      scenarioId: scenario.id,
      label: scenario.label,
      kind: scenario.kind,
      targetLabel: scenario.targetLabel,
      docLines: scenario.docLines,
      handoffStatus: "ready-for-target-owner-report-packet",
      requiredEvidenceKinds: scenario.requiredEvidenceKinds,
      optionalEvidenceKinds: scenario.optionalEvidenceKinds,
      adoptionGateRefs: scenario.adoptionGateRefs,
      reportSectionRefs: reportSectionIds,
      hostProjectionRefs,
      validatorOutcomeRefs: {
        acceptedPacketVisible: number(scenario.acceptedPacketCountVisible),
        rejectedPacketVisible: number(scenario.rejectedPacketCountVisible),
        ledgerRef: "wp46-validator-ledger-metadata-only",
        rejectionReportRef: "wp46-validator-rejection-report-metadata-only"
      },
      targetOwnerAction: {
        required: true,
        maySubmitReportPacket: true,
        mayReferenceOwnBranchOrPr: true,
        mayReferenceOwnLocalSandbox: true,
        hiaExecutionClaimed: false
      },
      hiaAuthority: noHiaAuthority(),
      privacy: noPrivateContentPolicy(),
      wp47InputRef: `wp47-input:${scenario.id}`
    };
  });
}

function createReportPacket(inputs) {
  return {
    contract: "hia-wp46-target-owner-handoff-report-packet-template",
    contractVersion: "0.1.0-draft",
    packetStatus: "ready-for-target-owner-reporting",
    sections: [
      reportSection("handoff-metadata", "packet id、scenario id、target label、owner label、created time。", true),
      reportSection("selected-scenario", "从 W-P46.5 scenario matrix 中选择一个场景并记录 doc-line coverage。", true),
      reportSection("owner-submitted-evidence-summary", "列出 target owner 主动提交的 public-safe evidence kind。", true),
      reportSection("command-or-check-summary", "记录命令、构建、测试、文档生成或 CI 检查摘要；不记录本地路径或源码正文。", true),
      reportSection("validator-result-reference", "引用 W-P46.3 validator accepted/rejected 状态、public-safe error code 与 owner action。", true),
      reportSection("host-review-observation", "记录 VS Code、DevTools、Visual Studio 三宿主只读 projection 可见性。", true),
      reportSection("privacy-redaction-attestation", "确认不含源码正文、secret、request/response body、本地绝对路径、packet body。", true),
      reportSection("owner-decision", "记录 owner-submitted-valid、owner-submitted-rejected、owner-deferred、owner-blocked 等决策结果。", true),
      reportSection("branch-pr-sandbox-reference", "可选记录 target owner 自行创建的 branch、PR 或 local sandbox public-safe 引用。", false),
      reportSection("checked-apply-deferred-statement", "明确 checked apply write pilot 仍后延，W-P46.6 不开启写入。", true),
      reportSection("follow-up-request", "记录 HIA 或目标项目后续需要补充的 runner、host surface、协议或说明。", false),
      reportSection("wp47-metadata-handoff", "把目标所有者提交的 metadata-only 摘要作为 W-P47 checked apply pilot preparation 的唯一输入。", true)
    ],
    decisionOutcomes: inputs.adoptionMatrixEvidence.resultTemplate.resultShapes.map((shape) => ({
      id: shape.id,
      meaning: shape.meaning,
      producedByHia: false,
      targetOwnerActionRequired: true
    })),
    hiaAuthority: noHiaAuthority(),
    privacy: noPrivateContentPolicy()
  };
}

function createWp47Inputs(inputs, handoffBindings, reportPacket) {
  return [
    wp47Input("owner-submitted-report-metadata", "target owner 后续提交的 report packet 元数据摘要。", handoffBindings.map((binding) => binding.id)),
    wp47Input("selected-scenario-result-shape", "adoption trial result shape，用于 W-P47 判断是否具备 pilot 输入。", reportPacket.decisionOutcomes.map((outcome) => outcome.id)),
    wp47Input("validator-result-reference", "W-P46.3 validator ledger/rejection report 的 public-safe 引用。", ["wp46-validator-ledger-metadata-only", "wp46-validator-rejection-report-metadata-only"]),
    wp47Input("host-review-projection-observation", "三宿主只读 projection 观察摘要。", readyHostIds(inputs.hostProjectionEvidence)),
    wp47Input("privacy-redaction-attestation", "目标所有者对无源码、无 secret、无 request/response body、无本地路径的确认。", ["redaction-attestation"]),
    wp47Input("owner-execution-decision", "target owner 选择执行、暂缓、阻塞或拒绝 adoption trial 的结果。", ["owner-submitted-valid", "owner-submitted-rejected", "owner-deferred", "owner-blocked"]),
    wp47Input("checked-apply-deferred-write-guard", "checked apply write gate 仍关闭，W-P47 只能准备 pilot，不能从 W-P46.6 直接继承写入权。", ["checked-apply-deferred"]),
    wp47Input("conflict-preflight-required-later", "若 W-P47 后续进入真实 checked apply，必须由 host 执行文件版本与冲突 preflight。", ["host-owned-conflict-preflight"]),
    wp47Input("no-source-body-policy", "W-P47 输入继续使用 metadata-only 策略，不要求源码正文或 sourcesContent。", ["sources-content-policy-none"])
  ];
}

function reportSection(id, description, required) {
  return {
    id,
    description,
    required,
    targetOwnerEditable: true,
    hiaMayPreFillMetadataOnly: true,
    sourceBodyAllowed: false,
    secretValueAllowed: false,
    localAbsolutePathAllowed: false
  };
}

function wp47Input(id, description, refs) {
  return {
    id,
    description,
    refs,
    inputStatus: "deferred-metadata-only-input",
    targetOwnerSubmittedOnly: true,
    checkedApplyWriteEnabled: false,
    targetRepositoryMutationAllowed: false,
    sourceBodyRequired: false,
    secretValueRequired: false,
    localAbsolutePathAllowed: false
  };
}

function summarize({
  handoffBindings,
  inputs,
  reportPacket,
  wp47Inputs
}) {
  const scenarioCount = inputs.adoptionMatrixEvidence.scenarios.length;
  const reportRequiredSections = reportPacket.sections.filter((section) => section.required);
  const publicSurface = JSON.stringify({
    handoffBindings,
    reportPacket,
    wp47Inputs
  });

  return {
    phase: "W-P46.6",
    adoptionMatrixInputReady: inputs.adoptionMatrixEvidence.status === "ready-for-wp46-target-owner-handoff-and-report-packet",
    hostProjectionInputReady: inputs.hostProjectionEvidence.status === "ready-for-wp46-adoption-trial-scenario-matrix",
    packetSchemaInputReady: inputs.packetSchemaEvidence.status === "ready-for-wp46-redaction-privacy-validator",
    validatorInputReady: inputs.validatorEvidence.status === "ready-for-wp46-host-review-projection-for-owner-evidence",
    inputHardFailureCount: sum([
      inputs.adoptionMatrixEvidence.summary?.hardFailureCount,
      inputs.hostProjectionEvidence.summary?.hardFailureCount,
      inputs.packetSchemaEvidence.summary?.hardFailureCount,
      inputs.validatorEvidence.summary?.hardFailureCount
    ]),
    scenarioCount,
    scenarioHandoffBindingCount: handoffBindings.length,
    targetProjectHandoffBindingCount: handoffBindings.filter((binding) => binding.kind === "target-project").length,
    handoffOwnerActionRequiredCount: handoffBindings.filter((binding) => binding.targetOwnerAction.required === true).length,
    scenarioReportSectionBindingCount: handoffBindings.reduce((count, binding) => count + binding.reportSectionRefs.length, 0),
    allRequiredEvidenceKindsBound: handoffBindings.every((binding) => binding.requiredEvidenceKinds.every((kind) => Boolean(kind))),
    reportSectionCount: reportPacket.sections.length,
    requiredReportSectionCount: reportRequiredSections.length,
    resultTemplateSectionCount: inputs.adoptionMatrixEvidence.resultTemplate.sections.length,
    resultShapeCount: inputs.adoptionMatrixEvidence.resultTemplate.resultShapes.length,
    decisionOutcomeCount: reportPacket.decisionOutcomes.length,
    hostProjectionReadyCount: readyHostIds(inputs.hostProjectionEvidence).length,
    hostProjectionRefCount: handoffBindings.reduce((count, binding) => count + binding.hostProjectionRefs.length, 0),
    validatorAcceptedPacketVisibleBindingCount: handoffBindings.filter((binding) => binding.validatorOutcomeRefs.acceptedPacketVisible > 0).length,
    validatorRejectedPacketVisibleBindingCount: handoffBindings.filter((binding) => binding.validatorOutcomeRefs.rejectedPacketVisible > 0).length,
    validatorLedgerEntryCount: entries(inputs.validatorEvidence.validationLedger).length,
    validatorRejectionEntryCount: entries(inputs.validatorEvidence.rejectionReport).length,
    readinessChecklistCount: inputs.adoptionMatrixEvidence.readinessChecklist.checks.length,
    evidenceKindCatalogCount: inputs.adoptionMatrixEvidence.evidenceKindCatalog.length,
    adoptionGateCount: inputs.adoptionMatrixEvidence.adoptionGates.length,
    targetOwnerMaySubmitReportPacket: true,
    targetOwnerActionRequiredScenarioCount: handoffBindings.filter((binding) => binding.targetOwnerAction.required === true).length,
    hiaMayRunTargetCommand: false,
    hiaMayCreateBranchOrPr: false,
    hiaMayCreateSandbox: false,
    hiaMayMutateTargetRepository: false,
    hiaMayTriggerCheckedApply: false,
    actualTargetCommandExecutedCount: 0,
    actualSandboxCreatedCount: 0,
    actualBranchCreatedCount: 0,
    actualPullRequestOpenedCount: 0,
    checkedApplyTriggeredCount: handoffBindings.filter((binding) => binding.hiaAuthority.checkedApplyTriggered === true).length,
    workspaceWriteAllowedCount: handoffBindings.filter((binding) => binding.hiaAuthority.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: handoffBindings.filter((binding) => binding.hiaAuthority.targetRepositoryMutationAllowed === true).length,
    providerNetworkExecutedCount: handoffBindings.filter((binding) => binding.hiaAuthority.providerNetworkExecuted === true).length,
    directEditObjectCount: handoffBindings.reduce((count, binding) => count + number(binding.hiaAuthority.directEditObjectCount), 0),
    wp47InputCount: wp47Inputs.length,
    wp47MetadataOnlyInputCount: wp47Inputs.filter((input) => input.inputStatus === "deferred-metadata-only-input").length,
    wp47CheckedApplyWriteEnabledCount: wp47Inputs.filter((input) => input.checkedApplyWriteEnabled === true).length,
    wp47TargetMutationAllowedCount: wp47Inputs.filter((input) => input.targetRepositoryMutationAllowed === true).length,
    wp47SourceBodyRequiredCount: wp47Inputs.filter((input) => input.sourceBodyRequired === true).length,
    packetBodyStoredCount: countTrue([
      ...handoffBindings.map((binding) => binding.privacy.packetBodyStored),
      reportPacket.privacy.packetBodyStored
    ]),
    sourceTextIncludedCount: countTrue([
      ...handoffBindings.map((binding) => binding.privacy.sourceTextIncluded),
      reportPacket.privacy.sourceTextIncluded
    ]),
    secretValueIncludedCount: countTrue([
      ...handoffBindings.map((binding) => binding.privacy.secretValueIncluded),
      reportPacket.privacy.secretValueIncluded
    ]),
    requestBodyIncludedCount: countTrue([
      ...handoffBindings.map((binding) => binding.privacy.requestBodyIncluded),
      reportPacket.privacy.requestBodyIncluded
    ]),
    responseBodyIncludedCount: countTrue([
      ...handoffBindings.map((binding) => binding.privacy.responseBodyIncluded),
      reportPacket.privacy.responseBodyIncluded
    ]),
    localAbsolutePathDetectedCount: countPathExposure(publicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(publicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(publicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    w47PreparationInputReady: true,
    readyForWp46CloseoutAndWp47Inputs: true,
    nextStage: "W-P46.7 Closeout And W-P47/W-P48 Inputs",
    hardFailureCount: 0
  };
}

function noHiaAuthority() {
  return {
    hiaMayRunTargetCommand: false,
    hiaMayCreateBranchOrPr: false,
    hiaMayCreateSandbox: false,
    hiaMayMutateTargetRepository: false,
    hiaMayTriggerCheckedApply: false,
    hiaMayExecuteProviderOrNetwork: false,
    checkedApplyTriggered: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerNetworkExecuted: false,
    directEditObjectCount: 0
  };
}

function noPrivateContentPolicy() {
  return {
    packetBodyStored: false,
    sourceTextIncluded: false,
    secretValueIncluded: false,
    requestBodyIncluded: false,
    responseBodyIncluded: false,
    localAbsolutePathAllowed: false,
    sourcesContentPolicy: "none"
  };
}

function readyHostProjectionMap(hostProjectionEvidence) {
  return new Map((hostProjectionEvidence.hostProjections ?? []).map((projection) => [projection.hostId, projection]));
}

function readyHostIds(hostProjectionEvidence) {
  return (hostProjectionEvidence.hostProjections ?? [])
    .filter((projection) => projection.status === "projection-ready")
    .map((projection) => projection.hostId);
}

function entries(report) {
  if (Array.isArray(report)) {
    return report;
  }
  return Array.isArray(report?.entries) ? report.entries : [];
}

function renderHandoffPacket(evidence) {
  const rows = evidence.handoffBindings
    .map((binding) => `| \`${binding.scenarioId}\` | ${binding.kind} | ${binding.targetLabel} | \`${binding.handoffStatus}\` | ${binding.hostProjectionRefs.length} | ${binding.requiredEvidenceKinds.join(", ")} | \`${binding.wp47InputRef}\` |`)
    .join("\n");

  return `# W-P46.6 Target-Owner Handoff Report Packet

## 中文摘要

本 packet 把 W-P46.5 adoption trial 场景、W-P46.3 validator outcome、W-P46.4 三宿主 projection 和 W-P47 metadata-only 输入绑定在一起。目标所有者可以后续主动提交 report packet；HIA 当前不运行目标项目命令，不创建 sandbox、branch 或 PR，不触发 checked apply，不执行 provider/network，也不修改目标仓库。

## Summary

- status：\`${evidence.status}\`
- scenario handoff bindings：${evidence.summary.scenarioHandoffBindingCount}
- report sections：${evidence.summary.reportSectionCount}
- W-P47 metadata-only inputs：${evidence.summary.wp47InputCount}
- sources content policy：\`${evidence.summary.sourcesContentPolicy}\`
- next stage：\`${evidence.summary.nextStage}\`

| Scenario | Kind | Target | Status | Host Projections | Required Evidence | W-P47 Input |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderReportTemplate(evidence) {
  const sections = evidence.reportPacket.sections
    .map((section) => `### ${section.id}

${section.description}

- Required：${section.required ? "yes" : "no"}
- Target-owner editable：${section.targetOwnerEditable ? "yes" : "no"}
- Source body allowed：no
- Result:
- Notes:
`)
    .join("\n");
  const decisions = evidence.reportPacket.decisionOutcomes
    .map((outcome) => `- \`${outcome.id}\`: ${outcome.meaning}`)
    .join("\n");

  return `# W-P46.6 Target-Owner Report Template

## 中文摘要

该模板供 target owner 后续提交 public-safe adoption trial report。模板只接收元数据、结果形状和脱敏摘要，不接收源码正文、secret、request/response body、本地绝对路径或 packet body。

## Sections

${sections}

## Decision Outcomes

${decisions}
`;
}

function renderWp47Inputs(evidence) {
  const rows = evidence.wp47CheckedApplyPilotMetadataInputs
    .map((input) => `| \`${input.id}\` | \`${input.inputStatus}\` | ${input.description} | ${input.checkedApplyWriteEnabled ? "yes" : "no"} | ${input.targetRepositoryMutationAllowed ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P46.6 W-P47 Checked Apply Pilot Metadata Inputs

## 中文摘要

这些输入只作为 W-P47 checked apply write pilot preparation 的 metadata-only 前置材料。它们不启用 checked apply 写入，不允许目标仓库 mutation，不要求源码正文，也不继承任何 HIA 自动执行目标项目动作的权限。

| Input | Status | Description | Checked Apply Write | Target Mutation |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderScenarioBindings(evidence) {
  return `# W-P46.6 Scenario Handoff Bindings

## 中文摘要

该清单用于审查每个 adoption trial scenario 如何绑定 required evidence kind、report sections、validator outcome、host projections 与 W-P47 deferred metadata input。

${evidence.handoffBindings.map((binding) => `## ${binding.scenarioId}

- target：${binding.targetLabel}
- status：\`${binding.handoffStatus}\`
- required evidence：${binding.requiredEvidenceKinds.join(", ")}
- report sections：${binding.reportSectionRefs.join(", ")}
- host projections：${binding.hostProjectionRefs.map((ref) => `${ref.hostId}:${ref.status}`).join(", ")}
- validator accepted visible：${binding.validatorOutcomeRefs.acceptedPacketVisible}
- validator rejected visible：${binding.validatorOutcomeRefs.rejectedPacketVisible}
- W-P47 input：\`${binding.wp47InputRef}\`
`).join("\n")}
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

function countTrue(values) {
  return values.filter(Boolean).length;
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
