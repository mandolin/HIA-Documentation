# Documentation source map index metadata

The source version of `@hia-doc/source-linkage` exposes a mutable, body-free
metadata snapshot from `createDocSourceMapIndex()`. These field clarifications
and regression checks are unreleased; npm `0.1.1` does not include the broader
source repairs described in the [input validation guide](doc-source-map-input-validation.md).

中文：本页描述普通索引的九个接口、64字段；`1.1.0` 新增逐引用范围约定投影，
旧 `1.0.0` 与 `0.1.0-draft` 的运行语义保持原状，
不将普通索引改为冻结对象，不将元数据投影等同于完整工件或公开安全数据。

## State, counts and ownership

Always inspect `status` before consuming entries. An invalid/unsupported index
may retain partial metadata. Root errors take precedence over unsupported
versions; availability proves the owner boundary, not complete wire-schema,
cross-chain or publication validation.

Counts describe declarations and entries at creation. Repeated paths and unused
declarations count separately. An entry is linked when both a source and an
artifact reference have declared paths, confidence other than `none` and
provenance other than `unresolved`; ranges, selectors and loaded binding bodies
are not prerequisites. Linked and unresolved counts partition the entry count.

The index, arrays, nodes and copied range endpoints remain mutable. Normal
projection creates fresh metadata containers, while existing queries borrow
index entries. Later input changes do not write through the snapshot. Mutating
an index does not recompute its counts or revalidate it; treat validated indexes
as unmodified during consumption. Identity/path/language and caller-provided
diagnostic text remain unsanitized.

中文：无效状态可能仍有元数据；计数按声明/条目域区分，重复引用和顺序保留。
范围独立复制但省略列不补造；路径/语言来自顶层声明。修改后计数不会自动更新，
合法元数据与输入诊断文本仍需宿主自己的公开安全策略。

## Projection limits

Only minimal declaration metadata is projected for generated binding, locale
resolution, locale discovery and ordinary source maps. No sidecar, resource,
source-map file, URL or `sourceMappingURL` is loaded. Source bodies and open
extensions are omitted even when an input policy allows embedded bodies.
Binding identity pairs are references, not proof that a binding exists in a
sidecar body. Entry diagnostic codes are not promoted into root severities.

Current and exact legacy provenance rules remain described in
[provenance and migration](doc-source-map-provenance.md). Existing
[query semantics](doc-source-map-query.md) retain their own filter, path,
coordinate and alias boundaries. In `1.1.0`, the index copies declared range
conventions without inferring units or endpoint meanings for older artifacts.

中文：索引不读取文件或外部正文、不执行转换。此处补字段说明，不扩大迁移、
文件访问、隐私或稳定版本承诺；包版本、契约版本与实际npm发行相互独立。

## Fields

### `DocSourceMapIndex`

Mutable body-free metadata snapshot of a documentation source map; counts are computed at creation, and invalid/unsupported-version indexes may retain partial metadata, so check status before consumption.

