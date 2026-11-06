/** @lang zh-CN 只读编译器成员清单：访问路径与原声明分开保留，不生成文档或执行目标。 @lang en Read-only compiler member inventory: retains access paths separately from original declarations, without generating documentation or executing targets. */
import path from "node:path";
import ts from "typescript";

/**
 * @lang zh-CN 独立展开已解析导出值的静态对象成员；数组、动态类型、外部来源、构造实例和循环显式登记。
 * @lang en Independently enumerate static object members of a resolved export; arrays, dynamic types, foreign sources, constructed instances and cycles remain explicit boundaries.
 * @param {object} input - 已有编译器、导出symbol和授权根。 Existing checker, exported symbol and authorized root.
 * @returns {object} members与memberBoundaries；不是完整API或文档通过证明。 Members and boundaries, not full API or documentation acceptance.
 * @throws {Error} 展开超过固定资源上限；不返回静默截断清单。 Fixed resource limits exceeded; never returns a silently truncated inventory.
 */
export function collectStaticMemberDeclarations({checker,symbol,source,root}) {
  // <lang><zh-CN>结果只存安全相对来源，访问路径以数组保存，避免点号属性名与层级混淆。</zh-CN><en>Results retain safe relative sources only; array access paths distinguish dotted property names from hierarchy.</en></lang>
  const members=[];
  const memberBoundaries=[];
  /**
   * @lang zh-CN 解析直接引用与简写值的别名；不执行调用或求值表达式。
   * @lang en Resolves aliases of direct references and shorthand values without executing calls or evaluating expressions.
   * @param {object} value - 本次编译器symbol。 Current compiler symbol.
   * @returns {object} 原实现symbol或命名空间容器本身。 Original implementation symbol or namespace container itself.
   */
  function resolveValue(value) {
    // <lang><zh-CN>跟踪本条引用链的symbol身份，循环引用在本地终止。</zh-CN><en>Track symbol identities on this reference chain and terminate cycles locally.</en></lang>
    const seen = new Set();
    while (value && !seen.has(value)) {
      seen.add(value);
      // <lang><zh-CN>从当前声明中识别直接引用，目标仅用于静态来源核对。</zh-CN><en>Identify a direct reference in the current declaration for static provenance checks.</en></lang>
      const declaration = value.valueDeclaration ?? value.declarations?.[0];
      let target;
      if (value.flags & ts.SymbolFlags.Alias) {
        target = checker.getAliasedSymbol(value);
      } else if (declaration && ts.isShorthandPropertyAssignment(declaration)) {
        target = checker.getShorthandAssignmentValueSymbol(declaration);
      } else if (declaration && ts.isPropertyAssignment(declaration)
        && (ts.isIdentifier(declaration.initializer) || ts.isPropertyAccessExpression(declaration.initializer))) {
        target = checker.getSymbolAtLocation(declaration.initializer);
      }
      if (!target || target === value) break;

      // <lang><zh-CN>先解析导入别名，才能检查真实目标属于运行源码还是声明文件。</zh-CN><en>Resolve import aliases before checking whether their actual targets belong to runtime source or declaration files.</en></lang>
      if (target.flags & ts.SymbolFlags.Alias) target = checker.getAliasedSymbol(target);
      const targetDeclarations = target.declarations ?? [];
      const namespaceTarget = targetDeclarations.some(ts.isSourceFile);
      const declarationOnlyTarget = targetDeclarations.length > 0
        && targetDeclarations.every(item => item.getSourceFile().isDeclarationFile);
      // <lang><zh-CN>命名空间和纯类型目标保留当前赋值来源，供真实JSDoc内容及源码核对使用。</zh-CN><en>Namespace and declaration-only targets retain the current assignment source for actual JSDoc content and source verification.</en></lang>
      if (namespaceTarget || declarationOnlyTarget) return value;
      value = target;
    }
    return value;
  }
  /**
   * @lang zh-CN 序列化原声明，不允许仓外或依赖目录成为首方覆盖证据。
   * @lang en Serializes original declarations, rejecting external and dependency locations as first-party coverage evidence.
   * @param {object} value - 已解析的symbol。 Resolved symbol.
   * @returns {object[]} 位置或明确的越界标记。 Locations or explicit ownership-boundary markers.
   */
  function declarationsOf(value) {
    return (value.declarations??[]).map(declaration=>{
      const file=declaration.getSourceFile();
      const relative=path.relative(root,file.fileName).split(path.sep).join("/");
      if(relative.startsWith("../")||path.isAbsolute(relative)||relative.split("/").includes("node_modules")) return {status:"outside-source-root"};
      const position=file.getLineAndCharacterOfPosition(declaration.getStart(file));
      return {path:relative,line:position.line+1,column:position.character+1,kind:ts.SyntaxKind[declaration.kind]};
    });
  }
  /**
   * @lang zh-CN 以当前访问链检测递归，兄弟别名分别保留；不遍历函数返回值或运行getter。
   * @lang en Detects recursion per access chain while retaining sibling aliases; never traverses function returns or runs getters.
   * @param {object} type - 当前值的静态类型。 Current value's static type.
   * @param {string[]} memberPath - 相对于公开绑定的访问路径。 Access path relative to the public binding.
   * @param {Set} ancestors - 仅当前分支的类型身份集合。 Type identities on this branch only.
   * @returns {void} 追加本轮清单和未核边界。 Appends inventory and unverified boundaries for this run.
   * @throws {Error} 固定资源上限耗尽。 Fixed resource budget exhausted.
   */
  function visit(type,memberPath,ancestors) {
    if(members.length>10000||memberPath.length>32) throw new Error("Static member inventory resource limit exceeded.");
    if(type.flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown|ts.TypeFlags.TypeParameter)) {memberBoundaries.push({memberPath,reason:"dynamic-type"});return;}
    if(type.flags&ts.TypeFlags.NonPrimitive) {memberBoundaries.push({memberPath,reason:"opaque-object-type"});return;}
    // <lang><zh-CN>boolean原语在编译器中是true/false联合，但没有待展开的对象成员；混合联合与交叉类型继续保留边界。</zh-CN><en>The compiler represents primitive boolean as a true/false union with no object members to expand; mixed unions and intersections remain explicit boundaries.</en></lang>
    if(type.flags&ts.TypeFlags.Boolean) return;
    if(type.isUnionOrIntersection()) {memberBoundaries.push({memberPath,reason:"composite-type"});return;}
    if(!(type.flags&ts.TypeFlags.Object)) return;
    if(ancestors.has(type)) {memberBoundaries.push({memberPath,reason:"recursive-type"});return;}
    if(checker.isArrayType(type)||checker.isTupleType(type)) {memberBoundaries.push({memberPath,reason:"array-elements"});return;}
    if(type.getConstructSignatures().length) memberBoundaries.push({memberPath,reason:"constructed-instance"});
    if(checker.getIndexInfosOfType(type).length) memberBoundaries.push({memberPath,reason:"index-signature"});
    // <lang><zh-CN>分支局部的类型集合防止跨别名去重吞掉公开访问路径。</zh-CN><en>A branch-local type set prevents cross-alias deduplication from swallowing public access paths.</en></lang>
    const next=new Set(ancestors);next.add(type);
    for(const property of checker.getPropertiesOfType(type).sort((a,b)=>a.name.localeCompare(b.name,"en"))) {
      if(members.length>=10000) throw new Error("Static member inventory resource limit exceeded.");
      const value=resolveValue(property);
      const declarations=declarationsOf(value);
      const access=[...memberPath,property.name];
      const declared=declarations.length>0&&declarations.every(item=>item.path);
      const propertyType=checker.getTypeOfSymbolAtLocation(property,property.valueDeclaration??source);
      // <lang><zh-CN>外部/无声明成员保留缺口，不把内置或动态属性伪装为首方文档。</zh-CN><en>Foreign or declaration-free members remain gaps, never fabricated first-party documentation.</en></lang>
      members.push({memberPath:access,declarationName:value.name,status:declared?"resolved":"unresolved",declarations,isCallable:propertyType.getCallSignatures().length>0||propertyType.getConstructSignatures().length>0});
      if(declared) visit(propertyType,access,next);
      else memberBoundaries.push({memberPath:access,reason:"unresolved-member-source"});
    }
  }
  const value=resolveValue(symbol);
  visit(checker.getTypeOfSymbolAtLocation(value,value.valueDeclaration??source),[],new Set());
  return {members,memberBoundaries};
}
