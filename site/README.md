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

The generated inventory contains twelve pages: overview, features, documentation entry, first steps, versions, and a static directory in both languages. Language links retain the current topic. Reference and API links currently point to the existing public documentation; this preview does not claim complete package-reference integration.

The system is labelled **1.0.0 preview**, not a formal release. No historical major release is invented. Main documentation will track the latest stable release; each older major will retain its final edition.

Ordinary links, mobile navigation and directories work without JavaScript. Search enhancement filters page titles in the current language only; it does not provide full-text or API search. Reading settings affect the current page without cookies or local storage. Scripts do not fetch or execute source files. Support is provided through the [public issue tracker](https://github.com/mandolin/HIA-Documentation/issues).

## Assets and licenses

Astro 7.4.5 is a MIT build dependency. Image optimization is disabled and its optional Sharp/native image dependencies are excluded in the workspace configuration. The website uses a code-native logo, local styles, and system fonts, with no external font, analytics, or image services. See the [dependency audit](../docs/dependency-license-audit.md).

## Source organization

- `src/lib/routes.mjs`: explicit topic/locale routes and shared labels.
- `src/layouts/` and `src/components/`: shared shell and product/document layouts.
- `src/content/`: reviewed bilingual Markdown.
- `src/scripts/`: page-local progressive enhancement.
- `src/styles/` and `public/`: local website assets.

Run `pnpm site:test` for boundary regression checks. The artifact checker rejects missing pages, broken internal references, incorrect locales, source maps, and private-path representations while allowing the public product name. The composed production artifact and deployment require their own checks.


## Site index and reference composition

An offline composed candidate combines this website with the existing reference artifact, retains a complete `legacy-reference/` namespace, and emits the distinct `hia-site-version-index@1.0.0` root index. See [the index and migration guide](../docs/site-version-index.md). `pnpm site:compose` and `pnpm site:compose:check` do not deploy or change the existing reference build workflow.
