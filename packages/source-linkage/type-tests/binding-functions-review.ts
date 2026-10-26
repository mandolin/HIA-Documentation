/**
 * @file
 * @lang zh-CN 两个公开绑定函数的同步/unknown输入及独立结果消费类型，不运行这些用例。
 * @lang en Types for synchronous/unknown inputs and distinct result consumption in two public binding functions, without executing examples.
 */
import type { HiaDiagnostic } from "@hia-doc/core";
import { validateGeneratedDocumentationBinding, migrateGeneratedDocumentationBindingBundle, type GeneratedDocumentationBindingBundleMigrationResult } from "../src/index.js";
// <lang><zh-CN>unknown输入在运行时校验；同步返回值并不承诺输入已经合法或可公开。</zh-CN><en>Unknown inputs are validated at runtime; synchronous return types do not certify valid/public-safe input.</en></lang>
const input: unknown = null;
const diagnostics: HiaDiagnostic[] = validateGeneratedDocumentationBinding(input);
const result: GeneratedDocumentationBindingBundleMigrationResult = migrateGeneratedDocumentationBindingBundle(input);
// @ts-expect-error <lang><zh-CN>校验不是异步API。</zh-CN><en>Validation is not asynchronous.</en></lang>
const asyncValidation: Promise<HiaDiagnostic[]> = validateGeneratedDocumentationBinding(input);
// @ts-expect-error <lang><zh-CN>整组迁移返回结果对象而非诊断列表。</zh-CN><en>Bundle migration returns a result object rather than a diagnostic list.</en></lang>
const migrationAsList: HiaDiagnostic[] = migrateGeneratedDocumentationBindingBundle(input);
// @ts-expect-error <lang><zh-CN>校验结果没有整组迁移状态。</zh-CN><en>Validation results have no bundle-migration status.</en></lang>
diagnostics.status;
// @ts-expect-error <lang><zh-CN>路径参数须为字符串。</zh-CN><en>The path option requires a string.</en></lang>
validateGeneratedDocumentationBinding(input, { path: 1 });
// @ts-expect-error <lang><zh-CN>可省略选项不等于允许null。</zh-CN><en>Omittable options do not admit null.</en></lang>
migrateGeneratedDocumentationBindingBundle(input, null);
// @ts-expect-error <lang><zh-CN>返回值不提供自动写出或发布方法。</zh-CN><en>The result offers no automatic write/publish method.</en></lang>
result.write();
// @ts-expect-error <lang><zh-CN>内部字段收集器不是根级公开API。</zh-CN><en>The internal field collector is not a public root API.</en></lang>
import { collectBindingInputIssues } from "../src/index.js";
/** @lang zh-CN 消费者仍须独立检查可选产物。 @lang en Consumers must still check optional artifacts separately. */
function consume(value: GeneratedDocumentationBindingBundleMigrationResult): void {
  if (value.status === "migrated") {
    // @ts-expect-error <lang><zh-CN>普通interface的status不缩小可选bundle。</zh-CN><en>Status on an ordinary interface does not narrow its optional bundle.</en></lang>
    const map = value.bundle.docSourceMap;
    void map;
  }
}
void [diagnostics, result, consume, collectBindingInputIssues];
