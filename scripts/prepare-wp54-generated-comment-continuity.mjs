import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 中文：main-repo 根目录；公开 evidence 中的本仓路径均相对此目录写入。
 * English: Main-repo root; public evidence writes this repository's paths relative to it.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 中文：工作区容器仅用于读取先前已生成的 PugDoc evidence，绝不改动卫星源码。
 * English: Workspace container is used only to read previously generated PugDoc evidence and never changes satellite source.
 */
const workspaceDir = path.resolve(rootDir, "..");

/** 中文：W-P54 受控切片的最新只读盘点。 English: Latest read-only inventory for the W-P54 controlled slice. */
const annotationInventoryPath = path.join(rootDir, "dist", "wp54-rop-annotation-inventory", "evidence.json");

/** 中文：已完成的 Pug producer fixture evidence。 English: Completed Pug producer-fixture evidence. */
const pugFixtureEvidencePath = path.join(workspaceDir, "HIA", "hia-pugdoc", "dist", "wp52-pug-one-to-many-parser-fixtures", "evidence.json");

/** 中文：已完成的只读 bidirectional index evidence。 English: Completed read-only bidirectional-index evidence. */
const bidirectionalIndexEvidencePath = path.join(rootDir, "dist", "wp52-bidirectional-source-linkage", "evidence.json");

/** 中文：已完成的四宿主只读 projection evidence。 English: Completed four-host read-only projection evidence. */
const hostProjectionEvidencePath = path.join(rootDir, "dist", "wp52-renderer-and-host-projection", "evidence.json");

/** 中文：本阶段 continuity evidence 输出目录。 English: Output directory for this phase's continuity evidence. */
const outputRoot = path.join(rootDir, "dist", "wp54-generated-comment-continuity");

/** 中文：机器可读 continuity evidence。 English: Machine-readable continuity evidence. */
const evidencePath = path.join(outputRoot, "evidence.json");

/** 中文：中文优先的链路核验摘要。 English: Chinese-first linkage-verification summary. */
const continuityReportPath = path.join(outputRoot, "generated-comment-continuity.md");

await main();

/**
 * 中文：核验受控 source-map 注释切片与既有 Pug 生成链的结构连续性，绝不重跑 parser 或加载源码正文。
 * English: Verifies structural continuity between the controlled source-map annotation slice and the existing Pug generation chain without rerunning parsers or loading source bodies.
 *
 * @returns {Promise<void>} 写入 continuity evidence 与人工复核摘要。 / Writes continuity evidence and manual-review summary.
 */
