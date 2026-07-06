# HIA Documentation VS Code Extension

VS Code extension shell for HIA Documentation.

The extension starts the shared `@hia-doc/lsp` server and connects it through `vscode-languageclient`. It does not parse JSDoc, generate HTML, or duplicate core diagnostics.

## Current Scope

- Activates on `.hia.json` documents and the `HIA: Show Output` command.
- Creates a HIA output channel.
- Starts the local HIA LSP server over stdio.
- Registers the `.hia.json` language id as `hia`.
- Leaves build, preview and workspace validation commands for the next planning step.
