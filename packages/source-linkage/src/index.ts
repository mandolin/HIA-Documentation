import path from "node:path";
import {
  allGeneratedPositionsFor,
  eachMapping,
  generatedPositionFor,
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  TraceMap,
  type Bias,
  type SourceMapInput
} from "@jridgewell/trace-mapping";
import {
  createHiaDiagnostic,
  type HiaDiagnostic,
  type HiaDiagnosticData,
  type HiaDiagnosticSeverity,
  type HiaSourcePosition,
  type HiaSourceRange
} from "@hia-doc/core";
import { DOC_SOURCE_MAP_CONTRACT, DOC_SOURCE_MAP_CONTRACT_VERSION } from "./constants.js";

export { DOC_SOURCE_MAP_CONTRACT, DOC_SOURCE_MAP_CONTRACT_VERSION } from "./constants.js";
export {
  DOC_SOURCE_MAP_JSON_SCHEMA,
  DOC_SOURCE_MAP_SCHEMA_ID,
  DOC_SOURCE_MAP_SCHEMA_VERSION
} from "./schema.js";

export interface DocSourceMapIndexOptions {
  path?: string;
}

export interface DocSourceMapIndex {
  artifactCount: number;
  contract: typeof DOC_SOURCE_MAP_CONTRACT;
  contractVersion?: string;
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  entryCount: number;
  id?: string;
  linkedEntryCount: number;
  path?: string;
  sourceCount: number;
  sourceMapCount: number;
  sourcesContentPolicy: string;
  status: "available" | "invalid" | "unsupported-version";
  unresolvedEntryCount: number;
}

export interface DocSourceMapIndexedEntry {
  artifactLinks: DocSourceMapArtifactLink[];
  classification?: string;
  diagnostics: string[];
  id: string;
  kind: string;
  relationKind?: string;
  sourceLinks: DocSourceMapSourceLink[];
  symbolId?: string;
  symbolKind?: string;
}

export interface DocSourceMapSourceLink {
  confidence?: string;
  language?: string;
  path?: string;
  range?: HiaSourceRange;
  rangeSource?: string;
  sourceId: string;
}

export interface DocSourceMapArtifactLink {
  artifactId: string;
  confidence?: string;
  language?: string;
  path?: string;
  rangeSource?: string;
  selector?: string;
}

export interface DocSourceMapQuery {
  artifactPath?: string;
  selector?: string;
  sourcePath?: string;
  position?: HiaSourcePosition;
  symbolId?: string;
  symbolKind?: string;
}

export interface DocSourceMapQueryResult {
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  matchedEntryCount: number;
  query: DocSourceMapQuery;
  status: DocSourceMapIndex["status"];
}

export type OrdinarySourceMapBias = "greatest-lower-bound" | "least-upper-bound";

export interface OrdinarySourceMapIndexOptions {
  artifactPath?: string;
  path?: string;
}

export interface OrdinarySourceMapIndex {
  artifactPath?: string;
  diagnostics: HiaDiagnostic[];
  mappingCount: number;
  path?: string;
  sources: string[];
  sourceCount: number;
  status: "available" | "invalid";
  traceMap?: TraceMap;
}

export interface OrdinarySourceMapLookupOptions {
  bias?: OrdinarySourceMapBias;
}

export interface SourceMapOriginalPosition {
  name?: string;
  position: HiaSourcePosition;
  sourcePath: string;
}

export interface SourceMapGeneratedPosition {
  artifactPath?: string;
  position: HiaSourcePosition;
}

