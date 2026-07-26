import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedContinuityPath = path.join(rootDir, "dist", "wp49-generated-comment-continuity-adr-input", "evidence.json");
const hostProjectionPath = path.join(rootDir, "dist", "wp50-devtools-visual-studio-authoring-projection", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp50-generated-binding-authoring-input");
const evidencePath = path.join(outputRoot, "evidence.json");
const guidanceJsonPath = path.join(outputRoot, "generated-binding-authoring-guidance.json");
const guidanceReportPath = path.join(outputRoot, "generated-binding-authoring-guidance.md");
const hostMatrixPath = path.join(outputRoot, "generated-binding-host-guidance-matrix.md");

await main();

/**
 * 准备 W-P50.4 generated binding authoring input evidence。
 * Prepare W-P50.4 generated binding authoring input evidence.
 *
 * @lang zh-CN 本脚本把 W-P49.5 的 `generated-doc-binding` ADR 输入转换为
 * VS Code / DevTools / Visual Studio 可读的 authoring guidance。它只生成
 * guidance artifact，不冻结 Pug 具体语法，不实现 parser，不读取或输出源码正文，
 * 也不启用 checked apply 写入。
 * @lang en This script turns the W-P49.5 `generated-doc-binding` ADR input
 * into authoring guidance that VS Code, DevTools, and Visual Studio can read.
 * It only generates guidance artifacts; it does not freeze concrete Pug syntax,
 * implement parser support, read or emit source bodies, or enable checked-apply
 * writes.
 *
 * @returns {Promise<void>} Writes public-safe W-P50.4 evidence and guidance.
 */
async function main() {
  const inputs = await readInputs();
  assert.equal(inputs.generatedContinuity.status, "ready-for-wp49-self-doc-reference-refresh");
  assert.equal(inputs.hostProjection.status, "ready-for-wp50-generated-binding-authoring-input");

  const authoringGuidance = createAuthoringGuidance(inputs);
  const hostGuidanceMatrix = createHostGuidanceMatrix(inputs, authoringGuidance);
  const diagnosticGuidance = createDiagnosticGuidance(inputs.generatedContinuity);
  const summary = createSummary({ authoringGuidance, diagnosticGuidance, hostGuidanceMatrix, inputs });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp50-generated-binding-authoring-input",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P50.4",
    status: hardFailures.length === 0 ? "ready-for-wp50-self-doc-remediation-ledger" : "blocked-by-wp50-generated-binding-authoring-input",
    sourceEvidence: {
      generatedContinuityAdrInput: normalizePath(generatedContinuityPath),
      hostAuthoringProjection: normalizePath(hostProjectionPath)
    },
    guidanceBoundary: {
      abstraction: "generated-doc-binding",
      concreteSyntaxFrozen: false,
      parserImplementationIncluded: false,
      hostReadableOnly: true,
      candidateExamplesAreNonNormative: true,
      targetRepositoryAuthority: "none",
      writeAuthority: "disabled"
    },
    authoringGuidance,
    hostGuidanceMatrix,
    diagnosticGuidance,
    executionPolicy: {
      policy: "generated-binding-authoring-guidance-read-only",
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
      guidanceJson: normalizePath(guidanceJsonPath),
      guidanceReport: normalizePath(guidanceReportPath),
      hostMatrix: normalizePath(hostMatrixPath)
    },
    nextStageInputs: [
      {
        phase: "W-P50.5",
        status: "ready-input",
        topic: "self-doc-remediation-ledger",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P50.6",
        status: "candidate-input",
        topic: "runtime-manual-packet-and-evidence",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  const serializedGuidance = JSON.stringify(authoringGuidance, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P50.4 generated binding authoring evidence");
  assertNoPrivateMarkers(serializedGuidance, "W-P50.4 generated binding authoring guidance");
  assert.equal(hardFailures.length, 0, `W-P50.4 generated binding authoring input has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(guidanceJsonPath, `${serializedGuidance}\n`, "utf8");
  await writeFile(guidanceReportPath, renderGuidanceReport(evidence), "utf8");
  await writeFile(hostMatrixPath, renderHostMatrix(evidence), "utf8");

  console.log(`W-P50.4 generated binding authoring input prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P50.4 status: ${evidence.status}`);
}

async function readInputs() {
  const [generatedContinuity, hostProjection] = await Promise.all([
    readJson(generatedContinuityPath),
    readJson(hostProjectionPath)
  ]);

  return {
    generatedContinuity,
    hostProjection
  };
}

function createAuthoringGuidance(inputs) {
  const bindingModel = inputs.generatedContinuity.bindingModel;
  const scenarios = inputs.generatedContinuity.scenarioMatrix;
  const adrQuestions = inputs.generatedContinuity.adrQuestions;

  return {
    contract: "hia-generated-binding-authoring-guidance",
    contractVersion: "0.1.0-draft",
    status: "host-readable",
    abstraction: bindingModel.modelName,
    syntaxPolicy: {
      status: "non-normative-examples-only",
      finalSyntaxFrozen: false,
      guidanceZh: "宿主可以展示候选表达方式和绑定字段，但不得把示例当作最终语言规范。",
      guidanceEn: "Hosts may display candidate expressions and binding fields, but must not treat examples as final language syntax."
    },
    requiredConcepts: bindingModel.coreFields.map((field) => ({
      id: field.id,
      required: field.required,
      displayZh: createConceptDisplayZh(field.id),
      purpose: field.purpose
    })),
    relationKinds: bindingModel.relationKinds,
    confidenceKinds: bindingModel.confidenceKinds,
    authoringSteps: createAuthoringSteps(),
    scenarioGuidance: scenarios.map((scenario) => ({
      id: scenario.id,
      sourceDsl: scenario.sourceDsl,
      bindingRefShape: scenario.bindingRefShape,
      confidence: scenario.confidence,
      hostPromptZh: createScenarioPromptZh(scenario),
      requirement: scenario.firstRoundRequirement
    })),
    decisionPrompts: adrQuestions.map((question) => ({
      id: question.id,
      priority: question.priority,
      hostPromptZh: createDecisionPromptZh(question),
      recommendation: question.recommendation
    })),
    privacyBoundary: {
      sourceBodiesVisible: false,
      runtimeDataCaptureAllowed: false,
      localAbsolutePathVisible: false,
      credentialVisible: false,
      sourcesContentPolicy: "none"
    }
  };
}

function createConceptDisplayZh(id) {
  const labels = {
    bindingId: "稳定绑定 ID",
    sourceIntent: "上游文档意图",
    sourceRange: "上游来源范围",
    templateBindingRef: "模板绑定引用",
    scope: "词法/模板作用域",
    expansion: "一对多展开记录",
    downstreamTargets: "下游生成目标",
    confidence: "映射置信度",
    privacy: "隐私边界"
  };

  return labels[id] ?? id;
}

function createAuthoringSteps() {
  return [
    step("identify-upstream-intent", "P0", "先识别上游注释意图：描述、属性、组件片段、可访问性说明或样式 hook。"),
    step("bind-template-ref-and-scope", "P0", "记录 template binding reference 与 scope，避免同名变量跨层级误合并。"),
    step("preview-expansion-targets", "P0", "只读预览一对多 downstream targets，并显示 instance key 与顺序。"),
    step("show-confidence-and-diagnostics", "P0", "明确展示 precise / inferred / ambiguous / unresolved，不把静态不可解数据伪装成精确。"),
    step("link-doc-source-map-extension", "P1", "把 binding id 与 generated target id 作为 doc-source-map extension / source-linkage query 输入。"),
    step("keep-syntax-non-normative", "P0", "候选语法只作为示例展示，最终语法等待 parser fixture 与 ADR 决策。"),
    step("enforce-privacy-boundary", "P0", "不展示源码正文、不捕获运行时数据、不序列化本地绝对路径、secret 或 digest。")
  ];
}

function step(id, priority, guidanceZh) {
  return {
    guidanceZh,
    id,
    priority,
    status: "ready-guidance",
    writeAuthority: "disabled"
  };
}

function createScenarioPromptZh(scenario) {
  return `当宿主检测到 ${scenario.sourceDsl} / ${scenario.bindingRefShape} 场景时，应展示 ${scenario.downstreamTargetShape} 的只读绑定预览，并标记置信度 ${scenario.confidence}。`;
}

function createDecisionPromptZh(question) {
  return `ADR 问题 ${question.id}（${question.priority}）：展示推荐取舍，但不要在宿主中冻结最终语法。`;
}

function createHostGuidanceMatrix(inputs, authoringGuidance) {
  const projectionHosts = new Map(inputs.hostProjection.projections.map((item) => [item.hostId, item]));
  return [
    hostGuidance("vscode-extension", "VS Code Extension", "quickpick-output-and-lsp-authoring", projectionHosts, authoringGuidance),
    hostGuidance("devtools-extension", "Chrome DevTools Extension", "review-panel-read-only-projection", projectionHosts, authoringGuidance),
    hostGuidance("visual-studio-extension", "Visual Studio Extension", "review-surface-read-only-projection", projectionHosts, authoringGuidance)
  ];
}

function hostGuidance(hostId, host, surfaceMode, projectionHosts, authoringGuidance) {
  const projection = projectionHosts.get(hostId);
  const readyFromProjection = hostId === "vscode-extension" || projection?.status === "input-ready";

  return {
    host,
    hostId,
    surfaceMode,
    status: readyFromProjection ? "guidance-ready" : "projection-not-ready",
    visibleGuidanceCount: authoringGuidance.authoringSteps.length,
    scenarioPromptCount: authoringGuidance.scenarioGuidance.length,
    decisionPromptCount: authoringGuidance.decisionPrompts.length,
    sourceBodiesVisible: false,
    sourcesContentPolicy: "none",
    writeAuthority: "disabled"
  };
}

function createDiagnosticGuidance(generatedContinuity) {
  return [
    diagnostic("scope-ambiguous", "warning", "同名 templateBindingRef 出现在多个 scope 中时，宿主应要求用户确认或等待 parser fixture。"),
    diagnostic("runtime-only-unresolved", "warning", "运行时才可展开的数据必须标记 unresolved，不触发 provider、网络或 runtime capture。"),
    diagnostic("downstream-target-missing", "info", "上游意图已识别但下游目标未生成时，只展示待连接状态。"),
    diagnostic("confidence-low", "info", `当前 confidence kinds：${generatedContinuity.bindingModel.confidenceKinds.join(", ")}。`),
    diagnostic("syntax-non-normative", "info", "候选语法只是展示示例，最终语法等待 ADR 与 fixture。")
  ];
}

function diagnostic(id, severity, guidanceZh) {
  return {
    guidanceZh,
    id,
    severity,
    status: "ready-diagnostic"
  };
}

function createSummary({ authoringGuidance, diagnosticGuidance, hostGuidanceMatrix, inputs }) {
  return {
    phase: "W-P50.4",
    generatedContinuityReady: inputs.generatedContinuity.status === "ready-for-wp49-self-doc-reference-refresh",
    hostProjectionReady: inputs.hostProjection.status === "ready-for-wp50-generated-binding-authoring-input",
    hostGuidanceCount: hostGuidanceMatrix.length,
    readyHostGuidanceCount: hostGuidanceMatrix.filter((item) => item.status === "guidance-ready").length,
    requiredConceptCount: authoringGuidance.requiredConcepts.length,
    authoringStepCount: authoringGuidance.authoringSteps.length,
    scenarioGuidanceCount: authoringGuidance.scenarioGuidance.length,
    decisionPromptCount: authoringGuidance.decisionPrompts.length,
    diagnosticGuidanceCount: diagnosticGuidance.length,
    concreteSyntaxFrozen: false,
    parserImplementationIncluded: false,
    generatedBindingRuntimeImplementedNow: false,
    hostReadableGuidanceReady: true,
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
    check("generated-continuity-ready", summary.generatedContinuityReady, "W-P49.5 generated continuity input is ready."),
    check("host-projection-ready", summary.hostProjectionReady, "W-P50.3 host projection input is ready."),
    check("host-guidance-ready", summary.hostGuidanceCount === 3 && summary.readyHostGuidanceCount === 3, "All three host guidance projections are ready."),
    check("guidance-content-ready", summary.requiredConceptCount >= 9 && summary.authoringStepCount >= 7 && summary.scenarioGuidanceCount >= 6 && summary.decisionPromptCount >= 6, "Generated binding authoring guidance is complete enough for first round."),
    check("diagnostics-ready", summary.diagnosticGuidanceCount >= 5, "Diagnostic guidance is ready."),
    check("syntax-and-parser-not-claimed", summary.concreteSyntaxFrozen === false && summary.parserImplementationIncluded === false && summary.generatedBindingRuntimeImplementedNow === false, "Concrete syntax, parser, and runtime implementation are not claimed."),
    check("next-stage-ready", summary.hostReadableGuidanceReady && summary.nextStageReady && summary.nextWPhaseStarted === false && summary.anotherWPhaseStarted === false, "W-P50.5 input is ready without starting another W phase."),
    check("no-host-runtime-or-editor-call", summary.hostRuntimeLaunchCount === 0 && summary.hostEditorApiCallCount === 0, "No host runtime or editor API is used."),
    check("no-source-body", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0, "No source bodies or sourcesContent are emitted."),
    check("no-write-network-target", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0, "No write, network, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return { id, message, status: condition ? "pass" : "fail" };
}

function renderGuidanceReport(evidence) {
  const steps = evidence.authoringGuidance.authoringSteps.map((item) => `| ${item.id} | ${item.priority} | ${item.guidanceZh} |`).join("\n");
  const diagnostics = evidence.diagnosticGuidance.map((item) => `| ${item.id} | ${item.severity} | ${item.guidanceZh} |`).join("\n");
  const summary = evidence.summary;

  return `# W-P50.4 Generated Binding Authoring Input

## 中文摘要

W-P50.4 已把 W-P49.5 的 \`generated-doc-binding\` ADR 输入转换为三宿主可读的 authoring guidance。该 guidance 说明上游意图、template binding reference、scope、一对多 expansion、downstream targets、confidence 和 privacy 边界如何呈现给用户。

本阶段不冻结 Pug 具体语法，不实现 parser，不运行模板，不捕获 runtime data，不输出源码正文，也不启用 checked apply 写入。

## Authoring Steps

| step | priority | guidance |
| --- | --- | --- |
${steps}

## Diagnostics

| diagnostic | severity | guidance |
| --- | --- | --- |
${diagnostics}

## Safety Boundary

- concrete syntax frozen: ${summary.concreteSyntaxFrozen}
- parser implementation included: ${summary.parserImplementationIncluded}
- checked apply write: ${summary.checkedApplyWriteEnabledCount === 0 ? "disabled" : "enabled"}
- host editor API: ${summary.hostEditorApiCallCount === 0 ? "disabled" : "enabled"}
- workspace write: ${summary.workspaceWriteAllowedCount === 0 ? "disabled" : "enabled"}
- target mutation: ${summary.targetRepositoryMutationCount === 0 ? "disabled" : "enabled"}
- provider/network: ${summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0 ? "disabled" : "enabled"}
- sourcesContent policy: ${summary.sourcesContentPolicy}
`;
}

function renderHostMatrix(evidence) {
  const rows = evidence.hostGuidanceMatrix.map((item) => `| ${item.host} | ${item.status} | ${item.surfaceMode} | ${item.visibleGuidanceCount} | ${item.scenarioPromptCount} | ${item.writeAuthority} |`).join("\n");

  return `# W-P50.4 Generated Binding Host Guidance Matrix

## 中文摘要

三宿主均只读取 generated binding guidance，不获得写入授权。VS Code 后续可通过 QuickPick / Output / LSP authoring 继续展示，DevTools 与 Visual Studio 通过 review surface 只读投射。

| host | status | surface mode | guidance | scenarios | write |
| --- | --- | --- | ---: | ---: | --- |
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
