# Documentation source-map queries

The source version hardens the four documentation-semantic query helpers and
supports `doc-source-map@1.1.0` range conventions. These changes are unreleased;
npm `@hia-doc/source-linkage@0.1.1` does not include them. Contract and schema
identities differ from the published package, while the npm package version is
unchanged.

中文：源码新增文档语义查询的已知字段运行时检查与无 getter 投影。旧版省略列按 1；
新版 `1.1.0` 精确位置匹配需显式列与列单位。非法筛选返回空结果和固定诊断，避免错误值退化为宽泛查询；尚未发布。

## Filters and failures

`queryDocSourceMapIndex(index, query?)` accepts a same-realm plain object or a
null-prototype object. Omission defaults to `{}`, matching all entries in an
available index. Known fields must be own data properties. Unknown fields,
including their getters, are ignored. Known-field getters are rejected without
execution. Optional `undefined` retains JavaScript compatibility as omission;
TypeScript with `exactOptionalPropertyTypes` remains stricter.

| Field | Accepted value | Matching |
| --- | --- | --- |
| `symbolId`, `symbolKind` | Nonblank string | Exact, without trimming |
| `sourcePath` | Nonblank string | Normalize separators and the initial `./` only |
| `position` | Positive safe integer `line`; optional positive safe integer `column` for old maps | Within the same source reference as `sourcePath`; `1.1.0` exact matching needs an explicit column |
| `columnUnit` | `utf16-code-unit`, `unicode-code-point`, `byte`, or `unknown` | `1.1.0` requires a matching known unit for exact position hits; never inferred from file names or ordinary source maps |
| `artifactPath` | Nonblank string | Same path normalization |
| `selector` | Nonblank string | Exact, within the same artifact reference as `artifactPath` |

Active filters intersect; results preserve entry order. `selector` filters only
with `artifactPath`. For the two older map versions, an otherwise valid position
without `sourcePath` retains its prior ignored behavior. In `1.1.0`, a supplied
position without `sourcePath` yields no exact matches. No selectors are executed
and no files or URLs are loaded.

Invalid runtime shapes, known accessors, wrong field types, blank strings, and
invalid coordinates return `status: "invalid"`, no entries, count zero and the
fixed `DOC_SOURCE_MAP_QUERY_INVALID` error. Existing index diagnostics are
preserved without mutation; exception messages and rejected values are not copied
into that error. A valid query against an invalid or unsupported index retains
the index status with no entries. A valid miss is `available` with no entries.

The array helpers `findDocSourceMapEntriesBySymbol`,
`findDocSourceMapEntriesBySource` and `findDocSourceMapEntriesByArtifact` use the
same checks and return `[]` for invalid inputs. Use the full query API for
diagnostics. Empty optional helper arguments now reach validation instead of
silently disappearing. Callers that used empty filters to mean “all” should omit
them explicitly.

## Coordinates and ownership

All HIA lines and columns are one-based safe integers. For `0.1.0-draft` and
`1.0.0`, omitted columns compare as **1** and ranges retain **inclusive
endpoints**. In `1.1.0`, each ranged reference declares inclusive, exclusive or
unknown endpoints and a column unit. Exact position matching requires a caller
column and the same known unit; missing or unknown facts do not match rather
than broadening the query. See [range conventions](doc-source-map-range-conventions.md).

Matching consumes an independent snapshot of known query fields. Returned
entries and the echoed original `query` remain borrowed references; results are
neither immutable nor sanitized for logging or publication. Indexes must be
created by this package and remain untampered. Proxy reflection can execute user
code; caught reflection errors do not imply sandboxing or resource limits.

## Combined position queries

`querySourceLinkedPosition(documentIndex, ordinaryIndex, query)` requires an
explicit plain/null-prototype query. Its five string fields (`generatedPath`,
`originalSourcePath`, `selector`, `symbolId`, `symbolKind`) must be nonblank.
`generatedPosition` and `originalPosition` use positive safe integer coordinates.
`originalColumnUnit` explicitly supplies the documentation range unit for
`1.1.0`; it is not inferred from an ordinary source map lookup. Older maps retain
their omitted-column default. Optional `undefined` means omission;
unknown fields are ignored without reading their getters. Supplied positions
are validated even if not paired with a path. Accepted positions are copied.

Rejected queries return `invalid`, no entries, count zero and no positional
results. Diagnostics preserve both indexes without mutating them. Codes are:

- `SOURCE_LINKED_LOOKUP_QUERY_INVALID`: invalid root, known-field accessors or
  reflection failure; no raw exception text is included.
- `DOC_SOURCE_MAP_QUERY_INVALID`: invalid or blank string metadata, retaining
  the existing semantic-filter diagnostic.
- `ORDINARY_SOURCE_MAP_POSITION_INVALID`: malformed or invalid positions,
  retaining the existing coordinate diagnostic.

Metadata-only queries still work with an unavailable ordinary map. Both
directions retain their existing order. Older map versions retain optional
columns and unpaired-filter behavior. For `1.1.0`, an original path without a
position filters source metadata; an original position without its path yields
no documentation entries. An explicit original path conflicting with a path
resolved from the generated position also yields no entries. Exact positions
need the source path, column and explicit known unit.
When both directions are supplied, generated lookup runs first, original lookup
runs second, and earlier failures remain failures. This order does not establish
position consistency. The original `query` echo remains unsanitized.

## Language service propagation

The source `hia/documentSourceMapIndex@0.1.0-draft` consumer uses query status and
diagnostics for every loaded index, including unfiltered queries. Invalid and
unsupported indexes yield no entries even if the index retains entries for
diagnostic inspection. Original aggregate counts remain index metadata.
Known query rejection is `invalid` with its diagnostic; it is never described
as a successful `query-no-match` or `source-data-empty`. Valid misses and empty
indexes retain those existing empty states. Missing indexes remain `unavailable`
with `not-loaded` and are not queried. Managed-service null/false query values
reach validation instead of disappearing as omissions.

No transport error, host field, empty-state enum or UI is added. Outer typed
options/URI/request envelopes, conflicting dual positions and tampered indexes
remain separate review boundaries. The ordinary helpers now project their known
runtime position/options fields and reject invalid paths and biases; the
[ordinary position map guide](ordinary-source-map-lookup.md) describes its
input and echo limits. Explicit [binding bundle migration](generated-documentation-binding-contract.md)
has its own exact-version and complete-group checks. These changes remain unreleased.
