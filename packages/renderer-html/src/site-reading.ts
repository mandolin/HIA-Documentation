/**
 * @file
 * @lang zh-CN 已确认站点导航下的阅读框架、真实小节目录与渐进增强，保持源码查看页无脚本。
 * @lang en Reading frame, actual-section outlines and progressive enhancement under confirmed site navigation, keeping source viewers script-free.
 */
import type { DocumentationPortalUiLocale } from "./information-architecture.js";

/**
 * @lang zh-CN 来自同一次渲染的公开条目上下文，不授予来源读取权限。
 * @lang en Public entry context from the same render, granting no source-reading authority.
 */
export interface SiteReadingEntry {
  /**
   * @lang zh-CN 原条目稳定身份。
   * @lang en Original stable entry identity.
   */
  id: string;
  /**
   * @lang zh-CN 原条目名称。
   * @lang en Original entry name.
   */
  name: string;
  /**
   * @lang zh-CN 已生成的本地化静态条目路径。
   * @lang en Generated localized static entry path.
   */
  page: string;
  /**
   * @lang zh-CN 已存在的静态界面语言入口。
   * @lang en Existing static UI-locale entries.
   */
  localePages?: Record<DocumentationPortalUiLocale, string>;
  /**
   * @lang zh-CN 原公开来源查看页地址。
   * @lang en Original public source-viewer address.
   */
  sourceUrl?: string;
}

/**
 * @lang zh-CN 仅在导航采用页面实际使用的双语阅读消息，供owner完整性评估共享。
 * @lang en Bilingual reading messages actually used by navigation-adopted pages, shared with owner completeness evaluation.
 */
export const SITE_READING_MESSAGES = {
  "site.reading.directory": ["文档目录", "Documentation directory"],
  "site.reading.api": ["接口参考", "API reference"],
  "site.reading.outline": ["本页内容", "On this page"],
  "site.reading.search": ["搜索文档", "Search documentation"],
  "site.reading.settings": ["阅读设置", "Reading settings"],
  "site.reading.close": ["关闭", "Close"],
  "site.reading.scheme": ["外观", "Appearance"],
  "site.reading.light": ["浅色", "Light"],
  "site.reading.dark": ["深色", "Dark"],
  "site.reading.system": ["跟随系统", "System"],
  "site.reading.wrap": ["代码长行", "Long code lines"],
  "site.reading.scroll": ["块内滚动", "Scroll inside blocks"],
  "site.reading.wrapped": ["自动换行", "Wrap lines"],
  "site.reading.lines": ["源码行号", "Source line numbers"],
  "site.reading.show": ["显示", "Show"],
  "site.reading.hide": ["隐藏", "Hide"],
  "site.reading.scope": ["设置仅影响当前页面，不保存偏好。", "Settings affect this page only and are not saved."],
  "site.reading.searchscope": ["仅检索当前生成参考站，不向外发送查询。", "Search only this generated reference site, without sending queries elsewhere."],
  "site.reading.loading": ["正在准备检索索引…", "Preparing the search index…"],
  "site.reading.empty": ["没有匹配内容，请换一个关键词或从文档目录继续。", "No matches. Try another term or continue from the directory."],
  "site.reading.error": ["检索索引暂不可用，请从文档目录继续。", "The search index is unavailable. Continue from the directory."],
  "site.reading.source": ["源码阅读", "Source reading"],
  "site.reading.boundary": ["公开源码片段，定位精度以来源证据为准。", "Public source excerpt. Position precision depends on the source evidence."],
  "site.reading.return": ["返回接口", "Return to the API"],
  "site.reading.snippet": ["源码片段", "Source excerpt"],
  "site.reading.copy": ["复制", "Copy"],
  "site.reading.copied": ["已复制", "Copied"],
  "site.reading.manualcopy": ["请手动选择复制", "Select and copy manually"],
  "site.reading.host": ["需要支持文件定位的集成宿主", "Requires an integration host that supports file navigation"],
  "site.field.remarks": ["备注", "Remarks"],
  "site.field.parameters": ["参数", "Parameters"],
  "site.field.typeparameters": ["类型参数", "Type parameters"],
  "site.field.returns": ["返回值", "Returns"],
  "site.field.exceptions": ["异常", "Exceptions"],
  "site.field.name": ["名称", "Name"],
  "site.field.description": ["说明", "Description"],
  "site.field.command.summary": ["用途摘要", "Purpose summary"],
  "site.field.command.purpose": ["用途", "Purpose"],
  "site.field.command.paths": ["路径基准", "Path bases"],
  "site.field.command.effects": ["输出与副作用", "Outputs and effects"],
  "site.field.command.offline": ["离线说明", "Offline reference"],
  "site.field.command.parsing": ["参数解析规则", "Argument parsing rules"],
  "site.field.command.configusage": ["配置文件用法", "Configuration usage"],
  "site.field.command.configoverrides": ["配置覆盖规则", "Configuration overrides"],
  "site.field.command.directonly": ["直接输入模式", "Direct-input mode"],
  "site.field.command.versionidentity": ["版本输出身份", "Version output identity"],
  "site.field.command.displayversion": ["输出版本值", "Displayed version value"],
  "site.field.command.defaults": ["默认行为", "Default behavior"],
  "site.field.command.metavar": ["参数值占位符", "Parameter value placeholder"],
  "site.field.command.package": ["所属文档包", "Owning documentation package"],
  "site.field.command.packageversion": ["文档包版本", "Documentation package version"],
  "site.field.command.aliases": ["命令别名", "Command aliases"],
  "site.field.command.helporder": ["帮助处理顺序", "Help precedence"],
  "site.field.command.unknownoptions": ["未知选项处理", "Unknown-option handling"],
  "site.field.command.filesystem": ["文件系统操作", "Filesystem effects"],
  "site.field.command.network": ["网络访问", "Network access"],
  "site.field.command.examples": ["调用示例", "Invocation example"],
  "site.field.command.exitcode": ["退出码", "Exit code"],
  "site.field.command.exitsummary": ["退出结果摘要", "Exit-result summary"],
  "site.field.command.exitdescription": ["退出结果说明", "Exit-result description"],
  "site.field.command.choices": ["允许值", "Allowed value"],
  "site.field.command.defaultconditions": ["默认值适用条件", "Default-value condition"],
  "site.field.command.defaultkind": ["默认值规则类型", "Default-rule kind"],
  "site.field.command.defaultvalue": ["默认值", "Default value"],
  "site.field.command.multiple": ["多值规则", "Multiple-value rule"],
  "site.field.command.parametername": ["参数名称", "Parameter name"],
  "site.field.command.required": ["必填规则", "Requiredness"],
  "site.field.command.short": ["短选项名称", "Short-option name"],
  "site.field.command.valuetype": ["参数值类型", "Parameter value type"],
  "site.field.command.prerequisites": ["运行前置条件", "Runtime prerequisites"],
  "site.field.command.section": ["所属章节", "Reference section"],
  "site.kind.command": ["命令", "Command"],
  "site.kind.command.group": ["命令组", "Command group"],
  "site.kind.command.option": ["命名选项", "Named option"],
  "site.kind.command.argument": ["位置参数", "Positional argument"],
  "site.kind.constant": ["常量", "Constant"],
  "site.kind.function": ["函数", "Function"],
  "site.kind.member": ["成员", "Member"],
  "site.kind.file": ["文件", "File"],
  "site.kind.dotnet.method": ["方法", "Method"],
  "site.kind.dotnet.type": ["类型", "Type"],
  "site.kind.css.component.style": ["组件样式", "Component style"],
  "site.kind.css.custom.property": ["自定义属性", "Custom property"],
  "site.kind.css.layer": ["级联层", "Cascade layer"],
  "site.kind.css.modifier": ["样式修饰", "Style modifier"],
  "site.kind.css.selector": ["选择器", "Selector"],
  "site.kind.design.token": ["设计令牌", "Design token"],
  "site.kind.html.attribute": ["属性", "Attribute"],
  "site.kind.html.component": ["组件", "Component"],
  "site.kind.html.event": ["事件", "Event"],
  "site.kind.html.slot": ["插槽", "Slot"],
  "site.kind.html.style.hook": ["样式钩子", "Style hook"],
  "site.kind.pug.mixin": ["混入", "Mixin"],
  "site.kind.vue.exposed.api": ["公开接口", "Exposed API"]
} as const;

