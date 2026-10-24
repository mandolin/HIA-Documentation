/**
 * @file
 * @lang zh-CN 完整API正文的跨路径反例，逐字段核当前语言正文，不接受搜索属性替代可读内容。
 * @lang en Cross-route counterexamples for complete API prose, checking current-locale field bodies rather than search attributes.
 */
import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument, type HiaI18nField } from "@hia-doc/core";
import { renderHtmlDocument, renderProjectHtmlDocument, type RenderProjectHtmlInput, type RenderHtmlOptions } from "./index.js";

/** @lang zh-CN 创建包含实际.NET字段与未知扩展的公共合成工件，不依赖卫星仓或业务源码。 @lang en Creates a public synthetic artifact with actual .NET fields and unknown extensions, independent of satellite repositories or business source. */
function fixture() {
  const document = createBasicFixtureDocument();
  const symbol = document.symbols[0]!;
  const fieldBase = structuredClone(symbol.i18n!.fields.description!);
  const keys = ["description", "summary", "remarks", "params.id.summary", "parameters.id.summary", "typeParams.T.summary", "typeParameters.T.summary", "returns.summary", "returns", "exceptions.T:System.ArgumentException.summary", "vendor.custom.<note>"];
  const fields: Record<string, HiaI18nField> = {};
  for (const key of keys) fields[key] = { ...fieldBase, fieldPath: key, defaultLocale: "en", defaultText: `${key} English <safe>.`, localizedText: { en: `${key} English <safe>.`, "zh-CN": `${key} 中文 <安全>。` } };
  symbol.id = "M:Content.Reader.Find(System.Int32)";
  symbol.name = "Content.Reader.Find";
  symbol.kind = "dotnet-method";
  symbol.signature = "public Task<User?> Content.Reader.Find(int id)";
  symbol.i18n = { ...symbol.i18n!, defaultLocale: "en", locales: ["en", "zh-CN"], fields };
  document.symbols = [symbol];
  document.defaultLocale = "en";
  document.locales = ["en", "zh-CN"];
  const project: RenderProjectHtmlInput = { project: { name: "Content API", defaultLocale: "en", locales: ["en", "zh-CN"] }, entries: [{ id: symbol.id, symbolId: symbol.id, name: symbol.name, kind: symbol.kind, view: "dotnet", signature: symbol.signature, summary: symbol.summary, i18n: symbol.i18n }] };
  return { document, symbol, project, keys };
}

/** @lang zh-CN 仅解析受控formatter的字段容器，排除属性、脚本和其它语言的隐藏内容。 @lang en Parses only controlled formatter field containers, excluding attributes, scripts and hidden content in other languages. */
function fields(html: string, locale: string) {
  return [...html.matchAll(/<div class="hia-localized-set" data-hia-i18n-field="([^"]*)">([\s\S]*?)<\/div>/gu)].map((match) => ({ key: match[1], bodies: [...match[2]!.matchAll(/<p class="hia-localized-text"([^>]*)>([\s\S]*?)<\/p>/gu)].filter((paragraph) => paragraph[1]!.includes(`data-hia-locale="${locale}"`) && !/\shidden(?:\s|$)/u.test(paragraph[1]!)).map((paragraph) => paragraph[2]) }));
}

/** @lang zh-CN 每条路由选择实际可读页面而非navigation/search索引。 @lang en Selects actual readable pages for each route instead of navigation/search indexes. */
function render(route: string, locale: string, input: ReturnType<typeof fixture>) {
  const explicit = route.includes("explicit");
  const options: RenderHtmlOptions = { locale, projectSite: { layout: route === "project-single" ? "single-page" : "split-site", ...(explicit ? { uiLocale: locale as "en" | "zh-CN", informationArchitecture: { contentGrouping: "entry", loadingStrategy: "lazy", memberPlacement: "separate" } } : {}) } };
  const result = route === "document" ? renderHtmlDocument(input.document, options) : renderProjectHtmlDocument(input.project, options);
  // <lang><zh-CN>显式IA还生成pages/en/index.html等索引，索引不能冒充成员正文页。</zh-CN><en>Explicit IA also emits indexes such as pages/en/index.html, which cannot stand in for member prose pages.</en></lang>
  const page = result.files.find((file) => route === "document" || route === "project-single" ? file.path === "index.html" : file.path.startsWith(route.includes("noscript") ? "pages/" : "entries/") && !file.path.endsWith("/index.html") && file.path.endsWith(".html"));
  expect(page).toBeDefined();
  return page!.contents;
}

describe("complete localized API entries", () => {
  for (const route of ["document", "project-single", "project-split", "project-noscript", "project-explicit", "project-explicit-noscript"]) {
    for (const locale of ["en", "zh-CN"]) it(`keeps every field in visible prose: ${route}/${locale}`, () => {
      const input = fixture();
      const before = JSON.stringify(input);
      const html = render(route, locale, input);
      const actual = fields(html, locale);
      for (const key of input.keys) {
        const escapedKey = key.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
        expect(actual.filter((field) => field.key === escapedKey), key).toHaveLength(1);
        expect(actual.find((field) => field.key === escapedKey)?.bodies[0], key).toContain(locale === "en" ? "English &lt;safe&gt;." : "中文 &lt;安全&gt;。");
      }
      expect(html).not.toContain("<safe>");
      expect(html).toContain("Task&lt;User?&gt;");
      expect(JSON.stringify(input)).toBe(before);
    });
  }

  it("uses summary as the primary field exactly once when description is absent", () => {
    const input = fixture();
    delete input.symbol.i18n!.fields.description;
    for (const route of ["document", "project-split", "project-explicit"]) {
      const actual = fields(render(route, "en", input), "en");
      expect(actual.filter((field) => field.key === "summary")).toHaveLength(1);
      expect(actual.some((field) => field.key === "description")).toBe(false);
    }
  });

  it("marks fallback text while preserving every nonempty field", () => {
    const input = fixture();
    delete input.symbol.i18n!.fields.remarks!.localizedText!["zh-CN"];
    const html = render("project-split", "zh-CN", input);
    const remarks = fields(html, "zh-CN").find((field) => field.key === "remarks");
    expect(remarks?.bodies[0]).toContain("remarks English &lt;safe&gt;.");
    expect(html).toContain('data-hia-fallback-from="en"');
  });

  it("omits empty field sections and never inserts raw markup", () => {
    const input = fixture();
    input.symbol.i18n!.fields = { empty: { ...input.symbol.i18n!.fields.remarks!, fieldPath: "empty", defaultText: "", localizedText: {} } };
    for (const route of ["document", "project-split", "project-explicit"]) expect(render(route, "en", input)).not.toContain('class="hia-i18n-fields"');
  });
});
