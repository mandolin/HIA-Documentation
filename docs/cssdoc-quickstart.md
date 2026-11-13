# Generate CSS documentation

Build CSS documentation with the CSSDoc CLI, then consume its HIA document
and documentation source map in a unified project. The project renderer uses
`split-site` by default.

## Prepare matching tools and a sample

Prepare a built HIA CLI and a matching CSSDoc package cohort. The eight
packages are currently `1.0.0 source candidates`; check registry availability
for a released cohort. For a source trial, pack each package directory listed
in the [CSS release plan](https://github.com/mandolin/hia-cssdoc/blob/main/release/public-packages.json)
and install those eight matching archives in a fresh sample project. Replace
the angle-bracket paths with actual paths.

```sh
npm pack <package-directory> --ignore-scripts --pack-destination <archive-directory>
npm install --save-dev --ignore-scripts <eight-matching-archive-paths>
```

Copy `fixtures/basic.css` from the matching `hia-cssdoc` checkout to
`src/components.css`. The committed sample documents `Alert`, `.alert`,
`.alert--warning`, `--alert-color`, `color.alert.text` and the `components`
layer. Its descriptions are English-only.

## Extract CSS artifacts

Save this configuration as `cssdoc.config.json` at the sample project root.

```json
{
  "schemaVersion": "1.0.0",
  "workspaceRoot": ".",
  "outputDirectory": "dist/cssdoc",
  "inputs": [{"kind": "css", "path": "src/components.css"}]
}
```

Run the installed command from that directory.

```sh
cssdoc --config cssdoc.config.json
```

Inspect `dist/cssdoc/cssdoc.producer-result.json` for success, diagnostics and
actual artifact paths. Defaults enable the map and result manifest and use
`sourcesContentPolicy` equal to `none`. This input produces four files.

- `artifacts/src/components.css-1.cssdoc.json` contains the six extracted symbols.
- `artifacts/src/components.css-1.hia.json` projects the same six symbols into HIA.
- `artifacts/src/components.css-1.docmap.json` contains their source relationships.
- `cssdoc.producer-result.json` lists the three artifacts and the result status.

The CSS `@token` entry preserves the token name and description. Concrete
design-token values can be documented through a separate `design-token`
input using the supported DTCG format. Read the input kinds and defaults in
the [CSSDoc runner reference](https://github.com/mandolin/hia-cssdoc/blob/main/packages/cssdoc-runner/README.md).

## Build a unified project

Save `hia.project.json` with one HIA document input and one map input.

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "project:css-first-run",
    "name": "CSS First Run",
    "defaultLocale": "en",
    "locales": ["en", "zh-CN"]
  },
  "inputs": [
    {"kind": "hia-document", "path": "dist/cssdoc/artifacts/src/components.css-1.hia.json", "domain": "css"},
    {"kind": "doc-source-map", "path": "dist/cssdoc/artifacts/src/components.css-1.docmap.json", "domain": "css"}
  ]
}
```

Save the reading configuration as `hia.config.json`.

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "renderer": {"projectLayout": "split-site", "uiLocale": "zh-CN"},
    "source": {"presentation": "none"}
  }
}
```

```sh
hia docs build --project-manifest hia.project.json --config hia.config.json --out dist/site --locale zh-CN
```

For a built source checkout, use
`node <built-core-checkout>/apps/cli/dist/index.js` in place of `hia`.
Serve `dist/site` over HTTP. Check each symbol's original description and
source metadata through the interactive directory and static index. Output
includes `index.html`, `pages/`, `entries/`, `assets/` and metadata. Consult
the actual build inventory for its complete file list.

UI language and content language are independent. Set both `uiLocale` and
the `--locale` argument to `en` for an English reading build. A Chinese UI
request retains the original English descriptions and can show an English
fallback indicator. Add actual localized fields when translated content is
required.

## Inspect authorized source fragments

The configuration above retains source metadata with source bodies disabled.
For a sample whose publication is authorized, set the CSSDoc option
`sourcesContentPolicy` to `embed` and regenerate to inspect the producer's
rule fragments in the HIA artifact. To display source in the unified project,
set `docs.source.presentation` to `embed`, `docs.source.localRoot` to `.`, and
`docs.source.publicAssetPolicy` to `explicit-public`. This explicitly
authorizes the CLI to read the sample's relative source locator under the
configuration directory and prepare its bounded preview for entry pages.

For this sample, five annotations attach to the `.alert` rule. Their proven
PostCSS rule range covers lines 10–16 and preserves the original text and
custom-property declaration. The `--alert-color` entry has its own declaration
range on line 14. The adapter's verified fragment support covers stylesheet
rule targets; declaration targets retain location metadata. Source-map 1.1.0
records the endpoint and column-unit evidence of each reference separately.
See the [source presentation configuration](configuration.md#源码呈现).

## Diagnose and recover

Use a supported input kind, a readable project-relative source path and
matching tools. Invalid declared configuration exits with code 1 before
output creation. Per-input extraction errors can leave files and a failed
or partial result. Preserve diagnostics, correct the input and rerun into a
fresh output directory. Review the final result manifest before aggregation.

中文说明。首次生成按匹配八包、原CSS、提取/HIA/地图、项目输出逐步执行。
默认源码正文关闭，授权后可显式嵌入；现有规则目标片段与声明定位精度分别核对。
英文原样本及中文回退按实际输入显示，具体设计令牌值可由独立DTCG输入提供。
