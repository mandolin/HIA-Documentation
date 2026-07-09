# @hia-doc/theme-default

Default static theme assets for HIA HTML output.

This package owns the default CSS and minimal browser-side script. It does not parse HIA IR and does not depend on renderer or CLI packages.

## Current Scope

- `assets/hia-default.css`
- `assets/hia-default.js`
- asset metadata for renderer output
- minimal runtime locale switching for `[data-hia-locale]` blocks
- project view segmented controls for unified project pages

## Font Policy

The default theme does not bundle, download or redistribute font files. Its CSS only references local open-source font families and generic browser fallbacks.

- UI text prefers `Inter`, `Noto Sans SC`, `Source Han Sans SC` and `Sarasa Gothic SC`.
- Code and source locations prefer `Sarasa Mono SC`, `Sarasa Fixed SC`, `Noto Sans Mono CJK SC`, `Source Han Mono SC`, `Cascadia Code`, `JetBrains Mono` and `Fira Code`.
