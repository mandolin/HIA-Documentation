import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp37-closeout-provider-remote-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const stageDefinitions = [
  {
    id: "checked-apply-baseline",
    phase: "W-P37.1",
    path: path.join(rootDir, "dist", "wp37-checked-apply-baseline-audit", "evidence.json"),
    expectedStatus: "ready-for-host-edit-transaction-contract"
  },
  {
    id: "host-edit-transaction",
    phase: "W-P37.2",
    path: path.join(rootDir, "dist", "wp37-host-edit-transaction", "evidence.json"),
    expectedStatus: "ready-for-file-read-version-conflict-result"
  },
  {
    id: "file-read-version-conflict",
    phase: "W-P37.3",
    path: path.join(rootDir, "dist", "wp37-file-read-version-conflict", "evidence.json"),
    expectedStatus: "ready-for-rollback-formatter-audit-boundary"
  },
  {
    id: "rollback-formatter-audit",
    phase: "W-P37.4",
    path: path.join(rootDir, "dist", "wp37-rollback-formatter-audit", "evidence.json"),
    expectedStatus: "ready-for-vscode-checked-apply-confirmation-slice"
  },
  {
    id: "vscode-checked-apply-confirmation",
    phase: "W-P37.5",
    path: path.join(rootDir, "dist", "wp37-vscode-checked-apply-confirmation", "evidence.json"),
    expectedStatus: "ready-for-target-self-doc-checked-apply-dry-run"
  },
  {
    id: "target-self-doc-checked-apply-dry-run",
    phase: "W-P37.6",
    path: path.join(rootDir, "dist", "wp37-target-self-doc-checked-apply-dry-run", "evidence.json"),
    expectedStatus: "ready-for-wp37-closeout-and-provider-remote-inputs"
  }
];

await main();

