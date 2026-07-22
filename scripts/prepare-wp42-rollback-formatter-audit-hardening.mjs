import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp42-rollback-formatter-audit-hardening");
const evidencePath = path.join(outputRoot, "evidence.json");
const hardeningSummaryPath = path.join(outputRoot, "rollback-formatter-audit-hardening-summary.md");
const denialCheckerPath = path.join(rootDir, "dist", "wp42-preflight-denial-checker-fixtures", "evidence.json");
const wp37RollbackAuditPath = path.join(rootDir, "dist", "wp37-rollback-formatter-audit", "evidence.json");
const wp38RollbackFailurePath = path.join(rootDir, "dist", "wp38-sandbox-rollback-restore-failure-path", "evidence.json");

await main();

/**
 * 准备 W-P42.4 rollback / formatter / audit hardening evidence。
 * Prepare W-P42.4 rollback / formatter / audit hardening evidence.
 *
 * This stage refines the W-P42.3 denial checker with host-owned rollback,
 * formatter, post-apply validation and redacted audit controls. It records
 * deterministic success/failure fixtures only; it does not execute formatters,
 * restore files, call editor APIs, grant write authority or mutate targets.
 *
 * 中文：本阶段在 W-P42.3 denial checker 基础上细化宿主拥有的 rollback、formatter、
 * post-apply validation 与 redacted audit 控制。它只记录确定性的成功/失败夹具，不执行
 * formatter、不恢复文件、不调用编辑器 API、不授予写入权，也不修改目标项目。
 *
 * @returns {Promise<void>} Writes public-safe W-P42.4 hardening evidence and summary.
 */
