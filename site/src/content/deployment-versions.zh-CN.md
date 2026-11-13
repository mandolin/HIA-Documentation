---
title: "构建与版本保留"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# 构建与版本保留

先在专用暂存目录构建，再核内容、语言、源码策略与产物清单，最后发布完整站点工件。保留构建来源、生成器/主题版本、实际文件与摘要；不要把本机临时目录或凭据放入公开工件。

正常发布先用主仓reference:build、reference:pages及对应检查生成当前技术参考，再构建官网并装配完整站点。主站根目录提供中文官网，根versions.json采用`hia-site-version-index@2.0.0`。兼容参考站的[原技术索引](https://mandolin.github.io/HIA-Documentation-Legacy/versions.json)保留旧身份，相对地址按该索引的响应URL解析；主站current/与releases/技术深链继续可用。

正常装配分别核当前参考和选定兼容快照的来源、索引及摘要。完整操作、目标提交检查和成功工件恢复流程见[官网构建与恢复说明](https://github.com/mandolin/HIA-Documentation/blob/main/site/README.md)。

产品文档保留最新稳定版，旧大版本各保留最后一版封版。顶部版本下拉是主入口，历史总页辅助；显示精确版本与维护状态。尚无旧大版本时明确空状态，不捏造历史条目。package版本和工件契约不能直接充当系统文档版本。

切换尽量保留语言与主题。目标缺页、缺译或小节变化时明确提示，并保留目录与返回入口；不静默切到最新版。版本正文、代码参考与静态资产一起绑定，避免旧正文使用不匹配的新脚本。

大项目采用逐文件写入和有界源码片段，但输入/索引仍随规模增长。发生预算错误时减小片段、分拆构建或减少公开范围；不通过扩大源码授权来修性能。回滚采用已保留且身份完整的站点工件，并按原验证流程核对根入口、旧链、语言、版本与机器投影。

## 权威参考

下列技术参考保留其实际语言；本页译文不表示所有链接正文均已有对应译文。

- [docs/project-build-memory.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-build-memory.md)
- [docs/public-reference-build.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/public-reference-build.md)
- [docs/reference-operations.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/reference-operations.md)
- [docs/reference-pages.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/reference-pages.md)
- [docs/versioning.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/versioning.md)
