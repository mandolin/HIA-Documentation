import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import * as vscode from "vscode";
import {
  LanguageClient,
  TransportKind
} from "vscode-languageclient/node";
import type {
  LanguageClientOptions,
  ServerOptions
} from "vscode-languageclient/node";
import {
  HIA_AUTHORING_LOCATIONS_REQUEST,
  HIA_BUILD_DOCS_COMMAND,
  HIA_CLIENT_ID,
  HIA_CONFIGURATION_SECTION,
  HIA_EXTENSION_NAME,
  HIA_COPY_RESOURCE_KEY_COMMAND,
  HIA_DOCUMENTATION_EDIT_PROPOSALS_REQUEST,
  HIA_DOCUMENT_SOURCE_MAP_INDEX_REQUEST,
  HIA_IDE_CAPABILITIES_REQUEST,
  HIA_OPEN_PREVIEW_COMMAND,
  HIA_OPEN_PROJECT_RELATIONS_COMMAND,
  HIA_OPEN_RELATED_LOCATION_COMMAND,
  HIA_OPEN_SOURCE_LINKAGE_COMMAND,
  HIA_OUTPUT_CHANNEL_NAME,
  HIA_PROJECT_RELATION_GRAPH_REQUEST,
  HIA_RESOURCE_ACTIONS_REQUEST,
  HIA_RESOURCE_INDEX_REQUEST,
  HIA_REVIEW_DOCUMENTATION_PROPOSALS_COMMAND,
  HIA_SHOW_RESOURCE_ACTION_COMMAND,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaBuildArgs,
  createHiaDocumentationReviewItemChoices,
  createHiaDocumentationReviewItemReport,
  createHiaDocumentationReviewReport,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  createHiaPreviewReport,
  createHiaResourceActionReport,
  createHiaValidationReport,
  getHiaDocumentationReviewDraftText,
  getHiaPreviewStaleReason,
  normalizeHiaCommandSettings,
  resolveConfiguredManifestPath,
  resolveHiaPreviewPath,
  resolveHiaCliModule,
  resolveHiaServerModule,
  type HiaAuthoringLocationSummary,
  type HiaAuthoringLocationsSummary,
  type HiaCommandSettings,
  type HiaCommandSettingsInput,
  type HiaDiagnosticSummary,
  type HiaDocumentationEditProposalsSummary,
  type HiaDocumentationReviewItemChoice,
  type HiaDocumentationReviewPayloadItemSummary,
  type HiaIdeCapabilitiesSummary,
  type HiaPreviewManifestSummary,
  type HiaPreviewStatusReportInput,
  type HiaResourceActionSummary,
  type HiaResourceActionsSummary,
  type HiaResourceIndexSummary
} from "./config.js";
import {
  createHiaProjectRelationActionChoices,
  createHiaProjectRelationChoices,
  createHiaProjectRelationRuntimeReport,
  type HiaProjectRelationActionChoice,
  type HiaProjectRelationChoice,
  type HiaProjectRelationGraphSummary,
  type HiaProjectRelationNavigationTarget
} from "./project-relations.js";
import {
  createHiaSourceLinkageEntryChoices,
  createHiaSourceLinkageNavigationTargets,
  resolveHiaSourceLinkageTargetPath,
  type HiaDocumentSourceMapIndexSummary,
  type HiaSourceLinkageEntryChoice,
  type HiaSourceLinkageNavigationTarget
} from "./source-linkage.js";

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel(HIA_OUTPUT_CHANNEL_NAME);
  const serverModule = resolveHiaServerModule(context.extensionPath);
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.stdio
    },
    debug: {
      module: serverModule,
      transport: TransportKind.stdio,
      options: {
        execArgv: ["--nolazy", "--inspect=6009"]
      }
    }
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: createHiaDocumentSelector(),
    outputChannel,
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher(createHiaFileWatcherPattern())
    }
  };

  outputChannel.appendLine(`Starting ${HIA_EXTENSION_NAME} language server.`);
  outputChannel.appendLine(`Server module: ${serverModule}`);

  const showOutputCommand = vscode.commands.registerCommand(HIA_SHOW_OUTPUT_COMMAND, () => {
    outputChannel.show(true);
  });
  const buildDocsCommand = vscode.commands.registerCommand(HIA_BUILD_DOCS_COMMAND, async () => {
    const workspaceRoot = resolveWorkspaceRoot();
    const settings = getHiaCommandSettings();

    if (!workspaceRoot) {
      void vscode.window.showWarningMessage("Open a workspace folder before building HIA docs.");
      return;
    }

    outputChannel.show(true);
    outputChannel.appendLine("Running HIA docs build...");
    outputChannel.appendLine(`Build arguments: ${createHiaBuildArgs(settings).join(" ")}`);

    const exitCode = await runHiaCliBuild(context.extensionPath, workspaceRoot, outputChannel, createHiaBuildArgs(settings));

    if (exitCode === 0) {
      void vscode.window.showInformationMessage(`HIA docs build completed at ${settings.out}.`);
      return;
    }

    void vscode.window.showErrorMessage(`HIA docs build failed with exit code ${exitCode}.`);
  });
  const openPreviewCommand = vscode.commands.registerCommand(HIA_OPEN_PREVIEW_COMMAND, async () => {
    const workspaceRoot = resolveWorkspaceRoot();
    const settings = getHiaCommandSettings();

    if (!workspaceRoot) {
      void vscode.window.showWarningMessage("Open a workspace folder before opening HIA preview.");
      return;
    }

    const status = await readHiaPreviewStatus(workspaceRoot, settings, getActiveHiaDocumentPath());
    outputChannel.show(true);
    outputChannel.appendLine("HIA preview report:");

    for (const line of createHiaPreviewReport(status)) {
      outputChannel.appendLine(`- ${line}`);
    }

    if (!status.previewExists) {
      void vscode.window.showWarningMessage("HIA preview was not found. Run HIA: Build Docs first.");
      return;
    }

    if (status.staleReason) {
      const selection = await vscode.window.showWarningMessage(
        "HIA preview may be stale.",
        "Open Preview",
        "Build Docs"
      );

      if (selection === "Build Docs") {
        await vscode.commands.executeCommand(HIA_BUILD_DOCS_COMMAND);
        return;
      }

      if (selection !== "Open Preview") {
        return;
      }
    }

    await vscode.env.openExternal(vscode.Uri.file(status.previewPath));
    outputChannel.appendLine(`Opened HIA preview: ${status.previewPath}`);
  });
  const openSourceLinkageCommand = vscode.commands.registerCommand(HIA_OPEN_SOURCE_LINKAGE_COMMAND, async () => {
    await openHiaSourceLinkage(outputChannel);
  });
  const openProjectRelationsCommand = vscode.commands.registerCommand(HIA_OPEN_PROJECT_RELATIONS_COMMAND, async () => {
    await openHiaProjectRelations(outputChannel);
  });
  const validateWorkspaceCommand = vscode.commands.registerCommand(HIA_VALIDATE_WORKSPACE_COMMAND, async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      void vscode.window.showWarningMessage("Open a .hia.json document before validating HIA workspace.");
      return;
    }

    if (!isHiaDocument(editor.document)) {
      void vscode.window.showWarningMessage("Open a .hia.json document before validating HIA workspace.");
      return;
    }

    if (!client) {
      void vscode.window.showWarningMessage("HIA language server is not running.");
      return;
    }

    const uri = editor.document.uri.toString();
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri).map(toDiagnosticSummary);

    outputChannel.show(true);
    outputChannel.appendLine(`Validating HIA workspace document: ${uri}`);

    try {
      const [index, capabilities, authoringLocations, resourceActions] = await Promise.all([
        client.sendRequest<HiaResourceIndexSummary>(HIA_RESOURCE_INDEX_REQUEST, { uri }),
        client.sendRequest<HiaIdeCapabilitiesSummary>(HIA_IDE_CAPABILITIES_REQUEST, { uri }),
        client.sendRequest<HiaAuthoringLocationsSummary>(HIA_AUTHORING_LOCATIONS_REQUEST, { uri }),
        client.sendRequest<HiaResourceActionsSummary>(HIA_RESOURCE_ACTIONS_REQUEST, { uri })
      ]);
      const report = createHiaValidationReport({
        authoringLocations,
        capabilities,
        diagnostics,
        resourceActions,
        resourceIndex: index,
        uri
      });

      outputChannel.appendLine("HIA validation report:");

      for (const line of report) {
        outputChannel.appendLine(`- ${line}`);
      }

      if (diagnostics.some((diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error)) {
        void vscode.window.showWarningMessage("HIA workspace validation completed with errors. See HIA output for details.");
        return;
      }

      void vscode.window.showInformationMessage("HIA workspace validation report written to output.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`HIA workspace validation failed: ${message}`);
      void vscode.window.showErrorMessage("HIA workspace validation failed. See HIA output for details.");
    }
  });
  const openRelatedLocationCommand = vscode.commands.registerCommand(HIA_OPEN_RELATED_LOCATION_COMMAND, async (location: HiaAuthoringLocationSummary) => {
    await openHiaRelatedLocation(location, outputChannel);
  });
  const showResourceActionCommand = vscode.commands.registerCommand(HIA_SHOW_RESOURCE_ACTION_COMMAND, async (action: HiaResourceActionSummary) => {
    showHiaResourceAction(action, outputChannel);
  });
  const copyResourceKeyCommand = vscode.commands.registerCommand(HIA_COPY_RESOURCE_KEY_COMMAND, async (action: HiaResourceActionSummary) => {
    await copyHiaResourceKey(action, outputChannel);
  });
  const reviewDocumentationProposalsCommand = vscode.commands.registerCommand(HIA_REVIEW_DOCUMENTATION_PROPOSALS_COMMAND, async () => {
    await reviewHiaDocumentationProposals(outputChannel);
  });
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(createHiaDocumentSelector(), {
    provideCodeActions(document, _range, codeActionContext) {
      return createHiaCodeActions(document, codeActionContext.diagnostics);
    }
  }, {
    providedCodeActionKinds: [
      vscode.CodeActionKind.QuickFix
    ]
  });

  client = new LanguageClient(HIA_CLIENT_ID, HIA_EXTENSION_NAME, serverOptions, clientOptions);

  context.subscriptions.push(outputChannel, showOutputCommand, buildDocsCommand, openPreviewCommand, openSourceLinkageCommand, openProjectRelationsCommand, validateWorkspaceCommand, openRelatedLocationCommand, showResourceActionCommand, copyResourceKeyCommand, reviewDocumentationProposalsCommand, codeActionProvider, {
    dispose: () => {
      void client?.stop();
      client = undefined;
    }
  });

  await client.start();
  outputChannel.appendLine(`${HIA_EXTENSION_NAME} language server started.`);
}

