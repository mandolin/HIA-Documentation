import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  produceBusinessFlowDocumentationProjection,
  validateBusinessFlowDocumentationProjection
} from "../packages/core/dist/index.js";
import {
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT,
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION,
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES,
  BUSINESS_FLOW_DOCUMENTATION_HANDOFF_JSON_SCHEMA,
  createBusinessFlowDocumentationHandoff,
  validateBusinessFlowDocumentationHandoff
} from "../apps/cli/dist/index.js";
import { renderProjectHtmlDocument } from "../packages/renderer-html/dist/index.js";
import { HIA_SCHEMA_KEYS } from "../packages/schemas/dist/index.js";

/**
 * @lang zh-CN
 * 生成 W-P124 count/hash-only、public-safe evidence；输入只来自 HIA-owned synthetic fixture 与已构建 package API。
 *
 * @lang en
 * Generates count/hash-only, public-safe W-P124 evidence; inputs come only from an HIA-owned synthetic fixture and built package APIs.
 */

// <lang><zh-CN>脚本 URL 固定 repository root，避免 caller cwd 或外部项目路径成为隐式输入。</zh-CN><en>The script URL fixes the repository root so caller cwd or external-project paths cannot become implicit inputs.</en></lang>
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>沿用已提交 W-P119 fixture，不读取 BP、WorkZone 或目标仓。</zh-CN><en>Reuse the committed W-P119 fixture and read no BP, WorkZone, or target repository.</en></lang>
const fixturePath = path.join(rootDir, "packages/core/src/fixtures/business-flow-documentation.synthetic.json");
// <lang><zh-CN>机器 evidence 只写入 ignored dist 子目录。</zh-CN><en>Machine evidence is written only to an ignored dist subdirectory.</en></lang>
const outputDir = path.join(rootDir, "dist/wp124-business-flow-consumer-handoff");
const outputPath = path.join(outputDir, "evidence.json");
// <lang><zh-CN>fixture 在进入 W-P119/W-P122 producer 前保持 unknown JSON data。</zh-CN><en>The fixture remains unknown JSON data before entering the W-P119/W-P122 producer.</en></lang>
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
// <lang><zh-CN>projection options 明示 public audience、唯一 flow 与内容 locale。</zh-CN><en>Projection options explicitly select the public audience, one flow, and the content locale.</en></lang>
const projectionOptions = {
  audience: "public",
  flowIds: ["generic-device-operation-request"],
  locale: "zh-CN"
};

// <lang><zh-CN>基准链必须先产生 exact W-P122 projection，再产生 ready-for-owner-review handoff。</zh-CN><en>The baseline chain must produce an exact W-P122 projection before producing a ready-for-owner-review handoff.</en></lang>
const produced = produceBusinessFlowDocumentationProjection(fixture, projectionOptions);
assert(produced.status === "ready" && produced.projection, "Synthetic W-P122 projection was refused.");
assert(validateBusinessFlowDocumentationProjection(produced.projection).length === 0, "Synthetic W-P122 projection failed owner validation.");
// <lang><zh-CN>ready handoff 是本脚本后续 digest、schema、Portal 与 refusal gate 的唯一 baseline。</zh-CN><en>The ready handoff is the sole baseline for subsequent digest, schema, Portal, and refusal gates.</en></lang>
const handoff = createBusinessFlowDocumentationHandoff(produced.projection);
assert(handoff.status === "ready-for-owner-review" && handoff.artifact && handoff.projection && handoff.summary, "Synthetic handoff was refused.");
assert(validateBusinessFlowDocumentationHandoff(handoff).length === 0, "Synthetic handoff failed exact owner validation.");
assert(Object.isFrozen(handoff) && Object.isFrozen(handoff.projection.sharedFacts.nodes), "Handoff was not deeply frozen.");

// <lang><zh-CN>递归反转 object key insertion order，证明 digest 不依赖 JSON object 的到达顺序。</zh-CN><en>Recursively reverse object-key insertion order to prove the digest is independent of JSON-object arrival order.</en></lang>
const reorderedProjection = reverseObjectKeys(handoff.projection);
const reorderedHandoff = createBusinessFlowDocumentationHandoff(reorderedProjection);
assert(reorderedHandoff.status === "ready-for-owner-review" && reorderedHandoff.artifact, "Reordered projection handoff was refused.");
assert(reorderedHandoff.artifact.digest.value === handoff.artifact.digest.value, "Handoff digest drifted with object-key order.");
assert(reorderedHandoff.artifact.byteLength === handoff.artifact.byteLength, "Handoff byte length drifted with object-key order.");

