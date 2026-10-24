# 变更日志 / Changelog

本文件记录尚未发布和已发布的用户可见变化。包是否已进入 npm registry，以对应版本的发布记录与 registry 状态为准。

This file records unreleased and released user-visible changes. Registry availability is determined by the release record and npm
registry status for each version.

## 未发布 / Unreleased

- 文档化配置规范的标签列表、单标签/别名目标、规则及诊断现统一按父序祖先先应用、身份仅一次、后实际声明覆盖、本地最后覆盖；新增组合后才形成的别名环检查。早期草案中先命中的单标签查询现与继承列表一致，schema/包版本不变。
- Documentation profile queries now consistently apply ancestors in parent order once per identity, with later actual declarations winning and local declarations applied last. Effective alias validation catches cycles introduced only by composition. Earlier first-match single-tag lookup now agrees with inherited listing; schema/package identifiers are unchanged.

- 文档化配置规范新增继承环与别名环诊断；失效别名不再返回伪成功，深层继承改为显式栈遍历。官方分发API补充所有权/版本说明及回归，schema与包版本保持草案；多父冲突优先级仍待定案。
- Documentation profiles now report inheritance/alias cycles, refuse invalid alias resolutions and traverse deep inheritance with an explicit stack. Official distribution APIs document ownership/version boundaries with regression coverage. Schema/package identities remain unchanged; multi-parent collision precedence remains unresolved.

- 文档化配置规范运行时补齐既有字段/数组项和普通JSON检查；无效集合成员留诊断并跳过，不能占用有效身份。文件解析错误不再回显源码片段，调用者路径上下文仍保留。schema、官方配置和包版本不变；完整继承/别名语义尚未稳定。
- Documentation profile runtime checks now cover existing declared fields, list items and ordinary JSON. Invalid set members retain diagnostics and are skipped without reserving valid IDs. Parse errors no longer echo source excerpts; caller path context remains. Schema, official profile and package versions are unchanged; complete inheritance/alias semantics remain unstabilized. See [validation and ownership](docs/profile-input-validation.md).

## 2026-08-09 — Enterprise source usability

### 发布版本 / Released versions

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
- 五个版本已通过 GitHub Actions OIDC Trusted Publishing 发布，registry SHA-512 integrity、SLSA provenance v1 与
  registry-only consumer smoke 均已验证。

- Adds locale-aware source comment projection, stable comment identity, independent resolution/confidence/provenance, and the
  `sourcesContentPolicy: none` privacy boundary.
- Lets the unified HTML renderer and CLI consume DotNetDoc project-relative source-usability metadata while preserving tree,
  relation, source-topic, and lazy-fragment consistency.
- Keeps the schemas package aligned with all 13 public contracts without changing existing `0.1.0-draft` wire identities.
- Publishes all five versions through GitHub Actions OIDC Trusted Publishing, with registry SHA-512 integrity, SLSA provenance
  v1, and registry-only consumer smoke verified.

### 兼容性与限制 / Compatibility and limits

- 本批次为 additive patch，不删除公开 API；源码正文、原始注释和绝对路径不会进入 navigation index。
- source reader、目标项目配置与目标项目采用不包含在这些包版本中。
- 这些版本已进入 npm registry；公开包发布不等同于目标项目已经接入或采用。

- This batch is additive and removes no public API; source bodies, raw comments, and absolute paths do not enter the navigation
  index.
- Source readers, target-project configuration, and target adoption are outside these package versions.
- These versions are available from the npm registry; public package release does not imply target-project integration or adoption.
