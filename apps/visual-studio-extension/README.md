# HIA Documentation Visual Studio Extension

Visual Studio extension skeleton and host contract mapping for HIA Documentation.

This app is the Visual Studio counterpart to the VS Code and browser DevTools hosts. It is intentionally separate from `apps/vscode-extension` so Visual Studio-specific commands, tool windows and shell APIs can evolve without leaking into the VS Code client.

## Current Scope

- Declares the Visual Studio host directory under `apps/visual-studio-extension`.
- Records a hybrid integration model:
  - VisualStudio.Extensibility owns commands and tool-window presentation.
  - Visual Studio LSP client support connects to `@hia-doc/lsp`.
  - `@hia-doc/cli` remains responsible for documentation builds.
- Maps HIA custom requests used by the future Visual Studio host:
  - `hia/ideCapabilities`
  - `hia/documentSourceMapIndex`
  - `hia/projectRelationGraph`
  - `hia/resourceActions`
  - `hia/documentationEditProposals`
- Requires additive `hia-lsp-host-result@0.1.0-draft` metadata for source-linkage and relation graph fallback decisions.
- Records the first AI-assisted authoring route as reviewable proposal data only; the Visual Studio host must present review/confirm/cancel and must not auto-write target files.

## Boundaries

The Visual Studio host does not parse language source, run producers, generate HTML, parse generated HTML, embed source contents, or write target project files directly.

Workspace edits, VSIX packaging and Marketplace publishing are not part of this skeleton. Reviewable edit proposals are metadata for human approval, not directly applicable edits. Full WorkspaceEdit support requires a later implementation step with a Visual Studio SDK dependency and explicit privacy/review gates.

## Validation

From the repository root:

```powershell
pnpm run visual-studio:check
```

The check validates `host-contract.json`, the zero-dependency skeleton package and the privacy boundary for the Visual Studio host.
