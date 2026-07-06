# @hia-doc/parser-jsdoc

JSDoc integration adapter for HIA core documents.

This package consumes the `hia-jsdoc-integration` JSON emitted by `@mandolin/jsdoc-plugin-hia-sys` and converts it into the language-neutral `@hia-doc/core` document shape.

## Current Scope

- Reads JSDoc Integration JSON objects.
- Maps integration nodes to `HiaSymbol` entries.
- Converts JPHS field-level i18n and source metadata into core model names.
- Preserves selected adapter metadata without leaking local absolute file paths.
- Provides a bridge fixture for core, renderer, CLI and future LSP tests.

## Compatibility Baseline

The adapter exposes bridge and metadata version constants:

- `JSDOC_ADAPTER_NAME`
- `JSDOC_ADAPTER_CORE_BRIDGE_VERSION`
- `JSDOC_ADAPTER_METADATA_SCHEMA_VERSION`
- `JSDOC_HIA_INTEGRATION_CONTRACT`
- `JSDOC_HIA_INTEGRATION_CONTRACT_VERSION`

Converted documents include adapter metadata on the document and symbol metadata on each converted symbol. Metadata and diagnostic `data` are sanitized before they enter the core document: local absolute paths, traversal paths and `filePath` fields are removed.

The compatibility fixtures are:

- `fixtures/jsdoc-integration.basic.json`
- `fixtures/jsdoc-integration.compat.json`
