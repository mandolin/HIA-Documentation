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
  HIA_CLIENT_ID,
  HIA_EXTENSION_NAME,
  HIA_OUTPUT_CHANNEL_NAME,
  HIA_SHOW_OUTPUT_COMMAND,
  createHiaDocumentSelector,
  createHiaFileWatcherPattern,
  resolveHiaServerModule
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

  client = new LanguageClient(HIA_CLIENT_ID, HIA_EXTENSION_NAME, serverOptions, clientOptions);

  context.subscriptions.push(outputChannel, showOutputCommand, {
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
