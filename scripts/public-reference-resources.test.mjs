/**
 * @file
 * @lang zh-CN 首包JSON资源的实际导出、逐值/来源及原文回归。
 * @lang en Regressions for actual exports, per-value provenance and original bytes in the first package's JSON resources.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateJsonDocumentation} from '../packages/jsondoc/dist/index.js';
import {assertResourceEntries} from './public-reference-resources.mjs';
import {preparePublicReferenceSourceConfig,PUBLIC_REFERENCE_JSON_RESOURCE_PATHS} from './public-reference-source.mjs';

test('the public reference explicitly selects the SDK resource package',()=>{
  const definition=JSON.parse(fs.readFileSync(new URL('../reference/public-reference-build.definition.json',import.meta.url),'utf8'));
  assert.deepEqual(definition.packageResources,['@hia-doc/plugin-sdk']);
});

/** @lang zh-CN 直接从原生JSONdoc构造含大整数、负零、空值及转义Pointer的可变夹具。 @lang en Builds a mutable native JSONdoc fixture with a large integer, negative zero, null and escaped pointers. */
function fixture() {
  const bytes=Buffer.from('{"$ref":"#/a","a":[9007199254740993,true,null],"x/y":{"~":-0}}');
  const {document}=generateJsonDocumentation(bytes,{path:'sample.json',locale:'und'});
  const row={prefix:'package-resources/example/sample.json',source:'sample.json'};
  const entries=document.symbols.map(symbol=>({
    id:symbol.id,symbolId:symbol.id,name:symbol.name,kind:symbol.kind,signature:symbol.signature,
    input:{path:row.prefix+'/resource-001.hia.json'},
    ...(symbol.parentId?{hierarchy:{parentSymbolId:symbol.parentId}}:{}),
    source:{path:row.source,range:structuredClone(symbol.source.definedIn.range)},
    docSourceMap:{sourcePath:row.source,sourceRange:structuredClone(symbol.source.definedIn.range)}
  }));
  return {row,document,entries,bytes};
}

test('resource site entries retain every original value, signature, parent and range',()=>{
  const data=fixture();
  assert.doesNotThrow(()=>assertResourceEntries(data));
  assert(data.entries.some(entry=>entry.signature.includes('9007199254740993')));
  assert(data.entries.some(entry=>entry.signature.endsWith('-0')));
  assert(data.document.symbols.some(symbol=>symbol.metadata.json.pointer==='/x~1y/~0'));
});

test('resource entry omissions and rewritten lexemes, sources, ranges or parents fail',()=>{
  for(const change of [data=>data.entries.pop(),data=>data.entries[1]=data.entries[0],data=>data.entries[1].signature='changed',data=>data.entries[1].source.path='wrong.json',data=>data.entries[1].source.range.start.line=999,data=>data.entries[1].docSourceMap.sourceRange.end.column=999,data=>data.entries[1].hierarchy.parentSymbolId='wrong']) {
    const data=fixture();change(data);assert.throws(()=>assertResourceEntries(data));
  }
});

test('complete declared coordinates remain exact while a source preview stays bounded',()=>{
  const data=fixture();
  const range={start:{line:1,column:1},end:{line:457,column:2}};
  data.document.symbols[0].source.definedIn.range=range;
  data.entries[0].docSourceMap.sourceRange=structuredClone(range);
  data.entries[0].source.range={start:{line:1},end:{line:400}};
  assert.doesNotThrow(()=>assertResourceEntries(data));
  data.entries[0].source.range.end.line=401;
  assert.throws(()=>assertResourceEntries(data),/preview window changed/u);
});

test('resource identities and raw content are deterministic without transaction directory names',()=>{
  const first=fixture(),second=fixture();
  assert.deepEqual(first.document,second.document);
  assert.equal(first.document.defaultLocale,'und');
  assert(!first.entries.some(entry=>entry.id.includes('jsondoc-')));
});

test('the source mirror grants only the two reviewed JSON files and rejects other SDK sources',()=>{
  assert.throws(()=>preparePublicReferenceSourceConfig('unused','unused',['packages/plugin-sdk/src/index.ts']),/selection is invalid/u);
  const mainRoot=fileURLToPath(new URL('../',import.meta.url));
  const runtime=fs.mkdtempSync(path.join(mainRoot,'dist/json-source-test-'));
  try {
    preparePublicReferenceSourceConfig(mainRoot,runtime,[...PUBLIC_REFERENCE_JSON_RESOURCE_PATHS]);
    for(const source of PUBLIC_REFERENCE_JSON_RESOURCE_PATHS) assert(fs.readFileSync(path.join(mainRoot,source)).equals(fs.readFileSync(path.join(runtime,'source-root',source))));
    assert(!fs.existsSync(path.join(runtime,'source-root/packages/plugin-sdk/src/index.ts')));
  } finally {fs.rmSync(runtime,{recursive:true,force:true});}
});
