/**
 * @file
 * @lang zh-CN 七基础模块76项公开声明的名称、双语和真实类型门禁；不代表core全部328项已审。
 * @lang en Gates names, bilingual documentation and actual types for 76 declarations in seven foundation modules; does not claim review of all 328 core exports.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// <lang><zh-CN>编译器同时读取真实根入口与正/负例消费者，严格模式不忽略声明库问题。</zh-CN><en>The compiler reads the real root and positive/negative consumer together, with strict mode and no skipped declaration checks.</en></lang>
const entry = fileURLToPath(new URL("./index.ts", import.meta.url));
const consumer = fileURLToPath(new URL("../type-tests/foundation.ts", import.meta.url));
const program = ts.createProgram({ rootNames: [entry, consumer], options: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, skipLibCheck: false, noEmit: true, types: ["node"], resolveJsonModule: true } });
const checker = program.getTypeChecker();
const exported = checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(entry)!)!);
const modules = new Set(["model.ts", "protocol.ts", "i18n.ts", "validator.ts", "schema.ts", "diagnostics.ts", "fixtures.ts"]);
// <lang><zh-CN>按真实声明来源筛选已审基础范围，不以总导出计数代替其它领域语义审查。</zh-CN><en>Filter reviewed foundations by actual declaration origin rather than treating total export counts as review of other domains.</en></lang>
const foundation = exported.map((item) => item.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(item) : item).filter((item) => modules.has(item.declarations?.[0]?.getSourceFile().fileName.replaceAll("\\", "/").split("/").at(-1) ?? ""));
const expected = [
  "buildLocaleFallbackChain", "createBasicFixtureDocument", "createHiaDiagnostic", "createHiaDocument", "createHiaProtocolEnvelope", "getCoreRuntimeInfo", "getHiaDiagnosticCodeDefinition", "getI18nField",
  "HIA_CORE_CONTRACT_VERSION", "HIA_CORE_PACKAGE_NAME", "HIA_DIAGNOSTIC_CODE_REGISTRY", "HIA_DOCUMENT_SCHEMA", "HIA_DOCUMENT_SCHEMA_ID", "HIA_DOCUMENT_SCHEMA_VERSION", "HIA_I18N_TEXT_SOURCE_PRIORITY", "HIA_PROTOCOL_ENVELOPE_VERSION", "HIA_SOURCE_CONFIDENCE_LEVELS", "HIA_SOURCE_MODEL", "HIA_SOURCE_MODEL_VERSION", "HIA_SOURCE_MODES", "HIA_SOURCE_RANGE_SOURCES", "HIA_TEXT_I18N_MODEL", "HIA_TEXT_I18N_MODEL_VERSION",
  "HiaCoreContractVersion", "HiaDiagnostic", "HiaDiagnosticCode", "HiaDiagnosticCodeDefinition", "HiaDiagnosticData", "HiaDiagnosticLayer", "HiaDiagnosticSeverity", "HiaDocument", "HiaDocumentInput", "HiaFallbackLocale", "HiaI18nField", "HiaI18nModel", "HiaI18nResource", "HiaI18nResourceFormat", "HiaI18nTextSourceKind", "HiaLangBlock", "HiaLangInlineSegment", "HiaLocalizedText", "HiaNode", "HiaNodeKind", "HiaProtocolEnvelope", "HiaProtocolEnvelopeKind", "HiaProtocolEnvelopeVersion", "HiaResolvedText", "HiaRuntimeInfo", "HiaSourceBlock", "HiaSourceBlockBase", "HiaSourceBlockKind", "HiaSourceConfidence", "HiaSourceDefinedIn", "HiaSourceFragment", "HiaSourceLink", "HiaSourceMetadata", "HiaSourceMode", "HiaSourceModelVersion", "HiaSourcePosition", "HiaSourcePreview", "HiaSourcePrimaryBlock", "HiaSourceRange", "HiaSourceRangeSource", "HiaSourceReference", "HiaSymbol", "HiaSymbolKind", "HiaTextI18nModelVersion", "HiaTextRange", "HiaTextResolution", "HiaValidationResult", "isKnownHiaDiagnosticCode", "normalizeFallbackLocale", "resolveI18nFieldText", "ResolveI18nTextOptions", "validateHiaDocument", "validateHiaDocumentDetailed"
];

describe("core foundation public API gate", () => {
  it("pins exactly the reviewed foundation names", () => {
    expect(foundation.map((item) => item.getName()).sort()).toEqual([...expected].sort());
    expect(exported.some((item) => item.getName() === "isJsonDataGraph")).toBe(false);
  });
  it("keeps the sole root JS/types entry and no bin", () => {
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(manifest.exports).toEqual({ ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } });
    expect(manifest.bin).toBeUndefined();
    // <lang><zh-CN>包级test必须在真实仓库root发现测试，防止根CI通过但包脚本零发现。</zh-CN><en>The package test must discover tests at the real repository root, preventing green root CI from hiding a broken package entry point.</en></lang>
    expect(manifest.scripts.test).toBe("vitest run --root ../.. packages/core/src");
  });
  it("retains canonical Chinese and English on all reviewed declarations", () => {
    for (const item of foundation) {
      // <lang><zh-CN>检验真实声明的语言tag，不能借根index文件注释替代逐项文档。</zh-CN><en>Inspect actual declaration language tags rather than substituting root-index comments for item documentation.</en></lang>
      const languages = item.getJsDocTags(checker).filter(({ name }) => name === "lang").map(({ text }) => ts.displayPartsToString(text));
      expect(languages.some((text) => /^zh-CN\s+\S/.test(text)), item.getName()).toBe(true);
      expect(languages.some((text) => /^en\s+\S/.test(text)), item.getName()).toBe(true);
    }
  });
  it("compiles exact legacy/current versions and actual negative type cases", () => {
    const diagnostics = ts.getPreEmitDiagnostics(program).map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"));
    expect(diagnostics).toEqual([]);
  });
});
