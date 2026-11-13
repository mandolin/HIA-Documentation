/**
 * @lang zh-CN 官网公开边界回归反例：品牌、编码泄漏、语言与路由拒绝，不依赖网络。
 * @lang en Website boundary regression cases for branding, encoded leaks, and rejected locales/routes; no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import { assertPublicText } from "./check-official-web.mjs";
import { href, route, apiReferenceHref, apiReferenceBase, manualKinds } from "../site/src/lib/routes.mjs";
import { createGeneratedSiteNavigation } from "../site/src/lib/generated-navigation.mjs";

test("default documentation entry serves the complete explicit Chinese page without scripts", async () => {
  // <lang><zh-CN>已确认无语言入口默认中文，直接返回同一正文和显式语言链接，避免依赖重定向脚本。</zh-CN><en>The approved language-free entry defaults to Chinese, directly serving the same body and explicit locale links without redirect scripts.</en></lang>
  const root = new URL("../dist/official-web-preview/",import.meta.url);
  assert.deepEqual(await readFile(new URL("docs/index.html",root)),await readFile(new URL("docs/zh-CN/index.html",root)));
});

test("documentation home and articles share all five categories with the correct current topic", async () => {
  // <lang><zh-CN>直接核正常静态产物，捕获首页遗漏栏目、译文/目标漂移以及正文选中态回归。</zh-CN><en>Check normal static artifacts directly to catch missing home categories, translated-target drift and article-selection regressions.</en></lang>
  const root = new URL("../dist/official-web-preview/",import.meta.url);
  const topics = ["docs",...manualKinds,"versions","search"];
  const categories = ["docs","start","reference","development","code-reference"];
  for (const locale of ["zh-CN","en"]) {
    for (const topic of topics) {
      const html = await readFile(new URL(route(topic,locale)+"index.html",root),"utf8");
      const name = locale==="en" ? "Documentation categories" : "文档栏目";
      const navigation = [...html.matchAll(new RegExp('<nav class="tabs" aria-label="'+name+'">([\\s\\S]*?)</nav>',"g"))];
      assert.equal(navigation.length,1,locale+"/"+topic+": one documentation-category region is required.");
      const links = [...navigation[0][1].matchAll(/<a\b([^>]*)>([^<]+)<\/a>/g)];
      assert.deepEqual(links.map(link=>link[1].match(/href="([^"]+)"/)?.[1]),categories.map(category=>href(category,locale)));
      // <lang><zh-CN>领域/聚合/品牌/部署手册归学习；版本、搜索和阅读支持没有虚构选中栏目。</zh-CN><en>Domain/project/branding/deployment manuals belong to learning; version, search and reading support pages have no invented selected category.</en></lang>
      const currentTopic = ["domains","project-language","theme-source","deployment-versions"].includes(topic) ? "start" : topic;
      const selected = links.filter(link=>link[1].includes('aria-current="page"'));
      assert.deepEqual(selected.map(link=>link[1].match(/href="([^"]+)"/)?.[1]),categories.includes(currentTopic) ? [href(currentTopic,locale)] : []);
    }
  }
});

test("printing a dark screen restores the complete light paper palette", async () => {
  // <lang><zh-CN>打印采用已确认浅色纸面，暗色覆盖的每个色值均须恢复，防止白纸上残留浅字/深卡。</zh-CN><en>Printing uses the confirmed light paper surface, restoring every dark override to prevent pale text and dark cards on white paper.</en></lang>
  const css = await readFile(new URL("../site/src/styles/site.css",import.meta.url),"utf8");
  const declarations = body => Object.fromEntries([...body.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;{}]+)/g)].map(match=>[match[1],match[2].trim()]));
  const light = declarations(css.match(/:root\s*\{([^}]+)\}/)[1]);
  const dark = declarations(css.match(/^html\[data-theme="dark"\]\s*\{([^}]+)\}/m)[1]);
  const paper = css.match(/@media print\s*\{\s*html\[data-theme="dark"\]\s*\{([^}]+)\}/);
  assert(paper,"Dark screen preferences must explicitly restore the paper palette.");
  assert.deepEqual(declarations(paper[1]),Object.fromEntries(Object.keys(dark).map(name=>[name,light[name]])));
});

test("official API entry and shared navigation use the confirmed sibling paths", () => {
  assert.equal(apiReferenceHref("en"), "https://mandolin.github.io/HIA-Documentation-API/en/");
  assert.equal(apiReferenceHref("zh-CN"), "https://mandolin.github.io/HIA-Documentation-API/zh-CN/");
  assert.throws(() => apiReferenceHref("../private"));
  const navigation = createGeneratedSiteNavigation("/HIA-Documentation/", apiReferenceBase);
  assert.equal(navigation.deploymentBase, "/");
  assert.equal(navigation.brand.homeByLocale["zh-CN"], "/HIA-Documentation/");
  assert.equal(navigation.localeTargets.en, "/HIA-Documentation-API/en/");
  assert.equal(createGeneratedSiteNavigation().localeTargets.en, "/HIA-Documentation/en/");
});

test("Public brand prose remains allowed", () => {
  assert.doesNotThrow(() => assertPublicText("HIA-Documentation-Sys · Documentation for people and AI."));
});

// <lang lang="zh-CN">固定虚构路径，仅验证常见编码和拼接形式，无真实工作区内容。</lang><lang lang="en">Fixed fictitious paths exercise common encodings and compositions without real workspace data.</lang>
for (const leak of ["K:/Project/HIA-Documentation-Sys/", "K:\\Project\\HIA-Documentation-Sys\\", "work-zone/notes", "ai/codex/private", "Github_mandolin", "file:///tmp/input", "/home/sample/project/", "%77ork-zone%2Fnotes", "%2577ork-zone%252Fnotes", "work-zone&#47;notes", "work-zone&sol;notes", String.raw`work-zone\u002fnotes`, String.raw`work-zone\x2fnotes`]) {
  test("Reject private representation: " + leak, () => assert.throws(() => assertPublicText(leak)));
}
test("Unrecognized locales and topics never fall back silently", () => {
  assert.throws(() => route("home", "fr"));
  assert.throws(() => route("../outside", "en"));
  assert.throws(() => href("home", "en", "//external/"));
  assert.throws(() => href("home", "en", "/x/../"));
});
test("Nested translated topics preserve the deployment base", () => {
  assert.equal(href("start", "en"), "/HIA-Documentation/docs/en/learn/start/");
  assert.equal(href("home", "zh-CN"), "/HIA-Documentation/");
});
test("Literal percent cannot hide an encoded private path", () => {
  assert.throws(() => assertPublicText("100% public work%2Dzone%2Fnotes"));
  assert.throws(() => assertPublicText(String.raw`\\server\share\private`));
});
test("a bare file protocol label is not a local file URL", () => {
  assert.doesNotThrow(() => assertPublicText('Use <code>file://</code> only as a protocol label.'));
  assert.throws(() => assertPublicText('file:///sample/private.txt'));
  assert.throws(() => assertPublicText('file://server/share/private.txt'));
  assert.throws(() => assertPublicText('file&#58;///sample/private.txt'));
});
