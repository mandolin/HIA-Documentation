/**
 * @file
 * @lang zh-CN 由显式纯数据定义实际生产JSON与事件侧车，使用原生容器/克隆而不调用独立A分析器。
 * @lang en Actually produces JSON and event sidecars from explicit plain-data definitions, using native containers/cloning without calling the independent A analyzer.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import { readJsonResourceBytes } from "./json-resource-audit.mjs";
import { readPlainDataInitialization } from "../../packages/plugin-sdk/dist/plain-data-initialization.js";
import {createMetadataDependencyPolicy} from "./metadata-dependencies.mjs";

/**
 * @lang zh-CN 对已授权定义执行有限原生数据操作并记录实际产出；不执行任意ESM或函数体，不写文件。
 * @lang en Executes finite native data operations on authorized definitions and records actual output, without executing arbitrary ESM/function bodies or writing files.
 * @param {string} root <lang><zh-CN>显式授权的定义源码根。</zh-CN><en>Explicitly authorized definition-source root.</en></lang>
 * @param {string} modulePath <lang><zh-CN>根内.mjs定义模块相对路径。</zh-CN><en>Relative .mjs definition-module path beneath the root.</en></lang>
 * @param {string} exportName <lang><zh-CN>确切const导出名。</zh-CN><en>Exact const export name.</en></lang>
 * @param {string} artifactPath <lang><zh-CN>输出根内的逻辑JSON路径，调用方显式绑定输入/输出根。</zh-CN><en>Logical JSON path under an output root, with input/output roots explicitly bound by the caller.</en></lang>
 * @param {object} [options] <lang><zh-CN>显式authorizedPackages模式按包名/版本/根授权metadata依赖，缺省拒绝裸包。</zh-CN><en>Explicit authorizedPackages mode authorizes metadata dependencies by package/version/root; defaults reject bare packages.</en></lang>
 * @returns {object} <lang><zh-CN>实际JSON字节、原生值与producer-recorded侧车；显式模式另记解析证明。内部重放已核，源码和主体信任仍分别待核。</zh-CN><en>Actual JSON bytes, native value and producer-recorded sidecar, with separate resolution records in explicit mode. Internal replay is checked; source and producer trust remain separately unverified.</en></lang>
 * @throws {Error} <lang><zh-CN>越界定义或预算拒绝，固定错误不回显私有输入。</zh-CN><en>Out-of-scope definitions or budgets are rejected with fixed errors that omit private input.</en></lang>
 */
