---
title: "聚合项目与保留语言语义"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# 聚合项目与保留语言语义

项目清单用于声明多份工件、生产器和导航语义。已有HIA工件、JSDoc Integration及生产器结果是不同输入种类；不能把任意JSON当作文档。当前项目清单1.0.0保留精确旧版读取，配置版本与包版本独立。

最小聚合示例中，api.hia.json必须是实际存在且兼容的文档工件：

~~~json
{"schemaVersion":"1.0.0","project":{"id":"project:sample","name":"Sample Documentation","defaultLocale":"zh-CN","locales":["zh-CN","en"]},"inputs":[{"kind":"hia-document","path":"api.hia.json","domain":"js"}]}
~~~

~~~sh
hia docs build --project-manifest hia-project.json --out dist/site --locale zh-CN
~~~

项目站默认多页。单工件命令、显式single-page与预加载模式仍有各自内存和输出语义；不要把它们当作同一分页开关。输入路径、公开标签和semanticPath必须满足清单规则，不能从本机绝对路径推断读者导航身份。

内容字段语言、站点界面语言和语言资源分别管理。源码中的canonical @lang与inline `<lang>`提供字段级文本；界面语言报告衡量实际消息输入，不是正文翻译证明。声明locales不自动生成译文，回退内容应明确标记。

生产器执行会加载声明的模块并可能写出工件；清单/请求校验不是沙箱或执行授权。使用明确输入与专用输出目录，按[来源安全](/HIA-Documentation/docs/zh-CN/learn/theme-source/)审查可公开材料。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [docs/documentation-locale-resource-contract.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-locale-resource-contract.md)
- [docs/documentation-source-comment-projection-contract.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-source-comment-projection-contract.md)
- [docs/project-manifest-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-guide.md)
- [docs/unified-html-demo.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/unified-html-demo.md)
