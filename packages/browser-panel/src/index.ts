import {
  findGeneratedPositionForOriginal,
  querySourceLinkedPosition,
  type DocSourceMapArtifactLink,
  type DocSourceMapIndex,
  type DocSourceMapSourceLink,
  type DocSourceMapSourceMapLink,
  type OrdinarySourceMapIndex,
  type SourceMapGeneratedPosition,
  type SourceMapOriginalPosition
} from "@hia-doc/source-linkage";

/**
 * 浏览器面板 payload contract 的草案版本。
 * Draft schema version for the browser panel payload contract.
 */
export const HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION = "0.1.0-draft";

/**
 * 浏览器面板文件清单 contract 的版本。
 * Schema version for the static browser panel file manifest contract.
 */
export const HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION = "0.1.0";

/**
 * 浏览器面板用于筛选与分组的文档领域。
 * Documentation domain used by browser panel filtering and grouping.
 */
export type BrowserPanelDomain = "js" | "css" | "html" | "other";

/**
 * 面板 payload 中携带的项目身份信息。
 * Project identity metadata carried by a browser panel payload.
 */
export interface BrowserPanelProjectInfo {
  /**
   * 稳定项目 ID；缺省时消费者应回退到名称。
   * Stable project id; consumers should fall back to the name when omitted.
   */
  id?: string;
  /**
   * 项目显示名称。
   * Display name for the documented project.
   */
  name: string;
  /**
   * 面板页面标题；缺省时使用项目名称。
   * Panel page title; defaults to the project name when omitted.
   */
  title?: string;
}

/**
 * 一基准的源码或产物位置。
 * One-based source or artifact position.
 */
export interface BrowserPanelPosition {
  /**
   * 一基准列号；未知时省略。
   * One-based column number; omitted when unknown.
   */
  column?: number;
  /**
   * 一基准行号。
   * One-based line number.
   */
  line: number;
}

/**
 * 一段源码或产物范围。
 * Source or artifact range.
 */
export interface BrowserPanelRange {
  /**
   * 结束位置；省略时范围按起点解释。
   * End position; when omitted, the range is interpreted as a point.
   */
  end?: BrowserPanelPosition;
  /**
   * 起始位置。
   * Start position.
   */
  start: BrowserPanelPosition;
}

/**
 * 创建浏览器面板 payload 的纯数据输入。
 * Pure data input for creating a browser panel payload.
 */
export interface CreateBrowserPanelPayloadInput {
  /**
   * 已索引的 doc-source-map 输入列表。
   * Indexed doc-source-map inputs.
   */
  docSourceMaps: BrowserPanelDocSourceMapInput[];
  /**
   * 当前文档项目的身份信息。
   * Identity metadata for the documented project.
   */
  project: BrowserPanelProjectInfo;
}

/**
 * 单个 doc-source-map 及其可选 ordinary source map 上下文。
 * A doc-source-map with optional ordinary source map context.
 */
export interface BrowserPanelDocSourceMapInput {
  /**
   * 已标准化的 doc-source-map 索引。
   * Normalized doc-source-map index.
   */
  index: DocSourceMapIndex;
  /**
   * 与产物对应的 ordinary source map 索引。
   * Ordinary source map indexes associated with generated artifacts.
   */
  ordinarySourceMaps?: BrowserPanelOrdinarySourceMapInput[];
  /**
   * doc-source-map 文件路径，用作面板来源标识。
   * Doc-source-map file path used as the panel source identifier.
   */
  path: string;
}

/**
 * 浏览器面板可查询的 ordinary source map 输入。
 * Ordinary source map input that the browser panel can query.
 */
export interface BrowserPanelOrdinarySourceMapInput {
  /**
   * 已标准化的 ordinary source map 索引。
   * Normalized ordinary source map index.
   */
  index: OrdinarySourceMapIndex;
  /**
   * source map 文件路径。
   * Source map file path.
   */
  path: string;
}

/**
 * 浏览器面板运行时消费的完整 payload。
 * Complete payload consumed by the browser panel runtime.
 */
