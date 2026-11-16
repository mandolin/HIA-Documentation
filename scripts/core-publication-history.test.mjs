/**
 * @file
 * @lang zh-CN 持久发布登记必须跨坐标变化保持身份，并拒绝不确定匹配。
 * @lang en Persistent publication registries retain identities across coordinate changes and reject uncertain matching.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCorePublicationDeclarations,bindCorePublicationHistory} from './core-publication-history.mjs';

/** @lang zh-CN 独立构造原生结构槽位，不依赖生产输出。 @lang en Construct independent native slots without production outputs. */
function fixture(prefix='old') {
  return [{input:'package-api/example/api.hia.json',document:{symbols:[0,1].map(index=>({id:prefix+index,name:'type',kind:'typedef',signature:'string',source:{definedIn:{relativePath:'src/index.ts',range:{start:{line:1,column:1}}}},metadata:{tsdoc:{modulePath:'src/index.ts',typeExpression:{operator:'opaque',argumentIndex:index}}}}))}}];
}

test('exact structural slots retain public identities across native offsets and order',()=>{
  const original=collectCorePublicationDeclarations(fixture());
  const registry={schemaVersion:'0.1.0-draft',declarations:original.map(row=>({proof:row.proof,entryId:row.entryId})),history:{contract:'documentation-project-route-history',contractVersion:'0.1.0-draft',projectId:'example',sources:[{repository:'owner/example',commit:'a'.repeat(40),locale:'en',indexSha256:'b'.repeat(64)}],entryAliases:[],pathAliases:[]}};
  const next=fixture('new');
  next[0].document.symbols.reverse();
  next[0].document.symbols.forEach(symbol=>symbol.source.definedIn.range.start.line=90);
  const history=bindCorePublicationHistory(registry,collectCorePublicationDeclarations(next));
  assert.deepEqual(history.bindings.map(row=>row.entryId),original.map(row=>row.entryId));
  assert(history.bindings.every(row=>row.symbolId.startsWith('new')));
  assert.throws(()=>bindCorePublicationHistory(registry,original.slice(1)),/inventory changed/u);
  assert.throws(()=>bindCorePublicationHistory({...registry,schemaVersion:'unknown'},original),/version/u);
  const changed=fixture(); changed[0].document.symbols[0].signature='number';
  assert.throws(()=>bindCorePublicationHistory(registry,collectCorePublicationDeclarations(changed)),/changed/u);
  const duplicate=fixture(); duplicate[0].document.symbols[1].metadata.tsdoc.typeExpression.argumentIndex=0;
  assert.throws(()=>collectCorePublicationDeclarations(duplicate),/Ambiguous/u);
  const missing=fixture(); missing[0].document.symbols[0].parentId='missing';
  assert.throws(()=>collectCorePublicationDeclarations(missing),/ancestor/u);
});
