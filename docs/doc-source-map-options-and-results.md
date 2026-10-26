# 文档源码映射选项与迁移结果 / Documentation-map options and migration results

本参考覆盖`@hia-doc/source-linkage`的`DocSourceMapIndexOptions`与`DocSourceMapMigrationResult`两个仅类型根、四个直接字段，说明当前源码实现的字段消费和所有权。包版本、契约稳定性与正式发行单独管理。

This reference covers two type-only roots and four direct fields in `@hia-doc/source-linkage`: `DocSourceMapIndexOptions` and `DocSourceMapMigrationResult`. It describes current source behavior and ownership; package versions, contract stability and publication remain separate.

## 诊断上下文选项 / Diagnostic-context options

`createDocSourceMapIndex(value, options)`、`validateDocSourceMap(value, options)`、`migrateDocSourceMap(value, options)`共用`DocSourceMapIndexOptions`。每个入口默认空选项，先将自有path复制为独立快照，再处理输入；随后改原选项不会改变已返回诊断。要求同realm普通或null原型对象；未知扩展不读取，已知访问器/错型及反射失败沿既有规则拒绝。完整输入边界见[输入验证](doc-source-map-input-validation.md)。

The creation, validation and standalone migration entries share `DocSourceMapIndexOptions`. Each defaults to empty options and snapshots own path data before processing input. Later option edits cannot change returned diagnostics. Admission requires a same-realm plain/null-prototype record; unknown extensions are unread, while known accessors/wrong types and reflection failures follow existing refusal rules. See [input validation](doc-source-map-input-validation.md).

| 字段 / Field | 类型 / Type | 语义 / Meaning |
| --- | --- | --- |
| `path?` | `string` | 未脱敏诊断前缀，不是文件访问或公开授权 / Unsanitized diagnostic prefix, not file-access or publication permission. |

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

```ts
import { migrateDocSourceMap } from "@hia-doc/source-linkage";

/**
 * @lang zh-CN 消费当前迁移结果，不将成功状态当作类型或公开授权。
 * @lang en Consumes a migration result without treating success as a type or publication authorization.
 * @param input <lang><zh-CN>未知映射数据，由迁移入口验证。</zh-CN><en>Unknown map data validated by the migration entry.</en></lang>
 * @returns <lang><zh-CN>工具本地工件或诊断，公开前仍需独立检查。</zh-CN><en>Tool-local artifact or diagnostics, still requiring separate checks before publication.</en></lang>
 */
function migrateForTool(input: unknown) {
  // <lang><zh-CN>本次调用的结果快照，逐项检查状态和可选工件。</zh-CN><en>Result snapshot for this call; check status and the optional artifact separately.</en></lang>
  const result = migrateDocSourceMap(input, { path: "artifacts/map.json" });
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
