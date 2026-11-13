/** @file @lang zh-CN 官网清单的无损字典编码和版本化精确读取，不读取文件或授予来源权限。 @lang en Lossless dictionary inventories and exact versioned reads without file access or source authorization. */
import assert from "node:assert/strict";
import {isDeepStrictEqual} from "node:util";

/** @lang zh-CN 既有报告身份保留其原始对象清单。 @lang en Existing report identities retain their original object inventories. */
const legacyFormats = ["hia-official-site-composition-report@0.1.0", "hia-official-site-composition-report@0.2.0"];
/** @lang zh-CN 新报告仅改变清单表示，不改变文件/来源/隐私语义。 @lang en The new report changes inventory representation while retaining file, source, and privacy semantics. */
const dictionaryFormat = "hia-official-site-composition-report@0.3.0";
/** @lang zh-CN 既有完整性检查使用的四类归属。 @lang en Four ownership categories used by the existing completeness checks. */
const fileKinds = ["legacy-copy", "preserved-deep-link", "website", "site-schema"];

/**
 * @lang zh-CN 拒绝非普通数据和访问器，数组只允许连续索引及length。
 * @lang en Reject non-plain data and accessors; arrays allow contiguous indices and length only.
 * @param {unknown} value - 未信任的元数据。 Untrusted metadata.
 * @param {boolean} [array=false] - 是否必须是数组。 Whether an array is required.
 * @returns {void} 无效时抛出固定说明。 Throw a fixed message on invalid input.
 */
function dataObject(value, array=false) {
  assert(value && typeof value==="object" && Array.isArray(value)===array,"Invalid composition data object.");
  assert(array ? Object.getPrototypeOf(value)===Array.prototype : [Object.prototype,null].includes(Object.getPrototypeOf(value)),"Invalid composition data prototype.");
  // <lang><zh-CN>数组数量先于属性枚举检查，超大或稀疏输入不能触发描述符的大量分配。</zh-CN><en>Check array counts before property enumeration so oversized or sparse input cannot allocate a large descriptor inventory.</en></lang>
  if (array) assert(Number.isSafeInteger(value.length) && value.length>=0 && value.length<=100000,"Composition array count exceeds budget.");
  assert(Object.getOwnPropertySymbols(value).length===0,"Composition symbol properties are forbidden.");
  // <lang><zh-CN>先查看描述符再读取字段，防止校验执行输入访问器。</zh-CN><en>Inspect descriptors before reading fields so validation never invokes input accessors.</en></lang>
  const descriptors=Object.getOwnPropertyDescriptors(value);
  assert(Object.values(descriptors).every(item=>Object.hasOwn(item,"value")),"Composition accessors are forbidden.");
  if (array) assert(Object.keys(descriptors).length===value.length+1 && Object.keys(descriptors).every(key=>key==="length" || /^(?:0|[1-9][0-9]*)$/.test(key) && Number(key)<value.length),"Invalid composition data array.");
}

/**
 * @lang zh-CN 校验单一相对路径组成部分，不作解码或路径重写。
 * @lang en Validate a relative path component without decoding or rewriting paths.
 * @param {unknown} value - 目录或文件名。 Directory or filename.
 * @param {boolean} directory - 是否允许空根目录及多个段。 Whether to allow the empty root and multiple segments.
 * @returns {boolean} 是否为规范组成部分。 Whether canonical.
 */
