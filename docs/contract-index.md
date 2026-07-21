# HIA Contract Index

This page summarizes the first stable contract baseline implemented in this monorepo.

## Version Snapshot

| Surface | Export / file | Version |
| --- | --- | --- |
| Core document schema | `HIA_CORE_CONTRACT_VERSION` / `HIA_DOCUMENT_SCHEMA_VERSION` | `0.2.0` |
| Text i18n model | `HIA_TEXT_I18N_MODEL_VERSION` | `0.2.0` |
| Source model | `HIA_SOURCE_MODEL_VERSION` | `0.2.0` |
| Config schema | `HIA_CONFIG_SCHEMA_VERSION` | `0.1.0` |
| Documentation profile schema | `HIA_PROFILE_SCHEMA_VERSION` | `0.1.0-draft` |
| Official profile catalog | `HIA_OFFICIAL_PROFILE_CATALOG_VERSION` | `0.1.0-draft` |
| Schema distribution catalog | `HIA_SCHEMA_CATALOG_VERSION` | `0.1.0-draft` |
| Doc source map schema | `DOC_SOURCE_MAP_SCHEMA_VERSION` | `0.1.0-draft` |
| Documentation producer descriptor/result | `DOCUMENTATION_PRODUCER_CONTRACT_VERSION` | `0.1.0-draft` |
| HIA provider descriptor/request/result | `HIA_PROVIDER_*_CONTRACT_VERSION` | `0.1.0-draft` |
| Renderer manifest | `HIA_RENDER_HTML_MANIFEST_SCHEMA_VERSION` | `0.1.0` |
| Project navigation index | `HIA_PROJECT_NAVIGATION_INDEX_CONTRACT_VERSION` | `0.1.0-draft` |
| LSP host result metadata | `HIA_LSP_HOST_RESULT_CONTRACT_VERSION` | `0.1.0-draft` |
| LSP documentation edit proposals | `HIA_DOCUMENTATION_EDIT_PROPOSALS_CONTRACT_VERSION` | `0.1.0-draft` |
| LSP documentation edit apply preflight | `HIA_DOCUMENTATION_EDIT_APPLY_PREFLIGHT_CONTRACT_VERSION` | `0.1.0-draft` |
| LSP documentation edit diff preview | `HIA_DOCUMENTATION_EDIT_DIFF_PREVIEW_CONTRACT_VERSION` | `0.1.0-draft` |
| Apply boundary audit evidence | `scripts/prepare-wp34-apply-boundary-audit.mjs` | `0.1.0-draft` |
| Edit diff preview evidence | `scripts/prepare-wp34-diff-preview-evidence.mjs` | `0.1.0-draft` |
| Edit apply preflight evidence | `scripts/prepare-wp34-apply-preflight-evidence.mjs` | `0.1.0-draft` |
| VS Code apply preview evidence | `scripts/prepare-wp34-vscode-apply-preview-evidence.mjs` | `0.1.0-draft` |
| Host apply preview evidence | `scripts/prepare-wp34-host-apply-preview-evidence.mjs` | `0.1.0-draft` |
| Target project dry-run evidence | `scripts/prepare-wp34-target-dry-run-evidence.mjs` | `0.1.0-draft` |
| Apply contract closeout provider inputs | `scripts/prepare-wp34-closeout-provider-inputs.mjs` | `0.1.0-draft` |
| Provider boundary audit evidence | `scripts/prepare-wp35-provider-boundary-audit.mjs` | `0.1.0-draft` |
| Provider adapter interface evidence | `scripts/prepare-wp35-provider-adapter-evidence.mjs` | `0.1.0-draft` |
| Deterministic mock provider evidence | `scripts/prepare-wp35-provider-mock-evidence.mjs` | `0.1.0-draft` |
| Local provider runner evidence | `scripts/prepare-wp35-provider-runner-evidence.mjs` | `0.1.0-draft` |
| Host review provider evidence | `scripts/prepare-wp35-host-review-provider-evidence.mjs` | `0.1.0-draft` |
| Target/self-doc provider dry-run evidence | `scripts/prepare-wp35-target-self-doc-provider-dry-run-evidence.mjs` | `0.1.0-draft` |
| Provider integration closeout checked-apply inputs | `scripts/prepare-wp35-closeout-checked-apply-inputs.mjs` | `0.1.0-draft` |
| Real provider governance baseline evidence | `scripts/prepare-wp36-real-provider-governance-audit.mjs` | `0.1.0-draft` |
| Provider registry installation policy evidence | `scripts/prepare-wp36-provider-registry-installation-policy.mjs` | `0.1.0-draft` |
| Secret storage boundary evidence | `scripts/prepare-wp36-secret-storage-boundary.mjs` | `0.1.0-draft` |
| Network mediation consent evidence | `scripts/prepare-wp36-network-mediation-consent.mjs` | `0.1.0-draft` |
| Source excerpt privacy gate evidence | `scripts/prepare-wp36-source-excerpt-privacy-gate.mjs` | `0.1.0-draft` |
| Safe invocation dry-run evidence | `scripts/prepare-wp36-safe-invocation-dry-run.mjs` | `0.1.0-draft` |
| Real provider governance closeout checked-apply inputs | `scripts/prepare-wp36-closeout-checked-apply-inputs.mjs` | `0.1.0-draft` |
| Checked apply baseline audit | `scripts/prepare-wp37-checked-apply-baseline-audit.mjs` | `0.1.0-draft` |
| Host edit transaction evidence | `scripts/prepare-wp37-host-edit-transaction-evidence.mjs` | `0.1.0-draft` |
| Host file read/version/conflict evidence | `scripts/prepare-wp37-file-read-version-conflict-evidence.mjs` | `0.1.0-draft` |
| Host rollback/formatter/audit evidence | `scripts/prepare-wp37-rollback-formatter-audit-evidence.mjs` | `0.1.0-draft` |
| VS Code checked apply confirmation evidence | `scripts/prepare-wp37-vscode-checked-apply-confirmation-evidence.mjs` | `0.1.0-draft` |
| Visual Studio host skeleton | `apps/visual-studio-extension/host-contract.json` | `0.1.0-draft` |
| Protocol envelope | `HIA_PROTOCOL_ENVELOPE_VERSION` | `0.1.0` |
| JSDoc Integration input | `JSDOC_HIA_INTEGRATION_CONTRACT_VERSION` | `0.1.0` |
| JSDoc adapter bridge | `JSDOC_ADAPTER_CORE_BRIDGE_VERSION` | `0.1.0` |
| JSDoc adapter metadata | `JSDOC_ADAPTER_METADATA_SCHEMA_VERSION` | `0.1.0` |

