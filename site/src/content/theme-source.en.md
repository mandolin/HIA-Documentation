---
title: "Branding and source reading"
---
<!-- 中文：已审定手册的公开语言版本，权威定义仍由对应维护包负责。 English: public locale edition of the reviewed manual; owning packages retain authoritative definitions. -->

<p class="eyebrow">Documentation</p>

# Branding and source reading

Configure branding through docs.theme.colors; HIA-Documentation-Sys uses cobalt #0047AB. Supported tokens accept hexadecimal colors, not arbitrary CSS, var() or url(). Skin, color scheme and color overrides are separate. Changing presentation does not change API content or source authority.

For shared assets, run theme-assets once at the site root and configure each child build with external assets. baseUrl is relative to that build's output root. A URL does not authorize writes to a parent directory. Keep the writer and all child builds on the same theme configuration. Default local mode still emits assets per build.

Check the actual light/dark palettes, contrast and forced-color presentation after overriding colors.

Definition locators, maps and public excerpts provide different evidence. Distinguish absent source, denied access, mismatched bytes, unverified coordinates and failed reads. An XML locator is not an inferred C# location, and a numeric ordinary-map anchor does not establish cross-map character equality.

Publish only authorized sources tied to the actual revision, digest and range policy. Preserve document reading when source access is unavailable; do not restore filtered external links. Display source as text without execution. Script-free pages use same-origin source pages and line anchors.

## Configuration and command examples

These shared examples use the same configuration identities, inputs and commands as the Chinese guide. Run them only after preparing the matching tools and inputs.

~~~json
{"schemaVersion":"0.1.0","docs":{"theme":{"colors":{"accent":"#0047AB"},"assets":{"mode":"external","baseUrl":"../../assets/"}}}}
~~~

~~~sh
hia docs theme-assets --config hia.config.json --out site
hia docs build --config hia.config.json --project-manifest hia-project.json --out site/api/zh-CN --locale zh-CN
~~~

## Authoritative references

The linked technical references retain their actual languages; this English guide does not imply that every linked reference is translated.

- [docs/configuration.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/configuration.md)
- [docs/default-theme-api.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/default-theme-api.md)
- [docs/doc-source-map-query.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/doc-source-map-query.md)
- [docs/presentation-source-plan.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/presentation-source-plan.md)
- [docs/security-policy.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/security-policy.md)
- [docs/shared-theme-assets.md](https://github.com/mandolin/HIA-Documentation/blob/main/docs/shared-theme-assets.md)
