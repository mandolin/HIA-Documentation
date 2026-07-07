import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
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
  HIA_IDE_CAPABILITIES_REQUEST,
  HIA_OPEN_PREVIEW_COMMAND,
  HIA_OPEN_RELATED_LOCATION_COMMAND,
  HIA_OUTPUT_CHANNEL_NAME,
  HIA_RESOURCE_ACTIONS_REQUEST,
  HIA_RESOURCE_INDEX_REQUEST,
  HIA_SHOW_RESOURCE_ACTION_COMMAND,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaBuildArgs,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  createHiaPreviewReport,
  createHiaResourceActionReport,
  createHiaValidationReport,
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
  type HiaIdeCapabilitiesSummary,
  type HiaPreviewManifestSummary,
  type HiaPreviewStatusReportInput,
  type HiaResourceActionSummary,
  type HiaResourceActionsSummary,
  type HiaResourceIndexSummary
} from "./config.js";

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

  context.subscriptions.push(outputChannel, showOutputCommand, buildDocsCommand, openPreviewCommand, validateWorkspaceCommand, openRelatedLocationCommand, showResourceActionCommand, copyResourceKeyCommand, codeActionProvider, {
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
    previewPath: configuration.get<string>("preview.path")
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