export interface SourceMapOriginalLookupResult {
  diagnostics: HiaDiagnostic[];
  generated: SourceMapGeneratedPosition;
  original?: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

export interface SourceMapGeneratedLookupResult {
  diagnostics: HiaDiagnostic[];
  generated?: SourceMapGeneratedPosition;
  original: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

export interface SourceMapAllGeneratedLookupResult {
  diagnostics: HiaDiagnostic[];
  generated: SourceMapGeneratedPosition[];
  original: SourceMapOriginalPosition;
  status: OrdinarySourceMapIndex["status"] | "unmapped";
}

export interface SourceLinkedLookupQuery {
  generatedPath?: string;
  generatedPosition?: HiaSourcePosition;
  originalPosition?: HiaSourcePosition;
  originalSourcePath?: string;
  selector?: string;
  symbolId?: string;
  symbolKind?: string;
}

export interface SourceLinkedLookupResult {
  diagnostics: HiaDiagnostic[];
  entries: DocSourceMapIndexedEntry[];
  generated?: SourceMapGeneratedPosition;
  matchedEntryCount: number;
  original?: SourceMapOriginalPosition;
  query: SourceLinkedLookupQuery;
  status: DocSourceMapIndex["status"] | OrdinarySourceMapIndex["status"] | "unmapped";
}

interface IndexedNode {
  id: string;
  language?: string;
  path?: string;
}

export function createDocSourceMapIndex(value: unknown, options: DocSourceMapIndexOptions = {}): DocSourceMapIndex {
  const diagnostics: HiaDiagnostic[] = [];

  if (!isRecord(value)) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest must be a JSON object.",
      "error",
      options.path
    ));

    return createEmptyIndex({
      diagnostics,
      ...(options.path ? { path: options.path } : {}),
      status: "invalid"
    });
  }

  if (value.contract !== DOC_SOURCE_MAP_CONTRACT) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest contract must be doc-source-map.",
      "error",
      options.path,
      {
        contract: stringValue(value.contract) ?? ""
      }
    ));
  }

  const contractVersion = stringValue(value.contractVersion);
  if (contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_UNSUPPORTED_VERSION",
      `doc-source-map contractVersion should be ${DOC_SOURCE_MAP_CONTRACT_VERSION}.`,
      contractVersion ? "warning" : "error",
      options.path,
      {
        contractVersion: contractVersion ?? ""
      }
    ));
  }

  const privacy = isRecord(value.privacy) ? value.privacy : {};
  const sourcesContentPolicy = stringValue(privacy.sourcesContentPolicy) ?? "none";
  const artifacts = collectIndexedNodes(value.artifacts);
  const sources = collectIndexedNodes(value.sources);
  const sourceMaps = collectIndexedNodes(value.sourceMaps);
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  collectPathDiagnostics(diagnostics, artifacts, options.path, "artifact");
  collectPathDiagnostics(diagnostics, sources, options.path, "source");
  collectPathDiagnostics(diagnostics, sourceMaps, options.path, "sourceMap");
  collectContractRefDiagnostics(diagnostics, value.artifacts, options.path);
  collectSourcesContentDiagnostics(diagnostics, value.sources, sourcesContentPolicy, options.path);
  diagnostics.push(...normalizeManifestDiagnostics(value.diagnostics, options.path));

  const entries = Array.isArray(value.entries)
    ? value.entries.filter(isRecord).map((entry, index) => createIndexedEntry(entry, index, sourceById, artifactById, diagnostics, options.path))
    : [];

  if (!Array.isArray(value.entries)) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_MANIFEST_INVALID",
      "doc-source-map manifest entries must be an array.",
      "error",
      appendTarget(options.path, "entries")
    ));
  }

  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const unsupportedVersion = contractVersion !== DOC_SOURCE_MAP_CONTRACT_VERSION && !hasErrors;

  const id = stringValue(value.id);

  return {
    artifactCount: artifacts.length,
    contract: DOC_SOURCE_MAP_CONTRACT,
    ...(contractVersion ? { contractVersion } : {}),
    diagnostics,
    entries,
    entryCount: entries.length,
    ...(id ? { id } : {}),
    linkedEntryCount: entries.filter(isLinkedEntry).length,
    ...(options.path ? { path: options.path } : {}),
    sourceCount: sources.length,
    sourceMapCount: sourceMaps.length,
    sourcesContentPolicy,
    status: hasErrors ? "invalid" : unsupportedVersion ? "unsupported-version" : "available",
    unresolvedEntryCount: entries.filter((entry) => !isLinkedEntry(entry)).length
  };
}

export function validateDocSourceMap(value: unknown, options: DocSourceMapIndexOptions = {}): HiaDiagnostic[] {
  return createDocSourceMapIndex(value, options).diagnostics;
}

/**
 * 建立普通 source map 查询索引。输入由调用方显式提供，本函数不抓取 sourceMappingURL，也不暴露 sourcesContent。
 * Build an ordinary source map lookup index. The caller provides the map explicitly; this helper does not fetch sourceMappingURL or expose sourcesContent.
 */
