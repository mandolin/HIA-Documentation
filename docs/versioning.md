# HIA Versioning Strategy

This document describes package and serializable-contract versioning for the HIA main repository and official satellite packages. Pre-1.0 and draft versions are not stable API promises.

## Principles

- Package versions and contract versions are separate.
- Public packages use npm SemVer.
- Internal workspace packages may remain `0.0.0` until a publication decision is made.
- Serializable contracts must expose explicit version fields.
- `*-draft` versions are not stable API promises.
- Breaking changes must update the owning contract version, fixture coverage and compatibility matrix.
- Release gates must run before publishing or changing release-facing contracts.

## Package Versions

These values describe checked-in manifests and release-plan status, not a live npm registry lookup. A candidate package identity is not a published version or a system release. Contract versions remain independent.

| Package | Manifest version | Publication / version policy |
| --- | --- | --- |
| main-repo root | private 0.0.0 | Workspace marker; not an npm product. |
| `@hia-doc/core` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.2`. |
| `@hia-doc/config` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.6`. |
| `@hia-doc/profile` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.0`. |
| `@hia-doc/parser-jsdoc` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.0`. |
| `@hia-doc/plugin-sdk` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.2`. |
| `@hia-doc/source-linkage` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.1`. |
| `@hia-doc/theme-default` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.4`. |
| `@hia-doc/browser-panel` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.0`. |
| `@hia-doc/profiles` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.0`. |
| `@hia-doc/renderer-html` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.8`. |
| `@hia-doc/schemas` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.4`. |
| `@hia-doc/lsp` | `0.1.0` | Independent tooling; release-plan status `published` is not a fresh registry query. |
| `@hia-doc/cli` | `1.0.0` | Unreleased source candidate; prior release-plan identity `0.1.11`. |
| `@mandolin/jsdoc-plugin-hia-sys` | `1.0.0` | Unreleased independent JSDoc integration source candidate. |
| `@mandolin/jsdoc-theme-hia` | `1.0.0` | Unreleased independent JSDoc theme source candidate. |

中文：十二个主仓必要包和两个独立JSDoc包为1.0.0源码候选；旧npm身份、独立语言服务器及系统正式发行分别管理。

Private satellite roots are containers. Child packages have independent versions, and publication must be checked against each owner release manifest. See the [compatibility matrix](compatibility-matrix.md).

## Contract Versions

| Surface | Version | Stability | Owner |
| --- | --- | --- | --- |
| Core document schema | `1.0.0` source candidate; exact legacy `0.2.0` | Source contract candidate | `@hia-doc/core` |
| Text i18n model | `1.0.0` source candidate; exact legacy `0.2.0` | Source contract candidate | `@hia-doc/core` |
| Source model | `1.0.0` source candidate; exact legacy `0.2.0` | Source contract candidate | `@hia-doc/core` |
| Protocol envelope | `1.0.0` source candidate; exact legacy `0.1.0` | Source contract candidate | `@hia-doc/core` |
| Config schema | `0.1.0` | Active pre-1.0 contract | `@hia-doc/config` |
| Documentation profile schema | `1.0.0` | Stable definition candidate; exact legacy `0.1.0-draft` reader support | `@hia-doc/profile` |
| Official profile catalog | `0.1.0-draft` | Draft | `@hia-doc/profiles` |
| Official profile set | `0.1.0-draft` | Draft | `@hia-doc/profiles` |
| Schema distribution catalog | `0.1.0-draft` | Draft | `@hia-doc/schemas` |
| Renderer manifest | `0.1.0` | Active pre-1.0 contract | `@hia-doc/renderer-html` |
| Project navigation index | `0.1.0-draft` | Draft | `@hia-doc/renderer-html` |
| JSDoc Integration input | `0.1.0` | Active pre-1.0 contract | `@hia-doc/parser-jsdoc` and `@mandolin/jsdoc-plugin-hia-sys` |
| JSDoc adapter bridge | `0.1.0` | Active pre-1.0 contract | `@hia-doc/parser-jsdoc` |
| JSDoc adapter metadata | `0.1.0` | Active pre-1.0 contract | `@hia-doc/parser-jsdoc` |
| Project docs manifest | `1.0.0` source candidate; exact legacy `0.1.0-draft` | Source contract candidate | `@hia-doc/config` |
| HTMDoc extraction artifact / profile | `1.0.0`; exact legacy `0.1.0-draft` | Reviewed source candidate with explicit lossless migration | `HIA/hia-htmdoc` |
| CSSDoc extraction artifact / profile | `1.0.0`; exact legacy `0.1.0-draft` | Reviewed source candidate with explicit lossless migration | `HIA/hia-cssdoc` |
| JSDoc configuration / umbrella | `1.0.0`; exact legacy `0.1.0-draft` | Reviewed source candidate; Integration/page-map stay fixed `0.1.0` compatibility profiles | `HIA/hia-jsdoc` |
| .NET configuration / seven domain artifacts | `1.0.0`; exact legacy `0.1.0-draft` | Reviewed source candidate with explicit lossless migration; static-analysis scope unchanged | `HIA/hia-dotnetdoc` |
| Doc source map | `1.1.0`; exact previous `1.0.0` and legacy `0.1.0-draft` readers | Reviewed source contract candidate; package/host adoption and publication remain separate | `@hia-doc/source-linkage` |
| Doc source map schema | `1.1.0`; original `1.0.0` and `0.1.0-draft` historical bytes retained | Catalog stable-candidate; unchanged wire/schema identity | `@hia-doc/source-linkage` |
| Ordinary source map coordinate profile | `0.1.0-draft` | Independent catalog draft; strict per-slot verification remains a release acceptance condition | `@hia-doc/source-linkage` |
| Generated documentation binding | `0.3.0-draft` source; exact previous `0.2.0-draft` and legacy `0.1.0-draft` readers/schemas | Draft, unreleased source coordination with map `1.1.0` | `@hia-doc/source-linkage` |
| Documentation presentation profile | `1.0.0` source candidate; exact legacy `0.1.0-draft` | Stable definition candidate | `@hia-doc/core` |
| Documentation UI locale completeness | `1.0.0` | Stable definition candidate; exact old reader, source-input rebuilding, total result budget 100,000 | `@hia-doc/core` |
| Documentation locale resource | `0.1.0-draft` | Draft | `@hia-doc/core` |
| Documentation locale-resolution sidecar | `0.1.0-draft` | Draft | `@hia-doc/core` |
| Documentation producer descriptor/result | `1.0.0` | Stable definition candidate; exact legacy `0.1.0-draft` reader support | `@hia-doc/plugin-sdk` |

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

The checked-in local toolchain is shown below. Development uses Node.js 24 LTS;
CI verifies the latest patches of Node.js 22/24 on Ubuntu 24.04 and Windows
Server 2025. Existing package engine declarations remain a separate migration
boundary and are not a recommendation to use [end-of-life Node.js releases](https://nodejs.org/en/about/previous-releases).

| Tool | Version |
| --- | --- |
| Node.js | `24.22.1` through `.mise.toml`; source candidate engines `^22.23.4 \|\| ^24.22.1`, with latest 22/24 patches verified in CI. Existing registry archives retain their own declarations. |
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

Official profile distribution policy is documented in `docs/profile-distribution.md`; schema catalog policy is documented in `docs/schema-distribution.md`. Package versions, catalog versions and individual contract/profile versions remain independent. Publication flags and versions must be read from each package manifest and the release manifest; current registry availability and integrity require release-specific verification.

Producer descriptor/result `1.0.0` definitions are candidates, not proof of a
published package or formal system release. Their exact legacy reader policy,
immutable schema identities and migration rules are documented in
[Documentation Producer API](documentation-producers.md). The catalog's
`stable-candidate` label preserves that distinction.

Public package release policy is documented in
[the release plan](public-package-release-plan.md). Source candidates declare
Node.js `^22.23.4 || ^24.22.1`; Trusted Publishing uses Node 24.x and npm
`^11.15.0`. Existing npm archives retain their own engines. These declarations
and toolchain choices do not substitute for actual runtime/consumer evidence.

Core foundation compatibility, constructor defaults and ownership are documented in [Core document migration](core-document-migration.md). Exact envelope version types do not replace payload validation; package/registry identity remains independent.
