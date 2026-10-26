# 生成式文档绑定校验与迁移 / Generated binding validation and migration

`validateGeneratedDocumentationBinding`和`migrateGeneratedDocumentationBindingBundle`都是同步纯内存入口。下面说明各自当前检查与责任边界，字段所有权另见[选项与结果](generated-binding-options-and-results.md)，版本/结构见[绑定契约](generated-documentation-binding-contract.md)。

`validateGeneratedDocumentationBinding` and `migrateGeneratedDocumentationBindingBundle` are synchronous in-memory entries. This guide describes their current checks and responsibility boundaries. See [options/results](generated-binding-options-and-results.md) for ownership and the [binding contract](generated-documentation-binding-contract.md) for versions/structure.

## 单工件owner校验 / Single-artifact owner validation

```ts
import { validateGeneratedDocumentationBinding } from "@hia-doc/source-linkage";
const diagnostics = validateGeneratedDocumentationBinding(sidecarJson, {
  path: "context/bindings.json"
});
```

仅接收提供的sidecar内存数据。入口先复制选项，再预检有限无环普通JSON图；共享子图可用，不执行getter或表达式。已声明字段/政策、集合、质量组合、实例键、组内binding/target引用及隐私由现有owner检查。诊断按输入字段、头部/政策、集合与引用的现有顺序产生，返回新可写列表，不修改输入。合法path上下文不脱敏，未知可选JSON字段继续兼容。

Only supplied sidecar data is consumed. Options are copied before finite acyclic ordinary-JSON preflight; shared subgraphs are supported without invoking getters or expressions. Existing owner checks cover declared fields/policies, collections, quality combinations, instance keys, local binding/target references and privacy. Diagnostics follow existing input-field, header/policy, collection and reference order, returning a fresh writable list without mutating input. Valid path context remains unsanitized, and unknown optional JSON fields remain compatible.

root与binding节点的可选`adapterExtensions`存在时必须为对象。省略、空对象和普通JSON null原型对象可用；`null`、数组、字符串、数字、布尔值拒绝。对象内部仍须通过普通JSON/隐私检查。此约束已在原schema声明，本次未改变契约版本。

Optional root/binding `adapterExtensions` must be objects when present. Omission, empty objects and ordinary-JSON null-prototype objects are supported; null, arrays, strings, numbers and booleans are refused. Object contents still require ordinary-JSON/privacy checks. The original schema already declared this constraint; contract versions are unchanged.

空诊断仅代表实现的owner检查通过。validator没有实际普通映射，不能认证source/artifact闭包或外部文档symbol；不根据不透明`scopeId`推导真实词法环境。合法包含提取error的工件仍可结构合法，消费索引与整组迁移才按error拒绝。它不是完整JSON Schema词汇引擎或公开授权。

An empty list passes implemented owner checks only. Without the actual map, the validator cannot certify source/artifact closure or external documentation symbols; it infers no real lexical environment from an opaque `scopeId`. An artifact carrying a valid extraction-error record may remain structurally valid; consuming indexes and bundle migration then refuse it because of that error. This is neither a complete JSON Schema vocabulary engine nor publication authority.

## 整组迁移 / Bundle migration

```ts
import { migrateGeneratedDocumentationBindingBundle } from "@hia-doc/source-linkage";
const result = migrateGeneratedDocumentationBindingBundle({
  docSourceMap: mapJson,
  bindingSidecars: suppliedSidecars
});
if ((result.status === "migrated" || result.status === "already-current") && result.bundle) {
  // 中文：调用者另行审查unknown字段和公开政策后决定是否持久化。
  // English: Callers separately review unknown fields/publication policy before persistence.
}
```

| 顺序 / Order | 当前检查 / Current checks |
| --- | --- |
| 1 | 复制选项，预检整个wrapper JSON图；未知wrapper字段不输出。 / Snapshot options and preflight the whole wrapper JSON graph; unknown wrapper fields are omitted. |
| 2 | 精确支持旧map/sidecar均0.1.0-draft，当前map1.0.0配sidecar0.2.0-draft；未知版本不猜测兼容。 / Support exact legacy and current pairs without inferring compatibility for unknown versions. |
| 3 | 实际映射和全部显式辅助工件须完整、唯一并匹配身份/路径/版本；当前实现核组内绑定/展开/目标与提供的source/artifact身份闭包。 / The actual map and every supplied sidecar must form a complete unique set matching identities/paths/versions and implemented group-local reference closure. |
| 4 | 各工件独立复制，只改已定义版本/配对与已确认旧来源转换字段，不全文替换扩展字符串。 / Clone artifacts separately; update only defined versions/pairings and approved legacy provenance fields, without global extension-string replacement. |
| 5 | 复核完整结果后一次返回；失败省略bundle，无局部产物。 / Revalidate the complete result before atomic return; refusal omits bundle without partial artifacts. |

完整集合可以为空：普通映射无绑定声明与引用时，显式`bindingSidecars: []`合法。可选`docSourceMapId`省略不等于加载/推断外部映射；symbol-only目标按原规则可用，外部symbol真实性不由本API认证。scope.sourceId在实际映射外时，单工件可合法，但整组迁移拒绝。

A complete set may be empty: explicit `bindingSidecars: []` is valid when the map has no binding declarations/references. Omitted optional `docSourceMapId` does not trigger external loading/inference. Symbol-only targets remain supported without authenticating external symbols. A scope.sourceId outside the actual map may pass standalone validation but is refused by bundle migration.

函数不读取路径、不执行表达式/adapter扩展、不写磁盘，也不推导词法scope真实性。成功外层diagnostics为空，工件内获准诊断/文本仍可保留。Proxy反射、并发突变和资源配额不构成沙箱保证；成功不代表已脱敏、完整schema验收、提取成功或包已发布。消费索引另见[绑定索引](generated-binding-index.md)。

The function reads no paths, executes no expressions/adapter extensions, writes no files and infers no lexical scope authenticity. Outer success diagnostics are empty while admitted artifact diagnostics/text may remain. Proxy reflection, concurrent mutation and resource quotas are outside sandbox guarantees. Success proves neither sanitization, complete schema acceptance, extraction success nor package publication. See [binding indexes](generated-binding-index.md) for consumers.
