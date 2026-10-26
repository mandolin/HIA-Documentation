# Generated documentation binding index

`createGeneratedDocumentationBindingIndex(sidecar, { docSourceMapIndex, path? })`
combines an explicitly supplied sidecar with an untampered prerequisite index
from `createDocSourceMapIndex`. It loads no paths, evaluates no expressions or
locals, and writes no workspace data. Exact current and legacy pairings, owner
validation and local references are described in the [binding contract](generated-documentation-binding-contract.md).

The resulting metadata index is not a lossless artifact copy or the
[public-safe host projection](generated-binding-host-projection.md). It includes
source identities/ranges. Use [bundle migration](generated-documentation-binding-contract.md#exact-version-pairs-and-coordinated-migration)
for complete artifacts; review metadata before publication.

中文：索引是显式内存配对后的元数据摘要，不读取路径、不执行表达式、不改输入。
它含来源身份及范围，不能替代保真工件、公开许可或独立宿主投影。

## Index fields

| Fields | Meaning |
| --- | --- |
| `contract`, `contractVersion?`, `sidecarId?` | Fixed binding contract name and original nonempty version/id labels. Failed inputs may retain unknown version labels or omit them; metadata does not certify compatibility. |
| `status`, `diagnostics` | Existing `available`, `invalid`, `unsupported-version` status and ordered diagnostic list. Validated extraction errors follow existing empty-invalid refusal; see the [propagation reference](generated-binding-host-projection.md#extraction-diagnostic-propagation). |
| `bindings`, `expansions`, `targets` | Frozen normalized collections in sidecar declaration order. Expansions are not sorted by their numeric `order`. |
| `bindingCount`, `expansionCount`, `targetCount` | Global normalized collection lengths, not sums of nested host copies. Declared targets may have no expansion references. |
| `docSourceMapEntryCount` | All entries in the paired map for an available index, including entries with no binding relation. |
| `linkedDocSourceMapEntryCount` | Unique map entries linked to any binding, counted once across bindings. |
| `unlinkedBindingCount` | Bindings without linked map entries, not bindings without targets. |

Failed factory indexes have empty relation collections/counts. `contractVersion`
and `sidecarId` can still describe the rejected input. Diagnostics retain their
existing caller context, which is not redacted.

## Node fields

| Node | Retained fields and relations |
| --- | --- |
| Binding | `adapterId`, `id`, `bindingRef`, `sourceIntent`, `scope`, own `resolution`, `composition`; linked `docSourceMapEntryIds`, `expansionIds`, `targetIds`. Entry ids follow map traversal; target ids follow first-seen expansion edges. |
| Expansion | `bindingId`, `id`, `scopeId`, original nonnegative safe-integer `order`, `instanceKey`, own `resolution`, ordered `targetIds`. |
| Target | `id`, `identity`, own `resolution`; `bindingIds`, `expansionIds`, `docSourceMapEntryIds`. Binding edges follow first-seen expansion order; linked entries aggregate through those bindings and deduplicate first-seen identities. |
| Binding reference | Original `kind`, `rootDeclarationId`, frozen normalized `memberPath`. No expression or adapter AST execution. |
| Source intent | `kind`, nonempty optional `field` and `sourceId`, normalized optional `sourceRange`. Locale and unknown extensions are not retained. |
| Scope | `adapterId`, `declarationSlot`, `id`, `sourceId`, frozen ordered `semanticAncestry`. Alias lists are not retained or used as identity. |
| Resolution | Independent `resolutionKind`, `confidence`, `provenanceCoverage`; no combined score or inference between dimensions. |
| Instance key | Original `status`, strict boolean `privacySafe`, nonempty optional `key` and `origin`. Stability is distinct from displayability or publication approval. |
| Target identity | `kind`, nonempty optional `artifactId`, `symbolId`, `selector`, normalized optional `range`. A valid artifact-only target can omit `symbolId`. Selectors remain data. |
| Composition | Original `relation`, `mergePolicy`, ordered `contributionIds`; source/override contexts and contribution bodies are excluded. |

Normalized source/target ranges retain one-based coordinates and omitted
columns. This index does not redefine inclusive/exclusive endpoints. Source
ids, scope ids, selectors and other permitted strings remain opaque unredacted
data, not file access or DOM query instructions.

## Four exact-identity queries

| Function | Matching and result order |
| --- | --- |
| `findGeneratedTargetsForBinding(index, bindingId)` | Exact binding identity; targets in first-seen expansion-edge order. |
| `findGeneratedBindingsForTarget(index, targetId)` | Exact target identity; bindings in first-seen expansion-edge order. |
| `findGeneratedBindingsForTargetSymbol(index, symbolId)` | Exact optional target-symbol identity; traverses targets in declaration order and deduplicates binding edges in first-seen order. |
| `findGeneratedBindingsForDocSourceMapEntry(index, entryId)` | Exact linked entry identity; filters bindings in binding declaration order. |

The unreleased source checks that every identifier is a primitive string before
lookup. Nonstrings, including `undefined`, return a frozen empty list without
coercion. In particular, an omitted query cannot match an omitted target
`symbolId`. Strings retain whitespace, Unicode and case; no trimming, case
folding or normalization is performed. Empty strings and unknown identities
have no matching factory nodes.

Each call returns a new frozen list borrowing the original frozen indexed nodes.
This differs from the host projection, which constructs independent containers
and selects targets in global declaration order. These existing orderings are
deliberately not unified. Failed factory indexes return empty query lists;
inspect their status/diagnostics separately rather than treating emptiness as
proof of success.

The index must remain untampered. These helpers neither validate arbitrary
indexes nor sandbox nested getters/proxies, resources or concurrent mutation;
access/iteration exceptions from violated preconditions may escape. No new
query diagnostic, public export, contract/schema/package version, dependency or
range-endpoint rule is introduced.

中文：四查询新增标识符类型检查，非string为空，不把undefined当缺省symbolId的匹配条件。
合法字符串保持原值；返回新冻结列表但借用原索引节点。四种顺序与宿主目标声明顺序各有来源，不擅自统一。
