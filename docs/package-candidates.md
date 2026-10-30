# Package candidates and runtime support

The current checkout declares Node.js **`^22.23.4 || ^24.22.1`** for its private
workspace root and all thirteen npm packages. These floors are the tested patches
on the supported Node.js 22 and 24 lines. CI tests their latest patches on Linux
and Windows; publishing continues to use Node.js 24. Other major versions and
earlier patches are outside this candidate's declared support range.

This is an **unreleased source change**. Existing npm tarballs retain their own
engine declarations and contents. Package versions and release statuses below
are checked-in identities, not approval to republish them or a system 1.0.0 release.

中文：源码候选的主仓根与十三包统一到已实测的Node.js22/24补丁下限；旧npm包不随源码变更。
包版本、契约版本、系统正式版及发行资格分别管理；通常安装只告警，严格检查须显式启用。

## Checked-in identities

The machine-readable owner is [the release manifest](../release/public-packages.json). Twelve necessary packages have completed source-candidate qualification and now carry `candidate` status with `1.0.0` targets. The independent language server remains separately versioned. A status of `candidate` is not publication readiness: publish preflight, registry/provenance, consumer verification and release approval are separate gates.

The previous column records the plan's prior published identity, not a fresh registry query or permission to replace that archive.

| Package | Current version | Status | Previous release-plan identity |
| --- | --- | --- | --- |
| `@hia-doc/core` | `1.0.0` | candidate | `0.1.2` |
| `@hia-doc/config` | `1.0.0` | candidate | `0.1.6` |
| `@hia-doc/profile` | `1.0.0` | candidate | `0.1.0` |
| `@hia-doc/parser-jsdoc` | `1.0.0` | candidate | `0.1.0` |
| `@hia-doc/plugin-sdk` | `1.0.0` | candidate | `0.1.2` |
| `@hia-doc/source-linkage` | `1.0.0` | candidate | `0.1.1` |
| `@hia-doc/theme-default` | `1.0.0` | candidate | `0.1.4` |
| `@hia-doc/browser-panel` | `1.0.0` | candidate | `0.1.0` |
| `@hia-doc/profiles` | `1.0.0` | candidate | `0.1.0` |
| `@hia-doc/renderer-html` | `1.0.0` | candidate | `0.1.8` |
| `@hia-doc/schemas` | `1.0.0` | candidate | `0.1.4` |
| `@hia-doc/lsp` | `0.1.0` | published | Separately versioned tooling |
| `@hia-doc/cli` | `1.0.0` | candidate | `0.1.11` |

中文：十二包1.0.0是已审源码候选；不得继续将旧0.x写作当前源码身份，也不得据此宣称npm发布、正式系统发行或允许重发旧包。

## Reproduce candidate checks

From the repository root on a supported runtime:

```sh
pnpm install --frozen-lockfile
pnpm run release:gate
pnpm --filter @hia-doc/source-linkage pack --pack-destination <candidate-directory>
```

`pnpm pack` rewrites `workspace:*` references to local package versions. For a
clean local candidate install, provide the complete required set of matching
tarballs in an independent directory and use `npm install --engine-strict
--ignore-scripts`. Installing one archive can resolve a dependency with the same
version from npm whose contents differ from this checkout.

Check each archive's manifest, exact rewritten dependencies and installed contents.
A successful local candidate install does not prove registry contents, provenance,
cross-repository compatibility or release approval. Before a real release, verify target versions remain unused, retain the completed
API/contract qualification evidence and repeat relevant registry,
provenance and consumer checks under [release governance](release-governance.md).

VSIX runtime staging checks the deployed LSP engine against the current release
manifest. Historical Visual Studio captures, prerequisite labels and helper
evidence retain their original scope; staging/build success does not establish
fresh host UI or runtime acceptance for this candidate.
