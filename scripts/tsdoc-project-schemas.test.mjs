/**
 * @file
 * @lang zh-CN TypeScript独立schema分发、精确身份及篡改拒绝回归。
 * @lang en Regressions for separate TypeScript schema distribution, exact identities and tampering refusal.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import {readTsDocProjectSchemas} from "./lib/tsdoc-project-schemas.mjs";

const source=fileURLToPath(new URL("../packages/schemas/src/",import.meta.url));

test("five satellite schema snapshots compile with exact identities and digests",async()=>{
  const {snapshots}=await readTsDocProjectSchemas(source);
  assert.equal(snapshots.length,5);
  const ajv=new Ajv2020({strict:false});
  for(const item of snapshots) assert.equal(typeof ajv.compile(item.schema),"function");
});

test("0.3 schema requires explicit mode, exact profile and type-only source containers",async()=>{
  const {snapshots}=await readTsDocProjectSchemas(source);
  const ajv=new Ajv2020({strict:false});
  const schema=snapshots.find(item=>item.entry.key==="hia-tsdoc-extraction-0.3.0-draft").schema;
  const validate=ajv.compile(schema);
  const position={start:{line:1,column:1},end:{line:1,column:3}};
  const symbol={id:"node",name:"object",kind:"ts-type-literal",classification:"type-only",exported:false,parentId:"parent",signature:"{}",source:{path:"index.ts",range:position,rangeConvention:{endBoundary:"exclusive",columnUnit:"utf16-code-unit"}},metadata:{modulePath:"index.ts",syntaxKind:"TypeLiteral",typeExpression:{operator:"object",syntaxKind:"TypeLiteral"}}};
  const artifact={contract:"hia-tsdoc-extraction",contractVersion:"0.3.0-draft",producer:{name:"test",version:"1"},profile:{id:"ts-jsdoc-bridge",version:"0.3.0-draft"},source:{path:"index.ts",language:"typescript",sourcesContentPolicy:"none"},artifacts:[],modules:[{path:"index.ts",exports:[]}],symbols:[symbol],comments:[],diagnostics:[],metadata:{typeExpressions:"0.3.0-draft"}};
  assert.equal(validate(artifact),true,JSON.stringify(validate.errors));
  for(const mode of ["metadata","profile","runtime","comment","branch"]){
    const invalid=structuredClone(artifact);
    if(mode==="metadata") delete invalid.metadata.typeExpressions;
    if(mode==="profile") invalid.profile.version="0.2.0-draft";
    if(mode==="runtime") invalid.symbols[0].classification="runtime";
    if(mode==="comment") invalid.symbols[0].comment={};
    if(mode==="branch") invalid.symbols[0].metadata.typeExpression.branchIndex=-1;
    assert.equal(validate(invalid),false,mode);
  }
});

test("satellite catalogs reject path substitutions, identity changes and edited snapshot bytes",async()=>{
  const parent=fileURLToPath(new URL("../dist/",import.meta.url));
  await fs.mkdir(parent,{recursive:true});
  for(const mode of ["path","identity","bytes"]){
    const directory=await fs.mkdtemp(path.join(parent,"tsdoc-schema-test-"));
    const {catalog,snapshots}=await readTsDocProjectSchemas(source);
    await fs.mkdir(path.join(directory,"tsdoc-project"));
    for(const item of snapshots) await fs.writeFile(path.join(directory,"tsdoc-project",item.filename),item.bytes);
    if(mode==="path") catalog.schemas[0].path="../outside.json";
    if(mode==="identity") catalog.schemas[0].schemaId="https://invalid.example/schema.json";
    if(mode==="bytes") await fs.appendFile(path.join(directory,"tsdoc-project",snapshots[0].filename)," ");
    await fs.writeFile(path.join(directory,"tsdoc-project-catalog.json"),JSON.stringify(catalog));
    await assert.rejects(readTsDocProjectSchemas(directory));
  }
});
