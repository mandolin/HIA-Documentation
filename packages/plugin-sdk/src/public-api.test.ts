/**
 * @file
 * @lang zh-CN SDK公开导出白名单、双语JSDoc及真实TypeScript消费者门禁，不把导出计数当语义审查。
 * @lang en Gates the SDK export allowlist, bilingual JSDoc and a real TypeScript consumer, without treating export counts as semantic review.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// <lang><zh-CN>固定根入口及compile-only消费者，直接通过编译器检查已发布类型路径对应的源码。</zh-CN><en>Pin the root entry and compile-only consumer and use the compiler to check source corresponding to published type paths.</en></lang>
const entry = fileURLToPath(new URL("./index.ts", import.meta.url));
const consumer = fileURLToPath(new URL("../type-tests/contracts.ts", import.meta.url));
const program = ts.createProgram({ rootNames: [entry, consumer], options: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, skipLibCheck: false, noEmit: true, types: ["node"] } });
const checker = program.getTypeChecker();
const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(entry)!)!);

// <lang><zh-CN>新增公开名必须显式更新审查清单；既有27项加原生诊断类型，共28项。</zh-CN><en>New public names require an explicit review-list update; the original 27 plus the native diagnostic type total 28.</en></lang>
const expectedNames = [
  "defineDocumentationProducer", "runDocumentationProducer", "validateDocumentationProducerDescriptor", "validateDocumentationProducerRequest", "validateDocumentationProducerResult", "hasDocumentationProducerErrors",
  "DOCUMENTATION_PRODUCER_CONTRACT", "DOCUMENTATION_PRODUCER_CONTRACT_VERSION", "DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_ID", "DOCUMENTATION_PRODUCER_DESCRIPTOR_SCHEMA_VERSION",
  "DOCUMENTATION_PRODUCER_RESULT_CONTRACT", "DOCUMENTATION_PRODUCER_RESULT_CONTRACT_VERSION", "DOCUMENTATION_PRODUCER_RESULT_SCHEMA_ID", "DOCUMENTATION_PRODUCER_RESULT_SCHEMA_VERSION",
  "DOCUMENTATION_PRODUCER_DESCRIPTOR_JSON_SCHEMA", "DOCUMENTATION_PRODUCER_RESULT_JSON_SCHEMA",
  "DocumentationProducerStatus", "DocumentationProducerCapabilities", "DocumentationProducerDescriptor", "DocumentationProducerInput", "DocumentationProducerRequest", "DocumentationProducerProgress", "DocumentationProducerContext", "DocumentationProducerArtifact", "DocumentationProducerDiagnostic", "DocumentationProducerResult", "DocumentationProducer", "DocumentationProducerValidationOptions"
];

describe("producer public API declaration gate", () => {
  it("keeps the reviewed root allowlist and no hidden bin/subpath API", () => {
    expect(exports.map((symbol) => symbol.getName()).sort()).toEqual([...expectedNames].sort());
    // <lang><zh-CN>manifest声明也是公开边界，不把root符号清单当作子路径和CLI的替代。</zh-CN><en>The manifest is also a public boundary; the root symbol list does not substitute for subpath and CLI review.</en></lang>
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(manifest.exports).toEqual({ ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } });
    expect(manifest.bin).toBeUndefined();
  });
  it("documents every exported declaration in canonical Chinese and English", () => {
    for (const exported of exports) {
      // <lang><zh-CN>re-export必须跟随真实声明读取注释，不能只检查index中的导出语句。</zh-CN><en>Follow re-exports to their actual declarations rather than checking only index export statements.</en></lang>
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const languages = symbol.getJsDocTags(checker).filter(({ name }) => name === "lang").map(({ text }) => ts.displayPartsToString(text));
      expect(languages.some((text) => /^zh-CN\s+\S/.test(text)), exported.getName()).toBe(true);
      expect(languages.some((text) => /^en\s+\S/.test(text)), exported.getName()).toBe(true);
    }
  });
  it("type-checks current/legacy consumers and rejects unknown wire versions", () => {
    // <lang><zh-CN>格式化实际编译诊断便于失败定位；不忽略负例中失效的ts-expect-error。</zh-CN><en>Format actual compiler diagnostics for actionable failures without ignoring an unused ts-expect-error in negative cases.</en></lang>
    const diagnostics = ts.getPreEmitDiagnostics(program).map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"));
    expect(diagnostics).toEqual([]);
  });
});
