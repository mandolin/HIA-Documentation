# HIA Versioning Strategy

This document defines the first versioning baseline for the HIA main repository and official satellite packages.

## Principles

- Package versions and contract versions are separate.
- Public packages use npm SemVer.
- Internal workspace packages may remain `0.0.0` until a publication decision is made.
- Serializable contracts must expose explicit version fields.
- `*-draft` versions are not stable API promises.
- Breaking changes must update the owning contract version, fixture coverage and compatibility matrix.
- Release gates must run before publishing or changing release-facing contracts.

## Package Versions

| Package group | Current state | Version policy |
| --- | --- | --- |
| `main-repo` root | private `0.0.0` | Not published. Version is a workspace marker. |
| `@hia-doc/*` packages in `main-repo` | private `0.0.0`; first public target `0.1.0` | Keep `0.0.0` and `private: true` until a package is explicitly approved for publication. First release package order is defined in `release/public-packages.json`. |
| `@mandolin/jsdoc-plugin-hia-sys` | public `0.1.0` | Public npm SemVer. Patch for compatible fixes, minor for additive features, major for breaking output/config behavior. |
| `@mandolin/jsdoc-theme-hia` | public `0.1.0` | Public npm SemVer. Patch for compatible fixes, minor for additive theme features, major for breaking template/asset behavior. |
| `HIA/hia-htmdoc` | private workspace `0.0.0` | Satellite incubation. Contract versions are more important than package versions until publication. |
| `HIA/hia-cssdoc` | private workspace `0.0.0` | Satellite incubation. Contract versions are more important than package versions until publication. |
| `HIA/hia-sassdoc` | private workspace `0.0.0` | Satellite incubation. Contract versions are more important than package versions until publication. |

## Contract Versions

| Surface | Version | Stability | Owner |
| --- | --- | --- | --- |
| Core document schema | `0.2.0` | Active pre-1.0 contract | `@hia-doc/core` |
| Text i18n model | `0.2.0` | Active pre-1.0 contract | `@hia-doc/core` |
| Source model | `0.2.0` | Active pre-1.0 contract | `@hia-doc/core` |
| Protocol envelope | `0.1.0` | Active pre-1.0 contract | `@hia-doc/core` |
| Config schema | `0.1.0` | Active pre-1.0 contract | `@hia-doc/config` |
| Documentation profile schema | `0.1.0-draft` | Draft | `@hia-doc/profile` |
| Official profile catalog | `0.1.0-draft` | Draft | `@hia-doc/profiles` |
| Official profile set | `0.1.0-draft` | Draft | `@hia-doc/profiles` |
| Schema distribution catalog | `0.1.0-draft` | Draft | `@hia-doc/schemas` |
| Renderer manifest | `0.1.0` | Active pre-1.0 contract | `@hia-doc/renderer-html` |
| Project navigation index | `0.1.0-draft` | Draft | `@hia-doc/renderer-html` |
| JSDoc Integration input | `0.1.0` | Active pre-1.0 contract | `@hia-doc/parser-jsdoc` and `@mandolin/jsdoc-plugin-hia-sys` |
| JSDoc adapter bridge | `0.1.0` | Active pre-1.0 contract | `@hia-doc/parser-jsdoc` |
| JSDoc adapter metadata | `0.1.0` | Active pre-1.0 contract | `@hia-doc/parser-jsdoc` |
| Project docs manifest | `0.1.0-draft` | Draft | `@hia-doc/cli` |
| HTMDoc extraction artifact | `0.1.0-draft` | Draft | `HIA/hia-htmdoc` |
| CSSDoc extraction artifact | `0.1.0-draft` | Draft | `HIA/hia-cssdoc` |
| Doc source map | `0.1.0-draft` | Draft | `doc-source-map` contract docs and satellite tools |
| Doc source map schema | `0.1.0-draft` | Draft | `@hia-doc/source-linkage` |
| Documentation producer descriptor/result | `0.1.0-draft` | Draft | `@hia-doc/plugin-sdk` |

## Change Rules

Compatible changes:

- Add optional fields.
- Add enum values only when consumers are already required to ignore unknown values.
- Add diagnostics with stable code prefixes.
- Add profile tags marked `experimental` or `reserved`.
- Add renderer/CLI manifest fields that older consumers can ignore.

Breaking changes:

- Remove or rename fields.
- Change field types.
- Tighten validation in a way that rejects existing valid fixtures.
- Change meaning of an existing diagnostic code.
- Change path privacy rules or output locations.
- Change required package engines.

Draft changes:

- Draft contracts may change faster, but every change still needs fixture updates and an entry in the compatibility matrix.
- Draft contracts should graduate only after at least one parser/extractor, one renderer/CLI consumer and one fixture have proven the shape.

## Public Schema Identifiers

Public schema `$id` values use versioned URLs under:

```text
https://mandolin.github.io/HIA-Documentation/schemas/
```

Once published, a canonical `$id` is immutable. A contract version change that requires a new schema identity must publish a new versioned URL; package-style unversioned aliases may move to the current supported snapshot but must not replace canonical ids in `$ref` or compatibility records.

## Dependency Versions

The pinned local toolchain is:

| Tool | Version |
| --- | --- |
| Node.js | `20.20.2` through `.mise.toml`; package engine requires `>=20.19.0`. |
| pnpm | `10.34.4` |

See `docs/dependency-license-audit.md` for direct dependency versions and license policy.

## Release Rules

Before publishing a public package or changing a release-facing contract:

1. Update the owning contract document or README.
2. Update `docs/compatibility-matrix.md`.
3. Update fixtures and tests that prove the old/new behavior.
4. Run the matching release gate.
5. For public npm packages, run publish preflight and post-publish smoke.

See `docs/release-gate.md` for exact commands.

Official profile distribution policy is documented in `docs/profile-distribution.md`; schema catalog policy is documented in `docs/schema-distribution.md`. Package versions, catalog versions and individual contract/profile versions remain independent. The distribution packages exist in the workspace but remain private until their public release blockers are closed.

Public `@hia-doc/*` package release policy is documented in `docs/public-package-release-plan.md`. Runtime compatibility and publish-job toolchain compatibility are intentionally separate: packages currently target Node `>=20.19.0`, while npm Trusted Publishing uses a Node 24.x workflow with npm `^11.5.1`.
