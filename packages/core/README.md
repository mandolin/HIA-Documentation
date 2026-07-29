# @hia-doc/core

Core HIA document model, field-level i18n types, source metadata types, JSON Schema draft, fixture helpers and validation helpers.

This package is intentionally independent from CLI, renderer, IDE, and language-adapter packages. It is the shared base that later HIA packages consume.

## Current Scope

- HIA document, node and symbol model.
- Field-level i18n model with `key`/`path`, external resource references and fallback resolution metadata.
- Neutral `documentation-locale-resource@0.1.0-draft` JSON contract, pure BCP 47-aware resolver and metadata-only locale-resolution sidecar contract.
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
- Documentation locale resource: `DOCUMENTATION_LOCALE_RESOURCE_CONTRACT_VERSION`
- Documentation locale-resolution sidecar: `DOCUMENTATION_LOCALE_RESOLUTION_CONTRACT_VERSION`

## Documentation Locale Resources

The P1 canonical resource is UTF-8 JSON with `.dlr` as its recommended extension. A resource has a
stable `resourceId`; an entry is identified by `resourceId + entryKey`. Physical locators are not
part of that identity.

`@hia-doc/core` exports the Draft 2020-12 schemas, a pure parser/validator, deterministic locale
fallback resolution and a metadata-only `documentation-locale-resolution` sidecar factory. It does
not read files, choose a host locale, execute expressions, fetch network resources, or write a
resource. Use the `@hia-doc/generic-docline` root-bound reader/profile layer for local read-only
`.dlr` access.

The sidecar intentionally excludes resource bodies, raw locators and resolved text. An ordinary
`doc-source-map` may link to its stable sidecar identity but must not become a DLR datastore.

See `docs/contract-index.md` and `docs/core-fixture-contract.md` in the repository root for the current contract baseline.
