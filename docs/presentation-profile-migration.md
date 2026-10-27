# Presentation Profile Versions And Migration

当前源码提供1.0.0写者、精确旧版读取和显式无损迁移；包版本/注册表发布分别管理。拒绝态不被迁移抹去，公开授权和实际请求执行仍由宿主负责。

The current wire identity is `documentation-presentation-profile@1.0.0`. Readers admit exactly `1.0.0` and
`0.1.0-draft`; unknown patch, minor, prerelease and build-metadata identities are refused. This source capability does
not change previously published npm archives or promise that a particular registry version contains it.

## Explicit Migration

```ts
import { migrateDocumentationPresentationProfile } from "@hia-doc/core";

const result = migrateDocumentationPresentationProfile(input);
if (result.status === "ready") {
  const current = result.profile; // Exact 1.0.0, detached from input.
  // Process current.status and current.diagnostics before any host action.
} else {
  // No partial profile is returned. Report the fixed validation diagnostics.
  console.error(result.diagnostics);
}
```

The function validates an ordinary JSON snapshot under its exact input version, changes only the copied root
`contractVersion`, then validates the full current result. Identity, order, source manifests, digests, token labels,
status, input diagnostics and privacy declarations remain unchanged. Already-current inputs also return detached
copies. There is no file access, network, schema download, publication, source authorization or automatic repair.

`DocumentationPresentationProfileContractVersion` is the two-value reader union. `DocumentationPresentationProfile`
can describe either admitted version. `CurrentDocumentationPresentationProfile` restricts writers and successful
migration output to `1.0.0`. `DocumentationPresentationProfileMigrationResult` has a `ready` branch with `profile` and a
`refused` branch without it; migration result status is distinct from the contained profile's own status.

## Labels And Failure Policy

Version 1.0.0 requires `theme.skins[*].tokenContract` to contain a non-whitespace character under ECMAScript rules.
Legacy whitespace-only labels remain readable but cannot migrate. Fix the producing configuration and rebuild with a
real label; the migrator does not trim, invent a reference, discard fields or return partial results. Normal spaces in
nonblank labels and labels referring to older token contracts remain unchanged.

A valid `refused` profile can retain usable assets. Both versions preserve per-asset pure fetch planning, even when the
profile has error-severity input diagnostics. Plan `ready` means only that metadata was constructed; it grants no
execution permission or overall build acceptance. Hosts process original status/diagnostics, public authorization,
origin resolution, limits, integrity and non-executable text rendering. Validation does not derive profile status from
diagnostic severity or comprehensively redact free text; producers must supply public-safe messages.

## Schema And Owner Pairing

The new canonical schema is
`https://mandolin.github.io/HIA-Documentation/schemas/documentation-presentation-profile-1.0.0.schema.json`.
Historical `0.1.0-draft` schema bytes and its canonical URL remain unchanged. The current distribution adds expressible
numeric/mode/nonblank-label constraints; ordering, identity relations, URL decoding and digest semantics still need the
core runtime validator. A schema identifier does not trigger network access in these APIs.

Rebuild the profile together with its owner inventory and route artifacts. A standalone profile migration does not
rewrite external inventories. The unified HTML renderer writes the current profile and records that actual version.
The independent JSDoc theme, plugin handoff and theme bridge declare the current version; the project runner checks a
generated artifact's identity against its bridge and records the actual identity. An unreadable, unknown or mismatched
identity yields `HIA_JSDOC_PRESENTATION_ARTIFACT_INVALID` and no presentation inventory entry; other valid artifacts can
remain in a partial producer result. This minimal inventory check is not full profile validation.

Browser readers consume owner-generated HTML metadata and remain owned by their renderer. Core migration/plan success
does not establish browser correctness, source availability or deployment. See the
[contract](documentation-presentation-profile-contract.md) and [policy reference](presentation-profile-policy.md).
