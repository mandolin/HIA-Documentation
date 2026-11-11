/**
 * @file
 * @lang zh-CN 仓库归属、稳定作用域与链接/身份拒绝的回归。
 * @lang en Regressions for repository ownership, stable scopes, and link/identity rejection.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import {test} from "node:test";
import {resolvePackageApiOwnership, createPackageApiIdentityScope} from "./lib/package-api-ownership.mjs";

test("ownership and scopes remain independent of versions and workspace locations", () => {
  const roots = [];
  const scopes = [];
  try {
    for (const version of ["0.1.0", "1.0.0"]) {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "hia-owner-"));
      roots.push(root);
      const directory = path.join(root, "HIA/hia-jsdoc/packages/fixture");
      fs.mkdirSync(directory, {recursive: true});
      fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({name: "@fixture/api", version}));
      fs.writeFileSync(path.join(directory, "index.mjs"), "export const sample = 1;\n");
      const item = {name: "@fixture/api", owner: "hia-jsdoc", directory: "packages/fixture"};
      const ownership = resolvePackageApiOwnership(root, item);
      assert.equal(ownership.version, version);
      assert.equal(ownership.sourceReadPermission, undefined);
      scopes.push(createPackageApiIdentityScope(item, ownership, "packages/fixture/index.mjs"));
      assert.throws(() => resolvePackageApiOwnership(root, {...item, owner: "unknown"}));
      assert.throws(() => resolvePackageApiOwnership(root, {...item, directory: "../fixture"}));
      assert.throws(() => resolvePackageApiOwnership(root, {...item, name: "@fixture/other"}));
      assert.throws(() => createPackageApiIdentityScope(item, ownership, "../index.mjs"));
      fs.linkSync(path.join(directory, "index.mjs"), path.join(directory, "linked.mjs"));
      assert.throws(() => createPackageApiIdentityScope(item, ownership, "packages/fixture/linked.mjs"));
    }
    assert.match(scopes[0], /^package:[a-f0-9]{64}$/u);
    assert.equal(scopes[0], scopes[1]);
  } finally {
    for (const root of roots) fs.rmSync(root, {recursive: true, force: true});
  }
});

test("ownership rejects redirected repository roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hia-owner-link-"));
  try {
    fs.mkdirSync(path.join(root, "outside"));
    fs.mkdirSync(path.join(root, "HIA"));
    fs.symlinkSync(path.join(root, "outside"), path.join(root, "HIA/hia-jsdoc"), "junction");
    assert.throws(() => resolvePackageApiOwnership(root, {owner: "hia-jsdoc", directory: "", name: "fixture"}), /Linked/u);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
