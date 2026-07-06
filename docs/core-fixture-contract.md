# Core IR Schema and Fixture Contract

Status: draft for the first formal core IR/schema pass.

## Purpose

Core fixtures are shared inputs for `@hia-doc/core`, `@hia-doc/renderer-html`, `@hia-doc/cli`, LSP diagnostics and IDE integrations.

The first formal schema pass keeps TypeScript types as the authoring source, `HIA_DOCUMENT_SCHEMA` as a serializable JSON Schema draft, and `validateHiaDocumentDetailed()` as the runtime guard used by CLI and LSP tests.

## Versions

- Core document `schemaVersion`: `0.2.0`.
- `HIA_CORE_CONTRACT_VERSION`: `0.2.0`.
- `HIA_DOCUMENT_SCHEMA_VERSION`: `0.2.0`.
- Text i18n model version: `0.1.0`.
- Source model version: `0.1.0`.

The core document version and schema version are aligned in this pass. Text i18n and source remain independent submodels and will be deepened in later contract passes.

## Fixtures

| Fixture | Purpose |
| --- | --- |
| `fixtures/core-minimal.hia.json` | Minimal valid core document with one node and one symbol. |
| `fixtures/basic.hia.json` | Shared renderer/CLI/LSP fixture with field i18n and source metadata. |
| `fixtures/jsdoc-integration.basic.json` | JSDoc Integration input consumed by `@hia-doc/parser-jsdoc` during bridge tests. |

## Minimal Document Shape

```json
{
  "schemaVersion": "0.2.0",
  "id": "fixture.core-minimal",
  "title": "HIA Core Minimal Fixture",
  "defaultLocale": "en",
  "locales": ["en"],
  "nodes": [
    {
      "id": "node.root",
      "kind": "root",
      "title": "API",
      "symbolIds": ["module:sample"]
    }
  ],
  "symbols": [
    {
      "id": "module:sample",
      "kind": "module",
      "name": "sample",
      "summary": "Sample API module."
    }
  ],
  "diagnostics": []
}
```

Required fields:

- `schemaVersion`
- `id`
- `title`
- `defaultLocale`
- `locales`
- `nodes`
- `symbols`

`fallbackLocale` may be a string or an array. Fixtures should prefer an array so fallback order is explicit.

## Nodes

Nodes describe document structure and navigation. The first fixture keeps nodes shallow and points to symbols by id.

```json
{
  "id": "node.module.webtest",
  "kind": "module",
  "title": "webtest",
  "symbolIds": ["module:webtest"],
  "children": []
}
```

## Symbols

Symbols are a flat list. Parent/containment information is expressed with `parentId`, `longname`, `path` or node membership, rather than nested symbol trees.

```json
{
  "id": "function:buildProfileSummary",
  "kind": "function",
  "name": "buildProfileSummary",
  "longname": "module:webtest.buildProfileSummary",
  "path": ["webtest", "buildProfileSummary"],
  "signature": "buildProfileSummary(profile) => string",
  "i18n": {},
  "source": {}
}
```

## Field-Level i18n

Core uses field-level i18n. A plain `summary` string may exist as a rendered cache or compatibility field, but it is not the source of truth.

This shape intentionally follows the current JSDoc adapter practice:

- `@lang` produces doclet description language blocks.
- `<lang>` produces inline field segments.
- unmarked text belongs to `defaultLocale`.
- resolved display text is stored in `localizedText`.

```json
{
  "model": "hia-text-i18n",
  "modelVersion": "0.1.0",
  "defaultLocale": "zh-CN",
  "fallbackLocale": ["en", "zh-CN"],
  "locales": ["zh-CN", "en"],
  "fields": {
    "description": {
      "fieldPath": "description",
      "kind": "description",
      "defaultLocale": "zh-CN",
      "defaultText": "生成用户资料摘要。",
      "source": "doc.description",
      "blocks": [],
      "segments": [],
      "localizedText": {
        "zh-CN": "生成用户资料摘要。",
        "en": "Builds a user profile summary."
      },
      "resolutions": {
        "en": {
          "requestedLocale": "en",
          "resolvedLocale": "en",
          "fallbackChain": ["en", "zh-CN"],
          "usedFallback": false,
          "missing": false
        }
      },
      "missingLocales": []
    }
  }
}
```

## Source Metadata

Source metadata follows the current adapter/renderer split:

- `definedIn`: definition link and relative file position.
- `primaryBlock`: current symbol source preview.
- `references`: extra source fragments such as `@coderef`.
- `fragments`: reusable source fragments.

All fixture paths must be relative paths. No fixture should contain a local absolute path.

Adapter fixtures may preserve parser metadata, but local absolute fields such as generated `filePath` values must be removed or sanitized before they become core IR metadata.

## Diagnostics

Diagnostics are stored as arrays with a stable code, severity, message and optional `targetPath`.

```json
{
  "code": "HIA_SOURCE_ABSOLUTE_PATH",
  "severity": "error",
  "message": "Source paths must be relative.",
  "targetPath": "symbols.0.source.definedIn.relativePath"
}
```

## Schema and Validator Coverage

The current JSON Schema draft covers:

- document required fields and version constant
- node and symbol identity fields
- diagnostic shape and severity enum
- field i18n model shell, fields, blocks, segments and resources
- source metadata shell, definedIn, primaryBlock, references and fragments

The runtime validator additionally enforces:

- `defaultLocale` must be included in `locales`
- source paths must not be local absolute paths
- source positions use positive 1-based line numbers
- i18n field keys must match `fieldPath`
- nested diagnostics must use supported severity values

The schema keeps `additionalProperties` open for draft fields. New consumers should ignore unknown fields unless an ADR promotes them into a required contract.
