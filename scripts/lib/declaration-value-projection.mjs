/**
 * @file
 * @lang zh-CN 声明文件值根的独立AST期望，复用类型审核的原注释、双语和地图校验。
 * @lang en Independent AST expectations for declaration-file value roots, reusing original-comment, bilingual and map validation from the type audit.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import ts from "typescript";
import {verifyDeclarationApiNode} from "./type-api-projection.mjs";

/**
 * @lang zh-CN 从编译器入口清单定位显式函数/变量声明，保留重载、别名和完整原签名。
 * @lang en Locates explicit function/variable declarations from the compiler entry inventory, retaining overloads, aliases and full original signatures.
 * @param {string} root <lang><zh-CN>授权声明owner根。</zh-CN><en>Authorized declaration owner root.</en></lang>
 * @param {object[]} modules <lang><zh-CN>独立编译器模块清单。</zh-CN><en>Independent compiler module inventory.</en></lang>
 * @returns {object} <lang><zh-CN>仅值根的期望与原文件摘要，变量内部类型成员单独验收。</zh-CN><en>Value-root expectations and original-file digests, with nested variable-type members reviewed separately.</en></lang>
 * @throws {Error} <lang><zh-CN>文件/语法/归属/位置无效，或没有显式声明类型。</zh-CN><en>Invalid files, syntax, ownership or locations, or absent explicit declaration types.</en></lang>
 */
