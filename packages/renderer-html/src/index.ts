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
import type { GeneratedDocumentationBindingHostProjection } from "@hia-doc/source-linkage";
import { DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH, getDefaultThemeAssets } from "@hia-doc/theme-default";
import {
  DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT,
  DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_CONTRACT_VERSION,
  DOCUMENTATION_PORTAL_SEMANTIC_PATH_KINDS,
  getDocumentationPortalLabels,
  resolveDocumentationPortalInformationArchitecture,
  resolveDocumentationPortalUiLocale,
  type DocumentationPortalInformationArchitectureContract,
  type DocumentationPortalInformationArchitectureOptions,
  type DocumentationPortalLabels,
  type DocumentationPortalSemanticPathKind,
  type DocumentationPortalSemanticPathSegment,
  type DocumentationPortalUiLocale
} from "./information-architecture.js";

export * from "./information-architecture.js";

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
export type RenderProjectSourceFetchTrigger = "on-expand" | "manual";

export interface RenderProjectSiteOptions {
  /** 默认 split-site；single-page 仅适合兼容、小型文档或静态快照。Defaults to split-site; single-page is for compatibility, small docs, or snapshots. */
  layout?: RenderProjectSiteLayout;
  /**
   * 显式 IA 才启用 P4 slice；缺失时保持 P3 output path。
   * Only explicit IA enables the P4 slice; omission preserves the P3 output path.
   */
  informationArchitecture?: DocumentationPortalInformationArchitectureOptions;
  /** UI chrome locale，与 project content locale 独立。UI chrome locale, independent from the project content locale. */
  uiLocale?: DocumentationPortalUiLocale;
  source?: {
    /** 控制源码正文与链接是否进入输出。Controls whether source bodies or links enter the output. */
    presentation?: RenderProjectSourcePresentation;
    /** embed 模式的源码详情默认展开状态。Default expansion state for embedded source details. */
    defaultExpanded?: boolean;
    /** fetch 模式默认在展开时加载；manual 保留显式加载按钮。Fetch mode loads on expansion by default; manual keeps an explicit load button. */
    fetchTrigger?: RenderProjectSourceFetchTrigger;
    /** fetch 模式单次最多显示的源码行数。Maximum source lines displayed by one fetch operation. */
    maxLines?: number;
  };
}

export interface RenderProjectHtmlInput {
  project: RenderProjectInfo;
  entries: RenderProjectEntry[];
  profiles?: RenderProjectProfileRef[];
  docSourceMaps?: RenderProjectDocSourceMapRef[];
  /**
   * 中文：由 @hia-doc/source-linkage 的 W-P52.5 index 产生的安全 binding relation 投影。
   * English: Safe binding-relation projection produced by the W-P52.5
   * @hia-doc/source-linkage index.
   */
  generatedDocumentationBindingProjection?: GeneratedDocumentationBindingHostProjection;
  relationGraph?: RenderProjectRelationGraph;
  /**
   * optional、body-free 的 W-P84 continuity 摘要；renderer 不读取 report 文件或 target state。
   * Optional body-free W-P84 continuity summary; the renderer reads neither report files nor target state.
   */
  documentationContinuity?: RenderProjectDocumentationContinuitySummary;
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
  /** 产品版本仅呈现为 metadata，不参与 route。Product version is displayed as metadata and never participates in routing. */
  productVersion?: string;
}

