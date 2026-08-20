# Documentation Presentation Profile Contract

`documentation-presentation-profile@0.1.0-draft` is the renderer-neutral contract for documentation page partitioning,
source reading modes, source asset manifests, theme capabilities, stable presentation identity, privacy, diagnostics,
and compatibility.

The contract is owned by `@hia-doc/core`. It contains no renderer DOM, CSS selectors, templates, parser AST nodes,
source body, filesystem path, credential, cookie, telemetry payload, or private sidecar.

## Normative Defaults

- Page partition: `multi-page`.
- Source reading mode: `fetch`.
- Fetch fallback: `none`; a failed or unsafe fetch never silently becomes `link` or `embed`.
- Fetch endpoint: same-origin relative URL bound to an explicit revision and SHA-256, SHA-384, or SHA-512 digest.
- Fetch request policy: `credentials=omit`, `mode=same-origin`, `redirect=error`, `cache=default`.
- Source body execution and source-body search indexing: disabled.
- Compatibility: exact draft version and closed-world properties.

`single-page` is an explicit compatibility partition. `none` is an explicit privacy state and is not one of the three
source reading modes used for product parity (`fetch`, `embed`, and `link`).

The neutral profile does not prescribe an owner route layout. The Portal owner nevertheless provides a standalone
no-script index and one page per topic for its default multi-page projection. This additive fallback reuses stable topic
identity; it does not create a second semantic document model. In no-script output, `fetch` may degrade only to the same
build-generated public asset as a normal link, never to an external locator or embedded private body.

## Identity

`topicId`, `fragmentId`, `navigationId`, and `relationIds` remain stable across source mode, skin, scheme, and partition
variants. `pageId` and the resulting canonical reference may change only when the explicit page partition mode changes.
Within one partition mode, source or theme variants cannot change page identity.

Arrays are deterministic data, not implicit identity. Topic order is explicit, and identity comparison joins topics by
`topicId`.

## Source Assets And Fetch Planning

The manifest contains public logical identities, a safe relative URL, revision, media type, optional public size facts,
and integrity metadata. It never contains source text.

`createDocumentationSourceFetchPlan()` validates a complete profile and returns a deeply frozen policy/data plan. It does not
resolve a document origin or perform a request. A host must still:

1. resolve the relative URL against its approved same-origin documentation root;
2. enforce Content Security Policy and configured byte, line, and timeout limits;
3. map access, status, network, integrity, and abort outcomes to explicit reader events;
4. verify the digest before entering `ready`;
5. decode and render only explicitly public source content without executing it.

The state machine is:

```text
idle -> loading -> ready | empty | denied | not-found | integrity-error | network-error | aborted
```

Every terminal state returns to `idle` only through `reset`. Invalid transitions preserve the current state and emit
`PRESENTATION_SOURCE_TRANSITION_INVALID`.

## Theme Capability Boundary

A profile declares at least three skin identities, supported light/dark/system schemes, a semantic token contract, and
capability identities such as native disclosure or source reader support. It does not standardize private markup or CSS.
A selected skin must support the selected scheme and every required capability.

Skin names in test fixtures are synthetic. Standalone and Portal owners define their public skin names and implementations
in their own adoption releases.

## Validation

The Draft 2020-12 schema validates the wire shape. `validateDocumentationPresentationProfile()` additionally enforces
closed-world fields, deterministic ordering, identity uniqueness, same-origin relative paths, digest length, selected
theme capabilities, source/privacy consistency, and safe diagnostics.

`compareDocumentationPresentationIdentity()` detects identity drift across generated profile variants. Schema validation
alone does not replace these owner runtime checks.

## Compatibility

Draft consumers must match the contract name and version exactly. Unknown properties are rejected. A change to identity
or semantic rules requires a new contract version. Adding instance data that already satisfies this exact schema does not
change the contract version; changing the meaning of an existing field does.

The neutral `@hia-doc/core` contract itself does not implement a browser source reader, renderer projection, theme skin,
page router, cache, search indexer, standalone generator, Portal, or deployment workflow. `@hia-doc/renderer-html` and
`@hia-doc/theme-default` are conforming owner implementations: they generate the exact profile, same-origin content-addressed
assets, a digest-checking plain-text reader, three Portal-local skins, and native disclosure without moving owner DOM/CSS into
this contract.
