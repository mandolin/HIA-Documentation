/**
 * @file
 * @lang zh-CN 默认主题资源的显式唯一写入投影与同站URL重定位；不读写文件或修改页面内容字段。
 * @lang en Explicit sole-writer projection and same-site URL relocation for default theme assets, without filesystem I/O or documentation-field mutation.
 */
import { DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH, getDefaultThemeAssets, type HiaThemeAssetOptions } from "@hia-doc/theme-default";
import type { RenderedHtmlFile } from "./index.js";

/**
 * @lang zh-CN 生成可交给显式共享资源写入者的两个默认主题文件，不生成页面或manifest。
 * @lang en Generates two default-theme files for an explicit shared-resource writer, without pages or manifests.
 * @param options <lang><zh-CN>安全颜色覆盖；非法值由主题owner拒绝。</zh-CN><en>Safe color overrides; invalid values are rejected by the theme owner.</en></lang>
 * @returns <lang><zh-CN>全新文件记录，固定安全相对路径；调用者决定唯一输出根。</zh-CN><en>New file records with fixed safe relative paths; callers choose the sole output root.</en></lang>
 */
export function renderThemeAssets(options: HiaThemeAssetOptions = {}): RenderedHtmlFile[] {
  return getDefaultThemeAssets(options).map((file) => ({ ...file, role: "asset" }));
}

/** @lang zh-CN 只定义主题资源所有权与URL，不将父相对URL当作文件写入路径。 @lang en Defines only theme-resource ownership and URLs, never treating parent-relative URLs as write paths. */
export interface ThemeAssetRouting {
  /** @lang zh-CN 默认local，external由外部唯一写入者提供。 @lang en Defaults to local; external resources are supplied by one external writer. */
  mode?: "local" | "external";
  /** @lang zh-CN external资源目录，按输出根相对或站点根相对解释。 @lang en External asset directory, relative to the output root or site root. */
  baseUrl?: string;
}

/**
 * @lang zh-CN 外部模式移除本次主题资源副本，并按各HTML深度重定位两个固定引用；保留其它资源与全部正文。
 * @lang en External mode removes per-render theme copies and relocates two fixed references by HTML depth, retaining all other resources and prose.
 * @param files <lang><zh-CN>当前renderer生成的文件；不修改原对象。</zh-CN><en>Files produced by the current renderer; original records remain unchanged.</en></lang>
 * @param routing <lang><zh-CN>只允许同站URL，不接受协议、query、fragment或反斜杠。</zh-CN><en>Same-site URLs only, without schemes, queries, fragments or backslashes.</en></lang>
 * @returns <lang><zh-CN>新数组，必要时复制HTML记录；不做文件I/O或外部下载。</zh-CN><en>New array, copying HTML records when needed; no file I/O or external downloads.</en></lang>
 * @throws {TypeError} <lang><zh-CN>非法资源模式或URL，在调用者写文件前拒绝。</zh-CN><en>Invalid resource modes/URLs are rejected before caller file writes.</en></lang>
 */
export function relocateDefaultThemeAssets(files: readonly RenderedHtmlFile[], routing: ThemeAssetRouting = {}): RenderedHtmlFile[] {
  // <lang><zh-CN>资源所有权缺省为本次输出，保留兼容行为。</zh-CN><en>Resource ownership defaults to the current output for compatibility.</en></lang>
  const mode = routing.mode ?? "local";
  if (mode === "local" && routing.baseUrl === undefined) return [...files];
  // <lang><zh-CN>目录URL仅参与HTML引用，不参与磁盘路径拼接。</zh-CN><en>The directory URL participates only in HTML references, never disk path joins.</en></lang>
  const base = routing.baseUrl;
  if (mode !== "external" || typeof base !== "string" || !base || /[\s\\<>"']/u.test(base) || base.startsWith("//") || /^[a-z][a-z0-9+.-]*:/iu.test(base)) throw new TypeError("HIA_THEME_ASSETS_INVALID: External assets require a safe same-site directory URL.");
  try {
    // <lang><zh-CN>使用固定同源哨兵验证URL解析结果，拒绝query/fragment及远端资源。</zh-CN><en>A fixed same-origin sentinel validates URL parsing and rejects queries, fragments and remote assets.</en></lang>
    const parsed = new URL(base, "https://hia.invalid/base/");
    if (parsed.origin !== "https://hia.invalid" || parsed.search || parsed.hash) throw new TypeError();
  } catch { throw new TypeError("HIA_THEME_ASSETS_INVALID: External assets require a safe same-site directory URL."); }

  // <lang><zh-CN>只重定位默认主题CSS/JS，不碰source、entry、搜索索引或其它资源的URL。</zh-CN><en>Relocate only default-theme CSS/JS, leaving source, entry, search-index and other-resource URLs untouched.</en></lang>
  const directory = base.endsWith("/") ? base : `${base}/`;
  return files.filter((file) => file.role !== "asset" || (file.path !== DEFAULT_THEME_CSS_PATH && file.path !== DEFAULT_THEME_JS_PATH)).map((file) => {
    if (!file.contentType.startsWith("text/html")) return file;
    // <lang><zh-CN>页面深度相对于当前输出根；根相对URL保持绝对站点路径。</zh-CN><en>Page depth is relative to the current output root; root-relative URLs retain their absolute site path.</en></lang>
    const prefix = directory.startsWith("/") ? "" : "../".repeat(file.path.split("/").length - 1);
    // <lang><zh-CN>转义URL中的&，避免HTML实体被浏览器解码成绕过同源检查的斜杠。</zh-CN><en>Escape URL ampersands so browser entity decoding cannot introduce slashes that bypass same-origin validation.</en></lang>
    const escapedDirectory = `${prefix}${directory}`.replaceAll("&", "&amp;");
    const contents = file.contents.replace(/\b(href|src)="((?:\.\.\/)*assets\/hia-default\.(css|js))"/gu, (_whole, attribute, _original, extension) => `${attribute}="${escapedDirectory}hia-default.${extension}"`);
    return contents === file.contents ? file : { ...file, contents };
  });
}