/** Portal 可消费的最小 continuity summary；不携带 target identity、path、entry id 或正文。Minimal Portal continuity summary without target identity, paths, entry ids, or bodies. */
export interface RenderProjectDocumentationContinuitySummary {
  contract: "target-documentation-continuity";
  contractVersion: "0.1.0-draft";
  status: "accepted" | "refused";
  entries: {
    addedCount: number;
    baselineCount: number;
    currentCount: number;
    removedCount: number;
    unchangedCount: number;
  };
  requiredOutputsPreserved: boolean;
  semantics: {
    resolution: "evidence-summary-pair-validated" | "unresolved";
    confidence: "caller-provided-unverified";
    provenance: "metadata-only-comparison";
  };
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
  /** manifest input 显式提供的 owner-reviewed semantic prefix。Owner-reviewed semantic prefix explicitly supplied by the manifest input. */
  semanticPath?: DocumentationPortalSemanticPathSegment[];
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
  fetchTrigger?: RenderProjectSourceFetchTrigger;
  fetchMaxLines?: number;
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
    productVersion?: string;
    navigationIndex?: RenderProjectNavigationIndexRef;
    profiles?: RenderProjectProfileRef[];
    docSourceMaps?: RenderProjectDocSourceMapRef[];
    generatedDocumentationBindingProjection?: RenderProjectGeneratedDocumentationBindingProjectionRef;
    relationGraph?: RenderProjectRelationGraphRef;
    informationArchitecture?: DocumentationPortalInformationArchitectureContract;
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
 * 中文：renderer manifest 中 generated binding relation 投影的最小引用。
 * English: Minimal generated-binding relation projection reference in the
 * renderer manifest.
 */
export interface RenderProjectGeneratedDocumentationBindingProjectionRef {
  bindingCount: number;
  contract: string;
  contractVersion: string;
  path: string;
  status: string;
  targetCount: number;
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
    productVersion?: string;
  };
  entries: RenderProjectNavigationEntry[];
  groups: RenderProjectNavigationGroup[];
  navigationTree: RenderProjectNavigationTreeNode[];
  profiles: RenderProjectProfileRef[];
  docSourceMaps: RenderProjectDocSourceMapRef[];
  generatedDocumentationBindingProjection?: GeneratedDocumentationBindingHostProjection;
  documentationContinuity?: RenderProjectDocumentationContinuitySummary;
  relationGraph?: RenderProjectRelationGraph;
  site?: {
    layout: RenderProjectSiteLayout;
    navigationRootPath?: string;
    searchIndexPath?: string;
    relationIndexPath?: string;
    sourcePresentation: RenderProjectSourcePresentation;
    informationArchitecture?: DocumentationPortalInformationArchitectureContract;
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
  | "entry"
  | DocumentationPortalSemanticPathKind;

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
  presentationPath?: string;
  memberAnchor?: string;
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
  /** 实际 router fetch 位置；省略时与 canonical contentPath 相同。Actual router fetch location; omission means the canonical contentPath. */
  presentationPath?: string;
  /** stable member/entry anchor。稳定 member/entry anchor。 */
  memberAnchor?: string;
  semanticPath?: DocumentationPortalSemanticPathSegment[];
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
  const portalContext = resolveProjectPortalContext(normalizedProjectInput, options, siteLayout);
  const navigationIndex = createProjectNavigationIndex(normalizedProjectInput, pageTitle, options, portalContext);
  const files: RenderedHtmlFile[] = siteLayout === "single-page"
    ? [
        {
          path: "index.html",
          contents: renderProjectIndexHtml(pageTitle, normalizedProjectInput, options),
          contentType: "text/html; charset=utf-8",
          role: "entry"
        }
      ]
    : createProjectSplitSiteFiles(pageTitle, normalizedProjectInput, navigationIndex, options, portalContext);
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

/** 当前 render 调用的 IA/locale/label resolved context。Resolved IA, locale, and label context for one render call. */
interface RenderProjectPortalContext {
  informationArchitecture?: DocumentationPortalInformationArchitectureContract;
  labels: DocumentationPortalLabels;
  uiLocale: DocumentationPortalUiLocale;
}

/**
 * 在任何文件生成前完成 exact draft 与 single-page gate，避免 partial output。
 * Resolves the exact draft and single-page gate before any files are generated, preventing partial output.
 */
function resolveProjectPortalContext(
  projectInput: RenderProjectHtmlInput,
  options: RenderHtmlOptions,
  layout: RenderProjectSiteLayout
): RenderProjectPortalContext {
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const uiLocale = resolveDocumentationPortalUiLocale(options.projectSite?.uiLocale, localeModel.selectedLocale);
  const explicitInformationArchitecture = options.projectSite?.informationArchitecture;

  if (projectInput.documentationContinuity) {
    assertProjectDocumentationContinuitySummary(projectInput.documentationContinuity);
  }

  if (explicitInformationArchitecture && layout === "single-page") {
    throw new TypeError(
      "HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED: Explicit Portal IA is supported only with split-site in this draft."
    );
  }

  return {
    uiLocale,
    labels: getDocumentationPortalLabels(uiLocale),
    ...(explicitInformationArchitecture
      ? {
          informationArchitecture: resolveDocumentationPortalInformationArchitecture(
            explicitInformationArchitecture,
            uiLocale,
            localeModel.selectedLocale
          )
        }
      : {})
  };
}

/** optional continuity linkage 只接受 exact、non-negative、body-free summary。Optional continuity linkage accepts only an exact, non-negative, body-free summary. */
function assertProjectDocumentationContinuitySummary(summary: RenderProjectDocumentationContinuitySummary): void {
  const validShape = isExactObject(summary, [
    "contract",
    "contractVersion",
    "status",
    "entries",
    "requiredOutputsPreserved",
    "semantics"
  ])
    && isExactObject(summary.entries, ["addedCount", "baselineCount", "currentCount", "removedCount", "unchangedCount"])
    && isExactObject(summary.semantics, ["resolution", "confidence", "provenance"]);
  const counts = validShape ? Object.values(summary.entries) : [];
  const countsConsistent = validShape
    && summary.entries.baselineCount === summary.entries.unchangedCount + summary.entries.removedCount
    && summary.entries.currentCount === summary.entries.unchangedCount + summary.entries.addedCount;
  if (!validShape
    || summary.contract !== "target-documentation-continuity"
    || summary.contractVersion !== "0.1.0-draft"
    || !["accepted", "refused"].includes(summary.status)
    || typeof summary.requiredOutputsPreserved !== "boolean"
    || !["evidence-summary-pair-validated", "unresolved"].includes(summary.semantics.resolution)
    || summary.semantics.confidence !== "caller-provided-unverified"
    || summary.semantics.provenance !== "metadata-only-comparison"
    || counts.some((value) => !Number.isSafeInteger(value) || value < 0)
    || !countsConsistent) {
    throw new TypeError(
      "HIA_PORTAL_IA_CONTINUITY_INVALID: continuity linkage must be an exact metadata-only count summary."
    );
  }
}

/** closed-world runtime object shape 检查，防止 TypeScript 之外的 caller 注入 path/body/identity。Checks closed-world runtime object shapes so non-TypeScript callers cannot inject paths, bodies, or identities. */
function isExactObject(value: unknown, allowedFields: readonly string[]): value is Record<string, unknown> {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.keys(value).every((field) => allowedFields.includes(field))
    && allowedFields.every((field) => Object.hasOwn(value, field));
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
        ...(presentation === "fetch" && fetchUrl ? {
          fetchUrl,
          fetchTrigger: options.projectSite?.source?.fetchTrigger ?? entry.source.fetchTrigger ?? "on-expand",
          fetchMaxLines: options.projectSite?.source?.maxLines ?? entry.source.fetchMaxLines ?? 400
        } : {})
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
      ...(projectInput.project.productVersion ? { productVersion: projectInput.project.productVersion } : {}),
      navigationIndex: {
        contract: navigationIndex.contract,
        contractVersion: navigationIndex.contractVersion,
        entryCount: navigationIndex.entries.length,
        path: "project-index.json"
      },
      ...(projectInput.profiles && projectInput.profiles.length > 0 ? { profiles: projectInput.profiles } : {}),
      ...(projectInput.docSourceMaps && projectInput.docSourceMaps.length > 0 ? { docSourceMaps: projectInput.docSourceMaps } : {}),
      ...(projectInput.generatedDocumentationBindingProjection
        ? {
            generatedDocumentationBindingProjection: {
              bindingCount: projectInput.generatedDocumentationBindingProjection.summary.bindingCount,
              contract: projectInput.generatedDocumentationBindingProjection.contract,
              contractVersion: projectInput.generatedDocumentationBindingProjection.contractVersion,
              path: "project-index.json",
              status: projectInput.generatedDocumentationBindingProjection.status,
              targetCount: projectInput.generatedDocumentationBindingProjection.summary.targetCount
            }
          }
        : {}),
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
        : {}),
      ...(navigationIndex.site?.informationArchitecture
        ? { informationArchitecture: navigationIndex.site.informationArchitecture }
        : {})
    }
  };
}

