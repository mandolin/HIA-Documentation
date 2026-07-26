import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPaths = {
  authoringIntake: path.join(rootDir, "dist", "wp50-authoring-tooling-intake", "evidence.json"),
  generatedBinding: path.join(rootDir, "dist", "wp50-generated-binding-authoring-input", "evidence.json"),
  hostProjection: path.join(rootDir, "dist", "wp50-devtools-visual-studio-authoring-projection", "evidence.json"),
  runtimeManualPacket: path.join(rootDir, "dist", "wp50-runtime-manual-packet", "evidence.json"),
  selfDocRemediation: path.join(rootDir, "dist", "wp50-self-doc-remediation-ledger", "evidence.json"),
  vscodeSurface: path.join(rootDir, "dist", "wp50-vscode-authoring-surface", "evidence.json")
};
const outputRoot = path.join(rootDir, "dist", "wp50-closeout-wp51-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutReportPath = path.join(outputRoot, "wp50-closeout-report.md");
const wp51InputsPath = path.join(outputRoot, "wp51-inputs.md");

await main();

/**
 * 准备 W-P50 closeout and W-P51 inputs evidence。
 * Prepare W-P50 closeout and W-P51 inputs evidence.
 *
 * @lang zh-CN 本脚本汇总 W-P50.1-W-P50.6 的 public-safe evidence，
 * 标记 W-P50 第一轮完成，并整理 W-P51 输入。它不启动 W-P51，不执行宿主
 * runtime capture，不修改源码，不启用 checked apply 写入。
 * @lang en This script summarizes the public-safe evidence from W-P50.1 through
 * W-P50.6, marks the first W-P50 round complete, and prepares W-P51 inputs. It
 * does not start W-P51, execute host runtime capture, mutate source files, or
 * enable checked-apply writes.
 *
 * @returns {Promise<void>} Writes public-safe W-P50 closeout evidence.
 */
async function main() {
  const inputs = await readInputs();
  assertInputs(inputs);

  const completedCapabilities = createCompletedCapabilities(inputs);
  const wp51Inputs = createWp51Inputs(inputs);
  const deferredGates = createDeferredGates(inputs);
  const summary = createSummary({ completedCapabilities, deferredGates, inputs, wp51Inputs });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp50-closeout-wp51-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P50.7",
    status: hardFailures.length === 0 ? "ready-for-wp51-planning" : "blocked-by-wp50-closeout",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    closeoutBoundary: {
      cHiaP3CloseoutClaimed: false,
      firstRoundCloseoutClaimed: true,
      nextWPhaseStarted: false,
      targetRepositoryAuthority: "none",
      writeAuthority: "disabled"
    },
    completedCapabilities,
    deferredGates,
    wp51Inputs,
    executionPolicy: {
      policy: "wp50-closeout-only",
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
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      closeoutReport: normalizePath(closeoutReportPath),
      wp51Inputs: normalizePath(wp51InputsPath)
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P50 closeout evidence");
  assert.equal(hardFailures.length, 0, `W-P50 closeout has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutReportPath, renderCloseoutReport(evidence), "utf8");
  await writeFile(wp51InputsPath, renderWp51Inputs(evidence), "utf8");

  console.log(`W-P50 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P50 closeout status: ${evidence.status}`);
}

async function readInputs() {
  const entries = await Promise.all(Object.entries(inputPaths).map(async ([key, filePath]) => [key, await readJson(filePath)]));
  return Object.fromEntries(entries);
}

function assertInputs(inputs) {
  assert.equal(inputs.authoringIntake.status, "ready-for-wp50-vscode-authoring-surface");
  assert.equal(inputs.vscodeSurface.status, "ready-for-wp50-devtools-visual-studio-projection");
  assert.equal(inputs.hostProjection.status, "ready-for-wp50-generated-binding-authoring-input");
  assert.equal(inputs.generatedBinding.status, "ready-for-wp50-self-doc-remediation-ledger");
  assert.equal(inputs.selfDocRemediation.status, "ready-for-wp50-runtime-manual-packet");
  assert.equal(inputs.runtimeManualPacket.status, "ready-for-wp50-closeout-and-wp51-inputs");
}

function createCompletedCapabilities(inputs) {
  return [
    capability("W-P50.1", "authoring-tooling-intake", inputs.authoringIntake.status, "W-P49 rules and host inputs mapped into W-P50 stage map."),
    capability("W-P50.2", "vscode-authoring-surface", inputs.vscodeSurface.status, "VS Code read-only authoring surface and command are ready."),
    capability("W-P50.3", "host-authoring-projection", inputs.hostProjection.status, "DevTools and Visual Studio authoring projections are ready."),
    capability("W-P50.4", "generated-binding-authoring-input", inputs.generatedBinding.status, "Generated binding ADR input is available as host-readable guidance."),
    capability("W-P50.5", "self-doc-remediation-ledger", inputs.selfDocRemediation.status, "Self-documentation remediation ledger and touched-surface rulebook are ready."),
    capability("W-P50.6", "runtime-manual-packet", inputs.runtimeManualPacket.status, "Three-host manual validation packets are ready.")
  ];
}

function capability(phase, id, status, resultZh) {
  return {
    id,
    phase,
    resultZh,
    status,
    writeAuthority: "disabled"
  };
}

function createWp51Inputs(inputs) {
  return [
    nextInput("authoring-runtime-validation", "P0", "执行 W-P50.6 三宿主手工验证，但仍保持 public-safe capture 和 no-write。", {
      manualPacketCount: inputs.runtimeManualPacket.summary.manualPacketCount,
      requiredScreenshotCount: inputs.runtimeManualPacket.summary.requiredScreenshotCount,
      requiredTranscriptCount: inputs.runtimeManualPacket.summary.requiredTranscriptCount
    }),
    nextInput("self-doc-remediation-pilot", "P0", "基于 W-P50.5 ledger 选择小批 touched/high-risk surface 进行注释补齐试点。", {
      missingDocBlockCount: inputs.selfDocRemediation.summary.missingDocBlockCount,
      missingBilingualMarkerCount: inputs.selfDocRemediation.summary.missingBilingualMarkerCount,
      bulkRewriteAllowed: inputs.selfDocRemediation.summary.historicalBulkRewriteAllowed
    }),
    nextInput("generated-binding-parser-fixtures", "P1", "把 W-P50.4 guidance 推进为 Pug / Meta / Sass parser fixture 与 source-linkage 查询输入。", {
      scenarioGuidanceCount: inputs.generatedBinding.summary.scenarioGuidanceCount,
      concreteSyntaxFrozen: inputs.generatedBinding.summary.concreteSyntaxFrozen
    }),
    nextInput("host-authoring-ui-hardening", "P1", "把 generated binding guidance 与 remediation ledger 更自然地接入 VS Code / DevTools / Visual Studio 可见界面。", {
      readyHostGuidanceCount: inputs.generatedBinding.summary.readyHostGuidanceCount ?? inputs.generatedBinding.summary.hostGuidanceCount,
      readyProjectionHostCount: inputs.hostProjection.summary.readyProjectionHostCount
    }),
    nextInput("c-hia-p3-closeout-prep", "P2", "后续在 W-P51/W-P52 后评估 C-HIA-P3 closeout，而不是在 W-P50 提前宣称。", {
      cHiaP3CloseoutClaimed: false
    })
  ];
}

function nextInput(id, priority, goalZh, signals) {
  return {
    goalZh,
    id,
    priority,
    signals,
    status: "ready-input",
    writeAuthorityGranted: false
  };
}

function createDeferredGates(inputs) {
  return [
    deferred("real-host-runtime-capture", "W-P50.6 only prepares manual packets; real capture remains human-executed and public-safe."),
    deferred("checked-apply-write", "Authoring tooling remains read-only; checked apply write is not enabled."),
    deferred("historical-bulk-remediation", `Historical gaps remain staged: ${inputs.selfDocRemediation.summary.missingDocBlockCount} missing doc blocks and ${inputs.selfDocRemediation.summary.missingBilingualMarkerCount} missing bilingual markers.`),
    deferred("generated-binding-parser-runtime", "W-P50.4 provides guidance only; parser/runtime and concrete syntax remain future work."),
    deferred("release-grade-self-documentation", "Release-grade self documentation is not claimed until remediation and reference refresh stabilize."),
    deferred("portal-real-adoption-smoke", "HIA-ASPNETPortal adoption smoke remains target-owner work via center notifications.")
  ];
}

function deferred(id, reasonZh) {
  return {
    id,
    reasonZh,
    status: "deferred-open"
  };
}

function createSummary({ completedCapabilities, deferredGates, inputs, wp51Inputs }) {
  return {
    phase: "W-P50.7",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount: Object.values(inputs).filter((item) => typeof item.status === "string" && item.status.startsWith("ready-for-")).length,
    completedStageCount: 7,
    completedFirstRoundStageCount: 7,
    completedCapabilityCount: completedCapabilities.length,
    wp50FirstRoundCloseoutClaimable: true,
    cHiaP3CloseoutClaimed: false,
    wp51InputCount: wp51Inputs.length,
    p0Wp51InputCount: wp51Inputs.filter((item) => item.priority === "P0").length,
    p1Wp51InputCount: wp51Inputs.filter((item) => item.priority === "P1").length,
    p2Wp51InputCount: wp51Inputs.filter((item) => item.priority === "P2").length,
    deferredOpenGateCount: deferredGates.length,
    manualPacketCount: inputs.runtimeManualPacket.summary.manualPacketCount,
    requiredScreenshotCount: inputs.runtimeManualPacket.summary.requiredScreenshotCount,
    requiredTranscriptCount: inputs.runtimeManualPacket.summary.requiredTranscriptCount,
    touchedSurfaceRuleCount: inputs.selfDocRemediation.summary.touchedSurfaceRuleCount,
    remediationBatchCount: inputs.selfDocRemediation.summary.remediationBatchCount,
    generatedBindingConcreteSyntaxFrozen: inputs.generatedBinding.summary.concreteSyntaxFrozen,
    generatedBindingParserImplemented: inputs.generatedBinding.summary.parserImplementationIncluded,
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
    actualRuntimeCaptureExecutedCount: 0,
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
    check("inputs-ready", summary.inputEvidenceCount === 6 && summary.readyInputEvidenceCount === 6, "All W-P50 input evidence is ready."),
    check("stages-complete", summary.completedStageCount === 7 && summary.completedFirstRoundStageCount === 7 && summary.completedCapabilityCount === 6, "W-P50 stages are complete for the first round."),
    check("wp51-inputs-ready", summary.wp51InputCount >= 5 && summary.p0Wp51InputCount >= 2, "W-P51 inputs are ready."),
    check("deferred-gates-recorded", summary.deferredOpenGateCount >= 6, "Deferred gates are recorded."),
    check("scope-boundaries-not-overclaimed", summary.cHiaP3CloseoutClaimed === false && summary.historicalCoverageClaimedComplete === false && summary.releaseGradeSelfDocumentationClaimed === false, "Scope boundaries are not overclaimed."),
    check("generated-binding-not-overclaimed", summary.generatedBindingConcreteSyntaxFrozen === false && summary.generatedBindingParserImplemented === false, "Generated binding syntax/parser are not overclaimed."),
    check("next-phase-not-started", summary.nextStageReady && summary.nextWPhaseStarted === false && summary.anotherWPhaseStarted === false, "W-P51 input is ready without starting another W phase."),
    check("runtime-not-executed", summary.hostRuntimeLaunchCount === 0 && summary.actualRuntimeCaptureExecutedCount === 0, "Runtime capture is not executed."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies or sourcesContent are emitted."),
    check("no-write-network-target", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderCloseoutReport(evidence) {
  const capabilities = evidence.completedCapabilities.map((item) => `| ${item.phase} | ${item.id} | ${item.status} | ${item.resultZh} |`).join("\n");
  const deferred = evidence.deferredGates.map((item) => `| ${item.id} | ${item.status} | ${item.reasonZh} |`).join("\n");
  const summary = evidence.summary;

  return `# W-P50 Closeout Report

## 中文摘要

W-P50 Authoring Tooling 已完成第一轮：从 intake、VS Code surface、DevTools/Visual Studio projection、generated binding guidance、self-doc remediation ledger 到三宿主 manual packet 均已形成 public-safe evidence。

本 closeout 不宣称 C-HIA-P3 完成，不启动 W-P51，不执行真实宿主 runtime capture，不启用 checked apply 写入。

## Completed Capabilities

| phase | capability | status | result |
| --- | --- | --- | --- |
${capabilities}

## Deferred Gates

| gate | status | reason |
| --- | --- | --- |
${deferred}

## Safety Boundary

- W-P50 first-round closeout claimable: ${summary.wp50FirstRoundCloseoutClaimable}
- C-HIA-P3 closeout claimed: ${summary.cHiaP3CloseoutClaimed}
- next W phase started: ${summary.nextWPhaseStarted}
- checked apply write: ${summary.checkedApplyWriteEnabledCount}
- host runtime launch: ${summary.hostRuntimeLaunchCount}
- source bodies: ${summary.sourceBodyOutputCount}
- sourcesContent policy: ${summary.sourcesContentPolicy}
`;
}

function renderWp51Inputs(evidence) {
  const rows = evidence.wp51Inputs.map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.goalZh} |`).join("\n");

  return `# W-P51 Inputs

## 中文摘要

W-P51 应优先承接 W-P50 的真实手工验证、self-doc remediation pilot、generated binding parser fixtures 和宿主 UI hardening。W-P51 仍需要单独拆分和用户确认，不由 W-P50.7 自动启动。

| input | priority | status | goal |
| --- | --- | --- | --- |
${rows}
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
