# HIA 配置 / HIA Configuration

`hia.config.json` 是 HIA 主工具链共享的项目与构建配置。`@hia-doc/cli`、后续 LSP 和 IDE 宿主应复用同一配置语义；它不属于核心文档 IR。

## 查找顺序

CLI 按以下顺序解析配置：

1. `hia docs build --config <file>`
2. 当前工作目录中的 `hia.config.json`
3. 内置默认值

配置文件内的相对路径以配置文件所在目录为基准；CLI 参数中的相对路径以进程工作目录为基准。CLI 参数优先于配置值。

## 统一项目站

大型统一文档站默认使用 `split-site`：

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "projectManifest": "hia.project.json",
    "output": "dist/docs",
    "locale": "zh-CN",
    "renderer": {
      "title": "Project Documentation",
      "projectLayout": "split-site",
      "uiLocale": "zh-CN",
      "informationArchitecture": {
        "contractVersion": "0.1.0-draft",
        "contentGrouping": "semantic-container",
        "loadingStrategy": "lazy",
        "memberPlacement": "with-parent"
      },
      "sourceCommentProjection": {
        "contract": "documentation-source-comment-projection",
        "contractVersion": "0.1.0-draft",
        "locale": "zh-CN",
        "contentPolicy": "none"
      },
      "includeThemeAssets": true
    },
    "theme": {
      "name": "default",
      "skin": "portal.classic",
      "scheme": "system"
    },
    "source": {
      "presentation": "fetch",
      "publicAssetPolicy": "explicit-public",
      "localRoot": ".",
      "fetchTrigger": "on-expand",
      "maxLines": 400
    }
  }
}
```

`split-site` 的 `index.html` 只包含应用壳。导航分支、搜索索引、关系图和节点卡片分别位于 `navigation/`、`search/`、`relations/` 与 `entries/`，由浏览器按需读取。它必须通过 HTTP(S) 静态服务器访问，不能直接用 `file://` 获得完整交互功能。禁用 JavaScript 时，入口页通过 `<noscript>` 指向 `pages/index.html`；`pages/` 还包含每个 topic 的独立原生 disclosure 页面，不会把数千节点重新内嵌进应用壳。默认 `fetch` 源码在这些页面中只降级为构建生成的同源内容寻址链接。

`single-page` 仍可用于兼容、小型文档或离线快照，但会把全部节点卡片写进同一个 HTML，不适合数千节点项目。

显式 `informationArchitecture` 只支持 `split-site`。它把内容分组、获取时机与 member 呈现拆成三个独立开关；未提供该对象时保留既有 P3 输出。`uiLocale` 当前只接受 `zh-CN` 或 `en`，并且只覆盖本轮触碰的 Portal labels，不替代 content locale 或 source-comment locale。

`sourceCommentProjection.locale` 必须是 canonical BCP 47 tag，并且不会从 `uiLocale` 或 `docs.locale` 推断。默认
`contentPolicy=none` 只显示 allowlisted metadata；`explicit-projected-text` 仍要求 producer projection 对同一 locale 显式
包含纯文本正文。该配置不创建 source reader，也不解析源码注释。

### 关系增强型 producer result

当一个 producer result 只用于补充 declaration/source relation，而规范 API 卡片已经由另一个输入提供时，应显式使用 `artifactPolicy: "relations-only"`：

```json
{
  "kind": "documentation-producer-result",
  "path": "dotnet-source-probe/dotnetdoc.producer-result.json",
  "domain": "dotnet",
  "artifactPolicy": "relations-only"
}
```

该策略会校验 producer result 并消费其中的关系 artifact，但不会把其中的 `hia-document` 再展开为第二套节点卡片。它目前只允许用于 `documentation-producer-result`；省略时等同于 `artifactPolicy: "all"`。

## 源码呈现

`docs.source.presentation` 支持四种策略：

| 值 | 行为 |
| --- | --- |
| `none` | 保留源码定位元数据，不输出源码链接、动态加载地址或源码正文。 |
| `link` | 输出指向构建生成的同源内容寻址纯文本资源的普通链接。 |
| `embed` | 显式把源码片段写入对应 `entries/*.html`；适合受控的私有/本地文档。 |
| `fetch` | 默认策略。从构建生成的同源内容寻址资源读取纯文本；展开时加载，也可配置为按钮触发。 |

`fetch` 与 `link` 共享同一 public asset pipeline：输出 `sources/{sha256}.txt`、content revision、SHA-384、byte/line
facts 与局部 `sources/*.txt -text` 规则。reader 固定 `credentials=omit`、`mode=same-origin`、`redirect=error`，校验
摘要和限额后只把正文作为文本显示。失败进入显式终态，不自动退回 `link` 或 `embed`。

### 构建生成的 fetch

```json
{
  "docs": {
    "source": {
      "presentation": "fetch",
      "publicAssetPolicy": "explicit-public",
      "localRoot": ".",
      "fetchTrigger": "on-expand",
      "maxLines": 400
    }
  }
}
```

producer 已经携带的 preview 可直接进入构建；CLI 要从 locator 读取文件时，必须另有
`publicAssetPolicy: "explicit-public"`。`localRoot` 相对配置文件解析；locator 必须是根内安全相对路径。未授权、越界、
缺失或超限都会产生稳定 diagnostic，presentation profile 标记为 `refused`，但不会泄漏绝对路径或改用外部 URL。

将 `presentation` 改成 `link` 会生成同一类同源静态资源，只把源码卡片呈现为普通链接；它不会恢复旧 GitHub/blob 外链。

### 显式嵌入

