/**
 * @file
 * @lang zh-CN 附加官网路径时保护既有根、索引和深链。
 * @lang en Protect the existing root, index and deep links when appending website routes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendOfficialWeb } from "../../scripts/append-official-web.mjs";

/**
 * @lang zh-CN 创建最小参考目标，官网仍使用正常构建结果。
 * @lang en Create a minimal reference destination while using actual built website pages.
 * @param {object} t - 测试清理宿主。 Test cleanup host.
 * @returns {string} 独占目标目录。 Exclusive destination.
 */
function fixture(t) {
  const root = fileURLToPath(new URL("../../dist/", import.meta.url));
  const directory = fs.mkdtempSync(path.join(root, "append-site-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, "index.html"), "Original root");
  fs.writeFileSync(path.join(directory, "versions.json"), "Original machine index");
  for (const locale of ["en", "zh-CN"]) {
    fs.mkdirSync(path.join(directory, locale));
    fs.writeFileSync(path.join(directory, locale, "index.html"), "<!doctype html><h1>Original reference</h1>");
  }
  // <lang><zh-CN>已确认的独立输出是官网的实际生成依赖，夹具也须提供精确双语入口。</zh-CN><en>The confirmed standalone output is an actual generated website dependency, so fixtures supply its exact locale entries.</en></lang>
  fs.mkdirSync(path.join(directory, "jsdoc"));
  for (const locale of ["en", "zh-CN"]) fs.writeFileSync(path.join(directory, "jsdoc", `index.${locale}.html`), "<!doctype html><h1>Standalone JSDoc</h1>");
  return directory;
}

test("append actual manuals without replacing existing identities and allow retry", async t => {
  const directory = fixture(t);
  const first = await appendOfficialWeb(directory);
  assert.equal(first.addedFiles, 32);
  assert.equal(fs.readFileSync(path.join(directory, "index.html"), "utf8"), "Original root");
  assert.equal(fs.readFileSync(path.join(directory, "versions.json"), "utf8"), "Original machine index");
  assert(fs.existsSync(path.join(directory, "docs/en/code/index.html")));
  assert.equal((await appendOfficialWeb(directory)).addedFiles, 0);
});

test("conflicting website paths fail before any copy", async t => {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, "favicon.svg"), "Existing different asset");
  await assert.rejects(appendOfficialWeb(directory), /conflicts/);
  assert(!fs.existsSync(path.join(directory, "docs")));
});

test("linked destination files and overlapping inputs are rejected", async t => {
  const directory = fixture(t);
  fs.linkSync(path.join(directory, "index.html"), path.join(directory, "linked.html"));
  await assert.rejects(appendOfficialWeb(directory), /ordinary artifact/);
  await assert.rejects(appendOfficialWeb(directory, directory), /overlap/);
});
