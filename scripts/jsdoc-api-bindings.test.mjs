/** @lang zh-CN 原声明关联拒绝反例，防止同名占位、跨文件碰撞和字段丢失造成假覆盖。 @lang en Declaration-association regressions against same-name placeholders, cross-file collisions and lost fields. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {associateNativeJsdocBinding} from "./lib/jsdoc-api-bindings.mjs";

/** @lang zh-CN 构造最小核验输入；实际原生生产另有显式集成回归。 @lang en Builds minimal verification inputs; real native production has separate explicit integration regressions. */
function fixture() {
  const source="HIA/owner/src/original.mjs";
  const node={id:"jsdoc:function:original",name:"original",jsdoc:{params:[{name:"options",optional:true}],returns:[{type:{names:["string"]}}]},source:{definedIn:{relativePath:source,position:{line:12,column:1},range:{start:{line:12,column:1},end:{line:12,column:1}}}},i18n:{fields:{"params.options.description":{localizedText:{en:"Options","zh-CN":"配置"}}}}};
  const symbol={id:node.id,name:node.name,source:structuredClone(node.source),metadata:{jsdoc:structuredClone(node.jsdoc)},i18n:structuredClone(node.i18n)};
  return {binding:{name:"ALIAS",declarationName:"original",status:"resolved",declarations:[{path:"src/original.mjs",line:12,column:8,kind:"FunctionDeclaration"}]},owner:"owner",outputs:[{source,status:"success",artifact:"original/hia-integration.json",integration:{contract:"hia-jsdoc-integration",contractVersion:"0.1.0",ir:{nodes:[node]}},document:{symbols:[symbol]}}]};
}

test("aliases associate the actual declaration and preserve localized fields",()=>{
  const result=associateNativeJsdocBinding(fixture());
  assert.equal(result.status,"associated");
  assert.equal(result.declarations[0].nodeId,"jsdoc:function:original");
  assert.equal(result.declarations[0].i18nFields,1);
});

test("qualified CommonJS declarations match native terminal names and exact longnames",()=>{
  // <lang><zh-CN>JSDoc把module.exports的name记为exports，longname保留完整身份。</zh-CN><en>JSDoc records the name of module.exports as exports while retaining its full identity in longname.</en></lang>
  const data=fixture();
  data.binding.declarationName="exports";
  data.binding.declarationLongname="module.exports";
  data.outputs[0].integration.ir.nodes[0].name="exports";
  data.outputs[0].integration.ir.nodes[0].longname="module.exports";
  data.outputs[0].document.symbols[0].name="exports";
  assert.equal(associateNativeJsdocBinding(data).status,"associated");
  data.outputs[0].integration.ir.nodes[0].longname="other.exports";
  assert.equal(associateNativeJsdocBinding(data).status,"blocked");
});
test("a same-name entry placeholder cannot replace the original declaration",()=>{
  const data=fixture();data.outputs[0].integration.ir.nodes[0].source.definedIn.relativePath="HIA/owner/src/index.mjs";
  assert.equal(associateNativeJsdocBinding(data).status,"blocked");
});
test("identical node ids in different artifacts stay source-scoped",()=>{
  const data=fixture();const other=structuredClone(data.outputs[0]);other.source="HIA/owner/src/other.mjs";other.integration.ir.nodes[0].source.definedIn.relativePath=other.source;data.outputs.push(other);
  assert.equal(associateNativeJsdocBinding(data).status,"associated");
});
test("ambiguous original declarations are blocked",()=>{
  const data=fixture();data.outputs[0].integration.ir.nodes.push(structuredClone(data.outputs[0].integration.ir.nodes[0]));
  assert.equal(associateNativeJsdocBinding(data).status,"blocked");
});
test("a failed producer cannot pass using partial output",()=>{
  const data=fixture();data.outputs[0].status="failed";
  assert.equal(associateNativeJsdocBinding(data).status,"blocked");
});
test("missing undocumented native nodes remain explicit gaps",()=>{
  const data=fixture();data.outputs[0].integration.ir.nodes=[];
  assert.equal(associateNativeJsdocBinding(data).status,"blocked");
});
test("loss of an additional translation fails field verification",()=>{
  const data=fixture();delete data.outputs[0].document.symbols[0].i18n.fields["params.options.description"].localizedText["zh-CN"];
  assert.throws(()=>associateNativeJsdocBinding(data),/localized/i);
});
test("loss of parameter or return metadata fails verification",()=>{
  const data=fixture();data.outputs[0].document.symbols[0].metadata.jsdoc.returns=[];
  assert.throws(()=>associateNativeJsdocBinding(data),/metadata/i);
});
test("loss of a source-proven callable signature fails verification",()=>{
  const data=fixture();data.outputs[0].integration.ir.nodes[0].signature="original(options) → string";
  assert.throws(()=>associateNativeJsdocBinding(data),/signature/i);
});
test("changed core source position fails verification",()=>{
  const data=fixture();data.outputs[0].document.symbols[0].source.definedIn.position.line=13;
  assert.throws(()=>associateNativeJsdocBinding(data),/source/i);
});
test("a plain description cannot disappear when no localized description exists",()=>{
  const data=fixture();data.outputs[0].integration.ir.nodes[0].summary="Original description";
  assert.throws(()=>associateNativeJsdocBinding(data),/summary/i);
});
test("a source block cannot keep its range while losing its content",()=>{
  const data=fixture();data.outputs[0].integration.ir.nodes[0].source.primaryBlock={relativePath:data.outputs[0].source,content:"export function original(){}"};
  data.outputs[0].document.symbols[0].source.primaryBlock={relativePath:data.outputs[0].source};
  assert.throws(()=>associateNativeJsdocBinding(data),/source content/i);
});
