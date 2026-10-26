/**
 * @file
 * @lang zh-CN 七个普通位置索引及结果接口的严格类型消费者，保持原可变字段与状态/正文边界。
 * @lang en Strict type consumer for seven ordinary index/result interfaces, retaining mutable fields and state/body boundaries.
 */
import { createDocSourceMapIndex, createOrdinarySourceMapIndex, findOriginalPositionForGenerated, findGeneratedPositionForOriginal, findAllGeneratedPositionsForOriginal, querySourceLinkedPosition,
  type OrdinarySourceMapIndex, type SourceMapOriginalPosition, type SourceMapGeneratedPosition, type SourceMapOriginalLookupResult, type SourceMapGeneratedLookupResult, type SourceMapAllGeneratedLookupResult, type SourceLinkedLookupResult } from "../src/index.js";

// <lang><zh-CN>失败索引也保持同一公开类型；消费者以noEmit编译，不执行数组访问。</zh-CN><en>Failed indexes retain the same public types; the noEmit consumer never executes array access.</en></lang>
const index: OrdinarySourceMapIndex = createOrdinarySourceMapIndex({});
const forward: SourceMapOriginalLookupResult = findOriginalPositionForGenerated(index, { line: 1 });
const reverse: SourceMapGeneratedLookupResult = findGeneratedPositionForOriginal(index, "src/a.ts", { line: 1 });
const all: SourceMapAllGeneratedLookupResult = findAllGeneratedPositionsForOriginal(index, "src/a.ts", { line: 1 });
const combined: SourceLinkedLookupResult = querySourceLinkedPosition(createDocSourceMapIndex({}), index, {});
const original: SourceMapOriginalPosition = reverse.original;
const generated: SourceMapGeneratedPosition = forward.generated;
// <lang><zh-CN>保留已存在的可变类型能力，不鼓励篡改已验证的消费对象。</zh-CN><en>Retain existing mutable type capabilities without encouraging tampering during validated consumption.</en></lang>
index.sources.push("src/public.ts");
original.position.column = 1;
generated.artifactPath = "dist/public.js";
all.generated.push({ position: { line: 1 } });
combined.entries.push(combined.entries[0]!);
// @ts-expect-error 中文：来源列表保持string列表。 English: Source lists remain string lists.
index.sources.push(1);
// @ts-expect-error 中文：可选实例保持实际TraceMap类型。 English: Optional instances retain the actual TraceMap type.
index.traceMap = {};
// @ts-expect-error 中文：普通结果不引入文档版本状态。 English: Ordinary results do not acquire documentation-version states.
forward.status = "unsupported-version";
// @ts-expect-error 中文：原始位置不携带正文。 English: Original positions carry no source body.
original.sourceBody;
// @ts-expect-error 中文：生成行保持number。 English: Generated lines remain numbers.
generated.position.line = "1";
// @ts-expect-error 中文：原始路径保持string。 English: Original paths remain strings.
reverse.original.sourcePath = 1;
// @ts-expect-error 中文：全结果保持数组。 English: All-generated output remains an array.
all.generated = { position: { line: 1 } };
// @ts-expect-error 中文：query保持已声明对象类型。 English: Query echoes retain the declared object type.
combined.query = null;
void [index, forward, reverse, all, combined, original, generated];
