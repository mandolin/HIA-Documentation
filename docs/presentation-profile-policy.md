# Presentation Theme, Privacy And Diagnostic Responsibilities

This reference describes the current `documentation-presentation-profile@1.0.0` behavior in `@hia-doc/core`.
Use it with [pages and identity](presentation-page-identity.md), [source plans](presentation-source-plan.md) and the
[contract](documentation-presentation-profile-contract.md). Declarations, validation and host execution have distinct responsibilities.

## Theme Declarations

`DOCUMENTATION_PRESENTATION_SCHEMES` and `DocumentationPresentationScheme` expose `dark`, `light`, `system` in that order.
Core does not query a device or load CSS. The owner interprets `system`; it is not a CSS `prefers-color-scheme` value.

The four `DocumentationPresentationSkin` fields are:

| Field | Requirement |
| --- | --- |
| `skinId` | Unique logical identity within the skin catalog. |
| `capabilities` | Zero to 64 unique, sorted logical identities; declarations do not prove implementation. |
| `supportedSchemes` | Nonempty, unique, sorted subset of the three schemes. |
| `tokenContract` | One to 256 characters, not an absolute filesystem path; no trimming, parsing, fetching or existence/version check. |

Version 1.0.0 refuses whitespace-only tokenContract values; exact historical 0.1.0-draft remains readable without that new restriction. In either version,
validation does not establish that a referenced token contract exists.

The four `DocumentationPresentationThemeProfile` fields are:

| Field | Requirement |
| --- | --- |
| `skinId` | Exact catalog selection; no automatic default. |
| `scheme` | Explicit neutral scheme supported by the selected skin. |
| `requiredCapabilities` | Zero to 64 unique, sorted identities, all provided by the selected skin. |
| `skins` | Three to 64 entries, uniquely identified and sorted by `skinId`. |

Ordering uses the [ASCII logical identity rules](presentation-page-identity.md#modes-and-values). Unselected skins need
not cover the selected scheme or every required capability. Core does not verify routes, DOM, CSS or actual accessibility.

## Privacy Declarations

`DocumentationPresentationPrivacy` contains eight required fields:

| Field | Required declaration |
| --- | --- |
| `absolutePathsIncluded` | `false`. |
| `cookiesRequired` | `false`. |
| `credentialsIncluded` | `false`. |
| `privateSidecarsIncluded` | `false`. |
| `sourceBodyInContract` | `false`. |
| `sourceBodyInSearchIndex` | `false`. |
| `telemetryEnabled` | `false`. |
| `sourceExposure` | `none` in source mode none; `public-explicit` otherwise. |

These are explicit producer obligations. Core checks the literals and selected structural/privacy boundaries; it does
not inspect host traffic, indexes or sidecars, prove authorization, or comprehensively scan text for secrets.

Input diagnostics must have a closed shape, nonempty code/message and a severity of info/warning/error. Optional
path/targetPath fields reject absolute-looking paths. Data is checked recursively for a fixed set of prohibited keys
and absolute-looking string values; the ordinary JSON input guard also rejects non-JSON values/accessors/cycles.
Free code/message text is not a general redaction boundary. A valid profile can retain sensitive text unless its producer
and host review it. Do not treat validation success or literal false declarations as publication consent.

## Compatibility And Root Fields

The four `DocumentationPresentationCompatibility` fields are fixed: `versionMatch=exact`, `unknownProperties=reject`,
`identityChange=new-contract-version`, `semanticChange=new-contract-version`. They do not implement a migration,
infer SemVer compatibility, silently discard unknown data or accept a future contract version.

`DocumentationPresentationProfile` has eleven required fields:

| Field | Responsibility |
| --- | --- |
| `contract` | Exact `documentation-presentation-profile`. |
| `contractVersion` | Exact current `1.0.0` or historical `0.1.0-draft`; no inferred versions. |
| `profileId` | Logical identity; excluded from topic identity comparison. |
| `status` | Explicit ready/refused; not inferred from diagnostic severity. |
| `diagnostics` | At most 128 input records; not forwarded as validator/comparator output. |
| `pagePartition` | Complete page declarations/projections, not an actual router. |
| `identityPolicy` | Exact stable-field and page-projection declarations. |
| `source` | Complete source manifest/policy, without I/O authority. |
| `theme` | Selection and capability declarations, without CSS/device state. |
| `privacy` | The eight explicit declarations above. |
| `compatibility` | The four fixed compatibility policies above. |

A ready profile may contain error-severity input diagnostics. A refused profile can still be structurally valid and
contain usable assets. The existing pure fetch builder does not independently block refused status; hosts must process
the original status/diagnostics before executing a plan. Both supported versions preserve this separation; plan success is not execution consent.

## Validation And Comparison Diagnostics

`validateDocumentationPresentationProfile()` checks an independent ordinary JSON snapshot, then complete closed-world
shape, exact identity/version and implemented child/cross-field rules. It inserts no default and mutates no input.
The returned array contains only newly generated validation errors, not copies of admitted input diagnostics.
Empty means those checks passed, not that free text was redacted or host behavior verified.

`compareDocumentationPresentationIdentity()` validates both inputs first. For invalid inputs it concatenates reference
then candidate validation errors and deduplicates by code/path/message. It does not forward original input records.
For valid profiles it applies the [topic/page identity rules](presentation-page-identity.md#identity-policy-and-comparison).
Generated diagnostic wrappers and arrays are new and mutable; callers should not assume runtime freezing.

`DOCUMENTATION_PRESENTATION_DIAGNOSTIC_CODES` is the module's twelve-code vocabulary, not an allowlist for nonempty input
diagnostic codes. `PRESENTATION_SOURCE_MODE_INVALID` is currently reserved: an unsupported source mode is reported through
`PRESENTATION_SOURCE_ASSET_INVALID`. Private-key checks can precede generic shape errors; a privacy diagnostic does not
claim that every other property was checked or every secret found.

## Reader Result And Export Ownership

`DOCUMENTATION_SOURCE_READER_STATES`/`DocumentationSourceReaderState` and
`DOCUMENTATION_SOURCE_READER_EVENTS`/`DocumentationSourceReaderEvent` describe the nine states and nine events.
`transitionDocumentationSourceReader()` is synchronous and retains no reader instance state. Valid network/integrity
failure events change state with empty diagnostics; it does not observe a response or generate a host error message.
Invalid transitions generate diagnostics and preserve state. See the [runtime boundary](documentation-presentation-profile-contract.md#runtime-state-and-event-inputs).

`DocumentationSourceReaderTransitionResult` has two mutable fields: `state` and a new `diagnostics` array. Separate calls
return independent wrappers/arrays. If types are bypassed, an invalid state echo is borrowed unchanged: it is unvalidated,
unredacted and not necessarily serializable. It must not be treated as a valid state or automatically published.

`DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT`, `DOCUMENTATION_PRESENTATION_PROFILE_CONTRACT_VERSION` and
`DOCUMENTATION_PRESENTATION_PROFILE_SCHEMA_ID` are exact primitive identities. The schema id is a logical public identity;
reading it performs no download. `DOCUMENTATION_PRESENTATION_PROFILE_JSON_SCHEMA` is Draft2020-12 and type-readonly, but
is shared and mutable at runtime. Some enum arrays alias the exported vocabulary arrays. Clone the schema before editing;
do not mutate shared exports. Runtime validation adds rules that the schema alone does not enforce.

Current writers/schema use 1.0.0 with exact historical reading and explicit migration. See
[version and migration guidance](presentation-profile-migration.md). Historical schema bytes and package versions remain
unchanged; this source update is not an npm release.
