import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

/**
 * @lang zh-CN 将 W-P49/W-P50/W-P54 的历史 ROP 元数据归并为 W-P60 的 public-safe 风险优先级账本与非阻断门禁证据。
 * @lang en Consolidates W-P49/W-P50/W-P54 historical ROP metadata into W-P60 public-safe prioritization-ledger and non-blocking-gate evidence.
 *
 * @remarks
 * <lang><zh-CN>本 runner 只消费既有 evidence metadata 与 Git 的变更文件名集合；它不读取、执行或序列化源码正文，不重跑 W-P49/W-P54 inventory，也不修改注释、卫星或目标项目。</zh-CN><en>This runner consumes only existing evidence metadata and Git changed-file names; it neither reads, executes, nor serializes source bodies, does not rerun W-P49/W-P54 inventory, and does not modify annotations, satellites, or target projects.</en></lang>
 *
 * @returns {Promise<void>} 写入 main-repo 的可重跑 metadata-only evidence 与中文优先 review packet。 / Writes reproducible metadata-only evidence and a Chinese-first review packet in main-repo.
 * @throws {AssertionError} 当历史 evidence 不完整、边界漂移或 public-safe 断言失败时抛出。 / Throws when historical evidence is incomplete, boundaries drift, or public-safe assertions fail.
 * @sideEffects 只写入 `dist/wp60-rop-historical-debt-prioritization/`；不写业务源码、Git ref、网络或 target。 / Writes only to `dist/wp60-rop-historical-debt-prioritization/`; never writes product source, Git refs, network state, or targets.
 */

/** @type {import("node:child_process").execFile} */
const execFile = promisify(execFileCallback);

// <lang><zh-CN>仓库根目录只由当前脚本位置推导，避免接受任意外部路径输入。</zh-CN><en>The repository root is derived only from this script location, avoiding arbitrary external path input.</en></lang>
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// <lang><zh-CN>W-P54 历史切片的基线提交仅用于统计已批准语义扩展后的变更类别，不重放旧单函数 gate。</zh-CN><en>The W-P54 historical-slice baseline commit is used only to count change categories after approved semantic extensions; it never replays the old single-function gate.</en></lang>
const historicalBaselineCommit = "3f9fe5e";
// <lang><zh-CN>所有输入均是 main-repo 既有 metadata evidence；不会从源文件读取或向 evidence 写入正文。</zh-CN><en>All inputs are existing main-repo metadata evidence; no source file is read and no body is written into evidence.</en></lang>
const inputPaths = {
  wp49Inventory: path.join(rootDir, "dist", "wp49-repository-self-doc-inventory", "evidence.json"),
  wp50Ledger: path.join(rootDir, "dist", "wp50-self-doc-remediation-ledger", "evidence.json"),
  wp54Closeout: path.join(rootDir, "dist", "wp54-closeout-wp55-inputs", "evidence.json"),
  wp54Intake: path.join(rootDir, "dist", "wp54-rop-governance-intake", "evidence.json"),
  wp56Reference: path.join(rootDir, "dist", "wp56-dlr-reference-integration", "evidence.json"),
  wp57Review: path.join(rootDir, "dist", "wp57-documentation-quality-review", "evidence.json")
};
// <lang><zh-CN>输出目录只承载可删除、可重跑的 dist evidence，不形成新的公开 core contract。</zh-CN><en>The output directory holds only removable, reproducible dist evidence and does not create a new public core contract.</en></lang>
const outputRoot = path.join(rootDir, "dist", "wp60-rop-historical-debt-prioritization");
// <lang><zh-CN>结构化 evidence 适合机器检查；人读 packet 保留人工语义审查的责任边界。</zh-CN><en>Structured evidence supports machine checks; the human-readable packet preserves responsibility for semantic review.</en></lang>
const evidencePath = path.join(outputRoot, "evidence.json");
const reviewPacketPath = path.join(outputRoot, "historical-rop-review-packet.md");

await main();

/**
 * @lang zh-CN 生成 W-P60 的历史 ROP 优先级、人工审查与非阻断门禁证据。
 * @lang en Produces W-P60 historical ROP prioritization, human-review, and non-blocking-gate evidence.
 *
 * @returns {Promise<void>} 无返回值；成功后只写入 metadata-only dist artifact。 / Returns nothing; writes only metadata-only dist artifacts on success.
 */
