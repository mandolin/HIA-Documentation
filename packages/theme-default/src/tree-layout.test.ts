/**
 * @file
 * @lang zh-CN 固定深层树标签、折叠和打开入口的CSS边界；真实尺寸另由浏览器复核。
 * @lang en Guards CSS boundaries for deep-tree labels, disclosure and open actions; browser checks cover actual geometry.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_CSS } from "./index.js";

/** @lang zh-CN 提取单一选择器规则，避免其它正文样式使断言误通过。 @lang en Extracts one selector rule so unrelated prose styles cannot satisfy assertions. */
function rule(selector: string): string {
  // <lang><zh-CN>选择器按字面定位；本检查不执行或修改CSS。</zh-CN><en>Locate the literal selector without executing or mutating CSS.</en></lang>
  const start = DEFAULT_THEME_CSS.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return DEFAULT_THEME_CSS.slice(start, DEFAULT_THEME_CSS.indexOf("}", start) + 1);
}

describe("Portal deep-tree layout", () => {
  it("allocates a wider sidebar with smaller padding and shrinkable links", () => {
    expect(rule(".hia-shell")).toContain("minmax(15rem, 20rem)");
    expect(rule(".hia-sidebar")).toContain("padding: 1rem;");
    expect(rule(".hia-sidebar nav a")).toContain("min-width: 0;");
  });

  it("wraps actions separately without forcing arbitrary summary breaks", () => {
    // <lang><zh-CN>summary只编排行，长词断行仅属于标签。</zh-CN><en>The summary arranges rows; long-word breaking belongs only to the label.</en></lang>
    const summary = rule(".hia-project-hierarchy-list details > summary");
    expect(summary).toContain("flex-wrap: wrap;");
    expect(summary).not.toContain("overflow-wrap: anywhere");
    expect(rule(".hia-project-hierarchy-list details > summary > span")).toContain("flex: 1 1 auto;");
    expect(rule(".hia-project-hierarchy-list details > summary > span")).toContain("min-width: 0;");
    expect(rule(".hia-project-hierarchy-list details > summary > span")).toContain("overflow-wrap: break-word;");
  });

  it("exposes compact indentation and a readable local overflow floor", () => {
    expect(DEFAULT_THEME_CSS).toContain("--hia-tree-indent: .6rem;");
    expect(rule(".hia-sidebar .hia-project-hierarchy-list")).toContain("padding-left: var(--hia-tree-indent);");
    expect(rule(".hia-sidebar .hia-project-hierarchy-list")).toContain("min-width: 8rem;");
    expect(rule(".hia-sidebar .hia-project-hierarchy-list")).toContain("list-style: none;");
    expect(rule(".hia-project-hierarchy-list details > ul")).toContain("margin-left: 0;");
    expect(rule(".hia-sidebar [data-hia-project-tree]")).toContain("overflow-x: auto;");
  });

  it("keeps open actions discoverable and restores state-based disclosure markers", () => {
    expect(rule(".hia-project-tree-open")).toContain("margin-inline-start: auto;");
    expect(rule(".hia-project-tree-open")).not.toMatch(/opacity:\s*0|visibility:\s*hidden|display:\s*none/u);
    expect(rule(".hia-project-hierarchy-list details > summary::before")).toContain('content: "▸";');
    expect(rule(".hia-project-hierarchy-list details[open] > summary::before")).toContain('content: "▾";');
  });
});
