# Documentation Producer API

`@hia-doc/plugin-sdk` defines interfaces and validation/execution helpers for explicitly loaded documentation producers. Producers own extraction, files and domain behavior; the software development kit validates their declared boundaries and execution results.

## Contract versions

The current source implements **1.0.0 contract candidates** for `documentation-producer` and `documentation-producer-result`. The schema catalog labels them `stable-candidate`; this describes candidate contract definitions, not a published package or a completed system release. Package and contract versions are independent. Verify the exact package or source revision you consume; existing published package contents are not changed by this source update.

| Surface | Current writer / schema | Accepted reader versions |
| --- | --- | --- |
| Producer descriptor | `1.0.0` | Exactly `1.0.0` and `0.1.0-draft` |
| Producer result | `1.0.0` | Exactly `1.0.0` and `0.1.0-draft` |

Versions such as `1.0.1`, `1.1.0`, `1.0.0-rc.1` and `1.0.0+build` are not implicitly accepted. Contract compatibility is explicit; package version ranges do not negotiate wire versions.

The current schemas are:

- `https://mandolin.github.io/HIA-Documentation/schemas/documentation-producer-1.0.0.schema.json`
- `https://mandolin.github.io/HIA-Documentation/schemas/documentation-producer-result-1.0.0.schema.json`

The corresponding `0.1.0-draft` schema URLs retain their original definitions and bytes. Select the schema matching the input's exact version. Structural schema checks do not replace runtime path, identity, JSON and status checks. See [schema distribution](schema-distribution.md).

## Public entry points

The package exposes one root module, with JavaScript and TypeScript declarations. It has no command-line executable or public subpath exports.

| Function | Behavior | Failure / defaults |
| --- | --- | --- |
| `defineDocumentationProducer(producer)` | Validates a descriptor and callable `produce`; returns the same object and retains generic extension types. | Throws `TypeError` for an invalid definition. Does not execute, clone or freeze it. |
| `runDocumentationProducer(producer, request, context?)` | Revalidates the definition, validates the request, invokes `produce` at most once and validates its result. | Context defaults to `{}`. Invalid definitions reject with `TypeError`; request, execution, abort and result failures return structured `failed` results. |
| `validateDocumentationProducerDescriptor(value, options?)` | Checks closed fields, exact versions, names, kinds and capabilities. | Options default to `{}`; returns a new diagnostics array without execution or input mutation. |
| `validateDocumentationProducerRequest(value, options?)` | Checks runtime roots, relative locators, declared input kinds and JSON-compatible options. | An optional descriptor must already be validated. Does not expand globs or check file existence. |
| `validateDocumentationProducerResult(value, options?)` | Checks representable JSON values, closed fields, versions, producer identity, artifact paths/kinds and status combinations. | An optional descriptor must already be validated. Does not load artifacts or automatically redact domain diagnostic content. |
| `hasDocumentationProducerErrors(diagnostics)` | Tests for at least one `severity: "error"`. | Warnings, information and empty arrays return `false`. |

Validation options contain an optional trusted `descriptor` and diagnostic `targetPath` prefix. The prefix is caller context, not an input path sanitizer. Validators consume ordinary JSON-like objects; they are not a sandbox for executable getters, proxies or serialization hooks.

## Types and data semantics

