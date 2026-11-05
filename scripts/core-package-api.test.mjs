/** @lang zh-CN 核心包生成链的独立导出/字段/来源查缺回归。 @lang en Regressions for independent export/field/source coverage checks of generated core package APIs. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {verifyProjectApiProjection,assertPublicRootOmission} from "./lib/core-package-api.mjs";

/**
 * @lang zh-CN 构造两个公开入口的独立期望和富字段投影，不执行实际源码。
 * @lang en Construct independent expectations and rich-field projections for two public entries without executing source.
 * @returns {object} 可独立修改的合成对照。 Independently mutable synthetic comparison.
 */
function fixture(){
  const comment={i18n:{fields:{remarks:{localizedText:{en:"Read only.","zh-CN":"只读。"}}}}};
  const source={path:"src/value.ts",range:{start:{line:2,column:1},end:{line:3,column:1}}};
  const symbol={id:"real",name:"Alias",signature:"const value: number",source,comment};
  return {modules:[{path:"src/index.ts",exports:[{name:"Alias"}]}],extraction:{modules:[{path:"src/index.ts",exports:[{name:"Alias",symbolIds:["real"]}]}],symbols:[symbol]},document:{symbols:[{id:"real",name:"Alias",signature:symbol.signature,source:{definedIn:{relativePath:source.path,range:source.range}},i18n:structuredClone(comment.i18n)}]},bridge:{runtimeSymbols:[structuredClone(symbol)],typeOnlySymbols:[]}};
}

test("matches every public binding and retains full bilingual fields and actual source",()=>{
  const data=fixture();
  assert.deepEqual(verifyProjectApiProjection(data),{bindings:1,symbols:1,i18nFields:1});
});
test("missing module, alias or referenced declaration is a failure",()=>{
  for(const change of [data=>{data.extraction.modules=[];},data=>{data.extraction.modules[0].exports[0].name="Original";},data=>{data.extraction.modules[0].exports[0].symbolIds=["missing"];},data=>{data.document.symbols=[];}]){
    const data=fixture();change(data);assert.throws(()=>verifyProjectApiProjection(data));
  }
});
test("summary-only projection, changed signatures or fabricated locations are rejected",()=>{
  for(const change of [data=>{data.document.symbols[0].i18n.fields={};},data=>{data.bridge.runtimeSymbols[0].comment.i18n.fields.remarks.localizedText["zh-CN"]="Lost";},data=>{data.document.symbols[0].signature="Other";},data=>{data.document.symbols[0].source.definedIn.relativePath="invented.xml";}]){
    const data=fixture();change(data);assert.throws(()=>verifyProjectApiProjection(data));
  }
});
test("duplicate projected IDs cannot hide missing declarations",()=>{
  const data=fixture();data.document.symbols.push(structuredClone(data.document.symbols[0]));
  assert.throws(()=>verifyProjectApiProjection(data));
});

test("unexpected exports and JSON-escaped machine roots fail",()=>{
  const data=fixture();data.extraction.modules[0].exports.push({name:"private",symbolIds:["real"]});
  assert.throws(()=>verifyProjectApiProjection(data));
  const root="K:\\Owned Space\\Example";
  assert.throws(()=>assertPublicRootOmission({value:root},root));
  assert.throws(()=>assertPublicRootOmission({value:"file:///K:/Owned Space/Example/source.ts"},root));
  assert.doesNotThrow(()=>assertPublicRootOmission({value:"src/public.ts"},root));
});