export function createOrdinarySourceMapIndex(value: SourceMapInput | unknown, options: OrdinarySourceMapIndexOptions = {}): OrdinarySourceMapIndex {
  const diagnostics: HiaDiagnostic[] = [];

  try {
    const traceMap = new TraceMap(value as SourceMapInput, options.path ?? null);
    let mappingCount = 0;
    eachMapping(traceMap, () => {
      mappingCount += 1;
    });

    const sources = traceMap.sources
      .map((source) => typeof source === "string" ? normalizeLookupPath(source) : "")
      .filter((source) => source.length > 0);

    return {
      ...(options.artifactPath ? { artifactPath: normalizeLookupPath(options.artifactPath) } : {}),
      diagnostics,
      mappingCount,
      ...(options.path ? { path: options.path } : {}),
      sources,
      sourceCount: sources.length,
      status: "available",
      traceMap
    };
  } catch (error) {
    diagnostics.push(createSourceLinkageDiagnostic(
      "ORDINARY_SOURCE_MAP_INVALID",
      `ordinary source map could not be parsed: ${errorMessage(error)}`,
      "error",
      options.path
    ));

    return {
      ...(options.artifactPath ? { artifactPath: normalizeLookupPath(options.artifactPath) } : {}),
      diagnostics,
      mappingCount: 0,
      ...(options.path ? { path: options.path } : {}),
      sources: [],
      sourceCount: 0,
      status: "invalid"
    };
  }
}

/**
 * 查询 doc-source-map 索引中的文档化语义链路。
 * Query documentation linkage entries from a doc-source-map index.
 */
export function queryDocSourceMapIndex(index: DocSourceMapIndex, query: DocSourceMapQuery = {}): DocSourceMapQueryResult {
  const entries = index.entries.filter((entry) => matchesDocSourceMapQuery(entry, query));

  return {
    diagnostics: index.diagnostics,
    entries,
    matchedEntryCount: entries.length,
    query,
    status: index.status
  };
}

export function findDocSourceMapEntriesBySymbol(index: DocSourceMapIndex, symbolId: string): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, { symbolId }).entries;
}

export function findDocSourceMapEntriesBySource(
  index: DocSourceMapIndex,
  sourcePath: string,
  position?: HiaSourcePosition
): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, {
    sourcePath,
    ...(position ? { position } : {})
  }).entries;
}

export function findDocSourceMapEntriesByArtifact(
  index: DocSourceMapIndex,
  artifactPath: string,
  selector?: string
): DocSourceMapIndexedEntry[] {
  return queryDocSourceMapIndex(index, {
    artifactPath,
    ...(selector ? { selector } : {})
  }).entries;
}

/**
 * 从生成位置追溯到原始源码位置。
 * Trace a generated position back to the original source position.
 */
export function findOriginalPositionForGenerated(
  index: OrdinarySourceMapIndex,
  generatedPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapOriginalLookupResult {
  const generated = createGeneratedPosition(index.artifactPath, generatedPosition);

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      generated,
      status: index.status
    };
  }

  const original = originalPositionFor(index.traceMap, {
    line: generatedPosition.line,
    column: hiaColumnToSourceMapColumn(generatedPosition.column),
    bias: toTraceMapBias(options.bias)
  });

  if (!original.source || !original.line || original.column === null) {
    return {
      diagnostics: index.diagnostics,
      generated,
      status: "unmapped"
    };
  }

  return {
    diagnostics: index.diagnostics,
    generated,
    original: {
      ...(original.name ? { name: original.name } : {}),
      position: {
        line: original.line,
        column: sourceMapColumnToHiaColumn(original.column)
      },
      sourcePath: normalizeLookupPath(original.source)
    },
    status: index.status
  };
}

/**
 * 从原始源码位置查找一个生成位置。
 * Find one generated position for an original source position.
 */
