import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(rootDir, "apps", "visual-studio-extension");
const packagePath = path.join(appRoot, "package.json");
const readmePath = path.join(appRoot, "README.md");
const hostContractPath = path.join(appRoot, "host-contract.json");
const implementationBaselinePath = path.join(appRoot, "implementation-baseline.json");
const reviewSurfacePath = path.join(appRoot, "review-surface.json");
const runtimeCapturePath = path.join(appRoot, "runtime-capture", "capture.json");
const projectPath = path.join(appRoot, "HiaDocumentation.VisualStudio.csproj");
const extensionEntrypointPath = path.join(appRoot, "ExtensionEntrypoint.cs");
const commandPath = path.join(appRoot, "ShowDocumentationToolWindowCommand.cs");
const toolWindowPath = path.join(appRoot, "DocumentationToolWindow.cs");
const remoteControlPath = path.join(appRoot, "DocumentationToolWindowControl.cs");
const remoteDataPath = path.join(appRoot, "DocumentationToolWindowData.cs");
const remoteXamlPath = path.join(appRoot, "DocumentationToolWindowControl.xaml");
const localizedStringsPath = path.join(appRoot, "LocalizedStrings.cs");
const languageServerProviderPath = path.join(appRoot, "HiaLanguageServerProvider.cs");
const languageServerRuntimeLauncherPath = path.join(appRoot, "LanguageServerRuntimeLauncher.cs");
const languageServerRuntimeStatePath = path.join(appRoot, "LanguageServerRuntimeState.cs");
const authoringProjectionProbePath = path.join(appRoot, "AuthoringProjectionProbe.cs");
const authoringProjectionFixturePath = path.join(appRoot, "authoring-probe.hia.json");
const runtimePreparationPath = path.join(rootDir, "scripts", "prepare-visual-studio-lsp-runtime.mjs");
const reviewSnapshotPath = path.join(appRoot, "ReviewSurfaceSnapshot.cs");
const neutralResourcesPath = path.join(appRoot, "Resources.resx");
const simplifiedChineseResourcesPath = path.join(appRoot, "Resources.zh-Hans.resx");
const stringResourcesPath = path.join(appRoot, ".vsextension", "string-resources.json");
const zhCnStringResourcesPath = path.join(
  appRoot,
  ".vsextension",
  "zh-CN",
  "string-resources.json");
const zhHansStringResourcesPath = path.join(
  appRoot,
  ".vsextension",
  "zh-Hans",
  "string-resources.json");
const evidencePath = path.join(rootDir, "dist", "visual-studio-extension-check.json");

await main();

/**
 * 校验 Visual Studio host skeleton 的位置、契约映射和隐私边界。
 * Validate the Visual Studio host skeleton placement, contract mapping, and privacy boundary.
 */
