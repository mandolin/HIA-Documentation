/**
 * @file
 * @lang zh-CN 静态声明数据审核的别名、精度及拒绝边界回归，夹具绝不被执行。
 * @lang en Alias, precision and rejection regressions for static declaration-data audits; fixtures are never executed.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readStaticJsonExport, compareStaticJsonResource } from "./lib/static-json-export.mjs";
import { inspectJsonResource } from "./lib/json-resource-audit.mjs";

const roots = [];
/**
 * @lang zh-CN 创建只供静态读取的隔离模块根，带显式抛错以发现意外执行。
 * @lang en Creates an isolated module root for static reads, with an explicit throw to detect accidental execution.
 * @param {string} source <lang><zh-CN>声明夹具。</zh-CN><en>Declaration fixture.</en></lang>
 * @returns {string} <lang><zh-CN>临时授权根。</zh-CN><en>Temporary authorized root.</en></lang>
 */
function fixture(source) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "hia-static-json-")));
  roots.push(root);
  fs.writeFileSync(path.join(root, "index.mjs"), source + '\nthrow new Error("Must never execute");\n');
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
    assert(path.basename(root).startsWith("hia-static-json-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reads constants, freeze, spreads, arrays and Object.values without module execution", () => {
  const root = fixture('const kinds=Object.freeze({a:"A",b:"B"}); const base={type:"string"}; export const DATA=Object.freeze({$id:"urn:test",properties:{x:{...base,minLength:1}},enum:Object.values(kinds)});');
  const result = readStaticJsonExport(root, "index.mjs", "DATA");
  assert.equal(result.status, "available");
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), {$id:"urn:test",properties:{x:{type:"string",minLength:1}},enum:["A","B"]});
  const expected = inspectJsonResource('{"enum":["A","B"],"properties":{"x":{"minLength":1,"type":"string"}},"$id":"urn:test"}');
  assert.equal(compareStaticJsonResource(result, expected).status, "equal");
  assert(result.nodes.every(node => node.origin.path === "index.mjs" && node.origin.range.start.line > 0));
});

test("retains named, namespace and star re-export evidence for historical aliases", () => {
  const root = fixture('import * as historical from "./old.mjs"; export const OLD=historical.DATA; export {DATA as CURRENT} from "./new.mjs";');
  fs.writeFileSync(path.join(root,"old.mjs"),'export const DATA={$id:"urn:old",value:1};');
  fs.writeFileSync(path.join(root,"new.mjs"),'export * from "./actual.mjs";');
  fs.writeFileSync(path.join(root,"actual.mjs"),'export const DATA={$id:"urn:new",value:2};');
  const old = readStaticJsonExport(root,"index.mjs","OLD");
  const current = readStaticJsonExport(root,"index.mjs","CURRENT");
  assert.equal(old.value.$id,"urn:old"); assert.equal(current.value.$id,"urn:new");
  assert(old.sources.some(source=>source.path==="old.mjs"));
  assert(current.sources.some(source=>source.path==="actual.mjs"));
  assert.equal(compareStaticJsonResource(old,inspectJsonResource('{"$id":"urn:new","value":2}')).status,"different");
});

test("same schema id cannot hide changed values or array order", () => {
  const root=fixture('export const DATA={$id:"urn:test",required:["a","b"],limit:2};');
  const value=readStaticJsonExport(root,"index.mjs","DATA");
  for (const json of ['{"$id":"urn:test","required":["b","a"],"limit":2}','{"$id":"urn:test","required":["a","b"],"limit":3}']) assert.equal(compareStaticJsonResource(value,inspectJsonResource(json)).status,"different");
});

test("rejects dynamic calls, getters, mutable bindings, cycles and builtin shadows", () => {
  for (const source of ['export const DATA=run();','export const DATA={get secret(){throw new Error("getter");}};','let DATA={x:1}; export {DATA};','const a=b; const b=a; export {a as DATA};','const Object={freeze(value){return value;}}; export const DATA=Object.freeze({x:1});']) {
    const root=fixture(source);
    assert.equal(readStaticJsonExport(root,"index.mjs","DATA").status,"unverified");
  }
});

test("keeps structural-looking keys as data and rejects prototype-setter syntax", () => {
  const root=fixture('export const DATA={["__proto__"]:{constructor:1},"a/b~c":{"":false}};');
  const result=readStaticJsonExport(root,"index.mjs","DATA");
  assert.equal(result.status,"available");
  assert(result.nodes.some(node=>node.pointer==="/a~1b~0c/"));
  assert.equal(compareStaticJsonResource(result,inspectJsonResource('{"__proto__":{"constructor":1},"a/b~c":{"":false}}')).status,"equal");
  const unsafe=fixture('export const DATA={__proto__:{secret:1}};');
  assert.equal(readStaticJsonExport(unsafe,"index.mjs","DATA").status,"unverified");
});

test("does not round resource numbers into a false match", () => {
  const root=fixture('export const DATA={x:1};');
  const result=readStaticJsonExport(root,"index.mjs","DATA");
  assert.notEqual(compareStaticJsonResource(result,inspectJsonResource('{"x":0.999999999999999999999999}')).status,"equal");
  assert.equal(compareStaticJsonResource(result,inspectJsonResource('{"x":1e0}')).status,"equal");
  const large=fixture('export const DATA={x:9007199254740993};');
  assert.equal(readStaticJsonExport(large,"index.mjs","DATA").status,"unverified");
});

