# 变更日志 / Changelog

本文件记录尚未发布和已发布的用户可见变化。包是否已进入 npm registry，以对应版本的发布记录与 registry 状态为准。

This file records unreleased and released user-visible changes. Registry availability is determined by the release record and npm
registry status for each version.

## Unreleased — Enterprise source usability

### 候选版本 / Candidate versions

- `@hia-doc/core@0.1.1`
- `@hia-doc/config@0.1.5`
- `@hia-doc/renderer-html@0.1.4`
- `@hia-doc/schemas@0.1.4`
- `@hia-doc/cli@0.1.6`

### 变化 / Changes

- 增加 locale-aware source comment projection、稳定 comment identity、独立的 resolution/confidence/provenance 和
  `sourcesContentPolicy: none` 隐私边界。
- 统一 HTML renderer 与 CLI 可消费 DotNetDoc project-relative source usability metadata，并保持 tree、relation、source topic
  与 lazy fragment 输出的一致性。
- schemas 包同步分发 13 项公开 contract；既有 `0.1.0-draft` wire contract identity 保持不变。

- Adds locale-aware source comment projection, stable comment identity, independent resolution/confidence/provenance, and the
  `sourcesContentPolicy: none` privacy boundary.
- Lets the unified HTML renderer and CLI consume DotNetDoc project-relative source-usability metadata while preserving tree,
  relation, source-topic, and lazy-fragment consistency.
- Keeps the schemas package aligned with all 13 public contracts without changing existing `0.1.0-draft` wire identities.

### 兼容性与限制 / Compatibility and limits

- 本批次为 additive patch，不删除公开 API；源码正文、原始注释和绝对路径不会进入 navigation index。
- source reader、目标项目配置与目标项目采用不包含在这些包版本中。
- 这些版本当前只是本地候选，尚未发布。

- This batch is additive and removes no public API; source bodies, raw comments, and absolute paths do not enter the navigation
  index.
- Source readers, target-project configuration, and target adoption are outside these package versions.
- These versions are local candidates and are not published yet.