// <lang><zh-CN>六个固定 HIA_BUSINESS_FLOW_HANDOFF code 必须由互相独立的内存负例覆盖。</zh-CN><en>Independent in-memory negative cases must cover all six fixed HIA_BUSINESS_FLOW_HANDOFF codes.</en></lang>
const coveredCodes = collectDiagnosticCoverage(handoff);
assert(equalStrings(coveredCodes, [...BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES]), `Diagnostic coverage drifted: ${JSON.stringify(coveredCodes)}`);

// <lang><zh-CN>owner-local schema 必须引用 W-P122 schema，且不能悄悄成为第 18 个分发 snapshot。</zh-CN><en>The owner-local schema must reference the W-P122 schema and must not silently become an eighteenth distributed snapshot.</en></lang>
const projectionSchemaReference = BUSINESS_FLOW_DOCUMENTATION_HANDOFF_JSON_SCHEMA.properties.projection.$ref;
assert(projectionSchemaReference === "https://mandolin.github.io/HIA-Documentation/schemas/business-flow-documentation-projection-0.1.0-draft.schema.json", "Handoff projection schema reference drifted.");
assert(HIA_SCHEMA_KEYS.length === 17 && !HIA_SCHEMA_KEYS.includes("business-flow-documentation-handoff"), "Owner-local handoff schema leaked into public schema distribution.");

// <lang><zh-CN>renderer 在 explicit IA 下只拥有 public projection；handoff review/digest envelope 停留在 CLI boundary。</zh-CN><en>Under explicit IA, the renderer owns only the public projection; the handoff review/digest envelope stays at the CLI boundary.</en></lang>
const rendered = renderProjectHtmlDocument({
  project: {
    name: "Synthetic Business Flow Consumer",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"]
  },
  entries: [{ id: "business-flow:entry", name: "Business Flow", kind: "module", view: "js" }],
  businessFlowDocumentationProjection: handoff.projection
}, {
  projectSite: {
    informationArchitecture: {},
    source: { presentation: "none" }
  }
});
// <lang><zh-CN>project-index 持有完整双视图，是后续经设计确认 consumer 的数据入口。</zh-CN><en>The project index holds the full dual view and is the data entry for a later design-confirmed consumer.</en></lang>
const projectIndexFile = rendered.files.find(({ path: filePath }) => filePath === "project-index.json");
assert(projectIndexFile, "Renderer did not emit project-index.json.");
const projectIndex = JSON.parse(projectIndexFile.contents);
assert(JSON.stringify(projectIndex.businessFlowDocumentationProjection) === JSON.stringify(handoff.projection), "Portal project index changed projection facts.");
assert(!Object.hasOwn(projectIndex, "review") && !JSON.stringify(projectIndex).includes(BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT), "CLI handoff envelope crossed into the Portal project index.");
// <lang><zh-CN>manifest 只能保留 identity/path/count，不能复制 human/AI body。</zh-CN><en>The manifest may retain only identity, path, and counts, never the human/AI body.</en></lang>
const manifestProjection = rendered.manifest.project?.businessFlowDocumentationProjection;
assert(manifestProjection?.flowCount === handoff.summary.flows, "Portal manifest flow count drifted.");
assert(manifestProjection?.humanItemCount === handoff.summary.humanItems, "Portal manifest human-item count drifted.");
assert(manifestProjection?.nodeCount === handoff.summary.aiNodes, "Portal manifest node count drifted.");
assert(manifestProjection?.relationCount === handoff.summary.aiEdges, "Portal manifest relation count drifted.");
assert(!JSON.stringify(manifestProjection).includes("humanLinear") && !JSON.stringify(manifestProjection).includes("aiGraph"), "Portal manifest serialized projection bodies.");
// <lang><zh-CN>现有 topic HTML 不得出现 flow label，防止在无 confirmed unified Portal baseline 时越界形成可见 UI。</zh-CN><en>Existing topic HTML must not contain a flow label, preventing visible-UI work without a confirmed unified Portal baseline.</en></lang>
const topicHtml = rendered.files.find(({ path: filePath }) => filePath.startsWith("entries/"))?.contents ?? "";
assert(!topicHtml.includes("接收设备操作请求"), "W-P124 rendered an unapproved visible business-flow UI.");