export function producePlainDataModule(root, modulePath, exportName, artifactPath,options={}) {
  // <lang><zh-CN>对象身份及依赖状态均按本次生产持有，避免跨构建缓存和原生引用泄漏。</zh-CN><en>Object identities and dependency state belong to this production, avoiding cross-build caches and native-reference leakage.</en></lang>
  const modules = new Map();
  const identities = new WeakMap();
  const steps = [];
  let nodes = 0;
  let expressions = 0;
  let edges = 0;
  let sourceBytes = 0;
  let base;
  let metadataPolicy;
  /** @lang zh-CN 固定失败不会带出源码、路径或系统异常。 @lang en Fixed failures omit source, paths and system errors. */
  function reject() { throw new Error("Plain data production rejected."); }
  /** @lang zh-CN 固定路径是逻辑根内文件，禁止重定向和歧义写法。 @lang en Fixed paths denote files beneath logical roots, excluding redirects and ambiguous forms. */
  function relative(value) {
    if (typeof value !== "string" || !value || /[\\:%?#\u0000-\u001f\u007f]/.test(value) || path.posix.normalize(value) !== value || value.split("/").some(part => !part || part === "." || part === "..") || path.isAbsolute(value)) reject();
    return value;
  }
  /** @lang zh-CN 记录本次真正执行的操作，序号连续。 @lang en Records operations actually executed in this production with contiguous sequences. */
  function record(source, kind, detail) {
    if (steps.length >= 10000) reject();
    steps.push({sequence: steps.length, source, kind, ...detail});
  }
  /** @lang zh-CN 原节点范围使用一基UTF16排除终点，不读取重写文本的位置。 @lang en Original-node ranges use one-based UTF16 exclusive ends, never positions from rewritten text. */
  function origin(context, node) {
    const start = context.ast.getLineAndCharacterOfPosition(node.getStart(context.ast));
    const end = context.ast.getLineAndCharacterOfPosition(node.end);
    return { resourceId: context.id, range: {start:{line:start.line+1,column:start.character+1},end:{line:end.line+1,column:end.character+1}}, rangeConvention:{endBoundary:"exclusive",columnUnit:"utf16-code-unit"} };
  }
  /** @lang zh-CN 唯一元数据身份对应真实容器；标量按产生事件区分来源。 @lang en Unique metadata identities correspond to actual containers; scalars retain producing-event provenance. */
  function identity(value, source) {
    if (++nodes > 10000) reject();
    const ref = {id:"node-"+nodes,value,owner:source.resourceId,source,properties:new Map()};
    if (value !== null && typeof value === "object") {
      if (identities.has(value)) reject();
      identities.set(value,ref);
    }
    return ref;
  }
  /** @lang zh-CN 数据键保持静态并避开首版禁止的原型键。 @lang en Data keys remain static and exclude prototype keys forbidden by the initial rule. */
  function key(node) {
    if (!ts.isIdentifier(node) && !ts.isStringLiteral(node) && !ts.isNumericLiteral(node)) reject();
    const value = ts.isNumericLiteral(node) ? String(Number(node.text)) : node.text;
    if (["__proto__","prototype","constructor"].includes(value)) reject();
    return value;
  }
  /** @lang zh-CN 自有数据读取返回实际槽身份，不运行访问器。 @lang en Own-data reads return actual slot identities without invoking accessors. */
  function property(ref, name) {
    if (!ref || ref.value === null || typeof ref.value !== "object" || !ref.properties.has(name)) reject();
    return ref.properties.get(name).ref;
  }
  /** @lang zh-CN 写入真实对象后才记录成功事件；所有权与冻结边界先行约束。 @lang en Records successful events only after native writes, with ownership and freezing constrained first. */
  function write(target, name, ref, source) {
    if (target.value === null || typeof target.value !== "object" || Array.isArray(target.value) || target.owner !== source.resourceId || Object.isFrozen(target.value) || ++edges > 20000) reject();
    if (!Reflect.set(target.value,name,ref.value)) reject();
    target.properties.set(name,{ref,source});
    record(source,"write",{targetNodeId:target.id,key:name,valueNodeId:ref.id});
  }
  /** @lang zh-CN 原生克隆决定对象身份和共享，记录器只观察前后对应关系。 @lang en Native cloning determines identity and sharing; the recorder observes before/after correspondence only. */
  function clone(original, source) {
    const copied = structuredClone(original.value);
    const memo = new Map();
    const copies = [];
    /** @lang zh-CN 同一原对象只登记一次，循环和共享由原生克隆结果验证。 @lang en Registers each original once, checking cycles and sharing against native clone results. */
    function observe(old, value, depth = 0) {
      if (depth > 128) reject();
      if (memo.has(old.id)) {
        if (memo.get(old.id).value !== value) reject();
        return memo.get(old.id);
      }
      if (old.value === null || typeof old.value !== "object") return old;
      const ref = identity(value,source);
      ref.source = old.source;
      memo.set(old.id,ref);
      copies.push({fromNodeId:old.id,toNodeId:ref.id});
      for (const [name,slot] of old.properties) {
        if (++edges > 20000) reject();
        ref.properties.set(name,{...slot,ref:observe(slot.ref,value[name],depth+1)});
      }
      return ref;
    }
    const ref = original.value !== null && typeof original.value === "object" ? observe(original,copied) : identity(copied,source);
    record(source,"clone",{nodeId:ref.id,sourceNodeId:original.id,copies});
    return ref;
  }
  /** @lang zh-CN 有限表达式以真实原生值执行，引用元数据只记录身份和来源。 @lang en Finite expressions execute with actual native values; reference metadata records identity and provenance only. */
  function expression(context, node, depth = 0) {
    if (!node || ++expressions > 50000 || depth > 128) reject();
    const source = origin(context,node);
    if (ts.isParenthesizedExpression(node)) return expression(context,node.expression,depth+1);
    if (ts.isIdentifier(node)) {
      if (!context.bindings.has(node.text)) reject();
      return context.bindings.get(node.text);
    }
    if (ts.isPropertyAccessExpression(node) && !node.questionDotToken) return property(expression(context,node.expression,depth+1),key(node.name));
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind) || ts.isPrefixUnaryExpression(node)) {
      let value;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
      else if (ts.isNumericLiteral(node)) value = Number(node.text);
      else if (ts.isPrefixUnaryExpression(node)) {
        if (![ts.SyntaxKind.MinusToken,ts.SyntaxKind.PlusToken].includes(node.operator) || !ts.isNumericLiteral(node.operand)) reject();
        value = (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1)*Number(node.operand.text);
      } else value = node.kind === ts.SyntaxKind.NullKeyword ? null : node.kind === ts.SyntaxKind.TrueKeyword;
      if (typeof value === "number" && !Number.isSafeInteger(value)) reject();
      const ref = identity(value,source);
      record(source,"literal",{nodeId:ref.id,value});
      return ref;
    }
    if (ts.isArrayLiteralExpression(node)) {
      // <lang><zh-CN>既有spread事件支持同类型浅复制；首版生产仅接受唯一数组展开，原槽来源及子对象身份随边保留。</zh-CN><en>The existing spread event supports same-type shallow copies; production accepts one sole array spread, retaining original slot provenance and child identities on copied edges.</en></lang>
      if(node.elements.length===1 && ts.isSpreadElement(node.elements[0])) {
        const original=expression(context,node.elements[0].expression,depth+1);
        if(!Array.isArray(original.value)) reject();
        edges+=original.properties.size;
        if(edges>20000) reject();
        const ref=identity([...original.value],source);
        ref.properties=new Map(original.properties);
        record(source,"spread",{nodeId:ref.id,sourceNodeId:original.id});
        return ref;
      }
      const children = node.elements.map(element=>expression(context,element,depth+1));
      const ref = identity(children.map(child=>child.value),source);
      for (const [index,child] of children.entries()) ref.properties.set(String(index),{ref:child,source});
      edges += children.length;
      if (edges > 20000) reject();
      record(source,"array",{nodeId:ref.id,items:children.map(child=>child.id)});
      return ref;
    }
    if (ts.isObjectLiteralExpression(node)) {
      // <lang><zh-CN>首版只接一个首位对象spread，后续静态字段以真实write覆盖。</zh-CN><en>The initial producer accepts one leading object spread; later static fields use native writes.</en></lang>
      const properties = [...node.properties];
      let ref;
      if (properties[0] && ts.isSpreadAssignment(properties[0])) {
        const original = expression(context,properties.shift().expression,depth+1);
        if (original.value === null || typeof original.value !== "object" || Array.isArray(original.value)) reject();
        ref = identity({...original.value},source);
        ref.properties = new Map(original.properties);
        edges += ref.properties.size;
        record(source,"spread",{nodeId:ref.id,sourceNodeId:original.id});
      }
      const entries = [];
      const names = new Set();
      for (const item of properties) {
        if (!ts.isPropertyAssignment(item) && !ts.isShorthandPropertyAssignment(item) || item.objectAssignmentInitializer) reject();
        const name = key(item.name);
        if (names.has(name)) reject();
        names.add(name);
        const child = expression(context,ts.isShorthandPropertyAssignment(item)?item.name:item.initializer,depth+1);
        const provenance = origin(context,item);
        if (ref) write(ref,name,child,provenance);
        else entries.push([name,{ref:child,source:provenance}]);
      }
      if (!ref) {
        ref = identity(Object.fromEntries(entries.map(([name,slot])=>[name,slot.ref.value])),source);
        ref.properties = new Map(entries);
        edges += entries.length;
        record(source,"object",{nodeId:ref.id,properties:entries.map(([name,slot])=>({key:name,nodeId:slot.ref.id,source:slot.source}))});
      }
      if (edges > 20000) reject();
      return ref;
    }
    if (ts.isCallExpression(node) && !node.questionDotToken && node.arguments.length === 1) {
      const callee = node.expression;
      const cloning = ts.isIdentifier(callee) && callee.text === "structuredClone";
      const freezing = ts.isPropertyAccessExpression(callee) && !callee.questionDotToken && ts.isIdentifier(callee.expression) && callee.expression.text === "Object" && callee.name.text === "freeze";
      if (!cloning && !freezing) reject();
      const ref = expression(context,node.arguments[0],depth+1);
      if (cloning) return clone(ref,source);
      if (ref.value === null || typeof ref.value !== "object" || ref.owner !== context.id) reject();
      Object.freeze(ref.value);
      record(source,"freeze",{nodeId:ref.id});
      return ref;
    }
    reject();
  }
  /** @lang zh-CN 模块按依赖顺序生产，所有外部模块和循环均拒绝。 @lang en Produces modules in dependency order, rejecting external modules and cycles. */
  function load(modulePath, depth = 0) {
    relative(modulePath);
    if (!modulePath.endsWith(".mjs") || depth > 32) reject();
    if (modules.has(modulePath)) {
      if (!modules.get(modulePath).done) reject();
      return modules.get(modulePath);
    }
    if (modules.size >= 32) reject();
    const bytes = readJsonResourceBytes(base,modulePath);
    sourceBytes += bytes.length;
    if (sourceBytes > 2000000) reject();
    // <lang><zh-CN>BOM保留为原始UTF16单元，和源码分析坐标一致。</zh-CN><en>Retain the BOM as an original UTF16 unit, matching source-analysis coordinates.</en></lang>
    const text = new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);
    // <lang><zh-CN>解析前限制嵌套深度和token，避免异常输入耗尽解析器栈。</zh-CN><en>Bound nesting and tokens before parsing to protect parser stack resources.</en></lang>
    const scanner = ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,text);
    let nesting = 0;
    let tokens = 0;
    for (let token=scanner.scan();token!==ts.SyntaxKind.EndOfFileToken;token=scanner.scan()) {
      if (++tokens > 100000) reject();
      if ([ts.SyntaxKind.OpenBraceToken,ts.SyntaxKind.OpenBracketToken,ts.SyntaxKind.OpenParenToken].includes(token) && ++nesting > 128) reject();
      if ([ts.SyntaxKind.CloseBraceToken,ts.SyntaxKind.CloseBracketToken,ts.SyntaxKind.CloseParenToken].includes(token)) nesting--;
    }
    const ast = ts.createSourceFile(modulePath,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    if (ast.parseDiagnostics.length) reject();
    const context = {id:"source-"+modules.size,path:modulePath,bytes,ast,bindings:new Map(),exports:new Map(),done:false};
    modules.set(modulePath,context);
    const names = new Set();
    /** @lang zh-CN 局部名称唯一，不能遮蔽原生操作身份。 @lang en Local names are unique and cannot shadow native operation identities. */
    function declare(name) {
      if (!name || names.has(name) || ["Object","structuredClone"].includes(name)) reject();
      names.add(name);
    }
    for (const statement of ast.statements) {
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) reject();
        declare(declaration.name.text);
      }
      else if (ts.isFunctionDeclaration(statement)) declare(statement.name?.text);
      else if (ts.isImportDeclaration(statement)) {
        const binding = statement.importClause;
        if (!binding || binding.name || !binding.namedBindings || !ts.isNamedImports(binding.namedBindings) || statement.attributes) reject();
        for (const item of binding.namedBindings.elements) declare(item.name.text);
      }
    }
    for (const statement of ast.statements) if (ts.isImportDeclaration(statement)) {
      const specifier = statement.moduleSpecifier.text;
      if(typeof specifier!=="string"||/[\\:%?#\u0000-\u001f]/.test(specifier)) reject();
      // <lang><zh-CN>裸包仅经本次显式授权策略定位；相对依赖继续原模块/物理边界。</zh-CN><en>Bare packages resolve only through this invocation's explicit grants; relative dependencies retain existing module and physical boundaries.</en></lang>
      const target=/^\.\.?\//.test(specifier)?path.posix.normalize(path.posix.join(path.posix.dirname(modulePath),specifier)):metadataPolicy?.resolve(specifier,modulePath);
      if(!target) reject();
      const dependency = load(target,depth+1);
      for (const item of statement.importClause.namedBindings.elements) {
        const ref = dependency.exports.get(item.propertyName?.text ?? item.name.text);
        if (!ref) reject();
        context.bindings.set(item.name.text,ref);
      }
    }
    for (const statement of ast.statements) {
      if (ts.isImportDeclaration(statement) || ts.isFunctionDeclaration(statement) || ts.isEmptyStatement(statement)) continue;
      if (ts.isVariableStatement(statement)) {
        if (!(statement.declarationList.flags & ts.NodeFlags.Const) || statement.modifiers?.some(modifier=>![ts.SyntaxKind.ExportKeyword].includes(modifier.kind))) reject();
        for (const declaration of statement.declarationList.declarations) {
          const ref = expression(context,declaration.initializer);
          context.bindings.set(declaration.name.text,ref);
          record(origin(context,declaration),"bind",{nodeId:ref.id,name:declaration.name.text});
          if (statement.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)) context.exports.set(declaration.name.text,ref);
        }
      } else if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression) && statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const assignment = statement.expression;
        if (!ts.isPropertyAccessExpression(assignment.left) || assignment.left.questionDotToken) reject();
        // <lang><zh-CN>左目标先求值，右值随后求值；成功原生写入后才发布事件。</zh-CN><en>Evaluate the left target first, then the right value; publish the event after a successful native write.</en></lang>
        const target = expression(context,assignment.left.expression);
        const name = key(assignment.left.name);
        const ref = expression(context,assignment.right);
        write(target,name,ref,origin(context,assignment));
      } else reject();
    }
    context.done = true;
    return context;
  }
  try {
    if (typeof root !== "string" || typeof exportName !== "string" || !exportName.trim()) reject();
    base = fs.realpathSync(root);
    metadataPolicy=createMetadataDependencyPolicy(base,options);
    relative(artifactPath);
    const entry = load(modulePath);
    const result = entry.exports.get(exportName);
    if (!result) reject();
    // <lang><zh-CN>序列化前独立约束实际活图，限制循环、共享展开、深度和文本总量。</zh-CN><en>Bound the actual live graph before serialization, limiting cycles, shared expansion, depth and total text.</en></lang>
    const active = new Set();
    let values = 0;
    let units = 0;
    /** @lang zh-CN 有界检查真实值，不建立静态图或调用源码。 @lang en Bounds actual values without constructing a static graph or calling source. */
    function bound(value, depth = 0) {
      if (++values > 100000 || depth > 128) reject();
      if (typeof value === "string") units += value.length;
      if (value !== null && typeof value === "object") {
        if (active.has(value)) reject();
        active.add(value);
        for (const [name,child] of Object.entries(value)) { units += name.length; bound(child,depth+1); }
        active.delete(value);
      }
      if (units > 2000000) reject();
    }
    bound(result.value);
    const artifact = Buffer.from(JSON.stringify(result.value,null,2)+"\n");
    const sha = bytes=>createHash("sha256").update(bytes).digest("hex");
    const sources = [...modules.values()].map(context=>({id:context.id,kind:"source",path:context.path,sha256:sha(context.bytes)}));
    // <lang><zh-CN>实际使用的manifest字节纳入活动输入，与代码源分别绑定摘要。</zh-CN><en>Actually used manifest bytes join activity inputs with digests distinct from code sources.</en></lang>
    for(const [index,manifest]of (metadataPolicy?.manifests??[]).entries()) sources.push({id:"metadata-manifest-"+index,kind:"source",path:manifest.path,sha256:manifest.sha256});
    const inputs = sources.map(resource=>resource.id);
    const evidence = {contract:"artifact-derivation-evidence",contractVersion:"0.1.0-draft",id:"plain-data-production",producer:{id:"plain-data-native-producer",version:"0.1.0-draft"},evidenceOrigin:"producer-recorded",coverage:"resource",
      resources:[...sources,{id:"output",kind:"artifact",path:artifactPath,sha256:sha(artifact)}],
      activities:[{id:"produce",type:"finite-data-production",profile:{contract:"plain-data-initialization",contractVersion:"0.1.0-draft"},inputs,outputs:["output"]}],
      derivations:[{id:"production",activityId:"produce",inputs,outputs:["output"],mapRefIds:[]}],mapRefs:[],
      details:{produce:{contract:"plain-data-initialization",contractVersion:"0.1.0-draft",entryResourceId:entry.id,steps,result:{resourceId:"output",bindingName:exportName}}}};
    const replay = readPlainDataInitialization(evidence,"produce");
    if (replay.status !== "replayed" || !Buffer.from(JSON.stringify(replay.value,null,2)+"\n").equals(artifact)) reject();
    return {status:"produced",artifact,evidence,nativeValue:result.value,...(metadataPolicy?{dependencyResolutions:metadataPolicy.resolutions}:{})};
  } catch { reject(); }
}
