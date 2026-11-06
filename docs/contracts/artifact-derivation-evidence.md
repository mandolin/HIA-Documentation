# Artifact Derivation Evidence

`artifact-derivation-evidence` is an independent `0.1.0-draft` sidecar contract
for source and artifact identities, production activities and derivation claims.
The SDK provides its reader through an explicit subpath.

```ts
import { readArtifactDerivationEvidence } from "@hia-doc/plugin-sdk/derivation-evidence";

function inspectEvidence(decodedJson: unknown) {
  const result = readArtifactDerivationEvidence(decodedJson);
  if (result.status === "invalid") return result.diagnostics;
  return { origin: result.evidence.evidenceOrigin, verification: result.verification };
}
```

The reader accepts decoded ordinary JSON data and returns an owned defensive
snapshot. Byte decoding, duplicate-key handling and input authorization belong
to the caller. It performs no file reads or producer execution.

The [plain-data initialization rule](plain-data-initialization.md) provides a
separate exact-profile reader for finite data-event traces.

## Record Structure

| Field | Meaning |
| --- | --- |
| `contract`, `contractVersion` | Exact sidecar identity and version |
| `id`, `producer` | Record identity and recorder name/version |
| `evidenceOrigin` | `producer-recorded` or `static-inferred` |
| `resources` | Unique IDs, source/artifact classification, relative paths and claimed raw-byte SHA256 digests |
| `activities` | Unique IDs, activity types, exact profile references, input and output resource IDs |
| `derivations` | Unique IDs, activity references, scoped input/output IDs and map reference IDs |
| `coverage` | `resource` or `value-links` |
| `mapRefs` | Map artifact references and exact map contract identities |
| `details` | Profile payload objects keyed by every declared activity ID |

Input/output lists contain unique declared IDs. Outputs reference artifacts.
Derivations stay within their activity's input/output sets. Map references point
to declared artifacts. `value-links` coverage requires map references for every
derivation. IDs, paths, collections and snapshot expansion have explicit bounds.

The reader rejects unknown top-level versions and fields. Unknown profile
identities and their JSON payloads remain readable, with profile semantics
unverified. Interpreting a profile requires a reader for that exact profile.

## Verification States

A readable result sets `structure` to `true`. Its `artifactBytes`, `sourceLinks`,
`profileSemantics` and `producerAuthenticity` states remain `false`. Consumers
verify actual resources, maps, profile behavior and recorder trust separately.
The producer-origin field is a claim carried by the record.

Plain-data snapshots reject accessors, serialization hooks, cycles, non-wire
objects, symbol keys and sparse arrays. Limits are 64 nesting levels, 50,000
expanded nodes and 2,000,000 string/key UTF16 units. Reflection through proxies
is outside a sandbox guarantee. Diagnostics contain fixed codes and field
locations, excluding unknown input keys and values.

The structural schema is available from
`@hia-doc/plugin-sdk/artifact-derivation-evidence.schema.json` and
`@hia-doc/schemas/artifact-derivation-evidence.schema.json`. The canonical ID is
`https://mandolin.github.io/HIA-Documentation/schemas/artifact-derivation-evidence-0.1.0-draft.schema.json`.
Reference closure and coverage consistency are additional reader checks.

中文说明。该草案分别保留实际生产记录与静态推导标签。读取器核对结构、引用闭包、
覆盖声明并返回独立快照，实际资源字节、源码链接、初始化规则语义及记录方身份仍需
分别验证。规则版本按精确身份处理，未知规则保留原payload并明确处于未核状态。
契约版本、SDK包版本和系统发行版本分别管理。
