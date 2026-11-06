/**
 * @file
 * @lang zh-CN 只读编译器成员清单，分别保留对象访问路径、显式数组声明槽位和原声明，不执行目标。
 * @lang en Read-only compiler member inventory retaining object access paths, explicit array declaration slots and original declarations without executing targets.
 */
import path from "node:path";
import fs from "node:fs";
import ts from "typescript";

/**
 * @lang zh-CN 独立展开已解析导出值的静态对象成员；数组、动态类型、外部来源、构造实例和循环显式登记。
 * @lang en Independently enumerate static object members of a resolved export; arrays, dynamic types, foreign sources, constructed instances and cycles remain explicit boundaries.
 * @param {object} input - 已有编译器、导出symbol和授权根；includeDeclaredArrays显式增加声明槽位，includeDeclarationRanges仅为该模式内部保留AST范围，均默认false。 Existing checker, exported symbol and authorized root; includeDeclaredArrays explicitly adds declaration slots and internal includeDeclarationRanges retains their AST ranges, both defaulting to false.
 * @returns {object} members与memberBoundaries；不是完整API或文档通过证明。 Members and boundaries, not full API or documentation acceptance.
 * @throws {Error} 展开超过固定资源上限；不返回静默截断清单。 Fixed resource limits exceeded; never returns a silently truncated inventory.
 */
