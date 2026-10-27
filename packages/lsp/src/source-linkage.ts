/**
 * @file
 * @lang zh-CN 将文档源码映射查询状态与诊断投影到LSP领域结果，不执行生产器、不加载源码或改变宿主UI。
 * @lang en Projects documentation source-map query status and diagnostics into LSP domain results without running producers, loading sources or changing host UI.
 */
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
  type DocSourceMapRangeConvention,
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
  /** @lang zh-CN 实际查询诊断的无data摘要，包含输入拒绝而非只取索引诊断。 @lang en Data-free summaries of actual query diagnostics, including input rejection rather than index diagnostics alone. */
  diagnostics: HiaSourceLinkageDiagnosticSummary[];
  entries: HiaLspDocSourceMapEntry[];
  entryCount: number;
  /** @lang zh-CN 已有宿主元数据；只有available结果可带成功空状态。 @lang en Existing host metadata; only available results may carry successful empty states. */
  host: HiaLspHostResultMeta;
  linkedEntryCount: number;
  matchedEntryCount: number;
  /** @lang zh-CN 调用者原查询引用，未脱敏；不是可公开或可信日志数据。 @lang en Original caller query reference, unsanitized and unsuitable as public/trusted log data. */
  query?: DocSourceMapQuery;
  sourceCount: number;
  sourceMapCount: number;
  sourcesContentPolicy: string;
  /** @lang zh-CN 已加载时沿查询状态，无索引时为unavailable。 @lang en Query status when loaded, or unavailable without an index. */
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
  /** @lang zh-CN 新版逐引用范围约定的被动投影；旧版无此字段，调用方须检查两维是否已知，不能据缺省值猜测精确定位。 @lang en Passive projection of a new per-reference range convention; legacy maps omit it, and consumers must check both dimensions rather than infer precise positions from defaults. */
  rangeConvention?: DocSourceMapRangeConvention;
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
 * @lang zh-CN 将source-linkage查询投影为既有LSP领域结果；无文件/网络I/O、不修改索引，不跳过无筛选查询的状态门禁。
 * @lang en Projects source-linkage queries into existing LSP domain results without file/network I/O or index mutation, retaining status gates even for unfiltered queries.
 * @param options <lang><zh-CN>未篡改索引、可选原查询、来源与URI；外层typed options不在本函数的任意对象校验范围。</zh-CN><en>Untampered index, optional original query, source and URI; arbitrary validation of outer typed options is outside this function's scope.</en></lang>
 * @returns <lang><zh-CN>查询诊断/状态、无正文条目摘要和宿主元数据；无索引保留unavailable，拒绝不冒充正常无匹配。原query回显未脱敏。</zh-CN><en>Query diagnostics/status, body-free entry summaries and host metadata; absent indexes retain unavailable and rejection never masquerades as a normal miss. The original query echo is unsanitized.</en></lang>
 */
export function createHiaDocumentSourceMapIndexResult(options: {
  index?: DocSourceMapIndex;
  query?: DocSourceMapQuery;
  source?: HiaLspHostResultSource;
  uri: string;
}): HiaDocumentSourceMapIndexResult {
  // <lang><zh-CN>外层参数沿typed接口读取；query自身交source-linkage检查，null/false不能按省略处理。</zh-CN><en>Read outer parameters through the typed interface; source-linkage validates the query itself, and null/false must not count as omission.</en></lang>
  const { index, query, uri } = options;
  // <lang><zh-CN>来源只描述数据来自何处，不替代查询有效性。</zh-CN><en>Source describes where data originated, without establishing query validity.</en></lang>
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
      ...(query !== undefined ? { query } : {}),
      sourceCount: 0,
      sourceMapCount: 0,
      sourcesContentPolicy: "none",
      status: "unavailable",
      unavailableReason: "doc-source-map-missing",
      unresolvedEntryCount: 0,
      uri
    };
  }

  // <lang><zh-CN>无query也必须经过版本/隐私门禁，不能直接消费索引中保留用于诊断的条目。</zh-CN><en>Even absent queries must pass version/privacy gates rather than consume index entries retained for diagnostics directly.</en></lang>
  const queryResult = queryDocSourceMapIndex(index, query);
  // <lang><zh-CN>状态、诊断与条目来自同一次查询，拒绝的空数组不是成功的query-no-match。</zh-CN><en>Status, diagnostics and entries come from the same query; a rejected empty array is not a successful query-no-match.</en></lang>
  const entries = queryResult.entries;
  const emptyState = queryResult.status === "available" ? createDocSourceMapEmptyState(index, entries, query) : undefined;

  return {
    artifactCount: index.artifactCount,
    diagnostics: createDiagnosticSummaries(queryResult.diagnostics),
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
    ...(query !== undefined ? { query } : {}),
    sourceCount: index.sourceCount,
    sourceMapCount: index.sourceMapCount,
    sourcesContentPolicy: index.sourcesContentPolicy,
    status: queryResult.status,
    unresolvedEntryCount: index.unresolvedEntryCount,
    uri
  };
}

/** @lang zh-CN 仅为已通过查询生成既有成功空状态，不定义新的错误或宿主交互。 @lang en Creates existing successful empty states only after query admission, without defining new errors or host interactions. */
function createDocSourceMapEmptyState(
  index: DocSourceMapIndex,
  entries: DocSourceMapIndexedEntry[],
  query: DocSourceMapQuery | undefined
) {
  if (query !== undefined && entries.length === 0) {
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

/**
 * @lang zh-CN 为宿主生成独立的来源摘要；范围与约定均复制，避免调用方修改返回值后改变原索引查询结果。
 * @lang en Builds an independent host source summary, copying range and convention so callers cannot mutate later index query results through the projection.
 * @param link <lang><zh-CN>已入索引的来源引用，不修改。</zh-CN><en>Indexed source link, left unmodified.</en></lang>
 * @returns <lang><zh-CN>无源码正文、可写且不与索引共享嵌套范围的摘要。</zh-CN><en>Writable body-free summary without nested range aliases to the index.</en></lang>
 */
function createSourceLinkSummary(link: DocSourceMapSourceLink): HiaLspDocSourceMapSourceLink {
  // <lang><zh-CN>仅复制已出现的可选字段，保持旧版省略字段的形状。</zh-CN><en>Copy only present optional fields so older projections retain their omitted-field shape.</en></lang>
  return {
    ...link,
    ...(link.range ? { range: { start: { ...link.range.start }, end: { ...link.range.end } } } : {}),
    ...(link.rangeConvention ? { rangeConvention: { ...link.rangeConvention } } : {})
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
