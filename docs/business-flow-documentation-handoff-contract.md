# Business Flow Documentation Handoff Contract

## 中文说明

`business-flow-documentation-handoff@0.1.0-draft` 是一个与目标项目无关的 owner-review 交付 envelope，由 `@hia-doc/cli`
负责。它只接受 exact-valid、完整 public 的 `business-flow-documentation-projection@0.1.0-draft`，不读取源码、目标仓、运行时
trace 或网络，也不从代码自动推断业务事实。

ready packet 嵌入一份 projection，并记录 contract/version、`application/json` media type、UTF-8 byte length、SHA-256 与
`business-flow-projection-stable-json-v1` serialization。consumer 必须重新验证 projection 并重算完整性；refused packet 不包含
partial projection、digest、summary 或 flow count。

`ready-for-owner-review` 只表示 packet 已准备好供 owner 复核。`ownerInput`、`consent` 与 `adoption` 分别固定为
`not-recorded`、`not-recorded` 与 `not-asserted`。真实 owner 输入、目标验收和采用不属于本 contract。

CLI 可通过以下命令创建 packet：

```bash
hia docs business-flow-handoff --projection business-flow-projection.json --out business-flow-handoff.json
```

显式启用 Portal information architecture 的项目构建，可通过 `--business-flow-handoff` 消费 exact ready packet。CLI 只把其中的
projection 传给 renderer；handoff review、diagnostics 与 integrity envelope 不进入 Portal。renderer 将完整 projection 放入
`project-index.json`，并在 renderer manifest 中只记录 body-free contract/version/path/count 引用。本轮不新增流程 HTML、图布局或
交互，最终可见表示仍需独立、经维护者确认的设计基线。

## English Overview

`business-flow-documentation-handoff@0.1.0-draft` is a target-agnostic owner-review envelope owned by `@hia-doc/cli`.
It embeds one exact, wholly public business-flow projection and records a deterministic SHA-256 descriptor. A ready status means
only that the packet is ready for owner review; it does not claim owner input, consent, target acceptance, or adoption.

The command and project-build consumer accept only caller-explicit safe-relative files. They do not discover targets, read source
bodies, execute expressions or target commands, access a network, or publish packages. Exact draft matching, closed-world fields,
projection validation, digest verification, privacy, and deny-all permission facts fail closed.

The owner-local Draft 2020-12 schema is exported as `BUSINESS_FLOW_DOCUMENTATION_HANDOFF_JSON_SCHEMA`. Its `$id` is an identity,
not a promise that this owner-local schema is distributed at that URL. The schema references the separately distributed W-P122
projection schema instead of copying renderer or target-private structures.
