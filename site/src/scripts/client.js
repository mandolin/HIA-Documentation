/**
 * @lang zh-CN 官网本页增强：安全的正文检索、模态焦点与显示设置；不持久化、不联网、不执行源码。
 * @lang en Page-local enhancement for safe body search, modal focus, and display settings; no persistence, network access, or source execution.
 */
import { readSearchIndex, searchDocuments } from "../lib/search.mjs";
// <lang lang="zh-CN">增强初始化后才展示脚本专属控件；基础链接始终存在。</lang><lang lang="en">Expose script-only controls only after initialization; ordinary links remain available.</lang>
document.documentElement.dataset.js = "ready";

/**
 * @lang zh-CN 打开本页已声明的原生对话框。
 * @lang en Open an existing native dialog in this document.
 * @param {string | undefined} id - 受控对话框标识。 Controlled dialog ID.
 * @returns {void} 仅改变本页模态状态。 Changes only local modal state.
 */
function openDialog(id) {
  // <lang lang="zh-CN">仅允许固定两个模态；不将属性作为选择器或URL解释。</lang><lang lang="en">Allow only the two fixed modals without interpreting attributes as selectors or URLs.</lang>
  const dialog = id && ["search-dialog", "settings-dialog"].includes(id) ? document.getElementById(id) : null;
  if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
}

// <lang lang="zh-CN">声明式按钮仅控制本页已存在节点。</lang><lang lang="en">Declarative buttons control existing local nodes only.</lang>
for (const button of document.querySelectorAll("[data-dialog]")) button.addEventListener("click", () => openDialog(button.dataset.dialog));
for (const button of document.querySelectorAll("[data-close]")) button.addEventListener("click", () => button.closest("dialog")?.close());

// <lang lang="zh-CN">主题只影响当前页；系统选择同时响应系统主题变化。</lang><lang lang="en">Theme affects this page only; system choice also follows system-theme changes.</lang>
const media = matchMedia("(prefers-color-scheme: dark)");
const themeSelect = document.querySelector("[data-theme-select]");
/**
 * @lang zh-CN 应用封闭主题值，不保存用户偏好。
 * @lang en Apply a closed theme choice without persisting preferences.
 * @returns {void} 更新根元素主题属性。 Updates the root theme attribute.
 */
function applyTheme() {
  // <lang lang="zh-CN">选择值来自本页select，不接受查询参数覆盖。</lang><lang lang="en">Read the local select rather than accepting query overrides.</lang>
  const choice = themeSelect?.value;
  document.documentElement.dataset.theme = choice === "system" ? (media.matches ? "dark" : "light") : choice === "dark" ? "dark" : "light";
}
themeSelect?.addEventListener("change", applyTheme);
media.addEventListener("change", () => { if (themeSelect?.value === "system") applyTheme(); });
document.querySelector("[data-wrap-select]")?.addEventListener("change", (event) => {
  document.documentElement.dataset.wrap = event.target.value === "wrap" ? "wrap" : "scroll";
});

// <lang lang="zh-CN">构建时目录只含同语言实际页面；查询不会作为HTML或链接插入。</lang><lang lang="en">The build-time directory contains real same-language pages; queries never become HTML or links.</lang>
const english = document.documentElement.lang === "en";
const version = document.documentElement.dataset.documentationVersion;
// <lang lang="zh-CN">校验失败单独保留，不让增强脚本崩溃或把坏索引伪装为零结果。</lang><lang lang="en">Retain validation failure separately so enhancement survives and a broken index cannot masquerade as zero matches.</lang>
let entries;
try { entries = readSearchIndex(document.getElementById("page-directory")?.textContent, document.documentElement.lang, version); }
catch { entries = undefined; }
// <lang lang="zh-CN">复制只读取同一可见代码块；拒绝时提示手动选择，不读取其它页面或本机文件。</lang><lang lang="en">Copy only the same visible code block; denied access offers manual selection without reading other pages or local files.</lang>
for (const button of document.querySelectorAll("[data-copy]")) button.addEventListener("click", async () => {
  const block = button.closest(".code-box");
  const content = block?.querySelector("pre")?.textContent;
  const status = block?.querySelector(".copy-status");
  if (!content || !status) return;
  try { await navigator.clipboard.writeText(content); status.textContent = english ? "Copied" : "已复制"; }
  catch { status.textContent = english ? "Please select the code manually" : "请手动选择代码"; }
});
/**
 * @lang zh-CN 用安全DOM节点检索当前语言/版本正文；空结果与失败均保留普通目录入口。
 * @lang en Search exact-locale/version bodies through safe DOM nodes; both empty and failed searches retain the static directory.
 * @param {HTMLInputElement} input - 当前查询输入。 Current query input.
 * @param {HTMLElement} target - 本页结果区域。 Local results container.
 * @returns {void} 替换结果节点，不保存原始查询。 Replaces result nodes without storing queries.
 */
