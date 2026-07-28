import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const inputPaths = {
  baseline: path.join(appRoot, "implementation-baseline.json"),
  hostContract: path.join(appRoot, "host-contract.json"),
  packageJson: path.join(appRoot, "package.json"),
  reviewSurface: path.join(appRoot, "review-surface.json"),
  visualStudioCheck: path.join(rootDir, "dist", "visual-studio-extension-check.json"),
  wp50Closeout: path.join(rootDir, "dist", "wp50-closeout-wp51-inputs", "evidence.json")
};
const outputRoot = path.join(rootDir, "dist", "wp51-visual-studio-authoring-foundation-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const reportPath = path.join(outputRoot, "visual-studio-authoring-foundation-intake.md");
const nextStagePath = path.join(outputRoot, "wp51-vsix-skeleton-inputs.md");

await main();

/**
 * 准备 W-P51.1 Visual Studio authoring foundation intake evidence。
 * Prepare W-P51.1 Visual Studio authoring foundation intake evidence.
 *
 * @lang zh-CN 本阶段冻结 VisualStudio.Extensibility 实现路线、兼容矩阵、
 * 本机 SDK/workload 能力与许可证门。它不会添加 NuGet PackageReference、
 * 构建 VSIX、启动 Visual Studio、读取源码正文或取得工作区写权限。
 * @lang en This stage freezes the VisualStudio.Extensibility implementation
 * route, compatibility matrix, local SDK/workload capability, and license
 * gate. It does not add NuGet PackageReferences, build a VSIX, launch Visual
 * Studio, read source bodies, or obtain workspace write authority.
 *
 * @returns {Promise<void>} Writes public-safe W-P51.1 evidence and handoff docs.
 */
async function main() {
  const inputs = await readInputs();
  const toolchain = await auditLocalToolchain();
  const summary = createSummary(inputs, toolchain);
  const checks = createChecks(inputs, summary);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp51-visual-studio-authoring-foundation-intake",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P51.1",
    status: hardFailures.length === 0
      ? inputs.baseline.licenseGate.userAcceptanceRecorded
        ? "ready-for-wp51-vsix-skeleton"
        : "ready-for-wp51-vsix-sdk-license-confirmation"
      : "blocked-by-wp51-visual-studio-foundation-intake",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    routeDecision: {
      selectedModel: inputs.baseline.selectedRoute.model,
      sdkPackage: inputs.baseline.selectedRoute.sdkPackage,
      buildPackage: inputs.baseline.selectedRoute.buildPackage,
      packageVersion: inputs.baseline.selectedRoute.packageVersion,
      targetFramework: inputs.baseline.selectedRoute.targetFramework,
      toolWindowSurface: inputs.baseline.hostArchitecture.toolWindowSurface,
      languageServerSurface: inputs.baseline.hostArchitecture.languageServerSurface,
      compatibility: inputs.baseline.compatibility
    },
    localToolchain: toolchain,
    licenseGate: inputs.baseline.licenseGate,
    currentImplementation: inputs.baseline.currentImplementation,
    executionPolicy: {
      policy: "wp51-foundation-intake-only",
      hiaMayAddSdkPackageReference: false,
      hiaMayBuildVsix: false,
      hiaMayLaunchVisualStudio: false,
      hiaMayCallHostEditorApi: false,
      hiaMayModifySourceAnnotations: false,
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
        phase: "W-P51.2",
        id: "visual-studio-sdk-license-confirmation",
        status: inputs.baseline.licenseGate.userAcceptanceRecorded
          ? "completed"
          : "user-confirmation-required",
        goalZh: "确认仅将 Microsoft Visual Studio Extensibility SDK 作为 PrivateAssets=all 的构建依赖，并接受对应 Microsoft Visual Studio Add-ons and Extensions 许可证。",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P51.2",
        id: "buildable-vsix-skeleton",
        status: inputs.baseline.licenseGate.userAcceptanceRecorded
          ? "ready-input"
          : "ready-after-license-confirmation",
        goalZh: "建立最小可构建 VSIX、命令入口和空 Tool Window；仍不接入工作区写入。",
        writeAuthorityGranted: false
      }
    ],
    generatedDocs: {
      intakeReport: normalizePath(reportPath),
      nextStageInputs: normalizePath(nextStagePath)
    }
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);

  assertNoPrivateMarkers(serializedEvidence, "W-P51.1 evidence");
  assert.equal(hardFailures.length, 0, `W-P51.1 has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reportPath, renderReport(evidence), "utf8");
  await writeFile(nextStagePath, renderNextStageInputs(evidence), "utf8");
  console.log(`W-P51.1 Visual Studio foundation evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P51.1 status: ${evidence.status}`);
}

/**
 * 读取上游 evidence 与 Visual Studio 实现基线。
 * Read upstream evidence and the Visual Studio implementation baseline.
 *
 * @returns {Promise<Record<string, object>>} Parsed input documents.
 */
async function readInputs() {
  const entries = await Promise.all(
    Object.entries(inputPaths).map(async ([key, value]) => [key, JSON.parse(await readFile(value, "utf8"))])
  );
  return Object.fromEntries(entries);
}

/**
 * 只保留版本和 workload 能力，不把安装路径写入 evidence。
 * Keep only versions and workload capabilities; never serialize install paths.
 *
 * @returns {Promise<object>} Public-safe local toolchain facts.
 */
async function auditLocalToolchain() {
  const dotnetSdks = execFileSync("dotnet", ["--list-sdks"], { encoding: "utf8" })
    .split(/\r?\n/u)
    .map((line) => line.trim().match(/^(\d+\.\d+\.\d+)/u)?.[1])
    .filter(Boolean);
  const vswherePath = await findVswhere();
  const instances = JSON.parse(execFileSync(vswherePath, [
    "-products",
    "*",
    "-requires",
    "Microsoft.VisualStudio.Component.VSSDK",
    "Microsoft.VisualStudio.Workload.VisualStudioExtension",
    "-format",
    "json",
    "-utf8"
  ], { encoding: "utf8" }));
  const visualStudioInstances = instances.map((instance) => ({
    displayName: instance.displayName,
    installationVersion: instance.installationVersion,
    major: Number.parseInt(instance.installationVersion.split(".")[0], 10),
    extensionWorkloadReady: true,
    vssdkReady: true
  }));

  return {
    auditStatus: "completed",
    dotnetSdkVersions: dotnetSdks,
    requiredTargetFrameworkSdkAvailable: dotnetSdks.some((version) => version.startsWith("8.")),
    visualStudioInstances,
    validatedIdeMajors: [...new Set(visualStudioInstances.map((instance) => instance.major))].sort(),
    localPathSerialized: false
  };
}

/**
 * 查找官方 Visual Studio Installer 随附的 vswhere，不暴露命中的绝对路径。
 * Locate the official Visual Studio Installer vswhere without exposing its path.
 *
 * @returns {Promise<string>} Local executable path used only for this process.
 */
async function findVswhere() {
  const candidates = [
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft Visual Studio", "Installer", "vswhere.exe"),
    path.join(process.env.ProgramFiles ?? "", "Microsoft Visual Studio", "Installer", "vswhere.exe")
  ].filter((candidate) => candidate.length > 0);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // <lang><zh-CN>继续检查下一个标准安装位置。</zh-CN><en>Continue with the next standard install location.</en></lang>
    }
  }
  throw new Error("vswhere.exe was not found in a standard Visual Studio Installer location.");
}

function createSummary(inputs, toolchain) {
  const baseline = inputs.baseline;
  const implementation = baseline.currentImplementation;
  const privacy = baseline.privacy;

  return {
    wp50CloseoutReady: inputs.wp50Closeout.status === "ready-for-wp51-planning",
    visualStudioCheckReady: inputs.visualStudioCheck.contract === "hia-visual-studio-extension-check",
    hostContractStatus: inputs.hostContract.status,
    packagePrivate: inputs.packageJson.private === true,
    selectedRoute: baseline.selectedRoute.model,
    officialReferenceCount: baseline.officialReferences.length,
    targetProductCount: baseline.compatibility.targetProducts.length,
    validatedIdeMajorCount: toolchain.validatedIdeMajors.length,
    extensionWorkloadReadyCount: toolchain.visualStudioInstances.filter((item) => item.extensionWorkloadReady).length,
    vssdkReadyCount: toolchain.visualStudioInstances.filter((item) => item.vssdkReady).length,
    dotnetSdkCount: toolchain.dotnetSdkVersions.length,
    targetFrameworkSdkAvailable: toolchain.requiredTargetFrameworkSdkAvailable,
    licenseAuditCompleted: baseline.licenseGate.auditStatus === "reviewed",
    licenseAcceptanceRequired: baseline.licenseGate.requireLicenseAcceptance,
    userLicenseAcceptanceRecorded: baseline.licenseGate.userAcceptanceRecorded,
    nextStageRequiresUserConfirmation: baseline.licenseGate.userAcceptanceRequiredBeforePackageReference
      && !baseline.licenseGate.userAcceptanceRecorded,
    projectFileCreatedCount: Number(implementation.projectFileCreated),
    sdkPackageReferenceAddedCount: Number(implementation.sdkPackageReferenceAdded),
    toolWindowImplementedCount: Number(implementation.toolWindowImplemented),
    languageServerProviderImplementedCount: Number(implementation.languageServerProviderImplemented),
    vsixBuiltCount: Number(implementation.vsixBuilt),
    experimentalInstanceExecutedCount: Number(implementation.experimentalInstanceExecuted),
    runtimeCaptureExecutedCount: Number(implementation.runtimeCaptureExecuted),
    sourceBodyIncludedCount: Number(privacy.sourceBodyIncluded),
    pathExposureCount: Number(privacy.absolutePathIncluded || toolchain.localPathSerialized),
    providerNetworkExecutedCount: Number(privacy.providerNetworkExecuted),
    hostEditorApiCalledCount: Number(privacy.hostEditorApiCalled),
    workspaceWriteAllowedCount: Number(privacy.workspaceWriteAllowed),
    targetRepositoryMutationCount: Number(privacy.targetRepositoryMutationAllowed),
    checkedApplyWriteEnabledCount: Number(privacy.checkedApplyWriteEnabled),
    sourcesContentPolicy: privacy.sourcesContentPolicy,
    baselinePhase: baseline.phase,
    nextStageReadyAfterConfirmation: true
  };
}

function createChecks(inputs, summary) {
  return [
    check("HIA_WP51_INPUTS_READY", summary.wp50CloseoutReady && summary.visualStudioCheckReady
      && [
        "skeleton",
        "buildable-vsix-skeleton",
        "localized-review-tool-window"
      ].includes(summary.hostContractStatus)
      && summary.packagePrivate),
    check("HIA_WP51_ROUTE_FROZEN", summary.selectedRoute === "visualstudio-extensibility-out-of-process"
      && summary.officialReferenceCount >= 7 && summary.targetProductCount === 2),
    check("HIA_WP51_LOCAL_TOOLCHAIN_READY", summary.targetFrameworkSdkAvailable
      && summary.validatedIdeMajorCount >= 2
      && summary.extensionWorkloadReadyCount >= 2
      && summary.vssdkReadyCount >= 2),
    check("HIA_WP51_LICENSE_GATE_EXPLICIT", summary.licenseAuditCompleted
      && summary.licenseAcceptanceRequired
      && (summary.userLicenseAcceptanceRecorded
        ? !summary.nextStageRequiresUserConfirmation
        : summary.nextStageRequiresUserConfirmation)),
    check("HIA_WP51_IMPLEMENTATION_STATE_HONEST",
      (summary.baselinePhase === "W-P51.1"
        ? summary.projectFileCreatedCount === 0
          && summary.sdkPackageReferenceAddedCount === 0
          && summary.toolWindowImplementedCount === 0
          && summary.vsixBuiltCount === 0
        : summary.projectFileCreatedCount === 1
          && summary.sdkPackageReferenceAddedCount === 1
          && summary.toolWindowImplementedCount === 1
          && summary.vsixBuiltCount === 1)
      && summary.languageServerProviderImplementedCount === 0
      && summary.experimentalInstanceExecutedCount === 0
      && summary.runtimeCaptureExecutedCount === 0),
    check("HIA_WP51_NO_WRITE_NETWORK_OR_PRIVATE_SOURCE", summary.sourceBodyIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.hostEditorApiCalledCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.sourcesContentPolicy === "none"),
    check("HIA_WP51_NEXT_STAGE_GATED", inputs.baseline.licenseGate.userAcceptanceRequiredBeforePackageReference
      && summary.nextStageReadyAfterConfirmation
      && (summary.userLicenseAcceptanceRecorded || summary.nextStageRequiresUserConfirmation))
  ];
}

function check(id, passed) {
  return {
    id,
    status: passed ? "pass" : "fail"
  };
}

function renderReport(evidence) {
  const summary = evidence.summary;
  return `# W-P51.1 Visual Studio Authoring Foundation Intake

## 中文摘要

W-P51.1 已冻结 Visual Studio 实体扩展的第一轮路线：使用 out-of-process \`VisualStudio.Extensibility\`，目标 \`net8.0-windows8.0\`，SDK/Build 包版本 \`17.14.40608\`，并保持 \`PrivateAssets=all\`。本机同时具备 Visual Studio 2022/2026 的 VSSDK 与扩展开发 workload，也具备 .NET 8 SDK。

当前实现状态由同一 baseline 如实记录。许可证未确认时，W-P51.2 必须等待用户接受；许可证已经确认并推进到后续阶段时，本 intake 仍可重放路线与工具链审计，但不会把后续工程误记为 W-P51.1 的原始交付。

## Evidence

- status: \`${evidence.status}\`
- official references: ${summary.officialReferenceCount}
- validated IDE majors: ${summary.validatedIdeMajorCount}
- extension workload ready: ${summary.extensionWorkloadReadyCount}
- VSSDK ready: ${summary.vssdkReadyCount}
- .NET SDK versions: ${summary.dotnetSdkCount}
- license audit completed: ${summary.licenseAuditCompleted}
- user license acceptance recorded: ${summary.userLicenseAcceptanceRecorded}
- project / package reference / VSIX built: ${summary.projectFileCreatedCount} / ${summary.sdkPackageReferenceAddedCount} / ${summary.vsixBuiltCount}
- runtime capture / workspace write / target mutation: ${summary.runtimeCaptureExecutedCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount}
- sourcesContent policy: \`${summary.sourcesContentPolicy}\`
`;
}

function renderNextStageInputs(evidence) {
  return `# W-P51.2 Inputs

## 中文摘要

W-P51.2 的许可证门状态由 baseline 记录。确认后可建立或验证最小可构建 VSIX skeleton、Command 与空 Tool Window；仍不启用工作区写入、checked apply、provider network 或目标仓库修改。

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
