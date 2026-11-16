# Persistent core-reference routes

The core API reference keeps its public entry identities in `core-publication-history.json`. Normal builds read this committed registry and emit the renderer's `documentation-project-route-history@0.1.0-draft` artifact through the explicit `--route-history` CLI option.

The registry fixes previously published public IDs while native symbol IDs and source maps continue to describe the current source generation. Historical entry aliases and HTML paths point to the registered current entries.

## Declaration evidence

Each registered declaration pairs an `entryId` with a SHA-256 `proof`. The proof covers its explicit package input, module, source path, kind, name, signature with normalized line endings, native TypeScript kind and structured type-expression slots. The complete ancestor chain contributes the same fields. Coordinates and native symbol IDs are excluded.

The collector rejects ambiguous declarations, duplicate native IDs, missing ancestors and cycles. The binder requires every current declaration and every registered proof to match exactly. Builds reject undeclared additions, removals and signature changes. The registry grants no source-file or network permissions.

## Maintaining the registry

Generate the current package artifacts through `preparePublicReferencePackageApis` and collect their declaration evidence using `collectCorePublicationDeclarations` in `scripts/core-publication-history.mjs`. Review changed declarations against the last published artifacts before editing the committed registry.

Preserve the existing `entryId` when explicitly updating evidence for the same declaration. Assign each new declaration a unique public ID before publication. For renamed, split, merged or removed declarations, record the intended current destination and review all historical paths and section anchors. Ambiguous correspondence requires an explicit maintainer decision.

Keep the historical source repository, immutable commit, locale and original index digest. Retain historical aliases cumulatively. Verify exact fragment anchors, script-enabled redirects, script-free ordinary links, current source-map bindings and the complete publication inventory. All generated files remain subject to the existing 1,000,000,000-byte site budget.

Run the normal build from a committed source tree after building the CLI.

```sh
pnpm run build
pnpm run reference:core:build
```

中文说明。核心参考站的公开身份由已提交登记长期维护。正常构建双向核验全部声明证明，新增、删除、签名变化或歧义均须显式审阅登记。位置与原生符号变化可通过唯一证明继续绑定原公开 ID，原生地图保持真实，历史路径、小节、无脚本链接与总容量一并验收。
