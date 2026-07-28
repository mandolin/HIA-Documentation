import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp53-real-pilot-authorization-decision-and-manual-evidence");

await main();

/**
 * 生成 W-P53.6 真实试点授权决策与 manual evidence 的 blocked-result record。
 *
 * 中文：本脚本只读取 W-P53.3-W-P53.5 的 public-safe evidence，并把已满足的 readiness 与缺失的
 * live-pilot 条件分开记录。它不运行 VS Code/DevTools/Visual Studio、不调用 editor API、不触发
 * checked apply、不请求最终人工确认，也不访问 target repository、provider 或网络。
 * @lang en Generates W-P53.6's blocked-result record from W-P53.3-W-P53.5 public-safe evidence.
 * It separates satisfied readiness gates from missing live-pilot conditions and does not launch hosts,
 * call editor APIs, trigger checked apply, request final confirmation, or access targets, providers, or networks.
 * @returns {Promise<void>} <lang><zh-CN>写入只含状态和 gate 的 blocked-result evidence。</zh-CN><en>Writes status-and-gate-only blocked-result evidence.</en></lang>
 */
async function main() {
  const inputs = readInputs();
  const candidates = createDecisionCandidates(inputs);
  const summary = summarize(inputs, candidates);
  const checks = createChecks(summary, candidates);
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp53-real-pilot-authorization-decision-and-manual-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P53.6",
    status: hardFailures.length === 0 && summary.blockerCount > 0
      ? "blocked-awaiting-specific-live-pilot-conditions"
      : hardFailures.length === 0
        ? "invalid-no-blocker-for-unexecuted-pilot"
        : "blocked-by-wp53-pilot-decision-record-validation",
    decision: {
      result: "blocked",
      livePilotAuthorized: false,
      targetAdoptionAuthorized: false,
      checkedApplyWriteAuthorized: false,
      manualEvidenceCaptured: false,
      rationale: "Readiness and handoff inputs are complete, but no candidate has the full combination of a concrete live-host execution, final human confirmation, accepted owner return where required, and public-safe manual evidence.",
      requiredConditions: [
        "specific-scope-and-owner",
        "host-owned-live-execution",
        "final-human-confirmation",
        "rollback-and-post-validation-observation",
        "public-safe-manual-evidence",
        "target-owner-return-when-target-or-satellite-route"
      ]
    },
    sourceInputs: createSourceInputs(inputs),
    candidates,
    executionBoundary: {
      actualVscodeExtensionDevelopmentHostExecutionCount: summary.actualVscodeExtensionDevelopmentHostExecutionCount,
      actualWorkspaceApplyEditExecutionCount: summary.actualWorkspaceApplyEditExecutionCount,
      actualVisualStudioMutationExecutionCount: summary.actualVisualStudioMutationExecutionCount,
      visualStudioLaunchCount: summary.visualStudioLaunchCount,
      finalHumanConfirmationCapturedCount: summary.finalHumanConfirmationCapturedCount,
      realOwnerReportSubmittedCount: summary.realOwnerReportSubmittedCount,
      acceptedOwnerReturnCount: summary.acceptedOwnerReturnCount,
      targetCommandExecutedByHiaCount: 0,
      targetRepositoryMutationCount: 0,
      checkedApplyTriggeredCount: 0,
      workspaceWriteAllowedCount: 0,
      providerNetworkExecutedCount: 0,
      sourceBodyIncludedInEvidence: false,
      reportBodyIncludedInEvidence: false,
      snapshotBodyIncludedInEvidence: false,
      rollbackBodyIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      absolutePathIncludedInEvidence: false,
      sourcesContentPolicy: "none"
    },
    summary: { ...summary, hardFailureCount: hardFailures.length },
    checks,
    generatedDocs: {
      blockedDecision: "dist/wp53-real-pilot-authorization-decision-and-manual-evidence/blocked-pilot-decision.md",
      manualEvidenceRequirements: "dist/wp53-real-pilot-authorization-decision-and-manual-evidence/manual-evidence-requirements.md"
    }
  };
  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized, "W-P53.6 evidence");
  assert.equal(hardFailures.length, 0, `W-P53.6 has ${hardFailures.length} validation failure(s).`);
  assert.ok(summary.blockerCount > 0, "W-P53.6 must keep missing live-pilot conditions explicit.");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  await writeFile(path.join(outputRoot, "blocked-pilot-decision.md"), renderBlockedDecision(evidence), "utf8");
  await writeFile(path.join(outputRoot, "manual-evidence-requirements.md"), renderManualEvidenceRequirements(evidence), "utf8");
  console.log(`W-P53.6 blocked pilot decision evidence prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/**
 * 读取 handoff refresh 和两条 host readiness evidence，不启动或重放任何 route。
 *
 * @lang en Reads handoff-refresh and the two host-readiness evidence files without launching or replaying a route.
 */
function readInputs() {
  const inputs = {
    handoff: readJson(path.join(root, "dist", "wp53-target-owner-adoption-handoff-refresh", "evidence.json")),
    vscode: readJson(path.join(root, "dist", "wp53-vscode-host-owned-self-sandbox-pilot-gate", "evidence.json")),
    visualStudio: readJson(path.join(root, "dist", "wp53-visual-studio-snapshot-mutation-readiness", "evidence.json"))
  };
  assert.equal(inputs.handoff.status, "ready-for-wp53-real-pilot-authorization-decision-and-manual-evidence");
  assert.equal(inputs.vscode.status, "ready-for-wp53-visual-studio-snapshot-mutation-readiness");
  assert.equal(inputs.visualStudio.status, "ready-for-wp53-target-owner-adoption-handoff-refresh");
  return inputs;
}

/**
 * 为 self、Visual Studio、target 和 satellite 路线记录具体缺失 gate，不伪造授权。
 *
 * @lang en Records concrete missing gates for self, Visual Studio, target, and satellite routes without fabricating authorization.
 */
function createDecisionCandidates(inputs) {
  const handoffs = inputs.handoff.routeHandoffs;
  const selfHandoff = requiredHandoff(handoffs, "hia-self-core-docs");
  const unicodeHandoff = requiredHandoff(handoffs, "unicodeartjs-tsdoc-runner");
  const portalHandoff = requiredHandoff(handoffs, "hia-aspnetportal-dotnetdoc-runner");
  const satelliteHandoff = requiredHandoff(handoffs, "satellite-docline-package-adoption");
  return [
    {
      candidateId: "hia-self-vscode-synthetic-sandbox",
      candidateKind: "hia-self",
      scopePrepared: inputs.vscode.sandboxPolicy?.scopeId === "hia-main-repo-wp53-vscode-self-sandbox",
      ownerRoutePrepared: selfHandoff.ownerActionRequired === true,
      hostRoutePrepared: inputs.vscode.summary?.vscodeCommandRegistered === true,
      rollbackAndValidationPrepared: inputs.vscode.summary?.postApplyValidationDeclared === true
        && inputs.vscode.summary?.rollbackDeclared === true,
      privacyPrepared: inputs.vscode.sandboxPolicy?.sourcesContentPolicy === "none",
      liveHostExecutionObserved: number(inputs.vscode.executionBoundary?.actualVscodeExtensionDevelopmentHostExecutionCount) > 0,
      finalHumanConfirmationCaptured: inputs.vscode.executionBoundary?.finalHumanConfirmationCaptured === true,
      manualEvidenceCaptured: false,
      ownerReturnRequired: false,
      ownerReturnAccepted: false,
      blockerIds: [
        "HIA_WP53_VSCODE_LIVE_HOST_EXECUTION_MISSING",
        "HIA_WP53_VSCODE_FINAL_HUMAN_CONFIRMATION_MISSING",
        "HIA_WP53_VSCODE_PUBLIC_SAFE_MANUAL_EVIDENCE_MISSING"
      ],
      decision: "blocked"
    },
    {
      candidateId: "hia-self-visual-studio-synthetic-sandbox",
      candidateKind: "hia-self",
      scopePrepared: false,
      ownerRoutePrepared: selfHandoff.ownerActionRequired === true,
      hostRoutePrepared: inputs.visualStudio.readinessPolicy?.snapshotModel === "immutable-versioned",
      rollbackAndValidationPrepared: inputs.visualStudio.readinessPolicy?.rollbackRequiresSeparateFreshSnapshotRequest === true,
      privacyPrepared: inputs.visualStudio.executionBoundary?.sourcesContentPolicy === "none",
      liveHostExecutionObserved: number(inputs.visualStudio.executionBoundary?.visualStudioLaunchCount) > 0,
      finalHumanConfirmationCaptured: number(inputs.visualStudio.executionBoundary?.finalHumanConfirmationCapturedCount) > 0,
      manualEvidenceCaptured: false,
      ownerReturnRequired: false,
      ownerReturnAccepted: false,
      blockerIds: [
        "HIA_WP53_VISUAL_STUDIO_CONCRETE_SANDBOX_SCOPE_MISSING",
        "HIA_WP53_VISUAL_STUDIO_LIVE_HOST_EXECUTION_MISSING",
        "HIA_WP53_VISUAL_STUDIO_FINAL_HUMAN_CONFIRMATION_MISSING",
        "HIA_WP53_VISUAL_STUDIO_PUBLIC_SAFE_MANUAL_EVIDENCE_MISSING"
      ],
      decision: "blocked"
    },
    createOwnerBlockedCandidate(unicodeHandoff, "target-project"),
    createOwnerBlockedCandidate(portalHandoff, "target-project"),
    createOwnerBlockedCandidate(satelliteHandoff, "hia-satellite")
  ];
}

function createOwnerBlockedCandidate(handoff, candidateKind) {
  const isSatellite = candidateKind === "hia-satellite";
  return {
    candidateId: handoff.scenarioId,
    candidateKind,
    scopePrepared: false,
    ownerRoutePrepared: handoff.ownerActionRequired === true,
    hostRoutePrepared: false,
    rollbackAndValidationPrepared: false,
    privacyPrepared: handoff.sourcesContentPolicy === "none",
    liveHostExecutionObserved: false,
    finalHumanConfirmationCaptured: false,
    manualEvidenceCaptured: false,
    ownerReturnRequired: true,
    ownerReturnAccepted: false,
    blockerIds: isSatellite
      ? [
        "HIA_WP53_SATELLITE_OWNER_CHARTER_MISSING",
        "HIA_WP53_SATELLITE_OWNER_RETURN_MISSING",
        "HIA_WP53_SATELLITE_LIVE_HOST_AND_MANUAL_EVIDENCE_MISSING"
      ]
      : [
        "HIA_WP53_TARGET_OWNER_METADATA_REPORT_MISSING",
        "HIA_WP53_TARGET_OWNER_FINAL_CONFIRMATION_MISSING",
        "HIA_WP53_TARGET_OWNER_LIVE_HOST_AND_MANUAL_EVIDENCE_MISSING"
      ],
    decision: "blocked"
  };
}

/**
 * 汇总 blocked decision；阻塞条件是预期事实，不是 evidence generator 的校验失败。
 *
 * @lang en Summarizes the blocked decision; blockers are expected facts rather than evidence-generator validation failures.
 */
function summarize(inputs, candidates) {
  const handoffSummary = inputs.handoff.summary ?? {};
  const vscodeBoundary = inputs.vscode.executionBoundary ?? {};
  const visualStudioBoundary = inputs.visualStudio.executionBoundary ?? {};
  return {
    phase: "W-P53.6",
    inputEvidenceCount: 3,
    readyInputEvidenceCount: 3,
    inputHardFailureCount: sum([
      handoffSummary.hardFailureCount,
      inputs.vscode.summary?.hardFailureCount,
      inputs.visualStudio.summary?.hardFailureCount
    ]),
    candidateCount: candidates.length,
    blockedCandidateCount: candidates.filter((candidate) => candidate.decision === "blocked").length,
    blockerCount: sum(candidates.map((candidate) => candidate.blockerIds.length)),
    ownerReturnRequiredCandidateCount: candidates.filter((candidate) => candidate.ownerReturnRequired).length,
    ownerReturnAcceptedCandidateCount: candidates.filter((candidate) => candidate.ownerReturnAccepted).length,
    selfHostReadinessCandidateCount: candidates.filter((candidate) => candidate.candidateKind === "hia-self" && candidate.hostRoutePrepared).length,
    actualVscodeExtensionDevelopmentHostExecutionCount: number(vscodeBoundary.actualVscodeExtensionDevelopmentHostExecutionCount),
    actualWorkspaceApplyEditExecutionCount: number(vscodeBoundary.actualWorkspaceApplyEditExecutionCount),
    actualVisualStudioMutationExecutionCount: number(visualStudioBoundary.actualVisualStudioMutationExecutionCount),
    visualStudioLaunchCount: number(visualStudioBoundary.visualStudioLaunchCount),
    finalHumanConfirmationCapturedCount: number(vscodeBoundary.finalHumanConfirmationCaptured === true)
      + number(visualStudioBoundary.finalHumanConfirmationCapturedCount),
    realOwnerReportSubmittedCount: number(handoffSummary.realOwnerReportSubmittedCount),
    acceptedOwnerReturnCount: 0,
    targetRepositoryMutationCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    providerNetworkExecutedCount: 0,
    sourceBodyIncludedCount: 0,
    reportBodyIncludedCount: 0,
    snapshotBodyIncludedCount: 0,
    rollbackBodyIncludedCount: 0,
    digestValueIncludedCount: 0,
    absolutePathIncludedCount: 0,
    sourcesContentPolicy: "none",
    nextStage: "W-P53.7 Closeout And Next-Stage Boundary"
  };
}

function createChecks(summary, candidates) {
  return [
    check("decision-inputs-ready", summary.inputEvidenceCount === 3
      && summary.readyInputEvidenceCount === 3
      && summary.inputHardFailureCount === 0,
    "W-P53.3-W-P53.5 contribute ready public-safe decision inputs without validation failures."),
    check("blocked-result-covers-all-candidates", summary.candidateCount === 5
      && summary.blockedCandidateCount === 5
      && summary.blockerCount === 16,
    "The blocked result covers both self routes, two target routes, and the satellite route with explicit gate identifiers."),
    check("readiness-is-not-upgraded-to-live-pilot", summary.selfHostReadinessCandidateCount === 2
      && summary.actualVscodeExtensionDevelopmentHostExecutionCount === 0
      && summary.actualWorkspaceApplyEditExecutionCount === 0
      && summary.actualVisualStudioMutationExecutionCount === 0
      && summary.visualStudioLaunchCount === 0
      && summary.finalHumanConfirmationCapturedCount === 0,
    "Prepared host routes are not misrepresented as live executions or final human confirmations."),
    check("owner-return-remains-required-and-absent", summary.ownerReturnRequiredCandidateCount === 3
      && summary.ownerReturnAcceptedCandidateCount === 0
      && summary.realOwnerReportSubmittedCount === 0,
    "Two target routes and the satellite route still require owner action; no owner return is fabricated."),
    check("no-unauthorized-execution-or-write", summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.providerNetworkExecutedCount === 0,
    "The decision record performs no target mutation, checked apply, workspace write, or provider-network execution."),
    check("privacy-boundary-intact", summary.sourceBodyIncludedCount === 0
      && summary.reportBodyIncludedCount === 0
      && summary.snapshotBodyIncludedCount === 0
      && summary.rollbackBodyIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.absolutePathIncludedCount === 0
      && summary.sourcesContentPolicy === "none",
    "The blocked-result record contains only public-safe status and gate metadata.")
  ];
}

function createSourceInputs(inputs) {
  return [
    sourceInput("W-P53.5", inputs.handoff),
    sourceInput("W-P53.3", inputs.vscode),
    sourceInput("W-P53.4", inputs.visualStudio)
  ];
}

function sourceInput(phase, evidence) {
  return {
    phase,
    contract: evidence.contract,
    status: evidence.status,
    hardFailureCount: number(evidence.summary?.hardFailureCount),
    grantsWriteAuthority: false,
    sourcesContentPolicy: "none"
  };
}

function requiredHandoff(handoffs, scenarioId) {
  const handoff = handoffs.find((item) => item.scenarioId === scenarioId);
  assert.ok(handoff, `Missing W-P53.5 handoff ${scenarioId}.`);
  return handoff;
}

function check(id, passed, description) {
  return { id, status: passed ? "pass" : "fail", description };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function normalizePath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/") || ".";
}

function renderBlockedDecision(evidence) {
  const summary = evidence.summary;
  const candidateRows = evidence.candidates.map((candidate) => `| ${candidate.candidateId} | ${candidate.candidateKind} | ${candidate.blockerIds.join(", ")} |`).join("\n");
  return `# W-P53.6 Blocked Real-Pilot Decision

## 中文摘要

W-P53.6 的结论是 blocked，不是失败掩盖或缺省成功。W-P53.3 的 VS Code fixed synthetic sandbox
route、W-P53.4 的 Visual Studio immutable-versioned snapshot route，以及 W-P53.5 的 owner handoff
和三宿主 review 都已具备可审计 readiness；但没有任何 route 同时具备 concrete live-host execution、
final human confirmation、必要 owner return、rollback/post-validation observation 和 public-safe manual
evidence。因此本阶段不启动命令、不触及 target，也不把 readiness 升格为授权。

| Candidate | Kind | Blocking gates |
| --- | --- | --- |
${candidateRows}

## Summary

- decision: ${evidence.decision.result}
- candidates / blocked candidates / blockers: ${summary.candidateCount} / ${summary.blockedCandidateCount} / ${summary.blockerCount}
- VS Code host/apply / Visual Studio launch/mutation / final confirmation: ${summary.actualVscodeExtensionDevelopmentHostExecutionCount} / ${summary.actualWorkspaceApplyEditExecutionCount} / ${summary.visualStudioLaunchCount} / ${summary.actualVisualStudioMutationExecutionCount} / ${summary.finalHumanConfirmationCapturedCount}
- owner returns submitted/accepted: ${summary.realOwnerReportSubmittedCount} / ${summary.acceptedOwnerReturnCount}
- next stage: ${summary.nextStage}
`;
}

function renderManualEvidenceRequirements(evidence) {
  return `# W-P53.6 Manual Evidence Requirements

## 中文摘要

如果将来有人单独提出某条 live pilot，必须先针对该单一路线完成并公开可审计的 metadata-only
record：

- 明确的受控 scope、owner 和 host；target/satellite route 还需要对应 owner return 或 charter；
- host 自己的 final human confirmation，不能由 HIA automation、provider 或 LSP 代替；
- host-owned rollback 和 post-validation 的实际 observation；
- public-safe manual evidence，只保留 status/count/gate，不含 source/report/snapshot/rollback body、
  digest、absolute path 或 sourcesContent；
- 每一次新尝试都重新检查当前 scope/conflict/privacy 条件，不能复用过期 snapshot 或旧 confirmation。

当前 evidence status: ${evidence.status}。该文件是 future manual evidence checklist，不是执行命令，
也不授予任何写入权限。
`;
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
