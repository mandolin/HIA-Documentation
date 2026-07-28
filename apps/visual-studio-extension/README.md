# HIA Documentation Visual Studio Extension

Buildable Visual Studio extension with localized, read-only review and live authoring projection surfaces plus a real `@hia-doc/lsp` provider.

This app is the Visual Studio counterpart to the VS Code and browser DevTools hosts. It is intentionally separate from `apps/vscode-extension` so Visual Studio-specific commands, tool windows and shell APIs can evolve without leaking into the VS Code client.

## Current Scope

- Provides a real `VisualStudio.Extensibility` project that builds an extension DLL and VSIX package.
- Adds a command under **View > Other Windows** that opens the HIA Documentation tool window.
- Adds a localized, read-only Remote UI tool window with Overview, Authoring, Review and Safety tabs.
- Adds a Language Server tab that follows the provider lifecycle and exposes stable reason codes without local paths or raw exception text.
- Adds a Live Authoring tab backed by an isolated, short-lived LSP projection session over a synthetic HIA fixture.
- Contributes a `LanguageServerProvider` that starts `@hia-doc/lsp` over stdio for `.hia.json` and `.docmap.json` documents.
- Deploys the production LSP package tree into the VSIX under `runtime/lsp`; Node.js `>=20.19.0` remains an explicit host prerequisite.
- Embeds `review-surface.json` as a structured assembly resource and projects only public-safe status, count and boundary fields.
- Uses neutral English `.resx` resources plus Simplified Chinese `zh-Hans` satellite resources for Remote UI text.
- Uses `.vsextension/zh-CN` and `.vsextension/zh-Hans` metadata resources for the command display name.
- Records a hybrid integration model:
  - VisualStudio.Extensibility owns commands and tool-window presentation.
  - Visual Studio LSP client support connects to `@hia-doc/lsp`.
  - `@hia-doc/cli` remains responsible for documentation builds.
- Pins the current implementation status as `install-runtime-captured`; Visual Studio 2022 and Visual Studio 2026 experimental hosts have both exercised the command, localized tool window, packaged language server, and read-only Live Authoring projection.
- Records the completed dependency/license audit and the maintainer's explicit SDK-license acceptance.
- Adds `implementation-baseline.json` as the audited W-P51 implementation route:
  - use the out-of-process `VisualStudio.Extensibility` model;
  - target Visual Studio 2022 and Visual Studio 2026 with `net8.0-windows8.0`;
  - keep the SDK and Build packages private build assets;
  - record explicit acceptance of the Microsoft Visual Studio Add-ons and Extensions license before the first package reference is added.
- Maps HIA custom requests used by the future Visual Studio host:
  - `hia/ideCapabilities`
  - `hia/documentAuthoringLocations`
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
  - show target-owner readiness matrix, evidence completeness, transcript slots and deferred gates through `targetOwnerEvidenceView`;
  - expose W-P43 host-owned apply UX requirements, provider review linkage, target-owner evidence and deferred gates as read-only `hostApplyUx` data;
  - expose copy/open-context actions only;
  - keep apply disabled until a later human-approved WorkspaceEdit contract exists.

## Boundaries

The Visual Studio host does not parse language source, run producers, generate HTML, parse generated HTML, embed source contents, auto-apply edit candidates, or write target project files directly. Parsing and protocol behavior stay in the packaged `@hia-doc/lsp` dependency.

Workspace edits, ordinary-instance installation and Marketplace publishing are not part of this stage. Reviewable edit proposals are metadata for human approval, not directly applicable edits. Full WorkspaceEdit support remains behind later privacy, conflict, review and host-owned write gates.

The checked-in `wp53-snapshot-mutation-readiness.json` is a readiness-only contract for a future, separate Visual Studio mutation route. It records the immutable versioned snapshot and asynchronous `EditorExtensibility.EditAsync` model, final confirmation, fresh-snapshot retry, request-serialization, validation, rollback and redacted-audit requirements. It does not call editor APIs, accept VS Code edit objects, write a workspace, or claim a live mutation.

