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
- privacy invariants, including `sourcesContentPolicy: "none"` and private workspace exclusion.
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

### Transient HTTP failures

Public site GET requests have at most three attempts with a 15-second timeout per attempt, including body consumption. Only network/timeout failures and HTTP 408, 429, 500, 502, 503 or 504 retry. Default backoff is one then two seconds; a valid `Retry-After` delay or HTTP date is capped at five seconds. Persistent failures still fail the workflow. Retry diagnostics omit URL queries and raw transport error text.

JSON parsing, page markers, schema identities, privacy checks, source freshness and age thresholds are evaluated with their existing rules. Invalid content and permanent HTTP failures such as 404 are not retried. The GitHub source-ref lookup retains its separate freshness policy.

中文摘要：只对公开站点只读请求的瞬态传输故障有限重试，不重启整套检查；每资源最多三次、每次15秒、退避最多5秒。持续故障仍失败，正文/契约/隐私错误、404及48/168小时门槛保持原判据。

## GitHub Actions

The `HIA Reference Pages` workflow rebuilds, validates, deploys and checks the public site daily at 03:23 UTC. It also runs on pushes to `main` and manual dispatch. The separate `Public reference build` workflow retains push/manual artifact validation; creating its archive alone does not refresh the live site.

The read-only `Reference operations` workflow runs after a successful `HIA Reference Pages` completion on `main`, using the deployment's source commit for its checker. It also runs independently every day at 04:41 UTC and can be triggered manually. Manual runs can enable strict source freshness. Failed or cancelled deployments do not count as successful post-deployment checks.

Schedules are best-effort GitHub events and can be delayed. The completion event provides the ordering; the independent daily monitor still detects expired or broken deployments if refresh stops. Public repositories must also keep scheduled workflows enabled. A missed refresh is repaired by rebuilding and deploying through `HIA Reference Pages`, with the 48/168-hour thresholds retained.

中文摘要：每日刷新必须走完整的构建、验证、部署和线上复核。仅生成归档不会更新线上发布时间。运维检查在成功部署后按对应提交运行，并保留独立每日/手动入口；48小时告警和168小时失败阈值不变。GitHub定时事件可能延迟或停用，不能用两条cron的理论时刻代替实际部署完成事件。

This workflow is read-only. It does not deploy, mutate package state, or require the GitHub App private key used by the public reference build workflow.

### Pages deployment timeouts

The deployment action waits for the Pages API to return `succeed`. Intermediate states such as `syncing_files` and `finished_file_sync` require further polling. A completed file sync alone does not satisfy deployment acceptance. Keep the published-site verification step and the successful-deployment condition on the operations workflow.

`actions/deploy-pages@v4` caps its timeout at 600,000 milliseconds. A larger `timeout` input is clamped to that maximum, so increasing the job timeout cannot extend Pages deployment polling. GitHub also documents a ten-minute Pages deployment limit. [Deployment implementation](https://github.com/actions/deploy-pages/blob/v4/src/internal/deployment.js), [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

For a timeout, retain the run ID, source revision, artifact ID and digest, last deployment status, and cancellation result. Inspect the actual archive size, file count and entry types, and compare the artifact with the last successful build. Check Pages configuration and the public service status before selecting a recovery action. A clear status page does not establish the cause of an individual failed deployment. [Artifact requirements](https://github.com/actions/upload-pages-artifact#artifact-validation), [GitHub Status](https://www.githubstatus.com/)

After artifact and configuration checks, use the manual `HIA Reference Pages` entry to rebuild and validate a fresh artifact when recovering a stalled deployment. Record that new run separately from the failed deployment-only retry. Require the deployment, published-site check and subsequent `Reference operations` run to succeed. Repeated failures require a new diagnosis with the retained evidence.

中文摘要。`finished_file_sync`仍须等待API明确返回`succeed`。v4部署Action把等待上限固定为十分钟，填写二十分钟或仅增加作业时限均无法延长部署轮询。超时后保留运行、源码、工件、状态和取消证据，检查实际归档及前次成功版本，再选恢复动作。重新构建新工件的运行单独留证，部署、线上检查和后置运维都成功后才能确认恢复。

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
