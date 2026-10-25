# @hia-doc/theme-default

Default static theme assets for HIA HTML output.

This package owns the default CSS and minimal browser-side script. It does not parse HIA IR and does not depend on renderer or CLI packages.

## Current Scope

- `assets/hia-default.css`
- `assets/hia-default.js`
- asset metadata for renderer output
- minimal runtime locale switching for `[data-hia-locale]` blocks
- project view segmented controls for unified project pages
- native nested `<details>/<summary>` Portal IA disclosure, visible `:focus-visible` treatment, active-ancestor styling, and semantic topic slots
- versioned `documentation-portal-theme@0.1.0-draft` metadata, semantic light/dark color tokens, forced-colors adaptation, and print fallback
- `portal.classic`, `portal.graphite`, and `portal.lumen` built-in skins, each supporting `system`, `light`, and `dark`
- visible skin/scheme controls with local reading-preference persistence and build-time no-script defaults
- native topic, member, and source-card disclosure without authored `aria-expanded`
- narrow-viewport stacking and safe wrapping for long documentation field keys

The theme intentionally does not emit or style a WAI-ARIA `tree` contract. Arrow-key navigation and typeahead are not claimed by this first slice; native Tab and Enter/Space disclosure behavior remains authoritative.

## Theme Contract

`documentation-portal-theme@0.1.0-draft` is owned by this package. The contract exposes a metadata-only reference for renderers and a complete light/dark semantic color-token set. Portal pages now provide three owner-local skins and a visible selector. A browser may persist the reader's local skin/scheme preference, but the preference never enters the contract, renderer manifest, presentation profile, or search index.

Existing `--hia-bg`, `--hia-surface`, `--hia-border`, `--hia-text`, `--hia-muted`, `--hia-accent`, `--hia-accent-soft`, `--hia-code-bg`, and `--hia-code-text` variables remain additive aliases. Removing, renaming, or changing the semantics of a token requires a new contract version.

Native `<details>/<summary>` keeps the `open` attribute as the sole disclosure state. Browsers map that state into the accessibility tree, so the theme does not duplicate an authored `aria-expanded` value that could drift. Disclosure remains usable without JavaScript, and print media reveals collapsed content.

中文摘要：本包拥有中性 `documentation-portal-theme@0.1.0-draft` contract，并提供 Classic、Graphite、Lumen
三套 Portal-owned skin、system/light/dark 配色、可见选择器和本地阅读偏好。偏好不进入 profile/manifest/search；第三方
主题市场与完整 Portal P6/P7 仍不在当前范围。

## Brand colors

`getDefaultThemeAssets({ colors: { accent: "#0f4f82" } })` returns new asset records with validated semantic hex-color overrides.
默认常量不变；只接受既有token与安全十六进制颜色，不接受CSS代码。配色需按所选scheme复核对比度。
See [shared assets and branding](../../docs/shared-theme-assets.md).

## Deep navigation trees

Tree labels wrap independently of their open actions. Open actions remain visible and align to the right, moving to another row when space is limited. The sidebar uses compact indentation and local horizontal scrolling for exceptionally deep paths.

Override the indentation on the shell in your own stylesheet:

```css
.hia-shell { --hia-tree-indent: .6rem; }
```

中文说明：深层树不会通过缩小字体或隐藏打开按钮节省空间。默认每层缩进 `.6rem`；极深层级保留可读宽度并在侧栏内滚动。折叠标识跟随原生 `details.open`，键盘行为保持原生语义。

## Font Policy

The default theme does not bundle, download or redistribute font files. Its CSS only references local open-source font families and generic browser fallbacks.

- UI text prefers `Inter`, `Noto Sans SC`, `Source Han Sans SC` and `Sarasa Gothic SC`.
- Code and source locations prefer `Sarasa Mono SC`, `Sarasa Fixed SC`, `Noto Sans Mono CJK SC`, `Source Han Mono SC`, `Cascadia Code`, `JetBrains Mono` and `Fira Code`.

## Release Notes

### 0.1.4 (release candidate)

- Fixes deep navigation label collapse, excessive indentation and competing open actions. Adds `--hia-tree-indent` and keeps extremely deep overflow within the sidebar.
- 修复深层标签逐字换行、缩进过大和打开按钮挤压；极深层级保持局部滚动。

### 0.1.1

- Rehearses the post-bootstrap npm Trusted Publisher path with a metadata-only patch release.