function createProjectNavigationIndex(
  projectInput: RenderProjectHtmlInput,
  pageTitle: string,
  options: RenderHtmlOptions,
  portalContext: RenderProjectPortalContext
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
      views: collectProjectViews(projectInput.entries),
      ...(projectInput.project.productVersion ? { productVersion: projectInput.project.productVersion } : {})
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
        ...(portalContext.informationArchitecture
          ? {
              presentationPath: createProjectEntryPresentationPath(
                entry,
                projectInput.entries,
                portalContext.informationArchitecture
              ),
              memberAnchor: entry.id,
              ...(entry.semanticPath ? { semanticPath: entry.semanticPath } : {})
            }
          : {}),
        ...(entry.docSourceMap ? { docSourceMap: entry.docSourceMap } : {})
      }))
      .sort(compareProjectNavigationEntries),
    groups: collectProjectNavigationGroups(projectInput.entries),
    navigationTree: applyProjectNavigationPresentationPaths(
      collectProjectNavigationTree(projectInput.entries, portalContext.informationArchitecture),
      projectInput.entries,
      portalContext.informationArchitecture
    ),
    profiles: [...(projectInput.profiles ?? [])].sort(compareProjectProfiles),
    docSourceMaps: [...(projectInput.docSourceMaps ?? [])].sort(compareProjectDocSourceMaps),
    ...(projectInput.generatedDocumentationBindingProjection
      ? { generatedDocumentationBindingProjection: projectInput.generatedDocumentationBindingProjection }
      : {}),
    ...(projectInput.documentationContinuity ? { documentationContinuity: projectInput.documentationContinuity } : {}),
    site: {
      layout: options.projectSite?.layout ?? "split-site",
      ...(options.projectSite?.layout === "single-page" ? {} : {
        navigationRootPath: "navigation/root.json",
        searchIndexPath: "search/index.json",
        relationIndexPath: "relations/project.json"
      }),
      sourcePresentation: options.projectSite?.source?.presentation ?? "link",
      ...(portalContext.informationArchitecture
        ? { informationArchitecture: portalContext.informationArchitecture }
        : {})
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
  options: RenderHtmlOptions,
  portalContext: RenderProjectPortalContext
): RenderedHtmlFile[] {
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const informationArchitecture = portalContext.informationArchitecture;
  const files: RenderedHtmlFile[] = [
    {
      path: "index.html",
      contents: renderProjectSplitSiteHtml(pageTitle, projectInput, options, portalContext),
      contentType: "text/html; charset=utf-8",
      role: "entry"
    },
    ...createProjectNavigationShardFiles(
      navigationIndex.navigationTree,
      informationArchitecture?.loadingStrategy ?? "lazy"
    ),
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
          ...(informationArchitecture
            ? {
                presentationPath: createProjectEntryPresentationPath(entry, projectInput.entries, informationArchitecture),
                memberAnchor: entry.id
              }
            : {}),
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

  // <lang zh-CN>canonical entry fragment 始终生成，保证旧 deep link 与不识别 IA 的 consumer 可回退。</lang>
  // <lang en>Canonical entry fragments are always emitted so old deep links and IA-unaware consumers retain a fallback.</lang>
  for (const entry of projectInput.entries) {
    files.push({
      path: createProjectEntryContentPath(entry.id),
      contents: informationArchitecture
        ? renderProjectSemanticTopic(
            entry,
            projectInput,
            localeModel.locales,
            localeModel.selectedLocale,
            portalContext,
            informationArchitecture.memberPlacement === "with-parent"
          )
        : renderProjectEntry(entry, localeModel.locales, localeModel.selectedLocale),
      contentType: "text/html; charset=utf-8",
      role: "asset"
    });
  }

  // <lang zh-CN>semantic-container 只增加 presentation fragment，不替换 canonical fragment。</lang>
  // <lang en>Semantic containers add presentation fragments without replacing canonical fragments.</lang>
  if (informationArchitecture?.contentGrouping === "semantic-container") {
    files.push(...createProjectSemanticContainerFiles(projectInput, localeModel, portalContext));
  }

  // <lang zh-CN>eager 以单一 index 预载 presentation fragment；canonical files 仍保持独立可寻址。</lang>
  // <lang en>Eager delivery preloads presentation fragments through one index while canonical files remain independently addressable.</lang>
  if (informationArchitecture?.loadingStrategy === "eager") {
    const presentationPaths = new Set(
      navigationIndex.entries.map((entry) => entry.presentationPath ?? entry.contentPath).filter((path): path is string => Boolean(path))
    );
    const fragments = files
      .filter((file) => presentationPaths.has(file.path))
      .map((file) => ({ path: file.path, contents: file.contents }))
      .sort((left, right) => compareStableText(left.path, right.path));
    files.push({
      path: "content/eager.json",
      contents: `${JSON.stringify({
        contract: "documentation-portal-eager-fragment-index",
        contractVersion: "0.1.0-draft",
        fragments
      }, null, 2)}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    });
  }

  return files;
}

function createProjectNavigationShardFiles(
  nodes: RenderProjectNavigationTreeNode[],
  loadingStrategy: "lazy" | "eager"
): RenderedHtmlFile[] {
  const files: RenderedHtmlFile[] = [];
  const emittedPaths = new Set<string>();

  if (loadingStrategy === "eager") {
    return [{
      path: "navigation/root.json",
      contents: `${JSON.stringify({
        contract: "hia-project-navigation-shard",
        contractVersion: "0.1.0-draft",
        nodeId: "root",
        children: nodes
      }, null, 2)}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    }];
  }

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
    ...(node.entryId && !node.contentPath ? { contentPath: createProjectEntryContentPath(node.entryId) } : {})
  };
}

function createProjectEntryContentPath(entryId: string): string {
  return `entries/${stableProjectArtifactName(entryId)}.html`;
}

/**
 * 计算 additive presentation location；canonical contentPath 永远由 entry id 单独计算。
 * Computes the additive presentation location; canonical contentPath is always computed independently from the entry id.
 */
function createProjectEntryPresentationPath(
  entry: RenderProjectEntry,
  entries: RenderProjectEntry[],
  informationArchitecture: DocumentationPortalInformationArchitectureContract
): string {
  const presentationOwner = informationArchitecture.memberPlacement === "with-parent"
    ? findProjectParentEntry(entry, entries) ?? entry
    : entry;

  if (informationArchitecture.contentGrouping === "semantic-container") {
    return createProjectSemanticContainerPath(presentationOwner);
  }
  return createProjectEntryContentPath(presentationOwner.id);
}

/** semantic container id 只消费 manifest segment 或稳定 unscoped view，不读取 source path。Semantic container ids use manifest segments or a stable unscoped view, never source paths. */
function createProjectSemanticContainerPath(entry: RenderProjectEntry): string {
  const identity = entry.semanticPath && entry.semanticPath.length > 0
    ? entry.semanticPath.map((segment) => `${segment.kind}:${segment.id}`).join("|")
    : `unscoped:${entry.view}`;
  return `semantic-containers/${stableProjectArtifactName(identity)}.html`;
}

/** 仅按显式 parentSymbolId/symbolId 解析父入口，不执行名称或路径猜测。Resolves a parent only by explicit parentSymbolId/symbolId, with no name or path inference. */
function findProjectParentEntry(entry: RenderProjectEntry, entries: RenderProjectEntry[]): RenderProjectEntry | undefined {
  const parentSymbolId = entry.hierarchy?.parentSymbolId;
  return parentSymbolId ? entries.find((candidate) => candidate.symbolId === parentSymbolId) : undefined;
}

/** 把 canonical 与 presentation location 投影到 leaf node，保持 tree node identity 不变。Projects canonical and presentation locations onto leaf nodes without changing tree-node identity. */
function applyProjectNavigationPresentationPaths(
  nodes: RenderProjectNavigationTreeNode[],
  entries: RenderProjectEntry[],
  informationArchitecture: DocumentationPortalInformationArchitectureContract | undefined
): RenderProjectNavigationTreeNode[] {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  return nodes.map((node) => {
    const entry = node.entryId ? entriesById.get(node.entryId) : undefined;
    return {
      ...node,
      ...(node.children
        ? { children: applyProjectNavigationPresentationPaths(node.children, entries, informationArchitecture) }
        : {}),
      ...(entry ? { contentPath: createProjectEntryContentPath(entry.id) } : {}),
      ...(entry && informationArchitecture
        ? {
            presentationPath: createProjectEntryPresentationPath(entry, entries, informationArchitecture),
            memberAnchor: entry.id
          }
        : {})
    };
  });
}

/**
 * 按 presentation path 生成 container fragment；with-parent child 由 parent topic 的 members section 承载。
 * Emits container fragments by presentation path; with-parent children are carried by the parent topic's members section.
 */
