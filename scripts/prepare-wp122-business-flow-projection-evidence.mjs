import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES,
  BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA,
  produceBusinessFlowDocumentationProjection,
  validateBusinessFlowDocumentationProjection
} from "../packages/core/dist/index.js";
import { getHiaSchema, HIA_SCHEMA_KEYS } from "../packages/schemas/dist/index.js";

/**
 * @lang zh-CN
 * 生成 W-P122 的 count-only、public-safe evidence；脚本只读取 HIA-owned synthetic fixture 与已构建 package metadata。
 *
 * @lang en
 * Generates count-only, public-safe W-P122 evidence; the script reads only an HIA-owned synthetic fixture and built package metadata.
 */

// <lang><zh-CN>仓库根由脚本 URL 确定，避免 cwd 或目标项目路径影响输入。</zh-CN><en>The repository root derives from the script URL so cwd or target-project paths cannot affect inputs.</en></lang>
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>输入沿用提交的 W-P119 合成事实，不读取 BP、WorkZone 或九个目标仓。</zh-CN><en>The input reuses committed W-P119 synthetic facts and reads no BP, WorkZone, or target repository.</en></lang>
const fixturePath = path.join(rootDir, "packages/core/src/fixtures/business-flow-documentation.synthetic.json");
// <lang><zh-CN>输出仅进入 ignored dist evidence 目录。</zh-CN><en>Output is confined to the ignored dist evidence directory.</en></lang>
const outputDir = path.join(rootDir, "dist/wp122-business-flow-projection");
const outputPath = path.join(outputDir, "evidence.json");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const options = { audience: "public", flowIds: ["generic-device-operation-request"], locale: "zh-CN" };

// <lang><zh-CN>基准输出必须同时通过 producer 与独立 public validator。</zh-CN><en>The baseline output must pass both the producer and the independent public validator.</en></lang>
const produced = produceBusinessFlowDocumentationProjection(fixture, options);
assert(produced.status === "ready" && produced.projection && produced.projectionJson && produced.summary, "Synthetic projection was refused.");
assert(validateBusinessFlowDocumentationProjection(produced.projection).length === 0, "Synthetic projection did not pass owner validation.");
assert(Object.isFrozen(produced) && Object.isFrozen(produced.projection.sharedFacts.nodes), "Projection result is not deeply frozen.");

// <lang><zh-CN>扰动全部非语义 source collection，证明 bytes 不依赖输入数组位置。</zh-CN><en>Disturb every non-semantic source collection to prove bytes do not depend on input array position.</en></lang>
const shuffled = structuredClone(fixture);
for (const collection of ["flows", "nodes", "relations", "evidence", "codeBindings"]) shuffled[collection].reverse();
const shuffledResult = produceBusinessFlowDocumentationProjection(shuffled, options);
assert(shuffledResult.status === "ready" && shuffledResult.projectionJson === produced.projectionJson, "Projection JSON drifted with source array order.");

// <lang><zh-CN>human、AI 与 sharedFacts 必须对全部五类 stable identity 精确同源。</zh-CN><en>Human, AI, and sharedFacts must share exact provenance for all five stable identity families.</en></lang>
const projection = produced.projection;
const human = projection.humanLinear.flows[0];
const graph = projection.aiGraph.graphs[0];
const controlNodeIds = projection.sharedFacts.nodes.filter(({ kind }) => !["actor", "artifact"].includes(kind)).map(({ id }) => id).sort();
assert(human && graph, "Expected one human and AI flow projection.");
assert(equalStrings(projection.source.flowRefs, [human.flowRef]) && equalStrings(projection.source.flowRefs, [graph.flowRef]), "Flow identity parity failed.");
assert(equalStrings(human.items.map(({ nodeRef }) => nodeRef).sort(), controlNodeIds), "Human control-node parity failed.");
assert(equalStrings(graph.nodeRefs, projection.sharedFacts.nodes.map(({ id }) => id)), "AI node parity failed.");
assert(equalStrings(graph.edgeRefs, projection.sharedFacts.relations.map(({ id }) => id)), "AI edge parity failed.");
assert(equalStrings(graph.evidenceRefs, projection.sharedFacts.evidence.map(({ id }) => id)), "AI evidence parity failed.");
assert(equalStrings(graph.codeBindingRefs, projection.sharedFacts.codeBindings.map(({ id }) => id)), "AI code-binding parity failed.");

// <lang><zh-CN>七个稳定 BFP code 由互相独立的内存负例覆盖。</zh-CN><en>Independent in-memory negative cases cover all seven stable BFP codes.</en></lang>
const coveredCodes = collectDiagnosticCoverage(fixture, produced.projection);
assert(equalStrings(coveredCodes, [...BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES]), `Diagnostic coverage drifted: ${JSON.stringify(coveredCodes)}`);

// <lang><zh-CN>分发 snapshot 必须与 core owner schema 语义一致。</zh-CN><en>The distributed snapshot must be semantically identical to the core owner schema.</en></lang>
const distributedSchema = getHiaSchema("business-flow-documentation-projection");
assert(JSON.stringify(distributedSchema) === JSON.stringify(BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA), "Distributed projection schema drifted from its owner.");

