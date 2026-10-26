/**
 * @file
 * @lang zh-CN 提取诊断传播的公开类型消费者：沿用既有严重级别/状态/只读列表，宿主不暴露自由文本或私有身份。
 * @lang en Public type consumer for extraction-diagnostic propagation, preserving existing severities/states/readonly lists while hosts exclude free text and private identities.
 */
import { createDocSourceMapIndex, createGeneratedDocumentationBindingIndex, createGeneratedDocumentationBindingHostProjection, migrateGeneratedDocumentationBindingBundle, type GeneratedDocumentationBindingIndex } from "../src/index.js";
// <lang><zh-CN>未知工件只能经工厂验证，结果类型不承诺available或迁移一定成功。</zh-CN><en>Unknown artifacts require factory validation; result types promise neither availability nor migration success.</en></lang>
const index: GeneratedDocumentationBindingIndex = createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: createDocSourceMapIndex({}) });
const host = createGeneratedDocumentationBindingHostProjection(index);
const result = migrateGeneratedDocumentationBindingBundle({});
const severity: "error" | "warning" | "info" | undefined = index.diagnostics[0]?.severity;
// @ts-expect-error Diagnostic arrays remain readonly.
index.diagnostics.push(index.diagnostics[0]!);
// @ts-expect-error Frozen severity vocabulary does not include fatal.
const fatal: NonNullable<typeof severity> = "fatal";
// @ts-expect-error Index states retain their existing closed vocabulary.
const success: GeneratedDocumentationBindingIndex["status"] = "success";
// @ts-expect-error Host diagnostic summaries still exclude free text.
host.diagnostics[0]!.message;
// @ts-expect-error Host diagnostic summaries do not expose extractor subject identities.
host.diagnostics[0]!.subjectId;
// @ts-expect-error A failed migration cannot promise an output bundle.
const requiredBundle: NonNullable<typeof result.bundle> = result.bundle;
// @ts-expect-error Extraction projection remains a private implementation detail.
import { projectValidatedExtractionDiagnostics } from "../src/index.js";
// @ts-expect-error Prerequisite indexes cannot be replaced by null in typed callers.
createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: null });
void [severity, fatal, success, requiredBundle, projectValidatedExtractionDiagnostics];
