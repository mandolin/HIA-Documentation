# 源码映射常量与 schema / Source-linkage constants and schemas

本参考聚焦`@hia-doc/source-linkage`的版本常量、范围词汇和schema导出。以下说明当前源码定义；npm包版本、契约版本、schema版本、catalog成熟度和系统发行状态分别管理。`doc-source-map@1.1.0`为`stable-candidate`；`generated-documentation-binding@0.3.0-draft`与独立的`ordinary-source-map-coordinate-profile@0.1.0-draft`仍为draft。包及系统发行须分别验收。

This guide focuses on version constants, range vocabulary and schema exports in `@hia-doc/source-linkage`. Package versions, contract/schema versions, catalog maturity and system releases are separate. The source definition `doc-source-map@1.1.0` is a `stable-candidate`; `generated-documentation-binding@0.3.0-draft` and independent `ordinary-source-map-coordinate-profile@0.1.0-draft` remain drafts. Package and system publication have separate acceptance gates.

## 身份、版本和类别 / Identities, versions and categories

| 导出 / Export | 当前值或类型 / Value or type | 语义 / Meaning |
| --- | --- | --- |
| `DOC_SOURCE_MAP_CONTRACT` | `"doc-source-map"` | 文档语义映射contract身份；不是普通位置map格式版本 / Documentation-semantic contract identity, not a positional-map format version. |
| `DOC_SOURCE_MAP_CONTRACT_VERSION` | `"1.1.0"` | 当前根的精确版本 / Exact current root version. |
| `DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION` | `"1.0.0"` | 已公开前一根的精确版本 / Exact previously published root version. |
| `DOC_SOURCE_MAP_LEGACY_CONTRACT_VERSION` | `"0.1.0-draft"` | 精确历史reader身份，不是未知版本回退 / Exact historical reader identity, not an unknown-version fallback. |
| `DocSourceMapContractVersion` | `"1.1.0" \| "1.0.0" \| "0.1.0-draft"` | 仅类型；不验证运行数据或协商范围 / Type only; neither validates runtime data nor negotiates ranges. |
| `DOC_SOURCE_MAP_RANGE_SOURCES` | 冻结的七项原语元组 / Frozen seven-item primitive tuple | 共享且运行时冻结，顺序见下 / Shared and runtime frozen; order below. |
| `DocSourceMapRangeSource` | 从元组派生的七类联合 / Seven-category union derived from the tuple | 仅类型，不含具体工具名或隐式other / Type only, without tool names or implicit other. |
| `DOC_SOURCE_MAP_END_BOUNDARIES` | 冻结的 `inclusive, exclusive, unknown` 元组 / Frozen tuple | 每条新范围的终点约定 / Endpoint convention on each new ranged reference. |
| `DOC_SOURCE_MAP_COLUMN_UNITS` | 冻结的 `utf16-code-unit, unicode-code-point, byte, unknown` 元组 / Frozen tuple | 每条新范围的列单位 / Column unit on each new ranged reference. |
| `DocSourceMapEndBoundary`, `DocSourceMapColumnUnit`, `DocSourceMapRangeConvention` | 仅类型闭集 / Type-only closed sets | 未知维度不授予精确定位 / Unknown dimensions do not certify exact locations. |
| `ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT` | `"ordinary-source-map-coordinate-profile"` | 独立逐原始槽位证据侧载身份 / Separate per-original-slot evidence sidecar identity. |
| `ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_CONTRACT_VERSION` | `"0.1.0-draft"` | 精确草案身份；不替换旧数值导航 / Exact draft identity; legacy numeric navigation remains separate. |
| `GENERATED_DOCUMENTATION_BINDING_CONTRACT` | `"generated-documentation-binding"` | 独立中性sidecar身份 / Independent neutral sidecar identity. |
| `GENERATED_DOCUMENTATION_BINDING_CONTRACT_VERSION` | `"0.3.0-draft"` | 当前绑定，只配文档映射1.1.0 / Current binding, paired only with map1.1.0. |
| `GENERATED_DOCUMENTATION_BINDING_0_2_0_CONTRACT_VERSION` | `"0.2.0-draft"` | 已公开前一绑定，只配映射1.0.0 / Previous published binding, paired only with map1.0.0. |
| `GENERATED_DOCUMENTATION_BINDING_LEGACY_CONTRACT_VERSION` | `"0.1.0-draft"` | 历史绑定，只配历史映射0.1.0-draft / Legacy binding, paired only with legacy map0.1.0-draft. |
| `GeneratedDocumentationBindingContractVersion` | `"0.3.0-draft" \| "0.2.0-draft" \| "0.1.0-draft"` | 仅类型，不等于绑定1.0稳定承诺 / Type only, without a binding1.0 stability promise. |

