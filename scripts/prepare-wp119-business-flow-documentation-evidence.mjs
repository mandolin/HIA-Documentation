import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUSINESS_FLOW_DOCUMENTATION_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES,
  BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA,
  produceBusinessFlowDocumentation,
  validateBusinessFlowDocumentation
} from "../packages/core/dist/index.js";
import { getHiaSchema, HIA_SCHEMA_KEYS } from "../packages/schemas/dist/index.js";

/**
 * @lang zh-CN
 * 生成 W-P119 的 count-only、public-safe evidence；脚本只读取 HIA-owned synthetic fixture 和已构建 package metadata。
 *
 * @lang en
 * Generates count-only, public-safe W-P119 evidence; the script reads only an HIA-owned synthetic fixture and built package metadata.
 */

// <lang><zh-CN>仓库根由脚本 URL 确定，不依赖 cwd 或目标项目路径。</zh-CN><en>The repository root derives from the script URL, not cwd or a target-project path.</en></lang>
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>输入是提交的 synthetic contract fixture，不读取 WorkZone 或目标仓库。</zh-CN><en>The input is a committed synthetic contract fixture; neither WorkZone nor target repositories are read.</en></lang>
const fixturePath = path.join(rootDir, "packages/core/src/fixtures/business-flow-documentation.synthetic.json");
// <lang><zh-CN>输出只进入 ignored dist evidence 目录。</zh-CN><en>Output is limited to the ignored dist evidence directory.</en></lang>
const outputDir = path.join(rootDir, "dist/wp119-business-flow-documentation");
const outputPath = path.join(outputDir, "evidence.json");

// <lang><zh-CN>解析已提交 fixture；它不含源码正文、物理路径或真实目标身份。</zh-CN><en>Parse the committed fixture; it contains no source body, physical path, or real target identity.</en></lang>
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
// <lang><zh-CN>调用方 registry 只复用 fixture 已声明的 logical metadata ids。</zh-CN><en>The caller registry reuses only logical metadata ids already declared by the fixture.</en></lang>
const availableCodeTargetIds = fixture.codeBindings.map(({ targetId }) => targetId);
// <lang><zh-CN>基础 validator 必须接受冻结场景。</zh-CN><en>The baseline validator must accept the frozen scenario.</en></lang>
const baselineDiagnostics = validateBusinessFlowDocumentation(fixture);
assert(baselineDiagnostics.length === 0, `Synthetic fixture validation failed: ${JSON.stringify(baselineDiagnostics)}`);

// <lang><zh-CN>Pure producer 只解析显式 registry 并返回 frozen canonical data。</zh-CN><en>The pure producer resolves only the explicit registry and returns frozen canonical data.</en></lang>
const produced = produceBusinessFlowDocumentation(fixture, { availableCodeTargetIds });
assert(produced.status === "ready" && produced.canonical && produced.canonicalJson && produced.summary, "Synthetic fixture production was refused.");
assert(Object.isFrozen(produced) && Object.isFrozen(produced.canonical) && Object.isFrozen(produced.canonical.relations), "Producer result is not deeply frozen.");

// <lang><zh-CN>反转每个非语义集合，证明 array position 不会改变 canonical bytes。</zh-CN><en>Reverse each non-semantic collection to prove array position cannot change canonical bytes.</en></lang>
const shuffled = structuredClone(fixture);
for (const collection of ["flows", "nodes", "relations", "evidence", "codeBindings"]) shuffled[collection].reverse();
for (const flow of shuffled.flows) flow.endNodeIds.reverse();
const shuffledResult = produceBusinessFlowDocumentation(shuffled, { availableCodeTargetIds });
assert(shuffledResult.status === "ready" && shuffledResult.canonicalJson === produced.canonicalJson, "Canonical JSON drifted with input array order.");

// <lang><zh-CN>十四个独立负例保持 W-P114 diagnostic vocabulary 全覆盖。</zh-CN><en>Fourteen independent negative cases retain full W-P114 diagnostic-vocabulary coverage.</en></lang>
const negativeCases = createNegativeCases(fixture, availableCodeTargetIds);
const coveredCodes = BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES.filter((code) => negativeCases.some(({ codes }) => codes.includes(code)));
assert(JSON.stringify(coveredCodes) === JSON.stringify(BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES), `Diagnostic coverage drifted: ${JSON.stringify(coveredCodes)}`);

// <lang><zh-CN>分发 snapshot 必须与 core owner schema 字节语义一致。</zh-CN><en>The distributed snapshot must be semantically identical to the core owner schema.</en></lang>
const distributedSchema = getHiaSchema("business-flow-documentation");
assert(JSON.stringify(distributedSchema) === JSON.stringify(BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA), "Distributed business-flow schema drifted from its owner.");