export interface BrowserPanelPayload {
  /**
   * 从 doc-source-map 继承并标准化后的诊断。
   * Diagnostics inherited and normalized from doc-source-map inputs.
   */
  diagnostics: BrowserPanelDiagnostic[];
  /**
   * 已汇总的 doc-source-map 列表。
   * Summarized doc-source-map inputs.
   */
  docSourceMaps: BrowserPanelDocSourceMap[];
  /**
   * 可展示、可打开的文档条目。
   * Displayable and openable documentation entries.
   */
  entries: BrowserPanelEntry[];
  /**
   * payload 生成器标识。
   * Payload generator identifier.
   */
  generator: "@hia-doc/browser-panel";
  /**
   * 当前文档项目。
   * Current documented project.
   */
  project: BrowserPanelProjectInfo;
  /**
   * payload schema 版本。
   * Payload schema version.
   */
  schemaVersion: typeof HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION;
  /**
   * 面板列表和状态栏使用的汇总统计。
   * Summary metrics used by the panel list and status UI.
   */
  summary: BrowserPanelSummary;
}

/**
 * 浏览器面板 payload 的汇总统计。
 * Summary metrics for a browser panel payload.
 */
export interface BrowserPanelSummary {
  /**
   * doc-source-map 文件数量。
   * Number of doc-source-map files.
   */
  docSourceMapCount: number;
  /**
   * 按领域统计的条目数量，包含 all 总数。
   * Entry counts by domain, including the all total.
   */
  domainCounts: Record<BrowserPanelDomain | "all", number>;
  /**
   * 文档条目总数。
   * Total number of documentation entries.
   */
  entryCount: number;
  /**
   * 已具备 source-linkage 的条目数量。
   * Number of entries with source-linkage information.
   */
  linkedEntryCount: number;
  /**
   * 可参与查询的 ordinary source map 数量。
   * Number of ordinary source maps available for lookup.
   */
  sourceMapCount: number;
}

/**
 * 浏览器面板展示的标准化诊断。
 * Normalized diagnostic displayed by the browser panel.
 */
export interface BrowserPanelDiagnostic {
  /**
   * 机器可读诊断代码。
   * Machine-readable diagnostic code.
   */
  code: string;
  /**
   * 人类可读诊断消息。
   * Human-readable diagnostic message.
   */
  message: string;
  /**
   * 诊断严重级别。
   * Diagnostic severity.
   */
  severity: string;
  /**
   * 可选的诊断目标路径。
   * Optional diagnostic target path.
   */
  targetPath?: string;
}

/**
 * doc-source-map 在浏览器面板中的汇总视图。
 * Summarized view of a doc-source-map inside the browser panel.
 */
export interface BrowserPanelDocSourceMap {
  /**
   * 原始 doc-source-map contract 版本。
   * Original doc-source-map contract version.
   */
  contractVersion?: string;
  /**
   * 该 doc-source-map 内的条目数量。
   * Number of entries in this doc-source-map.
   */
  entryCount: number;
  /**
   * 该 doc-source-map 内已链接条目数量。
   * Number of linked entries in this doc-source-map.
   */
  linkedEntryCount: number;
  /**
   * doc-source-map 文件路径。
   * Doc-source-map file path.
   */
  path: string;
  /**
   * 该 doc-source-map 引用的 ordinary source map 数量。
   * Number of ordinary source maps referenced by this doc-source-map.
   */
  sourceMapCount: number;
  /**
   * source map 引用与加载状态。
   * Source map references and load status.
   */
  sourceMaps: BrowserPanelSourceMapRef[];
  /**
   * sourcesContent 隐私策略。
   * SourcesContent privacy policy.
   */
  sourcesContentPolicy: string;
  /**
   * doc-source-map 解析状态。
   * Doc-source-map parsing status.
   */
  status: string;
}

/**
 * 浏览器面板展示的 source map 引用。
 * Source map reference displayed by the browser panel.
 */
export interface BrowserPanelSourceMapRef {
  /**
   * source map 标识。
   * Source map identifier.
   */
  id: string;
  /**
   * source map 类型。
   * Source map kind.
   */
  kind?: string;
  /**
   * source map 关联语言。
   * Language associated with the source map.
   */
  language?: string;
  /**
   * source map 文件路径。
   * Source map file path.
   */
  path?: string;
  /**
   * 当前 payload 是否已加载该 source map。
   * Whether this payload loaded the source map.
   */
  loaded?: boolean;
}

/**
 * 浏览器面板中的单个文档条目。
 * Single documentation entry in the browser panel.
 */
