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
