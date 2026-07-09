# Continuous Integration

This project uses GitHub Actions as the baseline CI runner for the main repository and the official JSDoc satellite packages.

## Workflows

Each repository owns its own workflow and runs commands from its own repository root:

- `main-repo/.github/workflows/ci.yml`
- `jsdoc-plugin-hia-sys/.github/workflows/ci.yml`
- `jsdoc-theme-hia/.github/workflows/ci.yml`

The workflows run on pull requests, pushes to `main` and manual `workflow_dispatch` runs.

Current release-gate workflows declare read-only repository contents permission:

```yaml
permissions:
  contents: read
```

This is the baseline for ordinary validation jobs. Workflows that need broader permissions must document why the permission is required.

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

## Security Baseline

CI workflows must:

- Run commands from the repository that owns the workflow.
- Avoid publishing from ordinary pull request events.
- Avoid `pull_request_target` unless a dedicated reviewed workflow requires it.
- Keep GitHub token permissions to the minimum required by the job.
- Prefer npm Trusted Publishing before adding an automated npm publish job.

The current workflows are validation-only and do not consume npm or GitHub publication secrets.

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

Release governance and CI security policy live in `docs/release-governance.md` and `docs/security-policy.md`.
