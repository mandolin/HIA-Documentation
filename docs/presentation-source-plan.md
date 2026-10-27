# Presentation Source Assets And Fetch Plans

`documentation-presentation-profile@1.0.0` describes metadata and pure request plans. It does not fetch, read files,
hash responses, resolve origins, execute source or grant publication permission. Validate complete profiles: structural
TypeScript compatibility alone does not prove validity. See the [contract](documentation-presentation-profile-contract.md).

## Modes And Manifest

`DOCUMENTATION_PRESENTATION_SOURCE_MODES` contains `fetch`, `embed`, `link`, `none` in that order;
`DocumentationPresentationSourceMode` is the corresponding union. `DOCUMENTATION_PRESENTATION_DIGEST_ALGORITHMS` contains
`sha256`, `sha384`, `sha512`. Both shared tuples are type-readonly but not runtime-frozen; do not mutate them.

The five `DocumentationPresentationSourceProfile` fields are:

| Field | Requirement |
| --- | --- |
| `defaultMode` | Required `fetch`, independent of the actual mode. No omitted default is inserted. |
| `mode` | Actual `fetch`, `embed`, `link` or `none`. |
| `fallbackPolicy` | Required `none`; failures do not silently switch modes. |
| `assets` | Zero to 10,000 entries sorted by `assetId`; `assetId` and `sourceId` are independently unique. |
| `readerPolicy` | Explicit valid policy in every mode, including `embed` and `none`. |

Fetch/link require a URL on every asset; embed may omit it. None requires an empty manifest and
`privacy.sourceExposure=none`; other modes require `public-explicit`. An empty fetch manifest is valid, but planning an
absent asset is refused. Different assets may share a URL or map id.

## Asset And Digest Fields

`DocumentationPresentationSourceAsset` has ten fields:

| Field | Meaning and requirement |
| --- | --- |
| `assetId` | Unique logical asset identity and sort key. |
| `sourceId` | Unique logical source identity, not a physical path. |
| `sourceMapId` | Optional logical reference; existence and uniqueness are not checked. |
| `classification` | Required `public` declaration, not proof of authorization. |
| `revision` | Restricted seven-to-128-character label; need not be a Git SHA or occur in the URL. |
| `relativeUrl` | Relative string of one to 2048 characters; required for fetch/link. |
| `mediaType` | Restricted two-to-128-character string, not a complete MIME parser or actual response Content-Type. |
| `digest` | Complete algorithm/value metadata. |
| `byteLength` | Optional safe integer from zero to 16,777,216 bytes. |
| `lineCount` | Optional safe integer from zero to 100,000 lines. |

Ids follow the [logical identity rules](presentation-page-identity.md#modes-and-values). Revision labels match
`^[A-Za-z0-9][A-Za-z0-9._:-]{6,127}$`. Sizes/lines are declarations, not measurements, and are not cross-checked against
this profile's limits. A larger declaration can still produce a plan; the host enforces limits during reading.

`DocumentationPresentationDigest` has two fields: `algorithm` and `value`. The three algorithms require inferred decoded
lengths of 32, 48 and 64 bytes. Validation checks standard base64 alphabet, complete four-character groups, padding syntax
and inferred length. It does not normalize unused padding bits, hash a body, choose an algorithm or accept multi-token
SRI expressions in `value`.

## Relative URL Boundary

Raw leading/trailing ASCII spaces are refused: browsers strip them before parsing, which can hide an absolute scheme
or authority. Raw controls/DEL, backslashes, query/fragment delimiters, scheme prefixes, rooted paths, malformed percent
encoding and decoded traversal segments are also refused. Input is not trimmed and then accepted.

Internal spaces and percent-encoded filename characters retain existing behavior. One percent-decoding pass is used
for traversal checks over the complete path: decoded question/hash characters remain filename data and must not hide
later dot-dot segments. The supplied URL remains unchanged. Core does not simulate repeated server decoding, rewrites,
symlinks or real URL resolution. The host resolves it against an approved documentation root and verifies actual origin
and allowed path before use.

## Reader Policy And Limits

The seven `DocumentationPresentationSourceReaderPolicy` fields are:

| Field | Required value |
| --- | --- |
| `endpointPolicy` | `same-origin-relative`; the host verifies actual origin/root. |
| `credentials` | `omit`; same-origin alone does not omit credentials. |
| `requestMode` | `same-origin`. |
| `redirect` | `error`. |
| `cache` | `default`, without a promise of hits or persistence. |
| `bodyExecution` | `false`; the host renders safe text. |
| `limits` | Explicit `DocumentationPresentationSourceLimits`. |

The three limit fields are safe integers: `maxBytes` from 1 to 16,777,216; `maxLines` from 1 to 100,000; `timeoutMs` from
100 to 60,000 milliseconds, inclusive. Core creates no timer, `AbortSignal`, decoder, stream or cache.

## Pure Plan And Result

`createDocumentationSourceFetchPlan(value, assetId)` validates a complete snapshot, requires actual mode fetch and matches
an exact valid asset id with a URL. Invalid profiles return validation diagnostics; other refusals return
`PRESENTATION_SOURCE_FETCH_PLAN_REFUSED` without a partial plan. Asset ids are neither trimmed nor coerced.

The nine readonly `DocumentationSourceFetchPlan` fields are `assetId`, `sourceId`, `relativeUrl`, `revision`, `mediaType`,
`integrity`, `request`, `limits`, `bodyPolicy`. Strings retain selected asset values; integrity is `algorithm-value`.
Request fixes `cache=default`, `credentials=omit`, `mode=same-origin`, `redirect=error`. Limits are a detached copy;
body policy fixes `execute=false`, `includeInSearchIndex=false`. The plan and all three nested policies are frozen;
caller input is unchanged.

`DocumentationSourceFetchPlanResult` has three mutable fields: `status`, `diagnostics`, optional `plan`. Actual success
returns ready, empty diagnostics and a frozen plan; refusal returns refused without a plan. This interface is not a
discriminated union: check plan before use. The wrapper and diagnostic array are not frozen.

### Current Profile Status Behavior

Both exact supported versions accept safe profiles with `status=refused`. The builder does not independently block that status
or copy existing safe profile diagnostics: a remaining valid asset can produce a ready plan with empty result diagnostics.
Ready means construction succeeded, not source approval, cleared original diagnostics or a verified response. Hosts must
handle original status/diagnostics before execution. Both versions retain this per-asset pure-plan policy.

Hosts also enforce CSP, origin/path, actual byte/line/time limits and response digest; map outcomes to reader events; and
render only approved text without executing it. Current writers/schema use 1.0.0 with exact historical reading and
explicit migration; see [version and migration guidance](presentation-profile-migration.md). Previously published npm
archives and package versions remain unchanged by this source update.
