import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "dist", "wp53-target-owner-evidence-currentness-and-trial-selection");

main();

/**
 * 整理 W-P53.2 owner evidence currentness 与试点候选选择 evidence。
 *
 * @lang en Prepares W-P53.2 owner-evidence currentness and pilot-candidate selection evidence.
 *
 * 中文：只消费既有 metadata-only handoff、owner dry-run 与 W-P53.1 evidence。它不读取
 * target source、不收集真实 owner report、不创建 sandbox/branch/PR，也不调用 host API、
 * checked apply 或网络。
 * @lang en Consumes only existing metadata-only handoff, owner dry-run, and W-P53.1 evidence.
 * It does not read target source, collect a real owner report, create a sandbox/branch/PR, or
 * call a host API, checked apply, or network.
 */
function main() {
  const inputs = readInputs();
  const selections = createSelections(inputs.handoff.handoffBindings);
  const summary = summarize(inputs, selections);
  const checks = createChecks(inputs, selections, summary);
  const hardFailures = checks.filter((check) => check.status === "fail");
  const evidence = {
    contract: "hia-wp53-target-owner-evidence-currentness-and-trial-selection-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    cycleGroupId: "C-HIA-P3",
    phase: "W-P53.2",
    status: hardFailures.length === 0
      ? "ready-for-wp53-vscode-host-owned-self-sandbox-pilot-gate"
      : "blocked-by-wp53-target-owner-evidence-currentness-and-trial-selection",
    sourceInputs: createSourceInputs(inputs),
    currentnessPolicy: {
      policy: "metadata-only-handoff-status-and-owner-report-presence",
      realOwnerReportCurrentness: "not-submitted",
      reportExpiryInvented: false,
      targetSourceRead: false,
      targetRepositoryAccessed: false
    },
    trialSelections: selections,
    executionPolicy: executionPolicy(),
    summary: { ...summary, hardFailureCount: hardFailures.length },
    checks,
    generatedDocs: {
      overview: "dist/wp53-target-owner-evidence-currentness-and-trial-selection/owner-evidence-currentness-and-trial-selection.md",
      selectionLedger: "dist/wp53-target-owner-evidence-currentness-and-trial-selection/trial-selection-ledger.md"
    }
  };

  const serialized = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serialized, "W-P53.2 evidence");
  if (hardFailures.length > 0) {
    console.error(`W-P53.2 failed checks: ${hardFailures.map((check) => check.id).join(", ")}`);
  }
  assert.equal(hardFailures.length, 0, `W-P53.2 has ${hardFailures.length} hard failure(s).`);

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, "evidence.json"), `${serialized}\n`, "utf8");
  fs.writeFileSync(path.join(outputRoot, "owner-evidence-currentness-and-trial-selection.md"), renderOverview(evidence), "utf8");
  fs.writeFileSync(path.join(outputRoot, "trial-selection-ledger.md"), renderSelectionLedger(evidence), "utf8");
  console.log(`W-P53.2 owner-evidence currentness prepared at ${normalizePath(path.join(outputRoot, "evidence.json"))}`);
  console.log(`Decision status: ${evidence.status}`);
}

/**
 * 读取已完成证据，禁止通过重跑旧阶段或访问 target 得到“新鲜度”。
 *
 * @lang en Reads completed evidence and forbids deriving currentness by replaying old phases or accessing a target.
 * @returns {{wp53: Record<string, unknown>, handoff: Record<string, unknown>, ownerDryRun: Record<string, unknown>}}
 */
