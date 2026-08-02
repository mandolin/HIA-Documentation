# Enterprise Baseline/Current Owner Workflow Contract

`enterprise-baseline-current-owner-workflow@0.1.0-draft` 是 `@hia-doc/cli` 持有的 owner-local 组合 contract。它把 `target-owner-adoption-kit@0.1.0-draft` 的 owner submission/consent/attestation 与 `target-documentation-continuity@0.1.0-draft` 的 baseline/current comparison 连接为一个可重复 workflow；它不是 target execution protocol，也不是 adoption 证明。

## 输入与状态

Pure API `createEnterpriseBaselineCurrentOwnerWorkflow()` 接受：

- 一个 exact `TargetOwnerAdoptionKitRequest`；
- 同时存在或同时缺省的 `baseline`、`current` public-safe `hia-generated-docs-evidence-summary@0.1.0-draft`。

CLI 用法：

```bash
hia docs enterprise-workflow \
  --adoption-request adoption-request.json \
  --baseline baseline-evidence.json \
  --current current-evidence.json \
  --out enterprise-owner-workflow.json
```

`--adoption-request`、可选 evidence pair 与可选 output 必须是 caller cwd 下互不相同的 safe-relative path。command 不接受 target root、source path、manifest、command、runtime handle 或 locator，也不发现相邻 repository。

状态固定为：

- `ready-for-owner-review`：adoption kit 为 ready，baseline/current pair 完整，continuity 为 accepted；
- `deferred-owner-input-missing`：owner input 未提交且 evidence pair 未提供；这是诚实、可审计的正常结果，CLI 返回 0；
- `refused`：request shape、enterprise family、owner/evidence state、adoption kit、continuity、privacy 或 permission 任一边界失败。

已提交 owner input 却不提供 evidence pair、未提交 owner input 却提供 pair、或只提供 pair 一侧，都是矛盾状态并 fail closed。

## Component 投影

Report 不嵌入 adoption request、adoption-kit report、continuity report 或两份 evidence summary。它只保存：

- adoption-kit contract/version/status、required/provided/missing contract counts 与三维 semantics；
- continuity 是否提供；若提供，仅保存 entry counts、required-output preservation、producer artifact counts/booleans、privacy continuity 与三维 semantics。

Entry/producer identity 只在 continuity evaluator 内存中用于 set comparison，不进入 workflow report。

## Semantics

Workflow 自身保持三个维度独立：

- resolution：`owner-input-and-evidence-validated`、`owner-input-not-received` 或 `unresolved`；
- confidence：固定为 `caller-provided-unverified`；
- provenance：固定为 `composed-owner-metadata-workflow`。

Consent 单独记录为 `not-recorded` 或 `recorded-for-review`；adoption 永远是 `not-asserted`。结构与 evidence pair 验证通过不能证明 caller attestation 的外部真实性，也不能推导目标项目采用。

## Privacy 与权限

Report 明示不序列化 adoption request body、baseline/current evidence、entry/producer identity、source/artifact body、path、credential 或 working state，且 `sourcesContentPolicy` 固定为 `none`。

以下权限始终为 false：owner contact、target repository read/write、target command/runtime、branch/PR、network、package publish 与 target adoption claim。CLI 的唯一 reads 是 caller 在命令行明示的 metadata JSON；只有显式 `--out` 会在 caller cwd 内写 report。

## Schema、版本与兼容性

`@hia-doc/cli` 导出 contract/version/diagnostic constants、pure evaluator、runtime guard、report/request types 与 Draft 2020-12 `ENTERPRISE_BASELINE_CURRENT_OWNER_WORKFLOW_JSON_SCHEMA`。

- consumer 必须 exact-match `0.1.0-draft`，未知 future draft fail closed；
- unknown fields、其它 target family、新 component、新 permission 或新 semantics 需要新 contract version；
- schema `$id` 目前仅是 owner-local identity，不表示在线 schema distribution；
- field order 不属于语义，但 diagnostic 生成顺序与 component projection 必须 deterministic；
- synthetic ready fixture 只证明实现路径可复现，不证明真实 owner input、consent 或 adoption 已发生。
