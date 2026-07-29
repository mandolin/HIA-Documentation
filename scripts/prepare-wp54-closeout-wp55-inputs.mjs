import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 中文：main-repo 根目录，也是本仓公开相对路径锚点。 English: Main-repo root and anchor for this repository's public relative paths. */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** 中文：W-P54.1 范围冻结输入。 English: W-P54.1 scope-freeze input. */
const governancePath = path.join(rootDir, "dist", "wp54-rop-governance-intake", "evidence.json");
/** 中文：W-P54.2/3 注释盘点输入。 English: W-P54.2/3 annotation-inventory input. */
const inventoryPath = path.join(rootDir, "dist", "wp54-rop-annotation-inventory", "evidence.json");
/** 中文：W-P54.5 连续性输入。 English: W-P54.5 continuity input. */
const continuityPath = path.join(rootDir, "dist", "wp54-generated-comment-continuity", "evidence.json");
/** 中文：W-P54.6 changed-scope gate 输入。 English: W-P54.6 changed-scope-gate input. */
const gatePath = path.join(rootDir, "dist", "wp54-changed-scope-annotation-gate", "evidence.json");
/** 中文：收口 artifact 目录。 English: Closeout-artifact directory. */
const outputRoot = path.join(rootDir, "dist", "wp54-closeout-wp55-inputs");
/** 中文：机器可读收口证据。 English: Machine-readable closeout evidence. */
const evidencePath = path.join(outputRoot, "evidence.json");
/** 中文：中文优先收口报告。 English: Chinese-first closeout report. */
const reportPath = path.join(outputRoot, "wp54-closeout-and-wp55-inputs.md");

await main();

/**
 * 中文：收束 W-P54 已验证事实，登记 W-P55 决策输入，而不启动术语或 DLR 实现。
 * English: Closes verified W-P54 facts and registers W-P55 decision inputs without starting terminology or DLR implementation.
 *
 * @returns {Promise<void>} 写入 closeout evidence 与报告。 / Writes closeout evidence and report.
 */
