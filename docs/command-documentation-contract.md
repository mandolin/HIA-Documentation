# Command documentation contract

`command-documentation@0.1.0-draft` describes command-line interfaces as versioned JSON. `@hia-doc/core` owns its self-contained schema, distributed by `@hia-doc/schemas` under the `command-documentation` catalog key. Package availability follows the [package compatibility guide](package-v1-migration.md).

中文。命令描述采用独立草案版本，记录包归属、调用名、参数、字段级中英内容、默认规则和来源。结构定义由core拥有，schemas包分发相同定义。契约版本与包版本分别匹配。

## Schema access

```js
import { COMMAND_DOCUMENTATION_JSON_SCHEMA } from "@hia-doc/core";
import { getHiaSchema } from "@hia-doc/schemas";

const schema = getHiaSchema("command-documentation");
```

A JSON Schema 2020-12 validator can compile the definition offline. Existing core i18n definitions are embedded, preserving their independent model versions.

中文。schema内嵌现有core字段语言模型定义，可离线编译。字段模型版本保持独立身份。

## Structure

| Field | Meaning |
| --- | --- |
| `contract`, `contractVersion` | Exact `command-documentation` and `0.1.0-draft` |
| `owner` | Original package name and package-version declaration |
| `sources` | Explicit relative paths, source identities, languages and original-byte SHA-256 |
| `commands` | Ordered roots, groups and leaves, with executable and path tokens |
| `options`, `positionals` | Ordered parameters, types, required/repetition declarations and defaults |
| `i18n` | Existing core field i18n with actual `zh-CN` and `en` text |
| `displayVersion` | Independent package, runner, artifact or absent version identity |
| `parsing` | Recorded help precedence and unknown-option policy |
| `effects`, `exitCodes`, `examples` | Declared effects, bilingual exit meanings and public-safe examples |
| `evidence` | Per-field source identity, optional one-based range and explicit range convention |

中文。命令与参数内各自记录字段来源。根、组、叶及别名分别保留身份，多个调用名可关联同一实现。显示版本可采用独立工件版本，例如安装包与交接工件版本不同。

## Defaults and localization

`defaultRule.kind` is `literal`, `conditional`, `runtime` or `not-applicable`. Literal rules require a `value`, preserving `false`, `0` and `null`. Conditional rules require nonempty `conditions` naming locale-field explanations. Semantic consumers resolve these field keys and compare defaults with configuration and execution code.

Every supplied i18n field includes nonblank Chinese and English text. `summary` and `description` are required. Other semantic fields retain exact keys. Consumers additionally check field-path consistency, locale membership and translation quality.

中文。字面量、条件默认、运行时决定和不适用分别表示。条件键指向语言字段。结构校验要求实际中英正文，语义读取层还需核字段关联、语言关系、译文和真实默认规则。

## Source precision and consumption

Source paths are safe-relative POSIX paths interpreted against authorized roots. Evidence with a range requires `rangeConvention`, following documentation source-map 1.1 values. Known column units require both columns. Unknown precision may retain line-only ranges.

Schema validation checks JSON structure. Consumers also verify unique identities, alias closure and cycles, source references, field relationships, range order, actual source digests, parameter declarations and runtime behavior. Metadata and examples remain data throughout validation.

中文。结构校验之外，还须核重复身份、别名闭合/循环、来源引用和实际字节、字段关联、范围顺序及真实解析行为。来源根授权及公开隐私复核由实际消费宿主执行。

## Semantic reading and pure projection

The source candidate exports `validateCommandDocumentation(value)` and asynchronous `produceCommandDocumentation(value, options)` from the normal `@hia-doc/core` root. Node.js 22 and 24 provide the native Web Crypto SHA-256 implementation used by the producer.

中文。源码候选新增语义读取与异步纯投影。调用者先在授权边界内取得来源原字节，并从实际解析声明提取观察。core接收内存数据，逐项比较来源摘要、参数名称、类型及短名。观察提取器的正确性、实际默认值、运行行为和译文质量由宿主复核。

