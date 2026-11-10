/**
 * @file
 * @lang zh-CN 正文来源语言反例，区分选择语言、实际回退和未知来源，不把隐藏块当成当前显示。
 * @lang en Prose-language regressions separating selection, actual fallback, and unknown provenance without treating hidden blocks as visible prose.
 */
import { describe, expect, it } from "vitest";
import { createBasicFixtureDocument, type HiaI18nModel } from "@hia-doc/core";
import { renderHtmlDocument, renderProjectHtmlDocument, type RenderProjectHtmlInput } from "./index.js";

/** @lang zh-CN 建立单一声明的原文夹具，直接项目调用只采用显式的来源声明。 @lang en Builds one prose declaration, with direct project calls using only explicit source-language declarations. */
function fixture(sourceLocale?: string) {
  // <lang><zh-CN>复制现有合法模型的身份，空字段表示没有翻译，原工件不被改写。</zh-CN><en>Copy an existing valid model identity, using empty fields to represent absent translations without rewriting source artifacts.</en></lang>
  const document = createBasicFixtureDocument();
  const symbol = document.symbols[0]!;
  const model: HiaI18nModel | undefined = sourceLocale ? { ...symbol.i18n!, enabled: false, defaultLocale: sourceLocale, locales: [sourceLocale], fields: {} } : undefined;
  symbol.summary = "Original <safe> prose.";
  delete symbol.i18n;
  document.defaultLocale = sourceLocale ?? "en";
  document.locales = [...new Set([document.defaultLocale, "en", "zh-CN"])];
  document.symbols = [symbol];
  const project: RenderProjectHtmlInput = { project: { name: "Mixed source languages", defaultLocale: "zh-CN", locales: document.locales }, entries: [{ id: symbol.id, name: symbol.name, kind: symbol.kind, view: "js", summary: symbol.summary, ...(model ? { i18n: model } : {}) }] };
  return { document, project };
}

/** @lang zh-CN 正常公开入口选择条目正文，避免项目索引或其它静态语言页替代验收对象。 @lang en Selects entry prose through public rendering APIs, excluding indexes and unrelated static-language pages. */
function render(route: string, locale: string, input: ReturnType<typeof fixture>) {
  const explicit = route.includes("explicit");
  const options = { locale, projectSite: { layout: route === "single" ? "single-page" as const : "split-site" as const, ...(explicit ? { uiLocale: "zh-CN" as const, informationArchitecture: { contentGrouping: "entry" as const, loadingStrategy: "lazy" as const, memberPlacement: "separate" as const } } : {}) } };
  const output = route === "document" ? renderHtmlDocument(input.document, options) : renderProjectHtmlDocument(input.project, options);
  const page = output.files.find(file => route === "document" || route === "single" ? file.path === "index.html" : file.path.startsWith(route.includes("noscript") ? `pages/${locale}/` : "entries/") && file.path.endsWith(".html") && !file.path.endsWith("/index.html"));
  expect(page).toBeDefined();
  return page!.contents;
}

/** @lang zh-CN 提取精确请求语言的段落属性及正文，保留lang空串与隐藏状态供断言。 @lang en Extracts exact requested-locale paragraph attributes and text, preserving empty lang and hidden state for assertions. */
function paragraph(html: string, locale: string) {
  const match = [...html.matchAll(/<p class="hia-localized-text"([^>]*)>([\s\S]*?)<\/p>/gu)].find(item => item[1]!.includes(`data-hia-locale="${locale}"`));
  expect(match).toBeDefined();
  return { attributes: match![1]!, body: match![2]!, lang: /\slang="([^"]*)"/u.exec(match![1]!)?.[1] };
}

describe("prose source language", () => {
  for (const route of ["document", "single", "split", "explicit", "explicit-noscript"]) {
    for (const locale of ["en", "zh-CN"]) {
      it(`preserves declared bare-prose language through ${route}/${locale}`, () => {
        const input = fixture("en");
        const before = JSON.stringify(input);
        const prose = paragraph(render(route, locale, input), locale);
        expect(prose.lang).toBe("en");
        expect(prose.body).toContain("Original &lt;safe&gt; prose.");
        expect(prose.attributes.includes('data-hia-fallback-from="en"')).toBe(locale !== "en");
        expect(prose.body.includes("fallback: en")).toBe(locale !== "en");
        expect(JSON.stringify(input)).toBe(before);
      });
    }
  }

  for (const route of ["single", "split", "explicit", "explicit-noscript"]) {
    it(`keeps unknown bare-prose language explicit through ${route}`, () => {
      const prose = paragraph(render(route, "zh-CN", fixture()), "zh-CN");
      expect(prose.lang).toBe("");
      expect(prose.attributes).not.toContain("data-hia-fallback-from");
      expect(prose.body).not.toContain("fallback:");
      expect(prose.body).toContain("Original &lt;safe&gt; prose.");
    });
  }

  it("uses a nonselected declared language instead of project defaults", () => {
    expect(paragraph(render("explicit", "zh-CN", fixture("fr")), "zh-CN").lang).toBe("fr");
  });

  it("marks resolved field language while keeping requested-locale selection", () => {
    const input = fixture("en");
    // <lang><zh-CN>复用真实字段结构，只保留英文翻译，中文选择必须明确回退至英文。</zh-CN><en>Reuse an actual field structure with only English text so Chinese selection must explicitly fall back to English.</en></lang>
    const source = createBasicFixtureDocument().symbols[0]!.i18n!.fields.description!;
    input.project.entries[0]!.i18n!.fields.description = { ...source, defaultLocale: "en", defaultText: "Field prose.", localizedText: { en: "Field prose." } };
    const prose = paragraph(render("explicit", "zh-CN", input), "zh-CN");
    expect(prose.lang).toBe("en");
    expect(prose.attributes).toContain('data-hia-fallback-from="en"');
    expect(prose.attributes).not.toMatch(/\shidden(?:\s|$)/u);
    expect(prose.body).toContain("Field prose.");
  });
});
