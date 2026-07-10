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
