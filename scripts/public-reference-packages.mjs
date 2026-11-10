/**
 * @file
 * @lang zh-CN 将显式核心包的通用0.4工件接入公开参考，独立核入口/声明/字段，不执行被文档化模块。
 * @lang en Adopts generic 0.4 artifacts for explicit core packages into public reference output, independently checking entries, declarations and fields without executing documented modules.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {runDocumentationProducer} from '../packages/plugin-sdk/dist/index.js';
import {validateHiaDocument} from '../packages/core/dist/index.js';
import {validateDocSourceMap} from '../packages/source-linkage/dist/index.js';
import {getOfficialTsDocProjectProfile} from '../packages/profiles/dist/index.js';
import {auditRequiredPackages} from './audit-required-package-api.mjs';
import {verifyProjectApiProjection,assertPublicRootOmission} from './lib/core-package-api.mjs';

/**
 * @lang zh-CN 在已拥有输出根逐级建立普通目录并复制工件，支持重建，静态拒绝换向与链接；不承诺并发换向防护。
 * @lang en Creates regular directories and copies artifacts under the owned output root, supporting rebuilds while statically rejecting redirection and links; concurrent swaps are outside this guarantee.
 * @param {string} source <lang><zh-CN>已验证的生产器工件。</zh-CN><en>Validated producer artifact.</en></lang>
 * @param {string} target <lang><zh-CN>根内目标文件。</zh-CN><en>Destination file within the root.</en></lang>
 * @param {string} outputRoot <lang><zh-CN>实际输出根。</zh-CN><en>Actual output root.</en></lang>
 * @returns {void} <lang><zh-CN>原字节复制完成。</zh-CN><en>Completes an exact-byte copy.</en></lang>
 */
export function copyPackageArtifact(source,target,outputRoot) {
  const root=path.resolve(outputRoot);
  const relative=path.relative(root,path.resolve(target));
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative),'Package artifact leaves output root.');
  assert.equal(fs.realpathSync(root),root,'Package output root is redirected.');
  // <lang><zh-CN>创建前逐级核实，避免recursive mkdir先沿已有链接写出根外目录。</zh-CN><en>Check each level before creation so recursive mkdir cannot first write outside through an existing link.</en></lang>
  let parent=root;
  for(const segment of path.dirname(relative).split(path.sep).filter(segment=>segment!=='.')) {
    parent=path.join(parent,segment);
    const state=fs.lstatSync(parent,{throwIfNoEntry:false});
    if(!state) fs.mkdirSync(parent);
    else assert(state.isDirectory() && !state.isSymbolicLink(),'Package artifact directory is linked.');
  }
  const state=fs.lstatSync(target,{throwIfNoEntry:false});
  if(state) assert(state.isFile() && !state.isSymbolicLink() && state.nlink===1,'Package artifact target is linked.');
  fs.copyFileSync(source,target);
}

/**
 * @lang zh-CN 按独立包清单运行既有通用生产器，逐项核验四工件后返回现有producer-result输入。
 * @lang en Runs the existing generic producer against an independent package inventory and returns existing producer-result inputs after validating all four artifacts.
 * @param {object} options <lang><zh-CN>显式包名、已授权主仓/工具根及本次公开输出根。</zh-CN><en>Explicit package names, authorized main/tool roots, and this public output root.</en></lang>
 * @returns {Promise<object[]>} <lang><zh-CN>带精确0.4引用的现有项目输入，未授予源码读取。</zh-CN><en>Existing project inputs with exact 0.4 references, granting no source-read permission.</en></lang>
 * @throws {Error} <lang><zh-CN>选择、生产、契约、内容或输出边界不符时拒绝。</zh-CN><en>Rejects invalid selection, production, contracts, content or output boundaries.</en></lang>
 */
