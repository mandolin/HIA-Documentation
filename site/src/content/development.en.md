---
title: "Extending and maintaining HIA"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Developer documentation</p>

# Extending and maintaining HIA

## Responsibilities

The core model and protocol provide shared semantics. Domain parsers and adapters interpret their own inputs, producers own explicit extraction and artifacts, and renderers organize reading output. The core does not depend on a particular JSDoc theme. Language servers, VS Code and other hosts consume capabilities within their own boundaries; a successful build is not host-interaction acceptance.

Develop in the repository that owns the component, using its lockfile and package-manager instructions. Do not introduce cross-repository dependency management at the workspace-container root. Keep source candidates, release materials and final archives distinct.

## Software development kit

A producer declares input/output kinds, identity, versions and capabilities. The software development kit validates definitions, requests and results; it does not provide discovery, timeouts, transactions, sandboxing or rollback. Execution requires host authority. A capability declaration does not establish working watch or incremental support.

## Provenance and semantics

Adapters preserve domain fields, localization, diagnostics and provenance rather than reducing full documentation to summaries. Generated one-to-many nodes retain semantic continuity and mappings. Public interfaces and non-obvious workflows need ecosystem-recognizable bilingual documentation.

## Documentation and verification

Use supported theme/output options when extending renderers without changing content or authority. Shared assets have one explicit writer. Earlier writes are not automatically rolled back on failure; stage outputs. Follow the owning repository's license, dependency-audit and test guidance, and report sensitive issues privately.

## Authoritative references

The linked technical references retain their actual languages; this English guide does not imply that every linked reference is translated.

- [hia-dotnetdoc/packages/dotnetdoc-producer/README.md](https://github.com/mandolin/hia-dotnetdoc/blob/main/packages/dotnetdoc-producer/README.md)
- [docs/adapter-authoring-notes.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/adapter-authoring-notes.md)
- [docs/ci.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ci.md)
- [docs/default-theme-api.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/default-theme-api.md)
- [docs/dependency-license-audit.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/dependency-license-audit.md)
- [docs/documentation-producers.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/documentation-producers.md)
- [docs/ide-integration-boundary.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ide-integration-boundary.md)
- [docs/ide-usage.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/ide-usage.md)
- [docs/package-candidates.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/package-candidates.md)
- [docs/release-governance.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/release-governance.md)
- [docs/security-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/security-policy.md)
- [docs/shared-theme-assets.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/shared-theme-assets.md)
- [docs/user-acceptance-checklist.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/user-acceptance-checklist.md)
- [packages/core/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/core/README.md)
- [packages/plugin-sdk/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/plugin-sdk/README.md)
- [packages/renderer-html/README.md](https://github.com/mandolin/HIA-Documentation/blob/main/packages/renderer-html/README.md)
- [README.md](https://github.com/mandolin/HIA-Documentation/blob/main/README.md)
