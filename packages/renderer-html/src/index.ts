import { renderSourceLines } from "./source-lines.js";
import { assertDocumentationSiteNavigation, type DocumentationSiteNavigation } from "./site-navigation.js";
import { withSiteNavigation } from "./site-navigation-chrome.js";
import {
  canonicalizeDocumentationLocale,
  getI18nField,
  resolveI18nFieldText,
  validateBusinessFlowDocumentationProjection,
  validateDocumentationSourceCommentProjection,
  type BusinessFlowDocumentationProjection,
  type DocumentationUiLocaleCompletenessReport,
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
import { relocateDefaultThemeAssets, type ThemeAssetRouting } from "./theme-assets.js";
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
  type HiaThemeAssetOptions,
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
import {
  DOCUMENTATION_PORTAL_UI_LOCALE_PROFILE_ID,
  DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH,
  DOCUMENTATION_PORTAL_UI_LOCALE_SURFACE_ID,
  DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES,
  createDocumentationPortalUiLocaleAdoption,
  createSiteNavigationUiLocaleAdoption,
  resolveDocumentationPortalUiMessage,
  type DocumentationPortalUiLocaleAdoption
} from "./portal-ui-locale.js";

export * from "./information-architecture.js";
export {
  DOCUMENTATION_PORTAL_UI_LOCALE_PROFILE_ID,
  DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH,
  DOCUMENTATION_PORTAL_UI_LOCALE_SURFACE_ID,
  DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES,
  DOCUMENTATION_PORTAL_UI_MESSAGE_IDS,
  createDocumentationPortalUiLocaleAdoption,
  resolveDocumentationPortalUiMessage,
  type DocumentationPortalUiLocaleAdoptionOptions,
  type DocumentationPortalUiLocaleAdoption
} from "./portal-ui-locale.js";
export * from "./presentation-profile.js";
export * from "./site-navigation.js";
export { renderThemeAssets, type ThemeAssetRouting } from "./theme-assets.js";

/**
 * @lang zh-CN HTML输出文件清单的精确版本0.1.0，独立于包、文档及各引用工件版本。
 * @lang en Exact HTML output-manifest version 0.1.0, independent of package, document and referenced-artifact versions.
 */
export const HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION = "0.1.0";
/**
 * @lang zh-CN 项目导航索引的中性 contract 名称；供静态 portal、搜索与宿主导航消费。
 * @lang en Neutral project-navigation-index contract name consumed by static portals, search, and host navigation.
 */
export const HIA_PROJECT_NAVIGATION_INDEX_CONTRACT = "hia-project-navigation-index";
/**
 * @lang zh-CN 项目导航索引的首个草案版本；它独立于 renderer manifest 的文件清单版本。
 * @lang en First draft version of the project navigation index; independent from the renderer manifest file-list version.
 */
export const HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION = "0.1.0-draft";
/**
 * @lang zh-CN 携带显式符号作用域的协调索引版本，旧索引writer保留。
 * @lang en Coordinated index version carrying explicit symbol scopes, retaining the legacy index writer.
 */
export const HIA_PROJECT_SCOPED_NAVIGATION_INDEX_CONTRACT_VERSION = "0.2.0-draft";
/**
 * @lang zh-CN 项目级关系图的中性 contract 名称；用于表达文档入口、源码、生成物与宿主能力之间的关系。
 * @lang en Neutral project-level relation-graph contract for documentation entries, sources, generated artifacts, and host capabilities.
 */
export const HIA_PROJECT_RELATION_GRAPH_CONTRACT = "hia-project-relation-graph";
/**
 * @lang zh-CN 项目级关系图的首个草案版本；后续 IDE/DevTools host 会按此 contract 做能力协商。
 * @lang en First draft version of the project relation graph; future IDE/DevTools hosts negotiate capabilities against this contract.
 */
export const HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION = "0.1.0-draft";

/**
 * @lang zh-CN 宿主可写入的内存文件记录：输出相对路径、正文、MIME及角色；renderer不执行文件写入。
 * @lang en In-memory file record for host-owned writing: output-relative path, contents, MIME and role; the renderer performs no file writes.
 */
export interface RenderedHtmlFile {
  /**
   * @lang zh-CN 相对于本次输出根目录的文件路径，由宿主写入者解释。
   * @lang en File path relative to this render's output root, interpreted by the host writer.
   */
  path: string;
  /**
   * @lang zh-CN 待写出的文本正文，惰性源码查看页可在读取属性时生成。
   * @lang en Text contents to be written, with lazy source-view pages generated when the property is read.
   */
  contents: string;
  /**
   * @lang zh-CN 文件的媒体类型及适用字符集。
   * @lang en Media type and applicable character encoding of the file.
   */
  contentType: string;
  /**
   * @lang zh-CN 文件角色，entry为页面入口，asset为静态资源，index为结构化索引。
   * @lang en File role, using entry for page entrypoints, asset for static resources and index for structured indexes.
   */
  role: "entry" | "asset" | "index";
}

/**
 * @lang zh-CN 文档/项目渲染选项；普通文档保持单页，项目选项仅在对应项目路径消费。默认主题资源包含，locale缺省由文档/项目决定。
 * @lang en Document/project rendering options; documents stay single-page and project options apply only to project paths. Theme assets default on and omitted locale follows document/project metadata.
 */
export interface RenderHtmlOptions {
  /**
   * @lang zh-CN 可选的初始正文语言，省略时使用文档或项目解析出的默认语言。
   * @lang en Optional initial content locale, using the document or resolved project default when omitted.
   */
  locale?: string;
  /**
   * @lang zh-CN 可选的页面标题覆盖，优先于文档标题或项目标题与名称。
   * @lang en Optional page-title override taking precedence over document title or project title and name.
   */
  title?: string;
  /**
   * @lang zh-CN 是否在本次输出中包含默认主题资源，缺省为true。
   * @lang en Whether to include default-theme assets in this render's output, defaulting to true.
   */
  includeThemeAssets?: boolean;
  /**
   * @lang zh-CN 默认本地资源；external只引用同站共享资源，不越过输出根写文件。
   * @lang en Defaults to local assets; external references same-site shared assets without writing outside the output root.
   */
  themeAssets?: ThemeAssetRouting;
  /**
   * @lang zh-CN 普通与项目输出共用的品牌颜色和构建期皮肤/配色，逐项优先于旧projectSite.theme。
   * @lang en Brand colors and build-time skin/scheme shared by document/project output, taking per-field precedence over legacy projectSite.theme.
   */
  theme?: RenderHtmlThemeOptions;
  /**
   * @lang zh-CN 项目站输出与源码策略；单文档只读取theme作为兼容回退，其余项目策略不适用。
   * @lang en Project-site output/source policy; document rendering reads only theme as a compatibility fallback, ignoring other project policies.
   */
  projectSite?: RenderProjectSiteOptions;
}

/**
 * @lang zh-CN 项目条目的领域分组闭集；all为汇总视图，不声明每个领域已全面支持。
 * @lang en Closed project-entry domain groups; all is an aggregate view, not a claim of complete domain support.
 */
export type RenderProjectView = "all" | "js" | "css" | "html" | "dotnet" | "powershell" | "other";
/**
 * @lang zh-CN 项目站分页布局闭集；默认split-site，single-page为显式兼容选择。
 * @lang en Closed project-site layouts; split-site is the default and single-page an explicit compatibility choice.
 */
export type RenderProjectSiteLayout = "split-site" | "single-page";
/**
 * @lang zh-CN 源码正文/链接呈现策略闭集，默认和公开授权由项目站策略决定。
 * @lang en Closed source body/link presentation policy, with defaults and disclosure authority determined by project-site policy.
 */
export type RenderProjectSourcePresentation = "none" | "link" | "embed" | "fetch";
/**
 * @lang zh-CN 公开同源源码的展开时或手动加载策略，不授权获取任意URL。
 * @lang en On-expand or manual loading of public same-origin source assets, without authorizing arbitrary URLs.
 */
export type RenderProjectSourceFetchTrigger = "on-expand" | "manual";

/**
 * @lang zh-CN Portal 的构建时默认 skin/scheme；运行时选择不改变内容 identity。
 * @lang en Build-time Portal skin/scheme defaults; runtime selection does not change content identity.
 */
export interface RenderProjectThemeOptions {
  /**
   * @lang zh-CN 可选的构建期配色方案，共享theme逐项优先，缺省回退system。
   * @lang en Optional build-time color scheme, with shared theme taking per-field precedence and the default falling back to system.
   */
  scheme?: PortalThemeScheme;
  /**
   * @lang zh-CN 可选的构建期皮肤标识，共享theme逐项优先，缺省回退portal.classic。
   * @lang en Optional build-time skin identifier, with shared theme taking per-field precedence and the default falling back to portal.classic.
   */
  skinId?: PortalThemeSkinId;
}

/**
 * @lang zh-CN 主题owner的安全品牌颜色及既有皮肤/配色，不接收自定义CSS或代码。
 * @lang en Theme-owner safe brand colors plus existing skin/scheme, without custom CSS or code.
 */
export interface RenderHtmlThemeOptions extends RenderProjectThemeOptions, HiaThemeAssetOptions {}

/**
 * @lang zh-CN 项目站布局、信息架构、语言、主题和源码策略；显式信息架构才启用对应契约投影，不改变canonical条目身份。
 * @lang en Project-site layout, information architecture, locales, theme and source policy; explicit information architecture enables its projections without changing canonical entry identities.
 */
export interface RenderProjectSiteOptions {
  /**
   * @lang zh-CN 可选独立0.1.0-draft站点导航；须显式uiLocale，在首写前校验/复制，覆盖完整页面且不扩大源码授权。
   * @lang en Optional independent 0.1.0-draft site navigation, requiring explicit uiLocale and validated/snapshotted before the first write, covering complete pages without additional source authority.
   */
  siteNavigation?: DocumentationSiteNavigation;
  /**
   * @lang zh-CN 默认 split-site；single-page 仅适合兼容、小型文档或静态快照。
   * @lang en Defaults to split-site; single-page is for compatibility, small docs, or snapshots.
   */
  layout?: RenderProjectSiteLayout;
  /**
   * @lang zh-CN 显式 IA 才启用 P4 slice；缺失时保持 P3 output path。
   * @lang en Only explicit IA enables the P4 slice; omission preserves the P3 output path.
   */
  informationArchitecture?: DocumentationPortalInformationArchitectureOptions;
  /**
   * @lang zh-CN UI chrome locale，与 project content locale 独立。
   * @lang en UI chrome locale, independent from the project content locale.
   */
  uiLocale?: DocumentationPortalUiLocale;
  /**
   * @lang zh-CN W-P123 report 的 owner-neutral profile/surface identity；仅显式 IA 消费，译文与 DOM 结构不进入该 descriptor。
   *
   * @lang en Owner-neutral profile/surface identity for the W-P123 report; consumed only by explicit IA and carries no translation or DOM structure.
   */
  uiLocaleCompleteness?: RenderProjectUiLocaleCompletenessOptions;
  /**
   * @lang zh-CN source-comment locale 与正文授权；只有显式 IA 下才消费，且不从 UI/content locale 推断。
   *
   * @lang en Source-comment locale and body authorization, consumed only under explicit IA and never inferred from UI or content locale.
   */
  sourceCommentProjection?: RenderProjectSourceCommentProjectionOptions;
  /**
   * @lang zh-CN Portal-owned skin 与独立 scheme 选择。
   * @lang en Portal-owned skin and independent scheme selection.
   */
  theme?: RenderProjectThemeOptions;
  /**
   * @lang zh-CN 项目源码正文、链接及加载策略，呈现方式缺省为fetch，资源来自调用方授权的内存预览。
   * @lang en Project source-body, link and loading policies, defaulting presentation to fetch and taking assets from caller-authorized in-memory previews.
   */
  source?: {
    /**
     * @lang zh-CN 控制源码正文与链接是否进入输出。
     * @lang en Controls whether source bodies or links enter the output.
     */
    presentation?: RenderProjectSourcePresentation;
    /**
     * @lang zh-CN embed 模式的源码详情默认展开状态。
     * @lang en Default expansion state for embedded source details.
     */
    defaultExpanded?: boolean;
    /**
     * @lang zh-CN fetch 模式默认在展开时加载；manual 保留显式加载按钮。
     * @lang en Fetch mode loads on expansion by default; manual keeps an explicit load button.
     */
    fetchTrigger?: RenderProjectSourceFetchTrigger;
    /**
     * @lang zh-CN fetch 模式单次最多显示的源码行数。
     * @lang en Maximum source lines displayed by one fetch operation.
     */
    maxLines?: number;
  };
}

/**
 * @lang zh-CN Portal UI locale report 的可覆盖 identity。
 * @lang en Overridable identities for the Portal UI-locale report.
 */
export interface RenderProjectUiLocaleCompletenessOptions {
  /**
   * @lang zh-CN 可选的已登记界面完整性profile身份，默认portal.default。
   * @lang en Optional registered UI-completeness profile identity, defaulting to portal.default.
   */
  profileId?: string;
  /**
   * @lang zh-CN 可选的已登记界面面身份，默认portal.split-site，须与profileId精确配对。
   * @lang en Optional registered surface identity, defaulting to portal.split-site and required to pair exactly with profileId.
   */
  surfaceId?: string;
}

/**
 * @lang zh-CN Portal P5 有界 slice 的 runtime 选项；P1 不支持 rich text 或 source fetch。
 *
 * @lang en Runtime options for the bounded Portal P5 slice; P1 supports neither rich text nor source fetch.
 */
export interface RenderProjectSourceCommentProjectionOptions {
  /**
   * @lang zh-CN 源码注释投影正文的消费策略，默认none；纯文本正文还须生产方投影同时授权。
   * @lang en Consumption policy for projected source-comment text, defaulting to none, with plain text also requiring authorization in the producer projection.
   */
  contentPolicy?: DocumentationSourceCommentContentPolicy;
  /**
   * @lang zh-CN 调用方显式指定的规范BCP 47注释语言，须与条目投影requestedLocale一致。
   * @lang en Canonical BCP 47 comment locale explicitly supplied by the caller, required to match each entry projection's requestedLocale.
   */
  locale: string;
}

/**
 * @lang zh-CN 调用方已聚合的项目、条目及可选关系/投影；renderer不自行发现文件或认证owner输入事实。
 * @lang en Caller-aggregated project, entries and optional relations/projections; the renderer neither discovers files nor attests owner-input facts.
 */
export interface RenderProjectHtmlInput {
  /**
   * @lang zh-CN 调用方提供的项目身份、标题和语言元数据。
   * @lang en Caller-supplied project identity, title and locale metadata.
   */
  project: RenderProjectInfo;
  /**
   * @lang zh-CN 已聚合的项目文档条目，稳定标识及文件名投影须唯一。
   * @lang en Aggregated project documentation entries whose stable identifiers and filename projections must be unique.
   */
  entries: RenderProjectEntry[];
  /**
   * @lang zh-CN 可选的已使用文档化配置规范引用集合。
   * @lang en Optional collection of references to documentation profiles used by the project.
   */
  profiles?: RenderProjectProfileRef[];
  /**
   * @lang zh-CN 可选的文档源码映射工件引用与计数摘要。
   * @lang en Optional documentation source-map artifact references and count summaries.
   */
  docSourceMaps?: RenderProjectDocSourceMapRef[];
  /**
   * @lang zh-CN 由 @hia-doc/source-linkage 的 W-P52.5 index 产生的安全 binding relation 投影。
   * @lang en Safe binding-relation projection produced by the W-P52.5 @hia-doc/source-linkage index.
   */
  generatedDocumentationBindingProjection?: GeneratedDocumentationBindingHostProjection;
  /**
   * @lang zh-CN 可选的显式关系图，提供时规范排序并重算计数，缺省时从现有条目关联构造。
   * @lang en Optional explicit relation graph, sorted and recounted when provided and otherwise constructed from existing entry associations.
   */
  relationGraph?: RenderProjectRelationGraph;
  /**
   * @lang zh-CN optional、body-free 的 W-P84 continuity 摘要；renderer 不读取 report 文件或 target state。
   * @lang en Optional body-free W-P84 continuity summary; the renderer reads neither report files nor target state.
   */
  documentationContinuity?: RenderProjectDocumentationContinuitySummary;
  /**
   * @lang zh-CN optional W-P89 owner-adoption Portal 投影；只在显式 IA 下消费 metadata-only summary。
   * @lang en Optional W-P89 owner-adoption Portal projection; consumes a metadata-only summary only under explicit IA.
   */
  ownerAdoption?: RenderProjectOwnerAdoptionSummary;
  /**
   * @lang zh-CN optional W-P122 public dual projection；W-P124 只将其投影到 Portal structured data plane，不据此定稿可见 flow UI。
   *
   * @lang en Optional W-P122 public dual projection; W-P124 projects it only to the Portal structured data plane and does not finalize a visible flow UI from it.
   */
  businessFlowDocumentationProjection?: BusinessFlowDocumentationProjection;
  /**
   * @lang zh-CN 调用方提供的项目级诊断集合。
   * @lang en Collection of project-level diagnostics supplied by the caller.
   */
  diagnostics?: HiaDiagnostic[];
}

/**
 * @lang zh-CN 项目的可公开身份、标题、语言和产品版本；产品版本仅作metadata，不参与路由。
 * @lang en Public project identity, title, locales and product version; product version is metadata only and never participates in routing.
 */
export interface RenderProjectInfo {
  /**
   * @lang zh-CN 可选的项目稳定标识，缺省按project:前缀与项目名称构造。
   * @lang en Optional stable project identifier, defaulting to the project: prefix followed by the project name.
   */
  id?: string;
  /**
   * @lang zh-CN 必需的公开项目名称，也是缺省项目身份和标题的输入。
   * @lang en Required public project name, also used to derive the default project identity and title.
   */
  name: string;
  /**
   * @lang zh-CN 可选的项目显示标题，缺省使用name，可由渲染选项title覆盖。
   * @lang en Optional project display title, defaulting to name and overridable by the render option title.
   */
  title?: string;
  /**
   * @lang zh-CN 项目页面的默认语言；若未提供则从已声明语言或 `und` 推断。
   * @lang en Default project-page locale; inferred from declared locales or `und` when omitted.
   */
  defaultLocale?: string;
  /**
   * @lang zh-CN 项目聚合页中可切换的语言。
   * @lang en Locales that can be switched within the project aggregation page.
   */
  locales?: string[];
  /**
   * @lang zh-CN 产品版本仅呈现为 metadata，不参与 route。
   * @lang en Product version is displayed as metadata and never participates in routing.
   */
  productVersion?: string;
}

/**
 * @lang zh-CN Portal 可消费的最小 continuity summary；不携带 target identity、path、entry id 或正文。
 * @lang en Minimal Portal continuity summary without target identity, paths, entry ids, or bodies.
 */
export interface RenderProjectDocumentationContinuitySummary {
  /**
   * @lang zh-CN 固定的target-documentation-continuity契约名称。
   * @lang en Fixed target-documentation-continuity contract name.
   */
  contract: "target-documentation-continuity";
  /**
   * @lang zh-CN 固定的0.1.0-draft精确连续性摘要版本。
   * @lang en Fixed exact 0.1.0-draft continuity-summary version.
   */
  contractVersion: "0.1.0-draft";
  /**
   * @lang zh-CN 调用方提供的accepted或refused连续性结果。
   * @lang en Caller-supplied accepted or refused continuity result.
   */
  status: "accepted" | "refused";
  /**
   * @lang zh-CN 基线、当前、增加、移除和未变条目数量，必须满足集合计数等式。
   * @lang en Counts of baseline, current, added, removed and unchanged entries, required to satisfy collection-count equations.
   */
  entries: {
    /**
     * @lang zh-CN 相对基线新增的条目数量，与unchangedCount相加须等于currentCount。
     * @lang en Number of entries added since the baseline, whose sum with unchangedCount must equal currentCount.
     */
    addedCount: number;
    /**
     * @lang zh-CN 基线条目数量，须等于unchangedCount加removedCount。
     * @lang en Baseline entry count, required to equal unchangedCount plus removedCount.
     */
    baselineCount: number;
    /**
     * @lang zh-CN 当前条目数量，须等于unchangedCount加addedCount。
     * @lang en Current entry count, required to equal unchangedCount plus addedCount.
     */
    currentCount: number;
    /**
     * @lang zh-CN 相对基线移除的条目数量。
     * @lang en Number of entries removed since the baseline.
     */
    removedCount: number;
    /**
     * @lang zh-CN 基线与当前集合中保留未变的条目数量。
     * @lang en Number of unchanged entries retained between the baseline and current collections.
     */
    unchangedCount: number;
  };
  /**
   * @lang zh-CN 调用方声明必需输出是否保留，渲染器仅消费摘要。
   * @lang en Caller declaration of whether required outputs were preserved, consumed by the renderer as a summary only.
   */
  requiredOutputsPreserved: boolean;
  /**
   * @lang zh-CN 分别记录解析状态、调用方未核置信度及元数据比较来源。
   * @lang en Separate records of resolution state, caller-provided unverified confidence and metadata-comparison provenance.
   */
  semantics: {
    /**
     * @lang zh-CN 调用方记录的证据与摘要配对已校验状态或unresolved。
     * @lang en Caller-recorded evidence/summary-pair validation state or unresolved.
     */
    resolution: "evidence-summary-pair-validated" | "unresolved";
    /**
     * @lang zh-CN 固定为caller-provided-unverified，保留调用方提供但未由渲染器认证的置信边界。
     * @lang en Fixed to caller-provided-unverified, preserving the boundary of caller data not attested by the renderer.
     */
    confidence: "caller-provided-unverified";
    /**
     * @lang zh-CN 固定为metadata-only-comparison，来源仅为元数据比较。
     * @lang en Fixed to metadata-only-comparison, limiting provenance to metadata comparison.
     */
    provenance: "metadata-only-comparison";
  };
}

/**
 * @lang zh-CN Portal 可消费的 owner-adoption 最小投影；不含 target/trial/owner identity、path、body 或 adoption claim。
 * @lang en Minimal Portal-consumable owner-adoption projection without target/trial/owner identity, paths, bodies, or adoption claims.
 */
export interface RenderProjectOwnerAdoptionSummary {
  /**
   * @lang zh-CN 固定的target-owner-adoption-kit契约名称。
   * @lang en Fixed target-owner-adoption-kit contract name.
   */
  contract: "target-owner-adoption-kit";
  /**
   * @lang zh-CN 固定的0.1.0-draft精确负责人审阅摘要版本。
   * @lang en Fixed exact 0.1.0-draft owner-review summary version.
   */
  contractVersion: "0.1.0-draft";
  /**
   * @lang zh-CN 固定为portal-metadata-only，仅向Portal提供元数据投影。
   * @lang en Fixed to portal-metadata-only, providing only a metadata projection to the Portal.
   */
  projection: "portal-metadata-only";
  /**
   * @lang zh-CN 负责人审阅准备状态，记录待审阅、缺输入延期或拒绝。
   * @lang en Owner-review readiness state recording readiness, deferral for missing input or refusal.
   */
  status: "ready-for-owner-review" | "deferred-owner-input-missing" | "refused";
  /**
   * @lang zh-CN 调用方声明的enterprise-business或workspace-container目标族。
   * @lang en Caller-declared enterprise-business or workspace-container target family.
   */
  targetFamily: "enterprise-business" | "workspace-container";
  /**
   * @lang zh-CN 负责人输入是否提交及审阅同意记录状态。
   * @lang en Submission state of owner input and the recorded review-consent state.
   */
  ownerInput: {
    /**
     * @lang zh-CN 负责人材料是否已提交，ready-for-owner-review要求为true。
     * @lang en Whether owner materials were submitted, required to be true for ready-for-owner-review.
     */
    submitted: boolean;
    /**
     * @lang zh-CN 仅记录未登记或已登记审阅同意的状态。
     * @lang en Records only whether review consent is unrecorded or recorded.
     */
    consent: "not-recorded" | "recorded-for-review";
  };
  /**
   * @lang zh-CN 必需、已提供与缺失契约的非负整数计数。
   * @lang en Non-negative integer counts of required, provided and missing contracts.
   */
  contracts: {
    /**
     * @lang zh-CN 必需契约数量，须等于providedCount加missingCount。
     * @lang en Required contract count, required to equal providedCount plus missingCount.
     */
    requiredCount: number;
    /**
     * @lang zh-CN 调用方已提供的契约数量。
     * @lang en Number of contracts supplied by the caller.
     */
    providedCount: number;
    /**
     * @lang zh-CN 仍缺失的契约数量，ready-for-owner-review要求为0。
     * @lang en Number of contracts still missing, required to be zero for ready-for-owner-review.
     */
    missingCount: number;
  };
  /**
   * @lang zh-CN 工作区容器目标可用的交接计数与待负责人审阅状态，ready时必须提供。
   * @lang en Handoff counts and pending-owner-review state for workspace-container targets, required when ready.
   */
  workspaceHandoff?: {
    /**
     * @lang zh-CN 参与工作区交接的仓库负责人数量，提供交接记录时至少为2。
     * @lang en Number of repository owners participating in workspace handoff, at least two when a handoff record is supplied.
     */
    repositoryOwnerCount: number;
    /**
     * @lang zh-CN 工作区交接关系数量，提供交接记录时至少为1。
     * @lang en Number of workspace handoff edges, at least one when a handoff record is supplied.
     */
    handoffEdgeCount: number;
    /**
     * @lang zh-CN 固定为owner-review-required，表示交接仍待负责人审阅。
     * @lang en Fixed to owner-review-required, indicating that handoff still requires owner review.
     */
    state: "owner-review-required";
  };
  /**
   * @lang zh-CN 分别记录输入解析状态、未核置信度及负责人材料元数据来源。
   * @lang en Separate records of input-resolution state, unverified confidence and owner-kit metadata provenance.
   */
  semantics: {
    /**
     * @lang zh-CN 负责人输入已校验、尚未收到或unresolved的独立解析状态。
     * @lang en Independent resolution state for validated owner input, input not received or unresolved.
     */
    resolution: "owner-input-validated" | "owner-input-not-received" | "unresolved";
    /**
     * @lang zh-CN 固定为caller-provided-unverified，渲染器不认证调用方材料真实性。
     * @lang en Fixed to caller-provided-unverified, with the renderer performing no attestation of caller-material authenticity.
     */
    confidence: "caller-provided-unverified";
    /**
     * @lang zh-CN 固定为metadata-only-owner-kit，来源仅为负责人材料元数据。
     * @lang en Fixed to metadata-only-owner-kit, limiting provenance to owner-kit metadata.
     */
    provenance: "metadata-only-owner-kit";
  };
}

/**
 * @lang zh-CN 已用文档化配置规范的轻量引用；profileVersion与包/规范根版本独立，path仅作来源metadata。
 * @lang en Lightweight reference to a used documentation profile; profileVersion is independent of package/root versions and path is provenance metadata only.
 */
export interface RenderProjectProfileRef {
  /**
   * @lang zh-CN 已使用文档化配置规范的稳定标识。
   * @lang en Stable identifier of a documentation profile used by the project.
   */
  profileId: string;
  /**
   * @lang zh-CN 可选的文档化配置规范版本，独立于包版本及规范根版本。
   * @lang en Optional documentation-profile version, independent of package and specification-root versions.
   */
  profileVersion?: string;
  /**
   * @lang zh-CN 可选的配置规范层标识，用于分组与来源显示。
   * @lang en Optional profile-layer identifier used for grouping and provenance display.
   */
  layer?: string;
  /**
   * @lang zh-CN 可选的配置规范来源路径，仅作元数据引用。
   * @lang en Optional profile-origin path used solely as a metadata reference.
   */
  path?: string;
}

/**
 * @lang zh-CN 文档源码映射文件的版本、计数和关联摘要，不含源码正文；计数由上游提供，不作为权限或精度证明。
 * @lang en Version, counts and linkage summary for a documentation source-map file without source bodies; upstream counts prove neither authority nor coordinate precision.
 */
export interface RenderProjectDocSourceMapRef {
  /**
   * @lang zh-CN 地图所属的可选聚合作用域，不授予源码读取权限。
   * @lang en Optional aggregate scope owning this map, granting no source-read authority.
   */
  identityScope?: string;
  /**
   * @lang zh-CN 上游提供的生成工件数量摘要。
   * @lang en Upstream-provided count summary of generated artifacts.
   */
  artifactCount?: number;
  /**
   * @lang zh-CN 被引用文档源码映射工件的路径，仅作元数据。
   * @lang en Path of the referenced documentation source-map artifact, used only as metadata.
   */
  path: string;
  /**
   * @lang zh-CN 上游文档源码映射工件的可选精确版本标签。
   * @lang en Optional exact version label of the upstream documentation source-map artifact.
   */
  contractVersion?: string;
  /**
   * @lang zh-CN 可选的入口生成工件标识或路径摘要。
   * @lang en Optional identifier or path summary of the entry generated artifact.
   */
  entryArtifact?: string;
  /**
   * @lang zh-CN 上游提供的映射条目总数。
   * @lang en Total mapping-entry count supplied upstream.
   */
  entryCount?: number;
  /**
   * @lang zh-CN 上游报告已关联的映射条目数量。
   * @lang en Number of linked mapping entries reported upstream.
   */
  linkedEntryCount?: number;
  /**
   * @lang zh-CN 上游提供的源码记录数量。
   * @lang en Number of source records supplied upstream.
   */
  sourceCount?: number;
  /**
   * @lang zh-CN 可选的普通位置映射引用集合，不内嵌映射内容。
   * @lang en Optional ordinary position-map references, without embedding map contents.
   */
  sourceMaps?: RenderProjectSourceMapRef[];
  /**
   * @lang zh-CN 上游提供的普通位置映射数量摘要。
   * @lang en Upstream-provided count summary of ordinary position maps.
   */
  sourceMapCount?: number;
  /**
   * @lang zh-CN 上游记录的源码正文策略标签，摘要本身不授予读取权限。
   * @lang en Upstream-recorded source-body policy label, with the summary itself granting no read permission.
   */
  sourcesContentPolicy?: string;
  /**
   * @lang zh-CN 上游提供的映射关联状态摘要。
   * @lang en Upstream-provided summary of mapping-linkage status.
   */
  status?: string;
  /**
   * @lang zh-CN 上游报告尚未解析的映射条目数量。
   * @lang en Number of unresolved mapping entries reported upstream.
   */
  unresolvedEntryCount?: number;
}

/**
 * @lang zh-CN 普通位置映射的轻量身份/路径/语言引用；不内嵌映射段或授权读取文件。
 * @lang en Lightweight identity/path/language reference to an ordinary position map, without embedded mappings or file-read authority.
 */
export interface RenderProjectSourceMapRef {
  /**
   * @lang zh-CN 普通位置映射的稳定引用标识。
   * @lang en Stable reference identifier of an ordinary position map.
   */
  id: string;
  /**
   * @lang zh-CN 可选的位置映射类别标签。
   * @lang en Optional position-map kind label.
   */
  kind?: string;
  /**
   * @lang zh-CN 可选的位置映射所属语言标签。
   * @lang en Optional language label associated with the position map.
   */
  language?: string;
  /**
   * @lang zh-CN 可选的位置映射文件路径，仅作引用。
   * @lang en Optional position-map file path used only as a reference.
   */
  path?: string;
}

/**
 * @lang zh-CN 项目关系节点的entry/source/artifact/endpoint闭集，不授权对相应目标执行动作。
 * @lang en Closed entry/source/artifact/endpoint relation-node kinds, without authorizing actions on those targets.
 */
export type RenderProjectRelationNodeKind = "entry" | "source" | "artifact" | "endpoint";

/**
 * @lang zh-CN 项目关系语义闭集，表达文档/源码/生成物/端点/成员关联，不推断额外关系。
 * @lang en Closed project-relation semantics for documentation/source/artifact/endpoint/member links, without inferring additional relationships.
 */
export type RenderProjectRelationKind =
  | "documents-source"
  | "documents-generated-artifact"
  | "documents-endpoint"
  | "exposes-api"
  | "semantic-member";

/**
 * @lang zh-CN 统一项目页与外部宿主共同消费的轻量关系图。
 * @lang en Lightweight relation graph shared by the unified project page and external hosts.
 */
export interface RenderProjectRelationGraph {
  /**
   * @lang zh-CN 项目关系图契约身份，规范化时写入hia-project-relation-graph。
   * @lang en Project relation-graph contract identity, written as hia-project-relation-graph during normalization.
   */
  contract: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT;
  /**
   * @lang zh-CN 项目关系图版本，规范化时写入0.1.0-draft。
   * @lang en Project relation-graph version, written as 0.1.0-draft during normalization.
   */
  contractVersion: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION;
  /**
   * @lang zh-CN 节点数量，规范化时按nodes长度重新计算。
   * @lang en Node count, recomputed from the length of nodes during normalization.
   */
  nodeCount: number;
  /**
   * @lang zh-CN 关系数量，规范化时按relations长度重新计算。
   * @lang en Relation count, recomputed from the length of relations during normalization.
   */
  relationCount: number;
  /**
   * @lang zh-CN 项目关系节点集合，规范化时复制并稳定排序。
   * @lang en Project relation-node collection, copied and stably sorted during normalization.
   */
  nodes: RenderProjectRelationNode[];
  /**
   * @lang zh-CN 有方向的项目关系集合，规范化时复制并稳定排序。
   * @lang en Directed project-relation collection, copied and stably sorted during normalization.
   */
  relations: RenderProjectRelation[];
}

/**
 * @lang zh-CN relation graph 中的稳定节点；节点可以代表文档入口、源码、生成物或运行时端点。
 * @lang en Stable node in the relation graph; it can represent a documentation entry, source, generated artifact, or runtime endpoint.
 */
export interface RenderProjectRelationNode {
  /**
   * @lang zh-CN 图中此节点的稳定标识，供关系端点引用。
   * @lang en Stable identifier of this graph node, referenced by relation endpoints.
   */
  id: string;
  /**
   * @lang zh-CN 节点表示的文档条目、源码、生成物或端点类别。
   * @lang en Kind of entity represented by the node, covering documentation entry, source, artifact or endpoint.
   */
  kind: RenderProjectRelationNodeKind;
  /**
   * @lang zh-CN 节点的可公开显示标签。
   * @lang en Public display label of the node.
   */
  label: string;
  /**
   * @lang zh-CN 可选的关联文档条目标识。
   * @lang en Optional associated documentation-entry identifier.
   */
  entryId?: string;
  /**
   * @lang zh-CN 可选的源码或生成物路径元数据。
   * @lang en Optional source or generated-artifact path metadata.
   */
  path?: string;
  /**
   * @lang zh-CN 可选的领域视图分组。
   * @lang en Optional domain-view grouping.
   */
  view?: RenderProjectView;
}

/**
 * @lang zh-CN relation graph 中的一条方向关系；第一轮仅表达统一页面和宿主导航需要的最小关系。
 * @lang en Directed relation in the graph; the first slice covers the minimal relationships needed by unified pages and host navigation.
 */
export interface RenderProjectRelation {
  /**
   * @lang zh-CN 有向关系的稳定标识。
   * @lang en Stable identifier of the directed relation.
   */
  id: string;
  /**
   * @lang zh-CN 文档与源码、生成物、端点或成员之间的闭集关系语义。
   * @lang en Closed-set relation semantics linking documentation with source, generated artifacts, endpoints or members.
   */
  kind: RenderProjectRelationKind;
  /**
   * @lang zh-CN 关系来源图节点的标识。
   * @lang en Identifier of the relation's source graph node.
   */
  from: string;
  /**
   * @lang zh-CN 关系目标图节点的标识。
   * @lang en Identifier of the relation's target graph node.
   */
  to: string;
  /**
   * @lang zh-CN 关系的可公开显示标签。
   * @lang en Public display label of the relation.
   */
  label: string;
  /**
   * @lang zh-CN 可选的上游关系置信度标签，独立于引用解析。
   * @lang en Optional upstream relation-confidence label, independent of reference resolution.
   */
  confidence?: string;
  /**
   * @lang zh-CN 可选的关联文档条目标识。
   * @lang en Optional associated documentation-entry identifier.
   */
  entryId?: string;
  /**
   * @lang zh-CN 可选的公开标量元数据，仅允许字符串、数字、布尔值或null。
   * @lang en Optional public scalar metadata restricted by type to strings, numbers, booleans or null.
   */
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * @lang zh-CN 结构化项目条目及可选本地化、来源和关系摘要；身份由输入提供，正文/源码公开须经过相应owner与呈现策略验证。
 * @lang en Structured project entry with optional localization, source and relation summaries; inputs own identities and body/source disclosure requires owner and presentation-policy validation.
 */
export interface RenderProjectEntry {
  /**
   * @lang zh-CN 可选发布安全聚合作用域，保留原生symbolId且不授权源码读取。
   * @lang en Optional publication-safe aggregation scope, preserving native symbolId and granting no source-read authority.
   */
  identityScope?: string;
  /**
   * @lang zh-CN 调用方提供的稳定条目标识，用于规范片段路由及主题身份。
   * @lang en Caller-supplied stable entry identifier used for canonical fragment routes and topic identity.
   */
  id: string;
  /**
   * @lang zh-CN 条目的公开显示名称与搜索输入。
   * @lang en Public display name and search input of the entry.
   */
  name: string;
  /**
   * @lang zh-CN 领域生产方提供的条目语义类别。
   * @lang en Semantic entry kind supplied by the domain producer.
   */
  kind: string;
  /**
   * @lang zh-CN 条目所属的领域视图分组。
   * @lang en Domain-view grouping containing the entry.
   */
  view: RenderProjectView;
  /**
   * @lang zh-CN 缺少主i18n字段时使用的可选摘要正文。
   * @lang en Optional summary text used when the primary i18n field is absent.
   */
  summary?: string;
  /**
   * @lang zh-CN 可选的声明签名，按转义代码文本呈现。
   * @lang en Optional declaration signature rendered as escaped code text.
   */
  signature?: string;
  /**
   * @lang zh-CN 从领域 adapter/core symbol 透传的字段级 i18n；description 会驱动项目页的语言切换。
   * @lang en Field-level i18n forwarded from a domain adapter/core symbol; description drives project-page locale switching.
   */
  i18n?: HiaI18nModel;
  /**
   * @lang zh-CN 可选的条目文档化配置规范引用。
   * @lang en Optional documentation-profile reference for the entry.
   */
  profile?: RenderProjectProfileRef;
  /**
   * @lang zh-CN 可选的来源输入工件元数据。
   * @lang en Optional metadata of the originating input artifact.
   */
  input?: RenderProjectInputRef;
  /**
   * @lang zh-CN 可选的源码定位及已授权预览输入，受项目源码策略处理。
   * @lang en Optional source-location and authorized-preview input, processed under project source policy.
   */
  source?: RenderProjectSourceRef;
  /**
   * @lang zh-CN source relation 到 canonical entry 的 metadata-only 可用性投影；不授予源码读取能力。
   * @lang en Metadata-only source-usability projection from a source relation to the canonical entry; it grants no source-read capability.
   */
  sourceUsability?: RenderProjectSourceUsabilityRef;
  /**
   * @lang zh-CN 已由 owner producer 生成并通过中性 contract 校验的 source-comment projection。
   *
   * @lang en Source-comment projection already produced by an owner producer and validated against the neutral contract.
   */
  sourceCommentProjection?: DocumentationSourceCommentProjection;
  /**
   * @lang zh-CN 可选的上游规范符号标识，用于层级关联。
   * @lang en Optional upstream canonical symbol identifier used for hierarchy linkage.
   */
  symbolId?: string;
  /**
   * @lang zh-CN 可选的领域语义层级，由上游显式提供。
   * @lang en Optional domain-semantic hierarchy explicitly supplied upstream.
   */
  hierarchy?: RenderProjectEntryHierarchyRef;
  /**
   * @lang zh-CN 可选的条目到文档源码映射关联摘要。
   * @lang en Optional summary linking the entry to a documentation source map.
   */
  docSourceMap?: RenderProjectEntryDocSourceMapRef;
  /**
   * @lang zh-CN 可选的条目级诊断集合。
   * @lang en Optional collection of entry-level diagnostics.
   */
  diagnostics?: HiaDiagnostic[];
  /**
   * @lang zh-CN manifest input 显式提供的 owner-reviewed semantic prefix。
   * @lang en Owner-reviewed semantic prefix explicitly supplied by the manifest input.
   */
  semanticPath?: DocumentationPortalSemanticPathSegment[];
}

/**
 * @lang zh-CN 领域 adapter 或 source relation 提供的稳定语义层级，renderer 只投影、不重新猜测语言语义。
 * @lang en Stable semantic hierarchy supplied by a domain adapter or source relation; the renderer only projects it.
 */
export interface RenderProjectEntryHierarchyRef {
  /**
   * @lang zh-CN 可选的所属程序集名称。
   * @lang en Optional containing assembly name.
   */
  assembly?: string;
  /**
   * @lang zh-CN 可选的所属命名空间。
   * @lang en Optional containing namespace.
   */
  namespace?: string;
  /**
   * @lang zh-CN 可选的所属类型名称或上游类型标识。
   * @lang en Optional containing type name or upstream type identifier.
   */
  containingType?: string;
  /**
   * @lang zh-CN 可选的领域文档符号标识，例如.NET文档ID。
   * @lang en Optional domain documentation-symbol identifier, such as a .NET documentation ID.
   */
  symbolDocumentationId?: string;
  /**
   * @lang zh-CN 可选的层级显示名称。
   * @lang en Optional hierarchy display name.
   */
  displayName?: string;
  /**
   * @lang zh-CN 可选的显式父符号标识，按条目symbolId解析父项。
   * @lang en Optional explicit parent-symbol identifier resolved against entry symbolId values.
   */
  parentSymbolId?: string;
  /**
   * @lang zh-CN 可选的基类型标识集合。
   * @lang en Optional collection of base-type identifiers.
   */
  baseTypeIds?: string[];
  /**
   * @lang zh-CN 可选的实现接口标识集合。
   * @lang en Optional collection of implemented-interface identifiers.
   */
  interfaceIds?: string[];
}

/**
 * @lang zh-CN 条目到文档源码映射的轻量关联及来源/产物摘要；不代替共享reader的范围/列单位精确查询。
 * @lang en Lightweight entry-to-documentation-map linkage and source/artifact summary, without replacing precise range/column-unit queries in the shared reader.
 */
export interface RenderProjectEntryDocSourceMapRef {
  /**
   * @lang zh-CN 可选的上游生成物匹配置信度标签。
   * @lang en Optional upstream generated-artifact match-confidence label.
   */
  artifactConfidence?: string;
  /**
   * @lang zh-CN 可选的关联生成物路径摘要。
   * @lang en Optional path summary of the associated generated artifact.
   */
  artifactPath?: string;
  /**
   * @lang zh-CN 可选的生成物节点选择器，仅作为定位元数据。
   * @lang en Optional generated-artifact node selector used only as location metadata.
   */
  artifactSelector?: string;
  /**
   * @lang zh-CN 可选的上游映射诊断码集合。
   * @lang en Optional collection of upstream mapping diagnostic codes.
   */
  diagnostics?: string[];
  /**
   * @lang zh-CN 被关联文档源码映射中的条目标识。
   * @lang en Entry identifier within the associated documentation source map.
   */
  entryId: string;
  /**
   * @lang zh-CN 文档源码映射工件的引用路径。
   * @lang en Reference path of the documentation source-map artifact.
   */
  path: string;
  /**
   * @lang zh-CN 可选的上游源码定位置信度标签。
   * @lang en Optional upstream source-location confidence label.
   */
  sourceConfidence?: string;
  /**
   * @lang zh-CN 可选的原始源码路径摘要。
   * @lang en Optional original-source path summary.
   */
  sourcePath?: string;
  /**
   * @lang zh-CN 可选的上游源码范围摘要，终点约定与列单位按对应映射契约解释。
   * @lang en Optional upstream source-range summary, with endpoint conventions and column units interpreted under the corresponding map contract.
   */
  sourceRange?: {
    /**
     * @lang zh-CN 范围的一基起始位置，由上游定位信息提供。
     * @lang en One-based start position of the range, supplied by upstream location metadata.
     */
    start: {
      /**
       * @lang zh-CN 上游提供的一基源码行号。
       * @lang en One-based source-line number supplied upstream.
       */
      line: number;
      /**
       * @lang zh-CN 上游提供的可选一基列号，列单位按对应来源契约解释。
       * @lang en Optional one-based column supplied upstream, with column units interpreted under the corresponding source contract.
       */
      column?: number
    };
    /**
     * @lang zh-CN 可选的范围结束位置，其终点语义由对应上游契约规定。
     * @lang en Optional range end position, whose endpoint semantics are defined by the corresponding upstream contract.
     */
    end?: {
      /**
       * @lang zh-CN 上游提供的一基源码行号。
       * @lang en One-based source-line number supplied upstream.
       */
      line: number;
      /**
       * @lang zh-CN 上游提供的可选一基列号，列单位按对应来源契约解释。
       * @lang en Optional one-based column supplied upstream, with column units interpreted under the corresponding source contract.
       */
      column?: number
    };
  };
  /**
   * @lang zh-CN 可选的源码范围来源标签，保留上游来源语义。
   * @lang en Optional source-range origin label preserving upstream provenance semantics.
   */
  sourceRangeSource?: string;
}

/**
 * @lang zh-CN 输入工件的kind/path及可选精确契约引用，仅作溯源，不读取或自动迁移所指文件。
 * @lang en Input-artifact kind/path and optional exact contract reference for provenance only, without reading or automatically migrating the referenced file.
 */
export interface RenderProjectInputRef {
  /**
   * @lang zh-CN 输入工件类别标签。
   * @lang en Input-artifact kind label.
   */
  kind: string;
  /**
   * @lang zh-CN 来源输入工件的路径元数据。
   * @lang en Path metadata of the originating input artifact.
   */
  path: string;
  /**
   * @lang zh-CN 可选的稳定输入工件标识。
   * @lang en Optional stable input-artifact identifier.
   */
  artifactId?: string;
  /**
   * @lang zh-CN 可选的输入工件契约名称。
   * @lang en Optional input-artifact contract name.
   */
  contract?: string;
  /**
   * @lang zh-CN 可选的输入工件精确版本标签。
   * @lang en Optional exact version label of the input artifact.
   */
  contractVersion?: string;
}

/**
 * @lang zh-CN 源码定位和已授权公开资产/预览的输入引用；本地path不自动公开正文，fetch/link使用构建生成的同源资产。
 * @lang en Source-location reference and authorized public asset/preview inputs; a local path never automatically discloses bodies, and fetch/link use build-generated same-origin assets.
 */
export interface RenderProjectSourceRef {
  /**
   * @lang zh-CN 可选的上游源码引用置信度标签。
   * @lang en Optional upstream source-reference confidence label.
   */
  confidence?: string;
  /**
   * @lang zh-CN 构建期生成的同源纯文本资源URL；调用方旧URL在源码策略阶段被剥离。
   * @lang en Build-generated same-origin plain-text asset URL, with legacy caller URLs stripped during source-policy processing.
   */
  fetchUrl?: string;
  /**
   * @lang zh-CN 可选的fetch触发方式，项目级配置优先，缺省为on-expand。
   * @lang en Optional fetch trigger, overridden by project-level configuration and defaulting to on-expand.
   */
  fetchTrigger?: RenderProjectSourceFetchTrigger;
  /**
   * @lang zh-CN 可选的fetch显示行数上限，项目级配置优先，缺省为400。
   * @lang en Optional fetched-source display line limit, overridden by project-level configuration and defaulting to 400.
   */
  fetchMaxLines?: number;
  /**
   * @lang zh-CN 可选的源码语言标签。
   * @lang en Optional source-language label.
   */
  language?: string;
  /**
   * @lang zh-CN 构建期生成的同源源码查看链接；调用方旧外链在源码策略阶段被剥离。
   * @lang en Build-generated same-origin source-view link, with legacy caller external links stripped during source-policy processing.
   */
  linkUrl?: string;
  /**
   * @lang zh-CN 用于公开位置显示及稳定源码身份构造的路径元数据。
   * @lang en Path metadata used for public location display and stable source-identity construction.
   */
  path: string;
  /**
   * @lang zh-CN renderer 构造的 body-free public asset metadata；正文只存在于单独静态文件。
   * @lang en Body-free public-asset metadata built by the renderer; the body exists only in a separate static file.
   */
  publicAsset?: PortalPreparedSourceAsset;
  /**
   * @lang zh-CN 可选的调用方源码预览正文及范围，须遵守公开授权与呈现策略。
   * @lang en Optional caller-supplied source-preview body and range, subject to disclosure authorization and presentation policy.
   */
  preview?: RenderProjectSourcePreviewRef;
  /**
   * @lang zh-CN 可选的上游源码位置范围摘要，独立于预览正文范围。
   * @lang en Optional upstream source-location range summary, independent of the preview body's range.
   */
  range?: {
    /**
     * @lang zh-CN 范围的一基起始位置，由上游定位信息提供。
     * @lang en One-based start position of the range, supplied by upstream location metadata.
     */
    start: {
      /**
       * @lang zh-CN 上游提供的一基源码行号。
       * @lang en One-based source-line number supplied upstream.
       */
      line: number;
      /**
       * @lang zh-CN 上游提供的可选一基列号，列单位按对应来源契约解释。
       * @lang en Optional one-based column supplied upstream, with column units interpreted under the corresponding source contract.
       */
      column?: number
    };
    /**
     * @lang zh-CN 可选的范围结束位置，其终点语义由对应上游契约规定。
     * @lang en Optional range end position, whose endpoint semantics are defined by the corresponding upstream contract.
     */
    end?: {
      /**
       * @lang zh-CN 上游提供的一基源码行号。
       * @lang en One-based source-line number supplied upstream.
       */
      line: number;
      /**
       * @lang zh-CN 上游提供的可选一基列号，列单位按对应来源契约解释。
       * @lang en Optional one-based column supplied upstream, with column units interpreted under the corresponding source contract.
       */
      column?: number
    };
  };
  /**
   * @lang zh-CN 可选的源码位置范围来源标签。
   * @lang en Optional provenance label for the source-location range.
   */
  rangeSource?: string;
}

/**
 * @lang zh-CN 项目相对 source identity；ID 与 path 均由 owner producer 解析，不能由 display label、locale 或绝对路径推导。
 * @lang en Project-relative source identity; both ID and path are owner-producer resolved and must not derive from a display label, locale, or absolute path.
 */
export interface RenderProjectSourceProjectIdentityRef {
  /**
   * @lang zh-CN owner producer 生成的稳定 project ID。
   * @lang en Stable project ID generated by the owner producer.
   */
  id: string;
  /**
   * @lang zh-CN 工作区相对 `.csproj` path；不得为绝对路径。
   * @lang en Workspace-relative `.csproj` path; never an absolute path.
   */
  path: string;
  /**
   * @lang zh-CN 生成 ID/path 的 identity policy。
   * @lang en Identity policy used to produce the ID and path.
   */
  policy: string;
}

/**
 * @lang zh-CN source relation 的有界 Portal 投影；resolution、confidence 与 provenance 保持独立，privacy 固定为 metadata-only。
 * @lang en Bounded Portal projection of a source relation; resolution, confidence, and provenance remain independent while privacy stays metadata-only.
 */
export interface RenderProjectSourceUsabilityRef {
  /**
   * @lang zh-CN 上游 relation artifact 中的稳定 relation ID。
   * @lang en Stable relation ID from the upstream relation artifact.
   */
  relationId: string;
  /**
   * @lang zh-CN 引用是否已解析；与 confidence、provenance 独立。
   * @lang en Whether the reference resolved; independent from confidence and provenance.
   */
  resolution: string;
  /**
   * @lang zh-CN relation 可信度；不替代 resolution。
   * @lang en Relation confidence; it does not replace resolution.
   */
  confidence: string;
  /**
   * @lang zh-CN 产生 relation 的 producer、activity 与 contract identity。
   * @lang en Producer, activity, and contract identity that created the relation.
   */
  provenance: {
    /**
     * @lang zh-CN 生成上游源码关系的生产器标识。
     * @lang en Identifier of the producer that generated the upstream source relation.
     */
    producer: string;
    /**
     * @lang zh-CN 生成上游源码关系的活动标识。
     * @lang en Identifier of the activity that generated the upstream source relation.
     */
    activity: string;
    /**
     * @lang zh-CN 上游源码关系来源契约名称。
     * @lang en Contract name of the upstream source-relation provenance.
     */
    contract: string;
    /**
     * @lang zh-CN 上游源码关系来源契约的版本标签。
     * @lang en Version label of the upstream source-relation provenance contract.
     */
    contractVersion: string;
  };
  /**
   * @lang zh-CN projectPath 驱动时存在的稳定项目身份。
   * @lang en Stable project identity present when projectPath drove extraction.
   */
  projectIdentity?: RenderProjectSourceProjectIdentityRef;
  /**
   * @lang zh-CN Portal 投影的固定 metadata-only privacy boundary。
   * @lang en Fixed metadata-only privacy boundary of the Portal projection.
   */
  privacy: {
    /**
     * @lang zh-CN 固定为none，此可用性投影不携带sourcesContent。
     * @lang en Fixed to none, excluding sourcesContent from this usability projection.
     */
    sourcesContentPolicy: "none";
    /**
     * @lang zh-CN 固定为none，此可用性投影不提供源码预览正文。
     * @lang en Fixed to none, excluding source-preview bodies from this usability projection.
     */
    sourcePreviewPolicy: "none";
    /**
     * @lang zh-CN 固定为false，此可用性投影不嵌入源码正文。
     * @lang en Fixed to false, preventing this usability projection from embedding source bodies.
     */
    embedsSourcesContent: false;
  };
}

/**
 * @lang zh-CN 调用方提供的源码预览正文、语言和一基范围；存在该结构不等于已获公开授权。
 * @lang en Caller-provided source-preview body, language and one-based range; its presence is not disclosure authorization.
 */
export interface RenderProjectSourcePreviewRef {
  /**
   * @lang zh-CN 调用方在内存中提供的预览正文，仅按显式源码策略消费并转义呈现。
   * @lang en Preview body supplied in memory by the caller, consumed only under explicit source policy and rendered with escaping.
   */
  content: string;
  /**
   * @lang zh-CN 可选的内嵌预览默认展开状态，项目级defaultExpanded优先。
   * @lang en Optional default expansion state of an embedded preview, overridden by project-level defaultExpanded.
   */
  defaultExpanded?: boolean;
  /**
   * @lang zh-CN 可选的预览代码语言标签。
   * @lang en Optional language label for the preview code.
   */
  language?: string;
  /**
   * @lang zh-CN 可选的预览原始位置范围，用于内嵌预览标题与行号，同源查看页定位另取source.range。
   * @lang en Optional original-location range of the preview, used for embedded-preview captions and line numbers, while same-origin viewer positioning uses source.range.
   */
  range?: {
    /**
     * @lang zh-CN 范围的一基起始位置，由上游定位信息提供。
     * @lang en One-based start position of the range, supplied by upstream location metadata.
     */
    start: {
      /**
       * @lang zh-CN 上游提供的一基源码行号。
       * @lang en One-based source-line number supplied upstream.
       */
      line: number;
      /**
       * @lang zh-CN 上游提供的可选一基列号，列单位按对应来源契约解释。
       * @lang en Optional one-based column supplied upstream, with column units interpreted under the corresponding source contract.
       */
      column?: number
    };
    /**
     * @lang zh-CN 可选的范围结束位置，其终点语义由对应上游契约规定。
     * @lang en Optional range end position, whose endpoint semantics are defined by the corresponding upstream contract.
     */
    end?: {
      /**
       * @lang zh-CN 上游提供的一基源码行号。
       * @lang en One-based source-line number supplied upstream.
       */
      line: number;
      /**
       * @lang zh-CN 上游提供的可选一基列号，列单位按对应来源契约解释。
       * @lang en Optional one-based column supplied upstream, with column units interpreted under the corresponding source contract.
       */
      column?: number
    };
  };
}

/**
 * @lang zh-CN 渲染后的内存文件、诊断和manifest；宿主负责按许可写入与部署，调用前后不获得新的执行权限。
 * @lang en Rendered in-memory files, diagnostics and manifest; hosts own authorized writing/deployment and gain no new execution authority.
 */
export interface RenderHtmlResult {
  /**
   * @lang zh-CN 本次渲染返回的有序内存文件集合，宿主负责实际写入。
   * @lang en Ordered in-memory files returned by this render, with actual writes owned by the host.
   */
  files: RenderedHtmlFile[];
  /**
   * @lang zh-CN 对应渲染入口返回的文档诊断，或合并后的项目输入与呈现资源诊断。
   * @lang en Document diagnostics returned by the document-rendering entry point, or combined project-input and presentation-asset diagnostics for project rendering.
   */
  diagnostics: HiaDiagnostic[];
  /**
   * @lang zh-CN 登记本次输出文件元数据及可选项目引用的清单。
   * @lang en Manifest recording this render's output-file metadata and optional project references.
   */
  manifest: RenderHtmlManifest;
}

/**
 * @lang zh-CN 一个文件的写入者；Promise完成前不生成下一页。不要求保留传入文件，失败会停止输出。
 * @lang en Writer for one file; no next page is generated before its promise resolves. Retaining files is unnecessary, and failures stop output.
 * @param file <lang><zh-CN>安全相对路径的完整单文件；写入者负责输出目录。</zh-CN><en>One complete file with a safe relative path; the writer owns the output directory.</en></lang>
 * @returns <lang><zh-CN>同步完成或表示写入已完成的Promise。</zh-CN><en>Synchronous completion or a promise indicating the write completed.</en></lang>
 */
export type RenderHtmlFileWriter = (file: RenderedHtmlFile) => void | Promise<void>;

/**
 * @lang zh-CN 逐文件渲染的无正文结果；索引/输入metadata仍随条目数增长。
 * @lang en Body-free result of per-file rendering; index/input metadata still grows with entry count.
 */
export interface RenderHtmlWriteResult {
  /**
   * @lang zh-CN 已成功交给写入者的文件数，error诊断时为零。
   * @lang en Files successfully handed to the writer; zero for error diagnostics.
   */
  fileCount: number;
  /**
   * @lang zh-CN 与普通API相同的诊断，不改变失败严重度。
   * @lang en Same diagnostics as the ordinary API, without changing failure severity.
   */
  diagnostics: HiaDiagnostic[];
  /**
   * @lang zh-CN 仅文件清单/项目metadata，不含文件正文。
   * @lang en File inventory/project metadata only, without file bodies.
   */
  manifest: RenderHtmlManifest;
}

/**
 * @lang zh-CN 本次输出文件及项目引用的body-free清单；只登记本次拥有的文件，不伪报外部共享资源或真实发布状态。
 * @lang en Body-free inventory of output files and project references, listing only files owned by this build rather than external shared assets or actual publication status.
 */
export interface RenderHtmlManifest {
  /**
   * @lang zh-CN 固定的HTML渲染输出清单版本0.1.0。
   * @lang en Fixed HTML render-output manifest version 0.1.0.
   */
  schemaVersion: typeof HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION;
  /**
   * @lang zh-CN 固定的渲染器包标识@hia-doc/renderer-html。
   * @lang en Fixed renderer-package identifier @hia-doc/renderer-html.
   */
  renderer: "@hia-doc/renderer-html";
  /**
   * @lang zh-CN 单文档身份或项目输出解析后的项目身份。
   * @lang en Document identity for a document render or resolved project identity for project output.
   */
  documentId: string;
  /**
   * @lang zh-CN 本次渲染解析后的页面标题。
   * @lang en Resolved page title for this render.
   */
  title: string;
  /**
   * @lang zh-CN 本次输出固定的index.html入口路径。
   * @lang en Fixed index.html entrypoint path for this output.
   */
  entrypoint: string;
  /**
   * @lang zh-CN 本次选定的初始正文语言，独立于Portal界面语言。
   * @lang en Initial content locale selected for this render, independent of Portal UI locale.
   */
  initialLocale: string;
  /**
   * @lang zh-CN 本次输出可切换的正文语言清单。
   * @lang en List of content locales available for switching in this output.
   */
  locales: string[];
  /**
   * @lang zh-CN 本次拥有的文件路径、角色与媒体类型，不包含文件正文。
   * @lang en Paths, roles and media types of files owned by this render, without file contents.
   */
  files: RenderHtmlManifestFile[];
  /**
   * @lang zh-CN 项目输出附加的项目元数据及导航、映射和投影引用。
   * @lang en Project metadata and navigation, mapping and projection references attached to project output.
   */
  project?: {
    /**
     * @lang zh-CN 项目解析后的稳定标识，与清单documentId一致。
     * @lang en Resolved stable project identifier, matching the manifest documentId.
     */
    id: string;
    /**
     * @lang zh-CN 调用方提供的公开项目名称。
     * @lang en Public project name supplied by the caller.
     */
    name: string;
    /**
     * @lang zh-CN 本项目条目实际涉及的领域视图清单，包含汇总all视图。
     * @lang en Domain views represented by project entries, including the aggregate all view.
     */
    views: RenderProjectView[];
    /**
     * @lang zh-CN 按领域视图累计的条目计数记录，all以条目总数初始化。
     * @lang en Entry-count records accumulated by domain view, with all initialized to the total entry count.
     */
    entryCounts: Record<string, number>;
    /**
     * @lang zh-CN 可选的产品版本元数据，保持与文档路由独立。
     * @lang en Optional product-version metadata, independent of documentation routing.
     */
    productVersion?: string;
    /**
     * @lang zh-CN 指向project-index.json的导航契约身份及条目计数引用。
     * @lang en Navigation contract identity and entry-count reference pointing to project-index.json.
     */
    navigationIndex?: RenderProjectNavigationIndexRef;
    /**
     * @lang zh-CN 可选的项目级文档化配置规范引用集合。
     * @lang en Optional collection of project-level documentation-profile references.
     */
    profiles?: RenderProjectProfileRef[];
    /**
     * @lang zh-CN 可选的项目文档源码映射引用及摘要集合。
     * @lang en Optional project documentation source-map references and summaries.
     */
    docSourceMaps?: RenderProjectDocSourceMapRef[];
    /**
     * @lang zh-CN 可选的生成式文档绑定投影最小引用，完整投影位于项目索引。
     * @lang en Optional minimal reference to the generated-documentation-binding projection, whose full projection resides in the project index.
     */
    generatedDocumentationBindingProjection?: RenderProjectGeneratedDocumentationBindingProjectionRef;
    /**
     * @lang zh-CN `project-index.json` 内业务流程双投影的 body-free 引用。
     * @lang en Body-free reference to the business-flow dual projection in `project-index.json`.
     */
    businessFlowDocumentationProjection?: RenderProjectBusinessFlowDocumentationProjectionRef;
    /**
     * @lang zh-CN 可选的非空项目关系图计数引用，完整图位于项目索引。
     * @lang en Optional count reference to a non-empty project relation graph, whose full graph resides in the project index.
     */
    relationGraph?: RenderProjectRelationGraphRef;
    /**
     * @lang zh-CN 显式启用时附加的已解析Portal信息架构契约。
     * @lang en Resolved Portal information-architecture contract attached when explicitly enabled.
     */
    informationArchitecture?: DocumentationPortalInformationArchitectureContract;
    /**
     * @lang zh-CN W-P123 metadata-only report 的 body-free 引用。
     * @lang en Body-free reference to the W-P123 metadata-only report.
     */
    uiLocaleCompleteness?: RenderProjectUiLocaleCompletenessRef;
    /**
     * @lang zh-CN 当前静态资源采用的 metadata-only theme reference。
     * @lang en Metadata-only theme reference used by the current static assets.
     */
    theme?: DocumentationPortalThemeReference;
    /**
     * @lang zh-CN neutral presentation profile 的最小引用。
     * @lang en Minimal reference to the neutral presentation profile.
     */
    presentationProfile?: RenderProjectPresentationProfileRef;
  };
}

/**
 * @lang zh-CN manifest/index 共享的 UI locale completeness body-free 引用。
 * @lang en UI-locale-completeness body-free reference shared by the manifest and project index.
 */
export interface RenderProjectUiLocaleCompletenessRef {
  /**
   * @lang zh-CN 被引用界面语言完整性报告的契约名称。
   * @lang en Contract name of the referenced UI-locale completeness report.
   */
  contract: DocumentationUiLocaleCompletenessReport["contract"];
  /**
   * @lang zh-CN 被引用报告的精确版本，当前Portal写者生成1.0.0。
   * @lang en Exact version of the referenced report, with the current Portal writer generating 1.0.0.
   */
  contractVersion: DocumentationUiLocaleCompletenessReport["contractVersion"];
  /**
   * @lang zh-CN 报告展开后的界面面、执行模式与语言评估数量。
   * @lang en Number of expanded surface, execution-mode and locale evaluations in the report.
   */
  evaluationCount: number;
  /**
   * @lang zh-CN 报告全部评估中精确语言命中的要求结果总数。
   * @lang en Total exact-locale requirement matches across all report evaluations.
   */
  exactCount: number;
  /**
   * @lang zh-CN 固定的documentation-ui-locale-completeness.json报告路径。
   * @lang en Fixed documentation-ui-locale-completeness.json report path.
   */
  path: typeof DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH;
  /**
   * @lang zh-CN 被评估Portal profile的稳定标识。
   * @lang en Stable identifier of the evaluated Portal profile.
   */
  profileId: string;
  /**
   * @lang zh-CN 被引用报告的完整性状态，当前Portal写者要求complete。
   * @lang en Completeness state of the referenced report, required to be complete by the current Portal writer.
   */
  status: DocumentationUiLocaleCompletenessReport["status"];
  /**
   * @lang zh-CN 本次Portal评估的界面面标识。
   * @lang en Surface identifier evaluated for this Portal render.
   */
  surfaceId: string;
  /**
   * @lang zh-CN 报告覆盖的显式界面语言数量。
   * @lang en Number of explicit UI locales covered by the report.
   */
  uiLocaleCount: number;
}

/**
 * @lang zh-CN 输出清单中的相对路径、文件角色与MIME，不包含正文或文件系统写入权限。
 * @lang en Relative path, file role and MIME in an output inventory, without contents or filesystem-write authority.
 */
export interface RenderHtmlManifestFile {
  /**
   * @lang zh-CN 相对于本次输出根目录的文件路径。
   * @lang en File path relative to this render's output root.
   */
  path: string;
  /**
   * @lang zh-CN 被登记文件的entry、asset或index角色。
   * @lang en Entry, asset or index role of the recorded file.
   */
  role: RenderedHtmlFile["role"];
  /**
   * @lang zh-CN 被登记文件的媒体类型及适用字符集。
   * @lang en Media type and applicable character encoding of the recorded file.
   */
  contentType: string;
}

/**
 * @lang zh-CN renderer 输出中项目导航索引的位置与兼容性标识。
 * @lang en Location and compatibility identity for the project navigation index emitted by the renderer.
 */
export interface RenderProjectNavigationIndexRef {
  /**
   * @lang zh-CN 固定的hia-project-navigation-index契约名称。
   * @lang en Fixed hia-project-navigation-index contract name.
   */
  contract: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT;
  /**
   * @lang zh-CN 固定的0.1.0-draft导航索引版本。
   * @lang en Fixed 0.1.0-draft navigation-index version.
   */
  contractVersion: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION | typeof HIA_PROJECT_SCOPED_NAVIGATION_INDEX_CONTRACT_VERSION;
  /**
   * @lang zh-CN 被引用导航索引中条目记录的数量。
   * @lang en Number of entry records in the referenced navigation index.
   */
  entryCount: number;
  /**
   * @lang zh-CN 被引用项目导航索引的输出相对路径，当前写入project-index.json。
   * @lang en Output-relative path of the referenced project navigation index, currently written as project-index.json.
   */
  path: string;
}

/**
 * @lang zh-CN manifest/index 指向 neutral presentation profile 的 body-free 引用。
 * @lang en Body-free manifest/index reference to the neutral presentation profile.
 */
export interface RenderProjectPresentationProfileRef {
  /**
   * @lang zh-CN 被引用中性呈现profile的契约名称。
   * @lang en Contract name of the referenced neutral presentation profile.
   */
  contract: string;
  /**
   * @lang zh-CN 被引用呈现profile的精确版本标签。
   * @lang en Exact version label of the referenced presentation profile.
   */
  contractVersion: string;
  /**
   * @lang zh-CN 固定的documentation-presentation-profile.json路径。
   * @lang en Fixed documentation-presentation-profile.json path.
   */
  path: typeof PORTAL_PRESENTATION_PROFILE_PATH;
  /**
   * @lang zh-CN 被引用呈现profile的稳定标识。
   * @lang en Stable identifier of the referenced presentation profile.
   */
  profileId: string;
  /**
   * @lang zh-CN 被引用profile的ready或refused状态，按资源级策略消费。
   * @lang en Ready or refused state of the referenced profile, consumed under per-asset policies.
   */
  status: "ready" | "refused";
}

/**
 * @lang zh-CN renderer manifest 中 relation graph 的摘要引用，避免主 manifest 直接内嵌完整图。
 * @lang en Summary reference to the relation graph in the renderer manifest, avoiding full graph embedding in the main manifest.
 */
export interface RenderProjectRelationGraphRef {
  /**
   * @lang zh-CN 被引用项目关系图的hia-project-relation-graph契约名称。
   * @lang en Hia-project-relation-graph contract name of the referenced project relation graph.
   */
  contract: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT;
  /**
   * @lang zh-CN 被引用项目关系图的0.1.0-draft版本。
   * @lang en 0.1.0-draft version of the referenced project relation graph.
   */
  contractVersion: typeof HIA_PROJECT_RELATION_GRAPH_CONTRACT_VERSION;
  /**
   * @lang zh-CN 规范关系图中节点的数量。
   * @lang en Number of nodes in the normalized relation graph.
   */
  nodeCount: number;
  /**
   * @lang zh-CN 规范关系图中有向关系的数量。
   * @lang en Number of directed relations in the normalized relation graph.
   */
  relationCount: number;
  /**
   * @lang zh-CN 完整关系图所在的项目索引引用路径。
   * @lang en Project-index reference path containing the full relation graph.
   */
  path: string;
}

/**
 * @lang zh-CN renderer manifest 中 generated binding relation 投影的最小引用。
 * @lang en Minimal generated-binding relation projection reference in the renderer manifest.
 */
export interface RenderProjectGeneratedDocumentationBindingProjectionRef {
  /**
   * @lang zh-CN 被引用生成式文档绑定投影摘要中的绑定数量。
   * @lang en Binding count from the referenced generated-documentation-binding projection summary.
   */
  bindingCount: number;
  /**
   * @lang zh-CN 被引用绑定投影的契约名称。
   * @lang en Contract name of the referenced binding projection.
   */
  contract: string;
  /**
   * @lang zh-CN 被引用绑定投影的精确版本标签。
   * @lang en Exact version label of the referenced binding projection.
   */
  contractVersion: string;
  /**
   * @lang zh-CN 完整绑定投影所在的项目索引引用路径。
   * @lang en Project-index reference path containing the full binding projection.
   */
  path: string;
  /**
   * @lang zh-CN 上游绑定投影提供的状态标签。
   * @lang en Status label supplied by the upstream binding projection.
   */
  status: string;
  /**
   * @lang zh-CN 被引用绑定投影摘要中的目标数量。
   * @lang en Target count from the referenced binding projection summary.
   */
  targetCount: number;
}

/**
 * @lang zh-CN renderer manifest 对 public business-flow projection 的 body-free 引用与可审计计数；完整 payload 只存在于 project index。
 *
 * @lang en Body-free renderer-manifest reference and auditable counts for a public business-flow projection; the full payload exists only in the project index.
 */
export interface RenderProjectBusinessFlowDocumentationProjectionRef {
  /**
   * @lang zh-CN 固定的business-flow-documentation-projection契约名称。
   * @lang en Fixed business-flow-documentation-projection contract name.
   */
  contract: "business-flow-documentation-projection";
  /**
   * @lang zh-CN 固定的0.1.0-draft业务流程投影版本。
   * @lang en Fixed 0.1.0-draft business-flow projection version.
   */
  contractVersion: "0.1.0-draft";
  /**
   * @lang zh-CN 共享事实中的已选公开流程数量。
   * @lang en Number of selected public flows in shared facts.
   */
  flowCount: number;
  /**
   * @lang zh-CN 全部人读线性视图的控制节点项总数。
   * @lang en Total control-node items across all human-linear views.
   */
  humanItemCount: number;
  /**
   * @lang zh-CN 共享事实中控制、角色与工件节点的总数。
   * @lang en Total control, role and artifact nodes in shared facts.
   */
  nodeCount: number;
  /**
   * @lang zh-CN 固定为project-index.json，完整业务流程投影位于该索引。
   * @lang en Fixed to project-index.json, where the full business-flow projection resides.
   */
  path: "project-index.json";
  /**
   * @lang zh-CN 共享事实中控制、责任与数据关系的总数。
   * @lang en Total control, responsibility and data relations in shared facts.
   */
  relationCount: number;
}

/**
 * @lang zh-CN 供 portal 使用的、无 HTML 表示细节的项目入口索引。
 * @lang en Project entry index without HTML presentation details, intended for portal consumption.
 */
export interface RenderProjectNavigationIndex {
  /**
   * @lang zh-CN 固定的hia-project-navigation-index契约名称。
   * @lang en Fixed hia-project-navigation-index contract name.
   */
  contract: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT;
  /**
   * @lang zh-CN 固定的0.1.0-draft导航索引版本。
   * @lang en Fixed 0.1.0-draft navigation-index version.
   */
  contractVersion: typeof HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION | typeof HIA_PROJECT_SCOPED_NAVIGATION_INDEX_CONTRACT_VERSION;
  /**
   * @lang zh-CN 本次输出解析后的项目身份、标题、正文语言及领域统计。
   * @lang en Project identity, title, content locales and domain counts resolved for this output.
   */
  project: {
    /**
     * @lang zh-CN 写入索引的本次初始正文语言，采用渲染选定语言。
     * @lang en Initial content locale recorded in the index, using the locale selected for this render.
     */
    defaultLocale: string;
    /**
     * @lang zh-CN 按领域视图累计的条目计数记录，all以条目总数初始化。
     * @lang en Entry-count records accumulated by domain view, with all initialized to the total entry count.
     */
    entryCounts: Record<string, number>;
    /**
     * @lang zh-CN 本次输出解析后的稳定项目标识。
     * @lang en Stable project identifier resolved for this output.
     */
    id: string;
    /**
     * @lang zh-CN 初始选定、项目声明及条目字段推导语言合并去重后的正文语言清单。
     * @lang en Deduplicated content-locale list combining the initially selected locale, project declarations and locales inferred from entry fields.
     */
    locales: string[];
    /**
     * @lang zh-CN 调用方提供的公开项目名称。
     * @lang en Public project name supplied by the caller.
     */
    name: string;
    /**
     * @lang zh-CN 本次渲染解析后的项目页面标题。
     * @lang en Project-page title resolved for this render.
     */
    title: string;
    /**
     * @lang zh-CN 实际条目涉及的领域视图清单，包含all汇总视图。
     * @lang en Domain views represented by actual entries, including the aggregate all view.
     */
    views: RenderProjectView[];
    /**
     * @lang zh-CN 可选的产品版本元数据，保持与路由身份独立。
     * @lang en Optional product-version metadata, independent of routing identity.
     */
    productVersion?: string;
  };
  /**
   * @lang zh-CN 按稳定显示顺序排列的可导航文档条目元数据。
   * @lang en Navigable documentation-entry metadata arranged in stable display order.
   */
  entries: RenderProjectNavigationEntry[];
  /**
   * @lang zh-CN 按条目类别、配置层和源码根生成的分组统计。
   * @lang en Group statistics generated by entry kind, profile layer and source root.
   */
  groups: RenderProjectNavigationGroup[];
  /**
   * @lang zh-CN 按领域及已声明语义层级生成的完整导航树。
   * @lang en Complete navigation tree generated from domains and declared semantic hierarchy.
   */
  navigationTree: RenderProjectNavigationTreeNode[];
  /**
   * @lang zh-CN 调用方项目级配置规范引用的排序副本，缺省为空数组。
   * @lang en Sorted copy of caller-supplied project-level profile references, defaulting to an empty array.
   */
  profiles: RenderProjectProfileRef[];
  /**
   * @lang zh-CN 调用方项目级文档源码映射引用的排序副本，缺省为空数组。
   * @lang en Sorted copy of caller-supplied project-level documentation-map references, defaulting to an empty array.
   */
  docSourceMaps: RenderProjectDocSourceMapRef[];
  /**
   * @lang zh-CN 可选的完整生成式文档绑定宿主投影。
   * @lang en Optional full generated-documentation-binding host projection.
   */
  generatedDocumentationBindingProjection?: GeneratedDocumentationBindingHostProjection;
  /**
   * @lang zh-CN 可选的已通过摘要结构与计数校验的连续性元数据。
   * @lang en Optional continuity metadata that passed summary-shape and count validation.
   */
  documentationContinuity?: RenderProjectDocumentationContinuitySummary;
  /**
   * @lang zh-CN 可选的负责人审阅准备度元数据，仅显式Portal信息架构消费。
   * @lang en Optional owner-review readiness metadata consumed only under explicit Portal information architecture.
   */
  ownerAdoption?: RenderProjectOwnerAdoptionSummary;
  /**
   * @lang zh-CN exact-valid public human/AI 双投影；可见表示等待独立设计基线。
   * @lang en Exact-valid public human/AI dual projection whose visible representation awaits an independent design baseline.
   */
  businessFlowDocumentationProjection?: BusinessFlowDocumentationProjection;
  /**
   * @lang zh-CN 可选的完整非空规范项目关系图。
   * @lang en Optional full non-empty normalized project relation graph.
   */
  relationGraph?: RenderProjectRelationGraph;
  /**
   * @lang zh-CN 本次站点布局、源码策略及呈现/主题引用，含可选分片路径。
   * @lang en Site layout, source policy and presentation/theme references for this render, including optional shard paths.
   */
  site?: {
    /**
     * @lang zh-CN 本次项目输出采用的split-site或single-page布局。
     * @lang en Split-site or single-page layout used for this project output.
     */
    layout: RenderProjectSiteLayout;
    /**
     * @lang zh-CN split-site导航根分片的可选输出路径。
     * @lang en Optional output path of the split-site navigation root shard.
     */
    navigationRootPath?: string;
    /**
     * @lang zh-CN split-site搜索索引的可选输出路径。
     * @lang en Optional output path of the split-site search index.
     */
    searchIndexPath?: string;
    /**
     * @lang zh-CN split-site关系索引的可选输出路径。
     * @lang en Optional output path of the split-site relation index.
     */
    relationIndexPath?: string;
    /**
     * @lang zh-CN 本次输出解析后的源码呈现策略，缺省为fetch。
     * @lang en Resolved source-presentation policy for this output, defaulting to fetch.
     */
    sourcePresentation: RenderProjectSourcePresentation;
    /**
     * @lang zh-CN 当前中性呈现profile的最小契约引用。
     * @lang en Minimal contract reference to the current neutral presentation profile.
     */
    presentationProfile: RenderProjectPresentationProfileRef;
    /**
     * @lang zh-CN 显式启用时记录的已解析Portal信息架构契约。
     * @lang en Resolved Portal information-architecture contract recorded when explicitly enabled.
     */
    informationArchitecture?: DocumentationPortalInformationArchitectureContract;
    /**
     * @lang zh-CN 当前 Portal surface 的 W-P123 report 引用。
     * @lang en W-P123 report reference for the current Portal surface.
     */
    uiLocaleCompleteness?: RenderProjectUiLocaleCompletenessRef;
    /**
     * @lang zh-CN Portal consumer 的 exact theme identity 与 system preference policy。
     * @lang en Exact theme identity and system-preference policy for portal consumers.
     */
    theme: DocumentationPortalThemeReference;
  };
}

/**
 * @lang zh-CN 按类型、配置层或源码根聚合的导航分组闭集，不改变条目canonical身份。
 * @lang en Closed navigation grouping by kind, profile layer or source root, without changing canonical entry identities.
 */
export type RenderProjectNavigationGroupKind = "kind" | "profile-layer" | "source-root";

/**
 * @lang zh-CN 大型项目导航索引中的轻量分组统计，用于门户、侧栏和后续大项目导航策略。
 * @lang en Lightweight group statistics in the large-project navigation index for portals, sidebars, and future navigation strategies.
 */
export interface RenderProjectNavigationGroup {
  /**
   * @lang zh-CN 导航分组的稳定标识。
   * @lang en Stable identifier of the navigation group.
   */
  id: string;
  /**
   * @lang zh-CN 按条目类别、配置层或源码根划分的分组类别。
   * @lang en Grouping kind based on entry kind, profile layer or source root.
   */
  kind: RenderProjectNavigationGroupKind;
  /**
   * @lang zh-CN 导航分组的可公开显示标签。
   * @lang en Public display label of the navigation group.
   */
  label: string;
  /**
   * @lang zh-CN 该分组关联的文档条目数量。
   * @lang en Number of documentation entries associated with the group.
   */
  entryCount: number;
  /**
   * @lang zh-CN 该分组条目实际涉及的领域视图。
   * @lang en Domain views represented by entries in the group.
   */
  views: RenderProjectView[];
}

/**
 * @lang zh-CN 项目导航树节点类别闭集，仅表示已有层级，不额外推断语言命名空间或文件结构。
 * @lang en Closed project navigation-tree node kinds representing supplied hierarchy without inferring language namespaces or filesystem structure.
 */
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
 * @lang zh-CN 项目级层级导航节点；用于把大型项目从平铺列表提升为可分域浏览的 API / 文件结构。
 * @lang en Project-level hierarchy node; it lifts large projects from a flat list into domain-aware API and file navigation.
 */
export interface RenderProjectNavigationTreeNode {
  /**
   * @lang zh-CN 层级导航节点的稳定引用标识。
   * @lang en Stable reference identifier of the hierarchy-navigation node.
   */
  id: string;
  /**
   * @lang zh-CN 节点在领域、语义层级、源码或条目结构中的类别。
   * @lang en Node kind within the domain, semantic hierarchy, source or entry structure.
   */
  kind: RenderProjectNavigationTreeNodeKind;
  /**
   * @lang zh-CN 节点的可公开显示标签。
   * @lang en Public display label of the node.
   */
  label: string;
  /**
   * @lang zh-CN 节点关联的文档条目数量。
   * @lang en Number of documentation entries associated with the node.
   */
  entryCount: number;
  /**
   * @lang zh-CN 节点覆盖的领域视图清单。
   * @lang en Domain views covered by the node.
   */
  views: RenderProjectView[];
  /**
   * @lang zh-CN 完整树中可内嵌的子节点集合。
   * @lang en Child-node collection that may be embedded in the complete tree.
   */
  children?: RenderProjectNavigationTreeNode[];
  /**
   * @lang zh-CN 延迟导航分片中指向子节点JSON的可选路径。
   * @lang en Optional path to child-node JSON in lazy navigation shards.
   */
  childrenPath?: string;
  /**
   * @lang zh-CN 可选的规范条目片段路径，由条目标识派生。
   * @lang en Optional canonical entry-fragment path derived from the entry identifier.
   */
  contentPath?: string;
  /**
   * @lang zh-CN 显式信息架构下的可选附加呈现路径，供实际加载使用。
   * @lang en Optional additive presentation path under explicit information architecture, used for actual loading.
   */
  presentationPath?: string;
  /**
   * @lang zh-CN 可选的成员定位锚点，采用稳定条目标识。
   * @lang en Optional member-positioning anchor using the stable entry identifier.
   */
  memberAnchor?: string;
  /**
   * @lang zh-CN 叶节点关联的可选稳定文档条目标识。
   * @lang en Optional stable documentation-entry identifier associated with a leaf node.
   */
  entryId?: string;
  /**
   * @lang zh-CN 节点关联的可选源码路径元数据。
   * @lang en Optional source-path metadata associated with the node.
   */
  sourcePath?: string;
  /**
   * @lang zh-CN 节点关联的可选上游规范符号标识。
   * @lang en Optional upstream canonical symbol identifier associated with the node.
   */
  symbolId?: string;
}

/**
 * @lang zh-CN 单个可导航入口的稳定标识及其公开元数据；完整详情仍由统一项目页负责渲染。
 * @lang en Stable identity and public metadata for one navigable entry; the unified project page still renders full detail.
 */
export interface RenderProjectNavigationEntry {
  /**
   * @lang zh-CN 新索引中显式保留的聚合作用域。
   * @lang en Explicit aggregation scope retained in the new index.
   */
  identityScope?: string;
  /**
   * @lang zh-CN 导航条目沿用的稳定文档条目标识。
   * @lang en Stable documentation-entry identifier preserved by the navigation entry.
   */
  id: string;
  /**
   * @lang zh-CN 导航条目的公开显示名称。
   * @lang en Public display name of the navigation entry.
   */
  name: string;
  /**
   * @lang zh-CN 上游领域生产方提供的条目语义类别。
   * @lang en Semantic entry kind supplied by the upstream domain producer.
   */
  kind: string;
  /**
   * @lang zh-CN 导航条目所属的领域视图分组。
   * @lang en Domain-view grouping containing the navigation entry.
   */
  view: RenderProjectView;
  /**
   * @lang zh-CN 可选的条目摘要文本。
   * @lang en Optional entry-summary text.
   */
  summary?: string;
  /**
   * @lang zh-CN 可选的声明签名文本。
   * @lang en Optional declaration-signature text.
   */
  signature?: string;
  /**
   * @lang zh-CN 可选的字段级中性多语言正文模型。
   * @lang en Optional neutral field-level multilingual content model.
   */
  i18n?: HiaI18nModel;
  /**
   * @lang zh-CN 可选的条目文档化配置规范引用。
   * @lang en Optional documentation-profile reference for the entry.
   */
  profile?: RenderProjectProfileRef;
  /**
   * @lang zh-CN 可选的来源输入工件元数据。
   * @lang en Optional metadata of the originating input artifact.
   */
  input?: RenderProjectInputRef;
  /**
   * @lang zh-CN 可选的已应用源码策略的位置及资源元数据，预览正文从索引移除。
   * @lang en Optional source-policy-processed location and asset metadata, with preview bodies removed from the index.
   */
  source?: Omit<RenderProjectSourceRef, "preview">;
  /**
   * @lang zh-CN canonical navigation entry 上的 metadata-only source usability。
   * @lang en Metadata-only source usability on the canonical navigation entry.
   */
  sourceUsability?: RenderProjectSourceUsabilityRef;
  /**
   * @lang zh-CN 不含正文的 source-comment allowlist 摘要。
   * @lang en Body-free allowlisted source-comment summary.
   */
  sourceCommentProjection?: RenderProjectSourceCommentProjectionSummary;
  /**
   * @lang zh-CN 可选的上游规范符号标识。
   * @lang en Optional upstream canonical symbol identifier.
   */
  symbolId?: string;
  /**
   * @lang zh-CN 可选的领域语义层级摘要。
   * @lang en Optional domain-semantic hierarchy summary.
   */
  hierarchy?: RenderProjectEntryHierarchyRef;
  /**
   * @lang zh-CN 由条目ID派生的规范片段路径，split-site生成相应独立片段文件。
   * @lang en Canonical fragment path derived from the entry ID, with split-site generating the corresponding standalone fragment file.
   */
  contentPath?: string;
  /**
   * @lang zh-CN 实际 router fetch 位置；省略时与 canonical contentPath 相同。
   * @lang en Actual router fetch location; omission means the canonical contentPath.
   */
  presentationPath?: string;
  /**
   * @lang zh-CN 成员或条目的稳定锚点标识。
   * @lang en Stable anchor identifier for a member or entry.
   */
  memberAnchor?: string;
  /**
   * @lang zh-CN 不依赖 JavaScript 的独立多页阅读路径。
   * @lang en Standalone multi-page reading path that does not require JavaScript.
   */
  noScriptPagePath?: string;
  /**
   * @lang zh-CN 按 UI locale 直接寻址的无脚本页面；与正文 locale 保持分层。
   * @lang en Direct no-script pages by UI locale, separate from content locale.
   */
  noScriptLocalePages?: Array<{ uiLocale: DocumentationPortalUiLocale; path: string }>;
  /**
   * @lang zh-CN neutral presentation profile 中的 topic identity。
   * @lang en Topic identity in the neutral presentation profile.
   */
  presentationTopicId?: string;
  /**
   * @lang zh-CN neutral presentation profile 中的 page identity。
   * @lang en Page identity in the neutral presentation profile.
   */
  presentationPageId?: string;
  /**
   * @lang zh-CN neutral presentation profile 中的 fragment identity。
   * @lang en Fragment identity in the neutral presentation profile.
   */
  presentationFragmentId?: string;
  /**
   * @lang zh-CN 显式信息架构下的可选语义路径前缀，来自负责人审阅的清单输入。
   * @lang en Optional semantic-path prefix under explicit information architecture, taken from owner-reviewed manifest input.
   */
  semanticPath?: DocumentationPortalSemanticPathSegment[];
  /**
   * @lang zh-CN 可选的条目与文档源码映射的轻量关联。
   * @lang en Optional lightweight linkage between the entry and its documentation source map.
   */
  docSourceMap?: RenderProjectEntryDocSourceMapRef;
}

/**
 * @lang zh-CN navigation/search consumer 可用的 metadata-only 摘要；不包含 projected text、source body 或 raw comment。
 *
 * @lang en Metadata-only summary for navigation consumers; it includes no projected text, source body, or raw comment.
 */
export interface RenderProjectSourceCommentProjectionSummary {
  /**
   * @lang zh-CN 上游源码注释投影的契约名称。
   * @lang en Contract name of the upstream source-comment projection.
   */
  contract: string;
  /**
   * @lang zh-CN 上游源码注释投影的精确版本标签。
   * @lang en Exact version label of the upstream source-comment projection.
   */
  contractVersion: string;
  /**
   * @lang zh-CN 上游源码注释投影声明的默认语言。
   * @lang en Default locale declared by the upstream source-comment projection.
   */
  defaultLocale: string;
  /**
   * @lang zh-CN 上游源码注释投影的条目总数。
   * @lang en Total number of entries in the upstream source-comment projection.
   */
  entryCount: number;
  /**
   * @lang zh-CN 上游源码注释投影的稳定标识。
   * @lang en Stable identifier of the upstream source-comment projection.
   */
  projectionId: string;
  /**
   * @lang zh-CN 调用方显式请求并与渲染选项匹配的注释语言。
   * @lang en Comment locale explicitly requested by the caller and matched against render options.
   */
  requestedLocale: string;
  /**
   * @lang zh-CN 投影中resolution非missing的条目数量，包含回退解析结果。
   * @lang en Number of projection entries whose resolution is not missing, including fallback resolutions.
   */
  resolvedCount: number;
  /**
   * @lang zh-CN 上游源码注释投影的ready或refused状态。
   * @lang en Ready or refused state of the upstream source-comment projection.
   */
  status: "ready" | "refused";
  /**
   * @lang zh-CN 索引摘要关闭投影正文、原注释及源码正文的固定隐私标记。
   * @lang en Fixed privacy flags excluding projected text, raw comments and source bodies from the index summary.
   */
  privacy: {
    /**
     * @lang zh-CN 固定为false，索引摘要不包含已投影注释正文。
     * @lang en Fixed to false, excluding projected comment text from the index summary.
     */
    projectedCommentTextIncluded: false;
    /**
     * @lang zh-CN 固定为false，索引摘要不包含原始注释。
     * @lang en Fixed to false, excluding raw comments from the index summary.
     */
    rawCommentIncluded: false;
    /**
     * @lang zh-CN 固定为false，索引摘要不包含源码正文。
     * @lang en Fixed to false, excluding source bodies from the index summary.
     */
    sourceBodyIncluded: false;
    /**
     * @lang zh-CN 固定为none，索引摘要不携带sourcesContent。
     * @lang en Fixed to none, excluding sourcesContent from the index summary.
     */
    sourcesContentPolicy: "none";
  };
}

/**
 * @lang zh-CN 把已结构化文档渲染为单页内存文件与manifest；默认包含主题资源，外部资源模式只返回引用，不写文件。
 * @lang en Renders a structured document into single-page in-memory files and a manifest; theme assets default on, while external-asset mode returns references without file writes.
 * @param document <lang><zh-CN>调用方已校验的HIA文档；此函数不是完整文档验证器。</zh-CN><en>Caller-validated HIA document; this function is not a complete document validator.</en></lang>
 * @param options <lang><zh-CN>标题、初始语言、主题及资产路由；项目策略仅按已声明兼容范围消费。</zh-CN><en>Title, initial locale, theme and asset routing; project policies apply only within their documented compatibility scope.</en></lang>
 * @returns <lang><zh-CN>有序内存文件、诊断和仅本次文件清单。</zh-CN><en>Ordered in-memory files, diagnostics and inventory of files owned by this build.</en></lang>
 * @throws {TypeError} <lang><zh-CN>显式主题颜色或资源路由非法时拒绝，不静默忽略。</zh-CN><en>Invalid explicit theme colors or asset routing are rejected rather than silently ignored.</en></lang>
 */
export function renderHtmlDocument(document: HiaDocument, options: RenderHtmlOptions = {}): RenderHtmlResult {
  const pageTitle = options.title ?? document.title;
  const includeThemeAssets = options.includeThemeAssets ?? true;
  // <lang><zh-CN>即使调用者选择外部资源，也先验证明确颜色，避免静默忽略非法配置。</zh-CN><en>Validate explicit colors even with external resources, avoiding silently ignored invalid configuration.</en></lang>
  const assets = getDefaultThemeAssets(options.theme ?? {});
  const files: RenderedHtmlFile[] = [
    {
      path: "index.html",
      contents: renderIndexHtml(pageTitle, document, options),
      contentType: "text/html; charset=utf-8",
      role: "entry"
    }
  ];

  if (includeThemeAssets) {
    for (const asset of assets) {
      files.push({
        path: asset.path,
        contents: asset.contents,
        contentType: asset.contentType,
        role: "asset"
      });
    }
  }

  // <lang><zh-CN>资源路由在manifest前完成，使文件清单只包含本次真正拥有的文件。</zh-CN><en>Route assets before the manifest so the inventory contains only files owned by this output.</en></lang>
  const routedFiles = relocateDefaultThemeAssets(files, options.themeAssets);
  return {
    files: routedFiles,
    diagnostics: [],
    manifest: createManifest(document, routedFiles, options)
  };
}

/**
 * @lang zh-CN 把统一项目输入渲染为默认 split-site 或显式 single-page，并生成 exact presentation profile、内容寻址源码资源和 manifest linkage。
 *
 * @lang en Renders unified project input as the default split site or explicit single page, including an exact presentation profile, content-addressed source assets, and manifest linkage.
 *
 * @param projectInput - 已结构化的项目、entry 与关系输入；renderer 不自行读取路径。Structured project, entry, and relation input; the renderer performs no path read.
 * @param options - locale、IA、源码模式和 Portal theme 选择。Locale, IA, source-mode, and Portal-theme selections.
 * @returns 完整的内存文件集、diagnostics 与 body-free manifest。Complete in-memory file set, diagnostics, and body-free manifest.
 * @throws 当显式 IA/theme/source-comment 选择或 renderer 生成的 exact profile 非法时 fail closed。Fails closed when explicit IA/theme/source-comment selections or the renderer-generated exact profile are invalid.
 */
export function renderProjectHtmlDocument(projectInput: RenderProjectHtmlInput, options: RenderHtmlOptions = {}): RenderHtmlResult {
  // <lang><zh-CN>旧API显式收集相同惰性文件计划，保留内存结果形状与逐字节输出。</zh-CN><en>The legacy API explicitly collects the same lazy file plan, preserving its in-memory result shape and byte-for-byte output.</en></lang>
  const plan = createProjectHtmlRenderPlan(projectInput, options);
  const files = relocateDefaultThemeAssets([...plan.files], options.themeAssets);
  return { files, diagnostics: plan.diagnostics, manifest: plan.manifest(files) };
}

/**
 * @lang zh-CN 逐文件生成项目站并等待调用方写入，不保留整站HTML；先验证配置/契约和error诊断。
 * @lang en Generates a project site one file at a time and awaits caller writes without retaining site HTML; validates configuration/contracts and error diagnostics first.
 * @param projectInput <lang><zh-CN>显式文档/授权片段；不读取文件或网络。原始输入和索引仍与站点规模相关。</zh-CN><en>Explicit documentation/authorized excerpts; no file/network reads. Original input and indexes still scale with the site.</en></lang>
 * @param writer <lang><zh-CN>等待单文件写入完成；抛错/拒绝会停止，不回滚已写文件。</zh-CN><en>Completes each individual write; throwing/rejecting stops output without rolling back earlier writes.</en></lang>
 * @param options <lang><zh-CN>与旧API相同；显式single-page/eager仍可能产生大型单文件。</zh-CN><en>Same as the legacy API; explicit single-page/eager may still produce large individual files.</en></lang>
 * @returns <lang><zh-CN>无文件正文的结果/清单；error诊断时零写入。</zh-CN><en>Body-free result/inventory; error diagnostics result in zero writes.</en></lang>
 * @throws <lang><zh-CN>配置/契约非法或writer失败；不吞错误、不改变公开授权。</zh-CN><en>Invalid configuration/contracts or writer failure; errors and publication authority remain unchanged.</en></lang>
 */
export async function renderProjectHtmlDocumentToWriter(projectInput: RenderProjectHtmlInput, writer: RenderHtmlFileWriter, options: RenderHtmlOptions = {}): Promise<RenderHtmlWriteResult> {
  // <lang><zh-CN>计划只保存输入/中性索引和源码资产；HTML由迭代器按需产生。</zh-CN><en>The plan retains input/neutral indexes and source assets only; its iterator generates HTML on demand.</en></lang>
  const plan = createProjectHtmlRenderPlan(projectInput, options);
  const files: RenderHtmlManifestFile[] = [];
  if (!plan.diagnostics.some((item) => item.severity === "error")) {
    for (const original of plan.files) {
      for (const file of relocateDefaultThemeAssets([original], options.themeAssets)) {
        // <lang><zh-CN>背压点先于下一次iterator.next；清单只存metadata，不存正文。
        // </zh-CN><en>Backpressure precedes the next iterator.next; inventories retain metadata rather than bodies.</en></lang>
        await writer(file);
        files.push({ path: file.path, role: file.role, contentType: file.contentType });
      }
    }
  }
  return { fileCount: files.length, diagnostics: plan.diagnostics, manifest: plan.manifest(files) };
}

/**
 * @lang zh-CN 内部惰性计划的清单闭包只接收文件metadata。
 * @lang en The internal lazy plan's inventory closure accepts file metadata only.
 */
interface ProjectHtmlRenderPlan {
  files: Iterable<RenderedHtmlFile>;
  diagnostics: HiaDiagnostic[];
  manifest: (files: RenderHtmlManifestFile[]) => RenderHtmlManifest;
}

/**
 * @lang zh-CN 在任何输出前构造/验证共用事实，保持普通与流式API的契约、顺序和正文一致。
 * @lang en Builds/validates shared facts before output, preserving contracts, ordering and prose across ordinary and streaming APIs.
 */
function createProjectHtmlRenderPlan(projectInput: RenderProjectHtmlInput, options: RenderHtmlOptions): ProjectHtmlRenderPlan {
  // <lang><zh-CN>直接API调用也必须遵守新逻辑作用域的词法边界，在首写前拒绝无效值。</zh-CN><en>Direct API calls also enforce logical-scope syntax before the first output write.</en></lang>
  const scopedSymbols = new Set<string>();
  for (const entry of projectInput.entries) {
    if (entry.identityScope !== undefined && (typeof entry.identityScope !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(entry.identityScope))) {
      throw new TypeError("HIA_RENDER_PROJECT_IDENTITY_SCOPE_INVALID");
    }
    if (entry.identityScope && entry.symbolId) {
      // <lang><zh-CN>显式.NET文档别名参与相同唯一性检查，避免父类型关联覆盖另一声明。</zh-CN><en>Explicit .NET documentation aliases share the uniqueness check so parent joins cannot overwrite another declaration.</en></lang>
      const aliases = new Set([entry.symbolId, ...(entry.hierarchy?.symbolDocumentationId ? [entry.hierarchy.symbolDocumentationId] : [])]);
      for (const alias of aliases) {
        const key = projectSymbolLookupKey(entry, alias);
        if (scopedSymbols.has(key)) throw new TypeError("HIA_RENDER_PROJECT_SYMBOL_ID_AMBIGUOUS");
        scopedSymbols.add(key);
      }
    }
  }
  // <lang><zh-CN>资源路由非法时必须在第一次writer调用前拒绝。</zh-CN><en>Reject invalid asset routing before the first writer invocation.</en></lang>
  relocateDefaultThemeAssets([], options.themeAssets);
  const siteLayout = options.projectSite?.layout ?? "split-site";
  // <lang><zh-CN>仅 split-site 写独立条目及无脚本页；冲突必须在任何文件写入前拒绝。</zh-CN><en>Only split-site writes separate entry and no-script pages; reject their collisions before writing any file.</en></lang>
  if (siteLayout === "split-site") assertUniqueProjectEntryArtifactNames(projectInput.entries);
  // <lang><zh-CN>关系图先规范化，确保 presentation identity 使用最终 relation facts，而不是调用者数组顺序。</zh-CN><en>Normalize the relation graph first so presentation identity uses final relation facts rather than caller array order.</en></lang>
  // <lang><zh-CN>显式父项在本作用域/视图缺失时保留条目并报告未解析，避免向其它来源借用父项。</zh-CN><en>Retain entries and report unresolved explicit parents within their scope/view, without borrowing parents from other origins.</en></lang>
  const parentDiagnostics: HiaDiagnostic[] = projectInput.entries
    .filter(entry => entry.identityScope && entry.hierarchy?.parentSymbolId && !findProjectParentEntry(entry, projectInput.entries))
    .map(() => ({code: "HIA_RENDER_PROJECT_PARENT_UNRESOLVED", message: "Scoped parent is absent from its view and identity scope.", severity: "warning", targetPath: "project.entries"}));
  const normalizedProjectInput = normalizeProjectRelationGraphInput(parentDiagnostics.length
    ? {...projectInput, diagnostics: [...(projectInput.diagnostics ?? []), ...parentDiagnostics]}
    : projectInput);
  const pageTitle = options.title ?? normalizedProjectInput.project.title ?? normalizedProjectInput.project.name;
  const includeThemeAssets = options.includeThemeAssets ?? true;
  const portalContext = resolveProjectPortalContext(normalizedProjectInput, options, siteLayout);
  // <lang><zh-CN>颜色由主题owner单点校验，和普通文档使用同一个品牌资源工厂。</zh-CN><en>The theme owner validates colors centrally through the same branded-asset factory used by documents.</en></lang>
  const assets = getDefaultThemeAssets(options.theme ?? {});
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
  /**
   * @lang zh-CN 按既有顺序惰性发出单文件；只在消费者继续迭代时渲染下一页。
   * @lang en Lazily emits individual files in legacy order, rendering the next page only when the consumer resumes.
   */
  function* produceFiles(): Generator<RenderedHtmlFile> {
    if (siteLayout === "single-page") {
      yield { path: "index.html", contents: renderProjectIndexHtml(pageTitle, renderedProjectInput, options, portalContext), contentType: "text/html; charset=utf-8", role: "entry" };
    } else {
      yield* createProjectSplitSiteFiles(pageTitle, renderedProjectInput, navigationIndex, options, portalContext);
    }
    const localeReport = portalContext.uiLocaleAdoption ?? portalContext.siteNavigationUiLocaleAdoption;
    if (localeReport) {
      yield { path: DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH, contents: `${localeReport.reportJson}\n`, contentType: "application/json; charset=utf-8", role: "index" };
    }
    // <lang><zh-CN>直接序列化既有模型时省略展示缩进，字符串数据保留；输入工件和源码快照走原复制边界。</zh-CN><en>Omit presentation indentation when serializing existing models while preserving string data; input artifacts and source snapshots retain their copy boundaries.</en></lang>
    yield { path: "project-index.json", contents: `${JSON.stringify(navigationIndex)}\n`, contentType: "application/json; charset=utf-8", role: "index" };
    yield* presentationBundle.artifacts;
    if (includeThemeAssets) {
      for (const asset of assets) yield { path: asset.path, contents: asset.contents, contentType: asset.contentType, role: "asset" };
    }
  }
  return {
    files: portalContext.siteNavigation ? withSiteNavigation(produceFiles(), portalContext.siteNavigation, portalContext.uiLocale, renderedProjectInput.entries.map(entry => ({
      id: entry.id,
      name: entry.name,
      page: portalContext.uiLocaleAdoption ? createProjectLocalizedNoScriptPagePath(entry.id, portalContext.uiLocale) : createProjectNoScriptPagePath(entry.id),
      ...(portalContext.uiLocaleAdoption ? { localePages: { "zh-CN": createProjectLocalizedNoScriptPagePath(entry.id, "zh-CN"), en: createProjectLocalizedNoScriptPagePath(entry.id, "en") } } : {}),
      ...(entry.source?.publicAsset?.linkUrl ? { sourceUrl: entry.source.publicAsset.linkUrl } : {})
    })), Object.keys(options.theme?.colors ?? {})) : produceFiles(),
    diagnostics: renderedProjectInput.diagnostics ?? [],
    manifest: (files) => createProjectManifest(renderedProjectInput, files, pageTitle, options, navigationIndex, presentationBundle, portalContext)
  };
}
/**
 * @lang zh-CN 当前 render 调用的 IA、locale、labels 与 theme resolved context。
 * @lang en Resolved IA, locale, labels, and theme context for one render call.
 */
interface RenderProjectPortalContext {
  /**
   * @lang zh-CN 与外部可变输入隔离的已验证导航快照。
   * @lang en Validated navigation snapshot isolated from mutable external input.
   */
  siteNavigation?: DocumentationSiteNavigation;
  /**
   * @lang zh-CN 未启用显式IA时仅评估真实导航消息，不能提升为完整Portal评估。
   * @lang en Evaluates actual navigation messages alone outside explicit IA, without upgrading the claim to a full Portal evaluation.
   */
  siteNavigationUiLocaleAdoption?: DocumentationPortalUiLocaleAdoption;
  /**
   * @lang zh-CN 静态导航页面已解析界面语言，只省略运行时绑定。
   * @lang en Static navigation pages resolve their UI language and omit only runtime bindings.
   */
  runtimeUiMessages?: false;
  informationArchitecture?: DocumentationPortalInformationArchitectureContract;
  labels: DocumentationPortalLabels;
  sourceCommentProjection?: Required<RenderProjectSourceCommentProjectionOptions>;
  theme: Required<RenderProjectThemeOptions>;
  uiLocaleAdoption?: DocumentationPortalUiLocaleAdoption;
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
  // <lang><zh-CN>先核导航契约，再复制供惰性输出使用，writer等待期间的外部修改不能改变后续页面。
  // </zh-CN><en>Validate navigation first, then snapshot it for lazy output so external mutation during writer waits cannot change later pages.</en></lang>
  const requestedNavigation = options.projectSite?.siteNavigation;
  if (requestedNavigation !== undefined) {
    assertDocumentationSiteNavigation(requestedNavigation);
    if (!options.projectSite?.uiLocale) throw new TypeError("HIA_SITE_NAVIGATION_UI_LOCALE_REQUIRED: Site navigation requires an explicit UI locale.");
  }
  const siteNavigation = requestedNavigation === undefined ? undefined : structuredClone(requestedNavigation);
  const localeModel = resolveProjectLocaleModel(projectInput, options.locale);
  const explicitInformationArchitecture = options.projectSite?.informationArchitecture;
  if (explicitInformationArchitecture && !options.projectSite?.uiLocale) {
    throw new TypeError(
      "HIA_PORTAL_UI_LOCALE_REQUIRED: Explicit Portal information architecture requires a caller-explicit UI locale."
    );
  }
  if (options.projectSite?.uiLocaleCompleteness && !explicitInformationArchitecture) {
    throw new TypeError(
      "HIA_PORTAL_UI_LOCALE_IA_REQUIRED: UI locale completeness identity requires explicit Portal information architecture."
    );
  }
  // <lang><zh-CN>非 IA 调用保留历史 fallback；adopted explicit IA 永远由上面的 caller-explicit gate 提供值。</zh-CN><en>Non-IA calls retain the historical fallback; adopted explicit IA always receives its value from the caller-explicit gate above.</en></lang>
  const uiLocale = resolveDocumentationPortalUiLocale(options.projectSite?.uiLocale, localeModel.selectedLocale);
  const sourceCommentProjection = options.projectSite?.sourceCommentProjection;
  // <lang><zh-CN>共用逐项优先级及闭集校验；旧项目调用保留兼容回退。</zh-CN><en>Share per-field precedence and closed-catalog validation, retaining fallback for legacy project calls.</en></lang>
  const { skinId: requestedSkin, scheme: requestedScheme } = resolveThemeSelection(options);

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

  // <lang><zh-CN>只有显式 IA surface 构造 W-P123 report；legacy P3/single-page 不伪报 completeness。</zh-CN><en>Only explicit-IA surfaces build a W-P123 report; legacy P3/single-page output does not claim completeness.</en></lang>
  const uiLocaleAdoption = explicitInformationArchitecture
    ? createDocumentationPortalUiLocaleAdoption({
        contentLocale: localeModel.selectedLocale,
        contentLocales: localeModel.locales,
        defaultUiLocale: uiLocale,
        ...(siteNavigation ? { siteNavigation } : {}),
        profileId: options.projectSite?.uiLocaleCompleteness?.profileId ?? DOCUMENTATION_PORTAL_UI_LOCALE_PROFILE_ID,
        surfaceId: options.projectSite?.uiLocaleCompleteness?.surfaceId ?? DOCUMENTATION_PORTAL_UI_LOCALE_SURFACE_ID
      })
    : undefined;

  return {
    ...(siteNavigation ? { siteNavigation } : {}),
    ...(siteNavigation && !explicitInformationArchitecture ? { siteNavigationUiLocaleAdoption: createSiteNavigationUiLocaleAdoption({ contentLocale: localeModel.selectedLocale, contentLocales: localeModel.locales, defaultUiLocale: uiLocale, siteNavigation }) } : {}),
    uiLocale,
    labels: getDocumentationPortalLabels(uiLocale),
    theme: { skinId: requestedSkin, scheme: requestedScheme },
    ...(uiLocaleAdoption ? { uiLocaleAdoption } : {}),
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
        ...(presentation === "link" && publicAsset ? { linkUrl: publicAsset.linkUrl ?? publicAsset.relativeUrl, publicAsset } : {}),
        ...(presentation === "embed" && preview ? {
          preview: {
            ...preview,
            ...(previewDefaultExpanded !== undefined ? { defaultExpanded: previewDefaultExpanded } : {})
          }
        } : {}),
        ...(presentation === "fetch" && publicAsset ? {
          fetchUrl: publicAsset.relativeUrl,
          ...(publicAsset.linkUrl ? { linkUrl: publicAsset.linkUrl } : {}),
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
 * @param parentPath - 静态页面至输出根的相对前缀，默认一层。Relative prefix from the static page to the output root, defaulting to one level.
 * @returns 不含不可用 fetch control 的 page input。Page input without unavailable fetch controls.
 */
function createProjectNoScriptProjectInput(projectInput: RenderProjectHtmlInput, parentPath = "../"): RenderProjectHtmlInput {
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
          ...(noScriptLinkUrl ? { linkUrl: `${parentPath}${noScriptLinkUrl}` } : {})
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

/**
 * @lang zh-CN 从已验证 bundle 构造 manifest/index 共用的最小 profile 引用。
 * @lang en Builds the minimal manifest/index profile reference from a validated bundle.
 */
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
 * @lang zh-CN 从已通过 W-P123 gate 的 adoption 构造 manifest/index 共用的 body-free 引用和计数。
 *
 * @lang en Builds the body-free manifest/index reference and counts from a W-P123 gate-complete adoption.
 *
 * @param adoption <lang><zh-CN>当前 Portal surface 的完整性结果。</lang><en>Completeness result for the current Portal surface.</en></lang>
 * @returns <lang><zh-CN>不含 message text 或内容正文的引用。</lang><en>Reference containing no message text or content body.</en></lang>
 */
function createProjectUiLocaleCompletenessRef(
  adoption: DocumentationPortalUiLocaleAdoption
): RenderProjectUiLocaleCompletenessRef {
  // <lang><zh-CN>P1 每次 adoption 只有一个 owner surface；evaluator 已保证集合非空。</zh-CN><en>Each P1 adoption owns one surface; the evaluator has already guaranteed a non-empty set.</en></lang>
  const surfaceId = adoption.report.surfaces[0]!.surfaceId;
  return {
    contract: adoption.report.contract,
    contractVersion: adoption.report.contractVersion,
    evaluationCount: adoption.summary.evaluations,
    exactCount: adoption.summary.exact,
    path: DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH,
    profileId: adoption.report.profileId,
    status: adoption.report.status,
    surfaceId,
    uiLocaleCount: adoption.summary.uiLocales
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

/**
 * @lang zh-CN 构造含 profile linkage 的 body-free renderer manifest。
 * @lang en Builds a body-free renderer manifest with presentation-profile linkage.
 */
function createProjectManifest(
  projectInput: RenderProjectHtmlInput,
  files: RenderHtmlManifestFile[],
  pageTitle: string,
  options: RenderHtmlOptions,
  navigationIndex: RenderProjectNavigationIndex,
  presentationBundle: PortalPresentationBundle,
  portalContext: RenderProjectPortalContext
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
        : {}),
      ...(portalContext.uiLocaleAdoption
        ? { uiLocaleCompleteness: createProjectUiLocaleCompletenessRef(portalContext.uiLocaleAdoption) }
        : {})
    }
  };
}

/**
 * @lang zh-CN 构造 owner route index，并附加 neutral topic/page/fragment identity 和 profile 引用。
 * @lang en Builds the owner route index with neutral topic/page/fragment identities and a profile reference.
 */
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
    contractVersion: projectInput.entries.some((entry) => entry.identityScope !== undefined)
      ? HIA_PROJECT_SCOPED_NAVIGATION_INDEX_CONTRACT_VERSION : HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION,
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
        ...(entry.identityScope ? { identityScope: entry.identityScope } : {}),
        ...(entry.hierarchy ? { hierarchy: entry.hierarchy } : {}),
        contentPath: createProjectEntryContentPath(entry.id),
        ...(options.projectSite?.layout === "single-page" ? {} : { noScriptPagePath: createProjectNoScriptPagePath(entry.id) }),
        ...(portalContext.uiLocaleAdoption && options.projectSite?.layout !== "single-page"
          ? {
              noScriptLocalePages: DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES.map((uiLocale) => ({
                uiLocale,
                path: createProjectLocalizedNoScriptPagePath(entry.id, uiLocale)
              }))
            }
          : {}),
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
        : {}),
      ...(portalContext.uiLocaleAdoption
        ? { uiLocaleCompleteness: createProjectUiLocaleCompletenessRef(portalContext.uiLocaleAdoption) }
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
function* createProjectSplitSiteFiles(
  pageTitle: string,
  projectInput: RenderProjectHtmlInput,
  navigationIndex: RenderProjectNavigationIndex,
  options: RenderHtmlOptions,
  portalContext: RenderProjectPortalContext
): Generator<RenderedHtmlFile> {
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
      })}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    },
    {
      path: "relations/project.json",
      contents: `${JSON.stringify(projectInput.relationGraph ?? createProjectRelationGraph(projectInput.entries))}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    }
  ];

  // <lang><zh-CN>no-script 入口与逐 topic 页面保持独立，不把数千节点重新塞回应用壳。</zh-CN><en>The no-script index and per-topic pages stay separate so thousands of nodes are not embedded back into the application shell.</en></lang>
  const noScriptProjectInput = createProjectNoScriptProjectInput(projectInput);
  // <lang><zh-CN>静态导航仍使用完整语言目录及可见译文，交互入口和可加载片段继续携带动态绑定。</zh-CN><en>Static navigation retains its full locale catalog and visible translations. Interactive entries and loadable fragments retain dynamic bindings.</en></lang>
  const noScriptContext: RenderProjectPortalContext = portalContext.siteNavigation
    ? { ...portalContext, runtimeUiMessages: false }
    : portalContext;
  // <lang><zh-CN>按稳定 entry id 建立单次索引，避免大型项目为每页线性扫描全部节点。</zh-CN><en>Build a one-time stable-entry index so large projects do not scan every node for every page.</en></lang>
  const noScriptEntryById = new Map(noScriptProjectInput.entries.map((entry) => [entry.id, entry]));
  // <lang><zh-CN>本地化页面多一层目录，单次重定位全部条目也覆盖随父项呈现的成员来源。</zh-CN><en>Localized pages add one directory level; rebasing all entries once also covers sources of members rendered with their parent.</en></lang>
  const localizedNoScriptProjectInput = portalContext.uiLocaleAdoption
    ? createProjectNoScriptProjectInput(projectInput, "../../")
    : noScriptProjectInput;
  // <lang><zh-CN>复用同一身份集合的索引，逐页读取不再扫描全部声明。</zh-CN><en>Index the same identity set so per-page lookups do not rescan all declarations.</en></lang>
  const localizedNoScriptEntryById = new Map(localizedNoScriptProjectInput.entries.map((entry) => [entry.id, entry]));
  files.push({
    path: "pages/index.html",
    contents: renderProjectNoScriptIndexHtml(pageTitle, noScriptProjectInput, localeModel.selectedLocale, noScriptContext),
    contentType: "text/html; charset=utf-8",
    role: "entry"
  });
  // <lang><zh-CN>采用 W-P123 的 surface 为每个 UI locale 生成真实静态入口；legacy 默认路径仍保留。</zh-CN><en>A W-P123-adopted surface emits a real static entry for every UI locale while retaining the legacy default path.</en></lang>
  if (portalContext.uiLocaleAdoption) {
    for (const uiLocale of DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES) {
      const localizedContext = withProjectUiLocale(noScriptContext, uiLocale);
      files.push({
        path: `pages/${uiLocale}/index.html`,
        contents: renderProjectNoScriptIndexHtml(
          pageTitle,
          noScriptProjectInput,
          localeModel.selectedLocale,
          localizedContext,
          true
        ),
        contentType: "text/html; charset=utf-8",
        role: "entry"
      });
    }
  }

  // <lang zh-CN>canonical entry fragment 始终生成，保证旧 deep link 与不识别 IA 的 consumer 可回退。</lang>
  // <lang en>Canonical entry fragments are always emitted so old deep links and IA-unaware consumers retain a fallback.</lang>
  // <lang><zh-CN>先释放固定壳/索引；默认lazy不保存已生成条目页。eager按其显式语义保存预载片段。</zh-CN><en>Release fixed shell/index output first; default lazy output retains no generated entry pages. Eager retains preload fragments by its explicit semantics.</en></lang>
  yield* files;
  files.length = 0;
  const presentationPaths = informationArchitecture?.loadingStrategy === "eager"
    ? new Set(navigationIndex.entries.map((entry) => entry.presentationPath ?? entry.contentPath).filter((path): path is string => Boolean(path)))
    : undefined;
  const eagerFragments: Array<{ path: string; contents: string }> = [];
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
        noScriptContext
      ),
      contentType: "text/html; charset=utf-8",
      role: "entry"
    });
    if (portalContext.uiLocaleAdoption) {
      for (const uiLocale of DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES) {
        const localizedContext = withProjectUiLocale(noScriptContext, uiLocale);
        files.push({
          path: createProjectLocalizedNoScriptPagePath(entry.id, uiLocale),
          contents: renderProjectNoScriptEntryHtml(
            pageTitle,
            localizedNoScriptEntryById.get(entry.id)!,
            localizedNoScriptProjectInput,
            localeModel,
            localizedContext,
            true
          ),
          contentType: "text/html; charset=utf-8",
          role: "entry"
        });
      }
    }
    // <lang><zh-CN>一页写完才继续生成下一页，清单由外部只保存路径metadata。</zh-CN><en>Continue generating only after the current page is written; the outer inventory stores path metadata only.</en></lang>
    for (const file of files) {
      if (presentationPaths?.has(file.path)) eagerFragments.push({ path: file.path, contents: file.contents });
      yield file;
    }
    files.length = 0;
  }

  // <lang zh-CN>semantic-container 只增加 presentation fragment，不替换 canonical fragment。</lang>
  // <lang en>Semantic containers add presentation fragments without replacing canonical fragments.</lang>
  if (informationArchitecture?.contentGrouping === "semantic-container") {
    for (const file of createProjectSemanticContainerFiles(projectInput, localeModel, portalContext)) {
      if (presentationPaths?.has(file.path)) eagerFragments.push({ path: file.path, contents: file.contents });
      yield file;
    }
  }

  // <lang zh-CN>eager 以单一 index 预载 presentation fragment；canonical files 仍保持独立可寻址。</lang>
  // <lang en>Eager delivery preloads presentation fragments through one index while canonical files remain independently addressable.</lang>
  if (informationArchitecture?.loadingStrategy === "eager") {
    const fragments = eagerFragments.sort((left, right) => compareStableText(left.path, right.path));
    files.push({
      path: "content/eager.json",
      contents: `${JSON.stringify({
        contract: "documentation-portal-eager-fragment-index",
        contractVersion: "0.1.0-draft",
        fragments
      })}\n`,
      contentType: "application/json; charset=utf-8",
      role: "index"
    });
  }

  yield* files;
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
      })}\n`,
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
      })}\n`,
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
 * @lang zh-CN 在生成文件前拒绝不同条目投影到相同静态文件名，防止 FNV 文件名摘要碰撞时覆盖正文。
 * @lang en Refuses distinct entries projected to the same static filename before output, preventing body overwrite on an FNV filename digest collision.
 * @param entries - 已聚合的项目条目。Aggregated project entries.
 * @throws 当条目 ID 或其文件名投影重复时抛出固定错误，不回显可能敏感的 ID。Throws a fixed error for duplicate entry IDs or filename projections without exposing potentially sensitive IDs.
 */
function assertUniqueProjectEntryArtifactNames(entries: RenderProjectEntry[]): void {
  // <lang><zh-CN>同一文件名用于 entries/pages/本地化无脚本页；一次检查覆盖三类路由。</zh-CN><en>One filename is used by entries, pages and localized no-script pages, so one check covers all three routes.</en></lang>
  const names = new Set<string>();
  for (const entry of entries) {
    const artifactName = stableProjectArtifactName(entry.id);
    if (names.has(artifactName)) {
      throw new TypeError("HIA_PORTAL_ENTRY_ARTIFACT_PATH_COLLISION: Distinct entries would share a static page path.");
    }
    names.add(artifactName);
  }
}

/**
 * @lang zh-CN 为每个 neutral topic 生成稳定的 no-script owner page route。
 * @lang en Generates a stable no-script owner page route for every neutral topic.
 */
function createProjectNoScriptPagePath(entryId: string): string {
  return `pages/${stableProjectArtifactName(entryId)}.html`;
}

/**
 * @lang zh-CN 为一个 UI locale 生成可直接访问的无脚本 owner page route。
 * @lang en Generates a directly addressable no-script owner-page route for one UI locale.
 */
function createProjectLocalizedNoScriptPagePath(
  entryId: string,
  uiLocale: DocumentationPortalUiLocale
): string {
  return `pages/${uiLocale}/${stableProjectArtifactName(entryId)}.html`;
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
  return parentSymbolId ? entries.find((candidate) => (candidate.symbolId === parentSymbolId
    || Boolean(entry.identityScope && candidate.hierarchy?.symbolDocumentationId === parentSymbolId))
    && candidate.identityScope === entry.identityScope
    && (!entry.identityScope || candidate.view === entry.view)) : undefined;
}

/**
 * @lang zh-CN 为新作用域构造层级关联键，旧未限定符号保留原键及跨视图行为。
 * @lang en Build hierarchy join keys for new scopes, retaining original keys and cross-view behavior for legacy symbols.
 */
function projectSymbolLookupKey(entry: RenderProjectEntry, symbolId: string): string {
  return entry.identityScope ? JSON.stringify([entry.identityScope, entry.view, symbolId]) : symbolId;
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

/**
 * @lang zh-CN 优先共用theme，逐项回退旧项目theme与默认值；未知选择在产生HTML前拒绝。
 * @lang en Prefers shared theme, falls back per field to legacy project theme and defaults, and rejects unknown selections before HTML generation.
 */
function resolveThemeSelection(options: RenderHtmlOptions): Required<RenderProjectThemeOptions> {
  // <lang><zh-CN>皮肤与配色独立解析，不从品牌颜色推断另一种主题。</zh-CN><en>Resolve skin and scheme independently without inferring another theme from brand colors.</en></lang>
  const skinId = options.theme?.skinId ?? options.projectSite?.theme?.skinId ?? "portal.classic";
  const scheme = options.theme?.scheme ?? options.projectSite?.theme?.scheme ?? "system";
  if (!PORTAL_THEME_SKIN_IDS.includes(skinId) || !PORTAL_THEME_SCHEMES.includes(scheme)) throw new TypeError("HIA_PORTAL_THEME_SELECTION_INVALID: Portal skin and scheme must use the built-in closed catalog.");
  return { skinId, scheme };
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
    `<html lang="${escapeHtml(selectedLocale)}" ${renderDefaultThemeRootAttributes(resolveThemeSelection(options))}>`,
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

/**
 * @lang zh-CN UI message 的非执行占位符值。
 * @lang en Non-executable placeholder values for a UI message.
 */
type RenderProjectUiMessageValues = Readonly<Record<string, string | number>>;

/**
 * @lang zh-CN 渲染一个带稳定 identity 的 UI 文本节点；译文先按纯文本解析，再进行 HTML 转义。
 *
 * @lang en Renders a UI text node with a stable identity; translation is resolved as plain text before HTML escaping.
 */
function renderProjectUiMessage(
  portalContext: RenderProjectPortalContext,
  messageId: string,
  values: RenderProjectUiMessageValues = {},
  fallback = ""
): string {
  if (!portalContext.uiLocaleAdoption) {
    return escapeHtml(fallback);
  }
  const { attributes, text } = renderProjectUiMarkedText(portalContext, messageId, values);
  return `<span${attributes}>${text}</span>`;
}

/**
 * @lang zh-CN 解析 attribute/dynamic state 使用的 UI 纯文本，并为 legacy surface 保留既有 fallback。
 * @lang en Resolves UI plain text for attributes/dynamic state while retaining the existing fallback for legacy surfaces.
 */
function resolveProjectUiPlainText(
  portalContext: RenderProjectPortalContext,
  messageId: string,
  values: RenderProjectUiMessageValues = {},
  fallback = ""
): string {
  return portalContext.uiLocaleAdoption
    ? resolveDocumentationPortalUiMessage(portalContext.uiLocaleAdoption, portalContext.uiLocale, messageId, values)
    : fallback;
}

/**
 * @lang zh-CN 为共享 legacy/adopted renderer helper 选择带 marker 的消息或原有文本。
 * @lang en Selects a marked message or original text for renderer helpers shared by legacy and adopted surfaces.
 */
function renderOptionalProjectUiMessage(
  portalContext: RenderProjectPortalContext | undefined,
  messageId: string,
  fallback: string,
  values: RenderProjectUiMessageValues = {}
): string {
  return portalContext
    ? renderProjectUiMessage(portalContext, messageId, values, fallback)
    : escapeHtml(fallback);
}

/**
 * @lang zh-CN 为不能包裹 span 的元素生成稳定 message marker，并返回已转义文本。
 *
 * @lang en Creates a stable message marker for elements that cannot wrap a span and returns escaped text.
 */
function renderProjectUiMarkedText(
  portalContext: RenderProjectPortalContext,
  messageId: string,
  values: RenderProjectUiMessageValues = {}
): { attributes: string; text: string } {
  if (!portalContext.uiLocaleAdoption) {
    return { attributes: "", text: "" };
  }
  // <lang><zh-CN>无脚本页面保留标签结构和转义后的译文，省掉仅运行时消费的消息身份与参数。</zh-CN><en>Script-free pages keep their element structure and escaped translations while omitting runtime-only message identities and values.</en></lang>
  const valueAttribute = portalContext.runtimeUiMessages !== false && Object.keys(values).length > 0
    ? ` data-hia-ui-values="${escapeHtml(JSON.stringify(values))}"`
    : "";
  return {
    attributes: portalContext.runtimeUiMessages === false ? "" : ` data-hia-ui-message="${escapeHtml(messageId)}"${valueAttribute}`,
    text: escapeHtml(resolveDocumentationPortalUiMessage(
      portalContext.uiLocaleAdoption,
      portalContext.uiLocale,
      messageId,
      values
    ))
  };
}

/**
 * @lang zh-CN 复制 context 并只替换显式 UI locale，供 no-script locale 页面复用同一已验证 bundle/report。
 * @lang en Copies a context while replacing only its explicit UI locale so no-script locale pages reuse one validated bundle/report.
 */
function withProjectUiLocale(
  portalContext: RenderProjectPortalContext,
  uiLocale: DocumentationPortalUiLocale
): RenderProjectPortalContext {
  return {
    ...portalContext,
    uiLocale,
    labels: getDocumentationPortalLabels(uiLocale)
  };
}

/**
 * @lang zh-CN 渲染彼此独立的 UI/content locale 原生控件。
 * @lang en Renders independent native UI/content-locale controls.
 */
function renderProjectLocaleControls(
  contentLocales: string[],
  selectedContentLocale: string,
  portalContext: RenderProjectPortalContext
): string {
  if (!portalContext.uiLocaleAdoption) {
    return renderLocaleControl(contentLocales, selectedContentLocale);
  }
  const uiOptions = DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES.map((locale) => (
    `<option value="${escapeHtml(locale)}"${locale === portalContext.uiLocale ? " selected" : ""}>${escapeHtml(locale)}</option>`
  )).join("");
  const contentOptions = contentLocales.map((locale) => (
    `<option value="${escapeHtml(locale)}"${locale === selectedContentLocale ? " selected" : ""}>${escapeHtml(locale)}</option>`
  )).join("");
  return [
    "<div class=\"hia-language-switch hia-project-language-switch\">",
    `<label for="hia-ui-locale-control">${renderProjectUiMessage(portalContext, "portal.locale.uilabel")}</label>`,
    `<select id="hia-ui-locale-control" data-hia-ui-locale-control data-hia-ui-aria="portal.locale.uiaccessible" aria-label="${escapeHtml(resolveDocumentationPortalUiMessage(portalContext.uiLocaleAdoption!, portalContext.uiLocale, "portal.locale.uiaccessible"))}">${uiOptions}</select>`,
    `<label for="hia-locale-control">${renderProjectUiMessage(portalContext, "portal.locale.contentlabel")}</label>`,
    `<select id="hia-locale-control" data-hia-locale-control data-hia-ui-aria="portal.locale.contentaccessible" aria-label="${escapeHtml(resolveDocumentationPortalUiMessage(portalContext.uiLocaleAdoption!, portalContext.uiLocale, "portal.locale.contentaccessible"))}">${contentOptions}</select>`,
    "</div>"
  ].join("");
}

/**
 * @lang zh-CN 渲染带 no-script theme 默认和可见选择器的 split-site 应用壳。
 * @lang en Renders the split-site shell with a no-script theme default and visible selectors.
 */
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
    `<html lang="${escapeHtml(portalContext.uiLocale)}" ${renderDefaultThemeRootAttributes(portalContext.theme)}>`,
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
    renderProjectLocaleControls(localeModel.locales, localeModel.selectedLocale, portalContext),
    renderProjectThemeControl(portalContext.theme, portalContext),
    renderProjectViewControl(views, entryCounts, portalContext),
    renderProjectGeneratedDocumentationBindingProjection(projectInput.generatedDocumentationBindingProjection, portalContext),
    [
      "<label class=\"hia-project-search\">",
      `<span>${renderProjectUiMessage(portalContext, "portal.search.label", {}, labels.search)}</span>`,
      `<input type="search" data-hia-project-search${portalContext.uiLocaleAdoption ? " data-hia-ui-placeholder=\"portal.search.placeholder\" data-hia-ui-aria=\"portal.search.accessible\"" : ""} placeholder="${escapeHtml(resolveProjectUiPlainText(portalContext, "portal.search.placeholder", {}, labels.searchPlaceholder))}" aria-label="${escapeHtml(resolveProjectUiPlainText(portalContext, "portal.search.accessible", {}, labels.search))}">`,
      "</label>"
    ].join(""),
    `<section class="hia-project-summary hia-project-hierarchy"><h2>${renderProjectUiMessage(portalContext, "portal.navigation.hierarchy", {}, labels.hierarchy)}</h2><div data-hia-project-tree><p class="hia-project-loading" role="status">${renderProjectUiMessage(portalContext, "portal.navigation.loading", {}, labels.loading)}</p></div></section>`,
    `<button type="button" class="hia-project-secondary-action" data-hia-project-relations>${renderProjectUiMessage(portalContext, "portal.navigation.relations", {}, labels.relations)}</button>`,
    "</aside>",
    `<main class="hia-main hia-project-main" data-hia-project-content><p class="hia-project-empty">${renderProjectUiMessage(portalContext, "portal.navigation.select", {}, labels.select)}</p><noscript><p class="hia-noscript-notice"><a href="pages/index.html">${renderProjectUiMessage(portalContext, "portal.navigation.noscriptlink", {}, "No-script page index / 无脚本页面索引")}</a></p></noscript></main>`,
    "</div>",
    `<script src="${escapeHtml(DEFAULT_THEME_JS_PATH)}"></script>`,
    renderProjectSplitSiteScript(portalContext, portalContext.informationArchitecture?.loadingStrategy ?? "lazy", portalContext.siteNavigation ? collectProjectNavigationTree(projectInput.entries, portalContext.informationArchitecture) : []),
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
  selectedContentLocale: string,
  portalContext: RenderProjectPortalContext,
  localizedRoute = false
): string {
  const projectName = projectInput.project.title ?? projectInput.project.name;
  const links = [...projectInput.entries].sort(compareProjectNavigationEntries).map((entry) => {
    // <lang><zh-CN>page path 是由固定 `pages/` 前缀与 opaque basename 组成，不需要平台路径 API。</zh-CN><en>The page path consists of the fixed `pages/` prefix and an opaque basename, so no platform path API is needed.</en></lang>
    const relativePage = `./${createProjectNoScriptPagePath(entry.id).slice("pages/".length)}`;
    return `<li><a href="${escapeHtml(relativePage)}">${escapeHtml(entry.name)}</a> <small>${escapeHtml(entry.kind)} / ${escapeHtml(formatProjectViewLabel(entry.view))}</small></li>`;
  }).join("");
  const documentLocale = portalContext.uiLocaleAdoption ? portalContext.uiLocale : selectedContentLocale;
  const interactivePath = localizedRoute ? "../../index.html" : "../index.html";
  const stylesheetPath = localizedRoute ? "../../assets/hia-default.css" : "../assets/hia-default.css";
  const alternateLinks = portalContext.uiLocaleAdoption
    ? DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES
        .filter((locale) => locale !== portalContext.uiLocale)
        .map((locale) => {
          const path = localizedRoute ? `../${locale}/index.html` : `./${locale}/index.html`;
          const label = resolveProjectUiPlainText(
            portalContext,
            "portal.noscript.localealternate",
            { locale },
            locale
          );
          return `<a href="${escapeHtml(path)}" lang="${escapeHtml(locale)}">${escapeHtml(label)}</a>`;
        })
        .join(" · ")
    : "";
  const skinMessageId = `portal.theme.skin.${portalContext.theme.skinId.slice("portal.".length)}`;
  const schemeMessageId = `portal.theme.scheme.${portalContext.theme.scheme}`;
  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(documentLocale)}" ${renderDefaultThemeRootAttributes(portalContext.theme)}>`,
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(pageTitle)} - ${escapeHtml(resolveProjectUiPlainText(portalContext, "portal.noscript.indextitle", {}, "No-script index"))}</title>`,
    `<link rel="icon" href="data:,"><link rel="stylesheet" href="${escapeHtml(stylesheetPath)}"></head>`,
    "<body><div class=\"hia-shell hia-project-shell\"><aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectName)}</h1><p><a href="${escapeHtml(interactivePath)}">${renderProjectUiMessage(portalContext, "portal.noscript.interactive", {}, "Interactive site / 交互站点")}</a></p>`,
    alternateLinks ? `<p>${alternateLinks}</p>` : "",
    `<p>${renderProjectUiMessage(portalContext, "portal.theme.skinlabel", {}, "Skin")}：${renderProjectUiMessage(portalContext, skinMessageId, {}, getPortalThemeSkinLabel(portalContext.theme.skinId))} · ${renderProjectUiMessage(portalContext, "portal.theme.schemelabel", {}, "Scheme")}：${renderProjectUiMessage(portalContext, schemeMessageId, {}, getPortalThemeSchemeLabel(portalContext.theme.scheme))}</p>`,
    `</aside><main class="hia-main hia-project-main"><h2>${renderProjectUiMessage(portalContext, "portal.noscript.pagesheading", {}, "Documentation pages / 文档页面")}</h2>`,
    `<nav aria-label="${escapeHtml(resolveProjectUiPlainText(portalContext, "portal.noscript.pagesaccessible", {}, "Documentation pages"))}"${portalContext.uiLocaleAdoption && portalContext.runtimeUiMessages !== false ? " data-hia-ui-aria=\"portal.noscript.pagesaccessible\"" : ""}><ul>${links}</ul></nav>`,
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
  portalContext: RenderProjectPortalContext,
  localizedRoute = false
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
  const documentLocale = portalContext.uiLocaleAdoption ? portalContext.uiLocale : localeModel.selectedLocale;
  const pageIndexPath = "./index.html";
  const interactivePath = localizedRoute ? "../../index.html" : "../index.html";
  const stylesheetPath = localizedRoute ? "../../assets/hia-default.css" : "../assets/hia-default.css";
  const alternateLinks = portalContext.uiLocaleAdoption
    ? DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES
        .filter((locale) => locale !== portalContext.uiLocale)
        .map((locale) => {
          const path = localizedRoute
            ? `../${locale}/${stableProjectArtifactName(entry.id)}.html`
            : `./${locale}/${stableProjectArtifactName(entry.id)}.html`;
          const label = resolveProjectUiPlainText(portalContext, "portal.noscript.localealternate", { locale }, locale);
          return `<a href="${escapeHtml(path)}" lang="${escapeHtml(locale)}">${escapeHtml(label)}</a>`;
        })
        .join(" · ")
    : "";
  const skinMessageId = `portal.theme.skin.${portalContext.theme.skinId.slice("portal.".length)}`;
  const schemeMessageId = `portal.theme.scheme.${portalContext.theme.scheme}`;
  return [
    "<!doctype html>",
    `<html lang="${escapeHtml(documentLocale)}" ${renderDefaultThemeRootAttributes(portalContext.theme)}>`,
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtml(entry.name)} - ${escapeHtml(pageTitle)}</title>`,
    `<link rel="icon" href="data:,"><link rel="stylesheet" href="${escapeHtml(stylesheetPath)}"></head>`,
    "<body><div class=\"hia-shell hia-project-shell\"><aside class=\"hia-sidebar\">",
    `<h1>${escapeHtml(projectInput.project.title ?? projectInput.project.name)}</h1>`,
    `<p><a href="${pageIndexPath}">${renderProjectUiMessage(portalContext, "portal.noscript.pageindex", {}, "Page index / 页面索引")}</a></p><p><a href="${escapeHtml(interactivePath)}">${renderProjectUiMessage(portalContext, "portal.noscript.interactive", {}, "Interactive site / 交互站点")}</a></p>`,
    alternateLinks ? `<p>${alternateLinks}</p>` : "",
    `<p>${renderProjectUiMessage(portalContext, "portal.theme.skinlabel", {}, "Skin")}：${renderProjectUiMessage(portalContext, skinMessageId, {}, getPortalThemeSkinLabel(portalContext.theme.skinId))} · ${renderProjectUiMessage(portalContext, "portal.theme.schemelabel", {}, "Scheme")}：${renderProjectUiMessage(portalContext, schemeMessageId, {}, getPortalThemeSchemeLabel(portalContext.theme.scheme))}</p>`,
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
    "  function sourceUiMessage(messageId, fallback, values = {}) {",
    "    return typeof uiMessage === 'function' && typeof config !== 'undefined' && config.ui ? uiMessage(messageId, values, fallback) : fallback;",
    "  }",
    "  function setSourceState(details, state, messageId = '', fallback = '', values = {}) {",
    "    const loadButton = details.querySelector('[data-hia-source-fetch-button]');",
    "    const resetButton = details.querySelector('[data-hia-source-reset]');",
    "    const status = details.querySelector('[data-hia-source-fetch-status]');",
    "    details.dataset.hiaSourceState = state;",
    "    details.toggleAttribute('aria-busy', state === 'loading');",
    "    if (status) {",
    "      status.hidden = state === 'idle';",
    "      if (messageId) status.dataset.hiaUiMessage = messageId; else delete status.dataset.hiaUiMessage;",
    "      if (Object.keys(values).length > 0) status.dataset.hiaUiValues = JSON.stringify(values); else delete status.dataset.hiaUiValues;",
    "      status.textContent = messageId ? sourceUiMessage(messageId, fallback, values) : '';",
    "    }",
    "    if (loadButton) loadButton.hidden = state !== 'idle';",
    "    if (resetButton) {",
    "      resetButton.hidden = state === 'idle';",
    "      const resetMessageId = state === 'loading' ? 'portal.source.cancel' : 'portal.source.reset';",
    "      resetButton.dataset.hiaUiMessage = resetMessageId;",
    "      resetButton.textContent = sourceUiMessage(resetMessageId, state === 'loading' ? 'Cancel' : 'Reset');",
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
    "    setSourceState(details, 'loading', 'portal.source.status.loading', 'Loading source...');",
    "    try {",
    "      /* <lang><zh-CN>只允许文档站同源且无 userinfo 的 content-addressed endpoint。</zh-CN><en>Allow only a same-origin content-addressed endpoint without userinfo.</en></lang> */",
    "      const target = new URL(details.dataset.hiaSourceFetch || '', document.baseURI);",
    "      if (target.origin !== location.origin || target.username || target.password) {",
    "        setSourceState(details, 'denied', 'portal.source.status.denied', 'Source request denied.');",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>请求固定无凭据、同源且拒绝 redirect；signal 同时承担取消与超时。</zh-CN><en>The request is credential-free, same-origin, and redirect-denying; the signal covers cancellation and timeout.</en></lang> */",
    "      const response = await fetch(target, { cache: 'default', credentials: 'omit', mode: 'same-origin', redirect: 'error', signal: controller.signal });",
    "      if (!response.ok) {",
    "        const state = sourceFailureState(response);",
    "        const detail = `${response.status} ${response.statusText}`;",
    "        setSourceState(details, state, 'portal.source.status.failed', `Source load failed: ${detail}`, { detail });",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>先验证字节数与 SHA-384，再把公开 asset 解码为不可执行纯文本。</zh-CN><en>Verify byte length and SHA-384 before decoding the public asset as non-executable plain text.</en></lang> */",
    "      const bytes = await response.arrayBuffer();",
    "      const maxBytes = Math.max(1, Number(details.dataset.hiaSourceMaxBytes || 1048576));",
    "      const expectedBytes = Number(details.dataset.hiaSourceByteLength || 0);",
    "      if (bytes.byteLength > maxBytes || (expectedBytes >= 0 && bytes.byteLength !== expectedBytes)) {",
    "        setSourceState(details, 'integrity-error', 'portal.source.status.size', 'Source size verification failed.');",
    "        return;",
    "      }",
    "      const digest = await crypto.subtle.digest('SHA-384', bytes);",
    "      if (`sha384-${digestBase64(digest)}` !== details.dataset.hiaSourceIntegrity) {",
    "        setSourceState(details, 'integrity-error', 'portal.source.status.integrity', 'Source integrity verification failed.');",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>非法 UTF-8 表示 asset 违反 text contract，归入 integrity-error。</zh-CN><en>Invalid UTF-8 violates the text-asset contract and maps to integrity-error.</en></lang> */",
    "      let text;",
    "      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }",
    "      catch { setSourceState(details, 'integrity-error', 'portal.source.status.decode', 'Source text decoding failed.'); return; }",
    "      if (text.length === 0) {",
    "        if (code) code.textContent = '';",
    "        setSourceState(details, 'empty', 'portal.source.status.empty', 'Source asset is empty.');",
    "        return;",
    "      }",
    "      /* <lang><zh-CN>只投影配置允许的行数，绝不执行或加入搜索索引。</zh-CN><en>Project only the configured line limit, never executing or search-indexing the body.</en></lang> */",
    "      const lines = text.split(/\\r?\\n/u);",
    "      const maxLines = Math.max(1, Number(details.dataset.hiaSourceMaxLines || 400));",
    "      /* <lang><zh-CN>正文只通过Text节点加入DOM；行号链接只指向同源生成页，不产生重复行id。</zh-CN><en>Insert bodies only through Text nodes; line links target generated same-origin pages without duplicate line IDs.</en></lang> */",
    "      if (code) {",
    "        const fragment = document.createDocumentFragment();",
    "        const parsedStart = Number(details.dataset.hiaSourceStartLine || 1);",
    "        const startLine = Number.isSafeInteger(parsedStart) && parsedStart > 0 ? parsedStart : 1;",
    "        const viewer = details.dataset.hiaSourceLink ? new URL(details.dataset.hiaSourceLink, document.baseURI) : undefined;",
    "        const safeViewer = viewer && viewer.origin === location.origin && !viewer.username && !viewer.password ? viewer : undefined;",
    "        for (const [index, text] of lines.slice(0, maxLines).entries()) {",
    "          const number = startLine + index;",
    "          const row = document.createElement('span');",
    "          row.className = 'hia-source-code-line';",
    "          row.dataset.hiaSourceLineNumber = String(number);",
    "          row.style.cssText = 'display:block;min-width:max-content';",
    "          const label = document.createElement(safeViewer ? 'a' : 'span');",
    "          label.className = 'hia-source-line-number';",
    "          label.style.cssText = 'display:inline-block;min-width:3ch;margin-inline-end:1.25rem;text-align:right;user-select:none;color:inherit';",
    "          label.textContent = String(number);",
    "          if (safeViewer) { label.href = safeViewer.pathname + safeViewer.search + '#L' + number; label.setAttribute('aria-label', 'L' + number); }",
    "          else label.setAttribute('aria-hidden', 'true');",
    "          row.append(label, document.createTextNode(text));",
    "          fragment.append(row);",
    "        }",
    "        code.replaceChildren(fragment);",
    "      }",
    "      setSourceState(details, 'ready', 'portal.source.status.ready', 'Source ready.');",
    "    } catch (error) {",
    "      const aborted = error?.name === 'AbortError';",
    "      const detail = String(error?.message || error);",
    "      setSourceState(details, aborted ? 'aborted' : 'network-error', aborted ? 'portal.source.status.aborted' : 'portal.source.status.failed', aborted ? 'Source load aborted.' : `Source load failed: ${detail}`, aborted ? {} : { detail });",
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
  portalContext: RenderProjectPortalContext,
  loadingStrategy: "lazy" | "eager",
  readingTree: RenderProjectNavigationTreeNode[] = []
): string {
  // <lang><zh-CN>只为采用页记录已存在树的祖先路径，恢复深链选中时不遍历/抓取全部分片。</zh-CN><en>Record existing ancestor paths only for adopted pages, restoring deep-link selection without fetching every shard.</en></lang>
  const readingPaths: Array<[string, Array<{ id: string; path: string }>]> = [];
  /**
   * @lang zh-CN 遍历已有中性树，记录每个条目的已知祖先分片；纯内部运行时数据，不新增工件契约。
   * @lang en Walks the existing neutral tree to record known ancestor shards as internal runtime data without adding an artifact contract.
   */
  function collectReadingPaths(nodes: RenderProjectNavigationTreeNode[], ancestors: Array<{ id: string; path: string }>): void {
    for (const node of nodes) {
      if (node.entryId) readingPaths.push([node.entryId, ancestors]);
      if (node.children?.length) collectReadingPaths(node.children, [...ancestors, { id: node.id, path: createProjectNavigationChildrenPath(node.id) }]);
    }
  }
  if (portalContext.siteNavigation) collectReadingPaths(readingTree, []);
  // <lang><zh-CN>只有 adopted surface 嵌入 public plain-text bundle；metadata-only report 仍不含译文。</zh-CN><en>Only adopted surfaces embed the public plain-text bundle; the metadata-only report still contains no translations.</en></lang>
  const uiConfig = portalContext.uiLocaleAdoption
    ? {
        bundles: portalContext.uiLocaleAdoption.bundles,
        initialLocale: portalContext.uiLocale,
        supportedLocales: DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES
      }
    : null;
  const fileProtocolMessage = resolveProjectUiPlainText(
    portalContext,
    "portal.navigation.requiresserver",
    {},
    portalContext.labels.requiresServer
  );
  return [
    "<script>",
    "(() => {",
    `  const config = { navigation: 'navigation/root.json', search: 'search/index.json', relations: 'relations/project.json', loadingStrategy: ${JSON.stringify(loadingStrategy)}, eagerContent: 'content/eager.json', ui: ${JSON.stringify(uiConfig)} };`,
    ...(portalContext.siteNavigation ? [
      `  const readingPaths = new Map(${JSON.stringify(readingPaths).replaceAll("<", "\\u003c")});`,
      "  const readingBranches = new WeakMap();",
      "  let readingEntrySequence = 0;",
      "  /* <lang><zh-CN>同一分片的展开和深链恢复共享在途请求，失败允许下一次显式重试。</zh-CN><en>Disclosure and deep-link restoration share in-flight shard requests, allowing explicit retries after failure.</en></lang> */",
      "  function loadReadingBranch(details, path) {",
      "    if (details.dataset.loaded === 'true') return Promise.resolve();",
      "    if (readingBranches.has(details)) return readingBranches.get(details);",
      "    const loading = document.createElement('p'); loading.className = 'hia-project-loading'; loading.setAttribute('role', 'status'); loading.dataset.hiaUiMessage = 'portal.navigation.loading'; loading.textContent = uiMessage('portal.navigation.loading', {}, 'Loading…');",
      "    details.querySelector(':scope > .hia-project-loading')?.remove(); details.append(loading);",
      "    const request = readJson(path).then(shard => { loading.replaceWith(createTreeList(Array.isArray(shard.children) ? shard.children : [])); details.dataset.loaded = 'true'; }).catch(error => { loading.textContent = uiMessage('portal.navigation.loaderror', { detail: String(error?.message || error) }, 'Navigation unavailable.'); throw error; }).finally(() => readingBranches.delete(details));",
      "    readingBranches.set(details, request); return request;",
      "  }",
      "  /* <lang><zh-CN>仅打开选中项实际祖先，正文加载失败或目录故障不获取无关源码。</zh-CN><en>Open only actual selected-item ancestors without fetching unrelated sources when content or directory loading fails.</en></lang> */",
      "  async function revealReadingEntry(entryId) {",
      "    for (const ancestor of readingPaths.get(entryId) || []) {",
      "      const item = Array.from(treeHost?.querySelectorAll('[data-hia-project-node-id]') || []).find(item => item.dataset.hiaProjectNodeId === ancestor.id);",
      "      const details = item?.querySelector(':scope > details'); if (!details) continue;",
      "      details.open = true; try { await loadReadingBranch(details, ancestor.path); } catch { break; }",
      "    }",
      "  }"
    ] : []),
    "  const treeHost = document.querySelector('[data-hia-project-tree]');",
    "  const contentHost = document.querySelector('[data-hia-project-content]');",
    "  const search = document.querySelector('[data-hia-project-search]');",
    "  const contentLocale = document.querySelector('[data-hia-locale-control]');",
    "  const uiLocale = document.querySelector('[data-hia-ui-locale-control]');",
    "  const viewButtons = Array.from(document.querySelectorAll('[data-hia-project-view]'));",
    "  let rootNodes = [];",
    "  let searchEntries = null;",
    "  let eagerFragments = null;",
    "  let activeView = 'all';",
    "  function uiMessage(messageId, values = {}, fallback = messageId) {",
    "    const selected = String(uiLocale?.value || config.ui?.initialLocale || document.documentElement.lang || 'en');",
    "    const template = config.ui?.bundles?.[selected]?.[messageId] || fallback;",
    "    return template.replace(/\\{([A-Za-z][A-Za-z0-9_]*)\\}/gu, (_match, name) => String(values[name] ?? `{${name}}`));",
    "  }",
    "  function readUiValues(node) {",
    "    try { return JSON.parse(node.getAttribute('data-hia-ui-values') || '{}'); } catch { return {}; }",
    "  }",
    "  function applyUiLocale(root = document) {",
    "    if (!config.ui) return;",
    "    const selected = String(uiLocale?.value || config.ui.initialLocale);",
    "    if (!config.ui.supportedLocales.includes(selected)) return;",
    "    document.documentElement.lang = selected;",
    "    for (const node of root.querySelectorAll('[data-hia-ui-message]')) node.textContent = uiMessage(node.getAttribute('data-hia-ui-message'), readUiValues(node));",
    "    for (const node of root.querySelectorAll('[data-hia-ui-placeholder]')) node.setAttribute('placeholder', uiMessage(node.getAttribute('data-hia-ui-placeholder')));",
    "    for (const node of root.querySelectorAll('[data-hia-ui-aria]')) node.setAttribute('aria-label', uiMessage(node.getAttribute('data-hia-ui-aria')));",
    // <lang><zh-CN>导航href只能来自首写前验证的两语言数据；UI切换不猜测URL或变更正文语言。</zh-CN><en>Navigation hrefs come only from bilingual data validated before output; UI switching guesses no URLs and does not change content locale.</en></lang>
    ...(portalContext.siteNavigation ? [
      "    for (const node of root.querySelectorAll('[data-hia-site-hrefs]')) { const targets = JSON.parse(node.getAttribute('data-hia-site-hrefs')); node.setAttribute('href', targets[selected]); }",
      "    for (const node of root.querySelectorAll('[data-hia-site-language]')) { const other = selected === 'en' ? 'zh-CN' : 'en'; node.lang = other; node.hreflang = other; }"
    ] : []),
    "    try { localStorage.setItem('hia-doc-portal-ui-locale', selected); } catch {}",
    "    document.dispatchEvent(new CustomEvent('hia:ui-locale-change', { detail: { uiLocale: selected } }));",
    "  }",
    "  async function readJson(target) {",
    "    const response = await fetch(target, { credentials: 'omit' });",
    "    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);",
    "    return response.json();",
    "  }",
    "  function showLoadError(error) {",
    `    const detail = location.protocol === 'file:' ? ${JSON.stringify(fileProtocolMessage)} : String(error?.message || error);`,
    "    const hint = location.protocol === 'file:' ? detail : uiMessage('portal.navigation.loaderror', { detail }, detail);",
    ...(portalContext.siteNavigation ? [
      // <lang><zh-CN>目录或索引故障保留已读正文，只替换本次状态提示。</zh-CN><en>Keep the current prose on directory/index failure, replacing only the current status.</en></lang>
      "    contentHost?.querySelector(':scope > .hia-project-load-error')?.remove();"
    ] : ["    if (contentHost) contentHost.innerHTML = '';"]),
    "    const message = document.createElement('p');",
    "    message.className = 'hia-project-load-error';",
    "    message.setAttribute('role', 'status');",
    "    message.dataset.hiaUiMessage = location.protocol === 'file:' ? 'portal.navigation.requiresserver' : 'portal.navigation.loaderror';",
    "    if (location.protocol !== 'file:') message.dataset.hiaUiValues = JSON.stringify({ detail });",
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
    "        openButton.dataset.hiaUiMessage = 'portal.navigation.open';",
    `        openButton.textContent = uiMessage('portal.navigation.open', {}, ${JSON.stringify(portalContext.labels.open)});`,
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
    ...(portalContext.siteNavigation ? [
      "        details.addEventListener('toggle', () => { if (details.open) loadReadingBranch(details, node.childrenPath).catch(() => {}); });"
    ] : [
    "        details.addEventListener('toggle', async () => {",
    "          if (!details.open || details.dataset.loaded === 'true') return;",
    "          details.dataset.loaded = 'true';",
    "          const loading = document.createElement('p');",
    "          loading.className = 'hia-project-loading';",
    "          loading.setAttribute('role', 'status');",
    "          loading.dataset.hiaUiMessage = 'portal.navigation.loading';",
    `          loading.textContent = uiMessage('portal.navigation.loading', {}, ${JSON.stringify(portalContext.labels.loading)});`,
    "          details.append(loading);",
    "          try {",
    "            const shard = await readJson(node.childrenPath);",
    "            loading.replaceWith(createTreeList(Array.isArray(shard.children) ? shard.children : []));",
    "          } catch (error) {",
    "            loading.textContent = String(error?.message || error);",
    "          }",
    "        });"
    ]),
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
    "    if (rootNodes.length > 0) { treeHost.append(createTreeList(rootNodes)); return; }",
    "    /* <lang><zh-CN>空项目仍生成带稳定 message identity 的可翻译状态。</zh-CN><en>An empty project still renders a translatable state with a stable message identity.</en></lang> */",
    "    const empty = document.createElement('p');",
    "    empty.className = 'hia-project-empty';",
    "    empty.dataset.hiaUiMessage = 'portal.common.noentries';",
    "    empty.textContent = uiMessage('portal.common.noentries', {}, 'No project documentation entries.');",
    "    treeHost.append(empty);",
    "  }",
    "  function applyContentLocale() {",
    "    const selected = String(contentLocale?.value || 'und');",
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
    ...(portalContext.siteNavigation ? [
      "    for (const control of treeHost.querySelectorAll('[aria-current]')) control.removeAttribute('aria-current');",
      "    const currentControl = leaf.querySelector(':scope > .hia-project-entry-link, :scope > details > summary > .hia-project-entry-link'); currentControl?.setAttribute('aria-current', 'page');"
    ] : []),
    "    for (const details of leaf.parentElement?.closest('details') ? [leaf.parentElement.closest('details')] : []) {",
    "      let current = details;",
    ...(portalContext.siteNavigation ? [
      // <lang><zh-CN>只展开树内祖先，不强行打开外层手机目录或改变其阅读位置。</zh-CN><en>Expand only in-tree ancestors without forcing the outer mobile directory open or moving its reading position.</en></lang>
      "      while (current && treeHost.contains(current)) { current.open = true; current.dataset.hiaActiveAncestor = 'true'; current = current.parentElement?.closest('details'); }"
    ] : ["      while (current) { current.open = true; current.dataset.hiaActiveAncestor = 'true'; current = current.parentElement?.closest('details'); }"]),
    "    }",
    "  }",
    "  async function loadEntry(entry, updateHash) {",
    "    if (!contentHost) return;",
    ...(portalContext.siteNavigation ? [
      "    const requestSequence = ++readingEntrySequence;",
      "    contentHost.querySelector(':scope > .hia-project-loading')?.remove();",
      "    const readingLoading = document.createElement('p'); readingLoading.className = 'hia-project-loading'; readingLoading.setAttribute('role', 'status'); readingLoading.dataset.hiaUiMessage = 'portal.navigation.loading'; readingLoading.textContent = uiMessage('portal.navigation.loading', {}, 'Loading…'); contentHost.prepend(readingLoading);"
    ] : [`    contentHost.innerHTML = \`<p class="hia-project-loading" role="status" data-hia-ui-message="portal.navigation.loading">\${uiMessage('portal.navigation.loading', {}, ${JSON.stringify(portalContext.labels.loading)})}</p>\`;`]),
    "    try {",
    "      const contentPath = entry.presentationPath || entry.contentPath;",
    ...(portalContext.siteNavigation ? [
      "      const readingContents = await readFragment(contentPath); if (requestSequence !== readingEntrySequence) return; contentHost.innerHTML = readingContents;"
    ] : ["      contentHost.innerHTML = await readFragment(contentPath);"]),
    "      applyContentLocale();",
    "      applyUiLocale(contentHost);",
    "      bindSourceFetch();",
    ...(portalContext.siteNavigation ? ["      document.dispatchEvent(new Event('hia:site-content'));"] : []),
    "      const anchor = entry.memberAnchor || entry.entryId || entry.id;",
    "      const target = Array.from(contentHost.querySelectorAll('[id]')).find((item) => item.id === anchor);",
    "      target?.scrollIntoView({ block: 'start' });",
    ...(portalContext.siteNavigation ? [
      "      if (activeView !== 'all' && entry.view && entry.view !== activeView || search?.value) { activeView = 'all'; if (search) search.value = ''; for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.hiaProjectView === 'all')); renderRoot(); }",
      "      await revealReadingEntry(entry.entryId || entry.id); if (requestSequence !== readingEntrySequence) return;"
    ] : []),
    "      markActiveEntry(entry.entryId || entry.id);",
    ...(portalContext.siteNavigation ? [
      "      if (!matchMedia('(max-width:800px)').matches) treeHost.querySelector('[aria-current=\"page\"]')?.scrollIntoView({block:'nearest', inline:'nearest'});"
    ] : []),
    "      if (updateHash) history.replaceState(null, '', `#entry=${encodeURIComponent(entry.entryId || entry.id)}`);",
    "    } catch (error) {",
    ...(portalContext.siteNavigation ? [
      "      if (requestSequence !== readingEntrySequence) return; const loading = contentHost.querySelector(':scope > .hia-project-loading'); if (loading) { loading.setAttribute('role', 'alert'); loading.textContent = uiMessage('portal.navigation.loaderror', { detail: String(error?.message || error) }, 'Entry unavailable.'); }"
    ] : ["      showLoadError(error);"]),
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
    "      if (nodes.length > 0) { treeHost.append(createTreeList(nodes)); return; }",
    "      /* <lang><zh-CN>筛选空结果使用 polite status，同时保留独立的 message identity。</zh-CN><en>An empty filter result uses a polite status while retaining its own message identity.</en></lang> */",
    "      const empty = document.createElement('p');",
    "      empty.className = 'hia-project-empty';",
    "      empty.setAttribute('role', 'status');",
    "      empty.setAttribute('aria-live', 'polite');",
    "      empty.dataset.hiaUiMessage = 'portal.common.nomatches';",
    "      empty.textContent = uiMessage('portal.common.nomatches', {}, 'No entries match the current filters.');",
    "      treeHost.append(empty);",
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
    ...(portalContext.siteNavigation ? [
      "  document.addEventListener('hia:site-entry', async (event) => { try { const entries = await ensureSearchIndex(); const entry = entries.find(candidate => candidate.id === event.detail); if (entry) await loadEntry({ ...entry, entryId: entry.id }, true); } catch (error) { showLoadError(error); } });"
    ] : []),
    "  contentLocale?.addEventListener('change', applyContentLocale);",
    "  uiLocale?.addEventListener('change', () => applyUiLocale());",
    // <lang><zh-CN>原生菜单保留无脚本阅读，交互页Escape收起并将焦点返回原summary。</zh-CN><en>Native menus retain script-free reading; Escape on interactive pages closes the menu and returns focus to its own summary.</en></lang>
    ...(portalContext.siteNavigation ? ["  document.querySelector('.hia-site-header')?.addEventListener('keydown', (event) => { if (event.key !== 'Escape') return; const menu = event.target.closest('details[open]'); if (menu) { menu.open = false; menu.querySelector('summary')?.focus(); event.preventDefault(); } });"] : []),
    "  document.querySelector('[data-hia-project-relations]')?.addEventListener('click', async () => {",
    "    try {",
    "      const graph = await readJson(config.relations);",
    "      if (!contentHost) return;",
    "      contentHost.innerHTML = '';",
    "      const article = document.createElement('article');",
    "      article.className = 'hia-symbol';",
    "      const heading = document.createElement('h2');",
    "      heading.dataset.hiaUiMessage = 'portal.navigation.relations';",
    `      heading.textContent = uiMessage('portal.navigation.relations', {}, ${JSON.stringify(portalContext.labels.relations)});`,
    "      const summary = document.createElement('p');",
    "      summary.dataset.hiaUiMessage = 'portal.navigation.relationsummary';",
    "      summary.dataset.hiaUiValues = JSON.stringify({ nodes: graph.nodeCount || 0, relations: graph.relationCount || 0 });",
    "      summary.textContent = uiMessage('portal.navigation.relationsummary', { nodes: graph.nodeCount || 0, relations: graph.relationCount || 0 }, `${graph.nodeCount || 0} nodes, ${graph.relationCount || 0} relations`);",
    "      article.append(heading, summary);",
    "      contentHost.append(article);",
    "    } catch (error) { showLoadError(error); }",
    "  });",
    "  readJson(config.navigation).then((shard) => {",
    "    rootNodes = Array.isArray(shard.children) ? shard.children : [];",
    "    renderRoot();",
    "    const hash = location.hash.startsWith('#entry=') ? decodeURIComponent(location.hash.slice(7)) : '';",
    ...(portalContext.siteNavigation ? ["    if (hash) return ensureSearchIndex().then((entries) => {"] : ["    if (hash) ensureSearchIndex().then((entries) => {"]),
    "      const entry = entries.find((candidate) => candidate.id === hash);",
    "      if (entry) loadEntry({ ...entry, entryId: entry.id }, false);",
    "    });",
    "  }).catch(showLoadError);",
    ...(portalContext.siteNavigation ? [
      // <lang><zh-CN>同文档深链和浏览器历史触发原有索引/加载链，保留请求序号保护与原生replaceState行为。</zh-CN><en>Same-document deep links and browser history reuse the index/loading chain, preserving request-sequence protection and native replaceState behavior.</en></lang>
      "  window.addEventListener('hashchange', async () => {",
      "    try {",
      "      if (!location.hash.startsWith('#entry=')) return;",
      "      const hash = decodeURIComponent(location.hash.slice(7));",
      "      const entries = await ensureSearchIndex();",
      "      const entry = entries.find(candidate => candidate.id === hash);",
      "      if (entry) await loadEntry({ ...entry, entryId: entry.id }, false);",
      "    } catch (error) { showLoadError(error); }",
      "  });"
    ] : []),
    "  if (config.ui && uiLocale) {",
    "    try {",
    "      const saved = localStorage.getItem('hia-doc-portal-ui-locale');",
    "      if (saved && config.ui.supportedLocales.includes(saved)) uiLocale.value = saved;",
    "    } catch {}",
    "  }",
    "  applyContentLocale();",
    "  applyUiLocale();",
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

