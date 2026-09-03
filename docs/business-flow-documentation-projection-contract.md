# Business Flow Documentation Projection Contract

`business-flow-documentation-projection@0.1.0-draft` is a neutral, non-rendering projection over validated
`business-flow-documentation@0.1.0-draft` facts. It is owned by `@hia-doc/core` and distributed as a Draft 2020-12 JSON
Schema by `@hia-doc/schemas`.

## Shared Facts And Views

The payload contains one `sharedFacts` collection and two reference-only views:

- `humanLinear` presents each selected control-flow node once in deterministic depth-first order;
- `aiGraph` lists typed node, edge, evidence, and code-binding references for graph consumers;
- both views resolve every identity through the same flow, node, relation, evidence, and code-binding objects.

The human traversal starts at the declared entry node. Outgoing control relations are visited by explicit `order`, with the
relation id as the tie-breaker. First-visit semantics ensure that a merge appears once. Human items add a zero-based position,
a localized label, and stable refs; position and label never become business identities.

## Explicit Selection And Locale

`produceBusinessFlowDocumentationProjection()` requires an explicit, non-empty set of flow ids, an explicit locale, and the
literal `public` audience. Locale resolution uses an exact requested label when available and otherwise only the selected
flow's declared default locale. The selected strategy and resolved locale are recorded without changing any identity.

No system locale, external language resource, file, network, source parser, runtime trace, or target discovery participates in
projection.

## Privacy And Refusal

Projection is whole-selection, fail-closed. Every selected flow, every node in it, and every referenced evidence item must be
`public`. If any is non-public, the result contains one safe diagnostic and no projection, partial graph, placeholder, or count.

The contract contains no source body/range, absolute path, runtime payload, personal identity, credential, or real target
identity. AI consumers receive no hidden content beyond what the human projection is allowed to reference.

## Validation And Compatibility

`validateBusinessFlowDocumentationProjection()` reuses the source contract's graph validation and reconstructs both canonical
views to verify exact flow/node/relation/evidence/code-binding parity. Outputs are deeply frozen and the stable JSON form has no
timestamp, so the same canonical facts and options produce byte-identical JSON.

Draft consumers must match the contract and version exactly. Unknown properties and kinds are rejected. Migration must be an
explicit, pure, identity-preserving operation. This contract is graph-ready data, not JSON-LD, RDF, PROV, BPMN, Mermaid, DOT,
SVG, canvas, Portal markup, or an editable workflow model.
