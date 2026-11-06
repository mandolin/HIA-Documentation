/**
 * @lang zh-CN 严格JSON资源独立审核的定位、内容和拒绝反例。
 * @lang en Location, content and rejection regressions for independent strict-JSON resource auditing.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {inspectJsonResource, readJsonResourceBytes} from "./lib/json-resource-audit.mjs";

// <lang><zh-CN>文件边界夹具位于本主仓唯一忽略目录，保留供复核。</zh-CN><en>File-boundary fixtures occupy a unique ignored directory under this main repository, retained for review.</en></lang>
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
fs.mkdirSync(dist, {recursive: true});
const fixture = fs.mkdtempSync(path.join(dist, "json-resource-audit-test-"));
fs.writeFileSync(path.join(fixture, "resource.json"), '{"value":1}');

test("all object, array and scalar values have distinct RFC6901 pointers", () => {
  const report = inspectJsonResource('{"a/b":{"~key":[true,null,7]},"":false}');
  assert.deepEqual(report.nodes.map(node => node.pointer), ["", "/a~1b", "/a~1b/~0key", "/a~1b/~0key/0", "/a~1b/~0key/1", "/a~1b/~0key/2", "/"]);
  assert.equal(report.nodes.find(node => node.pointer === "/a~1b/~0key/0").type, "boolean");
});

test("raw number lexemes preserve integers beyond JavaScript precision", () => {
  const report = inspectJsonResource('[9007199254740993,1e400,-0]');
  assert.deepEqual(report.nodes.filter(node => node.type === "number").map(node => node.lexeme), ["9007199254740993", "1e400", "-0"]);
});

test("source positions preserve CRLF and UTF16 coordinates", () => {
  const text = '{\r\n  "emoji": "😀", "value": 3\r\n}';
  const report = inspectJsonResource(text);
  const value = report.nodes.find(node => node.pointer === "/value");
  assert.equal(text.slice(value.startOffset, value.endOffset), "3");
  assert.deepEqual(value.range, {start: {line: 2, column: 27}, end: {line: 2, column: 28}});
});

test("Unicode line separators inside JSON strings retain their physical line", () => {
  for (const separator of ["\u2028", "\u2029"]) {
    const report = inspectJsonResource('{"s":"' + separator + '","n":1}');
    const value = report.nodes.find(node => node.pointer === "/n");
    assert.deepEqual(value.range, {start: {line: 1, column: 14}, end: {line: 1, column: 15}});
  }
});

test("duplicate decoded object keys fail with a fixed diagnostic", () => {
  for (const text of ['{"x":1,"x":2}', '{"x":1,"\\u0078":2}']) {
    assert.throws(() => inspectJsonResource(text), {message: "JSON resource has duplicate object keys."});
  }
});

test("comments, trailing commas, invalid UTF8 and empty input fail", () => {
  for (const input of ['{"x":1,}', '{/* comment */"x":1}', "", Buffer.from([0xc3, 0x28])]) {
    assert.throws(() => inspectJsonResource(input));
  }
});

test("prototype-shaped names stay ordinary pointer tokens", () => {
  const report = inspectJsonResource('{"__proto__":{"constructor":1},"prototype":2}');
  assert(report.nodes.some(node => node.pointer === "/__proto__/constructor"));
  assert.equal({}.polluted, undefined);
});

test("reference occurrences retain lexical context inside data payloads", () => {
  const report = inspectJsonResource('{"$ref":"#/$defs/x","const":{"$ref":"plain data"}}');
  assert.deepEqual(report.referenceOccurrences.map(item => [item.pointer, item.value]), [["/$ref", "#/$defs/x"], ["/const/$ref", "plain data"]]);
  assert.equal(report.referenceSemantics, "lexical-occurrences");
});

test("boolean root schemas and null roots retain their actual type", () => {
  assert.equal(inspectJsonResource("false").nodes[0].type, "boolean");
  assert.equal(inspectJsonResource("null").nodes[0].type, "null");
});

test("depth and byte limits fail explicitly", () => {
  assert.throws(() => inspectJsonResource("[".repeat(130) + "0" + "]".repeat(130)), /limit/);
  assert.throws(() => inspectJsonResource('"' + "x".repeat(4 * 1024 * 1024) + '"'), /limit/);
});

test("explicit resource roots accept regular files and reject path escapes", () => {
  assert.equal(readJsonResourceBytes(fixture, "resource.json").toString(), '{"value":1}');
  for (const value of ["../resource.json", "./resource.json", "nested/../resource.json", "resource%2ejson", "C:/resource.json"]) {
    assert.throws(() => readJsonResourceBytes(fixture, value), /path/);
  }
});

test("hard-linked resources fail their physical boundary", () => {
  fs.writeFileSync(path.join(fixture, "original.json"), "{}");
  fs.linkSync(path.join(fixture, "original.json"), path.join(fixture, "linked.json"));
  assert.throws(() => readJsonResourceBytes(fixture, "linked.json"), /physical boundary/);
});

test("directory junctions cannot redirect a declared resource", () => {
  fs.mkdirSync(path.join(fixture, "actual"));
  fs.writeFileSync(path.join(fixture, "actual", "data.json"), "{}");
  fs.symlinkSync(path.join(fixture, "actual"), path.join(fixture, "redirect"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => readJsonResourceBytes(fixture, "redirect/data.json"), /physical boundary/);
});

test("lexical budget is checked before constructing a large AST", () => {
  assert.throws(() => inspectJsonResource("[" + "0,".repeat(130000) + "0]"), /syntax limit/);
});
