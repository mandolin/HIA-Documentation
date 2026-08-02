# Target-Owner Adoption Kit Contract

`target-owner-adoption-kit@0.1.0-draft` 是 `@hia-doc/cli` 持有的 owner-operated 组合与 review contract。它把已经存在的 target acceptance、enterprise continuity、owner-provided evidence、workspace handoff 与 Portal IA 引用装配成一个可复用产物；它不是新的 target execution protocol，也不替代这些上游 contract 的 owner。

## 支持范围

首个 draft 只支持两个 family：

- `enterprise-business`：组合 `hia-generated-docs-evidence-summary`、`target-documentation-acceptance`、`target-documentation-continuity`、owner evidence packet 与 owner handoff/report packet；
- `workspace-container`：组合 workspace handoff、generated evidence、target acceptance、Portal IA 与 owner evidence packet，并可附带 repository-owner / handoff-edge 的 count-only summary。

所有 contract reference 都必须 exact-match `0.1.0-draft`。kit 不复制 continuity 的 baseline/current 比较规则，也不复制 workspace handoff 的 owner/edge schema；它只检查 owner 是否提供了所选 family 要求的完整引用集合。

## Request 与状态

CLI 用法：

```bash
hia docs adoption-kit --request adoption-request.json --out owner-adoption-kit.json
```

`--request` 与可选 `--out` 必须是 caller cwd 下的 safe-relative path。command 不发现 target repository，不扫描相邻目录，也没有 target-local 默认输出。

状态固定为：

- `ready-for-owner-review`：caller 声明 owner input 已提交，review consent、owner attestation、decision、redaction attestation、exact contract refs 和适用的 handoff counts 均通过；
- `deferred-owner-input-missing`：尚未收到 owner input；这是可审计的正常结果，CLI 返回成功但不会推导 adoption；
- `refused`：request、contract ref、已提交的 owner attestation、handoff、privacy 或 permission 任一边界无效。

`ready-for-owner-review` 只说明可进入 owner review。它不表示 target 已采用、目标命令已经运行、目标仓库已修改或 owner 已授权其它动作。

## Semantics

以下维度保持独立：

- resolution：`owner-input-validated`、`owner-input-not-received` 或 `unresolved`；
- confidence：固定为 `caller-provided-unverified`；
- provenance：固定为 `metadata-only-owner-kit`；
- consent：`not-recorded` 或 `recorded-for-review`；
- adoption：固定为 `not-asserted`。

工具只能验证 request 的结构与自述事实，不能把 caller attestation 提升为 HIA 独立验证。

## Privacy 与权限

Request 必须显式声明不包含 source、artifact、evidence、command output body、absolute/private path、credential 或 working state，且 `sourcesContentPolicy` 为 `none`。Report 只序列化稳定 public identity、固定 contract refs、boolean/count、固定 diagnostics 与独立 semantics。

以下权限始终为 false：target repository read/write、target command、target runtime、branch/PR、network、package publish 与 target adoption claim。任何把这些事实设为 true 的 request 都 fail closed。

## Portal linkage

每份 report 内含 `portalSummary`。它删除 target id、trial id、owner identity、完整 diagnostics 与 required ref names，只保留：

- family 与 ready/deferred/refused 状态；
- owner input submitted / review consent；
- required/provided/missing contract counts；
- workspace family 可选的 owner/edge counts；
- resolution/confidence/provenance。

`@hia-doc/renderer-html` 只在显式 `documentation-portal-information-architecture@0.1.0-draft` 下接受该投影。CLI project build 可通过 `--adoption-kit <safe-relative-report>` 读取 exact、non-refused report，并且只把 `portalSummary` 交给 renderer；完整 report 不进入 `project-index.json` 或 HTML。

## Schema、版本与兼容性

`@hia-doc/cli` 导出 contract/version/family/decision/diagnostic 常量、pure `createTargetOwnerAdoptionKit()`、runtime `isTargetOwnerAdoptionKitReport()`、`TargetOwnerAdoptionPortalSummary` 与 Draft 2020-12 `TARGET_OWNER_ADOPTION_KIT_JSON_SCHEMA`。

- consumer 必须 exact-match 当前 draft；future draft fail closed；
- unknown field、family、decision、permission 或 semantics 需要新 contract version；
- 字段顺序不属于语义，但 required refs、diagnostics 与输出必须 deterministic；
- schema `$id` 当前只是 owner-local identity，不表示在线 schema distribution；
- package distribution、owner consent、Portal presentation 与 target adoption 是独立状态，不能互相推导。
