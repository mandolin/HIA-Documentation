# @hia-doc/profile

Documentation profile runtime for HIA documentation tools.

The package loads and normalizes documentation profile drafts, resolves tag aliases across `extends`, exposes registry query helpers, and reports profile diagnostics. It does not parse source code, generate HTML, or mutate the core document model.

## Current Scope

- profile structure validation
- tag, rule, mapping and diagnostic registry checks
- alias resolution
- parent profile resolution through `extends`
- duplicate and unknown-reference diagnostics
- exported `HIA_PROFILE_JSON_SCHEMA` contract metadata

Official profile JSON is distributed by `@hia-doc/profiles`. This package deliberately does not bundle a default profile set; callers can validate project-defined profiles, official profiles or extension profiles through the same runtime API.

## Input validation and ownership

The runtime accepts the exact `documentation-profile@0.1.0-draft` identity and checks ordinary JSON plus declared fields. Open JSON extensions and schema-permitted empty arrays/message strings remain allowed. Invalid profile-set members contribute diagnostics and are skipped; the first valid entry owns a duplicate ID. Accepted profiles and query results retain caller references.

File read/parse errors use fixed messages without source excerpts. Caller-provided paths remain in returned path/context fields and require caller handling before public disclosure. Validation is not an execution or filesystem sandbox, and complete inheritance/alias conflict semantics are not yet a stable contract.

See [input validation, ownership and limitations](../../docs/profile-input-validation.md) for the full boundary.
