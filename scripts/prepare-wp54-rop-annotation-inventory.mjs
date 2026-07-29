import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 中文：main-repo 根目录，也是公开 evidence 相对路径的锚点。
 * English: Main-repo root and the anchor for public evidence-relative paths.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 中文：W-P54.1 scope freeze 的唯一机器输入。
 * English: Sole machine input from the W-P54.1 scope freeze.
 */
const governanceIntakePath = path.join(rootDir, "dist", "wp54-rop-governance-intake", "evidence.json");

/**
 * 中文：W-P49 source-map fixture 的既有第一轮输入；本轮只消费，不重做选择。
 * English: Existing first-round W-P49 source-map fixture input; this round
 * consumes it without reselecting fixtures.
 */
const wp49FixturePath = path.join(rootDir, "dist", "wp49-internal-flow-comment-fixture", "evidence.json");

/**
 * 中文：本阶段不含源码正文的独立 evidence 输出目录。
 * English: Dedicated evidence directory for this phase without source bodies.
 */
const outputRoot = path.join(rootDir, "dist", "wp54-rop-annotation-inventory");

/**
 * 中文：机器可读盘点结果。
 * English: Machine-readable inventory result.
 */
const evidencePath = path.join(outputRoot, "evidence.json");

/**
 * 中文：中文优先的人工审查 fixture 矩阵。
 * English: Chinese-first manual-review fixture matrix.
 */
const fixtureMatrixPath = path.join(outputRoot, "review-fixture-matrix.md");

await main();

/**
 * 中文：对冻结的唯一源码切片建立 ROP 风险信号，并输出人工审查矩阵。
 * English: Establishes ROP risk signals for the single frozen source slice
 * and writes the manual-review matrix.
 *
 * @returns {Promise<void>} 写入 inventory evidence 和 fixture 矩阵。 / Writes inventory evidence and fixture matrix.
 */
