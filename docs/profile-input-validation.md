# Documentation Profile Input Validation

`@hia-doc/profile` exposes a `documentation-profile@1.0.0` source definition candidate and reads exactly `1.0.0` and legacy `0.1.0-draft`. Its schema identity, npm package version, catalog version and each individual `profileVersion` are separate. The new root does not graduate the seven bundled official domain profiles or publish a stable npm release.

## Validation boundary

`validateHiaProfile(value, options?)` checks ordinary JSON, the exact supported schema version, declared field shapes and existing local semantics such as unique tag/rule/diagnostic IDs and `messages.default`.

- Required fields must be present. Declared optional fields are checked when present, including every string-list item and localized message value.
- Open extension fields remain allowed when they contain ordinary JSON. Empty arrays and empty localized message strings remain valid where the schema permits them. `optionsSchema`, capabilities and domain metadata are not executed or interpreted.
- Standard dense arrays, ordinary objects, null-prototype objects and shared acyclic subgraphs are allowed. Cycles, non-finite numbers, undefined, functions, symbol values, BigInt, accessors, hidden object data, custom serialization hooks and class instances are rejected.
- Symbol keys are outside the JSON wire model. Reflection errors become an invalid-input diagnostic. Proxy reflection can have caller-controlled side effects: this validator is not an execution sandbox.
- Validation does not mutate, freeze, normalize or migrate its input. An empty diagnostic array proves only this documented validation scope.

`options.path` is caller-owned context retained in diagnostic locations. Invalid schema-version and profile-ID messages do not echo the rejected values. Valid domain identifiers and trusted caller context can still appear in diagnostics; callers remain responsible for public-safe output.

## Profile-set admission and ownership

`createHiaProfileSet({ profiles })` requires an own enumerable data `profiles` property holding a standard dense array. It reads array data descriptors without invoking caller-defined iterators or element getters. Invalid containers return an empty map with `HIA_PROFILE_SET_INVALID`.

Each member is validated before registration. Invalid members contribute diagnostics and are skipped; they cannot reserve an ID or prevent valid peers from being registered. Duplicate IDs retain the first **valid** entry and produce `HIA_PROFILE_DUPLICATE_ID`.

The returned map is new, but accepted profiles and registry query results retain caller references. The caller must treat them as immutable while in use, or rebuild and revalidate the set after changes. In contrast, `@hia-doc/profiles` accessors return defensive copies of package-owned official data.

Inheritance cycles now produce `HIA_PROFILE_EXTENDS_CYCLE`. Inherited tag listings and semantic tag/rule/diagnostic queries refuse graphs with a reachable cycle, while raw profile metadata and local tag listings remain inspectable. Shared ancestors and repeated parent references are not cycles. Iterative traversal handles deep finite graphs without recursive call-stack growth.

Alias chains in the query root's composed view must reach an existing terminal tag. Missing endpoints retain `HIA_PROFILE_ALIAS_TARGET_UNKNOWN`; cycles produce `HIA_PROFILE_ALIAS_CYCLE`, including cycles created by combining individually valid branches. Invalid chains return `undefined` even with `includeAliases: true`. Valid results retain caller references and the exact visited alias names, excluding the terminal tag. Mapping references to unknown diagnostic codes retain warning severity.

Composition follows parent-reference order with ancestors first, each identity applied once, later actual declarations winning and local declarations applied last. All tag/list/alias-target, rule and diagnostic queries follow that rule. The four layer names do not automatically reorder profiles. See [composition and migration boundaries](profile-composition.md) for diamond examples, error behavior and ownership.

## File loading and privacy

`loadHiaProfileFromFile(path)` reads UTF-8 JSON once and never rewrites it. A parsed non-object root produces `HIA_PROFILE_INVALID`. File read or JSON parse failures produce a fixed `HIA_PROFILE_READ_FAILED` message without raw exception text or source excerpts.

The returned `path` and failure diagnostic `data.profilePath` retain the caller's original path. These fields are not sanitized and must be handled before public disclosure. The loader is not a filesystem sandbox and does not fetch remote profiles, resolve packages or materialize artifacts automatically.

See [official profile distribution](profile-distribution.md) for package boundaries and [migration guidance](migration-guide.md) for project adoption.

## Current and legacy schema identities

The current canonical schema is `documentation-profile-1.0.0.schema.json` and constrains `schemaVersion` to `1.0.0`. The exact historical `documentation-profile-0.1.0-draft.schema.json` remains independently retrievable with its original bytes. The current shape expresses the already enforced local requirements that alias-status tags have `aliasFor` and rule messages have a `default` string; the historical schema is not changed. Cross-profile existence, duplicate declarations, inheritance ordering and alias cycles remain runtime checks.

The reader rejects unknown patches/minors, prereleases and build-suffixed versions. Missing versions are not defaulted. `HiaProfileSchemaVersion` offers an exact opt-in authoring type; `HiaDocumentationProfile` retains its broad input view and is not proof that validation passed. Reading files or constructing sets preserves `schemaVersion` and the independent `profileVersion`.
