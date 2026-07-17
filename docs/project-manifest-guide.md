# Project Manifest Guide

A project docs manifest lets the HIA CLI aggregate several documentation artifacts into one rendered project page.

Use it when a project has multiple documentation sources, such as:

- JSDoc Integration JSON;
- HTMDoc extraction JSON;
- CSSDoc extraction JSON;
- doc-source-map JSON;
- normalized HIA core documents.

The CLI does not scan source files or discover producer packages in project mode. The manifest either explicitly lists already-produced artifacts, or explicitly names producer modules that should run before aggregation.

## Current Status

The project docs manifest shape is `0.1.0-draft`.

`@hia-doc/config` exports the machine-readable manifest contract:

- `HIA_PROJECT_MANIFEST_SCHEMA_VERSION`
- `HIA_PROJECT_MANIFEST_SCHEMA_ID`
- `HIA_PROJECT_MANIFEST_JSON_SCHEMA`
- `validateHiaProjectManifest()`

The current static-artifact fixture is:

```text
fixtures/project-mixed.hia-project.json
```

The current producer-driven fixture is:

```text
fixtures/project-producer.hia-project.json
```

Profile references are explicit. `@hia-doc/profiles` distributes the official profile set, while project manifests continue to reference a safe local artifact path when profile data is required. The CLI does not silently fetch remote profiles. See `docs/profile-distribution.md`.

## Minimal Manifest

```json
{
  "schemaVersion": "0.1.0-draft",
  "project": {
    "id": "project:mixed",
    "name": "Mixed Project",
    "title": "Mixed Project Documentation",
    "defaultLocale": "en",
    "locales": ["en", "zh-CN"]
  },
  "profiles": [
    {
      "profileId": "jsdoc",
      "path": "project-mixed-profiles/jsdoc.profile.json"
    }
  ],
  "inputs": [
    {
      "kind": "jsdoc-integration",
      "path": "jsdoc-integration.basic.json",
      "domain": "js",
      "profile": {
        "profileId": "jsdoc",
        "profileVersion": "0.1.0-draft"
      }
    }
  ]
}
```

### Project Locales

`project.defaultLocale` and `project.locales` control the initial language and language switcher for a unified project page. The default locale must be included in the declared locale list. Entries without localized fields remain visible through their source summary; entries produced from JSDoc `@lang` data switch their description in place.

## Input Kinds

| Kind | Purpose |
| --- | --- |
| `hia-document` | Already-normalized core HIA document JSON. |
| `jsdoc-integration` | JSON produced by `@mandolin/jsdoc-plugin-hia-sys`. |
| `htmdoc-extraction` | HTMDoc extraction artifact. |
| `cssdoc-extraction` | CSSDoc extraction artifact. |
| `doc-source-map` | Documentation source map manifest. The CLI indexes it and exposes source/artifact linkage to the renderer. |

## Producer Modules

Use `producers` when source files should be converted to documentation artifacts during the project build. The CLI loads only the modules named by the manifest. It does not scan `node_modules`, does not install packages, and does not run shell commands.

```json
{
  "schemaVersion": "0.1.0-draft",
  "project": {
    "name": "Producer Project"
  },
  "profiles": [
    {
      "profileId": "htmdoc",
      "path": "project-mixed-profiles/htmdoc.profile.json"
    }
  ],
  "producers": [
    {
      "id": "htmdoc",
      "module": "node_modules/@hia-doc/htmdoc-producer/dist/index.js",
      "workspaceRoot": ".",
      "inputs": [
        {
          "kind": "html",
          "path": "src/index.html"
        }
      ],
      "profileIds": ["htmdoc"]
    }
  ]
}
```

Producer output defaults to:

```text
<output>/.hia-producers/<producer-id>/
```

Artifacts whose kinds are known project input kinds are added to the aggregation result. The generated `hia-manifest.json` records them with `source: "producer"` and the configured `producerId`.

If a producer fails, the CLI returns a non-zero exit code by default. Set `"failureMode": "warn"` on a producer entry to keep a partial build while downgrading that producer's errors to warnings.

## Domains

Use `domain` to place content into project views:

| Domain | View |
| --- | --- |
| `js` | JS view |
| `css` | CSS view |
| `html` | HTML view |
| omitted | inferred from input kind when possible |

The renderer always includes `All` when there is at least one entry.

## Build Command

From `main-repo`:

```bash
pnpm run build
pnpm run hia -- docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/project-docs
```

Expected output:

```text
dist/project-docs/index.html
dist/project-docs/project-index.json
dist/project-docs/assets/hia-default.css
dist/project-docs/assets/hia-default.js
dist/project-docs/hia-manifest.json
```

## Config File

Project aggregation mode can also be configured through `hia.config.json`:

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "projectManifest": "fixtures/project-mixed.hia-project.json",
    "output": "dist/project-docs"
  }
}
```

## Output Manifest

In project mode, the output manifest includes:

- `project.navigationIndex`: the `hia-project-navigation-index@0.1.0-draft` reference for `project-index.json`.
- `project.relationGraph`: the `hia-project-relation-graph@0.1.0-draft` summary reference when the rendered project has source, generated-artifact, endpoint or semantic relations.
- `project-index.json`: deterministic, presentation-neutral entry metadata for static portals and search. It carries stable entry ids, views, public source/doc-source-map references and localized descriptions, but excludes inline source previews. `index.html` remains the complete source-linked detail surface.
- `project-index.json.relationGraph`: complete first-round relation graph data derived by the renderer from project entries, source metadata and doc-source-map references. Project manifests do not need to declare this graph yet.

- `build.mode = "project"`;
- `build.inputs`;
- `build.producers`, when producers are configured;
- `build.profiles`;
- `build.docSourceMaps`;
- `project.views`;
- `project.entryCounts`;
- `docSourceMaps`.

`docSourceMaps` entries include the first-round consumption summary:

```json
{
  "path": "project-mixed-alert.docmap.json",
  "contractVersion": "0.1.0-draft",
  "status": "available",
  "entryCount": 1,
  "linkedEntryCount": 1,
  "unresolvedEntryCount": 0,
  "sourceCount": 1,
  "artifactCount": 1,
  "sourcesContentPolicy": "none"
}
```

When a `doc-source-map` entry has a matching `symbolId`, the rendered project entry shows a `Doc Source Map` section with the manifest path, doc-source-map entry id, original source path/range and generated artifact selector.

## Safety Rules

- Paths in the manifest are resolved relative to the manifest file.
- Parent traversal and absolute input paths are rejected.
- Producer module paths are explicit manifest-relative safe paths.
- Producer output directories are resolved inside the CLI output directory.
- Generated output must not leak local absolute paths.
- `doc-source-map` input is checked for unsafe paths and blocked embedded source content.
- Missing optional source metadata should degrade the page instead of blocking rendering.

See `docs/unified-html-demo.md` for a runnable mixed project demo.

See `docs/migration-guide.md` for migration paths from JSDoc, CSSDoc, HTMDoc and generated DSL artifacts into project aggregation.
