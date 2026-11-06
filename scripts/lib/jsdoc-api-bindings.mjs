/**
 * @file
 * @lang zh-CN 按原声明来源及可选完整名称关联真实JSDoc与核心文档，审核清单不构造符号。
 * @lang en Associates actual JSDoc and core documents by original sources and optional qualified names; audit inventories never construct symbols.
 */
import assert from "node:assert/strict";

/**
 * @lang zh-CN 核对一个公开绑定的全部原声明、原生元数据、逐字段译文和实际来源；缺失/歧义显式阻断。
 * @lang en Verify every original declaration, native metadata, localized field and actual source for a public binding; missing or ambiguous evidence is blocked.
 * @param {object} input - 独立binding/owner期望与本轮outputs；可选binding.declarationLongname进一步限定CommonJS完整身份，缺省保持旧匹配。 Independent binding/owner expectations and actual outputs; optional binding.declarationLongname constrains qualified CommonJS identity, preserving legacy matching when absent.
 * @returns {object} 工件作用域关联或明确缺口；不是签名/译文完整性或发行验收。 Artifact-scoped association or explicit gaps, not complete signature/translation or release acceptance.
 * @throws {Error} 已有关联中的核心字段或来源被丢失/改写。 A core field or source in an existing association was lost or changed.
 */
export function associateNativeJsdocBinding({binding,owner,outputs}) {
  // <lang><zh-CN>原声明必须有独立解析结果；不可用同名入口占位替代。
  // </zh-CN><en>Original declarations need independent resolution; a same-name entry placeholder cannot substitute.</en></lang>
  const declarations=[];
  const gaps=[];
  if(binding.status!=="resolved" || !binding.declarations?.length) return {status:"blocked",declarations,gaps:[{reason:"unresolved-declaration"}]};
  for(const expected of binding.declarations) {
    if(!expected.path || expected.path.split("/").some(part=>!part || part==="." || part==="..") || /[\\:%?#]/.test(expected.path)) {gaps.push({reason:"invalid-declaration-source"});continue;}
    // <lang><zh-CN>文件与工件共同限定身份，相同nodeId在另一来源不构成冲突或覆盖证据。
    // </zh-CN><en>Files and artifacts scope identity; an identical nodeId from another source is neither a collision nor coverage evidence.</en></lang>
    const source=`HIA/${owner}/${expected.path}`;
    const documents=outputs.filter(output=>output.source===source);
    if(documents.length!==1 || documents[0].status!=="success") {gaps.push({source,line:expected.line,reason:"missing-or-failed-production"});continue;}
    const output=documents[0];
    assert.equal(output.integration.contract,"hia-jsdoc-integration");
    assert.equal(output.integration.contractVersion,"0.1.0");
    const nodes=output.integration.ir.nodes.filter(node=>node.name===binding.declarationName && (!binding.declarationLongname||node.longname===binding.declarationLongname) && node.source?.definedIn?.relativePath===source && node.source.definedIn.position?.line===expected.line);
    if(nodes.length!==1) {gaps.push({source,line:expected.line,reason:nodes.length ? "ambiguous-native-declaration" : "missing-native-declaration"});continue;}
    const node=nodes[0];
    const symbols=output.document.symbols.filter(symbol=>symbol.id===node.id);
    assert.equal(symbols.length,1,"Missing or ambiguous core declaration.");
    const symbol=symbols[0];
    assert.equal(symbol.name,node.name,"Core declaration name changed.");
    if(node.signature) assert.equal(symbol.signature,node.signature,"Native signature changed in core conversion.");
    assert.deepEqual(symbol.metadata?.jsdoc,node.jsdoc,"Native metadata changed in core conversion.");
    assert.equal(symbol.source?.definedIn?.relativePath,node.source.definedIn.relativePath,"Core source declaration changed.");
    assert.deepEqual(symbol.source?.definedIn?.position,node.source.definedIn.position,"Core source position changed.");
    assert.deepEqual(symbol.source?.definedIn?.range,node.source.definedIn.range,"Core source range changed.");
    if(node.source.primaryBlock) {
      assert.equal(symbol.source?.primaryBlock?.relativePath,node.source.primaryBlock.relativePath,"Core primary source changed.");
      assert.deepEqual(symbol.source?.primaryBlock?.range,node.source.primaryBlock.range,"Core primary source range changed.");
      if(typeof node.source.primaryBlock.content==="string") assert.equal(symbol.source?.primaryBlock?.content,node.source.primaryBlock.content,"Core primary source content changed.");
    }
    // <lang><zh-CN>比较原生已存在的每种语言，不推测未写的注释或缺译；未知字段不能被摘要掩盖。
    // </zh-CN><en>Compare every language actually present in native fields without inventing comments/translations; summaries cannot conceal lost fields.</en></lang>
    const fields=Object.entries(node.i18n?.fields??{});
    for(const [key,field] of fields) {
      const actual=symbol.i18n?.fields?.[key];
      assert(actual,"Native localized field missing in core conversion.");
      for(const [locale,text] of Object.entries(field.localizedText??{})) assert.equal(actual.localizedText?.[locale],text,"Native localized text changed in core conversion.");
      if(field.defaultText) assert.equal(actual.defaultText,field.defaultText,"Native localized default text changed.");
    }
    if(node.summary && !node.i18n?.fields?.description) assert.equal(symbol.summary,node.summary,"Native summary changed in core conversion.");
    declarations.push({source,line:expected.line,artifact:output.artifact,nodeId:node.id,i18nFields:fields.length,isCallable:["function","class"].includes(node.kind)||Boolean(node.signature),hasSignature:Boolean(node.signature),hasText:Boolean(node.summary || fields.some(([,field])=>field.defaultText || Object.values(field.localizedText??{}).some(Boolean)))});
  }
  return {status:gaps.length ? "blocked" : "associated",declarations,gaps};
}