export async function preparePublicReferencePackageApis({packageNames,workspaceRoot,mainRoot,toolRoot,outputRoot,locales}) {
  if(packageNames===undefined) return [];
  const inventory=auditRequiredPackages(workspaceRoot,{packageNames});
  assert(inventory.packages.every(pack=>pack.owner==='main-repo'),'Public package adoption currently requires main-repo ownership.');
  // <lang><zh-CN>只加载清单已授权的工具，实际API目标由编译器静态读取；输出由同一生产器限界。
  // </zh-CN><en>Load only the allowlisted tool, reading API targets statically through the compiler under the producer's output boundary.</en></lang>
  const {tsdocProjectProducer}=await import(pathToFileURL(path.join(toolRoot,'packages/tsdoc-producer/src/index.mjs')));
  const profile=getOfficialTsDocProjectProfile('0.4.0-draft');
  const inputs=[];
  const rows=[];
  for(const pack of inventory.packages) {
    // <lang><zh-CN>每包独立结果目录保留模块边界，便于逐包验收，不能将资源或bin混算为模块覆盖。</zh-CN><en>Independent result directories retain package/module boundaries for per-package checks without counting resources or bins as module coverage.</en></lang>
    const directory=path.join(outputRoot,'.runtime','package-api',pack.name.slice(1).replaceAll('/','--'));
    const base=`package-api/${pack.name.slice(1).replaceAll('/','--')}/api`;
    const result=await runDocumentationProducer(tsdocProjectProducer,{
      workspaceRoot:mainRoot,
      outputDirectory:directory,
      inputs:[{
        kind:'typescript-project',
        paths:pack.modules.map(module=>module.path),
        artifactBasePath:base,
        title:pack.name
      }],
      profileIds:[profile.profileId],
      options:{extractionVersion:'0.4.0-draft'}
    });
    assert.equal(result.status,'success',JSON.stringify(result.diagnostics));
    assert.equal(result.artifacts.length,4,'Each package must produce all four artifacts.');
    const read=kind=>{
      const artifact=result.artifacts.find(item=>item.kind===kind);
      assert(artifact && profile.contracts.some(ref=>ref.name===artifact.contract && ref.version===artifact.contractVersion && ref.role===(kind==='tsdoc-extraction'?'consumes':'produces')),'Package artifact/profile mismatch.');
      return JSON.parse(fs.readFileSync(path.join(directory,artifact.path),'utf8'));
    };
    const extraction=read('tsdoc-extraction');
    const document=read('hia-document');
    const bridge=read('ts-jsdoc-bridge');
    const map=read('doc-source-map');
    assert.deepEqual(validateHiaDocument(document),[]);
    assert.deepEqual(validateDocSourceMap(map),[]);
    assertPublicRootOmission({extraction,document,bridge,map,result},workspaceRoot);
    const checks=verifyProjectApiProjection({modules:pack.modules,extraction,document,bridge});
    // <lang><zh-CN>工件互引使用同一公开相对路径；根与各语言目录都保留四工件，不能只复制HIA正文而丢地图。</zh-CN><en>Artifact references share canonical public relative paths; retain all four at the root and in each locale rather than copying prose while losing maps.</en></lang>
    for(const artifact of result.artifacts) for(const targetRoot of [outputRoot,...locales.map(locale=>path.join(outputRoot,locale))]) {
      const target=path.join(targetRoot,artifact.path);
      copyPackageArtifact(path.join(directory,artifact.path),target,outputRoot);
    }
    const resultPath=path.join(directory,'tsdoc.project-producer-result.json');
    assert(fs.existsSync(resultPath),'Producer result is missing.');
    inputs.push({
      kind:'documentation-producer-result',
      path:path.relative(workspaceRoot,resultPath).split(path.sep).join('/'),
      domain:'js',
      profile:{profileId:profile.profileId,profileVersion:profile.profileVersion,layer:profile.layer},
      semanticPath:[{kind:'package',id:pack.name.slice(1).replaceAll('/','--'),label:pack.name}]
    });
    rows.push({
      name:pack.name,
      directory:'.',
      documentPath:result.artifacts.find(item=>item.kind==='hia-document').path,
      ...checks,
      modules:extraction.modules,
      remainingResourceOrCommandEntries:pack.entries
        .filter(entry=>['json-resource','command'].includes(entry.kind))
        .map(({subpath,kind})=>({subpath,kind}))
    });
  }
  fs.mkdirSync(path.join(outputRoot,'package-api'),{recursive:true});
  const reportPath=path.join(outputRoot,'package-api/adoption.json');
  const reportState=fs.lstatSync(reportPath,{throwIfNoEntry:false});
  if(reportState) assert(reportState.isFile() && !reportState.isSymbolicLink() && reportState.nlink===1,'Package report target is linked.');
  fs.writeFileSync(reportPath,JSON.stringify({description:'显式核心模块采用；不代表资源/bin/全部45包或发行验收',profileVersion:profile.profileVersion,rows},null,2)+'\n');
  return inputs;
}

/**
 * @lang zh-CN 对实际参考条目核逐声明、字段、签名、来源及公开绑定，不用数量替代映射。
 * @lang en Checks actual reference entries against declarations, fields, signatures, sources and public bindings rather than substituting counts for mappings.
 * @param {object} data <lang><zh-CN>已核包工件及当前规范条目。</zh-CN><en>Verified package artifacts and current canonical entries.</en></lang>
 * @returns {void} <lang><zh-CN>缺失或改写即抛错。</zh-CN><en>Throws on missing or changed content.</en></lang>
 */
