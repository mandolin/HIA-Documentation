# Schema Distribution

`@hia-doc/schemas` distributes machine-readable Draft 2020-12 snapshots for HIA JSON contracts.

## Ownership Model

The package is a catalog, not a new contract owner and not a fully dereferenced compound schema bundle. Each schema keeps the `$id`, version and semantics exported by its owner package.

| Catalog key | Owner package | Contract status |
| --- | --- | --- |
| `hia-document` | `@hia-doc/core` | active pre-1.0 |
| `project-manifest` | `@hia-doc/config` | draft |
| `documentation-profile` | `@hia-doc/profile` | draft |
| `documentation-producer` | `@hia-doc/plugin-sdk` | draft |
| `documentation-producer-result` | `@hia-doc/plugin-sdk` | draft |
| `doc-source-map` | `@hia-doc/source-linkage` | draft |

Satellite extraction schemas remain owned and released by their corresponding `*-spec` packages. They should enter this catalog only after a cross-repository version and publication policy exists.

## Consumption

```ts
import { getHiaSchema, HIA_SCHEMA_CATALOG, listHiaSchemas } from "@hia-doc/schemas";

const profileSchema = getHiaSchema("documentation-profile");
const byId = getHiaSchema(profileSchema?.$id ?? "");
const schemas = listHiaSchemas();
```

Explicit JSON exports are available for non-runtime consumers:

```ts
import catalog from "@hia-doc/schemas/catalog.json" with { type: "json" };
import docMapSchema from "@hia-doc/schemas/doc-source-map.schema.json" with { type: "json" };
import producerSchema from "@hia-doc/schemas/documentation-producer.schema.json" with { type: "json" };
```

The catalog contains `key`, `schemaId`, `contractVersion`, `ownerPackage`, `stability` and package-relative `path` fields.

It also contains `publicBaseUrl` and a versioned `publicUrl` for each schema. The canonical root is:

```text
https://mandolin.github.io/HIA-Documentation/schemas/
```

Canonical examples:

```text
https://mandolin.github.io/HIA-Documentation/schemas/hia-document-0.2.0.schema.json
https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-0.1.0-draft.schema.json
```

The Pages artifact also includes unversioned package-style aliases such as `hia-document.schema.json`. Schema references should use the versioned `$id`; aliases are retrieval conveniences only.

## Validation Policy

JSON Schema validates serializable structure. It does not replace owner runtime checks for alias resolution, cross-artifact references, unsafe paths, source-content privacy or other semantic rules.

The distribution package is validator-neutral and does not bundle Ajv or another validator. Consumers that need generic structural validation should select a Draft 2020-12 implementation; HIA tools should additionally call the owner runtime validator.

## Synchronization Gate

Schema snapshots are generated from owner package exports and committed for language-neutral distribution. Check them with:

```bash
pnpm run build
pnpm --filter @hia-doc/schemas sync:check
pnpm run schema:check
```

After intentionally changing an owner schema, refresh snapshots with:

```bash
pnpm run schema:sync
```

Generate the local Pages artifact with:

```bash
pnpm run build
pnpm run schema:site
```

The `schema-pages.yml` workflow runs the full release gate, deploys `dist/schema-pages`, then verifies every canonical URL, alias and catalog response online. GitHub Pages is configured in workflow mode with HTTPS enforced.

## Publication Status

`@hia-doc/schemas` is currently private `0.0.0` with a first public target of `0.1.0`. The package scope is `@hia-doc`, the repository license is MIT and the GitHub Pages `$id` namespace is approved. A custom domain and GitHub organization are not required. Public npm publication still requires operational npm ownership and Trusted Publishing setup.

GitHub Pages is enabled and the initial four-schema deployment is online. Newly added owner schemas are published by the same workflow after their changes reach `main`.

The public package release plan, publish order and post-publish smoke are documented in `docs/public-package-release-plan.md`.