| Field | Type | Meaning |
| --- | --- | --- |
| `artifactCount` | `number` | Number of top-level artifact declarations, including unused nodes/repeated paths; invalid duplicate identities are not deduplicated here. |
| `bindingSidecarCount` | `number` | Number of projected generated-documentation-binding sidecar declarations, not bindings or expansions. |
| `bindingSidecars` | `DocSourceMapGeneratedBindingSidecar[]` | New minimal binding-sidecar metadata in declaration order, without reading or validating its body. |
| `localeResolutionSidecars` | `DocSourceMapLocaleResolutionSidecar[]` | New locale-resolution sidecar metadata in declaration order, without resource bodies, locators or resolved text. |
| `localeResolutionSidecarCount` | `number` | Number of projected locale-resolution sidecar declarations, not locales or resources. |
| `localeDiscoverySidecars` | `DocSourceMapLocaleDiscoverySidecar[]` | New locale-discovery sidecar metadata in declaration order, without controlled declarations/catalogs or resource bodies. |
| `localeDiscoverySidecarCount` | `number` | Number of projected locale-discovery sidecar declarations, proving no resource was read. |
| `contract` | `typeof DOC_SOURCE_MAP_CONTRACT` | Fixed index kind doc-source-map, even for a wrong input contract; this is not proof of admission. |
| `contractVersion?` | `string` | Input nonempty version text when available, including unsupported labels; check status rather than the label alone. |
| `diagnostics` | `HiaDiagnostic[]` | New mutable owner diagnostic sequence, including structure/version/reference/path/privacy and input diagnostics; valid context and input messages are unsanitized. |
| `entries` | `DocSourceMapIndexedEntry[]` | New mutable entry list in input order; unusable states may retain partial projections that must not bypass the status gate. |
| `entryCount` | `number` | Number of projected entries at creation; later entries mutation does not recompute it. |
| `id?` | `string` | Input nonempty identity text when available, without trimming or granting trust/publication authority. |
| `linkedEntryCount` | `number` | Entries with both source/artifact references having resolved paths, confidence other than none and provenance other than unresolved; ranges/selectors are not required. |
| `path?` | `string` | Caller diagnostic path retained verbatim when nonempty; empty strings are omitted, with no normalization/sanitization or file-access authority. |
| `sourceCount` | `number` | Number of top-level source declarations, including unused declarations/shared paths, not the number of navigable files. |
| `sourceMaps` | `DocSourceMapSourceMapLink[]` | New ordinary position-map link metadata in declaration order, excluding mappings/sourcesContent and loading no file or URL. |
| `sourceMapCount` | `number` | Number of projected ordinary map declarations, not mapping segments or executable chains. |
| `sourcesContentPolicy` | `string` | Root privacy policy, defaulting to none; embed/redacted still do not put source bodies into this index. |
| `status` | `"available" \| "invalid" \| "unsupported-version"` | Owner boundary result: errors yield invalid before unsupported-version, otherwise available; not complete schema/cross-chain or public-safety validation. |
| `unresolvedEntryCount` | `number` | Entries not satisfying the bilateral usable-reference predicate; together with linkedEntryCount equals entryCount at creation. |

### `DocSourceMapIndexedEntry`

Mutable entry projection retaining order/repeated references without the complete artifact, open extensions or sidecar bodies.

| Field | Type | Meaning |
| --- | --- | --- |
| `artifactLinks` | `DocSourceMapArtifactLink[]` | New artifact-link list in reference order, without merging repeated artifacts/selectors. |
| `classification?` | `string` | Original nonempty classification text; passive metadata inferring no permissions or stability. |
| `diagnostics` | `string[]` | Ordered nonempty codes/strings from entry diagnostics, not root HIA diagnostics; severity/message are not projected here. |
| `generatedBindingRefs` | `DocSourceMapGeneratedBindingRef[]` | Minimal sidecar/binding identity pairs retaining repeats/order; no binding body is loaded and bindingId existence is not proven. |
| `id` | `string` | Original entry identity; permissive legacy omissions fall back to entry:<one-based ordinal>, not a globally stable identity. |
| `kind` | `string` | Original entry kind, defaulting to entry for permissive legacy omissions without interpreting domain behavior. |
| `relationKind?` | `string` | Nonempty input relation-kind text, without executing relations or cross-chain computation. |
| `sourceLinks` | `DocSourceMapSourceLink[]` | New source-link list in reference order, retaining multiple ranges/repeated references to one source. |
| `symbolId?` | `string` | Optional original nonempty symbol identity, without trimming, case folding or verifying target-symbol existence. |
| `symbolKind?` | `string` | Optional nonempty symbol-kind text for query filtering and metadata only. |

### `DocSourceMapGeneratedBindingRef`

Mutable minimal identity pair for an independent generated-documentation-binding sidecar, without its binding model.

| Field | Type | Meaning |
| --- | --- | --- |
| `bindingId` | `string` | Original binding identity within the sidecar; the ordinary index does not open the sidecar to verify it. |
| `sidecarId` | `string` | Original declared sidecar identity; unknown declarations may be retained with a warning, without automatic path resolution. |

### `DocSourceMapGeneratedBindingSidecar`

Mutable generated-documentation-binding sidecar declaration metadata; optional types retain legacy/failed-projection compatibility without promising body availability.

| Field | Type | Meaning |
| --- | --- | --- |
| `contract?` | `string` | Nonempty declared contract text; owner success also requires the binding contract, and presence is not body validation. |
| `contractVersion?` | `string` | Nonempty declared version text; the ordinary index supports exact legacy/current binding labels without executing bundle migration. |
| `id` | `string` | Original declaration identity; omission projection falls back to generated-binding-sidecar:<one-based ordinal>, not owner admission of missing identity. |
| `path?` | `string` | Original nonempty declared path; the owner separately checks safe relative paths without file reads or publication authority. |

