/**
 * @file
 * @lang zh-CN 两个公开接口四字段的严格类型消费者；保留可写性与非判别接口能力，不执行这些示例。
 * @lang en Strict consumer for four fields in two public interfaces, retaining mutability and nondiscriminated-interface capabilities without executing examples.
 */
import { createDocSourceMapIndex, validateDocSourceMap, migrateDocSourceMap, type DocSourceMapIndexOptions, type DocSourceMapMigrationResult } from "../src/index.js";

// <lang><zh-CN>选项可写且可省略，额外字段通过结构化变量赋值保留现有TS能力。</zh-CN><en>Options remain writable/omittable, and structural variable assignment retains existing TypeScript handling of extra fields.</en></lang>
const options: DocSourceMapIndexOptions = {};
options.path = "synthetic/context.json";
delete options.path;
const extended = { path: "context.json", ignored: true };
const compatible: DocSourceMapIndexOptions = extended;
createDocSourceMapIndex(null, undefined);
validateDocSourceMap(null, compatible);
const result: DocSourceMapMigrationResult = migrateDocSourceMap(null, options);
// <lang><zh-CN>四状态是字段联合；可选manifest并不与状态组成判别联合，人工构造仍可不配套。</zh-CN><en>The status field is a four-literal union; optional manifest is not tied to it as a discriminated union, so manual construction still permits unmatched combinations.</en></lang>
const statuses: DocSourceMapMigrationResult["status"][] = ["migrated", "already-current", "invalid", "unsupported-version"];
const manuallyIncomplete: DocSourceMapMigrationResult = { status: "migrated", diagnostics: [] };
const manuallyMismatched: DocSourceMapMigrationResult = { status: "invalid", manifest: {}, diagnostics: [] };
result.status = "invalid";
result.diagnostics = [];
result.manifest = { extension: true };
delete result.manifest;
// @ts-expect-error <lang><zh-CN>严格可选属性不接纳显式undefined，运行准入另有预检规则。</zh-CN><en>Strict optional properties reject explicit undefined; runtime admission has its own preflight rules.</en></lang>
const undefinedPath: DocSourceMapIndexOptions = { path: undefined };
// @ts-expect-error <lang><zh-CN>路径不是null。</zh-CN><en>Path is not null.</en></lang>
const nullPath: DocSourceMapIndexOptions = { path: null };
// @ts-expect-error <lang><zh-CN>路径不做数字转换。</zh-CN><en>Paths do not coerce numbers.</en></lang>
const numericPath: DocSourceMapIndexOptions = { path: 1 };
// @ts-expect-error <lang><zh-CN>新对象字面量不能随意扩张接口字段。</zh-CN><en>Fresh object literals cannot arbitrarily extend interface fields.</en></lang>
const excess: DocSourceMapIndexOptions = { path: "context", ignored: true };
// @ts-expect-error <lang><zh-CN>所有状态均要求diagnostics字段。</zh-CN><en>Every status requires diagnostics.</en></lang>
const missingDiagnostics: DocSourceMapMigrationResult = { status: "invalid" };
// @ts-expect-error <lang><zh-CN>不接纳未知状态。</zh-CN><en>Unknown statuses are not admitted.</en></lang>
const unknownStatus: DocSourceMapMigrationResult = { status: "success", diagnostics: [] };
// @ts-expect-error <lang><zh-CN>manifest根须是记录类型。</zh-CN><en>The manifest root must be a record.</en></lang>
const stringManifest: DocSourceMapMigrationResult = { status: "migrated", manifest: "text", diagnostics: [] };
// @ts-expect-error <lang><zh-CN>diagnostics是数组，不是单个对象。</zh-CN><en>Diagnostics is an array, not a single object.</en></lang>
const wrongDiagnostics: DocSourceMapMigrationResult = { status: "invalid", diagnostics: {} };
// @ts-expect-error <lang><zh-CN>诊断严重级别沿用核心闭集。</zh-CN><en>Diagnostic severity retains the core closed set.</en></lang>
const wrongSeverity: DocSourceMapMigrationResult = { status: "invalid", diagnostics: [{ code: "SYNTHETIC", message: "text", severity: "fatal" }] };
// @ts-expect-error <lang><zh-CN>严格可选manifest不接受显式undefined赋值。</zh-CN><en>Strict optional manifest rejects explicit undefined.</en></lang>
const undefinedManifest: DocSourceMapMigrationResult = { status: "invalid", manifest: undefined, diagnostics: [] };
/** @lang zh-CN 状态检查后仍需独立检查manifest存在及其unknown字段类型。 @lang en Status checks still require separate manifest-presence and unknown-field checks. */
function consume(value: DocSourceMapMigrationResult): void {
  if (value.status === "migrated" || value.status === "already-current") {
    // @ts-expect-error <lang><zh-CN>仅缩小status不会证明可选manifest存在。</zh-CN><en>Narrowing status alone does not establish optional manifest presence.</en></lang>
    const assumed: Record<string, unknown> = value.manifest;
    if (value.manifest) {
      // @ts-expect-error <lang><zh-CN>Record字段仍为unknown，不能冒充已类型化工件。</zh-CN><en>Record fields remain unknown rather than proving a typed artifact.</en></lang>
      const version: string = value.manifest.contractVersion;
      if (typeof value.manifest.contractVersion === "string") { const checked: string = value.manifest.contractVersion; void checked; }
      void version;
    }
    void assumed;
  }
}
void [statuses, manuallyIncomplete, manuallyMismatched, consume];
