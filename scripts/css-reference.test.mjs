/** @file @lang zh-CN CSS八包发布清单及分区导航的先行回归。 @lang en Up-front regressions for the eight CSS tool packages and partition navigation. */
import test from "node:test";
import assert from "node:assert/strict";
import {loadCssReferenceInputs, assertCssReferenceInputs, createCssReferenceNavigation} from "./css-reference-inputs.mjs";
import {buildJavaScriptReference, buildJavaScriptPackageReference} from "./build-javascript-reference.mjs";
import {buildCssReference} from "./build-css-reference.mjs";

test("CSS publication selects all eight packages, four exact resources and the confirmed independent site", () => {
  const value = loadCssReferenceInputs();
  assert.equal(value.packages.length, 8);
  assert.equal(value.resources.length, 4);
  assert.deepEqual(value.sites.map(site => site.repository), ["mandolin/HIA-Documentation-API-CSS"]);
  assert.equal(value.sites[0].base, "/HIA-Documentation-API-CSS/");
});

test("CSS registry rejects changed package, resource ownership, duplicate and unconfirmed routes", () => {
  for (const change of [
    value => value.packages.push(value.packages[0]),
    value => value.packages[0] = "@hia-doc/jsdoc-runner",
    value => value.resources[0].package = "@hia-doc/css-parser",
    value => value.resources[0].subpath = "../private.json",
    value => value.resources.push(value.resources[0]),
    value => value.resources[0].site = "javascript-api",
    value => value.sites[0].path = "css/",
    value => value.sites[0].base = "https://other.invalid/",
    value => value.sites[0].repository = "other/site",
    value => value.sites[0].titleByLocale.en = " ",
    value => value.extra = true
  ]) {
    const value = loadCssReferenceInputs();
    change(value);
    assert.throws(() => assertCssReferenceInputs(value));
  }
});

test("CSS locale and preview version targets select the current partition with shared official tabs", () => {
  const navigation = createCssReferenceNavigation(loadCssReferenceInputs(), "css-api");
  for (const locale of ["zh-CN", "en"]) {
    assert.equal(navigation.localeTargets[locale], "/HIA-Documentation-API-CSS/" + locale + "/");
    assert.equal(navigation.documentationVersion.entries[0].hrefByLocale[locale], navigation.localeTargets[locale]);
    assert.equal(navigation.documentationTabs.find(tab => tab.id === "code").hrefByLocale[locale], "/HIA-Documentation-API/" + locale + "/");
  }
  assert.equal(navigation.documentationVersion.status, "preview");
  assert.throws(() => createCssReferenceNavigation(loadCssReferenceInputs(), "unknown"));
});

test("the original JavaScript entry and shared native builder coexist with the independent CSS entry", () => {
  assert.equal(typeof buildJavaScriptReference, "function");
  assert.equal(typeof buildJavaScriptPackageReference, "function");
  assert.equal(typeof buildCssReference, "function");
});
