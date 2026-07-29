import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 中文：承载本 evidence 脚本的 main-repo 根目录；所有公开路径都相对该位置序列化。
 * English: The main-repo root that anchors this evidence script; every public
 * path is serialized relative to this location.
 *
 * @lang zh-CN 不把工作区绝对路径写入 evidence，避免泄露本机目录结构。
 * @lang en Workspace-absolute paths are never written to evidence, preventing
 * local directory-layout exposure.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 中文：工作区容器目录，仅用于读取获准卫星仓库；不会向该路径写入。
 * English: The workspace container used only to read the approved satellite
 * repository; this script never writes to this path.
 */
const workspaceDir = path.resolve(rootDir, "..");

/**
 * 中文：W-P49 第一轮 inventory 的稳定输入，用于保持治理基线可追溯。
 * English: Stable W-P49 first-round inventory input that keeps this governance
 * baseline traceable.
 */
const wp49InventoryEvidencePath = path.join(rootDir, "dist", "wp49-repository-self-doc-inventory", "evidence.json");

/**
 * 中文：本阶段只读盘点写入的独立 evidence 目录。
 * English: Dedicated evidence directory written by this phase's read-only
 * inventory.
 */
const outputRoot = path.join(rootDir, "dist", "wp54-rop-governance-intake");

/**
 * 中文：机器可读 governance intake 的输出位置。
 * English: Output location for the machine-readable governance intake.
 */
const evidencePath = path.join(outputRoot, "evidence.json");

/**
 * 中文：供人工复核 scope 与边界的中文优先摘要。
 * English: Chinese-first summary for manual review of the scope and boundary.
 */
const scopeFreezePath = path.join(outputRoot, "scope-freeze.md");

/**
 * 中文：本轮用于结构信号盘点的源码扩展名，不把生成产物或依赖目录纳入。
 * English: Source extensions used for structural signals in this round;
 * generated artifacts and dependency directories are excluded.
 */
const sourceExtensions = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx"]);

/**
 * 中文：不属于可审查源码的目录名；过滤在遍历阶段完成，避免误读第三方正文。
 * English: Directory names that are not reviewable source; filtering happens
 * during traversal so third-party bodies are never read by accident.
 */
const ignoredDirectoryNames = new Set([".git", ".runtime", "bin", "coverage", "dist", "node_modules", "obj"]);

await main();

/**
 * 中文：冻结 W-P54.1 的可修改范围，并写出不含源码正文的跨仓库结构盘点。
 * English: Freezes the W-P54.1 modifiable scope and writes a cross-repository
 * structural inventory that contains no source bodies.
 *
 * @returns {Promise<void>} 完成后写入 intake JSON 与 scope 摘要。
 * @returns {Promise<void>} Writes the intake JSON and scope summary on success.
 */
