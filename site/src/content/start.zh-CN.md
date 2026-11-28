---
title: 第一次使用
---
<!-- 中文：公开入门正文，命令基于已构建主仓，不暗示源码候选已发布。 English: public first-steps article; commands use a built checkout, without claiming source candidates are published. -->

<p class="eyebrow">Get started</p>

# 第一次使用

从一份公开HIA文档工件开始，构建可阅读的文档。

<div class="notice"><strong>适用版本 1.0.0</strong><p>先确认 npm 中的正式版本可用，再按下方说明安装。旧项目升级请先阅读迁移参考。</p></div>

<h2 id="input">1. 准备输入</h2>

学习帮助完成任务，参考给出精确规则，开发文档解释扩展与维护，代码文档展示实际生成的接口与来源。已有工件可以跳过源码提取。

主仓源码环境使用Node.js 22.23.4或24.22.1及pnpm 10.34.4，其它包以自身engines为准。按[仓库说明](https://github.com/mandolin/HIA-Documentation#readme)安装锁定依赖并构建。使用归档时核对精确版本、依赖和运行要求。

在新目录用 `npm install --save-exact @hia-doc/cli@1.0.0` 安装正式命令行工具。下载[公开示例工件](https://github.com/mandolin/HIA-Documentation/blob/3b72ce3205fb07c534f5f9055398958a9661eef6/fixtures/basic.hia.json)为 `basic.hia.json`。有自己的 HIA 工件时，直接使用实际文件。

<h2 id="build">2. 构建文档</h2>

从安装了命令行工具并保存示例工件的目录运行：

<div class="code-box"><div class="code-label"><span>命令示例 · 已安装的命令行工具</span><button class="copy js-only" data-copy>复制</button></div><div class="code-scroll"><pre><code>npm exec --offline -- hia docs build --input basic.hia.json --out dist/docs-preview --locale zh-CN</code></pre></div><span class="copy-status" aria-live="polite"></span></div>

命令不可用时用 `npm ls --depth=0 @hia-doc/cli` 核对组件。依输入的实际契约参考[迁移参考](../deployment-versions/#upgrade)，保留诊断，不手改版本号冒充迁移。

<h2 id="read">3. 阅读与检查</h2>

打开输出目录的index.html，核对函数签名、说明、参数和返回内容。把locale改为en，再检查实际字段语言。构建成功不代表源码定位已核验；公开前审查输入，避免泄漏私有路径、凭据或内部注释。

<h2 id="next">下一步</h2>

源码项目先选择[对应领域路径](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-producers.md)；多输入聚合查[配置参考](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md)。多页使用项目清单，直接单工件入口仍为单页。

[运行时与兼容性](https://github.com/mandolin/HIA-Documentation/blob/main/docs/compatibility-matrix.md) · [包候选与归档](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-candidates.md)
