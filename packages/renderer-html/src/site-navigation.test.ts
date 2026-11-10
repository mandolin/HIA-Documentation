/**
 * @file
 * @lang zh-CN 站点导航的版本、同源部署边界、双语及跨输出回归。
 * @lang en Version, same-origin deployment, bilingual, and cross-output navigation regressions.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { createDocumentationPortalUiLocaleAdoption, renderProjectHtmlDocument, renderProjectHtmlDocumentToWriter } from "./index.js";
import { assertDocumentationSiteNavigation, type DocumentationSiteNavigation } from "./site-navigation.js";
import { withSiteNavigation } from "./site-navigation-chrome.js";

/**
 * @lang zh-CN 两语言、一个真实预览版的公开导航夹具。
 * @lang en Public navigation fixture with two locales and one actual preview version.
 */
function navigation(): DocumentationSiteNavigation {
  return {
    contract: "documentation-site-navigation", contractVersion: "0.1.0-draft", deploymentBase: "/product/",
    brand: { title: 'Public & "Brand"', captionByLocale: { "zh-CN": "文档体系", en: "Documentation" }, homeByLocale: { "zh-CN": "/product/", en: "/product/site/en/" } },
    primaryNavigation: [{ id: "docs", labelByLocale: { "zh-CN": "文档", en: "Docs" }, hrefByLocale: { "zh-CN": "/product/docs/zh-CN/", en: "/product/docs/en/" } }],
    documentationTabs: [{ id: "code", labelByLocale: { "zh-CN": "代码文档", en: "Code reference" }, hrefByLocale: { "zh-CN": "/product/zh-CN/", en: "/product/en/" } }],
    activePrimaryId: "docs", activeTabId: "code",
    documentationVersion: { version: "1.0.0", status: "preview", entries: [{ version: "1.0.0", status: "preview", hrefByLocale: { "zh-CN": "/product/zh-CN/", en: "/product/en/" } }], history: { labelByLocale: { "zh-CN": "历史版本与保留规则", en: "Archives and retention" }, hrefByLocale: { "zh-CN": "/product/docs/versions/", en: "/product/docs/versions/en/" } } },
    localeTargets: { "zh-CN": "/product/zh-CN/", en: "/product/en/" }
  };
}

/**
 * @lang zh-CN 含授权源码的最小生成输入，不依赖业务仓。
 * @lang en Minimal generated input with authorized source, independent of business repositories.
 */
function project() {
  return { project: { name: "Public API", defaultLocale: "en", locales: ["en", "zh-CN"] }, entries: [{ id: "entry:one", name: "one", kind: "function", view: "js", signature: "one(): void", source: { path: "src/one.ts", range: { start: { line: 18 }, end: { line: 18 } }, preview: { content: "export function one() {}" } } }] };
}

