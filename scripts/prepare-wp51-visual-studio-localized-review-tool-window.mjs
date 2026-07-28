import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const inputPaths = {
  wp51VsixSkeleton: path.join(
    rootDir,
    "dist",
    "wp51-visual-studio-vsix-skeleton",
    "evidence.json"),
  visualStudioCheck: path.join(rootDir, "dist", "visual-studio-extension-check.json"),
  hostContract: path.join(appRoot, "host-contract.json"),
  implementationBaseline: path.join(appRoot, "implementation-baseline.json"),
  reviewSurface: path.join(appRoot, "review-surface.json")
};
const sourcePaths = {
  project: path.join(appRoot, "HiaDocumentation.VisualStudio.csproj"),
  toolWindow: path.join(appRoot, "DocumentationToolWindow.cs"),
  remoteData: path.join(appRoot, "DocumentationToolWindowData.cs"),
  remoteXaml: path.join(appRoot, "DocumentationToolWindowControl.xaml"),
  localizedStrings: path.join(appRoot, "LocalizedStrings.cs"),
  reviewSnapshot: path.join(appRoot, "ReviewSurfaceSnapshot.cs"),
  neutralResources: path.join(appRoot, "Resources.resx"),
  simplifiedChineseResources: path.join(appRoot, "Resources.zh-Hans.resx"),
  neutralMetadata: path.join(appRoot, ".vsextension", "string-resources.json"),
  zhCnMetadata: path.join(appRoot, ".vsextension", "zh-CN", "string-resources.json"),
  zhHansMetadata: path.join(appRoot, ".vsextension", "zh-Hans", "string-resources.json")
};
const buildFilesPath = path.join(
  appRoot,
  "obj",
  "Debug",
  "net8.0-windows8.0",
  "files.json");
const assemblyPath = path.join(
  appRoot,
  "bin",
  "Debug",
  "net8.0-windows8.0",
  "HiaDocumentation.VisualStudio.dll");
const vsixPath = path.join(
  appRoot,
  "bin",
  "Debug",
  "net8.0-windows8.0",
  "HiaDocumentation.VisualStudio.vsix");
const satellitePath = path.join(
  appRoot,
  "bin",
  "Debug",
  "net8.0-windows8.0",
  "zh-Hans",
  "HiaDocumentation.VisualStudio.resources.dll");
const outputRoot = path.join(
  rootDir,
  "dist",
  "wp51-visual-studio-localized-review-tool-window");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(
  outputRoot,
  "visual-studio-localized-review-tool-window-report.md");
const nextStagePath = path.join(
  outputRoot,
  "wp51-language-server-provider-inputs.md");

await main();

/**
 * 生成 W-P51.3 本地化只读 Remote UI 的可重放证据。
 * Generate replayable evidence for the W-P51.3 localized read-only Remote UI.
 *
 * @lang zh-CN 本脚本只记录资源键数量、合同计数、构建产物大小和布尔边界，
 * 不把资源正文、源码正文、绝对路径或 VSIX 内容写入 evidence。
 * @lang en This script records only resource-key counts, contract counts,
 * artifact sizes, and Boolean boundaries. It does not write resource bodies,
 * source bodies, absolute paths, or VSIX contents into evidence.
 *
 * @returns {Promise<void>} Writes public-safe W-P51.3 evidence.
 */