// <lang><zh-CN>Evidence 只记录摘要、hash、闭集计数和 all-false 权限边界。</zh-CN><en>Evidence records only summary, hash, closed-set counts, and all-false permission boundaries.</en></lang>
const report = {
  contract: "wp119-business-flow-documentation-evidence",
  contractVersion: "0.1.0-draft",
  status: "ready-for-wp120-independent-closeout",
  snapshotDate: "2026-08-20",
  implementation: {
    contract: BUSINESS_FLOW_DOCUMENTATION_CONTRACT,
    contractVersion: BUSINESS_FLOW_DOCUMENTATION_CONTRACT_VERSION,
    schemaId: BUSINESS_FLOW_DOCUMENTATION_JSON_SCHEMA.$id,
    distributedSchemaCount: HIA_SCHEMA_KEYS.length,
    diagnosticCodeCount: BUSINESS_FLOW_DOCUMENTATION_DIAGNOSTIC_CODES.length,
    diagnosticCoverageCount: coveredCodes.length
  },
  syntheticFixture: {
    synthetic: true,
    targetDerived: false,
    canonicalSha256: createHash("sha256").update(produced.canonicalJson).digest("hex"),
    deterministicAcrossArrayOrder: true,
    deeplyFrozen: true,
    summary: produced.summary
  },
  privacy: {
    sourceBodyIncluded: false,
    sourceRangeIncluded: false,
    absolutePathIncluded: false,
    runtimePayloadIncluded: false,
    personalIdentityIncluded: false,
    credentialIncluded: false,
    targetIdentityIncluded: false
  },
  permissions: {
    targetRepositoryRead: false,
    targetRepositoryRun: false,
    targetRepositoryWrite: false,
    bpRepositoryModified: false,
    rendererModified: false,
    portalModified: false,
    sourceLinkageContractModified: false,
    projectRelationContractModified: false,
    expressionExecuted: false,
    sourceParsed: false,
    networkAccess: false,
    packagePublish: false,
    humanProjectionImplemented: false,
    aiGraphProjectionImplemented: false,
    wP120Started: false
  }
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`W-P119 business-flow evidence ready: ${produced.summary.flows} flow, ${produced.summary.controlNodes} control nodes, ${produced.summary.controlRelations}/${produced.summary.responsibilityRelations}/${produced.summary.dataRelations} relations, ${coveredCodes.length} diagnostics, ${HIA_SCHEMA_KEYS.length} schemas.`);

/**
 * @lang zh-CN
 * 构造每个 stable diagnostic 的最小 negative case；所有变更只发生在内存副本。
 *
 * @lang en
 * Builds a minimal negative case for every stable diagnostic; every mutation is confined to an in-memory copy.
 *
 * @param {Record<string, unknown>} baseline <lang><zh-CN>有效 synthetic baseline。</zh-CN><en>Valid synthetic baseline.</en></lang>
 * @param {string[]} targets <lang><zh-CN>有效 code-target registry。</zh-CN><en>Valid code-target registry.</en></lang>
 * @returns {{ id: string, codes: string[] }[]} 负例与实际 code 集。 / Negative cases and their observed code sets.
 */
function createNegativeCases(baseline, targets) {
  // <lang><zh-CN>每个 mutate callback 只负责一个主导失败；级联 diagnostic 不影响闭集覆盖。</zh-CN><en>Each mutate callback owns one dominant failure; cascading diagnostics do not affect closed-set coverage.</en></lang>
  const cases = [
    ["invalid-contract", (value) => { value.extensionField = true; }],
    ["duplicate-id", (value) => { value.nodes.push(structuredClone(value.nodes[0])); }],
    ["unknown-reference", (value) => { value.relations[0].to = "step.missing"; }],
    ["invalid-entry", (value) => { value.flows[0].entryNodeId = "step.validate-request"; }],
    ["unreachable", (value) => { value.relations = value.relations.filter(({ id }) => id !== "control.02-validate-to-validity"); }],
    ["cycle", (value) => {
      value.relations.push({
        authorship: "author-provided",
        caseKey: "retry",
        family: "control",
        flowId: value.flows[0].id,
        from: "step.notify-success",
        id: "control.17-success-cycle",
        kind: "exception",
        order: 1,
        quality: structuredClone(value.relations[0].quality),
        to: "step.validate-request"
      });
    }],
    ["branch", (value) => { value.relations = value.relations.filter(({ id }) => id !== "control.04-invalid-to-rejection-merge"); }],
    ["merge", (value) => { value.nodes.find(({ kind }) => kind === "merge").kind = "step"; }],
    ["exception", (value) => { delete value.relations.find(({ kind }) => kind === "exception").caseKey; }],
    ["authorship", (value) => { value.nodes[0].authorship = "producer-resolved"; }],
    ["quality", (value) => { value.relations[0].quality.confidence = "certain"; }],
    ["privacy", (value) => { value.privacy.sourceBodyIncluded = true; }],
    ["compatibility", (value) => { value.contractVersion = "0.2.0-draft"; }]
  ];
  const results = cases.map(([id, mutate]) => {
    const candidate = structuredClone(baseline);
    mutate(candidate);
    return { id, codes: validateBusinessFlowDocumentation(candidate).map(({ code }) => code) };
  });
  const bindingResult = produceBusinessFlowDocumentation(structuredClone(baseline), { availableCodeTargetIds: [] });
  results.push({ id: "binding-resolution", codes: bindingResult.diagnostics.map(({ code }) => code) });
  assert(targets.length === baseline.codeBindings.length, "Valid target registry drifted from fixture bindings.");
  return results;
}

/**
 * @lang zh-CN
 * 断言 evidence gate；失败时立即终止，不写 ready report。
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
