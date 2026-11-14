/**
 * @lang zh-CN 正文检索必须命中实际内容，隔离语言/版本并区分坏索引与空结果。
 * @lang en Content search must match body text, isolate locale/version, and distinguish invalid indexes from empty results.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { searchDocuments, readSearchIndex } from "../src/lib/search.mjs";
import { href, route } from "../src/lib/routes.mjs";
import { readFile } from "node:fs/promises";
import {markdownTableWrappers} from "../src/lib/markdown-tables.mjs";
import {createSatteriMarkdownProcessor} from "@astrojs/markdown-satteri";

test("both manual directories discover the confirmed JavaScript API and evidence sites in the current locale", async () => {
  // <lang><zh-CN>每个正文入口按已确认发布清单核完整名称与地址，语言与内容分区分别选择。</zh-CN><en>Check complete labels and URLs in both manual entries against the confirmed publication registry, selecting locale and content partition independently.</en></lang>
  const registry = JSON.parse(await readFile(new URL("../../reference/javascript-reference-inputs.json", import.meta.url), "utf8"));
  for (const locale of ["zh-CN", "en"]) for (const topic of ["reference", "code-reference"]) {
    const manual = await readFile(new URL(`../src/content/${topic}.${locale}.md`, import.meta.url), "utf8");
    for (const site of registry.sites) {
      const target = "https://mandolin.github.io" + site.base + site.path + locale + "/";
      assert(manual.includes(`[${site.titleByLocale[locale]}](${target})`), `Missing ${locale} ${topic} JavaScript partition ${site.id}`);
    }
  }
});

test("both manual directories discover the independent HTML tool API in their current locale", async () => {
  // <lang><zh-CN>HTML完整名称与目标来自同一正常生产清单，两正文和两语言同时覆盖。</zh-CN><en>HTML labels and targets come from the production registry, covering both manual topics and locales together.</en></lang>
  const registry = JSON.parse(await readFile(new URL("../../reference/html-reference-inputs.json", import.meta.url), "utf8"));
  for (const locale of ["zh-CN", "en"]) for (const topic of ["reference", "code-reference"]) {
    const manual = await readFile(new URL(`../src/content/${topic}.${locale}.md`, import.meta.url), "utf8");
    for (const site of registry.sites) {
      const target = "https://mandolin.github.io" + site.base + site.path + locale + "/";
      assert(manual.includes(`[${site.titleByLocale[locale]}](${target})`), `Missing ${locale} ${topic} HTML partition ${site.id}`);
    }
  }
});

test("both manual directories discover the independent CSS tool API in their current locale", async () => {
  // <lang><zh-CN>CSS完整名称与目标来自同一正常生产清单，两正文和两语言同时覆盖。</zh-CN><en>CSS labels and targets come from the production registry, covering both manual topics and locales together.</en></lang>
  const registry = JSON.parse(await readFile(new URL("../../reference/css-reference-inputs.json", import.meta.url), "utf8"));
  for (const locale of ["zh-CN", "en"]) for (const topic of ["reference", "code-reference"]) {
    const manual = await readFile(new URL(`../src/content/${topic}.${locale}.md`, import.meta.url), "utf8");
    for (const site of registry.sites) {
      const target = "https://mandolin.github.io" + site.base + site.path + locale + "/";
      assert(manual.includes(`[${site.titleByLocale[locale]}](${target})`), `Missing ${locale} ${topic} CSS partition ${site.id}`);
    }
  }
});

// <lang lang="zh-CN">同题不同语言/版本的合成公开正文，避免仅测标题匹配。</lang><lang lang="en">Synthetic public bodies share a topic across locales/versions to exercise more than title matching.</lang>
const entries = [
  { title: "品牌与来源", href: href("theme-source", "zh-CN"), locale: "zh-CN", version: "1.0.0", text: "共享资源只有一个写入者。accent 使用 #0047AB。" },
  { title: "Branding", href: href("theme-source", "en"), locale: "en", version: "1.0.0", text: "Assets have one writer. accent uses #0047AB." },
  { title: "Old", href: "/HIA-Documentation/docs/archive/v0/en/", locale: "en", version: "0.9.0", text: "Legacy-only secret-search-token" },
];

test("new reference/development routes remain explicit translated deep links", () => {
  assert.equal(route("reference", "zh-CN"), "docs/zh-CN/reference/");
  assert.equal(route("development", "en"), "docs/en/development/");
  assert.equal(route("domains", "en"), "docs/en/learn/domains/");
});
test("body terms and multiple literal words match without mixing locales or versions", () => {
  assert.equal(searchDocuments(entries, "写入者", "zh-CN", "1.0.0").length, 1);
  assert.equal(searchDocuments(entries, "writer ACCENT", "en", "1.0.0").length, 1);
  assert.equal(searchDocuments(entries, "writer", "zh-CN", "1.0.0").length, 0);
  assert.equal(searchDocuments(entries, "secret-search-token", "en", "1.0.0").length, 0);
});
test("queries are literal and bounded, not regular expressions or markup", () => {
  assert.deepEqual(searchDocuments(entries, "[.*", "en", "1.0.0"), []);
  assert.deepEqual(searchDocuments(entries, '<script>alert(1)</script>', "en", "1.0.0"), []);
  assert.throws(() => searchDocuments(entries, "x".repeat(501), "en", "1.0.0"), /query/i);
});
test("results retain an extract around body matches and never mutate the input", () => {
  const before = JSON.stringify(entries);
  const result = searchDocuments(entries, "#0047AB", "en", "1.0.0");
  assert.match(result[0].excerpt, /#0047AB/);
  assert.equal(JSON.stringify(entries), before);
  assert.equal(searchDocuments(Array(30).fill(entries[1]), "", "en", "1.0.0").length, 20);
});
test("malformed index differs from an empty valid index and never echoes rejected bytes", () => {
  assert.deepEqual(readSearchIndex("[]", "en", "1.0.0"), []);
  for (const raw of ["private malformed", JSON.stringify([{...entries[1], href:"javascript:alert(1)"}]), JSON.stringify([entries[0]])]) {
    assert.throws(() => readSearchIndex(raw, "en", "1.0.0"), error => error.message === "Search index unavailable.");
  }
  assert.equal(readSearchIndex(JSON.stringify([entries[1]]), "en", "1.0.0").length, 1);
});

test("English workflows retain every shared Chinese configuration and command example", async () => {
  for (const topic of ["domains", "project-language", "theme-source", "deployment-versions"]) {
    // <lang lang="zh-CN">针对共用代码逐块比对，避免提升英文时只留下指向另一语言的above描述。</lang><lang lang="en">Compare shared code blocks individually so English promotion cannot leave only a reference to examples in another language.</lang>
    const zh = await readFile(new URL(`../src/content/${topic}.zh-CN.md`, import.meta.url), "utf8");
    const en = await readFile(new URL(`../src/content/${topic}.en.md`, import.meta.url), "utf8");
    for (const block of zh.matchAll(/~~~[^\n]*\n([\s\S]*?)\n~~~/g)) assert(en.includes(block[1]), "English shared example is missing: " + topic);
  }
});

test("reference manuals link every actual HIA command to its bundled usage section", async () => {
  // <lang><zh-CN>从真实分发函数取路径，新增命令必须同步权威章节与两语言入口。</zh-CN><en>Read real dispatch paths so new commands require authoritative sections and both locale entries.</en></lang>
  const source = await readFile(new URL("../../apps/cli/src/index.ts", import.meta.url), "utf8");
  const dispatch = source.slice(source.indexOf("export async function runCli("), source.indexOf("async function runThemeAssets("));
  const commands = [...dispatch.matchAll(/normalizedArgv\[0\] === "([^"]+)" && normalizedArgv\[1\] === "([^"]+)"/g)].map(match => `${match[1]} ${match[2]}`);
  assert.equal(commands.length, 11);
  assert.equal(new Set(commands).size, commands.length);
  // <lang><zh-CN>ASCII命令标题的GitHub锚点与随包文档逐项对应，不为默认值复制第二份定义。</zh-CN><en>Match ASCII GitHub heading anchors against bundled documentation without duplicating default definitions.</en></lang>
  const usage = await readFile(new URL("../../apps/cli/USAGE.md", import.meta.url), "utf8");
  for (const locale of ["zh-CN", "en"]) {
    const manual = await readFile(new URL(`../src/content/reference.${locale}.md`, import.meta.url), "utf8");
    for (const command of commands) {
      const anchor = command.replaceAll(" ", "-");
      assert(usage.split(/\r?\n/u).includes(`### ${command}`), `Missing bundled usage heading: ${command}`);
      assert(manual.includes(`https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#${anchor}`), `Missing ${locale} command link: ${command}`);
      assert(manual.includes(`\`hia ${command}\``), `Missing searchable ${locale} command name: ${command}`);
    }
  }
});

test("reference manuals expose every declared resource partition in its own locale", async () => {
  // <lang><zh-CN>公开目录从同一分区清单核完整名称与目标，容量拆站时两语言入口须同步。</zh-CN><en>Verify full labels and destinations against the shared partition registry so capacity splits update both locale directories.</en></lang>
  const registry = JSON.parse(await readFile(new URL("../../reference/resource-reference-partitions.json", import.meta.url), "utf8"));
  for (const locale of ["zh-CN", "en"]) {
    const manual = await readFile(new URL(`../src/content/reference.${locale}.md`, import.meta.url), "utf8");
    for (const partition of registry.partitions) {
      // <lang><zh-CN>站点基址归对应发布仓所有，显式语言目标保持当前分区。</zh-CN><en>The owning publication repository supplies the site base while explicit locale routes retain the current partition.</en></lang>
      const site = registry.sites.find(item => item.id === partition.site);
      const href = "https://mandolin.github.io" + site.base + partition.path + locale + "/";
      assert(manual.includes(`[${partition.titleByLocale[locale]}](${href})`), `Missing ${locale} resource partition: ${partition.id}`);
    }
  }
});

test("Markdown table wrappers preserve read-only native nodes and request keyboard-reachable containers", () => {
  const table = Object.freeze({type:"element", tagName:"table", properties:Object.freeze({id:"public-table"}), children:Object.freeze([])});
  const wraps = [];
  markdownTableWrappers().element.visit(table, {parent: () => ({type:"root"}), wrapNode: (node, wrapper) => wraps.push({node, wrapper})});
  assert.equal(wraps.length, 1);
  assert.equal(wraps[0].node, table);
  assert.deepEqual(wraps[0].wrapper, {type:"element", tagName:"div", properties:{className:["table-wrap"], tabIndex:0}, children:[]});
  assert.equal(table.properties.id, "public-table");
});

test("existing Markdown table containers remain idempotent with a specific table visitor filter", () => {
  const table = {type:"element", tagName:"table", properties:{}, children:[]};
  const wrapper = {type:"element", tagName:"div", properties:{className:["table-wrap", "custom"]}, children:[table]};
  const plugin = markdownTableWrappers();
  const context = {parent: () => wrapper, wrapNode: () => assert.fail("Existing table wrapper changed")};
  plugin.element.visit(table, context);
  plugin.element.visit(table, context);
  assert.deepEqual(plugin.element.filter, ["table"]);
  assert.equal(wrapper.children[0], table);
});

test("the actual Satteri processor renders scroll wrappers around native Markdown table markup", async () => {
  const processor = await createSatteriMarkdownProcessor({hastPlugins:[markdownTableWrappers()]});
  const result = await processor.render("| Entry | Scope |\n| --- | --- |\n| [HTML](https://example.test/) | runner/producer/specification |\n");
  assert.match(result.code, /<div class="table-wrap" tabindex="0"><table>/u);
  assert(result.code.includes('<a href="https://example.test/">HTML</a>'));
  assert(result.code.includes('runner/producer/specification'));
  assert.equal((result.code.match(/<table>/gu) ?? []).length, 1);
});

test("the actual Astro build uses the current processor's native HAST table plugin", async () => {
  const config = await readFile(new URL("../astro.config.mjs", import.meta.url), "utf8");
  assert(config.includes('hastPlugins: [markdownTableWrappers()]'));
});

test("the configured Markdown processor collects explicit HTML headings alongside Markdown headings", async () => {
  // <lang><zh-CN>采用正式Astro配置，真实HTML标题及原ID进入目录，代码块中的标题文本仍为示例。</zh-CN><en>Use production Astro options so real HTML headings and original IDs enter the outline while headings inside code blocks remain examples.</en></lang>
  const {default: config} = await import("../astro.config.mjs");
  const processor = await createSatteriMarkdownProcessor(config.markdown.processor.options);
  const result = await processor.render('# Manual\n\n<h2 id="stable-section"><em>Visible</em> <code>a&amp;b</code></h2>\n\n## Markdown section\n\n~~~html\n<h2 id="code-only">Example</h2>\n~~~\n');
  assert.deepEqual(result.metadata.headings.filter(heading => heading.depth === 2), [
    {depth: 2, slug: "stable-section", text: "Visible a&b"},
    {depth: 2, slug: "markdown-section", text: "Markdown section"}
  ]);
  assert(result.code.includes('<h2 id="stable-section">'));
  assert(!result.metadata.headings.some(heading => heading.slug === "code-only"));
});

test("every actual manual section is represented in its generated heading metadata", async () => {
  // <lang><zh-CN>九篇双语手册的实际渲染H2与目录元数据逐ID顺序核对，捕获空目录和混合语法遗漏。</zh-CN><en>Compare rendered H2 IDs with outline metadata in order across all nine bilingual manuals, catching empty outlines and mixed-syntax omissions.</en></lang>
  const {default: config} = await import("../astro.config.mjs");
  const {manualKinds} = await import("../src/lib/routes.mjs");
  const processor = await createSatteriMarkdownProcessor(config.markdown.processor.options);
  for (const locale of ["zh-CN", "en"]) for (const kind of manualKinds) {
    // <lang><zh-CN>只读取已登记公开手册，同一编译结果提供正文节点与对应目录身份。</zh-CN><en>Read only registered public manuals, using the same compilation for body nodes and their outline identities.</en></lang>
    const input = await readFile(new URL(`../src/content/${kind}.${locale}.md`, import.meta.url), "utf8");
    const result = await processor.render(input);
    const actualIds = [...result.code.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>/gu)].map(match => match[1]);
    const headings = result.metadata.headings.filter(heading => heading.depth === 2);
    assert(actualIds.length > 0, `${locale}/${kind} needs its actual sections.`);
    assert.deepEqual(headings.map(heading => heading.slug), actualIds, `${locale}/${kind} outline covers every section in order.`);
    assert(headings.every(heading => heading.text.trim().length > 0));
  }
});

test("focused documentation categories reveal their full label without moving focus", async () => {
  // <lang><zh-CN>执行正式焦点处理器，已聚焦链接只请求最近滚动定位，其它目标保持可用。</zh-CN><en>Execute the production focus handler, asking the focused link for nearest scrolling while preserving other targets.</en></lang>
  const {runInNewContext} = await import("node:vm");
  const client = await readFile(new URL("../src/scripts/client.js", import.meta.url), "utf8");
  const source = client.match(/function revealFocusedCategory\(event\) \{[\s\S]*?\n\}/u)?.[0];
  assert(source, "Documentation categories need a focus-reveal handler.");
  const calls = [];
  class Anchor {
    scrollIntoView(options) { calls.push({...options}); }
    focus() { assert.fail("Scrolling must retain the browser's existing focus."); }
  }
  const handler = runInNewContext(source + "\nrevealFocusedCategory;", {HTMLAnchorElement: Anchor});
  handler({target: new Anchor()});
  handler({target: {}});
  assert.deepEqual(calls, [{block: "nearest", inline: "nearest"}]);
  assert(client.includes('document.querySelector(".tabs")?.addEventListener("focusin", revealFocusedCategory)'));
});


test("the shared HTML and CSS reference section names both domains and retains the original HTML anchor", async () => {
  // <lang><zh-CN>双领域目录用完整标题说明内容，原HTML小节锚点继续承接已有链接。</zh-CN><en>The two-domain directory names both scopes while the original HTML section anchor continues to serve existing links.</en></lang>
  for (const locale of ["zh-CN", "en"]) {
    const manual = await readFile(new URL(`../src/content/reference.${locale}.md`, import.meta.url), "utf8");
    const heading = locale === "zh-CN" ? "## HTML与CSS文档工具" : "## HTML and CSS documentation tools";
    const anchor = locale === "zh-CN" ? "html文档工具" : "html-documentation-tools";
    assert(manual.includes(heading));
    assert(manual.includes(`<div id="${anchor}"></div>`));
  }
});

test("both official directories expose the complete DotNetDoc tool reference at its registered locale roots", async () => {
  // <lang><zh-CN>两个正文目录从已确认清单核完整站名及对应语言入口，并说明声明文件语言。</zh-CN><en>Both prose directories match the confirmed registry's full site title and locale roots while identifying declaration-file language.</en></lang>
  const registry = JSON.parse(await readFile(new URL("../../reference/dotnet-reference-inputs.json", import.meta.url), "utf8"));
  const site = registry.sites[0];
  for (const locale of ["zh-CN", "en"]) {
    const destination = "https://mandolin.github.io" + site.base + locale + "/";
    for (const name of ["reference", "code-reference"]) {
      const manual = await readFile(new URL(`../src/content/${name}.${locale}.md`, import.meta.url), "utf8");
      assert(manual.includes(`[${site.titleByLocale[locale]}](${destination})`));
      assert(manual.includes("TypeScript"));
    }
  }
});


test("anchor feedback follows hash changes and clears on recovery, including malformed fragments", async () => {
  // <lang><zh-CN>执行官网原函数，保留同主题提示并验证恢复不会叠加或遗留警告。</zh-CN><en>Execute the website function, retaining same-topic feedback and verifying recovery leaves no duplicate or stale warning.</en></lang>
  const { runInNewContext } = await import("node:vm");
  const client = await readFile(new URL("../src/scripts/client.js", import.meta.url), "utf8");
  const source = client.match(/function updateAnchorNotice\(\) \{[\s\S]*?\n\}/u)?.[0];
  assert(source, "The current fragment needs a reusable recovery handler.");
  const notices = [];
  const document = {
    querySelector(selector) {
      if (selector === "[data-anchor-notice]") return notices[0];
      if (selector === ".breadcrumbs") return { after(element) { notices.push(element); } };
      return null;
    },
    getElementById(id) { return id === "valid" ? {} : null; },
    createElement() { return { setAttribute() {}, remove() { notices.splice(notices.indexOf(this), 1); } }; }
  };
  const location = { hash: "#missing" };
  const update = runInNewContext(`(${source})`, { document, location, english: true, decodeURIComponent });
  for (const fragment of ["#missing", "#other", "#%ZZ"]) {
    location.hash = fragment;
    update();
    assert.equal(notices.length, 1);
    assert.match(notices[0].textContent, /original section cannot be located/);
  }
  location.hash = "#valid";
  update();
  assert.equal(notices.length, 0);
  location.hash = "";
  update();
  assert.equal(notices.length, 0);
  assert.match(client, /addEventListener\("hashchange", updateAnchorNotice\)/);
});
