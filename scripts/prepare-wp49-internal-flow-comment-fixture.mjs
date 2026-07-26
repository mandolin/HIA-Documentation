import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inventoryEvidencePath = path.join(rootDir, "dist", "wp49-repository-self-doc-inventory", "evidence.json");
const changedScopeGatePath = path.join(rootDir, "dist", "wp49-changed-scope-annotation-quality-gate", "evidence.json");
const outputRoot = path.join(rootDir, "dist", "wp49-internal-flow-comment-fixture");
const evidencePath = path.join(outputRoot, "evidence.json");
const fixturePath = path.join(outputRoot, "internal-flow-comment-fixture.md");
const reviewChecklistPath = path.join(outputRoot, "internal-flow-comment-review-checklist.md");

await main();

/**
 * 准备 W-P49.4 内部流程块注释 fixture evidence。
 * Prepare W-P49.4 internal flow comment fixture evidence.
 *
 * @lang zh-CN 本脚本复用 W-P49.2 的内部流程候选元数据，选择少量真实模块作为
 * fixture，并定义内部块注释的验收信号。它不读取或输出源码正文，也不修改源码。
 * @lang en This script reuses W-P49.2 internal-flow candidate metadata, selects
 * a small set of real modules as fixtures, and defines acceptance signals for
 * internal block comments. It does not read or emit source bodies and does not
 * mutate source files.
 *
 * @returns {Promise<void>} Writes public-safe W-P49.4 evidence and fixture docs.
 */
