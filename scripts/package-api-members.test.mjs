/** @lang zh-CN 嵌套成员独立审核的真实编译器拒绝反例；目标模块永不执行。 @lang en Real-compiler regressions for independent nested-member audits; target modules never execute. */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {collectModuleExports} from "./lib/package-api-inputs.mjs";

// <lang><zh-CN>夹具只写本owner的唯一忽略目录，保留供复核，不递归清理未知目录。</zh-CN><en>Fixtures occupy a unique ignored owner directory retained for review; no unknown directory is recursively removed.</en></lang>
const dist=fileURLToPath(new URL("../dist/",import.meta.url));
fs.mkdirSync(dist,{recursive:true});
const root=fs.mkdtempSync(path.join(dist,"api-members-test-"));
fs.writeFileSync(path.join(root,"package.json"),JSON.stringify({type:"module"}));
fs.writeFileSync(path.join(root,"value.mjs"),'export function original(value) {return value;}\n');
fs.writeFileSync(path.join(root,"entry.mjs"),'import {original as imported} from "./value.mjs";\nthrow new Error("Must never execute");\nexport const api = {nested: {renamed: imported}, imported, get dangerous(){throw new Error("getter executed");}, run(value = 1) {return value;}};\nexport {api as ALIAS};\nexport const values = [1, 2];\nexport const self = {}; self.again = self;\nexport const scalar = "value";\n');

/** @lang zh-CN 每次独立读取相同静态夹具，不执行模块或getter。 @lang en Reads the same static fixture independently without executing a module or getter. */
function audit(){return collectModuleExports(root,["entry.mjs"],{includeMembers:true})[0].exports;}

test("recursive object access paths retain original renamed and shorthand declarations",()=>{
  const binding=audit().find(item=>item.name==="api");
  const nested=binding.members.find(item=>item.memberPath.join(".")==="nested.renamed");
  assert.equal(nested.declarationName,"original");
  assert.equal(nested.declarations[0].path,"value.mjs");
  assert.equal(nested.isCallable,true);
  assert.equal(binding.members.find(item=>item.memberPath.join(".")==="imported").declarationName,"original");
});
test("aliases retain separate public paths without executing getters",()=>{
  const bindings=audit();
  assert.deepEqual(bindings.find(item=>item.name==="ALIAS").members,bindings.find(item=>item.name==="api").members);
  assert(bindings.find(item=>item.name==="api").members.some(item=>item.memberPath.join(".")==="dangerous"));
});
test("cycles and array element boundaries remain explicit rather than silently complete",()=>{
  const bindings=audit();
  assert(bindings.find(item=>item.name==="self").memberBoundaries.some(item=>item.reason==="recursive-type"));
  assert(bindings.find(item=>item.name==="values").memberBoundaries.some(item=>item.reason==="array-elements"));
});
test("primitive library properties are not invented as owned nested APIs",()=>{
  assert.deepEqual(audit().find(item=>item.name==="scalar").members,[]);
});
test("legacy inventory remains exactly free of optional member fields",()=>{
  assert(collectModuleExports(root,["entry.mjs"])[0].exports.every(item=>!Object.hasOwn(item,"members")&&!Object.hasOwn(item,"memberBoundaries")));
});

test("CommonJS namespace symbols never disclose compiler absolute module names",()=>{
  fs.writeFileSync(path.join(root,"tools.cjs"),'function run(value) {return value;} module.exports={run};');
  fs.writeFileSync(path.join(root,"entry.cjs"),'const tools=require("./tools.cjs"); exports.api={tools};');
  const binding=collectModuleExports(root,["entry.cjs"],{includeMembers:true})[0].exports.find(item=>item.name==="api");
  assert(!JSON.stringify(binding.members).replaceAll("\\\\","/").includes(root.replaceAll("\\","/")));
  assert.equal(binding.members.find(item=>item.memberPath.join(".")==="tools").declarationName,"tools");
  assert.equal(binding.members.find(item=>item.memberPath.join(".")==="tools.run").declarations[0].path,"tools.cjs");
});

test("depth exhaustion fails explicitly instead of returning a truncated success",()=>{
  fs.writeFileSync(path.join(root,"deep.mjs"),`export const deep=${"{next:".repeat(34)}1${"}".repeat(34)};`);
  assert.throws(()=>collectModuleExports(root,["deep.mjs"],{includeMembers:true}),/resource limit/i);
});

test("opaque object annotations and dynamic values cannot imply complete member coverage",()=>{
  fs.writeFileSync(path.join(root,"opaque.mjs"),'/** @type {object} */ export const opaque = {}; export const dynamic = JSON.parse("{}");');
  const bindings=collectModuleExports(root,["opaque.mjs"],{includeMembers:true})[0].exports;
  assert(bindings.find(item=>item.name==="opaque").memberBoundaries.some(item=>item.reason==="opaque-object-type"));
  assert(bindings.find(item=>item.name==="dynamic").memberBoundaries.some(item=>item.reason==="dynamic-type"));
});

test("runtime properties referencing declaration-only imports retain their actual assignment source",()=>{
  const dependency = path.join(root, "node_modules", "typed-runtime");
  fs.mkdirSync(dependency, {recursive: true});
  fs.writeFileSync(path.join(dependency, "package.json"), JSON.stringify({
    type: "module",
    exports: {".": {types: "./index.d.mts", default: "./index.mjs"}}
  }));
  fs.writeFileSync(path.join(dependency, "index.d.mts"), 'export declare const VERSION: "1.0.0";');
  fs.writeFileSync(path.join(dependency, "index.mjs"), 'throw new Error("Target must never execute"); export const VERSION = "1.0.0";');
  fs.writeFileSync(path.join(root, "declared.mjs"), 'import {VERSION} from "typed-runtime"; export const descriptor = {version: VERSION};');
  const binding = collectModuleExports(root, ["declared.mjs"], {includeMembers: true})[0].exports[0];
  const version = binding.members.find(member => member.memberPath.join(".") === "version");
  assert.equal(version.status, "resolved");
  assert.equal(version.declarationName, "version");
  assert.equal(version.declarations[0].path, "declared.mjs");
  assert.equal(version.declarations[0].kind, "PropertyAssignment");
});
