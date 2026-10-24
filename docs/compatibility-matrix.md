# HIA Compatibility Matrix

This matrix records the current compatibility baseline for the main repository, official JSDoc packages and incubating satellite projects.

## Runtime And Tooling

| Surface | Supported / pinned | Status | Verification |
| --- | --- | --- | --- |
| Node.js for `main-repo` development / CI | Local `24.22.1`; CI latest `22.x` / `24.x` on Ubuntu 24.04 and Windows Server 2025 | LTS candidate verification matrix | `pnpm run release:gate` in each combination |
| Existing main package engine declarations | `>=20.19.0` | Legacy installation range; tightening accompanies package stabilization | Package manifests and release plan must agree |
| pnpm for `main-repo` | `10.34.4` | Pinned | `pnpm install --frozen-lockfile` in CI |
| Node.js for public JSDoc packages | Package engines declare `>=18` | Legacy installation constraint | satellite package CI / release gates |
| VS Code API | `^1.92.0` | Development baseline | `apps/vscode-extension` build and tests |

These rows identify configuration and verification entry points; they are not results from a current test run. Node.js 18/20 are [end of life](https://nodejs.org/en/about/previous-releases). Legacy engine ranges and pins must not be read as production support recommendations.

The local development pin was researched on 2026-10-23. Supported release-line
verification uses the latest 22/24 patches; CI resolves those patches through
`setup-node`. Windows Server CI does not substitute for a real Windows 11 host
check. Publication continues to use Node.js 24 and the declared npm baseline.

## Main Repository Packages

Package versions below come from checked-in manifests, not a fresh registry query. Their publication flags do not prove registry availability or release qualification. Package and contract versions are independent; pre-1.0 and draft surfaces retain their stated limitations.

| Package | Package version | Contract surfaces | Compatibility status |
| --- | --- | --- | --- |
| `@hia-doc/core` | `0.1.2`, MIT; publishable manifest | core document / text i18n / source / protocol `1.0.0` source candidates; exact legacy `0.2.0` document/submodels and `0.1.0` envelope types, DLR/resource-resolution and UI-locale completeness `0.1.0-draft` | Active pre-1.0 baseline; public release candidate. |
| `@hia-doc/config` | `0.1.6`, MIT; publishable manifest | config schema `0.1.0` | Active pre-1.0 baseline; patch release carries producer-result project manifest support. |
| `@hia-doc/profile` | `0.1.0`, MIT; publishable manifest | profile schema `1.0.0` source candidate, exact legacy `0.1.0-draft` reader | Structural and registry APIs with [validation and ownership limits](profile-input-validation.md) and [consistent composition](profile-composition.md); npm/domain-profile releases remain separate. |
| `@hia-doc/profiles` | `0.1.0`, MIT; publishable manifest | official profile catalog/set `0.1.0-draft` | Workspace distribution baseline; public release candidate. |
| `@hia-doc/plugin-sdk` | `0.1.2`, MIT; publishable manifest | documentation producer descriptor/result `1.0.0` candidates; exact `0.1.0-draft` reader support | Candidate source definitions; existing published package contents are not modified. See producer migration guide. |
| `@hia-doc/schemas` | `0.1.4`, MIT; publishable manifest | schema catalog `0.1.0-draft` | Owner-preserving workspace snapshots; patch release carries updated producer-result and project-manifest schemas. |
| `@hia-doc/source-linkage` | `0.1.1`, MIT; publishable manifest | doc-source-map/schema `0.1.0-draft`, metadata-only locale-resolution sidecar declaration | Active CLI/renderer/LSP query runtime; public release candidate. |
| `@hia-doc/parser-jsdoc` | `0.1.0`, MIT; publishable manifest | JSDoc Integration `0.1.0`, bridge `0.1.0`, metadata `0.1.0` | Active adapter bridge baseline; public release candidate. |
| `@hia-doc/theme-default` | `0.1.3`, MIT; publishable manifest | default renderer assets | Active renderer asset baseline; public release candidate. |
| `@hia-doc/renderer-html` | `0.1.5`, MIT; publishable manifest | renderer manifest `0.1.0`, project navigation index `0.1.0-draft` | Active renderer baseline with single-document and project-page outputs; public release candidate. |
| `@hia-doc/cli` | `0.1.7`, MIT; publishable manifest | config, core document, JSDoc Integration, project docs manifest draft | Active CLI baseline; patch release can ingest documentation producer result artifacts into unified HTML output. |
| `@hia-doc/lsp` | `0.1.0`, MIT; publishable manifest | resource index, source-linkage request, authoring locations, resource actions, profile capability data | Active IDE/LSP baseline; public release candidate. |
| `@hia-doc/vscode-extension` | private `0.0.0` | LSP client, CLI command pass-through, preview manifest consumption | Development baseline. |
| `@hia-doc/browser-panel` | `0.1.0`, MIT; publishable manifest | Browser panel API | Browser-panel component; full IDE product support is separate. |

## Official And Incubating Satellite Projects

| Project | Package / workspace version | Contract surfaces | Compatibility status |
| --- | --- | --- | --- |
| `HIA/jsdoc-plugin-hia-sys` | `@mandolin/jsdoc-plugin-hia-sys@0.1.3` | JSDoc Integration `0.1.0` | Publishable package manifest; registry availability is verified per release. |
| `HIA/jsdoc-theme-hia` | `@mandolin/jsdoc-theme-hia@0.1.2` | JSDoc theme templates/assets | Publishable package manifest; registry availability is verified per release. |
| `HIA/hia-htmdoc` | private workspace root `0.1.0`; child packages version independently | HTMDoc extraction `0.1.0-draft` | Incubating foundation project. |
| `HIA/hia-cssdoc` | private workspace `0.0.0` | CSSDoc extraction `0.1.0-draft` | Incubating foundation project. |
| `HIA/hia-sassdoc` | private workspace `0.0.0` | Sass -> CSSDoc -> doc-source-map bridge outputs | Incubating generated-DSL project. |
| `HIA/hia-jsdoc` | private workspace `0.0.0` | JSDoc preset/runner/plugin/theme bridges | Incubating umbrella project. |
| `HIA/hia-pugdoc` | private workspace `0.0.0` | Pug -> HTMDoc/doc-source-map bridge outputs | Incubating generated-DSL project. |
| `HIA/hia-tsdoc` | private workspace `0.0.0` | TS -> JSDoc/doc-source-map bridge outputs | Incubating generated-DSL project. |

## Data Contracts

| Contract | Producer | Consumer | Current fixture coverage |
| --- | --- | --- | --- |
| Core document `0.2.0` | core helpers, parser adapters, satellite adapters | renderer, CLI, LSP, validators | `fixtures/basic.hia.json`, `fixtures/core-minimal.hia.json` |
| Text i18n `0.2.0` | core helpers and adapters | renderer, LSP resource index | `fixtures/i18n-resource.hia.json` |
| Source model `0.2.0` | core helpers and adapters | renderer, LSP source navigation | `fixtures/source-reference.hia.json` |
| JSDoc Integration `0.1.0` | `jsdoc-plugin-hia-sys` | `@hia-doc/parser-jsdoc`, CLI | `fixtures/jsdoc-integration.*.json` |
| Documentation profile `1.0.0` candidate and exact legacy `0.1.0-draft` | explicit authors; official JSON remains legacy | profile runtime, LSP capability/completion | mixed-version runtime/type consumers, current/historical schemas and unchanged `packages/profiles/src/profiles/*.json` |
| Official profile distribution `0.1.0-draft` | `@hia-doc/profiles` | project manifest authors, LSP/IDE consumers | catalog, package tests and `docs/profile-distribution.md` |
| Schema distribution `0.1.0-draft` | `@hia-doc/schemas` snapshots | JSON Schema consumers and contract tooling | owner/snapshot equality gate and `docs/schema-distribution.md` |
| Documentation producer/result `1.0.0` candidates and exact legacy `0.1.0-draft` | `@hia-doc/plugin-sdk`, documentation producers | CLI orchestration, CI and adapter tooling | Current/legacy semantic and type consumers, fixed historical inputs, owner/distribution schemas; [migration guide](documentation-producers.md) |
| Project docs manifest `0.1.0-draft` | explicit user/fixture manifest | CLI project build | `fixtures/project-mixed.hia-project.json` |
| HTMDoc extraction `0.1.0-draft` | `hia-htmdoc` / fixtures | CLI project build | `fixtures/project-mixed-alert.htmdoc.json` |
| CSSDoc extraction `0.1.0-draft` | `hia-cssdoc` / fixtures | CLI project build | `fixtures/project-mixed-alert.cssdoc.json` |
| Doc source map `0.1.0-draft` | satellite generators / fixtures | `@hia-doc/source-linkage`, CLI project build, renderer project summary | `fixtures/project-mixed-alert.docmap.json` plus distributed schema |
| Generated documentation binding `0.1.0-draft` | generated-language adapters | `@hia-doc/source-linkage` validator and read-only bidirectional index; future host projections | distributed schema, neutral source-linkage fixture, and W-P52.4 Pug sidecar cross-check; no host projection yet |
| Documentation locale resource `0.1.0-draft` | explicit root-bound local DLR profile | core resolver, generic doc-line profiles and future adapters | core/generic-docline security, fallback and legacy-bridge tests; distributed schema |
| Documentation locale-resolution `0.1.0-draft` | core metadata-only sidecar factory | doc-source-map declaration and future host surfaces | core/source-linkage privacy tests and distributed schema; no resource body or resolved text |
| Documentation UI locale completeness `0.1.0-draft` | explicit renderer-owner message/surface declarations | core evaluator, schema consumers and renderer/CLI owner reports | contract fixtures and renderer-owner completeness reports; release-specific interactive/no-script, fallback, placeholder, accessibility and privacy results require current verification |
| Renderer manifest `0.1.0` | `@hia-doc/renderer-html` | CLI, IDE preview | CLI/renderer unit and e2e tests |
| Project navigation index `0.1.0-draft` | `@hia-doc/renderer-html` | static portals and search | renderer/CLI project-build tests |
| LSP profile capability data | `@hia-doc/lsp` | IDE shells | `packages/lsp/src/authoring.test.ts` |

## Required Gates

| Change type | Required checks |
| --- | --- |
| Core/config/profile/parser/lsp/renderer/cli behavior | `pnpm run release:gate` from `main-repo`. |
| Public JSDoc package change | `npm run release:gate` from the package repository, plus publish preflight if releasing. |
| Public `@hia-doc/*` npm release candidate | `pnpm run release:gate`, `pnpm run distribution:check`, publish-order review and Trusted Publishing readiness check. |
| New external dependency | `docs/dependency-review-template.md`, `docs/dependency-license-audit.md`, `scripts/check-dependency-license-audit.mjs`, then `pnpm run license:audit`. |
| Fixture or generated output governance | `pnpm run governance:check`. |
| Project manifest or renderer output change | CLI/renderer tests plus generated output path-leak checks. |
| Profile draft change | profile runtime tests and the internal profile draft governance check. |
| Profile migration guidance change | public docs review plus profile runtime tests when tag status changes. |
| User-visible CLI/renderer/IDE workflow change | `docs/user-acceptance-checklist.md` plus targeted tests and `pnpm run release:gate`. |

## Deferred Compatibility Work

- Verify registry availability, integrity and clean-consumer results for each concrete release.
- Retain compatibility and immutable schema identities when graduating the project-manifest contract.
- Verify stable contract graduation and retained schema versions across HTML/CSS/source-map consumers.
- Verify the complete package cohort and its profile/schema/source-linkage/producer compatibility at release time.
- Workspace profile auto-discovery.
- Profile-defined diagnostic rule execution.
- Browser/DevTools compatibility matrix.
- Vue/React/CSS-in-JS/Storybook bridge compatibility matrix.

Core foundation fixtures with 0.2.0 remain exact legacy inputs; current writers emit 1.0.0. Envelope type compatibility does not validate payloads. See [Core document migration](core-document-migration.md) for the candidate matrix and ownership boundaries.
