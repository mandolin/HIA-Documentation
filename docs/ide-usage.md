# IDE Usage Guide

The first IDE shell is the HIA Documentation VS Code extension. It connects to `@hia-doc/lsp` and delegates builds to the shared CLI.

The IDE layer does not parse JSDoc, generate HTML, or duplicate profile semantics.

## Current Capabilities

- `.hia.json` language activation.
- LSP diagnostics.
- Completion for i18n/source data.
- Profile-driven annotation tag completion when a profile set is supplied to the LSP service.
- Hover summaries.
- Definition/source navigation.
- Folding ranges.
- Resource action quick fixes.
- Build Docs command.
- Open Preview command.
- Validate Workspace command.

## Build Settings

VS Code settings are under `hia.*`.

Single document build:

```json
{
  "hia.build.input": "fixtures/basic.hia.json",
  "hia.build.out": "dist/docs",
  "hia.build.locale": "en",
  "hia.build.manifest": "hia-manifest.json",
  "hia.preview.path": "dist/docs/index.html"
}
```

JSDoc Integration build:

```json
{
  "hia.build.jsdocIntegration": "fixtures/jsdoc-integration.real-basic.json",
  "hia.build.out": "dist/jsdoc-docs",
  "hia.build.locale": "zh-CN"
}
```

Project manifest build:

```json
{
  "hia.build.projectManifest": "fixtures/project-mixed.hia-project.json",
  "hia.build.out": "dist/project-docs",
  "hia.preview.path": "dist/project-docs/index.html"
}
```

`hia.build.input`, `hia.build.jsdocIntegration` and `hia.build.projectManifest` are mutually exclusive CLI input modes.

## Validation Report

Run `HIA: Validate Workspace` with a `.hia.json` document open.

The report includes:

- diagnostics;
- resource index summary;
- authoring locations;
- resource actions;
- capability status;
- profile summary when profile data is available through the LSP.

## Preview

Run `HIA: Build Docs`, then `HIA: Open Preview`.

The extension reads the generated manifest when available and opens the manifest entrypoint. If the active document or manifest is newer than the preview file, the extension warns that the preview may be stale.

## Manual Validation

Use the detailed checklist:

```text
docs/vscode-extension-manual-validation.md
```

The cross-surface CLI/renderer/IDE acceptance checklist is:

```text
docs/user-acceptance-checklist.md
```

## Boundaries

- Preview opens generated HTML in an external browser.
- Webview and preview server support are deferred.
- Resource edit quick fixes currently show preflight data only.
- WorkspaceEdit-based resource writes are deferred.
- Profile file discovery and profile-defined diagnostics execution are deferred.
