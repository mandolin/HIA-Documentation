/**
 * @file
 * @lang zh-CN 从本工作区已授权TypeScript owner同步五份独立schema，支持只读一致性检查。
 * @lang en Synchronizes five separate schemas from this workspace's authorized TypeScript owner, with read-only consistency checking.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createHash} from "node:crypto";

// <lang><zh-CN>同步只加载固定首方owner工具，调用参数不能替换实现或注入其它模块。</zh-CN><en>Synchronization loads the fixed first-party owner only; arguments cannot substitute implementations or inject modules.</en></lang>
assert(process.argv.length===2||process.argv.length===3&&process.argv[2]==="--check");
const check=process.argv.includes("--check");
const main=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
const owner=path.join(path.dirname(main),"HIA/hia-tsdoc/packages/tsdoc-spec/src/index.mjs");
assert.equal(fs.realpathSync(owner),owner);
const spec=await import(pathToFileURL(owner));
const schemas=[spec.TSDOC_EXTRACTION_JSON_SCHEMA,spec.TSDOC_PROJECT_EXTRACTION_JSON_SCHEMA,spec.TSDOC_PROJECT_BRIDGE_JSON_SCHEMA,spec.TSDOC_STRUCTURED_EXTRACTION_JSON_SCHEMA,spec.TSDOC_STRUCTURED_BRIDGE_JSON_SCHEMA];
const directory=path.join(main,"packages/schemas/src");
const entries=[];
for(const schema of schemas) {
  const key=schema.properties.contract.const+"-"+schema.properties.contractVersion.const;
  const filename=key+".json";
  const bytes=JSON.stringify(schema,null,2)+"\n";
  const target=path.join(directory,"tsdoc-project",filename);
  if(check) assert.equal(fs.readFileSync(target,"utf8"),bytes);
  else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
  entries.push({key,contractVersion:schema.properties.contractVersion.const,ownerPackage:"@hia-doc/tsdoc-spec",path:"./tsdoc-project/"+filename,schemaId:schema.$id,publicUrl:schema.$id,sha256:createHash("sha256").update(bytes).digest("hex"),stability:"draft"});
}
const catalog=JSON.stringify({catalogVersion:"0.1.0-draft",publicBaseUrl:"https://mandolin.github.io/HIA-Documentation/schemas/",schemas:entries},null,2)+"\n";
const target=path.join(directory,"tsdoc-project-catalog.json");
if(check) assert.equal(fs.readFileSync(target,"utf8"),catalog);
else fs.writeFileSync(target,catalog);
console.log(`TypeScript project schemas ${check?"checked":"synchronized"}: ${entries.length}.`);
