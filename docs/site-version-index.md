# Website version index

The product website and documentation use `hia-site-version-index`. The site index version describes the format and deployment layout. The technical reference has its own index, `hia-reference-version-index@0.1.0-draft`.

The new identity is currently implemented in an **offline composition candidate**. Production root replacement is a separate deployment step. Existing reference build and deployment commands keep their original behavior until that coordinated change is applied.

## New index

The composed root `versions.json` contains:

- `$schema`, `contract`, `contractVersion`: exact schema and reader identity.
- `basePath`: `/HIA-Documentation/`; `defaultLocale`: `zh-CN`.
- `website`: the Chinese product root and explicit English `site/en/` entry.
- `documentation`: current documentation, its `preview` or `stable` state, and final archived editions of older majors.
- `legacyReference`: the reference contract and a version-specific index location.

The JSON Schemas for [1.0.0](../site/contracts/site-version-index-1.0.0.schema.json) and [2.0.0](../site/contracts/site-version-index-2.0.0.schema.json) describe their structural formats. The [semantic reader](../site/src/lib/version-index.mjs) also checks that archive majors are older and unique and that paths match their versions and locales. A documentation version uses a plain three-component semantic version of at most 64 characters. `preview` records the current publication status explicitly.

Current documentation lives at `docs/{locale}/`. Each older major may retain only one final edition at `docs/archive/v{major}/{locale}/`. There are currently **no historical archives**. An archive may lack a translation, but the reader returns `missing-locale` rather than silently selecting current documentation. An unknown version returns `missing-version`.

Documentation paths are canonical relative paths. The 2.0.0 legacy locator is a fixed absolute path on the same host. Readers validate the schema identity and its exact locator together.

## Legacy compatibility

With 1.0.0, the complete reference artifact is copied under `legacy-reference/`. With 2.0.0, the original reference is served by the [legacy project site](https://mandolin.github.io/HIA-Documentation-Legacy/), and the main site candidate keeps the non-root reference routes. Both layouts retain the original legacy index bytes and `compatibilityAliases.root = current`. The composed candidate replaces the main site's root page and root `versions.json`.

After cutover, consumers of the old root index should resolve `legacyReference.index` against the new site index response URL, fetch the old index and parse it with the old reader. Then resolve its relative paths against the **old index response URL**. For 2.0.0, this starts at `/HIA-Documentation-Legacy/versions.json`. The old default locale and technical snapshots belong to the reference site.

## Offline composition

From the repository root, build and check the standalone website and validate the existing reference artifact with its original gates. Then run:

~~~sh
pnpm site:build
pnpm site:test
pnpm site:compose --reference dist/reference-pages --legacy-mode sibling
pnpm site:compose:check --out dist/official-site-preview --legacy dist/reference-pages
~~~

Inputs and outputs must stay inside `dist/` in the owning repository. The assembler writes `dist/official-site-preview/` and never edits its inputs or deploys. It rejects collisions with preserved reference routes. Writes occur in a new staging directory; replacement retains the previous complete output in an adjacent `.previous-*` directory. Privacy or budget failures leave the selected output unchanged. Failed staging directories remain under ignored `dist/` for diagnosis.

Default budgets are 1 GiB total, 100,000 files, and 32 MiB per file, checked before buffer allocation. Programmatic callers may tighten these limits. The composition report records copied-file digests and preservation counts. In sibling mode the checker compares the separate reference artifact with the preserved routes and verifies the original home page and index digests. Use the sibling deployment's selected snapshot as `--legacy` before cutover. The default `embedded` mode retains the 1.0.0 layout.

The new checker permits the public product name while rejecting actual local-path representations. It retains the legacy source authority and privacy policy: composing public artifacts never grants permission to publish arbitrary source files. A production cutover must validate all consumers and route aliases, record artifact size and support restoring the previous complete deployment.
