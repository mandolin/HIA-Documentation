/**
 * @file
 * @lang zh-CN 三个文档映射函数的同步结果/unknown输入与消费边界类型，不执行示例。
 * @lang en Types for synchronous results, unknown inputs and consumption boundaries of three map functions, without executing examples.
 */
import type { HiaDiagnostic } from "@hia-doc/core";
import { createDocSourceMapIndex, validateDocSourceMap, migrateDocSourceMap, type DocSourceMapIndex, type DocSourceMapMigrationResult } from "../src/index.js";
// <lang><zh-CN>unknown在运行时校验，三入口分别返回索引、诊断列表和迁移结果。</zh-CN><en>Unknown input is checked at runtime; the entries return an index, diagnostic list and migration result respectively.</en></lang>
const input: unknown = null;
const index: DocSourceMapIndex = createDocSourceMapIndex(input);
const diagnostics: HiaDiagnostic[] = validateDocSourceMap(input);
const result: DocSourceMapMigrationResult = migrateDocSourceMap(input);
// @ts-expect-error <lang><zh-CN>索引构建不是异步入口。</zh-CN><en>Index construction is synchronous.</en></lang>
const asyncIndex: Promise<DocSourceMapIndex> = createDocSourceMapIndex(input);
// @ts-expect-error <lang><zh-CN>校验不是异步入口。</zh-CN><en>Validation is synchronous.</en></lang>
const asyncDiagnostics: Promise<HiaDiagnostic[]> = validateDocSourceMap(input);
// @ts-expect-error <lang><zh-CN>迁移不是异步入口。</zh-CN><en>Migration is synchronous.</en></lang>
const asyncResult: Promise<DocSourceMapMigrationResult> = migrateDocSourceMap(input);
// @ts-expect-error <lang><zh-CN>索引不是诊断列表。</zh-CN><en>An index is not a diagnostic list.</en></lang>
const wrongIndex: HiaDiagnostic[] = index;
// @ts-expect-error <lang><zh-CN>诊断列表没有索引状态。</zh-CN><en>A diagnostic list has no index status.</en></lang>
diagnostics.status;
// @ts-expect-error <lang><zh-CN>迁移结果不提供自动加载或发布方法。</zh-CN><en>Migration results offer no automatic load/publish method.</en></lang>
result.load();
// @ts-expect-error <lang><zh-CN>内部current字段收集器不是根公开API。</zh-CN><en>The internal current-field collector is not a public root API.</en></lang>
import { collectCurrentDocSourceMapIssues } from "../src/index.js";
// @ts-expect-error <lang><zh-CN>可省略选项不接受null。</zh-CN><en>Omittable options do not admit null.</en></lang>
createDocSourceMapIndex(input, null);
/** @lang zh-CN 状态检查不能取代可选manifest存在检查。 @lang en Status checks do not replace optional-manifest presence checks. */
function consume(value: DocSourceMapMigrationResult): void {
  if (value.status === "migrated") {
    // @ts-expect-error <lang><zh-CN>普通interface不会按status收窄可选manifest。</zh-CN><en>An ordinary interface does not narrow optional manifest by status.</en></lang>
    const map: Record<string, unknown> = value.manifest;
    void map;
  }
}
void [index, diagnostics, result, consume, collectCurrentDocSourceMapIssues];
