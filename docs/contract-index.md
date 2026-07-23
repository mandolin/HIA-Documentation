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
| Target/self-doc checked apply dry-run evidence | `scripts/prepare-wp37-target-self-doc-checked-apply-dry-run-evidence.mjs` | `0.1.0-draft` |
| Checked apply closeout provider/remote inputs | `scripts/prepare-wp37-closeout-provider-remote-inputs.mjs` | `0.1.0-draft` |
| Host-owned writable apply sandbox evidence | `scripts/prepare-wp38-host-owned-writable-apply-sandbox-evidence.mjs` | `0.1.0-draft` |
| VS Code real GUI confirmation evidence | `scripts/prepare-wp38-vscode-real-gui-confirmation-evidence.mjs` | `0.1.0-draft` |
| Sandbox rollback restore failure-path evidence | `scripts/prepare-wp38-sandbox-rollback-restore-failure-path-evidence.mjs` | `0.1.0-draft` |
| Remote provider smoke gate preparation evidence | `scripts/prepare-wp38-remote-provider-smoke-gate-preparation-evidence.mjs` | `0.1.0-draft` |
| Target branch/PR flow contract evidence | `scripts/prepare-wp38-target-branch-pr-flow-contract-evidence.mjs` | `0.1.0-draft` |
| DevTools / Visual Studio confirmation parity evidence | `scripts/prepare-wp38-devtools-visual-studio-confirmation-parity-evidence.mjs` | `0.1.0-draft` |
| Writable apply sandbox closeout next inputs | `scripts/prepare-wp38-closeout-next-inputs.mjs` | `0.1.0-draft` |
| Host runtime capture intake evidence | `scripts/prepare-wp39-host-runtime-capture-intake-evidence.mjs` | `0.1.0-draft` |
| VS Code runtime capture packet evidence | `scripts/prepare-wp39-vscode-runtime-capture-packet-evidence.mjs` | `0.1.0-draft` |
| DevTools runtime capture packet evidence | `scripts/prepare-wp39-devtools-runtime-capture-packet-evidence.mjs` | `0.1.0-draft` |
| Visual Studio runtime preparation evidence | `scripts/prepare-wp39-visual-studio-runtime-preparation-evidence.mjs` | `0.1.0-draft` |
| Runtime evidence normalization | `scripts/prepare-wp39-runtime-evidence-normalization.mjs` | `0.1.0-draft` |
| Next gate bridge evidence | `scripts/prepare-wp39-next-gate-bridge-evidence.mjs` | `0.1.0-draft` |
| Host runtime closeout W-P40 inputs | `scripts/prepare-wp39-closeout-wp40-inputs.mjs` | `0.1.0-draft` |
| Runtime capture readiness audit evidence | `scripts/prepare-wp44-runtime-capture-readiness-audit.mjs` | `0.1.0-draft` |
| VS Code manual runtime capture packet evidence | `scripts/prepare-wp44-vscode-manual-runtime-capture-packet.mjs` | `0.1.0-draft` |
| DevTools manual runtime capture packet evidence | `scripts/prepare-wp44-devtools-manual-runtime-capture-packet.mjs` | `0.1.0-draft` |
| Visual Studio runtime route decision evidence | `scripts/prepare-wp44-visual-studio-runtime-route-decision.mjs` | `0.1.0-draft` |
| W-P44 runtime evidence normalization | `scripts/prepare-wp44-runtime-evidence-normalization.mjs` | `0.1.0-draft` |
| W-P44 host evidence ingestion redaction check | `scripts/prepare-wp44-host-evidence-ingestion-redaction-check.mjs` | `0.1.0-draft` |
| W-P44 closeout downstream inputs | `scripts/prepare-wp44-closeout-downstream-inputs.mjs` | `0.1.0-draft` |
| W-P45 controlled provider execution intake | `scripts/prepare-wp45-controlled-provider-execution-intake.mjs` | `0.1.0-draft` |
| W-P45 provider execution boundary contract | `scripts/prepare-wp45-provider-execution-boundary-contract.mjs` | `0.1.0-draft` |
| W-P45 concrete provider identity package pin | `scripts/prepare-wp45-concrete-provider-identity-package-pin.mjs` | `0.1.0-draft` |
| W-P45 host secret reference destination binding | `scripts/prepare-wp45-host-secret-reference-destination-binding.mjs` | `0.1.0-draft` |
| W-P45 request preview final consent packet | `scripts/prepare-wp45-request-preview-final-consent-packet.mjs` | `0.1.0-draft` |
| Controlled remote provider smoke intake evidence | `scripts/prepare-wp40-controlled-remote-provider-smoke-intake.mjs` | `0.1.0-draft` |
| Remote provider candidate selection evidence | `scripts/prepare-wp40-remote-provider-candidate-selection-packet.mjs` | `0.1.0-draft` |
| Secret reference and network consent evidence | `scripts/prepare-wp40-secret-reference-network-consent-packet.mjs` | `0.1.0-draft` |
| Request preview and privacy dry-run evidence | `scripts/prepare-wp40-request-preview-privacy-dry-run.mjs` | `0.1.0-draft` |
| Real remote provider smoke execution gate evidence | `scripts/prepare-wp40-real-remote-provider-smoke-execution-gate.mjs` | `0.1.0-draft` |
| Provider result/refusal review linkage evidence | `scripts/prepare-wp40-provider-result-review-linkage.mjs` | `0.1.0-draft` |
| W-P40 closeout W-P41/W-P42 inputs evidence | `scripts/prepare-wp40-closeout-wp41-wp42-inputs.mjs` | `0.1.0-draft` |
| Target-owner flow intake evidence | `scripts/prepare-wp41-target-owner-flow-intake.mjs` | `0.1.0-draft` |
| Target-owner local sandbox packet evidence | `scripts/prepare-wp41-target-owner-local-sandbox-packet.mjs` | `0.1.0-draft` |
| Target-owner branch/PR packet evidence | `scripts/prepare-wp41-target-owner-branch-pr-packet.mjs` | `0.1.0-draft` |
| Target-owner command evidence template | `scripts/prepare-wp41-target-owner-command-evidence-template.mjs` | `0.1.0-draft` |
| Provider review payload handoff evidence | `scripts/prepare-wp41-provider-review-payload-handoff.mjs` | `0.1.0-draft` |
| Target-owner dry-run evidence | `scripts/prepare-wp41-target-owner-dry-run-evidence.mjs` | `0.1.0-draft` |
| W-P41 closeout W-P42/W-P43 inputs evidence | `scripts/prepare-wp41-closeout-wp42-wp43-inputs.mjs` | `0.1.0-draft` |
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
| Target/self-doc checked apply dry-run evidence | `main-repo` scripts | W-P37 evidence proving known HIA self-doc and target-project scenarios can consume checked apply confirmation reports without reading source bodies, applying edits or mutating target repositories. |
| Checked apply closeout provider/remote inputs | `main-repo` scripts | W-P37 closeout evidence summarizing host-owned checked apply readiness while forwarding writable sandbox, real GUI confirmation, remote provider smoke and target branch/PR inputs without granting write authority. |
| Host-owned writable apply sandbox evidence | `main-repo` scripts | W-P38 evidence proving host-owned apply can write inside a synthetic `dist/` sandbox after final confirmation, repeat conflict check, private rollback snapshot, formatter execution, post-apply validation and redacted audit, while target repositories remain untouched. |
| VS Code real GUI confirmation evidence | `main-repo` scripts and VS Code shell | W-P38 evidence preparing a real Extension Development Host confirmation command and manual capture checklist for W-P38 sandbox transactions while keeping real GUI capture explicitly manual-required. |
| Sandbox rollback restore failure-path evidence | `main-repo` scripts | W-P38 evidence proving conflict, formatter and post-apply validation failures are handled inside the synthetic sandbox; post-validation writes are restored from private rollback snapshots while target repositories remain untouched. |
| Remote provider smoke gate preparation evidence | `main-repo` scripts | W-P38 evidence preparing remote/API provider smoke gates for credential references, host-mediated network consent, source privacy, redacted audit, review-only output and checked-apply separation without calling a real provider. |
| Target branch/PR flow contract evidence | `main-repo` scripts | W-P38 evidence defining target-owned branch, pull request and sandbox collaboration flows while keeping HIA automation from pushing branches, opening PRs or mutating target repositories. |
| DevTools / Visual Studio confirmation parity evidence | `main-repo` scripts and host shells | W-P38 evidence proving DevTools and Visual Studio can expose checked apply confirmation and target collaboration summaries as read-only host inputs without enabling writes. |
| Writable apply sandbox closeout next inputs | `main-repo` scripts | W-P38 closeout evidence summarizing sandbox success/failure, host confirmation preparation, provider smoke gates, target collaboration flow, host parity and deferred manual gates for the next cycle. |
| Host runtime capture intake evidence | `main-repo` scripts | W-P39 intake evidence mapping the first formal cycle group to VS Code, Chrome DevTools and Visual Studio runtime capture packets while keeping all manual captures, provider calls and target writes unclaimed. |
| VS Code runtime capture packet evidence | `main-repo` scripts and VS Code shell | W-P39 evidence preparing an Extension Development Host manual capture packet, checklist and report template without launching VS Code or claiming GUI capture completion. |
| DevTools runtime capture packet evidence | `main-repo` scripts and DevTools shell | W-P39 evidence preparing a Chrome DevTools unpacked extension manual capture packet, checklist and report template without launching Chrome or claiming browser runtime capture completion. |
| Visual Studio runtime preparation evidence | `main-repo` scripts and Visual Studio shell | W-P39 evidence selecting the safe Visual Studio contract-level runtime preparation route while deferring VSIX packaging, experimental-instance execution and real Visual Studio capture to a later audited implementation step. |
| Runtime evidence normalization | `main-repo` scripts | W-P39 evidence normalizing VS Code, Chrome DevTools and Visual Studio runtime packet/preparation states into one host matrix for W-P40/W-P41/W-P42 consumption without claiming missing runtime captures. |
| Next gate bridge evidence | `main-repo` scripts | W-P39 evidence bridging normalized host runtime states into W-P40 remote provider smoke, W-P41 target-owner flow, W-P42 checked apply hardening and W-P43 host UX inputs without running providers, mutating targets or enabling write authority. |
| Host runtime closeout W-P40 inputs | `main-repo` scripts | W-P39 closeout evidence summarizing W-P39.1-W-P39.6 and turning W-P40 controlled remote provider smoke into a single startup input contract while preserving manual approval, privacy and no-write gates. |
| Controlled remote provider smoke intake evidence | `main-repo` scripts | W-P40 intake evidence building a provider selection/manual approval safety envelope from W-P36/W-P38/W-P39 inputs before any real provider choice, credential resolution, network call or target write. |
| Remote provider candidate selection evidence | `main-repo` scripts | W-P40 evidence recording candidate provider identity, package/provenance, license, capability boundaries and manual-selection state before any execution grant. |
| Secret reference and network consent evidence | `main-repo` scripts | W-P40 evidence binding provider candidates to host-managed secret reference metadata, consent records, destination allowlists and redacted audit previews only. It does not serialize credential values or perform external calls. |
| Request preview and privacy dry-run evidence | `main-repo` scripts | W-P40 evidence preparing metadata-only provider request summaries and privacy checks while keeping source policy `none`, network unexecuted and output review-only. |
| Real remote provider smoke execution gate evidence | `main-repo` scripts | W-P40 evidence interpreting manual gate-entry approval and either allowing a later final network-send decision or producing a blocked/refused review shape. It must not treat gate-entry approval as credential, network or execution grant. |
| Provider result/refusal review linkage evidence | `main-repo` scripts | W-P40 evidence linking provider success/refusal/rate-limit/error shapes into review-only host payloads. It may consume a blocked/refused gate result, but must not execute providers, call networks, trigger checked apply or create direct edits. |
| W-P40 closeout W-P41/W-P42 inputs evidence | `main-repo` scripts | W-P40 closeout evidence summarizing completed controlled remote smoke gates and preparing W-P41 target-owner plus W-P42 checked-apply inputs. It must not reclassify blocked provider/network execution as success or create target-side side effects. |
| Target-owner flow intake evidence | `main-repo` scripts | W-P41 intake evidence combining the W-P38 target-owner collaboration contract and W-P40 review-only provider result input into a target-owner action policy. It may prepare candidate packet plans and policy docs only, and must not create target branches, pull requests, local sandboxes, pushes or target writes. |
| Target-owner local sandbox packet evidence | `main-repo` scripts | W-P41 evidence preparing copy-only local sandbox instructions, target-owner command templates and evidence report templates. It must not run target commands, create target sandboxes, write target repositories or claim target-owner execution. |
| Target-owner branch/PR packet evidence | `main-repo` scripts | W-P41 evidence preparing target-owned branch naming, commit, pull-request, check and evidence templates. It must not create branches, push commits, open pull requests, run target checks, write target repositories or claim target-owner execution. |
| Target-owner command evidence template | `main-repo` scripts | W-P41 evidence consolidating local sandbox and branch/PR command templates into a target-owner transcript and evidence packet shape. It must not claim command execution, branch creation, pull-request creation, target writes or provider success. |
| Provider review payload handoff evidence | `main-repo` scripts | W-P41 evidence binding W-P40 blocked/refused provider review payloads to the target-owner evidence packet as review-only context. It must not execute providers or networks, trigger checked apply, create edits, run target commands or mutate target repositories. |
| Target-owner dry-run evidence | `main-repo` scripts | W-P41 evidence preparing a structural target-owner dry-run/readiness matrix from command templates and provider review handoff. It must not run target commands, create sandboxes, branches or pull requests, claim target-owner execution, trigger checked apply or mutate target repositories. |
| W-P41 closeout W-P42/W-P43 inputs evidence | `main-repo` scripts | W-P41 closeout evidence summarizing target-owner packets, provider review handoff and dry-run readiness into downstream checked-apply and host UX inputs. It must not convert prepared materials into target execution, provider execution, checked apply or target repository writes. |
| Checked apply hardening intake evidence | `main-repo` scripts | W-P42 intake evidence consuming W-P37/W-P38/W-P40/W-P41 closeouts into a checked-apply hardening scope, denial-case matrix and next-stage input plan. It must not enable checked apply writes, workspace writes, target mutations, provider-owned edits or target-owner execution claims. |
| Checked apply transaction hardening contract evidence | `main-repo` scripts | W-P42 evidence defining a hardened checked-apply transaction envelope, state model, invariant set and denial binding matrix. It must not grant write authority, call host editor APIs, produce direct edit objects, mutate targets or mark provider/target-owner context as executable. |
| Preflight denial checker fixtures evidence | `main-repo` scripts | W-P42 evidence converting hardened transaction denial bindings into deterministic checker fixtures and results. It must deny incomplete, stale, conflicted, unsafe provider, incomplete target-owner and privacy-exposing transactions before write, while never executing editor APIs, granting write authority, mutating targets or exposing private material. |
| Rollback formatter audit hardening evidence | `main-repo` scripts | W-P42 evidence refining rollback, formatter, post-apply validation and redacted audit controls into deterministic deny-before-write fixtures. It must not execute formatters, restore files, call editor APIs, grant write authority, mutate targets or expose rollback/source/private material. |
| Provider review and target-owner boundary evidence | `main-repo` scripts | W-P42 evidence binding provider review payloads and target-owner evidence as context/reference-only inputs. It must reject direct edit output, apply triggers, provider execution claims and target-owner execution claims before write, without running providers, networks, target commands or repository mutation. |
| Multi-host checked apply contract projection evidence | `main-repo` scripts | W-P42 evidence projecting hardened checked-apply contract sections to VS Code, DevTools and Visual Studio as read-only host inputs. It must not claim runtime capture completion, call host editor APIs, trigger checked apply, run providers or target commands, write workspaces or mutate target repositories. |
| W-P42 closeout W-P43 inputs evidence | `main-repo` scripts | W-P42 closeout evidence summarizing checked-apply hardening into W-P43 host-owned apply UX inputs. It must not enable checked apply writes, claim runtime capture, run providers or target commands, mutate repositories or reclassify deferred gates as complete. |
| Host-owned apply UX intake evidence | `main-repo` scripts | W-P43 evidence converting checked-apply hardening closeout into host-visible UX requirements and surface contracts. It must keep provider output review-only, target-owner actions explicit, checked apply writes disabled, and all evidence public-safe. |
| VS Code host apply UX surface evidence | `main-repo` scripts and VS Code shell | W-P43 evidence proving VS Code exposes a read-only host apply UX intake command and report helper. It must not call editor APIs, trigger checked apply, execute providers, run target commands, mutate targets or expose private material. |
| DevTools / Visual Studio host apply UX projection evidence | `main-repo` scripts and host shells | W-P43 evidence proving DevTools and Visual Studio expose the same host-owned apply UX requirements as read-only surfaces. It must not claim real host runtime capture, enable checked apply writes, call provider/network, run target commands, mutate repositories or expose private material. |
| Provider review linkage panel evidence | `main-repo` scripts and host shells | W-P43 evidence proving VS Code, DevTools and Visual Studio can display provider result/refusal/review metadata as review-only panels. It must not run providers, treat provider output as direct edits, trigger checked apply, mutate targets or expose private material. |
| Target-owner evidence view evidence | `main-repo` scripts and host shells | W-P43 evidence proving VS Code, DevTools and Visual Studio can display target-owner readiness, evidence completeness, transcript slots and deferred gates as read-only views. It must not claim target-owner execution, run target commands, create branches/PRs/sandboxes, trigger checked apply or expose private material. |
| Host confirmation manual packet evidence | `main-repo` scripts and host shells | W-P43 evidence refreshing VS Code, DevTools and Visual Studio manual capture/confirmation packets from read-only host UX views. It must not launch hosts, claim runtime capture completion, run providers or target commands, enable checked apply writes, mutate targets or expose private material. |
| W-P43 closeout C-HIA-P1 inputs evidence | `main-repo` scripts | W-P43 closeout evidence summarizing host-owned apply UX, provider review linkage, target-owner evidence view and manual confirmation packets into C-HIA-P1 closeout inputs. It must not claim runtime capture completion, execute providers or target commands, enable checked apply writes, mutate targets or expose private material. |
| Runtime capture readiness audit evidence | `main-repo` scripts and host shells | W-P44 evidence freezing VS Code, DevTools and Visual Studio manual runtime-capture packets before real host execution. It must not launch hosts, claim runtime capture completion, execute providers or target commands, enable checked apply writes, mutate targets or expose private material. |
| VS Code manual runtime capture packet evidence | `main-repo` scripts and VS Code shell | W-P44 evidence preparing Extension Development Host launch instructions, required screenshots, transcript intake and redaction report for human VS Code runtime capture. It must not launch VS Code, capture screenshots, claim capture completion, execute providers or target commands, enable checked apply writes, mutate targets or expose private material. |
| DevTools manual runtime capture packet evidence | `main-repo` scripts and DevTools shell | W-P44 evidence preparing Chrome DevTools unpacked-extension instructions, a default public-safe payload, required screenshots, event transcript intake and redaction report for human DevTools runtime capture. It must not launch Chrome, request permissions, return inspected-page data, claim capture completion, execute providers or target commands, enable checked apply writes, mutate targets or expose private material. |
| Visual Studio runtime route decision evidence | `main-repo` scripts and Visual Studio shell | W-P44 evidence executing the Visual Studio route decision at contract level, freezing the future VSIX/manual capture path while explicitly deferring VSIX build, Visual Studio launch, experimental-instance execution, host editor APIs, provider/network calls, target commands and write authority. |
| W-P44 runtime evidence normalization | `main-repo` scripts and host shells | W-P44 evidence normalizing VS Code, DevTools and Visual Studio runtime slots. It may record user-confirmed runtime observations, but it must not convert unarchived screenshots into `captured-archived`, grant write authority, execute providers or expose private material. |
| W-P44 host evidence ingestion redaction check | `main-repo` scripts and host shells | W-P44 evidence ingesting normalized runtime slots into a public-safe host evidence ledger. It may accept observation-only user confirmations, but it must not claim release-grade captured archives, run providers, grant write authority or expose source/private material. |
| W-P44 closeout downstream inputs | `main-repo` scripts | W-P44 closeout evidence summarizing readiness, manual observations, Visual Studio route decision, normalized slots and redaction ledger into explicit W-P45/W-P46/W-P47/G-VS/C-HIA-P3 inputs without granting provider, target-owner or checked apply authority. |
| W-P45 controlled provider execution intake | `main-repo` scripts | W-P45.1 evidence reconciling W-P44 host visibility, W-P40 blocked provider smoke and W-P36 provider governance into a concrete execution readiness matrix. It records provider SDK network-contract gaps and execution blockers without running providers, resolving secrets, contacting destinations, exposing source bodies or granting write authority. |
| W-P45 provider execution boundary contract | `main-repo` scripts | W-P45.2 evidence defining the `host-mediated-remote-provider-execution-envelope` contract. It keeps P1 provider adapters review-only/network-disabled while assigning secret references, destination allowlists, consent, redacted audit and final network-send authority to the host boundary. |
| W-P45 concrete provider identity package pin | `main-repo` scripts | W-P45.3 evidence selecting the concrete OpenAI Responses API provider identity and immutable `openai@6.48.0` npm package pin. It records registry integrity, signatures, attestation reference, license and repository while keeping secret binding, destination binding, final consent, provider API execution and write authority blocked. |
| W-P45 host secret reference destination binding | `main-repo` scripts | W-P45.4 evidence binding the concrete provider to host-managed secret reference metadata and the real HTTPS destination allowlist `https://api.openai.com/v1/responses`. It remains reference-only: no secret value is read or logged, no provider API call is made, no request/response/source body is included, and final execution remains blocked. |
| W-P45 request preview final consent packet | `main-repo` scripts | W-P45.5 evidence producing a metadata-only request preview and final consent packet for the selected OpenAI Responses API provider. It prepares human-review checkpoints while keeping final network-send approval, credential access, request/response bodies, source bodies, checked apply and repository mutation disabled. 中文：该 surface 只生成可审查预览与 consent packet，不代表已批准真实联网执行。 |
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
- Target/self-doc checked apply dry-run evidence may map confirmation reports to self-doc and target-project scenarios, but it must keep target repositories read-only, hide local paths, avoid source bodies and keep final apply authority blocked.
- Checked apply closeout evidence may summarize readiness and forward inputs, but must keep writable apply, real GUI confirmation, remote provider smoke and target branch/PR mutation as downstream gated work.
- Host-owned writable apply sandbox evidence may write synthetic files under its `dist/` sandbox only. It must not write target repositories, expose source bodies or digest values, call real `workspace.applyEdit()`, or allow provider/LSP-owned apply.
- Remote provider smoke gate preparation evidence may prepare manual remote/API smoke gates only. It must not serialize credential material, perform network calls, expose source bodies, mutate target repositories, produce direct editor operations or weaken host-owned checked apply separation.
- Target branch/PR flow contract evidence may define collaboration states only. HIA automation must not create target branches, open pull requests, push commits, mutate target repositories or treat provider output as directly applicable edits.
- DevTools / Visual Studio confirmation parity evidence may project checked apply confirmation and target collaboration summaries into host surfaces only. It must not run real host runtime capture, apply edits, write workspaces, mutate target repositories or serialize source bodies.
- Writable apply sandbox closeout evidence may summarize completed W-P38 inputs and deferred gates only. It must not convert deferred manual gates into completed runtime, provider or target repository actions.
- Host runtime capture intake evidence may plan VS Code, Chrome DevTools and Visual Studio runtime captures and map them to a `C-*` cycle group. It must not claim manual captures, call remote providers, create target branches or pull requests, write workspaces, mutate target repositories or expose source bodies.
- VS Code runtime capture packet evidence may prepare launch commands, checklists and report templates for a human Extension Development Host capture. It must not launch VS Code, drive the GUI, mark a manual capture complete, call `workspace.applyEdit()`, write target repositories or expose source bodies.
- DevTools runtime capture packet evidence may prepare unpacked extension load instructions, panel capture markers and report templates for a human Chrome DevTools capture. It must not launch Chrome, request host permissions, trust returned page data, mark a manual capture complete, write target repositories or expose source bodies.
- Visual Studio runtime preparation evidence may select a route and prepare follow-up checklists only. It must not claim a VSIX build, experimental-instance execution, real Visual Studio runtime capture, workspace writes, target repository mutation or source-body exposure.
- Runtime evidence normalization may map host-specific packet states to a shared matrix only. It must not transform `manual-capture-ready` or `route-preparation-ready` into `captured`, enable write authority, run hosts, call providers, mutate target repositories or expose source bodies.
- Next gate bridge evidence may prepare downstream W-P40/W-P41/W-P42/W-P43 inputs only. It must not run remote providers, launch IDE/browser hosts, create branches or pull requests, apply edits, grant provider/LSP-owned write authority, mutate target repositories or expose source bodies.
- Host runtime closeout W-P40 input evidence may close W-P39 and prepare W-P40 startup inputs only. It must not convert prepared host states into captured states, run remote providers, perform network calls, create target branches or PRs, grant write authority, mutate targets or expose source bodies.
- Controlled remote provider smoke intake evidence may prepare provider candidates, manual approval routes and safety envelopes only. It must not select a real provider for execution, resolve credential values, execute external network calls, include source bodies, mutate targets, grant write authority or apply edits.
- Remote provider candidate selection evidence may record candidate identity, package, provenance, license, capability and manual-selection state only. It must not select a provider for execution, resolve credential values, perform external calls, include source bodies, create direct edits, grant write authority or mutate targets.
- Secret reference and network consent evidence may bind provider candidates to host-managed secret reference metadata, consent records, destination allowlists and redacted audit previews only. It must not serialize credential values, perform external calls, select providers for execution, include source bodies, grant write authority or mutate targets.
- Request preview and privacy dry-run evidence may prepare metadata-only provider request summaries and privacy checks only. It must not include credential values, source text, source references, external network calls, provider execution, direct edits, write authority or target mutations.
- Real remote provider smoke execution gate evidence may record user approval to enter the gate, but it must refuse execution when concrete provider identity, immutable package version, host-bound secret references, non-placeholder destination and final consent are missing. It may generate a review-only blocked/refusal result shape; it must not fake provider results, perform external calls, read credential values, include source text, create direct edits, grant write authority or mutate targets.
- Provider result/refusal review linkage evidence may normalize actual blocked/refused results and future success/refusal/rate-limit/error shapes for host review surfaces only. It must keep provider output review-only, require human review, avoid source text and credential values, and deny checked apply triggers, direct edits, workspace writes, target mutations and external calls.
- W-P40 closeout evidence may summarize W-P40 outcomes and prepare W-P41/W-P42/W-P43 inputs only. It must preserve blocked-before-network as blocked, keep target-owner action explicit, deny direct apply and write authority, and avoid source text, credential values, target mutations, external calls and fake provider success.
- Target-owner flow intake evidence may define target-owner action policy, candidate packet sequence and provider review handoff only. HIA automation must not create target branches, open pull requests, create local target sandboxes, push commits, run target commands, mutate targets, expose source text, serialize credentials or convert provider output into direct edits.
- Target-owner local sandbox packet evidence may publish copy-only command templates and target-owner evidence templates only. HIA automation must not execute those commands, create or copy a target sandbox, mutate target repositories, claim target-owner execution, expose document text, serialize credentials or produce direct edit objects.
- Target-owner branch/PR packet evidence may publish branch naming, commit, pull-request, check and report templates only. HIA automation must not create target branches, push commits, open pull requests, run target checks, mutate repositories, claim target-owner execution, expose source text, serialize credentials or produce direct edit objects.
- Target-owner command evidence template may consolidate transcript fields, result shapes, privacy checks and target-owner evidence sections only. HIA automation must not record target-owner execution as complete, create branches or PRs, push commits, run commands, mutate repositories, expose source text, serialize credentials or produce direct edit objects.
- Provider review payload handoff evidence may bind review item references, blocked/refused provider result shape, host display projections and target-owner decision shapes only. It must not claim provider success, execute providers or networks, trigger checked apply, generate direct edits, run target commands, mutate target repositories, expose source text, serialize credentials or include local absolute paths.
- Target-owner dry-run evidence may prepare readiness matrices, evidence review checklists and result templates only. It must not execute target dry-runs, run commands, create sandboxes, branches or pull requests, claim target-owner execution, execute providers or networks, trigger checked apply, generate direct edits, mutate target repositories, expose source text, serialize credentials or include local absolute paths.
- W-P41 closeout evidence may summarize ready inputs and downstream W-P42/W-P43 handoff only. It must not reclassify target-owner prepared packets as target execution, claim provider success, call networks, trigger checked apply, generate direct edits, run target commands, mutate target repositories, expose source text, serialize credentials or include local absolute paths.
- Checked apply hardening intake evidence may define hardening dimensions, denial cases and next-stage inputs only. It must not enable checked apply writes, execute workspace writes, mutate target repositories, convert provider output into direct edit objects, mark target-owner execution complete, expose source text, serialize credentials or include local absolute paths.
- Checked apply transaction hardening contract evidence may define fields, gates, states, invariants and denial bindings only. It must not grant checked apply write authority, call `workspace.applyEdit()`, include `WorkspaceEdit`/`documentChanges`, execute providers or networks, mutate target repositories, expose source text, serialize credentials or include local absolute paths.
- Preflight denial checker fixtures evidence may run deterministic checks over abstract fixture signals only. It must not serialize real edit payloads, call host editor APIs, enable workspace or target writes, claim target-owner execution, execute providers or networks, expose source bodies, serialize credentials, include digest values or reveal local absolute paths.
- Rollback formatter audit hardening evidence may refine rollback, formatter, post-validation and audit gates only. It must not execute formatters, restore files, run validation, call host editor APIs, trigger checked apply, write workspaces, mutate targets, serialize rollback content, expose digest values or reveal local absolute paths.
- Provider review and target-owner boundary evidence may bind context/reference-only payloads only. It must not treat provider success-like shapes, provider refusal, target-owner packets or dry-run templates as executable edits, network execution, target commands, branch/PR/sandbox creation, checked apply triggers, write authority or target mutation.
- Multi-host checked apply contract projection evidence may prepare VS Code, DevTools and Visual Studio read-only packets only. It must not launch real host runtimes, claim GUI capture completion, call host editor APIs, trigger checked apply, execute providers or networks, run target commands, write workspaces, mutate target repositories or expose private material.
- W-P42 closeout evidence may summarize completed hardening capabilities and W-P43 inputs only. It must keep checked apply write, real host runtime capture, provider/network execution, target-owner execution and target repository mutation as explicit deferred gates.
- Host-owned apply UX intake evidence may define visible UX requirements, display rules and host surface contracts only. It must not enable checked apply write, call host editor APIs, execute providers or networks, run target commands, mutate targets, expose source bodies or serialize credentials.
- VS Code host apply UX surface evidence may register a read-only command, QuickPick and output report only. It must not call `workspace.applyEdit()`, open a writable transaction, run provider/network calls, execute target commands, mutate repositories or expose source bodies.
- DevTools / Visual Studio host apply UX projection evidence may map host-owned apply UX requirements to read-only panels/tool-window contracts only. It must not launch real hosts, claim runtime capture completion, enable checked apply writes, run providers or networks, execute target commands, mutate targets or expose source bodies.
- Provider review linkage panel evidence may expose provider result/refusal/review metadata, taxonomy, risk/quality and target-owner handoff only. It must keep provider output review-only, require human review, deny direct edits and checked apply triggers, and avoid provider/network execution, target commands, target mutation, source bodies and credentials.
- Target-owner evidence view evidence may expose readiness matrix counts, evidence completeness checks, transcript slots, handoff bindings, branch/PR/sandbox state and deferred gates only. It must not reclassify prepared target-owner packets as executed work, run target commands, create branches/PRs/sandboxes, trigger checked apply, mutate targets, execute providers/networks or expose source bodies and credentials.
- Host confirmation manual packet evidence may refresh screenshot, transcript, checklist and report-template requirements only. It must not launch VS Code, Chrome or Visual Studio, claim real runtime capture, execute providers or target commands, enable checked apply write, mutate target repositories or serialize source bodies, credentials, digest values or absolute paths.
- W-P43 closeout C-HIA-P1 inputs evidence may summarize W-P39-W-P43 evidence and deferred gates only. It must not reclassify prepared manual packets as runtime capture, execute providers or target commands, create target branches/PRs/sandboxes, enable checked apply writes, mutate target repositories or expose source bodies, credentials, digest values or absolute paths.
- Runtime capture readiness audit evidence may freeze manual capture packet metadata and redaction controls only. It must not launch VS Code, Chrome or Visual Studio, take screenshots, claim runtime capture completion, execute providers or target commands, enable checked apply writes, mutate target repositories or serialize source bodies, credentials, digest values or absolute paths.
- VS Code manual runtime capture packet evidence may prepare Extension Development Host launch instructions, screenshot requirements, transcript intake and redaction controls only. It must not claim that a human capture has happened, launch hosts, execute providers or networks, run target commands, enable checked apply writes, mutate target repositories, include direct edit payloads or expose source bodies, credentials, digest values, absolute paths or `sourcesContent`.
- DevTools manual runtime capture packet evidence may prepare a zero-permission unpacked extension, default public-safe payload, local inspected-page event bridge and manual intake only. It must not launch Chrome, request permissions, trust inspected-page data, claim capture completion, execute providers or target commands, enable checked apply writes, mutate targets or expose source bodies, credentials, digest values, absolute paths or `sourcesContent`.
- Visual Studio runtime route decision evidence may execute a contract-level route decision and future capture path only. It must not claim a VSIX build, Visual Studio launch, experimental-instance execution, host editor API call, provider/network execution, target command execution, checked apply write, target mutation or private source exposure.
- W-P44 runtime evidence normalization may record manual-verification-confirmed slots for user-confirmed VS Code and DevTools observations, and route-decision-executed for Visual Studio. It must not mark any slot `captured-archived` without public-safe screenshot/transcript/report archive, grant write authority, execute providers or expose private material.
- W-P44 host evidence ingestion redaction check may convert normalized slots into an observation-only ledger and public-safe redaction report. It must not claim release-grade capture archives without screenshot/transcript/report evidence, execute providers or targets, enable checked apply writes, mutate repositories, expose source bodies, credentials, digest values, absolute paths or `sourcesContent`.
- W-P44 closeout downstream inputs may summarize W-P44 completed evidence and prepare W-P45/W-P46/W-P47/G-VS/C-HIA-P3 inputs only. It must not reclassify observation-only evidence as captured archives, execute providers or target commands, enable checked apply writes, mutate repositories or expose private material.
- W-P45 controlled provider execution intake may define an execution readiness matrix, record concrete-provider/secret/destination/consent blockers and identify provider SDK network-contract gaps only. It must not execute provider/network calls, bind credential values, contact destinations, include source text, trigger checked apply, create direct edits, mutate targets or treat host observation evidence as execution authorization.
- W-P45 provider execution boundary contract may define host-mediated remote execution envelopes, state models and host notes only. It must not select concrete providers, resolve secret values, contact destinations, execute external network calls, include source or response bodies, grant provider adapter network/write authority, trigger checked apply, create direct edits or mutate target repositories.
- W-P45 concrete provider identity package pin evidence may select a concrete provider identity and immutable package version for binding only. It must not grant execution, credential, network or write authority, contact provider destinations, serialize source bodies, treat package selection as runtime approval or create direct edits.
- W-P45 host secret reference destination binding evidence may bind host-managed secret reference metadata and HTTPS destination allowlist only. It must not read, print or serialize secret values, include authorization headers, contact provider destinations, include request/response/source bodies, grant final consent or mutate repositories.
- W-P45 request preview final consent packet evidence may generate metadata-only request preview and human consent checkpoints only. It must not include request body, response body, source text, credential values, final network-send approval, provider API execution, checked apply trigger, workspace write, direct edit object or target repository mutation.
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
