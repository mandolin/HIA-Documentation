/**
 * @file
 * @lang zh-CN 四个普通位置入口的严格类型消费者；编译但不运行。
 * @lang en Strict type consumer for four ordinary-position entries; compiled without execution.
 */
import { createOrdinarySourceMapIndex, findOriginalPositionForGenerated, findGeneratedPositionForOriginal, findAllGeneratedPositionsForOriginal, type SourceMapOriginalLookupResult, type SourceMapGeneratedLookupResult, type SourceMapAllGeneratedLookupResult } from "../src/index.js";

// <lang><zh-CN>unknown输入有运行时边界；可选列和显式偏置沿用原API。</zh-CN><en>Unknown input has a runtime boundary; optional columns and explicit biases retain the original API.</en></lang>
const index = createOrdinarySourceMapIndex({ version: 3, sources: [], mappings: "" });
const forward: SourceMapOriginalLookupResult = findOriginalPositionForGenerated(index, { line: 1 });
const reverse: SourceMapGeneratedLookupResult = findGeneratedPositionForOriginal(index, "src/A.ts", { line: 1 }, { bias: "least-upper-bound" });
const all: SourceMapAllGeneratedLookupResult = findAllGeneratedPositionsForOriginal(index, "src/A.ts", { line: 1 });
void [forward, reverse, all];
// @ts-expect-error 创建路径必须为string。 Creation paths must be strings.
createOrdinarySourceMapIndex({}, { path: 1 });
// @ts-expect-error exactOptionalPropertyTypes不接受显式undefined字段。 Exact optional fields reject explicit undefined.
createOrdinarySourceMapIndex({}, { artifactPath: undefined });
// @ts-expect-error 行是必要数字。 A numeric line is required.
findOriginalPositionForGenerated(index, {});
// @ts-expect-error 列不能为string。 Columns cannot be strings.
findOriginalPositionForGenerated(index, { line: 1, column: "1" });
// @ts-expect-error 偏置仅允许两种值。 Only two biases are accepted.
findOriginalPositionForGenerated(index, { line: 1 }, { bias: "nearest" });
// @ts-expect-error 反向源码路径必须为string。 Reverse source paths must be strings.
findGeneratedPositionForOriginal(index, 1, { line: 1 });
// @ts-expect-error 全部查找仍需原始位置。 All-position lookup still requires an original position.
findAllGeneratedPositionsForOriginal(index, "src/A.ts");
// @ts-expect-error 数组结果不是单个坐标。 Array results are not a single coordinate.
const one: { line: number } = all.generated;
void one;