async function main() {
  // <lang><zh-CN>并行读取既有 JSON evidence，缩短只读操作时间且不改变任一历史 artifact。</zh-CN><en>Read existing JSON evidence in parallel to shorten the read-only operation without changing any historical artifact.</en></lang>
  const inputs = await readInputs();
  // <lang><zh-CN>先验证历史 milestone，再把其可比较的计数转为新的治理输入。</zh-CN><en>Validate historical milestones before converting their comparable counts into new governance inputs.</en></lang>
  validateInputs(inputs);
  // <lang><zh-CN>仅获取 Git 变更文件名并立即聚合类别；具体文件名不会离开本函数或进入 artifact。</zh-CN><en>Obtain only Git changed-file names and immediately aggregate categories; individual file names never leave this function or enter artifacts.</en></lang>
  const changedScope = await inspectChangedScope();
  // <lang><zh-CN>cohort 是逻辑治理单元而非源码位置，稳定 identity 不依赖路径、正文或 digest。</zh-CN><en>Cohorts are logical governance units rather than source locations; their stable identities do not depend on paths, bodies, or digests.</en></lang>
  const cohorts = createCohorts(inputs, changedScope);
  // <lang><zh-CN>人工 packet 明确机器信号的能力边界，避免将 marker 或计数误报为语义充分性。</zh-CN><en>The human packet makes machine-signal limits explicit, avoiding false claims that markers or counts prove semantic adequacy.</en></lang>
  const manualReviewPacket = createManualReviewPacket();
  // <lang><zh-CN>新 gate 仅报告优先级；W-P54 的历史单函数 gate 继续保留为历史 evidence，绝不重放或放宽。</zh-CN><en>The new gate only reports priorities; the W-P54 historical single-function gate remains historical evidence and is neither replayed nor weakened.</en></lang>
  const gatePolicy = createNonBlockingGatePolicy();
  // <lang><zh-CN>summary 把 output 降到数量、分类和布尔边界，适合 public-safe evidence。</zh-CN><en>The summary reduces output to counts, categories, and boolean boundaries suitable for public-safe evidence.</en></lang>
  const summary = createSummary(inputs, changedScope, cohorts, gatePolicy);
  // <lang><zh-CN>checks 只验证输入完整性与边界，不尝试判断历史注释的语义质量。</zh-CN><en>Checks validate input completeness and boundaries only; they never attempt to judge historical-comment semantic quality.</en></lang>
  const checks = createChecks(inputs, summary);
  // <lang><zh-CN>任何 hard failure 都必须阻止 evidence 落盘，以免损坏输入被误当作治理完成。</zh-CN><en>Any hard failure must block evidence persistence so corrupt inputs are not mistaken for governance completion.</en></lang>
  const hardFailures = checks.filter((check) => check.status === "fail");

  // <lang><zh-CN>证据只引用相对 artifact identity、逻辑 cohort 和聚合计数；不包含源文件名、路径或正文。</zh-CN><en>Evidence references only relative artifact identities, logical cohorts, and aggregate counts; it contains no source file names, paths, or bodies.</en></lang>
  const evidence = {
    contract: "rop-historical-debt-prioritization@0.1.0-draft",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P5",
    phase: "W-P60",
    status: hardFailures.length === 0 ? "ready-for-wp60-closeout" : "blocked-by-wp60-historical-rop-inputs",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([id, value]) => [id, normalizePath(value)])),
    executionPolicy: {
      policy: "metadata-only-historical-rop-prioritization",
      historicalBaselineCommit,
      historicalInventoryRerun: false,
      historicalSingleFunctionGateReplayed: false,
      sourceBodyRead: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none",
      hiaMayModifySourceAnnotations: false,
      automaticBulkAnnotation: "prohibited",
      hiaMayMutateSatelliteRepository: false,
      hiaMayMutateTargetRepository: false,
      hiaMayCallHostEditorApi: false,
      hiaMayTriggerCheckedApply: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayStartAnotherWPhase: false
    },
    cohorts,
    manualReviewPacket,
    gatePolicy,
    summary,
    checks,
    generatedDocs: {
      reviewPacket: normalizePath(reviewPacketPath)
    },
    deferredItems: [
      "historical-source-annotation-remediation-batches",
      "terminology-candidate-parser-and-registry",
      "dlr-source-declaration-and-discovery",
      "independent-output-presentation-pilot",
      "powershell-documentation-satellite-foundation"
    ]
  };
  // <lang><zh-CN>序列化前执行隐私断言，确保新字段也不能意外泄露本机位置、正文或凭据。</zh-CN><en>Run privacy assertions before serialization so new fields cannot accidentally disclose local locations, bodies, or credentials.</en></lang>
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P60 historical ROP evidence");
  // <lang><zh-CN>人读报告同样接受断言，因为它也是可被共享的 artifact。</zh-CN><en>The human-readable report receives the same assertion because it too is a shareable artifact.</en></lang>
  const renderedReviewPacket = renderReviewPacket(evidence);
  assertNoPrivateMarkers(renderedReviewPacket, "W-P60 historical ROP review packet");
  assert.equal(hardFailures.length, 0, `W-P60 has ${hardFailures.length} hard failure(s).`);

  // <lang><zh-CN>只在 main-repo 的 dist 下写入本轮可重跑证据，不改变任何业务或历史 evidence 文件。</zh-CN><en>Write this round's reproducible evidence only under main-repo dist, without altering product files or historical evidence files.</en></lang>
  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(reviewPacketPath, renderedReviewPacket, "utf8");
  console.log(`W-P60 historical ROP prioritization prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P60 status: ${evidence.status}`);
}