export function findGeneratedPositionForOriginal(
  index: OrdinarySourceMapIndex,
  sourcePath: string,
  originalPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapGeneratedLookupResult {
  const original = createOriginalPosition(sourcePath, originalPosition);

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      original,
      status: index.status
    };
  }

  const generated = generatedPositionFor(index.traceMap, {
    source: normalizeLookupPath(sourcePath),
    line: originalPosition.line,
    column: hiaColumnToSourceMapColumn(originalPosition.column),
    bias: toTraceMapBias(options.bias)
  });

  if (!generated.line || generated.column === null) {
    return {
      diagnostics: index.diagnostics,
      original,
      status: "unmapped"
    };
  }

  return {
    diagnostics: index.diagnostics,
    generated: createGeneratedPosition(index.artifactPath, {
      line: generated.line,
      column: sourceMapColumnToHiaColumn(generated.column)
    }),
    original,
    status: index.status
  };
}

/**
 * 从原始源码位置查找全部生成位置。
 * Find all generated positions for an original source position.
 */
export function findAllGeneratedPositionsForOriginal(
  index: OrdinarySourceMapIndex,
  sourcePath: string,
  originalPosition: HiaSourcePosition,
  options: OrdinarySourceMapLookupOptions = {}
): SourceMapAllGeneratedLookupResult {
  const original = createOriginalPosition(sourcePath, originalPosition);

  if (index.status !== "available" || !index.traceMap) {
    return {
      diagnostics: index.diagnostics,
      generated: [],
      original,
      status: index.status
    };
  }

  const generated = allGeneratedPositionsFor(index.traceMap, {
    source: normalizeLookupPath(sourcePath),
    line: originalPosition.line,
    column: hiaColumnToSourceMapColumn(originalPosition.column),
    bias: toTraceMapBias(options.bias)
  }).map((position) => createGeneratedPosition(index.artifactPath, {
    line: position.line,
    column: sourceMapColumnToHiaColumn(position.column)
  }));

  return {
    diagnostics: index.diagnostics,
    generated,
    original,
    status: generated.length > 0 ? index.status : "unmapped"
  };
}

/**
 * 联合 ordinary source map 与 doc-source-map，回答生成物位置对应的文档化语义。
 * Combine ordinary source map and doc-source-map lookup to answer documentation semantics for a generated artifact position.
 */
export function querySourceLinkedPosition(
  docSourceMapIndex: DocSourceMapIndex,
  ordinarySourceMapIndex: OrdinarySourceMapIndex,
  query: SourceLinkedLookupQuery
): SourceLinkedLookupResult {
  let original: SourceMapOriginalPosition | undefined;
  let generated: SourceMapGeneratedPosition | undefined;
  let status: SourceLinkedLookupResult["status"] = docSourceMapIndex.status;

  if (query.generatedPosition) {
    const generatedLookup = findOriginalPositionForGenerated(ordinarySourceMapIndex, query.generatedPosition);
    original = generatedLookup.original;
    generated = createGeneratedPosition(query.generatedPath ?? generatedLookup.generated.artifactPath, query.generatedPosition);
    status = generatedLookup.status === "available" ? status : generatedLookup.status;
  }

  if (query.originalSourcePath && query.originalPosition) {
    original = createOriginalPosition(query.originalSourcePath, query.originalPosition);
    const generatedLookup = findGeneratedPositionForOriginal(ordinarySourceMapIndex, query.originalSourcePath, query.originalPosition);
    generated = generatedLookup.generated;
    status = generatedLookup.status === "available" ? status : generatedLookup.status;
  }

  const docQuery: DocSourceMapQuery = {
    ...(query.symbolId ? { symbolId: query.symbolId } : {}),
    ...(query.symbolKind ? { symbolKind: query.symbolKind } : {}),
    ...(original ? { sourcePath: original.sourcePath, position: original.position } : {}),
    ...(generated?.artifactPath ?? query.generatedPath ? { artifactPath: generated?.artifactPath ?? query.generatedPath } : {}),
    ...(query.selector ? { selector: query.selector } : {})
  };
  const docQueryResult = queryDocSourceMapIndex(docSourceMapIndex, docQuery);

  return {
    diagnostics: [
      ...docQueryResult.diagnostics,
      ...ordinarySourceMapIndex.diagnostics
    ],
    entries: docQueryResult.entries,
    ...(generated ? { generated } : {}),
    matchedEntryCount: docQueryResult.matchedEntryCount,
    ...(original ? { original } : {}),
    query,
    status
  };
}