export function collectDeclarationValueExpectations(root, modules) {
  // <lang><zh-CN>本次缓存只持有授权普通声明源，不能把实现文件或依赖目录当作声明证据。</zh-CN><en>This call's cache contains only authorized regular declaration sources, excluding implementation files and dependency directories.</en></lang>
  const sources = new Map();
  const bindings = [];
  // <lang><zh-CN>标准块标签使用显式映射，未知标签不会通过对象原型误命中字段。</zh-CN><en>Standard block tags use an explicit map so unknown tags cannot match object-prototype properties.</en></lang>
  const fieldsByTag = new Map([
    ["returns", "returns"], ["return", "returns"], ["remarks", "remarks"],
    ["throws", "throws"], ["exception", "throws"], ["example", "examples"]
  ]);
  /**
   * @lang zh-CN 读取归属根内的普通声明源，并保留本次AST与字节摘要。
   * @lang en Reads a regular owned declaration source, retaining this call's AST and byte digest.
   */
  function read(relative) {
    assert(typeof relative === "string" && /\.d\.[cm]?ts$/.test(relative) && !/[\\:%?#]/.test(relative) && !path.isAbsolute(relative) && !relative.split("/").some(part => !part || part === "." || part === ".." || part === "node_modules"));
    if (sources.has(relative)) return sources.get(relative);
    // <lang><zh-CN>物理范围及4MiB上限先于解析，摘要用于生成结束再核字节。</zh-CN><en>Physical ownership and the 4 MiB bound precede parsing; digests support post-production byte checks.</en></lang>
    const file = path.resolve(root, relative);
    const state = fs.lstatSync(file);
    assert(state.isFile() && !state.isSymbolicLink() && state.nlink === 1 && state.size <= 4 * 1024 * 1024);
    assert.equal(fs.realpathSync(file), file);
    const bytes = fs.readFileSync(file);
    const source = ts.createSourceFile(relative, bytes.toString("utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    assert.equal(source.parseDiagnostics.length, 0);
    const record = {source, sha256:createHash("sha256").update(bytes).digest("hex")};
    sources.set(relative, record);
    return record;
  }
  for (const module of modules) {
    read(module.path);
    for (const binding of module.exports.filter(item => !item.declarationTypeOnly)) {
      assert.equal(binding.status, "resolved");
      assert(binding.declarations.length > 0 && bindings.length < 20000);
      // <lang><zh-CN>一个公开名可含多个物理声明；重载不折成首条或最后一条。</zh-CN><en>A public name may have multiple physical declarations; overloads retain every declaration.</en></lang>
      const declarations = [];
      for (const location of binding.declarations) {
        const {source} = read(location.path);
        let original;
        /**
         * @lang zh-CN 用位置、语法种类与声明名定位原节点，别名保留公开绑定名。
         * @lang en Locates the original node by position, syntax kind and declaration name while aliases retain public binding names.
         */
        function find(node) {
          const position = source.getLineAndCharacterOfPosition(node.getStart(source));
          if (position.line + 1 === location.line && position.character + 1 === location.column && ts.SyntaxKind[node.kind] === location.kind && node.name?.getText(source) === binding.declarationName) original = node;
          ts.forEachChild(node, find);
        }
        ts.forEachChild(source, find);
        assert(original && (ts.isVariableDeclaration(original) || ts.isFunctionDeclaration(original)) && original.type && !original.body && !original.initializer, "Unsupported declared value.");
        // <lang><zh-CN>一基UTF-16排除终点与实际声明/JSDoc分别记录，变量注释来自其真实语句。</zh-CN><en>Record one-based UTF-16 exclusive declaration/JSDoc ranges separately, obtaining variable documentation from its actual statement.</en></lang>
        const range = node => {
          const start = source.getLineAndCharacterOfPosition(node.getStart(source));
          const end = source.getLineAndCharacterOfPosition(node.getEnd());
          return {start:{line:start.line + 1,column:start.character + 1},end:{line:end.line + 1,column:end.character + 1}};
        };
        const owner = ts.isVariableDeclaration(original) ? original.parent.parent : original;
        const comment = owner.jsDoc?.at(-1);
        const keyword = original.parent.flags & ts.NodeFlags.Const ? "const" : original.parent.flags & ts.NodeFlags.Let ? "let" : "var";
        const signature = ts.isVariableDeclaration(original) ? `${keyword} ${original.name.getText(source)}: ${original.type.getText(source)}` : original.getText(source).trim().replace(/;\s*$/, "");
        // <lang><zh-CN>参数与返回字段按实际函数签名要求，不能由一个摘要替代。</zh-CN><en>Actual function signatures require parameter and return fields instead of one summary.</en></lang>
        const requiredFields = ts.isFunctionDeclaration(original) ? [...original.parameters.map(parameter => `params.${parameter.name.getText(source)}.description`), "returns"] : [];
        // <lang><zh-CN>原JSDoc显式块也必须有对应字段，重复异常/示例保留序号，避免提取阶段丢失后被跨工件一致性掩盖。</zh-CN><en>Explicit source JSDoc blocks also require fields, retaining repeated throws/example indices so cross-artifact parity cannot conceal extraction loss.</en></lang>
        const counts = new Map();
        for (const tag of comment?.tags ?? []) {
          const name = tag.tagName.text;
          const raw = tag.getText(source).replace(/^@\S+\s*/, "");
          const parameter = tag.name?.getText(source) ?? raw.match(/^\S+/)?.[0];
          let base = fieldsByTag.get(name);
          if (name === "param") base = `params.${parameter}.description`;
          if (["typeParam", "template"].includes(name)) base = `typeParams.${parameter}.description`;
          if (!base) continue;
          const index = counts.get(base) ?? 0;
          const key = ["throws","examples"].includes(base) || index > 0 ? `${base}.${index}` : base;
          counts.set(base, index + 1);
          if (!requiredFields.includes(key)) requiredFields.push(key);
        }
        declarations.push({name:binding.name,kind:ts.SyntaxKind[original.kind],path:source.fileName,range:range(original),commentRange:comment ? range(comment) : null,signature,requiredFields});
      }
      bindings.push({module:module.path,name:binding.name,declarations});
    }
  }
  return {bindings,sources:[...sources].map(([path,record]) => ({path,sha256:record.sha256}))};
}

/**
 * @lang zh-CN 对照实际提取/地图核值根及其参数/返回字段，明确不证明运行状态或内部类型成员。
 * @lang en Checks actual extraction/maps against value roots and their parameter/return fields without asserting runtime state or nested type-member coverage.
 * @param {object} input <lang><zh-CN>独立expected和已验证的实际提取/地图。</zh-CN><en>Independent expectations and validated actual extraction/maps.</en></lang>
 * @returns {object} <lang><zh-CN>逐根缺口及值根范围内的完整标记。</zh-CN><en>Per-root gaps and completeness within the value-root scope.</en></lang>
 */
export function verifyDeclarationValueProjection({expected, extraction, map}) {
  const roots = [];
  for (const binding of expected.bindings) {
    // <lang><zh-CN>模块和公开名限定允许的根，不接受同名私有节点或另一入口替身。</zh-CN><en>The module and public name delimit allowed roots, excluding same-named private nodes and other-entry substitutes.</en></lang>
    const entry = extraction.modules.find(module => module.path === binding.module)?.exports.find(item => item.name === binding.name);
    const nodes = entry?.symbolIds.map(id => extraction.symbols.find(node => node.id === id)).filter(Boolean) ?? [];
    for (const declaration of binding.declarations) {
      const matches = nodes.filter(node => node.name === binding.name && node.source.path === declaration.path && isDeepStrictEqual(node.source.range, declaration.range));
      const node = matches.length === 1 ? matches[0] : undefined;
      const result = verifyDeclarationApiNode(declaration, node, map);
      if (node && (!node.exported || node.parentId || node.metadata?.modulePath !== binding.module || node.metadata?.syntaxKind !== declaration.kind)) result.gaps.push("value-root-scope-mismatch");
      if (nodes.length !== binding.declarations.length) result.gaps.push("value-declaration-count");
      for (const key of declaration.requiredFields) {
        // <lang><zh-CN>直接核原字段中两语，defaultText与显示回退不构成独立参数/返回正文。</zh-CN><en>Check both original field locales directly; defaultText and display fallback do not provide independent parameter/return prose.</en></lang>
        const text = node?.comment?.i18n?.fields?.[key]?.localizedText;
        if (!text?.en?.trim() || !text?.["zh-CN"]?.trim() || text.en.trim() === text["zh-CN"].trim()) result.gaps.push(`missing-field-locales:${key}`);
      }
      roots.push({...result,module:binding.module,binding:binding.name});
    }
  }
  const gaps = roots.filter(row => row.gaps.length);
  return {scope:"declaration-value-roots",bindings:expected.bindings.length,rootDeclarations:roots.length,verifiedRoots:roots.length - gaps.length,rootGaps:gaps.length,roots,complete:roots.length > 0 && gaps.length === 0,runtimeStateVerified:false,nestedTypeMembersVerified:false};
}
