# @hia-doc/cli

Command line entry for the HIA documentation system.

Current scope:

- `hia --help`
- `hia docs build [--config <file>] [--input <file>] [--jsdoc-integration <file>] [--project-manifest <file>] [--adoption-kit <file>] [--out <dir>] [--locale <locale>] [--manifest <file>]`
- `hia docs evidence [--docs-dir <dir>] [--out <file>]`
- `hia docs acceptance --evidence <file> --target-id <id> --target-family <family> [--out <file>]`
- `hia docs continuity --baseline <file> --current <file> --target-id <id> --target-family enterprise-business [--out <file>]`
- `hia docs adoption-kit --request <file> [--out <file>]`
- `hia docs enterprise-workflow --adoption-request <file> [--baseline <file> --current <file>] [--out <file>]`

The build command reads config through `@hia-doc/config`, then renders one of three input modes:

- a normalized HIA document JSON file
- a JSDoc HIA Integration JSON file produced by `@mandolin/jsdoc-plugin-hia-sys`
- a project docs manifest that aggregates JS, CSS, HTML and doc-source-map artifacts into one project page

Single-document modes validate the converted core document through `@hia-doc/core`. Project mode keeps each source artifact explicit in the output manifest and renders a unified page with all/JS/CSS/HTML views. All modes report diagnostics, render through `@hia-doc/renderer-html`, write HTML/theme assets, and emit an output manifest. The default manifest path is `hia-manifest.json`.

For explicit Portal IA, the CLI projects `docs.renderer.informationArchitecture`, `docs.renderer.uiLocale`, `project.productVersion`, and each input's reviewed `semanticPath` into the renderer. It does not discover semantic containers from source paths. Producer-result artifacts inherit the parent manifest input's semantic path. See `docs/documentation-portal-information-architecture-contract.md`.

The evidence command reads an already generated project documentation directory and writes a public-safe `hia-generated-docs-evidence-summary` JSON file. It summarizes required output files, entry counts, views, producer inputs, coverage counters and privacy checks without reading source bodies. It is intended for repeatable project adoption checks such as validating that DotNetDoc and JSDoc entries both appear in a unified site while `sourcesContent` remains absent.

The acceptance command reads only that generated evidence summary. It produces a versioned `target-documentation-acceptance` report for one public target id and one of four portfolio families: `unicode-compatible`, `html-authoring`, `enterprise-business`, or `workspace-container`. The report checks required outputs, stable entry identities, successful producer summaries, and the no-embedded/no-fetched-source privacy boundary. It does not inspect source code, HTML, project manifests, credentials, or target working-tree state. Without `--out`, it writes the report to stdout; an explicit `--out` must be a safe relative path in the caller's workspace.

The continuity command compares two exact `hia-generated-docs-evidence-summary@0.1.0-draft` inputs and emits `target-documentation-continuity@0.1.0-draft`. The first contract slice supports the `enterprise-business` family. Stable entry and producer identifiers are used only for in-memory set comparison; the report serializes counts, compatibility facts, fixed diagnostics, and explicit deny-all privacy/permission fields. It never discovers a target repository, reads source or artifact bodies, executes a target command, or claims adoption. The two input files and an optional output file must be distinct, safe relative paths under the caller's workspace.

中文说明：`docs continuity` 用两份已经存在的公开安全 evidence summary 判断文档输出是否连续。它检查 required outputs、稳定 entry 覆盖、producer 成功状态与 artifact count、以及 `none`/`link` privacy boundary；报告不会写出 entry/producer identity、路径、正文或工作区状态，也不会把“证据可比较”提升为目标项目已采用。

`docs adoption-kit` 从 caller cwd 下显式指定的 safe-relative JSON request 生成 `target-owner-adoption-kit@0.1.0-draft`。它为 `enterprise-business` 组合既有 continuity/acceptance/owner-evidence refs，为 `workspace-container` 组合既有 handoff/acceptance/Portal IA refs；没有 owner input 时诚实输出 `deferred-owner-input-missing`。`ready-for-owner-review` 只表示 metadata contract、owner attestation 与 privacy boundary 可进入 review，永远不表示目标项目已采用。

The adoption-kit command composes existing owner-mediated contracts into a reusable review artifact. It accepts no source, artifact, evidence, or command-output body and grants no target read/write/command, network, publish, or adoption authority. Its embedded `portalSummary` omits target, trial, and owner identities. Project builds may consume an exact non-refused report through `--adoption-kit`, but only when the project config explicitly enables the existing Portal IA contract.

