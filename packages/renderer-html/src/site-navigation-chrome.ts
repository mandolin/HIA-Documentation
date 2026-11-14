/**
 * @file
 * @lang zh-CN 已确认公共顶部的逐文件呈现，完整HTML共享样式，片段与源码文本保持原字节。
 * @lang en Per-file presentation of the confirmed shared header, sharing styles across complete HTML while retaining fragment and source-text bytes.
 */
import type { RenderedHtmlFile } from "./index.js";
import type { DocumentationPortalUiLocale } from "./information-architecture.js";
import { createSiteNavigationUiMessages } from "./portal-ui-locale.js";
import { renderSiteReading, SITE_READING_SCRIPT, SITE_READING_STYLE, type SiteReadingEntry } from "./site-reading.js";
import type { DocumentationSiteNavigation, DocumentationSiteNavigationLocalizedText } from "./site-navigation.js";

/**
 * @lang zh-CN 每次生成仅输出一次的导航样式路径。
 * @lang en Navigation stylesheet path emitted once per render.
 */
const STYLE_PATH = "assets/hia-site-navigation.css";

/**
 * @lang zh-CN 逐页附加宿主导航并保留背压，仅处理完整HTML；调用者在迭代前验证并复制导航。
 * @lang en Adds host navigation per page while retaining backpressure, handling complete HTML only; the caller validates and snapshots navigation before iteration.
 * @param files <lang><zh-CN>原惰性文件序列。</zh-CN><en>Original lazy file sequence.</en></lang>
 * @param navigation <lang><zh-CN>已验证的不可外部变更快照。</zh-CN><en>Validated snapshot isolated from external mutation.</en></lang>
 * @param uiLocale <lang><zh-CN>调用者明确指定的默认界面语言。</zh-CN><en>Caller-explicit default UI locale.</en></lang>
 * @param entries <lang><zh-CN>同次渲染的公开条目上下文，默认空集合。</zh-CN><en>Public entry context from the same render, defaulting to empty.</en></lang>
 * @param customTokens <lang><zh-CN>主题owner已校验的显式颜色键，默认无覆写。</zh-CN><en>Explicit color keys validated by the theme owner, defaulting to no overrides.</en></lang>
 * @returns <lang><zh-CN>同序输出及一份共享样式，不保留全站正文。</zh-CN><en>Same-order output plus one shared stylesheet, without retaining site bodies.</en></lang>
 */
