# HIA CLI usage notes

中文。本指南随 `@hia-doc/cli` 分发，涵盖候选版本、大项目构建和共享主题资产。示例假设已安装配套包，且 `hia` 可在项目脚本中调用。Node.js 支持 `^22.23.4 || ^24.22.1`。

English. This bundled guide covers candidate versions, large builds, and shared theme assets. Examples assume matching packages are installed and `hia` is available in a project script. Supported Node.js versions are `^22.23.4 || ^24.22.1`.

## Candidate versions

中文。此源码树的包版本为协调的 1.0.0 候选。实际安装前应确认注册表中的目标版本及配套依赖均已发布。升级时使用匹配的核心、配置、渲染器和主题包，并重新构建消费代码。

English. The package versions in this source tree form a coordinated 1.0.0 candidate. Check registry availability of the target versions and dependencies before installation. Upgrade core, config, renderer, and theme as a matching set and rebuild consumer code.

中文。包版本与工件身份分别管理。配置仍使用 `schemaVersion: "0.1.0"`，源码映射可使用已支持的 `doc-source-map@1.1.0`，其它工件依各自精确身份读取。旧版的读取、显式迁移与 TypeScript 源码兼容边界应逐项核对。宿主绑定投影包含三个版本的真实联合类型，原有穷尽分支须迁移。

English. Package and artifact versions are independent. Config retains `schemaVersion: "0.1.0"`, supported source maps include `doc-source-map@1.1.0`, and other artifacts retain their exact identities. Review legacy reading, explicit migration, and TypeScript source compatibility individually. Host-binding projections expose a three-version union, requiring updates to older exhaustive branches.

## Large project builds

### Optional website navigation

中文。项目构建可通过独立 `--site-navigation navigation.json` 读取 `documentation-site-navigation@0.1.0-draft`，同时在配置中明确指定 `docs.renderer.uiLocale`。该选项独立于原配置契约版本，仅适用于 `--project-manifest`。JSON形状与完整示例见渲染器README的“Optional website navigation”。

