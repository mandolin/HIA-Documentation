# @hia-doc/source-linkage

Workspace package for indexing and validating `doc-source-map` manifests and combining them with ordinary source map lookups.

The package reads documentation source map manifests, checks the privacy/path baseline, and exposes normalized indexes that CLI, renderer, LSP, and future browser integrations can consume.

## Strict same-point anchors (source draft)

`createOrdinaryCoordinateProfileIndex()` accepts an explicit
`ordinary-source-map-coordinate-profile@0.1.0-draft`, actual ordinary and
documentation map bytes, and authorized original-source bytes addressed by raw
section/source slot. `queryVerifiedSourceAnchor()` requires an explicit entry,
source identity, slot, one-based position and column unit. Only
`verification.kind === "exact-anchor"` means an actual ordinary mapping segment
starts at the requested original point and a `doc-source-map@1.1.0` reference
contains that same point. A preceding segment yields `nearest-anchor`; missing
source access, unmatched versions, unknown units and unsupported maps never
become exact. These are segment anchors, not per-character range guarantees.

The reader verifies SHA-256 against the bytes it receives. Its first draft
supports fatal UTF-8 decoding with no transformation, retaining BOM and CRLF;
the logical-text digest hashes the resulting UTF-16 code units as little-endian
bytes without an added BOM. It supports local nonnested inline source-map
sections and preserves their original source-slot indices. The API performs no
file or network access and never returns source text. Hosts control source
authorization and must pass actual bytes. The existing ordinary lookup and
combined query APIs retain their numeric navigation semantics. See the
[coordinate profile contract](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ordinary-source-map-coordinate-profile.md)
for the wire and status boundaries.

中文：严格入口必须显式给出侧载、两张地图实际字节和获授权的源码字节；仅真实段起点与
文档范围同点、同槽、同单位时返回 `exact-anchor`。旧数值导航、页面按钮和最近段均不
构成同点证明。本契约仍为开发草案，未宣称 npm 发布或正式版门禁通过。

The unreleased source query helpers validate known runtime filters without
executing their getters. Invalid filters return no entries. The exact older
contract readers compare omitted columns as one; `1.1.0` exact position lookup
requires an explicit column and matching unit. See [query semantics and compatibility](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-query.md).
中文：源码查询边界新增字段检查及固定诊断；旧版保留缺省列规则，当前1.1.0需显式列与单位。源码变更尚未发布npm。

Combined position queries also project known runtime fields before lookup,
preserving fixed coordinate/semantic diagnostics and using a fixed query error
for malformed roots/accessors. Existing dual-input order remains; see the same guide.
中文：联合查询先校验后定位，错误值不退化为宽泛结果；双向顺序不等于一致性证明。

It also provides an ordinary source map lookup layer based on `@jridgewell/trace-mapping`. The model keeps responsibilities separate:

- ordinary source maps answer generated/original position lookup;
- `doc-source-map` answers documentation symbol/source/artifact relations;
- combined queries connect both without embedding private `sourcesContent`.

It also exports the machine-readable Draft 2020-12 contract through `DOC_SOURCE_MAP_JSON_SCHEMA`, `DOC_SOURCE_MAP_SCHEMA_ID` and `DOC_SOURCE_MAP_SCHEMA_VERSION`. Structural schema validation does not replace the package's semantic path, privacy and reference diagnostics.

See the [constant and schema reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/source-linkage-schema-surface.md)
for schema and constant exports, exact historical/current pairings, type-only unions and
ownership. Schema exports are shared module objects with readonly TypeScript
types and no runtime deep freeze: clone before editing. Distribution reader
functions return independent copies; contract versions do not prove publication.

The ordinary index remains mutable metadata with creation-time counts, copied
range containers and reference-only sidecars. Check status before consumption;
unusable indexes may retain partial metadata. See the [complete index field
reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-index.md) for ownership, counts and limits.

中文：普通索引九接口64字段已补语义说明与回归；新版增逐引用范围约定投影，旧版可变结构及查询行为保持。尚未发布npm。

Ordinary position index/result fields retain raw-source versus resolved-path
views and distinguish borrowed echoes, fresh mappings and combined snapshots.
See the [result field reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ordinary-source-map-results.md) for
all seven interfaces, counts, ownership and branch-specific status semantics.
中文：普通位置索引及结果七接口32字段说明已完善，类型/运行逻辑保持，尚未发布。