## Contract Surfaces

| Surface | Owner package | Notes |
| --- | --- | --- |
| Core document | `@hia-doc/core` | Language-neutral document, node, symbol, i18n, source and diagnostic model. |
| JSON Schema draft | `@hia-doc/core` | Serializable draft exported as `HIA_DOCUMENT_SCHEMA`. |
| Runtime validation | `@hia-doc/core` | `validateHiaDocumentDetailed()` is the shared guard used by tests, CLI and LSP. |
| Diagnostics registry | `@hia-doc/core` | `HIA_DIAGNOSTIC_CODE_REGISTRY` records known cross-layer codes. |
| Protocol envelope | `@hia-doc/core` | Lightweight message envelope, not split into a separate package yet. |
| Project config | `@hia-doc/config` | Project/build profile settings. Config is not part of the core document IR. |
| Documentation profile runtime | `@hia-doc/profile` | Loads, validates, normalizes and queries tag/rule/mapping/diagnostic profile registries. Profile is not part of the core document IR. |
| Official profile distribution | `@hia-doc/profiles` | Distributes official profile JSON, catalog metadata and defensive-copy accessors. |
| Schema distribution | `@hia-doc/schemas` | Distributes owner-preserving schema snapshots and catalog metadata without taking over contract ownership. |
| Doc source map tooling | `@hia-doc/source-linkage` | Owns the main-repo schema, semantic path/privacy validator and normalized index for the neutral `doc-source-map` contract. |
| Documentation producer | `@hia-doc/plugin-sdk` | Owns descriptor/request/result types, schemas, semantic validation and single-run execution helper; it does not load modules or orchestrate builds. |
| HIA provider adapter | `@hia-doc/provider-sdk` | Owns review-only provider descriptor/request/result types, schemas, semantic validation and execution guard. Providers may return proposals and metadata, but not direct edits, source bodies, tool calls or target repository mutations. |
| HIA deterministic mock provider | `@hia-doc/provider-mock` | First offline provider implementation for host/runner/evidence tests. It produces stable review-only draft text and metadata without API keys, network calls, source bodies or direct edits. |
| HIA local provider runner | `@hia-doc/provider-runner` | Converts bounded review payloads into provider-safe requests and returns provider output as review payload augmentation. It does not produce WorkspaceEdit data, source bodies, tool calls or target repository mutations. |
| Renderer manifest | `@hia-doc/renderer-html` | Renderer output summary. CLI may wrap it into a build output manifest. |
| Project navigation index | `@hia-doc/renderer-html` | Presentation-neutral project entry index for static portals and search; it excludes inline source previews. |
| Project docs manifest | `@hia-doc/cli` | CLI input contract for aggregating JS, CSS, HTML extraction and doc-source-map artifacts into one rendered project page. It is outside core IR. |
| LSP resource index | `@hia-doc/lsp` | IDE view model derived from core documents. It is not a core source of truth. |
| LSP host result metadata | `@hia-doc/lsp` | Additive metadata on selected `hia/*` custom request responses for request version, capability, result source and empty-state handling. |
| LSP documentation edit proposals | `@hia-doc/lsp` | Public-safe, reviewable proposal view model for AI-assisted authoring. It does not carry private source text or directly applicable WorkspaceEdit output. |
| LSP documentation edit apply preflight | `@hia-doc/lsp` | Host-side preflight metadata for file-version, conflict and rollback checks required before any future human-approved apply. It is not executable. |
| LSP documentation edit diff preview | `@hia-doc/lsp` | Semantic patch-preview metadata nested under edit candidates. It describes intended operations, but is non-executable and not a WorkspaceEdit. |
| Apply boundary audit evidence | `main-repo` scripts | W-P34 audit evidence tying review payloads, edit candidates, resource preflight and host surfaces together before any writable apply contract is designed. |
| Target project dry-run evidence | `main-repo` scripts | Target-facing W-P34 evidence that maps review/diff/preflight inputs to known project scenarios without exposing absolute paths or mutating target repositories. |
| Apply contract closeout provider inputs | `main-repo` scripts | W-P34 closeout evidence that proves provider integration may consume bounded review inputs only, while direct writes and checked apply remain deferred. |
| Provider boundary audit evidence | `main-repo` scripts | W-P35 audit evidence for provider-neutral, review-only integration before any real provider API, tool execution or checked apply implementation. |
| Provider adapter interface evidence | `main-repo` scripts | W-P35 evidence proving the provider SDK accepts safe fixtures and rejects unsafe capabilities, source-body inputs and direct edit outputs before deterministic mock providers are implemented. |
| Deterministic mock provider evidence | `main-repo` scripts | W-P35 evidence proving the first provider implementation is offline, deterministic, review-only and mediated by `@hia-doc/provider-sdk`. |
| Local provider runner evidence | `main-repo` scripts | W-P35 evidence proving provider output can be routed back into review payload augmentation without source bodies, WorkspaceEdit objects or target repository mutation. |
| Host review provider evidence | `main-repo` scripts | W-P35 evidence proving VS Code, DevTools and Visual Studio review surfaces can display provider augmentation while apply/write authority remains disabled. |
| Target/self-doc provider dry-run evidence | `main-repo` scripts | W-P35 evidence proving deterministic provider review output can be routed to HIA self-documentation and known target-project scenarios without source bodies, API keys, network calls or repository mutation. |
| Provider integration closeout checked-apply inputs | `main-repo` scripts | W-P35 closeout evidence that records provider integration as review-only complete and turns real provider execution plus checked apply into explicit downstream planning inputs. |
| Real provider governance baseline evidence | `main-repo` scripts | W-P36 evidence defining mandatory gates for real provider registry, secret storage, network consent, audit logs, source excerpt opt-in and checked-apply separation. |
| Provider registry installation policy evidence | `main-repo` scripts | W-P36 evidence defining provider registry entries, explicit installation defaults, license/provenance requirements and remote-provider blocked status before secret/network gates pass. |
| Secret storage boundary evidence | `main-repo` scripts | W-P36 evidence defining host-managed provider secret references, redaction, lifecycle, audit and release gates without serializing secret values. |
| Network mediation consent evidence | `main-repo` scripts | W-P36 evidence defining host-mediated remote provider network envelopes, consent scopes, destination allowlists, redacted audit metadata and refusal/rate-limit handling without performing external calls. |
| Source excerpt privacy gate evidence | `main-repo` scripts | W-P36 evidence defining default-deny source excerpt policy, bounded opt-in profiles, redaction/release gates and reference-only evidence before safe invocation dry-run. |
| Safe invocation dry-run evidence | `main-repo` scripts | W-P36 evidence executing the deterministic mock provider through the local runner while keeping remote provider calls blocked, review-only and source/secret/write-free. |
| Real provider governance closeout checked-apply inputs | `main-repo` scripts | W-P36 closeout evidence proving provider governance gates are ready while remote/API provider calls and checked apply remain explicit downstream inputs. |
| Checked apply baseline audit | `main-repo` scripts | W-P37 audit evidence converting W-P34 apply-preview and W-P36 provider-governance closeouts into host-owned checked-apply requirements before any writable implementation. |
| Host edit transaction evidence | `main-repo` scripts | W-P37 evidence mapping review edit candidates to host-owned, non-executable transaction envelopes before file-read/version/conflict evidence exists. |
| Host file read/version/conflict evidence | `main-repo` scripts | W-P37 evidence modeling host-owned file snapshots, private version hashes, semantic ranges and conflict results before rollback, formatter, audit or apply confirmation exists. |
| Host rollback/formatter/audit evidence | `main-repo` scripts | W-P37 evidence modeling rollback records, formatter/post-apply validation plans and redacted audit drafts before any host confirmation or workspace write exists. |
| VS Code checked apply confirmation evidence | `main-repo` scripts | W-P37 evidence proving VS Code can render host confirmation choices and reports from rollback/formatter/audit readiness records without calling WorkspaceEdit or writing files. |
| IDE/LSP capability | `@hia-doc/lsp` and IDE shells | Capability ownership, profile-derived authoring data, authoring boundary and resource action/preflight data, consumed by IDE shells. |
| Visual Studio host skeleton | `apps/visual-studio-extension` | Hybrid host mapping for VisualStudio.Extensibility commands/tool windows and Visual Studio LSP consumption. |
| JSDoc adapter bridge | `@hia-doc/parser-jsdoc` | Converts JSDoc Integration JSON into core documents and sanitizes metadata. |

