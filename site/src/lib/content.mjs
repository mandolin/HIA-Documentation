/**
 * @lang zh-CN 构建期手册登记：只加载本公开owner已提升的Markdown；不扫描工作区、业务仓或远程内容。
 * @lang en Build-time manual registry loading only promoted Markdown in this public owner, never workspaces, business repositories, or remote content.
 */
import { manualKinds, href, labels } from "./routes.mjs";
import { currentDocumentation } from "./version-index.mjs";

// <lang lang="zh-CN">Vite在构建期固定模块清单，运行时不会读取磁盘或按查询加载模块。</lang><lang lang="en">Vite fixes the module list at build time; runtime queries never read files or load modules.</lang>
const modules = import.meta.glob("../content/*.md", { eager: true });

/**
 * @lang zh-CN 获取已声明主题的精确语言正文，缺失使构建失败而不回退其它语言。
 * @lang en Get an exact-locale declared manual, failing the build rather than falling back.
 * @param {string} kind - 手册主题。 Manual topic.
 * @param {string} locale - 正文语言。 Content locale.
 * @returns {object} Astro Markdown模块。 Astro Markdown module.
 * @throws {Error} 声明的正文缺失。 Missing declared manual.
 */
export function manual(kind, locale) {
  const content = manualKinds.includes(kind) && modules[`../content/${kind}.${locale}.md`];
  if (!content) throw new Error("Declared manual translation is missing.");
  return content;
}

/**
 * @lang zh-CN 从同一实际正文生成当前版本检索条目；Markdown轻量去标记不作HTML执行或语言翻译。
 * @lang en Build current-version search entries from the same real manuals; lightweight Markdown cleanup executes no HTML and translates no content.
 * @param {string} locale - 正文语言。 Content locale.
 * @returns {object[]} 当前文档版本的公开文本条目。 Public text entries for the current documentation version.
 */
export function manualSearchEntries(locale) {
  return manualKinds.map(kind => {
    // <lang lang="zh-CN">只使用本文件已声明的公开正文；删除注释、标签和链接地址，保留代码与链接文字。</lang><lang lang="en">Use only declared public bodies; remove comments, tags, and link destinations while retaining code and link labels.</lang>
    const text = manual(kind, locale).rawContent().replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^[#~`]+[^\n]*$/gm, line => line.startsWith("#") ? line.replace(/^#+\s*/, "") : " ")
      .replace(/\s+/g, " ").trim();
    return { title: labels[locale][kind], href: href(kind, locale), locale, version: currentDocumentation.version, text };
  });
}
