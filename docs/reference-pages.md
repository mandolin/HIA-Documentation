# HIA Reference Pages

The product website and documentation are published at:

```text
https://mandolin.github.io/HIA-Documentation/
```

The root serves the Simplified Chinese product website. English product pages and both documentation languages have explicit routes. Generated technical references, canonical JSON Schemas and retained deep links are included in the same Pages artifact. Larger API and resource partitions use separate project sites linked from the documentation directory.

The complete compatibility snapshot and its original machine index are available on the [legacy project site](https://mandolin.github.io/HIA-Documentation-Legacy/). The root machine index uses `hia-site-version-index@2.0.0` and locates that snapshot. See the [site index and migration guide](site-version-index.md).

中文说明。站点根已作为简体中文产品官网上线，文档主线为1.0.0预览，暂无历史大版本封版。旧参考索引在兼容站保持原身份，技术构建目录与系统文档封版分别管理。

## Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Simplified Chinese product website. |
| `/site/en/` | English product website. |
| `/site/<locale>/features/` | Product features and demonstration projects. |
| `/docs/` | Complete Simplified Chinese documentation entry, available without scripts. |
| `/docs/<locale>/` | Current documentation in `zh-CN` or `en`. |
| `/docs/<locale>/learn/start/`, `/docs/<locale>/reference/`, `/docs/<locale>/development/`, `/docs/<locale>/code/` | Learning, reference, development and generated-code directories under the selected documentation locale. |
| `/docs/versions/`, `/docs/versions/en/` | Chinese and English documentation version policy and actual archive inventory. |
| `/jsdoc/` | Actual standalone JSDoc output with native localized page names. |
| `/en/` | English reference route. |
| `/zh-CN/` | Chinese reference route. |
| `/source-linkage/` | Public source-linkage panel and structured open-request payload. |
| `/current/` | Current reference snapshot. |
| `/current/en/` | Current English reference route. |
| `/current/zh-CN/` | Current Chinese reference route. |
| `/current/source-linkage/` | Current source-linkage panel. |
| `/releases/0.1.0-draft/` | Retained technical reference route, regenerated with the reference build. |
| `/versions/` | Retained human-readable technical reference build index. |
| `/versions.json` | Product documentation index, `hia-site-version-index@2.0.0`. |
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

Main documentation follows the latest stable system version after the formal release. During release preparation it is explicitly labeled `1.0.0 preview`. There are currently no archived system major versions.

Each older major retains its final documentation edition at `docs/archive/v<major>/<locale>/` when an actual archive is published. The brand-adjacent dropdown is the primary switcher and the history page is the secondary entry. Language links retain the topic. Script-enabled switching carries the existing fragment, and a missing section produces an explicit notice on the target topic. Missing locales in version-index resolution return `missing-locale`, and unknown versions return `missing-version`.

| Path | Meaning |
| --- | --- |
| `/docs/<locale>/` | Current system documentation. |
| `/docs/archive/v<major>/<locale>/` | Reserved layout for actual final editions of older majors. No archive is currently published. |
| `/versions.json` | Current product documentation version index. |
| `/current/` | Latest generated technical reference build. |
| `/releases/0.1.0-draft/` | Retained rebuildable technical reference route. |
| `https://mandolin.github.io/HIA-Documentation-Legacy/versions.json` | Exact original `hia-reference-version-index@0.1.0-draft` with its original aliases and search partitions. |

Package versions, artifact contract versions and technical reference build directories have their own identities. `/schemas/` retains the canonical schema namespace. Readers of the original reference index use the compatibility site's index URL.

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

The `schema-pages.yml` workflow is the only workflow that deploys this Pages site. Its build job receives only `contents: read` and uses the read-only HIA Reference Builder GitHub App token only while checking out the eight allowlisted satellites. The deploy job does not check out satellites or access the App token; it receives only the GitHub Pages deployment permissions required by `actions/deploy-pages`.

After deployment, `reference:pages:online` checks the public routes, generated portal routes, the version index when present, the sanitized provenance manifests, the catalog, every canonical schema URL and each package-style schema alias. Use `node scripts/check-reference-pages-online.mjs --report-only` when comparing an older deployment before a refreshed artifact is live. `reference:ops:check` adds publication age, source freshness and operational failure classification.