function createProjectSemanticContainerFiles(
  projectInput: RenderProjectHtmlInput,
  localeModel: ReturnType<typeof resolveProjectLocaleModel>,
  portalContext: RenderProjectPortalContext
): RenderedHtmlFile[] {
  const informationArchitecture = portalContext.informationArchitecture;
  if (!informationArchitecture) {
    return [];
  }

  const groups = new Map<string, RenderProjectEntry[]>();
  for (const entry of projectInput.entries) {
    const path = createProjectEntryPresentationPath(entry, projectInput.entries, informationArchitecture);
    const bucket = groups.get(path) ?? [];
    bucket.push(entry);
    groups.set(path, bucket);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => compareStableText(left, right))
    .map(([path, entries]) => {
      const visibleEntries = informationArchitecture.memberPlacement === "with-parent"
        ? entries.filter((entry) => {
            const parent = findProjectParentEntry(entry, projectInput.entries);
            return !parent || createProjectEntryPresentationPath(parent, projectInput.entries, informationArchitecture) !== path;
          })
        : entries;
      return {
        path,
        contents: visibleEntries
          .sort(compareProjectNavigationEntries)
          .map((entry) => renderProjectSemanticTopic(
            entry,
            projectInput,
            localeModel.locales,
            localeModel.selectedLocale,
            portalContext,
            informationArchitecture.memberPlacement === "with-parent"
          ))
          .join(""),
        contentType: "text/html; charset=utf-8",
        role: "asset" as const
      };
    });
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
  options: RenderHtmlOptions,
  portalContext: RenderProjectPortalContext
): string {
  const projectName = projectInput.project.title ?? projectInput.project.name;
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const views = collectProjectViews(projectInput.entries);
  const entryCounts = countEntriesByView(projectInput.entries);
  const labels = portalContext.labels;

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
    renderProjectGeneratedDocumentationBindingProjection(projectInput.generatedDocumentationBindingProjection),
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
    renderProjectSplitSiteScript(
      labels.requiresServer,
      labels.open,
      portalContext.informationArchitecture?.loadingStrategy ?? "lazy",
      labels.relations
    ),
    "</body>",
    "</html>"
  ].join("");
}

/**
 * 生成 split-site 与 single-page 共用的 fetch 源码加载逻辑。
 *
 * @lang zh-CN 该脚本默认在 details 展开时加载源码，并保留 manual 按钮模式作为显式配置。
 * @lang en Generates the shared fetch-source loader for split-site and single-page layouts, loading on details expansion by default while retaining an explicit manual button mode.
 */
function renderProjectSourceFetchClientLines(rootExpression: "contentHost" | "document"): string[] {
  return [
    "  async function loadSourceFetch(details) {",
    "    if (details.dataset.loaded === 'true' || details.dataset.loading === 'true') return;",
    "    const code = details.querySelector('code');",
    "    const button = details.querySelector('[data-hia-source-fetch-button]');",
    "    const status = details.querySelector('[data-hia-source-fetch-status]');",
    "    details.dataset.loading = 'true';",
    "    details.setAttribute('aria-busy', 'true');",
    "    if (status) {",
    "      status.hidden = false;",
    "      status.textContent = 'Loading source / 正在加载源码...';",
    "    }",
    "    try {",
    "      const response = await fetch(details.dataset.hiaSourceFetch || '', { credentials: 'omit' });",
    "      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);",
    "      const lines = (await response.text()).split(/\\r?\\n/u);",
    "      const start = Math.max(1, Number(details.dataset.hiaSourceStart || 1));",
    "      const maxLines = Math.max(1, Number(details.dataset.hiaSourceMaxLines || 400));",
    "      const declaredEnd = Number(details.dataset.hiaSourceEnd || 0);",
    "      const end = declaredEnd >= start ? Math.min(declaredEnd, start + maxLines - 1) : start + maxLines - 1;",
    "      if (code) code.textContent = lines.slice(start - 1, end).join('\\n');",
    "      details.dataset.loaded = 'true';",
    "      if (button) button.hidden = true;",
    "      if (status) status.hidden = true;",
    "    } catch (error) {",
    "      if (status) status.textContent = `Source load failed / 源码加载失败: ${String(error?.message || error)}`;",
    "      if (button) {",
    "        button.hidden = false;",
    "        button.textContent = 'Retry source / 重试加载源码';",
    "      }",
    "    } finally {",
    "      delete details.dataset.loading;",
    "      details.removeAttribute('aria-busy');",
    "    }",
    "  }",
    `  function bindSourceFetch(root = ${rootExpression}) {`,
    "    for (const details of root?.querySelectorAll('details[data-hia-source-fetch]') || []) {",
    "      const button = details.querySelector('[data-hia-source-fetch-button]');",
    "      if (button) button.addEventListener('click', () => loadSourceFetch(details));",
    "      if (details.dataset.hiaSourceFetchTrigger !== 'manual') {",
    "        details.addEventListener('toggle', () => {",
    "          if (details.open) void loadSourceFetch(details);",
    "        });",
    "        if (details.open) void loadSourceFetch(details);",
    "      }",
    "    }",
    "  }"
  ];
}

