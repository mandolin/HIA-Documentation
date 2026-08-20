# @hia-doc/config

HIA 文档工具共享的配置 contract 与 loader。

当前范围 / Current scope:

- Auto-discover `hia.config.json` from the current working directory.
- Load an explicit config through `--config <file>` callers.
- Validate the first JSON config contract.
- Provide diagnostics in the same shape used by `@hia-doc/core`, including machine-readable `data` where useful.

配置包表达项目与构建设置，不向核心 document IR 添加字段。统一项目站默认使用 `split-site` 与 `fetch`；可通过
`docs.renderer.projectLayout` 显式选择兼容用 `single-page`，并通过 `docs.source.presentation` 选择 `none`、`link`、
`embed` 或 `fetch`。`fetch` 默认在源码详情展开时加载；需要额外确认动作时，可设置
`docs.source.fetchTrigger: "manual"`。

`fetch` 与 `link` 只指向构建生成的同源内容寻址资源。producer 已提供的 preview 可直接进入构建；CLI 从 `localRoot`
读取源码还必须显式设置 `docs.source.publicAssetPolicy: "explicit-public"`。旧 `fetchBaseUrl`、`linkBaseUrl` 和 `baseUrl`
不能作为 Portal endpoint，配置校验会给出迁移 diagnostic。

Portal 内置 `portal.classic`、`portal.graphite`、`portal.lumen` 三个 skin；`docs.theme.scheme` 可独立选择
`system`、`light` 或 `dark`。skin/scheme 只决定构建期无脚本默认，不改变 topic、page、navigation 或 relation identity。

Portal IA 第一轮可在 `docs.renderer.informationArchitecture` 独立配置 `contentGrouping=entry|semantic-container`、`loadingStrategy=lazy|eager` 与 `memberPlacement=separate|with-parent`，并用 `docs.renderer.uiLocale=zh-CN|en` 选择本轮触碰的 UI labels。未知 draft/enum/field fail closed；显式 IA 与 `single-page` 的组合返回 `HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED`。未配置 IA 时保持既有 P3 行为。

Portal source-comment P1 可通过 `docs.renderer.sourceCommentProjection` 显式设置 canonical BCP 47 `locale` 与
`contentPolicy=none|explicit-projected-text`。该 locale 与 UI/content locale 独立，且配置必须同时启用显式 IA；未知字段、
版本或非 canonical locale fail closed。config 只授予 renderer 消费已存在 projection 的权限，不授予源码读取或注释解析权限。

The first contract is intentionally small. `hia.config.ts`, layered config merging and dynamic config evaluation are deferred.

## Contract

The current JSON config schema version is exported as `HIA_CONFIG_SCHEMA_VERSION`.

Project docs manifests use a separate draft contract exported by this package:

- `HIA_PROJECT_MANIFEST_SCHEMA_VERSION`
- `HIA_PROJECT_MANIFEST_SCHEMA_ID`
- `HIA_PROJECT_MANIFEST_JSON_SCHEMA`
- `validateHiaProjectManifest()`

See `docs/configuration.md` and `docs/contract-index.md` in the repository root for the current config boundary.

For unified project pages, the project manifest can declare `project.defaultLocale` and `project.locales`. The renderer preserves these values in the output manifest and exposes a language switcher when more than one locale is available.

Manifest inputs may declare an owner-reviewed `semanticPath` of closed `kind/id/label` segments. The CLI projects it unchanged; neither config nor renderer infers repository/package/layer identity from filesystem paths. `project.productVersion` is optional metadata only and does not enable version routing.

`documentation-producer-result` inputs may set `artifactPolicy: "relations-only"` when the result is an auxiliary source-relation probe. This keeps relation artifacts available to the aggregator without materializing the result's HIA documents as duplicate API cards. / 当 producer result 只用于补充源码关系时，可使用 `artifactPolicy: "relations-only"`，避免辅助 HIA document 重复生成 API 卡片。