/**
 * @lang zh-CN 为owner生成的完整HTML附加阅读布局，不读取文件，不改写来源字节或片段。
 * @lang en Adds reading layout to owner-generated complete HTML without reading files or rewriting source bytes or fragments.
 * @param contents - 本次生成的完整HTML。 Complete HTML from this generation.
 * @param file - owner生成的相对输出路径。 Owner-generated relative output path.
 * @param locale - 已确认的界面语言，不改变正文语言。 Confirmed UI locale, independent of prose locale.
 * @param interactive - 生成器已确认此页承载运行时交互。 The generator identified this page as the interactive runtime host.
 * @param entries - 同次渲染公开条目，默认空上下文。 Public entries from the same render, defaulting to no context.
 * @param customTokens - 主题owner已验证的显式颜色键，默认无覆写。 Explicit color keys validated by the theme owner, with no overrides by default.
 * @returns 带阅读框架的HTML，不执行脚本或文件访问。 Reading-framed HTML, without script execution or file access.
 */
export function renderSiteReading(contents: string, file: string, locale: DocumentationPortalUiLocale, interactive: boolean, entries: SiteReadingEntry[] = [], customTokens: readonly string[] = []): string {
  // <lang><zh-CN>路径深度只来自生成器文件名，消息进入HTML前统一转义。</zh-CN><en>Depth comes only from generated file names; all messages are escaped before entering HTML.</en></lang>
  const prefix = "../".repeat(file.split("/").length - 1);
  const text = (id: keyof typeof SITE_READING_MESSAGES) => `<span${interactive ? ` data-hia-ui-message="${id}"` : ""}>${escape(SITE_READING_MESSAGES[id][locale === "en" ? 1 : 0])}</span>`;
  const source = file.startsWith("sources/");
  // <lang><zh-CN>交互替换区域只包正文，移动目录和main地标留在外层，切换条目时不被innerHTML移除。</zh-CN><en>Keep only prose inside the replaceable region, leaving the mobile outline and main landmark outside entry innerHTML replacements.</en></lang>
  if (interactive) contents = contents.replace(/<main\b([^>]*?)\sdata-hia-project-content([^>]*>)([\s\S]*?)<\/main>/u, '<main$1$2<div data-hia-project-content>$3</div></main>');
  // <lang><zh-CN>仅连接主题owner已经校验的语义变量，不把调用者颜色字符串重新拼入CSS。</zh-CN><en>Connect only semantic variables already validated by the theme owner, never interpolating caller color strings into CSS again.</en></lang>
  const aliases: Record<string, string> = {
    canvas: "--hia-bg:var(--hia-color-canvas)",
    surface: "--hia-surface:var(--hia-color-surface)",
    border: "--hia-border:var(--hia-color-border)",
    text: "--hia-text:var(--hia-color-text)",
    textMuted: "--hia-muted:var(--hia-color-text-muted)",
    accentSoft: "--hia-accent-soft:var(--hia-color-accent-soft)",
    accentContrast: "--hia-site-brand-contrast:var(--hia-color-accent-contrast)"
  };
  const declarations = customTokens.filter(token => Object.hasOwn(aliases, token)).map(token => aliases[token]).join(";");
  const codeBackground = customTokens.includes("codeBackground") ? "[data-hia-site-navigation] .hia-signature,[data-hia-site-navigation] .hia-source-code{background:var(--hia-code-bg)}" : "";
  if (declarations || codeBackground) contents = contents.replace("</head>", `<style>:root[data-hia-site-navigation][data-hia-scheme]{${declarations}}${codeBackground}</style></head>`);
  let sourceMobileDirectory = "";
  const directory = (body: string) => `<details class="hia-site-directory" id="hia-site-directory" open><summary>${text("site.reading.directory")}</summary>${body}</details>`;
  if (source) {
    // <lang><zh-CN>只为同一公开资产列出真实接口，源码页继续由CSP禁止脚本和外部读取。</zh-CN><en>List actual APIs for the same public asset only; the source-page CSP continues blocking scripts and external reads.</en></lang>
    const owners = entries.filter(entry => entry.sourceUrl?.split("#")[0] === file);
    const links = owners.map(entry => `<a href="${escape(prefix + entry.page)}">${escape(entry.name)}</a>`).join("");
    const sidebar = `<aside class="hia-sidebar"><nav>${links}<a href="${prefix}index.html">${text("site.reading.return")}</a></nav></aside>`;
    // <lang><zh-CN>来源页只复制无控件链接，手机原生折叠默认关闭，桌面目录保持可读；没有重复的表单ID。</zh-CN><en>Copy only control-free source links so native mobile navigation starts closed while desktop context stays readable, without duplicate form IDs.</en></lang>
    sourceMobileDirectory = `<details class="hia-site-source-mobile-directory"><summary>${text("site.reading.directory")}</summary>${sidebar}</details>`;
    contents = contents.replace("<html ", '<html data-hia-skin="portal.classic" data-hia-scheme="system" ')
      .replace(/<title>([\s\S]*?) · Source \/ 源码<\/title>/u, (_, path: string) => `<title>${path} · ${escape(SITE_READING_MESSAGES["site.reading.source"][locale === "en" ? 1 : 0])}</title>`)
      .replace(/<h1>[\s\S]*?<\/h1>/u, title => `<h1>${text("site.reading.source")}</h1><p class="hia-site-source-path">${title.replace(/<\/?h1>/gu, "").replace(/ · Source \/ 源码$/u, "")}</p><section id="hia-source-status" data-hia-source-boundary class="hia-site-notice">${text("site.reading.boundary")}</section><h2 id="hia-source-snippet">${text("site.reading.snippet")}</h2>`)
      .replace(/<main\b/u, `<div class="hia-shell hia-project-shell hia-site-source-shell">${directory(sidebar)}<main class="hia-main hia-project-main"`)
      .replace("</main>", "</main></div>");
  } else {
    // <lang><zh-CN>目录保持单一DOM实例，避免复制语言控件ID或让惰性树出现两套状态。</zh-CN><en>Keep one directory DOM instance, avoiding duplicate locale-control IDs and divergent lazy-tree state.</en></lang>
    contents = contents.replace(/<aside class="hia-sidebar">[\s\S]*?<\/aside>/u, sidebar => directory(sidebar.replace(/<h1>([\s\S]*?)<\/h1>/u, '<p class="hia-site-project-name">$1</p>')));
    // <lang><zh-CN>静态索引及交互初始页以实际主内容标题为一级标题，接口片段自带一级标题。</zh-CN><en>Static indexes and the initial interactive page use the actual main-content heading as primary; API fragments already supply their own primary heading.</en></lang>
    const main = /<main\b[^>]*>([\s\S]*?)<\/main>/u.exec(contents);
    if (main && !main[1]!.includes("<h1")) contents = contents.replace(main[0], main[0].replace(/<h2>([\s\S]*?)<\/h2>/u, "<h1>$1</h1>"));
  }
  // <lang><zh-CN>目录只指向本页真实小节，静态页和源码页在禁用脚本时仍可导航。</zh-CN><en>Outlines target actual sections only, retaining navigation on static/source pages without scripts.</en></lang>
  const sections = [...contents.matchAll(/<(?:section|details)\b[^>]*id="([^"]+)"[^>]*data-hia-(?:topic-section|reading-section)="([^"]+)"[^>]*>[\s\S]*?<(?:h3|summary)[^>]*>([\s\S]*?)<\/(?:h3|summary)>/gu)];
  const outlineLinks = source
    ? `<a href="#hia-source-status">${text("site.reading.boundary")}</a><a href="#hia-source-snippet">${text("site.reading.snippet")}</a>`
    : sections.map(match => `<a href="#${match[1]}">${match[3]}</a>`).join("");
  const outline = `<nav data-hia-reading-outline>${outlineLinks}</nav>`;
  const mobile = `<details class="hia-site-mobile-outline"><summary>${text("site.reading.outline")}</summary>${outline}</details>`;
  contents = contents.replace(/(<main\b[^>]*>)/u, `$1${sourceMobileDirectory}${mobile}`).replace("</main>", `</main><aside class="hia-site-toc"><strong>${text("site.reading.outline")}</strong>${outline}</aside>`);
  if (!interactive) contents = contents.replace(/<button\b([^>]*data-hia-open-request[^>]*)>/gu, `<button disabled title="${escape(SITE_READING_MESSAGES["site.reading.host"][locale === "en" ? 1 : 0])}"$1>`);
  if (interactive) {
    // <lang><zh-CN>增强只在可执行的交互入口附加，源码及无脚本静态输出均不新增脚本。</zh-CN><en>Add enhancement only to the executable interactive entry, never to source or no-script static output.</en></lang>
    const config = escape(JSON.stringify(SITE_READING_MESSAGES));
    const pages = escape(JSON.stringify(entries.map(({ id, page, localePages }) => ({ id, page, localePages }))));
    const scheme = /data-hia-scheme="(light|dark|system)"/u.exec(contents)?.[1] ?? "system";
    const skin = /data-hia-skin="([^"]+)"/u.exec(contents)?.[1] ?? "portal.classic";
    contents = contents.replace("</body>", `${renderSiteReadingDialogs(text)}<script src="${prefix}assets/hia-site-reading.js" data-hia-reading-messages="${config}" data-hia-reading-pages="${pages}" data-hia-reading-initial-scheme="${scheme}" data-hia-reading-initial-skin="${skin}" defer></script></body>`);
  }
  return contents;
}

