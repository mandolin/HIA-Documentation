/**
 * @file
 * @lang zh-CN 有界静态声明数据读取与JSON资源比较；只解释白名单AST，绝不导入或执行目标模块。
 * @lang en Bounded static declaration-data reading and JSON resource comparison, interpreting allowlisted AST only without importing or executing target modules.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import { inspectJsonResource } from "./json-resource-audit.mjs";

/**
 * @lang zh-CN 静态读取一个模块的JSON形状导出，保留逐值来源；结果仅证明初始化声明数据。
 * @lang en Statically reads a JSON-shaped module export with per-value provenance; results prove initializer declaration data only.
 * @param {string} root <lang><zh-CN>显式授权的仓库物理根。</zh-CN><en>Explicitly authorized physical repository root.</en></lang>
 * @param {string} modulePath <lang><zh-CN>根内模块相对路径。</zh-CN><en>Root-relative module path.</en></lang>
 * @param {string} exportName <lang><zh-CN>确切公开导出名。</zh-CN><en>Exact public export name.</en></lang>
 * @returns {object} <lang><zh-CN>available包含值、Pointer和来源，unverified包含固定原因码。</zh-CN><en>Available includes values, pointers and sources; unverified includes a fixed reason code.</en></lang>
 */
export function readStaticJsonExport(root, modulePath, exportName) {
  // <lang><zh-CN>缓存和循环集合仅服务本次导出，不复用先前文件内容或运行状态。</zh-CN><en>Caches and cycle sets belong to this export only, never reusing earlier file contents or runtime state.</en></lang>
  const base = fs.realpathSync(root);
  const modules = new Map();
  const active = new Set();
  const jsonLineStarts = new WeakMap();
  let steps = 0;
  const compilerOptions = { allowJs: true, moduleResolution: ts.ModuleResolutionKind.NodeNext, module: ts.ModuleKind.NodeNext };
  const resolutionCache = ts.createModuleResolutionCache(base, value => value, compilerOptions);

  /**
   * @lang zh-CN 用固定原因终止本分支，不回显私有表达式或系统异常。
   * @lang en Terminates this branch with a fixed reason, without echoing private expressions or system exceptions.
   * @param {string} code <lang><zh-CN>静态边界码。</zh-CN><en>Static boundary code.</en></lang>
   * @throws {Error} <lang><zh-CN>携带安全边界码。</zh-CN><en>Carries a safe boundary code.</en></lang>
   */
  function boundary(code) { throw Object.assign(new Error(code), { staticJsonBoundary: code }); }

  /**
   * @lang zh-CN 校验原模块路径和物理文件，返回根内规范路径。
   * @lang en Validates the original module path and physical file, returning its canonical root-relative path.
   * @param {string} relative <lang><zh-CN>待检查路径。</zh-CN><en>Path to inspect.</en></lang>
   * @returns {string} <lang><zh-CN>完整物理文件名。</zh-CN><en>Complete physical filename.</en></lang>
   */
  function checkedFile(relative) {
    if (typeof relative !== "string" || !relative || /[\\:%?#\u0000-\u001f]/.test(relative) || relative.split("/").some(part => !part || part === "." || part === "..")) boundary("unsafe-source-path");
    const file = path.join(base, relative);
    const state = fs.lstatSync(file);
    if (!state.isFile() || state.isSymbolicLink() || state.nlink !== 1 || state.size > 4 * 1024 * 1024 || fs.realpathSync(file) !== file) boundary("unsafe-source-file");
    return file;
  }

  /**
   * @lang zh-CN 记录真实AST节点的排除终点UTF16来源；源文件字节另以摘要固定。
   * @lang en Records exclusive UTF16 provenance for an actual AST node, with source-file bytes fixed separately by digest.
   * @param {object} node <lang><zh-CN>真实源码AST节点。</zh-CN><en>Actual source AST node.</en></lang>
   * @param {object} [source] <lang><zh-CN>JSON AST显式提供来源，其它节点默认取原文件。</zh-CN><en>Explicit source for JSON ASTs; other nodes default to their original file.</en></lang>
   * @returns {object} <lang><zh-CN>相对路径和一基范围。</zh-CN><en>Relative path and one-based range.</en></lang>
   */
  function origin(node, source = node.getSourceFile()) {
    /**
     * @lang zh-CN 按语言适用的行模型转换UTF16偏移，JSON使用物理行，JavaScript使用原生解析行。
     * @lang en Converts UTF16 offsets using the language's line model, physical lines for JSON and native parser lines for JavaScript.
     * @param {number} offset <lang><zh-CN>原文UTF16偏移。</zh-CN><en>Original UTF16 offset.</en></lang>
     * @returns {object} <lang><zh-CN>一基行列。</zh-CN><en>One-based line and column.</en></lang>
     */
    const position = offset => {
      if (source.scriptKind === ts.ScriptKind.JSON) {
        // <lang><zh-CN>JSON物理行只按CRLF/LF/CR计数，原生JSON AST的Unicode分隔符行模型不用于产物坐标。</zh-CN><en>JSON physical lines count CRLF/LF/CR only; native JSON AST Unicode-separator line modeling never supplies artifact coordinates.</en></lang>
        if (!jsonLineStarts.has(source)) jsonLineStarts.set(source, [0, ...[...source.text.matchAll(/\r\n|\r|\n/g)].map(match => match.index + match[0].length)]);
        const starts = jsonLineStarts.get(source);
        let lower = 0;
        let upper = starts.length - 1;
        while (lower < upper) {
          const middle = Math.floor((lower + upper + 1) / 2);
          if (starts[middle] <= offset) lower = middle;
          else upper = middle - 1;
        }
        return { line: lower + 1, column: offset - starts[lower] + 1 };
      }
      const point = source.getLineAndCharacterOfPosition(offset);
      return { line: point.line + 1, column: point.character + 1 };
    };
    return { path: path.relative(base, source.fileName).split(path.sep).join("/"), kind: ts.SyntaxKind[node.kind], range: { start: position(node.getStart(source)), end: position(node.end) }, rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" } };
  }

  /**
   * @lang zh-CN 读取并解析授权模块，只登记顶层声明及导入导出，不执行语句。
   * @lang en Reads and parses an authorized module, registering top-level declarations and imports/exports without executing statements.
   * @param {string} relative <lang><zh-CN>模块相对路径。</zh-CN><en>Relative module path.</en></lang>
   * @returns {object} <lang><zh-CN>本次AST及绑定索引。</zh-CN><en>Invocation-local AST and binding index.</en></lang>
   */
  function moduleAt(relative) {
    if (modules.has(relative)) return modules.get(relative);
    if (modules.size >= 128) boundary("source-file-budget");
    const file = checkedFile(relative);
    const before = fs.statSync(file);
    const bytes = fs.readFileSync(file);
    const after = fs.statSync(file);
    if (before.ino !== after.ino || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || before.size !== bytes.length || after.size !== bytes.length) boundary("source-changed");
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (relative.endsWith(".json")) {
      // <lang><zh-CN>JSON模块直接采用严格资源审核的值和来源，导入只提供default数据，不执行JS。</zh-CN><en>JSON modules use strict resource-audit values and provenance directly, exposing default data without JavaScript execution.</en></lang>
      const inspected = inspectJsonResource(bytes);
      const jsonSource = ts.parseJsonText(file, text);
      const declarations = new Map();
      /**
       * @lang zh-CN 为JSON导入补真实属性名和完整属性声明范围，保留JSON Pointer对应关系。
       * @lang en Adds actual property-name and whole-property ranges for JSON imports while retaining JSON Pointer correspondence.
       * @param {object} node <lang><zh-CN>严格JSON AST值。</zh-CN><en>Strict JSON AST value.</en></lang>
       * @param {string} pointer <lang><zh-CN>当前Pointer。</zh-CN><en>Current pointer.</en></lang>
       */
      function collectJsonDeclarations(node, pointer) {
        if (ts.isObjectLiteralExpression(node)) for (const property of node.properties) {
          const key = JSON.parse(property.name.getText(jsonSource));
          const childPointer = `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
          declarations.set(childPointer, { declaration: origin(property, jsonSource), keyOrigin: origin(property.name, jsonSource) });
          collectJsonDeclarations(property.initializer, childPointer);
        }
        if (ts.isArrayLiteralExpression(node)) node.elements.forEach((element, index) => collectJsonDeclarations(element, `${pointer}/${index}`));
      }
      collectJsonDeclarations(jsonSource.statements[0].expression, "");
      const values = new Map();
      for (const record of inspected.nodes) {
        const node = { type: record.type, origin: { path: relative, range: record.range, rangeConvention: inspected.rangeConvention } };
        if (node.type === "object") node.properties = new Map();
        else if (node.type === "array") node.children = [];
        else {
          node.value = JSON.parse(record.lexeme);
          if (node.type === "number" && !Number.isSafeInteger(node.value)) boundary("number-outside-exact-integer-scope");
        }
        values.set(record.pointer, node);
        if (record.pointer !== "") {
          const slash = record.pointer.lastIndexOf("/");
          const parent = values.get(record.pointer.slice(0, slash));
          const key = record.pointer.slice(slash + 1).replaceAll("~1", "/").replaceAll("~0", "~");
          if (parent.type === "array") parent.children.push(node);
          else parent.properties.set(key, { node, ...declarations.get(record.pointer) });
        }
      }
      const context = { relative, json: values.get(""), sha256: inspected.sha256 };
      modules.set(relative, context);
      return context;
    }
    // <lang><zh-CN>AST前先限制token和嵌套，避免小体积病理源码耗尽解析器栈。</zh-CN><en>Bound tokens and nesting before AST construction to prevent small pathological sources from exhausting the parser stack.</en></lang>
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
    let tokens = 0;
    let depth = 0;
    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
      if ([ts.SyntaxKind.OpenBraceToken, ts.SyntaxKind.OpenBracketToken, ts.SyntaxKind.OpenParenToken].includes(token)) depth++;
      if ([ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CloseParenToken].includes(token)) depth--;
      if (++tokens > 250000 || depth > 128) boundary("source-syntax-budget");
    }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /\.(?:ts|mts|cts)$/.test(relative) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    if (source.parseDiagnostics.length) boundary("source-syntax");
    const context = { source, relative, variables: new Map(), imports: new Map(), exports: new Map(), stars: [], objectShadowed: false, updatedNames: new Set(), values: new Map(), sha256: createHash("sha256").update(bytes).digest("hex") };
    modules.set(relative, context);
    for (const statement of source.statements) {
      if (statement.name?.text === "Object") context.objectShadowed = true;
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const name = declaration.name.text;
        context.variables.set(name, { node: declaration.initializer, declaration, immutable: Boolean(statement.declarationList.flags & ts.NodeFlags.Const) });
        if (name === "Object") context.objectShadowed = true;
        if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) context.exports.set(name, { local: name });
      }
      if (ts.isImportDeclaration(statement) && statement.importClause && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        if (clause.isTypeOnly) continue;
        const specifier = statement.moduleSpecifier.text;
        if (clause.name) context.imports.set(clause.name.text, { specifier, imported: "default" });
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) context.imports.set(clause.namedBindings.name.text, { specifier, namespace: true });
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const element of clause.namedBindings.elements) {
          if (!element.isTypeOnly) context.imports.set(element.name.text, { specifier, imported: element.propertyName?.text ?? element.name.text });
        }
        if (context.imports.has("Object")) context.objectShadowed = true;
      }
      if (ts.isExportDeclaration(statement)) {
        const specifier = statement.moduleSpecifier?.text;
        if (statement.isTypeOnly) continue;
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const element of statement.exportClause.elements) {
          if (!element.isTypeOnly) context.exports.set(element.name.text, specifier ? { specifier, imported: element.propertyName?.text ?? element.name.text } : { local: element.propertyName?.text ?? element.name.text });
        }
        else if (!statement.exportClause && specifier) context.stars.push(specifier);
      }
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) context.exports.set("default", { node: statement.expression });
    }
    // <lang><zh-CN>函数体未在模块加载时执行；模块级更新及其直接别名按根身份传播，相关数据保持未核。</zh-CN><en>Function bodies do not execute during module initialization; module-level updates propagate through direct aliases by root identity, leaving affected data unverified.</en></lang>
    collectUpdates(source, context.updatedNames);
    for (const name of context.updatedNames) {
      const target = rootIdentifier(context.variables.get(name)?.node);
      if (target) context.updatedNames.add(target);
    }
    if (["Object", "globalThis", "global", "window", "self"].some(name => context.updatedNames.has(name))) context.objectShadowed = true;
    return context;
  }

  /**
   * @lang zh-CN 识别静态属性或索引链的根变量；调用、getter和其它表达式不推导别名。
   * @lang en Identifies the root variable of static property/index chains without inferring aliases from calls, getters or other expressions.
   * @param {object} node <lang><zh-CN>AST表达式。</zh-CN><en>AST expression.</en></lang>
   * @returns {string|undefined} <lang><zh-CN>根标识符。</zh-CN><en>Root identifier.</en></lang>
   */
  function rootIdentifier(node) {
    while (node && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isParenthesizedExpression(node))) node = node.expression;
    return node && ts.isIdentifier(node) ? node.text : undefined;
  }

  /**
   * @lang zh-CN 记录模块级赋值/删除/增减涉及的根，跳过延后执行的函数体。
   * @lang en Records roots touched by module-level assignment/deletion/update, skipping deferred function bodies.
   * @param {object} node <lang><zh-CN>当前AST节点。</zh-CN><en>Current AST node.</en></lang>
   * @param {Set} names <lang><zh-CN>受影响绑定。</zh-CN><en>Affected bindings.</en></lang>
   */
  function collectUpdates(node, names) {
    if (ts.isFunctionLike(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node)) return;
    let target;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) target = node.left;
    if (ts.isDeleteExpression(node)) target = node.expression;
    if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) target = node.operand;
    const name = rootIdentifier(target);
    if (name) names.add(name);
    ts.forEachChild(node, child => collectUpdates(child, names));
  }

  /**
   * @lang zh-CN 由官方模块解析器解析导入，真实目标必须仍在授权仓内。
   * @lang en Resolves imports with the official module resolver, requiring the physical target to remain within the authorized repository.
   * @param {object} context <lang><zh-CN>导入方模块。</zh-CN><en>Importing module.</en></lang>
   * @param {string} specifier <lang><zh-CN>静态模块声明。</zh-CN><en>Static module specifier.</en></lang>
   * @returns {object} <lang><zh-CN>授权目标模块。</zh-CN><en>Authorized target module.</en></lang>
   */
  function importedModule(context, specifier) {
    const resolved = ts.resolveModuleName(specifier, context.source.fileName, compilerOptions, ts.sys, resolutionCache).resolvedModule;
    if (!resolved || resolved.resolvedFileName.endsWith(".d.ts")) boundary("unresolved-runtime-import");
    const relative = path.relative(base, fs.realpathSync(resolved.resolvedFileName)).split(path.sep).join("/");
    if (relative.startsWith("../") || path.isAbsolute(relative) || relative.split("/").includes("node_modules")) boundary("outside-source-root");
    return moduleAt(relative);
  }

  /**
   * @lang zh-CN 限制引用深度并检测循环，单条读取路径结束后释放访问标记。
   * @lang en Bounds reference depth and detects cycles, releasing visit markers after each read branch.
   * @param {string} key <lang><zh-CN>模块和绑定身份。</zh-CN><en>Module and binding identity.</en></lang>
   * @param {Function} read <lang><zh-CN>受限静态读取。</zh-CN><en>Restricted static read.</en></lang>
   * @returns {object} <lang><zh-CN>声明数据节点。</zh-CN><en>Declaration-data node.</en></lang>
   */
  function guarded(key, read) {
    if (active.has(key)) boundary("cyclic-binding");
    if (active.size >= 128) boundary("binding-depth-budget");
    active.add(key);
    try { return read(); } finally { active.delete(key); }
  }

  /**
   * @lang zh-CN 跟随明确导出和重导出，多个star候选保守登记为歧义。
   * @lang en Follows explicit exports and re-exports, conservatively recording multiple star candidates as ambiguous.
   * @param {object} context <lang><zh-CN>当前模块。</zh-CN><en>Current module.</en></lang>
   * @param {string} name <lang><zh-CN>导出名。</zh-CN><en>Export name.</en></lang>
   * @returns {object} <lang><zh-CN>声明数据节点。</zh-CN><en>Declaration-data node.</en></lang>
   */
  function exported(context, name) {
    if (context.json) {
      if (name !== "default") boundary("json-module-named-export");
      return context.json;
    }
    return guarded(`${context.relative}#export:${name}`, () => {
      const binding = context.exports.get(name);
      if (binding?.local) return local(context, binding.local);
      if (binding?.specifier) return exported(importedModule(context, binding.specifier), binding.imported);
      if (binding?.node) return expression(context, binding.node);
      if (context.stars.length === 1) return exported(importedModule(context, context.stars[0]), name);
      boundary(context.stars.length ? "ambiguous-star-export" : "missing-export");
    });
  }

  /**
   * @lang zh-CN 读取const或导入别名，拒绝可变及缺少初始化的绑定。
   * @lang en Reads const bindings or import aliases, rejecting mutable or uninitialized bindings.
   * @param {object} context <lang><zh-CN>当前模块。</zh-CN><en>Current module.</en></lang>
   * @param {string} name <lang><zh-CN>局部绑定名。</zh-CN><en>Local binding name.</en></lang>
   * @returns {object} <lang><zh-CN>声明数据节点。</zh-CN><en>Declaration-data node.</en></lang>
   */
  function local(context, name) {
    if (context.updatedNames.has(name)) boundary("top-level-data-update");
    if (context.values.has(name)) return context.values.get(name);
    return guarded(`${context.relative}#local:${name}`, () => {
      const variable = context.variables.get(name);
      if (variable) {
        if (!variable.immutable || !variable.node) boundary("mutable-or-uninitialized-binding");
        // <lang><zh-CN>值来源与变量声明链分别保存，字段引用常量时可精确证明编译器追到的原变量位置。</zh-CN><en>Retain value provenance separately from variable-declaration chains so fields referencing constants can prove the original variable position followed by the compiler.</en></lang>
        const resolved = expression(context, variable.node);
        const value = { ...resolved, bindingDeclarations: [origin(variable.declaration), ...(resolved.bindingDeclarations ?? [])] };
        context.values.set(name, value);
        return value;
      }
      const imported = context.imports.get(name);
      if (imported && !imported.namespace) return exported(importedModule(context, imported.specifier), imported.imported);
      boundary("unresolved-binding");
    });
  }

  /**
   * @lang zh-CN 解释白名单JSON形状表达式，未知调用或语法显式未核。
   * @lang en Interprets allowlisted JSON-shaped expressions, explicitly leaving unknown calls or syntax unverified.
   * @param {object} context <lang><zh-CN>当前AST模块。</zh-CN><en>Current AST module.</en></lang>
   * @param {object} node <lang><zh-CN>真实初始化表达式。</zh-CN><en>Actual initializer expression.</en></lang>
   * @returns {object} <lang><zh-CN>带来源的数据树。</zh-CN><en>Data tree with provenance.</en></lang>
   */
  function expression(context, node) {
    if (++steps > 250000) boundary("expression-budget");
    const provenance = origin(node);
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return expression(context, node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { type: "string", value: node.text, origin: provenance };
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return { type: "boolean", value: node.kind === ts.SyntaxKind.TrueKeyword, origin: provenance };
    if (node.kind === ts.SyntaxKind.NullKeyword) return { type: "null", value: null, origin: provenance };
    if (ts.isNumericLiteral(node) || ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken].includes(node.operator) && ts.isNumericLiteral(node.operand)) {
      const value = ts.isNumericLiteral(node) ? Number(node.text) : (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1) * Number(node.operand.text);
      if (!Number.isSafeInteger(value)) boundary("number-outside-exact-integer-scope");
      return { type: "number", value, origin: provenance };
    }
    if (ts.isIdentifier(node)) return local(context, node.text);
    if (ts.isPropertyAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && context.imports.get(node.expression.text)?.namespace) return exported(importedModule(context, context.imports.get(node.expression.text).specifier), node.name.text);
      const owner = expression(context, node.expression);
      if (owner.type !== "object" || !owner.properties.has(node.name.text)) boundary("missing-static-property");
      return owner.properties.get(node.name.text).node;
    }
    if (ts.isArrayLiteralExpression(node)) {
      const children = [];
      for (const element of node.elements) {
        if (ts.isSpreadElement(element)) {
          const spread = expression(context, element.expression);
          if (spread.type !== "array") boundary("non-array-spread");
          children.push(...spread.children);
        } else children.push(expression(context, element));
      }
      return { type: "array", children, origin: provenance };
    }
    if (ts.isObjectLiteralExpression(node)) {
      // <lang><zh-CN>Map保留后声明覆盖和原插入顺序，特殊键从不写入审核器自身原型。</zh-CN><en>Map retains last-declaration overrides and original insertion order, never writing special keys into the auditor's prototype.</en></lang>
      const properties = new Map();
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property)) {
          const spread = expression(context, property.expression);
          if (spread.type !== "object") boundary("non-object-spread");
          for (const [key, value] of spread.properties) properties.set(key, value);
          continue;
        }
        if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) boundary("non-data-property");
        if (ts.isShorthandPropertyAssignment(property) && property.objectAssignmentInitializer) boundary("non-data-property");
        const computed = ts.isComputedPropertyName(property.name);
        const name = computed ? property.name.expression : property.name;
        if (!ts.isIdentifier(name) && !ts.isStringLiteral(name) && !ts.isNumericLiteral(name) && !ts.isNoSubstitutionTemplateLiteral(name)) boundary("dynamic-property-key");
        if (computed && ts.isIdentifier(name)) boundary("dynamic-property-key");
        const key = ts.isNumericLiteral(name) ? String(Number(name.text)) : name.text;
        if (key === "__proto__" && !computed && ts.isPropertyAssignment(property)) boundary("prototype-setter-syntax");
        const value = ts.isShorthandPropertyAssignment(property) ? local(context, property.name.text) : expression(context, property.initializer);
        properties.set(key, { node: value, declaration: origin(property), keyOrigin: origin(property.name) });
      }
      return { type: "object", properties, origin: provenance };
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Object" && !context.objectShadowed && node.arguments.length === 1 && !node.questionDotToken) {
      const operation = node.expression.name.text;
      if (!["freeze", "values", "keys"].includes(operation)) boundary("unsupported-call");
      const argument = expression(context, node.arguments[0]);
      if (operation === "freeze") return argument;
      if (argument.type !== "object") boundary("non-object-enumeration");
      // <lang><zh-CN>ECMAScript先枚举数组索引键，其余字符串键保持插入顺序；数据来自已验证Map，不调用getter。</zh-CN><en>ECMAScript enumerates array-index keys first and retains insertion order for other strings; data comes from validated Maps without invoking getters.</en></lang>
      const entries = [...argument.properties].sort(([left], [right]) => {
        const index = key => /^(?:0|[1-9][0-9]*)$/.test(key) && Number(key) < 4294967295;
        return index(left) && index(right) ? Number(left) - Number(right) : index(left) ? -1 : index(right) ? 1 : 0;
      });
      return { type: "array", children: entries.map(([key, value]) => operation === "values" ? value.node : { type: "string", value: key, origin: value.keyOrigin }), origin: provenance };
    }
    boundary("unsupported-expression");
  }

  try {
    const tree = exported(moduleAt(modulePath), exportName);
    const nodes = [];
    let pointerUnits = 0;
    /**
     * @lang zh-CN 展开有界数据树并记录每个值的Pointer及实际初始化来源。
     * @lang en Expands the bounded data tree, recording every value's pointer and actual initializer provenance.
     * @param {object} node <lang><zh-CN>受限数据节点。</zh-CN><en>Restricted data node.</en></lang>
     * @param {string} pointer <lang><zh-CN>当前RFC6901位置。</zh-CN><en>Current RFC6901 location.</en></lang>
     * @param {object} [declaration] <lang><zh-CN>实际属性声明来源。</zh-CN><en>Actual property-declaration provenance.</en></lang>
     * @returns {unknown} <lang><zh-CN>普通JSON数据。</zh-CN><en>Ordinary JSON data.</en></lang>
     */
    function materialize(node, pointer, declaration) {
      pointerUnits += pointer.length;
      if (nodes.length >= 100000 || pointerUnits > 2000000) boundary("value-budget");
      nodes.push({ pointer, type: node.type, origin: node.origin, ...(declaration ? { declaration } : {}), valueDeclarationSources: node.bindingDeclarations ?? [], ...(!["array", "object"].includes(node.type) ? { value: node.value } : {}) });
      if (node.type === "array") return node.children.map((child, index) => materialize(child, `${pointer}/${index}`));
      if (node.type === "object") {
        const value = Object.create(null);
        for (const [key, child] of node.properties) value[key] = materialize(child.node, `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`, child.declaration);
        return value;
      }
      return node.value;
    }
    const value = materialize(tree, "");
    return { status: "available", evidenceKind: "static-initializer-data", module: modulePath, exportName, value, nodes, sources: [...modules.values()].map(module => ({ path: module.relative, sha256: module.sha256 })) };
  } catch (error) {
    return { status: "unverified", reason: error.staticJsonBoundary ?? "source-read-failed", module: modulePath, exportName };
  }
}

