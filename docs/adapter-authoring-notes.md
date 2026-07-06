# Adapter Authoring Notes

Status: draft notes for adapter authors.

## Purpose

Adapters convert language or ecosystem-specific documentation data into a normal HIA core document. A renderer, CLI, LSP server or IDE extension should be able to consume the output without knowing the original parser implementation.

`@hia-doc/parser-jsdoc` is the first compatibility baseline. Future adapters should follow the same boundary rather than copying JSDoc-specific doclet structures into core.

## Minimum Output

An adapter must return a `HiaDocument` that passes `validateHiaDocumentDetailed()`.

Stable semantics should use formal core fields:

- document identity: `id`, `title`, `defaultLocale`, `locales`
- navigation: `nodes`
- API entities: `symbols`
- text model: `symbol.i18n`
- source model: `symbol.source`
- diagnostics: document, symbol, i18n and source diagnostics

Adapter-specific trace data belongs in `metadata`.

## Metadata

Document metadata should include:

```json
{
  "adapter": "parser-jsdoc",
  "adapterBridgeVersion": "0.1.0",
  "metadataSchemaVersion": "0.1.0",
  "source": "jsdoc",
  "integration": {}
}
```

Symbol metadata should identify the adapter and keep only sanitized ecosystem-specific debug data.

Consumers may ignore unknown metadata. Do not require renderer or LSP behavior to depend only on adapter metadata when a formal core field exists.

## Path Safety

Core documents must not contain local absolute paths. Before writing metadata or diagnostic data into a core document, remove:

- keys ending in `filePath`, case-insensitive
- absolute path strings
- path traversal strings using `..`
- UNC or network share path strings

Source and i18n resource paths must stay relative and pass the core validator.

## Diagnostics

Use the core diagnostic shape:

```json
{
  "code": "HIA_JSDOC_ADAPTER_DIAGNOSTIC",
  "severity": "warning",
  "message": "Adapter compatibility warning.",
  "targetPath": "ir.nodes.0",
  "data": {}
}
```

`message` is for people. `data` is for tools, tests and future code actions. Keep `data` structured and sanitized.

## Compatibility Tests

Each adapter should provide:

- one realistic input fixture
- one compatibility fixture for metadata and diagnostic boundaries
- a conversion test that validates the resulting core document
- a safety test that checks converted output does not leak local absolute paths
- at least one integration path through renderer, CLI or LSP when the adapter becomes user-facing

## Current JSDoc Baseline

The JSDoc baseline fixtures are:

- `fixtures/jsdoc-integration.basic.json`
- `fixtures/jsdoc-integration.compat.json`

The adapter exports:

- `JSDOC_ADAPTER_NAME`
- `JSDOC_ADAPTER_CORE_BRIDGE_VERSION`
- `JSDOC_ADAPTER_METADATA_SCHEMA_VERSION`
- `JSDOC_HIA_INTEGRATION_CONTRACT`
- `JSDOC_HIA_INTEGRATION_CONTRACT_VERSION`
