---
title: "扩展与维护HIA"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Developer documentation</p>

# 扩展与维护HIA

## 责任边界

核心模型与协议提供文档共同语义；领域解析器和适配器解释各自输入；生产器负责显式提取与工件；渲染器组织阅读输出。核心不反向依赖某一特定JSDoc主题。VS Code、语言服务器和其它宿主在各自边界消费能力，构建成功不代表真实宿主交互已验收。

本地开发在实际维护仓库进行。主仓按其锁文件与packageManager准备，卫星仓按自身说明准备；不要给工作区容器新增跨仓库依赖管理。可公开贡献说明应指向原owner，源码候选、发行材料和最终包分别核验。

## 软件开发工具包

编写生产器时声明输入/输出种类、身份、版本和能力。软件开发工具包验证定义、请求与结果，但不提供模块发现、超时、事务、沙箱或自动回滚。执行可能写文件或调用宿主资源，必须由集成方授权。增量与watch能力不能凭声明就认为已实现。

## 来源与语义

适配器保留领域字段、字段级语言、诊断与来源，避免把完整说明压缩成摘要。生成式输入的一对多下游节点应保持上游语义及映射。新增公开接口和关键流程使用对应语言可识别的中英双语注释。

## 文档与验证

渲染器扩展从已支持的主题与输出选项开始，保持内容与权限不变。共享资源有显式唯一写入者；写入失败的已生成文件不自动回滚，使用暂存输出。贡献前查看许可证、依赖审计与对应测试说明；敏感问题通过维护者私下渠道报告，不放进公开示例。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [hia-dotnetdoc/packages/dotnetdoc-producer/README.md](https://github.com/mandolin/hia-dotnetdoc/blob/main/packages/dotnetdoc-producer/README.md)
- [docs/adapter-authoring-notes.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/adapter-authoring-notes.md)
- [docs/ci.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ci.md)
- [docs/default-theme-api.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/default-theme-api.md)
- [docs/dependency-license-audit.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/dependency-license-audit.md)
- [docs/documentation-producers.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-producers.md)
- [docs/ide-integration-boundary.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ide-integration-boundary.md)
- [docs/ide-usage.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ide-usage.md)
- [docs/package-candidates.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-candidates.md)
- [docs/release-governance.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/release-governance.md)
- [docs/security-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/security-policy.md)
- [docs/shared-theme-assets.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/shared-theme-assets.md)
- [docs/user-acceptance-checklist.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/user-acceptance-checklist.md)
- [packages/core/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/core/README.md)
- [packages/plugin-sdk/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/plugin-sdk/README.md)
- [packages/renderer-html/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/renderer-html/README.md)
- [README.md](https://github.com/mandolin/HIA-Documentation/blob/main/README.md)