See the [lookup selection reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ordinary-source-map-lookup.md#lookup-selection-reference)
for same-line segment anchors, exact versus nonexact ties, all-generated column
groups and duplicate source-slot limits. Runtime logic, types and versions remain unchanged; unreleased.
中文：四个普通位置入口补查找选择说明；同列整组不等于整行，重复来源名不合并，尚未发布。

## Version and privacy checks

The [map validation, indexing and migration guide](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-validation-and-migration.md)
distinguishes status precedence, independent validator diagnostics, passive
declarations and migration requirements. Unknown versions may have only warnings
yet remain unqueryable; legacy reader admission does not promise migration to
current required structure. Index failure can retain metadata, and success does
not certify complete schema/reference closure or publication safety.
中文：文档源码映射三个函数责任与组合特征已补齐；新版契约身份与范围约定见下文，源码尚未发布npm。

See [binding validation and bundle migration](https://github.com/mandolin/HIA-Documentation/blob/main/docs/generated-binding-validation-and-migration.md)
for both synchronous functions, owner-versus-actual-map responsibilities, empty
sidecar sets, opaque scopes and external-symbol limits. The unreleased owner now
enforces the existing object type for root/binding `adapterExtensions`; malformed
containers yield invalid indexes and atomic migration refusal. Optional objects
and admitted unknown JSON fields remain supported.
中文：生成式文档绑定校验补齐既有扩展对象类型约束及两个函数责任说明；新版配对另见下文，尚未发布npm。

The [binding options and bundle result reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/generated-binding-options-and-results.md)
documents validation context, explicit range-evidence options, the writable
bundle container and migration results. Record types do not certify versions;
factory success returns an independent complete target pair with empty outer diagnostics, while raw
artifact diagnostics may remain. Check optional bundle presence separately;
successful migration grants no publication authority.
中文：绑定选项、逐引用证据与整组迁移结果说明已同步；默认目标仍为旧配对，显式升级才进入新版。尚未发布npm。

The source-only ordinary-map repair copies body-free metadata and preserves valid
string/object/decoded/TraceMap inputs. Ordinary helpers project known own
position/options data without executing getters, reject invalid coordinates,
paths and biases with fixed diagnostics, and preserve unknown-field ignoring.
Combined position failures return no broad document entries. See
[`ordinary-source-map-lookup`](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ordinary-source-map-lookup.md) for ownership,
defaults and limits. These changes are not included in npm `0.1.1`.

中文：普通位置映射源码修复正文隔离、坐标校验与联合失败隔离，尚未发布；详见上述说明。

Index creation also projects its own `path`/`artifactPath` string data before
reading the map. Invalid options yield the existing fixed
`ORDINARY_SOURCE_MAP_INVALID` with no partial path context. Valid snapshots are
retained if map parsing fails, without rereading caller options. Empty/whitespace
strings and prior resolution semantics are unchanged; valid context remains
unsanitized. Unknown extensions are ignored, while known accessors are rejected.

中文：索引创建选项按自有数据投影为快照，避免失败分支二次访问和抛异常；合法路径语义保持。
选项失败不回显部分路径，合法路径上下文仍未脱敏；尚未发布。

Position/options require plain or null-prototype records; optional columns and
both bias defaults are unchanged. Input echoes remain untrusted and may be
nonserializable, and mutable indexes must not be tampered with after validation.

The source version also checks declared field types, collection identities and
ordered positive-integer ranges. Non-JSON memory values, accessors, cycles,
sparse/custom-behavior arrays and duplicate identities produce
`DOC_SOURCE_MAP_MANIFEST_INVALID`; query gates keep invalid indexes unusable.
These additional input checks are unreleased and are not part of npm `0.1.1`.

The source definition is now `doc-source-map@1.1.0`, with exact `1.0.0` and
`0.1.0-draft` readers. The schema catalog marks this contract `stable-candidate`;
package releases and host adoption have separate gates. Current references use a closed `rangeSource` category
and optional nonblank `rangeSourceDetail`. Ranged source references also declare
their endpoint convention and column unit; unknown facts do not produce exact
position matches. `unresolved` requires `confidence: "none"`; detail labels
do not infer category, confidence or trust. `available` describes the owner
index boundary, not every wire-schema or cross-chain constraint. See the
[input validation and privacy limits](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-input-validation.md).

中文：源码版新增显式字段、集合身份、范围与普通JSON预检；该修复尚未发布到npm。
当前1.1.0继承通用闭集来源类别，并按引用声明范围终点和列单位；精确旧reader保留各自原有行为。
目录将本契约标为stable-candidate；绑定和坐标侧载草案、npm包及宿主采用继续分别治理。
available不是完整wire-schema或跨链验证证明；此源码实现尚未发布，包版本与契约版本独立。

`migrateDocSourceMap(value, { rangeEvidence })` explicitly returns an independent
current artifact or diagnostics. Ranged older references need one caller supplied
convention per reference; no endpoint or unit is inferred. Four reviewed legacy
origins map to categories while retaining
the original string as `rangeSourceDetail`; unknown origins, conflicting detail,
incomplete structure and privacy errors refuse conversion. Inputs are never
rewritten. Already-current data is cloned. Allowed source bodies and open JSON
extensions remain in the migrated artifact; returning data grants no publication
authority. See [source provenance and migration](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-provenance.md)
for categories and migration, and [range conventions](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-range-conventions.md)
for exact position lookup.

The [options and migration-result reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-options-and-results.md)
documents all four fields of `DocSourceMapIndexOptions` and
`DocSourceMapMigrationResult`. Check status and manifest presence separately:
the current interface is not a discriminated union. Results remain mutable and
may retain permitted bodies, diagnostic text and unsanitized context; success
does not grant publication authority.

Legacy generated-binding sidecars still refer to the legacy map version.
Standalone migration refuses those associations. The unreleased
`migrateGeneratedDocumentationBindingBundle({ docSourceMap, bindingSidecars })`
keeps the old `0.1.0-draft` pair's reviewed migration to binding `0.2.0-draft` /
map `1.0.0`, and independently copies an existing exact pair. An explicit
upgrade to binding `0.3.0-draft` / map `1.1.0` requires range evidence for both
map and binding references.
Supply every declared sidecar; missing, duplicate, unresolved or mixed-version
groups fail without partial output. Successful/current results are independent
copies, preserve JSON extensions, and grant no write/publication authority.
Exact legacy binding/map `0.1.0-draft` reading remains supported.

`createDocSourceMapIndex()` retains diagnostics and an explicit `invalid` or
`unsupported-version` status when input is unusable. Query functions return no
entries for either status, including the symbol/source/artifact convenience
functions and combined queries. Inspect the index for diagnostics; do not treat
a version warning as permission to consume mappings.

Source bodies in `content` or `sourcesContent`, including empty strings, require
an explicit `embed` or `redacted` policy. The normalized index and query results
never contain these bodies. Ordinary source-map handling has its own validation
and does not grant permission to use an invalid documentation source map.

`generated-documentation-binding@0.3.0-draft` (source draft, unreleased) is a separate neutral sidecar
contract. The package exports its Draft 2020-12 schema and
`validateGeneratedDocumentationBinding()`. A doc-source-map may declare only a
safe sidecar reference plus binding ids; it never embeds the full binding model
or source content. `createGeneratedDocumentationBindingIndex()` consumes an
explicit in-memory sidecar and a pre-built doc-source-map index to provide
read-only `binding -> generated targets` and `generated target -> bindings`
queries. It never loads a sidecar path, executes expressions/locals, or starts
a renderer or host projection. See the [generated binding contract](https://github.com/mandolin/HIA-Documentation/blob/main/docs/generated-documentation-binding-contract.md).

The unreleased source also checks primitive-string identifiers in all four
binding queries, preventing `undefined` from matching omitted target symbol ids.
Valid identities retain whitespace/case/Unicode. New frozen result lists borrow
original indexed nodes; the four existing edge/declaration orderings remain
distinct. See the [binding index reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/generated-binding-index.md)
for all metadata fields, counters, ownership and query limits.

中文：绑定索引字段与四查询已补复核；非法标识符不再产生缺省符号宽匹配，合法身份/顺序保持。
索引含来源身份及范围，查询结果不是公开安全宿主投影；尚未发布npm。

The binding reader preflights ordinary JSON without executing getters, checks
consumed declared fields and safe ordered ranges, and iteratively checks privacy
fields. It is not a general schema engine or proxy/resource sandbox. The legacy
schema and canonical identity remain exported independently, with original bytes
preserved in `@hia-doc/schemas`. Binding remains a draft.

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

Supply this package's untampered binding index. Every projected container is
independently frozen; permitted identities/selectors/codes remain unredacted
data requiring contextual encoding and publication review. The unreleased source
index now propagates owner-validated extraction codes/severities in order, with
fixed memory messages rather than extractor identities/free text. Extraction
errors produce empty invalid relations and refuse complete-bundle migration;
info/warnings remain nonblocking. Invalid sidecars forward no extraction
records. See the [host projection reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/generated-binding-host-projection.md)
for field, ordering, counter, version-fallback and ownership details.

中文：宿主字段与冻结边界已有复核；源码版现补提取诊断传播，error复用既有空拒绝，
info/warning不阻断。允许字符串仍不自动脱敏，包/契约版本保持且未发布npm。

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
