---
title: First steps
---
<!-- 中文：与中文版相同的输入、构建和精度边界。 English: retains the same input, build, and precision boundaries as the Chinese article. -->

<p class="eyebrow">Get started</p>

# First steps

Build readable documentation from a public HIA document artifact.

<div class="notice warning"><strong>The first formal release is in preparation</strong><p>Source candidate versions do not establish a formal system release. Do not assume that 1.0.0 is published when installing for this example.</p></div>

<h2 id="input">1. Prepare input</h2>

Learning material supports tasks, references define precise rules, development documentation explains extension and maintenance, and code documentation presents generated APIs and sources. Existing document artifacts can bypass extraction.

The main checkout uses Node.js 22.23.4 or 24.22.1 and pnpm 10.34.4. Other packages retain their own engines. Follow the [repository instructions](https://github.com/mandolin/HIA-Documentation#readme) to install locked dependencies and build. Verify exact archive versions, dependencies, and runtimes before use.

<h2 id="build">2. Build documentation</h2>

Run this command from a built main checkout. It uses a public repository fixture and writes to a dedicated preview directory:

<div class="code-box"><div class="code-label"><span>Command · built main checkout</span><button class="copy js-only" data-copy>Copy</button></div><div class="code-scroll"><pre><code>node apps/cli/dist/index.js docs build --input fixtures/basic.hia.json --out dist/docs-preview --locale en</code></pre></div><span class="copy-status" aria-live="polite"></span></div>

If the compiled CLI is absent, build first. Resolve missing inputs against the working directory. Follow the [migration reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-v1-migration.md) for incompatible contracts and retain diagnostics; changing a version string is not migration.

<h2 id="read">3. Read and check</h2>

Open index.html and inspect the signature, description, parameters, and returns. Repeat with locale zh-CN to inspect actual localized fields. A successful build does not establish verified source positions. Review public inputs for private paths, credentials, and internal comments.

<h2 id="next">Next steps</h2>

For source projects, choose a [domain workflow](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-producers.md). For multiple inputs, read the [configuration reference](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md). Multipage output uses a project manifest; direct single-artifact input remains single-page.

[Runtime compatibility](https://github.com/mandolin/HIA-Documentation/blob/main/docs/compatibility-matrix.md) · [Package candidates and archives](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-candidates.md)
