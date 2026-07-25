import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp47-rollback-formatter-audit-pilot-gate");
const evidencePath = path.join(outputRoot, "evidence.json");
const contractPath = path.join(outputRoot, "wp47-rollback-formatter-audit-contract.md");
const fixtureMatrixPath = path.join(outputRoot, "wp47-rollback-formatter-audit-fixture-matrix.md");
const summaryPath = path.join(outputRoot, "wp47-rollback-formatter-audit-summary.md");

const inputPaths = {
  wp47PreflightGate: path.join(rootDir, "dist", "wp47-file-version-conflict-preflight-pilot-gate", "evidence.json"),
  wp47TransactionEnvelope: path.join(rootDir, "dist", "wp47-host-owned-pilot-transaction-envelope", "evidence.json"),
  wp42RollbackFormatterAuditHardening: path.join(rootDir, "dist", "wp42-rollback-formatter-audit-hardening", "evidence.json"),
  wp37RollbackFormatterAudit: path.join(rootDir, "dist", "wp37-rollback-formatter-audit", "evidence.json"),
  wp38SandboxRollbackFailurePath: path.join(rootDir, "dist", "wp38-sandbox-rollback-restore-failure-path", "evidence.json")
};

await main();

/**
 * 生成 W-P47.4 rollback / formatter / audit pilot gate evidence。
 * Generate W-P47.4 rollback / formatter / audit pilot gate evidence.
 *
 * 中文：本阶段消费 W-P47.3 ready fixture，并把 rollback record、formatter plan、
 * post-apply validation plan、redacted audit 与 final confirmation still required
 * 绑定成写入试点前的 deterministic gate。它只判定事务能否继续进入 W-P47.5 宿主确认
 * 表面，不执行 formatter、不恢复 rollback、不触发 checked apply 写入、不调用宿主编辑
 * API，也不保存源码正文、摘要值、secret、本地路径或 request/response body。
 *
 * English: This stage consumes the W-P47.3 ready fixture and binds rollback
 * records, formatter plans, post-apply validation plans, redacted audit records,
 * and the still-required final confirmation into deterministic pre-write pilot
 * gates. It only decides whether a transaction may advance to the W-P47.5 host
 * confirmation surface. It does not execute formatters, restore rollbacks,
 * trigger checked apply writes, call host editor APIs, or persist source bodies,
 * digest values, secrets, local paths, or request/response bodies.
 *
 * @returns {Promise<void>} Writes public-safe W-P47.4 rollback/formatter/audit evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const contract = createRollbackFormatterAuditPilotContract(inputs);
  const fixtures = createRollbackAuditFixtures(contract);
  const checkerResults = fixtures.map((fixture) => runRollbackAuditPilotChecker(fixture, contract));
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    checkerResults,
    contract,
    fixtures,
    inputs,
    nextStageInputs
  });
  const checks = [
    check("HIA_WP47_ROLLBACK_AUDIT_INPUTS_READY", summary.inputEvidenceCount === 5
      && summary.readyInputEvidenceCount === 5
      && summary.inputHardFailureCount === 0
      && summary.wp47PreflightGateReady === true
      && summary.wp47ReadyFixtureCount === 1
      && summary.wp42RollbackAuditHardeningReady === true
      && summary.wp37RollbackAuditReady === true
      && summary.wp38RollbackFailurePathReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount,
        wp37RollbackAuditReady: summary.wp37RollbackAuditReady,
        wp38RollbackFailurePathReady: summary.wp38RollbackFailurePathReady,
        wp42RollbackAuditHardeningReady: summary.wp42RollbackAuditHardeningReady,
        wp47PreflightGateReady: summary.wp47PreflightGateReady,
        wp47ReadyFixtureCount: summary.wp47ReadyFixtureCount
      }
    }),
    check("HIA_WP47_ROLLBACK_AUDIT_CONTROL_COVERAGE", summary.requiredControlCount >= 12
      && summary.requiredGateCount >= 12
      && summary.rollbackControlCount >= 3
      && summary.formatterControlCount >= 2
      && summary.postValidationControlCount >= 2
      && summary.auditControlCount >= 2
      && summary.boundaryControlCount >= 3, {
      actual: {
        auditControlCount: summary.auditControlCount,
        boundaryControlCount: summary.boundaryControlCount,
        formatterControlCount: summary.formatterControlCount,
        postValidationControlCount: summary.postValidationControlCount,
        requiredControlCount: summary.requiredControlCount,
        requiredGateCount: summary.requiredGateCount,
        rollbackControlCount: summary.rollbackControlCount
      }
    }),
    check("HIA_WP47_ROLLBACK_AUDIT_FIXTURE_COVERAGE", summary.fixtureCount === summary.denialFixtureCount + summary.readyFixtureCount
      && summary.denialFixtureCount >= 12
      && summary.readyFixtureCount === 1
      && summary.expectedDeniedFixtureCount === summary.actualDeniedFixtureCount
      && summary.mismatchedFixtureCount === 0, {
      actual: {
        actualDeniedFixtureCount: summary.actualDeniedFixtureCount,
        denialFixtureCount: summary.denialFixtureCount,
        expectedDeniedFixtureCount: summary.expectedDeniedFixtureCount,
        fixtureCount: summary.fixtureCount,
        mismatchedFixtureCount: summary.mismatchedFixtureCount,
        readyFixtureCount: summary.readyFixtureCount
      }
    }),
    check("HIA_WP47_ROLLBACK_AUDIT_CORE_DENIALS", summary.missingRollbackDeniedCount === 1
      && summary.rollbackLeakDeniedCount === 1
      && summary.rollbackRestorePlanMissingDeniedCount === 1
      && summary.rollbackRestoreExecutionClaimDeniedCount === 1
      && summary.formatterPlanMissingDeniedCount === 1
      && summary.formatterExecutionClaimDeniedCount === 1
      && summary.postValidationPlanMissingDeniedCount === 1
      && summary.auditMissingDeniedCount === 1
      && summary.auditUnredactedDeniedCount === 1, {
      actual: {
        auditMissingDeniedCount: summary.auditMissingDeniedCount,
        auditUnredactedDeniedCount: summary.auditUnredactedDeniedCount,
        formatterExecutionClaimDeniedCount: summary.formatterExecutionClaimDeniedCount,
        formatterPlanMissingDeniedCount: summary.formatterPlanMissingDeniedCount,
        missingRollbackDeniedCount: summary.missingRollbackDeniedCount,
        postValidationPlanMissingDeniedCount: summary.postValidationPlanMissingDeniedCount,
        rollbackLeakDeniedCount: summary.rollbackLeakDeniedCount,
        rollbackRestoreExecutionClaimDeniedCount: summary.rollbackRestoreExecutionClaimDeniedCount,
        rollbackRestorePlanMissingDeniedCount: summary.rollbackRestorePlanMissingDeniedCount
      }
    }),
    check("HIA_WP47_ROLLBACK_AUDIT_READY_REMAINS_CONFIRMATION_ONLY", summary.readyForHostConfirmationSurfacePilotPacketCount === 1
      && summary.finalHumanConfirmationRequiredCount === summary.fixtureCount
      && summary.readyFixtureGrantsWriteAuthorityCount === 0
      && summary.repeatConflictCheckStillRequiredBeforeFutureWriteCount === summary.fixtureCount, {
      actual: {
        finalHumanConfirmationRequiredCount: summary.finalHumanConfirmationRequiredCount,
        readyFixtureGrantsWriteAuthorityCount: summary.readyFixtureGrantsWriteAuthorityCount,
        readyForHostConfirmationSurfacePilotPacketCount: summary.readyForHostConfirmationSurfacePilotPacketCount,
        repeatConflictCheckStillRequiredBeforeFutureWriteCount: summary.repeatConflictCheckStillRequiredBeforeFutureWriteCount
      }
    }),
    check("HIA_WP47_ROLLBACK_AUDIT_NO_WRITE_OR_EXECUTION", summary.checkedApplyWriteEnabled === false
      && summary.pilotWriteAuthorized === false
      && summary.writeAuthorityGrantedCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectProducedCount === 0
      && summary.formatterExecutedInThisStageCount === 0
      && summary.rollbackRestoreExecutedInThisStageCount === 0
      && summary.postApplyValidationExecutedInThisStageCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabled: summary.checkedApplyWriteEnabled,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectProducedCount: summary.directEditObjectProducedCount,
        formatterExecutedInThisStageCount: summary.formatterExecutedInThisStageCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        pilotWriteAuthorized: summary.pilotWriteAuthorized,
        postApplyValidationExecutedInThisStageCount: summary.postApplyValidationExecutedInThisStageCount,
        rollbackRestoreExecutedInThisStageCount: summary.rollbackRestoreExecutedInThisStageCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeAuthorityGrantedCount: summary.writeAuthorityGrantedCount
      }
    }),
    check("HIA_WP47_ROLLBACK_AUDIT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.rollbackContentIncludedInEvidenceCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        rollbackContentIncludedInEvidenceCount: summary.rollbackContentIncludedInEvidenceCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP47_ROLLBACK_AUDIT_NEXT_STAGE_READY", summary.readyForWp47HostConfirmationSurfacePilotPacket === true
      && summary.nextStage === "W-P47.5 Host Confirmation Surface Pilot Packet", {
      actual: {
        nextStage: summary.nextStage,
        readyForWp47HostConfirmationSurfacePilotPacket: summary.readyForWp47HostConfirmationSurfacePilotPacket
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P47.4 rollback/formatter/audit pilot gate has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp47-rollback-formatter-audit-pilot-gate",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp47-host-confirmation-surface-pilot-packet",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    rollbackAuditPolicy: {
      phase: "W-P47.4",
      cycleGroupId: "C-HIA-P2",
      policy: "host-owned-rollback-formatter-audit-gate-no-write-authority",
      applyAuthorityOwner: "host",
      evaluatedScope: "metadata-only-deterministic-fixtures",
      finalHumanConfirmationRequiredAfterThisStage: true,
      repeatConflictCheckStillRequiredBeforeFutureWrite: true,
      checkedApplyWriteEnabledByThisStage: false,
      pilotWriteAuthorizedByThisStage: false,
      targetRepositoryMutationAllowedByThisStage: false,
      hostEditorApiAllowedByThisStage: false,
      formatterExecutionAllowedByThisStage: false,
      rollbackRestoreAllowedByThisStage: false,
      postApplyValidationExecutionAllowedByThisStage: false,
      sourceBodyAllowedByThisStage: false,
      sourcesContentPolicy: "none"
    },
    rollbackFormatterAuditContract: contract,
    fixtureMatrix: fixtures.map(toPublicFixture),
    checkerResults,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      contract: normalizePath(contractPath),
      fixtureMatrix: normalizePath(fixtureMatrixPath),
      summary: normalizePath(summaryPath)
    },
    manualChecks: [
      "Confirm the ready fixture only advances to host confirmation surfaces and does not grant write authority.",
      "Confirm rollback records remain host-private references and public evidence stores no rollback content or digest values.",
      "Confirm formatter, rollback restore and post-apply validation execution remain deferred until a future host-owned apply.",
      "Confirm redacted audit records contain event refs and state only, not source, request, response, secret or local path material."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P47.4 rollback/formatter/audit pilot evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(contractPath, renderContract(evidence), "utf8");
  await writeFile(fixtureMatrixPath, renderFixtureMatrix(evidence), "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    contract: contractPath,
    evidence: evidencePath,
    fixtureMatrix: fixtureMatrixPath,
    summary: summaryPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P47 rollback/formatter/audit pilot evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P47 rollback/formatter/audit pilot contract prepared at ${normalizePath(contractPath)}`);
}

async function readInputs(paths) {
  return Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)])
  ));
}

function createRollbackFormatterAuditPilotContract(inputs) {
  const inheritedHardeningControls = new Set((inputs.wp42RollbackFormatterAuditHardening.controls ?? []).map((item) => item.id));
  const controls = [
    control("preflight-ready-input-required", "preflight-not-ready", "preflight-ready", "preflight"),
    control("rollback-record-required", "rollback-record-missing", "rollback-record", "rollback"),
    control("rollback-private-reference-only", "rollback-content-or-digest-exposed", "rollback-record", "rollback"),
    control("rollback-restore-plan-required", "rollback-restore-plan-missing", "rollback-record", "rollback"),
    control("rollback-restore-execution-deferred", "rollback-restore-execution-claim", "rollback-record", "rollback"),
    control("formatter-plan-required", "formatter-plan-missing", "formatter-plan", "formatter"),
    control("formatter-execution-deferred", "formatter-execution-claim", "formatter-plan", "formatter"),
    control("post-apply-validation-plan-required", "post-validation-plan-missing", "post-apply-validation-plan", "post-validation"),
    control("post-apply-validation-execution-deferred", "post-validation-execution-claim", "post-apply-validation-plan", "post-validation"),
    control("redacted-audit-record-required", "audit-record-missing", "redacted-audit", "audit"),
    control("redacted-audit-public-safe", "audit-unredacted-or-private", "redacted-audit", "audit"),
    control("privacy-boundary-clean", "source-secret-path-or-body-signal", "privacy-boundary", "boundary"),
    control("no-write-authority-claim", "write-authority-or-target-mutation-claim", "host-owned-apply-authority", "boundary")
  ];
  const inheritedControlIds = controls.filter((item) => inheritedHardeningControls.has(item.id)).map((item) => item.id);
  const requiredGates = controls.map((item) => ({
    id: item.requiredGateId,
    controlId: item.id,
    denialCaseId: item.denialCaseId,
    status: "required-before-write-pilot",
    evaluatedByThisStage: true,
    grantsWriteAuthority: false
  }));

  return {
    contract: "hia-wp47-rollback-formatter-audit-pilot-gate",
    contractVersion: "0.1.0-draft",
    inputPreflightContract: inputs.wp47PreflightGate.contract,
    inputEnvelopeContract: inputs.wp47TransactionEnvelope.contract,
    inputHardeningContract: inputs.wp42RollbackFormatterAuditHardening.hardeningContract?.contract ?? "hia-checked-apply-rollback-formatter-audit-hardening",
    inheritedControlIds,
    controls,
    requiredGates,
    dispositions: [
      "deny-before-write-pilot",
      "ready-for-wp47-host-confirmation-surface-pilot-packet"
    ],
    finalHumanConfirmationStillRequired: true,
    repeatConflictCheckStillRequiredBeforeFutureWrite: true,
    writeAuthorityGrantedByContract: false,
    formatterExecutionAllowedByContract: false,
    rollbackRestoreAllowedByContract: false,
    postApplyValidationExecutionAllowedByContract: false,
    targetRepositoryMutationAllowedByContract: false,
    publicEvidenceSourceBodyAllowed: false,
    publicEvidenceDigestValueAllowed: false,
    publicEvidenceSecretValueAllowed: false,
    sourcesContentPolicy: "none"
  };
}

function control(id, denialCaseId, requiredGateId, group) {
  return {
    id,
    group,
    denialCaseId,
    requiredGateId,
    status: "required-before-write-pilot",
    grantsWriteAuthority: false
  };
}

function createRollbackAuditFixtures(contract) {
  const denialCases = [
    "preflight-not-ready",
    "rollback-record-missing",
    "rollback-content-or-digest-exposed",
    "rollback-restore-plan-missing",
    "rollback-restore-execution-claim",
    "formatter-plan-missing",
    "formatter-execution-claim",
    "post-validation-plan-missing",
    "post-validation-execution-claim",
    "audit-record-missing",
    "audit-unredacted-or-private",
    "source-secret-path-or-body-signal",
    "write-authority-or-target-mutation-claim"
  ];
  const fixtures = denialCases.map((caseId) => {
    const transaction = createReadyRollbackAuditTransaction(`fixture-${caseId}`, contract);
    mutateForDenialCase(transaction, caseId);
    return {
      id: `fixture-${caseId}`,
      expectedCaseId: caseId,
      expectedDisposition: "deny-before-write-pilot",
      transaction
    };
  });
  fixtures.push({
    id: "fixture-ready-for-host-confirmation-surface-pilot-packet",
    expectedCaseId: "ready-for-wp47-host-confirmation-surface-pilot-packet",
    expectedDisposition: "ready-for-wp47-host-confirmation-surface-pilot-packet",
    transaction: createReadyRollbackAuditTransaction("fixture-ready-for-host-confirmation-surface-pilot-packet", contract)
  });
  return fixtures;
}

function createReadyRollbackAuditTransaction(id, contract) {
  return {
    transactionId: id,
    contractVersion: contract.contractVersion,
    preflight: {
      ref: "wp47-preflight-ready-fixture",
      status: "ready-for-wp47-rollback-formatter-audit-pilot-gate",
      readyFixtureCount: 1,
      passed: true
    },
    rollbackRecord: {
      ref: "rollback-record:fixture",
      status: "prepared-before-apply",
      owner: "host",
      privateSnapshotRef: "host-private-rollback-snapshot:fixture",
      restorePlanStatus: "prepared",
      restoreExecutedInThisStage: false,
      sourceBodyIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      secretValueIncludedInEvidence: false
    },
    formatterPlan: {
      ref: "formatter-plan:fixture",
      status: "planned",
      owner: "host",
      executionStage: "deferred-to-host-apply",
      executedInThisStage: false,
      hostApiRequiredForExecution: true
    },
    postApplyValidationPlan: {
      ref: "post-apply-validation-plan:fixture",
      status: "planned",
      executionStage: "deferred-to-host-apply",
      executedInThisStage: false,
      validationKinds: ["syntax-or-parse", "format-consistency", "host-visible-diff-summary"]
    },
    redactedAudit: {
      ref: "redacted-audit:fixture",
      status: "drafted-before-apply",
      redactionStatus: "redacted",
      eventShapeStatus: "complete",
      eventRefs: [
        "preflight-ready",
        "rollback-record-prepared",
        "formatter-plan-prepared",
        "post-apply-validation-planned",
        "redacted-audit-drafted",
        "awaiting-final-human-confirmation"
      ],
      sourceBodyIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      secretValueIncludedInEvidence: false,
      localAbsolutePathIncludedInEvidence: false,
      requestBodyIncludedInEvidence: false,
      responseBodyIncludedInEvidence: false
    },
    finalHumanConfirmation: {
      required: true,
      status: "not-collected-by-this-stage",
      nextStage: "W-P47.5 Host Confirmation Surface Pilot Packet"
    },
    repeatConflictCheck: {
      stillRequiredBeforeFutureWrite: true,
      executedInThisStage: false
    },
    authority: {
      checkedApplyWriteEnabled: false,
      pilotWriteAuthorized: false,
      writeAuthorityGranted: false,
      hostEditorApiAllowed: false,
      checkedApplyTriggered: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      directApplyAllowed: false,
      directEditObjectProduced: false,
      providerOwnedApplyAllowed: false,
      lspServerOwnedApplyAllowed: false
    },
    privacy: {
      sourcesContentPolicy: "none",
      sourceBodyIncludedInEvidence: false,
      sourceTextIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      secretValueIncluded: false,
      digestValueIncludedInEvidence: false,
      localAbsolutePathIncluded: false,
      credentialMaterialIncluded: false
    },
    runtime: {
      formatterExecutedInThisStage: false,
      rollbackRestoreExecutedInThisStage: false,
      postApplyValidationExecutedInThisStage: false,
      targetCommandExecuted: false,
      providerNetworkExecuted: false,
      workspaceWritePerformed: false,
      targetRepositoryMutationPerformed: false
    }
  };
}

function mutateForDenialCase(transaction, caseId) {
  switch (caseId) {
    case "preflight-not-ready":
      transaction.preflight.status = "blocked";
      transaction.preflight.passed = false;
      break;
    case "rollback-record-missing":
      transaction.rollbackRecord = null;
      break;
    case "rollback-content-or-digest-exposed":
      transaction.rollbackRecord.sourceBodyIncludedInEvidence = true;
      transaction.rollbackRecord.digestValueIncludedInEvidence = true;
      break;
    case "rollback-restore-plan-missing":
      transaction.rollbackRecord.restorePlanStatus = "missing";
      break;
    case "rollback-restore-execution-claim":
      transaction.rollbackRecord.restoreExecutedInThisStage = true;
      transaction.runtime.rollbackRestoreExecutedInThisStage = true;
      break;
    case "formatter-plan-missing":
      transaction.formatterPlan.status = "missing";
      break;
    case "formatter-execution-claim":
      transaction.formatterPlan.executedInThisStage = true;
      transaction.formatterPlan.executionStage = "attempted-too-early";
      transaction.runtime.formatterExecutedInThisStage = true;
      break;
    case "post-validation-plan-missing":
      transaction.postApplyValidationPlan.status = "missing";
      break;
    case "post-validation-execution-claim":
      transaction.postApplyValidationPlan.executedInThisStage = true;
      transaction.postApplyValidationPlan.executionStage = "attempted-too-early";
      transaction.runtime.postApplyValidationExecutedInThisStage = true;
      break;
    case "audit-record-missing":
      transaction.redactedAudit = null;
      break;
    case "audit-unredacted-or-private":
      transaction.redactedAudit.redactionStatus = "unredacted";
      transaction.redactedAudit.localAbsolutePathIncludedInEvidence = true;
      break;
    case "source-secret-path-or-body-signal":
      transaction.privacy.sourceBodyIncludedInEvidence = true;
      transaction.privacy.secretValueIncluded = true;
      transaction.privacy.localAbsolutePathIncluded = true;
      break;
    case "write-authority-or-target-mutation-claim":
      transaction.authority.writeAuthorityGranted = true;
      transaction.authority.checkedApplyWriteEnabled = true;
      transaction.authority.targetRepositoryMutationAllowed = true;
      transaction.runtime.targetRepositoryMutationPerformed = true;
      break;
    default:
      throw new Error(`Unknown W-P47.4 denial case: ${caseId}.`);
  }
}

function runRollbackAuditPilotChecker(fixture, contract) {
  const actualCaseId = detectRollbackAuditCase(fixture.transaction);
  const denied = actualCaseId !== "ready-for-wp47-host-confirmation-surface-pilot-packet";
  const controlItem = contract.controls.find((item) => item.denialCaseId === actualCaseId);
  const result = {
    fixtureId: fixture.id,
    expectedCaseId: fixture.expectedCaseId,
    actualCaseId,
    expectedDisposition: fixture.expectedDisposition,
    actualDisposition: denied ? "deny-before-write-pilot" : "ready-for-wp47-host-confirmation-surface-pilot-packet",
    status: fixture.expectedCaseId === actualCaseId ? "pass" : "fail",
    deniedBeforeWritePilot: denied,
    readyForHostConfirmationSurfacePilotPacket: !denied,
    requiredControlId: controlItem?.id ?? null,
    requiredGateId: controlItem?.requiredGateId ?? null,
    finalHumanConfirmationRequired: true,
    repeatConflictCheckStillRequiredBeforeFutureWrite: true,
    writeAuthorityGranted: false,
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    hostEditorApiCallCount: 0,
    checkedApplyTriggered: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directApplyAllowed: false,
    directEditObjectProduced: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    formatterExecutedInThisStage: false,
    rollbackRestoreExecutedInThisStage: false,
    postApplyValidationExecutedInThisStage: false,
    sourceBodyIncludedInEvidence: false,
    sourceTextIncluded: false,
    rollbackContentIncludedInEvidence: false,
    requestBodyIncluded: false,
    responseBodyIncluded: false,
    secretValueIncluded: false,
    digestValueIncludedInEvidence: false,
    localAbsolutePathIncluded: false,
    publicEvidenceRedacted: true
  };
  assert.equal(result.status, "pass", `Fixture ${fixture.id} expected ${fixture.expectedCaseId} but got ${actualCaseId}.`);
  return result;
}

function detectRollbackAuditCase(transaction) {
  if (transaction.preflight?.passed !== true
    || transaction.preflight?.status !== "ready-for-wp47-rollback-formatter-audit-pilot-gate") {
    return "preflight-not-ready";
  }
  if (!transaction.rollbackRecord || transaction.rollbackRecord.status !== "prepared-before-apply") {
    return "rollback-record-missing";
  }
  if (transaction.rollbackRecord.sourceBodyIncludedInEvidence === true
    || transaction.rollbackRecord.digestValueIncludedInEvidence === true
    || transaction.rollbackRecord.secretValueIncludedInEvidence === true) {
    return "rollback-content-or-digest-exposed";
  }
  if (transaction.rollbackRecord.restorePlanStatus !== "prepared") {
    return "rollback-restore-plan-missing";
  }
  if (transaction.rollbackRecord.restoreExecutedInThisStage === true
    || transaction.runtime?.rollbackRestoreExecutedInThisStage === true) {
    return "rollback-restore-execution-claim";
  }
  if (!transaction.formatterPlan || transaction.formatterPlan.status !== "planned") {
    return "formatter-plan-missing";
  }
  if (transaction.formatterPlan.executedInThisStage === true
    || transaction.formatterPlan.executionStage !== "deferred-to-host-apply"
    || transaction.runtime?.formatterExecutedInThisStage === true) {
    return "formatter-execution-claim";
  }
  if (!transaction.postApplyValidationPlan || transaction.postApplyValidationPlan.status !== "planned") {
    return "post-validation-plan-missing";
  }
  if (transaction.postApplyValidationPlan.executedInThisStage === true
    || transaction.postApplyValidationPlan.executionStage !== "deferred-to-host-apply"
    || transaction.runtime?.postApplyValidationExecutedInThisStage === true) {
    return "post-validation-execution-claim";
  }
  if (!transaction.redactedAudit || transaction.redactedAudit.status !== "drafted-before-apply") {
    return "audit-record-missing";
  }
  if (transaction.redactedAudit.redactionStatus !== "redacted"
    || transaction.redactedAudit.sourceBodyIncludedInEvidence === true
    || transaction.redactedAudit.digestValueIncludedInEvidence === true
    || transaction.redactedAudit.secretValueIncludedInEvidence === true
    || transaction.redactedAudit.localAbsolutePathIncludedInEvidence === true
    || transaction.redactedAudit.requestBodyIncludedInEvidence === true
    || transaction.redactedAudit.responseBodyIncludedInEvidence === true) {
    return "audit-unredacted-or-private";
  }
  if (transaction.privacy?.sourcesContentPolicy !== "none"
    || transaction.privacy?.sourceBodyIncludedInEvidence === true
    || transaction.privacy?.sourceTextIncluded === true
    || transaction.privacy?.requestBodyIncluded === true
    || transaction.privacy?.responseBodyIncluded === true
    || transaction.privacy?.secretValueIncluded === true
    || transaction.privacy?.digestValueIncludedInEvidence === true
    || transaction.privacy?.localAbsolutePathIncluded === true
    || transaction.privacy?.credentialMaterialIncluded === true) {
    return "source-secret-path-or-body-signal";
  }
  if (transaction.authority?.writeAuthorityGranted === true
    || transaction.authority?.checkedApplyWriteEnabled === true
    || transaction.authority?.pilotWriteAuthorized === true
    || transaction.authority?.hostEditorApiAllowed === true
    || transaction.authority?.checkedApplyTriggered === true
    || transaction.authority?.workspaceWriteAllowed === true
    || transaction.authority?.targetRepositoryMutationAllowed === true
    || transaction.authority?.directApplyAllowed === true
    || transaction.authority?.directEditObjectProduced === true
    || transaction.runtime?.workspaceWritePerformed === true
    || transaction.runtime?.targetRepositoryMutationPerformed === true) {
    return "write-authority-or-target-mutation-claim";
  }
  return "ready-for-wp47-host-confirmation-surface-pilot-packet";
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P47.5",
      topic: "host-confirmation-surface-pilot-packet",
      status: "ready-input",
      requirement: "Project rollback/formatter/audit readiness into VS Code, DevTools and Visual Studio confirmation surfaces while keeping write disabled by default.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P47.6",
      topic: "target-owner-pilot-dry-run-report-intake",
      status: "planned-input",
      requirement: "Accept target-owner dry-run report metadata after host confirmation packet is defined.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P47.7",
      topic: "closeout-and-wp48-inputs",
      status: "planned-input",
      requirement: "Separate completed write-pilot preparation inputs from deferred real-write gates.",
      writeAuthorityGranted: false
    }
  ];
}

function summarize({ checkerResults, contract, fixtures, inputs, nextStageInputs }) {
  const inputEntries = Object.entries(inputs);
  const serializedPublicSurface = JSON.stringify({
    checkerResults,
    contract,
    fixtures: fixtures.map(toPublicFixture),
    nextStageInputs
  });
  const denialFixtureCount = fixtures.filter((item) => item.expectedDisposition === "deny-before-write-pilot").length;
  const readyFixtureCount = fixtures.filter((item) => item.expectedDisposition === "ready-for-wp47-host-confirmation-surface-pilot-packet").length;
  return {
    phase: "W-P47.4",
    inputEvidenceCount: inputEntries.length,
    readyInputEvidenceCount: inputEntries.filter(([, evidence]) => isReadyEvidence(evidence)).length,
    inputHardFailureCount: sum(inputEntries.map(([, evidence]) => evidence.summary?.hardFailureCount)),
    wp47PreflightGateReady: inputs.wp47PreflightGate.status === "ready-for-wp47-rollback-formatter-audit-pilot-gate",
    wp47ReadyFixtureCount: number(inputs.wp47PreflightGate.summary?.readyForRollbackFormatterAuditPilotGateCount),
    wp47TransactionEnvelopeReady: inputs.wp47TransactionEnvelope.status === "ready-for-wp47-file-version-conflict-preflight-pilot-gate",
    wp42RollbackAuditHardeningReady: inputs.wp42RollbackFormatterAuditHardening.status === "ready-for-provider-review-target-owner-boundary",
    wp37RollbackAuditReady: inputs.wp37RollbackFormatterAudit.status === "ready-for-vscode-checked-apply-confirmation-slice",
    wp38RollbackFailurePathReady: inputs.wp38SandboxRollbackFailurePath.status === "ready-for-remote-provider-smoke-gate-preparation",
    requiredControlCount: contract.controls.length,
    requiredGateCount: contract.requiredGates.length,
    rollbackControlCount: countGroup(contract.controls, "rollback"),
    formatterControlCount: countGroup(contract.controls, "formatter"),
    postValidationControlCount: countGroup(contract.controls, "post-validation"),
    auditControlCount: countGroup(contract.controls, "audit"),
    boundaryControlCount: countGroup(contract.controls, "boundary") + countGroup(contract.controls, "preflight"),
    fixtureCount: fixtures.length,
    denialFixtureCount,
    readyFixtureCount,
    expectedDeniedFixtureCount: denialFixtureCount,
    actualDeniedFixtureCount: checkerResults.filter((item) => item.deniedBeforeWritePilot === true).length,
    mismatchedFixtureCount: checkerResults.filter((item) => item.status !== "pass").length,
    denyBeforeWritePilotResultCount: checkerResults.filter((item) => item.actualDisposition === "deny-before-write-pilot").length,
    readyForHostConfirmationSurfacePilotPacketCount: checkerResults.filter((item) => item.readyForHostConfirmationSurfacePilotPacket === true).length,
    missingRollbackDeniedCount: countCase(checkerResults, "rollback-record-missing"),
    rollbackLeakDeniedCount: countCase(checkerResults, "rollback-content-or-digest-exposed"),
    rollbackRestorePlanMissingDeniedCount: countCase(checkerResults, "rollback-restore-plan-missing"),
    rollbackRestoreExecutionClaimDeniedCount: countCase(checkerResults, "rollback-restore-execution-claim"),
    formatterPlanMissingDeniedCount: countCase(checkerResults, "formatter-plan-missing"),
    formatterExecutionClaimDeniedCount: countCase(checkerResults, "formatter-execution-claim"),
    postValidationPlanMissingDeniedCount: countCase(checkerResults, "post-validation-plan-missing"),
    postValidationExecutionClaimDeniedCount: countCase(checkerResults, "post-validation-execution-claim"),
    auditMissingDeniedCount: countCase(checkerResults, "audit-record-missing"),
    auditUnredactedDeniedCount: countCase(checkerResults, "audit-unredacted-or-private"),
    sourceSecretPathDeniedCount: countCase(checkerResults, "source-secret-path-or-body-signal"),
    writeAuthorityClaimDeniedCount: countCase(checkerResults, "write-authority-or-target-mutation-claim"),
    finalHumanConfirmationRequiredCount: checkerResults.filter((item) => item.finalHumanConfirmationRequired === true).length,
    repeatConflictCheckStillRequiredBeforeFutureWriteCount: checkerResults.filter((item) => item.repeatConflictCheckStillRequiredBeforeFutureWrite === true).length,
    readyFixtureGrantsWriteAuthorityCount: checkerResults.filter((item) => item.readyForHostConfirmationSurfacePilotPacket === true && item.writeAuthorityGranted === true).length,
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    writeAuthorityGrantedCount: checkerResults.filter((item) => item.writeAuthorityGranted === true).length,
    hostEditorApiCallCount: sum(checkerResults.map((item) => item.hostEditorApiCallCount)),
    checkedApplyTriggeredCount: checkerResults.filter((item) => item.checkedApplyTriggered === true).length,
    workspaceWriteAllowedCount: checkerResults.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: checkerResults.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    directApplyAllowedCount: checkerResults.filter((item) => item.directApplyAllowed === true).length,
    directEditObjectProducedCount: checkerResults.filter((item) => item.directEditObjectProduced === true).length,
    providerOwnedApplyCount: checkerResults.filter((item) => item.providerOwnedApplyAllowed === true).length,
    lspServerOwnedApplyCount: checkerResults.filter((item) => item.lspServerOwnedApplyAllowed === true).length,
    formatterExecutedInThisStageCount: checkerResults.filter((item) => item.formatterExecutedInThisStage === true).length,
    rollbackRestoreExecutedInThisStageCount: checkerResults.filter((item) => item.rollbackRestoreExecutedInThisStage === true).length,
    postApplyValidationExecutedInThisStageCount: checkerResults.filter((item) => item.postApplyValidationExecutedInThisStage === true).length,
    sourceBodyIncludedInEvidenceCount: checkerResults.filter((item) => item.sourceBodyIncludedInEvidence === true).length,
    sourceTextIncludedCount: checkerResults.filter((item) => item.sourceTextIncluded === true).length,
    rollbackContentIncludedInEvidenceCount: checkerResults.filter((item) => item.rollbackContentIncludedInEvidence === true).length,
    requestBodyIncludedCount: checkerResults.filter((item) => item.requestBodyIncluded === true).length,
    responseBodyIncludedCount: checkerResults.filter((item) => item.responseBodyIncluded === true).length,
    secretValueIncludedCount: checkerResults.filter((item) => item.secretValueIncluded === true).length,
    digestValueIncludedInEvidenceCount: checkerResults.filter((item) => item.digestValueIncludedInEvidence === true).length,
    localAbsolutePathDetectedCount: countPathExposure(serializedPublicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(serializedPublicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(serializedPublicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    nextStageInputCount: nextStageInputs.length,
    readyForWp47HostConfirmationSurfacePilotPacket: true,
    nextStage: "W-P47.5 Host Confirmation Surface Pilot Packet",
    hardFailureCount: 0
  };
}

function toPublicFixture(fixture) {
  return {
    id: fixture.id,
    expectedCaseId: fixture.expectedCaseId,
    expectedDisposition: fixture.expectedDisposition,
    signalSummary: {
      preflightStatus: fixture.transaction.preflight?.status ?? "missing",
      rollbackStatus: fixture.transaction.rollbackRecord?.status ?? "missing",
      rollbackRestorePlanStatus: fixture.transaction.rollbackRecord?.restorePlanStatus ?? "missing",
      rollbackLeakSignal: fixture.transaction.rollbackRecord?.sourceBodyIncludedInEvidence === true
        || fixture.transaction.rollbackRecord?.digestValueIncludedInEvidence === true,
      rollbackRestoreExecutionClaim: fixture.transaction.rollbackRecord?.restoreExecutedInThisStage === true,
      formatterPlanStatus: fixture.transaction.formatterPlan?.status ?? "missing",
      formatterExecutionClaim: fixture.transaction.formatterPlan?.executedInThisStage === true,
      postValidationPlanStatus: fixture.transaction.postApplyValidationPlan?.status ?? "missing",
      postValidationExecutionClaim: fixture.transaction.postApplyValidationPlan?.executedInThisStage === true,
      auditStatus: fixture.transaction.redactedAudit?.status ?? "missing",
      auditRedactionStatus: fixture.transaction.redactedAudit?.redactionStatus ?? "missing",
      privacySignal: fixture.transaction.privacy?.sourceBodyIncludedInEvidence === true
        || fixture.transaction.privacy?.secretValueIncluded === true
        || fixture.transaction.privacy?.localAbsolutePathIncluded === true,
      writeAuthorityClaim: fixture.transaction.authority?.writeAuthorityGranted === true
        || fixture.transaction.authority?.checkedApplyWriteEnabled === true
        || fixture.transaction.authority?.targetRepositoryMutationAllowed === true
    },
    finalHumanConfirmationRequired: true,
    publicEvidenceContainsSourceBody: false,
    publicEvidenceContainsRollbackContent: false,
    publicEvidenceContainsDigestValue: false,
    writeAuthorityGranted: false
  };
}

function renderContract(evidence) {
  const controlRows = evidence.rollbackFormatterAuditContract.controls
    .map((item) => `| \`${item.id}\` | \`${item.group}\` | \`${item.requiredGateId}\` | \`${item.denialCaseId}\` |`)
    .join("\n");

  return `# W-P47.4 Rollback / Formatter / Audit Pilot Contract

## 中文摘要

W-P47.4 将 W-P47.3 的 ready fixture 继续推进到 rollback / formatter / post-apply validation / redacted audit gate。它只确认这些记录是否齐全、是否 public-safe、是否仍由 host 拥有，并把唯一 ready 结果交给 W-P47.5 的 host confirmation surface。它不执行写入。

## Required Controls

| Control | Group | Required Gate | Denial Case |
| --- | --- | --- | --- |
${controlRows}

## Boundary

- checked apply write: disabled
- host editor API: disabled
- workspace write: disabled
- target repository mutation: disabled
- formatter execution in this stage: disabled
- rollback restore in this stage: disabled
- post-apply validation execution in this stage: disabled
- final human confirmation: still required
- repeat conflict check before future write: still required
- source body, rollback content, digest value and secret in public evidence: disabled
`;
}

function renderFixtureMatrix(evidence) {
  const rows = evidence.checkerResults
    .map((item) => `| \`${item.fixtureId}\` | \`${item.actualCaseId}\` | \`${item.actualDisposition}\` | ${item.readyForHostConfirmationSurfacePilotPacket ? "yes" : "no"} | ${item.writeAuthorityGranted ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P47.4 Rollback / Formatter / Audit Fixture Matrix

## 中文摘要

fixture matrix 覆盖 rollback、formatter、post-apply validation、redacted audit、privacy 与 no-write-authority 的拒绝路径。ready fixture 只表示可以进入 W-P47.5 宿主确认表面，不表示可写入。

| Fixture | Case | Disposition | Ready For W-P47.5 | Grants Write |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P47.4 Rollback / Formatter / Audit Summary

## 中文摘要

- status: \`${evidence.status}\`
- fixtures: ${summary.fixtureCount}
- denial fixtures: ${summary.denialFixtureCount}
- ready fixtures: ${summary.readyFixtureCount}
- denied before write pilot: ${summary.denyBeforeWritePilotResultCount}
- ready for W-P47.5: ${summary.readyForHostConfirmationSurfacePilotPacketCount}
- checked apply write enabled: ${summary.checkedApplyWriteEnabled}
- formatter / rollback restore / post-validation executed in this stage: ${summary.formatterExecutedInThisStageCount} / ${summary.rollbackRestoreExecutedInThisStageCount} / ${summary.postApplyValidationExecutedInThisStageCount}
- workspace write / target mutation / host editor API: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.hostEditorApiCallCount}
- source body / rollback content / digest value / secret value in evidence: ${summary.sourceBodyIncludedInEvidenceCount} / ${summary.rollbackContentIncludedInEvidenceCount} / ${summary.digestValueIncludedInEvidenceCount} / ${summary.secretValueIncludedCount}

## Next

W-P47.5 should project this gate into VS Code, Chrome DevTools and Visual Studio host confirmation surfaces, still with checked apply write disabled by default.
`;
}

function countGroup(controls, group) {
  return controls.filter((item) => item.group === group).length;
}

function countCase(results, caseId) {
  return results.filter((item) => item.actualCaseId === caseId && item.deniedBeforeWritePilot === true).length;
}

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function countPathExposure(serialized) {
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countCredentialMarkers(serialized) {
  return /sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}/u.test(serialized) ? 1 : 0;
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
