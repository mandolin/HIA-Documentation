/**
 * @file
 * @lang zh-CN 核心参考站发布边界的实际文件反例。
 * @lang en Filesystem regression cases for core-reference publication boundaries.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {createHash} from "node:crypto";
import { assertCoreReferenceOutput, inspectCoreReferenceSite, CORE_REFERENCE_RESOURCE_PACKAGES } from "./build-core-reference.mjs";

test("core API resource selection is the reviewed plugin SDK package", () => {
  assert.deepEqual(CORE_REFERENCE_RESOURCE_PACKAGES, ["@hia-doc/plugin-sdk"]);
  assert(Object.isFrozen(CORE_REFERENCE_RESOURCE_PACKAGES));
});

test("core output stays within an owned dist child", () => {
  const owner = fileURLToPath(new URL("../", import.meta.url));
  assert.doesNotThrow(() => assertCoreReferenceOutput(path.join(owner, "dist/test-core-output")));
  for (const invalid of [owner, path.join(owner, "dist"), path.join(owner, "../outside")]) {
    assert.throws(() => assertCoreReferenceOutput(invalid));
  }
});

test("site inventory hashes ordinary public files and rejects incomplete or private artifacts", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hia-api-site-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const locale of ["en", "zh-CN"]) {
    fs.mkdirSync(path.join(root, locale));
    fs.writeFileSync(path.join(root, locale, "project-index.json"), "{}");
  }
  fs.writeFileSync(path.join(root, "index.html"), "<a href=\"zh-CN/\">API</a>");
  const valid = inspectCoreReferenceSite(root);
  assert.equal(valid.files, 3);
  assert(valid.inventory.every(item => /^[0-9a-f]{64}$/.test(item.sha256)));
  fs.mkdirSync(path.join(root, "package-api"));
  assert.throws(() => inspectCoreReferenceSite(root), /Build files/);
  fs.rmdirSync(path.join(root, "package-api"));
  fs.writeFileSync(path.join(root, "en/private.html"), "K:/Project/Github_mandolin/private");
  assert.throws(() => inspectCoreReferenceSite(root), /private path/);
  fs.unlinkSync(path.join(root, "en/private.html"));
  fs.linkSync(path.join(root, "index.html"), path.join(root, "en/linked.html"));
  assert.throws(() => inspectCoreReferenceSite(root), /size or type/);
  fs.unlinkSync(path.join(root, "en/linked.html"));
  fs.unlinkSync(path.join(root, "zh-CN/project-index.json"));
  assert.throws(() => inspectCoreReferenceSite(root), /language index/);
});

test("source text attributes are accepted only at locale roots with the renderer's fixed contents", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hia-api-attributes-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const locale of ["en", "zh-CN"]) {
    fs.mkdirSync(path.join(root, locale));
    fs.writeFileSync(path.join(root, locale, "project-index.json"), "{}");
  }
  fs.writeFileSync(path.join(root, "index.html"), "API");
  const attributes = path.join(root, "en/.gitattributes");
  fs.writeFileSync(attributes, "sources/*.txt -text\n");
  assert.equal(inspectCoreReferenceSite(root).files, 4);
  fs.writeFileSync(attributes, "* text\n");
  assert.throws(() => inspectCoreReferenceSite(root), /source attributes/);
  fs.unlinkSync(attributes);
  fs.mkdirSync(path.join(root, "en/nested"));
  fs.writeFileSync(path.join(root, "en/nested/.gitattributes"), "sources/*.txt -text\n");
  assert.throws(() => inspectCoreReferenceSite(root), /Unexpected core reference path/);
});

test("explicit partition roots retain identical archive guards and reject unplanned directories", t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"hia-resource-site-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const roots=["schemas/core-and-source/en","profiles/zh-CN"];
  for(const localeRoot of roots) { fs.mkdirSync(path.join(root,localeRoot),{recursive:true}); fs.writeFileSync(path.join(root,localeRoot,"project-index.json"),"{}"); }
  fs.writeFileSync(path.join(root,"index.html"),"Resource references");
  fs.writeFileSync(path.join(root,roots[0],".gitattributes"),"sources/*.txt -text\n");
  assert.equal(inspectCoreReferenceSite(root,roots).files,4);
  fs.mkdirSync(path.join(root,"schemas/unplanned"));
  assert.throws(()=>inspectCoreReferenceSite(root,roots),/Unexpected/);
  for(const invalid of [[],["../outside"],["en","en"]]) assert.throws(()=>inspectCoreReferenceSite(root,invalid));
});

test("JSON source-regex text is decoded once as JSON while every private key and value is rejected", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hia-json-publication-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const locale of ["en", "zh-CN"]) {
    fs.mkdirSync(path.join(root, locale));
    fs.writeFileSync(path.join(root, locale, "project-index.json"), "{}");
  }
  fs.writeFileSync(path.join(root, "index.html"), "API");
  const artifact = path.join(root, "en/native.json");
  // <lang><zh-CN>JSON转义的正则反斜线属于公开代码文本，不能被拼成虚构UNC主机。</zh-CN><en>JSON-escaped regex backslashes are public code text and must not become a fictitious UNC host.</en></lang>
  fs.writeFileSync(artifact, JSON.stringify({source: 'const attribute = /([a-z]+)\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')/g;'}));
  assert.equal(inspectCoreReferenceSite(root).files, 4);
  for (const value of [
    {nested: [{source: "C:\\Users\\private\\source.js"}]},
    {source: "\\\\server\\private\\source.js"},
    {source: "%66ile%3A%2F%2F%2Fprivate%2Fsource.js"},
    {source: "\\u0043\\u003a\\u002fprivate"},
    {source: "&sol;home&sol;private&sol;source.js"},
    {"%43%3A%2Fprivate": "value"},
    {source: "work-zone/ai/private"}
  ]) {
    fs.writeFileSync(artifact, JSON.stringify(value));
    assert.throws(() => inspectCoreReferenceSite(root), /private path/u);
  }
  // <lang><zh-CN>重复键的旧值仍在发布字节中，每次字符串出现均要检查。</zh-CN><en>Shadowed duplicate-key values remain in published bytes, so every string occurrence requires inspection.</en></lang>
  fs.writeFileSync(artifact, '{"source":"C:/private/source.js","source":"safe.js"}');
  assert.throws(() => inspectCoreReferenceSite(root), /private path/u);
  fs.writeFileSync(artifact, '{"private-canary":"do-not-log",');
  assert.throws(() => inspectCoreReferenceSite(root), error => error.message === "Invalid public JSON artifact.");
});

test("presentation digests that resemble UNC paths require verified local asset bytes", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hia-digest-publication-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const locale of ["en", "zh-CN"]) {
    fs.mkdirSync(path.join(root, locale));
    fs.writeFileSync(path.join(root, locale, "project-index.json"), "{}");
  }
  fs.writeFileSync(path.join(root, "index.html"), "API");
  const profile = JSON.parse(fs.readFileSync(new URL("../fixtures/contract-history/documentation-presentation-profile.json", import.meta.url), "utf8"));
  const bytes = Buffer.from("Public source sample 1676");
  const digest = createHash("sha384").update(bytes).digest("base64");
  assert(digest.startsWith("//") && digest.slice(2).includes("/"));
  const asset = profile.source.assets[0];
  Object.assign(asset, {relativeUrl: "./sources/fixture.txt", byteLength: bytes.length, digest: {algorithm: "sha384", value: digest}});
  delete asset.lineCount;
  fs.mkdirSync(path.join(root, "en/sources"));
  const source = path.join(root, "en/sources/fixture.txt");
  fs.writeFileSync(source, bytes);
  fs.writeFileSync(path.join(root, "en/profile.json"), JSON.stringify(profile));
  assert.equal(inspectCoreReferenceSite(root).files, 5);
  const profilePath = path.join(root, "en/profile.json");
  for (const variant of [
    {...profile, contract: "unknown-profile"},
    {...profile, contractVersion: "99.0.0"},
    {...profile, unrelated: [{value: digest}]}
  ]) {
    fs.writeFileSync(profilePath, JSON.stringify(variant));
    assert.throws(() => inspectCoreReferenceSite(root), /private path/u);
  }
  fs.writeFileSync(profilePath, JSON.stringify(profile).replace('"value":', '"value":"//server/private", "value":'));
  assert.throws(() => inspectCoreReferenceSite(root), /private path/u);
  fs.writeFileSync(profilePath, JSON.stringify(profile));
  // <lang><zh-CN>相同字符串在普通字段中仍按文本检查，不能借摘要值扩大例外范围。</zh-CN><en>The same string in an ordinary field remains text, preventing digest values from widening the exception scope.</en></lang>
  fs.writeFileSync(path.join(root, "en/unrelated.json"), JSON.stringify({value: digest}));
  assert.throws(() => inspectCoreReferenceSite(root), /private path/u);
  fs.unlinkSync(path.join(root, "en/unrelated.json"));
  fs.writeFileSync(source, "changed source");
  assert.throws(() => inspectCoreReferenceSite(root), /asset|digest/u);
});
