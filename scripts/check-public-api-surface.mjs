/**
 * @file
 * @lang zh-CN 核对必要包公开API候选清单与实际源码/导出映射；只读检查不是语义验收或发布动作。
 * @lang en Checks required-package API candidates against actual source/export maps; this read-only check is neither semantic acceptance nor publication.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * @lang zh-CN 收集发行清单中十二必要包的实际根、子路径、bin和声明；独立语言服务器不在首版必要包组。
 * @lang en Collects actual roots, subpaths, bins and declarations of twelve required release packages; the standalone language server is outside this required group.
 * @param {string} root <lang><zh-CN>受信主仓根目录，只读。</zh-CN><en>Trusted main-repository root, read-only.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>不含绝对路径或源码正文的候选清单。</zh-CN><en>Candidate inventory without absolute paths or source bodies.</en></lang>
 */
export async function collectPublicApiSurface(root) {
  // <lang><zh-CN>清单决定包组；不扫描业务仓或任意第三方包。</zh-CN><en>The release plan defines package scope; no business repository or arbitrary dependency is scanned.</en></lang>
  const plan = JSON.parse(await readFile(path.join(root, "release/public-packages.json"), "utf8"));
  const entries = plan.packages.filter((entry) => entry.name !== "@hia-doc/lsp").sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (entries.length !== 12) throw new Error("Required API package scope must contain twelve packages.");
  // <lang><zh-CN>源入口沿包目录约定，类型程序不emit也不执行模块。</zh-CN><en>Source entries follow package directories; the type program neither emits nor executes modules.</en></lang>
  const roots = entries.map((entry) => path.join(root, entry.path, "src/index.ts"));
  const program = ts.createProgram(roots, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, resolveJsonModule: true, skipLibCheck: true, noEmit: true });
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const packages = [];
  for (const entry of entries) {
    // <lang><zh-CN>清单/源符号同时读取，避免只比名称而漏掉字段或JSON子路径。</zh-CN><en>Read manifests and source symbols together so fields and JSON subpaths cannot hide behind name-only comparisons.</en></lang>
    const manifest = JSON.parse(await readFile(path.join(root, entry.path, "package.json"), "utf8"));
    const source = program.getSourceFile(path.join(root, entry.path, "src/index.ts"));
    const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(source)).map((exported) => {
      // <lang><zh-CN>别名追到owner声明，文档注释不进入类型字段或公开快照。</zh-CN><en>Follow aliases to owner declarations; comments enter neither type fields nor the public snapshot.</en></lang>
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const declaration = symbol.declarations[0];
      const owner = declaration.getSourceFile();
      const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
      const fields = ts.isInterfaceDeclaration(declaration) ? declaration.members.map((member) => ({ name: member.name?.getText(owner), optional: Boolean(member.questionToken), type: member.type ? printer.printNode(ts.EmitHint.Unspecified, member.type, owner).replaceAll("\r\n", "\n") : null })) : [];
      // <lang><zh-CN>全部声明的去注释指纹补充类型别名、readonly、默认值和常量初始化值；变更需复核，不自动判为破坏性。</zh-CN><en>Comment-free fingerprints of all declarations additionally cover aliases, readonly modifiers, defaults and constant initializers; changes require review rather than automatically implying breakage.</en></lang>
      // <lang><zh-CN>打印器会保留模板字面量内部的源换行；按ECMAScript模板值规则统一真实CRLF，保留反斜杠转义数据，防止检出平台造成漂移。</zh-CN><en>The printer preserves source line endings inside template literals; normalize actual CRLF according to ECMAScript template-value rules while retaining escaped data, avoiding checkout-platform drift.</en></lang>
      const declarationFingerprints = symbol.declarations.map((node) => createHash("sha256").update(printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()).replaceAll("\r\n", "\n")).digest("hex"));
      return { name: exported.name, kind: ts.SyntaxKind[declaration.kind], owner: path.relative(root, owner.fileName).split(path.sep).join("/"), signatures: type.getCallSignatures().map((signature) => checker.signatureToString(signature)), fields, declarationFingerprints };
    }).sort((a, b) => a.name.localeCompare(b.name, "en"));
    packages.push({ name: entry.name, candidateTargetVersion: "1.0.0", source: `${entry.path}/src/index.ts`, exportsMap: manifest.exports, bin: manifest.bin ?? {}, exports });
  }
  return { purpose: "release-engineering-api-candidate-inventory", candidateTargetVersion: "1.0.0", packages };
}

/**
 * @lang zh-CN 精确比较候选快照与当前收集结果；不把相等当作所有语义或版本兼容已经验证。
 * @lang en Exactly compares a candidate snapshot with current collection; equality does not prove complete semantics or version compatibility.
 * @param {object} expected <lang><zh-CN>已版本化候选清单。</zh-CN><en>Versioned candidate inventory.</en></lang>
 * @param {object} actual <lang><zh-CN>当前只读收集结果。</zh-CN><en>Current read-only collection.</en></lang>
 * @returns {void} <lang><zh-CN>一致时正常返回。</zh-CN><en>Returns normally on equality.</en></lang>
 * @throws {Error} <lang><zh-CN>漂移时固定错误，禁止自动重写基线。</zh-CN><en>Fixed error on drift; the baseline is never automatically rewritten.</en></lang>
 */
export function validatePublicApiSurface(expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error("Public API candidate inventory drifted; review exports, fields, signatures and subpaths before updating the snapshot.");
}

// <lang><zh-CN>直接CLI执行才读取候选文件并打印计数；测试import不触发整仓收集。</zh-CN><en>Only direct CLI execution reads the candidate file and prints counts; test imports do not collect the entire repository.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const expected = JSON.parse(await readFile(path.join(root, "release/public-api-surface.json"), "utf8"));
  const actual = await collectPublicApiSurface(root);
  validatePublicApiSurface(expected, actual);
  console.log(`Public API inventory: ${actual.packages.length} packages, ${actual.packages.reduce((sum, item) => sum + item.exports.length, 0)} root exports; structural identity only.`);
}
