/**
 * @lang zh-CN 官网静态构建配置；源码与产物留在主仓，预览不覆盖既有参考站。
 * @lang en Static website configuration; sources and preview output stay inside the owning repository.
 */
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import {satteri} from "@astrojs/markdown-satteri";
import {markdownTableWrappers} from "./src/lib/markdown-tables.mjs";

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  // <lang lang="zh-CN">所有目录显式解析，避免从调用目录错误推导出空站点。</lang><lang lang="en">Resolve all directories explicitly to avoid an empty site inferred from the invocation directory.</lang>
  srcDir: fileURLToPath(new URL("./src/", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public/", import.meta.url)),
  outDir: fileURLToPath(new URL("../dist/official-web-preview/", import.meta.url)),
  site: "https://mandolin.github.io",
  base: "/HIA-Documentation/",
  trailingSlash: "always",
  output: "static",
  // <lang><zh-CN>原始HTML标题进入同一HAST，正式标题插件据实际ID生成小节目录；表格包装同时支持无脚本键盘阅读。</zh-CN><en>Parse raw HTML headings into the same HAST so the standard heading plugin collects real section IDs; table wrappers also support script-free keyboard reading.</en></lang>
  markdown: {processor: satteri({hastPlugins: [markdownTableWrappers()], features: {rawHtml: true}})},
  image: { service: { entrypoint: "astro/assets/services/passthrough" } },
  build: { format: "directory" },
  vite: { build: { sourcemap: false } },
});
