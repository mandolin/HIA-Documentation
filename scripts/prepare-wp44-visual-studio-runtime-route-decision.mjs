import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp44-visual-studio-runtime-route-decision");
const evidencePath = path.join(outputRoot, "evidence.json");
const routeDecisionPath = path.join(outputRoot, "visual-studio-runtime-route-decision.md");
const minimalCapturePath = path.join(outputRoot, "minimal-visual-studio-capture-path.md");
const routeChecklistPath = path.join(outputRoot, "visual-studio-route-decision-checklist.md");
const readinessPath = path.join(rootDir, "dist", "wp44-runtime-capture-readiness-audit", "evidence.json");
const wp39VisualStudioPreparationPath = path.join(rootDir, "dist", "wp39-visual-studio-runtime-preparation", "evidence.json");
const wp43HostProjectionPath = path.join(rootDir, "dist", "wp43-devtools-visual-studio-ux-projection", "evidence.json");
const wp43ProviderPanelPath = path.join(rootDir, "dist", "wp43-provider-review-linkage-panel", "evidence.json");
const wp43TargetOwnerViewPath = path.join(rootDir, "dist", "wp43-target-owner-evidence-view", "evidence.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");
const hostContractPath = path.join(rootDir, "apps", "visual-studio-extension", "host-contract.json");
const reviewSurfacePath = path.join(rootDir, "apps", "visual-studio-extension", "review-surface.json");
const packagePath = path.join(rootDir, "apps", "visual-studio-extension", "package.json");

await main();

/**
 * 准备 W-P44.4 Visual Studio runtime route execution decision evidence。
 * Prepare W-P44.4 Visual Studio runtime route execution decision evidence.
 *
 * This stage executes the Visual Studio route decision for the current cycle:
 * it selects the contract-level route as the only W-P44 action, records the
 * future VSIX implementation routes, and prepares the smallest public-safe
 * capture path for a later real Visual Studio extension. It does not build a
 * VSIX, launch Visual Studio, call host editor APIs, execute providers, run
 * target commands, enable checked apply writes or mutate target repositories.
 *
 * 中文：本阶段执行本周期的 Visual Studio 路线决策：选择 contract-level route
 * 作为 W-P44 唯一执行动作，记录后续 VSIX 实现候选路线，并准备未来真实 Visual
 * Studio 扩展的最小 public-safe capture path。本阶段不构建 VSIX、不启动 Visual
 * Studio、不调用宿主编辑器 API、不执行 provider、不运行目标命令、不启用 checked
 * apply 写入，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P44.4 route decision evidence.
 */
