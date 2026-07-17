import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  hasConfigErrors,
  validateHiaProjectConfig,
  validateHiaProjectManifest,
  type HiaProjectConfig,
  type HiaProjectDocsManifest
} from "@hia-doc/config";
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
import {
  createDocSourceMapIndex,
  DOC_SOURCE_MAP_CONTRACT,
  type DocSourceMapIndex,
  type DocSourceMapQuery
} from "@hia-doc/source-linkage";
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
  DiagnosticSeverity
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
  createHiaProjectRelationGraphResult,
  type HiaProjectRelationGraphResult
} from "./project-relations.js";
import {
  createEmptyHiaResourceIndex,
  createHiaResourceIndex,
  type HiaLspResourceIndex
} from "./resources.js";
import {
  createHiaDocumentSourceMapIndexResult,
  type HiaDocumentSourceMapIndexResult
} from "./source-linkage.js";

export interface HiaLspManagedDocument {
  docSourceMapIndex?: DocSourceMapIndex;
  diagnostics: Diagnostic[];
  projectRelationGraph?: HiaProjectRelationGraphResult;
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
  getManagedDocSourceMapIndex(uri: string, query?: DocSourceMapQuery): HiaDocumentSourceMapIndexResult;
  getManagedProjectRelationGraph(uri: string): HiaProjectRelationGraphResult;
  getManagedResourceIndex(uri: string): HiaLspResourceIndex;
  getResourceActions(uri: string): HiaDocumentResourceActionsResult;
  getWorkspaceProjectRelationGraphUris(): readonly string[];
  getWorkspaceSourceMapUris(): readonly string[];
  getWorkspaceRoots(): readonly string[];
  reloadWorkspaceRuntime(): void;
  validateTextDocument(document: TextDocument): Diagnostic[];
  validateManagedDocument(uri: string): Diagnostic[];
}

