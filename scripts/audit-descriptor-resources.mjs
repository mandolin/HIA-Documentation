/** @file @lang zh-CN 按已授权metadata依赖实际核验描述符及公开数组访问路径。 @lang en Actually verifies descriptors and public array paths using authorized metadata dependencies. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {isDeepStrictEqual} from "node:util";
import {auditRequiredPackages} from "./audit-required-package-api.mjs";
import {buildDescriptorResource} from "./lib/frozen-array-resource.mjs";
import {matchSchemaMemberDeclarations} from "./lib/schema-resource-adoption.mjs";
import {assertPublicRootOmission} from "./lib/core-package-api.mjs";

/**
 * @lang zh-CN 从必要包实际清单生产纯描述符，再按公开访问路径逐声明核数组与完整子树。
 * @lang en Produces pure descriptors from the actual required-package inventory, then checks each public array declaration and complete subtree.
 * @param {string} workspaceRoot <lang><zh-CN>包含固定owner的本工作区容器。</zh-CN><en>This workspace container holding fixed owners.</en></lang>
 * @param {object} [options] <lang><zh-CN>packageNames选择已登记包，描述符依赖仍按选中实际runner限界。</zh-CN><en>packageNames selects registered packages; descriptor dependencies remain bounded by the selected actual runner.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>五描述符等实际数量、逐路径结果与独立输出目录。</zh-CN><en>Actual descriptor counts, per-path results and an isolated output directory.</en></lang>
 * @throws {Error} <lang><zh-CN>工作区或全局输入边界无效。</zh-CN><en>Invalid workspace or global input boundaries.</en></lang>
 */
export async function auditDescriptorResources(workspaceRoot, options = {}) {
  const main=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
  const container=fs.realpathSync(workspaceRoot);
  assert.equal(fs.realpathSync(path.join(container,"main-repo")),main);
  const inventory=auditRequiredPackages(container,{packageNames:options.packageNames,includeMembers:true});
  const dist=path.join(main,"dist");
  fs.mkdirSync(dist,{recursive:true});
  assert.equal(fs.realpathSync(dist),dist);
  const output=fs.mkdtempSync(path.join(dist,"descriptor-resources-"));
  const descriptors=[],paths=[];
  for(const pack of inventory.packages.filter(pack=>pack.owner!=="main-repo"&&pack.name.endsWith("-producer"))) {
    const runner=inventory.packages.find(item=>item.owner===pack.owner&&item.name===pack.name.replace(/-producer$/,"-runner"));
    assert(runner,"Missing owned runner metadata package.");
    const options={authorizedPackages:[{name:runner.name,version:runner.version,root:runner.directory,subpaths:["./metadata"]}]};
    for(const module of pack.modules.filter(module=>!module.path.includes(".d."))) {
      for(const binding of module.exports.filter(binding=>binding.name.endsWith("ProducerDescriptor"))) {
        // <lang><zh-CN>授权来自真实同owner包清单，侧车和名称匹配均不能自行扩大源读取范围。</zh-CN><en>Authority comes from actual same-owner package inventory; neither sidecars nor matching names can widen source access.</en></lang>
        const identity={package:pack.name,owner:pack.owner,module:module.path,name:binding.name};
        try {
          assert.equal(binding.declarations.length,1);
          const generated=await buildDescriptorResource({root:path.join(container,"HIA",pack.owner),modulePath:module.path,exportName:binding.name,definitionModule:binding.declarations[0].path,declarations:binding.declarations,options});
          const directory="descriptor-"+descriptors.length;
          fs.mkdirSync(path.join(output,directory));
          for(const file of [...generated.report.files,{path:"report.json"}]) {
            const destination=path.join(output,directory,file.path);
            fs.mkdirSync(path.dirname(destination),{recursive:true});
            fs.copyFileSync(path.join(main,generated.output,file.path),destination,fs.constants.COPYFILE_EXCL);
          }
          descriptors.push({...identity,...generated.report,files:generated.report.files.map(file=>({...file,path:directory+"/"+file.path}))});
        } catch {descriptors.push({...identity,status:"unverified",reason:"descriptor-production-failed"});}
      }
      for(const binding of module.exports) for(const boundary of binding.memberBoundaries.filter(boundary=>boundary.reason==="array-elements"&&["inputKinds","outputKinds"].includes(boundary.memberPath.at(-1)))) {
        const member=binding.members.find(member=>isDeepStrictEqual(member.memberPath,boundary.memberPath));
        const pointer="/"+boundary.memberPath.at(-1);
        const candidates=descriptors.filter(row=>row.package===pack.name&&row.module===module.path&&row.status==="verified");
        const matched=candidates.flatMap(row=>row.members.filter(node=>node.pointer===pointer&&node.type==="array"&&member&&!member.isCallable&&matchSchemaMemberDeclarations(member,{...node,origin:node.source}).matches).map(node=>({row,node})));
        const identity={package:pack.name,module:module.path,name:binding.name,...boundary};
        if(matched.length!==1) {paths.push({...identity,status:"unverified",reason:"missing-or-ambiguous-descriptor-array"});continue;}
        const {row,node}=matched[0];
        const subtree=row.members.filter(value=>value.pointer===pointer||value.pointer.startsWith(pointer+"/"));
        paths.push({...identity,status:"verified",descriptor:row.name,pointer,symbolId:node.symbolId,declaration:node.declaration,originalDeclarations:member.declarations,values:subtree.length,elements:subtree.length-1});
      }
    }
  }
  const verified=descriptors.filter(row=>row.status==="verified");
  const report={description:"纯描述符B/A/JSONdoc及逐公开数组原声明验收，运行包装和插件数组独立",descriptors:descriptors.length,verifiedDescriptors:verified.length,unverifiedDescriptors:descriptors.length-verified.length,values:verified.reduce((sum,row)=>sum+row.values,0),paths,verifiedPaths:paths.filter(row=>row.status==="verified").length,unverifiedPaths:paths.filter(row=>row.status!=="verified").length,rows:descriptors,coverageComplete:false,releaseProof:false};
  assertPublicRootOmission(report,container);
  fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  return {report,output:path.relative(main,output).split(path.sep).join("/")};
}

