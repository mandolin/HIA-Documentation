import {
  getI18nField,
  resolveI18nFieldText,
  type HiaDiagnostic,
  type HiaDocument,
  type HiaI18nField,
  type HiaI18nModel,
  type HiaResolvedText,
  type HiaSourceDefinedIn,
  type HiaSourceFragment,
  type HiaSourceMetadata,
  type HiaSourcePrimaryBlock,
  type HiaSourceReference,
  type HiaSymbol
} from "@hia-doc/core";
import { DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH, getDefaultThemeAssets } from "@hia-doc/theme-default";

export const HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION = "0.1.0";
/**
 * 项目导航索引的中性 contract 名称；供静态 portal、搜索与宿主导航消费。
 * Neutral project-navigation-index contract name consumed by static portals, search, and host navigation.
 */
export const HIA_PROJECT_NAVIGATION_INDEX_CONTRACT = "hia-project-navigation-index";
/**
 * 项目导航索引的首个草案版本；它独立于 renderer manifest 的文件清单版本。
 * First draft version of the project navigation index; independent from the renderer manifest file-list version.
 */
export const HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION = "0.1.0-draft";
/**
 * 项目级关系图的中性 contract 名称；用于表达文档入口、源码、生成物与宿主能力之间的关系。
 * Neutral project-level relation-graph contract for documentation entries, sources, generated artifacts, and host capabilities.
 */
export const HIA_PROJECT_RELATION_GRAPH_CONTRACT = "hia-project-relation-graph";
/**
 * 项目级关系图的首个草案版本；后续 IDE/DevTools host 会按此 contract 做能力协商。
 * First draft version of the project relation graph; future IDE/DevTools hosts negotiate capabilities against this contract.
 */
export const HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION = "0.1.0-draft";

export interface RenderedHtmlFile {
  path: string;
  contents: string;
  contentType: string;
  role: "entry" | "asset" | "index";
}

export interface RenderHtmlOptions {
  locale?: string;
  title?: string;
  includeThemeAssets?: boolean;
  /**
   * 统一项目文档站的输出与源码呈现策略；普通单文档渲染忽略该字段。
   * Output and source-presentation policy for unified project sites; ignored by single-document rendering.
   */
  projectSite?: RenderProjectSiteOptions;
}

export type RenderProjectView = "all" | "js" | "css" | "html" | "dotnet" | "powershell" | "other";
export type RenderProjectSiteLayout = "split-site" | "single-page";
export type RenderProjectSourcePresentation = "none" | "link" | "embed" | "fetch";

export interface RenderProjectSiteOptions {
  /** 默认 split-site；single-page 仅适合兼容、小型文档或静态快照。Defaults to split-site; single-page is for compatibility, small docs, or snapshots. */
  layout?: RenderProjectSiteLayout;
  source?: {
    /** 控制源码正文与链接是否进入输出。Controls whether source bodies or links enter the output. */
    presentation?: RenderProjectSourcePresentation;
    /** embed 模式的源码详情默认展开状态。Default expansion state for embedded source details. */
    defaultExpanded?: boolean;
  };
}

export interface RenderProjectHtmlInput {
  project: RenderProjectInfo;
  entries: RenderProjectEntry[];
  profiles?: RenderProjectProfileRef[];
  docSourceMaps?: RenderProjectDocSourceMapRef[];
  relationGraph?: RenderProjectRelationGraph;
  diagnostics?: HiaDiagnostic[];
}

export interface RenderProjectInfo {
  id?: string;
  name: string;
  title?: string;
  /**
   * 项目页面的默认语言；若未提供则从已声明语言或 `und` 推断。
   * Default project-page locale; inferred from declared locales or `und` when omitted.
   */
  defaultLocale?: string;
  /**
   * 项目聚合页中可切换的语言。
   * Locales that can be switched within the project aggregation page.
   */
  locales?: string[];
}

export interface RenderProjectProfileRef {
  profileId: string;
  profileVersion?: string;
  layer?: string;
  path?: string;
}

export interface RenderProjectDocSourceMapRef {
  artifactCount?: number;
  path: string;
  contractVersion?: string;
  entryArtifact?: string;
  entryCount?: number;
  linkedEntryCount?: number;
  sourceCount?: number;
  sourceMaps?: RenderProjectSourceMapRef[];
  sourceMapCount?: number;
  sourcesContentPolicy?: string;
  status?: string;
  unresolvedEntryCount?: number;
}

export interface RenderProjectSourceMapRef {
  id: string;
  kind?: string;
  language?: string;
  path?: string;
}

export type RenderProjectRelationNodeKind = "entry" | "source" | "artifact" | "endpoint";

export type RenderProjectRelationKind =
  | "documents-source"
  | "documents-generated-artifact"
  | "documents-endpoint"
  | "exposes-api"
  | "semantic-member";

/**
 * 统一项目页与外部宿主共同消费的轻量关系图。
 * Lightweight relation graph shared by the unified project page and external hosts.
 */
export interface RenderProjectRelationGraph {
  contract: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT;
  contractVersion: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION;
  nodeCount: number;
  relationCount: number;
  nodes: RenderProjectRelationNode[];
  relations: RenderProjectRelation[];
}

/**
 * relation graph 中的稳定节点；节点可以代表文档入口、源码、生成物或运行时端点。
 * Stable node in the relation graph; it can represent a documentation entry, source, generated artifact, or runtime endpoint.
 */
export interface RenderProjectRelationNode {
  id: string;
  kind: RenderProjectRelationNodeKind;
  label: string;
  entryId?: string;
  path?: string;
  view?: RenderProjectView;
}

/**
 * relation graph 中的一条方向关系；第一轮仅表达统一页面和宿主导航需要的最小关系。
 * Directed relation in the graph; the first slice covers the minimal relationships needed by unified pages and host navigation.
 */
export interface RenderProjectRelation {
  id: string;
  kind: RenderProjectRelationKind;
  from: string;
  to: string;
  label: string;
  confidence?: string;
  entryId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RenderProjectEntry {
  id: string;
  name: string;
  kind: string;
  view: RenderProjectView;
  summary?: string;
  signature?: string;
  /**
   * 从领域 adapter/core symbol 透传的字段级 i18n；description 会驱动项目页的语言切换。
   * Field-level i18n forwarded from a domain adapter/core symbol; description drives project-page locale switching.
   */
  i18n?: HiaI18nModel;
  profile?: RenderProjectProfileRef;
  input?: RenderProjectInputRef;
  source?: RenderProjectSourceRef;
  symbolId?: string;
  hierarchy?: RenderProjectEntryHierarchyRef;
  docSourceMap?: RenderProjectEntryDocSourceMapRef;
  diagnostics?: HiaDiagnostic[];
}

/**
 * 领域 adapter 或 source relation 提供的稳定语义层级，renderer 只投影、不重新猜测语言语义。
 * Stable semantic hierarchy supplied by a domain adapter or source relation; the renderer only projects it.
 */
export interface RenderProjectEntryHierarchyRef {
  assembly?: string;
  namespace?: string;
  containingType?: string;
  symbolDocumentationId?: string;
  displayName?: string;
  parentSymbolId?: string;
  baseTypeIds?: string[];
  interfaceIds?: string[];
}

export interface RenderProjectEntryDocSourceMapRef {
  artifactConfidence?: string;
  artifactPath?: string;
  artifactSelector?: string;
  diagnostics?: string[];
  entryId: string;
  path: string;
  sourceConfidence?: string;
  sourcePath?: string;
  sourceRange?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
  sourceRangeSource?: string;
}

export interface RenderProjectInputRef {
  kind: string;
  path: string;
  artifactId?: string;
  contract?: string;
  contractVersion?: string;
}

export interface RenderProjectSourceRef {
  confidence?: string;
  fetchUrl?: string;
  language?: string;
  linkUrl?: string;
  path: string;
  preview?: RenderProjectSourcePreviewRef;
  range?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
  rangeSource?: string;
}

export interface RenderProjectSourcePreviewRef {
  content: string;
  defaultExpanded?: boolean;
  language?: string;
  range?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
}

export interface RenderHtmlResult {
  files: RenderedHtmlFile[];
  diagnostics: HiaDiagnostic[];
  manifest: RenderHtmlManifest;
}

export interface RenderHtmlManifest {
  schemaVersion: typeof HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION;
  renderer: "@hia-doc/renderer-html";
  documentId: string;
  title: string;
  entrypoint: string;
  initialLocale: string;
  locales: string[];
  files: RenderHtmlManifestFile[];
  project?: {
    id: string;
    name: string;
    views: RenderProjectView[];
    entryCounts: Record<string, number>;
    navigationIndex?: RenderProjectNavigationIndexRef;
    profiles?: RenderProjectProfileRef[];
    docSourceMaps?: RenderProjectDocSourceMapRef[];
    relationGraph?: RenderProjectRelationGraphRef;
  };
}

export interface RenderHtmlManifestFile {
  path: string;
  role: RenderedHtmlFile["role"];
  contentType: string;
}

/**
 * renderer 输出中项目导航索引的位置与兼容性标识。
 * Location and compatibility identity for the project navigation index emitted by the renderer.
 */
export interface RenderProjectNavigationIndexRef {
  contract: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT;
  contractVersion: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION;
  entryCount: number;
  path: string;
}

/**
 * renderer manifest 中 relation graph 的摘要引用，避免主 manifest 直接内嵌完整图。
 * Summary reference to the relation graph in the renderer manifest, avoiding full graph embedding in the main manifest.
 */
export interface RenderProjectRelationGraphRef {
  contract: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT;
  contractVersion: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION;
  nodeCount: number;
  relationCount: number;
  path: string;
}

/**
 * 供 portal 使用的、无 HTML 表示细节的项目入口索引。
 * Project entry index without HTML presentation details, intended for portal consumption.
 */
export interface RenderProjectNavigationIndex {
  contract: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT;
  contractVersion: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION;
  project: {
    defaultLocale: string;
    entryCounts: Record<string, number>;
    id: string;
    locales: string[];
    name: string;
    title: string;
    views: RenderProjectView[];
  };
  entries: RenderProjectNavigationEntry[];
  groups: RenderProjectNavigationGroup[];
  navigationTree: RenderProjectNavigationTreeNode[];
  profiles: RenderProjectProfileRef[];
  docSourceMaps: RenderProjectDocSourceMapRef[];
  relationGraph?: RenderProjectRelationGraph;
  site?: {
    layout: RenderProjectSiteLayout;
    navigationRootPath?: string;
    searchIndexPath?: string;
    relationIndexPath?: string;
    sourcePresentation: RenderProjectSourcePresentation;
  };
}

export type RenderProjectNavigationGroupKind = "kind" | "profile-layer" | "source-root";

/**
 * 大型项目导航索引中的轻量分组统计，用于门户、侧栏和后续大项目导航策略。
 * Lightweight group statistics in the large-project navigation index for portals, sidebars, and future navigation strategies.
 */
export interface RenderProjectNavigationGroup {
  id: string;
  kind: RenderProjectNavigationGroupKind;
  label: string;
  entryCount: number;
  views: RenderProjectView[];
}

export type RenderProjectNavigationTreeNodeKind =
  | "view"
  | "assembly"
  | "surface"
  | "project"
  | "namespace"
  | "type"
  | "relation"
  | "source-root"
  | "source-file"
  | "entry";

/**
 * 项目级层级导航节点；用于把大型项目从平铺列表提升为可分域浏览的 API / 文件结构。
 * Project-level hierarchy node; it lifts large projects from a flat list into domain-aware API and file navigation.
 */
export interface RenderProjectNavigationTreeNode {
  id: string;
  kind: RenderProjectNavigationTreeNodeKind;
  label: string;
  entryCount: number;
  views: RenderProjectView[];
  children?: RenderProjectNavigationTreeNode[];
  childrenPath?: string;
  contentPath?: string;
  entryId?: string;
  sourcePath?: string;
  symbolId?: string;
}

/**
 * 单个可导航入口的稳定标识及其公开元数据；完整详情仍由统一项目页负责渲染。
 * Stable identity and public metadata for one navigable entry; the unified project page still renders full detail.
 */
export interface RenderProjectNavigationEntry {
  id: string;
  name: string;
  kind: string;
  view: RenderProjectView;
  summary?: string;
  signature?: string;
  i18n?: HiaI18nModel;
  profile?: RenderProjectProfileRef;
  input?: RenderProjectInputRef;
  source?: Omit<RenderProjectSourceRef, "preview">;
  symbolId?: string;
  hierarchy?: RenderProjectEntryHierarchyRef;
  contentPath?: string;
  docSourceMap?: RenderProjectEntryDocSourceMapRef;
}

export function renderHtmlDocument(document: HiaDocument, options: RenderHtmlOptions = {}): RenderHtmlResult {
  const pageTitle = options.title ?? document.title;
  const includeThemeAssets = options.includeThemeAssets ?? true;
  const files: RenderedHtmlFile[] = [
    {
      path: "index.html",
      contents: renderIndexHtml(pageTitle, document, options),
      contentType: "text/html; charset=utf-8",
      role: "entry"
    }
  ];

  if (includeThemeAssets) {
    for (const asset of getDefaultThemeAssets()) {
      files.push({
        path: asset.path,
        contents: asset.contents,
        contentType: asset.contentType,
        role: "asset"
      });
    }
  }

  return {
    files,
    diagnostics: [],
    manifest: createManifest(document, files, options)
  };
}

export function renderProjectHtmlDocument(projectInput: RenderProjectHtmlInput, options: RenderHtmlOptions = {}): RenderHtmlResult {
  const sourcePreparedProjectInput = applyProjectSourcePresentationPolicy(projectInput, options);
  const normalizedProjectInput = normalizeProjectRelationGraphInput(sourcePreparedProjectInput);
  const pageTitle = options.title ?? normalizedProjectInput.project.title ?? normalizedProjectInput.project.name;
  const includeThemeAssets = options.includeThemeAssets ?? true;
  const siteLayout = options.projectSite?.layout ?? "split-site";
  const navigationIndex = createProjectNavigationIndex(normalizedProjectInput, pageTitle, options);
  const files: RenderedHtmlFile[] = siteLayout === "single-page"
    ? [
        {
          path: "index.html",
          contents: renderProjectIndexHtml(pageTitle, normalizedProjectInput, options),
          contentType: "text/html; charset=utf-8",
          role: "entry"
        }
      ]
    : createProjectSplitSiteFiles(pageTitle, normalizedProjectInput, navigationIndex, options);
  files.push({
    path: "project-index.json",
    contents: `${JSON.stringify(navigationIndex, null, 2)}\n`,
    contentType: "application/json; charset=utf-8",
    role: "index"
  });

  if (includeThemeAssets) {
    for (const asset of getDefaultThemeAssets()) {
      files.push({
        path: asset.path,
        contents: asset.contents,
        contentType: asset.contentType,
        role: "asset"
      });
    }
  }

  return {
    files,
    diagnostics: normalizedProjectInput.diagnostics ?? [],
    manifest: createProjectManifest(normalizedProjectInput, files, pageTitle, options, navigationIndex)
  };
}

/**
 * 在 renderer 公共入口执行源码呈现边界，保证直接库调用与 CLI 调用具有同一隐私语义。
 * Enforces source-presentation boundaries at the renderer API so direct library and CLI calls share the same privacy semantics.
 */
function applyProjectSourcePresentationPolicy(
  projectInput: RenderProjectHtmlInput,
  options: RenderHtmlOptions
): RenderProjectHtmlInput {
  const presentation = options.projectSite?.source?.presentation ?? "link";
  return {
    ...projectInput,
    entries: projectInput.entries.map((entry) => {
      if (!entry.source) {
        return entry;
      }
      const { preview, fetchUrl, linkUrl, ...locator } = entry.source;
      const previewDefaultExpanded = options.projectSite?.source?.defaultExpanded ?? preview?.defaultExpanded;
      const source: RenderProjectSourceRef = {
        ...locator,
        ...(presentation !== "none" && linkUrl ? { linkUrl } : {}),
        ...(presentation === "embed" && preview ? {
          preview: {
            ...preview,
            ...(previewDefaultExpanded !== undefined ? { defaultExpanded: previewDefaultExpanded } : {})
          }
        } : {}),
        ...(presentation === "fetch" && fetchUrl ? { fetchUrl } : {})
      };
      return {
        ...entry,
        source
      };
    })
  };
}

function createManifest(document: HiaDocument, files: RenderedHtmlFile[], options: RenderHtmlOptions): RenderHtmlManifest {
  return {
    schemaVersion: HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
    renderer: "@hia-doc/renderer-html",
    documentId: document.id,
    title: options.title ?? document.title,
    entrypoint: "index.html",
    initialLocale: options.locale || document.defaultLocale,
    locales: normalizeLocales(document, options.locale || document.defaultLocale),
    files: files.map((file) => ({
      path: file.path,
      role: file.role,
      contentType: file.contentType
    }))
  };
}

function createProjectManifest(
  projectInput: RenderProjectHtmlInput,
  files: RenderedHtmlFile[],
  pageTitle: string,
  options: RenderHtmlOptions,
  navigationIndex: RenderProjectNavigationIndex
): RenderHtmlManifest {
  const projectId = projectInput.project.id ?? `project:${projectInput.project.name}`;
  const views = collectProjectViews(projectInput.entries);
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);

