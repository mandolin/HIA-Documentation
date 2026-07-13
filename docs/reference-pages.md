# HIA Reference Pages

The HIA public reference is published as one GitHub Pages artifact at:

```text
https://mandolin.github.io/HIA-Documentation/
```

The site combines first-party documentation generated from the explicit public source allowlist with the canonical JSON Schema namespace. It is intentionally `single-current`: it represents the reviewed source revisions recorded in its build provenance and does not claim a version-history UI.

## Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Default English unified reference entry. |
| `/en/` | English reference route. |
| `/zh-CN/` | Chinese reference route. |
| `/source-linkage/` | Public source-linkage panel and structured open-request payload. |
| `/schemas/` | Existing canonical schema catalog and schema URLs. |
| `/reference-build.json` | Sanitized source repository, ref and resolved-SHA provenance. |
| `/reference-pages.json` | Static route, locale, schema and privacy manifest. |

The `/schemas/` namespace is copied byte-for-byte from the generated schema distribution. Existing canonical `$id` URLs and unversioned retrieval aliases remain valid.

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

After deployment, `reference:pages:online` checks the four public routes, the sanitized provenance manifests, the catalog, every canonical schema URL and each package-style schema alias.
