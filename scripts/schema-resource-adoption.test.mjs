/** @file @lang zh-CN Schema值来源、历史别名和成员组合采用拒绝回归。 @lang en Rejection regressions for Schema value provenance, historical aliases and combined member adoption. */
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { matchSchemaMemberDeclarations, adoptSchemaResourceMembers } from "./lib/schema-resource-adoption.mjs";
import { JSDOC_CONFIG_EVIDENCE_PATH, readJsdocConfigEvidence } from "./lib/jsdoc-config-evidence.mjs";
import { producePlainDataModule } from "./lib/plain-data-production.mjs";

/** @lang zh-CN 构造固定声明位置，保持原始语法种类。 @lang en Creates fixed declaration positions retaining original syntax kinds. */
function source(line,kind="PropertyAssignment") {
  return {path:"src/config.mjs",kind,range:{start:{line,column:1},end:{line,column:10}},rangeConvention:{endBoundary:"exclusive",columnUnit:"utf16-code-unit"}};
}
test("matches a previous value alias only through the same field's verified history",()=>{
  const member={declarations:[{path:"src/config.mjs",kind:"VariableDeclaration",line:1,column:1}]};
  const old={pointer:"/v",declaration:source(2),origin:source(1,"VariableDeclaration"),valueDeclarationSources:[source(1,"VariableDeclaration")]};
  const current={pointer:"/v",declaration:source(4),origin:source(5),valueDeclarationSources:[source(2)]};
  const match=matchSchemaMemberDeclarations(member,current,old);
  assert.equal(match.matches,true);assert.deepEqual(match.kinds,["previous-value-alias"]);
  assert.equal(matchSchemaMemberDeclarations(member,{...current,valueDeclarationSources:[]},old).matches,false);
  assert.equal(matchSchemaMemberDeclarations(member,current,{...old,pointer:"/other"}).matches,false);
});

/** @lang zh-CN 使用独立声明、原生成功和完整数据关联事实构造组合夹具。 @lang en Builds a combination fixture from independent declarations, native success and complete data-association facts. */
function fixture() {
  const declaration={path:"src/config.mjs",kind:"PropertyAssignment",line:2,column:1};
  const identity={package:"@hia-doc/example",owner:"owner",module:"src/index.mjs",name:"CONFIG_JSON_SCHEMA"};
  const member={...identity,memberPath:["v"],expectedCallable:false,status:"blocked",declarations:[],gaps:[{reason:"missing-native-declaration"}],originalDeclarations:[declaration]};
  const schema={...identity,status:"associated",schemaId:"https://example.test/config",sources:[{path:"HIA/owner/src/config.mjs",sha256:"a".repeat(64)}],resource:{source:"HIA/owner/config.json",sha256:"b".repeat(64)},generated:{documentId:"json-doc",mapId:"json-map",hashes:["c".repeat(64),"d".repeat(64),"b".repeat(64)]},members:[{memberPath:["v"],pointer:"/v",symbolId:"json-v",declarationsMatch:true,originalDeclarations:[declaration],declarationSource:source(2)}],boundaryPointers:[{memberPath:["items"],pointer:"/items",reason:"array-elements",valueType:"array",symbolId:"json-items",subtreeValues:3}]};
  return {memberRows:[member],boundaries:[{...identity,memberPath:["items"],reason:"array-elements"}],schemaReport:{rows:[schema],unverifiedBindings:0},sourceRecords:[{source:"HIA/owner/src/config.mjs",status:"success",sha256:"a".repeat(64)}]};
}
test("keeps native evidence distinct while adopting exact JSON content and array coverage",()=>{
  const input=fixture();const result=adoptSchemaResourceMembers(input);
  assert.equal(result.schemaResourcePaths,1);assert.equal(result.contentGaps,0);assert.equal(result.resolvedArrayBoundaries.length,1);assert.equal(result.complete,true);
  assert.equal(input.memberRows[0].status,"blocked");
  assert.equal(result.rows[0].evidenceKind,"schema-resource");
});
for(const [name,mutate]of [
 ["callable data replacement",x=>{x.memberRows[0].expectedCallable=true;}],
 ["failed native production",x=>{x.sourceRecords[0].status="failed";}],
 ["stale native source",x=>{x.sourceRecords[0].sha256="0".repeat(64);}],
 ["wrong original declarations",x=>{x.schemaReport.rows[0].members[0].originalDeclarations[0]={...x.schemaReport.rows[0].members[0].originalDeclarations[0],line:3};}],
 ["missing exact match",x=>{x.schemaReport.rows[0].members[0].declarationsMatch=false;}],
 ["missing generated artifacts",x=>{x.schemaReport.rows[0].generated.hashes=[];}],
 ["invalid digest alphabet",x=>{x.schemaReport.rows[0].generated.hashes[0]="z".repeat(64);}],
 ["ambiguous data rows",x=>{x.schemaReport.rows.push(structuredClone(x.schemaReport.rows[0]));}],
 ["native ambiguity",x=>{x.memberRows[0].gaps=[{reason:"ambiguous-native-declaration"}];}]
]) test(`blocks ${name}`,()=>{
 const input=fixture();mutate(input);const result=adoptSchemaResourceMembers(input);assert.equal(result.contentGaps,1);assert.equal(result.complete,false);
});
test("retains unresolved declaration paths as gaps without throwing",()=>{
 const input=fixture();input.memberRows[0].originalDeclarations[0]={path:null,kind:"PropertyAssignment",line:1,column:1};
 assert.equal(adoptSchemaResourceMembers(input).contentGaps,1);
});

