# HIA Contract Index

This page summarizes the first stable contract baseline implemented in this monorepo.

## Version Snapshot

| Surface | Export / file | Version |
| --- | --- | --- |
| Core document schema | `HIA_CORE_CONTRACT_VERSION` / `HIA_DOCUMENT_SCHEMA_VERSION` | `0.2.0` |
| Text i18n model | `HIA_TEXT_I18N_MODEL_VERSION` | `0.2.0` |
| Source model | `HIA_SOURCE_MODEL_VERSION` | `0.2.0` |
| Config schema | `HIA_CONFIG_SCHEMA_VERSION` | `0.1.0` |
| Documentation profile schema | `HIA_PROFILE_SCHEMA_VERSION` | `0.1.0-draft` |
| Official profile catalog | `HIA_OFFICIAL_PROFILE_CATALOG_VERSION` | `0.1.0-draft` |
| Schema distribution catalog | `HIA_SCHEMA_CATALOG_VERSION` | `0.1.0-draft` |
| Doc source map schema | `DOC_SOURCE_MAP_SCHEMA_VERSION` | `0.1.0-draft` |
| Documentation producer descriptor/result | `DOCUMENTATION_PRODUCER_CONTRACT_VERSION` | `0.1.0-draft` |
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
| Documentation profile runtime | `@hia-doc/profile` | Loads, validates, normalizes and queries tag/rule/mapping/diagnostic profile registries. Profile is not part of the core document IR. |
| Official profile distribution | `@hia-doc/profiles` | Distributes official profile JSON, catalog metadata and defensive-copy accessors. |
| Schema distribution | `@hia-doc/schemas` | Distributes owner-preserving schema snapshots and catalog metadata without taking over contract ownership. |
| Doc source map tooling | `@hia-doc/source-linkage` | Owns the main-repo schema, semantic path/privacy validator and normalized index for the neutral `doc-source-map` contract. |
| Documentation producer | `@hia-doc/plugin-sdk` | Owns descriptor/request/result types, schemas, semantic validation and single-run execution helper; it does not load modules or orchestrate builds. |
| Renderer manifest | `@hia-doc/renderer-html` | Renderer output summary. CLI may wrap it into a build output manifest. |
| Project docs manifest | `@hia-doc/cli` | CLI input contract for aggregating JS, CSS, HTML extraction and doc-source-map artifacts into one rendered project page. It is outside core IR. |
| LSP resource index | `@hia-doc/lsp` | IDE view model derived from core documents. It is not a core source of truth. |
| IDE/LSP capability | `@hia-doc/lsp` and IDE shells | Capability ownership, profile-derived authoring data, authoring boundary and resource action/preflight data, consumed by IDE shells. |
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
| `fixtures/project-mixed.hia-project.json` | Project aggregation manifest combining JS, CSS, HTML and doc-source-map artifacts. |
| `fixtures/project-mixed-alert.htmdoc.json` | HTMDoc-style extraction artifact consumed by the project aggregation fixture. |
| `fixtures/project-mixed-alert.cssdoc.json` | CSSDoc-style extraction artifact consumed by the project aggregation fixture. |
| `fixtures/project-mixed-alert.docmap.json` | Documentation source map artifact referenced by the project aggregation fixture. |
| `fixtures/producer/basic.producer-descriptor.json` | Valid documentation producer descriptor fixture. |
| `fixtures/producer/basic.producer-result.json` | Valid serializable producer result with extraction/core/source-linkage artifacts. |

## Rules

- Stable semantics should be represented by formal core fields, not by adapter metadata.
- `metadata` is opaque trace data. Consumers may ignore unknown metadata.
- `summary` is a compatibility/render cache. Field-level i18n is the text source of truth.
- Source and i18n resource paths must stay relative and must not escape with `..`.
- Diagnostics use stable `code`, `severity`, human-readable `message`, optional `targetPath/path` and optional machine-readable `data`.
- Documentation profile is the shared tag/rule/mapping/diagnostic configuration layer. It should not replace parser, extractor, adapter or renderer responsibilities.
- LSP and IDE shells may consume normalized documentation profile runtime data for completion, hover and capability summaries, but should not redefine profile semantics.
- Project docs manifests are explicit aggregation manifests. They should reference language extraction artifacts instead of making the CLI parse source languages directly.
- Documentation producers are explicitly configured wrappers around standalone doc-line APIs; core and the plugin SDK do not depend on language satellite packages.
- LSP resource index data is derived from core documents and should not be written back into core documents.
- IDE/LSP capability and resource action data are view and ownership contracts. IDE shells should consume LSP/CLI/renderer surfaces instead of duplicating HIA semantics.
- Renderer and CLI manifests are layered: renderer owns rendered file metadata, CLI owns filesystem output placement.

## Related Docs

- `docs/core-fixture-contract.md`
- `docs/versioning.md`
- `docs/compatibility-matrix.md`
- `docs/configuration.md`
- `docs/profile-authoring-guide.md`
- `docs/profile-distribution.md`
- `docs/schema-distribution.md`
- `docs/migration-guide.md`
- `docs/project-manifest-guide.md`
- `docs/unified-html-demo.md`
- `docs/user-acceptance-checklist.md`
- `docs/ide-usage.md`
- `docs/release-governance.md`
- `docs/security-policy.md`
- `packages/profile/README.md`
- `docs/ide-integration-boundary.md`
- `docs/adapter-authoring-notes.md`
- Package READMEs under `packages/*/README.md` and `apps/*/README.md`
