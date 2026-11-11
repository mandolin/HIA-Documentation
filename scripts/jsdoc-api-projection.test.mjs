/**
 * @file
 * @lang zh-CN 原生JSDoc公开声明筛选及完整字段、层级和独立来源的反例。
 * @lang en Counterexamples for native JSDoc public-declaration selection, complete fields, hierarchy and independent origins.
 */
import assert from "node:assert/strict";
import {test} from "node:test";
import {selectNativeJsdocApi, assertSatelliteApiEntries} from "./lib/jsdoc-api-projection.mjs";
import {assertSatelliteApiRuntime, prepareSatellitePackageApis, collectSatelliteModuleDeclarations} from "./prepare-satellite-package-apis.mjs";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

/**
 * @lang zh-CN 建立两个公开声明及一个内部帮助声明的最小关联夹具。
 * @lang en Build a minimal association fixture with two public declarations and an internal helper.
 */
function fixture() {
  const source = "HIA/hia-jsdoc/packages/fixture/index.mjs";
  const field = {localizedText: {en: "Public description.", "zh-CN": "公开说明。"}};
  const symbols = ["visible", "child", "internal"].map((name, index) => ({
    id: name, name, kind: "function", signature: name + "()", i18n: {fields: {description: structuredClone(field)}},
    metadata: {jsdoc: {name}}, source: {definedIn: {relativePath: source, position: {line: index + 1}, range: {start: {line: index + 1}, end: {line: index + 1}}}},
    ...(name === "child" ? {parentId: "visible"} : {})
  }));
  const document = {id: "fixture", symbols, nodes: []};
  const integration = {contract: "hia-jsdoc-integration", contractVersion: "0.1.0", ir: {nodes: structuredClone(symbols.map(symbol => ({...symbol, jsdoc: symbol.metadata.jsdoc})))}};
  const bindings = [{name: "visible", declarationName: "visible", status: "resolved", declarations: [{path: "packages/fixture/index.mjs", line: 1}]}];
  return {source, owner: "hia-jsdoc", artifact: "native/integration.json", status: "success", document, integration, bindings};
}

test("selects actual public roots and documented descendants while retaining original data", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const result = selectNativeJsdocApi(input);
  assert.deepEqual(result.document.symbols.map(symbol => symbol.id), ["visible", "child"]);
  assert.deepEqual(result.document.symbols, input.document.symbols.slice(0, 2));
  assert.equal(result.bindings[0].declarations[0].nodeId, "visible");
  assert.equal(JSON.stringify(input), before);
});

test("blocks unresolved, ambiguous and changed native declaration associations", () => {
  for (const mutate of [
    input => {input.bindings[0].status = "unresolved";},
    input => {input.bindings[0].declarations[0].line = 99;},
    input => {input.integration.ir.nodes.push(structuredClone(input.integration.ir.nodes[0]));},
    input => {input.document.symbols[0].signature = "changed()";},
    input => {input.document.symbols[0].i18n.fields.description.localizedText.en = "Changed";}
  ]) {
    const input = fixture();
    mutate(input);
    assert.throws(() => selectNativeJsdocApi(input));
  }
});

test("requires bilingual public text and callable signatures", () => {
  for (const mutate of [
    input => {delete input.document.symbols[0].signature; delete input.integration.ir.nodes[0].signature;},
    input => {delete input.document.symbols[0].i18n.fields.description.localizedText["zh-CN"]; delete input.integration.ir.nodes[0].i18n.fields.description.localizedText["zh-CN"];}
  ]) {
    const input = fixture();
    mutate(input);
    assert.throws(() => selectNativeJsdocApi(input));
  }
});