/** @lang zh-CN 创建最小真实包根生产件，不读取外部包。 @lang en Creates minimal actual package-root production artifacts without reading external packages. */
function packaged() {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"hia-evidence-package-"));
 for(const directory of ["src","schemas","evidence"])fs.mkdirSync(path.join(root,directory));
 fs.writeFileSync(path.join(root,"src/schema.mjs"),'const old={v:1}; export const HIA_JSDOC_CONFIG_JSON_SCHEMA=Object.freeze(structuredClone(old));');
 const generated=producePlainDataModule(root,"src/schema.mjs","HIA_JSDOC_CONFIG_JSON_SCHEMA","schemas/hia-jsdoc-config-1.0.0.schema.json");
 fs.writeFileSync(path.join(root,"schemas/hia-jsdoc-config-1.0.0.schema.json"),generated.artifact);
 fs.writeFileSync(path.join(root,JSDOC_CONFIG_EVIDENCE_PATH),JSON.stringify(generated.evidence));
 return root;
}
test("verifies actual sidecars relative to a standalone installed package root",()=>{
 const result=readJsdocConfigEvidence(packaged());assert.equal(result.status,"verified");assert.equal(result.verification.values,2);
});
for(const [name,mutate]of [
 ["missing sidecar",root=>fs.unlinkSync(path.join(root,JSDOC_CONFIG_EVIDENCE_PATH))],
 ["changed source",root=>fs.appendFileSync(path.join(root,"src/schema.mjs"),'\n// changed bytes\n')],
 ["changed schema",root=>fs.writeFileSync(path.join(root,"schemas/hia-jsdoc-config-1.0.0.schema.json"),'{}')],
 ["unsupported evidence",root=>{const file=path.join(root,JSDOC_CONFIG_EVIDENCE_PATH);const value=JSON.parse(fs.readFileSync(file));value.contractVersion="1.0.0";fs.writeFileSync(file,JSON.stringify(value));}],
 ["wrong output binding",root=>{const file=path.join(root,JSDOC_CONFIG_EVIDENCE_PATH);const value=JSON.parse(fs.readFileSync(file));value.resources.find(row=>row.kind==="artifact").path="other.json";fs.writeFileSync(file,JSON.stringify(value));}]
])test(`rejects package ${name}`,()=>{const root=packaged();mutate(root);assert.equal(readJsdocConfigEvidence(root).status,"unverified");});
test("retains non-array type boundaries and required schema failures",()=>{
 const input=fixture();input.boundaries[0].reason="composite-type";input.schemaReport.unverifiedBindings=1;
 const result=adoptSchemaResourceMembers(input);assert.equal(result.contentGaps,0);assert.equal(result.boundaries.length,1);assert.equal(result.complete,false);
});

test("uses actual JSONdoc for direct JSON declarations while rejecting a real failed producer",()=>{
 const input=fixture();
 const source="HIA/owner/config.json";
 input.memberRows[0].originalDeclarations[0].path="config.json";
 input.schemaReport.rows[0].members[0].originalDeclarations=structuredClone(input.memberRows[0].originalDeclarations);
 input.memberRows[0].gaps=[{source,reason:"missing-or-failed-production"}];
 input.schemaReport.rows[0].sources.push({path:source,sha256:"b".repeat(64)});
 assert.equal(adoptSchemaResourceMembers(input).contentGaps,0);
 input.sourceRecords.push({source,status:"failed",sha256:"b".repeat(64)});
 assert.equal(adoptSchemaResourceMembers(input).contentGaps,1);
});