export interface BrowserPanelEntry {
  /**
   * 生成产物链接。
   * Generated artifact links.
   */
  artifactLinks: BrowserPanelArtifactRef[];
  /**
   * 条目来源 doc-source-map 路径。
   * Path of the doc-source-map that produced this entry.
   */
  docSourceMapPath: string;
  /**
   * 面板筛选使用的领域。
   * Domain used by panel filters.
   */
  domain: BrowserPanelDomain;
  /**
   * 面板内稳定条目 ID。
   * Stable entry id within the panel payload.
   */
  id: string;
  /**
   * 原始文档条目类型。
   * Original documentation entry kind.
   */
  kind: string;
  /**
   * UI 展示标签。
   * Label displayed in the UI.
   */
  label: string;
  /**
   * ordinary source map 与 doc-source-map 的组合查询结果。
   * Combined ordinary source map and doc-source-map lookup result.
   */
  lookup: BrowserPanelEntryLookup;
  /**
   * 可交给宿主环境执行的打开请求。
   * Open requests that can be executed by a host environment.
   */
  openRequests: BrowserPanelOpenRequest[];
  /**
   * 原始源码链接。
   * Original source links.
   */
  sourceLinks: BrowserPanelSourceRef[];
  /**
   * 上游符号 ID。
   * Upstream symbol id.
   */
  symbolId?: string;
  /**
   * 上游符号类型。
   * Upstream symbol kind.
   */
  symbolKind?: string;
}

/**
 * 指向原始源码的引用。
 * Reference to an original source.
 */
export interface BrowserPanelSourceRef {
  /**
   * 链接置信度。
   * Link confidence.
   */
  confidence?: string;
  /**
   * 源码语言。
   * Source language.
   */
  language?: string;
  /**
   * 源码路径。
   * Source path.
   */
  path?: string;
  /**
   * 源码范围。
   * Source range.
   */
  range?: BrowserPanelRange;
  /**
   * 范围来源说明。
   * Range provenance.
   */
  rangeSource?: string;
  /**
   * doc-source-map 内的源码标识。
   * Source identifier inside the doc-source-map.
   */
  sourceId: string;
}

/**
 * 指向生成产物的引用。
 * Reference to a generated artifact.
 */
export interface BrowserPanelArtifactRef {
  /**
   * doc-source-map 内的产物标识。
   * Artifact identifier inside the doc-source-map.
   */
  artifactId: string;
  /**
   * 链接置信度。
   * Link confidence.
   */
  confidence?: string;
  /**
   * 产物语言。
   * Artifact language.
   */
  language?: string;
  /**
   * 产物路径。
   * Artifact path.
   */
  path?: string;
  /**
   * 范围来源说明。
   * Range provenance.
   */
  rangeSource?: string;
  /**
   * 可选选择器，用于 HTML/CSS 类产物定位。
   * Optional selector for HTML/CSS-like artifact lookup.
   */
  selector?: string;
}

/**
 * 面板条目的 source-linkage 查询结果。
 * Source-linkage lookup result for a panel entry.
 */
export interface BrowserPanelEntryLookup {
  /**
   * 生成产物位置。
   * Generated artifact position.
   */
  generated?: SourceMapGeneratedPosition;
  /**
   * 与查询位置匹配的 doc-source-map 条目 ID。
   * Doc-source-map entry ids matched by the lookup position.
   */
  matchedEntryIds: string[];
  /**
   * 原始源码位置。
   * Original source position.
   */
  original?: SourceMapOriginalPosition;
  /**
   * 参与查询的 ordinary source map 路径。
   * Ordinary source map path used for lookup.
   */
  sourceMapPath?: string;
  /**
   * 查询状态，例如 available、doc-linked 或 unmapped。
   * Lookup status such as available, doc-linked, or unmapped.
   */
  status: string;
}

/**
 * 宿主环境可执行的打开请求。
 * Open request that a host environment can execute.
 */
export interface BrowserPanelOpenRequest {
  /**
   * 面板内稳定请求 ID。
   * Stable request id within the panel payload.
   */
  id: string;
  /**
   * 请求目标类别。
   * Request target kind.
   */
  kind: "generated-artifact" | "original-source";
  /**
   * UI 可显示的请求标签。
   * User-facing request label.
   */
  label: string;
  /**
   * 打开目标。
   * Open target.
   */
  target: {
    /**
     * 目标文件路径。
     * Target file path.
     */
    path: string;
    /**
     * 可选目标位置。
     * Optional target position.
     */
    position?: BrowserPanelPosition;
  };
  /**
   * 宿主命令类型。
   * Host command type.
   */
  type: "hia.openGenerated" | "hia.openSource";
}

/**
 * 渲染后可写入磁盘的浏览器面板文件。
 * Rendered browser panel file that can be written to disk.
 */
