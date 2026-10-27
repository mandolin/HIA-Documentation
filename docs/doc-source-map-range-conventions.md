# 文档源码范围约定 / Documentation source range conventions

`doc-source-map@1.1.0` 为每条带源码范围的 `entries[].sourceRefs[]` 声明终点与列单位。catalog 将当前源码契约定义标为 `stable-candidate`；契约版本、候选成熟度、npm 包版本和系统发行分别管理。公开的 `1.0.0` 和 `0.1.0-draft` 保持精确历史读取与各自原有查询行为。

`doc-source-map@1.1.0` declares endpoint and column units on each ranged `entries[].sourceRefs[]`. The catalog marks this source contract definition `stable-candidate`; contract versions, candidate maturity, npm package versions and system releases are managed separately. The published `1.0.0` and `0.1.0-draft` retain exact historical reading and their existing query behavior.

## 引用形状 / Reference shape

```json
{
  "sourceId": "source:example",
  "range": {
    "start": { "line": 3, "column": 2 },
    "end": { "line": 3, "column": 18 }
  },
  "rangeConvention": {
    "endBoundary": "exclusive",
    "columnUnit": "utf16-code-unit"
  },
  "rangeSource": "parser",
  "confidence": "high"
}
```

有 `range` 就必须有 `rangeConvention`；没有 `range` 就不能带该字段。`endBoundary` 是 `inclusive`、`exclusive` 或 `unknown`；`columnUnit` 是 `utf16-code-unit`、`unicode-code-point`、`byte` 或 `unknown`。两维分别允许 `unknown`，表示尚无可验证事实，不能从 `rangeSource`、文件扩展名或生产器名称猜测。已知列单位的范围须给出起止列；行号与列号均从 1 开始。

A ranged reference must carry `rangeConvention`; an unranged reference must omit it. Both dimensions may be `unknown` when the producer lacks evidence. A known column unit requires columns at both endpoints. Lines and columns are one based.

## 位置查询 / Positional lookup

`queryDocSourceMapIndex()` 对 `1.1.0` 的精确位置筛选需要调用方提供 `sourcePath`、显式 `position.line`、`position.column` 和相同的 `columnUnit`。终点或单位为 `unknown`、单位不一致、列缺失时，该引用不产生精确命中；不会读取正文、转换编码或退化成宽泛命中。排除终点的零长度范围没有位置命中，包含终点的同点范围可命中该点。未提供位置的符号、路径和工件关系查询仍可展示来源事实。

For `1.1.0`, exact position matching requires the caller's explicit column and matching `columnUnit`. Unknown or mismatched conventions and missing columns produce no exact hit; they do not trigger content reads or a broader fallback. An exclusive zero length range matches no position, while an inclusive point can match its coordinate. Metadata queries remain available without a position.

`querySourceLinkedPosition()` 的文档语义阶段使用调用方显式的 `originalColumnUnit`；ordinary source map 的位置不会自动证明文档范围单位。旧两版继续按原规则双端包含，省略列按 1 比较；新查询字段不会回写旧工件。

The combined query uses an explicit `originalColumnUnit` for its documentation semantic stage. An ordinary source map position does not certify a documentation range unit. The two older versions retain inclusive endpoints and the previous omitted-column default of 1.

## 显式迁移 / Explicit migration

`migrateDocSourceMap()` 面向 `1.1.0` 时，旧工件的每条带范围引用都需调用方提供一条 `rangeEvidence`：

```ts
const result = migrateDocSourceMap(oldMap, {
  rangeEvidence: [{
    entryIndex: 0,
    sourceRefIndex: 0,
    rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }
  }]
});
```

索引指向输入数组位置，可区分相同 `sourceId` 的多条范围。没有证据、重复/多余证据或结构不合法时，迁移拒绝并且不返回局部新工件。旧开放扩展若已占用 `rangeConvention` 且带额外字段或冲突值，迁移也拒绝，避免覆盖时静默丢失扩展。调用方可明确声明 `unknown`，但后续位置查询仍不能把它当作精确定位。生成式绑定的整组迁移另需处理其独立 `sourceRef`；参见[生成式文档绑定契约](generated-documentation-binding-contract.md)。迁移成功不是源码访问、公开或写盘授权。

Each evidence item addresses an input array position so repeated source IDs remain distinct. Missing, duplicate, extra or malformed evidence refuses migration without a partial new artifact. A same-named older open extension with extra fields or conflicting values is also refused rather than overwritten. Explicit `unknown` remains nonmatching for exact positions. Binding bundles contain independent source references and require their own evidence. Successful migration grants no source access, publication or disk write authority.