function readInputs() {
  const inputs = {
    wp53: readJson(path.join(root, "dist", "wp53-capability-consent-write-authority-refresh", "evidence.json")),
    handoff: readJson(path.join(root, "dist", "wp46-target-owner-handoff-report-packet", "evidence.json")),
    ownerDryRun: readJson(path.join(root, "dist", "wp47-target-owner-pilot-dry-run-report-intake", "evidence.json"))
  };

  assert.equal(inputs.wp53.status, "ready-for-wp53-target-owner-evidence-currentness-and-trial-selection");
  assert.equal(inputs.handoff.status, "ready-for-wp46-closeout-and-wp47-wp48-inputs");
  assert.equal(inputs.ownerDryRun.status, "ready-for-wp47-closeout-and-wp48-inputs");
  assert.equal(Array.isArray(inputs.handoff.handoffBindings), true);
  return inputs;
}

/**
 * 选择最低权限的自项目候选，并把外部目标维持在 owner-report gate 之后。
 *
 * @lang en Selects the lowest-authority self-project candidate while keeping external targets behind the owner-report gate.
 * @param {Array<Record<string, unknown>>} bindings <lang><zh-CN>W-P46 的公开 handoff bindings。</zh-CN><en>Public W-P46 handoff bindings.</en></lang>
 * @returns {Array<Record<string, unknown>>}
 */
function createSelections(bindings) {
  return bindings.map((binding) => {
    const base = {
      scenarioId: binding.scenarioId,
      kind: binding.kind,
      targetLabel: binding.targetLabel,
      handoffStatus: binding.handoffStatus,
      ownerActionRequired: binding.targetOwnerAction?.required === true,
      requiredEvidenceKindCount: Array.isArray(binding.requiredEvidenceKinds) ? binding.requiredEvidenceKinds.length : 0,
      readOnlyHostProjectionCount: Array.isArray(binding.hostProjectionRefs)
        ? binding.hostProjectionRefs.filter((item) => item.readOnly === true).length
        : 0,
      targetSourceRead: false,
      targetRepositoryMutated: false,
      checkedApplyTriggered: false,
      finalWriteAuthorized: false
    };

    if (binding.kind === "hia-self") {
      return {
        ...base,
        selection: "candidate-selected-for-wp53-vscode-self-sandbox-gate",
        rationale: "The HIA self scenario is the only candidate that can be assessed without requesting an external target-owner report or opening a target repository.",
        requiresExplicitUserConfirmationBeforeWrite: true,
        requiresOwnerReportBeforeTargetTrial: false
      };
    }

    if (binding.kind === "target-project") {
      return {
        ...base,
        selection: "deferred-awaiting-target-owner-metadata-report",
        rationale: "Target-project trials remain owner-submitted and metadata-only until a validated report is voluntarily provided.",
        requiresExplicitUserConfirmationBeforeWrite: true,
        requiresOwnerReportBeforeTargetTrial: true
      };
    }

    return {
      ...base,
      selection: "deferred-awaiting-separate-satellite-owner-charter",
      rationale: "A satellite repository requires a separately scoped owner charter before adoption or mutation work is selected.",
      requiresExplicitUserConfirmationBeforeWrite: true,
      requiresOwnerReportBeforeTargetTrial: true
    };
  });
}

/**
 * 汇总 handoff currentness 和候选选择，不把候选误写成已经执行的试点。
 *
 * @lang en Summarizes handoff currentness and candidate selection without representing a candidate as an executed pilot.
 */
