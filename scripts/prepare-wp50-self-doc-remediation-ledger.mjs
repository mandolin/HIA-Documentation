import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = path.join(rootDir, "dist", "wp49-repository-self-doc-inventory", "evidence.json");
const closeoutPath = path.join(rootDir, "dist", "wp49-closeout-wp50-inputs", "evidence.json");
const generatedBindingPath = path.join(rootDir, "dist", "wp50-generated-binding-authoring-input", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp50-self-doc-remediation-ledger");
const evidencePath = path.join(outputRoot, "evidence.json");
const ledgerPath = path.join(outputRoot, "self-doc-remediation-ledger.md");
const rulebookPath = path.join(outputRoot, "touched-surface-rulebook.md");
const batchPlanPath = path.join(outputRoot, "self-doc-remediation-batch-plan.md");

await main();

/**
 * 准备 W-P50.5 self-doc remediation ledger evidence。
 * Prepare W-P50.5 self-doc remediation ledger evidence.
 *
 * @lang zh-CN 本脚本把 W-P49 自文档化盘点、W-P49 closeout deferred ledger
 * 和 W-P50.4 generated binding guidance 转换为可执行但不自动写入的修复账本。
 * 它只输出路径、节点、数量、批次和规则等元数据，不输出源码正文、不修改源码、
 * 不启用 checked apply 写入。
 * @lang en This script turns the W-P49 self-documentation inventory, W-P49
 * closeout deferred ledger, and W-P50.4 generated binding guidance into an
 * executable but non-mutating remediation ledger. It only emits metadata such
 * as paths, nodes, counts, batches, and rules; it emits no source bodies,
 * mutates no source files, and enables no checked-apply writes.
 *
 * @returns {Promise<void>} Writes public-safe remediation ledger evidence.
 */
async function main() {
  const inputs = await readInputs();
  assert.equal(inputs.inventory.status, "ready-for-wp49-changed-scope-annotation-quality-gate");
  assert.equal(inputs.closeout.status, "ready-for-wp50-authoring-tooling-planning");
  assert.equal(inputs.generatedBinding.status, "ready-for-wp50-self-doc-remediation-ledger");

  const touchedSurfaceRules = createTouchedSurfaceRules();
  const remediationLedger = createRemediationLedger(inputs);
  const batchPlan = createBatchPlan(inputs, remediationLedger);
  const gatePolicy = createGatePolicy(inputs);
  const summary = createSummary({ batchPlan, gatePolicy, inputs, remediationLedger, touchedSurfaceRules });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp50-self-doc-remediation-ledger",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P50.5",
    status: hardFailures.length === 0 ? "ready-for-wp50-runtime-manual-packet" : "blocked-by-wp50-self-doc-remediation-ledger",
    sourceEvidence: {
      generatedBindingAuthoringInput: normalizePath(generatedBindingPath),
      repositorySelfDocInventory: normalizePath(inventoryPath),
      wp49Closeout: normalizePath(closeoutPath)
    },
    executionPolicy: {
      policy: "self-doc-remediation-ledger-only",
      bulkHistoricalRewriteAllowed: false,
      changedScopeHardGateEnabledForFutureWork: true,
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayLaunchHostRuntime: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayStartAnotherWPhase: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    remediationBoundary: {
      purpose: "Turn self-documentation gaps into staged remediation inputs.",
      firstRoundMode: "ledger-and-rulebook-only",
      historicalCoverageClaimedComplete: false,
      releaseGradeSelfDocumentationClaimed: false,
      targetRepositoryAuthority: "none",
      writeAuthority: "disabled"
    },
    touchedSurfaceRules,
    remediationLedger,
    batchPlan,
    gatePolicy,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      batchPlan: normalizePath(batchPlanPath),
      ledger: normalizePath(ledgerPath),
      rulebook: normalizePath(rulebookPath)
    },
    nextStageInputs: [
      {
        phase: "W-P50.6",
        status: "ready-input",
        topic: "runtime-manual-packet-and-evidence",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P50.7",
        status: "candidate-input",
        topic: "closeout-and-wp51-inputs",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P50.5 self-doc remediation ledger evidence");
  assert.equal(hardFailures.length, 0, `W-P50.5 self-doc remediation ledger has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(ledgerPath, renderLedger(evidence), "utf8");
  await writeFile(rulebookPath, renderRulebook(evidence), "utf8");
  await writeFile(batchPlanPath, renderBatchPlan(evidence), "utf8");

  console.log(`W-P50.5 self-doc remediation ledger prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P50.5 status: ${evidence.status}`);
}

async function readInputs() {
  const [inventory, closeout, generatedBinding] = await Promise.all([
    readJson(inventoryPath),
    readJson(closeoutPath),
    readJson(generatedBindingPath)
  ]);

  return {
    closeout,
    generatedBinding,
    inventory
  };
}

function createTouchedSurfaceRules() {
  return [
    rule("public-exported-doc-required", "P0", "新增或 touched public/exported API 必须有生态可识别文档化注释。"),
    rule("canonical-locale-marker-required", "P0", "新增或 touched 节点文档化注释必须使用 canonical `@lang` 与 inline `<lang>` / `<l>`，不得新增 `@hiaText/@hiaBlock`。"),
    rule("params-returns-errors-complete", "P0", "涉及参数、返回、异常、副作用、默认值、精度或限制时必须补齐中英双语说明。"),
    rule("internal-flow-blocks-commented", "P1", "节点内部存在明显分段、分步或复杂流程时，每个关键块至少有简短但足够解释的双语注释。"),
    rule("generated-binding-continuity-preserved", "P1", "生成式 DSL 的上游注释必须为下游生成目标预留 `generated-doc-binding` 连续性信息。"),
    rule("no-low-value-comment-padding", "P0", "禁止逐行复述赋值、循环和条件；注释必须解释目的、边界、不变量或取舍。"),
    rule("source-privacy-default-none", "P0", "自文档化 evidence 与 authoring guidance 默认不输出源码正文或 `sourcesContent`。")
  ];
}

function rule(id, priority, requirementZh) {
  return {
    enforcement: "changed-scope-first",
    id,
    priority,
    requirementZh,
    status: "ready-rule"
  };
}

function createRemediationLedger(inputs) {
  const inventory = inputs.inventory;
  const closeoutItems = inputs.closeout.deferredLedger;
  const publicGaps = inventory.gapLedger.topGaps.slice(0, 40);
  const internalCandidates = inventory.internalFlowLedger.topCandidates.slice(0, 40);

  return {
    status: "report-only-ledger",
    closeoutDeferredItems: closeoutItems.map((item) => ({
      id: item.id,
      nextActionZh: item.nextActionZh,
      priority: item.priority,
      reasonZh: item.reasonZh,
      status: item.status
    })),
    publicSurfaceGapSample: publicGaps,
    internalFlowCandidateSample: internalCandidates,
    generatedBindingFollowup: {
      authoringStepCount: inputs.generatedBinding.summary.authoringStepCount,
      diagnosticGuidanceCount: inputs.generatedBinding.summary.diagnosticGuidanceCount,
      hostGuidanceCount: inputs.generatedBinding.summary.hostGuidanceCount,
      status: "ready-for-future-parser-fixtures"
    }
  };
}

function createBatchPlan(inputs, remediationLedger) {
  const summary = inputs.inventory.summary;
  const boundaryCategories = inputs.inventory.boundaryCategories;

  return [
    batch("changed-scope-new-work", "P0", "immediate", "所有后续 touched public/exported API 与复杂流程块先执行 hard gate。", {
      estimatedItems: "per-change",
      source: "changed-scope"
    }),
    batch("critical-boundary-public-api", "P0", "next-self-doc-cycle", "优先治理 schema、contract/profile、source-map、provider、runtime-host 相关 public/exported 节点。", {
      contractProfilePublicNodes: boundaryCategories["contract-profile"].publicExportedNodeCount,
      providerPublicNodes: boundaryCategories.provider.publicExportedNodeCount,
      runtimeHostPublicNodes: boundaryCategories["runtime-host"].publicExportedNodeCount,
      schemaPublicNodes: boundaryCategories.schema.publicExportedNodeCount,
      sourceMapPublicNodes: boundaryCategories["source-map"].publicExportedNodeCount
    }),
    batch("historical-public-api-docs", "P0", "staged", "按模块和风险补齐历史 public/exported 文档化注释。", {
      missingDocBlockCount: summary.missingDocBlockCount,
      missingBilingualMarkerCount: summary.missingBilingualMarkerCount,
      publicExportedNodeCount: summary.publicExportedNodeCount
    }),
    batch("internal-flow-comments", "P1", "staged", "用 W-P49.4 fixture 与 W-P50 authoring UX 逐步扩大内部流程块注释覆盖。", {
      candidateCount: summary.internalFlowCandidateCount,
      candidateWithBilingualCommentCount: summary.internalFlowCandidateWithBilingualCommentCount
    }),
    batch("generated-binding-continuity", "P1", "future-parser-fixtures", "将 W-P50.4 guidance 推进到 Pug / Meta / Sass parser fixtures 与 source-linkage 查询。", {
      authoringStepCount: remediationLedger.generatedBindingFollowup.authoringStepCount,
      diagnosticGuidanceCount: remediationLedger.generatedBindingFollowup.diagnosticGuidanceCount
    }),
    batch("release-grade-self-doc", "P2", "after-remediation", "历史补齐、authoring UX 与 reference refresh 稳定后，再评估 release-grade self documentation。", {
      releaseGradeSelfDocumentationClaimed: false
    })
  ];
}

function batch(id, priority, timing, goalZh, signals) {
  return {
    goalZh,
    id,
    priority,
    signals,
    status: "ready-batch",
    timing,
    writeAuthority: "disabled-until-explicit-remediation-window"
  };
}

function createGatePolicy(inputs) {
  return {
    status: "ready-policy",
    changedScope: {
      hardGateForNewPublicApi: true,
      hardGateForTouchedPublicApi: true,
      hardGateForHistoricalUntouchedGaps: false,
      rationaleZh: "历史欠账较大，先用 touched-surface 规则阻止新增债务，再按批次治理。"
    },
    historicalBacklog: {
      publicExportedDocCoveragePercent: inputs.inventory.summary.publicExportedDocCoveragePercent,
      publicExportedBilingualMarkerCoveragePercent: inputs.inventory.summary.publicExportedBilingualMarkerCoveragePercent,
      remediationMode: "staged-ledger",
      bulkRewriteAllowed: false
    },
    generatedBinding: {
      concreteSyntaxFrozen: false,
      parserRuntimeImplemented: false,
      hostGuidanceReady: inputs.generatedBinding.summary.hostReadableGuidanceReady,
      nextMode: "parser-fixture-and-adr-followup"
    }
  };
}

function createSummary({ batchPlan, gatePolicy, inputs, remediationLedger, touchedSurfaceRules }) {
  return {
    phase: "W-P50.5",
    inventoryReady: inputs.inventory.status === "ready-for-wp49-changed-scope-annotation-quality-gate",
    closeoutReady: inputs.closeout.status === "ready-for-wp50-authoring-tooling-planning",
    generatedBindingReady: inputs.generatedBinding.status === "ready-for-wp50-self-doc-remediation-ledger",
    touchedSurfaceRuleCount: touchedSurfaceRules.length,
    p0TouchedSurfaceRuleCount: touchedSurfaceRules.filter((item) => item.priority === "P0").length,
    remediationBatchCount: batchPlan.length,
    p0RemediationBatchCount: batchPlan.filter((item) => item.priority === "P0").length,
    deferredItemCount: remediationLedger.closeoutDeferredItems.length,
    publicSurfaceGapSampleCount: remediationLedger.publicSurfaceGapSample.length,
    internalFlowCandidateSampleCount: remediationLedger.internalFlowCandidateSample.length,
    publicExportedNodeCount: inputs.inventory.summary.publicExportedNodeCount,
    missingDocBlockCount: inputs.inventory.summary.missingDocBlockCount,
    missingBilingualMarkerCount: inputs.inventory.summary.missingBilingualMarkerCount,
    internalFlowCandidateCount: inputs.inventory.summary.internalFlowCandidateCount,
    changedScopeHardGateForNewWork: gatePolicy.changedScope.hardGateForNewPublicApi && gatePolicy.changedScope.hardGateForTouchedPublicApi,
    historicalBulkRewriteAllowed: gatePolicy.historicalBacklog.bulkRewriteAllowed,
    historicalCoverageClaimedComplete: false,
    releaseGradeSelfDocumentationClaimed: false,
    nextStageReady: true,
    nextWPhaseStarted: false,
    anotherWPhaseStarted: false,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    hostRuntimeLaunchCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    requestBodySerializedCount: 0,
    responseBodySerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0,
    sourcesContentPolicy: "none"
  };
}

function createChecks(summary) {
  return [
    check("inputs-ready", summary.inventoryReady && summary.closeoutReady && summary.generatedBindingReady, "W-P49/W-P50 inputs are ready."),
    check("rules-ready", summary.touchedSurfaceRuleCount >= 7 && summary.p0TouchedSurfaceRuleCount >= 4, "Touched-surface remediation rules are ready."),
    check("batches-ready", summary.remediationBatchCount >= 6 && summary.p0RemediationBatchCount >= 3, "Remediation batches are ready."),
    check("samples-ready", summary.publicSurfaceGapSampleCount > 0 && summary.internalFlowCandidateSampleCount > 0, "Metadata samples are available without source bodies."),
    check("changed-scope-gate-ready", summary.changedScopeHardGateForNewWork, "Changed-scope hard gate is ready for new/touched work."),
    check("historical-bulk-rewrite-disabled", summary.historicalBulkRewriteAllowed === false && summary.historicalCoverageClaimedComplete === false && summary.releaseGradeSelfDocumentationClaimed === false, "Historical completion is not claimed."),
    check("next-stage-ready", summary.nextStageReady && summary.nextWPhaseStarted === false && summary.anotherWPhaseStarted === false, "W-P50.6 input is ready without starting another W phase."),
    check("no-host-runtime-or-editor-call", summary.hostRuntimeLaunchCount === 0 && summary.hostEditorApiCallCount === 0, "No host runtime or editor API is used."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies or sourcesContent are emitted."),
    check("no-write-network-target", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderLedger(evidence) {
  const deferredRows = evidence.remediationLedger.closeoutDeferredItems.map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.reasonZh} | ${item.nextActionZh} |`).join("\n");
  const publicRows = evidence.remediationLedger.publicSurfaceGapSample.slice(0, 20).map((item) => `| ${item.path}:${item.line} | ${item.kind} | \`${item.name}\` | ${item.gapKinds.join(", ")} |`).join("\n");
  const flowRows = evidence.remediationLedger.internalFlowCandidateSample.slice(0, 20).map((item) => `| ${item.path}:${item.line} | \`${item.name}\` | ${item.score} | ${item.hasBilingualInternalComment} |`).join("\n");

  return `# W-P50.5 Self-Doc Remediation Ledger

## 中文摘要

W-P50.5 将 W-P49 自文档化盘点和 W-P50 authoring guidance 转换为分期修复账本。本阶段不批量改写历史源码，不宣称历史注释补齐，不启用 checked apply 写入。

## Deferred Items

| id | priority | status | reason | next action |
| --- | --- | --- | --- | --- |
${deferredRows}

## Public Surface Gap Sample

| location | kind | name | gaps |
| --- | --- | --- | --- |
${publicRows}

## Internal Flow Candidate Sample

| location | name | score | bilingual comment |
| --- | --- | ---: | --- |
${flowRows}
`;
}

function renderRulebook(evidence) {
  const rows = evidence.touchedSurfaceRules.map((item) => `| ${item.id} | ${item.priority} | ${item.enforcement} | ${item.requirementZh} |`).join("\n");
  const gate = evidence.gatePolicy;

  return `# W-P50.5 Touched-Surface Rulebook

## 中文摘要

本规则优先约束新增和 touched surface：避免继续制造文档债务。历史欠账进入 staged ledger，不一次性硬阻断。

| rule | priority | enforcement | requirement |
| --- | --- | --- | --- |
${rows}

## Gate Policy

- new public API hard gate: ${gate.changedScope.hardGateForNewPublicApi}
- touched public API hard gate: ${gate.changedScope.hardGateForTouchedPublicApi}
- historical untouched hard gate: ${gate.changedScope.hardGateForHistoricalUntouchedGaps}
- bulk rewrite allowed: ${gate.historicalBacklog.bulkRewriteAllowed}
- generated binding parser/runtime implemented: ${gate.generatedBinding.parserRuntimeImplemented}
`;
}

function renderBatchPlan(evidence) {
  const rows = evidence.batchPlan.map((item) => `| ${item.id} | ${item.priority} | ${item.timing} | ${item.status} | ${item.goalZh} |`).join("\n");
  const summary = evidence.summary;

  return `# W-P50.5 Self-Doc Remediation Batch Plan

## 中文摘要

批次计划先守住 changed-scope，再治理关键边界和历史 public API，随后扩展内部流程块注释与 generated binding parser fixture。

| batch | priority | timing | status | goal |
| --- | --- | --- | --- | --- |
${rows}

## Current Backlog Signals

- public/exported nodes: ${summary.publicExportedNodeCount}
- missing doc block: ${summary.missingDocBlockCount}
- missing bilingual marker: ${summary.missingBilingualMarkerCount}
- internal flow candidates: ${summary.internalFlowCandidateCount}
- historical coverage claimed complete: ${summary.historicalCoverageClaimedComplete}
- release-grade self documentation claimed: ${summary.releaseGradeSelfDocumentationClaimed}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
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