`docs enterprise-workflow` 把一个显式 enterprise adoption request 与成对可选的 baseline/current public-safe evidence summaries 组合为 `enterprise-baseline-current-owner-workflow@0.1.0-draft`。未收到 owner input 且未提供 pair 时输出可审计 deferred；owner 已提交时必须提供完整 pair，且 adoption kit 与 continuity 都通过才 ready。报告只保留 component status、counts、booleans 与独立 semantics，不嵌入 evidence、path、entry/producer identity 或正文。

The enterprise workflow is an owner-local composition surface, not a target runner. All input/output paths are explicit, distinct, and safe-relative under caller cwd. It never discovers a target, contacts an owner, runs a target command, writes a target repository, accesses a network, publishes a package, or asserts adoption.

Diagnostics use the shared `HiaDiagnostic` shape. The CLI still prints compact `[severity:code]` lines, while the in-process API keeps machine-readable `data` for callers.

`--input`, `--jsdoc-integration` and `--project-manifest` are mutually exclusive. Use `--input` for already-normalized core documents, `--jsdoc-integration` for JSON produced by `@mandolin/jsdoc-plugin-hia-sys`, and `--project-manifest` for a multi-artifact project aggregation manifest. Project manifests can list existing `documentation-producer-result` files when a producer such as DotNetDoc has already emitted artifacts and the CLI only needs to render a unified project page.

In the local workspace, run it through the root script after building:

```bash
pnpm run build
pnpm run hia -- --help
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs-en --locale en
pnpm run hia -- docs build --input fixtures/basic.hia.json --out dist/docs-custom --manifest manifest.json
pnpm run hia -- docs build --jsdoc-integration fixtures/jsdoc-integration.real-basic.json --out dist/jsdoc-docs --locale zh-CN
pnpm run hia -- docs build --project-manifest fixtures/project-mixed.hia-project.json --out dist/project-docs
pnpm run hia -- docs evidence --docs-dir dist/project-docs --out dist/project-docs/documentation-evidence.json
pnpm run hia -- docs acceptance --evidence dist/project-docs/documentation-evidence.json --target-id sample-project --target-family unicode-compatible --out dist/project-docs/target-acceptance.json
pnpm run hia -- docs continuity --baseline dist/project-docs/baseline-evidence.json --current dist/project-docs/current-evidence.json --target-id sample-enterprise-project --target-family enterprise-business --out dist/project-docs/target-continuity.json
pnpm run hia -- docs adoption-kit --request adoption-request.json --out owner-adoption-kit.json
pnpm run hia -- docs enterprise-workflow --adoption-request adoption-request.json --baseline baseline-evidence.json --current current-evidence.json --out enterprise-owner-workflow.json
pnpm run hia -- docs build --config hia.config.example.json --project-manifest fixtures/project-mixed.hia-project.json --adoption-kit owner-adoption-kit.json --out dist/project-docs
pnpm run hia -- docs build --config hia.config.example.json
```

CLI options override values from `hia.config.json`. Paths in config files are resolved relative to the config file directory.

## Contract

The CLI consumes core documents and project config, then writes renderer output to disk. It may add build-output files such as `hia-manifest.json`, but it does not change the renderer manifest contract.

The package exports the pure `createTargetDocumentationContinuityReport()` evaluator, the `isTargetDocumentationContinuityReport()` runtime guard, contract/version constants, a fixed diagnostic catalogue, and the owner-local Draft 2020-12 `TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA`. The schema `$id` is an identity only; it is not a promise that the schema is already distributed at that URL.

The package also exports `createTargetOwnerAdoptionKit()`, `isTargetOwnerAdoptionKitReport()`, the contract/version/family/decision/diagnostic constants, the `TargetOwnerAdoptionPortalSummary` type, and the owner-local Draft 2020-12 `TARGET_OWNER_ADOPTION_KIT_JSON_SCHEMA`. The kit is a composition and review contract with CLI and renderer consumers, not a target execution protocol.

The package exports `createEnterpriseBaselineCurrentOwnerWorkflow()`, `isEnterpriseBaselineCurrentOwnerWorkflowReport()`, its contract/version/diagnostic constants and the owner-local Draft 2020-12 `ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA`. The report projects existing component outcomes and has no independent target authority.

See `docs/target-documentation-continuity-contract.md`, `docs/target-owner-adoption-kit-contract.md`, `docs/enterprise-baseline-current-owner-workflow-contract.md`, and `docs/contract-index.md` for the wire contracts and current CLI/config/renderer layering rule.
