/** @lang zh-CN 逐文件实际生产并关联卫星公开JavaScript声明，缺失字段/来源/生产证据不能按同名占位通过。 @lang en Produce each actual source file and associate public satellite JavaScript declarations, rejecting missing fields/sources/production evidence rather than accepting name placeholders. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath,pathToFileURL} from "node:url";
import {runDocumentationProducer} from "../packages/plugin-sdk/dist/index.js";
import {convertJSDocIntegrationToHiaDocumentDetailed} from "../packages/parser-jsdoc/dist/index.js";
import {validateHiaDocument} from "../packages/core/dist/index.js";
import {validateDocSourceMap} from "../packages/source-linkage/dist/index.js";
import {auditRequiredPackages} from "./audit-required-package-api.mjs";
import {associateNativeJsdocBinding} from "./lib/jsdoc-api-bindings.mjs";
import {assertPublicRootOmission} from "./lib/core-package-api.mjs";
import {auditSchemaResourceAssociations} from "./audit-schema-resource-associations.mjs";
import {adoptSchemaResourceMembers} from "./lib/schema-resource-adoption.mjs";
import {auditFrozenArrayResources,adoptFrozenArrayResources} from "./audit-frozen-array-resources.mjs";

/**
 * @lang zh-CN 在既有工件协议下逐来源核验原生声明，返回实际关联与缺口；不执行目标包。
 * @lang en Verify native declarations per source under existing artifact protocols, returning actual associations and gaps without executing target packages.
 * @param {string} workspaceRoot - 本主仓所属授权容器。 Authorized container owning this main repository.
 * @param {object} [options] - 显式includeMembers核对嵌套成员，保留旧默认根绑定检查。 Explicit includeMembers checks nested members while preserving the default root-binding audit.
 * @returns {Promise<object>} 关联报告与主仓相对输出路径，非完整覆盖/发行许可。 Association report and main-relative output, not full coverage/release permission.
 * @throws {Error} 文件边界、工件协议、核心字段或来源无效。 Invalid file boundary, artifact protocol, core fields or sources.
 */
