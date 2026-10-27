# 普通源码映射坐标证据契约

`ordinary-source-map-coordinate-profile@0.1.0-draft` 是独立的、无正文的 JSON 侧载，用于说明一份普通 source map 的**原始 section/source 槽位**采用什么列单位，并把该槽位绑定到同一次构建的文档源码映射和来源版本。它不修改 ECMA-426 `.map`、`doc-source-map@1.1.0` 或旧查询接口。

This separate draft sidecar records column-unit evidence for each original section/source slot. It does not change ECMA-426 maps, documentation maps, or legacy lookups.

## 身份与分发

| 项目 | 当前值 |
| --- | --- |
| `contract` | `ordinary-source-map-coordinate-profile` |
| `contractVersion` | `0.1.0-draft`，仅精确匹配 |
| schema `$id` | `https://mandolin.github.io/HIA-Documentation/schemas/ordinary-source-map-coordinate-profile-0.1.0-draft.schema.json` |
| owner | `@hia-doc/source-linkage` |
| 快照分发 | `@hia-doc/schemas/ordinary-source-map-coordinate-profile.schema.json` |

包版本、契约版本和网站部署状态独立管理。此草案尚不是正式 `1.0.0` 承诺；`@hia-doc/schemas` 只分发 owner 的结构快照，实际校验由 owner 的严格读取器负责。

## Wire 字段

根对象只允许 `contract`、`contractVersion`、`id`、`ordinaryMap`、`documentationMap`、`sourceSlots` 和 `privacy`。未知字段或未知根版本不自动协商。

所有侧载身份字段（根 `id`、普通 map ID、生成工件 ID、文档 map ID、来源 ID）均采用最长 512 字符的不透明 ASCII token：英数字起首，后续仅允许英数字、点、下划线、冒号与连字符。它们不承载路径或 URL；绝对路径、UNC、带凭据 URL、空白及换行均被拒绝。此限制只属于新坐标侧载，不回写旧文档 map 的 ID 语法。

严格查询的 `entryId` 遵守 `doc-source-map@1.1.0` 的非空字符串身份规则，因此合法条目 ID 中的 `~` 等字符可原样匹配；未签发的文档来源、工件、`mapsTo` 目标与引用身份也不因侧载 token 词法而被整图拒绝。查询的 `sourceId` 必须与已签发的侧载槽位身份一致，仍采用上述 ASCII token；摘要、原始槽位、实际来源字节与文档关系的核验不放宽。

| 字段 | 含义 |
| --- | --- |
| `ordinaryMap.sourceMapId` | 同一份文档 map 的 `sourceMaps[].id`；普通 map 实际段来自此工件。 |
| `ordinaryMap.artifactId` | 同一条 `sourceMaps[].mapsFrom` 指向的生成 CSS/JS 工件身份；不要求文档 map 为 `.map` 文件另建 `artifacts[]` 项。路径文字不能替代字节或槽位证明。 |
| `ordinaryMap.digest` | **实际消费的**普通 map 原始字节 SHA-256。 |
| `documentationMap.id` / `contractVersion` / `digest` | 同一份 `doc-source-map@1.1.0` 的根身份、精确版本和实际原始字节 SHA-256。 |
| `sourceSlots[].sectionIndex` | 普通 map 为 `null`；非嵌套内嵌 section 使用其原始零基序号。 |
| `sourceSlots[].sourceIndex` | 对应普通 map 或该 section 内 `sources` 的原始零基槽位；`null`、空字符串和重复路径也占原序号，但 `null`／空字符串槽位不能得到已核状态。重复路径不能靠路径文字合并。 |
| `sourceSlots[].sourceId` | 匹配文档 map `sources[].id` 与被查询的 `sourceRef.sourceId`。 |
| `sourceSlots[].columnUnit` | `utf16-code-unit`、`unicode-code-point`、`byte` 或 `unknown`；不可按文件扩展名推断。 |
| `sourceSlots[].sourceRevision` | 公开安全的不透明版本标签，限英数字起首及英数字、点、下划线、冒号、连字符，最长 256 字符；单独不能证明内容一致。 |
| `sourceSlots[].sourceByteDigest` | 获授权读取的来源原始文件字节 SHA-256。 |
| `sourceSlots[].sourceTextEncoding` / `sourceTextTransform` | 本草案固定为 `utf-8` / `none`；严格 UTF-8 解码，保留原有 BOM 对应的 U+FEFF 和 CRLF，不做换行折叠。 |
| `sourceSlots[].sourceTextDigest` | `representation` 固定 `decoded-utf16-code-units`；校验逻辑字符串的 UTF-16 代码单元序列。 |
| `privacy.sourcesContentPolicy` | 固定 `none`；禁止在侧载嵌入 `sourcesContent` 或源码正文。 |