async function main() {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const readme = await readFile(readmePath, "utf8");
  const contract = JSON.parse(await readFile(hostContractPath, "utf8"));
  const implementationBaseline = JSON.parse(await readFile(implementationBaselinePath, "utf8"));
  const reviewSurface = JSON.parse(await readFile(reviewSurfacePath, "utf8"));
  const runtimeCapture = JSON.parse(await readFile(runtimeCapturePath, "utf8"));
  const implementationFiles = await readImplementationFiles();

  assert.equal(packageJson.name, "@hia-doc/visual-studio-extension", "Visual Studio host package name must be stable.");
  assert.equal(packageJson.private, true, "Visual Studio skeleton must not be publishable yet.");
  assert.equal(packageJson.scripts?.check, "node ../../scripts/check-visual-studio-extension.mjs", "Visual Studio app check script must call the shared checker.");
  assert.equal(packageJson.scripts?.build, "node ../../scripts/prepare-visual-studio-lsp-runtime.mjs && dotnet build HiaDocumentation.VisualStudio.csproj --configuration Debug --nologo", "Visual Studio app must stage the audited LSP runtime before building.");
  assert.equal(packageJson.dependencies, undefined, "Visual Studio skeleton must not add runtime npm dependencies.");
  assert.equal(packageJson.devDependencies, undefined, "Visual Studio skeleton must not add npm dev dependencies.");
  assert.equal(contract.contract, "hia-visual-studio-host-skeleton", "Visual Studio host contract must be explicit.");
  assert.equal(contract.contractVersion, "0.1.0-draft", "Visual Studio host contract version must be explicit.");
  assert.equal(contract.appDirectory, "apps/visual-studio-extension", "Visual Studio host must live under main-repo/apps.");
  assert.equal(contract.host?.model, "hybrid", "Visual Studio host must use the planned hybrid model.");
  assert.equal(contract.status, "install-runtime-captured", "Visual Studio host must expose the runtime-captured status.");
  assert.equal(contract.runtime?.preparationStatus, "install-runtime-captured", "Visual Studio runtime must expose the runtime-captured status.");
  assert.equal(contract.runtime?.actualVisualStudioRuntimeCaptureExecuted, true, "W-P51.6 must record real runtime capture.");
  assert.equal(contract.runtime?.visualStudioExtensionPackageBuilt, true, "Visual Studio skeleton must record the verified VSIX build.");
  assert.equal(contract.runtime?.experimentalInstanceExecuted, true, "W-P51.6 must record experimental instance execution.");
  assert.equal(contract.runtime?.dependencyLicenseAuditRequiredBeforeVsix, true, "Visual Studio VSIX route must require dependency and license audit before implementation.");
  assert.equal(contract.runtime?.dependencyLicenseAuditCompleted, true, "Visual Studio VSIX route must record the completed dependency audit.");
  assert.equal(contract.runtime?.userLicenseAcceptanceRecorded, true, "Visual Studio VSIX route must record SDK license acceptance.");
  assert.equal(contract.runtime?.toolWindowImplemented, true, "Visual Studio host must implement the W-P51 tool window.");
  assert.equal(contract.runtime?.localizedReviewToolWindowImplemented, true, "Visual Studio host must implement the W-P51.3 localized review surface.");
  assert.equal(contract.runtime?.reviewSurfaceContractEmbedded, true, "Visual Studio host must embed the read-only review contract.");
  assert.deepEqual(contract.runtime?.remoteUiLocalizationCultures, ["en-US", "zh-Hans"], "Visual Studio Remote UI cultures must remain explicit.");
  assert.deepEqual(contract.runtime?.metadataLocalizationCultures, ["zh-CN", "zh-Hans"], "Visual Studio metadata cultures must cover both Simplified Chinese culture routes.");
  assert.equal(contract.runtime?.languageServerProviderImplemented, true, "W-P51.4 must implement the language server provider.");
  assert.equal(contract.runtime?.languageServer?.package, "@hia-doc/lsp", "Visual Studio host must delegate LSP features to @hia-doc/lsp.");
  assert.equal(contract.runtime?.languageServer?.packageVersion, "0.1.0", "Visual Studio host must pin the packaged LSP version.");
  assert.equal(contract.runtime?.languageServer?.transport, "stdio", "Visual Studio host must use stdio transport.");
  assert.equal(contract.runtime?.languageServer?.vsixRelativePath, "runtime/lsp/dist/node.js", "Visual Studio host must use a VSIX-relative LSP entry.");
  assert.equal(contract.runtime?.languageServer?.nodeEngine, ">=20.19.0", "Visual Studio host must declare the Node.js runtime prerequisite.");
  assert.deepEqual(contract.runtime?.languageServer?.activationFileExtensions, [".hia.json", ".docmap.json"], "Visual Studio host must activate only for HIA document files.");
  assert.equal(contract.runtime?.languageServer?.runtimeDeployment, "pnpm-legacy-hoisted-production-deploy", "Visual Studio host must use a hoisted deployment that survives VSIX extraction.");
  assert.equal(contract.runtime?.languageServer?.selfContainedAfterVsixExtraction, true, "Visual Studio host must package a self-contained language-server runtime.");
  assert.equal(contract.runtime?.languageServer?.symbolicLinkCount, 0, "Visual Studio host must not package symbolic-link-dependent runtime files.");
  assert.equal(contract.runtime?.languageServer?.publicDiagnosticPolicy, "stable-reason-codes-only", "Visual Studio host must expose public-safe LSP diagnostics.");
  assert.equal(contract.runtime?.authoringProjectionImplemented, true, "W-P51.5 must implement the authoring/remediation projection.");
  assert.equal(contract.runtime?.authoringProjectionSession, "isolated-read-only-lsp-session", "W-P51.5 projection must use an isolated read-only LSP session.");
  assert.equal(contract.runtime?.authoringProjectionFixture, "synthetic-public-fixture", "W-P51.5 projection must use a synthetic public fixture.");
  assert.equal(contract.runtime?.authoringProjectionRequestCount, 3, "W-P51.5 projection must issue the three audited custom requests.");
  assert.equal(contract.runtime?.cli?.package, "@hia-doc/cli", "Visual Studio host must delegate builds to @hia-doc/cli.");
  assertAuthoringProjectionBoundary(contract.authoringProjection);
  assertImplementationBaseline(implementationBaseline);
  assertRuntimeCapture(contract, runtimeCapture);
  assertImplementationFiles(implementationFiles);
  assertRequiredMethods(contract.customRequests);
  assertHostResultMetadata(contract.hostResultMetadata);
  assertReviewSurface(contract, reviewSurface);
  assertPrivacy(contract.privacy);
  assert.match(readme, /VisualStudio\.Extensibility/u, "README must name the VisualStudio.Extensibility route.");
  assert.match(readme, /@hia-doc\/lsp/u, "README must name the LSP dependency boundary.");
  assert.match(readme, /does not parse language source/u, "README must preserve the no-parser host boundary.");
  assert.match(readme, /review-surface\.json/u, "README must document the Visual Studio review surface input.");
  assert.match(readme, /System\.Text\.Json/u, "README must document structured contract loading.");
  assert.match(readme, /zh-Hans/u, "README must document Simplified Chinese localization.");
  assert.match(readme, /runtime\/lsp\/dist\/node\.js/u, "README must document the packaged LSP entry.");
  assert.match(readme, /Node\.js `>=20\.19\.0`/u, "README must document the Node.js prerequisite.");
  assert.match(readme, /Live Authoring/u, "README must document the W-P51.5 live authoring surface.");
  assert.match(readme, /isolated, short-lived LSP projection session/u, "README must document the isolated projection session.");
  assert.match(readme, /hia\/documentAuthoringLocations/u, "README must document the authoring-locations request.");
  assert.match(readme, /\/OopExtDebug/u, "README must document the audited out-of-process experimental deployment route.");
  assert.match(readme, /Visual Studio 2022/u, "README must document the Visual Studio 2022 capture.");
  assert.match(readme, /Visual Studio 2026/u, "README must document the Visual Studio 2026 capture.");
  assert.match(readme, /ordinary Visual Studio instances were not modified/u, "README must preserve the ordinary-instance installation boundary.");

  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify({
    contract: "hia-visual-studio-extension-check",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    app: {
      directory: contract.appDirectory,
      packageName: packageJson.name,
      private: packageJson.private
    },
    host: {
      model: contract.host.model,
      primaryRoute: contract.host.primaryRoute,
      targetIde: contract.host.targetIde
    },
    runtimePreparation: {
      preparationStatus: contract.runtime.preparationStatus,
      actualVisualStudioRuntimeCaptureExecuted: contract.runtime.actualVisualStudioRuntimeCaptureExecuted,
      visualStudioExtensionPackageBuilt: contract.runtime.visualStudioExtensionPackageBuilt,
      experimentalInstanceExecuted: contract.runtime.experimentalInstanceExecuted,
      dependencyLicenseAuditRequiredBeforeVsix: contract.runtime.dependencyLicenseAuditRequiredBeforeVsix,
      dependencyLicenseAuditCompleted: contract.runtime.dependencyLicenseAuditCompleted,
      userLicenseAcceptanceRecorded: contract.runtime.userLicenseAcceptanceRecorded,
      toolWindowImplemented: contract.runtime.toolWindowImplemented,
      localizedReviewToolWindowImplemented: contract.runtime.localizedReviewToolWindowImplemented,
      reviewSurfaceContractEmbedded: contract.runtime.reviewSurfaceContractEmbedded,
      remoteUiLocalizationCultures: contract.runtime.remoteUiLocalizationCultures,
      metadataLocalizationCultures: contract.runtime.metadataLocalizationCultures,
      languageServerProviderImplemented: contract.runtime.languageServerProviderImplemented,
      authoringProjectionImplemented: contract.runtime.authoringProjectionImplemented,
      authoringProjectionSession: contract.runtime.authoringProjectionSession,
      authoringProjectionFixture: contract.runtime.authoringProjectionFixture,
      authoringProjectionRequestCount: contract.runtime.authoringProjectionRequestCount,
      languageServer: contract.runtime.languageServer
    },
    runtimeCapture: {
      contract: runtimeCapture.contract,
      contractVersion: runtimeCapture.contractVersion,
      phase: runtimeCapture.phase,
      status: runtimeCapture.status,
      deployment: runtimeCapture.deployment,
      vsix: runtimeCapture.vsix,
      hosts: runtimeCapture.hosts.map((host) => ({
        id: host.id,
        product: host.product,
        version: host.version,
        ideMajor: host.ideMajor,
        captureState: host.captureState,
        experimentalInstanceExecuted: host.experimentalInstanceExecuted,
        commandVisible: host.commandVisible,
        localizedToolWindowVisible: host.localizedToolWindowVisible,
        languageServer: host.languageServer,
        liveAuthoring: host.liveAuthoring,
        screenshots: host.screenshots,
        hostObservation: host.hostObservation
      })),
      safety: runtimeCapture.safety,
      summary: runtimeCapture.summary
    },
    implementationBaseline: {
      contract: implementationBaseline.contract,
      contractVersion: implementationBaseline.contractVersion,
      status: implementationBaseline.status,
      selectedRoute: implementationBaseline.selectedRoute,
      compatibility: implementationBaseline.compatibility,
      licenseGate: implementationBaseline.licenseGate,
      currentImplementation: implementationBaseline.currentImplementation,
      privacy: implementationBaseline.privacy,
      officialReferenceCount: implementationBaseline.officialReferences.length
    },
    hostResultMetadata: contract.hostResultMetadata,
    authoringProjectionBoundary: contract.authoringProjection,
    reviewSurface: {
      contract: reviewSurface.contract,
      contractVersion: reviewSurface.contractVersion,
      status: reviewSurface.status,
      surfaceId: reviewSurface.surface.id,
      payloadContract: reviewSurface.surface.payloadContract,
      editCandidateContract: reviewSurface.surface.editCandidateContract,
      editDiffPreviewContract: reviewSurface.surface.editDiffPreviewContract,
      editApplyPreflightContract: reviewSurface.surface.editApplyPreflightContract,
      applyPreview: reviewSurface.applyPreview,
      authoringProjection: reviewSurface.authoringProjection,
      generatedDocumentationBindingProjection: reviewSurface.generatedDocumentationBindingProjection,
      checkedApplyConfirmation: reviewSurface.checkedApplyConfirmation,
      hostApplyUx: reviewSurface.hostApplyUx,
      providerReviewPanel: reviewSurface.providerReviewPanel,
      targetCollaboration: reviewSurface.targetCollaboration,
      targetOwnerEvidenceView: reviewSurface.targetOwnerEvidenceView,
      viewCount: reviewSurface.views.length,
      actionCount: reviewSurface.actions.length,
      disabledApply: reviewSurface.actions.some((action) => action.id === "apply-candidate" && action.available === false),
      languageMarkers: reviewSurface.languageAuthoringHints.canonicalMarkers,
      targetScenarios: reviewSurface.targetScenarios.map((scenario) => scenario.id)
    },
    privacy: contract.privacy,
    requests: contract.customRequests.map((request) => ({
      capability: request.capability,
      method: request.method,
      requiresHostMetadata: Boolean(request.requiresHostMetadata),
      version: request.version
    }))
  }, null, 2)}\n`, "utf8");
  console.log(`Visual Studio extension check passed at ${path.relative(rootDir, evidencePath).replaceAll("\\", "/")}`);
}

/**
 * 读取实体 VSIX skeleton 文件，但不把源码正文写入 evidence。
 * Read the concrete VSIX skeleton files without writing source bodies to evidence.
 *
 * @returns {Promise<Record<string, string>>} Source text used only by assertions.
 */
async function readImplementationFiles() {
  const entries = await Promise.all([
    ["project", projectPath],
    ["extensionEntrypoint", extensionEntrypointPath],
    ["command", commandPath],
    ["toolWindow", toolWindowPath],
    ["remoteControl", remoteControlPath],
    ["remoteData", remoteDataPath],
    ["remoteXaml", remoteXamlPath],
    ["localizedStrings", localizedStringsPath],
    ["languageServerProvider", languageServerProviderPath],
    ["languageServerRuntimeLauncher", languageServerRuntimeLauncherPath],
    ["languageServerRuntimeState", languageServerRuntimeStatePath],
    ["authoringProjectionProbe", authoringProjectionProbePath],
    ["authoringProjectionFixture", authoringProjectionFixturePath],
    ["runtimePreparation", runtimePreparationPath],
    ["reviewSnapshot", reviewSnapshotPath],
    ["neutralResources", neutralResourcesPath],
    ["simplifiedChineseResources", simplifiedChineseResourcesPath],
    ["stringResources", stringResourcesPath],
    ["zhCnStringResources", zhCnStringResourcesPath],
    ["zhHansStringResources", zhHansStringResourcesPath]
  ].map(async ([key, filePath]) => [key, await readFile(filePath, "utf8")]));

  return Object.fromEntries(entries);
}

/**
 * 校验 Command、Tool Window、本地化 Remote UI 与只读合同边界。
 * Validate the Command, Tool Window, localized Remote UI, and read-only contract boundary.
 *
 * @param {Record<string, string>} files Concrete implementation source text.
 * @returns {void}
 */
function assertImplementationFiles(files) {
  assert.match(files.project, /Microsoft\.VisualStudio\.Extensibility\.Sdk/u, "Visual Studio project must reference the Extensibility SDK.");
  assert.match(files.project, /Microsoft\.VisualStudio\.Extensibility\.Build/u, "Visual Studio project must reference the Extensibility Build package.");
  assert.match(files.project, /PrivateAssets="all"/u, "Visual Studio SDK packages must remain private build assets.");
  assert.match(files.project, /net8\.0-windows8\.0/u, "Visual Studio project must target the audited framework.");
  assert.match(files.project, /HiaDocumentation\.VisualStudio\.review-surface\.json/u, "Visual Studio project must embed the review contract with a stable logical name.");
  assert.match(files.project, /HiaDocumentation\.VisualStudio\.authoring-probe\.hia\.json/u, "Visual Studio project must embed the synthetic authoring fixture with a stable logical name.");
  assert.match(files.project, /\.runtime\\lsp\\\*\*\\\*/u, "Visual Studio project must package the staged LSP runtime.");
  assert.match(files.project, /runtime\\lsp\\%\(RecursiveDir\)/u, "Visual Studio project must preserve the stable VSIX runtime layout.");
  assert.match(files.extensionEntrypoint, /\[VisualStudioContribution\]/u, "Visual Studio extension entry point must be contributed.");
  assert.match(files.extensionEntrypoint, /HiaDocumentation\.VisualStudio\.f56aeeb6-e79c-4656-a536-dbdc9acfbdb6/u, "Visual Studio extension identity must remain stable.");
  assert.match(files.command, /ShowToolWindowAsync<DocumentationToolWindow>/u, "Visual Studio command must open the HIA tool window.");
  assert.match(files.toolWindow, /AllowAutoCreation = false/u, "Visual Studio tool window must not auto-open in W-P51.2.");
  assert.match(files.toolWindow, /LocalizedStrings\.Get\("ToolWindowTitle"\)/u, "Visual Studio tool-window title must be localized.");
  assert.match(files.toolWindow, /ReviewSurfaceSnapshot\.Load\(\)/u, "Visual Studio tool window must load the embedded review contract.");
  assert.match(files.toolWindow, /RefreshAuthoringProjectionAsync/u, "Visual Studio tool window must refresh the live authoring projection.");
  assert.match(files.remoteControl, /RemoteUserControl/u, "Visual Studio tool window must use Remote UI.");
  assert.match(files.remoteData, /\[DataContract\]/u, "Visual Studio Remote UI data must be serializable.");
  assert.match(files.remoteData, /OverviewMetrics/u, "Visual Studio Remote UI must expose overview metrics.");
  assert.match(files.remoteData, /AuthoringMetrics/u, "Visual Studio Remote UI must expose authoring metrics.");
  assert.match(files.remoteData, /ReviewMetrics/u, "Visual Studio Remote UI must expose review metrics.");
  assert.match(files.remoteData, /SafetyMetrics/u, "Visual Studio Remote UI must expose safety metrics.");
  assert.match(files.remoteData, /LanguageServerMetrics/u, "Visual Studio Remote UI must expose live language-server metrics.");
  assert.match(files.remoteData, /ProjectionMetrics/u, "Visual Studio Remote UI must expose live authoring projection metrics.");
  assert.match(files.remoteData, /RefreshAuthoringProjectionAsync/u, "Visual Studio Remote UI must invoke the isolated authoring projection.");
  assert.match(files.remoteData, /W-P51\.5/u, "Visual Studio Remote UI must identify the current W-P51.5 phase.");
  assert.match(files.remoteData, /languageServerRuntimeState\.Changed \+=/u, "Visual Studio Remote UI must observe provider lifecycle changes.");
  assert.match(files.remoteXaml, /^<DataTemplate/u, "Visual Studio Remote UI XAML must use a DataTemplate.");
  assert.match(files.remoteXaml, /<TabControl/u, "Visual Studio Remote UI must use localized tabs.");
  assert.match(files.remoteXaml, /ItemsSource="\{Binding OverviewMetrics\}"/u, "Visual Studio Remote UI must project overview metrics.");
  assert.match(files.remoteXaml, /ItemsSource="\{Binding SafetyMetrics\}"/u, "Visual Studio Remote UI must project safety metrics.");
  assert.match(files.remoteXaml, /ItemsSource="\{Binding LanguageServerMetrics\}"/u, "Visual Studio Remote UI must project language-server metrics.");
  assert.match(files.remoteXaml, /Header="\{Binding ProjectionTab\}"/u, "Visual Studio Remote UI must expose the localized projection tab.");
  assert.match(files.remoteXaml, /ItemsSource="\{Binding ProjectionMetrics\}"/u, "Visual Studio Remote UI must project live authoring metrics.");
  assert.match(files.remoteXaml, /Text="\{Binding Boundary\}"/u, "Visual Studio Remote UI must project the boundary.");
  assert.match(files.localizedStrings, /ResourceManager/u, "Visual Studio Remote UI must use structured .NET resources.");
  assert.match(files.localizedStrings, /CurrentUICulture/u, "Visual Studio Remote UI must follow the host UI culture.");
  assert.match(files.reviewSnapshot, /System\.Text\.Json/u, "Visual Studio review contract must use a structured JSON parser.");
  assert.match(files.reviewSnapshot, /GetManifestResourceStream/u, "Visual Studio review contract must load from an embedded resource.");
  assert.match(files.reviewSnapshot, /HiaDocumentation\.VisualStudio\.review-surface\.json/u, "Visual Studio review contract resource name must remain stable.");
  assert.match(files.neutralResources, /<data name="OverviewTab"/u, "Visual Studio Remote UI must provide neutral English resources.");
  assert.match(files.neutralResources, /Workspace writes and target repository changes remain disabled/u, "Visual Studio neutral resources must preserve the no-write boundary.");
  assert.match(files.simplifiedChineseResources, /<data name="OverviewTab"/u, "Visual Studio Remote UI must provide Simplified Chinese resources.");
  assert.match(files.simplifiedChineseResources, /工作区写入和目标仓库变更仍保持禁用/u, "Visual Studio Chinese resources must preserve the no-write boundary.");
  assert.match(files.neutralResources, /Language Server/u, "Visual Studio Remote UI must provide neutral language-server resources.");
  assert.match(files.simplifiedChineseResources, /语言服务器/u, "Visual Studio Remote UI must provide Simplified Chinese language-server resources.");
  assert.match(files.neutralResources, /<data name="ProjectionTab"/u, "Visual Studio Remote UI must provide neutral projection resources.");
  assert.match(files.simplifiedChineseResources, /<data name="ProjectionTab"/u, "Visual Studio Remote UI must provide Simplified Chinese projection resources.");
  assert.match(files.stringResources, /"HiaDocumentation\.ShowToolWindow\.DisplayName": "HIA Documentation"/u, "Visual Studio command must expose neutral English metadata.");
  assert.match(files.zhCnStringResources, /"HiaDocumentation\.ShowToolWindow\.DisplayName": "HIA 文档化"/u, "Visual Studio command must expose zh-CN metadata.");
  assert.match(files.zhHansStringResources, /"HiaDocumentation\.ShowToolWindow\.DisplayName": "HIA 文档化"/u, "Visual Studio command must expose zh-Hans metadata.");
  assert.match(files.stringResources, /"HiaDocumentation\.LanguageServer\.DisplayName": "HIA Documentation Language Server"/u, "Visual Studio LSP provider must expose neutral English metadata.");
  assert.match(files.zhCnStringResources, /"HiaDocumentation\.LanguageServer\.DisplayName": "HIA 文档化语言服务器"/u, "Visual Studio LSP provider must expose zh-CN metadata.");
  assert.match(files.languageServerProvider, /class HiaLanguageServerProvider : LanguageServerProvider/u, "W-P51.4 must contribute a real LanguageServerProvider.");
  assert.match(files.languageServerProvider, /\[VisualStudioContribution\]/u, "Visual Studio LSP provider must be contributed.");
  assert.match(files.languageServerProvider, /CreateServerConnectionAsync/u, "Visual Studio LSP provider must create a server connection.");
  assert.match(files.languageServerProvider, /PipeReader\.Create\(process\.StandardOutput\.BaseStream\)/u, "Visual Studio LSP provider must read server stdout.");
  assert.match(files.languageServerProvider, /PipeWriter\.Create\(process\.StandardInput\.BaseStream\)/u, "Visual Studio LSP provider must write server stdin.");
  assert.match(files.languageServerProvider, /LanguageServerRuntimeLauncher\.ResolveLaunchTarget/u, "Visual Studio LSP provider must share the audited runtime resolver.");
  assert.match(files.languageServerProvider, /LanguageServerRuntimeLauncher\.CreateProcess/u, "Visual Studio LSP provider must share the audited process launcher.");
  assert.match(files.languageServerProvider, /FileExtensions = \["\.hia\.json", "\.docmap\.json"\]/u, "Visual Studio LSP provider must use dedicated HIA document extensions.");
  assert.match(files.languageServerRuntimeLauncher, /runtime[\s\S]*lsp[\s\S]*dist[\s\S]*node\.js/u, "Visual Studio runtime launcher must resolve the packaged runtime entry.");
  assert.match(files.languageServerRuntimeLauncher, /startInfo\.ArgumentList\.Add\("--stdio"\)/u, "Visual Studio runtime launcher must explicitly use stdio.");
  assert.match(files.languageServerProvider, /node-runtime-unavailable/u, "Visual Studio LSP provider must expose a stable Node.js failure code.");
  assert.match(files.authoringProjectionProbe, /hia\/ideCapabilities/u, "W-P51.5 projection must request IDE capabilities.");
  assert.match(files.authoringProjectionProbe, /hia\/documentAuthoringLocations/u, "W-P51.5 projection must request authoring locations.");
  assert.match(files.authoringProjectionProbe, /hia\/documentationEditProposals/u, "W-P51.5 projection must request documentation proposals.");
  assert.match(files.authoringProjectionProbe, /isolated-read-only/u, "W-P51.5 projection must publish its isolated read-only session mode.");
  assert.match(files.authoringProjectionProbe, /AllowsAutomaticWrites/u, "W-P51.5 projection must inspect the automatic-write privacy flag.");
  assert.match(files.authoringProjectionProbe, /IncludesSourceContent/u, "W-P51.5 projection must inspect the source-content privacy flag.");
  assert.match(files.authoringProjectionProbe, /node-runtime-unavailable/u, "W-P51.5 projection must expose a stable Node.js failure code.");
  assert.match(files.authoringProjectionFixture, /"schemaVersion": "0\.2\.0"/u, "W-P51.5 authoring fixture must use the HIA document schema.");
  assert.match(files.authoringProjectionFixture, /"id": "fixture\.wp51\.visual-studio-authoring-projection"/u, "W-P51.5 authoring fixture must keep a synthetic fixture identity.");
  assert.doesNotMatch(files.languageServerRuntimeState, /Exception|StackTrace|FullName/u, "Visual Studio LSP lifecycle state must not carry raw exceptions or paths.");
  assert.match(files.runtimePreparation, /--config\.node-linker=hoisted/u, "Visual Studio runtime staging must create a physical hoisted dependency tree.");
  assert.match(files.runtimePreparation, /corepack[\s\S]*dist[\s\S]*pnpm\.js/u, "Visual Studio runtime staging must prefer the stable Corepack JavaScript entry.");
  assert.match(files.runtimePreparation, /pnpm-legacy-hoisted-production-deploy/u, "Visual Studio runtime staging must record the audited deployment mode.");
  assert.match(files.runtimePreparation, /selfContainedAfterExtraction: true/u, "Visual Studio runtime manifest must declare extraction-safe self-containment.");
  assert.match(files.runtimePreparation, /symbolicLinkCount/u, "Visual Studio runtime staging must measure and reject symbolic links.");
  assert.match(files.runtimePreparation, /node_modules", "\.pnpm/u, "Visual Studio runtime staging must remove the pnpm virtual store.");
  assert.match(files.runtimePreparation, /containsAbsolutePaths: false/u, "Visual Studio runtime manifest must reject absolute path claims.");
  assert.doesNotMatch(Object.values(files).join("\n"), /WorkspaceEdit|workspace\.apply|WriteAllText|WriteAllBytes/u, "W-P51.5 must not add workspace write code.");
}

/**
 * 校验 W-P51 Visual Studio 实现路线与许可证门。
 * Validate the W-P51 Visual Studio implementation route and license gate.
 *
 * @param {object} baseline Visual Studio implementation baseline.
 * @returns {void}
 */
function assertImplementationBaseline(baseline) {
  assert.equal(baseline?.contract, "hia-visual-studio-implementation-baseline", "Visual Studio implementation baseline contract must be explicit.");
  assert.equal(baseline?.contractVersion, "0.1.0-draft", "Visual Studio implementation baseline version must be explicit.");
  assert.equal(baseline?.status, "install-runtime-captured", "Visual Studio implementation baseline must record the runtime capture.");
  assert.equal(baseline?.phase, "W-P51.6", "Visual Studio implementation baseline must record the current phase.");
  assert.equal(baseline?.selectedRoute?.model, "visualstudio-extensibility-out-of-process", "Visual Studio must use the out-of-process extensibility route.");
  assert.equal(baseline?.selectedRoute?.packageVersion, "17.14.40608", "Visual Studio SDK package version must be pinned.");
  assert.equal(baseline?.selectedRoute?.privateAssets, "all", "Visual Studio SDK packages must remain private build assets.");
  assert.equal(baseline?.selectedRoute?.targetFramework, "net8.0-windows8.0", "Visual Studio extension target framework must be frozen.");
  assert.deepEqual(baseline?.compatibility?.validatedIdeMajors, [17, 18], "Visual Studio compatibility must cover VS 2022 and VS 2026.");
  assert.equal(baseline?.licenseGate?.auditStatus, "reviewed", "Visual Studio SDK license audit must be recorded.");
  assert.equal(baseline?.licenseGate?.requireLicenseAcceptance, true, "Visual Studio SDK license acceptance must remain explicit.");
  assert.equal(baseline?.licenseGate?.userAcceptanceRequiredBeforePackageReference, true, "Visual Studio SDK package reference must require user acceptance.");
  assert.equal(baseline?.licenseGate?.userAcceptanceRecorded, true, "Visual Studio SDK license acceptance must be recorded before PackageReference.");
  assert.equal(baseline?.currentImplementation?.projectFileCreated, true, "W-P51.2 must record the project file.");
  assert.equal(baseline?.currentImplementation?.sdkPackageReferenceAdded, true, "W-P51.2 must record SDK package references.");
  assert.equal(baseline?.currentImplementation?.commandImplemented, true, "W-P51.2 must record the command implementation.");
  assert.equal(baseline?.currentImplementation?.toolWindowImplemented, true, "W-P51 must record the tool window implementation.");
  assert.equal(baseline?.currentImplementation?.localizedReviewToolWindowImplemented, true, "W-P51.3 must record the localized review tool window.");
  assert.equal(baseline?.currentImplementation?.reviewSurfaceContractEmbedded, true, "W-P51.3 must record the embedded review contract.");
  assert.equal(baseline?.currentImplementation?.remoteUiNeutralResourceImplemented, true, "W-P51.3 must record the neutral Remote UI resources.");
  assert.equal(baseline?.currentImplementation?.remoteUiSimplifiedChineseResourceImplemented, true, "W-P51.3 must record the Simplified Chinese Remote UI resources.");
  assert.equal(baseline?.currentImplementation?.metadataLocalizationCultureCount, 2, "W-P51.3 must record both Simplified Chinese metadata cultures.");
  assert.equal(baseline?.currentImplementation?.languageServerProviderImplemented, true, "W-P51.4 must record the language server provider.");
  assert.equal(baseline?.currentImplementation?.languageServerRuntimePackaged, true, "W-P51.4 must record the packaged language-server runtime.");
  assert.equal(baseline?.currentImplementation?.languageServerRuntimeSelfContainedAfterExtraction, true, "W-P51.5 must record an extraction-safe language-server runtime.");
  assert.equal(baseline?.currentImplementation?.languageServerRuntimeSymbolicLinkCount, 0, "W-P51.5 must record zero runtime symbolic links.");
  assert.equal(baseline?.currentImplementation?.languageServerTransport, "stdio", "W-P51.4 must record stdio transport.");
  assert.equal(baseline?.currentImplementation?.languageServerActivationFileExtensionCount, 2, "W-P51.4 must record the dedicated activation extensions.");
  assert.equal(baseline?.currentImplementation?.languageServerPublicSafeLifecycleImplemented, true, "W-P51.4 must record public-safe lifecycle state.");
  assert.equal(baseline?.currentImplementation?.authoringProjectionImplemented, true, "W-P51.5 must record the authoring projection.");
  assert.equal(baseline?.currentImplementation?.authoringProjectionSessionMode, "isolated-read-only", "W-P51.5 must record the isolated read-only session.");
  assert.equal(baseline?.currentImplementation?.authoringProjectionCustomRequestCount, 3, "W-P51.5 must record all three custom requests.");
  assert.equal(baseline?.currentImplementation?.authoringProjectionUsesSyntheticFixture, true, "W-P51.5 must record the synthetic fixture boundary.");
  assert.equal(baseline?.currentImplementation?.authoringProjectionSharesManagedLspStream, false, "W-P51.5 must not share Visual Studio's managed LSP stream.");
  assert.equal(baseline?.currentImplementation?.vsixBuilt, true, "W-P51.2 must record the verified VSIX build.");
  assert.equal(baseline?.currentImplementation?.experimentalInstanceExecuted, true, "W-P51.6 must record experimental instance execution.");
  assert.equal(baseline?.currentImplementation?.runtimeCaptureExecuted, true, "W-P51.6 must record runtime capture.");
  assert.equal(baseline?.currentImplementation?.runtimeCaptureHostCount, 2, "W-P51.6 must record both Visual Studio hosts.");
  assert.equal(baseline?.currentImplementation?.languageServerReadyHostCount, 2, "W-P51.6 must record both ready language-server hosts.");
  assert.equal(baseline?.currentImplementation?.liveAuthoringReadyHostCount, 2, "W-P51.6 must record both ready live-authoring hosts.");
  assert.equal(baseline?.currentImplementation?.ordinaryInstanceInstallClaimed, false, "W-P51.6 must not claim ordinary-instance installation.");
  assert.equal(baseline?.privacy?.workspaceWriteAllowed, false, "W-P51.1 must not grant workspace write authority.");
  assert.equal(baseline?.privacy?.targetRepositoryMutationAllowed, false, "W-P51.1 must not grant target mutation authority.");
  assert.ok(Array.isArray(baseline?.officialReferences) && baseline.officialReferences.length >= 7, "Visual Studio implementation baseline must cite official references.");
}

/**
 * 校验 W-P51.6 真实宿主采集及未开放写入的安全边界。
 * Validate the W-P51.6 real-host capture and its write-disabled safety boundary.
 *
 * @param {object} contract Visual Studio host contract.
 * @param {object} capture Public-safe runtime capture.
 * @returns {void}
 */
function assertRuntimeCapture(contract, capture) {
  assert.equal(capture?.contract, "hia-visual-studio-runtime-capture", "Visual Studio runtime capture contract must be explicit.");
  assert.equal(capture?.contractVersion, "0.1.0-draft", "Visual Studio runtime capture version must be explicit.");
  assert.equal(capture?.phase, "W-P51.6", "Visual Studio runtime capture must identify W-P51.6.");
  assert.equal(capture?.status, "captured", "Visual Studio runtime evidence must be captured.");
  assert.equal(capture?.deployment?.model, "visualstudio-extensibility-f5-oop-experimental-instance", "Visual Studio runtime capture must use the official out-of-process experimental route.");
  assert.equal(capture?.deployment?.commandLineMode, "/RootSuffix Exp /OopExtDebug", "Visual Studio runtime capture must record the SDK debug mode.");
  assert.equal(capture?.deployment?.sdkExperimentalDeploymentSucceeded, true, "Visual Studio SDK experimental deployment must succeed.");
  assert.equal(capture?.deployment?.vsixInstallerCustomRootSuffixSupported, false, "VisualStudio.Extensibility must not claim custom-root VSIXInstaller support.");
  assert.equal(capture?.deployment?.ordinaryInstanceInstallClaimed, false, "Visual Studio runtime capture must not claim ordinary-instance installation.");
  assert.equal(capture?.deployment?.ordinaryInstanceExtensionSetModified, false, "Visual Studio runtime capture must not modify ordinary-instance extensions.");
  assert.equal(capture?.vsix?.identity, "HiaDocumentation.VisualStudio.f56aeeb6-e79c-4656-a536-dbdc9acfbdb6", "Captured VSIX identity must remain stable.");
  assert.equal(capture?.vsix?.version, "0.1.0.0", "Captured VSIX version must be explicit.");
  assert.match(capture?.vsix?.sha256 ?? "", /^[A-F0-9]{64}$/u, "Captured VSIX SHA-256 must be public-safe and complete.");
  assert.equal(capture?.vsix?.byteCount, 4467598, "Captured VSIX byte count must match the runtime candidate.");
  assert.equal(capture?.vsix?.extensionType, "VisualStudio.Extensibility", "Captured VSIX type must be explicit.");
  assert.equal(capture?.vsix?.installationTargetRange, "[17.14,)", "Captured VSIX target range must cover the validated hosts.");
  assert.ok(Array.isArray(capture?.hosts) && capture.hosts.length === 2, "Runtime capture must include Visual Studio 2022 and 2026.");
  assert.deepEqual(capture.hosts.map((host) => host.ideMajor), [17, 18], "Runtime capture must preserve the 17/18 host order.");

  for (const host of capture.hosts) {
    assert.equal(host.captureState, "captured", `${host.id} must be captured.`);
    assert.equal(host.experimentalInstanceExecuted, true, `${host.id} must execute an experimental instance.`);
    assert.equal(host.commandVisible, true, `${host.id} must expose the HIA command.`);
    assert.equal(host.localizedToolWindowVisible, true, `${host.id} must expose the localized tool window.`);
    assert.equal(host.overviewStatus, "ready", `${host.id} overview must be ready.`);
    assert.equal(host.languageServer?.state, "ready", `${host.id} language server must be ready.`);
    assert.equal(host.languageServer?.reasonCode, "lsp-initialized", `${host.id} language server must report a stable ready reason.`);
    assert.equal(host.languageServer?.runtimeOrigin, "vsix-content", `${host.id} must use the packaged runtime.`);
    assert.equal(host.liveAuthoring?.state, "ready", `${host.id} live authoring must be ready.`);
    assert.equal(host.liveAuthoring?.reasonCode, "projection-requests-completed", `${host.id} live authoring must complete all projection requests.`);
    assert.equal(host.liveAuthoring?.sessionMode, "isolated-read-only", `${host.id} live authoring must remain isolated and read-only.`);
    assert.equal(host.liveAuthoring?.requestCount, 3, `${host.id} must execute three audited custom requests.`);
    assert.equal(host.liveAuthoring?.authoringLocationCount, 3, `${host.id} must expose three public-safe authoring locations.`);
    assert.equal(host.liveAuthoring?.proposalCount, 1, `${host.id} must expose one synthetic proposal.`);
    assert.equal(host.liveAuthoring?.draftCount, 1, `${host.id} must expose one synthetic draft.`);
    assert.ok(Array.isArray(host.screenshots) && host.screenshots.length === 3, `${host.id} must reference three screenshots.`);
  }

  assert.equal(capture?.summary?.capturedHostCount, 2, "Runtime capture must count both hosts.");
  assert.equal(capture?.summary?.experimentalInstanceExecutionCount, 2, "Runtime capture must count both experimental executions.");
  assert.equal(capture?.summary?.languageServerReadyHostCount, 2, "Runtime capture must count both ready language servers.");
  assert.equal(capture?.summary?.liveAuthoringReadyHostCount, 2, "Runtime capture must count both ready authoring projections.");
  assert.equal(capture?.summary?.screenshotCount, 6, "Runtime capture must count six public-safe screenshots.");
  assert.equal(capture?.safety?.sourcesContentPolicy, "none", "Runtime capture must preserve sourcesContent none.");
  assert.equal(capture?.safety?.sourceBodyIncluded, false, "Runtime capture must not include source bodies.");
  assert.equal(capture?.safety?.absolutePathIncluded, false, "Runtime capture must not include absolute paths.");
  assert.equal(capture?.safety?.credentialIncluded, false, "Runtime capture must not include credentials.");
  assert.equal(capture?.safety?.providerNetworkExecuted, false, "Runtime capture must not execute provider networks.");
  assert.equal(capture?.safety?.hostEditorApiCalled, false, "Runtime capture must not call host editor APIs.");
  assert.equal(capture?.safety?.checkedApplyWriteEnabled, false, "Runtime capture must keep checked apply disabled.");
  assert.equal(capture?.safety?.workspaceWriteAllowed, false, "Runtime capture must keep workspace writes disabled.");
  assert.equal(capture?.safety?.targetRepositoryMutationAllowed, false, "Runtime capture must keep target mutation disabled.");
  assert.equal(contract?.runtime?.runtimeCapture?.contract, "hia-visual-studio-runtime-capture@0.1.0-draft", "Host contract must reference the runtime capture.");
  assert.equal(contract?.runtime?.runtimeCapture?.capturedHostCount, 2, "Host contract must summarize both captures.");
  assert.equal(contract?.runtime?.runtimeCapture?.ordinaryInstanceInstallClaimed, false, "Host contract must not claim ordinary-instance installation.");
}

function assertRequiredMethods(customRequests) {
  assert.ok(Array.isArray(customRequests), "Visual Studio host customRequests must be an array.");
  const methods = new Set(customRequests.map((request) => request.method));

  for (const method of [
    "hia/ideCapabilities",
    "hia/documentAuthoringLocations",
    "hia/documentSourceMapIndex",
    "hia/projectRelationGraph",
    "hia/resourceActions",
    "hia/documentationEditProposals"
  ]) {
    assert.ok(methods.has(method), `Visual Studio host must map ${method}.`);
  }
}

/**
 * 校验实时 authoring 投影不会截取宿主管理的 LSP 流或获得写权限。
 * Validate that live authoring projection neither intercepts the host-managed LSP stream nor gains write authority.
 *
 * @param {object} projection Authoring projection boundary.
 * @returns {void}
 */
function assertAuthoringProjectionBoundary(projection) {
  assert.equal(projection?.mode, "isolated-read-only-lsp-session", "Visual Studio authoring projection must use an isolated read-only LSP session.");
  assert.deepEqual(projection?.requests, [
    "hia/ideCapabilities",
    "hia/documentAuthoringLocations",
    "hia/documentationEditProposals"
  ], "Visual Studio authoring projection must issue only the three audited custom requests.");
  assert.equal(projection?.syntheticFixtureOnly, true, "Visual Studio authoring projection must open only the synthetic fixture.");
  assert.equal(projection?.sharesVisualStudioManagedLspStream, false, "Visual Studio authoring projection must not share the managed LSP stream.");
  assert.equal(projection?.includesSourceContent, false, "Visual Studio authoring projection must not include source content.");
  assert.equal(projection?.allowsAutomaticWrites, false, "Visual Studio authoring projection must not allow automatic writes.");
  assert.equal(projection?.hostEditorApiCalled, false, "Visual Studio authoring projection must not call host editor APIs.");
  assert.equal(projection?.workspaceWriteAllowed, false, "Visual Studio authoring projection must not allow workspace writes.");
  assert.equal(projection?.targetRepositoryMutationAllowed, false, "Visual Studio authoring projection must not mutate target repositories.");
  assert.equal(projection?.providerNetworkExecuted, false, "Visual Studio authoring projection must not execute provider network access.");
}

function assertHostResultMetadata(metadata) {
  assert.equal(metadata?.contract, "hia-lsp-host-result", "Visual Studio host must consume hia-lsp-host-result metadata.");
  assert.equal(metadata?.contractVersion, "0.1.0-draft", "Visual Studio host must pin host metadata version.");
  assert.deepEqual(metadata?.supportedSources, [
    "managed-document",
    "workspace-runtime",
    "none"
  ], "Visual Studio host must recognize all host result sources.");
  assert.ok(metadata?.supportedEmptyStates?.includes("query-no-match"), "Visual Studio host must recognize query no-match empty state.");
  assert.ok(metadata?.supportedEmptyStates?.includes("relation-graph-empty"), "Visual Studio host must recognize relation graph empty state.");
}

/**
 * 校验 Visual Studio review tool-window 的只读输入契约。
 * Validate the read-only input contract for the Visual Studio review tool window.
 *
 * @param {object} contract Host skeleton contract.
 * @param {object} reviewSurface Review-surface input contract.
 * @returns {void}
 */
function assertReviewSurface(contract, reviewSurface) {
  assert.equal(reviewSurface?.contract, "hia-visual-studio-review-surface", "Visual Studio review surface contract must be explicit.");
  assert.equal(reviewSurface?.contractVersion, "0.1.0-draft", "Visual Studio review surface version must be explicit.");
  assert.equal(reviewSurface?.surface?.primaryRequest, "hia/documentationEditProposals", "Visual Studio review surface must consume the review proposal request.");
  assert.equal(reviewSurface?.surface?.payloadContract, "hia-documentation-review-payload@0.1.0-draft", "Visual Studio review surface must pin review payload.");
  assert.equal(reviewSurface?.surface?.editCandidateContract, "hia-documentation-edit-candidate@0.1.0-draft", "Visual Studio review surface must pin edit candidate preview.");
  assert.equal(reviewSurface?.surface?.editDiffPreviewContract, "hia-documentation-edit-diff-preview@0.1.0-draft", "Visual Studio review surface must pin edit diff preview.");
  assert.equal(reviewSurface?.surface?.editApplyPreflightContract, "hia-documentation-edit-apply-preflight@0.1.0-draft", "Visual Studio review surface must pin edit apply preflight.");
  assert.equal(reviewSurface?.surface?.providerAugmentationContract, "hia-provider-review-payload-augmentation@0.1.0-draft", "Visual Studio review surface must pin provider augmentation.");
  assert.equal(reviewSurface?.providerReview?.status, "input-ready", "Visual Studio review surface must expose provider-review input readiness.");
  assert.equal(reviewSurface?.providerReview?.inputMode, "review-payload-augmentation-only", "Visual Studio provider review must consume augmentation only.");
  assert.equal(reviewSurface?.providerReview?.checkedApplyAvailable, false, "Visual Studio provider review must not claim checked apply.");
  assert.equal(reviewSurface?.providerReview?.externalProviderApiKeyRequired, false, "Visual Studio provider review must not require API keys.");
  assert.equal(reviewSurface?.providerReview?.externalProviderNetworkAllowed, false, "Visual Studio provider review must not claim external network access.");
  assert.equal(reviewSurface?.providerReview?.workspaceWriteAvailable, false, "Visual Studio provider review must not claim workspace writes.");
  assert.equal(reviewSurface?.providerReview?.targetRepositoryMutation, false, "Visual Studio provider review must not mutate target repositories.");
  assert.ok(Array.isArray(reviewSurface?.providerReview?.requiredFields) && reviewSurface.providerReview.requiredFields.includes("providerAugmentation.reviewMetadata"), "Visual Studio provider review must require provider review metadata.");
  assert.equal(reviewSurface?.providerReviewPanel?.contract, "hia-visual-studio-provider-review-linkage-panel", "Visual Studio provider review panel contract must be explicit.");
  assert.equal(reviewSurface?.providerReviewPanel?.status, "input-ready", "Visual Studio provider review panel must expose readiness.");
  assert.equal(reviewSurface?.providerReviewPanel?.inputMode, "provider-result-refusal-review-only", "Visual Studio provider review panel must stay review-only.");
  assert.equal(reviewSurface?.providerReviewPanel?.resultTaxonomyKindCount, 5, "Visual Studio provider review panel must expose taxonomy count.");
  assert.equal(reviewSurface?.providerReviewPanel?.blockedProviderReviewShapeAccepted, true, "Visual Studio provider review panel must expose blocked/refused shape acceptance.");
  assert.equal(reviewSurface?.providerReviewPanel?.refusalResultVisible, true, "Visual Studio provider review panel must expose refusal visibility.");
  assert.equal(reviewSurface?.providerReviewPanel?.reviewOnlyOutputRequired, true, "Visual Studio provider review panel must require review-only output.");
  assert.equal(reviewSurface?.providerReviewPanel?.requiresHumanReview, true, "Visual Studio provider review panel must require human review.");
  assert.equal(reviewSurface?.providerReviewPanel?.targetOwnerHandoffVisible, true, "Visual Studio provider review panel must expose target-owner handoff.");
  assert.equal(reviewSurface?.providerReviewPanel?.directApplyAllowed, false, "Visual Studio provider review panel must keep direct apply disabled.");
  assert.equal(reviewSurface?.providerReviewPanel?.workspaceWriteAvailable, false, "Visual Studio provider review panel must keep workspace writes disabled.");
  assert.equal(reviewSurface?.providerReviewPanel?.targetRepositoryMutation, false, "Visual Studio provider review panel must keep target mutation disabled.");
  assert.equal(reviewSurface?.providerReviewPanel?.providerNetworkExecuted, false, "Visual Studio provider review panel must not claim provider network execution.");
  assert.equal(reviewSurface?.providerReviewPanel?.sourcesContentPolicy, "none", "Visual Studio provider review panel must preserve sourcesContent none.");
  assert.ok(Array.isArray(reviewSurface?.providerReviewPanel?.requiredFields) && reviewSurface.providerReviewPanel.requiredFields.includes("providerReviewPanel.reviewOnlyOutputRequired"), "Visual Studio provider review panel must require review-only fields.");
  assert.equal(reviewSurface?.applyPreview?.status, "input-ready", "Visual Studio review surface must expose apply-preview input readiness.");
  assert.equal(reviewSurface?.applyPreview?.inputMode, "preflight-preview-only", "Visual Studio review surface must keep apply preview preflight-only.");
  assert.equal(reviewSurface?.applyPreview?.checkedApplyAvailable, false, "Visual Studio review surface must not claim checked apply.");
  assert.equal(reviewSurface?.applyPreview?.hostFileReadAvailable, false, "Visual Studio review surface must not claim host file reads.");
  assert.equal(reviewSurface?.applyPreview?.workspaceWriteAvailable, false, "Visual Studio review surface must not claim workspace writes.");
  assert.equal(reviewSurface?.applyPreview?.targetRepositoryMutation, false, "Visual Studio review surface must not mutate target repositories.");
  assert.ok(Array.isArray(reviewSurface?.applyPreview?.requiredFields) && reviewSurface.applyPreview.requiredFields.includes("item.editCandidate.applyPreflight.targetFiles"), "Visual Studio review surface must require apply preflight target files.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.status, "input-ready", "Visual Studio review surface must expose checked apply confirmation readiness.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.inputMode, "confirmation-preview-only", "Visual Studio checked apply confirmation must stay preview-only.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.checkedApplyAvailable, false, "Visual Studio checked apply confirmation must not claim checked apply availability.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.workspaceWriteAvailable, false, "Visual Studio checked apply confirmation must not claim workspace writes.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.targetRepositoryMutation, false, "Visual Studio checked apply confirmation must not mutate target repositories.");
  assert.equal(reviewSurface?.checkedApplyConfirmation?.directApplyAvailable, false, "Visual Studio checked apply confirmation must not allow direct apply.");
  assert.ok(Array.isArray(reviewSurface?.checkedApplyConfirmation?.requiredFields) && reviewSurface.checkedApplyConfirmation.requiredFields.includes("checkedApplyConfirmation.confirmationReportCount"), "Visual Studio checked apply confirmation must require confirmation report count.");
  assert.equal(reviewSurface?.targetCollaboration?.status, "input-ready", "Visual Studio review surface must expose target collaboration readiness.");
  assert.equal(reviewSurface?.targetCollaboration?.inputMode, "target-owner-flow-only", "Visual Studio target collaboration must stay target-owner-only.");
  assert.equal(reviewSurface?.targetCollaboration?.targetOwnerActionRequiredForWrite, true, "Visual Studio target collaboration must require target owner action.");
  assert.equal(reviewSurface?.targetCollaboration?.hiaOwnedTargetRepositoryMutationAllowed, false, "Visual Studio target collaboration must not allow HIA-owned target mutation.");
  assert.equal(reviewSurface?.targetCollaboration?.actualTargetBranchCreated, false, "Visual Studio target collaboration must not claim branch creation.");
  assert.equal(reviewSurface?.targetCollaboration?.actualPullRequestCreated, false, "Visual Studio target collaboration must not claim pull request creation.");
  assert.equal(reviewSurface?.targetCollaboration?.targetRepositoryMutationCount, 0, "Visual Studio target collaboration must keep target mutation count at zero.");
  assert.ok(Array.isArray(reviewSurface?.targetCollaboration?.requiredFields) && reviewSurface.targetCollaboration.requiredFields.includes("targetCollaboration.flowStateCount"), "Visual Studio target collaboration must require flow state count.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.contract, "hia-visual-studio-target-owner-evidence-view", "Visual Studio target-owner evidence view contract must be explicit.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.status, "input-ready", "Visual Studio target-owner evidence view must expose readiness.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.inputMode, "target-owner-evidence-read-only", "Visual Studio target-owner evidence view must stay read-only.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.readinessMatrixItemCount, 12, "Visual Studio target-owner evidence view must expose readiness matrix count.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.evidenceCompletenessCheckCount, 12, "Visual Studio target-owner evidence view must expose evidence completeness count.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.transcriptStepReviewCount, 16, "Visual Studio target-owner evidence view must expose transcript step count.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.handoffBindingReviewCount, 6, "Visual Studio target-owner evidence view must expose handoff binding count.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.deferredGateCount, 7, "Visual Studio target-owner evidence view must expose deferred gate count.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.targetOwnerActionRequired, true, "Visual Studio target-owner evidence view must require target-owner action.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.targetOwnerMaterialReady, true, "Visual Studio target-owner evidence view must expose target-owner material readiness.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.targetOwnerMaySubmitEvidence, true, "Visual Studio target-owner evidence view must allow target-owner evidence submission.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.actualDryRunExecuted, false, "Visual Studio target-owner evidence view must not claim dry-run execution.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.actualCommandTranscriptSubmitted, false, "Visual Studio target-owner evidence view must not claim transcript submission.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.actualTargetSandboxCreated, false, "Visual Studio target-owner evidence view must not claim sandbox creation.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.actualTargetBranchCreated, false, "Visual Studio target-owner evidence view must not claim branch creation.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.actualPullRequestCreated, false, "Visual Studio target-owner evidence view must not claim pull request creation.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.targetOwnerExecutionClaimed, false, "Visual Studio target-owner evidence view must not claim target-owner execution.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.hiaMayRunTargetCommands, false, "Visual Studio target-owner evidence view must keep HIA target commands disabled.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.hiaMayModifyTargetRepository, false, "Visual Studio target-owner evidence view must keep HIA target mutation disabled.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.targetCommandsExecutedByHia, false, "Visual Studio target-owner evidence view must not claim target commands.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.checkedApplyWriteEnabled, false, "Visual Studio target-owner evidence view must keep checked apply write disabled.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.workspaceWriteAvailable, false, "Visual Studio target-owner evidence view must keep workspace writes disabled.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.targetRepositoryMutation, false, "Visual Studio target-owner evidence view must keep target mutation disabled.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.directEditObjectCount, 0, "Visual Studio target-owner evidence view must not expose direct edit objects.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.providerNetworkExecuted, false, "Visual Studio target-owner evidence view must not claim provider network execution.");
  assert.equal(reviewSurface?.targetOwnerEvidenceView?.sourcesContentPolicy, "none", "Visual Studio target-owner evidence view must preserve sourcesContent none.");
  assert.ok(Array.isArray(reviewSurface?.targetOwnerEvidenceView?.requiredFields) && reviewSurface.targetOwnerEvidenceView.requiredFields.includes("targetOwnerEvidenceView.targetOwnerExecutionClaimed"), "Visual Studio target-owner evidence view must require execution-claim fields.");
  assert.equal(reviewSurface?.hostApplyUx?.contract, "hia-visual-studio-host-apply-ux-summary", "Visual Studio host apply UX contract must be explicit.");
  assert.equal(reviewSurface?.hostApplyUx?.status, "input-ready", "Visual Studio host apply UX must expose readiness.");
  assert.equal(reviewSurface?.hostApplyUx?.inputMode, "host-owned-apply-ux-intake-only", "Visual Studio host apply UX must consume intake data only.");
  assert.equal(reviewSurface?.hostApplyUx?.uxRequirementRefCount, 8, "Visual Studio host apply UX must preserve requirement refs.");
  assert.equal(reviewSurface?.hostApplyUx?.providerReviewLinkageVisible, true, "Visual Studio host apply UX must show provider review linkage.");
  assert.equal(reviewSurface?.hostApplyUx?.targetOwnerEvidenceVisible, true, "Visual Studio host apply UX must show target-owner evidence.");
  assert.equal(reviewSurface?.hostApplyUx?.deferredGateVisible, true, "Visual Studio host apply UX must show deferred gates.");
  assert.equal(reviewSurface?.hostApplyUx?.checkedApplyWriteEnabled, false, "Visual Studio host apply UX must keep checked apply write disabled.");
  assert.equal(reviewSurface?.hostApplyUx?.workspaceWriteAvailable, false, "Visual Studio host apply UX must keep workspace writes disabled.");
  assert.equal(reviewSurface?.hostApplyUx?.targetRepositoryMutation, false, "Visual Studio host apply UX must keep target mutation disabled.");
  assert.equal(reviewSurface?.hostApplyUx?.directEditObjectProduced, false, "Visual Studio host apply UX must not expose direct edit objects.");
  assert.equal(reviewSurface?.hostApplyUx?.providerNetworkExecuted, false, "Visual Studio host apply UX must not claim provider network execution.");
  assert.equal(reviewSurface?.hostApplyUx?.targetCommandsExecutedByHia, false, "Visual Studio host apply UX must not claim target command execution.");
  assert.equal(reviewSurface?.hostApplyUx?.actualRuntimeCaptureExecuted, false, "Visual Studio host apply UX must not claim runtime capture.");
  assert.equal(reviewSurface?.hostApplyUx?.hostEditorApiCalled, false, "Visual Studio host apply UX must not claim editor API calls.");
  assert.equal(reviewSurface?.hostApplyUx?.sourcesContentPolicy, "none", "Visual Studio host apply UX must preserve sourcesContent none.");
  assert.ok(Array.isArray(reviewSurface?.hostApplyUx?.requiredFields) && reviewSurface.hostApplyUx.requiredFields.includes("hostApplyUx.providerReviewLinkageVisible"), "Visual Studio host apply UX must require visible linkage fields.");
  assert.equal(reviewSurface?.authoringProjection?.contract, "hia-visual-studio-authoring-projection", "Visual Studio authoring projection contract must be explicit.");
  assert.equal(reviewSurface?.authoringProjection?.status, "input-ready", "Visual Studio authoring projection must expose readiness.");
  assert.equal(reviewSurface?.authoringProjection?.inputMode, "visual-studio-authoring-projection-read-only", "Visual Studio authoring projection must stay read-only.");
  assert.equal(reviewSurface?.authoringProjection?.sourceContract, "hia-wp50-vscode-authoring-surface@0.1.0-draft", "Visual Studio authoring projection must point back to the VS Code baseline contract.");
  assert.deepEqual(reviewSurface?.authoringProjection?.canonicalMarkers, ["@lang", "<lang>", "<l>"], "Visual Studio authoring projection must expose canonical markers.");
  assert.deepEqual(reviewSurface?.authoringProjection?.dotnetXmlMarkers, ["<lang>", "<l>"], "Visual Studio authoring projection must expose DotNet XML markers.");
  assert.equal(reviewSurface?.authoringProjection?.authoringModeCount, 5, "Visual Studio authoring projection must expose authoring mode count.");
  assert.equal(reviewSurface?.authoringProjection?.changedScopePreviewVisible, true, "Visual Studio authoring projection must show changed-scope preview.");
  assert.equal(reviewSurface?.authoringProjection?.coverageRemediationVisible, true, "Visual Studio authoring projection must show coverage remediation.");
  assert.equal(reviewSurface?.authoringProjection?.fixtureGuidanceVisible, true, "Visual Studio authoring projection must show fixture guidance.");
  assert.equal(reviewSurface?.authoringProjection?.remediationBatchCount, 6, "Visual Studio authoring projection must expose the six W-P50 remediation batches.");
  assert.equal(reviewSurface?.authoringProjection?.p0RemediationBatchCount, 3, "Visual Studio authoring projection must expose the three P0 remediation batches.");
  assert.equal(reviewSurface?.authoringProjection?.publicExportedNodeCount, 730, "Visual Studio authoring projection must expose the audited public/exported node count.");
  assert.equal(reviewSurface?.authoringProjection?.missingDocBlockCount, 528, "Visual Studio authoring projection must expose the audited missing-doc count.");
  assert.equal(reviewSurface?.authoringProjection?.missingBilingualMarkerCount, 177, "Visual Studio authoring projection must expose the audited bilingual-marker gap count.");
  assert.equal(reviewSurface?.authoringProjection?.generatedBindingAuthoringStepCount, 7, "Visual Studio authoring projection must expose generated-binding authoring steps.");
  assert.equal(reviewSurface?.authoringProjection?.generatedBindingDiagnosticGuidanceCount, 5, "Visual Studio authoring projection must expose generated-binding diagnostic guidance.");
  assert.equal(reviewSurface?.authoringProjection?.generatedBindingConcreteSyntaxFrozen, false, "Visual Studio authoring projection must not claim generated-binding syntax is frozen.");
  assert.equal(reviewSurface?.authoringProjection?.checkedApplyWriteEnabled, false, "Visual Studio authoring projection must keep checked apply disabled.");
  assert.equal(reviewSurface?.authoringProjection?.workspaceWriteAvailable, false, "Visual Studio authoring projection must keep workspace write disabled.");
  assert.equal(reviewSurface?.authoringProjection?.targetRepositoryMutation, false, "Visual Studio authoring projection must keep target mutation disabled.");
  assert.equal(reviewSurface?.authoringProjection?.hostEditorApiCalled, false, "Visual Studio authoring projection must not claim host editor API calls.");
  assert.equal(reviewSurface?.authoringProjection?.providerNetworkExecuted, false, "Visual Studio authoring projection must not claim provider network execution.");
  assert.equal(reviewSurface?.authoringProjection?.sourceBodyIncluded, false, "Visual Studio authoring projection must not expose source bodies.");
  assert.equal(reviewSurface?.authoringProjection?.sourcesContentPolicy, "none", "Visual Studio authoring projection must preserve sourcesContent none.");
  assert.ok(Array.isArray(reviewSurface?.authoringProjection?.requiredFields) && reviewSurface.authoringProjection.requiredFields.includes("authoringProjection.checkedApplyWriteEnabled"), "Visual Studio authoring projection must require write-disabled state.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.contract, "generated-documentation-binding-host-projection", "Visual Studio generated binding projection must name the neutral host projection contract.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.contractVersion, "0.1.0-draft", "Visual Studio generated binding projection must pin its draft version.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.bindingContract, "generated-documentation-binding@0.1.0-draft", "Visual Studio generated binding projection must point to the frozen binding contract.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.status, "available", "Visual Studio generated binding projection must be available.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.summary?.bindingCount, 4, "Visual Studio generated binding projection must expose all fixture bindings.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.summary?.expansionCount, 6, "Visual Studio generated binding projection must expose all fixture expansions.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.summary?.targetCount, 6, "Visual Studio generated binding projection must expose all fixture targets.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.summary?.diagnosticCount, 1, "Visual Studio generated binding projection must retain the paired doc-source-map information diagnostic.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.summary?.stableInstanceKeyCount, 6, "Visual Studio generated binding projection must expose stable instance keys.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.targetRelationVisible, true, "Visual Studio generated binding projection must show source-to-target relations.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.threeQualityDimensionsVisible, true, "Visual Studio generated binding projection must show resolution/confidence/provenance separately.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.checkedApplyWriteEnabled, false, "Visual Studio generated binding projection must keep checked apply disabled.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.workspaceWriteAvailable, false, "Visual Studio generated binding projection must keep workspace write disabled.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.targetRepositoryMutation, false, "Visual Studio generated binding projection must keep target mutation disabled.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.providerNetworkExecuted, false, "Visual Studio generated binding projection must not execute provider network.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.sourceBodyIncluded, false, "Visual Studio generated binding projection must not expose source bodies.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.sourceRangeIncluded, false, "Visual Studio generated binding projection must not expose source ranges.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.localsValueIncluded, false, "Visual Studio generated binding projection must not expose locals values.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.sidecarPathIncluded, false, "Visual Studio generated binding projection must not expose sidecar paths.");
  assert.equal(reviewSurface?.generatedDocumentationBindingProjection?.sourcesContentPolicy, "none", "Visual Studio generated binding projection must preserve sourcesContent none.");
  assert.ok(Array.isArray(reviewSurface?.generatedDocumentationBindingProjection?.requiredFields) && reviewSurface.generatedDocumentationBindingProjection.requiredFields.includes("generatedDocumentationBindingProjection.checkedApplyWriteEnabled"), "Visual Studio generated binding projection must require write-disabled state.");
  assert.ok(hasSurface(contract, reviewSurface.surface.id), "Host contract must declare the Visual Studio review tool window.");
  assertSurfaceView(reviewSurface, "review-list");
  assertSurfaceView(reviewSurface, "review-detail");
  assertSurfaceView(reviewSurface, "provider-review");
  assertSurfaceView(reviewSurface, "provider-review-linkage");
  assertSurfaceView(reviewSurface, "candidate-preview");
  assertSurfaceView(reviewSurface, "checked-apply-confirmation");
  assertSurfaceView(reviewSurface, "target-collaboration");
  assertSurfaceView(reviewSurface, "target-owner-evidence-view");
  assertSurfaceView(reviewSurface, "host-apply-ux");
  assertSurfaceView(reviewSurface, "authoring-projection");
  assertAction(reviewSurface, "copy-draft", { mutatesTargetRepository: false });
  assertAction(reviewSurface, "open-context", { mutatesTargetRepository: false });
  assertAction(reviewSurface, "apply-candidate", {
    available: false,
    mutatesTargetRepository: false,
    requiresHumanReview: true
  });
  assert.deepEqual(reviewSurface?.languageAuthoringHints?.canonicalMarkers, [
    "@lang",
    "<lang>",
    "<l>"
  ], "Visual Studio language authoring hints must use canonical markers.");
  assert.ok(reviewSurface?.targetScenarios?.some((scenario) => scenario.id === "hia-aspnetportal"), "Visual Studio review surface must keep the HIA-ASPNETPortal scenario visible.");
  assert.equal(reviewSurface?.privacy?.allowTargetRepositoryMutation, false, "Visual Studio review surface must not mutate target repositories.");
  assert.equal(reviewSurface?.privacy?.embedsSourcesContent, false, "Visual Studio review surface must not embed source contents.");
  assert.equal(reviewSurface?.privacy?.allowsAutomaticApply, false, "Visual Studio review surface must not allow automatic apply.");
}

function hasSurface(contract, surfaceId) {
  return Array.isArray(contract?.surfaces) && contract.surfaces.some((surface) => surface.id === surfaceId);
}

function assertSurfaceView(reviewSurface, viewId) {
  assert.ok(
    Array.isArray(reviewSurface?.views) && reviewSurface.views.some((view) => view.id === viewId && Array.isArray(view.requiredFields) && view.requiredFields.length > 0),
    `Visual Studio review surface must define ${viewId}.`
  );
}

function assertAction(reviewSurface, actionId, expected) {
  const action = Array.isArray(reviewSurface?.actions)
    ? reviewSurface.actions.find((candidate) => candidate.id === actionId)
    : undefined;

  assert.ok(action, `Visual Studio review surface must define ${actionId}.`);

  for (const [key, value] of Object.entries(expected)) {
    assert.equal(action[key], value, `Visual Studio review action ${actionId} must set ${key}.`);
  }
}

function assertPrivacy(privacy) {
  assert.equal(privacy?.allowAbsolutePathsInHostPayload, false, "Visual Studio host payloads must avoid absolute paths.");
  assert.equal(privacy?.allowTargetRepositoryMutation, false, "Visual Studio host must not mutate target repositories in this skeleton.");
  assert.equal(privacy?.embedsSourcesContent, false, "Visual Studio host must not embed source contents.");
  assert.equal(privacy?.allowsAutomaticApply, false, "Visual Studio host must not auto-apply edit candidates.");
  assert.equal(privacy?.requiresHumanReviewForEditProposals, true, "Visual Studio host must require human review for edit proposals.");
  assert.equal(privacy?.parsesGeneratedHtml, false, "Visual Studio host must not parse generated HTML.");
  assert.equal(privacy?.runsDocumentationProducers, false, "Visual Studio host must not run producers.");
}
