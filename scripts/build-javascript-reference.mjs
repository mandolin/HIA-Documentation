/**
 * @file
 * @lang zh-CN 从当前源码与现有原生/资源审核正常生成JavaScript工具API和JSDoc证据两站，不依赖历史运行目录。
 * @lang en Build JavaScript tool API and JSDoc evidence sites from current sources and existing native/resource audits, without historical runtime directories.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash, randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";
import {auditRequiredPackages} from "./audit-required-package-api.mjs";
import {auditSatelliteNativeApi} from "./audit-satellite-native-api.mjs";
import {resolvePackageApiOwnership, createPackageApiIdentityScope} from "./lib/package-api-ownership.mjs";
import {selectNativeJsdocApi, assertSatelliteApiEntries} from "./lib/jsdoc-api-projection.mjs";
import {associateNativeJsdocBinding} from "./lib/jsdoc-api-bindings.mjs";
import {readJsonResourceBytes, inspectJsonResource} from "./lib/json-resource-audit.mjs";
import {verifyJsonResourceProjection} from "./lib/json-resource-projection.mjs";
import {copyPackageArtifact} from "./public-reference-packages.mjs";
import {assertCoreReferenceOutput, inspectCoreReferenceSite} from "./build-core-reference.mjs";
import {loadJavaScriptReferenceInputs, createJavaScriptReferenceNavigation, groupJavaScriptPublicationDeclarations} from "./javascript-reference-inputs.mjs";
import {convertJSDocIntegrationToHiaDocumentDetailed} from "../packages/parser-jsdoc/dist/index.js";
import {runDocumentationProducer} from "../packages/plugin-sdk/dist/index.js";
import {jsonDocumentationProducer} from "../packages/jsondoc/dist/index.js";

const main = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const locales = ["zh-CN", "en"];
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const toolVersion = read(path.join(main, "package.json")).version;

/**
 * @lang zh-CN 在已确认边界内生成两个可发布站点，保留失败暂存及旧成功输出，拒绝并发覆盖。
 * @lang en Build two publishable sites within confirmed boundaries, retaining failed staging and prior successful outputs while rejecting concurrent overwrites.
 * @param {object} [options] - workspaceRoot为固定源容器，out为主仓dist子目录。 workspaceRoot is the fixed source container; out is a child of main dist.
 * @returns {Promise<object>} 两站实际内容、容量及源提交。 Actual site contents, sizes and source commit.
 * @throws {Error} 来源、声明、字段、范围、授权、容量或生产不符合。 Invalid source, declarations, fields, ranges, grants, budgets or production.
 */