English. Project builds can read `documentation-site-navigation@0.1.0-draft` through independent `--site-navigation navigation.json`, with an explicit `docs.renderer.uiLocale` in configuration. This option is independent of existing configuration identities and applies to `--project-manifest`. See “Optional website navigation” in the renderer README for the complete data shape and example.

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "renderer": {
      "projectLayout": "split-site",
      "uiLocale": "zh-CN",
      "informationArchitecture": {
        "contentGrouping": "entry",
        "loadingStrategy": "lazy",
        "memberPlacement": "separate"
      }
    }
  }
}
```

```sh
hia docs build --config hia.config.json --project-manifest hia.project.json --site-navigation navigation.json --out review-site
```

中文。导航文件必须是有效UTF-8 JSON，最多512 KiB。CLI在聚合来源和创建输出之前校验标签、两语言目标、版本菜单及同源部署边界。缺文件、非法JSON、超限、缺界面语言或与单文档组合均退出1并报告 `HIA_CLI_SITE_NAVIGATION_INPUT_INVALID`。导航不提供源码读取许可。构建完成后仍须核对实际目标页面与锚点存在性，再部署完整输出。`--locale` 继续控制正文语言。

English. Navigation files must be valid UTF-8 JSON within 512 KiB. The CLI validates labels, bilingual targets, version menus, and same-origin deployment boundaries before aggregating sources or creating output. Missing files, invalid JSON, oversized input, missing UI locale, or single-document combinations return 1 with `HIA_CLI_SITE_NAVIGATION_INPUT_INVALID`. Navigation grants no source-read authority. Verify actual target pages and anchors after building, then deploy the complete output. `--locale` continues to select content language.

中文。采用导航时，`--manifest` 不能覆盖 `assets/hia-site-navigation.css`、`assets/hia-site-reading.js` 或 `documentation-ui-locale-completeness.json`，冲突在输出创建前拒绝。交互入口使用同一生成根的索引提供本地检索和当前页阅读设置；静态条目与源码页保留无脚本导航。

English. With navigation enabled, `--manifest` cannot overwrite `assets/hia-site-navigation.css`, `assets/hia-site-reading.js`, or `documentation-ui-locale-completeness.json`. Conflicts are rejected before output creation. Interactive entries use the same generated root's index for local search and page-only reading settings. Static entries and source viewers retain script-free navigation.

### Unknown build options

中文。当前 `hia docs build` 只读取已知参数，未知选项及其附带文本可能被忽略，构建仍可成功并写出文件。拼错 `--out` 时可能使用配置输出目录或默认 `dist/docs`。退出 0 只表示本次构建成功，不能证明每个传入选项均被识别。自动化脚本请逐项核对本指南的参数名称，并在独立暂存目录检查实际输出位置。

English. Current `hia docs build` reads known options and may ignore unknown options and their accompanying text while still succeeding and writing files. A misspelled `--out` may leave the configured output or default `dist/docs` in effect. Exit 0 confirms build success but does not prove recognition of every supplied option. Check option names against this guide and review the actual output location in a dedicated staging directory.

```sh
hia docs build --input input.hia.json --out review-output --unrecognized-example ignored
```

中文。上例仍可生成 `review-output/index.html`，未知开关没有校验效果。这是现有构建入口的行为说明。`hia docs theme-assets` 和卫星命令各有自己的参数校验，须分别核对。

English. The example can still generate `review-output/index.html`; the unknown switch has no validation effect. This documents the existing build entry. Check the independent option validation rules of `hia docs theme-assets` and satellite commands separately.

中文。项目构建默认使用多页输出。准备一个有效的项目清单后执行以下命令。构建会写入输出目录，建议先在独立暂存目录验收，再部署完整目录。

English. Project builds default to split-site output. Prepare a valid project manifest and run the command below. Builds write to the output directory. Review a dedicated staging output before deploying the complete directory.

```sh
hia docs build --config hia.config.json --project-manifest hia-project.json --out site/api/zh-CN --locale zh-CN
```

中文。项目输出采用逐文件等待写入的流式路径，清单和索引元数据仍随条目数增长。显式选择单页或一次性保留全部文件会增加内存需求。缓存上限仅约束相应缓存，进程 RSS 还包含解析结果、运行时和其它构建状态。

English. Project output awaits each file write through the streaming path. Manifest and index metadata still grow with entry count. Explicit single-page or eager output increases memory requirements. Cache limits bound their respective caches, while process RSS also includes parsed artifacts, runtime overhead, and other build state.

中文。本地源码预览须明确设置 `docs.source.publicAssetPolicy: "explicit-public"`，并限定 localRoot、范围和 maxLines。localRoot 相对于配置目录解析，maxLines 默认 400。单份摘录上限为 1 MiB，命令级 LRU 按 UTF-16 估算为 16 MiB，保留正文预算为 1 GiB。超限应缩小获准范围或拆分构建。

English. Local source previews require `docs.source.publicAssetPolicy: "explicit-public"` and bounded localRoot, ranges, and maxLines. Resolve localRoot from the config directory. The default maxLines is 400. Limits include 1 MiB per excerpt, a command-level LRU estimated at 16 MiB in UTF-16, and a 1 GiB retained-body budget. Reduce the authorized scope or split the build when a limit is reached.

中文。相关错误码为 `HIA_CLI_SOURCE_PREVIEW_LIMIT` 和 `HIA_CLI_SOURCE_PREVIEW_BUDGET_EXCEEDED`。应检查诊断及生产结果后再发布。XML 文档位置与 C# 声明位置分别按生产器提供的来源处理。

English. The relevant diagnostics are `HIA_CLI_SOURCE_PREVIEW_LIMIT` and `HIA_CLI_SOURCE_PREVIEW_BUDGET_EXCEEDED`. Review diagnostics and producer results before publishing. XML documentation locations and C# declaration locations retain producer-supplied provenance.

## Shared theme assets

中文。由一次专用命令在站点根写出主题，再让各输出引用同一份资产。以下配置保存为 `hia.config.json`，项目清单保存在 `hia-project.json`。

English. Use one dedicated command to write theme assets at the site root, then reference them from each output. Save the configuration below as `hia.config.json` and the project manifest as `hia-project.json`.

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "theme": {
      "name": "default",
      "colors": { "accent": "#0f4f82" },
      "assets": { "mode": "external", "baseUrl": "../../assets/" }
    }
  }
}
```

