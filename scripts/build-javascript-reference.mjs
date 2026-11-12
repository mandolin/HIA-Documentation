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
import {auditSatelliteTypeApi} from "./audit-satellite-type-api.mjs";
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
 * @lang zh-CN 按已验证清单生成JavaScript源码工具包的原生API站点，保留失败暂存及旧成功输出，拒绝并发覆盖。
 * @lang en Build native API sites for JavaScript-source tool packages from validated inputs, retaining failed staging and prior successful outputs while rejecting concurrent overwrites.
 * @param {object} [options] - workspaceRoot为固定源容器，out为主仓dist子目录。 workspaceRoot is the fixed source container; out is a child of main dist.
 * @param {object} publication - 入口已验证的registry、registryPath、apiSiteId、resourceOwner、createNavigation与includeCommandSources，使用既有核心/资源契约。 Entry-validated registry, registryPath, apiSiteId, resourceOwner, createNavigation and includeCommandSources under existing core/resource contracts.
 * @returns {Promise<object>} 各站实际内容、容量及源提交。 Actual contents, size and source commit for each site.
 * @throws {Error} 来源、声明、字段、范围、授权、容量或生产不符合。 Invalid source, declarations, fields, ranges, grants, budgets or production.
 */
export async function buildJavaScriptPackageReference(options = {}, publication) {
  const workspace = fs.realpathSync(options.workspaceRoot ?? path.dirname(main));
  assert.equal(fs.realpathSync(path.join(workspace, "main-repo")), main);
  // <lang><zh-CN>入口只选择四个已登记正常生产清单，包/路由由对应读取器核验，来源摘要固定实际清单原字节。</zh-CN><en>Entries select only four registered production manifests. Their readers validate packages/routes and the source digest pins actual registry bytes.</en></lang>
  assert(["reference/javascript-reference-inputs.json", "reference/html-reference-inputs.json", "reference/css-reference-inputs.json", "reference/dotnet-reference-inputs.json"].includes(publication.registryPath));
  const {registry, apiSiteId, resourceOwner, createNavigation, includeCommandSources} = publication;
  assert(registry.sites.some(site => site.id === apiSiteId));
  const output = path.resolve(main, options.out ?? "dist/javascript-reference-publication");
  assertCoreReferenceOutput(output);
  // <lang><zh-CN>来源身份固定为当前已提交主仓，发布清单和所有被核源在结束时再次比对。</zh-CN><en>Pin source identity to the committed main checkout, rechecking the registry and all audited sources at completion.</en></lang>
  execFileSync("git", ["-C", main, "diff", "--exit-code", "HEAD", "--"], {stdio: "pipe"});
  const sourceCommit = execFileSync("git", ["-C", main, "rev-parse", "HEAD"], {encoding: "utf8"}).trim();
  const registrySha256 = hash(fs.readFileSync(path.join(main, publication.registryPath)));
  const inventory = auditRequiredPackages(workspace, {packageNames: registry.packages, includeMembers: true, includeDeclaredArrays: true});
  fs.mkdirSync(path.dirname(output), {recursive: true});
  const lockPath = output + ".lock";
  const lock = fs.openSync(lockPath, "wx");
  try {
    const staging = fs.mkdtempSync(output + ".staging-");
    const runtime = path.join(staging, ".runtime");
    fs.mkdirSync(runtime);
    // <lang><zh-CN>入口包选择贯穿原生、schema、数组和描述符的实际B/A/JSONdoc审核，归属与读取授权继续逐源核验。</zh-CN><en>Carry the entry package selection through actual native, schema, array and descriptor B/A/JSONdoc audits, retaining per-source ownership and access checks.</en></lang>
    const native = await auditSatelliteNativeApi(workspace, {packageNames: registry.packages, includeMembers: true, schemaResources: true, arrayResources: true, descriptorResources: true, includeDeclaredArrays: true});
    const nativeRoot = path.join(main, native.output);
    // <lang><zh-CN>声明文件交原TSdoc0.4链，运行时模块继续原JSDoc链，完整入口清单用于最后逐绑定核验。</zh-CN><en>Declaration files use the original TSdoc 0.4 chain while runtime modules retain JSDoc; the complete inventory remains authoritative for final per-binding checks.</en></lang>
    const nativeInventory = {...inventory, packages: inventory.packages.map(pack => ({...pack, modules: pack.modules.filter(module => !/\.d\.[cm]?ts$/.test(module.path))}))};
    const grouped = groupJavaScriptPublicationDeclarations(nativeInventory, native.report.declaredArrayMemberAudit);
    const inputs = Object.fromEntries(registry.sites.map(site => [site.id, []]));
    const rows = [], resources = [], dataRows = [], declarations = [];
    // <lang><zh-CN>声明绑定按实际owner/模块/导出关联，逻辑源路径另保留物理授权归属。</zh-CN><en>Associate declaration bindings by actual owner/module/export and separately retain physical authorized ownership for logical source paths.</en></lang>
    const declarationBindings = new Map();
    const sourceOrigins = new Map();
    const files = Object.fromEntries(registry.sites.map(site => [site.id, new Set()]));
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
      inputs[partition].push({kind: "documentation-producer-result", path: resultPath, identityScope: scope, domain: partition === apiSiteId ? "js" : "other", semanticPath});
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
      addInput(apiSiteId, key, identityScope, [
        {id: "api", kind: "hia-document", path: documentPath, contract: "hia-core-document", contractVersion: selected.document.schemaVersion},
        {id: "map", kind: "doc-source-map", path: mapPath, contract: map.contract, contractVersion: map.contractVersion}
      ], [{kind: "repository", id: group.pack.owner, label: group.pack.repository}, {kind: "package", id: group.pack.name.slice(1).replaceAll("/", "--"), label: group.pack.name},
        {kind: "layer", id: key, label: group.declarationPath + (aliases.length ? " · " + aliases.join(" · ") : "")}]);
      files[apiSiteId].add(base + "/native.hia.json").add(base + "/hia-integration.json");
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

    const dataValues = new Map();
    for (const association of [native.report.arrayMemberAudit.arrayAssociationOutput, native.report.descriptorMemberAudit.descriptorAssociationOutput]) {
      const root = path.join(main, association);
      for (const record of read(path.join(root, "report.json")).rows.filter(record => record.owner === resourceOwner)) {
        assert.equal(record.status, "verified");
        for (const source of record.sources) assert.equal(hash(readJsonResourceBytes(workspace, "HIA/" + record.owner + "/" + source.path)), source.sha256);
        for (const file of record.files) assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256);
        const key = hash(record.definitionModule + ":" + record.name);
        const bytes = fs.readFileSync(path.join(root, record.files[0].path));
        // <lang><zh-CN>同一原声明可经多个公开子入口暴露，复用同一数据文档前先核实际快照相同。</zh-CN><en>The same declaration can be exposed through multiple public subpaths; verify identical actual snapshots before sharing one data document.</en></lang>
        if (dataValues.has(key)) { assert.equal(hash(bytes), dataValues.get(key), "Conflicting public data aliases."); continue; }
        dataValues.set(key, hash(bytes));
        const base = "generated-data/" + key;
        const source = base + "/" + (record.name.endsWith("Descriptor") ? "descriptor.json" : "array.json");
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
        addInput(apiSiteId, key, "data:" + key, artifacts, [{kind: "package", id: record.package.slice(1).replaceAll("/", "--"), label: record.package}, {kind: "layer", id: key, label: record.name}]);
        copyPackageArtifact(path.join(root, record.files[1].path), path.join(runtime, base, "derivation-evidence.json"), runtime);
        files[apiSiteId].add(source).add(base + "/derivation-evidence.json");
        dataRows.push({package: record.package, name: record.name, source, identityScope: "data:" + key, documentPath: artifacts[0].path, mapPath: artifacts[1].path, symbols: document.symbols.length});
        mirror(source, bytes);
      }
    }

    // <lang><zh-CN>实际声明模块触发原TSdoc0.4生产，逐工件/原源重核摘要并保留类型与声明值覆盖。</zh-CN><en>Actual declaration modules trigger original TSdoc 0.4 production, rechecking artifact/source digests and retaining type and declaration-value coverage.</en></lang>
    if (inventory.packages.some(pack => pack.modules.some(module => /\.d\.[cm]?ts$/.test(module.path)))) {
      const typeReceipt = await auditSatelliteTypeApi(workspace, {packageNames: registry.packages, includeDeclarationValues: true});
      for (const typeGroup of typeReceipt.report.groups) {
        assert(typeGroup.complete && typeGroup.packages.every(pack => registry.packages.includes(pack.name)), "Declaration coverage is incomplete.");
        const typeScope = "declarations:" + typeGroup.owner;
        const typeBase = "declaration-api/" + hash(typeScope);
        const typeArtifacts = typeGroup.files.map(file => {
          const original = path.join(main, typeReceipt.output, file.path);
          assert.equal(hash(fs.readFileSync(original)), file.sha256);
          const value = read(original);
          const destination = typeBase + "/" + path.posix.basename(file.path);
          copyPackageArtifact(original, path.join(runtime, destination), runtime);
          return {id: file.kind, kind: file.kind, path: destination,
            contract: file.kind === "hia-document" ? "hia-core-document" : value.contract,
            contractVersion: value.schemaVersion ?? value.contractVersion};
        });
        const typeDocumentPath = typeArtifacts.find(file => file.kind === "hia-document").path;
        const typeMapPath = typeArtifacts.find(file => file.kind === "doc-source-map").path;
        const extractionPath = typeArtifacts.find(file => file.kind === "tsdoc-extraction").path;
        const bridgePath = typeArtifacts.find(file => file.kind === "ts-jsdoc-bridge").path;
        const typeDocument = read(path.join(runtime, typeDocumentPath));
        const extraction = read(path.join(runtime, extractionPath));
        addInput(apiSiteId, hash(typeScope), typeScope, typeArtifacts,
          [{kind: "repository", id: typeGroup.owner, label: "mandolin/" + typeGroup.owner}, {kind: "layer", id: "typescript-declarations", label: typeGroup.owner + " · TypeScript"}]);
        declarations.push({owner: typeGroup.owner, repository: "mandolin/" + typeGroup.owner,
          identityScope: typeScope, documentPath: typeDocumentPath, mapPath: typeMapPath,
          extractionPath, bridgePath, symbols: typeDocument.symbols.length,
          typeBindings: typeGroup.bindings, typeMembers: typeGroup.members,
          declaredValueBindings: typeGroup.valueAudit.bindings});
        for (const module of extraction.modules) for (const binding of module.exports) {
          const key = typeGroup.owner + ":" + module.path + ":" + binding.name;
          assert(!declarationBindings.has(key) && binding.symbolIds.length);
          declarationBindings.set(key, binding.symbolIds.map(symbolId => ({identityScope: typeScope, symbolId})));
        }
        // <lang><zh-CN>原声明路径相对于源owner，镜像保留该逻辑路径；原始物理归属单独记录并再次核SHA。</zh-CN><en>Original declaration paths are owner-relative; the mirror retains those logical paths while physical ownership is recorded and SHA-checked separately.</en></lang>
        for (const source of [...typeGroup.sources, ...typeGroup.valueSources]) {
          const originalPath = "HIA/" + typeGroup.owner + "/" + source.path;
          const bytes = readJsonResourceBytes(workspace, originalPath);
          assert.equal(hash(bytes), source.sha256);
          assert(!sourceOrigins.has(source.path) || sourceOrigins.get(source.path) === originalPath, "Ambiguous declaration source ownership.");
          mirror(source.path, bytes);
          sourceOrigins.set(source.path, originalPath);
        }
      }
    }

    // <lang><zh-CN>完整下载另取公开模块与schema依赖；来源镜像与页面片段分别保留原字节/范围。</zh-CN><en>Full downloads also include public modules and schema dependencies, retaining original bytes separately from page-preview ranges.</en></lang>
    const schemaRows = read(path.join(main, native.report.schemaMemberAudit.associationOutput, "report.json")).rows.filter(row => registry.packages.includes(row.package));
    for (const row of schemaRows) for (const source of row.sources) mirror(source.path, readJsonResourceBytes(workspace, source.path));
    // <lang><zh-CN>各正常入口明确是否交付独立命令源；模块接入与命令采用继续分账。</zh-CN><en>Each production entry explicitly chooses whether to deliver independent command sources; module and command adoption remain separately accounted.</en></lang>
    for (const pack of nativeInventory.packages) for (const module of pack.modules.filter(module => includeCommandSources || module.exports.length)) {
      const source = "HIA/" + pack.owner + "/" + module.path;
      mirror(source, readJsonResourceBytes(workspace, source));
    }
    const fullSources = [...sources.values()].sort((left, right) => left.source.localeCompare(right.source));
    const reports = [];
    for (const site of registry.sites) {
      const root = path.join(staging, "sites", site.id);
      const navigationPath = path.join(runtime, site.id + ".navigation.json");
      fs.writeFileSync(navigationPath, JSON.stringify(createNavigation(registry, site.id)));
      const manifestPath = path.join(runtime, site.id + ".project.json");
      const selectedRows = site.id === apiSiteId ? [...rows, ...declarations, ...resources.filter(row => row.site === site.id), ...dataRows] : resources.filter(row => row.site === site.id);
      const selectedSources = fullSources.filter(source => site.id === "derivation-evidence" ? source.source.includes("/evidence/hia-jsdoc-config-") : !source.source.includes("/evidence/hia-jsdoc-config-"));
      for (const locale of locales) {
        const target = path.join(root, site.path, locale);
        // <lang><zh-CN>两语标题使用各自完整名称，项目身份与输入范围一致。</zh-CN><en>Use each locale's complete title while retaining the same project identity and input scope.</en></lang>
        fs.writeFileSync(manifestPath, JSON.stringify({schemaVersion: "1.1.0", project: {id: "project:hia-" + site.id, name: "HIA Documentation System · " + site.titleByLocale[locale], defaultLocale: "zh-CN", locales}, inputs: inputs[site.id]}));
        const configPath = path.join(runtime, site.id + "-" + locale + ".config.json");
        fs.writeFileSync(configPath, JSON.stringify({schemaVersion: "0.1.0", docs: {source: {presentation: "fetch", publicAssetPolicy: "explicit-public", localRoot: "source-root", maxLines: 400},
          theme: {colors: {accent: "#0047AB"}}, renderer: {uiLocale: locale, projectLayout: "split-site", informationArchitecture: {contentGrouping: "entry", loadingStrategy: "lazy", memberPlacement: "separate"}}}}));
        execFileSync(process.execPath, [path.join(main, "apps/cli/dist/index.js"), "docs", "build", "--config", configPath, "--project-manifest", manifestPath, "--site-navigation", navigationPath, "--out", target, "--locale", locale], {cwd: workspace, stdio: "inherit"});
        for (const file of files[site.id]) copyPackageArtifact(path.join(runtime, file), path.join(target, file), staging);
        const index = read(path.join(target, "project-index.json"));
        assert.equal(index.entries.length, selectedRows.reduce((sum, row) => sum + row.symbols, 0));
        if (site.id === apiSiteId) {
          for (const row of rows) assertSatelliteApiEntries({row, document: read(path.join(runtime, row.documentPath)), map: read(path.join(runtime, row.mapPath)), entries: index.entries});
          const outputs = rows.map(row => ({...row, status: "success", artifact: row.documentPath.replace("api.hia.json", "hia-integration.json"), integration: read(path.join(runtime, row.documentPath.replace("api.hia.json", "hia-integration.json"))), document: read(path.join(runtime, row.documentPath))}));
          const bindings = inventory.packages.flatMap(pack => pack.modules.flatMap(module => module.exports.map(binding => {
            // <lang><zh-CN>声明文件的原导出关联TSdoc节点，运行时继续原JSDoc关联，均须命中实际发布索引。</zh-CN><en>Original declaration exports associate with TSdoc nodes while runtime exports retain JSDoc association, both requiring actual published-index targets.</en></lang>
            if (/\.d\.[cm]?ts$/.test(module.path)) {
              const expected = declarationBindings.get(pack.owner + ":" + module.path + ":" + binding.name);
              assert(expected?.length, "Declaration export is absent from its original extraction.");
              return {package: pack.name, module: module.path, exportName: binding.name, destinations: expected.map(destination => {
                const entry = index.entries.find(entry => entry.identityScope === destination.identityScope && entry.symbolId === destination.symbolId);
                assert(entry, "Declaration export is absent from the published index.");
                return {...destination, page: entry.noScriptPagePath, content: entry.contentPath};
              })};
            }
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
        ...(declarations.length && site.id === apiSiteId ? {declarations, sourceOrigins: Object.fromEntries(sourceOrigins)} : {}),
        rows: site.id === apiSiteId ? rows : [], resources: resources.filter(row => row.site === site.id), dataRows: site.id === apiSiteId ? dataRows : [],
        memberPaths: site.id === apiSiteId ? grouped.members.length : 0,
        bindingsPerLocale: site.id === apiSiteId ? inventory.packages.reduce((sum, pack) => sum + pack.modules.reduce((count, module) => count + module.exports.length, 0), 0) : 0,
        fullSources: selectedSources, entriesPerLocale: selectedRows.reduce((sum, row) => sum + row.symbols, 0), ...checked};
      fs.mkdirSync(path.join(staging, "reports"), {recursive: true});
      fs.writeFileSync(path.join(staging, "reports", site.id + ".json"), JSON.stringify(report, null, 2) + "\n");
      reports.push({id: site.id, repository: site.repository, files: checked.files, bytes: checked.bytes});
    }
    assert.deepEqual(auditRequiredPackages(workspace, {packageNames: registry.packages, includeMembers: true, includeDeclaredArrays: true}), inventory);
    for (const source of fullSources.filter(source => source.source.startsWith("HIA/"))) assert.equal(hash(readJsonResourceBytes(workspace, source.source)), source.sha256);
    for (const [alias, original] of sourceOrigins) assert.equal(hash(readJsonResourceBytes(workspace, original)), sources.get(alias).sha256);
    execFileSync("git", ["-C", main, "diff", "--exit-code", "HEAD", "--"], {stdio: "pipe"});
    assert.equal(execFileSync("git", ["-C", main, "rev-parse", "HEAD"], {encoding: "utf8"}).trim(), sourceCommit);
    // <lang><zh-CN>仅最终site目录可发布，运行目录与审核中间件留在装配根；失败时保留旧成功输出。</zh-CN><en>Only the final site directories are publishable; runtime and audit intermediates stay at the assembly root, with prior successful output retained on failure.</en></lang>
    let backup;
    if (fs.existsSync(output)) { backup = output + ".previous-" + randomUUID(); assertCoreReferenceOutput(backup); fs.renameSync(output, backup); }
    try { fs.renameSync(staging, output); }
    catch (error) { if (backup) fs.renameSync(backup, output); throw error; }
    return {sourceCommit, sites: reports};
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}

/**
 * @lang zh-CN 保留JavaScript工具API与JSDoc派生证据的既有正常入口、默认输出及源交付范围。
 * @lang en Preserve the existing production entry, default output and source-delivery scope for JavaScript tool APIs and JSDoc derivation evidence.
 * @param {object} [options] - 明确的workspaceRoot与dist内out。 Explicit workspaceRoot and an out inside dist.
 * @returns {Promise<object>} 两站完整报告。 Complete reports for both sites.
 * @throws {Error} 来源、内容、授权或发布预算检查失败。 Failed source, content, authorization or publication-budget checks.
 */
export async function buildJavaScriptReference(options = {}) {
  return buildJavaScriptPackageReference(options, {
    registry: loadJavaScriptReferenceInputs(), registryPath: "reference/javascript-reference-inputs.json",
    apiSiteId: "javascript-api", resourceOwner: "hia-jsdoc", createNavigation: createJavaScriptReferenceNavigation,
    includeCommandSources: true
  });
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
