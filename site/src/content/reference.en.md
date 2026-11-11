---
title: "Using the reference"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Reference</p>

# Using the reference

Identify the exact package, configuration and artifact versions before selecting the authoritative reference. Owners define CLI parameters, defaults, diagnostics and schemas; this page is a guide to those references, not a competing definition.

## Build documentation

```sh
hia docs build --input <artifact> --out <directory> --locale <locale>
```

| Parameter | Purpose |
| --- | --- |
| `--input` | An existing compatible HIA document artifact |
| `--out` | A dedicated output directory for this build |
| `--locale` | Rendering locale, such as `zh-CN` or `en` |

Replace the placeholders and use an installed compatible CLI. Multiple inputs use the project-manifest entry described in the authoritative references below.

## Command paths

`@hia-doc/cli` provides the `hia` command. These source documents describe the coordinated 1.0.0 candidate. Check your installed version with `npm list @hia-doc/cli --depth=0`. Each bundled usage section defines installation, parameters, path bases, defaults, output side effects and exit codes. The complete guide includes Chinese and English prose. [Installation and version selection](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#installation-routes)

| Command | Purpose |
| --- | --- |
| [`hia docs build`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-build) | Build documentation from an artifact or aggregated project |
| [`hia docs theme-assets`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-theme-assets) | Write shared theme assets |
| [`hia docs evidence`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-evidence) | Generate evidence summaries from project documentation |
| [`hia docs acceptance`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-acceptance) | Verify target-project acceptance evidence |
| [`hia docs continuity`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-continuity) | Compare baseline and current continuity evidence |
| [`hia docs adoption-kit`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-adoption-kit) | Generate an owner adoption kit |
| [`hia docs business-flow-handoff`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-business-flow-handoff) | Generate a business-flow documentation handoff |
| [`hia docs enterprise-workflow`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-enterprise-workflow) | Coordinate enterprise-owner adoption and continuity reports |
| [`hia docs html-authoring-verify`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-html-authoring-verify) | Verify HTML authoring handoffs and source projections |
| [`hia docs coordinate-verify`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#docs-coordinate-verify) | Verify cross-map coordinates and source-byte evidence |
| [`hia browser panel`](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/USAGE.md#browser-panel) | Generate a source-linked static browser panel |

Search these manuals for a complete command name to find this directory, then follow its authoritative section. Each command's usage defines its result states and exit codes.

## Resource reference partitions

Resource references use separate publication sites grouped by responsibility. Each partition has its own directory and search scope. Choose a partition by its full name, then inspect the export and exact contract version. Interfaces support Chinese and English, while original JSON and source ranges retain their actual input content.

| Resource partition | Contents |
| --- | --- |
| [Core document, source and producer schemas](https://mandolin.github.io/HIA-Documentation-Resources-Core/schemas/core-and-source/en/) | Eleven public JSON exports for core documents, source maps, source evidence and producers |
| [TypeScript documentation extraction and bridge schemas](https://mandolin.github.io/HIA-Documentation-Resources-Core/schemas/typescript-documentation/en/) | Eight public JSON exports for TypeScript documentation extraction and bridges |
| [Documentation profiles](https://mandolin.github.io/HIA-Documentation-Resources-Applications/profiles/en/) | Fifteen public JSON exports from `@hia-doc/profiles` |
| [Business flow, localization, presentation and quality schemas](https://mandolin.github.io/HIA-Documentation-Resources-Applications/schemas/business-localization-presentation-and-quality/en/) | Eleven public JSON exports for business workflows, localization, presentation and quality |

Language and version entries retain the current partition. The Code documentation tab opens the core API directory. The plugin development toolkit's two JSON resources are published with that core API, and these four partitions cover another 45 resources. Check the system documentation version and each resource's declared contract version separately.

## JavaScript documentation tools and configuration evidence

| Full name | Contents and search scope |
| --- | --- |
| [JavaScript documentation tool package API](https://mandolin.github.io/HIA-Documentation-API-JavaScript/en/) | Package interfaces for runners, producers, plugins, specifications and themes, including current/legacy configuration schemas and static declaration data; search within this site |
| [JSDoc configuration derivation evidence](https://mandolin.github.io/HIA-Documentation-Resources-JSDoc/derivation-evidence/en/) | Sources, digests and coverage of configuration derivation records; search within this evidence partition |

Both sites provide explicit Chinese/English entries, the current partition's system-documentation version selection and authorized source reading. Complete code-file downloads and page source excerpts are provided separately. Evidence identities come from the original artifacts.

## Find rules and contracts

Consult the CLI README for input modes, configuration references for defaults and theme settings, and the manifest guide for aggregation. Omission, defaulting and explicit null are different semantics.

Profile composition follows parent declaration order, later parents override earlier ones, local declarations apply last and shared ancestors apply once. Cycles retain explicit refusal behavior. Consult the authoring, composition and distribution references together.

Use exact contract identities from the contract index. Package ranges do not negotiate wire versions. Source-range endpoints, column units, reader semantics and byte evidence remain separate; retain unknown precision.

Use the compatibility matrix and each package's migration guide. Persist only an explicit valid lossless migration, preserving the original input on failure. Branch on diagnostic codes and severity rather than translated prose.

Historical quickstarts remain applicable to their historical packages. They are not automatically current-source instructions. Schema validation does not replace runtime path, authority, identity or semantic checks.

## Brand colors

Pass theme colors through document configuration. HIA-Documentation-Sys uses cobalt, while other hosts can choose their own color:

```json
{"docs":{"theme":{"name":"default","colors":{"accent":"#0047AB"}}}}
```

This is a theme fragment for `hia.config.json`. Consult the configuration reference for complete configuration and available color tokens.

## Authoritative references

The linked technical references retain their actual languages; this English guide does not imply that every linked reference is translated.

- [apps/cli/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/apps/cli/README.md)
- [docs/compatibility-matrix.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/compatibility-matrix.md)
- [docs/configuration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md)
- [docs/contract-index.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/contract-index.md)
- [docs/core-fixture-contract.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/core-fixture-contract.md)
- [docs/doc-source-map-options-and-results.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-options-and-results.md)
- [docs/doc-source-map-range-conventions.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-range-conventions.md)
- [docs/migration-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/migration-guide.md)
- [docs/ordinary-source-map-coordinate-profile.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ordinary-source-map-coordinate-profile.md)
- [docs/package-v1-migration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-v1-migration.md)
- [docs/profile-authoring-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-authoring-guide.md)
- [docs/profile-composition.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-composition.md)
- [docs/profile-distribution.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/profile-distribution.md)
- [docs/project-manifest-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-guide.md)
- [docs/project-manifest-migration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-migration.md)
- [docs/schema-distribution.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/schema-distribution.md)
- [docs/security-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/security-policy.md)
- [packages/config/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/config/README.md)
- [packages/core/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/core/README.md)
