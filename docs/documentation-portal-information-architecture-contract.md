# Documentation Portal Information Architecture Contract

## 中文摘要

`documentation-portal-information-architecture@0.1.0-draft` 是统一文档站的中性信息架构 contract。它把内容分组、fragment 获取和 member 呈现拆成三个独立维度，并保持 entry identity、canonical route、search、relation 与 source linkage 稳定。

第一轮由 `@hia-doc/renderer-html` 持有 runtime contract 与 owner-local Draft 2020-12 schema；`@hia-doc/config`、`@hia-doc/cli`、`@hia-doc/theme-default` 分别负责配置/manifest 校验、显式投影和最小呈现。该 contract 不包含 renderer/theme 私有 DOM、语言 AST、source body 或目标项目状态。

## Identity

- contract: `documentation-portal-information-architecture`
- contractVersion: `0.1.0-draft`
- runtime export: `DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_*`
- owner-local schema export: `DOCUMENTATION_PORTAL_INFORMATION_ARCHITECTURE_JSON_SCHEMA`

Draft compatibility is exact-version only. Unknown contract identities, versions, enum values and direct-runtime extension fields fail closed.

## Configuration

```json
{
  "docs": {
    "renderer": {
      "projectLayout": "split-site",
      "uiLocale": "zh-CN",
      "informationArchitecture": {
        "contract": "documentation-portal-information-architecture",
        "contractVersion": "0.1.0-draft",
        "contentGrouping": "semantic-container",
        "loadingStrategy": "lazy",
        "memberPlacement": "with-parent"
      }
    }
  }
}
```

| Dimension | Values | Default | Meaning |
| --- | --- | --- | --- |
| `contentGrouping` | `entry`, `semantic-container` | `entry` | Logical presentation boundary; it does not choose acquisition timing. |
| `loadingStrategy` | `lazy`, `eager` | `lazy` | Navigation/fragment acquisition; it does not replace entry identity. |
| `memberPlacement` | `separate`, `with-parent` | `separate` | Member presentation location; canonical member fragments remain addressable. |

Omitting `informationArchitecture` preserves the previous P3 path. The first draft supports explicit IA only with `split-site`; explicit IA plus `single-page` produces `HIA_CONFIG_IA_SINGLE_PAGE_UNSUPPORTED`.

## Semantic Path

`project-manifest.inputs[].semanticPath` supplies an owner-reviewed, target-neutral prefix. Each segment has only `kind`, stable path-free `id`, and public `label`:

```json
{
  "semanticPath": [
    { "kind": "repository", "id": "main-repo", "label": "Main Repository" },
    { "kind": "package", "id": "renderer-html", "label": "@hia-doc/renderer-html" },
    { "kind": "layer", "id": "presentation", "label": "Presentation Layer" }
  ]
}
```

Allowed kinds are `repository`, `package`, `layer`, `contract`, `operation`, `project`, `assembly`, `namespace`, and `type`. The renderer never infers these values from source paths, package-manager layout, workspace containers, or absolute paths.

## Routing And Delivery

- `contentPath` remains the canonical per-entry fragment in all eight configurations.
- `presentationPath` is additive and may point to a semantic container or parent fragment.
- `memberAnchor` remains the stable entry id used after the presentation fragment loads.
- Lazy navigation emits node shards. Eager navigation embeds the full tree in the root shard and preloads presentation fragments through `content/eager.json`.
- Canonical entry fragments are always emitted, including `semantic-container` and `with-parent` modes.

## Topic Model

The applicability-aware order is fixed:

1. `summary`
2. `declaration`
3. `metadata`
4. `contract`
5. `coverage`
6. `provenance`
7. `members`
8. `relations`
9. `source`
10. `diagnostics`

Inheritance and implements relationships appear only in `relations`, not in the explicit IA containment tree. Optional `target-documentation-continuity@0.1.0-draft` linkage accepts only exact contract/status/count/semantics metadata; absence is rendered as unavailable and never inferred as success.

## Locale, Accessibility And Privacy

- `uiLocale`: first-slice touched-label catalog, exact `zh-CN` or `en`.
- content locale: existing project locale model.
- source-comment locale: `not-projected`.
- product version: metadata only; no version routing or selector.
- hierarchy interaction: native nested `<details>/<summary>`, Tab and native Enter/Space activation, visible focus, and active-ancestor styling.
- no `role=tree`, arrow-key model, typeahead model, or full WAI-ARIA tree claim.
- semantic path source is manifest metadata; continuity is metadata-only; source body and target-state read flags remain false.

The schema `$id` is an identity, not a statement that the file is already distributed at that URL. Package publication and target adoption require separate release/owner actions.