  return {
    schemaVersion: HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION,
    renderer: "@hia-doc/renderer-html",
    documentId: projectId,
    title: pageTitle,
    entrypoint: "index.html",
    initialLocale: localeModel.selectedLocale,
    locales: localeModel.locales,
    files: files.map((file) => ({
      path: file.path,
      role: file.role,
      contentType: file.contentType
    })),
    project: {
      id: projectId,
      name: projectInput.project.name,
      views,
      entryCounts: countEntriesByView(projectInput.entries),
      navigationIndex: {
        contract: navigationIndex.contract,
        contractVersion: navigationIndex.contractVersion,
        entryCount: navigationIndex.entries.length,
        path: "project-index.json"
      },
      ...(projectInput.profiles && projectInput.profiles.length > 0 ? { profiles: projectInput.profiles } : {}),
      ...(projectInput.docSourceMaps && projectInput.docSourceMaps.length > 0 ? { docSourceMaps: projectInput.docSourceMaps } : {}),
      ...(projectInput.relationGraph && projectInput.relationGraph.relationCount > 0
        ? {
            relationGraph: {
              contract: projectInput.relationGraph.contract,
              contractVersion: projectInput.relationGraph.contractVersion,
              nodeCount: projectInput.relationGraph.nodeCount,
              relationCount: projectInput.relationGraph.relationCount,
              path: "project-index.json"
            }
          }
        : {})
    }
  };
}

function createProjectNavigationIndex(
  projectInput: RenderProjectHtmlInput,
  pageTitle: string,
  options: RenderHtmlOptions
): RenderProjectNavigationIndex {
  const projectId = projectInput.project.id ?? `project:${projectInput.project.name}`;
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);

  return {
    contract: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT,
    contractVersion: HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
    project: {
      defaultLocale: localeModel.selectedLocale,
      entryCounts: countEntriesByView(projectInput.entries),
      id: projectId,
      locales: localeModel.locales,
      name: projectInput.project.name,
      title: pageTitle,
      views: collectProjectViews(projectInput.entries)
    },
    entries: projectInput.entries
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        kind: entry.kind,
        view: entry.view,
        ...(entry.summary ? { summary: entry.summary } : {}),
        ...(entry.signature ? { signature: entry.signature } : {}),
        ...(entry.i18n ? { i18n: entry.i18n } : {}),
        ...(entry.profile ? { profile: entry.profile } : {}),
        ...(entry.input ? { input: entry.input } : {}),
        ...(entry.source ? { source: omitProjectSourcePreview(entry.source) } : {}),
        ...(entry.symbolId ? { symbolId: entry.symbolId } : {}),
        ...(entry.hierarchy ? { hierarchy: entry.hierarchy } : {}),
        contentPath: createProjectEntryContentPath(entry.id),
        ...(entry.docSourceMap ? { docSourceMap: entry.docSourceMap } : {})
      }))
      .sort(compareProjectNavigationEntries),
    groups: collectProjectNavigationGroups(projectInput.entries),
    navigationTree: collectProjectNavigationTree(projectInput.entries),
    profiles: [...(projectInput.profiles ?? [])].sort(compareProjectProfiles),
    docSourceMaps: [...(projectInput.docSourceMaps ?? [])].sort(compareProjectDocSourceMaps),
    site: {
      layout: options.projectSite?.layout ?? "split-site",
      ...(options.projectSite?.layout === "single-page" ? {} : {
        navigationRootPath: "navigation/root.json",
        searchIndexPath: "search/index.json",
        relationIndexPath: "relations/project.json"
      }),
      sourcePresentation: options.projectSite?.source?.presentation ?? "link"
    },
    ...(projectInput.relationGraph && projectInput.relationGraph.relationCount > 0
      ? { relationGraph: projectInput.relationGraph }
      : {})
  };
}

/**
 * 生成大型项目默认使用的 split-site 文件集合；入口页只保留应用壳。
 * Generates the split-site file set used by large projects by default; the entry page only keeps the application shell.
 */
function createProjectSplitSiteFiles(
  pageTitle: string,
  projectInput: RenderProjectHtmlInput,
  navigationIndex: RenderProjectNavigationIndex,
  options: RenderHtmlOptions
): RenderedHtmlFile[] {
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const files: RenderedHtmlFile[] = [
    {
      path: "index.html",
      contents: renderProjectSplitSiteHtml(pageTitle, projectInput, options),
      contentType: "text/html; charset=utf-8",
      role: "entry"
    },
    ...createProjectNavigationShardFiles(navigationIndex.navigationTree),
    {
      path: "search/index.json",
      contents: `${JSON.stringify({
        contract: "hia-project-search-index",
        contractVersion: "0.1.0-draft",
        entries: projectInput.entries.map((entry) => ({
          id: entry.id,
          name: entry.name,
          kind: entry.kind,
          view: entry.view,
          contentPath: createProjectEntryContentPath(entry.id),
          searchText: createProjectEntrySearchText(entry)
        }))
      }, null, 2)}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    },
    {
      path: "relations/project.json",
      contents: `${JSON.stringify(projectInput.relationGraph ?? createProjectRelationGraph(projectInput.entries), null, 2)}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    }
  ];

  for (const entry of projectInput.entries) {
    files.push({
      path: createProjectEntryContentPath(entry.id),
      contents: renderProjectEntry(entry, localeModel.locales, localeModel.selectedLocale),
      contentType: "text/html; charset=utf-8",
      role: "asset"
    });
  }

  return files;
}

function createProjectNavigationShardFiles(nodes: RenderProjectNavigationTreeNode[]): RenderedHtmlFile[] {
  const files: RenderedHtmlFile[] = [];
  const emittedPaths = new Set<string>();

  const emitChildren = (nodeId: string, children: RenderProjectNavigationTreeNode[], root = false): void => {
    const shardPath = root ? "navigation/root.json" : createProjectNavigationChildrenPath(nodeId);
    if (emittedPaths.has(shardPath)) {
      return;
    }
    emittedPaths.add(shardPath);
    files.push({
      path: shardPath,
      contents: `${JSON.stringify({
        contract: "hia-project-navigation-shard",
        contractVersion: "0.1.0-draft",
        nodeId,
        children: children.map(toLazyProjectNavigationNode)
      }, null, 2)}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    });

    for (const child of children) {
      if (child.children && child.children.length > 0) {
        emitChildren(child.id, child.children);
      }
    }
  };

  emitChildren("root", nodes, true);
  return files;
}

function toLazyProjectNavigationNode(node: RenderProjectNavigationTreeNode): RenderProjectNavigationTreeNode {
  const { children: _children, ...lazyNode } = node;
  return {
    ...lazyNode,
    ...(node.children && node.children.length > 0
      ? { childrenPath: createProjectNavigationChildrenPath(node.id) }
      : {}),
    ...(node.entryId ? { contentPath: createProjectEntryContentPath(node.entryId) } : {})
  };
}

function createProjectEntryContentPath(entryId: string): string {
  return `entries/${stableProjectArtifactName(entryId)}.html`;
}

function createProjectNavigationChildrenPath(nodeId: string): string {
  return `navigation/${stableProjectArtifactName(nodeId)}.json`;
}

function stableProjectArtifactName(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  const slug = value.toLowerCase().replace(/[^a-z0-9._-]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 72) || "item";
  return `${slug}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function omitProjectSourcePreview(source: RenderProjectSourceRef): Omit<RenderProjectSourceRef, "preview"> {
  const { preview: _preview, ...sourceWithoutPreview } = source;
  return sourceWithoutPreview;
}

function compareProjectNavigationEntries(left: RenderProjectNavigationEntry, right: RenderProjectNavigationEntry): number {
  return compareStableText(left.id, right.id);
}

function compareProjectProfiles(left: RenderProjectProfileRef, right: RenderProjectProfileRef): number {
  return compareStableText(left.profileId, right.profileId);
}

function compareProjectDocSourceMaps(left: RenderProjectDocSourceMapRef, right: RenderProjectDocSourceMapRef): number {
  return compareStableText(left.path, right.path);
}

function compareStableText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function renderIndexHtml(pageTitle: string, document: HiaDocument, options: RenderHtmlOptions): string {
  const selectedLocale = options.locale || document.defaultLocale;
  const locales = normalizeLocales(document, selectedLocale);
  const navigation = document.symbols
    .map((symbol) => `<li><a href="#${escapeHtml(symbol.id)}">${escapeHtml(symbol.name)}</a></li>`)
    .join("");
  const symbols = document.symbols.map((symbol) => renderSymbol(symbol, document, locales, selectedLocale)).join("");

  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(selectedLocale)}">`,
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)}</title>`,
    "<link rel=\"icon\" href=\"data:,\">",
    `<link rel="stylesheet" href="${escapeHtml(DEFAULT_THEME_CSS_PATH)}">`,
    "</head>",
    "<body>",
    "<div class=\"hia-shell\">",
    "<aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(document.title)}</h1>`,
    renderLocaleControl(locales, selectedLocale),
    navigation ? `<nav><ul>${navigation}</ul></nav>` : "",
    "</aside>",
    "<main class=\"hia-main\">",
    symbols || "<p>No symbols.</p>",
    "</main>",
    "</div>",
    `<script src="${escapeHtml(DEFAULT_THEME_JS_PATH)}"></script>`,
    "</body>",
    "</html>"
  ].join("");
}

