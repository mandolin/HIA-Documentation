# Website version index

The product website and documentation use `hia-site-version-index@1.0.0`. It is separate from the retained `hia-reference-version-index@0.1.0-draft` technical-reference index. A site index version is not the product's release version.

The new identity is currently implemented in an **offline composition candidate**. Production root replacement is a separate deployment step. Existing reference build and deployment commands keep their original behavior until that coordinated change is applied.

## New index

The composed root `versions.json` contains:

- `$schema`, `contract`, `contractVersion`: exact schema and reader identity.
- `basePath`: `/HIA-Documentation/`; `defaultLocale`: `zh-CN`.
- `website`: the Chinese product root and explicit English `site/en/` entry.
- `documentation`: current documentation, its `preview` or `stable` state, and final archived editions of older majors.
- `legacyReference`: the unchanged reference contract and its independent `legacy-reference/versions.json` location.

The [JSON Schema](../site/contracts/site-version-index-1.0.0.schema.json) describes the structural format. The [semantic reader](../site/src/lib/version-index.mjs) also checks that archive majors are older and unique and that paths match their versions and locales. A documentation version uses a plain three-component semantic version of at most 64 characters. `preview` is explicit; a checked-in package version does not establish system publication.

Current documentation lives at `docs/{locale}/`. Each older major may retain only one final edition at `docs/archive/v{major}/{locale}/`. There are currently **no historical archives**. An archive may lack a translation, but the reader returns `missing-locale` rather than silently selecting current documentation. An unknown version returns `missing-version`.

Only canonical relative paths are accepted. Queries, fragments, URI encoding, absolute paths, traversal and undeclared languages are rejected. JSON readers reject unknown identities. Error messages do not include rejected input values.

## Legacy compatibility

The old reference index retains its exact JSON bytes and `compatibilityAliases.root = current` semantics inside `legacy-reference/`, with the complete reference artifact copied beneath that namespace. Old non-root reference URLs remain available with their bytes preserved. Only the site root page and root `versions.json` are intentionally replaced in the composed candidate.

Consumers of the old root index must change their base to `legacy-reference/` and continue using the old reader. This also supplies the correct root context for other legacy manifests and root-relative navigation. Do not reinterpret the old default locale, reference release snapshots or root alias as product-site metadata. New consumers must verify the new contract/version before reading its fields; old readers deliberately reject it.

## Offline composition

From the repository root, build and check the standalone website and validate the existing reference artifact with its original gates. Then run:

~~~sh
pnpm site:build
pnpm site:test
pnpm site:compose --reference dist/reference-pages
pnpm site:compose:check
node scripts/check-reference-pages.mjs --out dist/official-site-preview/legacy-reference --schemas dist/schema-pages
~~~

Inputs and outputs must stay inside `dist/` in the owning repository. The assembler writes `dist/official-site-preview/` and never edits its inputs or deploys. It rejects collisions with preserved reference routes. Writes occur in a new staging directory; replacement retains the previous complete output in an adjacent `.previous-*` directory. Privacy or budget failures leave the selected output unchanged. Failed staging directories remain under ignored `dist/` for diagnosis.

Default budgets are 1 GiB total, 100,000 files, and 32 MiB per file, checked before buffer allocation. Programmatic callers may tighten these limits; increasing the supported bounds requires a separate review. The public composition report uses a draft report format, not a new stable HIA document contract. It records copied-file digests, namespaces and preservation counts without installation paths. Verification recomputes actual hashes and checks actual indexed content; a passing flag in a manifest is insufficient.

The new checker permits the public product name while rejecting actual local-path representations. It retains the legacy source authority and privacy policy: composing public artifacts never grants permission to publish arbitrary source files. A production cutover must validate all consumers and route aliases, record artifact size and support restoring the previous complete deployment.
