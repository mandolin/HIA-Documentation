/**
 * @file
 * @lang zh-CN 首批核心SDK站点采用的显式范围和完整绑定回归。
 * @lang en Regressions for explicit scope and complete bindings in the first core SDK site adoption.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditRequiredPackages} from './audit-required-package-api.mjs';
import {assertPackageApiEntries,copyPackageArtifact} from './public-reference-packages.mjs';

test('the public reference explicitly adopts the SDK without replacing its legacy sample',()=>{
  const definition=JSON.parse(fs.readFileSync(new URL('../reference/public-reference-build.definition.json',import.meta.url),'utf8'));
  assert.deepEqual(definition.packageApis,['@hia-doc/plugin-sdk']);
  assert.equal(definition.producers.find(item=>item.id==='main-repo-plugin-sdk-tsdoc').inputs[0].kind,'typescript-entry');
});

test('package selections reject empty, duplicate and unknown names before auditing',()=>{
  for(const packageNames of [[],['@hia-doc/plugin-sdk','@hia-doc/plugin-sdk'],['unknown'],null]) assert.throws(()=>auditRequiredPackages(fileURLToPath(new URL('../../',import.meta.url)),{packageNames}),/Invalid package audit selection/u);
});

test('artifact copies allow rebuilds and reject escapes, linked parents and hard-linked files',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hia-package-copy-'));
  const output=path.join(root,'output'),outside=path.join(root,'outside');
  fs.mkdirSync(output);fs.mkdirSync(outside);
  const source=path.join(root,'source.json');fs.writeFileSync(source,'public artifact');
  try {
    const target=path.join(output,'package-api','artifact.json');
    copyPackageArtifact(source,target,output);
    copyPackageArtifact(source,target,output);
    assert.equal(fs.readFileSync(target,'utf8'),'public artifact');
    assert.throws(()=>copyPackageArtifact(source,path.join(outside,'escaped.json'),output));
    const linked=path.join(output,'linked');fs.symlinkSync(outside,linked,process.platform==='win32'?'junction':'dir');
    assert.throws(()=>copyPackageArtifact(source,path.join(linked,'child','artifact.json'),output));
    assert.equal(fs.existsSync(path.join(outside,'child')),false);
    const hardLink=path.join(output,'hard.json');fs.linkSync(source,hardLink);
    assert.throws(()=>copyPackageArtifact(source,hardLink,output));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('package site coverage rejects declaration, binding, field, signature and source losses',()=>{
  const row={name:'@hia-doc/plugin-sdk',documentPath:'api.hia.json',modules:[{path:'public.ts',exports:[{name:'visible',symbolIds:['symbol:public']}]}]};
  const document={symbols:[{id:'symbol:public',name:'visible',signature:'visible(): void',summary:'Public prose.',i18n:{fields:{description:{localizedText:{en:'Public prose.','zh-CN':'公开说明。'}}}},source:{definedIn:{relativePath:'public.ts',range:{start:{line:1},end:{line:2}}}}}]};
  const entry={id:'entry:public',symbolId:'symbol:public',name:'visible',signature:'visible(): void',summary:'Public prose.',i18n:structuredClone(document.symbols[0].i18n),input:{path:'api.hia.json'},semanticPath:[{kind:'package',id:'sdk',label:row.name}],profile:{profileVersion:'0.4.0-draft'},source:{path:'public.ts',range:{start:{line:1},end:{line:2}}}};
  assert.doesNotThrow(()=>assertPackageApiEntries({row,document,entries:[entry]}));
  for(const patch of [{signature:'other()'},{source:{path:'other.ts'}},{i18n:{fields:{}}},{profile:{profileVersion:'0.1.0-draft'}},{semanticPath:[]}]) assert.throws(()=>assertPackageApiEntries({row,document,entries:[{...entry,...patch}]}));
  assert.throws(()=>assertPackageApiEntries({row,document,entries:[]}));
  const missingBinding=structuredClone(row);missingBinding.modules[0].exports[0].symbolIds=['absent'];
  assert.throws(()=>assertPackageApiEntries({row:missingBinding,document,entries:[entry]}),/Missing public package binding/u);
});

test('an explicit SDK-only audit retains all three actual public modules',()=>{
  const inventory=auditRequiredPackages(fileURLToPath(new URL('../../',import.meta.url)),{packageNames:['@hia-doc/plugin-sdk']});
  assert.equal(inventory.packages.length,1);
  assert.equal(inventory.packages[0].name,'@hia-doc/plugin-sdk');
  assert.equal(inventory.packages[0].modules.length,3);
  assert.equal(inventory.summary.exports,50);
  assert.equal(inventory.packages[0].entries.filter(item=>item.kind==='json-resource').length,2);
});
