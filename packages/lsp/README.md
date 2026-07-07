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
- Diagnostic `data` is preserved for core diagnostics and added for LSP-owned diagnostics.
- Diagnostics include LSP `relatedInformation` and machine-readable `relatedLocations` when the target can be mapped to a HIA authoring location.
- Resource index over managed core documents:
  - external i18n resource paths;
  - inline i18n keys and paths;
  - missing locale entries;
  - source references and source fragments.
- Authoring capability surface:
  - custom capability request;
  - custom authoring location request;
  - custom resource action request;
  - i18n/source completion candidates;
  - document hover summary;
  - definition locations for external resources and source ranges;
  - unavailable reason codes for unsafe paths, missing workspace roots and unresolved source fragments;
  - JSON folding ranges for HIA documents.
- Resource actions for IDE shells:
  - open external resources or source targets;
  - copy i18n key/path values;
  - return missing-locale stub preflight data without writing files.
- Node LSP transport entry for future VS Code integration.
- Custom request: `hia/documentResourceIndex`.
- Custom request: `hia/ideCapabilities`.
- Custom request: `hia/documentAuthoringLocations`.
- Custom request: `hia/resourceActions`.

## Contract

The LSP resource index is an IDE view model derived from core documents. It is not written back into the core document IR.

See `docs/contract-index.md`, `docs/ide-integration-boundary.md` and the IDE/LSP capability contract for the current boundary between core documents, diagnostics, authoring capabilities and IDE views.
