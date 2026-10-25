# Public Package Release Plan

This document defines the public npm release plan for the `@hia-doc/*` packages owned by `main-repo`.

The machine-readable source of truth is [`release/public-packages.json`](../release/public-packages.json). The local gate is:

```bash
pnpm run distribution:check
```

## Current State

### Portal tree layout patch — 2026-10-25

| Package | Published version | Change |
| --- | --- | --- |
| `@hia-doc/theme-default` | `0.1.4` | Compact indentation, readable deep-tree labels, wrapping open actions and tree-local horizontal scrolling. |
| `@hia-doc/renderer-html` | `0.1.6` | Exact dependency on the repaired theme; renderer runtime code unchanged. |
| `@hia-doc/cli` | `0.1.8` | Exact dependency on the updated renderer; CLI runtime code unchanged. |

All three versions are published and tagged `latest`. Downloads match npm integrity and their provenance statements identify the reviewed commit and Trusted Publish runs. A clean registry install of CLI `0.1.8` resolves renderer `0.1.6` and theme `0.1.4`, and real multipage CLI builds pass on Node.js 22/24.

中文：本批只发布树布局补丁及其依赖引用链；源码映射等未发布实现不进入本批。三个版本的registry、下载完整性、来源关联和全新安装构建均已复核，HIA参考站已部署修复。

Upgrade the direct documentation tools, then rebuild your generated site:

```sh
npm install --save-dev --save-exact @hia-doc/cli@0.1.8 @hia-doc/dotnetdoc-runner@0.1.10 --registry=https://registry.npmjs.org/
```

### Documentation repair release — 2026-10-25

| Package | Published version | Role |
| --- | --- | --- |
| `@hia-doc/core` | `0.1.2` | Supplies the presentation/i18n contract APIs required by the current renderer; exact legacy readers remain available. |
| `@hia-doc/config` | `0.1.6` | Validates brand colors, built-in skin aliases and explicit shared-asset routing. |
| `@hia-doc/source-linkage` | `0.1.1` | Supplies the binding-projection public types referenced by renderer declarations. |
| `@hia-doc/theme-default` | `0.1.3` | Generates branded assets and wraps API signatures/titles. |
| `@hia-doc/renderer-html` | `0.1.5` | Preserves all localized entry fields and supports document/project branding. |
| `@hia-doc/cli` | `0.1.7` | Consumes theme configuration and exposes the shared-asset writer. |

Registry verification on 2026-10-25 confirmed publication of all six versions above at that checkpoint. The newer tree patch versions are listed above.
A fresh registry install of CLI `0.1.7` and DotNetDoc runner `0.1.10` passes Node.js 22/24 checks for real source signatures,
complete localized fields, shared branded assets and strict public TypeScript declarations.
中文：六个主仓包及六个DotNetDoc `0.1.10`包均已发布；完整安装链、下载完整性及来源关联已复核。

The original .NET documentation repair used these direct tool versions (historical command; use the newer tree patch command above):

```sh
npm install --save-dev --save-exact @hia-doc/cli@0.1.7 @hia-doc/dotnetdoc-runner@0.1.10 --registry=https://registry.npmjs.org/
```

See [shared theme assets and brand colors](shared-theme-assets.md) for configuration and multipage usage.

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