function createIndexedEntry(
  entry: Record<string, unknown>,
  index: number,
  sourceById: Map<string, IndexedNode>,
  artifactById: Map<string, IndexedNode>,
  diagnostics: HiaDiagnostic[],
  targetPath?: string
): DocSourceMapIndexedEntry {
  const id = stringValue(entry.id) ?? `entry:${index + 1}`;
  const sourceLinks = Array.isArray(entry.sourceRefs)
    ? entry.sourceRefs.filter(isRecord).map((sourceRef) => createSourceLink(sourceRef, sourceById))
    : [];
  const artifactLinks = Array.isArray(entry.artifactRefs)
    ? entry.artifactRefs.filter(isRecord).map((artifactRef) => createArtifactLink(artifactRef, artifactById))
    : [];

  for (const sourceRef of Array.isArray(entry.sourceRefs) ? entry.sourceRefs.filter(isRecord) : []) {
    const sourceId = stringValue(sourceRef.sourceId);
    if (sourceId && !sourceById.has(sourceId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_UNRESOLVED",
        `doc-source-map entry references unknown source "${sourceId}".`,
        "warning",
        appendTarget(targetPath, `entries.${index}.sourceRefs`),
        {
          entryId: id,
          sourceId
        }
      ));
    }
  }

  for (const artifactRef of Array.isArray(entry.artifactRefs) ? entry.artifactRefs.filter(isRecord) : []) {
    const artifactId = stringValue(artifactRef.artifactId);
    if (artifactId && !artifactById.has(artifactId)) {
      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_UNRESOLVED",
        `doc-source-map entry references unknown artifact "${artifactId}".`,
        "warning",
        appendTarget(targetPath, `entries.${index}.artifactRefs`),
        {
          artifactId,
          entryId: id
        }
      ));
    }
  }

  const item: DocSourceMapIndexedEntry = {
    artifactLinks,
    diagnostics: collectEntryDiagnosticCodes(entry.diagnostics),
    id,
    kind: stringValue(entry.kind) ?? "entry",
    sourceLinks
  };
  const classification = stringValue(entry.classification);
  const relationKind = stringValue(entry.relationKind);
  const symbolId = stringValue(entry.symbolId);
  const symbolKind = stringValue(entry.symbolKind);

  if (classification) {
    item.classification = classification;
  }

  if (relationKind) {
    item.relationKind = relationKind;
  }

  if (symbolId) {
    item.symbolId = symbolId;
  }

  if (symbolKind) {
    item.symbolKind = symbolKind;
  }

  return item;
}

function createSourceLink(sourceRef: Record<string, unknown>, sourceById: Map<string, IndexedNode>): DocSourceMapSourceLink {
  const sourceId = stringValue(sourceRef.sourceId) ?? "";
  const source = sourceById.get(sourceId);
  const link: DocSourceMapSourceLink = {
    sourceId
  };
  const confidence = stringValue(sourceRef.confidence);
  const range = normalizeRange(sourceRef.range);
  const rangeSource = stringValue(sourceRef.rangeSource);

  if (confidence) {
    link.confidence = confidence;
  }

  if (source?.language) {
    link.language = source.language;
  }

  if (source?.path) {
    link.path = source.path;
  }

  if (range) {
    link.range = range;
  }

  if (rangeSource) {
    link.rangeSource = rangeSource;
  }

  return link;
}

function createArtifactLink(artifactRef: Record<string, unknown>, artifactById: Map<string, IndexedNode>): DocSourceMapArtifactLink {
  const artifactId = stringValue(artifactRef.artifactId) ?? "";
  const artifact = artifactById.get(artifactId);
  const link: DocSourceMapArtifactLink = {
    artifactId
  };
  const confidence = stringValue(artifactRef.confidence);
  const rangeSource = stringValue(artifactRef.rangeSource);
  const selector = stringValue(artifactRef.selector);

  if (artifact?.language) {
    link.language = artifact.language;
  }

  if (artifact?.path) {
    link.path = artifact.path;
  }

  if (selector) {
    link.selector = selector;
  }

  if (rangeSource) {
    link.rangeSource = rangeSource;
  }

  if (confidence) {
    link.confidence = confidence;
  }

  return link;
}

