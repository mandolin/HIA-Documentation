import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  Diagnostic,
  InitializeParams,
  InitializeResult
} from "vscode-languageserver/node.js";
import {
  TextDocumentSyncKind
} from "vscode-languageserver/node.js";
import { analyzeHiaDocumentText } from "./diagnostics.js";

export interface HiaLspManagedDocument {
  diagnostics: Diagnostic[];
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
  validateTextDocument(document: TextDocument): Diagnostic[];
  validateManagedDocument(uri: string): Diagnostic[];
}

export function createHiaLspService(): HiaLspService {
  const documents = new Map<string, HiaLspManagedDocument>();
  let initialized = false;
  let shutdownRequested = false;

  function createManagedDocument(uri: string, text: string, languageId = "json", version = 1): HiaLspManagedDocument {
    const document = TextDocument.create(uri, languageId, version, text);
    const diagnostics = validateTextDocument(document);

    return {
      diagnostics,
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
    initialize(_params?: InitializeParams): InitializeResult {
      initialized = true;
      shutdownRequested = false;

      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental
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
    validateTextDocument,
    validateManagedDocument(uri: string): Diagnostic[] {
      return documents.get(uri)?.diagnostics ?? [];
    }
  };
}
