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
      "includeThemeAssets": true
    },
    "source": {
      "presentation": "link",
      "linkBaseUrl": "https://github.com/example/project/blob/main"
    }
  }
}
```

`split-site` 的 `index.html` 只包含应用壳。导航分支、搜索索引、关系图和节点卡片分别位于 `navigation/`、`search/`、`relations/` 与 `entries/`，由浏览器按需读取。它必须通过 HTTP(S) 静态服务器访问，不能直接用 `file://` 获得完整功能。

`single-page` 仍可用于兼容、小型文档或离线快照，但会把全部节点卡片写进同一个 HTML，不适合数千节点项目。

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
| `link` | 默认策略。输出定位与外链，不把源码正文写入文档。 |
| `embed` | 显式把源码片段写入对应 `entries/*.html`；适合受控的私有/本地文档。 |
| `fetch` | 节点打开后仍不加载源码；用户再点“加载源码”时，从 `fetchBaseUrl` 动态读取纯文本。 |

### GitHub 或仓库链接

```json
{
  "docs": {
    "source": {
      "presentation": "link",
      "linkBaseUrl": "https://github.com/mandolin/HIA-ASPNETPortal/blob/main"
    }
  }
}
```

例如 DotNet source relation 提供 `src/Portal.Components/PortalSecurity.cs:12-24` 后，会生成指向相应 `.cs` 行号的链接，不再使用 XML documentation 文件作为最终源码入口。

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

`localRoot` 相对配置文件解析。CLI 拒绝绝对 locator 和 `..` 越界路径。`embed` 会让源码正文进入发布产物；公开发布前应运行 release/privacy gate，并确认目标项目允许公开对应源码。

### 动态读取 URL

```json
{
  "docs": {
    "source": {
      "presentation": "fetch",
      "fetchBaseUrl": "https://raw.githubusercontent.com/example/project/main",
      "linkBaseUrl": "https://github.com/example/project/blob/main",
      "maxLines": 400
    }
  }
}
```

`fetchBaseUrl` 必须返回纯文本源码，并允许文档站来源通过 CORS 读取。GitHub `blob` 页面不能作为 `fetchBaseUrl`；应使用 raw URL 或目标项目自己的受控源码服务。

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
| `docs.source.presentation` | `"none"` / `"link"` / `"embed"` / `"fetch"` | 源码呈现策略，默认 `link`。 |
| `docs.source.linkBaseUrl` | string | 仓库或浏览器源码链接基础 URL。 |
| `docs.source.fetchBaseUrl` | string | `fetch` 模式必填的纯文本源码基础 URL。 |
| `docs.source.localRoot` | string | `embed` 模式读取源码的本地根目录。 |
| `docs.source.defaultExpanded` | boolean | 嵌入源码是否默认展开。 |
| `docs.source.maxLines` | positive integer | 单个源码片段最大行数。 |
| `docs.source.enabled` / `mode` / `baseUrl` | compatibility | 旧版兼容字段；新配置优先使用 `presentation` 与 `linkBaseUrl`。 |

校验错误使用共享 `HiaDiagnostic` 结构，包含稳定的 `code`、`severity`、`targetPath` 和可选机器可读 `data`。

## 后延事项

- `hia.config.ts`
- 多层配置合并
- watch/dev server 配置
- 主题 skin 的完整机制
- IDE 专属界面设置