export function createHiaLspService(options: HiaLspServiceOptions = {}): HiaLspService {
  const documents = new Map<string, HiaLspManagedDocument>();
  const profileStateLocked = Boolean(options.profileSet || options.profiles);
  let profileState = createProfileState(options);
  let workspaceDocSourceMapIndexes = new Map<string, DocSourceMapIndex>();
  let workspaceProjectRelationGraphs = new Map<string, HiaProjectRelationGraphResult>();
  let initialized = false;
  let shutdownRequested = false;
  let workspaceRoots: string[] = [];

  function createManagedDocument(uri: string, text: string, languageId = "json", version = 1): HiaLspManagedDocument {
    const document = TextDocument.create(uri, languageId, version, text);
    const parsed = parseJsonText(text);
    const resourceIndex = createResourceIndexFromParsed(uri, parsed);
    const docSourceMapIndex = createDocSourceMapIndexFromParsed(uri, parsed);
    const projectRelationGraph = createProjectRelationGraphFromParsed(uri, parsed);
    const diagnostics = docSourceMapIndex
      ? createDocSourceMapDiagnostics(docSourceMapIndex)
      : validateTextDocumentWithResourceIndex(document, resourceIndex);

    const managedDocument: HiaLspManagedDocument = {
      diagnostics,
      resourceIndex,
      text,
      uri,
      version
    };

    if (docSourceMapIndex) {
      managedDocument.docSourceMapIndex = docSourceMapIndex;
    }

    if (projectRelationGraph) {
      managedDocument.projectRelationGraph = projectRelationGraph;
    }

    return managedDocument;
  }

  function validateTextDocument(document: TextDocument): Diagnostic[] {
    const parsed = parseJsonText(document.getText());
    const docSourceMapIndex = createDocSourceMapIndexFromParsed(document.uri, parsed);

    if (docSourceMapIndex) {
      return createDocSourceMapDiagnostics(docSourceMapIndex);
    }

    return validateTextDocumentWithResourceIndex(
      document,
      createResourceIndexFromParsed(document.uri, parsed)
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
      reloadWorkspaceRuntime();

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
    getManagedDocSourceMapIndex(uri: string, query?: DocSourceMapQuery): HiaDocumentSourceMapIndexResult {
      const index = documents.get(uri)?.docSourceMapIndex ?? workspaceDocSourceMapIndexes.get(uri);

      return createHiaDocumentSourceMapIndexResult({
        ...(index ? { index } : {}),
        ...(query ? { query } : {}),
        uri
      });
    },
    getManagedProjectRelationGraph(uri: string): HiaProjectRelationGraphResult {
      return documents.get(uri)?.projectRelationGraph
        ?? workspaceProjectRelationGraphs.get(uri)
        ?? createHiaProjectRelationGraphResult({ uri });
    },
    getManagedResourceIndex(uri: string): HiaLspResourceIndex {
      return documents.get(uri)?.resourceIndex ?? createEmptyHiaResourceIndex({ uri });
    },
    getResourceActions(uri: string): HiaDocumentResourceActionsResult {
      return createHiaResourceActions(createAuthoringContext(uri));
    },
    getWorkspaceProjectRelationGraphUris(): readonly string[] {
      return [...workspaceProjectRelationGraphs.keys()].sort();
    },
    getWorkspaceSourceMapUris(): readonly string[] {
      return [...workspaceDocSourceMapIndexes.keys()].sort();
    },
    getWorkspaceRoots(): readonly string[] {
      return workspaceRoots;
    },
    reloadWorkspaceRuntime(): void {
      reloadWorkspaceRuntime();
    },
    validateTextDocument,
    validateManagedDocument(uri: string): Diagnostic[] {
      return documents.get(uri)?.diagnostics ?? [];
    }
  };

  function reloadWorkspaceRuntime(): void {
    const workspaceRuntime = loadWorkspaceRuntime(workspaceRoots, {
      loadProfiles: !profileStateLocked
    });
    workspaceDocSourceMapIndexes = workspaceRuntime.docSourceMapIndexes;
    workspaceProjectRelationGraphs = workspaceRuntime.projectRelationGraphs;

    if (!profileStateLocked && workspaceRuntime.profiles.length > 0) {
      profileState = createProfileState({
        profiles: workspaceRuntime.profiles
      });
    }
  }

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

function loadWorkspaceRuntime(workspaceRoots: readonly string[], options: { loadProfiles: boolean }): {
  docSourceMapIndexes: Map<string, DocSourceMapIndex>;
  profiles: HiaDocumentationProfile[];
  projectRelationGraphs: Map<string, HiaProjectRelationGraphResult>;
} {
  const docSourceMapIndexes = new Map<string, DocSourceMapIndex>();
  const profiles: HiaDocumentationProfile[] = [];
  const projectRelationGraphs = new Map<string, HiaProjectRelationGraphResult>();

  for (const workspaceRootUri of workspaceRoots) {
    const workspaceRoot = fileUriToPath(workspaceRootUri);

    if (!workspaceRoot) {
      continue;
    }

    const configPath = path.join(workspaceRoot, "hia.config.json");
    const config = readJsonIfExists(configPath) as HiaProjectConfig | undefined;

    if (!config || hasConfigErrors(validateHiaProjectConfig(config)) || !config.docs?.projectManifest) {
      continue;
    }

    const projectManifestPath = path.resolve(path.dirname(configPath), config.docs.projectManifest);
    const projectManifest = readJsonIfExists(projectManifestPath) as HiaProjectDocsManifest | undefined;

    if (!projectManifest || validateHiaProjectManifest(projectManifest, { targetPath: projectManifestPath }).some((diagnostic) => diagnostic.severity === "error")) {
      continue;
    }

    const manifestBaseDir = path.dirname(projectManifestPath);
    const outputRoot = path.resolve(path.dirname(configPath), config.docs.output ?? "dist/docs");
    const projectIndexPath = path.join(outputRoot, "project-index.json");
    const projectIndex = readJsonIfExists(projectIndexPath);

    if (projectIndex) {
      const uri = pathToFileURL(projectIndexPath).href;
      projectRelationGraphs.set(uri, createHiaProjectRelationGraphResult({ projectIndex, uri }));
    }

    if (options.loadProfiles) {
      profiles.push(...loadProjectProfiles(projectManifest, manifestBaseDir));
    }

    for (const input of projectManifest.inputs ?? []) {
      if (input.kind !== "doc-source-map" || !input.path) {
        continue;
      }

      const docSourceMapPath = path.resolve(manifestBaseDir, input.path);
      const docSourceMap = readJsonIfExists(docSourceMapPath);

      if (!docSourceMap) {
        continue;
      }

      const uri = pathToFileURL(docSourceMapPath).href;
      docSourceMapIndexes.set(uri, createDocSourceMapIndex(docSourceMap, { path: uri }));
    }
  }

  return {
    docSourceMapIndexes,
    profiles,
    projectRelationGraphs
  };
}

function loadProjectProfiles(projectManifest: HiaProjectDocsManifest, manifestBaseDir: string): HiaDocumentationProfile[] {
  return (projectManifest.profiles ?? [])
    .flatMap((profileRef) => {
      if (!profileRef.path) {
        return [];
      }

      const profile = readJsonIfExists(path.resolve(manifestBaseDir, profileRef.path));
      return isRecord(profile) ? [profile as unknown as HiaDocumentationProfile] : [];
    });
}

function readJsonIfExists(filePath: string): unknown | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function fileUriToPath(uri: string): string | undefined {
  if (!uri.startsWith("file://")) {
    return undefined;
  }

  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
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

function parseJsonText(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function createResourceIndexFromParsed(uri: string, parsed: unknown): HiaLspResourceIndex {
  if (isHiaDocumentLike(parsed)) {
    return createHiaResourceIndex(parsed, { uri });
  }

  return createEmptyHiaResourceIndex({ uri });
}

function createDocSourceMapIndexFromParsed(uri: string, parsed: unknown): DocSourceMapIndex | undefined {
  if (isDocSourceMapLike(parsed)) {
    return createDocSourceMapIndex(parsed, { path: uri });
  }

  return undefined;
}

function createProjectRelationGraphFromParsed(uri: string, parsed: unknown): HiaProjectRelationGraphResult | undefined {
  if (!isProjectIndexLike(parsed)) {
    return undefined;
  }

  const result = createHiaProjectRelationGraphResult({
    projectIndex: parsed,
    uri
  });

  return result.status === "available" ? result : undefined;
}

function createDocSourceMapDiagnostics(index: DocSourceMapIndex): Diagnostic[] {
  return index.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 }
    },
    severity: diagnostic.severity === "error"
      ? DiagnosticSeverity.Error
      : diagnostic.severity === "warning"
        ? DiagnosticSeverity.Warning
        : DiagnosticSeverity.Information,
    source: "hia-source-linkage",
    ...(diagnostic.targetPath ? { data: { targetPath: diagnostic.targetPath } } : {})
  }));
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

function isDocSourceMapLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && (value as { contract?: unknown }).contract === DOC_SOURCE_MAP_CONTRACT;
}

function isProjectIndexLike(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && value.contract === "hia-project-navigation-index";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
