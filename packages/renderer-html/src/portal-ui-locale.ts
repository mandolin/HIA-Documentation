import {
  evaluateDocumentationUiLocaleCompleteness,
  type DocumentationUiLocaleBundle,
  type DocumentationUiLocaleCompletenessReport,
  type DocumentationUiLocaleCompletenessSummary,
  type DocumentationUiLocaleMessageDefinition,
  type DocumentationUiLocaleRequirement
} from "@hia-doc/core";
import type { DocumentationPortalUiLocale } from "./information-architecture.js";

/**
 * @lang zh-CN
 * Portal owner 输出的 W-P123 metadata-only 报告路径。
 *
 * @lang en
 * Path of the W-P123 metadata-only report emitted by the Portal owner.
 */
export const DOCUMENTATION_PORTAL_UI_LOCALE_REPORT_PATH =
  "documentation-ui-locale-completeness.json" as const;

/** @lang zh-CN 默认 Portal profile identity。 @lang en Default Portal profile identity. */
export const DOCUMENTATION_PORTAL_UI_LOCALE_PROFILE_ID = "portal.default" as const;

/** @lang zh-CN 默认 split-site surface identity。 @lang en Default split-site surface identity. */
export const DOCUMENTATION_PORTAL_UI_LOCALE_SURFACE_ID = "portal.split-site" as const;

/** @lang zh-CN Portal P1 支持的 UI locale 闭集。 @lang en Closed UI-locale set supported by Portal P1. */
export const DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES = ["zh-CN", "en"] as const;

/** @lang zh-CN Portal owner 已知的 profile/surface 配对闭集。 @lang en Closed set of profile/surface pairs known by the Portal owner. */
const DOCUMENTATION_PORTAL_UI_LOCALE_SURFACES: Readonly<Record<string, string>> = Object.freeze({
  [DOCUMENTATION_PORTAL_UI_LOCALE_PROFILE_ID]: DOCUMENTATION_PORTAL_UI_LOCALE_SURFACE_ID,
  "hia-jsdoc.portal-bridge": "hia-jsdoc.portal-bridge"
});

/** @lang zh-CN message 在真实输出中的 mode/channel 使用声明。 @lang en Declared mode/channel use of a message in real output. */
interface PortalUiMessageUse {
  channel: "visible-text" | "accessible-name" | "status-message";
  mode: "interactive" | "no-script";
}

/** @lang zh-CN 一个 owner message 的稳定 identity、占位符、双语正文与真实使用位置。 @lang en Stable identity, placeholders, bilingual text, and real usages of one owner message. */
interface PortalUiMessageRecord {
  en: string;
  id: string;
  placeholders: string[];
  uses: PortalUiMessageUse[];
  "zh-CN": string;
}

// <lang><zh-CN>短别名只用于声明 registry；wire channel 仍保留 W-P123 canonical spelling。</zh-CN><en>Short aliases only reduce registry noise; wire channels retain W-P123 canonical spelling.</en></lang>
const visible = "visible-text" as const;
const accessible = "accessible-name" as const;
const status = "status-message" as const;
const interactive = "interactive" as const;
const noScript = "no-script" as const;

/**
 * @lang zh-CN
 * Portal owner 的完整 public plain-text registry。每个条目都声明真实 surface usage，不能用未使用词条填充完整性报告。
 *
 * @lang en
 * Complete public plain-text registry owned by Portal. Every entry declares a real surface use, preventing unused strings from padding the completeness report.
 */
