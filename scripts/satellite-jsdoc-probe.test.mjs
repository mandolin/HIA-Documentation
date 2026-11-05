/** @lang zh-CN 需显式工作区的原生JSDoc反例，不用假doclet模拟解析成功。 @lang en Native JSDoc regressions requiring an explicit workspace, never fake doclets to simulate parsing success. */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import ts from "typescript";

// <lang><zh-CN>仅显式联调时加载已授权工具；单主仓CI不隐式克隆卫星或安装依赖。</zh-CN><en>Load authorized tools only for explicit integration; main-only CI never implicitly clones satellites or installs dependencies.</en></lang>
const workspace=process.env.HIA_API_WORKSPACE_ROOT;
const mainRoot=fs.realpathSync(fileURLToPath(new URL("../",import.meta.url)));
const enabled=typeof workspace==="string" && workspace.length>0;
let run;
let fixture;
if(enabled) {
  // <lang><zh-CN>环境变量只选择本主仓容器；输出固定在主仓真实dist下的新目录。</zh-CN><en>The environment selects this main repository's container only; output stays in a new directory beneath its real dist.</en></lang>
  const container=fs.realpathSync(workspace);
  assert.equal(fs.realpathSync(path.join(container,"main-repo")),mainRoot);
  const dist=path.join(mainRoot,"dist");
  fs.mkdirSync(dist,{recursive:true});
  assert.equal(path.relative(dist,fs.realpathSync(dist)),"");
  fixture=fs.mkdtempSync(path.join(dist,"native-jsdoc-tests-"));
  const runnerPath=path.join(container,"HIA/hia-jsdoc/packages/jsdoc-runner/src/index.mjs");
  const pluginPath=path.join(container,"HIA/jsdoc-plugin-hia-sys/src/index.cjs");
  for(const file of [runnerPath,pluginPath]) assert.equal(path.relative(container,fs.realpathSync(file)),path.relative(container,file));
  const {runHiaJsdocProject}=await import(pathToFileURL(runnerPath));
  /**
   * @lang zh-CN 在唯一夹具中写入受控公开源码并实际解析，返回真实生产结果。
   * @lang en Write controlled public fixture source in a unique directory and return its real producer result.
   * @param {string} name - 测试标识。 Test identity.
   * @param {string} source - 不含私人数据的夹具源码。 Fixture source without private data.
   * @returns {object} 原生生产结果及实际输出。 Native result and actual output directory.
   */
  run=(name,source)=>{
    const input=path.join(fixture,`${name}.mjs`);
    fs.writeFileSync(input,source,{flag:"wx"});
    const output=path.join(fixture,name);
    const result=runHiaJsdocProject({workspaceRoot:container,outputDirectory:output,inputs:[{path:path.relative(container,input).replaceAll("\\","/")}],options:{mode:"hiaIntegration",plugin:{pluginPath},hia:{docSourceMap:{enabled:true},i18n:{enabled:true,defaultLocale:"en",locales:["en","zh-CN"]}}}});
    return {result,output};
  };
}

test("native JSDoc rejects TypeScript optional-record syntax",{skip:!enabled},()=>{
  const {result}=run("invalid-record","/** @param {{path?:string}} options invalid */\nexport function invalid(options) {}\n");
  assert.equal(result.status,"failed");
  assert(result.diagnostics.some(item=>item.code==="HIA_JSDOC_RUNNER_FAILED"));
  assert(!JSON.stringify(result).includes(mainRoot));
});

test("native JSDoc preserves optional properties, defaults and bilingual fields",{skip:!enabled},()=>{
  const {result,output}=run("optional-property",`/**
 * @lang en Read an explicit relative source.
 * @lang zh-CN 读取显式相对来源。
 * @param {Object} [options] <lang><en>Source options.</en><zh-CN>来源配置。</zh-CN></lang>
 * @param {string} [options.path="input.html"] <lang><en>Relative source path.</en><zh-CN>相对来源路径。</zh-CN></lang>
 * @returns {string} <lang><en>Effective path.</en><zh-CN>实际路径。</zh-CN></lang>
 */
export function readSource(options={}) { return options.path ?? "input.html"; }
`);
  assert.equal(result.status,"success");
  const integration=JSON.parse(fs.readFileSync(path.join(output,"hia-integration.json")));
  const node=integration.ir.nodes.find(item=>item.name==="readSource");
  assert(node);
  const parameter=node.jsdoc.params.find(item=>item.name==="options.path");
  assert.equal(parameter.optional,true);
  assert.equal(parameter.defaultvalue,'"input.html"');
  assert.deepEqual(node.i18n.fields["params.options_path.description"].localizedText,{en:"Relative source path.","zh-CN":"相对来源路径。"});
});

test("native JSDoc statically parses a target whose top-level execution throws",{skip:!enabled},()=>{
  const {result,output}=run("no-target-execution",`throw new Error("TARGET_MUST_NOT_EXECUTE");
/** @lang en Return an explicit value. @lang zh-CN 返回显式值。 */
export function sample(){return 1;}
`);
  assert.equal(result.status,"success");
  assert(JSON.parse(fs.readFileSync(path.join(output,"hia-integration.json"))).ir.nodes.some(item=>item.name==="sample"));
});

test("projection documentation retains literal fields and optional range typing",{skip:!enabled},()=>{
  // <lang><zh-CN>用真实TypeScript读取标准JSDoc返回类型，防止为让JSDoc通过而将完整结构降级为Object。
  // </zh-CN><en>Read the standard JSDoc return type through real TypeScript so native-parser compatibility cannot degrade its structure to Object.</en></lang>
  const file=path.join(fs.realpathSync(workspace),"HIA/hia-htmdoc/packages/htmdoc-runner/src/html-authoring-source-comment-integration.mjs");
  const program=ts.createProgram([file],{allowJs:true,checkJs:false,noEmit:true,skipLibCheck:true,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext});
  const checker=program.getTypeChecker();
  const source=program.getSourceFile(file);
  const exported=checker.getExportsOfModule(checker.getSymbolAtLocation(source)).find(item=>item.name==="createHtmlAuthoringSourceCommentProjectionRequest");
  const signature=checker.getTypeOfSymbolAtLocation(exported,source).getCallSignatures()[0];
  const returned=checker.getReturnTypeOfSignature(signature);
  assert.equal(checker.getTypeOfPropertyOfType(returned,"contract").value,"documentation-source-comment-projection");
  assert.equal(checker.getTypeOfPropertyOfType(returned,"contractVersion").value,"0.1.0-draft");
  assert.deepEqual(checker.getTypeOfPropertyOfType(returned,"source").getProperties().map(item=>item.name).sort(),["docSourceMapEntryId","documentId","sourceId","symbolId"]);
  assert.deepEqual(checker.getTypeOfPropertyOfType(returned,"contentPolicy").types.map(item=>item.value).sort(),["explicit-projected-text","none"]);
  const comment=checker.getIndexTypeOfType(checker.getTypeOfPropertyOfType(returned,"comments"),ts.IndexKind.Number);
  assert.equal(checker.getTypeOfPropertyOfType(comment,"order").value,0);
  assert.equal(checker.getTypeOfPropertyOfType(comment,"commentId").value,"comment.description");
  assert.equal(Boolean(comment.getProperty("range").flags & ts.SymbolFlags.Optional),true);
  assert.deepEqual(checker.getTypeOfPropertyOfType(comment,"localizedText").getStringIndexType().flags,ts.TypeFlags.String);
});
