# Required packages: 1.0.0 candidate migration

The following twelve packages have coordinated `1.0.0` **source candidate**
identities. This page does not announce npm availability. Check the registry and
the release record before changing a deployed application's dependencies.

| Package | Previous manifest version | Candidate |
| --- | --- | --- |
| `@hia-doc/core` | `0.1.2` | `1.0.0` |
| `@hia-doc/config` | `0.1.6` | `1.0.0` |
| `@hia-doc/profile` | `0.1.0` | `1.0.0` |
| `@hia-doc/parser-jsdoc` | `0.1.0` | `1.0.0` |
| `@hia-doc/plugin-sdk` | `0.1.2` | `1.0.0` |
| `@hia-doc/source-linkage` | `0.1.1` | `1.0.0` |
| `@hia-doc/theme-default` | `0.1.4` | `1.0.0` |
| `@hia-doc/browser-panel` | `0.1.0` | `1.0.0` |
| `@hia-doc/profiles` | `0.1.0` | `1.0.0` |
| `@hia-doc/renderer-html` | `0.1.8` | `1.0.0` |
| `@hia-doc/schemas` | `0.1.4` | `1.0.0` |
| `@hia-doc/cli` | `0.1.11` | `1.0.0` |

This is a package boundary. The system release, documentation website, independent
language server and other tools have separate release decisions. The language
server retains its `0.1.0` source identity; rebuilding it against new dependencies
does not authorize republishing its already used npm version.

## Upgrade together and validate actual archives

The twelve packages retain existing `workspace:*` source dependencies. The pack
step rewrites their eighteen runtime and five development dependency edges to the
matching package versions. Applications should consume a verified matching set;
workspace links alone do not prove that an npm installation works. The dependency
order remains in [the release manifest](../release/public-packages.json).
For pending targets, `previousPublishedVersion` records the separately verified
older npm version. A published package-family listing refers to that older release;
it does not make the new candidate target available. Registry observations still
need refreshing before actual publication.

Supported runtimes remain `^22.23.4 || ^24.22.1`. This migration adds no runtime
dependency and makes no new Node.js major-version promise.

## Artifact and TypeScript compatibility

Use the [contract index](contract-index.md) for exact writable/readable artifact
versions. Package `1.0.0` does not mean that all artifact versions equal `1.0.0`:
the current documentation source-map candidate is `1.1.0`; generated binding,
coordinate evidence and other documented extensions retain their draft identities.

Review the applicable migrations before upgrading:

- [Core document](core-document-migration.md),
  [project manifest](project-manifest-migration.md) and
  [profile distribution](profile-distribution.md).
- [Presentation profile](presentation-profile-migration.md): explicit migration
  and exact historical readers; valid assets may yield pure request plans, while
  the host still owns execution permission.
- [Source ranges](doc-source-map-range-conventions.md): per-reference endpoint and
  column units, unknown precision and explicit migrations; ordinary map navigation
  does not by itself prove cross-map character equality.
- [Generated-binding TypeScript migration](generated-binding-typescript-migration.md):
  host projection exposes the true three-version union. Old exhaustive assignments
  need source changes even when their old artifacts remain readable at runtime.
- [UI locale migration](documentation-ui-locale-completeness-contract.md): rebuild a current
  report from actual message inputs; changing only its version is invalid.

Input validation, safe diagnostics, source publication authorization and host
message authorization remain required. A successful parse or render never grants
permission to read a local source file or execute an editor command.

The [public API inventory](public-api-surface.md) records the candidate's exact
structure. Final qualification additionally requires current/legacy tests,
supported runtimes, actual archives and independent installation. It cannot be
inferred from a version edit or a matching structural snapshot.

中文摘要：十二必要包协调为1.0.0源码候选，尚未据此公告npm可用或系统正式发行；工件身份、旧版读取、
TypeScript源码迁移、隐私及宿主授权分别遵循对应文档。独立语言服务器及其它试验工具不自动升版。