test("site verification isolates equal native IDs and checks every field and mapping", () => {
  const input = fixture();
  const selected = selectNativeJsdocApi(input);
  const row = {name: "@fixture/public", identityScope: "package:fixture", documentPath: "api.hia.json", bindings: selected.bindings};
  const entries = selected.document.symbols.map(symbol => ({...symbol, symbolId: symbol.id, identityScope: row.identityScope,
    input: {path: row.documentPath}, hierarchy: {...(symbol.parentId ? {parentSymbolId: symbol.parentId} : {})},
    source: {path: symbol.source.definedIn.relativePath, range: symbol.source.definedIn.range}, docSourceMap: {entryId: "map:" + symbol.id}}));
  const maps = {entries: selected.document.symbols.map(symbol => ({id: "map:" + symbol.id, symbolId: symbol.id}))};
  assert.doesNotThrow(() => assertSatelliteApiEntries({row, document: selected.document, map: maps, entries}));
  assert.throws(() => assertSatelliteApiEntries({row, document: selected.document, map: maps, entries: entries.map(entry => ({...entry, identityScope: "package:other"}))}));
  const broken = structuredClone(entries);
  broken[0].i18n.fields.description.localizedText.en = "Changed";
  assert.throws(() => assertSatelliteApiEntries({row, document: selected.document, map: maps, entries: broken}));
  const withoutMap = structuredClone(entries);
  delete withoutMap[0].docSourceMap;
  assert.throws(() => assertSatelliteApiEntries({row, document: selected.document, map: maps, entries: withoutMap}));
  // <lang><zh-CN>原生预览块和完整地图允许不同范围，各自必须与对应来源逐项一致。</zh-CN><en>Native previews and complete maps may span different ranges, each matching its respective provenance.</en></lang>
  const preview = structuredClone(selected.document);
  preview.symbols[0].source.primaryBlock = {relativePath: input.source, range: {start: {line: 1}, end: {line: 4}}};
  const previewEntries = structuredClone(entries);
  previewEntries[0].source.range = preview.symbols[0].source.primaryBlock.range;
  maps.sources = [{id: "source", path: input.source}];
  maps.entries[0].sourceRefs = [{sourceId: "source", range: {start: {line: 1}, end: {line: 8}}}];
  Object.assign(previewEntries[0].docSourceMap, {sourcePath: input.source, sourceRange: maps.entries[0].sourceRefs[0].range});
  assert.doesNotThrow(() => assertSatelliteApiEntries({row, document: preview, map: maps, entries: previewEntries}));
  previewEntries[0].docSourceMap.sourceRange = {start: {line: 1}, end: {line: 4}};
  assert.throws(() => assertSatelliteApiEntries({row, document: preview, map: maps, entries: previewEntries}));
});

test("rejects unowned output and implicit package selection before writing", async () => {
  const main = fileURLToPath(new URL("../", import.meta.url));
  assert.throws(() => assertSatelliteApiRuntime(main));
  assert.throws(() => assertSatelliteApiRuntime(path.dirname(main)));
  fs.mkdirSync(path.join(main, "dist"), {recursive: true});
  const runtime = fs.mkdtempSync(path.join(main, "dist/satellite-boundary-test-"));
  try {
    assert.doesNotThrow(() => assertSatelliteApiRuntime(runtime));
    await assert.rejects(prepareSatellitePackageApis({workspaceRoot: path.dirname(main), runtimeRoot: runtime, publicSources: []}), /explicit/u);
    assert.deepEqual(fs.readdirSync(runtime), []);
  } finally {
    fs.rmdirSync(runtime);
  }
});

test("groups aliases and reexports by original declaration while keeping resource and bin entries separate", () => {
  const declarations = [{path: "packages/tool/src/value.mjs", line: 8}];
  const pack = {directory: "packages/tool", entries: [{kind: "runtime-module", source: "src/index.mjs"}, {kind: "command", source: "src/cli.mjs"}, {kind: "json-resource", source: "schema.json"}],
    modules: [{path: "packages/tool/src/index.mjs", exports: ["default", "value"].map(name => ({name, declarationName: "value", status: "resolved", declarations}))},
      {path: "packages/tool/src/cli.mjs", exports: [{name: "internalCommand"}]}]};
  const before = structuredClone(pack);
  const groups = collectSatelliteModuleDeclarations(pack);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].path, declarations[0].path);
  assert.deepEqual(groups[0].exports.map(binding => binding.name), ["default", "value"]);
  assert(groups[0].exports.every(binding => binding.modulePath === "packages/tool/src/index.mjs"));
  assert.deepEqual(pack, before);
  for (const patch of [{status: "unresolved"}, {declarations: []}, {declarations: [...declarations, ...declarations]}, {declarations: [{path: "value.d.ts"}]}]) {
    const broken = structuredClone(pack);
    Object.assign(broken.modules[0].exports[0], patch);
    assert.throws(() => collectSatelliteModuleDeclarations(broken));
  }
});
