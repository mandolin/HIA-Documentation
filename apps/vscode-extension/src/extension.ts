import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
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
  HIA_IDE_CAPABILITIES_REQUEST,
  HIA_OPEN_PREVIEW_COMMAND,
  HIA_OPEN_RELATED_LOCATION_COMMAND,
  HIA_OUTPUT_CHANNEL_NAME,
  HIA_RESOURCE_INDEX_REQUEST,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaBuildArgs,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  createHiaValidationReport,
  normalizeHiaCommandSettings,
  resolveConfiguredPreviewPath,
  resolveHiaCliModule,
  resolveHiaServerModule,
  type HiaAuthoringLocationSummary,
  type HiaAuthoringLocationsSummary,
  type HiaCommandSettings,
  type HiaCommandSettingsInput,
  type HiaDiagnosticSummary,
  type HiaIdeCapabilitiesSummary,
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

    const previewPath = resolveConfiguredPreviewPath(workspaceRoot, settings.previewPath);

    try {
      await access(previewPath);
      await vscode.env.openExternal(vscode.Uri.file(previewPath));
      outputChannel.appendLine(`Opened HIA preview: ${previewPath}`);
    } catch {
      void vscode.window.showWarningMessage("HIA preview was not found. Run HIA: Build Docs first.");
      outputChannel.appendLine(`HIA preview not found: ${previewPath}`);
    }
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
      const [index, capabilities, authoringLocations] = await Promise.all([
        client.sendRequest<HiaResourceIndexSummary>(HIA_RESOURCE_INDEX_REQUEST, { uri }),
        client.sendRequest<HiaIdeCapabilitiesSummary>(HIA_IDE_CAPABILITIES_REQUEST, { uri }),
        client.sendRequest<HiaAuthoringLocationsSummary>(HIA_AUTHORING_LOCATIONS_REQUEST, { uri })
      ]);
      const report = createHiaValidationReport({
        authoringLocations,
        capabilities,
        diagnostics,
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
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(createHiaDocumentSelector(), {
    provideCodeActions(_document, _range, codeActionContext) {
      return createDiagnosticCodeActions(codeActionContext.diagnostics);
    }
  }, {
    providedCodeActionKinds: [
      vscode.CodeActionKind.QuickFix
    ]
  });

  client = new LanguageClient(HIA_CLIENT_ID, HIA_EXTENSION_NAME, serverOptions, clientOptions);

  context.subscriptions.push(outputChannel, showOutputCommand, buildDocsCommand, openPreviewCommand, validateWorkspaceCommand, openRelatedLocationCommand, codeActionProvider, {
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

function getHiaCommandSettings(): HiaCommandSettings {
  const configuration = vscode.workspace.getConfiguration(HIA_CONFIGURATION_SECTION);
  const input: HiaCommandSettingsInput = {
    config: configuration.get<string>("build.config"),
    input: configuration.get<string>("build.input"),
    jsdocIntegration: configuration.get<string>("build.jsdocIntegration"),
    locale: configuration.get<string>("build.locale"),
    out: configuration.get<string>("build.out"),
    previewPath: configuration.get<string>("preview.path")
  };

  return normalizeHiaCommandSettings(input);
}

function isHiaDocument(document: vscode.TextDocument): boolean {
  return document.languageId === "hia" || document.uri.fsPath.endsWith(".hia.json");
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
