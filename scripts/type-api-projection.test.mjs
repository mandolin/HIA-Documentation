/**
 * @file
 * @lang zh-CN 类型审核的真实AST、匿名成员、原声明和字段缺失回归。
 * @lang en Regressions for actual type ASTs, anonymous members, original declarations and missing fields.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectModuleExports } from "./lib/package-api-inputs.mjs";
import { collectTypeApiExpectations, verifyTypeApiProjection } from "./lib/type-api-projection.mjs";
import {collectDeclarationValueExpectations,verifyDeclarationValueProjection} from "./lib/declaration-value-projection.mjs";
import {auditSatelliteTypeApi} from "./audit-satellite-type-api.mjs";

test("satellite declaration audit rejects invalid explicit subsets before tool or package reads", async t => {
    // <lang><zh-CN>独占夹具只连接当前主仓，确认无卫星仓时也能先拒绝无效包选择。</zh-CN><en>The owned fixture links only this checkout, proving invalid selections fail before requiring satellite repositories.</en></lang>
    const workspace = fs.mkdtempSync(path.join(dist, "type-selection-workspace-"));
    // <lang><zh-CN>固定主仓入口用于核既有容器身份，清理时只移除本次链接和空目录。</zh-CN><en>The fixed main entry verifies the existing container identity; cleanup removes only this invocation's link and empty directory.</en></lang>
    const mainEntry = path.join(workspace, "main-repo");
    fs.symlinkSync(fileURLToPath(new URL("../", import.meta.url)), mainEntry, process.platform === "win32" ? "junction" : "dir");
    t.after(() => { fs.unlinkSync(mainEntry); fs.rmdirSync(workspace); });
    for (const packageNames of [[], ["@hia-doc/unknown"], ["@hia-doc/dotnet-source-extractor", "@hia-doc/dotnet-source-extractor"]]) {
        await assert.rejects(auditSatelliteTypeApi(workspace, {packageNames, includeDeclarationValues: true}), /Invalid package audit selection/);
    }
});

// <lang><zh-CN>夹具独占本owner忽略目录，真实TypeScript只读源码且不会执行顶层抛错。</zh-CN><en>Fixtures own an ignored directory; actual TypeScript reads sources without executing top-level throws.</en></lang>
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
fs.mkdirSync(dist, { recursive: true });
const root = fs.mkdtempSync(path.join(dist, "type-api-test-"));
fs.writeFileSync(path.join(root, "package.json"), '{"type":"module"}');
fs.writeFileSync(path.join(root, "api.mts"), [
    'throw new Error("DO_NOT_RUN");',
    '/** @lang en Root prose. */',
    'export interface Original {',
    '/** @lang en Field prose. */',
    'value: string;',
    '}',
    'export {Original as Alias};'
].join("\n"));
/**
 * @lang zh-CN 构造最小实际AST期望与中性生成形状，原生SDK实链另行执行。
 * @lang en Builds actual AST expectations and neutral generated shapes; actual SDK chains run separately.
 * @returns {object} <lang><zh-CN>本次独立输入。</zh-CN><en>Independent input for this test.</en></lang>
 */
