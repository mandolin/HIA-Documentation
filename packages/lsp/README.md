# @hia-doc/lsp

Language Server Protocol layer for HIA documents.

The diagnostics core consumes `@hia-doc/core` documents. Language-specific data, such as JSDoc Integration JSON, should be converted by an adapter package before it reaches the LSP layer.

## Current Scope

- Minimal initialize/shutdown service state.
- In-memory text document manager for tests and future IDE shells.
- Diagnostics over core documents:
  - core validator diagnostics;
  - missing i18n locales;
  - duplicate inline i18n keys;
  - unresolved or incomplete source references.
- Resource index over managed core documents:
  - external i18n resource paths;
  - inline i18n keys and paths;
  - missing locale entries;
  - source references and source fragments.
- Node LSP transport entry for future VS Code integration.
- Custom request: `hia/documentResourceIndex`.