```sh
hia docs theme-assets --config hia.config.json --out site
hia docs build --config hia.config.json --project-manifest hia-project.json --out site/api/zh-CN --locale zh-CN
```

中文。第一条命令拥有 `site/assets/hia-default.css` 与 `.js` 的写入权。第二条按入口页相对路径引用 `../../assets/`，更深的条目页由渲染器调整引用。若其它输出位于不同深度，应为该构建提供匹配的 baseUrl。发布时包含共享资产目录，并确保各构建使用相同主题配置。

English. The first command writes `site/assets/hia-default.css` and `.js`. The second references `../../assets/` from its entry page, with deeper-page references adjusted by the renderer. Supply a matching baseUrl for outputs at other depths. Deploy the shared asset directory and use matching theme configuration across builds.

中文。颜色、共享资产与源码公开许可分别配置。主题命令的成功不能证明源码已获准公开。

English. Configure colors, shared assets, and source-publication permission independently. Verify source-publication permission separately from successful theme generation.

## Installation routes

中文。先按实际安装版本选择资料。此源码树为协调 1.0.0 候选，使用候选归档时须将完整配套内部依赖的归档逐一作为 `npm install` 参数安装；离线安装还需已准备第三方依赖缓存。使用注册表前先检查每个目标版本及配套依赖可用，再执行安装。`npm list @hia-doc/cli --depth=0` 可核本地安装版本，`npm view @hia-doc/cli@1.0.0 version` 可核该注册表目标。版本查询访问注册表。

English. Select documentation for the actual installed version. This source tree is a coordinated 1.0.0 candidate. For archives, pass every matching internal dependency archive explicitly to `npm install`; offline installs also require a prepared third-party dependency cache. Before registry installation, check every target version and matching dependency. Use `npm list @hia-doc/cli --depth=0` for the local version and `npm view @hia-doc/cli@1.0.0 version` for the registry target. The latter contacts the registry.

中文。在安装项目的 npm 脚本中调用 `hia`，或用 `npm exec --offline -- hia --help` 选择本地命令。主命令通过包清单核版本；卫星生产命令提供 `--version/-v`。旧 0.1.x 教程及其 draft 配置按旧包版本阅读，升级候选时使用本指南和精确工件迁移说明。

English. Invoke `hia` from an installed project's npm script or use `npm exec --offline -- hia --help` to select the local binary. Check the main CLI version through package metadata; satellite producers provide `--version/-v`. Read historical 0.1.x tutorials and draft configs against their package versions. Use this guide and exact artifact migrations for the candidate.

## Command reference

中文。下列11条路径使用`--name value`格式，文件名为调用者已准备的输入。`hia docs --help`、`hia browser --help`显示本组索引，各叶的`--help/-h`显示专用双语帮助。无参数及未知路径带help显示根帮助，帮助在配置/输入读取及参数执行校验前退出0。各命令的输出权限、错误码和元数据状态分别核对。

English. These eleven paths use `--name value` arguments and caller-prepared input files. Group help lists its own leaves, and leaf `--help/-h` shows dedicated bilingual help. No arguments and unknown help paths show root help. Help exits 0 before configuration/input reads and executable argument validation. Check each command's output authority, exit codes and metadata states independently.

中文。TTY按显示列选择已定义的80/120列布局，重定向缺省80列，两者均为纯文本。已编译包的dist/command-documentation目录同时包含命令描述JSON、实际声明观察JSON和标准HiaDocument JSON。源码正常构建从真实TypeScript路由/参数读取语句重建观察，核摘要并严格投影；修改命令描述或解析声明后重新构建即可检查漂移。

