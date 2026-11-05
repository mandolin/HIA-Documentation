/**
 * @lang zh-CN 通过真实 JSDoc/SDK 对32个卫星包执行解析与映射预检；成功不等于公开API语义覆盖。
 * @lang en Probe parsing and maps for 32 satellite packages through real JSDoc/SDK; success is not public API semantic coverage.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath,pathToFileURL} from "node:url";
import {runDocumentationProducer} from "../packages/plugin-sdk/dist/index.js";
import {validateDocSourceMap} from "../packages/source-linkage/dist/index.js";
import {validateHiaDocument} from "../packages/core/dist/index.js";
import {convertJSDocIntegrationToHiaDocumentDetailed} from "../packages/parser-jsdoc/dist/index.js";
import {auditRequiredPackages} from "./audit-required-package-api.mjs";
import {assertPublicRootOmission} from "./lib/core-package-api.mjs";

/**
 * @lang zh-CN 静态核对实际文件边界后读工件，拒绝绝对路径、联接和硬链接；不承诺并发换向防护。
 * @lang en Read artifacts after static file-boundary checks, refusing absolute paths, redirects and hard links; no concurrent-swap guarantee.
 * @param {string} root - 已创建的规范根。 Existing canonical root.
 * @param {string} relative - 生产器登记的相对路径。 Relative path registered by the producer.
 * @returns {Buffer} 原字节。 Original bytes.
 */