export interface RenderedBrowserPanelFile {
  /**
   * 文件内容类型。
   * File content type.
   */
  contentType: string;
  /**
   * 文件文本内容。
   * File text contents.
   */
  contents: string;
  /**
   * 相对输出路径。
   * Relative output path.
   */
  path: string;
  /**
   * 文件在面板输出中的角色。
   * File role in the panel output.
   */
  role: "entry" | "manifest" | "payload";
}

/**
 * 静态浏览器面板输出清单。
 * Static browser panel output manifest.
 */
export interface BrowserPanelManifest {
  /**
   * 面板入口 HTML。
   * Panel entry HTML.
   */
  entrypoint: string;
  /**
   * 面板输出文件列表。
   * List of emitted panel files.
   */
  files: Array<{
    /**
     * 文件内容类型。
     * File content type.
     */
    contentType: string;
    /**
     * 相对输出路径。
     * Relative output path.
     */
    path: string;
    /**
     * 文件角色。
     * File role.
     */
    role: RenderedBrowserPanelFile["role"];
  }>;
  /**
   * manifest 生成器标识。
   * Manifest generator identifier.
   */
  generator: "@hia-doc/browser-panel";
  /**
   * payload 文件路径。
   * Payload file path.
   */
  payload: string;
  /**
   * 当前文档项目。
   * Current documented project.
   */
  project: BrowserPanelProjectInfo;
  /**
   * manifest schema 版本。
   * Manifest schema version.
   */
  schemaVersion: typeof HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION;
}

/**
 * 浏览器面板渲染结果。
 * Browser panel rendering result.
 */
export interface RenderBrowserPanelResult {
  /**
   * 应写入磁盘的输出文件。
   * Output files that should be written to disk.
   */
  files: RenderedBrowserPanelFile[];
  /**
   * 输出文件清单。
   * Output file manifest.
   */
  manifest: BrowserPanelManifest;
}

/**
 * 将 doc-source-map/source-map 查询结果整理成浏览器面板载荷。
 * Build the browser panel payload without reading files, so the same function can serve CLI, DevTools and tests.
 *
 * @param input - 标准化后的 doc-source-map、ordinary source map 与项目信息。
 * Normalized doc-source-map, ordinary source map, and project metadata.
 * @returns 可序列化的浏览器面板 payload，不执行文件 I/O。
 * Serializable browser panel payload; this function performs no file I/O.
 */
export function createBrowserPanelPayload(input: CreateBrowserPanelPayloadInput): BrowserPanelPayload {
  const docSourceMaps = input.docSourceMaps.map((docMap) => createDocSourceMapSummary(docMap));
  const entries = input.docSourceMaps.flatMap((docMap) => createBrowserPanelEntries(docMap));
  const diagnostics = input.docSourceMaps.flatMap((docMap) => normalizeDiagnostics(docMap.index.diagnostics));

  return {
    diagnostics,
    docSourceMaps,
    entries,
    generator: "@hia-doc/browser-panel",
    project: input.project,
    schemaVersion: HIA_BROWSER_PANEL_PAYLOAD_SCHEMA_VERSION,
    summary: {
      docSourceMapCount: docSourceMaps.length,
      domainCounts: countEntriesByDomain(entries),
      entryCount: entries.length,
      linkedEntryCount: entries.filter((entry) => entry.lookup.status === "available" || entry.lookup.status === "doc-linked").length,
      sourceMapCount: docSourceMaps.reduce((total, docMap) => total + docMap.sourceMapCount, 0)
    }
  };
}

/**
 * 渲染可静态打开的面板文件，同时输出 JSON payload 供未来 DevTools panel 直接复用。
 * Render a standalone browser panel and a JSON payload that a future DevTools panel can consume directly.
 *
 * @param payload - 已创建的浏览器面板 payload。
 * Browser panel payload created by {@link createBrowserPanelPayload}.
 * @returns HTML 入口、JSON payload 与 manifest 文件。
 * HTML entry, JSON payload, and manifest files.
 */
