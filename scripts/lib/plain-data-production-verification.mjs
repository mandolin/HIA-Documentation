/** @file @lang zh-CN 实际生产证据与独立静态定义的严格选定范围核验。 @lang en Strict selected-scope verification of actual production evidence against independent static definitions. */
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readPlainDataInitialization } from "../../packages/plugin-sdk/dist/plain-data-initialization.js";
import { readJsonResourceBytes, inspectJsonResource } from "./json-resource-audit.mjs";
import { readStaticJsonInitializationGraph } from "./static-initialization-graph.mjs";
import { compareStaticJsonResource } from "./static-json-export.mjs";

/**
 * @lang zh-CN 要求实际B、资源字节和独立A在指定导出JSON树上通过，缺失或冲突均拒绝。
 * @lang en Requires actual B, resource bytes and independent A to agree on the selected export JSON tree, rejecting missing or conflicting evidence.
 * @param {string} root <lang><zh-CN>显式授权的输入根；输出字节单独提供，不猜测输出根。</zh-CN><en>Explicitly authorized input root; output bytes are supplied separately without guessing an output root.</en></lang>
 * @param {string} modulePath <lang><zh-CN>确切定义模块。</zh-CN><en>Exact definition module.</en></lang>
 * @param {string} exportName <lang><zh-CN>预先固定的导出名。</zh-CN><en>Export name fixed in advance.</en></lang>
 * @param {unknown} evidence <lang><zh-CN>实际生产侧车，先取得防御性快照。</zh-CN><en>Actual production sidecar, defensively snapshotted first.</en></lang>
 * @param {Buffer} artifact <lang><zh-CN>本次实际输出的原始字节。</zh-CN><en>Original bytes of the actual output.</en></lang>
 * @returns {object} <lang><zh-CN>指定树的字节/值/来源/共享关系验证或固定阶段拒绝。包装模块、未选中值及生产主体真实性均不提升。</zh-CN><en>Selected-tree byte/value/provenance/sharing verification or a fixed-stage rejection. Wrapper modules, unselected values and producer authenticity are not promoted.</en></lang>
 */