function summarize(inputs, selections) {
  const handoffSummary = summaryOf(inputs.handoff);
  const dryRunSummary = summaryOf(inputs.ownerDryRun);
  const wp53Summary = summaryOf(inputs.wp53);
  return {
    phase: "W-P53.2",
    inputEvidenceCount: 3,
    readyInputEvidenceCount: 3,
    inputHardFailureCount: sum([handoffSummary.hardFailureCount, dryRunSummary.hardFailureCount, wp53Summary.hardFailureCount]),
    handoffBindingCount: selections.length,
    selfSandboxCandidateCount: selections.filter((item) => item.selection === "candidate-selected-for-wp53-vscode-self-sandbox-gate").length,
    targetOwnerReportDeferredCount: selections.filter((item) => item.selection === "deferred-awaiting-target-owner-metadata-report").length,
    satelliteOwnerCharterDeferredCount: selections.filter((item) => item.selection === "deferred-awaiting-separate-satellite-owner-charter").length,
    realOwnerReportSubmittedCount: sum([handoffSummary.ownerSubmittedReportCount, dryRunSummary.realTargetOwnerReportSubmittedCount]),
    ownerReportSubmissionSlotReady: dryRunSummary.targetOwnerReportSubmissionSlotReady === true,
    selectedPilotExecutedCount: 0,
    checkedApplyWriteEnabledCount: sum([wp53Summary.checkedApplyWriteEnabledCount, dryRunSummary.checkedApplyWriteEnabledCount]),
    hostEditorApiCallCount: sum([wp53Summary.hostEditorApiCallCount, dryRunSummary.hostEditorApiCallCount]),
    checkedApplyTriggeredCount: sum([wp53Summary.checkedApplyTriggeredCount, dryRunSummary.checkedApplyTriggeredCount]),
    workspaceWriteAllowedCount: sum([wp53Summary.workspaceWriteAllowedCount, dryRunSummary.workspaceWriteAllowedCount]),
    targetCommandExecutedByHiaCount: sum([wp53Summary.targetCommandExecutedByHiaCount, dryRunSummary.targetCommandExecutedByHiaCount]),
    targetRepositoryMutationCount: sum([wp53Summary.targetRepositoryMutationCount, dryRunSummary.targetRepositoryMutationCount]),
    providerNetworkExecutedCount: sum([wp53Summary.providerNetworkExecutedCount]),
    sourceBodyIncludedCount: sum([wp53Summary.sourceBodyIncludedCount, dryRunSummary.sourceBodyIncludedInEvidenceCount]),
    reportBodyStoredCount: number(dryRunSummary.reportBodyStoredCount),
    secretValueIncludedCount: sum([wp53Summary.secretValueIncludedCount, dryRunSummary.secretValueIncludedCount]),
    localAbsolutePathDetectedCount: sum([wp53Summary.localAbsolutePathDetectedCount, dryRunSummary.localAbsolutePathDetectedCount]),
    sourcesContentPolicy: "none",
    nextStage: "W-P53.3 VS Code Host-Owned Self-Sandbox Pilot Gate"
  };
}

/**
 * 只描述本阶段不执行的操作，不把候选选择转化为权限。
 *
 * @lang en Describes operations not executed by this phase and never turns a candidate selection into authority.
 */
function executionPolicy() {
  return {
    policy: "owner-evidence-currentness-and-candidate-selection-no-write",
    targetRepositoryMayBeRead: false,
    targetRepositoryMayBeMutated: false,
    targetCommandMayBeExecutedByHia: false,
    targetBranchOrPrMayBeCreatedByHia: false,
    hostEditorApiMayBeCalled: false,
    checkedApplyMayBeTriggered: false,
    workspaceWriteMayBeAllowed: false,
    providerNetworkMayBeExecuted: false,
    ownerReportBodyMayBeStored: false,
    sourceBodyMayBeRead: false,
    sourceBodyMayBeSerialized: false,
    sourcesContentPolicy: "none"
  };
}

/**
 * 建立 owner report、self candidate 和 target boundary 的硬门禁。
 *
 * @lang en Builds hard gates for owner reports, the self candidate, and target boundaries.
 */