function renderProjectSplitSiteScript(
  fileProtocolMessage: string,
  openLabel: string,
  loadingStrategy: "lazy" | "eager",
  relationsLabel: string
): string {
  return [
    "<script>",
    "(() => {",
    `  const config = { navigation: 'navigation/root.json', search: 'search/index.json', relations: 'relations/project.json', loadingStrategy: ${JSON.stringify(loadingStrategy)}, eagerContent: 'content/eager.json' };`,
    "  const treeHost = document.querySelector('[data-hia-project-tree]');",
    "  const contentHost = document.querySelector('[data-hia-project-content]');",
    "  const search = document.querySelector('[data-hia-project-search]');",
    "  const locale = document.querySelector('[data-hia-locale-control]');",
    "  const viewButtons = Array.from(document.querySelectorAll('[data-hia-project-view]'));",
    "  let rootNodes = [];",
    "  let searchEntries = null;",
    "  let eagerFragments = null;",
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
    "    item.dataset.hiaProjectNodeId = node.id || '';",
    "    if (node.entryId) item.dataset.hiaProjectEntryId = node.entryId;",
    "    const inlineChildren = Array.isArray(node.children) ? node.children : [];",
    "    if (node.childrenPath || inlineChildren.length > 0) {",
    "      const details = document.createElement('details');",
    "      details.dataset.hiaProjectDisclosure = node.id || '';",
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
    "          loadEntry(node, true);",
    "        });",
    "        summary.append(openButton);",
    "      }",
    "      details.append(summary);",
    "      if (inlineChildren.length > 0) {",
    "        details.dataset.loaded = 'true';",
    "        details.append(createTreeList(inlineChildren));",
    "      } else {",
    "        details.addEventListener('toggle', async () => {",
    "          if (!details.open || details.dataset.loaded === 'true') return;",
    "          details.dataset.loaded = 'true';",
    "          const loading = document.createElement('p');",
    "          loading.className = 'hia-project-loading';",
    "          loading.textContent = '...';",
    "          details.append(loading);",
    "          try {",
    "            const shard = await readJson(node.childrenPath);",
    "            loading.replaceWith(createTreeList(Array.isArray(shard.children) ? shard.children : []));",
    "          } catch (error) {",
    "            loading.textContent = String(error?.message || error);",
    "          }",
    "        });",
    "      }",
    "      item.append(details);",
    "    } else if (node.entryId && node.contentPath) {",
    "      const button = document.createElement('button');",
    "      button.type = 'button';",
    "      button.className = 'hia-project-entry-link';",
    "      button.textContent = node.label;",
    "      button.addEventListener('click', () => loadEntry(node, true));",
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
    ...renderProjectSourceFetchClientLines("contentHost"),
    "  async function ensureEagerFragments() {",
    "    if (config.loadingStrategy !== 'eager') return null;",
    "    if (eagerFragments) return eagerFragments;",
    "    const index = await readJson(config.eagerContent);",
    "    eagerFragments = new Map((Array.isArray(index.fragments) ? index.fragments : []).map((fragment) => [fragment.path, fragment.contents]));",
    "    return eagerFragments;",
    "  }",
    "  async function readFragment(path) {",
    "    const eager = await ensureEagerFragments();",
    "    if (eager?.has(path)) return eager.get(path);",
    "    const response = await fetch(path, { credentials: 'omit' });",
    "    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);",
    "    return response.text();",
    "  }",
    "  function markActiveEntry(entryId) {",
    "    for (const item of document.querySelectorAll('[data-hia-project-node-id]')) {",
    "      delete item.dataset.hiaActiveEntry;",
    "      for (const details of item.querySelectorAll(':scope > details')) delete details.dataset.hiaActiveAncestor;",
    "    }",
    "    const leaf = Array.from(document.querySelectorAll('[data-hia-project-entry-id]')).find((item) => item.dataset.hiaProjectEntryId === entryId);",
    "    if (!leaf) return;",
    "    leaf.dataset.hiaActiveEntry = 'true';",
    "    for (const details of leaf.parentElement?.closest('details') ? [leaf.parentElement.closest('details')] : []) {",
    "      let current = details;",
    "      while (current) { current.open = true; current.dataset.hiaActiveAncestor = 'true'; current = current.parentElement?.closest('details'); }",
    "    }",
    "  }",
    "  async function loadEntry(entry, updateHash) {",
    "    if (!contentHost) return;",
    "    contentHost.innerHTML = '<p class=\"hia-project-loading\">...</p>';",
    "    try {",
    "      const contentPath = entry.presentationPath || entry.contentPath;",
    "      contentHost.innerHTML = await readFragment(contentPath);",
    "      applyLocale();",
    "      bindSourceFetch();",
    "      const anchor = entry.memberAnchor || entry.entryId || entry.id;",
    "      const target = Array.from(contentHost.querySelectorAll('[id]')).find((item) => item.id === anchor);",
    "      target?.scrollIntoView({ block: 'start' });",
    "      markActiveEntry(entry.entryId || entry.id);",
    "      if (updateHash) history.replaceState(null, '', `#entry=${encodeURIComponent(entry.entryId || entry.id)}`);",
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
    "      const nodes = matches.map((entry) => ({ id: entry.id, label: `${entry.name} · ${entry.kind}`, entryId: entry.id, contentPath: entry.contentPath, presentationPath: entry.presentationPath, memberAnchor: entry.memberAnchor, views: [entry.view], entryCount: 1 }));",
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
    `      heading.textContent = ${JSON.stringify(relationsLabel)};`,
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
    "      if (entry) loadEntry({ ...entry, entryId: entry.id }, false);",
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
  const generatedDocumentationBindingProjection = renderProjectGeneratedDocumentationBindingProjection(
    projectInput.generatedDocumentationBindingProjection
  );
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
    generatedDocumentationBindingProjection,
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

/**
 * 按固定 section order 渲染显式 IA topic；不适用 section 可省略，但 coverage/provenance 明示 unavailable。
 * Renders an explicit IA topic in fixed section order; inapplicable sections may be omitted while coverage/provenance state unavailability explicitly.
 */
function renderProjectSemanticTopic(
  entry: RenderProjectEntry,
  projectInput: RenderProjectHtmlInput,
  locales: string[],
  selectedLocale: string,
  portalContext: RenderProjectPortalContext,
  includeMemberBodies: boolean
): string {
  return renderProjectSemanticTopicInternal(
    entry,
    projectInput,
    locales,
    selectedLocale,
    portalContext,
    includeMemberBodies,
    new Set<string>()
  );
}

/** 递归 member projection 保持 cycle-safe；cycle 时回退 canonical link。Recursive member projection is cycle-safe and falls back to canonical links on cycles. */
function renderProjectSemanticTopicInternal(
  entry: RenderProjectEntry,
  projectInput: RenderProjectHtmlInput,
  locales: string[],
  selectedLocale: string,
  portalContext: RenderProjectPortalContext,
  includeMemberBodies: boolean,
  ancestors: Set<string>
): string {
  const labels = portalContext.labels;
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(entry.id);
  const members = collectProjectEntryMembers(entry, projectInput.entries);
  const sections = [
    renderProjectTopicSection("summary", labels.summary, renderProjectEntrySummary(entry, locales, selectedLocale)),
    renderProjectTopicSection(
      "declaration",
      labels.declaration,
      entry.signature ? `<pre class="hia-signature"><code>${escapeHtml(entry.signature)}</code></pre>` : ""
    ),
    renderProjectTopicSection("metadata", labels.metadata, renderProjectTopicMetadata(entry, projectInput.project.productVersion)),
    renderProjectTopicSection("contract", labels.contract, renderProjectTopicContract(entry)),
    renderProjectTopicSection("coverage", labels.coverage, renderProjectTopicCoverage(projectInput.documentationContinuity, labels)),
    renderProjectTopicSection("provenance", labels.provenance, renderProjectTopicProvenance(projectInput.documentationContinuity, labels)),
    renderProjectTopicSection(
      "members",
      labels.members,
      renderProjectTopicMembers(
        members,
        projectInput,
        locales,
        selectedLocale,
        portalContext,
        includeMemberBodies,
        nextAncestors
      )
    ),
    renderProjectTopicSection("relations", labels.relations, renderProjectTopicRelations(entry, projectInput.relationGraph)),
    renderProjectTopicSection("source", labels.source, renderProjectTopicSource(entry)),
    renderProjectTopicSection("diagnostics", labels.diagnostics, renderProjectTopicDiagnostics(entry.diagnostics ?? []))
  ].join("");
  const searchText = createProjectEntrySearchText(entry);

  return [
    `<article class="hia-symbol hia-project-entry hia-project-topic" id="${escapeHtml(entry.id)}" data-hia-project-entry="${escapeHtml(entry.view)}" data-hia-project-search-text="${escapeHtml(searchText)}">`,
    `<header class="hia-project-topic-header"><h2>${escapeHtml(entry.name)}</h2><span class="hia-kind">${escapeHtml(entry.kind)}</span><span class="hia-kind">${escapeHtml(formatProjectViewLabel(entry.view))}</span></header>`,
    sections,
    "</article>"
  ].join("");
}

/** 空 section 不输出，从而保持“按适用性呈现”。Omits empty sections so topics remain applicability-aware. */
function renderProjectTopicSection(
  section: "summary" | "declaration" | "metadata" | "contract" | "coverage" | "provenance" | "members" | "relations" | "source" | "diagnostics",
  label: string,
  body: string
): string {
  return body
    ? `<section class="hia-project-topic-section" data-hia-topic-section="${section}"><h3>${escapeHtml(label)}</h3>${body}</section>`
    : "";
}

/** metadata 只含公开 entry/project facts；关系由 relations section 独立承载。Metadata contains public entry/project facts only; relations stay in their own section. */
function renderProjectTopicMetadata(entry: RenderProjectEntry, productVersion: string | undefined): string {
  const items = [
    `<dt>Kind</dt><dd>${escapeHtml(entry.kind)}</dd>`,
    `<dt>View</dt><dd>${escapeHtml(entry.view)}</dd>`,
    productVersion ? `<dt>Product Version</dt><dd>${escapeHtml(productVersion)}</dd>` : "",
    entry.input ? `<dt>Input</dt><dd>${escapeHtml(entry.input.kind)}</dd>` : "",
    entry.input?.path ? `<dt>Input Path</dt><dd>${escapeHtml(entry.input.path)}</dd>` : "",
    entry.profile ? `<dt>Profile</dt><dd>${escapeHtml(entry.profile.profileId)}${entry.profile.profileVersion ? `@${escapeHtml(entry.profile.profileVersion)}` : ""}</dd>` : "",
    entry.hierarchy?.assembly ? `<dt>Assembly</dt><dd>${escapeHtml(entry.hierarchy.assembly)}</dd>` : "",
    entry.hierarchy?.namespace ? `<dt>Namespace</dt><dd>${escapeHtml(entry.hierarchy.namespace)}</dd>` : "",
    entry.hierarchy?.containingType ? `<dt>Containing Type</dt><dd>${escapeHtml(entry.hierarchy.containingType)}</dd>` : "",
    entry.hierarchy?.symbolDocumentationId ? `<dt>Documentation ID</dt><dd>${escapeHtml(entry.hierarchy.symbolDocumentationId)}</dd>` : ""
  ].join("");
  return `<dl class="hia-project-meta">${items}</dl>`;
}

/** contract section 与 input locator 分离，避免 path 被误当 contract identity。Separates contract identity from the input locator so paths are not mistaken for contracts. */
function renderProjectTopicContract(entry: RenderProjectEntry): string {
  if (!entry.input?.contract && !entry.input?.contractVersion && !entry.input?.artifactId) {
    return "";
  }
  const items = [
    entry.input.contract ? `<dt>Contract</dt><dd>${escapeHtml(entry.input.contract)}</dd>` : "",
    entry.input.contractVersion ? `<dt>Version</dt><dd>${escapeHtml(entry.input.contractVersion)}</dd>` : "",
    entry.input.artifactId ? `<dt>Artifact</dt><dd>${escapeHtml(entry.input.artifactId)}</dd>` : ""
  ].join("");
  return `<dl class="hia-project-meta">${items}</dl>`;
}

/** continuity 缺失时不猜测成功，明确输出 unavailable。Never guesses continuity success; absence is rendered as unavailable. */
function renderProjectTopicCoverage(
  continuity: RenderProjectDocumentationContinuitySummary | undefined,
  labels: DocumentationPortalLabels
): string {
  if (!continuity) {
    return `<p class="hia-project-unavailable">${escapeHtml(labels.unavailable)}</p>`;
  }
  return [
    "<dl class=\"hia-project-meta\">",
    `<dt>Status</dt><dd>${escapeHtml(continuity.status)}</dd>`,
    `<dt>Entries</dt><dd>${escapeHtml(String(continuity.entries.baselineCount))} → ${escapeHtml(String(continuity.entries.currentCount))}</dd>`,
    `<dt>Added / Removed / Unchanged</dt><dd>${escapeHtml(String(continuity.entries.addedCount))} / ${escapeHtml(String(continuity.entries.removedCount))} / ${escapeHtml(String(continuity.entries.unchangedCount))}</dd>`,
    `<dt>Required Outputs</dt><dd>${continuity.requiredOutputsPreserved ? "preserved" : "not-preserved"}</dd>`,
    "</dl>"
  ].join("");
}

/** provenance 只显示 exact contract 与三维 semantics，不回读 evidence body。Provenance shows only the exact contract and three semantic dimensions, without reading evidence bodies. */
function renderProjectTopicProvenance(
  continuity: RenderProjectDocumentationContinuitySummary | undefined,
  labels: DocumentationPortalLabels
): string {
  if (!continuity) {
    return `<p class="hia-project-unavailable">${escapeHtml(labels.unavailable)}</p>`;
  }
  return [
    "<dl class=\"hia-project-meta\">",
    `<dt>Contract</dt><dd>${escapeHtml(continuity.contract)}@${escapeHtml(continuity.contractVersion)}</dd>`,
    `<dt>Resolution</dt><dd>${escapeHtml(continuity.semantics.resolution)}</dd>`,
    `<dt>Confidence</dt><dd>${escapeHtml(continuity.semantics.confidence)}</dd>`,
    `<dt>Provenance</dt><dd>${escapeHtml(continuity.semantics.provenance)}</dd>`,
    "</dl>"
  ].join("");
}

/** direct members 只通过 explicit symbol relation 收集。Collects direct members only through explicit symbol relations. */
function collectProjectEntryMembers(entry: RenderProjectEntry, entries: RenderProjectEntry[]): RenderProjectEntry[] {
  if (!entry.symbolId) {
    return [];
  }
  return entries
    .filter((candidate) => candidate.hierarchy?.parentSymbolId === entry.symbolId)
    .sort(compareProjectNavigationEntries);
}

/** separate 输出 canonical links；with-parent 输出嵌套完整 topic，并对 cycle 回退 link。Separate mode emits canonical links; with-parent emits nested topics with cycle-safe link fallback. */
function renderProjectTopicMembers(
  members: RenderProjectEntry[],
  projectInput: RenderProjectHtmlInput,
  locales: string[],
  selectedLocale: string,
  portalContext: RenderProjectPortalContext,
  includeMemberBodies: boolean,
  ancestors: Set<string>
): string {
  if (members.length === 0) {
    return "";
  }
  if (!includeMemberBodies) {
    return `<ul class="hia-project-member-list">${members.map((member) => `<li><a href="${escapeHtml(createProjectEntryContentPath(member.id))}#${escapeHtml(member.id)}">${escapeHtml(member.name)}</a></li>`).join("")}</ul>`;
  }
  return `<div class="hia-project-member-topics">${members.map((member) => {
    if (ancestors.has(member.id)) {
      return `<p><a href="${escapeHtml(createProjectEntryContentPath(member.id))}#${escapeHtml(member.id)}">${escapeHtml(member.name)}</a></p>`;
    }
    return renderProjectSemanticTopicInternal(
      member,
      projectInput,
      locales,
      selectedLocale,
      portalContext,
      true,
      ancestors
    );
  }).join("")}</div>`;
}

/** inheritance/implements 与 project relation graph 都只进入 relations section。Inheritance, implements, and project graph edges appear only in the relations section. */
function renderProjectTopicRelations(
  entry: RenderProjectEntry,
  relationGraph: RenderProjectRelationGraph | undefined
): string {
  const semanticItems = [
    ...(entry.hierarchy?.baseTypeIds ?? []).map((id) => `<li><span class="hia-kind">inherits</span> ${escapeHtml(id)}</li>`),
    ...(entry.hierarchy?.interfaceIds ?? []).map((id) => `<li><span class="hia-kind">implements</span> ${escapeHtml(id)}</li>`)
  ];
  const entryNodeIds = new Set(
    relationGraph?.nodes.filter((node) => node.entryId === entry.id).map((node) => node.id) ?? []
  );
  const graphItems = relationGraph?.relations
    .filter((relation) => relation.entryId === entry.id || entryNodeIds.has(relation.from) || entryNodeIds.has(relation.to))
    .map((relation) => `<li><span class="hia-kind">${escapeHtml(relation.kind)}</span> ${escapeHtml(relation.label)}</li>`) ?? [];
  const items = [...semanticItems, ...graphItems].join("");
  return items ? `<ul class="hia-project-relation-list">${items}</ul>` : "";
}

/** source 与 doc-source-map 保持既有 privacy policy；本函数不新增 source body。Source and doc-source-map retain the existing privacy policy; this function adds no source body. */
function renderProjectTopicSource(entry: RenderProjectEntry): string {
  return [
    entry.source ? renderProjectEntrySource(entry.source, false) : "",
    entry.docSourceMap ? renderProjectEntryDocSourceMap(entry.docSourceMap, false) : ""
  ].join("");
}

/** topic diagnostics 使用已有 structured diagnostic，空集合不输出。Topic diagnostics reuse structured diagnostics and omit an empty set. */
function renderProjectTopicDiagnostics(diagnostics: HiaDiagnostic[]): string {
  if (diagnostics.length === 0) {
    return "";
  }
  return `<ul>${diagnostics.map((diagnostic) => `<li>${escapeHtml(diagnostic.severity)}:${escapeHtml(diagnostic.code)} - ${escapeHtml(diagnostic.message)}</li>`).join("")}</ul>`;
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

function renderProjectEntrySource(source: RenderProjectSourceRef, includeHeading = true): string {
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

  const heading = includeHeading ? "<h3>Source</h3>" : "";
  return `<section class="hia-source-section">${heading}<dl class="hia-project-meta">${sourceDetails}</dl>${preview}${fetchPreview}</section>`;
}

function renderProjectSourceFetch(source: RenderProjectSourceRef): string {
  const startLine = source.range?.start.line ?? 1;
  const endLine = source.range?.end?.line;
  const fetchTrigger = source.fetchTrigger ?? "on-expand";
  const maxLines = source.fetchMaxLines ?? 400;
  const caption = endLine ? `${source.path}:${startLine}-${endLine}` : `${source.path}:${startLine}`;
  const endAttribute = endLine ? ` data-hia-source-end="${escapeHtml(String(endLine))}"` : "";
  const manualButton = fetchTrigger === "manual"
    ? "<button type=\"button\" class=\"hia-source-fetch-button\" data-hia-source-fetch-button>Load source / 加载源码</button>"
    : "";
  return [
    `<details class="hia-source-preview hia-project-source-preview" data-hia-source-fetch="${escapeHtml(source.fetchUrl ?? "")}" data-hia-source-fetch-trigger="${escapeHtml(fetchTrigger)}" data-hia-source-start="${escapeHtml(String(startLine))}"${endAttribute} data-hia-source-max-lines="${escapeHtml(String(maxLines))}">`,
    `<summary>${escapeHtml(caption)}</summary>`,
    manualButton,
    "<p class=\"hia-project-loading\" data-hia-source-fetch-status hidden></p>",
    `<pre class="hia-source-code"><code data-language="${escapeHtml(source.language ?? "")}"></code></pre>`,
    "</details>"
  ].join("");
}

function renderProjectEntryDocSourceMap(docSourceMap: RenderProjectEntryDocSourceMapRef, includeHeading = true): string {
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

  const heading = includeHeading ? "<h3>Doc Source Map</h3>" : "";
  return `<section class="hia-source-section">${heading}<dl class="hia-project-meta">${details}</dl>${actions}</section>`;
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

/**
 * 中文：渲染由 source-linkage index 产生的一对多 generated binding 只读关系。
 * English: Renders the read-only one-to-many generated-binding relation created
 * by the source-linkage index.
 *
 * @remarks
 * 中文：这里不回读 sidecar、不展开 source body，也不显示 locals/digest；页面只显示
 * 安全投影里的 source intent、受限 member path、实例键状态、targets 与质量维度。
 * English: This renderer does not read a sidecar back, expand source bodies, or
 * display locals/digests; it shows only safe source intent, restricted member
 * paths, instance-key state, targets, and quality dimensions.
 */
function renderProjectGeneratedDocumentationBindingProjection(
  projection: GeneratedDocumentationBindingHostProjection | undefined
): string {
  if (!projection) {
    return "";
  }

  const summaryItems = [
    `<li><span>Bindings / 绑定</span><strong>${escapeHtml(String(projection.summary.bindingCount))}</strong></li>`,
    `<li><span>Expansions / 展开</span><strong>${escapeHtml(String(projection.summary.expansionCount))}</strong></li>`,
    `<li><span>Targets / 目标</span><strong>${escapeHtml(String(projection.summary.targetCount))}</strong></li>`,
    `<li><span>Diagnostics / 诊断</span><strong>${escapeHtml(String(projection.summary.diagnosticCount))}</strong></li>`,
    `<li><span>sourcesContent</span><strong>${escapeHtml(projection.privacy.sourcesContentPolicy)}</strong></li>`
  ].join("");
  const bindings = projection.bindings.map((binding) => {
    const memberPath = binding.bindingRef.memberPath.join(".") || binding.bindingRef.rootDeclarationId;
    const quality = `${binding.quality.resolutionKind} / ${binding.quality.confidence} / ${binding.quality.provenanceCoverage}`;
    const expansions = binding.expansions
      .map((expansion) => {
        const key = expansion.instanceKey.displayKey ?? expansion.instanceKey.status;
        return `<li>${escapeHtml(expansion.id)} · key=${escapeHtml(key)} · ${escapeHtml(expansion.quality.resolutionKind)} / ${escapeHtml(expansion.quality.confidence)} / ${escapeHtml(expansion.quality.provenanceCoverage)} · ${escapeHtml(String(expansion.targetIds.length))} target(s)</li>`;
      })
      .join("");
    const targets = binding.targets
      .map((target) => `<li>${escapeHtml(target.id)} · ${escapeHtml(target.identity.kind)}${target.identity.selector ? ` · ${escapeHtml(target.identity.selector)}` : ""}</li>`)
      .join("");
    return [
      "<li>",
      `<strong>${escapeHtml(binding.id)}</strong>`,
      `<p>${escapeHtml(binding.sourceIntent.kind)}${binding.sourceIntent.field ? ` / ${escapeHtml(binding.sourceIntent.field)}` : ""} · ${escapeHtml(memberPath)} · ${escapeHtml(quality)}</p>`,
      `<p>scope=${escapeHtml(binding.scopeId)} · ${escapeHtml(binding.composition.relation)} / ${escapeHtml(binding.composition.mergePolicy)}</p>`,
      expansions ? `<details><summary>Expansions / 展开 (${escapeHtml(String(binding.expansions.length))})</summary><ul>${expansions}</ul></details>` : "",
      targets ? `<details><summary>Targets / 目标 (${escapeHtml(String(binding.targets.length))})</summary><ul>${targets}</ul></details>` : "",
      "</li>"
    ].join("");
  }).join("");

  return [
    "<section class=\"hia-project-summary hia-generated-binding-relations\">",
    "<h2>Generated Documentation Bindings / 生成式文档绑定</h2>",
    `<p>${escapeHtml(projection.contract)}@${escapeHtml(projection.contractVersion)} · ${escapeHtml(projection.status)}</p>`,
    `<ul class=\"hia-project-group-list\">${summaryItems}</ul>`,
    bindings ? `<ul class=\"hia-project-relation-list\">${bindings}</ul>` : "<p>No binding relations available.</p>",
    "</section>"
  ].join("");
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
    ...renderProjectSourceFetchClientLines("document"),
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
    "  bindSourceFetch();",
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
  terminalChildren: RenderProjectNavigationTreeNode[];
  entryId?: string;
  sourcePath?: string;
  symbolId?: string;
}

function collectProjectNavigationTree(
  entries: RenderProjectEntry[],
  informationArchitecture?: DocumentationPortalInformationArchitectureContract
): RenderProjectNavigationTreeNode[] {
  return PROJECT_VIEW_ORDER
    .filter((view) => view !== "all")
    .flatMap((view) => {
      const viewEntries = entries.filter((entry) => entry.view === view);
      if (viewEntries.length === 0) {
        return [];
      }

      const children = informationArchitecture
        ? collectManifestSemanticNavigationTree(viewEntries, view)
        : view === "dotnet"
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

function collectDotNetNavigationTree(
  entries: RenderProjectEntry[],
  includeTypeRelations = true
): RenderProjectNavigationTreeNode[] {
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
      if (includeTypeRelations && entry.kind === "dotnet-type") {
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

/**
 * 构造 manifest-only semantic prefix，再接既有语言 containment；显式 IA 不使用 source path 分组。
 * Builds a manifest-only semantic prefix followed by language containment; explicit IA never groups by source path.
 */
function collectManifestSemanticNavigationTree(
  entries: RenderProjectEntry[],
  view: RenderProjectView
): RenderProjectNavigationTreeNode[] {
  const semanticRoots = new Map<string, ProjectNavigationTreeBuilder>();
  const groupedEntries = new Map<string, { path: DocumentationPortalSemanticPathSegment[]; entries: RenderProjectEntry[] }>();

  for (const entry of entries) {
    assertRenderProjectSemanticPath(entry.semanticPath);
    const path = entry.semanticPath ?? [];
    const key = path.length > 0
      ? path.map((segment) => `${segment.kind}:${segment.id}`).join("|")
      : `unscoped:${view}`;
    const group = groupedEntries.get(key) ?? { path, entries: [] };
    group.entries.push(entry);
    groupedEntries.set(key, group);
  }

  const unscopedChildren: RenderProjectNavigationTreeNode[] = [];
  for (const [groupKey, group] of [...groupedEntries.entries()].sort(([left], [right]) => compareStableText(left, right))) {
    const languageChildren = view === "dotnet"
      ? collectDotNetNavigationTree(group.entries, false)
      : collectSymbolContainmentNavigationTree(group.entries);
    const namespacedChildren = languageChildren.map((node) => namespaceProjectNavigationNode(node, `semantic:${groupKey}`));

    if (group.path.length === 0) {
      unscopedChildren.push(...namespacedChildren);
      continue;
    }

    let parentMap = semanticRoots;
    let parentBuilder: ProjectNavigationTreeBuilder | undefined;
    let qualifiedId = "semantic";
    for (const segment of group.path) {
      qualifiedId = `${qualifiedId}:${segment.kind}:${segment.id}`;
      const builder = getOrCreateProjectTreeChild(parentMap, qualifiedId, segment.kind, segment.label);
      for (const entry of group.entries) {
        addProjectTreeEntry(builder, entry);
      }
      parentBuilder = builder;
      parentMap = builder.childrenById;
    }
    if (parentBuilder) {
      parentBuilder.terminalChildren.push(...namespacedChildren);
    }
  }

  const semanticChildren = [...semanticRoots.values()].map(finalizeProjectTreeBuilder);
  return sortProjectTreeNodes([...semanticChildren, ...unscopedChildren]);
}

/** 非 DotNet 显式 IA 下只使用 symbol containment，不回退到 source-root/source-file。Non-.NET explicit IA uses symbol containment only, without source grouping fallback. */
function collectSymbolContainmentNavigationTree(entries: RenderProjectEntry[]): RenderProjectNavigationTreeNode[] {
  const roots = new Map<string, ProjectNavigationTreeBuilder>();
  const nodesByEntryId = new Map<string, ProjectNavigationTreeBuilder>();
  const entriesBySymbolId = new Map<string, RenderProjectEntry>();

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
  }

  for (const entry of entries) {
    const entryNode = nodesByEntryId.get(`entry:${entry.id}`);
    const parentEntry = entry.hierarchy?.parentSymbolId
      ? entriesBySymbolId.get(entry.hierarchy.parentSymbolId)
      : undefined;
    const parentNode = parentEntry ? nodesByEntryId.get(`entry:${parentEntry.id}`) : undefined;
    if (entryNode && parentEntry && parentNode && parentNode !== entryNode) {
      parentNode.childrenById.set(entryNode.id, entryNode);
      incrementProjectNavigationAncestorCounts(parentEntry, entriesBySymbolId, nodesByEntryId);
    } else if (entryNode) {
      roots.set(entryNode.id, entryNode);
    }
  }

  return sortProjectTreeNodes([...roots.values()].map(finalizeProjectTreeBuilder));
}

/** 为跨 semantic container 的 shard node id 增加 namespace，entry id 本身保持不变。Namespaces shard node ids across semantic containers while preserving entry identity. */
function namespaceProjectNavigationNode(
  node: RenderProjectNavigationTreeNode,
  namespace: string
): RenderProjectNavigationTreeNode {
  return {
    ...node,
    id: `${namespace}:${node.id}`,
    ...(node.children
      ? { children: node.children.map((child) => namespaceProjectNavigationNode(child, namespace)) }
      : {})
  };
}

/** direct renderer API 的 semantic path 同样 fail closed，防止绕过 manifest validator。Semantic paths passed directly to the renderer also fail closed. */
function assertRenderProjectSemanticPath(path: DocumentationPortalSemanticPathSegment[] | undefined): void {
  if (!path) {
    return;
  }
  if (!Array.isArray(path) || path.length === 0) {
    throw new TypeError("HIA_PORTAL_IA_SEMANTIC_PATH_INVALID: semanticPath must be a non-empty array.");
  }
  const seen = new Set<string>();
  for (const segment of path) {
    const exactSegment = isExactObject(segment, ["kind", "id", "label"]);
    const normalizedLabel = exactSegment && typeof segment.label === "string"
      ? segment.label.replaceAll("\\", "/")
      : "";
    const safeLabel = exactSegment
      && Boolean(segment.label)
      && segment.label.length <= 160
      && !/[\u0000-\u001F\u007F]/u.test(segment.label)
      && !normalizedLabel.includes("../")
      && normalizedLabel !== ".."
      && !normalizedLabel.startsWith("/")
      && !/^[A-Za-z]:\//u.test(normalizedLabel)
      && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(normalizedLabel);
    if (!exactSegment
      || !DOCUMENTATION_PORTAL_SEMANTIC_PATH_KINDS.includes(segment.kind)
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(segment.id)
      || !safeLabel
      || seen.has(segment.id)) {
      throw new TypeError("HIA_PORTAL_IA_SEMANTIC_PATH_INVALID: semanticPath must contain unique, public kind/id/label segments.");
    }
    seen.add(segment.id);
  }
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
    childrenById: new Map<string, ProjectNavigationTreeBuilder>(),
    terminalChildren: []
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
  const children = sortProjectTreeNodes([
    ...childBuilders.map(finalizeProjectTreeBuilder),
    ...node.terminalChildren
  ]);

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

  if (kind === "repository") {
    return 1;
  }

  if (kind === "package") {
    return 2;
  }

  if (kind === "layer") {
    return 3;
  }

  if (kind === "contract" || kind === "operation") {
    return 4;
  }

  if (kind === "surface" || kind === "project") {
    return 5;
  }

  if (kind === "assembly") {
    return 6;
  }

  if (kind === "namespace") {
    return 7;
  }

  if (kind === "type") {
    return 8;
  }

  if (kind === "relation") {
    return 9;
  }

  if (kind === "source-root") {
    return 10;
  }

  if (kind === "source-file") {
    return 11;
  }

  return 12;
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