export function assertPackageApiEntries({row,document,entries}) {
  const relevant=entries.filter(entry=>entry.input?.path===row.documentPath && entry.semanticPath?.some(segment=>segment.kind==='package' && segment.label===row.name));
  const indexed=new Map(relevant.map(entry=>[entry.symbolId,entry]));
  assert.equal(indexed.size,relevant.length,'Duplicate package entry.');
  assert.equal(indexed.size,document.symbols.length,'Missing package declaration.');
  for(const symbol of document.symbols) {
    const entry=indexed.get(symbol.id);
    assert(entry,'Missing package declaration.');
    assert.equal(entry.name,symbol.name);
    assert.equal(entry.signature??'',symbol.signature??'');
    assert.equal(entry.summary??'',symbol.summary??'');
    if(symbol.i18n) assert.deepEqual(entry.i18n,symbol.i18n,'Package field changed.');
    assert.equal(entry.source?.path,symbol.source?.definedIn?.relativePath,'Package source changed.');
    assert.deepEqual(entry.source?.range,symbol.source?.definedIn?.range,'Package source range changed.');
    assert.equal(entry.profile?.profileVersion,'0.4.0-draft','Package profile changed.');
  }
  for(const module of row.modules) for(const binding of module.exports) assert(binding.symbolIds.length && binding.symbolIds.every(id=>indexed.has(id)),'Missing public package binding.');
}

/**
 * @lang zh-CN 上传前重读真实工件、独立入口及索引，旧构建不能借用汇总掩盖缺包。
 * @lang en Rereads actual artifacts, independent entries and indexes before upload so summaries cannot conceal missing packages.
 * @param {object} definition <lang><zh-CN>显式公开构建清单。</zh-CN><en>Explicit public build definition.</en></lang>
 * @param {string} outputRoot <lang><zh-CN>本次实际公开工件根。</zh-CN><en>Actual public artifact root.</en></lang>
 * @param {string} locale <lang><zh-CN>当前清单明确声明的语言目录。</zh-CN><en>Locale directory explicitly declared by the definition.</en></lang>
 * @returns {void} <lang><zh-CN>逐绑定/工件/条目都通过后返回。</zh-CN><en>Returns after every binding, artifact and entry passes.</en></lang>
 * @throws {Error} <lang><zh-CN>拒绝路径、契约、绑定、字段、来源或文件缺失/变更。</zh-CN><en>Rejects changed or missing paths, contracts, bindings, fields, sources or files.</en></lang>
 */
export function checkPublicReferencePackageApis(definition,outputRoot,locale) {
  if(!definition.packageApis) return;
  const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
  const report=read(path.join(outputRoot,'package-api/adoption.json'));
  assert.deepEqual(report.rows.map(row=>row.name).sort(),[...definition.packageApis].sort());
  const entries=read(path.join(outputRoot,locale,'project-index.json')).entries;
  // <lang><zh-CN>重新读取实际包入口，不能让产物中的汇总清单成为自己的唯一覆盖证明。</zh-CN><en>Reread actual package entries so an artifact summary cannot be its sole coverage proof.</en></lang>
  const inventory=auditRequiredPackages(fileURLToPath(new URL('../../',import.meta.url)),{packageNames:definition.packageApis});
  const profile=getOfficialTsDocProjectProfile('0.4.0-draft');
  for(const row of report.rows) {
    const base=`package-api/${row.name.slice(1).replaceAll('/','--')}/api`;
    assert.equal(row.directory,'.');
    assert.equal(row.documentPath,base+'.hia.json');
    const document=read(path.join(outputRoot,row.directory,row.documentPath));
    const extraction=read(path.join(outputRoot,base+'.tsdoc.json'));
    const bridge=read(path.join(outputRoot,base+'.jsdoc-bridge.json'));
    const map=read(path.join(outputRoot,base+'.docmap.json'));
    assert.equal(extraction.contractVersion,profile.profileVersion);
    assert.equal(bridge.contractVersion,profile.profileVersion);
    assert.equal(map.contractVersion,profile.contracts.find(ref=>ref.name==='doc-source-map').version);
    assert.deepEqual(validateHiaDocument(document),[]);
    assert.deepEqual(validateDocSourceMap(map),[]);
    verifyProjectApiProjection({modules:inventory.packages.find(pack=>pack.name===row.name).modules,extraction,document,bridge});
    assert.deepEqual(row.modules,extraction.modules,'Package binding report changed.');
    for(const suffix of ['.hia.json','.tsdoc.json','.jsdoc-bridge.json','.docmap.json']) assert(fs.readFileSync(path.join(outputRoot,base+suffix)).equals(fs.readFileSync(path.join(outputRoot,locale,base+suffix))),'Localized package artifact changed.');
    assertPackageApiEntries({row,document,entries});
    for(const entry of entries.filter(item=>item.semanticPath?.some(segment=>segment.kind==='package' && segment.label===row.name))) {
      assert(fs.existsSync(path.join(outputRoot,locale,entry.contentPath)),'Missing package content page.');
      if(entry.docSourceMap) assert(fs.existsSync(path.join(outputRoot,locale,entry.docSourceMap.path)),'Missing package source map.');
    }
  }
}