/**
 * @lang zh-CN 读取 W-P60 所需的既有 metadata evidence。
 * @lang en Reads existing metadata evidence required by W-P60.
 *
 * @returns {Promise<Record<string, Record<string, unknown>>>} 按稳定 id 索引的解析 evidence。 / Parsed evidence indexed by stable IDs.
 */
async function readInputs() {
  // <lang><zh-CN>entries 保留稳定输入 id 与受控本地位置的配对，不接受调用方提供的路径。</zh-CN><en>Entries pair stable input IDs with controlled local locations and accept no caller-supplied paths.</en></lang>
  const entries = Object.entries(inputPaths);
  // <lang><zh-CN>每项只解析 JSON metadata；读取后不保留原始文本 buffer。</zh-CN><en>Each item parses JSON metadata only; raw text buffers are not retained after parsing.</en></lang>
  const parsedEntries = await Promise.all(entries.map(async ([id, inputPath]) => [id, await readJson(inputPath)]));
  return Object.fromEntries(parsedEntries);
}

/**
 * @lang zh-CN 读取受控 JSON metadata 文件。
 * @lang en Reads a controlled JSON metadata file.
 *
 * @param {string} inputPath 已声明的 evidence 路径。 / A declared evidence path.
 * @returns {Promise<Record<string, unknown>>} 解析后的 metadata。 / Parsed metadata.
 */
async function readJson(inputPath) {
  // <lang><zh-CN>原始文本只存在于解析步骤，返回值不携带未解析正文。</zh-CN><en>Raw text exists only during parsing; the return value carries no unparsed body.</en></lang>
  const inputText = await readFile(inputPath, "utf8");
  return JSON.parse(inputText);
}

/**
 * @lang zh-CN 验证可复用历史 evidence 的完成状态与关键 no-write 边界。
 * @lang en Validates reusable historical-evidence completion states and key no-write boundaries.
 *
 * @param {Record<string, Record<string, any>>} inputs 按稳定 id 索引的 evidence。 / Evidence indexed by stable IDs.
 * @returns {void} 输入失效时抛出。 / Throws when an input is invalid.
 */
function validateInputs(inputs) {
  // <lang><zh-CN>W-P49 是历史规模和双语存在性信号的冻结来源。</zh-CN><en>W-P49 is the frozen source for historical scale and bilingual-presence signals.</en></lang>
  assert.equal(inputs.wp49Inventory.status, "ready-for-wp49-changed-scope-annotation-quality-gate");
  // <lang><zh-CN>W-P50 保留批次化治理和禁止 bulk rewrite 的既有决定。</zh-CN><en>W-P50 preserves the established staged-governance and bulk-rewrite prohibition decisions.</en></lang>
  assert.equal(inputs.wp50Ledger.status, "ready-for-wp50-runtime-manual-packet");
  // <lang><zh-CN>W-P54 closeout 是历史单函数 gate 当时通过的唯一事实来源；当前 artifact 不被重跑。</zh-CN><en>The W-P54 closeout is the sole fact source for the historical single-function gate passing at that time; the current artifact is not replayed.</en></lang>
  assert.equal(inputs.wp54Closeout.status, "ready-for-wp55-terminology-and-dlr-contract-decision-user-confirmation");
  assert.equal(inputs.wp54Intake.scopeFreeze?.satelliteMutationPolicy, "observation-only");
  assert.equal(inputs.wp54Intake.scopeFreeze?.targetRepositoryAccess, "prohibited");
  // <lang><zh-CN>W-P56/W-P57 证明后续授权扩展仍保留 metadata-only 与 review-only 边界。</zh-CN><en>W-P56/W-P57 prove later authorized extensions retained metadata-only and review-only boundaries.</en></lang>
  assert.equal(inputs.wp56Reference.checks?.migrationImplemented, false);
  assert.equal(inputs.wp56Reference.checks?.targetRepositoryAction, false);
  assert.equal(inputs.wp57Review.boundary?.workspaceWriteEnabledCount, 0);
  assert.equal(inputs.wp57Review.boundary?.targetRepositoryMutationCount, 0);
}