// <lang><zh-CN>Evidence 仅序列化 contract identity、计数、hash 与布尔边界，不复制 graph、label、路径或 handoff payload。</zh-CN><en>Evidence serializes only contract identity, counts, hashes, and boolean boundaries, never graphs, labels, paths, or handoff payloads.</en></lang>
const report = {
  contract: "wp124-business-flow-consumer-handoff-evidence",
  contractVersion: "0.1.0-draft",
  status: "ready-for-wp124-closeout",
  snapshotDate: "2026-09-06",
  implementation: {
    handoffContract: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT,
    handoffContractVersion: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_CONTRACT_VERSION,
    handoffSchemaId: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_JSON_SCHEMA.$id,
    projectionSchemaReference,
    distributedSchemaCount: HIA_SCHEMA_KEYS.length,
    diagnosticCodeCount: BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES.length,
    diagnosticCoverageCount: coveredCodes.length
  },
  syntheticFixture: {
    synthetic: true,
    targetDerived: false,
    projectionDigestSha256: handoff.artifact.digest.value,
    projectionByteLength: handoff.artifact.byteLength,
    deterministicAcrossObjectKeyOrder: true,
    deeplyFrozen: true,
    exactProjectionPreservedInProjectIndex: true,
    bodyFreeManifestReference: true,
    ownerReviewStillRequired: true,
    summary: handoff.summary
  },
  privacy: handoff.privacy,
  permissions: {
    targetRepositoryRead: false,
    targetRepositoryRun: false,
    targetRepositoryWrite: false,
    bpRepositoryModified: false,
    portalVisibleUiModified: false,
    sourceBodyRead: false,
    sourceRangeSerialized: false,
    privatePathSerialized: false,
    targetIdentitySerialized: false,
    ownerInputRecorded: false,
    ownerConsentRecorded: false,
    ownerAdoptionClaimed: false,
    networkAccess: false,
    packageVersionChanged: false,
    dependencyChanged: false,
    packagePublish: false,
    wP125Started: false
  }
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`W-P124 business-flow consumer/handoff evidence ready: ${handoff.summary.flows} flow, ${handoff.summary.humanItems} human items, ${handoff.summary.aiNodes}/${handoff.summary.aiEdges} nodes/relations, ${coveredCodes.length} diagnostics, ${HIA_SCHEMA_KEYS.length} distributed schemas.`);

/**
 * @lang zh-CN
 * 构造六类独立 tamper/refusal case，并按冻结 diagnostic catalog 返回已覆盖 code。
 *
 * @lang en
 * Builds six independent tamper/refusal cases and returns covered codes in frozen diagnostic-catalog order.
 *
 * @param {Record<string, unknown>} readyHandoff <lang><zh-CN>exact-valid ready baseline。</zh-CN><en>Exact-valid ready baseline.</en></lang>
 * @returns {string[]} 已观察的固定 diagnostic code。 / Observed fixed diagnostic codes.
 */
