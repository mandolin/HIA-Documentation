# Unified HTML Demo

This demo builds one HTML page from mixed JS, HTML and CSS documentation artifacts.

It uses committed fixtures rather than scanning source files. That keeps the demo deterministic and makes it suitable for release gates.

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

The CLI should report:

```text
Generated 4 file(s) at .../dist/project-docs
```

Generated files:

```text
dist/project-docs/index.html
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
- doc-source-map summary.

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
  }
}
```

## Verify Path Privacy

Generated output should not contain the local workspace absolute path:

```powershell
$repoRoot = (Resolve-Path .).Path
rg --fixed-strings $repoRoot dist/project-docs
```

No matches are expected.

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