## Language Server Runtime

`HiaLanguageServerProvider` follows the official `VisualStudio.Extensibility` provider model. Opening an applicable HIA document lets Visual Studio request a duplex stdio connection; the extension starts the deployed `runtime/lsp/dist/node.js` entry with `--stdio` and returns the process streams to the host.

The VSIX carries a physical, hoisted production package tree with no pnpm virtual-store entries or symbolic-link dependency, so the runtime remains self-contained after VSIX extraction. It deliberately does not redistribute Node.js. A compatible Node.js executable must be available on the Visual Studio host `PATH`, or maintainers may set `HIA_DOCUMENTATION_NODE`. `HIA_DOCUMENTATION_LSP_ENTRY` is a diagnostic-only runtime entry override.

Runtime state exposed to Remote UI is public-safe by design. It uses normalized lifecycle states and reason codes such as `lsp-initialized`, `node-runtime-unavailable`, and `packaged-lsp-runtime-not-found`; absolute paths, stderr bodies, credentials, and raw exception messages are not projected.

## Review Surface

`review-surface.json` is deliberately host-facing but implementation-neutral. The current Visual Studio tool window loads its embedded copy with `System.Text.Json` and maps public-safe counts, states, locale markers and safety flags to native Remote UI controls. Proposal bodies and source bodies are not embedded or displayed. The Language Server tab reflects provider lifecycle state.

The W-P51.5 Live Authoring tab starts a separate read-only projection session against the same packaged LSP runtime. It opens only the embedded synthetic fixture and requests `hia/ideCapabilities`, `hia/documentAuthoringLocations`, and `hia/documentationEditProposals`. It reports aggregate capability, location, proposal, draft and privacy states. It does not share or intercept Visual Studio's managed LSP stream, expose fixture/proposal bodies, call host editor APIs, or enable workspace writes.

The W-P43 `hostApplyUx` section remains a read-only input snapshot from before runtime capture. It can show that provider review, target-owner evidence and deferred gates are visible, but it must not imply checked apply write, provider/network execution or target command execution. The separate `runtime-capture/capture.json` contract records the later W-P51.6 host execution.

The `generatedDocumentationBindingProjection` section projects the neutral
`generated-documentation-binding-host-projection@0.1.0-draft` summary into the
Authoring tab. It displays binding, expansion, target, stable-instance-key, and
diagnostic counts plus source-to-target and three-quality-dimension visibility.
It remains an embedded public-safe summary: it does not load sidecar files,
source bodies/ranges, locals values, or editor/write capabilities.

The `providerReviewPanel` section is a review linkage contract, not a provider execution API. It may display provider result/refusal taxonomy and target-owner handoff state, but it must keep provider output review-only and must not grant workspace or target repository write authority.

The `targetOwnerEvidenceView` section is also read-only. It may display readiness matrix counts, evidence completeness, transcript slots and deferred gates, but it must not imply that HIA ran target commands, created a sandbox/branch/PR, received a target-owner transcript or enabled checked apply write.

## Localization

The default UI resources are English. Visual Studio metadata resources are provided for `zh-CN` and `zh-Hans`, while Remote UI strings use a `zh-Hans` satellite resource. In .NET culture fallback, `zh-CN` resolves through `zh-Hans`, so both common Simplified Chinese culture routes receive the Chinese interface.

Command metadata follows the VisualStudio.Extensibility `.vsextension/{locale}/string-resources.json` convention. Tool-window content uses .NET `.resx` resources because it is created by the out-of-process extension and serialized through Remote UI.

## Runtime Capture

W-P51.6 validated the Release candidate in Visual Studio Enterprise 2022 `17.14.36401.2` and Visual Studio Enterprise 2026 `18.0.11205.157`. Both hosts exposed the HIA command and Simplified Chinese tool window, reached `lsp-initialized` from the packaged `vsix-content` runtime, and completed all three isolated read-only Live Authoring requests.

