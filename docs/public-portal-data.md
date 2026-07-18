# Public Portal Data

The public portal data file defines the curated, publishable metadata that may be used by the HIA reference Pages build for ecosystem, adoption, operations and documentation navigation pages.

File:

```text
reference/public-portal-data.json
```

Validation:

```bash
pnpm run reference:portal:data:check
```

Generate and check the public portal pages:

```bash
pnpm run reference:portal:build
pnpm run reference:portal:check
```

## Boundary

The file is public input. It may include package names, public repository identifiers, maturity labels, public documentation categories, route patterns, and summarized adoption evidence.

It must not include local filesystem paths, non-public coordination notes, internal evidence file locations, selected source file lists, generated source contents, or absolute runner paths. The checker rejects these fields and markers before the data can be used by the reference build.

## Relationship To The Reference Build

`reference/public-reference-build.definition.json` controls the source allowlist for first-party documentation generation.

`reference/public-portal-data.json` controls the public portal metadata that can be rendered around the generated reference output.

Keeping these files separate lets the build preserve the existing schema and reference contracts while adding ecosystem and adoption pages through a reviewed public data surface.

The generated page output is written to `dist/public-portal-pages/`. `pnpm run reference:pages` merges those pages into the final `dist/reference-pages/` artifact while keeping the schema URL namespace and existing reference aliases intact.