function renderProjectSplitSiteHtml(
  pageTitle: string,
  projectInput: RenderProjectHtmlInput,
  options: RenderHtmlOptions
): string {
  const projectName = projectInput.project.title ?? projectInput.project.name;
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const views = collectProjectViews(projectInput.entries);
  const entryCounts = countEntriesByView(projectInput.entries);
  const selectedChinese = localeModel.selectedLocale.toLowerCase().startsWith("zh");
  const labels = selectedChinese
    ? {
        hierarchy: "层级导航",
        loading: "正在加载文档导航...",
        open: "打开",
        relations: "项目关系",
        select: "请从左侧层级树选择一个文档节点。",
        search: "搜索",
        searchPlaceholder: "名称、类型、源码或选择器",
        requiresServer: "按需加载站点需要通过 HTTP(S) 提供；请使用本地静态服务器打开该目录。"
      }
    : {
        hierarchy: "Hierarchy",
        loading: "Loading documentation navigation...",
        open: "Open",
        relations: "Project relations",
        select: "Select a documentation node from the hierarchy.",
        search: "Search",
        searchPlaceholder: "Name, kind, source, selector",
        requiresServer: "The lazy site must be served over HTTP(S); open this directory through a local static server."
      };

  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(localeModel.selectedLocale)}">`,
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)}</title>`,
    "<link rel=\"icon\" href=\"data:,\">",
    `<link rel="stylesheet" href="${escapeHtml(DEFAULT_THEME_CSS_PATH)}">`,
    "</head>",
    "<body>",
    "<div class=\"hia-shell hia-project-shell hia-project-split-site\">",
    "<aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectName)}</h1>`,
    renderLocaleControl(localeModel.locales, localeModel.selectedLocale),
    renderProjectViewControl(views, entryCounts),
    [
      "<label class=\"hia-project-search\">",
      `<span>${escapeHtml(labels.search)}</span>`,
      `<input type="search" data-hia-project-search placeholder="${escapeHtml(labels.searchPlaceholder)}">`,
      "</label>"
    ].join(""),
    `<section class="hia-project-summary hia-project-hierarchy"><h2>${escapeHtml(labels.hierarchy)}</h2><div data-hia-project-tree><p class="hia-project-loading">${escapeHtml(labels.loading)}</p></div></section>`,
    `<button type="button" class="hia-project-secondary-action" data-hia-project-relations>${escapeHtml(labels.relations)}</button>`,
    "</aside>",
    `<main class="hia-main hia-project-main" data-hia-project-content><p class="hia-project-empty">${escapeHtml(labels.select)}</p></main>`,
    "</div>",
    `<script src="${escapeHtml(DEFAULT_THEME_JS_PATH)}"></script>`,
    renderProjectSplitSiteScript(labels.requiresServer, labels.open),
    "</body>",
    "</html>"
  ].join("");
}

function renderProjectSplitSiteScript(fileProtocolMessage: string, openLabel: string): string {
  return [
    "<script>",
    "(() => {",
    "  const config = { navigation: 'navigation/root.json', search: 'search/index.json', relations: 'relations/project.json' };",
    "  const treeHost = document.querySelector('[data-hia-project-tree]');",
    "  const contentHost = document.querySelector('[data-hia-project-content]');",
    "  const search = document.querySelector('[data-hia-project-search]');",
    "  const locale = document.querySelector('[data-hia-locale-control]');",
    "  const viewButtons = Array.from(document.querySelectorAll('[data-hia-project-view]'));",
    "  let rootNodes = [];",
    "  let searchEntries = null;",
    "  let activeView = 'all';",
    "  async function readJson(target) {",
    "    const response = await fetch(target, { credentials: 'omit' });",
    "    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);",
    "    return response.json();",
    "  }",
    "  function showLoadError(error) {",
    `    const hint = location.protocol === 'file:' ? ${JSON.stringify(fileProtocolMessage)} : String(error?.message || error);`,
    "    if (contentHost) contentHost.innerHTML = '';",
    "    const message = document.createElement('p');",
    "    message.className = 'hia-project-load-error';",
    "    message.textContent = hint;",
    "    (contentHost || treeHost)?.append(message);",
    "  }",
    "  function nodeMatchesView(node) {",
    "    return activeView === 'all' || (Array.isArray(node.views) && node.views.includes(activeView));",
    "  }",
    "  function createTreeList(nodes) {",
    "    const list = document.createElement('ul');",
    "    list.className = 'hia-project-hierarchy-list';",
    "    for (const node of nodes.filter(nodeMatchesView)) list.append(createTreeNode(node));",
    "    return list;",
    "  }",
    "  function createTreeNode(node) {",
    "    const item = document.createElement('li');",
    "    item.dataset.hiaProjectNav = node.views?.[0] || 'other';",
    "    if (node.childrenPath) {",
    "      const details = document.createElement('details');",
    "      const summary = document.createElement('summary');",
    "      const summaryLabel = document.createElement('span');",
    "      summaryLabel.textContent = `${node.label} (${node.entryCount})`;",
    "      summary.append(summaryLabel);",
    "      if (node.entryId && node.contentPath) {",
    "        const openButton = document.createElement('button');",
    "        openButton.type = 'button';",
    "        openButton.className = 'hia-project-entry-link hia-project-tree-open';",
    `        openButton.textContent = ${JSON.stringify(openLabel)};`,
    "        openButton.addEventListener('click', (event) => {",
    "          event.preventDefault();",
    "          event.stopPropagation();",
    "          loadEntry(node.entryId, node.contentPath, true);",
    "        });",
    "        summary.append(openButton);",
    "      }",
    "      details.append(summary);",
    "      details.addEventListener('toggle', async () => {",
    "        if (!details.open || details.dataset.loaded === 'true') return;",
    "        details.dataset.loaded = 'true';",
    "        const loading = document.createElement('p');",
    "        loading.className = 'hia-project-loading';",
    "        loading.textContent = '...';",
    "        details.append(loading);",
    "        try {",
    "          const shard = await readJson(node.childrenPath);",
    "          loading.replaceWith(createTreeList(Array.isArray(shard.children) ? shard.children : []));",
    "        } catch (error) {",
    "          loading.textContent = String(error?.message || error);",
    "        }",
    "      });",
    "      item.append(details);",
    "    } else if (node.entryId && node.contentPath) {",
    "      const button = document.createElement('button');",
    "      button.type = 'button';",
    "      button.className = 'hia-project-entry-link';",
    "      button.textContent = node.label;",
    "      button.addEventListener('click', () => loadEntry(node.entryId, node.contentPath, true));",
    "      item.append(button);",
    "    } else {",
    "      const label = document.createElement('span');",
    "      label.textContent = node.label;",
    "      item.append(label);",
    "    }",
    "    return item;",
    "  }",
    "  function renderRoot() {",
    "    if (!treeHost) return;",
    "    treeHost.innerHTML = '';",
    "    treeHost.append(createTreeList(rootNodes));",
    "  }",
    "  function applyLocale() {",
    "    const selected = String(locale?.value || document.documentElement.lang || 'und');",
    "    document.documentElement.lang = selected;",
    "    for (const block of document.querySelectorAll('[data-hia-locale]')) {",
    "      block.hidden = block.getAttribute('data-hia-locale') !== selected;",
    "    }",
    "  }",
    "  function bindSourceFetch() {",
    "    for (const button of contentHost?.querySelectorAll('[data-hia-source-fetch]') || []) {",
    "      button.addEventListener('click', async () => {",
    "        if (button.dataset.loaded === 'true') return;",
    "        const code = button.parentElement?.querySelector('code');",
    "        try {",
    "          const response = await fetch(button.dataset.hiaSourceFetch || '', { credentials: 'omit' });",
    "          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);",
    "          const lines = (await response.text()).split(/\\r?\\n/u);",
    "          const start = Math.max(1, Number(button.dataset.hiaSourceStart || 1));",
    "          const end = Math.max(start, Number(button.dataset.hiaSourceEnd || lines.length));",
    "          if (code) code.textContent = lines.slice(start - 1, end).join('\\n');",
    "          button.dataset.loaded = 'true';",
    "          button.hidden = true;",
    "        } catch (error) {",
    "          button.textContent = String(error?.message || error);",
    "        }",
    "      });",
    "    }",
    "  }",
    "  async function loadEntry(entryId, contentPath, updateHash) {",
    "    if (!contentHost) return;",
    "    contentHost.innerHTML = '<p class=\"hia-project-loading\">...</p>';",
    "    try {",
    "      const response = await fetch(contentPath, { credentials: 'omit' });",
    "      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);",
    "      contentHost.innerHTML = await response.text();",
    "      applyLocale();",
    "      bindSourceFetch();",
    "      if (updateHash) history.replaceState(null, '', `#entry=${encodeURIComponent(entryId)}`);",
    "    } catch (error) {",
    "      showLoadError(error);",
    "    }",
    "  }",
    "  async function ensureSearchIndex() {",
    "    if (searchEntries) return searchEntries;",
    "    const index = await readJson(config.search);",
    "    searchEntries = Array.isArray(index.entries) ? index.entries : [];",
    "    return searchEntries;",
    "  }",
    "  async function runSearch() {",
    "    const query = String(search?.value || '').trim().toLowerCase();",
    "    if (!query) { renderRoot(); return; }",
    "    try {",
    "      const entries = await ensureSearchIndex();",
    "      const matches = entries.filter((entry) => (activeView === 'all' || entry.view === activeView) && String(entry.searchText || '').includes(query)).slice(0, 200);",
    "      if (!treeHost) return;",
    "      treeHost.innerHTML = '';",
    "      const nodes = matches.map((entry) => ({ id: entry.id, label: `${entry.name} · ${entry.kind}`, entryId: entry.id, contentPath: entry.contentPath, views: [entry.view], entryCount: 1 }));",
    "      treeHost.append(createTreeList(nodes));",
    "    } catch (error) { showLoadError(error); }",
    "  }",
    "  for (const button of viewButtons) {",
    "    button.addEventListener('click', () => {",
    "      activeView = button.dataset.hiaProjectView || 'all';",
    "      for (const candidate of viewButtons) candidate.setAttribute('aria-pressed', String(candidate === button));",
    "      runSearch();",
    "    });",
    "  }",
    "  search?.addEventListener('input', runSearch);",
    "  locale?.addEventListener('change', applyLocale);",
    "  document.querySelector('[data-hia-project-relations]')?.addEventListener('click', async () => {",
    "    try {",
    "      const graph = await readJson(config.relations);",
    "      if (!contentHost) return;",
    "      contentHost.innerHTML = '';",
    "      const article = document.createElement('article');",
    "      article.className = 'hia-symbol';",
    "      const heading = document.createElement('h2');",
    "      heading.textContent = 'Relations';",
    "      const summary = document.createElement('p');",
    "      summary.textContent = `${graph.nodeCount || 0} node(s), ${graph.relationCount || 0} relation(s).`;",
    "      article.append(heading, summary);",
    "      contentHost.append(article);",
    "    } catch (error) { showLoadError(error); }",
    "  });",
    "  readJson(config.navigation).then((shard) => {",
    "    rootNodes = Array.isArray(shard.children) ? shard.children : [];",
    "    renderRoot();",
    "    const hash = location.hash.startsWith('#entry=') ? decodeURIComponent(location.hash.slice(7)) : '';",
    "    if (hash) ensureSearchIndex().then((entries) => {",
    "      const entry = entries.find((candidate) => candidate.id === hash);",
    "      if (entry) loadEntry(entry.id, entry.contentPath, false);",
    "    });",
    "  }).catch(showLoadError);",
    "  viewButtons.find((button) => button.dataset.hiaProjectView === 'all')?.setAttribute('aria-pressed', 'true');",
    "})();",
    "</script>"
  ].join("");
}

