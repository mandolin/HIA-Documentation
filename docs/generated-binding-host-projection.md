# Generated binding host projection

`createGeneratedDocumentationBindingHostProjection(index)` exposes the frozen
`generated-documentation-binding-host-projection@0.1.0-draft` metadata view to
renderers and IDE hosts. Supply an untampered result of
`createGeneratedDocumentationBindingIndex`; this function is not a raw JSON
validator, origin authenticator, or proxy/resource/concurrency sandbox. Access
and iteration failures from unsupported inputs may escape as exceptions.

中文：投影只消费本包建立且未篡改的绑定索引，不验证任意JSON或认证来源。违反此前提可能抛异常；
六项隐私常量只声明字段遗漏，不授予公开权限。

## Identity and status

The projection's own contract/version remain fixed independently of the input
binding version. `bindingContractVersion` reports supported `0.2.0-draft` or
legacy `0.1.0-draft`. An unavailable factory index has empty relations and
retains its `invalid` or `unsupported-version` status and diagnostic summaries.
Unknown/missing binding versions retain the existing legacy metadata fallback;
that label does not certify compatibility. A failed index may still carry a
`sidecarId`, which is an identity rather than a file path or trust signal.

## Field allowlist

| Structure | Preserved fields and meaning |
| --- | --- |
| Projection | Fixed `contract`, `contractVersion`, `bindingContract`; actual/fallback `bindingContractVersion`; original `status`, optional nonempty `sidecarId`; `bindings`, `diagnostics`, `privacy`, `summary`. |
| Binding | `id`, `scopeId`, `bindingRef`, `sourceIntent`, `composition`, its own `quality`, linked `docSourceMapEntryIds`, related `expansions` and `targets`. |
| Binding reference | `kind`, opaque `rootDeclarationId`, ordered `memberPath` segments; never evaluated as an expression. |
| Source intent | `kind` and optional nonempty `field`; no source id/range, locale or unknown extensions. |
| Composition | `relation`, `mergePolicy`, `contributionCount`; no contribution bodies or override contexts. |
| Expansion | `id`, original `order`, its own `quality`, ordered `targetIds`, `instanceKey`. |
| Instance key | Original `status`, `privacySafe`, optional nonempty `origin`; `displayKey` only when the indexed key is nonempty and declared privacy safe. Unstable keys can display; displayability does not imply stability. |
| Target | `id`, its own `quality`, globally linked `docSourceMapEntryIds`; `identity.kind` and nonempty optional `artifactId`, `selector`, `symbolId`. No target range. |
| Quality | Separate `resolutionKind`, `confidence`, `provenanceCoverage`, retained independently for binding, expansion and target. |
| Diagnostic | Indexed `code` and `severity` only, in original order with duplicates; no `message`, `targetPath`, `data` or unknown fields. |

Bindings retain index order. Each binding's expansions/targets retain their
appearance order in the global arrays; `order` does not trigger sorting.
Shared targets appear independently under each related binding. Their linked
entry ids may include entries reached through another binding.

`summary.bindingCount` and `diagnosticCount` use the projected array lengths.
`expansionCount`, `targetCount`, `linkedDocSourceMapEntryCount` and
`unlinkedBindingCount` retain the corresponding index totals. Shared targets
and linked entries count globally, not once per nested copy.
`stableInstanceKeyCount` counts global expansions whose state is exactly
`stable`, independently of displayability.

## Privacy and ownership

The factory independently builds and freezes every output object and array. It
does not mutate/freeze the input sidecar or borrow index containers. TypeScript
collection types are readonly; existing object properties are not uniformly
declared readonly, so compile-time writability is not runtime permission to
mutate a factory result.

The fixed privacy object declares `diagnosticFreeTextIncluded`,
`localsValueIncluded`, `sidecarPathIncluded`, `sourceBodyIncluded` and
`sourceRangeIncluded` as `false`, with `sourcesContentPolicy: "none"`.
Allowed identity strings, selectors, keys and diagnostic codes are retained as
data, without HTML encoding or content redaction. Hosts must encode for their
output context and review what metadata they can publish. No path loading,
expression/locals execution, DOM lookup, network access or workspace write is
performed by this factory.

中文：每个输出容器均独立冻结，输入不改写。允许字段仍可能包含业务元数据；
宿主必须按输出上下文编码并审查公开范围，不能把public-safe当作任意字符串脱敏证明。

## Diagnostic coverage limit

The projection summarizes `index.diagnostics`. At present, extraction
diagnostics in the original binding sidecar's `diagnostics` collection are
validated but are not copied into that index. An empty projected diagnostic
list does not prove that extraction reported no issues. Consumers must inspect
the sidecar's extraction diagnostics separately; propagation and the effect of
extraction errors on index availability still require resolution.

This is unreleased source documentation and verification. It changes no package,
schema or contract version. See the [binding contract and migration](generated-documentation-binding-contract.md).