function updateSearch(input, target) {
  target.replaceChildren();
  if (!entries) {
    const error = document.createElement("p");
    error.className = "notice error";
    error.textContent = english ? "The current search index is unavailable. Continue from the static directory." : "当前检索索引暂不可用。请从静态目录继续阅读。";
    target.append(error);
    return;
  }
  // <lang lang="zh-CN">查询限制与控件一致，不编译正则或发起网络请求。</lang><lang lang="en">The query bound matches the input control without compiling regexes or making network requests.</lang>
  const matches = searchDocuments(entries, input.value.slice(0, 500), document.documentElement.lang, version);
  for (const entry of matches) {
    // <lang lang="zh-CN">目标来自构建目录，显示文字始终用textContent写入。</lang><lang lang="en">Targets come from the build directory and text always uses textContent.</lang>
    const link = document.createElement("a");
    link.href = entry.href;
    link.textContent = entry.title;
    const excerpt = document.createElement("small");
    excerpt.textContent = entry.excerpt;
    link.append(excerpt);
    target.append(link);
  }
  if (!matches.length) {
    // <lang lang="zh-CN">空结果与索引失败不同，静态目录始终提供恢复路径。</lang><lang lang="en">No matches differs from index failure; the static directory remains the recovery path.</lang>
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = english ? "No matching pages. Continue from the static directory below." : "没有匹配页面。可从下方静态目录继续阅读。";
    target.append(empty);
  }
}

// <lang lang="zh-CN">切换显式语言或当前版本时保留原锚点；目标缺小节时展示已确认提示，绝不切换到其它主题。</lang><lang lang="en">Preserve fragments on explicit language/current-version navigation; missing sections show confirmed feedback without changing the topic.</lang>
for (const link of document.querySelectorAll('a[hreflang],.mobile-nav a[lang],[data-preserve-anchor]')) {
  link.addEventListener("click", () => { if (location.hash) link.hash = location.hash; });
}
if (location.hash) {
  let anchor;
  try { anchor = decodeURIComponent(location.hash.slice(1)); } catch { anchor = undefined; }
  if (anchor && !document.getElementById(anchor)) {
    const warning = document.createElement("p");
    warning.className = "notice warning";
    warning.setAttribute("role", "status");
    warning.textContent = english ? "This topic is available, but the original section cannot be located. Continue through the page outline." : "已找到主题，原小节暂不可定位。可从本页内容继续阅读。";
    document.querySelector(".breadcrumbs")?.after(warning);
  }
}
for (const input of document.querySelectorAll("[data-search-input]")) {
  // <lang lang="zh-CN">每个查询框只更新其明确绑定的本页区域。</lang><lang lang="en">Each query updates only its explicitly bound local container.</lang>
  const target = document.getElementById(input.dataset.searchInput);
  if (target) {
    input.addEventListener("input", () => updateSearch(input, target));
    updateSearch(input, target);
  }
}

// <lang lang="zh-CN">模态首尾键盘循环与Esc显式处理，避免search输入吞Esc；原生close恢复触发焦点。</lang><lang lang="en">Explicit modal focus cycling and Escape handling prevent search inputs consuming Escape; native close restores trigger focus.</lang>
document.addEventListener("keydown", (event) => {
  const dialog = document.querySelector("dialog[open]");
  if (event.key === "Tab" && dialog) {
    // <lang lang="zh-CN">只遍历当前模态内可见且启用的普通控件。</lang><lang lang="en">Traverse only visible enabled native controls inside the active modal.</lang>
    const controls = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
  }
  if (event.key === "Escape") {
    if (dialog) { event.preventDefault(); dialog.close(); }
    else for (const disclosure of document.querySelectorAll(".header details[open]")) { disclosure.open = false; disclosure.querySelector("summary")?.focus(); }
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openDialog("search-dialog"); }
});
