# HIA Reference Pages

The HIA public reference is published as one GitHub Pages artifact at:

```text
https://mandolin.github.io/HIA-Documentation/
```

The site combines first-party documentation generated from the explicit public source allowlist with the canonical JSON Schema namespace. It keeps compatibility routes at the site root and also exposes a first versioned layout through `current/` and `releases/`.

The artifact also includes generated public portal pages for ecosystem discovery, adoption guidance, operations status, IDE/DevTools host anchors and public documentation navigation. These pages are assembled from reviewed public metadata before the final Pages artifact is written.

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
| `/en/packages/` | English ecosystem package matrix. |
| `/en/doc-lines/` | English documentation line index. |
| `/en/adoption/` | English adoption cases and recipes. |
| `/en/adoption/recipes/<recipe>.html` | English adoption recipe page with a public quickstart link when available. |
| `/en/operations/` | English operations status, monitor and versioning overview. |
| `/en/hosts/` | English IDE/DevTools host anchor overview. |
| `/en/hosts/source-linkage.html` | English source-linkage and relation graph concept page. |
| `/en/hosts/ide-devtools.html` | English host surface matrix for LSP, VS Code, browser panel, DevTools and multi-IDE boundaries. |
| `/en/hosts/evidence.html` | English host evidence matrix for artifact contracts, supported flows and explicit non-claims. |
| `/en/hosts/ai-assisted-authoring.html` | English AI-assisted documentation authoring workflow candidate. |
| `/en/feedback/` | English public-safe feedback overview. |
| `/en/feedback/compatibility.html` | English compatibility notes for maturity, versions, privacy and host claims. |
| `/en/feedback/templates.html` | English issue-template guidance for public-safe portal and compatibility reports. |
| `/en/feedback/d4-candidates.html` | English D4 external-adoption candidate backlog. |
| `/en/docs/` | English public documentation navigation categories. |
| `/en/docs/reference/<document>.html` | English public documentation detail page rendered from the safe Markdown subset. |
| `/en/search/` | English public portal search preview. |
| `/en/search/feedback.html` | English feedback search partition. |
| `/zh-CN/packages/` | Chinese ecosystem package matrix. |
| `/zh-CN/doc-lines/` | Chinese documentation line index. |
| `/zh-CN/adoption/` | Chinese adoption cases and recipes. |
| `/zh-CN/adoption/recipes/<recipe>.html` | Chinese adoption recipe page with a public quickstart link when available. |
| `/zh-CN/operations/` | Chinese operations status, monitor and versioning overview. |
| `/zh-CN/hosts/` | Chinese IDE/DevTools host anchor overview. |
| `/zh-CN/hosts/source-linkage.html` | Chinese source-linkage and relation graph concept page. |
| `/zh-CN/hosts/ide-devtools.html` | Chinese host surface matrix for LSP, VS Code, browser panel, DevTools and multi-IDE boundaries. |
| `/zh-CN/hosts/evidence.html` | Chinese host evidence matrix for artifact contracts, supported flows and explicit non-claims. |
| `/zh-CN/hosts/ai-assisted-authoring.html` | Chinese AI-assisted documentation authoring workflow candidate. |
| `/zh-CN/feedback/` | Chinese public-safe feedback overview. |
| `/zh-CN/feedback/compatibility.html` | Chinese compatibility notes for maturity, versions, privacy and host claims. |
| `/zh-CN/feedback/templates.html` | Chinese issue-template guidance for public-safe portal and compatibility reports. |
| `/zh-CN/feedback/d4-candidates.html` | Chinese D4 external-adoption candidate backlog. |
| `/zh-CN/docs/` | Chinese public documentation navigation categories. |
| `/zh-CN/docs/reference/<document>.html` | Chinese public documentation detail page rendered from the safe Markdown subset. |
| `/zh-CN/search/` | Chinese public portal search preview. |
| `/zh-CN/search/feedback.html` | Chinese feedback search partition. |
| `/reference-build.json` | Sanitized source repository, ref and resolved-SHA provenance. |
| `/public-portal-pages.json` | Sanitized generated portal page manifest. |
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
mise exec -- pnpm run reference:portal:data:check
mise exec -- pnpm run reference:portal:check
mise exec -- pnpm run reference:pages
mise exec -- pnpm run reference:pages:check
```

`reference:pages` regenerates the public portal pages before assembling the final artifact. `reference:pages:check` rejects missing routes, incomplete provenance, altered schema files, broken public portal links, unsafe rendered documentation HTML, hidden producer intermediates, embedded source content, private workspace markers and local absolute paths.

## Publication Security

The `schema-pages.yml` workflow is the only workflow that deploys this Pages site. Its build job receives only `contents: read` and uses the read-only HIA Reference Builder GitHub App token only while checking out the seven allowlisted satellites. The deploy job does not check out satellites or access the App token; it receives only the GitHub Pages deployment permissions required by `actions/deploy-pages`.

After deployment, `reference:pages:online` checks the public routes, generated portal routes, the version index when present, the sanitized provenance manifests, the catalog, every canonical schema URL and each package-style schema alias. Use `node scripts/check-reference-pages-online.mjs --report-only` when comparing an older deployment before a refreshed artifact is live. `reference:ops:check` adds publication age, source freshness and operational failure classification.
