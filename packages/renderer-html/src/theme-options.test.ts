/**
 * @file
 * @lang zh-CN 核对品牌颜色在所有HTML路径中的消费、旧选项兼容和非法输入拒绝。
 * @lang en Checks brand-color consumption across HTML routes, legacy-option compatibility and invalid-input rejection.
 */
import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument } from "@hia-doc/core";
import { DEFAULT_THEME_CSS } from "@hia-doc/theme-default";
import { renderHtmlDocument, renderProjectHtmlDocument, type RenderHtmlOptions } from "./index.js";

/** @lang zh-CN 以同一公共合成条目运行普通/项目split/single三条路由。 @lang en Runs document/project split/single routes over the same public synthetic entry. */
function render(route: string, options: RenderHtmlOptions = {}) {
  const document = createBasicFixtureDocument();
  return route === "document" ? renderHtmlDocument(document, options) : renderProjectHtmlDocument({ project: { name: "Brand sample" }, entries: [{ id: "method.read", kind: "dotnet-method", name: "Read", view: "dotnet" }] }, { ...options, projectSite: { ...options.projectSite, layout: route === "project-single" ? "single-page" : "split-site" } });
}

describe("shared renderer theme options", () => {
  it.each(["document", "project-single", "project-split"])("consumes safe brand colors directly: %s", (route) => {
    const result = render(route, { theme: { colors: { accent: "#0f4f82" }, skinId: "portal.graphite", scheme: "light" } });
    expect(result.files.find((file) => file.path === "assets/hia-default.css")?.contents).toContain("--hia-color-accent: #0f4f82;");
    expect(result.files.find((file) => file.path === "index.html")?.contents).toContain('data-hia-skin="portal.graphite"');
    expect(result.files[0]?.contents).toContain('data-hia-scheme="light"');
    expect(render(route).files.find((file) => file.path === "assets/hia-default.css")?.contents).toBe(DEFAULT_THEME_CSS);
  });

  it.each(["document", "project-single", "project-split"])("rejects invalid colors even when assets are external or omitted: %s", (route) => {
    for (const options of [{}, { includeThemeAssets: false }, { themeAssets: { mode: "external" as const, baseUrl: "../../assets/" } }]) expect(() => render(route, { ...options, theme: { colors: { accent: "url(evil)" } } })).toThrow(/HIA_THEME_COLORS_INVALID/u);
  });

  it("gives shared options per-field precedence over legacy theme selection", () => {
    const result = render("document", { theme: { scheme: "light" }, projectSite: { theme: { skinId: "portal.graphite", scheme: "dark" } } });
    expect(result.files[0]?.contents).toContain('data-hia-skin="portal.graphite"');
    expect(result.files[0]?.contents).toContain('data-hia-scheme="light"');
  });

  it("rejects unsupported skin/scheme values in documents as well as project sites", () => {
    expect(() => render("document", { theme: { skinId: "unknown" } } as never)).toThrow(/HIA_PORTAL_THEME_SELECTION_INVALID/u);
    expect(() => render("project-split", { theme: { scheme: "unknown" } } as never)).toThrow(/HIA_PORTAL_THEME_SELECTION_INVALID/u);
  });
});
