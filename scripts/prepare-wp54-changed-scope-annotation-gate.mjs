import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 中文：将 callback 风格的 git 调用转换为受控 async 调用；只用于读取历史文本。
 * English: Converts callback-style git invocation into controlled async invocation; used only to read historical text.
 */
const execFile = promisify(execFileCallback);

/** 中文：main-repo 根目录。 English: Main-repo root. */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 中文：本轮修复开始前的 main-repo 提交锚点。 English: Main-repo commit anchor from before this remediation began. */
const remediationBaselineCommit = "3f9fe5e";

/** 中文：scope freeze 授权的唯一源码路径。 English: Sole source path authorized by scope freeze. */
const selectedSourcePath = "packages/source-linkage/src/index.ts";

/** 中文：冻结 fixture 指定的唯一 public 函数。 English: Sole public function specified by the frozen fixture. */
const selectedFunctionName = "createDocSourceMapIndex";

/** 中文：W-P54 最新 annotation inventory evidence。 English: Latest W-P54 annotation-inventory evidence. */
const annotationInventoryPath = path.join(rootDir, "dist", "wp54-rop-annotation-inventory", "evidence.json");

/** 中文：W-P54 continuity evidence。 English: W-P54 continuity evidence. */
const continuityEvidencePath = path.join(rootDir, "dist", "wp54-generated-comment-continuity", "evidence.json");

/** 中文：W-P49 的历史 fixture evidence。 English: Historical W-P49 fixture evidence. */
const historicalFixturePath = path.join(rootDir, "dist", "wp49-internal-flow-comment-fixture", "evidence.json");

/** 中文：本阶段 gate evidence 输出目录。 English: Output directory for this phase's gate evidence. */
const outputRoot = path.join(rootDir, "dist", "wp54-changed-scope-annotation-gate");

/** 中文：机器可读 gate evidence。 English: Machine-readable gate evidence. */
const evidencePath = path.join(outputRoot, "evidence.json");

/** 中文：中文优先 changed-scope 审查报告。 English: Chinese-first changed-scope review report. */
const gateReportPath = path.join(outputRoot, "changed-scope-annotation-gate.md");

await main();

/**
 * 中文：仅对已冻结的单一函数建立可重跑 changed-scope 注释 gate，并对比修复前提交的存在性信号。
 * English: Establishes a repeatable changed-scope annotation gate for the single frozen function and compares presence signals with the pre-remediation commit.
 *
 * @returns {Promise<void>} 写入 gate evidence 与审查报告。 / Writes gate evidence and review report.
 */
