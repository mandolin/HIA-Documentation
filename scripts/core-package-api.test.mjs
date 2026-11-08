/**
 * @file
 * @lang zh-CN 核心包生成链的独立导出、字段、来源与原始语言审阅回归。
 * @lang en Regressions for independent exports, fields, provenance and original-locale review in generated core APIs.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {verifyProjectApiProjection,assertPublicRootOmission,writeCoreApiReport} from "./lib/core-package-api.mjs";
import {auditApiDescriptionLocales} from "./lib/api-description-locales.mjs";
import ts from "typescript";

test("description review uses original locale fields without fallback or invented translation", () => {
  // <lang><zh-CN>夹具分别保留原始双语、仅回退、相同正文、仅备注和空语言，避免统计掩盖来源差别。</zh-CN><en>The fixture distinguishes explicit pairs, fallback-only text, identical prose, remarks-only content and a blank locale.</en></lang>
  const document={symbols:[
    {id:"paired",name:"pair",kind:"type",i18n:{fields:{description:{localizedText:{en:"A profile.","zh-CN":"一个规范。"}}}}},
    {id:"default",name:"fallback",kind:"type",i18n:{fields:{description:{defaultLocale:"en",defaultText:"Default prose.",localizedText:{en:"Default prose."}}}}},
    {id:"same",name:"shared",kind:"type",i18n:{fields:{description:{localizedText:{en:"Shared prose.","zh-CN":"Shared prose."}}}}},
    {id:"none",name:"empty",kind:"type",i18n:{fields:{remarks:{localizedText:{en:"Remark.","zh-CN":"备注。"}}}}},
    {id:"blank",name:"blank",kind:"type",i18n:{fields:{description:{localizedText:{en:"  ","zh-CN":"正文。"}}}}}
  ]};
  // <lang><zh-CN>只审阅原始字段，每个待核原因必须和相应物理符号对应。</zh-CN><en>Review original fields only, retaining each reason's association with its physical symbol.</en></lang>
  const audit=auditApiDescriptionLocales(document);
  assert.equal(audit.symbols,5);
  assert.equal(audit.distinctPairs,1);
  assert.deepEqual(audit.review.map(row=>[row.id,row.reason]),[["default","missing-zh-CN"],["same","identical-text"],["none","missing-description"],["blank","missing-en"]]);
  assert.equal(audit.translationQualityVerified,false);
  assert.equal(audit.fieldScope,"description");
});

test("profile and source-linkage bilingual comments retain separate canonical locale lines", () => {
  // <lang><zh-CN>固定本批公开节点的十一份实际声明源，覆盖重导出背后的物理成员。</zh-CN><en>Fix the eleven actual declaration sources for this batch, including physical members behind re-exports.</en></lang>
  const files = [
    "profile/src/index.ts",
    "source-linkage/src/binding-migration.ts",
    "source-linkage/src/constants.ts",
    "source-linkage/src/coordinate-profile-schema.ts",
    "source-linkage/src/coordinate-profile.ts",
    "source-linkage/src/generated-documentation-binding-host-projection.ts",
    "source-linkage/src/generated-documentation-binding-index.ts",
    "source-linkage/src/generated-documentation-binding.ts",
    "source-linkage/src/index.ts",
    "source-linkage/src/manifest-migration.ts",
    "source-linkage/src/schema.ts"
  ];
  for (const relative of files) {
    // <lang><zh-CN>由语法树读取已附着文档，避免将模板或普通字符串视为注释。</zh-CN><en>Read attached documentation through the syntax tree, excluding templates and ordinary strings.</en></lang>
    const file = fileURLToPath(new URL(`../packages/${relative}`, import.meta.url));
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    /**
     * @lang zh-CN 检查已有两语JSDoc的行首标签，正文完整性另由实际生产链验收。
     * @lang en Checks line-leading tags in existing bilingual JSDoc; actual production separately verifies content completeness.
     * @param {import("typescript").Node} node <lang><zh-CN>当前物理语法节点。</zh-CN><en>The current physical syntax node.</en></lang>
     */
    function check(node) {
      for (const doc of node.jsDoc ?? []) {
        // <lang><zh-CN>只将明确声明两种语言的原文纳入此格式门禁。</zh-CN><en>Apply this format gate only to original comments explicitly declaring both locales.</en></lang>
        const text = doc.getText(source);
        if (text.includes("@lang zh-CN") && text.includes("@lang en")) {
          assert.match(text, /^\s*\*\s+@lang zh-CN\s+\S/m, `${relative} Chinese`);
          assert.match(text, /^\s*\*\s+@lang en\s+\S/m, `${relative} English`);
        }
      }
      ts.forEachChild(node, check);
    }
    check(source);
  }
});

