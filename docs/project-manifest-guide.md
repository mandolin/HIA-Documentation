# Project Manifest Guide

A project docs manifest lets the HIA CLI aggregate several documentation artifacts into one rendered documentation project.

Use it when a project has multiple documentation sources, such as:

- JSDoc Integration JSON;
- HTMDoc extraction JSON;
- CSSDoc extraction JSON;
- doc-source-map JSON;
- normalized HIA core documents.

The CLI does not scan source files or discover producer packages in project mode. The manifest either explicitly lists already-produced artifacts, or explicitly names producer modules that should run before aggregation.

## Current Status

The current project docs manifest source candidate is `1.0.0`, with exact `0.1.0-draft` runtime compatibility. Bundled historical fixtures retain their original draft roots; package and registry identity remain independent. See [Project Manifest Migration](project-manifest-migration.md).

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

## Reproduce compatibility and four-domain aggregation

Prepare a matching built HIA CLI and config package. Use a fresh sample
directory containing the explicit fixture files, profile files, producer
module and producer sources with their original relative layout. Keep
`fixtures/project-mixed.hia-project.json` and
`fixtures/project-producer.hia-project.json` at their original
`0.1.0-draft` identity. Run them through the compatible reader first.

```sh
hia docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/legacy-static --locale en
hia docs build --project-manifest fixtures/project-producer.hia-project.json --out dist/legacy-producer --locale en
```

For a built source checkout, replace `hia` with
`node <built-core-checkout>/apps/cli/dist/index.js`. The static fixture
contains six entries across JavaScript, HTML and CSS. The fixture producer
emits two entries, one HTML component and one CSS component style. Its
coverage is defined by that fixture module.

An explicit migration can validate both inputs and preserve the originals.
With a matching `@hia-doc/config` available to the script, write a new
manifest alongside each copied fixture.

```js
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { HIA_PROJECT_MANIFEST_SCHEMA_VERSION, validateHiaProjectManifest } from "@hia-doc/config";

for (const name of ["project-mixed", "project-producer"]) {
  // <lang><zh-CN>旧清单只读，复制拥有自己的嵌套数据。</zh-CN><en>The old manifest is read-only; the copy owns its nested data.</en></lang>
  const path = `fixtures/${name}.hia-project.json`;
  const original = await readFile(path, "utf8");
  const legacy = JSON.parse(original);
  assert.deepEqual(validateHiaProjectManifest(legacy), []);
  const current = structuredClone(legacy);
  current.schemaVersion = HIA_PROJECT_MANIFEST_SCHEMA_VERSION;
  assert.deepEqual(validateHiaProjectManifest(current), []);
  assert.deepEqual({ ...current, schemaVersion: legacy.schemaVersion }, legacy);
  assert.equal(await readFile(path, "utf8"), original);
  await writeFile(`fixtures/${name}.current.json`, JSON.stringify(current, null, 2) + "\n");
}
```

Build the two new manifests and compare their project indexes, entry IDs,
fields, profiles, maps and relations with the corresponding legacy output.
Domain artifacts retain their own existing versions throughout this step.
Changing a root identity alone provides no compatibility evidence.

