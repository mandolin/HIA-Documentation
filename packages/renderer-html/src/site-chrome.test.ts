/**
 * @file
 * @lang zh-CN 独立生成器共享入口的纯函数、显式路由、错误及资产回归。
 * @lang en Pure-function, explicit-route, refusal, and asset regressions for independent generators.
 */
import { describe, expect, it } from "vitest";
import { Script, runInNewContext } from "node:vm";
import { createSiteChrome, type SiteChromePage } from "./site-chrome.js";
import { createGeneratedSiteNavigation } from "../../../site/src/lib/generated-navigation.mjs";

/**
 * @lang zh-CN 当前真实双语页面上下文。
 * @lang en Actual bilingual page context.
 */
function page(): SiteChromePage {
  return {
    role: "entry", outputPath: "api/greet.zh-CN.html", uiLocale: "zh-CN",
    localePages: { "zh-CN": "api/greet.zh-CN.html", en: "api/greet.en.html" },
    title: "greet <public>", bodyHtml: '<article id="greet"><h1>greet</h1><section id="parameters"><h2>参数</h2></section></article>',
    directoryHtml: '<a href="greet.zh-CN.html#greet">greet</a>',
    sections: [{ id: "parameters", label: "参数 <required>" }]
  };
}

describe("public site-chrome shared entry", () => {
  it("preserves only real native fragments on actual locale counterparts without accumulating stale anchors", () => {
    // <lang><zh-CN>执行实际共享资产，核真实符号、片段变化、显式目标、非法编码及根恢复。</zh-CN><en>Execute the actual shared asset for real symbols, fragment changes, explicit targets, malformed encoding and root restoration.</en></lang>
    const chrome = createSiteChrome({ navigation: createGeneratedSiteNavigation(), entries: [] });
    const source = chrome.assets[1]!.contents.match(/function synchronizeNativeLocaleFragments\(\) \{[\s\S]*?\n    \}/u)?.[0];
    expect(source).toBeDefined();
    const link = { dataset: {} as Record<string, string>, href: "https://public.example/api/greet.en.html", getAttribute() { return "greet.en.html"; } };
    const explicit = { dataset: {} as Record<string, string>, href: "https://public.example/api/greet.en.html#fixed", getAttribute() { return "greet.en.html#fixed"; } };
    const current = { dataset: {} as Record<string, string>, href: "https://public.example/api/greet.zh-CN.html", getAttribute() { return ""; } };
    const location = { hash: "#greet" };
    const context = { URL, decodeURIComponent, location, document: { baseURI: "https://public.example/api/greet.zh-CN.html", querySelectorAll() { return [link, explicit, current]; }, getElementById(id: string) { return ["greet", "parameters"].includes(id) ? {} : null; } } };
    const synchronize = runInNewContext(`(${source})`, context);
    synchronize();
    expect(link.href).toBe("https://public.example/api/greet.en.html#greet");
    expect(explicit.href).toBe("https://public.example/api/greet.en.html#fixed");
    expect(current.href).toBe("https://public.example/api/greet.zh-CN.html#greet");
    location.hash = "#parameters";
    synchronize();
    expect(link.href).toBe("https://public.example/api/greet.en.html#parameters");
    for (const fragment of ["#missing", "#%ZZ", ""]) {
      location.hash = fragment;
      synchronize();
      expect(link.href).toBe("https://public.example/api/greet.en.html");
    }
  });

  it("renders explicit nested routes, escaped labels, native landmarks and one shared asset set", () => {
    const chrome = createSiteChrome({ navigation: createGeneratedSiteNavigation(), entries: [] });
    const html = chrome.renderPage(page());
    expect(html).toContain('data-hia-site-navigation');
    expect(html).toContain('href="../api/greet.en.html"');
    expect(html).toContain('href="" data-hia-site-current aria-current="true"');
    expect(html).toContain('href="../assets/hia-site-navigation.css"');
    expect(html).toContain('<title>greet &lt;public&gt;</title>');
    expect(html).toContain('参数 &lt;required&gt;');
    expect(html).toContain('id="hia-site-main"');
    expect(html).toContain('data-hia-reading-static');
    expect(chrome.assets.map(file => file.path)).toEqual([
      "assets/hia-site-navigation.css", "assets/hia-site-reading.js", "assets/hia-site-search.json"
    ]);
    expect(() => new Script(chrome.assets[1]!.contents)).not.toThrow();
  });

  it("snapshots admitted navigation and entry data independently of caller mutation", () => {
    const navigation = createGeneratedSiteNavigation();
    const entries = [{ id: "greet", name: "greet", kind: "function", page: "api/greet.html#greet", searchText: "问候 greeting" }];
    const chrome = createSiteChrome({ navigation, entries });
    navigation.brand.title = "Changed";
    entries[0]!.name = "Changed";
    expect(chrome.renderPage(page())).toContain("HIA-Documentation-Sys");
    expect(chrome.assets[2]!.contents).toContain("greet");
    expect(chrome.assets[2]!.contents).not.toContain("Changed");
  });

  it("retains native module fragment colons without admitting external schemes in paths", () => {
    const target = "module-theme.html#module-module:theme-4fdfe5845b";
    const chrome = createSiteChrome({ navigation: createGeneratedSiteNavigation(), entries: [{ id: "module-module:theme-4fdfe5845b", name: "module:theme", kind: "module", page: target, searchText: "theme" }] });
    expect(chrome.assets[2]!.contents).toContain(target);
    expect(() => createSiteChrome({ navigation: createGeneratedSiteNavigation(), entries: [{ id: "invalid", name: "invalid", kind: "module", page: "https://private.invalid/page#module:theme", searchText: "invalid" }] })).toThrow("HIA_SITE_CHROME_INVALID");
  });

  it.each(["../outside.html", "/outside.html", "https://private.invalid/", "a/%2e%2e/out.html", "a\\out.html", "a.html?secret=1"])("rejects unsafe output %s with a fixed public error", outputPath => {
    const chrome = createSiteChrome({ navigation: createGeneratedSiteNavigation(), entries: [] });
    expect(() => chrome.renderPage({ ...page(), outputPath })).toThrow("HIA_SITE_CHROME_INVALID");
    try { chrome.renderPage({ ...page(), outputPath }); } catch (error) { expect(String(error)).not.toContain(outputPath); }
  });

  it("rejects unsupported locale, duplicate identity, invalid navigation and inconsistent section anchors", () => {
    const navigation = createGeneratedSiteNavigation();
    const chrome = createSiteChrome({ navigation, entries: [] });
    expect(() => chrome.renderPage({ ...page(), uiLocale: "fr" as never })).toThrow("HIA_SITE_CHROME_INVALID");
    expect(() => chrome.renderPage({ ...page(), sections: [{ id: "missing", label: "Missing" }] })).toThrow("HIA_SITE_CHROME_INVALID");
    expect(() => createSiteChrome({ navigation: { ...navigation, contractVersion: "wrong" }, entries: [] })).toThrow();
    const entry = { id: "same", name: "same", kind: "function", page: "same.html", searchText: "same" };
    expect(() => createSiteChrome({ navigation, entries: [entry, entry] })).toThrow("HIA_SITE_CHROME_INVALID");
    expect(() => createSiteChrome({ navigation, entries: new Array(1) })).toThrow("HIA_SITE_CHROME_INVALID");
    expect(() => chrome.renderPage({ ...page(), sections: null as never })).toThrow("HIA_SITE_CHROME_INVALID");
  });

  it("keeps absent counterpart disabled and source pages script-free with real anchors", () => {
    const chrome = createSiteChrome({ navigation: createGeneratedSiteNavigation(), entries: [] });
    const html = chrome.renderPage({ ...page(), role: "source", localePages: { "zh-CN": page().outputPath } });
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("<script");
    expect(html).not.toContain('data-hia-reading-dialog=');
    expect(html).toContain('href="#parameters"');
  });
});