async function main() {
  /** 中文：读取既有第一轮 evidence，防止把历史基线重新解释为完成。 English: Reads first-round evidence so the historical baseline is never reinterpreted as complete. */
  const wp49Inventory = await readJson(wp49InventoryEvidencePath);
  /** 中文：W-P49 状态是本轮盘点的前置条件。 English: W-P49 status is a prerequisite for this inventory. */
  const wp49Status = wp49Inventory.status;
  assert.equal(wp49Status, "ready-for-wp49-changed-scope-annotation-quality-gate");

  /** 中文：main-repo 允许在本周期受控修复的唯一源码切片。 English: The sole main-repo source slice permitted for controlled remediation this cycle. */
  const mainRepositoryScope = createRepositoryScope({
    id: "main-repo",
    rootPath: rootDir,
    scanRoots: ["packages", "apps"],
    mutationPolicy: "selected-source-slice-only",
    selectedRemediationPaths: ["packages/source-linkage/src/index.ts"],
    owner: "HIA Documentation System core maintainers"
  });
  /** 中文：PugDoc 仅作卫星观察样本，不得由本轮直接改动。 English: PugDoc is a satellite observation sample only and must not be changed directly in this round. */
  const pugDocRepositoryScope = createRepositoryScope({
    id: "hia-pugdoc",
    rootPath: path.join(workspaceDir, "HIA", "hia-pugdoc"),
    scanRoots: ["packages", "scripts", "test"],
    mutationPolicy: "observation-only",
    selectedRemediationPaths: [],
    owner: "hia-pugdoc satellite maintainers"
  });
  /** 中文：所有参与仓库按相同的只读结构信号规则盘点，不能用数字代替人工语义审查。 English: Every participating repository is scanned with the same read-only structural signals; numbers cannot replace human semantic review. */
  const repositoryInventories = await Promise.all([mainRepositoryScope, pugDocRepositoryScope].map((scope) => inspectRepository(scope)));
  /** 中文：从盘点中抽取 main-repo 项，供受控切片门禁单独复核。 English: Extracts the main-repo inventory for separate controlled-slice checks. */
  const mainRepositoryInventory = repositoryInventories.find((inventory) => inventory.id === "main-repo");
  assert.notEqual(mainRepositoryInventory, undefined, "W-P54 requires a main-repo inventory.");

  /** 中文：将需要人工判断的 ROP 语义与可机器检测的存在性明确分开。 English: Explicitly separates ROP semantics requiring human judgment from machine-detectable presence signals. */
  const reviewBoundary = createReviewBoundary();
  /** 中文：冻结后的范围将成为 W-P54.2 至 W-P54.6 的唯一输入边界。 English: The frozen scope becomes the sole input boundary for W-P54.2 through W-P54.6. */
  const scopeFreeze = createScopeFreeze(mainRepositoryInventory, pugDocRepositoryScope, reviewBoundary);
  /** 中文：checks 只验证本阶段自身承诺，绝不声称历史注释债已消除。 English: Checks validate only this phase's commitments and never claim historic annotation debt is resolved. */
  const checks = createChecks({ mainRepositoryInventory, pugDocRepositoryScope, repositoryInventories, reviewBoundary, scopeFreeze });
  /** 中文：任何失败都阻止把范围称为 frozen，避免后续修复越界。 English: Any failure prevents the scope from being called frozen and avoids remediation scope creep. */
  const hardFailures = checks.filter((item) => item.status === "fail");

  /** 中文：evidence 只保留相对路径、计数和策略，不保存源码、请求或响应正文。 English: Evidence retains only relative paths, counts, and policies, never source/request/response bodies. */
  const evidence = {
    contract: "hia-wp54-rop-governance-intake",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp54-cross-repository-annotation-inventory" : "blocked-by-wp54-governance-intake-preconditions",
    cycleGroupId: "C-HIA-P4",
    phase: "W-P54.1",
    sourceInputs: {
      wp49RepositorySelfDocumentationInventory: normalizePath(wp49InventoryEvidencePath)
    },
    executionPolicy: {
      policy: "read-only-structural-inventory-and-selected-slice-freeze",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    scopeFreeze,
    reviewBoundary,
    repositoryInventories,
    checks
  };
  /** 中文：序列化前先验证隐私边界，错误不能落盘成正式 evidence。 English: Validates the privacy boundary before serialization so an error cannot be persisted as formal evidence. */
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P54 governance intake evidence");

  /** 中文：目录创建是此脚本唯一的文件系统副作用，且仅限 main-repo dist evidence。 English: Directory creation is this script's only filesystem side effect and is limited to main-repo dist evidence. */
  await mkdir(outputRoot, { recursive: true });
  /** 中文：JSON 是后续脚本的稳定机器输入。 English: JSON is the stable machine input for subsequent scripts. */
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  /** 中文：Markdown 保留人工可读的范围、限制与复核责任。 English: Markdown retains the human-readable scope, limits, and review responsibilities. */
  await writeFile(scopeFreezePath, renderScopeFreeze(evidence), "utf8");

  console.log(`W-P54.1 governance intake prepared at ${normalizePath(evidencePath)}`);
  console.log(`Scope status: ${evidence.status}`);
}

/**
 * 中文：标准化一个参与仓库的盘点与修复授权资料。
 * English: Normalizes inventory and remediation authorization data for a participating repository.
 *
 * @param {{ id: string, rootPath: string, scanRoots: string[], mutationPolicy: string, selectedRemediationPaths: string[], owner: string }} value 原始范围资料。 / Raw scope data.
 * @returns {{ id: string, rootPath: string, scanRoots: string[], mutationPolicy: string, selectedRemediationPaths: string[], owner: string }} 已冻结范围。 / Frozen scope.
 */
function createRepositoryScope(value) {
  /** 中文：仓库路径仅在进程内使用；输出时转换为相对公开路径。 English: The repository path is process-local only and becomes a public relative path in output. */
  const rootPath = value.rootPath;
  return { ...value, rootPath };
}

/**
 * 中文：以不输出正文的方式收集仓库结构性 ROP 信号。
 * English: Collects repository structural ROP signals without emitting bodies.
 *
 * @param {{ id: string, rootPath: string, scanRoots: string[], mutationPolicy: string, selectedRemediationPaths: string[], owner: string }} scope 已冻结仓库范围。 / Frozen repository scope.
 * @returns {Promise<Record<string, unknown>>} 公开安全的盘点摘要。 / Public-safe inventory summary.
 */
async function inspectRepository(scope) {
  /** 中文：仅遍历获准源码根，未声明根目录不会被读取。 English: Traverses approved source roots only; undeclared roots are not read. */
  const candidateFiles = (await Promise.all(scope.scanRoots.map((relativeRoot) => collectSourceFiles(path.join(scope.rootPath, relativeRoot))))).flat();
  /** 中文：按相对路径排序保证 evidence 在相同源码状态下可重复。 English: Sorting by relative path makes evidence repeatable for the same source state. */
  const orderedFiles = candidateFiles.sort((left, right) => left.localeCompare(right));
  /** 中文：每个文件只产生计数；全文在本函数返回前即丢弃。 English: Each file produces counts only; full text is discarded before this function returns. */
  const signals = await Promise.all(orderedFiles.map((filePath) => inspectFile(scope.rootPath, filePath)));
  /** 中文：聚合用于风险排序的存在性信号，不将它解释为语义质量分数。 English: Aggregates presence signals for risk ordering, never as a semantic-quality score. */
  const totals = signals.reduce((total, item) => addSignals(total, item), createEmptySignals());
  /** 中文：固定 source-linkage 受控修复路径的当前结构信号。 English: Captures current structural signals for the fixed source-linkage remediation path. */
  const selectedRemediationSignals = signals.filter((item) => scope.selectedRemediationPaths.includes(item.path));

  return {
    id: scope.id,
    owner: scope.owner,
    mutationPolicy: scope.mutationPolicy,
    scanRoots: [...scope.scanRoots],
    selectedRemediationPaths: [...scope.selectedRemediationPaths],
    fileCount: signals.length,
    structuralSignals: totals,
    selectedRemediationSignals,
    sourceBodySerialized: false,
    historicalCoverageClaimedComplete: false
  };
}

/**
 * 中文：递归收集获准根下的第一方源码文件。
 * English: Recursively collects first-party source files below an approved root.
 *
 * @param {string} directoryPath 待遍历目录。 / Directory to traverse.
 * @returns {Promise<string[]>} 绝对文件路径，仅在进程内使用。 / Process-local absolute file paths.
 */
async function collectSourceFiles(directoryPath) {
  /** 中文：不存在的可选根按空集处理，避免为卫星的不同布局制造假失败。 English: Missing optional roots are treated as empty, avoiding false failures for satellite layout differences. */
  const entries = await readdir(directoryPath, { withFileTypes: true }).catch((error) => error && error.code === "ENOENT" ? [] : Promise.reject(error));
  /** 中文：收集器按目录递归返回；没有输出任何文件正文。 English: The collector recurses by directory and emits no file body. */
  const nestedFiles = [];

  for (const entry of entries) {
    /** 中文：当前候选的绝对路径仅用于下一步文件系统操作。 English: Current candidate absolute path is used only for the next filesystem operation. */
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      /** 中文：依赖、构建与私有运行目录必须在进入前排除。 English: Dependency, build, and private runtime directories must be excluded before entering. */
      if (!ignoredDirectoryNames.has(entry.name)) {
        nestedFiles.push(...await collectSourceFiles(entryPath));
      }
      continue;
    }

    /** 中文：仅接受已声明扩展名，避免把 fixture 数据或文档正文带入统计。 English: Accepts declared extensions only, keeping fixture data and documentation bodies out of statistics. */
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      nestedFiles.push(entryPath);
    }
  }

  return nestedFiles;
}

