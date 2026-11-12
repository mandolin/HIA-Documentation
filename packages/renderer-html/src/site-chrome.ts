/**
 * @file
 * @lang zh-CN 独立生成器的同步公共站点框架，以显式页面和可信正文slot复用导航/阅读组件，不读取源码或文件。
 * @lang en Synchronous public site frame for independent generators, reusing navigation/reading components through explicit pages and trusted slots without source or file reads.
 */
import { header, SITE_STYLE } from "./site-navigation-chrome.js";
import { renderSiteReadingDialogs, SITE_READING_MESSAGES, SITE_READING_SCRIPT, SITE_READING_STYLE } from "./site-reading.js";
import { assertDocumentationSiteNavigation, type DocumentationSiteNavigation } from "./site-navigation.js";
import type { DocumentationPortalUiLocale } from "./information-architecture.js";

export { assertDocumentationSiteNavigation, type DocumentationSiteNavigation } from "./site-navigation.js";
export { renderSourceLines } from "./source-lines.js";

/** @lang zh-CN 实际生成的本页语言对应路径，缺语言时保持缺页。 @lang en Actual generated locale counterparts, preserving absent locales. */
export type SiteChromeLocalePages = Partial<Record<DocumentationPortalUiLocale, string>>;

/** @lang zh-CN 同次生成的公开检索条目，不含源码正文或读取权限。 @lang en Public search entry from this generation, without source bodies or read authority. */
export interface SiteChromeEntry {
  /** @lang zh-CN 原生稳定身份，站内唯一。 @lang en Native stable identity, unique within this site. */
  id: string;
  /** @lang zh-CN 可公开名称。 @lang en Public name. */
  name: string;
  /** @lang zh-CN 可公开条目类别。 @lang en Public entry kind. */
  kind: string;
  /** @lang zh-CN 生成根相对的真实页面及可选锚点。 @lang en Actual generation-root-relative page and optional fragment. */
  page: string;
  /** @lang zh-CN 公开检索文字，不由框架反读正文。 @lang en Public search text, never derived by rereading bodies. */
  searchText: string;
  /** @lang zh-CN 已存在语言页，缺失语言不推测。 @lang en Existing locale pages, without inferred counterparts. */
  localePages?: SiteChromeLocalePages;
}

/** @lang zh-CN 真实正文小节，身份必须出现在本页可信slot中。 @lang en Actual prose section whose identity must exist in this page's trusted slot. */
export interface SiteChromeSection {
  /** @lang zh-CN 原生小节锚点。 @lang en Native section anchor. */
  id: string;
  /** @lang zh-CN 当前界面语言的纯文本标题。 @lang en Plain-text heading in the current UI locale. */
  label: string;
}

/** @lang zh-CN 单页显式上下文及生成器负责安全处理的HTML slot。 @lang en Explicit page context and generator-owned sanitized HTML slots. */
export interface SiteChromePage {
  /** @lang zh-CN 目录、条目或源码页角色，源码页保持无脚本。 @lang en Index, entry, or source role, with source pages remaining script-free. */
  role: "index" | "entry" | "source";
  /** @lang zh-CN 生成根相对HTML路径。 @lang en Generation-root-relative HTML path. */
  outputPath: string;
  /** @lang zh-CN 显式界面语言。 @lang en Explicit UI locale. */
  uiLocale: DocumentationPortalUiLocale;
  /** @lang zh-CN 实际同页语言对应路径。 @lang en Actual same-page locale counterparts. */
  localePages: SiteChromeLocalePages;
  /** @lang zh-CN HTML标题的纯文本。 @lang en Plain-text document title. */
  title: string;
  /** @lang zh-CN 原生生成器已安全处理的正文，框架不重写其身份与字段。 @lang en Native generator's sanitized prose, retaining original identities and fields. */
  bodyHtml: string;
  /** @lang zh-CN 原生生成器的可信目录HTML，链接相对此页。 @lang en Native generator's trusted directory HTML, with page-relative links. */
  directoryHtml: string;
  /** @lang zh-CN 本页实际小节。 @lang en Actual sections of this page. */
  sections: readonly SiteChromeSection[];
  /** @lang zh-CN 原生生成器静态样式路径，相对生成根。 @lang en Native generator stylesheets relative to the generation root. */
  stylesheets?: readonly string[];
  /** @lang zh-CN 原生生成器脚本路径，相对生成根；源码角色不接受。 @lang en Native generator scripts relative to the generation root, forbidden for the source role. */
  scripts?: readonly string[];
  /** @lang zh-CN 原生生成器可信JSON数据slot，仅用于非源码页。 @lang en Native generator's trusted JSON-data slot, for non-source pages only. */
  dataHtml?: string;
  /** @lang zh-CN 本页初始外观，默认system且偏好不持久化。 @lang en Initial appearance, defaulting to system without persistent preferences. */
  scheme?: "system" | "light" | "dark";
}

