import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp46-adoption-trial-scenario-matrix");
const evidencePath = path.join(outputRoot, "evidence.json");
const scenarioMatrixPath = path.join(outputRoot, "adoption-trial-scenario-matrix.md");
const readinessChecklistPath = path.join(outputRoot, "adoption-trial-readiness-checklist.md");
const resultTemplatePath = path.join(outputRoot, "target-owner-adoption-trial-result-template.md");
const hostProjectionEvidencePath = path.join(rootDir, "dist", "wp46-host-review-projection-owner-evidence", "evidence.json");
const validatorEvidencePath = path.join(rootDir, "dist", "wp46-evidence-redaction-privacy-validator", "evidence.json");

await main();

/**
 * 准备 W-P46.5 adoption trial scenario matrix evidence。
 * Prepare W-P46.5 adoption trial scenario matrix evidence.
 *
 * 中文：本阶段把 W-P46.3 validator outcome 与 W-P46.4 三宿主只读 projection
 * 整理成 adoption trial 场景矩阵。矩阵覆盖 HIA self、UnicodeArtJs、
 * HIA-ASPNETPortal 等采用视角，但不由 HIA automation 执行目标项目命令、
 * 创建 branch/PR/sandbox、触发 checked apply 或修改目标仓库。
 *
 * English: This stage organizes W-P46.3 validator outcomes and W-P46.4
 * read-only host projections into an adoption-trial scenario matrix. The
 * matrix covers HIA self-adoption and known target-project adoption views,
 * but it does not let HIA automation run target commands, create branches,
 * pull requests or sandboxes, trigger checked apply or mutate target
 * repositories.
 *
 * @returns {Promise<void>} Writes public-safe W-P46.5 scenario matrix evidence.
 */
