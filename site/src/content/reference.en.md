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
