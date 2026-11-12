---
title: "参考资料的使用方式"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Reference</p>

# 参考资料的使用方式

先确定所用包、配置与工件的精确版本，再查对应权威参考。CLI参数、默认值、诊断代码和Schema分别由原维护包负责，本页提供入口而不手写第二份完整定义。

## 文档构建

```sh
hia docs build --input <工件> --out <目录> --locale <语言>
```

| 参数 | 用途 |
| --- | --- |
| `--input` | 已生成且兼容的HIA文档工件 |
| `--out` | 本次文档构建的专用输出目录 |
| `--locale` | 本次渲染语言，例如 `zh-CN` 或 `en` |

此命令结构需要替换占位参数并使用已安装的兼容CLI。多输入聚合使用项目清单入口，详见下列权威参考。

## 命令路径

`@hia-doc/cli` 提供 `hia` 命令。当前源码文档对应协调中的 1.0.0 候选，安装版本可用 `npm list @hia-doc/cli --depth=0` 核对。安装方式、参数、路径基准、默认值、输出副作用及退出码见随包使用指南的对应章节。完整指南含中英文正文。[安装与版本选择](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#installation-routes)

| 命令 | 用途 |
| --- | --- |
| [`hia docs build`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-build) | 构建单工件或聚合项目文档 |
| [`hia docs theme-assets`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-theme-assets) | 写出共享主题资源 |
| [`hia docs evidence`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-evidence) | 从项目文档生成证据摘要 |
| [`hia docs acceptance`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-acceptance) | 核验目标项目验收证据 |
| [`hia docs continuity`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-continuity) | 比较基线与当前连续性证据 |
| [`hia docs adoption-kit`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-adoption-kit) | 生成负责人采用套件 |
| [`hia docs business-flow-handoff`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-business-flow-handoff) | 生成业务流程文档交接 |
| [`hia docs enterprise-workflow`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-enterprise-workflow) | 编排企业负责人采用与连续性报告 |
| [`hia docs html-authoring-verify`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-html-authoring-verify) | 核验HTML编写交接与来源投影 |
| [`hia docs coordinate-verify`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-coordinate-verify) | 核验跨地图坐标与源码字节证据 |
| [`hia browser panel`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#browser-panel) | 生成来源关联的静态浏览器面板 |

可在本站手册搜索中输入完整命令名称，找到本页目录，再进入对应权威章节。各项结果状态与退出码由对应命令说明定义。

## 资源参考分区

资源参考按内容职责分站发布，每个分区有独立的目录和检索范围。先按完整名称选择分区，再查具体导出与精确契约版本。界面提供中英文，JSON原文及其来源范围按实际输入保留。

| 资源分区 | 内容 |
| --- | --- |
| [核心文档、来源与生产器模式](https://mandolin.github.io/HIA-Documentation-Resources-Core/schemas/core-and-source/zh-CN/) | 核心文档、源码映射、来源证据及生产器的11项公开JSON导出 |
| [TypeScript文档提取及桥接模式](https://mandolin.github.io/HIA-Documentation-Resources-Core/schemas/typescript-documentation/zh-CN/) | TypeScript文档提取及桥接的8项公开JSON导出 |
| [文档化配置规范](https://mandolin.github.io/HIA-Documentation-Resources-Applications/profiles/zh-CN/) | `@hia-doc/profiles`的15项公开JSON导出 |
| [业务流程、语言、呈现与质量模式](https://mandolin.github.io/HIA-Documentation-Resources-Applications/schemas/business-localization-presentation-and-quality/zh-CN/) | 业务流程、语言、呈现与质量的11项公开JSON导出 |

各分区的语言及版本入口保留当前分区，“代码文档”栏目连接核心API总入口。插件开发工具包的两项JSON资源随核心API发布，以上四分区另覆盖45项资源。系统版本与各资源内声明的契约版本分别核对。

<div id="html文档工具"></div>

## HTML与CSS文档工具

| 入口 | 阅读范围 |
| --- | --- |
| [HTML文档工具包API](https://mandolin.github.io/HIA-Documentation-API-HTML/zh-CN/) | HTML解析、注释提取、适配、源码映射、Custom Elements Manifest转换及运行器/生产器/规范接口，包含当前与旧版schema、静态声明数据及完整源码，检索范围为本站 |
| [CSS文档工具包API](https://mandolin.github.io/HIA-Documentation-API-CSS/zh-CN/) | CSS解析、注释提取、适配、源码映射、设计令牌转换及运行器/生产器/规范接口，包含当前与旧版schema、静态声明数据和完整源码。按完整包名及原声明检索，范围为本站。 |

## DotNetDoc文档工具

| 入口 | 阅读范围 |
| --- | --- |
| [DotNetDoc文档工具包API](https://mandolin.github.io/HIA-Documentation-API-DotNetDoc/zh-CN/) | 六个DotNetDoc文档工具包的JavaScript运行时与TypeScript声明接口，包含C#源码提取、XML注释提取、适配器、运行器、生产器及规范的完整原生注释、签名、十六份当前/旧版JSON资源、静态声明数据、原生地图和完整源码。按完整包名与原声明检索，范围为本站。 |

## JavaScript文档工具与配置证据

| 完整名称 | 内容与检索范围 |
| --- | --- |
| [JavaScript文档工具包API](https://mandolin.github.io/HIA-Documentation-API-JavaScript/zh-CN/) | 运行器、生产器、插件、规范与主题的包接口，含新旧配置schema及静态声明数据；本站独立检索 |
| [JSDoc配置派生证据](https://mandolin.github.io/HIA-Documentation-Resources-JSDoc/derivation-evidence/zh-CN/) | 配置派生记录的来源、摘要与覆盖范围；本证据分区独立检索 |

两站均提供对应中英文入口、当前分区的系统文档版本选择和授权源码阅读。完整代码文件下载与页面源码片段分别提供，记录身份以原工件为准。

## 查找规则与契约

- 命令行：查看CLI README，区分单工件、JSDoc Integration和项目清单入口。
- 项目配置：查看configuration及配置包README；主题资源URL与读取权限分别验证。
- 项目清单：查看project-manifest-guide及迁移说明；字段省略、默认与显式null不是同一语义。
- 文档化配置规范：查看profile-authoring-guide、profile-composition与profile-distribution。按父规范声明顺序合并，后者覆盖前者，本地最后覆盖，共享祖先一次；循环保留明确拒绝。
- 核心契约：从contract-index选择精确版本与Schema，不修改旧稳定地址或用包版本推断wire版本。
- 来源坐标：查看range约定与普通source-map坐标证据。读取器、范围终点、列单位及实际字节证据分别承担职责；不能省略未知状态。
- 兼容迁移：查看compatibility-matrix和各包MIGRATION。只有显式、有效且无损的迁移结果才可写入；失败保留原输入。
- 诊断：按代码与severity分支，查看原owner定义和参数，不依赖译后文案匹配，也不把警告等同于成功。

原参考中的旧配置或旧quickstart可以继续用于对应旧包，但不能成为当前源码候选的默认指南。Schema校验不代替路径/权限/版本或运行时语义检查。

## 品牌颜色

主题通过文档配置传入。钴蓝用于HIA-Documentation-Sys品牌，其它宿主可指定自己的颜色：

```json
{"docs":{"theme":{"name":"default","colors":{"accent":"#0047AB"}}}}
```

这是 `hia.config.json` 的主题片段。完整配置与可用颜色token见配置参考。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [apps/cli/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/README.md)
- [docs/compatibility-matrix.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/compatibility-matrix.md)
- [docs/configuration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md)
- [docs/contract-index.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/contract-index.md)
- [docs/core-fixture-contract.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/core-fixture-contract.md)
- [docs/doc-source-map-options-and-results.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-options-and-results.md)
- [docs/doc-source-map-range-conventions.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-range-conventions.md)
- [docs/migration-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/migration-guide.md)
- [docs/ordinary-source-map-coordinate-profile.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ordinary-source-map-coordinate-profile.md)
- [docs/package-v1-migration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-v1-migration.md)
- [docs/profile-authoring-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-authoring-guide.md)
- [docs/profile-composition.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-composition.md)
- [docs/profile-distribution.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-distribution.md)
- [docs/project-manifest-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-guide.md)
- [docs/project-manifest-migration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-migration.md)
- [docs/schema-distribution.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/schema-distribution.md)
- [docs/security-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/security-policy.md)
- [packages/config/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/config/README.md)
- [packages/core/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/core/README.md)
