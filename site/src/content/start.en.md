---
title: First steps
---
<!-- 中文：与中文版相同的输入、构建和精度边界。 English: retains the same input, build, and precision boundaries as the Chinese article. -->

<p class="eyebrow">Get started</p>

# First steps

Build readable documentation from a public HIA document artifact.

<div class="notice"><strong>Applies to 1.0.0</strong><p>Confirm the stable version is available on npm before installing. Consult the migration reference when upgrading an existing project.</p></div>

<h2 id="input">1. Prepare input</h2>

Learning material supports tasks, references define precise rules, development documentation explains extension and maintenance, and code documentation presents generated APIs and sources. Existing document artifacts can bypass extraction.

The main checkout uses Node.js 22.23.4 or 24.22.1 and pnpm 10.34.4. Other packages retain their own engines. Follow the [repository instructions](https://github.com/mandolin/HIA-Documentation#readme) to install locked dependencies and build. Verify exact archive versions, dependencies, and runtimes before use.

In a new directory, install the stable command-line tool with `npm install --save-exact @hia-doc/cli@1.0.0`. Save the [public example artifact](https://github.com/mandolin/HIA-Documentation/blob/3b72ce3205fb07c534f5f9055398958a9661eef6/fixtures/basic.hia.json) as `basic.hia.json`. Use your own HIA artifact if you already have one.

<h2 id="build">2. Build documentation</h2>

Run this from the directory containing the installed CLI and example artifact:

<div class="code-box"><div class="code-label"><span>Command · installed CLI</span><button class="copy js-only" data-copy>Copy</button></div><div class="code-scroll"><pre><code>npm exec --offline -- hia docs build --input basic.hia.json --out dist/docs-preview --locale en</code></pre></div><span class="copy-status" aria-live="polite"></span></div>

Run `npm ls --depth=0 @hia-doc/cli` if the command is unavailable. For incompatible input contracts, follow the [migration reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-v1-migration.md) for incompatible contracts and retain diagnostics; changing a version string is not migration.

<h2 id="read">3. Read and check</h2>

Open index.html and inspect the signature, description, parameters, and returns. Repeat with locale zh-CN to inspect actual localized fields. A successful build does not establish verified source positions. Review public inputs for private paths, credentials, and internal comments.

<h2 id="next">Next steps</h2>

For source projects, choose a [domain workflow](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-producers.md). For multiple inputs, read the [configuration reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md). Multipage output uses a project manifest; direct single-artifact input remains single-page.

[Runtime compatibility](https://github.com/mandolin/HIA-Documentation/blob/main/docs/compatibility-matrix.md) · [Package candidates and archives](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-candidates.md)
