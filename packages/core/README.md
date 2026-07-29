# @hia-doc/core

Core HIA document model, field-level i18n types, source metadata types, JSON Schema draft, fixture helpers and validation helpers.

This package is intentionally independent from CLI, renderer, IDE, and language-adapter packages. It is the shared base that later HIA packages consume.

## Current Scope

- HIA document, node and symbol model.
- Field-level i18n model with `key`/`path`, external resource references and fallback resolution metadata.
- Neutral `documentation-locale-resource@0.1.0-draft` JSON contract, pure BCP 47-aware resolver and metadata-only locale-resolution sidecar contract.
- Neutral `documentation-locale-resource-declaration@0.1.0-draft` controlled catalog declaration and public-safe catalog-only discovery/sidecar contract.
- Neutral `documentation-terminology@0.1.0-draft` candidate-set and controlled registry reference with human-linkage and privacy validation.
- Neutral `documentation-quality-review@0.1.0-draft` aggregation contract for read-only ROP, terminology and locale-resource review signals.
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
- Documentation locale-resource declaration/discovery: `DOCUMENTATION_LOCALE_RESOURCE_DECLARATION_CONTRACT_VERSION`
- Documentation terminology: `DOCUMENTATION_TERMINOLOGY_CONTRACT_VERSION`
- Documentation quality review: `DOCUMENTATION_QUALITY_REVIEW_CONTRACT_VERSION`

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

## Documentation Locale-Resource Declaration And Discovery

`documentation-locale-resource-declaration` separates a controlled declaration catalog from public
discovery. The controlled catalog may use a project-relative `.dlr` locator only for in-memory exact
allowlist matching; the public discovery and sidecar retain logical ids, approved profile/version,
provenance, diagnostics and a deny-all privacy policy. Discovery neither reads a file nor proves a
resource exists or is valid. Physical roots, `realpath`, and resource parsing remain outside this core
contract and require a separate reader invocation.

## Documentation Terminology

`documentation-terminology` has two controlled artifact kinds: a body-free candidate set and a
human-maintained registry. Candidate identity is derived from stable logical scope and profile
provenance, never from an observed phrase, source path, range, AST, or hash. A `linked` candidate
requires a human review record and an approved `term.*` registry entry.

Registry forms and definitions remain controlled input. The core quality-input helper emits only
logical scope, `TERM_*` codes, confidence and provenance for `documentation-quality-review`; it
does not expose term forms, parse source comments, persist a registry, create edits, or call a
network service. See `docs/documentation-terminology-contract.md` for the schema and lifecycle.

## Documentation Quality Review

`documentation-quality-review` accepts only privacy-safe structural observations and diagnostic
codes. Its findings always require human review and its action policy is fixed to `review-only`.
It neither parses terminology, reads DLR files/sidecars, nor creates edits, migration plans or
resource writes.

See `docs/contract-index.md` and `docs/core-fixture-contract.md` in the repository root for the current contract baseline.
