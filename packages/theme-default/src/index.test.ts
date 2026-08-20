import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOCUMENTATION_PORTAL_THEME,
  DEFAULT_THEME_CSS_PATH,
  DEFAULT_THEME_JS_PATH,
  DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES,
  DOCUMENTATION_PORTAL_THEME_CONTRACT,
  DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION,
  PORTAL_THEME_SCHEMES,
  PORTAL_THEME_SKIN_IDS,
  getDefaultDocumentationPortalThemeReference,
  getDefaultThemeAssets,
  getPortalThemeSchemeLabel,
  getPortalThemeSkinCatalog
} from "./index.js";

describe("@hia-doc/theme-default", () => {
  it("exposes the exact metadata-only theme reference", () => {
    // <lang><zh-CN>reference 不携带 token 值，避免 renderer index 复制完整 presentation payload。</zh-CN><en>The reference excludes token values so renderer indexes do not copy the full presentation payload.</en></lang>
    const reference = getDefaultDocumentationPortalThemeReference();

    expect(reference).toEqual({
      contract: DOCUMENTATION_PORTAL_THEME_CONTRACT,
      contractVersion: DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION,
      name: "default",
      colorSchemePolicy: "system",
      disclosure: "native-details-summary"
    });
    expect(reference).not.toHaveProperty("tokens");
    expect(reference).not.toHaveProperty("privacy");
  });

  it("defines complete light and dark semantic token sets", () => {
    // <lang><zh-CN>两个 scheme 必须拥有同一闭集，防止只在一种模式缺少 token。</zh-CN><en>Both schemes must expose the same closed set so no token disappears in one mode.</en></lang>
    const expectedTokenNames = [...DOCUMENTATION_PORTAL_THEME_COLOR_TOKEN_NAMES].sort();

    expect(Object.keys(DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.light).sort()).toEqual(expectedTokenNames);
    expect(Object.keys(DEFAULT_DOCUMENTATION_PORTAL_THEME.tokens.dark).sort()).toEqual(expectedTokenNames);
    expect(DEFAULT_DOCUMENTATION_PORTAL_THEME.compatibility).toEqual({
      exactDraftRequired: true,
      additiveTokenChange: "compatible",
      semanticTokenChange: "new-contract-version"
    });
    expect(DEFAULT_DOCUMENTATION_PORTAL_THEME.disclosurePolicy).toMatchObject({
      stateAuthority: "details-open-attribute",
      accessibilityState: "native-expanded-state",
      authoredAriaExpanded: false,
      scriptRequired: false,
      printBehavior: "expand-content"
    });
    expect(Object.values(DEFAULT_DOCUMENTATION_PORTAL_THEME.privacy).every((value) => value === false)).toBe(true);
  });

  it("publishes three Portal-owned skins with independent scheme capability", () => {
    // <lang><zh-CN>catalog 只投射 capability，不向 renderer 暴露可变 token 对象。</zh-CN><en>The catalog projects capabilities without exposing mutable token objects to the renderer.</en></lang>
    const catalog = getPortalThemeSkinCatalog();

    expect(PORTAL_THEME_SKIN_IDS).toEqual(["portal.classic", "portal.graphite", "portal.lumen"]);
    expect(PORTAL_THEME_SCHEMES).toEqual(["dark", "light", "system"]);
    expect(catalog.map(({ skinId }) => skinId)).toEqual(PORTAL_THEME_SKIN_IDS);
    expect(PORTAL_THEME_SCHEMES.map(getPortalThemeSchemeLabel)).toEqual([
      "Dark / 深色",
      "Light / 浅色",
      "System / 跟随系统"
    ]);
    expect(catalog.every(({ capabilities, supportedSchemes, tokenContract }) => (
      capabilities.includes("native-disclosure")
      && capabilities.includes("theme-selector")
      && supportedSchemes.join(",") === PORTAL_THEME_SCHEMES.join(",")
      && tokenContract === `${DOCUMENTATION_PORTAL_THEME_CONTRACT}@${DOCUMENTATION_PORTAL_THEME_CONTRACT_VERSION}`
    ))).toBe(true);
  });

  it("exposes compatible css and js assets with system and print fallbacks", () => {
    // <lang><zh-CN>asset order 与路径属于现有 renderer compatibility boundary。</zh-CN><en>Asset order and paths are part of the existing renderer compatibility boundary.</en></lang>
    const assets = getDefaultThemeAssets();
    // <lang><zh-CN>CSS/JS 分开取值，让后续断言不会依赖数组重复索引。</zh-CN><en>Read CSS and JavaScript separately so later assertions do not repeat array indexing.</en></lang>
    const css = assets[0]?.contents ?? "";
    const javascript = assets[1]?.contents ?? "";

    expect(assets.map((asset) => asset.path)).toEqual([DEFAULT_THEME_CSS_PATH, DEFAULT_THEME_JS_PATH]);
    expect(css).toContain(".hia-shell");
    expect(css).toContain(".hia-fallback-badge");
    expect(css).toContain(".hia-project-view-button");
    expect(css).toContain("[aria-pressed=\"true\"]");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("details > summary:focus-visible");
    expect(css).toContain("data-hia-active-ancestor");
    expect(css).toContain(".hia-project-topic-section");
    expect(css).toContain("color-scheme: light dark");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(':root[data-hia-skin="portal.graphite"]');
    expect(css).toContain(':root[data-hia-skin="portal.lumen"]');
    expect(css).toContain('[data-hia-scheme="dark"]');
    expect(css).toContain('[data-hia-scheme="light"]');
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toMatch(/@media \(forced-colors: active\) \{[\s\S]*?:root\[data-hia-skin\]\[data-hia-scheme\]/u);
    expect(css).toContain("@media print");
    expect(css).toMatch(/@media print \{[\s\S]*?:root\[data-hia-skin\]\[data-hia-scheme\]/u);
    // <lang><zh-CN>真实 BP 会产生长字段键；字段本身和窄屏 grid 都必须允许收缩。</zh-CN><en>Real BP output emits long field keys; both the field and narrow grid must be shrinkable.</en></lang>
    expect(css).toMatch(/\.hia-i18n-field dt,\s*\.hia-i18n-field dd\s*\{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/u);
    expect(css).toMatch(/@media \(max-width: 760px\) \{[\s\S]*?\.hia-i18n-field \{\s*grid-template-columns: minmax\(0, 1fr\);/u);
    expect(css).toContain("details:not([open]) > *:not(summary)");
    expect(css).toContain("--hia-bg: var(--hia-color-canvas)");
    expect(css).toContain("--hia-color-focus-ring");
    expect(css).not.toContain("[role=\"tree\"]");
    expect(javascript).toContain("hiaTheme");
    expect(javascript).toContain("data-hia-skin-control");
    expect(javascript).toContain("data-hia-scheme-control");
    expect(javascript).toContain("localStorage");
    expect(javascript).toContain("data-hia-locale-control");
    expect(javascript).not.toContain("aria-expanded");
    expect(javascript).not.toContain("preventDefault");
  });
});
