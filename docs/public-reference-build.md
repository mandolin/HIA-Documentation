# Public Reference Build

The public reference build assembles first-party HIA documentation artifacts from an explicit source allowlist. The build command produces a checked artifact; Pages deployment is a separate workflow step. Private workspace materials are excluded.

## Source Boundary

The canonical definition is [`reference/public-reference-build.definition.json`](../reference/public-reference-build.definition.json). It requires the `main-repo` checkout and these eight selected repositories:

- `mandolin/hia-jsdoc`
- `mandolin/hia-htmdoc`
- `mandolin/hia-cssdoc`
- `mandolin/hia-sassdoc`
- `mandolin/hia-pugdoc`
- `mandolin/hia-tsdoc`
- `mandolin/hia-vuedoc`
- `mandolin/hia-dotnetdoc`

Remote automation checks out the eight satellites into `reference/sources/` with the read-only `HIA Reference Builder` GitHub App token. The token is used only by checkout actions with `persist-credentials: false`; the builder receives no credential environment variable.

The JSDoc umbrella retains the reviewed `main` ref; its resolved commit is recorded in each build. Its existing `owner-sources.json` requires `mandolin/jsdoc-plugin-hia-sys` at `15970dc9da0f8e120677eab7eba3e959dcf42a34` and `mandolin/jsdoc-theme-hia` at `0df2ca9bbf40e159d8da69aac80b3c31136b1a05`. Both workflows check out those sibling owners and run `npm run prepare:owners` in the umbrella before `npm ci`. That helper verifies exact Git origins/commits and archive SHA/SRI against the unchanged lock; it does not replace missing source candidates with older registry packages.

Installation iterates the definition's eight `workspace: source` records. The two archive owners are build dependencies rather than extra source producers or entries in the reference provenance inventory. When the umbrella changes its owner declarations, update both workflows to the newly declared exact owner commits and verify archive identities. The preparation helper rejects mismatching checkouts. Local checkouts need the same preparation before building; no owner manifest or lock rewrite is required.

## First-party .NET sample

中文。公开构建需要稳定 .NET 10 SDK。正常 `reference:build` 入口先对本仓的 `reference/samples/dotnet/HiaDocumentationSample.csproj` 执行 Release 编译，生成 XML 后交给现有 DotNetDoc 生产器，并用同一工程取得 C# 声明来源。首次编译包含还原并写入样本 bin/obj，失败时阻断后续构建；来源快照记录主仓及 DotNetDoc 各自提交。

English. A stable .NET 10 SDK is required. The normal `reference:build` entry first builds this repository's `reference/samples/dotnet/HiaDocumentationSample.csproj` in Release mode, then passes its generated XML to the existing DotNetDoc producer with the same project binding for C# origins. Initial compilation includes restore and writes sample bin/obj. Compilation failure stops the subsequent build, and provenance records the main and DotNetDoc repository commits separately.

中文。生产器只列该编译 XML 输入。`Envelope<T>` 和 `FormatLabel(string label)` 两个条目保留摘要、类型参数、备注、参数、返回及异常共七个独立双语字段；来源指向 `Envelope.cs`。类型和方法的关键 ID、签名、语言字段及 C# 路径均纳入上传前检查。领域样本与工具包 API 覆盖分别管理。

English. The producer lists only this compiled XML input. Its two entries, `Envelope<T>` and `FormatLabel(string label)`, retain seven independently localized fields spanning summaries, a type parameter, remarks, a parameter, return, and exception. Source locations point to `Envelope.cs`. Pre-upload checks require canonical IDs, signatures, localized fields, and C# paths. Domain sample coverage is tracked separately from tool-package API coverage.

See the [sample instructions](../reference/samples/dotnet/README.md) for standalone extraction and split-site rendering. The shared reference build retains its existing rendering and source-publication configuration.

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