function renderProjectIndexHtml(
  pageTitle: string,
  projectInput: RenderProjectHtmlInput,
  options: RenderHtmlOptions
): string {
  const projectName = projectInput.project.title ?? projectInput.project.name;
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const views = collectProjectViews(projectInput.entries);
  const entryCounts = countEntriesByView(projectInput.entries);
  const groups = collectProjectNavigationGroups(projectInput.entries);
  const navigationTree = collectProjectNavigationTree(projectInput.entries);
  const navigation = projectInput.entries
    .map((entry) => renderProjectNavItem(entry))
    .join("");
  const entries = projectInput.entries
    .map((entry) => renderProjectEntry(entry, localeModel.locales, localeModel.selectedLocale))
    .join("");
  const profileSummary = renderProjectProfiles(projectInput.profiles ?? []);
  const docSourceMapSummary = renderProjectDocSourceMaps(projectInput.docSourceMaps ?? []);
  const relationGraphSummary = renderProjectRelationGraphSummary(projectInput.relationGraph);
  const relationGraph = renderProjectRelationGraph(projectInput.relationGraph);
  const diagnostics = renderProjectDiagnostics(projectInput.diagnostics ?? []);

  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(localeModel.selectedLocale)}">`,
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)}</title>`,
    "<link rel=\"icon\" href=\"data:,\">",
    `<link rel="stylesheet" href="${escapeHtml(DEFAULT_THEME_CSS_PATH)}">`,
    "</head>",
    "<body>",
    "<div class=\"hia-shell hia-project-shell\">",
    "<aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectName)}</h1>`,
    renderLocaleControl(localeModel.locales, localeModel.selectedLocale),
    renderProjectViewControl(views, entryCounts),
    renderProjectSearchControl(),
    renderProjectHierarchy(navigationTree),
    renderProjectGroupSummary(groups),
    navigation ? `<nav><ul>${navigation}</ul></nav>` : "",
    profileSummary,
    docSourceMapSummary,
    relationGraphSummary,
    diagnostics,
    "</aside>",
    "<main class=\"hia-main hia-project-main\">",
    relationGraph,
    entries || "<p>No project documentation entries.</p>",
    "<p class=\"hia-project-empty\" data-hia-project-empty hidden>No entries match the current filters.</p>",
    "</main>",
    "</div>",
    `<script src="${escapeHtml(DEFAULT_THEME_JS_PATH)}"></script>`,
    renderProjectViewScript(),
    "</body>",
    "</html>"
  ].join("");
}

function renderProjectViewControl(views: RenderProjectView[], entryCounts: Record<string, number>): string {
  const buttons = views
    .map((view) => `<button type="button" class="hia-project-view-button" data-hia-project-view="${escapeHtml(view)}">${escapeHtml(formatProjectViewLabel(view))}<span>${escapeHtml(String(entryCounts[view] ?? 0))}</span></button>`)
    .join("");

  return `<div class="hia-project-views">${buttons}</div>`;
}

function renderProjectSearchControl(): string {
  return [
    "<label class=\"hia-project-search\">",
    "<span>Search</span>",
    "<input type=\"search\" data-hia-project-search placeholder=\"Name, kind, source, selector\">",
    "</label>"
  ].join("");
}

function renderProjectGroupSummary(groups: RenderProjectNavigationGroup[]): string {
  if (groups.length === 0) {
    return "";
  }

  const sections = ([
    ["kind", "Kinds"],
    ["profile-layer", "Profile Layers"],
    ["source-root", "Source Roots"]
  ] as const)
    .map(([kind, label]) => {
      const items = groups
        .filter((group) => group.kind === kind)
        .sort(compareProjectNavigationGroups)
        .slice(0, 12)
        .map((group) => `<li><span>${escapeHtml(group.label)}</span><strong>${escapeHtml(String(group.entryCount))}</strong></li>`)
        .join("");

      return items ? `<section><h3>${escapeHtml(label)}</h3><ul class="hia-project-group-list">${items}</ul></section>` : "";
    })
    .join("");

  return sections ? `<section class="hia-project-summary hia-project-groups"><h2>Groups</h2>${sections}</section>` : "";
}

function renderProjectHierarchy(nodes: RenderProjectNavigationTreeNode[]): string {
  if (nodes.length === 0) {
    return "";
  }

  return `<section class="hia-project-summary hia-project-hierarchy"><h2>Hierarchy</h2>${renderProjectHierarchyList(nodes)}</section>`;
}

function renderProjectHierarchyList(nodes: RenderProjectNavigationTreeNode[]): string {
  const items = nodes
    .map((node) => renderProjectHierarchyNode(node))
    .join("");

  return `<ul class="hia-project-hierarchy-list">${items}</ul>`;
}

function renderProjectHierarchyNode(node: RenderProjectNavigationTreeNode): string {
  const children = node.children && node.children.length > 0 ? renderProjectHierarchyList(node.children) : "";
  const label = node.entryId
    ? `<a href="#${escapeHtml(node.entryId)}">${escapeHtml(node.label)}</a>`
    : `<span>${escapeHtml(node.label)}</span>`;
  const meta = node.kind === "entry"
    ? ""
    : `<small>${escapeHtml(node.kind)} / ${escapeHtml(String(node.entryCount))}</small>`;
  const searchText = createProjectNavigationTreeSearchText(node);

  return [
    `<li data-hia-project-nav="${escapeHtml(node.views[0] ?? "other")}" data-hia-project-search-text="${escapeHtml(searchText)}">`,
    label,
    meta,
    children,
    "</li>"
  ].join("");
}

function renderProjectNavItem(entry: RenderProjectEntry): string {
  const searchText = createProjectEntrySearchText(entry);
  return [
    `<li data-hia-project-nav="${escapeHtml(entry.view)}" data-hia-project-search-text="${escapeHtml(searchText)}">`,
    `<a href="#${escapeHtml(entry.id)}">`,
    `<span>${escapeHtml(entry.name)}</span>`,
    `<small>${escapeHtml(formatProjectViewLabel(entry.view))} / ${escapeHtml(entry.kind)}</small>`,
    "</a>",
    "</li>"
  ].join("");
}

function renderProjectEntry(entry: RenderProjectEntry, locales: string[], selectedLocale: string): string {
  const signature = entry.signature ? `<pre class="hia-signature"><code>${escapeHtml(entry.signature)}</code></pre>` : "";
  const summary = renderProjectEntrySummary(entry, locales, selectedLocale);
  const input = entry.input ? renderProjectEntryInput(entry.input) : "";
  const profile = entry.profile ? renderProjectEntryProfile(entry.profile) : "";
  const hierarchy = entry.hierarchy ? renderProjectEntryHierarchy(entry.hierarchy) : "";
  const source = entry.source ? renderProjectEntrySource(entry.source) : "";
  const docSourceMap = entry.docSourceMap ? renderProjectEntryDocSourceMap(entry.docSourceMap) : "";
  const diagnostics = renderProjectDiagnostics(entry.diagnostics ?? []);
  const searchText = createProjectEntrySearchText(entry);

  return [
    `<article class="hia-symbol hia-project-entry" id="${escapeHtml(entry.id)}" data-hia-project-entry="${escapeHtml(entry.view)}" data-hia-project-search-text="${escapeHtml(searchText)}">`,
    `<h2>${escapeHtml(entry.name)}</h2>`,
    `<span class="hia-kind">${escapeHtml(entry.kind)}</span>`,
    `<span class="hia-kind">${escapeHtml(formatProjectViewLabel(entry.view))}</span>`,
    signature,
    summary,
    input,
    profile,
    hierarchy,
    source,
    docSourceMap,
    diagnostics,
    "</article>"
  ].join("");
}

function renderProjectEntryHierarchy(hierarchy: RenderProjectEntryHierarchyRef): string {
  const details = [
    hierarchy.assembly ? `<dt>Assembly</dt><dd>${escapeHtml(hierarchy.assembly)}</dd>` : "",
    hierarchy.namespace ? `<dt>Namespace</dt><dd>${escapeHtml(hierarchy.namespace)}</dd>` : "",
    hierarchy.containingType ? `<dt>Containing Type</dt><dd>${escapeHtml(hierarchy.containingType)}</dd>` : "",
    hierarchy.symbolDocumentationId ? `<dt>Documentation ID</dt><dd>${escapeHtml(hierarchy.symbolDocumentationId)}</dd>` : "",
    hierarchy.parentSymbolId ? `<dt>Parent</dt><dd>${escapeHtml(hierarchy.parentSymbolId)}</dd>` : "",
    hierarchy.baseTypeIds && hierarchy.baseTypeIds.length > 0
      ? `<dt>Inheritance</dt><dd>${escapeHtml(hierarchy.baseTypeIds.join(" -> "))}</dd>`
      : "",
    hierarchy.interfaceIds && hierarchy.interfaceIds.length > 0
      ? `<dt>Interfaces</dt><dd>${escapeHtml(hierarchy.interfaceIds.join(", "))}</dd>`
      : ""
  ].join("");

  return details ? `<dl class="hia-project-meta hia-project-hierarchy-meta">${details}</dl>` : "";
}

function renderProjectEntrySummary(entry: RenderProjectEntry, locales: string[], selectedLocale: string): string {
  const field = entry.i18n?.fields.description ?? entry.i18n?.fields.summary;

  if (!field && !entry.summary) {
    return "";
  }

  const blocks = locales
    .map((locale) => renderLocalizedBlock(
      field,
      locale,
      selectedLocale,
      createI18nResolveOptionsFromModel(entry.i18n),
      entry.summary ?? ""
    ))
    .join("");

  return `<div class="hia-localized-set" data-hia-i18n-field="description">${blocks}</div>`;
}

function renderProjectEntryInput(input: RenderProjectInputRef): string {
  const details = [
    `<dt>Input</dt><dd>${escapeHtml(input.kind)}</dd>`,
    `<dt>Path</dt><dd>${escapeHtml(input.path)}</dd>`,
    input.contract ? `<dt>Contract</dt><dd>${escapeHtml(input.contract)}</dd>` : "",
    input.contractVersion ? `<dt>Version</dt><dd>${escapeHtml(input.contractVersion)}</dd>` : "",
    input.artifactId ? `<dt>Artifact</dt><dd>${escapeHtml(input.artifactId)}</dd>` : ""
  ].join("");

  return `<dl class="hia-project-meta">${details}</dl>`;
}

function renderProjectEntryProfile(profile: RenderProjectProfileRef): string {
  const version = profile.profileVersion ? `@${profile.profileVersion}` : "";
  return `<p class="hia-project-profile">Profile ${escapeHtml(profile.profileId)}${escapeHtml(version)}</p>`;
}

function renderProjectEntrySource(source: RenderProjectSourceRef): string {
  const range = source.range ? `:${source.range.start.line}${source.range.end ? `-${source.range.end.line}` : ""}` : "";
  const label = `${source.path}${range}`;
  const sourceLabel = source.linkUrl
    ? `<a href="${escapeHtml(source.linkUrl)}">${escapeHtml(label)}</a>`
    : escapeHtml(label);
  const sourceDetails = [
    `<dt>Source</dt><dd>${sourceLabel}</dd>`,
    source.language ? `<dt>Language</dt><dd>${escapeHtml(source.language)}</dd>` : "",
    source.rangeSource ? `<dt>Range Source</dt><dd>${escapeHtml(source.rangeSource)}</dd>` : "",
    source.confidence ? `<dt>Confidence</dt><dd>${escapeHtml(source.confidence)}</dd>` : ""
  ].join("");
  const preview = source.preview ? renderProjectSourcePreview(source.preview, source.path) : "";
  const fetchPreview = source.fetchUrl ? renderProjectSourceFetch(source) : "";

  return `<section class="hia-source-section"><h3>Source</h3><dl class="hia-project-meta">${sourceDetails}</dl>${preview}${fetchPreview}</section>`;
}

function renderProjectSourceFetch(source: RenderProjectSourceRef): string {
  const startLine = source.range?.start.line ?? 1;
  const endLine = source.range?.end?.line ?? startLine;
  return [
    "<details class=\"hia-source-preview hia-project-source-preview\">",
    `<summary>${escapeHtml(`${source.path}:${startLine}-${endLine}`)}</summary>`,
    `<button type="button" class="hia-source-fetch-button" data-hia-source-fetch="${escapeHtml(source.fetchUrl ?? "")}" data-hia-source-start="${escapeHtml(String(startLine))}" data-hia-source-end="${escapeHtml(String(endLine))}">Load source / 加载源码</button>`,
    `<pre class="hia-source-code"><code data-language="${escapeHtml(source.language ?? "")}"></code></pre>`,
    "</details>"
  ].join("");
}

