# Generated Documentation Binding Contract

## 中文摘要

`generated-documentation-binding@0.1.0-draft` 是独立、中性的 sidecar
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
| Contract version | `0.1.0-draft` |
| Schema dialect | JSON Schema Draft 2020-12 |
| Canonical schema id | `https://mandolin.github.io/HIA-Documentation/schemas/generated-documentation-binding-0.1.0-draft.schema.json` |
| Owner | `@hia-doc/source-linkage` |
| Distribution snapshot | `@hia-doc/schemas/generated-documentation-binding.schema.json` |

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

See also `docs/versioning.md`, `docs/schema-distribution.md`, and
`docs/compatibility-matrix.md`.
