import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryEvidencePath = path.join(rootDir, "dist", "wp49-repository-self-doc-inventory", "evidence.json");
const changedScopeGatePath = path.join(rootDir, "dist", "wp49-changed-scope-annotation-quality-gate", "evidence.json");
const internalFlowFixturePath = path.join(rootDir, "dist", "wp49-internal-flow-comment-fixture", "evidence.json");
const generatedContinuityPath = path.join(rootDir, "dist", "wp49-generated-comment-continuity-adr-input", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp49-self-doc-reference-refresh");
const evidencePath = path.join(outputRoot, "evidence.json");
const refreshReportPath = path.join(outputRoot, "self-doc-reference-refresh.md");
const coverageLedgerPath = path.join(outputRoot, "coverage-change-ledger.md");
const nextInputsPath = path.join(outputRoot, "wp49-closeout-and-wp50-inputs.md");

await main();

/**
 * 准备 W-P49.6 self-doc reference refresh evidence。
 * Prepare W-P49.6 self-doc reference refresh evidence.
 *
 * @lang zh-CN 本脚本复用 W-P49.2-W-P49.5 的已生成 evidence，形成本项目
 * 自文档化 candidate 的当前覆盖快照、覆盖变化账本和 W-P49.7/W-P50 输入。
 * 它不修改源码注释，不输出源码正文，也不把历史注释缺口声明为已完成。
 * @lang en This script reuses W-P49.2-W-P49.5 evidence to produce the current
 * self-documentation candidate coverage snapshot, a coverage-change ledger, and
 * W-P49.7/W-P50 inputs. It does not mutate source annotations, emit source
 * bodies, or claim historical documentation gaps are complete.
 *
 * @returns {Promise<void>} Writes public-safe W-P49.6 evidence and reports.
 */
async function main() {
  const inventory = await readJson(inventoryEvidencePath);
  const changedScopeGate = await readJson(changedScopeGatePath);
  const internalFlowFixture = await readJson(internalFlowFixturePath);
  const generatedContinuity = await readJson(generatedContinuityPath);

  assert.equal(inventory.status, "ready-for-wp49-changed-scope-annotation-quality-gate");
  assert.equal(changedScopeGate.status, "ready-for-wp49-internal-flow-comment-fixture");
  assert.equal(internalFlowFixture.status, "ready-for-wp49-generated-comment-continuity-adr-input");
  assert.equal(generatedContinuity.status, "ready-for-wp49-self-doc-reference-refresh");

  const coverageSnapshot = createCoverageSnapshot(inventory);
  const coverageChangeLedger = createCoverageChangeLedger(coverageSnapshot);
  const selfDocCandidate = createSelfDocCandidate({
    coverageChangeLedger,
    coverageSnapshot,
    generatedContinuity,
    internalFlowFixture
  });
  const nextInputs = createNextInputs({
    changedScopeGate,
    coverageChangeLedger,
    generatedContinuity,
    internalFlowFixture,
    inventory
  });
  const summary = createSummary({
    changedScopeGate,
    coverageSnapshot,
    generatedContinuity,
    internalFlowFixture,
    nextInputs,
    selfDocCandidate
  });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp49-self-doc-reference-refresh",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp49-closeout-and-wp50-inputs" : "blocked-by-wp49-self-doc-reference-refresh",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P49.6",
    sourceInputs: {
      repositoryInventoryEvidence: normalizePath(inventoryEvidencePath),
      changedScopeGateEvidence: normalizePath(changedScopeGatePath),
      internalFlowCommentFixtureEvidence: normalizePath(internalFlowFixturePath),
      generatedContinuityAdrEvidence: normalizePath(generatedContinuityPath)
    },
    executionPolicy: {
      policy: "self-doc-reference-refresh-only",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      mayClaimHistoricalCommentCoverageComplete: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    refreshBoundary: {
      purpose: "Refresh the self-documentation reference candidate from W-P49 evidence outputs.",
      candidateKind: "metadata-only-self-doc-reference-candidate",
      refreshMode: "rerun-existing-wp49-evidence-chain-and-record-current-coverage",
      sourceBodySerialized: false,
      historicalCoverageClaimedComplete: false,
      sourceAnnotationMutationIncluded: false
    },
    coverageSnapshot,
    coverageChangeLedger,
    selfDocCandidate,
    nextInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      coverageChangeLedger: normalizePath(coverageLedgerPath),
      nextInputs: normalizePath(nextInputsPath),
      refreshReport: normalizePath(refreshReportPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P49.6 self-doc reference refresh evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(refreshReportPath, renderRefreshReport(evidence), "utf8");
  await writeFile(coverageLedgerPath, renderCoverageLedger(evidence), "utf8");
  await writeFile(nextInputsPath, renderNextInputs(evidence), "utf8");

  console.log(`W-P49.6 self-doc reference refresh prepared at ${normalizePath(evidencePath)}`);
  console.log(`Refresh status: ${evidence.status}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createCoverageSnapshot(inventory) {
  const summary = inventory.summary;
  return {
    scanSource: "wp49-repository-self-doc-inventory-current-rerun",
    scannedSourceFileCount: summary.scannedSourceFileCount,
    publicExportedNodeCount: summary.publicExportedNodeCount,
    documentedPublicExportedNodeCount: summary.documentedPublicExportedNodeCount,
    publicExportedDocCoveragePercent: summary.publicExportedDocCoveragePercent,
    bilingualMarkerPublicExportedNodeCount: summary.bilingualMarkerPublicExportedNodeCount,
    publicExportedBilingualMarkerCoveragePercent: summary.publicExportedBilingualMarkerCoveragePercent,
    missingDocBlockCount: summary.missingDocBlockCount,
    missingBilingualMarkerCount: summary.missingBilingualMarkerCount,
    internalFlowCandidateCount: summary.internalFlowCandidateCount,
    internalFlowCandidateWithCommentCount: summary.internalFlowCandidateWithCommentCount,
    internalFlowCandidateWithBilingualCommentCount: summary.internalFlowCandidateWithBilingualCommentCount,
    internalFlowCommentCoveragePercent: summary.internalFlowCommentCoveragePercent,
    internalFlowBilingualCommentCoveragePercent: summary.internalFlowBilingualCommentCoveragePercent,
    boundaryCategoryCount: summary.boundaryCategoryCount,
    historicalCoverageClaimedComplete: summary.historicalCoverageClaimedComplete
  };
}

function createCoverageChangeLedger(coverageSnapshot) {
  return {
    baselineSource: "W-P49.2 first-round inventory rerun during W-P49.6",
    comparisonSource: "Current W-P49.6 self-doc reference candidate",
    coverageDeltaPolicy: "no-source-annotation-mutation-in-wp49.3-through-wp49.6",
    publicExportedDocCoverageDeltaPercent: 0,
    publicExportedBilingualMarkerCoverageDeltaPercent: 0,
    internalFlowCommentCoverageDeltaPercent: 0,
    internalFlowBilingualCommentCoverageDeltaPercent: 0,
    sourceAnnotationChangedByRefresh: false,
    expectedReasonZh: "W-P49.3-W-P49.6 只建立门禁、fixture、ADR 输入和 reference refresh，不执行历史注释补齐，因此覆盖率应保持为 W-P49.2 当前盘点值。",
    expectedReasonEn: "W-P49.3-W-P49.6 only establish gates, fixtures, ADR inputs, and the reference refresh. They do not retrofit historical annotations, so coverage should stay at the current W-P49.2 inventory values.",
    currentCoverageSnapshot: {
      publicExportedDocCoveragePercent: coverageSnapshot.publicExportedDocCoveragePercent,
      publicExportedBilingualMarkerCoveragePercent: coverageSnapshot.publicExportedBilingualMarkerCoveragePercent,
      internalFlowCommentCoveragePercent: coverageSnapshot.internalFlowCommentCoveragePercent,
      internalFlowBilingualCommentCoveragePercent: coverageSnapshot.internalFlowBilingualCommentCoveragePercent
    }
  };
}

function createSelfDocCandidate({ coverageChangeLedger, coverageSnapshot, generatedContinuity, internalFlowFixture }) {
  return {
    status: "candidate-ready-for-closeout-not-release-grade",
    candidateInputs: [
      "annotation-richness-policy-baseline",
      "repository-self-documentation-inventory",
      "changed-scope-annotation-quality-gate",
      "internal-flow-comment-fixture",
      "generated-comment-continuity-adr-input"
    ],
    coverageSnapshotReady: true,
    changedScopeGateReady: true,
    internalFlowFixtureReady: internalFlowFixture.summary.fixtureReadyForReviewChecklist === true,
    generatedContinuityInputReady: generatedContinuity.summary.docSourceMapExtensionInputReady === true,
    referenceRefreshReady: coverageChangeLedger.sourceAnnotationChangedByRefresh === false,
    releaseGradeSelfDocumentationReady: false,
    reasonZh: `当前 candidate 可作为后续自文档化治理 reference；public/exported doc coverage 为 ${coverageSnapshot.publicExportedDocCoveragePercent}%，双语 marker coverage 为 ${coverageSnapshot.publicExportedBilingualMarkerCoveragePercent}%，仍不是 release-grade 注释完成态。`,
    reasonEn: `The current candidate is ready as a governance reference. Public/exported doc coverage is ${coverageSnapshot.publicExportedDocCoveragePercent}% and bilingual marker coverage is ${coverageSnapshot.publicExportedBilingualMarkerCoveragePercent}%, so it is not release-grade annotation completion.`
  };
}

function createNextInputs({ changedScopeGate, coverageChangeLedger, generatedContinuity, internalFlowFixture, inventory }) {
  return [
    {
      id: "wp49-7-closeout",
      titleZh: "W-P49.7 收口",
      status: "ready",
      inputRefs: [
        inventory.contract,
        changedScopeGate.contract,
        internalFlowFixture.contract,
        generatedContinuity.contract,
        "hia-wp49-self-doc-reference-refresh"
      ],
      requirementZh: "收口 W-P49，并把 W-P50 IDE authoring、VS 插件和生成式绑定输入排序。"
    },
    {
      id: "wp50-authoring-tooling-input",
      titleZh: "W-P50 authoring tooling 输入",
      status: "ready",
      requirementZh: "把 W-P49 的注释规则、changed-scope gate 和 self-doc candidate 投给 VS Code / DevTools / Visual Studio authoring UX。"
    },
    {
      id: "generated-doc-binding-adr",
      titleZh: "生成式注释绑定 ADR",
      status: "ready",
      requirementZh: "基于 W-P49.5 的 generated-doc-binding 模型继续细化 Pug/Meta 一对多映射和 doc-source-map extension。"
    },
    {
      id: "historical-gap-remediation-plan",
      titleZh: "历史注释缺口分期治理",
      status: "ready",
      requirementZh: `以 ${coverageChangeLedger.currentCoverageSnapshot.publicExportedDocCoveragePercent}% public/exported doc coverage 和 ${coverageChangeLedger.currentCoverageSnapshot.publicExportedBilingualMarkerCoveragePercent}% bilingual marker coverage 为起点，按 touched-surface 和风险分批补齐。`
    }
  ];
}

function createSummary({ changedScopeGate, coverageSnapshot, generatedContinuity, internalFlowFixture, nextInputs, selfDocCandidate }) {
  return {
    phase: "W-P49.6",
    selfDocReferenceCandidateReady: selfDocCandidate.referenceRefreshReady,
    releaseGradeSelfDocumentationReady: selfDocCandidate.releaseGradeSelfDocumentationReady,
    scannedSourceFileCount: coverageSnapshot.scannedSourceFileCount,
    publicExportedNodeCount: coverageSnapshot.publicExportedNodeCount,
    documentedPublicExportedNodeCount: coverageSnapshot.documentedPublicExportedNodeCount,
    publicExportedDocCoveragePercent: coverageSnapshot.publicExportedDocCoveragePercent,
    bilingualMarkerPublicExportedNodeCount: coverageSnapshot.bilingualMarkerPublicExportedNodeCount,
    publicExportedBilingualMarkerCoveragePercent: coverageSnapshot.publicExportedBilingualMarkerCoveragePercent,
    internalFlowCandidateCount: coverageSnapshot.internalFlowCandidateCount,
    internalFlowFixtureCount: internalFlowFixture.summary.selectedFixtureCount,
    generatedContinuityScenarioCount: generatedContinuity.summary.scenarioCount,
    generatedContinuityAdrQuestionCount: generatedContinuity.summary.adrQuestionCount,
    changedScopeHardFailureCount: changedScopeGate.summary.hardFailureCount,
    historicalCoverageClaimedComplete: coverageSnapshot.historicalCoverageClaimedComplete,
    sourceAnnotationChangedByRefresh: false,
    nextInputCount: nextInputs.length,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    requestBodySerializedCount: 0,
    responseBodySerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0
  };
}

function createChecks(summary) {
  return [
    check("self-doc-candidate-ready", summary.selfDocReferenceCandidateReady, "W-P49.6 self-doc reference candidate is ready."),
    check("release-grade-not-claimed", summary.releaseGradeSelfDocumentationReady === false, "W-P49.6 must not claim release-grade self-documentation completion."),
    check("historical-coverage-not-claimed", summary.historicalCoverageClaimedComplete === false, "Historical coverage remains explicitly incomplete."),
    check("changed-scope-clean", summary.changedScopeHardFailureCount === 0, "Changed-scope annotation gate has no hard failures."),
    check("coverage-snapshot-present", summary.publicExportedNodeCount > 0 && summary.scannedSourceFileCount > 0, "Coverage snapshot is present."),
    check("next-inputs-ready", summary.nextInputCount >= 4, "W-P49.7/W-P50 inputs are ready."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies are emitted."),
    check("no-write-or-network", summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write or network authority is used.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderRefreshReport(evidence) {
  const summary = evidence.summary;
  return `# W-P49.6 Self-Doc Reference Refresh\n\n## 中文摘要\n\nW-P49.6 已重新串联 W-P49.2-W-P49.5 的 evidence 输出，形成本项目自文档化 reference candidate 的当前快照。本阶段不修改源码注释、不输出源码正文、不声称历史注释缺口已经补齐。\n\n## 当前覆盖快照\n\n| 指标 | 数值 |\n| --- | ---: |\n| 扫描源码文件 | ${summary.scannedSourceFileCount} |\n| public/exported 节点 | ${summary.publicExportedNodeCount} |\n| 已有文档化注释节点 | ${summary.documentedPublicExportedNodeCount} |\n| public/exported doc coverage | ${summary.publicExportedDocCoveragePercent}% |\n| 双语 marker 节点 | ${summary.bilingualMarkerPublicExportedNodeCount} |\n| 双语 marker coverage | ${summary.publicExportedBilingualMarkerCoveragePercent}% |\n| 内部流程候选 | ${summary.internalFlowCandidateCount} |\n| W-P49.4 fixture | ${summary.internalFlowFixtureCount} |\n| 生成式连续性场景 | ${summary.generatedContinuityScenarioCount} |\n| ADR 问题 | ${summary.generatedContinuityAdrQuestionCount} |\n\n## 结论\n\n- Self-doc reference candidate：${evidence.selfDocCandidate.status}。\n- Release-grade self documentation：${summary.releaseGradeSelfDocumentationReady ? "yes" : "no"}。\n- Changed-scope hard failures：${summary.changedScopeHardFailureCount}。\n- 历史覆盖完成声明：${summary.historicalCoverageClaimedComplete ? "yes" : "no"}。\n\n${evidence.selfDocCandidate.reasonZh}\n`;
}

function renderCoverageLedger(evidence) {
  const ledger = evidence.coverageChangeLedger;
  const snapshot = evidence.coverageSnapshot;
  return `# W-P49.6 Coverage Change Ledger\n\n## 中文摘要\n\n本账本记录 W-P49.6 相对 W-P49.2 当前盘点的覆盖变化。由于 W-P49.3-W-P49.6 不执行源码注释补齐，覆盖率变化预期为 0；这不是停滞，而是把后续治理的基准点固定下来。\n\n## 覆盖变化\n\n| 指标 | 当前值 | Delta |\n| --- | ---: | ---: |\n| public/exported doc coverage | ${snapshot.publicExportedDocCoveragePercent}% | ${ledger.publicExportedDocCoverageDeltaPercent}% |\n| public/exported bilingual marker coverage | ${snapshot.publicExportedBilingualMarkerCoveragePercent}% | ${ledger.publicExportedBilingualMarkerCoverageDeltaPercent}% |\n| internal flow comment coverage | ${snapshot.internalFlowCommentCoveragePercent}% | ${ledger.internalFlowCommentCoverageDeltaPercent}% |\n| internal flow bilingual comment coverage | ${snapshot.internalFlowBilingualCommentCoveragePercent}% | ${ledger.internalFlowBilingualCommentCoverageDeltaPercent}% |\n\n## 说明\n\n${ledger.expectedReasonZh}\n`;
}

function renderNextInputs(evidence) {
  const rows = evidence.nextInputs
    .map((item) => `| ${item.id} | ${item.status} | ${item.requirementZh} |`)
    .join("\n");
  return `# W-P49.6 Next Inputs\n\n## 中文摘要\n\nW-P49.6 将当前自文档化 candidate 固定为 W-P49.7 closeout 和 W-P50 authoring tooling 的输入。后续可以开始把规则投射到 IDE/DevTools/Visual Studio 编辑辅助，同时把历史注释补齐继续保持分期治理。\n\n| 输入 | 状态 | 要求 |\n| --- | --- | --- |\n${rows}\n`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(text, label) {
  const forbiddenPatterns = [
    /work-zone/i,
    /file:\/\//i,
    /\b[A-Z]:[\\/]/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/,
    /"sourcesContent"\s*:/
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} includes forbidden private marker: ${pattern}`);
  }
}
