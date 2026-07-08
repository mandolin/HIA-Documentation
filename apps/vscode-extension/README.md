# HIA Documentation VS Code Extension

VS Code extension shell for HIA Documentation.

The extension starts the shared `@hia-doc/lsp` server and connects it through `vscode-languageclient`. It does not parse JSDoc, generate HTML, or duplicate core diagnostics.

VS Code is the first IDE shell for HIA Documentation. Other IDE integrations should reuse the LSP and CLI surfaces described in `../../docs/ide-integration-boundary.md`.

## Current Scope

- Activates on `.hia.json` documents and HIA commands.
- Creates a HIA output channel.
- Starts the local HIA LSP server over stdio.
- Registers the `.hia.json` language id as `hia`.
- Lets the LSP client surface HIA diagnostics, completion, hover, definition and folding providers.
- Adds a safe quick fix command for diagnostics with LSP-provided related locations.
- Adds resource action quick fixes backed by the LSP:
  - open external resources or source targets;
  - copy i18n key/path values;
  - show missing-locale stub preflight reports without writing files.
- Provides command entries:
  - `HIA: Show Output`
  - `HIA: Build Docs`
  - `HIA: Open Preview`
  - `HIA: Validate Workspace`

`HIA: Build Docs` delegates to the shared CLI and reads `hia.build.*` workspace settings, including project manifest builds. `HIA: Open Preview` reads the generated manifest when available, opens the manifest entrypoint, and warns when the preview may be stale. `HIA: Validate Workspace` asks the LSP server for capability, profile, resource index, authoring location and resource action data, then writes a validation report to the HIA output channel.

The extension does not parse JSDoc, generate HTML directly, or duplicate core diagnostics.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `hia.build.config` | empty | Passed to `hia docs build --config`. |
| `hia.build.input` | empty | Passed to `hia docs build --input`. |
| `hia.build.jsdocIntegration` | empty | Passed to `hia docs build --jsdoc-integration`. |
| `hia.build.projectManifest` | empty | Passed to `hia docs build --project-manifest`. |
| `hia.build.out` | `dist/docs` | Passed to `hia docs build --out`. |
| `hia.build.locale` | empty | Passed to `hia docs build --locale`. |
| `hia.build.manifest` | `hia-manifest.json` | Passed to `hia docs build --manifest`; read by `HIA: Open Preview`. |
| `hia.preview.path` | `dist/docs/index.html` | Fallback file opened by `HIA: Open Preview` when no manifest entrypoint is available. |
