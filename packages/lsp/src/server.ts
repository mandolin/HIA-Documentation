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
  HIA_LSP_AUTHORING_LOCATIONS_REQUEST,
  HIA_LSP_IDE_CAPABILITIES_REQUEST,
  HIA_LSP_RESOURCE_ACTIONS_REQUEST,
  type HiaDocumentAuthoringLocationsParams,
  type HiaDocumentResourceActionsParams,
  type HiaIdeCapabilitiesParams
} from "./authoring.js";
import {
  HIA_LSP_RESOURCE_INDEX_REQUEST,
  type HiaDocumentResourceIndexParams
} from "./resources.js";
import { createHiaLspService } from "./service.js";
import {
  HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST,
  type HiaDocumentSourceMapIndexParams
} from "./source-linkage.js";
import {
  HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST,
  type HiaProjectRelationGraphParams
} from "./project-relations.js";

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

  connection.onDidChangeWatchedFiles(() => {
    service.reloadWorkspaceRuntime();
  });

  connection.onRequest(HIA_LSP_RESOURCE_INDEX_REQUEST, (params: HiaDocumentResourceIndexParams) => {
    return service.getManagedResourceIndex(params.uri);
  });

  connection.onRequest(HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST, (params: HiaDocumentSourceMapIndexParams) => {
    return service.getManagedDocSourceMapIndex(params.uri, params.query);
  });

  connection.onRequest(HIA_LSP_PROJECT_RELATION_GRAPH_REQUEST, (params: HiaProjectRelationGraphParams) => {
    return service.getManagedProjectRelationGraph(params.uri);
  });

  connection.onRequest(HIA_LSP_IDE_CAPABILITIES_REQUEST, (params: HiaIdeCapabilitiesParams) => {
    return service.getIdeCapabilities(params.uri);
  });

  connection.onRequest(HIA_LSP_AUTHORING_LOCATIONS_REQUEST, (params: HiaDocumentAuthoringLocationsParams) => {
    return service.getAuthoringLocations(params.uri);
  });

  connection.onRequest(HIA_LSP_RESOURCE_ACTIONS_REQUEST, (params: HiaDocumentResourceActionsParams) => {
    return service.getResourceActions(params.uri);
  });

  connection.onCompletion((params) => {
    return service.getCompletionItems(params.textDocument.uri, params.position);
  });

  connection.onHover((params) => {
    return service.getHover(params.textDocument.uri, params.position);
  });

  connection.onDefinition((params) => {
    return service.getDefinitionLocations(params.textDocument.uri, params.position);
  });

  connection.onFoldingRanges((params) => {
    return service.getFoldingRanges(params.textDocument.uri);
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
