# HIA Documentation System .NET sample

中文。本样本用自有 `Envelope<T>` 演示真实 C# 编译、XML 文档、DotNetDoc 提取和 HIA 多页输出。它覆盖类型参数以及方法摘要、备注、参数、返回和异常七个独立双语字段。该领域样本与 HIA 工具包本身的 API 文档分别管理。

English. This first-party `Envelope<T>` sample demonstrates C# compilation, XML documentation, DotNetDoc extraction, and HIA split-site output. Seven independently localized fields cover the type parameter, summaries, remarks, parameter, return, and exception. Domain sample documentation is tracked separately from HIA tool-package APIs.

## Prerequisites

中文。使用稳定 .NET 10 SDK、Node.js `^22.23.4 || ^24.22.1`，并在所用调用项目安装配套的 HIA CLI 与 DotNetDoc runner。源码候选与注册表可用性分别核对，安装候选归档须包括完整配套依赖。样本项目无第三方 NuGet 依赖。

English. Use a stable .NET 10 SDK, Node.js `^22.23.4 || ^24.22.1`, and matching HIA CLI and DotNetDoc runner packages installed in the invoking project. Check source-candidate versions and registry availability separately. Candidate archive installation requires matching dependencies. The sample project has no third-party NuGet dependencies.

## Build and extract

中文。以下命令从本目录运行，命令名应来自已安装的本地工具。编译会写 bin/obj，提取会写 dist/dotnetdoc。重复构建可能覆盖文件，失败或部分成功也可能留有输出。

English. Run from this directory with locally installed commands. Compilation writes bin/obj and extraction writes dist/dotnetdoc. Repeated builds may replace files, and failed or partial runs may leave output.

```sh
dotnet build HiaDocumentationSample.csproj --configuration Release
hia-dotnetdoc --config dotnetdoc.config.json
```

中文。真实编译生成 bin/Release/net10.0/HiaDocumentationSample.xml。配置只读取该 XML、Envelope.cs 和本样本工程。XML 的项目绑定用于精确匹配 Roslyn 声明，源码范围应指向 Envelope.cs。SDK 选择与输入项目框架分别遵循工具契约。

English. Compilation emits bin/Release/net10.0/HiaDocumentationSample.xml. Extraction reads that XML, Envelope.cs, and this sample project. The XML project binding supports exact Roslyn declaration matching, with source ranges pointing to Envelope.cs. Tool SDK selection remains independent of input-project framework metadata.

## Render the sample

```sh
hia docs build --config hia.config.json --project-manifest hia.project.json --out dist/site/zh-CN --locale zh-CN
hia docs build --config hia.config.json --project-manifest hia.project.json --out dist/site/en --locale en
```

中文。两条命令分别选择正文语言，共用配置中的简体中文界面语言。若要英文界面，可复制配置并把 docs.renderer.uiLocale 改为 en 后用于英文构建。配置将源码公开许可限定到本样本根，页面会生成获准片段及同源源码查看页。只有自有公开样本文件可沿此配置发布。

English. These commands select content locale separately while sharing the configured Simplified Chinese UI locale. For an English UI, copy the config with docs.renderer.uiLocale set to en and use it for the English build. Source publication is explicitly limited to this sample root, producing authorized excerpts and same-origin source views. Publish only the first-party public sample files through this configuration.

中文。空字符串和纯空白标签均返回空字符串，普通标签移除两端空白，null 抛 ArgumentNullException 且参数名为 label。XML 的独立语言标记由既有 DotNetDoc 字段本地化读取，不依靠同一字段内并排两段文字来模拟切换。

English. Empty and whitespace-only labels return an empty string, ordinary labels are trimmed, and null throws ArgumentNullException with parameter name label. Existing DotNetDoc field localization reads the XML language markers independently.

## Files and license

- [Project](HiaDocumentationSample.csproj) and [source](Envelope.cs)
- [Extraction config](dotnetdoc.config.json), [project manifest](hia.project.json), and [render config](hia.config.json)

中文。项目/源码及这三份配置构成本样本的显式输入清单，生成目录按仓库忽略规则管理。样本采用仓库根的 MIT 许可证。

English. The project, source, and three configs form the explicit sample input list. Repository ignore rules handle generated directories. The sample follows the repository's MIT license. [License](../../../LICENSE)