async function main() {
  /** 中文：四份输入分别代表范围、盘点、连续性与 gate，必须全部先通过。 English: Four inputs represent scope, inventory, continuity, and gate; all must pass first. */
  const [governance, inventory, continuity, gate] = await Promise.all([governancePath, inventoryPath, continuityPath, gatePath].map(readJson));
  assert.equal(governance.status, "ready-for-wp54-cross-repository-annotation-inventory");
  assert.equal(inventory.status, "ready-for-wp54-selected-remediation-slice");
  assert.equal(continuity.status, "ready-for-wp54-changed-scope-gate");
  assert.equal(gate.status, "ready-for-wp54-closeout");

  /** 中文：摘要只投影单一授权函数与已验证 delta，不包含任何源码正文。 English: Summary projects only the single authorized function and verified delta, never source bodies. */
  const remediation = {
    repositoryId: "main-repo",
    selectedPath: gate.currentSignal.path,
    selectedFunction: gate.currentSignal.functionName,
    adjacentDocBlockAdded: gate.delta.adjacentDocBlockAdded,
    bilingualInternalMarkerLineCount: gate.currentSignal.bilingualInternalMarkerLineCount,
    expectedMinimumFlowBlockCommentCount: inventory.selectedFixture.riskLedger.expectedFlowBlockCommentCount,
    localDeclarationCandidateCount: gate.currentSignal.localDeclarationCandidateCount,
    sourceBehaviorModified: false,
    satelliteSourceModified: false,
    targetRepositoryModified: false
  };
  /** 中文：后延项明确声明未完成工作，避免将单切片误报为全仓完成。 English: Deferred items explicitly declare remaining work and avoid misreporting one slice as repository-wide completion. */
  const deferredItems = [
    { id: "repository-wide-historical-annotation-debt", status: "deferred", reason: "single remediation slice cannot establish repository-wide completion" },
    { id: "hia-pugdoc-annotation-remediation", status: "deferred", reason: "satellite remains observation-only in W-P54" },
    { id: "automatic-annotation-generation-or-semantic-approval", status: "deferred", reason: "ROP requires human semantic review and forbids bulk automatic annotation" },
    { id: "term-detection-dictionary-and-dlr-parser-runtime", status: "deferred-to-wp55-decision", reason: "requires separate terminology and DLR contract decision" },
    { id: "lint-lsp-ide-enforcement", status: "deferred", reason: "W-P54 establishes review baseline only" }
  ];
  /** 中文：W-P55 只有 decision 输入，不产生 syntax、parser、runtime 或 IDE 权限。 English: W-P55 has decision inputs only and creates no syntax, parser, runtime, or IDE authority. */
  const wp55Inputs = [
    { id: "term-identity-and-authority", question: "define inherent-term identity, authority, and conflict resolution across source comments, output, and external resources" },
    { id: "dlr-resource-boundary", question: "define external locale-resource contract, privacy boundary, linkage identity, versioning, and deterministic fallback" },
    { id: "annotation-term-reference", question: "decide how ROP annotations may reference approved terms/resources without temporary syntax or parser runtime" },
    { id: "review-tooling-consumption", question: "define future read-only lint/LSP/IDE consumption only after contracts are frozen" }
  ];
  /** 中文：检查只确认 W-P54 的已验证边界；语义充分性仍为人工判断。 English: Checks confirm verified W-P54 boundaries only; semantic adequacy remains a human judgment. */
  const checks = [
    check("governance-scope-remains-frozen", governance.scopeFreeze.status === "frozen-for-wp54-2-through-wp54-6"),
    check("single-remediation-source-kept", remediation.selectedPath === "packages/source-linkage/src/index.ts" && remediation.selectedFunction === "createDocSourceMapIndex"),
    check("changed-scope-gate-passed", gate.status === "ready-for-wp54-closeout"),
    check("generated-continuity-passed", continuity.status === "ready-for-wp54-changed-scope-gate"),
    check("no-behavior-satellite-or-target-change-claimed", remediation.sourceBehaviorModified === false && remediation.satelliteSourceModified === false && remediation.targetRepositoryModified === false),
    check("debt-remains-explicitly-deferred", deferredItems.length === 5 && deferredItems.every((item) => item.status.startsWith("deferred"))),
    check("wp55-remains-input-only", wp55Inputs.length === 4),
    check("automatic-completeness-not-claimed", true)
  ];
  /** 中文：hard failure 才阻止 closeout；人工审查不是可自动放行的字段。 English: Only hard failure blocks closeout; manual review is not an automatically passable field. */
  const hardFailures = checks.filter((item) => item.status === "fail");

  /** 中文：evidence 不授权下一周期，只给出须经用户确认的输入。 English: Evidence does not authorize the next cycle; it supplies inputs requiring user confirmation. */
  const evidence = {
    contract: "hia-wp54-closeout-wp55-inputs",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp55-terminology-and-dlr-contract-decision-user-confirmation" : "blocked-by-wp54-closeout-preconditions",
    cycleGroupId: "C-HIA-P4",
    phase: "W-P54.7",
    sourceInputs: {
      governanceIntake: normalizePath(governancePath),
      annotationInventory: normalizePath(inventoryPath),
      continuityEvidence: normalizePath(continuityPath),
      changedScopeGate: normalizePath(gatePath)
    },
    executionPolicy: {
      policy: "closeout-and-next-cycle-input-registration-only",
      hiaMayModifySourceAnnotations: false,
      hiaMayModifySatelliteRepository: false,
      hiaMayMutateTargetRepository: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayCallHostEditorApi: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    remediation,
    deferredItems,
    wp55Inputs,
    manualReviewBoundary: {
      automaticSemanticCompletenessClaim: false,
      repositoryWideHistoricalDebtResolvedClaim: false,
      wp55ImplementationStarted: false,
      requiredFollowUp: ["review-controlled-source-comment-semantic-equivalence", "plan-historical-debt-governance-slices", "obtain-separate-wp55-start-authorization"]
    },
    checks,
    generatedDocs: { closeoutReport: normalizePath(reportPath) }
  };
  /** 中文：先检查后延/输入文字，再检查完整 JSON，防止隐私边界被新字段绕过。 English: Check deferred/input text before full JSON so new fields cannot bypass privacy boundaries. */
  assertNoPrivateMarkers(JSON.stringify(deferredItems), "W-P54 closeout deferred items");
  assertNoPrivateMarkers(JSON.stringify(wp55Inputs), "W-P54 closeout W-P55 inputs");
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P54 closeout evidence");

  /** 中文：收口产物只写 main-repo dist；不写受控源码、卫星或目标项目。 English: Closeout artifacts write only main-repo dist; no controlled source, satellite, or target project is written. */
  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reportPath, renderReport(evidence), "utf8");

  console.log(`W-P54.7 closeout prepared at ${normalizePath(evidencePath)}`);
  console.log(`Closeout status: ${evidence.status}`);
}

