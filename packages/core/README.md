# @hia-doc/core

Core HIA document model, field-level i18n types, source metadata types, fixture helpers and early validation helpers.

This package is intentionally independent from CLI, renderer, IDE, and language-adapter packages. It is the shared base that later HIA packages consume.

## Current Scope

- HIA document, node and symbol model.
- Field-level i18n model aligned with the current `jsdoc-plugin-hia-sys` `i18n.fields` practice.
- Source metadata model for `definedIn`, `primaryBlock`, references and fragments.
- Lightweight validator for shared fixtures.
- `createBasicFixtureDocument()` for early renderer, CLI and future LSP tests.
