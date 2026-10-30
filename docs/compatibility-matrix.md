# HIA Compatibility Matrix

This matrix records the current compatibility baseline for the main repository, official JSDoc packages and incubating satellite projects.

## Runtime And Tooling

| Surface | Supported / pinned | Status | Verification |
| --- | --- | --- | --- |
| Node.js for `main-repo` development / CI | Local `24.22.1`; CI latest `22.x` / `24.x` on Ubuntu 24.04 and Windows Server 2025 | LTS candidate verification matrix | `pnpm run release:gate` in each combination |
| Current main source candidate engines | `^22.23.4 \|\| ^24.22.1` | Unreleased declaration; existing npm archives retain their own engines | Root, thirteen manifests, release plan and actual archives must agree |
| pnpm for `main-repo` | `10.34.4` | Pinned | `pnpm install --frozen-lockfile` in CI |
| Node.js for public JSDoc packages | Current source engines `^22.23.4 \|\| ^24.22.1` | Reviewed source candidates; historical npm engines remain separate | satellite package CI / release gates |
| VS Code API | `^1.92.0` | Development baseline | `apps/vscode-extension` build and tests |
| .NET documentation tools | .NET SDK `10.0.403` / runtime `10.0.14`; Node.js 22/24 | Reviewed source toolchain; older project target frameworks remain static inputs | .NET satellite gates and actual four-domain candidate consumers |