function fixture() {
    const expected = collectTypeApiExpectations(root, collectModuleExports(root, ["api.mts"]));
    const symbols = [], modules = [{ path: "api.mts", exports: [] }], entries = [];
    for (const [index, binding] of expected.bindings.entries()) {
        const declaration = binding.declarations[0];
        const rootId = `root-${index}`;
        modules[0].exports.push({ name: binding.name, symbolIds: [rootId] });
        for (const [position, item] of [declaration, ...declaration.members].entries()) {
            // <lang><zh-CN>父项身份与源码位置分别固定，测试不能用同名替代原声明。</zh-CN><en>Parent identities and source positions are fixed separately, preventing same-name declaration substitution.</en></lang>
            const id = position === 0 ? rootId : `field-${index}`;
            symbols.push({
                id, name: item.name, classification: "type-only", exported: position === 0, ...(position ? { parentId: rootId } : {}), signature: item.signature, metadata: { modulePath: binding.module }, source: { path: item.path, range: item.range }, comment: {
                    range: item.commentRange, i18n: {
                        fields: {
                            description: { localizedText: { en: "Actual prose", "zh-CN": "实际正文" }, blocks: [{ locale: "en" }, { locale: "zh-CN" }] }
                        }
                    }
                }
            });
            entries.push({
                symbolId: id, sourceRefs: [
                    {
                        sourceId: "source", range: item.range, rangeSourceDetail: "typescript-native-ast:declaration", rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }
                    },
                    {
                        sourceId: "source", range: item.commentRange, rangeSourceDetail: "typescript-native-ast:documentation-comment", rangeConvention: { endBoundary: "exclusive", columnUnit: "utf16-code-unit" }
                    }
                ]
            });
        }
    }
    return { expected, extraction: { modules, symbols }, map: { sources: [{ id: "source", path: "api.mts" }], entries } };
}
test("aliases retain separate roots with exact member provenance", () => {
    const input = fixture();
    const result = verifyTypeApiProjection(input);
    assert.equal(result.bindings, 2);
    assert.equal(result.members, 2);
    assert.equal(result.complete, true);
    assert.equal(result.runtimeStateVerified, false);
});

test("only explicit 0.3 structural containers are transparent to physical member ownership", () => {
    const input = fixture();
    const root = input.extraction.symbols.find(node => node.id === "root-0");
    const member = input.extraction.symbols.find(node => node.id === "field-0");
    input.extraction.symbols.push({id:"object-0",kind:"ts-type-literal",name:"object",signature:"{}",classification:"type-only",parentId:root.id,source:member.source,metadata:{typeExpression:{operator:"object",syntaxKind:"TypeLiteral"}}});
    input.expected.bindings[0].declarations[0].expressions=[{name:"object",kind:"TypeLiteral",path:member.source.path,range:member.source.range,signature:"{}",operator:"object",parentRange:root.source.range}];
    input.map.entries.push({symbolId:"object-0",sourceRefs:[{sourceId:"source",range:member.source.range,rangeSourceDetail:"typescript-native-ast:declaration",rangeConvention:{endBoundary:"exclusive",columnUnit:"utf16-code-unit"}}]});
    member.parentId="object-0";
    assert.equal(verifyTypeApiProjection(input).complete,false);
    input.extraction.contractVersion="0.3.0-draft";
    assert.equal(verifyTypeApiProjection(input).complete,true);
    for(const change of ["branch","signature","map"]) {
        const changed=structuredClone(input);
        const node=changed.extraction.symbols.find(item=>item.id==="object-0");
        if(change==="branch") node.metadata.typeExpression.branchIndex=3;
        if(change==="signature") node.signature="invented";
        if(change==="map") changed.map.entries.find(item=>item.symbolId==="object-0").sourceRefs=[];
        assert.equal(verifyTypeApiProjection(changed).expressionGaps,1,change);
    }
    input.extraction.symbols.find(node=>node.id==="object-0").kind="ts-runtime-class";
    assert.equal(verifyTypeApiProjection(input).complete,false);
});
test("anonymous union/intersection members enter independent expectations", () => {
    fs.writeFileSync(path.join(root, "branches.mts"), 'export type Input = {kind: string} & ({path: string} | {paths: string[]}); export type Json = string | {[key: string]: unknown};');
    const expected = collectTypeApiExpectations(root, collectModuleExports(root, ["branches.mts"]));
    assert.equal(expected.bindings.flatMap(binding => binding.declarations.flatMap(root => root.members)).length, 4);
    assert(expected.bindings.flatMap(binding => binding.declarations.flatMap(root => root.members)).some(member => member.kind === "IndexSignature"));
    assert.equal(expected.bindings.flatMap(binding=>binding.declarations.flatMap(root=>root.expressions)).length,8);
});

