import type {
  HiaDiagnostic,
  HiaSourceRange
} from "@hia-doc/core";
import {
  queryDocSourceMapIndex,
  type DocSourceMapArtifactLink,
  type DocSourceMapIndex,
  type DocSourceMapIndexedEntry,
  type DocSourceMapQuery,
  type DocSourceMapSourceLink
} from "@hia-doc/source-linkage";
import {
  createHiaLspHostResultMeta,
  type HiaLspHostResultMeta,
  type HiaLspHostResultSource
} from "./host-contract.js";

export const HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST = "hia/documentSourceMapIndex";
export const HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST_VERSION = "0.1.0-draft";
export const HIA_LSP_SOURCE_LINKAGE_QUERY_CAPABILITY = "hia.sourceLinkage.query";

export interface HiaDocumentSourceMapIndexParams {
  query?: DocSourceMapQuery;
  uri: string;
}

export type HiaDocumentSourceMapStatus = DocSourceMapIndex["status"] | "unavailable";
export type HiaDocumentSourceMapUnavailableReason = "doc-source-map-missing";

export interface HiaDocumentSourceMapIndexResult {
  artifactCount: number;
  diagnostics: HiaSourceLinkageDiagnosticSummary[];
  entries: HiaLspDocSourceMapEntry[];
  entryCount: number;
  host: HiaLspHostResultMeta;
  linkedEntryCount: number;
  matchedEntryCount: number;
  query?: DocSourceMapQuery;
  sourceCount: number;
  sourceMapCount: number;
  sourcesContentPolicy: string;
  status: HiaDocumentSourceMapStatus;
  unavailableReason?: HiaDocumentSourceMapUnavailableReason;
  unresolvedEntryCount: number;
  uri: string;
}

export interface HiaLspDocSourceMapEntry {
  artifactLinks: HiaLspDocSourceMapArtifactLink[];
  classification?: string;
  diagnostics: string[];
  id: string;
  kind: string;
  relationKind?: string;
  sourceLinks: HiaLspDocSourceMapSourceLink[];
  symbolId?: string;
  symbolKind?: string;
}

export interface HiaLspDocSourceMapSourceLink {
  confidence?: string;
  language?: string;
  path?: string;
  range?: HiaSourceRange;
  rangeSource?: string;
  sourceId: string;
}

export interface HiaLspDocSourceMapArtifactLink {
  artifactId: string;
  confidence?: string;
  language?: string;
  path?: string;
  rangeSource?: string;
  selector?: string;
}

export interface HiaSourceLinkageDiagnosticSummary {
  code: string;
  message: string;
  severity: string;
  targetPath?: string;
}

/**
 * 将 source-linkage runtime index 转换成 LSP request 的稳定 JSON 结果。
 * Convert a source-linkage runtime index into a stable JSON result for the LSP request.
 */
export function createHiaDocumentSourceMapIndexResult(options: {
  index?: DocSourceMapIndex;
  query?: DocSourceMapQuery;
  source?: HiaLspHostResultSource;
  uri: string;
}): HiaDocumentSourceMapIndexResult {
  const { index, query, uri } = options;
  const source = options.source ?? (index ? "managed-document" : "none");

  if (!index) {
    return {
      artifactCount: 0,
      diagnostics: [],
      entries: [],
      entryCount: 0,
      host: createHiaLspHostResultMeta({
        capability: HIA_LSP_SOURCE_LINKAGE_QUERY_CAPABILITY,
        emptyState: "not-loaded",
        method: HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST,
        source,
        version: HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST_VERSION
      }),
      linkedEntryCount: 0,
      matchedEntryCount: 0,
      ...(query ? { query } : {}),
      sourceCount: 0,
      sourceMapCount: 0,
      sourcesContentPolicy: "none",
      status: "unavailable",
      unavailableReason: "doc-source-map-missing",
      unresolvedEntryCount: 0,
      uri
    };
  }

  const queryResult = query ? queryDocSourceMapIndex(index, query) : undefined;
  const entries = queryResult?.entries ?? index.entries;
  const emptyState = createDocSourceMapEmptyState(index, entries, query);

  return {
    artifactCount: index.artifactCount,
    diagnostics: createDiagnosticSummaries(index.diagnostics),
    entries: entries.map(createEntrySummary),
    entryCount: index.entryCount,
    host: createHiaLspHostResultMeta({
      capability: HIA_LSP_SOURCE_LINKAGE_QUERY_CAPABILITY,
      ...(emptyState ? { emptyState } : {}),
      method: HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST,
      source,
      version: HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST_VERSION
    }),
    linkedEntryCount: index.linkedEntryCount,
    matchedEntryCount: entries.length,
    ...(query ? { query } : {}),
    sourceCount: index.sourceCount,
    sourceMapCount: index.sourceMapCount,
    sourcesContentPolicy: index.sourcesContentPolicy,
    status: index.status,
    unresolvedEntryCount: index.unresolvedEntryCount,
    uri
  };
}

function createDocSourceMapEmptyState(
  index: DocSourceMapIndex,
  entries: DocSourceMapIndexedEntry[],
  query: DocSourceMapQuery | undefined
) {
  if (query && entries.length === 0) {
    return "query-no-match" as const;
  }

  if (index.entries.length === 0) {
    return "source-data-empty" as const;
  }

  return undefined;
}

function createEntrySummary(entry: DocSourceMapIndexedEntry): HiaLspDocSourceMapEntry {
  const item: HiaLspDocSourceMapEntry = {
    artifactLinks: entry.artifactLinks.map(createArtifactLinkSummary),
    diagnostics: [...entry.diagnostics],
    id: entry.id,
    kind: entry.kind,
    sourceLinks: entry.sourceLinks.map(createSourceLinkSummary)
  };

  if (entry.classification) {
    item.classification = entry.classification;
  }

  if (entry.relationKind) {
    item.relationKind = entry.relationKind;
  }

  if (entry.symbolId) {
    item.symbolId = entry.symbolId;
  }

  if (entry.symbolKind) {
    item.symbolKind = entry.symbolKind;
  }

  return item;
}

function createSourceLinkSummary(link: DocSourceMapSourceLink): HiaLspDocSourceMapSourceLink {
  return {
    ...link
  };
}

function createArtifactLinkSummary(link: DocSourceMapArtifactLink): HiaLspDocSourceMapArtifactLink {
  return {
    ...link
  };
}

function createDiagnosticSummaries(diagnostics: HiaDiagnostic[]): HiaSourceLinkageDiagnosticSummary[] {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    ...(diagnostic.targetPath ? { targetPath: diagnostic.targetPath } : {})
  }));
}
