/**
 * @file
 * @lang zh-CN 已安装普通位置查询公共类型的严格正反例；值域由运行时测试检查。
 * @lang en Strict positive/negative consumers for installed ordinary lookup public types; runtime tests check numeric domains.
 */
import { createOrdinarySourceMapIndex, findOriginalPositionForGenerated, findGeneratedPositionForOriginal, findAllGeneratedPositionsForOriginal, querySourceLinkedPosition, createDocSourceMapIndex, type OrdinarySourceMapBias, type OrdinarySourceMapIndexOptions, type OrdinarySourceMapIndex, type OrdinarySourceMapLookupOptions, type SourceMapOriginalPosition, type SourceMapGeneratedPosition, type SourceMapOriginalLookupResult, type SourceMapGeneratedLookupResult, type SourceMapAllGeneratedLookupResult, type SourceLinkedLookupQuery, type SourceLinkedLookupResult } from "../src/index.js";
// <lang><zh-CN>真实包入口保持可省略列、偏置和三种查找结果的既有类型关系。</zh-CN><en>The actual package entry retains optional columns, biases and existing relationships among the three lookup results.</en></lang>
const bias: OrdinarySourceMapBias = "least-upper-bound";
const options: OrdinarySourceMapIndexOptions = { path: "dist/a.js.map", artifactPath: "dist/a.js" };
const lookup: OrdinarySourceMapLookupOptions = { bias };
const index: OrdinarySourceMapIndex = createOrdinarySourceMapIndex({}, options);
const forward: SourceMapOriginalLookupResult = findOriginalPositionForGenerated(index, { line: 1 }, lookup);
const reverse: SourceMapGeneratedLookupResult = findGeneratedPositionForOriginal(index, "src/a.ts", { line: 1, column: 1 });
const all: SourceMapAllGeneratedLookupResult = findAllGeneratedPositionsForOriginal(index, "src/a.ts", { line: 1 }, lookup);
const original: SourceMapOriginalPosition | undefined = forward.original;
const generated: SourceMapGeneratedPosition | undefined = reverse.generated;
const query: SourceLinkedLookupQuery = { generatedPosition: { line: 1 } };
const combined: SourceLinkedLookupResult = querySourceLinkedPosition(createDocSourceMapIndex({}), index, query);
// @ts-expect-error Bias names form an exact public union.
const badBias: OrdinarySourceMapBias = "nearest";
// @ts-expect-error HIA coordinates are numeric.
findOriginalPositionForGenerated(index, { line: "1" });
// @ts-expect-error Mapping success is optional and must be narrowed.
const requiredOriginal: SourceMapOriginalPosition = forward.original;
// @ts-expect-error Generated lookup success must also be narrowed.
const requiredGenerated: SourceMapGeneratedPosition = reverse.generated;
// @ts-expect-error Status names are closed.
const badStatus: SourceLinkedLookupResult["status"] = "success";
// @ts-expect-error Body-free projection is internal, not a root API.
import { createBodyFreeOrdinaryTraceMap } from "../src/index.js";
// @ts-expect-error Reverse source paths remain primitive strings, not coercible numbers.
findGeneratedPositionForOriginal(index, 42, { line: 1 });
// @ts-expect-error Lookup options retain the exact declared bias union.
findAllGeneratedPositionsForOriginal(index, "src/a.ts", { line: 1 }, { bias: "nearest" });
// @ts-expect-error Runtime rejection does not widen typed positions to null.
findOriginalPositionForGenerated(index, null);
void [options, lookup, index, forward, reverse, all, original, generated, query, combined, badBias, requiredOriginal, requiredGenerated, badStatus, createBodyFreeOrdinaryTraceMap];