English. TTY output selects the defined 80/120-column layout from terminal columns, while redirected output defaults to 80. Both are plain text. Compiled packages include command-description JSON, actual declaration-observation JSON and standard HiaDocument JSON in dist/command-documentation. Normal source builds reconstruct observations from actual TypeScript routes and option reads, verify digests and perform strict projection, checking drift after content or parser changes.

### docs build

```sh
hia docs build --input input.hia.json --out site --locale zh-CN
```

中文。`--input`、`--jsdoc-integration`、`--project-manifest` 三选一；省略时使用配置输入或内置 basic 夹具。可选 `--config`、`--adoption-kit`、`--business-flow-handoff`、`--out`、`--locale`、`--manifest`。CLI 路径相对调用目录，配置路径相对配置文件目录，CLI 值覆盖配置值。默认输出 dist/docs，manifest 默认 hia-manifest.json 且须位于输出内。写页面、资产与清单，成功0、错误1。未知选项行为见上文。

English. Select one of `--input`, `--jsdoc-integration`, or `--project-manifest`. Omission uses configured input or the built-in basic fixture. Optional flags are `--config`, `--adoption-kit`, `--business-flow-handoff`, `--out`, `--locale`, and `--manifest`. CLI paths use cwd, config paths use the config directory, and CLI values override config. Output defaults to dist/docs, with hia-manifest.json inside the output. Writes pages, assets, and a manifest. Success exits 0 and errors exit 1. See unknown-option behavior above.

### docs theme-assets

```sh
hia docs theme-assets --config hia.config.json --out site
```

中文。`--out` 必填，`--config` 可选，只接受这两个带值选项。输出路径相对调用目录，写 assets/hia-default.css 与 .js。成功0、参数/配置错误1。各页面的共享 URL 深度见前文。

English. Requires `--out` and optionally accepts `--config`. These are the only supported value options. Resolve output from cwd and write assets/hia-default.css and .js. Success exits 0, argument/config errors exit 1. Shared URL depth is described above.

### docs evidence

```sh
hia docs evidence --docs-dir site --out reports/evidence.json
```

中文。`--docs-dir` 默认 dist/docs，`--out` 默认该目录内 documentation-evidence.json。路径相对调用目录，读取已有项目输出并写公开安全摘要，成功0、错误1。

English. `--docs-dir` defaults to dist/docs and `--out` to documentation-evidence.json within that directory. Resolve paths from cwd. Read existing project output and write a public-safe summary. Success exits 0, errors exit 1.

### docs acceptance

```sh
hia docs acceptance --evidence evidence.json --target-id sample --target-family unicode-compatible --out reports/acceptance.json
```

中文。四个选项中 `--out` 可省略，省略则输出 JSON 到 stdout。family 为 unicode-compatible、html-authoring、enterprise-business 或 workspace-container。输入和可选输出相对调用目录且须安全相对路径。accepted0，其它结果或错误1。

English. All shown options except `--out` are required. Omit it for JSON on stdout. Families are unicode-compatible, html-authoring, enterprise-business, and workspace-container. Input and optional output must be safe-relative under cwd. Accepted exits 0; other results or errors exit 1.

### docs continuity

```sh
hia docs continuity --baseline baseline.json --current current.json --target-id sample --target-family enterprise-business --out reports/continuity.json
```

中文。必填 baseline/current/target-id/target-family，仅支持 enterprise-business。输入与可选 `--out` 是互异安全相对路径。省略输出则向 stdout 写 JSON，accepted0、其它结果或错误1。

English. Requires baseline/current/target-id/target-family, supporting enterprise-business. Inputs and optional `--out` must be distinct safe-relative paths. Omit output for JSON on stdout. Accepted exits 0; other results or errors exit 1.

### docs adoption-kit

```sh
hia docs adoption-kit --request adoption-request.json --out reports/adoption-kit.json
```

中文。必填 `--request`，可选 `--out`，均为调用目录内安全相对路径。省略输出则 stdout JSON，refused/错误1，其它状态0，包括 deferred-owner-input-missing。0不表示负责人已同意或实际采用。