async function main() {
  /** 中文：scope freeze 是所有路径授权的唯一来源。 English: Scope freeze is the sole source of path authorization. */
  const governanceIntake = await readJson(governanceIntakePath);
  assert.equal(governanceIntake.status, "ready-for-wp54-cross-repository-annotation-inventory");
  /** 中文：既有 fixture 锁定本轮应复核的 source-map 函数。 English: Existing fixture locks the source-map function to be reviewed this round. */
  const wp49FixtureEvidence = await readJson(wp49FixturePath);
  /** 中文：从历史 fixture 中取 source-map 项，不能用当前 scan 临时扩大范围。 English: Takes the source-map item from the historical fixture and cannot expand scope from the current scan. */
  const sourceMapFixture = findSourceMapFixture(wp49FixtureEvidence);
  /** 中文：受控路径必须与 scope freeze 完全一致。 English: Controlled path must exactly match the scope freeze. */
  const selectedPath = getSingleSelectedPath(governanceIntake);
  assert.equal(selectedPath, sourceMapFixture.selector.path);
  /** 中文：读取受控源码只为计算行号/注释存在性，正文不会进入 evidence。 English: Reads controlled source only to calculate line/comment presence; its body never enters evidence. */
  const sourcePath = path.join(rootDir, selectedPath);
  const sourceText = await readFile(sourcePath, "utf8");
  /** 中文：函数名来自已冻结 fixture，不以文本猜测生成新候选。 English: Function name comes from the frozen fixture and is not used to create new text-derived candidates. */
  const functionInventory = inspectFunction(sourceText, sourceMapFixture.selector.name);
  /** 中文：卫星统计来自 W-P54.1 已冻结快照；W-P54.2 不重新读取或修改卫星源码。 English: Satellite metrics come from the W-P54.1 frozen snapshot; W-P54.2 neither rereads nor changes satellite source. */
  const satelliteObservation = selectSatelliteObservation(governanceIntake);
  /** 中文：风险信号是排程依据，不是自动质量裁决。 English: Risk signals are scheduling inputs, never automatic quality judgments. */
  const riskLedger = createRiskLedger(functionInventory, sourceMapFixture);
  /** 中文：检查只验证盘点完整性与边界，不要求缺口在盘点阶段已修复。 English: Checks validate inventory completeness and boundaries; they do not require gaps to be fixed during inventory. */
  const checks = createChecks({ functionInventory, governanceIntake, riskLedger, satelliteObservation, sourceMapFixture });
  /** 中文：盘点前置失败才阻止后续量规；风险缺口本身保持可见但不触发硬失败。 English: Only inventory prerequisite failures block the rubric; risk gaps remain visible without becoming hard failures. */
  const hardFailures = checks.filter((item) => item.status === "fail");

  /** 中文：evidence 只包含路径、行号和计数，不包含函数源码、注释正文或 source digest。 English: Evidence contains paths, line numbers, and counts only—never function source, comment bodies, or source digests. */
  const evidence = {
    contract: "hia-wp54-rop-annotation-inventory",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp54-selected-remediation-slice" : "blocked-by-wp54-annotation-inventory-preconditions",
    cycleGroupId: "C-HIA-P4",
    phase: "W-P54.2-and-W-P54.3",
    sourceInputs: {
      governanceIntake: normalizePath(governanceIntakePath),
      wp49InternalFlowFixture: normalizePath(wp49FixturePath)
    },
    executionPolicy: {
      policy: "read-only-selected-slice-signal-inventory",
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateSatelliteRepository: false,
      hiaMayMutateTargetRepository: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayCallHostEditorApi: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    selectedFixture: {
      id: sourceMapFixture.id,
      historicalSelector: sourceMapFixture.selector,
      currentFunctionInventory: functionInventory,
      riskLedger
    },
    satelliteObservation,
    reviewRubric: createReviewRubric(),
    checks,
    generatedDocs: {
      reviewFixtureMatrix: normalizePath(fixtureMatrixPath)
    }
  };
  /** 中文：分区断言把隐私误命中定位到 metadata 类别，而不输出任何潜在敏感匹配正文。 English: Section assertions locate privacy false positives by metadata category without printing any potentially sensitive match body. */
  assertNoPrivateMarkers(JSON.stringify(evidence.sourceInputs), "W-P54 annotation inventory source inputs");
  assertNoPrivateMarkers(JSON.stringify(evidence.executionPolicy), "W-P54 annotation inventory execution policy");
  assertNoPrivateMarkers(JSON.stringify(evidence.selectedFixture), "W-P54 annotation inventory selected fixture");
  assertNoPrivateMarkers(JSON.stringify(evidence.satelliteObservation), "W-P54 annotation inventory satellite observation");
  assertNoPrivateMarkers(JSON.stringify(evidence.reviewRubric), "W-P54 annotation inventory review rubric");
  assertNoPrivateMarkers(JSON.stringify(evidence.checks), "W-P54 annotation inventory checks");
  assertNoPrivateMarkers(JSON.stringify(evidence.generatedDocs), "W-P54 annotation inventory generated document paths");
  /** 中文：完整序列化断言仍是最终防线，防止未来新增字段绕过上述分区检查。 English: Full serialization assertion remains the final guard against future fields bypassing the section checks. */
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P54 annotation inventory evidence");

  /** 中文：只写入本仓 dist evidence，不触碰任何参与源码。 English: Writes only this repository's dist evidence and touches no participating source. */
  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  /** 中文：矩阵把必须人工判断的结论留给 reviewer，避免伪造自动充分性。 English: Matrix leaves human-required conclusions to reviewers and avoids fabricated automatic sufficiency. */
  await writeFile(fixtureMatrixPath, renderFixtureMatrix(evidence), "utf8");

  console.log(`W-P54.2/W-P54.3 annotation inventory prepared at ${normalizePath(evidencePath)}`);
  console.log(`Inventory status: ${evidence.status}`);
}

/**
 * 中文：读取并解析 JSON 证据输入。
 * English: Reads and parses a JSON evidence input.
 *
 * @param {string} inputPath 输入位置。 / Input location.
 * @returns {Promise<Record<string, unknown>>} 解析结果。 / Parsed result.
 */
async function readJson(inputPath) {
  /** 中文：原始文本仅用于解析，函数返回值不携带 buffer。 English: Raw text is used only for parsing and no buffer is carried in the return value. */
  const inputText = await readFile(inputPath, "utf8");
  return JSON.parse(inputText);
}

/**
 * 中文：从 W-P49 fixture 中定位既定的 source-map 审查对象。
 * English: Locates the established source-map review target in the W-P49 fixture.
 *
 * @param {Record<string, unknown>} evidence W-P49 fixture evidence。 / W-P49 fixture evidence.
 * @returns {Record<string, any>} source-map fixture。 / Source-map fixture.
 */
function findSourceMapFixture(evidence) {
  /** 中文：只接受数组形态，损坏证据不得静默降级。 English: Accepts array form only; malformed evidence must not silently degrade. */
  const fixtures = Array.isArray(evidence.fixtures) ? evidence.fixtures : [];
  /** 中文：id 是 W-P49 已冻结的标识，不依赖自然语言 reason。 English: ID is frozen by W-P49 and does not depend on natural-language reason text. */
  const fixture = fixtures.find((item) => item && item.id === "source-map-linkage");
  assert.notEqual(fixture, undefined, "W-P49 source-map-linkage fixture is required.");
  return fixture;
}

/**
 * 中文：从 scope freeze 读取唯一受控源码路径。
 * English: Reads the single controlled source path from the scope freeze.
 *
 * @param {Record<string, unknown>} intake W-P54.1 intake evidence。 / W-P54.1 intake evidence.
 * @returns {string} 唯一相对路径。 / Sole relative path.
 */
function getSingleSelectedPath(intake) {
  /** 中文：scope freeze 不存在或多路径时立即失败，阻止修复范围漂移。 English: Missing or multi-path scope freeze fails immediately and prevents remediation drift. */
  const paths = intake.scopeFreeze?.selectedRemediationPaths;
  assert.equal(Array.isArray(paths), true, "W-P54 scope freeze must declare selected remediation paths.");
  assert.equal(paths.length, 1, "W-P54 scope freeze must declare exactly one remediation path.");
  return paths[0];
}

/**
 * 中文：从函数源码片段提取只读存在性信号。
 * English: Extracts read-only presence signals from the source segment of one function.
 *
 * @param {string} sourceText 文件全文，仅在调用期间存在。 / Full file text, retained only during this call.
 * @param {string} functionName 已冻结函数名。 / Frozen function name.
 * @returns {Record<string, number | boolean | string>} 不含源码正文的函数盘点。 / Function inventory without source body.
 */
function inspectFunction(sourceText, functionName) {
  /** 中文：逐行扫描可以稳定记录行号，同时避免把函数正文写入 evidence。 English: Line scanning records stable line numbers while keeping function bodies out of evidence. */
  const sourceLines = sourceText.split(/\r?\n/u);
  /** 中文：export function 标识是本轮唯一的节点定位规则。 English: The export-function marker is the sole node-location rule in this round. */
  const signaturePattern = new RegExp(`^export function ${escapeRegularExpression(functionName)}\\b`, "u");
  /** 中文：数组下标为零基，evidence 行号需转换为一基。 English: Array indexes are zero-based while evidence line numbers must be one-based. */
  const startIndex = sourceLines.findIndex((line) => signaturePattern.test(line));
  assert.notEqual(startIndex, -1, `Selected function ${functionName} was not found.`);
  /** 中文：下一个 export function 是本函数范围的保守结束；不分析 AST，也不执行源码。 English: Next export function is a conservative function boundary; no AST analysis or source execution occurs. */
  const endIndex = sourceLines.findIndex((line, index) => index > startIndex && /^export function\s/u.test(line));
  /** 中文：没有下一个 export 时读取至文件末尾。 English: When no next export exists, scanning continues to end of file. */
  const sliceEnd = endIndex === -1 ? sourceLines.length : endIndex;
  /** 中文：函数片段只在内存中用于计数。 English: Function slice is used in memory for counting only. */
  const functionLines = sourceLines.slice(startIndex, sliceEnd);
  /** 中文：紧邻 JSDoc 必须从声明前一行连续回溯，不能因长注释超出任意窗口而误报缺失。 English: Adjacent JSDoc must be traced continuously from the line before the declaration so a long comment is not falsely reported missing by an arbitrary window. */
  const adjacentDocBlockPresent = hasImmediatelyAdjacentDocBlock(sourceLines, startIndex);
  /** 中文：内部 locale 标记是双语存在性信号，不验证两侧含义。 English: Internal locale markers are bilingual presence signals and do not verify both meanings. */
  const bilingualInternalMarkerLineCount = functionLines.filter((line) => line.includes("<lang>")).length;
  /** 中文：流程关键词与局部声明均是审查候选，不能等同于必须逐行注释数量。 English: Flow keywords and local declarations are review candidates and cannot equal a per-line comment mandate. */
  const flowControlCandidateCount = functionLines.filter((line) => /\b(?:catch|else|for|if|switch|try|while)\b/u.test(line)).length;
  const localDeclarationCandidateCount = functionLines.filter((line) => /^\s*(?:const|let|var)\s+/u.test(line)).length;

  return {
    name: functionName,
    startLine: startIndex + 1,
    endLineExclusive: sliceEnd + 1,
    lineCount: functionLines.length,
    hasAdjacentDocBlock: adjacentDocBlockPresent,
    bilingualInternalMarkerLineCount,
    flowControlCandidateCount,
    localDeclarationCandidateCount,
    sourceBodySerialized: false
  };
}

/**
 * 中文：确认声明前是否存在连续、紧邻的 JSDoc/TSDoc block。
 * English: Confirms whether a continuous, immediately adjacent JSDoc/TSDoc block precedes a declaration.
 *
 * @param {string[]} sourceLines 文件行。 / File lines.
 * @param {number} declarationIndex 零基声明行下标。 / Zero-based declaration-line index.
 * @returns {boolean} 是否存在紧邻文档块。 / Whether an adjacent documentation block exists.
 */
function hasImmediatelyAdjacentDocBlock(sourceLines, declarationIndex) {
  /** 中文：声明前一行必须是 block 结束，否则中间存在空行或代码，不应视为紧邻文档。 English: The line before the declaration must end the block; otherwise an intervening blank/code line means it is not adjacent documentation. */
  const closingLineIndex = declarationIndex - 1;
  if (closingLineIndex < 0 || !sourceLines[closingLineIndex].trim().endsWith("*/")) {
    return false;
  }

  /** 中文：从结束标记向上仅穿过注释行，直到找到 JSDoc 起点或遇到非注释内容。 English: Walk upward from the closing marker through comment lines only until finding the JSDoc start or non-comment content. */
  for (let index = closingLineIndex; index >= 0; index -= 1) {
    /** 中文：当前行仅用于判断注释边界，不会输出到 evidence。 English: Current line is used only to determine the comment boundary and is never emitted to evidence. */
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
 * 中文：转义函数名中的正则保留字符。
 * English: Escapes regular-expression metacharacters in a function name.
 *
 * @param {string} value 函数名。 / Function name.
 * @returns {string} 安全正则片段。 / Safe regular-expression fragment.
 */
function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * 中文：提取由 scope freeze 固化的 PugDoc 观察摘要。
 * English: Extracts the PugDoc observation summary frozen by scope intake.
 *
 * @param {Record<string, unknown>} intake W-P54.1 intake evidence。 / W-P54.1 intake evidence.
 * @returns {Record<string, unknown>} 卫星只读摘要。 / Satellite read-only summary.
 */
function selectSatelliteObservation(intake) {
  /** 中文：仓库盘点列表只作为已冻结输入消费。 English: Repository inventory list is consumed only as frozen input. */
  const inventories = Array.isArray(intake.repositoryInventories) ? intake.repositoryInventories : [];
  /** 中文：卫星 id 与 W-P54.1 约定一致。 English: Satellite ID matches the W-P54.1 convention. */
  const satellite = inventories.find((item) => item && item.id === "hia-pugdoc");
  assert.notEqual(satellite, undefined, "W-P54 requires the hia-pugdoc observation inventory.");
  return {
    id: satellite.id,
    fileCount: satellite.fileCount,
    mutationPolicy: satellite.mutationPolicy,
    structuralSignals: satellite.structuralSignals,
    sourceBodySerialized: false,
    historicalCoverageClaimedComplete: false
  };
}

/**
 * 中文：把 fixture 预期与当前存在性信号组合成风险账本。
 * English: Combines fixture expectations and current presence signals into a risk ledger.
 *
 * @param {Record<string, number | boolean | string>} functionInventory 当前函数盘点。 / Current function inventory.
 * @param {Record<string, any>} fixture 历史 fixture。 / Historical fixture.
 * @returns {Record<string, unknown>} 风险账本。 / Risk ledger.
 */
function createRiskLedger(functionInventory, fixture) {
  /** 中文：预期流块数来自 W-P49，不由本轮计数回推。 English: Expected flow-block count comes from W-P49 and is not inferred from current counts. */
  const expectedFlowBlockCommentCount = fixture.expectedSignals.minimumFlowBlockCommentCount;
  return {
    priority: "high-selected-remediation",
    boundaryTags: fixture.selector.boundaryTags,
    expectedFlowBlockCommentCount,
    expectedBilingualInternalMarkers: fixture.expectedSignals.requiresBilingualInternalMarkers,
    expectedGeneratedOrBoundaryInvariant: fixture.expectedSignals.requiresGeneratedOrBoundaryInvariantWhenApplicable,
    detectedGaps: {
      adjacentPublicNodeDocBlockMissing: functionInventory.hasAdjacentDocBlock === false,
      bilingualInternalFlowMarkerGap: functionInventory.bilingualInternalMarkerLineCount < expectedFlowBlockCommentCount,
      localDeclarationReviewCandidateCount: functionInventory.localDeclarationCandidateCount,
      nonObviousFlowReviewCandidateCount: functionInventory.flowControlCandidateCount
    },
    automaticSemanticCompletenessClaim: false,
    requiredManualReview: [
      "bilingual-semantic-equivalence",
      "local-variable-domain-role-adequacy",
      "non-obvious-statement-explanation",
      "source-map-privacy-and-sidecar-boundary-accuracy",
      "generated-comment-continuity-and-manual-takeover-boundary"
    ]
  };
}

/**
 * 中文：定义 W-P54.3 的人工审查量规，清晰标注不能自动化的部分。
 * English: Defines the W-P54.3 manual-review rubric and clearly marks parts that cannot be automated.
 *
 * @returns {Record<string, unknown>[]} 量规条目。 / Rubric entries.
 */
function createReviewRubric() {
  return [
    { id: "node-contract", automaticSignal: "adjacent-doc-block", manualDecision: "public API responsibility, input, return, diagnostics, privacy, and limitations are accurately explained" },
    { id: "bilingual-equivalence", automaticSignal: "locale-marker-presence", manualDecision: "Chinese and English communicate the same constraints without material omission" },
    { id: "flow-purpose", automaticSignal: "flow-keyword-candidate-count", manualDecision: "each meaningful flow block explains intent rather than echoing syntax" },
    { id: "local-domain-role", automaticSignal: "local-declaration-candidate-count", manualDecision: "each relevant local explains its domain role, source, lifetime, mutability, or privacy purpose" },
    { id: "non-obvious-statement", automaticSignal: "none", manualDecision: "non-obvious conversion, validation, mapping, and failure statement carries an adjacent semantic explanation" },
    { id: "generated-continuity", automaticSignal: "boundary-tag-source-map", manualDecision: "upstream/downstream comment continuity, sidecar-only linkage, and human-takeover boundary remain accurate" }
  ];
}

/**
 * 中文：创建不把风险缺口误报为执行失败的盘点检查。
 * English: Creates inventory checks without misreporting risk gaps as execution failures.
 *
 * @param {{ functionInventory: Record<string, unknown>, governanceIntake: Record<string, unknown>, riskLedger: Record<string, unknown>, satelliteObservation: Record<string, unknown>, sourceMapFixture: Record<string, unknown> }} value 已计算输入。 / Calculated inputs.
 * @returns {{ id: string, status: "pass" | "fail" }[]} 检查结果。 / Check results.
 */
function createChecks(value) {
  return [
    createCheck("governance-scope-frozen", value.governanceIntake.scopeFreeze?.status === "frozen-for-wp54-2-through-wp54-6"),
    createCheck("historical-source-map-fixture-consumed", value.sourceMapFixture.id === "source-map-linkage"),
    createCheck("selected-function-located", Number(value.functionInventory.startLine) > 0 && Number(value.functionInventory.lineCount) > 0),
    createCheck("single-selected-path-preserved", value.governanceIntake.scopeFreeze?.selectedRemediationPaths?.length === 1),
    createCheck("satellite-remains-observation-only", value.satelliteObservation.mutationPolicy === "observation-only"),
    createCheck("assessment-requires-human-review", value.riskLedger.automaticSemanticCompletenessClaim === false),
    createCheck("source-body-not-serialized", value.functionInventory.sourceBodySerialized === false && value.satelliteObservation.sourceBodySerialized === false)
  ];
}

/**
 * 中文：构造统一的 pass/fail 检查对象。
 * English: Constructs a uniform pass/fail check object.
 *
 * @param {string} id 检查 id。 / Check ID.
 * @param {boolean} ok 断言结果。 / Assertion result.
 * @returns {{ id: string, status: "pass" | "fail" }} 检查对象。 / Check object.
 */
function createCheck(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

/**
 * 中文：转为 main-repo 相对路径，防止本机位置泄露。
 * English: Converts to a main-repo-relative path to prevent local-location exposure.
 *
 * @param {string} value 绝对路径。 / Absolute path.
 * @returns {string} 相对公开路径。 / Relative public path.
 */
function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

/**
 * 中文：渲染本轮唯一 fixture 的人工复核表。
 * English: Renders the manual-review table for this round's single fixture.
 *
 * @param {Record<string, unknown>} evidence 完整 evidence。 / Complete evidence.
 * @returns {string} Markdown 矩阵。 / Markdown matrix.
 */
function renderFixtureMatrix(evidence) {
  /** 中文：当前函数 metadata 不含源码正文，可安全投影。 English: Current function metadata contains no source body and is safe to project. */
  const fixture = evidence.selectedFixture;
  /** 中文：风险账本提供 W-P49 预期与当前差异。 English: Risk ledger provides W-P49 expectations and current gaps. */
  const riskLedger = fixture.riskLedger;
  return `# W-P54 ROP 审查 Fixture Matrix\n\n## 中文摘要\n\n本矩阵只覆盖已冻结的单一受控切片：${fixture.currentFunctionInventory.name}。自动计数只能提示审查优先级；下表所有“人工结论”都必须由 reviewer 针对实际源码语义作出，不能由脚本自动判定为通过。\n\n| 审查项 | 自动信号 | 当前事实 | 人工结论要求 |\n| --- | --- | --- | --- |\n| 公开节点文档 | 紧邻 doc block | ${fixture.currentFunctionInventory.hasAdjacentDocBlock} | 中英双语说明职责、输入、返回、diagnostic、privacy 与限制。 |\n| 流程块 | 内部 <lang> 行 | ${fixture.currentFunctionInventory.bilingualInternalMarkerLineCount}，W-P49 期望至少 ${riskLedger.expectedFlowBlockCommentCount} | 每个主要分段解释业务/协议意图，不能复述 if/return 语法。 |\n| 局部变量 | const/let/var 候选 | ${fixture.currentFunctionInventory.localDeclarationCandidateCount} | 相关局部变量说明领域角色、来源、生命周期、不变量或隐私目的。 |\n| 非自明语句 | 无可靠自动信号 | flow 候选 ${fixture.currentFunctionInventory.flowControlCandidateCount} | 映射、归一化、diagnostic、早退与状态聚合都要说明约束/风险。 |\n| source-map 边界 | historical source-map tag | 已选中 | 普通 doc-source-map 只保存 sidecar 引用，不读取 binding body 或 sourcesContent。 |\n| 生成注释连续性 | 需要人工核验 | 本轮后续 W-P54.5 | 单列上游/下游节点、稳定来源关联和人工接管边界；不重做 W-P52 contract/parser。 |\n\n## 卫星观察\n\nPugDoc 仅作 ${evidence.satelliteObservation.mutationPolicy} 样本，扫描文件数 ${evidence.satelliteObservation.fileCount}；本轮不修改其源码，不把该观察结论外推为卫星历史债务完成。\n\n## English summary\n\nThe single selected source-map fixture is a review target, not an automated pass. Presence signals schedule human review of semantics, local roles, privacy, and generated-comment continuity.\n`;
}

/**
 * 中文：阻止公开 evidence 出现本机路径、正文和凭据模式。
 * English: Prevents local paths, bodies, and credential patterns from appearing in public evidence.
 *
 * @param {string} value 序列化 evidence。 / Serialized evidence.
 * @param {string} label 断言上下文。 / Assertion context.
 * @returns {void} 违规时抛错。 / Throws on violation.
 */
function assertNoPrivateMarkers(value, label) {
  /** 中文：只保留触发的 pattern，不保存任何可疑匹配正文。 English: Retains only the triggered pattern and saves no suspicious match body. */
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
  /** 中文：命中即阻止落盘。 English: Any hit blocks persistence. */
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
