/**
 * @file
 * @lang zh-CN 绑定索引选项严格类型：前置完整索引必需，运行时拒绝不扩大类型或公开私有投影。
 * @lang en Strict binding-index option types: full prerequisite indexes stay required, and runtime rejection widens neither types nor private projection exports.
 */
import { createDocSourceMapIndex, createGeneratedDocumentationBindingIndex, type GeneratedDocumentationBindingIndexOptions, type GeneratedDocumentationBindingIndex } from "../src/index.js";
// <lang><zh-CN>只用公开工厂结果，类型不承诺其运行时状态available。</zh-CN><en>Use public factory output only; its type does not promise runtime available status.</en></lang>
const index = createDocSourceMapIndex({});
const options: GeneratedDocumentationBindingIndexOptions = Object.freeze({ docSourceMapIndex: index, path: "context/binding.json" });
const result: GeneratedDocumentationBindingIndex = createGeneratedDocumentationBindingIndex({}, options);
// @ts-expect-error Prerequisite options remain required.
createGeneratedDocumentationBindingIndex({});
// @ts-expect-error Root options cannot be null in typed calls.
createGeneratedDocumentationBindingIndex({}, null);
// @ts-expect-error Required pre-built index is not nullable.
createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: null });
// @ts-expect-error Paths remain primitive string context.
createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: index, path: 42 });
// @ts-expect-error Exact optional paths remain string-only when present.
const undefinedPath: GeneratedDocumentationBindingIndexOptions = { docSourceMapIndex: index, path: undefined };
// @ts-expect-error An arbitrary partial record is not a typed prerequisite index.
createGeneratedDocumentationBindingIndex({}, { docSourceMapIndex: {} });
// @ts-expect-error Header projection remains internal.
import { prepareBindingIndexOptions } from "../src/index.js";
// @ts-expect-error Result statuses remain the existing closed set.
const badStatus: GeneratedDocumentationBindingIndex["status"] = "success";
void [result, undefinedPath, prepareBindingIndexOptions, badStatus];
