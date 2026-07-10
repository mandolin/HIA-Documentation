# @hia-doc/source-linkage

Workspace package for indexing and validating `doc-source-map` manifests.

The package is intentionally small: it does not parse ordinary Source Map v3 mappings. It reads the documentation source map manifest, checks the privacy/path baseline, and exposes a normalized index that CLI, renderer, LSP, and future browser integrations can consume.

It also exports the machine-readable Draft 2020-12 contract through `DOC_SOURCE_MAP_JSON_SCHEMA`, `DOC_SOURCE_MAP_SCHEMA_ID` and `DOC_SOURCE_MAP_SCHEMA_VERSION`. Structural schema validation does not replace the package's semantic path, privacy and reference diagnostics.
