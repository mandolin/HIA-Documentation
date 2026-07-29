# Documentation Locale Resource Contract

## 中文摘要

`documentation-locale-resource@0.1.0-draft` 定义独立、中性的文档语言资源（DLR）
payload。它不改变 HIA field-level i18n 的 source-document truth：`fieldPath` / `path`
是逻辑 field 路径，绝不是资源文件位置。

P1 canonical format 是 UTF-8 JSON，推荐扩展名 `.dlr`。稳定资源身份为 `resourceId`，
稳定 entry 身份为 `resourceId + entryKey`。physical locator 可以改变，身份不能因此改变。

| Surface | Value |
| --- | --- |
| Resource contract | `documentation-locale-resource@0.1.0-draft` |
| Resolution sidecar | `documentation-locale-resolution@0.1.0-draft` |
| Owner | `@hia-doc/core` |
| Canonical schema | `documentation-locale-resource-0.1.0-draft.schema.json` |
| Recommended format | UTF-8 JSON `.dlr` |

DLR resolver 使用 canonical BCP 47 locale，并按 requested、父级截断、显式 profile
fallback、default locale 的固定顺序选择文本。`resolutionKind`、`confidence` 和
`provenance` 是三个独立字段；使用 fallback 不等于 low confidence。

安全 local reader 只在调用方显式提供的 absolute resource root 内读取 project-relative
POSIX `.dlr` 文件。它拒绝 absolute/drive/UNC/URI/query/fragment/traversal locator，随后
使用 realpath containment 拒绝 symlink 或 junction escape；它不使用 cwd fallback、
不执行表达式、不访问网络、也不写入资源。

普通 `doc-source-map` 只能在 `localeResolutionSidecars` 中声明 sidecar identity、
contract/version 和 safe relative artifact path。`documentation-locale-resolution` sidecar
不得包含 raw locator、resource body 或 resolved text。

## Minimal Resource

```json
{
  "$schema": "https://mandolin.github.io/HIA-Documentation/schemas/documentation-locale-resource-0.1.0-draft.schema.json",
  "kind": "documentation-locale-resource",
  "contractVersion": "0.1.0-draft",
  "format": "documentation-locale-resource-json",
  "formatVersion": "0.1.0-draft",
  "resourceId": "docs.api.user",
  "defaultLocale": "zh-CN",
  "locales": ["zh-CN", "en"],
  "entries": {
    "user.greet.description": {
      "localizedText": {
        "zh-CN": "问候用户。",
        "en": "Greets a user."
      }
    }
  }
}
```

## P1 Source Profiles

- `documentation-at-tag-locale-resource-profile@0.1.0-draft` supports one
  `@langSrc docs/resource.dlr` document default and literal self-closing
  `<lang key="entry.key" src="docs/resource.dlr"/>` or `resource="stable.id"`.
- `documentation-xml-locale-resource-profile@0.1.0-draft` supports one literal
  self-closing `<langResource src="docs/resource.dlr"/>` or `resource="stable.id"`
  document default plus the same field-level `<lang key>` mapping.

`resource` and `src` are mutually exclusive. `key` always identifies an entry;
`path` is never a locator. Interpolation, template expressions, remote URLs and
object serialization are not part of P1.

## Compatibility And Non-goals

The current JSDoc `hia-i18n-json` descriptor is a `legacy-adapter-bridge`; it is
not canonical DLR and is not migrated automatically. `.resx`, XLIFF and Fluent
bridges, terminology extraction, watch/cache/CLI, HIA-Lint/LSP/IDE integration,
network resources and source/resource writes are outside this draft implementation.

Unknown optional fields may be ignored, but a breaking change to a required field,
enum meaning, resolution ordering, privacy rule or source profile grammar requires a
new contract version, schema `$id`, profile version, fixture matrix and compatibility
record.
