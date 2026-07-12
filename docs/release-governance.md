# Release Governance

This document defines the release governance baseline for `main-repo` and the official HIA satellite packages.

The current baseline is intentionally practical: local release gates remain the source of truth, public npm publication is approval-gated, and Trusted Publishing automation exists only behind manual confirmation plus package-version readiness checks.

## Release Classes

| Class | Examples | Required Gate |
| --- | --- | --- |
| Documentation-only | README, public docs, examples index | `git diff --check` and targeted doc review. |
| Contract-facing | Core schema, profile schema, project manifest, renderer manifest, protocol envelope | `pnpm run release:gate`, fixture updates and compatibility matrix review. |
| Distribution catalog | Official profiles, schema snapshots, producer/result and doc-source-map schemas | `pnpm run release:gate`, `pnpm run distribution:check`, snapshot/mirror checks and pack dry-run. |
| Runtime/tooling | CLI, renderer, LSP, VS Code shell, config/profile runtime | `pnpm run release:gate`, relevant manual smoke when user-facing behavior changes. |
| Official satellite package | `jsdoc-plugin-hia-sys`, `jsdoc-theme-hia`, future `hia-*doc` packages | Package `npm run release:gate`, pack dry-run and release metadata review. |
| Public npm publish | Any package published to `registry.npmjs.org` | All matching gates, version uniqueness check and post-publish smoke. |

## Release Checklist

Before merging or publishing release-facing changes:

1. Confirm the change belongs to one release class above.
2. Update public docs when user-visible commands, contracts or package surfaces change.
3. Update `docs/versioning.md` and `docs/compatibility-matrix.md` when package or contract compatibility changes.
4. Update `docs/dependency-license-audit.md` and `scripts/check-dependency-license-audit.mjs` before adding an external dependency.
5. Run the matching local gate from the repository root.
6. Inspect generated output for local absolute paths, private source content and generated artifacts that should not be committed.
7. Keep release notes focused on user-facing behavior, compatibility and migration impact.

## Main Repository Gate

`main-repo` uses:

```bash
pnpm run release:gate
```

The gate covers build, unit tests, e2e tests, schema contract checks, real JSDoc integration smoke, example/fixture governance and direct dependency/license audit.

## Satellite Gate Matrix

| Repository | Status | Gate | Publish Status |
| --- | --- | --- | --- |
| `HIA/jsdoc-plugin-hia-sys` | Official public satellite | `npm run release:gate` | Published as `@mandolin/jsdoc-plugin-hia-sys`. |
| `HIA/jsdoc-theme-hia` | Official public satellite | `npm run release:gate` | Published as `@mandolin/jsdoc-theme-hia`. |
| `HIA/hia-htmdoc` | Foundation incubating satellite | `npm run release:gate` | Not public npm baseline yet. |
| `HIA/hia-cssdoc` | Foundation incubating satellite | `npm run release:gate` | Not public npm baseline yet. |
| `HIA/hia-sassdoc` | Bridge incubating satellite | `npm run release:gate` | Not public npm baseline yet. |

New official satellite packages should define their own local release gate before public publication. The main repository should document how it consumes their artifacts, but must not silently depend on their unpublished local state.

## npm Publish Baseline

Current public package publication is manual:

```bash
npm whoami --registry=https://registry.npmjs.org/
npm view "@mandolin/<package>@<version>" version --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

An `E404 Not Found` result from `npm view` is expected for a version that has not been published.

After publish, run the published package smoke from `main-repo` when the JSDoc plugin/theme pair changes:

```bash
pnpm run smoke:published-jsdoc
```

## Trusted Publishing Target

Prefer npm Trusted Publishing with GitHub Actions OpenID Connect instead of long-lived npm automation tokens. npm documents Trusted Publishing as a way to publish packages from supported CI providers without storing long-lived npm tokens. It currently requires npm CLI `11.5.1` or later and Node.js `22.14.0` or later, and the GitHub Actions workflow must request `id-token: write`.

The canonical main-repo package scope is `@hia-doc/*`, the repository license is MIT and public schema ids use `https://mandolin.github.io/HIA-Documentation/schemas/`. Operational npm scope ownership still has to be established before first publication. The first release plan, target package versions and publish order are defined in `docs/public-package-release-plan.md` and `release/public-packages.json`. Existing `@mandolin/*` JSDoc packages retain their current names.

The `@hia-doc/*` workflow uses Node 24.x for publishing and keeps package runtime compatibility at Node `>=20.19.0`. It packs with `pnpm` before `npm publish` so workspace protocol dependencies are rewritten into publishable ranges, then publishes the tarball through npm with provenance.

Automation publish workflows must:

- Run only on trusted release triggers, not ordinary pull requests.
- Declare the minimum required GitHub token permissions.
- Use npm provenance or trusted publisher settings when available for the package.
- Keep package-specific publish ownership in the package repository.
- Preserve the same local release gate as the manual process.
- Refuse to publish packages that are still private `0.0.0`.

W-P12.6 also defines local D3 support commands:

```bash
pnpm run release:registry:check
pnpm run release:registry:preflight
pnpm run release:postpublish:smoke -- <package>
```

`release:registry:preflight` must pass before a real D3 publish batch. It requires local npm auth, visible `hia-doc` organization/scope access and unpublished target versions. If npm returns `E401`, treat the release as externally blocked rather than falling back to a long-lived npm token.

References:

- npm Trusted Publishing: <https://docs.npmjs.com/trusted-publishers/>
- GitHub Actions security hardening: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions>
- GitHub Actions workflow permissions: <https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#permissions>

## Generated Output Policy

Release artifacts must not include:

- Local absolute workspace paths.
- Private source snippets unless explicitly allowed by a documented `sourcesContent` policy.
- Generated example output directories.
- Dry-run package tarballs.
- Credentials, npm tokens, GitHub tokens or registry authentication files.

See `docs/security-policy.md` for source-content and secret handling rules.
