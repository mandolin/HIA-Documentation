# Profile Authoring Guide

Documentation profiles define annotation tags, rules, mappings, diagnostics and capability metadata that HIA tools can consume consistently.

Profiles do not parse source code and do not replace language adapters. A parser or extractor still owns syntax fidelity; the profile describes the documentation semantics that downstream tools can query.

## Current Status

The profile schema is `0.1.0-draft`.

The runtime package is `@hia-doc/profile`. It can:

- export the `HIA_PROFILE_JSON_SCHEMA` machine-readable contract;
- validate profile structure;
- normalize tag/rule/mapping/diagnostic registries;
- resolve tag aliases;
- resolve inherited tags through `extends`;
- report stable profile diagnostics.

Official profile fixtures currently live in:

```text
packages/profile/src/fixtures/profiles/
```

The fixture set includes JSDoc, HTMDoc, CSSDoc, doc-source-map and bridge profiles.

## Profile Shape

A profile is a JSON object with these top-level fields:

```json
{
  "schemaVersion": "0.1.0-draft",
  "profileId": "cssdoc",
  "profileVersion": "0.1.0-draft",
  "displayName": "CSSDoc",
  "layer": "stable",
  "extends": [],
  "contracts": [],
  "targets": [],
  "tags": [],
  "rules": [],
  "mappings": [],
  "diagnostics": [],
  "capabilities": {}
}
```

## Layers

| Layer | Use |
| --- | --- |
| `stable` | HIA-owned or accepted baseline semantics. |
| `compat` | Compatibility with legacy ecosystem shapes. |
| `bridge` | Mapping between generated DSL/framework artifacts and a core documentation domain. |
| `extension` | Project or ecosystem-specific extension profile. |

## Tags

Tags describe annotation vocabulary. A tag can be stable, alias, deprecated, reserved or experimental.

Example:

```json
{
  "name": "component",
  "status": "stable",
  "scope": ["block"],
  "targets": ["css-rule", "css-component-style"],
  "repeatable": false,
  "valueGrammar": "identifier [summary]",
  "mapsTo": { "symbolKind": "css-component-style" }
}
```

Use aliases when a historical or ecosystem spelling should point to a preferred tag:

```json
{
  "name": "custom-property",
  "status": "alias",
  "aliasFor": "cssprop",
  "scope": ["block"],
  "targets": ["css-declaration"]
}
```

## Rules And Diagnostics

Rules declare configurable validation intent. They are not automatically executed by the profile runtime yet.

Diagnostics define stable codes and default messages that adapters, CLI, LSP or future rule runners can share.

```json
{
  "code": "CSSDOC_UNKNOWN_TAG",
  "severity": "warning",
  "defaultMessage": "Unknown CSSDoc annotation tag.",
  "target": "annotation"
}
```

## Capabilities

Capabilities are metadata for consumers such as LSP, IDE shells and renderers.

Example:

```json
{
  "completion": { "tags": true },
  "hover": { "tags": true, "symbolKinds": true },
  "renderer": { "views": ["css", "all"] }
}
```

Consumers should treat unknown capability fields as forward-compatible additions.

## Validate A Profile

Profile runtime tests cover the current fixture set:

```bash
pnpm vitest run packages/profile/src/index.test.ts
```

When editing official profile drafts in WorkZone, run the draft checker:

```powershell
node work-zone/dev/scripts/check-profile-drafts.cjs
```

## Compatibility Rules

- Additive optional fields are preferred.
- Breaking changes must update fixtures, tests and `docs/compatibility-matrix.md`.
- Draft contracts may change, but each change must remain traceable.
- Language core tags should avoid HIA prefixes unless a pre-existing standard would conflict.

See `docs/versioning.md` and `docs/compatibility-matrix.md` for the current governance baseline.

## Distribution And Migration

Official profile distribution policy is documented in `docs/profile-distribution.md`.

Migration paths from JSDoc, CSSDOC 0.2.22, SassDoc legacy, TSDoc/API Extractor/TypeDoc and Pug/HTMDoc are documented in `docs/migration-guide.md`.
