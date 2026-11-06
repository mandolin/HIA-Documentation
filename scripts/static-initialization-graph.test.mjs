/**
 * @file
 * @lang zh-CN 有限初始化图的身份、时序、来源和拒绝回归。目标模块仅静态读取。
 * @lang en Identity, ordering, provenance and rejection regressions for finite initialization graphs. Target modules are read statically only.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readStaticJsonInitializationGraph } from "./lib/static-initialization-graph.mjs";
import { compareStaticJsonResource, readStaticJsonExport } from "./lib/static-json-export.mjs";
import { inspectJsonResource } from "./lib/json-resource-audit.mjs";

// <lang><zh-CN>仅保存本套件创建的临时物理根，清理前再次验证边界。</zh-CN><en>Retain only temporary physical roots created by this suite, checking their boundary again before cleanup.</en></lang>
const roots = [];
/**
 * @lang zh-CN 建立受控源码集合，只供审核器读取。
 * @lang en Creates controlled source collections for auditor reads only.
 * @param {Record<string,string>} files <lang><zh-CN>固定夹具路径和正文。</zh-CN><en>Fixed fixture paths and contents.</en></lang>
 * @returns {string} <lang><zh-CN>临时物理仓库根。</zh-CN><en>Temporary physical repository root.</en></lang>
 */
function fixture(files) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "hia-init-graph-")));
  roots.push(root);
  for (const [relative, text] of Object.entries(files)) fs.writeFileSync(path.join(root, relative), text);
  return root;
}
/**
 * @lang zh-CN 读取默认夹具导出，输出普通JSON值便于独立断言。
 * @lang en Reads the default fixture export, exposing plain JSON values for independent assertions.
 * @param {string} source <lang><zh-CN>手工受控模块正文。</zh-CN><en>Hand-controlled module contents.</en></lang>
 * @returns {object} <lang><zh-CN>审核结果。</zh-CN><en>Audit result.</en></lang>
 */
function read(source) {
  return readStaticJsonInitializationGraph(fixture({ "index.mjs": source }), "index.mjs", "DATA");
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
    assert(path.basename(root).startsWith("hia-init-graph-"));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// <lang><zh-CN>两个Pointer必须体现同一对象的后续写入，同时隔离原图。</zh-CN><en>Both pointers must reflect later writes to their shared object while isolating the original graph.</en></lang>
test("clone retains internal sharing and isolates the original graph", () => {
  const result = read('const p={v:1}; const old=Object.freeze({a:p,b:p}); const next=structuredClone(old); next.a.v=2; export const DATA={old,next};');
  assert.equal(result.status, "available");
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), { old: { a: { v: 1 }, b: { v: 1 } }, next: { a: { v: 2 }, b: { v: 2 } } });
  const a = result.nodes.find(node => node.pointer === "/next/a");
  const b = result.nodes.find(node => node.pointer === "/next/b");
  assert.equal(a.graphNodeId, b.graphNodeId);
  assert.equal(result.runtimeStateVerified, false);
  assert.equal(result.evidenceKind, "static-definition-initialization");
  assert(result.events.some(event => event.kind === "clone"));
});

test("live export aliases observe later assignments and shallow freeze", () => {
  const result = read('const root={child:{v:1}}; export const DATA=Object.freeze(root); const alias=root.child; alias.v=3;');
  assert.equal(result.status, "available");
  assert.equal(result.value.child.v, 3);
  assert(result.nodes.find(node => node.pointer === "/child/v").writeSources.length > 0);
});

test("spread creates independent default shells and preserves nested sharing", () => {
  const result = read('const p={type:"string",nested:{v:1}}; const old={a:p,b:p,c:p}; const next=structuredClone(old); next.a={...next.a,default:"."}; next.b={...next.b,default:"dist"}; next.a.nested.v=4; export const DATA={old,next};');
  assert.equal(result.status, "available");
  assert.equal(result.value.next.a.default, ".");
  assert.equal(result.value.next.b.default, "dist");
  assert.equal(result.value.next.c.default, undefined);
  assert.equal(result.value.next.c.nested.v, 4);
  assert.equal(result.value.old.a.nested.v, 1);
  assert.equal(result.events.filter(event => event.kind === "spread").length, 2);
});

test("clone resets frozen property attributes", () => {
  const result = read('const old=Object.freeze({v:1}); const next=structuredClone(old); next.v=2; export const DATA=next;');
  assert.equal(result.status, "available");
  assert.equal(result.value.v, 2);
});

test("ordered replacement retains old references and reports final write provenance", () => {
  const result = read('const before={v:1}; const root={child:before};\nroot.child={v:9};\nbefore.v=2;\nexport const DATA={root,before};');
  assert.equal(result.status, "available");
  assert.equal(result.value.root.child.v, 9);
  assert.equal(result.value.before.v, 2);
  const value = result.nodes.find(node => node.pointer === "/before/v");
  assert.equal(value.writeSources.at(-1).range.start.line, 3);
  assert(value.valueDeclarationSources.some(source => source.range.start.line === 1));
});

