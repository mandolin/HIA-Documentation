# @hia-doc/renderer-html

HIA 文档的 HTML renderer，同时支持单一 document 与统一项目站。

The renderer consumes `@hia-doc/core` data and returns file payloads. It does not read from disk or own CLI behavior.

## Current Scope

- 单一 document 模式输出一个 `index.html`。
- 统一项目站默认输出 `split-site`：入口页、延迟导航分片、搜索索引、关系图、逐节点 HTML fragment，以及 `pages/` 下不依赖 JavaScript 的索引和逐 topic 页面。
- `projectSite.source.presentation` 统一约束 `none`、`link`、`embed`、`fetch` 四种源码呈现方式；默认值为 `fetch`。
- `fetch` 默认在用户展开源码详情时加载；`projectSite.source.fetchTrigger: "manual"` 可启用显式加载按钮，且 split-site / single-page 复用同一受限 reader。
- `fetch`/`link` 只生成 `sources/{sha256}.txt` 同源资源和局部 `.gitattributes`；资源具有 content revision、SHA-384、byte/line facts，旧 external URL 被剥离且不会成为 fallback。
- 项目站输出 exact-valid `documentation-presentation-profile.json`，并由 manifest/project index 以最小引用关联；profile 不含 owner DOM/CSS/route 私有结构或源码正文。
- Consumes field-level i18n text and emits runtime-switchable locale blocks.
- Marks fallback text with `data-hia-fallback-from`.
- Shows relative `definedIn` source links, primary source blocks and referenced source fragments.
- Emits default CSS/JS assets from `@hia-doc/theme-default`.
- HTML root、renderer manifest 与 `project-index.json` 投射 metadata-only `documentation-portal-theme@0.1.0-draft` reference；HTML root 另携带构建期 skin/scheme 默认。renderer 不保存用户 preference，也不把 presentation state 写入 semantic IR。
- 页面提供 Portal-owned skin/scheme 选择器；topic section、nested member card 与 source card 均使用 native `<details>/<summary>`。
- 项目模式额外输出 `project-index.json`，作为 portal/search 可消费的稳定中立索引；源码正文不会进入该索引。
- DotNetDoc relation 可投影为 entry 的 `sourceUsability`：稳定 project-relative identity、resolution、confidence、provenance 与 `sourcesContentPolicy: none` 会进入 source topic 和 `project-index.json`；renderer 不据此读取、嵌入或远程抓取源码。
- 显式 `projectSite.informationArchitecture` 可启用 `documentation-portal-information-architecture@0.1.0-draft`：`entry|semantic-container`、`lazy|eager`、`separate|with-parent` 三维独立；`contentPath` 保持 canonical，additive `presentationPath/memberAnchor` 驱动实际加载与定位。
- 显式 IA 使用 manifest-only `semanticPath`、固定 kind-aware topic section 顺序、原生 nested disclosure 与 `zh-CN|en` touched-label catalog；不输出 `role=tree`，不读取 target state 或 continuity body。
- 项目输入可选接受 `generatedDocumentationBindingProjection`（来自 `@hia-doc/source-linkage`）：HTML 与 `project-index.json` 只读呈现 binding → expansion → target、stable instance key、resolution/confidence/provenance 与诊断计数；不加载 sidecar path、不嵌入 source body/locals，也不把完整模型放回 ordinary doc-source-map。
- 显式 Portal IA 下，项目输入可选接受 `ownerAdoption`（由 `target-owner-adoption-kit@0.1.0-draft` 的 `portalSummary` 提供）：只呈现 owner-review readiness、family、contract counts、可选 handoff counts 与 resolution/confidence/provenance；不接收 target/trial/owner identity、路径、正文或 adoption claim。缺少显式 IA、unknown field、count/status 不一致时 fail closed。
- 显式 IA 下可消费 `documentation-source-comment-projection@0.1.0-draft`。metadata 始终采用 allowlist；只有 producer projection 与 `projectSite.sourceCommentProjection` 对同一 locale 双重授权时才显示已转义的纯文本正文。`project-index.json` 永不包含 `projectedText`、raw comment 或 source body。
- Returns a renderer manifest with entrypoint, locale and file metadata for CLI or other writers.

## Contract

The renderer manifest schema version is exported as `HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION`. Project navigation index identity is exported as `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT` and `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION`. Portal IA identity, exact draft version, vocabulary, types, resolver, touched-label catalog, and owner-local Draft 2020-12 schema are exported through `DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_*`. `PORTAL_PRESENTATION_PROFILE_PATH` and `createPortalPresentationBundle()` expose the Portal-owner adoption surface for the neutral presentation contract. `RenderProjectOwnerAdoptionSummary` remains a structural consumer view of the CLI-owned adoption-kit projection; the renderer does not own or reinterpret the full kit contract.

Native `<details>/<summary>` remains the disclosure authority. Expanded state comes from `details[open]` and the browser accessibility mapping; the renderer does not duplicate authored `aria-expanded`. Split-site 的 `<noscript>` 入口会转到独立多页输出；默认 `fetch` 源码在该输出中降级为构建生成的同源资源链接，而不是恢复外部 locator。Print/forced-colors fallback 由 theme asset 提供。

Renderer output is separate from CLI filesystem output. See `docs/contract-index.md` for the current layering rule.
