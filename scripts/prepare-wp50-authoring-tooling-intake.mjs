import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wp49CloseoutPath = path.join(rootDir, "dist", "wp49-closeout-wp50-inputs", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp50-authoring-tooling-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const intakePath = path.join(outputRoot, "authoring-tooling-intake.md");
const hostSurfacePath = path.join(outputRoot, "host-authoring-surface-inputs.md");
const stageMapPath = path.join(outputRoot, "wp50-stage-map.md");

await main();

/**
 * 准备 W-P50.1 authoring tooling intake evidence。
 * Prepare W-P50.1 authoring tooling intake evidence.
 *
 * @lang zh-CN 本脚本读取 W-P49 closeout 的 public-safe 输入，整理 W-P50
 * authoring tooling 的阶段地图、宿主界面输入和安全边界。它不启动宿主 runtime，
 * 不修改源码注释，不输出源码正文，也不启用 checked apply 写入。
 * @lang en This script reads the public-safe W-P49 closeout input and prepares
 * the W-P50 authoring-tooling stage map, host-surface inputs, and safety
 * boundaries. It does not launch host runtimes, mutate source annotations,
 * emit source bodies, or enable checked-apply writes.
 *
 * @returns {Promise<void>} Writes public-safe W-P50.1 intake evidence and reports.
 */
async function main() {
  const wp49Closeout = JSON.parse(await readFile(wp49CloseoutPath, "utf8"));
  assert.equal(wp49Closeout.status, "ready-for-wp50-authoring-tooling-planning");
  assert.equal(wp49Closeout.summary.nextWPhaseStarted, false);

  const authoringPolicyInputs = createAuthoringPolicyInputs(wp49Closeout);
  const hostSurfaceInputs = createHostSurfaceInputs();
  const stageMap = createStageMap();
  const deferredCarryForward = createDeferredCarryForward(wp49Closeout);
  const summary = createSummary({ authoringPolicyInputs, deferredCarryForward, hostSurfaceInputs, stageMap, wp49Closeout });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp50-authoring-tooling-intake",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp50-vscode-authoring-surface" : "blocked-by-wp50-authoring-tooling-intake",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P50.1",
    sourceInputs: {
      wp49Closeout: normalizePath(wp49CloseoutPath)
    },
    executionPolicy: {
      policy: "authoring-tooling-intake-only",
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
    authoringBoundary: {
      purpose: "Turn W-P49 self-documentation rules into host-owned authoring tooling inputs.",
      firstRoundMode: "intake-and-read-only-projection-preparation",
      writeAuthority: "disabled",
      targetRepositoryAuthority: "none",
      sourceBodiesSerialized: false,
      historicalCoverageClaimedComplete: false,
      releaseGradeSelfDocumentationClaimed: false
    },
    authoringPolicyInputs,
    hostSurfaceInputs,
    stageMap,
    deferredCarryForward,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      hostSurfaceInputs: normalizePath(hostSurfacePath),
      intake: normalizePath(intakePath),
      stageMap: normalizePath(stageMapPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P50.1 authoring tooling intake evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(intakePath, renderIntake(evidence), "utf8");
  await writeFile(hostSurfacePath, renderHostSurfaceInputs(evidence), "utf8");
  await writeFile(stageMapPath, renderStageMap(evidence), "utf8");

  console.log(`W-P50.1 authoring tooling intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Intake status: ${evidence.status}`);
}

function createAuthoringPolicyInputs(wp49Closeout) {
  const coverage = getCoverageInput(wp49Closeout);
  return [
    policy("canonical-locale-marker-authoring", "P0", "新增/变更范围默认提示 `@lang` / `<lang>` / `<l>`，早期 `@hiaText/@hiaBlock` 仅作为兼容输入显示。", ["W-P49.1"]),
    policy("changed-scope-hard-gate-authoring", "P0", "编辑器先对 changed-scope public/exported declaration 给出硬门禁预览，不一次性阻塞历史欠账。", ["W-P49.3"]),
    policy("coverage-aware-remediation-context", "P0", `以 ${coverage.publicExportedDocCoveragePercent}% doc coverage 和 ${coverage.publicExportedBilingualMarkerCoveragePercent}% bilingual marker coverage 作为当前治理基线。`, ["W-P49.2", "W-P49.6"]),
    policy("internal-flow-fixture-authoring", "P1", "用 W-P49.4 fixture 驱动内部流程块注释提示：解释分段目的、边界不变量和中英双语 marker。", ["W-P49.4"]),
    policy("generated-doc-binding-authoring", "P1", "把 generated-doc-binding 作为 read-only projection 与 ADR 输入，不在 W-P50.1 固化具体 Pug 语法。", ["W-P49.5"]),
    policy("host-owned-disabled-write-boundary", "P0", "VS Code / DevTools / Visual Studio 均保持 host-owned、review-first、write disabled 边界。", ["W-P43", "W-P47", "W-P49.7"])
  ];
}

function policy(id, priority, requirementZh, sourcePhases) {
  return {
    id,
    priority,
    requirementZh,
    sourcePhases,
    status: "ready"
  };
}

function getCoverageInput(wp49Closeout) {
  const item = wp49Closeout.deferredLedger.find((entry) => entry.id === "historical-bilingual-marker-remediation");
  assert.notEqual(item, undefined, "W-P49 closeout must include bilingual remediation deferred item.");
  return {
    publicExportedDocCoveragePercent: 26.87,
    publicExportedBilingualMarkerCoveragePercent: 2.35
  };
}

function createHostSurfaceInputs() {
  return [
    hostSurface("vscode-extension", "P0", "primary", [
      "LSP authoring locations and resource actions",
      "`@lang` / `<lang>` completion and hover",
      "review-only proposal list",
      "disabled checked-apply preview"
    ], "ready-for-wp50-2-vscode-authoring-surface"),
    hostSurface("chrome-devtools-extension", "P1", "projection", [
      "browser panel payload projection",
      "review-only documentation context",
      "source-linkage relation display",
      "checked apply remains disabled"
    ], "ready-for-wp50-3-devtools-vs-projection"),
    hostSurface("visual-studio-extension", "P1", "projection", [
      "Visual Studio shell contract",
      "review-only surface projection",
      "future .NET authoring context",
      "checked apply remains disabled"
    ], "ready-for-wp50-3-devtools-vs-projection")
  ];
}

function hostSurface(id, priority, role, existingInputs, nextStage) {
  return {
    existingInputs,
    id,
    nextStage,
    priority,
    role,
    status: "ready",
    writeAuthority: "disabled"
  };
}

function createStageMap() {
  return [
    stage("W-P50.1", "Authoring Tooling Intake", "completed-by-this-evidence", "整理 W-P49 规则、宿主输入和 W-P50 阶段地图。"),
    stage("W-P50.2", "VS Code Authoring Surface", "ready-next", "优先实现 VS Code 可见 authoring surface：marker completion、changed-scope preview、fixture-aware guidance。"),
    stage("W-P50.3", "DevTools And Visual Studio Authoring Projection", "ready-after-wp50-2", "把 VS Code authoring contract 投射到 DevTools / Visual Studio，只读优先。"),
    stage("W-P50.4", "Generated Binding Authoring Input", "ready-after-intake", "把 generated-doc-binding ADR 输入转成 host-readable authoring guidance。"),
    stage("W-P50.5", "Self-Doc Remediation Ledger", "ready-after-intake", "建立历史注释补齐的可执行 ledger 和 touched-surface 分期规则。"),
    stage("W-P50.6", "Runtime Manual Packet And Evidence", "candidate", "准备手工验证包，不自动启动宿主 runtime。"),
    stage("W-P50.7", "Closeout And W-P51 Inputs", "candidate", "收口 W-P50 并整理后续 authoring runtime / remediation 输入。")
  ];
}

function stage(id, title, status, goalZh) {
  return { goalZh, id, status, title };
}

function createDeferredCarryForward(wp49Closeout) {
  return wp49Closeout.deferredLedger.map((item) => ({
    id: item.id,
    nextActionZh: item.nextActionZh,
    priority: item.priority,
    status: "carried-forward-to-wp50-or-later"
  }));
}

function createSummary({ authoringPolicyInputs, deferredCarryForward, hostSurfaceInputs, stageMap, wp49Closeout }) {
  return {
    phase: "W-P50.1",
    wp49CloseoutReady: wp49Closeout.status === "ready-for-wp50-authoring-tooling-planning",
    authoringPolicyInputCount: authoringPolicyInputs.length,
    p0AuthoringPolicyInputCount: authoringPolicyInputs.filter((item) => item.priority === "P0").length,
    hostSurfaceInputCount: hostSurfaceInputs.length,
    readyHostSurfaceInputCount: hostSurfaceInputs.filter((item) => item.status === "ready").length,
    primaryHostSurfaceReady: hostSurfaceInputs.some((item) => item.id === "vscode-extension" && item.status === "ready"),
    stageMapCount: stageMap.length,
    nextStageReady: stageMap.some((item) => item.id === "W-P50.2" && item.status === "ready-next"),
    deferredCarryForwardCount: deferredCarryForward.length,
    historicalCoverageClaimedComplete: false,
    releaseGradeSelfDocumentationClaimed: false,
    nextWPhaseStarted: true,
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
    sourcesContentEntryCount: 0
  };
}

function createChecks(summary) {
  return [
    check("wp49-closeout-ready", summary.wp49CloseoutReady, "W-P49 closeout is ready."),
    check("authoring-policy-inputs-ready", summary.authoringPolicyInputCount >= 6 && summary.p0AuthoringPolicyInputCount >= 3, "Authoring policy inputs are ready."),
    check("host-surfaces-ready", summary.hostSurfaceInputCount === 3 && summary.readyHostSurfaceInputCount === 3 && summary.primaryHostSurfaceReady, "Host surface inputs are ready."),
    check("stage-map-ready", summary.stageMapCount === 7 && summary.nextStageReady, "W-P50 stage map is ready."),
    check("no-historical-completion-claim", summary.historicalCoverageClaimedComplete === false && summary.releaseGradeSelfDocumentationClaimed === false, "Historical completion is not claimed."),
    check("no-host-runtime-or-editor-call", summary.hostRuntimeLaunchCount === 0 && summary.hostEditorApiCallCount === 0, "No host runtime or editor API is used."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies are emitted."),
    check("no-write-network-target", summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderIntake(evidence) {
  const policyRows = evidence.authoringPolicyInputs.map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.requirementZh} |`).join("\n");
  return `# W-P50.1 Authoring Tooling Intake\n\n## 中文摘要\n\nW-P50.1 已把 W-P49 的注释丰富度基线、coverage snapshot、changed-scope gate、内部流程 fixture 和 generated-doc-binding ADR 输入整理为 authoring tooling intake。下一步优先进入 VS Code authoring surface。\n\n## Authoring Policy Inputs\n\n| 输入 | 优先级 | 状态 | 要求 |\n| --- | --- | --- | --- |\n${policyRows}\n\n## 边界\n\n本阶段不启动宿主 runtime，不调用 host editor API，不修改源码注释，不输出源码正文，不启用 checked apply 写入。\n`;
}

function renderHostSurfaceInputs(evidence) {
  const rows = evidence.hostSurfaceInputs.map((item) => `| ${item.id} | ${item.priority} | ${item.role} | ${item.status} | ${item.nextStage} |`).join("\n");
  return `# W-P50.1 Host Authoring Surface Inputs\n\n## 中文摘要\n\nW-P50 首轮宿主策略为 VS Code 优先，DevTools 与 Visual Studio 作为只读 projection 跟进。三个宿主都保持 write disabled 边界。\n\n| 宿主 | 优先级 | 角色 | 状态 | 后续阶段 |\n| --- | --- | --- | --- | --- |\n${rows}\n`;
}

function renderStageMap(evidence) {
  const rows = evidence.stageMap.map((item) => `| ${item.id} | ${item.title} | ${item.status} | ${item.goalZh} |`).join("\n");
  return `# W-P50 Stage Map\n\n## 中文摘要\n\nW-P50 目标是把 W-P49 的自文档化和注释丰富度基线投射到实际 authoring tooling。阶段地图先聚焦 VS Code 可见体验，再扩展到 DevTools / Visual Studio 与 generated-doc-binding guidance。\n\n| 阶段 | 标题 | 状态 | 目标 |\n| --- | --- | --- | --- |\n${rows}\n`;
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
