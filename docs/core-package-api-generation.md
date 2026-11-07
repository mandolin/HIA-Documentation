# Generating the core package APIs

The twelve core packages can generate their module API documents through the generic HIA TypeScript project producer. The entry audit covers the fixed 44-package scope, but this build command generates only the twelve core packages. Its report explicitly lists the remaining 32 packages and pending resource/command pages, source-comment/translation review and generated-page acceptance.

Prerequisites: build the main repository, prepare the HIA-owned workspace with `main-repo/` and the explicit satellite directories in `HIA/`, and install the matching TypeScript producer source candidate. The project producer API is required; an older installed single-file runner is not a substitute. The command loads only that authorized HIA tool; documented packages are inspected statically and are never imported or executed.

```sh
node scripts/build-core-package-api.mjs --workspace-root ..
```

Each package produces extraction, full semantic bridge, HIA and direct documentation source map JSON under `dist/core-package-api/packages/`. The build executes through `documentation-producer@1.0.0`, explicitly selects the independent TypeScript project profile, checks exact artifact contracts, validates HIA/maps with the actual core readers, and compares each module/export/declaration/field/source against the independent audit and extraction. Signatures, full supported bilingual fields and actual declaration ranges must survive projection; summary-only output fails.

`core-package-api-report.json` records actual output locators, counts, source-file and resource digests, source repository HEAD references and remaining work. A HEAD reference is not an assertion that every worktree file belongs to that commit; the separate digests identify the bytes inspected. JSON resources are parsed and hashed for audit, while command/resource documentation remains a separate acceptance task. No target command is executed. The report proves neither complete source-comment coverage nor human translation correctness.

The build does not clean unknown output files. Use only the successful current result manifest and registered outputs; stale files do not establish a successful current run. It does not deploy a website or publish packages. The old reference build and original profile/default catalog retain their existing behavior.

Independent satellite type declarations have a separate original-member audit. Its strict report retains anonymous union/intersection member gaps. See [Auditing satellite type declarations](satellite-type-api.md).
