# Official Profile Distribution

This document defines how official HIA documentation profiles are distributed, versioned and consumed.

## Current Status

The documentation profile schema is `0.1.0-draft`.

`@hia-doc/profile` now exports the profile schema contract:

- `HIA_PROFILE_SCHEMA_VERSION`
- `HIA_PROFILE_SCHEMA_ID`
- `HIA_PROFILE_JSON_SCHEMA`
- `validateHiaProfile()`

Official profile drafts currently have two homes:

| Location | Role |
| --- | --- |
| `work-zone/docs/profiles/*.profile.json` | Source-of-truth planning and contract drafts. |
| `packages/profile/src/fixtures/profiles/*.profile.json` | Runtime test fixtures for `@hia-doc/profile`. |

The fixture files are not yet a public package distribution surface. They prove runtime compatibility and keep release gates honest.

## Official Profile Set

| Profile ID | Layer | Purpose |
| --- | --- | --- |
| `jsdoc` | `stable` | JSDoc fact-standard input plus HIA JSDoc extension tags from the published plugin. |
| `htmdoc` | `stable` | HIA-led HTML documentation profile. |
| `cssdoc` | `stable` | HIA-led CSS documentation profile, absorbing useful CSSDOC 0.2.22 ideas into one modern standard profile. |
| `doc-source-map` | `stable` | Documentation source map consumption rules. |
| `pug-htmdoc-bridge` | `bridge` | Pug to HTMDoc generated-source bridge. |
| `sass-cssdoc-bridge` | `bridge` | Sass/SCSS to CSSDoc generated-source bridge. |
| `ts-jsdoc-bridge` | `bridge` | TypeScript/TSDoc to JS/JSDoc bridge. |

Stable profiles define recommended standard semantics. Bridge profiles connect generated or external artifacts to stable profiles without promoting every external shape into HIA core.

## Consumption Model

Project manifests should reference profile IDs and versions explicitly:

```json
{
  "profile": {
    "profileId": "cssdoc",
    "profileVersion": "0.1.0-draft"
  }
}
```

Until an official profile package exists, manifests should also list local profile files when a build needs profile metadata:

```json
{
  "profiles": [
    {
      "profileId": "cssdoc",
      "path": "project-mixed-profiles/cssdoc.profile.json"
    }
  ]
}
```

The CLI should consume explicit artifacts and explicit profile references. It should not silently fetch profiles from a remote registry.

## Future Package Boundary

The reserved target is an official profile distribution package such as `@hia-doc/profiles` or an equivalent package name chosen during publication planning.

The dedicated `@hia-doc/profiles` package should wait until:

- profile schema validation is backed by the exported `HIA_PROFILE_JSON_SCHEMA` and at least one schema compatibility gate;
- project manifest profile loading and LSP profile capability consumption are stable enough for external users;
- public npm scope and release ownership are decided;
- migration rules for stable profile changes are documented.

Until then, profile IDs and profile versions are the compatibility contract, not a public package version.

## Extension Profiles

Projects may define extension profiles when the official set does not cover a local vocabulary.

Extension profiles should:

- use `layer: "extension"`;
- use a project or organization prefix in `profileId`, for example `acme.cssdoc`;
- extend an official stable profile instead of copying it;
- avoid redefining stable tags with different meanings;
- mark experimental tags as `experimental` until they are proven;
- document migration plans before proposing an extension tag for the official profile set.

## Change Policy

Profile changes must update:

- the profile draft;
- runtime fixtures;
- profile runtime tests;
- `docs/compatibility-matrix.md` when compatibility status changes;
- migration guidance when a tag is renamed, deprecated or promoted.

Run:

```bash
pnpm vitest run packages/profile/src/index.test.ts
pnpm run release:gate
```

When editing WorkZone profile drafts, also run:

```powershell
node work-zone/dev/scripts/check-profile-drafts.cjs
```

## Deferred Work

- Published profile package.
- Profile JSON Schema publication.
- Workspace profile auto-discovery.
- Profile marketplace or community registry.
- Full profile-defined rule execution.
