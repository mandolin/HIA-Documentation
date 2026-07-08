import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  HiaDiagnostic,
  HiaDocument
} from "@hia-doc/core";
import {
  createHiaProfileSet
} from "@hia-doc/profile";
import type {
  HiaDocumentationProfile,
  HiaProfileSet
} from "@hia-doc/profile";
import type {
  CompletionItem,
  Diagnostic,
  FoldingRange,
  Hover,
  InitializeParams,
  InitializeResult,
  Location,
  Position
} from "vscode-languageserver/node.js";
import {
  TextDocumentSyncKind
} from "vscode-languageserver/node.js";
import {
  createHiaAuthoringLocations,
  createHiaCompletionItems,
  createHiaDefinitionLocations,
  createHiaDiagnosticsWithRelatedInformation,
  createHiaFoldingRanges,
  createHiaHover,
  createHiaIdeCapabilities,
  createHiaResourceActions,
  type HiaDocumentAuthoringLocationsResult,
  type HiaDocumentResourceActionsResult,
  type HiaIdeCapabilitiesResult
} from "./authoring.js";
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

export interface HiaLspServiceOptions {
  profileDiagnostics?: HiaDiagnostic[];
  profiles?: HiaDocumentationProfile[];
  profileSet?: HiaProfileSet;
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
  getAuthoringLocations(uri: string): HiaDocumentAuthoringLocationsResult;
  getCompletionItems(uri: string, position?: Position): CompletionItem[];
  getDefinitionLocations(uri: string, position?: Position): Location[];
  getFoldingRanges(uri: string): FoldingRange[];
  getHover(uri: string, position?: Position): Hover | null;
  getIdeCapabilities(uri: string): HiaIdeCapabilitiesResult;
  getManagedResourceIndex(uri: string): HiaLspResourceIndex;
  getResourceActions(uri: string): HiaDocumentResourceActionsResult;
  getWorkspaceRoots(): readonly string[];
  validateTextDocument(document: TextDocument): Diagnostic[];
  validateManagedDocument(uri: string): Diagnostic[];
}

export function createHiaLspService(options: HiaLspServiceOptions = {}): HiaLspService {
  const documents = new Map<string, HiaLspManagedDocument>();
  const profileState = createProfileState(options);
  let initialized = false;
  let shutdownRequested = false;
  let workspaceRoots: string[] = [];

  function createManagedDocument(uri: string, text: string, languageId = "json", version = 1): HiaLspManagedDocument {
    const document = TextDocument.create(uri, languageId, version, text);
    const resourceIndex = createResourceIndexFromText(uri, text);
    const diagnostics = validateTextDocumentWithResourceIndex(document, resourceIndex);

    return {
      diagnostics,
      resourceIndex,
      text,
      uri,
      version
    };
  }

  function validateTextDocument(document: TextDocument): Diagnostic[] {
    return validateTextDocumentWithResourceIndex(
      document,
      createResourceIndexFromText(document.uri, document.getText())
    );
  }

  function validateTextDocumentWithResourceIndex(document: TextDocument, resourceIndex: HiaLspResourceIndex): Diagnostic[] {
    const text = document.getText();
    const rawDiagnostics = analyzeHiaDocumentText(text, {
      uri: document.uri
    });

    return createHiaDiagnosticsWithRelatedInformation({
      document: {
        diagnostics: rawDiagnostics,
        resourceIndex,
        text,
        uri: document.uri
      },
      uri: document.uri,
      workspaceRoots
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
          completionProvider: {
            resolveProvider: false,
            triggerCharacters: ["\"", ".", "/", ":", "@"]
          },
          definitionProvider: true,
          foldingRangeProvider: true,
          hoverProvider: true,
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
    getAuthoringLocations(uri: string): HiaDocumentAuthoringLocationsResult {
      return createHiaAuthoringLocations(createAuthoringContext(uri));
    },
    getCompletionItems(uri: string, position?: Position): CompletionItem[] {
      return createHiaCompletionItems(createAuthoringContext(uri), position);
    },
    getDefinitionLocations(uri: string, position?: Position): Location[] {
      return createHiaDefinitionLocations(createAuthoringContext(uri), position);
    },
    getFoldingRanges(uri: string): FoldingRange[] {
      return createHiaFoldingRanges(createAuthoringContext(uri));
    },
    getHover(uri: string, position?: Position): Hover | null {
      return createHiaHover(createAuthoringContext(uri), position);
    },
    getIdeCapabilities(uri: string): HiaIdeCapabilitiesResult {
      return createHiaIdeCapabilities(createAuthoringContext(uri));
    },
    getManagedResourceIndex(uri: string): HiaLspResourceIndex {
      return documents.get(uri)?.resourceIndex ?? createEmptyHiaResourceIndex({ uri });
    },
    getResourceActions(uri: string): HiaDocumentResourceActionsResult {
      return createHiaResourceActions(createAuthoringContext(uri));
    },
    getWorkspaceRoots(): readonly string[] {
      return workspaceRoots;
    },
    validateTextDocument,
    validateManagedDocument(uri: string): Diagnostic[] {
      return documents.get(uri)?.diagnostics ?? [];
    }
  };

  function createAuthoringContext(uri: string) {
    const context: {
      profileDiagnostics?: HiaDiagnostic[];
      profileSet?: HiaProfileSet;
      uri: string;
      workspaceRoots: string[];
    } = {
      uri,
      workspaceRoots
    };
    const document = documents.get(uri);

    if (profileState.profileSet) {
      context.profileSet = profileState.profileSet;
    }

    if (profileState.profileDiagnostics.length > 0) {
      context.profileDiagnostics = profileState.profileDiagnostics;
    }

    if (document) {
      return {
        ...context,
        document
      };
    }

    return context;
  }
}

function createProfileState(options: HiaLspServiceOptions): {
  profileDiagnostics: HiaDiagnostic[];
  profileSet?: HiaProfileSet;
} {
  if (options.profileSet) {
    return {
      profileDiagnostics: options.profileDiagnostics ?? options.profileSet.diagnostics,
      profileSet: options.profileSet
    };
  }

  if (options.profiles) {
    const profileSet = createHiaProfileSet({
      profiles: options.profiles
    });

    return {
      profileDiagnostics: options.profileDiagnostics ?? profileSet.diagnostics,
      profileSet
    };
  }

  return {
    profileDiagnostics: options.profileDiagnostics ?? []
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
