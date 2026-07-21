import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHiaDocumentationCheckedApplyConfirmationChoices,
  createHiaDocumentationCheckedApplyConfirmationReport
} from "../apps/vscode-extension/dist/config.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp37-vscode-checked-apply-confirmation");
const evidencePath = path.join(outputRoot, "evidence.json");
const rollbackFormatterAuditEvidencePath = path.join(rootDir, "dist", "wp37-rollback-formatter-audit", "evidence.json");
const vscodeExtensionSourcePath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");

await main();

/**
 * 准备 W-P37.5 VS Code checked apply confirmation first-slice evidence。
 * Prepare W-P37.5 evidence for the VS Code checked apply confirmation first slice.
 *
 * This evidence proves that VS Code host helpers can render confirmation
 * choices and reports from rollback, formatter and audit readiness records
 * while apply authority remains blocked and no WorkspaceEdit/write operation is
 * exposed.
 *
 * 中文：本 evidence 证明 VS Code 宿主 helper 可从 rollback、formatter 与 audit
 * readiness 记录生成确认选择项和报告，同时 apply 权限仍被阻断，不暴露
 * WorkspaceEdit 或写入操作。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const rollbackFormatterAudit = await readJson(rollbackFormatterAuditEvidencePath);
  const extensionSource = await readFile(vscodeExtensionSourcePath, "utf8");
  const readinessResults = Array.isArray(rollbackFormatterAudit.readinessResults) ? rollbackFormatterAudit.readinessResults : [];
  const rollbackRecords = Array.isArray(rollbackFormatterAudit.rollbackRecords) ? rollbackFormatterAudit.rollbackRecords : [];
  const formatterValidationRecords = Array.isArray(rollbackFormatterAudit.formatterValidationRecords) ? rollbackFormatterAudit.formatterValidationRecords : [];
  const applyAuditRecords = Array.isArray(rollbackFormatterAudit.applyAuditRecords) ? rollbackFormatterAudit.applyAuditRecords : [];
  const rollbackById = new Map(rollbackRecords.map((record) => [record.id, record]));
  const formatterById = new Map(formatterValidationRecords.map((record) => [record.id, record]));
  const auditById = new Map(applyAuditRecords.map((record) => [record.id, record]));
  const confirmationSummaries = readinessResults.map((readiness) => createConfirmationSummary(readiness, rollbackById, formatterById, auditById));
  const confirmationChoices = createHiaDocumentationCheckedApplyConfirmationChoices(confirmationSummaries);
  const confirmationReports = confirmationSummaries.map((confirmation) => createHiaDocumentationCheckedApplyConfirmationReport(confirmation));
  const confirmationReportLines = confirmationReports.flat();
  const sourceActionDeclared = extensionSource.includes("Show checked apply confirmation")
    && extensionSource.includes("HIA documentation checked apply confirmation preview:");
  const summary = {
    rfaEvidenceReady: rollbackFormatterAudit.status === "ready-for-vscode-checked-apply-confirmation-slice",
    rfaHardFailureCount: Number(rollbackFormatterAudit.summary?.hardFailureCount ?? -1),
    readinessResultCount: readinessResults.length,
    confirmationSummaryCount: confirmationSummaries.length,
    confirmationChoiceCount: confirmationChoices.length,
    confirmationReportCount: confirmationReports.length,
    confirmationReportLineCount: confirmationReportLines.length,
    readyForHostConfirmationCount: confirmationSummaries.filter((confirmation) => confirmation.readyForHostConfirmation === true).length,
    applyAuthorityStillBlockedCount: confirmationSummaries.filter((confirmation) => confirmation.applyAuthorityStillBlocked === true).length,
    finalHumanConfirmationRequiredCount: confirmationSummaries.filter((confirmation) => confirmation.finalHumanConfirmationRequired === true).length,
    finalConflictRecheckRequiredCount: confirmationSummaries.filter((confirmation) => confirmation.finalConflictRecheckRequired === true).length,
    formatterExecutionRequiredAtApplyCount: confirmationSummaries.filter((confirmation) => confirmation.formatterExecutionRequiredAtApply === true).length,
    postApplyValidationRequiredCount: confirmationSummaries.filter((confirmation) => confirmation.postApplyValidationRequired === true).length,
    workspaceWriteAllowedCount: confirmationSummaries.filter((confirmation) => confirmation.workspaceWriteAllowed === true).length,
    targetRepositoryMutationAllowedCount: confirmationSummaries.filter((confirmation) => confirmation.targetRepositoryMutationAllowed === true).length,
    directApplyAllowedCount: confirmationSummaries.filter((confirmation) => confirmation.directApplyAllowed === true).length,
    workspaceApplyEditCallCount: countSourceOccurrences(extensionSource, "workspace.applyEdit"),
    sourceActionDeclared,
    sourceApplyDisabledMessage: extensionSource.includes("Apply remains disabled."),
    directEditObjectCount: countDirectEditObjects({
      confirmationChoices,
      confirmationReports,
      confirmationSummaries
    }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({
      confirmationChoices,
      confirmationReports,
      confirmationSummaries
    }),
    secretValueMarkerCount: countSecretValueMarkers({
      confirmationChoices,
      confirmationReports,
      confirmationSummaries
    })
  };
  const checks = [
    check("HIA_WP37_VSCODE_CONFIRMATION_INPUT_READY", summary.rfaEvidenceReady === true
      && summary.rfaHardFailureCount === 0
      && summary.readinessResultCount === 2, {
      actual: {
        readinessResultCount: summary.readinessResultCount,
        rfaEvidenceStatus: rollbackFormatterAudit.status,
        rfaHardFailureCount: summary.rfaHardFailureCount
      }
    }),
    check("HIA_WP37_VSCODE_CONFIRMATION_HELPERS_RENDER", summary.confirmationSummaryCount === summary.readinessResultCount
      && summary.confirmationChoiceCount === summary.readinessResultCount
      && summary.confirmationReportCount === summary.readinessResultCount
      && summary.confirmationReportLineCount >= summary.readinessResultCount * 12
      && confirmationChoices.every((choice) => String(choice.description ?? "").includes("ready for host confirmation"))
      && confirmationChoices.every((choice) => String(choice.description ?? "").includes("apply authority blocked")), {
      actual: {
        confirmationChoiceCount: summary.confirmationChoiceCount,
        confirmationReportCount: summary.confirmationReportCount,
        confirmationReportLineCount: summary.confirmationReportLineCount,
        confirmationSummaryCount: summary.confirmationSummaryCount
      }
    }),
    check("HIA_WP37_VSCODE_CONFIRMATION_FINAL_GATES_VISIBLE", summary.readyForHostConfirmationCount === summary.readinessResultCount
      && summary.finalHumanConfirmationRequiredCount === summary.readinessResultCount
      && summary.finalConflictRecheckRequiredCount === summary.readinessResultCount
      && summary.formatterExecutionRequiredAtApplyCount === summary.readinessResultCount
      && summary.postApplyValidationRequiredCount === summary.readinessResultCount
      && summary.applyAuthorityStillBlockedCount === summary.readinessResultCount
      && confirmationReportLines.includes("Final human confirmation: required")
      && confirmationReportLines.includes("Final conflict recheck: required")
      && confirmationReportLines.includes("Apply authority: blocked"), {
      actual: {
        applyAuthorityStillBlockedCount: summary.applyAuthorityStillBlockedCount,
        finalConflictRecheckRequiredCount: summary.finalConflictRecheckRequiredCount,
        finalHumanConfirmationRequiredCount: summary.finalHumanConfirmationRequiredCount,
        formatterExecutionRequiredAtApplyCount: summary.formatterExecutionRequiredAtApplyCount,
        postApplyValidationRequiredCount: summary.postApplyValidationRequiredCount,
        readyForHostConfirmationCount: summary.readyForHostConfirmationCount
      }
    }),
    check("HIA_WP37_VSCODE_CONFIRMATION_SOURCE_ACTION_DECLARED", summary.sourceActionDeclared === true
      && summary.sourceApplyDisabledMessage === true
      && summary.workspaceApplyEditCallCount === 0, {
      actual: {
        sourceActionDeclared: summary.sourceActionDeclared,
        sourceApplyDisabledMessage: summary.sourceApplyDisabledMessage,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount
      }
    }),
    check("HIA_WP37_VSCODE_CONFIRMATION_NO_WRITE_AUTHORITY", summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationAllowedCount: summary.targetRepositoryMutationAllowedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP37_VSCODE_CONFIRMATION_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.secretValueMarkerCount === 0, {
      actual: {
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        secretValueMarkerCount: summary.secretValueMarkerCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp37-vscode-checked-apply-confirmation-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-self-doc-checked-apply-dry-run" : "blocked",
    sourceEvidence: {
      rollbackFormatterAudit: normalizePath(rollbackFormatterAuditEvidencePath),
      vscodeConfig: "apps/vscode-extension/dist/config.js",
      vscodeExtensionSource: "apps/vscode-extension/src/extension.ts"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    confirmationSummaries,
    confirmationChoices,
    confirmationReports,
    checks,
    nextContractInputs: [
      {
        phase: "W-P37.6",
        topic: "target-self-doc-checked-apply-dry-run",
        reason: "VS Code can render checked apply confirmation previews while final apply remains host-blocked."
      },
      {
        phase: "W-P37.7",
        topic: "checked-apply-closeout",
        reason: "Closeout should separate confirmation preview readiness from writable apply implementation and remote provider smoke."
      }
    ],
    manualChecks: [
      "Open VS Code Extension Development Host and confirm the review action list includes Show checked apply confirmation.",
      "Confirm the checked apply confirmation output shows final human confirmation, repeat conflict recheck, formatter execution and post-apply validation.",
      "Confirm Apply edit remains disabled and no workspace file changes occur."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P37 VS Code checked apply confirmation evidence");
  assert.equal(hardFailures.length, 0, `W-P37 VS Code checked apply confirmation evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P37 VS Code checked apply confirmation evidence prepared at ${normalizePath(evidencePath)}`);
}

function createConfirmationSummary(readiness, rollbackById, formatterById, auditById) {
  const rollback = rollbackById.get(readiness.rollbackRecordId);
  const formatter = formatterById.get(readiness.formatterValidationRecordId);
  const audit = auditById.get(readiness.applyAuditRecordId);

  return {
    applyAuditRecordId: readiness.applyAuditRecordId,
    applyAuthorityStillBlocked: readiness.safety?.applyAuthorityStillBlocked === true,
    conflictStatus: readiness.currentState === "ready-for-host-confirmation" ? "clear-before-final-recheck" : readiness.currentState ?? "unknown",
    currentState: readiness.currentState,
    directApplyAllowed: readiness.safety?.directApplyAllowed === true,
    finalConflictRecheckRequired: readiness.finalConflictRecheckRequired === true,
    finalHumanConfirmationRequired: readiness.finalHumanConfirmationRequired === true,
    formatterExecutionRequiredAtApply: readiness.formatterExecutionRequiredAtApply === true,
    formatterId: formatter?.formatter?.id,
    formatterStatus: formatter?.formatter?.status ?? formatter?.status,
    formatterValidationRecordId: readiness.formatterValidationRecordId,
    postApplyValidationRequired: readiness.postApplyValidationRequired === true,
    readyForHostConfirmation: readiness.currentState === "ready-for-host-confirmation",
    reportSource: "wp37-rollback-formatter-audit-readiness",
    rollbackRecordId: readiness.rollbackRecordId,
    targetKind: audit?.targetKind ?? rollback?.targetKind ?? formatter?.targetKind,
    targetRepositoryMutationAllowed: readiness.safety?.targetRepositoryMutationAllowed === true,
    transactionId: readiness.transactionId,
    workspaceWriteAllowed: readiness.safety?.workspaceWriteAllowed === true
  };
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

function countSourceOccurrences(source, pattern) {
  return source.split(pattern).length - 1;
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