## Fixtures

| Fixture | Purpose |
| --- | --- |
| `fixtures/core-minimal.hia.json` | Minimal valid core document. |
| `fixtures/basic.hia.json` | Shared renderer/CLI/LSP fixture with i18n and source metadata. |
| `fixtures/i18n-resource.hia.json` | Field key/path, external i18n resource and resolution source fixture. |
| `fixtures/source-reference.hia.json` | Source location, primary block, fragments, references, links and preview fixture. |
| `fixtures/jsdoc-integration.basic.json` | Realistic JSDoc Integration adapter input. |
| `fixtures/jsdoc-integration.compat.json` | Adapter compatibility input for metadata sanitization and diagnostic data passthrough. |
| `fixtures/jsdoc-integration.real-basic.json` | Real JPHS basic output, with local paths replaced by synthetic absolute paths for adapter sanitation tests. |
| `fixtures/project-mixed.hia-project.json` | Project aggregation manifest combining JS, CSS, HTML and doc-source-map artifacts. |
| `fixtures/project-mixed-alert.htmdoc.json` | HTMDoc-style extraction artifact consumed by the project aggregation fixture. |
| `fixtures/project-mixed-alert.cssdoc.json` | CSSDoc-style extraction artifact consumed by the project aggregation fixture. |
| `fixtures/project-mixed-alert.docmap.json` | Documentation source map artifact referenced by the project aggregation fixture. |
| `fixtures/producer/basic.producer-descriptor.json` | Valid documentation producer descriptor fixture. |
| `fixtures/producer/basic.producer-result.json` | Valid serializable producer result with extraction/core/source-linkage artifacts. |

