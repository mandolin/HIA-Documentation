# @hia-doc/cli

Command line entry for the HIA documentation system.

Current scope:

- `hia --help`
- `hia docs build [--config <file>] [--input <file>] [--out <dir>] [--locale <locale>] [--manifest <file>]`

The build command reads config through `@hia-doc/config`, reads a HIA document JSON fixture, validates it through `@hia-doc/core`, reports diagnostics, renders it through `@hia-doc/renderer-html`, writes HTML/theme assets, and emits an output manifest. The default manifest path is `hia-manifest.json`.

Diagnostics use the shared `HiaDiagnostic` shape. The CLI still prints compact `[severity:code]` lines, while the in-process API keeps machine-readable `data` for callers.

In the local workspace, run it through the root script after building:

```bash
pnpm run build
pnpm run hia -- --help
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs-en --locale en
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs-custom --manifest manifest.json
pnpm run hia -- docs build --config hia.config.example.json
```

CLI options override values from `hia.config.json`. Paths in config files are resolved relative to the config file directory.

## Contract

The CLI consumes core documents and project config, then writes renderer output to disk. It may add build-output files such as `hia-manifest.json`, but it does not change the renderer manifest contract.

See `docs/contract-index.md` for the current CLI/config/renderer layering rule.
