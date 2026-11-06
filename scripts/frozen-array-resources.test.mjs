/** @file @lang zh-CN 冻结数组的实际B/A/JSONdoc及拒绝边界回归。 @lang en Actual B/A/JSONdoc and rejection regressions for frozen arrays. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import {collectModuleExports} from "./lib/package-api-inputs.mjs";
import {buildFrozenArrayResource} from "./lib/frozen-array-resource.mjs";
import {adoptFrozenArrayResources} from "./audit-frozen-array-resources.mjs";

/** @lang zh-CN 在本主仓唯一忽略目录创建受控定义和不执行的重导出入口。 @lang en Creates controlled definitions and a nonexecuted re-export entry in a unique ignored owner directory. */
function fixture(definition='export const VALUES = Object.freeze(["中😀", "second"]);') {
  const root=fs.mkdtempSync(fileURLToPath(new URL("../dist/frozen-array-test-",import.meta.url)));
  fs.writeFileSync(path.join(root,"data.mjs"),definition);
  fs.writeFileSync(path.join(root,"entry.mjs"),'throw new Error("Target entry must never execute"); export {VALUES} from "./data.mjs";');
  const binding=collectModuleExports(root,["entry.mjs"])[0].exports.find(item=>item.name==="VALUES");
  return {root,modulePath:"entry.mjs",exportName:"VALUES",definitionModule:"data.mjs",declarations:binding.declarations};
}

test("actual frozen string arrays retain every value and exact source through root re-exports",async()=>{
  const input=fixture();
  const result=await buildFrozenArrayResource(input);
  assert.equal(result.report.status,"verified");
  assert.equal(result.report.values,3);
  assert.equal(result.report.elements.length,2);
  assert.deepEqual(result.report.elements.map(row=>row.pointer),["/0","/1"]);
  assert(result.report.elements.every(row=>row.symbolId&&row.source.path==="data.mjs"));
  assert.equal(result.report.files.length,5);
  assert.equal(result.report.wrapperRuntime,false);
  assert.equal(result.report.coverageComplete,false);
});

test("unfrozen, callable and mixed-value arrays cannot count as frozen string data",async()=>{
  for(const definition of ['export const VALUES=["x"];','export const VALUES=Object.freeze(["x",1]);','export const VALUES=Object.freeze([()=>1]);']) {
    await assert.rejects(()=>buildFrozenArrayResource(fixture(definition)));
  }
});

test("wrong declaration and mismatched public export cannot borrow a valid data result",async()=>{
  const input=fixture();
  await assert.rejects(()=>buildFrozenArrayResource({...input,declarations:[{...input.declarations[0],column:999}]}));
  fs.writeFileSync(path.join(input.root,"other.mjs"),'export const VALUES=Object.freeze(["other"]);');
  fs.writeFileSync(path.join(input.root,"entry.mjs"),'export {VALUES} from "./other.mjs";');
  await assert.rejects(()=>buildFrozenArrayResource(input));
});

test("array adoption is explicit and never resolves nested, ambiguous or failed bindings",async()=>{
  const result=await buildFrozenArrayResource(fixture());
  const boundary={package:"fixture",module:"entry.mjs",name:"VALUES",reason:"array-elements",memberPath:[]};
  const nested={...boundary,memberPath:["nested"]};
  const base={rows:[],contentGaps:0,boundaries:[boundary,nested]};
  const row={...result.report,package:"fixture"};
  const arrays={rows:[row],unverifiedBindings:0};
  const adopted=adoptFrozenArrayResources(base,arrays);
  assert.deepEqual(adopted.boundaries,[nested]);
  assert.equal(adopted.frozenArrayElements,2);
  assert.equal(adopted.complete,false);
  assert.deepEqual(base.boundaries,[boundary,nested]);
  for(const rows of [[row,row],[{...row,status:"unverified"}],[]]) assert.deepEqual(adoptFrozenArrayResources(base,{rows,unverifiedBindings:1}).boundaries,base.boundaries);
});

test("duplicate slots, empty roots and repeated builds retain exact deterministic evidence",async()=>{
  for(const definition of ['export const VALUES=Object.freeze(["same","same"]);','export const VALUES=Object.freeze([]);']) {
    const input=fixture(definition);
    const first=await buildFrozenArrayResource(input);
    const second=await buildFrozenArrayResource(input);
    assert.deepEqual(first.report,second.report);
    assert.equal(first.report.values,first.report.elements.length+1);
    assert.equal(new Set(first.report.elements.map(row=>row.pointer)).size,first.report.elements.length);
  }
});
