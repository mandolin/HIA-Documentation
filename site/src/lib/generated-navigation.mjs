/**
 * @file
 * @lang zh-CN 官网生成代码页的宿主导航数据，复用手册路由与真实文档版本，不执行渲染或文件读取。
 * @lang en Host navigation data for generated website code pages, reusing manual routes and actual documentation versions without rendering or file reads.
 */
import { href, labels } from "./routes.mjs";
import { currentDocumentation } from "./version-index.mjs";

/**
 * @lang zh-CN 从官网同一事实源生成HIA导航草案；首版只有实际1.0.0预览及历史总入口。
 * @lang en Produces the HIA navigation draft from the website's shared facts, initially containing only the actual 1.0.0 preview and archive directory.
 * @param {string} [base="/HIA-Documentation/"] <lang><zh-CN>已确认的站点部署根。</zh-CN><en>Confirmed deployment root.</en></lang>
 * @returns {import("../../../../packages/renderer-html/dist/index.js").DocumentationSiteNavigation} <lang><zh-CN>只含可公开标签与站内路径的数据，不携带来源授权。</zh-CN><en>Data containing only public labels and site-local paths, without source authority.</en></lang>
 */
export function createGeneratedSiteNavigation(base = "/HIA-Documentation/") {
  // <lang><zh-CN>双语映射统一从明确主题构造，不通过替换URL片段猜测译文对应关系。</zh-CN><en>Build locale mappings from explicit topics, without guessing translation counterparts through URL replacement.</en></lang>
  const paths = topic => ({ "zh-CN": href(topic, "zh-CN", base), en: href(topic, "en", base) });
  const text = topic => ({ "zh-CN": labels["zh-CN"][topic], en: labels.en[topic] });
  // <lang><zh-CN>保留已确认的两语言代码参考深链，独立于手册的代码文档导览页。</zh-CN><en>Retain the confirmed bilingual code-reference deep links independently of the manual code-documentation landing page.</en></lang>
  const code = { "zh-CN": `${base}zh-CN/`, en: `${base}en/` };
  return {
    contract: "documentation-site-navigation",
    contractVersion: "0.1.0-draft",
    deploymentBase: base,
    brand: {
      title: "HIA-Documentation-Sys",
      captionByLocale: { "zh-CN": "面向人与人工智能的文档体系", en: "Documentation for people and AI" },
      homeByLocale: paths("home")
    },
    primaryNavigation: [
      ...["home", "features", "docs"].map(id => ({ id, labelByLocale: text(id), hrefByLocale: paths(id) })),
      {
        id: "examples",
        labelByLocale: { "zh-CN": "演示项目", en: "Examples" },
        hrefByLocale: {
          "zh-CN": `${href("features", "zh-CN", base)}#examples`,
          en: `${href("features", "en", base)}#examples`
        }
      }
    ],
    documentationTabs: [
      { id: "docs", labelByLocale: { "zh-CN": "文档首页", en: "Documentation home" }, hrefByLocale: paths("docs") },
      { id: "learn", labelByLocale: { "zh-CN": "学习", en: "Learn" }, hrefByLocale: paths("start") },
      { id: "reference", labelByLocale: { "zh-CN": "参考", en: "Reference" }, hrefByLocale: paths("reference") },
      { id: "development", labelByLocale: { "zh-CN": "开发文档", en: "Development" }, hrefByLocale: paths("development") },
      { id: "code", labelByLocale: { "zh-CN": "代码文档", en: "Code reference" }, hrefByLocale: code }
    ],
    activePrimaryId: "docs",
    activeTabId: "code",
    documentationVersion: {
      ...currentDocumentation,
      entries: [{ ...currentDocumentation, hrefByLocale: code }],
      history: {
        labelByLocale: { "zh-CN": "历史版本与保留规则 →", en: "Archives and retention →" },
        hrefByLocale: paths("versions")
      }
    },
    localeTargets: code
  };
}
