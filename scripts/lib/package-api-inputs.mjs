/**
 * @lang zh-CN 显式首方包的只读入口清单与TypeScript编译器导出核对；不执行目标模块，不代表生成覆盖。
 * @lang en Read-only entry inventory and compiler export inspection for explicit first-party packages; never executes targets or asserts generated coverage.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * @lang zh-CN 将包内相对目标解析为已存在的普通文件；不接受点段、编码或联接重定向。
 * @lang en Resolve a package-relative target to an existing regular file, rejecting dot segments, encodings, and redirected junctions.
 * @param {string} root - 显式包根。 Explicit package root.
 * @param {string} target - 清单中的文件目标。 Manifest file target.
 * @returns {string} 规范化包内相对路径。 Canonical package-relative path.
 * @throws {Error} 不安全、缺失或非普通文件。 Unsafe, missing, or non-regular target.
 */
function checkedFile(root, target) {
  const relative = target.replace(/^\.\//, "");
  if (!relative || /[\\:%?#*]/.test(relative) || path.posix.normalize(relative) !== relative || relative.split("/").some(segment => !segment || segment === "..") || path.isAbsolute(relative)) throw new Error("Unsafe package API target.");
  // <lang lang="zh-CN">对真实物理文件复核边界，清单URL不构成仓外读取许可。</lang><lang lang="en">Recheck the physical file boundary; a manifest URL grants no external read permission.</lang>
  const absolute = path.resolve(root, relative);
  const physical = path.relative(fs.realpathSync(root), fs.realpathSync(absolute));
  if (physical.startsWith("..") || path.isAbsolute(physical) || !fs.statSync(absolute).isFile()) throw new Error("Package API target leaves its owner.");
  return relative;
}

/**
 * @lang zh-CN 展开全部exports条件、资源子路径和bin；通配仅接受现有JSON资源，不模拟Node运行时条件选择。
 * @lang en Enumerate all export conditions, resource subpaths, and bins; wildcards cover existing JSON resources only, without simulating runtime condition selection.
 * @param {string} root - 显式包根。 Explicit package root.
 * @param {object} manifest - 实际package.json。 Actual package manifest.
 * @param {string} [sourceEntry] - 已审定的根源码入口，用于编译型包。 Reviewed source entry for compiled packages.
 * @returns {object[]} 所有条件分支与命令入口，含被阻止项。 All condition branches and commands, including blocked entries.
 * @throws {Error} 目标、通配或源码入口不支持。 Unsupported target, wildcard, or source entry.
 */
export function collectPackageEntries(root, manifest, sourceEntry) {
  const entries = [];
  /**
   * @lang zh-CN 递归保留条件路径，不把types或另一个运行时分支静默丢弃。
   * @lang en Recursively retain condition paths rather than silently omitting types or alternate runtime branches.
   * @param {unknown} value - 目标/条件。 Target or conditions.
   * @param {string} subpath - 公开子路径。 Public subpath.
   * @param {string[]} conditions - 完整条件链。 Full condition chain.
   * @param {string} channel - export/main/bin类别。 Export/main/bin channel.
   * @returns {void} 向本次清单追加。 Appends to the local inventory.
   */
  function visit(value, subpath, conditions, channel) {
    if (value === null) { entries.push({ channel, subpath, conditions, kind:"blocked" }); return; }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [condition, target] of Object.entries(value)) visit(target, subpath, [...conditions, condition], channel);
      return;
    }
    if (typeof value !== "string") throw new Error("Unsupported package API export target.");
    if (value.includes("*")) {
      // <lang lang="zh-CN">当前必要包只用schemas目录单层JSON通配；其它形状必须先明确，而非推测扩展。</lang><lang lang="en">Required packages currently use single-level schema JSON wildcards only; other shapes need an explicit decision rather than inferred expansion.</lang>
      if (!/^\.\/src\/schemas\/\*$/.test(value) || !/^\.\/schemas\/\*$/.test(subpath)) throw new Error("Unsupported package API wildcard.");
      const files = fs.readdirSync(path.join(root,"src/schemas"), { withFileTypes:true });
      if (!files.length || files.some(file => !file.isFile() || !file.name.endsWith(".json"))) throw new Error("Unsupported package API wildcard members.");
      for (const file of files.sort((a,b)=>a.name.localeCompare(b.name,"en"))) visit(value.replace("*",file.name),subpath.replace("*",file.name),conditions,channel);
      return;
    }
    // <lang lang="zh-CN">资源读取真实发行文件，源码映射只用于已明确提供根入口的编译型代码分支。</lang><lang lang="en">Resources use real distributed files; source mapping applies only to compiled code with an explicit root source entry.</lang>
    const target = checkedFile(root,value);
    const kind = channel === "bin" ? "command" : /\.d\.(?:ts|mts|cts)$/.test(target) ? "type-declaration" : target.endsWith(".json") ? "json-resource" : /\.(?:[cm]?js|tsx?)$/.test(target) ? "runtime-module" : "unsupported";
    if (kind === "unsupported") throw new Error("Unsupported package API file kind.");
    const source = sourceEntry && (subpath === "." || channel === "bin") && ["runtime-module","type-declaration","command"].includes(kind) ? checkedFile(root,sourceEntry) : target;
    entries.push({ channel, subpath, conditions, kind, target, source });
  }
  // <lang lang="zh-CN">exports存在时优先；没有exports才按main入口，bin始终独立登记，不运行命令。</lang><lang lang="en">Prefer exports when present, otherwise use main; always inventory bins separately without executing commands.</lang>
  if (manifest.exports !== undefined) {
    const exports = manifest.exports;
    if (exports && typeof exports === "object" && !Array.isArray(exports) && Object.keys(exports).some(key=>key.startsWith("."))) {
      for (const [subpath,value] of Object.entries(exports)) visit(value,subpath,[],"exports");
    } else visit(exports,".",[],"exports");
  } else if (manifest.main) visit(manifest.main,".",[],"main");
  else throw new Error("Package API root entry is undeclared.");
  const bins = typeof manifest.bin === "string" ? { [manifest.name.split("/").at(-1)]:manifest.bin } : manifest.bin ?? {};
  for (const [name,target] of Object.entries(bins)) visit(target,name,[],"bin");
  return entries;
}

/**
 * @lang zh-CN 对显式模块使用已安装TypeScript编译器解析重导出与别名，不运行模块；未知声明保留unresolved。
 * @lang en Use the installed TypeScript compiler to inspect explicit module re-exports and aliases without execution; unknown declarations remain unresolved.
 * @param {string} root - 允许的源码归属根。 Allowed source ownership root.
 * @param {string[]} sources - 相对模块路径。 Relative module paths.
 * @returns {object[]} 导出名、语法种类和归属位置；无源码正文或绝对路径。 Export names, syntax kinds, and owner locations, without bodies or absolute paths.
 */
export function collectModuleExports(root, sources) {
  const files = [...new Set(sources)].map(source=>path.join(root,checkedFile(root,source)));
  const program = ts.createProgram(files,{allowJs:true,checkJs:false,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext});
  const checker = program.getTypeChecker();
  return files.map(file=>{
    // <lang lang="zh-CN">编译器静态符号是独立验收清单，不冒充文档生产器的实际提取结果。</lang><lang lang="en">Compiler symbols form an independent acceptance inventory, not the documentation producer's extraction output.</lang>
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    const exports = module ? checker.getExportsOfModule(module).map(exported=>{
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const declarations = (symbol.declarations ?? []).map(declaration=>{
        const owner = declaration.getSourceFile();
        const relative = path.relative(root,owner.fileName).split(path.sep).join("/");
        if (relative.startsWith("../") || path.isAbsolute(relative)) return { status:"outside-source-root" };
        const position = owner.getLineAndCharacterOfPosition(declaration.getStart(owner));
        return {path:relative,line:position.line+1,column:position.character+1,kind:ts.SyntaxKind[declaration.kind]};
      });
      return { name:exported.name, declarationName:symbol.name, status:declarations.length ? "resolved" : "unresolved", declarations };
    }).sort((a,b)=>a.name.localeCompare(b.name,"en")) : [];
    return {path:path.relative(root,file).split(path.sep).join("/"),moduleRecognized:Boolean(module),syntacticDiagnostics:program.getSyntacticDiagnostics(source).map(item=>item.code),exports};
  });
}
