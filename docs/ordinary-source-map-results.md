# Ordinary source-map index and result fields

The source version of `@hia-doc/source-linkage` documents seven interfaces and
32 fields below. This preserves their existing mutable types and runtime
behavior; the broader source repairs are unreleased and are not part of npm
`0.1.1`. See the [lookup guide](ordinary-source-map-lookup.md) for input rules.

中文：本页补普通位置索引及结果字段的现有语义，不改变查询算法、偏置、坐标或
状态；字段存在不等于映射成功，输入回显不等于已验证/脱敏数据。

## Counts, paths and coordinates

`mappingCount` includes unmapped segments. `sources` projects nonempty strings
from raw source slots, normalizes separators/initial `./`, keeps duplicates and
filters empty/null slots. It is not `traceMap.resolvedSources`. A forward result
may contain a path resolved against the map base/source root while the public
source list retains its raw-relative spelling. `sourceCount` measures this
projected list, not raw slots or unique files. Counts are creation-time snapshots.

HIA positions use one-based lines and columns. Omitted lookup columns default
to one without being added to raw echoes. Only the library boundary converts
columns; no character-unit conversion or range-endpoint rule is added here.
Artifact context comes from explicit options/combined requests, not `map.file`.

中文：来源列表与解析后路径是两个不同视图；计数不是唯一文件数。库坐标与HIA
坐标的区别只在既有适配边界处理，不重新定义源码范围端点。

## Ownership and trust

Ordinary indexes and their independent body-free `TraceMap` instances remain
mutable. Lookup caches may change during queries. A public sources-list edit
does not update counts or revalidate the index; do not tamper during consumption.

Direct helper results borrow the caller input-position object in their request
context. Mapped positions are fresh. Combined query echoes borrow the original
query, but returned positions come from projected snapshots or mappings, and
entry nodes borrow the documentation index. Cyclic/invalid runtime echoes may
remain; do not blindly serialize results as trusted or public evidence.

Normal direct lookups borrow the index diagnostic list. New argument failures
create a list reusing prior records. Combined results create an aggregate list;
only the ordinary lookup collection deduplicates records by object identity,
not all diagnostics by content. These objects are not uniformly deeply frozen.

中文：直接helper与联合结果的位置所有权不同。诊断数组是否新建、记录是否借用
也应分别判断；原始query及合法路径上下文未脱敏。索引不保留源码正文或执行I/O。

## States and optional fields

Direct lookups distinguish `available`, `unmapped` and `invalid`; only successful
outputs carry the mapped optional side. The all-generated helper returns an
empty list for both misses and rejections. Request context can remain on failure.
Combined results may retain resolved position context despite an unsupported
documentation version while returning no entries.

