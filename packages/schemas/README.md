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
import profileSchema from "@hia-doc/schemas/documentation-profile.schema.json" with { type: "json" };
```

The canonical public schema root is:

```text
https://mandolin.github.io/HIA-Documentation/schemas/
```

Every catalog entry exposes a versioned `publicUrl` equal to the schema `$id`. The Pages site also publishes package-style unversioned aliases for convenient retrieval; aliases do not replace canonical ids.

Use `pnpm --filter @hia-doc/schemas sync:check` to verify the snapshots against their owner package exports. Use `sync` only after intentionally changing an owner schema.

## Validator Policy

The package does not select or bundle a JSON Schema validator. Consumers may use a Draft 2020-12 implementation for structural validation and should use the owning runtime validator for semantic checks such as cross-reference, path and privacy rules.

## Status

This workspace package is not yet a public npm release. The GitHub Pages namespace, `@hia-doc` scope and MIT license are approved. Public npm publication still requires release versions, operational npm ownership and Trusted Publishing setup. The first Pages content deployment will occur when the schema workflow is committed and pushed to `main`.
