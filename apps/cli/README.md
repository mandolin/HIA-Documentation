# @hia-doc/cli

Command line entry for the HIA documentation system.

Current scope:

- `hia --help`
- `hia docs build [--config <file>] [--input <file>] [--out <dir>] [--locale <locale>] [--manifest <file>]`

The build command reads config through `@hia-doc/config`, reads a HIA document JSON fixture, validates it through `@hia-doc/core`, reports diagnostics, renders it through `@hia-doc/renderer-html`, writes HTML/theme assets, and emits an output manifest. The default manifest path is `hia-manifest.json`.

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
