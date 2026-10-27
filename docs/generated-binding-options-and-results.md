# 生成式文档绑定选项与整组迁移结果 / Generated binding options and bundle results

本文说明公开迁移选项、证据与结果的字段。接口保持可写结构类型；版本配对以实际reader与迁移函数为准。契约版本不等于包已发布。

This reference covers migration options, evidence and result fields. They remain writable structural types; exact pairs are enforced by the reader and migration function. Contract versions do not establish package publication.

## 校验上下文 / Validation context

`GeneratedDocumentationBindingValidationOptions.path?: string` 是可省略的诊断前缀。`validateGeneratedDocumentationBinding` 在检查工件前复制已知自有数据；字段诊断可追加位置，`path`/`targetPath`保留上下文。空字符串不加前缀，空白与分隔符不裁剪或规范化；合法上下文在拒绝时也可回显，不是脱敏或读取文件的权限。

`GeneratedDocumentationBindingValidationOptions.path?: string` is an optional diagnostic prefix. `validateGeneratedDocumentationBinding` snapshots known own data before inspecting artifacts; field locations may be appended, and `path`/`targetPath` retain context. Empty strings add no prefix; whitespace/separators remain unnormalized. Valid context may be echoed on refusal without sanitization or file-access authority.

选项只接收同realm普通/null原型对象的自有数据；`path`按原规则复制，组迁移另可显式指定`targetVersion`及映射/绑定各自的逐引用范围证据。运行时自有`undefined`按省略处理，开启`exactOptionalPropertyTypes`的TypeScript仍拒绝`{path: undefined}`。返回诊断数组/对象可写，各调用独立。组迁移的第二参数是扩展`DocSourceMapIndexOptions`的`GeneratedDocumentationBindingBundleMigrationOptions`；见[文档映射选项](doc-source-map-options-and-results.md)及[范围约定](doc-source-map-range-conventions.md)。

Options admit own data from same-realm plain/null-prototype records. Bundle migration also accepts an explicit `targetVersion` and separate map/binding range evidence. Runtime own `undefined` is treated as omitted, while TypeScript with `exactOptionalPropertyTypes` rejects `{path: undefined}`. Returned diagnostic lists/objects are writable and independent across calls. Bundle migration uses `GeneratedDocumentationBindingBundleMigrationOptions`, extending `DocSourceMapIndexOptions`; see [map options](doc-source-map-options-and-results.md) and [range conventions](doc-source-map-range-conventions.md).

| 迁移选项 / Migration option | 含义 / Meaning |
| --- | --- |
| `targetVersion?` | 只接受显式 `0.3.0-draft`；省略时旧草案迁至前一 `0.2.0-draft` / `1.0.0` 配对，前一配对独立复制。 / Only explicit `0.3.0-draft` is accepted; omission preserves the prior-pair default. |
| `rangeEvidence?` | 显式升级时按原映射 `entryIndex`、`sourceRefIndex` 为每条旧带范围引用提供 `rangeConvention`。 / On explicit upgrade, conventions for each older ranged map reference use original entry/source-reference ordinals. |
| `bindingRangeEvidence?` | 显式升级时按原 `sidecarIndex`、`bindingIndex`、`kind` 和贡献时的 `contributionIndex` 为旧绑定源码引用独立提供约定；不从映射同坐标推断。 / On explicit upgrade, independently supplies conventions for older binding source references by their original ordinals and kind, never inferred from a matching map coordinate. |

缺失、重复、多余或附带隐藏字段的证据均原子拒绝；两类证据在检查输入工件前复制。已是新版的整组复制不接受多余证据。详情见[绑定契约](generated-documentation-binding-contract.md)。

Missing, duplicate, surplus or hidden-field evidence refuses the complete migration. Both evidence sets are copied before the input artifacts are inspected. Copying an already current pair does not admit surplus evidence. See the [binding contract](generated-documentation-binding-contract.md).

## 整组容器 / Bundle container

`GeneratedDocumentationBindingMigrationBundle`只要求以下结构，不认证版本、完整性或隐私。迁移函数接收`unknown`，另行验证完整旧配对或当前配对。未知wrapper字段不输出，但包括这些字段在内的整个输入仍须通过普通JSON预检。

