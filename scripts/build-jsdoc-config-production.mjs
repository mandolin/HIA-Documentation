/** @file @lang zh-CN 实际JSDoc配置JSON、B侧车及JSONdoc开发构建入口。 @lang en Development build entry for actual JSDoc config JSON, B sidecars and JSONdoc. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { producePlainDataModule } from "./lib/plain-data-production.mjs";
import { verifyPlainDataProduction } from "./lib/plain-data-production-verification.mjs";
import { inspectJsonResource, readJsonResourceBytes } from "./lib/json-resource-audit.mjs";
import { verifyJsonResourceProjection } from "./lib/json-resource-projection.mjs";
import { assertPublicRootOmission } from "./lib/core-package-api.mjs";
import { runDocumentationProducer } from "../packages/plugin-sdk/dist/index.js";
import { jsonDocumentationProducer } from "../packages/jsondoc/dist/index.js";
import { validateHiaDocument } from "../packages/core/dist/index.js";
import { createDocSourceMapIndex } from "../packages/source-linkage/dist/index.js";
import { JSDOC_CONFIG_EVIDENCE_PATH } from "./lib/jsdoc-config-evidence.mjs";

/**
 * @lang zh-CN 只读真实JSDoc定义，生成原生JSON/B并核A和JSONdoc；仅向本仓独立dist目录写入。
 * @lang en Reads real JSDoc definitions, produces native JSON/B and checks A plus JSONdoc, writing only to an isolated dist directory in this repository.
 * @param {string} workspaceRoot <lang><zh-CN>显式工作区容器根，内含HIA/hia-jsdoc。</zh-CN><en>Explicit workspace container root containing HIA/hia-jsdoc.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>确定性范围报告和相对输出目录；report.json最后写入作为完整验证标记。</zh-CN><en>Deterministic scoped report and relative output directory; report.json is written last as the complete-verification marker.</en></lang>
 * @throws {Error} <lang><zh-CN>缺定义、资源/证据冲突或任一实际生成检查失败。</zh-CN><en>Missing definitions, resource/evidence conflicts or any failed actual-production check.</en></lang>
 */
