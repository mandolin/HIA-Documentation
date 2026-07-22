# HIA Documentation Visual Studio Extension

Visual Studio extension skeleton and host contract mapping for HIA Documentation.

This app is the Visual Studio counterpart to the VS Code and browser DevTools hosts. It is intentionally separate from `apps/vscode-extension` so Visual Studio-specific commands, tool windows and shell APIs can evolve without leaking into the VS Code client.

## Current Scope

- Declares the Visual Studio host directory under `apps/visual-studio-extension`.
- Records a hybrid integration model:
  - VisualStudio.Extensibility owns commands and tool-window presentation.
  - Visual Studio LSP client support connects to `@hia-doc/lsp`.
  - `@hia-doc/cli` remains responsible for documentation builds.
- Pins the current runtime status as `contract-level-runtime-prep`; real Visual Studio runtime capture, VSIX packaging and experimental instance execution are all explicitly not claimed yet.
- Requires dependency and license audit before any future VSIX implementation route is selected.
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
  - show provider result/refusal taxonomy, blocked review shape, review-only output boundary and target-owner handoff through `providerReviewPanel`;
  - expose W-P43 host-owned apply UX requirements, provider review linkage, target-owner evidence and deferred gates as read-only `hostApplyUx` data;
  - expose copy/open-context actions only;
  - keep apply disabled until a later human-approved WorkspaceEdit contract exists.

## Boundaries

The Visual Studio host does not parse language source, run producers, generate HTML, parse generated HTML, embed source contents, auto-apply edit candidates, or write target project files directly.

Workspace edits, VSIX packaging and Marketplace publishing are not part of this skeleton. Reviewable edit proposals are metadata for human approval, not directly applicable edits. Full WorkspaceEdit support requires a later implementation step with a Visual Studio SDK dependency and explicit privacy/review gates.

## Review Surface

`review-surface.json` is deliberately host-facing but implementation-neutral. A future Visual Studio tool window should map it to native UI controls, while the data still comes from the shared HIA LSP and AI authoring contracts. For HIA-ASPNETPortal and other .NET targets, the first useful path is reviewing DotNetDoc proposals inside Visual Studio, copying approved draft text, and opening workspace-relative context; direct target repository mutation remains outside this phase.

The W-P43 `hostApplyUx` section is also read-only. It can show that provider review, target-owner evidence and deferred gates are visible, but it must not imply checked apply write, provider/network execution, target command execution or real Visual Studio runtime capture.

The `providerReviewPanel` section is a review linkage contract, not a provider execution API. It may display provider result/refusal taxonomy and target-owner handoff state, but it must keep provider output review-only and must not grant workspace or target repository write authority.

## Validation

From the repository root:

```powershell
pnpm run visual-studio:check
```

The check validates `host-contract.json`, the zero-dependency skeleton package and the privacy boundary for the Visual Studio host.

W-P39 runtime preparation evidence can be refreshed with:

```powershell
pnpm run wp39:visual-studio-runtime-prep:evidence
```

That packet records the current route decision and manual preparation checklist. It does not build a VSIX or claim real Visual Studio runtime capture.
