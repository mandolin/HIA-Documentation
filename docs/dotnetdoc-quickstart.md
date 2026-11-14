# DotNetDoc Quickstart

中文。本指南面向下面明确指定的历史 0.1.x 包与配置。采用当前 1.0.0 源码候选时，先按安装版本选择运行器使用参考与配套归档。
For the coordinated source candidate, use the [runner reference and installation routes](https://github.com/mandolin/hia-dotnetdoc/tree/main/packages/dotnetdoc-runner#command-reference) and verify registry versions before installation. This guide retains the historical package/config scope shown below.

This guide shows the minimum public path for using `@hia-doc/dotnetdoc-runner` with compiler-generated .NET XML documentation. XML documentation is the stable baseline; source relation and ASP.NET surface inputs can be added progressively.

## Current source first run

The current `1.0.0` source candidates have a complete first-party sample at
[examples/dotnet-first-run](../examples/dotnet-first-run/). Use a stable .NET 10
SDK and a matching six-package DotNetDoc cohort from the
[release plan](https://github.com/mandolin/hia-dotnetdoc/blob/main/release-plan.json).
Verify registry availability separately. For a source trial, pack each listed
package directory and install all six matching archives in a fresh copy of
the sample.

```sh
npm pack <package-directory> --ignore-scripts --pack-destination <archive-directory>
npm install --save-dev --ignore-scripts <six-matching-archive-paths>
dotnet build -c Release
hia-dotnetdoc --config dotnetdoc.config.json
```

The sample project sets `EnableDefaultCompileItems` to `false` and declares
`Compile Include="Envelope.cs"`. This bounds compilation to the sample's own
source when installed npm packages also contain C# helper files. Compilation
creates the actual `bin/Release/net10.0/HiaDocumentationSample.xml` file.

The sample's `dotnetdoc.config.json` uses `schemaVersion: "1.0.0"`, consumes
that XML and `Envelope.cs`, and declares their `projectPath`. Its
`writeDocSourceMapArtifact` option is explicitly enabled. The current default
for this option is false. Read `dist/dotnetdoc/dotnetdoc.producer-result.json`
for actual extraction, HIA, map and source-relation paths.

Check the type parameter and each method's summary, remarks, parameter,
return, exception and readable signature. XML members are matched to exact
Roslyn declaration identities in the configured project. The native C# HIA
document is available separately; the sample's project manifest selects the
compiler-XML HIA document and its map once for unified reading.

```sh
hia docs build --project-manifest hia.project.json --config hia.config.json --out dist/site/zh-CN --locale zh-CN
```

For a built source checkout, replace `hia` with
`node <built-core-checkout>/apps/cli/dist/index.js`. Serve the output over HTTP.
The render config uses `publicAssetPolicy: "explicit-public"` and
`localRoot: "."` to permit source publication inside this first-party sample.
Check the actual C# range, fetch preview and same-origin source page.
UI and content locales are independent; change both `uiLocale` and the
`--locale` argument to `en` for an English reading build.

This sample uses native para pairs containing Chinese and English. Both
paragraphs remain available in either content-locale request. For independently
localized fields, follow the existing
[structured-language sample](../reference/samples/dotnet/).

The historical `Portal.Components.xml` fixture is also useful for XML-only
intake. Its language markers provide localized fields; its standalone XML
input has no verified C# location. Inspect the source-map diagnostics and
documentation origins separately. Add a real matching project to establish
code locations. Invalid configuration and failed inputs exit with code 1;
save diagnostics and retry corrected inputs in a fresh output directory.

中文说明。当前首次生成可从公开自有泛型样本开始，实际编译XML再核字段、签名与源码匹配。
原生para中英双段按原文保留，独立语言切换使用已有结构化语言样本。纯XML样本保持未定位边界，
源码公开必须由样本配置显式授权。下列历史安装/配置步骤继续对应其原0.1.x版本范围。

## Install

Install the published runner in the target project:

```bash
npm install --save-dev @hia-doc/dotnetdoc-runner@^0.1.1
```

The package exposes the `hia-dotnetdoc` command.

## Enable XML Documentation

Build the .NET project with XML documentation output enabled. For SDK-style projects this is usually controlled by project settings such as `GenerateDocumentationFile`; older projects may already emit XML documentation through their build configuration.

The runner consumes the XML file that the compiler creates. It does not require source edits for the first pass.

## Add A Documentation Config

Create `dotnetdoc.config.json` at the project root:

```json
{
  "$schema": "https://mandolin.github.io/HIA-Documentation/schemas/dotnetdoc-config-0.1.0-draft.schema.json",
  "schemaVersion": "0.1.0-draft",
  "workspaceRoot": ".",
  "outputDirectory": "dist/dotnetdoc",
  "inputs": [
    {
      "kind": "dotnet-xml-doc",
      "path": "xml-doc/Portal.Components.xml",
      "artifactBasePath": "Portal.Components",
      "hiaDocumentId": "dotnetdoc:Portal.Components",
      "title": "Portal.Components API"
    }
  ],
  "options": {
    "writeResultManifest": true
  }
}
```

Use a relative `path` that points to the XML documentation file inside the project workspace. The public config schema rejects absolute paths and parent-directory traversal.

## Run Standalone Extraction

Run the published CLI:

```bash
npx hia-dotnetdoc --config dotnetdoc.config.json
```

For static XML extraction without a config file, pass XML files directly. This command reads the selected XML and writes artifacts and a producer manifest into the output directory. Existing output files may be replaced, and a partial or failed run may leave written files. Use a dedicated staging directory when reviewing a new input.

中文。以下命令读取 XML 并写出提取产物与生产结果清单，可能覆盖同名输出，失败或部分成功时也可能留有文件。首次验证请使用独立暂存输出目录。本指南采用上面的已发布 0.1.x 安装范围及其旧版配置身份。

```bash
npx hia-dotnetdoc --workspace-root . --out-dir dist/dotnetdoc --title "Portal Components API" xml-doc/Portal.Components.xml
```

The runner writes DotNetDoc extraction artifacts, HIA document artifacts and a documentation producer result manifest without embedding private source text.

## Add Source Relation Later

After XML documentation is stable, add C# source inputs or project discovery inputs to improve source linkage:

```json
{
  "kind": "dotnet-csharp-source",
  "path": "src/Portal.Components/Widget.cs",
  "artifactBasePath": "source/Widget"
}
```

For ASP.NET or Web Forms projects, `dotnet-aspnet-surface` inputs can be added as a progressive bridge. Treat these as enhancements; the first reliable milestone is still XML documentation intake.

## Connect To HIA Project Output

When the project is ready for unified HTML output, add the HIA CLI and the DotNetDoc producer:

```bash
npm install --save-dev @hia-doc/cli @hia-doc/dotnetdoc-producer@^0.1.1
```

Then use an explicit HIA project manifest producer entry:

```json
{
  "schemaVersion": "0.1.0-draft",
  "project": {
    "id": "project:example-dotnet",
    "name": "Example .NET Project",
    "title": "Example .NET Documentation"
  },
  "producers": [
    {
      "id": "dotnetdoc",
      "module": "node_modules/@hia-doc/dotnetdoc-producer/src/index.mjs",
      "workspaceRoot": ".",
      "inputs": [
        {
          "kind": "dotnet-xml-doc",
          "path": "xml-doc/Portal.Components.xml",
          "artifactBasePath": "Portal.Components",
          "hiaDocumentId": "dotnetdoc:Portal.Components",
          "title": "Portal.Components API"
        }
      ],
      "options": {
        "writeResultManifest": true
      }
    }
  ]
}
```

Then run the HIA CLI from a project that has `@hia-doc/cli` installed:

```bash
npx hia docs build --project-manifest hia-project.json --out dist/hia-docs
```

If DotNetDoc has already produced `dotnetdoc.producer-result.json`, the project manifest can consume that existing result directly:

中文：如果 DotNetDoc 已经生成 `dotnetdoc.producer-result.json`，不必重新跑 producer；可以让 HIA project manifest 直接消费这个既有结果，再输出统一 HTML。

```json
{
  "schemaVersion": "0.1.0-draft",
  "project": {
    "name": "Portal Documentation"
  },
  "inputs": [
    {
      "kind": "documentation-producer-result",
      "path": "temp/documentation/dotnetdoc/dotnetdoc.producer-result.json",
      "domain": "dotnet"
    }
  ]
}
```

Add a JSDoc integration input alongside it when the project also has JavaScript documentation:

```json
{
  "kind": "jsdoc-integration",
  "path": "temp/documentation/jsdoc/hia-integration.json",
  "domain": "js"
}
```

## Verify

Use these checks before publishing generated artifacts:

```bash
rg --fixed-strings "sourcesContent" dist/dotnetdoc
rg --fixed-strings "xml-doc/Portal.Components.xml" dist/dotnetdoc
```

The first command should not find embedded source text. The second command helps confirm that published output refers to project-relative inputs rather than local machine paths.

## Target Repository Policy

For target projects that are not owned by the current HIA workspace, keep the repository read-only. If the target should adopt this setup, write a maintainer-side notification message organized by date and let the target project pull the notice when it is ready to copy the config, dependencies and CI steps.
