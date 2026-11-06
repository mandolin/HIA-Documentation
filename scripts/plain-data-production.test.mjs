/** @file @lang zh-CN 有限原生生产、实际侧车及独立冲突门禁回归。 @lang en Finite native production, actual sidecar and independent conflict-gate regressions. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { test } from "node:test";
import { producePlainDataModule } from "./lib/plain-data-production.mjs";
import { readPlainDataInitialization } from "../packages/plugin-sdk/dist/plain-data-initialization.js";
import { readStaticJsonInitializationGraph } from "./lib/static-initialization-graph.mjs";
import { verifyPlainDataProduction } from "./lib/plain-data-production-verification.mjs";
import { buildJsdocConfigProduction } from "./build-jsdoc-config-production.mjs";

/** @lang zh-CN 创建本地受控源，不加载外部模块。 @lang en Creates controlled local source without loading external modules. */
function fixture(source, dependencies = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hia-production-"));
  fs.writeFileSync(path.join(root, "entry.mjs"), source);
  for (const [file, text] of Object.entries(dependencies)) fs.writeFileSync(path.join(root, file), text);
  return root;
}

test("records actual native cloning, sharing, spreading and freezing", async () => {
  const root = fixture(`import { OLD } from './old.mjs';
const next = structuredClone(OLD);
next.a = {...next.a, v: 2};
export const DATA = Object.freeze(next);`, {"old.mjs": "const child = {v: 1}; export const OLD = Object.freeze({a: child, b: child});"});
  const generated = producePlainDataModule(root, "entry.mjs", "DATA", "schema.json");
  assert.deepEqual(JSON.parse(generated.artifact), {a:{v:2},b:{v:1}});
  assert.equal(generated.evidence.evidenceOrigin, "producer-recorded");
  assert.equal(generated.evidence.coverage, "resource");
  const replay = readPlainDataInitialization(generated.evidence, "produce");
  assert.equal(replay.status, "replayed", JSON.stringify(replay.diagnostics));
  assert.deepEqual(JSON.parse(JSON.stringify(replay.value)), JSON.parse(generated.artifact));
  assert.equal(generated.nativeValue.a === generated.nativeValue.b, false);
  assert.equal(Object.isFrozen(generated.nativeValue), true);
  assert.equal(Object.isFrozen(generated.nativeValue.a), false);
  assert.equal(generated.evidence.details.produce.steps.filter(step=>step.kind === "clone").length, 1);
  assert.equal(generated.evidence.details.produce.steps.filter(step=>step.kind === "spread").length, 1);
  const staticResult = readStaticJsonInitializationGraph(root,"entry.mjs","DATA");
  assert.equal(staticResult.status,"available");
  assert.deepEqual(JSON.parse(JSON.stringify(staticResult.value)),JSON.parse(generated.artifact));
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",generated.evidence,generated.artifact).status,"verified");
  // <lang><zh-CN>只原生导入此处自有受控夹具，业务/任意输入模块始终不加载。</zh-CN><en>Natively import only this owned controlled fixture; business/arbitrary input modules are never loaded.</en></lang>
  const native = await import(pathToFileURL(path.join(root,"entry.mjs")).href);
  assert.deepEqual(generated.nativeValue,native.DATA);
  assert.equal(Object.isFrozen(native.DATA),true);
});

test("preserves shared native children and actual UTF16 provenance", () => {
  const root = fixture(`const child = {text: "中文😀"}; const old = {a:child,b:child};
export const DATA = structuredClone(old);`);
  const result = producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  assert.equal(result.nativeValue.a,result.nativeValue.b);
  const replay = readPlainDataInitialization(result.evidence,"produce");
  assert.equal(replay.status,"replayed");
  assert.equal(replay.valueLinks.find(row=>row.pointer==="/a").nodeId,replay.valueLinks.find(row=>row.pointer==="/b").nodeId);
  const provenance = replay.valueLinks.find(row=>row.pointer==="/a/text").valueSource;
  assert.equal(provenance.range.end.column-provenance.range.start.column,6);
});

test("preserves a UTF8 BOM and CRLF in original source coordinates",()=>{
  const root=fixture('\ufeffconst text="😀";\r\nexport const DATA={text};');
  const produced=producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",produced.evidence,produced.artifact).status,"verified");
});

test("supports array values and scalar clones with deterministic records", () => {
  const root = fixture('const value = structuredClone(2); export const DATA = [value, null, true, -1];');
  const first = producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  const second = producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  assert.deepEqual(JSON.parse(first.artifact),[2,null,true,-1]);
  assert.deepEqual(first.evidence,second.evidence);
  assert.equal(readPlainDataInitialization(first.evidence,"produce").status,"replayed");
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",first.evidence,first.artifact).status,"verified");
});

