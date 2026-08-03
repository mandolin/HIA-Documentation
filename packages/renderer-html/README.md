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
- DotNetDoc relation 可投影为 entry 的 `sourceUsability`：稳定 project-relative identity、resolution、confidence、provenance 与 `sourcesContentPolicy: none` 会进入 source topic 和 `project-index.json`；renderer 不据此读取、嵌入或远程抓取源码。
- 显式 `projectSite.informationArchitecture` 可启用 `documentation-portal-information-architecture@0.1.0-draft`：`entry|semantic-container`、`lazy|eager`、`separate|with-parent` 三维独立；`contentPath` 保持 canonical，additive `presentationPath/memberAnchor` 驱动实际加载与定位。
- 显式 IA 使用 manifest-only `semanticPath`、固定 kind-aware topic section 顺序、原生 nested disclosure 与 `zh-CN|en` touched-label catalog；不输出 `role=tree`，不读取 target state 或 continuity body。
- 项目输入可选接受 `generatedDocumentationBindingProjection`（来自 `@hia-doc/source-linkage`）：HTML 与 `project-index.json` 只读呈现 binding → expansion → target、stable instance key、resolution/confidence/provenance 与诊断计数；不加载 sidecar path、不嵌入 source body/locals，也不把完整模型放回 ordinary doc-source-map。
- 显式 Portal IA 下，项目输入可选接受 `ownerAdoption`（由 `target-owner-adoption-kit@0.1.0-draft` 的 `portalSummary` 提供）：只呈现 owner-review readiness、family、contract counts、可选 handoff counts 与 resolution/confidence/provenance；不接收 target/trial/owner identity、路径、正文或 adoption claim。缺少显式 IA、unknown field、count/status 不一致时 fail closed。
- Returns a renderer manifest with entrypoint, locale and file metadata for CLI or other writers.

## Contract

The renderer manifest schema version is exported as `HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION`. Project navigation index identity is exported as `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT` and `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION`. Portal IA identity, exact draft version, vocabulary, types, resolver, touched-label catalog, and owner-local Draft 2020-12 schema are exported through `DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_*`. `RenderProjectOwnerAdoptionSummary` is a structural consumer view of the CLI-owned adoption-kit projection; the renderer does not own or reinterpret the full kit contract.

Renderer output is separate from CLI filesystem output. See `docs/contract-index.md` for the current layering rule.
