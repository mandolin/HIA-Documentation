/** @file @lang zh-CN 上传前核实际兼容站与候选记录配对。 @lang en Verify live compatibility pairing against the candidate before upload. */
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {readReferenceText} from "./reference-http.mjs";
import {readReferenceSiteContext} from "./reference-site-context.mjs";

// <lang><zh-CN>主站索引和报告取实际候选，其余旧快照仅从已确认同源公开地址读取。</zh-CN><en>Read the actual candidate's main index and report, fetching its old snapshot only from the approved same-origin public location.</en></lang>
const output=path.resolve(process.argv[2]);
const base=new URL("https://mandolin.github.io/HIA-Documentation/");
const context=await readReferenceSiteContext(base,async value=>{
  if (value==="versions.json" || value==="official-site.json") return fs.readFile(path.join(output,value),"utf8");
  const url=new URL(value,base);
  assert(url.origin===base.origin && url.pathname.startsWith("/HIA-Documentation-Legacy/"),"Unexpected compatibility verification URL.");
  return readReferenceText(url,"application/json, text/html");
});
assert(context.kind==="official","Expected an official website candidate.");
console.log("Official website compatibility pairing passed.");
