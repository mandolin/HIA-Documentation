# Public Reference Build

The public reference build assembles the first-party HIA documentation artifacts from an explicit source allowlist. It is the W-P14.2 build boundary used by the remote GitHub Actions gate; it does not deploy GitHub Pages or read the private WorkZone.

## Source Boundary

The canonical definition is [`reference/public-reference-build.definition.json`](../reference/public-reference-build.definition.json). It requires the `main-repo` checkout and these seven selected repositories:

- `mandolin/hia-jsdoc`
- `mandolin/hia-htmdoc`
- `mandolin/hia-cssdoc`
- `mandolin/hia-sassdoc`
- `mandolin/hia-pugdoc`
- `mandolin/hia-tsdoc`
- `mandolin/hia-vuedoc`

Remote automation checks out the seven satellites into `reference/sources/` with the read-only `HIA Reference Builder` GitHub App token. The token is used only by checkout actions with `persist-credentials: false`; the builder receives no credential environment variable.

## Local Verification

From the workspace container, use the existing local satellite checkouts:

```powershell
cd main-repo
mise exec -- pnpm run build
mise exec -- node scripts/build-public-reference.mjs --workspace-root .. --main-repo-root . --sources-root ../HIA --out dist/public-reference-build
mise exec -- node scripts/check-public-reference-build.mjs --out dist/public-reference-build
```

The build writes two localized unified documentation outputs, a source-linkage panel, and `reference-build.json`. The latter contains only repository/ref/resolved-SHA provenance, definition identity, aggregate counts, and privacy status. It never includes credentials, local absolute paths, WorkZone data, or embedded source contents.

## Deployment Boundary

The checked build is assembled with the existing `/schemas/` distribution into the single GitHub Pages artifact by `pnpm run reference:pages`. The assembler copies only runtime-facing reference files, keeps `/schemas/` byte-identical to the schema build, writes a sanitized `reference-pages.json` route/provenance manifest, and emits the W-P15.2 `current/` + `releases/0.1.0-draft/` versioned layout with `versions.json`. See [Reference Pages](./reference-pages.md) for the deployed route contract and verification commands.
