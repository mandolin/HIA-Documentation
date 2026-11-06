/**
 * @file
 * @lang zh-CN 按完整定义模块顺序核验有限普通数据图，保留对象身份、来源和未核边界。
 * @lang en Audits finite plain-data graphs in complete definition-module order, retaining object identity, provenance and unverified boundaries.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import { readStaticJsonExport } from "./static-json-export.mjs";
import {createMetadataDependencyPolicy} from "./metadata-dependencies.mjs";

/**
 * @lang zh-CN 静态核验确切导出的定义初始化图。重导出只证明绑定，目标模块始终只读。
 * @lang en Statically audits an exact export's definition-initialization graph. Reexports prove linkage only; target modules are always read-only.
 * @param {string} root <lang><zh-CN>显式授权的物理仓库根。</zh-CN><en>Explicitly authorized physical repository root.</en></lang>
 * @param {string} modulePath <lang><zh-CN>仓内模块相对路径。</zh-CN><en>Repository-relative module path.</en></lang>
 * @param {string} exportName <lang><zh-CN>确切公开导出名。</zh-CN><en>Exact public export name.</en></lang>
 * @param {object} [dependencyOptions] <lang><zh-CN>显式authorizedPackages授权metadata依赖，缺省保留相对依赖限制。</zh-CN><en>Explicit authorizedPackages grants metadata dependencies; defaults retain relative-only restrictions.</en></lang>
 * @returns {object} <lang><zh-CN>available含值、来源和事件，数组槽创建范围独立保存；unverified含固定原因。均不证明包装模块或运行时状态。</zh-CN><en>Available contains values, provenance and events, retaining array-slot creation ranges separately; unverified contains a fixed reason. Neither proves wrapper or runtime state.</en></lang>
 */
