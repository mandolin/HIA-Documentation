/** @file @lang zh-CN 资源分区清单、选择和全名导航身份回归。 @lang en Regressions for resource partitions, selection and fully qualified navigation identities. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadResourceReferencePartitions, assertResourceReferencePartitions } from "./resource-reference-partitions.mjs";
import { selectPublicReferenceResources, publicReferenceResourceId, preparePublicReferenceResources } from "./public-reference-resources.mjs";
import { assertCoreReferenceOutput } from "./build-core-reference.mjs";
import { createResourceReferenceNavigation } from "./build-resource-reference.mjs";
import { collectPackageEntries } from "./lib/package-api-inputs.mjs";
import { assertResourceReferenceCoverage } from "./resource-reference-partitions.mjs";

test("the confirmed four partitions cover exactly 47 exports in two sites", () => {
  const registry = loadResourceReferencePartitions();
  assert.equal(registry.sites.length, 2);
  assert.equal(registry.partitions.length, 4);
  assert.equal(registry.partitions.flatMap(part => part.exports).length, 47);
  assert.deepEqual(registry.sites.map(site => site.repository), ["mandolin/HIA-Documentation-Resources-Core", "mandolin/HIA-Documentation-Resources-Applications"]);
});

test("every current core JSON export has one explicit publication owner", () => {
  // <lang><zh-CN>从真实包清单盘点当前资源，新增公开导出必须同步站点选择，SDK由现有核心API站承载。</zh-CN><en>Inventory current resources from real manifests so newly public exports require matching site selection, with SDK resources hosted by the existing core API site.</en></lang>
  const root=fileURLToPath(new URL("../",import.meta.url));
  const selection=JSON.parse(fs.readFileSync(path.join(root,"reference/required-package-api.inputs.json"),"utf8"));
  const packages=selection.packages.filter(item=>item.owner==="main-repo").map(item=>{
    const packageRoot=path.join(root,item.directory);
    const manifest=JSON.parse(fs.readFileSync(path.join(packageRoot,"package.json"),"utf8"));
    return {...item,entries:collectPackageEntries(packageRoot,manifest,item.sourceEntry,item.sourceEntries)};
  });
  assertResourceReferenceCoverage(loadResourceReferencePartitions(),{packages},["@hia-doc/plugin-sdk"]);
});

test("publication coverage rejects missing, extra, substituted and multiply owned resources", () => {
  const registry=loadResourceReferencePartitions();
  const rows=registry.partitions.flatMap(part=>part.exports);
  const packages=[...new Set(rows.map(row=>row.package))].map(name=>({name,directory:"packages/"+name.split("/")[1],entries:rows.filter(row=>row.package===name).map(row=>({kind:"json-resource",subpath:row.subpath,target:row.source.slice(("packages/"+name.split("/")[1]+"/").length)}))}));
  assertResourceReferenceCoverage(registry,{packages},[]);
  for(const change of [
    value=>value.partitions[0].exports.pop(),
    value=>value.partitions[0].exports[0].source="packages/profiles/dist/absent.json",
    value=>value.partitions[0].exports.push({package:"@hia-doc/profiles",subpath:"./absent.json",source:"packages/profiles/dist/absent.json"})
  ]){
    const candidate=structuredClone(registry);
    change(candidate);
    assert.throws(()=>assertResourceReferenceCoverage(candidate,{packages},[]));
  }
  assert.throws(()=>assertResourceReferenceCoverage(registry,{packages},["@hia-doc/profiles"]));
  assert.throws(()=>assertResourceReferenceCoverage(registry,{packages},["@hia-doc/missing"]));
});

test("invalid paths, duplicate members, overlapping roots and unknown site ownership fail", () => {
  for (const change of [
    value => value.partitions[0].exports.push(value.partitions[0].exports[0]),
    value => value.partitions[0].exports[0].source = "../private.json",
    value => value.partitions[0].site = "unknown",
    value => value.partitions[0].path = "../escape/",
    value => {
      value.partitions[0].site = "core";
      value.partitions[0].path = "schemas/core-and-source/child/";
      value.sites[0].partitions.push("profiles");
      value.sites[1].partitions.shift();
      value.sites[1].defaultPartition = "schema-business";
    },
    value => value.sites[0].base = "/another-site/",
    value => value.sites[0].partitions.push("missing"),
    value => value.partitions[0].extra = "unknown"
  ]) {
    const registry = loadResourceReferencePartitions();
    change(registry);
    assert.throws(() => assertResourceReferencePartitions(registry));
  }
});

test("export selection is exact and cannot silently omit unknown requests", () => {
  const pack = { name: "@hia-doc/schemas", directory:"packages/schemas", entries: [{kind:"json-resource",subpath:"./a.json",target:"dist/a.json"},{kind:"json-resource",subpath:"./b.json",target:"dist/b.json"}] };
  const inventory = {packages:[pack]};
  assert.equal(selectPublicReferenceResources(inventory).length, 2);
  assert.deepEqual(selectPublicReferenceResources(inventory,[{package:pack.name,subpath:"./b.json"}]).map(row=>row.entry.subpath),["./b.json"]);
  for (const selected of [[],[{package:pack.name,subpath:"./missing.json"}],[{package:pack.name,subpath:"./a.json"},{package:pack.name,subpath:"./a.json"}]]) assert.throws(()=>selectPublicReferenceResources(inventory,selected));
  assert.throws(()=>selectPublicReferenceResources(inventory,[{package:pack.name,subpath:"./a.json",source:"packages/schemas/dist/b.json"}]));
});

test("resource IDs retain legacy SDK names and distinguish nested and cross-package exports", () => {
  assert.equal(publicReferenceResourceId("@hia-doc/plugin-sdk","./plain-data-initialization.schema.json"),"plain-data-initialization.schema.json");
  const first=publicReferenceResourceId("@hia-doc/profiles","./catalog.json");
  const second=publicReferenceResourceId("@hia-doc/schemas","./catalog.json");
  assert.notEqual(first,second);
  assert.match(publicReferenceResourceId("@hia-doc/schemas","./tsdoc-project/catalog.json"),/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
});

test("resource version and locale menus select their partition while code navigation selects the core API", () => {
  const registry=loadResourceReferencePartitions();
  for(const part of registry.partitions) {
    const site=registry.sites.find(site=>site.id===part.site);
    const navigation=createResourceReferenceNavigation(registry,part.id);
    assert.equal(navigation.localeTargets.en,site.base+part.path+"en/");
    assert.equal(navigation.documentationVersion.entries[0].hrefByLocale["zh-CN"],site.base+part.path+"zh-CN/");
    assert.equal(navigation.documentationTabs.find(tab=>tab.id==="code").hrefByLocale.en,"/HIA-Documentation-API/en/");
  }
  assert.throws(()=>createResourceReferenceNavigation(registry,"missing"));
});

test("real catalog exports from different packages use independent native and input directories", async t => {
  const mainRoot=fileURLToPath(new URL("../",import.meta.url));
  const outputRoot=fs.mkdtempSync(path.join(mainRoot,"dist/resource-catalog-test-"));
  assertCoreReferenceOutput(outputRoot);
  t.after(()=>fs.rmSync(outputRoot,{recursive:true,force:true}));
  const selected=loadResourceReferencePartitions().partitions.flatMap(part=>part.exports).filter(entry=>entry.subpath==="./catalog.json");
  const result=await preparePublicReferenceResources({packageNames:["@hia-doc/profiles","@hia-doc/schemas"],resourceExports:selected,workspaceRoot:path.dirname(mainRoot),mainRoot,outputRoot,locales:[]});
  assert.equal(result.inputs.length,2);
  assert.equal(new Set(result.inputs.map(input=>input.path)).size,2);
  assert.equal(new Set(result.inputs.map(input=>input.semanticPath[1].id)).size,2);
  assert.deepEqual(result.sourcePaths.slice().sort(),selected.map(entry=>entry.source).sort());
});
