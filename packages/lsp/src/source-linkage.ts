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

export const HIA_LSP_DOCUMENT_SOURCE_MAP_INDEX_REQUEST = "hia/documentSourceMapIndex";

export interface HiaDocumentSourceMapIndexParams {
  query?: DocSourceMapQuery;
  uri: string;
}

export type HiaDocumentSourceMapStatus = DocSourceMapIndex["status"] | "unavailable";

export interface HiaDocumentSourceMapIndexResult {
  artifactCount: number;
  diagnostics: HiaSourceLinkageDiagnosticSummary[];
  entries: HiaLspDocSourceMapEntry[];
  entryCount: number;
  linkedEntryCount: number;
  matchedEntryCount: number;
  query?: DocSourceMapQuery;
  sourceCount: number;
  sourceMapCount: number;
  sourcesContentPolicy: string;
  status: HiaDocumentSourceMapStatus;
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
  uri: string;
}): HiaDocumentSourceMapIndexResult {
  const { index, query, uri } = options;

  if (!index) {
    return {
      artifactCount: 0,
      diagnostics: [],
      entries: [],
      entryCount: 0,
      linkedEntryCount: 0,
      matchedEntryCount: 0,
      ...(query ? { query } : {}),
      sourceCount: 0,
      sourceMapCount: 0,
      sourcesContentPolicy: "none",
      status: "unavailable",
      unresolvedEntryCount: 0,
      uri
    };
  }

  const queryResult = query ? queryDocSourceMapIndex(index, query) : undefined;
  const entries = queryResult?.entries ?? index.entries;

  return {
    artifactCount: index.artifactCount,
    diagnostics: createDiagnosticSummaries(index.diagnostics),
    entries: entries.map(createEntrySummary),
    entryCount: index.entryCount,
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
