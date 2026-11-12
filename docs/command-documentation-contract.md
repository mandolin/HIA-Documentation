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
