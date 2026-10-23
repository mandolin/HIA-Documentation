/**
 * @file
 * @lang zh-CN 绑定22项已审清单声明及真实类型正负例，其它配置导出不由本测试外推语义完成。
 * @lang en Pins 22 reviewed manifest declarations and actual type positive/negative cases, without inferring semantic completion for other config exports.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// <lang><zh-CN>从真实包根建立只读编译图，保留strict和库类型检查，不emit或改全局tsconfig。</zh-CN><en>Build a read-only compilation graph from the actual package root, retaining strict/library checks without emission or global tsconfig changes.</en></lang>
const entry = fileURLToPath(new URL("./index.ts", import.meta.url));
const fixture = fileURLToPath(new URL("../type-tests/project-manifest.ts", import.meta.url));
const program = ts.createProgram({ rootNames: [entry, fixture], options: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, skipLibCheck: false, noEmit: true, types: ["node"], resolveJsonModule: true } });
const checker = program.getTypeChecker();
const exported = checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(entry)!)!);
const manifest = exported.map((item) => item.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(item) : item).filter((item) => item.declarations?.[0]?.getSourceFile().fileName.replaceAll("\\", "/").endsWith("/config/src/project-manifest.ts"));
const expected = ["HIA_PROJECT_MANIFEST_SCHEMA_VERSION", "HIA_PROJECT_MANIFEST_SCHEMA_ID", "HIA_PROJECT_MANIFEST_INPUT_KINDS", "HIA_PROJECT_MANIFEST_DOMAINS", "HIA_PROJECT_MANIFEST_ARTIFACT_POLICIES", "HIA_PROJECT_MANIFEST_SEMANTIC_PATH_KINDS", "HIA_PROJECT_MANIFEST_JSON_SCHEMA", "HiaProjectManifestInputKind", "HiaProjectManifestDomain", "HiaProjectManifestArtifactPolicy", "HiaProjectManifestSemanticPathKind", "HiaProjectManifestSchemaVersion", "HiaProjectDocsManifest", "HiaProjectManifestProjectInfo", "HiaProjectManifestProfileRef", "HiaProjectManifestInputProfileRef", "HiaProjectManifestInput", "HiaProjectManifestSemanticPathSegment", "HiaProjectManifestProducerInput", "HiaProjectManifestProducerRef", "HiaProjectManifestValidationOptions", "validateHiaProjectManifest"];

describe("project manifest public API gate", () => {
  it("pins reviewed names without exposing a private graph helper", () => {
    expect(manifest.map((item) => item.getName()).sort()).toEqual([...expected].sort());
    expect(exported.some((item) => item.getName() === "isProjectManifestJsonDataGraph")).toBe(false);
  });
  it("retains the sole root entry and discovers every config test", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(pkg.exports).toEqual({ ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } });
    expect(pkg.bin).toBeUndefined();
    expect(pkg.scripts.test).toBe("vitest run --root ../.. packages/config/src");
  });
  it("retains canonical Chinese and English on each reviewed declaration", () => {
    for (const item of manifest) {
      const languages = item.getJsDocTags(checker).filter(({ name }) => name === "lang").map(({ text }) => ts.displayPartsToString(text));
      expect(languages.some((text) => /^zh-CN\s+\S/.test(text)), item.getName()).toBe(true);
      expect(languages.some((text) => /^en\s+\S/.test(text)), item.getName()).toBe(true);
    }
  });
  it("compiles real exact versions and deliberate negative cases", () => {
    expect(ts.getPreEmitDiagnostics(program).map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"))).toEqual([]);
  });
});
