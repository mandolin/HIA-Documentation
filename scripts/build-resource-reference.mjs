/**
 * @file
 * @lang zh-CN 按已确认清单生成四资源分区与两发布站点，保留逐值、来源与原生工件。
 * @lang en Generate four resource partitions and two publication sites from the confirmed registry, preserving values, provenance and native artifacts.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadResourceReferencePartitions, assertResourceReferenceCoverage } from "./resource-reference-partitions.mjs";
import { auditRequiredPackages } from "./audit-required-package-api.mjs";
import { preparePublicReferenceResources, checkPublicReferenceResources } from "./public-reference-resources.mjs";
import { preparePublicReferenceSourceConfig, preparePublicReferenceLocaleConfig } from "./public-reference-source.mjs";
import { assertCoreReferenceOutput, inspectCoreReferenceSite, CORE_REFERENCE_RESOURCE_PACKAGES } from "./build-core-reference.mjs";
import { assertPublicText } from "./check-official-web.mjs";
import { createGeneratedSiteNavigation } from "../site/src/lib/generated-navigation.mjs";
import { assertDocumentationSiteNavigation } from "../packages/renderer-html/dist/index.js";

// <lang><zh-CN>来源、暂存和最终输出均归本主仓，语言列表与既有参考一致。</zh-CN><en>Sources, staging and final outputs belong to this repository, using the existing reference locales.</en></lang>
const owner = fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
const workspace = path.dirname(owner);
const locales = ["zh-CN","en"];

/**
 * @lang zh-CN 公共栏目连接官网与核心API，版本/语言对应当前分区。
 * @lang en Link public tabs to the website and core API while versions/locales target the current partition.
 * @param {object} registry <lang><zh-CN>已校验发布清单。</zh-CN><en>Validated publication registry.</en></lang>
 * @param {string} partitionId <lang><zh-CN>明确分区身份。</zh-CN><en>Explicit partition identity.</en></lang>
 * @returns {object} <lang><zh-CN>既有导航契约数据。</zh-CN><en>Existing navigation-contract data.</en></lang>
 */
export function createResourceReferenceNavigation(registry,partitionId) {
  const part=registry.partitions.find(item=>item.id===partitionId);
  assert(part,"Unknown resource partition.");
  const site=registry.sites.find(item=>item.id===part.site);
  assert(site,"Missing resource publication site.");
  const current=Object.fromEntries(locales.map(locale=>[locale,site.base+part.path+locale+"/"]));
  const navigation=createGeneratedSiteNavigation("/HIA-Documentation/","/HIA-Documentation-API/");
  navigation.localeTargets=current;
  navigation.documentationVersion.entries[0].hrefByLocale=current;
  assertDocumentationSiteNavigation(navigation);
  return navigation;
}

/**
 * @lang zh-CN 经正常生产器与CLI生成资源站，检查完成后原子替换输出，旧输出保留备份。
 * @lang en Build resource sites through normal producers and CLI, atomically replacing checked output while retaining a backup.
 * @param {object} [options] <lang><zh-CN>自有输出选项。</zh-CN><en>Owned output options.</en></lang>
 * @param {string} [options.out] <lang><zh-CN>主仓dist子目录。</zh-CN><en>Child of this repository's dist directory.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>两站实际容量与来源提交。</zh-CN><en>Actual site capacities and source revision.</en></lang>
 */