The validated deployment route is the official SDK F5 mode for out-of-process extensions:

```text
/RootSuffix Exp /OopExtDebug
```

`VSIXInstaller` delegates modern `VisualStudio.Extensibility` packages to the central Visual Studio Installer and cannot install them into an arbitrary custom root suffix. W-P51.6 therefore records two successful SDK experimental deployments; ordinary Visual Studio instances were not modified, and ordinary-instance installation is not claimed.

The public-safe capture contract and six reviewed screenshots are in `runtime-capture/`. They omit source bodies, local paths and credentials. Visual Studio 2026 also reported six duplicate Markdown editor-format definitions from a non-HIA editor extension; the HIA-specific error count was zero and all HIA runtime surfaces remained functional.

W-P51 closes the first implementation round without publishing the extension. Microsoft currently documents `VisualStudio.Extensibility` as Preview, while Preview APIs are not eligible for production extensions or Visual Studio Marketplace publication. Ordinary-instance install/uninstall/upgrade validation, an actual stable-versus-preview API usage audit, Node.js runtime distribution UX, Marketplace metadata and the publisher workflow remain explicit later gates.

## Validation

From the repository root:

```powershell
pnpm run visual-studio:check
```

The check validates `host-contract.json`, the source package boundary, the LSP provider and deployment contract, localization, and the privacy boundary for the Visual Studio host.

W-P51 implementation intake evidence can be refreshed with:

```powershell
pnpm run wp51:visual-studio-authoring-intake:evidence
```

The command audits the local Visual Studio extension workloads and freezes the implementation route.

Build the current VSIX with:

```powershell
pnpm run visual-studio:build
```

The build first compiles the TypeScript workspace, creates an ignored production deployment of `@hia-doc/lsp`, and then produces `HiaDocumentation.VisualStudio.dll` and `HiaDocumentation.VisualStudio.vsix` under the ignored project `bin/` directory. Building a package does not claim that the VSIX was installed or exercised in a real Visual Studio runtime.

Refresh the localized review-surface evidence with:

```powershell
pnpm run wp51:visual-studio-localized-review:evidence
```

This command replays the W-P51.1-W-P51.3 evidence chain, rebuilds the Debug VSIX, and verifies localized resources, the embedded review contract, and the no-write boundary.

Refresh the W-P51.4 language-server provider evidence with:

```powershell
pnpm run wp51:visual-studio-language-server:evidence
```

This command rebuilds Debug and Release VSIX packages, verifies the staged LSP dependency tree and stdio provider, and checks the public-safe lifecycle boundary. It still does not install the VSIX or claim a real Visual Studio runtime capture.

Refresh the W-P51.5 authoring/remediation projection evidence with:

```powershell
pnpm run wp51:visual-studio-authoring-projection:evidence
```

This command rebuilds Debug and Release packages, executes all three read-only custom requests against each build-output runtime, checks the W-P50 remediation and generated-binding guidance projection, and verifies the extraction-safe runtime tree. It does not install the VSIX, call Visual Studio editor APIs, or enable workspace writes.

Normalize and verify the W-P51.6 runtime capture with:

```powershell
pnpm run wp51:visual-studio-install-runtime-capture:evidence
```

This command validates the two-host capture contract, JPEG structure and hashes, runtime states, VSIX identity/hash record, and all no-write/privacy assertions. It does not relaunch Visual Studio or install into an ordinary instance.

Prepare the W-P51 closeout and W-P52 generated-binding inputs with:

```powershell
pnpm run wp51:closeout:evidence
```

The closeout consumes existing public-safe evidence only. It does not replay previous stages, launch Visual Studio, install or publish a VSIX, start W-P52, or enable editor/write capabilities.

W-P39 runtime preparation evidence can be refreshed with:

```powershell
pnpm run wp39:visual-studio-runtime-prep:evidence
```

That packet records the current route decision and manual preparation checklist. It does not build a VSIX or claim real Visual Studio runtime capture.
