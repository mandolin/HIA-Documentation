/**
 * @file
 * @lang zh-CN 从显式首方JavaScript包运行原生生产链，保留原文工件并建立公开声明投影与授权源码镜像。
 * @lang en Run the native producer for explicit first-party JavaScript packages, retaining original artifacts and preparing public declaration projections and an authorized source mirror.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {fileURLToPath, pathToFileURL} from "node:url";
import {runDocumentationProducer} from "../packages/plugin-sdk/dist/index.js";
import {convertJSDocIntegrationToHiaDocumentDetailed} from "../packages/parser-jsdoc/dist/index.js";
import {validateHiaDocument} from "../packages/core/dist/index.js";
import {validateDocSourceMap} from "../packages/source-linkage/dist/index.js";
import {auditRequiredPackages} from "./audit-required-package-api.mjs";
import {resolvePackageApiOwnership, createPackageApiIdentityScope} from "./lib/package-api-ownership.mjs";
import {readJsonResourceBytes as readOwnedFileBytes} from "./lib/json-resource-audit.mjs";
import {assertPublicRootOmission} from "./lib/core-package-api.mjs";
import {selectNativeJsdocApi} from "./lib/jsdoc-api-projection.mjs";

// <lang><zh-CN>输出由工具所属主仓拥有，容器名称不参与CI路径判定。</zh-CN><en>The tool's own main checkout owns outputs, independently of CI container names.</en></lang>
const mainRoot = fs.realpathSync(fileURLToPath(new URL("../", import.meta.url)));
// <lang><zh-CN>宿主投影版本来自实际工具仓清单，独立于原生生产器版本。</zh-CN><en>The host projection version comes from the actual tool manifest, independently of the native producer version.</en></lang>
const projectionVersion = JSON.parse(fs.readFileSync(path.join(mainRoot, "package.json"), "utf8")).version;

/**
 * @lang zh-CN 为实际原字节计算摘要。
 * @lang en Digest actual original bytes.
 * @param {Buffer} bytes <lang><zh-CN>待核字节。</zh-CN><en>Bytes to verify.</en></lang>
 * @returns {string} <lang><zh-CN>十六进制SHA-256。</zh-CN><en>Hexadecimal SHA-256.</en></lang>
 */
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

/**
 * @lang zh-CN 仅接纳主仓dist内现有普通独占目录，逐组件拒绝重定向。
 * @lang en Accept only an existing regular exclusive directory inside the main checkout's dist, rejecting redirected components.
 * @param {string} runtimeRoot <lang><zh-CN>调用方创建的运行目录。</zh-CN><en>Caller-created runtime directory.</en></lang>
 * @returns {void} <lang><zh-CN>边界符合时返回。</zh-CN><en>Return when the boundary is valid.</en></lang>
 */
export function assertSatelliteApiRuntime(runtimeRoot) {
  const relative = path.relative(mainRoot, path.resolve(runtimeRoot));
  assert(relative.startsWith("dist" + path.sep) && !relative.split(path.sep).includes(".."), "Satellite API runtime must be inside main dist.");
  let current = mainRoot;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    const state = fs.lstatSync(current);
    assert(state.isDirectory() && !state.isSymbolicLink(), "Satellite API runtime is redirected.");
  }
  assert.equal(fs.realpathSync(current), path.resolve(runtimeRoot), "Satellite API runtime is redirected.");
}

/**
 * @lang zh-CN 运行显式普通.mjs公开模块并返回现有清单输入。只支持包内同名直接声明，别名、复杂重导出、类型与命令应由对应生产链接入。
 * @lang en Produce explicit regular .mjs public modules and return existing manifest inputs. Supports same-name direct declarations inside their owning packages; aliases, complex reexports, types and commands require their respective producer chains.
 * @param {object} options <lang><zh-CN>固定包选择、授权工作区、独占runtimeRoot及明确允许公开的源码路径数组publicSources。</zh-CN><en>Fixed package selection, authorized workspace, exclusive runtimeRoot and explicit publicSources paths authorized for publication.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>inputs、rows、原文工件路径及400行来源配置，调用方负责失败暂存的生命周期。</zh-CN><en>Inputs, rows, original artifact paths and a 400-line source config; the caller owns failed-staging lifecycle.</en></lang>
 * @throws {Error} <lang><zh-CN>未覆盖、语言/签名缺失、来源变化、越界或生产失败时拒绝，不执行目标模块。</zh-CN><en>Reject incomplete coverage, missing languages/signatures, changed sources, unsafe paths or failed production without executing target modules.</en></lang>
 */
