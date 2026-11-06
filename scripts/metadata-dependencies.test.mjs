/** @file @lang zh-CN 显式首方元数据依赖的授权、导出及物理边界回归。 @lang en Authorization, export and physical-boundary regressions for explicit first-party metadata dependencies. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import {createMetadataDependencyPolicy} from "./lib/metadata-dependencies.mjs";
import {producePlainDataModule} from "./lib/plain-data-production.mjs";
import {verifyPlainDataProduction} from "./lib/plain-data-production-verification.mjs";
import {buildDescriptorResource} from "./lib/frozen-array-resource.mjs";
import {collectModuleExports} from "./lib/package-api-inputs.mjs";
import {adoptDescriptorResources} from "./audit-descriptor-resources.mjs";
import {readStaticJsonExport} from "./lib/static-json-export.mjs";
import {readStaticJsonInitializationGraph} from "./lib/static-initialization-graph.mjs";

/** @lang zh-CN 创建唯一自有夹具，metadata代码不得由解析器执行。 @lang en Creates a unique owned fixture whose metadata code must never be executed by the resolver. */
function fixture(exports={"./metadata":"./src/metadata.mjs"}) {
  const root=fs.mkdtempSync(fileURLToPath(new URL("../dist/metadata-policy-",import.meta.url)));
  fs.mkdirSync(path.join(root,"packages/runner/src"),{recursive:true});
  const manifest={name:"@hia-doc/runner",version:"1.0.0",type:"module",exports};
  fs.writeFileSync(path.join(root,"packages/runner/package.json"),JSON.stringify(manifest));
  fs.writeFileSync(path.join(root,"packages/runner/src/metadata.mjs"),'throw new Error("Resolver must never execute");');
  fs.writeFileSync(path.join(root,"packages/runner/src/metadata.d.mts"),'export declare const VERSION: "1.0.0";');
  const grant={name:manifest.name,version:manifest.version,root:"packages/runner",subpaths:["./metadata"]};
  return {root,grant,manifest};
}

test("defaults have no package authority and explicit grants bind actual manifest bytes",()=>{
  const input=fixture();
  assert.equal(createMetadataDependencyPolicy(input.root,{}),undefined);
  const policy=createMetadataDependencyPolicy(input.root,{authorizedPackages:[input.grant]});
  assert.equal(policy.resolve("@hia-doc/runner/metadata","entry.mjs"),"packages/runner/src/metadata.mjs");
  assert.equal(policy.manifests.length,1);
  assert.equal(policy.resolutions.length,1);
  assert.equal(policy.resolutions[0].version,"1.0.0");
});

test("runtime default is distinct from its types declaration",()=>{
  const input=fixture({"./metadata":{types:"./src/metadata.d.mts",default:"./src/metadata.mjs"}});
  const policy=createMetadataDependencyPolicy(input.root,{authorizedPackages:[input.grant]});
  assert.equal(policy.resolve("@hia-doc/runner/metadata","entry.mjs"),"packages/runner/src/metadata.mjs");
  assert.deepEqual(policy.resolutions[0].conditions,["default"]);
});

test("unlisted packages, roots and versions never gain authority from a specifier",()=>{
  const input=fixture();
  for(const grant of [{...input.grant,version:"2.0.0"},{...input.grant,name:"@hia-doc/other"},{...input.grant,root:"../outside"}]) {
    assert.throws(()=>createMetadataDependencyPolicy(input.root,{authorizedPackages:[grant]}).resolve("@hia-doc/runner/metadata","entry.mjs"));
  }
  const policy=createMetadataDependencyPolicy(input.root,{authorizedPackages:[input.grant]});
  for(const name of ["node:fs","@hia-doc/runner","@hia-doc/runner/other","@hia-doc/other/metadata","@hia-doc/runner/metadata%2fother"]) assert.throws(()=>policy.resolve(name,"entry.mjs"));
});

