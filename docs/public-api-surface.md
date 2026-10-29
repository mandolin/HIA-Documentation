# Public API candidate inventory

The [versioned inventory](../release/public-api-surface.json) records the twelve
required packages' root exports, owner modules, call signatures, direct interface
fields, package subpaths and command-line bins for a `1.0.0` package candidate.
Comment-free declaration fingerprints also detect changes to aliases, readonly
modifiers, default expressions and exported constant initializers. A changed
fingerprint requires review; it does not automatically mean a breaking change.
It is release-engineering metadata, not a runtime wire contract or proof that a
package has been published.

Run the read-only structural check from the repository root:

```sh
node scripts/check-public-api-surface.mjs
```

The check rejects drift instead of silently rewriting its baseline. Matching
structure does not prove behavior, compatibility, complete documentation or
successful installation. Release qualification also requires the owning API
documentation, current/legacy contract tests, supported runtimes and real package
consumption. Defaults, diagnostics, privacy and side effects remain API behavior.

## Package APIs and artifact maturity

Package versions and artifact versions are independent. A stable package API can
read an exact historical or explicitly experimental artifact without changing its
identity or claiming that artifact has graduated. There is no automatic draft
promotion, implicit version-range acceptance or report-only version relabeling.

The required document, project-manifest, documentation-profile, producer/result,
documentation source-map, presentation-profile and UI-locale contracts have their
own candidate identities. Preserve their historical schemas and use the explicit
migration or rejection rules in the [contract index](contract-index.md).

Business-flow projections, generated binding, locale resource/discovery,
terminology, quality review and source-comment extensions retain their documented
experimental identities. Their presence in exports does not authorize source
disclosure, external adoption claims, writes or host commands. An extension used
by a required path still needs exact input validation and isolation; it cannot be
excluded from a required path's tests merely because it is experimental.

## Ownership and integration

| API group | Ownership and behavioral source |
| --- | --- |
| Core document, source model, text localization and protocol | [Core document migration](core-document-migration.md) and source JSDoc; exact current/legacy validation, no implicit wire upgrade. |
| Static configuration and project manifest | [Configuration](configuration.md), [manifest migration](project-manifest-migration.md); loading paths are host-internal, not public diagnostic payloads. |
| Profiles and official profile distribution | [Profile distribution](profile-distribution.md); catalog/profile/package versions remain independent. |
| Documentation producers | [Producer guide](documentation-producers.md); host-owned execution, fixed safe failures and exact result validation. |
| Source linkage | [Range conventions](doc-source-map-range-conventions.md); declared units and endpoint boundaries, verified anchors and historical readers remain distinct. |
| HTML and theme | [Shared assets and branding](shared-theme-assets.md), [theme API](default-theme-api.md); in-memory file ownership, explicit source disclosure and safe asset routing. |
| Browser panel | [Package guide](../packages/browser-panel/README.md); typed projection, encoded output attributes and host-owned message/target authorization. |
| Schemas | [Schema distribution](schema-distribution.md); exact identities, copied query results, immutable canonical history. |

The inventory does not certify a complete browser/IDE product or replace visual
and interaction acceptance. Independent language-server/provider tools outside
the twelve-package group retain their own version and release decisions.

中文摘要：清单固定十二必要包的公开结构，帮助发现遗漏与漂移；结构一致不是语义验收。软件包API、工件版本、
试验扩展及实际发行分别管理，旧输入迁移、权限/隐私、错误与默认值仍需相应验证。清单不自动授权发布。