function isLinkedEntry(entry: DocSourceMapIndexedEntry): boolean {
  const hasUsableSource = entry.sourceLinks.some((link) => link.sourceId && link.path && link.confidence !== "none" && link.rangeSource !== "unresolved");
  const hasUsableArtifact = entry.artifactLinks.some((link) => link.artifactId && link.path && link.confidence !== "none" && link.rangeSource !== "unresolved");

  return hasUsableSource && hasUsableArtifact;
}

function matchesDocSourceMapQuery(entry: DocSourceMapIndexedEntry, query: DocSourceMapQuery): boolean {
  if (query.symbolId && entry.symbolId !== query.symbolId) {
    return false;
  }

  if (query.symbolKind && entry.symbolKind !== query.symbolKind) {
    return false;
  }

  if (query.sourcePath) {
    const sourcePath = query.sourcePath;
    if (!entry.sourceLinks.some((link) => pathsEqual(link.path, sourcePath) && (!query.position || containsPosition(link.range, query.position)))) {
      return false;
    }
  }

  if (query.artifactPath) {
    const artifactPath = query.artifactPath;
    if (!entry.artifactLinks.some((link) => pathsEqual(link.path, artifactPath) && (!query.selector || link.selector === query.selector))) {
      return false;
    }
  }

  return true;
}

function containsPosition(range: HiaSourceRange | undefined, position: HiaSourcePosition): boolean {
  if (!range) {
    return false;
  }

  return comparePositions(position, range.start) >= 0 && comparePositions(position, range.end) <= 0;
}

function comparePositions(left: HiaSourcePosition, right: HiaSourcePosition): number {
  if (left.line !== right.line) {
    return left.line - right.line;
  }

  return (left.column ?? 0) - (right.column ?? 0);
}

function createOriginalPosition(sourcePath: string, position: HiaSourcePosition): SourceMapOriginalPosition {
  return {
    position,
    sourcePath: normalizeLookupPath(sourcePath)
  };
}

function createGeneratedPosition(artifactPath: string | undefined, position: HiaSourcePosition): SourceMapGeneratedPosition {
  return {
    ...(artifactPath ? { artifactPath: normalizeLookupPath(artifactPath) } : {}),
    position
  };
}

function hiaColumnToSourceMapColumn(column: number | undefined): number {
  return Math.max(0, (column ?? 1) - 1);
}

function sourceMapColumnToHiaColumn(column: number): number {
  return column + 1;
}

function toTraceMapBias(value: OrdinarySourceMapBias | undefined): Bias {
  return value === "least-upper-bound" ? LEAST_UPPER_BOUND : GREATEST_LOWER_BOUND;
}

function pathsEqual(left: string | undefined, right: string): boolean {
  return typeof left === "string" && normalizeLookupPath(left) === normalizeLookupPath(right);
}

function normalizeLookupPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function collectIndexedNodes(value: unknown): IndexedNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item, index) => {
      const node: IndexedNode = {
        id: stringValue(item.id) ?? `node:${index + 1}`
      };
      const language = stringValue(item.language);
      const itemPath = stringValue(item.path);

      if (language) {
        node.language = language;
      }

      if (itemPath) {
        node.path = itemPath;
      }

      return node;
    });
}

function collectPathDiagnostics(diagnostics: HiaDiagnostic[], nodes: IndexedNode[], targetPath: string | undefined, kind: string): void {
  for (const node of nodes) {
    if (!node.path || !isUnsafeRelativePath(node.path)) {
      continue;
    }

    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_UNSAFE_PATH",
      `doc-source-map ${kind} path must be a safe relative path.`,
      "error",
      targetPath,
      {
        id: node.id,
        path: node.path
      }
    ));
  }
}

function collectContractRefDiagnostics(diagnostics: HiaDiagnostic[], artifacts: unknown, targetPath: string | undefined): void {
  if (!Array.isArray(artifacts)) {
    return;
  }

  artifacts.filter(isRecord).forEach((artifact, artifactIndex) => {
    const refs = Array.isArray(artifact.contractRefs) ? artifact.contractRefs : [];

    refs.filter(isRecord).forEach((ref, refIndex) => {
      const refPath = stringValue(ref.path);
      if (!refPath || !isUnsafeRelativePath(refPath)) {
        return;
      }

      diagnostics.push(createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_UNSAFE_PATH",
        "doc-source-map contractRef path must be a safe relative path.",
        "error",
        appendTarget(targetPath, `artifacts.${artifactIndex}.contractRefs.${refIndex}.path`),
        {
          path: refPath
        }
      ));
    });
  });
}