export function readStaticJsonInitializationGraph(root, modulePath, exportName,dependencyOptions={}) {
  // <lang><zh-CN>文件、图和事件只在本次请求内共享，防止跨请求状态或摘要缓存污染。</zh-CN><en>Files, graph nodes and events are shared within this request only, preventing cross-request state or digest-cache contamination.</en></lang>
  const modules = new Map();
  const events = [];
  const linkage = [];
  const resolving = new Set();
  const options = { allowJs: true, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext };
  let base;
  let metadataPolicy;
  let nodeCount = 0;
  let edgeCount = 0;
  let expressionCount = 0;
  let provenanceUnits = 0;

  /**
   * @lang zh-CN 用固定原因中止，不回显源码或系统异常。
   * @lang en Stops with a fixed reason without echoing source or system exceptions.
   * @param {string} reason <lang><zh-CN>安全边界码。</zh-CN><en>Safe boundary code.</en></lang>
   */
  function boundary(reason) { throw Object.assign(new Error(reason), { initializationBoundary: reason }); }

  /**
   * @lang zh-CN 独立约束来源数组复制，避免少量共享节点放大别名历史。
   * @lang en Separately bounds provenance-array copying so small shared graphs cannot amplify alias histories.
   * @param {number} count <lang><zh-CN>本次复制或增加的引用数。</zh-CN><en>References copied or added by this operation.</en></lang>
   */
  function chargeProvenance(count) {
    provenanceUnits += count;
    if (provenanceUnits > 200000) boundary("provenance-budget");
  }

  /**
   * @lang zh-CN 记录真实AST节点的排除终点UTF16范围。
   * @lang en Records exclusive-end UTF16 ranges for actual AST nodes.
   * @param {object} node <lang><zh-CN>原AST节点。</zh-CN><en>Original AST node.</en></lang>
   * @returns {object} <lang><zh-CN>仓内来源。</zh-CN><en>Repository-relative provenance.</en></lang>
   */
  function origin(node) {
    const source = node.getSourceFile();
    const start = source.getLineAndCharacterOfPosition(node.getStart(source));
    const end = source.getLineAndCharacterOfPosition(node.end);
    return {
      path: path.relative(base, source.fileName).split(path.sep).join("/"), kind: ts.SyntaxKind[node.kind],
      range: { start: { line: start.line + 1, column: start.character + 1 }, end: { line: end.line + 1, column: end.character + 1 } },
      rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }
    };
  }

  /**
   * @lang zh-CN 为有序模型事件计费，事件只描述静态推导。
   * @lang en Charges ordered model events, which describe static inference only.
   * @param {string} kind <lang><zh-CN>事件种类。</zh-CN><en>Event kind.</en></lang>
   * @param {object} source <lang><zh-CN>事件来源。</zh-CN><en>Event provenance.</en></lang>
   * @param {object} detail <lang><zh-CN>安全模型字段。</zh-CN><en>Safe model fields.</en></lang>
   */
  function event(kind, source, detail = {}) {
    if (events.length >= 100000) boundary("initialization-event-budget");
    events.push({ sequence: events.length, kind, origin: source, ...detail });
  }

  /**
   * @lang zh-CN 分配有身份的数据节点，对象所有权与绑定名称分开。
   * @lang en Allocates an identified data node, separating object ownership from binding names.
   * @param {string} type <lang><zh-CN>JSON节点类型。</zh-CN><en>JSON node type.</en></lang>
   * @param {object} source <lang><zh-CN>原值来源。</zh-CN><en>Original value provenance.</en></lang>
   * @param {string} owner <lang><zh-CN>创建模块。</zh-CN><en>Allocating module.</en></lang>
   * @param {unknown} value <lang><zh-CN>标量值。</zh-CN><en>Scalar value.</en></lang>
   * @returns {object} <lang><zh-CN>本次图节点。</zh-CN><en>Invocation-local graph node.</en></lang>
   */
  function allocate(type, source, owner, value) {
    if (++nodeCount > 100000) boundary("heap-node-budget");
    const node = { id: nodeCount, type, origin: source, owner, frozen: false, aliases: [] };
    if (["object", "array"].includes(type)) node.properties = new Map();
    else node.value = value;
    event("allocate", source, { graphNodeId: node.id, type });
    return node;
  }

  /**
   * @lang zh-CN 维护属性边预算，替换也计操作成本。
   * @lang en Maintains the property-edge budget, charging replacements as operations too.
   * @param {object} node <lang><zh-CN>目标图节点。</zh-CN><en>Target graph node.</en></lang>
   * @param {string} key <lang><zh-CN>静态自有键。</zh-CN><en>Static own key.</en></lang>
   * @param {object} slot <lang><zh-CN>值引用及来源。</zh-CN><en>Value reference and provenance.</en></lang>
   */
  function setSlot(node, key, slot) {
    if (slot.node.type === "namespace") boundary("non-json-value");
    if (++edgeCount > 200000) boundary("property-edge-budget");
    node.properties.set(key, slot);
  }

  /**
   * @lang zh-CN 按ECMAScript枚举次序读取自身数据属性。
   * @lang en Reads own data properties in ECMAScript enumeration order.
   * @param {object} node <lang><zh-CN>普通对象或数组。</zh-CN><en>Plain object or array.</en></lang>
   * @returns {Array} <lang><zh-CN>排序后的属性对。</zh-CN><en>Ordered property pairs.</en></lang>
   */
  function entries(node) {
    if (!node.properties) boundary("non-data-container");
    /**
     * @lang zh-CN 判断合法数组索引键，排除2^32-1。
     * @lang en Recognizes array-index keys, excluding 2^32-1.
     * @param {string} key <lang><zh-CN>字符串键。</zh-CN><en>String key.</en></lang>
     * @returns {boolean} <lang><zh-CN>是否索引。</zh-CN><en>Whether it is an index.</en></lang>
     */
    function index(key) { return /^(?:0|[1-9][0-9]*)$/.test(key) && Number(key) < 4294967295; }
    return [...node.properties].sort(([a], [b]) => index(a) && index(b) ? Number(a) - Number(b) : index(a) ? -1 : index(b) ? 1 : 0);
  }

  /**
   * @lang zh-CN 拒绝重复顶层绑定，补足语法AST未提供的模块早期检查。
   * @lang en Rejects duplicate top-level bindings, supplying module early checks absent from syntax ASTs.
   * @param {object} context <lang><zh-CN>模块索引。</zh-CN><en>Module index.</en></lang>
   * @param {string} name <lang><zh-CN>绑定名。</zh-CN><en>Binding name.</en></lang>
   */
  function declareName(context, name) {
    if (context.names.has(name)) boundary("duplicate-binding");
    context.names.add(name);
  }

  /**
   * @lang zh-CN 只登记唯一运行导出，重复导出不能被Map静默覆盖。
   * @lang en Registers unique runtime exports, preventing silent Map replacement of duplicates.
   * @param {object} context <lang><zh-CN>模块索引。</zh-CN><en>Module index.</en></lang>
   * @param {string} name <lang><zh-CN>公开名。</zh-CN><en>Public name.</en></lang>
   * @param {object} entry <lang><zh-CN>静态绑定信息。</zh-CN><en>Static binding information.</en></lang>
   */
  function declareExport(context, name, entry) {
    if (context.exports.has(name)) boundary("duplicate-export");
    context.exports.set(name, entry);
  }

  /**
   * @lang zh-CN 检查单一物理源码并建立绑定索引，此步骤不核包装模块的执行。
   * @lang en Checks one physical source and indexes bindings without auditing wrapper execution at this step.
   * @param {string} relative <lang><zh-CN>根内路径。</zh-CN><en>Root-relative path.</en></lang>
   * @returns {object} <lang><zh-CN>缓存的源码上下文。</zh-CN><en>Cached source context.</en></lang>
   */
  function moduleAt(relative) {
    if (modules.has(relative)) return modules.get(relative);
    if (modules.size >= 128) boundary("source-file-budget");
    if (typeof relative !== "string" || !relative || /[\\:%?#\u0000-\u001f]/.test(relative) || relative.split("/").some(part => !part || part === "." || part === "..")) boundary("unsafe-source-path");
    const file = path.join(base, relative);
    const before = fs.lstatSync(file);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > 4 * 1024 * 1024 || fs.realpathSync(file) !== file) boundary("unsafe-source-file");
    const bytes = fs.readFileSync(file);
    const after = fs.lstatSync(file);
    if (before.ino !== after.ino || before.size !== bytes.length || after.size !== bytes.length || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) boundary("source-changed");
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    const context = { relative, file, sha256: createHash("sha256").update(bytes).digest("hex"), state: "new", values: new Map(), names: new Set(), exports: new Map(), stars: [] };
    modules.set(relative, context);
    if (relative.endsWith(".json")) return context;
    if (!/\.(?:mjs|js|mts|ts)$/.test(relative) || /\.d\.(?:mts|ts)$/.test(relative)) boundary("unsupported-source-module");
    // <lang><zh-CN>在创建AST前限制词法规模及嵌套，解析失败只给固定原因。</zh-CN><en>Bound lexical size and nesting before AST construction, reporting fixed parse failures.</en></lang>
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
    let tokens = 0;
    let depth = 0;
    for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
      if ([ts.SyntaxKind.OpenBraceToken, ts.SyntaxKind.OpenBracketToken, ts.SyntaxKind.OpenParenToken].includes(token)) depth++;
      if ([ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CloseParenToken].includes(token)) depth--;
      if (++tokens > 250000 || depth > 128) boundary("source-syntax-budget");
    }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /\.(?:mts|ts)$/.test(relative) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    if (source.parseDiagnostics.length) boundary("source-syntax");
    context.source = source;
    // <lang><zh-CN>预登记所有顶层名字以识别内建遮蔽，值仍按执行顺序建立。</zh-CN><en>Predeclare all top-level names to detect builtin shadowing, while creating values in execution order.</en></lang>
    for (const statement of source.statements) {
      if (statement.name && ts.isIdentifier(statement.name)) {
        declareName(context, statement.name.text);
        if (ts.isFunctionDeclaration(statement) && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
          const name = statement.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword) ? "default" : statement.name.text;
          declareExport(context, name, { local: statement.name.text });
        }
      }
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        declareName(context, declaration.name.text);
        if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) declareExport(context, declaration.name.text, { local: declaration.name.text });
      }
      if (ts.isImportDeclaration(statement) && statement.importClause && !statement.importClause.isTypeOnly) {
        const clause = statement.importClause;
        if (clause.name) declareName(context, clause.name.text);
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) declareName(context, clause.namedBindings.name.text);
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const element of clause.namedBindings.elements) if (!element.isTypeOnly) declareName(context, element.name.text);
      }
      if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const element of statement.exportClause.elements) {
          if (!element.isTypeOnly) declareExport(context, element.name.text, { local: element.propertyName?.text ?? element.name.text, specifier: statement.moduleSpecifier?.text, origin: origin(element) });
        }
        else if (!statement.exportClause && statement.moduleSpecifier) context.stars.push(statement.moduleSpecifier.text);
      }
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) declareExport(context, "default", { local: "#default" });
    }
    return context;
  }

  /**
   * @lang zh-CN 解析相对依赖并保持根和物理文件边界。
   * @lang en Resolves relative dependencies while preserving root and physical-file boundaries.
   * @param {object} context <lang><zh-CN>导入方。</zh-CN><en>Importer.</en></lang>
   * @param {string} specifier <lang><zh-CN>静态相对声明。</zh-CN><en>Static relative specifier.</en></lang>
   * @returns {object} <lang><zh-CN>依赖上下文。</zh-CN><en>Dependency context.</en></lang>
   */
  function dependency(context, specifier) {
    if(metadataPolicy&&typeof specifier==="string"&&!/^\.\.?\//.test(specifier)) return moduleAt(metadataPolicy.resolve(specifier,context.relative));
    if (typeof specifier !== "string" || !/^\.\.?\//.test(specifier) || /[\\:%?#\u0000-\u001f]/.test(specifier)) boundary("unsupported-dependency");
    const requested = path.relative(base, path.resolve(path.dirname(context.file), specifier));
    if (path.isAbsolute(requested) || requested === ".." || requested.startsWith(`..${path.sep}`)) boundary("unsafe-source-path");
    if(metadataPolicy&&specifier.endsWith(".mjs")) return moduleAt(requested.split(path.sep).join("/"));
    const resolved = ts.resolveModuleName(specifier, context.file, options, ts.sys).resolvedModule;
    if (!resolved) boundary("unresolved-runtime-import");
    return moduleAt(path.relative(base, resolved.resolvedFileName).split(path.sep).join("/"));
  }

  /**
   * @lang zh-CN 解析导出绑定。根包装模块只登记链接，定义模块稍后完整核验。
   * @lang en Resolves export bindings. Root wrappers record linkage only; definition modules are fully audited later.
   * @param {object} context <lang><zh-CN>当前模块。</zh-CN><en>Current module.</en></lang>
   * @param {string} name <lang><zh-CN>导出名。</zh-CN><en>Export name.</en></lang>
   * @param {boolean} record <lang><zh-CN>是否登记根链接。</zh-CN><en>Whether to record root linkage.</en></lang>
   * @returns {object} <lang><zh-CN>定义模块与局部名。</zh-CN><en>Definition module and local name.</en></lang>
   */
  function definition(context, name, record = false) {
    const key = `${context.relative}\0${name}`;
    if (resolving.has(key) || resolving.size >= 128) boundary("export-linkage-cycle");
    resolving.add(key);
    try {
      if (context.relative.endsWith(".json") && name === "default") return { context, local: "#default" };
      const entry = context.exports.get(name);
      if (entry && !entry.specifier) return { context, local: entry.local };
      if (entry?.specifier) {
        const target = dependency(context, entry.specifier);
        if (record) linkage.push({ module: context.relative, exportName: name, targetModule: target.relative, origin: entry.origin, runtimeStateVerified: false });
        return definition(target, entry.local, record);
      }
      if (context.stars.length === 1 && name !== "default") {
        const target = dependency(context, context.stars[0]);
        if (record) linkage.push({ module: context.relative, exportName: name, targetModule: target.relative, runtimeStateVerified: false });
        return definition(target, name, record);
      }
      boundary("unresolved-export");
    } finally { resolving.delete(key); }
  }

  /**
   * @lang zh-CN 读取已初始化的绑定，TDZ和函数值保持未核。
   * @lang en Reads initialized bindings, keeping TDZ and function values unverified.
   * @param {object} context <lang><zh-CN>定义上下文。</zh-CN><en>Definition context.</en></lang>
   * @param {string} name <lang><zh-CN>局部名。</zh-CN><en>Local name.</en></lang>
   * @returns {object} <lang><zh-CN>绑定节点。</zh-CN><en>Bound node.</en></lang>
   */
  function binding(context, name) {
    if (!context.values.has(name)) boundary("uninitialized-binding");
    return context.values.get(name);
  }

  /**
   * @lang zh-CN 克隆普通数据图，memo保留内部共享，所有新对象归当前模块。
   * @lang en Clones plain-data graphs, using a memo to preserve sharing and assigning new objects to the current module.
   * @param {object} node <lang><zh-CN>已验证节点。</zh-CN><en>Verified node.</en></lang>
   * @param {object} context <lang><zh-CN>克隆方。</zh-CN><en>Cloning module.</en></lang>
   * @param {Map} memo <lang><zh-CN>旧到新身份映射。</zh-CN><en>Old-to-new identity map.</en></lang>
   * @param {number} depth <lang><zh-CN>递归深度。</zh-CN><en>Recursion depth.</en></lang>
   * @returns {object} <lang><zh-CN>克隆节点或不可变标量。</zh-CN><en>Cloned node or immutable scalar.</en></lang>
   */
  function clone(node, context, memo = new Map(), depth = 0) {
    if (depth > 128) boundary("evaluation-depth-budget");
    if (!node.properties) return node;
    if (memo.has(node)) return memo.get(node);
    const copy = allocate(node.type, node.origin, context.relative);
    chargeProvenance(node.aliases.length);
    copy.aliases = [...node.aliases];
    memo.set(node, copy);
    for (const [key, slot] of entries(node)) setSlot(copy, key, { ...slot, node: clone(slot.node, context, memo, depth + 1) });
    return copy;
  }

  /**
   * @lang zh-CN 提取固定键，保守拒绝特殊原型键和动态表达式。
   * @lang en Extracts fixed keys, conservatively rejecting special prototype keys and dynamic expressions.
   * @param {object} name <lang><zh-CN>属性名节点。</zh-CN><en>Property-name node.</en></lang>
   * @returns {string} <lang><zh-CN>静态键。</zh-CN><en>Static key.</en></lang>
   */
  function propertyKey(name) {
    if (!ts.isIdentifier(name) && !ts.isStringLiteral(name) && !ts.isNumericLiteral(name)) boundary("dynamic-property-key");
    const key = ts.isNumericLiteral(name) ? String(Number(name.text)) : name.text;
    if (["__proto__", "prototype", "constructor"].includes(key)) boundary("unsafe-property-key");
    return key;
  }

  /**
   * @lang zh-CN 在不执行目标代码的前提下解释白名单表达式。
   * @lang en Interprets allowlisted expressions without executing target code.
   * @param {object} context <lang><zh-CN>当前模块。</zh-CN><en>Current module.</en></lang>
   * @param {object} node <lang><zh-CN>表达式AST。</zh-CN><en>Expression AST.</en></lang>
   * @param {number} depth <lang><zh-CN>求值深度。</zh-CN><en>Evaluation depth.</en></lang>
   * @returns {object} <lang><zh-CN>模型值。</zh-CN><en>Model value.</en></lang>
   */
  function expression(context, node, depth = 0) {
    if (++expressionCount > 250000) boundary("expression-budget");
    if (depth > 128) boundary("evaluation-depth-budget");
    if (!node) boundary("unsupported-expression");
    const source = origin(node);
    if (ts.isParenthesizedExpression(node)) return expression(context, node.expression, depth + 1);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return allocate("string", source, context.relative, node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return allocate("boolean", source, context.relative, node.kind === ts.SyntaxKind.TrueKeyword);
    if (node.kind === ts.SyntaxKind.NullKeyword) return allocate("null", source, context.relative, null);
    if (ts.isNumericLiteral(node) || ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(node.operator) && ts.isNumericLiteral(node.operand)) {
      const value = ts.isNumericLiteral(node) ? Number(node.text) : (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1) * Number(node.operand.text);
      if (!Number.isSafeInteger(value)) boundary("number-outside-exact-integer-scope");
      return allocate("number", source, context.relative, value);
    }
    if (ts.isIdentifier(node)) return binding(context, node.text);
    if (ts.isPropertyAccessExpression(node) && !node.questionDotToken) {
      const parent = expression(context, node.expression, depth + 1);
      const key = propertyKey(node.name);
      if (parent.type === "namespace") {
        const target = definition(parent.context, key);
        return binding(target.context, target.local);
      }
      if (parent.type === "array" && key === "length") return allocate("number", source, context.relative, parent.properties.size);
      if (!parent.properties?.has(key)) boundary("missing-static-property");
      return parent.properties.get(key).node;
    }
    if (ts.isArrayLiteralExpression(node)) {
      const array = allocate("array", source, context.relative);
      for (const element of node.elements) {
        if (ts.isSpreadElement(element)) {
          const spread = expression(context, element.expression, depth + 1);
          if (spread.type !== "array") boundary("non-array-spread");
          for (const [, slot] of entries(spread)) setSlot(array, String(array.properties.size), { ...slot });
          event("spread", origin(element), { sourceNodeId: spread.id, graphNodeId: array.id });
        } else {
          // <lang><zh-CN>数组槽在既有SDK事件中由创建数组范围声明；浅复制保留该槽的原创建范围，元素值来源继续独立保存。</zh-CN><en>Existing SDK events declare array slots at the creating array range; shallow copies retain that original slot range while value origins remain separate.</en></lang>
          setSlot(array, String(array.properties.size), { node: expression(context, element, depth + 1), declaration: origin(element), arraySlotSource:source, history: [], writes: [] });
        }
      }
      return array;
    }
    if (ts.isObjectLiteralExpression(node)) {
      const object = allocate("object", source, context.relative);
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property)) {
          const spread = expression(context, property.expression, depth + 1);
          if (spread.type !== "object") boundary("non-object-spread");
          for (const [key, slot] of entries(spread)) setSlot(object, key, { ...slot });
          event("spread", origin(property), { sourceNodeId: spread.id, graphNodeId: object.id });
        } else {
          if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property) || property.objectAssignmentInitializer) boundary("non-data-property");
          const key = propertyKey(property.name);
          const value = ts.isShorthandPropertyAssignment(property) ? binding(context, key) : expression(context, property.initializer, depth + 1);
          // <lang><zh-CN>字面量覆盖spread字段时保留旧声明来源，与新值和实际写入事件分开。</zh-CN><en>Preserve the old declaration when a literal overrides a spread field, separately from the new value and explicit write events.</en></lang>
          const previous = object.properties.get(key);
          chargeProvenance((previous?.history.length ?? 0) + (previous ? 1 : 0));
          setSlot(object, key, { node: value, declaration: origin(property), history: previous ? [...previous.history,previous.declaration] : [], writes: [] });
        }
      }
      return object;
    }
    if (ts.isCallExpression(node)) {
      if (node.questionDotToken || node.arguments.length !== 1 || ts.isSpreadElement(node.arguments[0])) boundary("unsupported-call");
      if (ts.isIdentifier(node.expression) && node.expression.text === "structuredClone") {
        if (context.names.has("structuredClone")) boundary("shadowed-builtin");
        const value = expression(context, node.arguments[0], depth + 1);
        if (value.type === "namespace") boundary("unsupported-clone-value");
        const copy = clone(value, context);
        event("clone", source, { sourceNodeId: value.id, graphNodeId: copy.id });
        return copy;
      }
      if (ts.isPropertyAccessExpression(node.expression) && !node.expression.questionDotToken && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Object") {
        if (context.names.has("Object")) boundary("shadowed-builtin");
        const operation = node.expression.name.text;
        if (!["freeze", "keys", "values"].includes(operation)) boundary("unsupported-call");
        const value = expression(context, node.arguments[0], depth + 1);
        if (!value.properties) boundary("non-data-container");
        if (operation === "freeze") {
          if (value.owner !== context.relative) boundary("foreign-object-write");
          value.frozen = true;
          event("freeze", source, { graphNodeId: value.id });
          return value;
        }
        const array = allocate("array", source, context.relative);
        for (const [key, slot] of entries(value)) setSlot(array, String(array.properties.size), { ...slot, node: operation === "values" ? slot.node : allocate("string", slot.declaration, context.relative, key) });
        return array;
      }
      boundary("unsupported-call");
    }
    boundary("unsupported-expression");
  }

  /**
   * @lang zh-CN 从已核严格JSON来源构建独立所有权图，保留原物理行坐标。
   * @lang en Builds an owned graph from audited strict JSON provenance, retaining physical line coordinates.
   * @param {object} context <lang><zh-CN>JSON上下文。</zh-CN><en>JSON context.</en></lang>
   */
  function initializeJson(context) {
    const result = readStaticJsonExport(base, context.relative, "default");
    if (result.status !== "available") boundary(result.reason);
    if (result.sources[0]?.sha256 !== context.sha256) boundary("source-changed");
    const nodes = new Map();
    for (const row of result.nodes) {
      const node = allocate(row.type, row.origin, context.relative, row.value);
      nodes.set(row.pointer, node);
      if (row.pointer) {
        const slash = row.pointer.lastIndexOf("/");
        const parent = nodes.get(row.pointer.slice(0, slash));
        const key = row.pointer.slice(slash + 1).replaceAll("~1", "/").replaceAll("~0", "~");
        if (["__proto__", "prototype", "constructor"].includes(key)) boundary("unsafe-property-key");
        setSlot(parent, key, { node, declaration: row.declaration ?? row.origin, history: [], writes: [] });
      }
    }
    context.values.set("#default", nodes.get(""));
  }

  /**
   * @lang zh-CN 完整初始化定义依赖，任何未引用未知语句也会拒绝。
   * @lang en Fully initializes definition dependencies, rejecting even unreferenced unknown statements.
   * @param {object} context <lang><zh-CN>待初始化模块。</zh-CN><en>Module to initialize.</en></lang>
   */
  function initialize(context) {
    if (context.state === "done") return;
    if (context.state === "active") boundary("initialization-cycle");
    context.state = "active";
    if (!context.source) {
      initializeJson(context);
      context.state = "done";
      return;
    }
    // <lang><zh-CN>ESM依赖先初始化，包括未使用的运行时导入及重导出。</zh-CN><en>Initialize ESM dependencies first, including unused runtime imports and reexports.</en></lang>
    for (const statement of context.source.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) || !statement.moduleSpecifier || statement.isTypeOnly || statement.importClause?.isTypeOnly) continue;
      const target = dependency(context, statement.moduleSpecifier.text);
      // <lang><zh-CN>未知导入属性可能改变加载语义，JSON运行导入只接受明确type声明。</zh-CN><en>Unknown import attributes may alter loading semantics; JSON runtime imports accept an explicit type declaration only.</en></lang>
      const attributes = statement.attributes;
      if (attributes && (attributes.token !== ts.SyntaxKind.WithKeyword || attributes.elements.length !== 1 || attributes.elements[0].name.text !== "type" || attributes.elements[0].value.text !== "json" || !target.relative.endsWith(".json"))) boundary("unsupported-import-attributes");
      if (target.relative.endsWith(".json") && !attributes) boundary("unsupported-import-attributes");
      initialize(target);
      const clause = statement.importClause;
      if (!clause) continue;
      if (clause.name) {
        const resolved = definition(target, "default");
        context.values.set(clause.name.text, binding(resolved.context, resolved.local));
      }
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) context.values.set(clause.namedBindings.name.text, { type: "namespace", context: target });
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const element of clause.namedBindings.elements) {
        if (element.isTypeOnly) continue;
        const resolved = definition(target, element.propertyName?.text ?? element.name.text);
        context.values.set(element.name.text, binding(resolved.context, resolved.local));
      }
    }
    // <lang><zh-CN>定义模块逐句核验，绑定指向活图而非变量值快照。</zh-CN><en>Audit every definition statement; bindings point to the live graph rather than variable snapshots.</en></lang>
    for (const statement of context.source.statements) {
      if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isFunctionDeclaration(statement) || ts.isEmptyStatement(statement)) continue;
      if (ts.isVariableStatement(statement)) {
        if (!(statement.declarationList.flags & ts.NodeFlags.Const)) boundary("mutable-binding");
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer) boundary("unsupported-binding");
          if (context.values.has(declaration.name.text)) boundary("duplicate-binding");
          const value = expression(context, declaration.initializer);
          const source = origin(declaration);
          if (value.type === "namespace") boundary("unsupported-binding");
          chargeProvenance(1);
          value.aliases.push(source);
          context.values.set(declaration.name.text, value);
          event("bind", source, { graphNodeId: value.id });
        }
        continue;
      }
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
        context.values.set("#default", expression(context, statement.expression));
        continue;
      }
      if (ts.isExpressionStatement(statement)) {
        const update = statement.expression;
        if (!ts.isBinaryExpression(update) || update.operatorToken.kind !== ts.SyntaxKind.EqualsToken) boundary("unsupported-top-level-statement");
        if (!ts.isPropertyAccessExpression(update.left) || update.left.questionDotToken) boundary("unsupported-write-target");
        // <lang><zh-CN>先建立左侧引用，再求右值；允许的右值不包含赋值或未知调用。</zh-CN><en>Establish the left reference before evaluating the right; allowed right values contain no assignments or unknown calls.</en></lang>
        const target = expression(context, update.left.expression);
        const key = propertyKey(update.left.name);
        const value = expression(context, update.right);
        if (target.type !== "object") boundary("unsupported-write-target");
        if (target.owner !== context.relative) boundary("foreign-object-write");
        if (target.frozen) boundary("frozen-property-write");
        const source = origin(update);
        const previous = target.properties.get(key);
        chargeProvenance((previous?.history.length ?? 0) + (previous?.writes.length ?? 0) + 2);
        setSlot(target, key, {
          node: value, declaration: source,
          history: previous ? [...previous.history, previous.declaration] : [],
          writes: [...(previous?.writes ?? []), source]
        });
        event("write", source, { graphNodeId: target.id, key, valueNodeId: value.id });
        continue;
      }
      boundary("unsupported-top-level-statement");
    }
    // <lang><zh-CN>完整定义模块还须检查未请求的命名导出，避免漏掉缺失局部或转导出。</zh-CN><en>The complete definition module also checks unrequested named exports, catching missing locals and reexports.</en></lang>
    for (const name of context.exports.keys()) {
      const target = definition(context, name);
      if (!target.context.names.has(target.local) && !target.context.values.has(target.local)) boundary("unresolved-export");
    }
    context.state = "done";
  }

  try {
    if (typeof root !== "string" || typeof modulePath !== "string" || typeof exportName !== "string" || !exportName) boundary("invalid-request");
    base = fs.realpathSync(root);
    metadataPolicy=createMetadataDependencyPolicy(base,dependencyOptions);
    const target = definition(moduleAt(modulePath), exportName, true);
    initialize(target.context);
    const tree = binding(target.context, target.local);
    const nodes = [];
    const active = new Set();
    let pointerUnits = 0;
    /**
     * @lang zh-CN 最后展开活图，单独约束循环、共享展开规模及Pointer预算。
     * @lang en Materializes the final live graph, separately bounding cycles, shared expansion and pointer size.
     * @param {object} node <lang><zh-CN>最终节点。</zh-CN><en>Final node.</en></lang>
     * @param {string} pointer <lang><zh-CN>JSON Pointer。</zh-CN><en>JSON pointer.</en></lang>
     * @param {object} slot <lang><zh-CN>属性来源。</zh-CN><en>Property provenance.</en></lang>
     * @param {number} depth <lang><zh-CN>展开深度。</zh-CN><en>Expansion depth.</en></lang>
     * @returns {unknown} <lang><zh-CN>普通JSON数据。</zh-CN><en>Plain JSON data.</en></lang>
     */
    function materialize(node, pointer, slot = {}, depth = 0) {
      if (node.type === "namespace") boundary("non-json-value");
      if (active.has(node)) boundary("cyclic-json-value");
      if (depth > 128) boundary("evaluation-depth-budget");
      pointerUnits += pointer.length;
      if (nodes.length >= 100000 || pointerUnits > 2000000) boundary("value-budget");
      chargeProvenance((slot.history?.length ?? 0) + node.aliases.length);
      nodes.push({
        pointer, type: node.type, origin: node.origin, declaration: slot.declaration ?? node.origin,
        valueDeclarationSources: [...(slot.history ?? []), ...node.aliases], writeSources: slot.writes ?? [],
        ...(slot.arraySlotSource ? {arraySlotSource:slot.arraySlotSource} : {}),
        ...(node.properties ? { graphNodeId: node.id } : { value: node.value })
      });
      if (!node.properties) return node.value;
      active.add(node);
      const value = node.type === "array" ? [] : Object.create(null);
      for (const [key, child] of entries(node)) value[key] = materialize(child.node, `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`, child, depth + 1);
      active.delete(node);
      return value;
    }
    const value = materialize(tree, "");
    return {
      status: "available", evidenceKind: "static-definition-initialization", runtimeStateVerified: false,
      module: modulePath, exportName, definitionModule: target.context.relative,
      assumptions: ["standard-unmodified-builtins"], value, nodes, events, linkage,
      sources: [...modules.values()].map(context => ({ path: context.relative, sha256: context.sha256, role: context.state === "done" ? "definition-initialization" : "export-linkage" })).concat((metadataPolicy?.manifests??[]).map(manifest=>({path:manifest.path,sha256:manifest.sha256,role:"metadata-manifest"}))),
      ...(metadataPolicy?{dependencyResolutions:metadataPolicy.resolutions}:{})
    };
  } catch (error) {
    return { status: "unverified", reason: error.initializationBoundary ?? "source-read-failed", module: modulePath, exportName, runtimeStateVerified: false };
  }
}