const portalUiMessageRecords: readonly PortalUiMessageRecord[] = [
  message("portal.locale.uilabel", "界面语言", "Interface language", [[interactive, visible]]),
  message("portal.locale.uiaccessible", "选择界面语言", "Select interface language", [[interactive, accessible]]),
  message("portal.locale.contentlabel", "内容语言", "Content language", [[interactive, visible]]),
  message("portal.locale.contentaccessible", "选择文档内容语言", "Select documentation content language", [[interactive, accessible]]),
  message("portal.theme.skinlabel", "主题皮肤", "Theme skin", [[interactive, visible], [noScript, visible]]),
  message("portal.theme.schemelabel", "配色", "Color scheme", [[interactive, visible], [noScript, visible]]),
  message("portal.theme.skin.classic", "经典", "Classic", [[interactive, visible], [noScript, visible]]),
  message("portal.theme.skin.graphite", "石墨", "Graphite", [[interactive, visible], [noScript, visible]]),
  message("portal.theme.skin.lumen", "明亮", "Lumen", [[interactive, visible], [noScript, visible]]),
  message("portal.theme.scheme.system", "跟随系统", "Use system", [[interactive, visible], [noScript, visible]]),
  message("portal.theme.scheme.light", "浅色", "Light", [[interactive, visible], [noScript, visible]]),
  message("portal.theme.scheme.dark", "深色", "Dark", [[interactive, visible], [noScript, visible]]),
  message("portal.view.all", "全部", "All", [[interactive, visible]]),
  message("portal.view.dotnet", ".NET", ".NET", [[interactive, visible]]),
  message("portal.view.js", "JS", "JS", [[interactive, visible]]),
  message("portal.view.powershell", "PowerShell", "PowerShell", [[interactive, visible]]),
  message("portal.view.css", "CSS", "CSS", [[interactive, visible]]),
  message("portal.view.html", "HTML", "HTML", [[interactive, visible]]),
  message("portal.view.other", "其它", "Other", [[interactive, visible]]),
  message("portal.search.label", "搜索", "Search", [[interactive, visible]]),
  message("portal.search.placeholder", "名称、类型、源码或选择器", "Name, kind, source, or selector", [[interactive, accessible]]),
  message("portal.search.accessible", "搜索文档入口", "Search documentation entries", [[interactive, accessible]]),
  message("portal.navigation.hierarchy", "层级导航", "Hierarchy", [[interactive, visible]]),
  message("portal.navigation.loading", "正在加载…", "Loading…", [[interactive, status]]),
  message("portal.navigation.relations", "项目关系", "Project relations", [[interactive, visible]]),
  message("portal.navigation.select", "请选择一个文档入口。", "Select a documentation entry.", [[interactive, visible]]),
  message("portal.navigation.open", "打开", "Open", [[interactive, visible]]),
  message("portal.navigation.noscriptlink", "无脚本页面索引", "No-script page index", [[interactive, visible]]),
  message("portal.navigation.loaderror", "文档资源加载失败：{detail}", "Documentation resource failed to load: {detail}", [[interactive, status]], ["detail"]),
  message("portal.navigation.requiresserver", "请通过本地或在线 HTTP 服务打开此文档站。", "Open this documentation site through a local or online HTTP server.", [[interactive, status]]),
  message("portal.navigation.relationsummary", "{nodes} 个节点，{relations} 条关系。", "{nodes} nodes, {relations} relations.", [[interactive, visible]], ["nodes", "relations"]),
  message("portal.noscript.indextitle", "无脚本文档索引", "No-script documentation index", [[noScript, visible]]),
  message("portal.noscript.pagesheading", "文档页面", "Documentation pages", [[noScript, visible]]),
  message("portal.noscript.pagesaccessible", "文档页面", "Documentation pages", [[noScript, accessible]]),
  message("portal.noscript.interactive", "交互站点", "Interactive site", [[noScript, visible]]),
  message("portal.noscript.pageindex", "页面索引", "Page index", [[noScript, visible]]),
  message("portal.noscript.localealternate", "切换到 {locale}", "Switch to {locale}", [[noScript, visible], [noScript, accessible]], ["locale"]),
  message("portal.section.summary", "摘要", "Summary", [[interactive, visible], [noScript, visible]]),
  message("portal.section.declaration", "声明", "Declaration", [[interactive, visible], [noScript, visible]]),
  message("portal.section.metadata", "元数据", "Metadata", [[interactive, visible], [noScript, visible]]),
  message("portal.section.contract", "契约", "Contract", [[interactive, visible], [noScript, visible]]),
  message("portal.section.coverage", "覆盖情况", "Coverage", [[interactive, visible], [noScript, visible]]),
  message("portal.section.provenance", "溯源", "Provenance", [[interactive, visible], [noScript, visible]]),
  message("portal.section.members", "成员", "Members", [[interactive, visible], [noScript, visible]]),
  message("portal.section.relations", "关系", "Relations", [[interactive, visible], [noScript, visible]]),
  message("portal.section.source", "源码", "Source", [[interactive, visible], [noScript, visible]]),
  message("portal.section.diagnostics", "诊断", "Diagnostics", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.kind", "类型", "Kind", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.view", "视图", "View", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.productversion", "产品版本", "Product version", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.input", "输入", "Input", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.inputpath", "输入路径", "Input path", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.profile", "配置档", "Profile", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.assembly", "程序集", "Assembly", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.namespace", "命名空间", "Namespace", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.containingtype", "所属类型", "Containing type", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.documentationid", "文档标识", "Documentation ID", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.version", "版本", "Version", [[interactive, visible], [noScript, visible]]),
  message("portal.metadata.artifact", "产物", "Artifact", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.continuitystatus", "连续性状态", "Continuity status", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.entries", "入口", "Entries", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.delta", "新增 / 删除 / 未变", "Added / removed / unchanged", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.requiredoutputs", "必需输出", "Required outputs", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.preserved", "已保持", "Preserved", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.notpreserved", "未保持", "Not preserved", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.ownerreadiness", "Owner 复核就绪度", "Owner review readiness", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.ownerinput", "Owner 输入 / 同意", "Owner input / consent", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.submitted", "已提交", "Submitted", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.notsubmitted", "未提交", "Not submitted", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.contractrefs", "契约引用", "Contract references", [[interactive, visible], [noScript, visible]]),
  message("portal.coverage.handoffs", "仓库 Owner / 交接边", "Repository owners / handoff edges", [[interactive, visible], [noScript, visible]]),
  message("portal.common.unavailable", "暂不可用", "Unavailable", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.continuitycontract", "连续性契约", "Continuity contract", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.continuityresolution", "连续性解析", "Continuity resolution", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.continuityconfidence", "连续性置信度", "Continuity confidence", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.continuityprovenance", "连续性溯源", "Continuity provenance", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.ownercontract", "Owner kit 契约", "Owner kit contract", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.ownerresolution", "Owner kit 解析", "Owner kit resolution", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.ownerconfidence", "Owner kit 置信度", "Owner kit confidence", [[interactive, visible], [noScript, visible]]),
  message("portal.provenance.ownerprovenance", "Owner kit 溯源", "Owner kit provenance", [[interactive, visible], [noScript, visible]]),
  message("portal.relation.inherits", "继承", "Inherits", [[interactive, visible], [noScript, visible]]),
  message("portal.relation.implements", "实现", "Implements", [[interactive, visible], [noScript, visible]]),
  message("portal.source.language", "语言", "Language", [[interactive, visible], [noScript, visible]]),
  message("portal.source.rangesource", "范围来源", "Range source", [[interactive, visible], [noScript, visible]]),
  message("portal.source.confidence", "置信度", "Confidence", [[interactive, visible], [noScript, visible]]),
  message("portal.source.resolution", "解析", "Resolution", [[interactive, visible], [noScript, visible]]),
  message("portal.source.project", "项目", "Project", [[interactive, visible], [noScript, visible]]),
  message("portal.source.projectidentity", "项目身份", "Project identity", [[interactive, visible], [noScript, visible]]),
  message("portal.source.identitypolicy", "身份策略", "Identity policy", [[interactive, visible], [noScript, visible]]),
  message("portal.source.contentpolicy", "源码内容策略", "Source content policy", [[interactive, visible], [noScript, visible]]),
  message("portal.source.usability", "源码可用性", "Source usability", [[interactive, visible], [noScript, visible]]),
  message("portal.source.preview", "源码预览 {caption}", "Source preview {caption}", [[interactive, visible], [noScript, visible]], ["caption"]),
  message("portal.source.load", "加载源码", "Load source", [[interactive, visible]]),
  message("portal.source.reset", "重置", "Reset", [[interactive, visible]]),
  message("portal.source.cancel", "取消", "Cancel", [[interactive, visible]]),
  message("portal.source.status.loading", "正在加载源码…", "Loading source…", [[interactive, status]]),
  message("portal.source.status.denied", "源码请求被拒绝。", "Source request denied.", [[interactive, status]]),
  message("portal.source.status.failed", "源码加载失败：{detail}", "Source load failed: {detail}", [[interactive, status]], ["detail"]),
  message("portal.source.status.size", "源码大小校验失败。", "Source size verification failed.", [[interactive, status]]),
  message("portal.source.status.integrity", "源码完整性校验失败。", "Source integrity verification failed.", [[interactive, status]]),
  message("portal.source.status.decode", "源码文本解码失败。", "Source text decoding failed.", [[interactive, status]]),
  message("portal.source.status.empty", "源码资源为空。", "Source asset is empty.", [[interactive, status]]),
  message("portal.source.status.ready", "源码已就绪。", "Source ready.", [[interactive, status]]),
  message("portal.source.status.aborted", "源码加载已取消。", "Source load aborted.", [[interactive, status]]),
  message("portal.source.diagnostics", "诊断", "Diagnostics", [[interactive, visible], [noScript, visible]]),
  message("portal.source.manifest", "清单", "Manifest", [[interactive, visible], [noScript, visible]]),
  message("portal.source.entry", "入口", "Entry", [[interactive, visible], [noScript, visible]]),
  message("portal.source.original", "原始源码", "Original source", [[interactive, visible], [noScript, visible]]),
  message("portal.source.sourceconfidence", "源码置信度", "Source confidence", [[interactive, visible], [noScript, visible]]),
  message("portal.source.generatedartifact", "生成产物", "Generated artifact", [[interactive, visible], [noScript, visible]]),
  message("portal.source.selector", "选择器", "Selector", [[interactive, visible], [noScript, visible]]),
  message("portal.source.artifactconfidence", "产物置信度", "Artifact confidence", [[interactive, visible], [noScript, visible]]),
  message("portal.source.opensource", "打开源码 {target}", "Open source {target}", [[interactive, visible]], ["target"]),
  message("portal.source.opengenerated", "打开生成产物 {target}", "Open generated artifact {target}", [[interactive, visible]], ["target"]),
  message("portal.source.commentcontract", "注释契约", "Comment contract", [[interactive, visible], [noScript, visible]]),
  message("portal.source.commentlocale", "注释语言", "Comment locale", [[interactive, visible], [noScript, visible]]),
  message("portal.source.commentstatus", "注释状态", "Comment status", [[interactive, visible], [noScript, visible]]),
  message("portal.source.commententries", "注释条目", "Comment entries", [[interactive, visible], [noScript, visible]]),
  message("portal.source.comment", "注释", "Comment", [[interactive, visible], [noScript, visible]]),
  message("portal.source.range", "范围", "Range", [[interactive, visible], [noScript, visible]]),
  message("portal.binding.heading", "生成式文档绑定", "Generated documentation bindings", [[interactive, visible]]),
  message("portal.binding.bindings", "绑定", "Bindings", [[interactive, visible]]),
  message("portal.binding.expansions", "展开", "Expansions", [[interactive, visible]]),
  message("portal.binding.targets", "目标", "Targets", [[interactive, visible]]),
  message("portal.binding.diagnostics", "诊断", "Diagnostics", [[interactive, visible]]),
  message("portal.binding.targetcount", "{count} 个目标", "{count} targets", [[interactive, visible]], ["count"]),
  message("portal.binding.none", "没有可用的绑定关系。", "No binding relations available.", [[interactive, visible]]),
  message("portal.common.noentries", "没有项目文档入口。", "No project documentation entries.", [[interactive, visible]]),
  message("portal.common.nomatches", "没有入口匹配当前筛选条件。", "No entries match the current filters.", [[interactive, status]])
] as const;

/** @lang zh-CN 按 registry 顺序冻结的稳定 message id 清单。 @lang en Stable message-id list frozen in registry order. */
export const DOCUMENTATION_PORTAL_UI_MESSAGE_IDS = Object.freeze(
  portalUiMessageRecords.map(({ id }) => id)
);

/** @lang zh-CN Portal locale adoption 的 caller 配置。 @lang en Caller configuration for Portal locale adoption. */
export interface DocumentationPortalUiLocaleAdoptionOptions {
  contentLocale: string;
  contentLocales: string[];
  defaultUiLocale: DocumentationPortalUiLocale;
  profileId?: string;
  surfaceId?: string;
}

/** @lang zh-CN Portal owner 生成的已通过 gate 的 report、summary 与 runtime bundle。 @lang en Gate-complete report, summary, and runtime bundles produced by the Portal owner. */
export interface DocumentationPortalUiLocaleAdoption {
  bundles: Readonly<Record<DocumentationPortalUiLocale, Readonly<Record<string, string>>>>;
  report: DocumentationUiLocaleCompletenessReport;
  reportJson: string;
  summary: DocumentationUiLocaleCompletenessSummary;
}

/**
 * @lang zh-CN
 * 构造并执行 W-P123 owner gate；任何 malformed 或 incomplete catalog 都在 renderer 生成文件前拒绝。
 *
 * @lang en
 * Builds and executes the W-P123 owner gate; any malformed or incomplete catalog is rejected before the renderer emits files.
 *
 * @param options <lang><zh-CN>caller-explicit locale 与 owner-neutral profile/surface identity。</lang><en>Caller-explicit locales and owner-neutral profile/surface identities.</en></lang>
 * @returns <lang><zh-CN>不含私有数据的 report 与仅供页面 runtime 使用的 public bundle。</lang><en>A privacy-safe report and public bundles used only by the page runtime.</en></lang>
 * @throws <lang><zh-CN>当 W-P123 evaluator 未返回 complete report 时抛出。</lang><en>Thrown when the W-P123 evaluator does not return a complete report.</en></lang>
 */
export function createDocumentationPortalUiLocaleAdoption(
  options: DocumentationPortalUiLocaleAdoptionOptions
): DocumentationPortalUiLocaleAdoption {
  // <lang><zh-CN>profile/surface identity 必须精确匹配 owner registry，避免稳定 ID 退化为任意调用者文本。</zh-CN><en>Profile/surface identity must exactly match the owner registry so stable IDs cannot degrade into arbitrary caller text.</en></lang>
  const profileId = options.profileId ?? DOCUMENTATION_PORTAL_UI_LOCALE_PROFILE_ID;
  const surfaceId = options.surfaceId ?? DOCUMENTATION_PORTAL_UI_LOCALE_SURFACE_ID;
  if (DOCUMENTATION_PORTAL_UI_LOCALE_SURFACES[profileId] !== surfaceId) {
    throw new TypeError(
      "HIA_PORTAL_UI_LOCALE_SURFACE_UNSUPPORTED: UI locale profile and surface must use a registered exact pair."
    );
  }
  // <lang><zh-CN>定义与 bundle 从同一 owner registry 投影，但 placeholder 集合仍由显式记录声明。</zh-CN><en>Definitions and bundles project from one owner registry, while placeholder sets remain explicit registry facts.</en></lang>
  const messages: DocumentationUiLocaleMessageDefinition[] = portalUiMessageRecords.map((record) => ({
    messageId: record.id,
    placeholderNames: [...record.placeholders],
    visibility: "public"
  }));
  // <lang><zh-CN>runtime bundle 与 evaluator bundle 分开构造：前者按 id lookup，后者使用 contract entry array。</zh-CN><en>Runtime and evaluator bundles are built separately: the former is keyed by id, the latter uses contract entry arrays.</en></lang>
  const runtimeBundles = Object.freeze(Object.fromEntries(DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES.map((locale) => [
    locale,
    Object.freeze(Object.fromEntries(portalUiMessageRecords.map((record) => [record.id, record[locale]])))
  ]))) as DocumentationPortalUiLocaleAdoption["bundles"];
  const bundles: DocumentationUiLocaleBundle[] = DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES.map((locale) => ({
    bundleId: `portal.${locale.toLowerCase().replaceAll("-", "")}`,
    locale,
    entries: portalUiMessageRecords.map((record) => ({ messageId: record.id, text: record[locale] }))
  }));
  // <lang><zh-CN>requirements 直接来自每个词条的真实 use，不根据 DOM 顺序或译文生成 identity。</zh-CN><en>Requirements come directly from real per-message uses, never from DOM order or translated text.</en></lang>
  const requirements: DocumentationUiLocaleRequirement[] = portalUiMessageRecords.flatMap((record) => record.uses.map((use) => ({
    requirementId: `${record.id}.${use.mode === interactive ? "i" : "n"}.${use.channel === visible ? "v" : use.channel === accessible ? "a" : "s"}`,
    surfaceId,
    mode: use.mode,
    stateId: `state.${record.id.split(".")[1] ?? "portal"}`,
    channel: use.channel,
    messageId: record.id
  })));
  // <lang><zh-CN>页面默认语言采用 UI locale；正文 locale 作为 language-of-parts 显式列出，避免两者互相推断。</zh-CN><en>The page default is the UI locale; content locales are explicit languages of parts so neither dimension is inferred from the other.</en></lang>
  const languageMetadata = DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES.map((uiLocale) => ({
    uiLocale,
    documentLanguage: uiLocale,
    partLanguages: options.contentLocales.filter((locale) => locale.toLowerCase() !== uiLocale.toLowerCase())
  }));
  const result = evaluateDocumentationUiLocaleCompleteness({
    profileId,
    contentLocales: [...options.contentLocales],
    uiLocales: [...DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES],
    defaultUiLocale: options.defaultUiLocale,
    messages,
    bundles,
    fallbackChains: DOCUMENTATION_PORTAL_UI_CATALOG_LOCALES.map((uiLocale) => ({ uiLocale, fallbackLocales: [] })),
    surfaces: [{
      surfaceId,
      contentLocale: options.contentLocale,
      modes: [
        { mode: interactive, channels: [visible, accessible, status] },
        { mode: noScript, channels: [visible, accessible] }
      ],
      languageMetadata
    }],
    requirements
  });

  if (result.status !== "complete" || !result.report || !result.reportJson || !result.summary) {
    throw new TypeError(
      "HIA_PORTAL_UI_LOCALE_INCOMPLETE: Portal UI locale catalog must pass the exact W-P123 gate before rendering."
    );
  }
  return Object.freeze({
    bundles: runtimeBundles,
    report: result.report,
    reportJson: result.reportJson,
    summary: result.summary
  });
}

/**
 * @lang zh-CN
 * 从已验证 Portal bundle 解析一条纯文本消息并替换非执行占位符。
 *
 * @lang en
 * Resolves one plain-text message from a validated Portal bundle and substitutes non-executable placeholders.
 *
 * @param adoption <lang><zh-CN>当前 renderer 调用的已通过 gate 的 adoption。</lang><en>Gate-complete adoption for the current render call.</en></lang>
 * @param locale <lang><zh-CN>显式 UI locale。</lang><en>Explicit UI locale.</en></lang>
 * @param messageId <lang><zh-CN>稳定 dotted message identity。</lang><en>Stable dotted message identity.</en></lang>
 * @param values <lang><zh-CN>按名称替换的纯文本值。</lang><en>Plain-text values substituted by name.</en></lang>
 * @returns <lang><zh-CN>已解析但尚未 HTML 转义的纯文本。</lang><en>Resolved plain text that has not yet been HTML-escaped.</en></lang>
 */
export function resolveDocumentationPortalUiMessage(
  adoption: DocumentationPortalUiLocaleAdoption,
  locale: DocumentationPortalUiLocale,
  messageId: string,
  values: Readonly<Record<string, string | number>> = {}
): string {
  const template = adoption.bundles[locale][messageId];
  if (template === undefined) {
    throw new TypeError(`HIA_PORTAL_UI_MESSAGE_UNKNOWN: Unknown Portal UI message identity ${messageId}.`);
  }
  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/gu, (_match, name: string) => String(values[name] ?? `{${name}}`));
}

/**
 * @lang zh-CN 构造一个 registry 条目并复制可变数组，避免声明后被调用方修改。
 * @lang en Builds one registry entry and copies mutable arrays so callers cannot mutate declarations afterward.
 */
function message(
  id: string,
  zhCN: string,
  en: string,
  uses: Array<[PortalUiMessageUse["mode"], PortalUiMessageUse["channel"]]>,
  placeholders: string[] = []
): PortalUiMessageRecord {
  return Object.freeze({
    id,
    "zh-CN": zhCN,
    en,
    placeholders: Object.freeze([...placeholders]) as unknown as string[],
    uses: Object.freeze(uses.map(([mode, channel]) => Object.freeze({ mode, channel }))) as unknown as PortalUiMessageUse[]
  });
}
