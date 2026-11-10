/**
 * @file
 * @lang zh-CN 生成运行索引的紧凑序列化与原始字符串保留回归，不改写输入工件。
 * @lang en Regressions for compact runtime-index serialization and original strings without rewriting input artifacts.
 */
import { describe, expect, it } from "vitest";
import { renderProjectHtmlDocument } from "./index.js";

describe("compact generated runtime JSON", () => {
  it.each([
    ["split-site", "lazy", "en"], ["split-site", "eager", "zh-CN"],
    ["single-page", undefined, "en"], ["single-page", undefined, "zh-CN"]
  ] as const)("preserves data in %s / %s / %s without indentation", (layout, loadingStrategy, uiLocale) => {
    // <lang><zh-CN>正文内的空白、引号与Unicode属于数据，不能随序列化缩进删除。</zh-CN><en>Whitespace, quotes and Unicode inside prose are data and must survive removal of serialization indentation.</en></lang>
    const summary = 'first line\n  second\t中文 😀 "quoted" & <safe>';
    const result = renderProjectHtmlDocument({
      project: { name: "Public capacity fixture", defaultLocale: "en", locales: ["en", "zh-CN"] },
      entries: [{ id: "entry:capacity", name: "capacity", kind: "function", view: "js", summary }]
    }, { projectSite: { uiLocale, layout, ...(loadingStrategy ? { informationArchitecture: { loadingStrategy } } : {}) } });
    // <lang><zh-CN>只检查由渲染器直接构造的运行JSON，原生工件与来源文本另有字节门禁。</zh-CN><en>Check only runtime JSON constructed directly by the renderer; native artifacts and source text have separate byte-preservation gates.</en></lang>
    const runtimeFiles = result.files.filter(file => file.path.startsWith("navigation/") || [
      "project-index.json", "search/index.json", "relations/project.json", "content/eager.json", "documentation-presentation-profile.json"
    ].includes(file.path));
    expect(runtimeFiles.length).toBeGreaterThanOrEqual(2);
    for (const file of runtimeFiles) {
      expect(file.contents === `${JSON.stringify(JSON.parse(file.contents))}\n`).toBe(true);
    }
    // <lang><zh-CN>核原字符串和显式语言数组，确保默认值与嵌入正文保持可读语义。</zh-CN><en>Verify the original string and explicit locales so defaults and embedded prose retain their readable semantics.</en></lang>
    const index = JSON.parse(result.files.find(file => file.path === "project-index.json")!.contents);
    expect(index.entries[0].summary).toBe(summary);
    expect(index.project.locales).toEqual(["en", "zh-CN"]);
  });
});