## Rules

- Stable semantics should be represented by formal core fields, not by adapter metadata.
- `metadata` is opaque trace data. Consumers may ignore unknown metadata.
- `summary` is a compatibility/render cache. Field-level i18n is the text source of truth.
- Source and i18n resource paths must stay relative and must not escape with `..`.
- Diagnostics use stable `code`, `severity`, human-readable `message`, optional `targetPath/path` and optional machine-readable `data`.
- Documentation profile is the shared tag/rule/mapping/diagnostic configuration layer. It should not replace parser, extractor, adapter or renderer responsibilities.
- LSP and IDE shells may consume normalized documentation profile runtime data for completion, hover and capability summaries, but should not redefine profile semantics.
- Project docs manifests are explicit aggregation manifests. They should reference language extraction artifacts instead of making the CLI parse source languages directly.
- Documentation producers are explicitly configured wrappers around standalone doc-line APIs; core and the plugin SDK do not depend on language satellite packages.
- LSP resource index data is derived from core documents and should not be written back into core documents.
- LSP host result metadata is additive and should guide host fallback behavior; it does not replace the request-specific payload.
- LSP documentation edit proposals are review targets, not edits to apply automatically. They must keep `sourcesContentPolicy: none`, `allowsAutomaticWrites: false` and `requiresHumanReview: true` until a later WorkspaceEdit contract is explicitly defined.
- LSP documentation edit apply preflight records required host checks only. `status: requires-host-check` still means file versions are not read, conflicts are not checked and rollback records must be created before any later apply.
- LSP documentation edit diff previews are semantic previews only. They must set `executable: false`, exclude source bodies, omit direct `workspaceEdit`/`documentChanges` objects and defer file-version/conflict checks to the apply metadata phase.
- Apply boundary audit evidence is a readiness and guardrail artifact. It may summarize edit-candidate and resource-preflight metadata, but it must not expose absolute paths, source bodies, `sourcesContent` or directly applicable edit objects.
- Target project dry-run evidence may name target project labels and documentation needs, but it must redact local target paths, avoid source bodies, avoid `sourcesContent` and perform no target repository mutation.
- Apply contract closeout provider-input evidence allows provider integration to start only as review-input / review-output. It must continue denying direct workspace writes, direct edit objects, target mutation and human-review bypass.
- Provider boundary audit evidence records the provider-neutral safety baseline. It must not require API keys, perform external provider calls, expose source bodies, execute tools or grant write authority.
- Provider adapter interfaces are review-only. `@hia-doc/provider-sdk` validators must reject source-body request payloads, direct edit result objects, provider tool execution, provider workspace writes, target repository mutation and `sourcesContent`.
- Deterministic mock providers are test providers. They must remain offline, reproducible and review-only, and must not be treated as authorization to implement checked apply or real provider network calls.
- Local provider runners are mediation layers. They may convert review payloads to provider-safe requests and return augmentation data, but must not convert provider output into direct apply data or mutate source/target repositories.
- Target/self-doc provider dry-run evidence may declare HIA self-documentation and target-project scenarios, but it must redact local paths, avoid source bodies, avoid `sourcesContent`, avoid API keys/network access and perform no repository mutation.
- Provider integration closeout evidence may mark provider review-only infrastructure complete, but it must keep real provider invocation, secret storage, network mediation and checked apply as explicit downstream inputs.
- Real provider governance baseline evidence must keep secrets behind host-managed storage, default network to disabled, require user consent and audit records for external calls, and preserve provider output as review-only augmentation.
- Provider registry installation policy evidence must require explicit provider selection, permissive license/provenance records, disabled-by-default installation and remote-provider blocking until secret storage and network consent gates pass.
- Secret storage boundary evidence may serialize secret references and host capability metadata, but must not serialize provider credential values in repositories, evidence, logs, requests or results.
- Network mediation consent evidence must keep direct provider network disabled, require host mediation and scoped consent, and produce only redacted audit/provenance metadata before any later safe invocation dry-run.
- Source excerpt privacy gate evidence must keep source excerpts default-denied, bounded by explicit opt-in, and reference-only in evidence; source bodies, full files and `sourcesContent` remain forbidden.
- Safe invocation dry-run evidence may execute deterministic/local providers through the runner, but must keep remote/API providers blocked, produce only review augmentation and deny source bodies, secrets, direct edits, tools and writes.
- Real provider governance closeout evidence may mark W-P36 gates complete, but it must keep checked apply host-owned, remote/API provider smoke separately approved, and target repository mutation at zero.
- Checked apply baseline audit evidence must keep apply authority host-owned, require human approval, file read, version, conflict, rollback, formatter and audit gates, and continue denying provider-owned `WorkspaceEdit` output.
- Host edit transaction evidence may bind semantic operations to host-owned transaction envelopes, but must not carry direct editor objects, source bodies, secrets or write authority.
- Host file read/version/conflict evidence may record relative target paths, read metadata, private-hash status, semantic ranges and conflict results, but must not expose document text, digest values, absolute paths, direct editor objects or write authority.
- Host rollback/formatter/audit evidence may prepare host-owned rollback records, formatter/post-apply validation plans and redacted audit drafts, but must not execute formatters, apply edits, write files, mutate target repositories or expose document content.
- VS Code checked apply confirmation evidence may expose host confirmation choices and blocked apply reports, but must not call `workspace.applyEdit()`, carry direct edit objects, read/write target repositories or imply provider/LSP write authority.
- IDE/LSP capability and resource action data are view and ownership contracts. IDE shells should consume LSP/CLI/renderer surfaces instead of duplicating HIA semantics.
- Renderer and CLI manifests are layered: renderer owns rendered file metadata, CLI owns filesystem output placement.

## Related Docs

- `docs/core-fixture-contract.md`
- `docs/versioning.md`
- `docs/compatibility-matrix.md`
- `docs/configuration.md`
- `docs/profile-authoring-guide.md`
- `docs/profile-distribution.md`
- `docs/schema-distribution.md`
- `docs/migration-guide.md`
- `docs/project-manifest-guide.md`
- `docs/unified-html-demo.md`
- `docs/user-acceptance-checklist.md`
- `docs/ide-usage.md`
- `docs/release-governance.md`
- `docs/security-policy.md`
- `packages/profile/README.md`
- `docs/ide-integration-boundary.md`
- `docs/adapter-authoring-notes.md`
- Package READMEs under `packages/*/README.md` and `apps/*/README.md`
