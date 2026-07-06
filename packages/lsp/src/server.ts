import {
  ProposedFeatures,
  TextDocuments,
  createConnection
} from "vscode-languageserver/node.js";
import type {
  Connection
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  HIA_LSP_RESOURCE_INDEX_REQUEST,
  type HiaDocumentResourceIndexParams
} from "./resources.js";
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

  connection.onRequest(HIA_LSP_RESOURCE_INDEX_REQUEST, (params: HiaDocumentResourceIndexParams) => {
    return service.getManagedResourceIndex(params.uri);
  });

  documents.onDidOpen((event) => {
    const managedDocument = service.openDocument(
      event.document.uri,
      event.document.getText(),
      event.document.languageId,
      event.document.version
    );
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics: managedDocument.diagnostics
    });
  });

  documents.onDidChangeContent((event) => {
    const managedDocument = service.updateDocument(
      event.document.uri,
      event.document.getText(),
      event.document.version
    );
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics: managedDocument.diagnostics
    });
  });

  documents.onDidClose((event) => {
    service.closeDocument(event.document.uri);
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics: []
    });
  });

  documents.listen(connection);
  connection.listen();

  return connection;
}
