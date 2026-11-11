# Public Reference Build

The public reference build assembles first-party HIA documentation artifacts from an explicit source allowlist. The build command produces a checked artifact; Pages deployment is a separate workflow step. Private workspace materials are excluded.

## Core package module APIs

The independent [core API reference](https://mandolin.github.io/HIA-Documentation-API/) publishes module documentation from thirteen core packages. Its [deployment repository](https://github.com/mandolin/HIA-Documentation-API) pins an immutable release artifact and verifies its digest before deployment. Package resources, command entries and satellite tools have separate adoption inventories.

中文。独立核心 API 参考站由本仓的真实模块与通用 TypeScript 生产链生成，两语言目录保留完整项目索引、静态条目与原生地图。先构建主仓与相邻 `HIA/hia-tsdoc`，再从本仓运行 `pnpm reference:core:build`。输出默认在 `dist/core-api-reference/`，仅 `site/` 子目录可用于站点发布。相邻的 `build-report.json` 记录来源提交、包选择及逐文件摘要，根级 `package-api/` 保留构建核验副本。每文件上限 32 MiB、总量上限 100,000 文件及 1,000,000,000 字节。失败保留暂存证据，成功替换已有输出时保留前一版目录。源码正文仍需单独授权。

English. Build this repository and the adjacent `HIA/hia-tsdoc` producer, then run `pnpm reference:core:build` from this repository. The default output is `dist/core-api-reference/`; publish its `site/` child. The adjacent `build-report.json` records source revisions, package selection and per-file hashes, while root-level `package-api/` contains build-verification copies. The builder checks declarations, fields, signatures, source metadata, native artifacts, privacy, and publication limits of 32 MiB per file, 100,000 files and 1,000,000,000 total file bytes. Failed staging directories retain diagnostic evidence. Replacing a successful output retains its predecessor. Source-text access requires separate authorization.

```sh
pnpm build
pnpm reference:core:build
```

The main reference Pages workflow also builds and appends the confirmed website deep-link pages under `docs/` and `site/`, plus their assets. This provides live manual targets for the API site's navigation. The original root reference page and `versions.json` retain their existing identities until the formal website-root migration. Preflight rejects conflicting paths before copying, and retries accept byte-identical files.

中文。主参考 Pages 流程同时构建并附加已确认的 `docs/`、`site/` 页面及其资产，为 API 站导航提供真实手册目标。旧根参考和 `versions.json` 保持既有身份，正式官网切根独立验收。附加操作先核全部路径冲突，重试接受完全相同的文件。

中文。清单的 `packageApis` 显式选择核心包，当前包含 `@hia-doc/plugin-sdk` 的三个模块入口及 `@hia-doc/jsondoc` 的根入口。构建从真实包入口独立审核公开绑定，采用通用 TypeScript 项目生产器的精确 0.4 工件，经既有项目输入汇入参考站。原单文件样本继续保留。上传前重新核对实际入口、四种工件、每个声明的字段/签名/来源、可读页面及地图文件。包的 JSON 资源和命令入口分别核验。

English. The definition's `packageApis` explicitly selects core packages, currently the three module entry points of `@hia-doc/plugin-sdk` and the root entry point of `@hia-doc/jsondoc`. Builds independently inspect real package exports, generate exact 0.4 artifacts through the generic TypeScript project producer, and aggregate them through existing project inputs. The original single-file sample remains available. Pre-upload checks revalidate actual entries, all four artifacts, declaration fields/signatures/sources, readable pages, and map files. JSON resources and commands have separate acceptance criteria.

## Portal interface language and brand

中文。每个中英文参考目录都显式采用条目分组、惰性加载及独立成员入口，界面语言初始值与该目录对应。既有语言控件可分别切换界面和正文，每个条目另有中英文界面的无脚本页面。构建使用真实消息输入生成界面语言完整性报告，上传前核验报告、静态路由和钴蓝 `#0047AB`。源码许可来自显式文件镜像配置。

English. Each Chinese or English reference directory explicitly uses entry grouping, lazy loading and separate member entries, with its UI language initially matching the directory. Existing controls switch interface and content languages independently. Every entry also has Chinese-UI and English-UI no-script pages. Actual message inputs generate the UI-language completeness report. Pre-upload checks require the report, static routes and cobalt `#0047AB`. Source authorization comes from an explicit file-mirror configuration.

## Source Boundary

The canonical definition is [`reference/public-reference-build.definition.json`](../reference/public-reference-build.definition.json). It requires the `main-repo` checkout and these eight selected repositories:

- `mandolin/hia-jsdoc`
- `mandolin/hia-htmdoc`
- `mandolin/hia-cssdoc`
- `mandolin/hia-sassdoc`
- `mandolin/hia-pugdoc`
- `mandolin/hia-tsdoc`
- `mandolin/hia-vuedoc`
- `mandolin/hia-dotnetdoc`

Remote automation checks out the eight satellites into `reference/sources/` with the read-only `HIA Reference Builder` GitHub App token. The token is used only by checkout actions with `persist-credentials: false`; the builder receives no credential environment variable.

The JSDoc umbrella retains the reviewed `main` ref; its resolved commit is recorded in each build. Its existing `owner-sources.json` requires `mandolin/jsdoc-plugin-hia-sys` at `15970dc9da0f8e120677eab7eba3e959dcf42a34` and `mandolin/jsdoc-theme-hia` at `0df2ca9bbf40e159d8da69aac80b3c31136b1a05`. Both workflows check out those sibling owners and run `npm run prepare:owners` in the umbrella before `npm ci`. That helper verifies exact Git origins/commits and archive SHA/SRI against the unchanged lock; it does not replace missing source candidates with older registry packages.

Installation iterates the definition's eight `workspace: source` records. The two archive owners are build dependencies rather than extra source producers or entries in the reference provenance inventory. When the umbrella changes its owner declarations, update both workflows to the newly declared exact owner commits and verify archive identities. The preparation helper rejects mismatching checkouts. Local checkouts need the same preparation before building; no owner manifest or lock rewrite is required.

中文。两条参考构建工作流在 `npm ci` 时显式选择官方 npm registry，并用 `--replace-registry-host=registry.npmmirror.com` 定向替换旧锁中的镜像主机。npm 继续使用锁定版本并验证原 integrity，源仓库的 lockfile 保持原字节；文件归档及其它主机不属于此定向替换范围。这样，镜像服务的数据库或 HTTP 故障不会阻断这些公开依赖的安装。

English. Both reference-build workflows explicitly select the official npm registry during `npm ci` and use `--replace-registry-host=registry.npmmirror.com` to replace that host in older locks. npm keeps locked versions and verifies their original integrity values. Owner lockfile bytes are retained. File archives and other hosts stay outside this targeted replacement. Mirror-service database or HTTP failures therefore do not block installation of these public dependencies.

## First-party .NET sample

中文。公开构建需要稳定 .NET 10 SDK。正常 `reference:build` 入口先对本仓的 `reference/samples/dotnet/HiaDocumentationSample.csproj` 执行 Release 编译，生成 XML 后交给现有 DotNetDoc 生产器，并用同一工程取得 C# 声明来源。首次编译包含还原并写入样本 bin/obj，失败时阻断后续构建；来源快照记录主仓及 DotNetDoc 各自提交。

English. A stable .NET 10 SDK is required. The normal `reference:build` entry first builds this repository's `reference/samples/dotnet/HiaDocumentationSample.csproj` in Release mode, then passes its generated XML to the existing DotNetDoc producer with the same project binding for C# origins. Initial compilation includes restore and writes sample bin/obj. Compilation failure stops the subsequent build, and provenance records the main and DotNetDoc repository commits separately.

中文。生产器只列该编译 XML 输入。`Envelope<T>` 和 `FormatLabel(string label)` 两个条目保留摘要、类型参数、备注、参数、返回及异常共七个独立双语字段；来源指向 `Envelope.cs`。类型和方法的关键 ID、签名、语言字段及 C# 路径均纳入上传前检查。领域样本与工具包 API 覆盖分别管理。

English. The producer lists only this compiled XML input. Its two entries, `Envelope<T>` and `FormatLabel(string label)`, retain seven independently localized fields spanning summaries, a type parameter, remarks, a parameter, return, and exception. Source locations point to `Envelope.cs`. Pre-upload checks require canonical IDs, signatures, localized fields, and C# paths. Domain sample coverage is tracked separately from tool-package API coverage.

中文。上传前也要求类型和方法位于同一 `Envelope<T>` 导航组，并分别保有可进入的节点。分组使用文档身份，显示名与泛型参数数量分别取自现有语义字段和文档标识。

English. Pre-upload checks also require the type and method in one `Envelope<T>` navigation group with separate entry targets. Grouping uses documentation identity, with display names and generic arity supplied by existing semantic fields and documentation IDs.

中文。混合参考构建在独占临时目录只复制本仓 `Envelope.cs`，复用现有 `fetch`、`explicit-public` 和相对 `localRoot` 配置。源码片段与独立行号页由正常 HIA 渲染链生成，上传前检查片段正文、SHA-384 摘要与行号锚点。来源真实路径和暂存根均须在本仓内，已有暂存目录会被拒绝，临时副本与配置随构建清理。原始地图继续使用 `sourcesContentPolicy=none`。

English. The mixed reference build copies only this repository's `Envelope.cs` into an exclusive runtime mirror and reuses `fetch`, `explicit-public`, and relative `localRoot` configuration. Normal HIA rendering generates source excerpts and independent line-number pages. Pre-upload checks verify excerpt bytes, SHA-384 digests, and line anchors. Real source and staging paths must remain inside the owner; existing staging directories are refused, and runtime cleanup removes the copy and config. Raw maps retain `sourcesContentPolicy=none`.

See the [sample instructions](../reference/samples/dotnet/README.md) for standalone extraction and split-site rendering. The reference build uses the existing 400-line excerpt limit.

## Local Verification

### Generated output size

中文。渲染器直接生成的项目索引、导航分片、搜索/关系数据、预载索引及呈现 profile 使用紧凑 JSON 序列化。字符串内部的空白、转义和语言正文保留，消费者按 JSON 数据读取。独立源码页复用同页行样式，保留所有行、锚点和原定位。原生包工件、Schema 和源码快照仍按其原字节发布。

English. Renderer-generated project indexes, navigation shards, search/relation data, eager indexes and presentation profiles use compact JSON serialization. String whitespace, escapes and localized prose are preserved for JSON consumers. Standalone source pages reuse page-level line styles while retaining every line, anchor and original location. Native package artifacts, schemas and source snapshots retain their original publication bytes.

### Exported JSON resources

中文。构建定义的 `packageResources` 显式选择 `@hia-doc/plugin-sdk` 的两个 JSON 导出。构建读取 `package.json` 指向的实际 `dist` 文件，以现有 JSONdoc SDK 生产器生成每个 JSON 值、容器父项、原始词法签名和 `doc-source-map@1.1.0`。独立 AST 审核及逐 Pointer 核验在生成和上传前执行。资源内容语言显式为 `und`，`$ref` 保留为词法记录。

English. The definition's `packageResources` explicitly selects both JSON exports of `@hia-doc/plugin-sdk`. The build reads the actual `dist` targets from `package.json` and uses the existing JSONdoc SDK producer for every JSON value, container parent, original lexical signature and `doc-source-map@1.1.0`. Independent AST and per-pointer checks run during generation and before upload. Resource content explicitly uses locale `und`, with `$ref` preserved as a lexical record.

中文。每个语言目录的 `package-resources/adoption.json` 列出真实导出与摘要。原生文档、地图和完整原文快照在 `package-resources/hia-doc--plugin-sdk/<导出文件名>/` 保持原字节。源码镜像显式增加 `plain-data-initialization.schema.json` 和 `artifact-derivation-evidence.schema.json` 两个公开 `dist` 文件。完整声明范围保留在地图，页面源码预览沿用最多 400 行的窗口，后续值有各自的行号入口。

English. Each locale's `package-resources/adoption.json` lists actual exports and digests. Native documents, maps and complete original snapshots retain their bytes under `package-resources/hia-doc--plugin-sdk/<export-filename>/`. The explicit source mirror includes the public `dist` files `plain-data-initialization.schema.json` and `artifact-derivation-evidence.schema.json`. Maps retain complete declaration ranges. Page source previews use the existing limit of 400 lines per window, with later values retaining their own line-number links.

中文。`htmdoc-basic-html` 的固定输入是HTML片段，清单显式使用 `html-fragment`。上传前逐生产器核实际规范化条目，并要求Alert组件、属性、插槽、事件、样式钩子及可访问性说明六个身份存在。其它来源的条目总数或成功状态不能替代该来源的内容。

English. The fixed `htmdoc-basic-html` input is an HTML fragment and explicitly uses `html-fragment`. Pre-upload checks require actual canonical entries from each declared reference producer and all six Alert component, attribute, slot, event, style-hook, and accessibility identities. Other sources' totals or success statuses cannot substitute for this content.

From the workspace container, use the existing local satellite checkouts:

```powershell
cd main-repo
mise exec -- pnpm run build
mise exec -- node scripts/build-public-reference.mjs --workspace-root .. --main-repo-root . --sources-root ../HIA --out dist/public-reference-build
mise exec -- node scripts/check-public-reference-build.mjs --out dist/public-reference-build
```

The build writes two localized unified documentation outputs, a source-linkage panel, and `reference-build.json`. The latter contains only repository/ref/resolved-SHA provenance, definition identity, aggregate counts, and privacy status. It never includes credentials, local absolute paths, private workspace data, or embedded source contents.

The entry floors use the canonical project render input: when one producer result contains both a raw `htmdoc-extraction` or `cssdoc-extraction` artifact and an equivalent normalized `hia-document`, the unified reference renders the `hia-document` entry. Raw extraction artifacts remain available in producer output for debugging, schema checks, and source-map traceability, but they are not double-counted as public navigation entries. The build also checks required canonical CSS/HTML entry IDs so this deduplicated floor still catches real symbol loss.

## Deployment Boundary

The checked build is assembled with the existing `/schemas/` distribution and generated public portal pages into the single GitHub Pages artifact by `pnpm run reference:pages`. The assembler copies only runtime-facing reference files, keeps `/schemas/` byte-identical to the schema build, writes sanitized `reference-pages.json` and `public-portal-pages.json` manifests, and emits the `current/` + `releases/0.1.0-draft/` versioned layout with `versions.json`. See [Reference Pages](./reference-pages.md) for the deployed route contract and verification commands.

## Compose generated references with an official website

中文。构建时可显式提供由官网同一事实源生成的导航文件。下面的命令使用独立候选目录；来源checkout、依赖及.NET SDK准备沿用上面的正常构建要求。导航在写入前限长、验证并固定快照，两语言读取同一份数据，源码许可继续由原来源配置决定。

English. Builds can explicitly accept navigation generated from the website's shared facts. These commands use dedicated candidate directories, retaining the normal source-checkout, dependency, and .NET SDK preparation above. Navigation is bounded, validated, and snapshotted before writes. Both locales use the same data, while existing source configuration continues governing source authority.

```bash
pnpm run site:build
node scripts/build-public-reference.mjs --site-navigation dist/official-web-preview/documentation-site-navigation.json --out dist/official-reference
node scripts/check-public-reference-build.mjs --out dist/official-reference
pnpm run reference:portal:build
node scripts/build-reference-pages.mjs --reference dist/official-reference --out dist/official-reference-pages
node scripts/check-reference-pages.mjs --out dist/official-reference-pages
node scripts/compose-official-web.mjs --website dist/official-web-preview --reference dist/official-reference-pages --legacy-mode sibling --out dist/official-site-preview
node scripts/check-official-site.mjs --out dist/official-site-preview --legacy dist/official-reference-pages
```

中文。独立官网检查明确列出由HIA提供的两个参考入口依赖，装配检查必须核实际生成文件。手册使用同站参考路径；旧参考链接保留在“生成工件与兼容入口”原生折叠区，与实际文档版本菜单分别呈现。完整装配继续校验原参考深链、兼容副本、隐私和资源预算。

English. Standalone website checks explicitly list the two reference-entry dependencies supplied by HIA, and composition must verify actual generated files. Manuals use site-local reference paths. Legacy reference links remain in a native “Generated artifacts and compatibility” disclosure, distinct from the actual documentation-version menu. Composition continues checking reference deep links, compatibility copies, privacy, and resource budgets.

中文。采用完整导航时，无脚本页和独立源码页直接写入已解析的界面文案，只在交互页与可加载正文片段写入运行时语言绑定。页面路径、来源锚点、可访问名称和本地化入口继续由生成器写入。分站装配的 `--legacy` 输入须与待发布兼容站快照核同。

English. With full navigation, script-free pages and standalone source viewers emit the resolved interface text. Interactive pages and loadable content fragments carry the runtime language bindings. The renderer emits the page routes, source anchors, accessible names, and localized links. Before publishing a split composition, verify `--legacy` against the selected compatibility snapshot.
