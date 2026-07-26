import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp48-c-hia-p3-input-prioritization");
const evidencePath = path.join(outputRoot, "evidence.json");
const priorityMatrixPath = path.join(outputRoot, "c-hia-p3-input-priority-matrix.md");
const nextCycleSeedPath = path.join(outputRoot, "next-cycle-seed-candidates.md");
const finalCloseoutInputPath = path.join(outputRoot, "wp48-final-closeout-inputs.md");

const closeoutCandidatePath = path.join(rootDir, "dist", "wp48-c-hia-p2-closeout-candidate", "evidence.json");

await main();

/**
 * 生成 W-P48.6 C-HIA-P3 输入优先级 evidence。
 * Generate W-P48.6 C-HIA-P3 input prioritization evidence.
 *
 * 中文：本脚本只把 W-P48.5 closeout candidate 中的后续输入排序，形成
 * C-HIA-P3 / 后续周期的候选种子。它不启动新的 W-P、不创建目标项目分支、
 * 不触发 checked apply、不执行 provider/network，也不把 open-deferred gate
 * 标记为已关闭。
 *
 * English: This script only ranks downstream inputs from the W-P48.5 closeout
 * candidate into candidate seeds for C-HIA-P3 and later cycles. It does not
 * start a new W-P cycle, create target branches, trigger checked apply, execute
 * provider/network calls, or mark open-deferred gates as closed.
 *
 * @returns {Promise<void>} Writes public-safe W-P48.6 evidence and reports.
 */