export async function prepareSatellitePackageApis({packageNames, workspaceRoot, runtimeRoot, publicSources}) {
  assertSatelliteApiRuntime(runtimeRoot);
  assert(Array.isArray(packageNames) && packageNames.length, "Satellite package selection must be explicit.");
  const inventory = auditRequiredPackages(workspaceRoot, {packageNames});
  assert(inventory.packages.every(pack => pack.owner !== "main-repo"), "Satellite API selection requires satellite ownership.");
  // <lang><zh-CN>先审核全部源及授权，再创建任何生产输出；资源和bin不能计作模块采用。</zh-CN><en>Audit all sources and permissions before creating producer output; resources and bins cannot count as module adoption.</en></lang>
  const modules = inventory.packages.flatMap(pack => {
    const ownership = resolvePackageApiOwnership(workspaceRoot, pack);
    assert(pack.modules.length && pack.entries.every(entry => entry.kind === "runtime-module"), "This JSDoc chain requires runtime-only package entries.");
    return pack.modules.map(module => {
      assert(module.path.endsWith(".mjs") && module.exports.length, "This JSDoc chain requires explicit .mjs declarations.");
      assert(module.exports.every(binding => binding.status === "resolved" && binding.name === binding.declarationName && binding.declarations.length && binding.declarations.every(declaration => declaration.path === module.path)), "Satellite aliases or reexports require a coordinated declaration chain.");
      const source = "HIA/" + pack.owner + "/" + module.path;
      const bytes = readOwnedFileBytes(workspaceRoot, source);
      // <lang><zh-CN>严格UTF-8核验避免源码镜像和解释器看到不同字符。</zh-CN><en>Strict UTF-8 verification prevents the source mirror and parser from seeing different characters.</en></lang>
      new TextDecoder("utf-8", {fatal: true}).decode(bytes);
      return {pack, module, source, bytes, identityScope: createPackageApiIdentityScope(pack, ownership, module.path)};
    });
  });
  assert(Array.isArray(publicSources) && new Set(publicSources).size === publicSources.length, "Public satellite sources must be explicit and unique.");
  assert.deepEqual([...publicSources].sort(), [...new Set(modules.map(item => item.source))].sort(), "Public satellite source authorization differs from selected modules.");
  assert(new Set(modules.map(item => item.identityScope)).size === modules.length, "Duplicate satellite module scope.");
  const artifactRoot = path.join(runtimeRoot, "satellite-api");
  fs.mkdirSync(artifactRoot);
  const sourceRoot = path.join(runtimeRoot, "source-root");
  fs.mkdirSync(sourceRoot);
  const {jsdocProducer} = await import(pathToFileURL(path.join(workspaceRoot, "HIA/hia-jsdoc/packages/jsdoc-producer/src/index.mjs")));
  const inputs = [];
  const rows = [];
  const files = [];
  // <lang><zh-CN>完整原生回执连同其HTML/字体等输出留在运行目录，公开API交付使用精确机器工件清单。</zh-CN><en>Keep complete native receipts and their HTML/font outputs in runtime staging; public API delivery uses an exact machine-artifact list.</en></lang>
  const nativeResults = [];
  for (const item of modules) {
    const {pack, module, source, bytes, identityScope} = item;
    // <lang><zh-CN>稳定作用域摘要用于工件目录，同一原生ID在另一模块不会覆盖。</zh-CN><en>The stable scope digest names artifact directories, preventing equal native IDs in other modules from overwriting them.</en></lang>
    const slug = identityScope.slice("package:".length);
    const base = "satellite-api/" + slug;
    const directory = path.join(runtimeRoot, base);
    const result = await runDocumentationProducer(jsdocProducer, {workspaceRoot, outputDirectory: directory,
      inputs: [{kind: "javascript-module", path: source}], profileIds: ["jsdoc"], options: {
        mode: "hiaIntegration", plugin: {pluginPath: path.join(workspaceRoot, "HIA/jsdoc-plugin-hia-sys/src/index.cjs")},
        hia: {docSourceMap: {enabled: true}, i18n: {enabled: true, defaultLocale: "en", fallbackLocale: "en", locales: ["en", "zh-CN"]}}
      }});
    assert.equal(result.status, "success", JSON.stringify(result.diagnostics));
    const integrationArtifact = result.artifacts.find(artifact => artifact.kind === "jsdoc-integration");
    const mapArtifact = result.artifacts.find(artifact => artifact.kind === "doc-source-map");
    assert(integrationArtifact && mapArtifact, "Native satellite artifacts are incomplete.");
    const integration = JSON.parse(fs.readFileSync(path.join(directory, integrationArtifact.path), "utf8"));
    const map = JSON.parse(fs.readFileSync(path.join(directory, mapArtifact.path), "utf8"));
    const converted = convertJSDocIntegrationToHiaDocumentDetailed(integration, {documentId: identityScope, includeEmptySymbols: true});
    assert(!converted.diagnostics.some(diagnostic => diagnostic.severity === "error"), "Satellite conversion failed.");
    assert.deepEqual(validateHiaDocument(converted.document), []);
    assert.deepEqual(validateDocSourceMap(map), []);
    const selected = selectNativeJsdocApi({source, owner: pack.owner, artifact: base + "/" + integrationArtifact.path,
      status: result.status, integration, document: converted.document, bindings: module.exports});
    assert.deepEqual(validateHiaDocument(selected.document), []);
    const documentPath = base + "/api.hia.json";
    const fullDocumentPath = base + "/native.hia.json";
    fs.writeFileSync(path.join(runtimeRoot, fullDocumentPath), JSON.stringify(converted.document, null, 2) + "\n", {flag: "wx"});
    fs.writeFileSync(path.join(runtimeRoot, documentPath), JSON.stringify(selected.document, null, 2) + "\n", {flag: "wx"});
    // <lang><zh-CN>聚合只消费公开投影和原地图；原生integration另存，防止内部声明被第二次隐式聚合。</zh-CN><en>Aggregation consumes only the public projection and original map; retain native integration separately to prevent implicit reaggregation of internal declarations.</en></lang>
    const wrapper = {contract: "documentation-producer-result", contractVersion: "1.0.0", producer: {id: "satellite-api-projection", version: projectionVersion},
      status: "success", diagnostics: [], artifacts: [
        {id: "api", kind: "hia-document", path: documentPath, contract: "hia-core-document", contractVersion: selected.document.schemaVersion},
        {id: "map", kind: "doc-source-map", path: base + "/" + mapArtifact.path, contract: map.contract, contractVersion: map.contractVersion}
      ]};
    const resultPath = slug + ".result.json";
    fs.writeFileSync(path.join(runtimeRoot, resultPath), JSON.stringify(wrapper, null, 2) + "\n", {flag: "wx"});
    assertPublicRootOmission({integration, map, result, document: selected.document, wrapper}, workspaceRoot);
    assert(fs.readFileSync(path.join(workspaceRoot, source)).equals(bytes), "Satellite source changed during production.");
    const sourceTarget = path.join(sourceRoot, source);
    fs.mkdirSync(path.dirname(sourceTarget), {recursive: true});
    fs.writeFileSync(sourceTarget, bytes, {flag: "wx"});
    inputs.push({kind: "documentation-producer-result", path: resultPath, domain: "js", identityScope,
      semanticPath: [{kind: "repository", id: pack.owner, label: pack.repository},
        {kind: "package", id: slug, label: pack.name}]});
    rows.push({name: pack.name, version: pack.version, repository: pack.repository, sourceHead: pack.sourceHead,
      manifestSha256: pack.manifestSha256, source, sourceSha256: digest(bytes), identityScope, documentPath,
      mapPath: base + "/" + mapArtifact.path, bindings: selected.bindings, symbols: selected.document.symbols.length});
    files.push(documentPath, fullDocumentPath, base + "/" + integrationArtifact.path, base + "/" + mapArtifact.path);
    nativeResults.push(base + "/hia-jsdoc.producer-result.json");
  }
  // <lang><zh-CN>重核全部清单/提交及入口，避免生产中变更借用旧采用回执。</zh-CN><en>Recheck all manifests, commits and entries to prevent changes during production from borrowing stale adoption receipts.</en></lang>
  assert.deepEqual(auditRequiredPackages(workspaceRoot, {packageNames}), inventory, "Satellite package inventory changed during production.");
  for (const item of modules) assert(readOwnedFileBytes(workspaceRoot, item.source).equals(item.bytes), "Satellite source changed before publication preparation completed.");
  const configPath = path.join(runtimeRoot, "source.config.json");
  fs.writeFileSync(configPath, JSON.stringify({schemaVersion: "0.1.0", docs: {source: {
    presentation: "fetch", publicAssetPolicy: "explicit-public", localRoot: "source-root", maxLines: 400
  }}}, null, 2) + "\n", {flag: "wx"});
  return {inputs, rows, files, nativeResults, configPath};
}