/**
 * 中文：将单个源码文件折算为不含文本正文的结构信号。
 * English: Reduces one source file to structural signals without retaining its text body.
 *
 * @param {string} repositoryRoot 仓库根。 / Repository root.
 * @param {string} filePath 进程内绝对文件路径。 / Process-local absolute file path.
 * @returns {Promise<Record<string, number | string>>} 相对路径与计数。 / Relative path and counts.
 */
async function inspectFile(repositoryRoot, filePath) {
  /** 中文：源文本只在本地计数期间存在，绝不写入返回对象。 English: Source text exists only during local counting and is never written into the return object. */
  const sourceText = await readFile(filePath, "utf8");
  /** 中文：按行切分用来识别流程与局部声明的保守候选。 English: Line splitting supports conservative flow and local-declaration candidates. */
  const sourceLines = sourceText.split(/\r?\n/u);

  return {
    path: path.relative(repositoryRoot, filePath).replaceAll(path.sep, "/"),
    docBlockCount: countMatches(sourceText, /\/\*\*/gu),
    canonicalLocaleMarkerCount: countMatches(sourceText, /@lang\b|<lang>/gu),
    exportDeclarationCount: countMatches(sourceText, /\bexport\s+(?:async\s+)?(?:abstract\s+)?(?:class|const|enum|function|interface|type|let|var)\b/gu),
    functionLikeDeclarationCount: countMatches(sourceText, /\b(?:async\s+)?function\b|=>\s*(?:\{|[^\n])/gu),
    flowControlCandidateCount: sourceLines.filter((line) => /\b(?:catch|else|for|if|switch|try|while)\b/u.test(line)).length,
    localDeclarationCandidateCount: sourceLines.filter((line) => /^\s*(?:const|let|var)\s+/u.test(line)).length,
    ordinaryCommentLineCount: sourceLines.filter((line) => /^\s*(?:\/\/|\/\*|\*)/u.test(line)).length
  };
}

/**
 * 中文：创建全零的可加结构信号对象。
 * English: Creates an all-zero additive structural-signal object.
 *
 * @returns {Record<string, number>} 全零计数。 / All-zero counts.
 */
function createEmptySignals() {
  return {
    canonicalLocaleMarkerCount: 0,
    docBlockCount: 0,
    exportDeclarationCount: 0,
    flowControlCandidateCount: 0,
    functionLikeDeclarationCount: 0,
    localDeclarationCandidateCount: 0,
    ordinaryCommentLineCount: 0
  };
}

/**
 * 中文：将一个文件的结构信号加入仓库总量。
 * English: Adds one file's structural signals into repository totals.
 *
 * @param {Record<string, number>} total 已累计总量。 / Accumulated total.
 * @param {Record<string, number | string>} item 单文件信号。 / Single-file signals.
 * @returns {Record<string, number>} 新的累计总量。 / New accumulated total.
 */
function addSignals(total, item) {
  /** 中文：返回新对象保持 reducer 无副作用，使统计更容易审查。 English: Returning a new object keeps the reducer side-effect free and easier to review. */
  return {
    canonicalLocaleMarkerCount: total.canonicalLocaleMarkerCount + Number(item.canonicalLocaleMarkerCount),
    docBlockCount: total.docBlockCount + Number(item.docBlockCount),
    exportDeclarationCount: total.exportDeclarationCount + Number(item.exportDeclarationCount),
    flowControlCandidateCount: total.flowControlCandidateCount + Number(item.flowControlCandidateCount),
    functionLikeDeclarationCount: total.functionLikeDeclarationCount + Number(item.functionLikeDeclarationCount),
    localDeclarationCandidateCount: total.localDeclarationCandidateCount + Number(item.localDeclarationCandidateCount),
    ordinaryCommentLineCount: total.ordinaryCommentLineCount + Number(item.ordinaryCommentLineCount)
  };
}

/**
 * 中文：统计正则匹配数量，并避免调用方保存匹配正文。
 * English: Counts regular-expression matches without letting callers retain match bodies.
 *
 * @param {string} value 待统计的短期文本。 / Ephemeral text to count.
 * @param {RegExp} expression 全局正则。 / Global regular expression.
 * @returns {number} 匹配数量。 / Match count.
 */
function countMatches(value, expression) {
  return [...value.matchAll(expression)].length;
}

/**
 * 中文：建立人工语义审查与机器存在性检查之间不可跨越的边界。
 * English: Establishes the non-crossable boundary between human semantic review and machine presence checks.
 *
 * @returns {Record<string, unknown>} 复核边界说明。 / Review-boundary description.
 */
function createReviewBoundary() {
  return {
    machineDetectableSignals: [
      "doc-block-presence",
      "canonical-locale-marker-presence",
      "declaration-and-flow-candidate-count",
      "selected-path-membership"
    ],
    humanReviewRequired: [
      "bilingual-semantic-equivalence",
      "local-variable-domain-role-adequacy",
      "non-obvious-statement-explanation",
      "privacy-and-terminology-accuracy",
      "generated-comment-continuity-and-manual-takeover-boundary"
    ],
    automaticSemanticCompletenessClaim: false,
    historicalDebtResolvedClaim: false
  };
}

/**
 * 中文：用当前结构事实构造后续阶段必须遵守的 scope freeze。
 * English: Constructs the scope freeze that later phases must respect using current structural facts.
 *
 * @param {Record<string, unknown>} mainInventory main-repo 盘点。 / Main-repo inventory.
 * @param {{ id: string, mutationPolicy: string, selectedRemediationPaths: string[], owner: string }} pugDocScope PugDoc 范围。 / PugDoc scope.
 * @param {Record<string, unknown>} reviewBoundary 人工/机器边界。 / Human/machine boundary.
 * @returns {Record<string, unknown>} 冻结范围。 / Frozen scope.
 */
function createScopeFreeze(mainInventory, pugDocScope, reviewBoundary) {
  return {
    status: "frozen-for-wp54-2-through-wp54-6",
    sourceMutationAuthorized: true,
    sourceMutationRepositoryId: mainInventory.id,
    selectedRemediationPaths: mainInventory.selectedRemediationPaths,
    selectedRemediationOwner: mainInventory.owner,
    satelliteObservationRepositoryId: pugDocScope.id,
    satelliteMutationPolicy: pugDocScope.mutationPolicy,
    targetRepositoryAccess: "prohibited",
    providerNetworkAccess: "prohibited",
    hostEditorWrite: "prohibited",
    checkedApply: "prohibited",
    automaticBulkAnnotation: "prohibited",
    reviewBoundaryReference: {
      automaticSemanticCompletenessClaim: reviewBoundary.automaticSemanticCompletenessClaim,
      historicalDebtResolvedClaim: reviewBoundary.historicalDebtResolvedClaim
    }
  };
}

/**
 * 中文：生成 intake 的硬性前置检查。
 * English: Produces hard prerequisite checks for the intake.
 *
 * @param {{ mainRepositoryInventory: Record<string, unknown>, pugDocRepositoryScope: Record<string, unknown>, repositoryInventories: Record<string, unknown>[], reviewBoundary: Record<string, unknown>, scopeFreeze: Record<string, unknown> }} value 已计算治理输入。 / Calculated governance input.
 * @returns {{ id: string, status: "pass" | "fail" }[]} 检查结果。 / Check results.
 */
function createChecks(value) {
  return [
    createCheck("main-repository-inventory-present", Number(value.mainRepositoryInventory.fileCount) > 0),
    createCheck("single-selected-remediation-path", Array.isArray(value.mainRepositoryInventory.selectedRemediationPaths) && value.mainRepositoryInventory.selectedRemediationPaths.length === 1),
    createCheck("satellite-is-observation-only", value.pugDocRepositoryScope.mutationPolicy === "observation-only" && value.pugDocRepositoryScope.selectedRemediationPaths.length === 0),
    createCheck("participating-repositories-inventoried", value.repositoryInventories.length === 2 && value.repositoryInventories.every((item) => Number(item.fileCount) > 0)),
    createCheck("human-review-not-automated-away", value.reviewBoundary.automaticSemanticCompletenessClaim === false && value.reviewBoundary.historicalDebtResolvedClaim === false),
    createCheck("target-provider-and-host-writes-prohibited", value.scopeFreeze.targetRepositoryAccess === "prohibited" && value.scopeFreeze.providerNetworkAccess === "prohibited" && value.scopeFreeze.hostEditorWrite === "prohibited"),
    createCheck("source-body-not-serialized", value.repositoryInventories.every((item) => item.sourceBodySerialized === false))
  ];
}

/**
 * 中文：把布尔断言转换为稳定的 evidence 检查形态。
 * English: Converts a boolean assertion into a stable evidence-check form.
 *
 * @param {string} id 检查标识。 / Check identifier.
 * @param {boolean} ok 是否通过。 / Whether the check passes.
 * @returns {{ id: string, status: "pass" | "fail" }} 标准化检查。 / Normalized check.
 */
function createCheck(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

/**
 * 中文：读取 JSON 输入；调用者必须对其 contract/status 做显式断言。
 * English: Reads a JSON input; callers must explicitly assert its contract/status.
 *
 * @param {string} inputPath 输入文件位置。 / Input file location.
 * @returns {Promise<Record<string, unknown>>} 已解析 JSON。 / Parsed JSON.
 */
async function readJson(inputPath) {
  /** 中文：文本只在 JSON 解析期间存在，返回值不包含原始 buffer。 English: Text exists only during JSON parsing; the result contains no raw buffer. */
  const inputText = await readFile(inputPath, "utf8");
  return JSON.parse(inputText);
}

/**
 * 中文：将进程内绝对路径规范为 main-repo 相对公开路径。
 * English: Normalizes a process-local absolute path into a main-repo-relative public path.
 *
 * @param {string} value 进程内绝对路径。 / Process-local absolute path.
 * @returns {string} 公开相对路径。 / Public relative path.
 */
function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

/**
 * 中文：渲染人工审查使用的中文优先 scope freeze 摘要。
 * English: Renders the Chinese-first scope-freeze summary for manual review.
 *
 * @param {Record<string, unknown>} evidence 完整 intake evidence。 / Complete intake evidence.
 * @returns {string} Markdown 摘要。 / Markdown summary.
 */
function renderScopeFreeze(evidence) {
  /** 中文：main-repo 摘要只引用计数和相对路径。 English: The main-repo summary cites counts and relative paths only. */
  const mainRepository = evidence.repositoryInventories.find((item) => item.id === "main-repo");
  /** 中文：PugDoc 摘要明确标出观察而非修复授权。 English: The PugDoc summary explicitly marks observation rather than remediation authority. */
  const pugDocRepository = evidence.repositoryInventories.find((item) => item.id === "hia-pugdoc");
  return `# W-P54.1 ROP 治理范围冻结\n\n## 中文摘要\n\n本文件冻结 W-P54 的第一轮治理边界。它使用结构性存在信号来安排人工审查，**不**把注释数量、@lang 或 <lang> 标记数量解释为注释语义充分、历史债务已经完成，亦不允许自动批量补注释。\n\n## 获准范围\n\n| 仓库 | owner | 扫描文件数 | 策略 | 本轮源码变更 |\n| --- | --- | ---: | --- | --- |\n| main-repo | ${mainRepository.owner} | ${mainRepository.fileCount} | ${mainRepository.mutationPolicy} | ${mainRepository.selectedRemediationPaths.join(", ")} |\n| hia-pugdoc | ${pugDocRepository.owner} | ${pugDocRepository.fileCount} | ${pugDocRepository.mutationPolicy} | 无；仅观察 |\n\n## 禁止边界\n\n- 不访问或改动目标项目仓库。\n- 不调用 provider/network，不打开 host editor write 或 checked apply。\n- 不对全仓或卫星仓库执行 AI 自动补注释。\n- 不把普通 source map、doc-source-map 或 generated binding contract 重新设计为本周期内容。\n\n## 审查责任分界\n\n机器只检查 doc block、locale marker、声明/流程候选和受控路径归属等存在性信号。下列事项必须人工复核：中英语义对等、局部变量领域角色、非自明语句解释、术语与 privacy 正确性，以及生成注释的上下游连续性与人工接管边界。\n\n## 结构信号（非质量评分）\n\n| 仓库 | doc block | canonical locale marker | export 候选 | flow 候选 | local declaration 候选 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n| main-repo | ${mainRepository.structuralSignals.docBlockCount} | ${mainRepository.structuralSignals.canonicalLocaleMarkerCount} | ${mainRepository.structuralSignals.exportDeclarationCount} | ${mainRepository.structuralSignals.flowControlCandidateCount} | ${mainRepository.structuralSignals.localDeclarationCandidateCount} |\n| hia-pugdoc | ${pugDocRepository.structuralSignals.docBlockCount} | ${pugDocRepository.structuralSignals.canonicalLocaleMarkerCount} | ${pugDocRepository.structuralSignals.exportDeclarationCount} | ${pugDocRepository.structuralSignals.flowControlCandidateCount} | ${pugDocRepository.structuralSignals.localDeclarationCandidateCount} |\n\n## English summary\n\nThe scope is frozen for a single controlled main-repo remediation slice and an observation-only PugDoc satellite sample. Structural signals schedule review; they never claim semantic completeness or retirement of historical annotation debt.\n`;
}

/**
 * 中文：拒绝把本机路径、凭据、source body policy 违例写入 evidence。
 * English: Rejects local paths, credentials, and source-body policy violations from evidence.
 *
 * @param {string} value 待检查序列化文本。 / Serialized text to inspect.
 * @param {string} label 断言上下文。 / Assertion context.
 * @returns {void} 违反时抛出断言错误。 / Throws an assertion error on violation.
 */
function assertNoPrivateMarkers(value, label) {
  /** 中文：模式只检查不应出现在公开 evidence 的标识，不解析或记录任何命中正文。 English: Patterns inspect only identifiers forbidden from public evidence and never record matched bodies. */
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
  /** 中文：仅保留命中的 pattern，避免把敏感文本带入异常。 English: Retains the matching pattern only, avoiding sensitive text in the error. */
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
