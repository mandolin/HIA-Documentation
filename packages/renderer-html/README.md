# @hia-doc/renderer-html

HIA 文档的 HTML renderer，同时支持单一 document 与统一项目站。

The renderer consumes `@hia-doc/core` data and returns file payloads. It does not read from disk or own CLI behavior.

## Current Scope

- 单一 document 模式输出一个 `index.html`。
- 统一项目站默认输出 `split-site`：入口页、延迟导航分片、搜索索引、关系图和逐节点 HTML fragment。
- `projectSite.source.presentation` 统一约束 `none`、`link`、`embed`、`fetch` 四种源码呈现方式。
- `fetch` 默认在用户展开源码详情时加载；`projectSite.source.fetchTrigger: "manual"` 可恢复显式加载按钮，且 split-site / single-page 复用同一加载逻辑。
- Consumes field-level i18n text and emits runtime-switchable locale blocks.
- Marks fallback text with `data-hia-fallback-from`.
- Shows relative `definedIn` source links, primary source blocks and referenced source fragments.
- Emits default CSS/JS assets from `@hia-doc/theme-default`.
- 项目模式额外输出 `project-index.json`，作为 portal/search 可消费的稳定中立索引；源码正文不会进入该索引。
- Returns a renderer manifest with entrypoint, locale and file metadata for CLI or other writers.

## Contract

The renderer manifest schema version is exported as `HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION`. Project navigation index identity is exported as `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT` and `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION`.

Renderer output is separate from CLI filesystem output. See `docs/contract-index.md` for the current layering rule.
