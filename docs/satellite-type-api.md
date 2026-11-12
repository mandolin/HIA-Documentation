# Auditing satellite type declarations

The declaration audit uses the generic HIA TypeScript project producer to read the public declaration entry points of required satellite packages. It independently resolves their type-only exports and every explicitly declared member before comparing generated documentation.

## Running the audit

Build the main repository and prepare the satellite workspaces first. Run from `main-repo` with its workspace container as the authorized input.

```powershell
node --max-old-space-size=256 scripts/audit-satellite-type-api.mjs --workspace-root ..
```

The command writes an isolated `dist/satellite-type-api-*` directory containing a report and four actual producer artifacts per owner. The producer runs with that owner's source authority. A missing root, member, signature, explicit English or Simplified Chinese description, declaration range, or documentation-comment range makes the strict command exit with status 1. Production or validation errors also fail the command.

Append `--inspect` to inspect a partial result without treating coverage gaps as a failing process status. Always inspect `complete`, `rootGaps`, and `memberGaps` in the report. Inspection preserves the same coverage results.

### Programmatic package selection

`auditSatelliteTypeApi(workspaceRoot, options)` accepts an optional `packageNames` array of registered package names. An explicit selection is passed to the same required-package inventory and ownership checks. Empty, duplicate and unknown selections fail before tool loading or package reads. Omitting the option retains the complete required-package selection. The command-line arguments above retain their documented scope.

```js
import path from "node:path";
import {auditSatelliteTypeApi} from "./scripts/audit-satellite-type-api.mjs";

// <lang><zh-CN>从主仓选择容器及已登记的DotNetDoc包，同时核类型与声明值。</zh-CN><en>From the main checkout, select its container and registered DotNetDoc package, auditing types and declared values together.</en></lang>
const result = await auditSatelliteTypeApi(path.resolve(".."), {
  packageNames: ["@hia-doc/dotnet-source-extractor"],
  includeDeclarationValues: true
});
console.log(result.report);
```

中文说明。程序接口可用 `packageNames` 选择已登记包，范围选择贯穿同一归属及链接检查。空、重复和未知包名在加载工具和读取包之前拒绝；省略时继续原完整选择。命令入口沿上文参数范围。

## Verification boundaries

The independent TypeScript compiler inventory resolves public aliases to original declarations. Each physical member enters the expected inventory, including members in anonymous union and intersection branches. Inherited members are outside this inventory. The actual producer is separately responsible for extraction, bridge, HIA core, and direct documentation source-map artifacts.

The audit checks signatures and declaration/comment coordinates against the original source. Documentation source-map references must retain exclusive ends and UTF-16 code-unit columns. Source and package-manifest digests are checked again after generation. Input files must be regular owned files within the authorized package owner, outside dependency directories and within the configured size and node budgets.

This audit explicitly selects extraction and bridge `0.3.0-draft`, HIA core `0.2.0`, and direct documentation source-map `1.1.0`. Object, union, intersection and opaque type-expression nodes retain their parent relationships, source signatures and branch order. Physical members are checked through structural containers against their nearest original declaration. Structural nodes carry source facts, without generated natural-language documentation.

The generic project runner still defaults to `0.2.0-draft`. Its original signature/direct-member projection and exact legacy readers remain available. The independent audit previously reported twelve anonymous member gaps for that model. Migration requires re-extracting authorized source through explicit `options.extractionVersion: "0.3.0-draft"`. Opaque expressions concealing unsupported anonymous members fail production. Function return shapes retain their existing signature projection and are outside this structural type-alias/property subset.

The report records `runtimeStateVerified: false`, `coverageComplete: false`, and `releaseProof: false`. It verifies a bounded declaration projection. Runtime emission, ordinary source maps, cross-map identity, rendered-page acceptance, and release acceptance require their own evidence.

## Maintaining the audit

### Declaration-file value roots

```powershell
node --max-old-space-size=256 scripts/audit-satellite-type-api.mjs --workspace-root .. --declaration-values
```

This explicit mode selects the existing `0.4.0-draft` project producer and includes all declaration-file entry modules. Pure-type roots and members retain their separate checks. `declarationValues` additionally verifies each value binding, alias and overload against an independent source AST, including full declared signatures, distinct English/Chinese descriptions, signature parameter and return fields, explicit documentation blocks, and separate declaration/comment map references. Missing evidence makes the strict command fail. `--inspect` retains the same results while permitting partial-result inspection.

The value audit's scope is `declaration-value-roots`. Readonly variable types retain their complete original signatures. This mode preserves the existing structural-node boundary for aliases and properties. Its `nestedTypeMembersVerified` and `runtimeStateVerified` fields remain false. Declaration-file existence and matching JavaScript export names require separate implementation/compatibility evidence.

中文说明。显式模式在已有0.4链上增加声明值根审核，分别保留纯类型成员和公开别名/重载，不重标旧工件。原函数签名对应的参数、返回及显式注释块必须保留中英字段和精确来源。未启用时原0.3默认范围与旧读取保持。

```powershell
node --max-old-space-size=192 --test --test-concurrency=1 scripts/type-api-projection.test.mjs
```

These regressions also run through `api:check`. They cover aliases, anonymous members, original source identity, parent ownership, signatures, explicit locales, and separate declaration/comment source-map roles. The end-to-end command requires prepared satellite workspaces and runs separately from the self-contained regression suite.