### `DocSourceMapLocaleResolutionSidecar`

Mutable minimal locale-resolution sidecar declaration without resolved locale-resource bodies.

| Field | Type | Meaning |
| --- | --- | --- |
| `contract?` | `string` | Copies nonempty contract text; owner success requires the locale-resolution contract, without inspecting external bodies. |
| `contractVersion?` | `string` | Copies nonempty version text; owner success requires the exact supported locale-resolution version. |
| `id` | `string` | Original declaration identity; omission projection falls back to locale-resolution-sidecar:<one-based ordinal> without bypassing identity validation. |
| `path?` | `string` | Original declared path, required by the owner to be safe and relative; no resource body, locator or resolved text is loaded. |

### `DocSourceMapLocaleDiscoverySidecar`

Mutable minimal locale-discovery sidecar declaration, counted separately from resolution sidecars and carrying no catalog contents.

| Field | Type | Meaning |
| --- | --- | --- |
| `contract?` | `string` | Copies the nonempty declaration contract; owner success requires documentation-locale-resource-declaration without executing discovery. |
| `contractVersion?` | `string` | Copies nonempty version text; owner success requires the exact supported declaration version. |
| `id` | `string` | Original declaration identity; omission projection falls back to locale-discovery-sidecar:<one-based ordinal> without promising global uniqueness. |
| `path?` | `string` | Original nonempty declared path; reads no controlled declaration/catalog, body or range and grants no access authority. |

### `DocSourceMapSourceLink`

Mutable source-reference metadata with path/language resolved from top-level declarations; unknown identities may retain links without paths.

| Field | Type | Meaning |
| --- | --- | --- |
| `confidence?` | `string` | Original reference confidence; omissions are not inferred and none excludes this link from linked eligibility, not a probability. |
| `language?` | `string` | Nonempty language text from the declared source node, never inferred from reference extensions for unknown sources. |
| `path?` | `string` | Original nonempty declared-source path without query normalization; optional for unknown sources and granting no file access. |
| `range?` | `HiaSourceRange` | Independently copied one-based endpoints, preserving omitted columns; a missing range may still be linked. Endpoint meaning depends on the exact map version and new declared convention. |
| `rangeConvention?` | `DocSourceMapRangeConvention` | Independently copied endpoint and column-unit declaration for a ranged `1.1.0` source reference; absent on older versions. Unknown dimensions do not support exact position matching. See [range conventions](doc-source-map-range-conventions.md). |
| `rangeSource?` | `string` | Reference provenance label: current common category or concrete origin from the exact legacy reader; unresolved excludes linked eligibility. |
| `rangeSourceDetail?` | `string` | Nonblank concrete origin declared on this reference, inferring no category, confidence or permissions. |
| `sourceId` | `string` | Original source-reference identity, without merging repeated references or claiming external file existence. |

### `DocSourceMapArtifactLink`

Mutable artifact-reference metadata; path/language come from top-level artifact declarations, without artifact bodies or complete ranges.

| Field | Type | Meaning |
| --- | --- | --- |
| `artifactId` | `string` | Original artifact-reference identity; unknown identities may retain pathless links with a warning. |
| `confidence?` | `string` | Original reference confidence; none excludes linked eligibility, without computing or inferring confidence. |
| `language?` | `string` | Nonempty language text from the declared artifact node, not overridden by reference extensions. |
| `path?` | `string` | Original nonempty declared-artifact path, without normalization or artifact reads; optional for unknown identities. |
| `rangeSource?` | `string` | Reference provenance label retaining current categories/exact legacy labels; unresolved excludes linked eligibility. |
| `rangeSourceDetail?` | `string` | Nonblank reference-local concrete origin text, descriptive only without loading tools or inferring common categories. |
| `selector?` | `string` | Optional original nonempty selector, neither parsed nor executed and not required for linked eligibility. |

### `DocSourceMapSourceMapLink`

Mutable ordinary position-map link declaration, not a TraceMap instance or loaded mapping data.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Original map declaration identity; permissive legacy omission projection falls back to node:<one-based ordinal>. |
| `kind?` | `string` | Optional nonempty map-kind text, without loading parsers or executing transforms from this field. |
| `language?` | `string` | Optional nonempty language text, serving only as declaration metadata. |
| `path?` | `string` | Original nonempty relative declared path; the current owner requires a safe path without reading files/URLs or sourceMappingURL. |