English. Requires `--request`, optionally `--out`, as safe-relative paths under cwd. Omit output for JSON on stdout. Refused/errors exit 1; other states exit 0, including deferred-owner-input-missing. Exit 0 does not establish consent or actual adoption.

### docs business-flow-handoff

```sh
hia docs business-flow-handoff --projection flow-projection.json --out reports/flow-handoff.json
```

中文。必填 `--projection`，可选 `--out`，采用安全相对路径。读取精确流程投影，ready-for-owner-review0，其它结果或错误1。省略输出则 stdout JSON，负责人同意与采用状态另有记录。

English. Requires `--projection` and optionally `--out`, using safe-relative paths. Reads an exact flow projection. Ready-for-owner-review exits 0; other results/errors exit 1. Omit output for JSON on stdout. Consent and adoption retain independent records.

### docs enterprise-workflow

```sh
hia docs enterprise-workflow --adoption-request adoption-request.json --baseline baseline.json --current current.json --out reports/workflow.json
```

中文。必填 `--adoption-request`；`--baseline/--current` 须成对，负责人已提交时必需。`--out` 可省略以用 stdout。路径为安全相对路径。refused/错误1，其它状态0，缺负责人输入可为 deferred。

English. Requires `--adoption-request`. `--baseline/--current` must be paired and are required for submitted owner input. Omit `--out` for stdout. Paths must be safe-relative. Refused/errors exit 1; other states exit 0, including deferred missing-owner input.

### docs html-authoring-verify

```sh
hia docs html-authoring-verify --request html-authoring-request.json --out reports/html-authoring.json
```

中文。必填 `--request`，可选 `--out`，安全相对路径。请求须含精确交接、源码注释投影和显式绑定，不按字符串形式猜关联。accepted0、其它结果或错误1，省略输出则 stdout JSON。

English. Requires `--request`, optionally `--out`, using safe-relative paths. Requests contain an exact handoff, source-comment projection, and explicit binding. Associations require explicit evidence. Accepted exits 0; other results/errors exit 1. Omit output for JSON on stdout.

### docs coordinate-verify

```sh
hia docs coordinate-verify --coordinate-profile coordinate.json --ordinary-map generated.js.map --doc-source-map documentation-map.json --source source.ts --source-id source:sample --source-index 0 --entry-id entry:sample --line 1 --column 1 --column-unit utf16-code-unit
```

中文。`--source` 仅在获准读取时提供，可省略得到安全未核结果；非嵌套 section 地图另须 `--section-index`。其余示例选项必填。line/column 从1开始，source-index/section-index 从0开始。column-unit 为 utf16-code-unit、unicode-code-point 或 byte。所有文件须安全相对且实际路径在调用目录内。始终 stdout JSON，无输出文件选项；exact-anchor0、安全未核/最近锚点2、无效输入1。

English. Supply optional `--source` only with read authorization; omission yields safe unverified output. Non-nested section maps additionally require `--section-index`. Other shown options are required. Lines/columns are one-based, source/section indexes zero-based. Column units are utf16-code-unit, unicode-code-point, or byte. Files must be safe-relative and resolve within cwd. Always emits JSON to stdout. Exact-anchor exits 0, safe unverified/nearest-anchor exits 2, invalid input exits 1.

### browser panel

```sh
hia browser panel --project-manifest hia-project.json --project-index site/project-index.json --out panel
```

中文。`--project-manifest` 或配置 docs.projectManifest 必须选定项目，并含至少一个有效 doc-source-map 输入。可选 `--config`、`--project-index`、`--out`，project-index 用于关系图数据，省略该参数仍可生成基本面板。CLI 路径相对调用目录，配置路径相对配置目录，默认输出 dist/browser-panel。写静态 HTML/JS/JSON，成功0、无地图或其它错误1。

English. Select a project with `--project-manifest` or config docs.projectManifest, including at least one valid doc-source-map input. Optional flags are `--config`, `--project-index`, and `--out`. project-index adds relation-graph data and is optional for a basic panel. CLI paths use cwd and configured paths the config directory. Output defaults to dist/browser-panel. Writes static HTML/JS/JSON. Success exits 0, missing maps or other errors exit 1.