/** @lang zh-CN 一次生成只写一份的确定性资产。 @lang en Deterministic asset written once per generation. */
export interface SiteChromeAsset {
  /** @lang zh-CN 固定生成根相对路径。 @lang en Fixed generation-root-relative path. */
  readonly path: string;
  /** @lang zh-CN UTF-8资产正文。 @lang en UTF-8 asset contents. */
  readonly contents: string;
}

/** @lang zh-CN 无I/O的站点快照与同步页面渲染服务。 @lang en I/O-free site snapshot and synchronous page-rendering service. */
export interface SiteChrome {
  /** @lang zh-CN 共享资产只读清单。 @lang en Read-only shared asset list. */
  readonly assets: readonly SiteChromeAsset[];
  /**
   * @lang zh-CN 验证显式页面并返回完整HTML，不写文件或改变输入。
   * @lang en Validates an explicit page and returns complete HTML without file writes or input mutation.
   * @param page <lang><zh-CN>本次实际页面、可信slot及语言对应。</zh-CN><en>Actual page, trusted slots and locale counterparts.</en></lang>
   * @returns <lang><zh-CN>UTF-8完整HTML字符串，资产由服务清单另行写出。</zh-CN><en>Complete UTF-8 HTML string, with assets written separately from the service inventory.</en></lang>
   * @throws {TypeError} <lang><zh-CN>无效页面上下文，公开错误省略输入正文。</zh-CN><en>Invalid page context, omitting input contents from public errors.</en></lang>
   */
  renderPage(page: SiteChromePage): string;
}

/**
 * @lang zh-CN 建立导航与条目的独立快照；返回同步页面服务及一份共享资产清单，零文件I/O。
 * @lang en Snapshots navigation and entries independently, returning a synchronous page service and shared assets with zero file I/O.
 * @param options <lang><zh-CN>现有导航契约和实际公开条目。</zh-CN><en>Existing navigation contract and actual public entries.</en></lang>
 * @returns <lang><zh-CN>可由CommonJS同步require或ESM import调用的服务。</zh-CN><en>Service usable through synchronous CommonJS require or ESM import.</en></lang>
 * @throws {TypeError} <lang><zh-CN>输入或页面不合法，错误不含拒绝输入正文。</zh-CN><en>Invalid input or page, without rejected values in error messages.</en></lang>
 */
export function createSiteChrome(options: { navigation: unknown; entries: readonly SiteChromeEntry[] }): SiteChrome {
  if (!options || !Array.isArray(options.entries)) invalid();
  assertDocumentationSiteNavigation(options.navigation);
  // <lang><zh-CN>已通过既有纯数据校验的导航可安全复制，调用方后续修改不改变本服务。</zh-CN><en>Navigation already admitted by the existing pure-data validator can be copied safely, isolating later caller mutation.</en></lang>
  const navigation = JSON.parse(JSON.stringify(options.navigation)) as DocumentationSiteNavigation;
  const identities = new Set<string>();
  const entries = Array.from(options.entries, entry => {
    if (!entry || typeof entry.id !== "string" || !entry.id || identities.has(entry.id)) invalid();
    identities.add(entry.id);
    if (![entry.name, entry.kind, entry.searchText].every(value => typeof value === "string")) invalid();
    relative(entry.page, true);
    const localePages = copyLocalePages(entry.localePages ?? {});
    return { id: entry.id, name: entry.name, kind: entry.kind, page: entry.page, searchText: entry.searchText, localePages };
  });
  // <lang><zh-CN>只生成一份正文外检索索引，避免每个条目页重复整个站点目录。</zh-CN><en>Emit one body-free search index rather than duplicating the whole directory on every entry page.</en></lang>
  const assets = Object.freeze([
    Object.freeze({ path: "assets/hia-site-navigation.css", contents: SITE_STYLE + SITE_CHROME_STYLE + SITE_READING_STYLE }),
    Object.freeze({ path: "assets/hia-site-reading.js", contents: SITE_READING_SCRIPT }),
    Object.freeze({ path: "assets/hia-site-search.json", contents: JSON.stringify({ entries }) })
  ]);
  return Object.freeze({ assets, renderPage: (page: SiteChromePage) => renderPage(navigation, page) });
}

