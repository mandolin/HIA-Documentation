# @hia-doc/source-linkage

Workspace package for indexing and validating `doc-source-map` manifests and combining them with ordinary source map lookups.

The package reads documentation source map manifests, checks the privacy/path baseline, and exposes normalized indexes that CLI, renderer, LSP, and future browser integrations can consume.

It also provides an ordinary source map lookup layer based on `@jridgewell/trace-mapping`. The model keeps responsibilities separate:

- ordinary source maps answer generated/original position lookup;
- `doc-source-map` answers documentation symbol/source/artifact relations;
- combined queries connect both without embedding private `sourcesContent`.

It also exports the machine-readable Draft 2020-12 contract through `DOC_SOURCE_MAP_JSON_SCHEMA`, `DOC_SOURCE_MAP_SCHEMA_ID` and `DOC_SOURCE_MAP_SCHEMA_VERSION`. Structural schema validation does not replace the package's semantic path, privacy and reference diagnostics.

`generated-documentation-binding@0.1.0-draft` is a separate neutral sidecar
contract. The package exports its Draft 2020-12 schema and
`validateGeneratedDocumentationBinding()`. A doc-source-map may declare only a
safe sidecar reference plus binding ids; it never embeds the full binding model
or source content. `createGeneratedDocumentationBindingIndex()` consumes an
explicit in-memory sidecar and a pre-built doc-source-map index to provide
read-only `binding -> generated targets` and `generated target -> bindings`
queries. It never loads a sidecar path, executes expressions/locals, or starts
a renderer or host projection. See `docs/generated-documentation-binding-contract.md`.

`documentation-locale-resolution@0.1.0-draft` is another independent,
metadata-only sidecar owned by `@hia-doc/core`. A doc-source-map may declare its
stable id, contract/version, and safe relative artifact path through
`localeResolutionSidecars`. It must not embed a DLR locator, resource body, or
resolved text; `createDocSourceMapIndex()` validates that boundary without
loading the sidecar.

`createGeneratedDocumentationBindingHostProjection()` converts that index into
the frozen `generated-documentation-binding-host-projection@0.1.0-draft` view
model for renderer and host surfaces. The projection carries binding-to-target
relations, stable instance-key state, diagnostics by code/severity, and separate
resolution/confidence/provenance values. It deliberately omits source bodies and
ranges, sidecar paths, locals values/digests, and diagnostic free text.

Cross-language reuse keeps parser and scope ownership with each language adapter.
The current production binding sidecar fixture is Pug. Sass and Vue committed
fixtures prove only the ordinary source-map/doc-source-map privacy baseline, not
binding declarations, expansions, lexical scope, or instance keys; JSX has no
workspace adapter yet, and Meta remains an upstream design input. Those inputs
must not be treated as generated-binding producers until each adapter emits and
validates its own reference-only sidecar.

## Example

```ts
import {
  createDocSourceMapIndex,
  createOrdinarySourceMapIndex,
  querySourceLinkedPosition
} from "@hia-doc/source-linkage";

const docIndex = createDocSourceMapIndex(docSourceMapJson);
const sourceMapIndex = createOrdinarySourceMapIndex(sourceMapJson, {
  artifactPath: "dist/profile-card.js",
  path: "dist/profile-card.js.map"
});

const result = querySourceLinkedPosition(docIndex, sourceMapIndex, {
  generatedPath: "dist/profile-card.js",
  generatedPosition: { line: 2, column: 1 }
});
```

## Generated binding example

```ts
import {
  createDocSourceMapIndex,
  createGeneratedDocumentationBindingHostProjection,
  createGeneratedDocumentationBindingIndex,
  findGeneratedBindingsForTarget,
  findGeneratedTargetsForBinding
} from "@hia-doc/source-linkage";

const docIndex = createDocSourceMapIndex(docSourceMapJson);
const bindingIndex = createGeneratedDocumentationBindingIndex(bindingSidecarJson, {
  docSourceMapIndex: docIndex
});

const generatedTargets = findGeneratedTargetsForBinding(bindingIndex, "binding:card-title");
const sourceBindings = findGeneratedBindingsForTarget(bindingIndex, "target:card-title");
const hostProjection = createGeneratedDocumentationBindingHostProjection(bindingIndex);
```
