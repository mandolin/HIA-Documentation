# 文档源码映射输入验证

## 诊断路径选项

索引、校验、单映射迁移、绑定整组迁移和绑定owner校验的诊断path选项，只接受同realm普通或null原型对象的自有string数据字段；运行时undefined按省略处理。已知访问器/错误根或字段/反射失败拒绝，不调用getter或转换钩子，未知字段不读。各入口沿用既有INVALID诊断code，不回显部分非法路径。

读取工件之前复制路径，成功/失败及迁移前后验证不重读原options。合法空/空白字符串与上下文保留原行为，路径不规范化、未脱敏，不授予文件访问或公开权限；代理执行/资源/并发不受沙箱保证。复杂绑定索引选项仍有独立前置要求，不能据此声称该选项面已经全部审查。

The map index/validator, standalone map migration, bundle migration and binding
validator snapshot an own string diagnostic `path` from same-realm plain or
null-prototype options. Known accessors, malformed roots/fields and reflection
errors reject with each entry's existing INVALID code, without partial context.
Unknown fields remain unread. Valid empty/whitespace strings and unsanitized
context retain prior behavior; input processing and failure handlers do not
reread caller options. This is neither a proxy sandbox nor publication authority.

以下额外检查属于尚未发布的源码版，npm `@hia-doc/source-linkage@0.1.1`不包含这些变化。
当前源码定义为`doc-source-map@1.0.0`，精确旧reader保留`0.1.0-draft`；历史schema与fixture保持原样。
新版必要字段及来源类别/细节见[来源与迁移](doc-source-map-provenance.md)。下文的省略项兼容专指旧reader。

## 索引边界

`createDocSourceMapIndex()`和`validateDocSourceMap()`先检查输入是否为有限、无环的普通JSON图。
接受同realm普通对象、null原型对象、稠密普通数组及有限JSON标量；允许共享的无环子对象。
拒绝访问器、自定义toJSON、非JSON值、稀疏数组、数组额外方法及自有迭代器，且不执行这些钩子。
反射异常变为静态诊断，不回显异常正文。Proxy反射副作用、恶意资源消耗和调用期间的输入突变不属于沙箱保证。

| 已提供内容 | 检查 |
| --- | --- |
| 根身份、producer和privacy | 已声明字段的类型；隐私策略闭集和布尔标志 |
| artifact/source/map/entry/chain及sidecar集合 | 数组、对象项、非空身份、同集合身份唯一 |
| 来源、产物和sidecar引用 | 已声明字符串、列表与对象形状；既有owner继续检查引用和安全路径 |
| source reference范围 | 起止端点、一基正整数行/可选列、终点不早于起点 |
| 来源与置信度 | 旧reader保留非空来源字符串；新版检查闭集类别/可选细节与unresolved配对，置信度为high/medium/low/none |

同一entry可以对同一source声明多个范围；身份唯一检查不把合法的多范围引用合并。
重复顶层身份使索引invalid，不为调用者选择先声明或后声明的赢家。

这些检查保留历史宽输入的省略字段和开放普通JSON扩展。`available`表示本索引边界通过，
不能替代对完整wire文档进行独立schema验证；尤其不能据此宣称所有wire必填字段都已存在。
历史schema的来源枚举与旧reader接受的具体来源字符串并非完全一致；新根采用明确类别/细节模型，不重写历史定义。
普通source-map定位算法、跨链执行、完整sidecar模型和文件权限不属于本检查。

## 拒绝与隐私

结构问题返回`DOC_SOURCE_MAP_MANIFEST_INVALID`和`invalid`状态。
查询函数对invalid/unsupported-version索引继续返回空映射及diagnostics，不得绕过状态消费内部元数据。
诊断位置只追加受控字段名和数组下标；不会插入错误值或异常正文。

隐私默认仍为`none`。只有既有显式`embed`或`redacted`策略允许提供正文，
索引和查询仍不复制这些正文。不加载`sourceMappingURL`或任何sidecar引用，不改写输入，也不授权文件读取。
同一manifest中的路径/引用安全问题继续由既有owner检查；true类型的隐私标志不授权路径逃逸。

## English summary

The unreleased source version checks ordinary JSON and declared fields before indexing. It rejects accessors,
cycles, sparse/custom-behavior arrays, ambiguous identities and malformed ranges without invoking hooks.
Legacy omissions, open JSON extensions and generator-specific provenance strings remain supported.
Index availability is not proof of complete wire-schema validity. Invalid indexes remain blocked by query gates;
privacy defaults, explicit body opt-in and reference-only sidecars are unchanged. Reflection side effects and
resource exhaustion are not sandboxed. The current source definition is 1.0.0 with an exact legacy reader;
package versions and registry publication remain separate.
