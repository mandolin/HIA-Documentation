# Reference Operations

This document defines the first operational baseline for the public HIA reference site.

The current public reference is served from:

```text
https://mandolin.github.io/HIA-Documentation/
```

## Checks

Run the operational check with:

```bash
pnpm run reference:ops:check
```

The check verifies:

- `reference-pages.json` and `reference-build.json` contracts.
- publication age warning and failure thresholds.
- route availability for the root, `en`, `zh-CN`, and source-linkage pages.
- versioned route availability when the published manifest exposes `current-and-releases`.
- schema catalog, canonical schema URLs, and package-style schema aliases.
- privacy invariants, including `sourcesContentPolicy: "none"` and WorkZone exclusion.
- source provenance shape and the current GitHub ref for each allowlisted source repository.

By default, source ref drift is reported as a warning because satellite repositories can advance before the next public reference deployment. To make stale sources fail the run, use:

```bash
pnpm run reference:ops:check -- --require-fresh-sources
```

To check another deployment:

```bash
HIA_REFERENCE_PAGES_URL=https://example.test/HIA-Documentation/ pnpm run reference:ops:check
```

## Thresholds

The default thresholds are:

| Setting | Default | Meaning |
| --- | --- | --- |
| `HIA_REFERENCE_WARN_AGE_HOURS` | `48` | Report a warning when the published reference is older than this value. |
| `HIA_REFERENCE_MAX_AGE_HOURS` | `168` | Fail when the published reference is older than this value. |

These thresholds are intentionally operational, not semantic. A stale public reference is not necessarily a broken build, but it should be visible.

## Failure Levels

| Level | Meaning |
| --- | --- |
| `pass` | The invariant is satisfied. |
| `warn` | The site is usable, but operations should review the condition. |
| `fail` | The public reference is broken or outside an agreed safety boundary. |

Hard failures include contract drift, privacy drift, missing routes, schema namespace drift, invalid source provenance, and an expired publication age.

## GitHub Actions

The `Reference operations` workflow runs daily and can be triggered manually. Manual runs can enable strict source freshness.

This workflow is read-only. It does not deploy, mutate package state, or require the GitHub App private key used by the public reference build workflow.

## Rollback

If the deployed reference fails after a Pages deployment:

1. Inspect the failed workflow run and confirm whether the failure is route, schema, privacy, provenance, or age related.
2. Re-run the last known good `HIA Reference Pages` workflow from the matching commit if the failure is a deployment artifact issue.
3. Revert the offending source or build change and re-run `HIA Reference Pages` if the failure is produced by source, schema, renderer, or reference-build drift.
4. Run `pnpm run reference:ops:check` after the replacement deployment is visible.

Do not repair a public reference by manually editing the `gh-pages` artifact. The reference must remain reproducible from source workflows.

## Provenance

The public reference build records each allowlisted source repository, ref, and resolved commit in `reference-build.json`.

Source freshness warnings mean the deployed reference was built from an older commit than the current configured ref. The correct remedy is normally a new public reference build, not a manual patch.

## Versioned Layout

When `reference-pages.json` exposes `versioning.strategy: "current-and-releases"`, the operations check also validates `current/`, `versions/`, and the first configured `releases/<id>/` snapshot routes.

Older deployments without the versioning field remain valid for operations checks during rollout; local `reference:pages:check` requires the versioned layout after W-P15.2.