function collectSourcesContentDiagnostics(
  diagnostics: HiaDiagnostic[],
  sources: unknown,
  manifestPolicy: string,
  targetPath: string | undefined
): void {
  if (!Array.isArray(sources)) {
    return;
  }

  sources.filter(isRecord).forEach((source, index) => {
    const sourcePolicy = stringValue(source.sourcesContentPolicy) ?? manifestPolicy;
    const embedsContent = typeof source.content === "string" || Array.isArray(source.sourcesContent);

    if (!embedsContent || sourcePolicy === "embed" || sourcePolicy === "redacted") {
      return;
    }

    diagnostics.push(createSourceLinkageDiagnostic(
      "DOC_SOURCE_MAP_SOURCES_CONTENT_BLOCKED",
      "doc-source-map source content is blocked unless sourcesContentPolicy explicitly opts in.",
      "error",
      appendTarget(targetPath, `sources.${index}`),
      {
        sourcesContentPolicy: sourcePolicy
      }
    ));
  });
}

function normalizeManifestDiagnostics(value: unknown, targetPath: string | undefined): HiaDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (typeof item === "string") {
      return [createSourceLinkageDiagnostic(
        "DOC_SOURCE_MAP_ENTRY_DIAGNOSTIC",
        item,
        "info",
        appendTarget(targetPath, `diagnostics.${index}`),
        {
          sourceDiagnostic: item
        }
      )];
    }

    if (!isRecord(item)) {
      return [];
    }

    const code = stringValue(item.code) ?? "DOC_SOURCE_MAP_ENTRY_DIAGNOSTIC";
    const severity = normalizeSeverity(item.severity);
    const message = stringValue(item.message) ?? code;

    return [createSourceLinkageDiagnostic(code, message, severity, appendTarget(targetPath, `diagnostics.${index}`))];
  });
}

function collectEntryDiagnosticCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isRecord(item)) {
        return stringValue(item.code);
      }

      return undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeRange(value: unknown): HiaSourceRange | undefined {
  if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.end)) {
    return undefined;
  }

  const startLine = numberValue(value.start.line);
  const endLine = numberValue(value.end.line);

  if (!startLine || !endLine) {
    return undefined;
  }

  const range: HiaSourceRange = {
    start: {
      line: startLine
    },
    end: {
      line: endLine
    }
  };
  const startColumn = numberValue(value.start.column);
  const endColumn = numberValue(value.end.column);

  if (startColumn) {
    range.start.column = startColumn;
  }

  if (endColumn) {
    range.end.column = endColumn;
  }

  return range;
}

function createEmptyIndex(options: {
  diagnostics: HiaDiagnostic[];
  path?: string;
  status: DocSourceMapIndex["status"];
}): DocSourceMapIndex {
  return {
    artifactCount: 0,
    contract: DOC_SOURCE_MAP_CONTRACT,
    diagnostics: options.diagnostics,
    entries: [],
    entryCount: 0,
    linkedEntryCount: 0,
    ...(options.path ? { path: options.path } : {}),
    sourceCount: 0,
    sourceMapCount: 0,
    sourcesContentPolicy: "none",
    status: options.status,
    unresolvedEntryCount: 0
  };
}

function normalizeSeverity(value: unknown): HiaDiagnosticSeverity {
  return value === "error" || value === "warning" || value === "info" ? value : "info";
}

function isUnsafeRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");

  return !normalized
    || normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.endsWith("/..")
    || path.isAbsolute(value)
    || path.posix.isAbsolute(normalized)
    || path.win32.isAbsolute(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function appendTarget(prefix: string | undefined, suffix: string): string {
  return prefix ? `${prefix}.${suffix}` : suffix;
}

function createSourceLinkageDiagnostic(
  code: string,
  message: string,
  severity: HiaDiagnosticSeverity,
  targetPath?: string,
  data?: HiaDiagnosticData
): HiaDiagnostic {
  const options: {
    data?: HiaDiagnosticData;
    targetPath?: string;
  } = {};

  if (data) {
    options.data = data;
  }

  if (targetPath) {
    options.targetPath = targetPath;
  }

  return createHiaDiagnostic(code, message, severity, options);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