类别顺序为 `source-map, parser, compiler, adapter, manual, heuristic, unresolved`。它们描述**本引用最终定位所依据的机制**；具体工具用 `rangeSourceDetail` 表达，不从名称推断可信程度、置信度、源码访问权限或业务准确性。旧reader的开放来源字符串不因此变成当前类别。参见[来源模型](doc-source-map-provenance.md)。

Category order is `source-map, parser, compiler, adapter, manual, heuristic, unresolved`. Categories describe the reference's final locating mechanism. Tool names belong in `rangeSourceDetail` and imply no trust, confidence, source access or business accuracy. Legacy open provenance strings are separate from the current category union. See the [provenance model](doc-source-map-provenance.md).

## schema 导出 / Schema exports

所有schema使用JSON Schema Draft 2020-12。canonical身份的共同前缀为 `https://mandolin.github.io/HIA-Documentation/schemas/`。

All schemas use JSON Schema Draft 2020-12. Canonical identities share the prefix `https://mandolin.github.io/HIA-Documentation/schemas/`.

| 导出 / Export | 值或定义 / Value or definition |
| --- | --- |
| `DOC_SOURCE_MAP_SCHEMA_ID` | 前缀 + `doc-source-map-1.1.0.schema.json` / Prefix + filename. |
| `DOC_SOURCE_MAP_SCHEMA_VERSION` | `"1.1.0"`，等于当前映射contract根版本 / Matches the current map root version. |
| `DOC_SOURCE_MAP_JSON_SCHEMA` | 当前映射的共享结构定义 / Shared current map structure. |
| `ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_SCHEMA_ID` | 前缀 + `ordinary-source-map-coordinate-profile-0.1.0-draft.schema.json` / Prefix + filename. |
| `ORDINARY_SOURCE_MAP_COORDINATE_PROFILE_JSON_SCHEMA` | 独立逐槽位、原始字节摘要与无正文隐私结构；实际同点由严格reader判断 / Separate per-slot, raw-byte-digest and body-free privacy structure; the strict reader decides actual same-point anchors. |
| `GENERATED_DOCUMENTATION_BINDING_SCHEMA_ID` | 前缀 + `generated-documentation-binding-0.3.0-draft.schema.json` / Prefix + filename. |
| `GENERATED_DOCUMENTATION_BINDING_0_2_0_SCHEMA_ID` | 前缀 + `generated-documentation-binding-0.2.0-draft.schema.json` / Prefix + filename. |
| `GENERATED_DOCUMENTATION_BINDING_LEGACY_SCHEMA_ID` | 前缀 + `generated-documentation-binding-0.1.0-draft.schema.json` / Prefix + filename. |
| `GENERATED_DOCUMENTATION_BINDING_SCHEMA_VERSION` | `"0.3.0-draft"`，等于当前绑定contract根版本 / Matches the current binding root version. |
| `GENERATED_DOCUMENTATION_BINDING_JSON_SCHEMA` | 当前绑定独立图；map反向链接1.1.0，最低consumer0.3.0-draft / Independent current binding graph, map backlink1.1.0 and minimum consumer0.3.0-draft. |
| `GENERATED_DOCUMENTATION_BINDING_0_2_0_JSON_SCHEMA` | 前一绑定独立图；map反向链接1.0.0，最低consumer0.2.0-draft；历史原字节由分发资产固定 / Independent previous binding graph, with exact map1.0.0 backlink and minimum consumer0.2.0-draft; the distribution archive pins original bytes. |
| `GENERATED_DOCUMENTATION_BINDING_LEGACY_JSON_SCHEMA` | 历史绑定独立图；map反向链接及最低consumer均0.1.0-draft / Independent legacy binding graph, both backlink and minimum consumer0.1.0-draft. |