export async function buildResourceReference(options={}) {
  const registry=loadResourceReferencePartitions();
  // <lang><zh-CN>从固定允许清单核全部核心包，新增JSON导出须有明确分区或现有SDK承载归属。</zh-CN><en>Audit all core packages from the fixed allowlist so new JSON exports require an explicit partition or existing SDK hosting owner.</en></lang>
  const packageNames=JSON.parse(fs.readFileSync(path.join(owner,"reference/required-package-api.inputs.json"),"utf8")).packages.filter(item=>item.owner==="main-repo").map(item=>item.name);
  const inventory=auditRequiredPackages(workspace,{packageNames});
  assertResourceReferenceCoverage(registry,inventory,CORE_REFERENCE_RESOURCE_PACKAGES);
  const output=path.resolve(owner,options.out??"dist/resource-reference-publication");
  assertCoreReferenceOutput(output);
  // <lang><zh-CN>固定已提交来源，避免生成过程中提交与工件事实分离。</zh-CN><en>Pin committed sources to keep revision metadata aligned with generated artifacts.</en></lang>
  execFileSync("git",["-C",owner,"diff","--exit-code","HEAD","--"],{stdio:"pipe"});
  const sourceCommit=execFileSync("git",["-C",owner,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const registrySha256=createHash("sha256").update(fs.readFileSync(path.join(owner,"reference/resource-reference-partitions.json"))).digest("hex");
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const lockPath=output+".lock";
  const lock=fs.openSync(lockPath,"wx");
  try {
    const staging=fs.mkdtempSync(output+".staging-");
    const reports=[];
    const partitionReports=[];
    for(const part of registry.partitions) {
      // <lang><zh-CN>每个逻辑分区独占运行目录，配置只映射本分区已审批的JSON文件。</zh-CN><en>Each logical partition owns its runtime directory, exposing only its approved JSON files.</en></lang>
      const root=path.join(staging,"partitions",part.id);
      fs.mkdirSync(root,{recursive:true});
      const packageNames=[...new Set(part.exports.map(entry=>entry.package))];
      const prepared=await preparePublicReferenceResources({packageNames,resourceExports:part.exports,workspaceRoot:workspace,mainRoot:owner,outputRoot:root,locales});
      const config=preparePublicReferenceSourceConfig(owner,path.join(root,".runtime"),prepared.sourcePaths,false);
      const navigationPath=path.join(root,".runtime/navigation.json");
      fs.writeFileSync(navigationPath,JSON.stringify(createResourceReferenceNavigation(registry,part.id)));
      // <lang><zh-CN>既有资源输入相对workspace，临时清单因此放在同一根并由当前调用独占。</zh-CN><en>Existing resource inputs are workspace-relative, so the temporary manifest is owned at that same root.</en></lang>
      const manifestPath=path.join(workspace,".hia-resource-"+randomUUID()+".runtime.hia-project.json");
      fs.writeFileSync(manifestPath,JSON.stringify({schemaVersion:"1.0.0",project:{id:"project:hia-resource-"+part.id,name:"HIA Documentation System · "+part.titleByLocale.en,defaultLocale:"zh-CN",locales},inputs:prepared.inputs}),{flag:"wx"});
      try {
        for(const locale of locales) {
          const localized=preparePublicReferenceLocaleConfig(config,locale);
          execFileSync(process.execPath,[path.join(owner,"apps/cli/dist/index.js"),"docs","build","--config",localized,"--project-manifest",manifestPath,"--site-navigation",navigationPath,"--out",path.join(root,locale),"--locale",locale],{cwd:workspace,stdio:"inherit"});
          checkPublicReferenceResources({packageResources:packageNames,resourceExports:part.exports},root,locale);
          const site=registry.sites.find(item=>item.id===part.site);
          const destination=path.join(staging,"sites",site.id,part.path,locale);
          fs.mkdirSync(path.dirname(destination),{recursive:true});
          assertCoreReferenceOutput(destination);
          fs.renameSync(path.join(root,locale),destination);
        }
      } finally {fs.unlinkSync(manifestPath);}
      const resources=JSON.parse(fs.readFileSync(path.join(root,"package-resources/adoption.json"),"utf8")).rows;
      partitionReports.push({id:part.id,path:part.path,titleByLocale:part.titleByLocale,projectId:"project:hia-resource-"+part.id,resources,values:resources.reduce((sum,row)=>sum+row.values,0),sourcePolicy:{paths:prepared.sourcePaths,maxLines:400,presentation:"fetch"}});
    }
    fs.mkdirSync(path.join(staging,"reports"));
    for(const site of registry.sites) {
      const root=path.join(staging,"sites",site.id);
      const first=registry.partitions.find(part=>part.id===site.defaultPartition);
      const target=first.path+"zh-CN/";
      fs.writeFileSync(path.join(root,"index.html"),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>HIA Documentation System Resource Reference</title><link rel="icon" href="data:,"></head><body><a href="${target}" lang="zh-CN">HIA Documentation System · 中文资源参考</a><a href="${first.path}en/" lang="en">HIA Documentation System · English resource reference</a></body></html>\n`);
      fs.writeFileSync(path.join(root,".nojekyll"),"");
      const partitions=site.partitions.map(id=>partitionReports.find(part=>part.id===id));
      const roots=partitions.flatMap(part=>locales.map(locale=>part.path+locale));
      const checked=inspectCoreReferenceSite(root,roots);
      const report={sourceRepository:"mandolin/HIA-Documentation",sourceCommit,producer:{id:"jsondoc",version:"1.0.0"},registrySha256,site,partitions,...checked};
      assertPublicText(JSON.stringify(report));
      fs.writeFileSync(path.join(staging,"reports",site.id+".json"),JSON.stringify(report,null,2)+"\n");
      reports.push({id:site.id,repository:site.repository,files:checked.files,bytes:checked.bytes});
    }
    execFileSync("git",["-C",owner,"diff","--exit-code","HEAD","--"],{stdio:"pipe"});
    assert.equal(execFileSync("git",["-C",owner,"rev-parse","HEAD"],{encoding:"utf8"}).trim(),sourceCommit);
    // <lang><zh-CN>重命名前核绝对目标，已有输出保留为同一dist内的独立备份。</zh-CN><en>Check absolute rename targets and retain existing output as an independent backup within dist.</en></lang>
    assertCoreReferenceOutput(staging);
    assertCoreReferenceOutput(output);
    let backup;
    if(fs.existsSync(output)) {backup=output+".previous-"+randomUUID();assertCoreReferenceOutput(backup);fs.renameSync(output,backup);}
    try {fs.renameSync(staging,output);}
    catch(error) {if(backup) fs.renameSync(backup,output);throw error;}
    return {sourceCommit,sites:reports};
  } finally {fs.closeSync(lock);fs.unlinkSync(lockPath);}
}

// <lang><zh-CN>导入无构建副作用，仅正常命令入口解析输出选项。</zh-CN><en>Imports have no build side effects; only the normal command entry parses output options.</en></lang>
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const args=process.argv.slice(2);
  assert(!args.length||args.length===2&&args[0]==="--out"&&args[1],"Use optional --out.");
  console.log(JSON.stringify(await buildResourceReference({out:args[1]})));
}