function renderProjectViewControl(
  views: RenderProjectView[],
  entryCounts: Record<string, number>,
  portalContext?: RenderProjectPortalContext
): string {
  const buttons = views
    .map((view) => `<button type="button" class="hia-project-view-button" data-hia-project-view="${escapeHtml(view)}">${renderOptionalProjectUiMessage(portalContext, `portal.view.${view}`, formatProjectViewLabel(view))}<span>${escapeHtml(String(entryCounts[view] ?? 0))}</span></button>`)
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
function renderProjectThemeControl(
  theme: Required<RenderProjectThemeOptions>,
  portalContext?: RenderProjectPortalContext
): string {
  const skins = PORTAL_THEME_SKIN_IDS.map((skinId) => {
    const messageId = `portal.theme.skin.${skinId.slice("portal.".length)}`;
    const marked = portalContext?.uiLocaleAdoption
      ? renderProjectUiMarkedText(portalContext, messageId, {})
      : { attributes: "", text: escapeHtml(getPortalThemeSkinLabel(skinId)) };
    return `<option value="${escapeHtml(skinId)}"${skinId === theme.skinId ? " selected" : ""}${marked.attributes}>${marked.text}</option>`;
  }).join("");
  const schemes = PORTAL_THEME_SCHEMES.map((scheme) => {
    const messageId = `portal.theme.scheme.${scheme}`;
    const marked = portalContext?.uiLocaleAdoption
      ? renderProjectUiMarkedText(portalContext, messageId, {})
      : { attributes: "", text: escapeHtml(getPortalThemeSchemeLabel(scheme)) };
    return `<option value="${escapeHtml(scheme)}"${scheme === theme.scheme ? " selected" : ""}${marked.attributes}>${marked.text}</option>`;
  }).join("");
  return [
    "<div class=\"hia-theme-switch\" data-hia-theme-control>",
    `<label>${renderOptionalProjectUiMessage(portalContext, "portal.theme.skinlabel", "Skin / 皮肤")}<select data-hia-skin-control>${skins}</select></label>`,
    `<label>${renderOptionalProjectUiMessage(portalContext, "portal.theme.schemelabel", "Scheme / 配色")}<select data-hia-scheme-control>${schemes}</select></label>`,
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

/**
 * @lang zh-CN 将项目条目作为完整API参考渲染；本地化正文与单文档复用同一formatter，不将导航摘要当完整正文。
 * @lang en Renders a project entry as a complete API reference, sharing the document field formatter rather than treating a navigation summary as full prose.
 */
function renderProjectEntry(entry: RenderProjectEntry, locales: string[], selectedLocale: string): string {
  const signature = entry.signature ? `<pre class="hia-signature"><code>${escapeHtml(entry.signature)}</code></pre>` : "";
  const summary = renderProjectEntrySummary(entry, locales, selectedLocale);
  // <lang><zh-CN>只排除已作为主描述显示的一个字段，保留同时存在的summary/description及未知扩展字段。</zh-CN><en>Exclude only the one primary field already shown, retaining coexisting summary/description and unknown extensions.</en></lang>
  const otherFields = renderAdditionalI18nFields(entry, locales, selectedLocale, getPrimaryI18nFieldPath(entry));
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
    otherFields,
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
  // <lang><zh-CN>站点采用保留原kind/view数据，用已登记标题呈现徽标，并按确认稿将说明置于徽标之前。</zh-CN><en>Site adoption retains kind/view facts, presenting registered badge labels after the description as confirmed in the design.</en></lang>
  const kindMessageId = `site.kind.${entry.kind.replaceAll("-", ".")}`;
  const kindLabel = portalContext.siteNavigation && portalContext.uiLocaleAdoption?.bundles[portalContext.uiLocale][kindMessageId]
    ? renderProjectUiMessage(portalContext, kindMessageId)
    : escapeHtml(entry.kind);
  // <lang><zh-CN>JS领域中的显式TypeScript原源使用真实语言徽标，缺语言时保留既有JavaScript回退。</zh-CN><en>Explicit TypeScript sources in the JS domain use their actual language badge, retaining the existing JavaScript fallback when unspecified.</en></lang>
  const scriptLanguage = entry.source?.language === "typescript" ? "TypeScript" : "JavaScript";
  const viewLabel = portalContext.siteNavigation && entry.view === "js" ? scriptLanguage : formatProjectViewLabel(entry.view);
  const badges = `<span class="hia-kind">${kindLabel}</span><span class="hia-kind">${escapeHtml(viewLabel)}</span>`;
  const primarySummary = renderProjectEntrySummary(entry, locales, selectedLocale);
  const additionalFields = renderAdditionalI18nFields(entry, locales, selectedLocale, getPrimaryI18nFieldPath(entry), portalContext, entry.id);
  const summaryBadges = portalContext.siteNavigation && primarySummary ? `<div class="hia-site-api-meta">${badges}</div>` : "";
  const headingTag = portalContext.siteNavigation && ancestors.size === 0 ? "h1" : "h2";
  const sections = [
    // <lang><zh-CN>显式IA保留既有section顺序，在正文分区内加入完整字段，避免建立第二条内容降级路径。</zh-CN><en>Explicit IA retains section order while including full fields inside the prose section, avoiding a second content-loss route.</en></lang>
    renderProjectTopicSection("summary", "portal.section.summary", labels.summary, primarySummary + summaryBadges + (portalContext.siteNavigation ? "" : additionalFields), portalContext),
    renderProjectTopicSection(
      "declaration",
      "portal.section.declaration",
      labels.declaration,
      entry.signature ? `<pre class="hia-signature"><code>${escapeHtml(entry.signature)}</code></pre>` : "",
      portalContext
    ),
    portalContext.siteNavigation ? additionalFields : "",
    renderProjectTopicSection("metadata", "portal.section.metadata", labels.metadata, renderProjectTopicMetadata(entry, projectInput.project.productVersion, portalContext), portalContext),
    renderProjectTopicSection("contract", "portal.section.contract", labels.contract, renderProjectTopicContract(entry, portalContext), portalContext),
    renderProjectTopicSection("coverage", "portal.section.coverage", labels.coverage, renderProjectTopicCoverage(projectInput.documentationContinuity, projectInput.ownerAdoption, portalContext), portalContext),
    renderProjectTopicSection("provenance", "portal.section.provenance", labels.provenance, renderProjectTopicProvenance(projectInput.documentationContinuity, projectInput.ownerAdoption, portalContext), portalContext),
    renderProjectTopicSection(
      "members",
      "portal.section.members",
      labels.members,
      renderProjectTopicMembers(
        members,
        projectInput,
        locales,
        selectedLocale,
        portalContext,
        includeMemberBodies,
        nextAncestors
      ),
      portalContext
    ),
    renderProjectTopicSection("relations", "portal.section.relations", labels.relations, renderProjectTopicRelations(entry, projectInput.relationGraph, portalContext), portalContext),
    renderProjectTopicSection("source", "portal.section.source", labels.source, renderProjectTopicSource(entry, portalContext), portalContext),
    renderProjectTopicSection("diagnostics", "portal.section.diagnostics", labels.diagnostics, renderProjectTopicDiagnostics(entry.diagnostics ?? []), portalContext)
  ].join("");
  const searchText = createProjectEntrySearchText(entry);

  return [
    `<article class="hia-symbol hia-project-entry hia-project-topic" id="${escapeHtml(entry.id)}" data-hia-project-entry="${escapeHtml(entry.view)}" data-hia-project-search-text="${escapeHtml(searchText)}">`,
    ...(portalContext.siteNavigation ? [
      `<p class="hia-site-breadcrumbs">${renderProjectUiMessage(portalContext, "site.reading.directory")} / ${escapeHtml(entry.hierarchy?.namespace ?? projectInput.project.title ?? projectInput.project.name)}</p>`,
      `<p class="hia-site-eyebrow">${renderProjectUiMessage(portalContext, "site.reading.api")} · ${escapeHtml(formatProjectViewLabel(entry.view))}</p>`
    ] : []),
    `<header class="hia-project-topic-header"><${headingTag}>${escapeHtml(entry.name)}</${headingTag}>${portalContext.siteNavigation && primarySummary ? "" : badges}</header>`,
    // <lang><zh-CN>采用站点阅读布局时为实际小节建立逐条目稳定锚点，旧输出精确保留。</zh-CN><en>Create entry-specific stable section anchors for adopted reading layouts, preserving legacy output exactly.</en></lang>
    portalContext.siteNavigation ? sections.replace(/data-hia-topic-section="([^"]+)"/gu, (_, section: string) => `id="${escapeHtml(entry.id)}--${section}" tabindex="-1" data-hia-topic-section="${section}"`) : sections,
    "</article>"
  ].join("");
}

/** 空 section 不输出，从而保持“按适用性呈现”。Omits empty sections so topics remain applicability-aware. */
function renderProjectTopicSection(
  section: "summary" | "declaration" | "metadata" | "contract" | "coverage" | "provenance" | "members" | "relations" | "source" | "diagnostics",
  messageId: string,
  label: string,
  body: string,
  portalContext: RenderProjectPortalContext
): string {
  if (!body) {
    return "";
  }
  if (portalContext.siteNavigation && ["summary", "declaration", "source"].includes(section)) {
    return `<section class="hia-project-topic-section" data-hia-topic-section="${section}"><h3>${renderProjectUiMessage(portalContext, messageId, {}, label)}</h3>${body}</section>`;
  }
  // <lang><zh-CN>首要阅读区默认展开；其余区保持原生 disclosure，可同时打开且不依赖脚本。</zh-CN><en>Primary reading sections start open; remaining sections use native disclosure, allow concurrent expansion, and require no script.</en></lang>
  const open = section === "summary" || section === "declaration" || (section === "metadata" && !portalContext.siteNavigation) ? " open" : "";
  return `<details class="hia-project-topic-section" data-hia-topic-section="${section}"${open}><summary>${renderProjectUiMessage(portalContext, messageId, {}, label)}</summary><div class="hia-project-topic-section-body">${body}</div></details>`;
}

/** metadata 只含公开 entry/project facts；关系由 relations section 独立承载。Metadata contains public entry/project facts only; relations stay in their own section. */
function renderProjectTopicMetadata(
  entry: RenderProjectEntry,
  productVersion: string | undefined,
  portalContext: RenderProjectPortalContext
): string {
  const items = [
    `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.kind", {}, "Kind")}</dt><dd>${escapeHtml(entry.kind)}</dd>`,
    `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.view", {}, "View")}</dt><dd>${escapeHtml(entry.view)}</dd>`,
    productVersion ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.productversion", {}, "Product Version")}</dt><dd>${escapeHtml(productVersion)}</dd>` : "",
    entry.input ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.input", {}, "Input")}</dt><dd>${escapeHtml(entry.input.kind)}</dd>` : "",
    entry.input?.path ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.inputpath", {}, "Input Path")}</dt><dd>${escapeHtml(entry.input.path)}</dd>` : "",
    entry.profile ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.profile", {}, "Profile")}</dt><dd>${escapeHtml(entry.profile.profileId)}${entry.profile.profileVersion ? `@${escapeHtml(entry.profile.profileVersion)}` : ""}</dd>` : "",
    entry.hierarchy?.assembly ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.assembly", {}, "Assembly")}</dt><dd>${escapeHtml(entry.hierarchy.assembly)}</dd>` : "",
    entry.hierarchy?.namespace ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.namespace", {}, "Namespace")}</dt><dd>${escapeHtml(entry.hierarchy.namespace)}</dd>` : "",
    entry.hierarchy?.containingType ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.containingtype", {}, "Containing Type")}</dt><dd>${escapeHtml(entry.hierarchy.containingType)}</dd>` : "",
    entry.hierarchy?.symbolDocumentationId ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.documentationid", {}, "Documentation ID")}</dt><dd>${escapeHtml(entry.hierarchy.symbolDocumentationId)}</dd>` : ""
  ].join("");
  return `<dl class="hia-project-meta">${items}</dl>`;
}

/** contract section 与 input locator 分离，避免 path 被误当 contract identity。Separates contract identity from the input locator so paths are not mistaken for contracts. */
function renderProjectTopicContract(entry: RenderProjectEntry, portalContext: RenderProjectPortalContext): string {
  if (!entry.input?.contract && !entry.input?.contractVersion && !entry.input?.artifactId) {
    return "";
  }
  const items = [
    entry.input.contract ? `<dt>${renderProjectUiMessage(portalContext, "portal.section.contract", {}, "Contract")}</dt><dd>${escapeHtml(entry.input.contract)}</dd>` : "",
    entry.input.contractVersion ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.version", {}, "Version")}</dt><dd>${escapeHtml(entry.input.contractVersion)}</dd>` : "",
    entry.input.artifactId ? `<dt>${renderProjectUiMessage(portalContext, "portal.metadata.artifact", {}, "Artifact")}</dt><dd>${escapeHtml(entry.input.artifactId)}</dd>` : ""
  ].join("");
  return `<dl class="hia-project-meta">${items}</dl>`;
}

/** continuity 缺失时不猜测成功，明确输出 unavailable。Never guesses continuity success; absence is rendered as unavailable. */
function renderProjectTopicCoverage(
  continuity: RenderProjectDocumentationContinuitySummary | undefined,
  ownerAdoption: RenderProjectOwnerAdoptionSummary | undefined,
  portalContext: RenderProjectPortalContext
): string {
  if (!continuity && !ownerAdoption) {
    return `<p class="hia-project-unavailable">${renderProjectUiMessage(portalContext, "portal.common.unavailable", {}, portalContext.labels.unavailable)}</p>`;
  }
  return [
    "<dl class=\"hia-project-meta\">",
    ...(continuity ? [
      `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.continuitystatus", {}, "Continuity Status")}</dt><dd>${escapeHtml(continuity.status)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.entries", {}, "Entries")}</dt><dd>${escapeHtml(String(continuity.entries.baselineCount))} → ${escapeHtml(String(continuity.entries.currentCount))}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.delta", {}, "Added / Removed / Unchanged")}</dt><dd>${escapeHtml(String(continuity.entries.addedCount))} / ${escapeHtml(String(continuity.entries.removedCount))} / ${escapeHtml(String(continuity.entries.unchangedCount))}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.requiredoutputs", {}, "Required Outputs")}</dt><dd>${renderProjectUiMessage(portalContext, continuity.requiredOutputsPreserved ? "portal.coverage.preserved" : "portal.coverage.notpreserved", {}, continuity.requiredOutputsPreserved ? "preserved" : "not-preserved")}</dd>`
    ] : []),
    ...(ownerAdoption ? [
      `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.ownerreadiness", {}, "Owner Review Readiness")}</dt><dd>${escapeHtml(ownerAdoption.status)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.ownerinput", {}, "Owner Input / Consent")}</dt><dd>${renderProjectUiMessage(portalContext, ownerAdoption.ownerInput.submitted ? "portal.coverage.submitted" : "portal.coverage.notsubmitted", {}, ownerAdoption.ownerInput.submitted ? "submitted" : "not-submitted")} / ${escapeHtml(ownerAdoption.ownerInput.consent)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.contractrefs", {}, "Contract References")}</dt><dd>${escapeHtml(String(ownerAdoption.contracts.providedCount))} / ${escapeHtml(String(ownerAdoption.contracts.requiredCount))}</dd>`,
      ...(ownerAdoption.workspaceHandoff ? [
        `<dt>${renderProjectUiMessage(portalContext, "portal.coverage.handoffs", {}, "Repository Owners / Handoff Edges")}</dt><dd>${escapeHtml(String(ownerAdoption.workspaceHandoff.repositoryOwnerCount))} / ${escapeHtml(String(ownerAdoption.workspaceHandoff.handoffEdgeCount))}</dd>`
      ] : [])
    ] : []),
    "</dl>"
  ].join("");
}

/** provenance 只显示 exact contract 与三维 semantics，不回读 evidence body。Provenance shows only the exact contract and three semantic dimensions, without reading evidence bodies. */
function renderProjectTopicProvenance(
  continuity: RenderProjectDocumentationContinuitySummary | undefined,
  ownerAdoption: RenderProjectOwnerAdoptionSummary | undefined,
  portalContext: RenderProjectPortalContext
): string {
  if (!continuity && !ownerAdoption) {
    return `<p class="hia-project-unavailable">${renderProjectUiMessage(portalContext, "portal.common.unavailable", {}, portalContext.labels.unavailable)}</p>`;
  }
  return [
    "<dl class=\"hia-project-meta\">",
    ...(continuity ? [
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.continuitycontract", {}, "Continuity Contract")}</dt><dd>${escapeHtml(continuity.contract)}@${escapeHtml(continuity.contractVersion)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.continuityresolution", {}, "Continuity Resolution")}</dt><dd>${escapeHtml(continuity.semantics.resolution)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.continuityconfidence", {}, "Continuity Confidence")}</dt><dd>${escapeHtml(continuity.semantics.confidence)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.continuityprovenance", {}, "Continuity Provenance")}</dt><dd>${escapeHtml(continuity.semantics.provenance)}</dd>`
    ] : []),
    ...(ownerAdoption ? [
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.ownercontract", {}, "Owner Kit Contract")}</dt><dd>${escapeHtml(ownerAdoption.contract)}@${escapeHtml(ownerAdoption.contractVersion)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.ownerresolution", {}, "Owner Kit Resolution")}</dt><dd>${escapeHtml(ownerAdoption.semantics.resolution)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.ownerconfidence", {}, "Owner Kit Confidence")}</dt><dd>${escapeHtml(ownerAdoption.semantics.confidence)}</dd>`,
      `<dt>${renderProjectUiMessage(portalContext, "portal.provenance.ownerprovenance", {}, "Owner Kit Provenance")}</dt><dd>${escapeHtml(ownerAdoption.semantics.provenance)}</dd>`
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
    .filter((candidate) => (candidate.hierarchy?.parentSymbolId === entry.symbolId
      || Boolean(entry.identityScope && entry.hierarchy?.symbolDocumentationId
        && candidate.hierarchy?.parentSymbolId === entry.hierarchy.symbolDocumentationId))
      && candidate.identityScope === entry.identityScope
      && (!entry.identityScope || candidate.view === entry.view))
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
  relationGraph: RenderProjectRelationGraph | undefined,
  portalContext: RenderProjectPortalContext
): string {
  const semanticItems = [
    ...(entry.hierarchy?.baseTypeIds ?? []).map((id) => `<li><span class="hia-kind">${renderProjectUiMessage(portalContext, "portal.relation.inherits", {}, "inherits")}</span> ${escapeHtml(id)}</li>`),
    ...(entry.hierarchy?.interfaceIds ?? []).map((id) => `<li><span class="hia-kind">${renderProjectUiMessage(portalContext, "portal.relation.implements", {}, "implements")}</span> ${escapeHtml(id)}</li>`)
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
  portalContext: RenderProjectPortalContext
): string {
  return [
    entry.source ? renderProjectEntrySource(entry.source, false, portalContext) : "",
    entry.sourceUsability ? renderProjectEntrySourceUsability(entry.sourceUsability, false, portalContext) : "",
    entry.docSourceMap ? renderProjectEntryDocSourceMap(entry.docSourceMap, false, portalContext) : "",
    entry.sourceCommentProjection && portalContext.sourceCommentProjection
      ? renderProjectSourceCommentProjection(entry.sourceCommentProjection, portalContext.sourceCommentProjection, portalContext)
      : ""
  ].join("");
}

/**
 * @lang zh-CN 将 source-comment projection 缩减为 navigation allowlist；正文与 producer 的正文授权事实都不进入 index。
 *
 * @lang en Reduces a source-comment projection to a navigation allowlist; neither bodies nor the producer body-authorization fact enters the index.
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
 * @lang zh-CN 渲染 metadata 与可选纯文本正文。正文必须同时得到 producer projection 与 renderer config 授权。
 *
 * @lang en Renders metadata and optional plain-text bodies. Bodies require authorization from both the producer projection and renderer config.
 */
function renderProjectSourceCommentProjection(
  projection: DocumentationSourceCommentProjection,
  options: Required<RenderProjectSourceCommentProjectionOptions>,
  portalContext?: RenderProjectPortalContext
): string {
  const bodyAuthorized = options.contentPolicy === "explicit-projected-text"
    && projection.contentPolicy === "explicit-projected-text"
    && projection.privacy.projectedCommentTextIncluded;
  const metadata = [
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.commentcontract", "Comment Contract")}</dt><dd>${escapeHtml(`${projection.contract}@${projection.contractVersion}`)}</dd>`,
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.commentlocale", "Comment Locale")}</dt><dd>${escapeHtml(projection.requestedLocale)}</dd>`,
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.commentstatus", "Comment Status")}</dt><dd>${escapeHtml(projection.status)}</dd>`,
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.commententries", "Comment Entries")}</dt><dd>${escapeHtml(String(projection.entries.length))}</dd>`,
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.contentpolicy", "Source Content Policy")}</dt><dd>${escapeHtml(projection.privacy.sourcesContentPolicy)}</dd>`
  ].join("");
  const entries = projection.entries.map((entry) => {
    const range = entry.range
      ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.range", "Range")}</dt><dd>${escapeHtml(`${entry.range.start.line}:${entry.range.start.column}-${entry.range.end.line}:${entry.range.end.column}`)}</dd>`
      : "";
    const body = bodyAuthorized && entry.projectedText !== undefined
      ? `<pre class="hia-source-comment"><code>${escapeHtml(entry.projectedText)}</code></pre>`
      : "";
    return [
      `<article class="hia-source-comment-entry" data-hia-source-comment-id="${escapeHtml(entry.commentId)}">`,
      `<dl class="hia-project-meta"><dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.comment", "Comment")}</dt><dd>${escapeHtml(entry.commentId)}</dd>`,
      `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.resolution", "Resolution")}</dt><dd>${escapeHtml(entry.resolution)}</dd>`,
      `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.confidence", "Confidence")}</dt><dd>${escapeHtml(entry.confidence)}</dd>`,
      `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.section.provenance", "Provenance")}</dt><dd>${escapeHtml(entry.provenance.kind)}</dd>${range}</dl>`,
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

/**
 * @lang zh-CN 仅选择主描述字段，使用原字段身份及共用的locale/fallback规则；不改写i18n模型。
 * @lang en Selects only the primary prose field with its original identity and shared locale/fallback rules, without rewriting the i18n model.
 */
function renderProjectEntrySummary(entry: RenderProjectEntry, locales: string[], selectedLocale: string): string {
  return renderI18nField(entry, getPrimaryI18nFieldPath(entry), locales, selectedLocale, entry.summary ?? "");
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

function renderProjectEntrySource(
  source: RenderProjectSourceRef,
  includeHeading = true,
  portalContext?: RenderProjectPortalContext
): string {
  const range = source.range ? `:${source.range.start.line}${source.range.end ? `-${source.range.end.line}` : ""}` : "";
  const label = `${source.path}${range}`;
  const sourceLabel = source.linkUrl
    ? `<a href="${escapeHtml(source.linkUrl)}">${escapeHtml(label)}</a>`
    : escapeHtml(label);
  const sourceDetails = [
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.section.source", "Source")}</dt><dd>${sourceLabel}</dd>`,
    source.language ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.language", "Language")}</dt><dd>${escapeHtml(source.language)}</dd>` : "",
    source.rangeSource ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.rangesource", "Range Source")}</dt><dd>${escapeHtml(source.rangeSource)}</dd>` : "",
    source.confidence ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.confidence", "Confidence")}</dt><dd>${escapeHtml(source.confidence)}</dd>` : ""
  ].join("");
  const preview = source.preview ? renderProjectSourcePreview(source.preview, source.path, portalContext) : "";
  const fetchPreview = source.fetchUrl ? renderProjectSourceFetch(source, portalContext) : "";

  const heading = includeHeading ? `<h3>${renderOptionalProjectUiMessage(portalContext, "portal.section.source", "Source")}</h3>` : "";
  return `<section class="hia-source-section">${heading}<dl class="hia-project-meta">${sourceDetails}</dl>${preview}${fetchPreview}</section>`;
}

/**
 * @lang zh-CN 只渲染 source-usability allowlist metadata，不生成 link、fetch request、preview 或 source body。
 * @lang en Renders only allowlisted source-usability metadata and creates no link, fetch request, preview, or source body.
 */
function renderProjectEntrySourceUsability(
  sourceUsability: RenderProjectSourceUsabilityRef,
  includeHeading = true,
  portalContext?: RenderProjectPortalContext
): string {
  const projectIdentity = sourceUsability.projectIdentity;
  const details = [
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.resolution", "Resolution")}</dt><dd>${escapeHtml(sourceUsability.resolution)}</dd>`,
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.confidence", "Confidence")}</dt><dd>${escapeHtml(sourceUsability.confidence)}</dd>`,
    projectIdentity ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.project", "Project")}</dt><dd>${escapeHtml(projectIdentity.path)}</dd>` : "",
    projectIdentity ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.projectidentity", "Project Identity")}</dt><dd>${escapeHtml(projectIdentity.id)}</dd>` : "",
    projectIdentity ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.identitypolicy", "Identity Policy")}</dt><dd>${escapeHtml(projectIdentity.policy)}</dd>` : "",
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.section.provenance", "Provenance")}</dt><dd>${escapeHtml(`${sourceUsability.provenance.producer}:${sourceUsability.provenance.activity}`)}</dd>`,
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.contentpolicy", "Source Content Policy")}</dt><dd>${escapeHtml(sourceUsability.privacy.sourcesContentPolicy)}</dd>`
  ].join("");
  const heading = includeHeading ? `<h3>${renderOptionalProjectUiMessage(portalContext, "portal.source.usability", "Source Usability")}</h3>` : "";
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
function renderProjectSourceFetch(
  source: RenderProjectSourceRef,
  portalContext?: RenderProjectPortalContext
): string {
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
    ? `<button type="button" class="hia-source-fetch-button" data-hia-source-fetch-button>${renderOptionalProjectUiMessage(portalContext, "portal.source.load", "Load source / 加载源码")}</button>`
    : "";
  return [
    `<details class="hia-source-preview hia-project-source-preview" data-hia-source-fetch="${escapeHtml(source.fetchUrl)}" data-hia-source-link="${escapeHtml(publicAsset.linkUrl ?? "")}" data-hia-source-start-line="${startLine}" data-hia-source-fetch-trigger="${escapeHtml(fetchTrigger)}" data-hia-source-state="idle" data-hia-source-asset-id="${escapeHtml(publicAsset.assetId)}" data-hia-source-integrity="${escapeHtml(publicAsset.digest)}" data-hia-source-byte-length="${escapeHtml(String(publicAsset.byteLength))}" data-hia-source-max-bytes="1048576" data-hia-source-max-lines="${escapeHtml(String(maxLines))}" data-hia-source-timeout="10000">`,
    `<summary>${escapeHtml(caption)}</summary>`,
    manualButton,
    `<p class="hia-project-loading" data-hia-source-fetch-status role="status" aria-live="polite"${portalContext?.uiLocaleAdoption ? " data-hia-ui-message=\"portal.source.status.loading\"" : ""} hidden></p>`,
    `<pre class="hia-source-code"><code data-language="${escapeHtml(source.language ?? "")}"></code></pre>`,
    `<button type="button" class="hia-source-reset-button" data-hia-source-reset hidden>${renderOptionalProjectUiMessage(portalContext, "portal.source.reset", "Reset / 重置")}</button>`,
    "</details>"
  ].join("");
}

function renderProjectEntryDocSourceMap(
  docSourceMap: RenderProjectEntryDocSourceMapRef,
  includeHeading = true,
  portalContext?: RenderProjectPortalContext
): string {
  const sourceRange = docSourceMap.sourceRange ? `:${docSourceMap.sourceRange.start.line}${docSourceMap.sourceRange.end ? `-${docSourceMap.sourceRange.end.line}` : ""}` : "";
  const diagnostics = docSourceMap.diagnostics && docSourceMap.diagnostics.length > 0
    ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.diagnostics", "Diagnostics")}</dt><dd>${escapeHtml(docSourceMap.diagnostics.join(", "))}</dd>`
    : "";
  const details = [
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.manifest", "Manifest")}</dt><dd>${escapeHtml(docSourceMap.path)}</dd>`,
    `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.entry", "Entry")}</dt><dd>${escapeHtml(docSourceMap.entryId)}</dd>`,
    docSourceMap.sourcePath ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.original", "Original Source")}</dt><dd>${escapeHtml(docSourceMap.sourcePath)}${escapeHtml(sourceRange)}</dd>` : "",
    docSourceMap.sourceRangeSource ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.rangesource", "Range Source")}</dt><dd>${escapeHtml(docSourceMap.sourceRangeSource)}</dd>` : "",
    docSourceMap.sourceConfidence ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.sourceconfidence", "Source Confidence")}</dt><dd>${escapeHtml(docSourceMap.sourceConfidence)}</dd>` : "",
    docSourceMap.artifactPath ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.generatedartifact", "Generated Artifact")}</dt><dd>${escapeHtml(docSourceMap.artifactPath)}</dd>` : "",
    docSourceMap.artifactSelector ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.selector", "Selector")}</dt><dd>${escapeHtml(docSourceMap.artifactSelector)}</dd>` : "",
    docSourceMap.artifactConfidence ? `<dt>${renderOptionalProjectUiMessage(portalContext, "portal.source.artifactconfidence", "Artifact Confidence")}</dt><dd>${escapeHtml(docSourceMap.artifactConfidence)}</dd>` : "",
    diagnostics
  ].join("");
  const actions = renderProjectDocSourceMapOpenRequests(docSourceMap, portalContext);

  const heading = includeHeading ? "<h3>Doc Source Map</h3>" : "";
  return `<section class="hia-source-section">${heading}<dl class="hia-project-meta">${details}</dl>${actions}</section>`;
}

function renderProjectSourcePreview(
  preview: RenderProjectSourcePreviewRef,
  fallbackPath: string,
  portalContext?: RenderProjectPortalContext
): string {
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
    `<summary>${renderOptionalProjectUiMessage(portalContext, "portal.source.preview", `Source Preview ${caption}`, { caption })}</summary>`,
    `<pre class="hia-source-code"${language}><code>${renderSourceLines(preview.content, preview.range?.start.line ?? 1)}</code></pre>`,
    "</details>"
  ].join("");
}

function renderProjectDocSourceMapOpenRequests(
  docSourceMap: RenderProjectEntryDocSourceMapRef,
  portalContext?: RenderProjectPortalContext
): string {
  const sourceLabel = docSourceMap.sourcePath && docSourceMap.sourceRange
    ? `${docSourceMap.sourcePath}:${docSourceMap.sourceRange.start.line}${docSourceMap.sourceRange.start.column ? `:${docSourceMap.sourceRange.start.column}` : ""}`
    : docSourceMap.sourcePath;
  const generatedLabel = docSourceMap.artifactPath ?? "";
  const buttons = [
    sourceLabel
      ? `<button type="button" data-hia-open-request="source" data-hia-open-path="${escapeHtml(docSourceMap.sourcePath ?? "")}" data-hia-open-line="${escapeHtml(String(docSourceMap.sourceRange?.start.line ?? ""))}" data-hia-open-column="${escapeHtml(String(docSourceMap.sourceRange?.start.column ?? ""))}">${renderOptionalProjectUiMessage(portalContext, "portal.source.opensource", `Open Source ${sourceLabel}`, { target: sourceLabel })}</button>`
      : "",
    generatedLabel
      ? `<button type="button" data-hia-open-request="generated" data-hia-open-path="${escapeHtml(generatedLabel)}">${renderOptionalProjectUiMessage(portalContext, "portal.source.opengenerated", `Open Generated ${generatedLabel}`, { target: generatedLabel })}</button>`
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
  projection: GeneratedDocumentationBindingHostProjection | undefined,
  portalContext?: RenderProjectPortalContext
): string {
  if (!projection) {
    return "";
  }

  const summaryItems = [
    `<li><span>${renderOptionalProjectUiMessage(portalContext, "portal.binding.bindings", "Bindings / 绑定")}</span><strong>${escapeHtml(String(projection.summary.bindingCount))}</strong></li>`,
    `<li><span>${renderOptionalProjectUiMessage(portalContext, "portal.binding.expansions", "Expansions / 展开")}</span><strong>${escapeHtml(String(projection.summary.expansionCount))}</strong></li>`,
    `<li><span>${renderOptionalProjectUiMessage(portalContext, "portal.binding.targets", "Targets / 目标")}</span><strong>${escapeHtml(String(projection.summary.targetCount))}</strong></li>`,
    `<li><span>${renderOptionalProjectUiMessage(portalContext, "portal.binding.diagnostics", "Diagnostics / 诊断")}</span><strong>${escapeHtml(String(projection.summary.diagnosticCount))}</strong></li>`,
    `<li><span>sourcesContent</span><strong>${escapeHtml(projection.privacy.sourcesContentPolicy)}</strong></li>`
  ].join("");
  const bindings = projection.bindings.map((binding) => {
    const memberPath = binding.bindingRef.memberPath.join(".") || binding.bindingRef.rootDeclarationId;
    const quality = `${binding.quality.resolutionKind} / ${binding.quality.confidence} / ${binding.quality.provenanceCoverage}`;
    const expansions = binding.expansions
      .map((expansion) => {
        const key = expansion.instanceKey.displayKey ?? expansion.instanceKey.status;
        return `<li>${escapeHtml(expansion.id)} · key=${escapeHtml(key)} · ${escapeHtml(expansion.quality.resolutionKind)} / ${escapeHtml(expansion.quality.confidence)} / ${escapeHtml(expansion.quality.provenanceCoverage)} · ${renderOptionalProjectUiMessage(portalContext, "portal.binding.targetcount", `${expansion.targetIds.length} target(s)`, { count: expansion.targetIds.length })}</li>`;
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
      expansions ? `<details><summary>${renderOptionalProjectUiMessage(portalContext, "portal.binding.expansions", "Expansions / 展开")} (${escapeHtml(String(binding.expansions.length))})</summary><ul>${expansions}</ul></details>` : "",
      targets ? `<details><summary>${renderOptionalProjectUiMessage(portalContext, "portal.binding.targets", "Targets / 目标")} (${escapeHtml(String(binding.targets.length))})</summary><ul>${targets}</ul></details>` : "",
      "</li>"
    ].join("");
  }).join("");

  return [
    "<section class=\"hia-project-summary hia-generated-binding-relations\">",
    `<h2>${renderOptionalProjectUiMessage(portalContext, "portal.binding.heading", "Generated Documentation Bindings / 生成式文档绑定")}</h2>`,
    `<p>${escapeHtml(projection.contract)}@${escapeHtml(projection.contractVersion)} · ${escapeHtml(projection.status)}</p>`,
    `<ul class=\"hia-project-group-list\">${summaryItems}</ul>`,
    bindings ? `<ul class=\"hia-project-relation-list\">${bindings}</ul>` : `<p>${renderOptionalProjectUiMessage(portalContext, "portal.binding.none", "No binding relations available.")}</p>`,
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
  const sourceNodeId = createProjectPathRelationNodeId("source", sourcePath, entry.identityScope);
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
  const artifactNodeId = createProjectPathRelationNodeId("artifact", entry.docSourceMap.artifactPath, entry.identityScope);
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

function createProjectPathRelationNodeId(kind: "source" | "artifact", path: string, identityScope?: string): string {
  // <lang><zh-CN>相同相对路径在不同源归属中保持独立关系节点，旧路径身份保留。</zh-CN><en>Equal relative paths retain distinct relation nodes across source scopes while legacy path identities remain unchanged.</en></lang>
  const normalized = path.replaceAll("\\", "/");
  return identityScope ? `scoped-${kind}:${JSON.stringify([identityScope, normalized])}` : `${kind}:${normalized}`;
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

/**
 * @lang zh-CN 按程序集、命名空间和文档身份构建.NET树，声明入口的显示名称优先于成员提供的标签。
 * @lang en Builds a .NET tree by assembly, namespace and documentation identity, preferring declaration labels over member labels.
 * @param entries <lang><zh-CN>已过滤到.NET视图的条目，不修改其内容。</zh-CN><en>Entries filtered to the .NET view, whose content is not mutated.</en></lang>
 * @param includeTypeRelations <lang><zh-CN>是否加入既有继承节点，默认true。</zh-CN><en>Whether to include existing inheritance nodes, defaulting to true.</en></lang>
 * @returns <lang><zh-CN>排序后的新导航树。</zh-CN><en>A new sorted navigation tree.</en></lang>
 */
function collectDotNetNavigationTree(
  entries: RenderProjectEntry[],
  includeTypeRelations = true
): RenderProjectNavigationTreeNode[] {
  const roots = new Map<string, ProjectNavigationTreeBuilder>();

  for (const entry of entries) {
    const parts = getDotNetNavigationParts(entry);
    const assemblyNode = getOrCreateProjectTreeChild(
      roots,
      entry.identityScope
        ? `scoped-dotnet:${JSON.stringify([entry.identityScope, parts.rootKind, parts.assemblyLabel])}`
        : `dotnet:${parts.rootKind}:${slugProjectGroupLabel(parts.assemblyLabel)}`,
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
      // <lang><zh-CN>成员可能先到；声明到达时同步标签与声明入口，消除输入顺序带来的显示差异。</zh-CN><en>A member may arrive first; synchronize the label with the declaration entry when it arrives.</en></lang>
      typeNode.label = parts.typeLabel;
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
      entriesBySymbolId.set(projectSymbolLookupKey(entry, entry.symbolId), entry);
      // <lang><zh-CN>新作用域同时登记.NET显式文档身份，成员的原始父ID保持不改写。</zh-CN><en>Also index explicit .NET documentation identities in new scopes without rewriting native parent IDs.</en></lang>
      if (entry.identityScope && entry.hierarchy?.symbolDocumentationId) {
        entriesBySymbolId.set(projectSymbolLookupKey(entry, entry.hierarchy.symbolDocumentationId), entry);
      }
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
      ? entriesBySymbolId.get(projectSymbolLookupKey(entry, entry.hierarchy.parentSymbolId))
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
      entriesBySymbolId.set(projectSymbolLookupKey(entry, entry.symbolId), entry);
      // <lang><zh-CN>新作用域同时登记.NET显式文档身份，成员的原始父ID保持不改写。</zh-CN><en>Also index explicit .NET documentation identities in new scopes without rewriting native parent IDs.</en></lang>
      if (entry.identityScope && entry.hierarchy?.symbolDocumentationId) {
        entriesBySymbolId.set(projectSymbolLookupKey(entry, entry.hierarchy.symbolDocumentationId), entry);
      }
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
      entry.identityScope
        ? `scoped-source-root:${JSON.stringify([entry.identityScope, sourceRootLabel])}`
        : `source-root:${slugProjectGroupLabel(sourceRootLabel)}`,
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
      ? entriesBySymbolId.get(projectSymbolLookupKey(entry, entry.hierarchy.parentSymbolId))
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
      ? entriesBySymbolId.get(projectSymbolLookupKey(current, current.hierarchy.parentSymbolId))
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

/**
 * @lang zh-CN 复用文档ID和父类型ID分组，仅将语义显示文本用于标签；旧输入保留既有回退。
 * @lang en Groups by documentation and parent-type IDs, using semantic display text only for labels while retaining legacy fallbacks.
 * @param entry <lang><zh-CN>包含可选语义字段的.NET条目。</zh-CN><en>A .NET entry with optional semantic fields.</en></lang>
 * @returns <lang><zh-CN>分组身份与独立显示标签，不修改条目。</zh-CN><en>Grouping identities and separate display labels without entry mutation.</en></lang>
 */
function getDotNetNavigationParts(entry: RenderProjectEntry): {
  assemblyLabel: string;
  memberLabel: string;
  namespaceLabel: string;
  rootKind: "assembly" | "surface" | "project";
  typeId: string;
  typeLabel: string;
} {
  // <lang><zh-CN>领域根分类和程序集沿用旧输入规则，缺语义数据时继续可读。</zh-CN><en>Retain domain-root and assembly classification so inputs without semantic metadata remain readable.</en></lang>
  const fallback = getDotNetNonAssemblyNavigationParts(entry);
  const assemblyLabel = entry.hierarchy?.assembly || fallback.assemblyLabel;
  const semanticNamespace = entry.hierarchy?.namespace;
  const semanticContainingType = entry.hierarchy?.containingType;
  // <lang><zh-CN>文档ID包含泛型参数数量，不能与C#显示名称互换。</zh-CN><en>Documentation IDs encode generic arity and cannot be replaced with C# display names.</en></lang>
  const symbolId = entry.hierarchy?.symbolDocumentationId
    || (entry.symbolId?.match(/^[A-Z]:/) ? entry.symbolId : "")
    || (entry.id.match(/^[A-Z]:/) ? entry.id : "");
  const typeDocumentationId = entry.kind === "dotnet-type" ? symbolId : entry.hierarchy?.parentSymbolId;
  const canonicalTypeId = typeDocumentationId?.startsWith("T:") ? typeDocumentationId : undefined;
  // <lang><zh-CN>只移除已明确提供的命名空间前缀，保留泛型实参中的点和嵌套类型显示文本。</zh-CN><en>Remove only the supplied namespace prefix, retaining dots in generic arguments and nested type display text.</en></lang>
  const semanticTypeName = entry.kind === "dotnet-type" ? entry.hierarchy?.displayName : semanticContainingType;
  const namespacePrefix = semanticNamespace ? `${semanticNamespace}.` : "";
  const semanticTypeLabel = namespacePrefix && semanticTypeName?.startsWith(namespacePrefix)
    ? semanticTypeName.slice(namespacePrefix.length)
    : semanticTypeName;
  // <lang><zh-CN>既有文档ID拆分只作无父ID时的类型身份和旧标签回退，不解析显示文本中的C#语法。</zh-CN><en>Use existing documentation-ID splitting for owner identity and legacy labels when parent IDs are absent, without parsing display syntax.</en></lang>
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
      typeId: canonicalTypeId || `T:${segments.slice(0, typeIndex + 1).join(".")}`,
      typeLabel: semanticTypeLabel || typeLabel
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
    typeId: canonicalTypeId || (semanticContainingType ? `T:${semanticContainingType}` : symbolId || entry.id),
    typeLabel: semanticTypeLabel || sourceStem || entry.name
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
    // <lang><zh-CN>已审语义标签参与同一检索，包名与默认导出别名可找到原规范页面。</zh-CN><en>Reviewed semantic labels participate in the same search so package names and default-export aliases locate the original canonical page.</en></lang>
    ...(entry.semanticPath?.map(segment => segment.label) ?? []),
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
  // <lang><zh-CN>纯.NET summary与description共用主字段选择，主字段只呈现一次，附加字段全部保留。</zh-CN><en>.NET summary and description share primary-field selection, showing the primary once and retaining every additional field.</en></lang>
  const primaryPath = getPrimaryI18nFieldPath(symbol);
  const description = renderI18nField(symbol, primaryPath, locales, selectedLocale, symbol.summary, document.defaultLocale);
  const otherFields = renderAdditionalI18nFields(symbol, locales, selectedLocale, primaryPath);
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

/**
 * @lang zh-CN 正文formatter只依赖i18n；项目entry和core symbol不需要伪造彼此的字段。
 * @lang en Prose formatting depends only on i18n, so project entries and core symbols never fabricate each other's fields.
 */
type I18nFieldOwner = Pick<HiaSymbol, "i18n">;

/**
 * @lang zh-CN description优先，其次summary，无模型时仍用description承载普通摘要回退。
 * @lang en Prefers description, then summary, retaining description for plain-summary fallback without a model.
 */
function getPrimaryI18nFieldPath(owner: I18nFieldOwner): string {
  return owner.i18n?.fields.description ? "description" : owner.i18n?.fields.summary ? "summary" : "description";
}

/**
 * @lang zh-CN 完整呈现主字段之外的本地化正文；已采用Portal使用其独立UI语言，旧调用保留原标题。
 * @lang en Renders all localized prose beyond the primary field, using the adopted Portal's independent UI language while retaining the legacy heading for other callers.
 * @lang zh-CN 附加字段完整保留，具名字段按首次出现位置归组；不修改输入或把字段文本当HTML。
 * @lang en Retains every additional field, grouping named fields at their first position without input mutation or interpreting field text as HTML.
 * @param symbol <lang><zh-CN>字段所有者，仅读取不修改。</zh-CN><en>Read-only field owner.</en></lang>
 * @param locales <lang><zh-CN>实际正文语言集合。</zh-CN><en>Actual content locales.</en></lang>
 * @param selectedLocale <lang><zh-CN>当前可见正文语言。</zh-CN><en>Currently visible content locale.</en></lang>
 * @param primaryPath <lang><zh-CN>已显示的主字段，默认description。</zh-CN><en>Already displayed primary field, defaulting to description.</en></lang>
 * @param portalContext <lang><zh-CN>可选已采用Portal上下文，用于标题及切换标记。</zh-CN><en>Optional adopted Portal context for the heading and switching marker.</en></lang>
 * @param ownerId <lang><zh-CN>原条目身份，用于稳定字段锚点，默认entry。</zh-CN><en>Original entry identity for stable field anchors, defaulting to entry.</en></lang>
 * @returns <lang><zh-CN>完整附加字段HTML，没有可见字段则为空。</zh-CN><en>Complete additional-field HTML, or an empty string without renderable fields.</en></lang>
 */
function renderAdditionalI18nFields(symbol: I18nFieldOwner, locales: string[], selectedLocale: string, primaryPath = "description", portalContext?: RenderProjectPortalContext, ownerId = "entry"): string {
  const fields = symbol.i18n?.fields || {};
  // <lang><zh-CN>只移除已显示的主字段，允许summary与description同时完整显示。</zh-CN><en>Remove only the already-rendered primary field, allowing summary and description to coexist completely.</en></lang>
  const fieldEntries = Object.entries(fields).filter(([fieldPath]) => fieldPath !== primaryPath);

  if (fieldEntries.length === 0) {
    return "";
  }

  // <lang><zh-CN>具名参数按首次出现位置归组为确认稿的名称/说明表；原字段锚点与双语容器仍逐项保留。</zh-CN><en>Group named parameters at their first occurrence into the confirmed name/description tables, retaining each original field anchor and bilingual container.</en></lang>
  const namedGroups = new Map<string, Array<{ fieldPath: string; name: string }>>();
  /**
   * @lang zh-CN 识别已有生产器的具名说明字段，保留名称，不推断参数类型或值。
   * @lang en Recognizes existing producer named-description fields, preserving names without inferring parameter types or values.
   */
  const namedCategory = (fieldPath: string) => {
    const match = /^(params|parameters|typeParams|typeParameters|exceptions)\.(.+)\.(?:summary|description)$/u.exec(fieldPath);
    return match ? { category: match[1] === "params" ? "parameters" : match[1]!.toLowerCase().replace("typeparams", "typeparameters"), name: match[2]! } : undefined;
  };
  if (portalContext?.siteNavigation) {
    for (const [fieldPath] of fieldEntries) {
      const named = namedCategory(fieldPath);
      if (named) {
        let group = namedGroups.get(named.category);
        if (!group) { group = []; namedGroups.set(named.category, group); }
        group.push({ fieldPath, name: named.name });
      }
    }
  }
  const emittedGroups = new Set<string>();
  const items = fieldEntries
    .map(([fieldPath]) => {
      const renderedField = renderI18nField(symbol, fieldPath, locales, selectedLocale);
      if (renderedField && portalContext?.siteNavigation) {
        const group = namedCategory(fieldPath);
        if (group) {
          if (emittedGroups.has(group.category)) return "";
          emittedGroups.add(group.category);
          const rows = namedGroups.get(group.category)!.map(field => {
            const body = renderI18nField(symbol, field.fieldPath, locales, selectedLocale);
            const anchor = `${ownerId}--field-${stableProjectArtifactName(field.fieldPath)}`;
            return body ? `<tr id="${escapeHtml(anchor)}" tabindex="-1"><td><code>${escapeHtml(field.name)}</code></td><td>${body}</td></tr>` : "";
          }).join("");
          const title = renderProjectUiMessage(portalContext, `site.field.${group.category}`);
          return `<section class="hia-site-field" id="${escapeHtml(ownerId)}--fields-${group.category}" tabindex="-1" data-hia-reading-section="${group.category}"><h3>${title}</h3><table class="hia-site-field-table"><thead><tr><th scope="col">${renderProjectUiMessage(portalContext, "site.field.name")}</th><th scope="col">${renderProjectUiMessage(portalContext, "site.field.description")}</th></tr></thead><tbody>${rows}</tbody></table></section>`;
        }
        // <lang><zh-CN>标准API字段用已登记的双语标题；名称和原字段身份仍保留，扩展字段继续完整可读。</zh-CN><en>Use registered bilingual headings for standard API fields, retaining names and original field identities while preserving extension fields.</en></lang>
        // <lang><zh-CN>复用各生产器已存在的字段别名，只改变阅读标题，不迁移原工件身份。</zh-CN><en>Reuse existing producer field aliases for headings without migrating artifact identities.</en></lang>
        const category = /^returns(?:\.(?:summary|description)|\.\d+\.(?:summary|description))?$/u.test(fieldPath) ? "returns" : /^throws\.\d+$/u.test(fieldPath) ? "exceptions" : fieldPath.toLowerCase();
        const known = ["remarks", "parameters", "typeparameters", "returns", "exceptions"].includes(category);
        const title = known ? renderProjectUiMessage(portalContext, `site.field.${category}`) : `<code>${escapeHtml(fieldPath)}</code>`;
        const anchor = `${ownerId}--field-${stableProjectArtifactName(fieldPath)}`;
        return `<section class="hia-site-field" id="${escapeHtml(anchor)}" tabindex="-1" data-hia-reading-section="${escapeHtml(fieldPath)}"><h3>${title}</h3>${renderedField}</section>`;
      }
      return renderedField
        ? `<div class="hia-i18n-field"><dt>${escapeHtml(fieldPath)}</dt><dd>${renderedField}</dd></div>`
        : "";
    })
    .join("");

  return items ? portalContext?.siteNavigation ? items : `<section class="hia-i18n-fields"><h3>${renderOptionalProjectUiMessage(portalContext, "portal.section.localizedfields", "Localized Fields")}</h3><dl>${items}</dl></section>` : "";
}

/**
 * @lang zh-CN 渲染各请求语言的纯文本和回退，lang取实际来源；裸摘要只采用模型或原文档明确声明，未知时不猜测。
 * @lang en Renders prose and fallback for requested locales with lang from the actual source; bare summaries use only model or document declarations, never guesses for unknown provenance.
 */
function renderI18nField(
  symbol: I18nFieldOwner,
  fieldPath: string,
  locales: string[],
  selectedLocale: string,
  fallbackText = "",
  fallbackLocale?: string
): string {
  const field = getI18nField(symbol.i18n, fieldPath);

  if (!field && !fallbackText) {
    return "";
  }

  // <lang><zh-CN>缺译不等于空字段：先用现有解析规则核全部locale，保留任何可解析正文。</zh-CN><en>A missing translation is not an empty field: use existing resolution rules across all locales and retain any resolvable prose.</en></lang>
  const resolveOptions = createI18nResolveOptions(symbol);
  // <lang><zh-CN>仅单文档调用可补其声明；混合项目不能用整站选择语言替代各来源。</zh-CN><en>Only document calls supply their declaration; mixed projects cannot substitute site selection for individual sources.</en></lang>
  const sourceLocale = symbol.i18n?.defaultLocale || fallbackLocale;
  if (field && !fallbackText && !locales.some((locale) => resolveI18nFieldText(field, locale, resolveOptions).text.length > 0)) return "";

  const blocks = locales
    .map((locale) => renderLocalizedBlock(field, locale, selectedLocale, resolveOptions, fallbackText, sourceLocale))
    .join("");

  return `<div class="hia-localized-set" data-hia-i18n-field="${escapeHtml(fieldPath)}">${blocks}</div>`;
}

/**
 * @lang zh-CN 保留请求语言容器的选择行为，按实际解析语言标正文，未知语言显式阻断祖先继承。
 * @lang en Preserves requested-locale selection while marking actual prose language, explicitly preventing ancestor-language inheritance when unknown.
 */
function renderLocalizedBlock(
  field: HiaI18nField | undefined,
  locale: string,
  selectedLocale: string,
  options: ReturnType<typeof createI18nResolveOptions>,
  fallbackText: string,
  sourceLocale?: string
): string {
  // <lang><zh-CN>字段用既有回退链，裸摘要只用已声明来源，二者均不依赖初始选择推断原文。</zh-CN><en>Fields use existing fallback chains and bare summaries use declared provenance; neither infers source language from initial selection.</en></lang>
  const resolved = field
    ? resolveI18nFieldText(field, locale, options)
    : createFallbackResolvedText(locale, sourceLocale, fallbackText);
  // <lang><zh-CN>显隐仍由请求语言控制；语义lang单独取实际解析结果，避免切换后误标。</zh-CN><en>Requested locale still controls visibility; semantic lang independently follows resolution to avoid mislabeling after switching.</en></lang>
  const hidden = locale === selectedLocale ? "" : " hidden";
  const fallbackAttrs = resolved.usedFallback
    ? ` data-hia-used-fallback="true" data-hia-fallback-from="${escapeHtml(resolved.resolvedLocale)}"`
    : "";
  const fallbackBadge = resolved.usedFallback && resolved.resolvedLocale
    ? `<span class="hia-fallback-badge">fallback: ${escapeHtml(resolved.resolvedLocale)}</span>`
    : "";

  return [
    `<p class="hia-localized-text" data-hia-locale="${escapeHtml(locale)}" lang="${escapeHtml(resolved.resolvedLocale)}"${fallbackAttrs}${hidden}>`,
    escapeHtml(resolved.text),
    fallbackBadge,
    "</p>"
  ].join("");
}

/**
 * @lang zh-CN 裸摘要只保留已声明原文语言；未知来源不制造回退身份，正文仍逐请求语言可读。
 * @lang en Bare summaries retain only declared source language; unknown provenance creates no fallback identity while prose stays readable for every request.
 */
function createFallbackResolvedText(locale: string, sourceLocale: string | undefined, text: string): HiaResolvedText {
  return {
    requestedLocale: locale,
    resolvedLocale: sourceLocale ?? "",
    fallbackChain: [...new Set([locale, ...(sourceLocale ? [sourceLocale] : [])])],
    usedFallback: Boolean(text && sourceLocale && locale !== sourceLocale),
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
    return `<p class="hia-source-code-line">Defined in <a href="${escapeHtml(definedIn.link.lineUrl)}">${escapeHtml(label)}</a></p>`;
  }

  return `<p class="hia-source-code-line">Defined in ${escapeHtml(label)}</p>`;
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

/**
 * @lang zh-CN 从不修改的i18n owner读取默认/fallback语言，保持各渲染路径一致。
 * @lang en Reads default/fallback locales from an unmodified i18n owner consistently across rendering routes.
 */
function createI18nResolveOptions(symbol: I18nFieldOwner) {
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