async function main() {
  const inputs = await readInputs();
  const frozenVisualStudioPacket = findFrozenPacket(inputs.readiness, "visual-studio");
  const routeDecision = createRouteDecision(inputs);
  const capturePath = createMinimalCapturePath(routeDecision);
  const checklist = createRouteChecklist(routeDecision, capturePath);
  const routeExecutionPacket = {
    host: "visual-studio",
    hostRuntime: "visual-studio-extension-skeleton",
    phase: "W-P44.4",
    packetStatus: "visual-studio-route-decision-executed",
    routeExecutionMode: "contract-level-route-decision",
    selectedCurrentRoute: routeDecision.selectedCurrentRoute,
    futurePreferredRoute: routeDecision.futurePreferredRoute,
    fallbackRoute: routeDecision.fallbackRoute,
    minimalCapturePath: normalizePath(minimalCapturePath),
    routeDecision: normalizePath(routeDecisionPath),
    routeChecklist: normalizePath(routeChecklistPath),
    frozenPacketId: frozenVisualStudioPacket.freezeId,
    appDirectory: "apps/visual-studio-extension",
    reviewSurface: "apps/visual-studio-extension/review-surface.json",
    actualVisualStudioRuntimeCaptureExecuted: false,
    visualStudioExtensionPackageBuilt: false,
    visualStudioExperimentalInstanceExecuted: false,
    vsixPublished: false,
    visualStudioInstalledByHia: false,
    hostEditorApiCalled: false,
    providerNetworkExecuted: false,
    externalNetworkCallExecuted: false,
    targetCommandsExecutedByHia: false,
    targetOwnerExecutionClaimed: false,
    checkedApplyWriteEnabled: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directEditObjectIncluded: false,
    sourceBodyIncluded: false,
    sourceTextIncluded: false,
    documentContentIncluded: false,
    digestValueIncluded: false,
    credentialValueIncluded: false,
    localAbsolutePathIncluded: false,
    sourcesContentPolicy: "none"
  };
  const summary = summarize({
    capturePath,
    checklist,
    frozenVisualStudioPacket,
    inputs,
    routeDecision,
    routeExecutionPacket
  });
  const checks = [
    check("HIA_WP44_VS_ROUTE_INPUTS_READY", summary.readinessReady === true
      && summary.visualStudioFrozenPacketReady === true
      && summary.wp39VisualStudioReady === true
      && summary.wp43HostProjectionReady === true
      && summary.wp43ProviderPanelReady === true
      && summary.wp43TargetOwnerViewReady === true
      && summary.visualStudioCheckReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        readinessStatus: inputs.readiness.status,
        visualStudioCheckContract: inputs.visualStudioCheck.contract,
        wp39VisualStudioStatus: inputs.wp39VisualStudio.status,
        wp43HostProjectionStatus: inputs.wp43HostProjection.status,
        wp43ProviderPanelStatus: inputs.wp43ProviderPanel.status,
        wp43TargetOwnerViewStatus: inputs.wp43TargetOwnerView.status
      }
    }),
    check("HIA_WP44_VS_ROUTE_DECISION_EXECUTED", summary.routeDecisionStatus === "executed-for-wp44"
      && summary.selectedCurrentRoute === "contract-level-route-decision"
      && summary.futurePreferredRoute === "visualstudio-extensibility-vsix-after-audit"
      && summary.fallbackRoute === "vssdk-vsix-experimental-instance-if-feature-gap"
      && summary.routeCandidateCount >= 4
      && summary.officialReferenceCount >= 4
      && summary.dependencyLicenseAuditRequiredBeforeVsix === true, {
      actual: {
        dependencyLicenseAuditRequiredBeforeVsix: summary.dependencyLicenseAuditRequiredBeforeVsix,
        fallbackRoute: summary.fallbackRoute,
        futurePreferredRoute: summary.futurePreferredRoute,
        officialReferenceCount: summary.officialReferenceCount,
        routeCandidateCount: summary.routeCandidateCount,
        routeDecisionStatus: summary.routeDecisionStatus,
        selectedCurrentRoute: summary.selectedCurrentRoute
      }
    }),
    check("HIA_WP44_VS_MINIMAL_CAPTURE_PATH_READY", summary.capturePathStatus === "future-capture-path-ready"
      && summary.captureArtifactCount >= 5
      && summary.captureStepCount >= 10
      && summary.futureVisualStudioInstallRequired === true
      && summary.currentVisualStudioInstallRequired === false
      && summary.currentManualCaptureRequired === false, {
      actual: {
        captureArtifactCount: summary.captureArtifactCount,
        capturePathStatus: summary.capturePathStatus,
        captureStepCount: summary.captureStepCount,
        currentManualCaptureRequired: summary.currentManualCaptureRequired,
        currentVisualStudioInstallRequired: summary.currentVisualStudioInstallRequired,
        futureVisualStudioInstallRequired: summary.futureVisualStudioInstallRequired
      }
    }),
    check("HIA_WP44_VS_REVIEW_SURFACE_BOUNDARY_READY", summary.hostContractStatus === "skeleton"
      && summary.appDirectory === "apps/visual-studio-extension"
      && summary.packagePrivate === true
      && summary.reviewSurfaceReady === true
      && summary.providerReviewReady === true
      && summary.targetOwnerEvidenceReady === true
      && summary.hostApplyUxReady === true
      && summary.languageServerPackage === "@hia-doc/lsp"
      && summary.cliPackage === "@hia-doc/cli", {
      actual: {
        appDirectory: summary.appDirectory,
        cliPackage: summary.cliPackage,
        hostApplyUxReady: summary.hostApplyUxReady,
        hostContractStatus: summary.hostContractStatus,
        languageServerPackage: summary.languageServerPackage,
        packagePrivate: summary.packagePrivate,
        providerReviewReady: summary.providerReviewReady,
        reviewSurfaceReady: summary.reviewSurfaceReady,
        targetOwnerEvidenceReady: summary.targetOwnerEvidenceReady
      }
    }),
    check("HIA_WP44_VS_RUNTIME_NOT_CLAIMED", summary.actualVisualStudioRuntimeCaptureExecutedCount === 0
      && summary.visualStudioExtensionPackageBuiltCount === 0
      && summary.visualStudioExperimentalInstanceExecutedCount === 0
      && summary.vsixPublishedCount === 0
      && summary.visualStudioInstalledByHiaCount === 0
      && summary.hostEditorApiCalledCount === 0, {
      actual: {
        actualVisualStudioRuntimeCaptureExecutedCount: summary.actualVisualStudioRuntimeCaptureExecutedCount,
        hostEditorApiCalledCount: summary.hostEditorApiCalledCount,
        visualStudioExperimentalInstanceExecutedCount: summary.visualStudioExperimentalInstanceExecutedCount,
        visualStudioExtensionPackageBuiltCount: summary.visualStudioExtensionPackageBuiltCount,
        visualStudioInstalledByHiaCount: summary.visualStudioInstalledByHiaCount,
        vsixPublishedCount: summary.vsixPublishedCount
      }
    }),
    check("HIA_WP44_VS_NO_EXECUTION_OR_WRITE", summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0
      && summary.targetCommandsExecutedByHiaCount === 0
      && summary.targetOwnerExecutionClaimedCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecutedCount: summary.externalNetworkCallExecutedCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandsExecutedByHiaCount: summary.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP44_VS_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.documentContentIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedCount: summary.digestValueIncludedCount,
        documentContentIncludedCount: summary.documentContentIncludedCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp44-visual-studio-runtime-route-decision-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp44-runtime-evidence-normalization" : "blocked",
    sourceEvidence: {
      wp44Readiness: normalizePath(readinessPath),
      wp39VisualStudioPreparation: normalizePath(wp39VisualStudioPreparationPath),
      wp43HostProjection: normalizePath(wp43HostProjectionPath),
      wp43ProviderPanel: normalizePath(wp43ProviderPanelPath),
      wp43TargetOwnerView: normalizePath(wp43TargetOwnerViewPath),
      visualStudioExtensionCheck: normalizePath(visualStudioCheckPath),
      hostContract: "apps/visual-studio-extension/host-contract.json",
      reviewSurface: "apps/visual-studio-extension/review-surface.json",
      packageJson: "apps/visual-studio-extension/package.json"
    },
    routeExecutionPacket,
    routeDecision,
    minimalCapturePath: capturePath,
    routeChecklist: checklist,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      routeDecision: normalizePath(routeDecisionPath),
      minimalCapturePath: normalizePath(minimalCapturePath),
      routeChecklist: normalizePath(routeChecklistPath)
    },
    nextStageInputs: [
      {
        phase: "W-P44.5",
        topic: "runtime-evidence-normalization-with-real-slots",
        status: "ready-input",
        writeAuthorityGranted: false
      },
      {
        phase: "G-VS-P5",
        topic: "visual-studio-real-vsix-implementation-after-audit",
        status: "deferred-input",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P44 Visual Studio route decision evidence");
  assert.equal(hardFailures.length, 0, `W-P44 Visual Studio route decision has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(routeDecisionPath, renderRouteDecisionMarkdown(evidence), "utf8");
  await writeFile(minimalCapturePath, renderMinimalCapturePathMarkdown(evidence), "utf8");
  await writeFile(routeChecklistPath, renderRouteChecklistMarkdown(evidence), "utf8");
  console.log(`W-P44 Visual Studio route decision evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P44 Visual Studio route decision prepared at ${normalizePath(routeDecisionPath)}`);
  console.log(`W-P44 Visual Studio minimal capture path prepared at ${normalizePath(minimalCapturePath)}`);
}

async function readInputs() {
  const [
    readiness,
    wp39VisualStudio,
    wp43HostProjection,
    wp43ProviderPanel,
    wp43TargetOwnerView,
    visualStudioCheck,
    hostContract,
    reviewSurface,
    packageJson
  ] = await Promise.all([
    readJson(readinessPath),
    readJson(wp39VisualStudioPreparationPath),
    readJson(wp43HostProjectionPath),
    readJson(wp43ProviderPanelPath),
    readJson(wp43TargetOwnerViewPath),
    readJson(visualStudioCheckPath),
    readJson(hostContractPath),
    readJson(reviewSurfacePath),
    readJson(packagePath)
  ]);

  return {
    hostContract,
    packageJson,
    readiness,
    reviewSurface,
    visualStudioCheck,
    wp39VisualStudio,
    wp43HostProjection,
    wp43ProviderPanel,
    wp43TargetOwnerView
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function findFrozenPacket(readiness, host) {
  const packet = readiness.frozenPackets?.find((candidate) => candidate.host === host);

  if (!packet) {
    throw new Error(`W-P44 readiness evidence does not contain a frozen packet for ${host}.`);
  }

  return packet;
}

function createRouteDecision(inputs) {
  return {
    status: "executed-for-wp44",
    selectedCurrentRoute: "contract-level-route-decision",
    futurePreferredRoute: "visualstudio-extensibility-vsix-after-audit",
    fallbackRoute: "vssdk-vsix-experimental-instance-if-feature-gap",
    reasonZh: [
      "Visual Studio 当前仍是 skeleton，W-P44.4 的可验证价值是把路线、边界和后续 capture path 固定下来。",
      "VisualStudio.Extensibility 官方路线支持 out-of-process、commands、tool windows 与 LSP provider，契合 HIA 的只读 review/tool-window/LSP 架构。",
      "VisualStudio.Extensibility 仍有 preview/feature gap 风险，因此真实 VSIX 实现前必须保留传统 VSSDK/experimental instance fallback。",
      "真实 Visual Studio runtime capture 需要 VSIX 或等价扩展包、Visual Studio 安装面、依赖/许可证审计和人工实验实例验证，不应塞进 W-P44.4。"
    ],
    reasonEn: [
      "The Visual Studio host is still a skeleton; W-P44.4 should freeze the route, boundary and future capture path.",
      "VisualStudio.Extensibility matches HIA's read-only review/tool-window/LSP shape through out-of-process extensions, commands, tool windows and Language Server Provider support.",
      "VisualStudio.Extensibility still carries preview/feature-gap risk, so a traditional VSSDK experimental-instance fallback must remain available.",
      "Real Visual Studio runtime capture requires a VSIX or equivalent package, a Visual Studio installation surface, dependency/license audit and human experimental-instance verification."
    ],
    officialReferences: createOfficialReferences(),
    candidates: [
      candidate("contract-level-route-decision", "selected-current-cycle", false, false, false, "low", "W-P44.4"),
      candidate("visualstudio-extensibility-vsix-after-audit", "preferred-future-route", true, true, true, "medium", "G-VS-P5-or-later"),
      candidate("vssdk-vsix-experimental-instance-if-feature-gap", "fallback-future-route", true, true, true, "medium", "G-VS-P5-or-later"),
      candidate("manual-runtime-capture-after-real-vsix", "deferred-capture-route", true, true, true, "medium", "W-P45-or-later")
    ],
    requiredBeforeRealVsix: [
      "VisualStudio.Extensibility / VSSDK dependency and license audit.",
      "Visual Studio version and workload matrix.",
      "VSIX package identity, install/update/uninstall policy and private preview boundary.",
      "Experimental instance runbook and public-safe screenshot/transcript redaction checklist.",
      "No-write review surface implementation with checked apply disabled by default."
    ],
    currentCycleBoundaries: {
      buildVsix: false,
      launchVisualStudio: false,
      executeExperimentalInstance: false,
      callHostEditorApi: false,
      enableCheckedApplyWrite: false,
      mutateTargetRepository: false,
      executeProviderNetwork: false,
      runTargetCommands: false,
      embedSourcesContent: false
    },
    existingHostBoundary: {
      packagePrivate: inputs.packageJson.private === true,
      hostContractStatus: inputs.hostContract.status,
      runtimePreparationStatus: inputs.hostContract.runtime?.preparationStatus,
      reviewSurfaceStatus: inputs.reviewSurface.status,
      languageServerPackage: inputs.hostContract.runtime?.languageServer?.package,
      cliPackage: inputs.hostContract.runtime?.cli?.package
    }
  };
}

function candidate(id, decision, producesRuntimeCapture, requiresVisualStudioInstall, dependencyLicenseAuditRequired, risk, earliestPhase) {
  return {
    id,
    decision,
    producesRuntimeCapture,
    requiresVisualStudioInstall,
    dependencyLicenseAuditRequired,
    risk,
    earliestPhase
  };
}

function createOfficialReferences() {
  return [
    {
      id: "microsoft-visualstudio-extensibility-overview",
      title: "About VisualStudio.Extensibility (Preview)",
      url: "https://learn.microsoft.com/en-us/visualstudio/extensibility/visualstudio.extensibility/visualstudio-extensibility?view=vs-2022",
      note: "官方说明 VisualStudio.Extensibility 侧重 out-of-process 扩展，并覆盖 commands、tool windows、LSP 等 HIA 需要的宿主形态。"
    },
    {
      id: "microsoft-visualstudio-extensibility-components",
      title: "Components of a VisualStudio.Extensibility extension",
      url: "https://learn.microsoft.com/en-us/visualstudio/extensibility/visualstudio.extensibility/inside-the-sdk/extension-anatomy?view=vs-2022",
      note: "官方说明 Extension、contributions、commands、tool windows 和 client context 等组成，用于后续 VSIX 设计。"
    },
    {
      id: "microsoft-visualstudio-language-server-provider",
      title: "Extensibility Language Server Provider",
      url: "https://learn.microsoft.com/en-us/visualstudio/extensibility/visualstudio.extensibility/language-server-provider/language-server-provider?view=vs-2022",
      note: "官方说明 Visual Studio 可通过 LanguageServerProvider 启动并连接外部 LSP server，契合 @hia-doc/lsp 边界。"
    },
    {
      id: "microsoft-visual-studio-extension-start",
      title: "Start developing extensions in Visual Studio",
      url: "https://learn.microsoft.com/en-us/visualstudio/extensibility/starting-to-develop-visual-studio-extensions?view=vs-2022",
      note: "官方说明 Visual Studio SDK、commands、tool windows、VSIX 与 Marketplace/distribution 相关入口。"
    },
    {
      id: "microsoft-visual-studio-experimental-instance",
      title: "Explore experimental space in Visual Studio SDK",
      url: "https://learn.microsoft.com/en-us/visualstudio/extensibility/the-experimental-instance?view=vs-2022",
      note: "官方 experimental instance 路线用于后续真实 Visual Studio runtime capture。"
    }
  ];
}

function createMinimalCapturePath(routeDecision) {
  return {
    status: "future-capture-path-ready",
    currentCycleCaptureRequired: false,
    currentCycleVisualStudioInstallRequired: false,
    futureVisualStudioInstallRequired: true,
    route: "future-vsix-or-equivalent-visual-studio-extension",
    selectedImplementationRoute: routeDecision.futurePreferredRoute,
    fallbackImplementationRoute: routeDecision.fallbackRoute,
    artifacts: [
      artifact("vs-manage-extensions-visible", "screenshot", "Visual Studio Manage Extensions 中可见 HIA extension，版本与 publisher 可读。"),
      artifact("hia-tool-window-open", "screenshot", "Visual Studio 中可见 HIA Documentation tool window。"),
      artifact("review-surface-visible", "screenshot", "Review surface 可见 provider review、target-owner evidence 与 checked apply disabled。"),
      artifact("lsp-provider-started", "transcript", "LSP provider 启动 @hia-doc/lsp，输出 public-safe startup marker，不包含本地绝对路径。"),
      artifact("resource-action-open-context", "transcript", "open-context 只生成宿主 open request，不写 workspace、不执行 target command。"),
      artifact("redaction-report", "report", "确认没有源码正文、credential、digest、本地绝对路径、sourcesContent 或目标命令输出正文。")
    ],
    steps: [
      "完成 VisualStudio.Extensibility / VSSDK dependency and license audit。",
      "决定使用 VisualStudio.Extensibility route 或传统 VSSDK fallback。",
      "建立私有预览 VSIX 或等价本地扩展包，不发布 Marketplace。",
      "在隔离 Visual Studio experimental instance 中安装扩展。",
      "打开 disposable solution 或 synthetic workspace，不使用真实目标项目源码正文作为截图内容。",
      "打开 HIA tool window，并加载 public-safe review surface fixture。",
      "验证 provider review、target-owner evidence、host apply UX gates 可见。",
      "验证 checked apply write、workspace write、target mutation、provider network、target command 均为 disabled。",
      "启动或连接 @hia-doc/lsp，并只记录 public-safe startup marker。",
      "触发 open-context/resource action，确认它只是 host-owned open request。",
      "采集 artifact 清单并填写 redaction report。",
      "确认没有本地绝对路径、credential、digest、sourcesContent 或源码正文进入 evidence。"
    ]
  };
}

function artifact(id, kind, marker) {
  return {
    id,
    kind,
    marker,
    required: true,
    privacy: "metadata-only-no-source-body"
  };
}

function createRouteChecklist(routeDecision, capturePath) {
  return {
    title: "W-P44.4 Visual Studio route decision checklist",
    status: "ready",
    steps: [
      "确认 W-P44.1 readiness 中 Visual Studio frozen packet 为 route-preparation-required。",
      "确认 W-P39 Visual Studio preparation evidence 为 ready-for-visual-studio-runtime-route-followup。",
      "确认 apps/visual-studio-extension 仍是 private skeleton，且 visual-studio:check 通过。",
      "确认 W-P44.4 只执行 contract-level route decision，不构建 VSIX。",
      "确认未来首选 route 为 VisualStudio.Extensibility VSIX after audit。",
      "确认传统 VSSDK experimental instance fallback 保留到 feature gap 明确后再决策。",
      "确认 minimal capture path 已列出未来真实 Visual Studio artifact 与 redaction report。",
      "确认 checked apply、workspace write、target mutation、provider network、target command 全部保持 disabled。",
      "确认 evidence 中不包含源码正文、credential、digest、本地绝对路径或 sourcesContent。",
      "确认下一阶段输入为 W-P44.5 runtime evidence normalization。"
    ],
    selectedCurrentRoute: routeDecision.selectedCurrentRoute,
    futurePreferredRoute: routeDecision.futurePreferredRoute,
    captureArtifactCount: capturePath.artifacts.length,
    forbiddenInRouteDecision: [
      "VSIX build claim",
      "Visual Studio launch claim",
      "experimental instance execution claim",
      "workspace write",
      "target repository mutation",
      "checked apply write",
      "provider network execution",
      "target command execution",
      "source body",
      "local absolute path",
      "credential or digest value",
      "sourcesContent"
    ]
  };
}

function summarize({
  capturePath,
  checklist,
  frozenVisualStudioPacket,
  inputs,
  routeDecision,
  routeExecutionPacket
}) {
  const inputSummaries = [
    inputs.readiness.summary || {},
    inputs.wp39VisualStudio.summary || {},
    inputs.wp43HostProjection.summary || {},
    inputs.wp43ProviderPanel.summary || {},
    inputs.wp43TargetOwnerView.summary || {},
    inputs.visualStudioCheck.summary || {}
  ];

  return {
    cycleGroupId: "C-HIA-P2",
    phase: "W-P44.4",
    readinessReady: inputs.readiness.summary?.readyForVisualStudioRouteDecision === true,
    visualStudioFrozenPacketReady: frozenVisualStudioPacket.readiness === "route-preparation-required"
      && frozenVisualStudioPacket.sourceStatus === "ready-for-visual-studio-runtime-route-followup",
    wp39VisualStudioReady: inputs.wp39VisualStudio.status === "ready-for-visual-studio-runtime-route-followup",
    wp43HostProjectionReady: inputs.wp43HostProjection.status === "ready-for-wp43-provider-review-linkage-panel",
    wp43ProviderPanelReady: inputs.wp43ProviderPanel.status === "ready-for-wp43-target-owner-evidence-view-and-deferred-gates",
    wp43TargetOwnerViewReady: inputs.wp43TargetOwnerView.status === "ready-for-wp43-host-confirmation-manual-packet-refresh",
    visualStudioCheckReady: inputs.visualStudioCheck.contract === "hia-visual-studio-extension-check",
    inputHardFailureCount: sumField(inputSummaries, "hardFailureCount"),
    routeDecisionStatus: routeDecision.status,
    selectedCurrentRoute: routeDecision.selectedCurrentRoute,
    futurePreferredRoute: routeDecision.futurePreferredRoute,
    fallbackRoute: routeDecision.fallbackRoute,
    routeCandidateCount: routeDecision.candidates.length,
    officialReferenceCount: routeDecision.officialReferences.length,
    dependencyLicenseAuditRequiredBeforeVsix: inputs.hostContract.runtime?.dependencyLicenseAuditRequiredBeforeVsix === true
      && routeDecision.candidates.some((candidate) => candidate.dependencyLicenseAuditRequired === true),
    capturePathStatus: capturePath.status,
    captureArtifactCount: capturePath.artifacts.length,
    captureStepCount: capturePath.steps.length,
    futureVisualStudioInstallRequired: capturePath.futureVisualStudioInstallRequired === true,
    currentVisualStudioInstallRequired: capturePath.currentCycleVisualStudioInstallRequired === true,
    currentManualCaptureRequired: capturePath.currentCycleCaptureRequired === true,
    routeChecklistStepCount: checklist.steps.length,
    hostContractStatus: inputs.hostContract.status,
    appDirectory: inputs.hostContract.appDirectory,
    packagePrivate: inputs.packageJson.private === true,
    reviewSurfaceReady: inputs.reviewSurface.status === "input-candidate",
    providerReviewReady: inputs.reviewSurface.providerReview?.status === "input-ready",
    targetOwnerEvidenceReady: inputs.reviewSurface.targetOwnerEvidenceView?.status === "input-ready",
    hostApplyUxReady: inputs.reviewSurface.hostApplyUx?.status === "input-ready",
    languageServerPackage: inputs.hostContract.runtime?.languageServer?.package,
    cliPackage: inputs.hostContract.runtime?.cli?.package,
    actualVisualStudioRuntimeCaptureExecutedCount: boolCount(routeExecutionPacket.actualVisualStudioRuntimeCaptureExecuted)
      + boolCount(inputs.hostContract.runtime?.actualVisualStudioRuntimeCaptureExecuted),
    visualStudioExtensionPackageBuiltCount: boolCount(routeExecutionPacket.visualStudioExtensionPackageBuilt)
      + boolCount(inputs.hostContract.runtime?.visualStudioExtensionPackageBuilt),
    visualStudioExperimentalInstanceExecutedCount: boolCount(routeExecutionPacket.visualStudioExperimentalInstanceExecuted)
      + boolCount(inputs.hostContract.runtime?.experimentalInstanceExecuted),
    vsixPublishedCount: boolCount(routeExecutionPacket.vsixPublished),
    visualStudioInstalledByHiaCount: boolCount(routeExecutionPacket.visualStudioInstalledByHia),
    hostEditorApiCalledCount: boolCount(routeExecutionPacket.hostEditorApiCalled)
      + boolCount(inputs.reviewSurface.hostApplyUx?.hostEditorApiCalled),
    providerNetworkExecutedCount: boolCount(routeExecutionPacket.providerNetworkExecuted)
      + boolCount(inputs.reviewSurface.providerReviewPanel?.providerNetworkExecuted)
      + boolCount(inputs.reviewSurface.targetOwnerEvidenceView?.providerNetworkExecuted)
      + boolCount(inputs.reviewSurface.hostApplyUx?.providerNetworkExecuted),
    externalNetworkCallExecutedCount: boolCount(routeExecutionPacket.externalNetworkCallExecuted),
    targetCommandsExecutedByHiaCount: boolCount(routeExecutionPacket.targetCommandsExecutedByHia)
      + boolCount(inputs.reviewSurface.targetOwnerEvidenceView?.targetCommandsExecutedByHia)
      + boolCount(inputs.reviewSurface.hostApplyUx?.targetCommandsExecutedByHia),
    targetOwnerExecutionClaimedCount: boolCount(routeExecutionPacket.targetOwnerExecutionClaimed)
      + boolCount(inputs.reviewSurface.targetOwnerEvidenceView?.targetOwnerExecutionClaimed),
    checkedApplyWriteEnabledCount: boolCount(routeExecutionPacket.checkedApplyWriteEnabled)
      + boolCount(inputs.reviewSurface.targetOwnerEvidenceView?.checkedApplyWriteEnabled)
      + boolCount(inputs.reviewSurface.hostApplyUx?.checkedApplyWriteEnabled),
    workspaceWriteAllowedCount: boolCount(routeExecutionPacket.workspaceWriteAllowed)
      + boolCount(inputs.reviewSurface.providerReview?.workspaceWriteAvailable)
      + boolCount(inputs.reviewSurface.applyPreview?.workspaceWriteAvailable)
      + boolCount(inputs.reviewSurface.hostApplyUx?.workspaceWriteAvailable),
    targetRepositoryMutationCount: boolCount(routeExecutionPacket.targetRepositoryMutationAllowed)
      + boolCount(inputs.reviewSurface.providerReview?.targetRepositoryMutation)
      + boolCount(inputs.reviewSurface.applyPreview?.targetRepositoryMutation)
      + boolCount(inputs.reviewSurface.hostApplyUx?.targetRepositoryMutation)
      + numberValue(inputs.reviewSurface.targetCollaboration?.targetRepositoryMutationCount),
    directEditObjectCount: boolCount(routeExecutionPacket.directEditObjectIncluded)
      + numberValue(inputs.reviewSurface.targetOwnerEvidenceView?.directEditObjectCount)
      + countDirectEditObjects({ capturePath, checklist, routeDecision, routeExecutionPacket }),
    sourceBodyIncludedCount: boolCount(routeExecutionPacket.sourceBodyIncluded),
    sourceTextIncludedCount: boolCount(routeExecutionPacket.sourceTextIncluded),
    documentContentIncludedCount: boolCount(routeExecutionPacket.documentContentIncluded),
    digestValueIncludedCount: boolCount(routeExecutionPacket.digestValueIncluded),
    credentialValueIncludedCount: boolCount(routeExecutionPacket.credentialValueIncluded),
    pathExposureCount: boolCount(routeExecutionPacket.localAbsolutePathIncluded)
      + countPathExposureValues({ capturePath, checklist, routeDecision, routeExecutionPacket }),
    sourcesContentPolicy: [
      routeExecutionPacket.sourcesContentPolicy,
      inputs.reviewSurface.hostApplyUx?.sourcesContentPolicy,
      inputs.reviewSurface.providerReviewPanel?.sourcesContentPolicy,
      inputs.reviewSurface.targetOwnerEvidenceView?.sourcesContentPolicy
    ].every((item) => item === "none") ? "none" : "mixed"
  };
}

function check(code, passed, actual = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...actual
  };
}

function renderRouteDecisionMarkdown(evidence) {
  const { routeDecision, routeExecutionPacket, summary } = evidence;
  const lines = [
    "# W-P44.4 Visual Studio Runtime Route Decision",
    "",
    "## 状态",
    "",
    `- Evidence status / 证据状态：\`${evidence.status}\``,
    `- Route status / 路线状态：\`${routeDecision.status}\``,
    `- Current route / 当前路线：\`${routeDecision.selectedCurrentRoute}\``,
    `- Future preferred route / 后续首选路线：\`${routeDecision.futurePreferredRoute}\``,
    `- Fallback route / 后备路线：\`${routeDecision.fallbackRoute}\``,
    "",
    "## 结论",
    "",
    "W-P44.4 只完成 Visual Studio runtime route execution decision，不构建 VSIX、不启动 Visual Studio、不声明真实 Visual Studio runtime capture。当前 Visual Studio host 继续保持 private skeleton；未来真实 VSIX 实现进入 G-VS-P5 或后续专项。",
    "",
    "## 决策理由",
    ""
  ];

  for (const reason of routeDecision.reasonZh) {
    lines.push(`- ${reason}`);
  }

  lines.push("");
  lines.push("## Route Candidates");
  lines.push("");

  for (const candidate of routeDecision.candidates) {
    lines.push(`- \`${candidate.id}\`：${candidate.decision}；earliest=${candidate.earliestPhase}；licenseAudit=${candidate.dependencyLicenseAuditRequired}；runtimeCapture=${candidate.producesRuntimeCapture}`);
  }

  lines.push("");
  lines.push("## Official References");
  lines.push("");

  for (const reference of routeDecision.officialReferences) {
    lines.push(`- ${reference.title}: ${reference.url}`);
    lines.push(`  - ${reference.note}`);
  }

  lines.push("");
  lines.push("## Runtime Boundary");
  lines.push("");
  lines.push(`- actualVisualStudioRuntimeCaptureExecuted：${routeExecutionPacket.actualVisualStudioRuntimeCaptureExecuted}`);
  lines.push(`- visualStudioExtensionPackageBuilt：${routeExecutionPacket.visualStudioExtensionPackageBuilt}`);
  lines.push(`- visualStudioExperimentalInstanceExecuted：${routeExecutionPacket.visualStudioExperimentalInstanceExecuted}`);
  lines.push(`- checkedApplyWriteEnabled：${routeExecutionPacket.checkedApplyWriteEnabled}`);
  lines.push(`- workspaceWriteAllowed：${routeExecutionPacket.workspaceWriteAllowed}`);
  lines.push(`- targetRepositoryMutationAllowed：${routeExecutionPacket.targetRepositoryMutationAllowed}`);
  lines.push(`- providerNetworkExecuted：${routeExecutionPacket.providerNetworkExecuted}`);
  lines.push(`- sourcesContentPolicy：${routeExecutionPacket.sourcesContentPolicy}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- routeCandidateCount：${summary.routeCandidateCount}`);
  lines.push(`- officialReferenceCount：${summary.officialReferenceCount}`);
  lines.push(`- hardFailureCount：${summary.hardFailureCount}`);

  return `${lines.join("\n")}\n`;
}

function renderMinimalCapturePathMarkdown(evidence) {
  const capturePath = evidence.minimalCapturePath;
  const lines = [
    "# W-P44.4 Minimal Visual Studio Capture Path",
    "",
    "## 状态",
    "",
    `- Status / 状态：\`${capturePath.status}\``,
    `- Current cycle capture required / 当前周期是否要求 capture：${capturePath.currentCycleCaptureRequired}`,
    `- Future Visual Studio install required / 后续是否需要 Visual Studio 安装面：${capturePath.futureVisualStudioInstallRequired}`,
    "",
    "## Future Artifacts",
    ""
  ];

  for (const artifactItem of capturePath.artifacts) {
    lines.push(`- \`${artifactItem.id}\` (${artifactItem.kind})：${artifactItem.marker}`);
  }

  lines.push("");
  lines.push("## Future Steps");
  lines.push("");
  capturePath.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  lines.push("");
  lines.push("本文件只冻结未来真实 Visual Studio capture path，不代表 W-P44.4 已执行 Visual Studio runtime capture。");

  return `${lines.join("\n")}\n`;
}

function renderRouteChecklistMarkdown(evidence) {
  const checklist = evidence.routeChecklist;
  const lines = [
    `# ${checklist.title}`,
    "",
    `Status / 状态：\`${checklist.status}\``,
    `Selected current route / 当前路线：\`${checklist.selectedCurrentRoute}\``,
    `Future preferred route / 后续首选路线：\`${checklist.futurePreferredRoute}\``,
    `Capture artifact count / 采集产物数量：${checklist.captureArtifactCount}`,
    "",
    "## Steps",
    ""
  ];

  checklist.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  lines.push("");
  lines.push("## Forbidden In Route Decision");
  lines.push("");

  for (const item of checklist.forbiddenInRouteDecision) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function boolCount(value) {
  return value === true ? 1 : 0;
}

function numberValue(value) {
  return Number.isFinite(value) ? value : 0;
}

function sumField(items, field) {
  return items.reduce((sum, item) => sum + numberValue(item?.[field]), 0);
}

function countDirectEditObjects(value) {
  return countMatchingValues(value, /workspaceEdit|documentChanges|TextEdit\[/iu);
}

function countPathExposureValues(value) {
  return countMatchingValues(value, /(^|[^A-Za-z])(?:[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+)/u);
}

function countMatchingValues(value, pattern) {
  let count = 0;

  visitValues(value, (candidate) => {
    if (pattern.test(candidate)) {
      count += 1;
    }
  });

  return count;
}

function visitValues(value, visitor) {
  if (typeof value === "string") {
    visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitValues(item, visitor);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//u, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /work-zone/u, `${label} must not expose private WorkZone paths.`);
}
