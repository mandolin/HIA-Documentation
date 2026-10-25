# 共享主题资产与品牌颜色

多个独立文档构建可以共享同一份主题CSS/JavaScript。每次构建只写自己的输出目录；共享文件由显式的唯一写入者生成。
这些能力已随CLI `0.1.7`、HTML渲染器 `0.1.5`、默认主题 `0.1.3`和配置包 `0.1.6`发布。

树导航修复候选为 CLI `0.1.8`、HTML渲染器 `0.1.6`、默认主题 `0.1.4`；发行状态以 npm 对应版本为准。该补丁保留 `.hia-shell` 的 `--hia-tree-indent` 覆写点，默认 `.6rem`，并让深层标签与打开按钮分别换行。极深树在侧栏局部滚动，不扩大页面。相关源码公开授权配置没有变化。
处理.NET文档时，同时使用DotNetDoc运行器 `0.1.10`，以获得完整注释字段和可靠签名。

## 配置与命令

例如站点包含`site/half-a/zh-CN/`、`site/half-b/en/`等半边，公共资源位于`site/assets/`：

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "theme": {
      "scheme": "light",
      "colors": { "accent": "#0f4f82" },
      "assets": { "mode": "external", "baseUrl": "../../assets/" }
    }
  }
}
```

```sh
hia docs theme-assets --config hia.config.json --out site
hia docs build --config hia.config.json --project-manifest half-a.json --out site/half-a/zh-CN --locale zh-CN
hia docs build --config hia.config.json --input half-b.hia.json --out site/half-b/en --locale en
```

`theme-assets`必须显式提供`--out`，固定写入`assets/hia-default.css`和`assets/hia-default.js`，不生成页面。
`docs.theme.colors`由该资源生成命令和普通`docs build`共同消费；单文档和项目站的本地资产同样应用颜色覆盖。
共享模式下，文档构建不输出CSS/JavaScript副本，并按各HTML深度生成引用，包含无脚本页面。
`hia-manifest.json`只列本次构建拥有的文件，不把外部资源伪报为本次产物。

资源写入者与所有半边应采用同一份品牌配置。`baseUrl`相对于每次`--out`根解释，亦可使用`/docs/assets/`这样的站点根路径；
它只描述URL，不授权构建向父目录写文件。不同层级的半边需分别选择适当的相对URL。
默认`mode: "local"`保持原有输出方式；`includeThemeAssets: false`仍只控制是否随本次输出资源。

## 安全颜色与兼容性

允许的semantic token为`canvas`、`surface`、`surfaceMuted`、`border`、`text`、`textMuted`、`accent`、
`accentContrast`、`accentSoft`、`accentHover`、`focusRing`、`codeBackground`、`codeText`、`danger`。
值只接受`#RGB`、`#RGBA`、`#RRGGBB`、`#RRGGBBAA`，不接受CSS片段、`var()`或`url()`。
省略的token沿用内置palette，默认常量不会被修改。覆盖作用于所选palette；请复核自身颜色与所选scheme的对比度。

资源URL只允许同站相对或根相对目录；协议、远端地址、query、fragment和反斜杠会被拒绝。
不支持下载任意自定义CSS或自动修改宿主的样式文件。

程序调用可使用`getDefaultThemeAssets({ colors })`（主题包）或`renderThemeAssets({ colors })`（HTML渲染器），
两者只返回内存文件记录。两种HTML渲染函数的`themeAssets`选项接受相同资源路由：

```js
renderProjectHtmlDocument(project, {
  theme: { colors: { accent: "#0f4f82" }, skinId: "portal.classic", scheme: "light" },
  themeAssets: { mode: "external", baseUrl: "../../assets/" }
});
```

`renderHtmlDocument`接受相同的`theme`与`themeAssets`选项。`theme.skinId`和`theme.scheme`逐字段优先于
旧`projectSite.theme`，未提供的字段才回退旧选项；默认仍为`portal.classic`和`system`。
配置中的`docs.theme.name`可使用`default`或三个已实现皮肤名称，显式`docs.theme.skin`优先；未知名称会警告并回退，
不会加载任意主题提供者。颜色覆盖与皮肤、明暗模式独立；共享资源必须由使用相同颜色配置的唯一写入者生成。

## 完整 API 内容与分页

项目站的`entries/*.html`、`pages/*.html`、项目单页和显式信息架构条目页复用完整字段渲染：
主字段优先`description`，否则`summary`；其余非空字段各呈现一次，包括备注、参数、类型参数、返回、异常和未知扩展字段。
只有`summary`的符号不会重复显示主文；缺少翻译时保留既有回退标记，纯空字段不产生空块。字段正文和签名均作文本转义。

单个`--input`仍输出单页。需要多页时使用既有`--project-manifest`入口；直接单工件分页开关尚未实现。

## English summary

Run `hia docs theme-assets --config hia.config.json --out <site-root>` once to emit one branded CSS/JS pair.
Configure each independent build with `docs.theme.assets: { mode: "external", baseUrl: "../../assets/" }`.
References are relocated for every page depth; manifests list only locally owned files. URLs do not authorize parent-directory writes.
Colors are closed hex-valued semantic tokens consumed by both the explicit asset command and ordinary document/project builds.
Both renderers expose `theme: { colors, skinId, scheme }`; root selection takes per-field precedence over legacy `projectSite.theme`.
Project entry pages preserve all nonempty localized fields, including unknown extensions, with the primary field rendered once.
Direct single-artifact pagination remains unavailable; use the existing project-manifest route.
These additions are available in CLI `0.1.7`, renderer-html `0.1.5`, theme-default `0.1.3` and config `0.1.6`; use DotNetDoc runner `0.1.10` for .NET input.
