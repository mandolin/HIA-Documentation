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

## Validate Authoring Providers

1. Open `fixtures/i18n-resource.hia.json`.
2. Trigger completion inside the file and confirm HIA locale/key/resource candidates are available.
3. Hover over the document and confirm the HIA document summary is shown.
4. Run Go to Definition from the document and confirm VS Code can navigate to external resource or source locations when the target exists.
5. Open `fixtures/source-reference.hia.json` and confirm source reference completions include `NORMALIZE_SERIES`.

## Validate Diagnostic Quick Fix

1. Open `fixtures/source-reference.hia.json`.
2. Confirm the unresolved `MISSING_FRAGMENT` source reference diagnostic is reported.
3. Open the lightbulb or Quick Fix menu on the diagnostic.
4. Confirm `HIA: Explain Unavailable Location` is offered for unresolved targets.
5. Confirm the command writes the unavailable reason to the HIA output channel.

## Validate Resource Actions

1. Open `fixtures/i18n-resource.hia.json`.
2. Open the lightbulb or Quick Fix menu in the document.
3. Confirm resource actions backed by the LSP are offered, including opening an external resource and copying an i18n key/path.
4. Run a copy action and confirm the HIA output channel reports the copied key/path.
5. For a document with a missing locale and external resource target, confirm the stub action writes a preflight report to the HIA output channel instead of changing files.

## Validate Commands

Open the Command Palette and run:

- `HIA: Show Output`
- `HIA: Validate Workspace`
- `HIA: Build Docs`
- `HIA: Open Preview`
- `HIA: Open Source Linkage`

Expected results:

- `HIA: Show Output` opens the HIA output channel.
- `HIA: Validate Workspace` writes a capability-driven report for the active `.hia.json` document, including diagnostics, resources, authoring locations, resource actions, capability status and unavailable reasons.
- `HIA: Build Docs` invokes the shared CLI and writes the configured output directory.
- `HIA: Open Preview` opens the configured preview HTML file in the default browser.
- `HIA: Open Source Linkage` offers a source-linkage entry followed by native original-source, generated-artifact, documentation-preview and copy-id actions.

## Validate Source Linkage Host

Before opening VS Code, prepare the fixture and runtime evidence file:

```bash
pnpm run build
pnpm run vscode:source-linkage:evidence
```

The script writes `dist/vscode-source-linkage-runtime-evidence/evidence.json`. It records the VS Code CLI version, rebuilt fixture preview, indexed doc-source-map summary, expected navigation targets and an isolated Extension Development Host launch command.

1. In the Extension Development Host, open `fixtures/source-linkage-host/` as the workspace folder.
2. Run `HIA: Build Docs`; the fixture settings write the generated documentation preview to `temp/docs/`.
3. Open `docs/profile-card.docmap.json` and run `HIA: Open Source Linkage`.
4. Select `html:component:profile-card`.
5. Choose `Open original source: src/profile-card.html`; confirm VS Code opens and selects the documented component source.
6. Run the command again and choose `Open generated artifact: build/profile-card.html`; confirm VS Code opens the generated HTML artifact.
7. Run the command once more and choose `Open documentation preview`; confirm the existing preview workflow opens the fixture documentation.
8. Confirm the HIA output channel records the selected source/generated file paths as workspace-relative paths.

The host only accepts targets that remain inside the selected workspace. An absolute path, UNC path, drive-qualified path or `..` escape is rejected before VS Code attempts to open it.

## Validate Settings

Add a workspace `.vscode/settings.json` or temporary user settings:

```json
{
  "hia.build.input": "fixtures/basic.hia.json",
  "hia.build.out": "dist/docs",
  "hia.build.locale": "en",
  "hia.build.manifest": "hia-manifest.json",
  "hia.preview.path": "dist/docs/index.html"
}
```

Then run:

1. `HIA: Build Docs`.
2. Confirm the HIA output channel logs the CLI arguments.
3. Confirm `dist/docs/index.html` exists.
4. Confirm `dist/docs/hia-manifest.json` exists and contains `entrypoint`.
5. Run `HIA: Open Preview`.
6. Confirm the HIA output channel logs a preview report with `Strategy: generated-html`, manifest path and preview file.
7. Remove or reset the temporary settings after validation.

For project manifest builds, use:

```json
{
  "hia.build.projectManifest": "fixtures/project-mixed.hia-project.json",
  "hia.build.out": "dist/project-docs",
  "hia.preview.path": "dist/project-docs/index.html"
}
```

Then run `HIA: Build Docs` and confirm the output channel logs `--project-manifest fixtures/project-mixed.hia-project.json`.

Confirm the generated output also passes the CLI/renderer acceptance checks in `docs/user-acceptance-checklist.md`.

## Validate Preview Stale Feedback

1. Run `HIA: Build Docs`.
2. Edit and save the active `.hia.json` document without rebuilding.
3. Run `HIA: Open Preview`.
4. Confirm VS Code warns that the preview may be stale and offers `Open Preview` and `Build Docs`.
5. Choose `Build Docs` and confirm the CLI runs.
6. Run `HIA: Open Preview` again and confirm the generated HTML opens.

## Validate Failure Feedback

1. Open a VS Code window without a workspace folder and run `HIA: Build Docs`.
2. Confirm a warning asks for a workspace folder.
3. Set `hia.preview.path` to a missing HTML file and run `HIA: Open Preview`.
4. Confirm a warning asks to run build first and the output channel logs the missing path.

## Current Boundaries

- Preview uses the generated file path instead of a VS Code Webview.
- Preview reads the CLI output manifest when present and falls back to `hia.preview.path`.
- Validation summary uses LSP capability, resource index, authoring location and diagnostics data.
- Quick Fix support consumes LSP diagnostic related locations and resource actions.
- Resource edit quick fixes currently show preflight data only; they do not create or modify resource files.
- Webview/preview server is deferred until a separate preview planning record is started.
- Resource edit WorkspaceEdit and inline/external resource conversion are deferred to the resource editing plan.
- Build command delegates to the CLI and does not parse or render documents inside the extension.
