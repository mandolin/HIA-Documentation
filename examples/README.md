# HIA Examples And Demos

This directory is reserved for maintained source-only examples.

Generated output must not be committed here. Use `main-repo/dist` for local demo output.

## Runnable Demos Today

The current runnable demos are fixture-driven:

| Demo | Command |
| --- | --- |
| Basic HIA document | `pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs` |
| JSDoc Integration | `pnpm run hia -- docs build --jsdoc-integration fixtures/jsdoc-integration.real-basic.json --out dist/jsdoc-docs --locale zh-CN` |
| Mixed project unified HTML | `pnpm run hia -- docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/project-docs` |

See:

- `docs/unified-html-demo.md`
- `docs/project-manifest-guide.md`
- `docs/published-jsdoc-usage.md`

## Reserved Example Areas

| Directory | Planned purpose |
| --- | --- |
| `basic-jsdoc/` | Source-only JSDoc project that produces JSDoc Integration JSON. |
| `plugin-authoring/` | Plugin/profile/adapter authoring sample. |
| `typedoc-interop/` | TypeDoc/API Extractor/TSDoc interop sample. |

Each maintained example should include source, config and a README. Build output should go to `dist` or another ignored local output directory.