| Public type | Meaning |
| --- | --- |
| `DocumentationProducer` | Explicitly loaded descriptor and asynchronous `produce(request, context)` implementation. |
| `DocumentationProducerDescriptor` | Contract identity/version, producer `id`/`version`, display name, declared input/output kinds and capabilities. The producer's own version is an opaque nonempty identity string matched exactly, not its wire version. |
| `DocumentationProducerCapabilities` | `sourceLinkage`, `incremental`, `watch`. The current runtime rejects `incremental: true` and `watch: true`; no scheduler or watch lifecycle is implied. |
| `DocumentationProducerInput` | Kind, optional language and at least one locator: `path`, `paths`, `projectPath`, `glob` or `globs`. Additional JSON-compatible fields support domain adapters. |
| `DocumentationProducerRequest` | In-memory `workspaceRoot`, `outputDirectory`, nonempty inputs, optional JSON options and profile identities. Absolute roots belong only in this runtime request. |
| `DocumentationProducerContext` | Optional original progress callback and `AbortSignal`, passed through to the implementation. |
| `DocumentationProducerProgress` | Producer-defined phase/message/current/total. Units and fractions are producer-defined; the kit does not validate counters or derive percentages. |
| `DocumentationProducerArtifact` | Strict identity, open domain kind and output-relative path, with optional contract/version pair, format, language, media type and profiles. Declaration does not prove that a file exists. |
| `DocumentationProducerDiagnostic` | Base HIA diagnostic plus the existing optional `metadata` and `source` fields. `source.path` is a safe relative path; remaining domain metadata must be JSON-compatible and appropriately redacted by its producer. |
| `DocumentationProducerResult` | Exact contract/version, producer identity, status, artifact declarations and native diagnostics. |
| `DocumentationProducerStatus` | `success`, `partial` or `failed`, with the combinations below. |
| `DocumentationProducerValidationOptions` | Optional prevalidated descriptor and trusted diagnostic prefix. |

Paths inside inputs and serialized results must be safe relative paths. Absolute, drive-relative, UNC, scheme-prefixed and parent-traversal paths are rejected. The implementation recognizes `paths`, `glob`, `globs`, `projectPath`, exclusion/glob arrays and extension names ending in `path`, `root` or `directory` without expanding them. It checks paths lexically, not through realpath or filesystem access. Arbitrary nested domain metadata is not recursively classified as a path or a secret.

JSON compatibility checks reject functions, symbols as values, `undefined` values, `BigInt`, non-finite numbers and ancestor cycles. Shared acyclic child objects are permitted. The checker examines enumerable values without running JSON serialization hooks; callers remain responsible for supplying plain data and producer-specific validation.

| Status | Artifacts | Native diagnostics |
| --- | --- | --- |
| `success` | At least one | No errors; warnings/information permitted |
| `partial` | At least one | At least one diagnostic; it need not be an error |
| `failed` | None | At least one error |

Producer and artifact identities use lower-case letters, digits, `.`, `_` and `-`, starting with a letter or digit. Kind categories additionally permit `/`. Input/output kinds must be declared, unique and nonempty. Artifact contract and contractVersion must appear together; their values belong to the artifact owner and are not rewritten to the producer wire version.

## Execution, cancellation and side effects

The runner checks definition errors before request errors and cancellation. A pre-aborted valid invocation never starts the producer. During execution, the producer receives the original request/context and may write files, emit progress or perform other host-authorized work. The kit itself performs no file or network I/O and offers no module discovery, command spawning, sandbox, timeout, transaction or rollback.

Each invocation captures its validated descriptor with independent input/output
kind arrays and capabilities. Mutating the producer's original descriptor during
execution cannot change that call's admitted identity, result validation or
kit-created failure identity. Later calls revalidate the then-current definition.
This isolation does not provide producer reentrancy or serialize concurrent I/O.

After the producer settles, an observed aborted signal takes precedence over a late successful return. Rejected `AbortError` values are also classified as aborted. Cancellation is cooperative: the kit waits for the producer to settle and does not terminate an ignored promise or undo work already performed. Signal reasons and raw thrown messages/stacks are omitted from kit-created public failures.

A valid result is returned by reference, preserving its exact current or historical wire version, diagnostics and artifact references. The kit's own failure writer emits `1.0.0`, drops candidate artifacts and uses fixed safe execution messages. It does not automatically upgrade valid legacy results.

## Diagnostic codes

Consumers should branch on code/severity rather than prose. Diagnostic field locations use known fields and indexes; unknown keys identify their parent, malformed extension names fall back to the parent input, and duplicate diagnostics omit the original duplicate value.

