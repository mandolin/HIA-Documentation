# 文档源码映射选项与迁移结果 / Documentation-map options and migration results

本参考覆盖`@hia-doc/source-linkage`的索引选项、显式迁移证据和迁移结果，说明当前源码实现的字段消费和所有权。包版本、契约稳定性与正式发行单独管理。

This reference covers index options, explicit migration evidence and migration results in `@hia-doc/source-linkage`. It describes current source behavior and ownership; package versions, contract stability and publication remain separate.

## 诊断上下文选项 / Diagnostic-context options

`createDocSourceMapIndex(value, options)`与`validateDocSourceMap(value, options)`使用`DocSourceMapIndexOptions`；`migrateDocSourceMap(value, options)`使用扩展它的`DocSourceMapMigrationOptions`。每个入口默认空选项，先将自有path复制为独立快照，再处理输入；随后改原选项不会改变已返回诊断。要求同realm普通或null原型对象；未知扩展不读取，已知访问器/错型及反射失败沿既有规则拒绝。完整输入边界见[输入验证](doc-source-map-input-validation.md)。

Creation and validation use `DocSourceMapIndexOptions`; standalone migration uses `DocSourceMapMigrationOptions`, which extends it. Each defaults to empty options and snapshots own path data before processing input. Later option edits cannot change returned diagnostics. Admission requires a same-realm plain/null-prototype record; unknown extensions are unread, while known accessors/wrong types and reflection failures follow refusal rules. See [input validation](doc-source-map-input-validation.md).

| 字段 / Field | 类型 / Type | 语义 / Meaning |
| --- | --- | --- |
| `path?` | `string` | 未脱敏诊断前缀，不是文件访问或公开授权 / Unsanitized diagnostic prefix, not file-access or publication permission. |

迁移选项还可提供`rangeEvidence?: readonly DocSourceMapRangeEvidence[]`。每条证据用输入中的`entryIndex`与`sourceRefIndex`定位一条带范围引用，附上`rangeConvention`的终点与列单位。迁移目标为`1.1.0`；旧版引用缺少、重复或多出证据时原子拒绝。详见[范围约定](doc-source-map-range-conventions.md)。

Migration additionally accepts `rangeEvidence?: readonly DocSourceMapRangeEvidence[]`. An item addresses a ranged input reference by `entryIndex` and `sourceRefIndex` and supplies its endpoint and column unit. The target is `1.1.0`; missing, duplicate or extra evidence for older references refuses the conversion atomically. See [range conventions](doc-source-map-range-conventions.md).

路径不裁剪、规范化分隔符或消除绝对样式文本。空字符串不附上下文，空白字符串保留；入口可追加字段后缀。合法path也可出现在失败诊断的`path`/`targetPath`里，不能直接当公开安全文本。运行预检将自有`path: undefined`视作省略；启用TypeScript `exactOptionalPropertyTypes`时，`path?: string`不允许这个显式undefined属性。整个第二参数为undefined则使用函数默认值。

Paths are neither trimmed, separator-normalized nor stripped of absolute-looking text. Empty strings add no context; whitespace remains. Entries may append field suffixes. Valid paths may appear in refusal diagnostic `path`/`targetPath`, so they are not automatically public-safe. Runtime preflight treats an own `path: undefined` as omitted, whereas TypeScript `exactOptionalPropertyTypes` rejects that explicit property under `path?: string`. An undefined second argument uses function defaults.

## 迁移结果四状态 / Four migration-result states

| 字段 / Field | 类型 / Type | factory约定 / Factory convention |
| --- | --- | --- |
| `status` | `"migrated" \| "already-current" \| "invalid" \| "unsupported-version"` | 本次检查的可写快照，不因结果后续被改动而重算 / Mutable snapshot of this call's checks, without recomputation after later edits. |
| `manifest?` | `Record<string, unknown>` | 成功返回独立可写图；失败没有该自有属性 / Fresh writable graph on success; no such own property on refusal. |
| `diagnostics` | `HiaDiagnostic[]` | 每次新列表/投影诊断；成功不一定为空，失败单条固定迁移错误 / Fresh list/projected diagnostics; success need not be empty, refusal has one fixed migration error. |

`migrated`将精确旧版转为当前版；`already-current`也返回独立复制品，不借用输入。`invalid`和`unsupported-version`都不返回局部manifest。明确版本、来源转换和组迁移条件仍见[来源模型与迁移](doc-source-map-provenance.md)及[生成式文档绑定](generated-documentation-binding-contract.md)，本参考不重新规定这些规则。

`migrated` converts the exact legacy version; `already-current` still returns an independent copy rather than borrowing input. Both refusal states omit partial manifests. Exact versions, provenance conversion and coordinated migration retain the [existing provenance/migration](doc-source-map-provenance.md) and [binding contract](generated-documentation-binding-contract.md) rules.

这是一个interface内的联合状态字段和可选manifest，**不是判别联合**。TypeScript仍允许人工构造`{status: "migrated", diagnostics: []}`，也允许invalid带manifest；那不代表factory会返回这种组合。消费者必须分别检查状态和manifest存在；记录内部字段仍为unknown，不能当作完整的类型化工件。

