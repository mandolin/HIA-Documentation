/**
 * @lang zh-CN 官网预览的显式双语路由清单；不推断发行状态或历史版本。
 * @lang en Explicit bilingual website routes; never infers release status or historical versions.
 */
export const locales = ["zh-CN", "en"];
/** @lang zh-CN 有实际正文的页面种类。 @lang en Page kinds backed by actual content. */
export const kinds = ["home", "features", "docs", "start", "domains", "project-language", "theme-source", "deployment-versions", "reference", "development", "code-reference", "reading-support", "versions", "search"];

/** @lang zh-CN 实际Markdown手册主题，独立于生成API的覆盖声明。 @lang en Actual Markdown manual topics, separate from generated API coverage. */
export const manualKinds = ["start", "domains", "project-language", "theme-source", "deployment-versions", "reference", "development", "code-reference", "reading-support"];

/**
 * @lang zh-CN 将已知主题解析为站点内路径，不接受外部URL或任意路径片段。
 * @lang en Resolve a known topic to a site path, excluding arbitrary paths and external URLs.
 * @param {string} kind - 页面种类。 Page kind.
 * @param {string} locale - 明确的正文语言。 Explicit content locale.
 * @returns {string} 相对于站点根的路径。 Path relative to the deployment base.
 * @throws {Error} 主题或语言未声明。 Unknown topic or locale.
 */
export function route(kind, locale) {
  if (!kinds.includes(kind) || !locales.includes(locale)) throw new Error("Unknown website topic or locale.");
  // <lang lang="zh-CN">历史总页默认中文，英文仍为显式深链，不做浏览器语言重定向。</lang><lang lang="en">History defaults to Chinese and keeps an explicit English deep link without browser-language redirects.</lang>
  const paths = {
    home: locale === "zh-CN" ? "" : "site/en/",
    features: `site/${locale}/features/`,
    docs: `docs/${locale}/`,
    start: `docs/${locale}/learn/start/`,
    domains: `docs/${locale}/learn/domains/`,
    "project-language": `docs/${locale}/learn/project-language/`,
    "theme-source": `docs/${locale}/learn/theme-source/`,
    "deployment-versions": `docs/${locale}/learn/deployment-versions/`,
    reference: `docs/${locale}/reference/`,
    development: `docs/${locale}/development/`,
    "code-reference": `docs/${locale}/code/`,
    "reading-support": `docs/${locale}/reading-support/`,
    versions: locale === "zh-CN" ? "docs/versions/" : "docs/versions/en/",
    search: `docs/${locale}/search/`,
  };
  return paths[kind];
}

/**
 * @lang zh-CN 为受控站内主题统一补部署base，保证深层页面和子路径部署的链接一致。
 * @lang en Prefix controlled topics with the deployment base for consistent nested-page links.
 * @param {string} kind - 主题。 Topic.
 * @param {string} locale - 语言。 Locale.
 * @param {string} [base="/HIA-Documentation/"] - Astro构建base。 Astro deployment base.
 * @returns {string} 站点绝对路径。 Site-absolute path.
 */
export function href(kind, locale, base = "/HIA-Documentation/") {
  if (base !== "/" && !/^\/(?:[A-Za-z0-9_-]+\/)+$/.test(base)) throw new Error("Invalid website deployment base.");
  return base + route(kind, locale);
}

/** @lang zh-CN 页面标题同时用于导航、搜索目录和浏览器标题。 @lang en Shared labels for navigation, directory search, and document titles. */
export const labels = {
  "zh-CN": { home: "概览", features: "功能特性", docs: "文档", start: "第一次使用", domains: "四域文档入门", "project-language": "聚合项目与语言", "theme-source": "品牌与来源阅读", "deployment-versions": "构建与版本保留", reference: "配置与命令行", development: "扩展与维护", "code-reference": "浏览代码文档", "reading-support": "阅读与支持", versions: "版本与封版", search: "搜索文档" },
  en: { home: "Overview", features: "Features", docs: "Documentation", start: "First steps", domains: "Four domain workflows", "project-language": "Projects and locales", "theme-source": "Branding and source reading", "deployment-versions": "Builds and retention", reference: "Configuration and commands", development: "Extension and maintenance", "code-reference": "Browse code documentation", "reading-support": "Reading and support", versions: "Versions and archives", search: "Search documentation" },
};
