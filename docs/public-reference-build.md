# Public Reference Build

The public reference build assembles first-party HIA documentation artifacts from an explicit source allowlist. The build command produces a checked artifact; Pages deployment is a separate workflow step. Private workspace materials are excluded.

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

The JSDoc umbrella retains the reviewed `main` ref; its resolved commit is recorded in each build. Its existing `owner-sources.json` requires `mandolin/jsdoc-plugin-hia-sys` at `15970dc9da0f8e120677eab7eba3e959dcf42a34` and `mandolin/jsdoc-theme-hia` at `0df2ca9bbf40e159d8da69aac80b3c31136b1a05`. Both workflows check out those sibling owners and run `npm run prepare:owners` in the umbrella before `npm ci`. That helper verifies exact Git origins/commits and archive SHA/SRI against the unchanged lock; it does not replace missing source candidates with older registry packages.

Installation iterates the definition's seven `workspace: source` records. The two archive owners are build dependencies rather than extra source producers or entries in the reference provenance inventory. When the umbrella changes its owner declarations, update both workflows to the newly declared exact owner commits and verify archive identities. The preparation helper rejects mismatching checkouts. Local checkouts need the same preparation before building; no owner manifest or lock rewrite is required.

## Local Verification

From the workspace container, use the existing local satellite checkouts:

```powershell
cd main-repo
mise exec -- pnpm run build
mise exec -- node scripts/build-public-reference.mjs --workspace-root .. --main-repo-root . --sources-root ../HIA --out dist/public-reference-build
mise exec -- node scripts/check-public-reference-build.mjs --out dist/public-reference-build
```

The build writes two localized unified documentation outputs, a source-linkage panel, and `reference-build.json`. The latter contains only repository/ref/resolved-SHA provenance, definition identity, aggregate counts, and privacy status. It never includes credentials, local absolute paths, private workspace data, or embedded source contents.

The entry floors use the canonical project render input: when one producer result contains both a raw `htmdoc-extraction` or `cssdoc-extraction` artifact and an equivalent normalized `hia-document`, the unified reference renders the `hia-document` entry. Raw extraction artifacts remain available in producer output for debugging, schema checks, and source-map traceability, but they are not double-counted as public navigation entries. The build also checks required canonical CSS/HTML entry IDs so this deduplicated floor still catches real symbol loss.

## Deployment Boundary

The checked build is assembled with the existing `/schemas/` distribution and generated public portal pages into the single GitHub Pages artifact by `pnpm run reference:pages`. The assembler copies only runtime-facing reference files, keeps `/schemas/` byte-identical to the schema build, writes sanitized `reference-pages.json` and `public-portal-pages.json` manifests, and emits the `current/` + `releases/0.1.0-draft/` versioned layout with `versions.json`. See [Reference Pages](./reference-pages.md) for the deployed route contract and verification commands.