export async function buildJsdocConfigProduction(workspaceRoot) {
  const main = fileURLToPath(new URL("../",import.meta.url));
  const repository = path.join(workspaceRoot,"HIA/hia-jsdoc");
  const modulePath = "packages/jsdoc-runner/src/schema.mjs";
  const exportName = "HIA_JSDOC_CONFIG_JSON_SCHEMA";
  // <lang><zh-CN>固定资源仅作独立字节期望，生成器不会读取它来构造JSON。</zh-CN><en>Fixed resources supply independent byte expectations; the generator never reads them to construct JSON.</en></lang>
  const generated = producePlainDataModule(repository,modulePath,exportName,"schema.json");
  const expected = readJsonResourceBytes(repository,"packages/jsdoc-runner/schemas/hia-jsdoc-config-1.0.0.schema.json");
  assert(generated.artifact.equals(expected),"Generated current config resource differs.");
  const legacy = producePlainDataModule(repository,modulePath,"HIA_JSDOC_LEGACY_CONFIG_JSON_SCHEMA","legacy-schema.json");
  const legacyBytes = readJsonResourceBytes(repository,"packages/jsdoc-runner/schemas/hia-jsdoc-config-0.1.0-draft.schema.json");
  assert(legacy.artifact.equals(legacyBytes),"Native production changed the legacy config resource.");
  const verification = verifyPlainDataProduction(repository,modulePath,exportName,generated.evidence,generated.artifact);
  assert.equal(verification.status,"verified",JSON.stringify(verification));
  // <lang><zh-CN>每次重试使用独立目录；最终报告缺失的目录只表示未完成尝试。</zh-CN><en>Each retry uses an isolated directory; a directory lacking the final report represents an incomplete attempt.</en></lang>
  const output = fs.mkdtempSync(path.join(main,"dist/jsdoc-config-production-"));
  fs.writeFileSync(path.join(output,"schema.json"),generated.artifact,{flag:"wx"});
  fs.writeFileSync(path.join(output,"derivation-evidence.json"),JSON.stringify(generated.evidence,null,2)+"\n",{flag:"wx"});
  const result = await runDocumentationProducer(jsonDocumentationProducer,{workspaceRoot:output,outputDirectory:path.join(output,"jsondoc"),inputs:[{kind:"json-resource",path:"schema.json",locale:"und"}]});
  assert.equal(result.status,"success",JSON.stringify(result.diagnostics));
  assert.equal(result.artifacts.length,3);
  const produced = result.artifacts.map(artifact=>fs.readFileSync(path.join(output,"jsondoc",artifact.path)));
  const document = JSON.parse(produced[0]);
  const map = JSON.parse(produced[1]);
  assert.deepEqual(validateHiaDocument(document),[]);
  const indexed = createDocSourceMapIndex(map);
  assert.equal(indexed.status,"available");
  assert.deepEqual(indexed.diagnostics,[]);
  const audited = inspectJsonResource(generated.artifact);
  const projection = verifyJsonResourceProjection({...audited,source:"schema.json"},document,map,produced[2]);
  // <lang><zh-CN>另以真实包根生产可安装侧车，路径无需了解多仓布局，运行器源码保持只读。</zh-CN><en>Separately produce an installable sidecar at the actual package root, requiring no multi-repository layout knowledge and leaving runner source read-only.</en></lang>
  const packageRoot=path.join(repository,"packages/jsdoc-runner");
  const packaged=producePlainDataModule(packageRoot,"src/schema.mjs",exportName,"schemas/hia-jsdoc-config-1.0.0.schema.json");
  assert(packaged.artifact.equals(generated.artifact),"Package-root production differs.");
  const packagedVerification=verifyPlainDataProduction(packageRoot,"src/schema.mjs",exportName,packaged.evidence,packaged.artifact);
  assert.equal(packagedVerification.status,"verified");
  const packagedPath="package/"+JSDOC_CONFIG_EVIDENCE_PATH;
  fs.mkdirSync(path.dirname(path.join(output,packagedPath)),{recursive:true});
  fs.writeFileSync(path.join(output,packagedPath),JSON.stringify(packaged.evidence,null,2)+"\n",{flag:"wx"});
  // <lang><zh-CN>输出清单绑定本次实际字节，运行时版本与随机目录不进入确定性报告。</zh-CN><en>The output manifest binds actual bytes; runtime versions and random directories stay outside the deterministic report.</en></lang>
  const sha = bytes=>createHash("sha256").update(bytes).digest("hex");
  const jsondocPaths = result.artifacts.map(artifact=>"jsondoc/"+path.basename(artifact.path));
  assert.equal(new Set(jsondocPaths).size,3,"JSONdoc output names collide.");
  for (const [index,artifact] of result.artifacts.entries()) {
    // <lang><zh-CN>验证后在本次独立目录内移动单个文件，去掉生产器原子批次UUID，保留字节及同目录引用。</zh-CN><en>After verification, move individual files within this isolated directory to omit the producer's atomic-batch UUID, retaining bytes and sibling references.</en></lang>
    fs.renameSync(path.join(output,"jsondoc",artifact.path),path.join(output,jsondocPaths[index]));
  }
  const files = ["schema.json","derivation-evidence.json",...jsondocPaths,packagedPath].map(relative=>({path:relative,sha256:sha(fs.readFileSync(path.join(output,relative)))}));
  const report = {status:"verified",purpose:"jsdoc-config-native-production",definitionModule:modulePath,exportName,producer:generated.evidence.producer,evidenceOrigin:generated.evidence.evidenceOrigin,
    inputSources:generated.evidence.resources.filter(resource=>resource.kind==="source"),verification,jsondoc:projection,files,events:generated.evidence.details.produce.steps.length,
    legacyResource:{sha256:sha(legacyBytes),unchanged:true},packagedEvidence:{path:packagedPath,verification:packagedVerification},coverageComplete:false,releaseProof:false,
    pending:["native-member-gate-adoption","new-subpath-complete-api-generation","schema-reference-evaluation","generated-page-acceptance","W-P152-overall-acceptance"]};
  assertPublicRootOmission(report,workspaceRoot);
  fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  return {report,output:path.relative(main,output).replaceAll("\\","/")};
}

// <lang><zh-CN>命令必须由调用方显式提供工作区；不推断业务仓或输出位置。</zh-CN><en>The command requires a caller-supplied workspace, without inferring business repositories or output locations.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args.length===2 && args[0]==="--workspace-root","Expected --workspace-root <container>.");
  const result = await buildJsdocConfigProduction(path.resolve(args[1]));
  console.log(JSON.stringify({status:result.report.status,values:result.report.verification.values,events:result.report.events,files:result.report.files.length,output:result.output,coverageComplete:false}));
}
