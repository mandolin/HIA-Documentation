/** @lang zh-CN 嵌套成员独立审核的真实编译器拒绝反例；目标模块永不执行。 @lang en Real-compiler regressions for independent nested-member audits; target modules never execute. */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {collectModuleExports} from "./lib/package-api-inputs.mjs";
import {collectStaticMemberDeclarations} from "./lib/package-api-members.mjs";
import ts from "typescript";

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

test("inferred and annotated boolean primitives have no object-member expansion boundary",()=>{
  // <lang><zh-CN>真实编译器将boolean编码为true/false联合；声明位置仍由独立成员清单保留。</zh-CN><en>The real compiler encodes boolean as a true/false union; the independent member inventory must still retain declaration positions.</en></lang>
  fs.writeFileSync(path.join(root,"booleans.mts"), 'throw new Error("Must never execute"); export const flags = {enabled: true, disabled: false}; export declare const flag: boolean; export declare const pair: true | false; export declare const annotated: {enabled: boolean};');
  const bindings=collectModuleExports(root,["booleans.mts"],{includeMembers:true})[0].exports;
  for(const name of ["flags","flag","pair","annotated"]) {
    assert.deepEqual(bindings.find(item=>item.name===name).memberBoundaries,[],name);
  }
  const flags=bindings.find(item=>item.name==="flags");
  assert.deepEqual(flags.members.map(item=>item.memberPath),[["disabled"],["enabled"]]);
  assert(flags.members.every(item=>item.status==="resolved"&&item.declarations[0].path==="booleans.mts"));
});

test("boolean-containing mixed unions and literal unions retain composite boundaries",()=>{
  // <lang><zh-CN>布尔原语修正不得放行含对象分支或其它标量分支的真实联合。</zh-CN><en>The boolean-primitive correction must not admit genuine unions containing object or other scalar alternatives.</en></lang>
  fs.writeFileSync(path.join(root,"unions.mts"), 'export declare const objectChoice: boolean | {nested: string}; export declare const scalarChoice: boolean | string; export declare const literals: "a" | "b"; export declare const nested: {choice: boolean | {next: number}};');
  const bindings=collectModuleExports(root,["unions.mts"],{includeMembers:true})[0].exports;
  for(const name of ["objectChoice","scalarChoice","literals"]) {
    assert.deepEqual(bindings.find(item=>item.name===name).memberBoundaries,[{memberPath:[],reason:"composite-type"}],name);
  }
  assert.deepEqual(bindings.find(item=>item.name==="nested").memberBoundaries,[{memberPath:["choice"],reason:"composite-type"}]);
});

test("object intersections and branded boolean intersections remain unverified",()=>{
  // <lang><zh-CN>附带成员的交叉类型仍需单独设计，不按布尔字面分支或对象成员数量猜测覆盖。</zh-CN><en>Member-bearing intersections still need separate design; neither boolean-literal branches nor property counts establish coverage.</en></lang>
  fs.writeFileSync(path.join(root,"intersections.mts"), 'export declare const combined: {left: string} & {right: number}; export declare const branded: boolean & {readonly tag: "flag"};');
  const bindings=collectModuleExports(root,["intersections.mts"],{includeMembers:true})[0].exports;
  for(const name of ["combined","branded"]) {
    assert.deepEqual(bindings.find(item=>item.name===name).memberBoundaries,[{memberPath:[],reason:"composite-type"}],name);
  }
});

test("explicit declared arrays retain CommonJS slot identities and old member boundaries", () => {
  // <lang><zh-CN>目标顶层抛错用于证明清单不执行模块，重复引用须保留不同槽位。</zh-CN><en>A top-level throw proves the inventory does not execute modules; repeated references retain separate slots.</en></lang>
  fs.writeFileSync(path.join(root,"micro.cjs"),'throw new Error("DO_NOT_RUN"); module.exports={name:"micro", run(event, context){return event;}};');
  fs.writeFileSync(path.join(root,"array.cjs"),'const micro=require("./micro.cjs"); const plugins=[micro,micro]; exports.api={plugins};');
  const old=collectModuleExports(root,["array.cjs"],{includeMembers:true})[0].exports[0];
  const current=collectModuleExports(root,["array.cjs"],{includeMembers:true,includeDeclaredArrays:true})[0].exports[0];
  assert.deepEqual(current.members,old.members);
  assert.deepEqual(current.memberBoundaries,old.memberBoundaries);
  assert.equal(current.declaredArrays[0].scope,"declared-array-initializer");
  assert.equal(current.declaredArrays[0].slots.length,2);
  assert.equal(current.declaredArrayMembers[0].declarationName,"exports");
  assert.equal(current.declaredArrayMembers[0].declarationLongname,"module.exports");
  assert.deepEqual(current.declaredArrayMembers.map(row=>row.memberPath),[["plugins","0"],["plugins","0","name"],["plugins","0","run"],["plugins","1"],["plugins","1","name"],["plugins","1","run"]]);
  assert(current.declaredArrayMembers.filter(row=>row.isCallable).every(row=>row.declarations[0].path==="micro.cjs"));
  assert(!Object.hasOwn(old,"declaredArrays"));
});

