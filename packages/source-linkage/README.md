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
or source content. See `docs/generated-documentation-binding-contract.md`.

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
