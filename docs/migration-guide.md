# Migration Guide

This guide describes the first migration paths into HIA documentation profiles and project aggregation.

## Migration Principles

- Keep source-language parsers and adapters responsible for syntax fidelity.
- Use official stable profiles for standard semantics.
- Use bridge profiles for generated DSLs and external artifacts.
- Keep legacy vocabulary as aliases, deprecated tags, raw metadata or migration diagnostics instead of creating parallel standards.
- Prefer explicit project manifests over implicit scanning.

## JSDoc Projects

Existing JSDoc projects can adopt HIA through the published packages:

- `@mandolin/jsdoc-plugin-hia-sys`
- `@mandolin/jsdoc-theme-hia`

Recommended path:

1. Keep the existing JSDoc config working.
2. Add the HIA plugin and theme in a small fixture or branch.
3. Generate HIA Integration JSON.
4. Use `@hia-doc/parser-jsdoc` or the CLI to convert the integration artifact into HIA output.
5. Run the published package smoke after npm package changes:

```bash
pnpm run smoke:published-jsdoc
```

Extra JSDoc plugins should stay in the user's JSDoc configuration. The future `hia-jsdoc` umbrella should manage plugin ordering, config merge and compatibility diagnostics, but W-P8.4 does not require that package to exist.

## CSSDOC 0.2.22 To CSSDoc

HIA uses a single modern CSSDoc profile. CSSDOC 0.2.22 is treated as a historical draft input, not as a separate compatibility profile.

Recommended migration:

| Legacy shape | Preferred modern target |
| --- | --- |
| `/** ... */` CSS documentation blocks | Keep as the primary CSSDoc comment shape. |
| `@cssdoc version ...` | `@cssdoc <version>` when version metadata is needed. |
| `@cssdoc parsing off/on` | `@cssdoc ignore-start` and `@cssdoc ignore-end` or a named region directive. |
| `@colordef` / `@fontdef` | Prefer `@token`; preserve legacy values as metadata until token mapping is explicit. |
| `@section` / `@subsection` / `@subsubsection` | Preserve as section metadata until a section-tree rule is adopted. |
| browser workaround tags | Preserve as compatibility metadata; do not promote to core symbols by default. |

New CSS documentation should prefer current CSSDoc tags such as `@component`, `@selector`, `@modifier`, `@cssprop`, `@token`, `@layer`, `@media`, `@container`, `@keyframes`, `@description`, `@example` and `@lang`.

## SassDoc Legacy To Sass/CSSDoc Bridge

The historical SassDoc ecosystem is useful reference material, but HIA does not treat it as a CSS or Sass fact standard.

Recommended migration:

1. Use CSSDoc tags for generated CSS behavior: component styles, selectors, modifiers, custom properties, cascade layers and design tokens.
2. Keep Sass-specific entities such as variables, mixins, functions and placeholders in Sass bridge artifacts until the SassDoc profile hardens.
3. Link Sass source ranges to generated CSS and CSSDoc entries through `doc-source-map`.
4. Preserve legacy SassDoc tags as raw metadata or bridge diagnostics unless the tag has an explicit HIA mapping.

The current bridge profile includes experimental Sass metadata and should not be read as a complete Sass language standard.

## TypeScript, TSDoc, API Extractor And TypeDoc

TSDoc is the preferred TypeScript comment syntax input. It does not replace HIA's TS extraction artifact or the JS/JSDoc bridge.

Recommended migration:

| Existing input | HIA role |
| --- | --- |
| TSDoc comments | TypeScript annotation syntax input. |
| TypeScript compiler/source maps | Source and generated JS linkage. |
| API Extractor API model or reports | Future library API bridge input. |
| TypeDoc reflection/output | Future project documentation bridge input. |
| Runtime JS/JSDoc output | Existing JS documentation and HIA Integration path. |

Type-only symbols should remain in TS extraction artifacts or adapter metadata until HIA promotes specific TS symbol kinds. Runtime functions, classes and exports can bridge to JS/JSDoc output earlier.

References:

- TSDoc: <https://tsdoc.org/>
- API Extractor: <https://api-extractor.com/>
- TypeDoc: <https://typedoc.org/>

## HTMDoc And Pug

HTMDoc is the stable HTML documentation profile. Pug is a bridge input.

Recommended migration:

1. Use HTMDoc tags for HTML semantics, for example `@component`, `@element`, `@template`, `@attr`, `@slot`, `@stylehook`, `@a11y`, `@description`, `@example` and `@lang`.
2. Use the Pug bridge profile only for generated-source linkage and Pug-specific source ranges.
3. Do not promote every Pug include, block or mixin shape into HTML core symbols without a documented bridge rule.

## Project Aggregation

After migrating individual inputs, aggregate them through a project manifest:

```bash
pnpm run hia -- docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/project-docs
```

Project mode can combine:

- JSDoc Integration JSON;
- HTMDoc extraction JSON;
- CSSDoc extraction JSON;
- doc-source-map JSON;
- normalized HIA core documents.

The output page can show all entries together or split them into JS, CSS and HTML views.

Tools that need the official vocabulary can consume `@hia-doc/profiles` as JSON or through its programmatic accessors. Generic schema consumers can use the owner-preserving catalog in `@hia-doc/schemas`; semantic validation should still use `@hia-doc/profile`, `@hia-doc/config`, `@hia-doc/core` or `@hia-doc/source-linkage` as appropriate.

## What Is Not Migrated Yet

- Automatic workspace profile discovery.
- Profile marketplace.
- Full SassDoc legacy compatibility.
- Complete API Extractor or TypeDoc bridge.
- Vue, React, CSS-in-JS and Storybook deep bridges.
