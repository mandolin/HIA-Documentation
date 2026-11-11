/** @file @lang zh-CN 已确认JavaScript发布清单、分区导航和声明来源分组的回归。 @lang en Regressions for the confirmed JavaScript publication registry, partition navigation and declaration-source grouping. */
import test from "node:test";
import assert from "node:assert/strict";
import {loadJavaScriptReferenceInputs, assertJavaScriptReferenceInputs, createJavaScriptReferenceNavigation, groupJavaScriptPublicationDeclarations} from "./javascript-reference-inputs.mjs";

test("confirmed JavaScript publication selects ten packages and three resources in two sites", () => {
  const value = loadJavaScriptReferenceInputs();
  assert.equal(value.packages.length, 10);
  assert.equal(value.resources.length, 3);
  assert.deepEqual(value.sites.map(site => site.repository), ["mandolin/HIA-Documentation-API-JavaScript", "mandolin/HIA-Documentation-Resources-JSDoc"]);
});

test("unknown packages, resource ownership, duplicate selectors and unsafe routes fail", () => {
  for (const change of [
    value => value.packages.push(value.packages[0]),
    value => value.packages[0] = "@other/private",
    value => value.resources[0].site = "unknown",
    value => value.resources.push(value.resources[0]),
    value => value.resources[0].subpath = "../private",
    value => value.sites[0].path = "../escape/",
    value => value.sites[0].base = "https://example.com/",
    value => value.sites[0].repository = "other/project",
    value => value.extra = true
  ]) {
    const value = loadJavaScriptReferenceInputs();
    change(value);
    assert.throws(() => assertJavaScriptReferenceInputs(value));
  }
});

test("language and actual preview version target the current partition independently of the code gateway", () => {
  const registry = loadJavaScriptReferenceInputs();
  for (const site of registry.sites) {
    const navigation = createJavaScriptReferenceNavigation(registry, site.id);
    for (const locale of ["zh-CN", "en"]) {
      assert.equal(navigation.localeTargets[locale], site.base + site.path + locale + "/");
      assert.equal(navigation.documentationVersion.entries[0].hrefByLocale[locale], navigation.localeTargets[locale]);
      assert.equal(navigation.documentationTabs.find(item => item.id === "code").hrefByLocale[locale], "/HIA-Documentation-API/" + locale + "/");
    }
    assert.equal(navigation.documentationVersion.status, "preview");
  }
  assert.throws(() => createJavaScriptReferenceNavigation(registry, "missing"));
});

test("member declarations use their physical package while schema members retain separate proof", () => {
  const declaration = {path: "packages/runner/src/config.mjs", line: 1};
  const inventory = {packages: [
    {name: "producer", owner: "demo", directory: "packages/producer", modules: [{path: "packages/producer/src/index.mjs", exports: [{name: "make", declarations: [{path: "packages/producer/src/index.mjs", line: 1}], members: [{memberPath: ["schema"], declarations: [declaration]}]}]}]},
    {name: "runner", owner: "demo", directory: "packages/runner", modules: []}
  ]};
  const proof = {rows: [{package: "producer", module: "packages/producer/src/index.mjs", name: "make", memberPath: ["schema"], originalDeclarations: [declaration], evidenceKind: "schema-resource", schemaEvidence: {symbolId: "schema"}, contentVerified: true}], declaredArrayRows: []};
  const result = groupJavaScriptPublicationDeclarations(inventory, proof);
  assert.equal(result.groups.length, 1);
  assert.equal(result.members[0].schemaEvidence.symbolId, "schema");
  delete proof.rows[0].evidenceKind;
  proof.rows[0].declarations = [{nodeId: "native"}];
  const native = groupJavaScriptPublicationDeclarations(inventory, proof);
  assert.equal(native.groups.find(group => group.source.endsWith("config.mjs")).pack.name, "runner");
  proof.rows[0].originalDeclarations = [];
  assert.throws(() => groupJavaScriptPublicationDeclarations(inventory, proof));
});