```ts
import {
  produceCommandDocumentation,
  validateCommandDocumentation,
  type CommandDocumentation,
  type CommandDocumentationDeclarationObservation,
} from "@hia-doc/core";

// <lang><zh-CN>输入由宿主完成授权读取及解析声明提取。</zh-CN><en>The host supplies authorized source reads and extracted parser declarations.</en></lang>
declare const description: CommandDocumentation;
declare const sourceBytes: ReadonlyMap<string, Uint8Array>;
declare const declarations: CommandDocumentationDeclarationObservation[];

const diagnostics = validateCommandDocumentation(description);
const result = await produceCommandDocumentation(description, {
  sourceBytes,
  declarations,
});
if (result.status === "ready") {
  // <lang><zh-CN>标准文档可交给现有渲染器或写成JSON供hia docs build使用。</zh-CN><en>The standard document can enter existing renderers or be serialized for hia docs build.</en></lang>
  console.log(result.document);
}
```

The reader checks ordinary JSON, closed domain shapes, core locale semantics, unique source/command/parameter identities, unique executable/path tuples, option names and short flags, exit codes, package-version consistency, alias closure/cycles and evidence relationships. Positional labels may repeat when their identities differ. Named observations match by name, positional observations by order. Every described command needs an observation whose nonempty `sourceDigests` map names sources in the artifact with matching digests. Extra command observations may accompany a package-wide observation table.

中文。读取层拒绝访问器、序列化钩子、循环及非JSON值，诊断使用固定消息和索引路径。来源与命令身份分别唯一，参数身份在本命令内唯一。位置参数以身份及顺序区分，可使用重复显示名。宿主观察的来源摘要需与本工件匹配，宿主负责证明观察确由这些来源提取。Proxy反射行为不构成沙箱。

Field evidence uses exact local property keys or locale-field keys. `i18n.fields.<key>` explicitly selects a locale field, retaining dots inside the key. Bare keys select an existing object property first, otherwise an exact locale field. Evidence covers each supplied domain property and locale field. Identity, i18n and evidence containers, and parameter arrays are governed by their own declaration graph. Conditional default keys resolve against the parameter's own locale fields.

中文。证据按实存领域字段与语言字段核覆盖。`id`、`i18n`、`evidence`、`options`、`positionals`容器不要求重复绑定，参数本身逐字段绑定。显式语言前缀可消除结构字段重名。范围顺序独立核验，缺列不会推测为第一列。

| Result | Meaning |
| --- | --- |
| `ready` | Intrinsic validation, all supplied source-byte digests and required host declaration observations matched, with a fresh HiaDocument |
| `incomplete` | Missing field evidence, source bytes, observations or digest capability, with diagnostics |
| `refused` | Invalid structures/relationships or conflicting bytes/observations, with diagnostics |

中文。只有`ready`携带文档。调用开始时同步复制描述、观察与所有清单内来源字节，隔离异步等待期间的后续修改。原字节与观察原文留在宿主内存，文档保留完整原描述快照，包括默认值、效果、退出码、例子及范围约定。

Projection creates group, command and parameter symbols with original signatures and bilingual fields. Hierarchy follows the nearest explicitly declared ancestor group. Aliases retain separate identities and link to their canonical target. All original facts remain under `document.metadata.commandDocumentation.artifact`. The verification metadata records `sourceBytes: "matched"`, `declarationObservations: "host-observation-matched"` and `rangeCoordinates: "declared"`.

中文。通用来源只输出签名或参数名称所声明的行锚点，完整列与终点约定仍在快照中。行列与源码实际字符的精确对应须经地图链另核。现有渲染器可消费标准文档，命令专用页面及终端帮助随实际CLI采用继续实施。投影就绪仅表示本次内存核验及投影完成。