所有摘要对象使用 `algorithm: "sha256"` 与 `value`：后者是 **32 字节摘要本身**的 RFC 4648 canonical base64，长度 44，末尾一个 `=`。`sourceTextDigest` 的 SHA-256 输入是严格 UTF-8 解码结果中，每个 UTF-16 代码单元按**小端两字节**顺序写出的字节串；不再添加 BOM。它与原始文件字节摘要各有用途，不能互相替代。只有编译器和文档引用确实基于这份逻辑文本时，生产者才可声明该槽位证据。

`sourceSlots` 最多 4096 条；侧载原始输入上限 2 MiB，普通 map、文档 map及每份获授权来源原始输入各 16 MiB；同次查询最多 4096 份来源输入，总原始来源字节最多 64 MiB。JSON Schema 约束结构及数组项数；原始字节大小、重复槽位、跨身份引用和摘要由 owner 读取器检查。未列出的槽位没有证据；列出的 `unknown` 单位也不能变成精确锚点。

## 严格判定与兼容

严格查询必须核对同一次消费的三类实际字节：普通 map、文档 map、获准读取的来源原始文件。来源文件没有读取权限时不发起网络请求，也不凭侧载自称的摘要认定通过。读取器继续核对原始 section/source 槽位、来源身份与版本、文档引用范围及单位、**实际普通映射段的原始起点**。只有请求点与该段原始行列完全相等且无歧义，才可产生 `exact-anchor`。GLB/LUB 的更早或更晚导航点、仅落在文档范围内的位置、未知单位及相同路径的不同槽位均不构成同点证据。

`sourceId` 与逻辑文本来源关系由**受信任的同次生产者**声明，读取器用实际字节摘要与槽位约束核对声明，但无法从恶意生产者自填的地图和侧载中以密码学方式独立证明其真实生成来历。宿主应只接受受信任生产者的同次工件。原始 `sectionIndex/sourceIndex` 是槽位身份；普通 map 的 `sources[]` 路径字符串即使与文档 map 路径不同也不应按文本相等与否推断身份，Vue 等链可能使用不同相对基准。

**信任边界：**普通 map 不自带“这个原始槽位由哪份源码字节生成”的可验证声明。侧载是同轮生产者／获授权构建宿主对槽位、文档来源 ID 和逻辑文本版本的明确断言；读取器核对收到的实际字节、文档引用、工件关系及段坐标，但不能独立证明一个恶意生产者是否真的用那份源码编译。普通图 `sources[]` 的文字定位可与文档来源相对路径采用不同基准，尤其在 Vue 现有产物中如此，故仅比较路径字符串既会误拒合法槽位，也不能替代同轮证据。跨信任边界的来源认证或恶意生产者防护需要后续单独设计；`exact-anchor` 仅在已授权且信任生产者断言的宿主范围内成立。

新严格入口允许本地、非嵌套、内嵌的 section；外部 URL section、嵌套 section、非法偏移和无法还原原始槽位的展平结果不获得精确状态。旧普通 map API 对 sectioned map 的原有拒绝和旧数值导航结果不因此改变。没有普通 map 的文档生产链保持纯文档语义，不虚构坐标证据。

摘要可对低熵源码形成等值猜测，发布侧载之前仍需 public-safe 审查。侧载中不放绝对路径、UNC 路径、带凭据 URL、来源正文或私有诊断；实际来源访问必须由宿主显式授权并限制在其根目录内。

相关契约：[文档源码映射范围约定](doc-source-map-range-conventions.md)、[源码映射查询](doc-source-map-query.md)、[schema 分发](schema-distribution.md)。
