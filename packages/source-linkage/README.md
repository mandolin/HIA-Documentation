# @hia-doc/source-linkage

Workspace package for indexing and validating `doc-source-map` manifests and combining them with ordinary source map lookups.

The package reads documentation source map manifests, checks the privacy/path baseline, and exposes normalized indexes that CLI, renderer, LSP, and future browser integrations can consume.

The unreleased source query helpers validate known runtime filters without
executing their getters. Invalid filters return no entries; omitted columns
compare as one. See [query semantics and compatibility](../../docs/doc-source-map-query.md).
中文：源码查询边界新增字段检查及固定诊断，尚未发布；契约和包版本保持。

Combined position queries also project known runtime fields before lookup,
preserving fixed coordinate/semantic diagnostics and using a fixed query error
for malformed roots/accessors. Existing dual-input order remains; see the same guide.
中文：联合查询先校验后定位，错误值不退化为宽泛结果；双向顺序不等于一致性证明。

It also provides an ordinary source map lookup layer based on `@jridgewell/trace-mapping`. The model keeps responsibilities separate:

- ordinary source maps answer generated/original position lookup;
- `doc-source-map` answers documentation symbol/source/artifact relations;
- combined queries connect both without embedding private `sourcesContent`.

It also exports the machine-readable Draft 2020-12 contract through `DOC_SOURCE_MAP_JSON_SCHEMA`, `DOC_SOURCE_MAP_SCHEMA_ID` and `DOC_SOURCE_MAP_SCHEMA_VERSION`. Structural schema validation does not replace the package's semantic path, privacy and reference diagnostics.

## Version and privacy checks

The source-only ordinary-map repair copies body-free metadata and preserves valid
string/object/decoded/TraceMap inputs. Invalid coordinates receive fixed diagnostics;
combined position failures return no broad document entries. See
[`ordinary-source-map-lookup`](../../docs/ordinary-source-map-lookup.md) for ownership,
defaults and limits. These changes are not included in npm `0.1.1`.

中文：普通位置映射源码修复正文隔离、坐标校验与联合失败隔离，尚未发布；详见上述说明。

The source version also checks declared field types, collection identities and
ordered positive-integer ranges. Non-JSON memory values, accessors, cycles,
sparse/custom-behavior arrays and duplicate identities produce
`DOC_SOURCE_MAP_MANIFEST_INVALID`; query gates keep invalid indexes unusable.
These additional input checks are unreleased and are not part of npm `0.1.1`.

The source definition is now `doc-source-map@1.0.0`, with an exact
`0.1.0-draft` reader preserving legacy omissions and generator-specific origins.
Current references use a closed `rangeSource` category and optional nonblank
`rangeSourceDetail`. `unresolved` requires `confidence: "none"`; detail labels
do not infer category, confidence or trust. `available` describes the owner
index boundary, not every wire-schema or cross-chain constraint. See
`docs/doc-source-map-input-validation.md` for the exact input and privacy limits.

中文：源码版新增显式字段、集合身份、范围与普通JSON预检；该修复尚未发布到npm。
当前1.0.0来源模型采用通用闭集类别与引用层具体来源，精确旧reader保留宽输入及来源字符串。
available不是完整wire-schema或跨链验证证明；此源码实现尚未发布，包版本与契约版本独立。

`migrateDocSourceMap(value)` explicitly returns an independent current artifact
or diagnostics. Four reviewed legacy origins map to categories while retaining
the original string as `rangeSourceDetail`; unknown origins, conflicting detail,
incomplete structure and privacy errors refuse conversion. Inputs are never
rewritten. Already-current data is cloned. Allowed source bodies and open JSON
extensions remain in the migrated artifact; returning data grants no publication
authority. See `docs/doc-source-map-provenance.md` for categories and migration.

Frozen generated-binding sidecars still refer to the legacy map version.
Standalone migration refuses those associations, and composition requires an
exact paired map version. Continue reading legacy pairs until coordinated
sidecar migration is available.

`createDocSourceMapIndex()` retains diagnostics and an explicit `invalid` or
`unsupported-version` status when input is unusable. Query functions return no
entries for either status, including the symbol/source/artifact convenience
functions and combined queries. Inspect the index for diagnostics; do not treat
a version warning as permission to consume mappings.

Source bodies in `content` or `sourcesContent`, including empty strings, require
an explicit `embed` or `redacted` policy. The normalized index and query results
never contain these bodies. Ordinary source-map handling has its own validation
and does not grant permission to use an invalid documentation source map.

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

`documentation-locale-resource-declaration@0.1.0-draft` provides a separate
public-safe discovery sidecar owned by `@hia-doc/core`. A doc-source-map may
declare only its stable id, contract/version, and safe relative artifact path
through `localeDiscoverySidecars`. It must not embed a controlled declaration,
catalog locator, source range, source/resource body, or resolved text;
`createDocSourceMapIndex()` validates the declaration without loading the
sidecar or reading a DLR file.

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
