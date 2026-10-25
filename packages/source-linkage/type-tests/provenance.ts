/**
 * @file
 * @lang zh-CN 已安装公开来源/迁移类型的严格正反例；不从类型断言工件已通过校验。
 * @lang en Strict positive/negative consumers of installed public provenance/migration types, without treating types as artifact-validation proof.
 */
import { migrateDocSourceMap, DOC_SOURCE_MAP_CONTRACT_VERSION, type DocSourceMapContractVersion, type DocSourceMapRangeSource, type DocSourceMapMigrationResult } from "../src/index.js";
// <lang><zh-CN>闭集用于新版生成者，旧索引来源仍有string兼容视图。</zh-CN><en>The closed set serves current producers while legacy index origins retain a string-compatible view.</en></lang>
const category: DocSourceMapRangeSource = "compiler";
const version: DocSourceMapContractVersion = DOC_SOURCE_MAP_CONTRACT_VERSION;
const result: DocSourceMapMigrationResult = migrateDocSourceMap({});
// @ts-expect-error Concrete tool labels belong in detail, not the current category.
const badCategory: DocSourceMapRangeSource = "typescript-compiler";
// @ts-expect-error Unknown patches are not supported exact versions.
const badVersion: DocSourceMapContractVersion = "1.0.1";
// @ts-expect-error Migration does not promise a manifest for rejected inputs.
const guaranteed: Record<string, unknown> = result.manifest;
// @ts-expect-error Internal migration preparation is not a public root export.
import { prepareDocSourceMapMigration } from "../src/index.js";
void [category, version, result, badCategory, badVersion, guaranteed, prepareDocSourceMapMigration];