function renderProjectEntryDocSourceMap(docSourceMap: RenderProjectEntryDocSourceMapRef): string {
  const sourceRange = docSourceMap.sourceRange ? `:${docSourceMap.sourceRange.start.line}${docSourceMap.sourceRange.end ? `-${docSourceMap.sourceRange.end.line}` : ""}` : "";
  const diagnostics = docSourceMap.diagnostics && docSourceMap.diagnostics.length > 0
    ? `<dt>Diagnostics</dt><dd>${escapeHtml(docSourceMap.diagnostics.join(", "))}</dd>`
    : "";
  const details = [
    `<dt>Manifest</dt><dd>${escapeHtml(docSourceMap.path)}</dd>`,
    `<dt>Entry</dt><dd>${escapeHtml(docSourceMap.entryId)}</dd>`,
    docSourceMap.sourcePath ? `<dt>Original Source</dt><dd>${escapeHtml(docSourceMap.sourcePath)}${escapeHtml(sourceRange)}</dd>` : "",
    docSourceMap.sourceRangeSource ? `<dt>Range Source</dt><dd>${escapeHtml(docSourceMap.sourceRangeSource)}</dd>` : "",
    docSourceMap.sourceConfidence ? `<dt>Source Confidence</dt><dd>${escapeHtml(docSourceMap.sourceConfidence)}</dd>` : "",
    docSourceMap.artifactPath ? `<dt>Generated Artifact</dt><dd>${escapeHtml(docSourceMap.artifactPath)}</dd>` : "",
    docSourceMap.artifactSelector ? `<dt>Selector</dt><dd>${escapeHtml(docSourceMap.artifactSelector)}</dd>` : "",
    docSourceMap.artifactConfidence ? `<dt>Artifact Confidence</dt><dd>${escapeHtml(docSourceMap.artifactConfidence)}</dd>` : "",
    diagnostics
  ].join("");
  const actions = renderProjectDocSourceMapOpenRequests(docSourceMap);

  return `<section class="hia-source-section"><h3>Doc Source Map</h3><dl class="hia-project-meta">${details}</dl>${actions}</section>`;
}

function renderProjectSourcePreview(preview: RenderProjectSourcePreviewRef, fallbackPath: string): string {
  if (!preview.content) {
    return "";
  }

  const caption = preview.range
    ? `${fallbackPath}:${preview.range.start.line}-${preview.range.end?.line ?? preview.range.start.line}`
    : fallbackPath;
  const open = preview.defaultExpanded === false ? "" : " open";
  const language = preview.language ? ` data-hia-source-language="${escapeHtml(preview.language)}"` : "";

  return [
    `<details class="hia-source-preview hia-project-source-preview"${open}>`,
    `<summary>Source Preview ${escapeHtml(caption)}</summary>`,
    `<pre class="hia-source-code"${language}><code>${escapeHtml(preview.content)}</code></pre>`,
    "</details>"
  ].join("");
}

function renderProjectDocSourceMapOpenRequests(docSourceMap: RenderProjectEntryDocSourceMapRef): string {
  const sourceLabel = docSourceMap.sourcePath && docSourceMap.sourceRange
    ? `${docSourceMap.sourcePath}:${docSourceMap.sourceRange.start.line}${docSourceMap.sourceRange.start.column ? `:${docSourceMap.sourceRange.start.column}` : ""}`
    : docSourceMap.sourcePath;
  const generatedLabel = docSourceMap.artifactPath ?? "";
  const buttons = [
    sourceLabel
      ? `<button type="button" data-hia-open-request="source" data-hia-open-path="${escapeHtml(docSourceMap.sourcePath ?? "")}" data-hia-open-line="${escapeHtml(String(docSourceMap.sourceRange?.start.line ?? ""))}" data-hia-open-column="${escapeHtml(String(docSourceMap.sourceRange?.start.column ?? ""))}">Open Source ${escapeHtml(sourceLabel)}</button>`
      : "",
    generatedLabel
      ? `<button type="button" data-hia-open-request="generated" data-hia-open-path="${escapeHtml(generatedLabel)}">Open Generated ${escapeHtml(generatedLabel)}</button>`
      : ""
  ].filter(Boolean).join("");

  return buttons ? `<div class="hia-source-actions">${buttons}</div>` : "";
}

function renderProjectProfiles(profiles: RenderProjectProfileRef[]): string {
  if (profiles.length === 0) {
    return "";
  }

  const items = profiles
    .map((profile) => {
      const version = profile.profileVersion ? `@${profile.profileVersion}` : "";
      return `<li>${escapeHtml(profile.profileId)}${escapeHtml(version)}</li>`;
    })
    .join("");

  return `<section class="hia-project-summary"><h2>Profiles</h2><ul>${items}</ul></section>`;
}

function renderProjectDocSourceMaps(docSourceMaps: RenderProjectDocSourceMapRef[]): string {
  if (docSourceMaps.length === 0) {
    return "";
  }

  const items = docSourceMaps
    .map((item) => {
      const status = item.status ? ` (${escapeHtml(item.status)})` : "";
      const counts = typeof item.entryCount === "number"
        ? ` - ${escapeHtml(String(item.linkedEntryCount ?? 0))}/${escapeHtml(String(item.entryCount))} linked`
        : "";
      const privacy = item.sourcesContentPolicy ? `, sourcesContentPolicy=${escapeHtml(item.sourcesContentPolicy)}` : "";
      const shape = typeof item.sourceCount === "number" && typeof item.artifactCount === "number"
        ? `, ${escapeHtml(String(item.sourceCount))} source(s), ${escapeHtml(String(item.artifactCount))} artifact(s)`
        : "";
      const sourceMaps = item.sourceMaps && item.sourceMaps.length > 0
        ? `<ul class="hia-project-source-map-list">${item.sourceMaps.map((sourceMap) => `<li>${escapeHtml(sourceMap.path ?? sourceMap.id)}</li>`).join("")}</ul>`
        : "";
      const sourceMapCount = typeof item.sourceMapCount === "number" ? `, ${escapeHtml(String(item.sourceMapCount))} source map(s)` : "";
      return `<li>${escapeHtml(item.path)}${status}${counts}${privacy}${shape}${sourceMapCount}${sourceMaps}</li>`;
    })
    .join("");

  return `<section class="hia-project-summary"><h2>Doc Source Maps</h2><ul>${items}</ul></section>`;
}

function renderProjectRelationGraphSummary(relationGraph: RenderProjectRelationGraph | undefined): string {
  if (!relationGraph || relationGraph.relationCount === 0) {
    return "";
  }

  const items = [
    `<li><span>Nodes</span><strong>${escapeHtml(String(relationGraph.nodeCount))}</strong></li>`,
    `<li><span>Relations</span><strong>${escapeHtml(String(relationGraph.relationCount))}</strong></li>`,
    `<li><span>Contract</span><strong>${escapeHtml(relationGraph.contractVersion)}</strong></li>`
  ].join("");

  return `<section class="hia-project-summary hia-project-relations-summary"><h2>Relations</h2><ul class="hia-project-group-list">${items}</ul></section>`;
}

function renderProjectRelationGraph(relationGraph: RenderProjectRelationGraph | undefined): string {
  if (!relationGraph || relationGraph.relationCount === 0) {
    return "";
  }

  const nodesById = new Map(relationGraph.nodes.map((node) => [node.id, node]));
  const items = relationGraph.relations
    .map((relation) => renderProjectRelation(relation, nodesById))
    .join("");

  return [
    "<section class=\"hia-symbol hia-project-relations\">",
    "<h2>Relations</h2>",
    `<p>${escapeHtml(String(relationGraph.relationCount))} relation(s), ${escapeHtml(String(relationGraph.nodeCount))} node(s).</p>`,
    `<ul class="hia-project-relation-list">${items}</ul>`,
    "</section>"
  ].join("");
}

function renderProjectRelation(
  relation: RenderProjectRelation,
  nodesById: Map<string, RenderProjectRelationNode>
): string {
  const from = nodesById.get(relation.from);
  const to = nodesById.get(relation.to);
  const confidence = relation.confidence ? `, confidence=${relation.confidence}` : "";
  const metadata = relation.metadata
    ? Object.entries(relation.metadata)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(", ")
    : "";
  const detail = [
    `${from?.label ?? relation.from} -> ${to?.label ?? relation.to}`,
    confidence,
    metadata ? `, ${metadata}` : ""
  ].join("");

  return [
    "<li>",
    `<span class="hia-kind">${escapeHtml(relation.kind)}</span> `,
    `<strong>${escapeHtml(relation.label)}</strong>`,
    `<small>${escapeHtml(detail)}</small>`,
    "</li>"
  ].join("");
}

function renderProjectDiagnostics(diagnostics: HiaDiagnostic[]): string {
  if (diagnostics.length === 0) {
    return "";
  }

  const items = diagnostics
    .map((diagnostic) => `<li>${escapeHtml(diagnostic.severity)}:${escapeHtml(diagnostic.code)} - ${escapeHtml(diagnostic.message)}</li>`)
    .join("");

  return `<section class="hia-project-diagnostics"><h3>Diagnostics</h3><ul>${items}</ul></section>`;
}

function renderProjectViewScript(): string {
  return [
    "<script>",
    "(() => {",
    "  const buttons = Array.from(document.querySelectorAll('[data-hia-project-view]'));",
    "  const entries = Array.from(document.querySelectorAll('[data-hia-project-entry]'));",
    "  const navItems = Array.from(document.querySelectorAll('[data-hia-project-nav]'));",
    "  const search = document.querySelector('[data-hia-project-search]');",
    "  const empty = document.querySelector('[data-hia-project-empty]');",
    "  let activeView = 'all';",
    "  function matchesFilter(item, view, query) {",
    "    const viewName = item.dataset.hiaProjectEntry || item.dataset.hiaProjectNav || 'other';",
    "    const text = (item.dataset.hiaProjectSearchText || '').toLowerCase();",
    "    return (view === 'all' || viewName === view) && (!query || text.includes(query));",
    "  }",
    "  function activate(view) {",
    "    activeView = view;",
    "    const query = String(search?.value || '').trim().toLowerCase();",
    "    let visibleCount = 0;",
    "    for (const entry of entries) {",
    "      const visible = matchesFilter(entry, view, query);",
    "      entry.hidden = !visible;",
    "      if (visible) visibleCount += 1;",
    "    }",
    "    for (const item of navItems) item.hidden = !matchesFilter(item, view, query);",
    "    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.hiaProjectView === view));",
    "    if (empty) empty.hidden = visibleCount > 0;",
    "  }",
    "  for (const button of buttons) button.addEventListener('click', () => activate(button.dataset.hiaProjectView || 'all'));",
    "  search?.addEventListener('input', () => activate(activeView));",
    "  for (const button of document.querySelectorAll('[data-hia-open-request]')) {",
    "    button.addEventListener('click', () => {",
    "      window.postMessage({",
    "        type: 'hia.renderer.openRequest',",
    "        request: {",
    "          kind: button.getAttribute('data-hia-open-request'),",
    "          path: button.getAttribute('data-hia-open-path'),",
    "          line: Number(button.getAttribute('data-hia-open-line')) || undefined,",
    "          column: Number(button.getAttribute('data-hia-open-column')) || undefined",
    "        }",
    "      }, window.location.protocol === 'file:' || window.location.origin === 'null' ? '*' : window.location.origin);",
    "    });",
    "  }",
    "  activate('all');",
    "})();",
    "</script>"
  ].join("");
}

function normalizeProjectRelationGraphInput(projectInput: RenderProjectHtmlInput): RenderProjectHtmlInput {
  if (projectInput.relationGraph) {
    return {
      ...projectInput,
      relationGraph: normalizeProjectRelationGraph(projectInput.relationGraph)
    };
  }

  const relationGraph = createProjectRelationGraph(projectInput.entries);

  return relationGraph.relationCount > 0
    ? { ...projectInput, relationGraph }
    : projectInput;
}

function normalizeProjectRelationGraph(relationGraph: RenderProjectRelationGraph): RenderProjectRelationGraph {
  const nodes = [...relationGraph.nodes].sort(compareProjectRelationNodes);
  const relations = [...relationGraph.relations].sort(compareProjectRelations);

  return {
    contract: HIA_PROJECT_RELATION_GRAPH_CONTRACT,
    contractVersion: HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION,
    nodeCount: nodes.length,
    relationCount: relations.length,
    nodes,
    relations
  };
}