/** @lang zh-CN 根据显式页面上下文组合共享框架与可信slot。 @lang en Combines shared chrome and trusted slots using explicit page context. */
function renderPage(navigation: DocumentationSiteNavigation, page: SiteChromePage): string {
  if (!page || !["index", "entry", "source"].includes(page.role) || !["zh-CN", "en"].includes(page.uiLocale)) invalid();
  relative(page.outputPath);
  if (!page.outputPath.endsWith(".html") || ![page.title, page.bodyHtml, page.directoryHtml].every(value => typeof value === "string")) invalid();
  if (!Array.isArray(page.sections) || [page.stylesheets, page.scripts].some(value => value !== undefined && !Array.isArray(value)) || page.dataHtml !== undefined && typeof page.dataHtml !== "string") invalid();
  // <lang><zh-CN>语言目标按实际页面独立复制，防止构造顶部时引用调用方可变对象。</zh-CN><en>Copy actual locale targets independently so header construction never retains caller-mutable objects.</en></lang>
  const localePages = copyLocalePages(page.localePages);
  const scheme = page.scheme ?? "system";
  if (!["system", "light", "dark"].includes(scheme)) invalid();
  if (page.role === "source" && (page.dataHtml || page.scripts?.length || /<script\b/iu.test(page.bodyHtml + page.directoryHtml))) invalid();
  // <lang><zh-CN>资产始终相对同一生成根，嵌套页面只增加所需上溯层数。</zh-CN><en>Assets remain relative to the same generation root; nested pages add only the required parent depth.</en></lang>
  const prefix = "../".repeat(page.outputPath.split("/").length - 1);
  const localeTargets = Object.fromEntries(Object.entries(localePages).map(([locale, path]) => [locale, prefix + path]));
  const text = (id: keyof typeof SITE_READING_MESSAGES) => `<span data-hia-ui-message="${id}">${escape(SITE_READING_MESSAGES[id][page.uiLocale === "zh-CN" ? 0 : 1])}</span>`;
  // <lang><zh-CN>本页小节按真实锚点去重与核对，再生成桌面/手机共享的链接。</zh-CN><en>Check and deduplicate actual page anchors before producing shared desktop/mobile outline links.</en></lang>
  const sections = new Set<string>();
  const outline = page.sections.map(section => {
    if (!/^[a-zA-Z][\w.:-]*$/u.test(section.id) || sections.has(section.id) || !page.bodyHtml.includes(`id="${section.id}"`) || typeof section.label !== "string") invalid();
    sections.add(section.id);
    return `<a href="#${encodeURIComponent(section.id)}">${escape(section.label)}</a>`;
  }).join("");
  const outlineNav = `<nav data-hia-reading-outline>${outline}</nav>`;
  const styles = (page.stylesheets ?? []).map(path => { relative(path); return `<link rel="stylesheet" href="${escape(prefix + path)}">`; }).join("");
  const scripts = (page.scripts ?? []).map(path => { relative(path); return `<script src="${escape(prefix + path)}" defer></script>`; }).join("");
  // <lang><zh-CN>源码页采用同一原生菜单与静态目录，不附加脚本按钮或正文数据。</zh-CN><en>Source pages use the same native menus and static directory without script controls or prose data.</en></lang>
  const interactive = page.role !== "source";
  let top = header(navigation, page.uiLocale, localeTargets);
  if (!interactive) top = top.replace(/<button\b[^>]*data-hia-reading-dialog[^>]*>[\s\S]*?<\/button>/gu, "");
  const messages = escape(JSON.stringify(SITE_READING_MESSAGES));
  const enhancement = interactive ? `${renderSiteReadingDialogs(text)}${page.dataHtml ?? ""}${scripts}<script src="${prefix}assets/hia-site-reading.js" data-hia-reading-messages="${messages}" data-hia-reading-pages="[]" data-hia-reading-static="${prefix}assets/hia-site-search.json" data-hia-reading-base="${prefix || "./"}" data-hia-reading-initial-scheme="${scheme}" data-hia-reading-initial-skin="portal.classic" defer></script>` : "";
  const policy = interactive ? "" : '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\' \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">';
  return `<!doctype html>
<html lang="${page.uiLocale}" data-hia-site-navigation data-hia-site-chrome data-hia-scheme="${scheme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  ${policy}
  <title>${escape(page.title)}</title>
  <link rel="icon" href="data:">
  ${styles}
  <link rel="stylesheet" href="${prefix}assets/hia-site-navigation.css">
</head>
<body>
  ${top}
  <div class="hia-shell hia-project-shell">
    <details id="hia-site-directory" class="hia-site-directory" open>
      <summary>${text("site.reading.directory")}</summary>
      <aside class="hia-sidebar">${page.directoryHtml}</aside>
    </details>
    <main id="hia-site-main" class="hia-main" tabindex="-1">
      <details class="hia-site-mobile-outline"><summary>${text("site.reading.outline")}</summary>${outlineNav}</details>
      <div data-hia-project-content>${page.bodyHtml}</div>
    </main>
    <aside class="hia-site-toc"><strong>${text("site.reading.outline")}</strong>${outlineNav}</aside>
  </div>
  ${enhancement}
</body>
</html>`;
}

