---
title: "四域文档入门"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# 四域文档入门

以下配置面向当前源码候选。先准备同一批依赖、构建结果与公开小样本，再运行对应已安装命令。旧发行包不一定读取当前1.0.0配置，必须使用该归档对应的指南；旧格式保持精确读取，迁移使用明确API，不只替换schemaVersion。

## JavaScript

hia-jsdoc运行器接受显式源码输入，JSDoc插件处理注释，主题提供独立输出。新配置可从以下内容开始：

~~~json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/hia-jsdoc","inputs":[{"kind":"javascript-module","path":"src"}]}
~~~

~~~sh
hia-jsdoc --config hia-jsdoc.config.json
~~~

使用普通JSDoc配合canonical @lang和inline `<lang>`表达字段双语。检查独立页及生成的Integration工件；进入统一Portal时通过CLI的--jsdoc-integration入口消费。独立主题产物和HIA渲染器产物分别验证。

首次准备插件和主题时，按[独立JSDoc与Integration生成指南](https://github.com/mandolin/HIA-Documentation/blob/main/docs/published-jsdoc-usage.md)选择实际可用发行版本或匹配源码归档，在独立样本项目安装。指南包含完整配置和摘要、参数、返回的canonical双语示例；输出后逐字段核对两个语言。

## HTML与CSS

HTML运行器接受html等已声明输入；CSS运行器接受css、postcss-css与design-token等已声明输入，不执行任意模板或浏览器代码。最小当前配置分别为：

~~~json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/htmdoc","inputs":[{"kind":"html","path":"src/index.html"}]}
~~~

~~~json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/cssdoc","inputs":[{"kind":"css","path":"src/components.css"}]}
~~~

~~~sh
htmdoc --config htmdoc.config.json
cssdoc --config cssdoc.config.json
~~~

核对提取工件、HIA文档、源码映射及生产器结果。默认不嵌入源码；HTML/CSS的地图和结果选项以各运行器参考为准，不把一种领域的默认值套到另一种领域。

HTML片段应选择`html-fragment`；完整文档使用`html`。首次提取与聚合按[HTML源码生成及项目输出指南](https://github.com/mandolin/HIA-Documentation/blob/main/docs/unified-html-demo.md#generate-from-html-source)执行，原Alert片段的英文说明按实际输入显示。声明中文界面或项目语言不会自动补出译文。

CSS首次生成按[CSS提取及统一输出指南](https://github.com/mandolin/HIA-Documentation/blob/main/docs/cssdoc-quickstart.md)准备匹配八包、原CSS和HIA/地图输入，逐项检查组件、选择器、自定义属性、修饰符、令牌说明与源码定位。原样本说明为英文；需要源码片段时，分别显式设置提取与呈现策略，并确认公开许可。

## C#/.NET/ASP.NET

编译器生成的XML文档是基础输入；C#源码、项目结构与ASP.NET表面输入按需追加。需要Roslyn源码能力时使用当前.NET 10工具链；不要求为了读取XML而运行旧业务工程。

~~~json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/dotnetdoc","inputs":[{"kind":"dotnet-xml-doc","path":"xml-doc/Sample.xml"}],"options":{"writeDocSourceMapArtifact":true}}
~~~

~~~sh
hia-dotnetdoc --config dotnetdoc.config.json
~~~

检查summary、remarks、参数、类型参数、返回、异常及签名。XML单独输入不提供真实C#位置证明；只有唯一匹配的成员和经核对的声明范围才可呈现相应源码关系。源码映射选项当前默认false，这里的true是显式启用；没有来源许可时不公开源码。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [hia-cssdoc/packages/cssdoc-runner/README.md](https://github.com/mandolin/hia-cssdoc/blob/main/packages/cssdoc-runner/README.md)
- [hia-cssdoc/README.md](https://github.com/mandolin/hia-cssdoc/blob/main/README.md)
- [hia-dotnetdoc/README.md](https://github.com/mandolin/hia-dotnetdoc/blob/main/README.md)
- [hia-htmdoc/packages/htmdoc-runner/README.md](https://github.com/mandolin/hia-htmdoc/blob/main/packages/htmdoc-runner/README.md)
- [hia-htmdoc/README.md](https://github.com/mandolin/hia-htmdoc/blob/main/README.md)
- [hia-jsdoc/README.md](https://github.com/mandolin/hia-jsdoc/blob/main/README.md)
- [docs/dotnetdoc-quickstart.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/dotnetdoc-quickstart.md)
- [docs/published-jsdoc-usage.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/published-jsdoc-usage.md)
