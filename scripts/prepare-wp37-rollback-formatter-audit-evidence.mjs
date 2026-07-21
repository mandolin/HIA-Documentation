import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp37-rollback-formatter-audit");
const evidencePath = path.join(outputRoot, "evidence.json");
const fileReadEvidencePath = path.join(rootDir, "dist", "wp37-file-read-version-conflict", "evidence.json");

await main();

/**
 * 准备 W-P37.4 rollback / formatter / audit boundary evidence。
 * Prepare W-P37.4 rollback / formatter / audit boundary evidence.
 *
 * This evidence records the host-owned pre-apply records required after file
 * version and conflict checks: rollback plans, formatter/post-apply validation
 * plans and redacted apply audit drafts. It still does not execute formatters,
 * apply edits, write files or mutate target repositories.
 *
 * 中文：本 evidence 记录 file version 与 conflict check 之后所需的宿主拥有
 * pre-apply 记录：rollback plan、formatter/post-apply validation plan 以及
 * redacted apply audit draft。它仍不执行 formatter、不应用编辑、不写文件，也不修改
 * 目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const fileReadEvidence = await readJson(fileReadEvidencePath);
  const preflightResults = Array.isArray(fileReadEvidence.transactionPreflightResults)
    ? fileReadEvidence.transactionPreflightResults
    : [];
  const fileSnapshots = Array.isArray(fileReadEvidence.fileSnapshots) ? fileReadEvidence.fileSnapshots : [];
  const fileVersionResults = Array.isArray(fileReadEvidence.fileVersionResults) ? fileReadEvidence.fileVersionResults : [];
  const rangeResults = Array.isArray(fileReadEvidence.rangeResults) ? fileReadEvidence.rangeResults : [];
  const conflictResults = Array.isArray(fileReadEvidence.conflictResults) ? fileReadEvidence.conflictResults : [];
  const rollbackRecords = preflightResults.map((preflight, index) => createRollbackRecord(preflight, fileSnapshots[index], fileVersionResults[index], conflictResults[index], index));
  const formatterValidationRecords = preflightResults.map((preflight, index) => createFormatterValidationRecord(preflight, fileSnapshots[index], rangeResults[index], index));
  const applyAuditRecords = preflightResults.map((preflight, index) => createApplyAuditRecord(preflight, fileVersionResults[index], conflictResults[index], rollbackRecords[index], formatterValidationRecords[index], index));
  const readinessResults = preflightResults.map((preflight, index) => createReadinessResult(preflight, rollbackRecords[index], formatterValidationRecords[index], applyAuditRecords[index]));
  const boundary = createRollbackFormatterAuditBoundary();
  const summary = {
    fileReadEvidenceReady: fileReadEvidence.status === "ready-for-rollback-formatter-audit-boundary",
    fileReadHardFailureCount: Number(fileReadEvidence.summary?.hardFailureCount ?? -1),
    transactionCount: preflightResults.length,
    conflictClearCount: conflictResults.filter((result) => result.status === "clear" && result.blocking === false).length,
    rollbackRecordCount: rollbackRecords.length,
    rollbackPreparedCount: rollbackRecords.filter((record) => record.status === "prepared-before-apply").length,
    rollbackHostOwnedCount: rollbackRecords.filter((record) => record.authority.owner === "host").length,
    rollbackDocumentContentIncludedCount: rollbackRecords.filter((record) => record.privacy.documentContentIncludedInEvidence === true).length,
    rollbackDigestValueIncludedCount: rollbackRecords.filter((record) => record.privacy.digestValueIncludedInEvidence === true).length,
    formatterValidationRecordCount: formatterValidationRecords.length,
    formatterPlanPreparedCount: formatterValidationRecords.filter((record) => record.status === "planned").length,
    formatterExecutedCount: formatterValidationRecords.filter((record) => record.execution.executed === true).length,
    formatterHostOwnedCount: formatterValidationRecords.filter((record) => record.authority.owner === "host").length,
    postApplyValidationPlanCount: formatterValidationRecords.filter((record) => record.postApplyValidation.required === true).length,
    postApplyValidationExecutedCount: formatterValidationRecords.filter((record) => record.postApplyValidation.executed === true).length,
    applyAuditRecordCount: applyAuditRecords.length,
    applyAuditDraftedCount: applyAuditRecords.filter((record) => record.status === "drafted-before-apply").length,
    applyAuditRedactedCount: applyAuditRecords.filter((record) => record.redaction.status === "redacted").length,
    applyAuditEventCount: applyAuditRecords.reduce((count, record) => count + record.auditEventRefs.length, 0),
    finalHumanConfirmationRequiredCount: readinessResults.filter((result) => result.finalHumanConfirmationRequired === true).length,
    finalConflictRecheckRequiredCount: readinessResults.filter((result) => result.finalConflictRecheckRequired === true).length,
    formatterExecutionRequiredAtApplyCount: readinessResults.filter((result) => result.formatterExecutionRequiredAtApply === true).length,
    postApplyValidationRequiredCount: readinessResults.filter((result) => result.postApplyValidationRequired === true).length,
    readyForHostConfirmationCount: readinessResults.filter((result) => result.currentState === "ready-for-host-confirmation").length,
    applyAuthorityStillBlockedCount: readinessResults.filter((result) => result.safety.applyAuthorityStillBlocked === true).length,
    workspaceWriteAllowedCount: readinessResults.filter((result) => result.safety.workspaceWriteAllowed === true).length,
    targetRepositoryMutationAllowedCount: readinessResults.filter((result) => result.safety.targetRepositoryMutationAllowed === true).length,
    directApplyAllowedCount: readinessResults.filter((result) => result.safety.directApplyAllowed === true).length,
    directEditObjectCount: countDirectEditObjects({
      applyAuditRecords,
      formatterValidationRecords,
      readinessResults,
      rollbackRecords
    }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({
      applyAuditRecords,
      formatterValidationRecords,
      readinessResults,
      rollbackRecords
    }),
    secretValueMarkerCount: countSecretValueMarkers({
      applyAuditRecords,
      formatterValidationRecords,
      readinessResults,
      rollbackRecords
    })
  };
  const checks = [
    check("HIA_WP37_RFA_INPUT_READY", summary.fileReadEvidenceReady === true
      && summary.fileReadHardFailureCount === 0
      && summary.transactionCount === 2
      && summary.conflictClearCount === summary.transactionCount, {
      actual: {
        conflictClearCount: summary.conflictClearCount,
        fileReadEvidenceStatus: fileReadEvidence.status,
        fileReadHardFailureCount: summary.fileReadHardFailureCount,
        transactionCount: summary.transactionCount
      }
    }),
    check("HIA_WP37_RFA_ROLLBACK_RECORDS_READY", summary.rollbackRecordCount === summary.transactionCount
      && summary.rollbackPreparedCount === summary.transactionCount
      && summary.rollbackHostOwnedCount === summary.transactionCount
      && summary.rollbackDocumentContentIncludedCount === 0
      && summary.rollbackDigestValueIncludedCount === 0, {
      actual: {
        rollbackDigestValueIncludedCount: summary.rollbackDigestValueIncludedCount,
        rollbackDocumentContentIncludedCount: summary.rollbackDocumentContentIncludedCount,
        rollbackHostOwnedCount: summary.rollbackHostOwnedCount,
        rollbackPreparedCount: summary.rollbackPreparedCount,
        rollbackRecordCount: summary.rollbackRecordCount,
        transactionCount: summary.transactionCount
      }
    }),
    check("HIA_WP37_RFA_FORMATTER_VALIDATION_BOUNDARY", summary.formatterValidationRecordCount === summary.transactionCount
      && summary.formatterPlanPreparedCount === summary.transactionCount
      && summary.formatterHostOwnedCount === summary.transactionCount
      && summary.formatterExecutedCount === 0
      && summary.postApplyValidationPlanCount === summary.transactionCount
      && summary.postApplyValidationExecutedCount === 0, {
      actual: {
        formatterExecutedCount: summary.formatterExecutedCount,
        formatterHostOwnedCount: summary.formatterHostOwnedCount,
        formatterPlanPreparedCount: summary.formatterPlanPreparedCount,
        formatterValidationRecordCount: summary.formatterValidationRecordCount,
        postApplyValidationExecutedCount: summary.postApplyValidationExecutedCount,
        postApplyValidationPlanCount: summary.postApplyValidationPlanCount,
        transactionCount: summary.transactionCount
      }
    }),
    check("HIA_WP37_RFA_AUDIT_DRAFTS_REDACTED", summary.applyAuditRecordCount === summary.transactionCount
      && summary.applyAuditDraftedCount === summary.transactionCount
      && summary.applyAuditRedactedCount === summary.transactionCount
      && summary.applyAuditEventCount >= summary.transactionCount * 6, {
      actual: {
        applyAuditDraftedCount: summary.applyAuditDraftedCount,
        applyAuditEventCount: summary.applyAuditEventCount,
        applyAuditRecordCount: summary.applyAuditRecordCount,
        applyAuditRedactedCount: summary.applyAuditRedactedCount,
        transactionCount: summary.transactionCount
      }
    }),
    check("HIA_WP37_RFA_FINAL_GATES_STILL_REQUIRED", summary.readyForHostConfirmationCount === summary.transactionCount
      && summary.finalHumanConfirmationRequiredCount === summary.transactionCount
      && summary.finalConflictRecheckRequiredCount === summary.transactionCount
      && summary.formatterExecutionRequiredAtApplyCount === summary.transactionCount
      && summary.postApplyValidationRequiredCount === summary.transactionCount
      && summary.applyAuthorityStillBlockedCount === summary.transactionCount
      && boundary.finalHumanConfirmationStillRequired === true
      && boundary.repeatConflictCheckImmediatelyBeforeApply === true, {
      actual: {
        applyAuthorityStillBlockedCount: summary.applyAuthorityStillBlockedCount,
        finalConflictRecheckRequiredCount: summary.finalConflictRecheckRequiredCount,
        finalHumanConfirmationRequiredCount: summary.finalHumanConfirmationRequiredCount,
        formatterExecutionRequiredAtApplyCount: summary.formatterExecutionRequiredAtApplyCount,
        postApplyValidationRequiredCount: summary.postApplyValidationRequiredCount,
        readyForHostConfirmationCount: summary.readyForHostConfirmationCount
      }
    }),
    check("HIA_WP37_RFA_NO_WRITE_AUTHORITY", summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && boundary.applyAuthorityGrantedByEvidence === false, {
      actual: {
        applyAuthorityGrantedByEvidence: boundary.applyAuthorityGrantedByEvidence,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationAllowedCount: summary.targetRepositoryMutationAllowedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP37_RFA_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.secretValueMarkerCount === 0
      && boundary.publicEvidenceMayContainDocumentContent === false
      && boundary.publicEvidenceMayContainDigestValue === false
      && boundary.publicEvidenceMayContainSecretValue === false, {
      actual: {
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        publicEvidenceMayContainDigestValue: boundary.publicEvidenceMayContainDigestValue,
        publicEvidenceMayContainDocumentContent: boundary.publicEvidenceMayContainDocumentContent,
        publicEvidenceMayContainSecretValue: boundary.publicEvidenceMayContainSecretValue,
        secretValueMarkerCount: summary.secretValueMarkerCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp37-rollback-formatter-audit-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-vscode-checked-apply-confirmation-slice" : "blocked",
    sourceEvidence: {
      fileReadVersionConflict: normalizePath(fileReadEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    rollbackFormatterAuditContract: {
      contract: "hia-host-rollback-formatter-audit-boundary",
      contractVersion: "0.1.0-draft",
      boundary
    },
    rollbackRecords,
    formatterValidationRecords,
    applyAuditRecords,
    readinessResults,
    checks,
    nextContractInputs: [
      {
        phase: "W-P37.5",
        topic: "vscode-checked-apply-confirmation-slice",
        reason: "Transactions now have rollback, formatter and audit records, but still require host UI confirmation and repeat conflict check."
      },
      {
        phase: "W-P37.6",
        topic: "target-self-doc-checked-apply-dry-run",
        reason: "Target/self-doc dry-run should reuse the redacted audit and rollback contract without mutating target repositories."
      },
      {
        phase: "W-P37.7",
        topic: "checked-apply-closeout",
        reason: "Closeout should separate host checked apply readiness from remote provider smoke and target adoption."
      }
    ],
    manualChecks: [
      "Confirm rollback records are plans before apply, not captured source copies in public evidence.",
      "Confirm formatter and post-apply validation records are planned but not executed in this stage.",
      "Confirm audit records are redacted drafts and do not include source text, digest values or secrets.",
      "Confirm ready-for-host-confirmation still requires final human approval and repeat conflict check."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P37 rollback/formatter/audit evidence");
  assert.equal(hardFailures.length, 0, `W-P37 rollback/formatter/audit evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P37 rollback/formatter/audit evidence prepared at ${normalizePath(evidencePath)}`);
}

function createRollbackRecord(preflight, snapshot, versionResult, conflictResult, index) {
  return {
    contract: "hia-host-rollback-record",
    contractVersion: "0.1.0-draft",
    id: `rollback-record-${String(index + 1).padStart(2, "0")}`,
    transactionId: preflight.transactionId,
    reviewItemId: preflight.reviewItemId,
    targetKind: preflight.targetKind,
    status: "prepared-before-apply",
    strategy: "host-undo",
    authority: {
      owner: "host",
      providerOwned: false,
      lspServerOwned: false,
      rendererOwned: false
    },
    sourceRefs: {
      snapshotId: snapshot?.id ?? "unknown",
      fileVersionResultId: versionResult?.id ?? "unknown",
      conflictResultId: conflictResult?.id ?? "unknown",
      versionToken: versionResult?.versionToken ?? "unknown"
    },
    rollbackScope: rollbackScopeForTarget(preflight.targetKind),
    rollbackMethod: {
      kind: "host-private-snapshot-or-undo-stack",
      publicEvidenceStoresDocumentContent: false,
      publicEvidenceStoresDigestValue: false,
      requiresHostPrivateState: true
    },
    privacy: {
      documentContentIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      secretValueIncludedInEvidence: false
    }
  };
}

function createFormatterValidationRecord(preflight, snapshot, rangeResult, index) {
  const formatter = formatterForTarget(preflight.targetKind);
  return {
    contract: "hia-host-formatter-validation-record",
    contractVersion: "0.1.0-draft",
    id: `formatter-validation-${String(index + 1).padStart(2, "0")}`,
    transactionId: preflight.transactionId,
    reviewItemId: preflight.reviewItemId,
    targetKind: preflight.targetKind,
    status: "planned",
    authority: {
      owner: "host",
      providerOwned: false,
      lspServerOwned: false,
      rendererOwned: false
    },
    targetRef: {
      snapshotId: snapshot?.id ?? "unknown",
      rangeResultId: rangeResult?.id ?? "unknown",
      path: snapshot?.path ?? "unknown"
    },
    formatter,
    execution: {
      executed: false,
      executionStage: "during-host-apply",
      requiresHostApi: true,
      reason: "Formatter execution requires a host-owned edit buffer and is deferred until final confirmation."
    },
    postApplyValidation: {
      required: true,
      executed: false,
      validationKinds: validationKindsForTarget(preflight.targetKind)
    },
    privacy: {
      documentContentIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      secretValueIncludedInEvidence: false
    }
  };
}

function createApplyAuditRecord(preflight, versionResult, conflictResult, rollbackRecord, formatterRecord, index) {
  return {
    contract: "hia-host-apply-audit-record",
    contractVersion: "0.1.0-draft",
    id: `apply-audit-record-${String(index + 1).padStart(2, "0")}`,
    transactionId: preflight.transactionId,
    reviewItemId: preflight.reviewItemId,
    targetKind: preflight.targetKind,
    status: "drafted-before-apply",
    auditEventRefs: [
      "transaction-created",
      "human-review-required",
      "host-file-version-read",
      "conflict-result-clear",
      "rollback-record-prepared",
      "formatter-validation-planned",
      "awaiting-final-human-confirmation"
    ],
    provenanceRefs: {
      fileVersionResultId: versionResult?.id ?? "unknown",
      conflictResultId: conflictResult?.id ?? "unknown",
      rollbackRecordId: rollbackRecord.id,
      formatterValidationRecordId: formatterRecord.id
    },
    redaction: {
      status: "redacted",
      documentContentIncludedInEvidence: false,
      digestValueIncludedInEvidence: false,
      secretValueIncludedInEvidence: false,
      absolutePathIncludedInEvidence: false
    },
    retention: {
      hostPrivateAuditRequired: true,
      publicEvidenceIsSummaryOnly: true
    }
  };
}

function createReadinessResult(preflight, rollbackRecord, formatterRecord, auditRecord) {
  return {
    contract: "hia-host-checked-apply-readiness-result",
    contractVersion: "0.1.0-draft",
    transactionId: preflight.transactionId,
    previousState: preflight.currentState,
    currentState: "ready-for-host-confirmation",
    rollbackRecordId: rollbackRecord.id,
    formatterValidationRecordId: formatterRecord.id,
    applyAuditRecordId: auditRecord.id,
    finalHumanConfirmationRequired: true,
    finalConflictRecheckRequired: true,
    formatterExecutionRequiredAtApply: true,
    postApplyValidationRequired: true,
    safety: {
      applyAuthorityStillBlocked: true,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      directApplyAllowed: false,
      documentContentIncludedInEvidence: false
    }
  };
}

function createRollbackFormatterAuditBoundary() {
  return {
    hostOwnedRollbackRequired: true,
    hostOwnedFormatterRequired: true,
    hostOwnedAuditRequired: true,
    formatterMayExecuteBeforeFinalConfirmation: false,
    postApplyValidationRequired: true,
    finalHumanConfirmationStillRequired: true,
    repeatConflictCheckImmediatelyBeforeApply: true,
    applyAuthorityGrantedByEvidence: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    publicEvidenceMayContainDocumentContent: false,
    publicEvidenceMayContainDigestValue: false,
    publicEvidenceMayContainSecretValue: false
  };
}

function rollbackScopeForTarget(targetKind) {
  return targetKind === "external-resource-locale-entry" ? "target-resource-file" : "source-docline-region";
}

function formatterForTarget(targetKind) {
  if (targetKind === "external-resource-locale-entry") {
    return {
      id: "json-resource-merge-required",
      mode: "host-json-merge",
      status: "available-as-host-plan"
    };
  }

  if (targetKind === "source-docline-draft") {
    return {
      id: "language-adapter-required",
      mode: "host-language-adapter",
      status: "adapter-selection-required-at-apply"
    };
  }

  return {
    id: "host-formatter-required",
    mode: "host-specific",
    status: "adapter-selection-required-at-apply"
  };
}

function validationKindsForTarget(targetKind) {
  if (targetKind === "external-resource-locale-entry") {
    return [
      "json-parse",
      "resource-pointer-exists",
      "locale-entry-shape"
    ];
  }

  if (targetKind === "source-docline-draft") {
    return [
      "language-parser-smoke",
      "docline-marker-present",
      "range-still-matches"
    ];
  }

  return [
    "host-specific-validation"
  ];
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (
      Object.hasOwn(node, "workspaceEdit")
      || Object.hasOwn(node, "documentChanges")
      || Object.hasOwn(node, "changes")
      || Object.hasOwn(node, "patch")
      || Object.hasOwn(node, "edits")
    ) {
      count += 1;
    }
  });
  return count;
}

function countForbiddenDocumentTextMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (
      Object.hasOwn(node, "sourceText")
      || Object.hasOwn(node, "sourceBody")
      || Object.hasOwn(node, "rawSource")
      || Object.hasOwn(node, "sourceExcerpt")
      || Object.hasOwn(node, "documentText")
      || Object.hasOwn(node, "documentContent")
      || Object.hasOwn(node, "sourcesContent")
    ) {
      count += 1;
    }
  });
  return count;
}

function countSecretValueMarkers(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }
    if (
      Object.hasOwn(node, "secretValue")
      || Object.hasOwn(node, "apiKeyValue")
      || Object.hasOwn(node, "tokenValue")
      || Object.hasOwn(node, "password")
      || Object.hasOwn(node, "authorizationHeader")
    ) {
      count += 1;
    }
  });
  return count;
}

function walkJson(value, visitor, seen = new Set()) {
  visitor(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    for (const item of value) {
      walkJson(item, visitor, seen);
    }
    seen.delete(value);
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const item of Object.values(value)) {
    walkJson(item, visitor, seen);
  }
  seen.delete(value);
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

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
