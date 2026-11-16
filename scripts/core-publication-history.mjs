/**
 * @file
 * @lang zh-CN 核心参考站按已登记声明证明绑定持久公开身份，常规构建只读登记。
 * @lang en Bind persistent core-reference identities through registered declaration evidence, read-only during normal builds.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertDocumentationProjectRouteHistory} from '../packages/renderer-html/dist/index.js';

/**
 * @lang zh-CN 提取位置无关的确切声明证明；保留模块、原生结构槽位和完整父链。
 * @lang en Extract exact position-independent declaration evidence, retaining modules, native structural slots and complete ancestry.
 * @param {Array<{input:string,document:object}>} documents <lang><zh-CN>显式允许的当前原生文档。</zh-CN><en>Explicitly allowed current native documents.</en></lang>
 * @returns {Array<object>} <lang><zh-CN>唯一证明摘要、当前符号及默认公开身份。</zh-CN><en>Unique evidence digest, current symbol and default public identity.</en></lang>
 * @throws {Error} <lang><zh-CN>重复或缺失父节点、循环、歧义。</zh-CN><en>Duplicate or missing parents, cycles or ambiguity.</en></lang>
 */
export function collectCorePublicationDeclarations(documents) {
  // <lang><zh-CN>证明跨文档仍包含明确输入，原生ID只用于追踪当前父链。</zh-CN><en>Evidence includes its explicit input across documents; native IDs only trace current ancestry.</en></lang>
  const rows = [];
  for (const {input,document} of documents) {
    const symbols = new Map(document.symbols.map(symbol=>[symbol.id,symbol]));
    assert.equal(symbols.size,document.symbols.length,'Duplicate native publication declaration.');
    for (const symbol of document.symbols) {
      // <lang><zh-CN>不纳入坐标和原生ID；匿名联合、泛型槽位来自已确认0.4模型。</zh-CN><en>Exclude coordinates and native IDs; anonymous union and generic slots come from the confirmed 0.4 model.</en></lang>
      const chain = [];
      const seen = new Set();
      let current = symbol;
      while (current) {
        assert(!seen.has(current.id),'Cyclic publication ancestry.');
        seen.add(current.id);
        const metadata = current.metadata?.tsdoc;
        assert(metadata && typeof current.signature === 'string','Missing publication declaration evidence.');
        chain.push({name:current.name,kind:current.kind,signature:current.signature.replace(/\r\n?/gu,'\n'),modulePath:metadata.modulePath,
          sourcePath:current.source?.definedIn?.relativePath,tsKind:metadata.tsKind,syntaxKind:metadata.syntaxKind,typeExpression:metadata.typeExpression});
        if (!current.parentId) break;
        current = symbols.get(current.parentId);
        assert(current,'Missing publication ancestor.');
      }
      const proof = createHash('sha256').update(JSON.stringify({input,chain})).digest('hex');
      rows.push({proof,symbolId:symbol.id,entryId:'hia-document:'+symbol.id.replace(/[^a-zA-Z0-9_-]+/gu,'-').toLowerCase(),view:'js'});
    }
  }
  assert.equal(new Set(rows.map(row=>row.proof)).size,rows.length,'Ambiguous publication declaration evidence.');
  return rows;
}

/**
 * @lang zh-CN 将完整登记与当前精确证明双向核对，缺失或新增均要求显式维护。
 * @lang en Match the complete registry bidirectionally against exact current evidence, requiring explicit maintenance for missing or new declarations.
 * @param {object} registry <lang><zh-CN>已提交的核心站发布登记。</zh-CN><en>Committed core-site publication registry.</en></lang>
 * @param {Array<object>} declarations <lang><zh-CN>当前唯一声明证明。</zh-CN><en>Unique current declaration evidence.</en></lang>
 * @returns {object} <lang><zh-CN>当前原生绑定的通用历史工件。</zh-CN><en>Generic history artifact bound to current native declarations.</en></lang>
 * @throws {Error} <lang><zh-CN>登记版本、证明、身份或通用历史无效。</zh-CN><en>Invalid registry version, evidence, identity or generic history.</en></lang>
 */
export function bindCorePublicationHistory(registry,declarations) {
  assert.equal(registry.schemaVersion,'0.1.0-draft','Unknown core publication registry version.');
  assert(Array.isArray(registry.declarations),'Missing publication registry.');
  const current = new Map(declarations.map(row=>[row.proof,row]));
  assert.equal(current.size,declarations.length,'Duplicate current publication evidence.');
  assert.equal(registry.declarations.length,current.size,'Publication declaration inventory changed; update the registry explicitly.');
  const used = new Set();
  const bindings = registry.declarations.map(record=>{
    assert(/^[a-f0-9]{64}$/u.test(record.proof) && !used.has(record.proof),'Invalid or duplicate registered evidence.');
    used.add(record.proof);
    const actual = current.get(record.proof);
    assert(actual,'Registered publication declaration changed; review its exact evidence.');
    return {view:actual.view,symbolId:actual.symbolId,entryId:record.entryId};
  });
  const history = {...registry.history,bindings};
  assertDocumentationProjectRouteHistory(history);
  return history;
}

/**
 * @lang zh-CN 正常核心构建只从显式生产输入读取普通原生工件并写私有运行输入。
 * @lang en Normal core builds read regular native artifacts from explicit producer inputs and write a private runtime input.
 * @param {string} mainRoot <lang><zh-CN>主仓根。</zh-CN><en>Main repository root.</en></lang>
 * @param {string} outputRoot <lang><zh-CN>本次独占暂存根。</zh-CN><en>Staging root owned by this invocation.</en></lang>
 * @param {Array<object>} inputs <lang><zh-CN>正常生产器返回的API输入。</zh-CN><en>API inputs returned by the normal producer.</en></lang>
 * @returns {string} <lang><zh-CN>显式CLI历史输入位置。</zh-CN><en>Explicit CLI history-input location.</en></lang>
 */
export function prepareCorePublicationHistory(mainRoot,outputRoot,inputs) {
  const documents = inputs.map(input=>{
    // <lang><zh-CN>路径来自当前生产结果，仍核规范相对路径、普通叶节点及真实根边界。</zh-CN><en>Paths come from current production but still require canonical relative paths, regular leaves and real-root containment.</en></lang>
    const pack = input.semanticPath?.find(segment=>segment.kind==='package')?.id;
    assert(input.kind==='documentation-producer-result' && /^[a-z0-9-]+$/u.test(pack),'Invalid core publication input.');
    const relative = 'package-api/'+pack+'/api.hia.json';
    const file = path.join(outputRoot,relative);
    const state = fs.lstatSync(file);
    assert(state.isFile() && state.nlink===1 && fs.realpathSync(file)===path.resolve(file),'Linked core publication input.');
    return {input:relative,document:JSON.parse(fs.readFileSync(file,'utf8'))};
  });
  const registry = JSON.parse(fs.readFileSync(path.join(mainRoot,'reference/core-publication-history.json'),'utf8'));
  const history = bindCorePublicationHistory(registry,collectCorePublicationDeclarations(documents));
  const target = path.join(outputRoot,'.runtime/route-history.json');
  fs.writeFileSync(target,JSON.stringify(history)+'\n',{flag:'wx'});
  return target;
}
