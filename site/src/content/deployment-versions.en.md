---
title: "Builds and version retention"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# Builds and version retention

Build into a dedicated staging directory. Review content, locales, source policy and manifests before publishing a complete site artifact. Retain source revisions, generator/theme identities, files and digests without exposing temporary paths or credentials.

Normal publication builds current technical references through the core repository's reference:build, reference:pages and matching checks, then builds and composes the complete website. The main root serves the Chinese product homepage, and root versions.json uses `hia-site-version-index@2.0.0`. The compatibility site's [original technical index](https://mandolin.github.io/HIA-Documentation-Legacy/versions.json) retains its original identity. Resolve its relative paths against that index response URL. The main site's current/ and releases/ technical deep links remain available.

Normal composition verifies current references and the selected compatibility snapshot against their own provenance, indices and digests. See [Website builds and restoration](https://github.com/mandolin/HIA-Documentation/blob/main/site/README.md) for complete commands, target-revision checks and restoration of successful artifacts.

Keep the latest stable documentation and one final edition for each older major. Use the brand-adjacent selector with a history page, exact versions and maintenance status. Show an empty history when no archive exists. Package and artifact-contract versions are separate from system documentation versions.

Preserve language and topic where possible. Missing pages, translations or anchors need explicit feedback and directory/return links rather than a silent jump to latest. Bind archived prose, code references and assets together.

Incremental file writing and bounded excerpts reduce peak output retention, but inputs and indexes still grow with project size. On budget failures, reduce excerpts, split builds or narrow publication scope without expanding source authority. Roll back to a retained, identified site artifact and recheck routes, locales, versions and machine projections.

## Authoritative references

The linked technical references retain their actual languages; this English guide does not imply that every linked reference is translated.

- [docs/project-build-memory.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/project-build-memory.md)
- [docs/public-reference-build.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/public-reference-build.md)
- [docs/reference-operations.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/reference-operations.md)
- [docs/reference-pages.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/reference-pages.md)
- [docs/versioning.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/versioning.md)