async function main() {
  const inputs = await readJsonInputs();
  const sources = await readSourceInputs();
  const buildPackage = JSON.parse(await readFile(buildFilesPath, "utf8"));
  const artifacts = await collectArtifactMetadata();
  const summary = createSummary(inputs, sources, buildPackage, artifacts);
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp51-visual-studio-localized-review-tool-window",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P51.3",
    status: hardFailures.length === 0
      ? "ready-for-wp51-language-server-provider"
      : "blocked-by-wp51-localized-review-tool-window",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    executionPolicy: {
      policy: "localized-read-only-review-surface",
      hiaMayBuildVsix: true,
      hiaMayInstallVsix: false,
      hiaMayLaunchVisualStudio: false,
      hiaMayStartLanguageServer: false,
      hiaMayCallHostEditorApi: false,
      hiaMayTriggerCheckedApply: false,
      hiaMayWriteWorkspace: false,
      hiaMayMutateTargetRepository: false,
      hiaMayExecuteProviderNetwork: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    localization: {
      remoteUiDefaultCulture: "en-US",
      remoteUiSimplifiedChineseCulture: "zh-Hans",
      metadataSimplifiedChineseCultures: ["zh-CN", "zh-Hans"],
      neutralResourceKeyCount: summary.neutralResourceKeyCount,
      simplifiedChineseResourceKeyCount: summary.simplifiedChineseResourceKeyCount,
      localizedMetadataFileCount: summary.localizedMetadataFileCount,
      satelliteAssemblyCount: summary.satelliteAssemblyCount
    },
    reviewProjection: {
      contract: inputs.reviewSurface.contract,
      status: inputs.reviewSurface.status,
      viewCount: summary.viewCount,
      actionCount: summary.actionCount,
      canonicalMarkerCount: summary.canonicalMarkerCount,
      authoringModeCount: summary.authoringModeCount,
      providerTaxonomyKindCount: summary.providerTaxonomyKindCount,
      targetOwnerEvidenceCheckCount: summary.targetOwnerEvidenceCheckCount,
      hostUxRequirementCount: summary.hostUxRequirementCount,
      applyAvailable: summary.applyAvailable
    },
    buildArtifacts: artifacts,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    nextStageInputs: [
      {
        phase: "W-P51.4",
        id: "hia-language-server-provider",
        status: "ready-input",
        goalZh: "以 VisualStudio.Extensibility LanguageServerProvider 和 stdio 接入 @hia-doc/lsp，并提供 public-safe 生命周期与错误状态。",
        writeAuthorityGranted: false
      }
    ],
    generatedDocs: {
      report: normalizePath(reportPath),
      nextStageInputs: normalizePath(nextStagePath)
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P51.3 evidence");
  assert.equal(hardFailures.length, 0, `W-P51.3 has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reportPath, renderReport(evidence), "utf8");
  await writeFile(nextStagePath, renderNextStageInputs(evidence), "utf8");
  console.log(`W-P51.3 localized review evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P51.3 status: ${evidence.status}`);
}

async function readJsonInputs() {
  const entries = await Promise.all(
    Object.entries(inputPaths).map(async ([key, value]) => [
      key,
      JSON.parse(await readFile(value, "utf8"))
    ])
  );
  return Object.fromEntries(entries);
}

async function readSourceInputs() {
  const entries = await Promise.all(
    Object.entries(sourcePaths).map(async ([key, value]) => [
      key,
      await readFile(value, "utf8")
    ])
  );
  return Object.fromEntries(entries);
}

async function collectArtifactMetadata() {
  return Promise.all([
    ["extension-assembly", assemblyPath],
    ["vsix", vsixPath],
    ["simplified-chinese-satellite", satellitePath]
  ].map(async ([kind, filePath]) => ({
    kind,
    path: normalizePath(filePath),
    sizeBytes: (await stat(filePath)).size
  })));
}

function createSummary(inputs, sources, buildPackage, artifacts) {
  const packagedFiles = Array.isArray(buildPackage.files)
    ? buildPackage.files
    : [];
  const packagedSourcePaths = packagedFiles.map((item) =>
    String(item.path ?? "").replaceAll("\\", "/"));
  const packagedTargetPaths = packagedFiles.map((item) =>
    String(item.targetPath ?? "").replaceAll("\\", "/"));
  const neutralResourceKeyCount = countMatches(
    sources.neutralResources,
    /<data name="[^"]+"/gu);
  const simplifiedChineseResourceKeyCount = countMatches(
    sources.simplifiedChineseResources,
    /<data name="[^"]+"/gu);

  return {
    upstreamVsixStatus: inputs.wp51VsixSkeleton.status,
    visualStudioCheckContract: inputs.visualStudioCheck.contract,
    hostStatus: inputs.hostContract.status,
    baselineStatus: inputs.implementationBaseline.status,
    baselinePhase: inputs.implementationBaseline.phase,
    localizedToolWindowRecorded:
      inputs.hostContract.runtime.localizedReviewToolWindowImplemented === true
      && inputs.implementationBaseline.currentImplementation
        .localizedReviewToolWindowImplemented === true,
    reviewSurfaceEmbeddedRecorded:
      inputs.hostContract.runtime.reviewSurfaceContractEmbedded === true
      && inputs.implementationBaseline.currentImplementation
        .reviewSurfaceContractEmbedded === true,
    embeddedReviewResourceDeclared:
      /LogicalName="HiaDocumentation\.VisualStudio\.review-surface\.json"/u
        .test(sources.project),
    structuredContractLoaderPresent:
      /System\.Text\.Json/u.test(sources.reviewSnapshot)
      && /GetManifestResourceStream/u.test(sources.reviewSnapshot),
    localizedResourceManagerPresent:
      /ResourceManager/u.test(sources.localizedStrings)
      && /CurrentUICulture/u.test(sources.localizedStrings),
    localizedTabsPresent:
      /<TabControl/u.test(sources.remoteXaml)
      && /OverviewMetrics/u.test(sources.remoteXaml)
      && /AuthoringMetrics/u.test(sources.remoteXaml)
      && /ReviewMetrics/u.test(sources.remoteXaml)
      && /SafetyMetrics/u.test(sources.remoteXaml),
    neutralResourceKeyCount,
    simplifiedChineseResourceKeyCount,
    resourceKeyCountMatches:
      neutralResourceKeyCount === simplifiedChineseResourceKeyCount,
    localizedMetadataFileCount: [
      sources.zhCnMetadata,
      sources.zhHansMetadata
    ].filter((value) => /HIA 文档化/u.test(value)).length,
    packagedLocalizedMetadataFileCount: [
      "/.vsextension/zh-CN/string-resources.json",
      "/.vsextension/zh-Hans/string-resources.json"
    ].filter((suffix) =>
      packagedSourcePaths.some((value) => value.endsWith(suffix))).length,
    satelliteAssemblyCount: artifacts.filter(
      (item) => item.kind === "simplified-chinese-satellite"
        && item.sizeBytes > 0).length,
    packagedSatelliteAssemblyCount: packagedTargetPaths.filter(
      (value) =>
        value === "zh-Hans/HiaDocumentation.VisualStudio.resources.dll").length,
    viewCount: inputs.reviewSurface.views.length,
    actionCount: inputs.reviewSurface.actions.length,
    canonicalMarkerCount:
      inputs.reviewSurface.languageAuthoringHints.canonicalMarkers.length,
    authoringModeCount:
      inputs.reviewSurface.authoringProjection.authoringModeCount,
    providerTaxonomyKindCount:
      inputs.reviewSurface.providerReviewPanel.resultTaxonomyKindCount,
    targetOwnerEvidenceCheckCount:
      inputs.reviewSurface.targetOwnerEvidenceView.evidenceCompletenessCheckCount,
    hostUxRequirementCount:
      inputs.reviewSurface.hostApplyUx.uxRequirementRefCount,
    applyAvailable: inputs.reviewSurface.actions.some(
      (item) => item.id === "apply-candidate" && item.available === true),
    languageServerProviderImplemented:
      inputs.hostContract.runtime.languageServerProviderImplemented,
    actualVisualStudioRuntimeCaptureExecuted:
      inputs.hostContract.runtime.actualVisualStudioRuntimeCaptureExecuted,
    experimentalInstanceExecuted:
      inputs.hostContract.runtime.experimentalInstanceExecuted,
    hostEditorApiCalled:
      inputs.implementationBaseline.privacy.hostEditorApiCalled,
    workspaceWriteAllowed:
      inputs.implementationBaseline.privacy.workspaceWriteAllowed,
    targetRepositoryMutationAllowed:
      inputs.implementationBaseline.privacy.targetRepositoryMutationAllowed,
    providerNetworkExecuted:
      inputs.implementationBaseline.privacy.providerNetworkExecuted,
    sourceBodyIncluded:
      inputs.implementationBaseline.privacy.sourceBodyIncluded,
    sourcesContentPolicy:
      inputs.implementationBaseline.privacy.sourcesContentPolicy
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP51_LOCALIZED_INPUTS_READY",
      summary.upstreamVsixStatus === "ready-for-wp51-localized-review-tool-window"
      && summary.visualStudioCheckContract === "hia-visual-studio-extension-check"
      && summary.hostStatus === "localized-review-tool-window"
      && summary.baselineStatus === "localized-review-tool-window"
      && summary.baselinePhase === "W-P51.3"),
    check("HIA_WP51_STRUCTURED_REVIEW_CONTRACT_READY",
      summary.localizedToolWindowRecorded
      && summary.reviewSurfaceEmbeddedRecorded
      && summary.embeddedReviewResourceDeclared
      && summary.structuredContractLoaderPresent
      && summary.viewCount === 10
      && summary.actionCount === 4
      && summary.canonicalMarkerCount === 3),
    check("HIA_WP51_LOCALIZATION_RESOURCES_READY",
      summary.localizedResourceManagerPresent
      && summary.localizedTabsPresent
      && summary.neutralResourceKeyCount >= 30
      && summary.resourceKeyCountMatches
      && summary.localizedMetadataFileCount === 2
      && summary.packagedLocalizedMetadataFileCount === 2
      && summary.satelliteAssemblyCount === 1
      && summary.packagedSatelliteAssemblyCount === 1),
    check("HIA_WP51_REVIEW_SUMMARY_READY",
      summary.authoringModeCount === 5
      && summary.providerTaxonomyKindCount === 5
      && summary.targetOwnerEvidenceCheckCount === 12
      && summary.hostUxRequirementCount === 8
      && !summary.applyAvailable),
    check("HIA_WP51_DEFERRED_RUNTIME_AND_LSP_HONEST",
      !summary.languageServerProviderImplemented
      && !summary.actualVisualStudioRuntimeCaptureExecuted
      && !summary.experimentalInstanceExecuted
      && !summary.hostEditorApiCalled),
    check("HIA_WP51_NO_WRITE_NETWORK_OR_PRIVATE_SOURCE",
      !summary.workspaceWriteAllowed
      && !summary.targetRepositoryMutationAllowed
      && !summary.providerNetworkExecuted
      && !summary.sourceBodyIncluded
      && summary.sourcesContentPolicy === "none")
  ];
}

function check(id, passed) {
  return {
    id,
    status: passed ? "pass" : "fail"
  };
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function renderReport(evidence) {
  const summary = evidence.summary;
  return `# W-P51.3 Visual Studio Localized Review Tool Window

## 中文摘要

Visual Studio Tool Window 已从双语状态占位页升级为本地化只读 authoring/review 界面。默认资源为英文，简体中文使用 \`zh-Hans\` 卫星资源；Command metadata 同时提供 \`zh-CN\` 与 \`zh-Hans\`。

界面通过 \`System.Text.Json\` 读取程序集内嵌的 \`review-surface.json\`，只展示合同状态、计数、canonical locale markers 与安全边界，不展示源码正文或 proposal 正文。

## Evidence

- status: \`${evidence.status}\`
- contract views / actions / markers: ${summary.viewCount} / ${summary.actionCount} / ${summary.canonicalMarkerCount}
- authoring modes / provider kinds: ${summary.authoringModeCount} / ${summary.providerTaxonomyKindCount}
- neutral / zh-Hans resource keys: ${summary.neutralResourceKeyCount} / ${summary.simplifiedChineseResourceKeyCount}
- localized metadata files packaged: ${summary.packagedLocalizedMetadataFileCount}
- zh-Hans satellite assemblies packaged: ${summary.packagedSatelliteAssemblyCount}
- LSP provider / runtime capture / Experimental Instance: ${summary.languageServerProviderImplemented} / ${summary.actualVisualStudioRuntimeCaptureExecuted} / ${summary.experimentalInstanceExecuted}
- workspace write / target mutation / source body: ${summary.workspaceWriteAllowed} / ${summary.targetRepositoryMutationAllowed} / ${summary.sourceBodyIncluded}
`;
}

function renderNextStageInputs(evidence) {
  return `# W-P51.4 Inputs

## 中文摘要

W-P51.4 可在本地化只读 Tool Window 基础上接入 \`@hia-doc/lsp\`。Language Server 必须由 Visual Studio host 通过 stdio 管理，并保持路径、错误、日志和 lifecycle 状态 public-safe。

| input | status | goal |
| --- | --- | --- |
${evidence.nextStageInputs.map((item) => `| \`${item.id}\` | \`${item.status}\` | ${item.goalZh} |`).join("\n")}
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function assertNoPrivateMarkers(serialized, label) {
  for (const pattern of [
    /[A-Za-z]:[\\/]/u,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /(?:npm_|ghp_|github_pat_)[A-Za-z0-9_]+/u,
    /"sourcesContent"\s*:\s*\[[^\]]/u
  ]) {
    assert.doesNotMatch(serialized, pattern, `${label} must remain public-safe.`);
  }
}
