# @hia-doc/renderer-html

## Source availability and recovery

显式阅读信息架构会区分未提供公开片段、未获本地公开读取许可、文件或资产缺失、摘要不符及读取失败。文档正文在这些状态下保持可读。固定双语反馈使用已有公开诊断代码与实际请求结果，远端响应正文、statusText和原始网络异常均不会成为状态文案。

The explicit reading layout distinguishes an absent public excerpt, denied local publication authority, missing files or assets, integrity failures and read failures. Documentation prose remains readable. Fixed bilingual feedback uses existing public diagnostic fields and actual request outcomes. Response bodies, server status text and original network exceptions stay outside feedback copy.

恢复源资产原字节或读取许可后，点击“重置”并重新展开源码即可重新经过原摘要校验。加载期间同一按钮用于取消。静态页面会显示构建时已知的可用性反馈，禁用脚本时使用普通阅读路径。源码模式`none`继续按该模式隐藏，读取失败沿当前模式呈现。

After restoring the original asset bytes or read authority, select **Reset** and reopen the source panel to repeat the original integrity checks. During loading, the same control cancels the request. Static pages show build-time availability feedback and support ordinary reading with scripts disabled. Source mode `none` retains its visibility policy, and failures remain within the selected mode.

构建时的来源失败需要修正文件或配置后重新构建，浏览器读取器的重置只重新请求已发布的资产。Build-time source failures require correcting files or configuration and rebuilding. A browser reader reset only requests assets already published.

CLI通过已有条目diagnostics传递以下固定信息类别，重复准备会重算这些瞬时结果，其它生产者诊断保持。These fixed informational codes use existing entry diagnostics. Repeated preparation recomputes these transient outcomes and preserves other producer diagnostics.

已显示来源提示的同一诊断以`data-hia-source-diagnostic`保留公开代码，其它诊断继续在诊断区显示。The same diagnostic already represented by a source notice retains its public code in `data-hia-source-diagnostic`, while other diagnostics remain in the diagnostics section.

| Code | Meaning |
| --- | --- |
| `HIA_CLI_SOURCE_NOT_AUTHORIZED` | 本地公开读取未授权 / Local public-source reading was not authorized. |
| `HIA_CLI_SOURCE_NOT_FOUND` | 来源文件或路径不存在 / The source file or path was not found. |
| `HIA_CLI_SOURCE_READ_FAILED` | 其它本地读取失败 / Another local read failure occurred. |
| `HIA_CLI_SOURCE_NOT_PROVIDED` | 未取得可公开片段，原因按已有证据保留 / No public excerpt was obtained, with the cause limited to available evidence. |

## Shared site chrome

The `@hia-doc/renderer-html/site-chrome` subpath provides synchronous ESM and
CommonJS access to `createSiteChrome`, the existing navigation validator and
`renderSourceLines` on the documented Node.js runtime baseline.

中文说明。共享子入口接收显式页面角色、界面语言、实际同页语言路径和生成器已安全处理的正文/目录HTML。`createSiteChrome({ navigation, entries })`返回独立快照、一次生成一份的`assets`和同步`renderPage(page)`。调用方负责写文件和源码公开许可。

```js
const { createSiteChrome } = require("@hia-doc/renderer-html/site-chrome");
const site = createSiteChrome({ navigation, entries: [] });
const html = site.renderPage({
  role: "entry",
  outputPath: "greet.en.html",
  uiLocale: "en",
  localePages: { en: "greet.en.html", "zh-CN": "greet.zh-CN.html" },
  title: "greet",
  bodyHtml: '<article><h1>greet</h1></article>',
  directoryHtml: '<a href="greet.en.html">greet</a>',
  sections: []
});
```

`navigation` must satisfy `documentation-site-navigation@0.1.0-draft`.
Entry `page` and `localePages` targets are relative to the generation root.
Page `outputPath` is an HTML path, `uiLocale` is explicitly `en` or `zh-CN`,
and every section ID must exist in `bodyHtml`. Missing locale counterparts
remain disabled. Optional `stylesheets`/`scripts` use generation-root-relative
paths. HTML slots belong to a trusted generator and require its sanitization.

The service performs no I/O. It emits shared CSS, progressive-enhancement JS
and a body-free search index once per generation. Source-role pages are
script-free with a restrictive CSP. Invalid input throws a public `TypeError`
with `HIA_SITE_CHROME_INVALID` or the existing navigation diagnostic, without
echoing rejected values. Read-only asset lists can be reused across pages.

