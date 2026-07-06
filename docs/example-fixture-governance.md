# Example And Fixture Governance

This document defines the refresh and commit rules for HIA examples, fixtures and generated documentation outputs.

## Asset Classes

### Main Repository Fixtures

`main-repo/fixtures` stores committed test inputs for the core, parser, renderer, CLI and LSP bridge.

Rules:

- Commit source fixtures that are required by automated tests.
- Do not commit generated HTML output in `main-repo`.
- Refresh `fixtures/jsdoc-integration.real-basic.json` from a current JPHS example output when the JSDoc Integration producer contract changes.
- Keep compatibility-only legacy shapes isolated in compatibility fixtures.

Known compatibility allowances:

- `fixtures/jsdoc-integration.basic.json` may keep legacy `currentPage` input for adapter compatibility coverage.
- `fixtures/jsdoc-integration.compat.json` may keep sanitized `/private/workspace` and adapter-private `filePath` values to prove the adapter strips them before core/renderer output.

All release-facing fixtures and generated output must avoid local absolute paths, UNC paths, `/Users/`, `/private/`, `filePath`, legacy `currentPage` and `package:undefined`.

### Main Repository Examples

`main-repo/examples` is source-only until a specific example becomes a maintained sample project.

Rules:

- Commit example source, config and README files.
- Do not commit `examples/**/out`, `examples/**/dist` or `examples/**/docs/api`.
- Generate disposable output under `main-repo/dist`.

### JSDoc Satellite Package Examples

JPHS and JTH package examples live in each package repository under `examples/basic`.

Rules:

- Commit only example source, config, README and i18n resources listed in `package.json#files`.
- Do not commit `examples/basic/out`.
- Do not leave dry-run `.tgz` files in the package root.
- Run `npm run clean:examples` after real JSDoc example builds.
- Run `npm run governance:check` or `npm run release:gate` before release-facing commits.

### Webtest Projects

`test/prj/webtest1` and `test/prj/webtest2` are workspace-level validation projects outside the independent repositories.

Rules:

- `docs/api` is intentionally committed as a golden standalone output for manual and browser validation.
- Refresh `docs/api` only after package example tests and release gates pass.
- Do not use webtest output as package release content.
- Webtest generated output must not contain local absolute paths, UNC paths, `/Users/`, `/private/`, adapter-private `filePath`, legacy `currentPage` or `package:undefined`.

## Refresh Commands

Run package example gates from each package repository:

```bash
npm run release:gate
```

Refresh webtest output from each webtest project:

```bash
npm run docs:clean
npm run test:docs
```

Run the workspace governance check from the workspace root:

```bash
node dev/scripts/check-example-fixture-governance.mjs
```

Run the main repository governance check from `main-repo`:

```bash
pnpm run governance:check
```

## Generated Output Policy

Commit:

- `main-repo/fixtures/*.json` when used by automated tests.
- JPHS/JTH package example source/config/README/i18n resources.
- `test/prj/webtest*/docs/api` when intentionally refreshing the golden standalone output.

Do not commit:

- `main-repo/dist`.
- `main-repo/examples/**/out`.
- `main-repo/examples/**/dist`.
- `main-repo/examples/**/docs/api`.
- JPHS/JTH `examples/basic/out`.
- Any package dry-run `.tgz` file.

## Fixed Checks

The following checks are now part of the governed workflow:

- `main-repo`: `pnpm run governance:check`, included by `pnpm run release:gate`.
- JPHS/JTH: `npm run governance:check`, included by `npm run test:all` and `npm run release:gate`.
- Workspace webtests: `node dev/scripts/check-example-fixture-governance.mjs`.
- Webtest projects: `npm run test:docs` verifies generated output shape and unsafe marker absence.