export function* withSiteNavigation(files: Iterable<RenderedHtmlFile>, navigation: DocumentationSiteNavigation, uiLocale: DocumentationPortalUiLocale, entries: SiteReadingEntry[] = [], customTokens: readonly string[] = []): Generator<RenderedHtmlFile> {
  // <lang><zh-CN>两种完整顶部只生成一次，静态本地化页按已有已知路径选择，源码页采用显式默认语言。</zh-CN><en>Build each localized header once; localized static pages use existing known paths and source viewers use the explicit default locale.</en></lang>
  const headers = { "zh-CN": header(navigation, "zh-CN"), en: header(navigation, "en") };
  // <lang><zh-CN>无脚本页保留完全相同的可见导航，省去只供运行时切换使用的双语JSON属性及不可用按钮。</zh-CN><en>Script-free pages retain identical visible navigation while omitting runtime-only bilingual JSON attributes and unavailable buttons.</en></lang>
  const staticHeaders = Object.fromEntries(Object.entries(headers).map(([locale, html]) => [locale, html.replace(/ data-hia-(?:ui-message|ui-aria|site-hrefs)="[^"]*"/gu, "").replace(/<button\b[^>]*data-hia-reading-dialog[^>]*>[\s\S]*?<\/button>/gu, "")])) as typeof headers;
  // <lang><zh-CN>静态对应路径预建单次索引，避免完整参考站逐文件扫描全部条目；只纳入本次真实生成的页面。</zh-CN><en>Index static counterparts once to avoid scanning all entries for every file in a complete reference site; include only pages generated in this render.</en></lang>
  const entryLocales = new Map(entries.flatMap(entry => Object.values(entry.localePages ?? {}).map(page => [page, entry.localePages!] as const)));
  // <lang><zh-CN>旧静态别名按实际生成article身份关联同一语言目录，不根据文件名猜测身份或译文。</zh-CN><en>Associate legacy static aliases with the same locale directory through their actual generated article identity, without inferring identities or translations from file names.</en></lang>
  const localesByIdentity = new Map(entries.map(entry => [escape(entry.id), entry.localePages]));
  // <lang><zh-CN>只有实际交互入口引用增强脚本，静态和来源页只共享样式。</zh-CN><en>Only actual interactive entries reference enhancement scripts; static and source pages share styles alone.</en></lang>
  let interactive = false;
  for (const file of files) {
    if (!file.contentType.startsWith("text/html")) { yield file; continue; }
    // <lang><zh-CN>延迟源码页的getter只读取一次，避免同一大页面被重复构造。</zh-CN><en>Read a lazy source viewer's getter once to avoid repeatedly constructing the same large page.</en></lang>
    const originalContents = file.contents;
    if (!originalContents.startsWith("<!doctype html>")) { yield file; continue; }
    // <lang><zh-CN>只有生成器的根入口可以挂载运行时，源码或正文中同名纯文本不影响页面角色。</zh-CN><en>Only the generator's root entry can host the runtime. Matching text in a source viewer or prose cannot change its role.</en></lang>
    const hasRuntime = file.path === "index.html" && originalContents.includes("data-hia-project-content");
    const locale = file.path.startsWith("pages/zh-CN/") ? "zh-CN" : file.path.startsWith("pages/en/") ? "en" : uiLocale;
    const stylesheet = `${"../".repeat(file.path.split("/").length - 1)}${STYLE_PATH}`;
    // <lang><zh-CN>无脚本条目语言入口指向同主题实际页面，所有权未知的目录和源码页继续采用原站点目标。</zh-CN><en>Script-free entry language links target the actual same-topic page, while unowned directories and source viewers retain site-level targets.</en></lang>
    const counterparts = entryLocales.get(file.path) ?? (file.path.startsWith("pages/") ? localesByIdentity.get(originalContents.match(/<article\b[^>]*\bid="([^"]*)"/u)?.[1] ?? "") : undefined);
    const pageHeader = counterparts
      ? header(navigation, locale, Object.fromEntries(Object.entries(counterparts).map(([language, target]) => [language, "../".repeat(file.path.split("/").length - 1) + target])))
        .replace(/ data-hia-(?:ui-message|ui-aria|site-hrefs)="[^"]*"/gu, "").replace(/<button\b[^>]*data-hia-reading-dialog[^>]*>[\s\S]*?<\/button>/gu, "")
      : staticHeaders[locale];
    // <lang><zh-CN>只修改本渲染器生成的完整文档边界，绝不改写源码资产、片段、契约或来源摘要。</zh-CN><en>Only complete-document boundaries generated by this renderer are changed, never source assets, fragments, contracts, or provenance digests.</en></lang>
    const contents = originalContents
      .replace(/<html\b[^>]*>/u, opening => `${opening.replace(/\blang="[^"]*"/u, `lang="${locale}"`).slice(0, -1)} data-hia-site-navigation>`)
      .replace("</head>", `<link rel="stylesheet" href="${stylesheet}"></head>`)
      .replace(/<body\b[^>]*>/u, opening => `${opening}${hasRuntime ? headers[locale] : pageHeader}`)
      .replace(/<main\b/u, '<main id="hia-site-main" tabindex="-1"');
    interactive ||= hasRuntime;
    yield { path: file.path, contentType: file.contentType, role: file.role, contents: renderSiteReading(contents, file.path, locale, hasRuntime, entries, customTokens) };
  }
  yield { path: STYLE_PATH, contentType: "text/css; charset=utf-8", role: "asset", contents: SITE_STYLE + SITE_READING_STYLE };
  if (interactive) yield { path: "assets/hia-site-reading.js", contentType: "text/javascript; charset=utf-8", role: "asset", contents: SITE_READING_SCRIPT };
}

/**
 * @lang zh-CN 用纯文本双语消息及显式目标生成原生菜单，源码页不需要脚本。
 * @lang en Generates native menus from bilingual plain-text messages and explicit targets, requiring no scripts on source viewers.
 * @param navigation <lang><zh-CN>调用方已校验的导航快照。</zh-CN><en>Navigation snapshot already validated by its caller.</en></lang>
 * @param locale <lang><zh-CN>明确的界面语言。</zh-CN><en>Explicit UI locale.</en></lang>
 * @param localeTargets <lang><zh-CN>独立页面的实际语言目标，省略时采用站点目标。</zh-CN><en>Actual independent-page locale targets, using site targets when omitted.</en></lang>
 * @returns <lang><zh-CN>纯文本已转义的顶部及栏目HTML。</zh-CN><en>Header and tab HTML with plain text escaped.</en></lang>
 */
export function header(navigation: DocumentationSiteNavigation, locale: DocumentationPortalUiLocale, localeTargets?: Partial<DocumentationSiteNavigationLocalizedText>): string {
  // <lang><zh-CN>消息身份与完整性评估共享工厂，译文只在最终HTML中转义，不进入报告。
  // </zh-CN><en>Message identities share their factory with completeness evaluation; translations are escaped only in final HTML and stay out of reports.</en></lang>
  const messages = new Map(createSiteNavigationUiMessages(navigation).map(record => [record.id, record[locale]]));
  const text = (id: string) => `<span data-hia-ui-message="${id}">${escape(messages.get(id)!)}</span>`;
  const aria = (id: string) => `aria-label="${escape(messages.get(id)!)}" data-hia-ui-aria="${id}"`;
  const href = (targets: DocumentationSiteNavigationLocalizedText) => `href="${escape(targets[locale])}" data-hia-site-hrefs="${escape(JSON.stringify(targets))}"`;
  const primary = navigation.primaryNavigation.map(link => `<a ${href(link.hrefByLocale)}${link.id === navigation.activePrimaryId ? ' aria-current="page"' : ""}>${text(`site.primary.${link.id}`)}</a>`).join("");
  const tabs = navigation.documentationTabs.map(link => `<a ${href(link.hrefByLocale)}${link.id === navigation.activeTabId ? ' aria-current="page"' : ""}>${text(`site.tab.${link.id}`)}</a>`).join("");
  const versions = navigation.documentationVersion;
  // <lang><zh-CN>当前版本采用本次实际同页路径，静态和独立输出可保留主题；其它版本保持宿主目标。</zh-CN><en>The current version uses the actual same-page path for static and independent output, retaining host targets for other versions.</en></lang>
  const entries = versions.entries.map((entry, index) => {
    // <lang><zh-CN>仅匹配当前版本且已提供对应页时使用原生链接，避免复制冗余跨语言目标。</zh-CN><en>Use a native link only for the current version with an actual counterpart, avoiding redundant cross-locale target copies.</en></lang>
    const current = entry.version === versions.version;
    const target = current && localeTargets?.[locale] ? `href="${escape(localeTargets[locale]!)}" data-hia-site-current` : href(entry.hrefByLocale);
    return `<a ${target}${current ? ' aria-current="true"' : ""}>${text(`site.version.entry${index}`)}</a>`;
  }).join("");
  const empty = versions.entries.some(entry => entry.status === "archive") ? "" : `<p>${text("site.version.empty")}</p>`;
  const history = `<a ${href(versions.history.hrefByLocale)}>${text("site.version.history")}</a>`;
  const other = locale === "en" ? "zh-CN" : "en";
  // <lang><zh-CN>独立生成器显式给出实际同页目标；缺页保留禁用状态，默认调用保留原部署入口。</zh-CN><en>Independent generators supply actual same-page targets; absent pages remain disabled while default calls retain deployment entries.</en></lang>
  const counterpart = localeTargets
    ? localeTargets[other]
      ? `<a href="${escape(localeTargets[other]!)}" data-hia-site-language lang="${other}" hreflang="${other}">${text("site.locale.other")}</a>`
      : `<span aria-disabled="true" lang="${other}">${text("site.locale.other")}</span>`
    : `<a ${href({ "zh-CN": navigation.localeTargets.en, en: navigation.localeTargets["zh-CN"] })} data-hia-site-language lang="${other}" hreflang="${other}">${text("site.locale.other")}</a>`;
  return [
    `<a class="hia-site-skip" href="#hia-site-main">${text("site.skip")}</a>`,
    '<header class="hia-site-header"><div class="hia-site-header-inner">',
    `<a class="hia-site-brand" title="${escape(navigation.brand.title)}" ${href(navigation.brand.homeByLocale)}><span class="hia-site-mark" aria-hidden="true">HIA</span><span class="hia-site-title">${text("site.brand.title")}<span class="hia-site-caption">${text("site.brand.caption")}</span></span></a>`,
    `<details class="hia-site-version"><summary>${text("site.version.current")} <span aria-hidden="true">⌄</span></summary><div class="hia-site-version-menu"><p>${text("site.version.heading")}</p>${entries}${empty}${history}</div></details>`,
    `<nav class="hia-site-primary" ${aria("site.main")}>${primary}</nav>`,
    `<div class="hia-site-tools"><button type="button" class="hia-site-reading-trigger hia-site-search-trigger" data-hia-reading-dialog="search">${text("site.reading.search")} <kbd>Ctrl K</kbd></button><span class="hia-site-language">${counterpart}</span><button type="button" class="hia-site-reading-trigger" data-hia-reading-dialog="settings" ${aria("site.reading.settings")}>◐</button><details class="hia-site-mobile"><summary ${aria("site.mobile")}>☰</summary><nav ${aria("site.main")}>${primary}<p>${text("site.version.heading")}</p>${entries}${empty}${history}${counterpart}<button type="button" class="hia-site-reading-trigger" data-hia-reading-dialog="search">${text("site.reading.search")}</button></nav></details></div>`,
    '</div></header>',
    `<nav class="hia-site-tabs" ${aria("site.tabs")}><div>${tabs}</div></nav>`
  ].join("");
}

/**
 * @lang zh-CN 对纯文本和JSON属性统一转义，防止标签或引号注入。
 * @lang en Escapes plain text and JSON attributes uniformly to prevent tag or quote injection.
 */
function escape(value: string): string {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/**
 * @lang zh-CN 已确认76px桌面/68px手机固定顶部、栏目及原生菜单样式；变量复用主题owner，长内容局部滚动。
 * @lang en Confirmed fixed 76px desktop/68px mobile header, tabs, and native menus; variables reuse the theme owner and long content scrolls locally.
 */
export const SITE_STYLE = `
html[data-hia-site-navigation] {
  --hia-site-header:76px;
  --hia-site-tabs:52px;
  scroll-padding-top:calc(var(--hia-site-header) + var(--hia-site-tabs) + 16px)
}
[data-hia-site-navigation] body {
  margin:0;
  padding:var(--hia-site-header) 0 0
}
[data-hia-site-navigation] .hia-site-header,[data-hia-site-navigation] .hia-site-tabs {
  box-sizing:border-box;
  background:var(--hia-surface,#fff);
  border-bottom:1px solid var(--hia-border,#dce4ef);
  color:var(--hia-text,#17253a)
}
.hia-site-header {
  position:fixed;
  z-index:40;
  inset:0 0 auto;
  height:var(--hia-site-header);
  font:16px/1.75 "Segoe UI","Microsoft YaHei",system-ui,sans-serif
}
.hia-site-header-inner {
  height:100%;
  display:flex;
  align-items:center;
  gap:24px;
  width:min(1376px,calc(100% - 48px));
  margin:auto;
  min-width:0
}
.hia-site-header a,.hia-site-tabs a {
  color:inherit;
  text-decoration:none
}
.hia-site-header a:hover,.hia-site-tabs a:hover {
  text-decoration:underline;
  text-underline-offset:4px
}
.hia-site-brand {
  display:flex;
  align-items:center;
  gap:10px;
  flex-shrink:0;
  min-width:0;
  max-width:min(44vw,320px)
}
.hia-site-mark {
  width:34px;
  height:36px;
  flex-shrink:0;
  display:grid;
  place-items:center;
  border-radius:10px 10px 10px 3px;
  background:var(--hia-accent,#0047ab);
  color:var(--hia-color-accent-contrast,#fff);
  font-size:.72rem;
  font-weight:800
}
.hia-site-title {
  min-width:0;
  font-size:.94rem;
  font-weight:750;
  line-height:1.2;
  overflow-wrap:break-word
}
.hia-site-title>[data-hia-ui-message] {
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden
}
.hia-site-caption {
  display:block;
  font-size:.66rem;
  font-weight:400;
  margin-top:4px;
  color:var(--hia-muted,#526177);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis
}
.hia-site-primary {
  display:flex;
  gap:22px;
  margin-left:18px;
  flex:1 1 auto;
  min-width:0;
  overflow:auto;
  font-size:.86rem;
  white-space:nowrap
}
.hia-site-header a[aria-current],.hia-site-tabs a[aria-current] {
  color:var(--hia-accent,#0047ab);
  font-weight:700
}
.hia-site-tools {
  display:flex;
  flex-shrink:0;
  gap:12px;
  align-items:center;
  margin-left:auto;
  min-width:0;
  font-size:.79rem
}
.hia-site-language {
  white-space:nowrap
}
.hia-site-version {
  position:relative;
  flex-shrink:0;
  max-width:12rem
}
.hia-site-version>summary {
  overflow:hidden;
  text-overflow:ellipsis
}
.hia-site-version>summary,.hia-site-mobile>summary {
  list-style:none;
  cursor:pointer;
  border:1px solid var(--hia-border,#dce4ef);
  border-radius:8px;
  padding:6px 11px;
  min-height:24px;
  font-size:.78rem;
  white-space:nowrap
}
.hia-site-header summary::-webkit-details-marker {
  display:none
}
.hia-site-version-menu,.hia-site-mobile>nav {
  position:absolute;
  top:calc(100% + 4px);
  width:min(248px,calc(100vw - 32px));
  box-sizing:border-box;
  padding:10px;
  border:1px solid var(--hia-border,#dce4ef);
  border-radius:12px;
  background:var(--hia-surface,#fff);
  box-shadow:0 12px 36px #001a3b1c;
  max-height:calc(100dvh - var(--hia-site-header) - 20px);
  overflow:auto
}
.hia-site-version-menu {
  left:0
}
.hia-site-version-menu p,.hia-site-mobile p {
  font-size:.74rem;
  color:var(--hia-muted,#526177);
  margin:5px 8px
}
.hia-site-version-menu a,.hia-site-mobile nav a {
  display:block;
  padding:10px 8px;
  border-radius:7px;
  font-size:.85rem;
  overflow-wrap:break-word
}
.hia-site-version-menu a:hover,.hia-site-mobile nav a:hover {
  background:var(--hia-accent-soft,#edf3ff)
}
.hia-site-mobile {
  display:none;
  position:relative
}
.hia-site-mobile>nav {
  right:0
}
.hia-site-tabs {
  position:sticky;
  top:var(--hia-site-header);
  z-index:25;
  font:16px/1.75 "Segoe UI","Microsoft YaHei",system-ui,sans-serif
}
.hia-site-tabs>div {
  display:flex;
  gap:30px;
  align-items:center;
  min-height:var(--hia-site-tabs);
  width:min(1240px,calc(100% - 64px));
  margin:auto;
  overflow:auto;
  white-space:nowrap
}
.hia-site-tabs a {
  font-size:.85rem;
  padding:13px 0 10px;
  border-bottom:3px solid transparent
}
.hia-site-tabs a[aria-current] {
  border-color:var(--hia-accent,#0047ab)
}
.hia-site-skip {
  position:fixed;
  top:-100px;
  left:20px;
  z-index:1000;
  background:var(--hia-surface,#fff);
  padding:10px
}
.hia-site-skip:focus {
  top:10px
}
[data-hia-site-navigation] :focus-visible {
  outline:3px solid var(--hia-color-focus-ring,var(--hia-accent,#0047ab));
  outline-offset:3px
}
[data-hia-site-navigation] .hia-shell {
  min-height:calc(100dvh - var(--hia-site-header) - var(--hia-site-tabs))
}
[data-hia-site-navigation] .hia-sidebar {
  top:calc(var(--hia-site-header) + var(--hia-site-tabs));
  max-height:calc(100dvh - var(--hia-site-header) - var(--hia-site-tabs));
  min-height:0
}
[data-hia-site-navigation] #hia-site-main {
  scroll-margin-top:16px;
  min-width:0
}
@media(max-width:1150px) {
  .hia-site-primary {
    gap:16px;
    margin-left:0
  }
  .hia-site-header-inner {
    gap:16px
  }
  .hia-site-caption {
    display:none
  }
}
@media(max-width:800px) {
  html[data-hia-site-navigation] {
    --hia-site-header:68px;
    --hia-site-tabs:46px
  }
  .hia-site-header-inner {
    width:calc(100% - 28px);
    gap:10px
  }
  .hia-site-brand {
    gap:8px;
    max-width:calc(100% - 54px)
  }
  .hia-site-mark {
    width:28px;
    min-width:28px;
    height:30px;
    font-size:.6rem
  }
  .hia-site-title {
    font-size:.78rem
  }
  .hia-site-primary,.hia-site-version,.hia-site-language {
    display:none
  }
  .hia-site-mobile {
    display:block
  }
  .hia-site-tabs>div {
    width:calc(100% - 36px);
    gap:22px
  }
  .hia-site-tabs a {
    font-size:.78rem;
    padding:10px 0 7px
  }
}
@media(max-width:370px) {
  .hia-site-title {
    font-size:.7rem
  }
  .hia-site-header-inner {
    gap:7px
  }
  .hia-site-tabs>div {
    gap:18px;
    width:calc(100% - 32px)
  }
}
@media print {
  .hia-site-header,.hia-site-tabs,.hia-site-skip {
    display:none!important
  }
  [data-hia-site-navigation] body {
    padding:0
  }
}
@media(forced-colors:active) {
  .hia-site-header,.hia-site-version-menu,.hia-site-mobile>nav {
    border:1px solid CanvasText
  }
  .hia-site-mark {
    forced-color-adjust:none;
    background:Highlight;
    color:HighlightText
  }
  .hia-site-header a,.hia-site-tabs a {
    color:LinkText
  }
  .hia-site-header a[aria-current],.hia-site-tabs a[aria-current] {
    outline:1px solid Highlight;
    outline-offset:3px
  }
}
`;
