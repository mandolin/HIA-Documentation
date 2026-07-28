import assert from "node:assert/strict";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const projectPath = path.join(appRoot, "HiaDocumentation.VisualStudio.csproj");
const inputPaths = {
  implementationBaseline: path.join(appRoot, "implementation-baseline.json"),
  hostContract: path.join(appRoot, "host-contract.json"),
  visualStudioCheck: path.join(rootDir, "dist", "visual-studio-extension-check.json"),
  wp51FoundationIntake: path.join(
    rootDir,
    "dist",
    "wp51-visual-studio-authoring-foundation-intake",
    "evidence.json")
};
const sourcePaths = [
  "ExtensionEntrypoint.cs",
  "ShowDocumentationToolWindowCommand.cs",
  "DocumentationToolWindow.cs",
  "DocumentationToolWindowControl.cs",
  "DocumentationToolWindowData.cs",
  "DocumentationToolWindowControl.xaml",
  "LocalizedStrings.cs",
  "ReviewSurfaceSnapshot.cs",
  "Resources.resx",
  "Resources.zh-Hans.resx",
  ".vsextension/string-resources.json",
  ".vsextension/zh-CN/string-resources.json",
  ".vsextension/zh-Hans/string-resources.json"
];
const outputRoot = path.join(rootDir, "dist", "wp51-visual-studio-vsix-skeleton");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(outputRoot, "visual-studio-vsix-skeleton-report.md");
const nextStagePath = path.join(outputRoot, "wp51-localized-tool-window-inputs.md");

await main();

/**
 * 验证 W-P51.2 可构建 VSIX、命令入口、Remote UI 和 no-write 边界。
 * Validate the W-P51.2 buildable VSIX, command entry point, Remote UI, and
 * no-write boundary.
 *
 * @lang zh-CN 本脚本只读取 MSBuild 结构化查询结果、构建产物元数据和源码
 * marker，不把源码正文、绝对路径、NuGet cache 路径或 VSIX 内容写入 evidence。
 * @lang en This script reads only structured MSBuild query results, build
 * artifact metadata, and source markers. It never writes source bodies,
 * absolute paths, NuGet cache paths, or VSIX contents into evidence.
 *
 * @returns {Promise<void>} Writes public-safe W-P51.2 evidence.
 */
