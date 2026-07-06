# @hia-doc/core

Core HIA document model, field-level i18n types, source metadata types, JSON Schema draft, fixture helpers and validation helpers.

This package is intentionally independent from CLI, renderer, IDE, and language-adapter packages. It is the shared base that later HIA packages consume.

## Current Scope

- HIA document, node and symbol model.
- Field-level i18n model aligned with the current `jsdoc-plugin-hia-sys` `i18n.fields` practice.
- Source metadata model for `definedIn`, `primaryBlock`, references and fragments.
- JSON Schema draft exported as `HIA_DOCUMENT_SCHEMA`.
- Runtime validation through `validateHiaDocumentDetailed()`.
- Fixture helpers and JSON fixtures for renderer, CLI and LSP tests.