function createProjectRelationGraph(entries: RenderProjectEntry[]): RenderProjectRelationGraph {
  const nodes = new Map<string, RenderProjectRelationNode>();
  const relations = new Map<string, RenderProjectRelation>();

  for (const entry of entries) {
    const entryNodeId = createProjectEntryRelationNodeId(entry.id);
    addProjectRelationNode(nodes, {
      id: entryNodeId,
      kind: "entry",
      label: entry.name,
      entryId: entry.id,
      view: entry.view
    });

    addProjectSourceRelation(nodes, relations, entry, entry.source?.path, entry.source?.confidence, {
      language: entry.source?.language ?? null,
      rangeStartLine: entry.source?.range?.start.line ?? null,
      rangeEndLine: entry.source?.range?.end?.line ?? null,
      rangeSource: entry.source?.rangeSource ?? null
    });

    addProjectSourceRelation(nodes, relations, entry, entry.docSourceMap?.sourcePath, entry.docSourceMap?.sourceConfidence, {
      manifest: entry.docSourceMap?.path ?? null,
      rangeStartLine: entry.docSourceMap?.sourceRange?.start.line ?? null,
      rangeEndLine: entry.docSourceMap?.sourceRange?.end?.line ?? null,
      rangeSource: entry.docSourceMap?.sourceRangeSource ?? null
    });

    addProjectArtifactRelation(nodes, relations, entry);
    addProjectEndpointRelation(nodes, relations, entry);
  }

  const graph: RenderProjectRelationGraph = {
    contract: HIA_PROJECT_RELATION_GRAPH_CONTRACT,
    contractVersion: HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION,
    nodeCount: nodes.size,
    relationCount: relations.size,
    nodes: [...nodes.values()],
    relations: [...relations.values()]
  };

  return normalizeProjectRelationGraph(graph);
}

function addProjectSourceRelation(
  nodes: Map<string, RenderProjectRelationNode>,
  relations: Map<string, RenderProjectRelation>,
  entry: RenderProjectEntry,
  sourcePath: string | undefined,
  confidence: string | undefined,
  metadata: Record<string, string | number | boolean | null | undefined>
): void {
  if (!sourcePath) {
    return;
  }

  const entryNodeId = createProjectEntryRelationNodeId(entry.id);
  const sourceNodeId = createProjectPathRelationNodeId("source", sourcePath);
  addProjectRelationNode(nodes, {
    id: sourceNodeId,
    kind: "source",
    label: sourcePath,
    path: sourcePath
  });
  const compactMetadata = compactProjectRelationMetadata(metadata);
  addProjectRelation(relations, {
    id: createProjectRelationId(inferProjectSourceRelationKind(entry), entryNodeId, sourceNodeId),
    kind: inferProjectSourceRelationKind(entry),
    from: entryNodeId,
    to: sourceNodeId,
    label: `Source: ${sourcePath}`,
    ...(confidence ? { confidence } : {}),
    entryId: entry.id,
    ...(compactMetadata ? { metadata: compactMetadata } : {})
  });
}

function addProjectArtifactRelation(
  nodes: Map<string, RenderProjectRelationNode>,
  relations: Map<string, RenderProjectRelation>,
  entry: RenderProjectEntry
): void {
  if (!entry.docSourceMap?.artifactPath) {
    return;
  }

  const entryNodeId = createProjectEntryRelationNodeId(entry.id);
  const artifactNodeId = createProjectPathRelationNodeId("artifact", entry.docSourceMap.artifactPath);
  addProjectRelationNode(nodes, {
    id: artifactNodeId,
    kind: "artifact",
    label: entry.docSourceMap.artifactPath,
    path: entry.docSourceMap.artifactPath
  });
  const compactMetadata = compactProjectRelationMetadata({
    manifest: entry.docSourceMap.path,
    selector: entry.docSourceMap.artifactSelector ?? null
  });
  addProjectRelation(relations, {
    id: createProjectRelationId("documents-generated-artifact", entryNodeId, artifactNodeId),
    kind: "documents-generated-artifact",
    from: entryNodeId,
    to: artifactNodeId,
    label: `Generated: ${entry.docSourceMap.artifactPath}`,
    ...(entry.docSourceMap.artifactConfidence ? { confidence: entry.docSourceMap.artifactConfidence } : {}),
    entryId: entry.id,
    ...(compactMetadata ? { metadata: compactMetadata } : {})
  });
}

function addProjectEndpointRelation(
  nodes: Map<string, RenderProjectRelationNode>,
  relations: Map<string, RenderProjectRelation>,
  entry: RenderProjectEntry
): void {
  if (entry.kind !== "aspnet-endpoint" && !entry.kind.startsWith("aspnet-")) {
    return;
  }

  const entryNodeId = createProjectEntryRelationNodeId(entry.id);
  const endpointNodeId = `endpoint:${entry.id}`;
  addProjectRelationNode(nodes, {
    id: endpointNodeId,
    kind: "endpoint",
    label: entry.name,
    entryId: entry.id,
    view: entry.view
  });
  addProjectRelation(relations, {
    id: createProjectRelationId("documents-endpoint", entryNodeId, endpointNodeId),
    kind: "documents-endpoint",
    from: entryNodeId,
    to: endpointNodeId,
    label: `Endpoint: ${entry.name}`,
    entryId: entry.id
  });
}

function addProjectRelationNode(
  nodes: Map<string, RenderProjectRelationNode>,
  node: RenderProjectRelationNode
): void {
  if (!nodes.has(node.id)) {
    nodes.set(node.id, node);
  }
}

function addProjectRelation(
  relations: Map<string, RenderProjectRelation>,
  relation: RenderProjectRelation
): void {
  const current = relations.get(relation.id);
  if (!current) {
    relations.set(relation.id, relation);
    return;
  }

  if (!current.confidence && relation.confidence) {
    relations.set(relation.id, { ...current, confidence: relation.confidence });
  }
}

function inferProjectSourceRelationKind(entry: RenderProjectEntry): RenderProjectRelationKind {
  if (entry.kind.startsWith("dotnet-")) {
    return "semantic-member";
  }

  if (entry.kind === "vue-exposed-api") {
    return "exposes-api";
  }

  return "documents-source";
}

function createProjectEntryRelationNodeId(entryId: string): string {
  return `entry:${entryId}`;
}

function createProjectPathRelationNodeId(kind: "source" | "artifact", path: string): string {
  return `${kind}:${path.replaceAll("\\", "/")}`;
}

function createProjectRelationId(kind: RenderProjectRelationKind, from: string, to: string): string {
  return `${kind}:${from}->${to}`;
}

function compactProjectRelationMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null> | undefined {
  const entries = Object.entries(metadata)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function compareProjectRelationNodes(left: RenderProjectRelationNode, right: RenderProjectRelationNode): number {
  return compareStableText(left.id, right.id);
}

function compareProjectRelations(left: RenderProjectRelation, right: RenderProjectRelation): number {
  return compareStableText(left.id, right.id);
}

const PROJECT_VIEW_ORDER: readonly RenderProjectView[] = ["all", "dotnet", "js", "powershell", "css", "html", "other"];

function collectProjectNavigationGroups(entries: RenderProjectEntry[]): RenderProjectNavigationGroup[] {
  return [
    ...collectProjectNavigationGroupsBy(entries, "kind", (entry) => entry.kind || "unknown-kind"),
    ...collectProjectNavigationGroupsBy(entries, "profile-layer", (entry) => entry.profile?.layer || entry.profile?.profileId || "unknown-profile"),
    ...collectProjectNavigationGroupsBy(entries, "source-root", (entry) => getProjectSourceRoot(entry.source?.path))
  ].sort(compareProjectNavigationGroups);
}

interface ProjectNavigationTreeBuilder {
  id: string;
  kind: RenderProjectNavigationTreeNodeKind;
  label: string;
  entryCount: number;
  views: Set<RenderProjectView>;
  children: ProjectNavigationTreeBuilder[];
  childrenById: Map<string, ProjectNavigationTreeBuilder>;
  entryId?: string;
  sourcePath?: string;
  symbolId?: string;
}

function collectProjectNavigationTree(entries: RenderProjectEntry[]): RenderProjectNavigationTreeNode[] {
  return PROJECT_VIEW_ORDER
    .filter((view) => view !== "all")
    .flatMap((view) => {
      const viewEntries = entries.filter((entry) => entry.view === view);
      if (viewEntries.length === 0) {
        return [];
      }

      const children = view === "dotnet"
        ? collectDotNetNavigationTree(viewEntries)
        : collectSemanticSourceNavigationTree(viewEntries);

      return [{
        id: `view:${view}`,
        kind: "view" as const,
        label: formatProjectViewLabel(view),
        entryCount: viewEntries.length,
        views: [view],
        children
      }];
    });
}

function collectDotNetNavigationTree(entries: RenderProjectEntry[]): RenderProjectNavigationTreeNode[] {
  const roots = new Map<string, ProjectNavigationTreeBuilder>();

  for (const entry of entries) {
    const parts = getDotNetNavigationParts(entry);
    const assemblyNode = getOrCreateProjectTreeChild(
      roots,
      `dotnet:${parts.rootKind}:${slugProjectGroupLabel(parts.assemblyLabel)}`,
      parts.rootKind,
      parts.assemblyLabel
    );
    addProjectTreeEntry(assemblyNode, entry);

    let namespaceParent = assemblyNode;
    const namespaceSegments = parts.namespaceLabel === "(global namespace)"
      ? [parts.namespaceLabel]
      : parts.namespaceLabel.split(".").filter(Boolean);
    let qualifiedNamespace = "";
    for (const namespaceSegment of namespaceSegments) {
      qualifiedNamespace = qualifiedNamespace
        ? `${qualifiedNamespace}.${namespaceSegment}`
        : namespaceSegment;
      const namespaceNode = getOrCreateProjectTreeChild(
        namespaceParent.childrenById,
        `${assemblyNode.id}:namespace:${slugProjectGroupLabel(qualifiedNamespace)}`,
        "namespace",
        namespaceSegment
      );
      namespaceParent.children = [...namespaceParent.childrenById.values()];
      addProjectTreeEntry(namespaceNode, entry);
      namespaceParent = namespaceNode;
    }

    const typeNode = getOrCreateProjectTreeChild(
      namespaceParent.childrenById,
      `${namespaceParent.id}:type:${slugProjectGroupLabel(parts.typeId)}`,
      "type",
      parts.typeLabel
    );
    namespaceParent.children = [...namespaceParent.childrenById.values()];
    addProjectTreeEntry(typeNode, entry);

    if (isDotNetTypeNavigationEntry(entry)) {
      typeNode.entryId = entry.id;
      assignProjectTreeEntryRefs(typeNode, entry);
      if (entry.kind === "dotnet-type") {
        addDotNetInheritanceNodes(typeNode, entry);
      }
      continue;
    }

    const entryNode = getOrCreateProjectTreeChild(
      typeNode.childrenById,
      `${typeNode.id}:entry:${entry.id}`,
      "entry",
      parts.memberLabel
    );
    typeNode.children = [...typeNode.childrenById.values()];
    addProjectTreeEntry(entryNode, entry);
    entryNode.entryId = entry.id;
    assignProjectTreeEntryRefs(entryNode, entry);
  }

  return sortProjectTreeNodes([...roots.values()].map(finalizeProjectTreeBuilder));
}

function addDotNetInheritanceNodes(typeNode: ProjectNavigationTreeBuilder, entry: RenderProjectEntry): void {
  for (const baseTypeId of entry.hierarchy?.baseTypeIds ?? []) {
    const relationNode = getOrCreateProjectTreeChild(
      typeNode.childrenById,
      `${typeNode.id}:base:${slugProjectGroupLabel(baseTypeId)}`,
      "relation",
      `Base: ${baseTypeId.replace(/^T:/u, "")}`
    );
    relationNode.views.add(entry.view);
  }
  for (const interfaceId of entry.hierarchy?.interfaceIds ?? []) {
    const relationNode = getOrCreateProjectTreeChild(
      typeNode.childrenById,
      `${typeNode.id}:interface:${slugProjectGroupLabel(interfaceId)}`,
      "relation",
      `Interface: ${interfaceId.replace(/^T:/u, "")}`
    );
    relationNode.views.add(entry.view);
  }
  typeNode.children = [...typeNode.childrenById.values()];
}

/**
 * 为非 .NET 领域保留源码目录，同时在 adapter 提供 parentSymbolId 时恢复 module/class/member 层级。
 * Preserves source grouping for non-.NET domains while restoring module/class/member hierarchy when adapters provide parentSymbolId.
 */
function collectSemanticSourceNavigationTree(entries: RenderProjectEntry[]): RenderProjectNavigationTreeNode[] {
  const roots = new Map<string, ProjectNavigationTreeBuilder>();
  const nodesByEntryId = new Map<string, ProjectNavigationTreeBuilder>();
  const entriesBySymbolId = new Map<string, RenderProjectEntry>();
  const fileNodesByEntryId = new Map<string, ProjectNavigationTreeBuilder>();

  for (const entry of entries) {
    if (entry.symbolId) {
      entriesBySymbolId.set(entry.symbolId, entry);
    }
    const entryNode = getOrCreateProjectTreeChild(
      nodesByEntryId,
      `entry:${entry.id}`,
      isProjectTypeLikeKind(entry.kind) ? "type" : "entry",
      entry.name
    );
    addProjectTreeEntry(entryNode, entry);
    entryNode.entryId = entry.id;
    assignProjectTreeEntryRefs(entryNode, entry);

    const sourceRootLabel = getProjectSourceRoot(entry.source?.path);
    const sourcePathLabel = entry.source?.path?.replaceAll("\\", "/") || "unknown-source";
    const rootNode = getOrCreateProjectTreeChild(
      roots,
      `source-root:${slugProjectGroupLabel(sourceRootLabel)}`,
      "source-root",
      sourceRootLabel
    );
    addProjectTreeEntry(rootNode, entry);

    const fileNode = getOrCreateProjectTreeChild(
      rootNode.childrenById,
      `${rootNode.id}:source-file:${slugProjectGroupLabel(sourcePathLabel)}`,
      "source-file",
      sourcePathLabel
    );
    rootNode.children = [...rootNode.childrenById.values()];
    addProjectTreeEntry(fileNode, entry);
    assignProjectTreeSourcePath(fileNode, entry.source?.path);
    fileNodesByEntryId.set(entry.id, fileNode);
  }

  for (const entry of entries) {
    const entryNode = nodesByEntryId.get(`entry:${entry.id}`);
    const parentEntry = entry.hierarchy?.parentSymbolId
      ? entriesBySymbolId.get(entry.hierarchy.parentSymbolId)
      : undefined;
    const parentNode = parentEntry
      ? nodesByEntryId.get(`entry:${parentEntry.id}`)
      : undefined;
    const sameSource = parentEntry?.source?.path === entry.source?.path;

    if (entryNode && parentEntry && parentNode && sameSource && parentNode !== entryNode) {
      parentNode.childrenById.set(entryNode.id, entryNode);
      incrementProjectNavigationAncestorCounts(parentEntry, entriesBySymbolId, nodesByEntryId);
      continue;
    }

    const fileNode = fileNodesByEntryId.get(entry.id);
    if (entryNode && fileNode) {
      fileNode.childrenById.set(entryNode.id, entryNode);
    }
  }

  return sortProjectTreeNodes([...roots.values()].map(finalizeProjectTreeBuilder));
}

function incrementProjectNavigationAncestorCounts(
  parentEntry: RenderProjectEntry,
  entriesBySymbolId: Map<string, RenderProjectEntry>,
  nodesByEntryId: Map<string, ProjectNavigationTreeBuilder>
): void {
  const visited = new Set<string>();
  let current: RenderProjectEntry | undefined = parentEntry;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const node = nodesByEntryId.get(`entry:${current.id}`);
    if (node) {
      node.entryCount += 1;
    }
    current = current.hierarchy?.parentSymbolId
      ? entriesBySymbolId.get(current.hierarchy.parentSymbolId)
      : undefined;
  }
}

