# @hia-doc/config

HIA 文档工具共享的配置 contract 与 loader。

当前范围 / Current scope:

- Auto-discover `hia.config.json` from the current working directory.
- Load an explicit config through `--config <file>` callers.
- Validate the first JSON config contract.
- Provide diagnostics in the same shape used by `@hia-doc/core`, including machine-readable `data` where useful.

配置包表达项目与构建设置，不向核心 document IR 添加字段。统一项目站可通过 `docs.renderer.projectLayout` 选择分片/单页输出，并通过 `docs.source.presentation` 选择 `none`、`link`、`embed` 或 `fetch`。`fetch` 默认在源码详情展开时加载；需要额外确认动作时，可设置 `docs.source.fetchTrigger: "manual"`。

Portal IA 第一轮可在 `docs.renderer.informationArchitecture` 独立配置 `contentGrouping=entry|semantic-container`、`loadingStrategy=lazy|eager` 与 `memberPlacement=separate|with-parent`，并用 `docs.renderer.uiLocale=zh-CN|en` 选择本轮触碰的 UI labels。未知 draft/enum/field fail closed；显式 IA 与 `single-page` 的组合返回 `HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED`。未配置 IA 时保持既有 P3 行为。

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
