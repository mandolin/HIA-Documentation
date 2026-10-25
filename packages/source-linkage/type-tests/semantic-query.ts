/**
 * @file
 * @lang zh-CN 真实安装包文档语义查询类型正反例；运行时值域另有回归。
 * @lang en Positive/negative semantic-query type consumers for installed packages; runtime regressions cover value domains separately.
 */
import { createDocSourceMapIndex, findDocSourceMapEntriesByArtifact, findDocSourceMapEntriesBySource, findDocSourceMapEntriesBySymbol, queryDocSourceMapIndex, type DocSourceMapQuery, type DocSourceMapQueryResult, type DocSourceMapIndexedEntry } from "../src/index.js";
// <lang><zh-CN>公开入口保持六项可选筛选与返回结果关系，查询无需普通位置map。</zh-CN><en>The public entry retains six optional filters and result relationships without requiring an ordinary map.</en></lang>
const index = createDocSourceMapIndex({});
const query: DocSourceMapQuery = { artifactPath: "dist/a.js", selector: "#a", sourcePath: "src/a.ts", position: { line: 1 }, symbolId: "symbol:a", symbolKind: "function" };
const result: DocSourceMapQueryResult = queryDocSourceMapIndex(index, query);
const entries: DocSourceMapIndexedEntry[] = findDocSourceMapEntriesBySource(index, "src/a.ts", { line: 1, column: 1 });
// @ts-expect-error Known identity filters require strings.
queryDocSourceMapIndex(index, { symbolId: 1 });
// @ts-expect-error HIA lines require numbers.
findDocSourceMapEntriesBySource(index, "src/a.ts", { line: "1" });
// @ts-expect-error Optional selector does not admit null.
findDocSourceMapEntriesByArtifact(index, "dist/a.js", null);
// @ts-expect-error Symbol identity is mandatory.
findDocSourceMapEntriesBySymbol(index);
// @ts-expect-error exactOptionalPropertyTypes excludes explicitly undefined properties.
const strictOptional: DocSourceMapQuery = { sourcePath: undefined };
// @ts-expect-error The internal projector is not a package API.
import { prepareDocSourceMapQuery } from "../src/index.js";
void [result, entries, strictOptional, prepareDocSourceMapQuery];
