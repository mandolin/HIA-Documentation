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
