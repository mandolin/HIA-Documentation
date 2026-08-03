# Documentation Source Comment Projection Contract

`documentation-source-comment-projection@0.1.0-draft` is a neutral, parser-independent contract for projecting
already-structured source comments into one explicitly requested locale.

中文摘要：该 contract 只接收 owner producer 已结构化的注释，不读取源码文件、不执行表达式，也不暴露语言私有 AST。
它把 requested/resolved locale、resolution、confidence 与 provenance 分开记录，并默认禁止正文投影。

## Identity

`projectionId`, `documentId`, `symbolId`, `sourceId`, and `commentId` are logical stable identities. A projection entry's
`stableCommentKey` combines those values and deliberately excludes locale, projected text, routes, and filesystem paths.

`source.docSourceMapEntryId` may link the projection to one ordinary doc-source-map entry. The ordinary map keeps that
linkage only; it does not embed the projection or comment text.

## Locale Resolution

The producer supplies canonical BCP 47 `requestedLocale`, `defaultLocale`, optional fallback locales, and localized text.
The core evaluator reuses the deterministic locale-resource fallback order and records:

- `resolution`: `exact`, `fallback`, `default`, or `missing`;
- `confidence`: `declared` or `none`;
- `provenance`: `structured-source-comment` with the resolved source locale, or `unresolved`.

These dimensions are independent. A fallback does not lower confidence, and provenance does not imply successful
resolution.

## Privacy And Rendering

The default `contentPolicy` is `none`. `explicit-projected-text` permits projected plain text only. Source bodies, raw
comments, and ordinary source-map `sourcesContent` remain disabled:

```json
{
  "sourcesContentPolicy": "none",
  "sourceBodyIncluded": false,
  "rawCommentIncluded": false,
  "projectedCommentTextIncluded": false,
  "richTextPolicy": "plain-text-only"
}
```

Portal rendering requires two independent opt-ins: the producer projection must include projected text, and renderer
configuration must request the same locale with `contentPolicy: "explicit-projected-text"`. The renderer escapes text and
does not interpret HTML or Markdown. `project-index.json` contains an allowlisted metadata summary only.

中文说明：即使 producer 已提供正文，renderer 未显式授权时也只显示 metadata；即使 renderer 请求正文，producer 的
projection 为 `none` 时也不会显示。导航、搜索索引和普通 source map 均不包含 `projectedText`。

## Runtime Boundary

`@hia-doc/core` owns the schema, pure evaluator, and runtime validator. `@hia-doc/config` validates explicit Portal options.
The CLI may consume a valid projection from HIA symbol metadata when its document and symbol identities match; it does not
discover source files or parse comments. `@hia-doc/renderer-html` consumes the validated projection under explicit Portal
information architecture.

## Compatibility

Draft consumers require the exact contract name and version and reject unknown fields. Draft minor or patch changes are not
implicitly compatible. Shape or semantic changes require a new draft version and explicit parallel consumer support.

The P1 contract excludes source readers, parser ASTs, rich text, comment inheritance/composition execution, remote fetch,
target-project actions, and package publishing.
