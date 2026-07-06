# @hia-doc/parser-jsdoc

JSDoc integration adapter for HIA core documents.

This package consumes the `hia-jsdoc-integration` JSON emitted by `@mandolin/jsdoc-plugin-hia-sys` and converts it into the language-neutral `@hia-doc/core` document shape.

## Current Scope

- Reads JSDoc Integration JSON objects.
- Maps integration nodes to `HiaSymbol` entries.
- Converts JPHS field-level i18n and source metadata into core model names.
- Preserves selected adapter metadata without leaking local absolute file paths.
- Provides a bridge fixture for core, renderer, CLI and future LSP tests.
