# Core IR Schema and Fixture Contract

Status: draft for the first formal core IR/schema, i18n resource and source/reference pass.

## Purpose

Core fixtures are shared inputs for `@hia-doc/core`, `@hia-doc/renderer-html`, `@hia-doc/cli`, LSP diagnostics and IDE integrations.

The first formal schema pass keeps TypeScript types as the authoring source, `HIA_DOCUMENT_SCHEMA` as a serializable JSON Schema draft, and `validateHiaDocumentDetailed()` as the runtime guard used by CLI and LSP tests.

## Versions

- Core document `schemaVersion`: `0.2.0`.
- `HIA_CORE_CONTRACT_VERSION`: `0.2.0`.
- `HIA_DOCUMENT_SCHEMA_VERSION`: `0.2.0`.
- Text i18n model version: `0.2.0`.
- Source model version: `0.2.0`.

The core document version and schema version are aligned in this pass. Text i18n now has a formal field/resource/key/path layer. Source remains an independent submodel and now has a formal source block, reference, relative path and preview/link contract.

## Fixtures

| Fixture | Purpose |
| --- | --- |
| `fixtures/core-minimal.hia.json` | Minimal valid core document with one node and one symbol. |
| `fixtures/basic.hia.json` | Shared renderer/CLI/LSP fixture with field i18n and source metadata. |
| `fixtures/i18n-resource.hia.json` | Field-level key/path and external resource fixture. |
| `fixtures/source-reference.hia.json` | Source definedIn, primary block, named fragment, reference and preview fixture. |
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
  "modelVersion": "0.2.0",
  "defaultLocale": "zh-CN",
  "fallbackLocale": ["en", "zh-CN"],
  "locales": ["zh-CN", "en"],
  "resources": [
    {
      "kind": "external-resource",
      "path": "i18n/profile.hia-i18n.json",
      "locale": "en",
      "format": "hia-i18n-json",
      "fields": ["description"]
    }
  ],
  "fields": {
    "description": {
      "fieldPath": "description",
      "kind": "description",
      "key": "profile.render.description",
      "path": "profile.render",
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
          "missing": false,
          "sourceKind": "external-resource",
          "sourceLocale": "en",
          "source": "i18n/profile.hia-i18n.json"
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
- `primaryBlock`: current symbol source preview and first source block role.
- `references`: field-level references to named source fragments such as `@coderef`.
- `fragments`: reusable named source fragments.

All fixture paths must be relative paths. No fixture should contain a local absolute path.

Adapter fixtures may preserve parser metadata, but local absolute fields such as generated `filePath` values must be removed or sanitized before they become core IR metadata.

`primaryBlock` and `source-fragment` share the source block fields `relativePath`, `range`, `content`, `rangeSource`, `confidence`, `link` and `preview`. `definedIn` is only a source location and does not carry source content.

## Diagnostics

Diagnostics are stored as arrays with a stable code, severity, message, optional `targetPath` and optional machine-readable `data`.

```json
{
  "code": "HIA_SOURCE_ABSOLUTE_PATH",
  "severity": "error",
  "message": "Source paths must be relative.",
  "targetPath": "symbols.0.source.definedIn.relativePath",
  "data": {
    "relativePath": "K:/bad/file.js"
  }
}
```

## Schema and Validator Coverage

The current JSON Schema draft covers:

- document required fields and version constant
- node and symbol identity fields
- diagnostic shape and severity enum
- diagnostic machine-readable `data`
- field i18n model shell, fields, blocks, segments and resources
- source metadata shell, definedIn, primaryBlock, references and fragments

The runtime validator additionally enforces:

- `defaultLocale` must be included in `locales`
- source modelVersion must match the current `HIA_SOURCE_MODEL_VERSION`
- source paths must not be local absolute paths and must not escape through `..`
- source positions use positive 1-based line/column values
- source ranges must not end before they start
- source blocks must use supported `rangeSource` and `confidence` values
- resolved source references must include a fragment snapshot
- i18n field keys must match `fieldPath`
- i18n resource paths must be relative and must not escape through `..`
- i18n field and inline segment `key/path` values must be non-empty when present
- nested diagnostics must use supported severity values

The schema keeps `additionalProperties` open for draft fields. New consumers should ignore unknown fields unless an ADR promotes them into a required contract.
