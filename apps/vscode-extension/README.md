# HIA Documentation VS Code Extension

VS Code extension shell for HIA Documentation.

The extension starts the shared `@hia-doc/lsp` server and connects it through `vscode-languageclient`. It does not parse JSDoc, generate HTML, or duplicate core diagnostics.

## Current Scope

- Activates on `.hia.json` documents and HIA commands.
- Creates a HIA output channel.
- Starts the local HIA LSP server over stdio.
- Registers the `.hia.json` language id as `hia`.
- Provides command entries:
  - `HIA: Show Output`
  - `HIA: Build Docs`
  - `HIA: Open Preview`
  - `HIA: Validate Workspace`

`HIA: Build Docs` delegates to the shared CLI. `HIA: Validate Workspace` asks the LSP server for the active document resource index. The extension still does not parse JSDoc, generate HTML directly, or duplicate core diagnostics.