| Code | Meaning |
| --- | --- |
| `DOCUMENTATION_PRODUCER_INVALID` | Missing callable producer implementation |
| `DOCUMENTATION_PRODUCER_DESCRIPTOR_INVALID` | Invalid descriptor/capability shape |
| `DOCUMENTATION_PRODUCER_CONTRACT_UNSUPPORTED` | Unknown contract identity or exact version |
| `DOCUMENTATION_PRODUCER_FIELD_UNKNOWN` | Field outside a closed contract |
| `DOCUMENTATION_PRODUCER_FIELD_INVALID` | Invalid or duplicate field value |
| `DOCUMENTATION_PRODUCER_CAPABILITY_UNSUPPORTED` | Unimplemented watch/incremental lifecycle |
| `DOCUMENTATION_PRODUCER_REQUEST_INVALID` | Invalid input/request/JSON options |
| `DOCUMENTATION_PRODUCER_RUNTIME_PATH_INVALID` | Runtime root is not absolute |
| `DOCUMENTATION_PRODUCER_PATH_UNSAFE` | Serialized or input path is unsafe |
| `DOCUMENTATION_PRODUCER_INPUT_KIND_UNSUPPORTED` | Input kind not declared by the producer |
| `DOCUMENTATION_PRODUCER_RESULT_INVALID` | Invalid result shape or non-JSON data |
| `DOCUMENTATION_PRODUCER_IDENTITY_MISMATCH` | Result producer differs from the executed descriptor |
| `DOCUMENTATION_PRODUCER_ARTIFACT_INVALID` | Invalid artifact shape or contract/version pair |
| `DOCUMENTATION_PRODUCER_ARTIFACT_DUPLICATE` | Duplicate artifact identity |
| `DOCUMENTATION_PRODUCER_OUTPUT_KIND_UNDECLARED` | Result kind absent from declared outputs |
| `DOCUMENTATION_PRODUCER_DIAGNOSTIC_INVALID` | Invalid native diagnostic shape/severity/metadata |
| `DOCUMENTATION_PRODUCER_STATUS_INVALID` | Invalid status/artifact/diagnostic combination |
| `DOCUMENTATION_PRODUCER_EXECUTION_FAILED` | Producer threw during execution; raw details omitted |
| `DOCUMENTATION_PRODUCER_ABORTED` | Cancellation observed before invocation or after settlement, or producer threw AbortError |

Producer-authored diagnostic messages and metadata remain the producer's responsibility. Validation of their shape is not a guarantee that arbitrary domain text contains no private content.

## Migration from 0.1.0-draft

1. Keep historical documents with their original version/schema identity; the reader accepts that exact version.
2. New descriptors and producer-written results may use `1.0.0` with the corresponding new schema. A current descriptor and a historical result may interoperate when producer identity, kinds and all semantic checks match.
3. Keep artifact-owned contract references and the producer's own version unchanged unless those owners intentionally change them.
4. Supply JSON-compatible metadata, including diagnostic source extensions. Handle failed requests, late cancellation and sanitized execution errors explicitly.
5. Parse diagnostic code/severity and safe locations; do not depend on previous messages containing raw exception text, unknown keys or duplicate values.
6. Revalidate the exact package/source revision and supported environment before adopting it. Candidate source definitions do not republish an older npm package version.

The public constants retain their existing names: descriptor/result contract names, contract versions, schema versions, schema IDs and `DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA` / `DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA`. Schema objects are shared read-only definitions; treat them as immutable.

中文摘要：当前源码实现两个 1.0.0 契约候选，精确兼容历史 0.1.0-draft，旧 schema 身份保留。运行器保留有效旧结果原对象和版本；自身失败写新版本。异常、未知键及重复非法身份不应进入公开错误，已中止的晚到成功必须拒绝。生产器仍负责领域元数据脱敏、I/O 和协作式中止；这不是包或系统正式发行、沙箱或事务承诺。
