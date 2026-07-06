# HIA Configuration

`hia.config.json` is the first shared project/build profile contract for the main HIA toolchain.

The current contract is intentionally small. It is used by `@hia-doc/cli` first, and is shaped so LSP and VS Code integration can consume the same project-level settings later. It is not part of the core document IR.

The repository includes `hia.config.example.json` as a runnable example.

## Discovery

The CLI resolves configuration in this order:

1. `hia docs build --config <file>`
2. `hia.config.json` in the current working directory
3. Built-in defaults

Paths written in the config file are resolved relative to the config file directory. Paths passed through CLI options are resolved relative to the process working directory.

CLI options override config values.

## Example

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "input": "fixtures/basic.hia.json",
    "output": "dist/docs",
    "locale": "en",
    "manifest": "hia-manifest.json",
    "renderer": {
      "title": "HIA Docs",
      "includeThemeAssets": true
    },
    "theme": {
      "name": "default"
    },
    "source": {
      "enabled": true,
      "mode": "file",
      "openMode": "same-tab"
    }
  }
}
```

## Fields

| Field | Type | Current behavior |
| --- | --- | --- |
| `schemaVersion` | string | Must be `0.1.0` when present. |
| `docs.input` | string | HIA document JSON input path. |
| `docs.output` | string | Output directory. |
| `docs.locale` | string | Initial rendered locale. CLI emits a warning if the document does not declare it. |
| `docs.locales` | string[] | Reserved for shared tool checks; currently used for warning-level locale validation. |
| `docs.manifest` | string | Manifest path inside the output directory. Absolute paths and parent traversal are rejected. |
| `docs.renderer.title` | string | Overrides the generated HTML title and manifest title. |
| `docs.renderer.includeThemeAssets` | boolean | Controls whether default theme CSS/JS assets are emitted. |
| `docs.theme.name` | string | Only `default` is implemented. Other values produce a warning and fall back to default. |
| `docs.theme.skin` | string | Reserved for later theme skin integration. |
| `docs.source.enabled` | boolean | Reserved for source-link behavior. |
| `docs.source.mode` | `"none"`, `"file"`, `"external"` | Reserved for source-link behavior. |
| `docs.source.baseUrl` | string | Reserved for external source links. |
| `docs.source.openMode` | `"same-tab"`, `"new-tab"` | Reserved for generated source-link UI behavior. |

Validation diagnostics use the shared `HiaDiagnostic` shape with stable `code`, `severity`, `targetPath` and optional machine-readable `data`.

## Deferred

- `hia.config.ts`
- layered config merging
- watch/dev server settings
- package publish settings
- IDE-specific UI settings