async function main() {
  const closeoutCandidate = await readJson(closeoutCandidatePath);
  const priorityMatrix = createPriorityMatrix(closeoutCandidate);
  const nextCycleSeeds = createNextCycleSeeds(priorityMatrix);
  const finalCloseoutInputs = createFinalCloseoutInputs(priorityMatrix, nextCycleSeeds);
  const summary = summarize({ closeoutCandidate, finalCloseoutInputs, nextCycleSeeds, priorityMatrix });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P48.6 input prioritization has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp48-c-hia-p3-input-prioritization",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp48-final-closeout-and-next-cycle-inputs",
    cycleGroupId: "C-HIA-P2",
    phase: "W-P48.6",
    sourceEvidence: {
      wp48CloseoutCandidate: normalizePath(closeoutCandidatePath)
    },
    executionPolicy: {
      policy: "input-prioritization-only",
      hiaMayCallHostEditorApi: false,
      hiaMayCreateBranchOrPullRequest: false,
      hiaMayCreateSandbox: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayStartNextWPCycle: false,
      hiaMayTriggerCheckedApply: false,
      mayCloseDeferredGates: false,
      mayClaimFinalCycleGroupCloseout: false,
      sourcesContentPolicy: "none"
    },
    priorityMatrix,
    nextCycleSeeds,
    finalCloseoutInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      finalCloseoutInputs: normalizePath(finalCloseoutInputPath),
      nextCycleSeeds: normalizePath(nextCycleSeedPath),
      priorityMatrix: normalizePath(priorityMatrixPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P48.6 C-HIA-P3 input prioritization evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(priorityMatrixPath, renderPriorityMatrix(evidence), "utf8");
  await writeFile(nextCycleSeedPath, renderNextCycleSeeds(evidence), "utf8");
  await writeFile(finalCloseoutInputPath, renderFinalCloseoutInputs(evidence), "utf8");

  console.log(`W-P48 C-HIA-P3 input prioritization evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P48 priority matrix prepared at ${normalizePath(priorityMatrixPath)}`);
  console.log(`W-P48 final closeout inputs prepared at ${normalizePath(finalCloseoutInputPath)}`);
}

/**
 * 从 closeout candidate 创建后续输入优先级矩阵。
 * Create the downstream input priority matrix from the closeout candidate.
 *
 * @param {any} closeoutCandidate W-P48.5 evidence.
 * @returns {Record<string, unknown>} Priority matrix.
 */
function createPriorityMatrix(closeoutCandidate) {
  const deferredGateCount = closeoutCandidate.summary.openDeferredGateGroupCount;
  const items = [
    priorityItem({
      id: "self-documentation-quality-cycle",
      title: "本项目自文档化与中英注释质量周期",
      titleEn: "Self-documentation and bilingual code-comment quality cycle",
      priority: "P0",
      source: "user-standing-requirement",
      rationale: "项目自身后续会用 HIA 工具链反哺文档化；代码注释充分度、准确度和中英一致性已经成为长期规则。",
      nextWorkShape: "安排 1-2 个专门周期梳理代码、补齐 public/exported API 注释、建立自身文档化 evidence。",
      ownerBoundary: "hia-maintainer-owned",
      blockedByOpenDeferredGate: false
    }),
    priorityItem({
      id: "ide-devtools-authoring-surfaces",
      title: "IDE/DevTools 文档注释编辑与查看体验",
      titleEn: "IDE and DevTools documentation authoring surfaces",
      priority: "P0",
      source: "host-runtime-and-user-priority",
      rationale: "IDE/DevTools 是人类手写注释、审查 AI 建议和查看源关联文档的关键入口。",
      nextWorkShape: "继续推进 VS Code、Chrome DevTools、Visual Studio 三宿主的 authoring、review、source-linkage 与 read-only projection。",
      ownerBoundary: "host-owned",
      blockedByOpenDeferredGate: false
    }),
    priorityItem({
      id: "visual-studio-dedicated-plugin-baseline",
      title: "Visual Studio 专用插件基线",
      titleEn: "Visual Studio dedicated plugin baseline",
      priority: "P0",
      source: "user-standing-requirement",
      rationale: "VS 插件必须作为专项重点处理，且位置应保持在 main-repo/apps 下。",
      nextWorkShape: "审计 VS Extensibility / VSSDK 路线，建立最小插件壳、命令入口、LSP/contract 消费边界与手工验证清单。",
      ownerBoundary: "host-owned",
      blockedByOpenDeferredGate: false
    }),
    priorityItem({
      id: "generated-doc-binding-pug-sourcemap",
      title: "生成式模板文档绑定与 Pug 一对多映射",
      titleEn: "Generated template documentation binding and Pug one-to-many mapping",
      priority: "P1",
      source: "generated-doc-binding-backlog",
      rationale: "Pug 等生成式 DSL 需要把源注释、变量、生成产物和 doc-source-map 关联起来，否则 HTMDoc 难以覆盖真实工程。",
      nextWorkShape: "先做 ADR 和 fixture，推敲 annotation 名称、变量 sigil、binding scope、doc-source-map extension，再进入 hia-pugdoc 实现。",
      ownerBoundary: "hia-satellite-and-core-contract-owned",
      blockedByOpenDeferredGate: false
    }),
    priorityItem({
      id: "target-owner-adoption-report-trial",
      title: "目标项目 owner evidence 真实试用",
      titleEn: "Target-owner evidence real adoption trial",
      priority: "P1",
      source: "wp46-wp48-open-deferred-gate",
      rationale: "W-P46 已准备 metadata-only intake，但真实 target-owner report 仍为 0。",
      nextWorkShape: "由目标项目主动消费中心通知并提交 public-safe owner evidence；HIA 只验证 packet、redaction 与边界。",
      ownerBoundary: "target-owner-owned",
      blockedByOpenDeferredGate: true
    }),
    priorityItem({
      id: "checked-apply-real-write-pilot",
      title: "checked apply 真实写入试点",
      titleEn: "Checked apply real write pilot",
      priority: "P1",
      source: "wp47-open-deferred-gate",
      rationale: "W-P47 已完成 envelope、preflight、rollback、confirmation 与 report intake，但真实 write 仍禁用。",
      nextWorkShape: "在更窄 host-owned pilot 中重新授权 final confirmation、repeat conflict check、host editor API 和 rollback/formatter/post-validation。",
      ownerBoundary: "host-and-target-owner-owned",
      blockedByOpenDeferredGate: true
    }),
    priorityItem({
      id: "real-provider-network-gate",
      title: "真实 provider/network gate",
      titleEn: "Real provider/network gate",
      priority: "P2",
      source: "wp45-open-deferred-gate",
      rationale: "W-P45 已固定 provider identity、secret reference、request preview 和 blocked-before-network result，但未进行真实网络调用。",
      nextWorkShape: "在 host-mediated secret/network/final consent 模型成熟后，单独开启极小 smoke gate，不与目标项目写入合并。",
      ownerBoundary: "host-owned",
      blockedByOpenDeferredGate: true
    }),
    priorityItem({
      id: "release-grade-runtime-capture-archive",
      title: "release-grade runtime capture archive",
      titleEn: "Release-grade runtime capture archive",
      priority: "P2",
      source: "wp44-open-deferred-gate",
      rationale: "W-P44 的手工 runtime capture 是 public-safe observation，不是可发布归档。",
      nextWorkShape: "建立 release-grade capture 包、截图/转录脱敏、复测记录和保留策略；Visual Studio 实现完成后再统一归档。",
      ownerBoundary: "host-and-maintainer-owned",
      blockedByOpenDeferredGate: true
    })
  ];

  return {
    contract: "hia-c-hia-p3-input-priority-matrix",
    contractVersion: "0.1.0-draft",
    matrixStatus: "ready-for-final-closeout-inputs",
    candidateSourceStatus: closeoutCandidate.status,
    deferredGateGroupCount: deferredGateCount,
    items,
    priorityOrder: ["P0", "P1", "P2"],
    mayStartNextCycleNow: false,
    nextCycleRequiresUserConfirmation: true
  };
}

function priorityItem({
  blockedByOpenDeferredGate,
  id,
  nextWorkShape,
  ownerBoundary,
  priority,
  rationale,
  source,
  title,
  titleEn
}) {
  return {
    id,
    title,
    titleEn,
    priority,
    source,
    rationale,
    nextWorkShape,
    ownerBoundary,
    blockedByOpenDeferredGate,
    grantsExecutionNow: false,
    grantsWriteNow: false,
    grantsTargetMutationNow: false,
    grantsProviderNetworkNow: false,
    mayIncludeSourceBodies: false
  };
}

function createNextCycleSeeds(priorityMatrix) {
  const groups = [
    {
      id: "c-hia-p3-self-doc-and-authoring",
      status: "candidate-seed",
      recommendedPriority: "P0",
      includes: priorityMatrix.items.filter((item) => item.priority === "P0").map((item) => item.id),
      note: "适合作为下一周期组候选主题，但 W-P48.6 不直接启动该周期组。"
    },
    {
      id: "c-hia-p3-generated-binding-and-adoption",
      status: "candidate-seed",
      recommendedPriority: "P1",
      includes: priorityMatrix.items.filter((item) => item.priority === "P1").map((item) => item.id),
      note: "适合在 P0 基线后进入，尤其要先完成生成式文档绑定 ADR 与 target-owner evidence 真实试用边界。"
    },
    {
      id: "later-real-execution-hardening",
      status: "candidate-seed",
      recommendedPriority: "P2",
      includes: priorityMatrix.items.filter((item) => item.priority === "P2").map((item) => item.id),
      note: "真实 provider/network 与 release-grade runtime archive 风险较高，应单独窄门推进。"
    }
  ];
  return {
    contract: "hia-wp48-next-cycle-seed-candidates",
    contractVersion: "0.1.0-draft",
    seedStatus: "ready-for-wp48-final-closeout",
    groups
  };
}

function createFinalCloseoutInputs(priorityMatrix, nextCycleSeeds) {
  return {
    contract: "hia-wp48-final-closeout-inputs",
    contractVersion: "0.1.0-draft",
    nextStage: "W-P48.7 Final Closeout And Next Cycle Inputs",
    items: [
      {
        id: "closeout-candidate-and-priority-matrix",
        status: "ready-for-wp48-7",
        description: `Carry ${priorityMatrix.items.length} prioritized C-HIA-P3 inputs and ${nextCycleSeeds.groups.length} next-cycle seed groups into final closeout.`
      },
      {
        id: "deferred-gates-still-open",
        status: "ready-for-wp48-7",
        description: "Keep real provider/network, target-owner execution, checked apply write and release-grade runtime capture as open-deferred."
      },
      {
        id: "user-confirmation-before-next-wp-group",
        status: "ready-for-wp48-7",
        description: "Do not automatically start multiple different W-P cycles; final closeout may propose the next group, but user confirmation is required before crossing cycles."
      }
    ],
    readyForFinalCloseout: true
  };
}

function summarize({ closeoutCandidate, finalCloseoutInputs, nextCycleSeeds, priorityMatrix }) {
  const serialized = JSON.stringify({ finalCloseoutInputs, nextCycleSeeds, priorityMatrix });
  return {
    phase: "W-P48.6",
    inputEvidenceCount: 1,
    readyInputEvidenceCount: isReadyEvidence(closeoutCandidate) ? 1 : 0,
    inputHardFailureCount: number(closeoutCandidate.summary?.hardFailureCount),
    priorityItemCount: priorityMatrix.items.length,
    p0ItemCount: priorityMatrix.items.filter((item) => item.priority === "P0").length,
    p1ItemCount: priorityMatrix.items.filter((item) => item.priority === "P1").length,
    p2ItemCount: priorityMatrix.items.filter((item) => item.priority === "P2").length,
    blockedByOpenDeferredGateCount: priorityMatrix.items.filter((item) => item.blockedByOpenDeferredGate === true).length,
    nextCycleSeedGroupCount: nextCycleSeeds.groups.length,
    readyForFinalCloseout: finalCloseoutInputs.readyForFinalCloseout === true,
    mayStartNextCycleNow: priorityMatrix.mayStartNextCycleNow,
    nextCycleRequiresUserConfirmation: priorityMatrix.nextCycleRequiresUserConfirmation,
    finalCloseoutMayBeClaimed: false,
    closedDeferredGateCount: number(closeoutCandidate.summary?.closedDeferredGateCount),
    checkedApplyWriteEnabledCount: number(closeoutCandidate.summary?.checkedApplyWriteEnabledCount),
    hostEditorApiCallCount: number(closeoutCandidate.summary?.hostEditorApiCallCount),
    checkedApplyTriggeredCount: number(closeoutCandidate.summary?.checkedApplyTriggeredCount),
    workspaceWriteAllowedCount: number(closeoutCandidate.summary?.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: number(closeoutCandidate.summary?.targetRepositoryMutationCount),
    targetCommandExecutedByHiaCount: number(closeoutCandidate.summary?.targetCommandExecutedByHiaCount),
    providerNetworkExecutedCount: number(closeoutCandidate.summary?.providerNetworkExecutedCount),
    externalNetworkCallExecutedCount: number(closeoutCandidate.summary?.externalNetworkCallExecutedCount),
    sourceBodyIncludedCount: number(closeoutCandidate.summary?.sourceBodyIncludedCount),
    sourceTextIncludedCount: number(closeoutCandidate.summary?.sourceTextIncludedCount),
    requestBodyIncludedCount: number(closeoutCandidate.summary?.requestBodyIncludedCount),
    responseBodyIncludedCount: number(closeoutCandidate.summary?.responseBodyIncludedCount),
    secretValueIncludedCount: number(closeoutCandidate.summary?.secretValueIncludedCount),
    digestValueIncludedCount: number(closeoutCandidate.summary?.digestValueIncludedCount),
    localAbsolutePathDetectedCount: sum([
      closeoutCandidate.summary?.localAbsolutePathDetectedCount,
      countPathExposure(serialized)
    ]),
    credentialMaterialMarkerCount: sum([
      closeoutCandidate.summary?.credentialMaterialMarkerCount,
      countCredentialMarkers(serialized)
    ]),
    sourcesContentMarkerCount: sum([
      closeoutCandidate.summary?.sourcesContentMarkerCount,
      /"sourcesContent"\s*:/iu.test(serialized) ? 1 : 0
    ]),
    sourcesContentPolicy: "none",
    nextStage: finalCloseoutInputs.nextStage
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP48_6_INPUT_READY", summary.inputEvidenceCount === 1
      && summary.readyInputEvidenceCount === 1
      && summary.inputHardFailureCount === 0),
    check("HIA_WP48_6_PRIORITY_MATRIX_READY", summary.priorityItemCount >= 8
      && summary.p0ItemCount >= 3
      && summary.p1ItemCount >= 2
      && summary.p2ItemCount >= 2
      && summary.nextCycleSeedGroupCount === 3),
    check("HIA_WP48_6_NO_CYCLE_CROSSING", summary.mayStartNextCycleNow === false
      && summary.nextCycleRequiresUserConfirmation === true
      && summary.nextStage === "W-P48.7 Final Closeout And Next Cycle Inputs"),
    check("HIA_WP48_6_DEFERRED_GATES_STAY_OPEN", summary.closedDeferredGateCount === 0
      && summary.finalCloseoutMayBeClaimed === false
      && summary.blockedByOpenDeferredGateCount >= 4),
    check("HIA_WP48_6_NO_EXECUTION_OR_WRITE", summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0),
    check("HIA_WP48_6_PRIVACY_CLEAN", summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0
      && summary.sourcesContentPolicy === "none"),
    check("HIA_WP48_6_FINAL_CLOSEOUT_INPUT_READY", summary.readyForFinalCloseout === true)
  ];
}

function renderPriorityMatrix(evidence) {
  const rows = evidence.priorityMatrix.items
    .map((item) => `| ${item.priority} | ${item.id} | ${item.title} | ${item.ownerBoundary} | ${yesNo(item.blockedByOpenDeferredGate)} | ${item.nextWorkShape} |`)
    .join("\n");
  return `# C-HIA-P3 Input Priority Matrix

## 中文摘要

W-P48.6 将 C-HIA-P3 / 后续周期输入分为 P0、P1、P2。P0 优先处理本项目自文档化质量、IDE/DevTools 注释编辑体验与 Visual Studio 专用插件基线；P1 处理生成式文档绑定、target-owner evidence 真实试用与 checked apply 真实写入试点；P2 处理真实 provider/network gate 与 release-grade runtime archive。

| Priority | Input | 中文标题 | Owner boundary | Blocked by open deferred gate | Next work shape |
| --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderNextCycleSeeds(evidence) {
  const rows = evidence.nextCycleSeeds.groups
    .map((item) => `| ${item.recommendedPriority} | ${item.id} | ${item.status} | ${item.includes.join(", ")} | ${item.note} |`)
    .join("\n");
  return `# Next Cycle Seed Candidates

## 中文摘要

这些是 W-P48.7 可交付给用户确认的下一周期候选种子。W-P48.6 不直接启动新的 W-P 或周期组。

| Priority | Seed | Status | Includes | Note |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderFinalCloseoutInputs(evidence) {
  const rows = evidence.finalCloseoutInputs.items
    .map((item) => `| ${item.id} | ${item.status} | ${item.description} |`)
    .join("\n");
  return `# W-P48 Final Closeout Inputs

## 中文摘要

W-P48.7 应基于 closeout candidate 与本优先级矩阵做最终收口。真实执行 gate 仍保持 open-deferred，跨入下一个 W-P 组前需要用户确认。

| Input | Status | Description |
| --- | --- | --- |
${rows}
`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isReadyEvidence(value) {
  return typeof value?.status === "string" && value.status.startsWith("ready-for-");
}

function check(id, condition) {
  return {
    id,
    status: condition ? "pass" : "fail"
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function number(value) {
  return Number.isFinite(value) ? value : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function countPathExposure(value) {
  return /[A-Z]:\\|[A-Z]:\/|\\\\|\/Users\//u.test(value) ? 1 : 0;
}

function countCredentialMarkers(value) {
  return /sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|npm_[A-Za-z0-9]|BEGIN [A-Z ]*PRIVATE KEY/u.test(value) ? 1 : 0;
}

function assertNoPrivateMarkers(value, label) {
  assert.equal(countPathExposure(value), 0, `${label} contains a local path marker.`);
  assert.equal(countCredentialMarkers(value), 0, `${label} contains a credential-like marker.`);
  assert.equal(/"sourcesContent"\s*:/iu.test(value), false, `${label} contains sourcesContent.`);
}
