# Schema Distribution

`@hia-doc/schemas` distributes machine-readable Draft 2020-12 snapshots for HIA JSON contracts.

## Ownership Model

The package is a catalog, not a new contract owner and not a fully dereferenced compound schema bundle. Each schema keeps the `$id`, version and semantics exported by its owner package.

| Catalog key | Owner package | Contract status |
| --- | --- | --- |
| `business-flow-documentation` | `@hia-doc/core` | draft |
| `business-flow-documentation-projection` | `@hia-doc/core` | draft |
| `hia-document` | `@hia-doc/core` | active pre-1.0 |
| `project-manifest` | `@hia-doc/config` | draft |
| `documentation-profile` | `@hia-doc/profile` | draft |
| `documentation-producer` | `@hia-doc/plugin-sdk` | draft |
| `documentation-producer-result` | `@hia-doc/plugin-sdk` | draft |
| `doc-source-map` | `@hia-doc/source-linkage` | draft |
| `documentation-locale-resource` | `@hia-doc/core` | draft |
| `documentation-locale-resource-declaration` | `@hia-doc/core` | draft |
| `documentation-locale-resolution` | `@hia-doc/core` | draft |
| `documentation-terminology` | `@hia-doc/core` | draft |
| `generated-documentation-binding` | `@hia-doc/source-linkage` | draft |
| `documentation-source-comment-projection` | `@hia-doc/core` | draft |
| `documentation-presentation-profile` | `@hia-doc/core` | draft |
| `documentation-ui-locale-completeness` | `@hia-doc/core` | draft |

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
import businessFlowSchema from "@hia-doc/schemas/business-flow-documentation.schema.json" with { type: "json" };
import businessFlowProjectionSchema from "@hia-doc/schemas/business-flow-documentation-projection.schema.json" with { type: "json" };
import docMapSchema from "@hia-doc/schemas/doc-source-map.schema.json" with { type: "json" };
import localeResourceSchema from "@hia-doc/schemas/documentation-locale-resource.schema.json" with { type: "json" };
import localeResourceDeclarationSchema from "@hia-doc/schemas/documentation-locale-resource-declaration.schema.json" with { type: "json" };
import localeResolutionSchema from "@hia-doc/schemas/documentation-locale-resolution.schema.json" with { type: "json" };
import terminologySchema from "@hia-doc/schemas/documentation-terminology.schema.json" with { type: "json" };
import generatedBindingSchema from "@hia-doc/schemas/generated-documentation-binding.schema.json" with { type: "json" };
import sourceCommentProjectionSchema from "@hia-doc/schemas/documentation-source-comment-projection.schema.json" with { type: "json" };
import presentationProfileSchema from "@hia-doc/schemas/documentation-presentation-profile.schema.json" with { type: "json" };
import uiLocaleCompletenessSchema from "@hia-doc/schemas/documentation-ui-locale-completeness.schema.json" with { type: "json" };
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
https://mandolin.github.io/HIA-Documentation/schemas/business-flow-documentation-0.1.0-draft.schema.json
https://mandolin.github.io/HIA-Documentation/schemas/business-flow-documentation-projection-0.1.0-draft.schema.json
https://mandolin.github.io/HIA-Documentation/schemas/documentation-ui-locale-completeness-0.1.0-draft.schema.json
https://mandolin.github.io/HIA-Documentation/schemas/documentation-profile-0.1.0-draft.schema.json
```

The Pages artifact also includes unversioned package-style aliases such as `hia-document.schema.json`. Schema references should use the versioned `$id`; aliases are retrieval conveniences only.

## Historical identities

`getHiaSchema()` resolves exact archived IDs independently of current catalog
entries and returns defensive copies. Current keys and `listHiaSchemas()` retain
their existing current-definition semantics. No lookup changes an input document
or assumes compatibility with a different contract version.

Historical snapshots are kept under `packages/schemas/src/history/`, with a
separate index containing canonical identity, exact contract version and SHA-256.
The initial eight snapshots were retrieved from their public canonical URLs and
checked for semantic equality with their owner definitions. Their byte digests
are pinned independently in regression tests. They retain the publicly served
formatting, which can differ from the current source snapshot formatting.

The Pages build validates every historical snapshot before replacing its local
artifact and publishes `schemas/history.json`. A current definition may share a
historical identity only when its schema definition is unchanged. A new version
uses a new identity; the previous fixed URL keeps its original bytes. The owner
synchronizer updates current snapshots only and never rewrites history. If a
compiler changes JSON formatting in emitted history, the digest gate fails;
restore the saved original bytes rather than updating their expected digests.

An archived draft remains a draft. Structural validation should select the
schema matching the input's exact version; semantic acceptance still belongs to
the owner runtime validator.

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

Generate the schema namespace and the combined local Pages artifact with:

```bash
pnpm run build
pnpm run schema:site
pnpm run reference:build
pnpm run reference:pages
pnpm run reference:pages:check
```

The `schema-pages.yml` workflow publishes the single `dist/reference-pages` artifact. It copies the generated `/schemas/` namespace byte-for-byte from `dist/schema-pages`, then verifies every canonical URL, alias and catalog response alongside the public documentation routes. GitHub Pages is configured in workflow mode with HTTPS enforced.

## Publication Status

The checked-in `@hia-doc/schemas` manifest is publishable `0.1.4`; this describes
source metadata, not a fresh registry availability check. The package scope is
`@hia-doc`, the repository license is MIT and the canonical Pages namespace is
`https://mandolin.github.io/HIA-Documentation/schemas/`. The current catalog has
17 owner schemas. New snapshots reach the public site only after the build and
deployment workflow succeeds; local generation alone does not prove deployment.

The public package release plan, publish order and post-publish smoke are documented in `docs/public-package-release-plan.md`.