This is an interface with a status-union field and an optional manifest, **not a discriminated union**. TypeScript permits manually constructing successful values without manifests or invalid values with manifests; that does not describe factory outputs. Check status and manifest presence separately, and narrow unknown record fields before consuming them.

下例的`rangeEvidence`必须由调用方核实并按**旧工件每条带范围的`sourceRef`**提供；对已是`1.1.0`或完全没有范围的旧工件传空数组。省略证据不能把旧带范围工件升级为当前版。若旧地图含生成式绑定关联，应改用完整的整组迁移，不能用此单工件示例绕过关联检查：`0.1.0-draft/0.1.0-draft`旧草案配对默认升至`0.2.0-draft/1.0.0`，该已公开配对默认独立复制；两种默认路径都不要求新版范围证据。只有显式升至`0.3.0-draft/1.1.0`时，才分别提供映射与绑定的逐引用范围证据。

The caller must verify and supply `rangeEvidence` for **each ranged `sourceRef` in an older artifact**. Pass an empty array for an already-current `1.1.0` map or an older map with no ranges. Omitting evidence cannot upgrade an older ranged map. Older maps with generated-binding associations require coordinated bundle migration rather than this standalone example: the `0.1.0-draft/0.1.0-draft` legacy pair advances by default to `0.2.0-draft/1.0.0`, while that previous published pair is independently cloned by default. Neither default path needs current range evidence. An explicit upgrade to `0.3.0-draft/1.1.0` requires separate per-reference map and binding range evidence.

```ts
import { migrateDocSourceMap, type DocSourceMapRangeEvidence } from "@hia-doc/source-linkage";

/**
 * @lang zh-CN 消费当前迁移结果，不将成功状态当作类型或公开授权。
 * @lang en Consumes a migration result without treating success as a type or publication authorization.
 * @param input <lang><zh-CN>未知映射数据，由迁移入口验证。</zh-CN><en>Unknown map data validated by the migration entry.</en></lang>
 * @param rangeEvidence <lang><zh-CN>调用方逐引用核实的旧范围约定；无旧范围时为空数组。</zh-CN><en>Caller-verified conventions for every old ranged reference, or an empty array when none exist.</en></lang>
 * @returns <lang><zh-CN>工具本地工件或诊断，公开前仍需独立检查。</zh-CN><en>Tool-local artifact or diagnostics, still requiring separate checks before publication.</en></lang>
 */
function migrateForTool(input: unknown, rangeEvidence: readonly DocSourceMapRangeEvidence[]) {
  // <lang><zh-CN>显式传递已核实证据，并逐项检查本次结果的状态和可选工件。</zh-CN><en>Pass verified evidence explicitly and inspect both the result status and optional artifact.</en></lang>
  const result = migrateDocSourceMap(input, { path: "artifacts/map.json", rangeEvidence });
  if ((result.status === "migrated" || result.status === "already-current") && result.manifest) {
    return result.manifest; // <lang><zh-CN>公开前仍需独立隐私/发行检查。</zh-CN><en>Independent privacy/release checks still apply before publication.</en></lang>
  }
  return result.diagnostics;
}
```

## 复制、诊断与公开边界 / Copying, diagnostics and publication

成功manifest经过后置owner检查，是新的可写普通JSON图；跨输入/跨调用不共享可变节点，同一输出图内部共享关系保留。复制只包含可枚举字符串键，不保留原型/描述符、隐藏或Symbol扩展，不执行JSON hooks。修改一个结果不会回写输入或其它调用结果。它保留开放JSON扩展、原诊断和显式获准的源码正文，**并非自动脱敏的公开产物**。

Successful manifests pass post-copy owner checks and form fresh writable plain JSON graphs. They share no mutable nodes with input or other calls while preserving sharing inside the output. Copying includes enumerable string keys rather than prototypes/descriptors or hidden/symbol extensions, without executing JSON hooks. Edits stay local. Open JSON extensions, raw diagnostics and explicitly permitted source bodies remain; the result is **not an automatically sanitized public artifact**.

成功diagnostics来自后置索引投影，与manifest中的原诊断对象分开；可带warning/info、原文本/code和诊断路径。失败使用单条`DOC_SOURCE_MAP_MIGRATION_INVALID`固定错误，隐藏被拒正文，却仍可携带合法options.path。列表、诊断外壳和结果本身可写；随后向诊断加入error不会自动把status变成invalid。调用方改动后的对象不再代表原factory检查时点。

Successful diagnostics come from post-copy index projection, separately from raw manifest diagnostic objects, and may retain warning/info, text/codes and diagnostic paths. Refusals use one fixed `DOC_SOURCE_MAP_MIGRATION_INVALID` error, hiding rejected bodies but potentially retaining a valid options.path. Lists, shells and results remain mutable; appending an error does not recompute status. Caller-edited objects no longer represent the factory's original observation.

此字段参考不等于整个validator/迁移函数、跨生产器端点或资源沙箱已经验收。相关[索引元数据](doc-source-map-index.md)与[常量/schema所有权](source-linkage-schema-surface.md)各自保持原范围。

This field reference does not establish complete validator/migration, cross-producer endpoint or resource-sandbox acceptance. [Index metadata](doc-source-map-index.md) and [constant/schema ownership](source-linkage-schema-surface.md) keep their own scopes.
