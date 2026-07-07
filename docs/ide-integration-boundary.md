# IDE Integration Boundary

This document describes how IDE shells should integrate with HIA Documentation without duplicating core semantics.

## Layer Ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| `@hia-doc/core` | HIA document, diagnostics, i18n, source and protocol primitives | IDE APIs, CLI processes, rendered HTML |
| Adapters | Language-specific input conversion into core documents | IDE UI, renderer output |
| `@hia-doc/lsp` | Diagnostics, resource index, authoring queries, locations, resource actions and capability data | VS Code commands, HTML generation, JSDoc parsing |
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
- `hia/ideCapabilities`
- `hia/documentAuthoringLocations`
- `hia/resourceActions`

Custom request responses are IDE-neutral view models derived from managed core documents. They should not be written back into the core document IR.

## VS Code Baseline

The VS Code extension is the first IDE shell. It provides:

- `.hia.json` activation;
- LSP client startup over stdio;
- HIA output channel;
- build, preview and validation commands;
- related-location quick fixes;
- resource action quick fixes;
- generated HTML preview opening.

The VS Code extension is a presentation and command layer. It does not parse JSDoc, generate HTML, or duplicate core/LSP diagnostics.

## Future IDE Shells

### JetBrains

A JetBrains plugin should prefer an LSP client bridge when possible. IDE-specific actions should map LSP data into IntelliJ intentions, gutter navigation, tool windows and external browser preview.

JetBrains-specific code may own UI placement and command wiring, but should continue to ask the LSP server for HIA diagnostics, locations and resource actions.

### Visual Studio

A Visual Studio extension should use the LSP surface for document authoring features and delegate build/preview to the HIA CLI. Resource action preflight data can be presented as lightbulb actions or output-window reports.

### Neovim

A Neovim integration should use the built-in LSP client for standard providers and call `hia/*` requests for HIA-specific data. Build and preview commands can be thin wrappers around the HIA CLI and generated HTML output.

## Resource Editing

Resource editing is currently limited to action/preflight data:

- open external resources or source targets;
- copy i18n key/path values;
- show missing-locale stub preflight;
- explain unavailable actions.

IDE shells must not write resource files from the current preflight data. Applying resource edits requires a later WorkspaceEdit contract that defines file reads, conflict checks, version handling and undo boundaries.

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
- Keep source and resource paths relative until an IDE shell resolves them inside a workspace.
- Do not expose local absolute paths in generated documents, diagnostics or logs intended for users.