test("config and plugin SDK public declarations and nested members retain explicit bilingual descriptions", () => {
  // <lang><zh-CN>固定配置、项目清单及生产器SDK的四份真实声明源，递归覆盖匿名类型字段。</zh-CN><en>Fix the four config, project-manifest and producer SDK sources, recursively covering anonymous type fields.</en></lang>
  const files = ["config/src/index.ts", "config/src/project-manifest.ts", "plugin-sdk/src/constants.ts", "plugin-sdk/src/index.ts"];
  for (const relative of files) {
    // <lang><zh-CN>使用已安装编译器读取真实声明，字符串中的示例不进入节点检查。</zh-CN><en>Read actual declarations with the installed compiler, excluding examples inside strings.</en></lang>
    const file = fileURLToPath(new URL(`../packages/${relative}`, import.meta.url));
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    /**
     * @lang zh-CN 对当前声明及嵌套字段核两语行首标签，生成链另核正文与投影。
     * @lang en Checks line-leading locale tags on declarations and nested fields; production separately verifies text and projection.
     * @param {import("typescript").Node} node <lang><zh-CN>当前声明或字段。</zh-CN><en>The current declaration or field.</en></lang>
     */
    function check(node) {
      // <lang><zh-CN>节点附着文档必须含显式语言声明，默认英文或deprecated字段不能代替description。</zh-CN><en>Attached docs require explicit locales; default English or deprecated fields cannot replace descriptions.</en></lang>
      const comment = node.jsDoc?.at(-1)?.getText(source) ?? "";
      assert.match(comment, /^\s*\*\s+@lang zh-CN(?:[ \t]|\r?$)/m, `${relative} ${node.name?.getText(source) ?? ts.SyntaxKind[node.kind]} Chinese`);
      assert.match(comment, /^\s*\*\s+@lang en(?:[ \t]|\r?$)/m, `${relative} ${node.name?.getText(source) ?? ts.SyntaxKind[node.kind]} English`);
      for (const member of node.members ?? []) check(member);
      if (node.type && ts.isTypeLiteralNode(node.type)) for (const member of node.type.members) check(member);
    }
    for (const statement of source.statements) {
      if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) && (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement))) check(statement);
    }
  }
});

test("distribution and theme public declarations retain canonical bilingual source comments", () => {
  for(const name of ["profiles","schemas","theme-default"]) {
    // <lang><zh-CN>固定三个本轮治理的真实入口，使用已有TypeScript依赖检查原注释位置。</zh-CN><en>Inspect original comment positions in the three governed entries using the existing TypeScript dependency.</en></lang>
    const file=fileURLToPath(new URL(`../packages/${name}/src/index.ts`,import.meta.url));
    const source=ts.createSourceFile(file,fs.readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    /**
     * @lang zh-CN 仅检查公开声明及其物理类型成员，模板内文本不作为TypeScript声明。
     * @lang en Checks public declarations and their physical type members, excluding text inside templates.
     */
    function check(node) {
      // <lang><zh-CN>行首语言标签是生成器可识别的源事实，不能由混合正文中的单词替代。</zh-CN><en>Line-leading locale tags are generator-readable source evidence, unlike language words embedded in mixed prose.</en></lang>
      const comment=node.jsDoc?.at(-1)?.getText(source)??"";
      assert.match(comment,/^\s*\*\s+@lang zh-CN\s+\S/m,`${name}: ${node.name?.getText(source)??ts.SyntaxKind[node.kind]} Chinese`);
      assert.match(comment,/^\s*\*\s+@lang en\s+\S/m,`${name}: ${node.name?.getText(source)??ts.SyntaxKind[node.kind]} English`);
      for(const member of node.members??[]) check(member);
      if(node.type&&ts.isIntersectionTypeNode(node.type)) for(const part of node.type.types) if(ts.isTypeLiteralNode(part)) for(const member of part.members) check(member);
    }
    for(const statement of source.statements) if(statement.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)) check(statement);
  }
});

/**
 * @lang zh-CN 构造两个公开入口的独立期望和富字段投影，不执行实际源码。
 * @lang en Construct independent expectations and rich-field projections for two public entries without executing source.
 * @returns {object} 可独立修改的合成对照。 Independently mutable synthetic comparison.
 */