async function main() {
  const inputs = await readInputs();
  const projectModel = queryProjectModel();
  const artifacts = await collectBuildArtifacts();
  const sourceSurface = await inspectSourceSurface();
  const summary = createSummary(inputs, projectModel, artifacts, sourceSurface);
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp51-visual-studio-vsix-skeleton",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P51.2",
    status: hardFailures.length === 0
      ? "ready-for-wp51-localized-review-tool-window"
      : "blocked-by-wp51-vsix-skeleton",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    project: {
      projectFile: normalizePath(projectPath),
      targetFramework: projectModel.properties.TargetFramework,
      languageVersion: projectModel.properties.LangVersion,
      nullable: projectModel.properties.Nullable,
      packageReferences: projectModel.packageReferences
    },
    buildArtifacts: artifacts,
    sourceSurface,
    executionPolicy: {
      policy: "buildable-vsix-skeleton-only",
      hiaMayBuildVsix: true,
      hiaMayInstallVsix: false,
      hiaMayLaunchVisualStudio: false,
      hiaMayCallHostEditorApi: false,
      hiaMayStartLanguageServer: false,
      hiaMayTriggerCheckedApply: false,
      hiaMayWriteWorkspace: false,
      hiaMayMutateTargetRepository: false,
      hiaMayExecuteProviderNetwork: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    nextStageInputs: [
      {
        phase: "W-P51.3",
        id: "localized-review-tool-window",
        status: "ready-input",
        goalZh: "把现有只读状态面升级为可呈现 authoring/review contract 的中英本地化 Remote UI。",
        writeAuthorityGranted: false
      }
    ],
    generatedDocs: {
      report: normalizePath(reportPath),
      nextStageInputs: normalizePath(nextStagePath)
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P51.2 evidence");
  if (hardFailures.length > 0)
  {
    console.error(
      `W-P51.2 failed checks: ${hardFailures.map((item) => item.id).join(", ")}`);
  }
  assert.equal(hardFailures.length, 0, `W-P51.2 has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reportPath, renderReport(evidence), "utf8");
  await writeFile(nextStagePath, renderNextStageInputs(evidence), "utf8");
  console.log(`W-P51.2 Visual Studio VSIX evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P51.2 status: ${evidence.status}`);
}

async function readInputs() {
  const entries = await Promise.all(
    Object.entries(inputPaths).map(async ([key, value]) => [
      key,
      JSON.parse(await readFile(value, "utf8"))
    ])
  );
  return Object.fromEntries(entries);
}

/**
 * 使用 MSBuild 的 JSON 查询接口读取项目属性与 PackageReference。
 * Use the MSBuild JSON query interface for project properties and references.
 *
 * @returns {object} Public-safe evaluated project model.
 */
function queryProjectModel() {
  const raw = execFileSync("dotnet", [
    "msbuild",
    projectPath,
    "-nologo",
    "-getProperty:TargetFramework",
    "-getProperty:LangVersion",
    "-getProperty:Nullable",
    "-getItem:PackageReference"
  ], { encoding: "utf8" });
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  assert.ok(firstBrace >= 0 && lastBrace > firstBrace, "MSBuild query must return JSON.");
  const evaluated = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  const packageReferences = (evaluated.Items?.PackageReference ?? [])
    .filter((item) => item.Identity.startsWith("Microsoft.VisualStudio.Extensibility."))
    .map((item) => ({
      name: item.Identity,
      version: item.Version,
      privateAssets: item.PrivateAssets
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    properties: evaluated.Properties,
    packageReferences
  };
}

async function collectBuildArtifacts() {
  // <lang><zh-CN>上游重放只审计本命令刚生成的 Debug 产物，避免既有 Release 目录把产物重复计数。</zh-CN><en>Upstream replay audits only the Debug artifacts produced by this command so an existing Release directory cannot duplicate artifact counts.</en></lang>
  const files = await listFiles(path.join(
    appRoot,
    "bin",
    "Debug",
    "net8.0-windows8.0"));
  const selected = files.filter((filePath) =>
    filePath.endsWith("HiaDocumentation.VisualStudio.dll")
    || filePath.endsWith("HiaDocumentation.VisualStudio.vsix"));
  return Promise.all(selected.map(async (filePath) => {
    const fileStat = await stat(filePath);
    return {
      kind: filePath.endsWith(".vsix") ? "vsix" : "extension-assembly",
      path: path.relative(appRoot, filePath).replaceAll("\\", "/"),
      sizeBytes: fileStat.size
    };
  }));
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

async function inspectSourceSurface() {
  const texts = await Promise.all(
    sourcePaths.map((relativePath) => readFile(path.join(appRoot, relativePath), "utf8"))
  );
  const joined = texts.join("\n");
  return {
    sourceFileCount: sourcePaths.length,
    visualStudioContributionCount: countMatches(joined, /\[VisualStudioContribution\]/gu),
    commandOpensToolWindow: /ShowToolWindowAsync<DocumentationToolWindow>/u.test(joined),
    remoteUserControlPresent: /RemoteUserControl/u.test(joined),
    dataContractPresent: /\[DataContract\]/u.test(joined),
    bilingualLangMarkerPresent: /<zh-CN>/u.test(joined) && /<en>/u.test(joined),
    bilingualVisibleTextPresent: /HIA Documentation/u.test(joined)
      && /HIA 文档化/u.test(joined),
    workspaceWriteCodePresent: /WorkspaceEdit|workspace\.apply|WriteAllText|WriteAllBytes/u.test(joined),
    languageServerProviderPresent: /LanguageServerProvider/u.test(joined),
    sourceBodySerialized: false
  };
}

function createSummary(inputs, projectModel, artifacts, sourceSurface) {
  const packageReferences = projectModel.packageReferences;
  return {
    wp51FoundationReady: [
      "ready-for-wp51-vsix-sdk-license-confirmation",
      "ready-for-wp51-vsix-skeleton"
    ].includes(inputs.wp51FoundationIntake.status),
    licenseAcceptanceRecorded: inputs.implementationBaseline.licenseGate.userAcceptanceRecorded,
    visualStudioCheckReady: inputs.visualStudioCheck.contract
      === "hia-visual-studio-extension-check",
    hostStatus: inputs.hostContract.status,
    targetFramework: projectModel.properties.TargetFramework,
    languageVersion: projectModel.properties.LangVersion,
    nullable: projectModel.properties.Nullable,
    packageReferenceCount: packageReferences.length,
    privateAssetsAllCount: packageReferences.filter((item) => item.privateAssets === "all").length,
    sdkVersionMatchCount: packageReferences.filter((item) => item.version === "17.14.40608").length,
    buildArtifactCount: artifacts.length,
    vsixArtifactCount: artifacts.filter((item) => item.kind === "vsix").length,
    extensionAssemblyArtifactCount: artifacts.filter((item) => item.kind === "extension-assembly").length,
    vsixSizeBytes: artifacts.find((item) => item.kind === "vsix")?.sizeBytes ?? 0,
    extensionAssemblySizeBytes: artifacts.find((item) => item.kind === "extension-assembly")?.sizeBytes ?? 0,
    sourceFileCount: sourceSurface.sourceFileCount,
    visualStudioContributionCount: sourceSurface.visualStudioContributionCount,
    commandImplemented: sourceSurface.commandOpensToolWindow,
    toolWindowImplemented: sourceSurface.remoteUserControlPresent && sourceSurface.dataContractPresent,
    bilingualSurfacePresent: sourceSurface.bilingualLangMarkerPresent
      && sourceSurface.bilingualVisibleTextPresent,
    languageServerProviderImplemented: sourceSurface.languageServerProviderPresent,
    workspaceWriteCodePresent: sourceSurface.workspaceWriteCodePresent,
    actualVisualStudioRuntimeCaptureExecutedCount: 0,
    experimentalInstanceExecutedCount: 0,
    vsixInstalledCount: 0,
    providerNetworkExecutedCount: 0,
    targetRepositoryMutationCount: 0,
    sourceBodyOutputCount: Number(sourceSurface.sourceBodySerialized),
    pathExposureCount: 0,
    sourcesContentPolicy: "none"
  };
}

function createChecks(summary) {
  return [
    check("HIA_WP51_VSIX_INPUTS_READY", summary.wp51FoundationReady
      && summary.licenseAcceptanceRecorded
      && summary.visualStudioCheckReady
      && [
        "buildable-vsix-skeleton",
        "localized-review-tool-window"
      ].includes(summary.hostStatus)),
    check("HIA_WP51_PROJECT_MODEL_READY", summary.targetFramework === "net8.0-windows8.0"
      && summary.languageVersion === "12"
      && summary.nullable === "enable"
      && summary.packageReferenceCount === 2
      && summary.privateAssetsAllCount === 2
      && summary.sdkVersionMatchCount === 2),
    check("HIA_WP51_BUILD_ARTIFACTS_READY", summary.buildArtifactCount === 2
      && summary.vsixArtifactCount === 1
      && summary.extensionAssemblyArtifactCount === 1
      && summary.vsixSizeBytes > 0
      && summary.extensionAssemblySizeBytes > 0),
    check("HIA_WP51_COMMAND_TOOL_WINDOW_READY", summary.sourceFileCount >= 7
      && summary.visualStudioContributionCount >= 3
      && summary.commandImplemented
      && summary.toolWindowImplemented
      && summary.bilingualSurfacePresent),
    check("HIA_WP51_DEFERRED_SURFACES_NOT_PRETENDED", !summary.languageServerProviderImplemented
      && summary.actualVisualStudioRuntimeCaptureExecutedCount === 0
      && summary.experimentalInstanceExecutedCount === 0
      && summary.vsixInstalledCount === 0),
    check("HIA_WP51_NO_WRITE_NETWORK_OR_PRIVATE_SOURCE", !summary.workspaceWriteCodePresent
      && summary.providerNetworkExecutedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.sourceBodyOutputCount === 0
      && summary.pathExposureCount === 0
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
  return `# W-P51.2 Visual Studio VSIX Skeleton

## 中文摘要

HIA Documentation Visual Studio 扩展已从 contract-only skeleton 升级为真实可构建工程。当前具备稳定 Extension identity、View > Other Windows 命令、单实例 Tool Window、Remote UI XAML 与双语只读状态模型。

本阶段已生成 VSIX，但没有安装 VSIX、启动 Experimental Instance、连接 LSP、调用 host editor API 或取得工作区写权限。

## Evidence

- status: \`${evidence.status}\`
- target framework: \`${summary.targetFramework}\`
- package references / PrivateAssets all: ${summary.packageReferenceCount} / ${summary.privateAssetsAllCount}
- VSIX / extension assembly: ${summary.vsixArtifactCount} / ${summary.extensionAssemblyArtifactCount}
- VSIX size: ${summary.vsixSizeBytes} bytes
- source surface files: ${summary.sourceFileCount}
- VisualStudioContribution count: ${summary.visualStudioContributionCount}
- command / tool window / bilingual surface: ${summary.commandImplemented} / ${summary.toolWindowImplemented} / ${summary.bilingualSurfacePresent}
- LSP provider / runtime capture / VSIX install: ${summary.languageServerProviderImplemented} / ${summary.actualVisualStudioRuntimeCaptureExecutedCount} / ${summary.vsixInstalledCount}
- workspace write / target mutation / source body: ${summary.workspaceWriteCodePresent} / ${summary.targetRepositoryMutationCount} / ${summary.sourceBodyOutputCount}
`;
}

function renderNextStageInputs(evidence) {
  return `# W-P51.3 Inputs

## 中文摘要

W-P51.3 可在现有 buildable VSIX 上实现真正的本地化 authoring/review Tool Window。继续保持 LSP、宿主写入和真实 runtime capture 分阶段推进。

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