export async function deactivate(): Promise<void> {
  if (!client) {
    return;
  }

  await client.stop();
  client = undefined;
}

function resolveWorkspaceRoot(): string | undefined {
  const activeFolder = vscode.window.activeTextEditor
    ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
    : undefined;
  const folder = activeFolder ?? vscode.workspace.workspaceFolders?.[0];
  return folder?.uri.fsPath;
}

async function readHiaPreviewStatus(
  workspaceRoot: string,
  settings: HiaCommandSettings,
  sourcePath?: string
): Promise<HiaPreviewStatusReportInput> {
  const manifestPath = resolveConfiguredManifestPath(workspaceRoot, settings);
  const manifestResult = await readPreviewManifest(manifestPath);
  const previewResolution = resolveHiaPreviewPath(workspaceRoot, settings, manifestResult.manifest);
  const previewStat = await tryStat(previewResolution.previewPath);
  const sourceStat = sourcePath ? await tryStat(sourcePath) : undefined;
  const staleInput: {
    manifestMtimeMs?: number;
    previewMtimeMs?: number;
    sourceMtimeMs?: number;
  } = {};

  if (manifestResult.mtimeMs !== undefined) {
    staleInput.manifestMtimeMs = manifestResult.mtimeMs;
  }

  if (previewStat?.mtimeMs !== undefined) {
    staleInput.previewMtimeMs = previewStat.mtimeMs;
  }

  if (sourceStat?.mtimeMs !== undefined) {
    staleInput.sourceMtimeMs = sourceStat.mtimeMs;
  }

  const staleReason = getHiaPreviewStaleReason(staleInput) ?? previewResolution.unavailableReason;
  const status: HiaPreviewStatusReportInput = {
    manifestExists: manifestResult.exists,
    manifestPath,
    previewExists: Boolean(previewStat),
    previewPath: previewResolution.previewPath,
    source: previewResolution.source
  };

  if (manifestResult.manifest) {
    status.manifest = manifestResult.manifest;
  }

  if (staleReason) {
    status.staleReason = staleReason;
  }

  return status;
}