async function main() {
  const inputs = await readInputs();
  const evidenceKindCatalog = createEvidenceKindCatalog();
  const adoptionGates = createAdoptionGates();
  const scenarios = createScenarioMatrix({ adoptionGates, evidenceKindCatalog, inputs });
  const readinessChecklist = createReadinessChecklist({ adoptionGates, evidenceKindCatalog, scenarios });
  const resultTemplate = createResultTemplate({ scenarios });
  const summary = summarize({
    adoptionGates,
    evidenceKindCatalog,
    inputs,
    readinessChecklist,
    resultTemplate,
    scenarios
  });
  const checks = [
    check("HIA_WP46_ADOPTION_TRIAL_INPUTS_READY", summary.hostProjectionInputReady === true
      && summary.validatorInputReady === true
      && summary.hostProjectionReadyCount === 3
      && summary.inputHardFailureCount === 0, {
      actual: {
        hostProjectionInputReady: summary.hostProjectionInputReady,
        hostProjectionReadyCount: summary.hostProjectionReadyCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        validatorInputReady: summary.validatorInputReady
      }
    }),
    check("HIA_WP46_ADOPTION_TRIAL_MATRIX_READY", summary.scenarioCount >= 4
      && summary.hiaSelfScenarioCount >= 1
      && summary.targetProjectScenarioCount >= 2
      && summary.docLineCoverageCount >= 3
      && summary.requiredEvidenceKindCatalogCount >= 8
      && summary.adoptionGateCount >= 8, {
      actual: {
        adoptionGateCount: summary.adoptionGateCount,
        docLineCoverageCount: summary.docLineCoverageCount,
        hiaSelfScenarioCount: summary.hiaSelfScenarioCount,
        requiredEvidenceKindCatalogCount: summary.requiredEvidenceKindCatalogCount,
        scenarioCount: summary.scenarioCount,
        targetProjectScenarioCount: summary.targetProjectScenarioCount
      }
    }),
    check("HIA_WP46_ADOPTION_TRIAL_HOST_PROJECTION_COVERAGE", summary.scenarioHostProjectionRefCount === summary.scenarioCount * summary.hostProjectionReadyCount
      && summary.allScenarioHostProjectionRefsReady === true
      && summary.validatedAcceptedPacketVisibleScenarioCount === summary.scenarioCount
      && summary.rejectedPacketVisibleScenarioCount === summary.scenarioCount, {
      actual: {
        allScenarioHostProjectionRefsReady: summary.allScenarioHostProjectionRefsReady,
        rejectedPacketVisibleScenarioCount: summary.rejectedPacketVisibleScenarioCount,
        scenarioHostProjectionRefCount: summary.scenarioHostProjectionRefCount,
        validatedAcceptedPacketVisibleScenarioCount: summary.validatedAcceptedPacketVisibleScenarioCount
      }
    }),
    check("HIA_WP46_ADOPTION_TRIAL_TARGET_OWNER_ONLY", summary.targetOwnerMaySubmitEvidence === true
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
        targetOwnerMaySubmitEvidence: summary.targetOwnerMaySubmitEvidence
      }
    }),
    check("HIA_WP46_ADOPTION_TRIAL_NO_EXECUTION_OR_WRITE", summary.actualTargetCommandExecutedCount === 0
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
    check("HIA_WP46_ADOPTION_TRIAL_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
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
    check("HIA_WP46_ADOPTION_TRIAL_NEXT_STAGE_READY", summary.nextStage === "W-P46.6 Target-Owner Handoff And Report Packet"
      && summary.resultTemplateSectionCount >= 8
      && summary.resultShapeCount >= 6
      && summary.readyForTargetOwnerHandoffPacket === true, {
      actual: {
        nextStage: summary.nextStage,
        readyForTargetOwnerHandoffPacket: summary.readyForTargetOwnerHandoffPacket,
        resultShapeCount: summary.resultShapeCount,
        resultTemplateSectionCount: summary.resultTemplateSectionCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P46.5 adoption trial scenario matrix has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp46-adoption-trial-scenario-matrix",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp46-target-owner-handoff-and-report-packet",
    sourceEvidence: {
      evidenceRedactionPrivacyValidator: normalizePath(validatorEvidencePath),
      hostReviewProjectionForOwnerEvidence: normalizePath(hostProjectionEvidencePath)
    },
    adoptionTrialPolicy: {
      policy: "matrix-only-owner-executed-trial",
      hiaAutomationMayRunTargetCommand: false,
      hiaAutomationMayCreateBranchOrPullRequest: false,
      hiaAutomationMayCreateSandbox: false,
      hiaAutomationMayMutateTargetRepository: false,
      hiaAutomationMayTriggerCheckedApply: false,
      targetOwnerMaySubmitEvidencePacket: true,
      packetBodyStoredByThisStage: false,
      sourcesContentPolicy: "none"
    },
    evidenceKindCatalog,
    adoptionGates,
    scenarios,
    readinessChecklist,
    resultTemplate,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      adoptionTrialScenarioMatrix: normalizePath(scenarioMatrixPath),
      adoptionTrialReadinessChecklist: normalizePath(readinessChecklistPath),
      targetOwnerAdoptionTrialResultTemplate: normalizePath(resultTemplatePath)
    },
    nextContractInputs: [
      {
        phase: "W-P46.6",
        topic: "target-owner-handoff-and-report-packet",
        status: "ready-input",
        reason: "Adoption trial scenarios now have public-safe evidence requirements, host projection coverage and no-execution boundaries."
      },
      {
        phase: "W-P47",
        topic: "checked-apply-write-pilot-preparation",
        status: "deferred-input",
        reason: "Checked apply may only consume target-owner-submitted metadata later; W-P46.5 grants no write authority."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P46.5 adoption trial scenario matrix evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(scenarioMatrixPath, renderScenarioMatrix(evidence), "utf8");
  await writeFile(readinessChecklistPath, renderReadinessChecklist(evidence), "utf8");
  await writeFile(resultTemplatePath, renderResultTemplate(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    evidence: evidencePath,
    readinessChecklist: readinessChecklistPath,
    resultTemplate: resultTemplatePath,
    scenarioMatrix: scenarioMatrixPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P46 adoption trial scenario matrix evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P46 adoption trial scenario matrix prepared at ${normalizePath(scenarioMatrixPath)}`);
  console.log(`W-P46 adoption trial readiness checklist prepared at ${normalizePath(readinessChecklistPath)}`);
  console.log(`W-P46 target-owner adoption trial result template prepared at ${normalizePath(resultTemplatePath)}`);
}

async function readInputs() {
  const [hostProjectionEvidence, validatorEvidence] = await Promise.all([
    readJson(hostProjectionEvidencePath),
    readJson(validatorEvidencePath)
  ]);

  return {
    hostProjectionEvidence,
    validatorEvidence
  };
}

function createEvidenceKindCatalog() {
  return [
    evidenceKind("command-transcript", "目标所有者执行命令后的 public-safe transcript 摘要，不含本地路径、源码正文或 secret。", true),
    evidenceKind("check-summary", "构建、测试、文档生成或 CI 检查摘要，只记录状态和公共错误类别。", true),
    evidenceKind("branch-reference", "目标所有者自行创建的 branch 引用；HIA 不创建、不 push。", false),
    evidenceKind("pull-request-reference", "目标所有者自行创建的 PR 引用；HIA 不打开 PR。", false),
    evidenceKind("local-sandbox-reference", "目标所有者本地 sandbox 的 public-safe 摘要；HIA 不创建 sandbox。", false),
    evidenceKind("screenshot-or-report", "目标所有者提供的脱敏截图或报告引用，不嵌入私有图片正文。", false),
    evidenceKind("redaction-attestation", "目标所有者确认 packet 不含源码正文、secret、request/response body、本地绝对路径。", true),
    evidenceKind("host-review-linkage-observation", "宿主 review surface 观察结果，说明 validator outcome 是否可见。", true)
  ];
}

function evidenceKind(id, description, requiredForMinimalTrial) {
  return {
    id,
    description,
    requiredForMinimalTrial,
    sourceBodyAllowed: false,
    secretValueAllowed: false,
    localAbsolutePathAllowed: false,
    targetOwnerProvidedOnly: true
  };
}

function createAdoptionGates() {
  return [
    gate("owner-attestation", "目标所有者确认 packet 由其主动提交。"),
    gate("redaction-clean", "redaction flags 均确认不含源码、secret、request/response body、本地绝对路径。"),
    gate("validator-acceptance", "W-P46.3 validator 接受或给出 public-safe rejection reason。"),
    gate("host-projection-visible", "W-P46.4 三宿主 review projection 可见 validator outcome。"),
    gate("scenario-evidence-kind-covered", "场景所需 evidence kind 已在 catalog 中覆盖。"),
    gate("target-owner-action-required", "目标项目动作仍由 target owner 决定和执行。"),
    gate("checked-apply-deferred", "checked apply write pilot 仍处于后续阶段，不在 adoption trial 中启用。"),
    gate("private-material-excluded", "不记录 packet body、source body、secret value、request/response body 或本地路径。"),
    gate("handoff-ready", "结果可进入 W-P46.6 handoff/report packet。")
  ];
}

function gate(id, description) {
  return {
    id,
    description,
    status: "required-before-adoption-handoff"
  };
}

function createScenarioMatrix({ adoptionGates, evidenceKindCatalog, inputs }) {
  const hostIds = readyHostIds(inputs.hostProjectionEvidence);
  const requiredCatalogIds = new Set(evidenceKindCatalog.map((item) => item.id));
  const commonGateRefs = adoptionGates.map((item) => item.id);
  const scenarioDrafts = [
    scenarioDraft({
      id: "hia-self-core-docs",
      label: "HIA self documentation and release evidence",
      kind: "hia-self",
      docLines: ["jsdoc", "tsdoc", "cssdoc", "htmdoc", "dotnetdoc"],
      targetLabel: "HIA Documentation Sys",
      requiredEvidenceKinds: ["check-summary", "redaction-attestation", "host-review-linkage-observation"],
      optionalEvidenceKinds: ["command-transcript", "screenshot-or-report"],
      ownerAction: "由 HIA 维护者后续提交自文档化 adoption evidence packet。"
    }),
    scenarioDraft({
      id: "unicodeartjs-tsdoc-runner",
      label: "UnicodeArtJs TSDoc runner adoption",
      kind: "target-project",
      docLines: ["tsdoc", "jsdoc", "unified-output"],
      targetLabel: "UnicodeArtJs",
      requiredEvidenceKinds: ["command-transcript", "check-summary", "redaction-attestation", "host-review-linkage-observation"],
      optionalEvidenceKinds: ["branch-reference", "pull-request-reference", "screenshot-or-report"],
      ownerAction: "目标项目所有者可运行 TSDoc 文档化命令后提交 public-safe packet。"
    }),
    scenarioDraft({
      id: "hia-aspnetportal-dotnetdoc-runner",
      label: "HIA-ASPNETPortal DotNetDoc adoption",
      kind: "target-project",
      docLines: ["dotnetdoc", "htmdoc", "unified-output"],
      targetLabel: "HIA-ASPNETPortal",
      requiredEvidenceKinds: ["command-transcript", "check-summary", "local-sandbox-reference", "redaction-attestation", "host-review-linkage-observation"],
      optionalEvidenceKinds: ["branch-reference", "pull-request-reference", "screenshot-or-report"],
      ownerAction: "目标项目所有者可在本地验证 DotNetDoc XML/markup 注释抽取后提交 packet。"
    }),
    scenarioDraft({
      id: "satellite-docline-package-adoption",
      label: "HIA satellite doc-line package adoption",
      kind: "hia-satellite",
      docLines: ["javadoc", "godoc", "dotnetdoc", "unified-output"],
      targetLabel: "HIA doc-line satellite repositories",
      requiredEvidenceKinds: ["check-summary", "redaction-attestation", "host-review-linkage-observation"],
      optionalEvidenceKinds: ["command-transcript", "branch-reference", "pull-request-reference"],
      ownerAction: "卫星仓库维护者后续按各语言 runner 输出提交 metadata-only evidence packet。"
    })
  ];

  return scenarioDrafts.map((scenario) => {
    const missingCatalogIds = scenario.requiredEvidenceKinds.filter((kind) => !requiredCatalogIds.has(kind));
    return {
      ...scenario,
      acceptedPacketCountVisible: number(inputs.hostProjectionEvidence.summary?.validatorAcceptedPacketCount),
      actualBranchCreated: false,
      actualCommandExecutedByHia: false,
      actualPullRequestOpened: false,
      actualSandboxCreated: false,
      adoptionGateRefs: commonGateRefs,
      checkedApplyTriggered: false,
      directEditObjectCount: 0,
      hostProjectionRefs: hostIds,
      matrixStatus: missingCatalogIds.length === 0 && hostIds.length === 3 ? "trial-matrix-ready" : "blocked",
      missingEvidenceKindIds: missingCatalogIds,
      ownerEvidencePacketStatus: "not-submitted-yet",
      packetBodyStored: false,
      providerNetworkExecuted: false,
      rejectedPacketCountVisible: number(inputs.hostProjectionEvidence.summary?.validatorRejectedPacketCount),
      sourceTextIncluded: false,
      sourcesContentPolicy: "none",
      targetOwnerActionRequired: true,
      targetOwnerMaySubmitEvidence: true,
      targetRepositoryMutationAllowed: false,
      workspaceWriteAllowed: false
    };
  });
}

function scenarioDraft({
  docLines,
  id,
  kind,
  label,
  optionalEvidenceKinds,
  ownerAction,
  requiredEvidenceKinds,
  targetLabel
}) {
  return {
    docLines,
    id,
    kind,
    label,
    optionalEvidenceKinds,
    ownerAction,
    requiredEvidenceKinds,
    targetLabel
  };
}

function createReadinessChecklist({ adoptionGates, evidenceKindCatalog, scenarios }) {
  const scenarioChecks = scenarios.flatMap((scenario) => [
    checklist(`scenario.${scenario.id}.owner-action`, "scenario", `${scenario.label}: target owner action is explicit.`, scenario.targetOwnerActionRequired),
    checklist(`scenario.${scenario.id}.host-projection`, "scenario", `${scenario.label}: host projection coverage is ready.`, scenario.hostProjectionRefs.length === 3),
    checklist(`scenario.${scenario.id}.privacy`, "scenario", `${scenario.label}: private material remains excluded.`, scenario.sourceTextIncluded === false && scenario.packetBodyStored === false)
  ]);
  const evidenceKindChecks = evidenceKindCatalog.map((kind) => checklist(
    `evidence-kind.${kind.id}`,
    "evidence-kind",
    kind.description,
    kind.sourceBodyAllowed === false && kind.secretValueAllowed === false
  ));
  const gateChecks = adoptionGates.map((gateItem) => checklist(
    `gate.${gateItem.id}`,
    "adoption-gate",
    gateItem.description,
    gateItem.status === "required-before-adoption-handoff"
  ));

  return {
    contract: "hia-wp46-adoption-trial-readiness-checklist",
    contractVersion: "0.1.0-draft",
    checklistStatus: "ready-for-target-owner-review",
    checks: [
      ...scenarioChecks,
      ...evidenceKindChecks,
      ...gateChecks
    ]
  };
}

function checklist(id, category, description, ready) {
  return {
    id,
    category,
    description,
    status: ready ? "ready" : "blocked"
  };
}

function createResultTemplate({ scenarios }) {
  return {
    contract: "hia-wp46-target-owner-adoption-trial-result-template",
    contractVersion: "0.1.0-draft",
    templateStatus: "ready-for-wp46-handoff-packet",
    sections: [
      templateSection("result-metadata", "packet id、scenario id、target label、owner label、created time。"),
      templateSection("selected-scenario", `${scenarios.length} 个 scenario 中选择一个，并记录 doc-line coverage。`),
      templateSection("owner-execution-decision", "target owner 是否执行、暂缓、阻塞或拒绝 adoption trial。"),
      templateSection("evidence-kind-summary", "列出本次提交的 public-safe evidence kind。"),
      templateSection("validator-outcome", "引用 validator accepted/rejected 状态和 public-safe error code。"),
      templateSection("host-review-observation", "记录 VS Code、DevTools、Visual Studio projection 可见性。"),
      templateSection("privacy-attestation", "确认不含源码正文、secret、request/response body、本地绝对路径或 packet body。"),
      templateSection("follow-up-and-handoff", "记录进入 W-P46.6 handoff/report packet 的后续动作。")
    ],
    resultShapes: [
      resultShape("not-submitted", "target owner 尚未提交 adoption trial evidence。"),
      resultShape("matrix-ready", "场景具备提交 evidence packet 的结构条件。"),
      resultShape("owner-submitted-valid", "target owner 后续提交的 packet 通过 validator。"),
      resultShape("owner-submitted-rejected", "target owner 后续提交的 packet 被 validator 拒绝并需修正。"),
      resultShape("owner-deferred", "target owner 暂缓采用试跑。"),
      resultShape("owner-blocked", "target owner 记录阻塞原因。"),
      resultShape("follow-up-required", "需要 HIA 或目标项目后续补充协议、runner 或 host surface。")
    ]
  };
}

function templateSection(id, description) {
  return {
    id,
    description,
    required: true
  };
}

function resultShape(id, meaning) {
  return {
    id,
    meaning,
    producedByHia: false,
    targetOwnerActionRequired: true
  };
}

function summarize({
  adoptionGates,
  evidenceKindCatalog,
  inputs,
  readinessChecklist,
  resultTemplate,
  scenarios
}) {
  const publicSurface = JSON.stringify({
    adoptionGates,
    evidenceKindCatalog,
    readinessChecklist,
    resultTemplate,
    scenarios
  });
  const readyHostIdsSet = new Set(readyHostIds(inputs.hostProjectionEvidence));
  const docLines = new Set(scenarios.flatMap((scenario) => scenario.docLines));
  const distinctRequiredEvidenceKinds = new Set(scenarios.flatMap((scenario) => scenario.requiredEvidenceKinds));

  return {
    phase: "W-P46.5",
    hostProjectionInputReady: inputs.hostProjectionEvidence.status === "ready-for-wp46-adoption-trial-scenario-matrix",
    validatorInputReady: inputs.validatorEvidence.status === "ready-for-wp46-host-review-projection-for-owner-evidence",
    inputHardFailureCount: number(inputs.hostProjectionEvidence.summary?.hardFailureCount)
      + number(inputs.validatorEvidence.summary?.hardFailureCount),
    hostProjectionReadyCount: readyHostIdsSet.size,
    validatorAcceptedPacketCount: number(inputs.validatorEvidence.summary?.privacyAcceptedCount),
    validatorRejectedPacketCount: number(inputs.validatorEvidence.summary?.privacyRejectedCount),
    scenarioCount: scenarios.length,
    hiaSelfScenarioCount: scenarios.filter((scenario) => scenario.kind === "hia-self").length,
    targetProjectScenarioCount: scenarios.filter((scenario) => scenario.kind === "target-project").length,
    hiaSatelliteScenarioCount: scenarios.filter((scenario) => scenario.kind === "hia-satellite").length,
    docLineCoverageCount: docLines.size,
    requiredEvidenceKindCatalogCount: evidenceKindCatalog.length,
    distinctRequiredEvidenceKindCount: distinctRequiredEvidenceKinds.size,
    adoptionGateCount: adoptionGates.length,
    scenarioHostProjectionRefCount: scenarios.reduce((sum, scenario) => sum + scenario.hostProjectionRefs.length, 0),
    allScenarioHostProjectionRefsReady: scenarios.every((scenario) => scenario.hostProjectionRefs.every((hostId) => readyHostIdsSet.has(hostId))),
    validatedAcceptedPacketVisibleScenarioCount: scenarios.filter((scenario) => scenario.acceptedPacketCountVisible > 0).length,
    rejectedPacketVisibleScenarioCount: scenarios.filter((scenario) => scenario.rejectedPacketCountVisible > 0).length,
    targetOwnerMaySubmitEvidence: true,
    targetOwnerActionRequiredScenarioCount: scenarios.filter((scenario) => scenario.targetOwnerActionRequired === true).length,
    hiaMayRunTargetCommand: false,
    hiaMayCreateBranchOrPr: false,
    hiaMayCreateSandbox: false,
    hiaMayMutateTargetRepository: false,
    hiaMayTriggerCheckedApply: false,
    actualTargetCommandExecutedCount: scenarios.filter((scenario) => scenario.actualCommandExecutedByHia === true).length,
    actualSandboxCreatedCount: scenarios.filter((scenario) => scenario.actualSandboxCreated === true).length,
    actualBranchCreatedCount: scenarios.filter((scenario) => scenario.actualBranchCreated === true).length,
    actualPullRequestOpenedCount: scenarios.filter((scenario) => scenario.actualPullRequestOpened === true).length,
    checkedApplyTriggeredCount: scenarios.filter((scenario) => scenario.checkedApplyTriggered === true).length,
    workspaceWriteAllowedCount: scenarios.filter((scenario) => scenario.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: scenarios.filter((scenario) => scenario.targetRepositoryMutationAllowed === true).length,
    providerNetworkExecutedCount: scenarios.filter((scenario) => scenario.providerNetworkExecuted === true).length,
    directEditObjectCount: scenarios.reduce((sum, scenario) => sum + number(scenario.directEditObjectCount), 0),
    packetBodyStoredCount: scenarios.filter((scenario) => scenario.packetBodyStored === true).length,
    sourceTextIncludedCount: scenarios.filter((scenario) => scenario.sourceTextIncluded === true).length,
    secretValueIncludedCount: number(inputs.hostProjectionEvidence.summary?.secretValueIncludedCount)
      + number(inputs.validatorEvidence.summary?.secretValueIncludedCount),
    requestBodyIncludedCount: number(inputs.hostProjectionEvidence.summary?.requestBodyIncludedCount)
      + number(inputs.validatorEvidence.summary?.requestBodyIncludedCount),
    responseBodyIncludedCount: number(inputs.hostProjectionEvidence.summary?.responseBodyIncludedCount)
      + number(inputs.validatorEvidence.summary?.responseBodyIncludedCount),
    localAbsolutePathDetectedCount: countPathExposure(publicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(publicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(publicSurface) ? 1 : 0,
    sourcesContentPolicy: scenarios.every((scenario) => scenario.sourcesContentPolicy === "none") ? "none" : "mixed",
    readinessChecklistCount: readinessChecklist.checks.length,
    resultTemplateSectionCount: resultTemplate.sections.length,
    resultShapeCount: resultTemplate.resultShapes.length,
    readyForTargetOwnerHandoffPacket: true,
    nextStage: "W-P46.6 Target-Owner Handoff And Report Packet",
    hardFailureCount: 0
  };
}

function readyHostIds(hostProjectionEvidence) {
  return (hostProjectionEvidence.hostProjections ?? [])
    .filter((projection) => projection.status === "projection-ready")
    .map((projection) => projection.hostId);
}

function renderScenarioMatrix(evidence) {
  const rows = evidence.scenarios
    .map((scenario) => `| \`${scenario.id}\` | ${scenario.kind} | ${scenario.targetLabel} | ${scenario.docLines.join(", ")} | \`${scenario.matrixStatus}\` | ${scenario.hostProjectionRefs.length} | ${scenario.requiredEvidenceKinds.join(", ")} |`)
    .join("\n");
  return `# W-P46.5 Adoption Trial Scenario Matrix

## 中文摘要

本矩阵只描述 adoption trial 的准备状态。HIA 没有运行目标项目命令，没有创建 sandbox、branch 或 PR，没有触发 checked apply，也没有修改目标仓库。

## Summary

- status：\`${evidence.status}\`
- scenarios：${evidence.summary.scenarioCount}
- target project scenarios：${evidence.summary.targetProjectScenarioCount}
- doc-line coverage：${evidence.summary.docLineCoverageCount}
- host projections：${evidence.summary.hostProjectionReadyCount}
- next stage：\`${evidence.summary.nextStage}\`

| Scenario | Kind | Target | Doc Lines | Status | Host Projections | Required Evidence |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderReadinessChecklist(evidence) {
  const rows = evidence.readinessChecklist.checks
    .map((item) => `| \`${item.id}\` | ${item.category} | \`${item.status}\` | ${item.description} |`)
    .join("\n");
  return `# W-P46.5 Adoption Trial Readiness Checklist

## 中文摘要

该清单用于 W-P46.6 handoff/report packet 前确认场景矩阵、evidence kind、adoption gate 均已具备只读审查条件。

| Check | Category | Status | Description |
| --- | --- | --- | --- |
${rows}
`;
}

function renderResultTemplate(evidence) {
  const { resultTemplate } = evidence;
  return `# W-P46.5 Target-Owner Adoption Trial Result Template

## 中文摘要

该模板供 W-P46.6 生成 handoff/report packet 时使用。目标所有者可以后续提交实际 adoption trial 结果；HIA 当前只提供结构，不执行目标项目动作。

## Sections

${resultTemplate.sections.map((section) => `### ${section.id}

${section.description}

- Result:
- Notes:
`).join("\n")}

## Result Shapes

${resultTemplate.resultShapes.map((shape) => `- \`${shape.id}\`: ${shape.meaning}`).join("\n")}
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