test("explicit 0.4 inventory retains generic targets, arguments and readonly array operands",()=>{
    fs.writeFileSync(path.join(root,"wrapped.mts"),'export type Bound = Readonly<{items: readonly {value:string}[]}>;');
    const modules=collectModuleExports(root,["wrapped.mts"]);
    const legacy=collectTypeApiExpectations(root,modules);
    const current=collectTypeApiExpectations(root,modules,{extractionVersion:"0.4.0-draft"});
    assert.equal(legacy.bindings[0].declarations[0].expressions.length,1);
    const expressions=current.bindings[0].declarations[0].expressions;
    assert.equal(expressions.length,5);
    assert.equal(expressions[0].targetName,"Readonly");
    assert.equal(expressions[1].argumentIndex,0);
    assert.equal(expressions.find(item=>item.operator==="type-operator").typeOperator,"readonly");
    assert.equal(current.bindings[0].declarations[0].members.length,2);
});
test("missing anonymous member output remains a strict gap", () => {
    const input = fixture();
    input.extraction.symbols = input.extraction.symbols.filter(node => !node.parentId);
    const result = verifyTypeApiProjection(input);
    assert.equal(result.verifiedRoots, 2);
    assert.equal(result.memberGaps, 2);
    assert.equal(result.complete, false);
});
test("wrong binding IDs, source ranges and parent roots cannot borrow coverage", () => {
    for (const kind of ["binding", "source", "parent"]) {
        const input = fixture();
        if (kind === "binding")
            input.extraction.modules[0].exports[0].symbolIds = ["root-1"];
        if (kind === "source")
            input.extraction.symbols[0].source = { path: "other.mts", range: input.extraction.symbols[0].source.range };
        if (kind === "parent")
            input.extraction.symbols.find(node => node.id === "field-0").parentId = "root-1";
        assert.equal(verifyTypeApiProjection(input).complete, false, kind);
    }
});
test("mixed locale fallback, changed signatures and comment ranges fail", () => {
    for (const kind of ["locale", "signature", "comment", "classification", "scope"]) {
        const input = fixture();
        const node = input.extraction.symbols[0];
        if (kind === "locale")
            node.comment.i18n.fields.description.localizedText["zh-CN"] = "Actual prose";
        if (kind === "signature")
            node.signature = "invented signature";
        if (kind === "comment")
            node.comment.range = null;
        if (kind === "classification")
            node.classification = "runtime";
        if (kind === "scope")
            node.metadata.modulePath = "other.mts";
        assert.equal(verifyTypeApiProjection(input).complete, false, kind);
    }
});
test("missing explicit locale blocks and map precision remain gaps", () => {
    for (const kind of ["blocks", "map", "convention"]) {
        const input = fixture();
        if (kind === "blocks")
            input.extraction.symbols[0].comment.i18n.fields.description.blocks = [];
        if (kind === "map")
            input.map.entries[0].sourceRefs = [];
        if (kind === "convention")
            input.map.entries[0].sourceRefs[0].rangeConvention.endBoundary = "inclusive";
        assert.equal(verifyTypeApiProjection(input).complete, false, kind);
    }
});
test("foreign declarations and source-coordinate mismatches are rejected", () => {
    const modules = collectModuleExports(root, ["api.mts"]);
    modules[0].exports[0].declarations[0].path = "../outside.mts";
    assert.throws(() => collectTypeApiExpectations(root, modules));
    const altered = collectModuleExports(root, ["api.mts"]);
    altered[0].exports[0].declarations[0].line = 999;
    assert.throws(() => collectTypeApiExpectations(root, altered), /original type declaration/);
});

/**
 * @lang zh-CN 构造真实声明文件中的重载与三个公开别名，再建立独立可篡改的生成投影。
 * @lang en Builds overloads and three public aliases in a real declaration file, then creates an independently mutable generated projection.
 */
