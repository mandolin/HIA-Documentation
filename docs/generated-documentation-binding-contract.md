# Generated Documentation Binding Contract

## 中文摘要

`generated-documentation-binding@0.2.0-draft` 是独立、中性的 sidecar
contract，用于记录一条上游文档意图如何声明、展开并关联零个或多个下游生成目标。
它不属于 Pug AST、HTMDoc core symbol 或 ordinary source map；Pug、Sass、Vue、
JSX、Meta 等 adapter 可分别提供 parser/scope 语义后复用它。

默认隐私边界是 `sourcesContentPolicy: "none"`：不得写入源码正文、runtime
locals 值、绝对/UNC 路径、digest 或 secret。adapter expression 只由 adapter
解析和 resolve，contract 不执行表达式。

## Contract identity

| Field | Value |
| --- | --- |
| Contract | `generated-documentation-binding` |
| Contract version | `0.2.0-draft` source draft; exact legacy `0.1.0-draft` retained |
| Schema dialect | JSON Schema Draft 2020-12 |
| Canonical schema id | `https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.2.0-draft.schema.json` |
| Owner | `@hia-doc/source-linkage` |
| Distribution snapshot | `@hia-doc/schemas/generated-documentation-binding.schema.json` |

Source changes below are unreleased. Package versions and the existing npm
contents are unchanged. Binding remains a draft; no binding `1.0.0` commitment
is implied. The old canonical URL retains its original bytes.

## Exact version pairs and coordinated migration

### Binding-index options and prerequisite index

`createGeneratedDocumentationBindingIndex(sidecar, { docSourceMapIndex, path })`
requires a pre-built `createDocSourceMapIndex` result whose nested arrays and
entries remain untampered. Options and prerequisite headers must be same-realm
plain or null-prototype records. The required index reference, optional primitive
string path and eight consumed header fields are read through own data
descriptors only; known accessors/wrong types/reflection failures reject without
executing ordinary getters. Unknown extensions remain unread.

The consumed header checks cover contract, optional id/version, status,
diagnostics/entries/sidecar arrays and an entry count matching the entries array.
These are **shallow checks**, not origin authentication or full schema/graph
validation. Header snapshots precede sidecar processing; arrays/entries remain
borrowed references, without deep copying or freezing the prerequisite input.

Invalid options/headers return a frozen empty `invalid` result with the existing
`GENERATED_DOCUMENTATION_BINDING_INDEX_DOC_SOURCE_MAP_UNAVAILABLE`, without
partial path or unchecked diagnostic/header echoes. Valid prerequisite error
diagnostics and unsupported-version states retain prior propagation. Valid
empty/whitespace paths and unsanitized context retain prior behavior. Pairing,
ordering, instance keys and frozen bidirectional results are unchanged.

中文：选项与已消费头部采用自有数据快照，错误输入不抛出普通属性读取异常或回显部分上下文；
嵌套数组/条目仍要求来自未篡改的工厂索引。浅层形状检查不认证来源，也不保证对嵌套访问器、
代理、资源消耗或并发篡改提供沙箱。此修复尚未发布，不提升绑定草案或包版本。

### Version pairs

| Binding | Paired documentation source map | Reader |
| --- | --- | --- |
| `0.1.0-draft` | `0.1.0-draft` | Retained legacy pair |
| `0.2.0-draft` | `1.0.0` | Current source pair |

The current binding schema changes its root version, map-linkage version and
`compatibility.minimumConsumerContractVersion`. The deterministic locals input
remains `generated-doc-locals@0.1.0-draft-input`. Mixed pairs and unknown exact
versions are refused; matching ids do not establish version compatibility.

```ts
import { migrateGeneratedDocumentationBindingBundle } from "@hia-doc/source-linkage";

const result = migrateGeneratedDocumentationBindingBundle({
  docSourceMap: legacyMap,
  bindingSidecars: allDeclaredSidecars
});
if (result.bundle) {
  // Inspect the complete result before deciding whether/how to persist it.
  consume(result.bundle.docSourceMap, result.bundle.bindingSidecars);
}
```

The pure memory API validates the entire input pair, creates independent copies,
updates only defined version fields and reviewed map provenance, then validates
the result. `status` is `migrated`, `already-current`, `invalid` or
`unsupported-version`. A failure never returns `bundle`. Already-current inputs
also return independent copies; inputs and their array order are preserved.

Supply every declared sidecar exactly once. Ids, paths, map back-references,
binding/expansion/target edges and group-local source/artifact references must
resolve. The API does not load external symbol artifacts or infer expressions.
Unknown JSON artifact extensions and diagnostic content are preserved, while
unknown wrapper fields are not returned. Standalone `migrateDocSourceMap` still
refuses legacy binding associations.

迁移成功仅表示本 API 所检查的完整配对与引用边界成立，不授予公开或写入权限。
输出保留允许的工件内容；调用者负责持久化事务、并发控制和隐私复核。
旧生产器可以继续输出旧配对，无需自动重写。

