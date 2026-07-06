import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  HiaDocument
} from "@hia-doc/core";
import type {
  Diagnostic,
  InitializeParams,
  InitializeResult
} from "vscode-languageserver/node.js";
import {
  TextDocumentSyncKind
} from "vscode-languageserver/node.js";
import { analyzeHiaDocumentText } from "./diagnostics.js";
import {
  createEmptyHiaResourceIndex,
  createHiaResourceIndex,
  type HiaLspResourceIndex
} from "./resources.js";

export interface HiaLspManagedDocument {
  diagnostics: Diagnostic[];
  resourceIndex: HiaLspResourceIndex;
  text: string;
  uri: string;
  version: number;
}

export interface HiaLspService {
  readonly documents: ReadonlyMap<string, HiaLspManagedDocument>;
  initialize(params?: InitializeParams): InitializeResult;
  shutdown(): null;
  isInitialized(): boolean;
  isShutdownRequested(): boolean;
  openDocument(uri: string, text: string, languageId?: string, version?: number): HiaLspManagedDocument;
  updateDocument(uri: string, text: string, version?: number): HiaLspManagedDocument;
  closeDocument(uri: string): void;
  getManagedResourceIndex(uri: string): HiaLspResourceIndex;
  getWorkspaceRoots(): readonly string[];
  validateTextDocument(document: TextDocument): Diagnostic[];
  validateManagedDocument(uri: string): Diagnostic[];
}

export function createHiaLspService(): HiaLspService {
  const documents = new Map<string, HiaLspManagedDocument>();
  let initialized = false;
  let shutdownRequested = false;
  let workspaceRoots: string[] = [];

  function createManagedDocument(uri: string, text: string, languageId = "json", version = 1): HiaLspManagedDocument {
    const document = TextDocument.create(uri, languageId, version, text);
    const diagnostics = validateTextDocument(document);
    const resourceIndex = createResourceIndexFromText(uri, text);

    return {
      diagnostics,
      resourceIndex,
      text,
      uri,
      version
    };
  }

  function validateTextDocument(document: TextDocument): Diagnostic[] {
    return analyzeHiaDocumentText(document.getText(), {
      uri: document.uri
    });
  }

  return {
    documents,
    initialize(params?: InitializeParams): InitializeResult {
      initialized = true;
      shutdownRequested = false;
      workspaceRoots = collectWorkspaceRoots(params);

      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          workspace: {
            workspaceFolders: {
              supported: true
            }
          }
        },
        serverInfo: {
          name: "hia-lsp",
          version: "0.0.0"
        }
      };
    },
    shutdown(): null {
      shutdownRequested = true;
      return null;
    },
    isInitialized(): boolean {
      return initialized;
    },
    isShutdownRequested(): boolean {
      return shutdownRequested;
    },
    openDocument(uri: string, text: string, languageId = "json", version = 1): HiaLspManagedDocument {
      const managedDocument = createManagedDocument(uri, text, languageId, version);
      documents.set(uri, managedDocument);
      return managedDocument;
    },
    updateDocument(uri: string, text: string, version = 1): HiaLspManagedDocument {
      const previous = documents.get(uri);
      const managedDocument = createManagedDocument(uri, text, previous ? "json" : "json", version);
      documents.set(uri, managedDocument);
      return managedDocument;
    },
    closeDocument(uri: string): void {
      documents.delete(uri);
    },
    getManagedResourceIndex(uri: string): HiaLspResourceIndex {
      return documents.get(uri)?.resourceIndex ?? createEmptyHiaResourceIndex({ uri });
    },
    getWorkspaceRoots(): readonly string[] {
      return workspaceRoots;
    },
    validateTextDocument,
    validateManagedDocument(uri: string): Diagnostic[] {
      return documents.get(uri)?.diagnostics ?? [];
    }
  };
}

function createResourceIndexFromText(uri: string, text: string): HiaLspResourceIndex {
  try {
    const parsed = JSON.parse(text) as unknown;

    if (isHiaDocumentLike(parsed)) {
      return createHiaResourceIndex(parsed, { uri });
    }
  } catch {
    return createEmptyHiaResourceIndex({ uri });
  }

  return createEmptyHiaResourceIndex({ uri });
}

function collectWorkspaceRoots(params?: InitializeParams): string[] {
  if (params?.workspaceFolders?.length) {
    return params.workspaceFolders.map((folder) => folder.uri);
  }

  if (params?.rootUri) {
    return [params.rootUri];
  }

  return [];
}

function isHiaDocumentLike(value: unknown): value is HiaDocument {
  return typeof value === "object"
    && value !== null
    && Array.isArray((value as HiaDocument).symbols)
    && Array.isArray((value as HiaDocument).nodes);
}