export function collectStaticMemberDeclarations({checker,symbol,source,root,includeDeclaredArrays=false,includeDeclarationRanges=false}) {
  // <lang><zh-CN>结果只存安全相对来源，访问路径以数组保存，避免点号属性名与层级混淆。</zh-CN><en>Results retain safe relative sources only; array access paths distinguish dotted property names from hierarchy.</en></lang>
  const members=[];
  const memberBoundaries=[];
  // <lang><zh-CN>显式声明槽位证据独立保存，原对象清单及数组边界继续按旧语义输出。</zh-CN><en>Explicit declaration-slot evidence is separate; original object inventories and array boundaries retain their previous meaning.</en></lang>
  const declaredArrays=[];
  const declaredArrayMembers=[];
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
   * @param {boolean} [withRanges] - 使用内部范围模式默认值；旧位置序列化保持。 Uses the internal range-mode default while preserving legacy position serialization.
   * @returns {object[]} 位置或明确的越界标记。 Locations or explicit ownership-boundary markers.
   */
  function declarationsOf(value,withRanges=includeDeclarationRanges) {
    return (value.declarations??[]).map(declaration=>{
      const file=declaration.getSourceFile();
      const relative=path.relative(root,file.fileName).split(path.sep).join("/");
      if(relative.startsWith("../")||path.isAbsolute(relative)||relative.split("/").includes("node_modules")) return {status:"outside-source-root"};
      const position=file.getLineAndCharacterOfPosition(declaration.getStart(file));
      // <lang><zh-CN>新增声明模式单独保存AST半开范围，旧默认位置对象不增加字段。</zh-CN><en>The new declaration mode retains half-open AST ranges separately; legacy position objects gain no fields.</en></lang>
      const end=withRanges?file.getLineAndCharacterOfPosition(declaration.getEnd()):undefined;
      return {path:relative,line:position.line+1,column:position.character+1,kind:ts.SyntaxKind[declaration.kind],...(end?{range:{start:{line:position.line+1,column:position.character+1},end:{line:end.line+1,column:end.character+1}}}:{})};
    });
  }
  /**
   * @lang zh-CN 仅展开const直接数组中可唯一归属本仓CommonJS对象字面量的标识符，保留声明时点和旧边界。
   * @lang en Expands only identifiers in direct const arrays uniquely owned by local CommonJS object literals, retaining declaration scope and legacy boundaries.
   * @param {object} value <lang><zh-CN>已解析数组绑定。</zh-CN><en>Resolved array binding.</en></lang>
   * @param {string[]} memberPath <lang><zh-CN>相对于公开根的原数组路径。</zh-CN><en>Original array path relative to the public root.</en></lang>
   * @returns {void} <lang><zh-CN>完整支持时追加独立清单，不支持时保持未核。</zh-CN><en>Appends a separate inventory only when fully supported; unsupported input stays unverified.</en></lang>
   * @throws {Error} <lang><zh-CN>固定槽位或路径预算超限。</zh-CN><en>Fixed slot or path budgets are exceeded.</en></lang>
   */
  function visitDeclaredArray(value,memberPath) {
    // <lang><zh-CN>一个const声明及其直接字面量限定本证明范围，不追踪赋值后的运行状态。</zh-CN><en>A single const declaration and its direct literal delimit this proof, without tracking later runtime state.</en></lang>
    const declaration=value?.declarations?.length===1?value.declarations[0]:undefined;
    if(!declaration||!ts.isVariableDeclaration(declaration)||!(declaration.parent.flags&ts.NodeFlags.Const)||!declaration.initializer||!ts.isArrayLiteralExpression(declaration.initializer)) return;
    if(!ownedSource(declaration.getSourceFile())) return;
    // <lang><zh-CN>先检查总槽位预算，空洞或任何非标识符使整个声明保持未核。</zh-CN><en>Check the slot budget first; holes or any non-identifier leave the entire declaration unverified.</en></lang>
    const elements=declaration.initializer.elements;
    if(elements.length>128) throw new Error("Declared array resource limit exceeded.");
    if(!elements.length||elements.some(element=>!ts.isIdentifier(element))) return;
    // <lang><zh-CN>本地暂存保证后续槽位失败时不会留下部分成功记录。</zh-CN><en>Local staging prevents partially accepted records when a later slot fails.</en></lang>
    const slots=[],rows=[],boundaries=[];
    for(const [index,element]of elements.entries()) {
      // <lang><zh-CN>输入标识符须直接绑定相对require，TypeChecker只解析源码而不加载模块。</zh-CN><en>The identifier must directly bind a relative require; TypeChecker resolves source without loading modules.</en></lang>
      const reference=checker.getSymbolAtLocation(element);
      const binding=reference?.declarations?.length===1?reference.declarations[0]:undefined;
      const initializer=binding&&ts.isVariableDeclaration(binding)?binding.initializer:undefined;
      if(!initializer||!(binding.parent.flags&ts.NodeFlags.Const)||!ts.isCallExpression(initializer)||!ts.isIdentifier(initializer.expression)||initializer.expression.text!=="require"||initializer.arguments.length!==1||!ts.isStringLiteral(initializer.arguments[0])||!/^\.\.?\//.test(initializer.arguments[0].text)) return;
      if(!ownedSource(binding.getSourceFile())||checker.getSymbolAtLocation(initializer.expression)?.declarations?.some(node=>!node.getSourceFile().isDeclarationFile)) return;
      // <lang><zh-CN>对象身份取自唯一的原始字面量，联合类型和外部声明不能推导槽位。</zh-CN><en>Object identity comes from a unique original literal; unions and foreign declarations cannot establish slots.</en></lang>
      const type=checker.getTypeAtLocation(element);
      const object=type.symbol?.declarations?.length===1?type.symbol.declarations[0]:undefined;
      if(!object||!ts.isObjectLiteralExpression(object)||!ts.isBinaryExpression(object.parent)||object.parent.left.getText()!=="module.exports"||!ts.isExpressionStatement(object.parent.parent)) return;
      // <lang><zh-CN>每个实际对象源须为根内普通cjs文件，禁止依赖目录及物理重定向。</zh-CN><en>Every actual object source must be an owned regular cjs file, excluding dependency directories and physical redirection.</en></lang>
      const file=object.getSourceFile();
      const relative=path.relative(root,file.fileName).split(path.sep).join("/");
      if(!relative.endsWith(".cjs")||relative.startsWith("../")||path.isAbsolute(relative)||relative.split("/").includes("node_modules")) return;
      // <lang><zh-CN>显式cjs目标必须就是对象原文件，类型注解不能把另一个模块冒充为require结果。</zh-CN><en>The explicit cjs target must be the object's original file; type annotations cannot substitute another module for a require result.</en></lang>
      const requested=initializer.arguments[0].text;
      if(!requested.endsWith(".cjs")||/[\\:%?#]/.test(requested)||path.resolve(path.dirname(binding.getSourceFile().fileName),requested)!==path.resolve(file.fileName)) return;
      if(!ownedSource(file)) return;
      // <lang><zh-CN>CommonJS编译器会合成module符号，因此按显式顶层声明识别遮蔽，避免误拒正常导出。</zh-CN><en>The CommonJS compiler synthesizes module symbols, so explicit top-level declarations identify shadowing without rejecting normal exports.</en></lang>
      if(file.statements.some(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText()==="module")||ts.isFunctionDeclaration(node)&&node.name?.text==="module")) return;
      if(file.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isBinaryExpression(node.expression)&&node.expression.left.getText()==="module.exports").length!==1) return;
      // <lang><zh-CN>只接受静态普通属性和方法，重复键、展开、访问器和计算键保持未核。</zh-CN><en>Accept static ordinary properties and methods only; duplicate keys, spreads, accessors and computed keys stay unverified.</en></lang>
      if(object.properties.some(property=>!(ts.isPropertyAssignment(property)||ts.isMethodDeclaration(property))||!(ts.isIdentifier(property.name)||ts.isStringLiteral(property.name)))) return;
      const names=object.properties.map(property=>property.name.text);
      if(names.includes("__proto__")||new Set(names).size!==names.length||checker.getPropertiesOfType(type).length!==names.length) return;
      // <lang><zh-CN>槽位索引保存为路径段，原对象节点沿真实CommonJS赋值定位。</zh-CN><en>Slot indices remain path segments; original object nodes use actual CommonJS assignment locations.</en></lang>
      const access=[...memberPath,String(index)];
      const declarationRows=declarationsOf({declarations:[object.parent]},true);
      const slot={memberPath:access,declarationName:"exports",declarationLongname:"module.exports",status:"resolved",declarations:declarationRows,isCallable:false};
      // <lang><zh-CN>对象内部复用原成员遍历，嵌套数组及其它未知边界继续阻断。</zh-CN><en>Reuse original member traversal inside the object; nested arrays and other unknown boundaries continue to block acceptance.</en></lang>
      const nested=collectStaticMemberDeclarations({checker,symbol:reference,source:element.getSourceFile(),root,includeDeclarationRanges:true});
      // <lang><zh-CN>逐槽先核剩余容量，重复大对象也不能在最终检查前积累超预算节点。</zh-CN><en>Check remaining capacity per slot so repeated large objects cannot accumulate over-budget nodes before final validation.</en></lang>
      if(members.length+declaredArrayMembers.length+rows.length+nested.members.length+1>10000||access.length>32||nested.members.some(row=>access.length+row.memberPath.length>32)) throw new Error("Declared array resource limit exceeded.");
      const position=element.getSourceFile().getLineAndCharacterOfPosition(element.getStart());
      slots.push({memberPath:access,reference:element.text,source:declarationsOf(value),element:{line:position.line+1,column:position.character+1},object:declarationRows});
      rows.push(slot,...nested.members.map(row=>({...row,memberPath:[...access,...row.memberPath]})));
      boundaries.push(...nested.memberBoundaries.map(row=>({...row,memberPath:[...access,...row.memberPath]})));
    }
    // <lang><zh-CN>前缀后的全路径及原/新成员总量共同受既有上限约束，拒绝静默截断。</zh-CN><en>Fully prefixed paths and combined old/new member counts share existing limits, rejecting silent truncation.</en></lang>
    if(rows.some(row=>row.memberPath.length>32)||members.length+declaredArrayMembers.length+rows.length>10000) throw new Error("Declared array resource limit exceeded.");
    declaredArrays.push({memberPath,scope:"declared-array-initializer",mutable:true,slots,boundaries,expectedPaths:rows.map(row=>row.memberPath)});
    declaredArrayMembers.push(...rows);
  }
  /**
   * @lang zh-CN 核验声明来源为当前根内普通文件，物理链接不提供额外读取许可。
   * @lang en Checks that declaration sources are regular owned files; physical links grant no additional read authority.
   * @param {object} file <lang><zh-CN>编译器已读取的源文件。</zh-CN><en>Source file already read by the compiler.</en></lang>
   * @returns {boolean} <lang><zh-CN>源身份与物理归属均有效。</zh-CN><en>Whether source identity and physical ownership are valid.</en></lang>
   */
  function ownedSource(file) {
    // <lang><zh-CN>先检查相对归属，再核实际文件，避免把依赖源码登记为首方声明。</zh-CN><en>Check relative ownership before physical files, preventing dependency code from becoming first-party declarations.</en></lang>
    const relative=path.relative(root,file.fileName).split(path.sep).join("/");
    if(relative.startsWith("../")||path.isAbsolute(relative)||relative.split("/").includes("node_modules")) return false;
    const physical=fs.lstatSync(file.fileName);
    return physical.isFile()&&!physical.isSymbolicLink()&&physical.nlink===1&&fs.realpathSync(file.fileName)===path.resolve(file.fileName);
  }
  /**
   * @lang zh-CN 以当前访问链检测递归，兄弟别名分别保留；不遍历函数返回值或运行getter。
   * @lang en Detects recursion per access chain while retaining sibling aliases; never traverses function returns or runs getters.
   * @param {object} type - 当前值的静态类型。 Current value's static type.
   * @param {string[]} memberPath - 相对于公开绑定的访问路径。 Access path relative to the public binding.
   * @param {Set} ancestors - 仅当前分支的类型身份集合。 Type identities on this branch only.
   * @param {object} currentValue - 当前声明symbol，仅用于显式槽位读取。 Current declaration symbol, used only for explicit slot inspection.
   * @returns {void} 追加本轮清单和未核边界。 Appends inventory and unverified boundaries for this run.
   * @throws {Error} 固定资源上限耗尽。 Fixed resource budget exhausted.
   */
  function visit(type,memberPath,ancestors,currentValue) {
    if(members.length>10000||memberPath.length>32) throw new Error("Static member inventory resource limit exceeded.");
    if(type.flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown|ts.TypeFlags.TypeParameter)) {memberBoundaries.push({memberPath,reason:"dynamic-type"});return;}
    if(type.flags&ts.TypeFlags.NonPrimitive) {memberBoundaries.push({memberPath,reason:"opaque-object-type"});return;}
    // <lang><zh-CN>boolean原语在编译器中是true/false联合，但没有待展开的对象成员；混合联合与交叉类型继续保留边界。</zh-CN><en>The compiler represents primitive boolean as a true/false union with no object members to expand; mixed unions and intersections remain explicit boundaries.</en></lang>
    if(type.flags&ts.TypeFlags.Boolean) return;
    if(type.isUnionOrIntersection()) {memberBoundaries.push({memberPath,reason:"composite-type"});return;}
    if(!(type.flags&ts.TypeFlags.Object)) return;
    if(ancestors.has(type)) {memberBoundaries.push({memberPath,reason:"recursive-type"});return;}
    if(checker.isArrayType(type)||checker.isTupleType(type)) {
      memberBoundaries.push({memberPath,reason:"array-elements"});
      if(includeDeclaredArrays) visitDeclaredArray(currentValue,memberPath);
      return;
    }
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
      if(declared) visit(propertyType,access,next,value);
      else memberBoundaries.push({memberPath:access,reason:"unresolved-member-source"});
    }
  }
  const value=resolveValue(symbol);
  visit(checker.getTypeOfSymbolAtLocation(value,value.valueDeclaration??source),[],new Set(),value);
  if(members.length+declaredArrayMembers.length>10000) throw new Error("Static member inventory resource limit exceeded.");
  return {members,memberBoundaries,...(includeDeclaredArrays?{declaredArrays,declaredArrayMembers}:{})};
}