/**
 * @lang zh-CN 将已审计JSON资源与静态初始化树完整逐值比较，数值仅在精确整数范围内确认相等。
 * @lang en Compares audited JSON resources with complete static initializer trees per value, confirming numeric equality within the exact integer scope only.
 * @param {object} declared <lang><zh-CN>静态读取结果。</zh-CN><en>Static read result.</en></lang>
 * @param {object} resource <lang><zh-CN>独立JSON审核结果。</zh-CN><en>Independent JSON audit result.</en></lang>
 * @returns {object} <lang><zh-CN>equal、different或unverified及固定原因。</zh-CN><en>Equal, different or unverified with a fixed reason.</en></lang>
 */
export function compareStaticJsonResource(declared, resource) {
  if (declared.status !== "available") return { status: "unverified", reason: declared.reason };
  if (declared.nodes.length !== resource.nodes.length) return { status: "different", reason: "value-count" };
  const expected = new Map(resource.nodes.map(node => [node.pointer, node]));
  for (const actual of declared.nodes) {
    const node = expected.get(actual.pointer);
    if (!node || actual.type !== node.type) return { status: "different", reason: "pointer-or-type" };
    if (["object", "array"].includes(node.type)) continue;
    if (node.type === "number") {
      // <lang><zh-CN>按十进制系数与指数核对数学整数，禁止JSON.parse先舍入后匹配。</zh-CN><en>Compare mathematical integers using decimal coefficients and exponents, never matching after JSON.parse rounding.</en></lang>
      const match = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(node.lexeme);
      const digits = (match[2] + (match[3] ?? "")).replace(/^0+/, "");
      const scale = Number(match[4] ?? 0) - (match[3]?.length ?? 0);
      if (!Number.isSafeInteger(scale) || Math.abs(scale) > 1000) return { status: "unverified", reason: "number-outside-exact-integer-scope" };
      if (scale < 0 && digits && !digits.endsWith("0".repeat(-scale))) return { status: "unverified", reason: "number-outside-exact-integer-scope" };
      const integer = !digits ? 0n : BigInt(match[1] + (scale >= 0 ? digits + "0".repeat(scale) : digits.slice(0, scale) || "0"));
      if (integer !== BigInt(actual.value)) return { status: "different", reason: "number-value" };
    } else if (actual.value !== JSON.parse(node.lexeme)) return { status: "different", reason: "scalar-value" };
  }
  return { status: "equal", values: declared.nodes.length };
}