test("unknown conditions, wildcards, declaration targets and traversal remain unsupported",()=>{
  for(const exports of [{"./metadata":{import:"./src/metadata.mjs",default:"./src/metadata.mjs"}},{"./*":"./src/*.mjs"},{"./metadata":"./src/metadata.d.mts"},{"./metadata":"../outside.mjs"},{"./metadata":["./src/metadata.mjs"]}]) {
    const input=fixture(exports);
    assert.throws(()=>createMetadataDependencyPolicy(input.root,{authorizedPackages:[input.grant]}).resolve("@hia-doc/runner/metadata","entry.mjs"));
  }
});

test("duplicate grants and changing manifests cannot create ambiguous cached authority",()=>{
  const input=fixture();
  assert.throws(()=>createMetadataDependencyPolicy(input.root,{authorizedPackages:[input.grant,input.grant]}));
  const policy=createMetadataDependencyPolicy(input.root,{authorizedPackages:[input.grant]});
  policy.resolve("@hia-doc/runner/metadata","entry.mjs");
  fs.writeFileSync(path.join(input.root,"packages/runner/package.json"),JSON.stringify({...input.manifest,description:"changed"}));
  assert.throws(()=>policy.resolve("@hia-doc/runner/metadata","entry.mjs"));
});

test("pure-module production and independent A require the same explicit authority",()=>{
  const input=fixture();
  fs.writeFileSync(path.join(input.root,"packages/runner/src/metadata.mjs"),'export const KINDS=Object.freeze(["one","two"]);');
  fs.writeFileSync(path.join(input.root,"entry.mjs"),'import {KINDS} from "@hia-doc/runner/metadata"; export const DATA=Object.freeze({inputKinds:[...KINDS]});');
  const options={authorizedPackages:[input.grant]};
  assert.throws(()=>producePlainDataModule(input.root,"entry.mjs","DATA","data.json"));
  const generated=producePlainDataModule(input.root,"entry.mjs","DATA","data.json",options);
  assert.equal(generated.evidence.resources.filter(row=>row.path.endsWith("package.json")).length,1);
  const verified=verifyPlainDataProduction(input.root,"entry.mjs","DATA",generated.evidence,generated.artifact,options);
  assert.equal(verified.status,"verified");
  assert.deepEqual(generated.dependencyResolutions,verified.dependencyResolutions);
  assert.equal(verifyPlainDataProduction(input.root,"entry.mjs","DATA",generated.evidence,generated.artifact).status,"rejected");
});

test("caller grant changes and hard-linked targets cannot widen an existing policy",()=>{
  const input=fixture();
  const policy=createMetadataDependencyPolicy(input.root,{authorizedPackages:[input.grant]});
  input.grant.version="2.0.0";
  assert.equal(policy.resolve("@hia-doc/runner/metadata","entry.mjs"),"packages/runner/src/metadata.mjs");
  fs.linkSync(path.join(input.root,"packages/runner/src/metadata.mjs"),path.join(input.root,"linked.mjs"));
  assert.throws(()=>policy.resolve("@hia-doc/runner/metadata","entry.mjs"));
});

