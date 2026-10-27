/**
 * @file
 * @lang zh-CN 文档范围1.1.0公开类型的严格正反例；类型不替代运行时精度和证据验证。
 * @lang en Strict positive and negative consumers of public range-convention 1.1.0 types; static types do not replace runtime precision or evidence checks.
 */
import {
  DOC_SOURCE_MAP_CONTRACT_VERSION,
  DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION,
  findDocSourceMapEntriesBySource,
  migrateDocSourceMap,
  type DocSourceMapIndex,
  type DocSourceMapMigrationOptions,
  type DocSourceMapQuery,
  type DocSourceMapRangeConvention,
  type DocSourceMapRangeEvidence
} from "../src/index.js";

// <lang><zh-CN>精确字面量保持三代版本边界；可声明的unknown不是精确命中承诺。</zh-CN><en>Exact literals retain three-generation boundaries; declared unknown does not promise an exact hit.</en></lang>
const current: "1.1.0" = DOC_SOURCE_MAP_CONTRACT_VERSION;
const previous: "1.0.0" = DOC_SOURCE_MAP_1_0_0_CONTRACT_VERSION;
const convention: DocSourceMapRangeConvention = { endBoundary: "exclusive", columnUnit: "utf16-code-unit" };
const evidence: DocSourceMapRangeEvidence = { entryIndex: 0, sourceRefIndex: 0, rangeConvention: convention };
const migration: DocSourceMapMigrationOptions = { path: "context/map.json", rangeEvidence: [evidence] };
const query: DocSourceMapQuery = { sourcePath: "src/a.ts", position: { line: 1, column: 2 }, columnUnit: "utf16-code-unit" };
const index = {} as DocSourceMapIndex;
void [current, previous, migration, query, migrateDocSourceMap({}, migration), findDocSourceMapEntriesBySource(index, "src/a.ts", query.position, query.columnUnit)];

// @ts-expect-error <lang><zh-CN>终点约定是闭集。</zh-CN><en>Endpoint convention is closed.</en></lang>
const badBoundary: DocSourceMapRangeConvention = { endBoundary: "half-open", columnUnit: "byte" };
// @ts-expect-error <lang><zh-CN>列单位不把“字符”模糊标签当作精确单位。</zh-CN><en>Column units reject vague character labels as exact units.</en></lang>
const badUnit: DocSourceMapQuery = { columnUnit: "characters" };
// @ts-expect-error <lang><zh-CN>引用序号只允许数值，不接受身份文本替代。</zh-CN><en>Reference ordinals are numeric and cannot be replaced with identity strings.</en></lang>
const badEvidence: DocSourceMapRangeEvidence = { entryIndex: "first", sourceRefIndex: 0, rangeConvention: convention };
void [badBoundary, badUnit, badEvidence];
