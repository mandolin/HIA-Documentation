---
title: "从真实生成结果查接口"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# 从真实生成结果查接口

代码文档由HIA自身生成，不从手写概览拼出签名。正文需要显示实际接口的说明、签名、参数、类型参数、返回、异常、示例及来源；具体字段是否存在以源注释和领域工件为准，不生成不存在的语义。

先选系统文档版本，再确认包身份、源提交与生成器/主题版本。核心/工具包、JavaScript、HTML、CSS和.NET各有来源入口；同一页面外观不表示它们使用相同提取规则。JSDoc独立输出与统一Portal应各有可直接进入的链接。

API覆盖必须按包的公开导出清单和实际生成符号逐项对应。生产器能处理一个HTML、CSS或.NET样本，只证明该样本路径有输入；不证明相应工具包自身API已进入站点。依赖被安装也不代表其公开接口已被提取。

.NET文档既包括从C#/XML输入生成的业务API，也包括DotNetDoc工具包的JavaScript API。两者不要混为一套覆盖证明。站点应标明各自生成范围及未映射条目。

需要追溯时检查来源版本、许可、摘要与范围。未提供或未核验仍可阅读API正文，不将XML行号伪称C#行号，不恢复被排除的外部源码地址。手册中的命令、概念与生成代码参考互相链接，权威定义继续由原包维护。

## 生成参考入口

- [JavaScript文档工具包API](https://mandolin.github.io/HIA-Documentation-API-JavaScript/zh-CN/)提供文档运行器、生产器、插件、规范与主题的包接口，包含配置schema及静态数组/描述符数据。目录按完整包名和原声明分组，检索范围为本站。
- [JSDoc配置派生证据](https://mandolin.github.io/HIA-Documentation-Resources-JSDoc/derivation-evidence/zh-CN/)逐值呈现配置派生记录、来源、摘要与覆盖信息。记录的实际生产或静态推导身份由原工件声明，检索范围为证据分区。

- [HIA 十三核心包 API · 中文](https://mandolin.github.io/HIA-Documentation-API/zh-CN/) · [English](https://mandolin.github.io/HIA-Documentation-API/en/)提供十三核心包的模块参考及插件开发工具包的两项JSON资源。另45项资源按完整名称列于[资源参考分区](../reference/#资源参考分区)，覆盖核心与来源、TypeScript文档、文档化配置规范以及业务流程等四个分区。命令路径也在参考手册中列出，卫星工具包按各自范围接入。

- [HIA统一生成参考 · 中文](../../../zh-CN/)：现有公开工件，包含样本与工具参考，不代表所有必要包均已覆盖。
- [HIA统一生成参考 · English](../../../en/)：保留输入中的实际字段语言。
- [BP/bp-docs-js-cookie · 接口Portal](https://mandolin.github.io/bp-docs-js-cookie/)：首个JavaScript演示项目，独立于产品官网。
- [JSDoc独立输出与构建说明](https://github.com/mandolin/HIA-Documentation/blob/main/docs/published-jsdoc-usage.md)：按实际运行器与主题生成；不把统一Portal视为独立主题产物。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [hia-cssdoc/README.md](https://github.com/mandolin/hia-cssdoc/blob/main/README.md)
- [hia-dotnetdoc/packages/dotnet-source-extractor/README.md](https://github.com/mandolin/hia-dotnetdoc/blob/main/packages/dotnet-source-extractor/README.md)
- [hia-dotnetdoc/README.md](https://github.com/mandolin/hia-dotnetdoc/blob/main/README.md)
- [hia-htmdoc/README.md](https://github.com/mandolin/hia-htmdoc/blob/main/README.md)
- [hia-jsdoc/README.md](https://github.com/mandolin/hia-jsdoc/blob/main/README.md)
- [jsdoc-plugin-hia-sys/README.md](https://github.com/mandolin/jsdoc-plugin-hia-sys/blob/main/README.md)
- [jsdoc-theme-hia/README.md](https://github.com/mandolin/jsdoc-theme-hia/blob/main/README.md)
- [apps/cli/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/README.md)
- [docs/presentation-profile-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/presentation-profile-policy.md)
- [docs/public-api-surface.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/public-api-surface.md)
- [docs/public-reference-build.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/public-reference-build.md)
- [docs/published-jsdoc-usage.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/published-jsdoc-usage.md)
- [docs/unified-html-demo.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/unified-html-demo.md)
- [packages/core/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/core/README.md)
- [reference/public-reference-build.definition.json](https://github.com/mandolin/HIA-Documentation/blob/main/reference/public-reference-build.definition.json)
- [release/public-api-surface.json](https://github.com/mandolin/HIA-Documentation/blob/main/release/public-api-surface.json)
