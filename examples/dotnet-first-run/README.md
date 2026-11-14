# .NET native-paragraph documentation sample

This first-party `Envelope<T>` sample demonstrates generic and method XML
documentation using ordinary native `para` elements. Each paragraph pair
contains Chinese and English text. Reading in either language retains those
original paragraphs. The [structured-language sample](../../reference/samples/dotnet/)
uses explicit field-level locale markers for independent language selection.

## Build and extract

Use a stable .NET 10 SDK, Node.js 22 or 24 and a matching six-package DotNetDoc
cohort. The project has no third-party NuGet dependencies. Follow the
[current-source first-run guide](../../docs/dotnetdoc-quickstart.md#current-source-first-run)
for archive installation and separate runtime/package version checks.

Run from a fresh copy of this directory with the tools installed locally.

```sh
dotnet build -c Release
hia-dotnetdoc --config dotnetdoc.config.json
hia docs build --project-manifest hia.project.json --config hia.config.json --out dist/site/zh-CN --locale zh-CN
```

The project explicitly compiles `Envelope.cs`. Its XML output is
`bin/Release/net10.0/HiaDocumentationSample.xml`. Extraction also reads the
declared source and project to verify member IDs, signatures and C# locations.
Inspect the extraction, HIA, source-map and relation artifacts in
`dist/dotnetdoc/dotnetdoc.producer-result.json`.

The project manifest consumes the compiler-XML HIA document and its map once.
The native C# document remains available for separate field inspection.
The reading config permits publication of this public sample's source under
the sample root. Fetch previews and generated same-origin source pages use
the existing digest-checked source pipeline.

Set `docs.renderer.uiLocale` and the content `--locale` argument to `en` for
an English UI/content request. Native paragraph pairs retain both original
languages. Compilation writes bin/obj, extraction and rendering write dist,
and repeated or failed operations can leave output. Use a fresh output
directory to investigate failures.

中文说明。本公开自有样本保留原生para中英双段，并与已有字段级语言标记样本分别演示。
显式编译Envelope.cs可避免收集npm工具源文件，真实XML和唯一源码关联分别核验。
配置仅授权本样本根内源码阅读；项目采用仓库MIT许可证。
