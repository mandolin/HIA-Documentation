/**
 * @file
 * @lang zh-CN 安装归档中的联合查询与LSP领域结果严格类型消费者。
 * @lang en Strict type consumer for combined querying and LSP domain results from installed archives.
 */
import { createDocSourceMapIndex, createOrdinarySourceMapIndex, querySourceLinkedPosition, type SourceLinkedLookupQuery, type SourceLinkedLookupResult } from "@hia-doc/source-linkage";
import { createHiaDocumentSourceMapIndexResult, createHiaLspService, type HiaDocumentSourceMapIndexResult, type HiaDocumentSourceMapStatus } from "@hia-doc/lsp";
// <lang><zh-CN>两个真实公开入口保持位置、领域状态及可选query关系，不引入transport错误类型。</zh-CN><en>The two real public entries retain position, domain-status and optional-query relationships without introducing transport error types.</en></lang>
const index = createDocSourceMapIndex({});
const query: SourceLinkedLookupQuery = { generatedPath: "dist/a.js", generatedPosition: { line: 1 }, originalSourcePath: "src/a.ts", originalPosition: { line: 1, column: 1 }, selector: "#a", symbolId: "symbol:a", symbolKind: "function" };
const combined: SourceLinkedLookupResult = querySourceLinkedPosition(index, createOrdinarySourceMapIndex({}), query);
const result: HiaDocumentSourceMapIndexResult = createHiaDocumentSourceMapIndexResult({ index, query: { symbolId: "symbol:a" }, uri: "file:///synthetic/a" });
const status: HiaDocumentSourceMapStatus = result.status;
const service = createHiaLspService();
service.getManagedDocSourceMapIndex("file:///synthetic/a", { sourcePath: "src/a.ts", position: { line: 1 } });
// @ts-expect-error Combined queries remain required.
querySourceLinkedPosition(index, createOrdinarySourceMapIndex({}));
// @ts-expect-error Position coordinates require numbers.
querySourceLinkedPosition(index, createOrdinarySourceMapIndex({}), { generatedPosition: { line: "1" } });
// @ts-expect-error Metadata filters do not admit null.
createHiaDocumentSourceMapIndexResult({ index, query: null, uri: "file:///synthetic/a" });
// @ts-expect-error Domain statuses form a closed union.
const badStatus: HiaDocumentSourceMapStatus = "query-failed";
// @ts-expect-error exactOptionalPropertyTypes excludes explicit undefined fields.
const badOptional: SourceLinkedLookupQuery = { generatedPosition: undefined };
// @ts-expect-error Internal projectors are not public package APIs.
import { prepareSourceLinkedQuery } from "@hia-doc/source-linkage";
void [combined, result, status, badStatus, badOptional, prepareSourceLinkedQuery];