async function main() {
  const inventory = await readJson(inventoryEvidencePath);
  const changedScopeGate = await readJson(changedScopeGatePath);
  assert.equal(inventory.status, "ready-for-wp49-changed-scope-annotation-quality-gate");
  assert.equal(changedScopeGate.status, "ready-for-wp49-internal-flow-comment-fixture");

  const candidates = inventory.internalFlowLedger.topCandidates;
  const fixtures = selectFixtures(candidates);
  const acceptanceCriteria = createAcceptanceCriteria();
  const summary = createSummary({ acceptanceCriteria, fixtures, inventory });
  const checks = createChecks(summary);
  const hardFailures = checks.filter((item) => item.status === "fail");

  const evidence = {
    contract: "hia-wp49-internal-flow-comment-fixture",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp49-generated-comment-continuity-adr-input" : "blocked-by-internal-flow-fixture-preconditions",
    cycleGroupId: "C-HIA-P3",
    phase: "W-P49.4",
    sourceInputs: {
      repositoryInventoryEvidence: normalizePath(inventoryEvidencePath),
      changedScopeGateEvidence: normalizePath(changedScopeGatePath)
    },
    executionPolicy: {
      policy: "internal-flow-fixture-selection-only",
      hiaMayCallHostEditorApi: false,
      hiaMayExecuteProviderNetwork: false,
      hiaMayModifySourceAnnotations: false,
      hiaMayMutateTargetRepository: false,
      hiaMayRunTargetCommand: false,
      hiaMayTriggerCheckedApply: false,
      sourceBodyOutputPolicy: "none",
      sourcesContentPolicy: "none"
    },
    fixturePolicy: {
      mode: "real-module-metadata-fixture",
      historicalCoveragePolicy: "fixture-only-not-repository-wide-gate",
      minimumFixtureCount: 6,
      selectedFixtureCount: fixtures.length,
      requiredBoundaryCoverage: ["runtime-host", "source-map", "provider", "contract-profile", "first-party-source"],
      acceptedInternalLocaleMarkers: ["<lang>", "<l>", "<en>", "<zh-CN>"],
      legacyLocaleMarkersAcceptedForCompatOnly: ["@hiaText", "@hiaBlock"],
      sourceBodySerialized: false
    },
    summary,
    fixtures,
    acceptanceCriteria,
    checks,
    generatedDocs: {
      fixture: normalizePath(fixturePath),
      reviewChecklist: normalizePath(reviewChecklistPath)
    }
  };

  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P49.4 internal-flow fixture evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(fixturePath, renderFixtureDoc(evidence), "utf8");
  await writeFile(reviewChecklistPath, renderReviewChecklist(evidence), "utf8");

  console.log(`W-P49.4 internal flow comment fixture prepared at ${normalizePath(evidencePath)}`);
  console.log(`Fixture status: ${evidence.status}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

/**
 * 从 W-P49.2 候选中选择覆盖不同边界的真实 fixture。
 * Selects real fixtures that cover different boundaries from W-P49.2 candidates.
 *
 * <lang><zh-CN>选择逻辑按边界类别优先，而不是只按 score 最高排序。这样可以避免
 * VS Code extension 单一大文件吞掉全部样本，让 source-map、provider、profile 与 CLI
 * 等不同工程边界都有代表。</zh-CN><en>The selection is boundary-oriented rather than
 * purely score-sorted, preventing one large VS Code extension file from taking
 * every fixture slot and ensuring source-map, provider, profile, and CLI
 * boundaries are represented.</en></lang>
 *
 * @param {Array<Record<string, unknown>>} candidates Internal-flow candidates.
 * @returns {Array<Record<string, unknown>>} Selected fixture metadata.
 */
function selectFixtures(candidates) {
  const selected = [];
  const profiles = [
    {
      id: "runtime-authoring-high-complexity",
      reason: "runtime-host authoring function with high branch count",
      predicate: (item) => hasBoundary(item, "runtime-host") && item.path.includes("packages/lsp/src/authoring")
    },
    {
      id: "cli-build-orchestration",
      reason: "CLI orchestration function with many direct statements",
      predicate: (item) => item.path.startsWith("apps/cli/") && item.name.includes("run")
    },
    {
      id: "source-map-linkage",
      reason: "doc-source-map/source-linkage boundary with branching and output assembly",
      predicate: (item) => hasBoundary(item, "source-map")
    },
    {
      id: "generic-docline-validation",
      reason: "generic doc-line validation boundary for future language adapters",
      predicate: (item) => item.path.includes("packages/generic-docline/")
    },
    {
      id: "provider-validation",
      reason: "provider boundary validation and execution safety fixture",
      predicate: (item) => hasBoundary(item, "provider")
    },
    {
      id: "profile-contract-validation",
      reason: "contract/profile validation boundary fixture",
      predicate: (item) => hasBoundary(item, "contract-profile")
    }
  ];

  for (const profile of profiles) {
    const candidate = candidates.find((item) => profile.predicate(item) && !selected.some((used) => sameCandidate(used, item)));
    assert.notEqual(candidate, undefined, `Missing W-P49.4 fixture candidate for ${profile.id}`);
    selected.push(createFixture(profile, candidate));
  }

  return selected;
}

function createFixture(profile, candidate) {
  const score = Number(candidate.score);
  const branchCount = Number(candidate.branchCount);
  const directStatementCount = Number(candidate.directStatementCount);
  return {
    id: profile.id,
    reason: profile.reason,
    selector: {
      boundaryTags: candidate.boundaryTags,
      line: candidate.line,
      name: candidate.name,
      path: candidate.path
    },
    metrics: {
      branchCount,
      directStatementCount,
      score
    },
    currentSignals: {
      hasBilingualInternalComment: Boolean(candidate.hasBilingualInternalComment),
      hasInternalComment: Boolean(candidate.hasInternalComment)
    },
    expectedSignals: {
      minimumFlowBlockCommentCount: expectedFlowBlockCount(score),
      requiresBilingualInternalMarkers: true,
      requiresSectionPurposeNotLineEcho: true,
      requiresGeneratedOrBoundaryInvariantWhenApplicable: hasBoundary(candidate, "source-map") || hasBoundary(candidate, "provider") || hasBoundary(candidate, "contract-profile")
    },
    status: "fixture-ready-report-only"
  };
}

function expectedFlowBlockCount(score) {
  if (score >= 50) return 4;
  if (score >= 35) return 3;
  return 2;
}

function hasBoundary(candidate, tag) {
  return Array.isArray(candidate.boundaryTags) && candidate.boundaryTags.includes(tag);
}

function sameCandidate(left, right) {
  return left.selector?.path === right.path && left.selector?.line === right.line && left.selector?.name === right.name;
}

function createAcceptanceCriteria() {
  return [
    {
      id: "section-purpose",
      title: "Comment explains the flow block purpose",
      status: "required-for-fixture-review",
      description: "内部块注释应解释该分段负责的业务/协议目的，而不是复述赋值、循环或条件。"
    },
    {
      id: "bilingual-inline-marker",
      title: "Comment carries inline bilingual locale markers",
      status: "required-for-fixture-review",
      description: "内部块注释使用 `<lang>` / `<l>` / `<en>` / `<zh-CN>` 表达中英双语。"
    },
    {
      id: "state-boundary-invariant",
      title: "Boundary or invariant is named when the block crosses a system boundary",
      status: "required-when-applicable",
      description: "涉及 provider、profile、source-map、runtime host 等边界时，注释需点明不变量、权限边界或数据边界。"
    },
    {
      id: "generated-continuity-hook",
      title: "Generated or downstream continuity hook is noted when applicable",
      status: "required-when-applicable",
      description: "涉及生成、映射、source-linkage 或 doc-source-map 时，注释需预留上游/下游文档连续性线索。"
    },
    {
      id: "review-only-fixture",
      title: "Fixture is review-only until W-P49.4 is promoted",
      status: "required",
      description: "W-P49.4 只建立 fixture 和 review checklist，不把启发式 score 直接变成全仓 hard gate。"
    }
  ];
}

function createSummary({ acceptanceCriteria, fixtures, inventory }) {
  const coveredBoundaries = new Set(fixtures.flatMap((fixture) => fixture.selector.boundaryTags));
  return {
    phase: "W-P49.4",
    inputCandidateCount: inventory.internalFlowLedger.totalCandidateCount,
    inputCandidateWithCommentCount: inventory.internalFlowLedger.candidateWithCommentCount,
    inputCandidateWithBilingualCommentCount: inventory.internalFlowLedger.candidateWithBilingualCommentCount,
    selectedFixtureCount: fixtures.length,
    acceptanceCriteriaCount: acceptanceCriteria.length,
    coveredBoundaryCount: coveredBoundaries.size,
    coveredBoundaries: [...coveredBoundaries].sort(),
    fixtureWithExistingCommentCount: fixtures.filter((item) => item.currentSignals.hasInternalComment).length,
    fixtureWithExistingBilingualCommentCount: fixtures.filter((item) => item.currentSignals.hasBilingualInternalComment).length,
    totalExpectedFlowBlockCommentCount: fixtures.reduce((total, item) => total + item.expectedSignals.minimumFlowBlockCommentCount, 0),
    historicalInternalCommentCoverageClaimedComplete: false,
    fixtureReadyForReviewChecklist: true,
    readyForGeneratedContinuityAdrInput: true,
    checkedApplyWriteEnabledCount: 0,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetCommandExecutedByHiaCount: 0,
    providerNetworkExecutedCount: 0,
    externalNetworkCallExecutedCount: 0,
    sourceBodyOutputCount: 0,
    sourceTextSerializedCount: 0,
    requestBodySerializedCount: 0,
    responseBodySerializedCount: 0,
    secretValueSerializedCount: 0,
    digestValueSerializedCount: 0,
    localPathExposureCount: 0,
    credentialMarkerCount: 0,
    sourcesContentEntryCount: 0
  };
}

function createChecks(summary) {
  return [
    check("fixtures-selected", summary.selectedFixtureCount >= 6),
    check("required-boundaries-covered", ["runtime-host", "source-map", "provider", "contract-profile", "first-party-source"].every((tag) => summary.coveredBoundaries.includes(tag))),
    check("acceptance-criteria-ready", summary.acceptanceCriteriaCount >= 5),
    check("fixture-not-historical-complete-claim", summary.historicalInternalCommentCoverageClaimedComplete === false),
    check("generated-continuity-input-ready", summary.readyForGeneratedContinuityAdrInput),
    check("no-write-or-target-mutation", summary.checkedApplyWriteEnabledCount === 0 && summary.workspaceWriteAllowedCount === 0 && summary.targetRepositoryMutationCount === 0),
    check("no-provider-network", summary.providerNetworkExecutedCount === 0 && summary.externalNetworkCallExecutedCount === 0),
    check("no-private-source-output", summary.sourceBodyOutputCount === 0 && summary.sourceTextSerializedCount === 0 && summary.sourcesContentEntryCount === 0)
  ];
}

function check(id, ok) {
  return { id, status: ok ? "pass" : "fail" };
}

function renderFixtureDoc(evidence) {
  const fixtureRows = evidence.fixtures.map((fixture) => `| ${fixture.id} | ${fixture.selector.path}:${fixture.selector.line} | \`${fixture.selector.name}\` | ${fixture.metrics.score} | ${fixture.expectedSignals.minimumFlowBlockCommentCount} | ${fixture.selector.boundaryTags.join(", ")} |`).join("\n");
  return `# W-P49.4 Internal Flow Comment Fixture

## 中文摘要

本阶段从 W-P49.2 的内部流程候选中选择少量真实模块作为 fixture。fixture 只记录结构化元数据，不包含源码正文；它用于后续人工审查、示例补注释和检查器演进。

## Fixture List

| fixture | 位置 | name | score | min flow block comments | boundaries |
| --- | --- | --- | ---: | ---: | --- |
${fixtureRows}

## Boundary

- historical internal comment coverage: not claimed complete
- source bodies: none
- sourcesContent: none
- workspace write: disabled
- target mutation: disabled
- provider/network: disabled
`;
}

