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
  HIA_BUILD_DOCS_COMMAND,
  HIA_CLIENT_ID,
  HIA_EXTENSION_NAME,
  HIA_OPEN_PREVIEW_COMMAND,
  HIA_OUTPUT_CHANNEL_NAME,
  HIA_RESOURCE_INDEX_REQUEST,
  HIA_SHOW_OUTPUT_COMMAND,
  HIA_VALIDATE_WORKSPACE_COMMAND,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  resolveDefaultPreviewPath,
  resolveHiaCliModule,
  resolveHiaServerModule
} from "./config.js";

let client: LanguageClient | undefined;

interface HiaResourceIndexSummary {
  documentId?: string;
  i18nKeys?: unknown[];
  i18nResources?: unknown[];
  missingLocales?: unknown[];
  sourceReferences?: unknown[];
  uri?: string;
}

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

    if (!workspaceRoot) {
      void vscode.window.showWarningMessage("Open a workspace folder before building HIA docs.");
      return;
    }

    outputChannel.show(true);
    outputChannel.appendLine("Running HIA docs build...");

    const exitCode = await runHiaCliBuild(context.extensionPath, workspaceRoot, outputChannel);

    if (exitCode === 0) {
      void vscode.window.showInformationMessage("HIA docs build completed.");
      return;
    }

    void vscode.window.showErrorMessage(`HIA docs build failed with exit code ${exitCode}.`);
  });
  const openPreviewCommand = vscode.commands.registerCommand(HIA_OPEN_PREVIEW_COMMAND, async () => {
    const workspaceRoot = resolveWorkspaceRoot();

    if (!workspaceRoot) {
      void vscode.window.showWarningMessage("Open a workspace folder before opening HIA preview.");
      return;
    }

    const previewPath = resolveDefaultPreviewPath(workspaceRoot);

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

    if (!client) {
      void vscode.window.showWarningMessage("HIA language server is not running.");
      return;
    }

    const uri = editor.document.uri.toString();
    const index = await client.sendRequest<HiaResourceIndexSummary>(HIA_RESOURCE_INDEX_REQUEST, { uri });
    const summary = [
      `document=${index.documentId || uri}`,
      `resources=${index.i18nResources?.length ?? 0}`,
      `keys=${index.i18nKeys?.length ?? 0}`,
      `missingLocales=${index.missingLocales?.length ?? 0}`,
      `sourceRefs=${index.sourceReferences?.length ?? 0}`
    ].join(", ");

    outputChannel.show(true);
    outputChannel.appendLine(`HIA validation summary: ${summary}`);
    void vscode.window.showInformationMessage("HIA workspace validation summary written to output.");
  });

  client = new LanguageClient(HIA_CLIENT_ID, HIA_EXTENSION_NAME, serverOptions, clientOptions);

  context.subscriptions.push(outputChannel, showOutputCommand, buildDocsCommand, openPreviewCommand, validateWorkspaceCommand, {
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

function runHiaCliBuild(extensionPath: string, workspaceRoot: string, outputChannel: vscode.OutputChannel): Promise<number | null> {
  const cliModule = resolveHiaCliModule(extensionPath);
  const child = spawn(process.execPath, [cliModule, "docs", "build"], {
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