async function readPreviewManifest(manifestPath: string): Promise<{
  exists: boolean;
  manifest?: HiaPreviewManifestSummary;
  mtimeMs?: number;
}> {
  const manifestStat = await tryStat(manifestPath);

  if (!manifestStat) {
    return {
      exists: false
    };
  }

  try {
    const text = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(text) as unknown;
    const result: {
      exists: boolean;
      manifest?: HiaPreviewManifestSummary;
      mtimeMs?: number;
    } = {
      exists: true,
      mtimeMs: manifestStat.mtimeMs
    };

    if (isRecord(parsed)) {
      result.manifest = parsed;
    }

    return result;
  } catch {
    return {
      exists: true,
      mtimeMs: manifestStat.mtimeMs
    };
  }
}

async function tryStat(targetPath: string): Promise<{ mtimeMs: number } | undefined> {
  try {
    const stats = await stat(targetPath);

    return {
      mtimeMs: stats.mtimeMs
    };
  } catch {
    return undefined;
  }
}

function getActiveHiaDocumentPath(): string | undefined {
  const document = vscode.window.activeTextEditor?.document;

  if (!document || !isHiaDocument(document) || document.uri.scheme !== "file") {
    return undefined;
  }

  return document.uri.fsPath;
}

function getHiaCommandSettings(): HiaCommandSettings {
  const configuration = vscode.workspace.getConfiguration(HIA_CONFIGURATION_SECTION);
  const input: HiaCommandSettingsInput = {
    config: configuration.get<string>("build.config"),
    input: configuration.get<string>("build.input"),
    jsdocIntegration: configuration.get<string>("build.jsdocIntegration"),
    locale: configuration.get<string>("build.locale"),
    manifest: configuration.get<string>("build.manifest"),
    out: configuration.get<string>("build.out"),
    previewPath: configuration.get<string>("preview.path"),
    projectManifest: configuration.get<string>("build.projectManifest")
  };

  return normalizeHiaCommandSettings(input);
}

function isHiaDocument(document: vscode.TextDocument): boolean {
  return document.languageId === "hia" || document.uri.fsPath.endsWith(".hia.json");
}

async function createHiaCodeActions(document: vscode.TextDocument, diagnostics: readonly vscode.Diagnostic[]): Promise<vscode.CodeAction[]> {
  const actions = createDiagnosticCodeActions(diagnostics);

  if (!client || !isHiaDocument(document)) {
    return actions;
  }

  try {
    const resourceActions = await client.sendRequest<HiaResourceActionsSummary>(HIA_RESOURCE_ACTIONS_REQUEST, {
      uri: document.uri.toString()
    });

    actions.push(...createResourceCodeActions(resourceActions));
  } catch {
    return actions;
  }

  return actions;
}

function createDiagnosticCodeActions(diagnostics: readonly vscode.Diagnostic[]): vscode.CodeAction[] {
  const actions: vscode.CodeAction[] = [];
  const seen = new Set<string>();

  for (const diagnostic of diagnostics) {
    const location = getFirstRelatedLocation(diagnostic) ?? getUnavailableDiagnosticLocation(diagnostic);

    if (!location) {
      continue;
    }

    const title = location.uri ? "HIA: Open Related Location" : "HIA: Explain Unavailable Location";
    const key = [
      title,
      location.uri || "",
      location.targetPath || "",
      location.unavailableReason || "",
      String(diagnostic.code || "")
    ].join("\u0000");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.command = {
      command: HIA_OPEN_RELATED_LOCATION_COMMAND,
      title,
      arguments: [location]
    };
    action.diagnostics = [diagnostic];
    action.isPreferred = Boolean(location.uri);
    actions.push(action);
  }

  return actions;
}

function createResourceCodeActions(resourceActions: HiaResourceActionsSummary): vscode.CodeAction[] {
  const actions: vscode.CodeAction[] = [];
  const seen = new Set<string>();

  for (const action of resourceActions.actions || []) {
    if (!isResourceAction(action) || seen.has(action.id)) {
      continue;
    }

    seen.add(action.id);
    const codeAction = new vscode.CodeAction(action.title || "HIA: Resource Action", vscode.CodeActionKind.QuickFix);

    if (action.kind === "open-resource" || action.kind === "open-source") {
      const location = getResourceActionLocation(action);

      if (!location) {
        continue;
      }

      codeAction.command = {
        command: HIA_OPEN_RELATED_LOCATION_COMMAND,
        title: action.title || "HIA: Open Related Location",
        arguments: [location]
      };
      codeAction.isPreferred = action.status === "available";
    } else if (action.kind === "copy-resource-key") {
      codeAction.command = {
        command: HIA_COPY_RESOURCE_KEY_COMMAND,
        title: action.title || "HIA: Copy i18n Key",
        arguments: [action]
      };
    } else {
      codeAction.command = {
        command: HIA_SHOW_RESOURCE_ACTION_COMMAND,
        title: action.title || "HIA: Show Resource Action",
        arguments: [action]
      };
    }

    actions.push(codeAction);
  }

  return actions;
}

