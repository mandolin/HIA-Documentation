/**
 * @file
 * @lang zh-CN 从原生JSDoc关联选择公开根与其文档层级，逐字段验证实际站点采用。
 * @lang en Select public roots and their documentation hierarchy from native JSDoc associations, verifying actual site adoption field by field.
 */
import assert from "node:assert/strict";
import {associateNativeJsdocBinding} from "./jsdoc-api-bindings.mjs";

/**
 * @lang zh-CN 根据独立导出声明选择原生符号，闭包保留文档后代及必要祖先，不改写源对象。
 * @lang en Select native symbols from independently resolved exports, retaining documented descendants and required ancestors without rewriting input objects.
 * @param {object} input <lang><zh-CN>owner、source、bindings与实际integration/document工件。</zh-CN><en>Owner, source, bindings and actual integration/document artifacts.</en></lang>
 * @returns {object} <lang><zh-CN>选中符号的完整文档副本及逐绑定原声明关联。</zh-CN><en>Complete document copy containing selected symbols and per-binding original-declaration associations.</en></lang>
 * @throws {Error} <lang><zh-CN>绑定、身份、签名、语言或层级证据不足。</zh-CN><en>Insufficient binding, identity, signature, language or hierarchy evidence.</en></lang>
 */
export function selectNativeJsdocApi(input) {
  assert(Array.isArray(input.bindings) && input.bindings.length > 0, "Public JSDoc bindings must be explicit.");
  // <lang><zh-CN>原声明匹配复用已有原生/核心逐字段核对，审核清单只提供期望。</zh-CN><en>Reuse native/core field-by-field original-declaration checks, with inventories supplying expectations only.</en></lang>
  const bindings = input.bindings.map(binding => {
    const association = associateNativeJsdocBinding({binding, owner: input.owner, outputs: [input]});
    assert.equal(association.status, "associated", "Public JSDoc declaration association is incomplete.");
    return {name: binding.name, declarations: association.declarations};
  });
  const symbols = new Map(input.document.symbols.map(symbol => [symbol.id, symbol]));
  assert.equal(symbols.size, input.document.symbols.length, "Duplicate native symbol identity.");
  const selected = new Set(bindings.flatMap(binding => binding.declarations.map(declaration => declaration.nodeId)));
  // <lang><zh-CN>先取公开根的文档后代，再补其祖先，避免祖先的其它全局兄弟被一并选入。</zh-CN><en>Collect descendants before ancestors so unrelated global siblings of an ancestor are not selected.</en></lang>
  let changed = true;
  while (changed) {
    changed = false;
    for (const symbol of symbols.values()) {
      if (symbol.parentId && selected.has(symbol.parentId) && !selected.has(symbol.id)) {
        selected.add(symbol.id);
        changed = true;
      }
    }
  }
  for (const id of selected) {
    const symbol = symbols.get(id);
    assert(symbol, "Selected JSDoc declaration is absent.");
    if (symbol.parentId) {
      assert(symbols.has(symbol.parentId), "Native JSDoc parent is absent.");
      selected.add(symbol.parentId);
    }
  }
  const retained = input.document.symbols.filter(symbol => selected.has(symbol.id));
  for (const symbol of retained) {
    // <lang><zh-CN>公开正文必须具备真实中英文，调用节点还须有原生签名；不填造译文或签名。</zh-CN><en>Public prose requires actual Chinese and English, and callable nodes require native signatures, without synthesized translations or signatures.</en></lang>
    if (["function", "class"].includes(symbol.kind)) assert(symbol.signature?.trim(), "Public JSDoc callable signature is missing.");
    const fields = Object.values(symbol.i18n?.fields ?? {});
    assert(fields.length > 0, "Public JSDoc text is missing.");
    for (const field of fields) for (const locale of ["en", "zh-CN"]) {
      assert(typeof field.localizedText?.[locale] === "string" && field.localizedText[locale].trim(), "Public JSDoc translation is missing.");
    }
  }
  return {document: structuredClone({...input.document, symbols: retained}), bindings};
}

/**
 * @lang zh-CN 按作用域、原生ID及输入定位实际条目，核签名、全部字段、父项和映射。
 * @lang en Locate actual entries by scope, native ID and input, checking signatures, all fields, parents and mappings.
 * @param {object} input <lang><zh-CN>row、原生选中文档、原地图及实际条目。</zh-CN><en>Row, selected native document, original map and actual entries.</en></lang>
 * @returns {void} <lang><zh-CN>所有选中声明与公开绑定通过后返回。</zh-CN><en>Return after every selected declaration and public binding passes.</en></lang>
 * @throws {Error} <lang><zh-CN>缺项、串作用域或内容/位置改写。</zh-CN><en>Missing entries, cross-scope joins or changed content/locations.</en></lang>
 */
export function assertSatelliteApiEntries({row, document, map, entries}) {
  const relevant = entries.filter(entry => entry.identityScope === row.identityScope && entry.input?.path === row.documentPath);
  const indexed = new Map(relevant.map(entry => [entry.symbolId, entry]));
  assert.equal(indexed.size, relevant.length, "Duplicate scoped satellite entry.");
  assert.equal(indexed.size, document.symbols.length, "Missing scoped satellite declaration.");
  for (const symbol of document.symbols) {
    const entry = indexed.get(symbol.id);
    assert(entry, "Missing satellite declaration.");
    for (const field of ["name", "kind", "signature", "summary", "i18n"]) assert.deepEqual(entry[field], symbol[field], "Satellite field changed.");
    assert.equal(entry.hierarchy?.parentSymbolId, symbol.parentId, "Satellite parent changed.");
    // <lang><zh-CN>阅读器来源优先使用原生primaryBlock，声明锚点与完整地图范围分别核验。</zh-CN><en>The reader prefers native primaryBlock provenance; verify declaration anchors and complete map ranges separately.</en></lang>
    const source = symbol.source?.primaryBlock ?? symbol.source?.definedIn;
    assert.equal(entry.source?.path, source?.relativePath, "Satellite source changed.");
    assert.deepEqual(entry.source?.range, source?.range, "Satellite source range changed.");
    const mapping = map.entries.find(candidate => candidate.symbolId === symbol.id);
    assert(mapping && entry.docSourceMap?.entryId === mapping.id, "Satellite mapping is missing or changed.");
    const reference = mapping.sourceRefs?.[0];
    if (reference) {
      assert.equal(entry.docSourceMap.sourcePath, map.sources.find(candidate => candidate.id === reference.sourceId)?.path, "Satellite mapped source changed.");
      assert.deepEqual(entry.docSourceMap.sourceRange, reference.range, "Satellite mapped range changed.");
    }
  }
  for (const binding of row.bindings) for (const declaration of binding.declarations) {
    assert(indexed.has(declaration.nodeId), "Public satellite binding is absent.");
  }
}