function fixture(){
  const comment={i18n:{fields:{remarks:{localizedText:{en:"Read only.","zh-CN":"只读。"}}}}};
  const source={path:"src/value.ts",range:{start:{line:2,column:1},end:{line:3,column:1}}};
  const symbol={id:"real",name:"Alias",signature:"const value: number",source,comment};
  return {modules:[{path:"src/index.ts",exports:[{name:"Alias"}]}],extraction:{modules:[{path:"src/index.ts",exports:[{name:"Alias",symbolIds:["real"]}]}],symbols:[symbol]},document:{symbols:[{id:"real",name:"Alias",signature:symbol.signature,source:{definedIn:{relativePath:source.path,range:source.range}},i18n:structuredClone(comment.i18n)}]},bridge:{runtimeSymbols:[structuredClone(symbol)],typeOnlySymbols:[]}};
}

test("matches every public binding and retains full bilingual fields and actual source",()=>{
  const data=fixture();
  assert.deepEqual(verifyProjectApiProjection(data),{bindings:1,symbols:1,i18nFields:1});
});
test("missing module, alias or referenced declaration is a failure",()=>{
  for(const change of [data=>{data.extraction.modules=[];},data=>{data.extraction.modules[0].exports[0].name="Original";},data=>{data.extraction.modules[0].exports[0].symbolIds=["missing"];},data=>{data.document.symbols=[];}]){
    const data=fixture();change(data);assert.throws(()=>verifyProjectApiProjection(data));
  }
});
test("summary-only projection, changed signatures or fabricated locations are rejected",()=>{
  for(const change of [data=>{data.document.symbols[0].i18n.fields={};},data=>{data.bridge.runtimeSymbols[0].comment.i18n.fields.remarks.localizedText["zh-CN"]="Lost";},data=>{data.document.symbols[0].signature="Other";},data=>{data.document.symbols[0].source.definedIn.relativePath="invented.xml";}]){
    const data=fixture();change(data);assert.throws(()=>verifyProjectApiProjection(data));
  }
});
test("duplicate projected IDs cannot hide missing declarations",()=>{
  const data=fixture();data.document.symbols.push(structuredClone(data.document.symbols[0]));
  assert.throws(()=>verifyProjectApiProjection(data));
});

test("unexpected exports and JSON-escaped machine roots fail",()=>{
  const data=fixture();data.extraction.modules[0].exports.push({name:"private",symbolIds:["real"]});
  assert.throws(()=>verifyProjectApiProjection(data));
  const root="K:\\Owned Space\\Example";
  assert.throws(()=>assertPublicRootOmission({value:root},root));
  assert.throws(()=>assertPublicRootOmission({value:"file:///K:/Owned Space/Example/source.ts"},root));
  assert.doesNotThrow(()=>assertPublicRootOmission({value:"src/public.ts"},root));
});

test("summary writes only a real directory and refuses a redirected directory",()=>{
  const parent=fileURLToPath(new URL("../dist/",import.meta.url));
  fs.mkdirSync(parent,{recursive:true});
  const root=fs.realpathSync(fs.mkdtempSync(path.join(parent,"api-summary-")));
  const actual=path.join(root,"output");
  fs.mkdirSync(actual);
  writeCoreApiReport(actual,{status:"checked"});
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(actual,"core-package-api-report.json"),"utf8")),{status:"checked"});
  const alias=path.join(root,"alias");
  fs.symlinkSync(actual,alias,process.platform==="win32" ? "junction" : "dir");
  assert.throws(()=>writeCoreApiReport(alias,{status:"wrong"}));
  assert.equal(JSON.parse(fs.readFileSync(path.join(actual,"core-package-api-report.json"),"utf8")).status,"checked");
});

test("summary cannot overwrite another file through an existing hard link",()=>{
  const parent=fileURLToPath(new URL("../dist/",import.meta.url));
  fs.mkdirSync(parent,{recursive:true});
  const root=fs.realpathSync(fs.mkdtempSync(path.join(parent,"api-summary-")));
  const retained=path.join(root,"retained.json");
  fs.writeFileSync(retained,"retain");
  fs.linkSync(retained,path.join(root,"core-package-api-report.json"));
  assert.throws(()=>writeCoreApiReport(root,{status:"wrong"}));
  assert.equal(fs.readFileSync(retained,"utf8"),"retain");
});
