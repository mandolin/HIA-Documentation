/** @file @lang zh-CN 官网清单无损编码、精确旧读及拒绝边界。 @lang en Lossless composition inventories, exact legacy reads, and rejection boundaries. */
import test from "node:test";
import assert from "node:assert/strict";
import {encodeCompositionReport, compositionFiles} from "../src/lib/composition-report.mjs";

/**
 * @lang zh-CN 构造重复来源内容和多语言路径的独立清单。
 * @lang en Create an independent inventory with repeated content and multilingual paths.
 * @param {string} [version="0.2.0"] - 既有清单版本。 Existing report version.
 * @returns {object} 不含本机路径的测试原件。 Test original without local paths.
 */
function report(version="0.2.0") {
  return {format:"hia-official-site-composition-report@"+version, copiedBytes:8, privacy:{status:"pass"},files:[
    {path:"en/entries/item.html",bytes:4,sha256:"a".repeat(64),kind:"preserved-deep-link"},
    {path:"zh-CN/entries/item.html",bytes:4,sha256:"a".repeat(64),kind:"preserved-deep-link"},
  ]};
}

test("dictionary report restores every field without changing the input", () => {
  const original=report();
  const before=structuredClone(original);
  const encoded=encodeCompositionReport(original);
  assert.equal(encoded.format,"hia-official-site-composition-report@0.3.0");
  assert(!Object.hasOwn(encoded,"files"));
  assert.deepEqual(compositionFiles(encoded),original.files);
  assert.deepEqual(encoded.privacy,original.privacy);
  assert.equal(encoded.copiedBytes,original.copiedBytes);
  assert.deepEqual(original,before);
  assert.equal(encoded.fileTable.names.length,1);
  assert.equal(encoded.fileTable.digests.length,1);
  assert.equal(JSON.stringify(encodeCompositionReport(before)),JSON.stringify(encoded));
});

for (const version of ["0.1.0","0.2.0"]) {
  test("retain the exact object inventory for existing report "+version, () => {
    const original=report(version);
    assert.strictEqual(compositionFiles(original),original.files);
    assert.deepEqual(original,report(version));
  });
}

test("embedded report production preserves its exact old representation", () => {
  const original=report("0.1.0");
  assert.strictEqual(encodeCompositionReport(original),original);
});

for (const [name,mutate] of [
  ["unknown version",value=>value.format="hia-official-site-composition-report@9.0.0"],
  ["ambiguous object inventory",value=>value.files=[]],
  ["missing dictionary",value=>delete value.fileTable.names],
  ["extra table field",value=>value.fileTable.external="https://example.invalid/"],
  ["duplicate dictionary value",value=>value.fileTable.names.push(value.fileTable.names[0])],
  ["unsafe directory",value=>value.fileTable.directories[0]="../private"],
  ["unsafe filename",value=>value.fileTable.names[0]="../item.html"],
  ["absolute filename",value=>value.fileTable.names[0]="/item.html"],
  ["invalid digest",value=>value.fileTable.digests[0]="bad"],
  ["unknown kind",value=>value.fileTable.kinds[0]="unchecked"],
  ["wrong row width",value=>value.fileTable.rows[0].push(0)],
  ["negative reference",value=>value.fileTable.rows[0][0]=-1],
  ["fractional reference",value=>value.fileTable.rows[0][1]=0.5],
  ["out-of-range reference",value=>value.fileTable.rows[0][3]=999],
  ["negative byte count",value=>value.fileTable.rows[0][2]=-1],
  ["oversized file",value=>value.fileTable.rows[0][2]=33554433],
  ["duplicate full path",value=>value.fileTable.rows.push([...value.fileTable.rows[0]])],
  ["too many rows",value=>value.fileTable.rows=Array(100001).fill(value.fileTable.rows[0])],
  ["empty inventory",value=>value.fileTable.rows=[]],
]) {
  test("reject compact inventory "+name, () => {
    // <lang><zh-CN>每个反例从有效编码独立修改，拒绝发生在任何文件读取之前。</zh-CN><en>Mutate each valid encoding independently and reject before any file read.</en></lang>
    const encoded=encodeCompositionReport(report());
    mutate(encoded);
    assert.throws(()=>compositionFiles(encoded));
  });
}

test("reject non-data accessors without executing them", () => {
  let calls=0;
  const input={};
  Object.defineProperty(input,"format",{get(){calls++;return "unsafe";}});
  assert.throws(()=>compositionFiles(input));
  assert.equal(calls,0);
});

test("only an explicit old sibling report can be encoded to the new identity", () => {
  assert.throws(()=>encodeCompositionReport({format:"unknown",files:[]}));
  const compact=encodeCompositionReport(report());
  assert.throws(()=>encodeCompositionReport(compact));
});

test("reject oversized arrays before enumerating input properties", () => {
  // <lang><zh-CN>仅用稀疏长度模拟超预算，不分配大量实际记录；任何属性枚举都会被计数。</zh-CN><en>Use sparse length to simulate excess input without allocating records, counting any property enumeration.</en></lang>
  let enumerations=0;
  const encoded=encodeCompositionReport(report());
  encoded.fileTable.rows=new Proxy(new Array(100001),{ownKeys(target){enumerations++;return Reflect.ownKeys(target);}});
  assert.throws(()=>compositionFiles(encoded));
  assert.equal(enumerations,0);
});

test("encoding rejects accessor-backed file arrays before iteration", () => {
  let calls=0;
  const original=report();
  const entry=original.files[0];
  Object.defineProperty(original.files,"0",{get(){calls++;return entry;}});
  assert.throws(()=>encodeCompositionReport(original));
  assert.equal(calls,0);
});

test("both generated metadata files count toward the complete file budget", () => {
  const encoded=encodeCompositionReport(report());
  encoded.fileTable.rows=Array(99999).fill(encoded.fileTable.rows[0]);
  assert.throws(()=>compositionFiles(encoded),/metadata.*file-count budget/);
});
