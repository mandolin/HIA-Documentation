/**
 * @file
 * @lang zh-CN 逐文件输出必须保持旧API全部内容与manifest，并等待写入者，不能积压整站HTML。
 * @lang en Per-file output must preserve all legacy API contents/manifests and await the writer without accumulating site HTML.
 */
import { describe, expect, it, vi } from "vitest";
import { renderProjectHtmlDocument, renderProjectHtmlDocumentToWriter, type RenderProjectHtmlInput, type RenderedHtmlFile } from "./index.js";

/** @lang zh-CN 带显式公开合成片段与双语内容的小站，不含目标业务资料。 @lang en Small site with explicit public synthetic excerpts and bilingual content, without target business data. */
function fixture(): RenderProjectHtmlInput {
  return { project: { id: "synthetic:stream", name: "Stream", locales: ["en", "zh-CN"], defaultLocale: "en" }, entries: Array.from({ length: 4 }, (_, i) => ({ id: `api:${i}`, kind: "dotnet-method", view: "dotnet", name: `Method${i}`, summary: `摘要 Summary ${i}`, source: { path: "src/public.cs", range: { start: { line: 21 }, end: { line: 22 } }, preview: { content: "// public <example>\nreturn 42;", range: { start: { line: 21 }, end: { line: 22 } } } } })) };
}

describe("incremental project output", () => {
  it.each(["none", "link", "fetch", "embed"] as const)("preserves every byte and file order for %s", async (presentation) => {
    const input = fixture();
    const options = { projectSite: { source: { presentation } } };
    const previous = renderProjectHtmlDocument(input, options);
    const files: RenderedHtmlFile[] = [];
    const result = await renderProjectHtmlDocumentToWriter(input, async (file) => { files.push(file); }, options);
    expect(files).toEqual(previous.files);
    expect(result.manifest).toEqual(previous.manifest);
    expect(result.diagnostics).toEqual(previous.diagnostics);
    expect(result.fileCount).toBe(files.length);
    expect(result).not.toHaveProperty("files");
  });

  it("waits for each sink and propagates its failure without starting later writes", async () => {
    let active = 0;
    let peak = 0;
    let writes = 0;
    await expect(renderProjectHtmlDocumentToWriter(fixture(), async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((done) => setImmediate(done));
      active -= 1;
      writes += 1;
      if (writes === 3) throw new Error("synthetic sink failure");
    })).rejects.toThrow("synthetic sink failure");
    expect(peak).toBe(1);
    expect(writes).toBe(3);
  });

  it("writes no files for error diagnostics or invalid asset routing", async () => {
    const writer = vi.fn();
    const input = { ...fixture(), diagnostics: [{ code: "SYNTHETIC_REFUSAL", message: "Synthetic refusal", severity: "error" as const }] };
    const refused = await renderProjectHtmlDocumentToWriter(input, writer);
    expect(refused.fileCount).toBe(0);
    expect(writer).not.toHaveBeenCalled();
    await expect(renderProjectHtmlDocumentToWriter(fixture(), writer, { themeAssets: { mode: "external", baseUrl: "https://example.test/assets" } })).rejects.toThrow("HIA_THEME_ASSETS_INVALID");
    expect(writer).not.toHaveBeenCalled();
  });

  it("retains external theme routing, single-page output and source integrity metadata", async () => {
    for (const layout of ["single-page", "split-site"] as const) {
      const options = { themeAssets: { mode: "external" as const, baseUrl: "../shared/assets" }, projectSite: { layout, source: { presentation: "fetch" as const } } };
      const previous = renderProjectHtmlDocument(fixture(), options);
      const files: RenderedHtmlFile[] = [];
      const result = await renderProjectHtmlDocumentToWriter(fixture(), (file) => { files.push(file); }, options);
      expect(files).toEqual(previous.files);
      expect(result.manifest).toEqual(previous.manifest);
      expect(files.some((file) => file.path === "assets/hia-default.css")).toBe(false);
    }
  });
});
