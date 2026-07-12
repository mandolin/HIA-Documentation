# User Acceptance Checklist

This checklist verifies the first user-visible HIA documentation workflow across CLI, renderer and IDE shell surfaces.

## Scope

The current acceptance baseline covers:

- project manifest aggregation;
- unified HTML project page rendering;
- JS/CSS/HTML view switching;
- profile and doc-source-map summaries;
- VS Code command wiring and stale preview feedback;
- output path privacy.

It does not cover a full documentation site, search, browser extension, Webview preview server or workspace profile auto-discovery.

## CLI Project Build

From `main-repo`:

```bash
pnpm run build
pnpm run hia -- docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/project-docs
```

Expected output:

```text
Generated 5 file(s) at .../dist/project-docs
```

Expected files:

```text
dist/project-docs/index.html
dist/project-docs/project-index.json
dist/project-docs/assets/hia-default.css
dist/project-docs/assets/hia-default.js
dist/project-docs/hia-manifest.json
```

## Manifest Acceptance

Check `dist/project-docs/hia-manifest.json`.

Expected project summary:

- `build.mode` is `project`;
- `project.views` is `["all", "js", "css", "html"]`;
- `project.entryCounts` has `all=6`, `js=2`, `css=2`, `html=2`;
- `build.inputs` lists JSDoc Integration, HTMDoc extraction, CSSDoc extraction and doc-source-map artifacts;
- `docSourceMaps[0].path` is `project-mixed-alert.docmap.json`.

## Renderer Acceptance

Open `dist/project-docs/index.html` through a local static server or browser.

Expected page behavior:

- page title and main heading are `Mixed Project Documentation`;
- profile summary lists `jsdoc`, `htmdoc`, `cssdoc` and `doc-source-map`;
- doc-source-map summary lists `project-mixed-alert.docmap.json`;
- `All` shows 6 entries;
- `JS`, `CSS` and `HTML` each show 2 entries;
- the active project-view control sets `aria-pressed="true"`;
- generated output does not show local absolute workspace paths.

When using a minimal static server, a browser `favicon.ico` 404 is non-blocking unless the page itself fails to load.

## Path Privacy

From `main-repo`:

```powershell
$repoRoot = (Resolve-Path .).Path
rg --fixed-strings $repoRoot dist/project-docs
```

No matches are expected.

## IDE Acceptance

Use `docs/vscode-extension-manual-validation.md` for full manual IDE validation.

Minimum W-P8.5 IDE acceptance:

- `HIA: Validate Workspace` reports diagnostics, resource index, authoring locations, resource actions, capability status and profile summary.
- `HIA: Build Docs` passes `--project-manifest fixtures/project-mixed.hia-project.json` when `hia.build.projectManifest` is configured.
- `HIA: Open Preview` reads the generated manifest entrypoint when available.
- stale preview feedback warns when the active document or manifest is newer than the preview output.
- missing preview feedback asks the user to run the build first.

The current automated coverage for these paths lives in:

- `apps/vscode-extension/src/config.test.ts`;
- `apps/cli/src/index.test.ts`;
- `packages/renderer-html/src/index.test.ts`;
- `packages/lsp/src/authoring.test.ts`;
- `packages/lsp/src/service.test.ts`.

## Release Gate

Before treating this acceptance baseline as release-ready, run:

```bash
pnpm run release:gate
```
