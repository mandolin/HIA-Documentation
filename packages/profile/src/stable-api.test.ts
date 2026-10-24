/**
 * @file
 * @lang zh-CN 配置规范候选公开声明的双语字段覆盖和真实类型正反例门禁。
 * @lang en Gates for bilingual public declaration/field coverage and actual positive/negative type consumers of the profile candidate.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// <lang><zh-CN>AST只读取本包源码，不执行文档内的规则或配置。</zh-CN><en>The AST reads this package's source without executing documented rules or profiles.</en></lang>
const sourcePath = path.resolve(__dirname, "index.ts");
const source = ts.createSourceFile(sourcePath, readFileSync(sourcePath, "utf8"), ts.ScriptTarget.Latest, true);
const declarations = source.statements.filter((node) => node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));

describe("documentation profile stable public API", () => {
  it("retains 34 prior declarations and adds only the exact version type", () => {
    expect(declarations).toHaveLength(35);
    expect(declarations.filter(ts.isTypeAliasDeclaration).map((node) => node.name.text)).toContain("HiaProfileSchemaVersion");
    for (const declaration of declarations) {
      const docs = declaration.getFullText(source);
      expect(docs).toContain("@lang zh-CN");
      expect(docs).toContain("@lang en");
    }
  });

  it("documents every public interface field in both languages", () => {
    for (const declaration of declarations.filter(ts.isInterfaceDeclaration)) {
      for (const member of declaration.members) {
        const docs = member.getFullText(source);
        expect(docs).toContain("@lang zh-CN");
        expect(docs).toContain("@lang en");
      }
    }
  });

  it("compiles strict real TypeScript positive and negative consumers", () => {
    // <lang><zh-CN>沿用包配置并只覆盖测试所需的输出/根目录；正反例直接消费真实源码声明，不引入替代stub。</zh-CN><en>Reuse package settings and override only test output/root options; positive/negative fixtures consume real source declarations, without substitute stubs.</en></lang>
    const configPath = path.resolve(__dirname, "../tsconfig.json");
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
    const fixture = path.resolve(__dirname, "../type-tests/stable-contract.ts");
    const program = ts.createProgram([fixture], { ...parsed.options, rootDir: undefined, composite: false, incremental: false, noEmit: true, strict: true, skipLibCheck: false });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual([]);
  });
});
