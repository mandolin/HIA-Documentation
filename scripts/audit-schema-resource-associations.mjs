/**
 * @file
 * @lang zh-CN 将公开schema声明与严格JSON资源及实际jsondoc工件逐值关联，保留静态和动态边界。
 * @lang en Associates public schema declarations with strict JSON resources and actual jsondoc artifacts per value, retaining static and dynamic boundaries.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { auditRequiredPackages } from "./audit-required-package-api.mjs";
import { buildRequiredJsonResources } from "./build-required-json-resources.mjs";
import { readStaticJsonExport, compareStaticJsonResource } from "./lib/static-json-export.mjs";
import { verifyJsonResourceProjection } from "./lib/json-resource-projection.mjs";
import { assertPublicRootOmission } from "./lib/core-package-api.mjs";
import { readStaticJsonInitializationGraph } from "./lib/static-initialization-graph.mjs";
import { readJsdocConfigEvidence } from "./lib/jsdoc-config-evidence.mjs";
import { matchSchemaMemberDeclarations } from "./lib/schema-resource-adoption.mjs";

/**
 * @lang zh-CN 审核卫星运行时schema命名导出，类型声明分支单列；未知初始化过程继续失败。
 * @lang en Audits satellite runtime schema-named exports, listing type-declaration branches separately and retaining failures for unknown initialization processes.
 * @param {string} workspaceRoot <lang><zh-CN>本项目授权容器。</zh-CN><en>This project's authorized container.</en></lang>
 * @param {object} [options] <lang><zh-CN>packageNames选择已登记包，省略仍核全部必要包。</zh-CN><en>packageNames selects registered packages, defaulting to all required packages.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>独立关联报告、输出路径及本次资源生产的精确artifacts/sourcePaths，可供后续构建复用；完整API/产品验收独立。</zh-CN><en>Independent association report, output paths and exact artifacts/sourcePaths from this resource production for downstream reuse; full API/product acceptance remains separate.</en></lang>
 */
