# Generating the core package APIs

The thirteen core packages can generate their module API documents through the generic HIA TypeScript project producer. The entry audit covers the fixed 45-package scope. This build command generates the thirteen core packages and records the remaining 32 packages and pending resource/command pages, source-comment/translation review and generated-page acceptance.

Prerequisites: build the main repository, prepare the HIA-owned workspace with `main-repo/` and the explicit satellite directories in `HIA/`, and install the matching TypeScript producer source candidate. The project producer API is required; an older installed single-file runner is not a substitute. The command loads only that authorized HIA tool; documented packages are inspected statically and are never imported or executed.

```sh
node scripts/build-core-package-api.mjs --workspace-root ..
```

Each package produces extraction, full semantic bridge, HIA and direct documentation source map JSON under `dist/core-package-api/packages/`. The build executes through `documentation-producer@1.0.0`, explicitly selects the independent TypeScript project profile, checks exact artifact contracts, validates HIA/maps with the actual core readers, and compares each module/export/declaration/field/source against the independent audit and extraction. Signatures, full supported bilingual fields and actual declaration ranges must survive projection; summary-only output fails.

`core-package-api-report.json` records actual output locators, counts, source-file and resource digests, source repository HEAD references and remaining work. A HEAD reference is not an assertion that every worktree file belongs to that commit; the separate digests identify the bytes inspected. JSON resources are parsed and hashed for audit, while command/resource documentation remains a separate acceptance task. No target command is executed. The report proves neither complete source-comment coverage nor human translation correctness.

Each package row also records `descriptionLocales`. It reads the original `description.localizedText.en` and `description.localizedText["zh-CN"]` fields and lists symbols with missing descriptions, missing language fields, or identical text. Language fallback and `remarks` cannot fill these description fields. `distinctPairs` counts explicit nonempty, different Chinese and English strings. `translationQualityVerified` remains false because string presence and difference require separate semantic review.

中文说明。报告将字段投影保真与原始description语言审阅分别记录。相同文本列为待人工核对，语言无关术语可在语义审阅时单独判定。正文/字段缺失仍需补齐，回退显示不充当双语来源证据。

The build does not clean unknown output files. Use only the successful current result manifest and registered outputs; stale files do not establish a successful current run. It does not deploy a website or publish packages. The old reference build and original profile/default catalog retain their existing behavior.

Independent satellite type declarations have a separate original-member audit using explicit 0.3 selection. See [Auditing satellite type declarations](satellite-type-api.md).

## Compiled SDK subpaths

The audited input file explicitly maps the SDK derivation-evidence and plain-data-initialization code subpaths to authored TypeScript. Both distribution conditions and their original targets remain in the inventory. A static comparison checks each declaration branch against all authored export names and each runtime branch against value exports. Missing or extra names fail before generation. The recorded source and target digests identify the inspected bytes. This check establishes name correspondence. Runtime values and type compatibility require their package checks.

Run the separate strict wrapper audit for complete SDK subpath members.

```sh
node scripts/audit-sdk-subpath-api.mjs --workspace-root ..
```

This uses the same generic producer with explicit 0.4 selection and verifies authored declarations, bilingual fields, physical members and generic/array/readonly expression nodes against the independent compiler. Its unique output directory contains the four actual artifacts and a report. The main core build retains its 0.2 mode. SDK declarations share identities across export conditions only through their explicit source mappings.

JSON resources use their own per-value generation and provenance checks.

```sh
node scripts/build-required-json-resources.mjs --workspace-root .. --locale und
```

Here `und` explicitly records unclassified resource language. The report records actual values, lexical reference occurrences and source locations. Module counts cannot establish resource or rendered-page acceptance.
