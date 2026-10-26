# 生成式文档绑定选项与整组迁移结果 / Generated binding options and bundle results

本文说明三个公开interface的六个直接字段。接口保持可写结构类型；新旧配对与运行时检查不因本参考改变。契约版本不等于包已发布。

This reference covers six direct fields in three public interfaces. They remain writable structural types; supported pairs and runtime checks are unchanged. Contract versions do not establish package publication.

## 校验上下文 / Validation context

`GeneratedDocumentationBindingValidationOptions.path?: string` 是可省略的诊断前缀。`validateGeneratedDocumentationBinding` 在检查工件前复制已知自有数据；字段诊断可追加位置，`path`/`targetPath`保留上下文。空字符串不加前缀，空白与分隔符不裁剪或规范化；合法上下文在拒绝时也可回显，不是脱敏或读取文件的权限。

`GeneratedDocumentationBindingValidationOptions.path?: string` is an optional diagnostic prefix. `validateGeneratedDocumentationBinding` snapshots known own data before inspecting artifacts; field locations may be appended, and `path`/`targetPath` retain context. Empty strings add no prefix; whitespace/separators remain unnormalized. Valid context may be echoed on refusal without sanitization or file-access authority.

选项只接收同realm普通/null原型对象的自有path数据，未知选项字段不读。运行时自有`undefined`按省略处理，开启`exactOptionalPropertyTypes`的TypeScript仍拒绝`{path: undefined}`。返回诊断数组/对象可写，各调用独立。组迁移的第二参数使用已有`DocSourceMapIndexOptions`，见[文档映射选项](doc-source-map-options-and-results.md)。

Options admit own path data from same-realm plain/null-prototype records and leave unknown option fields unread. Runtime own `undefined` is treated as omitted, while TypeScript with `exactOptionalPropertyTypes` rejects `{path: undefined}`. Returned diagnostic lists/objects are writable and independent across calls. Bundle migration uses the existing `DocSourceMapIndexOptions` as its second parameter; see [map options](doc-source-map-options-and-results.md).

## 整组容器 / Bundle container

`GeneratedDocumentationBindingMigrationBundle`只要求以下结构，不认证版本、完整性或隐私。迁移函数接收`unknown`，另行验证完整旧配对或当前配对。未知wrapper字段不输出，但包括这些字段在内的整个输入仍须通过普通JSON预检。

`GeneratedDocumentationBindingMigrationBundle` requires the following shape without certifying versions, completeness or privacy. Migration accepts `unknown` and separately validates a complete legacy/current pair. Unknown wrapper fields are omitted, but the entire input, including those fields, still requires ordinary-JSON preflight.

| 字段 / Field | factory成功时 / On factory success |
| --- | --- |
| `docSourceMap: Record<string, unknown>` | 独立可写1.0.0普通映射，绑定只存引用；获准正文/原诊断/JSON扩展可保留。 / Independent writable 1.0.0 map with binding references only; admitted bodies/raw diagnostics/JSON extensions may remain. |
| `bindingSidecars: Record<string, unknown>[]` | 完整独立0.2.0-draft工件，按输入数组而非声明顺序；获准诊断/扩展保留，禁用隐私字段仍拒绝。 / Complete independent 0.2.0-draft artifacts in input-array rather than declaration order, retaining admitted diagnostics/extensions while still rejecting prohibited privacy fields. |

普通映射与每个sidecar分别复制可枚举字符串键，不保留原型/描述符、隐藏或Symbol扩展。各工件内部共享子图保留；跨工件共享身份不保留。输出与输入/其它调用没有可变别名，嵌套图仍可写，修改后需要重新验证。容器不是磁盘事务、持久化指令或公开授权。

The map and each sidecar separately clone enumerable string keys, excluding original prototypes/descriptors and hidden/symbol extensions. Sharing within each artifact remains; cross-artifact shared identity does not. Outputs share no mutable aliases with inputs/other calls, but nested graphs remain writable and require revalidation after edits. The container grants no disk transaction, persistence instruction or publication authority.

## 结果字段 / Result fields

`GeneratedDocumentationBindingBundleMigrationResult`是普通interface，不是判别联合。人工构造可以让成功状态没有bundle或失败状态带bundle；以下成功/拒绝形态是factory的运行保证，状态检查后仍须独立检查bundle存在和`unknown`字段。

`GeneratedDocumentationBindingBundleMigrationResult` is an ordinary interface rather than a discriminated union. Manual construction may omit a bundle for success or include one for refusal. The following shapes are factory guarantees; after checking status, consumers must still check bundle presence and `unknown` fields independently.

| 字段 / Field | 语义 / Meaning |
| --- | --- |
| `status` | `migrated`旧配对转换、`already-current`当前配对复制、`invalid`非法组、`unsupported-version`未识别工件版本。 / Legacy conversion, current-pair cloning, invalid bundle or unrecognized artifact version. |
| `bundle?` | factory两种成功状态返回自有完整新组；拒绝省略自有属性，无局部产物。 / Own complete current bundle for the factory's two successful statuses; refusal omits the own property and returns no partial artifacts. |
| `diagnostics` | 每次新建可写数组；成功为空，不汇总工件内诊断。失败一条固定`GENERATED_DOCUMENTATION_BINDING_MIGRATION_INVALID` error，仍可带合法未脱敏path。 / Fresh writable list; empty on success without aggregating artifact diagnostics. Refusal has one fixed error and may retain a valid unsanitized path. |

修改bundle或diagnostics不会重算status。空外层诊断不代表没有工件warning/info，也不证明公开安全。本字段参考不等于完整validator/迁移函数或资源沙箱已验收；[绑定契约](generated-documentation-binding-contract.md)、[索引](generated-binding-index.md)及[宿主投影](generated-binding-host-projection.md)保持各自范围。

Editing bundle/diagnostics does not recompute status. Empty outer diagnostics do not prove absence of artifact warnings/info or public safety. This field reference does not establish complete validator/migration or resource-sandbox acceptance; the [binding contract](generated-documentation-binding-contract.md), [index](generated-binding-index.md) and [host projection](generated-binding-host-projection.md) keep their respective scopes.