The Pug source producer now uses its binding extractor's existing
`source:pug:${workspaceRelativePath}` identity in newly generated maps as well.
It retains case, punctuation, Unicode and hierarchy; `/` is the separator and
the id is an opaque reference rather than a URL. Binding/scope/instance/target
identities and content remain unchanged. Rebuild complete artifact groups with
the corrected producer before migrating them. Earlier saved maps used a lossy
lowercase slug; those legacy pairs remain readable but unclosed groups still
refuse migration. The migration API does not guess or rewrite those identities.
This is an unreleased producer source correction, not an npm package update.

## Neutral model

The root contains four required collections:

| Collection | Purpose |
| --- | --- |
| `bindings` | One declaration of an upstream documentation intent, normalized binding reference, lexical scope, resolution quality, and composition context. |
| `expansions` | Zero or more ordered instances for a binding. Each records a stable/unstable/missing instance-key result and target ids. |
| `targets` | Generated artifact or documentation-symbol identities. No adapter AST node is required or permitted by the neutral model. |
| `diagnostics` | Versioned `GDB_*` extraction diagnostics with fixed severities. |

`scope.id` uses the frozen `gdb-scope/v1/{adapter}/{encoded-source-id}#{encoded-ancestry}/{declaration-slot}` shape. Alias names are metadata only; they are not identity.

`resolution` always contains three independent dimensions:

- `resolutionKind`: `exact`, `inferred`, `ambiguous`, or `unresolved`.
- `confidence`: `high`, `medium`, `low`, or `none`.
- `provenanceCoverage`: `source-only`, `source-and-generated`, or `generated-only`.

Only the frozen resolution/confidence pairs are valid. In particular,
`generated-only` is provenance coverage, not a resolution kind.

## Instance keys and composition

`expansions[].instanceKey` distinguishes `stable`, `unstable`, and `missing`.
Stable keys may come from explicit instance-key references, stable object keys,
Meta/schema ids, or target ids. The array-index fallback is explicitly
`unstable` and requires `GDB_INSTANCE_KEY_UNSTABLE`; unavailable keys require
`GDB_INSTANCE_KEY_MISSING`.

Each binding also carries neutral `composition` metadata. Ordered contributions
retain `sourceRef` and `overrideContext`, while merge policies describe
nearest-child replacement, ordered append/prepend composition, or a same-
precedence singleton conflict. `include` remains composition rather than
inheritance.

## Deterministic locals and privacy

`deterministicLocalsPolicy` is a policy/reference summary only. It records the
frozen `generated-doc-locals@0.1.0-draft-input` identity, adapter id, optional
input id, binding allowlist, privacy classification, fixed limits (depth 12,
10,000 entries, 65,536 string bytes), and prohibited sources. It never embeds
locals values.

The owner validator rejects serialized `sourceBody`, `sourceText`,
`sourcesContent`, runtime values, digest values, and secret values. It also
rejects unsafe sidecar paths, invalid resolution pairs, unknown cross-
collection references, and duplicated instance keys in one expansion scope.

## doc-source-map sidecar linkage

`doc-source-map@0.1.0-draft` may add a `generatedBindingSidecars` declaration:

```json
{
  "id": "sidecar:card",
  "contract": "generated-documentation-binding",
  "contractVersion": "0.1.0-draft",
  "path": "dist/card.generated-doc-binding.json"
}
```

An individual doc-source-map entry may use `generatedBindingRefs`, containing
only `bindingId` and `sidecarId`. This is intentionally a reference edge, not
an embedded bindings/expansions/targets model. The read-only
`@hia-doc/source-linkage` bidirectional index consumes those edges together
with the explicit sidecar; it does not load paths or embed the model back into
the ordinary map.

## Compatibility

Contract versions and package versions are independent. Consumers of this
draft must ignore unknown optional fields, while a breaking field/type/meaning
change requires a new `contractVersion` and a new canonical schema `$id`.
Adding an optional field still requires fixture, compatibility-matrix, owner-
validator, and release-gate updates.

The owner reader accepts ordinary finite acyclic JSON data, including shared
subgraphs. It rejects accessors without executing them, malformed collection
items, declared enum/string violations, unsafe integer coordinates/orders,
reversed ranges and forbidden serialized privacy fields. Omitted columns compare
as one. Privacy scanning is iterative and its fixed diagnostic path does not
repeat unknown extension keys. Index headers use own data descriptors after
validation, avoiding a rejected getter being read again.

This owner validator is not a general JSON Schema engine or a proof of every
cross-artifact semantic rule. Unknown optional JSON fields are ignored by the
reader and retained by migration. Non-enumerable memory properties are outside
the JSON wire representation; required fields must survive copying and result
validation. Stateful proxies, hostile resource use and concurrent mutation are
not sandboxed. Optional caller-supplied diagnostic paths are not redacted.

The host projection keeps its own `0.1.0-draft` identity and reports the actual
supported binding version. An unavailable index yields the existing safe empty
projection; it does not certify an unknown input version.

See the [host projection field and ownership reference](generated-binding-host-projection.md)
for exact allowlists, counters, ordering, independent freezing and privacy
limits. Permitted strings are not redacted or HTML-encoded. The projection
summarizes indexed diagnostics; extraction diagnostics in the sidecar are not
currently propagated to that index and must be inspected separately.

See also `docs/versioning.md`, `docs/schema-distribution.md`, and
`docs/compatibility-matrix.md`.
