import {
  ProposedFeatures,
  TextDocuments,
  createConnection
} from "vscode-languageserver/node.js";
import type {
  Connection
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createHiaLspService } from "./service.js";

export interface StartHiaLspServerOptions {
  connection?: Connection;
}

export function startHiaLspServer(options: StartHiaLspServerOptions = {}): Connection {
  const connection = options.connection ?? createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);
  const service = createHiaLspService();

  connection.onInitialize((params) => service.initialize(params));
  connection.onShutdown(() => {
    service.shutdown();
  });

  documents.onDidOpen((event) => {
    const diagnostics = service.validateTextDocument(event.document);
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics
    });
  });

  documents.onDidChangeContent((event) => {
    const diagnostics = service.validateTextDocument(event.document);
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics
    });
  });

  documents.onDidClose((event) => {
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics: []
    });
  });

  documents.listen(connection);
  connection.listen();

  return connection;
}