for(const [name,source,dependencies] of [
 ["unknown calls",'export const DATA = evil();'],
 ["dynamic keys",'const key="a"; export const DATA = {[key]:1};'],
 ["foreign writes",'import { OLD } from "./old.mjs"; OLD.v=2; export const DATA=OLD;',{"old.mjs":'export const OLD={v:1};'}],
 ["frozen writes",'const value=Object.freeze({v:1}); value.v=2; export const DATA=value;'],
 ["duplicate declarations",'const value=1; const value=2; export const DATA=value;'],
 ["shadowed builtins",'const structuredClone=1; export const DATA={v:1};'],
 ["external imports",'import {value} from "node:fs"; export const DATA=value;'],
 ["import cycles",'import {OLD} from "./old.mjs"; export const DATA=OLD;',{ "old.mjs":'import {DATA} from "./entry.mjs"; export const OLD=DATA;' }],
 ["prototype keys",'export const DATA={__proto__:null};'],
 ["array writes",'const value=[1]; value.length=0; export const DATA=value;'],
 ["unsupported statements",'export const DATA={v:1}; console.log(DATA);'],
 ["duplicate initial properties",'export const DATA={v:1,v:2};']
]) test(`rejects ${name} before returning artifacts`,()=>{
  const root=fixture(source,dependencies);
  assert.throws(()=>producePlainDataModule(root,"entry.mjs","DATA","schema.json"),/^Error: Plain data production rejected\./);
});

test("independently verifies real bytes, selected value sources and shared containers",()=>{
  const root=fixture('const child={v:1}; const old={a:child,b:child}; export const DATA=structuredClone(old);');
  const produced=producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  const verified=verifyPlainDataProduction(root,"entry.mjs","DATA",produced.evidence,produced.artifact);
  assert.equal(verified.status,"verified",JSON.stringify(verified));
  assert.equal(verified.values,5);
  assert.equal(verified.sharedContainers,true);
  assert.equal(verified.wrapperRuntime,false);
  assert.equal(verified.producerAuthenticity,false);
});

for(const [name,change] of [
 ["missing evidence",x=>{x.evidence=undefined;}],
 ["inferred origin",x=>{x.evidence.evidenceOrigin="static-inferred";}],
 ["unknown version",x=>{x.evidence.contractVersion="1.0.0";}],
 ["unknown producer",x=>{x.evidence.producer.id="another-producer";}],
 ["tampered digest",x=>{x.evidence.resources[0].sha256="0".repeat(64);}],
 ["tampered artifact",x=>{x.artifact=Buffer.from('{"v":2}\n');}],
 ["rebound artifact",x=>{x.artifact=Buffer.from('{"v":2}\n');x.evidence.resources.find(r=>r.kind==="artifact").sha256=createHash("sha256").update(x.artifact).digest("hex");}],
 ["tampered trace value",x=>{x.evidence.details.produce.steps.find(s=>s.kind==="literal").value=2;}],
 ["tampered source",x=>{x.evidence.details.produce.steps.find(s=>s.kind==="literal").source.range.start.column++;}],
 ["wrong selected export",x=>{x.evidence.details.produce.result.bindingName="OTHER";}],
 ["missing source",x=>{x.evidence.resources=x.evidence.resources.filter(r=>r.kind!=="source");}]
]) test(`blocks ${name} in the required independent gate`,()=>{
  const root=fixture('export const DATA={v:1};');
  const produced=producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  change(produced);
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",produced.evidence,produced.artifact).status,"rejected");
});

test("detects changed sharing even when value bytes and selected scalar sources agree",()=>{
  const root=fixture('const child={v:1}; export const DATA={a:child,b:child};');
  const generated=producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  const steps=generated.evidence.details.produce.steps;
  const objectIndex=steps.findIndex(step=>step.kind==="object" && step.properties.some(property=>property.key==="a"));
  const childId=steps[objectIndex].properties[0].nodeId;
  const original=steps.find(step=>step.nodeId===childId && step.kind==="object");
  const separate={...structuredClone(original),nodeId:"separate"};
  steps[objectIndex].properties[1].nodeId="separate";
  steps.splice(objectIndex,0,separate);
  steps.forEach((step,index)=>{step.sequence=index;});
  assert.equal(readPlainDataInitialization(generated.evidence,"produce").status,"replayed");
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",generated.evidence,generated.artifact).status,"rejected");
});

for(const kind of ["clone","freeze"]) test(`rejects tampered ${kind} event provenance despite identical JSON`,()=>{
  const root=fixture('const old={v:1}; export const DATA=Object.freeze(structuredClone(old));');
  const produced=producePlainDataModule(root,"entry.mjs","DATA","schema.json");
  produced.evidence.details.produce.steps.find(step=>step.kind===kind).source.range.start.column++;
  assert.equal(readPlainDataInitialization(produced.evidence,"produce").status,"replayed");
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",produced.evidence,produced.artifact).status,"rejected");
});

