/**
 * @file
 * @lang zh-CN 用独立审核的Pointer、原文和范围验证JSON生产，缺项或改变词法均失败。
 * @lang en Verifies JSON production against independently audited pointers, source and ranges, rejecting omissions and changed lexemes.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

/**
 * @lang zh-CN 比较独立资源审核与实际核心文档、地图及原始快照，不进行schema引用求值。
 * @lang en Compares an independent resource audit with actual core documents, maps and original snapshots, without evaluating schema references.
 * @param {object} expected <lang><zh-CN>独立TypeScript JSON AST审核事实。</zh-CN><en>Independent TypeScript JSON AST audit facts.</en></lang>
 * @param {object} document <lang><zh-CN>实际生产的核心文档。</zh-CN><en>Actual produced core document.</en></lang>
 * @param {object} map <lang><zh-CN>实际doc-source-map。</zh-CN><en>Actual doc-source-map.</en></lang>
 * @param {Uint8Array} bytes <lang><zh-CN>实际生产的原始字节快照。</zh-CN><en>Actual produced original byte snapshot.</en></lang>
 * @returns {object} <lang><zh-CN>逐值和词法引用核对计数。</zh-CN><en>Verified value and lexical-reference counts.</en></lang>
 * @throws {Error} <lang><zh-CN>内容、结构、身份、范围、引用或原始字节不一致。</zh-CN><en>Inconsistent content, structure, identity, range, references or original bytes.</en></lang>
 */
export function verifyJsonResourceProjection(expected, document, map, bytes) {
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256);
  assert.equal(document.metadata.jsonResource.sha256, expected.sha256);
  assert.equal(document.metadata.jsonResource.path, expected.source);
  assert.equal(document.schemaVersion, "1.0.0");
  assert.equal(map.contractVersion, "1.1.0");
  assert.equal(document.symbols.length, expected.nodes.length);
  assert.equal(map.entries.length, expected.nodes.length);
  // <lang><zh-CN>独立按Pointer索引，重复身份不能掩盖被漏掉的值或来源条目。</zh-CN><en>Index independently by pointer so duplicate identities cannot conceal omitted values or source entries.</en></lang>
  const values = new Map(document.symbols.map(symbol => [symbol.metadata.json.pointer, symbol]));
  const mapped = new Map(map.entries.map(entry => [entry.symbolId, entry]));
  const sources = new Map(map.sources.map(source => [source.id, source]));
  assert.equal(values.size, expected.nodes.length);
  assert.equal(mapped.size, expected.nodes.length);
  const references = [];
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  for (const value of expected.nodes) {
    const actual = values.get(value.pointer);
    assert(actual, "Missing JSON pointer.");
    const json = actual.metadata.json;
    assert.equal(json.type, value.type);
    assert.equal(json.startOffset, value.startOffset);
    assert.equal(json.endOffset, value.endOffset);
    const raw = text.slice(json.startOffset, json.endOffset);
    assert.equal(createHash("sha256").update(raw).digest("hex"), value.sha256);
    if (Object.hasOwn(value, "lexeme")) assert.equal(json.lexeme, value.lexeme);
    assert.deepEqual(actual.source.definedIn.range, value.range);
    assert.equal(actual.source.definedIn.relativePath, expected.source);
    if (value.pointer !== "") {
      const parent = value.pointer.slice(0, value.pointer.lastIndexOf("/"));
      assert.equal(actual.parentId, values.get(parent)?.id);
    }
    const entry = mapped.get(actual.id);
    assert.equal(entry.sourceRefs.length, 1);
    const source = entry.sourceRefs[0];
    assert.equal(sources.get(source.sourceId)?.path, expected.source);
    assert.deepEqual(source.range, value.range);
    assert.deepEqual(source.rangeConvention, { endBoundary: "exclusive", columnUnit: "utf16-code-unit" });
    assert.equal(source.rangeSource, "parser");
    assert.equal(source.confidence, "high");
    if (json.reference) {
      assert.equal(json.reference.semantics, "lexical-occurrence");
      references.push({ pointer: json.pointer, value: json.reference.value });
    }
  }
  assert.deepEqual(references, expected.referenceOccurrences);
  // <lang><zh-CN>导航树也必须逐值覆盖，不能以完整符号数组替代真实层级结构。</zh-CN><en>The navigation tree must also cover every value; a complete symbol array cannot substitute for a real hierarchy.</en></lang>
  const navigated = [];
  const pending = [...document.nodes];
  while (pending.length) {
    const node = pending.pop();
    assert.equal(node.symbolIds.length, 1);
    navigated.push(node.symbolIds[0]);
    pending.push(...(node.children ?? []));
  }
  assert.deepEqual(navigated.sort(), document.symbols.map(symbol => symbol.id).sort());
  return { values: expected.nodes.length, referenceOccurrences: references.length };
}
