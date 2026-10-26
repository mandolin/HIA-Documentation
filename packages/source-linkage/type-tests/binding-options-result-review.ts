/**
 * @file
 * @lang zh-CN 三接口六字段的严格类型消费者，保留普通可写interface与unknown工件字段，不执行示例。
 * @lang en Strict consumer for six fields in three interfaces, retaining ordinary writable interfaces and unknown artifact fields without executing examples.
 */
import { validateGeneratedDocumentationBinding, migrateGeneratedDocumentationBindingBundle, type GeneratedDocumentationBindingValidationOptions, type GeneratedDocumentationBindingMigrationBundle, type GeneratedDocumentationBindingBundleMigrationResult } from "../src/index.js";
// <lang><zh-CN>容器只说明结构，不在类型层认证版本、完整性或隐私；当前接口允许空记录和数组。</zh-CN><en>The container describes shape without certifying versions, completeness or privacy; existing types allow empty records and arrays.</en></lang>
const options: GeneratedDocumentationBindingValidationOptions = {};
options.path = "context/sidecar.json";
delete options.path;
const container: GeneratedDocumentationBindingMigrationBundle = { docSourceMap: {}, bindingSidecars: [] };
container.bindingSidecars.push({ extension: true });
container.docSourceMap = {};
const structuralOptions = { path: "context.json", ignored: true };
validateGeneratedDocumentationBinding(null, structuralOptions);
validateGeneratedDocumentationBinding(null, undefined);
const result = migrateGeneratedDocumentationBindingBundle(container);
// <lang><zh-CN>结果不是判别联合，人工构造允许状态与可选bundle不配套；运行factory另有原子成功/拒绝保证。</zh-CN><en>The result is not a discriminated union; manual construction permits unmatched status/bundle combinations, while the runtime factory separately guarantees atomic success/refusal.</en></lang>
const incomplete: GeneratedDocumentationBindingBundleMigrationResult = { status: "migrated", diagnostics: [] };
const mismatched: GeneratedDocumentationBindingBundleMigrationResult = { status: "invalid", bundle: container, diagnostics: [] };
result.status = "invalid";
result.bundle = container;
delete result.bundle;
result.diagnostics = [];
// @ts-expect-error <lang><zh-CN>严格可选属性不接受显式undefined。</zh-CN><en>Strict optional properties reject explicit undefined.</en></lang>
const undefinedPath: GeneratedDocumentationBindingValidationOptions = { path: undefined };
// @ts-expect-error <lang><zh-CN>路径不是null。</zh-CN><en>Path is not null.</en></lang>
const nullPath: GeneratedDocumentationBindingValidationOptions = { path: null };
// @ts-expect-error <lang><zh-CN>路径不做数字转换。</zh-CN><en>Paths do not coerce numbers.</en></lang>
const numericPath: GeneratedDocumentationBindingValidationOptions = { path: 1 };
// @ts-expect-error <lang><zh-CN>新字面量不允许未知选项。</zh-CN><en>Fresh literals reject unknown options.</en></lang>
const extra: GeneratedDocumentationBindingValidationOptions = { ignored: true };
// @ts-expect-error <lang><zh-CN>容器必须含普通映射字段。</zh-CN><en>The map field is required.</en></lang>
const missingMap: GeneratedDocumentationBindingMigrationBundle = { bindingSidecars: [] };
// @ts-expect-error <lang><zh-CN>容器必须含辅助工件数组。</zh-CN><en>The sidecar array is required.</en></lang>
const missingSidecars: GeneratedDocumentationBindingMigrationBundle = { docSourceMap: {} };
// @ts-expect-error <lang><zh-CN>映射根不是字符串。</zh-CN><en>The map root is not a string.</en></lang>
const wrongMap: GeneratedDocumentationBindingMigrationBundle = { docSourceMap: "map", bindingSidecars: [] };
// @ts-expect-error <lang><zh-CN>辅助工件每项须为记录对象。</zh-CN><en>Each sidecar must be a record.</en></lang>
const wrongSidecar: GeneratedDocumentationBindingMigrationBundle = { docSourceMap: {}, bindingSidecars: [1] };
// @ts-expect-error <lang><zh-CN>所有状态均要求diagnostics。</zh-CN><en>Every status requires diagnostics.</en></lang>
const noDiagnostics: GeneratedDocumentationBindingBundleMigrationResult = { status: "invalid" };
// @ts-expect-error <lang><zh-CN>未知状态不属于四值联合。</zh-CN><en>Unknown statuses are outside the four-literal union.</en></lang>
const wrongStatus: GeneratedDocumentationBindingBundleMigrationResult = { status: "success", diagnostics: [] };
// @ts-expect-error <lang><zh-CN>可选bundle不允许显式undefined。</zh-CN><en>Optional bundle rejects explicit undefined.</en></lang>
const undefinedBundle: GeneratedDocumentationBindingBundleMigrationResult = { status: "invalid", bundle: undefined, diagnostics: [] };
// @ts-expect-error <lang><zh-CN>diagnostics不是单个记录。</zh-CN><en>Diagnostics is not a single record.</en></lang>
const wrongDiagnostics: GeneratedDocumentationBindingBundleMigrationResult = { status: "invalid", diagnostics: {} };
// @ts-expect-error <lang><zh-CN>诊断严重级别沿用核心闭集。</zh-CN><en>Diagnostic severity retains the core closed set.</en></lang>
const wrongSeverity: GeneratedDocumentationBindingBundleMigrationResult = { status: "invalid", diagnostics: [{ code: "SYNTHETIC", severity: "fatal", message: "text" }] };
/** @lang zh-CN 消费者须独立检查bundle存在及unknown字段。 @lang en Consumers must separately check bundle presence and unknown fields. */
function consume(value: GeneratedDocumentationBindingBundleMigrationResult): void {
  if (value.status === "migrated" || value.status === "already-current") {
    // @ts-expect-error <lang><zh-CN>缩小status不能证明bundle存在。</zh-CN><en>Narrowing status does not prove bundle presence.</en></lang>
    const assumed: GeneratedDocumentationBindingMigrationBundle = value.bundle;
    if (value.bundle) {
      // @ts-expect-error <lang><zh-CN>记录字段仍为unknown，不能直接当版本字符串。</zh-CN><en>Record fields remain unknown rather than proving a version string.</en></lang>
      const version: string = value.bundle.docSourceMap.contractVersion;
      void version;
    }
    void assumed;
  }
}
void [options, container, incomplete, mismatched, consume];
