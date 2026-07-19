# IDE Integration Boundary

This document describes how IDE shells should integrate with HIA Documentation without duplicating core semantics.

## Layer Ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| `@hia-doc/core` | HIA document, diagnostics, i18n, source and protocol primitives | IDE APIs, CLI processes, rendered HTML |
| Adapters | Language-specific input conversion into core documents | IDE UI, renderer output |
| `@hia-doc/lsp` | Diagnostics, resource index, source-linkage query, profile-derived authoring data, authoring queries, locations, resource actions and capability data | VS Code commands, HTML generation, JSDoc parsing, profile rule definitions |
| `@hia-doc/cli` | Build execution, config loading, adapter bridge input and renderer invocation | IDE UI and LSP providers |
| `@hia-doc/renderer-html` | HTML output, assets and renderer manifest | IDE commands and workspace edits |
| IDE shells | Editor APIs, commands, menus, output/log panels and user feedback | HIA semantic parsing, JSDoc parsing, HTML generation |

## Reusable LSP Surface

IDE shells should consume the standard LSP providers first:

- diagnostics
- completion
- hover
- definition
- folding ranges

HIA-specific data is available through custom requests under the `hia/` namespace:

- `hia/documentResourceIndex`
- `hia/documentSourceMapIndex`
- `hia/projectRelationGraph`
- `hia/ideCapabilities`
- `hia/documentAuthoringLocations`
- `hia/resourceActions`
- `hia/documentationEditProposals`

Custom request responses are IDE-neutral view models derived from managed core documents, `doc-source-map` manifests or renderer `project-index.json` output. They should not be written back into the core document IR.

`hia/documentSourceMapIndex` and `hia/projectRelationGraph` responses include a `host` metadata object. This object is additive and reports the LSP host result contract, custom request method/version, capability id, result source (`managed-document`, `workspace-runtime` or `none`) and empty state. IDE shells should prefer these machine-readable fields over parsing messages or guessing why a request returned no entries.

`hia/documentationEditProposals` uses the same host metadata pattern and returns `hia-documentation-edit-proposals@0.1.0-draft`. It is the first AI-assisted authoring boundary: the LSP may expose public-safe context, diagnostics, relation/source-linkage summaries and reviewable proposal targets, but it must not expose private source text, embed `sourcesContent`, or return directly applicable edits.

Proposal payloads may include additive `unifiedContext` when the LSP can match the proposal target against workspace `doc-source-map` inputs and renderer `project-index.json` relation data. Hosts should treat this as navigation context for review panels: matched project entries, source-map entries and relation summaries are useful for opening unified documentation or related source/generated artifacts, but they are not write instructions and must not be converted into automatic edits.

When a documentation profile set is available, `hia/ideCapabilities`, completion and hover may include profile-derived tag and diagnostic information. IDE shells should display that data as returned by the LSP and should not implement their own profile registry logic.

## VS Code Baseline

The VS Code extension is the first IDE shell. It provides:

- `.hia.json` activation;
- LSP client startup over stdio;
- HIA output channel;
- build, preview and validation commands;
- related-location quick fixes;
- resource action quick fixes;
- project relation graph navigation through `hia/projectRelationGraph`;
- generated HTML preview opening;
- project manifest build setting pass-through.

The VS Code extension is a presentation and command layer. It does not parse JSDoc, generate HTML, or duplicate core/LSP diagnostics.

## Future IDE Shells

### JetBrains

A JetBrains plugin should prefer an LSP client bridge when possible. IDE-specific actions should map LSP data into IntelliJ intentions, gutter navigation, tool windows and external browser preview.

JetBrains-specific code may own UI placement and command wiring, but should continue to ask the LSP server for HIA diagnostics, locations and resource actions.

### Visual Studio

The Visual Studio host lives under `apps/visual-studio-extension`. It should use a hybrid model: VisualStudio.Extensibility owns commands and tool-window presentation, while the Visual Studio LSP client consumes `@hia-doc/lsp` for diagnostics, authoring data, source-linkage and project relation graph requests.

The Visual Studio host should use `host.capability`, `host.source` and `host.emptyState` from `hia-lsp-host-result` metadata for fallback decisions. Build and preview commands should delegate to the HIA CLI. Resource action preflight data can be presented as lightbulb actions, tool-window reports or output-window reports.

### Neovim

A Neovim integration should use the built-in LSP client for standard providers and call `hia/*` requests for HIA-specific data. Build and preview commands can be thin wrappers around the HIA CLI and generated HTML output.

## Resource Editing

Resource editing is currently limited to action/preflight data:

- open external resources or source targets;
- copy i18n key/path values;
- show missing-locale stub preflight;
- explain unavailable actions.

IDE shells must not write resource files from the current preflight data. Applying resource edits requires a later WorkspaceEdit contract that defines file reads, conflict checks, version handling and undo boundaries.

## AI-Assisted Authoring

The first AI-assisted authoring loop is proposal-only:

- derive proposals from managed HIA documents, diagnostics and resource action preflight data;
- cover missing-locale stubs, missing documentation, missing translation diagnostics, profile-rule suggestions and generic doc-line diagnostics as reviewable proposal kinds;
- summarize document, locale, source-linkage and project-relation context without source bodies;
- include bounded unified output context when project entries, doc-source-map entries or relation graph metadata can be matched;
- require human review before any write;
- let hosts offer review, open target, copy proposal or cancel actions;
- deny auto-apply and write-without-review behavior.

When a later cycle introduces real `WorkspaceEdit` output, it must preserve the same privacy boundary and add explicit conflict/version checks before hosts can apply edits.

## Preview

The cross-IDE preview baseline is generated HTML:

1. Run the HIA CLI build.
2. Read the output manifest when available.
3. Open the generated HTML entrypoint.
4. Warn when source or manifest content is newer than the preview output.

Webview or preview-server integrations require a separate preview planning step.

## Compatibility Rules

- Do not parse diagnostic messages to decide behavior; use diagnostic `data`.
- Do not depend on adapter-private metadata fields.
- Treat unknown fields in `hia/*` responses as forward-compatible additions.
- Use response `host.capability`, `host.source` and `host.emptyState` for LSP host fallback decisions when present.
- Keep source and resource paths relative until an IDE shell resolves them inside a workspace.
- Do not expose local absolute paths in generated documents, diagnostics or logs intended for users.
