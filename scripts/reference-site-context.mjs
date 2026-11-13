/** @file @lang zh-CN 按精确新旧根身份读取公开站点及兼容快照配对；不改变参考来源/年龄检查。 @lang en Read public root identities and compatibility pairing exactly, retaining reference provenance and age checks. */
import {createHash} from "node:crypto";
import {readSiteVersionIndex,readLegacyReferenceIndex} from "../site/src/lib/version-index.mjs";
import {compositionFiles} from "../site/src/lib/composition-report.mjs";

/**
 * @lang zh-CN 以固定公开说明拒绝输入，不反射网络正文。
 * @lang en Reject input with a fixed public message, without reflecting response bodies.
 * @param {unknown} condition - 不变量。 Invariant.
 * @param {string} message - 固定说明。 Fixed message.
 * @returns {void} 无效时抛出。 Throws on invalid input.
 */
function require(condition,message) {if (!condition) throw new Error(message);}

/**
 * @lang zh-CN 对有界元数据解析JSON，错误只含固定说明。
 * @lang en Parse bounded metadata JSON with fixed errors.
 * @param {string} text - 已取回正文。 Retrieved body.
 * @returns {object} 解析结果。 Parsed value.
 */
function parse(text) {
  require(typeof text==="string" && Buffer.byteLength(text)<=32*1024**2,"Publication metadata exceeds parsing budget.");
  try {return JSON.parse(text);} catch {throw new Error("Invalid publication metadata JSON.");}
}

/**
 * @lang zh-CN 校验显式发布目标，防止CDN仍返回健康旧版时提前验收；未指定目标时保留独立健康检查。
 * @lang en Check explicit publication targets to prevent accepting healthy stale CDN revisions, preserving independent health checks when no target is specified.
 * @param {object} context - 已核根上下文。 Validated root context.
 * @param {object} build - 实际来源报告。 Actual provenance report.
 * @param {string} [commit] - 所选主仓40位提交。 Selected 40-character owner revision.
 * @param {"official"|"reference"} [kind] - 所选根身份。 Selected root identity.
 * @returns {void} 目标一致时返回。 Returns when the target matches.
 * @throws {Error} 目标无效、来源重复或实际发布尚未匹配。 Invalid target, duplicate source or publication not yet matching.
 */
export function assertReferencePublicationTarget(context,build,commit,kind) {
  require(commit===undefined || /^[0-9a-f]{40}$/.test(commit),"Invalid expected publication commit.");
  require(kind===undefined || ["official","reference"].includes(kind),"Invalid expected publication root.");
  if (kind!==undefined) require(context.kind===kind,"Publication has not reached the selected root identity.");
  if (commit!==undefined) {
    // <lang><zh-CN>只核主仓唯一来源槽位，重复声明也不能掩盖目标不一致。</zh-CN><en>Check the unique owner-source slot, rejecting duplicates that could conceal target mismatches.</en></lang>
    const owners=build.sources?.filter(source=>source.repository==="mandolin/HIA-Documentation") ?? [];
    require(owners.length===1 && owners[0].commit===commit,"Publication has not reached the selected source commit.");
  }
}

/**
 * @lang zh-CN 先核根索引身份，再精确读取其同源旧索引和根摘要。
 * @lang en Check the root identity first, then read its exact same-origin legacy index and root digests.
 * @param {URL} base - 选定主站根地址。 Selected main-site base URL.
 * @param {(value:string)=>Promise<string>} fetchText - 只读传输器，可注入测试。 Read-only transport, injectable for tests.
 * @returns {Promise<object>} 根类型、预期标记及精确旧索引；官网含站点索引和兼容基址。 Root kind, expected markers and exact legacy index, with site index and compatibility base for official roots.
 * @throws {Error} 身份、路径、配对摘要或来源政策无效。 Invalid identity, path, paired digest, or source policy.
 */
export async function readReferenceSiteContext(base,fetchText) {
  const text=await fetchText("versions.json");
  const identity=parse(text);
  if (identity?.contract==="hia-reference-version-index") return {kind:"reference",rootMarker:"HIA Documentation System Reference",navigationMarker:"hia-reference-site-nav",versionIndex:readLegacyReferenceIndex(text)};
  const siteIndex=readSiteVersionIndex(text);
  // <lang><zh-CN>定位字段先过既有精确契约，再要求与所选主站同源，响应URL作为旧相对路径的基址。</zh-CN><en>Validate locators through the existing exact contract, require the selected main origin, and use the old response URL as the relative-path base.</en></lang>
  const indexUrl=new URL(siteIndex.legacyReference.index,base);
  const legacyBase=new URL(siteIndex.legacyReference.root,base);
  require(indexUrl.origin===base.origin && legacyBase.origin===base.origin,"Compatibility location must share the publication origin.");
  const report=parse(await fetchText("official-site.json"));
  const files=compositionFiles(report);
  require(report.siteIndex==="versions.json" && report.legacyIndex===siteIndex.legacyReference.index && report.privacy?.status==="pass" && report.privacy.sourcesContentPolicy==="none","Invalid composed publication context.");
  const oldText=await fetchText(indexUrl.href);
  const versionIndex=readLegacyReferenceIndex(oldText);
  require(createHash("sha256").update(oldText).digest("hex")===report.legacyIndexSha256,"Published compatibility index digest mismatch.");
  const originalRoot=await fetchText(legacyBase.href);
  const expectedRoot=siteIndex.contractVersion==="2.0.0" ? report.legacyRootSha256 : files.find(file=>file.path===siteIndex.legacyReference.root+"index.html")?.sha256;
  require(createHash("sha256").update(originalRoot).digest("hex")===expectedRoot,"Published compatibility root digest mismatch.");
  const manifest=parse(await fetchText(new URL("reference-pages.json",legacyBase).href));
  require(manifest.contract==="hia-reference-pages" && manifest.contractVersion==="0.1.0-draft" && manifest.privacy?.status==="pass" && manifest.privacy.sourcesContentPolicy==="none" && ["none","public-whitelisted-excerpt"].includes(manifest.privacy.sourcePreviewPolicy),"Published compatibility source policy mismatch.");
  return {kind:"official",rootMarker:"HIA-Documentation-Sys",navigationMarker:'class="header"',siteIndex,versionIndex,legacyBase:legacyBase.href};
}