For four-domain reading, first prepare the real .NET artifacts from the
[compiled sample](../reference/samples/dotnet/). Keep its relative layout
under `reference/samples/dotnet/` in the sample workspace. Use the
[.NET first-run guide](dotnetdoc-quickstart.md#current-source-first-run)
for matching tools, compilation and extraction.

Save this current manifest at the sample root as `four-domain.static.json`.

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "project:four-domain-static",
    "name": "Four-domain Static Project",
    "defaultLocale": "en",
    "locales": ["en", "zh-CN"]
  },
  "profiles": [
    {"profileId": "jsdoc", "path": "fixtures/project-mixed-profiles/jsdoc.profile.json"},
    {"profileId": "htmdoc", "path": "fixtures/project-mixed-profiles/htmdoc.profile.json"},
    {"profileId": "cssdoc", "path": "fixtures/project-mixed-profiles/cssdoc.profile.json"},
    {"profileId": "doc-source-map", "path": "fixtures/project-mixed-profiles/doc-source-map.profile.json"}
  ],
  "inputs": [
    {"kind": "jsdoc-integration", "path": "fixtures/jsdoc-integration.basic.json", "domain": "js", "profile": {"profileId": "jsdoc", "profileVersion": "0.1.0-draft"}},
    {"kind": "htmdoc-extraction", "path": "fixtures/project-mixed-alert.htmdoc.json", "domain": "html", "profile": {"profileId": "htmdoc", "profileVersion": "0.1.0-draft"}},
    {"kind": "cssdoc-extraction", "path": "fixtures/project-mixed-alert.cssdoc.json", "domain": "css", "profile": {"profileId": "cssdoc", "profileVersion": "0.1.0-draft"}},
    {"kind": "doc-source-map", "path": "fixtures/project-mixed-alert.docmap.json", "profile": {"profileId": "doc-source-map", "profileVersion": "0.1.0-draft"}},
    {"kind": "hia-document", "path": "reference/samples/dotnet/dist/dotnetdoc/bin/Release/net10.0/HiaDocumentationSample.hia.json", "domain": "dotnet"},
    {"kind": "doc-source-map", "path": "reference/samples/dotnet/dist/dotnetdoc/bin/Release/net10.0/HiaDocumentationSample.doc-source-map.json", "domain": "dotnet"}
  ]
}
```

Select one logical document and its matching map for each .NET API input.
When a result contains both XML-derived and C#-derived HIA copies of the same
members, inspect both domain artifacts, then explicitly select the intended
document/map pair for aggregation. For a producer bridge that needs only the
XML-derived document with real source locations, declare an XML input with
its actual `projectPath`. Independent libraries with overlapping native IDs
use the existing reviewed identity scopes described in the migration guide.

Use a separate HIA reading config for each UI locale. To inspect metadata
without publishing source bodies, choose `docs.source.presentation: "none"`.

```sh
hia docs build --project-manifest four-domain.static.json --config hia.config.json --out dist/four-domain/zh-CN --locale zh-CN
hia docs build --project-manifest four-domain.static.json --config hia.en.config.json --out dist/four-domain/en --locale en
```

The four-domain static example contains eight entries, with two per domain.
A project that combines the fixture producer, the two JSDoc entries and the
real .NET producer contains six entries. Inspect actual producer outputs and
`hia-manifest.json` for their exact counts, domains and source links.
Unknown static kinds and unsafe declared paths fail validation. Correct them
and build into a fresh directory, retaining the failure diagnostics.

中文说明。旧清单先按原版本实际读取，再独立校验/深复制/校验当前规则，比较完整索引及字段。
四域静态清单显式加入真实.NET文档和地图，producer路径按实际模块覆盖核数量。
输入归属、字段语言与源码公开许可分别核验，原领域工件版本保持。

## Minimal Manifest

For independent documents whose native symbol IDs overlap, explicitly use manifest
`1.1.0` and assign a stable `identityScope` to each document and its maps, or to
their enclosing `documentation-producer-result` input. See the scoped aggregation
section in the [migration guide](project-manifest-migration.md#scoped-aggregation).

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "project:mixed",
    "name": "Mixed Project",
    "title": "Mixed Project Documentation",
    "defaultLocale": "en",
    "locales": ["en", "zh-CN"],
    "productVersion": "2026.8"
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
      },
      "semanticPath": [
        { "kind": "repository", "id": "main-repo", "label": "Main Repository" },
        { "kind": "package", "id": "renderer-html", "label": "@hia-doc/renderer-html" },
        { "kind": "layer", "id": "presentation", "label": "Presentation Layer" }
      ]
    }
  ]
}
```

### Project Locales

`project.defaultLocale` and `project.locales` control the initial language and language switcher for a unified project page. The default locale must be included in the declared locale list. Entries without localized fields remain visible through their source summary; entries produced from JSDoc `@lang` data switch their description in place.

`project.productVersion` is optional topic metadata. It does not create version routes, historical sites, or a version selector.

### Semantic Path

`inputs[].semanticPath` is an optional owner-reviewed navigation prefix. Each segment contains only a closed `kind`, path-free stable `id`, and public `label`. Allowed kinds are `repository`, `package`, `layer`, `contract`, `operation`, `project`, `assembly`, `namespace`, and `type`.

The CLI projects these segments unchanged. It does not infer repository/package/layer identity from `path`, `sourceRoot`, producer output directories, or workspace-container layout. Duplicate segment ids, unknown kinds/fields, path-like ids, absolute/private labels, URI-like labels, and traversal-like labels fail closed.

