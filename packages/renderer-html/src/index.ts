import {
  canonicalizeDocumentationLocale,
  getI18nField,
  resolveI18nFieldText,
  validateBusinessFlowDocumentationProjection,
  validateDocumentationSourceCommentProjection,
  type BusinessFlowDocumentationProjection,
  type DocumentationSourceCommentContentPolicy,
  type DocumentationSourceCommentProjection,
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
import {
  DEFAULT_THEME_CSS_PATH,
  DEFAULT_THEME_JS_PATH,
  PORTAL_THEME_SCHEMES,
  PORTAL_THEME_SKIN_IDS,
  getDefaultDocumentationPortalThemeReference,
  getDefaultThemeAssets,
  getPortalThemeSchemeLabel,
  getPortalThemeSkinLabel,
  type PortalThemeScheme,
  type PortalThemeSkinId,
  type DocumentationPortalThemeReference
} from "@hia-doc/theme-default";
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
import {
  PORTAL_PRESENTATION_PROFILE_PATH,
  createPortalPresentationBundle,
  type PortalPreparedSourceAsset,
  type PortalPresentationBundle
} from "./presentation-profile.js";

export * from "./information-architecture.js";
export * from "./presentation-profile.js";

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

/** @lang zh-CN Portal 的构建时默认 skin/scheme；运行时选择不改变内容 identity。 @lang en Build-time Portal skin/scheme defaults; runtime selection does not change content identity. */
export interface RenderProjectThemeOptions {
  scheme?: PortalThemeScheme;
  skinId?: PortalThemeSkinId;
}

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
  /**
   * @lang zh-CN
   * source-comment locale 与正文授权；只有显式 IA 下才消费，且不从 UI/content locale 推断。
   *
   * @lang en
   * Source-comment locale and body authorization, consumed only under explicit IA and never inferred from UI or content locale.
   */
  sourceCommentProjection?: RenderProjectSourceCommentProjectionOptions;
  /** @lang zh-CN Portal-owned skin 与独立 scheme 选择。 @lang en Portal-owned skin and independent scheme selection. */
  theme?: RenderProjectThemeOptions;
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

/**
 * @lang zh-CN
 * Portal P5 有界 slice 的 runtime 选项；P1 不支持 rich text 或 source fetch。
 *
 * @lang en
 * Runtime options for the bounded Portal P5 slice; P1 supports neither rich text nor source fetch.
 */
export interface RenderProjectSourceCommentProjectionOptions {
  contentPolicy?: DocumentationSourceCommentContentPolicy;
  locale: string;
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
  /**
   * @lang zh-CN optional W-P89 owner-adoption Portal 投影；只在显式 IA 下消费 metadata-only summary。
   * @lang en Optional W-P89 owner-adoption Portal projection; consumes a metadata-only summary only under explicit IA.
   */
  ownerAdoption?: RenderProjectOwnerAdoptionSummary;
  /**
   * @lang zh-CN
   * optional W-P122 public dual projection；W-P124 只将其投影到 Portal structured data plane，不据此定稿可见 flow UI。
   *
   * @lang en
   * Optional W-P122 public dual projection; W-P124 projects it only to the Portal structured data plane and does not finalize a visible flow UI from it.
   */
  businessFlowDocumentationProjection?: BusinessFlowDocumentationProjection;
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

/**
 * @lang zh-CN Portal 可消费的 owner-adoption 最小投影；不含 target/trial/owner identity、path、body 或 adoption claim。
 * @lang en Minimal Portal-consumable owner-adoption projection without target/trial/owner identity, paths, bodies, or adoption claims.
 */
export interface RenderProjectOwnerAdoptionSummary {
  contract: "target-owner-adoption-kit";
  contractVersion: "0.1.0-draft";
  projection: "portal-metadata-only";
  status: "ready-for-owner-review" | "deferred-owner-input-missing" | "refused";
  targetFamily: "enterprise-business" | "workspace-container";
  ownerInput: {
    submitted: boolean;
    consent: "not-recorded" | "recorded-for-review";
  };
  contracts: {
    requiredCount: number;
    providedCount: number;
    missingCount: number;
  };
  workspaceHandoff?: {
    repositoryOwnerCount: number;
    handoffEdgeCount: number;
    state: "owner-review-required";
  };
  semantics: {
    resolution: "owner-input-validated" | "owner-input-not-received" | "unresolved";
    confidence: "caller-provided-unverified";
    provenance: "metadata-only-owner-kit";
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
  /**
   * @lang zh-CN source relation 到 canonical entry 的 metadata-only 可用性投影；不授予源码读取能力。
   * @lang en Metadata-only source-usability projection from a source relation to the canonical entry; it grants no source-read capability.
   */
  sourceUsability?: RenderProjectSourceUsabilityRef;
  /**
   * @lang zh-CN
   * 已由 owner producer 生成并通过中性 contract 校验的 source-comment projection。
   *
   * @lang en
   * Source-comment projection already produced by an owner producer and validated against the neutral contract.
   */
  sourceCommentProjection?: DocumentationSourceCommentProjection;
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
  /** @lang zh-CN renderer 构造的 body-free public asset metadata；正文只存在于单独静态文件。 @lang en Body-free public-asset metadata built by the renderer; the body exists only in a separate static file. */
  publicAsset?: PortalPreparedSourceAsset;
  preview?: RenderProjectSourcePreviewRef;
  range?: {
    start: { line: number; column?: number };
    end?: { line: number; column?: number };
  };
  rangeSource?: string;
}

/**
 * @lang zh-CN 项目相对 source identity；ID 与 path 均由 owner producer 解析，不能由 display label、locale 或绝对路径推导。
 * @lang en Project-relative source identity; both ID and path are owner-producer resolved and must not derive from a display label, locale, or absolute path.
 */
export interface RenderProjectSourceProjectIdentityRef {
  /** @lang zh-CN owner producer 生成的稳定 project ID。 @lang en Stable project ID generated by the owner producer. */
  id: string;
  /** @lang zh-CN 工作区相对 `.csproj` path；不得为绝对路径。 @lang en Workspace-relative `.csproj` path; never an absolute path. */
  path: string;
  /** @lang zh-CN 生成 ID/path 的 identity policy。 @lang en Identity policy used to produce the ID and path. */
  policy: string;
}

/**
 * @lang zh-CN source relation 的有界 Portal 投影；resolution、confidence 与 provenance 保持独立，privacy 固定为 metadata-only。
 * @lang en Bounded Portal projection of a source relation; resolution, confidence, and provenance remain independent while privacy stays metadata-only.
 */
export interface RenderProjectSourceUsabilityRef {
  /** @lang zh-CN 上游 relation artifact 中的稳定 relation ID。 @lang en Stable relation ID from the upstream relation artifact. */
  relationId: string;
  /** @lang zh-CN 引用是否已解析；与 confidence、provenance 独立。 @lang en Whether the reference resolved; independent from confidence and provenance. */
  resolution: string;
  /** @lang zh-CN relation 可信度；不替代 resolution。 @lang en Relation confidence; it does not replace resolution. */
  confidence: string;
  /** @lang zh-CN 产生 relation 的 producer、activity 与 contract identity。 @lang en Producer, activity, and contract identity that created the relation. */
  provenance: {
    producer: string;
    activity: string;
    contract: string;
    contractVersion: string;
  };
  /** @lang zh-CN projectPath 驱动时存在的稳定项目身份。 @lang en Stable project identity present when projectPath drove extraction. */
  projectIdentity?: RenderProjectSourceProjectIdentityRef;
  /** @lang zh-CN Portal 投影的固定 metadata-only privacy boundary。 @lang en Fixed metadata-only privacy boundary of the Portal projection. */
  privacy: {
    sourcesContentPolicy: "none";
    sourcePreviewPolicy: "none";
    embedsSourcesContent: false;
  };
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
    /** @lang zh-CN `project-index.json` 内业务流程双投影的 body-free 引用。 @lang en Body-free reference to the business-flow dual projection in `project-index.json`. */
    businessFlowDocumentationProjection?: RenderProjectBusinessFlowDocumentationProjectionRef;
    relationGraph?: RenderProjectRelationGraphRef;
    informationArchitecture?: DocumentationPortalInformationArchitectureContract;
    /** @lang zh-CN 当前静态资源采用的 metadata-only theme reference。 @lang en Metadata-only theme reference used by the current static assets. */
    theme?: DocumentationPortalThemeReference;
    /** @lang zh-CN neutral presentation profile 的最小引用。 @lang en Minimal reference to the neutral presentation profile. */
    presentationProfile?: RenderProjectPresentationProfileRef;
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

/** @lang zh-CN manifest/index 指向 neutral presentation profile 的 body-free 引用。 @lang en Body-free manifest/index reference to the neutral presentation profile. */
export interface RenderProjectPresentationProfileRef {
  contract: string;
  contractVersion: string;
  path: typeof PORTAL_PRESENTATION_PROFILE_PATH;
  profileId: string;
  status: "ready" | "refused";
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
 * @lang zh-CN
 * renderer manifest 对 public business-flow projection 的 body-free 引用与可审计计数；完整 payload 只存在于 project index。
 *
 * @lang en
 * Body-free renderer-manifest reference and auditable counts for a public business-flow projection; the full payload exists only in the project index.
 */
export interface RenderProjectBusinessFlowDocumentationProjectionRef {
  contract: "business-flow-documentation-projection";
  contractVersion: "0.1.0-draft";
  flowCount: number;
  humanItemCount: number;
  nodeCount: number;
  path: "project-index.json";
  relationCount: number;
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
  ownerAdoption?: RenderProjectOwnerAdoptionSummary;
  /** @lang zh-CN exact-valid public human/AI 双投影；可见表示等待独立设计基线。 @lang en Exact-valid public human/AI dual projection whose visible representation awaits an independent design baseline. */
  businessFlowDocumentationProjection?: BusinessFlowDocumentationProjection;
  relationGraph?: RenderProjectRelationGraph;
  site?: {
    layout: RenderProjectSiteLayout;
    navigationRootPath?: string;
    searchIndexPath?: string;
    relationIndexPath?: string;
    sourcePresentation: RenderProjectSourcePresentation;
    presentationProfile: RenderProjectPresentationProfileRef;
    informationArchitecture?: DocumentationPortalInformationArchitectureContract;
    /** @lang zh-CN Portal consumer 的 exact theme identity 与 system preference policy。 @lang en Exact theme identity and system-preference policy for portal consumers. */
    theme: DocumentationPortalThemeReference;
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
  /** @lang zh-CN canonical navigation entry 上的 metadata-only source usability。 @lang en Metadata-only source usability on the canonical navigation entry. */
  sourceUsability?: RenderProjectSourceUsabilityRef;
  /** @lang zh-CN 不含正文的 source-comment allowlist 摘要。 @lang en Body-free allowlisted source-comment summary. */
  sourceCommentProjection?: RenderProjectSourceCommentProjectionSummary;
  symbolId?: string;
  hierarchy?: RenderProjectEntryHierarchyRef;
  contentPath?: string;
  /** 实际 router fetch 位置；省略时与 canonical contentPath 相同。Actual router fetch location; omission means the canonical contentPath. */
  presentationPath?: string;
  /** stable member/entry anchor。稳定 member/entry anchor。 */
  memberAnchor?: string;
  /** @lang zh-CN 不依赖 JavaScript 的独立多页阅读路径。 @lang en Standalone multi-page reading path that does not require JavaScript. */
  noScriptPagePath?: string;
  /** @lang zh-CN neutral presentation profile 中的 topic identity。 @lang en Topic identity in the neutral presentation profile. */
  presentationTopicId?: string;
  /** @lang zh-CN neutral presentation profile 中的 page identity。 @lang en Page identity in the neutral presentation profile. */
  presentationPageId?: string;
  /** @lang zh-CN neutral presentation profile 中的 fragment identity。 @lang en Fragment identity in the neutral presentation profile. */
  presentationFragmentId?: string;
  semanticPath?: DocumentationPortalSemanticPathSegment[];
  docSourceMap?: RenderProjectEntryDocSourceMapRef;
}

/**
 * @lang zh-CN
 * navigation/search consumer 可用的 metadata-only 摘要；不包含 projected text、source body 或 raw comment。
 *
 * @lang en
 * Metadata-only summary for navigation consumers; it includes no projected text, source body, or raw comment.
 */
export interface RenderProjectSourceCommentProjectionSummary {
  contract: string;
  contractVersion: string;
  defaultLocale: string;
  entryCount: number;
  projectionId: string;
  requestedLocale: string;
  resolvedCount: number;
  status: "ready" | "refused";
  privacy: {
    projectedCommentTextIncluded: false;
    rawCommentIncluded: false;
    sourceBodyIncluded: false;
    sourcesContentPolicy: "none";
  };
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

/**
 * @lang zh-CN
 * 把统一项目输入渲染为默认 split-site 或显式 single-page，并生成 exact presentation profile、内容寻址源码资源和 manifest linkage。
 *
 * @lang en
 * Renders unified project input as the default split site or explicit single page, including an exact presentation profile, content-addressed source assets, and manifest linkage.
 *
 * @param projectInput - 已结构化的项目、entry 与关系输入；renderer 不自行读取路径。Structured project, entry, and relation input; the renderer performs no path read.
 * @param options - locale、IA、源码模式和 Portal theme 选择。Locale, IA, source-mode, and Portal-theme selections.
 * @returns 完整的内存文件集、diagnostics 与 body-free manifest。Complete in-memory file set, diagnostics, and body-free manifest.
 * @throws 当显式 IA/theme/source-comment 选择或 renderer 生成的 exact profile 非法时 fail closed。Fails closed when explicit IA/theme/source-comment selections or the renderer-generated exact profile are invalid.
 */
export function renderProjectHtmlDocument(projectInput: RenderProjectHtmlInput, options: RenderHtmlOptions = {}): RenderHtmlResult {
  // <lang><zh-CN>关系图先规范化，确保 presentation identity 使用最终 relation facts，而不是调用者数组顺序。</zh-CN><en>Normalize the relation graph first so presentation identity uses final relation facts rather than caller array order.</en></lang>
  const normalizedProjectInput = normalizeProjectRelationGraphInput(projectInput);
  const pageTitle = options.title ?? normalizedProjectInput.project.title ?? normalizedProjectInput.project.name;
  const includeThemeAssets = options.includeThemeAssets ?? true;
  const siteLayout = options.projectSite?.layout ?? "split-site";
  const portalContext = resolveProjectPortalContext(normalizedProjectInput, options, siteLayout);
  // <lang><zh-CN>bundle 是 profile、source asset 和 owner mapping 的唯一生成点；后续 HTML 只消费 body-free mapping。</zh-CN><en>The bundle is the sole generation point for profiles, source assets, and owner mappings; later HTML consumes only body-free mappings.</en></lang>
  const presentationBundle = createPortalPresentationBundle({
    projectId: normalizedProjectInput.project.id ?? `project:${normalizedProjectInput.project.name}`,
    layout: siteLayout,
    sourceMode: options.projectSite?.source?.presentation ?? "fetch",
    maxLines: options.projectSite?.source?.maxLines ?? 400,
    skinId: portalContext.theme.skinId,
    scheme: portalContext.theme.scheme,
    topics: normalizedProjectInput.entries.map((entry) => ({
      entryId: entry.id,
      topicKind: entry.kind,
      relationIds: collectProjectPresentationRelationIds(entry, normalizedProjectInput.relationGraph)
    })),
    sources: normalizedProjectInput.entries
      .filter((entry) => Boolean(entry.source))
      .map((entry) => ({
        entryId: entry.id,
        sourcePath: entry.source!.path,
        ...(entry.source!.preview?.content !== undefined ? { content: entry.source!.preview!.content } : {}),
        ...(entry.source!.range?.start.line ? { startLine: entry.source!.range!.start.line } : {}),
        ...(entry.source!.range?.end?.line ? { endLine: entry.source!.range!.end!.line } : {}),
        ...(entry.docSourceMap?.entryId ? { sourceMapId: entry.docSourceMap.entryId } : {})
      }))
  });
  const sourcePreparedProjectInput = applyProjectSourcePresentationPolicy(normalizedProjectInput, options, presentationBundle);
  const renderedProjectInput: RenderProjectHtmlInput = {
    ...sourcePreparedProjectInput,
    diagnostics: [...(sourcePreparedProjectInput.diagnostics ?? []), ...presentationBundle.diagnostics]
  };
  const navigationIndex = createProjectNavigationIndex(renderedProjectInput, pageTitle, options, portalContext, presentationBundle);
  const files: RenderedHtmlFile[] = siteLayout === "single-page"
    ? [
        {
          path: "index.html",
          contents: renderProjectIndexHtml(pageTitle, renderedProjectInput, options, portalContext),
          contentType: "text/html; charset=utf-8",
          role: "entry"
        }
      ]
    : createProjectSplitSiteFiles(pageTitle, renderedProjectInput, navigationIndex, options, portalContext);
  files.push({
    path: "project-index.json",
    contents: `${JSON.stringify(navigationIndex, null, 2)}\n`,
    contentType: "application/json; charset=utf-8",
    role: "index"
  });
  // <lang><zh-CN>profile/source artifacts 在 navigation index 后追加；manifest 仍记录完整确定性文件清单。</zh-CN><en>Append profile/source artifacts after the navigation index while the manifest still records the full deterministic file inventory.</en></lang>
  files.push(...presentationBundle.artifacts);

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
    diagnostics: renderedProjectInput.diagnostics ?? [],
    manifest: createProjectManifest(renderedProjectInput, files, pageTitle, options, navigationIndex, presentationBundle)
  };
}

/** @lang zh-CN 当前 render 调用的 IA、locale、labels 与 theme resolved context。 @lang en Resolved IA, locale, labels, and theme context for one render call. */
interface RenderProjectPortalContext {
  informationArchitecture?: DocumentationPortalInformationArchitectureContract;
  labels: DocumentationPortalLabels;
  sourceCommentProjection?: Required<RenderProjectSourceCommentProjectionOptions>;
  theme: Required<RenderProjectThemeOptions>;
  uiLocale: DocumentationPortalUiLocale;
}

/**
 * @lang zh-CN 在任何文件生成前解析 theme/locale 并完成 exact IA、source-comment 与 single-page gate，避免 partial output。
 * @lang en Resolves theme/locale and enforces exact IA, source-comment, and single-page gates before file generation, preventing partial output.
 *
 * @param projectInput - 待验证的结构化 project input。Structured project input to validate.
 * @param options - renderer 调用选项。Renderer invocation options.
 * @param layout - 已解析的页面布局。Resolved page layout.
 * @returns 只含已验证选择的 context。Context containing validated selections only.
 * @throws 对任何不受支持的显式选择 fail closed。Fails closed for every unsupported explicit selection.
 */
function resolveProjectPortalContext(
  projectInput: RenderProjectHtmlInput,
  options: RenderHtmlOptions,
  layout: RenderProjectSiteLayout
): RenderProjectPortalContext {
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const uiLocale = resolveDocumentationPortalUiLocale(options.projectSite?.uiLocale, localeModel.selectedLocale);
  const explicitInformationArchitecture = options.projectSite?.informationArchitecture;
  const sourceCommentProjection = options.projectSite?.sourceCommentProjection;
  const requestedSkin = options.projectSite?.theme?.skinId ?? "portal.classic";
  const requestedScheme = options.projectSite?.theme?.scheme ?? "system";

  if (!PORTAL_THEME_SKIN_IDS.includes(requestedSkin) || !PORTAL_THEME_SCHEMES.includes(requestedScheme)) {
    throw new TypeError("HIA_PORTAL_THEME_SELECTION_INVALID: Portal skin and scheme must use the built-in closed catalog.");
  }

  if (projectInput.documentationContinuity) {
    assertProjectDocumentationContinuitySummary(projectInput.documentationContinuity);
  }

  if (projectInput.ownerAdoption) {
    assertProjectOwnerAdoptionSummary(projectInput.ownerAdoption);
    if (!explicitInformationArchitecture) {
      throw new TypeError(
        "HIA_PORTAL_IA_OWNER_ADOPTION_REQUIRES_IA: owner-adoption linkage requires explicit Portal information architecture."
      );
    }
  }

  if (projectInput.businessFlowDocumentationProjection) {
    // <lang><zh-CN>在生成任何文件前复用 W-P122 owner validator；renderer 不修复、补全或推断 flow facts。</zh-CN><en>Reuse the W-P122 owner validator before generating any file; the renderer repairs, completes, or infers no flow facts.</en></lang>
    if (validateBusinessFlowDocumentationProjection(projectInput.businessFlowDocumentationProjection).length > 0) {
      throw new TypeError(
        "HIA_PORTAL_IA_BUSINESS_FLOW_INVALID: business-flow linkage must be an exact public projection."
      );
    }
    if (!explicitInformationArchitecture) {
      throw new TypeError(
        "HIA_PORTAL_IA_BUSINESS_FLOW_REQUIRES_IA: business-flow linkage requires explicit Portal information architecture."
      );
    }
  }

  if (sourceCommentProjection && !explicitInformationArchitecture) {
    throw new TypeError(
      "HIA_PORTAL_SOURCE_COMMENT_REQUIRES_IA: source-comment projection requires explicit Portal information architecture."
    );
  }

  if (sourceCommentProjection) {
    const canonical = canonicalizeDocumentationLocale(sourceCommentProjection.locale);
    if (!canonical || canonical.usedLegacyUnderscore || canonical.canonical !== sourceCommentProjection.locale) {
      throw new TypeError(
        "HIA_PORTAL_SOURCE_COMMENT_LOCALE_INVALID: source-comment locale must be a canonical BCP 47 tag."
      );
    }
    for (const entry of projectInput.entries) {
      if (!entry.sourceCommentProjection) continue;
      const validationDiagnostics = validateDocumentationSourceCommentProjection(entry.sourceCommentProjection);
      if (validationDiagnostics.length > 0 || entry.sourceCommentProjection.requestedLocale !== canonical.canonical) {
        throw new TypeError(
          "HIA_PORTAL_SOURCE_COMMENT_PROJECTION_INVALID: source-comment projection must be valid and match the explicit locale."
        );
      }
    }
  }

  if (explicitInformationArchitecture && layout === "single-page") {
    throw new TypeError(
      "HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED: Explicit Portal IA is supported only with split-site in this draft."
    );
  }

  return {
    uiLocale,
    labels: getDocumentationPortalLabels(uiLocale),
    theme: { skinId: requestedSkin, scheme: requestedScheme },
    ...(sourceCommentProjection
      ? {
          sourceCommentProjection: {
            contentPolicy: sourceCommentProjection.contentPolicy ?? "none",
            locale: sourceCommentProjection.locale
          }
        }
      : {}),
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

/**
 * @lang zh-CN owner-adoption linkage 只接受 exact、count-consistent、identity/body-free 的 metadata 投影。
 * @lang en Owner-adoption linkage accepts only an exact, count-consistent, identity- and body-free metadata projection.
 */
function assertProjectOwnerAdoptionSummary(summary: RenderProjectOwnerAdoptionSummary): void {
  const rootFields = ["contract", "contractVersion", "projection", "status", "targetFamily", "ownerInput", "contracts", "semantics"];
  const workspaceExpected = summary.targetFamily === "workspace-container";
  const hasWorkspace = summary.workspaceHandoff !== undefined;
  const validShape = isExactObject(summary, hasWorkspace ? [...rootFields, "workspaceHandoff"] : rootFields)
    && isExactObject(summary.ownerInput, ["submitted", "consent"])
    && isExactObject(summary.contracts, ["requiredCount", "providedCount", "missingCount"])
    && isExactObject(summary.semantics, ["resolution", "confidence", "provenance"])
    && (!hasWorkspace || (summary.workspaceHandoff !== undefined
      && isExactObject(summary.workspaceHandoff, ["repositoryOwnerCount", "handoffEdgeCount", "state"])));
  const counts = validShape
    ? [summary.contracts.requiredCount, summary.contracts.providedCount, summary.contracts.missingCount]
    : [];
  const statusResolutionValid = (summary.status === "ready-for-owner-review"
    && summary.ownerInput.submitted
    && summary.contracts.missingCount === 0
    && summary.semantics.resolution === "owner-input-validated")
    || (summary.status === "deferred-owner-input-missing"
      && !summary.ownerInput.submitted
      && summary.semantics.resolution === "owner-input-not-received")
    || (summary.status === "refused" && summary.semantics.resolution === "unresolved");
  const workspaceValid = workspaceExpected
    ? (summary.status !== "ready-for-owner-review" && !hasWorkspace) || (summary.workspaceHandoff !== undefined
      && Number.isSafeInteger(summary.workspaceHandoff.repositoryOwnerCount)
      && summary.workspaceHandoff.repositoryOwnerCount >= 2
      && Number.isSafeInteger(summary.workspaceHandoff.handoffEdgeCount)
      && summary.workspaceHandoff.handoffEdgeCount >= 1
      && summary.workspaceHandoff.state === "owner-review-required")
    : !hasWorkspace;
  if (!validShape
    || summary.contract !== "target-owner-adoption-kit"
    || summary.contractVersion !== "0.1.0-draft"
    || summary.projection !== "portal-metadata-only"
    || !["ready-for-owner-review", "deferred-owner-input-missing", "refused"].includes(summary.status)
    || !["enterprise-business", "workspace-container"].includes(summary.targetFamily)
    || typeof summary.ownerInput.submitted !== "boolean"
    || !["not-recorded", "recorded-for-review"].includes(summary.ownerInput.consent)
    || counts.some((value) => !Number.isSafeInteger(value) || value < 0)
    || summary.contracts.providedCount + summary.contracts.missingCount !== summary.contracts.requiredCount
    || summary.semantics.confidence !== "caller-provided-unverified"
    || summary.semantics.provenance !== "metadata-only-owner-kit"
    || !statusResolutionValid
    || !workspaceValid) {
    throw new TypeError(
      "HIA_PORTAL_IA_OWNER_ADOPTION_INVALID: owner-adoption linkage must be an exact metadata-only summary."
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
 * @lang zh-CN 在 renderer 公共入口执行源码呈现边界，剥离旧外链并只投影 bundle 已授权的正文或同源资源。
 * @lang en Enforces source-presentation boundaries at the renderer API, stripping legacy external links and projecting only bundle-authorized bodies or same-origin assets.
 *
 * @param projectInput - 规范化后的 project input。Normalized project input.
 * @param options - 显式 source presentation 选择。Explicit source-presentation selection.
 * @param presentationBundle - 已 exact-valid 的 body-free owner mapping。Exact-valid body-free owner mapping.
 * @returns 不改变 locator identity 的安全 project input。Safe project input preserving locator identity.
 */
function applyProjectSourcePresentationPolicy(
  projectInput: RenderProjectHtmlInput,
  options: RenderHtmlOptions,
  presentationBundle: PortalPresentationBundle
): RenderProjectHtmlInput {
  const presentation = options.projectSite?.source?.presentation ?? "fetch";
  return {
    ...projectInput,
    entries: projectInput.entries.map((entry) => {
      if (!entry.source) {
        return entry;
      }
      const { preview, fetchUrl: _legacyFetchUrl, linkUrl: _legacyLinkUrl, publicAsset: _existingPublicAsset, ...locator } = entry.source;
      const previewDefaultExpanded = options.projectSite?.source?.defaultExpanded ?? preview?.defaultExpanded;
      const publicAsset = presentationBundle.sourceByEntryId.get(entry.id);
      const source: RenderProjectSourceRef = {
        ...locator,
        ...(presentation === "link" && publicAsset ? { linkUrl: publicAsset.relativeUrl, publicAsset } : {}),
        ...(presentation === "embed" && preview ? {
          preview: {
            ...preview,
            ...(previewDefaultExpanded !== undefined ? { defaultExpanded: previewDefaultExpanded } : {})
          }
        } : {}),
        ...(presentation === "fetch" && publicAsset ? {
          fetchUrl: publicAsset.relativeUrl,
          publicAsset,
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

/**
 * @lang zh-CN 为独立 no-script 页面移除 fetch runtime metadata，并把 build-generated link 调整为页面相对路径。
 * @lang en Removes fetch-runtime metadata for standalone no-script pages and adjusts build-generated links to page-relative paths.
 *
 * @param projectInput - 已应用 source policy 的 project input。Project input after source policy application.
 * @returns 不含不可用 fetch control 的 page input。Page input without unavailable fetch controls.
 */
function createProjectNoScriptProjectInput(projectInput: RenderProjectHtmlInput): RenderProjectHtmlInput {
  return {
    ...projectInput,
    entries: projectInput.entries.map((entry) => {
      if (!entry.source) {
        return entry;
      }
      const { fetchUrl, publicAsset: _publicAsset, linkUrl, ...source } = entry.source;
      // <lang><zh-CN>无脚本页面把同源 fetch asset 降级成普通链接；这不会恢复被拒绝的外部 locator。</zh-CN><en>The no-script page degrades a same-origin fetch asset to a regular link without restoring a rejected external locator.</en></lang>
      const noScriptLinkUrl = linkUrl ?? fetchUrl;
      return {
        ...entry,
        source: {
          ...source,
          ...(noScriptLinkUrl ? { linkUrl: `../${noScriptLinkUrl}` } : {})
        }
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

/** @lang zh-CN 从已验证 bundle 构造 manifest/index 共用的最小 profile 引用。 @lang en Builds the minimal manifest/index profile reference from a validated bundle. */
function createProjectPresentationProfileRef(
  presentationBundle: PortalPresentationBundle
): RenderProjectPresentationProfileRef {
  return {
    contract: presentationBundle.profile.contract,
    contractVersion: presentationBundle.profile.contractVersion,
    path: PORTAL_PRESENTATION_PROFILE_PATH,
    profileId: presentationBundle.profile.profileId,
    status: presentationBundle.profile.status
  };
}

/**
 * @lang zh-CN 从已验证 W-P122 projection 构造 manifest 的 body-free ref/count。
 * @lang en Builds a body-free manifest reference and counts from a validated W-P122 projection.
 * @param projection exact-valid public dual projection。 / Exact-valid public dual projection.
 * @returns 不含 label、node、edge 或 evidence body 的引用。 / Reference containing no labels, nodes, edges, or evidence bodies.
 */
function createProjectBusinessFlowProjectionRef(
  projection: BusinessFlowDocumentationProjection
): RenderProjectBusinessFlowDocumentationProjectionRef {
  return {
    contract: projection.contract,
    contractVersion: projection.contractVersion,
    flowCount: projection.sharedFacts.flows.length,
    humanItemCount: projection.humanLinear.flows.reduce((total, flow) => total + flow.items.length, 0),
    nodeCount: projection.sharedFacts.nodes.length,
    path: "project-index.json",
    relationCount: projection.sharedFacts.relations.length
  };
}

/**
 * @lang zh-CN 收集与 entry 关联的稳定 relation ids；relation kind 不参与 containment。
 * @lang en Collects stable relation ids associated with an entry; relation kind does not become containment.
 */
function collectProjectPresentationRelationIds(
  entry: RenderProjectEntry,
  relationGraph: RenderProjectRelationGraph | undefined
): string[] {
  const entryNodeIds = new Set(
    relationGraph?.nodes.filter((node) => node.entryId === entry.id).map(({ id }) => id) ?? []
  );
  return (relationGraph?.relations ?? [])
    .filter((relation) => relation.entryId === entry.id || entryNodeIds.has(relation.from) || entryNodeIds.has(relation.to))
    .map(({ id }) => id)
    .sort(compareStableText);
}

/** @lang zh-CN 构造含 profile linkage 的 body-free renderer manifest。 @lang en Builds a body-free renderer manifest with presentation-profile linkage. */
function createProjectManifest(
  projectInput: RenderProjectHtmlInput,
  files: RenderedHtmlFile[],
  pageTitle: string,
  options: RenderHtmlOptions,
  navigationIndex: RenderProjectNavigationIndex,
  presentationBundle: PortalPresentationBundle
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
      theme: getDefaultDocumentationPortalThemeReference(),
      presentationProfile: createProjectPresentationProfileRef(presentationBundle),
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
      ...(projectInput.businessFlowDocumentationProjection
        ? {
            businessFlowDocumentationProjection: createProjectBusinessFlowProjectionRef(
              projectInput.businessFlowDocumentationProjection
            )
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

/** @lang zh-CN 构造 owner route index，并附加 neutral topic/page/fragment identity 和 profile 引用。 @lang en Builds the owner route index with neutral topic/page/fragment identities and a profile reference. */
function createProjectNavigationIndex(
  projectInput: RenderProjectHtmlInput,
  pageTitle: string,
  options: RenderHtmlOptions,
  portalContext: RenderProjectPortalContext,
  presentationBundle: PortalPresentationBundle
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
        ...(entry.sourceUsability ? { sourceUsability: selectProjectSourceUsability(entry.sourceUsability) } : {}),
        ...(entry.sourceCommentProjection && portalContext.sourceCommentProjection
          ? { sourceCommentProjection: selectProjectSourceCommentProjection(entry.sourceCommentProjection) }
          : {}),
        ...(entry.symbolId ? { symbolId: entry.symbolId } : {}),
        ...(entry.hierarchy ? { hierarchy: entry.hierarchy } : {}),
        contentPath: createProjectEntryContentPath(entry.id),
        ...(options.projectSite?.layout === "single-page" ? {} : { noScriptPagePath: createProjectNoScriptPagePath(entry.id) }),
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
        ...(entry.docSourceMap ? { docSourceMap: entry.docSourceMap } : {}),
        ...(presentationBundle.topicByEntryId.get(entry.id)
          ? {
              presentationTopicId: presentationBundle.topicByEntryId.get(entry.id)!.topicId,
              presentationPageId: presentationBundle.topicByEntryId.get(entry.id)!.pageId,
              presentationFragmentId: presentationBundle.topicByEntryId.get(entry.id)!.fragmentId
            }
          : {})
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
    ...(projectInput.ownerAdoption ? { ownerAdoption: projectInput.ownerAdoption } : {}),
    ...(projectInput.businessFlowDocumentationProjection
      ? { businessFlowDocumentationProjection: projectInput.businessFlowDocumentationProjection }
      : {}),
    site: {
      layout: options.projectSite?.layout ?? "split-site",
      theme: getDefaultDocumentationPortalThemeReference(),
      presentationProfile: createProjectPresentationProfileRef(presentationBundle),
      ...(options.projectSite?.layout === "single-page" ? {} : {
        navigationRootPath: "navigation/root.json",
        searchIndexPath: "search/index.json",
        relationIndexPath: "relations/project.json"
      }),
      sourcePresentation: options.projectSite?.source?.presentation ?? "fetch",
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
 * @lang zh-CN 生成大型项目默认使用的 split-site 文件集合；入口页只保留应用壳，entry/source 正文保持分离。
 * @lang en Generates the default split-site file set for large projects; the entry page retains only the shell while entry/source bodies remain separate.
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
          noScriptPagePath: createProjectNoScriptPagePath(entry.id),
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

  // <lang><zh-CN>no-script 入口与逐 topic 页面保持独立，不把数千节点重新塞回应用壳。</zh-CN><en>The no-script index and per-topic pages stay separate so thousands of nodes are not embedded back into the application shell.</en></lang>
  const noScriptProjectInput = createProjectNoScriptProjectInput(projectInput);
  // <lang><zh-CN>按稳定 entry id 建立单次索引，避免大型项目为每页线性扫描全部节点。</zh-CN><en>Build a one-time stable-entry index so large projects do not scan every node for every page.</en></lang>
  const noScriptEntryById = new Map(noScriptProjectInput.entries.map((entry) => [entry.id, entry]));
  files.push({
    path: "pages/index.html",
    contents: renderProjectNoScriptIndexHtml(pageTitle, noScriptProjectInput, localeModel.selectedLocale, portalContext),
    contentType: "text/html; charset=utf-8",
    role: "entry"
  });

  // <lang zh-CN>canonical entry fragment 始终生成，保证旧 deep link 与不识别 IA 的 consumer 可回退。</lang>
  // <lang en>Canonical entry fragments are always emitted so old deep links and IA-unaware consumers retain a fallback.</lang>
  for (const entry of projectInput.entries) {
    // <lang><zh-CN>索引与原输入由同一次确定性映射产生，因此对应 no-script entry 必须存在。</zh-CN><en>The index and original input come from the same deterministic mapping, so the matching no-script entry must exist.</en></lang>
    const noScriptEntry = noScriptEntryById.get(entry.id);
    if (!noScriptEntry) {
      throw new Error(`HIA_RENDERER_NO_SCRIPT_ENTRY_MISSING: ${entry.id}`);
    }
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
    files.push({
      path: createProjectNoScriptPagePath(entry.id),
      contents: renderProjectNoScriptEntryHtml(
        pageTitle,
        noScriptEntry,
        noScriptProjectInput,
        localeModel,
        portalContext
      ),
      contentType: "text/html; charset=utf-8",
      role: "entry"
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

/** @lang zh-CN 为每个 neutral topic 生成稳定的 no-script owner page route。 @lang en Generates a stable no-script owner page route for every neutral topic. */
function createProjectNoScriptPagePath(entryId: string): string {
  return `pages/${stableProjectArtifactName(entryId)}.html`;
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

function compareProjectNavigationEntries(left: Pick<RenderProjectEntry, "id">, right: Pick<RenderProjectEntry, "id">): number {
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

/**
 * @lang zh-CN 生成无脚本也可读取的 theme root metadata；字段只来自内置 exact reference。
 * @lang en Renders theme-root metadata readable without scripts; every field comes from the built-in exact reference.
 *
 * @param themeSelection - 可选的 Portal-owned build-time 默认 skin/scheme。Optional Portal-owned build-time default skin/scheme.
 * @returns 适用于 `<html>` opening tag 的 escaped attributes。Escaped attributes for an opening `<html>` tag.
 */
function renderDefaultThemeRootAttributes(themeSelection?: Required<RenderProjectThemeOptions>): string {
  // <lang><zh-CN>每次取得新 reference，避免 renderer 修改 theme owner 的共享对象。</zh-CN><en>Obtain a fresh reference each time so the renderer cannot mutate the theme owner's shared object.</en></lang>
  const theme = getDefaultDocumentationPortalThemeReference();

  return [
    `data-hia-theme="${escapeHtml(theme.name)}"`,
    `data-hia-theme-contract="${escapeHtml(theme.contract)}"`,
    `data-hia-theme-contract-version="${escapeHtml(theme.contractVersion)}"`,
    `data-hia-theme-color-scheme-policy="${escapeHtml(theme.colorSchemePolicy)}"`,
    `data-hia-theme-disclosure="${escapeHtml(theme.disclosure)}"`,
    ...(themeSelection
      ? [
          `data-hia-skin="${escapeHtml(themeSelection.skinId)}"`,
          `data-hia-scheme="${escapeHtml(themeSelection.scheme)}"`
        ]
      : [])
  ].join(" ");
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
    `<html lang="${escapeHtml(selectedLocale)}" ${renderDefaultThemeRootAttributes()}>`,
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

/** @lang zh-CN 渲染带 no-script theme 默认和可见选择器的 split-site 应用壳。 @lang en Renders the split-site shell with a no-script theme default and visible selectors. */
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
    `<html lang="${escapeHtml(localeModel.selectedLocale)}" ${renderDefaultThemeRootAttributes(portalContext.theme)}>`,
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
    renderProjectThemeControl(portalContext.theme),
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
    `<main class="hia-main hia-project-main" data-hia-project-content><p class="hia-project-empty">${escapeHtml(labels.select)}</p><noscript><p class="hia-noscript-notice"><a href="pages/index.html">No-script page index / 无脚本页面索引</a></p></noscript></main>`,
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
 * @lang zh-CN 渲染独立 no-script 多页索引；它不内嵌 topic 正文，也不依赖 dynamic navigation shard。
 * @lang en Renders the standalone no-script multi-page index without embedding topic bodies or depending on dynamic navigation shards.
 */
function renderProjectNoScriptIndexHtml(
  pageTitle: string,
  projectInput: RenderProjectHtmlInput,
  selectedLocale: string,
  portalContext: RenderProjectPortalContext
): string {
  const projectName = projectInput.project.title ?? projectInput.project.name;
  const links = [...projectInput.entries].sort(compareProjectNavigationEntries).map((entry) => {
    // <lang><zh-CN>page path 是由固定 `pages/` 前缀与 opaque basename 组成，不需要平台路径 API。</zh-CN><en>The page path consists of the fixed `pages/` prefix and an opaque basename, so no platform path API is needed.</en></lang>
    const relativePage = `./${createProjectNoScriptPagePath(entry.id).slice("pages/".length)}`;
    return `<li><a href="${escapeHtml(relativePage)}">${escapeHtml(entry.name)}</a> <small>${escapeHtml(entry.kind)} / ${escapeHtml(formatProjectViewLabel(entry.view))}</small></li>`;
  }).join("");
  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(selectedLocale)}" ${renderDefaultThemeRootAttributes(portalContext.theme)}>`,
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)} - No-script index</title>`,
    "<link rel=\"icon\" href=\"data:,\"><link rel=\"stylesheet\" href=\"../assets/hia-default.css\"></head>",
    "<body><div class=\"hia-shell hia-project-shell\"><aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectName)}</h1><p><a href="../index.html">Interactive site / 交互站点</a></p>`,
    `<p>${escapeHtml(getPortalThemeSkinLabel(portalContext.theme.skinId))} · ${escapeHtml(getPortalThemeSchemeLabel(portalContext.theme.scheme))}</p>`,
    "</aside><main class=\"hia-main hia-project-main\"><h2>Documentation pages / 文档页面</h2>",
    `<nav aria-label="Documentation pages"><ul>${links}</ul></nav>`,
    "</main></div></body></html>"
  ].join("");
}

/**
 * @lang zh-CN 渲染一个可直接打开、无脚本仍可使用 native disclosure 阅读的 topic 页面。
 * @lang en Renders a directly addressable topic page readable through native disclosure without JavaScript.
 */
function renderProjectNoScriptEntryHtml(
  pageTitle: string,
  entry: RenderProjectEntry,
  projectInput: RenderProjectHtmlInput,
  localeModel: ReturnType<typeof resolveProjectLocaleModel>,
  portalContext: RenderProjectPortalContext
): string {
  const informationArchitecture = portalContext.informationArchitecture;
  const article = informationArchitecture
    ? renderProjectSemanticTopic(
        entry,
        projectInput,
        localeModel.locales,
        localeModel.selectedLocale,
        portalContext,
        informationArchitecture.memberPlacement === "with-parent"
      )
    : renderProjectEntry(entry, localeModel.locales, localeModel.selectedLocale);
  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(localeModel.selectedLocale)}" ${renderDefaultThemeRootAttributes(portalContext.theme)}>`,
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(entry.name)} - ${escapeHtml(pageTitle)}</title>`,
    "<link rel=\"icon\" href=\"data:,\"><link rel=\"stylesheet\" href=\"../assets/hia-default.css\"></head>",
    "<body><div class=\"hia-shell hia-project-shell\"><aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectInput.project.title ?? projectInput.project.name)}</h1>`,
    "<p><a href=\"./index.html\">Page index / 页面索引</a></p><p><a href=\"../index.html\">Interactive site / 交互站点</a></p>",
    `<p>${escapeHtml(getPortalThemeSkinLabel(portalContext.theme.skinId))} · ${escapeHtml(getPortalThemeSchemeLabel(portalContext.theme.scheme))}</p>`,
    "</aside><main class=\"hia-main hia-project-main\">",
    article,
    "</main></div></body></html>"
  ].join("");
}

/**
 * @lang zh-CN 生成 split-site 与 single-page 共用的受限 fetch reader；默认展开时加载，也保留显式 manual 模式。
 * @lang en Generates the constrained fetch reader shared by split-site and single-page output, loading on expansion by default while retaining explicit manual mode.
 *
 * @param rootExpression - reader 扫描 `document` 或异步载入的 `contentHost`。Reader scan root: `document` or the asynchronously loaded `contentHost`.
 * @returns 可直接嵌入 owner script 的确定性 JavaScript 行。Deterministic JavaScript lines embeddable in the owner script.
 */
function renderProjectSourceFetchClientLines(rootExpression: "contentHost" | "document"): string[] {
  return [
    "  const sourceControllers = new WeakMap();",
    "  const sourceTerminalStates = new Set(['ready', 'empty', 'denied', 'not-found', 'integrity-error', 'network-error', 'aborted']);",
    "  function setSourceState(details, state, message = '') {",
    "    const loadButton = details.querySelector('[data-hia-source-fetch-button]');",
    "    const resetButton = details.querySelector('[data-hia-source-reset]');",
    "    const status = details.querySelector('[data-hia-source-fetch-status]');",
    "    details.dataset.hiaSourceState = state;",
    "    details.toggleAttribute('aria-busy', state === 'loading');",
    "    if (status) { status.hidden = state === 'idle'; status.textContent = message; }",
    "    if (loadButton) loadButton.hidden = state !== 'idle';",
    "    if (resetButton) {",
    "      resetButton.hidden = state === 'idle';",
    "      resetButton.textContent = state === 'loading' ? 'Cancel / 取消' : 'Reset / 重置';",
    "    }",
    "  }",
    "  function sourceFailureState(response) {",
    "    if (response.status === 401 || response.status === 403) return 'denied';",
    "    if (response.status === 404) return 'not-found';",
    "    return 'network-error';",
    "  }",
    "  function digestBase64(buffer) {",
    "    return btoa(String.fromCharCode(...new Uint8Array(buffer)));",
    "  }",
    "  async function loadSourceFetch(details) {",
    "    if ((details.dataset.hiaSourceState || 'idle') !== 'idle') return;",
    "    const code = details.querySelector('code');",
    "    const controller = new AbortController();",
    "    const timeoutMs = Math.max(100, Number(details.dataset.hiaSourceTimeout || 10000));",
    "    const timeout = setTimeout(() => controller.abort(), timeoutMs);",
    "    sourceControllers.set(details, controller);",
    "    setSourceState(details, 'loading', 'Loading source / 正在加载源码...');",
    "    try {",
    "      /* <lang><zh-CN>只允许文档站同源且无 userinfo 的 content-addressed endpoint。</zh-CN><en>Allow only a same-origin content-addressed endpoint without userinfo.</en></lang> */",
    "      const target = new URL(details.dataset.hiaSourceFetch || '', document.baseURI);",
    "      if (target.origin !== location.origin || target.username || target.password) {",
    "        setSourceState(details, 'denied', 'Source request denied / 源码请求被拒绝');",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>请求固定无凭据、同源且拒绝 redirect；signal 同时承担取消与超时。</zh-CN><en>The request is credential-free, same-origin, and redirect-denying; the signal covers cancellation and timeout.</en></lang> */",
    "      const response = await fetch(target, { cache: 'default', credentials: 'omit', mode: 'same-origin', redirect: 'error', signal: controller.signal });",
    "      if (!response.ok) {",
    "        const state = sourceFailureState(response);",
    "        setSourceState(details, state, `Source load failed / 源码加载失败: ${response.status} ${response.statusText}`);",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>先验证字节数与 SHA-384，再把公开 asset 解码为不可执行纯文本。</zh-CN><en>Verify byte length and SHA-384 before decoding the public asset as non-executable plain text.</en></lang> */",
    "      const bytes = await response.arrayBuffer();",
    "      const maxBytes = Math.max(1, Number(details.dataset.hiaSourceMaxBytes || 1048576));",
    "      const expectedBytes = Number(details.dataset.hiaSourceByteLength || 0);",
    "      if (bytes.byteLength > maxBytes || (expectedBytes >= 0 && bytes.byteLength !== expectedBytes)) {",
    "        setSourceState(details, 'integrity-error', 'Source size verification failed / 源码大小校验失败');",
    "        return;",
    "      }",
    "      const digest = await crypto.subtle.digest('SHA-384', bytes);",
    "      if (`sha384-${digestBase64(digest)}` !== details.dataset.hiaSourceIntegrity) {",
    "        setSourceState(details, 'integrity-error', 'Source integrity verification failed / 源码完整性校验失败');",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>非法 UTF-8 表示 asset 违反 text contract，归入 integrity-error。</zh-CN><en>Invalid UTF-8 violates the text-asset contract and maps to integrity-error.</en></lang> */",
    "      let text;",
    "      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }",
    "      catch { setSourceState(details, 'integrity-error', 'Source text decoding failed / 源码文本解码失败'); return; }",
    "      if (text.length === 0) {",
    "        if (code) code.textContent = '';",
    "        setSourceState(details, 'empty', 'Source asset is empty / 源码资源为空');",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>只投影配置允许的行数，绝不执行或加入搜索索引。</zh-CN><en>Project only the configured line limit, never executing or search-indexing the body.</en></lang> */",
    "      const lines = text.split(/\\r?\\n/u);",
    "      const maxLines = Math.max(1, Number(details.dataset.hiaSourceMaxLines || 400));",
    "      if (code) code.textContent = lines.slice(0, maxLines).join('\\n');",
    "      setSourceState(details, 'ready', 'Source ready / 源码已就绪');",
    "    } catch (error) {",
    "      const aborted = error?.name === 'AbortError';",
    "      setSourceState(details, aborted ? 'aborted' : 'network-error', aborted ? 'Source load aborted / 源码加载已取消' : `Source load failed / 源码加载失败: ${String(error?.message || error)}`);",
    "    } finally {",
    "      clearTimeout(timeout);",
    "      sourceControllers.delete(details);",
    "    }",
    "  }",
    "  /* <lang><zh-CN>终态必须显式 reset 回 idle；loading 状态的同一操作只负责取消。</zh-CN><en>Terminal states require an explicit reset to idle; the same action only cancels while loading.</en></lang> */",
    "  function resetSourceFetch(details) {",
    "    const state = details.dataset.hiaSourceState || 'idle';",
    "    if (state === 'loading') { sourceControllers.get(details)?.abort(); return; }",
    "    if (!sourceTerminalStates.has(state)) return;",
    "    const code = details.querySelector('code');",
    "    if (code) code.textContent = '';",
    "    setSourceState(details, 'idle');",
    "  }",
    `  function bindSourceFetch(root = ${rootExpression}) {`,
    "    for (const details of root?.querySelectorAll('details[data-hia-source-fetch]') || []) {",
    "      const button = details.querySelector('[data-hia-source-fetch-button]');",
    "      const resetButton = details.querySelector('[data-hia-source-reset]');",
    "      if (button) button.addEventListener('click', () => loadSourceFetch(details));",
    "      if (resetButton) resetButton.addEventListener('click', () => resetSourceFetch(details));",
    "      setSourceState(details, details.dataset.hiaSourceState || 'idle');",
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
  options: RenderHtmlOptions,
  portalContext: RenderProjectPortalContext
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
    `<html lang="${escapeHtml(localeModel.selectedLocale)}" ${renderDefaultThemeRootAttributes(portalContext.theme)}>`,
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
    renderProjectThemeControl(portalContext.theme),
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

/**
 * @lang zh-CN 渲染可见的 Portal-owned skin/scheme 选择器；无脚本默认由 `<html>` attributes 决定。
 * @lang en Renders visible Portal-owned skin/scheme selectors; `<html>` attributes own the no-script default.
 */
function renderProjectThemeControl(theme: Required<RenderProjectThemeOptions>): string {
  const skins = PORTAL_THEME_SKIN_IDS.map((skinId) => (
    `<option value="${escapeHtml(skinId)}"${skinId === theme.skinId ? " selected" : ""}>${escapeHtml(getPortalThemeSkinLabel(skinId))}</option>`
  )).join("");
  const schemes = PORTAL_THEME_SCHEMES.map((scheme) => (
    `<option value="${escapeHtml(scheme)}"${scheme === theme.scheme ? " selected" : ""}>${escapeHtml(getPortalThemeSchemeLabel(scheme))}</option>`
  )).join("");
  return [
    "<div class=\"hia-theme-switch\" data-hia-theme-control>",
    `<label>Skin / 皮肤<select data-hia-skin-control>${skins}</select></label>`,
    `<label>Scheme / 配色<select data-hia-scheme-control>${schemes}</select></label>`,
    "</div>"
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
  const sourceUsability = entry.sourceUsability ? renderProjectEntrySourceUsability(entry.sourceUsability) : "";
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
    sourceUsability,
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
    renderProjectTopicSection("coverage", labels.coverage, renderProjectTopicCoverage(projectInput.documentationContinuity, projectInput.ownerAdoption, labels)),
    renderProjectTopicSection("provenance", labels.provenance, renderProjectTopicProvenance(projectInput.documentationContinuity, projectInput.ownerAdoption, labels)),
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
    renderProjectTopicSection("source", labels.source, renderProjectTopicSource(entry, portalContext.sourceCommentProjection)),
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
  if (!body) {
    return "";
  }
  // <lang><zh-CN>首要阅读区默认展开；其余区保持原生 disclosure，可同时打开且不依赖脚本。</zh-CN><en>Primary reading sections start open; remaining sections use native disclosure, allow concurrent expansion, and require no script.</en></lang>
  const open = section === "summary" || section === "declaration" || section === "metadata" ? " open" : "";
  return `<details class="hia-project-topic-section" data-hia-topic-section="${section}"${open}><summary><span>${escapeHtml(label)}</span></summary><div class="hia-project-topic-section-body">${body}</div></details>`;
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
  ownerAdoption: RenderProjectOwnerAdoptionSummary | undefined,
  labels: DocumentationPortalLabels
): string {
  if (!continuity && !ownerAdoption) {
    return `<p class="hia-project-unavailable">${escapeHtml(labels.unavailable)}</p>`;
  }
  return [
    "<dl class=\"hia-project-meta\">",
    ...(continuity ? [
      `<dt>Continuity Status</dt><dd>${escapeHtml(continuity.status)}</dd>`,
      `<dt>Entries</dt><dd>${escapeHtml(String(continuity.entries.baselineCount))} → ${escapeHtml(String(continuity.entries.currentCount))}</dd>`,
      `<dt>Added / Removed / Unchanged</dt><dd>${escapeHtml(String(continuity.entries.addedCount))} / ${escapeHtml(String(continuity.entries.removedCount))} / ${escapeHtml(String(continuity.entries.unchangedCount))}</dd>`,
      `<dt>Required Outputs</dt><dd>${continuity.requiredOutputsPreserved ? "preserved" : "not-preserved"}</dd>`
    ] : []),
    ...(ownerAdoption ? [
      `<dt>Owner Review Readiness</dt><dd>${escapeHtml(ownerAdoption.status)}</dd>`,
      `<dt>Owner Input / Consent</dt><dd>${ownerAdoption.ownerInput.submitted ? "submitted" : "not-submitted"} / ${escapeHtml(ownerAdoption.ownerInput.consent)}</dd>`,
      `<dt>Contract References</dt><dd>${escapeHtml(String(ownerAdoption.contracts.providedCount))} / ${escapeHtml(String(ownerAdoption.contracts.requiredCount))}</dd>`,
      ...(ownerAdoption.workspaceHandoff ? [
        `<dt>Repository Owners / Handoff Edges</dt><dd>${escapeHtml(String(ownerAdoption.workspaceHandoff.repositoryOwnerCount))} / ${escapeHtml(String(ownerAdoption.workspaceHandoff.handoffEdgeCount))}</dd>`
      ] : [])
    ] : []),
    "</dl>"
  ].join("");
}

/** provenance 只显示 exact contract 与三维 semantics，不回读 evidence body。Provenance shows only the exact contract and three semantic dimensions, without reading evidence bodies. */
function renderProjectTopicProvenance(
  continuity: RenderProjectDocumentationContinuitySummary | undefined,
  ownerAdoption: RenderProjectOwnerAdoptionSummary | undefined,
  labels: DocumentationPortalLabels
): string {
  if (!continuity && !ownerAdoption) {
    return `<p class="hia-project-unavailable">${escapeHtml(labels.unavailable)}</p>`;
  }
  return [
    "<dl class=\"hia-project-meta\">",
    ...(continuity ? [
      `<dt>Continuity Contract</dt><dd>${escapeHtml(continuity.contract)}@${escapeHtml(continuity.contractVersion)}</dd>`,
      `<dt>Continuity Resolution</dt><dd>${escapeHtml(continuity.semantics.resolution)}</dd>`,
      `<dt>Continuity Confidence</dt><dd>${escapeHtml(continuity.semantics.confidence)}</dd>`,
      `<dt>Continuity Provenance</dt><dd>${escapeHtml(continuity.semantics.provenance)}</dd>`
    ] : []),
    ...(ownerAdoption ? [
      `<dt>Owner Kit Contract</dt><dd>${escapeHtml(ownerAdoption.contract)}@${escapeHtml(ownerAdoption.contractVersion)}</dd>`,
      `<dt>Owner Kit Resolution</dt><dd>${escapeHtml(ownerAdoption.semantics.resolution)}</dd>`,
      `<dt>Owner Kit Confidence</dt><dd>${escapeHtml(ownerAdoption.semantics.confidence)}</dd>`,
      `<dt>Owner Kit Provenance</dt><dd>${escapeHtml(ownerAdoption.semantics.provenance)}</dd>`
    ] : []),
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
    return [
      `<details class="hia-project-member-card"><summary><span>${escapeHtml(member.name)}</span> <small>${escapeHtml(member.kind)}</small></summary>`,
      "<div class=\"hia-project-member-card-body\">",
      renderProjectSemanticTopicInternal(
        member,
        projectInput,
        locales,
        selectedLocale,
        portalContext,
        true,
        ancestors
      ),
      "</div></details>"
    ].join("");
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
function renderProjectTopicSource(
  entry: RenderProjectEntry,
  options: Required<RenderProjectSourceCommentProjectionOptions> | undefined
): string {
  return [
    entry.source ? renderProjectEntrySource(entry.source, false) : "",
    entry.sourceUsability ? renderProjectEntrySourceUsability(entry.sourceUsability, false) : "",
    entry.docSourceMap ? renderProjectEntryDocSourceMap(entry.docSourceMap, false) : "",
    entry.sourceCommentProjection && options ? renderProjectSourceCommentProjection(entry.sourceCommentProjection, options) : ""
  ].join("");
}

/**
 * @lang zh-CN
 * 将 source-comment projection 缩减为 navigation allowlist；正文与 producer 的正文授权事实都不进入 index。
 *
 * @lang en
 * Reduces a source-comment projection to a navigation allowlist; neither bodies nor the producer body-authorization fact enters the index.
 */
function selectProjectSourceCommentProjection(
  projection: DocumentationSourceCommentProjection
): RenderProjectSourceCommentProjectionSummary {
  return {
    contract: projection.contract,
    contractVersion: projection.contractVersion,
    defaultLocale: projection.defaultLocale,
    entryCount: projection.entries.length,
    privacy: {
      projectedCommentTextIncluded: false,
      rawCommentIncluded: false,
      sourceBodyIncluded: false,
      sourcesContentPolicy: "none"
    },
    projectionId: projection.projectionId,
    requestedLocale: projection.requestedLocale,
    resolvedCount: projection.entries.filter((entry) => entry.resolution !== "missing").length,
    status: projection.status
  };
}

/**
 * @lang zh-CN
 * 渲染 metadata 与可选纯文本正文。正文必须同时得到 producer projection 与 renderer config 授权。
 *
 * @lang en
 * Renders metadata and optional plain-text bodies. Bodies require authorization from both the producer projection and renderer config.
 */
function renderProjectSourceCommentProjection(
  projection: DocumentationSourceCommentProjection,
  options: Required<RenderProjectSourceCommentProjectionOptions>
): string {
  const bodyAuthorized = options.contentPolicy === "explicit-projected-text"
    && projection.contentPolicy === "explicit-projected-text"
    && projection.privacy.projectedCommentTextIncluded;
  const metadata = [
    `<dt>Comment Contract</dt><dd>${escapeHtml(`${projection.contract}@${projection.contractVersion}`)}</dd>`,
    `<dt>Comment Locale</dt><dd>${escapeHtml(projection.requestedLocale)}</dd>`,
    `<dt>Comment Status</dt><dd>${escapeHtml(projection.status)}</dd>`,
    `<dt>Comment Entries</dt><dd>${escapeHtml(String(projection.entries.length))}</dd>`,
    `<dt>Source Content Policy</dt><dd>${escapeHtml(projection.privacy.sourcesContentPolicy)}</dd>`
  ].join("");
  const entries = projection.entries.map((entry) => {
    const range = entry.range
      ? `<dt>Range</dt><dd>${escapeHtml(`${entry.range.start.line}:${entry.range.start.column}-${entry.range.end.line}:${entry.range.end.column}`)}</dd>`
      : "";
    const body = bodyAuthorized && entry.projectedText !== undefined
      ? `<pre class="hia-source-comment"><code>${escapeHtml(entry.projectedText)}</code></pre>`
      : "";
    return [
      `<article class="hia-source-comment-entry" data-hia-source-comment-id="${escapeHtml(entry.commentId)}">`,
      `<dl class="hia-project-meta"><dt>Comment</dt><dd>${escapeHtml(entry.commentId)}</dd>`,
      `<dt>Resolution</dt><dd>${escapeHtml(entry.resolution)}</dd>`,
      `<dt>Confidence</dt><dd>${escapeHtml(entry.confidence)}</dd>`,
      `<dt>Provenance</dt><dd>${escapeHtml(entry.provenance.kind)}</dd>${range}</dl>`,
      body,
      "</article>"
    ].join("");
  }).join("");
  return `<section class="hia-source-section hia-source-comment-section"><dl class="hia-project-meta">${metadata}</dl>${entries}</section>`;
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

/**
 * @lang zh-CN 只渲染 source-usability allowlist metadata，不生成 link、fetch request、preview 或 source body。
 * @lang en Renders only allowlisted source-usability metadata and creates no link, fetch request, preview, or source body.
 */
function renderProjectEntrySourceUsability(sourceUsability: RenderProjectSourceUsabilityRef, includeHeading = true): string {
  const projectIdentity = sourceUsability.projectIdentity;
  const details = [
    `<dt>Resolution</dt><dd>${escapeHtml(sourceUsability.resolution)}</dd>`,
    `<dt>Confidence</dt><dd>${escapeHtml(sourceUsability.confidence)}</dd>`,
    projectIdentity ? `<dt>Project</dt><dd>${escapeHtml(projectIdentity.path)}</dd>` : "",
    projectIdentity ? `<dt>Project Identity</dt><dd>${escapeHtml(projectIdentity.id)}</dd>` : "",
    projectIdentity ? `<dt>Identity Policy</dt><dd>${escapeHtml(projectIdentity.policy)}</dd>` : "",
    `<dt>Provenance</dt><dd>${escapeHtml(`${sourceUsability.provenance.producer}:${sourceUsability.provenance.activity}`)}</dd>`,
    `<dt>Source Content Policy</dt><dd>${escapeHtml(sourceUsability.privacy.sourcesContentPolicy)}</dd>`
  ].join("");
  const heading = includeHeading ? "<h3>Source Usability</h3>" : "";
  return `<section class="hia-source-section hia-source-usability-section">${heading}<dl class="hia-project-meta">${details}</dl></section>`;
}

/**
 * @lang zh-CN 将 runtime source-usability 输入收窄为 navigation index allowlist，额外字段不会跨越 privacy boundary。
 * @lang en Narrows runtime source-usability input to the navigation-index allowlist so extra fields cannot cross the privacy boundary.
 */
function selectProjectSourceUsability(sourceUsability: RenderProjectSourceUsabilityRef): RenderProjectSourceUsabilityRef {
  return {
    relationId: sourceUsability.relationId,
    resolution: sourceUsability.resolution,
    confidence: sourceUsability.confidence,
    provenance: {
      producer: sourceUsability.provenance.producer,
      activity: sourceUsability.provenance.activity,
      contract: sourceUsability.provenance.contract,
      contractVersion: sourceUsability.provenance.contractVersion
    },
    ...(sourceUsability.projectIdentity
      ? {
          projectIdentity: {
            id: sourceUsability.projectIdentity.id,
            path: sourceUsability.projectIdentity.path,
            policy: sourceUsability.projectIdentity.policy
          }
        }
      : {}),
    privacy: {
      sourcesContentPolicy: "none",
      sourcePreviewPolicy: "none",
      embedsSourcesContent: false
    }
  };
}

/**
 * @lang zh-CN 渲染一个只接受同源 publicAsset metadata 的源码 reader；缺少授权 asset 时不产生 fallback UI。
 * @lang en Renders a source reader that accepts same-origin public-asset metadata only and emits no fallback UI when authorization is absent.
 *
 * @param source - 已经 source policy 处理的 body-free source reference。Body-free source reference already processed by source policy.
 * @returns native details reader HTML；拒绝时为空字符串。Native details-reader HTML, or an empty string when refused.
 */
function renderProjectSourceFetch(source: RenderProjectSourceRef): string {
  const publicAsset = source.publicAsset;
  if (!publicAsset || !source.fetchUrl) {
    return "";
  }
  const startLine = source.range?.start.line ?? 1;
  const endLine = source.range?.end?.line;
  const fetchTrigger = source.fetchTrigger ?? "on-expand";
  const maxLines = source.fetchMaxLines ?? 400;
  const caption = endLine ? `${source.path}:${startLine}-${endLine}` : `${source.path}:${startLine}`;
  const manualButton = fetchTrigger === "manual"
    ? "<button type=\"button\" class=\"hia-source-fetch-button\" data-hia-source-fetch-button>Load source / 加载源码</button>"
    : "";
  return [
    `<details class="hia-source-preview hia-project-source-preview" data-hia-source-fetch="${escapeHtml(source.fetchUrl)}" data-hia-source-fetch-trigger="${escapeHtml(fetchTrigger)}" data-hia-source-state="idle" data-hia-source-asset-id="${escapeHtml(publicAsset.assetId)}" data-hia-source-integrity="${escapeHtml(publicAsset.digest)}" data-hia-source-byte-length="${escapeHtml(String(publicAsset.byteLength))}" data-hia-source-max-bytes="1048576" data-hia-source-max-lines="${escapeHtml(String(maxLines))}" data-hia-source-timeout="10000">`,
    `<summary>${escapeHtml(caption)}</summary>`,
    manualButton,
    "<p class=\"hia-project-loading\" data-hia-source-fetch-status hidden></p>",
    `<pre class="hia-source-code"><code data-language="${escapeHtml(source.language ?? "")}"></code></pre>`,
    "<button type=\"button\" class=\"hia-source-reset-button\" data-hia-source-reset hidden>Reset / 重置</button>",
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
