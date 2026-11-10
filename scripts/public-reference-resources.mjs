/**
 * @file
 * @lang zh-CN 用既有JSONdoc生产显式公开资源，保留逐值/字节与精确来源；不执行schema引用或目标代码。
 * @lang en Produces explicit public resources through existing JSONdoc, preserving values, bytes and exact provenance without executing schema references or target code.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {jsonDocumentationProducer} from '../packages/jsondoc/dist/index.js';
import {runDocumentationProducer,validateDocumentationProducerResult} from '../packages/plugin-sdk/dist/index.js';
import {auditRequiredPackages} from './audit-required-package-api.mjs';
import {readJsonResourceBytes,inspectJsonResource} from './lib/json-resource-audit.mjs';
import {verifyJsonResourceProjection} from './lib/json-resource-projection.mjs';
import {assertPublicRootOmission} from './lib/core-package-api.mjs';
import {copyPackageArtifact} from './public-reference-packages.mjs';
import {PUBLIC_REFERENCE_JSON_RESOURCE_PATHS} from './public-reference-source.mjs';

/**
 * @lang zh-CN 宿主重定位已验证的JSON生产工件，原三工件不改字节；稳定地址与随机事务目录分离。
 * @lang en Relocates verified JSON producer artifacts without changing their bytes, separating stable publication addresses from random transaction directories.
 * @param {object} options <lang><zh-CN>显式包范围、主仓和输出根以及语言目录。</zh-CN><en>Explicit package scope, repository/output roots, and locale directories.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>既有项目输入和精确两文件来源授权清单。</zh-CN><en>Existing project inputs and the exact two-file source authorization list.</en></lang>
 * @throws {Error} <lang><zh-CN>入口、权限、生产、原文或定位不符时拒绝。</zh-CN><en>Rejects inconsistent entries, authorization, production, original bytes or locations.</en></lang>
 */