export async function auditSatelliteNativeApi(workspaceRoot, options = {}) {
  assert(!options.schemaResources || options.includeMembers,"Schema resources require explicit member auditing.");
  assert(!options.arrayResources || options.includeMembers,"Array resources require explicit member auditing.");
  // <lang><zh-CN>工作区和工具均固定为本主仓所属容器；不能用调用参数替换生产器实现。
  // </zh-CN><en>Both workspace and tools are fixed to this main repository's container; arguments cannot substitute another producer.</en></lang>
  const mainRoot=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
  const container=fs.realpathSync(workspaceRoot);
  assert.equal(fs.realpathSync(path.join(container,"main-repo")),mainRoot);
  const producerPath=path.join(container,"HIA/hia-jsdoc/packages/jsdoc-producer/src/index.mjs");
  const pluginPath=path.join(container,"HIA/jsdoc-plugin-hia-sys/src/index.cjs");
  for(const file of [producerPath,pluginPath]) assert.equal(fs.realpathSync(file),file,"Tool path redirected.");
  const {jsdocProducer}=await import(pathToFileURL(producerPath));
  const inventory=auditRequiredPackages(container,options);
  const packages=inventory.packages.filter(item=>item.owner!=="main-repo");
  assert.equal(packages.length,32);
  const dist=path.join(mainRoot,"dist");
  fs.mkdirSync(dist,{recursive:true});
  assert.equal(fs.realpathSync(dist),dist,"Output root redirected.");
  const output=fs.mkdtempSync(path.join(dist,"satellite-native-api-"));
  // <lang><zh-CN>每个实际来源只生产一次，保留工件作用域；缓存不是按节点名去重。
  // </zh-CN><en>Produce each actual source once with artifact scope intact; the cache never deduplicates by node name.</en></lang>
  const documents=new Map();
  const rows=[];
  // <lang><zh-CN>根绑定与成员路径分别计数，不把默认别名或同一实现的多个访问路径算成独立函数。</zh-CN><en>Count root bindings separately from member access paths; default aliases and multiple paths to one implementation are not independent functions.</en></lang>
  const memberRows=[];
  const memberBoundaries=[];
  for(const pack of packages) {
    const modules=pack.modules.filter(module=>/\.(mjs|cjs|js)$/.test(module.path));
    for(const module of modules) for(const rootBinding of module.exports.filter(item=>!item.declarationTypeOnly)) {
      // <lang><zh-CN>成员期望只来自编译器独立清单；生产仍读取真实原声明文件，动态/资源边界单独登记。</zh-CN><en>Member expectations come only from the independent compiler inventory; production still reads actual declaration files and records dynamic/resource boundaries separately.</en></lang>
      const candidates=[{binding:rootBinding},...(rootBinding.members??[]).map(binding=>({binding,memberPath:binding.memberPath}))];
      for(const boundary of rootBinding.memberBoundaries??[]) memberBoundaries.push({package:pack.name,module:module.path,name:rootBinding.name,...boundary});
      for(const candidate of candidates) {
      const binding=candidate.binding;
      for(const declaration of binding.declarations) {
        if(!declaration.path || !/\.(mjs|cjs|js)$/.test(declaration.path)) continue;
        const source=`HIA/${pack.owner}/${declaration.path}`;
        if(documents.has(source)) continue;
        // <lang><zh-CN>校验来源物理边界，不跟随仓外链接或硬链接，也不读取缺失/不规范路径。
        // </zh-CN><en>Verify physical source ownership without following external redirects/hard links or reading missing/noncanonical paths.</en></lang>
        assert(!declaration.path.split("/").some(part=>!part || part==="." || part==="..") && !/[\\:%?#]/.test(declaration.path));
        const sourceFile=path.join(container,source);
        const state=fs.lstatSync(sourceFile);
        assert(state.isFile() && !state.isSymbolicLink() && state.nlink===1);
        assert.equal(fs.realpathSync(sourceFile),sourceFile,"Source redirected.");
        const bytes=fs.readFileSync(sourceFile);
        const relative=`source-${documents.size}`;
        const destination=path.join(output,relative);
        const result=await runDocumentationProducer(jsdocProducer,{workspaceRoot:container,outputDirectory:destination,inputs:[{kind:source.endsWith(".mjs") ? "javascript-module" : "javascript-source",path:source}],profileIds:["jsdoc"],options:{mode:"hiaIntegration",plugin:{pluginPath},hia:{docSourceMap:{enabled:true},i18n:{enabled:true,defaultLocale:"en",fallbackLocale:"en",locales:["en","zh-CN"]}}}});
        const record={source,status:result.status,sha256:createHash("sha256").update(bytes).digest("hex"),producer:result.producer,diagnosticCodes:result.diagnostics.map(item=>item.code),artifact:`${relative}/hia-integration.json`,artifacts:[],integration:{ir:{nodes:[]}},document:{symbols:[]},warningCount:0};
        if(result.status==="success") {
          /** @lang zh-CN 只读成功清单唯一的JSON工件并核物理边界；不能使用失败时残留文件。 @lang en Reads unique JSON artifacts in the successful manifest after physical checks, never partial files from failed production. */
          const read=kind=>{
            const matches=result.artifacts.filter(item=>item.kind===kind);
            assert.equal(matches.length,1);
            const item=matches[0];
            assert(typeof item.path==="string" && !/[\\:%?#]/.test(item.path) && !path.isAbsolute(item.path) && !item.path.split("/").some(part=>!part || part==="." || part===".."));
            const file=path.join(destination,item.path);
            assert.equal(fs.realpathSync(file),file,"Artifact redirected.");
            assert(fs.lstatSync(file).isFile() && fs.lstatSync(file).nlink===1);
            const artifactBytes=fs.readFileSync(file);
            record.artifacts.push({kind,path:`${relative}/${item.path}`,sha256:createHash("sha256").update(artifactBytes).digest("hex")});
            return JSON.parse(artifactBytes);
          };
          record.integration=read("jsdoc-integration");
          const map=read("doc-source-map");
          assert.equal(record.integration.contract,"hia-jsdoc-integration");
          assert.equal(record.integration.contractVersion,"0.1.0");
          assert.equal(map.contractVersion,"1.1.0");
          assert.deepEqual(validateDocSourceMap(map),[]);
          const converted=convertJSDocIntegrationToHiaDocumentDetailed(record.integration,{documentId:`native-source-${documents.size}`,includeEmptySymbols:true});
          assert.deepEqual(converted.diagnostics.filter(item=>item.severity==="error"),[]);
          assert.deepEqual(validateHiaDocument(converted.document),[]);
          assertPublicRootOmission({integration:record.integration,map,document:converted.document},container);
          record.document=converted.document;
          record.warningCount=converted.diagnostics.filter(item=>item.severity==="warning").length;
          // <lang><zh-CN>核心工件是实际adapter转换结果，按唯一新文件写入，不冒充原生生产器已输出它。
          // </zh-CN><en>The core artifact is the actual adapter conversion, written as a unique new file without claiming native production emitted it.</en></lang>
          const coreBytes=Buffer.from(JSON.stringify(converted.document,null,2)+"\n");
          fs.writeFileSync(path.join(destination,"document.hia.json"),coreBytes,{flag:"wx"});
          record.artifacts.push({kind:"hia-document",path:`${relative}/document.hia.json`,sha256:createHash("sha256").update(coreBytes).digest("hex")});
        }
        documents.set(source,record);
      }
      const association=associateNativeJsdocBinding({binding,owner:pack.owner,outputs:[...documents.values()]});
      const row={package:pack.name,owner:pack.owner,sourceHead:pack.sourceHead,module:module.path,name:rootBinding.name,declarationName:binding.declarationName,...association};
      if(candidate.memberPath) memberRows.push({...row,memberPath:candidate.memberPath,expectedCallable:binding.isCallable,...(options.schemaResources?{originalDeclarations:binding.declarations}:{})});
      else rows.push(row);
      }
    }
  }
  // <lang><zh-CN>未注释历史模块、缺签名、类型入口与最终页面仍分别登记；位置关联不能冒称全部内容验收。
  // </zh-CN><en>Undocumented historical modules, missing signatures, type entries and final pages remain separately recorded; position association is not full content acceptance.</en></lang>
  const callableSignatureGaps=rows.filter(row=>row.status==="associated" && row.declarations.some(item=>item.isCallable&&!item.hasSignature)).map(row=>({package:row.package,module:row.module,name:row.name}));
  const callableBindings=rows.filter(row=>row.declarations.some(item=>item.isCallable)).length;
  const report={purpose:"satellite-native-declaration-association",requiredPackages:32,runtimeBindings:rows.length,associatedBindings:rows.filter(row=>row.status==="associated").length,blockedBindings:rows.filter(row=>row.status==="blocked").length,callableBindings,callableSignatureGaps,rows,sources:[...documents.values()].map(({integration,document,...record})=>record),pureTypeDeclarationBindings:packages.flatMap(pack=>pack.modules.flatMap(module=>module.exports.filter(binding=>binding.declarationTypeOnly).map(binding=>({package:pack.name,module:module.path,name:binding.name})))),coverageComplete:false,releaseProof:false,pending:[...(rows.some(row=>row.status==="blocked") ? ["missing-original-declarations"] : []),...(callableSignatureGaps.length ? ["callable-signature-projection"] : []),"nested-public-member-content","type-only-api-content","source-comment-and-translation-completeness","resource-and-command-content","generated-page-acceptance"]};
  if(options.includeMembers) {
    // <lang><zh-CN>已关联但缺正文/调用签名仍不算成员内容通过；数组等未展开边界保持显式未核。</zh-CN><en>Association alone cannot pass members without prose/callable signatures; unexpanded boundaries such as arrays remain explicitly unverified.</en></lang>
    const gaps=memberRows.filter(row=>row.status!=="associated"||row.declarations.some(item=>!item.hasText)||row.expectedCallable&&row.declarations.some(item=>!item.hasSignature));
    const callableRows=memberRows.filter(row=>row.expectedCallable);
    report.memberAudit={accessPaths:memberRows.length,associatedPaths:memberRows.filter(row=>row.status==="associated").length,contentGaps:gaps.length,callablePaths:callableRows.length,callableContentGaps:gaps.filter(row=>row.expectedCallable).length,rows:memberRows,boundaries:memberBoundaries,complete:gaps.length===0&&memberBoundaries.length===0};
    if(options.schemaResources) {
      // <lang><zh-CN>原生结果保留原状；实际数据审核另走固定生成链，不能用外部报告或成功标志替换。</zh-CN><en>Retain native results unchanged; actual data auditing uses a separate fixed production chain without external report/success-flag substitution.</en></lang>
      const schema=await auditSchemaResourceAssociations(container);
      report.schemaMemberAudit=adoptSchemaResourceMembers({memberRows,boundaries:memberBoundaries,schemaReport:schema.report,sourceRecords:[...documents.values()]});
      report.schemaMemberAudit.associationReportSha256=createHash("sha256").update(JSON.stringify(schema.report,null,2)+"\n").digest("hex");
      report.schemaMemberAudit.associationOutput=schema.output;
    }
  }
  if(options.arrayResources) {
    // <lang><zh-CN>显式采用本次实际B/A/JSONdoc结果，只消解根数组边界；原生与Schema结果分别保留。</zh-CN><en>Explicitly adopt current actual B/A/JSONdoc results to resolve root-array boundaries only, retaining native and Schema results separately.</en></lang>
    const arrays=await auditFrozenArrayResources(container);
    report.arrayMemberAudit=adoptFrozenArrayResources(report.schemaMemberAudit??report.memberAudit,arrays.report);
    report.arrayMemberAudit.arrayAssociationOutput=arrays.output;
  }
  assertPublicRootOmission(report,container);
  fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  return {report,output:path.relative(mainRoot,output).replaceAll("\\","/")};
}

// <lang><zh-CN>只有显式inspect才容许带缺口完成检查；默认门禁在任何阻断项存在时非零退出。
// </zh-CN><en>Only explicit inspection permits completion with gaps; the default gate exits nonzero when any binding is blocked.</en></lang>
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  assert(args.length>=2&&args.length<=6&&args[0]==="--workspace-root"&&new Set(args.slice(2)).size===args.length-2&&args.slice(2).every(arg=>["--inspect","--members","--schema-resources","--array-resources"].includes(arg))&&(!args.some(arg=>["--schema-resources","--array-resources"].includes(arg))||args.includes("--members")),"Expected --workspace-root with optional --members, --schema-resources, --array-resources and --inspect.");
  const {report,output}=await auditSatelliteNativeApi(path.resolve(args[1]),{includeMembers:args.includes("--members"),schemaResources:args.includes("--schema-resources"),arrayResources:args.includes("--array-resources")});
  console.log(JSON.stringify({runtimeBindings:report.runtimeBindings,associatedBindings:report.associatedBindings,blockedBindings:report.blockedBindings,callableBindings:report.callableBindings,signatureGaps:report.callableSignatureGaps.length,...(report.memberAudit?{memberPaths:report.memberAudit.accessPaths,memberContentGaps:report.memberAudit.contentGaps,memberBoundaries:report.memberAudit.boundaries.length}:{}),...(report.schemaMemberAudit?{schemaResourcePaths:report.schemaMemberAudit.schemaResourcePaths,combinedContentGaps:report.schemaMemberAudit.contentGaps,combinedBoundaries:report.schemaMemberAudit.boundaries.length,unverifiedSchemaBindings:report.schemaMemberAudit.unverifiedSchemaBindings}:{}),coverageComplete:false,output}));
  if(report.arrayMemberAudit) console.log(JSON.stringify({frozenArrayBindings:report.arrayMemberAudit.frozenArrayBindings,frozenArrayElements:report.arrayMemberAudit.frozenArrayElements,remainingBoundaries:report.arrayMemberAudit.boundaries.length,arrayAssociationOutput:report.arrayMemberAudit.arrayAssociationOutput}));
  const memberAudit=report.arrayMemberAudit??report.schemaMemberAudit??report.memberAudit;
  if((report.blockedBindings || report.callableSignatureGaps.length || memberAudit&&!memberAudit.complete) && !args.includes("--inspect")) process.exitCode=1;
}
