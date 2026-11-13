# Unified HTML Demo

This demo builds a documentation site from HTML source or mixed JavaScript,
HTML and CSS documentation artifacts. Project rendering defaults to
`split-site`; `single-page` is an explicit compatibility setting.

Examples use committed public fixtures and explicit input paths for deterministic release checks.

## Generate from HTML source

Prepare a matching HTMDoc package cohort and a built HIA CLI. Current 1.0.0
source candidates and registry releases have separate availability. For a
source trial, pack each of the eight package directories in the
[HTML release plan](https://github.com/mandolin/hia-htmdoc/blob/main/release/public-packages.json)
with `npm pack <package-directory> --ignore-scripts --pack-destination <archive-directory>`,
then install those matching archives in a fresh sample project. Replace the
angle-bracket paths with actual paths:

```sh
npm install --save-dev --ignore-scripts <eight-matching-archive-paths>
```

Copy `fixtures/basic.html` from the matching `hia-htmdoc` checkout to
`src/alert.fragment.html`. This committed Alert sample is an HTML fragment.
Select `html-fragment` explicitly. Full HTML documents use `html`; the parser's
document context may insert wrapper elements and change comment adjacency.

Create `htmdoc.config.json` in the sample project:

```json
{
  "schemaVersion": "1.0.0",
  "workspaceRoot": ".",
  "outputDirectory": "dist/htmdoc",
  "inputs": [{"kind": "html-fragment", "path": "src/alert.fragment.html"}]
}
```

Run the installed command from that directory:

```sh
htmdoc --config htmdoc.config.json
```

Read `dist/htmdoc/htmdoc.producer-result.json` for the actual output paths and
diagnostics. The default run emits extraction, HIA and direct-source map
artifacts, with source bodies excluded. For this single input, the HIA and map
paths can be listed once in `hia.project.json`:

```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "project:html-first-run",
    "name": "HTML First Run",
    "defaultLocale": "en",
    "locales": ["en", "zh-CN"]
  },
  "inputs": [
    {"kind": "hia-document", "path": "dist/htmdoc/artifacts/src/alert.fragment.html-fragment-1.hia.json", "domain": "html"},
    {"kind": "doc-source-map", "path": "dist/htmdoc/artifacts/src/alert.fragment.html-fragment-1.docmap.json", "domain": "html"}
  ]
}
```

Create a separate `hia.config.json` for reading. The metadata-only source
policy retains source locations and excludes source bodies:

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

For a built source checkout, replace `hia` with
`node <built-core-checkout>/apps/cli/dist/index.js`. Serve `dist/site` through
HTTP and inspect Alert, `variant`, the default slot, the `close` event, style
hook, accessibility note and six source-map entries. The sample is
English-only. Selecting Chinese UI or declaring project locales retains the
English descriptions; it does not create translated fields. Change both
`uiLocale` and the content-locale argument to `en` for an English reading build.

中文说明。冻结Alert样本应按HTML片段提取，再显式接入HIA文档与源码地图。
英文说明按真实输入阅读，项目语言和界面语言分别设置。检查生产结果清单及实际文件，
源码正文披露按独立策略与授权处理。

## Prerequisites

From `main-repo`:

```bash
pnpm install
pnpm run build
```

## Build The Mixed Project Page

```bash
pnpm run hia -- docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/project-docs
```

The CLI reports the actual file count:

```text
Generated <count> file(s) at .../dist/project-docs
```

The default site includes the following files and generated directories.
Use `hia-manifest.json` for the complete inventory:

```text
dist/project-docs/index.html
dist/project-docs/project-index.json
dist/project-docs/navigation/
dist/project-docs/search/
dist/project-docs/relations/
dist/project-docs/entries/
dist/project-docs/pages/
dist/project-docs/assets/hia-default.css
dist/project-docs/assets/hia-default.js
dist/project-docs/hia-manifest.json
```

## What To Inspect

Open:

```text
dist/project-docs/index.html
```

The page should include:

- an `All` view;
- a `JS` view with JSDoc Integration entries;
- a `CSS` view with CSSDoc extraction entries;
- an `HTML` view with HTMDoc extraction entries;
- profile summary;
- doc-source-map summary with linked entry counts;
- a `Relations` summary and relation graph section derived from source/doc-source-map metadata;
- a `Doc Source Map` section on the HTML `Alert` entry.
- project view buttons styled by the default theme and updating `aria-pressed` as views change.

The manifest should include:

```json
{
  "project": {
    "views": ["all", "js", "css", "html"],
    "entryCounts": {
      "all": 6,
      "js": 2,
      "css": 2,
      "html": 2
    }
  },
  "build": {
    "mode": "project"
  },
  "docSourceMaps": [
    {
      "path": "project-mixed-alert.docmap.json",
      "status": "available",
      "entryCount": 1,
      "linkedEntryCount": 1,
      "sourcesContentPolicy": "none"
    }
  ]
}
```

`project-index.json` is a deterministic `hia-project-navigation-index@0.1.0-draft` artifact for static portals and search. It records stable entry identifiers and public navigation metadata, excluding inline source previews. In the default split site, `index.html` loads entry fragments and `pages/` supplies script-free topic pages. Source assets follow the selected disclosure policy and admitted inputs.

To request the small single-page compatibility output, provide a HIA config
with `docs.renderer.projectLayout` set to `single-page`. Its file inventory
and loading behavior follow that explicit selection.

The same `project-index.json` also carries the first-round `hia-project-relation-graph@0.1.0-draft` data. The graph is derived from entries, source references and doc-source-map references so that future portals, IDE hosts and DevTools hosts can consume the same source/generated-artifact relationship model without scraping the HTML page.

## Verify Path Privacy

Generated output should not contain the local workspace absolute path:

```powershell
$repoRoot = (Resolve-Path .).Path
rg --fixed-strings $repoRoot dist/project-docs
```

No matches are expected.

## Browser Smoke

For a browser-level smoke, serve the generated directory with any local static server and open `index.html`.

Example:

```powershell
python -m http.server 58185 --bind 127.0.0.1 -d dist/project-docs
```

Then open:

```text
http://127.0.0.1:58185/index.html
```

Expected view counts:

| View | Visible entries |
| --- | ---: |
| All | 6 |
| JS | 2 |
| CSS | 2 |
| HTML | 2 |

A `favicon.ico` 404 from a minimal static server is non-blocking.

## Related Fixtures

| Fixture | Purpose |
| --- | --- |
| `fixtures/project-mixed.hia-project.json` | Project aggregation manifest. |
| `fixtures/jsdoc-integration.basic.json` | JSDoc Integration input. |
| `fixtures/project-mixed-alert.htmdoc.json` | HTMDoc extraction input. |
| `fixtures/project-mixed-alert.cssdoc.json` | CSSDoc extraction input. |
| `fixtures/project-mixed-alert.docmap.json` | doc-source-map input. |
| `fixtures/project-mixed-profiles/*.profile.json` | Profiles referenced by the project manifest. |

## Generated Output Policy

Do not commit `dist/project-docs`.

Generated output belongs under `main-repo/dist` for local validation. See `docs/example-fixture-governance.md`.