export function verifyPlainDataProduction(root, modulePath, exportName, evidence, artifact) {
  // <lang><zh-CN>阶段标记来自固定本地枚举，异常文案不会进入结果。</zh-CN><en>Stage markers come from a fixed local enumeration; exception messages never enter results.</en></lang>
  let phase = "structure";
  try {
    const replay = readPlainDataInitialization(evidence,"produce");
    if (replay.status !== "replayed" || !Buffer.isBuffer(artifact)) throw new Error();
    const snapshot = replay.evidence;
    if (snapshot.evidenceOrigin !== "producer-recorded" || snapshot.producer.id !== "plain-data-native-producer" || snapshot.producer.version !== "0.1.0-draft" || snapshot.coverage !== "resource" || snapshot.activities.length !== 1 || replay.initialization.result.bindingName !== exportName) throw new Error();
    const sources = snapshot.resources.filter(row=>row.kind==="source");
    const outputs = snapshot.resources.filter(row=>row.kind==="artifact");
    const entry = sources.find(row=>row.id===replay.initialization.entryResourceId);
    if (outputs.length !== 1 || outputs[0].id !== replay.initialization.result.resourceId || entry?.path !== modulePath) throw new Error();
    phase = "bytes";
    const sha = bytes=>createHash("sha256").update(bytes).digest("hex");
    if (sha(artifact) !== outputs[0].sha256) throw new Error();
    for (const resource of sources) if (sha(readJsonResourceBytes(root,resource.path)) !== resource.sha256) throw new Error();
    phase = "static-definition";
    const independent = readStaticJsonInitializationGraph(root,modulePath,exportName);
    if (independent.status !== "available" || independent.definitionModule !== modulePath) throw new Error();
    const recordedSources = sources.map(row=>({path:row.path,sha256:row.sha256})).sort((a,b)=>a.path.localeCompare(b.path));
    const staticSources = independent.sources.map(row=>({path:row.path,sha256:row.sha256})).sort((a,b)=>a.path.localeCompare(b.path));
    if (!isDeepStrictEqual(recordedSources,staticSources)) throw new Error();
    phase = "value";
    const resource = inspectJsonResource(artifact);
    if (compareStaticJsonResource(independent,resource).status !== "equal" || !isDeepStrictEqual(JSON.parse(JSON.stringify(replay.value)),JSON.parse(artifact))) throw new Error();
    if (replay.valueLinks.length !== independent.nodes.length) throw new Error();
    phase = "sources";
    const byPointer = new Map(independent.nodes.map(row=>[row.pointer,row]));
    const byResource = new Map(sources.map(row=>[row.id,row.path]));
    const nativeToStatic = new Map();
    const staticToNative = new Map();
    /** @lang zh-CN 来源按实际资源及精确坐标比较，不依赖两侧节点编号。 @lang en Compares provenance by actual resources and exact coordinates without depending on either side's node numbering. */
    function sameSource(recorded, inferred) {
      // <lang><zh-CN>SDK快照可能采用无原型对象，坐标按字段值比较而不要求宿主原型相同。</zh-CN><en>SDK snapshots may use null-prototype objects; compare coordinate fields without requiring identical host prototypes.</en></lang>
      return byResource.get(recorded.resourceId) === inferred.path
        && recorded.range.start.line === inferred.range.start.line && recorded.range.start.column === inferred.range.start.column
        && recorded.range.end.line === inferred.range.end.line && recorded.range.end.column === inferred.range.end.column
        && recorded.rangeConvention.endBoundary === inferred.rangeConvention.endBoundary && recorded.rangeConvention.columnUnit === inferred.rangeConvention.columnUnit;
    }
    /** @lang zh-CN 以原始范围建立可排序身份，不依赖对象原型或字段排列。 @lang en Builds sortable identities from original ranges without depending on object prototypes or field order. */
    function sourceKey(source, resourcePath = source.path) {
      return JSON.stringify([resourcePath,source.range.start.line,source.range.start.column,source.range.end.line,source.range.end.column,source.rangeConvention.endBoundary,source.rangeConvention.columnUnit]);
    }
    // <lang><zh-CN>克隆/冻结等事件不会改变最终值来源，必须单独核全部操作位置及次数，防止一致JSON掩盖伪造变换。</zh-CN><en>Clone/freeze events do not change final value origins, so verify all operation positions and counts separately to prevent equal JSON from concealing forged transformations.</en></lang>
    phase = "operation-sources";
    for (const kind of ["clone","freeze","bind","literal"]) {
      const recorded = replay.initialization.steps.filter(step=>step.kind===kind).map(step=>sourceKey(step.source,byResource.get(step.source.resourceId))).sort();
      const inferred = independent.events.filter(event=>kind==="literal" ? event.kind==="allocate" && ["string","number","boolean","null"].includes(event.type) : event.kind===kind).map(event=>sourceKey(event.origin)).sort();
      if (!isDeepStrictEqual(recorded,inferred)) throw new Error();
    }
    const staticSpreads = independent.events.filter(event=>event.kind==="spread");
    const recordedSpreads = replay.initialization.steps.filter(step=>step.kind==="spread").map(step=>{
      if (!independent.events.some(event=>event.kind==="allocate" && event.type==="object" && sameSource(step.source,event.origin))) throw new Error();
      const range = step.source.range;
      // <lang><zh-CN>首位spread在同一对象内最先起始，嵌套spread另有自己的对象范围。</zh-CN><en>The leading spread starts first within its object; nested spreads have their own object ranges.</en></lang>
      const matches = staticSpreads.filter(event=>event.origin.path===byResource.get(step.source.resourceId)
        && (event.origin.range.start.line>range.start.line || event.origin.range.start.line===range.start.line && event.origin.range.start.column>=range.start.column)
        && (event.origin.range.end.line<range.end.line || event.origin.range.end.line===range.end.line && event.origin.range.end.column<=range.end.column))
        .sort((left,right)=>left.origin.range.start.line-right.origin.range.start.line || left.origin.range.start.column-right.origin.range.start.column);
      if (!matches.length) throw new Error();
      return sourceKey(matches[0].origin);
    }).sort();
    if (!isDeepStrictEqual(recordedSpreads,staticSpreads.map(event=>sourceKey(event.origin)).sort())) throw new Error();
    phase = "sources";
    for (const row of replay.valueLinks) {
      const inferred = byPointer.get(row.pointer);
      if (!inferred || row.type !== inferred.type || !sameSource(row.valueSource,inferred.origin)) throw new Error();
      const parentPointer = row.pointer.slice(0,row.pointer.lastIndexOf("/"));
      const parent = row.pointer ? byPointer.get(parentPointer) : undefined;
      // <lang><zh-CN>草案数组槽声明使用数组创建范围，逐元素原值来源仍独立精确比较。</zh-CN><en>Draft array-slot declarations use array-creation ranges; each element's original value source is still compared exactly.</en></lang>
      const declaration = parent?.type === "array" ? parent.origin : inferred.declaration;
      if (!sameSource(row.source,declaration)) throw new Error();
      const history = inferred.valueDeclarationSources.filter(source=>source.kind!=="VariableDeclaration");
      if (row.previousSources.length !== history.length || row.previousSources.some((source,index)=>!sameSource(source,history[index]))) throw new Error();
      if (row.type === "object" || row.type === "array") {
        // <lang><zh-CN>双向映射同时防止错误合并和错误拆分共享容器。</zh-CN><en>The bidirectional map detects both erroneous merging and erroneous splitting of shared containers.</en></lang>
        if (nativeToStatic.has(row.nodeId) && nativeToStatic.get(row.nodeId) !== inferred.graphNodeId || staticToNative.has(inferred.graphNodeId) && staticToNative.get(inferred.graphNodeId) !== row.nodeId) throw new Error();
        nativeToStatic.set(row.nodeId,inferred.graphNodeId);
        staticToNative.set(inferred.graphNodeId,row.nodeId);
      }
    }
    return {status:"verified",coverage:"selected-export-json-tree",values:replay.valueLinks.length,sourceFiles:sources.length,resourceBytes:true,traceSemantics:true,operationSources:true,finalValue:true,selectedValueSources:true,selectedPropertySources:true,selectedFieldHistory:true,sharedContainers:true,wrapperRuntime:false,producerAuthenticity:false};
  } catch { return {status:"rejected",reason:phase}; }
}
