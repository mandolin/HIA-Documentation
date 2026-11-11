---
title: "Read APIs from generated artifacts"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# Read APIs from generated artifacts

HIA generates code documentation from actual artifacts; overview prose does not synthesize API signatures. Render the descriptions, signatures, parameters, type parameters, returns, exceptions, examples and provenance that the input actually contains. Do not invent absent semantics.

Choose the system documentation version, then identify the package, source revision and generator/theme. Core tools, JavaScript, HTML, CSS and .NET have distinct input chains. Similar presentation does not imply a common parser. Provide direct entries for both standalone JSDoc and the unified Portal.

Compare public package exports with actual generated symbols. Processing one domain fixture does not establish documentation coverage for the tool package itself, and an installed dependency is not automatically an extracted API.

Distinguish C#/XML application APIs from the JavaScript APIs of the DotNetDoc tools. Declare each generation scope and its unmapped entries.

For provenance, check the revision, authority, digest and range evidence. Keep API reading available without verified source. Do not relabel XML locations as C# locations or restore excluded external source links. Link manuals and generated references while retaining each package as the owner of its definitions.

## Generated reference entries

- [HIA thirteen-core-package API · English](https://mandolin.github.io/HIA-Documentation-API/en/) · [Chinese](https://mandolin.github.io/HIA-Documentation-API/zh-CN/): the independent site covers modules from thirteen core packages. Resources, commands, and satellite tools have separate adoption inventories.

- [HIA unified generated reference · English](../../../en/): existing public artifacts, including samples and tool references, without a claim of complete required-package coverage.
- [HIA unified generated reference · Chinese](../../../zh-CN/): retains the actual field locales in its inputs.
- [BP/bp-docs-js-cookie · API Portal](https://mandolin.github.io/bp-docs-js-cookie/): the first JavaScript demonstration project, separate from the product website.
- [Standalone JSDoc output and build guidance](https://github.com/mandolin/HIA-Documentation/blob/main/docs/published-jsdoc-usage.md): generated with the actual runner and theme; the unified Portal is a separate output.

## Authoritative references

The linked technical references retain their actual languages; this English guide does not imply that every linked reference is translated.

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