## Input Kinds

| Kind | Purpose |
| --- | --- |
| `hia-document` | Already-normalized core HIA document JSON. |
| `jsdoc-integration` | JSON produced by `@mandolin/jsdoc-plugin-hia-sys`. |
| `htmdoc-extraction` | HTMDoc extraction artifact. |
| `cssdoc-extraction` | CSSDoc extraction artifact. |
| `doc-source-map` | Documentation source map manifest. The CLI indexes it and exposes source/artifact linkage to the renderer. |
| `documentation-producer-result` | Existing producer result manifest. The CLI expands renderable artifacts such as `hia-document`, `jsdoc-integration`, `htmdoc-extraction`, `cssdoc-extraction` and `doc-source-map` from the result location. |

中文：`documentation-producer-result` 用于“生产器已经跑完，只需要统一渲染”的场景，例如目标项目已经生成 DotNetDoc `dotnetdoc.producer-result.json`，HIA CLI 可以直接从其中展开可渲染 artifact。

## Producer Modules

Use `producers` when source files should be converted to documentation artifacts during the project build. The CLI loads only the modules named by the manifest. It does not scan `node_modules`, does not install packages, and does not run shell commands.

```json
{
  "schemaVersion": "1.0.0",
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
      "module": "node_modules/@hia-doc/htmdoc-producer/src/index.mjs",
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

Producer inputs preserve JSON-compatible extension fields. This lets a domain producer receive its own safe metadata, such as DotNetDoc `applicationRoot`, `artifactBasePath`, `hiaDocumentId` and `title`, without forcing the shared project manifest to know every domain-specific option. Path-like extension fields, including names ending in `path`, `root` or `directory`, are still validated as safe relative paths. `workspaceRoot` and `applicationRoot` may be `"."`; artifact paths may not.

中文：producer input 会保留 JSON-compatible 扩展字段，供 DotNetDoc 等领域 producer 消费；但带路径语义的字段仍必须通过安全相对路径校验。`workspaceRoot` / `applicationRoot` 可以是 `"."`，普通 artifact path 不可以。

## Existing Producer Results

Use `documentation-producer-result` when a target project already ran a producer and only needs a unified HTML page from the emitted artifacts.

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "name": "Portal Documentation",
    "title": "Portal Documentation"
  },
  "inputs": [
    {
      "kind": "documentation-producer-result",
      "path": "temp/documentation/dotnetdoc/dotnetdoc.producer-result.json",
      "domain": "dotnet"
    },
    {
      "kind": "jsdoc-integration",
      "path": "temp/documentation/jsdoc/hia-integration.json",
      "domain": "js"
    }
  ]
}
```

The producer result itself is not rendered as a documentation entry. The CLI validates the result, selects renderable artifacts, resolves artifact paths relative to the producer result file, and records the generated project manifest inputs with `source: "producer-result"` and the producer id. This is the preferred bridge for projects such as HIA-ASPNETPortal that already have DotNetDoc and JSDoc pilot outputs.

中文：producer result 本身不会显示为文档条目；CLI 会校验它、挑出可渲染 artifact，并按 producer result 文件所在目录解析 artifact 路径。生成的 build manifest 会把这些条目标为 `source: "producer-result"`。

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

Distinct canonical symbol IDs can occasionally produce the same readable entry slug (for example, `jsdoc:member:id` and `jsdoc:member:$id`). The project builder keeps both symbols. Only entries in that collision group receive a fixed-length opaque `project-entry~<sha256>` ID; entries without a collision retain their existing IDs. The opaque ID does not embed the original symbol ID or a source path. The split-site renderer also rejects a projected static filename collision before writing pages, instead of overwriting one member's content.

Introducing or removing a collision can change the affected group's entry IDs and deep links. Rebuild and consume the new `project-index.json` and presentation profile together; previously copied links to an affected entry are not redirected automatically. The generated file paths remain bounded by the renderer's filename projection, while the length of an unrelated pre-existing readable entry ID is not capped by this collision rule. The [presentation identity contract](presentation-page-identity.md) requires unique logical topic, fragment and navigation IDs; it leaves physical page routing to the Portal owner.

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
