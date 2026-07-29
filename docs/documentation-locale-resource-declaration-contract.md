# Documentation Locale Resource Declaration Contract

## 中文摘要

`documentation-locale-resource-declaration@0.1.0-draft` 为 DLR source declaration 和
secure discovery 提供两个明确分层的 artifact kind：

- `controlled-declaration` 是受控输入，可临时持有 `resourceId` 与 project-relative `.dlr`
  locator 的 catalog；它只能用于 in-memory exact allowlist matching，不能发布到 ordinary
  doc-source-map、public evidence 或 host payload。
- `public-discovery` / `public-discovery-sidecar` 只记录 logical identity、approved profile/version、
  `resourceRootId`、resource id、diagnostic code、provenance 和 deny-all privacy policy。它们
  不含 locator、absolute path、range、source/resource body 或 resolved text。

discovery success 仅代表已解析的 source selection 精确命中受控 catalog。它不代表 `.dlr`
文件存在、可读、内容有效、entry 存在或 locale 已 resolution。本 contract 不调用 filesystem、
`realpath`、DLR parser/resolver、directory walk、glob、network 或 write。

## Contract Surface

| Surface | Value |
| --- | --- |
| Contract | `documentation-locale-resource-declaration@0.1.0-draft` |
| Owner | `@hia-doc/core` |
| Schema | `documentation-locale-resource-declaration-0.1.0-draft.schema.json` |
| Controlled kind | `controlled-declaration` |
| Public kinds | `public-discovery`, `public-discovery-sidecar` |

## Source Profiles And Catalog Binding

W-P62 does not introduce a source tag. It consumes only the frozen W-P56 literal profile extraction:

- `documentation-at-tag-locale-resource-profile@0.1.0-draft`: `@langSrc` and literal `<lang>` selections.
- `documentation-xml-locale-resource-profile@0.1.0-draft`: literal `<langResource>` and `<lang>` selections.

The profile owner supplies an already-parsed extraction. For catalog-only discovery, a `resource`
selection must exactly match an approved `resourceId`, and a `src` selection must exactly match one
controlled catalog locator. Prefix matching, globs, directory walks, cwd fallback, URI resolution, and
resource-id guessing are not supported.

`resourceRootId` is a logical stable id, not a filesystem path. Physical absolute roots remain an
explicit host-local input for a separately authorized reader invocation; this draft does not invoke the
existing W-P56 reader.

## Privacy And Doc-Source-Map Linkage

The public artifacts require this deny-all policy:

```json
{
  "allowRawLocator": false,
  "allowRanges": false,
  "allowResolvedText": false,
  "allowResourceBody": false,
  "allowSourceBody": false
}
```

An ordinary `doc-source-map` may declare a discovery sidecar through
`localeDiscoverySidecars`. Each declaration contains only `id`, contract/version, and a safe relative
artifact path. The `@hia-doc/source-linkage` index validates this reference without loading the sidecar
body or any declaration catalog.

## Compatibility And Non-goals

Existing `hia-i18n-json` remains a `legacy-adapter-bridge` and emits an explicit compatibility
diagnostic; it is not automatically migrated or upgraded to this contract. Changes to profile grammar,
root binding, catalog matching, privacy, or required fields require a new contract version, schema `$id`,
profile version, fixture matrix, and compatibility record.

This draft does not read a resource or source file, validate resource contents, resolve an entry or locale,
create a cache/watcher/CLI, migrate `.resx`/XLIFF/Fluent data, project to quality-review or IDE hosts, or
create edits.
