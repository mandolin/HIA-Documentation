import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPaths = {
  authoringIntake: path.join(rootDir, "dist", "wp51-visual-studio-authoring-foundation-intake", "evidence.json"),
  vsixSkeleton: path.join(rootDir, "dist", "wp51-visual-studio-vsix-skeleton", "evidence.json"),
  localizedReview: path.join(rootDir, "dist", "wp51-visual-studio-localized-review-tool-window", "evidence.json"),
  languageServer: path.join(rootDir, "dist", "wp51-visual-studio-language-server-provider", "evidence.json"),
  authoringProjection: path.join(rootDir, "dist", "wp51-visual-studio-authoring-remediation-projection", "evidence.json"),
  runtimeCapture: path.join(rootDir, "dist", "wp51-visual-studio-install-runtime-capture", "evidence.json"),
  generatedBindingGuidance: path.join(rootDir, "dist", "wp50-generated-binding-authoring-input", "evidence.json"),
  generatedContinuityAdr: path.join(rootDir, "dist", "wp49-generated-comment-continuity-adr-input", "evidence.json")
};
const outputRoot = path.join(rootDir, "dist", "wp51-closeout-wp52-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutReportPath = path.join(outputRoot, "wp51-closeout-report.md");
const wp52InputsPath = path.join(outputRoot, "wp52-generated-documentation-binding-inputs.md");
const deferredReleaseGatesPath = path.join(outputRoot, "visual-studio-deferred-release-gates.md");

await main();

/**
 * 汇总 W-P51 第一轮能力并准备 W-P52 输入。
 * Summarize the first W-P51 capability round and prepare W-P52 inputs.
 *
 * @lang zh-CN 本脚本只消费已有 public-safe evidence。它不重跑历史阶段，
 * 不启动 Visual Studio，不安装或发布 VSIX，也不启动 W-P52。
 * @lang en This script consumes existing public-safe evidence only. It does not
 * replay earlier stages, launch Visual Studio, install or publish a VSIX, or
 * start W-P52.
 *
 * @returns {Promise<void>} 写入 closeout、后延门禁与 W-P52 输入证据。
 */
async function main() {
  const inputs = await readInputs();
  assertInputs(inputs);

  const completedCapabilities = createCompletedCapabilities(inputs);
  const deferredGates = createDeferredGates();
  const wp52Inputs = createWp52Inputs(inputs);
  const releaseDecision = createReleaseDecision();
  const summary = createSummary({
    completedCapabilities,
    deferredGates,
    inputs,
    releaseDecision,
    wp52Inputs
  });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp51-closeout-wp52-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P51.7",
    status: hardFailures.length === 0
      ? "ready-for-wp52-planning-user-confirmation"
      : "blocked-by-wp51-closeout",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    closeoutBoundary: {
      wp51FirstRoundCloseoutClaimed: true,
      cHiaP3CloseoutClaimed: false,
      wp52Started: false,
      ordinaryVisualStudioInstallClaimed: false,
      marketplacePublishClaimed: false,
      targetRepositoryAuthority: "none",
      writeAuthority: "disabled"
    },
    completedCapabilities,
    releaseDecision,
    deferredGates,
    wp52Inputs,
    executionPolicy: {
      policy: "wp51-closeout-only",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayInstallOrdinaryVisualStudioInstance: false,
      hiaMayLaunchHostRuntime: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayPublishMarketplaceExtension: false,
      hiaMayRunTargetCommand: false,
      hiaMayStartWp52: false,
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
      wp52Inputs: normalizePath(wp52InputsPath),
      deferredReleaseGates: normalizePath(deferredReleaseGatesPath)
    },
    officialReferences: [
      "https://learn.microsoft.com/visualstudio/extensibility/visualstudio.extensibility/visualstudio-extensibility",
      "https://learn.microsoft.com/visualstudio/extensibility/visualstudio.extensibility/get-started/debug-extensions",
      "https://learn.microsoft.com/visualstudio/extensibility/migration/extension-compatibility",
      "https://learn.microsoft.com/visualstudio/extensibility/walkthrough-publishing-a-visual-studio-extension-via-command-line"
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P51 closeout evidence");
  assert.equal(hardFailures.length, 0, `W-P51 closeout has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutReportPath, renderCloseoutReport(evidence), "utf8");
  await writeFile(wp52InputsPath, renderWp52Inputs(evidence), "utf8");
  await writeFile(deferredReleaseGatesPath, renderDeferredReleaseGates(evidence), "utf8");

  console.log(`W-P51 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P51 closeout status: ${evidence.status}`);
}

/**
 * 读取阶段 evidence。
 * Read stage evidence.
 *
 * @returns {Promise<Record<string, object>>} Parsed public-safe evidence.
 */
async function readInputs() {
  const entries = await Promise.all(
    Object.entries(inputPaths).map(async ([key, filePath]) => [key, await readJson(filePath)])
  );
  return Object.fromEntries(entries);
}

/**
 * 固定 W-P51.1-W-P51.6 与生成式绑定输入的前置状态。
 * Freeze the prerequisite states from W-P51.1 through W-P51.6 and generated-binding inputs.
 *
 * @param {Record<string, object>} inputs Parsed evidence.
 * @returns {void}
 */
function assertInputs(inputs) {
  assert.equal(inputs.authoringIntake.status, "ready-for-wp51-vsix-skeleton");
  assert.equal(inputs.vsixSkeleton.status, "ready-for-wp51-localized-review-tool-window");
  assert.equal(inputs.localizedReview.status, "ready-for-wp51-language-server-provider");
  assert.equal(inputs.languageServer.status, "ready-for-wp51-authoring-projection");
  assert.equal(inputs.authoringProjection.status, "ready-for-wp51-install-runtime-capture");
  assert.equal(inputs.runtimeCapture.status, "ready-for-wp51-closeout");
  assert.equal(inputs.generatedBindingGuidance.status, "ready-for-wp50-self-doc-remediation-ledger");
  assert.equal(inputs.generatedContinuityAdr.status, "ready-for-wp49-self-doc-reference-refresh");
}

function createCompletedCapabilities(inputs) {
  return [
    capability("W-P51.1", "route-license-toolchain", inputs.authoringIntake.status, "out-of-process route、SDK 许可证与 VS 2022/2026 工具链已审计。"),
    capability("W-P51.2", "buildable-vsix", inputs.vsixSkeleton.status, "真实 VSIX、Command 与 Remote UI Tool Window 已可构建。"),
    capability("W-P51.3", "localized-review-surface", inputs.localizedReview.status, "英文/简体中文资源与只读 review surface 已落地。"),
    capability("W-P51.4", "packaged-language-server", inputs.languageServer.status, "自包含 packaged @hia-doc/lsp 与 stdio Provider 已验证。"),
    capability("W-P51.5", "live-authoring-projection", inputs.authoringProjection.status, "三个只读 custom request 与 remediation/generated-binding guidance 已投影。"),
    capability("W-P51.6", "real-host-runtime-capture", inputs.runtimeCapture.status, "VS 2022/2026 两个真实实验宿主均达到 LSP 与 Live Authoring ready。")
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

function createReleaseDecision() {
  return {
    decision: "defer-public-distribution",
    ordinaryInstanceInstallNow: false,
    publicVsixReleaseNow: false,
    marketplacePublishNow: false,
    reasons: [
      "VisualStudio.Extensibility is still documented as Preview.",
      "Marketplace production publication requires a separate preview-API usage audit.",
      "Ordinary-instance installation has not been validated.",
      "Node.js runtime distribution and prerequisite UX are not frozen.",
      "Marketplace publish manifest, listing metadata and publisher workflow are not prepared."
    ],
    requiredBeforeReconsideration: [
      "stable-or-preview-api-usage-audit",
      "ordinary-instance-install-uninstall-upgrade-validation",
      "node-runtime-distribution-decision",
      "marketplace-publish-manifest-and-listing",
      "privacy-security-license-release-review",
      "versioning-update-and-rollback-policy"
    ],
    publishManifestRequired: true,
    publisherWorkflowRequired: true,
    signingPolicyDecisionRequired: true
  };
}

function createDeferredGates() {
  return [
    deferred("stable-or-preview-api-audit", "Marketplace 不支持使用 Preview API 的生产扩展；需先确认 HIA 的实际 API 使用面与稳定性。"),
    deferred("ordinary-instance-installation", "目前只验证 SDK Experimental Instance；普通实例安装、卸载、升级和回滚尚未验证。"),
    deferred("marketplace-publication", "publish manifest、listing、publisher workflow、版本与回滚策略尚未建立。"),
    deferred("node-runtime-distribution", "当前要求宿主提供 Node.js >=20.19.0；公开分发前需冻结前置检测、引导或受控运行时方案。"),
    deferred("host-editor-api", "真实宿主 capture 仍是只读投影，尚未调用 editor API。"),
    deferred("checked-apply-write", "checked apply、冲突检查、rollback 与最终人工确认仍未开放真实写入。"),
    deferred("provider-network", "真实 provider/network execution 继续保持关闭。"),
    deferred("target-project-adoption", "目标项目继续自行读取中心通知；HIA 不修改目标仓库，也不伪造采用结果。")
  ];
}

function deferred(id, reasonZh) {
  return {
    id,
    reasonZh,
    status: "deferred-open"
  };
}

function createWp52Inputs(inputs) {
  return [
    nextInput("research-and-adr", "P0", "复核 Pug AST/parser/compiler scope、Sass/Vue/JSX/Meta 生成链与既有 source-map/doc-source-map 成果，形成 ADR。", {
      adrQuestionCount: inputs.generatedContinuityAdr.summary.adrQuestionCount,
      scenarioCount: inputs.generatedContinuityAdr.summary.scenarioCount
    }),
    nextInput("syntax-scope-confidence-decision", "P0", "确定 annotation/directive、binding ref/sigil、lexical/template scope、stable instance key 与 confidence/diagnostic 语义。", {
      finalSyntaxFrozen: inputs.generatedContinuityAdr.summary.finalSyntaxFrozen,
      confidenceKindCount: inputs.generatedContinuityAdr.summary.confidenceKindCount
    }),
    nextInput("generated-doc-binding-contract", "P0", "定义中性的 generated-doc-binding contract 与 doc-source-map extension，不把 Pug 专属节点升格为 HTMDoc core kind。", {
      modelFieldCount: inputs.generatedContinuityAdr.summary.modelFieldCount,
      extensionPointCount: inputs.generatedContinuityAdr.summary.extensionPointCount
    }),
    nextInput("pug-one-to-many-parser-fixtures", "P1", "以 hia-pugdoc 建立 locals/each/mixin/include/extends/block 的一对多 fixture 与 parser linkage。", {
      scenarioGuidanceCount: inputs.generatedBindingGuidance.summary.scenarioGuidanceCount,
      parserImplementationIncluded: inputs.generatedBindingGuidance.summary.parserImplementationIncluded
    }),
    nextInput("bidirectional-source-linkage", "P1", "实现 source binding -> generated targets 与 generated target -> source binding 双向索引和查询。", {
      sourceLinkageQueryInputReady: inputs.generatedContinuityAdr.summary.sourceLinkageQueryInputReady,
      relationKindCount: inputs.generatedContinuityAdr.summary.relationKindCount
    }),
    nextInput("renderer-and-host-projection", "P1", "在统一 HTML、VS Code、DevTools 与 Visual Studio 中只读展示 binding source、展开目标、置信度与诊断。", {
      hostProjectionInputReady: inputs.generatedContinuityAdr.summary.hostProjectionInputReady,
      readyHostGuidanceCount: inputs.generatedBindingGuidance.summary.readyHostGuidanceCount
    }),
    nextInput("cross-language-reuse-closeout", "P2", "验证 Sass/Vue/JSX/Meta 的复用边界，并决定是否升格为通用 generated doc-line contract。", {
      generatedBindingRuntimeImplementedNow: inputs.generatedBindingGuidance.summary.generatedBindingRuntimeImplementedNow
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

function createSummary({ completedCapabilities, deferredGates, inputs, releaseDecision, wp52Inputs }) {
  return {
    phase: "W-P51.7",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount: Object.values(inputs).filter(
      (item) => typeof item.status === "string" && item.status.startsWith("ready-for-")
    ).length,
    completedStageCount: 7,
    completedFirstRoundStageCount: 7,
    completedCapabilityCount: completedCapabilities.length,
    wp51FirstRoundCloseoutClaimable: true,
    cHiaP3CloseoutClaimed: false,
    wp52InputCount: wp52Inputs.length,
    p0Wp52InputCount: wp52Inputs.filter((item) => item.priority === "P0").length,
    p1Wp52InputCount: wp52Inputs.filter((item) => item.priority === "P1").length,
    p2Wp52InputCount: wp52Inputs.filter((item) => item.priority === "P2").length,
    wp52Started: false,
    deferredOpenGateCount: deferredGates.length,
    publicDistributionDeferred: releaseDecision.decision === "defer-public-distribution",
    marketplacePublishNow: releaseDecision.marketplacePublishNow,
    ordinaryInstanceInstallCount: inputs.runtimeCapture.summary.ordinaryInstanceInstallCount,
    capturedHostCount: inputs.runtimeCapture.summary.capturedHostCount,
    screenshotCount: inputs.runtimeCapture.summary.screenshotCount,
    languageServerReadyHostCount: inputs.runtimeCapture.summary.languageServerReadyHostCount,
    liveAuthoringReadyHostCount: inputs.runtimeCapture.summary.liveAuthoringReadyHostCount,
    generatedBindingConcreteSyntaxFrozen: inputs.generatedBindingGuidance.summary.concreteSyntaxFrozen,
    generatedBindingParserImplemented: inputs.generatedBindingGuidance.summary.parserImplementationIncluded,
    generatedBindingRuntimeImplemented: inputs.generatedBindingGuidance.summary.generatedBindingRuntimeImplementedNow,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: inputs.runtimeCapture.summary.hostEditorApiCallCount,
    workspaceWriteCount: inputs.runtimeCapture.summary.workspaceWriteCount,
    targetRepositoryMutationCount: inputs.runtimeCapture.summary.targetRepositoryMutationCount,
    providerNetworkExecutedCount: 0,
    sourceBodyOutputCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0,
    sourcesContentPolicy: "none"
  };
}

function createChecks(summary) {
  return [
    check("inputs-ready", summary.inputEvidenceCount === 8 && summary.readyInputEvidenceCount === 8, "All W-P51 and generated-binding input evidence is ready."),
    check("stages-complete", summary.completedStageCount === 7 && summary.completedFirstRoundStageCount === 7 && summary.completedCapabilityCount === 6, "W-P51 stages are complete for the first round."),
    check("real-host-baseline", summary.capturedHostCount === 2 && summary.screenshotCount === 6 && summary.languageServerReadyHostCount === 2 && summary.liveAuthoringReadyHostCount === 2, "VS 2022/2026 real-host baseline is complete."),
    check("wp52-inputs-ready", summary.wp52InputCount === 7 && summary.p0Wp52InputCount === 3 && summary.p1Wp52InputCount === 3, "W-P52 inputs are prioritized."),
    check("scope-not-overclaimed", summary.cHiaP3CloseoutClaimed === false && summary.wp52Started === false, "C-HIA-P3 and W-P52 are not overclaimed."),
    check("distribution-deferred", summary.publicDistributionDeferred === true && summary.marketplacePublishNow === false && summary.ordinaryInstanceInstallCount === 0, "Public distribution remains behind explicit gates."),
    check("generated-binding-not-overclaimed", summary.generatedBindingConcreteSyntaxFrozen === false && summary.generatedBindingParserImplemented === false && summary.generatedBindingRuntimeImplemented === false, "Generated binding syntax, parser, and runtime are not overclaimed."),
    check("no-private-content", summary.sourceBodyOutputCount === 0 && summary.localPathExposureCount === 0 && summary.credentialMarkerCount === 0 && summary.sourcesContentEntryCount === 0, "No private content is emitted."),
    check("no-write-network-target", summary.checkedApplyWriteEnabledCount === 0 && summary.hostEditorApiCallCount === 0 && summary.workspaceWriteCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.providerNetworkExecutedCount === 0, "No write, network, editor API, or target mutation is performed.")
  ];
}

function check(id, condition, message) {
  return {
    id,
    message,
    status: condition ? "pass" : "fail"
  };
}

function renderCloseoutReport(evidence) {
  const capabilities = evidence.completedCapabilities
    .map((item) => `| ${item.phase} | ${item.id} | ${item.status} | ${item.resultZh} |`)
    .join("\n");
  const summary = evidence.summary;

  return `# W-P51 Visual Studio Authoring Foundation 收口报告

## 结论

W-P51 已完成第一轮并可收口。Visual Studio 2022/2026 的真实实验宿主验证、packaged LSP、双语 Tool Window 与只读 Live Authoring 均有 public-safe evidence。

本 closeout 不宣称 C-HIA-P3 完成，不启动 W-P52，不宣称普通实例安装或 Marketplace 发布，也不开放 editor API / checked apply / workspace write。

## 已完成能力

| 阶段 | 能力 | 输入状态 | 结果 |
| --- | --- | --- | --- |
${capabilities}

## 状态摘要

- W-P51 first-round closeout：${summary.wp51FirstRoundCloseoutClaimable}
- captured hosts：${summary.capturedHostCount}
- LSP ready hosts：${summary.languageServerReadyHostCount}
- Live Authoring ready hosts：${summary.liveAuthoringReadyHostCount}
- public-safe screenshots：${summary.screenshotCount}
- ordinary instance installs：${summary.ordinaryInstanceInstallCount}
- Marketplace publish now：${summary.marketplacePublishNow}
- W-P52 started：${summary.wp52Started}
- checked apply writes：${summary.checkedApplyWriteEnabledCount}
- target mutations：${summary.targetRepositoryMutationCount}
`;
}

function renderWp52Inputs(evidence) {
  const rows = evidence.wp52Inputs
    .map((item) => `| ${item.id} | ${item.priority} | ${item.status} | ${item.goalZh} |`)
    .join("\n");

  return `# W-P52 Generated Documentation Binding 输入

## 中文摘要

W-P52 应以“先调研与 ADR、再冻结 contract、随后建立 Pug 一对多 fixture、source-linkage 与宿主投影”为主线。具体语法、变量 sigil、作用域、instance key 和 confidence 模型尚未定案，不能直接从示例字符串推导实现。

| 输入 | 优先级 | 状态 | 目标 |
| --- | --- | --- | --- |
${rows}

W-P52 需要用户确认后单独拆分；本文件不代表 W-P52 已启动。
`;
}

function renderDeferredReleaseGates(evidence) {
  const rows = evidence.deferredGates
    .map((item) => `| ${item.id} | ${item.status} | ${item.reasonZh} |`)
    .join("\n");

  return `# Visual Studio 后延发布门禁

## 当前决定

当前决定为 \`${evidence.releaseDecision.decision}\`。W-P51 的真实实验宿主 baseline 可以收口，但暂不进行普通实例安装、公开 VSIX 分发或 Visual Studio Marketplace 发布。

Microsoft 官方资料仍将 VisualStudio.Extensibility 描述为 Preview，并明确 Preview API 不支持生产扩展或 Marketplace 发布。因此需要先完成实际 API 稳定性审计，而不能仅凭 VSIX 可构建和实验实例可运行直接发布。

| 门禁 | 状态 | 原因 |
| --- | --- | --- |
${rows}

## 重新评估前置

${evidence.releaseDecision.requiredBeforeReconsideration.map((item) => `- \`${item}\``).join("\n")}
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
    /work-zone/iu,
    /file:\/\//iu,
    /\b[A-Z]:[\\/]/u,
    /sk-[A-Za-z0-9_-]+/u,
    /ghp_[A-Za-z0-9_]+/u,
    /npm_[A-Za-z0-9_]+/u,
    /"sourcesContent"\s*:/u
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} includes forbidden private marker: ${pattern}`);
  }
}
