# Public Package Release Plan

This document defines the first public npm release plan for the `@hia-doc/*` packages owned by `main-repo`.

The machine-readable source of truth is [`release/public-packages.json`](../release/public-packages.json). The local gate is:

```bash
pnpm run distribution:check
```

## Current State

The public package identity is prepared but real npm publication is still approval-gated.

- Scope: `@hia-doc`.
- Registry: `https://registry.npmjs.org/`.
- Repository: `mandolin/HIA-Documentation`.
- License: MIT.
- Runtime Node range: `>=20.19.0`.
- First release target: `0.1.0` for every candidate package.
- Current package state: private `0.0.0` until a package is explicitly approved for publication.

`npm view @hia-doc/core version --registry=https://registry.npmjs.org/` currently returns `E404`, so the first package is not already published under that name. npm organization/scope ownership still has to be completed before the first real publish.

## Release Candidates

| Order | Package | Kind | Target |
| --- | --- | --- | --- |
| 10 | `@hia-doc/core` | owner runtime | `0.1.0` |
| 20 | `@hia-doc/config` | owner runtime | `0.1.0` |
| 20 | `@hia-doc/profile` | owner runtime | `0.1.0` |
| 30 | `@hia-doc/parser-jsdoc` | adapter runtime | `0.1.0` |
| 30 | `@hia-doc/plugin-sdk` | producer SDK | `0.1.0` |
| 30 | `@hia-doc/source-linkage` | owner runtime | `0.1.0` |
| 30 | `@hia-doc/theme-default` | renderer asset runtime | `0.1.0` |
| 40 | `@hia-doc/profiles` | distribution | `0.1.0` |
| 40 | `@hia-doc/renderer-html` | renderer runtime | `0.1.0` |
| 50 | `@hia-doc/schemas` | distribution | `0.1.0` |
| 60 | `@hia-doc/lsp` | tooling runtime | `0.1.0` |
| 70 | `@hia-doc/cli` | tooling runtime | `0.1.0` |

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
- `scripts/resolve-public-release-package.mjs <package> --publish-ready`, which refuses to publish while a package is still private `0.0.0`.

## Bootstrap Checklist

Before the first real public publish:

1. Confirm the npm account and create or claim the `@hia-doc` organization/scope.
2. Bootstrap the first package under manual approval if npm requires an existing package before Trusted Publishing can be configured.
3. Configure npm Trusted Publisher for `mandolin/HIA-Documentation` and workflow filename `npm-trusted-publish.yml`.
4. Flip one package at a time from private `0.0.0` to the target version in publish-order sequence.
5. Run `pnpm run release:gate`.
6. Run the manual workflow for the selected package.
7. Run the post-publish smoke below before continuing to the next package group.

## Post-Publish Smoke

For each published package:

```bash
npm view <package>@0.1.0 version --registry=https://registry.npmjs.org/
npm pack <package>@0.1.0 --registry=https://registry.npmjs.org/
npm install <package>@0.1.0 --registry=https://registry.npmjs.org/
node -e "import('<package>').then(() => console.log('ok'))"
```

For CLI-facing release batches, also run a project build smoke with a clean install workspace before announcing the release.

## References

- npm Trusted Publishing: <https://docs.npmjs.com/trusted-publishers/>
- pnpm workspace publishing behavior: <https://pnpm.io/workspaces>
- pnpm catalog/workspace protocol replacement on pack/publish: <https://pnpm.io/catalogs>
