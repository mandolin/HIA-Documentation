# @hia-doc/generic-docline

Config-driven generic documentation fallback scanner and producer for HIA.

This package is for languages or private DSLs that do not yet have a dedicated
`hia-*doc` adapter. It provides basic documentation extraction from configured
comment blocks and symbol anchors. Dedicated adapters such as JavaDoc, GoDoc,
DotNetDoc, and TSDoc should be preferred when available.

## Boundary

- No external parser dependency in P1.
- No Tree-sitter, Universal Ctags, or Doxygen runtime requirement in P1.
- No embedded source content by default.
- Output is intended to be replaceable by a dedicated `hia-*doc` artifact later.

## License

MIT.
