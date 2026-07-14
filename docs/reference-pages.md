# HIA Reference Pages

The HIA public reference is published as one GitHub Pages artifact at:

```text
https://mandolin.github.io/HIA-Documentation/
```

The site combines first-party documentation generated from the explicit public source allowlist with the canonical JSON Schema namespace. It keeps compatibility routes at the site root and also exposes a first versioned layout through `current/` and `releases/`.

## Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Default English unified reference entry. |
| `/en/` | English reference route. |
| `/zh-CN/` | Chinese reference route. |
| `/source-linkage/` | Public source-linkage panel and structured open-request payload. |
| `/current/` | Current reference snapshot. |
| `/current/en/` | Current English reference route. |
| `/current/zh-CN/` | Current Chinese reference route. |
| `/current/source-linkage/` | Current source-linkage panel. |
| `/releases/0.1.0-draft/` | First release snapshot candidate. |
| `/versions/` | Human-readable version index. |
| `/versions.json` | Machine-readable version index with search partitions. |
| `/schemas/` | Existing canonical schema catalog and schema URLs. |
| `/reference-build.json` | Sanitized source repository, ref and resolved-SHA provenance. |
| `/reference-pages.json` | Static route, locale, schema and privacy manifest. |

The `/schemas/` namespace is copied byte-for-byte from the generated schema distribution. Existing canonical `$id` URLs and unversioned retrieval aliases remain valid.

## Versioning Model

The W-P15.2 layout is a candidate, not a full documentation history system.

| Path | Meaning |
| --- | --- |
| `/current/` | Alias for the latest published reference build. |
| `/releases/0.1.0-draft/` | Immutable-looking snapshot path for the first public reference candidate. |
| `/versions.json` | Version contract used by checks and future UI. |

The root routes remain for compatibility during the transition. Future release cycles can add additional `releases/<id>/` paths without moving `/schemas/`.

## Local Verification

From the workspace container, first build the public reference against the local satellite checkouts, then assemble and validate the Pages artifact:

```powershell
cd main-repo
mise exec -- pnpm run build
mise exec -- node scripts/build-schema-pages.mjs
mise exec -- node scripts/build-public-reference.mjs --workspace-root .. --main-repo-root . --sources-root ../HIA --out dist/public-reference-build
mise exec -- pnpm run reference:check
mise exec -- pnpm run reference:pages
mise exec -- pnpm run reference:pages:check
```

`reference:pages:check` rejects missing routes, incomplete provenance, altered schema files, hidden producer intermediates, embedded source content, private workspace markers and local absolute paths.

## Publication Security

The `schema-pages.yml` workflow is the only workflow that deploys this Pages site. Its build job receives only `contents: read` and uses the read-only HIA Reference Builder GitHub App token only while checking out the seven allowlisted satellites. The deploy job does not check out satellites or access the App token; it receives only the GitHub Pages deployment permissions required by `actions/deploy-pages`.

After deployment, `reference:pages:online` checks the public routes, the version index when present, the sanitized provenance manifests, the catalog, every canonical schema URL and each package-style schema alias. `reference:ops:check` adds publication age, source freshness and operational failure classification.
