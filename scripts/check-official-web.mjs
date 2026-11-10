/**
 * @lang zh-CN 校验独立官网产物的路由、语言、链接与公开边界；不替代统一站点或线上验收。
 * @lang en Validate standalone website routes, locales, links, and public boundaries; does not replace composed-site or online acceptance.
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { locales, kinds, manualKinds, route, href } from "../site/src/lib/routes.mjs";
import { readSearchIndex } from "../site/src/lib/search.mjs";
import { currentDocumentation } from "../site/src/lib/version-index.mjs";
import { createGeneratedSiteNavigation } from "../site/src/lib/generated-navigation.mjs";

/**
 * @lang zh-CN 拒绝公开文本中的本地路径与私有工作区标记，允许独立的公开产品名称。
 * @lang en Reject local paths and private-workspace markers while allowing the standalone public product name.
 * @param {string} value - 公开输出文本，不记录内容。 Public output text, never logged.
 * @returns {void} 成功无返回值。 Returns nothing on success.
 * @throws {Error} 发现禁止路径或编码超出支持边界。 Forbidden paths or unsupported excessive encoding.
 */
export function assertPublicText(value) {
  // <lang lang="zh-CN">分层展开URL、JSON和HTML常见编码；设上限防止无界解码。</lang><lang lang="en">Unwrap common URL, JSON, and HTML encodings with a bound against unbounded decoding.</lang>
  let normalized = value;
  for (let layer = 0; layer < 6; layer++) {
    // <lang lang="zh-CN">不把内容执行为脚本；只转换明确字符表示。</lang><lang lang="en">Decode explicit character representations without executing content.</lang>
    let decoded = normalized.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, digits) => String.fromCodePoint(Math.min(0x10ffff, digits[0].toLowerCase() === "x" ? parseInt(digits.slice(1), 16) : Number(digits))))
      .replace(/&(?:sol|bsol|colon);/gi, entity => ({ "&sol;": "/", "&bsol;": "\\", "&colon;": ":" })[entity.toLowerCase()])
      .replace(/&amp;/gi, "&");
    decoded = decoded.replace(/(?:%[0-9a-f]{2})+/gi, sequence => {
      try { return decodeURIComponent(sequence); }
      catch { return sequence.replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))); }
    });
    if (decoded === normalized) break;
    normalized = decoded;
    assert(layer < 5, "Public output exceeds supported encoding depth.");
  }
  normalized = normalized.replaceAll("\\", "/");
  // <lang lang="zh-CN">裸file://可作为协议说明；后接实际主机或路径的file URI仍拒绝，不对特定文档开白名单。</lang><lang lang="en">A bare file:// may name the scheme; file URIs followed by a host or path still fail, without document-specific exemptions.</lang>
  assert(!/(?:work-zone\s*\/|ai\/codex\/|Github_mandolin|\b[a-z]:\/|file:\/+(?=[^\s"'<>/])|(?:^|[\s"'=])\/\/[^/\s"'<>]+\/|\/(?:Users|home)\/[^/\s"'<>]+\/)/i.test(normalized), "Public output contains a private path marker.");
}

/**
 * @lang zh-CN 递归列举产物文件，不扫描工作区或输入仓库。
 * @lang en Enumerate artifact files recursively without scanning workspaces or source repositories.
 * @param {string} root - 已选择产物根。 Selected artifact root.
 * @returns {Promise<string[]>} 相对文件路径。 Relative file paths.
 */
async function listFiles(root) {
  // <lang lang="zh-CN">文件名保留为产物相对路径，以便跨系统核对。</lang><lang lang="en">Keep artifact-relative names for cross-platform validation.</lang>
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) for (const child of await listFiles(path.join(root, entry.name))) files.push(entry.name + "/" + child);
    else files.push(entry.name);
  }
  return files;
}

/**
 * @lang zh-CN 检查实际构建，不允许零页面构建被退出码掩盖。
 * @lang en Check actual built output so an exit code cannot conceal a zero-page build.
 * @param {string} [output] - 专用预览产物目录。 Dedicated preview artifact directory.
 * @returns {Promise<object>} 数量统计，不包含本机路径。 Counts without local paths.
 * @throws {Error} 页面、资源、锚点、语言或公开边界不符合。 Invalid pages, assets, anchors, languages, or public boundaries.
 */
export async function checkWebsite(output = fileURLToPath(new URL("../dist/official-web-preview/", import.meta.url))) {
  // <lang lang="zh-CN">固定路由清单是完整性输入，不能从产物反推“期望页面”。</lang><lang lang="en">The fixed route inventory defines completeness rather than inferring expected pages from the output.</lang>
  const files = await listFiles(output);
  const htmlFiles = files.filter(file => file.endsWith(".html"));
  assert.equal(htmlFiles.length, locales.length * kinds.length, "Website page inventory is incomplete.");
  assert(!files.some(file => file.endsWith(".map")), "Public source maps are not allowed.");
  const texts = new Map();
  for (const file of files) {
    if (/\.(?:html|css|js|json|svg)$/.test(file)) {
      // <lang lang="zh-CN">每类文本资产都过隐私检查，资源之外不从磁盘读取额外源码。</lang><lang lang="en">Scan each textual asset without reading additional source files outside the artifact.</lang>
      const text = await readFile(path.join(output, file), "utf8");
      assertPublicText(text);
      texts.set(file, text);
    }
  }
  // <lang><zh-CN>生成代码页的导航工件必须来自同一官网事实源，缺失或漂移不能通过手册构建验收。</zh-CN><en>Generated-code navigation must match the same website facts; missing or drifted data cannot pass manual-site acceptance.</en></lang>
  assert.deepEqual(JSON.parse(texts.get("documentation-site-navigation.json") ?? "null"), createGeneratedSiteNavigation(), "Generated navigation disagrees with website routes or documentation versions.");
  let links = 0;
  for (const locale of locales) for (const kind of kinds) {
    // <lang lang="zh-CN">清单独立验证每页语言、主内容与同主题译文目标。</lang><lang lang="en">Validate each page locale, main content, and same-topic alternate independently.</lang>
    const file = route(kind, locale) + "index.html";
    const html = texts.get(file);
    assert(html?.includes(`<html lang="${locale}"`), "Incorrect page locale.");
    // <lang lang="zh-CN">内嵌检索与真实手册清单逐项对应，不接受只有标题的伪全文索引。</lang><lang lang="en">Match the embedded index to actual manuals, rejecting title-only substitutes for body search.</lang>
    const indexText = html.match(/<script type="application\/json" id="page-directory">([\s\S]*?)<\/script>/)?.[1];
    const entries = readSearchIndex(indexText, locale, currentDocumentation.version);
    assert.deepEqual(entries.map(entry => entry.href), manualKinds.map(topic => href(topic, locale)), "Search manual inventory disagrees with actual routes.");
    assert(entries.every(entry => entry.text.length > 100), "Search bodies are missing.");
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, "Each page requires exactly one primary heading.");
    assert(html.includes('id="main"') && html.includes("HIA-Documentation-Sys"), "Required website structure is missing.");
    assert(html.includes(`hreflang="${locale === "en" ? "zh-CN" : "en"}"`), "Alternate language is missing.");
    assert(html.includes(href(kind, locale === "en" ? "zh-CN" : "en")), "Alternate topic path is missing.");
    for (const match of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      // <lang lang="zh-CN">外部公开入口按外链保留；所有站内资源和锚点都必须真实存在。</lang><lang lang="en">Retain public external links; every internal resource and fragment must exist.</lang>
      const target = new URL(match[1].replaceAll("&amp;", "&"), "https://website.invalid" + href(kind, locale));
      if (target.origin !== "https://website.invalid") continue;
      assert(target.pathname.startsWith("/HIA-Documentation/"), "Local link escapes the deployment base.");
      const relative = decodeURIComponent(target.pathname.slice("/HIA-Documentation/".length));
      const targetFile = !relative || relative.endsWith("/") ? relative + "index.html" : relative;
      assert(files.includes(targetFile), "Missing local page or asset: " + targetFile);
      if (target.hash) {
        const fragment = decodeURIComponent(target.hash.slice(1));
        assert(texts.get(targetFile)?.includes(`id="${fragment}"`), "Local anchor is missing.");
      }
      links++;
    }
  }
  return { pages: htmlFiles.length, files: files.length, localReferences: links };
}

// <lang lang="zh-CN">只有直接调用才执行磁盘检查，导入测试不触发构建或输出写入。</lang><lang lang="en">Direct invocation runs disk checks; imports for tests do not build or write output.</lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(await checkWebsite()));
