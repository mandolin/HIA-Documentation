/**
 * @file
 * @lang zh-CN 五个诊断路径入口的严格公开类型，验证运行时修复没有扩大声明或导出私有投影。
 * @lang en Strict public types for five diagnostic-path entries, checking that runtime repair widens neither declarations nor internal projection exports.
 */
import { createDocSourceMapIndex, validateDocSourceMap, migrateDocSourceMap, migrateGeneratedDocumentationBindingBundle, validateGeneratedDocumentationBinding, type DocSourceMapIndexOptions } from "../src/index.js";
// <lang><zh-CN>同一自有string选项可用于五入口，unknown工件仍须运行时验证。</zh-CN><en>The same own string option works for five entries; unknown artifacts still require runtime validation.</en></lang>
const options: DocSourceMapIndexOptions = Object.freeze({ path: "context/map.json" });
void [createDocSourceMapIndex({}, options), validateDocSourceMap({}, options), migrateDocSourceMap({}, options), migrateGeneratedDocumentationBindingBundle({}, options), validateGeneratedDocumentationBinding({}, options)];
// @ts-expect-error Runtime null rejection does not widen typed options.
createDocSourceMapIndex({}, null);
// @ts-expect-error Diagnostic paths remain primitive strings.
validateDocSourceMap({}, { path: 42 });
// @ts-expect-error Boxed strings are not primitive path values.
migrateDocSourceMap({}, { path: new String("map") });
// @ts-expect-error Bundle context does not accept object paths.
migrateGeneratedDocumentationBindingBundle({}, { path: {} });
// @ts-expect-error Binding context does not accept array paths.
validateGeneratedDocumentationBinding({}, { path: [] });
// @ts-expect-error Exact optional fields stay string-only when present.
const undefinedPath: DocSourceMapIndexOptions = { path: undefined };
// @ts-expect-error Shared projection stays internal to the package.
import { prepareSourceLinkagePathOptions } from "../src/index.js";
void [undefinedPath, prepareSourceLinkagePathOptions];
