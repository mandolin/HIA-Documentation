# @hia-doc/cli

Command line entry for the HIA documentation system.

Current scope:

- `hia --help`
- `hia docs build [--config <file>] [--input <file>] [--jsdoc-integration <file>] [--project-manifest <file>] [--out <dir>] [--locale <locale>] [--manifest <file>]`
- `hia docs evidence [--docs-dir <dir>] [--out <file>]`
- `hia docs acceptance --evidence <file> --target-id <id> --target-family <family> [--out <file>]`

The build command reads config through `@hia-doc/config`, then renders one of three input modes:

- a normalized HIA document JSON file
- a JSDoc HIA Integration JSON file produced by `@mandolin/jsdoc-plugin-hia-sys`
- a project docs manifest that aggregates JS, CSS, HTML and doc-source-map artifacts into one project page

Single-document modes validate the converted core document through `@hia-doc/core`. Project mode keeps each source artifact explicit in the output manifest and renders a unified page with all/JS/CSS/HTML views. All modes report diagnostics, render through `@hia-doc/renderer-html`, write HTML/theme assets, and emit an output manifest. The default manifest path is `hia-manifest.json`.

The evidence command reads an already generated project documentation directory and writes a public-safe `hia-generated-docs-evidence-summary` JSON file. It summarizes required output files, entry counts, views, producer inputs, coverage counters and privacy checks without reading source bodies. It is intended for repeatable project adoption checks such as validating that DotNetDoc and JSDoc entries both appear in a unified site while `sourcesContent` remains absent.

The acceptance command reads only that generated evidence summary. It produces a versioned `target-documentation-acceptance` report for one public target id and one of four portfolio families: `unicode-compatible`, `html-authoring`, `enterprise-business`, or `workspace-container`. The report checks required outputs, stable entry identities, successful producer summaries, and the no-embedded/no-fetched-source privacy boundary. It does not inspect source code, HTML, project manifests, credentials, or target working-tree state. Without `--out`, it writes the report to stdout; an explicit `--out` must be a safe relative path in the caller's workspace.

Diagnostics use the shared `HiaDiagnostic` shape. The CLI still prints compact `[severity:code]` lines, while the in-process API keeps machine-readable `data` for callers.

`--input`, `--jsdoc-integration` and `--project-manifest` are mutually exclusive. Use `--input` for already-normalized core documents, `--jsdoc-integration` for JSON produced by `@mandolin/jsdoc-plugin-hia-sys`, and `--project-manifest` for a multi-artifact project aggregation manifest. Project manifests can list existing `documentation-producer-result` files when a producer such as DotNetDoc has already emitted artifacts and the CLI only needs to render a unified project page.

In the local workspace, run it through the root script after building:

```bash
pnpm run build
pnpm run hia -- --help
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs-en --locale en
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs-custom --manifest manifest.json
pnpm run hia -- docs build --jsdoc-integration fixtures/jsdoc-integration.real-basic.json --out dist/jsdoc-docs --locale zh-CN
pnpm run hia -- docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/project-docs
pnpm run hia -- docs evidence --docs-dir dist/project-docs --out dist/project-docs/documentation-evidence.json
pnpm run hia -- docs acceptance --evidence dist/project-docs/documentation-evidence.json --target-id sample-project --target-family unicode-compatible --out dist/project-docs/target-acceptance.json
pnpm run hia -- docs build --config hia.config.example.json
```

CLI options override values from `hia.config.json`. Paths in config files are resolved relative to the config file directory.

## Contract

The CLI consumes core documents and project config, then writes renderer output to disk. It may add build-output files such as `hia-manifest.json`, but it does not change the renderer manifest contract.

See `docs/contract-index.md` for the current CLI/config/renderer layering rule.
