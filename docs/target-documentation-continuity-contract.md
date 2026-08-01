# 目标文档连续性契约

`target-documentation-continuity@0.1.0-draft` 是由 `@hia-doc/cli` 持有的中性、metadata-only 比较契约。它把两份已经生成的 `hia-generated-docs-evidence-summary@0.1.0-draft` 比较为一个可机器验证的连续性报告；它不读取目标项目源码、生成产物正文或工作区状态，也不执行目标项目命令。

English summary: `target-documentation-continuity@0.1.0-draft` is a neutral, CLI-owned, metadata-only comparison contract. It compares two existing generated-documentation evidence summaries without discovering a target repository or reading source and artifact bodies.

## 适用边界

首个 draft 只接受 `enterprise-business` target family，并要求 caller 显式提供一个公开稳定的 target id。该范围限制是 contract 的兼容性边界，不表示其它 family 不需要连续性能力；其它 family 必须等对应 owner 完成输入验证后再扩展版本。

连续性报告可以说明“两份 evidence summary 满足本 draft 的连续性规则”，不能说明：

- 目标项目已经采用 HIA 文档流程；
- HIA 已经读取、运行或修改目标仓库；
- target branch、pull request、发布或联网动作已经发生；
- caller 提供的 evidence 已由独立主体背书。

## API 与 CLI

纯函数 API：

```ts
import { createTargetDocumentationContinuityReport } from "@hia-doc/cli";

const report = createTargetDocumentationContinuityReport({
  baseline,
  current,
  targetId: "sample-enterprise-project",
  targetFamily: "enterprise-business"
});
```

CLI：

```bash
hia docs continuity \
  --baseline evidence/baseline.json \
  --current evidence/current.json \
  --target-id sample-enterprise-project \
  --target-family enterprise-business \
  --out reports/continuity.json
```

不指定 `--out` 时，CLI 只向 stdout 输出 JSON。`--baseline`、`--current` 与可选 `--out` 必须是 caller cwd 下的 safe-relative path；baseline 与 current 不能是同一路径。CLI 不提供 target root、自动发现、递归扫描或隐式 target-local output。

## 输入规则

两侧输入都必须精确匹配当前 `hia-generated-docs-evidence-summary@0.1.0-draft` closed-world shape。未知顶层字段、未知关键嵌套字段和 future draft 均 fail closed。

比较器至少验证：

- `status` 两侧均为 `ready`；
- `indexHtml`、`manifest`、`projectIndex` 两侧均存在；
- entry `stableIds` 非空、唯一、语法稳定，且 `total` 与数组长度一致；
- current 不删除 baseline 中的稳定 entry identity；
- producer identity 唯一、状态全部为 `success`，且 artifact count 是非负整数；
- current 不删除 producer，聚合 artifact count 不下降；
- `sourcePresentation` 只允许 `none` 或 `link`，`sourcesContentPolicy` 必须为 `none`；
- 两侧均没有 embedded source、source body 或 absolute-path-like string；
- 输入不携带 source/artifact body、path、locator、credential、working state 或 target/network/publish/adoption action claim。

稳定 entry 与 producer identity 只在函数内用于集合差分。报告只保存 baseline/current/unchanged/added/removed count，不序列化这些 identity。

## 输出与三维语义

报告顶层字段固定为：

- `contract`、`contractVersion`、`status`；
- `target` 与不含 path/body 的 `input` contract refs；
- `continuity.entries`、`requiredOutputs`、`producers`、`privacy`；
- 相互独立的 `semantics.resolution`、`confidence`、`provenance`；
- deny-all `privacy` 与 `permissions` facts；
- 固定、不会反射 caller data 的 `diagnostics`。

accepted 报告使用：

- resolution：`evidence-summary-pair-validated`；
- confidence：`caller-provided-unverified`；
- provenance：`metadata-only-comparison`。

refused 报告的 resolution 为 `unresolved`，但 confidence 与 provenance 保持不变。这样，“解析规则得到什么”“对 caller evidence 有多大把握”“比较从哪里产生”不会被压缩为单一状态。

## 隐私与权限

每份报告都显式声明以下内容未被序列化：entry ids、producer ids、source body、artifact body、path 与 working state。

每份报告也显式拒绝以下权限或事实声明：target command、target repository write、target runtime、target branch/PR、target source/artifact body read、network、package publish 与 target adoption。

输入若包含对应的 true action/adoption claim，报告必须使用 `HIA_TARGET_CONTINUITY_PERMISSION_OR_ADOPTION_REFUSED` 拒绝；安全 shape 中也没有能够开启这些权限的字段。

## 诊断目录

| Code | 含义 |
| --- | --- |
| `HIA_TARGET_CONTINUITY_REQUEST_INVALID` | request key、target id 或 family 无效。 |
| `HIA_TARGET_CONTINUITY_EVIDENCE_CONTRACT_INVALID` | 输入 contract/version 不是精确支持版本。 |
| `HIA_TARGET_CONTINUITY_EVIDENCE_SHAPE_INVALID` | 输入不是当前 closed-world summary shape。 |
| `HIA_TARGET_CONTINUITY_EVIDENCE_NOT_READY` | 至少一侧 evidence 尚未 ready。 |
| `HIA_TARGET_CONTINUITY_STABLE_IDENTITY_INVALID` | entry identity 缺失、重复、语法无效或 total 不匹配。 |
| `HIA_TARGET_CONTINUITY_ENTRY_COVERAGE_REGRESSED` | current 删除了 baseline entry。 |
| `HIA_TARGET_CONTINUITY_REQUIRED_OUTPUT_REGRESSED` | 必要输出在任一侧缺失。 |
| `HIA_TARGET_CONTINUITY_PRODUCER_COMPATIBILITY_INVALID` | producer identity/status/artifact count 不兼容。 |
| `HIA_TARGET_CONTINUITY_PRODUCER_COVERAGE_REGRESSED` | producer 被删除或聚合 artifact count 下降。 |
| `HIA_TARGET_CONTINUITY_PRIVACY_REFUSED` | 输入越过 metadata-only privacy boundary。 |
| `HIA_TARGET_CONTINUITY_PERMISSION_OR_ADOPTION_REFUSED` | 输入声明了被禁止的动作、权限或 adoption。 |

## Schema、版本与兼容性

`@hia-doc/cli` 导出：

- `TARGET_DOCUMENTATION_CONTINUITY_JSON_SCHEMA`；
- `TARGET_DOCUMENTATION_CONTINUITY_SCHEMA_ID`；
- contract/version/family/diagnostic 常量；
- `isTargetDocumentationContinuityReport()` runtime guard。

Schema 使用 JSON Schema Draft 2020-12，所有 contract object 都是 closed world。当前 `$id` 只作为 schema identity，不承诺该 URL 已经在线分发，也不改变 `@hia-doc/schemas` 的发布目录。

兼容性规则如下：

- consumer 必须 exact-match `0.1.0-draft`；未知 future draft fail closed；
- 新增或重命名字段、family、permission、diagnostic semantics，需要新 contract version；
- 字段顺序不属于语义，但输出 key 与集合差分必须 deterministic；
- draft contract 不承诺 SemVer stable API；进入非 draft 版本前必须重新审查 privacy、version negotiation 与 distribution owner；
- schema identity、package distribution 与目标项目 adoption 是三个独立状态，不能互相推导。