These rows identify configuration and verification entry points; they are not results from a current test run. Node.js 18/20 are [end of life](https://nodejs.org/en/about/previous-releases). Legacy engine ranges and pins must not be read as production support recommendations.

The local development pin was researched on 2026-10-23 and aligned with the checked-in candidates on 2026-10-30. Supported release-line
verification uses the latest 22/24 patches; CI resolves those patches through
`setup-node`. Windows Server CI does not substitute for a real Windows 11 host
check. Publication continues to use Node.js 24 and the declared npm baseline.

See [candidate identities](package-candidates.md) for checked-in versions,
unreleased engine declarations, complete local tarball installation and the
separate qualification required before assigning new release identities.
中文：源码候选范围与旧npm归档分开；包版本沿用不表示其源码负载已发布，实际发行需新身份与完整门禁。

## Main Repository Packages

Package versions below come from checked-in manifests, not a fresh registry query. Their publication flags do not prove registry availability or release qualification. Package and contract versions are independent; pre-1.0 and draft surfaces retain their stated limitations.

| Package | Package version | Contract surfaces | Compatibility status |
| --- | --- | --- | --- |
| `@hia-doc/core` | `1.0.0`, MIT; unreleased source candidate | core document / text i18n / source / protocol and UI-locale completeness `1.0.0` candidates; exact legacy document/submodels `0.2.0`, envelope `0.1.0`, UI-locale completeness `0.1.0-draft`; locale-resource/resolution sidecars remain `0.1.0-draft` | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/config` | `1.0.0`, MIT; unreleased source candidate | config schema `0.1.0` | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/profile` | `1.0.0`, MIT; unreleased source candidate | profile schema `1.0.0` source candidate, exact legacy `0.1.0-draft` reader | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/profiles` | `1.0.0`, MIT; unreleased source candidate | official profile catalog/set `0.1.0-draft` | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/plugin-sdk` | `1.0.0`, MIT; unreleased source candidate | documentation producer descriptor/result `1.0.0` candidates; exact `0.1.0-draft` reader support | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/schemas` | `1.0.0`, MIT; unreleased source candidate | schema catalog `0.1.0-draft` | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/source-linkage` | `1.0.0`, MIT; unreleased source candidate | map `1.1.0` / binding `0.3.0-draft`, with exact `1.0.0` / `0.2.0-draft` and legacy `0.1.0-draft` pairs retained; coordinate evidence remains an independent draft | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/parser-jsdoc` | `1.0.0`, MIT; unreleased source candidate | JSDoc Integration `0.1.0`, bridge `0.1.0`, metadata `0.1.0` | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/theme-default` | `1.0.0`, MIT; unreleased source candidate | default renderer assets | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/renderer-html` | `1.0.0`, MIT; unreleased source candidate | renderer manifest `0.1.0`, project navigation index `0.1.0-draft` | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/cli` | `1.0.0`, MIT; unreleased source candidate | config, core document, JSDoc Integration, project docs manifest `1.0.0` source candidate with exact `0.1.0-draft` legacy reading | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |
| `@hia-doc/lsp` | `0.1.0`, MIT; publishable manifest | resource index, source-linkage request, authoring locations, resource actions, profile capability data | Active IDE/LSP baseline; public release candidate. |
| `@hia-doc/vscode-extension` | private `0.0.0` | LSP client, CLI command pass-through, preview manifest consumption | Development baseline. |
| `@hia-doc/browser-panel` | `1.0.0`, MIT; unreleased source candidate | Browser panel API | Reviewed source candidate; registry/provenance and formal release acceptance remain separate. |

Profile composition and ownership limits are described in [profile validation](profile-input-validation.md) and [composition](profile-composition.md). Source precision, provenance and complete-bundle migration are described in [range conventions](doc-source-map-range-conventions.md), [map provenance](doc-source-map-provenance.md) and [binding migration](generated-documentation-binding-contract.md). Current package identities do not expand those boundaries.

## Official And Incubating Satellite Projects

| Project | Package / workspace version | Contract surfaces | Compatibility status |
| --- | --- | --- | --- |
| `HIA/jsdoc-plugin-hia-sys` | `@mandolin/jsdoc-plugin-hia-sys@1.0.0` | JSDoc Integration `0.1.0` | Publishable package manifest; registry availability is verified per release. |
| `HIA/jsdoc-theme-hia` | `@mandolin/jsdoc-theme-hia@1.0.0` | JSDoc theme templates/assets | Publishable package manifest; registry availability is verified per release. |
| `HIA/hia-htmdoc` | private workspace root `1.0.0`; eight child source candidates `1.0.0` | Config/extraction/profile `1.0.0`, exact legacy `0.1.0-draft` readers and explicit migration | Reviewed bounded HTML source candidates; no broader syntax or npm claim. |
| `HIA/hia-cssdoc` | private workspace root; eight child source candidates `1.0.0` | Config/extraction/profile `1.0.0`, exact legacy `0.1.0-draft` readers and explicit migration | Reviewed bounded CSS/DTCG source candidates; no broader syntax or npm claim. |
| `HIA/hia-sassdoc` | private workspace `0.0.0` | Sass -> CSSDoc -> doc-source-map bridge outputs | Incubating generated-DSL project. |
| `HIA/hia-jsdoc` | private workspace root; eight umbrella child source candidates `1.0.0` | Config/umbrella `1.0.0`; Integration/page-map fixed compatibility profile `0.1.0` | Reviewed source candidates plus independently owned plugin/theme; no npm publication claim. |
| `HIA/hia-dotnetdoc` | private workspace root `1.0.0`; six child source candidates `1.0.0` | Config plus seven domain artifacts `1.0.0`; exact legacy `0.1.0-draft` readers and explicit migration | Node 22/24 and .NET 10 tools; older target frameworks are static input metadata, not runtime support. |
| `HIA/hia-pugdoc` | private workspace `0.0.0` | Pug -> HTMDoc/doc-source-map bridge outputs | Incubating generated-DSL project. |
| `HIA/hia-tsdoc` | private workspace `0.0.0` | TS -> JSDoc/doc-source-map bridge outputs | Incubating generated-DSL project. |

## Data Contracts

| Contract | Producer | Consumer | Tracked fixture and verification coverage |
| --- | --- | --- | --- |
| Core document `1.0.0` source candidate; `0.2.0` legacy fixture | core helpers, parser adapters, satellite adapters | renderer, CLI, LSP, validators | `fixtures/basic.hia.json`, `fixtures/core-minimal.hia.json` retain old roots; current identity and exact legacy reading are covered by [core document migration](core-document-migration.md). |
| Text i18n `1.0.0` source candidate; `0.2.0` legacy fixture | core helpers and adapters | renderer, LSP resource index | `fixtures/i18n-resource.hia.json` retains the old submodel; current and legacy rules are in [core document migration](core-document-migration.md). |
| Source model `1.0.0` source candidate; `0.2.0` legacy fixture | core helpers and adapters | renderer, LSP source navigation | `fixtures/source-reference.hia.json` retains the old submodel; current and legacy rules are in [core document migration](core-document-migration.md). |
| JSDoc Integration `0.1.0` | `jsdoc-plugin-hia-sys` | `@hia-doc/parser-jsdoc`, CLI | `fixtures/jsdoc-integration.*.json` |
| Documentation profile `1.0.0` candidate and exact legacy `0.1.0-draft` | explicit authors; official JSON remains legacy | profile runtime, LSP capability/completion | mixed-version runtime/type consumers, current/historical schemas and unchanged `packages/profiles/src/profiles/*.json` |
| Official profile distribution `0.1.0-draft` | `@hia-doc/profiles` | project manifest authors, LSP/IDE consumers | catalog, package tests and `docs/profile-distribution.md` |
| Schema distribution `0.1.0-draft` | `@hia-doc/schemas` snapshots | JSON Schema consumers and contract tooling | owner/snapshot equality gate and `docs/schema-distribution.md` |
| Documentation producer/result `1.0.0` candidates and exact legacy `0.1.0-draft` | `@hia-doc/plugin-sdk`, documentation producers | CLI orchestration, CI and adapter tooling | Current/legacy semantic and type consumers, fixed historical inputs, owner/distribution schemas; [migration guide](documentation-producers.md) |
| Project docs manifest `1.0.0` source candidate; `0.1.0-draft` legacy fixture | explicit user/fixture manifest | CLI project build | `fixtures/project-mixed.hia-project.json` retains the old root; current and exact legacy identities are in [project manifest migration](project-manifest-migration.md). |
| HTMDoc extraction current `1.0.0` / exact legacy `0.1.0-draft` | `hia-htmdoc` / fixtures | CLI project build | Original `fixtures/project-mixed-alert.htmdoc.json` remains legacy; current artifact readers and explicit migrations are owned by the HTML satellite. |
| CSSDoc extraction current `1.0.0` / exact legacy `0.1.0-draft` | `hia-cssdoc` / fixtures | CLI project build | Original `fixtures/project-mixed-alert.cssdoc.json` remains legacy; current artifact readers and explicit migrations are owned by the CSS satellite. |
| Doc source map `1.1.0` stable-candidate; `0.1.0-draft` legacy fixture | satellite generators / fixtures | `@hia-doc/source-linkage`, CLI project build, renderer project summary | `fixtures/project-mixed-alert.docmap.json` retains the old root; current and historical distributed schemas are selected by exact identity. Candidate maturity does not imply npm or host adoption. See [range conventions](doc-source-map-range-conventions.md). |
| Generated documentation binding source `0.3.0-draft` / exact previous `0.2.0-draft` and legacy `0.1.0-draft` | Existing generated-language adapters retain legacy output; current range declarations need producer evidence | `@hia-doc/source-linkage` guarded reader, bidirectional index, safe host projection and complete-bundle migration | Current binding/map `0.3.0-draft`/`1.1.0`, previous `0.2.0-draft`/`1.0.0` and legacy `0.1.0-draft`/`0.1.0-draft` pairs; original historical schema bytes retained; unreleased source, candidate acceptance remains open |
| Documentation locale resource `0.1.0-draft` | explicit root-bound local DLR profile | core resolver, generic doc-line profiles and future adapters | core/generic-docline security, fallback and legacy-bridge tests; distributed schema |
| Documentation locale-resolution `0.1.0-draft` | core metadata-only sidecar factory | doc-source-map declaration and future host surfaces | core/source-linkage privacy tests and distributed schema; no resource body or resolved text |
| Documentation UI locale completeness current `1.0.0` / legacy `0.1.0-draft` | explicit renderer-owner message/surface declarations | core evaluator, schema consumers and renderer/CLI owner reports | contract fixtures and renderer-owner completeness reports; release-specific interactive/no-script, fallback, placeholder, accessibility and privacy results require current verification |
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
- Verify the current `1.0.0` project-manifest source candidate with exact `0.1.0-draft` legacy reading in release consumers, while retaining immutable schema identities.
- Verify stable contract graduation and retained schema versions across HTML/CSS/source-map consumers.
- Verify the complete package cohort and its profile/schema/source-linkage/producer compatibility at release time.
- Workspace profile auto-discovery.
- Profile-defined diagnostic rule execution.
- Browser/DevTools compatibility matrix.
- Vue/React/CSS-in-JS/Storybook bridge compatibility matrix.

Core foundation fixtures with 0.2.0 remain exact legacy inputs; current writers emit 1.0.0. Envelope type compatibility does not validate payloads. See [Core document migration](core-document-migration.md) for the candidate matrix and ownership boundaries.
