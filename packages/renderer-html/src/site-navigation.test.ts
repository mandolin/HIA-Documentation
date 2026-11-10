/**
 * @file
 * @lang zh-CN 站点导航的版本、同源部署边界、双语及跨输出回归。
 * @lang en Version, same-origin deployment, bilingual, and cross-output navigation regressions.
 */
import { describe, expect, it } from "vitest";
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