export function renderBrowserPanel(payload: BrowserPanelPayload): RenderBrowserPanelResult {
  const fileMetadata: BrowserPanelManifest["files"] = [
    { path: "index.html", role: "entry", contentType: "text/html; charset=utf-8" },
    { path: "browser-panel-payload.json", role: "payload", contentType: "application/json; charset=utf-8" },
    { path: "browser-panel-manifest.json", role: "manifest", contentType: "application/json; charset=utf-8" }
  ];
  const manifest: BrowserPanelManifest = {
    entrypoint: "index.html",
    files: fileMetadata,
    generator: "@hia-doc/browser-panel",
    payload: "browser-panel-payload.json",
    project: payload.project,
    schemaVersion: HIA_BROWSER_PANEL_MANIFEST_SCHEMA_VERSION
  };

  return {
    files: [
      {
        path: "index.html",
        contents: renderPanelHtml(payload),
        contentType: "text/html; charset=utf-8",
        role: "entry"
      },
      {
        path: "browser-panel-payload.json",
        contents: `${JSON.stringify(payload, null, 2)}\n`,
        contentType: "application/json; charset=utf-8",
        role: "payload"
      },
      {
        path: "browser-panel-manifest.json",
        contents: `${JSON.stringify(manifest, null, 2)}\n`,
        contentType: "application/json; charset=utf-8",
        role: "manifest"
      }
    ],
    manifest
  };
}

function createDocSourceMapSummary(input: BrowserPanelDocSourceMapInput): BrowserPanelDocSourceMap {
  const loadedSourceMapPaths = new Set((input.ordinarySourceMaps ?? []).map((item) => normalizePath(item.path)));

  return {
    ...(input.index.contractVersion ? { contractVersion: input.index.contractVersion } : {}),
    entryCount: input.index.entryCount,
    linkedEntryCount: input.index.linkedEntryCount,
    path: input.path,
    sourceMapCount: input.index.sourceMapCount,
    sourceMaps: input.index.sourceMaps.map((sourceMap) => ({
      ...sourceMap,
      ...(sourceMap.path ? { loaded: loadedSourceMapPaths.has(normalizePath(sourceMap.path)) } : {})
    })),
    sourcesContentPolicy: input.index.sourcesContentPolicy,
    status: input.index.status
  };
}

function createBrowserPanelEntries(input: BrowserPanelDocSourceMapInput): BrowserPanelEntry[] {
  return input.index.entries.map((entry) => {
    const sourceLinks = entry.sourceLinks.map(normalizeSourceLink);
    const artifactLinks = entry.artifactLinks.map(normalizeArtifactLink);
    const domain = inferEntryDomain(entry.symbolKind ?? entry.kind, sourceLinks, artifactLinks);
    const lookup = createEntryLookup(input, sourceLinks, artifactLinks);
    const id = createEntryId(input.path, entry.id);
    const label = entry.symbolId ?? entry.id;

    return {
      artifactLinks,
      docSourceMapPath: input.path,
      domain,
      id,
      kind: entry.kind,
      label,
      lookup,
      openRequests: createOpenRequests(id, lookup),
      sourceLinks,
      ...(entry.symbolId ? { symbolId: entry.symbolId } : {}),
      ...(entry.symbolKind ? { symbolKind: entry.symbolKind } : {})
    };
  });
}

function createEntryLookup(
  input: BrowserPanelDocSourceMapInput,
  sourceLinks: BrowserPanelSourceRef[],
  artifactLinks: BrowserPanelArtifactRef[]
): BrowserPanelEntryLookup {
  const source = sourceLinks.find((candidate) => candidate.path && candidate.range?.start);
  const artifact = artifactLinks.find((candidate) => candidate.path);
  const original = source?.path && source.range?.start
    ? {
        position: source.range.start,
        sourcePath: normalizePath(source.path)
      }
    : undefined;
  const ordinaryMap = artifact?.path
    ? findOrdinarySourceMapForArtifact(input.ordinarySourceMaps ?? [], artifact.path)
    : undefined;

  if (!original) {
    return {
      matchedEntryIds: [],
      status: "unmapped"
    };
  }

  if (!ordinaryMap) {
    return {
      matchedEntryIds: [],
      original,
      status: "doc-linked"
    };
  }

  const generatedLookup = findGeneratedPositionForOriginal(ordinaryMap.index, original.sourcePath, original.position);
  const generated = generatedLookup.generated;

  if (!generated) {
    return {
      matchedEntryIds: [],
      original,
      sourceMapPath: ordinaryMap.path,
      status: generatedLookup.status
    };
  }

  const combinedLookup = querySourceLinkedPosition(input.index, ordinaryMap.index, {
    originalPosition: original.position,
    originalSourcePath: original.sourcePath
  });

  return {
    generated,
    matchedEntryIds: combinedLookup.entries.map((entry) => entry.id),
    original: combinedLookup.original ?? original,
    sourceMapPath: ordinaryMap.path,
    status: combinedLookup.status
  };
}

