/**
 * @file
 * @lang zh-CN 资源参考发布的固定清单读取与纯校验，统一成员、地址和来源审批。
 * @lang en Fixed registry loading and pure validation for resource publication, unifying membership, routes and source approval.
 */
import fs from "node:fs";
import assert from "node:assert/strict";

/**
 * @lang zh-CN 检查声明字段闭集，未知配置不能静默改变发布范围。
 * @lang en Check a closed field set so unknown configuration cannot silently change publication scope.
 * @param {object} value <lang><zh-CN>待核对象。</zh-CN><en>Object to check.</en></lang>
 * @param {string[]} fields <lang><zh-CN>精确字段清单。</zh-CN><en>Exact field list.</en></lang>
 * @returns {void} <lang><zh-CN>失败抛错。</zh-CN><en>Throws on failure.</en></lang>
 */
function fields(value, fields) {
  assert(value && typeof value === "object" && !Array.isArray(value), "Invalid resource registry record.");
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), "Unknown resource registry field.");
}

/**
 * @lang zh-CN 校验发布根、互斥分区和精确公开导出；不修改输入或读取资源正文。
 * @lang en Validate publication roots, disjoint partitions and exact public exports without mutation or resource-body reads.
 * @param {object} value <lang><zh-CN>自有资源参考清单。</zh-CN><en>Owned resource-reference registry.</en></lang>
 * @returns {void} <lang><zh-CN>有效时返回。</zh-CN><en>Returns for valid input.</en></lang>
 * @throws {Error} <lang><zh-CN>未知字段、重复成员、路径重叠或非法来源。</zh-CN><en>Unknown fields, duplicate members, overlapping paths or invalid sources.</en></lang>
 */
