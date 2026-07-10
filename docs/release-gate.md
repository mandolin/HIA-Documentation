# Release Gate

This document defines the local release gate for the HIA main repository and the official JSDoc satellite packages.

For release classification, checklist ownership, satellite package status and npm publish policy, see `docs/release-governance.md`.

## Gate Ownership

| Surface | Gate | Notes |
| --- | --- | --- |
| `main-repo` core/tooling/docs contracts | `pnpm run release:gate` | Run from `main-repo`. |
| Official JSDoc plugin/theme packages | `npm run release:gate` | Run from each package repository. |
| Incubating `hia-*doc` satellites | `npm run release:gate` | Required before public release baseline. |
| Public npm publish | Matching gate plus publish preflight | Manual today; Trusted Publishing is the preferred automation target. |

## Main Repository

Run the full main-repo gate before merging release-facing changes:

```bash
pnpm run release:gate
```

The gate runs:

- TypeScript build.
- Unit tests.
- Cross-package e2e tests.
- Schema contract checks for core document, project manifest, documentation profile, doc-source-map and distributed schema snapshots.
- Distribution readiness checks that verify the approved `@hia-doc` scope, MIT package licenses and GitHub Pages schema namespace while keeping candidates private until release versions and Trusted Publishing are ready.
- Local schema Pages artifact generation with canonical versioned files and package-style aliases.
- Real JPHS Integration fixture through `hia docs build --jsdoc-integration`.
- Output safety checks for local absolute paths, `filePath`, legacy `currentPage` and synthetic `package:undefined`.
- Example and fixture governance checks.
- Direct dependency and license audit.

Targeted distribution checks are also available:

```bash
pnpm run schema:check
pnpm run distribution:check
pnpm --filter @hia-doc/schemas sync:check
pnpm run schema:site
```

## JSDoc Satellite Packages

Run each package gate from its own repository:

```bash
cd ../HIA/jsdoc-plugin-hia-sys
npm run release:gate

cd ../jsdoc-theme-hia
npm run release:gate
```

The package gate runs package syntax checks, fixture tests, real JSDoc example builds, generated example cleanup, release metadata checks and `npm pack --dry-run --json`.

Package gates also run example governance checks to ensure `examples/basic/out` and dry-run tarballs are absent and package examples do not contain unsafe local path markers.

## Publish Preflight

Before publishing a public scoped package manually, use the official npm registry explicitly:

```bash
npm whoami --registry=https://registry.npmjs.org/
npm view "@mandolin/<package>@<version>" version --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

An `E404 Not Found` result from `npm view` is expected for a version that has not been published yet.

Before adding automated npm publication, prefer npm Trusted Publishing through GitHub Actions OpenID Connect instead of storing long-lived npm tokens. Automated publish workflows must not run on ordinary pull requests and must keep minimal workflow permissions.

The main-repo distribution packages remain private until `docs/schema-distribution.md` and `docs/profile-distribution.md` publication blockers are closed. A successful workspace pack dry-run or Pages deployment is necessary but does not by itself authorize npm publication.

## Post-Publish Smoke

After publishing, test from a clean project by installing from the official npm registry and running a minimal JSDoc build with both `@mandolin/jsdoc-plugin-hia-sys` and `@mandolin/jsdoc-theme-hia`.

From `main-repo`, this can be run with:

```bash
pnpm run smoke:published-jsdoc
```

The smoke output should include:

- `index.html`
- `hia-metadata.json`
- `hia-integration.json`

The integration JSON should use `contract: "hia-jsdoc-integration"`, `contractVersion: "0.1.0"` and `artifactKind: "hia-integration"`, and must not contain `filePath` or legacy `currentPage` values.

## CI Mapping

GitHub Actions runs the same release gates on pull requests, pushes to `main` and manual workflow dispatches. See `docs/ci.md` for workflow triggers and troubleshooting notes.

CI is a gate mirror, not a replacement for local release review. Contract-facing changes still need compatibility matrix and public docs review.

## Example And Fixture Governance

See `docs/example-fixture-governance.md` for fixture refresh rules, webtest output policy and generated output commit boundaries.

## Dependency And License Audit

Run the direct dependency and license audit from `main-repo`:

```bash
pnpm run license:audit
```

See `docs/dependency-license-audit.md` and `docs/dependency-review-template.md` for the allowed license policy and required review steps for new external dependencies.

See `docs/security-policy.md` for secret handling, source-content policy and CI security requirements.
