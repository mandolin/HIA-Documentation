# HIA Compatibility Matrix

This matrix records the current compatibility baseline for the main repository, official JSDoc packages and incubating satellite projects.

## Runtime And Tooling

| Surface | Supported / pinned | Status | Verification |
| --- | --- | --- | --- |
| Node.js for `main-repo` | `>=20.19.0`; pinned local tool `20.20.2` | Supported | `pnpm run release:gate` |
| pnpm for `main-repo` | `10.34.4` | Pinned | `pnpm install --frozen-lockfile` in CI |
| Node.js for public JSDoc packages | Node 18.x and 20.x | Supported | satellite package CI / release gates |
| VS Code API | `^1.92.0` | Development baseline | `apps/vscode-extension` build and tests |

## Main Repository Packages

| Package | Package version | Contract surfaces | Compatibility status |
| --- | --- | --- | --- |
| `@hia-doc/core` | private `0.0.0` | core document `0.2.0`, i18n `0.2.0`, source `0.2.0`, protocol `0.1.0` | Active pre-1.0 baseline. |
| `@hia-doc/config` | private `0.0.0` | config schema `0.1.0` | Active pre-1.0 baseline. |
| `@hia-doc/profile` | private `0.0.0` | profile schema `0.1.0-draft` | Draft profile runtime baseline. |
| `@hia-doc/profiles` | private `0.0.0`, MIT | official profile catalog/set `0.1.0-draft` | Workspace distribution baseline; `@hia-doc` scope approved, release version/ownership setup pending. |
| `@hia-doc/schemas` | private `0.0.0`, MIT | schema catalog `0.1.0-draft` | Owner-preserving workspace snapshots; GitHub Pages namespace approved/enabled, first deployment pending push. |
| `@hia-doc/source-linkage` | private `0.0.0`, MIT | doc-source-map/schema `0.1.0-draft` | Active CLI/renderer consumption baseline; LSP request handler deferred. |
| `@hia-doc/parser-jsdoc` | private `0.0.0` | JSDoc Integration `0.1.0`, bridge `0.1.0`, metadata `0.1.0` | Active adapter bridge baseline. |
| `@hia-doc/renderer-html` | private `0.0.0` | renderer manifest `0.1.0` | Active renderer baseline with single-document and project-page outputs. |
| `@hia-doc/cli` | private `0.0.0` | config, core document, JSDoc Integration, project docs manifest draft | Active CLI baseline; project manifest remains draft. |
| `@hia-doc/lsp` | private `0.0.0` | resource index, authoring locations, resource actions, profile capability data | Active IDE/LSP baseline. |
| `@hia-doc/vscode-extension` | private `0.0.0` | LSP client, CLI command pass-through, preview manifest consumption | Development baseline. |

## Official And Incubating Satellite Projects

| Project | Package / workspace version | Contract surfaces | Compatibility status |
| --- | --- | --- | --- |
| `HIA/jsdoc-plugin-hia-sys` | `@mandolin/jsdoc-plugin-hia-sys@0.1.0` | JSDoc Integration `0.1.0` | Published npm baseline. |
| `HIA/jsdoc-theme-hia` | `@mandolin/jsdoc-theme-hia@0.1.0` | JSDoc theme templates/assets | Published npm baseline. |
| `HIA/hia-htmdoc` | private workspace `0.0.0` | HTMDoc extraction `0.1.0-draft` | Incubating foundation project. |
| `HIA/hia-cssdoc` | private workspace `0.0.0` | CSSDoc extraction `0.1.0-draft` | Incubating foundation project. |
| `HIA/hia-sassdoc` | private workspace `0.0.0` | Sass -> CSSDoc -> doc-source-map bridge outputs | Incubating generated-DSL project. |

## Data Contracts

| Contract | Producer | Consumer | Current fixture coverage |
| --- | --- | --- | --- |
| Core document `0.2.0` | core helpers, parser adapters, satellite adapters | renderer, CLI, LSP, validators | `fixtures/basic.hia.json`, `fixtures/core-minimal.hia.json` |
| Text i18n `0.2.0` | core helpers and adapters | renderer, LSP resource index | `fixtures/i18n-resource.hia.json` |
| Source model `0.2.0` | core helpers and adapters | renderer, LSP source navigation | `fixtures/source-reference.hia.json` |
| JSDoc Integration `0.1.0` | `jsdoc-plugin-hia-sys` | `@hia-doc/parser-jsdoc`, CLI | `fixtures/jsdoc-integration.*.json` |
| Documentation profile `0.1.0-draft` | `@hia-doc/profiles` official JSON | profile runtime, LSP capability/completion | `packages/profiles/src/profiles/*.json` |
| Official profile distribution `0.1.0-draft` | `@hia-doc/profiles` | project manifest authors, LSP/IDE consumers | catalog, package tests and `docs/profile-distribution.md` |
| Schema distribution `0.1.0-draft` | `@hia-doc/schemas` snapshots | JSON Schema consumers and contract tooling | owner/snapshot equality gate and `docs/schema-distribution.md` |
| Project docs manifest `0.1.0-draft` | explicit user/fixture manifest | CLI project build | `fixtures/project-mixed.hia-project.json` |
| HTMDoc extraction `0.1.0-draft` | `hia-htmdoc` / fixtures | CLI project build | `fixtures/project-mixed-alert.htmdoc.json` |
| CSSDoc extraction `0.1.0-draft` | `hia-cssdoc` / fixtures | CLI project build | `fixtures/project-mixed-alert.cssdoc.json` |
| Doc source map `0.1.0-draft` | satellite generators / fixtures | `@hia-doc/source-linkage`, CLI project build, renderer project summary | `fixtures/project-mixed-alert.docmap.json` plus distributed schema |
| Renderer manifest `0.1.0` | `@hia-doc/renderer-html` | CLI, IDE preview | CLI/renderer unit and e2e tests |
| LSP profile capability data | `@hia-doc/lsp` | IDE shells | `packages/lsp/src/authoring.test.ts` |

## Required Gates

| Change type | Required checks |
| --- | --- |
| Core/config/profile/parser/lsp/renderer/cli behavior | `pnpm run release:gate` from `main-repo`. |
| Public JSDoc package change | `npm run release:gate` from the package repository, plus publish preflight if releasing. |
| New external dependency | `docs/dependency-review-template.md`, `docs/dependency-license-audit.md`, `scripts/check-dependency-license-audit.mjs`, then `pnpm run license:audit`. |
| Fixture or generated output governance | `pnpm run governance:check`. |
| Project manifest or renderer output change | CLI/renderer tests plus generated output path-leak checks. |
| Profile draft change | profile runtime tests and profile draft check in WorkZone. |
| Profile migration guidance change | public docs review plus profile runtime tests when tag status changes. |
| User-visible CLI/renderer/IDE workflow change | `docs/user-acceptance-checklist.md` plus targeted tests and `pnpm run release:gate`. |

## Deferred Compatibility Work

- Published `@hia-doc/*` package policy.
- Project docs manifest JSON Schema.
- HTMDoc/CSSDoc/doc-source-map formal schema publication.
- Public npm release of official profile/schema/source-linkage packages.
- Workspace profile auto-discovery.
- Profile-defined diagnostic rule execution.
- Browser/DevTools compatibility matrix.
- Vue/React/CSS-in-JS/Storybook bridge compatibility matrix.
