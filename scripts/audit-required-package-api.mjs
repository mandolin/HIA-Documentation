/**
 * @lang zh-CN 审核45必要包的真实exports/main/bin、源码声明与资源；只读目标，只写主仓专用清单，不声称文档已覆盖。
 * @lang en Audit actual exports/main/bin, source declarations, and resources for 45 required packages; targets are read-only and only an owner inventory is written, without claiming documentation coverage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { collectPackageEntries, collectModuleExports, verifyCompiledSubpathSources } from "./lib/package-api-inputs.mjs";
import { resolvePackageApiOwnership } from "./lib/package-api-ownership.mjs";

/**
 * @lang zh-CN 按显式首方允许清单审计实际导出；编译器不执行模块、发出JS或声称注释精度。
 * @lang en Audit actual exports against an explicit first-party allowlist; the compiler neither executes modules nor emits JS or claims comment precision.
 * @param {string} workspaceRoot - 包含main-repo/HIA的容器目录。 Container holding main-repo/HIA.
 * @param {object} [options] - 显式成员审核及packageNames包子集；省略仍审核默认45包。 Explicit member inspection and packageNames subset; omission retains the default 45-package audit.
 * @returns {object} 仅含安全相对路径/名称/版本/摘要的审核结果。 Audit containing only safe relative paths, names, versions, and hashes.
 * @throws {Error} 允许清单、包身份、源码或资源不完整。 Incomplete allowlist, identity, source, or resource.
 */
export function auditRequiredPackages(workspaceRoot, options = {}) {
  const mainRoot=fileURLToPath(new URL("../",import.meta.url));
  const scope=JSON.parse(fs.readFileSync(path.join(mainRoot,"reference/required-package-api.inputs.json"),"utf8"));
  if(scope.packages.length!==45 || new Set(scope.packages.map(item=>item.name)).size!==45) throw new Error("Required package scope must contain 45 unique names.");
  // <lang><zh-CN>显式子集只选择固定允许清单中的包，默认仍审核全部45包；空/重复/未知选择在读取包前拒绝。</zh-CN><en>An explicit subset selects only allowlisted packages; omission still audits all 45, and empty, duplicate or unknown selections fail before package reads.</en></lang>
  const names=options.packageNames;
  if(names!==undefined && (!Array.isArray(names) || names.length===0 || new Set(names).size!==names.length || names.some(name=>!scope.packages.some(item=>item.name===name)))) throw new Error("Invalid package audit selection.");
  const packages=[];
  for(const item of scope.packages) {
    if(names && !names.includes(item.name)) continue;
    // <lang lang="zh-CN">根来自固定owner而非清单任意绝对路径；实际manifest名称必须匹配。</lang><lang lang="en">Roots come from fixed owners rather than arbitrary absolute manifest paths; actual package names must match.</lang>
    const {ownerRoot, packageRoot, manifest, manifestSha256} = resolvePackageApiOwnership(workspaceRoot, item);
    const entries=collectPackageEntries(packageRoot,manifest,item.sourceEntry,item.sourceEntries);
    const sourceMappings=verifyCompiledSubpathSources(ownerRoot,item.directory,entries);
    const sources=[...new Set(entries.filter(entry=>["runtime-module","type-declaration","command"].includes(entry.kind)).map(entry=>path.posix.join(item.directory,entry.source)))];
    const modules=collectModuleExports(ownerRoot,sources,options);
    const head=execFileSync("git",["-C",ownerRoot,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
    // <lang><zh-CN>物理归属之外核对固定首方托管身份，展示标签不能替代实际Git来源。</zh-CN><en>Check fixed first-party hosting identity in addition to physical ownership; display labels cannot substitute for the actual Git origin.</en></lang>
    const repository = "mandolin/" + (item.owner === "main-repo" ? "HIA-Documentation" : item.owner);
    const origin = execFileSync("git", ["-C", ownerRoot, "remote", "get-url", "origin"], {encoding: "utf8"}).trim();
    if (!["https://github.com/" + repository + ".git", "https://github.com/" + repository, "git@github.com:" + repository + ".git"].includes(origin)) throw new Error("Required API repository identity mismatch.");
    packages.push({name:item.name,owner:item.owner,repository,directory:item.directory,version:manifest.version,sourceHead:head,manifestSha256,entries,modules,...(sourceMappings.length?{sourceMappings}:{})});
  }
  return {description:"45必要包静态入口及编译器导出审核；不是文档生成覆盖/语义验收/发行证明。",packages,summary:{packages:packages.length,entries:packages.reduce((sum,item)=>sum+item.entries.length,0),modules:packages.reduce((sum,item)=>sum+item.modules.length,0),exports:packages.reduce((sum,item)=>sum+item.modules.reduce((total,module)=>total+module.exports.length,0),0)}};
}

// <lang lang="zh-CN">命令入口只写本主仓dist，不接收任意输出路径或执行目标包命令。</lang><lang lang="en">The command writes only this owner's dist, accepting no arbitrary output path or target command execution.</lang>
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.length!==2 || args[0]!=="--workspace-root") throw new Error("Expected --workspace-root only.");
  const result=auditRequiredPackages(path.resolve(args[1]));
  const output=fileURLToPath(new URL("../dist/required-package-api-audit/",import.meta.url));
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,"inventory.json"),JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result.summary));
}