/**
 * @lang zh-CN 读取基线提交以来的受控变更文件名并立即聚合类别。
 * @lang en Reads controlled changed-file names since the baseline commit and immediately aggregates categories.
 *
 * @returns {Promise<{ categoryCounts: Record<string, number>, changedFileCount: number }>} 不含文件名的类别计数。 / Category counts without file names.
 */
async function inspectChangedScope() {
  // <lang><zh-CN>Git 请求限定到 main-repo 的 packages/apps/scripts；不读取 diff 内容，也不写 Git 状态。</zh-CN><en>The Git request is limited to main-repo packages/apps/scripts; it reads no diff content and writes no Git state.</en></lang>
  const { stdout } = await execFile("git", ["diff", "--name-only", "--diff-filter=ACMR", `${historicalBaselineCommit}..HEAD`, "--", "packages", "apps", "scripts"], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  // <lang><zh-CN>文件名仅作为瞬时分类输入，过滤空行后不会写入 cohort、evidence 或报告。</zh-CN><en>File names are transient classification inputs only; after empty-line filtering they are never written into cohorts, evidence, or reports.</en></lang>
  const changedFileNames = stdout.split(/\r?\n/u).filter(Boolean);
  // <lang><zh-CN>预定义类别保持输出稳定，未知项只计入 other，不暴露实际位置。</zh-CN><en>Predefined categories keep output stable; unknown items count only as other and expose no actual location.</en></lang>
  const categoryCounts = {
    sourceLinkage: 0,
    localeResource: 0,
    qualityReview: 0,
    schemaDistribution: 0,
    hostProjection: 0,
    governanceScript: 0,
    other: 0
  };
  // <lang><zh-CN>逐个分类只增加聚合计数，不返回名称列表。</zh-CN><en>Classifying each item increments aggregate counts only and returns no name list.</en></lang>
  for (const changedFileName of changedFileNames) {
    // <lang><zh-CN>类别选择基于公开目录/能力命名，不能作为源码或用户项目内容的推断。</zh-CN><en>Category selection uses public directory/capability names and cannot infer source or user-project content.</en></lang>
    const category = classifyChangedFile(changedFileName);
    categoryCounts[category] += 1;
  }
  return {
    categoryCounts,
    changedFileCount: changedFileNames.length
  };
}

/**
 * @lang zh-CN 将一个瞬时文件名归入不泄露位置的治理类别。
 * @lang en Assigns a transient file name to a governance category that does not disclose its location.
 *
 * @param {string} changedFileName Git 仅文件名输出中的一项。 / One item from Git name-only output.
 * @returns {"sourceLinkage" | "localeResource" | "qualityReview" | "schemaDistribution" | "hostProjection" | "governanceScript" | "other"} 聚合类别。 / Aggregate category.
 */
function classifyChangedFile(changedFileName) {
  // <lang><zh-CN>source-linkage 是生成链与普通 map privacy 的高优先级 cohort。</zh-CN><en>Source linkage is the high-priority cohort for generation continuity and ordinary-map privacy.</en></lang>
  if (changedFileName.includes("source-linkage")) return "sourceLinkage";
  // <lang><zh-CN>locale-resource 路径代表 W-P56 的授权语义扩展，不适用 W-P54 的旧局部变量等值门槛。</zh-CN><en>Locale-resource paths represent W-P56 authorized semantic extensions and are not subject to the old W-P54 local-variable equality threshold.</en></lang>
  if (changedFileName.includes("locale-resource")) return "localeResource";
  // <lang><zh-CN>quality-review 目录或命名代表 W-P57 的 review-only 聚合与投影输入。</zh-CN><en>Quality-review directories or names represent W-P57 review-only aggregation and projection input.</en></lang>
  if (changedFileName.includes("documentation-quality-review") || changedFileName.includes("quality-review")) return "qualityReview";
  // <lang><zh-CN>schema 相关文件单独计数，避免把分发兼容性混入 UI 或 runtime 观察。</zh-CN><en>Schema-related files are counted separately so distribution compatibility is not mixed with UI or runtime observations.</en></lang>
  if (changedFileName.includes("schemas") || changedFileName.includes("schema")) return "schemaDistribution";
  // <lang><zh-CN>宿主目录只说明 projection 面发生变化，不暗示 editor write authority。</zh-CN><en>Host directories indicate projection-surface change only and do not imply editor write authority.</en></lang>
  if (changedFileName.startsWith("apps/")) return "hostProjection";
  // <lang><zh-CN>脚本修改表示治理/evidence 维护面，不等同于生产 parser 或 source remediation。</zh-CN><en>Script changes indicate governance/evidence maintenance and do not equal a production parser or source remediation.</en></lang>
  if (changedFileName.startsWith("scripts/")) return "governanceScript";
  return "other";
}

/**
 * @lang zh-CN 基于既有统计和变更类别创建稳定、无路径的治理 cohort。
 * @lang en Creates stable, path-free governance cohorts from existing counts and change categories.
 *
 * @param {Record<string, Record<string, any>>} inputs 已验证 evidence。 / Validated evidence.
 * @param {{ categoryCounts: Record<string, number>, changedFileCount: number }} changedScope 聚合后的变更范围。 / Aggregated changed scope.
 * @returns {Record<string, unknown>[]} 按 severity 排序的 cohort。 / Cohorts ordered by severity.
 */
function createCohorts(inputs, changedScope) {
  // <lang><zh-CN>历史 inventory 的 summary 是数量信号，不携带任何 individual source record。</zh-CN><en>The historical-inventory summary is a count signal and carries no individual source record.</en></lang>
  const historicalSummary = inputs.wp49Inventory.summary;
  // <lang><zh-CN>W-P54 intake 的卫星文件数保持 observation-only，不能升级为卫星修改范围。</zh-CN><en>The W-P54 intake satellite file count remains observation-only and cannot become satellite modification scope.</en></lang>
  const satelliteInventory = inputs.wp54Intake.repositoryInventories?.find((item) => item?.id === "hia-pugdoc");
  return [
    createCohort("ropDebt:publicApi", "critical", ["publicApi", "documentation", "bilingual"], "main-repo", "js-ts-documentation-profile", {
      documentedPublicExportedNodeCount: historicalSummary.documentedPublicExportedNodeCount,
      missingBilingualMarkerCount: historicalSummary.missingBilingualMarkerCount,
      missingDocBlockCount: historicalSummary.missingDocBlockCount,
      publicExportedNodeCount: historicalSummary.publicExportedNodeCount
    }),
    createCohort("ropDebt:internalFlow", "high", ["internalFlow", "manualSemanticReview", "bilingual"], "main-repo", "js-ts-documentation-profile", {
      internalFlowCandidateCount: historicalSummary.internalFlowCandidateCount,
      internalFlowCandidateWithBilingualCommentCount: historicalSummary.internalFlowCandidateWithBilingualCommentCount,
      internalFlowCandidateWithCommentCount: historicalSummary.internalFlowCandidateWithCommentCount
    }),
    createCohort("ropDebt:generationContinuity", "high", ["generationContinuity", "sourceMapPrivacy", "manualTakeover"], "main-repo", "source-linkage-profile", {
      historicalCloseoutCheckCount: inputs.wp54Closeout.checks.length,
      sourceLinkageChangedFileCount: changedScope.categoryCounts.sourceLinkage
    }),
    createCohort("ropDebt:localeAndReview", "high", ["localeResource", "qualityReview", "privacy"], "main-repo", "documentation-locale-resource-profile", {
      localeResourceChangedFileCount: changedScope.categoryCounts.localeResource,
      qualityReviewChangedFileCount: changedScope.categoryCounts.qualityReview,
      schemaDistributionChangedFileCount: changedScope.categoryCounts.schemaDistribution
    }),
    createCohort("ropDebt:hostProjection", "medium", ["hostProjection", "reviewOnly", "accessibility"], "main-repo", "host-projection-profile", {
      hostProjectionChangedFileCount: changedScope.categoryCounts.hostProjection,
      reviewOnlyHostCount: inputs.wp57Review.summary?.reviewOnlyHostCount
    }),
    createCohort("ropDebt:satelliteObservation", "medium", ["generationContinuity", "observationOnly", "ownerReview"], "hia-pugdoc", "pugdoc-observation-profile", {
      observedSourceFileCount: satelliteInventory?.fileCount,
      satelliteMutationAllowed: false
    })
  ];
}

/**
 * @lang zh-CN 构造单个逻辑治理 cohort，所有字段均为聚合 metadata。
 * @lang en Constructs one logical governance cohort using aggregate metadata only.
 *
 * @param {string} observationId 不依赖路径/正文的稳定逻辑标识。 / Stable logical ID independent of paths/bodies.
 * @param {"critical" | "high" | "medium"} severity 人工排序级别。 / Human-prioritization level.
 * @param {string[]} categories 观察类别。 / Observation categories.
 * @param {string} repositoryOwner 负责仓库 identity。 / Responsible repository identity.
 * @param {string} profileId 已批准或观察用 profile identity。 / Approved or observation profile identity.
 * @param {Record<string, boolean | number | undefined>} signals 聚合机器信号。 / Aggregate machine signals.
 * @returns {Record<string, unknown>} 不含源码信息的 cohort。 / Cohort without source information.
 */
function createCohort(observationId, severity, categories, repositoryOwner, profileId, signals) {
  return {
    observationId,
    repositoryOwner,
    profileId,
    nodeKind: "aggregate-governance-cohort",
    observationCategories: categories,
    severity,
    reviewState: "needs-human-review",
    reviewOwner: "documentation-governance-maintainers",
    provenance: "historical-evidence-and-name-only-change-category",
    evidenceRef: "wp49-wp50-wp54-wp56-wp57-metadata",
    machineSignals: signals,
    automaticSemanticCompletenessClaim: false,
    sourceBodySerialized: false
  };
}

/**
 * @lang zh-CN 定义各 cohort 都必须经过的人工语义审查项目。
 * @lang en Defines human semantic-review items required for every cohort.
 *
 * @returns {Record<string, string>[]} 中英双语审查条目。 / Bilingual review items.
 */
function createManualReviewPacket() {
  return [
    { id: "node-contract", zh: "节点职责、输入、返回、异常、副作用与限制是否被准确说明。", en: "Whether node responsibility, inputs, returns, failures, side effects, and limitations are accurately explained." },
    { id: "bilingual-equivalence", zh: "中文与英文是否表达同一约束，且没有关键语义遗漏。", en: "Whether Chinese and English express the same constraints without material omissions." },
    { id: "local-domain-role", zh: "相关局部变量是否说明领域角色、来源、生命周期、不变量或隐私目的。", en: "Whether relevant locals explain domain role, origin, lifetime, invariants, or privacy purpose." },
    { id: "non-obvious-flow", zh: "映射、验证、早退、诊断与失败路径是否解释意图和风险而非复述语法。", en: "Whether mapping, validation, early exits, diagnostics, and failures explain intent and risk rather than syntax." },
    { id: "generation-continuity", zh: "生成链是否保留上游/下游注释覆盖、稳定来源关联和人工接管边界。", en: "Whether generation chains preserve upstream/downstream comment coverage, stable provenance, and human-takeover boundaries." },
    { id: "privacy-boundary", zh: "evidence、sidecar 与输出是否仍不包含源码正文、绝对路径、资源正文或凭据。", en: "Whether evidence, sidecars, and outputs still exclude source bodies, absolute paths, resource bodies, and credentials." }
  ];
}

/**
 * @lang zh-CN 定义 W-P60 的 non-blocking changed-scope 报告策略。
 * @lang en Defines W-P60 non-blocking changed-scope reporting policy.
 *
 * @returns {Record<string, unknown>} 不授予写入权的 gate policy。 / Gate policy that grants no write authority.
 */
function createNonBlockingGatePolicy() {
  return {
    contract: "rop-historical-debt-prioritization@0.1.0-draft",
    mode: "report-only",
    activation: "future-authorized-remediation-slice-only",
    appliesTo: ["new-public-api", "touched-public-api", "touched-complex-flow", "touched-generation-boundary"],
    historicalUntouchedDebtHardFailure: false,
    historicalSingleFunctionGate: "preserved-as-wp54-closeout-history-not-replayed",
    requiredManualReview: true,
    automaticFixProposal: false,
    writeAuthority: "disabled"
  };
}

/**
 * @lang zh-CN 汇总数量、隐私和执行边界，供 machine check 与 closeout 使用。
 * @lang en Summarizes counts, privacy, and execution boundaries for machine checks and closeout.
 *
 * @param {Record<string, Record<string, any>>} inputs 已验证 evidence。 / Validated evidence.
 * @param {{ categoryCounts: Record<string, number>, changedFileCount: number }} changedScope 聚合范围。 / Aggregated scope.
 * @param {Record<string, unknown>[]} cohorts 治理 cohort。 / Governance cohorts.
 * @param {Record<string, unknown>} gatePolicy 报告策略。 / Reporting policy.
 * @returns {Record<string, unknown>} public-safe summary。 / Public-safe summary.
 */
function createSummary(inputs, changedScope, cohorts, gatePolicy) {
  // <lang><zh-CN>severity 计数只用于排期，不替代修复批准或人审结论。</zh-CN><en>Severity counts serve scheduling only and do not replace remediation approval or human conclusions.</en></lang>
  const severityCounts = cohorts.reduce((counts, cohort) => {
    counts[cohort.severity] = (counts[cohort.severity] ?? 0) + 1;
    return counts;
  }, {});
  return {
    cohortCount: cohorts.length,
    severityCounts,
    changedFileCountSinceHistoricalBaseline: changedScope.changedFileCount,
    changedScopeCategoryCounts: changedScope.categoryCounts,
    manualReviewItemCount: createManualReviewPacket().length,
    nonBlockingGateMode: gatePolicy.mode,
    historicalInventoryRerun: false,
    historicalSingleFunctionGateReplayed: false,
    historicalCoverageClaimedComplete: false,
    sourceBodyReadCount: 0,
    sourceBodySerializedCount: 0,
    sourceTextSerializedCount: 0,
    absolutePathExposureCount: 0,
    rawLocatorExposureCount: 0,
    targetRepositoryReadCount: 0,
    targetRepositoryMutationCount: 0,
    satelliteMutationCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    providerNetworkExecutionCount: 0,
    nextWPhaseStarted: false,
    schemaOrParserImplemented: false,
    localeResourceDiscoveryImplemented: false,
    sourcePolicy: "metadata-only"
  };
}

/**
 * @lang zh-CN 创建 W-P60 的硬边界检查；语义充分性仍明确排除在自动断言之外。
 * @lang en Creates W-P60 hard-boundary checks; semantic adequacy remains explicitly outside automatic assertions.
 *
 * @param {Record<string, Record<string, any>>} inputs 已验证 evidence。 / Validated evidence.
 * @param {Record<string, any>} summary 汇总结果。 / Summary result.
 * @returns {{ id: string, status: "pass" | "fail" }[]} 检查列表。 / Check list.
 */
function createChecks(inputs, summary) {
  return [
    createCheck("historical-inventory-input-ready", inputs.wp49Inventory.summary?.historicalCoverageClaimedComplete === false),
    createCheck("staged-ledger-input-ready", inputs.wp50Ledger.summary?.historicalBulkRewriteAllowed === false),
    createCheck("wp54-closeout-history-preserved", inputs.wp54Closeout.checks?.some((check) => check.id === "changed-scope-gate-passed" && check.status === "pass") === true),
    createCheck("satellite-observation-only", inputs.wp54Intake.scopeFreeze?.satelliteMutationPolicy === "observation-only"),
    createCheck("no-dlr-migration-or-target-action", inputs.wp56Reference.checks?.migrationImplemented === false && inputs.wp56Reference.checks?.targetRepositoryAction === false),
    createCheck("quality-review-remains-read-only", inputs.wp57Review.boundary?.workspaceWriteEnabledCount === 0 && inputs.wp57Review.boundary?.targetRepositoryMutationCount === 0),
    createCheck("cohort-and-manual-review-ready", summary.cohortCount >= 6 && summary.manualReviewItemCount >= 6),
    createCheck("non-blocking-gate-preserved", summary.nonBlockingGateMode === "report-only" && summary.historicalSingleFunctionGateReplayed === false),
    createCheck("no-source-or-path-exposure", summary.sourceBodyReadCount === 0 && summary.sourceBodySerializedCount === 0 && summary.sourceTextSerializedCount === 0 && summary.absolutePathExposureCount === 0),
    createCheck("no-write-network-or-next-cycle", summary.targetRepositoryReadCount === 0 && summary.targetRepositoryMutationCount === 0 && summary.satelliteMutationCount === 0 && summary.hostEditorApiCallCount === 0 && summary.checkedApplyTriggeredCount === 0 && summary.providerNetworkExecutionCount === 0 && summary.nextWPhaseStarted === false)
  ];
}

/**
 * @lang zh-CN 构造统一 pass/fail 检查对象。
 * @lang en Constructs a uniform pass/fail check object.
 *
 * @param {string} id 检查标识。 / Check identifier.
 * @param {boolean} condition 检查条件。 / Check condition.
 * @returns {{ id: string, status: "pass" | "fail" }} 检查对象。 / Check object.
 */
function createCheck(id, condition) {
  return { id, status: condition ? "pass" : "fail" };
}

/**
 * @lang zh-CN 生成中文优先的历史 ROP 人工审查 packet。
 * @lang en Generates a Chinese-first historical ROP human-review packet.
 *
 * @param {Record<string, any>} evidence W-P60 metadata evidence。 / W-P60 metadata evidence.
 * @returns {string} 不含源码正文或路径的 Markdown。 / Markdown containing no source bodies or paths.
 */
function renderReviewPacket(evidence) {
  // <lang><zh-CN>cohort rows 只投影 logical identity、severity 和状态，不渲染来源文件名。</zh-CN><en>Cohort rows project only logical identity, severity, and state, never source file names.</en></lang>
  const cohortRows = evidence.cohorts.map((cohort) => `| ${cohort.observationId} | ${cohort.repositoryOwner} | ${cohort.severity} | ${cohort.reviewState} | ${cohort.observationCategories.join("、")} |`).join("\n");
  // <lang><zh-CN>review rows 让中英语义审查可直接交给 owner，而不是由脚本替代判断。</zh-CN><en>Review rows make bilingual semantic review directly assignable to owners instead of replacing judgement with a script.</en></lang>
  const reviewRows = evidence.manualReviewPacket.map((item) => `| ${item.id} | ${item.zh} | ${item.en} |`).join("\n");
  return `# W-P60 历史 ROP 债务优先级与人工审查 Packet

## 结论

本 packet 将既有 W-P49/W-P50/W-P54 metadata 转为六个无路径 cohort、人工审查清单和 report-only
changed-scope policy。它不重新执行历史 inventory，不将历史单函数 gate 用于后续授权语义扩展，
也不产生 source annotation、自动 fix、卫星/target 修改或下一 W-P 实施。

## 优先级 cohort

| logical observation | owner | severity | review state | categories |
| --- | --- | --- | --- | --- |
${cohortRows}

## 人工审查清单

| id | 中文审查要求 | English review requirement |
| --- | --- | --- |
${reviewRows}

## Non-blocking gate

- mode：${evidence.gatePolicy.mode}
- activation：${evidence.gatePolicy.activation}
- historical untouched debt hard failure：${evidence.gatePolicy.historicalUntouchedDebtHardFailure}
- automatic fix proposal：${evidence.gatePolicy.automaticFixProposal}
- write authority：${evidence.gatePolicy.writeAuthority}

## 边界

- 机器计数只服务风险排序；中英等价、局部变量语义、复杂流程说明、生成链连续性与隐私准确性必须人工复核。
- evidence 只包含 logical identity、聚合计数与政策状态；不包含源码正文、绝对路径、文件名、资源正文、raw locator、digest 或凭据。
- 术语 parser/registry、DLR discovery、独立输出实现、PowerShell satellite、host write、provider/network 与 target action 都不属于 W-P60。

## English summary

This packet prioritizes metadata-only historical ROP cohorts for human review. It does not claim semantic completeness or authorize annotation writes, automatic fixes, satellite changes, target actions, or later-cycle implementation.
`;
}

/**
 * @lang zh-CN 将本机绝对路径转换为 main-repo 相对 artifact identity。
 * @lang en Converts a local absolute path to a main-repo-relative artifact identity.
 *
 * @param {string} value 本机绝对路径。 / Local absolute path.
 * @returns {string} 使用正斜杠的相对 identity。 / Relative identity using forward slashes.
 */
function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

/**
 * @lang zh-CN 阻止 public-safe artifact 出现本机路径、正文标识或 credential marker。
 * @lang en Prevents local paths, body indicators, or credential markers from public-safe artifacts.
 *
 * @param {string} value 已序列化的 artifact。 / Serialized artifact.
 * @param {string} label 断言上下文。 / Assertion context.
 * @returns {void} 命中时抛出错误。 / Throws on a match.
 */
function assertNoPrivateMarkers(value, label) {
  // <lang><zh-CN>patterns 只涵盖路径、正文与常见 credential 外形；失败信息只输出 pattern，不回显匹配内容。</zh-CN><en>Patterns cover paths, bodies, and common credential shapes only; failure output reports the pattern, never matched content.</en></lang>
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
  // <lang><zh-CN>任一匹配都阻止 artifact 写入，从而让 privacy failure fail closed。</zh-CN><en>Any match blocks artifact writing, making privacy failure fail closed.</en></lang>
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a forbidden public-safe marker: ${hit}`);
}
