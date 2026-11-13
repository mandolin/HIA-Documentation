# Website version index

The product website and documentation use `hia-site-version-index`. The site index version describes the format and deployment layout. The technical reference has its own index, `hia-reference-version-index@0.1.0-draft`.

The normal Pages workflow publishes the product website at the root using the 2.0.0 site index. It builds current reference deep links and verifies them independently from the separately pinned compatibility snapshot. Local composition commands also support offline verification.

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
pnpm site:compose --reference dist/reference-pages --legacy-reference dist/legacy-reference-pinned --legacy-mode sibling
pnpm site:compose:check --out dist/official-site-preview --legacy dist/legacy-reference-pinned --reference dist/reference-pages
node scripts/check-official-site-pairing.mjs dist/official-site-preview
~~~

Inputs and outputs must stay inside `dist/` in the owning repository. The assembler writes `dist/official-site-preview/` and never edits its inputs or deploys. It rejects collisions with preserved reference routes. Writes occur in a new staging directory; replacement retains the previous complete output in an adjacent `.previous-*` directory. Privacy or budget failures leave the selected output unchanged. Failed staging directories remain under ignored `dist/` for diagnosis.

Sibling composition budgets are 1,000,000,000 total bytes, 100,000 files, and 32 MiB per file. The total includes the generated inventory and site index. The existing embedded layout retains its 1 GiB default. Programmatic callers may tighten these limits. Before reading overlapping website files, the assembler checks their sizes and requires exact byte equality. Identical existing files retain their protected deep-link classification, while any changed content remains a collision.

Sibling output uses `hia-official-site-composition-report@0.3.0`. Its `fileTable` contains `directories`, `names`, `digests`, `kinds`, and `rows`. Each row stores directory index, filename index, original byte length, digest index, and ownership-kind index in that order. Expanding the table restores every original file record and its order. The reader rejects malformed dictionaries, invalid indices, unsafe or duplicate paths, unknown kinds, invalid digests and out-of-budget input. The formal checker then verifies every actual file byte and the existing privacy and provenance rules. It also retains exact reading of the original 0.1.0 and 0.2.0 object inventories.

In sibling mode the checker compares `--reference` with retained current routes. It verifies the original compatibility home page and index digests against `--legacy`, the sibling deployment's selected snapshot. If both inputs are the same, `--reference` may be omitted. The normal workflow pins its selection in `reference/legacy-reference.snapshot.json` and checks the actual live compatibility digests before upload. The default `embedded` mode retains the 1.0.0 site-index layout and 0.1.0 object report.

中文。分站模式采用0.3.0无损字典报告，并把清单、新索引与全部正文资源计入十进制十亿字节预算；原嵌入模式保留原预算。新读者恢复每条路径、长度、摘要及分类后继续逐原件复核，旧0.1/0.2报告按各自原格式读取。同字节官网深链只保留一次，内容差异继续拒绝。

The language-free `/docs/` entry serves the same complete Chinese page as `/docs/zh-CN/`. Links retain explicit locales, and the default entry also works with JavaScript disabled. 中文。无语言文档入口直接提供已确认的完整中文正文，中英文链接保留显式路径，无脚本也可阅读。

The new checker permits the public product name while rejecting actual local-path representations. It retains the legacy source authority and privacy policy: composing public artifacts never grants permission to publish arbitrary source files. A production cutover must validate all consumers and route aliases, record artifact size and support restoring the previous complete deployment.
