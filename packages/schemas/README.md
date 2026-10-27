# @hia-doc/schemas

Machine-readable JSON Schema distribution for HIA documentation contracts.

This package is a versioned snapshot catalog. Contract ownership remains with the package named by each catalog entry; `@hia-doc/schemas` does not redefine or independently version those contracts.

## API

```ts
import { getHiaSchema, HIA_SCHEMA_CATALOG, listHiaSchemas } from "@hia-doc/schemas";

const coreSchema = getHiaSchema("hia-document");
const sameSchema = getHiaSchema(coreSchema?.$id ?? "");
const schemas = listHiaSchemas();
```

Every returned schema is a defensive copy.

Current keys resolve to the current owner definition. Exact historical schema
IDs resolve to their preserved definitions, even after a current entry changes
version. This lookup does not migrate documents or infer compatibility with
unknown versions. `listHiaSchemas()` continues to list current schemas only.

## JSON Exports

The package exports its catalog and each schema as JSON:

```ts
import catalog from "@hia-doc/schemas/catalog.json" with { type: "json" };
import businessFlowSchema from "@hia-doc/schemas/business-flow-documentation.schema.json" with { type: "json" };
import businessFlowProjectionSchema from "@hia-doc/schemas/business-flow-documentation-projection.schema.json" with { type: "json" };
import profileSchema from "@hia-doc/schemas/documentation-profile.schema.json" with { type: "json" };
import producerResultSchema from "@hia-doc/schemas/documentation-producer-result.schema.json" with { type: "json" };
import localeResourceSchema from "@hia-doc/schemas/documentation-locale-resource.schema.json" with { type: "json" };
import generatedBindingSchema from "@hia-doc/schemas/generated-documentation-binding.schema.json" with { type: "json" };
import coordinateProfileSchema from "@hia-doc/schemas/ordinary-source-map-coordinate-profile.schema.json" with { type: "json" };
import presentationProfileSchema from "@hia-doc/schemas/documentation-presentation-profile.schema.json" with { type: "json" };
import uiLocaleCompletenessSchema from "@hia-doc/schemas/documentation-ui-locale-completeness.schema.json" with { type: "json" };
import sourceCommentProjectionSchema from "@hia-doc/schemas/documentation-source-comment-projection.schema.json" with { type: "json" };
```

The canonical public schema root is:

```text
https://mandolin.github.io/HIA-Documentation/schemas/
```

Every catalog entry exposes a versioned `publicUrl` equal to the schema `$id`. The Pages site also publishes package-style unversioned aliases for convenient retrieval; aliases do not replace canonical ids.

Historical canonical addresses retain their original schema bytes. The Pages
artifact includes `schemas/history.json` with exact identities and SHA-256
digests. The build rejects digest drift and conflicting current definitions
before replacing its local output. These checks preserve retrieval; owner
runtime validators still decide whether a particular input version is supported.

Use `pnpm --filter @hia-doc/schemas sync:check` to verify the snapshots against their owner package exports. Use `sync` only after intentionally changing an owner schema.

## Validator Policy

The package does not select or bundle a JSON Schema validator. Consumers may use a Draft 2020-12 implementation for structural validation and should use the owning runtime validator for semantic checks such as cross-reference, path and privacy rules.

`documentation-locale-resource` and `documentation-locale-resolution` are owned by
`@hia-doc/core`. Their schemas validate payload structure only; the core resolver and the
root-bound reader profile enforce BCP 47 canonicalization, fallback order, realpath containment,
limits and metadata-only privacy.

`documentation-source-comment-projection` is also owned by `@hia-doc/core`. Its runtime validator enforces canonical BCP 47
tags, stable comment keys, closed-world privacy, and body-policy consistency beyond the structural schema.

`ordinary-source-map-coordinate-profile` is owned by `@hia-doc/source-linkage`. Its draft schema fixes the sidecar's version, slot coordinates, column-unit evidence and body-free digest shape; the owning strict reader must still verify actual ordinary map, documentation map and authorized source bytes, section/slot identity and the precise segment. Schema acceptance alone never means an exact cross-map anchor.

`documentation-presentation-profile` is owned by `@hia-doc/core`. Its runtime validator enforces stable topic/navigation/relation
identity, deterministic page partitioning, same-origin relative source assets, exact integrity metadata, theme capabilities,
reader transitions, and the body-free privacy boundary beyond the structural schema.

`documentation-ui-locale-completeness` is also owned by `@hia-doc/core`. Its pure evaluator and runtime validator enforce
separate content/UI locale scopes, explicit fallback chains, stable message and placeholder identities, the full
surface × interactive/no-script × UI-locale matrix, language/accessibility metadata, exact required coverage, and a
translation-free privacy boundary beyond the structural schema.

`business-flow-documentation` is owned by `@hia-doc/core`. Its runtime validator enforces stable identity, closed node/relation
kinds, entry/end references, reachability, acyclicity, branch/merge/exception rules, independent quality dimensions,
authorship, metadata-only evidence, code-binding references, privacy, and exact compatibility beyond the structural schema.

`business-flow-documentation-projection` is also owned by `@hia-doc/core`. Its runtime validator enforces whole-flow public
privacy, deterministic human-linear traversal, explicit locale resolution, and exact identity parity between shared facts and
AI graph-ready references. The schema intentionally carries no Portal layout or graph coordinates.

## Status

The current source binding definition is the unreleased `0.3.0-draft`, paired
with documentation source map `1.1.0`. Historical snapshots preserve the
original binding `0.1.0-draft` and `0.2.0-draft` bytes and the source map
`0.1.0-draft` and `1.0.0` bytes. Repository and package builds restore validated
history bytes after TypeScript compilation. The current map `1.1.0` is a
`stable-candidate`; the binding remains draft. See `docs/generated-documentation-binding-contract.md` in the repository
for exact pairing and complete-bundle migration.

The independent coordinate profile is `0.1.0-draft`; it does not change the older map or binding identities. The current catalog has 18 entries, including this draft and seven reviewed stable definition candidates. Catalog maturity is independent of npm publication and system release status.

Package versions, contract versions and registry availability are separate.
Read each catalog entry's contract version and stability; the presence of a
historical schema does not promote a draft to stable. Registry availability and
release qualification must be verified for the exact package version consumed.
