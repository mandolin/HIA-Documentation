# Release Gate

This document defines the local release gate for the HIA main repository and the official JSDoc satellite packages.

## Main Repository

Run the full main-repo gate before merging release-facing changes:

```bash
pnpm run release:gate
```

The gate runs:

- TypeScript build.
- Unit tests.
- Cross-package e2e tests.
- Real JPHS Integration fixture through `hia docs build --jsdoc-integration`.
- Output safety checks for local absolute paths, `filePath`, legacy `currentPage` and synthetic `package:undefined`.
- Example and fixture governance checks.

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

Before publishing a public scoped package, use the official npm registry explicitly:

```bash
npm whoami --registry=https://registry.npmjs.org/
npm view "@mandolin/<package>@<version>" version --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

An `E404 Not Found` result from `npm view` is expected for a version that has not been published yet.

## Post-Publish Smoke

After publishing, test from a clean project by installing from the official npm registry and running a minimal JSDoc build with both `@mandolin/jsdoc-plugin-hia-sys` and `@mandolin/jsdoc-theme-hia`.

The smoke output should include:

- `index.html`
- `hia-metadata.json`
- `hia-integration.json`

The integration JSON should use `contract: "hia-jsdoc-integration"`, `contractVersion: "0.1.0"` and `artifactKind: "hia-integration"`, and must not contain `filePath` or legacy `currentPage` values.

## CI Mapping

GitHub Actions runs the same release gates on pull requests, pushes to `main` and manual workflow dispatches. See `docs/ci.md` for workflow triggers and troubleshooting notes.

## Example And Fixture Governance

See `docs/example-fixture-governance.md` for fixture refresh rules, webtest output policy and generated output commit boundaries.
