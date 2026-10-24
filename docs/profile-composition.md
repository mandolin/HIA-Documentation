# Documentation Profile Composition

The documentation profile runtime consumes the exact `0.1.0-draft` schema identity. Composition checks do not promote that contract, official profile semantics or npm package versions to a stable release.

## Query ownership and defaults

| API | Result and default behavior |
| --- | --- |
| `getHiaProfile` | Original registered profile reference, or `undefined`; raw metadata can remain available after semantic errors. |
| `listHiaProfileIds` | New array sorted by JavaScript string order. |
| `listHiaProfileTags` | New array retaining original tag references; `includeInherited` defaults to `false`. Tag names use the host's `localeCompare` ordering. |
| `resolveHiaProfileTag` | Original query-root profile, starting tag and terminal tag references plus a new `aliasChain`; `includeAliases` defaults to `false`. |
| `getHiaProfileRule` | Original inherited rule declaration, or `undefined`; does not execute rules. |
| `getHiaProfileDiagnostic` | Original inherited diagnostic declaration, or `undefined`; does not emit a user diagnostic. |

Callers must keep registered profiles unchanged while in use and rebuild/revalidate the set after edits. Query results are metadata references, not permission to publish source content or proof that every diagnostic has been accepted.

## Inheritance cycles

Profile-set construction checks the complete known inheritance graph and reports `HIA_PROFILE_EXTENDS_CYCLE` for ancestor back edges. Diagnostics include the closed profile-ID path and a numeric parent-reference location. Shared ancestors, diamonds and repeated references to a completed parent are not cycles. Missing parents retain the separate `HIA_PROFILE_EXTENDS_UNKNOWN` diagnostic.

Semantic queries refuse a reachable inheritance cycle: inherited tag lists return `[]`, while tag resolution and rule/diagnostic lookups return `undefined`. Local tag listings and raw profile metadata remain available for inspection. A cycle in an unrelated component does not invalidate queries in a separate acyclic component; callers should still inspect the complete set's diagnostics before using it.

Traversal uses an explicit stack, avoiding recursive call-stack limits on deep finite graphs. This is not a resource sandbox or an unlimited-size guarantee. Input validation still applies before registration.

## Alias termination

A nonempty `aliasFor` link participates in resolution. Every link must reach an existing terminal tag. `HIA_PROFILE_ALIAS_TARGET_UNKNOWN` reports a missing target, and `HIA_PROFILE_ALIAS_CYCLE` reports a cyclic chain, including a prefix that enters a cycle. Each failing effective alias in a query root can have its own diagnostic; diagnostic counts are not counts of independent cycles. Local failures point to the local numeric tag index, while inherited composition failures point to the query root's `extends` field.

Invalid chains return `undefined` even when aliases are enabled. With aliases disabled, aliases remain hidden. Valid enabled aliases return the exact visited alias names in `aliasChain`, excluding the canonical endpoint. Unrelated valid tags/aliases can still be inspected when another alias component is invalid.

Registry keys are literal strings stored in maps; names such as `constructor` and `__proto__` do not select JavaScript prototype properties. Diagnostic context can include valid caller-supplied IDs/names and is not automatically public-safe.

## Composition precedence

All inherited tag listings, individual tag/alias-target queries, rule queries and diagnostic queries use the same composition rule:

1. Traverse parent references in `extends` order, visiting ancestors before descendants.
2. Apply each profile identity once. A shared ancestor or repeated parent reference is not applied again through another path.
3. For each tag name, rule ID or diagnostic code, later **actual declarations** replace earlier declarations. Apply the query root's local declarations last.
4. Replace the complete declaration object; do not merge omitted fields from an overridden declaration.

| Graph | Winning declaration for `x` |
| --- | --- |
| Child extends `[A, B]`, both declare `x` | B |
| Child declares its own `x` | Child |
| A and B extend Base; A changes `x`, B has no local `x` | A; Base is not reapplied through B |
| A and B extend Base; both change `x` | B |
| Child extends `[A, B, A]`, both declare `x` | B; the repeated A identity is not applied again |

Alias termination is checked in each query root's composed view. Two individually valid branches can combine into an alias cycle; that root receives errors and alias resolution returns `undefined`. A local canonical declaration can break that combined cycle. This does not alter the original parent definitions.

### Migration from earlier draft queries

Earlier single-tag and alias-target lookup used the first traversal match, which could disagree with inherited listings and rule/diagnostic queries. They now select the same winning declarations. Existing parent-order-sensitive consumers should inspect their duplicate keys and run profile-set validation before using the result. Schema and package version identifiers are unchanged by this correction.

Layer names (`stable`, `compat`, `bridge`, `extension`) describe semantic roles; they do not automatically sort the graph. Mapping/capability deep merging, version-range resolution, remote discovery and executable rule evaluation are outside these APIs.

See [input validation](profile-input-validation.md) and [official profile distribution](profile-distribution.md).
