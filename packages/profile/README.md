# @hia-doc/profile

## 1.0.0 source candidate

This source tree targets a coordinated 1.0.0 package candidate. It does not
announce npm availability. See the [package migration guide](../../docs/package-v1-migration.md)
for matching dependencies, artifact versions and source compatibility.

中文：当前为1.0.0源码候选，实际发布及工件版本请分别核对迁移说明。


Documentation profile runtime for HIA documentation tools.

The package loads and validates documentation profiles, resolves tag aliases across `extends`, exposes registry query helpers, and reports profile diagnostics. It does not parse source code, generate HTML, or mutate the core document model.

## Current Scope

- profile structure validation
- tag, rule, mapping and diagnostic registry checks
- alias resolution
- parent profile resolution through `extends`
- duplicate and unknown-reference diagnostics
- exported `HIA_PROFILE_JSON_SCHEMA` contract metadata

Official profile JSON is distributed by `@hia-doc/profiles`. This package deliberately does not bundle a default profile set; callers can validate project-defined profiles, official profiles or extension profiles through the same runtime API.

## Input validation and ownership

The current definition is a `documentation-profile@1.0.0` source candidate. The reader accepts exactly `1.0.0` and legacy `0.1.0-draft`, without version-range negotiation or input rewriting, and checks ordinary JSON plus declared fields. This does not publish a stable npm package or graduate the seven domain profiles. Open JSON extensions and schema-permitted empty arrays/message strings remain allowed. Invalid profile-set members contribute diagnostics and are skipped; the first valid entry owns a duplicate ID. Accepted profiles and query results retain caller references.

File read/parse errors use fixed messages without source excerpts. Caller-provided paths remain in returned path/context fields and require caller handling before public disclosure. Inheritance cycles and missing/cyclic effective alias chains produce errors and no resolved semantic result; deep finite inheritance uses iterative traversal. All inherited queries apply ancestors in parent order once, then let later actual declarations and finally local declarations win. Validation is not an execution or filesystem sandbox.

See [input validation, ownership and limitations](../../docs/profile-input-validation.md) for the full boundary.

See [composition and query behavior](../../docs/profile-composition.md) for defaults, cycle diagnostics, diamond examples and migration from earlier draft lookup behavior.