`GeneratedDocumentationBindingMigrationBundle` requires the following shape without certifying versions, completeness or privacy. Migration accepts `unknown` and separately validates a complete legacy/current pair. Unknown wrapper fields are omitted, but the entire input, including those fields, still requires ordinary-JSON preflight.

| 字段 / Field | factory成功时 / On factory success |
| --- | --- |
| `docSourceMap: Record<string, unknown>` | 独立可写的1.0.0或1.1.0映射，取决于输入配对和显式升级目标；绑定只存引用，获准正文/原诊断/JSON扩展可保留。 / Independent writable 1.0.0 or 1.1.0 map according to the input pair and explicit target; binding references only, while admitted bodies/raw diagnostics/JSON extensions may remain. |
| `bindingSidecars: Record<string, unknown>[]` | 完整独立0.2.0-draft或0.3.0-draft工件，与映射精确配对；按输入数组而非声明顺序，获准诊断/扩展保留，禁用隐私字段仍拒绝。 / Complete independent 0.2.0-draft or 0.3.0-draft artifacts exactly paired with the map, in input-array rather than declaration order; admitted diagnostics/extensions remain while prohibited privacy fields are refused. |

普通映射与每个sidecar分别复制可枚举字符串键，不保留原型/描述符、隐藏或Symbol扩展。各工件内部共享子图保留；跨工件共享身份不保留。输出与输入/其它调用没有可变别名，嵌套图仍可写，修改后需要重新验证。容器不是磁盘事务、持久化指令或公开授权。

The map and each sidecar separately clone enumerable string keys, excluding original prototypes/descriptors and hidden/symbol extensions. Sharing within each artifact remains; cross-artifact shared identity does not. Outputs share no mutable aliases with inputs/other calls, but nested graphs remain writable and require revalidation after edits. The container grants no disk transaction, persistence instruction or publication authority.

## 结果字段 / Result fields

`GeneratedDocumentationBindingBundleMigrationResult`是普通interface，不是判别联合。人工构造可以让成功状态没有bundle或失败状态带bundle；以下成功/拒绝形态是factory的运行保证，状态检查后仍须独立检查bundle存在和`unknown`字段。

`GeneratedDocumentationBindingBundleMigrationResult` is an ordinary interface rather than a discriminated union. Manual construction may omit a bundle for success or include one for refusal. The following shapes are factory guarantees; after checking status, consumers must still check bundle presence and `unknown` fields independently.

| 字段 / Field | 语义 / Meaning |
| --- | --- |
| `status` | `migrated`实际升级、`already-current`原配对复制、`invalid`非法组、`unsupported-version`未识别工件或目标版本。 / Actual upgrade, same-pair cloning, invalid bundle or unrecognized artifact/target version. |
| `bundle?` | factory两种成功状态返回自有完整目标组；拒绝省略自有属性，无局部产物。 / Own complete target bundle for the factory's two successful statuses; refusal omits the own property and returns no partial artifacts. |
| `diagnostics` | 每次新建可写数组；成功为空，不汇总工件内诊断。失败一条固定`GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID` error，仍可带合法未脱敏path。 / Fresh writable list; empty on success without aggregating artifact diagnostics. Refusal has one fixed error and may retain a valid unsanitized path. |

修改bundle或diagnostics不会重算status。空外层诊断不代表没有工件warning/info，也不证明公开安全。本字段参考不等于完整validator/迁移函数或资源沙箱已验收；[绑定契约](generated-documentation-binding-contract.md)、[索引](generated-binding-index.md)及[宿主投影](generated-binding-host-projection.md)保持各自范围。

Editing bundle/diagnostics does not recompute status. Empty outer diagnostics do not prove absence of artifact warnings/info or public safety. This field reference does not establish complete validator/migration or resource-sandbox acceptance; the [binding contract](generated-documentation-binding-contract.md), [index](generated-binding-index.md) and [host projection](generated-binding-host-projection.md) keep their respective scopes.