/**

 * @lang zh-CN 生成已确认的原生模态与封闭设置选项。

 * @lang en Generates confirmed native dialogs and closed setting choices.
 * @param text <lang><zh-CN>只接受已知消息身份的可信标签工厂。</zh-CN><en>Trusted label factory accepting known message identities only.</en></lang>
 * @returns <lang><zh-CN>两个原生dialog的完整HTML。</zh-CN><en>Complete HTML for two native dialogs.</en></lang>

 */
export function renderSiteReadingDialogs(text: (id: keyof typeof SITE_READING_MESSAGES) => string): string {
  const close = `<button type="button" data-hia-reading-close>${text("site.reading.close")}</button>`;
  const select = (name: string, id: keyof typeof SITE_READING_MESSAGES, options: Array<[string, keyof typeof SITE_READING_MESSAGES]>) => `<label>${text(id)}<select data-hia-reading-${name}>${options.map(([value, label]) => `<option value="${value}" data-hia-ui-message="${label}">${text(label).replace(/<[^>]*>/gu, "")}</option>`).join("")}</select></label>`;
  return `<dialog id="hia-reading-search" aria-labelledby="hia-reading-search-title"><header><h2 id="hia-reading-search-title">${text("site.reading.search")}</h2>${close}</header><div class="hia-site-dialog-body"><label for="hia-reading-query">${text("site.reading.searchscope")}</label><input id="hia-reading-query" type="search" autofocus><div data-hia-reading-results aria-live="polite"></div><a href="#hia-site-directory" data-hia-reading-directory>${text("site.reading.directory")}</a></div></dialog><dialog id="hia-reading-settings" aria-labelledby="hia-reading-settings-title"><header><h2 id="hia-reading-settings-title">${text("site.reading.settings")}</h2>${close}</header><div class="hia-site-dialog-body">${select("scheme", "site.reading.scheme", [["light", "site.reading.light"], ["dark", "site.reading.dark"], ["system", "site.reading.system"]])}${select("wrap", "site.reading.wrap", [["scroll", "site.reading.scroll"], ["wrap", "site.reading.wrapped"]])}${select("lines", "site.reading.lines", [["show", "site.reading.show"], ["hide", "site.reading.hide"]])}<p>${text("site.reading.scope")}</p></div></dialog>`;
}

