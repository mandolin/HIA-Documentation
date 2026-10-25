# 文档源码映射来源与迁移

源码定义：`doc-source-map@1.0.0`。包版本与契约独立；npm `@hia-doc/source-linkage@0.1.1`不包含本文新增能力。
精确旧reader继续支持`0.1.0-draft`，原历史schema保留原字节。未知patch/minor、预发行及build版本不自动协商。

## 类别和具体来源

每个`sourceRef`/`artifactRef`使用闭集`rangeSource`；可选`rangeSourceDetail`保存非空白的具体来源。
一个manifest可含多个机制，顶层producer不能替代每个引用的来源。

```json
{
  "sourceId": "source:ts:calculator",
  "rangeSource": "compiler",
  "rangeSourceDetail": "typescript-compiler",
  "confidence": "medium"
}
```

| 类别 | 本引用最终定位依据 |
| --- | --- |
| `source-map` | 解码普通位置map得到位置 |
| `compiler` | 编译器API直接提供位置；内部使用解析器不改变此分类 |
| `parser` | 独立解析器的AST/location |
| `adapter` | 桥接已有文档/位置元数据 |
| `manual` | 人工明确声明 |
| `heuristic` | 估算或模式推断 |
| `unresolved` | 没有可用定位依据；必须`confidence: "none"` |

多步链在各引用/chain阶段分别表达；不为整条工具链选择一个类别。具体标签仅为被动说明：
不按其名称推导类别、置信度、权限或可信性，不启动工具，也不改变查询判定。
其它类别不推导confidence；正确来源标签本身不保证引用已经解析或位置准确。
未知新版类别拒绝。没有`other`/`unknown`隐式回退；新机制需要明确契约演进。

## 显式迁移

```js
import { migrateDocSourceMap } from "@hia-doc/source-linkage";

const result = migrateDocSourceMap(legacyManifest);
if (result.status === "migrated" || result.status === "already-current") {
  // 中文：新容器保留允许的数据，保存/发布仍由调用方显式决定。
  // English: New containers retain permitted data; callers explicitly decide persistence/publication.
  const currentManifest = result.manifest;
}
```

| 精确旧值 | 新类别 | 新具体来源 |
| --- | --- | --- |
| `typescript-compiler` | `compiler` | 原旧值 |
| `ordinary-source-map` | `source-map` | 原旧值 |
| `pug-location` | `parser` | 原旧值 |
| `htmdoc-bridge` | `adapter` | 原旧值 |

原来已使用通用类别的引用保留其类别与已声明细节。未知旧值仍可由旧reader读取，但不能猜测迁移；
缺来源、细节冲突、新版必要结构缺失、未解析置信度矛盾或隐私错误均拒绝转换，不返回局部工件。
调用方原对象与磁盘文件不改写；失败诊断不回显未知来源或源码正文。

`already-current`也返回独立容器。迭代复制支持深层扩展、共享无环数据和普通`__proto__`数据键，
不调用getter、toJSON或自有数组迭代器。非枚举数据不是JSON工件的序列化内容；
索引仍会预检隐藏容器以保护字段读取。Proxy副作用、恶意资源消耗和并发输入突变不受沙箱保护。

迁移输出是完整工件，保留开放JSON扩展及显式`embed`/`redacted`允许的源码正文；
索引/查询继续不包含源码正文。成功返回不表示允许公开发布，也不执行chain、读取source/sidecar或抓取网络。

## 冻结sidecar与验证边界

`generated-documentation-binding@0.1.0-draft`的反向引用固定指向旧版doc-source-map。
普通映射单独升级不能更新另一个工件。含该声明/绑定引用的旧映射拒绝单独迁移，
读取旧配对继续可用；组合时必须匹配真实映射版本。现有源码提供显式整组迁移，
将全部辅助工件一并升级至绑定`0.2.0-draft`与映射`1.0.0`；缺失、重复、断链或混配整组拒绝。
见[绑定契约与迁移](generated-documentation-binding-contract.md)。旧生产器输出继续可读。

新版索引检查必要结构、来源、显式字段、身份/范围及已有路径/隐私/引用边界；
`available`不是所有JSON Schema关键字或跨链图约束都通过的证明，输入类型也不是验证证明。
独立locale sidecar的contract/version不随普通映射升级。

## English summary

The current source definition separates a closed locating mechanism from optional per-reference origin detail.
The exact legacy reader preserves historical inputs. Explicit migration clones ordinary JSON, maps only reviewed
origins and refuses unknown/conflicting/incomplete inputs. Frozen binding-sidecar associations require coordinated
migration; matching IDs never substitute for matching versions. Source definitions, package releases and publication
permissions remain separate.
