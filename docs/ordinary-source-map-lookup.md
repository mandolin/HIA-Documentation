# Ordinary source-map lookups

The source version of `@hia-doc/source-linkage` isolates ordinary position-map
metadata from source bodies. These changes are unreleased; npm `0.1.1` does not
include them. No contract, schema, or package version changes in this repair.

中文：源码修复普通位置映射的正文隔离、固定错误诊断、已知查询字段投影与联合失败隔离；尚未发布。
文档源码映射来源模型与独立 binding sidecar 版本保持不变。

## Input and ownership

`createOrdinarySourceMapIndex(value, options)` accepts a JSON string, an encoded
or decoded map object, or a `TraceMap` instance from the installed dependency.
It copies recognized mapping metadata into an independent instance. It neither
reads nor retains `sourcesContent` or unknown extensions from object inputs.
Parsing a JSON string necessarily parses the caller-provided text; bodies are
discarded from the resulting index. No source files, URLs, or sidecars are fetched.

Known field accessors, malformed metadata, invalid segment coordinates/references,
and malformed encoded segment syntax produce an empty `invalid` index with
`ORDINARY_SOURCE_MAP_INVALID`. Errors never include raw parser/library messages.
Caller-supplied path context is retained and is not a public-safety guarantee.
Proxy reflection can have side effects; this function is not a JavaScript sandbox.

Creation options must be same-realm plain or null-prototype records. Only own
data descriptors for `path` and `artifactPath` are consumed, accepting primitive
strings or runtime `undefined`. Known accessors and invalid roots/field types are
rejected without invoking getters or conversion hooks. Unknown extensions are
not read or enumerated; frozen data is accepted. The public exact-optional types
remain unchanged: a present typed path is a string.

Both paths are snapshotted before reading the map. Invalid options produce an
empty `invalid` index with the existing `ORDINARY_SOURCE_MAP_INVALID`, without
partial path context. A malformed map with valid options retains the validated
snapshot in its diagnostic/index context; the catch path never rereads caller
options. These paths remain unsanitized. Mutation from map reflection cannot
replace the snapshots, but arbitrary Proxy execution is not sandboxed.

Valid path semantics remain unchanged: `path` is the library resolution base
and original diagnostic context; `artifactPath` normalizes separators and a
leading `./`. Empty strings retain their prior resolution behavior and are
omitted from returned context; whitespace is not trimmed. These are parsing
contexts, not documentation publication paths. A pre-resolved `TraceMap` keeps
its resolved source paths even when a new `path` option is provided.

中文：创建选项只取普通或 null 原型对象的两个自有数据路径，拒绝访问器和错误类型；
先复制快照，成功/失败分支均不重读原选项。选项非法不保留部分路径，map 非法时保留合法上下文；
合法字符串、空字符串、空白及已有实例解析语义保持。上下文未脱敏，代理反射不是沙箱；尚未发布。

Decoded arrays and names are copied. An existing `TraceMap` keeps its previously
resolved source paths without sharing mutable mapping caches or source bodies.
The returned index remains mutable, and later lookups update internal library
caches. Callers must not tamper with it and then rely on its original validation.

Decoding and lookup use MIT
[`@jridgewell/trace-mapping`](https://github.com/jridgewell/sourcemaps/tree/main/packages/trace-mapping).
This is not a complete [ECMA-426](https://tc39.es/ecma426/) validator. Sectioned index
maps remain unsupported. Ordinary-map acceptance does not authorize publication
of source paths or relax the separate documentation-map privacy checks.

## Coordinates and failures

All three position helpers use **HIA one-based lines and columns**. Omitted
columns default to `1`; values must be positive safe integers. Zero, negatives,
fractions, `NaN` and infinity return `invalid` with
`ORDINARY_SOURCE_MAP_POSITION_INVALID`, rather than being clamped or thrown.
Positions and lookup options must be same-realm plain or null-prototype objects.
Only own data descriptors for `line`, `column` and `bias` are consumed; known
accessors are rejected without execution. Frozen data is accepted. Unknown
extensions and their accessors are ignored. Numeric snapshots are used for the
library call, avoiding rereading caller properties after validation. Invalid
coordinate shapes and reflection failures retain `ORDINARY_SOURCE_MAP_POSITION_INVALID`.

Reverse source paths must be primitive, nonblank strings. Valid paths keep the
existing separator and initial `./` normalization; whitespace is not trimmed
from a nonblank path, and no URL parsing or I/O is added. Options accept only the
two declared bias strings; omitted/undefined bias retains the default. Invalid
option shapes, bias values or source paths return `invalid` with the fixed
`ORDINARY_SOURCE_MAP_QUERY_INVALID`. Rejection never becomes a valid empty lookup,
and diagnostic text does not include values or caught exception messages.

The original input position is still echoed by reference. Rejected runtime
values can also remain in input context, so echoes are neither validated output
types nor redacted/serializable data. Do not log or serialize the whole result as
trusted/public evidence. Explicit index path context is still retained. Proxies,
concurrent mutation, hostile resource use and tampered indexes are not sandboxed;
the index must remain an untampered instance created by this package.

| API | Available result | No mapping |
| --- | --- | --- |
| `findOriginalPositionForGenerated` | `original` | `unmapped`, no `original` |
| `findGeneratedPositionForOriginal` | one `generated` | `unmapped`, no `generated` |
| `findAllGeneratedPositionsForOriginal` | all `generated` | `unmapped`, empty array |

All helpers retain explicit `greatest-lower-bound` / `least-upper-bound` choices.
Omission consistently uses the greatest lower bound, including the all-generated
helper. Columns are converted to zero-based values only at the library boundary.

`querySourceLinkedPosition` returns no entries when a requested position lookup
is invalid or unmapped. It preserves lookup-specific diagnostics. Metadata-only
queries still use an available documentation index independently of ordinary-map
availability. Invalid/unsupported documentation indexes never yield entries.
The legacy order for supplying both original and generated positions remains;
that order is not a consistency check between the two positions. Combined query
fields now receive separate runtime projection and fixed diagnostics; see
[combined queries and LSP propagation](doc-source-map-query.md#combined-position-queries).
The three ordinary helpers use the field projection described above. Their
public signatures, bias defaults, numeric conversion, result states and source
map semantics are unchanged; this repair remains unreleased.

## Index and result field reference

See the [seven-interface field reference](ordinary-source-map-results.md) for
raw versus resolved paths, source/segment count domains, input echoes versus
snapshotted/mapped coordinates, diagnostic ownership and branch-specific states.

中文：七接口32字段已补双语/特征回归，保持原类型和运行逻辑；尚未发布。
