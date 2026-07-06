# Continuous Integration

This project uses GitHub Actions as the baseline CI runner for the main repository and the official JSDoc satellite packages.

## Workflows

Each repository owns its own workflow and runs commands from its own repository root:

- `main-repo/.github/workflows/ci.yml`
- `jsdoc-plugin-hia-sys/.github/workflows/ci.yml`
- `jsdoc-theme-hia/.github/workflows/ci.yml`

The workflows run on pull requests, pushes to `main` and manual `workflow_dispatch` runs.

## Main Repository

The main repository CI uses Node.js 20.x, enables pnpm through Corepack and installs dependencies with the committed lockfile:

```bash
pnpm install --frozen-lockfile
pnpm run release:gate
```

This covers TypeScript build, unit tests, e2e tests and the real JSDoc Integration smoke check.

## JSDoc Satellite Packages

The JSDoc package CI runs on Node.js 18.x and 20.x because the package engines support Node.js 18 and newer:

```bash
npm install --no-audit --fund=false
npm run release:gate
```

This covers package syntax checks, fixture tests, real JSDoc example builds, generated output cleanup, release metadata checks and pack dry-runs.

## Troubleshooting

If CI fails, rerun the matching local gate from the repository root before changing the workflow:

```bash
pnpm run release:gate
npm run release:gate
```

Common failure areas:

- Dependency installation: check Node.js and the package manager command used by that repository.
- TypeScript or test failures: fix the underlying build or test failure first.
- JSDoc Integration smoke: inspect generated output under `dist/release-gate-jsdoc-real`.
- Package dry-run: check `files`, release metadata, generated example output and tarball contents.

CI must not run commands from the outer workspace container or assume a cross-repository workspace.