function isProjectTypeLikeKind(kind: string): boolean {
  return /(?:^|[-_])(class|interface|type|module|namespace|enum|struct|record)(?:$|[-_])/iu.test(kind);
}

function getOrCreateProjectTreeChild(
  map: Map<string, ProjectNavigationTreeBuilder>,
  id: string,
  kind: RenderProjectNavigationTreeNodeKind,
  label: string
): ProjectNavigationTreeBuilder {
  const existing = map.get(id);
  if (existing) {
    return existing;
  }

  const created: ProjectNavigationTreeBuilder = {
    id,
    kind,
    label,
    entryCount: 0,
    views: new Set<RenderProjectView>(),
    children: [],
    childrenById: new Map<string, ProjectNavigationTreeBuilder>()
  };
  map.set(id, created);
  return created;
}

function addProjectTreeEntry(node: ProjectNavigationTreeBuilder, entry: RenderProjectEntry): void {
  node.entryCount += 1;
  node.views.add(entry.view);
}

function assignProjectTreeEntryRefs(node: ProjectNavigationTreeBuilder, entry: RenderProjectEntry): void {
  if (entry.symbolId) {
    node.symbolId = entry.symbolId;
  }

  assignProjectTreeSourcePath(node, entry.source?.path);
}

function assignProjectTreeSourcePath(node: ProjectNavigationTreeBuilder, sourcePath: string | undefined): void {
  if (sourcePath) {
    node.sourcePath = sourcePath;
  }
}

function finalizeProjectTreeBuilder(node: ProjectNavigationTreeBuilder): RenderProjectNavigationTreeNode {
  const childBuilders = node.childrenById.size > 0 ? [...node.childrenById.values()] : node.children;
  const children = sortProjectTreeNodes(childBuilders.map(finalizeProjectTreeBuilder));

  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    entryCount: node.entryCount,
    views: sortProjectViews([...node.views]),
    ...(children.length > 0 ? { children } : {}),
    ...(node.entryId ? { entryId: node.entryId } : {}),
    ...(node.sourcePath ? { sourcePath: node.sourcePath } : {}),
    ...(node.symbolId ? { symbolId: node.symbolId } : {})
  };
}

function sortProjectTreeNodes(nodes: RenderProjectNavigationTreeNode[]): RenderProjectNavigationTreeNode[] {
  return nodes.sort((left, right) => {
    const kindOrder = compareStableNumber(projectTreeKindOrder(left.kind), projectTreeKindOrder(right.kind));
    if (kindOrder !== 0) {
      return kindOrder;
    }

    return compareStableText(left.label, right.label);
  });
}

function projectTreeKindOrder(kind: RenderProjectNavigationTreeNodeKind): number {
  if (kind === "view") {
    return 0;
  }

  if (kind === "surface" || kind === "project") {
    return 2;
  }

  if (kind === "namespace") {
    return 3;
  }

  if (kind === "type") {
    return 4;
  }

  if (kind === "relation") {
    return 5;
  }

  if (kind === "assembly") {
    return 1;
  }

  if (kind === "source-root") {
    return 6;
  }

  if (kind === "source-file") {
    return 7;
  }

  return 8;
}