export async function preparePublicReferenceResources({packageNames,workspaceRoot,mainRoot,outputRoot,locales}) {
  if(packageNames===undefined) return {inputs:[],sourcePaths:[]};
  const inventory=auditRequiredPackages(workspaceRoot,{packageNames});
  assert(inventory.packages.every(pack=>pack.owner==='main-repo'),'Resource publication currently requires main-repo ownership.');
  const inputs=[];
  const rows=[];
  const sourcePaths=[];
  for(const pack of inventory.packages) {
    const resources=pack.entries.filter(entry=>entry.kind==='json-resource');
    assert(resources.length,'Selected package has no JSON resources.');
    for(const resource of resources) {
      // <lang><zh-CN>真实导出目标才是公开原文与行号来源，额外路径必须先经过明确公开审核。</zh-CN><en>The actual exported target supplies public bytes and line numbers; additional paths require explicit publication review first.</en></lang>
      const source=path.posix.join(pack.directory,resource.target);
      assert(PUBLIC_REFERENCE_JSON_RESOURCE_PATHS.includes(source),'Resource source is not publication-approved.');
      const bytes=readJsonResourceBytes(mainRoot,source);
      const expected={source,...inspectJsonResource(bytes)};
      const token=resource.subpath.replace(/^\.\//u,'');
      const prefix=`package-resources/${pack.name.slice(1).replaceAll('/','--')}/${token}`;
      const directory=path.join(outputRoot,'.runtime','resource-native',token);
      const result=await runDocumentationProducer(jsonDocumentationProducer,{
        workspaceRoot:mainRoot,
        outputDirectory:directory,
        inputs:[{kind:'json-resource',path:source,locale:'und'}]
      });
      assert.equal(result.status,'success',JSON.stringify(result.diagnostics));
      assert.equal(result.artifacts.length,3);
      const artifact=kind=>result.artifacts.find(item=>item.kind===kind);
      const document=JSON.parse(fs.readFileSync(path.join(directory,artifact('hia-document').path),'utf8'));
      const map=JSON.parse(fs.readFileSync(path.join(directory,artifact('doc-source-map').path),'utf8'));
      const snapshot=fs.readFileSync(path.join(directory,artifact('json-resource').path));
      const checked=verifyJsonResourceProjection(expected,document,map,snapshot);
      assertPublicRootOmission({document,map,result},workspaceRoot);
      // <lang><zh-CN>保持原文件名及同目录互引，只重定位结果中的工件地址，三个原生文件均按原字节复制。</zh-CN><en>Keep original filenames and sibling references, relocating only result artifact addresses and copying all three native files byte for byte.</en></lang>
      const rebased={...result,artifacts:result.artifacts.map(item=>({...item,path:`${prefix}/${path.posix.basename(item.path)}`}))};
      assert.deepEqual(validateDocumentationProducerResult(rebased,{descriptor:jsonDocumentationProducer.descriptor}),[]);
      const inputRoot=path.join(outputRoot,'.runtime','resource-inputs',token);
      for(const [index,item] of result.artifacts.entries()) {
        for(const targetRoot of [outputRoot,...locales.map(locale=>path.join(outputRoot,locale)),inputRoot]) {
          copyPackageArtifact(path.join(directory,item.path),path.join(targetRoot,rebased.artifacts[index].path),outputRoot);
        }
      }
      const resultPath=path.join(inputRoot,'result.json');
      fs.writeFileSync(resultPath,JSON.stringify(rebased),{flag:'wx'});
      inputs.push({
        kind:'documentation-producer-result',
        path:path.relative(workspaceRoot,resultPath).split(path.sep).join('/'),
        domain:'other',
        semanticPath:[
          {kind:'package',id:`${pack.name.slice(1).replaceAll('/','--')}--resources`,label:pack.name},
          {kind:'contract',id:token,label:resource.subpath}
        ]
      });
      sourcePaths.push(source);
      rows.push({package:pack.name,subpath:resource.subpath,source,prefix,sha256:expected.sha256,schemaId:expected.schemaId,dialect:expected.dialect,locale:'und',...checked,artifacts:rebased.artifacts});
    }
  }
  // <lang><zh-CN>报告沿用受控复制边界，普通重建可替换，链接/硬链接目标仍拒绝。</zh-CN><en>The report shares the controlled copy boundary, allowing regular rebuilds while rejecting linked or hard-linked targets.</en></lang>
  const reportPath=path.join(outputRoot,'.runtime','resource-adoption.json');
  fs.writeFileSync(reportPath,JSON.stringify({description:'实际公开导出JSON资源采用；引用仅词法，未执行schema求值',rows},null,2)+'\n',{flag:'wx'});
  for(const targetRoot of [outputRoot,...locales.map(locale=>path.join(outputRoot,locale))]) copyPackageArtifact(reportPath,path.join(targetRoot,'package-resources/adoption.json'),outputRoot);
  return {inputs,sourcePaths};
}

/**
 * @lang zh-CN 核对实际资源条目，原签名、类型、父项与范围不能由数量或摘要替代。
 * @lang en Verifies actual resource entries without substituting counts or summaries for signatures, types, parents and ranges.
 * @param {object} data <lang><zh-CN>资源记录、原生文档和规范条目。</zh-CN><en>Resource record, native document, and canonical entries.</en></lang>
 * @returns {void} <lang><zh-CN>所有值一致后返回。</zh-CN><en>Returns when all values match.</en></lang>
 * @throws {Error} <lang><zh-CN>缺值、改值、错误来源或层级时拒绝。</zh-CN><en>Rejects missing or altered values, sources or hierarchy.</en></lang>
 */
export function assertResourceEntries({row,document,entries}) {
  const relevant=entries.filter(entry=>entry.input?.path===`${row.prefix}/resource-001.hia.json`);
  const indexed=new Map(relevant.map(entry=>[entry.symbolId,entry]));
  assert.equal(indexed.size,relevant.length,'Duplicate resource entry.');
  assert.equal(indexed.size,document.symbols.length,'Missing resource value.');
  for(const symbol of document.symbols) {
    const entry=indexed.get(symbol.id);
    assert(entry,'Missing resource value.');
    assert.equal(entry.name,symbol.name);
    assert.equal(entry.kind,symbol.kind);
    assert.equal(entry.signature,symbol.signature,'Resource lexeme changed.');
    assert.equal(entry.hierarchy?.parentSymbolId,symbol.parentId,'Resource parent changed.');
    assert.equal(entry.source?.path,row.source,'Resource source changed.');
    // <lang><zh-CN>1.1地图保留完整声明行列；来源展示按既有400行窗口裁剪，两种范围分别核验。</zh-CN><en>The 1.1 map retains complete declaration coordinates, while source presentation uses its existing 400-line window; verify the ranges independently.</en></lang>
    assert.deepEqual(entry.docSourceMap?.sourceRange,symbol.source.definedIn.range,'Resource declared range changed.');
    assert.equal(entry.docSourceMap?.sourcePath,row.source,'Resource mapped source changed.');
    const original=symbol.source.definedIn.range;
    const visible=entry.source?.range;
    assert.equal(visible?.start.line,original.start.line,'Resource preview start changed.');
    assert(visible.end.line>=visible.start.line && visible.end.line<=Math.min(original.end.line,visible.start.line+399),'Resource preview window changed.');
  }
}

/**
 * @lang zh-CN 上传前重读真实导出资源、独立逐值审核和语言目录副本，验证原字节/地图/页面。
 * @lang en Rechecks actual exports, independent per-value audits and locale copies before upload, verifying bytes, maps and pages.
 * @param {object} definition <lang><zh-CN>显式构建范围。</zh-CN><en>Explicit build scope.</en></lang>
 * @param {string} outputRoot <lang><zh-CN>实际公开工件根。</zh-CN><en>Actual public artifact root.</en></lang>
 * @param {string} locale <lang><zh-CN>当前界面目录语言。</zh-CN><en>Current UI directory locale.</en></lang>
 * @returns {void} <lang><zh-CN>范围及全部值通过后返回。</zh-CN><en>Returns after scope and all values pass.</en></lang>
 * @throws {Error} <lang><zh-CN>资源缺失、原文或声明范围改变、预览字节不一致时拒绝。</zh-CN><en>Rejects missing resources, changed original bytes or declaration ranges, and inconsistent preview bytes.</en></lang>
 */
export function checkPublicReferenceResources(definition,outputRoot,locale) {
  if(!definition.packageResources) return;
  const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const mainRoot=fileURLToPath(new URL('../',import.meta.url));
  const inventory=auditRequiredPackages(path.dirname(mainRoot),{packageNames:definition.packageResources});
  const report=read(path.join(outputRoot,'package-resources/adoption.json'));
  const expectedResources=inventory.packages.flatMap(pack=>pack.entries.filter(entry=>entry.kind==='json-resource').map(entry=>({pack,entry})));
  assert.equal(report.rows.length,expectedResources.length);
  const index=read(path.join(outputRoot,locale,'project-index.json'));
  const entries=index.entries;
  // <lang><zh-CN>导航DOM按节点身份缓存，资源组必须与同包模块组分离，否则会显示错误子树。</zh-CN><en>Navigation DOM caches by node identity, so resource groups must be distinct from module groups of the same package to avoid displaying the wrong subtree.</en></lang>
  const navigationNodes=[...(index.navigationTree ?? [])];
  for(const node of navigationNodes) navigationNodes.push(...(node.children ?? []));
  const navigationIds=navigationNodes.map(node=>node.id);
  assert.equal(new Set(navigationIds).size,navigationIds.length,'Duplicate navigation identity.');
  for(const {pack,entry:resource} of expectedResources) {
    const row=report.rows.find(item=>item.package===pack.name&&item.subpath===resource.subpath);
    assert(row,'Missing resource export.');
    assert.equal(row.source,path.posix.join(pack.directory,resource.target));
    assert(PUBLIC_REFERENCE_JSON_RESOURCE_PATHS.includes(row.source));
    assert.equal(row.prefix,`package-resources/${pack.name.slice(1).replaceAll('/','--')}/${resource.subpath.replace(/^\.\//u,'')}`);
    const bytes=readJsonResourceBytes(mainRoot,row.source);
    const expected={source:row.source,...inspectJsonResource(bytes)};
    assert.equal(row.sha256,expected.sha256);
    assert.equal(row.schemaId,expected.schemaId);
    const document=read(path.join(outputRoot,row.prefix,'resource-001.hia.json'));
    const map=read(path.join(outputRoot,row.prefix,'resource-001.doc-source-map.json'));
    const snapshot=fs.readFileSync(path.join(outputRoot,row.prefix,'resource-001.source.json'));
    verifyJsonResourceProjection(expected,document,map,snapshot);
    assert.equal(document.defaultLocale,'und');
    assertResourceEntries({row,document,entries});
    for(const artifact of row.artifacts) assert(fs.readFileSync(path.join(outputRoot,artifact.path)).equals(fs.readFileSync(path.join(outputRoot,locale,artifact.path))),'Localized resource artifact changed.');
    for(const item of entries.filter(item=>item.input?.path===`${row.prefix}/resource-001.hia.json`)) {
      assert(fs.existsSync(path.join(outputRoot,locale,item.contentPath)),'Missing resource content page.');
      assert(item.source?.publicAsset,'Missing authorized resource source asset.');
      assert(fs.existsSync(path.join(outputRoot,locale,item.docSourceMap.path)),'Missing resource map.');
      // <lang><zh-CN>预览也须来自同一原始快照，构建期间文件变化不能使正文与公开源码分属两版。</zh-CN><en>Preview bytes must come from the same original snapshot so edits during a build cannot mix prose and public source revisions.</en></lang>
      const asset=item.source.publicAsset;
      assert(/^sources\/[a-f0-9]{64}\.txt$/u.test(asset.relativeUrl),'Unsafe resource source asset path.');
      const range=item.source.range;
      const expectedText=snapshot.toString('utf8').split(/\r?\n/u).slice(range.start.line-1,range.end.line).join('\n');
      const actualText=fs.readFileSync(path.join(outputRoot,locale,asset.relativeUrl),'utf8');
      assert.equal(actualText,expectedText,'Resource preview bytes changed.');
      assert.equal(asset.lineCount,range.end.line-range.start.line+1,'Resource preview line count changed.');
      // <lang><zh-CN>两种界面的静态页都须能按实际两层目录进入生成源码页，不能用标签或摘要替代路由。</zh-CN><en>Both UI locales must resolve their two-level static routes to the emitted source viewer; labels and digests cannot substitute for routing.</en></lang>
      for(const page of item.noScriptLocalePages ?? []) {
        const html=fs.readFileSync(path.join(outputRoot,locale,page.path),'utf8');
        assert(html.includes(`href="../../${item.source.linkUrl}"`),'Localized resource source link changed.');
      }
    }
  }
}