async function openHiaRelatedLocation(location: HiaAuthoringLocationSummary, outputChannel: vscode.OutputChannel): Promise<void> {
  if (!location.uri) {
    const reason = location.unavailableReason || "diagnostic-target-unknown";
    outputChannel.show(true);
    outputChannel.appendLine(`HIA related location unavailable: ${reason}`);
    void vscode.window.showInformationMessage(`HIA related location unavailable: ${reason}.`);
    return;
  }

  try {
    const uri = vscode.Uri.parse(location.uri);
    const document = await vscode.workspace.openTextDocument(uri);
    const options: vscode.TextDocumentShowOptions = {
      preview: true
    };

    if (location.range) {
      options.selection = toVscodeRange(location.range);
    }

    await vscode.window.showTextDocument(document, options);
    outputChannel.appendLine(`Opened HIA related location: ${location.uri}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.show(true);
    outputChannel.appendLine(`Cannot open HIA related location ${location.uri}: ${message}`);
    void vscode.window.showWarningMessage("Cannot open HIA related location. See HIA output for details.");
  }
}

/**
 * 在 VS Code 中展示 documentation edit proposal 的人工审查列表。
 * Show documentation edit proposals as a human-review list in VS Code.
 *
 * 中文：首轮实现只允许查看、复制和输出上下文摘要，不写入目标仓库文件。
 * English: The first slice only allows review, copy and context summaries; it never writes target repository files.
 */
async function reviewHiaDocumentationProposals(outputChannel: vscode.OutputChannel): Promise<void> {
  if (!client) {
    void vscode.window.showWarningMessage("HIA language server is not running.");
    return;
  }

  const editor = vscode.window.activeTextEditor;

  if (!editor || !isHiaDocument(editor.document)) {
    void vscode.window.showWarningMessage("Open a .hia.json document before reviewing HIA documentation proposals.");
    return;
  }

  const uri = editor.document.uri.toString();

  outputChannel.show(true);
  outputChannel.appendLine(`Reviewing HIA documentation proposals: ${uri}`);

  let result: HiaDocumentationEditProposalsSummary;

  try {
    result = await client.sendRequest<HiaDocumentationEditProposalsSummary>(HIA_DOCUMENTATION_EDIT_PROPOSALS_REQUEST, {
      uri
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`HIA documentation proposal request failed: ${message}`);
    void vscode.window.showErrorMessage("HIA documentation proposal request failed. See HIA output for details.");
    return;
  }

  outputChannel.appendLine("HIA documentation proposal review report:");

  for (const line of createHiaDocumentationReviewReport(result)) {
    outputChannel.appendLine(`- ${line}`);
  }

  const choices = createHiaDocumentationReviewItemChoices(result.reviewPayload);

  if (choices.length === 0) {
    void vscode.window.showInformationMessage("No HIA documentation proposal requires review.");
    return;
  }

  const selected = await vscode.window.showQuickPick<DocumentationReviewQuickPickItem>(
    choices.map((choice) => ({
      ...choice,
      choice
    })),
    {
      placeHolder: "Choose an HIA documentation proposal to review"
    }
  );

  if (!selected) {
    return;
  }

  await selectHiaDocumentationReviewAction(selected.choice, outputChannel);
}

/**
 * 在 VS Code 的原生 picker 中完成 original source、generated artifact 与文档预览的导航。
 * Navigate original source, generated artifacts and documentation preview through native VS Code pickers.
 */
async function openHiaSourceLinkage(outputChannel: vscode.OutputChannel): Promise<void> {
  if (!client) {
    void vscode.window.showWarningMessage("HIA language server is not running.");
    return;
  }

  const document = await selectHiaDocSourceMapDocument();

  if (!document) {
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  if (!workspaceFolder) {
    void vscode.window.showWarningMessage("Open a workspace doc-source-map before using HIA source linkage.");
    return;
  }

  await vscode.window.showTextDocument(document, {
    preserveFocus: true,
    preview: true
  });
  const sourceMapIndex = await requestHiaSourceLinkageIndex(document.uri.toString());

  if (!sourceMapIndex || sourceMapIndex.status !== "available") {
    outputChannel.show(true);
    outputChannel.appendLine(`HIA source linkage unavailable for ${document.uri.toString()}.`);
    void vscode.window.showWarningMessage("HIA source linkage is unavailable for this doc-source-map. Check the HIA output.");
    return;
  }

  const choices = createHiaSourceLinkageEntryChoices(sourceMapIndex);

  if (choices.length === 0) {
    void vscode.window.showInformationMessage("This doc-source-map has no navigable documentation entries.");
    return;
  }

  const selected = await vscode.window.showQuickPick<SourceLinkageEntryQuickPickItem>(
    choices.map((choice) => ({
      ...choice,
      choice
    })),
    {
      placeHolder: "Choose an HIA documentation linkage entry"
    }
  );

  if (!selected) {
    return;
  }

  const target = await selectHiaSourceLinkageTarget(selected.choice);

  if (!target) {
    return;
  }

  if (target.actionKind === "target") {
    await openHiaSourceLinkageTarget(target.target, workspaceFolder, outputChannel);
    return;
  }

  if (target.actionKind === "documentation-preview") {
    await vscode.commands.executeCommand(HIA_OPEN_PREVIEW_COMMAND);
    return;
  }

  await vscode.env.clipboard.writeText(selected.choice.entry.id);
  outputChannel.appendLine(`Copied HIA source linkage entry id: ${selected.choice.entry.id}`);
  void vscode.window.showInformationMessage("HIA source linkage entry id copied.");
}

/**
 * 在 VS Code 的原生 picker 中消费项目级 relation graph。
 * Consume project-level relation graph data through native VS Code pickers.
 */
async function openHiaProjectRelations(outputChannel: vscode.OutputChannel): Promise<void> {
  if (!client) {
    void vscode.window.showWarningMessage("HIA language server is not running.");
    return;
  }

  const workspaceRoot = resolveWorkspaceRoot();

  if (!workspaceRoot) {
    void vscode.window.showWarningMessage("Open a workspace folder before using HIA project relations.");
    return;
  }

  const document = await selectHiaProjectIndexDocument(workspaceRoot, getHiaCommandSettings());

  if (!document) {
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  if (!workspaceFolder) {
    void vscode.window.showWarningMessage("Open a workspace project-index.json before using HIA project relations.");
    return;
  }

  await vscode.window.showTextDocument(document, {
    preserveFocus: true,
    preview: true
  });
  const graph = await requestHiaProjectRelationGraph(document.uri.toString());

  if (!graph || graph.status !== "available") {
    const reason = graph?.unavailableReason || "project-relation-graph-unavailable";
    outputChannel.show(true);
    outputChannel.appendLine(`HIA project relation graph unavailable for ${document.uri.toString()}: ${reason}`);
    void vscode.window.showWarningMessage(`HIA project relations are unavailable: ${reason}.`);
    return;
  }

  const choices = createHiaProjectRelationChoices(graph);

  if (choices.length === 0) {
    void vscode.window.showInformationMessage("This project relation graph has no navigable relations.");
    return;
  }

  outputChannel.show(true);
  outputChannel.appendLine("HIA project relations:");
  for (const line of createHiaProjectRelationRuntimeReport(graph)) {
    outputChannel.appendLine(`- ${line}`);
  }

  const selected = await vscode.window.showQuickPick<ProjectRelationQuickPickItem>(
    choices.map((choice) => ({
      ...choice,
      choice
    })),
    {
      placeHolder: "Choose an HIA project relation"
    }
  );

  if (!selected) {
    return;
  }

  const target = await selectHiaProjectRelationTarget(selected.choice);

  if (!target) {
    return;
  }

  if (target.actionKind === "target") {
    await openHiaProjectRelationTarget(target.target, workspaceFolder, outputChannel);
    return;
  }

  if (target.actionKind === "documentation-preview") {
    await vscode.commands.executeCommand(HIA_OPEN_PREVIEW_COMMAND);
    return;
  }

  const value = target.actionKind === "copy-entry-id"
    ? selected.choice.relation.entryId
    : selected.choice.relation.id;

  if (!value) {
    void vscode.window.showWarningMessage("HIA project relation value is unavailable.");
    return;
  }

  await vscode.env.clipboard.writeText(value);
  outputChannel.appendLine(`Copied HIA project relation value: ${value}`);
  void vscode.window.showInformationMessage("HIA project relation value copied.");
}

async function selectHiaDocSourceMapDocument(): Promise<vscode.TextDocument | undefined> {
  const activeDocument = vscode.window.activeTextEditor?.document;

  if (activeDocument && isHiaDocSourceMapDocument(activeDocument)) {
    return activeDocument;
  }

  const candidates = await vscode.workspace.findFiles("**/*.docmap.json", "**/{.git,node_modules}/**", 100);

  if (candidates.length === 0) {
    void vscode.window.showWarningMessage("No workspace doc-source-map (*.docmap.json) was found.");
    return undefined;
  }

  const selected = await vscode.window.showQuickPick<SourceLinkageDocumentQuickPickItem>(
    candidates.map((uri) => ({
      label: vscode.workspace.asRelativePath(uri),
      uri
    })),
    {
      placeHolder: "Choose a workspace doc-source-map"
    }
  );

  return selected ? vscode.workspace.openTextDocument(selected.uri) : undefined;
}

async function selectHiaProjectIndexDocument(
  workspaceRoot: string,
  settings: HiaCommandSettings
): Promise<vscode.TextDocument | undefined> {
  const activeDocument = vscode.window.activeTextEditor?.document;

  if (activeDocument && isHiaProjectIndexDocument(activeDocument)) {
    return activeDocument;
  }

  const defaultProjectIndexPath = path.resolve(workspaceRoot, settings.out, "project-index.json");

  if (await tryStat(defaultProjectIndexPath)) {
    return vscode.workspace.openTextDocument(vscode.Uri.file(defaultProjectIndexPath));
  }

  const candidates = await vscode.workspace.findFiles("**/project-index.json", "**/{.git,node_modules}/**", 100);

  if (candidates.length === 0) {
    void vscode.window.showWarningMessage("No workspace project-index.json was found. Run HIA: Build Docs first.");
    return undefined;
  }

  const selected = await vscode.window.showQuickPick<ProjectIndexDocumentQuickPickItem>(
    candidates.map((uri) => ({
      label: vscode.workspace.asRelativePath(uri),
      uri
    })),
    {
      placeHolder: "Choose an HIA project-index.json"
    }
  );

  return selected ? vscode.workspace.openTextDocument(selected.uri) : undefined;
}

async function requestHiaSourceLinkageIndex(uri: string): Promise<HiaDocumentSourceMapIndexSummary | undefined> {
  if (!client) {
    return undefined;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await client.sendRequest<HiaDocumentSourceMapIndexSummary>(HIA_DOCUMENT_SOURCE_MAP_INDEX_REQUEST, {
        uri
      });

      if (result.status !== "unavailable" || attempt === 4) {
        return result;
      }
    } catch {
      return undefined;
    }

    await waitForHiaHostIndex();
  }

  return undefined;
}

async function requestHiaProjectRelationGraph(uri: string): Promise<HiaProjectRelationGraphSummary | undefined> {
  if (!client) {
    return undefined;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await client.sendRequest<HiaProjectRelationGraphSummary>(HIA_PROJECT_RELATION_GRAPH_REQUEST, {
        uri
      });

      if (result.status !== "unavailable" || attempt === 4) {
        return result;
      }
    } catch {
      return undefined;
    }

    await waitForHiaHostIndex();
  }

  return undefined;
}

function waitForHiaHostIndex(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
}

async function selectHiaSourceLinkageTarget(choice: HiaSourceLinkageEntryChoice): Promise<SourceLinkageActionQuickPickItem | undefined> {
  const navigationItems = createHiaSourceLinkageNavigationTargets(choice.entry).map((target) => ({
    label: target.label,
    actionKind: "target" as const,
    target,
    ...(target.selector ? { description: target.selector } : {})
  }));
  const actions: SourceLinkageActionQuickPickItem[] = [
    ...navigationItems,
    {
      label: "Open documentation preview",
      description: "Uses the existing HIA: Open Preview command",
      actionKind: "documentation-preview"
    },
    {
      label: "Copy documentation linkage entry id",
      description: choice.entry.id,
      actionKind: "copy-entry-id"
    }
  ];

  return vscode.window.showQuickPick(actions, {
    placeHolder: `Navigate ${choice.label}`
  });
}

async function selectHiaProjectRelationTarget(choice: HiaProjectRelationChoice): Promise<ProjectRelationActionQuickPickItem | undefined> {
  return vscode.window.showQuickPick<ProjectRelationActionQuickPickItem>(
    createHiaProjectRelationActionChoices(choice),
    {
      placeHolder: `Navigate ${choice.label}`
    }
  );
}

async function selectHiaDocumentationReviewAction(
  choice: HiaDocumentationReviewItemChoice,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const item = choice.item;
  const actions: DocumentationReviewActionQuickPickItem[] = [
    {
      label: "Show proposal details",
      description: item.proposalId || item.id || "proposal id unavailable",
      actionKind: "show-details",
      item
    },
    {
      label: "Copy draft text",
      description: item.actionHints?.copyDraftAvailable ? "review-only draft" : "draft unavailable",
      actionKind: "copy-draft",
      item
    },
    {
      label: "Copy proposal id",
      description: item.proposalId || item.id || "proposal id unavailable",
      actionKind: "copy-proposal-id",
      item
    },
    {
      label: "Show context summary",
      description: "doc-source-map, project relation and privacy boundary",
      actionKind: "show-context",
      item
    },
    {
      label: "Show edit candidate preview",
      description: item.editCandidate?.status === "preview-only" ? item.editCandidate.kind || "candidate preview" : "candidate unavailable",
      actionKind: "show-edit-candidate",
      item
    },
    {
      label: "Apply edit",
      description: "disabled until human-approved apply contract lands",
      actionKind: "apply-unavailable",
      item
    }
  ];
  const selected = await vscode.window.showQuickPick(actions, {
    placeHolder: `Review ${choice.label}`
  });

  if (!selected) {
    return;
  }

  if (selected.actionKind === "show-details") {
    showHiaDocumentationReviewItemDetails(item, outputChannel);
    return;
  }

  if (selected.actionKind === "copy-draft") {
    await copyHiaDocumentationReviewDraft(item, outputChannel);
    return;
  }

  if (selected.actionKind === "copy-proposal-id") {
    const value = item.proposalId || item.id;

    if (!value) {
      void vscode.window.showWarningMessage("HIA documentation proposal id is unavailable.");
      return;
    }

    await vscode.env.clipboard.writeText(value);
    outputChannel.appendLine(`Copied HIA documentation proposal id: ${value}`);
    void vscode.window.showInformationMessage("HIA documentation proposal id copied.");
    return;
  }

  if (selected.actionKind === "show-context") {
    showHiaDocumentationReviewContext(item, outputChannel);
    return;
  }

  if (selected.actionKind === "show-edit-candidate") {
    showHiaDocumentationReviewEditCandidate(item, outputChannel);
    return;
  }

  outputChannel.show(true);
  outputChannel.appendLine("HIA documentation apply action is unavailable in this review-only slice.");
  void vscode.window.showInformationMessage("HIA documentation apply is disabled until the human-approved apply contract is implemented.");
}

async function openHiaSourceLinkageTarget(
  target: HiaSourceLinkageNavigationTarget,
  workspaceFolder: vscode.WorkspaceFolder,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const resolution = resolveHiaSourceLinkageTargetPath(workspaceFolder.uri.fsPath, target.path);

  if (!resolution.path) {
    outputChannel.show(true);
    outputChannel.appendLine(`HIA source linkage target rejected (${resolution.reason ?? "target-path-unsafe"}): ${target.path}`);
    void vscode.window.showWarningMessage("HIA source linkage target is outside the workspace or unsafe. See HIA output.");
    return;
  }

  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(resolution.path));
    const options: vscode.TextDocumentShowOptions = {
      preview: true
    };

    if (target.position) {
      const position = new vscode.Position(Math.max(0, target.position.line - 1), Math.max(0, (target.position.column ?? 1) - 1));
      options.selection = new vscode.Range(position, position);
    }

    await vscode.window.showTextDocument(document, options);
    outputChannel.appendLine(`Opened HIA ${target.kind}: ${path.relative(workspaceFolder.uri.fsPath, resolution.path)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.show(true);
    outputChannel.appendLine(`Cannot open HIA ${target.kind} ${target.path}: ${message}`);
    void vscode.window.showWarningMessage("HIA source linkage target is unavailable. See HIA output.");
  }
}

async function openHiaProjectRelationTarget(
  target: HiaProjectRelationNavigationTarget,
  workspaceFolder: vscode.WorkspaceFolder,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const resolution = resolveHiaSourceLinkageTargetPath(workspaceFolder.uri.fsPath, target.path);

  if (!resolution.path) {
    outputChannel.show(true);
    outputChannel.appendLine(`HIA project relation target rejected (${resolution.reason ?? "target-path-unsafe"}): ${target.path}`);
    void vscode.window.showWarningMessage("HIA project relation target is outside the workspace or unsafe. See HIA output.");
    return;
  }

  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(resolution.path));
    const options: vscode.TextDocumentShowOptions = {
      preview: true
    };

    if (target.position) {
      const position = new vscode.Position(Math.max(0, target.position.line - 1), Math.max(0, (target.position.column ?? 1) - 1));
      options.selection = new vscode.Range(position, position);
    }

    await vscode.window.showTextDocument(document, options);
    outputChannel.appendLine(`Opened HIA project relation ${target.node.kind}: ${path.relative(workspaceFolder.uri.fsPath, resolution.path)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.show(true);
    outputChannel.appendLine(`Cannot open HIA project relation ${target.path}: ${message}`);
    void vscode.window.showWarningMessage("HIA project relation target is unavailable. See HIA output.");
  }
}

function isHiaDocSourceMapDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && document.uri.fsPath.toLowerCase().endsWith(".docmap.json");
}

function isHiaProjectIndexDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && path.basename(document.uri.fsPath).toLowerCase() === "project-index.json";
}

interface SourceLinkageEntryQuickPickItem extends vscode.QuickPickItem {
  choice: HiaSourceLinkageEntryChoice;
}

interface SourceLinkageDocumentQuickPickItem extends vscode.QuickPickItem {
  uri: vscode.Uri;
}

interface DocumentationReviewQuickPickItem extends HiaDocumentationReviewItemChoice, vscode.QuickPickItem {
  choice: HiaDocumentationReviewItemChoice;
}

type DocumentationReviewActionKind =
  | "apply-unavailable"
  | "copy-draft"
  | "copy-proposal-id"
  | "show-context"
  | "show-edit-candidate"
  | "show-details";

interface DocumentationReviewActionQuickPickItem extends vscode.QuickPickItem {
  actionKind: DocumentationReviewActionKind;
  item: HiaDocumentationReviewPayloadItemSummary;
}

interface ProjectIndexDocumentQuickPickItem extends vscode.QuickPickItem {
  uri: vscode.Uri;
}

type SourceLinkageActionQuickPickItem = SourceLinkageNavigationQuickPickItem | SourceLinkageSimpleActionQuickPickItem;

interface SourceLinkageNavigationQuickPickItem extends vscode.QuickPickItem {
  actionKind: "target";
  target: HiaSourceLinkageNavigationTarget;
}

interface SourceLinkageSimpleActionQuickPickItem extends vscode.QuickPickItem {
  actionKind: "copy-entry-id" | "documentation-preview";
}

interface ProjectRelationQuickPickItem extends vscode.QuickPickItem {
  choice: HiaProjectRelationChoice;
}

type ProjectRelationActionQuickPickItem = HiaProjectRelationActionChoice & vscode.QuickPickItem;

function showHiaDocumentationReviewItemDetails(item: HiaDocumentationReviewPayloadItemSummary, outputChannel: vscode.OutputChannel): void {
  outputChannel.show(true);
  outputChannel.appendLine("HIA documentation proposal details:");

  for (const line of createHiaDocumentationReviewItemReport(item)) {
    outputChannel.appendLine(`- ${line}`);
  }

  void vscode.window.showInformationMessage("HIA documentation proposal details written to output.");
}

async function copyHiaDocumentationReviewDraft(item: HiaDocumentationReviewPayloadItemSummary, outputChannel: vscode.OutputChannel): Promise<void> {
  const text = getHiaDocumentationReviewDraftText(item);

  if (!text) {
    void vscode.window.showWarningMessage("This HIA documentation proposal has no draft text to copy.");
    return;
  }

  await vscode.env.clipboard.writeText(text);
  outputChannel.appendLine(`Copied HIA documentation review draft: ${item.proposalId || item.id || "unknown"}`);
  void vscode.window.showInformationMessage("HIA documentation draft copied.");
}

function showHiaDocumentationReviewContext(item: HiaDocumentationReviewPayloadItemSummary, outputChannel: vscode.OutputChannel): void {
  outputChannel.show(true);
  outputChannel.appendLine("HIA documentation proposal context summary:");
  outputChannel.appendLine(`- Proposal: ${item.proposalId || item.id || "unknown"}`);
  outputChannel.appendLine(`- Target URI: ${item.target?.targetUri || "not included"}`);
  outputChannel.appendLine(`- Relative path: ${item.target?.relativePath || "not included"}`);
  outputChannel.appendLine(`- Resource path: ${item.target?.resourcePath || "not included"}`);
  outputChannel.appendLine(`- Resource pointer: ${item.target?.resourcePointer || "not included"}`);
  outputChannel.appendLine(`- Doc source-map entries: ${item.contextLinks?.docSourceMapEntryCount ?? 0}`);
  outputChannel.appendLine(`- Project entries: ${item.contextLinks?.projectEntryCount ?? 0}`);
  outputChannel.appendLine(`- Relations: ${item.contextLinks?.relationCount ?? 0}`);
  outputChannel.appendLine(`- Workspace edit boundary: ${item.workspaceEditBoundary || "review-only"}`);
  outputChannel.appendLine("- Source bodies: not shown by the VS Code review command.");
  void vscode.window.showInformationMessage("HIA documentation proposal context written to output.");
}

function showHiaDocumentationReviewEditCandidate(item: HiaDocumentationReviewPayloadItemSummary, outputChannel: vscode.OutputChannel): void {
  const candidate = item.editCandidate;

  outputChannel.show(true);
  outputChannel.appendLine("HIA documentation edit candidate preview:");

  if (!candidate) {
    outputChannel.appendLine("- Candidate: unavailable");
    void vscode.window.showWarningMessage("This HIA documentation proposal has no edit candidate preview.");
    return;
  }

  outputChannel.appendLine(`- Candidate: ${candidate.id || "unknown"}`);
  outputChannel.appendLine(`- Status: ${candidate.status || "unknown"}`);
  outputChannel.appendLine(`- Kind: ${candidate.kind || "unknown"}`);
  outputChannel.appendLine(`- Apply mode: ${candidate.applyMode || "unknown"}`);
  outputChannel.appendLine(`- Workspace edit boundary: ${candidate.workspaceEditBoundary || "review-only"}`);
  outputChannel.appendLine(`- Direct apply: ${candidate.safety?.directApply ? "enabled" : "disabled"}`);
  outputChannel.appendLine(`- Host write: ${candidate.safety?.hostWrite ? "enabled" : "disabled"}`);
  outputChannel.appendLine(`- Source content: ${candidate.safety?.includesSourceContent ? "included" : "not included"}`);
  outputChannel.appendLine(`- Target resource: ${candidate.target?.resourcePath || "not included"}`);
  outputChannel.appendLine(`- Target pointer: ${candidate.target?.resourcePointer || "not included"}`);
  outputChannel.appendLine(`- Target source: ${candidate.target?.relativePath || "not included"}`);

  if (candidate.preview?.text) {
    outputChannel.appendLine("- Preview text:");
    outputChannel.appendLine(candidate.preview.text);
  } else if (candidate.unavailableReason) {
    outputChannel.appendLine(`- Unavailable reason: ${candidate.unavailableReason}`);
  }

  void vscode.window.showInformationMessage("HIA documentation edit candidate preview written to output.");
}

function showHiaResourceAction(action: HiaResourceActionSummary, outputChannel: vscode.OutputChannel): void {
  outputChannel.show(true);
  outputChannel.appendLine("HIA resource action:");

  for (const line of createHiaResourceActionReport(action)) {
    outputChannel.appendLine(`- ${line}`);
  }

  if (action.status === "blocked") {
    const reason = action.unavailableReason || "diagnostic-target-unknown";
    void vscode.window.showWarningMessage(`HIA resource action is unavailable: ${reason}.`);
    return;
  }

  if (action.status === "preflight") {
    void vscode.window.showInformationMessage("HIA resource edit preview written to output. File write is not enabled yet.");
    return;
  }

  void vscode.window.showInformationMessage("HIA resource action details written to output.");
}

async function copyHiaResourceKey(action: HiaResourceActionSummary, outputChannel: vscode.OutputChannel): Promise<void> {
  const value = action.key || action.path;

  if (!value) {
    outputChannel.show(true);
    outputChannel.appendLine("HIA resource key/path unavailable for copy action.");
    void vscode.window.showWarningMessage("HIA resource key/path unavailable.");
    return;
  }

  await vscode.env.clipboard.writeText(value);
  outputChannel.appendLine(`Copied HIA resource key/path: ${value}`);
  void vscode.window.showInformationMessage("HIA resource key/path copied.");
}

function getFirstRelatedLocation(diagnostic: vscode.Diagnostic): HiaAuthoringLocationSummary | undefined {
  const data = getDiagnosticData(diagnostic);

  if (!isRecord(data) || !Array.isArray(data.relatedLocations)) {
    return undefined;
  }

  return data.relatedLocations.find(isAuthoringLocation);
}

function getUnavailableDiagnosticLocation(diagnostic: vscode.Diagnostic): HiaAuthoringLocationSummary | undefined {
  const data = getDiagnosticData(diagnostic);

  if (!isRecord(data) || typeof data.unavailableReason !== "string") {
    return undefined;
  }

  return {
    kind: "diagnostic-target",
    unavailableReason: data.unavailableReason
  };
}

function isAuthoringLocation(value: unknown): value is HiaAuthoringLocationSummary {
  return isRecord(value) && typeof value.kind === "string";
}

function isResourceAction(value: unknown): value is HiaResourceActionSummary & { id: string; kind: string } {
  return isRecord(value) && typeof value.id === "string" && typeof value.kind === "string";
}

function getResourceActionLocation(action: HiaResourceActionSummary): HiaAuthoringLocationSummary | undefined {
  if (isAuthoringLocation(action.location)) {
    return action.location;
  }

  if (action.targetUri) {
    const location: HiaAuthoringLocationSummary = {
      kind: action.kind === "open-source" ? "source-fragment" : "i18n-resource",
      uri: action.targetUri
    };

    if (action.resourcePath) {
      location.resourcePath = action.resourcePath;
    }

    if (action.fieldPath) {
      location.targetPath = action.fieldPath;
    }

    return location;
  }

  if (action.unavailableReason) {
    return {
      kind: "diagnostic-target",
      unavailableReason: action.unavailableReason
    };
  }

  return undefined;
}

function toDiagnosticSummary(diagnostic: vscode.Diagnostic): HiaDiagnosticSummary {
  const data = getDiagnosticData(diagnostic);
  const summary: HiaDiagnosticSummary = {
    severity: diagnostic.severity
  };

  if (diagnostic.code !== undefined) {
    summary.code = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
  }

  if (data !== undefined) {
    summary.data = data;
  }

  if (diagnostic.relatedInformation) {
    summary.relatedInformation = diagnostic.relatedInformation;
  }

  return summary;
}

function getDiagnosticData(diagnostic: vscode.Diagnostic): unknown {
  return (diagnostic as vscode.Diagnostic & { data?: unknown }).data;
}

function toVscodeRange(range: NonNullable<HiaAuthoringLocationSummary["range"]>): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runHiaCliBuild(
  extensionPath: string,
  workspaceRoot: string,
  outputChannel: vscode.OutputChannel,
  args = ["docs", "build"]
): Promise<number | null> {
  const cliModule = resolveHiaCliModule(extensionPath);
  const child = spawn(process.execPath, [cliModule, ...args], {
    cwd: workspaceRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });

  outputChannel.appendLine(`CLI module: ${cliModule}`);
  outputChannel.appendLine(`Workspace root: ${workspaceRoot}`);

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    outputChannel.append(chunk);
  });
  child.stderr.on("data", (chunk: string) => {
    outputChannel.append(chunk);
  });

  return new Promise((resolve) => {
    child.on("exit", (code) => {
      resolve(code);
    });
  });
}
