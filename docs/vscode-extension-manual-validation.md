# VS Code Extension Manual Validation

This checklist verifies the first VS Code shell for HIA Documentation.

## Prerequisites

```bash
mise install
pnpm install
pnpm run build
```

## Launch

1. Open `main-repo/` in VS Code.
2. Open `apps/vscode-extension/src/extension.ts`.
3. Start an Extension Development Host through VS Code extension debugging.
4. In the Extension Development Host, open `main-repo/`.

## Validate LSP Diagnostics

1. Open `fixtures/basic.hia.json`.
2. Confirm the file is recognized as `hia`.
3. Confirm no diagnostics are shown for the valid fixture.
4. Temporarily change `defaultLocale` to a value not listed in `locales`.
5. Confirm the LSP reports a validation diagnostic.
6. Revert the temporary edit.

## Validate Commands

Open the Command Palette and run:

- `HIA: Show Output`
- `HIA: Validate Workspace`
- `HIA: Build Docs`
- `HIA: Open Preview`

Expected results:

- `HIA: Show Output` opens the HIA output channel.
- `HIA: Validate Workspace` writes a resource summary for the active `.hia.json` document.
- `HIA: Build Docs` invokes the shared CLI and writes `dist/docs/index.html`.
- `HIA: Open Preview` opens `dist/docs/index.html` in the default browser.

## Current Boundaries

- Preview uses the generated file path instead of a VS Code Webview.
- Validation summary uses the LSP resource index; full code actions, completion and hover are deferred.
- Build command delegates to the CLI and does not parse or render documents inside the extension.