/** @lang zh-CN 复制实际存在的语言路径，拒绝未知语言及不安全目标。 @lang en Copies existing locale paths, rejecting unknown locales and unsafe targets. */
function copyLocalePages(value: SiteChromeLocalePages): SiteChromeLocalePages {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const result: SiteChromeLocalePages = {};
  for (const [locale, path] of Object.entries(value)) {
    if (locale !== "zh-CN" && locale !== "en") invalid();
    relative(path, true);
    result[locale] = path;
  }
  return result;
}

/** @lang zh-CN 校验生成根相对路径，拒绝编码分隔符、逃逸、查询和外部协议。 @lang en Validates root-relative output paths, rejecting encoded separators, traversal, queries, and external protocols. */
function relative(value: unknown, fragment = false): asserts value is string {
  if (typeof value !== "string" || !value || /[\\\u0000-\u0020<>"']/u.test(value) || value.startsWith("/")) invalid();
  const [pathname, ...hashes] = value.split("#");
  if (hashes.length && (!fragment || hashes.length > 1 || !hashes[0])) invalid();
  // <lang><zh-CN>冒号和问号可属于原生不透明片段，但文件路径中的协议/查询仍拒绝。</zh-CN><en>Colons and question marks may belong to native opaque fragments, while path protocols and queries remain forbidden.</en></lang>
  if (/[:?]/u.test(pathname!)) invalid();
  if (hashes.length) {
    try { if (/[\u0000-\u001f\u007f]/u.test(decodeURIComponent(hashes[0]!))) invalid(); }
    catch { invalid(); }
  }
  for (const part of pathname!.split("/")) {
    let decoded: string;
    try { decoded = decodeURIComponent(part); } catch { invalid(); }
    if (!decoded || decoded === "." || decoded === ".." || /[\\/:?#\u0000-\u0020]/u.test(decoded)) invalid();
  }
}

/** @lang zh-CN 统一转义纯文本，不处理可信HTML slot。 @lang en Escapes plain text while leaving trusted HTML slots to their generator. */
function escape(value: string): string {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/** @lang zh-CN 拒绝消息不包含路径或调用者输入。 @lang en Refusal messages contain no paths or caller values. */
function invalid(): never { throw new TypeError("HIA_SITE_CHROME_INVALID: Invalid site page context."); }

/** @lang zh-CN 独立页面的基础布局，不依赖通用文档主题的隐式CSS前置条件。 @lang en Base layout for independent pages without implicit generic-document theme CSS prerequisites. */
const SITE_CHROME_STYLE = `
[data-hia-site-chrome]{--hia-accent:#0047ab}
[data-hia-site-chrome] *,[data-hia-site-chrome] *::before,[data-hia-site-chrome] *::after{box-sizing:border-box}
[data-hia-site-chrome] .hia-shell{display:grid;align-items:start}
[data-hia-site-chrome] .hia-main{min-width:0}
`;