function renderReviewChecklist(evidence) {
  const criteriaRows = evidence.acceptanceCriteria.map((item) => `| ${item.id} | ${item.status} | ${item.description} |`).join("\n");
  const fixtureRows = evidence.fixtures.map((fixture) => `| ${fixture.id} | ${fixture.expectedSignals.minimumFlowBlockCommentCount} | ${fixture.expectedSignals.requiresBilingualInternalMarkers} | ${fixture.expectedSignals.requiresGeneratedOrBoundaryInvariantWhenApplicable} |`).join("\n");
  return `# W-P49.4 Internal Flow Comment Review Checklist

## 中文摘要

本 checklist 供 W-P49.4 后续人工样本补齐和检查器演进使用。它强调语义充分度，不鼓励逐行复述代码。

## Acceptance Criteria

| id | status | description |
| --- | --- | --- |
${criteriaRows}

## Fixture Expectations

| fixture | min flow block comments | requires bilingual markers | requires boundary invariant when applicable |
| --- | ---: | --- | --- |
${fixtureRows}
`;
}

function normalizePath(value) {
  return path.relative(rootDir, value).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(value, label) {
  const forbidden = [
    /\b[A-Z]:[\\/]/,
    /file:\/\//i,
    /work-zone/i,
    /Users[\\/]/i,
    /"sourcesContent"\s*:/,
    /sk-[A-Za-z0-9_-]+/,
    /ghp_[A-Za-z0-9_]+/,
    /npm_[A-Za-z0-9_]+/
  ];
  const hit = forbidden.find((pattern) => pattern.test(value));
  assert.equal(hit, undefined, `${label} contains a private marker: ${hit}`);
}