function valueFixture() {
    const directory=fs.mkdtempSync(path.join(dist,"declared-values-test-"));
    const prose='/**\n * @lang zh-CN 读取原值。\n * @lang en Reads the original value.\n * @param value <lang><zh-CN>待读取值。</zh-CN><en>Value to read.</en></lang>\n * @returns <lang><zh-CN>同一值。</zh-CN><en>The same value.</en></lang>\n * @throws <lang><zh-CN>无效值。</zh-CN><en>Invalid value.</en></lang>\n */\n';
    fs.writeFileSync(path.join(directory,"api.d.mts"),prose+'export function read(value:string):string;\n'+prose+'export function read(value:number):number;\n'+prose+'export const Descriptor: Readonly<{id:string}>;\nexport {Descriptor as Alias};\nexport default Descriptor;\nexport interface Pure {id:string};\n');
    const expected=collectDeclarationValueExpectations(directory,collectModuleExports(directory,["api.d.mts"]));
    const symbols=[],entries=[],exports=[];
    for(const [index,binding] of expected.bindings.entries()) {
        const symbolIds=[];
        for(const [declarationIndex,declaration] of binding.declarations.entries()) {
            const id=`value-${index}-${declarationIndex}`;
            const field={localizedText:{en:"Original prose.","zh-CN":"原始正文。"},blocks:[{locale:"en"},{locale:"zh-CN"}]};
            const fields=Object.fromEntries(["description",...declaration.requiredFields].map(key=>[key,structuredClone(field)]));
            symbolIds.push(id);
            symbols.push({id,name:binding.name,classification:"type-only",exported:true,signature:declaration.signature,source:{path:declaration.path,range:structuredClone(declaration.range)},metadata:{modulePath:binding.module,syntaxKind:declaration.kind},comment:{range:structuredClone(declaration.commentRange),i18n:{fields}}});
            entries.push({symbolId:id,sourceRefs:[{sourceId:"source",range:structuredClone(declaration.range),rangeSourceDetail:"typescript-native-ast:declaration",rangeConvention:{endBoundary:"exclusive",columnUnit:"utf16-code-unit"}},{sourceId:"source",range:structuredClone(declaration.commentRange),rangeSourceDetail:"typescript-native-ast:documentation-comment",rangeConvention:{endBoundary:"exclusive",columnUnit:"utf16-code-unit"}}]});
        }
        exports.push({name:binding.name,symbolIds});
    }
    return {directory,expected,extraction:{symbols,modules:[{path:"api.d.mts",exports}]},map:{sources:[{id:"source",path:"api.d.mts"}],entries}};
}

test("declaration values keep overloads and alias roots separate from pure types",()=>{
    const data=valueFixture();
    const result=verifyDeclarationValueProjection(data);
    assert.equal(data.expected.bindings.length,4);
    assert.equal(result.rootDeclarations,5);
    assert.equal(result.complete,true);
    assert.equal(result.scope,"declaration-value-roots");
    assert.equal(result.runtimeStateVerified,false);
    assert.equal(result.nestedTypeMembersVerified,false);
});

test("value roots reject missing declarations, wrong signatures, scope and map roles",()=>{
    for(const change of [data=>data.extraction.symbols.shift(),data=>{data.extraction.symbols[0].signature="invented";},data=>{data.extraction.symbols[0].metadata.modulePath="other.d.mts";},data=>{data.extraction.symbols[0].classification="runtime";},data=>{data.map.entries[0].sourceRefs[0].range.end.column++;},data=>{data.map.entries[0].sourceRefs[1].rangeSourceDetail="typescript-native-ast:declaration";}]) {
        const data=valueFixture();change(data);
        assert.equal(verifyDeclarationValueProjection(data).complete,false);
    }
});

test("value root fields require actual bilingual parameters and returns without fallback",()=>{
    for(const key of ["params.value.description","returns","throws.0"]){
        const data=valueFixture();
        const node=data.extraction.symbols.find(node=>node.metadata.syntaxKind==="FunctionDeclaration");
        node.comment.i18n.fields[key]={defaultLocale:"en",defaultText:"Fallback",localizedText:{"zh-CN":"只有中文。"}};
        assert.equal(verifyDeclarationValueProjection(data).complete,false);
    }
});

test("value expectation rejects nondeclaration files and source-location substitutions",()=>{
    const data=valueFixture();
    fs.writeFileSync(path.join(data.directory,"runtime.mts"),'export const value = 1;');
    assert.throws(()=>collectDeclarationValueExpectations(data.directory,collectModuleExports(data.directory,["runtime.mts"])));
    const modules=collectModuleExports(data.directory,["api.d.mts"]);
    modules[0].exports.find(binding=>!binding.declarationTypeOnly).declarations[0].line=999;
    assert.throws(()=>collectDeclarationValueExpectations(data.directory,modules));
});
