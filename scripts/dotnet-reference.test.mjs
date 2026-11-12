/** @file @lang zh-CN DotNetDoc六包发布清单及分区导航的先行回归。 @lang en Up-front regressions for the six DotNetDoc tool packages and partition navigation. */
import test from "node:test";
import assert from "node:assert/strict";
import {loadDotNetReferenceInputs, assertDotNetReferenceInputs, createDotNetReferenceNavigation} from "./dotnet-reference-inputs.mjs";
import {buildJavaScriptReference, buildJavaScriptPackageReference} from "./build-javascript-reference.mjs";
import {buildDotNetReference} from "./build-dotnet-reference.mjs";

test("DotNetDoc publication selects all six packages, sixteen exact resources and the confirmed independent site", () => {
  const value = loadDotNetReferenceInputs();
  assert.equal(value.packages.length, 6);
  assert.equal(value.resources.length, 16);
  assert.deepEqual(value.sites.map(site => site.repository), ["mandolin/HIA-Documentation-API-DotNetDoc"]);
  assert.equal(value.sites[0].base, "/HIA-Documentation-API-DotNetDoc/");
});

test("DotNetDoc registry rejects changed package, resource ownership, duplicate and unconfirmed routes", () => {
  for (const change of [
    value => value.packages.push(value.packages[0]),
    value => value.packages[0] = "@hia-doc/jsdoc-runner",
    value => value.resources[0].package = "@hia-doc/dotnet-source-extractor",
    value => value.resources[0].subpath = "../private.json",
    value => value.resources.push(value.resources[0]),
    value => value.resources[0].site = "javascript-api",
    value => value.sites[0].path = "dotnetdoc/",
    value => value.sites[0].base = "https://other.invalid/",
    value => value.sites[0].repository = "other/site",
    value => value.sites[0].titleByLocale.en = " ",
    value => value.extra = true
  ]) {
    const value = loadDotNetReferenceInputs();
    change(value);
    assert.throws(() => assertDotNetReferenceInputs(value));
  }
});

test("DotNetDoc locale and preview version targets select the current partition with shared official tabs", () => {
  const navigation = createDotNetReferenceNavigation(loadDotNetReferenceInputs(), "dotnet-api");
  for (const locale of ["zh-CN", "en"]) {
    assert.equal(navigation.localeTargets[locale], "/HIA-Documentation-API-DotNetDoc/" + locale + "/");
    assert.equal(navigation.documentationVersion.entries[0].hrefByLocale[locale], navigation.localeTargets[locale]);
    assert.equal(navigation.documentationTabs.find(tab => tab.id === "code").hrefByLocale[locale], "/HIA-Documentation-API/" + locale + "/");
  }
  assert.equal(navigation.documentationVersion.status, "preview");
  assert.throws(() => createDotNetReferenceNavigation(loadDotNetReferenceInputs(), "unknown"));
});

test("the original JavaScript entry and shared native builder coexist with the independent DotNetDoc entry", () => {
  assert.equal(typeof buildJavaScriptReference, "function");
  assert.equal(typeof buildJavaScriptPackageReference, "function");
  assert.equal(typeof buildDotNetReference, "function");
});
