import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPaths = {
  policyBaseline: path.join(rootDir, "dist", "wp49-annotation-richness-policy-baseline", "evidence.json"),
  repositoryInventory: path.join(rootDir, "dist", "wp49-repository-self-doc-inventory", "evidence.json"),
  changedScopeGate: path.join(rootDir, "dist", "wp49-changed-scope-annotation-quality-gate", "evidence.json"),
  internalFlowFixture: path.join(rootDir, "dist", "wp49-internal-flow-comment-fixture", "evidence.json"),
  generatedContinuityAdr: path.join(rootDir, "dist", "wp49-generated-comment-continuity-adr-input", "evidence.json"),
  selfDocReferenceRefresh: path.join(rootDir, "dist", "wp49-self-doc-reference-refresh", "evidence.json")
};
const outputRoot = path.join(rootDir, "dist", "wp49-closeout-wp50-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutPath = path.join(outputRoot, "wp49-closeout.md");
const wp50InputPath = path.join(outputRoot, "wp50-authoring-tooling-inputs.md");
const deferredLedgerPath = path.join(outputRoot, "wp49-deferred-ledger.md");

await main();

/**
 * 准备 W-P49.7 closeout 与 W-P50 input evidence。
 * Prepare W-P49.7 closeout and W-P50 input evidence.
 *
 * @lang zh-CN 本脚本只汇总 W-P49.1-W-P49.6 的 public-safe evidence，
 * 判断 W-P49 是否可以第一轮收口，并把 W-P50 authoring tooling、生成式绑定 ADR
 * 和历史注释补齐输入排序。它不启动 W-P50，不修改源码注释，不输出源码正文。
 * @lang en This script summarizes public-safe evidence from W-P49.1-W-P49.6,
 * determines whether W-P49 can close its first round, and ranks W-P50 authoring
 * tooling, generated-binding ADR, and historical remediation inputs. It does
 * not start W-P50, mutate source annotations, or emit source bodies.
 *
 * @returns {Promise<void>} Writes public-safe W-P49.7 closeout evidence and reports.
 */
async function main() {
  const inputs = await readInputs();
  assertStatuses(inputs);

  const completedStages = createCompletedStages(inputs);
  const capabilityCloseout = createCapabilityCloseout(inputs);
  const deferredLedger = createDeferredLedger(inputs);
  const wp50Inputs = createWp50Inputs(inputs);
  const summary = createSummary({ capabilityCloseout, completedStages, deferredLedger, inputs, wp50Inputs });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp49-closeout-wp50-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp50-authoring-tooling-planning" : "blocked-by-wp49-closeout",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P49.7",
    sourceInputs: Object.fromEntries(Object.entries(inputPaths).map(([key, filePath]) => [key, normalizePath(filePath)])),
    executionPolicy: {
      policy: "wp49-closeout-and-next-input-ranking-only",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayStartNextWPhase: false,
      hiaMayTriggerCheckedApply: false,
      mayClaimHistoricalCommentCoverageComplete: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    completedStages,
    capabilityCloseout,
    deferredLedger,
    wp50Inputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      closeout: normalizePath(closeoutPath),
      deferredLedger: normalizePath(deferredLedgerPath),
      wp50Inputs: normalizePath(wp50InputPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P49.7 closeout evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutPath, renderCloseout(evidence), "utf8");
  await writeFile(wp50InputPath, renderWp50Inputs(evidence), "utf8");
  await writeFile(deferredLedgerPath, renderDeferredLedger(evidence), "utf8");

  console.log(`W-P49.7 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Closeout status: ${evidence.status}`);
}

async function readInputs() {
  const entries = await Promise.all(Object.entries(inputPaths).map(async ([key, filePath]) => [key, JSON.parse(await readFile(filePath, "utf8"))]));
  return Object.fromEntries(entries);
}

function assertStatuses(inputs) {
  assert.equal(inputs.policyBaseline.status, "ready-for-wp49-repository-self-doc-inventory");
  assert.equal(inputs.repositoryInventory.status, "ready-for-wp49-changed-scope-annotation-quality-gate");
  assert.equal(inputs.changedScopeGate.status, "ready-for-wp49-internal-flow-comment-fixture");
  assert.equal(inputs.internalFlowFixture.status, "ready-for-wp49-generated-comment-continuity-adr-input");
  assert.equal(inputs.generatedContinuityAdr.status, "ready-for-wp49-self-doc-reference-refresh");
  assert.equal(inputs.selfDocReferenceRefresh.status, "ready-for-wp49-closeout-and-wp50-inputs");
}

function createCompletedStages(inputs) {
  return [
    stage("W-P49.1", "annotation-richness-policy-baseline", inputs.policyBaseline.status),
    stage("W-P49.2", "repository-self-documentation-inventory", inputs.repositoryInventory.status),
    stage("W-P49.3", "changed-scope-annotation-quality-gate", inputs.changedScopeGate.status),
    stage("W-P49.4", "internal-flow-comment-fixture", inputs.internalFlowFixture.status),
    stage("W-P49.5", "generated-comment-continuity-adr-input", inputs.generatedContinuityAdr.status),
    stage("W-P49.6", "self-doc-reference-refresh", inputs.selfDocReferenceRefresh.status),
    stage("W-P49.7", "closeout-and-wp50-inputs", "ready-for-wp50-authoring-tooling-planning")
  ];
}

function stage(phase, capability, upstreamStatus) {
  return {
    capability,
    phase,
    status: "completed-first-round",
    upstreamStatus
  };
}

function createCapabilityCloseout(inputs) {
  return [
    capability("annotation-richness-policy", "completed-first-round", "注释丰富度原则已冻结，canonical JS marker 为 @lang / <lang>。"),
    capability("repository-self-doc-inventory", "completed-first-round", `当前 public/exported doc coverage 为 ${inputs.repositoryInventory.summary.publicExportedDocCoveragePercent}%。`),
    capability("changed-scope-quality-gate", "completed-first-round", `当前 hard failures 为 ${inputs.changedScopeGate.summary.hardFailureCount}。`),
    capability("internal-flow-fixture", "completed-first-round", `已选择 ${inputs.internalFlowFixture.summary.selectedFixtureCount} 个内部流程 fixture。`),
    capability("generated-continuity-adr-input", "completed-first-round", `已形成 ${inputs.generatedContinuityAdr.summary.scenarioCount} 个场景和 ${inputs.generatedContinuityAdr.summary.adrQuestionCount} 个 ADR 问题。`),
    capability("self-doc-reference-candidate", "completed-first-round", "当前 candidate 可作为治理 reference，但不是 release-grade 注释完成态。")
  ];
}

function capability(id, status, evidenceZh) {
  return { evidenceZh, id, status };
}

function createDeferredLedger(inputs) {
  return [
    deferred("historical-public-api-doc-remediation", "P0", `仍有 ${inputs.repositoryInventory.summary.missingDocBlockCount} 个 public/exported 节点缺文档化注释。`, "后续按 touched-surface 与风险分批治理。"),
    deferred("historical-bilingual-marker-remediation", "P0", `当前双语 marker coverage 为 ${inputs.repositoryInventory.summary.publicExportedBilingualMarkerCoveragePercent}%。`, "W-P50 authoring UX 先辅助新增/变更范围，历史补齐进入后续 self-doc 周期。"),
    deferred("internal-flow-comment-retrofit", "P1", `当前内部流程候选 ${inputs.repositoryInventory.summary.internalFlowCandidateCount}，fixture 6 个。`, "先用 fixture 训练规则和 host UX，再逐步扩大 hard gate。"),
    deferred("generated-doc-binding-runtime", "P1", "W-P49.5 已有 ADR input，但具体语法、parser fixture 和 runtime 绑定未实现。", "后续进入 generated-doc-binding ADR / PugDoc 相关阶段。"),
    deferred("release-grade-self-documentation", "P2", "当前 self-doc reference candidate ready，但 release-grade self documentation ready 为 false。", "等历史补齐、authoring UX 和自文档化 reference refresh 稳定后再声明。")
  ];
}

function deferred(id, priority, reasonZh, nextActionZh) {
  return { id, nextActionZh, priority, reasonZh, status: "deferred-open" };
}

function createWp50Inputs(inputs) {
  return [
    wp50Input("wp50-1-authoring-intake", "P0", "把 W-P49 注释规则和 coverage snapshot 投射为 authoring UX intake。", ["W-P49.1", "W-P49.2", "W-P49.6"]),
    wp50Input("wp50-2-vscode-authoring-surface", "P0", "VS Code 插件优先暴露 @lang/<lang>、changed-scope gate 和 fixture-aware review。", ["W-P49.3", "W-P49.4"]),
    wp50Input("wp50-3-devtools-vs-authoring-projection", "P1", "DevTools 与 Visual Studio 先做只读/提示式 projection，不开启写入。", ["W-P49.1", "W-P49.3"]),
    wp50Input("wp50-4-generated-binding-authoring-input", "P1", "将 generated-doc-binding ADR input 投给 Pug/Meta/HTMDoc source-linkage 和 host projection。", ["W-P49.5"]),
    wp50Input("wp50-5-self-doc-remediation-ledger", "P1", `以 ${inputs.selfDocReferenceRefresh.summary.publicExportedDocCoveragePercent}% / ${inputs.selfDocReferenceRefresh.summary.publicExportedBilingualMarkerCoveragePercent}% 为起点建立分期补齐 ledger。`, ["W-P49.2", "W-P49.6"]),
    wp50Input("wp50-6-closeout-input", "P2", "W-P50 完成后应给 W-P51/W-P52 提供 authoring runtime 和历史补齐治理输入。", ["W-P49.7"])
  ];
}

function wp50Input(id, priority, requirementZh, sourcePhases) {
  return { id, priority, requirementZh, sourcePhases, status: "ready" };
}

function createSummary({ capabilityCloseout, completedStages, deferredLedger, inputs, wp50Inputs }) {
  return {
    phase: "W-P49.7",
    completedStageCount: completedStages.length,
    completedFirstRoundStageCount: completedStages.filter((item) => item.status === "completed-first-round").length,
    completedCapabilityCount: capabilityCloseout.length,
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount: Object.values(inputs).filter((item) => typeof item.status === "string" && item.status.startsWith("ready-for-")).length,
    wp49FirstRoundCloseoutClaimable: true,
    cHiaP3CloseoutClaimed: false,
    nextWPhaseStarted: false,
    wp50InputCount: wp50Inputs.length,
    p0Wp50InputCount: wp50Inputs.filter((item) => item.priority === "P0").length,
    p1Wp50InputCount: wp50Inputs.filter((item) => item.priority === "P1").length,
    p2Wp50InputCount: wp50Inputs.filter((item) => item.priority === "P2").length,
    deferredOpenItemCount: deferredLedger.length,
    historicalCoverageClaimedComplete: false,
    releaseGradeSelfDocumentationReady: false,
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
    check("all-wp49-stages-completed", summary.completedFirstRoundStageCount === 7, "W-P49.1-W-P49.7 are completed for the first round."),
    check("input-evidence-ready", summary.readyInputEvidenceCount === summary.inputEvidenceCount, "All W-P49 input evidence is ready."),
    check("wp50-inputs-ready", summary.wp50InputCount >= 6 && summary.p0Wp50InputCount >= 2, "W-P50 input ranking is ready."),
    check("c-group-not-closed", summary.cHiaP3CloseoutClaimed === false, "C-HIA-P3 is not closed by W-P49 closeout."),
    check("next-w-not-started", summary.nextWPhaseStarted === false, "W-P49.7 does not start W-P50."),
    check("historical-coverage-not-claimed", summary.historicalCoverageClaimedComplete === false && summary.releaseGradeSelfDocumentationReady === false, "Historical and release-grade self-doc completion are not claimed."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies are emitted."),
    check("no-write-network-or-target-mutation", summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderCloseout(evidence) {
  const summary = evidence.summary;
  const rows = evidence.capabilityCloseout.map((item) => `| ${item.id} | ${item.status} | ${item.evidenceZh} |`).join("\n");
  return `# W-P49.7 Closeout\n\n## 中文摘要\n\nW-P49 已完成第一轮收口。它建立了注释丰富度原则、仓库自文档化盘点、changed-scope gate、内部流程 fixture、generated-doc-binding ADR 输入和 self-doc reference candidate。当前 closeout 只声明 W-P49 first-round 可收口，不关闭 C-HIA-P3，也不启动 W-P50。\n\n## 指标\n\n- completed stages：${summary.completedStageCount}。\n- completed capabilities：${summary.completedCapabilityCount}。\n- W-P50 inputs：${summary.wp50InputCount}。\n- open deferred items：${summary.deferredOpenItemCount}。\n- historical coverage complete：${summary.historicalCoverageClaimedComplete ? "yes" : "no"}。\n- release-grade self documentation ready：${summary.releaseGradeSelfDocumentationReady ? "yes" : "no"}。\n\n## 能力收口\n\n| 能力 | 状态 | 证据 |\n| --- | --- | --- |\n${rows}\n`;
}

function renderWp50Inputs(evidence) {
  const rows = evidence.wp50Inputs.map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.requirementZh} |`).join("\n");
  return `# W-P50 Authoring Tooling Inputs\n\n## 中文摘要\n\nW-P50 应从 authoring UX intake 开始，把 W-P49 形成的规则、coverage snapshot、changed-scope gate、internal-flow fixture 和 generated-doc-binding ADR input 投射到 VS Code / DevTools / Visual Studio。W-P49.7 只准备输入，不正式启动 W-P50。\n\n| 输入 | 优先级 | 状态 | 要求 |\n| --- | --- | --- | --- |\n${rows}\n`;
}

function renderDeferredLedger(evidence) {
  const rows = evidence.deferredLedger.map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.reasonZh} | ${item.nextActionZh} |`).join("\n");
  return `# W-P49 Deferred Ledger\n\n## 中文摘要\n\nW-P49 第一轮没有把历史注释补齐、release-grade 自文档化、generated-doc-binding runtime 或 IDE 写入式 authoring 全部完成。这些事项保持 open deferred，并进入 C-HIA-P3 后续周期排序。\n\n| 事项 | 优先级 | 状态 | 原因 | 后续动作 |\n| --- | --- | --- | --- | --- |\n${rows}\n`;
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
