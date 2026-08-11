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
- narrow-viewport stacking and safe wrapping for long documentation field keys

The theme intentionally does not emit or style a WAI-ARIA `tree` contract. Arrow-key navigation and typeahead are not claimed by this first slice; native Tab and Enter/Space disclosure behavior remains authoritative.

## Theme Contract

`documentation-portal-theme@0.1.0-draft` is owned by this package. The first bounded contract exposes a metadata-only reference for renderers and a complete light/dark semantic color-token set. The default policy follows `prefers-color-scheme`; it does not persist a theme choice or bundle a theme selector.

Existing `--hia-bg`, `--hia-surface`, `--hia-border`, `--hia-text`, `--hia-muted`, `--hia-accent`, `--hia-accent-soft`, `--hia-code-bg`, and `--hia-code-text` variables remain additive aliases. Removing, renaming, or changing the semantics of a token requires a new contract version.

Native `<details>/<summary>` keeps the `open` attribute as the sole disclosure state. Browsers map that state into the accessibility tree, so the theme does not duplicate an authored `aria-expanded` value that could drift. Disclosure remains usable without JavaScript, and print media reveals collapsed content.

中文摘要：本包拥有中性 `documentation-portal-theme@0.1.0-draft` contract；首版只冻结 semantic color token、系统深浅色、forced-colors、可见焦点、原生 disclosure、窄屏长字段键换行与打印降级，不包含主题选择持久化、第三方主题市场或完整 Portal P6。

## Font Policy

The default theme does not bundle, download or redistribute font files. Its CSS only references local open-source font families and generic browser fallbacks.

- UI text prefers `Inter`, `Noto Sans SC`, `Source Han Sans SC` and `Sarasa Gothic SC`.
- Code and source locations prefer `Sarasa Mono SC`, `Sarasa Fixed SC`, `Noto Sans Mono CJK SC`, `Source Han Mono SC`, `Cascadia Code`, `JetBrains Mono` and `Fira Code`.

## Release Notes

### 0.1.1

- Rehearses the post-bootstrap npm Trusted Publisher path with a metadata-only patch release.
