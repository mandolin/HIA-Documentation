# @hia-doc/core

Core HIA document model, field-level i18n types, source metadata types, JSON Schema draft, fixture helpers and validation helpers.

This package is intentionally independent from CLI, renderer, IDE, and language-adapter packages. It is the shared base that later HIA packages consume.

## Current Scope

- HIA document, node and symbol model.
- Field-level i18n model with `key`/`path`, external resource references and fallback resolution metadata.
- Source metadata model `0.2.0` for `definedIn`, source blocks, references, fragments, link and preview policy.
- Diagnostic shape, diagnostic code registry and minimal protocol envelope helpers.
- JSON Schema draft exported as `HIA_DOCUMENT_SCHEMA`.
- Runtime validation through `validateHiaDocumentDetailed()`.
- Fixture helpers and JSON fixtures for renderer, CLI and LSP tests.

## Contract Versions

- Core document schema: `HIA_CORE_CONTRACT_VERSION`
- Text i18n model: `HIA_TEXT_I18N_MODEL_VERSION`
- Source model: `HIA_SOURCE_MODEL_VERSION`
- Protocol envelope: `HIA_PROTOCOL_ENVELOPE_VERSION`

See `docs/contract-index.md` and `docs/core-fixture-contract.md` in the repository root for the current contract baseline.
