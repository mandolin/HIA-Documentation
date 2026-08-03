# HTML Authoring Source Comment Integration Verification Contract

`html-authoring-source-comment-integration-verification@0.1.0-draft` is an owner-local, metadata-only contract for
verifying that one accepted HTML-authoring handoff, one ready locale-aware source-comment projection, and one explicit
stable binding agree.

中文摘要：该 contract 把 W-P80 handoff 与 W-P96 projection 组合成可重复运行的 owner verification。它验证 logical
identity、locale metadata、privacy 与 permission boundary，但不复制 projected text、源码、raw comment、普通 map/sidecar
正文或 filesystem path，也不授予目标项目或 host 执行权。

## Inputs And Binding

The pure evaluator accepts an exact
`html-authoring-source-comment-integration-verification-request@0.1.0-draft` with three payload fields:

- an exact accepted `html-authoring-documentation-handoff@0.1.0-draft`;
- an exact ready `documentation-source-comment-projection@0.1.0-draft`;
- an explicit binding containing the handoff entry, document, symbol, source, doc-source-map entry, and projection IDs.

The handoff entry ID and doc-source-map entry ID are distinct identity roles and may use different strings. Consumers must
not infer either ID through slugging, interpolation, path conversion, or another string transform. The verifier requires the
handoff entry to exist in the accepted handoff and compares every other binding field directly with the validated projection.

中文说明：显式 binding 解决不同 owner 的稳定 ID 规则并不天然同形的问题。普通 doc-source-map 继续只提供
`symbolId -> entryId -> sourceId` linkage；完整 projection model 不进入普通 map。

## Locale And Semantics

The handoff locale, projection requested locale, and resolved locales are reported separately. Locale never changes the
canonical symbol or entry identity. The report also keeps three semantic dimensions independent:

- `resolution`: whether the explicit binding was validated;
- `confidence`: whether both owner contracts passed runtime validation;
- `provenance`: whether the result came from the handoff plus structured-comment projection chain.

A valid locale fallback therefore does not change identity, and provenance alone never implies successful resolution.

## Privacy And Permissions

The report serializes logical IDs, locale metadata, counts, booleans, fixed diagnostics, and no body. It records whether the
input projection contained explicitly authorized plain text, but never copies that text. The frozen privacy boundary is:

```json
{
  "sourcesContentPolicy": "none",
  "sourceBodyIncluded": false,
  "rawCommentIncluded": false,
  "mapBodyIncluded": false,
  "sidecarBodyIncluded": false,
  "pathIncluded": false,
  "richTextPolicy": "plain-text-only"
}
```

Target repository read/write, target commands/runtime, Tauri IPC, Obsidian Vault access, source readers, network access,
package publication, and target-adoption claims are all fixed to `false`.

## Runtime And CLI Boundary

`@hia-doc/cli` owns the Draft 2020-12 schema, pure evaluator, runtime guard, and
`hia docs html-authoring-verify --request <file> [--out <file>]`. The command reads only one caller-explicit safe-relative JSON
request. It writes only an optional caller-explicit safe-relative report under the invocation directory and never discovers a
target repository or source artifact.

`@hia-doc/htmdoc-runner` separately converts an already-materialized HTMDoc extraction and none-only doc-source-map into a
W-P96 projection request. That adapter performs no file read, parser execution, core evaluation, target action, host access,
or network access.

## Compatibility

Draft producers and consumers require exact contract names and versions and reject unknown fields. Draft minor/patch changes
are not implicitly compatible. Shape or semantic changes require a new version and explicit parallel support.

This P1 excludes target-host integration, source readers/fetch/embed, raw comment bodies, rich text, target-local configuration,
owner adoption claims, package publication, and automatic execution against HugeRTE or Obsidian projects.
