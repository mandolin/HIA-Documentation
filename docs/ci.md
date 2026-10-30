# Continuous Integration

This project uses GitHub Actions as the baseline CI runner for the main repository and the official JSDoc satellite packages.

## Workflows

Each repository owns its own workflow and runs commands from its own repository root:

- `main-repo/.github/workflows/ci.yml`
- `jsdoc-plugin-hia-sys/.github/workflows/ci.yml`
- `jsdoc-theme-hia/.github/workflows/ci.yml`

The workflows run on pull requests, pushes to `main` and manual `workflow_dispatch` runs.

`main-repo/.github/workflows/schema-pages.yml` is the single public reference publication workflow rather than an ordinary validation workflow. It runs on pushes to `main` and manual dispatch, executes the release gate, builds the public reference from the explicit satellite allowlist, assembles one Pages artifact with the portal and `/schemas/`, then verifies the deployed portal routes, provenance and canonical schema ids after deployment.

Current release-gate workflows declare read-only repository contents permission:

```yaml
permissions:
  contents: read
```

This is the baseline for ordinary validation jobs. Workflows that need broader permissions must document why the permission is required.

## Main Repository

The main repository CI uses Node.js 22/24 on Ubuntu 24.04 and Windows Server 2025, enables pnpm 10.34.4 through Corepack and installs dependencies with the committed lockfile:

```bash
pnpm install --frozen-lockfile
pnpm run release:gate
```

This covers TypeScript build, unit tests, e2e tests, schema/profile distribution consistency, npm-readiness state and the real JSDoc Integration smoke check.

## JSDoc Satellite Packages

Current JSDoc source candidates require Node.js `^22.23.4 || ^24.22.1`. Their CI verifies both supported lines on Linux and Windows. Historical npm archives retain their original engine declarations. When the owner repository declares pinned development archives, prepare them from its exact `owner-sources.json` checkouts before frozen installation:

```bash
npm run prepare:owners
npm ci --ignore-scripts --no-audit --no-fund
npm run release:gate
```

This covers package syntax checks, fixture tests, real JSDoc example builds, generated output cleanup, release metadata checks and pack dry-runs.

The public reference and Pages workflows pin the JSDoc umbrella and its plugin/theme owners, run the umbrella's existing archive-integrity preparation, and install only the seven source projects declared in the reference definition. The two archive-owner checkouts are build dependencies; they do not become additional reference producers. See [public reference build](public-reference-build.md).

## Security Baseline

CI workflows must:

- Run commands from the repository that owns the workflow.
- Avoid publishing from ordinary pull request events.
- Avoid `pull_request_target` unless a dedicated reviewed workflow requires it.
- Keep GitHub token permissions to the minimum required by the job.
- Prefer npm Trusted Publishing before adding an automated npm publish job.
- Keep Pages publication on the `github-pages` environment, isolate source-read credentials to the build job, and verify deployed portal routes plus schema ids before reporting success.

Ordinary validation workflows do not publish npm packages. Reference builds use the scoped read-only GitHub App checkout credential described above; Pages uses its existing deployment permission. These roles do not grant npm publication permission.

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
- Reference Pages deployment: inspect `dist/reference-pages`, then verify the `github-pages` environment URL and `reference-build.json` provenance.
- Package dry-run: check `files`, release metadata, generated example output and tarball contents.

CI must not run commands from the outer workspace container or assume a cross-repository workspace.

Release governance and CI security policy live in `docs/release-governance.md` and `docs/security-policy.md`.
