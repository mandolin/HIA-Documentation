# @hia-doc/renderer-html

Minimal HTML renderer for HIA documents.

The renderer consumes `@hia-doc/core` data and returns file payloads. It does not read from disk or own CLI behavior.

## Current Scope

- Renders a single `index.html`.
- Consumes field-level i18n text and emits runtime-switchable locale blocks.
- Marks fallback text with `data-hia-fallback-from`.
- Shows relative `definedIn` source links, primary source blocks and referenced source fragments.
- Emits default CSS/JS assets from `@hia-doc/theme-default`.
- Project-page mode also emits `project-index.json`: a stable, presentation-neutral navigation index for portals and search. It excludes inline source previews; the unified page remains the full-detail renderer.
- Returns a renderer manifest with entrypoint, locale and file metadata for CLI or other writers.

## Contract

The renderer manifest schema version is exported as `HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION`. Project navigation index identity is exported as `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT` and `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION`.

Renderer output is separate from CLI filesystem output. See `docs/contract-index.md` for the current layering rule.
