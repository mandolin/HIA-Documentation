---
title: "Aggregate projects and preserve language semantics"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# Aggregate projects and preserve language semantics

A project manifest declares multiple artifacts, producers and navigation semantics. HIA documents, JSDoc Integration and producer results are distinct input kinds; arbitrary JSON is not a document. The current 1.0.0 project manifest retains exact legacy reads, independently of package versions.

In the example below, api.hia.json must exist and contain a compatible document. Project builds default to multipage output. Direct artifact builds, explicit single-page output and eager loading retain their separate output and memory behavior.

Paths, public labels and semanticPath values must follow the manifest rules. Do not derive reader-facing repository or package identities from local absolute paths.

Content-field locales, interface locales and locale resources are separate concerns. Canonical @lang and inline `<lang>` provide field text. An interface-language report checks actual message input and does not establish translated prose. Declared locales do not create translations; identify fallback content.

Producer execution loads declared modules and may write artifacts. Validation is neither sandboxing nor execution authority. Use explicit inputs and dedicated outputs, and review publication boundaries before building a public site.

## Configuration and command examples

These shared examples use the same configuration identities, inputs and commands as the Chinese guide. Run them only after preparing the matching tools and inputs.

~~~json
{"schemaVersion":"1.0.0","project":{"id":"project:sample","name":"Sample Documentation","defaultLocale":"zh-CN","locales":["zh-CN","en"]},"inputs":[{"kind":"hia-document","path":"api.hia.json","domain":"js"}]}
~~~

~~~sh
hia docs build --project-manifest hia-project.json --out dist/site --locale zh-CN
~~~

## Authoritative references

The linked technical references retain their actual languages; this English guide does not imply that every linked reference is translated.

- [docs/documentation-locale-resource-contract.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-locale-resource-contract.md)
- [docs/documentation-source-comment-projection-contract.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-source-comment-projection-contract.md)
- [docs/project-manifest-guide.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-manifest-guide.md)
- [docs/unified-html-demo.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/unified-html-demo.md)
