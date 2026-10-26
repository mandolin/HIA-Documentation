# 文档源码映射校验、索引与迁移 / Documentation map validation, indexing and migration

三个同步入口分别返回索引、诊断列表与迁移结果，均消费调用者显式提供的内存数据。相关字段见[索引元数据](doc-source-map-index.md)及[选项与结果](doc-source-map-options-and-results.md)；本参考说明函数当前责任，不改变类型、运行行为或版本。

Three synchronous entries return an index, diagnostic list and migration result respectively, consuming caller-supplied memory data. See [index metadata](doc-source-map-index.md) and [options/results](doc-source-map-options-and-results.md) for fields. This guide describes current responsibilities without changing types, runtime behavior or versions.

## 索引构建 / Index construction

`createDocSourceMapIndex(value, options)`先复制诊断上下文并预检普通JSON，再检查已声明/当前必要结构、版本、路径/隐私、引用与root诊断，建立规范化metadata。历史0.1.0-draft保留既有省略项，新版1.0.0执行当前必要结构和来源模型B。它不执行JSON hooks，Proxy反射、资源配额与并发突变仍不受沙箱保证。

`createDocSourceMapIndex(value, options)` snapshots diagnostic context and preflights ordinary JSON before checking declared/current required structure, versions, paths/privacy, references and root diagnostics, then builds normalized metadata. Legacy 0.1.0-draft retains existing omissions; 1.0.0 applies current required structure and provenance model B. JSON hooks are not executed; proxy reflection, resource quotas and concurrent mutation remain outside sandbox guarantees.

| 条件 / Condition | 索引状态 / Index status | 消费限制 / Consumption limit |
| --- | --- | --- |
| 任意error / Any error | `invalid` | 可保留metadata/计数；公开查询隔离。 / Metadata/counts may remain; public queries are gated. |
| 无error但版本未知 / No errors, unknown version | `unsupported-version` | 即使只有warning也不可查询。 / Unqueryable even if only warnings exist. |
| 其余 / Otherwise | `available` | 只代表当前owner边界，不是完整schema或闭包证明。 / Passes this owner boundary, not complete schema/closure certification. |

普通map的未知source/artifact引用可产生warning而仍available；这与[绑定整组迁移](generated-binding-validation-and-migration.md)的硬闭包要求不同。root诊断的severity参与状态；entry诊断仅投影code字符串到`entry.diagnostics`，不转成root错误。返回metadata可写，修改后不自动重算状态/计数，失败对象也不能当安全公开产物。

Unknown source/artifact references in ordinary maps may produce warnings while staying available, unlike the hard closure required by [binding-bundle migration](generated-binding-validation-and-migration.md). Root diagnostic severity affects status; entry diagnostics project code strings into `entry.diagnostics` without becoming root errors. Metadata is writable and later edits do not recompute status/counts; refused objects are not automatically safe publication artifacts.

## 单独校验 / Validation facade

`validateDocSourceMap(value, options)`直接返回同索引算法的本次诊断列表。分别调用校验和索引会得到独立列表；它不额外验证外部工件。判断受支持版本时要看诊断code或索引status，不能只判断有没有error。

`validateDocSourceMap(value, options)` directly returns this call's diagnostics from the indexing algorithm. Separate validation/index calls own independent lists and authenticate no additional external artifacts. Inspect diagnostic codes or index status to establish supported versions; checking only for errors is insufficient.

历史宽输入可能通过此校验却不能迁移。例如只有旧contract/version/entries的对象仍可索引，但迁移必须拒绝为它凭空补造新版必要字段。返回诊断可能保留原工件code/message和合法path，不能把校验当脱敏或公开授权。

Permissive legacy input may pass validation yet refuse migration. For example, a legacy object containing only contract/version/entries remains indexable, but migration must not invent current required fields. Diagnostics may retain original artifact code/message and valid path context; validation is neither sanitization nor publication authority.

## 单工件迁移 / Standalone migration

`migrateDocSourceMap`先检查原owner状态，再独立复制、按已确认精确表转换旧来源，最后复核当前结构/来源/隐私。旧版成功为`migrated`，当前版独立复制为`already-current`；错误和未识别版本省略自有manifest属性，无局部工件。结果是普通可写interface，仍须独立检查manifest存在及unknown字段。

`migrateDocSourceMap` checks original owner status, independently clones/converts legacy provenance through the approved exact table, then revalidates current structure/provenance/privacy. Legacy success yields migrated; independent current cloning yields already-current. Errors/unrecognized versions omit the own manifest property without partial artifacts. The result remains an ordinary writable interface: separately check manifest presence and unknown fields.

旧映射有绑定声明/引用时必须使用协调迁移；当前映射独立复制不认证未提供的sidecar正文。普通未解析引用warning可随成功结果保留；成功不代表完整引用闭包、完整schema、公开安全或包已发布。迁移保留获准正文、原诊断及JSON扩展，调用者自行决定持久化/公开。

Legacy maps containing binding declarations/references require coordinated migration; standalone current cloning does not authenticate unsupplied sidecar bodies. Ordinary unresolved-reference warnings may remain on success. Success certifies neither complete closure/schema, public safety nor package publication. Admitted bodies, raw diagnostics and JSON extensions remain; callers decide whether to persist/publish.

## 被动声明与权限 / Passive declarations and authority

chain stage的from/to/transform/sourceMap/linkage只是声明，sourceMap的pointer只按对象处理，mapsFrom/mapsTo不推导外部身份闭包；外部contractRef不认证其版本。安全相对sidecar路径也不触发加载。选项path只作未脱敏诊断上下文；privacy允许标记不取消绝对/越界路径禁令。三个入口均不执行链路、抓取URL、读文件/sidecar或自动发布。

Chain-stage fields remain declarations. Source-map pointers are treated as objects; mapsFrom/mapsTo infer no external identity closure, and external contractRefs do not authenticate versions. Safe relative sidecar paths trigger no loading. Options.path is unsanitized diagnostic context; privacy allowance flags do not waive absolute/escaping-path prohibitions. None of the entries executes chains, fetches URLs, reads files/sidecars or publishes automatically.
