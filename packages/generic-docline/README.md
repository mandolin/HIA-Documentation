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
- The optional DLR reader is local, root-bound and read-only; it does not execute expressions,
  fetch network resources, or migrate resource files.

## Contracts

- `generic-docline-config@0.1.0-draft`
- `generic-docline-extraction@0.1.0-draft`
- `documentation-at-tag-locale-resource-profile@0.1.0-draft`
- `documentation-xml-locale-resource-profile@0.1.0-draft`

The package exports JSON Schema objects and lightweight validators:

```ts
import {
  GENERIC_DOCLINE_CONFIG_JSON_SCHEMA,
  GENERIC_DOCLINE_EXTRACTION_JSON_SCHEMA,
  validateGenericDocLineConfig,
  validateGenericDocLineExtraction
} from "@hia-doc/generic-docline";
```

The validators return HIA diagnostics and do not read files. Use them before
running the scanner when accepting user-provided config.

## Locale Resource Profiles

The package supplies two deliberately small source-profile extractors over the neutral
`documentation-locale-resource@0.1.0-draft` contract owned by `@hia-doc/core`:

- At-tag: one file-level `@langSrc docs/resource.dlr` and self-closing literal
  `<lang key="entry.key" src="docs/resource.dlr"/>` or `resource="stable.id"` fields.
- XML-safe: one self-closing `<langResource src="docs/resource.dlr"/>` or
  `resource="stable.id"` declaration plus the same self-closing literal `<lang key>` fields.

`key` is always an entry key. `path` remains a logical field path and is never interpreted as a
resource locator. `resource` and `src` are mutually exclusive. Interpolation, template expressions,
URLs, archive members and non-literal attributes are rejected rather than evaluated.

`readDocumentationLocaleResource()` requires an explicit absolute `resourceRoot`, validates a
project-relative POSIX `.dlr` locator, checks realpath containment to reject symlink/junction
escapes, and enforces byte/depth/entry/locale/text/time limits. Results and diagnostics omit raw
paths and resource text. The XML profile is a generic source-text profile; it does not claim a
.NET XML documentation adapter implementation.

## Minimal Config

```json
{
  "contract": "generic-docline-config",
  "contractVersion": "0.1.0-draft",
  "languageId": "toy",
  "fileGlobs": ["src/**/*.toy"],
  "commentSyntax": {
    "kind": "line",
    "linePrefix": "#"
  },
  "docBlock": {
    "marker": "@doc",
    "stripMarker": true
  },
  "attachmentRule": "next-symbol",
  "symbolAnchorRule": {
    "pattern": "^(?<kind>fn|value)\\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)",
    "kindGroup": "kind",
    "nameGroup": "name"
  },
  "symbolKindMapping": {
    "fn": "generic-function",
    "value": "generic-value"
  },
  "diagnosticProfile": "warn",
  "sourceRangePolicy": "doc-and-symbol",
  "visibilityPolicy": "all"
}
```

`commentSyntax.kind` may be `line` or `block`. Block syntax uses
`blockStart`, `blockEnd`, and optional `blockLinePrefix`.

## Diagnostic Profiles

- `strict`: reports missing symbol documentation as warnings.
- `warn`: reports missing symbol documentation as info.
- `off`: suppresses non-error diagnostics.

Error diagnostics are never suppressed.

## Producer Usage

Use `genericDocLineProducer` from a HIA project manifest when a project has no
dedicated language producer yet. The producer emits both
`generic-docline-extraction` and normalized HIA document artifacts.

Generated artifacts keep `sourcesContentPolicy: "none"` and must not embed
`sourcesContent`.

## Development Checks

```powershell
pnpm --filter @hia-doc/generic-docline check
pnpm --filter @hia-doc/generic-docline contract:check
```

## License

MIT.
