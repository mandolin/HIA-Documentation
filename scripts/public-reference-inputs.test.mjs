/**
 * @file
 * @lang zh-CN 固定公开参考输入类型与语义锚点回归，不需要相邻工具仓或网络。
 * @lang en Regresses fixed public reference input kinds and semantic anchors without sibling tools or network access.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertProducerContributions} from './check-public-reference-build.mjs';

const definition=JSON.parse(fs.readFileSync(new URL('../reference/public-reference-build.definition.json',import.meta.url),'utf8'));
const htmlEntries=['html-component-alert','html-attr-variant','html-slot-default','html-event-close','html-stylehook-alert','html-a11y-role-status'].map(id=>'hia-document:'+id);

test('the fixed HTML fragment uses the explicit fragment input mode',()=>{
  const producer=definition.producers.find(item=>item.id==='htmdoc-basic-html');
  assert.equal(producer.inputs[0].path,'fixtures/basic.html');
  assert.equal(producer.inputs[0].kind,'html-fragment');
});

test('the reference gate requires all six fixed HTML declarations',()=>{
  for(const entry of htmlEntries)assert(definition.acceptance.requiredEntryIds.includes(entry),entry);
  assert(definition.acceptance.minimumEntryCounts.html>=12);
});

test('each explicit producer must contribute actual canonical entries',()=>{
  const scope={producers:[{id:'html'},{id:'css'}]};
  assert.doesNotThrow(()=>assertProducerContributions(scope,[{input:{path:'.hia-producers/html/input.hia.json'}},{input:{path:'.hia-producers/css/input.hia.json'}}],'en'));
  assert.throws(()=>assertProducerContributions(scope,[{input:{path:'.hia-producers/css/input.hia.json'}}],'en'),/producer html contains no canonical/u);
});

test('similar prefixes and body-free source probes cannot conceal an empty producer',()=>{
  const scope={producers:[{id:'html'}]};
  for(const entries of [[],[{}],[{input:{path:'.hia-producers/html-other/input.hia.json'}}],[{input:{path:'other/.hia-producers/html/input.hia.json'}}]]) {
    assert.throws(()=>assertProducerContributions(scope,entries,'zh-CN'),/producer html contains no canonical/u);
  }
});
