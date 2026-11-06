/**
 * @file
 * @lang zh-CN 独立JSON生产核对器的丢失、词法和地图拒绝回归。
 * @lang en Omission, lexeme and mapping rejection regressions for the independent JSON production verifier.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectJsonResource } from "./lib/json-resource-audit.mjs";
import { verifyJsonResourceProjection } from "./lib/json-resource-projection.mjs";
import { generateJsonDocumentation } from "../packages/jsondoc/dist/index.js";

/**
 * @lang zh-CN 分别通过TS审核和jsonc-parser生产构造独立输入。
 * @lang en Constructs independent inputs using TS auditing and jsonc-parser production separately.
 * @returns {object} <lang><zh-CN>可变回归夹具。</zh-CN><en>Mutable regression fixture.</en></lang>
 */
function fixture() {
  const bytes = Buffer.from('{"a":[9007199254740993,true],"$ref":"#/a"}');
  const result = generateJsonDocumentation(bytes, { path: "sample.json", locale: "en" });
  return { expected: { source: "sample.json", ...inspectJsonResource(bytes) }, ...result, bytes };
}

test("matches complete values, raw lexemes, source bytes and exact maps", () => {
  const data = fixture();
  assert.deepEqual(verifyJsonResourceProjection(data.expected, data.document, data.sourceMap, data.bytes), { values: 5, referenceOccurrences: 1 });
});

test("rejects missing or duplicate values and incomplete navigation", () => {
  for (const change of [data => data.document.symbols.pop(), data => data.document.symbols[1] = data.document.symbols[0], data => data.document.nodes[0].children.pop()]) {
    const data = fixture(); change(data);
    assert.throws(() => verifyJsonResourceProjection(data.expected, data.document, data.sourceMap, data.bytes));
  }
});

test("rejects changed numeric lexemes, positions, parents and reference claims", () => {
  for (const change of [data => data.document.symbols[2].metadata.json.lexeme = "9007199254740992", data => data.sourceMap.entries[0].sourceRefs[0].rangeConvention.endBoundary = "inclusive", data => data.document.symbols[2].parentId = "other", data => data.document.symbols[4].metadata.json.reference.semantics = "resolved-schema"]) {
    const data = fixture(); change(data);
    assert.throws(() => verifyJsonResourceProjection(data.expected, data.document, data.sourceMap, data.bytes));
  }
});

test("rejects changed original source bytes", () => {
  const data = fixture();
  assert.throws(() => verifyJsonResourceProjection(data.expected, data.document, data.sourceMap, Buffer.from("{}")));
});
