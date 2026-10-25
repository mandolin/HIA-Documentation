# Large project builds and source excerpts

`@hia-doc/cli` project builds render and await one file at a time. The renderer
also exposes `renderProjectHtmlDocumentToWriter(input, writer, options)` for
applications that own storage. The existing `renderProjectHtmlDocument` API
continues to return the complete file array with the same contents and ordering.

中文：项目构建使用逐文件生成/等待写入，避免全站HTML同时驻留。旧内存API保持兼容；
输入文档、中性索引与授权片段仍随数据规模增长，不宣称整个进程是常量内存。

```ts
const result = await renderProjectHtmlDocumentToWriter(input, async (file) => {
  await storage.write(file.path, file.contents, file.contentType);
}, options);
// result: { fileCount, diagnostics, manifest }; no file bodies are retained here.
```

The writer is awaited before the next page is generated. It owns its output root
and error handling. A rejected write stops generation; earlier writes are not
rolled back. Invalid explicit configuration/contracts fail before output, and
error diagnostics cause zero writes. Prefer a dedicated staging output directory
for deployment workflows. This API does not perform filesystem or network I/O
itself and grants no source-publication authority.

The default split site emits individual entry pages. Explicit `single-page` and
`eager` modes retain their semantics and may produce large individual files or
preload indexes. Input/index metadata and prepared source assets still contribute
to memory; callers that retain writer payloads also retain their bodies.

## Authorizing local source excerpts

```json
{
  "schemaVersion": "0.1.0",
  "docs": {
    "source": {
      "presentation": "fetch",
      "publicAssetPolicy": "explicit-public",
      "localRoot": ".",
      "maxLines": 400,
      "fetchTrigger": "on-expand"
    }
  }
}
```

`localRoot` is relative to the configuration file. The CLI reads safe relative
locators sequentially, scans only through the requested final line, and retains
selected lines rather than whole files. It checks real-path containment too.
The per-command excerpt LRU is bounded by an estimated 16 MiB of UTF-16 bodies
and record overhead. Default excerpts contain at most 400 inclusive source lines;
`maxLines` also clips producer-provided excerpts, without changing documentation
summary, remarks, parameters, returns, exceptions, or translations.

Individual excerpts must fit the existing 1 MiB public-reader limit. Prepared
bodies have an estimated 1 GiB UTF-16 budget, with shared excerpt objects charged
once. Limit errors use `HIA_CLI_SOURCE_PREVIEW_LIMIT` or
`HIA_CLI_SOURCE_PREVIEW_BUDGET_EXCEEDED` with instructions to reduce `maxLines`,
provide bounded producer excerpts, or split a build. These are protective budgets,
not exact V8 heap/RSS predictions or configurable configuration fields.

`publicAssetPolicy: "none"` does not authorize local file reads, including in
`link` mode. A producer-provided preview remains an explicit body input. `link`
uses a build-generated same-origin HTML viewing page with real `#L` anchors, while `fetch` lazily loads
a separate plain-text asset and verifies its digest. Fetch previews show line numbers linked to the corresponding static source page; script-free topic pages use that same view link. The source-view HTML escapes code, includes no script, and retains line positions. Discarding untrusted producer/external URLs
is intentional; it is not repaired by restoring arbitrary links or publishing
source without consent. Missing authorized assets retain diagnostics.

Pure XML documentation locators remain XML locators. The renderer does not infer
a C# file or line when an upstream producer has not supplied one. Selective
path/extension authorization remains a separate capability. This repair adds no configuration keys; line numbers and source targets use the maintainer-confirmed minimal scope.
