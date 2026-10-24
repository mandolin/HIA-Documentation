# Official Profile Distribution

This document defines how official HIA documentation profiles are distributed, versioned and consumed.

## Package Boundaries

The profile system has two packages with different responsibilities:

| Package | Responsibility |
| --- | --- |
| `@hia-doc/profile` | Profile types, loading, structural and semantic validation, registry queries and profile-set composition. |
| `@hia-doc/profiles` | Official stable and bridge profile JSON files, a machine-readable catalog and defensive-copy accessors. |

The seven bundled profiles still declare `documentation-profile@0.1.0-draft`; their catalog and individual `profileVersion` values remain unchanged. The runtime separately exposes a `1.0.0` current schema candidate and accepts these exact legacy files without rewriting them. The canonical official JSON files live under `packages/profiles/src/profiles/` and are copied into the package `dist` directory by the TypeScript build.

## Official Profile Set

| Profile ID | Layer | Purpose |
| --- | --- | --- |
| `jsdoc` | `stable` | JSDoc fact-standard input plus the documented HIA JSDoc extension tags. |
| `htmdoc` | `stable` | HIA-led HTML documentation profile. |
| `cssdoc` | `stable` | HIA-led CSS documentation profile. |
| `doc-source-map` | `stable` | Documentation source map consumption rules. |
| `pug-htmdoc-bridge` | `bridge` | Pug to HTMDoc generated-source bridge. |
| `sass-cssdoc-bridge` | `bridge` | Sass/SCSS to CSSDoc generated-source bridge. |
| `ts-jsdoc-bridge` | `bridge` | TypeScript/TSDoc to JS/JSDoc bridge. |

Stable profiles define recommended standard semantics. Bridge profiles connect generated or external artifacts to stable profiles without promoting every external shape into HIA core.

## Programmatic Consumption

Use `@hia-doc/profiles` when a tool needs the official set:

```ts
import {
  createOfficialHiaProfileSet,
  getOfficialHiaProfile,
  listOfficialHiaProfiles
} from "@hia-doc/profiles";

const cssdoc = getOfficialHiaProfile("cssdoc");
const profileSet = createOfficialHiaProfileSet();
const profiles = listOfficialHiaProfiles();
```

The accessors return defensive copies so project-specific customization cannot mutate package-owned data.

The runtime validates declared fields before admitting profiles into a set, and skips invalid entries while retaining diagnostics. Runtime query results retain caller references; they do not acquire the defensive-copy ownership of official distribution accessors. See [input validation and remaining composition limits](profile-input-validation.md).

The exported catalog object, literal ID array and direct JSON module exports are shared, unfrozen metadata. Treat them as read-only or clone them before customization. The defensive-copy guarantee applies to profile accessors and separately created official profile sets; it does not turn every direct module export into an isolated object.

Every profile and the catalog also has an explicit JSON export:

```ts
import catalog from "@hia-doc/profiles/catalog.json" with { type: "json" };
import cssdoc from "@hia-doc/profiles/cssdoc.profile.json" with { type: "json" };
```

## Project Manifest Consumption

Project manifests reference profile IDs and versions explicitly:

```json
{
  "profile": {
    "profileId": "cssdoc",
    "profileVersion": "0.1.0-draft"
  }
}
```

When a build requires an explicit profile artifact, the manifest should still provide a safe local path. Package resolution or a caller-owned materialization step may supply that file, but the CLI does not silently fetch profiles from a remote registry.

## Version Boundaries

Four versions remain independent:

- npm package version: distribution release cadence;
- `catalogVersion`: catalog shape and package indexing contract;
- `schemaVersion` / `profileSchemaVersion`: the documentation profile file structure actually used by the bundled JSON;
- `profileVersion`: semantics of an individual profile.

An additive package release does not automatically change every `profileVersion`. A breaking profile change must update that profile's version, fixtures, compatibility matrix and migration guidance.

## Extension Profiles

Projects may define extension profiles when the official set does not cover a local vocabulary.

Extension profiles should:

- use `layer: "extension"`;
- use a project or organization prefix in `profileId`, for example `acme.cssdoc`;
- extend an official stable profile instead of copying it;
- avoid redefining stable tags with different meanings;
- mark experimental tags as `experimental` until they are proven;
- document migration plans before proposing an extension tag for the official set.

## Change Gate

Profile changes must update the canonical JSON file, runtime/distribution tests and compatibility or migration documentation when behavior changes.

Run:

```bash
pnpm --filter @hia-doc/profile test
pnpm --filter @hia-doc/profiles test
pnpm run schema:check
pnpm run release:gate
```

## Publication Status

The checked-in `@hia-doc/profiles` manifest is publishable. A source candidate or a local tarball does not establish registry availability or formal release qualification. Public publication requires:

- operational ownership of the approved `@hia-doc` npm scope;
- release metadata and package versions for both `@hia-doc/profile` and `@hia-doc/profiles`;
- a Trusted Publishing workflow owned by the public repository;
- a successful pack/install smoke from the registry candidate.

The repository and candidate package tarballs use the approved MIT license.

Profile marketplace, community registry and automatic workspace discovery remain separate future capabilities.
