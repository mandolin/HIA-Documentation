# @hia-doc/browser-panel

Static browser panel renderer for HIA source-linked documentation lookup.

The package turns `doc-source-map` indexes and ordinary source map lookup indexes into:

- `browser-panel-payload.json`
- a standalone `index.html` panel
- a small output manifest

The generated HTML can be opened as a local page today. Its payload shape is intentionally close to a future DevTools panel message boundary, so browser extensions can consume the same data without reimplementing source-linkage logic.

## Current Scope

- Renders project-level doc-source-map entries.
- Shows original source and generated artifact positions when ordinary source maps are available.
- Emits open-request payloads instead of directly controlling editors or DevTools.
- Does not read files or discover source maps; callers provide validated indexes.

## Non Goals

- No Chrome Web Store package.
- No runtime access to private source content.
- No replacement for `@hia-doc/source-linkage`.
