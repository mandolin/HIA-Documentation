/** @file @lang zh-CN 显式首方元数据依赖授权和受限Node导出解析；不执行模块。 @lang en Explicit first-party metadata authorization and bounded Node export resolution without module execution. */
import assert from "node:assert/strict";
import path from "node:path";
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
import {readJsonResourceBytes} from "./json-resource-audit.mjs";

/**
 * @lang zh-CN 按调用者显式包名、版本、根和metadata子路径构造本次授权；缺省不授予权限。
 * @lang en Creates per-invocation authority from explicit package names, versions, roots and metadata subpaths; defaults grant no authority.
 * @param {string} root <lang><zh-CN>本次已授权物理源码根。</zh-CN><en>Authorized physical source root for this invocation.</en></lang>
 * @param {object} [options] <lang><zh-CN>authorizedPackages为至多32个精确授权，root相对输入根。</zh-CN><en>authorizedPackages holds up to 32 exact grants with roots relative to the input root.</en></lang>
 * @returns {object|undefined} <lang><zh-CN>解析器与实际使用的manifest/解析记录，缺省undefined。</zh-CN><en>Resolver and actually used manifest/resolution records, or undefined by default.</en></lang>
 * @throws {Error} <lang><zh-CN>授权、版本、导出或物理边界不合法，固定错误不含私有根。</zh-CN><en>Invalid authority, version, exports or physical boundaries produce a fixed error omitting private roots.</en></lang>
 */
export function createMetadataDependencyPolicy(root,options={}) {
  if(options?.authorizedPackages===undefined) return undefined;
  // <lang><zh-CN>授权只在当前调用存活，manifest缓存按原字节摘要校验，避免跨请求权限污染。</zh-CN><en>Authority lives only for this invocation; manifest caches bind original byte digests to prevent cross-request authority leakage.</en></lang>
  const requested=options.authorizedPackages;
  const grants=[];
  const manifests=new Map(),resolutions=new Map(),names=new Set(),roots=new Set();
  const require=createRequire(import.meta.url);
  /** @lang zh-CN 用固定错误拒绝，不回显主机路径或Node异常。 @lang en Rejects with a fixed error without exposing host paths or Node exceptions. */
  function reject(){throw new Error("Metadata dependency rejected.");}
  /** @lang zh-CN 根内规范相对路径用于来源身份，禁止点段、编码与URL。 @lang en Canonical root-relative paths identify sources, excluding dot segments, encodings and URLs. */
  function relative(value) {
    if(typeof value!=="string"||!value||/[\\:%?#\u0000-\u001f\u007f]/.test(value)||path.posix.normalize(value)!==value||value.split("/").some(part=>!part||part==="."||part==="..")||path.isAbsolute(value)) reject();
    return value;
  }
  if(!Array.isArray(requested)||requested.length>32) reject();
  for(const grant of requested) {
    if(!grant||Object.keys(grant).sort().join(",")!=="name,root,subpaths,version"||!/^@hia-doc\/[a-z0-9][a-z0-9-]*$/.test(grant.name)||typeof grant.version!=="string"||!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(grant.version)||!Array.isArray(grant.subpaths)||grant.subpaths.length!==1||grant.subpaths[0]!=="./metadata") reject();
    relative(grant.root);
    if(names.has(grant.name)||roots.has(grant.root)) reject();
    names.add(grant.name);roots.add(grant.root);
    // <lang><zh-CN>复制授权字段，调用者后续修改配置不会扩大本次权限。</zh-CN><en>Snapshot grant fields so later caller mutations cannot widen this invocation's authority.</en></lang>
    grants.push({name:grant.name,version:grant.version,root:grant.root,subpaths:["./metadata"]});
  }
  /**
   * @lang zh-CN 解析唯一授权metadata子路径，实际读取manifest并用Node确认精确mjs文件。
   * @lang en Resolves one authorized metadata subpath, reading the actual manifest and confirming its exact mjs file through Node.
   * @param {string} specifier <lang><zh-CN>确切裸包metadata引用。</zh-CN><en>Exact bare-package metadata reference.</en></lang>
   * @param {string} importer <lang><zh-CN>根内导入模块。</zh-CN><en>Root-relative importing module.</en></lang>
   * @returns {string} <lang><zh-CN>根内普通mjs目标。</zh-CN><en>Root-relative regular mjs target.</en></lang>
   * @throws {Error} <lang><zh-CN>缺授权、目标或版本冲突。</zh-CN><en>Missing authority, target or conflicting version.</en></lang>
   */
  function resolve(specifier,importer) {
    try {
      relative(importer);
      const grant=grants.find(grant=>specifier===grant.name+"/metadata");
      if(!grant) reject();
      const manifestPath=grant.root+"/package.json";
      const bytes=readJsonResourceBytes(root,manifestPath);
      if(bytes.length>1024*1024||(!manifests.has(manifestPath)&&[...manifests.values()].reduce((sum,row)=>sum+row.bytes.length,bytes.length)>1024*1024)) reject();
      const digest=createHash("sha256").update(bytes).digest("hex");
      if(manifests.has(manifestPath)&&manifests.get(manifestPath).sha256!==digest) reject();
      const manifest=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
      if(manifest.name!==grant.name||manifest.version!==grant.version||manifest.type!=="module") reject();
      if(!manifest.exports||typeof manifest.exports!=="object"||Array.isArray(manifest.exports)||!Object.hasOwn(manifest.exports,"./metadata")) reject();
      let target=manifest.exports["./metadata"];
      const conditions=[];
      if(target&&typeof target==="object"&&!Array.isArray(target)) {
        if(Object.keys(target).some(key=>!["types","default"].includes(key))||typeof target.default!=="string"||(target.types!==undefined&&typeof target.types!=="string")) reject();
        target=target.default;conditions.push("default");
      }
      if(typeof target!=="string"||!target.startsWith("./")||!target.endsWith(".mjs")) reject();
      const local=relative(target.slice(2));
      const selected=relative(grant.root+"/"+local);
      // <lang><zh-CN>先核实际文件及物理归属，再用Node文件解析确认目标，避免TypeScript优先选中d.mts。</zh-CN><en>Check actual file identity and ownership before Node file resolution, preventing TypeScript from selecting d.mts first.</en></lang>
      readJsonResourceBytes(root,selected);
      assert.equal(require.resolve(path.resolve(root,selected)),path.resolve(root,selected));
      manifests.set(manifestPath,{path:manifestPath,bytes,sha256:digest});
      if(resolutions.size>=1024&&!resolutions.has(importer+"\0"+specifier)) reject();
      resolutions.set(importer+"\0"+specifier,{importer,specifier,name:grant.name,version:grant.version,manifest:manifestPath,manifestSha256:digest,conditions,target:selected});
      return selected;
    } catch {reject();}
  }
  return {
    resolve,
    get manifests(){return [...manifests.values()].map(({path,sha256})=>({path,sha256}));},
    get resolutions(){return [...resolutions.values()].map(row=>({...row,conditions:[...row.conditions]})).sort((a,b)=>(a.importer+"\0"+a.specifier).localeCompare(b.importer+"\0"+b.specifier,"en"));}
  };
}
