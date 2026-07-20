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
- Adds `review-surface.json` as the first Visual Studio review tool-window input contract:
  - consume `hia-documentation-review-payload@0.1.0-draft`;
  - show review list, review detail, draft text, locale-quality counts and read-only edit candidate preview;
  - expose copy/open-context actions only;
  - keep apply disabled until a later human-approved WorkspaceEdit contract exists.

## Boundaries

The Visual Studio host does not parse language source, run producers, generate HTML, parse generated HTML, embed source contents, auto-apply edit candidates, or write target project files directly.

Workspace edits, VSIX packaging and Marketplace publishing are not part of this skeleton. Reviewable edit proposals are metadata for human approval, not directly applicable edits. Full WorkspaceEdit support requires a later implementation step with a Visual Studio SDK dependency and explicit privacy/review gates.

## Review Surface

`review-surface.json` is deliberately host-facing but implementation-neutral. A future Visual Studio tool window should map it to native UI controls, while the data still comes from the shared HIA LSP and AI authoring contracts. For HIA-ASPNETPortal and other .NET targets, the first useful path is reviewing DotNetDoc proposals inside Visual Studio, copying approved draft text, and opening workspace-relative context; direct target repository mutation remains outside this phase.

## Validation

From the repository root:

```powershell
pnpm run visual-studio:check
```

The check validates `host-contract.json`, the zero-dependency skeleton package and the privacy boundary for the Visual Studio host.