`$id` 是schema资源身份与引用基准，不会因导入常量就自动下载或读取源码。schema结构检查不代替owner对跨身份引用、重复身份、范围顺序、隐私和实际数据的检查。坐标侧载还必须校验实际普通map、文档map及获授权来源字节；详见[坐标证据契约](ordinary-source-map-coordinate-profile.md)。未知patch、预发行或build身份不自动协商；改变工件版本须走[显式协调迁移](generated-documentation-binding-contract.md)。

`$id` identifies a schema resource and reference base; importing a constant triggers neither downloads nor source reads. Structural checks do not replace owner checks for references, duplicates, ranges, privacy or actual data. The coordinate sidecar also requires actual ordinary-map, documentation-map and authorized source-byte checks; see the [coordinate evidence contract](ordinary-source-map-coordinate-profile.md). Unknown patch/prerelease/build identities are not negotiated; artifact upgrades use [explicit coordinated migration](generated-documentation-binding-contract.md).

## 所有权与修改 / Ownership and editing

| 值 / Value | TypeScript | 运行时 / Runtime |
| --- | --- | --- |
| 字符串常量 / String constants | 精确字面量 / Exact literals | 原语值不可变 / Immutable primitive values. |
| 来源类别元组 / Category tuple | 固定顺序readonly元组 / Ordered readonly tuple | 模块共享且Object.freeze / Module shared and frozen. |
| 五个schema对象 / Five schema objects | `as const`推断的readonly结构 / Readonly structure inferred with `as const` | 模块实例缓存共享，根/嵌套节点未深冻结 / Shared within a module instance; root/nested nodes are not deeply frozen. |
| `@hia-doc/schemas`查询结果 / Distribution reader results | 可变副本类型 / Mutable copy types | 每次独立深拷贝 / Fresh deep copies on each call. |

**不要直接修改共享schema导出。** TypeScript只读不提供运行时防篡改。需要工具局部注解时先深拷贝并显式选择可变消费类型；副本修改不回写模块或分发资产。当前/历史绑定图分开构造，不共享可变子节点。当前映射schema的来源enum引用冻结类别元组。

**Do not edit shared schema exports directly.** TypeScript readonly is not runtime tamper protection. Clone first and explicitly choose the consumer's mutable type for local annotations; editing a copy does not alter the module or distribution assets. Current and historical binding graphs share no mutable nodes. The current map schema's category enum references the frozen tuple.

```ts
import { DOC_SOURCE_MAP_JSON_SCHEMA } from "@hia-doc/source-linkage";

/** @lang zh-CN 工具本地副本，只追加显示标题，不改变canonical校验语义。 @lang en Tool-local copy adding a display title without changing canonical validation semantics. */
const localSchema: Record<string, unknown> = structuredClone(DOC_SOURCE_MAP_JSON_SCHEMA);
localSchema.title = "Documentation source map";
```

如需发布改变校验语义的自定义schema，应使用自己的身份，不能将改写图当作未改变的canonical定义。`@hia-doc/schemas` 的 `getHiaSchema(keyOrId)` 与 `listHiaSchemas()` 返回独立副本；无版本key查当前定义，完整历史ID查原历史定义，不静默升级或重定向。通过包导出子路径直接导入JSON不等同调用副本接口。参见[分发说明](schema-distribution.md)。

A custom published schema with changed validation semantics needs its own identity. `getHiaSchema(keyOrId)` and `listHiaSchemas()` in `@hia-doc/schemas` return independent copies: unversioned keys select current definitions, and exact historical ids select preserved definitions without silent upgrades. Direct JSON subpath imports are not copy-reader calls. See [schema distribution](schema-distribution.md).

此参考只覆盖上述常量与schema；其余validator、迁移、查询、跨生产器范围端点和资源边界需各自验收。schema对象不是验证执行器、来源认证或发布授权。

This reference covers the listed constants and schemas. Validators, migrations, queries, cross-producer endpoints and resource boundaries require their own verification. Schema objects are not validation executors, origin authentication or publication authorization.
