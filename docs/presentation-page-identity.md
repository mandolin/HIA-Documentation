# Presentation Pages And Stable Identity

`@hia-doc/core` exposes page partition and identity facts through
`documentation-presentation-profile@1.0.0`. These are logical declarations, not a router, document hierarchy or
filesystem index. Validate a complete profile before comparing it. See the
[contract](documentation-presentation-profile-contract.md) for source, theme, privacy and JavaScript input boundaries.

## Modes And Values

`DOCUMENTATION_PRESENTATION_PAGE_MODES` contains `multi-page` and `single-page` in that order;
`DocumentationPresentationPageMode` is the corresponding union. The renderer's `split-site` configuration is an owner
alias, not a neutral contract value. The tuple is readonly in TypeScript but is not frozen at runtime: do not mutate the
shared exported vocabulary.

Logical identity strings are case-sensitive, one to 256 characters, and match `^[A-Za-z0-9][A-Za-z0-9._:-]*$`.
Ordered identity arrays use ascending ASCII string order, without locale collation or normalization.
Validation does not insert missing defaults, sort arrays, allocate identities or resolve references.

## Topic Projection

All eight `DocumentationPresentationTopicProjection` fields are required:

| Field | Meaning and runtime requirement |
| --- | --- |
| `topicId` | Exact join key, unique among topics. Array position is not identity. |
| `fragmentId` | Stable fragment identity, unique among fragments in the profile. |
| `navigationId` | Stable navigation identity, unique among navigation identities in the profile. |
| `pageId` | Projected page identity; multiple topics may share it. |
| `canonicalReference` | Exactly `pageId#fragmentId`; a logical reference, not proof of a route, anchor or file. |
| `topicKind` | Logical kind identity; membership in `pageTopicKinds` is not required by the neutral validator. |
| `relationIds` | Zero to 256 unique, sorted logical relation identities. Topics may share them; external relation existence is not checked. |
| `order` | Nonnegative safe integer; the topic array must be strictly increasing numerically. Gaps are allowed. |

Topic, fragment and navigation uniqueness are separate domains; equal spelling across those domains is allowed.
`order` ranges from zero through `Number.MAX_SAFE_INTEGER` (9007199254740991). Numeric strings, fractions, negative or
unsafe integers are refused. Comparisons use numeric order, including transitions from ten to eleven or more digits;
duplicate order is invalid even if topic ids differ.

The schema's `integer`/`minimum: 0` declaration does not impose JavaScript safe-integer precision, uniqueness of `order`
or cross-field reference equality. Use the runtime validator as well as the distributed schema. Older implementations
used a ten-character padded string key and can reject numeric ascending orders or accept descending orders across
digit widths; regenerate or revalidate affected profiles with a build containing this correction.

## Page Partition

`DocumentationPresentationPagePartition` has six fields:

| Field | Meaning and runtime requirement |
| --- | --- |
| `defaultMode` | Required literal `multi-page`, even when the actual mode is `single-page`. No automatic default is inserted. |
| `mode` | Actual `multi-page` or `single-page` mode. |
| `leafTopicPolicy` | Required `fragment` or `page` declaration. Does not itself infer parentage or routes. |
| `pageTopicKinds` | Zero to 256 unique, sorted logical kind identities; may be empty and need not cover topic kinds. |
| `singlePageId` | Required and equal to every topic's `pageId` in `single-page`; omitted in `multi-page`. |
| `topics` | One to 10,000 projections with increasing numeric order and the identity uniqueness rules above. |

These interfaces remain mutable structural TypeScript types. In particular, the optional `singlePageId` field is not a
discriminated union: a value can compile yet violate the single-page condition. Omit optional fields rather than assigning
`undefined`. The validator uses a detached snapshot and leaves caller-owned arrays and objects unchanged.

## Identity Policy And Comparison

All five `DocumentationPresentationIdentityPolicy` fields are fixed declarations:

| Field | Required value |
| --- | --- |
| `stableFields` | Exact tuple `topicId`, `fragmentId`, `navigationId`, `relationIds`, in that order. |
| `pageIdProjection` | `partition-mode-only`. |
| `sourceModeAffectsIdentity` | `false`. |
| `skinAffectsIdentity` | `false`. |
| `schemeAffectsIdentity` | `false`. |

`compareDocumentationPresentationIdentity(reference, candidate)` validates both complete profiles first. On invalid
input it returns input diagnostics rather than attempting a partial comparison. For valid profiles it joins by `topicId`,
requires the same topic set, and compares `fragmentId`, `navigationId` and the ordered `relationIds` arrays.

When modes match it also compares each topic's `pageId` and `canonicalReference`. When modes differ it exempts only
those two fields: changing navigation, fragment or relation identities still produces `PRESENTATION_IDENTITY_DRIFT`.
Missing/added/renamed topics also produce drift. The comparison is applicable in either direction between modes.

`profileId`, `order`, `topicKind`, `leafTopicPolicy` and `pageTopicKinds` are outside this comparator's identity set.
A valid reorder or kind/policy change can therefore compare equal. Equality is not proof of equivalent content, route
behavior, source access, host rendering or publication permission. A policy declaration does not prove a host obeys it.

## Renderer Responsibility And Compatibility

The HTML Portal owner sorts its entries by entry identity, assigns consecutive order values, creates logical page/topic
identities and retains its own route mapping. The neutral validator checks declarations and projections; it does not
enforce a namespace/type hierarchy, kind-driven route allocation, relation graph closure or actual route availability.

The numeric-order correction preserves the declared order domain. Current writers/schema use 1.0.0 and readers also
admit exact historical 0.1.0-draft. See [version and migration guidance](presentation-profile-migration.md).
Package versions and previously published archives are unchanged by this source update.
