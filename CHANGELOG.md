# 变更日志 / Changelog

本文件记录尚未发布和已发布的用户可见变化。包是否已进入 npm registry，以对应版本的发布记录与 registry 状态为准。

This file records unreleased and released user-visible changes. Registry availability is determined by the release record and npm
registry status for each version.

## 未发布 / Unreleased

- 文档源码映射索引新增普通JSON预检、显式字段类型、集合身份唯一及有序正整数范围校验；拒绝访问器、环、稀疏/自定义行为数组，不调用toJSON或数组自有迭代器。无效输入沿用现有查询隔离；历史省略项、开放JSON扩展与生成器来源字符串保持，契约/包版本不变。
- Documentation-map indexing now checks ordinary JSON, declared field types, unique collection identities and ordered positive-integer ranges. It rejects accessors, cycles and sparse/custom-behavior arrays without invoking toJSON or own array iterators. Existing query isolation, legacy omissions, open JSON extensions and generator provenance strings remain; contract/package versions are unchanged. See [input validation](docs/doc-source-map-input-validation.md).

- 文档化配置规范增加独立的1.0.0源码定义候选，精确兼容旧0.1.0-draft reader；历史canonical原字节保持。新schema表达既有aliasFor/default消息约束，新增精确版本类型和完整字段双语文档。七份官方领域配置、包版本及系统正式发行独立管理。
- Documentation profiles now expose an independent 1.0.0 source definition candidate with exact legacy 0.1.0-draft reader support and unchanged historical canonical bytes. The new schema expresses existing alias-target/default-message constraints; exact version typing and bilingual field documentation are added. Official domain profiles, package versions and system releases remain independent.

- 文档化配置规范的标签列表、单标签/别名目标、规则及诊断现统一按父序祖先先应用、身份仅一次、后实际声明覆盖、本地最后覆盖；新增组合后才形成的别名环检查。早期草案中先命中的单标签查询现与继承列表一致，schema/包版本不变。
- Documentation profile queries now consistently apply ancestors in parent order once per identity, with later actual declarations winning and local declarations applied last. Effective alias validation catches cycles introduced only by composition. Earlier first-match single-tag lookup now agrees with inherited listing; schema/package identifiers are unchanged.

- 文档化配置规范新增继承环与别名环诊断；失效别名不再返回伪成功，深层继承改为显式栈遍历。官方分发API补充所有权/版本说明及回归，该次草案修复保留原schema/包身份；后续继承规则与当前候选见上方。
- Documentation profiles now report inheritance/alias cycles, refuse invalid alias resolutions and traverse deep inheritance with an explicit stack. Official distribution APIs document ownership/version boundaries with regression coverage. That draft repair retained schema/package identities; see the subsequent composition rule and current candidate above.

- 文档化配置规范运行时补齐既有字段/数组项和普通JSON检查；无效集合成员留诊断并跳过，不能占用有效身份。文件解析错误不再回显源码片段，调用者路径上下文仍保留。该次输入修复保持原schema、官方配置和包身份；后续继承和候选变更见上方。
- Documentation profile runtime checks now cover existing declared fields, list items and ordinary JSON. Invalid set members retain diagnostics and are skipped without reserving valid IDs. Parse errors no longer echo source excerpts; caller path context remains. That input repair retained schema, official profile and package identities; see subsequent composition and candidate changes above. See [validation and ownership](docs/profile-input-validation.md).

## 2026-10-25 — Documentation rendering repair

### 发布版本 / Released versions

Released packages: core `0.1.2`, config `0.1.6`, source-linkage `0.1.1`, theme-default `0.1.3`, renderer-html `0.1.5`, CLI `0.1.7`.
All six versions are published on npm and tagged latest. A fresh CLI/DotNetDoc registry consumer passes on Node.js 22 and 24.
中文：六包完整依赖链已发布并经全新安装验收，详见[发行状态](docs/public-package-release-plan.md)。
The core runtime and source-linkage public types are included so a clean registry consumer can load the renderer and compile its declarations.
Existing source definition candidates retain their documented compatibility boundaries; package patches do not declare the system 1.0.0 release.
中文：六包构成完整依赖闭包，保留既有精确兼容reader。以下条目/品牌/共享资产修复随本批发行，以registry收据为准。

- 新增安全品牌颜色资源API与`hia docs theme-assets --out`显式唯一写入命令；独立单文档/项目构建可用同站external资源路由共享一份CSS/JS，按HTML深度引用。theme.name支持已实现skin别名，显式skin优先。普通本地资源构建同样消费颜色覆盖。
- Adds validated brand-color assets and an explicit sole-writer command. Same-site external routing deduplicates CSS/JS across independent document/project builds with depth-correct references. Implemented theme names alias skins; explicit skin wins. Local document/project builds also consume color overrides.
- 项目多页、无脚本成员页和显式信息架构条目保留全部非空本地化字段（含未知扩展），与单文档共用主字段及附加字段逻辑；只有summary时只呈现一次。签名在窄屏自动换行。公共`RenderHtmlOptions.theme`支持颜色与皮肤/配色，逐字段兼容旧项目选项。
- Project, no-script and explicit-IA entry pages preserve all nonempty localized fields, including unknown extensions, sharing primary/additional-field logic with documents. Summary-only primary content appears once. Signatures wrap on narrow screens. Public `RenderHtmlOptions.theme` provides colors and per-field skin/scheme compatibility.

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
