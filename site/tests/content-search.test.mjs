/**
 * @lang zh-CN 正文检索必须命中实际内容，隔离语言/版本并区分坏索引与空结果。
 * @lang en Content search must match body text, isolate locale/version, and distinguish invalid indexes from empty results.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { searchDocuments, readSearchIndex } from "../src/lib/search.mjs";
import { href, route } from "../src/lib/routes.mjs";
import { readFile } from "node:fs/promises";

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