describe("documentation-site-navigation@0.1.0-draft", () => {
  it("emits parseable browser scripts with bounded ancestor restoration and stale-entry protection", () => {
    const result = renderProjectHtmlDocument(project(), { projectSite: { uiLocale: "en", informationArchitecture: {}, siteNavigation: navigation() } });
    const shell = result.files.find(file => file.path === "index.html")!.contents;
    for (const match of shell.matchAll(/<script>([\s\S]*?)<\/script>/gu)) expect(() => new Script(match[1]!)).not.toThrow();
    const client = result.files.find(file => file.path === "assets/hia-site-reading.js")!.contents;
    expect(() => new Script(client)).not.toThrow();
    expect(shell).toContain("revealReadingEntry");
    expect(shell).toContain("requestSequence !== readingEntrySequence");
    expect(shell).toContain("while (current && treeHost.contains(current))");
    expect(shell).toContain("if (!matchMedia('(max-width:800px)').matches)");
    expect(shell).toContain("if (hash) return ensureSearchIndex()");
    expect(shell).toContain("contentHost?.querySelector(':scope > .hia-project-load-error')?.remove()");
    expect(client).toContain("document.querySelector('dialog[open]')");
    expect(client).toContain("event.key === 'Escape'");
    expect(client).toContain("link.addEventListener('click', event => { event.preventDefault();");
    expect(client).not.toContain("location.hash =");
  });
  it("provides the confirmed reading frame, responsive directories and actual section anchors", () => {
    const result = renderProjectHtmlDocument(project(), { projectSite: { uiLocale: "en", informationArchitecture: {}, siteNavigation: navigation() } });
    const page = result.files.find(file => file.path === "index.html")!.contents;
    expect(page).toContain('class="hia-site-directory"');
    expect(page).toContain('data-hia-reading-outline');
    expect(page).toContain('<div data-hia-project-content>');
    expect(page).not.toMatch(/<main[^>]*data-hia-project-content/u);
    expect(page).toContain('data-hia-reading-dialog="search"');
    expect(page).toContain('data-hia-reading-dialog="settings"');
    expect(result.files.filter(file => file.path === "assets/hia-site-reading.js")).toHaveLength(1);
    const staticPage = result.files.find(file => file.path.startsWith("pages/en/") && !file.path.endsWith("index.html"))!.contents;
    expect(staticPage).toContain('href="#entry:one--declaration"');
    expect(staticPage).toContain('id="entry:one--declaration"');
  });

  it("keeps source viewers script-free while providing context, honest provenance and the original line target", () => {
    const result = renderProjectHtmlDocument(project(), { projectSite: { uiLocale: "en", informationArchitecture: {}, siteNavigation: navigation() } });
    const source = result.files.find(file => file.path.startsWith("sources/") && file.path.endsWith(".html"))!.contents;
    expect(source).toContain('data-hia-source-boundary');
    expect(source).toContain('class="hia-site-directory"');
    expect(source).toContain('data-hia-reading-outline');
    expect(source).toContain('id="L18"');
    expect(source).toContain('default-src \'none\'');
    expect(source).not.toContain("<script");
    expect(source).toContain("../pages/en/");
    expect(source).toContain("one");
    const style = result.files.find(file => file.path === "assets/hia-site-navigation.css")!.contents;
    expect(style).toContain("background:var(--hia-surface);color:var(--hia-text)");
    expect(style).toContain('[data-hia-source-state="denied"] [data-hia-source-fetch-status]');
    expect(style).toContain('[data-hia-source-state]:not([data-hia-source-state="ready"]) .hia-source-code{display:none}');
  });

  it("uses readable bilingual API field labels without losing field identities or prose", () => {
    const model = JSON.parse(readFileSync(new URL("../../../fixtures/basic.hia.json", import.meta.url), "utf8")).symbols[0].i18n;
    const field = model.fields.description;
    model.fields = Object.fromEntries(Object.entries({ summary: ["Main summary", "主要摘要"], remarks: ["Important note", "重要备注"], "parameters.value.summary": ["Input value", "输入值"], "params.label.summary": ["Label parameter", "标签参数"], "typeParams.T.summary": ["Type argument", "类型参数说明"], "returns.summary": ["Result explanation", "结果说明"], returns: ["Returned value", "返回值"] }).map(([fieldPath, values]) => [fieldPath, { ...field, fieldPath, defaultText: values[1], localizedText: { en: values[0], "zh-CN": values[1] } }]));
    const input = { ...project(), entries: [{ ...project().entries[0]!, i18n: model }] };
    const result = renderProjectHtmlDocument(input, { projectSite: { uiLocale: "en", informationArchitecture: {}, siteNavigation: navigation() } });
    const fragment = result.files.find(file => file.path.startsWith("entries/"))!.contents;
    expect(fragment).toContain('data-hia-i18n-field="parameters.value.summary"');
    expect(fragment).toContain('data-hia-ui-message="site.field.parameters"');
    expect(fragment).toContain('data-hia-ui-message="site.field.typeparameters"');
    expect(fragment).toContain('data-hia-ui-message="site.field.returns"');
    expect(fragment).not.toContain("<code>params.label.summary</code>");
    expect(fragment).not.toContain("<dt>parameters.value.summary</dt>");
    expect(fragment).toContain("Important note");
    expect(fragment).toContain("重要备注");
    expect(fragment).toContain('class="hia-site-field-table"');
    expect(fragment).toContain('<th scope="col"><span data-hia-ui-message="site.field.name">Name</span></th>');
    expect(fragment.match(/data-hia-reading-section="parameters"/gu)).toHaveLength(1);
    expect(fragment).toContain('<td><code>value</code></td>');
    expect(fragment).toContain('<td><code>label</code></td>');
    expect(fragment.indexOf('data-hia-topic-section="declaration"')).toBeLessThan(fragment.indexOf('data-hia-i18n-field="parameters.value.summary"'));
  });

  it("omits runtime-only header payloads and unavailable controls on static/source pages", () => {
    const result = renderProjectHtmlDocument(project(), { projectSite: { uiLocale: "en", informationArchitecture: {}, siteNavigation: navigation() } });
    const page = result.files.find(file => file.path.startsWith("sources/") && file.path.endsWith(".html"))!.contents;
    const header = page.match(/<header class="hia-site-header">[\s\S]*?<\/header>/u)![0];
    expect(header).not.toContain("data-hia-site-hrefs");
    expect(header).not.toContain("data-hia-reading-dialog");
    expect(header).toContain('href="/product/docs/en/"');
    expect(page).toContain('class="hia-site-source-mobile-directory"');
    expect(page).not.toContain('class="hia-site-source-mobile-directory" open');
  });

  it("preserves explicit host color tokens and build theme defaults in the adopted frame", () => {
    const result = renderProjectHtmlDocument(project(), { theme: { colors: { canvas: "#123456", surface: "#abcdef", text: "#010203", codeBackground: "#345678" } }, projectSite: { uiLocale: "en", informationArchitecture: {}, theme: { skinId: "portal.graphite", scheme: "dark" }, siteNavigation: navigation() } });
    const page = result.files.find(file => file.path === "index.html")!.contents;
    expect(page).toContain("--hia-bg:var(--hia-color-canvas)");
    expect(page).toContain("--hia-text:var(--hia-color-text)");
    expect(page).toContain("background:var(--hia-code-bg)");
    expect(page).toContain('data-hia-reading-initial-scheme="dark"');
    expect(page).toContain('data-hia-reading-initial-skin="portal.graphite"');
  });

  it("accepts explicit same-origin deployment targets and anchors", () => {
    const input = navigation();
    input.primaryNavigation[0]!.hrefByLocale.en += "#examples";
    expect(() => assertDocumentationSiteNavigation(input)).not.toThrow();
  });

  it.each(["javascript:alert(1)", "https://foreign.invalid/product/", "//foreign.invalid/product/", "C:\\private", "/product-other/", "/product/../private", "/product/%2e%2e/private", "/product/%252e%252e/private", "/product/%2f%2fforeign.invalid", "/product/\\private", "/product/docs/?secret=1", "/product/a\nb"])("rejects an unsafe target %s", target => {
    const input = navigation();
    input.localeTargets.en = target;
    expect(() => assertDocumentationSiteNavigation(input)).toThrow(/HIA_SITE_NAVIGATION_INVALID/u);
  });

  it.each([
    (input: any) => { input.contractVersion = "1.0.0"; },
    (input: any) => { delete input.documentationTabs[0].labelByLocale.en; },
    (input: any) => { input.localeTargets.en = ""; },
    (input: any) => { input.documentationVersion.entries[0].version = "2.0.0"; },
    (input: any) => { input.documentationVersion.entries.push(input.documentationVersion.entries[0]); },
    (input: any) => { input.primaryNavigation.push(input.primaryNavigation[0]); },
    (input: any) => { input.activeTabId = "missing"; },
    (input: any) => { input.source = { localRoot: "private" }; },
    (input: any) => { input.brand.title = " "; },
    (input: any) => { input.brand.title = '<img src="invalid">'; },
    (input: any) => { input.documentationTabs[0].labelByLocale.en = "{injected}"; },
    (input: any) => { input.documentationVersion.status = "released"; },
    (input: any) => { input.deploymentBase = "/product"; }
  ])("rejects malformed, incomplete, conflicting or additional data", mutate => {
    const input = navigation();
    mutate(input);
    expect(() => assertDocumentationSiteNavigation(input)).toThrow(/HIA_SITE_NAVIGATION_INVALID/u);
  });

  it("rejects before invoking a writer", async () => {
    const input = navigation();
    input.localeTargets.en = "/private/";
    const writes: string[] = [];
    await expect(renderProjectHtmlDocumentToWriter(project(), async file => { writes.push(file.path); }, { projectSite: { siteNavigation: input, uiLocale: "en" } })).rejects.toThrow(/HIA_SITE_NAVIGATION_INVALID/u);
    expect(writes).toEqual([]);
  });

  it("rejects getters, hidden fields, symbols and custom array iterators without executing them", () => {
    let reads = 0;
    const input = navigation();
    Object.defineProperty(input.brand, "title", { enumerable: true, get() { reads += 1; return "Not JSON data"; } });
    expect(() => assertDocumentationSiteNavigation(input)).toThrow(/HIA_SITE_NAVIGATION_INVALID/u);
    expect(reads).toBe(0);
    const indexed = navigation();
    Object.defineProperty(indexed.primaryNavigation, "0", { enumerable: true, get() { reads += 1; return {}; } });
    expect(() => assertDocumentationSiteNavigation(indexed)).toThrow(/HIA_SITE_NAVIGATION_INVALID/u);
    expect(reads).toBe(0);
    const hidden = navigation();
    Object.defineProperty(hidden, "hidden", { value: "private", enumerable: false });
    expect(() => assertDocumentationSiteNavigation(hidden)).toThrow(/HIA_SITE_NAVIGATION_INVALID/u);
    const symbol = navigation();
    Object.defineProperty(symbol.primaryNavigation, Symbol.iterator, { value() { reads += 1; return []; } });
    expect(() => assertDocumentationSiteNavigation(symbol)).toThrow(/HIA_SITE_NAVIGATION_INVALID/u);
    expect(reads).toBe(0);
  });

  it.each(["zh-CN", "en"] as const)("renders shared navigation on every complete document in %s without touching source bytes or fragments", locale => {
    const result = renderProjectHtmlDocument(project(), { projectSite: { uiLocale: locale, informationArchitecture: {}, siteNavigation: navigation() } });
    const documents = result.files.filter(file => file.contents.startsWith("<!doctype html>"));
    expect(documents.some(file => file.path.startsWith("sources/"))).toBe(true);
    expect(documents.some(file => file.path.startsWith("pages/zh-CN/"))).toBe(true);
    for (const file of documents) {
      const language = file.path.startsWith("pages/zh-CN/") ? "zh-CN" : file.path.startsWith("pages/en/") ? "en" : locale;
      expect(file.contents).toContain("data-hia-site-navigation");
      expect(file.contents).toContain("Public &amp; &quot;Brand&quot;");
      expect(file.contents).toContain(language === "en" ? ">Code reference</span>" : ">代码文档</span>");
      expect(file.contents.match(/<header class="hia-site-header"/gu)).toHaveLength(1);
      expect(file.contents).toContain('id="hia-site-main"');
    }
    expect(result.files.filter(file => file.path === "assets/hia-site-navigation.css")).toHaveLength(1);
    expect(result.files.find(file => file.path.startsWith("sources/") && file.path.endsWith(".txt"))!.contents).toBe("export function one() {}");
    expect(result.files.find(file => file.path.startsWith("entries/"))!.contents).not.toContain("data-hia-site-navigation");
    expect(result.files.find(file => file.path.startsWith("sources/") && file.path.endsWith(".html"))!.contents).toContain('id="L18"');
    const report = JSON.parse(result.files.find(file => file.path === "documentation-ui-locale-completeness.json")!.contents);
    expect(report.status).toBe("complete");
    expect(JSON.stringify(report)).toContain("site.brand.title");
    expect(JSON.stringify(report)).not.toContain('Public & \\"Brand');
  });

  it("requires explicit UI locale and preserves the output of callers without navigation", () => {
    expect(() => renderProjectHtmlDocument(project(), { projectSite: { siteNavigation: navigation() } })).toThrow(/HIA_SITE_NAVIGATION_UI_LOCALE_REQUIRED/u);
    const result = renderProjectHtmlDocument(project());
    expect(result.files.some(file => file.path === "assets/hia-site-navigation.css")).toBe(false);
    expect(result.files.find(file => file.path === "index.html")!.contents).not.toContain("data-hia-site-navigation");
    expect(result.files.find(file => file.path === "index.html")!.contents).not.toContain("data-hia-site-hrefs");
  });

  it("snapshots navigation before writer callbacks and keeps lazy source-viewer construction single-pass", async () => {
    const input = navigation();
    const output: string[] = [];
    await renderProjectHtmlDocumentToWriter(project(), async file => {
      input.brand.title = "Mutated after validation";
      output.push(file.contents);
    }, { projectSite: { uiLocale: "en", siteNavigation: input } });
    expect(output.join("")).not.toContain("Mutated after validation");
    let reads = 0;
    const files = [...withSiteNavigation([{ path: "sources/one.html", role: "asset", contentType: "text/html", get contents() { reads += 1; return '<!doctype html><html lang="en"><head></head><body><main></main></body></html>'; } }], navigation(), "en")];
    expect(files).toHaveLength(2);
    expect(reads).toBe(1);
  });

  it.each(["split-site", "single-page"] as const)("reports actual navigation-only scope for legacy %s callers", layout => {
    const result = renderProjectHtmlDocument(project(), { projectSite: { layout, uiLocale: "en", siteNavigation: navigation() } });
    const report = JSON.parse(result.files.find(file => file.path === "documentation-ui-locale-completeness.json")!.contents);
    expect(report.profileId).toBe("portal.sitenavigation");
    expect(report.status).toBe("complete");
    expect(report.messages.every((record: { messageId: string }) => record.messageId.startsWith("site."))).toBe(true);
  });

  it("prevents relabeling a full Portal evaluation as navigation-only", () => {
    expect(() => createDocumentationPortalUiLocaleAdoption({ contentLocale: "en", contentLocales: ["en"], defaultUiLocale: "en", profileId: "portal.sitenavigation", surfaceId: "portal.sitenavigation", siteNavigation: navigation() })).toThrow(/HIA_PORTAL_UI_LOCALE_SURFACE_UNSUPPORTED/u);
  });
});