test("imports are read-only owners and clones receive local ownership", () => {
  const root = fixture({ "base.mjs": 'const p={v:1}; export const BASE=Object.freeze({a:p,b:p});', "index.mjs": 'import {BASE} from "./base.mjs"; const next=structuredClone(BASE); next.a.v=2; export const DATA=next;' });
  const result = readStaticJsonInitializationGraph(root, "index.mjs", "DATA");
  assert.equal(result.status, "available");
  assert.equal(result.value.b.v, 2);
  assert.equal(result.sources.length, 2);
});

test("reexport linkage is separate from wrapper initialization", () => {
  const root = fixture({ "base.mjs": 'export const DATA={v:1};', "index.mjs": 'export {DATA} from "./base.mjs"; throw new Error("must never execute");' });
  const result = readStaticJsonInitializationGraph(root, "index.mjs", "DATA");
  assert.equal(result.status, "available");
  assert.equal(result.definitionModule, "base.mjs");
  assert.equal(result.linkage.length, 1);
  assert.equal(result.linkage[0].runtimeStateVerified, false);
});

test("strict JSON imports reuse physical JSON provenance", () => {
  const root = fixture({ "data.json": '{"v":1,"text":"a\u2028b"}', "index.mjs": 'import source from "./data.json" with {type:"json"}; const next=structuredClone(source); next.v=2; export const DATA=next;' });
  const result = readStaticJsonInitializationGraph(root, "index.mjs", "DATA");
  assert.equal(result.status, "available");
  assert.equal(result.value.v, 2);
  assert.equal(result.nodes.find(node => node.pointer === "/text").origin.range.start.line, 1);
});

test("enumerates numeric keys in ECMAScript order and preserves array spreads", () => {
  const result = read('const obj={b:1,"10":2,"2":3,a:4}; const vals=Object.values(obj); export const DATA={keys:Object.keys(obj),vals:[0,...vals]};');
  assert.equal(result.status, "available");
  assert.deepEqual(result.value.keys, ["2", "10", "b", "a"]);
  assert.deepEqual(result.value.vals, [0, 3, 2, 1, 4]);
});

// <lang><zh-CN>每个固定反例独立建根，未知行为须保持安全未核。</zh-CN><en>Each fixed counterexample gets an independent root; unknown behavior must remain safely unverified.</en></lang>
for (const [name, source, reason] of [
  ["frozen own property write", 'const x=Object.freeze({v:1}); x.v=2; export const DATA=x;', "frozen-property-write"],
  ["frozen object extension", 'const x=Object.freeze({}); x.v=2; export const DATA=x;', "frozen-property-write"],
  ["dynamic assignment", 'const x={v:1}; const k="v"; x[k]=2; export const DATA=x;', "unsupported-write-target"],
  ["delete", 'const x={v:1}; delete x.v; export const DATA=x;', "unsupported-top-level-statement"],
  ["compound update", 'const x={v:1}; x.v+=2; export const DATA=x;', "unsupported-top-level-statement"],
  ["side-effectful right value", 'const x={v:1}; x.v=(x.v=2,3); export const DATA=x;', "unsupported-expression"],
  ["unreferenced unknown call", 'const unused=unknown(); export const DATA={};', "unsupported-call"],
  ["accessor", 'const x={get v(){throw new Error("never")}}; export const DATA=structuredClone(x);', "non-data-property"],
  ["shadowed builtin", 'const structuredClone=()=>({}); export const DATA=structuredClone({});', "unsupported-expression"],
  ["hoisted builtin shadow", 'export const DATA=structuredClone({}); function structuredClone(){}', "shadowed-builtin"],
  ["array writes", 'const x=[]; x.length=1; export const DATA=x;', "unsupported-write-target"],
  ["JSON graph cycle", 'const x={}; x.self=x; export const DATA=x;', "cyclic-json-value"],
  ["unsafe integer", 'export const DATA={v:9007199254740993};', "number-outside-exact-integer-scope"],
  ["prototype setter", 'export const DATA={__proto__:{v:1}};', "unsafe-property-key"],
  ["TDZ", 'export const DATA=x; const x={};', "uninitialized-binding"]
]) test(`rejects ${name}`, () => assert.equal(read(source).reason, reason));

test("rejects foreign subgraphs even when attached to a local clone", () => {
  const root = fixture({ "base.mjs": 'export const BASE={v:1};', "index.mjs": 'import {BASE} from "./base.mjs"; const next=structuredClone({}); next.child=BASE; next.child.v=2; export const DATA=next;' });
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").reason, "foreign-object-write");
});

test("checks unused imports and rejects initialization cycles", () => {
  const root = fixture({ "base.mjs": 'import {DATA} from "./index.mjs"; export const BASE={};', "index.mjs": 'import {BASE} from "./base.mjs"; export const DATA={};' });
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").reason, "initialization-cycle");
});

test("bounds physical paths and repeated shared-graph materialization", () => {
  const root = fixture({ "index.mjs": 'export const DATA={};' });
  assert.equal(readStaticJsonInitializationGraph(root, "../outside.mjs", "DATA").reason, "unsafe-source-path");
  const source = ['const p0={v:1};', ...Array.from({ length: 18 }, (_, i) => `const p${i + 1}={a:p${i},b:p${i}};`), 'export const DATA=p18;'].join("\n");
  assert.equal(read(source).reason, "value-budget");
});