test("actual descriptor JSONdoc follows runtime metadata and exact re-export declarations",async()=>{
  const input=fixture({"./metadata":{types:"./src/metadata.d.mts",default:"./src/metadata.mjs"}});
  fs.writeFileSync(path.join(input.root,"packages/runner/src/metadata.mjs"),'export const KINDS=Object.freeze(["first","second"]);');
  fs.writeFileSync(path.join(input.root,"descriptor.mjs"),'import {KINDS} from "@hia-doc/runner/metadata"; export const fixtureProducerDescriptor=Object.freeze({contract:"documentation-producer",contractVersion:"1.0.0",id:"fixture",version:"1.0.0",displayName:"Fixture",inputKinds:[...KINDS],outputKinds:["artifact"],capabilities:{sourceLinkage:false,incremental:false,watch:false}});');
  fs.writeFileSync(path.join(input.root,"entry.mjs"),'throw new Error("Root must never execute"); export {fixtureProducerDescriptor} from "./descriptor.mjs";');
  const binding=collectModuleExports(input.root,["entry.mjs"])[0].exports[0];
  const result=await buildDescriptorResource({root:input.root,modulePath:"entry.mjs",exportName:binding.name,definitionModule:"descriptor.mjs",declarations:binding.declarations,options:{authorizedPackages:[input.grant]}});
  assert.equal(result.report.status,"verified");
  assert.equal(result.report.files.length,5);
  assert(result.report.members.some(node=>node.pointer==="/inputKinds/1"&&node.symbolId));
  assert.equal(result.report.dependencyResolutions.length,1);
});

test("descriptor adoption preserves missing, failed and ambiguous public paths",()=>{
  const boundary={package:"fixture",module:"entry.mjs",name:"alias",reason:"array-elements",memberPath:["descriptor","inputKinds"]};
  const base={contentGaps:0,boundaries:[boundary]};
  const row={...boundary,status:"verified"};
  const options={paths:[row],unverifiedDescriptors:0,unverifiedPaths:0};
  assert.equal(adoptDescriptorResources(base,options).resolvedDescriptorBoundaries.length,1);
  for(const paths of [[],[row,row],[{...row,status:"unverified"}]]) assert.deepEqual(adoptDescriptorResources(base,{...options,paths}).boundaries,[boundary]);
  assert.deepEqual(base.boundaries,[boundary]);
});

test("explicit runtime mode reads mjs bytes while legacy readers keep declaration selection",()=>{
  const input=fixture();
  fs.writeFileSync(path.join(input.root,"data.mjs"),'export const VALUE=1;');
  fs.writeFileSync(path.join(input.root,"data.d.mts"),'export declare const VALUE: 1;');
  fs.writeFileSync(path.join(input.root,"entry.mjs"),'export {VALUE} from "./data.mjs";');
  for(const reader of [readStaticJsonExport,readStaticJsonInitializationGraph]) {
    assert.equal(reader(input.root,"entry.mjs","VALUE").status,"unverified");
    const actual=reader(input.root,"entry.mjs","VALUE",{authorizedPackages:[]});
    assert.equal(actual.status,"available");
    assert.equal(actual.value,1);
    assert(actual.sources.some(source=>source.path==="data.mjs"));
    assert(actual.sources.every(source=>!source.path.endsWith(".d.mts")));
  }
});

test("metadata cycles and changed authorization bytes stay rejected after production",()=>{
  const input=fixture();
  const file=path.join(input.root,"packages/runner/src/metadata.mjs");
  fs.writeFileSync(file,'export const KINDS=Object.freeze(["one"]);');
  fs.writeFileSync(path.join(input.root,"entry.mjs"),'import {KINDS} from "@hia-doc/runner/metadata"; export const DATA=[...KINDS];');
  const options={authorizedPackages:[input.grant]};
  const generated=producePlainDataModule(input.root,"entry.mjs","DATA","data.json",options);
  fs.writeFileSync(path.join(input.root,"packages/runner/package.json"),JSON.stringify({...input.manifest,version:"2.0.0"}));
  assert.equal(verifyPlainDataProduction(input.root,"entry.mjs","DATA",generated.evidence,generated.artifact,options).status,"rejected");
  fs.writeFileSync(path.join(input.root,"packages/runner/package.json"),JSON.stringify(input.manifest));
  fs.writeFileSync(file,'import {KINDS as existing} from "@hia-doc/runner/metadata"; export const KINDS=[...existing];');
  assert.throws(()=>producePlainDataModule(input.root,"entry.mjs","DATA","data.json",options));
  assert.equal(readStaticJsonInitializationGraph(input.root,"entry.mjs","DATA",options).status,"unverified");
});
