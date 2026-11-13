# Official website source

This directory builds the HIA-Documentation-Sys product website and its initial documentation entry pages. The website uses Astro, Markdown and custom templates with the HIA cobalt brand. It is maintained inside the core repository; it is not a separately published npm package.

## Build and preview

From the repository root, use Node.js 22.23.4 or 24.22.1 and pnpm 10.34.4:

~~~sh
pnpm install --frozen-lockfile
pnpm site:build
pnpm site:check
pnpm site:preview --host 127.0.0.1 --port 8851
~~~

Open [the local preview](http://127.0.0.1:8851/HIA-Documentation/). Output is written to `dist/official-web-preview/`. This command does not replace or deploy the existing reference site.

The deployment base is `/HIA-Documentation/`. The Chinese product homepage is at the site root, with English at `site/en/`. Product subpages use `site/{locale}/`; documentation entries use `docs/{locale}/`. History has a Chinese default at `docs/versions/` and an explicit English page at `docs/versions/en/`.

## Content and behavior

The static build emits `documentation-site-navigation.json` from the same routes and actual documentation-version data used by the manuals. Pass this file to a matching HIA CLI project build through `--site-navigation dist/official-web-preview/documentation-site-navigation.json`, with an explicit `docs.renderer.uiLocale`. The renderer generates branded navigation on complete API and source-view pages. Confirm that all target pages exist in the composed deployment before publication.

中文。官网静态构建同时输出独立导航JSON，复用手册的路由与真实文档版本，供配套HIA CLI项目构建读取。该输入不包含源码授权，官网手册与生成代码页的完整离线装配和正式部署需要分别验收。

The explicit inventory contains 28 pages in Chinese and English. Nine manuals per language cover first steps, four domain workflows, projects and locales, branding and source reading, builds and retention, reference usage, extension, generated-reference scope, and reading support. Technical definitions remain with their owning packages; linked references retain their actual languages. API entry pages link to actual HIA-generated artifacts and state their coverage rather than constructing handwritten API signatures.

The system is labelled **1.0.0 preview**, not a formal release. No historical major release is invented. Main documentation will track the latest stable release; each older major will retain its final edition.

Ordinary links, mobile navigation and directories work without JavaScript. Local search matches all whitespace-separated literal terms against nine current-language manual titles and bodies for the exact documentation version. Queries have a 500 UTF-16-unit limit; results are capped at 20. There is no semantic ranking, telemetry, storage, network request, generated-API indexing, or indexing of external references. A malformed embedded index shows an explicit failure with a static-directory recovery path, separately from no matches. The embedded index is limited to 500 entries, 100,000 UTF-16 units per body, and 1,000,000 units of JSON.

Language links retain the actual topic and, with scripts enabled, the original fragment. If a translated section has no matching anchor, the target page explains this and retains its outline. Without scripts, language links retain the topic and the ordinary page outline remains usable. Current-version links retain the topic; there are no fictional archives in the selector. The displayed version and the composed machine index use the same explicit `currentDocumentation` configuration.

Reading settings affect the current page without cookies or local storage. Scripts do not fetch or execute source files. Support is provided through the [public issue tracker](https://github.com/mandolin/HIA-Documentation/issues).

## Assets and licenses

Astro 7.4.5 is a MIT build dependency. Image optimization is disabled and its optional Sharp/native image dependencies are excluded in the workspace configuration. The website uses a code-native logo, local styles, and system fonts, with no external font, analytics, or image services. See the [dependency audit](../docs/dependency-license-audit.md).

## Source organization

- `src/lib/routes.mjs`: explicit topic/locale routes and shared labels.
- `src/lib/content.mjs`: build-time Markdown registry and body-search projection.
- `src/lib/search.mjs`: exact-partition index validation and bounded literal body search.
- `src/layouts/` and `src/components/`: shared shell and product/document layouts.
- `src/content/`: reviewed bilingual Markdown.
- `src/scripts/`: page-local progressive enhancement.
- `src/styles/` and `public/`: local website assets.

Run `pnpm site:test` for boundary regression checks. The artifact checker rejects missing pages, broken internal references, incorrect locales, source maps, and private-path representations while allowing the public product name. The composed production artifact and deployment require their own checks.


## Site index and reference composition

The normal Pages workflow composes the website at the root with freshly built reference deep links. Its `hia-site-version-index@2.0.0` index locates the separately published compatibility snapshot. The compatibility selection is pinned in `reference/legacy-reference.snapshot.json` and verified against the live compatibility site's root and index before upload. See [the index and migration guide](../docs/site-version-index.md).

For a sibling composition with independently selected reference inputs, run the following commands after building the website and validating both reference artifacts.

~~~sh
node scripts/compose-official-web.mjs --reference dist/reference-pages --legacy-reference dist/legacy-reference-pinned --legacy-mode sibling --out dist/official-site-current
node scripts/check-official-site.mjs --out dist/official-site-current --legacy dist/legacy-reference-pinned --reference dist/reference-pages
node scripts/check-official-site-pairing.mjs dist/official-site-current
~~~

The current reference input supplies retained deep links and source identity. The pinned compatibility input supplies compatibility root/index digests. Embedded composition retains its original 1.0.0 index behavior. Local composition commands write artifacts. The normal Pages workflow performs deployment.

## Restore a complete publication

The **Restore HIA Pages** workflow accepts `source-run-id` from a successful **HIA Reference Pages** run on this repository's `main` branch. Select a run whose `github-pages` artifact remains available. The normal publication retains these artifacts for seven days.

~~~sh
gh workflow run restore-pages.yml --repo mandolin/HIA-Documentation --ref main -f source-run-id=SUCCESSFUL_RUN_ID
~~~

Recovery verifies the selected repository, workflow, branch, source commit, platform ZIP digest, CRC, complete TAR paths and expansion budget. It uploads the original TAR unchanged and checks the restored site using its exact root-index identity. The `recovery-verification` artifact records the selected source and TAR digest. Normal and recovery deployments share a serialization group. To finish a rollback drill, restore the successful official-site run and verify its root, index, compatibility pairing and retained reference routes.

中文。正常发布分别核当前参考产物和固定兼容快照。恢复时选择本仓 main 的成功正常发布运行，校验完整工件并原样重传 TAR，随后按实际新旧根身份复核。演练结束后需恢复指定官网版本并再次验证线上来源。