export async function auditSchemaResourceAssociations(workspaceRoot, options = {}) {
  const container = fs.realpathSync(workspaceRoot);
  const mainRoot = fileURLToPath(new URL("../", import.meta.url));
  assert.equal(path.join(container, "main-repo"), mainRoot.replace(/[\\/]$/, ""));
  const inventory = auditRequiredPackages(container, { packageNames: options.packageNames, includeMembers: true });
  const generated = await buildRequiredJsonResources(container, "und", options);
  const rows = [];
  const declarationBranches = [];
  for (const pack of inventory.packages.filter(pack => pack.owner !== "main-repo")) for (const module of pack.modules) for (const binding of module.exports.filter(binding => /JSON_SCHEMA/.test(binding.name))) {
    const identity = { package: pack.name, owner: pack.owner, module: module.path, name: binding.name };
    if (!/\.(?:mjs|cjs|js)$/.test(module.path)) { declarationBranches.push(identity); continue; }
    // <lang><zh-CN>候选名只用于限定本次盘点，内容相等仍须逐值及实际工件证明。</zh-CN><en>Candidate names only delimit this inventory; content equality still requires per-value and actual-artifact proof.</en></lang>
    const repository=path.join(container,"HIA",pack.owner);
    const imperative=pack.name==="@hia-doc/jsdoc-runner" && binding.name==="HIA_JSDOC_CONFIG_JSON_SCHEMA";
    let production;
    let previous;
    let declared;
    if(imperative) {
      // <lang><zh-CN>已确认试点必须有真实安装件B；缺失或冲突不降级为更宽松静态读取。</zh-CN><en>The confirmed trial requires actual installed B; missing/conflicting evidence never degrades to a more permissive static read.</en></lang>
      production=readJsdocConfigEvidence(path.join(repository,pack.directory));
      if(production.status!=="verified") {rows.push({...identity,status:"unverified",reason:production.reason});continue;}
      declared=readStaticJsonInitializationGraph(repository,module.path,binding.name);
      previous=readStaticJsonInitializationGraph(repository,module.path,"HIA_JSDOC_LEGACY_CONFIG_JSON_SCHEMA");
      const legacyResources=generated.resourceAudit.entries.filter(resource=>resource.schemaId===previous.value?.$id);
      if(previous.status!=="available" || legacyResources.length!==1 || compareStaticJsonResource(previous,legacyResources[0]).status!=="equal") {rows.push({...identity,status:"unverified",reason:"unverified-predecessor-schema"});continue;}
    } else declared=readStaticJsonExport(repository,module.path,binding.name);
    if (declared.status !== "available") { rows.push({ ...identity, status: "unverified", reason: declared.reason }); continue; }
    const candidates = generated.resourceAudit.entries.filter(resource => resource.schemaId && resource.schemaId === declared.value?.$id);
    const comparisons = candidates.map(resource => ({ resource, comparison: compareStaticJsonResource(declared, resource) }));
    const matches = comparisons.filter(item => item.comparison.status === "equal");
    if (matches.length !== 1) {
      rows.push({ ...identity, status: "unverified", reason: matches.length ? "ambiguous-equal-resources" : "no-equal-resource", schemaId: declared.value?.$id, candidates: comparisons.map(item => ({ source: item.resource.source, ...item.comparison })) });
      continue;
    }
    const resource = matches[0].resource;
    const index = generated.sourcePaths.indexOf(resource.source);
    assert(index >= 0);
    const artifactRefs = generated.artifacts.slice(index * 3, index * 3 + 3);
    const bytes = artifactRefs.map(artifact => fs.readFileSync(path.join(mainRoot, generated.output, artifact.path)));
    const hashes = bytes.map(bytes => createHash("sha256").update(bytes).digest("hex"));
    assert.deepEqual(hashes, generated.report.rows.find(row => row.source === resource.source).hashes);
    const document = JSON.parse(bytes[0]);
    const map = JSON.parse(bytes[1]);
    verifyJsonResourceProjection(resource, document, map, bytes[2]);
    // <lang><zh-CN>JS声明和JSON来源保持各自位置，通过Pointer与核心符号身份连接，不互相覆盖范围。</zh-CN><en>JS declaration and JSON provenance retain their respective positions, connected by pointers and core symbol identity without overwriting ranges.</en></lang>
    const symbols = new Map(document.symbols.map(symbol => [symbol.metadata.json.pointer, symbol]));
    const declaredValues = new Map(declared.nodes.map(node => [node.pointer, node]));
    const previousValues=new Map((previous?.nodes??[]).map(node=>[node.pointer,node]));
    const members = (binding.members ?? []).map(member => {
      const pointer = "/" + member.memberPath.map(key => key.replaceAll("~", "~0").replaceAll("/", "~1")).join("/");
      const value = declaredValues.get(pointer);
      const actual = symbols.get(pointer);
      assert(value && actual, "Schema member pointer missing from actual documentation.");
      const source = value.declaration ?? value.origin;
      const matched=matchSchemaMemberDeclarations(member,value,previousValues.get(pointer));
      const predecessor=previousValues.get(pointer);
      return { memberPath: member.memberPath, pointer, symbolId: actual.id, declarationSource: source, valueDeclarationSources: value.valueDeclarationSources, originalDeclarations: member.declarations, declarationsMatch:matched.matches,declarationMatchKinds:matched.kinds,...(matched.kinds.includes("previous-value-alias")?{previousDeclarationSource:predecessor.declaration??predecessor.origin,previousValueSources:[predecessor.origin,...predecessor.valueDeclarationSources]}:{}) };
    });
    const boundaryPointers=(binding.memberBoundaries??[]).map(boundary=>{
      const pointer=boundary.memberPath.length?"/"+boundary.memberPath.map(key=>key.replaceAll("~","~0").replaceAll("/","~1")).join("/"):"";
      const value=declaredValues.get(pointer);
      const symbol=symbols.get(pointer);
      return {...boundary,pointer,...(value&&symbol?{valueType:value.type,symbolId:symbol.id,subtreeValues:declared.nodes.filter(node=>node.pointer===pointer || node.pointer.startsWith(pointer+"/")).length}:{})};
    });
    rows.push({ ...identity, status: "associated", evidenceKind: declared.evidenceKind, runtimeStateVerified: false,...(production?{production,linkage:declared.linkage}:{}), schemaId: resource.schemaId, resource: { package: resource.package, subpath: resource.subpath, source: resource.source, sha256: resource.sha256 }, values: declared.nodes.length, sources: declared.sources.map(source => ({ ...source, path: `HIA/${pack.owner}/${source.path}` })), members, boundaryPointers, generated: { documentId: document.id, mapId: map.id, hashes } });
  }
  const report = { purpose: "static-schema-resource-documentation-association", requiredPackages: inventory.packages.length, runtimeBindings: rows.length, associatedBindings: rows.filter(row => row.status === "associated").length, unverifiedBindings: rows.filter(row => row.status !== "associated").length, values: rows.reduce((sum, row) => sum + (row.values ?? 0), 0), matchedMemberPointers: rows.reduce((sum, row) => sum + (row.members?.length ?? 0), 0), exactMemberDeclarations: rows.reduce((sum, row) => sum + (row.members?.filter(member => member.declarationsMatch).length ?? 0), 0), previousValueAliases:rows.reduce((sum,row)=>sum+(row.members?.filter(member=>member.declarationMatchKinds.includes("previous-value-alias")).length??0),0), rows, declarationBranches, generatedResourceReportSha256: createHash("sha256").update(JSON.stringify(generated.report, null, 2) + "\n").digest("hex"), pending: ["native-member-gate-adoption", "type-declaration-api-content", "schema-reference-semantics", "generated-page-acceptance"], coverageComplete: false, releaseProof: false };
  assertPublicRootOmission(report, container);
  const output = fs.mkdtempSync(path.join(mainRoot, "dist/schema-resource-association-"));
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  return { report, output: path.relative(mainRoot, output).replaceAll("\\", "/"), generatedOutput: generated.output, artifacts: generated.artifacts, sourcePaths: generated.sourcePaths };
}

// <lang><zh-CN>严格命令保留未核绑定的非零退出；inspect仅允许采集部分进展。</zh-CN><en>The strict command retains nonzero exit for unverified bindings; inspect only permits collecting partial progress.</en></lang>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert(args.length >= 2 && args.length <= 3 && args[0] === "--workspace-root" && (args.length === 2 || args[2] === "--inspect"));
  const { report, output, generatedOutput } = await auditSchemaResourceAssociations(path.resolve(args[1]));
  console.log(JSON.stringify({ runtimeBindings: report.runtimeBindings, associatedBindings: report.associatedBindings, unverifiedBindings: report.unverifiedBindings, values: report.values, matchedMemberPointers: report.matchedMemberPointers, exactMemberDeclarations: report.exactMemberDeclarations, declarationBranches: report.declarationBranches.length, output, generatedOutput, coverageComplete: false }));
  if ((report.unverifiedBindings || report.exactMemberDeclarations !== report.matchedMemberPointers) && !args.includes("--inspect")) process.exitCode = 1;
}