function getDotNetNavigationParts(entry: RenderProjectEntry): {
  assemblyLabel: string;
  memberLabel: string;
  namespaceLabel: string;
  rootKind: "assembly" | "surface" | "project";
  typeId: string;
  typeLabel: string;
} {
  const fallback = getDotNetNonAssemblyNavigationParts(entry);
  const assemblyLabel = entry.hierarchy?.assembly || fallback.assemblyLabel;
  const semanticNamespace = entry.hierarchy?.namespace;
  const semanticContainingType = entry.hierarchy?.containingType;
  const symbolId = entry.hierarchy?.symbolDocumentationId
    || (entry.symbolId?.match(/^[A-Z]:/) ? entry.symbolId : "")
    || (entry.id.match(/^[A-Z]:/) ? entry.id : "");
  const symbolBody = symbolId.match(/^[A-Z]:/) ? symbolId.slice(2) : "";
  const normalizedSymbol = symbolBody.replace(/\(.+$/, "");
  const segments = normalizedSymbol.split(".").filter((segment) => segment.length > 0);

  if (segments.length >= 2) {
    const memberLabel = entry.kind === "dotnet-type" ? entry.name : segments[segments.length - 1] ?? entry.name;
    const typeIndex = entry.kind === "dotnet-type" ? segments.length - 1 : Math.max(0, segments.length - 2);
    const typeLabel = segments[typeIndex] ?? entry.name;
    const namespaceLabel = segments.slice(0, typeIndex).join(".") || "(global namespace)";
    return {
      assemblyLabel,
      memberLabel,
      namespaceLabel: semanticNamespace || namespaceLabel,
      rootKind: entry.hierarchy?.assembly ? "assembly" : fallback.rootKind,
      typeId: semanticContainingType ? `T:${semanticContainingType}` : `T:${segments.slice(0, typeIndex + 1).join(".")}`,
      typeLabel: semanticContainingType?.split(".").pop() || typeLabel
    };
  }

  const sourceStem = entry.source?.path
    ? entry.source.path.replaceAll("\\", "/").split("/").pop()?.replace(/\.[^.]+$/, "")
    : undefined;
  return {
    assemblyLabel,
    memberLabel: entry.name,
    namespaceLabel: semanticNamespace || fallback.namespaceLabel,
    rootKind: entry.hierarchy?.assembly ? "assembly" : fallback.rootKind,
    typeId: semanticContainingType ? `T:${semanticContainingType}` : symbolId || entry.id,
    typeLabel: semanticContainingType?.split(".").pop() || sourceStem || entry.name
  };
}

function getDotNetNonAssemblyNavigationParts(entry: RenderProjectEntry): {
  assemblyLabel: string;
  namespaceLabel: string;
  rootKind: "assembly" | "surface" | "project";
} {
  if (entry.kind === "dotnet-project" || entry.kind === "dotnet-solution") {
    return {
      assemblyLabel: ".NET Project Structure",
      namespaceLabel: entry.kind === "dotnet-solution" ? "Solutions" : "Projects",
      rootKind: "project"
    };
  }

  if (entry.kind === "aspnet-endpoint" || entry.kind === "dotnet-markup-comment") {
    const sourceDirectories = (entry.source?.path ?? "")
      .replaceAll("\\", "/")
      .split("/")
      .slice(0, -1)
      .filter((segment) => segment && segment !== "src" && segment !== "Portal");
    const category = entry.kind === "aspnet-endpoint" ? "Endpoints" : "Markup";
    return {
      assemblyLabel: "ASP.NET Surfaces",
      namespaceLabel: [category, ...sourceDirectories].join("."),
      rootKind: "surface"
    };
  }

  return {
    assemblyLabel: ".NET Other",
    namespaceLabel: "(global namespace)",
    rootKind: "assembly"
  };
}

function isDotNetTypeNavigationEntry(entry: RenderProjectEntry): boolean {
  return entry.kind === "dotnet-type"
    || entry.kind === "dotnet-project"
    || entry.kind === "dotnet-solution"
    || entry.kind === "aspnet-endpoint";
}

function collectProjectNavigationGroupsBy(
  entries: RenderProjectEntry[],
  kind: RenderProjectNavigationGroupKind,
  keyFactory: (entry: RenderProjectEntry) => string
): RenderProjectNavigationGroup[] {
  const groups = new Map<string, { entryCount: number; views: Set<RenderProjectView> }>();

  for (const entry of entries) {
    const label = keyFactory(entry);
    const current = groups.get(label) ?? { entryCount: 0, views: new Set<RenderProjectView>() };
    current.entryCount += 1;
    current.views.add(entry.view);
    groups.set(label, current);
  }

  return [...groups.entries()].map(([label, group]) => ({
    id: `${kind}:${slugProjectGroupLabel(label)}`,
    kind,
    label,
    entryCount: group.entryCount,
    views: sortProjectViews([...group.views])
  }));
}

function getProjectSourceRoot(sourcePath: string | undefined): string {
  if (!sourcePath) {
    return "unknown-source";
  }

  const normalized = sourcePath.replaceAll("\\", "/");
  const firstSegment = normalized.split("/").find((segment) => segment.length > 0);
  return firstSegment || "unknown-source";
}

function compareProjectNavigationGroups(left: RenderProjectNavigationGroup, right: RenderProjectNavigationGroup): number {
  const kindOrder = compareStableNumber(projectGroupKindOrder(left.kind), projectGroupKindOrder(right.kind));
  if (kindOrder !== 0) {
    return kindOrder;
  }

  const countOrder = compareStableNumber(right.entryCount, left.entryCount);
  if (countOrder !== 0) {
    return countOrder;
  }

  return compareStableText(left.label, right.label);
}

function projectGroupKindOrder(kind: RenderProjectNavigationGroupKind): number {
  if (kind === "kind") {
    return 0;
  }

  if (kind === "profile-layer") {
    return 1;
  }

  return 2;
}

function compareStableNumber(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function slugProjectGroupLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "group";
}

function sortProjectViews(views: RenderProjectView[]): RenderProjectView[] {
  return views.sort((left, right) => PROJECT_VIEW_ORDER.indexOf(left) - PROJECT_VIEW_ORDER.indexOf(right));
}

function collectProjectViews(entries: RenderProjectEntry[]): RenderProjectView[] {
  const views: RenderProjectView[] = ["all"];

  for (const view of PROJECT_VIEW_ORDER.filter((view) => view !== "all")) {
    if (entries.some((entry) => entry.view === view)) {
      views.push(view);
    }
  }

  return views;
}

function countEntriesByView(entries: RenderProjectEntry[]): Record<string, number> {
  const counts: Record<string, number> = {
    all: entries.length
  };

  for (const entry of entries) {
    counts[entry.view] = (counts[entry.view] ?? 0) + 1;
  }

  return counts;
}

function createProjectNavigationTreeSearchText(node: RenderProjectNavigationTreeNode): string {
  return [
    node.id,
    node.kind,
    node.label,
    node.entryId,
    node.sourcePath,
    node.symbolId,
    ...node.views,
    ...(node.children ?? []).map(createProjectNavigationTreeSearchText)
  ].filter((item): item is string => typeof item === "string" && item.length > 0).join(" ").toLowerCase();
}

function createProjectEntrySearchText(entry: RenderProjectEntry): string {
  return [
    entry.id,
    entry.name,
    entry.kind,
    entry.summary,
    entry.signature,
    entry.symbolId,
    entry.hierarchy?.assembly,
    entry.hierarchy?.namespace,
    entry.hierarchy?.containingType,
    entry.hierarchy?.parentSymbolId,
    ...(entry.hierarchy?.baseTypeIds ?? []),
    ...(entry.hierarchy?.interfaceIds ?? []),
    entry.view,
    entry.profile?.profileId,
    entry.input?.kind,
    entry.input?.path,
    entry.source?.path,
    entry.source?.language,
    entry.docSourceMap?.path,
    entry.docSourceMap?.entryId,
    entry.docSourceMap?.sourcePath,
    entry.docSourceMap?.artifactPath,
    entry.docSourceMap?.artifactSelector,
    ...collectProjectEntryLocalizedText(entry)
  ].filter((item): item is string => typeof item === "string" && item.length > 0).join(" ").toLowerCase();
}

function collectProjectEntryLocalizedText(entry: RenderProjectEntry): string[] {
  return Object.values(entry.i18n?.fields ?? {})
    .flatMap((field) => Object.values(field.localizedText));
}

function formatProjectViewLabel(view: RenderProjectView): string {
  if (view === "js") {
    return "JS";
  }

  if (view === "css") {
    return "CSS";
  }

  if (view === "html") {
    return "HTML";
  }

  if (view === "dotnet") {
    return ".NET";
  }

  if (view === "powershell") {
    return "PowerShell";
  }

  if (view === "all") {
    return "All";
  }

  return "Other";
}

function renderLocaleControl(locales: string[], selectedLocale: string): string {
  if (locales.length < 2) {
    return "";
  }

  const options = locales
    .map((locale) => {
      const selected = locale === selectedLocale ? " selected" : "";
      return `<option value="${escapeHtml(locale)}"${selected}>${escapeHtml(locale)}</option>`;
    })
    .join("");

  return [
    "<div class=\"hia-language-switch\">",
    "<label for=\"hia-locale-control\">Language</label>",
    `<select id="hia-locale-control" data-hia-locale-control>${options}</select>`,
    "</div>"
  ].join("");
}

function renderSymbol(symbol: HiaSymbol, document: HiaDocument, locales: string[], selectedLocale: string): string {
  const signature = symbol.signature ? `<pre class="hia-signature"><code>${escapeHtml(symbol.signature)}</code></pre>` : "";
  const description = renderI18nField(symbol, "description", locales, selectedLocale, symbol.summary);
  const otherFields = renderAdditionalI18nFields(symbol, locales, selectedLocale);
  const source = renderSource(symbol);

  return [
    `<article class="hia-symbol" id="${escapeHtml(symbol.id)}">`,
    `<h2>${escapeHtml(symbol.name)}</h2>`,
    `<span class="hia-kind">${escapeHtml(symbol.kind)}</span>`,
    signature,
    description || (symbol.summary ? `<p>${escapeHtml(symbol.summary)}</p>` : ""),
    otherFields,
    source,
    "</article>"
  ].join("");
}

function renderAdditionalI18nFields(symbol: HiaSymbol, locales: string[], selectedLocale: string): string {
  const fields = symbol.i18n?.fields || {};
  const fieldEntries = Object.entries(fields).filter(([fieldPath]) => fieldPath !== "description");

  if (fieldEntries.length === 0) {
    return "";
  }

  const items = fieldEntries
    .map(([fieldPath]) => {
      const renderedField = renderI18nField(symbol, fieldPath, locales, selectedLocale);
      return renderedField
        ? `<div class="hia-i18n-field"><dt>${escapeHtml(fieldPath)}</dt><dd>${renderedField}</dd></div>`
        : "";
    })
    .join("");

  return items ? `<section class="hia-i18n-fields"><h3>Localized Fields</h3><dl>${items}</dl></section>` : "";
}

function renderI18nField(
  symbol: HiaSymbol,
  fieldPath: string,
  locales: string[],
  selectedLocale: string,
  fallbackText = ""
): string {
  const field = getI18nField(symbol.i18n, fieldPath);

  if (!field && !fallbackText) {
    return "";
  }

  const blocks = locales
    .map((locale) => renderLocalizedBlock(field, locale, selectedLocale, createI18nResolveOptions(symbol), fallbackText))
    .join("");

  return `<div class="hia-localized-set" data-hia-i18n-field="${escapeHtml(fieldPath)}">${blocks}</div>`;
}

function renderLocalizedBlock(
  field: HiaI18nField | undefined,
  locale: string,
  selectedLocale: string,
  options: ReturnType<typeof createI18nResolveOptions>,
  fallbackText: string
): string {
  const resolved = field
    ? resolveI18nFieldText(field, locale, options)
    : createFallbackResolvedText(locale, selectedLocale, fallbackText);
  const hidden = locale === selectedLocale ? "" : " hidden";
  const fallbackAttrs = resolved.usedFallback
    ? ` data-hia-used-fallback="true" data-hia-fallback-from="${escapeHtml(resolved.resolvedLocale)}"`
    : "";
  const fallbackBadge = resolved.usedFallback && resolved.resolvedLocale
    ? `<span class="hia-fallback-badge">fallback: ${escapeHtml(resolved.resolvedLocale)}</span>`
    : "";

  return [
    `<p class="hia-localized-text" data-hia-locale="${escapeHtml(locale)}"${fallbackAttrs}${hidden}>`,
    escapeHtml(resolved.text),
    fallbackBadge,
    "</p>"
  ].join("");
}

function createFallbackResolvedText(locale: string, selectedLocale: string, text: string): HiaResolvedText {
  return {
    requestedLocale: locale,
    resolvedLocale: selectedLocale,
    fallbackChain: [locale, selectedLocale],
    usedFallback: locale !== selectedLocale,
    missing: !text,
    text
  };
}

function renderSource(symbol: HiaSymbol): string {
  const source = symbol.source;

  if (!source || source.mode === "none") {
    return "";
  }

  const showLinks = source.mode === "link" || source.mode === "all";
  const showPreview = source.mode === "include" || source.mode === "all";
  const definedIn = source.definedIn ? renderDefinedIn(source.definedIn, showLinks) : "";
  const primaryBlock = showPreview && source.primaryBlock?.content ? renderPrimaryBlock(source.primaryBlock) : "";
  const fragments = showPreview ? renderSourceReferences(source) : "";

  if (!definedIn && !primaryBlock && !fragments) {
    return "";
  }

  return [
    "<section class=\"hia-source-section\">",
    "<h3>Source</h3>",
    definedIn,
    primaryBlock,
    fragments ? `<section class="hia-source-references"><h4>Referenced Source Fragments</h4>${fragments}</section>` : "",
    "</section>"
  ].join("");
}

function renderDefinedIn(definedIn: HiaSourceDefinedIn, enableLink: boolean): string {
  const line = definedIn.position?.line ? `:${definedIn.position.line}` : "";
  const label = `${definedIn.relativePath}${line}`;

  if (enableLink && definedIn.link?.enabled !== false && definedIn.link?.lineUrl) {
    return `<p class="hia-source-line">Defined in <a href="${escapeHtml(definedIn.link.lineUrl)}">${escapeHtml(label)}</a></p>`;
  }

  return `<p class="hia-source-line">Defined in ${escapeHtml(label)}</p>`;
}

function renderPrimaryBlock(block: HiaSourcePrimaryBlock): string {
  if (!block.content || block.confidence === "none" || block.preview?.enabled === false) {
    return "";
  }

  const caption = formatSourceCaption(block.relativePath || "source", block.range);
  const open = block.preview?.defaultExpanded === false ? "" : " open";
  return [
    `<details class="hia-source-preview"${open}>`,
    `<summary>${renderSourceCaption(caption, block.link?.lineUrl, block.link?.enabled !== false)}</summary>`,
    `<pre class="hia-source-code"><code>${escapeHtml(block.content)}</code></pre>`,
    "</details>"
  ].join("");
}

function renderSourceReferences(source: HiaSourceMetadata): string {
  const fragmentsById = new Map((source.fragments || []).map((fragment) => [fragment.id, fragment]));
  const referencedFragmentIds = new Set(
    (source.references || [])
      .map((reference) => reference.fragment?.id)
      .filter((id): id is string => Boolean(id))
  );
  const standaloneFragments = (source.fragments || []).filter((fragment) => !referencedFragmentIds.has(fragment.id));

  return [
    ...standaloneFragments.map((fragment) => renderSourceFragment(fragment)),
    ...(source.references || [])
      .map((reference) => renderSourceReference(reference, fragmentsById.get(reference.fragment?.id || reference.targetId)))
      .filter(Boolean)
  ].join("");
}

function renderSourceReference(reference: HiaSourceReference, fallbackFragment?: HiaSourceFragment): string {
  if (!reference.resolved || !reference.fragment) {
    return `<p class="hia-source-unresolved">${escapeHtml(reference.targetId)} unresolved</p>`;
  }

  const fragment = {
    ...fallbackFragment,
    ...reference.fragment
  };

  return renderSourceFragment(fragment, reference.targetId);
}

function renderSourceFragment(fragment: HiaSourceFragment, label = fragment.id): string {
  if (!fragment.content || fragment.confidence === "none" || fragment.preview?.enabled === false) {
    return "";
  }

  const caption = `${label} - ${formatSourceCaption(fragment.relativePath, fragment.range)}`;
  const open = fragment.preview?.defaultExpanded === true ? " open" : "";
  return [
    `<details class="hia-source-fragment"${open}>`,
    `<summary>${renderSourceCaption(caption, fragment.link?.lineUrl, fragment.link?.enabled !== false)}</summary>`,
    `<pre class="hia-source-code"><code>${escapeHtml(fragment.content)}</code></pre>`,
    "</details>"
  ].join("");
}

function formatSourceCaption(path: string, range: HiaSourcePrimaryBlock["range"]): string {
  if (!range) {
    return path;
  }

  return `${path}:${range.start.line}-${range.end.line}`;
}

function renderSourceCaption(caption: string, lineUrl: string | undefined, enableLink: boolean): string {
  if (!enableLink || !lineUrl) {
    return escapeHtml(caption);
  }

  return `<a href="${escapeHtml(lineUrl)}">${escapeHtml(caption)}</a>`;
}

function normalizeLocales(document: HiaDocument, selectedLocale: string): string[] {
  const locales = [...document.locales];

  for (const locale of [selectedLocale, document.defaultLocale]) {
    if (locale && !locales.includes(locale)) {
      locales.unshift(locale);
    }
  }

  return locales;
}

function resolveProjectLocaleModel(
  projectInput: RenderProjectHtmlInput,
  requestedLocale: string | undefined
): { selectedLocale: string; locales: string[] } {
  const declaredLocales = projectInput.project.locales ?? [];
  const inferredLocales = projectInput.entries
    .flatMap((entry) => [
      ...(entry.i18n?.locales ?? []),
      ...Object.values(entry.i18n?.fields ?? {}).flatMap((field) => Object.keys(field.localizedText))
    ]);
  const defaultLocale = projectInput.project.defaultLocale
    ?? declaredLocales[0]
    ?? inferredLocales[0]
    ?? "und";
  const selectedLocale = requestedLocale ?? defaultLocale;
  const locales: string[] = [];

  for (const locale of [selectedLocale, defaultLocale, ...declaredLocales, ...inferredLocales]) {
    if (locale && !locales.includes(locale)) {
      locales.push(locale);
    }
  }

  return { selectedLocale, locales };
}

function createI18nResolveOptions(symbol: HiaSymbol) {
  return createI18nResolveOptionsFromModel(symbol.i18n);
}

function createI18nResolveOptionsFromModel(model: HiaI18nModel | undefined) {
  return {
    ...(model?.defaultLocale ? { defaultLocale: model.defaultLocale } : {}),
    ...(model?.fallbackLocale ? { fallbackLocale: model.fallbackLocale } : {})
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
