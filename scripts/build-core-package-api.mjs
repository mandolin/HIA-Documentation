/**
 * @lang zh-CN 以显式44包审计为期望，通过通用项目生产器生成12个核心包模块API；不执行被文档化模块。
 * @lang en Generate module APIs for the 12 core packages through the generic project producer against an explicit 44-package audit, without executing documented modules.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {fileURLToPath,pathToFileURL} from "node:url";
import {runDocumentationProducer} from "../packages/plugin-sdk/dist/index.js";
import {validateHiaDocument} from "../packages/core/dist/index.js";
import {validateDocSourceMap} from "../packages/source-linkage/dist/index.js";
import {createOfficialTsDocProjectProfileSet,getOfficialTsDocProjectProfile} from "../packages/profiles/dist/index.js";
import {auditRequiredPackages} from "./audit-required-package-api.mjs";
import {verifyProjectApiProjection,assertPublicRootOmission,writeCoreApiReport} from "./lib/core-package-api.mjs";

/**
 * @lang zh-CN 从调用者明确授权的工作区加载HIA自有生产器，输出只在主仓dist；独立审计不替代生成。
 * @lang en Load the HIA-owned producer from a caller-authorized workspace and write only main-repo dist output; independent auditing never replaces generation.
 * @param {string} workspaceRoot - 包含main-repo/HIA的容器。 Container holding main-repo/HIA.
 * @returns {Promise<object>} 本轮模块生成/逐字段校验与剩余范围报告，非44包完成或发行证明。 Module generation/field-check and remaining-scope report, not 44-package completion or release proof.
 * @throws {Error} 身份、来源、生成、字段或实际核心验证失败。 Invalid identity/source, generation, field preservation or actual core validation.
 */
