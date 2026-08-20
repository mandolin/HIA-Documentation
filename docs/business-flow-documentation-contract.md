# Business Flow Documentation Contract

`business-flow-documentation@0.1.0-draft` is a neutral, non-executable contract for owner-authored business-flow
documentation facts. It is owned by `@hia-doc/core` and distributed as Draft 2020-12 JSON Schema by
`@hia-doc/schemas`.

## Model

The canonical payload has six fact collections:

- `flows`: stable flow identity, default locale, privacy, labels, one entry, and one-or-more ends;
- `nodes`: start, step, decision, merge, end, actor-role, and artifact-type facts;
- `relations`: sequence, branch, exception, performed-by, reads, writes, and emits edges;
- `evidence`: metadata-only logical evidence with no body or physical locator;
- `codeBindings`: non-executing links from business nodes to caller-known documentation entries;
- `diagnostics`: the fixed `BFD_*` diagnostic vocabulary.

The P1 control graph is acyclic. It supports explicit branch, merge, and exception paths, but not loops, parallel
fork/join, subflows, timers, message choreography, executable conditions, BPMN round-trip, or automatic discovery.

## Identity And Authorship

Every identity is an opaque, owner-provided stable key. Labels, locale, array position, source path/range, digest, and
layout coordinates never define identity. Array order is non-semantic; outgoing control relations use a zero-based,
contiguous `order` only for deterministic narrative order.

Business nodes and relations are `author-provided`. Code bindings are `producer-resolved`. The producer validates
closed vocabularies, references, reachability, acyclicity, order, and diagnostics. It does not infer business truth from
call graphs, runtime traces, source text, or low-confidence candidates.

## Quality, Evidence, And Privacy

`resolution`, `confidence`, and `provenance` are independent dimensions. A resolved reference does not imply high
confidence, and confidence never substitutes for provenance. Evidence is metadata-only and uses stable logical ids.

Privacy classes are `public`, `internal`, and `restricted`; authors should default to `internal`. The wire privacy object
fails closed for source body/range, absolute path, runtime payload, personal identity, credentials, and real target
identity. Actor nodes represent roles, not people; artifact nodes describe types, not payloads.

## Pure Validation And Production

`validateBusinessFlowDocumentation()` checks the exact closed-world wire shape plus cross-collection semantics.
`produceBusinessFlowDocumentation()` accepts only a caller-supplied set of documentation-entry ids for code-binding
resolution, then returns deeply frozen canonical facts, byte-stable JSON, and a count-only summary. It performs no file
or network access, expression execution, source parsing, target discovery, write, rendering, or Portal projection.

The canonical facts preserve the identity, typed relation, explicit order, quality, evidence, and privacy information
needed by later human-linear and AI graph-ready projections. Those projections are not part of this P1 runtime.

## Compatibility

Draft consumers must match the contract and version exactly. Unknown properties and unknown kinds are rejected.
Migration requires an explicit, pure, identity-preserving operation; no generic relation fallback is allowed. Existing
project-relation, source-linkage, generated-binding, renderer, and Portal contracts are unchanged.
