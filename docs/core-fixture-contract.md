# Core Fixture Contract

Status: draft for `S-sara-2`.

## Purpose

Core fixtures are shared inputs for `@hia-doc/core`, `@hia-doc/renderer-html`, `@hia-doc/cli`, future LSP diagnostics and IDE integrations.

The first fixture shape must follow the current JSDoc implementation practice, not the early i18n sketches. In particular, multilingual text is represented as field-level i18n data compatible with `doclet.hia.i18n.fields`.

`fixtures/jsdoc-integration.basic.json` records a compact `jsdoc-plugin-hia-sys` HIA Integration output sample. `@hia-doc/parser-jsdoc` converts it into the core document shape during tests instead of asking core to depend on JSDoc-specific doclet objects.

## Minimal Document Shape

```json
{
  "schemaVersion": "0.2.0",
  "id": "fixture.basic",
  "title": "HIA Basic Fixture",
  "defaultLocale": "zh-CN",
  "fallbackLocale": ["en", "zh-CN"],
  "locales": ["zh-CN", "en"],
  "nodes": [],
  "symbols": [],
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

This shape intentionally follows the current `jsdoc-plugin-hia-sys` practice:

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

Source metadata follows the current JPHS/JTH split:

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
