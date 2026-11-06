/** @file @lang zh-CN 必要卫星包的公开根冻结数组实际生产审核，不推断描述符或插件元素。 @lang en Actual production audit of public root frozen arrays in required satellite packages, without inferring descriptor or plugin elements. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {auditRequiredPackages} from "./audit-required-package-api.mjs";
import {buildFrozenArrayResource} from "./lib/frozen-array-resource.mjs";
import {assertPublicRootOmission} from "./lib/core-package-api.mjs";

/**
 * @lang zh-CN 按真实编译器根数组边界逐条生产及验证；独立失败保留固定原因，无宽松回退。
 * @lang en Produces and verifies each real compiler root-array boundary, retaining fixed failures without permissive fallback.
 * @param {string} workspaceRoot <lang><zh-CN>包含本主仓和固定卫星仓的授权容器。</zh-CN><en>Authorized container holding this main repository and fixed satellite owners.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>逐绑定结果及实际五文件/绑定的相对输出目录；完整产品验收独立。</zh-CN><en>Per-binding results and relative output directory with five actual files per binding; full product acceptance remains separate.</en></lang>
 * @throws {Error} <lang><zh-CN>容器、清单或输出边界不合法。</zh-CN><en>Invalid container, inventory or output boundary.</en></lang>
 */
export async function auditFrozenArrayResources(workspaceRoot) {
  const main=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
  const container=fs.realpathSync(workspaceRoot);
  assert.equal(fs.realpathSync(path.join(container,"main-repo")),main);
  const inventory=auditRequiredPackages(container,{includeMembers:true});
  const dist=path.join(main,"dist");
  fs.mkdirSync(dist,{recursive:true});
  assert.equal(fs.realpathSync(dist),dist);
  const output=fs.mkdtempSync(path.join(dist,"frozen-array-resources-"));
  const rows=[];
  for(const pack of inventory.packages.filter(pack=>pack.owner!=="main-repo")) {
    for(const module of pack.modules.filter(module=>!/\.d\.[cm]?ts$/.test(module.path))) {
      for(const binding of module.exports.filter(binding=>binding.memberBoundaries.some(boundary=>boundary.reason==="array-elements"&&boundary.memberPath.length===0))) {
        // <lang><zh-CN>公开身份和原声明来自当前编译器清单；选定实际定义不改变任何源入口或执行权限。</zh-CN><en>Public identity and original declarations come from the current compiler inventory; selecting the actual definition changes neither source entry points nor execution permissions.</en></lang>
        const identity={package:pack.name,owner:pack.owner,module:module.path,name:binding.name,declarations:binding.declarations};
        try {
          assert.equal(binding.declarations.length,1);
          const result=await buildFrozenArrayResource({root:path.join(container,"HIA",pack.owner),modulePath:module.path,exportName:binding.name,definitionModule:binding.declarations[0].path,declarations:binding.declarations});
          const directory="array-"+rows.length;
          fs.mkdirSync(path.join(output,directory));
          for(const file of [...result.report.files,{path:"report.json"}]) {
            const destination=path.join(output,directory,file.path);
            fs.mkdirSync(path.dirname(destination),{recursive:true});
            fs.copyFileSync(path.join(main,result.output,file.path),destination,fs.constants.COPYFILE_EXCL);
          }
          rows.push({...identity,...result.report,files:result.report.files.map(file=>({...file,path:directory+"/"+file.path}))});
        } catch {rows.push({...identity,status:"unverified",reason:"finite-array-production-failed"});}
      }
    }
  }
  const verified=rows.filter(row=>row.status==="verified");
  const report={description:"公开根冻结字符串数组的B/A/实际JSONdoc验收；其它数组与完整产品独立",bindings:rows.length,verifiedBindings:verified.length,unverifiedBindings:rows.length-verified.length,values:verified.reduce((sum,row)=>sum+row.values,0),elements:verified.reduce((sum,row)=>sum+row.elements.length,0),rows,coverageComplete:false,releaseProof:false};
  assertPublicRootOmission(report,container);
  fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  return {report,output:path.relative(main,output).split(path.sep).join("/")};
}

/**
 * @lang zh-CN 仅将当前实际审核唯一通过的公开根数组另记覆盖，其它成员边界与原内容行保持。
 * @lang en Records separate coverage only for uniquely verified public root arrays from the current actual audit, retaining other member boundaries and original content rows.
 * @param {object} base <lang><zh-CN>本次原生或Schema组合审核。</zh-CN><en>Current native or Schema-combined audit.</en></lang>
 * @param {object} arrays <lang><zh-CN>紧接实际生产返回的本地范围报告，不是外部输入契约。</zh-CN><en>Local scoped report returned immediately by actual production, not an external input contract.</en></lang>
 * @returns {object} <lang><zh-CN>覆盖19根等实际数量及剩余边界；不扩大成员或产品验收。</zh-CN><en>Actual covered root counts and remaining boundaries without expanding member or product acceptance.</en></lang>
 */
export function adoptFrozenArrayResources(base,arrays) {
  const resolvedFrozenArrayBoundaries=[];
  const boundaries=base.boundaries.filter(boundary=>{
    const matches=arrays.rows.filter(row=>row.package===boundary.package&&row.module===boundary.module&&row.name===boundary.name);
    const verified=matches.length===1&&matches[0].status==="verified"&&matches[0].frozen&&matches[0].values===matches[0].elements.length+1;
    if(boundary.reason!=="array-elements"||boundary.memberPath.length!==0||!verified) return true;
    resolvedFrozenArrayBoundaries.push({...boundary,values:matches[0].values,elements:matches[0].elements.length,definitionModule:matches[0].definitionModule});
    return false;
  });
  return {...base,boundaries,resolvedFrozenArrayBoundaries,frozenArrayBindings:resolvedFrozenArrayBoundaries.length,frozenArrayElements:resolvedFrozenArrayBoundaries.reduce((sum,row)=>sum+row.elements,0),unverifiedFrozenArrayBindings:arrays.unverifiedBindings,complete:base.contentGaps===0&&boundaries.length===0&&(base.unverifiedSchemaBindings??0)===0&&arrays.unverifiedBindings===0};
}

// <lang><zh-CN>命令仅接受固定工作区容器，任何未核绑定都会非零退出。</zh-CN><en>The command accepts only the fixed workspace container and exits nonzero for any unverified binding.</en></lang>
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  assert(args.length===2&&args[0]==="--workspace-root");
  const result=await auditFrozenArrayResources(path.resolve(args[1]));
  console.log(JSON.stringify({bindings:result.report.bindings,verified:result.report.verifiedBindings,values:result.report.values,elements:result.report.elements,output:result.output,coverageComplete:false}));
  if(result.report.unverifiedBindings||!result.report.bindings) process.exitCode=1;
}