test("preserves the original initializer-only API boundary", () => {
  const root = fixture({ "index.mjs": 'const x={v:1}; x.v=2; export const DATA=x;' });
  assert.equal(readStaticJsonExport(root, "index.mjs", "DATA").reason, "top-level-data-update");
  const result = readStaticJsonInitializationGraph(root, "index.mjs", "DATA");
  assert.equal(compareStaticJsonResource(result, inspectJsonResource('{"v":2}')).status, "equal");
});

// <lang><zh-CN>TypeScript语法AST不自动报告所有模块早期错误，模型须独立拒绝这些输入。</zh-CN><en>TypeScript syntax ASTs do not report every module early error; the model must independently reject these inputs.</en></lang>
for (const [name, source, reason] of [
  ["duplicate function bindings", 'function f(){} function f(){} export const DATA={};', "duplicate-binding"],
  ["function and const collision", 'function f(){} const f={}; export const DATA=f;', "duplicate-binding"],
  ["duplicate exports", 'const x={}; export {x as DATA}; export {x as DATA};', "duplicate-export"],
  ["missing local export", 'export {missing}; export const DATA={};', "unresolved-export"]
]) test(`rejects ${name}`, () => assert.equal(read(source).reason, reason));

test("checks unused named reexports and dependency side effects", () => {
  const root = fixture({ "base.mjs": 'export const BASE={};', "index.mjs": 'export {MISSING} from "./base.mjs"; export const DATA={};' });
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").reason, "unresolved-export");
  fs.writeFileSync(path.join(root, "base.mjs"), 'const unused=unknown(); export const BASE={};');
  fs.writeFileSync(path.join(root, "index.mjs"), 'import {BASE} from "./base.mjs"; export const DATA={};');
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").reason, "unsupported-call");
});

test("matches a controlled native graph without executing fixture modules", () => {
  // <lang><zh-CN>本地手工原生夹具作为独立事实来源，模块字符串仍只供静态读取。</zh-CN><en>This hand-authored native fixture supplies independent facts; module strings remain static-read inputs only.</en></lang>
  const shared = { nested: { value: 1 } };
  const original = Object.freeze({ a: shared, b: shared });
  const native = structuredClone(original);
  native.a = { ...native.a, value: 3 };
  Object.freeze(native);
  native.b.nested.value = 4;
  const result = read('const shared={nested:{value:1}}; const original=Object.freeze({a:shared,b:shared}); const next=structuredClone(original); next.a={...next.a,value:3}; export const DATA=Object.freeze(next); next.b.nested.value=4;');
  assert.equal(result.status, "available");
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), native);
  assert.equal(result.nodes.find(node => node.pointer === "/a/nested").graphNodeId, result.nodes.find(node => node.pointer === "/b/nested").graphNodeId);
});

test("namespace handles cannot become JSON values", () => {
  const root = fixture({ "base.mjs": 'export const ITEM={v:1};', "index.mjs": 'import * as ns from "./base.mjs"; export const DATA={ns};' });
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").reason, "non-json-value");
  fs.writeFileSync(path.join(root, "index.mjs"), 'import * as ns from "./base.mjs"; export default ns;');
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "default").reason, "non-json-value");
  fs.writeFileSync(path.join(root, "index.mjs"), 'import * as ns from "./base.mjs"; export const DATA=ns.ITEM;');
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").status, "available");
});

test("rejects invalid API inputs before coercion", () => {
  const dangerous = { toString() { throw new Error("must not coerce"); } };
  assert.equal(readStaticJsonInitializationGraph(".", "index.mjs", dangerous).reason, "invalid-request");
});

test("rejects unknown import attributes instead of inferring loading semantics", () => {
  const root = fixture({ "data.json": '{}', "index.mjs": 'import data from "./data.json" with {type:"unknown"}; export const DATA=data;' });
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").reason, "unsupported-import-attributes");
  fs.writeFileSync(path.join(root, "index.mjs"), 'import data from "./data.json"; export const DATA=data;');
  assert.equal(readStaticJsonInitializationGraph(root, "index.mjs", "DATA").reason, "unsupported-import-attributes");
});

test("bounds alias-provenance expansion independently of JSON node count", () => {
  const source = ['const p={};', ...Array.from({ length: 600 }, (_, i) => `const alias${i}=p;`), `export const DATA=[${Array(600).fill("p").join(",")}];`].join("\n");
  assert.equal(read(source).reason, "provenance-budget");
});

test("retains the overwritten spread field declaration separately from the new value", () => {
  const result = read('const old={v:1}; export const DATA={...old,v:2};');
  assert.equal(result.status,"available");
  const field = result.nodes.find(node=>node.pointer==="/v");
  assert.equal(field.value,2);
  assert.equal(field.valueDeclarationSources.length,1);
  assert.equal(field.valueDeclarationSources[0].range.start.column,12);
  assert.equal(field.declaration.range.start.column,44);
});
