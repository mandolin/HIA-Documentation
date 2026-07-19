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
- Source-linkage index over managed `doc-source-map` documents:
  - symbol/source/artifact query;
  - additive `host` result metadata with request method, request version, capability id, result source and empty state;
  - workspace `hia.config.json` plus project manifest loading for configured `doc-source-map` inputs;
  - watched-file reload hook for workspace runtime refresh.
- Project relation graph view over managed `project-index.json` documents:
  - entry/source/generated/endpoint relation graph projection;
  - additive `host` result metadata with request method, request version, capability id, result source and empty state;
  - workspace `hia.config.json` plus `docs.output/project-index.json` loading;
  - unavailable fallback when a project index or relation graph is missing;
  - capability summary through `hia.projectRelationGraph.query`.
- Authoring capability surface:
  - custom capability request;
  - custom authoring location request;
  - custom resource action request;
  - i18n/source completion candidates;
  - profile-driven tag completion candidates from `@hia-doc/profile`;
  - document hover summary;
  - profile summary in hover/capability responses when a profile set is supplied;
  - definition locations for external resources and source ranges;
  - unavailable reason codes for unsafe paths, missing workspace roots and unresolved source fragments;
  - JSON folding ranges for HIA documents.
- Resource actions for IDE shells:
  - open external resources or source targets;
  - copy i18n key/path values;
  - return missing-locale stub preflight data without writing files.
- Reviewable documentation edit proposals for AI-assisted authoring:
  - derived from existing diagnostics and resource action preflight data;
  - public-safe context only;
  - additive unified output context for matched project entries, doc-source-map entries and relation metadata;
  - no embedded `sourcesContent`;
  - no directly applicable WorkspaceEdit;
  - explicit human review/confirm/cancel boundary for IDE hosts.
- Node LSP transport entry for future VS Code integration.
- Custom request: `hia/documentResourceIndex`.
- Custom request: `hia/documentSourceMapIndex`.
- Custom request: `hia/projectRelationGraph`.
- Custom request: `hia/ideCapabilities`.
- Custom request: `hia/documentAuthoringLocations`.
- Custom request: `hia/resourceActions`.
- Custom request: `hia/documentationEditProposals`.

## Contract

The LSP resource index is an IDE view model derived from core documents. It is not written back into the core document IR.

The LSP source-linkage index is an IDE view model derived from `doc-source-map` manifests and `@hia-doc/source-linkage`. It is a query surface for navigation; it does not execute producers or mutate project manifests.

The LSP project relation graph is an IDE view model derived from renderer `project-index.json` output. It exposes project-level entry/source/generated/endpoint relations for host navigation; it does not parse renderer HTML, embed source previews or run producers.

`hia/documentSourceMapIndex` and `hia/projectRelationGraph` include an additive `host` metadata object. IDE and DevTools hosts can use it to identify the result contract, custom request version, capability id, data source (`managed-document`, `workspace-runtime` or `none`) and empty state without parsing human-readable messages. Existing response payload fields remain unchanged.

`hia/documentationEditProposals` returns `hia-documentation-edit-proposals@0.1.0-draft`. The first slice turns missing-locale resource preflight data into reviewable proposals for host or AI-assisted authoring flows. It intentionally returns public-safe context, `sourcesContentPolicy: none`, `allowsAutomaticWrites: false` and `requiresHumanReview: true`.

The proposal model also carries additive proposal kinds for missing documentation, missing translation diagnostics, profile-rule suggestions and generic doc-line diagnostics. These kinds are target and diagnostic summaries for review workflows only; they still do not contain private source bodies or directly applicable `WorkspaceEdit` payloads.

When workspace runtime data is available, each proposal may include additive `unifiedContext`. This bounded context can point to matched project navigation entries, `doc-source-map` entries and relation graph metadata so IDE or AI review panels can open the surrounding unified documentation context. It carries identifiers, relative paths, ranges and relation metadata only; it must not carry source bodies or embedded `sourcesContent`.

Profile data is supplied as a normalized `@hia-doc/profile` runtime set. The LSP consumes profile tags, diagnostics and capability metadata, but it does not load language source files or redefine profile semantics.

See `docs/contract-index.md`, `docs/ide-integration-boundary.md` and the IDE/LSP capability contract for the current boundary between core documents, diagnostics, authoring capabilities and IDE views.
