# Auditing satellite type declarations

The declaration audit uses the generic HIA TypeScript project producer to read the public declaration entry points of required satellite packages. It independently resolves their type-only exports and every explicitly declared member before comparing generated documentation.

## Running the audit

Build the main repository and prepare the satellite workspaces first. Run from `main-repo` with its workspace container as the authorized input.

```powershell
node --max-old-space-size=256 scripts/audit-satellite-type-api.mjs --workspace-root ..
```

The command writes an isolated `dist/satellite-type-api-*` directory containing a report and four actual producer artifacts per owner. The producer runs with that owner's source authority. A missing root, member, signature, explicit English or Simplified Chinese description, declaration range, or documentation-comment range makes the strict command exit with status 1. Production or validation errors also fail the command.

Append `--inspect` to inspect a partial result without treating coverage gaps as a failing process status. Always inspect `complete`, `rootGaps`, and `memberGaps` in the report. Inspection preserves the same coverage results.

## Verification boundaries

The independent TypeScript compiler inventory resolves public aliases to original declarations. Each physical member enters the expected inventory, including members in anonymous union and intersection branches. Inherited members are outside this inventory. The actual producer is separately responsible for extraction, bridge, HIA core, and direct documentation source-map artifacts.

The audit checks signatures and declaration/comment coordinates against the original source. Documentation source-map references must retain exclusive ends and UTF-16 code-unit columns. Source and package-manifest digests are checked again after generation. Input files must be regular owned files within the authorized package owner, outside dependency directories and within the configured size and node budgets.

The current TypeScript project profile uses extraction and bridge `0.2.0-draft`, HIA core `0.2.0`, and direct documentation source-map `1.1.0`. That extraction model retains complete type signatures but does not emit every anonymous union/intersection member as a separate node. Such members remain explicit coverage gaps in this audit. A valid schema or complete root count cannot satisfy member coverage.

The report records `runtimeStateVerified: false`, `coverageComplete: false`, and `releaseProof: false`. It verifies a bounded declaration projection. Runtime emission, ordinary source maps, cross-map identity, rendered-page acceptance, and release acceptance require their own evidence.

## Maintaining the audit

```powershell
node --max-old-space-size=192 --test --test-concurrency=1 scripts/type-api-projection.test.mjs
```

These regressions also run through `api:check`. They cover aliases, anonymous members, original source identity, parent ownership, signatures, explicit locales, and separate declaration/comment source-map roles. The end-to-end command requires prepared satellite workspaces and runs separately from the self-contained regression suite.