async function main() {
  const inputs = await readInputs();
  const controls = createHardeningControls();
  const fixtures = createFixtures(controls);
  const checkerResults = fixtures.map((fixture) => runRollbackAuditHardeningChecker(fixture, controls));
  const refinedDenialMappings = createRefinedDenialMappings(controls);
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    checkerResults,
    controls,
    fixtures,
    inputs,
    nextStageInputs,
    refinedDenialMappings
  });
  const checks = [
    check("HIA_WP42_ROLLBACK_AUDIT_INPUTS_READY", summary.denialCheckerInputReady === true
      && summary.rollbackAuditInputReady === true
      && summary.rollbackFailureInputReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        denialCheckerInputReady: summary.denialCheckerInputReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        rollbackAuditInputReady: summary.rollbackAuditInputReady,
        rollbackFailureInputReady: summary.rollbackFailureInputReady
      }
    }),
    check("HIA_WP42_ROLLBACK_AUDIT_CONTROL_COVERAGE", summary.hardeningControlCount >= 8
      && summary.requiredControlCount === summary.hardeningControlCount
      && summary.refinedDenialMappingCount === summary.hardeningControlCount
      && summary.fixtureCount === summary.hardeningControlCount + 1, {
      actual: {
        fixtureCount: summary.fixtureCount,
        hardeningControlCount: summary.hardeningControlCount,
        refinedDenialMappingCount: summary.refinedDenialMappingCount,
        requiredControlCount: summary.requiredControlCount
      }
    }),
    check("HIA_WP42_ROLLBACK_AUDIT_DENIAL_FIXTURES", summary.denialFixtureCount === summary.deniedBeforeWriteResultCount
      && summary.readyFixtureCount === summary.readyForProviderBoundaryReviewCount
      && summary.mismatchedFixtureCount === 0, {
      actual: {
        denialFixtureCount: summary.denialFixtureCount,
        deniedBeforeWriteResultCount: summary.deniedBeforeWriteResultCount,
        mismatchedFixtureCount: summary.mismatchedFixtureCount,
        readyFixtureCount: summary.readyFixtureCount,
        readyForProviderBoundaryReviewCount: summary.readyForProviderBoundaryReviewCount
      }
    }),
    check("HIA_WP42_ROLLBACK_AUDIT_CORE_GATES", summary.missingRollbackDenied === true
      && summary.rollbackLeakDenied === true
      && summary.formatterPlanMissingDenied === true
      && summary.formatterExecutionTooEarlyDenied === true
      && summary.postValidationMissingDenied === true
      && summary.auditMissingDenied === true
      && summary.auditUnredactedDenied === true
      && summary.rollbackRestorePlanMissingDenied === true, {
      actual: {
        auditMissingDenied: summary.auditMissingDenied,
        auditUnredactedDenied: summary.auditUnredactedDenied,
        formatterExecutionTooEarlyDenied: summary.formatterExecutionTooEarlyDenied,
        formatterPlanMissingDenied: summary.formatterPlanMissingDenied,
        missingRollbackDenied: summary.missingRollbackDenied,
        postValidationMissingDenied: summary.postValidationMissingDenied,
        rollbackLeakDenied: summary.rollbackLeakDenied,
        rollbackRestorePlanMissingDenied: summary.rollbackRestorePlanMissingDenied
      }
    }),
    check("HIA_WP42_ROLLBACK_AUDIT_NO_WRITE_AUTHORITY", summary.writeAuthorityGrantedCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.formatterExecutedCount === 0
      && summary.rollbackRestoreExecutedInThisStageCount === 0
      && summary.postApplyValidationExecutedCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        formatterExecutedCount: summary.formatterExecutedCount,
        postApplyValidationExecutedCount: summary.postApplyValidationExecutedCount,
        rollbackRestoreExecutedInThisStageCount: summary.rollbackRestoreExecutedInThisStageCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeAuthorityGrantedCount: summary.writeAuthorityGrantedCount
      }
    }),
    check("HIA_WP42_ROLLBACK_AUDIT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.rollbackContentIncludedInEvidenceCount === 0
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        rollbackContentIncludedInEvidenceCount: summary.rollbackContentIncludedInEvidenceCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP42_ROLLBACK_AUDIT_NEXT_STAGE_READY", nextStageInputs.some((item) => item.phase === "W-P42.5")
      && summary.readyForProviderReviewTargetOwnerBoundary === true, {
      actual: {
        nextStages: nextStageInputs.map((item) => item.phase),
        readyForProviderReviewTargetOwnerBoundary: summary.readyForProviderReviewTargetOwnerBoundary
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp42-rollback-formatter-audit-hardening-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-provider-review-target-owner-boundary" : "blocked",
    sourceEvidence: {
      preflightDenialChecker: normalizePath(denialCheckerPath),
      rollbackFormatterAudit: normalizePath(wp37RollbackAuditPath),
      sandboxRollbackFailurePath: normalizePath(wp38RollbackFailurePath)
    },
    hardeningContract: {
      contract: "hia-checked-apply-rollback-formatter-audit-hardening",
      contractVersion: "0.1.0-draft",
      owner: "host-owned-preflight",
      sourceCheckerRef: inputs.denialChecker.contract,
      policy: "deny-before-write-until-rollback-formatter-validation-and-audit-are-complete",
      readyDisposition: "ready-for-provider-review-target-owner-boundary",
      writeAuthorityGrantedByThisContract: false,
      formatterExecutionAllowedByThisContract: false,
      rollbackRestoreAllowedByThisContract: false,
      targetRepositoryMutationAllowedByThisContract: false,
      sourcesContentPolicy: "none"
    },
    controls,
    refinedDenialMappings,
    fixtureMatrix: fixtures.map(toPublicFixture),
    checkerResults,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      hardeningSummary: normalizePath(hardeningSummaryPath)
    },
    manualChecks: [
      "Confirm later host-owned apply UX still asks for final confirmation after these rollback, formatter and audit controls pass.",
      "Confirm formatter execution and rollback restore remain deferred to later host apply execution, not W-P42.4 evidence generation.",
      "Confirm rollback snapshots are referenced only by safe ids and never expose source body, digest values or local absolute paths.",
      "Confirm W-P42.5 consumes this as provider/target-owner boundary input without converting review context into write authority."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P42 rollback formatter audit hardening evidence");
  assert.equal(hardFailures.length, 0, `W-P42 rollback formatter audit hardening has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(hardeningSummaryPath, renderHardeningSummary(evidence), "utf8");
  console.log(`W-P42 rollback formatter audit hardening evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P42 rollback formatter audit hardening summary prepared at ${normalizePath(hardeningSummaryPath)}`);
}

async function readInputs() {
  return {
    denialChecker: await readJson(denialCheckerPath),
    rollbackAudit: await readJson(wp37RollbackAuditPath),
    rollbackFailure: await readJson(wp38RollbackFailurePath)
  };
}

function createHardeningControls() {
  return [
    control("rollback-record-required", "missing-rollback-record", "rollback-record"),
    control("rollback-private-snapshot-reference-only", "missing-rollback-record", "rollback-record"),
    control("rollback-restore-plan-required", "missing-rollback-record", "rollback-record"),
    control("formatter-plan-required", "formatter-or-validation-plan-missing", "formatter-plan"),
    control("formatter-execution-deferred-to-host-apply", "formatter-or-validation-plan-missing", "formatter-plan"),
    control("post-apply-validation-plan-required", "formatter-or-validation-plan-missing", "post-apply-validation-plan"),
    control("apply-audit-record-required", "audit-record-missing-or-unredacted", "redacted-apply-audit"),
    control("apply-audit-redaction-required", "audit-record-missing-or-unredacted", "redacted-apply-audit")
  ];
}

function control(id, parentDenialCaseId, requiredGateId) {
  return {
    id,
    parentDenialCaseId,
    requiredGateId,
    status: "required-before-write"
  };
}

function createFixtures(controls) {
  const denialFixtures = controls.map((controlItem) => {
    const fixture = createReadyFixture(`fixture-${controlItem.id}`);
    mutateForControlFailure(fixture.transaction, controlItem.id);
    return {
      id: fixture.id,
      expectedDisposition: "deny-before-write",
      expectedControlId: controlItem.id,
      parentDenialCaseId: controlItem.parentDenialCaseId,
      transaction: fixture.transaction
    };
  });
  return [
    ...denialFixtures,
    {
      id: "fixture-rollback-formatter-audit-complete-review",
      expectedDisposition: "ready-for-provider-review-target-owner-boundary",
      expectedControlId: "all-controls-passed",
      parentDenialCaseId: null,
      transaction: createReadyFixture("fixture-rollback-formatter-audit-complete-review").transaction
    }
  ];
}

function createReadyFixture(id) {
  return {
    id,
    transaction: {
      transactionId: id,
      rollback: {
        recordStatus: "prepared",
        owner: "host",
        privateSnapshotRef: "rollback-snapshot:fixture",
        restorePlanStatus: "prepared",
        sourceBodyIncluded: false,
        digestValueIncluded: false
      },
      formatter: {
        planStatus: "prepared",
        executionStatus: "deferred-to-host-apply",
        executionAllowedInThisStage: false,
        hostOwned: true
      },
      postApplyValidation: {
        planStatus: "prepared",
        executionStatus: "deferred-to-host-apply",
        executionAllowedInThisStage: false
      },
      applyAudit: {
        recordStatus: "prepared",
        redactionStatus: "redacted",
        eventShapeStatus: "complete",
        documentContentIncluded: false,
        credentialValueIncluded: false,
        localAbsolutePathIncluded: false
      },
      authority: {
        writeAuthorityGranted: false,
        workspaceWriteAllowed: false,
        targetRepositoryMutationAllowed: false,
        directApplyAllowed: false,
        checkedApplyTriggered: false
      },
      privacy: {
        sourcesContentPolicy: "none",
        sourceBodyIncluded: false,
        credentialValueIncluded: false,
        digestValueIncluded: false,
        absolutePathIncluded: false,
        directEditorObjectIncluded: false
      }
    }
  };
}

function mutateForControlFailure(transaction, controlId) {
  switch (controlId) {
    case "rollback-record-required":
      transaction.rollback.recordStatus = "missing";
      break;
    case "rollback-private-snapshot-reference-only":
      transaction.rollback.sourceBodyIncluded = true;
      break;
    case "rollback-restore-plan-required":
      transaction.rollback.restorePlanStatus = "missing";
      break;
    case "formatter-plan-required":
      transaction.formatter.planStatus = "missing";
      break;
    case "formatter-execution-deferred-to-host-apply":
      transaction.formatter.executionStatus = "attempted-too-early";
      transaction.formatter.executionAllowedInThisStage = false;
      break;
    case "post-apply-validation-plan-required":
      transaction.postApplyValidation.planStatus = "missing";
      break;
    case "apply-audit-record-required":
      transaction.applyAudit.recordStatus = "missing";
      break;
    case "apply-audit-redaction-required":
      transaction.applyAudit.redactionStatus = "unredacted";
      break;
    default:
      throw new Error(`Unknown W-P42.4 control fixture: ${controlId}`);
  }
}

function runRollbackAuditHardeningChecker(fixture, controls) {
  const failure = detectControlFailure(fixture.transaction);
  const controlItem = controls.find((item) => item.id === failure);
  const denied = Boolean(controlItem);
  const actualControlId = denied ? failure : "all-controls-passed";
  const result = {
    fixtureId: fixture.id,
    expectedControlId: fixture.expectedControlId,
    actualControlId,
    expectedDisposition: fixture.expectedDisposition,
    actualDisposition: denied ? "deny-before-write" : "ready-for-provider-review-target-owner-boundary",
    status: fixture.expectedControlId === actualControlId ? "pass" : "fail",
    parentDenialCaseId: denied ? controlItem.parentDenialCaseId : null,
    requiredGateId: denied ? controlItem.requiredGateId : null,
    deniedBeforeWrite: denied,
    readyForProviderReviewTargetOwnerBoundary: !denied,
    writeAuthorityGranted: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false,
    checkedApplyTriggered: false,
    directApplyAllowed: false,
    directEditObjectProduced: false,
    formatterExecuted: false,
    rollbackRestoreExecutedInThisStage: false,
    postApplyValidationExecuted: false,
    rollbackContentIncludedInEvidence: false,
    documentContentIncludedInEvidence: false,
    digestValueIncludedInEvidence: false,
    credentialValueIncluded: false,
    pathExposure: false
  };
  assert.equal(result.status, "pass", `Fixture ${fixture.id} expected ${fixture.expectedControlId} but got ${actualControlId}.`);
  return result;
}

function detectControlFailure(transaction) {
  if (transaction.rollback.recordStatus !== "prepared") {
    return "rollback-record-required";
  }
  if (transaction.rollback.sourceBodyIncluded === true || transaction.rollback.digestValueIncluded === true) {
    return "rollback-private-snapshot-reference-only";
  }
  if (transaction.rollback.restorePlanStatus !== "prepared") {
    return "rollback-restore-plan-required";
  }
  if (transaction.formatter.planStatus !== "prepared") {
    return "formatter-plan-required";
  }
  if (transaction.formatter.executionStatus !== "deferred-to-host-apply") {
    return "formatter-execution-deferred-to-host-apply";
  }
  if (transaction.postApplyValidation.planStatus !== "prepared") {
    return "post-apply-validation-plan-required";
  }
  if (transaction.applyAudit.recordStatus !== "prepared") {
    return "apply-audit-record-required";
  }
  if (transaction.applyAudit.redactionStatus !== "redacted") {
    return "apply-audit-redaction-required";
  }
  if (transaction.privacy.sourcesContentPolicy !== "none"
    || transaction.privacy.sourceBodyIncluded === true
    || transaction.privacy.credentialValueIncluded === true
    || transaction.privacy.digestValueIncluded === true
    || transaction.privacy.absolutePathIncluded === true
    || transaction.privacy.directEditorObjectIncluded === true) {
    return "rollback-private-snapshot-reference-only";
  }
  return null;
}

function createRefinedDenialMappings(controls) {
  return controls.map((controlItem) => ({
    controlId: controlItem.id,
    parentDenialCaseId: controlItem.parentDenialCaseId,
    requiredGateId: controlItem.requiredGateId,
    disposition: "deny-before-write"
  }));
}

function toPublicFixture(fixture) {
  return {
    id: fixture.id,
    expectedControlId: fixture.expectedControlId,
    parentDenialCaseId: fixture.parentDenialCaseId,
    expectedDisposition: fixture.expectedDisposition,
    sourceBodyIncluded: false,
    credentialValueIncluded: false,
    digestValueIncluded: false,
    localAbsolutePathIncluded: false,
    formatterExecuted: false,
    rollbackRestoreExecuted: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P42.5",
      topic: "provider-review-target-owner-boundary",
      status: "ready-input",
      reason: "Rollback, formatter, post-validation and redacted audit controls now have deterministic deny-before-write fixtures."
    },
    {
      phase: "W-P42.6",
      topic: "multi-host-contract-projection",
      status: "planned-input",
      reason: "Multi-host projections can later display refined rollback/formatter/audit denial reasons."
    },
    {
      phase: "W-P42.7",
      topic: "closeout-and-wp43-inputs",
      status: "planned-input",
      reason: "W-P42 closeout can summarize refined host preflight controls for W-P43 host UX."
    }
  ];
}

function summarize({ checkerResults, controls, fixtures, inputs, nextStageInputs, refinedDenialMappings }) {
  const summaries = [
    inputs.denialChecker.summary,
    inputs.rollbackAudit.summary,
    inputs.rollbackFailure.summary
  ];
  const deniedControlIds = new Set(checkerResults.filter((item) => item.deniedBeforeWrite).map((item) => item.actualControlId));
  return {
    denialCheckerInputReady: inputs.denialChecker.status === "ready-for-rollback-formatter-audit-hardening",
    rollbackAuditInputReady: inputs.rollbackAudit.status === "ready-for-vscode-checked-apply-confirmation-slice",
    rollbackFailureInputReady: inputs.rollbackFailure.status === "ready-for-remote-provider-smoke-gate-preparation",
    inputHardFailureCount: summaries.reduce((total, summary) => total + number(summary?.hardFailureCount), 0),
    inheritedDenialBindingCount: number(inputs.denialChecker.summary?.denialBindingCount),
    inheritedCheckerMismatches: number(inputs.denialChecker.summary?.mismatchedFixtureCount),
    sourceRollbackRecordCount: number(inputs.rollbackAudit.summary?.rollbackRecordCount),
    sourceRollbackPreparedCount: number(inputs.rollbackAudit.summary?.rollbackPreparedCount),
    sourceFormatterPlanPreparedCount: number(inputs.rollbackAudit.summary?.formatterPlanPreparedCount),
    sourcePostApplyValidationPlanCount: number(inputs.rollbackAudit.summary?.postApplyValidationPlanCount),
    sourceApplyAuditRedactedCount: number(inputs.rollbackAudit.summary?.applyAuditRedactedCount),
    sourceSandboxFailureScenarioCount: number(inputs.rollbackFailure.summary?.failureScenarioCount),
    sourceSandboxRollbackRestoreObservedCount: number(inputs.rollbackFailure.summary?.rollbackRestoreExecutedCount),
    hardeningControlCount: controls.length,
    requiredControlCount: controls.filter((item) => item.status === "required-before-write").length,
    refinedDenialMappingCount: refinedDenialMappings.length,
    fixtureCount: fixtures.length,
    denialFixtureCount: fixtures.filter((item) => item.expectedDisposition === "deny-before-write").length,
    readyFixtureCount: fixtures.filter((item) => item.expectedDisposition === "ready-for-provider-review-target-owner-boundary").length,
    deniedBeforeWriteResultCount: checkerResults.filter((item) => item.deniedBeforeWrite === true).length,
    readyForProviderBoundaryReviewCount: checkerResults.filter((item) => item.readyForProviderReviewTargetOwnerBoundary === true).length,
    mismatchedFixtureCount: checkerResults.filter((item) => item.status !== "pass").length,
    missingRollbackDenied: deniedControlIds.has("rollback-record-required"),
    rollbackLeakDenied: deniedControlIds.has("rollback-private-snapshot-reference-only"),
    rollbackRestorePlanMissingDenied: deniedControlIds.has("rollback-restore-plan-required"),
    formatterPlanMissingDenied: deniedControlIds.has("formatter-plan-required"),
    formatterExecutionTooEarlyDenied: deniedControlIds.has("formatter-execution-deferred-to-host-apply"),
    postValidationMissingDenied: deniedControlIds.has("post-apply-validation-plan-required"),
    auditMissingDenied: deniedControlIds.has("apply-audit-record-required"),
    auditUnredactedDenied: deniedControlIds.has("apply-audit-redaction-required"),
    readyForProviderReviewTargetOwnerBoundary: nextStageInputs.some((item) => item.phase === "W-P42.5" && item.status === "ready-input"),
    nextStageInputCount: nextStageInputs.length,
    writeAuthorityGrantedCount: checkerResults.filter((item) => item.writeAuthorityGranted === true).length,
    workspaceWriteAllowedCount: checkerResults.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: checkerResults.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    targetRepositoryWriteAttemptedCount: checkerResults.filter((item) => item.targetRepositoryWriteAttempted === true).length,
    checkedApplyTriggeredCount: checkerResults.filter((item) => item.checkedApplyTriggered === true).length,
    directApplyAllowedCount: checkerResults.filter((item) => item.directApplyAllowed === true).length,
    directEditObjectCount: checkerResults.filter((item) => item.directEditObjectProduced === true).length,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    formatterExecutedCount: checkerResults.filter((item) => item.formatterExecuted === true).length,
    rollbackRestoreExecutedInThisStageCount: checkerResults.filter((item) => item.rollbackRestoreExecutedInThisStage === true).length,
    postApplyValidationExecutedCount: checkerResults.filter((item) => item.postApplyValidationExecuted === true).length,
    rollbackContentIncludedInEvidenceCount: checkerResults.filter((item) => item.rollbackContentIncludedInEvidence === true).length,
    documentContentIncludedInEvidenceCount: checkerResults.filter((item) => item.documentContentIncludedInEvidence === true).length,
    digestValueIncludedInEvidenceCount: checkerResults.filter((item) => item.digestValueIncludedInEvidence === true).length,
    credentialValueIncludedCount: checkerResults.filter((item) => item.credentialValueIncluded === true).length,
    forbiddenDocumentTextMarkerCount: Math.max(
      maxSummary(summaries, "forbiddenDocumentTextMarkerCount"),
      maxSummary(summaries, "sourceBodyMarkerCount")
    ),
    pathExposureCount: checkerResults.filter((item) => item.pathExposure === true).length,
    sourcesContentPolicy: "none"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function number(value) {
  return Number(value ?? 0);
}

function maxSummary(summaries, fieldName) {
  return Math.max(...summaries.map((summary) => number(summary?.[fieldName])));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderHardeningSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P42 Rollback Formatter Audit Hardening

## Summary

- status: \`${evidence.status}\`
- hardening controls: ${summary.hardeningControlCount}
- fixtures: ${summary.fixtureCount}
- denial fixtures: ${summary.denialFixtureCount}
- ready fixtures: ${summary.readyFixtureCount}
- denied-before-write results: ${summary.deniedBeforeWriteResultCount}
- ready-for-provider-boundary results: ${summary.readyForProviderBoundaryReviewCount}
- mismatches: ${summary.mismatchedFixtureCount}
- formatter executed / rollback restored in this stage / post-apply validation executed: ${summary.formatterExecutedCount} / ${summary.rollbackRestoreExecutedInThisStageCount} / ${summary.postApplyValidationExecutedCount}
- write authority / workspace write / target mutation / checked apply trigger / direct edit: ${summary.writeAuthorityGrantedCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stage

W-P42.5 should consume these refined controls to harden provider review and target-owner evidence boundaries.
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(serialized, label) {
  const forbidden = [
    /[A-Za-z]:[\\/]/,
    /(?:^|[\\/])work-zone(?:[\\/]|$)/i,
    /(?:^|[\\/])Users[\\/]/i,
    /"sourcesContent"\s*:/i,
    /sk-[A-Za-z0-9_-]{8,}/,
    /ghp_[A-Za-z0-9_]{8,}/,
    /npm_[A-Za-z0-9_]{8,}/
  ];
  const hit = forbidden.find((pattern) => pattern.test(serialized));
  assert.equal(hit, undefined, `${label} contains a forbidden private marker: ${hit}`);
}