async function main() {
  /** 中文：当前切片必须先达到 W-P54.4 的最小 marker 信号。 English: Current slice must first meet W-P54.4 minimum marker signals. */
  const annotationInventory = await readJson(annotationInventoryPath);
  assert.equal(annotationInventory.status, "ready-for-wp54-selected-remediation-slice");
  /** 中文：Pug fixture 只作为已完成实现的输入，不允许本脚本重新生成 sidecar。 English: Pug fixture is input from completed implementation only; this script may not regenerate a sidecar. */
  const pugFixtureEvidence = await readJson(pugFixtureEvidencePath);
  assert.equal(pugFixtureEvidence.status, "ready-for-wp52-bidirectional-source-linkage");
  /** 中文：index evidence 证明 sidecar 与 ordinary doc-source-map reference 的只读连接。 English: Index evidence proves the read-only link between sidecar and ordinary doc-source-map reference. */
  const bidirectionalIndexEvidence = await readJson(bidirectionalIndexEvidencePath);
  assert.equal(bidirectionalIndexEvidence.status, "ready-for-wp52-renderer-and-host-projection");
  /** 中文：host evidence 证明下游呈现仍是 public-safe projection，不构成运行时/写入授权。 English: Host evidence proves downstream presentation remains a public-safe projection and is not runtime/write authority. */
  const hostProjectionEvidence = await readJson(hostProjectionEvidencePath);
  assert.equal(hostProjectionEvidence.status, "ready-for-wp52-cross-language-reuse-and-closeout");

  /** 中文：受控 source-map 函数的注释存在性事实。 English: Comment-presence facts for the controlled source-map function. */
  const sourceCommentSignal = createSourceCommentSignal(annotationInventory);
  /** 中文：Pug sidecar 的 4/6/6 与稳定键事实。 English: Pug sidecar 4/6/6 and stable-key facts. */
  const producerContinuity = createProducerContinuity(pugFixtureEvidence);
  /** 中文：sidecar reference 与双向查询的只读连接事实。 English: Read-only linkage facts for sidecar references and bidirectional queries. */
  const indexContinuity = createIndexContinuity(bidirectionalIndexEvidence);
  /** 中文：四宿主下游 projection 的可见性与零敏感正文事实。 English: Four-host downstream projection visibility and zero-sensitive-body facts. */
  const projectionContinuity = createProjectionContinuity(hostProjectionEvidence);
  /** 中文：按输出类别明确上游、稳定关联和人工接管边界，避免用单一笼统说明替代链路核验。 English: State upstream, stable linkage, and human-takeover boundaries per output category rather than using one generic assertion. */
  const outputCategories = createOutputCategories({ indexContinuity, producerContinuity, projectionContinuity, sourceCommentSignal });
  /** 中文：machine checks 只核验结构和边界；中英语义充分度继续由 W-P54 rubric 人工确认。 English: Machine checks validate structure and boundaries only; bilingual semantic adequacy remains a W-P54 rubric human decision. */
  const checks = createChecks({ indexContinuity, outputCategories, producerContinuity, projectionContinuity, sourceCommentSignal });
  /** 中文：任一链路、privacy 或最小 source marker 失败均阻止进入 changed-scope gate。 English: Any linkage, privacy, or minimum-source-marker failure blocks entry to the changed-scope gate. */
  const hardFailures = checks.filter((item) => item.status === "fail");

  /** 中文：evidence 只保留计数、相对路径和策略，不包含 Pug/source-map/source-linkage 源码、range、locals 或 sidecar path。 English: Evidence retains counts, relative paths, and policies only—never Pug/source-map/source-linkage bodies, ranges, locals, or sidecar paths. */
  const evidence = {
    contract: "hia-wp54-generated-comment-continuity",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp54-changed-scope-gate" : "blocked-by-wp54-generated-comment-continuity-preconditions",
    cycleGroupId: "C-HIA-P4",
    phase: "W-P54.5",
    sourceInputs: {
      annotationInventory: normalizePath(annotationInventoryPath),
      bidirectionalIndexEvidence: normalizePath(bidirectionalIndexEvidencePath),
      hostProjectionEvidence: normalizePath(hostProjectionEvidencePath),
      pugFixtureEvidence: "HIA/hia-pugdoc/dist/wp52-pug-one-to-many-parser-fixtures/evidence.json"
    },
    executionPolicy: {
      policy: "evidence-only-generated-comment-continuity-verification",
      hiaMayModifySourceAnnotations: false,
      hiaMayModifyPugDocSource: false,
      hiaMayMutateTargetRepository: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayCallHostEditorApi: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    sourceCommentSignal,
    outputCategories,
    continuityFacts: {
      index: indexContinuity,
      producer: producerContinuity,
      projection: projectionContinuity
    },
    manualReviewBoundary: {
      bilingualSemanticCompletenessAutomaticallyClaimed: false,
      PugSourceAnnotationsModifiedDuringWp54: false,
      selectedSourceMapFunctionModifiedDuringWp54: true,
      selectedSourceMapFunctionBehaviorModifiedDuringWp54: false,
      requiredReview: [
        "bilingual-semantic-equivalence",
        "source-map-privacy-and-sidecar-boundary-accuracy",
        "output-category-comment-continuity-and-human-takeover-boundary"
      ]
    },
    checks,
    generatedDocs: {
      continuityReport: normalizePath(continuityReportPath)
    }
  };
  /** 中文：先按 metadata 分区、再按完整序列化验证隐私，错误不产生正式 artifact。 English: Validate privacy by metadata section and then full serialization; errors produce no formal artifact. */
  assertNoPrivateMarkers(JSON.stringify(evidence.sourceInputs), "W-P54 continuity source inputs");
  assertNoPrivateMarkers(JSON.stringify(evidence.outputCategories), "W-P54 continuity output categories");
  assertNoPrivateMarkers(JSON.stringify(evidence.continuityFacts), "W-P54 continuity facts");
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P54 continuity evidence");

  /** 中文：写入仅限 main-repo dist 的 evidence，所有被消费的 W-P52 artifact 均保持只读。 English: Writes evidence only in main-repo dist; every consumed W-P52 artifact remains read-only. */
  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  /** 中文：报告明确分开自动核验事实和人工语义结论。 English: Report explicitly separates automatically verified facts from human semantic conclusions. */
  await writeFile(continuityReportPath, renderContinuityReport(evidence), "utf8");

  console.log(`W-P54.5 generated comment continuity prepared at ${normalizePath(evidencePath)}`);
  console.log(`Continuity status: ${evidence.status}`);
}

/**
 * 中文：读取一个 machine-readable evidence 文件。
 * English: Reads one machine-readable evidence file.
 *
 * @param {string} inputPath 输入位置。 / Input location.
 * @returns {Promise<Record<string, any>>} 已解析 evidence。 / Parsed evidence.
 */
async function readJson(inputPath) {
  /** 中文：原始文本只在解析期间保留，不进入任何输出对象。 English: Raw text exists only during parsing and enters no output object. */
  const inputText = await readFile(inputPath, "utf8");
  return JSON.parse(inputText);
}

/**
 * 中文：从 W-P54 inventory 提取受控函数的可检测注释信号。
 * English: Extracts detectable comment signals for the controlled function from W-P54 inventory.
 *
 * @param {Record<string, any>} inventory W-P54 inventory evidence。 / W-P54 inventory evidence.
 * @returns {Record<string, unknown>} source 注释信号。 / Source comment signals.
 */
function createSourceCommentSignal(inventory) {
  /** 中文：fixture 是 inventory 内固定的单一受控节点。 English: Fixture is the fixed single controlled node inside inventory. */
  const fixture = inventory.selectedFixture;
  /** 中文：函数盘点必须存在，避免把缺少节点误写为零风险。 English: Function inventory must exist, avoiding interpretation of a missing node as zero risk. */
  const functionInventory = fixture?.currentFunctionInventory;
  assert.notEqual(functionInventory, undefined, "W-P54 selected function inventory is required.");
  return {
    functionName: functionInventory.name,
    path: fixture.historicalSelector.path,
    hasAdjacentDocBlock: functionInventory.hasAdjacentDocBlock,
    bilingualInternalMarkerLineCount: functionInventory.bilingualInternalMarkerLineCount,
    expectedMinimumFlowBlockCommentCount: fixture.riskLedger.expectedFlowBlockCommentCount,
    sourceBodySerialized: false
  };
}

/**
 * 中文：归纳 Pug producer 对一对多 generated binding 输出的连续性事实。
 * English: Summarizes producer continuity facts for Pug one-to-many generated-binding output.
 *
 * @param {Record<string, any>} evidence W-P52.4 evidence。 / W-P52.4 evidence.
 * @returns {Record<string, unknown>} producer 连续性事实。 / Producer continuity facts.
 */
function createProducerContinuity(evidence) {
  /** 中文：summary 是已验证 fixture 的无正文计数投影。 English: Summary is the no-body count projection of the verified fixture. */
  const summary = evidence.summary;
  return {
    bindingCount: summary.bindingCount,
    expansionCount: summary.expansionCount,
    targetCount: summary.targetCount,
    stableInstanceKeyCount: summary.stableInstanceKeyCount,
    docSourceMapSidecarCount: summary.docSourceMapSidecarCount,
    docSourceMapBindingReferencedEntryCount: summary.docSourceMapBindingReferencedEntryCount,
    fullBindingModelEmbeddedInDocSourceMap: summary.fullBindingModelEmbeddedInDocSourceMap,
    sourceBodyOutputCount: summary.sourceBodyOutputCount,
    templateRuntimeDataExecutionCount: summary.templateRuntimeDataExecutionCount,
    arbitraryExpressionEvaluationCount: summary.arbitraryExpressionEvaluationCount,
    targetRepositoryMutationCount: summary.targetRepositoryMutationCount
  };
}

/**
 * 中文：归纳 sidecar/reference/index 的只读连续性事实。
 * English: Summarizes read-only continuity facts for sidecar/reference/index.
 *
 * @param {Record<string, any>} evidence W-P52.5 evidence。 / W-P52.5 evidence.
 * @returns {Record<string, unknown>} index 连续性事实。 / Index continuity facts.
 */
function createIndexContinuity(evidence) {
  /** 中文：summary 只含查询与 privacy 元数据，不读取 sidecar path 或完整模型。 English: Summary holds query/privacy metadata only and does not read a sidecar path or complete model. */
  const summary = evidence.summary;
  return {
    bindingCount: summary.bindingCount,
    expansionCount: summary.expansionCount,
    targetCount: summary.targetCount,
    linkedDocSourceMapEntryCount: summary.linkedDocSourceMapEntryCount,
    referencedDocSourceMapEntryCount: summary.referencedDocSourceMapEntryCount,
    sidecarIdLinkedToDocSourceMap: summary.sidecarIdLinkedToDocSourceMap,
    queryIndexReadOnly: summary.queryIndexReadOnly,
    fullBindingModelEmbeddedInDocSourceMap: summary.fullBindingModelEmbeddedInDocSourceMap,
    sourceBodyOutputCount: summary.sourceBodyOutputCount,
    targetRepositoryMutationCount: summary.targetRepositoryMutationCount
  };
}

/**
 * 中文：归纳四宿主 public-safe projection 的下游连续性事实。
 * English: Summarizes downstream continuity facts for four-host public-safe projection.
 *
 * @param {Record<string, any>} evidence W-P52.6 evidence。 / W-P52.6 evidence.
 * @returns {Record<string, unknown>} projection 连续性事实。 / Projection continuity facts.
 */
function createProjectionContinuity(evidence) {
  /** 中文：summary 是不会暴露 source body/range/locals 的聚合 projection metadata。 English: Summary is aggregate projection metadata that exposes no source body/range/locals. */
  const summary = evidence.summary;
  return {
    bindingCount: summary.bindingCount,
    expansionCount: summary.expansionCount,
    targetCount: summary.targetCount,
    stableInstanceKeyCount: summary.stableInstanceKeyCount,
    hostProjectionCount: summary.hostProjectionCount,
    readyHostProjectionCount: summary.readyHostProjectionCount,
    relationVisibleHostCount: summary.relationVisibleHostCount,
    sourceBodyIncludedHostCount: summary.sourceBodyIncludedHostCount,
    sidecarPathIncludedHostCount: summary.sidecarPathIncludedHostCount,
    localsValueIncludedHostCount: summary.localsValueIncludedHostCount,
    writeAuthorityEnabledHostCount: summary.writeAuthorityEnabledHostCount,
    targetRepositoryMutationCount: summary.targetRepositoryMutationCount
  };
}

/**
 * 中文：逐类建立上游、稳定关联、下游与人工接管边界。
 * English: Establishes upstream, stable linkage, downstream, and human-takeover boundaries by category.
 *
 * @param {{ sourceCommentSignal: Record<string, unknown>, producerContinuity: Record<string, unknown>, indexContinuity: Record<string, unknown>, projectionContinuity: Record<string, unknown> }} value 已归纳的连续性事实。 / Summarized continuity facts.
 * @returns {Record<string, unknown>[]} 输出类别说明。 / Output-category descriptions.
 */
function createOutputCategories(value) {
  return [
    {
      id: "source-map-index-comment-boundary",
      upstream: "controlled-doc-source-map-index-function",
      stableLink: value.sourceCommentSignal.path,
      downstream: "normalized-index-and-diagnostics",
      automatedSignals: {
        hasAdjacentDocBlock: value.sourceCommentSignal.hasAdjacentDocBlock,
        bilingualInternalMarkerLineCount: value.sourceCommentSignal.bilingualInternalMarkerLineCount
      },
      humanTakeoverBoundary: "reviewer-confirms-semantic-equivalence-and-privacy-accuracy"
    },
    {
      id: "pug-sidecar-one-to-many",
      upstream: "pug-binding-and-expansion-fixture",
      stableLink: "binding-id-and-instance-key",
      downstream: "independent-generated-documentation-binding-sidecar",
      counts: {
        bindings: value.producerContinuity.bindingCount,
        expansions: value.producerContinuity.expansionCount,
        targets: value.producerContinuity.targetCount,
        stableInstanceKeys: value.producerContinuity.stableInstanceKeyCount
      },
      humanTakeoverBoundary: "no-pug-source-annotation-change-in-wp54"
    },
    {
      id: "ordinary-doc-source-map-reference",
      upstream: "independent-generated-binding-sidecar",
      stableLink: "sidecar-id-plus-binding-id-reference",
      downstream: "ordinary-doc-source-map-minimal-reference",
      counts: {
        sidecars: value.producerContinuity.docSourceMapSidecarCount,
        referencedEntries: value.producerContinuity.docSourceMapBindingReferencedEntryCount
      },
      humanTakeoverBoundary: "complete-binding-model-remains-outside-ordinary-doc-source-map"
    },
    {
      id: "read-only-index-and-host-projection",
      upstream: "sidecar-and-doc-source-map-reference",
      stableLink: "binding-target-symbol-and-entry-identities",
      downstream: "read-only-index-plus-four-host-projections",
      counts: {
        indexBindings: value.indexContinuity.bindingCount,
        indexTargets: value.indexContinuity.targetCount,
        hostProjections: value.projectionContinuity.hostProjectionCount,
        readyHostProjections: value.projectionContinuity.readyHostProjectionCount
      },
      humanTakeoverBoundary: "projection-is-read-only-and-does-not-grant-host-write-authority"
    }
  ];
}

/**
 * 中文：产生 continuity 阶段的硬性结构/隐私检查。
 * English: Produces hard structural/privacy checks for the continuity phase.
 *
 * @param {{ sourceCommentSignal: Record<string, any>, producerContinuity: Record<string, any>, indexContinuity: Record<string, any>, projectionContinuity: Record<string, any>, outputCategories: Record<string, unknown>[] }} value 连续性输入。 / Continuity inputs.
 * @returns {{ id: string, status: "pass" | "fail" }[]} 检查结果。 / Check results.
 */
function createChecks(value) {
  return [
    createCheck("selected-source-node-doc-present", value.sourceCommentSignal.hasAdjacentDocBlock === true),
    createCheck("selected-source-flow-markers-satisfy-fixture-minimum", Number(value.sourceCommentSignal.bilingualInternalMarkerLineCount) >= Number(value.sourceCommentSignal.expectedMinimumFlowBlockCommentCount)),
    createCheck("pug-one-to-many-counts-preserved", value.producerContinuity.bindingCount === 4 && value.producerContinuity.expansionCount === 6 && value.producerContinuity.targetCount === 6 && value.producerContinuity.stableInstanceKeyCount === 6),
    createCheck("sidecar-reference-remains-minimal", value.producerContinuity.fullBindingModelEmbeddedInDocSourceMap === false && value.indexContinuity.fullBindingModelEmbeddedInDocSourceMap === false && value.indexContinuity.sidecarIdLinkedToDocSourceMap === true),
    createCheck("index-remains-read-only", value.indexContinuity.queryIndexReadOnly === true && value.indexContinuity.sourceBodyOutputCount === 0),
    createCheck("host-projection-remains-public-safe", value.projectionContinuity.hostProjectionCount === 4 && value.projectionContinuity.readyHostProjectionCount === 4 && value.projectionContinuity.sourceBodyIncludedHostCount === 0 && value.projectionContinuity.sidecarPathIncludedHostCount === 0 && value.projectionContinuity.localsValueIncludedHostCount === 0 && value.projectionContinuity.writeAuthorityEnabledHostCount === 0),
    createCheck("no-runtime-or-target-mutation", value.producerContinuity.templateRuntimeDataExecutionCount === 0 && value.producerContinuity.arbitraryExpressionEvaluationCount === 0 && value.producerContinuity.targetRepositoryMutationCount === 0 && value.indexContinuity.targetRepositoryMutationCount === 0 && value.projectionContinuity.targetRepositoryMutationCount === 0),
    createCheck("all-output-categories-declared", value.outputCategories.length === 4)
  ];
}

/**
 * 中文：构造稳定的 evidence 检查项。
 * English: Constructs a stable evidence check item.
 *
 * @param {string} id 检查标识。 / Check identifier.
 * @param {boolean} ok 检查结果。 / Check result.
 * @returns {{ id: string, status: "pass" | "fail" }} 标准检查项。 / Standard check item.
 */
function createCheck(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

/**
 * 中文：规范化 main-repo 内部绝对路径。
 * English: Normalizes an absolute path inside main-repo.
 *
 * @param {string} value 绝对路径。 / Absolute path.
 * @returns {string} 相对公开路径。 / Relative public path.
 */
function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

/**
 * 中文：生成中文优先的 continuity 人工复核报告。
 * English: Produces the Chinese-first continuity manual-review report.
 *
 * @param {Record<string, any>} evidence continuity evidence。 / Continuity evidence.
 * @returns {string} Markdown 报告。 / Markdown report.
 */
function renderContinuityReport(evidence) {
  /** 中文：各类别只投影公开 metadata。 English: Each category projects public metadata only. */
  const rows = evidence.outputCategories.map((item) => `| ${item.id} | ${item.upstream} | ${item.stableLink} | ${item.downstream} | ${item.humanTakeoverBoundary} |`).join("\n");
  return `# W-P54.5 Generated Comment Continuity Verification\n\n## 中文摘要\n\n本次变更只补齐 source-map index 的 ROP 注释，不改变其行为，也不修改 Pug 源码或重新实现 W-P52 parser/contract。核验复用既有 Pug 4 bindings / 6 expansions / 6 targets / 6 stable instance keys、独立 sidecar、ordinary doc-source-map 最小 reference、只读 index 和四宿主 projection evidence。\n\n## 输出类别与人工接管边界\n\n| 类别 | 上游 | 稳定关联 | 下游 | 人工接管边界 |\n| --- | --- | --- | --- | --- |\n${rows}\n\n## 自动核验事实\n\n- 受控 createDocSourceMapIndex 具有紧邻 doc block，且内部双语 marker 行数达到既有 fixture 最低值。\n- ordinary doc-source-map 不内嵌完整 binding model；sidecar 仍以最小 reference 链接。\n- Pug 4/6/6、只读 index 与四宿主 projection 的公开安全事实保持不变。\n- source body、locals value、sidecar path、runtime expression、host write、target mutation 均未因本轮开启。\n\n## 人工仍须确认\n\n自动检查不宣称中英语义充分。reviewer 必须依据 W-P54 ROP 量规确认注释语义等价、privacy/sidecar 术语准确，并核对每个输出类别的人工接管边界没有被笼统说明取代。\n\n## English summary\n\nThis verification confirms structural, public-safe continuity for the controlled index comments and existing Pug sidecar chain. It does not claim automatic bilingual semantic adequacy or modify Pug producer source.\n`;
}

/**
 * 中文：阻止 evidence 包含绝对路径、来源正文或 credential pattern。
 * English: Prevents evidence from containing absolute paths, source bodies, or credential patterns.
 *
 * @param {string} value 序列化 metadata。 / Serialized metadata.
 * @param {string} label 断言上下文。 / Assertion context.
 * @returns {void} 违规时抛出断言。 / Throws an assertion on violation.
 */
function assertNoPrivateMarkers(value, label) {
  /** 中文：只报告命中 pattern，不记录可能敏感的匹配正文。 English: Reports only the hit pattern and never records a potentially sensitive match body. */
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
  /** 中文：任一命中都必须阻止证据落盘。 English: Any hit must prevent evidence persistence. */
  const hit = forbiddenPatterns.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