async function main() {
  /** 中文：当前 inventory 是修复后存在性信号的唯一来源。 English: Current inventory is the sole source for post-remediation presence signals. */
  const annotationInventory = await readJson(annotationInventoryPath);
  assert.equal(annotationInventory.status, "ready-for-wp54-selected-remediation-slice");
  /** 中文：continuity evidence 已确认生成链不因本轮注释改动漂移。 English: Continuity evidence already confirms generation chains did not drift because of this annotation change. */
  const continuityEvidence = await readJson(continuityEvidencePath);
  assert.equal(continuityEvidence.status, "ready-for-wp54-changed-scope-gate");
  /** 中文：历史 fixture 保持 W-P49 的审查阈值与范围来源。 English: Historical fixture retains W-P49 review thresholds and scope provenance. */
  const historicalFixtureEvidence = await readJson(historicalFixturePath);
  /** 中文：当前函数 metadata 只含行号和计数，不能携带源码正文。 English: Current function metadata contains line numbers/counts only and cannot carry source bodies. */
  const currentSignal = selectCurrentSignal(annotationInventory);
  /** 中文：历史源码仅在内存中提取同一存在性信号，随后丢弃正文。 English: Historical source extracts the same presence signals in memory only and then discards its body. */
  const baselineSignal = await readHistoricalSignal();
  /** 中文：W-P49 fixture 证明此函数是既定 source-map 审查对象而非本轮临时扩大。 English: W-P49 fixture proves this function is the established source-map review target, not a new expansion. */
  const historicalFixture = selectHistoricalFixture(historicalFixtureEvidence);
  /** 中文：gate 只比较存在性 delta；语义充分度继续保留给人工量规。 English: Gate compares presence delta only; semantic adequacy remains for the manual rubric. */
  const delta = createDelta(baselineSignal, currentSignal);
  /** 中文：checks 同时保护 scope、历史缺口修复、continuity 与人工审查边界。 English: Checks protect scope, historical-gap remediation, continuity, and the human-review boundary together. */
  const checks = createChecks({ baselineSignal, continuityEvidence, currentSignal, delta, historicalFixture });
  /** 中文：硬失败会阻止 closeout；人工语义结论不被自动化为 hard pass。 English: Hard failures block closeout; human semantic conclusions are not automated into a hard pass. */
  const hardFailures = checks.filter((item) => item.status === "fail");

  /** 中文：evidence 仅包含提交短 id、相对路径、行号、计数与布尔策略，不包含历史或当前源码正文。 English: Evidence contains only commit short ID, relative path, line numbers, counts, and boolean policy—never historical/current source bodies. */
  const evidence = {
    contract: "hia-wp54-changed-scope-annotation-gate",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp54-closeout" : "blocked-by-wp54-changed-scope-gate",
    cycleGroupId: "C-HIA-P4",
    phase: "W-P54.6",
    sourceInputs: {
      annotationInventory: normalizePath(annotationInventoryPath),
      continuityEvidence: normalizePath(continuityEvidencePath),
      historicalFixture: normalizePath(historicalFixturePath),
      remediationBaselineCommit
    },
    executionPolicy: {
      policy: "single-function-changed-scope-presence-gate",
      selectedSourcePath,
      selectedFunctionName,
      historicalSourceReadOnly: true,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateSatelliteRepository: false,
      hiaMayMutateTargetRepository: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayCallHostEditorApi: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    historicalFixture: {
      id: historicalFixture.id,
      expectedMinimumFlowBlockCommentCount: historicalFixture.expectedSignals.minimumFlowBlockCommentCount,
      requiresBilingualInternalMarkers: historicalFixture.expectedSignals.requiresBilingualInternalMarkers,
      requiresGeneratedOrBoundaryInvariant: historicalFixture.expectedSignals.requiresGeneratedOrBoundaryInvariantWhenApplicable
    },
    baselineSignal,
    currentSignal,
    delta,
    manualReviewBoundary: {
      automaticSemanticCompletenessClaim: false,
      historicalRepositoryWideDebtResolvedClaim: false,
      requiredReview: [
        "bilingual-semantic-equivalence",
        "local-variable-domain-role-adequacy",
        "non-obvious-statement-explanation",
        "privacy-and-sidecar-boundary-accuracy"
      ]
    },
    checks,
    generatedDocs: {
      gateReport: normalizePath(gateReportPath)
    }
  };
  /** 中文：按关键区段和完整 JSON 双重执行隐私断言，防止新字段绕过检查。 English: Apply privacy assertions to critical sections and full JSON, preventing new fields from bypassing checks. */
  assertNoPrivateMarkers(JSON.stringify(evidence.baselineSignal), "W-P54 changed-scope baseline signal");
  assertNoPrivateMarkers(JSON.stringify(evidence.currentSignal), "W-P54 changed-scope current signal");
  assertNoPrivateMarkers(JSON.stringify(evidence.delta), "W-P54 changed-scope delta");
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P54 changed-scope gate evidence");

  /** 中文：输出只写本仓 dist，不产生任何 source annotation、卫星或目标项目写入。 English: Output writes only this repository's dist and produces no source-annotation, satellite, or target-project write. */
  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  /** 中文：报告明确为 single-function gate，禁止外推为全仓历史债务结论。 English: Report explicitly marks this as a single-function gate and prohibits extrapolation to repository-wide historical debt. */
  await writeFile(gateReportPath, renderGateReport(evidence), "utf8");

  console.log(`W-P54.6 changed-scope annotation gate prepared at ${normalizePath(evidencePath)}`);
  console.log(`Gate status: ${evidence.status}`);
}

/**
 * 中文：读取 JSON evidence。
 * English: Reads JSON evidence.
 *
 * @param {string} inputPath 输入文件位置。 / Input file location.
 * @returns {Promise<Record<string, any>>} 解析 evidence。 / Parsed evidence.
 */
async function readJson(inputPath) {
  /** 中文：文本仅在解析期间存在。 English: Text exists only during parsing. */
  const inputText = await readFile(inputPath, "utf8");
  return JSON.parse(inputText);
}

/**
 * 中文：提取当前受控函数的存在性信号。
 * English: Extracts presence signals for the current controlled function.
 *
 * @param {Record<string, any>} inventory 当前 inventory evidence。 / Current inventory evidence.
 * @returns {Record<string, unknown>} 当前信号。 / Current signals.
 */
function selectCurrentSignal(inventory) {
  /** 中文：fixture 是唯一允许被 gate 化的节点。 English: Fixture is the only node permitted to be gated. */
  const fixture = inventory.selectedFixture;
  /** 中文：函数信号由 W-P54.2/3 已验证的 scanner 提供。 English: Function signals are provided by the scanner already verified in W-P54.2/3. */
  const functionInventory = fixture?.currentFunctionInventory;
  assert.notEqual(functionInventory, undefined, "W-P54 current function inventory is required.");
  assert.equal(fixture.historicalSelector.path, selectedSourcePath);
  assert.equal(functionInventory.name, selectedFunctionName);
  return {
    functionName: functionInventory.name,
    path: fixture.historicalSelector.path,
    startLine: functionInventory.startLine,
    lineCount: functionInventory.lineCount,
    hasAdjacentDocBlock: functionInventory.hasAdjacentDocBlock,
    bilingualInternalMarkerLineCount: functionInventory.bilingualInternalMarkerLineCount,
    localDeclarationCandidateCount: functionInventory.localDeclarationCandidateCount,
    sourceBodySerialized: false
  };
}

/**
 * 中文：从修复前提交读取函数的同构存在性信号。
 * English: Reads isomorphic function presence signals from the pre-remediation commit.
 *
 * @returns {Promise<Record<string, unknown>>} 修复前信号。 / Pre-remediation signals.
 */
async function readHistoricalSignal() {
  /** 中文：git show 明确限定到既定 commit/path；命令不修改 worktree 或 refs。 English: git show is explicitly limited to the established commit/path and does not modify worktree or refs. */
  const revisionPath = `${remediationBaselineCommit}:${selectedSourcePath}`;
  /** 中文：stdout 只在本函数内用于统计，绝不写入 evidence 或报告。 English: stdout is used for counting only inside this function and is never written to evidence or report. */
  const { stdout } = await execFile("git", ["show", revisionPath], { cwd: rootDir, encoding: "utf8", maxBuffer: 1024 * 1024 });
  /** 中文：历史文本被立即折算为信号，随后离开函数作用域。 English: Historical text is immediately reduced to signals and then leaves function scope. */
  return inspectFunctionPresence(stdout);
}

/**
 * 中文：从未序列化的源码文本提取函数注释存在性信号。
 * English: Extracts function-comment presence signals from source text that is never serialized.
 *
 * @param {string} sourceText 源码文本，仅内存使用。 / Source text for in-memory use only.
 * @returns {Record<string, unknown>} 无正文信号。 / No-body signals.
 */
function inspectFunctionPresence(sourceText) {
  /** 中文：行数组仅支持定位和计数。 English: Line array supports location and counting only. */
  const sourceLines = sourceText.split(/\r?\n/u);
  /** 中文：函数签名是固定 public API，不根据任意文本输入生成 selector。 English: Function signature is fixed public API and does not generate selectors from arbitrary text input. */
  const startIndex = sourceLines.findIndex((line) => line.startsWith(`export function ${selectedFunctionName}`));
  assert.notEqual(startIndex, -1, `Historical ${selectedFunctionName} was not found.`);
  /** 中文：下一个 export function 构成保守结束位置。 English: Next export function forms the conservative end position. */
  const nextExportIndex = sourceLines.findIndex((line, index) => index > startIndex && /^export function\s/u.test(line));
  /** 中文：文件尾是最后一个 export function 的自然结束。 English: File end is the natural end for the final export function. */
  const endIndex = nextExportIndex === -1 ? sourceLines.length : nextExportIndex;
  /** 中文：函数行只用于 marker 和局部声明计数。 English: Function lines are used only for marker and local-declaration counts. */
  const functionLines = sourceLines.slice(startIndex, endIndex);

  return {
    functionName: selectedFunctionName,
    path: selectedSourcePath,
    startLine: startIndex + 1,
    lineCount: functionLines.length,
    hasAdjacentDocBlock: hasImmediatelyAdjacentDocBlock(sourceLines, startIndex),
    bilingualInternalMarkerLineCount: functionLines.filter((line) => line.includes("<lang>")).length,
    localDeclarationCandidateCount: functionLines.filter((line) => /^\s*(?:const|let|var)\s+/u.test(line)).length,
    sourceBodySerialized: false
  };
}

/**
 * 中文：确认声明前连续紧邻的 JSDoc/TSDoc block。
 * English: Confirms a continuous JSDoc/TSDoc block immediately adjacent before a declaration.
 *
 * @param {string[]} sourceLines 文件行。 / File lines.
 * @param {number} declarationIndex 零基声明行。 / Zero-based declaration line.
 * @returns {boolean} 是否紧邻文档块。 / Whether a doc block is adjacent.
 */
function hasImmediatelyAdjacentDocBlock(sourceLines, declarationIndex) {
  /** 中文：紧邻规则不允许空行或非注释内容。 English: Adjacency rule allows no blank line or non-comment content. */
  const closingLineIndex = declarationIndex - 1;
  if (closingLineIndex < 0 || !sourceLines[closingLineIndex].trim().endsWith("*/")) {
    return false;
  }

  for (let index = closingLineIndex; index >= 0; index -= 1) {
    /** 中文：当前行只用于识别注释边界。 English: Current line is used only to identify comment boundary. */
    const line = sourceLines[index].trim();
    if (line.startsWith("/**")) {
      return true;
    }
    if (!line.startsWith("*")) {
      return false;
    }
  }

  return false;
}

/**
 * 中文：从 W-P49 evidence 选取固定 source-map fixture。
 * English: Selects the fixed source-map fixture from W-P49 evidence.
 *
 * @param {Record<string, any>} evidence W-P49 evidence。 / W-P49 evidence.
 * @returns {Record<string, any>} 固定 fixture。 / Fixed fixture.
 */
function selectHistoricalFixture(evidence) {
  /** 中文：fixture 列表损坏时不能静默继续。 English: Corrupt fixture lists must not continue silently. */
  const fixtures = Array.isArray(evidence.fixtures) ? evidence.fixtures : [];
  /** 中文：id 是已冻结的 machine-readable 选择器。 English: ID is the frozen machine-readable selector. */
  const fixture = fixtures.find((item) => item?.id === "source-map-linkage");
  assert.notEqual(fixture, undefined, "W-P49 source-map fixture is required.");
  assert.equal(fixture.selector.path, selectedSourcePath);
  assert.equal(fixture.selector.name, selectedFunctionName);
  return fixture;
}

/**
 * 中文：计算只读 before/after presence delta。
 * English: Calculates read-only before/after presence delta.
 *
 * @param {Record<string, any>} baseline 修复前信号。 / Pre-remediation signals.
 * @param {Record<string, any>} current 修复后信号。 / Post-remediation signals.
 * @returns {Record<string, unknown>} 信号差异。 / Signal delta.
 */
function createDelta(baseline, current) {
  return {
    adjacentDocBlockAdded: baseline.hasAdjacentDocBlock === false && current.hasAdjacentDocBlock === true,
    bilingualInternalMarkerLineCountDelta: Number(current.bilingualInternalMarkerLineCount) - Number(baseline.bilingualInternalMarkerLineCount),
    localDeclarationCandidateCountDelta: Number(current.localDeclarationCandidateCount) - Number(baseline.localDeclarationCandidateCount),
    functionLineCountDelta: Number(current.lineCount) - Number(baseline.lineCount),
    behaviorChangeClaimed: false
  };
}

/**
 * 中文：建立 gate 的硬检查集合。
 * English: Establishes the gate's hard-check collection.
 *
 * @param {{ baselineSignal: Record<string, any>, continuityEvidence: Record<string, any>, currentSignal: Record<string, any>, delta: Record<string, any>, historicalFixture: Record<string, any> }} value gate 输入。 / Gate inputs.
 * @returns {{ id: string, status: "pass" | "fail" }[]} 检查结果。 / Check results.
 */
function createChecks(value) {
  return [
    createCheck("single-authorized-path-preserved", value.currentSignal.path === selectedSourcePath && value.baselineSignal.path === selectedSourcePath),
    createCheck("single-authorized-function-preserved", value.currentSignal.functionName === selectedFunctionName && value.baselineSignal.functionName === selectedFunctionName),
    createCheck("historical-fixture-threshold-preserved", value.historicalFixture.expectedSignals.minimumFlowBlockCommentCount === 4 && value.historicalFixture.expectedSignals.requiresBilingualInternalMarkers === true),
    createCheck("adjacent-doc-block-added", value.delta.adjacentDocBlockAdded === true),
    createCheck("bilingual-flow-marker-minimum-satisfied", value.baselineSignal.bilingualInternalMarkerLineCount === 0 && Number(value.currentSignal.bilingualInternalMarkerLineCount) >= value.historicalFixture.expectedSignals.minimumFlowBlockCommentCount),
    createCheck("local-declaration-candidates-preserved", Number(value.currentSignal.localDeclarationCandidateCount) === Number(value.baselineSignal.localDeclarationCandidateCount)),
    createCheck("continuity-gate-passed", value.continuityEvidence.status === "ready-for-wp54-changed-scope-gate"),
    createCheck("behavior-change-not-claimed", value.delta.behaviorChangeClaimed === false)
  ];
}

/**
 * 中文：构造标准检查对象。
 * English: Constructs a standard check object.
 *
 * @param {string} id 检查标识。 / Check identifier.
 * @param {boolean} ok 检查结果。 / Check result.
 * @returns {{ id: string, status: "pass" | "fail" }} 检查对象。 / Check object.
 */
function createCheck(id, ok) {
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
 * 中文：生成中文优先的 changed-scope gate 报告。
 * English: Generates the Chinese-first changed-scope gate report.
 *
 * @param {Record<string, any>} evidence gate evidence。 / Gate evidence.
 * @returns {string} Markdown 报告。 / Markdown report.
 */
function renderGateReport(evidence) {
  /** 中文：delta 只包含计数/布尔值，可安全渲染。 English: Delta contains counts/booleans only and is safe to render. */
  const delta = evidence.delta;
  return `# W-P54.6 Changed-Scope Annotation Gate\n\n## 中文摘要\n\n本 gate 只覆盖 ${evidence.executionPolicy.selectedSourcePath} 中的 ${evidence.executionPolicy.selectedFunctionName}。它以提交 ${evidence.sourceInputs.remediationBaselineCommit} 的只读历史信号为基线，并不把单函数通过外推为全仓历史注释债务完成。\n\n## 自动可复跑事实\n\n| 信号 | 修复前 | 修复后 | delta |\n| --- | ---: | ---: | ---: |\n| 紧邻 doc block | ${evidence.baselineSignal.hasAdjacentDocBlock} | ${evidence.currentSignal.hasAdjacentDocBlock} | ${delta.adjacentDocBlockAdded} |\n| 内部双语 marker 行 | ${evidence.baselineSignal.bilingualInternalMarkerLineCount} | ${evidence.currentSignal.bilingualInternalMarkerLineCount} | ${delta.bilingualInternalMarkerLineCountDelta} |\n| 局部声明候选 | ${evidence.baselineSignal.localDeclarationCandidateCount} | ${evidence.currentSignal.localDeclarationCandidateCount} | ${delta.localDeclarationCandidateCountDelta} |\n\n## 边界\n\n- 只读读取历史提交；不修改 git ref、卫星仓库、目标项目或 provider/network。\n- W-P52 Pug sidecar、doc-source-map reference、只读 index 与四宿主 projection continuity 已通过独立 W-P54.5 evidence 核验。\n- 中英语义对等、局部变量领域角色、非自明语句和 privacy 术语准确性仍须人工依据 ROP 量规确认。\n\n## English summary\n\nThis gate verifies presence-signal improvement for one authorized function against its pre-remediation commit. It remains deliberately narrower than repository-wide historical annotation completion.\n`;
}

/**
 * 中文：防止公开 evidence 出现本机路径、正文或 credential marker。
 * English: Prevents local paths, bodies, or credential markers from public evidence.
 *
 * @param {string} value 序列化 metadata。 / Serialized metadata.
 * @param {string} label 断言上下文。 / Assertion context.
 * @returns {void} 违规时抛出错误。 / Throws on violation.
 */
function assertNoPrivateMarkers(value, label) {
  /** 中文：只输出命中 pattern，不输出潜在敏感匹配正文。 English: Outputs the hit pattern only, never a potentially sensitive match body. */
  const forbiddenPatterns = [
    /\b[A-Z]:[\\/]/u,
    /file:\/\//iu,
    /work-zone/iu,
    /Users[\\/]/u,
    /"sourcesContent"\s*:/u,
    /sk-[A-Za-z0-9_-]+/u,
    /ghp_[A-Za-z0-9_]+/u,
    /npm_[A-Za-z0-9_]+/u
  ];
  /** 中文：任一命中都阻止 evidence 落盘。 English: Any hit blocks evidence persistence. */
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