function createChecks(inputs, selections, summary) {
  return [
    check("source-inputs-ready", summary.readyInputEvidenceCount === 3 && summary.inputHardFailureCount === 0,
      "W-P53.1, W-P46 handoff, and W-P47 owner dry-run inputs are ready without hard failures."),
    check("four-handoffs-preserved", summary.handoffBindingCount === 4
      && selections.every((item) => item.handoffStatus === "ready-for-target-owner-report-packet"),
    "All original handoffs remain intact and no target scenario is silently dropped."),
    check("self-candidate-only", summary.selfSandboxCandidateCount === 1
      && summary.targetOwnerReportDeferredCount === 2
      && summary.satelliteOwnerCharterDeferredCount === 1,
    "Only the HIA self scenario is selected as a future gate candidate; target and satellite scenarios remain deferred."),
    check("owner-reports-not-invented", summary.realOwnerReportSubmittedCount === 0 && summary.ownerReportSubmissionSlotReady,
      "No real owner report is claimed; a future metadata-only submission slot remains available."),
    check("no-pilot-execution", summary.selectedPilotExecutedCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.providerNetworkExecutedCount === 0,
    "Candidate selection grants no write, host call, target command, target mutation, or network execution."),
    check("privacy-boundary-intact", summary.sourceBodyIncludedCount === 0
      && summary.reportBodyStoredCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.sourcesContentPolicy === "none",
    "Only metadata/status is retained; report/source bodies and private markers remain excluded."),
    check("explicit-confirmation-still-required", selections.every((item) => item.requiresExplicitUserConfirmationBeforeWrite === true),
      "Every future write path still requires a separate explicit user confirmation.")
  ];
}

function createSourceInputs(inputs) {
  return [
    sourceInput("W-P53.1", "capability-consent-write-authority-refresh", inputs.wp53),
    sourceInput("W-P46.6", "target-owner-handoff-report-packet", inputs.handoff),
    sourceInput("W-P47.6", "target-owner-pilot-dry-run-report-intake", inputs.ownerDryRun)
  ];
}

function sourceInput(phase, topic, evidence) {
  return {
    phase,
    topic,
    contract: evidence.contract,
    status: evidence.status,
    hardFailureCount: number(summaryOf(evidence).hardFailureCount),
    grantsWriteAuthority: false,
    sourcesContentPolicy: "none"
  };
}

function renderOverview(evidence) {
  const summary = evidence.summary;
  return `# W-P53.2 Owner Evidence Currentness And Trial Selection

## 中文摘要

W-P53.2 保留 W-P46 的四条 handoff：仅将 HIA self documentation 选为后续 VS Code
self-sandbox gate 的候选；UnicodeArtJs、HIA-ASPNETPortal 均继续等待 target owner 主动
提交的 metadata-only report；卫星仓库继续等待独立 owner charter。候选不是已执行试点，
更不是写入授权。

## Summary

- status：\`${evidence.status}\`
- handoff bindings：${summary.handoffBindingCount}
- self-sandbox candidate / target report deferred / satellite charter deferred：${summary.selfSandboxCandidateCount} / ${summary.targetOwnerReportDeferredCount} / ${summary.satelliteOwnerCharterDeferredCount}
- real owner reports / selected pilot executions：${summary.realOwnerReportSubmittedCount} / ${summary.selectedPilotExecutedCount}
- checked apply / host editor API / workspace write / target mutation：${summary.checkedApplyWriteEnabledCount} / ${summary.hostEditorApiCallCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount}
- next stage：\`${summary.nextStage}\`
`;
}

function renderSelectionLedger(evidence) {
  const rows = evidence.trialSelections
    .map((item) => `| \`${item.scenarioId}\` | ${item.targetLabel} | \`${item.selection}\` | ${item.requiresOwnerReportBeforeTargetTrial ? "yes" : "no"} | ${item.requiresExplicitUserConfirmationBeforeWrite ? "yes" : "no"} |`)
    .join("\n");
  return `# W-P53.2 试点候选选择台账

## 中文摘要

此表只描述评估顺序。任何 target 项目仍由其 owner 自行操作；即使 HIA self candidate
也必须在 W-P53.3 前获得一次具体的、范围明确的 user confirmation。

| Scenario | Target | Selection | Owner report required | Explicit user confirmation before write |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function check(id, passed, description) {
  return { id, status: passed ? "pass" : "fail", description };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function summaryOf(evidence) {
  return evidence.summary ?? {};
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

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])Users[\\/]/iu, `${label} must not expose user profile paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