function findOrdinarySourceMapForArtifact(sourceMaps: BrowserPanelOrdinarySourceMapInput[], artifactPath: string): BrowserPanelOrdinarySourceMapInput | undefined {
  const normalizedArtifactPath = normalizePath(artifactPath);

  return sourceMaps.find((sourceMap) => {
    if (sourceMap.index.artifactPath && normalizePath(sourceMap.index.artifactPath) === normalizedArtifactPath) {
      return true;
    }

    const normalizedSourceMapPath = normalizePath(sourceMap.path);
    return normalizedSourceMapPath === `${normalizedArtifactPath}.map` || normalizedSourceMapPath.endsWith(`/${basename(normalizedArtifactPath)}.map`);
  });
}

function createOpenRequests(entryId: string, lookup: BrowserPanelEntryLookup): BrowserPanelOpenRequest[] {
  const requests: BrowserPanelOpenRequest[] = [];

  if (lookup.original) {
    requests.push({
      id: `${entryId}:open-source`,
      kind: "original-source",
      label: `Open source ${formatPositionLabel(lookup.original.sourcePath, lookup.original.position)}`,
      target: {
        path: lookup.original.sourcePath,
        position: lookup.original.position
      },
      type: "hia.openSource"
    });
  }

  if (lookup.generated?.artifactPath) {
    requests.push({
      id: `${entryId}:open-generated`,
      kind: "generated-artifact",
      label: `Open generated ${formatPositionLabel(lookup.generated.artifactPath, lookup.generated.position)}`,
      target: {
        path: lookup.generated.artifactPath,
        position: lookup.generated.position
      },
      type: "hia.openGenerated"
    });
  }

  return requests;
}

function normalizeSourceLink(link: DocSourceMapSourceLink): BrowserPanelSourceRef {
  return {
    sourceId: link.sourceId,
    ...(link.confidence ? { confidence: link.confidence } : {}),
    ...(link.language ? { language: link.language } : {}),
    ...(link.path ? { path: normalizePath(link.path) } : {}),
    ...(link.range ? { range: link.range } : {}),
    ...(link.rangeSource ? { rangeSource: link.rangeSource } : {})
  };
}

function normalizeArtifactLink(link: DocSourceMapArtifactLink): BrowserPanelArtifactRef {
  return {
    artifactId: link.artifactId,
    ...(link.confidence ? { confidence: link.confidence } : {}),
    ...(link.language ? { language: link.language } : {}),
    ...(link.path ? { path: normalizePath(link.path) } : {}),
    ...(link.rangeSource ? { rangeSource: link.rangeSource } : {}),
    ...(link.selector ? { selector: link.selector } : {})
  };
}

function normalizeDiagnostics(diagnostics: DocSourceMapIndex["diagnostics"]): BrowserPanelDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    ...(diagnostic.targetPath ? { targetPath: diagnostic.targetPath } : {})
  }));
}

function countEntriesByDomain(entries: BrowserPanelEntry[]): Record<BrowserPanelDomain | "all", number> {
  return {
    all: entries.length,
    css: entries.filter((entry) => entry.domain === "css").length,
    html: entries.filter((entry) => entry.domain === "html").length,
    js: entries.filter((entry) => entry.domain === "js").length,
    other: entries.filter((entry) => entry.domain === "other").length
  };
}

function inferEntryDomain(kind: string, sources: BrowserPanelSourceRef[], artifacts: BrowserPanelArtifactRef[]): BrowserPanelDomain {
  if (kind.startsWith("css-") || hasLanguage(sources, artifacts, ["css", "scss", "sass", "less", "stylus"])) {
    return "css";
  }

  if (kind.startsWith("html-") || hasLanguage(sources, artifacts, ["html", "pug"])) {
    return "html";
  }

  if (kind.startsWith("js-") || kind.startsWith("ts-") || hasLanguage(sources, artifacts, ["javascript", "typescript", "jsx", "tsx"])) {
    return "js";
  }

  return "other";
}

function hasLanguage(sources: BrowserPanelSourceRef[], artifacts: BrowserPanelArtifactRef[], languages: string[]): boolean {
  const normalized = new Set(languages);
  return [...sources, ...artifacts].some((item) => item.language && normalized.has(item.language.toLowerCase()));
}