中文说明。搜索按实际静态页面跳转，搜索及设置只在当前页面运行，设置不持久化。源码正文、文件归属、语言/版本和坐标精度由各生产方及现有契约负责，导航数据只提供公开站点目标。

中文。`RenderProjectEntry.identityScope` 为可选聚合作用域。父子、成员与来源关系按作用域隔离，含作用域条目的索引使用 `0.2.0-draft`，原无作用域索引保持 `0.1.0-draft`。调用方负责稳定作用域和唯一条目标识，源码授权按来源策略核验。详见[聚合迁移](../../docs/project-manifest-migration.md#scoped-aggregation)。

English. Optional `RenderProjectEntry.identityScope` isolates parent/member and provenance relations. Indexes containing scoped entries use `0.2.0-draft`, with unscoped indexes retaining `0.1.0-draft`. Callers supply stable scopes and unique entry IDs. Source authority follows the source policy.

## 正文来源语言 / Prose source language

正文选择语言与实际原文语言分别管理。`data-hia-locale` 保留请求语言，段落 `lang` 使用字段解析后的实际语言。普通摘要使用条目现有 `i18n.defaultLocale`，单文档渲染还可使用所属文档的 `defaultLocale`。直接项目调用没有来源声明时输出 `lang=""`，避免继承界面语言。切换语言不会生成译文。

English. Content selection and source language are independent. `data-hia-locale` retains the requested locale while paragraph `lang` identifies the resolved text language. Bare summaries use an entry's existing `i18n.defaultLocale`, or the owning document's `defaultLocale` for document rendering. Direct project calls without a source declaration emit `lang=""` to prevent inheriting the UI language. Locale selection does not generate translations.

## 1.0.0 source candidate

This source tree targets a coordinated 1.0.0 package candidate. It does not
announce npm availability. See the [package migration guide](../../docs/package-v1-migration.md)
for matching dependencies, artifact versions and source compatibility.

中文：当前为1.0.0源码候选，实际发布及工件版本请分别核对迁移说明。


HIA 文档的 HTML renderer，同时支持单一 document 与统一项目站。

The renderer consumes `@hia-doc/core` data and returns file payloads. It does not read from disk or own CLI behavior.

## Current Scope

### Optional website navigation

中文。站点阅读页的 JS 领域徽标在 `entry.source.language` 明确为 `typescript` 时显示 TypeScript，其余情况沿用 JavaScript。原领域分组、索引身份和源码数据保持各自职责。

English. Adopted reading pages label JS-domain entries as TypeScript when `entry.source.language` explicitly equals `typescript`, retaining JavaScript otherwise. Domain grouping, index identity and source metadata retain their respective roles.

中文。项目渲染的 `projectSite.siteNavigation` 接受独立 `documentation-site-navigation@0.1.0-draft` 数据。宿主明确提供品牌、两语言标签、部署内路由与实际文档版本，同时设置 `projectSite.uiLocale`。渲染器在交互页、静态索引/条目和独立源码页生成固定顶部、原生版本菜单、文档栏目及手机菜单，输出一份 `assets/hia-site-navigation.css`。原生菜单可在禁用脚本时使用。正文语言与界面语言分别管理。源码权限仍来自原输入和来源策略。

English. Project rendering accepts independent `documentation-site-navigation@0.1.0-draft` data through `projectSite.siteNavigation`. Hosts provide branding, bilingual labels, deployment-local routes, actual documentation versions, and an explicit `projectSite.uiLocale`. The renderer adds a fixed header, native version menu, documentation tabs, and mobile menu to interactive pages, static indexes/entries, and standalone source viewers, emitting one `assets/hia-site-navigation.css`. Native menus work without scripts. UI and content languages are independent. Source authority comes from the existing inputs and source policy.

```js
import { assertDocumentationSiteNavigation, renderProjectHtmlDocumentToWriter } from "@hia-doc/renderer-html";

// 中文。数据由宿主读取或构造，渲染器不读取文件。
// English. Hosts load or construct the data. The renderer performs no file reads.
const navigation = {
  contract: "documentation-site-navigation",
  contractVersion: "0.1.0-draft",
  deploymentBase: "/product/",
  brand: {
    title: "Example Documentation",
    captionByLocale: { "zh-CN": "开发文档", en: "Developer documentation" },
    homeByLocale: { "zh-CN": "/product/", en: "/product/en/" }
  },
  primaryNavigation: [{
    id: "docs",
    labelByLocale: { "zh-CN": "文档", en: "Docs" },
    hrefByLocale: { "zh-CN": "/product/docs/zh-CN/", en: "/product/docs/en/" }
  }],
  documentationTabs: [{
    id: "code",
    labelByLocale: { "zh-CN": "代码文档", en: "Code reference" },
    hrefByLocale: { "zh-CN": "/product/api/zh-CN/", en: "/product/api/en/" }
  }],
  activePrimaryId: "docs",
  activeTabId: "code",
  documentationVersion: {
    version: "1.0.0", status: "preview",
    entries: [{ version: "1.0.0", status: "preview", hrefByLocale: { "zh-CN": "/product/api/zh-CN/", en: "/product/api/en/" } }],
    history: {
      labelByLocale: { "zh-CN": "历史版本", en: "Archives" },
      hrefByLocale: { "zh-CN": "/product/versions/", en: "/product/versions/en/" }
    }
  },
  localeTargets: { "zh-CN": "/product/api/zh-CN/", en: "/product/api/en/" }
};
assertDocumentationSiteNavigation(navigation);
await renderProjectHtmlDocumentToWriter(projectInput, writer, {
  projectSite: { uiLocale: "zh-CN", informationArchitecture: {}, siteNavigation: navigation }
});
```

中文。两种语言 `zh-CN`/`en` 的标签和目标均为必填。字段采用闭集。主导航和栏目各限1–16项，组内身份使用至多32位小写字母数字且以字母起始，选中身份必须存在。版本菜单限1–64项，完整三段版本号唯一，当前版本和状态必须在菜单精确出现一次。状态为 `preview`、`stable`、`archive`。菜单只列真实存在的版本，宿主负责版本事实及链接存在性。界面语言评估采用实际输入标签；报告不包含译文正文。

English. Labels and targets are required for both `zh-CN` and `en`, using closed fields. Primary navigation and tabs each contain 1–16 entries. IDs contain at most 32 lowercase alphanumeric characters, beginning with a letter, and selected IDs must exist. Version menus contain 1–64 entries with unique complete three-component versions and exactly one matching current version/status. Statuses are `preview`, `stable`, and `archive`. Hosts supply actual versions and verify target existence. UI-language evaluation uses the actual input labels, excluding translated text from reports.

中文。部署根以 `/` 开始及结束；目标为部署根下的站点绝对路径，可带显式锚点。草案拒绝查询参数、协议、本机地址、反斜杠、点段、路径百分号编码及越根目标。标签非空有界，拒绝控制符、尖括号和模板花括号，其余文本在HTML中转义。标题最多128字符，其它标签最多256字符，目标最多2048字符。无效输入在写者首写前抛出 `HIA_SITE_NAVIGATION_INVALID`，缺少明确界面语言抛出 `HIA_SITE_NAVIGATION_UI_LOCALE_REQUIRED`。渲染器复制导航供惰性生成使用，写者回调期间修改外部对象不会改变后续页面。

English. Deployment roots begin and end with `/`. Targets are site-absolute paths within that root and may carry explicit anchors. The draft rejects queries, schemes, local addresses, backslashes, dot segments, percent-encoded paths, and root escapes. Labels are nonblank and bounded, rejecting controls, angle brackets, and template braces, with remaining text HTML-escaped. Titles allow 128 characters, other labels 256, and targets 2048. Invalid input throws `HIA_SITE_NAVIGATION_INVALID` before the first writer call. Missing explicit UI locale throws `HIA_SITE_NAVIGATION_UI_LOCALE_REQUIRED`. Navigation is snapshotted for lazy generation, so writer-time changes to caller objects cannot change later pages.

中文。没有导航输入时保留原输出。导航不会从 `project.productVersion` 推导站点版本或历史路由。单一文档的 `renderHtmlDocument` 不消费项目导航。CLI采用方式见其分发的 `USAGE.md`。

English. Omitting navigation preserves existing output. Navigation does not derive documentation versions or historical routes from `project.productVersion`. Single-document `renderHtmlDocument` does not consume project navigation. CLI adoption is described in its distributed `USAGE.md`.

中文。API只接受普通JSON数据属性和稠密数组，拒绝getter、隐藏字段、symbol字段及自定义数组迭代器。导航可以与旧项目布局组合；未启用显式信息架构时，语言报告使用 `portal.sitenavigation` 身份，仅评估新增导航标签。显式信息架构则把这些标签加入完整Portal消息清单。长主导航和栏目在各自容器内滚动，极长品牌保留完整可访问名称及title提示，视觉限制为两行。

English. The API accepts ordinary JSON data properties and dense arrays, rejecting getters, hidden or symbol fields, and custom array iterators. Navigation also works with legacy project layouts. Without explicit information architecture, the language report uses `portal.sitenavigation` and evaluates the added navigation labels alone. Explicit information architecture adds those labels to the complete Portal message inventory. Long primary navigation and tabs scroll within their own containers. Very long brands retain their complete accessible name and title tooltip with a two-line visual limit.

中文。独立源码页和原静态路径使用构建明确指定的界面语言，`pages/{uiLocale}/` 使用路径中已知的界面语言。交互页的运行时语言切换只更新当前页。语言入口和版本入口使用宿主提供的实际目标，当前草案不根据文件名猜测跨语言、跨版本的同符号或同行号对应关系。

English. Standalone source viewers and legacy static routes use the build-explicit UI locale, while `pages/{uiLocale}/` uses its known route locale. Runtime UI switching updates the current interactive page. Language and version entries use actual host-supplied targets. The draft does not guess same-symbol or same-line counterparts across languages or versions from file names.

### Adopted reading layout

中文。显式站点导航同时采用三栏阅读布局、真实小节目录和手机原生折叠目录。标准API字段及既有.NET字段别名使用可读双语标题，字段身份、签名、所有正文语言和源码字节保留。接口深链仅展开其祖先分片，快速切换时忽略过期响应；加载或失败时保留已读正文。页内目录的普通链接可直接打开现有静态对应页。

具名参数、类型参数和异常按已有字段名称归组为“名称/说明”表格，保留逐字段锚点及所有语言正文。表格不推断输入未提供的类型、默认值或精度。

English. Explicit site navigation also selects the three-column reading layout, actual-section outlines, and native mobile directories. Standard API fields and existing .NET aliases receive readable bilingual headings while retaining field identities, signatures, every prose locale, and source bytes. API deep links expand only their ancestor shards. Stale selection responses are ignored, and loading or failure retains already displayed prose. Ordinary outline links can open existing static counterparts directly.

Named parameters, type parameters, and exceptions are grouped into name/description tables using existing field names, retaining per-field anchors and every prose locale. Tables infer no unprovided types, defaults, or precision.

中文。交互入口额外生成一份 `assets/hia-site-reading.js`，提供当前生成项目的本地索引检索、签名复制和阅读设置。设置支持浅色/深色/系统、代码滚动/换行及源码行号，采用构建默认且仅作用于当前页。界面语言和正文语言继续独立。静态页和独立源码页保持无脚本，省去运行时专用属性和不可用工具按钮。独立源码页保留原CSP、真实行号及返回接口入口，精度仍由来源证据决定。普通浏览器中的宿主文件定位请求会显示为禁用，同源公开源码链接仍可使用。

English. Interactive entries additionally emit one `assets/hia-site-reading.js` for local generated-project search, signature copying, and reading settings. Settings cover light/dark/system appearance, code scrolling/wrapping, and source line numbers, using build defaults and affecting the current page only. UI and prose locales remain independent. Static and standalone source pages remain script-free and omit runtime-only payloads and unavailable tool buttons. Source viewers preserve their CSP, real line anchors, and API-return links, with precision determined by source evidence. Host file-navigation requests are disabled in standalone browsers while public same-origin source links remain available.

中文。显式信息架构的附加字段标题与元数据、源码状态共用界面语言消息目录。正文保有各自语言标记，界面与正文可分别切换；兼容入口继续使用原有标题。

English. Explicit-IA additional-field headings share the UI-language catalog used by metadata and source states. Prose retains its own language markers, and UI and content languages switch independently. Compatibility entry points retain their existing headings.

中文。.NET 导航按程序集与文档类型身份分组。类型声明提供的语义显示名用于标签，成员的父类型文档标识用于归属；旧文档可从文档标识取得所属类型，保留泛型参数数量。导航中的类型入口可以展开到成员入口。

English. .NET navigation groups entries by assembly and documentation type identity. Declaration-provided semantic names supply labels, while parent type documentation IDs associate members. Legacy documentation IDs retain generic arity and supply owner-type fallbacks. Type navigation entries expand to member entries.

- 大站可调用 `renderProjectHtmlDocumentToWriter(input, writer, options)`，逐文件生成并等待writer；返回无正文的manifest/diagnostics/fileCount。旧API仍显式收集完整数组。详见[构建内存与源码边界](../../docs/project-build-memory.md)。
- Large sites can use the awaited per-file writer API; input/index metadata still scales with the site, and explicit single-page/eager outputs may remain large.

授权的fetch/link同时生成带行号与#L锚点的同源源码HTML页；fetch仍读取独立纯文本并验证摘要，不把HTML当源码执行。
Authorized fetch/link modes also emit script-free source-view pages with line anchors; fetch retains its separate integrity-checked plain-text endpoint.


- 单一 document 模式输出一个 `index.html`。
- 统一项目站默认输出 `split-site`：入口页、延迟导航分片、搜索索引、关系图、逐节点 HTML fragment，以及 `pages/` 下不依赖 JavaScript 的索引和逐 topic 页面。
- `projectSite.source.presentation` 统一约束 `none`、`link`、`embed`、`fetch` 四种源码呈现方式；默认值为 `fetch`。
- `fetch` 默认在用户展开源码详情时加载；`projectSite.source.fetchTrigger: "manual"` 可启用显式加载按钮，且 split-site / single-page 复用同一受限 reader。
- `fetch`/`link` 只生成 `sources/{sha256}.txt` 同源资源和局部 `.gitattributes`；资源具有 content revision、SHA-384、byte/line facts，旧 external URL 被剥离且不会成为 fallback。
- 项目站输出 exact-valid `documentation-presentation-profile.json`，并由 manifest/project index 以最小引用关联；profile 不含 owner DOM/CSS/route 私有结构或源码正文。
- Consumes field-level i18n text and emits runtime-switchable locale blocks.
- 单文档、项目单页、split-site 条目及无脚本成员页保留全部非空 i18n 字段（含未知扩展）。主文优先 `description`，否则 `summary`，只呈现一次；缺译沿用明确 fallback 标记。
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
- 显式 Portal IA 下，项目输入可选接受 exact public `businessFlowDocumentationProjection`。完整 human-linear、AI graph-ready 与 shared facts 只进入 `project-index.json`，manifest 只保留 contract/version/path/count 引用；handoff review、owner/target identity、源码正文及范围均不进入。当前没有统一 Portal 的确认视觉基线，因此本 slice 不渲染新的流程 HTML、图形布局或交互。
- 显式 IA 下可消费 `documentation-source-comment-projection@0.1.0-draft`。metadata 始终采用 allowlist；只有 producer projection 与 `projectSite.sourceCommentProjection` 对同一 locale 双重授权时才显示已转义的纯文本正文。`project-index.json` 永不包含 `projectedText`、raw comment 或 source body。
- Returns a renderer manifest with entrypoint, locale and file metadata for CLI or other writers.

## Contract

`renderThemeAssets({ colors })` exposes a branded CSS/JS pair for an explicit sole writer. Both rendering functions accept
`themeAssets: { mode: "external", baseUrl: "../../assets/" }`, omitting local copies and relocating references at every page depth.
中文：共享资源由明确的唯一写入者生成，不隐式越过当前输出目录。见[配置与边界](../../docs/shared-theme-assets.md)。

`RenderHtmlOptions.theme` / `RenderHtmlThemeOptions` accepts `colors`, `skinId` and `scheme` for both rendering functions.
Root skin/scheme values take per-field precedence over legacy `projectSite.theme`; omitted fields retain compatibility fallbacks.
Colors apply to locally emitted assets too. Invalid colors are rejected even when assets are omitted or externally owned.
中文：单页与项目站可直接传品牌颜色及皮肤/配色；签名在窄屏自动换行，原始代码块的空白规则保持不变。

The renderer manifest schema version is exported as `HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION`. Project navigation index identity is exported as `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT` and `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION`. Portal IA identity, exact draft version, vocabulary, types, resolver, touched-label catalog, and owner-local Draft 2020-12 schema are exported through `DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_*`. `PORTAL_PRESENTATION_PROFILE_PATH` and `createPortalPresentationBundle()` expose the Portal-owner adoption surface for the neutral presentation contract. `RenderProjectOwnerAdoptionSummary` remains a structural consumer view of the CLI-owned adoption-kit projection; the renderer does not own or reinterpret the full kit contract. `RenderProjectBusinessFlowDocumentationProjectionRef` is the body-free renderer-manifest linkage for the full W-P122 projection stored in the project index.

Native `<details>/<summary>` remains the disclosure authority. Expanded state comes from `details[open]` and the browser accessibility mapping; the renderer does not duplicate authored `aria-expanded`. Split-site 的 `<noscript>` 入口会转到独立多页输出；默认 `fetch` 源码在该输出中降级为构建生成的同源资源链接，而不是恢复外部 locator。Print/forced-colors fallback 由 theme asset 提供。

Renderer output is separate from CLI filesystem output. See `docs/contract-index.md` for the current layering rule.