function readOwnedFile(root,relative) {
  assert(typeof relative==="string" && relative.length>0 && !/[\\:%?#]/.test(relative) && !path.isAbsolute(relative) && !relative.split("/").some(part=>!part || part==="." || part===".."),"Unsafe generated artifact path.");
  // <lang><zh-CN>核物理路径及文件链接数，不能仅按词法路径接受旧产物。</zh-CN><en>Check physical paths and link counts rather than accepting old artifacts by lexical paths alone.</en></lang>
  const file=path.join(root,relative);
  const state=fs.lstatSync(file);
  assert(state.isFile() && !state.isSymbolicLink() && state.nlink===1,"Artifact is not an unlinked regular file.");
  assert.equal(path.relative(root,fs.realpathSync(file)).replaceAll("\\","/"),relative,"Artifact leaves its output root.");
  return fs.readFileSync(file);
}

/**
 * @lang zh-CN 对本工作区的固定32包运行真实JSDoc，不导入被文档化的目标包；输出为唯一新目录。
 * @lang en Run real JSDoc for this workspace's fixed 32 packages without importing documented targets; output uses a unique new directory.
 * @param {string} workspaceRoot - 含main-repo和HIA的已授权容器。 Authorized container holding main-repo and HIA.
 * @returns {Promise<object>} 解析/映射与核心读取报告；不代表完整覆盖或发行许可。 Parsing/map/core-read report, not full coverage or release permission.
 * @throws {Error} 边界、生成、映射或核心读取失败。 Boundary, generation, map or core-read failure.
 */
export async function probeSatellitePackageApi(workspaceRoot) {
  // <lang><zh-CN>只接受本主仓容器和真实工具仓；不接受任意生产器路径或目标命令。</zh-CN><en>Accept only this main repository's container and real tool repositories, never arbitrary producer paths or target commands.</en></lang>
  const mainRoot=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
  const container=fs.realpathSync(workspaceRoot);
  assert.equal(fs.realpathSync(path.join(container,"main-repo")),mainRoot,"Workspace must own this main repository.");
  const tool=path.join(container,"HIA/hia-jsdoc/packages/jsdoc-producer/src/index.mjs");
  const plugin=path.join(container,"HIA/jsdoc-plugin-hia-sys/src/index.cjs");
  for(const file of [tool,plugin]) assert.equal(path.relative(container,fs.realpathSync(file)),path.relative(container,file),"Tool path is redirected.");
  const {jsdocProducer}=await import(pathToFileURL(tool));
  const inventory=auditRequiredPackages(container);
  const packages=inventory.packages.filter(item=>item.owner!=="main-repo");
  assert.equal(packages.length,32,"Expected all 32 satellite packages.");
  // <lang><zh-CN>确认dist物理根后创建唯一输出，旧成功文件不能混入本轮结果；不清理未知产物。
  // </zh-CN><en>Create unique output after confirming the physical dist root so old successful files cannot enter this run; never clean unknown artifacts.</en></lang>
  const dist=path.join(mainRoot,"dist");
  fs.mkdirSync(dist,{recursive:true});
  assert.equal(path.relative(dist,fs.realpathSync(dist)),"","Output root is redirected.");
  const output=fs.mkdtempSync(path.join(dist,"satellite-api-probe-"));
  const rows=[];
  for(const pkg of packages) {
    // <lang><zh-CN>JavaScript和CommonJS入口由独立审核提供；声明文件、资源和命令内容不混算为符号覆盖。
    // </zh-CN><en>Independent auditing supplies JavaScript/CommonJS entries; declarations, resources and command content never count as symbol coverage.</en></lang>
    const modules=pkg.modules.filter(item=>/\.(mjs|cjs|js)$/.test(item.path));
    assert(modules.length>0,"Package has no JavaScript implementation entry.");
    const slug=pkg.name.replaceAll("@","").replaceAll("/","-");
    const packageOutput=path.join(output,slug);
    const inputs=modules.map(item=>({kind:item.path.endsWith(".mjs") ? "javascript-module" : "javascript-source",path:`HIA/${pkg.owner}/${item.path}`}));
    const sourceDigests=inputs.map(input=>({path:input.path,sha256:createHash("sha256").update(readOwnedFile(container,input.path)).digest("hex")}));
    const result=await runDocumentationProducer(jsdocProducer,{
      workspaceRoot:container,outputDirectory:packageOutput,inputs,profileIds:["jsdoc"],
      options:{mode:"hiaIntegration",plugin:{pluginPath:plugin},hia:{docSourceMap:{enabled:true},i18n:{enabled:true,defaultLocale:"en",fallbackLocale:"en",locales:["en","zh-CN"]}}}
    });
    assert.equal(result.status,"success",`Native JSDoc failed for ${pkg.name}; inspect trusted local tooling diagnostics.`);
    const artifacts=result.artifacts.map(artifact=>({kind:artifact.kind,path:artifact.path,sha256:createHash("sha256").update(readOwnedFile(packageOutput,artifact.path)).digest("hex")}));
    // <lang><zh-CN>只读取本轮成功清单中的唯一工件，保持integration旧身份及地图独立版本。
    // </zh-CN><en>Read unique artifacts from this successful manifest only, preserving the legacy integration identity and independent map version.</en></lang>
    const read=kind=>{
      const matches=artifacts.filter(item=>item.kind===kind);
      assert.equal(matches.length,1,"Missing or duplicate generated artifact kind.");
      return JSON.parse(readOwnedFile(packageOutput,matches[0].path));
    };
    const integration=read("jsdoc-integration");
    const map=read("doc-source-map");
    assert.equal(integration.contract,"hia-jsdoc-integration");
    assert.equal(integration.contractVersion,"0.1.0");
    assert.equal(map.contractVersion,"1.1.0");
    assert.deepEqual(validateDocSourceMap(map),[]);
    const converted=convertJSDocIntegrationToHiaDocumentDetailed(integration,{documentId:slug,includeEmptySymbols:true});
    assert.deepEqual(converted.diagnostics.filter(item=>item.severity==="error"),[]);
    assert.deepEqual(validateHiaDocument(converted.document),[]);
    assertPublicRootOmission({integration,map,document:converted.document},container);
    rows.push({name:pkg.name,owner:pkg.owner,sourceHead:pkg.sourceHead,manifestSha256:pkg.manifestSha256,sourceDigests,artifacts,producer:result.producer,nativeStatus:result.status,integrationNodes:integration.ir.nodes.length,coreSymbols:converted.document.symbols.length,adapterWarningCount:converted.diagnostics.filter(item=>item.severity==="warning").length,coverageStatus:"pending-semantic-review",auditedRuntimeBindings:modules.reduce((sum,item)=>sum+item.exports.length,0),declarationEntries:pkg.modules.filter(item=>/\.d\.(ts|mts|cts)$/.test(item.path)).map(item=>item.path)});
  }
  // <lang><zh-CN>明确区分解析通过与覆盖待验；汇总不复制原始诊断/机器根，唯一新文件不覆盖旧报告。
  // </zh-CN><en>Separate passing parsing from pending coverage; the summary excludes raw diagnostics/machine roots and its unique new file never overwrites prior reports.</en></lang>
  const report={purpose:"satellite-native-jsdoc-probe",packageCount:rows.length,rows,coverageComplete:false,releaseProof:false,pending:["public-export-to-original-declaration-and-comment-verification","declaration-file-api-content","resources-and-command-content","generated-page-acceptance"]};
  assertPublicRootOmission(report,container);
  fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  return {report,output:path.relative(mainRoot,output).replaceAll("\\","/")};
}

// <lang><zh-CN>显式命令不接受任意输出或待执行包命令。</zh-CN><en>The explicit command accepts neither arbitrary output nor target commands to execute.</en></lang>
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  assert(args.length===2 && args[0]==="--workspace-root","Expected --workspace-root only.");
  const {report,output}=await probeSatellitePackageApi(path.resolve(args[1]));
  console.log(JSON.stringify({packageCount:report.packageCount,coverageComplete:report.coverageComplete,output}));
}
