/**
 * @file
 * @lang zh-CN 输入硬化后的公共类型兼容与私有helper隔离反例。
 * @lang en Public type compatibility and private-helper isolation counterexamples after input hardening.
 */
import { createDocSourceMapIndex, validateDocSourceMap, type DocSourceMapIndex, type DocSourceMapIndexOptions } from "../src/index.js";
// <lang><zh-CN>unknown入口继续接受待验证值；类型不冒充wire合法性证明。</zh-CN><en>The unknown entry continues accepting values for validation; types do not prove wire validity.</en></lang>
const input: unknown = { contract: "doc-source-map", contractVersion: "0.1.0-draft", entries: [] };
const options: DocSourceMapIndexOptions = { path: "public/map.json" };
const index: DocSourceMapIndex = createDocSourceMapIndex(input, options);
validateDocSourceMap(input, options);
// @ts-expect-error Public path context is text rather than a numeric value.
const wrongOptions: DocSourceMapIndexOptions = { path: 2 };
// @ts-expect-error Internal structural helpers must not become public package-root exports.
import { collectDocSourceMapInputIssues } from "../src/index.js";
void [index, wrongOptions, collectDocSourceMapInputIssues];