```json
{
  "docs": {
    "source": {
      "presentation": "embed",
      "localRoot": ".",
      "defaultExpanded": false,
      "maxLines": 400
    }
  }
}
```

`localRoot` 相对配置文件解析。CLI 拒绝绝对 locator 和 `..` 越界路径。CLI 文件读取同样要求
`publicAssetPolicy: "explicit-public"`；`embed` 会让源码正文进入 entry HTML，公开发布前应运行 release/privacy gate 并确认
对应源码允许公开。

`fetchTrigger` 支持：

- `on-expand`：默认值。用户展开源码小三角时立即加载。
- `manual`：展开后显示“加载源码”按钮，点击后才加载。

当 locator 只有起始行而没有结束行时，CLI preparation 从起始行开始，最多发布 `maxLines` 行；reader 也独立执行同一显示
上限。精确 symbol 结束范围仍应由对应 doc line/source extractor 提供。

`fetchBaseUrl`、`linkBaseUrl` 与兼容 `baseUrl` 已停止提供 Portal endpoint。显式配置它们会得到
`HIA_CONFIG_SOURCE_FETCH_BASE_UNSUPPORTED` 或 `HIA_CONFIG_SOURCE_LINK_BASE_UNSUPPORTED`，避免配置被静默忽略。

## Portal 主题

默认主题提供三套 Portal-owned skin，并与 scheme 正交：

| 字段值 | 含义 |
| --- | --- |
| `portal.classic` | 中性经典布局，默认 skin。 |
| `portal.graphite` | 更紧凑、低圆角的石墨风格。 |
| `portal.lumen` | 较宽松、高圆角的明亮暖色风格。 |
| `system` | 跟随 `prefers-color-scheme`，默认 scheme。 |
| `light` / `dark` | 固定浅色或深色。 |

HTML 根节点在脚本运行前就带有构建默认，因此禁用 JavaScript 仍可阅读。页面选择器可把本地阅读偏好保存到浏览器，但该
偏好不进入 `documentation-presentation-profile.json`、renderer manifest、project/search index 或 semantic IR。

## 字段

| 字段 | 类型 | 当前行为 |
| --- | --- | --- |
| `schemaVersion` | string | 提供时必须为 `0.1.0`。 |
| `docs.input` | string | 单一 HIA document JSON 输入。 |
| `docs.projectManifest` | string | 统一项目文档 manifest；与 `docs.input` 互斥。 |
| `docs.output` | string | 输出目录。 |
| `docs.locale` | string | 初始显示语言。 |
| `docs.locales` | string[] | 共享工具链的 locale 检查集合。 |
| `docs.manifest` | string | 输出目录内的 manifest 路径；拒绝绝对路径和父级穿越。 |
| `docs.renderer.title` | string | 覆盖 HTML 与输出 manifest 标题。 |
| `docs.renderer.includeThemeAssets` | boolean | 是否输出默认主题 CSS/JS。 |
| `docs.renderer.projectLayout` | `"split-site"` / `"single-page"` | 项目站输出布局，默认 `split-site`。 |
| `docs.renderer.uiLocale` | `"zh-CN"` / `"en"` | Portal UI labels；缺省跟随已解析 content locale。 |
| `docs.renderer.informationArchitecture.contentGrouping` | `"entry"` / `"semantic-container"` | 内容呈现边界，默认 `entry`。 |
| `docs.renderer.informationArchitecture.loadingStrategy` | `"lazy"` / `"eager"` | fragment 获取策略，默认 `lazy`。 |
| `docs.renderer.informationArchitecture.memberPlacement` | `"separate"` / `"with-parent"` | member 呈现位置，默认 `separate`。 |
| `docs.renderer.sourceCommentProjection.locale` | canonical BCP 47 string | 独立 source-comment locale；启用时必须同时提供显式 IA。 |
| `docs.renderer.sourceCommentProjection.contentPolicy` | `"none"` / `"explicit-projected-text"` | 注释正文授权，默认 `none`；只接受已投影纯文本。 |
| `docs.theme.skin` | `"portal.classic"` / `"portal.graphite"` / `"portal.lumen"` | 构建期无脚本默认 skin。 |
| `docs.theme.scheme` | `"system"` / `"light"` / `"dark"` | 构建期无脚本默认 scheme。 |
| `docs.source.presentation` | `"none"` / `"link"` / `"embed"` / `"fetch"` | 源码呈现策略，默认 `fetch`。 |
| `docs.source.publicAssetPolicy` | `"none"` / `"explicit-public"` | CLI 文件读取与公开静态资源授权；默认 `none`。 |
| `docs.source.linkBaseUrl` / `baseUrl` | deprecated string | 外部 link endpoint 已不支持；提供时返回迁移错误。 |
| `docs.source.fetchBaseUrl` | deprecated string | 外部 fetch endpoint 已不支持；提供时返回迁移错误。 |
| `docs.source.fetchTrigger` | `"on-expand"` / `"manual"` | fetch 加载触发方式，默认 `on-expand`。 |
| `docs.source.localRoot` | string | 显式公开授权下读取安全相对源码的本地根目录。 |
| `docs.source.defaultExpanded` | boolean | 嵌入源码是否默认展开。 |
| `docs.source.maxLines` | positive integer | 单个源码片段最大行数。 |
| `docs.source.enabled` / `mode` | compatibility | 旧版关闭状态兼容字段；新配置使用 `presentation`。 |

校验错误使用共享 `HiaDiagnostic` 结构，包含稳定的 `code`、`severity`、`targetPath` 和可选机器可读 `data`。

## 后延事项

- `hia.config.ts`
- 多层配置合并
- watch/dev server 配置
- 第三方 theme marketplace 与用户自定义 token package
- IDE 专属界面设置
