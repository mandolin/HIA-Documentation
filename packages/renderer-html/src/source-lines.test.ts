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