function pathComponent(value,directory) {
  if (typeof value!=="string" || /[\\:%?#]/.test(value)) return false;
  if (directory && value==="") return true;
  // <lang><zh-CN>目录允许普通多段，文件名只允许一个非点段，原字符逐字保留。</zh-CN><en>Directories allow ordinary multiple segments, filenames one non-dot segment, retaining every original character.</en></lang>
  const segments=value.split("/");
  return (directory || segments.length===1) && segments.every(segment=>segment!=="" && segment!=="." && segment!=="..");
}

/**
 * @lang zh-CN 按明确身份返回原对象清单或展开新字典清单，保留每项四字段及顺序。
 * @lang en Return the original object inventory or expand the new dictionary inventory by exact identity, preserving four fields and order.
 * @param {object} report - 已解析JSON报告或普通数据对象。 Parsed JSON report or plain data object.
 * @returns {Array<object>} 原件对象清单，旧版返回原数组；新版生成等价对象。 Object inventory; existing versions retain their array and the new version yields equivalent objects.
 * @throws {Error} 未知身份、访问器、无效表/索引/路径/摘要/长度/分类或预算。 Unknown identity, accessors, invalid tables, references, paths, digests, lengths, kinds, or budgets.
 */
export function compositionFiles(report) {
  dataObject(report);
  if (legacyFormats.includes(report.format)) {
    assert(Array.isArray(report.files),"Missing legacy composition files.");
    return report.files;
  }
  assert(report.format===dictionaryFormat && !Object.hasOwn(report,"files"),"Unknown or ambiguous composition format.");
  // <lang><zh-CN>新表只有固定五个字段，外部地址与混合表示均不进入解码。</zh-CN><en>The new table has exactly five fields, excluding external locations and mixed representations.</en></lang>
  const table=report.fileTable;
  dataObject(table);
  const fields=["directories","names","digests","kinds","rows"];
  assert(isDeepStrictEqual(Object.keys(table).sort(),[...fields].sort()),"Invalid composition table fields.");
  for (const field of fields) {
    dataObject(table[field],true);
    assert(table[field].length>0 && table[field].length<=100000,"Composition table count exceeds budget.");
  }
  // <lang><zh-CN>清单行不包含自身报告和站点索引，两件元数据也占总文件预算。</zh-CN><en>Inventory rows exclude the report itself and site index, so both metadata files count toward the total file budget.</en></lang>
  assert(table.rows.length+2<=100000,"Composition metadata exceeds the complete file-count budget.");
  for (const field of fields.slice(0,4)) assert(new Set(table[field]).size===table[field].length,"Duplicate composition dictionary value.");
  assert(table.directories.every(value=>pathComponent(value,true)) && table.names.every(value=>pathComponent(value,false)),"Unsafe composition path component.");
  assert(table.digests.every(value=>typeof value==="string" && /^[a-f0-9]{64}$/.test(value)),"Invalid composition digest.");
  assert(table.kinds.every(value=>fileKinds.includes(value)),"Invalid composition file kind.");
  // <lang><zh-CN>展开只建立有界内存记录，实际文件读取及来源/隐私校验仍归正式检查器。</zh-CN><en>Expansion creates bounded in-memory records only; actual file reads and source/privacy checks remain with the production checker.</en></lang>
  const files=[];
  const paths=new Set();
  let totalBytes=0;
  for (const row of table.rows) {
    dataObject(row,true);
    assert(row.length===5,"Invalid composition row width.");
    for (const [column,field] of [[0,"directories"],[1,"names"],[3,"digests"],[4,"kinds"]]) assert(Number.isSafeInteger(row[column]) && row[column]>=0 && row[column]<table[field].length,"Invalid composition dictionary reference.");
    assert(Number.isSafeInteger(row[2]) && row[2]>=0 && row[2]<=32*1024**2,"Invalid composition file length.");
    const directory=table.directories[row[0]];
    const file=(directory ? directory+"/" : "")+table.names[row[1]];
    assert(!paths.has(file),"Duplicate composition file path.");
    paths.add(file);
    totalBytes+=row[2];
    assert(totalBytes<=1_000_000_000,"Composition content exceeds publication budget.");
    files.push({path:file,bytes:row[2],sha256:table.digests[row[3]],kind:table.kinds[row[4]]});
  }
  return files;
}

/**
 * @lang zh-CN 在字典中保留首次出现顺序，返回稳定的整数引用。
 * @lang en Preserve first occurrence in a dictionary and return a stable integer reference.
 * @param {string} value - 原始字符串。 Original string.
 * @param {string[]} values - 本次字典。 Current dictionary.
 * @param {Map<string,number>} indices - 本次反向索引。 Current reverse index.
 * @returns {number} 有界字典引用。 Bounded dictionary reference.
 */
function intern(value,values,indices) {
  if (!indices.has(value)) {
    indices.set(value,values.length);
    values.push(value);
  }
  return indices.get(value);
}

/**
 * @lang zh-CN 将明确0.2报告无损编码为0.3；0.1嵌入报告保持原样，拒绝改标签式重复编码。
 * @lang en Losslessly encode an explicit 0.2 report as 0.3; keep embedded 0.1 reports unchanged and reject relabelled re-encoding.
 * @param {object} report - 构建器产生的原对象清单。 Original object inventory from the builder.
 * @returns {object} 新交换对象或原0.1对象；不修改输入。 New interchange object or original 0.1 object, without mutating input.
 * @throws {Error} 身份、数据或新清单无效。 Invalid identity, data, or new inventory.
 */
export function encodeCompositionReport(report) {
  dataObject(report);
  if (report.format===legacyFormats[0]) return report;
  assert(report.format===legacyFormats[1] && !Object.hasOwn(report,"fileTable"),"Only an explicit original sibling report can be encoded.");
  dataObject(report.files,true);
  assert(Array.isArray(report.files) && report.files.length>0 && report.files.length<=100000,"Invalid original composition file count.");
  // <lang><zh-CN>四字典分别复用目录、文件名、摘要和分类，行中长度与原顺序直接保留。</zh-CN><en>Four dictionaries reuse directories, names, digests, and kinds, while rows directly retain sizes and original order.</en></lang>
  const fileTable={directories:[],names:[],digests:[],kinds:[],rows:[]};
  const indices={directories:new Map(),names:new Map(),digests:new Map(),kinds:new Map()};
  for (const entry of report.files) {
    dataObject(entry);
    assert(typeof entry.path==="string","Invalid original composition path.");
    const separator=entry.path.lastIndexOf("/");
    fileTable.rows.push([
      intern(entry.path.slice(0,separator<0 ? 0 : separator),fileTable.directories,indices.directories),
      intern(entry.path.slice(separator+1),fileTable.names,indices.names),
      entry.bytes,
      intern(entry.sha256,fileTable.digests,indices.digests),
      intern(entry.kind,fileTable.kinds,indices.kinds),
    ]);
  }
  const {files,...metadata}=report;
  const encoded={...metadata,format:dictionaryFormat,fileTable};
  // <lang><zh-CN>写出前走同一严格读取路径，生产者与消费者共享拒绝边界。</zh-CN><en>Use the same strict reading path before emission so producer and consumer share rejection boundaries.</en></lang>
  assert(isDeepStrictEqual(compositionFiles(encoded),files),"Composition encoding changed file semantics.");
  return encoded;
}