test("declared arrays reject holes, spreads, calls, primitive slots and mutable bindings", () => {
  for(const [name,statement]of [
    ["hole","const plugins=[micro,,micro]"],
    ["spread","const plugins=[...micro]"],
    ["call","const plugins=[micro()]"],
    ["primitive","const plugins=[42]"],
    ["mutable","let plugins=[micro]"],
    ["wrapped","const plugins=Object.freeze([micro])"]
  ]){
    // <lang><zh-CN>每个拒绝输入单独编译，固定原数组边界且没有部分槽位通过。</zh-CN><en>Compile each rejected input independently, retaining its original array boundary with no partially accepted slots.</en></lang>
    const file=`array-${name}.cjs`;
    fs.writeFileSync(path.join(root,file),`const micro=require("./micro.cjs"); ${statement}; exports.api={plugins};`);
    const binding=collectModuleExports(root,[file],{includeMembers:true,includeDeclaredArrays:true})[0].exports[0];
    assert.deepEqual(binding.declaredArrays,[],name);
    assert.deepEqual(binding.declaredArrayMembers,[],name);
    assert(binding.memberBoundaries.length>0,name);
  }
});

test("declared arrays enforce slot budgets and reject external or ambiguous object sources", () => {
  fs.writeFileSync(path.join(root,"array-large.cjs"),`const micro=require("./micro.cjs");const plugins=[${Array(129).fill("micro").join(",")}]; exports.api={plugins};`);
  assert.throws(()=>collectModuleExports(root,["array-large.cjs"],{includeMembers:true,includeDeclaredArrays:true}),/resource limit/);
  fs.mkdirSync(path.join(root,"node_modules/foreign"),{recursive:true});
  fs.writeFileSync(path.join(root,"node_modules/foreign/index.js"),'module.exports={run(){}}');
  fs.writeFileSync(path.join(root,"array-foreign.cjs"),'const micro=require("foreign");const plugins=[micro];exports.api={plugins};');
  const binding=collectModuleExports(root,["array-foreign.cjs"],{includeMembers:true,includeDeclaredArrays:true})[0].exports[0];
  assert.deepEqual(binding.declaredArrays,[]);
  assert(binding.memberBoundaries.some(row=>row.reason==="array-elements"));
});

test("ambiguous exports, spreads, getters, duplicate keys and shadowed require stay unverified", () => {
  for(const [name,objectSource,entryPrefix]of [
    ["ambiguous",'module.exports={run(){}};module.exports={other(){}};',""],
    ["spread",'module.exports={...{name:"value"},run(){}};',""],
    ["getter",'module.exports={get run(){throw new Error("DO_NOT_RUN")}};',""],
    ["duplicate",'module.exports={name:"first",name:"second",run(){}};',""],
    ["shadowed",'module.exports={run(){}};','const actual=require; function require(value){return actual(value);}'],
    ["annotation",'module.exports={run(){}};','/** @type {typeof import("./micro.cjs")} */'],
    ["prototype",'module.exports={__proto__:{},run(){}};',""],
    ["module-shadow",'const module={};module.exports={run(){}};',""]
  ]){
    // <lang><zh-CN>未知对象形状和伪require分别保留原边界，任何getter或钩子都不执行。</zh-CN><en>Unknown object shapes and fake require retain their original boundaries; neither getters nor hooks execute.</en></lang>
    const file=`object-${name}.cjs`,entry=`entry-${name}.cjs`;
    fs.writeFileSync(path.join(root,file),objectSource);
    fs.writeFileSync(path.join(root,entry),`${entryPrefix} const micro=require("./${file}");const plugins=[micro];exports.api={plugins};`);
    const binding=collectModuleExports(root,[entry],{includeMembers:true,includeDeclaredArrays:true})[0].exports[0];
    assert.deepEqual(binding.declaredArrays,[],name);
    assert(binding.memberBoundaries.length>0,name);
  }
});

test("cached compiler declarations cannot cover an array edited after parsing", () => {
  // <lang><zh-CN>编译器缓存旧槽位后清空实际文件中的数组，复现构建期间编辑导致的来源错配。</zh-CN><en>Clear the on-disk array after the compiler caches a slot, reproducing source mismatch during a build.</en></lang>
  const file=path.join(root,"array-edited.cjs");
  fs.writeFileSync(path.join(root,"micro-cached.cjs"),'module.exports={name:"cached",run(){}};');
  fs.writeFileSync(file,'const micro=require("./micro-cached.cjs");const plugins=[micro];exports.api={plugins};');
  const program=ts.createProgram([file],{allowJs:true,noEmit:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext});
  const checker=program.getTypeChecker();
  const source=program.getSourceFile(file);
  const symbol=checker.getExportsOfModule(checker.getSymbolAtLocation(source))[0];
  checker.getTypeOfSymbolAtLocation(symbol,symbol.valueDeclaration??source);
  fs.writeFileSync(file,'const micro=require("./micro-cached.cjs");const plugins=[];exports.api={plugins};');
  const result=collectStaticMemberDeclarations({checker,symbol,source,root,includeDeclaredArrays:true});
  assert.deepEqual(result.declaredArrays,[]);
  assert(result.memberBoundaries.some(row=>row.reason==="array-elements"));
});