export function assertResourceReferencePartitions(value) {
  fields(value,["description","sites","partitions"]);
  assert(typeof value.description === "string" && value.description.trim());
  assert(Array.isArray(value.sites) && value.sites.length && Array.isArray(value.partitions) && value.partitions.length);
  // <lang><zh-CN>标识和发布根分别去重，源文件身份在整个清单内互斥。</zh-CN><en>Deduplicate identifiers and deployment roots independently, with source identities disjoint across the registry.</en></lang>
  const sites = new Map();
  const partitions = new Map();
  const exports = new Set();
  const sources = new Set();
  for (const site of value.sites) {
    fields(site,["id","repository","base","defaultPartition","partitions"]);
    assert(/^[a-z][a-z0-9-]*$/u.test(site.id) && !sites.has(site.id));
    assert(/^mandolin\/HIA-Documentation-[A-Za-z0-9-]+$/u.test(site.repository));
    assert.equal(site.base,"/" + site.repository.split("/")[1] + "/");
    assert(Array.isArray(site.partitions) && site.partitions.length && new Set(site.partitions).size === site.partitions.length);
    assert(site.partitions.includes(site.defaultPartition));
    sites.set(site.id,site);
  }
  assert.equal(new Set(value.sites.map(site=>site.base)).size,sites.size);
  for (const part of value.partitions) {
    fields(part,["id","site","path","titleByLocale","exports"]);
    assert(/^[a-z][a-z0-9-]*$/u.test(part.id) && !partitions.has(part.id) && sites.has(part.site));
    assert(typeof part.path === "string" && /^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+$/u.test(part.path));
    fields(part.titleByLocale,["zh-CN","en"]);
    assert(Object.values(part.titleByLocale).every(text=>typeof text === "string" && text.trim() && text.length <= 160));
    assert(Array.isArray(part.exports) && part.exports.length);
    for (const entry of part.exports) {
      fields(entry,["package","subpath","source"]);
      assert(/^@hia-doc\/[a-z0-9-]+$/u.test(entry.package));
      assert(/^\.\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.json$/u.test(entry.subpath) && !entry.subpath.includes(".."));
      assert(/^(?:packages|apps)\/(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.json$/u.test(entry.source) && !entry.source.includes(".."));
      const identity = entry.package + ":" + entry.subpath;
      assert(!exports.has(identity) && !sources.has(entry.source), "Duplicate resource identity.");
      exports.add(identity);
      sources.add(entry.source);
    }
    partitions.set(part.id,part);
  }
  for (const site of value.sites) {
    assert.deepEqual(site.partitions.slice().sort(), value.partitions.filter(part=>part.site===site.id).map(part=>part.id).sort());
    const paths = site.partitions.map(id=>partitions.get(id)?.path);
    assert(paths.every(Boolean), "Missing resource partition.");
    for (const [index, current] of paths.entries()) assert(!paths.some((other, position)=>position!==index && current.startsWith(other)), "Overlapping resource roots.");
  }
}

/**
 * @lang zh-CN 读取自有固定清单，每次返回独立数据；调用者修改不会扩展后续读取范围。
 * @lang en Read the owned fixed registry, returning independent data so caller mutation cannot widen subsequent reads.
 * @returns {object} <lang><zh-CN>已校验的资源发布清单。</zh-CN><en>Validated resource-publication registry.</en></lang>
 */
export function loadResourceReferencePartitions() {
  const value = JSON.parse(fs.readFileSync(new URL("../reference/resource-reference-partitions.json",import.meta.url),"utf8"));
  assertResourceReferencePartitions(value);
  return value;
}

/**
 * @lang zh-CN 将当前包资源与明确发布分区及独立承载包双向对账，拒绝遗漏、额外项、来源替换和重复归属。
 * @lang en Reconcile current package resources bidirectionally with explicit partitions and separately hosted packages, rejecting omissions, extras, source substitutions and overlapping ownership.
 * @param {object} registry <lang><zh-CN>已声明的分区清单。</zh-CN><en>Declared partition registry.</en></lang>
 * @param {object} inventory <lang><zh-CN>实际包清单产生的资源入口，函数不读取正文或执行模块。</zh-CN><en>Resource entries from actual package manifests, without body reads or module execution by this function.</en></lang>
 * @param {string[]} separatePackages <lang><zh-CN>由其它现有构建器完整承载的明确包名。</zh-CN><en>Explicit package names fully hosted by other existing builders.</en></lang>
 * @returns {void} <lang><zh-CN>完整且互斥时返回。</zh-CN><en>Returns when coverage is complete and disjoint.</en></lang>
 * @throws {Error} <lang><zh-CN>资源范围或发布归属不一致。</zh-CN><en>Resource scope or publication ownership differs.</en></lang>
 */
export function assertResourceReferenceCoverage(registry, inventory, separatePackages) {
  assertResourceReferencePartitions(registry);
  // <lang><zh-CN>独立承载范围必须来自本次实际盘点，包名重复或未知均拒绝。</zh-CN><en>Separate hosting must come from this actual inventory, rejecting duplicate or unknown package names.</en></lang>
  assert(Array.isArray(separatePackages) && new Set(separatePackages).size===separatePackages.length);
  assert(separatePackages.every(name=>inventory.packages.some(pack=>pack.name===name)));
  const expected=new Map();
  for(const pack of inventory.packages){
    for(const entry of pack.entries.filter(entry=>entry.kind==="json-resource")){
      const identity=pack.name+":"+entry.subpath;
      assert(!expected.has(identity),"Duplicate inventoried resource identity.");
      expected.set(identity,{source:pack.directory+"/"+entry.target,separate:separatePackages.includes(pack.name)});
    }
  }
  // <lang><zh-CN>已声明项逐一匹配实际目标，独立承载包不得在本分区重复声明。</zh-CN><en>Match every declared item to its actual target, preventing separately hosted packages from being redeclared here.</en></lang>
  const selected=registry.partitions.flatMap(part=>part.exports);
  for(const entry of selected){
    const actual=expected.get(entry.package+":"+entry.subpath);
    assert(actual && !actual.separate && actual.source===entry.source,"Resource publication target mismatch.");
  }
  assert.deepEqual(selected.map(entry=>entry.package+":"+entry.subpath).sort(),[...expected].filter(([,entry])=>!entry.separate).map(([identity])=>identity).sort(),"Incomplete resource publication coverage.");
}
