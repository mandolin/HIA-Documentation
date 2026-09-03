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
import presentationProfileSchema from "@hia-doc/schemas/documentation-presentation-profile.schema.json" with { type: "json" };
import sourceCommentProjectionSchema from "@hia-doc/schemas/documentation-source-comment-projection.schema.json" with { type: "json" };
```

The canonical public schema root is:

```text
https://mandolin.github.io/HIA-Documentation/schemas/
```

Every catalog entry exposes a versioned `publicUrl` equal to the schema `$id`. The Pages site also publishes package-style unversioned aliases for convenient retrieval; aliases do not replace canonical ids.

Use `pnpm --filter @hia-doc/schemas sync:check` to verify the snapshots against their owner package exports. Use `sync` only after intentionally changing an owner schema.

## Validator Policy

The package does not select or bundle a JSON Schema validator. Consumers may use a Draft 2020-12 implementation for structural validation and should use the owning runtime validator for semantic checks such as cross-reference, path and privacy rules.

`documentation-locale-resource` and `documentation-locale-resolution` are owned by
`@hia-doc/core`. Their schemas validate payload structure only; the core resolver and the
root-bound reader profile enforce BCP 47 canonicalization, fallback order, realpath containment,
limits and metadata-only privacy.

`documentation-source-comment-projection` is also owned by `@hia-doc/core`. Its runtime validator enforces canonical BCP 47
tags, stable comment keys, closed-world privacy, and body-policy consistency beyond the structural schema.

`documentation-presentation-profile` is owned by `@hia-doc/core`. Its runtime validator enforces stable topic/navigation/relation
identity, deterministic page partitioning, same-origin relative source assets, exact integrity metadata, theme capabilities,
reader transitions, and the body-free privacy boundary beyond the structural schema.

`business-flow-documentation` is owned by `@hia-doc/core`. Its runtime validator enforces stable identity, closed node/relation
kinds, entry/end references, reachability, acyclicity, branch/merge/exception rules, independent quality dimensions,
authorship, metadata-only evidence, code-binding references, privacy, and exact compatibility beyond the structural schema.

`business-flow-documentation-projection` is also owned by `@hia-doc/core`. Its runtime validator enforces whole-flow public
privacy, deterministic human-linear traversal, explicit locale resolution, and exact identity parity between shared facts and
AI graph-ready references. The schema intentionally carries no Portal layout or graph coordinates.

## Status

This workspace package is not yet a public npm release. The GitHub Pages namespace, `@hia-doc` scope and MIT license are approved, and the initial Pages deployment is online. New producer schemas will become public when the W-P11.1 changes are committed and the schema workflow succeeds. Public npm publication still requires release versions, operational npm ownership and Trusted Publishing setup.