A metadata-only combined request can return `available` document entries with
an invalid ordinary-map error diagnostic, because it requested no position
lookup. Combined status follows requested branches rather than recomputing
severity from every aggregated diagnostic. See [combined query rules](doc-source-map-query.md#combined-position-queries).

中文：必须联合查看status、诊断及请求分支；不能单凭generated/original字段、
空列表或最高诊断严重度反推映射状态。字段说明不扩大公开安全或完整标准符合承诺。

## Fields

### `OrdinarySourceMapIndex`

Independent body-free mutable ordinary position index; counts are creation-time snapshots, lookups update library caches, and tampering invalidates reliance on validation.

| Field | Type | Meaning |
| --- | --- | --- |
| `artifactPath?` | `string` | Nonempty explicit artifact context from options, normalizing separators/initial ./; not inferred from map.file and granting no file-access/publication authority. |
| `diagnostics` | `HiaDiagnostic[]` | Mutable diagnostics for this creation; empty on success, fixed on rejection with valid unsanitized context, and possibly borrowed by result lists/records. |
| `mappingCount` | `number` | Count of all mapping segments, including unmapped segments; zero when invalid and not automatically recomputed after instance mutation. |
| `path?` | `string` | Original nonempty options.path used as library resolution base and diagnostic context; empty strings omitted, without sanitization or access authority. |
| `sources` | `string[]` | New separator/initial-./ normalized list of nonempty string slots from raw sources, retaining duplicates and filtering empty/null slots; not library resolvedSources. |
| `sourceCount` | `number` | Public sources-list length at creation, not raw slot count, unique paths or mapped-file count. |
| `status` | `"available" \| "invalid"` | Construction status available or invalid, never unmapped; a valid empty map remains available without proving full ECMA-426 conformance or public safety. |
| `traceMap?` | `TraceMap` | Independent body-free TraceMap on successful construction, retaining existing resolved paths; mutable lookup caches do not share the caller instance/caches. |

### `SourceMapOriginalPosition`

Original-position context or successful mapping; direct-helper input echoes borrow the original position, while mapped outputs/combined snapshots have separate ownership.

| Field | Type | Meaning |
| --- | --- | --- |
| `name?` | `string` | Optional nonempty symbol name supplied by a mapping; input context does not infer names and nameless mappings omit it. |
| `position` | `HiaSourcePosition` | HIA one-based line/column; mapped outputs have fresh coordinates, direct reverse helpers echo the original position/omitted columns, and invalid runtime echoes do not prove types. |
| `sourcePath` | `string` | Mapped output is a separator/initial-./ normalized library-resolved path; input echoes normalize primitive strings only and may retain invalid runtime values, without sanitization. |

### `SourceMapGeneratedPosition`

Generated-position context or mapping; presence alone does not prove success, so inspect the enclosing result status.

| Field | Type | Meaning |
| --- | --- | --- |
| `artifactPath?` | `string` | Optional nonempty artifact context with normalized separators/initial ./, from index options or a combined request, without file reads. |
| `position` | `HiaSourcePosition` | HIA one-based coordinates; direct forward helpers echo the input reference, reverse mappings create fresh coordinates, and combined results use projected snapshots, without public-safety/serialization guarantees. |

### `SourceMapOriginalLookupResult`

Generated-to-original lookup result; generated is request context and only available carries a successful original mapping.

| Field | Type | Meaning |
| --- | --- | --- |
| `diagnostics` | `HiaDiagnostic[]` | Normal/unmapped/index-failure branches borrow the index list; new argument rejection creates a list borrowing existing records, without uniform deep freezing. |
| `generated` | `SourceMapGeneratedPosition` | Always-retained generated request context whose position borrows input; present even for invalid/unmapped and possibly containing invalid runtime values. |
| `original?` | `SourceMapOriginalPosition` | Fresh original mapping when available, with one-based coordinates/resolved path and optional name; omitted when invalid/unmapped. |
| `status` | `OrdinarySourceMapIndex["status"] \| "unmapped"` | available means mapped, unmapped means a valid miss, and invalid means rejected index/arguments; never infer it from echo fields. |

### `SourceMapGeneratedLookupResult`

Original-to-one-generated lookup result; original is input context, not proof of a forward mapping check.

| Field | Type | Meaning |
| --- | --- | --- |
| `diagnostics` | `HiaDiagnostic[]` | Normal/unmapped/index-failure branches borrow the index list; argument rejection creates a list reusing old records without modifying index diagnostics. |
| `generated?` | `SourceMapGeneratedPosition` | Fresh generated position/coordinate containers when available, omitted for invalid/unmapped and not sharing the input position. |
| `original` | `SourceMapOriginalPosition` | Always-retained original request context with normalized primitive source path and borrowed input position; not a trusted/sanitized echo. |
| `status` | `OrdinarySourceMapIndex["status"] \| "unmapped"` | available for one mapping, unmapped for a valid miss and invalid for rejection, distinct from documentation-map version states. |

### `SourceMapAllGeneratedLookupResult`

Original-to-all-generated result with fresh list/output coordinates, retaining library order without additional project sorting.

| Field | Type | Meaning |
| --- | --- | --- |
| `diagnostics` | `HiaDiagnostic[]` | Normal/unmapped/index-failure branches borrow the index list; argument rejection creates a list with existing records and a fixed error. |
| `generated` | `SourceMapGeneratedPosition[]` | New mutable generated-position list with HIA one-based columns restored per item; empty when invalid/unmapped, without promising cross-version library ordering. |
| `original` | `SourceMapOriginalPosition` | Always-retained original request context borrowing the caller position, without inserting omitted columns into the echo. |
| `status` | `OrdinarySourceMapIndex["status"] \| "unmapped"` | available with results, unmapped on a valid miss and invalid on rejection; an empty list alone cannot distinguish the last two. |

### `SourceLinkedLookupResult`

Combined documentation/position result; status composes requested branches rather than recomputing the highest severity of all diagnostics, and the original query echo is unsanitized.

| Field | Type | Meaning |
| --- | --- | --- |
| `diagnostics` | `HiaDiagnostic[]` | New aggregate list possibly borrowing index records; only the ordinary-position collection is deduplicated by object identity, not the entire list by content. |
| `entries` | `DocSourceMapIndexedEntry[]` | Fresh list borrowing documentation-index entries in semantic-filter order when available, empty otherwise, without cloning/freezing entries. |
| `generated?` | `SourceMapGeneratedPosition` | Generated mapping/request context when applicable, from a library mapping or projected input snapshot; may remain for invalid/unmapped/version failures. |
| `matchedEntryCount` | `number` | Number of entries returned for this call, zero unless available; not index totals or mapping-segment count. |
| `original?` | `SourceMapOriginalPosition` | Library mapping/original request snapshot when applicable, with coordinates not borrowing caller-query positions; may remain after documentation-version failure. |
| `query` | `SourceLinkedLookupQuery` | Original caller-query reference; unknown cycles/invalid runtime data may remain in echoes, without trusted-type/serialization/public-safety guarantees. |
| `status` | `DocSourceMapIndex["status"] \| OrdinarySourceMapIndex["status"] \| "unmapped"` | Composition of documentation availability and requested lookups; metadata-only requests need no available ordinary index and may be available with its error diagnostics. |
