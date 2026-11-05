---
title: "品牌和来源阅读"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# 品牌和来源阅读

主题颜色通过docs.theme.colors配置，HIA-Documentation-Sys使用钴蓝#0047AB。颜色只接受支持的hex语义token，不接受任意CSS、var()或url()。主题皮肤、明暗模式与颜色覆写分别生效；品牌变化不改变接口内容或来源许可。

多个文档构建共享资源时，指定一个资源写入者；每个子构建只拥有自己的输出：

~~~json
{"schemaVersion":"0.1.0","docs":{"theme":{"colors":{"accent":"#0047AB"},"assets":{"mode":"external","baseUrl":"../../assets/"}}}}
~~~

~~~sh
hia docs theme-assets --config hia.config.json --out site
hia docs build --config hia.config.json --project-manifest hia-project.json --out site/api/zh-CN --locale zh-CN
~~~

baseUrl相对本次输出根解释。同站URL不授予向父目录写文件的权限；共享资源与子构建使用一致的主题配置。默认local模式仍各自生成资源。覆写颜色后检查实际明暗配色、对比度和强制颜色表现。

源码来源可以是定义位置、映射或公开片段；这些是不同证据。未提供、未授权、字节不匹配、坐标未核验和网络读取失败必须分别显示。XML路径不自动成为C#源码路径，普通source map的数值锚点也不自动证明与文档映射同一字符。

公开源码应来自明确许可的输入与实际版本，按策略核对摘要和范围。无权限时继续阅读文档正文，不恢复被过滤的外部地址。源码文本只展示、不执行；无脚本页面使用同源源码页与行号链接。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [docs/configuration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md)
- [docs/default-theme-api.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/default-theme-api.md)
- [docs/doc-source-map-query.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-query.md)
- [docs/presentation-source-plan.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/presentation-source-plan.md)
- [docs/security-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/security-policy.md)
- [docs/shared-theme-assets.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/shared-theme-assets.md)