function renderPanelHtml(payload: BrowserPanelPayload): string {
  const title = payload.project.title ?? payload.project.name;
  const serializedPayload = JSON.stringify(payload).replaceAll("<", "\\u003c");

  return [
    "<!doctype html>",
    "<html lang=\"und\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(title)} Browser Panel</title>`,
    "<link rel=\"icon\" href=\"data:,\">",
    `<style>${PANEL_CSS}</style>`,
    "</head>",
    "<body>",
    "<div class=\"hia-browser-panel\" data-hia-browser-panel>",
    "<aside class=\"hia-panel-sidebar\">",
    `<h1>${escapeHtml(title)}</h1>`,
    `<p class=\"hia-panel-kicker\">${escapeHtml(payload.summary.entryCount.toString())} source-linked entr${payload.summary.entryCount === 1 ? "y" : "ies"}</p>`,
    "<div class=\"hia-panel-filters\" role=\"group\" aria-label=\"Documentation domain filters\">",
    "<button type=\"button\" data-hia-domain=\"all\">All</button>",
    "<button type=\"button\" data-hia-domain=\"js\">JS</button>",
    "<button type=\"button\" data-hia-domain=\"css\">CSS</button>",
    "<button type=\"button\" data-hia-domain=\"html\">HTML</button>",
    "</div>",
    "<label class=\"hia-panel-search\"><span>Search</span><input type=\"search\" data-hia-search></label>",
    "<ol class=\"hia-panel-list\" data-hia-entry-list></ol>",
    "</aside>",
    "<main class=\"hia-panel-detail\" data-hia-entry-detail></main>",
    "</div>",
    `<script type="application/json" id="hia-browser-panel-payload">${serializedPayload}</script>`,
    `<script>${PANEL_SCRIPT}</script>`,
    "</body>",
    "</html>"
  ].join("");
}

function createEntryId(docMapPath: string, entryId: string): string {
  return `entry:${slug(docMapPath)}:${slug(entryId)}`;
}

function formatPositionLabel(filePath: string, position?: BrowserPanelPosition): string {
  if (!position) {
    return filePath;
  }

  return `${filePath}:${position.line}${position.column ? `:${position.column}` : ""}`;
}