/**
 * 准备 W-P37.7 checked apply closeout evidence。
 * Prepare W-P37.7 checked apply closeout evidence.
 *
 * This closeout proves the first host-owned checked apply planning chain is
 * internally consistent while keeping writable apply, real GUI confirmation,
 * remote-provider smoke and target branch/PR mutation as explicit downstream
 * inputs. It does not create editor edits, execute formatters, call providers
 * or write any target repository.
 *
 * 中文：本 closeout 证明第一轮 host-owned checked apply 规划链路已经闭合，同时
 * 将可写 apply、真实 GUI 确认、remote-provider smoke 与目标 branch/PR 修改继续
 * 保持为后续显式输入。本脚本不创建 editor edit、不执行 formatter、不调用
 * provider，也不写任何目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const stageReports = await Promise.all(stageDefinitions.map(readStageReport));
  const byId = Object.fromEntries(stageReports.map((report) => [report.id, report]));
  const baseline = byId["checked-apply-baseline"]?.evidence;
  const transaction = byId["host-edit-transaction"]?.evidence;
  const fileConflict = byId["file-read-version-conflict"]?.evidence;
  const rollbackFormatterAudit = byId["rollback-formatter-audit"]?.evidence;
  const vscodeConfirmation = byId["vscode-checked-apply-confirmation"]?.evidence;
  const targetDryRun = byId["target-self-doc-checked-apply-dry-run"]?.evidence;
  const stageInputs = stageReports.map(createStageInput);
  const closeoutBoundary = createCloseoutBoundary();
  const forwardInputs = createForwardInputs();
  const summary = {
    readyInputCount: stageReports.filter((report) => report.status === report.expectedStatus).length,
    evidenceInputCount: stageReports.length,
    inputHardFailureCount: stageReports.reduce((total, report) => total + report.hardFailureCount, 0),
    completedStageCount: stageInputs.filter((stage) => stage.ready === true).length,
    checkedApplyStageCount: stageInputs.length,
    hostOwnedApplyRequired: baseline?.summary?.hostOwnedApplyRequired,
    providerOwnedApplyAllowed: baseline?.summary?.providerOwnedApplyAllowed,
    lspServerOwnedApplyAllowed: baseline?.summary?.lspServerOwnedApplyAllowed,
    hostSurfaceInputReadyCount: Number(baseline?.summary?.hostSurfaceInputReadyCount ?? 0),
    checkedApplyEnabledHostCount: Number(baseline?.summary?.checkedApplyEnabledHostCount ?? -1),
    writeEnabledHostCount: Number(baseline?.summary?.writeEnabledHostCount ?? -1),
    transactionCount: Number(transaction?.summary?.transactionCount ?? 0),
    transactionOperationCount: Number(transaction?.summary?.transactionOperationCount ?? 0),
    fileVersionResultCount: Number(fileConflict?.summary?.fileVersionResultCount ?? 0),
    conflictResultCount: Number(fileConflict?.summary?.conflictResultCount ?? 0),
    conflictBlockingCount: Number(fileConflict?.summary?.conflictBlockingCount ?? -1),
    rollbackRecordCount: Number(rollbackFormatterAudit?.summary?.rollbackRecordCount ?? 0),
    formatterPlanCount: Number(rollbackFormatterAudit?.summary?.formatterPlanPreparedCount ?? 0),
    formatterExecutedCount: Number(rollbackFormatterAudit?.summary?.formatterExecutedCount ?? -1),
    postApplyValidationPlanCount: Number(rollbackFormatterAudit?.summary?.postApplyValidationPlanCount ?? 0),
    postApplyValidationExecutedCount: Number(rollbackFormatterAudit?.summary?.postApplyValidationExecutedCount ?? -1),
    applyAuditRecordCount: Number(rollbackFormatterAudit?.summary?.applyAuditRecordCount ?? 0),
    applyAuditRedactedCount: Number(rollbackFormatterAudit?.summary?.applyAuditRedactedCount ?? 0),
    vscodeConfirmationChoiceCount: Number(vscodeConfirmation?.summary?.confirmationChoiceCount ?? 0),
    vscodeConfirmationReportCount: Number(vscodeConfirmation?.summary?.confirmationReportCount ?? 0),
    targetSelfDocScenarioCount: Number(targetDryRun?.summary?.scenarioCount ?? 0),
    targetProjectScenarioCount: Number(targetDryRun?.summary?.targetProjectScenarioCount ?? 0),
    scenarioConfirmationReportCount: Number(targetDryRun?.summary?.scenarioConfirmationReportCount ?? 0),
    finalHumanConfirmationRequiredCount: Number(vscodeConfirmation?.summary?.finalHumanConfirmationRequiredCount ?? 0),
    finalConflictRecheckRequiredCount: Number(vscodeConfirmation?.summary?.finalConflictRecheckRequiredCount ?? 0),
    formatterExecutionRequiredAtApplyCount: Number(vscodeConfirmation?.summary?.formatterExecutionRequiredAtApplyCount ?? 0),
    postApplyValidationRequiredCount: Number(vscodeConfirmation?.summary?.postApplyValidationRequiredCount ?? 0),
    targetDryRunFinalHumanConfirmationRequiredCount: Number(targetDryRun?.summary?.scenarioFinalHumanConfirmationRequiredCount ?? 0),
    targetDryRunFinalConflictRecheckRequiredCount: Number(targetDryRun?.summary?.scenarioFinalConflictRecheckRequiredCount ?? 0),
    targetDryRunFormatterExecutionRequiredCount: Number(targetDryRun?.summary?.scenarioFormatterExecutionRequiredCount ?? 0),
    targetDryRunPostApplyValidationRequiredCount: Number(targetDryRun?.summary?.scenarioPostApplyValidationRequiredCount ?? 0),
    workspaceApplyEditCallCount: Number(vscodeConfirmation?.summary?.workspaceApplyEditCallCount ?? -1)
      + Number(targetDryRun?.summary?.workspaceApplyEditCallCount ?? -1),
    workspaceWriteAllowedCount: sumSummaryCounts(stageReports, [
      "workspaceWriteAllowedCount",
      "writeEnabledHostCount"
    ]),
    targetRepositoryMutationCount: sumSummaryCounts(stageReports, [
      "targetRepositoryMutationCount",
      "targetRepositoryMutationAllowedCount",
      "targetRepositoryWriteAttemptedCount",
      "targetRepositoryMutationAllowedBeforeConsent"
    ]),
    directApplyAllowedCount: sumSummaryCounts(stageReports, ["directApplyAllowedCount"]),
    directEditObjectCount: sumSummaryCounts(stageReports, ["directEditObjectCount"]),
    forbiddenDocumentTextMarkerCount: sumSummaryCounts(stageReports, [
      "forbiddenDocumentTextMarkerCount",
      "sourceBodyMarkerCount",
      "documentContentIncludedInEvidenceCount",
      "sourceTextMarkerCount"
    ]),
    secretValueMarkerCount: sumSummaryCounts(stageReports, [
      "secretValueMarkerCount"
    ]),
    digestValueIncludedInEvidenceCount: sumSummaryCounts(stageReports, [
      "digestValueIncludedInEvidenceCount",
      "rollbackDigestValueIncludedCount"
    ]),
    pathExposureCount: sumSummaryCounts(stageReports, ["pathExposureCount"]),
    sourcesContentPolicy: "none",
    sourceBodyReadAllowedInTargetDryRun: false,
    remoteProviderSmokeStillDeferred: true,
    writableApplySandboxRequired: true,
    realGuiManualEvidenceRequired: true,
    targetBranchPrFlowRequiredBeforeTargetMutation: true,
    forwardInputCount: forwardInputs.length
  };
  const checks = [
    check("HIA_WP37_CLOSEOUT_INPUTS_READY", summary.readyInputCount === summary.evidenceInputCount
      && summary.inputHardFailureCount === 0
      && summary.completedStageCount === 6, {
      actual: {
        inputStatuses: stageReports.map(({ expectedStatus, id, status }) => ({ expectedStatus, id, status })),
        inputHardFailureCount: summary.inputHardFailureCount
      }
    }),
    check("HIA_WP37_CLOSEOUT_HOST_OWNED_CHAIN_COMPLETE", summary.hostOwnedApplyRequired === true
      && summary.providerOwnedApplyAllowed === false
      && summary.lspServerOwnedApplyAllowed === false
      && summary.hostSurfaceInputReadyCount >= 3
      && summary.transactionCount === 2
      && summary.fileVersionResultCount === 2
      && summary.conflictResultCount === 2
      && summary.rollbackRecordCount === 2
      && summary.formatterPlanCount === 2
      && summary.applyAuditRecordCount === 2
      && summary.vscodeConfirmationChoiceCount === 2
      && summary.targetSelfDocScenarioCount === 5, {
      actual: {
        applyAuditRecordCount: summary.applyAuditRecordCount,
        conflictResultCount: summary.conflictResultCount,
        fileVersionResultCount: summary.fileVersionResultCount,
        formatterPlanCount: summary.formatterPlanCount,
        hostOwnedApplyRequired: summary.hostOwnedApplyRequired,
        hostSurfaceInputReadyCount: summary.hostSurfaceInputReadyCount,
        rollbackRecordCount: summary.rollbackRecordCount,
        targetSelfDocScenarioCount: summary.targetSelfDocScenarioCount,
        transactionCount: summary.transactionCount,
        vscodeConfirmationChoiceCount: summary.vscodeConfirmationChoiceCount
      }
    }),
    check("HIA_WP37_CLOSEOUT_FINAL_GATES_RETAINED", summary.finalHumanConfirmationRequiredCount === 2
      && summary.finalConflictRecheckRequiredCount === 2
      && summary.formatterExecutionRequiredAtApplyCount === 2
      && summary.postApplyValidationRequiredCount === 2
      && summary.targetDryRunFinalHumanConfirmationRequiredCount === summary.targetSelfDocScenarioCount
      && summary.targetDryRunFinalConflictRecheckRequiredCount === summary.targetSelfDocScenarioCount
      && summary.targetDryRunFormatterExecutionRequiredCount === summary.targetSelfDocScenarioCount
      && summary.targetDryRunPostApplyValidationRequiredCount === summary.targetSelfDocScenarioCount, {
      actual: {
        finalConflictRecheckRequiredCount: summary.finalConflictRecheckRequiredCount,
        finalHumanConfirmationRequiredCount: summary.finalHumanConfirmationRequiredCount,
        formatterExecutionRequiredAtApplyCount: summary.formatterExecutionRequiredAtApplyCount,
        postApplyValidationRequiredCount: summary.postApplyValidationRequiredCount,
        targetDryRunFinalConflictRecheckRequiredCount: summary.targetDryRunFinalConflictRecheckRequiredCount,
        targetDryRunFinalHumanConfirmationRequiredCount: summary.targetDryRunFinalHumanConfirmationRequiredCount,
        targetDryRunFormatterExecutionRequiredCount: summary.targetDryRunFormatterExecutionRequiredCount,
        targetDryRunPostApplyValidationRequiredCount: summary.targetDryRunPostApplyValidationRequiredCount
      }
    }),
    check("HIA_WP37_CLOSEOUT_NO_WRITE_AUTHORITY", summary.checkedApplyEnabledHostCount === 0
      && summary.writeEnabledHostCount === 0
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && closeoutBoundary.applyAuthority === "host-owned-downstream-only", {
      actual: {
        checkedApplyEnabledHostCount: summary.checkedApplyEnabledHostCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeEnabledHostCount: summary.writeEnabledHostCount
      }
    }),
    check("HIA_WP37_CLOSEOUT_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.secretValueMarkerCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.pathExposureCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyReadAllowedInTargetDryRun === false, {
      actual: {
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        secretValueMarkerCount: summary.secretValueMarkerCount,
        sourceBodyReadAllowedInTargetDryRun: summary.sourceBodyReadAllowedInTargetDryRun,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP37_CLOSEOUT_FORWARD_INPUTS_DECLARED", summary.forwardInputCount === 5
      && summary.remoteProviderSmokeStillDeferred === true
      && summary.writableApplySandboxRequired === true
      && summary.realGuiManualEvidenceRequired === true
      && summary.targetBranchPrFlowRequiredBeforeTargetMutation === true
      && forwardInputs.some((input) => input.id === "host-owned-writable-apply-sandbox")
      && forwardInputs.some((input) => input.id === "real-gui-confirmation-evidence")
      && forwardInputs.some((input) => input.id === "remote-provider-smoke-after-governance")
      && forwardInputs.some((input) => input.id === "target-branch-pr-flow")
      && forwardInputs.some((input) => input.id === "additional-host-confirmation-surfaces"), {
      actual: {
        forwardInputs: forwardInputs.map(({ id, status }) => ({ id, status })),
        realGuiManualEvidenceRequired: summary.realGuiManualEvidenceRequired,
        remoteProviderSmokeStillDeferred: summary.remoteProviderSmokeStillDeferred,
        targetBranchPrFlowRequiredBeforeTargetMutation: summary.targetBranchPrFlowRequiredBeforeTargetMutation,
        writableApplySandboxRequired: summary.writableApplySandboxRequired
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp37-closeout-provider-remote-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-next-cycle-host-apply-and-provider-remote-planning" : "blocked",
    sourceEvidence: Object.fromEntries(stageReports.map((report) => [report.id, normalizePath(report.path)])),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    stageInputs,
    closeoutBoundary,
    forwardInputs,
    checks,
    nextContractInputs: forwardInputs.map(({ id, owner, reason }) => ({
      id,
      owner,
      reason
    })),
    manualChecks: [
      "Confirm future writable apply starts in a sandbox or fixture-owned workspace before target repository branch/PR flow.",
      "Confirm real GUI apply confirmation evidence is gathered manually from an Extension Development Host or equivalent host.",
      "Confirm remote/API provider smoke remains separately approved and mediated by secret, network and source excerpt gates.",
      "Confirm target projects continue using central notify pull until an explicit branch/PR workflow is accepted."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P37 checked apply closeout evidence");
  assert.equal(hardFailures.length, 0, `W-P37 checked apply closeout evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P37 checked apply closeout evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readStageReport(definition) {
  const evidence = await readJson(definition.path);
  return {
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    evidence,
    expectedStatus: definition.expectedStatus,
    hardFailureCount: Number(evidence.summary?.hardFailureCount ?? -1),
    id: definition.id,
    path: definition.path,
    phase: definition.phase,
    status: evidence.status
  };
}

function createStageInput(report) {
  return {
    id: report.id,
    phase: report.phase,
    contract: report.contract,
    contractVersion: report.contractVersion,
    expectedStatus: report.expectedStatus,
    status: report.status,
    hardFailureCount: report.hardFailureCount,
    ready: report.status === report.expectedStatus && report.hardFailureCount === 0,
    summary: createCompactStageSummary(report.id, report.evidence.summary ?? {})
  };
}

function createCompactStageSummary(id, summary) {
  switch (id) {
    case "checked-apply-baseline":
      return pick(summary, [
        "hostOwnedApplyRequired",
        "providerOwnedApplyAllowed",
        "lspServerOwnedApplyAllowed",
        "hostSurfaceInputReadyCount",
        "checkedApplyEnabledHostCount",
        "writeEnabledHostCount",
        "blockingSafetyGateCount"
      ]);
    case "host-edit-transaction":
      return pick(summary, [
        "transactionCount",
        "transactionOperationCount",
        "targetBindingCount",
        "hostOwnedTransactionCount",
        "executableTransactionCount",
        "workspaceWriteAllowedCount",
        "targetRepositoryMutationAllowedCount"
      ]);
    case "file-read-version-conflict":
      return pick(summary, [
        "hostFileSnapshotCount",
        "fileVersionResultCount",
        "conflictResultCount",
        "conflictBlockingCount",
        "repeatBeforeApplyRequiredCount",
        "digestValueIncludedInEvidenceCount",
        "workspaceWriteAllowedCount"
      ]);
    case "rollback-formatter-audit":
      return pick(summary, [
        "rollbackRecordCount",
        "formatterPlanPreparedCount",
        "formatterExecutedCount",
        "postApplyValidationPlanCount",
        "postApplyValidationExecutedCount",
        "applyAuditRecordCount",
        "applyAuditRedactedCount",
        "applyAuthorityStillBlockedCount"
      ]);
    case "vscode-checked-apply-confirmation":
      return pick(summary, [
        "confirmationChoiceCount",
        "confirmationReportCount",
        "readyForHostConfirmationCount",
        "applyAuthorityStillBlockedCount",
        "workspaceApplyEditCallCount",
        "workspaceWriteAllowedCount"
      ]);
    case "target-self-doc-checked-apply-dry-run":
      return pick(summary, [
        "scenarioCount",
        "selfDocScenarioCount",
        "targetProjectScenarioCount",
        "scenarioConfirmationReportCount",
        "scenarioApplyAuthorityStillBlockedCount",
        "workspaceApplyEditCallCount",
        "targetRepositoryMutationCount",
        "pathExposureCount"
      ]);
    default:
      return {};
  }
}

function createCloseoutBoundary() {
  return {
    applyAuthority: "host-owned-downstream-only",
    providerOutputPolicy: "review-augmentation-only",
    checkedApplyResultMode: "confirmation-preview-and-contract-evidence",
    writableApplyEnabled: false,
    directEditorObjectAllowed: false,
    formatterExecutionEnabled: false,
    targetRepositoryMutationAllowed: false,
    completedContracts: [
      "checked-apply-baseline-audit",
      "host-edit-transaction",
      "file-read-version-conflict",
      "rollback-formatter-audit",
      "vscode-checked-apply-confirmation",
      "target-self-doc-checked-apply-dry-run"
    ],
    retainedGates: [
      "final-human-confirmation",
      "repeat-conflict-check-before-apply",
      "host-owned-formatter-execution",
      "post-apply-validation",
      "redacted-apply-audit-record",
      "private-rollback-record",
      "target-branch-or-pr-boundary-before-target-mutation"
    ]
  };
}

function createForwardInputs() {
  return [
    {
      id: "host-owned-writable-apply-sandbox",
      owner: "host-shell",
      status: "required-before-any-real-write",
      reason: "The contract chain is ready, but applying edits must first be proven inside a sandbox or fixture-owned workspace.",
      requiredGates: [
        "final-human-confirmation",
        "repeat-conflict-check-before-apply",
        "host-owned-formatter-execution",
        "post-apply-validation",
        "redacted-apply-audit-record",
        "private-rollback-record"
      ]
    },
    {
      id: "real-gui-confirmation-evidence",
      owner: "ide-host",
      status: "manual-evidence-required",
      reason: "VS Code helpers are covered by tests, but a real Extension Development Host confirmation pass should be captured before enabling apply UX."
    },
    {
      id: "remote-provider-smoke-after-governance",
      owner: "provider-runner-and-host",
      status: "deferred-explicit-approval-required",
      reason: "Remote/API provider smoke still depends on configured provider identity, host-managed secret references, network consent and source excerpt opt-in."
    },
    {
      id: "target-branch-pr-flow",
      owner: "target-collaboration-policy",
      status: "deferred-before-target-mutation",
      reason: "Known target projects remain read-only from this workspace; later target mutation must use an accepted branch/PR or sandbox workflow."
    },
    {
      id: "additional-host-confirmation-surfaces",
      owner: "devtools-and-visual-studio-hosts",
      status: "future-host-parity-input",
      reason: "DevTools and Visual Studio should consume the same checked apply confirmation boundary after the VS Code first slice is stable."
    }
  ];
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function pick(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function sumSummaryCounts(stageReports, keys) {
  return stageReports.reduce((total, report) => {
    return total + keys.reduce((keyTotal, key) => {
      const value = report.evidence.summary?.[key];
      return keyTotal + (typeof value === "number" ? value : value === true ? 1 : 0);
    }, 0);
  }, 0);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/(?:^|[\s"'({\[])[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
  assert(!/(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u.test(serialized), `${label} must not include token-looking values.`);
}
