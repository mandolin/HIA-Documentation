import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH, getDefaultThemeAssets } from "./index.js";

describe("@hia-doc/theme-default", () => {
  it("exposes css and js assets", () => {
    const assets = getDefaultThemeAssets();

    expect(assets.map((asset) => asset.path)).toEqual([DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH]);
    expect(assets[0]?.contents).toContain(".hia-shell");
    expect(assets[0]?.contents).toContain(".hia-fallback-badge");
    expect(assets[1]?.contents).toContain("hiaTheme");
    expect(assets[1]?.contents).toContain("data-hia-locale-control");
  });
});
