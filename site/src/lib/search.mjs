/**
 * @lang zh-CN 当前版本手册的有界本地正文检索；无网络、正则查询、遥测或存储，不索引未生成的API。
 * @lang en Bounded local body search for current manuals, without network, regex queries, telemetry, storage, or ungenerated APIs.
 */

/**
 * @lang zh-CN 精确读取当前语言/版本的构建内嵌索引；失败只给固定公开诊断。
 * @lang en Read the build-embedded index for the exact locale/version with fixed public failure diagnostics.
 * @param {string} raw - 内嵌JSON，不作HTML执行。 Embedded JSON, never executed as HTML.
 * @param {string} locale - 当前正文语言。 Current content locale.
 * @param {string} version - 当前系统文档版本。 Current system documentation version.
 * @returns {object[]} 已校验的手册条目。 Validated manual entries.
 * @throws {Error} 索引坏损、超限、分区或站内路径不符。 Corrupt, oversized, mismatched, or unsafe index.
 */
export function readSearchIndex(raw, locale, version) {
  try {
    if (typeof raw !== "string" || raw.length > 1_000_000) throw new Error();
    // <lang lang="zh-CN">条目和正文预算约束本页启动开销，坏索引不能降格为零结果。</lang><lang lang="en">Entry/body budgets bound local initialization; a broken index is not an empty result.</lang>
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length > 500) throw new Error();
    for (const entry of entries) {
      if (!entry || Object.keys(entry).sort().join() !== "href,locale,text,title,version" || entry.locale !== locale || entry.version !== version
        || typeof entry.title !== "string" || !entry.title.trim() || entry.title.length > 250 || typeof entry.text !== "string" || entry.text.length > 100_000
        || typeof entry.href !== "string" || !/^\/HIA-Documentation\/(?:[A-Za-z0-9_-]+\/)*$/.test(entry.href)) throw new Error();
    }
    return entries;
  } catch { throw new Error("Search index unavailable."); }
}

/**
 * @lang zh-CN 按语言/版本筛选标题与正文，所有空白分隔词均需命中；最多20条，不做语义排名。
 * @lang en Filter titles and bodies by exact locale/version, requiring all whitespace-separated literal terms; at most 20 results, without semantic ranking.
 * @param {object[]} entries - 已由读取器校验的条目。 Reader-validated entries.
 * @param {string} query - 最长500 UTF-16单位的本页查询。 Page-local query of at most 500 UTF-16 units.
 * @param {string} locale - 正文语言。 Content locale.
 * @param {string} version - 精确文档版本。 Exact documentation version.
 * @returns {object[]} 原条目与纯文本摘录，不修改输入。 Original fields plus plain-text excerpts, without input mutation.
 * @throws {Error} 查询超限。 Oversized query.
 */
export function searchDocuments(entries, query, locale, version) {
  if (typeof query !== "string" || query.length > 500) throw new Error("Search query exceeds limit.");
  // <lang lang="zh-CN">规范化仅用于比较，不修改或保存查询；不将其编译成正则。</lang><lang lang="en">Normalize only for comparison, without storing the query or compiling a regular expression.</lang>
  const terms = query.normalize("NFKC").trim().toLowerCase().split(/\s+/u).filter(Boolean);
  const results = [];
  for (const entry of entries) {
    if (entry.locale !== locale || entry.version !== version) continue;
    // <lang lang="zh-CN">标题与正文联合命中，摘录围绕原正文首个匹配项，保留原字符。</lang><lang lang="en">Match title and body together; excerpts retain original characters around the first body match.</lang>
    const body = entry.text.normalize("NFKC").toLowerCase();
    const haystack = entry.title.normalize("NFKC").toLowerCase() + " " + body;
    if (!terms.every(term => haystack.includes(term))) continue;
    const position = terms.length ? body.indexOf(terms[0]) : 0;
    const start = Math.max(0, position - 40);
    results.push({ ...entry, excerpt: (start ? "…" : "") + entry.text.slice(start, start + 220) + (entry.text.length > start + 220 ? "…" : "") });
    if (results.length === 20) break;
  }
  return results;
}
