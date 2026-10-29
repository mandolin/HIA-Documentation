# @hia-doc/parser-jsdoc

## 1.0.0 source candidate

This source tree targets a coordinated 1.0.0 package candidate. It does not
announce npm availability. See the [package migration guide](../../docs/package-v1-migration.md)
for matching dependencies, artifact versions and source compatibility.

中文：当前为1.0.0源码候选，实际发布及工件版本请分别核对迁移说明。


JSDoc integration adapter for HIA core documents.

This package consumes the `hia-jsdoc-integration` JSON emitted by `@mandolin/jsdoc-plugin-hia-sys` and converts it into the language-neutral `@hia-doc/core` document shape.

## Current Scope

- Reads JSDoc Integration JSON objects.
- Maps integration nodes to `HiaSymbol` entries.
- Converts JPHS field-level i18n and source metadata into core model names.
- Filters undocumented JSDoc-derived synthetic nodes before they enter core.
- Deduplicates repeated symbol ids and repeated source references/fragments.
- Normalizes JPHS compatibility values such as `currentPage` source links and `hint` diagnostics.
- Screens recognizable local absolute paths from selected adapter metadata.
- Provides a bridge fixture for core, renderer, CLI and future LSP tests.

## Compatibility Baseline

The adapter exposes bridge and metadata version constants:

- `JSDOC_ADAPTER_NAME`
- `JSDOC_ADAPTER_CORE_BRIDGE_VERSION`
- `JSDOC_ADAPTER_METADATA_SCHEMA_VERSION`
- `JSDOC_HIA_INTEGRATION_CONTRACT`
- `JSDOC_HIA_INTEGRATION_CONTRACT_VERSION`

Converted documents include adapter metadata on the document and symbol metadata on each converted symbol. Recognizable local absolute paths, traversal paths, and file URLs are screened from adapter metadata. Diagnostic codes, text, paths, and structured data additionally screen common credential forms while retaining safe values. An integration contract mismatch still produces a warning while safe symbols convert. Producers remain responsible for private prose that has no recognizable marker; this adapter does not act as a general-purpose secret classifier.

The compatibility fixtures are:

- `fixtures/jsdoc-integration.basic.json`
- `fixtures/jsdoc-integration.compat.json`
- `fixtures/jsdoc-integration.real-basic.json`

`jsdoc-integration.real-basic.json` is generated from the JPHS basic example, with local machine paths replaced by synthetic absolute paths. It intentionally preserves the real producer shape so the adapter can prove it cleans metadata, removes synthetic nodes, normalizes source link mode and emits a valid core document.

See `docs/adapter-authoring-notes.md` and `docs/contract-index.md` for the adapter-to-core boundary.