test("runs the actual development build and SDK JSONdoc path with an isolated fixture",async()=>{
  const root=fixture('export const DATA=1;');
  const repository=path.join(root,"HIA/hia-jsdoc/packages/jsdoc-runner");
  fs.mkdirSync(path.join(repository,"src"),{recursive:true});
  fs.mkdirSync(path.join(repository,"schemas"));
  fs.writeFileSync(path.join(repository,"src/schema-legacy.mjs"),'export const OLD={v:1};');
  fs.writeFileSync(path.join(repository,"src/schema.mjs"),'import {OLD} from "./schema-legacy.mjs"; export const HIA_JSDOC_CONFIG_JSON_SCHEMA=structuredClone(OLD); export const HIA_JSDOC_LEGACY_CONFIG_JSON_SCHEMA=OLD;');
  const expected=JSON.stringify({v:1},null,2)+"\n";
  fs.writeFileSync(path.join(repository,"schemas/hia-jsdoc-config-1.0.0.schema.json"),expected);
  fs.writeFileSync(path.join(repository,"schemas/hia-jsdoc-config-0.1.0-draft.schema.json"),expected);
  const result=await buildJsdocConfigProduction(root);
  assert.equal(result.report.status,"verified");
  assert.equal(result.report.files.length,6);
  assert.equal(result.report.jsondoc.values,2);
  const main=fileURLToPath(new URL("../",import.meta.url));
  for(const file of result.report.files) assert.equal(createHash("sha256").update(fs.readFileSync(path.join(main,result.output,file.path))).digest("hex"),file.sha256);
  assert(fs.existsSync(path.join(main,result.output,"report.json")));
  const repeated=await buildJsdocConfigProduction(root);
  assert.notEqual(result.output,repeated.output);
  assert.deepEqual(result.report,repeated.report);
  fs.writeFileSync(path.join(repository,"schemas/hia-jsdoc-config-1.0.0.schema.json"),'{}\n');
  await assert.rejects(()=>buildJsdocConfigProduction(root),/Generated current config resource differs/);
});

test("records a single array spread as an existing shallow-copy step with original slot sources",()=>{
  const root=fixture('const child={v:1}; const old=Object.freeze([child,child]); export const DATA=[...old];');
  const generated=producePlainDataModule(root,"entry.mjs","DATA","array.json");
  assert.equal(generated.nativeValue[0],generated.nativeValue[1]);
  assert.equal(Object.isFrozen(generated.nativeValue),false);
  assert.equal(generated.evidence.details.produce.steps.filter(step=>step.kind==="spread").length,1);
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",generated.evidence,generated.artifact).status,"verified");
});

test("array copies retain distinct shells, inherited staging aliases and original imported slots",()=>{
  const root=fixture('import {KINDS} from "./data.mjs"; const descriptor=Object.freeze({inputKinds:[...KINDS]}); export const DATA={base:descriptor,staged:Object.freeze({...descriptor})};',{"data.mjs":'export const KINDS=Object.freeze(["one","two"]);'});
  const generated=producePlainDataModule(root,"entry.mjs","DATA","array.json");
  assert.equal(generated.nativeValue.base.inputKinds,generated.nativeValue.staged.inputKinds);
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",generated.evidence,generated.artifact).status,"verified");
});

test("mixed spreads, multiple spreads, sparse arrays and non-array iterables stay rejected",()=>{
  for(const expression of ['["head",...old]','[...old,...old]','[..."text"]','[...[,1]]']) {
    const root=fixture(`const old=[1]; export const DATA=${expression};`);
    assert.throws(()=>producePlainDataModule(root,"entry.mjs","DATA","array.json"));
  }
});

test("repeated array copies and cloned copies preserve slot provenance and shallow child sharing",()=>{
  const root=fixture('const child={v:1}; const old=[child]; const first=[...old]; const second=[...first]; export const DATA={old,first,second,cloned:structuredClone(second)};');
  const generated=producePlainDataModule(root,"entry.mjs","DATA","array.json");
  assert.notEqual(generated.nativeValue.old,generated.nativeValue.first);
  assert.notEqual(generated.nativeValue.first,generated.nativeValue.second);
  assert.equal(generated.nativeValue.old[0],generated.nativeValue.second[0]);
  assert.notEqual(generated.nativeValue.second[0],generated.nativeValue.cloned[0]);
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",generated.evidence,generated.artifact).status,"verified");
});

test("equal array JSON cannot conceal a tampered spread operation range",()=>{
  const root=fixture('const old=["value"]; export const DATA=[...old];');
  const generated=producePlainDataModule(root,"entry.mjs","DATA","array.json");
  generated.evidence.details.produce.steps.find(step=>step.kind==="spread").source.range.start.column++;
  assert.equal(readPlainDataInitialization(generated.evidence,"produce").status,"replayed");
  assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",generated.evidence,generated.artifact).status,"rejected");
});

test("empty and repeated-value array copies retain each original slot and deterministic records",()=>{
  for(const source of ['[]','["same","same"]']) {
    const root=fixture(`const old=${source}; export const DATA=[...old];`);
    const first=producePlainDataModule(root,"entry.mjs","DATA","array.json");
    const second=producePlainDataModule(root,"entry.mjs","DATA","array.json");
    assert.deepEqual(first.evidence,second.evidence);
    assert.equal(verifyPlainDataProduction(root,"entry.mjs","DATA",first.evidence,first.artifact).status,"verified");
  }
});
