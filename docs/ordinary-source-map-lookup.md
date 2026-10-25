# Ordinary source-map lookups

The source version of `@hia-doc/source-linkage` isolates ordinary position-map
metadata from source bodies. These changes are unreleased; npm `0.1.1` does not
include them. No contract, schema, or package version changes in this repair.

中文：源码修复普通位置映射的正文隔离、固定错误诊断、非法坐标拒绝与联合失败隔离；尚未发布。
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
These are typed APIs: arbitrary runtime query objects, accessors and tampered
indexes are outside this coordinate-only check. Echoed input is not validation
evidence and must not be logged as trusted/public data.

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
that order is not a consistency check between the two positions.