function collectDiagnosticCoverage(readyHandoff) {
  // <lang><zh-CN>未知顶层字段覆盖 closed-world contract refusal。</zh-CN><en>An unknown top-level field covers closed-world contract refusal.</en></lang>
  const invalidContract = cloneJson(readyHandoff);
  invalidContract.futureField = false;
  // <lang><zh-CN>未知 projection 字段由 W-P122 owner validator 拒绝。</zh-CN><en>An unknown projection field is refused by the W-P122 owner validator.</en></lang>
  const invalidProjection = cloneJson(readyHandoff.projection);
  invalidProjection.futureLayout = "target-private";
  const projectionRefusal = createBusinessFlowDocumentationHandoff(invalidProjection);
  // <lang><zh-CN>digest tamper 覆盖 embedded artifact integrity。</zh-CN><en>A digest tamper covers embedded-artifact integrity.</en></lang>
  const integrity = cloneJson(readyHandoff);
  integrity.artifact.digest.value = "0".repeat(64);
  // <lang><zh-CN>privacy declaration 不能被 producer/consumer 提升为 true。</zh-CN><en>No producer or consumer may elevate a privacy declaration to true.</en></lang>
  const privacy = cloneJson(readyHandoff);
  privacy.privacy.sourceBodySerialized = true;
  // <lang><zh-CN>permission declaration 同样保持 deny-all。</zh-CN><en>Permission declarations likewise remain deny-all.</en></lang>
  const permission = cloneJson(readyHandoff);
  permission.permissions.targetRepositoryRead = true;
  // <lang><zh-CN>draft version 与 compatibility policy 都采用 exact match。</zh-CN><en>Both the draft version and compatibility policy use exact matching.</en></lang>
  const compatibility = cloneJson(readyHandoff);
  compatibility.contractVersion = "0.2.0-draft";

  // <lang><zh-CN>observed set 合并 producer refusal 与 runtime-validator diagnostics，不保存不可信 payload。</zh-CN><en>The observed set combines producer refusal and runtime-validator diagnostics without retaining untrusted payloads.</en></lang>
  const observed = new Set([
    ...validateBusinessFlowDocumentationHandoff(invalidContract).map(({ code }) => code),
    ...projectionRefusal.diagnostics.map(({ code }) => code),
    ...validateBusinessFlowDocumentationHandoff(integrity).map(({ code }) => code),
    ...validateBusinessFlowDocumentationHandoff(privacy).map(({ code }) => code),
    ...validateBusinessFlowDocumentationHandoff(permission).map(({ code }) => code),
    ...validateBusinessFlowDocumentationHandoff(compatibility).map(({ code }) => code)
  ]);
  return BUSINESS_FLOW_DOCUMENTATION_HANDOFF_DIAGNOSTIC_CODES.filter((code) => observed.has(code));
}

/**
 * @lang zh-CN 递归反转 object key insertion order，同时保持 array 的语义次序。
 * @lang en Recursively reverses object-key insertion order while preserving semantic array order.
 * @param {unknown} value <lang><zh-CN>JSON-compatible 输入。</zh-CN><en>JSON-compatible input.</en></lang>
 * @returns {unknown} key order 扰动后的 detached value。 / Detached value with disturbed key order.
 */
function reverseObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (!value || typeof value !== "object") return value;
  // <lang><zh-CN>reverse 只改变 insertion order，不改变 key/value 语义。</zh-CN><en>Reverse changes insertion order only, not key/value semantics.</en></lang>
  const keys = Object.keys(value).reverse();
  return Object.fromEntries(keys.map((key) => [key, reverseObjectKeys(value[key])]));
}

/**
 * @lang zh-CN 创建 JSON-compatible detached clone，供每个 tamper case 独立修改。
 * @lang en Creates a JSON-compatible detached clone for independent mutation by each tamper case.
 * @param {unknown} value <lang><zh-CN>源值。</zh-CN><en>Source value.</en></lang>
 * @returns {any} detached JSON value。 / Detached JSON value.
 */
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @lang zh-CN 比较两个按冻结 catalog 排序的 code array。
 * @lang en Compares two code arrays ordered by the frozen catalog.
 * @param {string[]} left <lang><zh-CN>已观察 code。</zh-CN><en>Observed codes.</en></lang>
 * @param {string[]} right <lang><zh-CN>期望 code。</zh-CN><en>Expected codes.</en></lang>
 * @returns {boolean} 是否逐项精确一致。 / Whether every item matches exactly.
 */
function equalStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * @lang zh-CN 断言 evidence gate；失败时立即停止且不写 ready report。
 * @lang en Asserts an evidence gate and stops before writing a ready report on failure.
 * @param {unknown} condition <lang><zh-CN>待判定条件。</zh-CN><en>Condition to evaluate.</en></lang>
 * @param {string} message <lang><zh-CN>稳定错误消息。</zh-CN><en>Stable error message.</en></lang>
 * @returns {asserts condition} 无返回值。 / No return value.
 */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
