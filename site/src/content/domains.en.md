---
title: "Documentation workflows across four domains"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# Documentation workflows across four domains

These configurations target the current source candidates. Prepare a matching dependency cohort, build and public sample before invoking the installed command. Older archives may not accept current 1.0.0 configuration. Read their matching guides and use explicit migration APIs instead of changing version labels.

## JavaScript

The hia-jsdoc runner consumes explicit source inputs. The plugin interprets JSDoc comments, while the theme produces standalone pages. Use canonical @lang and inline `<lang>` for localized fields. Check the standalone output and its Integration artifact; the CLI can consume the latter through --jsdoc-integration. Standalone-theme and HIA-renderer outputs need separate acceptance.

For the first plugin and theme setup, follow the [standalone JSDoc and Integration guide](https://github.com/mandolin/HIA-Documentation/blob/main/docs/published-jsdoc-usage.md). Select an available release cohort or matching source archives and install them in an isolated sample project. The guide includes complete configuration and canonical bilingual summaries, parameters and returns. Check every field in both generated languages.

## HTML and CSS

Use the HTML or CSS configuration below with the matching htmdoc or cssdoc command. Declared input kinds do not authorize arbitrary template execution. Review the extraction, HIA document, documentation map and producer-result artifacts. Source embedding is not a default. Map and result options retain domain-specific defaults.

Use `html-fragment` for HTML fragments and `html` for complete documents. Follow the [HTML source generation and project-output guide](https://github.com/mandolin/HIA-Documentation/blob/main/docs/unified-html-demo.md#generate-from-html-source) for a complete first run. The original Alert fragment has English descriptions. UI or project-language declarations do not supply translations.

For a CSS first run, follow the [CSS extraction and unified-output guide](https://github.com/mandolin/HIA-Documentation/blob/main/docs/cssdoc-quickstart.md) to prepare the matching eight packages, original CSS and HIA/map inputs. Inspect components, selectors, custom properties, modifiers, token descriptions and source locations. The sample descriptions are English. When source fragments are needed, explicitly configure extraction and presentation and confirm publication permission.

## C#/.NET/ASP.NET

Compiler XML documentation is the baseline. Add C# source, project structure or ASP.NET surface inputs when required. Roslyn-based source features use the current .NET 10 toolchain; XML intake does not require running a legacy application.

Use hia-dotnetdoc with the configuration below. Review summaries, remarks, parameters, type parameters, returns, exceptions and readable signatures. XML-only input does not establish C# locations. The map option defaults to false; this example explicitly enables it. Source references require the corresponding matching and precision evidence, and source publication still requires authority.

## Configuration and command examples

These shared examples use the same configuration identities, inputs and commands as the Chinese guide. Run them only after preparing the matching tools and inputs.

~~~json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/hia-jsdoc","inputs":[{"kind":"javascript-module","path":"src"}]}
~~~

~~~sh
hia-jsdoc --config hia-jsdoc.config.json
~~~

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

~~~json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/dotnetdoc","inputs":[{"kind":"dotnet-xml-doc","path":"xml-doc/Sample.xml"}],"options":{"writeDocSourceMapArtifact":true}}
~~~

~~~sh
hia-dotnetdoc --config dotnetdoc.config.json
~~~

## Authoritative references

The linked technical references retain their actual languages; this English guide does not imply that every linked reference is translated.

- [hia-cssdoc/packages/cssdoc-runner/README.md](https://github.com/mandolin/hia-cssdoc/blob/main/packages/cssdoc-runner/README.md)
- [hia-cssdoc/README.md](https://github.com/mandolin/hia-cssdoc/blob/main/README.md)
- [hia-dotnetdoc/README.md](https://github.com/mandolin/hia-dotnetdoc/blob/main/README.md)
- [hia-htmdoc/packages/htmdoc-runner/README.md](https://github.com/mandolin/hia-htmdoc/blob/main/packages/htmdoc-runner/README.md)
- [hia-htmdoc/README.md](https://github.com/mandolin/hia-htmdoc/blob/main/README.md)
- [hia-jsdoc/README.md](https://github.com/mandolin/hia-jsdoc/blob/main/README.md)
- [docs/dotnetdoc-quickstart.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/dotnetdoc-quickstart.md)
- [docs/published-jsdoc-usage.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/published-jsdoc-usage.md)
