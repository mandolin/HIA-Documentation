/**
 * @file
 * @lang zh-CN 验证显式共享资产唯一所有权及跨页面深度URL，不写文件或读取业务仓。
 * @lang en Verifies explicit shared-asset ownership and URLs across page depths without file writes or business-repository reads.
 */
import { describe, expect, it } from "vitest";
import { relocateDefaultThemeAssets, renderThemeAssets } from "./theme-assets.js";
import type { RenderedHtmlFile } from "./index.js";

/** @lang zh-CN 合成renderer规范HTML资源引用，正文包含不会被重定位的文本。 @lang en Synthesizes canonical renderer asset references with prose that must not be relocated. */
function page(path: string, prefix = ""): RenderedHtmlFile {
  return { path, role: "entry", contentType: "text/html; charset=utf-8", contents: `<link href="${prefix}assets/hia-default.css"><script src="${prefix}assets/hia-default.js"></script><a href="assets/source.json">assets/hia-default.css</a>` };
}

describe("shared theme asset routing", () => {
  it("retains local defaults and does not mutate inputs", () => {
    const files = [page("index.html"), ...renderThemeAssets()];
    const before = JSON.stringify(files);
    expect(relocateDefaultThemeAssets(files)).toEqual(files);
    expect(JSON.stringify(files)).toBe(before);
  });

  it.each(["index.html", "entries/member.html", "views/dotnet/type/index.html"])("resolves relative external assets at %s depth", (path) => {
    const depth = "../".repeat(path.split("/").length - 1);
    const original = [page(path, depth), ...renderThemeAssets()];
    const actual = relocateDefaultThemeAssets(original, { mode: "external", baseUrl: "../../assets/" });
    expect(actual).toHaveLength(1);
    expect(actual[0]?.contents).toContain(`href="${depth}../../assets/hia-default.css"`);
    expect(actual[0]?.contents).toContain(`src="${depth}../../assets/hia-default.js"`);
    expect(actual[0]?.contents).toContain('href="assets/source.json">assets/hia-default.css');
    expect(original).toHaveLength(3);
  });

  it("keeps root-relative paths and unrelated assets", () => {
    const source: RenderedHtmlFile = { path: "assets/source.json", contents: "{}", contentType: "application/json", role: "asset" };
    const actual = relocateDefaultThemeAssets([page("entries/member.html", "../"), source, ...renderThemeAssets()], { mode: "external", baseUrl: "/docs/shared" });
    expect(actual[0]?.contents).toContain('href="/docs/shared/hia-default.css"');
    expect(actual[1]).toBe(source);
  });

  it("encodes HTML entities instead of changing URL origin during parsing", () => {
    const actual = relocateDefaultThemeAssets([page("index.html")], { mode: "external", baseUrl: "&sol;&sol;evil.test/" });
    expect(actual[0]?.contents).toContain('href="&amp;sol;&amp;sol;evil.test/hia-default.css"');
  });

  it.each(["https://evil.test/assets", "//evil.test/assets", "data:text/css,x", "../assets?x", "../assets#x", "..\\assets", "\nassets", '<x>']) ("rejects unsafe external URL %j", (baseUrl) => {
    expect(() => relocateDefaultThemeAssets([page("index.html")], { mode: "external", baseUrl })).toThrow(/HIA_THEME_ASSETS_INVALID/u);
  });

  it("rejects ownership configurations without an explicit external directory", () => {
    expect(() => relocateDefaultThemeAssets([], { mode: "external" })).toThrow(/HIA_THEME_ASSETS_INVALID/u);
    expect(() => relocateDefaultThemeAssets([], { baseUrl: "../assets" })).toThrow(/HIA_THEME_ASSETS_INVALID/u);
  });

  it("projects exactly one asset pair for fifteen independent halves", () => {
    const files = renderThemeAssets({ colors: { accent: "#0f4f82" } });
    for (let half = 0; half < 15; half += 1) {
      const output = relocateDefaultThemeAssets([page("index.html"), page("entries/member.html", "../"), ...renderThemeAssets()], { mode: "external", baseUrl: "../../assets" });
      expect(output.filter((file) => file.role === "asset")).toEqual([]);
      files.push(...output.map((file) => ({ ...file, path: `half-${half}/zh-CN/${file.path}` })));
    }
    expect(files.filter((file) => file.path.endsWith("hia-default.css"))).toHaveLength(1);
    expect(files.filter((file) => file.path.endsWith("hia-default.js"))).toHaveLength(1);
  });
});
