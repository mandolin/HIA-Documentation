/**
 * @file
 * @lang zh-CN 品牌颜色只接受安全semantic token值，不提供任意CSS注入能力。
 * @lang en Brand colors accept only safe semantic token values, without arbitrary CSS injection.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_CSS, DEFAULT_THEME_JS, getDefaultThemeAssets } from "./index.js";

describe("theme branding assets", () => {
  it("overrides the requested accent without changing shared defaults or JavaScript", () => {
    const assets = getDefaultThemeAssets({ colors: { accent: "#0f4f82", canvas: "#ffffff" } });
    expect(assets[0].contents).toContain("--hia-color-accent: #0f4f82;");
    expect(assets[0].contents).toContain("--hia-color-canvas: #ffffff;");
    expect(assets[1].contents).toBe(DEFAULT_THEME_JS);
    expect(getDefaultThemeAssets()[0].contents).toBe(DEFAULT_THEME_CSS);
  });

  it.each(["#abc", "#abcd", "#123456", "#12345678"])("accepts safe hex %s", (color) => {
    expect(getDefaultThemeAssets({ colors: { accent: color } })[0].contents).toContain(`--hia-color-accent: ${color};`);
  });

  it.each(["red;}</style><script>alert(1)</script>", "url(https://example.com/)", "expression(alert(1))", "var(--private)", "#12345", "#123456\n", 1, null])("rejects nonliteral color %#", (color) => {
    expect(() => getDefaultThemeAssets({ colors: { accent: color } } as never)).toThrow(/HIA_THEME_COLORS_INVALID/u);
  });

  it("rejects unknown color names instead of silently accepting dead options", () => {
    expect(() => getDefaultThemeAssets({ colors: { privateToken: "#fff" } } as never)).toThrow(/HIA_THEME_COLORS_INVALID/u);
  });

  it("rejects accessors without evaluating them", () => {
    let reads = 0;
    const colors = Object.defineProperty({}, "accent", { enumerable: true, get() { reads += 1; return "#fff"; } });
    expect(() => getDefaultThemeAssets({ colors } as never)).toThrow(/HIA_THEME_COLORS_INVALID/u);
    expect(reads).toBe(0);
  });

  it("keeps empty overrides byte-identical to the default theme", () => {
    expect(getDefaultThemeAssets({ colors: {} })).toEqual(getDefaultThemeAssets());
  });
});