test("refuses external imports, hard links and directory redirects", () => {
  const root=fixture('export {DATA} from "../private.mjs";');
  assert.equal(readStaticJsonExport(root,"index.mjs","DATA").status,"unverified");
  fs.linkSync(path.join(root,"index.mjs"),path.join(root,"shared.mjs"));
  assert.equal(readStaticJsonExport(root,"index.mjs","DATA").status,"unverified");
});

test("reads explicit JSON imports with original resource positions", () => {
  const root=fixture('import data from "./value.json" with {type:"json"}; export const DATA=Object.freeze(data);');
  fs.writeFileSync(path.join(root,"value.json"),'{"$id":"urn:json","const":[false,1]}');
  const result=readStaticJsonExport(root,"index.mjs","DATA");
  assert.equal(result.status,"available");
  assert.equal(compareStaticJsonResource(result,inspectJsonResource('{"$id":"urn:json","const":[false,1]}')).status,"equal");
  assert(result.nodes.every(node=>node.origin.path==="value.json"));
});

test("keeps clone/update graphs explicitly outside initializer-only proof", () => {
  const root=fixture('const shared={type:"string"}; const OLD={a:shared,b:shared}; const next=structuredClone(OLD); next.a.value=1; next.b={...next.b,value:2}; export const DATA=Object.freeze(next); export {OLD};');
  const current=readStaticJsonExport(root,"index.mjs","DATA");
  assert.equal(current.status,"unverified");
  assert.equal(current.reason,"top-level-data-update");
});

test("rejects updates to shared original data and pre-AST excessive nesting", () => {
  const root=fixture('const DATA={a:1}; DATA.a=2; export {DATA};');
  assert.equal(readStaticJsonExport(root,"index.mjs","DATA").status,"unverified");
  const deep=fixture('export const DATA='+'['.repeat(129)+'0'+']'.repeat(129)+';');
  assert.equal(readStaticJsonExport(deep,"index.mjs","DATA").reason,"source-syntax-budget");
});

test("leaves dynamic, alias, deleted and post-freeze clone mutations unverified", () => {
  for(const source of ['const next=structuredClone({a:1}); next["a"]=2; export const DATA=Object.freeze(next);','const next=structuredClone({a:1}); delete next.a; export const DATA=Object.freeze(next);','const next=structuredClone({a:1}); const alias=next; alias.a=2; export const DATA=Object.freeze(next);','const next=structuredClone({a:1}); export const DATA=Object.freeze(next); next.a=2;']) {
    assert.equal(readStaticJsonExport(fixture(source),"index.mjs","DATA").status,"unverified");
  }
});

test("does not apply owned-copy mutation rules to foreign subgraphs", () => {
  const root=fixture('const OLD={a:1}; const next=structuredClone({}); next.foreign=OLD; next.foreign.a=2; export const DATA=Object.freeze(next);');
  assert.equal(readStaticJsonExport(root,"index.mjs","DATA").status,"unverified");
});

test("rejects builtin replacement and cyclic data updates", () => {
  for(const source of ['Object.values=other; export const DATA=Object.values({a:1});','const next=structuredClone({}); next.self=next; export const DATA=Object.freeze(next);']) assert.equal(readStaticJsonExport(fixture(source),"index.mjs","DATA").status,"unverified");
});

test("uses JavaScript numeric property keys and refuses global builtin replacement", () => {
  const root=fixture('const keys={1e1:"ten",2:"two",a:"A"}; export const DATA={values:Object.values(keys),keys:Object.keys(keys)};');
  const value=readStaticJsonExport(root,"index.mjs","DATA");
  assert.equal(compareStaticJsonResource(value,inspectJsonResource('{"values":["two","ten","A"],"keys":["2","10","a"]}')).status,"equal");
  const replaced=fixture('globalThis.Object=other; export const DATA=Object.values({a:1});');
  assert.equal(readStaticJsonExport(replaced,"index.mjs","DATA").status,"unverified");
});

test("retains actual variable-alias declarations separately from field positions", () => {
  const root=fixture('export const ID="urn:test";\nexport const DATA={$id:ID};');
  const result=readStaticJsonExport(root,"index.mjs","DATA");
  const field=result.nodes.find(node=>node.pointer==="/$id");
  assert.equal(field.declaration.range.start.line,2);
  assert.equal(field.valueDeclarationSources[0].kind,"VariableDeclaration");
  assert.equal(field.valueDeclarationSources[0].range.start.line,1);
  assert.equal(field.valueDeclarationSources[0].range.start.column,14);
});

test("rejects directory redirects and type-only imports used as values", () => {
  const root=fixture('export const DATA={a:1};');
  fs.mkdirSync(path.join(root,"real"));
  fs.writeFileSync(path.join(root,"real/values.mjs"),'export const DATA={a:1};');
  fs.symlinkSync(path.join(root,"real"),path.join(root,"redirect"),process.platform==="win32"?"junction":"dir");
  assert.equal(readStaticJsonExport(root,"redirect/values.mjs","DATA").status,"unverified");
  fs.writeFileSync(path.join(root,"entry.mts"),'import type {DATA as imported} from "./real/values.mjs"; export const DATA=imported;');
  assert.equal(readStaticJsonExport(root,"entry.mts","DATA").status,"unverified");
});

test("preserves JSON key coordinates after literal Unicode separators", () => {
  const root=fixture('import json from "./value.json" with {type:"json"}; export const DATA=json;');
  const text='{"a":"x\u2028y", "b":1}';
  fs.writeFileSync(path.join(root,"value.json"),text);
  const result=readStaticJsonExport(root,"index.mjs","DATA");
  const field=result.nodes.find(node=>node.pointer==="/b");
  assert.equal(field.declaration.range.start.line,1);
  assert.equal(field.declaration.range.start.column,text.indexOf('"b"')+1);
});
