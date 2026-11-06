/** @file @lang zh-CN 复用有限实际生产与独立A，为冻结字符串数组生成完整JSONdoc证据。 @lang en Reuses finite actual production and independent A to generate complete JSONdoc evidence for frozen string arrays. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {producePlainDataModule} from "./plain-data-production.mjs";
import {verifyPlainDataProduction} from "./plain-data-production-verification.mjs";
import {readStaticJsonExport,compareStaticJsonResource} from "./static-json-export.mjs";
import {inspectJsonResource} from "./json-resource-audit.mjs";
import {verifyJsonResourceProjection} from "./json-resource-projection.mjs";
import {assertPublicRootOmission} from "./core-package-api.mjs";
import {runDocumentationProducer} from "../../packages/plugin-sdk/dist/index.js";
import {jsonDocumentationProducer} from "../../packages/jsondoc/dist/index.js";
import {validateHiaDocument} from "../../packages/core/dist/index.js";
import {createDocSourceMapIndex} from "../../packages/source-linkage/dist/index.js";

/**
 * @lang zh-CN 为显式冻结字符串数组生产B、核独立A和公开绑定、实际生成逐值文档及地图；不执行入口模块。
 * @lang en Produces B for an explicit frozen string array, verifies independent A and its public binding, and actually generates per-value documentation/maps without executing entry modules.
 * @param {object} input <lang><zh-CN>授权根、公开模块/名称、纯定义模块及编译器原声明；必须唯一匹配。</zh-CN><en>Authorized root, public module/name, pure definition module and compiler declarations, which must match uniquely.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>五文件的完整范围报告与主仓相对输出目录；元素来源和JSON位置分别保留。</zh-CN><en>Scoped report for five files and a main-repository-relative output directory, retaining element origins separately from JSON locations.</en></lang>
 * @throws {Error} <lang><zh-CN>非冻结字符串数组、来源/绑定冲突、未知语法或实际生产失败；没有成功报告。</zh-CN><en>Nonfrozen/nonstring arrays, source/binding conflicts, unknown syntax or production failures yield no success report.</en></lang>
 */
export async function buildFrozenArrayResource({root,modulePath,exportName,definitionModule,declarations}) {
  // <lang><zh-CN>实际容器只由既有有限生产器创建；独立A另读原始定义和公开重导出链。</zh-CN><en>Only the existing finite producer creates native containers; independent A separately reads original definitions and the public re-export chain.</en></lang>
  const generated=producePlainDataModule(root,definitionModule,exportName,"array.json");
  assert(Array.isArray(generated.nativeValue)&&Object.isFrozen(generated.nativeValue)&&generated.nativeValue.every(value=>typeof value==="string"),"Expected a frozen string array.");
  const verification=verifyPlainDataProduction(root,definitionModule,exportName,generated.evidence,generated.artifact);
  assert.equal(verification.status,"verified");
  const linked=readStaticJsonExport(root,modulePath,exportName);
  assert.equal(linked.status,"available");
  const audited=inspectJsonResource(generated.artifact);
  assert.equal(compareStaticJsonResource(linked,audited).status,"equal");
  assert.equal(declarations?.length,1,"Array needs one compiler declaration.");
  const declaration=declarations[0];
  assert.equal(declaration.path,definitionModule);
  assert.equal(declaration.kind,"VariableDeclaration");
  assert(linked.nodes[0].valueDeclarationSources.some(source=>source.path===declaration.path&&source.kind===declaration.kind&&source.range.start.line===declaration.line&&source.range.start.column===declaration.column),"Public binding points to another declaration.");

  // <lang><zh-CN>所有写入限本主仓唯一dist目录；报告最后发布，失败目录不成为完成证据。</zh-CN><en>All writes stay in a unique owner dist directory; the report is published last so failed directories cannot establish completion.</en></lang>
  const main=fs.realpathSync(fileURLToPath(new URL("../../",import.meta.url)));
  const dist=path.join(main,"dist");
  fs.mkdirSync(dist,{recursive:true});
  assert.equal(fs.realpathSync(dist),dist);
  const output=fs.mkdtempSync(path.join(dist,"frozen-array-"));
  fs.writeFileSync(path.join(output,"array.json"),generated.artifact,{flag:"wx"});
  fs.writeFileSync(path.join(output,"derivation-evidence.json"),JSON.stringify(generated.evidence,null,2)+"\n",{flag:"wx"});
  const result=await runDocumentationProducer(jsonDocumentationProducer,{workspaceRoot:output,outputDirectory:path.join(output,"jsondoc"),inputs:[{kind:"json-resource",path:"array.json",locale:"und"}]});
  assert.equal(result.status,"success");
  assert.equal(result.artifacts.length,3);
  const bytes=result.artifacts.map(artifact=>fs.readFileSync(path.join(output,"jsondoc",artifact.path)));
  const document=JSON.parse(bytes[0]),map=JSON.parse(bytes[1]);
  assert.deepEqual(validateHiaDocument(document),[]);
  const indexed=createDocSourceMapIndex(map);
  assert.equal(indexed.status,"available");
  assert.deepEqual(indexed.diagnostics,[]);
  const projection=verifyJsonResourceProjection({...audited,source:"array.json"},document,map,bytes[2]);
  // <lang><zh-CN>每个元素由实际符号身份连接到独立原声明范围，重复值仍各占一个Pointer。</zh-CN><en>Each element connects an actual symbol identity to an independent original range; repeated values retain distinct pointers.</en></lang>
  const symbols=new Map(document.symbols.map(symbol=>[symbol.metadata.json.pointer,symbol]));
  const elements=linked.nodes.filter(node=>node.pointer!=="").map(node=>({pointer:node.pointer,value:node.value,symbolId:symbols.get(node.pointer).id,source:node.origin}));
  assert.equal(elements.length,generated.nativeValue.length);
  const jsondocPaths=result.artifacts.map(artifact=>"jsondoc/"+path.basename(artifact.path));
  assert.equal(new Set(jsondocPaths).size,3);
  for(const [index,artifact]of result.artifacts.entries()) fs.renameSync(path.join(output,"jsondoc",artifact.path),path.join(output,jsondocPaths[index]));
  // <lang><zh-CN>摘要绑定本次实际字节，报告不包含绝对根或随机批次路径。</zh-CN><en>Digests bind actual bytes while the report omits absolute roots and random batch paths.</en></lang>
  const files=["array.json","derivation-evidence.json",...jsondocPaths].map(relative=>({path:relative,sha256:createHash("sha256").update(fs.readFileSync(path.join(output,relative))).digest("hex")}));
  const report={status:"verified",module:modulePath,name:exportName,definitionModule,declarations,sources:linked.sources,verification,values:projection.values,elements,files,frozen:true,wrapperRuntime:false,producerAuthenticity:false,coverageComplete:false,releaseProof:false};
  assertPublicRootOmission(report,root);
  fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  return {report,output:path.relative(main,output).split(path.sep).join("/")};
}
