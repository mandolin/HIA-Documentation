# @hia-doc/source-linkage

Workspace package for indexing and validating `doc-source-map` manifests.

The package is intentionally small: it does not parse ordinary Source Map v3 mappings. It reads the documentation source map manifest, checks the privacy/path baseline, and exposes a normalized index that CLI, renderer, LSP, and future browser integrations can consume.
