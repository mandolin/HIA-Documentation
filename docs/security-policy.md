# Security Policy

This document defines the security and dependency baseline for the HIA main repository and official satellite packages.

## Supported Surfaces

The system is in the 1.0.0 preview stage. Security fixes target the current `main` branch and the latest public npm versions of official packages. Verify the exact package and version in the npm registry and the owning repository. Official packages can use either the `@hia-doc/*` or `@mandolin/*` namespace. The [public package release plan](../release/public-packages.json) contains both candidates and published targets. Treat preview, candidate, and registry identities separately.

中文说明。系统处于 1.0.0 预览阶段。支持范围以当前主分支和正式组件在 npm 实际公开的最新版本为准。请使用完整包名、实际版本和维护仓库核验，两个包命名空间及源码候选均按实际发行事实判断。

## Reporting

Until a public `SECURITY.md` and maintainer contact workflow is finalized for every repository, report sensitive issues through the private maintainer channel instead of public issues.

Public bug reports are fine for non-sensitive correctness issues. Do not include private source code, credentials, registry tokens, internal paths or unreleased package tarballs in public reports.

## Dependency Policy

External dependencies must pass the direct dependency and license audit before landing:

```bash
pnpm run license:audit
```

Allowed license families are documented in `docs/dependency-license-audit.md`. Restricted license families require explicit maintainer approval before use.

Before adding a dependency:

1. Fill out `docs/dependency-review-template.md`.
2. Record purpose, license, runtime impact, security considerations and alternatives.
3. Update `docs/dependency-license-audit.md`.
4. Update `scripts/check-dependency-license-audit.mjs`.
5. Run `pnpm run license:audit` and the matching release gate.

## Secret Handling

Never commit:

- npm tokens, GitHub tokens or package registry credentials.
- `.npmrc` files with credentials.
- Local absolute workspace paths in committed generated artifacts.
- Private source content embedded in fixtures or generated docs unless the fixture is explicitly public and reviewed.

CI workflows must not expose secrets to untrusted pull requests. Publish workflows must not run on ordinary pull request events.

## Source Content Policy

Documentation source maps and extraction artifacts may support embedded `sourcesContent`, but the default policy is `none`.

Embedding source content must be an explicit opt-in and must pass release review. Public fixtures should use minimal, intentionally public source snippets.

## CI Security Baseline

GitHub Actions workflows should:

- Use the least required `permissions` block.
- Avoid `pull_request_target` unless a specific reviewed workflow needs it.
- Keep package install and release commands scoped to the repository that owns the workflow.
- Avoid automatic publication from untrusted triggers.
- Prefer npm Trusted Publishing before adding automated npm publication.

Current CI workflows already declare read-only repository contents permission for release-gate jobs. See `docs/ci.md` and `docs/release-governance.md`.

References:

- GitHub Actions security hardening: <https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions>
- GitHub Actions workflow permissions: <https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#permissions>
- npm Trusted Publishing: <https://docs.npmjs.com/trusted-publishers/>