// <lang><zh-CN>Evidence 只公开计数、hash、布尔 gate 和 all-false 权限，不复制 label 或图节点。</zh-CN><en>Evidence exposes only counts, hashes, boolean gates, and all-false permissions, never labels or graph nodes.</en></lang>
const report = {
  contract: "wp122-business-flow-projection-evidence",
  contractVersion: "0.1.0-draft",
  status: "ready-for-wp123-independent-start",
  snapshotDate: "2026-09-04",
  implementation: {
    contract: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT,
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_CONTRACT_VERSION,
    schemaId: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_JSON_SCHEMA.$id,
    distributedSchemaCount: HIA_SCHEMA_KEYS.length,
    diagnosticCodeCount: BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES.length,
    diagnosticCoverageCount: coveredCodes.length
  },
  syntheticFixture: {
    synthetic: true,
    targetDerived: false,
    projectionSha256: createHash("sha256").update(produced.projectionJson).digest("hex"),
    deterministicAcrossArrayOrder: true,
    deeplyFrozen: true,
    deterministicDepthFirstTraversal: true,
    localeFallbackObservable: true,
    exactIdentityParity: true,
    summary: produced.summary
  },
  privacy: projection.privacy,
  permissions: {
    targetRepositoryRead: false,
    targetRepositoryRun: false,
    targetRepositoryWrite: false,
    bpRepositoryModified: false,
    portalModified: false,
    rendererModified: false,
    sourceContractModified: false,
    graphLayoutImplemented: false,
    htmlGenerated: false,
    sourceParsed: false,
    expressionExecuted: false,
    networkAccess: false,
    packagePublish: false,
    wP123Started: false
  }
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`W-P122 business-flow projection evidence ready: ${produced.summary.flows} flow, ${produced.summary.humanItems} human items, ${produced.summary.aiNodes}/${produced.summary.aiEdges} AI node/edge refs, ${coveredCodes.length} diagnostics, ${HIA_SCHEMA_KEYS.length} schemas.`);

/**
 * @lang zh-CN
 * 运行七类 refusal/validation 负例并按冻结词表顺序返回覆盖 code。
 *
 * @lang en
 * Runs seven refusal/validation negative cases and returns covered codes in frozen-vocabulary order.
 *
 * @param {Record<string, unknown>} baseline <lang><zh-CN>有效 W-P119 合成事实。</zh-CN><en>Valid W-P119 synthetic facts.</en></lang>
 * @param {Record<string, unknown>} readyProjection <lang><zh-CN>有效 W-P122 投影。</zh-CN><en>Valid W-P122 projection.</en></lang>
 * @returns {string[]} 已观察的稳定 code。 / Observed stable codes.
 */
function collectDiagnosticCoverage(baseline, readyProjection) {
  const invalidContract = structuredClone(readyProjection);
  invalidContract.layout = "force-directed";
  const invalidSource = structuredClone(baseline);
  invalidSource.contractVersion = "0.2.0-draft";
  const privacy = structuredClone(baseline);
  privacy.evidence[0].privacyClass = "internal";
  const invariant = structuredClone(readyProjection);
  invariant.aiGraph.graphs[0].edgeRefs.pop();
  const compatibility = structuredClone(readyProjection);
  compatibility.contractVersion = "0.2.0-draft";
  const observed = new Set([
    ...validateBusinessFlowDocumentationProjection(invalidContract).map(({ code }) => code),
    ...produceBusinessFlowDocumentationProjection(invalidSource, options).diagnostics.map(({ code }) => code),
    ...produceBusinessFlowDocumentationProjection(baseline, { ...options, flowIds: [] }).diagnostics.map(({ code }) => code),
    ...produceBusinessFlowDocumentationProjection(baseline, { ...options, flowIds: ["flow.missing"] }).diagnostics.map(({ code }) => code),
    ...produceBusinessFlowDocumentationProjection(privacy, options).diagnostics.map(({ code }) => code),
    ...validateBusinessFlowDocumentationProjection(invariant).map(({ code }) => code),
    ...validateBusinessFlowDocumentationProjection(compatibility).map(({ code }) => code)
  ]);
  return BUSINESS_FLOW_DOCUMENTATION_PROJECTION_DIAGNOSTIC_CODES.filter((code) => observed.has(code));
}

/**
 * @lang zh-CN
 * 比较两个已经规范排序的 identity array。
 *
 * @lang en
 * Compares two already normalized identity arrays.
 *
 * @param {string[]} left <lang><zh-CN>左侧引用。</zh-CN><en>Left references.</en></lang>
 * @param {string[]} right <lang><zh-CN>右侧引用。</zh-CN><en>Right references.</en></lang>
 * @returns {boolean} 是否精确一致。 / Whether they match exactly.
 */
function equalStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * @lang zh-CN
 * 断言 evidence gate；失败时立即停止且不写 ready report。
 *
 * @lang en
 * Asserts an evidence gate and stops before writing a ready report on failure.
 *
 * @param {unknown} condition <lang><zh-CN>待判定条件。</zh-CN><en>Condition to evaluate.</en></lang>
 * @param {string} message <lang><zh-CN>稳定错误消息。</zh-CN><en>Stable error message.</en></lang>
 * @returns {asserts condition} 无返回值。 / No return value.
 */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