/**

 * @lang zh-CN 统一转义纯文本和属性。

 * @lang en Escapes plain text and attributes consistently.

 */
function escape(value: string): string {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

/**
 * @lang zh-CN 导航采用页面的纯阅读增强；原生dialog约束焦点，查询本地索引，设置不持久化。
 * @lang en Read-only enhancement for navigation-adopted pages, using native modal focus, local-index search and nonpersistent settings.
 */
export const SITE_READING_SCRIPT = String.raw`/**
 * @file
 * @lang zh-CN 当前生成参考站的只读阅读增强，查询留在本地，偏好仅在本页生效。
 * @lang en Read-only enhancement for this generated reference site, with local queries and page-only preferences.
 */
(() => {
    // <lang><zh-CN>只消费本页受控消息和现有目录，状态不进入Cookie或存储。</zh-CN><en>Consume controlled page messages and the existing directory, with no cookie/storage state.</en></lang>
    const root = document.documentElement;
    const script = document.querySelector('[data-hia-reading-messages]');
    const messages = JSON.parse(script.dataset.hiaReadingMessages);
    const pages = new Map(JSON.parse(script.dataset.hiaReadingPages).map(entry => [entry.id, entry]));
    const directory = document.querySelector('.hia-site-directory');
    const ui = document.querySelector('[data-hia-ui-locale-control]');
    const query = document.getElementById('hia-reading-query');
    const results = document.querySelector('[data-hia-reading-results]');
    const text = id => messages[id]?.[(ui?.value || root.lang) === 'zh-CN' ? 0 : 1] || id;
    const mobile = matchMedia('(max-width:800px)');
    const synchronizeDirectory = () => { if (directory)
        directory.open = !mobile.matches; };
    synchronizeDirectory();
    mobile.addEventListener('change', synchronizeDirectory);
    root.dataset.hiaReadingReady = 'true';
    /**
     * @lang zh-CN 在独立生成器已声明的同页语言目标上保留当前真实锚点；显式目标片段优先，未知片段不传播。
     * @lang en Preserve the current real anchor on independent generators' declared same-page locale targets, honoring explicit target fragments and excluding unknown fragments.
     */
    function synchronizeNativeLocaleFragments() {
        // <lang><zh-CN>片段只用于本页ID查找，不作为选择器、HTML或代码执行。</zh-CN><en>Use the fragment only for local ID lookup, never as a selector, HTML or executable code.</en></lang>
        let anchor;
        try { anchor = decodeURIComponent(location.hash.slice(1)); }
        catch { anchor = undefined; }
        for (const link of document.querySelectorAll('[data-hia-site-language]:not([data-hia-site-hrefs]),[data-hia-site-current]')) {
            // <lang><zh-CN>缓存原始对应页，连续切换片段时清除旧片段；交互Portal另用条目身份同步。</zh-CN><en>Cache the original counterpart so fragment changes clear stale fragments; interactive Portals use their separate entry-identity synchronizer.</en></lang>
            const target = new URL(link.dataset.hiaSiteNativeTarget || (link.dataset.hiaSiteNativeTarget = link.getAttribute('href')), document.baseURI);
            if (!target.hash && anchor && document.getElementById(anchor)) target.hash = location.hash;
            link.href = target.href;
        }
    }
    synchronizeNativeLocaleFragments();
    window.addEventListener('hashchange', synchronizeNativeLocaleFragments);
    // <lang><zh-CN>阅读设置从本页构建默认开始，不继承其它站点的持久化主题。</zh-CN><en>Start settings from this page's build default rather than another site's persisted theme.</en></lang>
    root.dataset.hiaScheme = script.dataset.hiaReadingInitialScheme;
    root.dataset.hiaSkin = script.dataset.hiaReadingInitialSkin;
    document.querySelector('[data-hia-reading-scheme]').value = root.dataset.hiaScheme;
    for (const button of document.querySelectorAll('[data-hia-reading-dialog]'))
        button.addEventListener('click', () => {
            const dialog = document.getElementById('hia-reading-' + button.dataset.hiaReadingDialog);
            if (dialog && !dialog.open) {
                dialog.showModal();
                if (dialog.id.endsWith('search')) {
                    query.focus();
                    search();
                }
            }
        });
    for (const button of document.querySelectorAll('[data-hia-reading-close]'))
        button.addEventListener('click', () => button.closest('dialog').close());
    document.addEventListener('keydown', event => {
        // <lang><zh-CN>搜索输入可能先消费Escape清空文本；显式关闭当前模态并沿原生close恢复焦点。</zh-CN><en>A search input may consume Escape to clear text first; explicitly close the current modal and retain native focus restoration.</en></lang>
        if (event.key === 'Escape') {
            const dialog = document.querySelector('dialog[open]');
            if (dialog) {
                event.preventDefault();
                dialog.close();
            }
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            const dialog = document.getElementById('hia-reading-search');
            // <lang><zh-CN>保持单一模态，快捷键不会在设置上再叠一层检索。</zh-CN><en>Keep one modal active so the shortcut cannot stack search over settings.</en></lang>
            if (document.querySelector('dialog[open]') && !dialog.open)
                return;
            if (!dialog.open)
                dialog.showModal();
            query.focus();
            search();
        }
    });
    /**
     * @lang zh-CN 返回当前可见目录节点，缺少选中节点时复用首个可见控件，避免隐藏桌面摘要吞掉焦点。
     * @lang en Return to the visible current directory node, falling back to its first visible control instead of the hidden desktop summary.
     */
    function focusReadingDirectory(event) {
        // <lang><zh-CN>取消原生片段跳转，防止随后覆盖显式焦点或丢失当前条目地址。</zh-CN><en>Cancel native fragment navigation so it cannot overwrite explicit focus or discard the current entry address.</en></lang>
        event.preventDefault();
        document.getElementById('hia-reading-search').close();
        directory.open = true;
        // <lang><zh-CN>当前真实树节点优先，回退遍历保留普通目录与独立输出的可用控件。</zh-CN><en>Prefer the actual current tree node, with visible ordinary controls supporting other directory outputs.</en></lang>
        const current = directory.querySelector('[data-hia-project-tree] [aria-current="page"]');
        const target = current?.getClientRects().length ? current : Array.from(directory.querySelectorAll('summary,button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)')).find(control => control.getClientRects().length);
        target?.scrollIntoView({block:'nearest', inline:'nearest'});
        target?.focus({preventScroll:true});
    }
    document.querySelector('[data-hia-reading-directory]').addEventListener('click', focusReadingDirectory);
    for (const name of ['scheme', 'wrap', 'lines'])
        document.querySelector('[data-hia-reading-' + name + ']').addEventListener('change', event => {
            if (name === 'scheme')
                root.dataset.hiaScheme = event.target.value;
            else
                root.dataset['hiaReading' + name[0].toUpperCase() + name.slice(1)] = event.target.value;
        });
    // <lang><zh-CN>检索只使用同一生成根的索引，序号防止慢响应覆盖较新的查询；失败与空结果分开。</zh-CN><en>Search only the same generated root; a sequence prevents stale responses, separating failures from empty results.</en></lang>
    let indexPromise;
    let sequence = 0;
    /**
     * @lang zh-CN 读取当前生成根的受限索引，渲染最多200个匹配；过期响应不覆盖新查询。
     * @lang en Reads the current generated root's bounded index and renders up to 200 matches without allowing stale responses to overwrite newer queries.
     */
    async function search() {
        const current = ++sequence;
        results.textContent = text('site.reading.loading');
        try {
            if (!indexPromise)
                indexPromise = fetch(script.dataset.hiaReadingStatic || 'search/index.json', { credentials: 'omit', signal: AbortSignal.timeout(10000) }).then(response => {
                    if (!response.ok)
                        throw new Error('index');
                    return response.json();
                }).then(value => { if (!Array.isArray(value.entries))
                    throw new Error('index'); return value.entries; });
            const entries = await indexPromise;
            if (current !== sequence)
                return;
            const value = query.value.trim().toLowerCase();
            const matches = entries.filter(entry => String(entry.searchText || '').toLowerCase().includes(value)).slice(0, 200);
            results.replaceChildren();
            for (const entry of matches) {
                const link = document.createElement('a');
                // <lang><zh-CN>静态生成器按真实页面跳转，通用Portal继续沿原条目事件路径。</zh-CN><en>Static generators navigate to actual pages; the generic Portal retains its original entry-event path.</en></lang>
                if (script.dataset.hiaReadingStatic) {
                    const base = new URL(script.dataset.hiaReadingBase || './', location.href);
                    const target = new URL(entry.localePages?.[root.lang] || entry.page, base);
                    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname))
                        throw new Error('index');
                    link.href = target.href;
                } else link.href = '#entry=' + encodeURIComponent(entry.id);
                link.textContent = entry.name + ' · ' + entry.kind;
                // <lang><zh-CN>选择沿用树的成功后replaceState；普通href保留复制/新窗口路径，不额外制造无法恢复的历史项。</zh-CN><en>Selection reuses the tree's post-success replaceState; ordinary hrefs retain copy/new-window paths without creating unrestorable history entries.</en></lang>
                link.addEventListener('click', event => { document.getElementById('hia-reading-search').close(); if (!script.dataset.hiaReadingStatic) { event.preventDefault(); document.dispatchEvent(new CustomEvent('hia:site-entry', { detail: entry.id })); } });
                results.append(link);
            }
            if (!matches.length)
                results.textContent = text('site.reading.empty');
        }
        catch {
            if (current === sequence) {
                indexPromise = undefined;
                results.textContent = text('site.reading.error');
            }
        }
    }
    query.addEventListener('input', search);
    /**
     * @lang zh-CN 顶部语言切换仅在实际生成对应页存在时携带当前条目；首页恢复原始目标，缺对应语言禁用链接。
     * @lang en Header language switching carries the current entry only when its generated counterpart exists, restoring original roots on the index and disabling absent counterparts.
     */
    function synchronizeLocaleLinks(entry) {
        // <lang><zh-CN>原根目标独立缓存，避免条目或界面语言连续切换累积片段；独立宿主的静态链接保持原职责。</zh-CN><en>Cache original roots separately to prevent fragment accumulation across entry or UI-language changes; independent hosts retain their static-link responsibilities.</en></lang>
        for (const link of document.querySelectorAll('[data-hia-site-language][data-hia-site-hrefs]')) {
            const roots = JSON.parse(link.dataset.hiaSiteLocaleRoots || (link.dataset.hiaSiteLocaleRoots = link.dataset.hiaSiteHrefs));
            // <lang><zh-CN>实际页面目录是对应关系证据，不根据文件名猜译文；目标根始终来自已验证的导航输入。</zh-CN><en>The actual page directory proves counterparts without inferring translations from names; target roots always come from validated navigation input.</en></lang>
            const targets = Object.fromEntries(Object.entries(roots).map(([locale, target]) => [locale, entry && entry.localePages?.[locale === 'zh-CN' ? 'en' : 'zh-CN'] ? target + '#entry=' + encodeURIComponent(entry.id) : target]));
            link.dataset.hiaSiteHrefs = JSON.stringify(targets);
            const locale = ui?.value || root.lang;
            if (entry && !entry.localePages?.[locale === 'zh-CN' ? 'en' : 'zh-CN']) {
                link.removeAttribute('href');
                link.setAttribute('aria-disabled', 'true');
            } else {
                link.removeAttribute('aria-disabled');
                link.href = targets[locale];
            }
        }
    }
    /**
     * @lang zh-CN 当前版本链接保留已生成条目身份；其它版本仍由宿主显式路由决定。
     * @lang en Retain the generated entry identity on current-version links while other versions keep explicit host routing.
     */
    function synchronizeCurrentVersionEntry(entry) {
        for (const link of document.querySelectorAll('.hia-site-version-menu a[aria-current="true"][data-hia-site-hrefs],.hia-site-mobile a[aria-current="true"][data-hia-site-hrefs]')) {
            // <lang><zh-CN>原始根不随界面语言切换累积片段，目录恢复时回到同语言根。</zh-CN><en>Original roots never accumulate fragments across UI-language changes, and returning to the index restores the same-locale root.</en></lang>
            const roots = JSON.parse(link.dataset.hiaSiteVersionRoots || (link.dataset.hiaSiteVersionRoots = link.dataset.hiaSiteHrefs));
            const targets = Object.fromEntries(Object.entries(roots).map(([locale, target]) => [locale, entry?.localePages?.[locale] ? target + '#entry=' + encodeURIComponent(entry.id) : target]));
            link.dataset.hiaSiteHrefs = JSON.stringify(targets);
            link.href = targets[ui?.value || root.lang];
        }
    }
    // <lang><zh-CN>每次实际条目切换后只建立真实锚点；目录位于正文外，避免改变正文语言块。</zh-CN><en>After actual entry changes, build real anchors outside prose, preserving content-language blocks.</en></lang>
    /**
     * @lang zh-CN 从当前真实小节建立页内目录，其普通链接保留可直接打开的静态对应页。
     * @lang en Builds an outline from actual current sections, retaining directly openable static counterparts in ordinary links.
     */
    function outline() {
        const article = document.querySelector('[data-hia-project-content]');
        // <lang><zh-CN>普通浏览器没有文件定位宿主，禁用纯请求控件；同源公开源码链接继续可用。</zh-CN><en>A standalone browser has no file-navigation host, so disable request-only controls while retaining public same-origin source links.</en></lang>
        if (window.parent === window)
            for (const button of article?.querySelectorAll('[data-hia-open-request]') || []) {
                button.disabled = true;
                button.title = text('site.reading.host');
            }
        const entry = pages.get(article?.querySelector('article[id]')?.id);
        synchronizeLocaleLinks(entry);
        synchronizeCurrentVersionEntry(entry);
        const staticPage = script.dataset.hiaReadingStatic ? '' : entry?.localePages?.[ui?.value] || entry?.page || 'pages/index.html';
        const sections = article?.querySelectorAll('[data-hia-topic-section][id], [data-hia-reading-section][id]') || [];
        for (const nav of document.querySelectorAll('[data-hia-reading-outline]')) {
            nav.replaceChildren();
            for (const section of sections) {
                const heading = section.querySelector(':scope > h3, :scope > summary');
                if (!heading)
                    continue;
                const link = document.createElement('a');
                link.href = staticPage + '#' + encodeURIComponent(section.id);
                link.textContent = heading.textContent;
                link.addEventListener('click', event => {
                    event.preventDefault();
                    // <lang><zh-CN>原生details由summary承担焦点，details不加负tabindex，保留展开内容的顺序键盘访问。</zh-CN><en>Native details delegate focus to their summary without negative tabindex on details, preserving sequential keyboard access to expanded contents.</en></lang>
                    if (section.tagName === 'DETAILS') section.open = true;
                    const focusTarget = section.tagName === 'DETAILS' ? section.querySelector(':scope > summary') : section;
                    section.scrollIntoView({ block: 'start' });
                    focusTarget?.focus({ preventScroll: true });
                });
                nav.append(link);
            }
        }
        for (const block of article?.querySelectorAll('.hia-signature') || []) {
            if (block.previousElementSibling?.matches('[data-hia-reading-copy]'))
                continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.hiaReadingCopy = '';
            button.dataset.hiaUiMessage = 'site.reading.copy';
            button.textContent = text('site.reading.copy');
            button.addEventListener('click', async () => { try {
                await navigator.clipboard.writeText(block.textContent);
                button.dataset.hiaUiMessage = 'site.reading.copied';
            }
            catch {
                button.dataset.hiaUiMessage = 'site.reading.manualcopy';
            } button.textContent = text(button.dataset.hiaUiMessage); });
            block.before(button);
        }
    }
    document.addEventListener('hia:site-content', outline);
    ui?.addEventListener('change', outline);
    outline();
})();`;

/**
 * @lang zh-CN 仅在站点导航明确启用时采用的确认稿阅读样式，旧调用与演示基线不受此选择影响。
 * @lang en Confirmed reading styles selected only by explicit site navigation, keeping legacy calls and demonstration baselines outside this selection.
 */
export const SITE_READING_STYLE = `
:root[data-hia-site-navigation][data-hia-scheme] {--hia-bg:#f6f8fc;--hia-surface:#fff;--hia-text:#17253a;--hia-muted:#526177;--hia-border:#dce4ef;--hia-site-soft:#edf3ff;--hia-accent-soft:var(--hia-site-soft);--hia-site-brand-contrast:#fff;color-scheme:light}
:root[data-hia-site-navigation][data-hia-scheme="dark"] {--hia-bg:#0c1525;--hia-surface:#142138;--hia-text:#e8effa;--hia-muted:#b2c1d6;--hia-border:#34445c;--hia-site-soft:#1c3050;--hia-accent:#93c5fd;color-scheme:dark}
@media(prefers-color-scheme:dark){:root[data-hia-site-navigation][data-hia-scheme="system"]{--hia-bg:#0c1525;--hia-surface:#142138;--hia-text:#e8effa;--hia-muted:#b2c1d6;--hia-border:#34445c;--hia-site-soft:#1c3050;--hia-accent:#93c5fd;color-scheme:dark}}
[data-hia-site-navigation] body{font:16px/1.75 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;background:var(--hia-bg);color:var(--hia-text)}
[data-hia-site-navigation] .hia-shell{width:min(1240px,calc(100% - 64px));margin:auto;grid-template-columns:232px minmax(0,1fr) 170px;gap:36px;align-items:start;padding:30px 0 60px;min-height:0}
[data-hia-site-navigation] .hia-sidebar{position:static;height:auto;padding:0 20px 0 0;background:transparent;border-right:1px solid var(--hia-border);font-size:.83rem}
[data-hia-site-navigation] .hia-project-split-site .hia-sidebar{height:auto;max-height:none;overflow:visible;position:static;top:auto}
[data-hia-site-navigation] .hia-site-mark{background:var(--hia-color-accent,#0047ab);color:var(--hia-site-brand-contrast)}
[data-hia-site-navigation] .hia-project-view-button[aria-pressed="true"]{background:var(--hia-color-accent,#0047ab);color:var(--hia-site-brand-contrast)}
.hia-site-directory{position:sticky;top:calc(var(--hia-site-header) + var(--hia-site-tabs) + 30px);max-height:calc(100dvh - var(--hia-site-header) - var(--hia-site-tabs) - 50px);overflow:auto;min-width:0}
.hia-site-directory>summary{display:none}.hia-site-directory h1{font-size:.9rem}.hia-site-directory .hia-theme-switch{display:none}
[data-hia-site-navigation] .hia-main{padding:7px 0;min-width:0;max-width:none;margin:0;border:0;border-radius:0;background:transparent}
[data-hia-site-navigation] .hia-project-entry{border:0;border-radius:0;background:transparent;padding:0;margin:0}
[data-hia-site-navigation] .hia-project-topic-header :is(h1,h2){font:700 2.35rem/1.25 Consolas,monospace;letter-spacing:-.045em;min-width:0;overflow-wrap:break-word;margin:16px 0 24px}
.hia-site-project-name{font-size:.9rem;font-weight:700}.hia-site-api-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:18px}
.hia-site-breadcrumbs{font-size:.75rem;color:var(--hia-muted);margin:0 0 28px;overflow-wrap:break-word}.hia-site-eyebrow{font-size:.76rem;letter-spacing:.13em;color:var(--hia-muted);font-weight:750;text-transform:uppercase;margin:0 0 20px}
[data-hia-site-navigation] .hia-kind{font-size:.75rem;border-radius:20px;border-color:var(--hia-border);padding:4px 10px;margin:0 6px 18px 0}
[data-hia-site-navigation] .hia-project-topic-section{border:0;border-radius:0;border-top:1px solid var(--hia-border);margin:18px 0;padding:22px 0;background:transparent}
[data-hia-site-navigation] .hia-project-topic-section>summary{padding:0;background:transparent;font-size:1.05rem}
[data-hia-site-navigation] .hia-project-topic-section-body{padding:16px 0 0}
[data-hia-site-navigation] .hia-project-topic-section[data-hia-topic-section="summary"]{border:0;padding:0}
[data-hia-site-navigation] .hia-project-topic-section[data-hia-topic-section="summary"]>h3{display:none}
[data-hia-site-navigation] .hia-signature{border:1px solid var(--hia-border);border-radius:10px;padding:17px 20px;background:var(--hia-surface);overflow:auto;max-width:100%;white-space:pre;font:13px/1.9 Consolas,monospace}
[data-hia-site-navigation] .hia-site-field{border-top:1px solid var(--hia-border);padding:22px 0;margin:18px 0}
[data-hia-site-navigation] .hia-site-field h3{font-size:1.14rem;margin:0 0 12px}
[data-hia-site-navigation] .hia-site-field code{font:13px Consolas,monospace}
.hia-site-field-table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;border:1px solid var(--hia-border);border-radius:10px;overflow:hidden;background:var(--hia-surface);font-size:.9rem}.hia-site-field-table th,.hia-site-field-table td{padding:13px 16px;vertical-align:top;text-align:left;border-bottom:1px solid var(--hia-border);overflow-wrap:break-word}.hia-site-field-table th{background:var(--hia-site-soft);font-weight:600}.hia-site-field-table th:first-child{width:27%}.hia-site-field-table tr:last-child td{border-bottom:0}.hia-site-field-table p{margin:0}
.hia-site-toc{position:sticky;top:calc(var(--hia-site-header) + var(--hia-site-tabs) + 30px);max-height:calc(100dvh - 180px);overflow:auto;border-left:1px solid var(--hia-border);padding-left:16px;font-size:.78rem;min-width:0}
.hia-site-toc strong{font-size:.7rem;color:var(--hia-muted)}[data-hia-reading-outline] a{display:block;padding:7px 0;color:var(--hia-muted);overflow-wrap:break-word}
.hia-site-mobile-outline,.hia-site-source-mobile-directory{display:none}.hia-site-source-shell h1{font-size:2.35rem}.hia-site-source-path{overflow-wrap:break-word;font:13px Consolas,monospace}
.hia-site-notice{padding:16px 18px;border:1px solid #ead8a8;border-left-width:3px;border-radius:7px;background:#fffbeb;color:#713f12;margin:24px 0;font-size:.87rem}
[data-hia-site-navigation] [data-hia-source-fetch-status]:not([hidden]),[data-hia-site-navigation] .hia-project-load-error{padding:16px 18px;background:var(--hia-site-soft);border:1px solid var(--hia-border);border-left:3px solid var(--hia-accent);border-radius:7px;margin:24px 0;font-size:.87rem}
[data-hia-site-navigation] [data-hia-source-state="denied"] [data-hia-source-fetch-status],[data-hia-site-navigation] [data-hia-source-state="aborted"] [data-hia-source-fetch-status]{background:#fffbeb;border-color:#ead8a8;color:#713f12}
[data-hia-site-navigation] :is([data-hia-source-state="integrity-error"],[data-hia-source-state="network-error"],[data-hia-source-state="not-found"]) [data-hia-source-fetch-status],[data-hia-site-navigation] .hia-project-load-error{background:#fff1f2;border-color:#f0bac2;color:#9f1239}
[data-hia-site-navigation] [data-hia-source-state="ready"] [data-hia-source-fetch-status]{background:#f0fdf4;border-color:#c6e7cf;color:#166534}
[data-hia-site-navigation] [data-hia-source-state]:not([data-hia-source-state="ready"]) .hia-source-code{display:none}
[data-hia-site-navigation] [data-hia-open-request]:disabled{opacity:.5;cursor:not-allowed}
.hia-site-source-shell .hia-source-code{border:1px solid var(--hia-border);border-radius:10px;background:var(--hia-surface);color:var(--hia-text);overflow:auto;max-width:100%;padding:14px 18px;font:13px/1.95 Consolas,monospace}
.hia-site-source-shell .hia-source-line-number{color:var(--hia-muted)}
.hia-site-source-shell .hia-sidebar a{display:block;padding:8px 10px;overflow-wrap:break-word}
.hia-site-reading-trigger{display:none}.hia-site-static-search{display:inline-flex}
[data-hia-reading-ready] .hia-site-reading-trigger{display:inline-flex;align-items:center;gap:10px;border:1px solid var(--hia-border);background:var(--hia-surface);color:var(--hia-text);border-radius:8px;padding:6px 11px;font:inherit;font-size:.79rem;min-height:36px;cursor:pointer}
[data-hia-site-navigation] dialog{width:min(650px,calc(100vw - 32px));max-height:calc(100dvh - 32px);padding:0;border:1px solid var(--hia-border);border-radius:16px;background:var(--hia-surface);color:var(--hia-text);box-shadow:0 25px 90px #00132d44}
[data-hia-site-navigation] dialog::backdrop{background:#0c1c3680}[data-hia-site-navigation] dialog header{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid var(--hia-border);gap:12px}
[data-hia-site-navigation] dialog h2{margin:0;font-size:1rem}.hia-site-dialog-body{padding:22px}.hia-site-dialog-body label{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:14px 0;border-bottom:1px solid var(--hia-border)}
.hia-site-dialog-body select,.hia-site-dialog-body input{font:inherit;color:inherit;border:1px solid var(--hia-border);border-radius:6px;background:var(--hia-surface);padding:8px;min-width:0}.hia-site-dialog-body input{width:100%;margin:14px 0}
[data-hia-reading-results]{max-height:45dvh;overflow:auto}[data-hia-reading-results] a{display:block;padding:12px;border-bottom:1px solid var(--hia-border);overflow-wrap:break-word}
[data-hia-reading-close],[data-hia-reading-copy]{border:1px solid var(--hia-border);border-radius:5px;background:var(--hia-surface);color:var(--hia-text);padding:5px 8px;cursor:pointer}
[data-hia-reading-copy]{float:right;font-size:.7rem}[data-hia-reading-wrap="wrap"] .hia-signature,[data-hia-reading-wrap="wrap"] .hia-source-code-line{white-space:pre-wrap!important;overflow-wrap:anywhere;min-width:0!important}
[data-hia-site-navigation] [data-hia-topic-section="declaration"]{position:relative;border:0;padding:0}
[data-hia-site-navigation] [data-hia-topic-section="declaration"]>h3{border:1px solid var(--hia-border);border-bottom:0;border-radius:10px 10px 0 0;background:var(--hia-surface);font-size:.7rem;font-weight:400;margin:0;padding:9px 16px}
[data-hia-site-navigation] [data-hia-topic-section="declaration"]>.hia-signature{border-radius:0 0 10px 10px;margin:0}
[data-hia-site-navigation] [data-hia-topic-section="declaration"]>[data-hia-reading-copy]{position:absolute;float:none;right:10px;top:5px}
[data-hia-reading-lines="hide"] .hia-source-line-number{display:none!important}
[data-hia-site-navigation] [id]{scroll-margin-top:16px}
@media(max-width:1150px){[data-hia-site-navigation] .hia-shell{grid-template-columns:210px minmax(0,1fr);gap:28px}.hia-site-toc{display:none}.hia-site-mobile-outline{display:block;border:1px solid var(--hia-border);border-radius:8px;background:var(--hia-surface);margin-bottom:14px}.hia-site-mobile-outline>summary{padding:11px 13px;font-size:.83rem}.hia-site-mobile-outline nav{padding:0 13px 12px}.hia-site-search-trigger kbd{display:none}}
@media(max-width:800px){[data-hia-site-navigation] .hia-shell{display:block;width:calc(100% - 36px);padding-top:18px}.hia-site-directory{position:static;max-height:none;margin-bottom:14px;border:1px solid var(--hia-border);border-radius:8px;background:var(--hia-surface)}.hia-site-directory>summary{display:block;padding:11px 13px;font-weight:600;font-size:.83rem}.hia-site-directory>summary:before{content:'▸ ';}.hia-site-directory[open]>summary:before{content:'▾ ';}[data-hia-site-navigation] .hia-sidebar{padding:13px;border:0;max-height:55dvh;overflow:auto}[data-hia-reading-ready] .hia-site-search-trigger{display:none}[data-hia-site-navigation] .hia-project-topic-header :is(h1,h2){font-size:1.6rem;overflow-wrap:anywhere}.hia-site-source-shell h1{font-size:1.9rem}[data-hia-reading-ready] .hia-site-reading-trigger{padding:5px 8px;min-height:34px;font-size:.72rem}}
@media(max-width:370px){[data-hia-site-navigation] .hia-shell{width:calc(100% - 32px)}[data-hia-reading-ready] .hia-site-reading-trigger{padding:4px 6px}}
@media(max-width:800px){.hia-site-source-shell>.hia-site-directory{display:none}.hia-site-source-mobile-directory{display:block;border:1px solid var(--hia-border);border-radius:8px;background:var(--hia-surface);margin-bottom:14px}.hia-site-source-mobile-directory>summary{padding:11px 13px;font-size:.83rem;font-weight:600}.hia-site-source-mobile-directory .hia-sidebar{max-height:none}}
@media print{[data-hia-site-navigation] .hia-shell{display:block;width:100%;padding:0}.hia-site-directory,.hia-site-toc,.hia-site-mobile-outline,.hia-site-source-mobile-directory,[data-hia-site-navigation] dialog,[data-hia-reading-copy]{display:none!important}[data-hia-site-navigation] .hia-main{width:100%}}
@media(forced-colors:active){.hia-site-directory,.hia-site-notice,[data-hia-site-navigation] dialog{border:1px solid CanvasText}[data-hia-site-navigation] a{color:LinkText}[data-hia-site-navigation] .hia-site-mark{background:Highlight;color:HighlightText}.hia-source-code-line:target{outline:2px solid Highlight}}
`;
