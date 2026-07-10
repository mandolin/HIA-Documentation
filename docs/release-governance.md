# Release Governance

This document defines the release governance baseline for `main-repo` and the official HIA satellite packages.

The current baseline is intentionally practical: local release gates remain the source of truth, public npm publication is still manual, and trusted automation is documented as the next target before adding automatic publish workflows.

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

Before adding an automated npm publish workflow, prefer npm Trusted Publishing with GitHub Actions OpenID Connect instead of long-lived npm automation tokens. npm documents Trusted Publishing as a way to publish packages from supported CI providers without storing long-lived npm tokens.

The canonical main-repo package scope is `@hia-doc/*`, the repository license is MIT and public schema ids use `https://mandolin.github.io/HIA-Documentation/schemas/`. Operational npm scope ownership still has to be established before first publication. `@hia-doc/profiles`, `@hia-doc/schemas`, `@hia-doc/source-linkage` and `@hia-doc/plugin-sdk` remain private `0.0.0` workspace packages until release versions and Trusted Publishing are ready. Existing `@mandolin/*` JSDoc packages retain their current names.

Automation publish workflows must:

- Run only on trusted release triggers, not ordinary pull requests.
- Declare the minimum required GitHub token permissions.
- Use npm provenance or trusted publisher settings when available for the package.
- Keep package-specific publish ownership in the package repository.
- Preserve the same local release gate as the manual process.

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
