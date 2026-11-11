# 卫星 JavaScript 包的公开 API 生成

`scripts/prepare-satellite-package-apis.mjs` 为显式首方卫星包准备原生 JSDoc 工件、公开声明文档、聚合作用域及授权源码镜像。它供参考站构建脚本调用，返回标准项目清单输入。

English summary — This build helper runs native JSDoc for explicitly selected first-party satellite JavaScript packages, preserving native artifacts and preparing scoped public declarations and explicitly authorized source files for the standard `hia docs build` command.

## 支持范围

包必须登记于必要包输入清单，实际 Git 来源、包名、版本和物理归属通过审核。支持 `.mjs`、`.cjs`、`.js` 的直接导出、包内重导出、默认导出别名和 CommonJS 入口。每条公开入口由独立静态审核解析到唯一原声明，同一物理源按作用域合并，公开绑定记录逐项保留。

混合包中的模块、JSON资源和命令分别登记。`prepared.remainingEntries` 返回资源和命令清单，`prepared.rows[].publicBindings` 保留模块路径、公开名称与原声明。公开嵌套成员通过原声明关联工具及相应数据投影另行核验，静态读取的数组/描述符采用已确认的声明范围。

公开绑定通过独立静态导出审核与原生 JSDoc 的名称、路径和声明行匹配。选中文档保留原生符号 ID、公开根的文档后代及必要祖先。每个保留节点必须具备完整的中英文文本，函数和类必须具备原生签名。缺失或歧义会使准备失败。

## 调用

先构建核心包，并安装工作区中的 JSDoc 生产器与官方插件。`workspaceRoot` 应包含已登记的 `HIA/` 卫星仓库，`runtimeRoot` 必须是本主仓 `dist/` 下新建的独占普通目录。

```js
import {prepareSatellitePackageApis} from "./scripts/prepare-satellite-package-apis.mjs";

const prepared = await prepareSatellitePackageApis({
  packageNames: ["@hia-doc/jsdoc-preset"],
  workspaceRoot,
  runtimeRoot,
  publicSources: ["HIA/hia-jsdoc/packages/jsdoc-preset/src/index.mjs"]
});
```

`publicSources` 必须与本次实际选中的原声明来源精确对应，包括重导出指向的包内定义文件。源码读取受真实路径、普通文件、硬链接数量、4 MiB 字节预算和严格 UTF-8 校验约束。构建会在结束时重核全部输入字节、清单与入口。

将 `prepared.inputs` 写入 `runtimeRoot` 中的 `schemaVersion: "1.1.0"` 项目清单。每个模块的 `identityScope` 来自已核包归属与原始路径。随后调用正常命令。

语义导航使用既有仓库、完整包名与模块分组。默认别名列入模块标签，阅读器索引同时检索这些已审标签，发现后进入原规范条目。

```powershell
hia docs build --project-manifest <runtimeRoot/project.json> --config <locale-config.json> --site-navigation <navigation.json> --out <site-dir> --locale zh-CN
```

`prepared.configPath` 指向源码镜像配置。可通过 `preparePublicReferenceLocaleConfig` 派生中英文配置，沿用条目分页、惰性加载、钴蓝主题和 400 行预览。

## 交付与来源

`prepared.files` 列出应随每种语言站点保留的原生 integration、原地图、原生核心文档和公开投影。完整原生生产目录与 `prepared.nativeResults` 列出的原生回执在运行目录保留，其中包含实际生成的辅助 HTML、样式和字体。聚合输入启用公开投影与地图。宿主投影回执使用独立的 `satellite-api-projection` 身份，原生生产回执保留真实生产器身份。

各工件的实际契约版本分别保留，适配生成的核心文档采用 `1.0.0`。此输入没有附加旧 JSDoc profile 的版本声明。

`assertSatelliteApiEntries` 可逐项检查实际项目索引中的作用域、符号 ID、签名、全部双语字段、父项、源码预览范围和地图范围。源码预览沿用原生 `primaryBlock`，完整声明范围另在原地图中保留，两者分别校验。

容量核验应同时计入交互页、静态页、导航、全部机器工件、授权源码资产和完整源文件下载。页面预览沿用实际来源范围与400行上限。完整源文件使用单独的摘要清单记录，生成数据快照标明其来源与推导证据。

输出准备失败时可能留下部分运行目录，生命周期由构建调用方管理。公开站点发布须使用站点自身的容量、路由与发布校验。
