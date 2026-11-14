/**
 * @file
 * @lang zh-CN 固定公开参考输入类型与语义锚点回归，不需要相邻工具仓或网络。
 * @lang en Regresses fixed public reference input kinds and semantic anchors without sibling tools or network access.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertProducerContributions} from './check-public-reference-build.mjs';
import {preparePublicReferenceSiteNavigation} from './public-reference-source.mjs';
import {createGeneratedSiteNavigation} from '../site/src/lib/generated-navigation.mjs';
import {assertPublicReferenceTopicUi} from './public-reference-ui.mjs';

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

test('normal public reference builds adopt the confirmed website navigation by default', async () => {
  assert.deepEqual(await preparePublicReferenceSiteNavigation(), createGeneratedSiteNavigation());
});

test('explicit navigation is bounded and validated before production starts', async t => {
  // <lang><zh-CN>隔离输入文件仅属于本用例，结束时清理；不触及真实公开产物。</zh-CN><en>Isolate input files within this test and clean them afterwards without touching real public artifacts.</en></lang>
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hia-reference-navigation-'));
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const input = path.join(directory, 'navigation.json');
  const navigation = createGeneratedSiteNavigation('/HIA-Documentation/', '/HIA-Documentation-API-JavaScript/');
  fs.writeFileSync(input, JSON.stringify(navigation));
  assert.deepEqual(await preparePublicReferenceSiteNavigation(input), navigation);
  navigation.brand.title = 'K:/private-navigation';
  fs.writeFileSync(input, JSON.stringify(navigation));
  await assert.rejects(preparePublicReferenceSiteNavigation(input));
  fs.writeFileSync(input, '{}');
  await assert.rejects(preparePublicReferenceSiteNavigation(input));
  fs.writeFileSync(input, ' '.repeat(512 * 1024 + 1));
  await assert.rejects(preparePublicReferenceSiteNavigation(input), /read budget/u);
});

test('both publication workflows check out the theme revision required by the current owner lock', () => {
  // <lang><zh-CN>实际发布锁是固定来源；两个主站构建须使用同一主题，防止新归档来源不可得。</zh-CN><en>The actual release lock pins provenance, so both main-site builds must use that same theme revision.</en></lang>
  for (const name of ['schema-pages.yml', 'public-reference-build.yml']) {
    // <lang><zh-CN>换行归一后核同一Git来源，兼容Windows工作树的CRLF表示。</zh-CN><en>Normalize line endings before checking Git provenance, accommodating CRLF Windows worktrees.</en></lang>
    const workflow = fs.readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
    const block = workflow.split(/\n\s+- name:/u).find(step => step.includes('repository: mandolin/jsdoc-theme-hia\n'));
    assert.match(block, /ref: 3633456110b671ac0c21ef300a779dccbe79c1e3/u);
  }
});

test('online and offline topic gates require the actual renderer heading and assembly metadata', () => {
  const assembly = '<dt data-hia-ui-message="portal.metadata.assembly">Assembly</dt>';
  const legacy = '<h2 data-hia-ui-message="portal.section.localizedfields">Fields</h2>';
  const shared = '<section data-hia-reading-section="fields">Fields</section>';
  assert.doesNotThrow(() => assertPublicReferenceTopicUi('<html data-hia-site-navigation>', shared+assembly, 'en'));
  assert.doesNotThrow(() => assertPublicReferenceTopicUi('<html>', legacy+assembly, 'en'));
  assert.throws(() => assertPublicReferenceTopicUi('<html data-hia-site-navigation>', shared, 'en'));
  assert.throws(() => assertPublicReferenceTopicUi('<html data-hia-site-navigation>', assembly, 'en'));
  assert.throws(() => assertPublicReferenceTopicUi('<html>', shared+assembly, 'en'));
  for (const [locale,label] of [['en','Assembly'],['zh-CN','程序集']]) {
    assert.doesNotThrow(() => assertPublicReferenceTopicUi('<html data-hia-site-navigation>', shared+`<dt><span>${label}</span></dt><dd>HiaDocumentationSample</dd>`, locale));
    assert.throws(() => assertPublicReferenceTopicUi('<html data-hia-site-navigation>', shared+`<p>${label} HiaDocumentationSample</p>`, locale));
    assert.throws(() => assertPublicReferenceTopicUi('<html data-hia-site-navigation>', shared+`<dt><span>${label}</span></dt><dd></dd>`, locale));
  }
});
