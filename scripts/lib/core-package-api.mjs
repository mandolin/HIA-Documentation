/**
 * @lang zh-CN 核心包文档生产结果的独立投影复核；清单仅提供预期，完整字段/真实来源必须来自生产结果。
 * @lang en Independent projection checks for generated core package docs; inventories supply expectations while complete fields/actual sources must come from producer output.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * @lang zh-CN 对每个公开绑定、每条声明/父项/签名/注释和HIA字段/来源逐项比对，不按摘要或符号计数接受丢失。
 * @lang en Compare every public binding and declaration/parent/signature/comment plus HIA fields/sources, refusing losses hidden by summaries or symbol counts.
 * @param {object} data - 独立modules期望及实际extraction/document/bridge。 Independent module expectations and actual extraction/document/bridge.
 * @returns {{bindings:number,symbols:number,i18nFields:number}} 实际核对计数，非完整源注释或44包验收。 Actual checked counts, not complete source-comment or 44-package acceptance.
 * @throws {Error} 存在缺失/重复/改写或来源不符。 Missing/duplicate/changed items or mismatched sources.
 */
export function verifyProjectApiProjection({modules,extraction,document,bridge}) {
  // <lang><zh-CN>按真实身份建立唯一索引，避免同名跨入口/重载被覆盖；两类桥接数组共同覆盖全部声明。</zh-CN><en>Index unique real identities so same names across entries/overloads cannot overwrite each other; both bridge classification arrays cover all declarations.</en></lang>
  const expected=new Map(extraction.symbols.map(symbol=>[symbol.id,symbol]));
  const hia=new Map(document.symbols.map(symbol=>[symbol.id,symbol]));
  const bridged=[...bridge.runtimeSymbols,...bridge.typeOnlySymbols];
  const projected=new Map(bridged.map(symbol=>[symbol.id,symbol]));
  assert.equal(expected.size,extraction.symbols.length,"Duplicate extraction identity.");
  assert.equal(hia.size,document.symbols.length,"Duplicate HIA identity.");
  assert.equal(projected.size,bridged.length,"Duplicate bridge identity.");
  assert.equal(hia.size,expected.size,"HIA declarations are incomplete.");
  assert.equal(projected.size,expected.size,"Bridge declarations are incomplete.");
  let bindings=0;
  let i18nFields=0;
  assert.deepEqual(extraction.modules.map(module=>module.path).sort(),modules.map(module=>module.path).sort(),"Unexpected public module.");
  for(const module of modules) {
    const actual=extraction.modules.find(item=>item.path===module.path);
    assert.deepEqual(actual.exports.map(item=>item.name).sort(),module.exports.map(item=>item.name).sort(),"Unexpected public binding.");
  }
  for(const module of modules) for(const binding of module.exports) {
    // <lang><zh-CN>独立编译器的公开名必须在同一入口存在，并指向实际声明；只有数组长度不够证明覆盖。</zh-CN><en>Each independently inspected public name must exist in its own entry and point to real declarations; array length alone does not prove coverage.</en></lang>
    const actual=extraction.modules.find(item=>item.path===module.path)?.exports.find(item=>item.name===binding.name);
    assert(actual?.symbolIds.length,"Missing public binding.");
    assert(actual.symbolIds.every(id=>expected.has(id)),"Binding refers to absent declarations.");
    bindings++;
  }
  for(const symbol of extraction.symbols) {
    // <lang><zh-CN>原生提取是本阶段字段比较的来源，不推测缺注释/译文；来源必须仍指实际声明文件和范围。</zh-CN><en>Native extraction supplies this stage's field comparison, without guessing missing docs/translations; sources must retain actual declaration files/ranges.</en></lang>
    const core=hia.get(symbol.id);
    const pair=projected.get(symbol.id);
    assert(core && pair,"Missing projected declaration.");
    assert.equal(core.name,symbol.name);
    assert.equal(pair.name,symbol.name);
    assert.equal(core.parentId,symbol.parentId);
    assert.equal(pair.parentId,symbol.parentId);
    assert.equal(core.signature,symbol.signature);
    assert.equal(pair.signature,symbol.signature);
    assert.deepEqual(pair.comment,symbol.comment);
    assert.deepEqual(pair.source,symbol.source);
    assert.equal(core.source?.definedIn?.relativePath,symbol.source.path);
    assert.deepEqual(core.source.definedIn.range,symbol.source.range);
    // <lang><zh-CN>0.3分支角色必须到达核心和桥接，不能只保留签名后丢掉联合/交叉语义。</zh-CN><en>0.3 branch roles must reach core and bridge outputs, retaining union/intersection semantics beyond signatures.</en></lang>
    if(symbol.metadata?.typeExpression) {
      assert.equal(core.kind,"typedef");
      assert.deepEqual(core.metadata.tsdoc.typeExpression,symbol.metadata.typeExpression);
      assert.deepEqual(pair.metadata.typeExpression,symbol.metadata.typeExpression);
    }
    if(symbol.comment?.i18n) {assert.deepEqual(core.i18n,symbol.comment.i18n);i18nFields+=Object.keys(symbol.comment.i18n.fields).length;}
  }
  return {bindings,symbols:expected.size,i18nFields};
}

/**
 * @lang zh-CN 在JSON编码层检查本机根与正反斜杠形式，避免Windows转义让简单substring检查漏检。
 * @lang en Check the machine root and both separator forms at the JSON encoding layer so Windows escaping cannot bypass a simple substring check.
 * @param {object} value - 仅含已解析JSON的工件。 Artifacts containing parsed JSON only.
 * @param {string} root - 不允许公开的运行时根。 Runtime root that must not be public.
 * @returns {void} 没有对应实际根时返回；非通用隐私扫描。 Returns when that root is absent; not a general privacy scanner.
 */
export function assertPublicRootOmission(value,root) {
  const text=JSON.stringify(value);
  for(const variant of new Set([root,root.replaceAll("\\","/"),root.replaceAll("/","\\")])) assert(!text.includes(JSON.stringify(variant).slice(1,-1)),"Generated artifacts disclose the machine root.");
}

/**
 * @lang zh-CN 将汇总写入本轮真实输出根，拒绝目录重定向和既有链接目标；静态检查不承诺并发换向防护。
 * @lang en Write the summary under this run's real output root, refusing directory redirection and existing linked targets; static checks do not promise concurrent-swap protection.
 * @param {string} outputDirectory - 生产器已创建的绝对规范目录。 Absolute canonical directory already created by the producer.
 * @param {object} report - 可序列化汇总。 Serializable summary.
 * @returns {void} 写入完成；不创建目录或清理未知文件。 Completes without creating directories or cleaning unknown files.
 */
export function writeCoreApiReport(outputDirectory,report) {
  // <lang><zh-CN>汇总也必须遵守生产器的输出边界，不能在校验完工件后绕过链接检查写文件。</zh-CN><en>The summary shares the producer's output boundary and cannot bypass link checks after artifact validation.</en></lang>
  assert(path.isAbsolute(outputDirectory),"Report output must be absolute.");
  assert.equal(path.relative(path.resolve(outputDirectory),fs.realpathSync(outputDirectory)),"","Report directory is redirected.");
  const target=path.join(outputDirectory,"core-package-api-report.json");
  try {
    const state=fs.lstatSync(target);
    assert(!state.isSymbolicLink() && state.isFile() && state.nlink===1,"Report target is linked or not a regular file.");
  } catch(error) {if(error?.code!=="ENOENT") throw error;}
  fs.writeFileSync(target,JSON.stringify(report,null,2)+"\n","utf8");
}
