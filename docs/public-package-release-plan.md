# Public Package Release Plan

This document defines the public npm release plan for the `@hia-doc/*` packages owned by `main-repo`.

The machine-readable source of truth is [`release/public-packages.json`](../release/public-packages.json). The local gate is:

```bash
pnpm run distribution:check
```

## Current State

### Documentation repair release — 2026-10-24

| Package | Candidate version | Role |
| --- | --- | --- |
| `@hia-doc/core` | `0.1.2` | Supplies the presentation/i18n contract APIs required by the current renderer; exact legacy readers remain available. |
| `@hia-doc/config` | `0.1.6` | Validates brand colors, built-in skin aliases and explicit shared-asset routing. |
| `@hia-doc/source-linkage` | `0.1.1` | Supplies the binding-projection public types referenced by renderer declarations. |
| `@hia-doc/theme-default` | `0.1.3` | Generates branded assets and wraps API signatures/titles. |
| `@hia-doc/renderer-html` | `0.1.5` | Preserves all localized entry fields and supports document/project branding. |
| `@hia-doc/cli` | `0.1.7` | Consumes theme configuration and exposes the shared-asset writer. |

Registry verification on 2026-10-25 confirms core `0.1.2`, config `0.1.6` and theme-default `0.1.3` are published.
Source-linkage `0.1.1` was rejected by npm at publication; its package-specific Trusted Publisher authorization requires maintainer review.
Renderer-html `0.1.5` and CLI `0.1.7` remain unpublished pending that dependency. The complete upgrade set is not yet available.
中文：核心、配置和默认主题已发布；源码关联包遇到包级发布授权问题，渲染器及CLI等待依赖，当前不能宣称完整修复版可安装。

These form one dependency-ordered repair set: core, config/source-linkage/theme, renderer, CLI. Registry availability must be verified
after each Trusted Publisher run. Other package targets remain unchanged. This package patch does not declare a system 1.0.0 release.
中文：本批按依赖关系发布上述六包；npm版本与系统正式版、契约定义版本分别管理。以registry和安装验收为准。

The D3 bootstrap release is complete. All 13 first-publication packages are visible on npm at `0.1.0`, and W-P15.3 has verified the post-bootstrap Trusted Publisher path with `@hia-doc/theme-default@0.1.1`.

- Scope: `@hia-doc`.
- Registry: `https://registry.npmjs.org/`.
- Repository: `mandolin/HIA-Documentation`.
- License: MIT.
- Runtime Node range: `>=20.19.0`.
- First release version: `0.1.0` for every public package.
- Latest patch rehearsal: `@hia-doc/theme-default@0.1.1`.
- Current package state: public packages with explicit `publishConfig.access: "public"`.
- Trusted Publisher: configured for `mandolin/HIA-Documentation` and `.github/workflows/npm-trusted-publish.yml`.

## Release Candidates

| Order | Package | Kind | Target | Status |
| --- | --- | --- | --- | --- |
| 10 | `@hia-doc/core` | owner runtime | `0.1.0` | published |
| 20 | `@hia-doc/config` | owner runtime | `0.1.1` | published |
| 20 | `@hia-doc/profile` | owner runtime | `0.1.0` | published |
| 30 | `@hia-doc/parser-jsdoc` | adapter runtime | `0.1.0` | published |
| 30 | `@hia-doc/plugin-sdk` | producer SDK | `0.1.1` | published |
| 30 | `@hia-doc/source-linkage` | owner runtime | `0.1.0` | published |
| 30 | `@hia-doc/theme-default` | renderer asset runtime | `0.1.1` | published |
| 40 | `@hia-doc/browser-panel` | browser tooling runtime | `0.1.0` | published |
| 40 | `@hia-doc/profiles` | distribution | `0.1.0` | published |
| 40 | `@hia-doc/renderer-html` | renderer runtime | `0.1.0` | published |
| 50 | `@hia-doc/schemas` | distribution | `0.1.1` | published |
| 60 | `@hia-doc/lsp` | tooling runtime | `0.1.0` | published |
| 70 | `@hia-doc/cli` | tooling runtime | `0.1.1` | published |

`@hia-doc/vscode-extension` is excluded from this npm train because it should be distributed through VSIX or Marketplace release governance.

## Publishing Model

Release jobs use Node 24.x for publishing even though runtime packages support Node `>=20.19.0`. This keeps the runtime compatibility promise separate from the npm Trusted Publishing toolchain.

The workflow uses:

```bash
pnpm --filter <package> pack --pack-destination <tmp>
npm publish <tmp>/<package>.tgz --access public --provenance --registry=https://registry.npmjs.org/
```

`pnpm pack` is used before `npm publish` so workspace protocol dependencies are rewritten into publishable package versions. `npm publish --provenance` is used from a GitHub-hosted runner with OIDC permissions so npm Trusted Publishing can avoid long-lived write tokens.

## Workflow Guardrails

The workflow file is `.github/workflows/npm-trusted-publish.yml`.

It requires:

- Manual `workflow_dispatch`.
- Exact confirmation text: `publish @hia-doc package`.
- GitHub permissions `contents: read` and `id-token: write`.
- Node 24.x.
- npm `^11.5.1`.
- Full `pnpm run release:gate`.
- `scripts/resolve-public-release-package.mjs <package> --publish-ready`, which refuses to publish packages whose release status is already `published`.

## Registry Checks

The registry status command does not publish anything:

```bash
pnpm run release:registry:check
```

For authenticated local pre-publish review, use:

```bash
pnpm run release:registry:preflight
```

The preflight mode requires npm authentication and visible `hia-doc` organization/scope membership. After D3, already published package targets no longer block preflight; only non-`published` release candidates must be unpublished at their target version.

## Trusted Publisher Patch Rehearsal

W-P15.3 published `@hia-doc/theme-default@0.1.1` through `npm-trusted-publish.yml` with npm provenance.

Evidence:

- Workflow run: `https://github.com/mandolin/HIA-Documentation/actions/runs/29340192639`
- Head SHA: `ef1a9322617dc02a2602c38eb29e1ac3726a4cf5`
- Registry version: `0.1.1`
- Post-publish smoke: passed with clean install and ESM import.

For the next patch rehearsal:

1. Keep all published packages at their released target versions.
2. Mark exactly one low-risk package as a patch candidate in `release/public-packages.json`.
3. Bump that package version and add a release note.
4. Run `pnpm run release:gate:publish-ready`.
5. Dispatch `npm-trusted-publish.yml` for the patch candidate.
6. Run `pnpm run release:postpublish:smoke -- <package> --version <version>`.
7. After verification, mark the candidate as `published` and update the release plan for the next cycle.

## Post-Publish Smoke

For each published package:

```bash
pnpm run release:postpublish:smoke -- <package>
```

For CLI-facing release batches, also run a project build smoke with a clean install workspace before announcing the release.

## References

- npm Trusted Publishing: <https://docs.npmjs.com/trusted-publishers/>
- pnpm workspace publishing behavior: <https://pnpm.io/workspaces>
- pnpm catalog/workspace protocol replacement on pack/publish: <https://pnpm.io/catalogs>
