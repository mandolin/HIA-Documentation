# Documentation Presentation Profile Contract

`documentation-presentation-profile@1.0.0` is the renderer-neutral contract for documentation page partitioning,
source reading modes, source asset manifests, theme capabilities, stable presentation identity, privacy, diagnostics,
and compatibility.

The contract is owned by `@hia-doc/core`. It contains no renderer DOM, CSS selectors, templates, parser AST nodes,
source body, filesystem path, credential, cookie, telemetry payload, or private sidecar.

Those exclusions are producer and host obligations. Structural/privacy checks do not comprehensively redact arbitrary
free diagnostic text or prove host behavior/publication consent. See [policy and diagnostic responsibilities](presentation-profile-policy.md).

## Normative Defaults

- Page partition: `multi-page`.
- Source reading mode: `fetch`.
- Fetch fallback: `none`; a failed or unsafe fetch never silently becomes `link` or `embed`.
- Fetch endpoint: same-origin relative URL bound to an explicit revision and SHA-256, SHA-384, or SHA-512 digest.
- Fetch request policy: `credentials=omit`, `mode=same-origin`, `redirect=error`, `cache=default`.
- Source body execution and source-body search indexing: disabled.
- Compatibility: exact supported versions and closed-world properties.

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

See [page and identity reference](presentation-page-identity.md) for all nineteen fields, numeric ordering, explicit
single-page conditions, comparator exclusions and owner route responsibilities.

## Source Assets And Fetch Planning

See [source and plan reference](presentation-source-plan.md) for all thirty-nine source/plan fields, URL/limit boundaries,
plan ownership, and the current distinction between profile status and plan construction status.

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

### JavaScript Input Boundary

The validator, identity comparator (both sides), and fetch-plan builder accept ordinary, finite, acyclic JSON data.
They check property descriptors before cloning and then validate and consume a detached snapshot. Ordinary getters,
custom `toJSON` hooks, array traversal overrides, sparse arrays, non-finite numbers, functions, `undefined`, `BigInt`,
boxed primitives, class instances and cyclic graphs are refused with `PRESENTATION_PROFILE_INVALID`. Reflection,
cloning and validation exceptions use a fixed diagnostic without forwarding the original exception or input text.

Same-realm plain objects, null-prototype records, frozen data and shared acyclic subgraphs are accepted if the complete
profile satisfies the existing rules. Non-enumerable data and Symbol keys are outside the JSON wire model; required
fields must be enumerable own data. Optional fields should be omitted, rather than explicitly set to `undefined`.
Neither the input nor a caller-owned nested policy is frozen or modified. Returned fetch-plan policies remain detached
and deeply frozen. Diagnostic arrays returned by validation/comparison remain ordinary mutable arrays.

This boundary is not a sandbox for Proxy reflection side effects, tampered global intrinsics, concurrent external
mutation or resource exhaustion. A transparent Proxy can pass descriptor inspection and still fail structured cloning;
it is then refused. No arbitrary-depth support or hard memory/time budget is promised. The checks do not independently
authorize publishing admitted diagnostic text, resolve a host origin, fetch source, or verify its digest.

### Runtime State And Event Inputs

`transitionDocumentationSourceReader()` requires primitive strings from the declared state and event sets and reads only
own transition-table entries. The 81 declared pairs retain 15 legal transitions and 66 refusals. Invalid pairs within
those sets preserve their existing diagnostic message; runtime values outside the sets use a fixed
`PRESENTATION_SOURCE_TRANSITION_INVALID` message without string conversion.

Refusal retains the supplied `state`; it does not reset to `idle`. If a JavaScript caller bypasses the TypeScript union,
that echo may itself be an object, Symbol, or other invalid value. It is unvalidated, unsanitized, and not necessarily
serializable. Treat only the diagnostic as the refusal result, and do not publish or process an invalid echo as a valid
reader state. The public TypeScript state/event unions are unchanged.

## Compatibility

Readers admit exactly 1.0.0 and historical 0.1.0-draft, with the exact contract name. Unknown properties are rejected; reading does not migrate inputs. A change to identity
or semantic rules requires a new contract version. Adding instance data that already satisfies this exact schema does not
change the contract version; changing the meaning of an existing field does.

Current writers and schema use 1.0.0; exact historical reading and explicit detached migration retain old schema bytes.
Only the current version rejects whitespace-only token labels. No package version is changed by this source update;
existing published archives remain unchanged until a separately versioned release.

The neutral `@hia-doc/core` contract itself does not implement a browser source reader, renderer projection, theme skin,
page router, cache, search indexer, standalone generator, Portal, or deployment workflow. `@hia-doc/renderer-html` and
`@hia-doc/theme-default` are conforming owner implementations: they generate the exact profile, same-origin content-addressed
assets, a digest-checking plain-text reader, three Portal-local skins, and native disclosure without moving owner DOM/CSS into
this contract.

For exact version types, detached migration, nonblank token labels and owner inventory pairing, see
[version and migration guidance](presentation-profile-migration.md). Historical schema bytes remain unchanged; package publication is separate.
