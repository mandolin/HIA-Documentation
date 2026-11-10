/**
 * @file
 * @lang zh-CN 已确认行号与定位范围的安全/路径/惰性生成回归，全部使用公开合成源码。
 * @lang en Security/path/lazy-generation regression coverage for confirmed line numbers/targets, using public synthetic source only.
 */
import { describe, expect, it } from "vitest";
import { renderProjectHtmlDocument, type RenderProjectHtmlInput } from "./index.js";
import { createPortalPresentationBundle } from "./presentation-profile.js";
import { renderPublicSourcePage, renderSourceLines } from "./source-lines.js";

/** @lang zh-CN 提供明确行号与公开正文，不带外部定位。 @lang en Supplies explicit line numbers and a public body without external locators. */
function fixture(): RenderProjectHtmlInput {
  return { project: { id: "synthetic:lines", name: "Source lines" }, entries: [{ id: "api:a", name: "A", kind: "dotnet-method", view: "dotnet", source: { path: "src/public.cs", range: { start: { line: 21 }, end: { line: 22 } }, preview: { content: 'return "<script>synthetic</script>";\n// 中文 😀', range: { start: { line: 21 }, end: { line: 22 } } } } }] };
}
describe("source line views", () => {
  it("shares existing page CSS without changing escaped lines, anchors or the default fragment", () => {
    // <lang><zh-CN>带特殊字符/空行的相同片段仅移除重复样式属性，语义DOM与旧默认输出逐字核同。</zh-CN><en>For identical special-character/blank-line excerpts, remove only repeated style attributes and compare semantic DOM against the legacy default byte for byte.</en></lang>
    const content = '<img src=x onerror="unsafe()"> & 中文 😀\n\nlast';
    const legacy = renderSourceLines(content, 21, true);
    const compact = renderSourceLines(content, 21, true, "stylesheet");
    expect(legacy).toContain('style="display:block;min-width:max-content"');
    expect(compact).not.toContain(' style="');
    expect(compact).toBe(legacy.replace(/ style="[^"]*"/gu, ""));
    expect(compact).toContain('id="L23"');
    expect(compact).toContain('href="#L21"');
    expect(compact).toContain('&lt;img');
    expect(renderSourceLines(content, 21, false)).toContain('style="display:block;min-width:max-content"');
    expect(renderSourceLines(content, 21, true, "unknown" as never)).toBe(legacy);
  });

  it("keeps all 400 source lines while eliminating repeated styles from standalone pages", () => {
    // <lang><zh-CN>同一400行正文和定位保留，体积门禁拒绝逐行重复样式回归。</zh-CN><en>Keep the same 400-line text and targets, with a size gate rejecting per-line repeated-style regressions.</en></lang>
    const content = Array.from({ length: 400 }, (_, index) => `const value${index} = "中文 & <safe>";`).join('\n');
    const legacy = renderSourceLines(content, 52, true);
    const page = renderPublicSourcePage(content, 'public.ts', 52);
    const fragment = page.match(/<code>([\s\S]*?)<\/code>/u)![1]!;
    expect(fragment === legacy.replace(/ style="[^"]*"/gu, "")).toBe(true);
    expect(fragment.match(/data-hia-source-line-number=/gu)).toHaveLength(400);
    expect(fragment).toContain('id="L451"');
    expect(Buffer.byteLength(fragment)).toBeLessThan(Buffer.byteLength(legacy) * 0.65);
    expect(page).toContain('.hia-source-code-line{display:block;min-width:max-content}');
    expect(page).not.toContain('<script');
  });

  it.each([0, -1, NaN, Infinity, '1" data-untrusted-position="yes'])('normalizes malformed runtime positions %s before HTML interpolation', (value) => {
    const fragment = renderSourceLines("safe", value as number, true);
    expect(fragment).toContain('id="L1"');
    expect(fragment).not.toContain('data-untrusted-position');
  });

  it("keeps untyped malformed embedded preview positions out of HTML attributes", () => {
    const input = fixture();
    input.entries[0]!.source!.preview!.range!.start.line = '1" data-untrusted-position="yes' as unknown as number;
    const result = renderProjectHtmlDocument(input, { projectSite: { source: { presentation: "embed" } } });
    const entry = result.files.find((file) => file.path.startsWith("entries/"))!.contents;
    expect(entry).not.toContain('data-untrusted-position="yes');
    expect(entry).toContain('data-hia-source-line-number="1"');
  });
  it.each(["fetch", "link"] as const)("links %s to a generated same-origin source page with real anchors", (presentation) => {
    const result = renderProjectHtmlDocument(fixture(), { projectSite: { source: { presentation } } });
    const entry = result.files.find((file) => file.path.startsWith("entries/"))!.contents;
    expect(entry).toMatch(/href="sources\/[a-f0-9]{64}\.L21\.html#L21"/u);
    const viewer = result.files.find((file) => /^sources\/[a-f0-9]{64}\.L21\.html$/u.test(file.path))!;
    expect(viewer.contents).toContain('id="L21"');
    expect(viewer.contents).toContain('id="L22"');
    expect(viewer.contents).toContain('href="#L22"');
    expect(viewer.contents).toContain("&lt;script&gt;synthetic&lt;/script&gt;");
    expect(viewer.contents).not.toContain("<script>");
    expect(viewer.contents).toContain("Content-Security-Policy");
    expect(viewer.contents).toContain("// 中文 😀");
    const textAsset = result.files.find((file) => /^sources\/[a-f0-9]{64}\.txt$/u.test(file.path))!;
    expect(textAsset.contents).toBe(fixture().entries[0]!.source!.preview!.content);
    if (presentation === "fetch") expect(entry).toMatch(/data-hia-source-fetch="sources\/[a-f0-9]{64}\.txt"/u);
    for (const file of result.files.filter((file) => file.path.endsWith(".json"))) expect(file.contents).not.toContain("synthetic&lt;");
  });

  it("preserves correct relative links in no-script and localized no-script pages", () => {
    const result = renderProjectHtmlDocument(fixture());
    const noScript = result.files.find((file) => file.path.startsWith("pages/") && file.path !== "pages/index.html")!.contents;
    expect(noScript).toMatch(/href="\.\.\/sources\/[a-f0-9]{64}\.L21\.html#L21"/u);
    expect(noScript).not.toContain("data-hia-source-fetch=");
  });

  it.each(["fetch", "link"] as const)("resolves localized %s source links to the emitted viewer", (presentation) => {
    // <lang><zh-CN>本地化静态页有两层目录，按真实URL解析核目标，不能只匹配链接文字。</zh-CN><en>Localized static pages have two directory levels; resolve actual URLs to verify targets instead of matching labels.</en></lang>
    const result = renderProjectHtmlDocument(fixture(), { projectSite: { uiLocale: "en", informationArchitecture: {}, source: { presentation } } });
    const viewer = result.files.find(file => /^sources\/.*\.L21\.html$/u.test(file.path))!;
    for (const page of result.files.filter(file => /^pages\/(?:en|zh-CN)\/[^/]+\.html$/u.test(file.path) && !file.path.endsWith("/index.html"))) {
      // <lang><zh-CN>复制已生成的来源链接并验证相对解析及对应文件，覆盖两种界面语言。</zh-CN><en>Resolve each emitted source link and require the matching file, covering both interface languages.</en></lang>
      const link = page.contents.match(/href="([^"]+\.L21\.html#L21)"/u)![1]!;
      expect(new URL(link, `https://example.test/${page.path}`).pathname).toBe(`/${viewer.path}`);
    }
    expect(result.files.filter(file => /^pages\/(?:en|zh-CN)\/[^/]+\.html$/u.test(file.path) && !file.path.endsWith("/index.html"))).toHaveLength(2);
  });

  it("retains same-origin theme routing for generated source pages", () => {
    const result = renderProjectHtmlDocument(fixture(), { themeAssets: { mode: "external", baseUrl: "../shared/assets" } });
    const viewer = result.files.find((file) => file.path.endsWith(".L21.html"))!;
    expect(viewer.contents).toContain('href="../../shared/assets/hia-default.css"');
  });

  it("keeps identical bodies at different paths or first lines correctly labeled", () => {
    const original = fixture();
    const source = original.entries[0]!.source!;
    original.entries.push({ ...original.entries[0]!, id: "api:b", source: { ...source, path: "src/other.cs" } }, { ...original.entries[0]!, id: "api:c", source: { ...source, range: { start: { line: 41 }, end: { line: 42 } } } });
    const result = renderProjectHtmlDocument(original);
    const viewers = result.files.filter((file) => /^sources\/.*\.html$/u.test(file.path));
    expect(viewers).toHaveLength(3);
    expect(new Set(viewers.map((file) => file.path)).size).toBe(3);
    expect(result.files.filter((file) => /^sources\/.*\.txt$/u.test(file.path))).toHaveLength(1);
    expect(viewers.some((file) => file.contents.includes('id="L41"'))).toBe(true);
    expect(viewers.some((file) => file.contents.includes("src/other.cs"))).toBe(true);
  });

  it("does not create endpoints in none/embed or without an authorized body", () => {
    for (const presentation of ["none", "embed"] as const) {
      const result = renderProjectHtmlDocument(fixture(), { projectSite: { source: { presentation } } });
      expect(result.files.some((file) => file.path.startsWith("sources/"))).toBe(false);
    }
    const input = fixture();
    delete input.entries[0]!.source!.preview;
    input.entries[0]!.source!.linkUrl = "https://example.test/private";
    const result = renderProjectHtmlDocument(input, { projectSite: { source: { presentation: "link" } } });
    expect(result.files.some((file) => file.path.startsWith("sources/"))).toBe(false);
    expect(result.files.find((file) => file.path.startsWith("entries/"))!.contents).not.toContain("https://example.test/private");
  });

  it("avoids duplicate inline IDs and keeps static line text escaped", () => {
    const fragment = renderSourceLines("<img src=x onerror=alert(1)>\n&", 21);
    expect(fragment).not.toContain('id="L21"');
    expect(fragment).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(fragment).toContain('data-hia-source-line-number="22"');
    expect(renderPublicSourcePage("x", '<bad title="x">', 21)).not.toContain('<bad title="x">');
  });

  it("keeps viewer HTML lazy until its payload is requested", () => {
    const bundle = createPortalPresentationBundle({ projectId: "synthetic", layout: "split-site", maxLines: 400, skinId: "portal.classic", scheme: "system", sourceMode: "fetch", topics: [{ entryId: "entry", topicKind: "method", relationIds: [] }], sources: [{ entryId: "entry", sourcePath: "src/a.cs", content: "public", startLine: 21 }] });
    const viewer = bundle.artifacts.find((file) => file.path.endsWith(".L21.html"))!;
    expect(typeof Object.getOwnPropertyDescriptor(viewer, "contents")?.get).toBe("function");
    expect(viewer.contents).toContain('id="L21"');
  });
});