/**
 * @lang zh-CN 仅采用本次真实审核唯一通过的描述符公开路径，保留其它内容和边界。
 * @lang en Adopts only uniquely verified public descriptor paths from this actual audit, retaining all other content and boundaries.
 * @param {object} base <lang><zh-CN>当前原生/Schema/根数组审核。</zh-CN><en>Current native/Schema/root-array audit.</en></lang>
 * @param {object} descriptors <lang><zh-CN>本次实际描述符审核，不是外部侧车输入。</zh-CN><en>Current actual descriptor audit, not external sidecar input.</en></lang>
 * @returns {object} <lang><zh-CN>独立覆盖记录及剩余边界。</zh-CN><en>Separate coverage records and remaining boundaries.</en></lang>
 */
export function adoptDescriptorResources(base,descriptors) {
  const resolvedDescriptorBoundaries=[];
  const boundaries=base.boundaries.filter(boundary=>{
    const matches=descriptors.paths.filter(row=>row.package===boundary.package&&row.module===boundary.module&&row.name===boundary.name&&row.reason===boundary.reason&&isDeepStrictEqual(row.memberPath,boundary.memberPath));
    if(matches.length!==1||matches[0].status!=="verified") return true;
    resolvedDescriptorBoundaries.push(matches[0]);
    return false;
  });
  return {...base,boundaries,resolvedDescriptorBoundaries,descriptorArrayPaths:resolvedDescriptorBoundaries.length,unverifiedDescriptors:descriptors.unverifiedDescriptors,unverifiedDescriptorPaths:descriptors.unverifiedPaths,complete:base.contentGaps===0&&boundaries.length===0&&(base.unverifiedSchemaBindings??0)===0&&(base.unverifiedFrozenArrayBindings??0)===0&&descriptors.unverifiedDescriptors===0&&descriptors.unverifiedPaths===0};
}

// <lang><zh-CN>命令仅接受本工作区，任何失败路径使严格审核非零退出。</zh-CN><en>The command accepts only this workspace, and any failed path makes the strict audit exit nonzero.</en></lang>
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  assert(args.length===2&&args[0]==="--workspace-root");
  const result=await auditDescriptorResources(path.resolve(args[1]));
  console.log(JSON.stringify({descriptors:result.report.verifiedDescriptors,values:result.report.values,paths:result.report.verifiedPaths,unverifiedPaths:result.report.unverifiedPaths,output:result.output}));
  if(result.report.unverifiedDescriptors||result.report.unverifiedPaths||!result.report.paths.length) process.exitCode=1;
}