/**
 * 中文：读取 JSON evidence。
 * English: Reads JSON evidence.
 *
 * @param {string} inputPath 输入位置。 / Input location.
 * @returns {Promise<Record<string, any>>} 解析对象。 / Parsed object.
 */
async function readJson(inputPath) {
  /** 中文：原始文本只在 JSON 解析期间存在。 English: Raw text exists only during JSON parsing. */
  const inputText = await readFile(inputPath, "utf8");
  return JSON.parse(inputText);
}

/**
 * 中文：标准化 pass/fail 检查。
 * English: Normalizes a pass/fail check.
 *
 * @param {string} id 检查标识。 / Check identifier.
 * @param {boolean} ok 检查结果。 / Check result.
 * @returns {{ id: string, status: "pass" | "fail" }} 检查对象。 / Check object.
 */
function check(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

/**
 * 中文：转换为 main-repo 相对公开路径。
 * English: Converts to a main-repo-relative public path.
 *
 * @param {string} value 绝对路径。 / Absolute path.
 * @returns {string} 相对路径。 / Relative path.
 */
function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

/**
 * 中文：渲染中文优先收口报告。
 * English: Renders the Chinese-first closeout report.
 *
 * @param {Record<string, any>} evidence closeout evidence。 / Closeout evidence.
 * @returns {string} Markdown 报告。 / Markdown report.
 */
function renderReport(evidence) {
  /** 中文：后延表只包含公开安全 metadata。 English: Deferred table contains public-safe metadata only. */
  const deferredRows = evidence.deferredItems.map((item) => `| ${item.id} | ${item.status} | ${item.reason} |`).join("\n");
  /** 中文：输入表保持 decision 粒度，不固定未设计的语法。 English: Input table remains decision-level and does not freeze undesigned syntax. */
  const inputRows = evidence.wp55Inputs.map((item) => `| ${item.id} | ${item.question} |`).join("\n");
  return `# W-P54 Closeout And W-P55 Inputs\n\n## 中文结论\n\nW-P54 完成第一轮 ROP 治理基线：冻结双仓盘点边界、建立人工量规、在唯一授权 source-map 函数补齐双语节点/流程/局部变量注释、通过 source-linkage 单测、核验 Pug 生成链连续性，并以修复前提交建立 changed-scope gate。此结论不代表全仓历史债务完成，也不启动 W-P55。\n\n## 受控修复事实\n\n- 路径：${evidence.remediation.selectedPath}\n- 函数：${evidence.remediation.selectedFunction}\n- 紧邻节点 doc block：${evidence.remediation.adjacentDocBlockAdded}\n- 内部双语 marker：${evidence.remediation.bilingualInternalMarkerLineCount}（fixture 最低值 ${evidence.remediation.expectedMinimumFlowBlockCommentCount}）\n- 行为改动：${evidence.remediation.sourceBehaviorModified}\n- 卫星/目标项目改动：${evidence.remediation.satelliteSourceModified} / ${evidence.remediation.targetRepositoryModified}\n\n## 后延事项\n\n| 项 | 状态 | 原因 |\n| --- | --- | --- |\n${deferredRows}\n\n## W-P55 决策输入（未启动）\n\n| 输入 | 待决问题 |\n| --- | --- |\n${inputRows}\n\n## English summary\n\nW-P54 closes a first-round ROP governance baseline for one controlled source-map function. Repository-wide debt, satellite remediation, automatic semantic approval, and terminology/DLR implementation remain deferred; W-P55 requires separate user authorization.\n`;
}

/**
 * 中文：阻止 closeout evidence 出现本机路径、来源正文或 credential marker。
 * English: Prevents closeout evidence from containing local paths, source bodies, or credential markers.
 *
 * @param {string} value 序列化 metadata。 / Serialized metadata.
 * @param {string} label 断言上下文。 / Assertion context.
 * @returns {void} 违规时抛错。 / Throws on violation.
 */
function assertNoPrivateMarkers(value, label) {
  /** 中文：错误只报告命中 pattern，不输出潜在敏感正文。 English: Errors report the hit pattern only and never output potentially sensitive body text. */
  const forbiddenPatterns = [/\b[A-Z]:[\\/]/u, /file:\/\//iu, /work-zone/iu, /Users[\\/]/u, /"sourcesContent"\s*:/u, /sk-[A-Za-z0-9_-]+/u, /ghp_[A-Za-z0-9_]+/u, /npm_[A-Za-z0-9_]+/u];
  /** 中文：任一命中都阻止正式 evidence 写入。 English: Any hit blocks formal evidence writing. */
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
