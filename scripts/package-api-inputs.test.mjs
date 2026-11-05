/** @lang zh-CN 包文档输入回归，特别防止重导出/条件/资源/bin遗漏及执行目标模块。 @lang en Package-documentation input regressions covering re-exports, conditions, resources, bins, and accidental target execution. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectPackageEntries, collectModuleExports } from "./lib/package-api-inputs.mjs";

// <lang lang="zh-CN">测试仅在本owner的忽略dist创建独立目录，不清理未知路径。</lang><lang lang="en">Tests create only unique ignored dist directories inside this owner, never cleaning unknown paths.</lang>
const dist = fileURLToPath(new URL("../dist/",import.meta.url));
fs.mkdirSync(dist,{recursive:true});
const root = fs.mkdtempSync(path.join(dist,"api-inputs-test-"));
fs.mkdirSync(path.join(root,"src/schemas"),{recursive:true});
fs.writeFileSync(path.join(root,"package.json"),JSON.stringify({type:"module"}));
fs.writeFileSync(path.join(root,"src/value.ts"),'/** public */ export const COUNT = 3; export interface Item { value: string; }');
fs.writeFileSync(path.join(root,"src/index.ts"),'export * from "./value.js"; export { COUNT as ALIAS } from "./value.js";');
fs.writeFileSync(path.join(root,"src/entry.mjs"),'throw new Error("Target must never execute"); export function run() {}');
fs.writeFileSync(path.join(root,"src/index.d.mts"),'export declare function run(): void;');
fs.writeFileSync(path.join(root,"src/schemas/example.json"),'{}');

test("retain every condition, schema resource, and bin separately",()=>{
  const entries=collectPackageEntries(root,{exports:{".":{types:"./src/index.d.mts",default:"./src/entry.mjs"},"./schemas/*":"./src/schemas/*"},bin:{demo:"src/entry.mjs"}});
  assert.equal(entries.length,4);
  assert.deepEqual(entries.map(entry=>entry.kind),["type-declaration","runtime-module","json-resource","command"]);
  assert.equal(entries[2].subpath,"./schemas/example.json");
  assert.deepEqual(entries[0].conditions,["types"]);
});
test("legacy main and explicit blocked exports are retained",()=>{
  assert.equal(collectPackageEntries(root,{main:"src/entry.mjs"})[0].channel,"main");
  assert.equal(collectPackageEntries(root,{exports:{"./private":null}})[0].kind,"blocked");
});
test("unsupported patterns, arrays, escapes, missing targets fail explicitly",()=>{
  for(const target of ["../outside.mjs","./src/../src/entry.mjs","./src/%65ntry.mjs","./src/*.mjs","./missing.mjs",["./src/entry.mjs"]]) assert.throws(()=>collectPackageEntries(root,{exports:{".":target}}));
});
test("compiler resolves root re-exports, aliases, and type-only names",()=>{
  const result=collectModuleExports(root,["src/index.ts"])[0];
  assert.deepEqual(result.exports.map(entry=>entry.name),["ALIAS","COUNT","Item"]);
  assert(result.exports.every(entry=>entry.declarations[0].path==="src/value.ts"));
  assert.equal(result.exports.find(entry=>entry.name==="COUNT").declarations[0].kind,"VariableDeclaration");
  assert.equal(result.exports.find(entry=>entry.name==="Item").declarationTypeOnly,true);
  assert.equal(result.exports.find(entry=>entry.name==="COUNT").declarationTypeOnly,false);
});
test("compiler inspection never executes a target with top-level effects",()=>{
  const result=collectModuleExports(root,["src/entry.mjs"])[0];
  assert.deepEqual(result.exports.map(entry=>entry.name),["run"]);
});