export async function buildCorePackageApi(workspaceRoot) {
  // <lang><zh-CN>仅接受当前主仓所属容器，防止参数把输出或工具加载跳转到另一个同名目录。</zh-CN><en>Accept only this main repository's container so arguments cannot redirect output or tool loading into another identically named directory.</en></lang>
  const mainRoot=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
  const container=fs.realpathSync(workspaceRoot);
  assert.equal(fs.realpathSync(path.join(container,"main-repo")),mainRoot,"Workspace must own this main repository.");
  const producerRoot=fs.realpathSync(path.join(container,"HIA/hia-tsdoc"));
  const producerRelative=path.relative(container,producerRoot);
  assert(!producerRelative.startsWith("..") && !path.isAbsolute(producerRelative),"Producer source leaves the workspace.");
  // <lang><zh-CN>只加载已授权HIA工具模块；目标包仅由编译器静态读取，不通过import执行。
  // </zh-CN><en>Load only the authorized HIA tool module; target packages are read statically by the compiler, never imported for execution.</en></lang>
  const {tsdocProjectProducer}=await import(pathToFileURL(path.join(producerRoot,"packages/tsdoc-producer/src/index.mjs")));
  const {readTsJsDocBridgeArtifact}=await import(pathToFileURL(path.join(producerRoot,"packages/ts-jsdoc-bridge/src/index.mjs")));
  const inventory=auditRequiredPackages(container);
  const packages=inventory.packages.filter(item=>item.owner==="main-repo");
  assert.equal(packages.length,12,"Expected all twelve core packages.");
  // <lang><zh-CN>显式选择新TS规范，不修改旧默认集合；声明必须与实际生产器输出的精确契约对应。</zh-CN><en>Explicitly select the new TS profile without mutating legacy defaults; its declarations must match actual producer output contracts.</en></lang>
  const profile=getOfficialTsDocProjectProfile();
  assert.deepEqual(createOfficialTsDocProjectProfileSet().diagnostics,[]);
  const outputDirectory=path.join(mainRoot,"dist/core-package-api");
  const inputs=packages.map(pack=>({kind:"typescript-project",paths:pack.modules.map(module=>module.path),artifactBasePath:`packages/${pack.name.slice(1).replaceAll("/","--")}`,title:pack.name}));
  const result=await runDocumentationProducer(tsdocProjectProducer,{workspaceRoot:mainRoot,outputDirectory,inputs,profileIds:["ts-jsdoc-bridge"]});
  assert.equal(result.status,"success",JSON.stringify(result.diagnostics));
  assert.equal(result.artifacts.length,packages.length*4,"Every core group must have four actual artifacts.");
  const rows=[];
  for(const [index,pack] of packages.entries()) {
    // <lang><zh-CN>只读本轮成功清单登记的文件，再跑协议、实际核心及完整字段/来源对比。</zh-CN><en>Read only files registered by this successful run, then check protocols, actual core validation and complete fields/sources.</en></lang>
    const base=inputs[index].artifactBasePath;
    const artifacts=result.artifacts.filter(item=>item.path.startsWith(base+"."));
    assert.equal(artifacts.length,4);
    const read=kind=>{
      const item=artifacts.find(candidate=>candidate.kind===kind);
      assert(item,"Missing generated artifact kind.");
      const role=kind==="tsdoc-extraction" ? "consumes" : "produces";
      assert(profile.contracts.some(ref=>ref.name===item.contract && ref.version===item.contractVersion && ref.role===role),"Profile/producer contract mismatch.");
      return JSON.parse(fs.readFileSync(path.join(outputDirectory,item.path),"utf8"));
    };
    const extraction=read("tsdoc-extraction");
    const bridge=readTsJsDocBridgeArtifact(read("ts-jsdoc-bridge"));
    const document=read("hia-document");
    const map=read("doc-source-map");
    assert.deepEqual(validateHiaDocument(document),[]);
    assert.deepEqual(validateDocSourceMap(map),[]);
    assert.equal(bridge.artifact,null);
    assert.deepEqual(map.sourceMaps,[]);
    assertPublicRootOmission({extraction,bridge,document,map},container);
    const checks=verifyProjectApiProjection({modules:pack.modules,extraction,document,bridge});
    // <lang><zh-CN>HEAD仅是仓库参考点，逐声明文件摘要固定实际读取的工作树字节，不把未提交状态伪称为提交内容。</zh-CN><en>HEAD is only a repository reference; declaration-file digests fix actual worktree bytes without claiming uncommitted files belong to that commit.</en></lang>
    const sourceFiles=[...new Set(pack.modules.flatMap(module=>[module.path,...module.exports.flatMap(symbol=>symbol.declarations.map(declaration=>declaration.path).filter(Boolean))]))].sort();
    const sourceDigests=sourceFiles.map(file=>({path:file,sha256:createHash("sha256").update(fs.readFileSync(path.join(mainRoot,file))).digest("hex")}));
    const auditedResources=pack.entries.filter(entry=>entry.kind==="json-resource").map(entry=>{
      const bytes=fs.readFileSync(path.join(mainRoot,pack.directory,entry.target));
      JSON.parse(bytes.toString("utf8"));
      return {subpath:entry.subpath,target:entry.target,sha256:createHash("sha256").update(bytes).digest("hex")};
    });
    rows.push({name:pack.name,sourceHead:pack.sourceHead,manifestSha256:pack.manifestSha256,sourceDigests,auditedResources,modules:pack.modules.map(module=>module.path),artifacts,...checks});
  }
  // <lang><zh-CN>资源/bin仅在独立审计中登记，不能混算成符号/页面已完成；其它32包必须保持开放。</zh-CN><en>Resources/bins are inventory-only and cannot count as completed symbols/pages; the other 32 packages remain open.</en></lang>
  const report={purpose:"core-package-api-generation-verification",scope:"twelve-core-package-modules",requiredPackages:44,generatedPackages:rows.length,remainingPackages:inventory.packages.filter(pack=>pack.owner!=="main-repo").map(pack=>pack.name),profile:{profileId:profile.profileId,profileVersion:profile.profileVersion,schemaVersion:profile.schemaVersion},producer:result.producer,rows,summary:{bindings:rows.reduce((sum,row)=>sum+row.bindings,0),symbols:rows.reduce((sum,row)=>sum+row.symbols,0),i18nFields:rows.reduce((sum,row)=>sum+row.i18nFields,0),artifacts:result.artifacts.length,auditedResourceOrCommandEntries:packages.flatMap(pack=>pack.entries).filter(entry=>["json-resource","command"].includes(entry.kind)).length},pending:["resource-and-command-page-acceptance","remaining-32-package-chains","complete-source-comment-and-translation-review","generated-page-visual-and-interaction-acceptance"],releaseProof:false};
  // <lang><zh-CN>摘要写入本owner忽略目录，重建不清理未知文件；只有本轮清单可作为当轮成功依据。</zh-CN><en>Write the report into this owner's ignored directory without deleting unknown files; only this run's manifest establishes current success.</en></lang>
  writeCoreApiReport(outputDirectory,report);
  return report;
}

// <lang><zh-CN>显式命令只接受工作区根，不开放任意输出路径或隐式扫描/目标执行。</zh-CN><en>The explicit command accepts only a workspace root, without arbitrary output paths, implicit scanning or target execution.</en></lang>
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  if(args.length!==2 || args[0]!=="--workspace-root") throw new Error("Expected --workspace-root only.");
  const report=await buildCorePackageApi(path.resolve(args[1]));
  console.log(JSON.stringify({generatedPackages:report.generatedPackages,remainingPackages:report.remainingPackages.length,...report.summary}));
}
