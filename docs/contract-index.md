# HIA Contract Index

This page summarizes the first stable contract baseline implemented in this monorepo.

## Version Snapshot

| Surface | Export / file | Version |
| --- | --- | --- |
| Core document schema | `HIA_CORE_CONTRACT_VERSION` / `HIA_DOCUMENT_SCHEMA_VERSION` | `0.2.0` |
| Text i18n model | `HIA_TEXT_I18N_MODEL_VERSION` | `0.2.0` |
| Source model | `HIA_SOURCE_MODEL_VERSION` | `0.2.0` |
| Config schema | `HIA_CONFIG_SCHEMA_VERSION` | `0.1.0` |
| Renderer manifest | `HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION` | `0.1.0` |
| Protocol envelope | `HIA_PROTOCOL_ENVELOPE_VERSION` | `0.1.0` |
| JSDoc Integration input | `JSDOC_HIA_INTEGRATION_CONTRACT_VERSION` | `0.1.0` |
| JSDoc adapter bridge | `JSDOC_ADAPTER_CORE_BRIDGE_VERSION` | `0.1.0` |
| JSDoc adapter metadata | `JSDOC_ADAPTER_METADATA_SCHEMA_VERSION` | `0.1.0` |

## Contract Surfaces

| Surface | Owner package | Notes |
| --- | --- | --- |
| Core document | `@hia-doc/core` | Language-neutral document, node, symbol, i18n, source and diagnostic model. |
| JSON Schema draft | `@hia-doc/core` | Serializable draft exported as `HIA_DOCUMENT_SCHEMA`. |
| Runtime validation | `@hia-doc/core` | `validateHiaDocumentDetailed()` is the shared guard used by tests, CLI and LSP. |
| Diagnostics registry | `@hia-doc/core` | `HIA_DIAGNOSTIC_CODE_REGISTRY` records known cross-layer codes. |
| Protocol envelope | `@hia-doc/core` | Lightweight message envelope, not split into a separate package yet. |
| Project config | `@hia-doc/config` | Project/build profile settings. Config is not part of the core document IR. |
| Renderer manifest | `@hia-doc/renderer-html` | Renderer output summary. CLI may wrap it into a build output manifest. |
| LSP resource index | `@hia-doc/lsp` | IDE view model derived from core documents. It is not a core source of truth. |
| IDE/LSP capability | `@hia-doc/lsp` and IDE shells | Capability ownership, authoring boundary and resource action/preflight data, consumed by the W-P5.6 VS Code baseline. |
| JSDoc adapter bridge | `@hia-doc/parser-jsdoc` | Converts JSDoc Integration JSON into core documents and sanitizes metadata. |

## Fixtures

| Fixture | Purpose |
| --- | --- |
| `fixtures/core-minimal.hia.json` | Minimal valid core document. |
| `fixtures/basic.hia.json` | Shared renderer/CLI/LSP fixture with i18n and source metadata. |
| `fixtures/i18n-resource.hia.json` | Field key/path, external i18n resource and resolution source fixture. |
| `fixtures/source-reference.hia.json` | Source location, primary block, fragments, references, links and preview fixture. |
| `fixtures/jsdoc-integration.basic.json` | Realistic JSDoc Integration adapter input. |
| `fixtures/jsdoc-integration.compat.json` | Adapter compatibility input for metadata sanitization and diagnostic data passthrough. |
| `fixtures/jsdoc-integration.real-basic.json` | Real JPHS basic output, with local paths replaced by synthetic absolute paths for adapter sanitation tests. |

## Rules

- Stable semantics should be represented by formal core fields, not by adapter metadata.
- `metadata` is opaque trace data. Consumers may ignore unknown metadata.
- `summary` is a compatibility/render cache. Field-level i18n is the text source of truth.
- Source and i18n resource paths must stay relative and must not escape with `..`.
- Diagnostics use stable `code`, `severity`, human-readable `message`, optional `targetPath/path` and optional machine-readable `data`.
- LSP resource index data is derived from core documents and should not be written back into core documents.
- IDE/LSP capability and resource action data are view and ownership contracts. IDE shells should consume LSP/CLI/renderer surfaces instead of duplicating HIA semantics.
- Renderer and CLI manifests are layered: renderer owns rendered file metadata, CLI owns filesystem output placement.

## Related Docs

- `docs/core-fixture-contract.md`
- `docs/configuration.md`
- `docs/adapter-authoring-notes.md`
- Package READMEs under `packages/*/README.md` and `apps/*/README.md`