export async function buildJavaScriptReference(options = {}) {
  const workspace = fs.realpathSync(options.workspaceRoot ?? path.dirname(main));
  assert.equal(fs.realpathSync(path.join(workspace, "main-repo")), main);
  const registry = loadJavaScriptReferenceInputs();
  const output = path.resolve(main, options.out ?? "dist/javascript-reference-publication");
  assertCoreReferenceOutput(output);
  // <lang><zh-CN>来源身份固定为当前已提交主仓，发布清单和所有被核源在结束时再次比对。</zh-CN><en>Pin source identity to the committed main checkout, rechecking the registry and all audited sources at completion.</en></lang>
  execFileSync("git", ["-C", main, "diff", "--exit-code", "HEAD", "--"], {stdio: "pipe"});
  const sourceCommit = execFileSync("git", ["-C", main, "rev-parse", "HEAD"], {encoding: "utf8"}).trim();
  const registrySha256 = hash(fs.readFileSync(path.join(main, "reference/javascript-reference-inputs.json")));
  const inventory = auditRequiredPackages(workspace, {packageNames: registry.packages, includeMembers: true, includeDeclaredArrays: true});
  fs.mkdirSync(path.dirname(output), {recursive: true});
  const lockPath = output + ".lock";
  const lock = fs.openSync(lockPath, "wx");
  try {
    const staging = fs.mkdtempSync(output + ".staging-");
    const runtime = path.join(staging, ".runtime");
    fs.mkdirSync(runtime);
    // <lang><zh-CN>复用完整卫星审核的实际B/A、原生与JSONdoc链，当前固定审核器读取全部已登记卫星；公开输出仅取本清单十包。</zh-CN><en>Reuse the complete satellite audit's actual B/A, native and JSONdoc chains; the current fixed auditor reads all registered satellites while public output selects this registry's ten packages only.</en></lang>
    const native = await auditSatelliteNativeApi(workspace, {includeMembers: true, schemaResources: true, arrayResources: true, descriptorResources: true, includeDeclaredArrays: true});
    const nativeRoot = path.join(main, native.output);
    const grouped = groupJavaScriptPublicationDeclarations(inventory, native.report.declaredArrayMemberAudit);
    const inputs = {"javascript-api": [], "derivation-evidence": []};
    const rows = [], resources = [], dataRows = [];
    const files = {"javascript-api": new Set(), "derivation-evidence": new Set()};
    const sources = new Map();

    /** @lang zh-CN 将实际公开来源加入独占镜像，重复来源必须原字节相同。 @lang en Add actual public sources to an exclusive mirror, requiring identical original bytes for repeats. */
    function mirror(source, bytes) {
      const target = path.join(runtime, "source-root", source);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      if (fs.existsSync(target)) assert(fs.readFileSync(target).equals(bytes));
      else fs.writeFileSync(target, bytes, {flag: "wx"});
      sources.set(source, {source, sha256: hash(bytes), byteLength: bytes.length});
    }

    /** @lang zh-CN 记录宿主投影身份与原生工件引用，写入标准项目输入。 @lang en Record host-projection identity and native artifact references as standard project inputs. */
    function addInput(partition, key, scope, artifacts, semanticPath) {
      const resultPath = key + ".result.json";
      fs.writeFileSync(path.join(runtime, resultPath), JSON.stringify({contract: "documentation-producer-result", contractVersion: "1.0.0",
        producer: {id: "javascript-reference-projection", version: toolVersion}, status: "success", diagnostics: [], artifacts}), {flag: "wx"});
      inputs[partition].push({kind: "documentation-producer-result", path: resultPath, identityScope: scope, domain: partition === "javascript-api" ? "js" : "other", semanticPath});
      for (const artifact of artifacts) files[partition].add(artifact.path);
    }

    for (const group of grouped.groups) {
      const cached = native.report.sources.find(record => record.source === group.source);
      assert(cached && hash(readJsonResourceBytes(workspace, group.source)) === cached.sha256);
      for (const file of cached.artifacts) assert.equal(hash(fs.readFileSync(path.join(nativeRoot, file.path))), file.sha256);
      const identityScope = createPackageApiIdentityScope(group.pack, resolvePackageApiOwnership(workspace, group.pack), group.declarationPath);
      const integration = read(path.join(nativeRoot, cached.artifact));
      const converted = convertJSDocIntegrationToHiaDocumentDetailed(integration, {documentId: identityScope, includeEmptySymbols: true});
      assert(!converted.diagnostics.some(item => item.severity === "error"));
      const selected = selectNativeJsdocApi({...group, owner: group.pack.owner, artifact: cached.artifact, status: "success", integration, document: converted.document});
      const mapArtifact = cached.artifacts.find(file => file.kind === "doc-source-map");
      const map = read(path.join(nativeRoot, mapArtifact.path));
      const key = identityScope.slice(8);
      const base = "satellite-api/" + key;
      fs.mkdirSync(path.join(runtime, base), {recursive: true});
      const documentPath = base + "/api.hia.json";
      const mapPath = base + "/hia-doc-source-map.json";
      fs.writeFileSync(path.join(runtime, documentPath), JSON.stringify(selected.document, null, 2) + "\n");
      fs.writeFileSync(path.join(runtime, base, "native.hia.json"), JSON.stringify(converted.document, null, 2) + "\n");
      copyPackageArtifact(path.join(nativeRoot, cached.artifact), path.join(runtime, base, "hia-integration.json"), runtime);
      copyPackageArtifact(path.join(nativeRoot, mapArtifact.path), path.join(runtime, mapPath), runtime);
      // <lang><zh-CN>模块标签同时保留实际路径与默认别名，原规范节点名称和身份由原生工件提供。</zh-CN><en>Module labels retain actual paths and default aliases; native artifacts supply canonical names and identities.</en></lang>
      const aliases = [...new Set(group.bindings.filter(binding => binding.name !== binding.declarationName).map(binding => binding.name))];
      addInput("javascript-api", key, identityScope, [
        {id: "api", kind: "hia-document", path: documentPath, contract: "hia-core-document", contractVersion: selected.document.schemaVersion},
        {id: "map", kind: "doc-source-map", path: mapPath, contract: map.contract, contractVersion: map.contractVersion}
      ], [{kind: "repository", id: group.pack.owner, label: group.pack.repository}, {kind: "package", id: group.pack.name.slice(1).replaceAll("/", "--"), label: group.pack.name},
        {kind: "layer", id: key, label: group.declarationPath + (aliases.length ? " · " + aliases.join(" · ") : "")}]);
      files["javascript-api"].add(base + "/native.hia.json").add(base + "/hia-integration.json");
      rows.push({name: group.pack.name, version: group.pack.version, sourceHead: group.pack.sourceHead, repository: group.pack.repository,
        source: group.source, sourceSha256: cached.sha256, identityScope, documentPath, mapPath, bindings: selected.bindings, symbols: selected.document.symbols.length});
      mirror(group.source, readJsonResourceBytes(workspace, group.source));
    }

    // <lang><zh-CN>当前实际资源生产提供原生三工件，按精确公开导出选择并重新逐值核验。</zh-CN><en>Current resource production supplies three native artifacts per source, selected by exact public export and rechecked per value.</en></lang>
    const production = native.report.schemaMemberAudit.resourceProduction;
    for (const selector of registry.resources) {
      const pack = inventory.packages.find(pack => pack.name === selector.package);
      const entry = pack.entries.find(entry => entry.kind === "json-resource" && entry.subpath === selector.subpath);
      assert(entry, "Selected public JSON resource is absent.");
      const source = path.posix.join("HIA", pack.owner, pack.directory, entry.target);
      const index = production.sourcePaths.indexOf(source);
      assert(index >= 0);
      const artifacts = production.artifacts.slice(index * 3, index * 3 + 3);
      const key = hash(source);
      const base = "resource-api/" + key;
      const copied = artifacts.map(artifact => {
        const destination = base + "/" + path.posix.basename(artifact.path);
        copyPackageArtifact(path.join(main, production.output, artifact.path), path.join(runtime, destination), runtime);
        return {...artifact, path: destination};
      });
      const document = read(path.join(runtime, copied[0].path));
      const map = read(path.join(runtime, copied[1].path));
      const bytes = readJsonResourceBytes(workspace, source);
      verifyJsonResourceProjection({...inspectJsonResource(bytes), source}, document, map, bytes);
      addInput(selector.site, key, "resource:" + key, copied, [{kind: "package", id: key, label: pack.name + " · " + selector.subpath}]);
      resources.push({...selector, source, sha256: hash(bytes), identityScope: "resource:" + key, documentPath: copied[0].path, mapPath: copied[1].path, symbols: document.symbols.length});
      mirror(source, bytes);
    }

    for (const association of [native.report.arrayMemberAudit.arrayAssociationOutput, native.report.descriptorMemberAudit.descriptorAssociationOutput]) {
      const root = path.join(main, association);
      for (const record of read(path.join(root, "report.json")).rows.filter(record => record.owner === "hia-jsdoc")) {
        assert.equal(record.status, "verified");
        for (const source of record.sources) assert.equal(hash(readJsonResourceBytes(workspace, "HIA/" + record.owner + "/" + source.path)), source.sha256);
        for (const file of record.files) assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256);
        const key = hash(record.definitionModule + ":" + record.name);
        const base = "generated-data/" + key;
        const source = base + "/" + (record.name.endsWith("Descriptor") ? "descriptor.json" : "array.json");
        const bytes = fs.readFileSync(path.join(root, record.files[0].path));
        fs.mkdirSync(path.join(runtime, base), {recursive: true});
        fs.writeFileSync(path.join(runtime, source), bytes);
        const result = await runDocumentationProducer(jsonDocumentationProducer, {workspaceRoot: runtime, outputDirectory: path.join(runtime, base, "jsondoc"), inputs: [{kind: "json-resource", path: source, locale: "und"}]});
        assert.equal(result.status, "success");
        const artifacts = result.artifacts.map(artifact => {
          const destination = base + "/jsondoc/" + path.posix.basename(artifact.path);
          copyPackageArtifact(path.join(runtime, base, "jsondoc", artifact.path), path.join(runtime, destination), runtime);
          return {...artifact, path: destination};
        });
        const document = read(path.join(runtime, artifacts[0].path));
        verifyJsonResourceProjection({...inspectJsonResource(bytes), source}, document, read(path.join(runtime, artifacts[1].path)), bytes);
        addInput("javascript-api", key, "data:" + key, artifacts, [{kind: "package", id: record.package.slice(1).replaceAll("/", "--"), label: record.package}, {kind: "layer", id: key, label: record.name}]);
        copyPackageArtifact(path.join(root, record.files[1].path), path.join(runtime, base, "derivation-evidence.json"), runtime);
        files["javascript-api"].add(source).add(base + "/derivation-evidence.json");
        dataRows.push({package: record.package, name: record.name, source, identityScope: "data:" + key, documentPath: artifacts[0].path, mapPath: artifacts[1].path, symbols: document.symbols.length});
        mirror(source, bytes);
      }
    }

    // <lang><zh-CN>完整下载另取公开模块与schema依赖；来源镜像与页面片段分别保留原字节/范围。</zh-CN><en>Full downloads also include public modules and schema dependencies, retaining original bytes separately from page-preview ranges.</en></lang>
    const schemaRows = read(path.join(main, native.report.schemaMemberAudit.associationOutput, "report.json")).rows.filter(row => registry.packages.includes(row.package));
    for (const row of schemaRows) for (const source of row.sources) mirror(source.path, readJsonResourceBytes(workspace, source.path));
    for (const pack of inventory.packages) for (const module of pack.modules) {
      const source = "HIA/" + pack.owner + "/" + module.path;
      mirror(source, readJsonResourceBytes(workspace, source));
    }
    const fullSources = [...sources.values()].sort((left, right) => left.source.localeCompare(right.source));
    const reports = [];
    for (const site of registry.sites) {
      const root = path.join(staging, "sites", site.id);
      const navigationPath = path.join(runtime, site.id + ".navigation.json");
      fs.writeFileSync(navigationPath, JSON.stringify(createJavaScriptReferenceNavigation(registry, site.id)));
      const manifestPath = path.join(runtime, site.id + ".project.json");
      fs.writeFileSync(manifestPath, JSON.stringify({schemaVersion: "1.1.0", project: {id: "project:hia-" + site.id, name: "HIA Documentation System · " + site.titleByLocale.en, defaultLocale: "zh-CN", locales}, inputs: inputs[site.id]}));
      const selectedRows = site.id === "javascript-api" ? [...rows, ...resources.filter(row => row.site === site.id), ...dataRows] : resources.filter(row => row.site === site.id);
      const selectedSources = fullSources.filter(source => site.id === "derivation-evidence" ? source.source.includes("/evidence/hia-jsdoc-config-") : !source.source.includes("/evidence/hia-jsdoc-config-"));
      for (const locale of locales) {
        const target = path.join(root, site.path, locale);
        const configPath = path.join(runtime, site.id + "-" + locale + ".config.json");
        fs.writeFileSync(configPath, JSON.stringify({schemaVersion: "0.1.0", docs: {source: {presentation: "fetch", publicAssetPolicy: "explicit-public", localRoot: "source-root", maxLines: 400},
          theme: {colors: {accent: "#0047AB"}}, renderer: {uiLocale: locale, projectLayout: "split-site", informationArchitecture: {contentGrouping: "entry", loadingStrategy: "lazy", memberPlacement: "separate"}}}}));
        execFileSync(process.execPath, [path.join(main, "apps/cli/dist/index.js"), "docs", "build", "--config", configPath, "--project-manifest", manifestPath, "--site-navigation", navigationPath, "--out", target, "--locale", locale], {cwd: workspace, stdio: "inherit"});
        for (const file of files[site.id]) copyPackageArtifact(path.join(runtime, file), path.join(target, file), staging);
        const index = read(path.join(target, "project-index.json"));
        assert.equal(index.entries.length, selectedRows.reduce((sum, row) => sum + row.symbols, 0));
        if (site.id === "javascript-api") {
          for (const row of rows) assertSatelliteApiEntries({row, document: read(path.join(runtime, row.documentPath)), map: read(path.join(runtime, row.mapPath)), entries: index.entries});
          const outputs = rows.map(row => ({...row, status: "success", artifact: row.documentPath.replace("api.hia.json", "hia-integration.json"), integration: read(path.join(runtime, row.documentPath.replace("api.hia.json", "hia-integration.json"))), document: read(path.join(runtime, row.documentPath))}));
          const bindings = inventory.packages.flatMap(pack => pack.modules.flatMap(module => module.exports.map(binding => {
            const associated = associateNativeJsdocBinding({binding, owner: pack.owner, outputs});
            assert.equal(associated.status, "associated");
            return {package: pack.name, module: module.path, exportName: binding.name, destinations: associated.declarations.map(declaration => {
              const row = rows.find(row => row.source === declaration.source);
              const entry = index.entries.find(entry => entry.identityScope === row.identityScope && entry.symbolId === declaration.nodeId);
              assert(entry, "Public binding is absent from the published index.");
              return {identityScope: row.identityScope, symbolId: declaration.nodeId, page: entry.noScriptPagePath, content: entry.contentPath};
            })};
          })));
          fs.writeFileSync(path.join(target, "package-api-bindings.json"), JSON.stringify({bindings}, null, 2) + "\n");
          for (const member of grouped.members) {
            const row = member.schemaEvidence ? resources.find(row => row.source === member.schemaEvidence.resource.source) : rows.find(row => row.source === member.source);
            const ids = member.schemaEvidence ? [member.schemaEvidence.symbolId] : member.declarations.map(declaration => declaration.nodeId);
            assert(row && ids.every(id => index.entries.some(entry => entry.identityScope === row.identityScope && entry.symbolId === id)), "Public member is absent from the published index.");
          }
        }
        for (const source of selectedSources) copyPackageArtifact(path.join(runtime, "source-root", source.source), path.join(target, "source-files", source.source), staging);
        fs.mkdirSync(path.join(target, "source-files"), {recursive: true});
        fs.writeFileSync(path.join(target, "source-files/index.json"), JSON.stringify({sources: selectedSources.map(source => ({...source, path: "source-files/" + source.source}))}, null, 2) + "\n");
      }
      const target = site.path + "zh-CN/";
      fs.writeFileSync(path.join(root, "index.html"), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>HIA Documentation System · ${site.titleByLocale.en}</title><link rel="icon" href="data:,"></head><body><a href="${target}" lang="zh-CN">${site.titleByLocale["zh-CN"]}</a><a href="${site.path}en/" lang="en">${site.titleByLocale.en}</a></body></html>\n`);
      fs.writeFileSync(path.join(root, ".nojekyll"), "");
      const checked = inspectCoreReferenceSite(root, locales.map(locale => site.path + locale));
      const report = {sourceRepository: "mandolin/HIA-Documentation", sourceCommit, registrySha256, site,
        packages: inventory.packages.map(({name, version, repository, sourceHead}) => ({name, version, repository, sourceHead})),
        rows: site.id === "javascript-api" ? rows : [], resources: resources.filter(row => row.site === site.id), dataRows: site.id === "javascript-api" ? dataRows : [],
        memberPaths: site.id === "javascript-api" ? grouped.members.length : 0, fullSources: selectedSources, entriesPerLocale: selectedRows.reduce((sum, row) => sum + row.symbols, 0), ...checked};
      fs.mkdirSync(path.join(staging, "reports"), {recursive: true});
      fs.writeFileSync(path.join(staging, "reports", site.id + ".json"), JSON.stringify(report, null, 2) + "\n");
      reports.push({id: site.id, repository: site.repository, files: checked.files, bytes: checked.bytes});
    }
    assert.deepEqual(auditRequiredPackages(workspace, {packageNames: registry.packages, includeMembers: true, includeDeclaredArrays: true}), inventory);
    for (const source of fullSources.filter(source => source.source.startsWith("HIA/"))) assert.equal(hash(readJsonResourceBytes(workspace, source.source)), source.sha256);
    execFileSync("git", ["-C", main, "diff", "--exit-code", "HEAD", "--"], {stdio: "pipe"});
    assert.equal(execFileSync("git", ["-C", main, "rev-parse", "HEAD"], {encoding: "utf8"}).trim(), sourceCommit);
    // <lang><zh-CN>仅最终两个site目录可发布，运行目录与审核中间件留在装配根；失败时保留旧成功输出。</zh-CN><en>Only the two final site directories are publishable; runtime and audit intermediates stay at the assembly root, with prior successful output retained on failure.</en></lang>
    let backup;
    if (fs.existsSync(output)) { backup = output + ".previous-" + randomUUID(); assertCoreReferenceOutput(backup); fs.renameSync(output, backup); }
    try { fs.renameSync(staging, output); }
    catch (error) { if (backup) fs.renameSync(backup, output); throw error; }
    return {sourceCommit, sites: reports};
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}

// <lang><zh-CN>导入不执行构建，正常CLI仅接受明确源容器和自有输出。</zh-CN><en>Imports never execute builds; the normal CLI accepts only an explicit source container and owned output.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = {"--workspace-root": "workspaceRoot", "--out": "out"}[process.argv[index]];
    assert(key && process.argv[index + 1] && !Object.hasOwn(options, key));
    options[key] = process.argv[index + 1];
  }
  console.log(JSON.stringify(await buildJavaScriptReference(options)));
}
