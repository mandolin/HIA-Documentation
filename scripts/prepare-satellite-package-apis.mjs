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
 * @lang zh-CN 按实际runtime模块的原声明归组，保留每条默认/具名导出路径，资源与命令由各自账本处理。
 * @lang en Group actual runtime-module exports by original declarations, preserving every default/named export path while resources and commands use their own inventories.
 * @param {object} pack <lang><zh-CN>独立审核得到的包入口和静态模块。</zh-CN><en>Independently audited package entries and static modules.</en></lang>
 * @returns {object[]} <lang><zh-CN>去重来源分组及完整公开绑定。</zh-CN><en>Deduplicated source groups and complete public bindings.</en></lang>
 * @throws {Error} <lang><zh-CN>没有模块、声明歧义、未解析或非JavaScript输入。</zh-CN><en>Missing modules, ambiguous or unresolved declarations, or non-JavaScript input.</en></lang>
 */
export function collectSatelliteModuleDeclarations(pack) {
  // <lang><zh-CN>同一源可同时是bin和模块，按实际runtime导出决定本次模块采用。</zh-CN><en>A source can be both a bin and a module; actual runtime exports decide module adoption.</en></lang>
  const runtimePaths = new Set(pack.entries.filter(entry => entry.kind === "runtime-module").map(entry => path.posix.join(pack.directory, entry.source)));
  const declarations = new Map();
  for (const module of pack.modules.filter(module => runtimePaths.has(module.path))) {
    assert(/\.(?:mjs|cjs|js)$/u.test(module.path) && module.exports.length, "This JSDoc chain requires explicit JavaScript declarations.");
    for (const binding of module.exports) {
      assert(binding.status === "resolved" && binding.declarations.length === 1, "Satellite public declaration is unresolved or ambiguous.");
      const declaration = binding.declarations[0];
      assert(/\.(?:mjs|cjs|js)$/u.test(declaration.path), "Satellite declaration requires a JavaScript source.");
      if (!declarations.has(declaration.path)) declarations.set(declaration.path, []);
      declarations.get(declaration.path).push({...binding, modulePath: module.path});
    }
  }
  assert(declarations.size, "Satellite package has no runtime modules.");
  return [...declarations].map(([source, bindings]) => ({path: source, exports: bindings}));
}

/**
 * @lang zh-CN 按真实原声明合并JavaScript公开入口，支持包内默认别名、重导出与CommonJS，返回标准清单输入及独立资源/命令账。
 * @lang en Group JavaScript public entries by actual declarations, supporting package-local default aliases, reexports and CommonJS, returning standard manifest inputs and a separate resource/command inventory.
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
    return collectSatelliteModuleDeclarations(pack).map(({path: modulePath, exports: bindings}) => {
      const source = "HIA/" + pack.owner + "/" + modulePath;
      const bytes = readOwnedFileBytes(workspaceRoot, source);
      // <lang><zh-CN>严格UTF-8核验避免源码镜像和解释器看到不同字符。</zh-CN><en>Strict UTF-8 verification prevents the source mirror and parser from seeing different characters.</en></lang>
      new TextDecoder("utf-8", {fatal: true}).decode(bytes);
      return {pack, module: {path: modulePath, exports: bindings}, source, bytes, identityScope: createPackageApiIdentityScope(pack, ownership, modulePath)};
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
      inputs: [{kind: source.endsWith(".mjs") ? "javascript-module" : "javascript-source", path: source}], profileIds: ["jsdoc"], options: {
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
    // <lang><zh-CN>默认别名由现有语义文件标签提供发现入口，原生符号ID和正文名称保持。</zh-CN><en>Existing semantic file labels provide discovery for default aliases while preserving native IDs and prose names.</en></lang>
    const aliases = [...new Set(module.exports.filter(binding => binding.name !== binding.declarationName).map(binding => binding.name))];
    inputs.push({kind: "documentation-producer-result", path: resultPath, domain: "js", identityScope,
      semanticPath: [{kind: "repository", id: pack.owner, label: pack.repository},
        {kind: "package", id: pack.name.slice(1).replaceAll("/", "--"), label: pack.name},
        {kind: "layer", id: slug, label: module.path + (aliases.length ? " · " + aliases.join(" · ") : "")}]});
    rows.push({name: pack.name, version: pack.version, repository: pack.repository, sourceHead: pack.sourceHead,
      manifestSha256: pack.manifestSha256, source, sourceSha256: digest(bytes), identityScope, documentPath,
      mapPath: base + "/" + mapArtifact.path, bindings: selected.bindings,
      publicBindings: module.exports.map(binding => ({name: binding.name, declarationName: binding.declarationName, modulePath: binding.modulePath, declarations: binding.declarations})),
      symbols: selected.document.symbols.length});
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
  return {inputs, rows, files, nativeResults, configPath, remainingEntries: inventory.packages.flatMap(pack => pack.entries
    .filter(entry => entry.kind !== "runtime-module").map(entry => ({package: pack.name, ...entry})))};
}