function basename(value: string): string {
  const parts = value.split("/");
  return parts.at(-1) ?? value;
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function slug(value: string): string {
  return normalizePath(value).trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-|-$/g, "") || "entry";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

const PANEL_CSS = `
:root{color-scheme:light;font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6f8fb;color:#172033}
body{margin:0}
button,input{font:inherit}
.hia-browser-panel{display:grid;grid-template-columns:minmax(260px,340px) 1fr;min-height:100vh}
.hia-panel-sidebar{background:#ffffff;border-right:1px solid #d9e0ea;padding:20px;display:flex;flex-direction:column;gap:16px}
.hia-panel-sidebar h1{font-size:20px;line-height:1.25;margin:0;color:#0f172a}
.hia-panel-kicker{margin:0;color:#506177;font-size:13px}
.hia-panel-filters{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.hia-panel-filters button{border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:7px 8px;color:#1f2937;cursor:pointer}
.hia-panel-filters button[aria-pressed=true]{background:#0f766e;border-color:#0f766e;color:#fff}
.hia-panel-search{display:grid;gap:6px;color:#506177;font-size:12px}
.hia-panel-search input{border:1px solid #cbd5e1;border-radius:6px;padding:9px 10px;color:#172033;background:#fff}
.hia-panel-list{list-style:none;margin:0;padding:0;display:grid;gap:8px;overflow:auto}
.hia-panel-list button{width:100%;text-align:left;border:1px solid #d9e0ea;border-radius:8px;background:#fff;padding:10px;display:grid;gap:4px;cursor:pointer}
.hia-panel-list button[aria-current=true]{border-color:#0f766e;box-shadow:0 0 0 2px rgba(15,118,110,.15)}
.hia-entry-title{font-weight:700;color:#111827}
.hia-entry-meta{font-size:12px;color:#64748b}
.hia-panel-detail{padding:28px;display:grid;align-content:start;gap:18px}
.hia-detail-card{background:#fff;border:1px solid #d9e0ea;border-radius:8px;padding:20px;display:grid;gap:16px;max-width:980px}
.hia-detail-card h2{font-size:24px;margin:0;color:#0f172a}
.hia-badge-row{display:flex;gap:8px;flex-wrap:wrap}
.hia-badge{border:1px solid #cbd5e1;border-radius:999px;padding:3px 8px;color:#334155;font-size:12px;background:#f8fafc}
.hia-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.hia-section{border-top:1px solid #e5e7eb;padding-top:14px}
.hia-section h3{font-size:15px;margin:0 0 8px;color:#172033}
.hia-kv{display:grid;grid-template-columns:96px 1fr;gap:6px 10px;margin:0}
.hia-kv dt{color:#64748b}
.hia-kv dd{margin:0;word-break:break-word}
.hia-open-list{display:flex;gap:8px;flex-wrap:wrap}
.hia-open-list button{border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:6px;padding:8px 10px;cursor:pointer}
.hia-empty{color:#64748b}
@media (max-width:760px){.hia-browser-panel{grid-template-columns:1fr}.hia-panel-sidebar{border-right:0;border-bottom:1px solid #d9e0ea}.hia-panel-detail{padding:18px}}
`;

const PANEL_SCRIPT = `
(() => {
  const payload = JSON.parse(document.getElementById("hia-browser-panel-payload").textContent || "{}");
  const list = document.querySelector("[data-hia-entry-list]");
  const detail = document.querySelector("[data-hia-entry-detail]");
  const search = document.querySelector("[data-hia-search]");
  const buttons = Array.from(document.querySelectorAll("[data-hia-domain]"));
  let activeDomain = "all";
  let selectedId = payload.entries[0]?.id || "";

  function formatPosition(target) {
    if (!target?.path) return "";
    const position = target.position;
    return position ? target.path + ":" + position.line + (position.column ? ":" + position.column : "") : target.path;
  }

  function visibleEntries() {
    const query = (search.value || "").toLowerCase();
    return payload.entries.filter((entry) => {
      const domainMatch = activeDomain === "all" || entry.domain === activeDomain;
      const text = [entry.label, entry.kind, entry.symbolId, entry.symbolKind].filter(Boolean).join(" ").toLowerCase();
      return domainMatch && (!query || text.includes(query));
    });
  }

  function renderList() {
    const entries = visibleEntries();
    if (!entries.some((entry) => entry.id === selectedId)) selectedId = entries[0]?.id || "";
    list.innerHTML = entries.map((entry) => '<li><button type="button" data-entry-id="' + entry.id + '" aria-current="' + String(entry.id === selectedId) + '"><span class="hia-entry-title">' + escapeHtml(entry.label) + '</span><span class="hia-entry-meta">' + escapeHtml(entry.domain.toUpperCase() + " / " + entry.kind + " / " + entry.lookup.status) + '</span></button></li>').join("");
    for (const button of list.querySelectorAll("button")) button.addEventListener("click", () => { selectedId = button.dataset.entryId || ""; render(); });
  }

  function renderDetail() {
    const entry = payload.entries.find((candidate) => candidate.id === selectedId);
    if (!entry) {
      detail.innerHTML = '<p class="hia-empty">No source-linked entry selected.</p>';
      return;
    }
    const source = entry.lookup.original ? formatPosition({ path: entry.lookup.original.sourcePath, position: entry.lookup.original.position }) : "";
    const generated = entry.lookup.generated ? formatPosition({ path: entry.lookup.generated.artifactPath, position: entry.lookup.generated.position }) : "";
    const openButtons = entry.openRequests.map((request) => '<button type="button" data-open-request="' + request.id + '">' + escapeHtml(request.label) + '</button>').join("");
    detail.innerHTML = '<article class="hia-detail-card"><h2>' + escapeHtml(entry.label) + '</h2><div class="hia-badge-row"><span class="hia-badge">' + escapeHtml(entry.domain.toUpperCase()) + '</span><span class="hia-badge">' + escapeHtml(entry.kind) + '</span><span class="hia-badge">' + escapeHtml(entry.lookup.status) + '</span></div><section class="hia-section"><h3>Source Linkage</h3><dl class="hia-kv"><dt>Original</dt><dd>' + escapeHtml(source || "unmapped") + '</dd><dt>Generated</dt><dd>' + escapeHtml(generated || "unmapped") + '</dd><dt>Source Map</dt><dd>' + escapeHtml(entry.lookup.sourceMapPath || "none") + '</dd><dt>Doc Map</dt><dd>' + escapeHtml(entry.docSourceMapPath) + '</dd></dl></section><section class="hia-section"><h3>Open Requests</h3><div class="hia-open-list">' + (openButtons || '<span class="hia-empty">No open request available.</span>') + '</div></section></article>';
    for (const button of detail.querySelectorAll("[data-open-request]")) {
      button.addEventListener("click", () => {
        const request = entry.openRequests.find((candidate) => candidate.id === button.dataset.openRequest);
        window.postMessage({ type: "hia.browserPanel.openRequest", request }, window.location.origin);
      });
    }
  }

  function render() {
    renderList();
    renderDetail();
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.hiaDomain === activeDomain));
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  for (const button of buttons) button.addEventListener("click", () => { activeDomain = button.dataset.hiaDomain || "all"; render(); });
  search.addEventListener("input", render);
  render();
})();
`;
